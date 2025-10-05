/**
 * DataOrchestrator Pathway Tests - Component Level
 *
 * NOTE: Deferred to Phase 2 - VSCode mocking needs more setup
 * Will implement with proper VSCode test harness
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import { PathwayAsserter } from '../../utils/PathwayAsserter';
import { getLogCapture } from '../../utils/LogCapture';
import { LogPathway } from '@agent-brain/core/infrastructure/logging';
import { TestRepositories } from '../../fixtures/test-repositories';

describe.skip('DataOrchestrator - Component Pathways (Deferred to Phase 2)', () => {
    let testRepoPath: string;

    beforeEach(async () => {
        // Clear log capture
        getLogCapture().clear();
        getLogCapture().enable(LogPathway.DATA_INGESTION);

        // Use project repo for testing (fast, no setup needed)
        testRepoPath = TestRepositories.useProjectRepo();
    });

    afterAll(async () => {
        await TestRepositories.cleanupAll();
    });

    describe('DATA_INGESTION Pathway', () => {
        it('should complete initialization pathway', async () => {
            const asserter = new PathwayAsserter(LogPathway.DATA_INGESTION)
                .expectMilestone('constructor')
                .expectMilestone('initialize');

            // Orchestrator already initialized in beforeEach
            // Logs captured during construction and initialization

            asserter.setCapturedLogs(getLogCapture().getLogs());
            const result = asserter.verify();

            if (!result.passed) {
                const pathwayDebugger = new PathwayDebugger(result);
                console.log(pathwayDebugger.formatForAI());
            }

            expect(result.passed).toBe(true);
            expect(result.reachedMilestones).toBeGreaterThanOrEqual(1);
        });

        it('should complete getEvents pathway milestones', async () => {
            const asserter = new PathwayAsserter(LogPathway.DATA_INGESTION)
                .expectMilestone('getEvents')
                .expectMilestone('fetchFromProviders');

            // Execute getEvents
            const events = await orchestrator.getEvents(testRepoPath);

            // Verify pathway
            asserter.setCapturedLogs(getLogCapture().getLogs());
            const result = asserter.verify();

            if (!result.passed) {
                const pathwayDebugger = new PathwayDebugger(result);
                console.log(pathwayDebugger.formatForAI());
            }

            expect(result.passed).toBe(true);
            expect(events.length).toBeGreaterThan(0);
        });

        it('should use cache on second getEvents call', async () => {
            // First call - fetch from providers
            await orchestrator.getEvents(testRepoPath);

            // Clear logs
            getLogCapture().clear();

            const asserter = new PathwayAsserter(LogPathway.DATA_INGESTION)
                .expectMilestone('getEvents');

            // Second call - should use cache
            const events = await orchestrator.getEvents(testRepoPath);

            asserter.setCapturedLogs(getLogCapture().getLogs());
            const result = asserter.verify();

            // Should have getEvents milestone, but NOT fetchFromProviders
            expect(result.passed).toBe(true);
            expect(events.length).toBeGreaterThan(0);

            // Verify logs mention cache
            const logs = getLogCapture().getLogs();
            const cacheLog = logs.find(log =>
                log.message.toLowerCase().includes('cache')
            );
            expect(cacheLog).toBeDefined();
        });

        it('should bypass cache with forceRefresh', async () => {
            // First call
            await orchestrator.getEvents(testRepoPath);

            // Clear logs
            getLogCapture().clear();

            const asserter = new PathwayAsserter(LogPathway.DATA_INGESTION)
                .expectMilestone('getEvents')
                .expectMilestone('fetchFromProviders');

            // Force refresh
            const events = await orchestrator.getEvents(testRepoPath, true);

            asserter.setCapturedLogs(getLogCapture().getLogs());
            const result = asserter.verify();

            expect(result.passed).toBe(true);
            expect(events.length).toBeGreaterThan(0);
        });
    });

    describe('FILTER_APPLY Pathway', () => {
        it('should complete applyFilters pathway', async () => {
            // Get events first
            await orchestrator.getEvents(testRepoPath);

            // Clear and enable filter pathway
            getLogCapture().clear();
            getLogCapture().enable(LogPathway.FILTER_APPLY);

            const asserter = new PathwayAsserter(LogPathway.FILTER_APPLY)
                .expectMilestone('applyFilters');

            // Apply filters
            const filtered = await orchestrator.getFilteredEvents(testRepoPath, {
                selectedEventTypes: ['commit']
            });

            asserter.setCapturedLogs(getLogCapture().getLogs());
            const result = asserter.verify();

            if (!result.passed) {
                const pathwayDebugger = new PathwayDebugger(result);
                console.log(pathwayDebugger.formatForAI());
            }

            expect(result.passed).toBe(true);
            expect(filtered.length).toBeGreaterThan(0);
            expect(filtered.every(e => e.type === 'commit')).toBe(true);
        });

        it('should filter by multiple criteria', async () => {
            await orchestrator.getEvents(testRepoPath);

            getLogCapture().clear();
            getLogCapture().enable(LogPathway.FILTER_APPLY);

            const asserter = new PathwayAsserter(LogPathway.FILTER_APPLY)
                .expectMilestone('applyFilters');

            // Get filter options to find valid branch
            const options = await orchestrator.getFilterOptions(testRepoPath);
            const validBranch = options.branches[0];

            // Apply multiple filters
            const filtered = await orchestrator.getFilteredEvents(testRepoPath, {
                selectedEventTypes: ['commit'],
                selectedBranches: [validBranch]
            });

            asserter.setCapturedLogs(getLogCapture().getLogs());
            const result = asserter.verify();

            expect(result.passed).toBe(true);
            expect(filtered.every(e =>
                e.type === 'commit' && e.branches.includes(validBranch)
            )).toBe(true);
        });
    });

    describe('Error Scenarios', () => {
        it('should handle non-existent repository', async () => {
            const asserter = new PathwayAsserter(LogPathway.DATA_INGESTION)
                .expectMilestone('getEvents')
                .expectMilestone('fetchFromProviders');

            const invalidPath = TestRepositories.getNonExistentRepoPath();

            try {
                await orchestrator.getEvents(invalidPath);
            } catch (error) {
                // Expected to fail
            }

            asserter.setCapturedLogs(getLogCapture().getLogs());
            const result = asserter.verify();

            // Should have started the pathway, even if it failed
            expect(result.reachedMilestones).toBeGreaterThan(0);
        });

        it('should handle empty filter results', async () => {
            await orchestrator.getEvents(testRepoPath);

            getLogCapture().clear();
            getLogCapture().enable(LogPathway.FILTER_APPLY);

            const asserter = new PathwayAsserter(LogPathway.FILTER_APPLY)
                .expectMilestone('applyFilters');

            // Filter that matches nothing
            const filtered = await orchestrator.getFilteredEvents(testRepoPath, {
                selectedEventTypes: [] // Empty = show nothing
            });

            asserter.setCapturedLogs(getLogCapture().getLogs());
            const result = asserter.verify();

            expect(result.passed).toBe(true);
            expect(filtered.length).toBe(0);
        });
    });

    describe('Performance Validation', () => {
        it('should complete getEvents within reasonable time', async () => {
            const asserter = new PathwayAsserter(LogPathway.DATA_INGESTION)
                .expectMilestone('getEvents')
                .expectMilestone('fetchFromProviders');

            const startTime = Date.now();

            await orchestrator.getEvents(testRepoPath);

            const duration = Date.now() - startTime;

            asserter.setCapturedLogs(getLogCapture().getLogs());
            const result = asserter.verify();

            expect(result.passed).toBe(true);
            expect(duration).toBeLessThan(5000); // Should complete in < 5s
        });
    });
});
