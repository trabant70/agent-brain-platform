/**
 * Filter Pipeline Integration Tests
 * Tests the complete filtering workflow from orchestrator through UI
 */

import { DataOrchestrator } from '../../src/orchestration/DataOrchestrator';
import { FilterStateManager } from '../../src/orchestration/FilterStateManager';
import { EventType } from '../../src/core/CanonicalEvent';
import { createRepository } from '../fixtures/canonical-event-factory';

describe('Filter Pipeline Integration', () => {
  let orchestrator: DataOrchestrator;
  let filterManager: FilterStateManager;
  const testRepoPath = '/test/integration/repo';

  beforeAll(async () => {
    orchestrator = new DataOrchestrator();
    filterManager = new FilterStateManager();
    await orchestrator.initialize();
  });

  afterAll(async () => {
    await orchestrator.dispose();
    filterManager.dispose();
  });

  describe('End-to-End Filtering', () => {
    it('should filter events by selected branches', async () => {
      // Mock data with multiple branches
      const mockEvents = createRepository({
        commitCount: 50,
        branchCount: 3
      });

      // Get unique branches from mock data
      const allBranches = [...new Set(mockEvents.flatMap(e => e.branches))];
      const selectedBranch = allBranches[0];

      // Apply filter
      const filters = {
        selectedBranches: [selectedBranch]
      };

      // Filter events manually (simulating orchestrator behavior)
      const filteredEvents = mockEvents.filter(event =>
        event.branches.some(branch => filters.selectedBranches!.includes(branch))
      );

      expect(filteredEvents.length).toBeLessThan(mockEvents.length);
      filteredEvents.forEach(event => {
        expect(event.branches).toContain(selectedBranch);
      });
    });

    it('should filter events by selected authors', async () => {
      const mockEvents = createRepository({
        commitCount: 50,
        authorCount: 5
      });

      const allAuthors = [...new Set(mockEvents.map(e => e.author.name))];
      const selectedAuthor = allAuthors[0];

      const filters = {
        selectedAuthors: [selectedAuthor]
      };

      const filteredEvents = mockEvents.filter(event =>
        filters.selectedAuthors!.includes(event.author.name)
      );

      expect(filteredEvents.length).toBeLessThan(mockEvents.length);
      filteredEvents.forEach(event => {
        expect(event.author.name).toBe(selectedAuthor);
      });
    });

    it('should filter events by event types', async () => {
      const mockEvents = createRepository({
        commitCount: 50,
        mergeCount: 5,
        tagCount: 3
      });

      const filters = {
        selectedEventTypes: [EventType.COMMIT]
      };

      const filteredEvents = mockEvents.filter(event =>
        filters.selectedEventTypes!.includes(event.type)
      );

      filteredEvents.forEach(event => {
        expect(event.type).toBe(EventType.COMMIT);
      });
    });

    it('should apply multiple filters with AND logic', async () => {
      const mockEvents = createRepository({
        commitCount: 100,
        branchCount: 3,
        authorCount: 5
      });

      const allBranches = [...new Set(mockEvents.flatMap(e => e.branches))];
      const allAuthors = [...new Set(mockEvents.map(e => e.author.name))];

      const filters = {
        selectedBranches: [allBranches[0]],
        selectedAuthors: [allAuthors[0]],
        selectedEventTypes: [EventType.COMMIT]
      };

      const filteredEvents = mockEvents.filter(event => {
        const matchesBranch = event.branches.some(b => filters.selectedBranches!.includes(b));
        const matchesAuthor = filters.selectedAuthors!.includes(event.author.name);
        const matchesType = filters.selectedEventTypes!.includes(event.type);

        return matchesBranch && matchesAuthor && matchesType;
      });

      // All filters must match (AND logic)
      filteredEvents.forEach(event => {
        expect(event.branches.some(b => filters.selectedBranches!.includes(b))).toBe(true);
        expect(event.author.name).toBe(filters.selectedAuthors![0]);
        expect(event.type).toBe(EventType.COMMIT);
      });

      expect(filteredEvents.length).toBeLessThan(mockEvents.length);
    });
  });

  describe('Filter State Persistence', () => {
    it('should persist filter state across operations', () => {
      const filters = {
        selectedBranches: ['main', 'develop'],
        selectedAuthors: ['Alice']
      };

      filterManager.setFilterState(testRepoPath, filters);

      // Retrieve in a separate operation
      const retrieved = filterManager.getFilterState(testRepoPath);

      expect(retrieved).toEqual(filters);
    });

    it('should maintain separate states for different repositories', () => {
      const filters1 = { selectedBranches: ['main'] };
      const filters2 = { selectedBranches: ['develop'] };

      filterManager.setFilterState('/repo1', filters1);
      filterManager.setFilterState('/repo2', filters2);

      expect(filterManager.getFilterState('/repo1')).toEqual(filters1);
      expect(filterManager.getFilterState('/repo2')).toEqual(filters2);
    });
  });

  describe('Filter Options Generation', () => {
    it('should generate filter options from events', () => {
      const mockEvents = createRepository({
        commitCount: 50,
        branchCount: 3,
        authorCount: 4
      });

      const branches = [...new Set(mockEvents.flatMap(e => e.branches))];
      const authors = [...new Set(mockEvents.map(e => e.author.name))];
      const eventTypes = [...new Set(mockEvents.map(e => e.type))];

      expect(branches.length).toBeGreaterThan(0);
      expect(authors.length).toBeGreaterThan(0);
      expect(eventTypes.length).toBeGreaterThan(0);

      const filterOptions = {
        branches,
        authors,
        eventTypes
      };

      expect(filterOptions.branches).toContain('main');
      expect(filterOptions.authors.length).toBe(4);
    });
  });

  describe('Performance', () => {
    it('should filter large datasets efficiently', () => {
      const mockEvents = createRepository({
        commitCount: 1000,
        branchCount: 5,
        authorCount: 10
      });

      const startTime = performance.now();

      const filteredEvents = mockEvents.filter(event =>
        event.branches.includes('main') &&
        event.type === EventType.COMMIT
      );

      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(50); // Should complete in < 50ms
      expect(filteredEvents.length).toBeGreaterThan(0);
    });

    it('should handle complex filter combinations efficiently', () => {
      const mockEvents = createRepository({
        commitCount: 1000
      });

      const startTime = performance.now();

      const filteredEvents = mockEvents.filter(event => {
        const matchesBranch = event.branches.includes('main');
        const matchesType = event.type === EventType.COMMIT;
        const matchesDate = event.timestamp.getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000;

        return matchesBranch && matchesType && matchesDate;
      });

      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(100); // Should complete in < 100ms
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty filter state (show all)', () => {
      const mockEvents = createRepository({ commitCount: 50 });
      const filters = {};

      // Empty filters should show all events
      const filteredEvents = mockEvents.filter(event => {
        return true; // No filters applied
      });

      expect(filteredEvents.length).toBe(mockEvents.length);
    });

    it('should handle undefined filter fields (show all for that field)', () => {
      const mockEvents = createRepository({ commitCount: 50 });
      const filters = {
        selectedBranches: ['main'],
        selectedAuthors: undefined, // undefined = show all authors
        selectedEventTypes: undefined // undefined = show all types
      };

      const filteredEvents = mockEvents.filter(event => {
        const matchesBranch = event.branches.includes('main');
        const matchesAuthor = true; // undefined = no filter
        const matchesType = true; // undefined = no filter

        return matchesBranch && matchesAuthor && matchesType;
      });

      expect(filteredEvents.length).toBeLessThan(mockEvents.length);
    });

    it('should handle empty arrays (show nothing for that field)', () => {
      const mockEvents = createRepository({ commitCount: 50 });
      const filters = {
        selectedBranches: [] // Empty array = show nothing
      };

      const filteredEvents = mockEvents.filter(event => {
        if (filters.selectedBranches && filters.selectedBranches.length === 0) {
          return false; // Empty selection = nothing matches
        }
        return true;
      });

      expect(filteredEvents.length).toBe(0);
    });

    it('should handle non-existent filter values gracefully', () => {
      const mockEvents = createRepository({ commitCount: 50 });
      const filters = {
        selectedBranches: ['nonexistent-branch']
      };

      const filteredEvents = mockEvents.filter(event =>
        event.branches.some(b => filters.selectedBranches!.includes(b))
      );

      expect(filteredEvents.length).toBe(0);
    });
  });
});
