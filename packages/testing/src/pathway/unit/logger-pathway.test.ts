/**
 * Logger Pathway Test - Proof of Concept
 *
 * This test proves pathway testing works WITHOUT needing VSCode or webview.
 * It tests just the Logger component to verify log capture and pathway verification.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { logger, LogLevel, LogCategory, LogPathway } from '../../../src/utils/Logger';
import { getLogCapture } from '../../utils/LogCapture';
import { PathwayAsserter } from '../../utils/PathwayAsserter';
import { PathwayDebugger } from '../../utils/PathwayDebugger';

describe('Logger Pathway - Proof of Concept', () => {
    beforeEach(() => {
        const logCapture = getLogCapture();
        logCapture.clear();
        logCapture.enable(); // Capture all pathways
    });

    it('should complete a simple logging pathway', () => {
        // Define expected pathway
        const asserter = new PathwayAsserter(LogPathway.DATA_INGESTION)
            .expectMilestone('step1')
            .expectMilestone('step2')
            .expectMilestone('step3');

        // Execute code that generates logs
        logger.debug(LogCategory.TEST, 'Starting test', 'step1', undefined, LogPathway.DATA_INGESTION);
        logger.debug(LogCategory.TEST, 'Processing', 'step2', undefined, LogPathway.DATA_INGESTION);
        logger.debug(LogCategory.TEST, 'Completed', 'step3', undefined, LogPathway.DATA_INGESTION);

        // Verify pathway
        asserter.setCapturedLogs(getLogCapture().getLogs());
        const result = asserter.verify();

        // Should pass!
        expect(result.passed).toBe(true);
        expect(result.reachedMilestones).toBe(3);
        expect(result.totalMilestones).toBe(3);
    });

    it('should detect when milestone is missing', () => {
        const asserter = new PathwayAsserter(LogPathway.DATA_INGESTION)
            .expectMilestone('step1')
            .expectMilestone('step2')  // This won't be logged
            .expectMilestone('step3');

        // Execute code - skip step2
        logger.debug(LogCategory.TEST, 'Starting', 'step1', undefined, LogPathway.DATA_INGESTION);
        // Oops! Forgot step2
        logger.debug(LogCategory.TEST, 'Completed', 'step3', undefined, LogPathway.DATA_INGESTION);

        // Verify pathway
        asserter.setCapturedLogs(getLogCapture().getLogs());
        const result = asserter.verify();

        // Should fail at step2
        expect(result.passed).toBe(false);
        expect(result.failedAtIndex).toBe(1); // Index 1 = step2
        expect(result.reachedMilestones).toBe(2); // Only step1 and step3

        // Verify AI debugging works
        const pathwayDebugger = new PathwayDebugger(result);
        const analysis = pathwayDebugger.analyzeFailure();

        expect(analysis.failurePoint.milestone).toBe('step2');
        expect(analysis.hypotheses.length).toBeGreaterThan(0); // Fixed: hypotheses not suggestions
    });

    it('should work with message matchers', () => {
        const asserter = new PathwayAsserter(LogPathway.FILTER_APPLY)
            .expectMilestone('validateInput', {
                message: /Validating.*input/i,
                category: LogCategory.FILTERING
            })
            .expectMilestone('applyFilter', {
                message: /Applying.*filter/i
            });

        // Execute with matching messages
        logger.debug(
            LogCategory.FILTERING,
            'Validating user input',
            'validateInput',
            undefined,
            LogPathway.FILTER_APPLY
        );

        logger.debug(
            LogCategory.FILTERING,
            'Applying filter to events',
            'applyFilter',
            undefined,
            LogPathway.FILTER_APPLY
        );

        // Verify
        asserter.setCapturedLogs(getLogCapture().getLogs());
        const result = asserter.verify();

        expect(result.passed).toBe(true);
    });

    it('should work with optional milestones', () => {
        const asserter = new PathwayAsserter(LogPathway.DATA_INGESTION)
            .expectMilestone('fetchData')
            .expectOptionalMilestone('checkCache')  // Optional
            .expectMilestone('processData');

        // Execute WITHOUT optional milestone
        logger.debug(LogCategory.DATA, 'Fetching', 'fetchData', undefined, LogPathway.DATA_INGESTION);
        // Skip cache check
        logger.debug(LogCategory.DATA, 'Processing', 'processData', undefined, LogPathway.DATA_INGESTION);

        // Verify - should still pass
        asserter.setCapturedLogs(getLogCapture().getLogs());
        const result = asserter.verify();

        expect(result.passed).toBe(true);
        expect(result.reachedMilestones).toBe(2); // fetchData + processData
    });

    it('should generate AI-debuggable output', () => {
        const asserter = new PathwayAsserter(LogPathway.RENDER_PIPELINE)
            .expectMilestone('prepareData')
            .expectMilestone('calculateScales')
            .expectMilestone('renderSVG');

        // Execute - miss the middle step
        logger.debug(LogCategory.VISUALIZATION, 'Preparing', 'prepareData', undefined, LogPathway.RENDER_PIPELINE);
        // Forgot calculateScales!
        logger.debug(LogCategory.VISUALIZATION, 'Rendering', 'renderSVG', undefined, LogPathway.RENDER_PIPELINE);

        asserter.setCapturedLogs(getLogCapture().getLogs());
        const result = asserter.verify();

        expect(result.passed).toBe(false);

        // Generate AI debug output
        const pathwayDebugger = new PathwayDebugger(result);
        const aiOutput = pathwayDebugger.formatForAI();

        // Verify AI output contains useful info
        expect(aiOutput).toContain('PATHWAY TEST FAILURE ANALYSIS');
        expect(aiOutput).toContain('calculateScales');
        expect(aiOutput).toContain('TOP HYPOTHESES');

        // Verify JSON output
        const jsonOutput = pathwayDebugger.toJSON();
        const parsed = JSON.parse(jsonOutput);

        expect(parsed.status).toBe('partial'); // It's partial because 2/3 milestones passed
        expect(parsed.failurePoint.milestone).toBe('calculateScales');
        expect(parsed.hypotheses).toBeDefined();
        expect(parsed.hypotheses.length).toBeGreaterThan(0);
    });

    it('should track execution time', async () => {
        const asserter = new PathwayAsserter(LogPathway.USER_INTERACTION)
            .expectMilestone('handleClick')
            .expectMilestone('updateState')
            .expectMilestone('renderUI');

        const startTime = Date.now();

        // Execute with delays
        logger.debug(LogCategory.UI, 'Click', 'handleClick', undefined, LogPathway.USER_INTERACTION);
        await new Promise(resolve => setTimeout(resolve, 50));

        logger.debug(LogCategory.UI, 'Update', 'updateState', undefined, LogPathway.USER_INTERACTION);
        await new Promise(resolve => setTimeout(resolve, 50));

        logger.debug(LogCategory.UI, 'Render', 'renderUI', undefined, LogPathway.USER_INTERACTION);

        asserter.setCapturedLogs(getLogCapture().getLogs());
        const result = asserter.verify();

        expect(result.passed).toBe(true);
        expect(result.executionTime).toBeGreaterThan(0);
        expect(result.executionTime).toBeGreaterThanOrEqual(100); // At least 100ms
    });
});
