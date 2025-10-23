/**
 * ProjectTemplateManager
 *
 * Manages local project templates stored in .agent-brain/templates/
 * Responsible for CRUD operations and usage tracking of project-scoped templates.
 *
 * Scope: Project-local only (does NOT manage marketplace templates)
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  MarketplaceTemplate,
  KnowledgeItem,
  TemplateSource,
  TemplateCategory
} from '../types';

export interface CreateTemplateOptions {
  name: string;
  description?: string;
  category?: TemplateCategory;
  tags?: string[];
  author?: {
    name: string;
    email?: string;
    url?: string;
  };
  license?: string;
  itemIds: string[];
}

export interface DeleteResult {
  success: boolean;
  message?: string;
}

export interface LoadResult {
  count: number;
  errors: string[];
}

/**
 * Manages project-local templates
 */
export class ProjectTemplateManager {
  private templates: Map<string, MarketplaceTemplate> = new Map();
  private templatesPath: string;
  private getKnowledgeItem: (itemId: string) => KnowledgeItem | undefined;

  constructor(
    templatesPath: string,
    getKnowledgeItem: (itemId: string) => KnowledgeItem | undefined
  ) {
    this.templatesPath = templatesPath;
    this.getKnowledgeItem = getKnowledgeItem;
  }

  // ============================================
  // CRUD Operations
  // ============================================

  /**
   * Create a new project template
   */
  async createTemplate(options: CreateTemplateOptions): Promise<MarketplaceTemplate> {
    // Validate that all items exist
    const items: KnowledgeItem[] = [];
    for (const itemId of options.itemIds) {
      const item = this.getKnowledgeItem(itemId);
      if (!item) {
        throw new Error(`Knowledge item not found: ${itemId}`);
      }
      items.push(item);
    }

    // Generate timestamp
    const now = new Date().toISOString();

    // Create template
    const template: MarketplaceTemplate = {
      id: this.generateTemplateId(),
      name: options.name,
      description: options.description || '',
      version: '1.0.0',
      createdAt: now,
      updatedAt: now,
      category: options.category || TemplateCategory.GENERAL,
      tags: options.tags || [],
      author: {
        name: options.author?.name || 'Unknown',
        email: options.author?.email,
        url: options.author?.url
      },
      license: options.license || 'MIT',
      source: TemplateSource.USER,
      items: items,
      itemCount: items.length
    };

    // Save to in-memory cache
    this.templates.set(template.id, template);

    // Save to disk
    await this.saveTemplateToDisk(template);

    return template;
  }

  /**
   * Update an existing template with new items
   */
  async updateTemplate(templateId: string, itemIds: string[]): Promise<MarketplaceTemplate> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Validate that all items exist
    const items: KnowledgeItem[] = [];
    for (const itemId of itemIds) {
      const item = this.getKnowledgeItem(itemId);
      if (!item) {
        throw new Error(`Knowledge item not found: ${itemId}`);
      }
      items.push(item);
    }

    // Increment version
    const versionParts = template.version.split('.');
    const majorVersion = parseInt(versionParts[0] || '1');
    const minorVersion = parseInt(versionParts[1] || '0');
    const patchVersion = parseInt(versionParts[2] || '0');
    const newVersion = `${majorVersion}.${minorVersion}.${patchVersion + 1}`;

    // Update template
    const updatedTemplate: MarketplaceTemplate = {
      ...template,
      items: items,
      itemCount: items.length,
      version: newVersion,
      updatedAt: new Date().toISOString()
    };

    // Update in-memory cache
    this.templates.set(templateId, updatedTemplate);

    // Save to disk
    await this.saveTemplateToDisk(updatedTemplate);

    return updatedTemplate;
  }

  /**
   * Delete a project template
   */
  async deleteTemplate(templateId: string): Promise<DeleteResult> {
    const template = this.templates.get(templateId);
    if (!template) {
      return { success: false, message: 'Template not found' };
    }

    // Delete from disk
    const filename = `${templateId}.json`;
    const filePath = path.join(this.templatesPath, filename);

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error: any) {
      return { success: false, message: `Failed to delete file: ${error.message}` };
    }

    // Remove from in-memory cache
    this.templates.delete(templateId);

    return { success: true };
  }

  /**
   * Get a specific template
   */
  getTemplate(templateId: string): MarketplaceTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Get all project templates
   */
  getAllTemplates(): MarketplaceTemplate[] {
    return Array.from(this.templates.values());
  }

  // ============================================
  // Lifecycle Management
  // ============================================

  /**
   * Load all templates from disk
   */
  async loadTemplatesFromDisk(): Promise<LoadResult> {
    const errors: string[] = [];
    let count = 0;

    try {
      // Clear existing templates
      this.templates.clear();

      // Ensure directory exists
      if (!fs.existsSync(this.templatesPath)) {
        fs.mkdirSync(this.templatesPath, { recursive: true });
        return { count: 0, errors };
      }

      // Read all JSON files
      const files = fs.readdirSync(this.templatesPath);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      for (const file of jsonFiles) {
        const filePath = path.join(this.templatesPath, file);

        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const template = JSON.parse(content) as MarketplaceTemplate;

          // Basic validation
          if (!template.id || !template.name) {
            errors.push(`Invalid template structure in ${file}: missing id or name`);
            continue;
          }

          // Ensure source is USER
          template.source = TemplateSource.USER;

          // Store in memory
          this.templates.set(template.id, template);
          count++;
        } catch (error: any) {
          errors.push(`Failed to load ${file}: ${error.message}`);
        }
      }
    } catch (error: any) {
      errors.push(`Error loading templates: ${error.message}`);
    }

    return { count, errors };
  }

  /**
   * Save a template to disk
   */
  async saveTemplateToDisk(template: MarketplaceTemplate): Promise<void> {
    // Ensure directory exists
    if (!fs.existsSync(this.templatesPath)) {
      fs.mkdirSync(this.templatesPath, { recursive: true });
    }

    const filename = `${template.id}.json`;
    const filePath = path.join(this.templatesPath, filename);
    const json = JSON.stringify(template, null, 2);

    fs.writeFileSync(filePath, json, 'utf8');
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Generate a unique template ID
   */
  private generateTemplateId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `tpl-${timestamp}-${random}`;
  }
}
