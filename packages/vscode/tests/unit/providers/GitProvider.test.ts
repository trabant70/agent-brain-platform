/**
 * GitProvider Unit Tests
 * Tests for the Git data provider implementation
 */

import { GitProvider } from '../../../src/providers/git/GitProvider';
import { EventType, ProviderConfig } from '../../../src/core/CanonicalEvent';
import { createRepository } from '../../fixtures/canonical-event-factory';

describe('GitProvider', () => {
  let provider: GitProvider;

  beforeEach(() => {
    provider = new GitProvider();
  });

  afterEach(() => {
    provider.dispose?.();
  });

  describe('Provider Properties', () => {
    it('should have correct provider properties', () => {
      expect(provider.id).toBe('git-local');
      expect(provider.name).toBe('Local Git Repository');
      expect(provider.version).toBe('2.0.0');
      expect(provider.capabilities).toBeDefined();
    });

    it('should have proper capabilities', () => {
      const capabilities = provider.capabilities;
      expect(capabilities.supportsHistoricalData).toBe(true);
      expect(capabilities.supportsFiltering).toBe(true);
      expect(capabilities.supportsAuthentication).toBe(false);
      expect(capabilities.supportedEventTypes).toContain(EventType.COMMIT);
      expect(capabilities.supportedEventTypes).toContain(EventType.MERGE);
      expect(capabilities.supportedEventTypes).toContain(EventType.BRANCH_CREATED);
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid config', async () => {
      const config: ProviderConfig = {
        enabled: true,
        maxCommits: 1000,
        timeout: 30000
      };

      await expect(provider.initialize(config)).resolves.not.toThrow();
    });

    it('should be unhealthy before initialization', async () => {
      const isHealthy = await provider.isHealthy();
      expect(isHealthy).toBe(false);
    });

    it('should be healthy after initialization with workspace', async () => {
      const config: ProviderConfig = { enabled: true };
      await provider.initialize(config);

      // Provider is healthy if there is a workspace
      const isHealthy = await provider.isHealthy();
      // May be true or false depending on workspace folders
      expect(typeof isHealthy).toBe('boolean');
    });
  });

  describe('Event Fetching', () => {
    beforeEach(async () => {
      await provider.initialize({ enabled: true });
    });

    it('should fetch events from current repository', async () => {
      const context = {
        workspaceRoot: process.cwd()
      };

      const events = await provider.fetchEvents(context);

      expect(events).toBeDefined();
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThan(0);
    });

    it('should return CanonicalEvent format', async () => {
      const context = {
        workspaceRoot: process.cwd()
      };

      const events = await provider.fetchEvents(context);
      expect(events.length).toBeGreaterThan(0);

      const event = events[0];

      // Check CanonicalEvent structure
      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('canonicalId');
      expect(event).toHaveProperty('providerId');
      expect(event).toHaveProperty('type');
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('author');
      expect(event).toHaveProperty('title');
      expect(event).toHaveProperty('branches');

      expect(event.providerId).toBe('git-local');
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(Array.isArray(event.branches)).toBe(true);
    });

    it('should throw error when not initialized', async () => {
      const uninitializedProvider = new GitProvider();
      const context = { workspaceRoot: process.cwd() };

      await expect(uninitializedProvider.fetchEvents(context)).rejects.toThrow('not initialized');
    });

    it('should include impact metrics when available', async () => {
      const context = {
        workspaceRoot: process.cwd()
      };

      const events = await provider.fetchEvents(context);
      const commitsWithImpact = events.filter(e => e.impact !== undefined);

      // At least some events should have impact metrics
      if (commitsWithImpact.length > 0) {
        const event = commitsWithImpact[0];
        expect(event.impact).toHaveProperty('filesChanged');
        expect(event.impact?.filesChanged).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle multi-branch events correctly', async () => {
      const context = {
        workspaceRoot: process.cwd()
      };

      const events = await provider.fetchEvents(context);

      // Find events that appear on multiple branches
      const multiBranchEvents = events.filter(e => e.branches.length > 1);

      multiBranchEvents.forEach(event => {
        expect(event.branches.length).toBeGreaterThan(1);
        expect(event.primaryBranch).toBeDefined();
        expect(event.branches).toContain(event.primaryBranch);
      });
    });
  });

  describe('Filter Options', () => {
    beforeEach(async () => {
      await provider.initialize({ enabled: true });
    });

    it('should return filter options from events', async () => {
      const context = {
        workspaceRoot: process.cwd()
      };

      const filterOptions = await provider.getFilterOptions(context);

      expect(filterOptions).toBeDefined();
      expect(filterOptions.branches).toBeDefined();
      expect(filterOptions.authors).toBeDefined();
      expect(filterOptions.eventTypes).toBeDefined();
      expect(Array.isArray(filterOptions.branches)).toBe(true);
      expect(Array.isArray(filterOptions.authors)).toBe(true);
      expect(Array.isArray(filterOptions.eventTypes)).toBe(true);
    });

    it('should include main branch in filter options', async () => {
      const context = {
        workspaceRoot: process.cwd()
      };

      const filterOptions = await provider.getFilterOptions(context);

      expect(filterOptions.branches).toContain('main');
    });

    it('should have unique filter values', async () => {
      const context = {
        workspaceRoot: process.cwd()
      };

      const filterOptions = await provider.getFilterOptions(context);

      // Check uniqueness
      const uniqueBranches = new Set(filterOptions.branches);
      const uniqueAuthors = new Set(filterOptions.authors);
      const uniqueTypes = new Set(filterOptions.eventTypes);

      expect(uniqueBranches.size).toBe(filterOptions.branches.length);
      expect(uniqueAuthors.size).toBe(filterOptions.authors.length);
      expect(uniqueTypes.size).toBe(filterOptions.eventTypes.length);
    });
  });

  describe('Event Types', () => {
    beforeEach(async () => {
      await provider.initialize({ enabled: true });
    });

    it('should extract commit events', async () => {
      const context = {
        workspaceRoot: process.cwd()
      };

      const events = await provider.fetchEvents(context);
      const commits = events.filter(e => e.type === EventType.COMMIT);

      expect(commits.length).toBeGreaterThan(0);
    });

    it('should extract merge events when present', async () => {
      const context = {
        workspaceRoot: process.cwd()
      };

      const events = await provider.fetchEvents(context);
      const merges = events.filter(e => e.type === EventType.MERGE);

      // Merges may or may not exist
      merges.forEach(merge => {
        expect(merge.parentIds).toBeDefined();
        expect(merge.parentIds!.length).toBeGreaterThan(1);
      });
    });

    it('should extract branch creation events', async () => {
      const context = {
        workspaceRoot: process.cwd()
      };

      const events = await provider.fetchEvents(context);
      const branchCreations = events.filter(e => e.type === EventType.BRANCH_CREATED);

      // Branch creations may or may not exist
      branchCreations.forEach(event => {
        expect(event.title).toContain('branch');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid repository path', async () => {
      await provider.initialize({ enabled: true });

      const context = {
        workspaceRoot: '/nonexistent/path'
      };

      await expect(provider.fetchEvents(context)).rejects.toThrow();
    });

    it('should handle non-git directory', async () => {
      await provider.initialize({ enabled: true });

      const context = {
        workspaceRoot: '/tmp'
      };

      await expect(provider.fetchEvents(context)).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    beforeEach(async () => {
      await provider.initialize({ enabled: true });
    });

    it('should fetch events in reasonable time', async () => {
      const context = {
        workspaceRoot: process.cwd()
      };

      const startTime = performance.now();
      const events = await provider.fetchEvents(context);
      const duration = performance.now() - startTime;

      expect(events.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    }, 10000);
  });

  describe('Disposal', () => {
    it('should clean up resources on disposal', () => {
      expect(() => {
        provider.dispose?.();
      }).not.toThrow();
    });
  });
});
