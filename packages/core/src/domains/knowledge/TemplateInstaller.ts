/**
 * TemplateInstaller - Template Installation and Uninstallation Logic
 *
 * Handles:
 * - Installing templates into workspace
 * - Deduplicating items by ID
 * - Creating KnowledgeItems with sourceTemplate metadata
 * - Uninstalling templates
 * - Cleaning up orphaned items
 * - Coordinating with TemplateRegistry and KnowledgeStore
 */

import {
  MarketplaceTemplate,
  KnowledgeItem,
  KnowledgeType,
  KnowledgeScope,
  TemplateSource
} from './types';
import { KnowledgeStore } from './KnowledgeStore';
import { TemplateRegistry } from './TemplateRegistry';

export interface InstallOptions {
  /** Skip items that already exist (by ID) */
  skipDuplicates?: boolean;
  /** Update existing items if they have the same ID */
  updateExisting?: boolean;
}

export interface InstallResult {
  success: boolean;
  templateId: string;
  itemsCreated: number;
  itemsUpdated: number;
  itemsSkipped: number;
  createdItemIds: string[];
  error?: string;
  details?: string[];
}

export interface UninstallResult {
  success: boolean;
  templateId: string;
  itemsRemoved: number;
  orphanedItemIds: string[];
  error?: string;
}

/**
 * TemplateInstaller - Handles template installation logic
 *
 * Works with:
 * - KnowledgeStore: To add/update/remove items
 * - TemplateRegistry: To track installations
 */
export class TemplateInstaller {
  constructor(
    private store: KnowledgeStore,
    private registry: TemplateRegistry
  ) {}

  // ============================================
  // Installation
  // ============================================

  /**
   * Install a template into the workspace
   * Creates KnowledgeItems with sourceTemplate metadata
   */
  async install(
    template: MarketplaceTemplate,
    options: InstallOptions = {}
  ): Promise<InstallResult> {
    const result: InstallResult = {
      success: false,
      templateId: template.id,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsSkipped: 0,
      createdItemIds: [],
      details: []
    };

    try {
      // Check if already installed
      if (this.registry.isInstalled(template.id)) {
        return {
          ...result,
          success: false,
          error: 'Template is already installed. Uninstall first to reinstall.'
        };
      }

      // Process each item in the template
      for (const templateItem of template.items) {
        const itemResult = await this.installItem(
          templateItem,
          template,
          options
        );

        if (itemResult.created) {
          result.itemsCreated++;
          result.createdItemIds.push(itemResult.itemId!);
          result.details!.push(`Created: ${templateItem.title}`);
        } else if (itemResult.updated) {
          result.itemsUpdated++;
          result.createdItemIds.push(itemResult.itemId!);
          result.details!.push(`Updated: ${templateItem.title}`);
        } else if (itemResult.skipped) {
          result.itemsSkipped++;
          result.createdItemIds.push(itemResult.itemId!);
          result.details!.push(`Skipped: ${templateItem.title} (already exists)`);
        }
      }

      // Register installation in registry
      this.registry.install(
        template.id,
        template.version,
        template.source,
        result.createdItemIds
      );

      // Save registry
      await this.registry.saveRegistry();

      result.success = true;
      return result;
    } catch (error: any) {
      return {
        ...result,
        success: false,
        error: `Installation failed: ${error.message}`
      };
    }
  }

