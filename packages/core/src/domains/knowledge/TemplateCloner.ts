/**
 * Template Cloner
 *
 * Handles deep and shallow cloning of templates (bundled or user-created).
 *
 * **Deep Clone (default):**
 * - New template ID
 * - New item IDs
 * - All items cloned
 * - Audit log copied from source + TEMPLATE_CLONED entry added
 * - Version history copied from source
 * - Reference to source template ID
 *
 * **Shallow Clone:**
 * - New template ID
 * - New item IDs
 * - All items cloned
 * - Fresh audit log (only TEMPLATE_CLONED entry)
 * - No version history (starts at v1.0.0)
 * - Reference to source template ID
 */

import {
  MarketplaceTemplate,
  KnowledgeItem,
  TemplateSource,
  AuditOperation
} from './types';
import { AuditLogger } from './AuditLogger';

/**
 * Options for cloning a template
 */
export interface CloneTemplateOptions {
  /** New name for the cloned template */
  newName?: string;

  /** New description for the cloned template */
  newDescription?: string;

  /** Whether to include all items (default: true) */
  includeItems?: boolean;

  /** Whether to copy tags (default: true) */
  copyTags?: boolean;

  /** Whether to include audit log from source (default: true for deep clone) */
  includeAuditLog?: boolean;

  /** Whether to include version history from source (default: true for deep clone) */
  includeVersionHistory?: boolean;

  /** Actor performing the clone */
  actor?: string;
}

/**
 * Result of a clone operation
 */
export interface CloneResult {
  success: boolean;
  clonedTemplate?: MarketplaceTemplate;
  sourceTemplateId: string;
  error?: string;
}

/**
 * TemplateCloner - Shallow cloning of templates
 */
export class TemplateCloner {
  private auditLogger: AuditLogger;

  constructor(auditLogger?: AuditLogger) {
    this.auditLogger = auditLogger || new AuditLogger();
  }

