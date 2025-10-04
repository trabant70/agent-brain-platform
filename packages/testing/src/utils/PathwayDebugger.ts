/**
 * PathwayDebugger - AI-Assisted Debugging for Failed Pathway Tests
 *
 * Analyzes failed pathway tests and generates structured debugging information
 * for AI agents (Agent-Brain) to understand, diagnose, and suggest fixes.
 */

import { AssertionReport, MilestoneResult, LogEntry } from './PathwayAsserter';
import { LogPathway, LogLevel, LogCategory } from '../../src/utils/Logger';

/**
 * A hypothesis about why a pathway failed
 */
export interface Hypothesis {
    confidence: number;  // 0-100
    category: 'data-flow' | 'state' | 'timing' | 'configuration' | 'logic' | 'external';
    description: string;
    evidence: string[];
    suggestedFix?: string;
    codeLocations?: CodeLocation[];
}

/**
 * A location in the codebase relevant to debugging
 */
export interface CodeLocation {
    file: string;
    function?: string;
    line?: number;
    reason: string;
}

/**
 * A checklist item for debugging
 */
export interface ChecklistItem {
    category: 'verify' | 'check' | 'test' | 'review';
    description: string;
    priority: 'high' | 'medium' | 'low';
    automated?: boolean;  // Can this be automated?
}

/**
 * Complete debug analysis
 */
export interface DebugAnalysis {
    pathway: string;
    status: 'failed' | 'partial' | 'timeout';
    summary: string;
    failurePoint: {
        milestone: string;
        reason: string;
        index: number;
    };
    hypotheses: Hypothesis[];
    checklist: ChecklistItem[];
    relatedCode: CodeLocation[];
    logAnalysis: {
        totalLogs: number;
        errorCount: number;
        warningCount: number;
        suspiciousPatterns: string[];
        timeline: string[];
    };
    aiContext: {
        lastSuccessfulMilestone?: string;
        failedMilestone: string;
        timeBetween?: number;
        dataFlow: string[];
        stateChanges: string[];
    };
}

/**
 * PathwayDebugger - Main debugging class
 */
export class PathwayDebugger {
    private report: AssertionReport;

    constructor(report: AssertionReport) {
        this.report = report;
    }

    /**
     * Generate complete debugging analysis
     */
    analyzeFailure(): DebugAnalysis {
        const failurePoint = this.identifyFailurePoint();
        const hypotheses = this.generateHypotheses(failurePoint);
        const checklist = this.generateChecklist(failurePoint);
        const relatedCode = this.findRelatedCode(failurePoint);
        const logAnalysis = this.analyzeLogPatterns();
        const aiContext = this.buildAIContext(failurePoint);

        return {
            pathway: LogPathway[this.report.pathway],
            status: this.determineStatus(),
            summary: this.generateSummary(failurePoint),
            failurePoint,
            hypotheses: hypotheses.sort((a, b) => b.confidence - a.confidence),
            checklist: checklist.sort((a, b) => {
                const priority = { high: 0, medium: 1, low: 2 };
                return priority[a.priority] - priority[b.priority];
            }),
            relatedCode,
            logAnalysis,
            aiContext
        };
    }

    /**
     * Format analysis for AI consumption (Agent-Brain webhook)
     */
    formatForAI(): string {
        const analysis = this.analyzeFailure();

        return `
=== PATHWAY TEST FAILURE ANALYSIS ===

Pathway: ${analysis.pathway}
Status: ${analysis.status}

FAILURE POINT:
  Milestone: ${analysis.failurePoint.milestone} (index ${analysis.failurePoint.index})
  Reason: ${analysis.failurePoint.reason}

SUMMARY:
${analysis.summary}

TOP HYPOTHESES:
${analysis.hypotheses.slice(0, 3).map((h, i) => `
${i + 1}. [${h.confidence}% confidence] ${h.category.toUpperCase()}
   ${h.description}
   Evidence:
${h.evidence.map(e => `     - ${e}`).join('\n')}
   ${h.suggestedFix ? `Suggested Fix: ${h.suggestedFix}` : ''}
`).join('\n')}

DEBUGGING CHECKLIST:
${analysis.checklist.map(item => `
  [${item.priority.toUpperCase()}] ${item.category}: ${item.description}
`).join('\n')}

LOG ANALYSIS:
  Total Logs: ${analysis.logAnalysis.totalLogs}
  Errors: ${analysis.logAnalysis.errorCount}
  Warnings: ${analysis.logAnalysis.warningCount}
  Suspicious Patterns: ${analysis.logAnalysis.suspiciousPatterns.join(', ') || 'None'}

TIMELINE:
${analysis.logAnalysis.timeline.join('\n')}

AI CONTEXT:
  Last Success: ${analysis.aiContext.lastSuccessfulMilestone || 'None'}
  Failed At: ${analysis.aiContext.failedMilestone}
  ${analysis.aiContext.timeBetween ? `Time Between: ${analysis.aiContext.timeBetween}ms` : ''}
  Data Flow: ${analysis.aiContext.dataFlow.join(' → ')}

RELATED CODE LOCATIONS:
${analysis.relatedCode.map(loc => `
  ${loc.file}${loc.function ? `::${loc.function}` : ''}${loc.line ? `:${loc.line}` : ''}
  Reason: ${loc.reason}
`).join('\n')}

=== END ANALYSIS ===
`.trim();
    }

