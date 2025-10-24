/**
 * Template Migration Tests
 */

import { TemplateMigration } from '../TemplateMigration';
import {
  MarketplaceTemplate,
  KnowledgeItem,
  TemplateSource,
  TemplateCategory,
  KnowledgeType,
  KnowledgeScope,
  AuditOperation
} from '../types';

// Helper to create test knowledge items with all required fields
function createTestItem(overrides: Partial<KnowledgeItem> = {}): KnowledgeItem {
  return {
    id: 'item-1',
    title: 'Test Item',
    body: 'Test content',
    type: KnowledgeType.GOLDEN_PATH,
    scope: KnowledgeScope.TEAM,
    tags: [],
    path: '/test/item.md',
    relativePath: 'item.md',
    valid: true,
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date()
    },
    injectedTo: [],
    ...overrides
  };
}

describe('TemplateMigration', () => {
  let migration: TemplateMigration;

  beforeEach(() => {
    migration = new TemplateMigration();
  });

  describe('needsMigration', () => {
    it('should return true if templates have no embedded items', async () => {
      const templates: MarketplaceTemplate[] = [{
        id: 'test-1',
        name: 'Test Template',
        description: 'Test',
        version: '1.0',
        category: TemplateCategory.DEVELOPMENT,
        tags: [],
        author: { name: 'Test' },
        license: 'MIT',
        source: TemplateSource.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],  // Empty items array
        auditLog: [],
        versionHistory: []
      }];

      const items: KnowledgeItem[] = [];

      const needed = await migration.needsMigration(templates, items);
      expect(needed).toBe(true);
    });

    it('should return true if there are standalone items', async () => {
      const templates: MarketplaceTemplate[] = [];
      const items: KnowledgeItem[] = [createTestItem()];

      const needed = await migration.needsMigration(templates, items);
      expect(needed).toBe(true);
    });

    it('should return false if all templates have embedded items', async () => {
      const templates: MarketplaceTemplate[] = [{
        id: 'test-1',
        name: 'Test Template',
        description: 'Test',
        version: '1.0',
        category: TemplateCategory.DEVELOPMENT,
        tags: [],
        author: { name: 'Test' },
        license: 'MIT',
        source: TemplateSource.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [createTestItem()],
        auditLog: [],
        versionHistory: []
      }];

      const items: KnowledgeItem[] = [];

      const needed = await migration.needsMigration(templates, items);
      expect(needed).toBe(false);
    });
  });

  describe('migrate', () => {
    it('should migrate items into templates', async () => {
      const existingTemplates: MarketplaceTemplate[] = [{
        id: 'template-1',
        name: 'Test Template',
        description: 'Test',
        version: '1.0',
        category: TemplateCategory.DEVELOPMENT,
        tags: [],
        author: { name: 'Test' },
        license: 'MIT',
        source: TemplateSource.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],
        auditLog: [],
        versionHistory: []
      }];

      const existingItems: KnowledgeItem[] = [
        createTestItem({ templateId: 'template-1' })
      ];

      const result = await migration.migrate(existingItems, existingTemplates);

      expect(result.success).toBe(true);
      expect(result.templatesCreated).toBe(1);
      expect(result.itemsMigrated).toBe(1);
      expect(result.orphanedItems).toBe(0);
      expect(result.migratedTemplates).toHaveLength(1);

      const migratedTemplate = result.migratedTemplates[0];
      expect(migratedTemplate.items).toHaveLength(1);
      expect(migratedTemplate.items[0].id).toBe('item-1');
    });

    it('should create ungrouped template for orphaned items', async () => {
      const existingTemplates: MarketplaceTemplate[] = [];
      const existingItems: KnowledgeItem[] = [{
        id: 'item-1',
        title: 'Orphaned Item',
        body: 'Test content',
        type: KnowledgeType.GOLDEN_PATH,
        scope: KnowledgeScope.TEAM,
        tags: [],
        path: '/test/item-1.md',
        relativePath: 'item-1.md',
        valid: true,
        // No templateId
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date()
        },
        injectedTo: []
      }];

      const result = await migration.migrate(existingItems, existingTemplates);

      expect(result.success).toBe(true);
      expect(result.templatesCreated).toBe(1);
      expect(result.orphanedItems).toBe(1);

      const ungroupedTemplate = result.migratedTemplates[0];
      expect(ungroupedTemplate.id).toBe('ungrouped');
      expect(ungroupedTemplate.name).toBe('Ungrouped Items');
      expect(ungroupedTemplate.items).toHaveLength(1);
      expect(ungroupedTemplate.items[0].id).toBe('item-1');
    });

    it('should handle items referencing missing templates', async () => {
      const existingTemplates: MarketplaceTemplate[] = [];
      const existingItems: KnowledgeItem[] = [{
        id: 'item-1',
        title: 'Test Item',
        body: 'Test content',
        type: KnowledgeType.GOLDEN_PATH,
        scope: KnowledgeScope.TEAM,
        tags: [],
        path: '/test/item-1.md',
        relativePath: 'item-1.md',
        valid: true,
        templateId: 'missing-template',
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date()
        },
        injectedTo: []
      }];

      const result = await migration.migrate(existingItems, existingTemplates);

      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('missing template');
      expect(result.orphanedItems).toBe(1);

      // Should be placed in ungrouped template
      const ungroupedTemplate = result.migratedTemplates.find(t => t.id === 'ungrouped');
      expect(ungroupedTemplate).toBeDefined();
      expect(ungroupedTemplate!.items).toHaveLength(1);
    });

    it('should deduplicate orphaned items', async () => {
      const existingTemplates: MarketplaceTemplate[] = [];
      const existingItems: KnowledgeItem[] = [
        {
          id: 'item-1',
          title: 'Test Item',
          body: 'Test content',
          type: KnowledgeType.GOLDEN_PATH,
          scope: KnowledgeScope.TEAM,
          tags: [],
          path: '/test/item-1.md',
          relativePath: 'item-1.md',
          valid: true,
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date()
          },
          injectedTo: []
        },
        {
          id: 'item-1', // Same ID (duplicate)
          title: 'Test Item Duplicate',
          body: 'Test content',
          type: KnowledgeType.GOLDEN_PATH,
          scope: KnowledgeScope.TEAM,
          tags: [],
          path: '/test/item-1-dup.md',
          relativePath: 'item-1-dup.md',
          valid: true,
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date()
          },
          injectedTo: []
        }
      ];

      const result = await migration.migrate(existingItems, existingTemplates);

      expect(result.success).toBe(true);
      expect(result.orphanedItems).toBe(1); // Deduplicated

      const ungroupedTemplate = result.migratedTemplates[0];
      expect(ungroupedTemplate.items).toHaveLength(1);
    });

    it('should add audit log entry to migrated templates', async () => {
      const existingTemplates: MarketplaceTemplate[] = [{
        id: 'template-1',
        name: 'Test Template',
        description: 'Test',
        version: '1.0',
        category: TemplateCategory.DEVELOPMENT,
        tags: [],
        author: { name: 'Test' },
        license: 'MIT',
        source: TemplateSource.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],
        auditLog: [],
        versionHistory: []
      }];

      const existingItems: KnowledgeItem[] = [{
        id: 'item-1',
        title: 'Test Item',
        body: 'Test',
        type: KnowledgeType.GOLDEN_PATH,
        scope: KnowledgeScope.TEAM,
        tags: [],
        path: '/test/item-1.md',
        relativePath: 'item-1.md',
        valid: true,
        templateId: 'template-1',
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date()
        },
        injectedTo: []
      }];

      const result = await migration.migrate(existingItems, existingTemplates);

      const migratedTemplate = result.migratedTemplates[0];
      expect(migratedTemplate.auditLog).toHaveLength(1);
      expect(migratedTemplate.auditLog![0].operation).toBe(AuditOperation.TEMPLATE_CREATED);
      expect(migratedTemplate.auditLog![0].actor).toBe('system');
      expect(migratedTemplate.auditLog![0].details.comment).toContain('Migrated');
    });

    it('should create version history for migrated templates', async () => {
      const existingTemplates: MarketplaceTemplate[] = [{
        id: 'template-1',
        name: 'Test Template',
        description: 'Test',
        version: '1.5',
        category: TemplateCategory.DEVELOPMENT,
        tags: [],
        author: { name: 'Test' },
        license: 'MIT',
        source: TemplateSource.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],
        auditLog: [],
        versionHistory: []
      }];

      const existingItems: KnowledgeItem[] = [{
        id: 'item-1',
        title: 'Test Item',
        body: 'Test',
        type: KnowledgeType.GOLDEN_PATH,
        scope: KnowledgeScope.TEAM,
        tags: [],
        path: '/test/item-1.md',
        relativePath: 'item-1.md',
        valid: true,
        templateId: 'template-1',
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date()
        },
        injectedTo: []
      }];

      const result = await migration.migrate(existingItems, existingTemplates);

      const migratedTemplate = result.migratedTemplates[0];
      expect(migratedTemplate.versionHistory).toHaveLength(1);
      expect(migratedTemplate.versionHistory![0].versionNumber).toBe('1.5');
      expect(migratedTemplate.versionHistory![0].description).toContain('Migrated');
      expect(migratedTemplate.versionHistory![0].snapshot.items).toHaveLength(1);
    });

    it('should enhance items with injection tracking', async () => {
      const existingTemplates: MarketplaceTemplate[] = [{
        id: 'template-1',
        name: 'Test Template',
        description: 'Test',
        version: '1.0',
        category: TemplateCategory.DEVELOPMENT,
        tags: [],
        author: { name: 'Test' },
        license: 'MIT',
        source: TemplateSource.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],
        auditLog: [],
        versionHistory: []
      }];

      const existingItems: KnowledgeItem[] = [{
        id: 'item-1',
        title: 'Test Item',
        body: 'Test',
        type: KnowledgeType.GOLDEN_PATH,
        scope: KnowledgeScope.TEAM,
        tags: [],
        path: '/test/item-1.md',
        relativePath: 'item-1.md',
        valid: true,
        templateId: 'template-1',
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date()
        }
        // No injectedTo field
      } as KnowledgeItem];

      const result = await migration.migrate(existingItems, existingTemplates);

      const migratedTemplate = result.migratedTemplates[0];
      expect(migratedTemplate.items[0].injectedTo).toBeDefined();
      expect(Array.isArray(migratedTemplate.items[0].injectedTo)).toBe(true);
    });

    it('should not create ungrouped template if option is false', async () => {
      const existingTemplates: MarketplaceTemplate[] = [];
      const existingItems: KnowledgeItem[] = [{
        id: 'item-1',
        title: 'Orphaned Item',
        body: 'Test',
        type: KnowledgeType.GOLDEN_PATH,
        scope: KnowledgeScope.TEAM,
        tags: [],
        path: '/test/item-1.md',
        relativePath: 'item-1.md',
        valid: true,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date()
        },
        injectedTo: []
      }];

      const result = await migration.migrate(
        existingItems,
        existingTemplates,
        { createUngroupedTemplate: false }
      );

      expect(result.success).toBe(true);
      expect(result.templatesCreated).toBe(0);
      expect(result.orphanedItems).toBe(1);
    });
  });

  describe('generateReport', () => {
    it('should generate a detailed report', () => {
      const result = {
        success: true,
        templatesCreated: 3,
        itemsMigrated: 15,
        orphanedItems: 2,
        errors: [],
        warnings: ['Some warning'],
        migratedTemplates: [
          {
            id: 'test-1',
            name: 'Test Template',
            version: '1.0',
            items: [{ id: 'item-1' }] as any
          } as MarketplaceTemplate
        ]
      };

      const report = migration.generateReport(result);

      expect(report).toContain('SUCCESS');
      expect(report).toContain('Templates created: 3');
      expect(report).toContain('Items migrated: 15');
      expect(report).toContain('Orphaned items: 2');
      expect(report).toContain('Warnings');
      expect(report).toContain('Some warning');
      expect(report).toContain('Test Template');
    });

    it('should include errors in report', () => {
      const result = {
        success: false,
        templatesCreated: 0,
        itemsMigrated: 0,
        orphanedItems: 0,
        errors: ['Error 1', 'Error 2'],
        warnings: [],
        migratedTemplates: []
      };

      const report = migration.generateReport(result);

      expect(report).toContain('FAILED');
      expect(report).toContain('Errors');
      expect(report).toContain('Error 1');
      expect(report).toContain('Error 2');
    });
  });
});
