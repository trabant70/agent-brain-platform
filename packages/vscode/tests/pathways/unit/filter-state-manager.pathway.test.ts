/**
 * FilterStateManager Pathway Tests - Component Level
 * Tests FilterStateManager state persistence pathways
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { FilterStateManager } from '../../../src/orchestration/FilterStateManager';
import { PathwayAsserter } from '../../utils/PathwayAsserter';
import { PathwayDebugger } from '../../utils/PathwayDebugger';
import { getLogCapture } from '../../utils/LogCapture';
import { LogPathway } from '@agent-brain/core/infrastructure/logging';

describe('FilterStateManager - Component Pathways', () => {
    let manager: FilterStateManager;

    beforeEach(() => {
        // Clear log capture
        getLogCapture().clear();
        getLogCapture().enable(LogPathway.STATE_PERSIST);

        // Create manager
        manager = new FilterStateManager();
    });

    describe('STATE_PERSIST Pathway', () => {
        it('should complete getFilterState pathway for new repo', () => {
            const asserter = new PathwayAsserter(LogPathway.STATE_PERSIST)
                .expectMilestone('FilterStateManager.getFilterState', {
                    message: /Initializing filter state/i
                });

            // Get filter state for new repo
            const state = manager.getFilterState('/test/repo');

            // Verify pathway
            asserter.setCapturedLogs(getLogCapture().getLogs());
            const result = asserter.verify();

            if (!result.passed) {
                const pathwayDebugger = new PathwayDebugger(result);
                console.log(pathwayDebugger.formatForAI());
            }

            expect(result.passed).toBe(true);
            expect(state).toEqual({});
        });

        it('should complete setFilterState pathway', () => {
            const asserter = new PathwayAsserter(LogPathway.STATE_PERSIST)
                .expectMilestone('FilterStateManager.setFilterState', {
                    message: /Updating filter state/i
                });

            // Set filter state
            manager.setFilterState('/test/repo', {
                selectedEventTypes: ['commit'],
                selectedBranches: ['main']
            });

            // Verify pathway
            asserter.setCapturedLogs(getLogCapture().getLogs());
            const result = asserter.verify();

            expect(result.passed).toBe(true);
        });

        it('should complete resetFilterState pathway', () => {
            // First set some state
            manager.setFilterState('/test/repo', {
                selectedEventTypes: ['commit']
            });

            // Clear logs
            getLogCapture().clear();

            const asserter = new PathwayAsserter(LogPathway.STATE_PERSIST)
                .expectMilestone('FilterStateManager.resetFilterState', {
                    message: /Resetting filter state/i
                });

            // Reset
            manager.resetFilterState('/test/repo');

            // Verify pathway
            asserter.setCapturedLogs(getLogCapture().getLogs());
            const result = asserter.verify();

            expect(result.passed).toBe(true);

            // Verify state was reset
            const state = manager.getFilterState('/test/repo');
            expect(state).toEqual({});
        });

        it('should persist state across multiple get calls', () => {
            // Set initial state
            manager.setFilterState('/test/repo', {
                selectedEventTypes: ['commit', 'merge']
            });

            // Get state multiple times
            const state1 = manager.getFilterState('/test/repo');
            const state2 = manager.getFilterState('/test/repo');

            // Should return same state
            expect(state1).toEqual(state2);
            expect(state1.selectedEventTypes).toEqual(['commit', 'merge']);
        });

        it('should maintain separate states for different repos', () => {
            // Set state for repo 1
            manager.setFilterState('/test/repo1', {
                selectedEventTypes: ['commit']
            });

            // Set state for repo 2
            manager.setFilterState('/test/repo2', {
                selectedEventTypes: ['merge']
            });

            // Verify they're independent
            const state1 = manager.getFilterState('/test/repo1');
            const state2 = manager.getFilterState('/test/repo2');

            expect(state1.selectedEventTypes).toEqual(['commit']);
            expect(state2.selectedEventTypes).toEqual(['merge']);
        });

        it('should detect active filters', () => {
            // No filters initially
            expect(manager.hasActiveFilters('/test/repo')).toBe(false);

            // Set some filters
            manager.setFilterState('/test/repo', {
                selectedEventTypes: ['commit']
            });

            // Should detect active filters
            expect(manager.hasActiveFilters('/test/repo')).toBe(true);

            // Reset
            manager.resetFilterState('/test/repo');

            // Should no longer have active filters
            expect(manager.hasActiveFilters('/test/repo')).toBe(false);
        });

        it('should track repository paths', () => {
            manager.setFilterState('/test/repo1', {});
            manager.setFilterState('/test/repo2', {});
            manager.setFilterState('/test/repo3', {});

            const tracked = manager.getTrackedRepositories();

            expect(tracked).toHaveLength(3);
            expect(tracked).toContain('/test/repo1');
            expect(tracked).toContain('/test/repo2');
            expect(tracked).toContain('/test/repo3');
        });

        it('should clear all states', () => {
            manager.setFilterState('/test/repo1', { selectedEventTypes: ['commit'] });
            manager.setFilterState('/test/repo2', { selectedEventTypes: ['merge'] });

            // Clear all
            manager.clearAll();

            const tracked = manager.getTrackedRepositories();
            expect(tracked).toHaveLength(0);
        });

        it('should export and import states', () => {
            // Set up some states
            manager.setFilterState('/test/repo1', {
                selectedEventTypes: ['commit']
            });
            manager.setFilterState('/test/repo2', {
                selectedBranches: ['main']
            });

            // Export
            const exported = manager.exportStates();

            // Clear and import
            manager.clearAll();
            manager.importStates(exported);

            // Verify states restored
            const state1 = manager.getFilterState('/test/repo1');
            const state2 = manager.getFilterState('/test/repo2');

            expect(state1.selectedEventTypes).toEqual(['commit']);
            expect(state2.selectedBranches).toEqual(['main']);
        });

        it('should update filter state partially', () => {
            // Set initial state
            manager.setFilterState('/test/repo', {
                selectedEventTypes: ['commit'],
                selectedBranches: ['main']
            });

            // Update only event types
            manager.updateFilterState('/test/repo', {
                selectedEventTypes: ['commit', 'merge']
            });

            // Branches should still be there
            const state = manager.getFilterState('/test/repo');
            expect(state.selectedEventTypes).toEqual(['commit', 'merge']);
            expect(state.selectedBranches).toEqual(['main']);
        });
    });

    describe('Performance Validation', () => {
        it('should handle many repositories efficiently', () => {
            const startTime = Date.now();

            // Create 100 repositories
            for (let i = 0; i < 100; i++) {
                manager.setFilterState(`/test/repo${i}`, {
                    selectedEventTypes: ['commit']
                });
            }

            // Access them all
            for (let i = 0; i < 100; i++) {
                manager.getFilterState(`/test/repo${i}`);
            }

            const duration = Date.now() - startTime;

            // Should be very fast (< 100ms for 200 operations)
            expect(duration).toBeLessThan(100);
        });
    });

    describe('Debug and Monitoring', () => {
        it('should provide debug information', () => {
            manager.setFilterState('/test/repo1', { selectedEventTypes: ['commit'] });
            manager.setFilterState('/test/repo2', {});

            const debugInfo = manager.getDebugInfo();

            expect(debugInfo).toHaveLength(2);
            expect(debugInfo[0].hasFilters).toBe(true);
            expect(debugInfo[1].hasFilters).toBe(false);
        });

        it('should track current repository', () => {
            manager.setFilterState('/test/repo1', {});
            expect(manager.getCurrentRepoPath()).toBe('/test/repo1');

            manager.getFilterState('/test/repo2');
            expect(manager.getCurrentRepoPath()).toBe('/test/repo2');
        });
    });
});