    /**
     * Export as JSON for webhook
     */
    toJSON(): string {
        return JSON.stringify(this.analyzeFailure(), null, 2);
    }

    /**
     * Identify the exact failure point
     */
    private identifyFailurePoint(): { milestone: string; reason: string; index: number } {
        const failedIndex = this.report.failedAtIndex ?? this.report.timeline.length - 1;
        const failed = this.report.timeline[failedIndex];

        return {
            milestone: failed.milestone.context,
            reason: failed.reason || 'Unknown reason',
            index: failedIndex
        };
    }

    /**
     * Generate hypotheses about failure causes
     */
    private generateHypotheses(failurePoint: { milestone: string; reason: string; index: number }): Hypothesis[] {
        const hypotheses: Hypothesis[] = [];

        // Check for timing issues
        const timingHypothesis = this.analyzeTimingIssues(failurePoint);
        if (timingHypothesis) hypotheses.push(timingHypothesis);

        // Check for data flow issues
        const dataFlowHypothesis = this.analyzeDataFlowIssues(failurePoint);
        if (dataFlowHypothesis) hypotheses.push(dataFlowHypothesis);

        // Check for state issues
        const stateHypothesis = this.analyzeStateIssues(failurePoint);
        if (stateHypothesis) hypotheses.push(stateHypothesis);

        // Check for configuration issues
        const configHypothesis = this.analyzeConfigIssues(failurePoint);
        if (configHypothesis) hypotheses.push(configHypothesis);

        // Check for logic errors
        const logicHypothesis = this.analyzeLogicErrors(failurePoint);
        if (logicHypothesis) hypotheses.push(logicHypothesis);

        // Check for external dependencies
        const externalHypothesis = this.analyzeExternalDependencies(failurePoint);
        if (externalHypothesis) hypotheses.push(externalHypothesis);

        return hypotheses;
    }

    /**
     * Analyze timing-related issues
     */
    private analyzeTimingIssues(failurePoint: any): Hypothesis | null {
        const lastSuccess = this.getLastSuccessfulMilestone(failurePoint.index);
        if (!lastSuccess) return null;

        const timeDiff = (failurePoint.timestamp || Date.now()) - lastSuccess.timestamp!;

        if (timeDiff > 1000) {
            return {
                confidence: 75,
                category: 'timing',
                description: 'Large time gap suggests async operation issue or timeout',
                evidence: [
                    `${timeDiff}ms elapsed between last success and failure`,
                    'May indicate promise not resolving, async/await issue, or race condition',
                    `Last successful: ${lastSuccess.milestone.context}`,
                    `Failed at: ${failurePoint.milestone}`
                ],
                suggestedFix: 'Check for missing await keywords, unresolved promises, or race conditions between async operations',
                codeLocations: [
                    { file: 'Look for async code in', function: failurePoint.milestone, reason: 'Check async handling' },
                    { file: 'Look for async code in', function: lastSuccess.milestone.context, reason: 'Verify promise resolution' }
                ]
            };
        }

        return null;
    }

