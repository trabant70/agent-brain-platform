/**
 * LogCapture - Test Mode Logger Interceptor
 *
 * Captures log emissions during test execution for pathway verification.
 * Works as a singleton to intercept all logs across the test suite.
 */

import { LogLevel, LogCategory, LogPathway } from '../../src/utils/Logger';
import { LogEntry } from './PathwayAsserter';

/**
 * LogCapture singleton for test mode
 */
export class LogCapture {
    private static instance: LogCapture;
    private logs: LogEntry[] = [];
    private enabled: boolean = false;
    private pathwayFilter?: LogPathway;  // Only capture specific pathway if set

    private constructor() {}

    /**
     * Get singleton instance
     */
    static getInstance(): LogCapture {
        if (!LogCapture.instance) {
            LogCapture.instance = new LogCapture();
        }
        return LogCapture.instance;
    }

    /**
     * Enable log capture
     */
    enable(pathwayFilter?: LogPathway): void {
        this.enabled = true;
        this.pathwayFilter = pathwayFilter;
        this.logs = [];
    }

    /**
     * Disable log capture
     */
    disable(): void {
        this.enabled = false;
        this.pathwayFilter = undefined;
    }

    /**
     * Clear captured logs
     */
    clear(): void {
        this.logs = [];
    }

    /**
     * Check if capture is enabled
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Capture a log entry (called by Logger in test mode)
     */
    capture(
        level: LogLevel,
        category: LogCategory,
        message: string,
        context?: string,
        data?: any,
        pathway?: LogPathway
    ): void {
        if (!this.enabled) return;

        // Filter by pathway if specified
        if (this.pathwayFilter !== undefined && pathway !== this.pathwayFilter) {
            return;
        }

        this.logs.push({
            timestamp: Date.now(),
            level,
            category,
            message,
            context,
            data: data ? JSON.parse(JSON.stringify(data)) : undefined,  // Deep clone
            pathway
        });
    }

    /**
     * Get all captured logs
     */
    getLogs(): LogEntry[] {
        return [...this.logs];  // Return copy
    }

    /**
     * Get logs for a specific pathway
     */
    getLogsForPathway(pathway: LogPathway): LogEntry[] {
        return this.logs.filter(log => log.pathway === pathway);
    }

    /**
     * Get logs for a specific context
     */
    getLogsForContext(context: string): LogEntry[] {
        return this.logs.filter(log => log.context === context);
    }

    /**
     * Get logs by level
     */
    getLogsByLevel(level: LogLevel): LogEntry[] {
        return this.logs.filter(log => log.level === level);
    }

    /**
     * Get logs by category
     */
    getLogsByCategory(category: LogCategory): LogEntry[] {
        return this.logs.filter(log => log.category === category);
    }

    /**
     * Get error logs
     */
    getErrors(): LogEntry[] {
        return this.getLogsByLevel(LogLevel.ERROR);
    }

    /**
     * Get warning logs
     */
    getWarnings(): LogEntry[] {
        return this.getLogsByLevel(LogLevel.WARN);
    }

    /**
     * Get logs within time range
     */
    getLogsInRange(startTime: number, endTime: number): LogEntry[] {
        return this.logs.filter(log =>
            log.timestamp >= startTime && log.timestamp <= endTime
        );
    }

    /**
     * Get summary statistics
     */
    getSummary(): {
        total: number;
        byLevel: Record<string, number>;
        byCategory: Record<string, number>;
        byPathway: Record<string, number>;
        errors: number;
        warnings: number;
    } {
        const byLevel: Record<string, number> = {};
        const byCategory: Record<string, number> = {};
        const byPathway: Record<string, number> = {};

        for (const log of this.logs) {
            // Count by level
            const levelName = LogLevel[log.level];
            byLevel[levelName] = (byLevel[levelName] || 0) + 1;

            // Count by category
            const categoryName = LogCategory[log.category];
            byCategory[categoryName] = (byCategory[categoryName] || 0) + 1;

            // Count by pathway
            if (log.pathway !== undefined) {
                const pathwayName = LogPathway[log.pathway];
                byPathway[pathwayName] = (byPathway[pathwayName] || 0) + 1;
            }
        }

        return {
            total: this.logs.length,
            byLevel,
            byCategory,
            byPathway,
            errors: byLevel[LogLevel[LogLevel.ERROR]] || 0,
            warnings: byLevel[LogLevel[LogLevel.WARN]] || 0
        };
    }

    /**
     * Export logs as JSON
     */
    toJSON(): string {
        return JSON.stringify({
            captured: this.logs.length,
            pathwayFilter: this.pathwayFilter !== undefined ? LogPathway[this.pathwayFilter] : null,
            summary: this.getSummary(),
            logs: this.logs.map(log => ({
                timestamp: log.timestamp,
                level: LogLevel[log.level],
                category: LogCategory[log.category],
                message: log.message,
                context: log.context,
                pathway: log.pathway !== undefined ? LogPathway[log.pathway] : undefined,
                data: log.data
            }))
        }, null, 2);
    }

    /**
     * Create a snapshot of current logs (for comparison)
     */
    snapshot(): LogEntry[] {
        return [...this.logs];
    }

    /**
     * Get logs added since snapshot
     */
    getLogsSince(snapshot: LogEntry[]): LogEntry[] {
        const snapshotLength = snapshot.length;
        return this.logs.slice(snapshotLength);
    }
}

/**
 * Convenience function to get LogCapture instance
 */
export function getLogCapture(): LogCapture {
    return LogCapture.getInstance();
}

/**
 * Decorator for automatic log capture in tests
 */
export function withLogCapture(pathway?: LogPathway) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const capture = LogCapture.getInstance();
            capture.enable(pathway);

            try {
                const result = await originalMethod.apply(this, args);
                return result;
            } finally {
                capture.disable();
            }
        };

        return descriptor;
    };
}
