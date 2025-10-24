/**
 * KnowledgeFileSystem Tests
 *
 * Tests for template JSON persistence and markdown file handling
 */

import { KnowledgeFileSystem } from '../KnowledgeFileSystem';
import { MarketplaceTemplate, TemplateSource, TemplateCategory, KnowledgeType, KnowledgeScope, AuditOperation } from '../types';

describe('KnowledgeFileSystem', () => {
  let fs: KnowledgeFileSystem;
  const workspaceRoot = '/test/workspace';

  beforeEach(() => {
    fs = new KnowledgeFileSystem(workspaceRoot);
  });

  describe('Template JSON Persistence', () => {
    describe('toTemplateJson', () => {
      it('should serialize template to pretty JSON', () => {
        const template: MarketplaceTemplate = {
          id: 'test-123',
          name: 'Test Template',
          description: 'A test template',
          version: '1.0',
          category: TemplateCategory.DEVELOPMENT,
          tags: ['test'],
          author: {
            name: 'Test Author',
            email: 'test@example.com'
          },
          license: 'MIT',
          source: TemplateSource.USER,
          createdAt: new Date('2025-10-23T10:00:00Z'),
          updatedAt: new Date('2025-10-23T11:00:00Z'),
          items: [],
          auditLog: [],
          versionHistory: []
        };

        const json = fs.toTemplateJson(template);

        expect(json).toContain('"id": "test-123"');
        expect(json).toContain('"name": "Test Template"');
        expect(json).toContain('"version": "1.0"');
        expect(JSON.parse(json)).toEqual(expect.objectContaining({
          id: 'test-123',
          name: 'Test Template'
        }));
      });

      it('should remove undefined values', () => {
        const template: MarketplaceTemplate = {
          id: 'test-123',
          name: 'Test Template',
          description: 'A test template',
          version: '1.0',
          category: TemplateCategory.DEVELOPMENT,
          tags: ['test'],
          author: {
            name: 'Test Author'
          },
          license: 'MIT',
          source: TemplateSource.USER,
          createdAt: new Date('2025-10-23T10:00:00Z'),
          updatedAt: new Date('2025-10-23T11:00:00Z'),
          items: [],
          auditLog: [],
          versionHistory: [],
          sourceTemplateId: undefined,
          lastVersionedAt: undefined
        };

        const json = fs.toTemplateJson(template);
        const parsed = JSON.parse(json);

        expect(parsed).not.toHaveProperty('sourceTemplateId');
        expect(parsed).not.toHaveProperty('lastVersionedAt');
      });

      it('should support compact JSON without pretty printing', () => {
        const template: MarketplaceTemplate = {
          id: 'test-123',
          name: 'Test Template',
          description: 'A test template',
          version: '1.0',
          category: TemplateCategory.DEVELOPMENT,
          tags: ['test'],
          author: {
            name: 'Test Author'
          },
          license: 'MIT',
          source: TemplateSource.USER,
          createdAt: new Date('2025-10-23T10:00:00Z'),
          updatedAt: new Date('2025-10-23T11:00:00Z'),
          items: [],
          auditLog: [],
          versionHistory: []
        };

        const json = fs.toTemplateJson(template, { pretty: false });

        expect(json).not.toContain('\n');
        expect(json).not.toContain('  ');
      });
    });

    describe('loadTemplateJson', () => {
      it('should load and deserialize template', async () => {
        const json = JSON.stringify({
          id: 'test-123',
          name: 'Test Template',
          description: 'A test template',
          version: '1.0',
          category: TemplateCategory.DEVELOPMENT,
          tags: ['test'],
          author: {
            name: 'Test Author',
            email: 'test@example.com'
          },
          license: 'MIT',
          source: TemplateSource.USER,
          createdAt: '2025-10-23T10:00:00Z',
          updatedAt: '2025-10-23T11:00:00Z',
          items: [],
          auditLog: [],
          versionHistory: []
        });

        const template = await fs.loadTemplateJson('/test/template.json', json);

        expect(template.id).toBe('test-123');
        expect(template.name).toBe('Test Template');
        expect(template.createdAt).toBeInstanceOf(Date);
        expect(template.updatedAt).toBeInstanceOf(Date);
      });

      it('should deserialize item dates', async () => {
        const json = JSON.stringify({
          id: 'test-123',
          name: 'Test Template',
          description: 'A test template',
          version: '1.0',
          category: TemplateCategory.DEVELOPMENT,
          tags: ['test'],
          author: {
            name: 'Test Author'
          },
          license: 'MIT',
          source: TemplateSource.USER,
          createdAt: '2025-10-23T10:00:00Z',
          updatedAt: '2025-10-23T11:00:00Z',
          items: [{
            id: 'item-1',
            title: 'Test Item',
            body: 'Test content',
            type: KnowledgeType.GOLDEN_PATH,
            scope: KnowledgeScope.TEAM,
            tags: ['test'],
            metadata: {
              createdAt: '2025-10-23T09:00:00Z',
              updatedAt: '2025-10-23T09:30:00Z'
            },
            injectedTo: []
          }],
          auditLog: [],
          versionHistory: []
        });

        const template = await fs.loadTemplateJson('/test/template.json', json);

        expect(template.items[0].metadata.createdAt).toBeInstanceOf(Date);
        expect(template.items[0].metadata.updatedAt).toBeInstanceOf(Date);
      });

      it('should deserialize audit log dates', async () => {
        const json = JSON.stringify({
          id: 'test-123',
          name: 'Test Template',
          description: 'A test template',
          version: '1.0',
          category: TemplateCategory.DEVELOPMENT,
          tags: ['test'],
          author: {
            name: 'Test Author'
          },
          license: 'MIT',
          source: TemplateSource.USER,
          createdAt: '2025-10-23T10:00:00Z',
          updatedAt: '2025-10-23T11:00:00Z',
          items: [],
          auditLog: [{
            id: 'audit-1',
            timestamp: '2025-10-23T10:00:00Z',
            operation: AuditOperation.TEMPLATE_CREATED,
            actor: 'user',
            details: {}
          }],
          versionHistory: []
        });

        const template = await fs.loadTemplateJson('/test/template.json', json);

        expect(template.auditLog).toBeDefined();
        expect(template.auditLog![0].timestamp).toBeInstanceOf(Date);
      });

      it('should deserialize version history dates', async () => {
        const json = JSON.stringify({
          id: 'test-123',
          name: 'Test Template',
          description: 'A test template',
          version: '1.1',
          category: TemplateCategory.DEVELOPMENT,
          tags: ['test'],
          author: {
            name: 'Test Author'
          },
          license: 'MIT',
          source: TemplateSource.USER,
          createdAt: '2025-10-23T10:00:00Z',
          updatedAt: '2025-10-23T11:00:00Z',
          items: [],
          auditLog: [],
          versionHistory: [{
            versionNumber: '1.0',
            description: 'Initial version',
            createdAt: '2025-10-23T10:00:00Z',
            createdBy: 'user',
            itemCount: 0,
            snapshot: {
              items: [],
              templateMetadata: {
                name: 'Test Template',
                description: 'A test template',
                tags: ['test']
              }
            }
          }]
        });

        const template = await fs.loadTemplateJson('/test/template.json', json);

        expect(template.versionHistory).toBeDefined();
        expect(template.versionHistory![0].createdAt).toBeInstanceOf(Date);
      });

      it('should throw error for invalid JSON', async () => {
        await expect(
          fs.loadTemplateJson('/test/template.json', 'invalid json')
        ).rejects.toThrow();
      });

      it('should throw error for missing required fields', async () => {
        const json = JSON.stringify({
          name: 'Test Template'
          // Missing id and version
        });

        await expect(
          fs.loadTemplateJson('/test/template.json', json)
        ).rejects.toThrow('missing required fields');
      });
    });

    describe('validateTemplateJson', () => {
      it('should validate correct template JSON', () => {
        const json = JSON.stringify({
          id: 'test-123',
          name: 'Test Template',
          version: '1.0',
          items: []
        });

        const result = fs.validateTemplateJson(json);

        expect(result.valid).toBe(true);
        expect(result.template).toBeDefined();
      });

      it('should reject template without id', () => {
        const json = JSON.stringify({
          name: 'Test Template',
          version: '1.0',
          items: []
        });

        const result = fs.validateTemplateJson(json);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('id');
      });

      it('should reject template without name', () => {
        const json = JSON.stringify({
          id: 'test-123',
          version: '1.0',
          items: []
        });

        const result = fs.validateTemplateJson(json);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('name');
      });

      it('should reject template without version', () => {
        const json = JSON.stringify({
          id: 'test-123',
          name: 'Test Template',
          items: []
        });

        const result = fs.validateTemplateJson(json);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('version');
      });

      it('should reject template with invalid items', () => {
        const json = JSON.stringify({
          id: 'test-123',
          name: 'Test Template',
          version: '1.0',
          items: 'not an array'
        });

        const result = fs.validateTemplateJson(json);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('items must be an array');
      });

      it('should reject invalid JSON', () => {
        const result = fs.validateTemplateJson('invalid json');

        expect(result.valid).toBe(false);
        expect(result.error).toContain('JSON parse error');
      });
    });

    describe('generateTemplateFileName', () => {
      it('should generate safe filename', () => {
        const template: MarketplaceTemplate = {
          id: 'test-123',
          name: 'My API Patterns',
          description: '',
          version: '1.3',
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
        };

        const fileName = fs.generateTemplateFileName(template);

        expect(fileName).toBe('my-api-patterns-v1.3.json');
      });

      it('should sanitize special characters', () => {
        const template: MarketplaceTemplate = {
          id: 'test-123',
          name: 'Test / Template & Patterns!',
          description: '',
          version: '2.0',
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
        };

        const fileName = fs.generateTemplateFileName(template);

        expect(fileName).toBe('test-template-patterns-v2.0.json');
      });
    });

    describe('getTemplateFilePath', () => {
      it('should generate path for bundled template', () => {
        const template: MarketplaceTemplate = {
          id: 'test-123',
          name: 'Git Essentials',
          description: '',
          version: '1.0',
          category: TemplateCategory.DEVELOPMENT,
          tags: [],
          author: { name: 'Test' },
          license: 'MIT',
          source: TemplateSource.BUNDLED,
          createdAt: new Date(),
          updatedAt: new Date(),
          items: [],
          auditLog: [],
          versionHistory: []
        };

        const filePath = fs.getTemplateFilePath(template, '/test/templates');

        expect(filePath).toContain('/bundled/');
        expect(filePath).toContain('git-essentials-v1.0.json');
      });

      it('should generate path for user template', () => {
        const template: MarketplaceTemplate = {
          id: 'test-123',
          name: 'My Template',
          description: '',
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
        };

        const filePath = fs.getTemplateFilePath(template, '/test/templates');

        expect(filePath).toContain('/user/');
      });

      it('should generate path for cloned template', () => {
        const template: MarketplaceTemplate = {
          id: 'test-123',
          name: 'Cloned Template',
          description: '',
          version: '1.0',
          category: TemplateCategory.DEVELOPMENT,
          tags: [],
          author: { name: 'Test' },
          license: 'MIT',
          source: TemplateSource.CLONED,
          createdAt: new Date(),
          updatedAt: new Date(),
          items: [],
          auditLog: [],
          versionHistory: []
        };

        const filePath = fs.getTemplateFilePath(template, '/test/templates');

        expect(filePath).toContain('/cloned/');
      });

      it('should generate path for imported template', () => {
        const template: MarketplaceTemplate = {
          id: 'test-123',
          name: 'Imported Template',
          description: '',
          version: '1.0',
          category: TemplateCategory.DEVELOPMENT,
          tags: [],
          author: { name: 'Test' },
          license: 'MIT',
          source: TemplateSource.IMPORTED,
          createdAt: new Date(),
          updatedAt: new Date(),
          items: [],
          auditLog: [],
          versionHistory: []
        };

        const filePath = fs.getTemplateFilePath(template, '/test/templates');

        expect(filePath).toContain('/imported/');
      });
    });

    describe('Round-trip serialization', () => {
      it('should serialize dates as ISO strings in JSON', () => {
        const template: MarketplaceTemplate = {
          id: 'test-123',
          name: 'Test',
          description: '',
          version: '1.0',
          category: TemplateCategory.DEVELOPMENT,
          tags: [],
          author: { name: 'Test' },
          license: 'MIT',
          source: TemplateSource.USER,
          createdAt: new Date('2025-10-23T10:00:00.000Z'),
          updatedAt: new Date('2025-10-23T11:00:00.000Z'),
          items: [],
          auditLog: [],
          versionHistory: []
        };

        const json = fs.toTemplateJson(template);
        const parsed = JSON.parse(json);

        // Dates should be serialized as ISO strings
        expect(parsed.createdAt).toBe('2025-10-23T10:00:00.000Z');
        expect(parsed.updatedAt).toBe('2025-10-23T11:00:00.000Z');
      });

      it('should preserve template data through save and load', async () => {
        const original: MarketplaceTemplate = {
          id: 'test-123',
          name: 'Test Template',
          description: 'A comprehensive test template',
          version: '1.2',
          category: TemplateCategory.DEVELOPMENT,
          tags: ['test', 'example'],
          author: {
            name: 'Test Author',
            email: 'test@example.com',
            url: 'https://example.com'
          },
          license: 'MIT',
          source: TemplateSource.USER,
          scope: KnowledgeScope.TEAM,
          createdAt: new Date('2025-10-23T10:00:00.000Z'),
          updatedAt: new Date('2025-10-23T11:00:00.000Z'),
          lastVersionedAt: new Date('2025-10-23T10:30:00.000Z'),
          items: [{
            id: 'item-1',
            title: 'Test Item',
            body: 'Test content',
            type: KnowledgeType.GOLDEN_PATH,
            scope: KnowledgeScope.TEAM,
            tags: ['test'],
            path: '/test/item-1.md',
            relativePath: 'item-1.md',
            valid: true,
            metadata: {
              createdAt: new Date('2025-10-23T09:00:00.000Z'),
              updatedAt: new Date('2025-10-23T09:30:00.000Z'),
              author: 'Test Author'
            },
            injectedTo: [{
              filePath: 'docs/claude.md',
              injectedAt: new Date('2025-10-23T10:00:00.000Z'),
              injectedBy: 'user',
              injectionType: 'item'
            }]
          }],
          auditLog: [{
            id: 'audit-1',
            timestamp: new Date('2025-10-23T10:00:00.000Z'),
            operation: AuditOperation.TEMPLATE_CREATED,
            actor: 'user',
            details: {}
          }],
          versionHistory: [{
            versionNumber: '1.0',
            description: 'Initial version',
            createdAt: new Date('2025-10-23T10:00:00.000Z'),
            createdBy: 'user',
            itemCount: 1,
            snapshot: {
              items: [],
              templateMetadata: {
                name: 'Test Template',
                description: 'A comprehensive test template',
                tags: ['test'],
                category: 'development' as any
              }
            }
          }]
        };

        // Save to JSON
        const json = fs.toTemplateJson(original);

        // Parse to verify it's valid JSON
        const parsed = JSON.parse(json);
        expect(parsed.id).toBe('test-123');
        expect(parsed.name).toBe('Test Template');

        // Load back from JSON
        const loaded = await fs.loadTemplateJson('/test/template.json', json);

        // Verify core fields
        expect(loaded.id).toBe(original.id);
        expect(loaded.name).toBe(original.name);
        expect(loaded.version).toBe(original.version);
        expect(loaded.description).toBe(original.description);
        expect(loaded.category).toBe(original.category);
        expect(loaded.source).toBe(original.source);
        expect(loaded.scope).toBe(original.scope);

        // Verify arrays
        expect(loaded.items).toHaveLength(1);
        expect(loaded.auditLog).toHaveLength(1);
        expect(loaded.versionHistory).toHaveLength(1);

        // Verify item content
        expect(loaded.items[0]!.id).toBe('item-1');
        expect(loaded.items[0]!.title).toBe('Test Item');
        expect(loaded.items[0]!.body).toBe('Test content');
        const firstItem = loaded.items[0]!;
        expect(firstItem.injectedTo).toBeDefined();
        expect(firstItem.injectedTo!).toHaveLength(1);
        expect(firstItem.injectedTo![0]!.filePath).toBe('docs/claude.md');

        // Verify all dates are Date objects
        expect(loaded.createdAt).toBeInstanceOf(Date);
        expect(loaded.updatedAt).toBeInstanceOf(Date);
        expect(loaded.lastVersionedAt).toBeInstanceOf(Date);
        expect(firstItem.metadata.createdAt).toBeInstanceOf(Date);
        expect(firstItem.metadata.updatedAt).toBeInstanceOf(Date);
        expect(firstItem.injectedTo![0]!.injectedAt).toBeInstanceOf(Date);
        expect(loaded.auditLog![0].timestamp).toBeInstanceOf(Date);
        expect(loaded.versionHistory![0].createdAt).toBeInstanceOf(Date);

        // Verify date values (ISO string comparison)
        expect((loaded.createdAt as Date).toISOString()).toBe('2025-10-23T10:00:00.000Z');
        expect((loaded.updatedAt as Date).toISOString()).toBe('2025-10-23T11:00:00.000Z');
        expect((loaded.lastVersionedAt as Date).toISOString()).toBe('2025-10-23T10:30:00.000Z');
        expect((firstItem.metadata.createdAt as Date).toISOString()).toBe('2025-10-23T09:00:00.000Z');
        expect((firstItem.metadata.updatedAt as Date).toISOString()).toBe('2025-10-23T09:30:00.000Z');
      });
    });
  });

  describe('Markdown File Handling', () => {
    // Existing markdown tests would go here
    // (Not implementing now as they already exist)
  });
});
