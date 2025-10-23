/**
 * Template Store
 *
 * Unified storage for templates with embedded items.
 * Replaces the separation of KnowledgeStore (items) and MarketplaceManager (templates).
 *
 * Key responsibilities:
 * - Store templates with embedded items (not separate)
 * - CRUD operations on templates
 * - CRUD operations on items within templates
 * - Move/copy items between templates
 * - Automatic audit logging of all operations
 */

import {
  MarketplaceTemplate,
  KnowledgeItem,
  KnowledgeType,
  KnowledgeScope,
  TemplateSource,
  TemplateCategory,
  AuditOperation
} from './types';
import { AuditLogger } from './AuditLogger';

/**
 * Options for creating a new template
 */
export interface CreateTemplateOptions {
  name: string;
  description: string;
  category: TemplateCategory;
  tags: string[];
  author: {
    name: string;
    email?: string;
    url?: string;
  };
  license: string;
  source: TemplateSource;
  scope?: KnowledgeScope;
  items?: KnowledgeItem[];
  sourceTemplateId?: string;  // If cloned
}

/**
 * Options for updating template metadata
 */
export interface UpdateTemplateOptions {
  name?: string;
  description?: string;
  category?: TemplateCategory;
  tags?: string[];
  scope?: KnowledgeScope;
}

/**
 * Options for creating a new item
 */
export interface CreateItemOptions {
  title: string;
  body: string;
  type: KnowledgeType;
  scope: KnowledgeScope;
  tags: string[];
  author?: string;
  source?: string;
  path?: string;
  relativePath?: string;
}

/**
 * Options for updating an item
 */
export interface UpdateItemOptions {
  title?: string;
  body?: string;
  type?: KnowledgeType;
  scope?: KnowledgeScope;
  tags?: string[];
  author?: string;
  source?: string;
}

/**
 * Result of a move operation
 */
export interface MoveItemResult {
  success: boolean;
  fromTemplateId: string;
  toTemplateId: string;
  itemId: string;
  error?: string;
}

/**
 * Result of a copy operation
 */
export interface CopyItemResult {
  success: boolean;
  sourceItemId: string;
  newItemId: string;
  toTemplateId: string;
  error?: string;
}

/**
 * TemplateStore - Unified storage for templates with embedded items
 */
export class TemplateStore {
  private templates: Map<string, MarketplaceTemplate> = new Map();
  private auditLogger: AuditLogger;

  constructor(auditLogger?: AuditLogger) {
    this.auditLogger = auditLogger || new AuditLogger();
  }

  // ==========================================================================
  // TEMPLATE CRUD OPERATIONS
  // ==========================================================================

  /**
   * Add a new template to the store
   */
  addTemplate(options: CreateTemplateOptions): MarketplaceTemplate {
    const now = new Date().toISOString();
    const template: MarketplaceTemplate = {
      id: this.generateTemplateId(options.name, options.source),
      name: options.name,
      description: options.description,
      version: '1.0.0',
      createdAt: now,
      updatedAt: now,
      category: options.category,
      tags: options.tags,
      author: options.author,
      license: options.license,
      source: options.source,
      items: options.items || [],
      itemCount: (options.items || []).length,
      scope: options.scope,
      versionHistory: [],
      auditLog: [],
      sourceTemplateId: options.sourceTemplateId
    };

    // Add initial audit log entry
    const auditEntry = this.auditLogger.createEntry({
      operation: options.sourceTemplateId
        ? AuditOperation.TEMPLATE_CLONED
        : AuditOperation.TEMPLATE_CREATED,
      actor: 'user',
      details: {
        sourceTemplateId: options.sourceTemplateId,
        sourceTemplateName: options.sourceTemplateId
          ? this.templates.get(options.sourceTemplateId)?.name
          : undefined
      }
    });

    template.auditLog = [auditEntry];
    this.templates.set(template.id, template);

    return template;
  }

  /**
   * Get a template by ID
   */
  getTemplate(id: string): MarketplaceTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Get all templates
   */
  getAllTemplates(): MarketplaceTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by source
   */
  getTemplatesBySource(source: TemplateSource): MarketplaceTemplate[] {
    return this.getAllTemplates().filter(t => t.source === source);
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: TemplateCategory): MarketplaceTemplate[] {
    return this.getAllTemplates().filter(t => t.category === category);
  }

