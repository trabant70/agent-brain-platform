/**
 * MarketplaceTemplateManager - Marketplace Template Management
 *
 * Handles:
 * - Loading bundled templates (shipped with extension)
 * - Managing user-published templates in .agent-brain/marketplace/templates/
 * - Version control and change detection
 * - Installation status tracking (coordinates with TemplateRegistry)
 * - Template import/export for marketplace
 *
 * Scope: MARKETPLACE ONLY (not project-local templates)
 * Project-local templates are managed by ProjectTemplateManager.
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
} from '../types';
import { createDefaultOrchestrator } from '../validation';

export interface LoadTemplateResult {
  success: boolean;
  template?: MarketplaceTemplate;
  error?: string;
  errors?: string[];  // Detailed error messages for validation failures
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

export interface PublishResult {
  success: boolean;
  templateId: string;
  version: string;
  isNewVersion: boolean;
  changesSummary?: string;
  error?: string;
}

export interface ChangesSummary {
  itemsAdded: number;
  itemsRemoved: number;
  itemsModified: number;
  changes: string[];
}

/**
 * MarketplaceTemplateManager - Manages marketplace templates
 *
 * Responsibilities:
 * - Load bundled templates from disk
 * - Load user-published templates from .agent-brain/marketplace/templates/
 * - Validate template structure
 * - Export templates to JSON files
 * - Version control and change detection
 * - Installation status tracking
 * - Provide template metadata for UI
 */
export class MarketplaceTemplateManager {
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
      // Clear existing bundled templates to ensure fresh load
      this.bundledTemplates.clear();

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
      // Clear existing user templates to ensure fresh load
      this.userTemplates.clear();

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

      // NEW: Comprehensive security validation (2024-2025 attack vectors)
      const orchestrator = createDefaultOrchestrator();
      const validationResult = orchestrator.validate(data);

      if (!validationResult.isValid) {
        // Format detailed error messages
        const errorMessages = validationResult.errors.map((err: any) => {
          const suggestion = err.suggestion ? ` (${err.suggestion})` : '';
          return `[${err.code}] ${err.message}${suggestion}`;
        });

        const warningMessages = validationResult.warnings.length > 0
          ? `\n\nWarnings:\n${validationResult.warnings.map((w: any) => `- ${w.message}`).join('\n')}`
          : '';

        return {
          success: false,
          error: `Security validation failed:\n${errorMessages.join('\n')}${warningMessages}`,
          errors: errorMessages
        };
      }

      // Use sanitized data (XSS-safe, normalized)
      const sanitizedData = validationResult.sanitizedData!;

      // Log validation metrics
      const { metadata } = validationResult;
      if (metadata.threatsDetected.xss > 0 ||
          metadata.threatsDetected.promptInjection > 0 ||
          metadata.threatsDetected.unicode > 0) {
        console.warn(`Template validation detected and sanitized threats:`, metadata.threatsDetected);
      }

