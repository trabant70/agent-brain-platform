/**
 * VersionManager Unit Tests
 */

import { VersionManager } from '../VersionManager';
import { AuditLogger } from '../AuditLogger';
import {
  MarketplaceTemplate,
  TemplateSource,
  TemplateCategory,
  KnowledgeType,
  KnowledgeScope,
  AuditOperation
} from '../types';

describe('VersionManager', () => {
  let versionManager: VersionManager;
  let auditLogger: AuditLogger;
  let sampleTemplate: MarketplaceTemplate;

  beforeEach(() => {
    auditLogger = new AuditLogger();
    versionManager = new VersionManager(auditLogger);

    sampleTemplate = {
      id: 'template-1',
      name: 'Test Template',
      description: 'A test template',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: TemplateCategory.DEVELOPMENT,
      tags: ['test'],
      author: { name: 'Test Author' },
      license: 'MIT',
      source: TemplateSource.USER,
      items: [
        {
          id: 'item-1',
          title: 'Test Item',
          body: 'Test content',
          type: KnowledgeType.BEST_PRACTICE,
          scope: KnowledgeScope.TEAM,
          tags: ['test'],
          path: '/test',
          relativePath: 'test',
          valid: true,
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date()
          },
          injectedTo: []
        }
      ],
      itemCount: 1,
      versionHistory: [],
      auditLog: []
    };
  });

  describe('createVersion', () => {
    it('should create a version checkpoint with deep snapshot', () => {
      const version = versionManager.createVersion(sampleTemplate, {
        versionNumber: '1.1.0',
        description: 'Added new features',
        createdBy: 'user'
      });

      expect(version).toBeDefined();
      expect(version.versionNumber).toBe('1.1.0');
      expect(version.description).toBe('Added new features');
      expect(version.createdBy).toBe('user');
      expect(version.itemCount).toBe(1);
      expect(version.snapshot.items).toHaveLength(1);
      expect(version.snapshot.templateMetadata.name).toBe('Test Template');
    });

    it('should update template version and timestamp', () => {
      versionManager.createVersion(sampleTemplate, {
        versionNumber: '1.1.0',
        description: 'Test version',
        createdBy: 'user'
      });

      expect(sampleTemplate.version).toBe('1.1.0');
      expect(sampleTemplate.lastVersionedAt).toBeDefined();
    });

    it('should add version to template history', () => {
      versionManager.createVersion(sampleTemplate, {
        versionNumber: '1.1.0',
        description: 'Test version',
        createdBy: 'user'
      });

      expect(sampleTemplate.versionHistory).toHaveLength(1);
      expect(sampleTemplate.versionHistory![0].versionNumber).toBe('1.1.0');
    });

    it('should add audit log entry', () => {
      versionManager.createVersion(sampleTemplate, {
        versionNumber: '1.1.0',
        description: 'Test version',
        createdBy: 'user'
      });

      expect(sampleTemplate.auditLog).toHaveLength(1);
      expect(sampleTemplate.auditLog![0].operation).toBe(AuditOperation.TEMPLATE_VERSIONED);
    });

    it('should create deep copy of items', () => {
      const version = versionManager.createVersion(sampleTemplate, {
        versionNumber: '1.1.0',
        description: 'Test version',
        createdBy: 'user'
      });

      // Modify original item
      sampleTemplate.items[0].title = 'Modified Title';

      // Snapshot should remain unchanged
      expect(version.snapshot.items[0].title).toBe('Test Item');
    });
  });

  describe('getVersion', () => {
    beforeEach(() => {
      versionManager.createVersion(sampleTemplate, {
        versionNumber: '1.1.0',
        description: 'Version 1.1',
        createdBy: 'user'
      });

      versionManager.createVersion(sampleTemplate, {
        versionNumber: '2.0.0',
        description: 'Version 2.0',
        createdBy: 'user'
      });
    });

    it('should retrieve a specific version', () => {
      const version = versionManager.getVersion(sampleTemplate, '1.1.0');

      expect(version).toBeDefined();
      expect(version!.versionNumber).toBe('1.1.0');
    });

    it('should return null for non-existent version', () => {
      const version = versionManager.getVersion(sampleTemplate, '999.0.0');

      expect(version).toBeNull();
    });
  });

  describe('getAllVersions', () => {
    it('should return all versions', () => {
      versionManager.createVersion(sampleTemplate, {
        versionNumber: '1.1.0',
        description: 'Version 1.1',
        createdBy: 'user'
      });

      versionManager.createVersion(sampleTemplate, {
        versionNumber: '2.0.0',
        description: 'Version 2.0',
        createdBy: 'user'
      });

      const versions = versionManager.getAllVersions(sampleTemplate);

      expect(versions).toHaveLength(2);
    });

    it('should return empty array for template with no versions', () => {
      const versions = versionManager.getAllVersions(sampleTemplate);

      expect(versions).toEqual([]);
    });
  });

  describe('getLatestVersion', () => {
    it('should return the most recent version', () => {
      versionManager.createVersion(sampleTemplate, {
        versionNumber: '1.1.0',
        description: 'Version 1.1',
        createdBy: 'user'
      });

      versionManager.createVersion(sampleTemplate, {
        versionNumber: '2.0.0',
        description: 'Version 2.0',
        createdBy: 'user'
      });

      const latest = versionManager.getLatestVersion(sampleTemplate);

      expect(latest).toBeDefined();
      expect(latest!.versionNumber).toBe('2.0.0');
    });

    it('should return null for template with no versions', () => {
      const latest = versionManager.getLatestVersion(sampleTemplate);

      expect(latest).toBeNull();
    });
  });

  describe('restoreToVersion', () => {
    beforeEach(() => {
      // Create v1.1.0 with 1 item
      versionManager.createVersion(sampleTemplate, {
        versionNumber: '1.1.0',
        description: 'Version 1.1',
        createdBy: 'user'
      });

      // Add another item
      sampleTemplate.items.push({
        id: 'item-2',
        title: 'Second Item',
        body: 'Second content',
        type: KnowledgeType.GUIDELINE,
        scope: KnowledgeScope.TEAM,
        tags: [],
        path: '/test2',
        relativePath: 'test2',
        valid: true,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date()
        },
        injectedTo: []
      });

      sampleTemplate.itemCount = 2;

      // Create v2.0.0 with 2 items
      versionManager.createVersion(sampleTemplate, {
        versionNumber: '2.0.0',
        description: 'Version 2.0',
        createdBy: 'user'
      });
    });

    it('should restore template to a specific version', () => {
      const result = versionManager.restoreToVersion(sampleTemplate, '1.1.0');

      expect(result.success).toBe(true);
      expect(result.restoredVersion).toBe('1.1.0');
      expect(sampleTemplate.items).toHaveLength(1);
      expect(sampleTemplate.itemCount).toBe(1);
    });

    it('should add audit log entry', () => {
      const beforeLength = sampleTemplate.auditLog!.length;

      versionManager.restoreToVersion(sampleTemplate, '1.1.0');

      expect(sampleTemplate.auditLog!.length).toBe(beforeLength + 1);
      expect(sampleTemplate.auditLog![sampleTemplate.auditLog!.length - 1].operation)
        .toBe(AuditOperation.TEMPLATE_RESTORED);
    });

    it('should return error for non-existent version', () => {
      const result = versionManager.restoreToVersion(sampleTemplate, '999.0.0');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should restore metadata as well', () => {
      sampleTemplate.name = 'Modified Name';

      versionManager.restoreToVersion(sampleTemplate, '1.1.0');

      expect(sampleTemplate.name).toBe('Test Template');
    });
  });

  describe('compareVersions', () => {
    beforeEach(() => {
      // Create v1.0.0 (initial state)
      versionManager.createVersion(sampleTemplate, {
        versionNumber: '1.0.0',
        description: 'Initial version',
        createdBy: 'user'
      });

      // Add an item
      sampleTemplate.items.push({
        id: 'item-2',
        title: 'Second Item',
        body: 'Second content',
        type: KnowledgeType.GUIDELINE,
        scope: KnowledgeScope.TEAM,
        tags: [],
        path: '/test2',
        relativePath: 'test2',
        valid: true,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date()
        },
        injectedTo: []
      });

      sampleTemplate.itemCount = 2;

      // Modify metadata
      sampleTemplate.name = 'Modified Template';
      sampleTemplate.tags = ['modified'];

      // Create v2.0.0
      versionManager.createVersion(sampleTemplate, {
        versionNumber: '2.0.0',
        description: 'Second version',
        createdBy: 'user'
      });
    });

    it('should identify added items', () => {
      const diff = versionManager.compareVersions(sampleTemplate, '1.0.0', '2.0.0');

      expect(diff).toBeDefined();
      expect(diff!.itemsAdded).toHaveLength(1);
      expect(diff!.itemsAdded[0]).toBe('item-2');
    });

    it('should identify metadata changes', () => {
      const diff = versionManager.compareVersions(sampleTemplate, '1.0.0', '2.0.0');

      expect(diff!.metadataChanged).toBe(true);
      expect(diff!.changes.name).toBeDefined();
      expect(diff!.changes.name!.from).toBe('Test Template');
      expect(diff!.changes.name!.to).toBe('Modified Template');
    });

    it('should return null for non-existent versions', () => {
      const diff = versionManager.compareVersions(sampleTemplate, '999.0.0', '2.0.0');

      expect(diff).toBeNull();
    });
  });

  describe('deleteVersion', () => {
    beforeEach(() => {
      versionManager.createVersion(sampleTemplate, {
        versionNumber: '1.1.0',
        description: 'Version 1.1',
        createdBy: 'user'
      });
    });

    it('should delete a version from history', () => {
      const result = versionManager.deleteVersion(sampleTemplate, '1.1.0');

      expect(result).toBe(true);
      expect(sampleTemplate.versionHistory).toHaveLength(0);
    });

    it('should return false for non-existent version', () => {
      const result = versionManager.deleteVersion(sampleTemplate, '999.0.0');

      expect(result).toBe(false);
    });
  });

  describe('getVersionStatistics', () => {
    it('should return statistics for versions', () => {
      versionManager.createVersion(sampleTemplate, {
        versionNumber: '1.1.0',
        description: 'Version 1.1',
        createdBy: 'user'
      });

      sampleTemplate.items.push({
        id: 'item-2',
        title: 'Second Item',
        body: 'Second content',
        type: KnowledgeType.GUIDELINE,
        scope: KnowledgeScope.TEAM,
        tags: [],
        path: '/test2',
        relativePath: 'test2',
        valid: true,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date()
        },
        injectedTo: []
      });

      sampleTemplate.itemCount = 2;

      versionManager.createVersion(sampleTemplate, {
        versionNumber: '2.0.0',
        description: 'Version 2.0',
        createdBy: 'user'
      });

      const stats = versionManager.getVersionStatistics(sampleTemplate);

      expect(stats.totalVersions).toBe(2);
      expect(stats.averageItemCount).toBe(2); // (1 + 2) / 2 = 1.5 rounded to 2
      expect(stats.oldestVersion).toBeDefined();
      expect(stats.newestVersion).toBeDefined();
    });

    it('should handle template with no versions', () => {
      const stats = versionManager.getVersionStatistics(sampleTemplate);

      expect(stats.totalVersions).toBe(0);
      expect(stats.oldestVersion).toBeNull();
      expect(stats.newestVersion).toBeNull();
      expect(stats.averageItemCount).toBe(0);
    });
  });

  describe('suggestNextVersion', () => {
    it('should suggest major version increment', () => {
      sampleTemplate.version = '1.2.3';

      const next = versionManager.suggestNextVersion(sampleTemplate, 'major');

      expect(next).toBe('2.0.0');
    });

    it('should suggest minor version increment', () => {
      sampleTemplate.version = '1.2.3';

      const next = versionManager.suggestNextVersion(sampleTemplate, 'minor');

      expect(next).toBe('1.3.0');
    });

    it('should suggest patch version increment', () => {
      sampleTemplate.version = '1.2.3';

      const next = versionManager.suggestNextVersion(sampleTemplate, 'patch');

      expect(next).toBe('1.2.4');
    });

    it('should default to 1.0.0 for invalid version format', () => {
      sampleTemplate.version = 'invalid';

      const next = versionManager.suggestNextVersion(sampleTemplate);

      expect(next).toBe('1.0.0');
    });
  });

  describe('exportVersionHistory', () => {
    it('should export version history to JSON', () => {
      versionManager.createVersion(sampleTemplate, {
        versionNumber: '1.1.0',
        description: 'Version 1.1',
        createdBy: 'user'
      });

      const json = versionManager.exportVersionHistory(sampleTemplate);
      const parsed = JSON.parse(json);

      expect(parsed.templateId).toBe(sampleTemplate.id);
      expect(parsed.templateName).toBe(sampleTemplate.name);
      expect(parsed.versionHistory).toHaveLength(1);
    });
  });
});