  /**
   * Update template metadata
   */
  updateTemplate(
    templateId: string,
    updates: UpdateTemplateOptions,
    actor: string = 'user'
  ): boolean {
    const template = this.templates.get(templateId);
    if (!template) {
      return false;
    }

    const before = { ...template };
    const changes: Record<string, any> = {};

    if (updates.name !== undefined && updates.name !== template.name) {
      template.name = updates.name;
      changes.name = { from: before.name, to: updates.name };
    }

    if (updates.description !== undefined && updates.description !== template.description) {
      template.description = updates.description;
      changes.description = { from: before.description, to: updates.description };
    }

    if (updates.category !== undefined && updates.category !== template.category) {
      template.category = updates.category;
      changes.category = { from: before.category, to: updates.category };
    }

    if (updates.tags !== undefined) {
      template.tags = updates.tags;
      changes.tags = { from: before.tags, to: updates.tags };
    }

    if (updates.scope !== undefined && updates.scope !== template.scope) {
      template.scope = updates.scope;
      changes.scope = { from: before.scope, to: updates.scope };
    }

    if (Object.keys(changes).length > 0) {
      template.updatedAt = new Date().toISOString();

      // Log the update
      const auditEntry = this.auditLogger.createEntry({
        operation: AuditOperation.METADATA_UPDATED,
        actor,
        details: { changes },
        before: {
          name: before.name,
          description: before.description,
          category: before.category,
          tags: before.tags,
          scope: before.scope
        },
        after: {
          name: template.name,
          description: template.description,
          category: template.category,
          tags: template.tags,
          scope: template.scope
        }
      });

      template.auditLog = template.auditLog || [];
      template.auditLog.push(auditEntry);
    }

    return true;
  }

  /**
   * Delete a template
   */
  deleteTemplate(templateId: string, actor: string = 'user'): boolean {
    const template = this.templates.get(templateId);
    if (!template) {
      return false;
    }

    // Cannot delete bundled templates
    if (template.source === TemplateSource.BUNDLED) {
      return false;
    }

    this.templates.delete(templateId);
    return true;
  }

  /**
   * Check if a template exists
   */
  hasTemplate(templateId: string): boolean {
    return this.templates.has(templateId);
  }

  // ==========================================================================
  // ITEM CRUD OPERATIONS
  // ==========================================================================

  /**
   * Add an item to a template
   */
  addItemToTemplate(
    templateId: string,
    options: CreateItemOptions,
    actor: string = 'user'
  ): KnowledgeItem | null {
    const template = this.templates.get(templateId);
    if (!template) {
      return null;
    }

    // Generate item ID
    const itemId = this.generateItemId();

    const now = new Date();
    const item: KnowledgeItem = {
      id: itemId,
      title: options.title,
      body: options.body,
      type: options.type,
      scope: options.scope,
      tags: options.tags,
      path: options.path || '',
      relativePath: options.relativePath || '',
      valid: true,
      metadata: {
        createdAt: now,
        updatedAt: now,
        author: options.author
      },
      source: options.source,
      templateId: templateId,
      templateName: template.name,
      injectedTo: []
    };

    template.items.push(item);
    template.itemCount = template.items.length;
    template.updatedAt = new Date().toISOString();

    // Log the addition
    const auditEntry = this.auditLogger.createEntry({
      operation: AuditOperation.ITEM_ADDED,
      actor,
      details: {
        itemId: item.id,
        itemTitle: item.title
      }
    });

    template.auditLog = template.auditLog || [];
    template.auditLog.push(auditEntry);

    return item;
  }

  /**
   * Remove an item from a template
   */
  removeItemFromTemplate(
    templateId: string,
    itemId: string,
    actor: string = 'user'
  ): boolean {
    const template = this.templates.get(templateId);
    if (!template) {
      return false;
    }

    const itemIndex = template.items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      return false;
    }

    const item = template.items[itemIndex];
    template.items.splice(itemIndex, 1);
    template.itemCount = template.items.length;
    template.updatedAt = new Date().toISOString();

    // Log the removal
    const auditEntry = this.auditLogger.createEntry({
      operation: AuditOperation.ITEM_REMOVED,
      actor,
      details: {
        itemId: item.id,
        itemTitle: item.title
      }
    });

    template.auditLog = template.auditLog || [];
    template.auditLog.push(auditEntry);