      // Parse dates
      const template: MarketplaceTemplate = {
        ...sanitizedData,
        createdAt: sanitizedData.createdAt,
        updatedAt: sanitizedData.updatedAt,
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
   * Add a user template to the in-memory store
   * Used for loading migrated templates or programmatically adding templates
   */
  addUserTemplate(template: MarketplaceTemplate): void {
    // Ensure source is USER
    template.source = TemplateSource.USER;
    this.userTemplates.set(template.id, template);
  }

  /**
   * Remove a user template from memory
   */
  removeUserTemplate(templateId: string): boolean {
    return this.userTemplates.delete(templateId);
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
   * Save template to marketplace storage
   * Internal method for persisting templates to marketplace/templates/
   * Uses template ID for filename to prevent duplicates when names change
   * @private
   */
  private async saveTemplateToStorage(template: MarketplaceTemplate): Promise<ExportTemplateResult> {
    try {
      // Use default user templates directory
      if (!fs.existsSync(this.userTemplatesPath)) {
        fs.mkdirSync(this.userTemplatesPath, { recursive: true });
      }

      // Generate filename from template ID (not name)
      // This ensures 1:1 mapping between template and file
      const filename = `${template.id}.json`;
      const filePath = path.join(this.userTemplatesPath, filename);

      // Prepare template for storage (remove runtime fields)
      const exportData = {
        ...template,
        isInstalled: undefined,
        installedAt: undefined,
        installedItemIds: undefined
      };

      // Write to file (overwrites if exists, which is correct for updates)
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
        error: `Failed to save template: ${error.message}`
      };
    }
  }

  /**
   * Export a template to JSON file
   * User-facing method for exporting templates to external locations
   * @param template - The template to export
   * @param customPath - Optional custom file path. If not provided, saves to user templates directory
   */
  async exportTemplate(template: MarketplaceTemplate, customPath?: string): Promise<ExportTemplateResult> {
    try {
      // If no custom path provided, use internal save method
      if (!customPath) {
        return await this.saveTemplateToStorage(template);
      }

      // Use custom path provided (e.g., from save dialog)
      const filePath = customPath;

      // Ensure parent directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Prepare template for export (remove runtime fields)
      const exportData = {
        ...template,
        isInstalled: undefined,
        installedAt: undefined,
        installedItemIds: undefined
      };

      // Write to file
      fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf-8');

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
      // Delete file using template ID
      const filename = `${templateId}.json`;
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

  /**
   * Check if a template is installed
   */
  isInstalled(templateId: string): boolean {
    const template = this.getTemplate(templateId);
    return template?.isInstalled || false;
  }

  /**
   * Mark a template as installed
   * Called by TemplateRegistry or installation orchestrator
   */
  markAsInstalled(templateId: string, itemIds: string[]): void {
    const template = this.getTemplate(templateId);
    if (template) {
      template.isInstalled = true;
      template.installedAt = new Date().toISOString();
      template.installedItemIds = itemIds;
    }
  }

  /**
   * Mark a template as uninstalled
   * Called when template is removed from project
   */
  markAsUninstalled(templateId: string): void {
    const template = this.getTemplate(templateId);
    if (template) {
      template.isInstalled = false;
      template.installedAt = undefined;
      template.installedItemIds = undefined;
    }
  }

  // ============================================
  // Publishing & Version Control
  // ============================================

  /**
   * Publish a template to marketplace
   * Handles version control if template already exists
   */
  async publishTemplate(template: MarketplaceTemplate): Promise<PublishResult> {
    try {
      // Check if template already exists
      const existingTemplate = this.getTemplate(template.id);
      let isNewVersion = false;
      let changesSummary: string | undefined;

      if (existingTemplate) {
        // Detect changes
        const changes = this.detectChanges(existingTemplate, template);

        // Increment version
        const newVersion = this.incrementVersion(existingTemplate.version);
        template.version = newVersion;
        template.updatedAt = new Date().toISOString();

        isNewVersion = true;
        changesSummary = this.formatChangesSummary(changes);
      } else {
        // New template
        template.version = '1.0.0';
        template.createdAt = new Date().toISOString();
        template.updatedAt = template.createdAt;
      }

      // Set source to USER for published templates
      template.source = TemplateSource.USER;

      // Export to marketplace directory
      const exportResult = await this.exportTemplate(template);

      if (!exportResult.success) {
        return {
          success: false,
          templateId: template.id,
          version: template.version,
          isNewVersion,
          error: exportResult.error
        };
      }

      return {
        success: true,
        templateId: template.id,
        version: template.version,
        isNewVersion,
        changesSummary
      };
    } catch (error: any) {
      return {
        success: false,
        templateId: template.id,
        version: template.version || '1.0.0',
        isNewVersion: false,
        error: `Failed to publish template: ${error.message}`
      };
    }
  }

  /**
   * Detect changes between two template versions
   */
  detectChanges(oldTemplate: MarketplaceTemplate, newTemplate: MarketplaceTemplate): ChangesSummary {
    const changes: string[] = [];

    // Compare items
    const oldItemIds = new Set(oldTemplate.items.map(i => i.id));
    const newItemIds = new Set(newTemplate.items.map(i => i.id));

    const added = newTemplate.items.filter(i => !oldItemIds.has(i.id));
    const removed = oldTemplate.items.filter(i => !newItemIds.has(i.id));

    // Items that exist in both - check for modifications
    const modified: KnowledgeItem[] = [];
    for (const newItem of newTemplate.items) {
      if (oldItemIds.has(newItem.id)) {
        const oldItem = oldTemplate.items.find(i => i.id === newItem.id);
        if (oldItem && this.isItemModified(oldItem, newItem)) {
          modified.push(newItem);
        }
      }
    }

    // Build change descriptions
    if (added.length > 0) {
      changes.push(`Added ${added.length} item(s): ${added.map(i => i.title).join(', ')}`);
    }
    if (removed.length > 0) {
      changes.push(`Removed ${removed.length} item(s): ${removed.map(i => i.title).join(', ')}`);
    }
    if (modified.length > 0) {
      changes.push(`Modified ${modified.length} item(s): ${modified.map(i => i.title).join(', ')}`);
    }

    // Check metadata changes
    if (oldTemplate.name !== newTemplate.name) {
      changes.push(`Name changed: "${oldTemplate.name}" → "${newTemplate.name}"`);
    }
    if (oldTemplate.description !== newTemplate.description) {
      changes.push('Description updated');
    }

    return {
      itemsAdded: added.length,
      itemsRemoved: removed.length,
      itemsModified: modified.length,
      changes
    };
  }

  /**
   * Check if a knowledge item has been modified
   */
  private isItemModified(oldItem: KnowledgeItem, newItem: KnowledgeItem): boolean {
    return (
      oldItem.title !== newItem.title ||
      oldItem.body !== newItem.body ||
      oldItem.type !== newItem.type ||
      JSON.stringify(oldItem.tags) !== JSON.stringify(newItem.tags)
    );
  }

  /**
   * Increment version string (semver-style)
   * Increments patch version by default
   */
  incrementVersion(currentVersion: string): string {
    const parts = currentVersion.split('.').map(Number);
    const major = parts[0] || 1;
    const minor = parts[1] || 0;
    const patch = parts[2] || 0;

    // Increment patch version
    return `${major}.${minor}.${patch + 1}`;
  }

  /**
   * Format changes summary as readable string
   */
  private formatChangesSummary(changes: ChangesSummary): string {
    if (changes.changes.length === 0) {
      return 'No changes detected';
    }
    return changes.changes.join('; ');
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
