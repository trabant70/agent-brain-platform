/**
 * Pathway Testing Setup
 *
 * Initializes the pathway testing infrastructure for Jest test suites.
 * Import this file in jest.config.js setupFilesAfterEnv to enable pathway testing.
 */

import { logger, LogLevel, LogCategory, LogPathway } from '../../src/utils/Logger';
import { LogCapture, getLogCapture } from '../utils/LogCapture';
import { pathwayMatchers } from '../utils/pathway-matchers';

/**
 * Setup pathway testing environment
 */
export function setupPathwayTesting(): void {
    // Extend Jest with custom matchers
    expect.extend(pathwayMatchers);

    // Configure logger for test mode
    logger.setLogLevel(LogLevel.TRACE);  // Capture all logs in tests
    logger.setEnabledCategories(Object.values(LogCategory));
    logger.setPathwayMode('disabled');  // Log all pathways in test mode

    // Connect Logger to LogCapture
    const logCapture = getLogCapture();
    logger.enableTestMode((level, category, message, context, data, pathway) => {
        logCapture.capture(level, category, message, context, data, pathway);
    });

    // Global test lifecycle hooks
    beforeEach(() => {
        // Clear logs before each test
        logCapture.clear();
    });

    afterEach(() => {
        // Disable capture after each test to prevent leaks
        logCapture.disable();
    });

    // Cleanup on test suite completion
    afterAll(() => {
        logger.disableTestMode();
    });
}

/**
 * Utility: Enable log capture for specific pathway
 */
export function capturePathway(pathway: LogPathway): void {
    const logCapture = getLogCapture();
    logCapture.enable(pathway);
}

/**
 * Utility: Get logs for analysis
 */
export function getPathwayLogs(pathway?: LogPathway) {
    const logCapture = getLogCapture();
    return pathway ? logCapture.getLogsForPathway(pathway) : logCapture.getLogs();
}

/**
 * Utility: Print pathway log summary (useful for debugging)
 */
export function printLogSummary(): void {
    const logCapture = getLogCapture();
    const summary = logCapture.getSummary();

    console.log('\n=== Log Summary ===');
    console.log(`Total logs: ${summary.total}`);
    console.log(`Errors: ${summary.errors}, Warnings: ${summary.warnings}`);

    console.log('\nBy Level:');
    Object.entries(summary.byLevel).forEach(([level, count]) => {
        console.log(`  ${level}: ${count}`);
    });

    console.log('\nBy Category:');
    Object.entries(summary.byCategory).forEach(([category, count]) => {
        console.log(`  ${category}: ${count}`);
    });

    console.log('\nBy Pathway:');
    Object.entries(summary.byPathway).forEach(([pathway, count]) => {
        console.log(`  ${pathway}: ${count}`);
    });
    console.log('===================\n');
}

/**
 * Utility: Create test data snapshot for pathway debugging
 */
export function createPathwaySnapshot(pathway: LogPathway, additionalContext?: any) {
    const logCapture = getLogCapture();
    const logs = logCapture.getLogsForPathway(pathway);

    return {
        pathway: LogPathway[pathway],
        timestamp: new Date().toISOString(),
        logCount: logs.length,
        logs: logs.map(log => ({
            timestamp: log.timestamp,
            level: LogLevel[log.level],
            category: LogCategory[log.category],
            message: log.message,
            context: log.context,
            data: log.data
        })),
        context: additionalContext
    };
}

/**
 * Utility: Wait for specific log to appear (useful for async pathway tests)
 */
export async function waitForLog(
    context: string,
    pathway?: LogPathway,
    timeoutMs: number = 5000
): Promise<boolean> {
    const logCapture = getLogCapture();
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
        const logs = pathway
            ? logCapture.getLogsForPathway(pathway)
            : logCapture.getLogs();

        if (logs.some(log => log.context === context)) {
            return true;
        }

        await new Promise(resolve => setTimeout(resolve, 50));
    }

    return false;
}

// Auto-initialize if this file is imported
setupPathwayTesting();
