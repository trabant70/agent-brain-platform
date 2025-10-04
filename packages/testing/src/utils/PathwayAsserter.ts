/**
 * PathwayAsserter - Core Infrastructure for Pathway-Based Testing
 *
 * This class enables milestone-based testing where tests verify that specific
 * log emissions occur in the expected sequence during a data flow pathway.
 *
 * Instead of just pass/fail, pathway tests pinpoint exactly where in the flow
 * a test failed, providing AI-debuggable context for automated fixing.
 */

import { LogPathway, LogLevel, LogCategory } from '../../src/utils/Logger';

/**
 * A log entry captured during test execution
 */
export interface LogEntry {
    timestamp: number;
    level: LogLevel;
    category: LogCategory;
    message: string;
    context?: string;
    data?: any;
    pathway?: LogPathway;
}

/**
 * A milestone represents an expected point in a pathway
 */
export interface Milestone {
    context: string;  // Function/location where log should occur
    optional?: boolean;  // If true, milestone can be skipped
    matcher?: {
        message?: string | RegExp;  // Expected message pattern
        data?: Record<string, any>;  // Expected data fields
        category?: LogCategory;  // Expected log category
    };
}

/**
 * Result of checking a single milestone
 */
export interface MilestoneResult {
    milestone: Milestone;
    reached: boolean;
    log?: LogEntry;  // The log that matched (if reached)
    reason?: string;  // Why it wasn't reached (if failed)
    timestamp?: number;  // When it was reached
}

/**
 * Complete assertion report
 */
export interface AssertionReport {
    pathway: LogPathway;
    passed: boolean;
    totalMilestones: number;
    reachedMilestones: number;
    timeline: MilestoneResult[];
    failedAtIndex?: number;  // First failed milestone index
    executionTime: number;  // Total time from start to verify
    suggestions: string[];  // AI-friendly suggestions for fixing
    capturedLogs: LogEntry[];  // All logs for this pathway
}

/**
 * PathwayAsserter - Fluent API for pathway testing
 *
 * Usage:
 * ```typescript
 * const asserter = new PathwayAsserter(LogPathway.DATA_INGESTION)
 *   .expectMilestone('fetchEvents', { message: /Fetching.*events/ })
 *   .expectMilestone('processEvents', { message: /Processing \d+ events/ })
 *   .expectOptionalMilestone('cacheEvents')
 *   .verify();
 *
 * expect(asserter).toCompletePathway();
 * ```
 */
export class PathwayAsserter {
    private milestones: Milestone[] = [];
    private startTime: number = 0;
    private endTime: number = 0;
    private pathway: LogPathway;
    private capturedLogs: LogEntry[] = [];
    private verificationResult?: AssertionReport;

    constructor(pathway: LogPathway) {
        this.pathway = pathway;
        this.startTime = Date.now();
    }

    /**
     * Add an expected milestone to the pathway
     */
    expectMilestone(context: string, matcher?: Milestone['matcher']): this {
        this.milestones.push({
            context,
            optional: false,
            matcher
        });
        return this;
    }

    /**
     * Add an optional milestone (test won't fail if not reached)
     */
    expectOptionalMilestone(context: string, matcher?: Milestone['matcher']): this {
        this.milestones.push({
            context,
            optional: true,
            matcher
        });
        return this;
    }

    /**
     * Get the list of expected milestones
     */
    getMilestones(): Milestone[] {
        return this.milestones;
    }

    /**
     * Set the captured logs for verification
     * (Called by LogCapture or test framework)
     */
    setCapturedLogs(logs: LogEntry[]): void {
        this.capturedLogs = logs.filter(log => log.pathway === this.pathway);
    }

