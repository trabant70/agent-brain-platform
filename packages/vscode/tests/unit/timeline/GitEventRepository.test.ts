/**
 * GitEventRepository Unit Tests
 * Tests for raw Git data extraction
 */

import { GitEventRepository } from '../../../src/timeline/infrastructure/GitEventRepository';
import { GitEvent, GitEventCollection } from '../../../src/timeline/domain/git-event.types';

describe('GitEventRepository', () => {
  let repository: GitEventRepository;

  beforeEach(() => {
    repository = new GitEventRepository();
  });

  afterEach(() => {
    repository.clearCache();
  });

  describe('Initialization', () => {
    it('should create repository with default config', () => {
      expect(repository).toBeDefined();
    });

    it('should create repository with custom config', () => {
      const customRepo = new GitEventRepository({
        maxCommits: 500,
        includeAllBranches: false,
        timeoutMs: 60000
      });

      expect(customRepo).toBeDefined();
    });
  });

  describe('Event Extraction', () => {
    it('should extract events from current project', async () => {
      // Use current project as test subject
      const collection = await repository.extractGitEvents();

      expect(collection).toBeDefined();
      expect(collection.events).toBeInstanceOf(Array);
      expect(collection.events.length).toBeGreaterThan(0);
    });

    it('should return GitEventCollection structure', async () => {
      const collection = await repository.extractGitEvents();

      expect(collection).toHaveProperty('events');
      expect(collection).toHaveProperty('relationships');
      expect(collection).toHaveProperty('branches');
      expect(collection).toHaveProperty('authors');
      expect(collection).toHaveProperty('dateRange');
      expect(collection).toHaveProperty('metadata');
    });

    it('should extract events with required fields', async () => {
      const collection = await repository.extractGitEvents();
      const firstEvent = collection.events[0];

      expect(firstEvent).toHaveProperty('id');
      expect(firstEvent).toHaveProperty('type');
      expect(firstEvent).toHaveProperty('author');
      expect(firstEvent).toHaveProperty('date');
      expect(firstEvent).toHaveProperty('title');
      expect(firstEvent).toHaveProperty('branch');
      expect(firstEvent.date).toBeInstanceOf(Date);
    });

    it('should extract multiple branches', async () => {
      const collection = await repository.extractGitEvents();

      expect(collection.branches).toBeInstanceOf(Array);
      expect(collection.branches.length).toBeGreaterThan(0);
      expect(collection.branches).toContain('main');
    });

    it('should extract unique authors', async () => {
      const collection = await repository.extractGitEvents();

      expect(collection.authors).toBeInstanceOf(Array);
      expect(collection.authors.length).toBeGreaterThan(0);

      // Check for uniqueness
      const uniqueAuthors = new Set(collection.authors);
      expect(uniqueAuthors.size).toBe(collection.authors.length);
    });

    it('should provide valid date range', async () => {
      const collection = await repository.extractGitEvents();

      expect(collection.dateRange).toBeInstanceOf(Array);
      expect(collection.dateRange.length).toBe(2);
      expect(collection.dateRange[0]).toBeInstanceOf(Date);
      expect(collection.dateRange[1]).toBeInstanceOf(Date);
      expect(collection.dateRange[0].getTime()).toBeLessThanOrEqual(collection.dateRange[1].getTime());
    });
  });

  describe('Multi-Branch Support', () => {
    it('should track events across multiple branches', async () => {
      const collection = await repository.extractGitEvents();

      // Find events that appear on multiple branches
      const multiBranchEvents = collection.events.filter(
        event => event.branches && event.branches.length > 1
      );

      // If repository has multiple branches, should find shared events
      if (collection.branches.length > 1) {
        expect(multiBranchEvents.length).toBeGreaterThan(0);
      }
    });

    it('should set primary branch for each event', async () => {
      const collection = await repository.extractGitEvents();

      collection.events.forEach(event => {
        expect(event.branch).toBeDefined();
        expect(typeof event.branch).toBe('string');
        expect(event.branch.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Event Types', () => {
    it('should detect commit events', async () => {
      const collection = await repository.extractGitEvents();

      const commits = collection.events.filter(e => e.type === 'commit');
      expect(commits.length).toBeGreaterThan(0);
    });

    it('should detect merge events', async () => {
      const collection = await repository.extractGitEvents();

      const merges = collection.events.filter(e => e.type === 'merge');
      // Merges may or may not exist, but should have parentHashes if they do
      merges.forEach(merge => {
        expect(merge.parentHashes).toBeDefined();
        expect(merge.parentHashes!.length).toBeGreaterThan(1);
      });
    });

    it('should detect tag events', async () => {
      const collection = await repository.extractGitEvents();

      const tags = collection.events.filter(e =>
        e.type === 'tag' || e.type === 'tag-created'
      );
      // Tags may or may not exist
      tags.forEach(tag => {
        expect(tag.title).toContain('tag');
      });
    });
  });

  describe('Relationships', () => {
    it('should extract event relationships', async () => {
      const collection = await repository.extractGitEvents();

      expect(collection.relationships).toBeInstanceOf(Array);
      // Relationships may be empty if no analysis is done
    });

    it('should link parent-child commits', async () => {
      const collection = await repository.extractGitEvents();

      // Find events with parent hashes
      const eventsWithParents = collection.events.filter(
        e => e.parentHashes && e.parentHashes.length > 0
      );

      expect(eventsWithParents.length).toBeGreaterThan(0);
    });
  });

  describe('Metadata', () => {
    it('should include collection metadata', async () => {
      const collection = await repository.extractGitEvents();

      expect(collection.metadata).toBeDefined();
      expect(collection.metadata).toHaveProperty('totalEvents');
      expect(collection.metadata).toHaveProperty('uniqueAuthors');
      expect(collection.metadata).toHaveProperty('totalBranches');
      expect(collection.metadata.totalEvents).toBe(collection.events.length);
    });

    it('should track extraction timestamp', async () => {
      const collection = await repository.extractGitEvents();

      expect(collection.metadata).toHaveProperty('extractedAt');
      expect(collection.metadata.extractedAt).toBeInstanceOf(Date);
    });
  });

  describe('Caching', () => {
    it('should cache results for same project', async () => {
      const startTime1 = performance.now();
      const collection1 = await repository.extractGitEvents();
      const duration1 = performance.now() - startTime1;

      const startTime2 = performance.now();
      const collection2 = await repository.extractGitEvents();
      const duration2 = performance.now() - startTime2;

      // Second call should be significantly faster (cached)
      expect(duration2).toBeLessThan(duration1 / 2);
      expect(collection1.events.length).toBe(collection2.events.length);
    });

    it('should clear cache when requested', async () => {
      await repository.extractGitEvents();
      repository.clearCache();

      // After clearing, should re-extract
      const collection = await repository.extractGitEvents();
      expect(collection.events.length).toBeGreaterThan(0);
    });

    it('should clear session cache separately', async () => {
      await repository.extractGitEvents();
      repository.clearSessionCache();

      // Session cache clear should not affect main cache
      const collection = await repository.extractGitEvents();
      expect(collection.events.length).toBeGreaterThan(0);
    });
  });

  describe('Impact Metrics', () => {
    it('should extract file change counts', async () => {
      const collection = await repository.extractGitEvents();

      const eventsWithFiles = collection.events.filter(e => e.filesChanged);
      // Not all commits may have this data
      eventsWithFiles.forEach(event => {
        expect(event.filesChanged).toBeGreaterThanOrEqual(0);
      });
    });

    it('should extract line change counts', async () => {
      const collection = await repository.extractGitEvents();

      const eventsWithLines = collection.events.filter(e =>
        e.insertions !== undefined || e.deletions !== undefined
      );

      eventsWithLines.forEach(event => {
        if (event.insertions !== undefined) {
          expect(event.insertions).toBeGreaterThanOrEqual(0);
        }
        if (event.deletions !== undefined) {
          expect(event.deletions).toBeGreaterThanOrEqual(0);
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid project path gracefully', async () => {
      await expect(
        repository.extractGitEvents('/nonexistent/path')
      ).rejects.toThrow();
    });

    it('should handle non-git directory gracefully', async () => {
      // Use /tmp as a non-git directory
      await expect(
        repository.extractGitEvents('/tmp')
      ).rejects.toThrow();
    });
  });

  describe('Configuration', () => {
    it('should respect maxCommits limit', async () => {
      const limitedRepo = new GitEventRepository({ maxCommits: 10 });
      const collection = await limitedRepo.extractGitEvents();

      expect(collection.events.length).toBeLessThanOrEqual(10);
    });

    it('should respect includeAllBranches setting', async () => {
      const singleBranchRepo = new GitEventRepository({ includeAllBranches: false });
      const collection = await singleBranchRepo.extractGitEvents();

      // Should still have events
      expect(collection.events.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should extract events in reasonable time', async () => {
      const startTime = performance.now();
      await repository.extractGitEvents();
      const duration = performance.now() - startTime;

      // Should complete in less than 5 seconds for typical repo
      expect(duration).toBeLessThan(5000);
    }, 10000); // 10 second timeout for this test

    it('should handle large commit counts efficiently', async () => {
      const largeRepo = new GitEventRepository({ maxCommits: 1000 });

      const startTime = performance.now();
      const collection = await largeRepo.extractGitEvents();
      const duration = performance.now() - startTime;

      expect(collection.events.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(10000); // < 10 seconds
    }, 15000);
  });

  describe('Data Integrity', () => {
    it('should have consistent event IDs', async () => {
      const collection = await repository.extractGitEvents();

      const ids = collection.events.map(e => e.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid timestamps', async () => {
      const collection = await repository.extractGitEvents();

      collection.events.forEach(event => {
        expect(event.date.getTime()).not.toBeNaN();
        expect(event.date.getTime()).toBeGreaterThan(0);
      });
    });

    it('should sort events chronologically', async () => {
      const collection = await repository.extractGitEvents();

      for (let i = 1; i < collection.events.length; i++) {
        const prev = collection.events[i - 1];
        const curr = collection.events[i];

        // Events should be in chronological order (oldest first)
        expect(prev.date.getTime()).toBeLessThanOrEqual(curr.date.getTime());
      }
    });
  });
});
