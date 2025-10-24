/**
 * Template Migration (V1)
 *
 * Handles migration from pre-V1 structure to V1 template-as-sections model.
 *
 * Old structure:
 * - Knowledge items stored in type-based directories (golden-paths/, patterns/, etc.)
 * - Templates stored separately in templates/ directory (without items)
 * - MarketplaceManager tracks installed templates
 *
 * New structure:
 * - Templates stored as JSON files with embedded items
 * - No separate item storage
 * - Templates organized by source (bundled/, user/, cloned/, imported/)
 */

import { randomUUID } from 'crypto';
import {
  MarketplaceTemplate,
  KnowledgeItem,
  TemplateSource,
  TemplateCategory,
  KnowledgeScope,
  AuditOperation
} from './types';

/**
 * Migration result
 */
export interface MigrationResult {
  success: boolean;
  templatesCreated: number;
  itemsMigrated: number;
  orphanedItems: number;
  errors: string[];
  warnings: string[];
  migratedTemplates: MarketplaceTemplate[];
}

/**
 * Migration options
 */
export interface MigrationOptions {
  archiveOldData?: boolean;           // Move old data to .agent-brain-old/ (default: true)
  createUngroupedTemplate?: boolean;  // Create template for orphaned items (default: true)
  dryRun?: boolean;                   // Simulate migration without saving (default: false)
}

/**
 * Template Migration Manager
 */
export class TemplateMigration {
  private errors: string[] = [];
  private warnings: string[] = [];

  /**
   * Detect if migration is needed
   */
  async needsMigration(
    existingTemplates: MarketplaceTemplate[],
    existingItems: KnowledgeItem[]
  ): Promise<boolean> {
    // If we have old-style templates (without embedded items), migration needed
    const hasOldStyleTemplates = existingTemplates.some(t =>
      !t.items || t.items.length === 0
    );

    // If we have standalone items (not in templates), migration needed
    const hasStandaloneItems = existingItems.length > 0;

    return hasOldStyleTemplates || hasStandaloneItems;
  }

  /**
   * Migrate from old structure to V1
   */
  async migrate(
    existingItems: KnowledgeItem[],
    existingTemplates: MarketplaceTemplate[],
    options: MigrationOptions = {}
  ): Promise<MigrationResult> {
    this.errors = [];
    this.warnings = [];

    const {
      archiveOldData = true,
      createUngroupedTemplate = true,
      dryRun = false
    } = options;

    try {
      // 1. Group items by template ID
      const itemsByTemplate = this.groupItemsByTemplate(existingItems);

      // 2. Merge items into existing templates
      const v1Templates: MarketplaceTemplate[] = [];

      for (const tmpl of existingTemplates) {
        const items = itemsByTemplate.get(tmpl.id) || [];

        // Create V1 template with embedded items
        const v1Template = this.createV1Template(tmpl, items);
        v1Templates.push(v1Template);

        // Remove items from the grouped map (so we can find orphans later)
        itemsByTemplate.delete(tmpl.id);
      }

      // 3. Handle orphaned items (items without a template)
      let ungroupedTemplate: MarketplaceTemplate | null = null;
      const orphanedItems: KnowledgeItem[] = [];

      // Collect items with no template or undefined template
      for (const [templateId, items] of itemsByTemplate.entries()) {
        if (templateId === 'undefined' || templateId === '' || !templateId) {
          orphanedItems.push(...items);
        } else {
          // Template ID exists but template doesn't exist
          this.warnings.push(`Items reference missing template: ${templateId}`);
          orphanedItems.push(...items);
        }
      }

      // Also collect items that had no templateId at all
      const itemsWithNoTemplate = existingItems.filter(item =>
        !item.templateId || item.templateId === ''
      );
      orphanedItems.push(...itemsWithNoTemplate);

      // Remove duplicates
      const uniqueOrphanedItems = this.deduplicateItems(orphanedItems);

      if (uniqueOrphanedItems.length > 0 && createUngroupedTemplate) {
        ungroupedTemplate = this.createUngroupedTemplate(uniqueOrphanedItems);
        v1Templates.push(ungroupedTemplate);
      }

      // 4. Generate migration report
      const result: MigrationResult = {
        success: true,
        templatesCreated: v1Templates.length,
        itemsMigrated: existingItems.length,
        orphanedItems: uniqueOrphanedItems.length,
        errors: this.errors,
        warnings: this.warnings,
        migratedTemplates: v1Templates
      };

      return result;
    } catch (error: any) {
      this.errors.push(`Migration failed: ${error.message}`);
      return {
        success: false,
        templatesCreated: 0,
        itemsMigrated: 0,
        orphanedItems: 0,
        errors: this.errors,
        warnings: this.warnings,
        migratedTemplates: []
      };
    }
  }