    /**
     * Analyze data flow issues
     */
    private analyzeDataFlowIssues(failurePoint: any): Hypothesis | null {
        const dataLogs = this.report.capturedLogs.filter(log =>
            log.category === LogCategory.DATA || log.category === LogCategory.ORCHESTRATION
        );

        const lastDataLog = dataLogs[dataLogs.length - 1];
        const hasDataErrors = dataLogs.some(log => log.level === LogLevel.ERROR);

        if (hasDataErrors || !lastDataLog) {
            return {
                confidence: 80,
                category: 'data-flow',
                description: 'Data not flowing correctly through the pipeline',
                evidence: [
                    hasDataErrors ? 'Data-related errors detected in logs' : 'No data logs found',
                    `Expected data at: ${failurePoint.milestone}`,
                    lastDataLog ? `Last data log: ${lastDataLog.message}` : 'No data processing logs'
                ],
                suggestedFix: 'Verify data is being passed correctly between components. Check for null/undefined data or incorrect data transformations.',
                codeLocations: [
                    { file: 'src/orchestration/DataOrchestrator.ts', reason: 'Main data orchestration' },
                    { file: 'Check data provider', function: failurePoint.milestone, reason: 'Data source' }
                ]
            };
        }

        return null;
    }

    /**
     * Analyze state-related issues
     */
    private analyzeStateIssues(failurePoint: any): Hypothesis | null {
        const stateLogs = this.report.capturedLogs.filter(log =>
            log.message.toLowerCase().includes('state') ||
            log.context?.toLowerCase().includes('state')
        );

        if (stateLogs.length === 0 && this.report.pathway === LogPathway.STATE_PERSIST) {
            return {
                confidence: 85,
                category: 'state',
                description: 'State persistence pathway failed - no state operations detected',
                evidence: [
                    'No state-related logs found',
                    'State save/restore operations not executing',
                    `Failed at: ${failurePoint.milestone}`
                ],
                suggestedFix: 'Check if OrchestratorState methods are being called. Verify state management initialization.',
                codeLocations: [
                    { file: 'src/orchestration/OrchestratorState.ts', reason: 'State management implementation' }
                ]
            };
        }

        return null;
    }

    /**
     * Analyze configuration issues
     */
    private analyzeConfigIssues(failurePoint: any): Hypothesis | null {
        if (this.report.pathway === LogPathway.CONFIG_SYNC) {
            return {
                confidence: 70,
                category: 'configuration',
                description: 'Configuration synchronization issue',
                evidence: [
                    'Config sync pathway failed',
                    `Failed at: ${failurePoint.milestone}`,
                    'Configuration may not be propagating correctly'
                ],
                suggestedFix: 'Verify configuration change listeners are registered. Check postMessage for config updates.',
                codeLocations: [
                    { file: 'src/extension.ts', reason: 'Config change listener registration' },
                    { file: 'src/webview/main.ts', function: 'handleColorModeChanged', reason: 'Config message handling' }
                ]
            };
        }

        return null;
    }

    /**
     * Analyze logic errors
     */
    private analyzeLogicErrors(failurePoint: any): Hypothesis | null {
        const errorLogs = this.report.capturedLogs.filter(log => log.level === LogLevel.ERROR);

        if (errorLogs.length > 0) {
            return {
                confidence: 90,
                category: 'logic',
                description: 'Logic error or exception occurred before milestone',
                evidence: [
                    `${errorLogs.length} error(s) logged`,
                    ...errorLogs.slice(0, 3).map(log => `Error: ${log.message}`)
                ],
                suggestedFix: 'Fix the logged errors first. They are likely preventing the pathway from completing.',
                codeLocations: errorLogs.slice(0, 3).map(log => ({
                    file: 'See error context',
                    function: log.context,
                    reason: log.message
                }))
            };
        }

        return null;
    }

    /**
     * Analyze external dependency issues
     */
    private analyzeExternalDependencies(failurePoint: any): Hypothesis | null {
        const gitLogs = this.report.capturedLogs.filter(log =>
            log.category === LogCategory.GIT || log.category === LogCategory.GITHUB
        );

        if (gitLogs.some(log => log.level === LogLevel.ERROR)) {
            return {
                confidence: 65,
                category: 'external',
                description: 'External dependency (Git/GitHub) issue',
                evidence: [
                    'Git/GitHub errors detected',
                    ...gitLogs.filter(log => log.level === LogLevel.ERROR).map(log => log.message)
                ],
                suggestedFix: 'Verify Git repository is accessible and GitHub API credentials are valid.',
                codeLocations: [
                    { file: 'src/providers/git/', reason: 'Git provider implementation' }
                ]
            };
        }

        return null;
    }

