/**
 * FILTER_APPLY Pathway - Integration Tests
 *
 * Tests filter interaction flow across multiple components:
 * FilterController → DataOrchestrator → FilterStateManager → SimpleTimelineApp
 *
 * Phase 2 - Week 3-4: Integration testing with UI simulator
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { TimelineUISimulator } from '../../utils/TimelineUISimulator';
import { PathwayAsserter } from '../../utils/PathwayAsserter';
import { PathwayDebugger } from '../../utils/PathwayDebugger';
import { getLogCapture } from '../../utils/LogCapture';
import { LogPathway } from '../../../src/utils/Logger';
import { FilterController } from '../../../src/visualization/ui/FilterController';
import { FilterStateManager } from '../../../src/orchestration/FilterStateManager';

describe('FILTER_APPLY Pathway - Integration', () => {
    let simulator: TimelineUISimulator;
    let filterController: FilterController;
    let stateManager: FilterStateManager;

    beforeEach(() => {
        // Clear log capture
        getLogCapture().clear();
        getLogCapture().enable(LogPathway.FILTER_APPLY);

        // Set up UI simulator
        simulator = new TimelineUISimulator({ enableLogging: false });
        simulator.setupDOM();

        // Create instances
        stateManager = new FilterStateManager();
        filterController = new FilterController({
            onFilterUpdate: (filters) => {
                console.log('[Test] Filter update received:', filters);
            }
        });
    });

    afterEach(() => {
        simulator.dispose();
    });

    it('should complete basic filter application pathway', () => {
        const asserter = new PathwayAsserter(LogPathway.FILTER_APPLY)
            .expectMilestone('FilterController.initialize', {
                message: /Initializing.*checkbox/i
            });

        // Initialize filter controller
        filterController.initialize();

        // Verify pathway
        asserter.setCapturedLogs(getLogCapture().getLogs());
        const result = asserter.verify();

        if (!result.passed) {
            const pathwayDebugger = new PathwayDebugger(result);
            console.log('\n=== FAILURE ANALYSIS ===');
            console.log(pathwayDebugger.formatForAI());
        }

        expect(result.passed).toBe(true);
    });

    it('should complete filter state persistence pathway', () => {
        const asserter = new PathwayAsserter(LogPathway.STATE_PERSIST)
            .expectMilestone('FilterStateManager.getFilterState', {
                message: /Initializing filter state/i
            })
            .expectMilestone('FilterStateManager.setFilterState', {
                message: /Updating filter state/i
            });

        // Enable STATE_PERSIST pathway logging
        getLogCapture().enable(LogPathway.STATE_PERSIST);

        // Get initial state (should create new)
        const state1 = stateManager.getFilterState('/test/repo');
        expect(state1).toEqual({});

        // Update filter state
        stateManager.setFilterState('/test/repo', {
            selectedEventTypes: ['commit']
        });

        // Get state again
        const state2 = stateManager.getFilterState('/test/repo');
        expect(state2.selectedEventTypes).toEqual(['commit']);

        // Verify pathway
        asserter.setCapturedLogs(getLogCapture().getLogs());
        const result = asserter.verify();

        if (!result.passed) {
            const pathwayDebugger = new PathwayDebugger(result);
            console.log('\n=== FAILURE ANALYSIS ===');
            console.log(pathwayDebugger.formatForAI());
        }

        expect(result.passed).toBe(true);
    });

    it('should update available filter options', () => {
        // Initialize
        filterController.initialize();

        // Clear logs from initialization
        getLogCapture().clear();

        // Create asserter AFTER clearing logs - only expecting updateAvailableOptions
        const asserter = new PathwayAsserter(LogPathway.FILTER_APPLY)
            .expectMilestone('FilterController.updateAvailableOptions', {
                message: /Updating available filter options/i
            });

        // Update available options
        filterController.updateAvailableOptions({
            branches: ['main', 'develop'],
            authors: ['alice', 'bob'],
            eventTypes: ['commit', 'merge', 'branch']
        });

        // Verify pathway
        asserter.setCapturedLogs(getLogCapture().getLogs());
        const result = asserter.verify();

        if (!result.passed) {
            const pathwayDebugger = new PathwayDebugger(result);
            console.log('\n=== FAILURE ANALYSIS ===');
            console.log(pathwayDebugger.formatForAI());
        }

        expect(result.passed).toBe(true);
    });

    it('should update event counts', () => {
        const asserter = new PathwayAsserter(LogPathway.FILTER_APPLY)
            .expectMilestone('FilterController.updateEventCounts', {
                message: /Updating event counts/i
            });

        // Initialize
        filterController.initialize();

        // Clear logs from initialization
        getLogCapture().clear();

        // Update event counts
        filterController.updateEventCounts({
            total: 100,
            filtered: 50,
            byType: new Map([['commit', 40], ['merge', 10]]),
            byBranch: new Map([['main', 30], ['develop', 20]]),
            byAuthor: new Map([['alice', 25], ['bob', 25]])
        });

        // Verify pathway
        asserter.setCapturedLogs(getLogCapture().getLogs());
        const result = asserter.verify();

        if (!result.passed) {
            const pathwayDebugger = new PathwayDebugger(result);
            console.log('\n=== FAILURE ANALYSIS ===');
            console.log(pathwayDebugger.formatForAI());
        }

        expect(result.passed).toBe(true);
    });

    it('should maintain filter state across repository switches', () => {
        // Clear logs and enable STATE_PERSIST pathway logging
        getLogCapture().clear();
        getLogCapture().enable(LogPathway.STATE_PERSIST);

        // Test only expects setFilterState milestones (getFilterState only logs on first access)
        const asserter = new PathwayAsserter(LogPathway.STATE_PERSIST)
            .expectMilestone('FilterStateManager.setFilterState');

        // Set filters for repo1
        stateManager.setFilterState('/test/repo1', {
            selectedEventTypes: ['commit']
        });

        // Set filters for repo2
        stateManager.setFilterState('/test/repo2', {
            selectedEventTypes: ['merge']
        });

        // Switch back to repo1 - should restore commit filter
        const repo1State = stateManager.getFilterState('/test/repo1');
        expect(repo1State.selectedEventTypes).toEqual(['commit']);

        // Verify repo2 is still intact
        const repo2State = stateManager.getFilterState('/test/repo2');
        expect(repo2State.selectedEventTypes).toEqual(['merge']);

        // Verify pathway
        asserter.setCapturedLogs(getLogCapture().getLogs());
        const result = asserter.verify();

        if (!result.passed) {
            const pathwayDebugger = new PathwayDebugger(result);
            console.log('\n=== FAILURE ANALYSIS ===');
            console.log(pathwayDebugger.formatForAI());
        }

        expect(result.passed).toBe(true);
    });

    it('should detect active filters correctly', () => {
        // No filters initially
        expect(stateManager.hasActiveFilters('/test/repo')).toBe(false);

        // Set some filters
        stateManager.setFilterState('/test/repo', {
            selectedEventTypes: ['commit']
        });

        // Should detect active filters
        expect(stateManager.hasActiveFilters('/test/repo')).toBe(true);

        // Reset
        stateManager.resetFilterState('/test/repo');

        // Should no longer have active filters
        expect(stateManager.hasActiveFilters('/test/repo')).toBe(false);
    });

    it('should export and import filter states', () => {
        const asserter = new PathwayAsserter(LogPathway.STATE_PERSIST)
            .expectMilestone('FilterStateManager.setFilterState')
            .expectMilestone('FilterStateManager.importStates', {
                message: /Importing.*filter states/i
            });

        // Enable STATE_PERSIST pathway logging
        getLogCapture().enable(LogPathway.STATE_PERSIST);

        // Set up some states
        stateManager.setFilterState('/test/repo1', {
            selectedEventTypes: ['commit']
        });
        stateManager.setFilterState('/test/repo2', {
            selectedBranches: ['main']
        });

        // Export
        const exported = stateManager.exportStates();

        // Clear and import
        stateManager.clearAll();
        stateManager.importStates(exported);

        // Verify states restored
        const state1 = stateManager.getFilterState('/test/repo1');
        const state2 = stateManager.getFilterState('/test/repo2');

        expect(state1.selectedEventTypes).toEqual(['commit']);
        expect(state2.selectedBranches).toEqual(['main']);

        // Verify pathway
        asserter.setCapturedLogs(getLogCapture().getLogs());
        const result = asserter.verify();

        if (!result.passed) {
            const pathwayDebugger = new PathwayDebugger(result);
            console.log('\n=== FAILURE ANALYSIS ===');
            console.log(pathwayDebugger.formatForAI());
        }

        expect(result.passed).toBe(true);
    });
});
