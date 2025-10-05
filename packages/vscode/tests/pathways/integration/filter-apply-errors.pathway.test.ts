/**
 * FILTER_APPLY Pathway - Error Scenario Tests
 *
 * Tests error handling and failure modes in filter application:
 * - Invalid filter values
 * - State corruption
 * - Missing filter options
 *
 * Phase 3 - Week 5-6: Error scenario testing
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PathwayAsserter } from '../../utils/PathwayAsserter';
import { getLogCapture } from '../../utils/LogCapture';
import { LogPathway } from '@agent-brain/core/infrastructure/logging';
import { FilterStateManager } from '../../../src/orchestration/FilterStateManager';

describe('FILTER_APPLY Pathway - Error Scenarios', () => {
    let stateManager: FilterStateManager;

    beforeEach(() => {
        getLogCapture().clear();
        getLogCapture().enable(LogPathway.FILTER_APPLY);
        getLogCapture().enable(LogPathway.STATE_PERSIST);
        stateManager = new FilterStateManager();
    });

    it('should handle null repository path gracefully', () => {
        // Should not crash with null path
        const state = stateManager.getFilterState(null as any);
        expect(state).toBeDefined();
        expect(state).toEqual({});
    });

    it('should handle undefined repository path gracefully', () => {
        const state = stateManager.getFilterState(undefined as any);
        expect(state).toBeDefined();
        expect(state).toEqual({});
    });

    it('should handle empty string repository path', () => {
        const state = stateManager.getFilterState('');
        expect(state).toBeDefined();
        expect(state).toEqual({});
    });

    it('should handle invalid filter state updates', () => {
        const repoPath = '/test/repo';

        // Set valid state first
        stateManager.setFilterState(repoPath, {
            selectedEventTypes: ['commit']
        });

        // Try to set invalid state (should handle gracefully)
        stateManager.setFilterState(repoPath, null as any);

        // Should still have previous valid state or empty state
        const state = stateManager.getFilterState(repoPath);
        expect(state).toBeDefined();
    });

    it('should handle corrupted filter state data', () => {
        const repoPath = '/test/repo';

        // Set state with invalid data types
        stateManager.setFilterState(repoPath, {
            selectedEventTypes: 'not-an-array' as any,
            selectedBranches: 123 as any,
            selectedAuthors: { invalid: 'object' } as any
        });

        // Should handle gracefully and return state
        const state = stateManager.getFilterState(repoPath);
        expect(state).toBeDefined();
    });

    it('should handle reset on non-existent repository', () => {
        const nonExistentRepo = '/non/existent/repo';

        // Should not crash
        expect(() => {
            stateManager.resetFilterState(nonExistentRepo);
        }).not.toThrow();

        // Should return empty state after reset
        const state = stateManager.getFilterState(nonExistentRepo);
        expect(state).toEqual({});
    });

    it('should detect no active filters on fresh repository', () => {
        const repoPath = '/test/fresh/repo';

        const hasFilters = stateManager.hasActiveFilters(repoPath);
        expect(hasFilters).toBe(false);
    });

    it('should detect active filters with various filter types', () => {
        const repoPath = '/test/repo';

        // Test with event type filter
        stateManager.setFilterState(repoPath, {
            selectedEventTypes: ['commit']
        });
        expect(stateManager.hasActiveFilters(repoPath)).toBe(true);

        // Reset
        stateManager.resetFilterState(repoPath);
        expect(stateManager.hasActiveFilters(repoPath)).toBe(false);

        // Test with branch filter
        stateManager.setFilterState(repoPath, {
            selectedBranches: ['main']
        });
        expect(stateManager.hasActiveFilters(repoPath)).toBe(true);

        // Reset
        stateManager.resetFilterState(repoPath);

        // Test with author filter
        stateManager.setFilterState(repoPath, {
            selectedAuthors: ['alice']
        });
        expect(stateManager.hasActiveFilters(repoPath)).toBe(true);
    });

    it('should handle export with no states', () => {
        const exported = stateManager.exportStates();

        expect(exported).toBeDefined();
        expect(typeof exported).toBe('object');
    });

    it('should handle import with empty data', () => {
        expect(() => {
            stateManager.importStates({});
        }).not.toThrow();

        expect(() => {
            stateManager.importStates(null as any);
        }).not.toThrow();

        expect(() => {
            stateManager.importStates(undefined as any);
        }).not.toThrow();
    });

    it('should handle import with corrupted data', () => {
        expect(() => {
            stateManager.importStates({
                '/repo1': 'invalid-data' as any,
                '/repo2': 123 as any,
                '/repo3': ['array-not-object'] as any
            });
        }).not.toThrow();
    });

    it('should maintain state isolation between repositories', () => {
        const repo1 = '/test/repo1';
        const repo2 = '/test/repo2';

        // Set different filters for each repo
        stateManager.setFilterState(repo1, {
            selectedEventTypes: ['commit']
        });

        stateManager.setFilterState(repo2, {
            selectedEventTypes: ['merge']
        });

        // Verify isolation
        const state1 = stateManager.getFilterState(repo1);
        const state2 = stateManager.getFilterState(repo2);

        expect(state1.selectedEventTypes).toEqual(['commit']);
        expect(state2.selectedEventTypes).toEqual(['merge']);

        // Reset one should not affect the other
        stateManager.resetFilterState(repo1);

        expect(stateManager.getFilterState(repo1)).toEqual({});
        expect(stateManager.getFilterState(repo2).selectedEventTypes).toEqual(['merge']);
    });

    it('should handle clearAll operation', () => {
        // Set up multiple repositories
        stateManager.setFilterState('/repo1', { selectedEventTypes: ['commit'] });
        stateManager.setFilterState('/repo2', { selectedBranches: ['main'] });
        stateManager.setFilterState('/repo3', { selectedAuthors: ['alice'] });

        // Clear all
        stateManager.clearAll();

        // All should be empty
        expect(stateManager.hasActiveFilters('/repo1')).toBe(false);
        expect(stateManager.hasActiveFilters('/repo2')).toBe(false);
        expect(stateManager.hasActiveFilters('/repo3')).toBe(false);
    });

    it('should log state persistence milestones', () => {
        const asserter = new PathwayAsserter(LogPathway.STATE_PERSIST)
            .expectMilestone('FilterStateManager.setFilterState');

        const repoPath = '/test/repo';

        stateManager.setFilterState(repoPath, {
            selectedEventTypes: ['commit', 'merge']
        });

        // Verify pathway
        asserter.setCapturedLogs(getLogCapture().getLogs());
        const result = asserter.verify();

        expect(result.passed).toBe(true);
    });

    it('should handle rapid state updates', () => {
        const repoPath = '/test/repo';

        // Rapid updates
        for (let i = 0; i < 100; i++) {
            stateManager.setFilterState(repoPath, {
                selectedEventTypes: [`type-${i}`]
            });
        }

        // Should have last state
        const state = stateManager.getFilterState(repoPath);
        expect(state.selectedEventTypes).toEqual(['type-99']);
    });

    it('should handle very large filter arrays', () => {
        const repoPath = '/test/repo';

        // Create large filter arrays
        const largeEventTypes = Array.from({ length: 1000 }, (_, i) => `event-${i}`);
        const largeBranches = Array.from({ length: 500 }, (_, i) => `branch-${i}`);
        const largeAuthors = Array.from({ length: 200 }, (_, i) => `author-${i}`);

        stateManager.setFilterState(repoPath, {
            selectedEventTypes: largeEventTypes,
            selectedBranches: largeBranches,
            selectedAuthors: largeAuthors
        });

        const state = stateManager.getFilterState(repoPath);
        expect(state.selectedEventTypes?.length).toBe(1000);
        expect(state.selectedBranches?.length).toBe(500);
        expect(state.selectedAuthors?.length).toBe(200);
    });
});