    /**
     * Generate debugging checklist
     */
    private generateChecklist(failurePoint: any): ChecklistItem[] {
        const checklist: ChecklistItem[] = [];

        // Always check the failed milestone exists
        checklist.push({
            category: 'verify',
            description: `Verify ${failurePoint.milestone} function is being called`,
            priority: 'high',
            automated: false
        });

        // Check logging
        checklist.push({
            category: 'check',
            description: `Confirm log statement exists in ${failurePoint.milestone}`,
            priority: 'high',
            automated: true
        });

        // Check data flow
        const lastSuccess = this.getLastSuccessfulMilestone(failurePoint.index);
        if (lastSuccess) {
            checklist.push({
                category: 'test',
                description: `Test data flow from ${lastSuccess.milestone.context} to ${failurePoint.milestone}`,
                priority: 'high',
                automated: false
            });
        }

        // Check for errors
        if (this.report.capturedLogs.some(log => log.level === LogLevel.ERROR)) {
            checklist.push({
                category: 'review',
                description: 'Review and fix all logged errors',
                priority: 'high',
                automated: false
            });
        }

        // Pathway-specific checks
        checklist.push(...this.getPathwaySpecificChecklist());

        return checklist;
    }

    /**
     * Get pathway-specific checklist items
     */
    private getPathwaySpecificChecklist(): ChecklistItem[] {
        switch (this.report.pathway) {
            case LogPathway.DATA_INGESTION:
                return [
                    { category: 'verify', description: 'Verify Git provider is registered', priority: 'high', automated: true },
                    { category: 'test', description: 'Test data normalization', priority: 'medium', automated: true }
                ];
            case LogPathway.FILTER_APPLY:
                return [
                    { category: 'check', description: 'Check filter state is updating', priority: 'high', automated: true },
                    { category: 'verify', description: 'Verify filter event listeners are bound', priority: 'medium', automated: false }
                ];
            case LogPathway.WEBVIEW_MESSAGING:
                return [
                    { category: 'verify', description: 'Verify postMessage is working', priority: 'high', automated: true },
                    { category: 'check', description: 'Check message serialization', priority: 'medium', automated: true }
                ];
            default:
                return [];
        }
    }

    /**
     * Find related code locations
     */
    private findRelatedCode(failurePoint: any): CodeLocation[] {
        const locations: CodeLocation[] = [];

        // Add failed milestone location
        locations.push({
            file: this.inferFileFromContext(failurePoint.milestone),
            function: failurePoint.milestone,
            reason: 'Failed milestone - log not emitted here'
        });

        // Add last successful milestone
        const lastSuccess = this.getLastSuccessfulMilestone(failurePoint.index);
        if (lastSuccess) {
            locations.push({
                file: this.inferFileFromContext(lastSuccess.milestone.context),
                function: lastSuccess.milestone.context,
                reason: 'Last successful milestone - check data flow from here'
            });
        }

        // Add pathway-specific locations
        locations.push(...this.getPathwaySpecificLocations());

        return locations;
    }

    /**
     * Get pathway-specific code locations
     */
    private getPathwaySpecificLocations(): CodeLocation[] {
        const pathwayFiles: Record<LogPathway, string[]> = {
            [LogPathway.NONE]: [],
            [LogPathway.DATA_INGESTION]: [
                'src/orchestration/DataOrchestrator.ts',
                'src/providers/git/GitDataProvider.ts',
                'src/extension.ts'
            ],
            [LogPathway.FILTER_APPLY]: [
                'src/visualization/ui/FilterController.ts',
                'src/orchestration/DataOrchestrator.ts'
            ],
            [LogPathway.STATE_PERSIST]: [
                'src/orchestration/OrchestratorState.ts'
            ],
            [LogPathway.RENDER_PIPELINE]: [
                'src/webview/SimpleTimelineApp.ts',
                'src/visualization/d3/D3TimelineRenderer.ts'
            ],
            [LogPathway.USER_INTERACTION]: [
                'src/visualization/d3/InteractionHandler.ts',
                'src/visualization/ui/PopupController.ts'
            ],
            [LogPathway.WEBVIEW_MESSAGING]: [
                'src/extension.ts',
                'src/webview/main.ts'
            ],
            [LogPathway.CONFIG_SYNC]: [
                'src/extension.ts',
                'src/visualization/theme/EventVisualTheme.ts'
            ],
            [LogPathway.RANGE_SELECTOR]: [
                'src/visualization/d3/RangeSelector.ts'
            ]
        };

        return (pathwayFiles[this.report.pathway] || []).map(file => ({
            file,
            reason: `Core file for ${LogPathway[this.report.pathway]} pathway`
        }));
    }