  /**
   * Group items by template ID
   */
  private groupItemsByTemplate(items: KnowledgeItem[]): Map<string, KnowledgeItem[]> {
    const grouped = new Map<string, KnowledgeItem[]>();

    for (const item of items) {
      const templateId = item.templateId || 'undefined';
      const existing = grouped.get(templateId) || [];
      existing.push(item);
      grouped.set(templateId, existing);
    }

    return grouped;
  }

  /**
   * Create V1 template from old template + items
   */
  private createV1Template(
    oldTemplate: MarketplaceTemplate,
    items: KnowledgeItem[]
  ): MarketplaceTemplate {
    const now = new Date();

    // Ensure items have proper injection tracking
    const enhancedItems = items.map(item => ({
      ...item,
      injectedTo: item.injectedTo || []
    }));

    return {
      ...oldTemplate,
      items: enhancedItems,
      auditLog: [
        {
          id: randomUUID(),
          timestamp: now,
          operation: AuditOperation.TEMPLATE_CREATED,
          actor: 'system',
          details: {
            comment: 'Migrated from pre-V1 structure',
            itemCount: items.length
          }
        }
      ],
      versionHistory: [
        {
          versionNumber: oldTemplate.version || '1.0',
          description: 'Migrated from pre-V1',
          createdAt: now,
          createdBy: 'system',
          itemCount: items.length,
          snapshot: {
            items: enhancedItems,
            templateMetadata: {
              name: oldTemplate.name,
              description: oldTemplate.description,
              tags: oldTemplate.tags || [],
              category: oldTemplate.category
            }
          }
        }
      ],
      updatedAt: now
    };
  }

  /**
   * Create template for ungrouped items
   */
  private createUngroupedTemplate(items: KnowledgeItem[]): MarketplaceTemplate {
    const now = new Date();

    // Ensure items have proper injection tracking
    const enhancedItems = items.map(item => ({
      ...item,
      templateId: 'ungrouped',
      templateName: 'Ungrouped Items',
      injectedTo: item.injectedTo || []
    }));

    return {
      id: 'ungrouped',
      name: 'Ungrouped Items',
      description: 'Knowledge items not associated with any template',
      version: '1.0',
      category: TemplateCategory.CUSTOM,
      tags: ['auto-generated', 'migration'],
      author: {
        name: 'System',
        email: 'system@agent-brain'
      },
      license: 'MIT',
      source: TemplateSource.USER,
      scope: KnowledgeScope.PERSONAL,
      createdAt: now,
      updatedAt: now,
      items: enhancedItems,
      auditLog: [
        {
          id: randomUUID(),
          timestamp: now,
          operation: AuditOperation.TEMPLATE_CREATED,
          actor: 'system',
          details: {
            comment: 'Auto-generated during migration for orphaned items',
            itemCount: items.length
          }
        }
      ],
      versionHistory: [
        {
          versionNumber: '1.0',
          description: 'Initial migration',
          createdAt: now,
          createdBy: 'system',
          itemCount: items.length,
          snapshot: {
            items: enhancedItems,
            templateMetadata: {
              name: 'Ungrouped Items',
              description: 'Knowledge items not associated with any template',
              tags: ['auto-generated'],
              category: TemplateCategory.CUSTOM
            }
          }
        }
      ]
    };
  }

  /**
   * Remove duplicate items (by ID)
   */
  private deduplicateItems(items: KnowledgeItem[]): KnowledgeItem[] {
    const seen = new Set<string>();
    const unique: KnowledgeItem[] = [];

    for (const item of items) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        unique.push(item);
      }
    }

    return unique;
  }

  /**
   * Generate migration report
   */
  generateReport(result: MigrationResult): string {
    const lines: string[] = [];

    lines.push('# Template Migration Report');
    lines.push('');
    lines.push(`Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    lines.push(`Date: ${new Date().toISOString()}`);
    lines.push('');

    lines.push('## Summary');
    lines.push(`- Templates created: ${result.templatesCreated}`);
    lines.push(`- Items migrated: ${result.itemsMigrated}`);
    lines.push(`- Orphaned items: ${result.orphanedItems}`);
    lines.push('');

    if (result.warnings.length > 0) {
      lines.push('## Warnings');
      for (const warning of result.warnings) {
        lines.push(`⚠️ ${warning}`);
      }
      lines.push('');
    }

    if (result.errors.length > 0) {
      lines.push('## Errors');
      for (const error of result.errors) {
        lines.push(`❌ ${error}`);
      }
      lines.push('');
    }

    if (result.migratedTemplates.length > 0) {
      lines.push('## Migrated Templates');
      for (const tmpl of result.migratedTemplates) {
        lines.push(`- **${tmpl.name}** v${tmpl.version} (${tmpl.items.length} items)`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}
