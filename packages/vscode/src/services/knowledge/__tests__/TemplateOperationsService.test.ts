/**
 * TemplateOperationsService Tests
 *
 * Demonstrates how the refactored services can be tested in isolation.
 * These tests showcase the improved testability of the new architecture.
 */

import { TemplateOperationsService } from '../TemplateOperationsService';
import {
  TemplateStore,
  AuditLogger,
  VersionManager,
  TemplateCloner,
  KnowledgeFileSystem,
  TemplateCategory,
  TemplateSource,
  KnowledgeScope,
  KnowledgeType
} from '@agent-brain/core/domains/knowledge';

describe('TemplateOperationsService', () => {
  let service: TemplateOperationsService;
  let mockTemplateStore: jest.Mocked<TemplateStore>;
  let mockAuditLogger: jest.Mocked<AuditLogger>;
  let mockVersionManager: jest.Mocked<VersionManager>;
  let mockTemplateCloner: jest.Mocked<TemplateCloner>;
  let mockFileSystem: jest.Mocked<KnowledgeFileSystem>;

  beforeEach(() => {
    // Create mocks
    mockTemplateStore = {
      addTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      getTemplate: jest.fn(),
      getAllTemplates: jest.fn(),
      addItemToTemplate: jest.fn(),
      updateItem: jest.fn(),
      removeItemFromTemplate: jest.fn(),
      moveItem: jest.fn(),
      copyItem: jest.fn(),
      loadTemplates: jest.fn()
    } as any;

    mockAuditLogger = {} as any;
    mockVersionManager = {
      createVersion: jest.fn()
    } as any;

    mockTemplateCloner = {
      cloneTemplate: jest.fn()
    } as any;

    mockFileSystem = {
      getTemplateFilePath: jest.fn()
    } as any;

    // Create service with mocks
    service = new TemplateOperationsService(
      '/test/workspace',
      mockTemplateStore,
      mockAuditLogger,
      mockVersionManager,
      mockTemplateCloner,
      mockFileSystem
    );
  });

  describe('createTemplate', () => {
    it('should create a new template with USER source', async () => {
      const mockTemplate = {
        id: 'template-123',
        name: 'Test Template',
        description: 'A test template',
        category: TemplateCategory.DEVELOPMENT,
        tags: ['test'],
        author: { name: 'User', email: 'user@local' },
        license: 'MIT',
        source: TemplateSource.USER,
        version: '1.0.0',
        items: []
      };

      mockTemplateStore.addTemplate.mockReturnValue(mockTemplate);

      const result = await service.createTemplate({
        name: 'Test Template',
        description: 'A test template',
        category: TemplateCategory.DEVELOPMENT,
        tags: ['test']
      });

      expect(mockTemplateStore.addTemplate).toHaveBeenCalledWith({
        name: 'Test Template',
        description: 'A test template',
        category: TemplateCategory.DEVELOPMENT,
        tags: ['test'],
        author: { name: 'User', email: 'user@local' },
        license: 'MIT',
        source: TemplateSource.USER,
        scope: undefined
      });

      expect(result).toEqual(mockTemplate);
    });

    it('should include scope when provided', async () => {
      const mockTemplate = {
        id: 'template-456',
        name: 'Scoped Template',
        scope: KnowledgeScope.PROJECT
      } as any;

      mockTemplateStore.addTemplate.mockReturnValue(mockTemplate);

      await service.createTemplate({
        name: 'Scoped Template',
        description: 'Template with scope',
        category: TemplateCategory.DOCUMENTATION,
        tags: [],
        scope: KnowledgeScope.PROJECT
      });

      expect(mockTemplateStore.addTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: KnowledgeScope.PROJECT
        })
      );
    });
  });

  describe('updateTemplate', () => {
    it('should update template metadata', async () => {
      mockTemplateStore.updateTemplate.mockReturnValue(true);

      await service.updateTemplate('template-123', {
        name: 'Updated Name',
        description: 'Updated description'
      });

      expect(mockTemplateStore.updateTemplate).toHaveBeenCalledWith(
        'template-123',
        {
          name: 'Updated Name',
          description: 'Updated description'
        },
        'user'
      );
    });

    it('should throw error if update fails', async () => {
      mockTemplateStore.updateTemplate.mockReturnValue(false);

      await expect(
        service.updateTemplate('template-999', { name: 'Test' })
      ).rejects.toThrow('Failed to update template template-999');
    });
  });

  describe('deleteTemplate', () => {
    it('should prevent deletion of bundled templates', async () => {
      mockTemplateStore.getTemplate.mockReturnValue({
        id: 'bundled-template',
        source: TemplateSource.BUNDLED
      } as any);

      await expect(
        service.deleteTemplate('bundled-template')
      ).rejects.toThrow('Cannot delete bundled templates');
    });

    it('should delete user template from store', async () => {
      const userTemplate = {
        id: 'user-template',
        name: 'User Template',
        source: TemplateSource.USER,
        items: []
      } as any;

      mockTemplateStore.getTemplate.mockReturnValue(userTemplate);
      mockTemplateStore.deleteTemplate.mockReturnValue(true);
      mockFileSystem.getTemplateFilePath.mockReturnValue('/path/to/template.json');

      await service.deleteTemplate('user-template');

      expect(mockTemplateStore.deleteTemplate).toHaveBeenCalledWith(
        'user-template',
        'user'
      );
    });

    it('should throw error if template not found', async () => {
      mockTemplateStore.getTemplate.mockReturnValue(null);

      await expect(
        service.deleteTemplate('nonexistent')
      ).rejects.toThrow('Template nonexistent not found');
    });
  });

  describe('addItemToTemplate', () => {
    it('should add item to template', async () => {
      const mockItem = {
        id: 'item-123',
        title: 'Test Item',
        body: 'Test content',
        type: KnowledgeType.SNIPPET,
        scope: KnowledgeScope.PERSONAL,
        tags: ['test']
      };

      mockTemplateStore.addItemToTemplate.mockReturnValue(mockItem);
      mockTemplateStore.getTemplate.mockReturnValue({
        source: TemplateSource.USER
      } as any);

      const result = await service.addItemToTemplate('template-123', {
        title: 'Test Item',
        body: 'Test content',
        type: KnowledgeType.SNIPPET,
        scope: KnowledgeScope.PERSONAL,
        tags: ['test']
      });

      expect(mockTemplateStore.addItemToTemplate).toHaveBeenCalledWith(
        'template-123',
        expect.objectContaining({
          title: 'Test Item',
          body: 'Test content'
        }),
        'user'
      );

      expect(result).toEqual(mockItem);
    });

    it('should prevent adding items to bundled templates', async () => {
      mockTemplateStore.getTemplate.mockReturnValue({
        name: 'Bundled Template',
        source: TemplateSource.BUNDLED
      } as any);

      await expect(
        service.addItemToTemplate('bundled-template', {
          title: 'Item',
          body: 'Content',
          type: KnowledgeType.SNIPPET,
          scope: KnowledgeScope.PERSONAL,
          tags: []
        })
      ).rejects.toThrow('Cannot add items to bundled template');
    });
  });

  describe('cloneTemplate', () => {
    it('should clone template with default settings', async () => {
      const sourceTemplate = {
        id: 'source-template',
        name: 'Source Template',
        items: []
      } as any;

      const clonedTemplate = {
        id: 'cloned-template',
        name: 'Source Template (Copy)',
        items: []
      } as any;

      mockTemplateStore.getTemplate.mockReturnValue(sourceTemplate);
      mockTemplateCloner.cloneTemplate.mockReturnValue({
        success: true,
        clonedTemplate
      });

      const result = await service.cloneTemplate('source-template', {});

      expect(mockTemplateCloner.cloneTemplate).toHaveBeenCalledWith(
        sourceTemplate,
        expect.objectContaining({
          includeAuditLog: true,
          includeVersionHistory: true,
          actor: 'user'
        })
      );

      expect(result).toEqual(clonedTemplate);
    });

    it('should create shallow clone when requested', async () => {
      const sourceTemplate = { id: 'source', items: [] } as any;
      const clonedTemplate = { id: 'clone', items: [] } as any;

      mockTemplateStore.getTemplate.mockReturnValue(sourceTemplate);
      mockTemplateCloner.cloneTemplate.mockReturnValue({
        success: true,
        clonedTemplate
      });

      await service.cloneTemplate('source', { shallow: true });

      expect(mockTemplateCloner.cloneTemplate).toHaveBeenCalledWith(
        sourceTemplate,
        expect.objectContaining({
          includeAuditLog: false,
          includeVersionHistory: false
        })
      );
    });

    it('should throw error if clone fails', async () => {
      mockTemplateStore.getTemplate.mockReturnValue({ id: 'source' } as any);
      mockTemplateCloner.cloneTemplate.mockReturnValue({
        success: false,
        error: 'Clone failed'
      });

      await expect(
        service.cloneTemplate('source', {})
      ).rejects.toThrow('Clone failed: Clone failed');
    });
  });

  describe('moveItem', () => {
    it('should move item between templates', async () => {
      mockTemplateStore.moveItem.mockReturnValue({ success: true });

      await service.moveItem('item-123', 'template-1', 'template-2');

      expect(mockTemplateStore.moveItem).toHaveBeenCalledWith(
        'item-123',
        'template-1',
        'template-2',
        'user'
      );
    });

    it('should throw error if move fails', async () => {
      mockTemplateStore.moveItem.mockReturnValue({
        success: false,
        error: 'Item not found'
      });

      await expect(
        service.moveItem('item-999', 'template-1', 'template-2')
      ).rejects.toThrow('Item not found');
    });
  });

  describe('copyItem', () => {
    it('should copy item to another template', async () => {
      mockTemplateStore.copyItem.mockReturnValue({
        success: true,
        newItemId: 'item-456'
      });

      const newItemId = await service.copyItem('item-123', 'template-1', 'template-2');

      expect(mockTemplateStore.copyItem).toHaveBeenCalledWith(
        'item-123',
        'template-2',
        'user'
      );

      expect(newItemId).toBe('item-456');
    });

    it('should throw error if copy fails', async () => {
      mockTemplateStore.copyItem.mockReturnValue({
        success: false,
        error: 'Copy failed'
      });

      await expect(
        service.copyItem('item-123', 'template-1', 'template-2')
      ).rejects.toThrow('Copy failed');
    });
  });
});