    /**
     * Analyze log patterns for suspicious activity
     */
    private analyzeLogPatterns(): {
        totalLogs: number;
        errorCount: number;
        warningCount: number;
        suspiciousPatterns: string[];
        timeline: string[];
    } {
        const suspiciousPatterns: string[] = [];

        // Check for repeated errors
        const errorMessages = this.report.capturedLogs
            .filter(log => log.level === LogLevel.ERROR)
            .map(log => log.message);

        const errorCounts = errorMessages.reduce((acc, msg) => {
            acc[msg] = (acc[msg] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        Object.entries(errorCounts).forEach(([msg, count]) => {
            if (count > 2) {
                suspiciousPatterns.push(`Repeated error (${count}x): ${msg}`);
            }
        });

        // Build timeline
        const timeline = this.report.timeline.map((result, i) => {
            const status = result.reached ? '✓' : '✗';
            const time = result.timestamp ? `[${result.timestamp}ms]` : '[---]';
            return `${status} ${time} ${result.milestone.context}${!result.reached && result.reason ? ` (${result.reason})` : ''}`;
        });

        return {
            totalLogs: this.report.capturedLogs.length,
            errorCount: this.report.capturedLogs.filter(log => log.level === LogLevel.ERROR).length,
            warningCount: this.report.capturedLogs.filter(log => log.level === LogLevel.WARN).length,
            suspiciousPatterns,
            timeline
        };
    }

    /**
     * Build AI-specific context
     */
    private buildAIContext(failurePoint: any): any {
        const lastSuccess = this.getLastSuccessfulMilestone(failurePoint.index);

        const dataFlow: string[] = [];
        for (let i = 0; i <= failurePoint.index; i++) {
            const milestone = this.report.timeline[i];
            if (milestone.reached) {
                dataFlow.push(milestone.milestone.context);
            }
        }

        const stateChanges = this.report.capturedLogs
            .filter(log => log.message.toLowerCase().includes('state') || log.message.toLowerCase().includes('update'))
            .map(log => `${log.context}: ${log.message}`);

        return {
            lastSuccessfulMilestone: lastSuccess?.milestone.context,
            failedMilestone: failurePoint.milestone,
            timeBetween: lastSuccess ? (failurePoint.timestamp || Date.now()) - lastSuccess.timestamp! : undefined,
            dataFlow,
            stateChanges
        };
    }

    /**
     * Helper: Get last successful milestone before index
     */
    private getLastSuccessfulMilestone(beforeIndex: number): MilestoneResult | undefined {
        return this.report.timeline
            .slice(0, beforeIndex)
            .reverse()
            .find(m => m.reached);
    }

    /**
     * Helper: Infer file from context
     */
    private inferFileFromContext(context: string): string {
        const parts = context.split('.');
        if (parts.length > 1) {
            return `src/**/${parts[0]}.ts`;
        }
        return `src/**/${context}.ts`;
    }

    /**
     * Determine overall status
     */
    private determineStatus(): 'failed' | 'partial' | 'timeout' {
        if (this.report.executionTime > 10000) return 'timeout';
        if (this.report.reachedMilestones > 0) return 'partial';
        return 'failed';
    }

    /**
     * Generate human-readable summary
     */
    private generateSummary(failurePoint: any): string {
        const lastSuccess = this.getLastSuccessfulMilestone(failurePoint.index);
        const progress = `${this.report.reachedMilestones}/${this.report.totalMilestones} milestones reached`;

        if (!lastSuccess) {
            return `Pathway failed immediately at first milestone '${failurePoint.milestone}'. ${progress}.`;
        }

        return `Pathway failed at '${failurePoint.milestone}' after successfully completing '${lastSuccess.milestone.context}'. ${progress}.`;
    }
}
