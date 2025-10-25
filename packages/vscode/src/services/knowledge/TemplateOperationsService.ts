/**
 * TemplateOperationsService
 *
 * Handles all business logic for template CRUD operations.
 * Responsible for:
 * - Creating templates
 * - Updating templates
 * - Deleting templates
 * - Cloning templates
 * - Moving and copying items between templates
 * - Creating versions
 */

import * as vscode from 'vscode';
import * as path from 'path';
import {
  TemplateStore,
  AuditLogger,
  VersionManager,
  TemplateCloner,
  KnowledgeFileSystem,
  MarketplaceTemplate,
  TemplateCategory,
  TemplateSource,
  KnowledgeScope,
  KnowledgeType,
  KnowledgeItem
} from '@agent-brain/core/domains/knowledge';
import { logger, LogCategory, LogPathway } from '@agent-brain/core/infrastructure/logging/Logger';

export class TemplateOperationsService {
  private knowledgeBaseDir: string;

  constructor(
    private workspaceRoot: string,
    private templateStore: TemplateStore,
    private auditLogger: AuditLogger,
    private versionManager: VersionManager,
    private templateCloner: TemplateCloner,
    private fileSystem: KnowledgeFileSystem
  ) {
    this.knowledgeBaseDir = path.join(workspaceRoot, '.agent-brain');
  }

