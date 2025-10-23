/**
 * TemplateStore Unit Tests
 */

import { TemplateStore } from '../TemplateStore';
import { AuditLogger } from '../AuditLogger';
import {
  TemplateSource,
  TemplateCategory,
  KnowledgeType,
  KnowledgeScope,
  AuditOperation
} from '../types';

describe('TemplateStore', () => {
  let store: TemplateStore;
  let auditLogger: AuditLogger;

  beforeEach(() => {
    auditLogger = new AuditLogger();
    store = new TemplateStore(auditLogger);
  });

  describe('addTemplate', () => {
    it('should add a new template to the store', () => {
      const template = store.addTemplate({
        name: 'Test Template',
        description: 'A test template',
        category: TemplateCategory.DEVELOPMENT,
        tags: ['test'],
        author: { name: 'Test Author' },
        license: 'MIT',
        source: TemplateSource.USER
      });

      expect(template).toBeDefined();
      expect(template.name).toBe('Test Template');
      expect(template.version).toBe('1.0.0');
      expect(template.items).toEqual([]);
      expect(template.itemCount).toBe(0);
      expect(template.auditLog).toHaveLength(1);
      expect(template.auditLog![0].operation).toBe(AuditOperation.TEMPLATE_CREATED);
    });

    it('should generate unique template IDs', () => {
      const template1 = store.addTemplate({
        name: 'Template 1',
        description: 'First template',
        category: TemplateCategory.DEVELOPMENT,
        tags: [],
        author: { name: 'Author' },
        license: 'MIT',
        source: TemplateSource.USER
      });

      const template2 = store.addTemplate({
        name: 'Template 2',
        description: 'Second template',
        category: TemplateCategory.DEVELOPMENT,
        tags: [],
        author: { name: 'Author' },
        license: 'MIT',
        source: TemplateSource.USER
      });

      expect(template1.id).not.toBe(template2.id);
    });

    it('should record TEMPLATE_CLONED audit entry when sourceTemplateId provided', () => {
      const template = store.addTemplate({
        name: 'Cloned Template',
        description: 'A cloned template',
        category: TemplateCategory.DEVELOPMENT,
        tags: [],
        author: { name: 'Author' },
        license: 'MIT',
        source: TemplateSource.CLONED,
        sourceTemplateId: 'original-template-id'
      });

      expect(template.auditLog![0].operation).toBe(AuditOperation.TEMPLATE_CLONED);
      expect(template.sourceTemplateId).toBe('original-template-id');
    });
  });

  describe('getTemplate', () => {
    it('should retrieve a template by ID', () => {
      const added = store.addTemplate({
        name: 'Test Template',
        description: 'A test template',
        category: TemplateCategory.DEVELOPMENT,
        tags: [],
        author: { name: 'Author' },
        license: 'MIT',
        source: TemplateSource.USER
      });

      const retrieved = store.getTemplate(added.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(added.id);
    });

    it('should return undefined for non-existent template', () => {
      const retrieved = store.getTemplate('non-existent-id');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('updateTemplate', () => {
    it('should update template metadata', () => {
      const template = store.addTemplate({
        name: 'Original Name',
        description: 'Original description',
        category: TemplateCategory.DEVELOPMENT,
        tags: ['original'],
        author: { name: 'Author' },
        license: 'MIT',
        source: TemplateSource.USER
      });

      const updated = store.updateTemplate(template.id, {
        name: 'Updated Name',
        description: 'Updated description',
        tags: ['updated']
      });

      expect(updated).toBe(true);

      const retrieved = store.getTemplate(template.id);
      expect(retrieved!.name).toBe('Updated Name');
      expect(retrieved!.description).toBe('Updated description');
      expect(retrieved!.tags).toEqual(['updated']);
      expect(retrieved!.auditLog!.length).toBeGreaterThan(1);
      expect(retrieved!.auditLog![retrieved!.auditLog!.length - 1].operation)
        .toBe(AuditOperation.METADATA_UPDATED);
    });

    it('should return false for non-existent template', () => {
      const result = store.updateTemplate('non-existent', { name: 'New Name' });
      expect(result).toBe(false);
    });
  });

  describe('deleteTemplate', () => {
    it('should delete a user template', () => {
      const template = store.addTemplate({
        name: 'Test Template',
        description: 'A test template',
        category: TemplateCategory.DEVELOPMENT,
        tags: [],
        author: { name: 'Author' },
        license: 'MIT',
        source: TemplateSource.USER
      });

      const result = store.deleteTemplate(template.id);
      expect(result).toBe(true);
      expect(store.getTemplate(template.id)).toBeUndefined();
    });

    it('should not delete bundled templates', () => {
      const template = store.addTemplate({
        name: 'Bundled Template',
        description: 'A bundled template',
        category: TemplateCategory.DEVELOPMENT,
        tags: [],
        author: { name: 'Author' },
        license: 'MIT',
        source: TemplateSource.BUNDLED
      });

      const result = store.deleteTemplate(template.id);
      expect(result).toBe(false);
      expect(store.getTemplate(template.id)).toBeDefined();
    });
  });

  describe('addItemToTemplate', () => {
    it('should add an item to a template', () => {
      const template = store.addTemplate({
        name: 'Test Template',
        description: 'A test template',
        category: TemplateCategory.DEVELOPMENT,
        tags: [],
        author: { name: 'Author' },
        license: 'MIT',
        source: TemplateSource.USER
      });

      const item = store.addItemToTemplate(template.id, {
        title: 'Test Item',
        body: 'Test content',
        type: KnowledgeType.BEST_PRACTICE,
        scope: KnowledgeScope.TEAM,
        tags: ['test']
      });

      expect(item).toBeDefined();
      expect(item!.title).toBe('Test Item');
      expect(item!.templateId).toBe(template.id);
      expect(item!.templateName).toBe(template.name);

      const updated = store.getTemplate(template.id);
      expect(updated!.items).toHaveLength(1);
      expect(updated!.itemCount).toBe(1);
      expect(updated!.auditLog!.length).toBeGreaterThan(1);
    });

    it('should return null for non-existent template', () => {
      const item = store.addItemToTemplate('non-existent', {
        title: 'Test Item',
        body: 'Test content',
        type: KnowledgeType.BEST_PRACTICE,
        scope: KnowledgeScope.TEAM,
        tags: []
      });

      expect(item).toBeNull();
    });
  });

  describe('removeItemFromTemplate', () => {
    it('should remove an item from a template', () => {
      const template = store.addTemplate({
        name: 'Test Template',
        description: 'A test template',
        category: TemplateCategory.DEVELOPMENT,
        tags: [],
        author: { name: 'Author' },
        license: 'MIT',
        source: TemplateSource.USER
      });

      const item = store.addItemToTemplate(template.id, {
        title: 'Test Item',
        body: 'Test content',
        type: KnowledgeType.BEST_PRACTICE,
        scope: KnowledgeScope.TEAM,
        tags: []
      });

      const result = store.removeItemFromTemplate(template.id, item!.id);
      expect(result).toBe(true);

      const updated = store.getTemplate(template.id);
      expect(updated!.items).toHaveLength(0);
      expect(updated!.itemCount).toBe(0);
    });
  });

  describe('updateItem', () => {
    it('should update an item in a template', () => {
      const template = store.addTemplate({
        name: 'Test Template',
        description: 'A test template',
        category: TemplateCategory.DEVELOPMENT,
        tags: [],
        author: { name: 'Author' },
        license: 'MIT',
        source: TemplateSource.USER
      });

      const item = store.addItemToTemplate(template.id, {
        title: 'Original Title',
        body: 'Original content',
        type: KnowledgeType.BEST_PRACTICE,
        scope: KnowledgeScope.TEAM,
        tags: ['original']
      });

      const result = store.updateItem(template.id, item!.id, {
        title: 'Updated Title',
        body: 'Updated content',
        tags: ['updated']
      });

      expect(result).toBe(true);

      const updated = store.getTemplate(template.id);
      const updatedItem = updated!.items[0];
      expect(updatedItem.title).toBe('Updated Title');
      expect(updatedItem.body).toBe('Updated content');
      expect(updatedItem.tags).toEqual(['updated']);
    });
  });

  describe('moveItem', () => {
    it('should move an item from one template to another', () => {
      const template1 = store.addTemplate({
        name: 'Template 1',
        description: 'First template',
        category: TemplateCategory.DEVELOPMENT,
        tags: [],
        author: { name: 'Author' },
        license: 'MIT',
        source: TemplateSource.USER
      });

      const template2 = store.addTemplate({
        name: 'Template 2',
        description: 'Second template',
        category: TemplateCategory.DEVELOPMENT,
        tags: [],
        author: { name: 'Author' },
        license: 'MIT',
        source: TemplateSource.USER
      });

      const item = store.addItemToTemplate(template1.id, {
        title: 'Test Item',
        body: 'Test content',
        type: KnowledgeType.BEST_PRACTICE,
        scope: KnowledgeScope.TEAM,
        tags: []
      });

      const result = store.moveItem(item!.id, template1.id, template2.id);

      expect(result.success).toBe(true);

      const source = store.getTemplate(template1.id);
      const target = store.getTemplate(template2.id);

      expect(source!.items).toHaveLength(0);
      expect(target!.items).toHaveLength(1);
      expect(target!.items[0].id).toBe(item!.id);
      expect(target!.items[0].templateId).toBe(template2.id);
    });

    it('should record audit entries in both templates', () => {
      const template1 = store.addTemplate({
        name: 'Template 1',
        description: 'First template',
        category: TemplateCategory.DEVELOPMENT,
        tags: [],
        author: { name: 'Author' },
        license: 'MIT',
        source: TemplateSource.USER
      });

      const template2 = store.addTemplate({
        name: 'Template 2',
        description: 'Second template',
        category: TemplateCategory.DEVELOPMENT,
        tags: [],
        author: { name: 'Author' },
        license: 'MIT',
        source: TemplateSource.USER
      });

      const item = store.addItemToTemplate(template1.id, {
        title: 'Test Item',
        body: 'Test content',
        type: KnowledgeType.BEST_PRACTICE,
        scope: KnowledgeScope.TEAM,
        tags: []
      });

      store.moveItem(item!.id, template1.id, template2.id);

      const source = store.getTemplate(template1.id);
      const target = store.getTemplate(template2.id);

      const sourceAudit = source!.auditLog!.find(
        e => e.operation === AuditOperation.ITEM_MOVED_FROM
      );
      const targetAudit = target!.auditLog!.find(
        e => e.operation === AuditOperation.ITEM_MOVED_TO
      );

      expect(sourceAudit).toBeDefined();
      expect(targetAudit).toBeDefined();
    });
  });

  describe('copyItem', () => {
    it('should copy an item to another template', () => {
      const template1 = store.addTemplate({
        name: 'Template 1',
        description: 'First template',
        category: TemplateCategory.DEVELOPMENT,
        tags: [],
        author: { name: 'Author' },
        license: 'MIT',
        source: TemplateSource.USER
      });

      const template2 = store.addTemplate({
        name: 'Template 2',
        description: 'Second template',
        category: TemplateCategory.DEVELOPMENT,
        tags: [],
        author: { name: 'Author' },
        license: 'MIT',
        source: TemplateSource.USER
      });

      const item = store.addItemToTemplate(template1.id, {
        title: 'Test Item',
        body: 'Test content',
        type: KnowledgeType.BEST_PRACTICE,
        scope: KnowledgeScope.TEAM,
        tags: []
      });

      const result = store.copyItem(item!.id, template2.id);

      expect(result.success).toBe(true);

      const source = store.getTemplate(template1.id);
      const target = store.getTemplate(template2.id);

      expect(source!.items).toHaveLength(1);
      expect(target!.items).toHaveLength(1);
      expect(target!.items[0].id).not.toBe(item!.id);
      expect(target!.items[0].title).toBe(item!.title);
    });
  });

  describe('recordItemInjection', () => {
    it('should record injection to audit log and item', () => {
      const template = store.addTemplate({
        name: 'Test Template',
        description: 'A test template',
        category: TemplateCategory.DEVELOPMENT,
        tags: [],
        author: { name: 'Author' },
        license: 'MIT',
        source: TemplateSource.USER
      });

      const item = store.addItemToTemplate(template.id, {
        title: 'Test Item',
        body: 'Test content',
        type: KnowledgeType.BEST_PRACTICE,
        scope: KnowledgeScope.TEAM,
        tags: []
      });

      const result = store.recordItemInjection(
        item!.id,
        'docs/claude.md',
        'item'
      );

      expect(result).toBe(true);

      const updated = store.getTemplate(template.id);
      const updatedItem = updated!.items[0];

      expect(updatedItem.injectedTo).toHaveLength(1);
      expect(updatedItem.injectedTo![0].filePath).toBe('docs/claude.md');
      expect(updatedItem.injectedTo![0].injectionType).toBe('item');
    });
  });

  describe('searchItems', () => {
    beforeEach(() => {
      const template = store.addTemplate({
        name: 'Test Template',
        description: 'A test template',
        category: TemplateCategory.DEVELOPMENT,
        tags: [],
        author: { name: 'Author' },
        license: 'MIT',
        source: TemplateSource.USER
      });

      store.addItemToTemplate(template.id, {
        title: 'Authentication Guide',
        body: 'How to implement OAuth',
        type: KnowledgeType.GUIDELINE,
        scope: KnowledgeScope.TEAM,
        tags: ['auth', 'security']
      });

      store.addItemToTemplate(template.id, {
        title: 'Database Patterns',
        body: 'Best practices for database design',
        type: KnowledgeType.BEST_PRACTICE,
        scope: KnowledgeScope.TEAM,
        tags: ['database', 'design']
      });
    });

    it('should find items by title', () => {
      const results = store.searchItems('authentication');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Authentication Guide');
    });

    it('should find items by body content', () => {
      const results = store.searchItems('OAuth');
      expect(results).toHaveLength(1);
    });

    it('should find items by tags', () => {
      const results = store.searchItems('security');
      expect(results).toHaveLength(1);
    });

    it('should be case-insensitive', () => {
      const results = store.searchItems('AUTHENTICATION');
      expect(results).toHaveLength(1);
    });
  });

  describe('loadTemplates', () => {
    it('should initialize templates from an array', () => {
      const templates = [
        {
          id: 'template-1',
          name: 'Template 1',
          description: 'First template',
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          category: TemplateCategory.DEVELOPMENT,
          tags: [],
          author: { name: 'Author' },
          license: 'MIT',
          source: TemplateSource.BUNDLED,
          items: [],
          itemCount: 0
        }
      ];

      store.loadTemplates(templates);

      expect(store.getTemplateCount()).toBe(1);
      expect(store.getTemplate('template-1')).toBeDefined();
    });

    it('should initialize audit log and version history if missing', () => {
      const templates = [
        {
          id: 'template-1',
          name: 'Template 1',
          description: 'First template',
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          category: TemplateCategory.DEVELOPMENT,
          tags: [],
          author: { name: 'Author' },
          license: 'MIT',
          source: TemplateSource.BUNDLED,
          items: [],
          itemCount: 0
        }
      ];

      store.loadTemplates(templates);

      const loaded = store.getTemplate('template-1');
      expect(loaded!.auditLog).toBeDefined();
      expect(loaded!.versionHistory).toBeDefined();
    });
  });
});
