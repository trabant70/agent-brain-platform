/**
 * MarketplaceManager - Template Management for Marketplace
 *
 * Handles:
 * - Loading bundled templates from JSON files
 * - Managing template installations
 * - Template export/import
 * - Installation registry coordination
 *
 * Templates are workspace-specific. Installation tracking is managed by TemplateRegistry.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  MarketplaceTemplate,
  KnowledgeItem,
  TemplateSource,
  TemplateCategory,
  InstalledTemplate,
  validateMarketplaceTemplate,
  generateTemplateId
} from './types';

export interface LoadTemplateResult {
  success: boolean;
  template?: MarketplaceTemplate;
  error?: string;
}

export interface ExportTemplateResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export interface InstallationStatus {
  templateId: string;
  isInstalled: boolean;
  installedAt?: string;
  installedItemIds?: string[];
}

/**
 * MarketplaceManager - Manages marketplace templates
 *
 * Responsibilities:
 * - Load bundled templates from disk
 * - Load user-created templates from exports directory
 * - Validate template structure
 * - Export templates to JSON files
 * - Provide template metadata for UI
 */
export class MarketplaceManager {
  private bundledTemplates: Map<string, MarketplaceTemplate> = new Map();
  private userTemplates: Map<string, MarketplaceTemplate> = new Map();
  private bundledTemplatesPath: string;
  private userTemplatesPath: string;

  constructor(
    bundledTemplatesPath: string,
    userTemplatesPath: string
  ) {
    this.bundledTemplatesPath = bundledTemplatesPath;
    this.userTemplatesPath = userTemplatesPath;
  }

  // ============================================
  // Initialization
  // ============================================

  /**
   * Load all templates from disk
   * Call this on startup or when templates directory changes
   */
  async loadAllTemplates(): Promise<{ bundled: number; user: number; errors: string[] }> {
    const errors: string[] = [];

    // Load bundled templates
    const bundledResult = await this.loadBundledTemplates();
    errors.push(...bundledResult.errors);

    // Load user templates
    const userResult = await this.loadUserTemplates();
    errors.push(...userResult.errors);

    return {
      bundled: bundledResult.count,
      user: userResult.count,
      errors
    };
  }

  /**
   * Load bundled templates (shipped with extension)
   */
  private async loadBundledTemplates(): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    try {
      if (!fs.existsSync(this.bundledTemplatesPath)) {
        errors.push(`Bundled templates directory not found: ${this.bundledTemplatesPath}`);
        return { count: 0, errors };
      }

      const files = fs.readdirSync(this.bundledTemplatesPath);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      for (const file of jsonFiles) {
        const filePath = path.join(this.bundledTemplatesPath, file);
        const result = await this.loadTemplateFromFile(filePath);

        if (result.success && result.template) {
          // Ensure source is set to BUNDLED
          result.template.source = TemplateSource.BUNDLED;
          this.bundledTemplates.set(result.template.id, result.template);
          count++;
        } else {
          errors.push(`Failed to load ${file}: ${result.error}`);
        }
      }
    } catch (error: any) {
      errors.push(`Error loading bundled templates: ${error.message}`);
    }