    /**
     * Verify that all expected milestones were reached
     */
    verify(): AssertionReport {
        this.endTime = Date.now();

        const timeline: MilestoneResult[] = [];
        let lastMatchedLogIndex = -1;
        let failedAtIndex: number | undefined;

        // Check each milestone in order
        for (let i = 0; i < this.milestones.length; i++) {
            const milestone = this.milestones[i];

            // Search for matching log after the last matched log
            const matchingLog = this.findMatchingLog(
                milestone,
                this.capturedLogs.slice(lastMatchedLogIndex + 1)
            );

            if (matchingLog) {
                // Milestone reached
                const actualIndex = this.capturedLogs.indexOf(matchingLog);
                lastMatchedLogIndex = actualIndex;

                timeline.push({
                    milestone,
                    reached: true,
                    log: matchingLog,
                    timestamp: matchingLog.timestamp
                });
            } else {
                // Milestone not reached
                if (!milestone.optional && failedAtIndex === undefined) {
                    failedAtIndex = i;
                }

                timeline.push({
                    milestone,
                    reached: false,
                    reason: this.generateFailureReason(milestone, this.capturedLogs)
                });
            }
        }

        const reachedMilestones = timeline.filter(r => r.reached).length;
        const passed = failedAtIndex === undefined;

        this.verificationResult = {
            pathway: this.pathway,
            passed,
            totalMilestones: this.milestones.length,
            reachedMilestones,
            timeline,
            failedAtIndex,
            executionTime: this.endTime - this.startTime,
            suggestions: passed ? [] : this.generateSuggestions(timeline, this.capturedLogs),
            capturedLogs: this.capturedLogs
        };

        return this.verificationResult;
    }

    /**
     * Get the verification result (must call verify() first)
     */
    getResult(): AssertionReport | undefined {
        return this.verificationResult;
    }

    /**
     * Get human-readable failure report
     */
    getFailureReport(): string {
        if (!this.verificationResult) {
            return 'No verification performed yet';
        }

        if (this.verificationResult.passed) {
            return `✓ Pathway ${LogPathway[this.pathway]} completed successfully\n` +
                   `  ${this.verificationResult.reachedMilestones}/${this.verificationResult.totalMilestones} milestones reached\n` +
                   `  Execution time: ${this.verificationResult.executionTime}ms`;
        }

        const report: string[] = [];
        report.push(`✗ Pathway ${LogPathway[this.pathway]} FAILED`);
        report.push(`  ${this.verificationResult.reachedMilestones}/${this.verificationResult.totalMilestones} milestones reached`);
        report.push(`  Failed at milestone #${this.verificationResult.failedAtIndex! + 1}`);
        report.push('');
        report.push('Timeline:');

        this.verificationResult.timeline.forEach((result, index) => {
            const status = result.reached ? '✓' : (result.milestone.optional ? '○' : '✗');
            const timestamp = result.timestamp ? `[${result.timestamp - this.startTime}ms]` : '[not reached]';
            report.push(`  ${status} ${timestamp} ${result.milestone.context}`);

            if (!result.reached && result.reason) {
                report.push(`      → ${result.reason}`);
            }
        });

        if (this.verificationResult.suggestions.length > 0) {
            report.push('');
            report.push('Suggestions:');
            this.verificationResult.suggestions.forEach(suggestion => {
                report.push(`  • ${suggestion}`);
            });
        }

        report.push('');
        report.push(`Captured ${this.capturedLogs.length} logs for this pathway`);

        return report.join('\n');
    }

    /**
     * Get JSON output for Agent-Brain webhook
     */
    toJSON(): string {
        if (!this.verificationResult) {
            return JSON.stringify({ error: 'No verification performed' });
        }

        return JSON.stringify({
            pathway: LogPathway[this.pathway],
            status: this.verificationResult.passed ? 'PASSED' : 'FAILED',
            summary: {
                totalMilestones: this.verificationResult.totalMilestones,
                reachedMilestones: this.verificationResult.reachedMilestones,
                failedAtIndex: this.verificationResult.failedAtIndex,
                executionTime: this.verificationResult.executionTime
            },
            timeline: this.verificationResult.timeline.map(r => ({
                milestone: r.milestone.context,
                reached: r.reached,
                optional: r.milestone.optional || false,
                timestamp: r.timestamp,
                reason: r.reason
            })),
            suggestions: this.verificationResult.suggestions,
            logs: this.capturedLogs.map(log => ({
                timestamp: log.timestamp,
                level: LogLevel[log.level],
                category: LogCategory[log.category],
                message: log.message,
                context: log.context,
                data: log.data
            }))
        }, null, 2);
    }