  /**
   * Create a new V1 template
   */
  async createTemplate(options: {
    name: string;
    description: string;
    category: TemplateCategory;
    tags: string[];
    scope?: KnowledgeScope;
  }): Promise<MarketplaceTemplate> {
    const template = this.templateStore.addTemplate({
      name: options.name,
      description: options.description,
      category: options.category,
      tags: options.tags,
      author: {
        name: 'User',
        email: 'user@local'
      },
      license: 'MIT',
      source: TemplateSource.USER,
      scope: options.scope
    });

    logger.info(
      LogCategory.EXTENSION,
      'Created template',
      'TemplateOperationsService.createTemplate',
      { templateId: template.id, name: template.name },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    return template;
  }

  /**
   * Update template metadata
   */
  async updateTemplate(templateId: string, updates: {
    name?: string;
    description?: string;
    category?: string;
    tags?: string[];
    scope?: string;
  }): Promise<void> {
    const success = this.templateStore.updateTemplate(templateId, updates, 'user');
    if (!success) {
      throw new Error(`Failed to update template ${templateId}`);
    }

    logger.info(
      LogCategory.EXTENSION,
      'Updated template',
      'TemplateOperationsService.updateTemplate',
      { templateId, updates },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    logger.info(
      LogCategory.EXTENSION,
      'Deleting template',
      'TemplateOperationsService.deleteTemplate',
      { templateId },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Get template before deleting (to calculate file path)
    const template = this.templateStore.getTemplate(templateId);
    if (!template) {
      logger.error(
        LogCategory.EXTENSION,
        'Template not found in templateStore',
        'TemplateOperationsService.deleteTemplate',
        { templateId },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      throw new Error(`Template ${templateId} not found`);
    }

    logger.info(
      LogCategory.EXTENSION,
      'Template found in store',
      'TemplateOperationsService.deleteTemplate',
      { templateId, templateName: template.name, templateSource: template.source },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Cannot delete bundled templates
    if (template.source === TemplateSource.BUNDLED) {
      throw new Error('Cannot delete bundled templates. Bundled templates are part of the extension.');
    }

    // Calculate file path
    const templatesDir = path.join(this.knowledgeBaseDir, 'templates');
    const filePath = this.fileSystem.getTemplateFilePath(template, templatesDir);

    logger.info(
      LogCategory.EXTENSION,
      'Deleting template from store',
      'TemplateOperationsService.deleteTemplate',
      { templateId, filePath },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Delete from store
    const success = this.templateStore.deleteTemplate(templateId, 'user');
    if (!success) {
      logger.error(
        LogCategory.EXTENSION,
        'deleteTemplate returned false',
        'TemplateOperationsService.deleteTemplate',
        { templateId },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      throw new Error(`Failed to delete template ${templateId} from store`);
    }

    logger.info(
      LogCategory.EXTENSION,
      'Template deleted from store, deleting file',
      'TemplateOperationsService.deleteTemplate',
      { templateId, filePath },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Delete file from disk
    try {
      await vscode.workspace.fs.delete(vscode.Uri.file(filePath));
      logger.debug(
        LogCategory.EXTENSION,
        'Deleted template file',
        'TemplateOperationsService.deleteTemplate',
        { filePath },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    } catch (error) {
      logger.warn(
        LogCategory.EXTENSION,
        'Failed to delete template file (may not exist)',
        'TemplateOperationsService.deleteTemplate',
        { filePath, error },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      // Continue even if file deletion fails - it may have already been deleted
    }

    logger.info(
      LogCategory.EXTENSION,
      'Deleted template',
      'TemplateOperationsService.deleteTemplate',
      { templateId, filePath },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Add item to template
   */
  async addItemToTemplate(templateId: string, options: {
    title: string;
    body: string;
    type: KnowledgeType;
    scope: KnowledgeScope;
    tags: string[];
  }): Promise<KnowledgeItem> {
    const template = this.templateStore.getTemplate(templateId);
    if (template?.source === TemplateSource.BUNDLED) {
      throw new Error(`Cannot add items to bundled template "${template.name}" - bundled templates are read-only. Clone the template first to make changes.`);
    }

    const item = this.templateStore.addItemToTemplate(
      templateId,
      {
        title: options.title,
        body: options.body,
        type: options.type,
        scope: options.scope,
        tags: options.tags
      },
      'user'
    );

    if (!item) {
      throw new Error(`Failed to add item to template ${templateId}`);
    }

    logger.info(
      LogCategory.EXTENSION,
      'Added item to template',
      'TemplateOperationsService.addItemToTemplate',
      { templateId, itemId: item.id, title: item.title },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    return item;
  }

  /**
   * Update item in template
   */
  async updateItem(templateId: string, itemId: string, updates: {
    title?: string;
    body?: string;
    type?: KnowledgeType;
    scope?: KnowledgeScope;
    tags?: string[];
  }): Promise<void> {
    const template = this.templateStore.getTemplate(templateId);
    if (template?.source === TemplateSource.BUNDLED) {
      throw new Error(`Cannot update items in bundled template "${template.name}" - bundled templates are read-only. Clone the template first to make changes.`);
    }

    const success = this.templateStore.updateItem(templateId, itemId, updates, 'user');

    if (!success) {
      throw new Error(`Failed to update item ${itemId} in template ${templateId} - item or template not found`);
    }

    logger.info(
      LogCategory.EXTENSION,
      'Updated item',
      'TemplateOperationsService.updateItem',
      { templateId, itemId },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Delete item from template
   */
  async deleteItem(templateId: string, itemId: string): Promise<void> {
    logger.info(
      LogCategory.EXTENSION,
      'Deleting item',
      'TemplateOperationsService.deleteItem',
      { templateId, itemId },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    const template = this.templateStore.getTemplate(templateId);
    if (!template) {
      logger.error(
        LogCategory.EXTENSION,
        'Template not found in templateStore',
        'TemplateOperationsService.deleteItem',
        { templateId, itemId },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      throw new Error(`Template ${templateId} not found`);
    }

    if (template?.source === TemplateSource.BUNDLED) {
      throw new Error(`Cannot delete items from bundled template "${template.name}" - bundled templates are read-only. Clone the template first to make changes.`);
    }

    logger.info(
      LogCategory.EXTENSION,
      'Calling removeItemFromTemplate',
      'TemplateOperationsService.deleteItem',
      { templateId, itemId, templateItemCount: template.items.length },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    const success = this.templateStore.removeItemFromTemplate(templateId, itemId, 'user');

    if (!success) {
      logger.error(
        LogCategory.EXTENSION,
        'removeItemFromTemplate returned false',
        'TemplateOperationsService.deleteItem',
        { templateId, itemId },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      throw new Error(`Failed to delete item ${itemId} from template ${templateId} - item or template not found`);
    }

    logger.info(
      LogCategory.EXTENSION,
      'Deleted item',
      'TemplateOperationsService.deleteItem',
      { templateId, itemId },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Clone a template
   */
  async cloneTemplate(templateId: string, options: {
    newName?: string;
    shallow?: boolean;
  }): Promise<MarketplaceTemplate> {
    const sourceTemplate = this.templateStore.getTemplate(templateId);
    if (!sourceTemplate) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const isShallow = options.shallow ?? false;

    const cloneResult = this.templateCloner.cloneTemplate(
      sourceTemplate,
      {
        newName: options.newName,
        includeAuditLog: !isShallow, // Deep clone includes audit log
        includeVersionHistory: !isShallow, // Deep clone includes version history
        actor: 'user'
      }
    );

    if (!cloneResult.success || !cloneResult.clonedTemplate) {
      throw new Error(`Clone failed: ${cloneResult.error}`);
    }

    // Add cloned template to store
    this.templateStore.loadTemplates([cloneResult.clonedTemplate]);

    logger.info(
      LogCategory.EXTENSION,
      'Cloned template',
      'TemplateOperationsService.cloneTemplate',
      { sourceId: templateId, cloneId: cloneResult.clonedTemplate.id },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    return cloneResult.clonedTemplate;
  }

  /**
   * Create version checkpoint for template
   */
  async createVersion(templateId: string, options: {
    versionNumber: string;
    description: string;
  }): Promise<void> {
    const template = this.templateStore.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    this.versionManager.createVersion(
      template,
      {
        versionNumber: options.versionNumber,
        description: options.description,
        createdBy: 'user'
      },
      this.auditLogger
    );

    // Update template in store
    this.templateStore.updateTemplate(templateId, { versionHistory: template.versionHistory }, this.auditLogger);

    logger.info(
      LogCategory.EXTENSION,
      'Created version checkpoint',
      'TemplateOperationsService.createVersion',
      { templateId, versionNumber: options.versionNumber },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Move item from one template to another
   */
  async moveItem(itemId: string, fromTemplateId: string, toTemplateId: string): Promise<void> {
    const result = this.templateStore.moveItem(itemId, fromTemplateId, toTemplateId, 'user');
    if (!result.success) {
      throw new Error(result.error || 'Failed to move item');
    }

    logger.info(
      LogCategory.EXTENSION,
      'Moved item',
      'TemplateOperationsService.moveItem',
      { itemId, fromTemplateId, toTemplateId },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Copy item from one template to another
   */
  async copyItem(itemId: string, fromTemplateId: string, toTemplateId: string): Promise<string> {
    const result = this.templateStore.copyItem(itemId, toTemplateId, 'user');
    if (!result.success) {
      throw new Error(result.error || 'Failed to copy item');
    }

    logger.info(
      LogCategory.EXTENSION,
      'Copied item',
      'TemplateOperationsService.copyItem',
      { itemId, fromTemplateId, toTemplateId, newItemId: result.newItemId },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    return result.newItemId!;
  }

  /**
   * Reorder item within a template
   */
  async reorderItem(templateId: string, itemId: string, newIndex: number): Promise<void> {
    const success = this.templateStore.reorderItem(templateId, itemId, newIndex, 'user');
    if (!success) {
      throw new Error('Failed to reorder item - item or template not found, or template is read-only');
    }

    logger.info(
      LogCategory.EXTENSION,
      'Reordered item',
      'TemplateOperationsService.reorderItem',
      { templateId, itemId, newIndex },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Get audit log for template
   */
  async getAuditLog(templateId: string): Promise<any[]> {
    const template = this.templateStore.getTemplate(templateId);
    if (!template) {
      return [];
    }
    return template.auditLog || [];
  }

  /**
   * Import template from JSON
   */
  async importTemplate(templateJson: any): Promise<MarketplaceTemplate> {
    // Validate template structure
    if (!templateJson.id || !templateJson.name) {
      throw new Error('Invalid template: missing id or name');
    }

    // Load the template into store
    this.templateStore.loadTemplates([templateJson]);

    logger.info(
      LogCategory.EXTENSION,
      'Imported template',
      'TemplateOperationsService.importTemplate',
      { templateId: templateJson.id, name: templateJson.name },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    return templateJson;
  }

  /**
   * Export template to JSON
   */
  async exportTemplate(templateId: string): Promise<{ template: MarketplaceTemplate; filePath: string }> {
    const template = this.templateStore.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `template-${template.name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.json`;

    // Prompt user for save location
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(path.join(this.workspaceRoot, filename)),
      filters: { 'JSON': ['json'] }
    });

    if (!uri) {
      throw new Error('Export cancelled by user');
    }

    const filePath = uri.fsPath;

    // Write template to file
    const fs = require('fs');
    fs.writeFileSync(filePath, JSON.stringify(template, null, 2), 'utf-8');

    logger.info(
      LogCategory.EXTENSION,
      'Exported template',
      'TemplateOperationsService.exportTemplate',
      { templateId, filePath },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    return { template, filePath };
  }
}
