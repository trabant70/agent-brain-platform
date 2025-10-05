/**
 * DATA_INGESTION Pathway - Integration Tests
 *
 * Tests data flow from git repository through orchestrator to normalized events:
 * GitEventRepository → DataOrchestrator → CanonicalEvent[]
 *
 * Phase 2 - Week 3-4: Integration testing without VSCode
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import { PathwayAsserter } from '../../utils/PathwayAsserter';
import { PathwayDebugger } from '../../utils/PathwayDebugger';
import { getLogCapture } from '../../utils/LogCapture';
import { LogPathway } from '../../../src/utils/Logger';
import { TestRepositories } from '../../fixtures/test-repositories';
import { GitEventRepository } from '../../../src/timeline/infrastructure/GitEventRepository';

describe('DATA_INGESTION Pathway - Integration', () => {
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

    it('should complete git event extraction pathway', async () => {
        const asserter = new PathwayAsserter(LogPathway.DATA_INGESTION)
            .expectMilestone('GitEventRepository.extractGitEvents', {
                message: /Starting git event extraction/i
            })
            .expectMilestone('GitEventRepository.extractCommitEvents', {
                message: /Extracting commit events/i
            })
            .expectMilestone('GitEventRepository.parseCommitOutput', {
                message: /Parsing.*commit/i
            });

        // Execute git event extraction
        const repository = new GitEventRepository();
        const collection = await repository.extractGitEvents(testRepoPath);

        // Verify pathway
        asserter.setCapturedLogs(getLogCapture().getLogs());
        const result = asserter.verify();

        if (!result.passed) {
            const pathwayDebugger = new PathwayDebugger(result);
            console.log('\n=== FAILURE ANALYSIS ===');
            console.log(pathwayDebugger.formatForAI());
        }

        expect(result.passed).toBe(true);
        expect(collection.events.length).toBeGreaterThan(0);
    });

    it('should extract commit events with proper structure', async () => {
        const repository = new GitEventRepository();
        const collection = await repository.extractGitEvents(testRepoPath);

        // Verify event structure
        expect(collection.events.length).toBeGreaterThan(0);

        const firstEvent = collection.events[0];
        expect(firstEvent).toHaveProperty('id');
        expect(firstEvent).toHaveProperty('date');
        expect(firstEvent).toHaveProperty('type');
        expect(firstEvent).toHaveProperty('title');
        expect(firstEvent).toHaveProperty('author');
        expect(firstEvent).toHaveProperty('branch');
    });

    it('should handle empty repository gracefully', async () => {
        const asserter = new PathwayAsserter(LogPathway.DATA_INGESTION)
            .expectMilestone('GitEventRepository.extractGitEvents');

        // Create empty repository (will still have initial branch events)
        const emptyRepo = await TestRepositories.createMockRepo({
            commitCount: 0
        });

        const repository = new GitEventRepository();
        const collection = await repository.extractGitEvents(emptyRepo);

        // Verify pathway completed (may have branch creation events even with no commits)
        asserter.setCapturedLogs(getLogCapture().getLogs());
        const result = asserter.verify();

        if (!result.passed) {
            const pathwayDebugger = new PathwayDebugger(result);
            console.log('\n=== FAILURE ANALYSIS ===');
            console.log(pathwayDebugger.formatForAI());
        }

        expect(result.passed).toBe(true);
        // Empty repo may still have branch creation events
        expect(collection.events.length).toBeGreaterThanOrEqual(0);
    });

    it('should extract events from repository with multiple commits', async () => {
        // Create test repository with known commit count
        const testRepo = await TestRepositories.createMockRepo({
            commitCount: 5
        });

        const repository = new GitEventRepository();
        const collection = await repository.extractGitEvents(testRepo);

        // Should have at least the commits we created (plus possible branch events)
        expect(collection.events.length).toBeGreaterThanOrEqual(5);

        // Count commit events
        const commitEvents = collection.events.filter(e => e.type === 'commit');
        expect(commitEvents.length).toBeGreaterThanOrEqual(5);
    });

    it('should extract branch information correctly', async () => {
        const repository = new GitEventRepository();
        const collection = await repository.extractGitEvents(testRepoPath);

        // Verify collection has branches
        expect(collection.branches).toBeDefined();
        expect(collection.branches.length).toBeGreaterThan(0);

        // Verify branch structure
        collection.branches.forEach(branch => {
            expect(typeof branch).toBe('string');
            expect(branch.length).toBeGreaterThan(0);
        });

        // Verify events have branch field
        collection.events.forEach(event => {
            expect(event.branch).toBeDefined();
        });
    });

    it('should maintain chronological order', async () => {
        const repository = new GitEventRepository();
        const collection = await repository.extractGitEvents(testRepoPath);

        // Events should be ordered by date
        for (let i = 0; i < collection.events.length - 1; i++) {
            const current = collection.events[i].date;
            const next = collection.events[i + 1].date;
            expect(current.getTime()).toBeLessThanOrEqual(next.getTime());
        }
    });

    it('should complete pathway within reasonable time', async () => {
        const asserter = new PathwayAsserter(LogPathway.DATA_INGESTION)
            .expectMilestone('GitEventRepository.extractGitEvents')
            .expectMilestone('GitEventRepository.extractCommitEvents')
            .expectMilestone('GitEventRepository.parseCommitOutput');

        const startTime = Date.now();

        const repository = new GitEventRepository();
        const collection = await repository.extractGitEvents(testRepoPath);

        const duration = Date.now() - startTime;

        // Should complete in reasonable time (< 5 seconds for typical repo)
        expect(duration).toBeLessThan(5000);

        // Verify pathway
        asserter.setCapturedLogs(getLogCapture().getLogs());
        const result = asserter.verify();

        expect(result.passed).toBe(true);
        expect(collection.events.length).toBeGreaterThan(0);
    });
});
