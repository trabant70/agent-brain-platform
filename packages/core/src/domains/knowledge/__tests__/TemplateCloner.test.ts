/**
 * TemplateCloner Unit Tests
 */

import { TemplateCloner } from '../TemplateCloner';
import { AuditLogger } from '../AuditLogger';
import {
  MarketplaceTemplate,
  TemplateSource,
  TemplateCategory,
  KnowledgeType,
  KnowledgeScope,
  AuditOperation
} from '../types';

describe('TemplateCloner', () => {
  let cloner: TemplateCloner;
  let auditLogger: AuditLogger;
  let sampleTemplate: MarketplaceTemplate;

  beforeEach(() => {
    auditLogger = new AuditLogger();
    cloner = new TemplateCloner(auditLogger);

    sampleTemplate = {
      id: 'bundled.git-essentials',
      name: 'Git Essentials',
      description: 'Essential git workflows',
      version: '2.1.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: TemplateCategory.DEVELOPMENT,
      tags: ['git', 'workflow'],
      author: { name: 'Platform Team' },
      license: 'MIT',
      source: TemplateSource.BUNDLED,
      items: [
        {
          id: 'item-1',
          title: 'Commit Conventions',
          body: 'How to write good commit messages',
          type: KnowledgeType.GOLDEN_PATH,
          scope: KnowledgeScope.TEAM,
          tags: ['git', 'commits'],
          path: '/test',
          relativePath: 'test',
          valid: true,
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date()
          },
          injectedTo: []
        },
        {
          id: 'item-2',
          title: 'Branch Naming',
          body: 'Branch naming conventions',
          type: KnowledgeType.STANDARD,
          scope: KnowledgeScope.TEAM,
          tags: ['git', 'branches'],
          path: '/test2',
          relativePath: 'test2',
          valid: true,
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date()
          },
          injectedTo: []
        }
      ],
      itemCount: 2,
      versionHistory: [],
      auditLog: []
    };
  });

  describe('cloneTemplate', () => {
    it('should create a shallow clone with new IDs', () => {
      const result = cloner.cloneTemplate(sampleTemplate);

      expect(result.success).toBe(true);
      expect(result.clonedTemplate).toBeDefined();

      const clone = result.clonedTemplate!;

      // New template ID
      expect(clone.id).not.toBe(sampleTemplate.id);
      expect(clone.id).toMatch(/^cloned\./);

      // New item IDs
      expect(clone.items).toHaveLength(2);
      expect(clone.items[0].id).not.toBe(sampleTemplate.items[0].id);
      expect(clone.items[1].id).not.toBe(sampleTemplate.items[1].id);
    });

    it('should set default name to "Original Name (Copy)"', () => {
      const result = cloner.cloneTemplate(sampleTemplate);

      expect(result.clonedTemplate!.name).toBe('Git Essentials (Copy)');
    });

    it('should use custom name when provided', () => {
      const result = cloner.cloneTemplate(sampleTemplate, {
        newName: 'My Git Guide'
      });

      expect(result.clonedTemplate!.name).toBe('My Git Guide');
    });

    it('should set source to CLONED', () => {
      const result = cloner.cloneTemplate(sampleTemplate);

      expect(result.clonedTemplate!.source).toBe(TemplateSource.CLONED);
    });

    it('should set sourceTemplateId', () => {
      const result = cloner.cloneTemplate(sampleTemplate);

      expect(result.clonedTemplate!.sourceTemplateId).toBe(sampleTemplate.id);
    });

    it('should start with version 1.0.0', () => {
      const result = cloner.cloneTemplate(sampleTemplate);

      expect(result.clonedTemplate!.version).toBe('1.0.0');
    });

    it('should have empty version history', () => {
      const result = cloner.cloneTemplate(sampleTemplate);

      expect(result.clonedTemplate!.versionHistory).toEqual([]);
    });

    it('should have initial TEMPLATE_CLONED audit log entry', () => {
      const result = cloner.cloneTemplate(sampleTemplate);

      expect(result.clonedTemplate!.auditLog).toHaveLength(1);
      expect(result.clonedTemplate!.auditLog![0].operation).toBe(AuditOperation.TEMPLATE_CLONED);
      expect(result.clonedTemplate!.auditLog![0].details.sourceTemplateId).toBe(sampleTemplate.id);
    });

    it('should update item template associations', () => {
      const result = cloner.cloneTemplate(sampleTemplate);

      const clone = result.clonedTemplate!;

      expect(clone.items[0].templateId).toBe(clone.id);
      expect(clone.items[0].templateName).toBe(clone.name);
      expect(clone.items[1].templateId).toBe(clone.id);
      expect(clone.items[1].templateName).toBe(clone.name);
    });

    it('should clear injection records', () => {
      sampleTemplate.items[0].injectedTo = [
        {
          filePath: 'test.md',
          injectedAt: new Date(),
          injectedBy: 'user',
          injectionType: 'item'
        }
      ];

      const result = cloner.cloneTemplate(sampleTemplate);

      expect(result.clonedTemplate!.items[0].injectedTo).toEqual([]);
    });

    it('should copy tags by default', () => {
      const result = cloner.cloneTemplate(sampleTemplate);

      expect(result.clonedTemplate!.tags).toEqual(['git', 'workflow']);
    });

    it('should not copy tags when specified', () => {
      const result = cloner.cloneTemplate(sampleTemplate, {
        copyTags: false
      });

      expect(result.clonedTemplate!.tags).toEqual([]);
    });

    it('should include items by default', () => {
      const result = cloner.cloneTemplate(sampleTemplate);

      expect(result.clonedTemplate!.items).toHaveLength(2);
    });

    it('should exclude items when specified', () => {
      const result = cloner.cloneTemplate(sampleTemplate, {
        includeItems: false
      });

      expect(result.clonedTemplate!.items).toEqual([]);
      expect(result.clonedTemplate!.itemCount).toBe(0);
    });

    it('should handle bundled templates', () => {
      const result = cloner.cloneTemplate(sampleTemplate);

      expect(result.success).toBe(true);
      expect(result.clonedTemplate!.source).toBe(TemplateSource.CLONED);
    });

    it('should handle user templates', () => {
      sampleTemplate.source = TemplateSource.USER;

      const result = cloner.cloneTemplate(sampleTemplate);

      expect(result.success).toBe(true);
      expect(result.clonedTemplate!.source).toBe(TemplateSource.CLONED);
    });
  });

  describe('cloneMultiple', () => {
    it('should clone multiple templates', () => {
      const template2: MarketplaceTemplate = {
        ...sampleTemplate,
        id: 'template-2',
        name: 'Second Template'
      };

      const results = cloner.cloneMultiple([sampleTemplate, template2]);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[0].clonedTemplate!.id).not.toBe(results[1].clonedTemplate!.id);
    });
  });

  describe('cloneWithSuffix', () => {
    it('should append suffix to cloned template name', () => {
      const result = cloner.cloneWithSuffix(sampleTemplate, '(Backup)');

      expect(result.success).toBe(true);
      expect(result.clonedTemplate!.name).toBe('Git Essentials (Backup)');
    });
  });

  describe('cloneWithSelectedItems', () => {
    it('should clone only selected items', () => {
      const result = cloner.cloneWithSelectedItems(
        sampleTemplate,
        ['item-1'],
        'Partial Clone'
      );

      expect(result.success).toBe(true);
      expect(result.clonedTemplate!.items).toHaveLength(1);
      expect(result.clonedTemplate!.items[0].title).toBe('Commit Conventions');
    });

    it('should return error if no items selected', () => {
      const result = cloner.cloneWithSelectedItems(
        sampleTemplate,
        [],
        'Empty Clone'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should filter out non-existent item IDs', () => {
      const result = cloner.cloneWithSelectedItems(
        sampleTemplate,
        ['item-1', 'non-existent'],
        'Partial Clone'
      );

      expect(result.success).toBe(true);
      expect(result.clonedTemplate!.items).toHaveLength(1);
    });

    it('should set description to indicate partial clone', () => {
      const result = cloner.cloneWithSelectedItems(
        sampleTemplate,
        ['item-1'],
        'Partial Clone'
      );

      expect(result.clonedTemplate!.description).toContain('Partial clone');
    });
  });

  describe('createEmptyTemplate', () => {
    it('should create an empty template', () => {
      const template = cloner.createEmptyTemplate(
        'New Template',
        'A brand new template',
        TemplateCategory.DOCUMENTATION,
        { name: 'User' }
      );

      expect(template.name).toBe('New Template');
      expect(template.description).toBe('A brand new template');
      expect(template.category).toBe(TemplateCategory.DOCUMENTATION);
      expect(template.items).toEqual([]);
      expect(template.itemCount).toBe(0);
      expect(template.version).toBe('1.0.0');
      expect(template.source).toBe(TemplateSource.USER);
    });

    it('should add TEMPLATE_CREATED audit log entry', () => {
      const template = cloner.createEmptyTemplate(
        'New Template',
        'A brand new template',
        TemplateCategory.DOCUMENTATION,
        { name: 'User' }
      );

      expect(template.auditLog).toHaveLength(1);
      expect(template.auditLog![0].operation).toBe(AuditOperation.TEMPLATE_CREATED);
    });
  });

  describe('validateCloneCompatibility', () => {
    it('should validate valid template', () => {
      const result = cloner.validateCloneCompatibility(sampleTemplate);

      expect(result.canClone).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject template without ID', () => {
      const invalid = { ...sampleTemplate, id: '' };

      const result = cloner.validateCloneCompatibility(invalid);

      expect(result.canClone).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should reject template without name', () => {
      const invalid = { ...sampleTemplate, name: '' };

      const result = cloner.validateCloneCompatibility(invalid);

      expect(result.canClone).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should reject template without items array', () => {
      const invalid = { ...sampleTemplate, items: undefined as any };

      const result = cloner.validateCloneCompatibility(invalid);

      expect(result.canClone).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should allow bundled templates to be cloned', () => {
      const result = cloner.validateCloneCompatibility(sampleTemplate);

      expect(result.canClone).toBe(true);
    });

    it('should allow user templates to be cloned', () => {
      sampleTemplate.source = TemplateSource.USER;

      const result = cloner.validateCloneCompatibility(sampleTemplate);

      expect(result.canClone).toBe(true);
    });
  });

  describe('getCloneMetadata', () => {
    it('should return metadata for cloned template', () => {
      const result = cloner.cloneTemplate(sampleTemplate);
      const clone = result.clonedTemplate!;

      const metadata = cloner.getCloneMetadata(clone);

      expect(metadata).toBeDefined();
      expect(metadata!.isClone).toBe(true);
      expect(metadata!.sourceTemplateId).toBe(sampleTemplate.id);
      expect(metadata!.itemCount).toBe(2);
    });

    it('should return null for non-cloned template', () => {
      const metadata = cloner.getCloneMetadata(sampleTemplate);

      expect(metadata).toBeNull();
    });

    it('should return null for cloned template without sourceTemplateId', () => {
      const invalid = {
        ...sampleTemplate,
        source: TemplateSource.CLONED,
        sourceTemplateId: undefined
      };

      const metadata = cloner.getCloneMetadata(invalid);

      expect(metadata).toBeNull();
    });
  });

  describe('deep copy verification', () => {
    it('should create independent copy of items', () => {
      const result = cloner.cloneTemplate(sampleTemplate);
      const clone = result.clonedTemplate!;

      // Modify original
      sampleTemplate.items[0].title = 'Modified Title';

      // Clone should be unchanged
      expect(clone.items[0].title).toBe('Commit Conventions');
    });

    it('should create independent copy of tags', () => {
      const result = cloner.cloneTemplate(sampleTemplate);
      const clone = result.clonedTemplate!;

      // Modify original
      sampleTemplate.tags.push('new-tag');

      // Clone should be unchanged
      expect(clone.tags).not.toContain('new-tag');
    });

    it('should create independent copy of item tags', () => {
      const result = cloner.cloneTemplate(sampleTemplate);
      const clone = result.clonedTemplate!;

      // Modify original
      sampleTemplate.items[0].tags.push('new-tag');

      // Clone should be unchanged
      expect(clone.items[0].tags).not.toContain('new-tag');
    });
  });
});
