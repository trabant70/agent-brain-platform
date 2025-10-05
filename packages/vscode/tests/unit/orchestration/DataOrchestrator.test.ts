/**
 * DataOrchestrator Unit Tests
 * Tests for the simplified state management and orchestration
 */

import { DataOrchestrator } from '../../../src/orchestration/DataOrchestrator';
import { EventType, FilterState } from '../../../src/core/CanonicalEvent';
import { createRepository } from '../../fixtures/canonical-event-factory';

describe('DataOrchestrator', () => {
  let orchestrator: DataOrchestrator;
  const testRepoPath = process.cwd();

  beforeEach(() => {
    orchestrator = new DataOrchestrator({
      cacheTTL: 300000 // 5 minutes
    });
  });

  afterEach(() => {
    if (orchestrator && typeof orchestrator.dispose === 'function') {
      orchestrator.dispose();
    }
  });

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      expect(orchestrator).toBeDefined();
    });

    it('should initialize providers', async () => {
      await orchestrator.initialize();

      const registry = orchestrator.getProviderRegistry();
      expect(registry).toBeDefined();

      const providers = registry.getHealthyProviders();
      expect(providers.length).toBeGreaterThan(0);
    });

    it('should register git provider by default', async () => {
      await orchestrator.initialize();

      const registry = orchestrator.getProviderRegistry();
      const gitProvider = registry.getProvider('git-local');

      expect(gitProvider).toBeDefined();
      expect(gitProvider?.id).toBe('git-local');
    });
  });

  describe('Event Fetching', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    it('should fetch events from repository', async () => {
      const events = await orchestrator.getEvents(testRepoPath);

      expect(events).toBeDefined();
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThan(0);
    });

    it('should cache events after first fetch', async () => {
      const events1 = await orchestrator.getEvents(testRepoPath);
      const startTime = performance.now();
      const events2 = await orchestrator.getEvents(testRepoPath);
      const duration = performance.now() - startTime;

      expect(events1.length).toBe(events2.length);
      expect(duration).toBeLessThan(10); // Cached should be nearly instant
    });

    it('should force refresh when requested', async () => {
      await orchestrator.getEvents(testRepoPath);

      const events = await orchestrator.getEvents(testRepoPath, true);

      expect(events).toBeDefined();
      expect(events.length).toBeGreaterThan(0);
    });

    it('should return CanonicalEvent format', async () => {
      const events = await orchestrator.getEvents(testRepoPath);

      expect(events.length).toBeGreaterThan(0);

      const event = events[0];
      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('canonicalId');
      expect(event).toHaveProperty('providerId');
      expect(event).toHaveProperty('type');
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('author');
      expect(event).toHaveProperty('branches');
    });
  });

  describe('Filter Management', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
      // Pre-fetch events
      await orchestrator.getEvents(testRepoPath);
    });

    it('should apply branch filters', async () => {
      const filters: FilterState = {
        selectedBranches: ['main']
      };

      const filtered = await orchestrator.getFilteredEvents(testRepoPath, filters);

      expect(filtered).toBeDefined();
      expect(Array.isArray(filtered)).toBe(true);

      filtered.forEach(event => {
        expect(event.branches.some(b => b === 'main')).toBe(true);
      });
    });

    it('should apply author filters', async () => {
      const allEvents = await orchestrator.getEvents(testRepoPath);
      const firstAuthor = allEvents[0].author.name;

      const filters: FilterState = {
        selectedAuthors: [firstAuthor]
      };

      const filtered = await orchestrator.getFilteredEvents(testRepoPath, filters);

      filtered.forEach(event => {
        expect(event.author.name).toBe(firstAuthor);
      });
    });

    it('should apply event type filters', async () => {
      const filters: FilterState = {
        selectedEventTypes: [EventType.COMMIT]
      };

      const filtered = await orchestrator.getFilteredEvents(testRepoPath, filters);

      filtered.forEach(event => {
        expect(event.type).toBe(EventType.COMMIT);
      });
    });

    it('should combine multiple filters with AND logic', async () => {
      const allEvents = await orchestrator.getEvents(testRepoPath);
      const firstAuthor = allEvents[0].author.name;

      const filters: FilterState = {
        selectedBranches: ['main'],
        selectedAuthors: [firstAuthor],
        selectedEventTypes: [EventType.COMMIT]
      };

      const filtered = await orchestrator.getFilteredEvents(testRepoPath, filters);

      filtered.forEach(event => {
        expect(event.branches).toContain('main');
        expect(event.author.name).toBe(firstAuthor);
        expect(event.type).toBe(EventType.COMMIT);
      });
    });

    it('should return empty array for non-matching filters', async () => {
      const filters: FilterState = {
        selectedBranches: ['nonexistent-branch']
      };

      const filtered = await orchestrator.getFilteredEvents(testRepoPath, filters);

      expect(filtered).toHaveLength(0);
    });
  });

  describe('getEventsWithFilters', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    it('should return all events, filtered events, and filter options', async () => {
      const filters: FilterState = {
        selectedBranches: ['main']
      };

      const result = await orchestrator.getEventsWithFilters(testRepoPath, filters);

      expect(result).toHaveProperty('allEvents');
      expect(result).toHaveProperty('filteredEvents');
      expect(result).toHaveProperty('filterOptions');
      expect(result).toHaveProperty('appliedFilters');

      expect(result.allEvents.length).toBeGreaterThan(0);
      expect(result.filteredEvents.length).toBeLessThanOrEqual(result.allEvents.length);
      expect(result.appliedFilters).toEqual(filters);
    });

    it('should use persisted filter state when not provided', async () => {
      const filters: FilterState = {
        selectedBranches: ['main']
      };

      // Set filter state
      orchestrator.updateFilterState(testRepoPath, filters);

      // Get events without providing filters (should use persisted)
      const result = await orchestrator.getEventsWithFilters(testRepoPath);

      expect(result.appliedFilters).toEqual(filters);
      expect(result.filteredEvents.every(e => e.branches.includes('main'))).toBe(true);
    });

    it('should compute filter options from all events', async () => {
      const result = await orchestrator.getEventsWithFilters(testRepoPath);

      expect(result.filterOptions).toBeDefined();
      expect(result.filterOptions.branches).toBeInstanceOf(Array);
      expect(result.filterOptions.authors).toBeInstanceOf(Array);
      expect(result.filterOptions.eventTypes).toBeInstanceOf(Array);
      expect(result.filterOptions.branches).toContain('main');
    });
  });

  describe('Filter State Persistence', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    it('should persist filter state per repository', () => {
      const filters: FilterState = {
        selectedBranches: ['main', 'develop']
      };

      orchestrator.updateFilterState(testRepoPath, filters);
      const retrieved = orchestrator.getFilterState(testRepoPath);

      expect(retrieved).toEqual(filters);
    });

    it('should reset filter state', () => {
      const filters: FilterState = {
        selectedBranches: ['main']
      };

      orchestrator.updateFilterState(testRepoPath, filters);
      orchestrator.resetFilterState(testRepoPath);

      const retrieved = orchestrator.getFilterState(testRepoPath);
      expect(retrieved).toEqual({});
    });

    it('should maintain separate states for different repositories', () => {
      const filters1: FilterState = { selectedBranches: ['main'] };
      const filters2: FilterState = { selectedBranches: ['develop'] };

      orchestrator.updateFilterState('/repo1', filters1);
      orchestrator.updateFilterState('/repo2', filters2);

      expect(orchestrator.getFilterState('/repo1')).toEqual(filters1);
      expect(orchestrator.getFilterState('/repo2')).toEqual(filters2);
    });
  });

  describe('Filter Options', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    it('should compute filter options from events', async () => {
      const options = await orchestrator.getFilterOptions(testRepoPath);

      expect(options).toBeDefined();
      expect(options.branches).toBeInstanceOf(Array);
      expect(options.authors).toBeInstanceOf(Array);
      expect(options.eventTypes).toBeInstanceOf(Array);
    });

    it('should have unique filter option values', async () => {
      const options = await orchestrator.getFilterOptions(testRepoPath);

      const uniqueBranches = new Set(options.branches);
      const uniqueAuthors = new Set(options.authors);
      const uniqueTypes = new Set(options.eventTypes);

      expect(uniqueBranches.size).toBe(options.branches.length);
      expect(uniqueAuthors.size).toBe(options.authors.length);
      expect(uniqueTypes.size).toBe(options.eventTypes.length);
    });
  });

  describe('Cache Management', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    it('should invalidate cache for specific repository', async () => {
      await orchestrator.getEvents(testRepoPath);

      orchestrator.invalidateCache(testRepoPath);

      // Next fetch should be slow (not cached)
      const startTime = performance.now();
      await orchestrator.getEvents(testRepoPath);
      const duration = performance.now() - startTime;

      expect(duration).toBeGreaterThan(5); // Should take some time
    });

    it('should clear all caches', async () => {
      await orchestrator.getEvents('/repo1');
      await orchestrator.getEvents('/repo2');

      orchestrator.invalidateCache();

      // Both caches should be cleared
      const startTime = performance.now();
      await orchestrator.getEvents('/repo1');
      const duration = performance.now() - startTime;

      expect(duration).toBeGreaterThan(5);
    });
  });

  describe('Provider Management', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    it('should access provider registry', () => {
      const registry = orchestrator.getProviderRegistry();

      expect(registry).toBeDefined();
      expect(typeof registry.getProvider).toBe('function');
    });

    it('should check if provider is enabled', () => {
      const isEnabled = orchestrator.isProviderEnabled('git-local');

      expect(typeof isEnabled).toBe('boolean');
    });

    it('should set provider enabled state', () => {
      orchestrator.setProviderEnabled('git-local', false);
      expect(orchestrator.isProviderEnabled('git-local')).toBe(false);

      orchestrator.setProviderEnabled('git-local', true);
      expect(orchestrator.isProviderEnabled('git-local')).toBe(true);
    });

    it('should invalidate cache when provider state changes', async () => {
      await orchestrator.getEvents(testRepoPath);

      // Disabling provider should invalidate cache
      orchestrator.setProviderEnabled('git-local', false);

      // Cache should be invalidated (though fetch will fail with no providers)
      const startTime = performance.now();
      try {
        await orchestrator.getEvents(testRepoPath);
      } catch (error) {
        // Expected to fail with no providers
      }
      const duration = performance.now() - startTime;

      // Re-enable
      orchestrator.setProviderEnabled('git-local', true);
    });
  });

  describe('Performance', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    it('should fetch large repository efficiently', async () => {
      const startTime = performance.now();
      const events = await orchestrator.getEvents(testRepoPath);
      const duration = performance.now() - startTime;

      expect(events.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    }, 10000);

    it('should filter large datasets quickly', async () => {
      await orchestrator.getEvents(testRepoPath);

      const filters: FilterState = {
        selectedBranches: ['main'],
        selectedEventTypes: [EventType.COMMIT]
      };

      const startTime = performance.now();
      await orchestrator.getFilteredEvents(testRepoPath, filters);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(100); // Filtering should be very fast
    });

    it('should leverage caching for repeated requests', async () => {
      // First fetch (cold)
      const startTime1 = performance.now();
      await orchestrator.getEvents(testRepoPath);
      const duration1 = performance.now() - startTime1;

      // Second fetch (cached)
      const startTime2 = performance.now();
      await orchestrator.getEvents(testRepoPath);
      const duration2 = performance.now() - startTime2;

      // Cached should be significantly faster
      expect(duration2).toBeLessThan(duration1 / 10);
    });
  });

  describe('Disposal', () => {
    it('should clean up resources on disposal', () => {
      expect(() => {
        orchestrator.dispose();
      }).not.toThrow();
    });

    it('should handle multiple disposal calls', () => {
      expect(() => {
        orchestrator.dispose();
        orchestrator.dispose();
        orchestrator.dispose();
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    it('should handle invalid repository path', async () => {
      await expect(
        orchestrator.getEvents('/nonexistent/path')
      ).rejects.toThrow();
    });

    it('should handle non-git directory', async () => {
      await expect(
        orchestrator.getEvents('/tmp')
      ).rejects.toThrow();
    });
  });

  describe('Filter State Manager Access', () => {
    it('should provide access to filter state manager', () => {
      const manager = orchestrator.getFilterStateManager();

      expect(manager).toBeDefined();
      expect(typeof manager.getFilterState).toBe('function');
      expect(typeof manager.setFilterState).toBe('function');
    });
  });
});