    return true;
  }

  /**
   * Update an item in a template
   */
  updateItem(
    templateId: string,
    itemId: string,
    updates: UpdateItemOptions,
    actor: string = 'user'
  ): boolean {
    const template = this.templates.get(templateId);
    if (!template) {
      return false;
    }

    const item = template.items.find(i => i.id === itemId);
    if (!item) {
      return false;
    }

    const before = { ...item };
    const changes: Record<string, any> = {};

    if (updates.title !== undefined && updates.title !== item.title) {
      item.title = updates.title;
      changes.title = { from: before.title, to: updates.title };
    }

    if (updates.body !== undefined && updates.body !== item.body) {
      item.body = updates.body;
      changes.body = { from: before.body, to: updates.body };
    }

    if (updates.type !== undefined && updates.type !== item.type) {
      item.type = updates.type;
      changes.type = { from: before.type, to: updates.type };
    }

    if (updates.scope !== undefined && updates.scope !== item.scope) {
      item.scope = updates.scope;
      changes.scope = { from: before.scope, to: updates.scope };
    }

    if (updates.tags !== undefined) {
      item.tags = updates.tags;
      changes.tags = { from: before.tags, to: updates.tags };
    }

    if (updates.author !== undefined && updates.author !== item.metadata.author) {
      item.metadata.author = updates.author;
      changes.author = { from: before.metadata.author, to: updates.author };
    }

    if (updates.source !== undefined && updates.source !== item.source) {
      item.source = updates.source;
      changes.source = { from: before.source, to: updates.source };
    }

    if (Object.keys(changes).length > 0) {
      item.metadata.updatedAt = new Date();
      template.updatedAt = new Date().toISOString();

      // Log the update
      const auditEntry = this.auditLogger.createEntry({
        operation: AuditOperation.ITEM_UPDATED,
        actor,
        details: {
          itemId: item.id,
          itemTitle: item.title,
          changes
        },
        before: {
          title: before.title,
          type: before.type,
          scope: before.scope,
          tags: before.tags
        },
        after: {
          title: item.title,
          type: item.type,
          scope: item.scope,
          tags: item.tags
        }
      });

      template.auditLog = template.auditLog || [];
      template.auditLog.push(auditEntry);
    }

    return true;
  }

  /**
   * Get an item from any template
   */
  getItem(itemId: string): { template: MarketplaceTemplate; item: KnowledgeItem } | null {
    for (const template of this.templates.values()) {
      const item = template.items.find(i => i.id === itemId);
      if (item) {
        return { template, item };
      }
    }
    return null;
  }

  /**
   * Get all items from a template
   */
  getItemsFromTemplate(templateId: string): KnowledgeItem[] {
    const template = this.templates.get(templateId);
    return template ? [...template.items] : [];
  }

  /**
   * Get all items across all templates
   */
  getAllItems(): KnowledgeItem[] {
    const items: KnowledgeItem[] = [];
    for (const template of this.templates.values()) {
      items.push(...template.items);
    }
    return items;
  }

  // ==========================================================================
  // MOVE/COPY OPERATIONS
  // ==========================================================================

  /**
   * Move an item from one template to another
   */
  moveItem(
    itemId: string,
    fromTemplateId: string,
    toTemplateId: string,
    actor: string = 'user'
  ): MoveItemResult {
    const fromTemplate = this.templates.get(fromTemplateId);
    const toTemplate = this.templates.get(toTemplateId);

    if (!fromTemplate || !toTemplate) {
      return {
        success: false,
        fromTemplateId,
        toTemplateId,
        itemId,
        error: 'Template not found'
      };
    }

    const itemIndex = fromTemplate.items.findIndex(i => i.id === itemId);
    if (itemIndex === -1) {
      return {
        success: false,
        fromTemplateId,
        toTemplateId,
        itemId,
        error: 'Item not found'
      };
    }

    const item = fromTemplate.items[itemIndex];

    // Remove from source template
    fromTemplate.items.splice(itemIndex, 1);
    fromTemplate.itemCount = fromTemplate.items.length;
    fromTemplate.updatedAt = new Date().toISOString();

    // Update item's template association
    item.templateId = toTemplateId;
    item.templateName = toTemplate.name;

    // Add to target template
    toTemplate.items.push(item);
    toTemplate.itemCount = toTemplate.items.length;
    toTemplate.updatedAt = new Date().toISOString();

    // Log in source template
    const fromAuditEntry = this.auditLogger.createEntry({
      operation: AuditOperation.ITEM_MOVED_FROM,
      actor,
      details: {
        itemId: item.id,
        itemTitle: item.title,
        targetTemplateId: toTemplateId,
        targetTemplateName: toTemplate.name
      }
    });

    fromTemplate.auditLog = fromTemplate.auditLog || [];
    fromTemplate.auditLog.push(fromAuditEntry);

    // Log in target template
    const toAuditEntry = this.auditLogger.createEntry({
      operation: AuditOperation.ITEM_MOVED_TO,
      actor,
      details: {
        itemId: item.id,
        itemTitle: item.title,
        sourceTemplateId: fromTemplateId,
        sourceTemplateName: fromTemplate.name
      }
    });

    toTemplate.auditLog = toTemplate.auditLog || [];
    toTemplate.auditLog.push(toAuditEntry);

    return {
      success: true,
      fromTemplateId,
      toTemplateId,
      itemId
    };
  }

  /**
   * Copy an item from one template to another
   */
  copyItem(
    sourceItemId: string,
    toTemplateId: string,
    actor: string = 'user'
  ): CopyItemResult {
    const toTemplate = this.templates.get(toTemplateId);
    if (!toTemplate) {
      return {
        success: false,
        sourceItemId,
        newItemId: '',
        toTemplateId,
        error: 'Target template not found'
      };
    }

    const sourceResult = this.getItem(sourceItemId);
    if (!sourceResult) {
      return {
        success: false,
        sourceItemId,
        newItemId: '',
        toTemplateId,
        error: 'Source item not found'
      };
    }

    const { item: sourceItem } = sourceResult;

    // Create a copy with new ID
    const newItemId = this.generateItemId();
    const now = new Date();
    const copiedItem: KnowledgeItem = {
      ...sourceItem,
      id: newItemId,
      templateId: toTemplateId,
      templateName: toTemplate.name,
      metadata: {
        ...sourceItem.metadata,
        createdAt: now,
        updatedAt: now
      },
      injectedTo: [] // New copy is not injected anywhere
    };

    toTemplate.items.push(copiedItem);
    toTemplate.itemCount = toTemplate.items.length;
    toTemplate.updatedAt = new Date().toISOString();

    // Log in target template
    const auditEntry = this.auditLogger.createEntry({
      operation: AuditOperation.ITEM_COPIED_TO,
      actor,
      details: {
        itemId: newItemId,
        itemTitle: copiedItem.title,
        sourceTemplateId: sourceItem.templateId,
        sourceTemplateName: sourceItem.templateName
      }
    });

    toTemplate.auditLog = toTemplate.auditLog || [];
    toTemplate.auditLog.push(auditEntry);

    return {
      success: true,
      sourceItemId,
      newItemId,
      toTemplateId
    };
  }

  // ==========================================================================
  // INJECTION TRACKING
  // ==========================================================================

  /**
   * Record that an item was injected to a file
   */
  recordItemInjection(
    itemId: string,
    filePath: string,
    injectionType: 'item' | 'template',
    parentTemplateId?: string,
    actor: string = 'user'
  ): boolean {
    const result = this.getItem(itemId);
    if (!result) {
      return false;
    }

    const { template, item } = result;

    // Add injection record to item
    item.injectedTo = item.injectedTo || [];
    item.injectedTo.push({
      filePath,
      injectedAt: new Date(),
      injectedBy: actor,
      injectionType,
      parentTemplateId,
      parentTemplateName: parentTemplateId
        ? this.templates.get(parentTemplateId)?.name
        : undefined
    });

    template.updatedAt = new Date().toISOString();

    // Log the injection
    const auditEntry = this.auditLogger.createEntry({
      operation: AuditOperation.ITEM_INJECTED,
      actor,
      details: {
        itemId: item.id,
        itemTitle: item.title,
        targetFile: filePath
      }
    });

    template.auditLog = template.auditLog || [];
    template.auditLog.push(auditEntry);

    return true;
  }

  /**
   * Record that an item was removed from a file
   */
  recordItemRemoval(
    itemId: string,
    filePath: string,
    actor: string = 'user'
  ): boolean {
    const result = this.getItem(itemId);
    if (!result) {
      return false;
    }

    const { template, item } = result;

    // Remove injection record from item
    if (item.injectedTo) {
      item.injectedTo = item.injectedTo.filter(
        record => record.filePath !== filePath
      );
    }

    template.updatedAt = new Date().toISOString();

    // Log the removal
    const auditEntry = this.auditLogger.createEntry({
      operation: AuditOperation.ITEM_REMOVED_FROM_FILE,
      actor,
      details: {
        itemId: item.id,
        itemTitle: item.title,
        targetFile: filePath
      }
    });

    template.auditLog = template.auditLog || [];
    template.auditLog.push(auditEntry);

    return true;
  }

  /**
   * Record that a template was injected to a file
   */
  recordTemplateInjection(
    templateId: string,
    filePath: string,
    actor: string = 'user'
  ): boolean {
    const template = this.templates.get(templateId);
    if (!template) {
      return false;
    }

    // Record injection for all items in template
    for (const item of template.items) {
      this.recordItemInjection(item.id, filePath, 'template', templateId, actor);
    }

    // Log the template injection
    const auditEntry = this.auditLogger.createEntry({
      operation: AuditOperation.TEMPLATE_INJECTED,
      actor,
      details: {
        targetFile: filePath,
        context: `${template.items.length} items injected`
      }
    });

    template.auditLog = template.auditLog || [];
    template.auditLog.push(auditEntry);

    return true;
  }

  /**
   * Record that a template was removed from a file
   */
  recordTemplateRemoval(
    templateId: string,
    filePath: string,
    actor: string = 'user'
  ): boolean {
    const template = this.templates.get(templateId);
    if (!template) {
      return false;
    }

    // Remove injection records for all items in template
    for (const item of template.items) {
      this.recordItemRemoval(item.id, filePath, actor);
    }

    // Log the template removal
    const auditEntry = this.auditLogger.createEntry({
      operation: AuditOperation.TEMPLATE_REMOVED_FROM_FILE,
      actor,
      details: {
        targetFile: filePath,
        context: `${template.items.length} items removed`
      }
    });

    template.auditLog = template.auditLog || [];
    template.auditLog.push(auditEntry);

    return true;
  }

  // ==========================================================================
  // SEARCH AND FILTER
  // ==========================================================================

  /**
   * Search items by text query
   */
  searchItems(query: string): KnowledgeItem[] {
    const lowerQuery = query.toLowerCase();
    const results: KnowledgeItem[] = [];

    for (const template of this.templates.values()) {
      for (const item of template.items) {
        if (
          item.title.toLowerCase().includes(lowerQuery) ||
          item.body.toLowerCase().includes(lowerQuery) ||
          item.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
          (item.source && item.source.toLowerCase().includes(lowerQuery))
        ) {
          results.push(item);
        }
      }
    }

    return results;
  }

  /**
   * Get items by type
   */
  getItemsByType(type: KnowledgeType): KnowledgeItem[] {
    const results: KnowledgeItem[] = [];
    for (const template of this.templates.values()) {
      results.push(...template.items.filter(item => item.type === type));
    }
    return results;
  }

  /**
   * Get items by scope
   */
  getItemsByScope(scope: KnowledgeScope): KnowledgeItem[] {
    const results: KnowledgeItem[] = [];
    for (const template of this.templates.values()) {
      results.push(...template.items.filter(item => item.scope === scope));
    }
    return results;
  }

  /**
   * Get items by tag
   */
  getItemsByTag(tag: string): KnowledgeItem[] {
    const results: KnowledgeItem[] = [];
    for (const template of this.templates.values()) {
      results.push(...template.items.filter(item => item.tags.includes(tag)));
    }
    return results;
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Clear all templates from the store
   */
  clear(): void {
    this.templates.clear();
  }

  /**
   * Get the number of templates in the store
   */
  getTemplateCount(): number {
    return this.templates.size;
  }

  /**
   * Get the total number of items across all templates
   */
  getTotalItemCount(): number {
    let count = 0;
    for (const template of this.templates.values()) {
      count += template.items.length;
    }
    return count;
  }

  /**
   * Load templates from an array (for initialization)
   */
  loadTemplates(templates: MarketplaceTemplate[]): void {
    for (const template of templates) {
      // Initialize audit log and version history if missing
      if (!template.auditLog) {
        template.auditLog = [];
      }
      if (!template.versionHistory) {
        template.versionHistory = [];
      }

      // Update item template associations
      for (const item of template.items) {
        item.templateId = template.id;
        item.templateName = template.name;
        if (!item.injectedTo) {
          item.injectedTo = [];
        }
      }

      this.templates.set(template.id, template);
    }
  }

  /**
   * Export all templates to JSON
   */
  exportAllTemplates(): string {
    return JSON.stringify(
      {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        templates: this.getAllTemplates()
      },
      null,
      2
    );
  }

  // ==========================================================================
  // PRIVATE HELPER METHODS
  // ==========================================================================

  private generateTemplateId(name: string, source: TemplateSource): string {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const prefix = source === TemplateSource.BUNDLED ? 'bundled' :
                   source === TemplateSource.CLONED ? 'cloned' :
                   source === TemplateSource.IMPORTED ? 'imported' : 'user';

    const timestamp = Date.now();
    return `${prefix}.${slug}-${timestamp}`;
  }

  private generateItemId(): string {
    return `item-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