    /**
     * Find a log entry matching the milestone criteria
     */
    private findMatchingLog(milestone: Milestone, logs: LogEntry[]): LogEntry | undefined {
        return logs.find(log => {
            // Context must match
            if (log.context !== milestone.context) {
                return false;
            }

            // If matcher specified, check message pattern
            if (milestone.matcher?.message) {
                const pattern = milestone.matcher.message;
                if (typeof pattern === 'string') {
                    if (log.message !== pattern) return false;
                } else {
                    if (!pattern.test(log.message)) return false;
                }
            }

            // If matcher specified, check category
            if (milestone.matcher?.category !== undefined) {
                if (log.category !== milestone.matcher.category) return false;
            }

            // If matcher specified, check data fields
            if (milestone.matcher?.data) {
                for (const [key, expectedValue] of Object.entries(milestone.matcher.data)) {
                    if (log.data?.[key] !== expectedValue) return false;
                }
            }

            return true;
        });
    }

    /**
     * Generate human-readable reason why milestone wasn't reached
     */
    private generateFailureReason(milestone: Milestone, logs: LogEntry[]): string {
        // Check if context ever appeared in logs
        const contextLogs = logs.filter(log => log.context === milestone.context);

        if (contextLogs.length === 0) {
            return `Context '${milestone.context}' never logged`;
        }

        // Context appeared but didn't match criteria
        const reasons: string[] = [];

        if (milestone.matcher?.message) {
            reasons.push(`message didn't match pattern: ${milestone.matcher.message}`);
        }

        if (milestone.matcher?.category !== undefined) {
            reasons.push(`category wasn't ${LogCategory[milestone.matcher.category]}`);
        }

        if (milestone.matcher?.data) {
            const missingFields = Object.keys(milestone.matcher.data).filter(key =>
                contextLogs.every(log => log.data?.[key] !== milestone.matcher!.data![key])
            );
            if (missingFields.length > 0) {
                reasons.push(`data fields didn't match: ${missingFields.join(', ')}`);
            }
        }

        return reasons.length > 0
            ? `Context logged ${contextLogs.length} times but ${reasons.join('; ')}`
            : 'Matcher criteria not met';
    }

    /**
     * Generate AI-friendly suggestions for fixing failed pathway
     */
    private generateSuggestions(timeline: MilestoneResult[], logs: LogEntry[]): string[] {
        const suggestions: string[] = [];
        const failedIndex = timeline.findIndex(r => !r.reached && !r.milestone.optional);

        if (failedIndex === -1) return suggestions;

        const failed = timeline[failedIndex];
        const lastSuccess = timeline.slice(0, failedIndex).reverse().find(r => r.reached);

        // Suggestion 1: Check if function is being called
        suggestions.push(
            `Verify that ${failed.milestone.context} is being called in the ${LogPathway[this.pathway]} pathway`
        );

        // Suggestion 2: Check for errors before milestone
        const errorsBefore = logs.filter(log =>
            log.level === LogLevel.ERROR &&
            (!lastSuccess || log.timestamp > lastSuccess.timestamp!) &&
            log.timestamp < (failed.timestamp || Date.now())
        );

        if (errorsBefore.length > 0) {
            suggestions.push(
                `${errorsBefore.length} error(s) logged before failed milestone - check: ${errorsBefore[0].message}`
            );
        }

        // Suggestion 3: Check if pathway changed
        if (lastSuccess) {
            const timeDiff = (failed.timestamp || this.endTime) - lastSuccess.timestamp!;
            if (timeDiff > 1000) {
                suggestions.push(
                    `Large time gap (${timeDiff}ms) between last success and failure - check for async issues`
                );
            }
        }

        // Suggestion 4: Check matcher criteria
        if (failed.milestone.matcher) {
            const contextLogs = logs.filter(log => log.context === failed.milestone.context);
            if (contextLogs.length > 0) {
                suggestions.push(
                    `${failed.milestone.context} was called ${contextLogs.length} times but didn't match criteria - check matcher configuration`
                );
            }
        }

        // Suggestion 5: Check data flow
        suggestions.push(
            `Verify data is being passed correctly from ${lastSuccess?.milestone.context || 'start'} to ${failed.milestone.context}`
        );

        return suggestions;
    }
}
