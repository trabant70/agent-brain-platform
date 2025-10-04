import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import PatternVersionControl from '../../versioning/pattern-version-control';
import fs from 'fs';
import path from 'path';

describe('Pattern Version Control System', () => {
  let versionControl: PatternVersionControl;
  const testDataDir = './test-pattern-data';

  beforeEach(() => {
    // Create test data directory
    versionControl = new PatternVersionControl(testDataDir);
  });

  afterEach(() => {
    // Clean up test data
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  });

  describe('Version Creation and Retrieval', () => {
    it('should create a new version of a pattern', async () => {
      const patternId = 'test-pattern-1';
      const content = { type: 'test', data: 'initial content' };
      const message = 'Initial version';
      const author = { name: 'Test Author', email: 'test@example.com' };

      const version = await versionControl.createVersion(patternId, content, message, author);

      expect(version).toBeDefined();
      expect(version.pattern_id).toBe(patternId);
      expect(version.version).toBe(1);
      expect(version.content).toEqual(content);
      expect(version.metadata.message).toBe(message);
      expect(version.metadata.author).toBe(author.name);
      expect(version.metadata.email).toBe(author.email);
      expect(version.hash).toBeDefined();
      expect(version.changes).toHaveLength(1);
      expect(version.changes[0].type).toBe('add');
    });

    it('should retrieve the latest version of a pattern', async () => {
      const patternId = 'test-pattern-2';
      const content = { type: 'test', data: 'content' };

      await versionControl.createVersion(patternId, content, 'First version');
      const latestVersion = await versionControl.getLatestVersion(patternId);

      expect(latestVersion).toBeDefined();
      expect(latestVersion!.pattern_id).toBe(patternId);
      expect(latestVersion!.version).toBe(1);
    });

    it('should retrieve a specific version by ID', async () => {
      const patternId = 'test-pattern-3';
      const content = { type: 'test', data: 'content' };

      const version = await versionControl.createVersion(patternId, content, 'Test version');
      const retrievedVersion = await versionControl.getVersion(version.id);

      expect(retrievedVersion).toBeDefined();
      expect(retrievedVersion!.id).toBe(version.id);
      expect(retrievedVersion!.content).toEqual(content);
    });

    it('should get version history for a pattern', async () => {
      const patternId = 'test-pattern-4';

      // Create multiple versions
      await versionControl.createVersion(patternId, { data: 'v1' }, 'Version 1');
      await versionControl.createVersion(patternId, { data: 'v2' }, 'Version 2');
      await versionControl.createVersion(patternId, { data: 'v3' }, 'Version 3');

      const history = await versionControl.getVersionHistory(patternId);

      expect(history).toHaveLength(3);
      expect(history[0].version).toBe(3); // Latest first
      expect(history[1].version).toBe(2);
      expect(history[2].version).toBe(1);
    });
  });

  describe('Version Changes and Diffs', () => {
    it('should calculate changes between versions', async () => {
      const patternId = 'test-pattern-5';
      const initialContent = { name: 'Test', description: 'Initial' };
      const updatedContent = { name: 'Test Updated', description: 'Modified', newField: 'added' };

      const v1 = await versionControl.createVersion(patternId, initialContent, 'Initial');
      const v2 = await versionControl.createVersion(patternId, updatedContent, 'Updated');

      expect(v2.changes.length).toBeGreaterThan(0);
      expect(v2.changes.some(c => c.type === 'modify')).toBe(true);
      expect(v2.changes.some(c => c.type === 'add')).toBe(true);
    });

    it('should calculate diff between two versions', async () => {
      const patternId = 'test-pattern-6';
      const content1 = { field1: 'value1', field2: 'value2' };
      const content2 = { field1: 'modified', field3: 'new' };

      const v1 = await versionControl.createVersion(patternId, content1, 'Version 1');
      const v2 = await versionControl.createVersion(patternId, content2, 'Version 2');

      const diff = await versionControl.diff(patternId, v1.id, v2.id);

      expect(diff.additions).toBeGreaterThan(0);
      expect(diff.deletions).toBeGreaterThan(0);
      expect(diff.modifications).toBeGreaterThan(0);
      expect(diff.similarity_score).toBeLessThan(1);
      expect(diff.summary).toContain('+');
      expect(diff.summary).toContain('-');
    });
  });

  describe('Branching System', () => {
    it('should create a new branch', async () => {
      const patternId = 'test-pattern-7';
      const content = { data: 'main content' };

      await versionControl.createVersion(patternId, content, 'Main version');

      const branch = await versionControl.createBranch(
        patternId,
        'feature-branch',
        'main',
        'Feature development branch',
        { name: 'Developer', email: 'dev@example.com' }
      );

      expect(branch.name).toBe('feature-branch');
      expect(branch.pattern_id).toBe(patternId);
      expect(branch.parent_branch).toBe('main');
      expect(branch.description).toBe('Feature development branch');
      expect(branch.created_by).toBe('Developer');
    });

    it('should create versions on different branches', async () => {
      const patternId = 'test-pattern-8';
      const mainContent = { feature: 'main' };
      const featureContent = { feature: 'new feature' };

      // Create main branch version
      await versionControl.createVersion(patternId, mainContent, 'Main version', undefined, 'main');

      // Create feature branch
      await versionControl.createBranch(patternId, 'feature');

      // Create version on feature branch
      await versionControl.createVersion(patternId, featureContent, 'Feature version', undefined, 'feature');

      const mainLatest = await versionControl.getLatestVersion(patternId, 'main');
      const featureLatest = await versionControl.getLatestVersion(patternId, 'feature');

      expect(mainLatest!.content).toEqual(mainContent);
      expect(featureLatest!.content).toEqual(featureContent);
    });
  });

  describe('Merging System', () => {
    it('should merge branches without conflicts', async () => {
      const patternId = 'test-pattern-9';
      const mainContent = { main: 'content', shared: 'original' };
      const featureContent = { main: 'content', shared: 'original', feature: 'new' };

      // Set up main branch
      await versionControl.createVersion(patternId, mainContent, 'Main version', undefined, 'main');

      // Create and work on feature branch
      await versionControl.createBranch(patternId, 'feature');
      await versionControl.createVersion(patternId, featureContent, 'Feature version', undefined, 'feature');

      // Merge feature into main
      const mergeResult = await versionControl.mergeBranch(
        patternId,
        'feature',
        'main',
        'Merge feature branch'
      );

      expect(mergeResult.success).toBe(true);
      expect(mergeResult.new_version).toBeDefined();
      expect(mergeResult.conflicts).toEqual([]);
      expect(mergeResult.merged_content).toHaveProperty('feature', 'new');
    });

    it('should detect merge conflicts', async () => {
      const patternId = 'test-pattern-10';
      const baseContent = { field: 'original' };
      const mainContent = { field: 'main update' };
      const featureContent = { field: 'feature update' };

      // Set up base version
      await versionControl.createVersion(patternId, baseContent, 'Base version', undefined, 'main');

      // Create feature branch from main
      await versionControl.createBranch(patternId, 'feature');

      // Make conflicting changes
      await versionControl.createVersion(patternId, mainContent, 'Main update', undefined, 'main');
      await versionControl.createVersion(patternId, featureContent, 'Feature update', undefined, 'feature');

      // Attempt merge
      const mergeResult = await versionControl.mergeBranch(
        patternId,
        'feature',
        'main',
        'Merge with conflicts'
      );

      expect(mergeResult.success).toBe(false);
      expect(mergeResult.conflicts).toBeDefined();
      expect(mergeResult.conflicts!.length).toBeGreaterThan(0);
    });

    it('should resolve merge conflicts with custom resolutions', async () => {
      const patternId = 'test-pattern-11';
      const baseContent = { field: 'original' };
      const mainContent = { field: 'main update' };
      const featureContent = { field: 'feature update' };

      // Set up conflicting branches
      await versionControl.createVersion(patternId, baseContent, 'Base', undefined, 'main');
      await versionControl.createBranch(patternId, 'feature');
      await versionControl.createVersion(patternId, mainContent, 'Main update', undefined, 'main');
      await versionControl.createVersion(patternId, featureContent, 'Feature update', undefined, 'feature');

      // Resolve conflicts with custom resolution
      const resolutions = new Map();
      resolutions.set('root.field', 'resolved value');

      const mergeResult = await versionControl.mergeBranch(
        patternId,
        'feature',
        'main',
        'Merge with resolutions',
        undefined,
        resolutions
      );

      expect(mergeResult.success).toBe(true);
      expect(mergeResult.merged_content).toHaveProperty('field', 'resolved value');
    });
  });

  describe('Tagging System', () => {
    it('should tag a version', async () => {
      const patternId = 'test-pattern-12';
      const content = { version: '1.0.0' };

      const version = await versionControl.createVersion(patternId, content, 'Release version');

      await versionControl.tagVersion(
        version.id,
        'v1.0.0',
        'Release 1.0.0',
        { name: 'Release Manager', email: 'release@example.com' }
      );

      // Check that tag was added to version metadata
      const taggedVersion = await versionControl.getVersion(version.id);
      expect(taggedVersion!.metadata.tags).toContain('v1.0.0');
    });
  });

  describe('Revert Operations', () => {
    it('should revert to a previous version', async () => {
      const patternId = 'test-pattern-13';
      const content1 = { data: 'version 1' };
      const content2 = { data: 'version 2' };
      const content3 = { data: 'version 3' };

      const v1 = await versionControl.createVersion(patternId, content1, 'Version 1');
      await versionControl.createVersion(patternId, content2, 'Version 2');
      await versionControl.createVersion(patternId, content3, 'Version 3');

      // Revert to version 1
      const revertedVersion = await versionControl.revert(
        patternId,
        v1.id,
        'Revert to version 1'
      );

      expect(revertedVersion.content).toEqual(content1);
      expect(revertedVersion.version).toBe(4); // New version number
      expect(revertedVersion.metadata.message).toContain('Revert to version 1');
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent pattern gracefully', async () => {
      const latestVersion = await versionControl.getLatestVersion('non-existent');
      expect(latestVersion).toBeNull();
    });

    it('should handle non-existent version gracefully', async () => {
      const version = await versionControl.getVersion('non-existent-version');
      expect(version).toBeNull();
    });

    it('should handle merge of non-existent branches', async () => {
      const mergeResult = await versionControl.mergeBranch(
        'pattern',
        'non-existent-source',
        'non-existent-target',
        'Test merge'
      );

      expect(mergeResult.success).toBe(false);
    });
  });

  describe('File System Operations', () => {
    it('should create proper directory structure', () => {
      expect(fs.existsSync(path.join(testDataDir, 'patterns'))).toBe(true);
      expect(fs.existsSync(path.join(testDataDir, 'versions'))).toBe(true);
      expect(fs.existsSync(path.join(testDataDir, 'branches'))).toBe(true);
      expect(fs.existsSync(path.join(testDataDir, 'refs'))).toBe(true);
    });

    it('should persist versions to disk', async () => {
      const patternId = 'test-pattern-14';
      const content = { test: 'data' };

      const version = await versionControl.createVersion(patternId, content, 'Test persistence');

      // Check that version file exists
      const versionPath = path.join(testDataDir, 'versions', `${version.id}.json`);
      expect(fs.existsSync(versionPath)).toBe(true);

      // Check that ref exists
      const refPath = path.join(testDataDir, 'refs', 'heads', `${patternId}-main`);
      expect(fs.existsSync(refPath)).toBe(true);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple rapid version creation', async () => {
      const patternId = 'test-pattern-15';
      const promises = [];

      // Create 10 versions rapidly
      for (let i = 0; i < 10; i++) {
        const promise = versionControl.createVersion(
          patternId,
          { iteration: i },
          `Version ${i + 1}`
        );
        promises.push(promise);
      }

      const versions = await Promise.all(promises);
      expect(versions).toHaveLength(10);

      // Verify version numbers are correct
      const history = await versionControl.getVersionHistory(patternId);
      expect(history).toHaveLength(10);
      expect(history[0].version).toBe(10); // Latest should be version 10
    });

    it('should handle large content efficiently', async () => {
      const patternId = 'test-pattern-16';
      const largeContent = {
        data: Array.from({ length: 1000 }, (_, i) => `item-${i}`),
        metadata: {
          description: 'A'.repeat(10000), // 10KB string
          tags: Array.from({ length: 100 }, (_, i) => `tag-${i}`)
        }
      };

      const start = Date.now();
      const version = await versionControl.createVersion(patternId, largeContent, 'Large content test');
      const duration = Date.now() - start;

      expect(version).toBeDefined();
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(version.size).toBeGreaterThan(10000); // Should track large size
    });
  });
});