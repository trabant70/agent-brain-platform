/**
 * TemplateRegistry - Installation Tracking for Marketplace Templates
 *
 * Handles:
 * - Tracking which templates are installed in workspace
 * - Persisting installation registry to JSON file
 * - Managing installed item IDs for uninstallation
 * - Detecting orphaned items during uninstallation
 *
 * Registry file: .agent-brain/marketplace/installed.json
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  InstalledTemplate,
  InstallationRegistry,
  TemplateSource
} from './types';

export interface InstallResult {
  success: boolean;
  templateId?: string;
  installedItemIds?: string[];
  error?: string;
}

export interface UninstallResult {
  success: boolean;
  templateId?: string;
  orphanedItemIds?: string[];
  error?: string;
}

/**
 * TemplateRegistry - Tracks template installations
 *
 * Responsibilities:
 * - Load/save installation registry from disk
 * - Track which templates are installed
 * - Track which KnowledgeItems came from which template
 * - Detect orphaned items (items with no remaining templates)
 * - Provide installation status queries
 */
export class TemplateRegistry {
  private registry: InstallationRegistry;
  private registryPath: string;
  private isDirty: boolean = false;

  constructor(agentBrainDir: string) {
    this.registryPath = path.join(agentBrainDir, 'marketplace', 'installed.json');
    this.registry = this.loadRegistry();
  }

  // ============================================
  // Initialization
  // ============================================

  /**
   * Load registry from disk
   */
  private loadRegistry(): InstallationRegistry {
    try {
      if (!fs.existsSync(this.registryPath)) {
        // Return empty registry
        return {
          version: '1.0',
          installed: [],
          lastUpdated: new Date().toISOString()
        };
      }

      const content = fs.readFileSync(this.registryPath, 'utf-8');
      const data = JSON.parse(content);

      // Validate structure
      if (!data.version || !Array.isArray(data.installed)) {
        throw new Error('Invalid registry format');
      }

      return data;
    } catch (error: any) {
      console.error('Failed to load installation registry:', error.message);
      // Return empty registry on error
      return {
        version: '1.0',
        installed: [],
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * Save registry to disk
   */
  async saveRegistry(): Promise<void> {
    if (!this.isDirty) {
      return; // No changes to save
    }

    try {
      // Ensure directory exists
      const dir = path.dirname(this.registryPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Update timestamp
      this.registry.lastUpdated = new Date().toISOString();

      // Write to file
      fs.writeFileSync(
        this.registryPath,
        JSON.stringify(this.registry, null, 2),
        'utf-8'
      );

      this.isDirty = false;
    } catch (error: any) {
      throw new Error(`Failed to save installation registry: ${error.message}`);
    }
  }

  // ============================================
  // Installation Management
  // ============================================

  /**
   * Register a template installation
   */
  install(
    templateId: string,
    version: string,
    source: TemplateSource,
    installedItemIds: string[]
  ): InstallResult {
    try {
      // Check if already installed
      const existing = this.registry.installed.find(t => t.templateId === templateId);

      if (existing) {
        // Update existing installation
        existing.version = version;
        existing.installedAt = new Date().toISOString();
        existing.installedItemIds = installedItemIds;
        existing.source = source;
      } else {
        // Add new installation
        this.registry.installed.push({
          templateId,
          version,
          installedAt: new Date().toISOString(),
          installedItemIds,
          source
        });
      }

      this.isDirty = true;

      return {
        success: true,
        templateId,
        installedItemIds
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to register installation: ${error.message}`
      };
    }
  }

  /**
   * Unregister a template installation
   * Returns IDs of orphaned items (items that exist in no other installed templates)
   */
  uninstall(templateId: string): UninstallResult {
    try {
      const index = this.registry.installed.findIndex(t => t.templateId === templateId);

      if (index === -1) {
        return {
          success: false,
          error: 'Template is not installed'
        };
      }

      const uninstalledTemplate = this.registry.installed[index];
      const orphanedItemIds = this.findOrphanedItems(uninstalledTemplate.installedItemIds);

      // Remove from registry
      this.registry.installed.splice(index, 1);
      this.isDirty = true;

      return {
        success: true,
        templateId,
        orphanedItemIds
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to unregister installation: ${error.message}`
      };
    }
  }

  /**
   * Find items that would become orphaned if given items were removed
   * An item is orphaned if it exists in no other installed templates
   */
  private findOrphanedItems(itemIds: string[]): string[] {
    const orphaned: string[] = [];

    for (const itemId of itemIds) {
      // Check if this item exists in any other installed template
      const existsInOther = this.registry.installed.some(template =>
        template.installedItemIds.includes(itemId)
      );

      if (!existsInOther) {
        orphaned.push(itemId);
      }
    }

    return orphaned;
  }

  // ============================================
  // Query Methods
  // ============================================

  /**
   * Check if a template is installed
   */
  isInstalled(templateId: string): boolean {
    return this.registry.installed.some(t => t.templateId === templateId);
  }

  /**
   * Get installation info for a template
   */
  getInstallation(templateId: string): InstalledTemplate | undefined {
    return this.registry.installed.find(t => t.templateId === templateId);
  }

  /**
   * Get all installed templates
   */
  getAllInstalled(): InstalledTemplate[] {
    return [...this.registry.installed];
  }

  /**
   * Get templates that contain a specific item
   */
  getTemplatesContainingItem(itemId: string): InstalledTemplate[] {
    return this.registry.installed.filter(template =>
      template.installedItemIds.includes(itemId)
    );
  }

  /**
   * Check if an item would be orphaned if its template were uninstalled
   */
  wouldBeOrphaned(templateId: string, itemId: string): boolean {
    const installation = this.getInstallation(templateId);
    if (!installation) {
      return false;
    }

    // Check if item exists in this template
    if (!installation.installedItemIds.includes(itemId)) {
      return false;
    }

    // Check if item exists in any other installed template
    const existsInOther = this.registry.installed.some(
      template =>
        template.templateId !== templateId &&
        template.installedItemIds.includes(itemId)
    );

    return !existsInOther;
  }

  /**
   * Get statistics about installations
   */
  getStats(): {
    totalInstalled: number;
    totalItems: number;
    uniqueItems: number;
    bundledInstalled: number;
    userInstalled: number;
  } {
    const allItemIds = new Set<string>();

    for (const template of this.registry.installed) {
      template.installedItemIds.forEach(id => allItemIds.add(id));
    }

    const bundledInstalled = this.registry.installed.filter(
      t => t.source === TemplateSource.BUNDLED
    ).length;

    const userInstalled = this.registry.installed.filter(
      t => t.source === TemplateSource.USER
    ).length;

    return {
      totalInstalled: this.registry.installed.length,
      totalItems: this.registry.installed.reduce(
        (sum, t) => sum + t.installedItemIds.length,
        0
      ),
      uniqueItems: allItemIds.size,
      bundledInstalled,
      userInstalled
    };
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Get the registry data (for debugging or export)
   */
  getRegistry(): InstallationRegistry {
    return { ...this.registry };
  }

  /**
   * Clear all installations (use with caution!)
   */
  clearAll(): void {
    this.registry.installed = [];
    this.isDirty = true;
  }

  /**
   * Get debug information
   */
  getDebugInfo(): any {
    return {
      registryPath: this.registryPath,
      isDirty: this.isDirty,
      stats: this.getStats(),
      installed: this.registry.installed.map(t => ({
        templateId: t.templateId,
        version: t.version,
        installedAt: t.installedAt,
        itemCount: t.installedItemIds.length
      }))
    };
  }
}