    return { count, errors };
  }

  /**
   * Load user-created templates from exports directory
   */
  private async loadUserTemplates(): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    try {
      if (!fs.existsSync(this.userTemplatesPath)) {
        // Create directory if it doesn't exist
        fs.mkdirSync(this.userTemplatesPath, { recursive: true });
        return { count: 0, errors };
      }

      const files = fs.readdirSync(this.userTemplatesPath);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      for (const file of jsonFiles) {
        const filePath = path.join(this.userTemplatesPath, file);
        const result = await this.loadTemplateFromFile(filePath);

        if (result.success && result.template) {
          // Ensure source is set to USER
          result.template.source = TemplateSource.USER;
          this.userTemplates.set(result.template.id, result.template);
          count++;
        } else {
          errors.push(`Failed to load ${file}: ${result.error}`);
        }
      }
    } catch (error: any) {
      errors.push(`Error loading user templates: ${error.message}`);
    }

    return { count, errors };
  }

  /**
   * Load a single template from JSON file
   */
  private async loadTemplateFromFile(filePath: string): Promise<LoadTemplateResult> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);

      // Validate template structure
      const validation = validateMarketplaceTemplate(data);
      if (!validation.valid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`
        };
      }

      // Parse dates
      const template: MarketplaceTemplate = {
        ...data,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        // Runtime fields will be set by caller or registry
        isInstalled: false
      };

      return { success: true, template };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to load template: ${error.message}`
      };
    }
  }

  // ============================================
  // Template Access
  // ============================================

  /**
   * Get all templates (bundled + user)
   */
  getAllTemplates(): MarketplaceTemplate[] {
    return [
      ...Array.from(this.bundledTemplates.values()),
      ...Array.from(this.userTemplates.values())
    ];
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): MarketplaceTemplate | undefined {
    return this.bundledTemplates.get(templateId) || this.userTemplates.get(templateId);
  }

  /**
   * Get bundled templates only
   */
  getBundledTemplates(): MarketplaceTemplate[] {
    return Array.from(this.bundledTemplates.values());
  }

  /**
   * Get user templates only
   */
  getUserTemplates(): MarketplaceTemplate[] {
    return Array.from(this.userTemplates.values());
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: TemplateCategory): MarketplaceTemplate[] {
    return this.getAllTemplates().filter(t => t.category === category);
  }

  /**
   * Search templates by name, description, or tags
   */
  searchTemplates(query: string): MarketplaceTemplate[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllTemplates().filter(t =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  // ============================================
  // Template Creation & Export
  // ============================================

  /**
   * Create a new template from knowledge items
   * This creates the template in memory and returns it for saving
   */
  createTemplate(
    name: string,
    description: string,
    category: TemplateCategory,
    tags: string[],
    items: KnowledgeItem[],
    author: { name: string; email?: string; url?: string },
    license: string = 'MIT'
  ): MarketplaceTemplate {
    const now = new Date().toISOString();
    const templateId = generateTemplateId(name, TemplateSource.USER);

    const template: MarketplaceTemplate = {
      id: templateId,
      name,
      description,
      version: '1.0.0',
      createdAt: now,
      updatedAt: now,
      category,
      tags,
      author,
      license,
      source: TemplateSource.USER,
      items,
      itemCount: items.length,
      isInstalled: false
    };

    return template;
  }

  /**
   * Export a template to JSON file in user templates directory
   */
  async exportTemplate(template: MarketplaceTemplate): Promise<ExportTemplateResult> {
    try {
      // Ensure user templates directory exists
      if (!fs.existsSync(this.userTemplatesPath)) {
        fs.mkdirSync(this.userTemplatesPath, { recursive: true });
      }

      // Generate filename from template name
      const filename = `${template.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
      const filePath = path.join(this.userTemplatesPath, filename);

      // Prepare template for export (remove runtime fields)
      const exportData = {
        ...template,
        isInstalled: undefined,
        installedAt: undefined,
        installedItemIds: undefined
      };

      // Write to file
      fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf-8');

      // Add to user templates map
      this.userTemplates.set(template.id, template);

      return {
        success: true,
        filePath
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to export template: ${error.message}`
      };
    }
  }

  /**
   * Import a template from a file path
   */
  async importTemplate(filePath: string): Promise<LoadTemplateResult> {
    const result = await this.loadTemplateFromFile(filePath);

    if (result.success && result.template) {
      // Set source to USER for imported templates
      result.template.source = TemplateSource.USER;

      // Add to user templates
      this.userTemplates.set(result.template.id, result.template);
    }

    return result;
  }

  /**
   * Delete a user template
   */
  async deleteTemplate(templateId: string): Promise<{ success: boolean; error?: string }> {
    const template = this.userTemplates.get(templateId);

    if (!template) {
      return {
        success: false,
        error: 'Template not found or is a bundled template (cannot delete bundled templates)'
      };
    }

    try {
      // Find and delete the file
      const filename = `${template.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
      const filePath = path.join(this.userTemplatesPath, filename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Remove from map
      this.userTemplates.delete(templateId);

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to delete template: ${error.message}`
      };
    }
  }

  // ============================================
  // Installation Status (coordinated with Registry)
  // ============================================

  /**
   * Update installation status for templates
   * Called by TemplateRegistry after installation changes
   */
  updateInstallationStatus(installed: InstalledTemplate[]): void {
    const installedMap = new Map(installed.map(t => [t.templateId, t]));

    // Update bundled templates
    for (const template of this.bundledTemplates.values()) {
      const installation = installedMap.get(template.id);
      template.isInstalled = !!installation;
      template.installedAt = installation?.installedAt;
      template.installedItemIds = installation?.installedItemIds;
    }

    // Update user templates
    for (const template of this.userTemplates.values()) {
      const installation = installedMap.get(template.id);
      template.isInstalled = !!installation;
      template.installedAt = installation?.installedAt;
      template.installedItemIds = installation?.installedItemIds;
    }
  }

  /**
   * Get installation status for a template
   */
  getInstallationStatus(templateId: string): InstallationStatus {
    const template = this.getTemplate(templateId);

    if (!template) {
      return {
        templateId,
        isInstalled: false
      };
    }

    return {
      templateId,
      isInstalled: template.isInstalled || false,
      installedAt: template.installedAt,
      installedItemIds: template.installedItemIds
    };
  }

  // ============================================
  // Statistics
  // ============================================

  /**
   * Get marketplace statistics
   */
  getStats(): {
    totalTemplates: number;
    bundledCount: number;
    userCount: number;
    installedCount: number;
    categoryCounts: Map<TemplateCategory, number>;
  } {
    const allTemplates = this.getAllTemplates();
    const categoryCounts = new Map<TemplateCategory, number>();

    for (const template of allTemplates) {
      categoryCounts.set(
        template.category,
        (categoryCounts.get(template.category) || 0) + 1
      );
    }

    return {
      totalTemplates: allTemplates.length,
      bundledCount: this.bundledTemplates.size,
      userCount: this.userTemplates.size,
      installedCount: allTemplates.filter(t => t.isInstalled).length,
      categoryCounts
    };
  }

  /**
   * Get debug information
   */
  getDebugInfo(): any {
    return {
      bundledTemplatesPath: this.bundledTemplatesPath,
      userTemplatesPath: this.userTemplatesPath,
      bundledTemplates: this.bundledTemplates.size,
      userTemplates: this.userTemplates.size,
      stats: this.getStats()
    };
  }
}