  /**
   * Clone a template
   * @param sourceTemplate - Template to clone
   * @param options - Clone options (defaults to deep clone with audit log and version history)
   * @returns Clone result with new template
   */
  cloneTemplate(
    sourceTemplate: MarketplaceTemplate,
    options: CloneTemplateOptions = {}
  ): CloneResult {
    const actor = options.actor || 'user';

    try {
      const now = new Date().toISOString();

      // Generate new template ID
      const newName = options.newName || `${sourceTemplate.name} (Copy)`;
      const newTemplateId = this.generateTemplateId(newName, TemplateSource.CLONED);

      // Clone items with new IDs
      const clonedItems: KnowledgeItem[] = [];
      if (options.includeItems !== false) {
        for (const sourceItem of sourceTemplate.items) {
          const newItemId = this.generateItemId();
          const clonedItem: KnowledgeItem = {
            ...sourceItem,
            id: newItemId,
            templateId: newTemplateId,
            templateName: newName,
            metadata: {
              ...sourceItem.metadata,
              createdAt: new Date(),
              updatedAt: new Date()
            },
            tags: [...sourceItem.tags],
            injectedTo: [] // New clone is not injected anywhere
          };

          clonedItems.push(clonedItem);
        }
      }

      // Create cloned template
      const clonedTemplate: MarketplaceTemplate = {
        id: newTemplateId,
        name: newName,
        description: options.newDescription || sourceTemplate.description,
        version: options.includeVersionHistory ? sourceTemplate.version : '1.0.0',
        createdAt: now,
        updatedAt: now,
        category: sourceTemplate.category,
        tags: options.copyTags !== false ? [...sourceTemplate.tags] : [],
        author: { ...sourceTemplate.author },
        license: sourceTemplate.license,
        source: TemplateSource.CLONED,
        items: clonedItems,
        itemCount: clonedItems.length,
        scope: sourceTemplate.scope,
        versionHistory: options.includeVersionHistory && sourceTemplate.versionHistory
          ? [...sourceTemplate.versionHistory]
          : [],
        auditLog: [],
        sourceTemplateId: sourceTemplate.id // Track origin
      };

      // Build audit log
      if (options.includeAuditLog && sourceTemplate.auditLog) {
        // Deep clone: copy existing audit log, then add clone entry
        clonedTemplate.auditLog = [...sourceTemplate.auditLog];
      }

      // Add clone operation to audit log
      const auditEntry = this.auditLogger.createEntry({
        operation: AuditOperation.TEMPLATE_CLONED,
        actor,
        details: {
          sourceTemplateId: sourceTemplate.id,
          sourceTemplateName: sourceTemplate.name,
          context: `Cloned from "${sourceTemplate.name}" with ${clonedItems.length} items`
        }
      });

      clonedTemplate.auditLog?.push(auditEntry);

      return {
        success: true,
        clonedTemplate,
        sourceTemplateId: sourceTemplate.id
      };
    } catch (error) {
      return {
        success: false,
        sourceTemplateId: sourceTemplate.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Clone multiple templates at once
   */
  cloneMultiple(
    sourceTemplates: MarketplaceTemplate[],
    options: CloneTemplateOptions = {}
  ): CloneResult[] {
    return sourceTemplates.map(template => this.cloneTemplate(template, options));
  }

  /**
   * Clone a template with a custom name suffix
   */
  cloneWithSuffix(
    sourceTemplate: MarketplaceTemplate,
    suffix: string,
    actor: string = 'user'
  ): CloneResult {
    return this.cloneTemplate(sourceTemplate, {
      newName: `${sourceTemplate.name} ${suffix}`,
      actor
    });
  }

  /**
   * Clone only specific items from a template
   */
  cloneWithSelectedItems(
    sourceTemplate: MarketplaceTemplate,
    itemIds: string[],
    newName: string,
    actor: string = 'user'
  ): CloneResult {
    try {
      const now = new Date().toISOString();
      const newTemplateId = this.generateTemplateId(newName, TemplateSource.CLONED);

      // Clone only selected items
      const selectedItems = sourceTemplate.items.filter(item =>
        itemIds.includes(item.id)
      );

      if (selectedItems.length === 0) {
        return {
          success: false,
          sourceTemplateId: sourceTemplate.id,
          error: 'No valid items selected for cloning'
        };
      }

      const clonedItems: KnowledgeItem[] = selectedItems.map(sourceItem => {
        const newItemId = this.generateItemId();
        return {
          ...sourceItem,
          id: newItemId,
          templateId: newTemplateId,
          templateName: newName,
          metadata: {
            ...sourceItem.metadata,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          tags: [...sourceItem.tags],
          injectedTo: []
        };
      });

      const clonedTemplate: MarketplaceTemplate = {
        id: newTemplateId,
        name: newName,
        description: `Partial clone from ${sourceTemplate.name}`,
        version: '1.0.0',
        createdAt: now,
        updatedAt: now,
        category: sourceTemplate.category,
        tags: [...sourceTemplate.tags],
        author: { ...sourceTemplate.author },
        license: sourceTemplate.license,
        source: TemplateSource.CLONED,
        items: clonedItems,
        itemCount: clonedItems.length,
        scope: sourceTemplate.scope,
        versionHistory: [],
        auditLog: [],
        sourceTemplateId: sourceTemplate.id
      };

      const auditEntry = this.auditLogger.createEntry({
        operation: AuditOperation.TEMPLATE_CLONED,
        actor,
        details: {
          sourceTemplateId: sourceTemplate.id,
          sourceTemplateName: sourceTemplate.name,
          context: `Partial clone: ${clonedItems.length} of ${sourceTemplate.items.length} items`
        }
      });

      clonedTemplate.auditLog = [auditEntry];

      return {
        success: true,
        clonedTemplate,
        sourceTemplateId: sourceTemplate.id
      };
    } catch (error) {
      return {
        success: false,
        sourceTemplateId: sourceTemplate.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create an empty template (not technically a clone, but related)
   */
  createEmptyTemplate(
    name: string,
    description: string,
    category: MarketplaceTemplate['category'],
    author: MarketplaceTemplate['author'],
    actor: string = 'user'
  ): MarketplaceTemplate {
    const now = new Date().toISOString();
    const templateId = this.generateTemplateId(name, TemplateSource.USER);

    const template: MarketplaceTemplate = {
      id: templateId,
      name,
      description,
      version: '1.0.0',
      createdAt: now,
      updatedAt: now,
      category,
      tags: [],
      author,
      license: 'MIT',
      source: TemplateSource.USER,
      items: [],
      itemCount: 0,
      versionHistory: [],
      auditLog: []
    };

    const auditEntry = this.auditLogger.createEntry({
      operation: AuditOperation.TEMPLATE_CREATED,
      actor,
      details: {
        context: 'Empty template created'
      }
    });

    template.auditLog = [auditEntry];

    return template;
  }

  /**
   * Validate clone compatibility (checks if source can be cloned)
   */
  validateCloneCompatibility(sourceTemplate: MarketplaceTemplate): {
    canClone: boolean;
    reason?: string;
  } {
    // All templates can be cloned (bundled, user, etc.)
    // This is a V1 design requirement

    if (!sourceTemplate.id || !sourceTemplate.name) {
      return {
        canClone: false,
        reason: 'Invalid template: missing ID or name'
      };
    }

    if (!sourceTemplate.items) {
      return {
        canClone: false,
        reason: 'Invalid template: missing items array'
      };
    }

    return { canClone: true };
  }

  /**
   * Get clone metadata (info about the clone relationship)
   */
  getCloneMetadata(template: MarketplaceTemplate): CloneMetadata | null {
    if (template.source !== TemplateSource.CLONED || !template.sourceTemplateId) {
      return null;
    }

    // Convert Date to ISO string if needed
    const clonedAt = template.createdAt instanceof Date
      ? template.createdAt.toISOString()
      : template.createdAt;

    return {
      isClone: true,
      sourceTemplateId: template.sourceTemplateId,
      clonedAt,
      itemCount: template.itemCount ?? template.items.length
    };
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

/**
 * Clone metadata
 */
export interface CloneMetadata {
  isClone: boolean;
  sourceTemplateId: string;
  clonedAt: string;
  itemCount: number;
}