  /**
   * Install a single item from a template
   */
  private async installItem(
    templateItem: KnowledgeItem,
    template: MarketplaceTemplate,
    options: InstallOptions
  ): Promise<{
    created?: boolean;
    updated?: boolean;
    skipped?: boolean;
    itemId?: string;
  }> {
    // Check if item already exists (by ID)
    const existing = this.store.getItem(templateItem.id);

    if (existing) {
      if (options.skipDuplicates) {
        return { skipped: true, itemId: existing.id };
      }

      if (options.updateExisting) {
        // Update existing item, preserving original sourceTemplate if it exists
        const updatedItem: KnowledgeItem = {
          ...existing,
          title: templateItem.title,
          body: templateItem.body,
          tags: templateItem.tags,
          source: templateItem.source,
          sourceTemplate: existing.sourceTemplate || {
            id: template.id,
            version: template.version,
            itemKey: templateItem.id
          },
          metadata: {
            ...existing.metadata,
            updatedAt: new Date()
          }
        };

        this.store.updateItem(existing.id, updatedItem);
        return { updated: true, itemId: existing.id };
      }

      // Default: skip duplicates
      return { skipped: true, itemId: existing.id };
    }

    // Create new item with sourceTemplate metadata
    const newItem: KnowledgeItem = {
      ...templateItem,
      sourceTemplate: {
        id: template.id,
        version: template.version,
        itemKey: templateItem.id
      },
      metadata: {
        ...templateItem.metadata,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };

    this.store.addItem(newItem);
    return { created: true, itemId: newItem.id };
  }

  // ============================================
  // Uninstallation
  // ============================================

  /**
   * Uninstall a template from the workspace
   * Removes orphaned items (items not in any other installed template)
   */
  async uninstall(templateId: string): Promise<UninstallResult> {
    const result: UninstallResult = {
      success: false,
      templateId,
      itemsRemoved: 0,
      orphanedItemIds: []
    };

    try {
      // Check if installed
      if (!this.registry.isInstalled(templateId)) {
        return {
          ...result,
          success: false,
          error: 'Template is not installed'
        };
      }

      // Unregister from registry (this also identifies orphaned items)
      const uninstallResult = this.registry.uninstall(templateId);

      if (!uninstallResult.success) {
        return {
          ...result,
          success: false,
          error: uninstallResult.error
        };
      }

      result.orphanedItemIds = uninstallResult.orphanedItemIds || [];

      // Remove orphaned items from store
      for (const itemId of result.orphanedItemIds) {
        this.store.deleteItem(itemId);
        result.itemsRemoved++;
      }

      // Save registry
      await this.registry.saveRegistry();

      result.success = true;
      return result;
    } catch (error: any) {
      return {
        ...result,
        success: false,
        error: `Uninstallation failed: ${error.message}`
      };
    }
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Check if a template can be installed
   */
  canInstall(templateId: string): { canInstall: boolean; reason?: string } {
    if (this.registry.isInstalled(templateId)) {
      return {
        canInstall: false,
        reason: 'Template is already installed'
      };
    }

    return { canInstall: true };
  }

  /**
   * Check if a template can be uninstalled
   */
  canUninstall(templateId: string): { canUninstall: boolean; reason?: string } {
    if (!this.registry.isInstalled(templateId)) {
      return {
        canUninstall: false,
        reason: 'Template is not installed'
      };
    }

    return { canUninstall: true };
  }

  /**
   * Get preview of what would be removed on uninstall
   */
  previewUninstall(templateId: string): {
    totalItems: number;
    orphanedItems: number;
    orphanedItemIds: string[];
    sharedItems: number;
  } {
    const installation = this.registry.getInstallation(templateId);

    if (!installation) {
      return {
        totalItems: 0,
        orphanedItems: 0,
        orphanedItemIds: [],
        sharedItems: 0
      };
    }

    const orphanedItemIds: string[] = [];
    let sharedItems = 0;

    for (const itemId of installation.installedItemIds) {
      const templates = this.registry.getTemplatesContainingItem(itemId);

      if (templates.length === 1 && templates[0].templateId === templateId) {
        orphanedItemIds.push(itemId);
      } else if (templates.length > 1) {
        sharedItems++;
      }
    }

    return {
      totalItems: installation.installedItemIds.length,
      orphanedItems: orphanedItemIds.length,
      orphanedItemIds,
      sharedItems
    };
  }

  /**
   * Get items that came from a specific template
   */
  getTemplateItems(templateId: string): KnowledgeItem[] {
    const installation = this.registry.getInstallation(templateId);

    if (!installation) {
      return [];
    }

    return installation.installedItemIds
      .map(id => this.store.getItem(id))
      .filter((item): item is KnowledgeItem => item !== undefined);
  }

  /**
   * Repair installation registry (reconcile with actual items in store)
   */
  async repairRegistry(): Promise<{
    success: boolean;
    fixed: number;
    removed: number;
    details: string[];
  }> {
    const details: string[] = [];
    let fixed = 0;
    let removed = 0;

    try {
      const installations = this.registry.getAllInstalled();

      for (const installation of installations) {
        const validItemIds: string[] = [];
        const invalidItemIds: string[] = [];

        // Check each item
        for (const itemId of installation.installedItemIds) {
          const item = this.store.getItem(itemId);

          if (item) {
            validItemIds.push(itemId);
          } else {
            invalidItemIds.push(itemId);
          }
        }

        if (invalidItemIds.length > 0) {
          // Update installation with valid IDs only
          this.registry.install(
            installation.templateId,
            installation.version,
            installation.source,
            validItemIds
          );

          fixed++;
          details.push(
            `Fixed ${installation.templateId}: Removed ${invalidItemIds.length} missing items`
          );
        }

        // Remove installation if no items remain
        if (validItemIds.length === 0) {
          this.registry.uninstall(installation.templateId);
          removed++;
          details.push(
            `Removed ${installation.templateId}: No valid items remaining`
          );
        }
      }

      await this.registry.saveRegistry();

      return {
        success: true,
        fixed,
        removed,
        details
      };
    } catch (error: any) {
      return {
        success: false,
        fixed,
        removed,
        details: [...details, `Error: ${error.message}`]
      };
    }
  }
}
