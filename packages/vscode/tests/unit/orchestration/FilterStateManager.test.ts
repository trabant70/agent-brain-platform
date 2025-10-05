/**
 * FilterStateManager Unit Tests
 * Tests for session-level filter state persistence
 */

import { FilterStateManager } from '../../../src/orchestration/FilterStateManager';
import { FilterState } from '../../../src/core/CanonicalEvent';
import { EventType } from '../../../src/core/CanonicalEvent';

describe('FilterStateManager', () => {
  let manager: FilterStateManager;

  beforeEach(() => {
    manager = new FilterStateManager();
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('Initialization', () => {
    it('should initialize with empty state', () => {
      const state = manager.getFilterState('/test/repo');
      expect(state).toEqual({});
    });

    it('should allow custom default state', () => {
      const customManager = new FilterStateManager({
        defaultState: { selectedBranches: ['main'] }
      });

      const state = customManager.getFilterState('/test/repo');
      expect(state).toEqual({ selectedBranches: ['main'] });

      customManager.dispose();
    });
  });

  describe('State Management', () => {
    it('should store filter state per repository', () => {
      const filters: FilterState = {
        selectedBranches: ['main', 'develop'],
        selectedAuthors: ['Alice', 'Bob']
      };

      manager.setFilterState('/repo1', filters);
      const retrieved = manager.getFilterState('/repo1');

      expect(retrieved).toEqual(filters);
    });

    it('should maintain separate state for different repositories', () => {
      const filters1: FilterState = { selectedBranches: ['main'] };
      const filters2: FilterState = { selectedBranches: ['develop'] };

      manager.setFilterState('/repo1', filters1);
      manager.setFilterState('/repo2', filters2);

      expect(manager.getFilterState('/repo1')).toEqual(filters1);
      expect(manager.getFilterState('/repo2')).toEqual(filters2);
    });

    it('should return empty state for unknown repository', () => {
      const state = manager.getFilterState('/unknown/repo');
      expect(state).toEqual({});
    });

    it('should overwrite existing state when setting new state', () => {
      manager.setFilterState('/repo', { selectedBranches: ['main'] });
      manager.setFilterState('/repo', { selectedAuthors: ['Alice'] });

      const state = manager.getFilterState('/repo');
      expect(state).toEqual({ selectedAuthors: ['Alice'] });
      expect(state.selectedBranches).toBeUndefined();
    });
  });

  describe('Partial Updates', () => {
    it('should merge partial updates into existing state', () => {
      manager.setFilterState('/repo', {
        selectedBranches: ['main'],
        selectedAuthors: ['Alice']
      });

      manager.updateFilterState('/repo', {
        selectedEventTypes: [EventType.COMMIT]
      });

      const state = manager.getFilterState('/repo');
      expect(state).toEqual({
        selectedBranches: ['main'],
        selectedAuthors: ['Alice'],
        selectedEventTypes: [EventType.COMMIT]
      });
    });

    it('should update existing fields with partial update', () => {
      manager.setFilterState('/repo', {
        selectedBranches: ['main'],
        selectedAuthors: ['Alice']
      });

      manager.updateFilterState('/repo', {
        selectedBranches: ['develop']
      });

      const state = manager.getFilterState('/repo');
      expect(state).toEqual({
        selectedBranches: ['develop'],
        selectedAuthors: ['Alice']
      });
    });
  });

  describe('Reset Functionality', () => {
    it('should reset filter state to empty', () => {
      manager.setFilterState('/repo', {
        selectedBranches: ['main'],
        selectedAuthors: ['Alice']
      });

      manager.resetFilterState('/repo');

      const state = manager.getFilterState('/repo');
      expect(state).toEqual({});
    });

    it('should not affect other repositories when resetting', () => {
      manager.setFilterState('/repo1', { selectedBranches: ['main'] });
      manager.setFilterState('/repo2', { selectedBranches: ['develop'] });

      manager.resetFilterState('/repo1');

      expect(manager.getFilterState('/repo1')).toEqual({});
      expect(manager.getFilterState('/repo2')).toEqual({ selectedBranches: ['develop'] });
    });
  });

  describe('Clear All', () => {
    it('should clear all repository states', () => {
      manager.setFilterState('/repo1', { selectedBranches: ['main'] });
      manager.setFilterState('/repo2', { selectedBranches: ['develop'] });

      manager.clearAll();

      expect(manager.getFilterState('/repo1')).toEqual({});
      expect(manager.getFilterState('/repo2')).toEqual({});
    });
  });

  describe('Active Filter Detection', () => {
    it('should detect when filters are active', () => {
      manager.setFilterState('/repo', { selectedBranches: ['main'] });
      expect(manager.hasActiveFilters('/repo')).toBe(true);
    });

    it('should detect when no filters are active', () => {
      expect(manager.hasActiveFilters('/repo')).toBe(false);
    });

    it('should detect empty state as inactive', () => {
      manager.setFilterState('/repo', {});
      expect(manager.hasActiveFilters('/repo')).toBe(false);
    });

    it('should detect undefined fields as inactive', () => {
      manager.setFilterState('/repo', {
        selectedBranches: undefined,
        selectedAuthors: undefined
      });
      expect(manager.hasActiveFilters('/repo')).toBe(false);
    });

    it('should detect empty arrays as active filters', () => {
      manager.setFilterState('/repo', { selectedBranches: [] });
      expect(manager.hasActiveFilters('/repo')).toBe(true);
    });
  });

  describe('Complex Filter States', () => {
    it('should handle date range filters', () => {
      const filters: FilterState = {
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31')
        }
      };

      manager.setFilterState('/repo', filters);
      const state = manager.getFilterState('/repo');

      expect(state.dateRange).toEqual(filters.dateRange);
    });

    it('should handle search queries', () => {
      const filters: FilterState = {
        searchQuery: 'bug fix'
      };

      manager.setFilterState('/repo', filters);
      const state = manager.getFilterState('/repo');

      expect(state.searchQuery).toBe('bug fix');
    });

    it('should handle all filter types together', () => {
      const filters: FilterState = {
        selectedBranches: ['main', 'develop'],
        selectedAuthors: ['Alice'],
        selectedEventTypes: [EventType.COMMIT, EventType.MERGE],
        selectedProviders: ['git-local'],
        selectedTags: ['v1.0'],
        searchQuery: 'feature',
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31')
        }
      };

      manager.setFilterState('/repo', filters);
      const state = manager.getFilterState('/repo');

      expect(state).toEqual(filters);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values', () => {
      manager.setFilterState('/repo', {
        selectedBranches: ['main'],
        selectedAuthors: null as any
      });

      const state = manager.getFilterState('/repo');
      expect(state.selectedBranches).toEqual(['main']);
      expect(state.selectedAuthors).toBeNull();
    });

    it('should handle special characters in repository paths', () => {
      const specialPath = '/repos/project-name_v2.0/sub-folder';
      manager.setFilterState(specialPath, { selectedBranches: ['main'] });

      const state = manager.getFilterState(specialPath);
      expect(state).toEqual({ selectedBranches: ['main'] });
    });

    it('should handle Windows-style paths', () => {
      const windowsPath = 'C:\\Users\\Dev\\Projects\\MyRepo';
      manager.setFilterState(windowsPath, { selectedBranches: ['main'] });

      const state = manager.getFilterState(windowsPath);
      expect(state).toEqual({ selectedBranches: ['main'] });
    });
  });

  describe('Memory Management', () => {
    it('should properly dispose resources', () => {
      manager.setFilterState('/repo1', { selectedBranches: ['main'] });
      manager.setFilterState('/repo2', { selectedBranches: ['develop'] });

      manager.dispose();

      // After disposal, should return empty state
      expect(manager.getFilterState('/repo1')).toEqual({});
      expect(manager.getFilterState('/repo2')).toEqual({});
    });

    it('should be safe to dispose multiple times', () => {
      manager.dispose();
      expect(() => manager.dispose()).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle many repositories efficiently', () => {
      const startTime = performance.now();

      // Create 1000 repository states
      for (let i = 0; i < 1000; i++) {
        manager.setFilterState(`/repo${i}`, {
          selectedBranches: [`branch${i}`]
        });
      }

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(100); // Should complete in < 100ms
    });

    it('should retrieve state quickly', () => {
      // Set up 1000 states
      for (let i = 0; i < 1000; i++) {
        manager.setFilterState(`/repo${i}`, {
          selectedBranches: [`branch${i}`]
        });
      }

      const startTime = performance.now();

      // Retrieve 100 random states
      for (let i = 0; i < 100; i++) {
        manager.getFilterState(`/repo${Math.floor(Math.random() * 1000)}`);
      }

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(10); // Should complete in < 10ms
    });
  });
});
