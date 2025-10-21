/**
 * KnowledgeManager - VSCode Service Layer for Knowledge Management
 *
 * Integrates the knowledge domain with VSCode file system and workspace.
 * Manages file watching, loading, and coordination between extension and domain layer.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import {
  KnowledgeStore,
  KnowledgeFileSystem,
  TemplateEngine,
  KnowledgeItem,
  Template,
  KnowledgeStats,
  ClaudeMdFile,
  CreateKnowledgeItemOptions,
  CreateTemplateOptions,
  KnowledgeType,
  KnowledgeScope,
  ImportOptions,
  ImportResult
} from '@agent-brain/core/domains/knowledge';
import { KnowledgeEventStorage } from '@agent-brain/core/domains/events';
import { logger, LogCategory, LogPathway } from '@agent-brain/core/infrastructure/logging/Logger';

export class KnowledgeManager {
  private store: KnowledgeStore;
  private fileSystem: KnowledgeFileSystem;
  private templateEngine: TemplateEngine;
  private eventStorage: KnowledgeEventStorage;
  private watchers: vscode.FileSystemWatcher[] = [];
  private initialized: boolean = false;
  private knowledgeBaseDir: string;

  constructor(
    private workspaceRoot: string,
    private extensionContext: vscode.ExtensionContext
  ) {
    this.knowledgeBaseDir = path.join(workspaceRoot, '.agent-brain');
    this.store = new KnowledgeStore();
    this.fileSystem = new KnowledgeFileSystem(workspaceRoot);
    this.templateEngine = new TemplateEngine(this.store);
    this.eventStorage = new KnowledgeEventStorage(workspaceRoot);
  }

  /**
   * Initialize the knowledge manager
   * Loads all knowledge items from .agent-brain directory
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.debug(
        LogCategory.EXTENSION,
        'KnowledgeManager already initialized, skipping',
        'KnowledgeManager.initialize',
        {},
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      return;
    }

    logger.info(
      LogCategory.EXTENSION,
      'Initializing KnowledgeManager',
      'KnowledgeManager.initialize',
      { workspaceRoot: this.workspaceRoot, knowledgeBaseDir: this.knowledgeBaseDir },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      // Ensure .agent-brain directory exists
      await this.ensureKnowledgeDirectory();
      logger.debug(
        LogCategory.EXTENSION,
        'Knowledge directory verified',
        'KnowledgeManager.initialize',
        { knowledgeBaseDir: this.knowledgeBaseDir },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      // Load all knowledge items
      await this.refreshAll();

      // Setup file watchers
      this.setupFileWatchers();
      logger.debug(
        LogCategory.EXTENSION,
        'File watchers setup complete',
        'KnowledgeManager.initialize',
        {},
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      this.initialized = true;
      logger.info(
        LogCategory.EXTENSION,
        'KnowledgeManager initialization complete',
        'KnowledgeManager.initialize',
        {},
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to initialize KnowledgeManager',
        'KnowledgeManager.initialize',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      throw error;
    }
  }

  /**
   * Refresh all knowledge items from disk
   */
  async refreshAll(): Promise<void> {
    logger.info(
      LogCategory.EXTENSION,
      'Starting knowledge refresh',
      'KnowledgeManager.refreshAll',
      { knowledgeBaseDir: this.knowledgeBaseDir },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      // Clear existing items
      const itemsBeforeClear = this.store.getAllItems().length;
      this.store.clear();
      logger.debug(
        LogCategory.EXTENSION,
        'Store cleared',
        'KnowledgeManager.refreshAll',
        { itemsCleared: itemsBeforeClear },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      // Find all markdown files in .agent-brain
      const pattern = new vscode.RelativePattern(
        this.workspaceRoot,
        '.agent-brain/**/*.md'
      );
      const files = await vscode.workspace.findFiles(pattern);

      logger.info(
        LogCategory.EXTENSION,
        'Found markdown files',
        'KnowledgeManager.refreshAll',
        { fileCount: files.length, files: files.map(f => f.fsPath) },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      // Load each file
      let successCount = 0;
      let errorCount = 0;

      for (const uri of files) {
        try {
          await this.loadFile(uri);
          successCount++;
        } catch (error) {
          errorCount++;
          logger.error(
            LogCategory.EXTENSION,
            'Failed to load file',
            'KnowledgeManager.refreshAll',
            { filePath: uri.fsPath, error },
            LogPathway.KNOWLEDGE_MANAGEMENT
          );
          // Continue loading other files
        }
      }

      const finalCount = this.store.getAllItems().length;
      logger.info(
        LogCategory.EXTENSION,
        'Knowledge items refresh complete',
        'KnowledgeManager.refreshAll',
        {
          filesFound: files.length,
          filesLoaded: successCount,
          filesFailed: errorCount,
          itemsInStore: finalCount
        },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      // Load templates from disk
      await this.loadTemplatesFromDisk();

      logger.info(
        LogCategory.EXTENSION,
        'Knowledge refresh complete (items + templates)',
        'KnowledgeManager.refreshAll',
        {
          itemsInStore: this.store.getAllItems().length,
          templatesInStore: this.store.getAllTemplates().length
        },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to refresh knowledge items',
        'KnowledgeManager.refreshAll',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      throw error;
    }
  }

  /**
   * Create a new knowledge item
   */
  async createItem(options: CreateKnowledgeItemOptions): Promise<KnowledgeItem> {
    logger.info(
      LogCategory.EXTENSION,
      'Creating knowledge item',
      'KnowledgeManager.createItem',
      { title: options.title, type: options.type, scope: options.scope },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      // Generate file path based on type
      const filename = this.generateFilename(options.title);
      const typeDir = this.getDirectoryForType(options.type);
      const filePath = path.join(this.knowledgeBaseDir, typeDir, filename);

      // Create the knowledge item
      // Handle empty body gracefully
      const finalBody = options.body && options.body.trim().length > 0
        ? options.body.trim()
        : '_No description provided._';

      const item: KnowledgeItem = {
        id: this.fileSystem.generateId(filePath),
        type: options.type,
        scope: options.scope,
        title: options.title,
        body: finalBody,
        source: options.source,
        tags: options.tags || [],
        path: filePath,
        relativePath: this.fileSystem.getRelativePath(filePath),
        valid: true,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          author: options.author
        }
      };

      // Convert to markdown with frontmatter
      const markdown = this.fileSystem.toMarkdownWithFrontmatter(item);

      // Ensure directory exists
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(path.dirname(filePath)));

      // Write file
      await vscode.workspace.fs.writeFile(
        vscode.Uri.file(filePath),
        Buffer.from(markdown, 'utf8')
      );

      logger.debug(
        LogCategory.EXTENSION,
        'Knowledge item file written',
        'KnowledgeManager.createItem',
        { filePath, itemId: item.id },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      // Add to store immediately
      this.store.addItem(item);

      // Record knowledge event
      await this.eventStorage.recordEvent({
        type: 'create',
        knowledgeItemId: item.id,
        knowledgeItemTitle: item.title,
        knowledgeItemType: item.type,
        targetFile: item.relativePath,
        actor: 'agent' // Coding agent created this item
      });

      logger.info(
        LogCategory.EXTENSION,
        'Knowledge item created',
        'KnowledgeManager.createItem',
        { itemId: item.id, filePath },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      return item;
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to create knowledge item',
        'KnowledgeManager.createItem',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      throw error;
    }
  }

  /**
   * Update an existing knowledge item
   */
  async updateItem(id: string, updates: Partial<KnowledgeItem>): Promise<void> {
    logger.info(
      LogCategory.EXTENSION,
      'Updating knowledge item',
      'KnowledgeManager.updateItem',
      { itemId: id, updates },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      const existing = this.store.getItem(id);
      if (!existing) {
        throw new Error(`Knowledge item not found: ${id}`);
      }

      // Update in store
      this.store.updateItem(id, updates);

      // Get updated item
      const updated = this.store.getItem(id)!;

      // Convert to markdown
      const markdown = this.fileSystem.toMarkdownWithFrontmatter(updated);

      // Write to file
      await vscode.workspace.fs.writeFile(
        vscode.Uri.file(updated.path),
        Buffer.from(markdown, 'utf8')
      );

      logger.info(
        LogCategory.EXTENSION,
        'Knowledge item updated',
        'KnowledgeManager.updateItem',
        { itemId: id, path: updated.path },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to update knowledge item',
        'KnowledgeManager.updateItem',
        { itemId: id, error },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      throw error;
    }
  }

  /**
   * Delete a knowledge item
   */
  async deleteItem(id: string): Promise<void> {
    logger.info(
      LogCategory.EXTENSION,
      'Deleting knowledge item',
      'KnowledgeManager.deleteItem',
      { itemId: id },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      const item = this.store.getItem(id);
      if (!item) {
        logger.debug(
          LogCategory.EXTENSION,
          'Knowledge item not found, already deleted',
          'KnowledgeManager.deleteItem',
          { itemId: id },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        return;  // Already deleted
      }

      // Delete file
      await vscode.workspace.fs.delete(vscode.Uri.file(item.path));

      // Remove from store
      this.store.deleteItem(id);

      // Record knowledge event
      await this.eventStorage.recordEvent({
        type: 'remove',
        knowledgeItemId: item.id,
        knowledgeItemTitle: item.title,
        knowledgeItemType: item.type,
        targetFile: item.relativePath,
        actor: 'user' // User initiated deletion
      });

      logger.info(
        LogCategory.EXTENSION,
        'Knowledge item deleted and event recorded',
        'KnowledgeManager.deleteItem',
        { itemId: id, path: item.path },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to delete knowledge item',
        'KnowledgeManager.deleteItem',
        { itemId: id, error },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      throw error;
    }
  }

  /**
   * Create a template from selected items
   */
  async createTemplate(options: CreateTemplateOptions): Promise<Template> {
    logger.info(
      LogCategory.EXTENSION,
      'Creating template',
      'KnowledgeManager.createTemplate',
      { name: options.name, itemCount: options.itemIds.length },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      // Validate that all items exist
      for (const itemId of options.itemIds) {
        if (!this.store.hasItem(itemId)) {
          throw new Error(`Knowledge item not found: ${itemId}`);
        }
      }

      // Create template
      const template: Template = {
        id: this.generateTemplateId(),
        name: options.name,
        description: options.description || '',
        version: 1,
        itemIds: options.itemIds,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          author: options.author,
          usageCount: 0
        }
      };

      // Add to store
      this.store.addTemplate(template);

      // Save template to file
      await this.saveTemplateToFile(template);

      logger.info(
        LogCategory.EXTENSION,
        'Template created',
        'KnowledgeManager.createTemplate',
        { templateId: template.id, name: template.name },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      return template;
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to create template',
        'KnowledgeManager.createTemplate',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      throw error;
    }
  }

  /**
   * Apply a template to a claude.md file
   */
  /**
   * Update an existing template with new item IDs
   */
  async updateTemplate(templateId: string, itemIds: string[]): Promise<Template> {
    logger.info(
      LogCategory.EXTENSION,
      'Updating template',
      'KnowledgeManager.updateTemplate',
      { templateId, itemCount: itemIds.length },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      const template = this.store.getTemplate(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      // Validate that all items exist
      for (const itemId of itemIds) {
        if (!this.store.hasItem(itemId)) {
          throw new Error(`Knowledge item not found: ${itemId}`);
        }
      }

      // Update template
      const updatedTemplate: Template = {
        ...template,
        itemIds: itemIds,
        version: template.version + 1,
        metadata: {
          ...template.metadata,
          updatedAt: new Date()
        }
      };

      // Update in store
      this.store.updateTemplate(templateId, updatedTemplate);

      // Save template to file
      await this.saveTemplateToFile(updatedTemplate);

      logger.info(
        LogCategory.EXTENSION,
        'Template updated',
        'KnowledgeManager.updateTemplate',
        { templateId, name: updatedTemplate.name, newItemCount: itemIds.length },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      return updatedTemplate;
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to update template',
        'KnowledgeManager.updateTemplate',
        { templateId, error },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      throw error;
    }
  }

  /**
   * Apply a template to a claude.md file
   */
  async applyTemplate(
    templateId: string,
    claudeMdPath: string,
    replaceExisting: boolean = false
  ): Promise<{ wasReplaced?: boolean }> {
    try {
      const template = this.store.getTemplate(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      // Read claude.md file
      const uri = vscode.Uri.file(claudeMdPath);
      const content = await vscode.workspace.fs.readFile(uri);
      const currentContent = Buffer.from(content).toString('utf8');

      // Apply template (with replaceExisting flag for idempotent operation)
      const result = this.templateEngine.injectTemplate(currentContent, template, replaceExisting);

      if (!result.success) {
        throw new Error(result.error || 'Failed to apply template');
      }

      // Write updated content
      await vscode.workspace.fs.writeFile(
        uri,
        Buffer.from(result.content!, 'utf8')
      );

      // Update usage count
      this.store.updateTemplate(templateId, {
        metadata: {
          ...template.metadata,
          usageCount: (template.metadata.usageCount || 0) + 1
        }
      });

      // Record knowledge events for each applied item in the template
      logger.debug(
        LogCategory.EXTENSION,
        'Recording apply events for template items',
        'KnowledgeManager.applyTemplate',
        { templateId: template.id, itemIdsCount: template.itemIds?.length || 0, hasItemIds: !!template.itemIds },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      if (template && template.itemIds) {
        for (const itemId of template.itemIds) {
          const item = this.store.getItem(itemId);
          if (item) {
            logger.debug(
              LogCategory.EXTENSION,
              'Recording apply event for item',
              'KnowledgeManager.applyTemplate',
              { itemId: item.id, itemTitle: item.title },
              LogPathway.KNOWLEDGE_MANAGEMENT
            );
            await this.eventStorage.recordEvent({
              type: 'apply',
              knowledgeItemId: item.id,
              knowledgeItemTitle: item.title,
              knowledgeItemType: item.type,
              targetFile: 'CLAUDE.md',
              actor: 'user' // User initiated this action
            });
          } else {
            logger.warn(
              LogCategory.EXTENSION,
              'Item not found in store when recording apply event',
              'KnowledgeManager.applyTemplate',
              { itemId },
              LogPathway.KNOWLEDGE_MANAGEMENT
            );
          }
        }
      } else {
        logger.warn(
          LogCategory.EXTENSION,
          'No itemIds found on template, skipping event recording',
          'KnowledgeManager.applyTemplate',
          { templateId: template?.id, hasTemplate: !!template, hasItemIds: !!template?.itemIds },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
      }

      const action = result.wasReplaced ? 'updated in' : 'applied to';
      vscode.window.showInformationMessage(`Template "${template.name}" ${action} ${claudeMdPath.split(/[/\\]/).pop()}`);

      return { wasReplaced: result.wasReplaced };
    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to apply template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Apply selected knowledge items directly to a claude.md file
   */
  async applySelectedItems(itemIds: string[], claudeMdPath: string): Promise<{ message?: string }> {
    logger.info(
      LogCategory.EXTENSION,
      'Applying selected items to claude.md',
      'KnowledgeManager.applySelectedItems',
      { itemIds, claudeMdPath, itemCount: itemIds.length },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      // Validate that all items exist
      for (const itemId of itemIds) {
        if (!this.store.hasItem(itemId)) {
          throw new Error(`Knowledge item not found: ${itemId}`);
        }
      }

      // Read claude.md file
      const uri = vscode.Uri.file(claudeMdPath);
      const content = await vscode.workspace.fs.readFile(uri);
      const currentContent = Buffer.from(content).toString('utf8');

      // Apply items using templateEngine
      const result = this.templateEngine.injectKnowledgeItems(
        currentContent,
        itemIds,
        false // Don't replace existing by default
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to apply knowledge items');
      }

      // Write updated content
      await vscode.workspace.fs.writeFile(
        uri,
        Buffer.from(result.content!, 'utf8')
      );

      // Record knowledge events for each applied item
      for (const itemId of itemIds) {
        const item = this.store.getItem(itemId);
        if (item) {
          await this.eventStorage.recordEvent({
            type: 'apply',
            knowledgeItemId: item.id,
            knowledgeItemTitle: item.title,
            knowledgeItemType: item.type,
            targetFile: 'CLAUDE.md', // Relative to workspace root
            actor: 'user' // User initiated this action
          });
        }
      }

      const fileName = claudeMdPath.split(/[/\\]/).pop();
      vscode.window.showInformationMessage(
        `Applied ${itemIds.length} knowledge item(s) to ${fileName}`
      );

      logger.info(
        LogCategory.EXTENSION,
        'Selected items applied successfully',
        'KnowledgeManager.applySelectedItems',
        { itemCount: itemIds.length, claudeMdPath, details: result.message },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      return { message: result.message };
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to apply selected items',
        'KnowledgeManager.applySelectedItems',
        { itemIds, claudeMdPath, error },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      vscode.window.showErrorMessage(`Failed to apply items: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove a template from a claude.md file
   */
  async removeTemplate(templateId: string, claudeMdPath: string): Promise<void> {
    try {
      // Get template before removal to record events
      const template = this.store.getTemplate(templateId);

      // Read claude.md file
      const uri = vscode.Uri.file(claudeMdPath);
      const content = await vscode.workspace.fs.readFile(uri);
      const currentContent = Buffer.from(content).toString('utf8');

      // Remove template
      const result = this.templateEngine.removeTemplate(currentContent, templateId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to remove template');
      }

      // Write updated content
      await vscode.workspace.fs.writeFile(
        uri,
        Buffer.from(result.content!, 'utf8')
      );

      // Record knowledge events for each removed item in the template
      // Note: template might be undefined if this is an individual item marker (not a template)
      logger.debug(
        LogCategory.EXTENSION,
        'Recording remove events for template items',
        'KnowledgeManager.removeTemplate',
        { templateId, itemIdsCount: template?.itemIds?.length || 0, hasItemIds: !!template?.itemIds, templateFound: !!template },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      if (template && template.itemIds) {
        // This is an actual template - record remove event for each item in the template
        for (const itemId of template.itemIds) {
          const item = this.store.getItem(itemId);
          if (item) {
            logger.debug(
              LogCategory.EXTENSION,
              'Recording remove event for item in template',
              'KnowledgeManager.removeTemplate',
              { itemId: item.id, itemTitle: item.title },
              LogPathway.KNOWLEDGE_MANAGEMENT
            );
            await this.eventStorage.recordEvent({
              type: 'remove',
              knowledgeItemId: item.id,
              knowledgeItemTitle: item.title,
              knowledgeItemType: item.type,
              targetFile: 'CLAUDE.md',
              actor: 'user' // User initiated this action
            });
          } else {
            logger.warn(
              LogCategory.EXTENSION,
              'Item not found in store when recording remove event',
              'KnowledgeManager.removeTemplate',
              { itemId },
              LogPathway.KNOWLEDGE_MANAGEMENT
            );
          }
        }
      } else {
        // Template not found - might be an individual item marker (applied via "Apply Selected Items")
        const item = this.store.getItem(templateId);
        if (item) {
          logger.debug(
            LogCategory.EXTENSION,
            'Marker is for individual item, not template - recording single remove event',
            'KnowledgeManager.removeTemplate',
            { itemId: item.id, itemTitle: item.title },
            LogPathway.KNOWLEDGE_MANAGEMENT
          );
          await this.eventStorage.recordEvent({
            type: 'remove',
            knowledgeItemId: item.id,
            knowledgeItemTitle: item.title,
            knowledgeItemType: item.type,
            targetFile: 'CLAUDE.md',
            actor: 'user' // User initiated this action
          });
        } else {
          logger.warn(
            LogCategory.EXTENSION,
            'Neither template nor item found with this ID - content removed but no event recorded',
            'KnowledgeManager.removeTemplate',
            { templateId, hasTemplate: !!template, hasItemIds: !!template?.itemIds },
            LogPathway.KNOWLEDGE_MANAGEMENT
          );
        }
      }

      vscode.window.showInformationMessage('Template removed successfully');
    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to remove template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Export a template to a file
   */
  async exportTemplate(templateId: string, targetPath?: string): Promise<string> {
    try {
      const template = this.store.getTemplate(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      // Generate export content
      const exportContent = this.templateEngine.exportTemplate(template);

      // Determine target path
      const filename = `${this.sanitizeFilename(template.name)}-v${template.version}.md`;
      const defaultPath = targetPath || path.join(this.knowledgeBaseDir, 'exports', filename);

      // Ensure directory exists
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(path.dirname(defaultPath)));

      // Write file
      await vscode.workspace.fs.writeFile(
        vscode.Uri.file(defaultPath),
        Buffer.from(exportContent, 'utf8')
      );

      vscode.window.showInformationMessage(`Template exported to ${defaultPath}`);
      return defaultPath;
    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to export template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Import a template from an exported file
   */
  async importTemplateFromFile(
    filePath: string,
    options?: Partial<ImportOptions>
  ): Promise<ImportResult> {
    logger.info(
      LogCategory.EXTENSION,
      'Importing template from file',
      'KnowledgeManager.importTemplateFromFile',
      { filePath, options },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      // Read the file
      const uri = vscode.Uri.file(filePath);
      const content = await vscode.workspace.fs.readFile(uri);
      const fileContent = Buffer.from(content).toString('utf8');

      // Set default options
      const importOptions: ImportOptions = {
        conflictResolution: options?.conflictResolution || 'skip',
        templateNameOverride: options?.templateNameOverride,
        skipDuplicateItems: options?.skipDuplicateItems !== undefined ? options.skipDuplicateItems : true
      };

      // Parse and validate
      const parseResult = this.templateEngine.parseImportedTemplate(fileContent);
      if (!parseResult.success || !parseResult.template) {
        return {
          success: false,
          itemsCreated: 0,
          itemsUpdated: 0,
          itemsSkipped: 0,
          errors: [parseResult.error || 'Failed to parse template file'],
          warnings: parseResult.warnings
        };
      }

      const parsed = parseResult.template;

      // Validate
      const validation = this.templateEngine.validateImportedTemplate(parsed);
      if (!validation.valid) {
        return {
          success: false,
          itemsCreated: 0,
          itemsUpdated: 0,
          itemsSkipped: 0,
          errors: validation.errors,
          warnings: validation.warnings
        };
      }

      // Create knowledge item files for new items
      const createdItemIds: string[] = [];
      for (const parsedItem of parsed.items) {
        // Check if item already exists
        const existing = this.store.getItems().find(
          item => item.title === parsedItem.title && item.type === parsedItem.type
        );

        if (!existing || importOptions.conflictResolution === 'overwrite') {
          // Create or update the file
          const itemId = existing?.id || this.generateId();
          const scope = KnowledgeScope.TEAM; // Default scope for imported items

          await this.createKnowledgeItemFile(
            itemId,
            parsedItem.type,
            scope,
            parsedItem.title,
            parsedItem.body,
            parsedItem.source,
            parsedItem.tags
          );

          createdItemIds.push(itemId);
        } else if (existing) {
          createdItemIds.push(existing.id);
        }
      }

      // Now call the TemplateEngine import with actual item IDs
      // We need to update the store items first, then import the template
      await this.reloadKnowledgeBase();

      // Create or update template
      const templateName = importOptions.templateNameOverride || parsed.name;
      const existingTemplate = this.store.getTemplates().find(t => t.name === templateName);

      let finalResult: ImportResult;

      if (existingTemplate && importOptions.conflictResolution === 'skip') {
        finalResult = {
          success: false,
          itemsCreated: 0,
          itemsUpdated: 0,
          itemsSkipped: parsed.items.length,
          errors: [`Template "${templateName}" already exists`],
          warnings: validation.warnings
        };
      } else if (existingTemplate && importOptions.conflictResolution === 'overwrite') {
        // Update existing template
        await this.updateTemplate(existingTemplate.id, createdItemIds);
        finalResult = {
          success: true,
          templateId: existingTemplate.id,
          templateName: existingTemplate.name,
          itemsCreated: createdItemIds.length,
          itemsUpdated: 0,
          itemsSkipped: 0,
          errors: [],
          warnings: validation.warnings
        };
      } else if (existingTemplate && importOptions.conflictResolution === 'merge') {
        // Merge items
        const mergedIds = Array.from(new Set([...existingTemplate.itemIds, ...createdItemIds]));
        await this.updateTemplate(existingTemplate.id, mergedIds);
        finalResult = {
          success: true,
          templateId: existingTemplate.id,
          templateName: existingTemplate.name,
          itemsCreated: createdItemIds.length - existingTemplate.itemIds.length,
          itemsUpdated: 0,
          itemsSkipped: 0,
          errors: [],
          warnings: validation.warnings
        };
      } else {
        // Create new template
        const newTemplate: Template = {
          id: this.generateId(),
          name: templateName,
          description: parsed.description || '',
          version: parsed.version,
          itemIds: createdItemIds,
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date()
          }
        };

        await this.saveTemplateToFile(newTemplate);
        this.store.addTemplate(newTemplate);

        finalResult = {
          success: true,
          templateId: newTemplate.id,
          templateName: newTemplate.name,
          itemsCreated: createdItemIds.length,
          itemsUpdated: 0,
          itemsSkipped: 0,
          errors: [],
          warnings: validation.warnings
        };
      }

      // Show success message
      const summary = [];
      if (finalResult.itemsCreated > 0) {
        summary.push(`${finalResult.itemsCreated} items created`);
      }
      if (finalResult.itemsUpdated > 0) {
        summary.push(`${finalResult.itemsUpdated} items updated`);
      }
      if (finalResult.itemsSkipped > 0) {
        summary.push(`${finalResult.itemsSkipped} items skipped`);
      }

      vscode.window.showInformationMessage(
        `Template "${finalResult.templateName}" imported successfully${summary.length > 0 ? ': ' + summary.join(', ') : ''}`
      );

      return finalResult;
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to import template',
        'KnowledgeManager.importTemplateFromFile',
        { filePath, error },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      vscode.window.showErrorMessage(`Failed to import template: ${error.message}`);

      return {
        success: false,
        itemsCreated: 0,
        itemsUpdated: 0,
        itemsSkipped: 0,
        errors: [error.message],
        warnings: []
      };
    }
  }

  /**
   * Scan workspace for claude.md files (case-insensitive)
   */
  async scanClaudeMdFiles(): Promise<ClaudeMdFile[]> {
    logger.info(
      LogCategory.EXTENSION,
      'Scanning for claude.md files',
      'KnowledgeManager.scanClaudeMdFiles',
      { workspaceRoot: this.workspaceRoot },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      // Search for both lowercase and uppercase variants
      // VSCode glob patterns are case-sensitive, so we need to search for all variants
      const patterns = [
        'claude.md',          // Root lowercase
        'CLAUDE.md',          // Root uppercase
        '**/claude.md',       // Subdirs lowercase
        '**/CLAUDE.md',       // Subdirs uppercase
        '**/.claude/claude.md',  // .claude dir lowercase
        '**/.claude/CLAUDE.md'   // .claude dir uppercase
      ];

      // Find all files matching any pattern
      const filePromises = patterns.map(pattern =>
        vscode.workspace.findFiles(
          new vscode.RelativePattern(this.workspaceRoot, pattern),
          '**/node_modules/**'
        )
      );

      const results = await Promise.all(filePromises);

      // Flatten and deduplicate by path
      const allFiles = results.flat();
      const uniqueFiles = Array.from(new Set(allFiles.map(f => f.fsPath)))
        .map(path => allFiles.find(f => f.fsPath === path)!);

      logger.info(
        LogCategory.EXTENSION,
        'Found claude.md files',
        'KnowledgeManager.scanClaudeMdFiles',
        { fileCount: uniqueFiles.length, files: uniqueFiles.map(f => f.fsPath) },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      const claudeFiles: ClaudeMdFile[] = [];

      for (const uri of uniqueFiles) {
        try {
          const content = await vscode.workspace.fs.readFile(uri);
          const contentStr = Buffer.from(content).toString('utf8');

          // Parse template sections
          const templates = this.templateEngine.getAppliedTemplates(contentStr);

          // Validate markers
          const validation = this.templateEngine.validateTemplateMarkers(contentStr);

          claudeFiles.push({
            path: uri.fsPath,
            relativePath: this.fileSystem.getRelativePath(uri.fsPath),
            content: contentStr,
            templates,
            hasConflicts: !validation.valid,
            conflicts: validation.errors
          });

          logger.debug(
            LogCategory.EXTENSION,
            'Processed claude.md file',
            'KnowledgeManager.scanClaudeMdFiles',
            {
              path: uri.fsPath,
              contentLength: contentStr.length,
              templateCount: templates.length,
              hasConflicts: !validation.valid
            },
            LogPathway.KNOWLEDGE_MANAGEMENT
          );
        } catch (error) {
          logger.error(
            LogCategory.EXTENSION,
            'Failed to read claude.md file',
            'KnowledgeManager.scanClaudeMdFiles',
            { path: uri.fsPath, error },
            LogPathway.KNOWLEDGE_MANAGEMENT
          );
        }
      }

      logger.info(
        LogCategory.EXTENSION,
        'Claude.md scan complete',
        'KnowledgeManager.scanClaudeMdFiles',
        { filesProcessed: claudeFiles.length },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      return claudeFiles;
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to scan claude.md files',
        'KnowledgeManager.scanClaudeMdFiles',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      return [];
    }
  }

  /**
   * Update claude.md file content
   */
  async updateClaudeMdContent(filePath: string, content: string): Promise<void> {
    logger.info(
      LogCategory.EXTENSION,
      'Updating claude.md file content',
      'KnowledgeManager.updateClaudeMdContent',
      { filePath, contentLength: content.length },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      const fileUri = vscode.Uri.file(filePath);
      const encoder = new TextEncoder();
      const contentBytes = encoder.encode(content);

      await vscode.workspace.fs.writeFile(fileUri, contentBytes);

      logger.info(
        LogCategory.EXTENSION,
        'Claude.md file updated successfully',
        'KnowledgeManager.updateClaudeMdContent',
        { filePath },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to update claude.md file',
        'KnowledgeManager.updateClaudeMdContent',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      throw error;
    }
  }

  /**
   * Get the knowledge store
   */
  getStore(): KnowledgeStore {
    return this.store;
  }

  /**
   * Get statistics about the knowledge base
   */
  getStats(): KnowledgeStats {
    return this.store.getStats();
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    for (const watcher of this.watchers) {
      watcher.dispose();
    }
    this.watchers = [];
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Ensure .agent-brain directory structure exists
   */
  private async ensureKnowledgeDirectory(): Promise<void> {
    const dirs = [
      this.knowledgeBaseDir,
      path.join(this.knowledgeBaseDir, 'golden-paths'),
      path.join(this.knowledgeBaseDir, 'patterns'),
      path.join(this.knowledgeBaseDir, 'standards'),
      path.join(this.knowledgeBaseDir, 'learnings'),
      path.join(this.knowledgeBaseDir, 'adrs'),
      path.join(this.knowledgeBaseDir, 'snippets'),
      path.join(this.knowledgeBaseDir, 'templates'),
      path.join(this.knowledgeBaseDir, 'exports')
    ];

    for (const dir of dirs) {
      try {
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(dir));
      } catch (error) {
        // Directory might already exist
      }
    }
  }

  /**
   * Setup file watchers for .agent-brain directory
   */
  private setupFileWatchers(): void {
    const pattern = new vscode.RelativePattern(
      this.workspaceRoot,
      '.agent-brain/**/*.md'
    );

    const watcher = vscode.workspace.createFileSystemWatcher(pattern);

    // File changed
    watcher.onDidChange(async (uri) => {
      await this.handleFileChange(uri);
    });

    // File created
    watcher.onDidCreate(async (uri) => {
      await this.handleFileCreate(uri);
    });

    // File deleted
    watcher.onDidDelete(async (uri) => {
      await this.handleFileDelete(uri);
    });

    this.watchers.push(watcher);
  }

  /**
   * Handle file change event
   */
  private async handleFileChange(uri: vscode.Uri): Promise<void> {
    logger.debug(
      LogCategory.EXTENSION,
      'File changed, reloading',
      'KnowledgeManager.handleFileChange',
      { filePath: uri.fsPath },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      await this.loadFile(uri);
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to reload changed file',
        'KnowledgeManager.handleFileChange',
        { filePath: uri.fsPath, error },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    }
  }

  /**
   * Handle file create event
   */
  private async handleFileCreate(uri: vscode.Uri): Promise<void> {
    logger.debug(
      LogCategory.EXTENSION,
      'New file created, loading',
      'KnowledgeManager.handleFileCreate',
      { filePath: uri.fsPath },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      await this.loadFile(uri);
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to load new file',
        'KnowledgeManager.handleFileCreate',
        { filePath: uri.fsPath, error },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    }
  }

  /**
   * Handle file delete event
   */
  private async handleFileDelete(uri: vscode.Uri): Promise<void> {
    logger.debug(
      LogCategory.EXTENSION,
      'File deleted, removing from store',
      'KnowledgeManager.handleFileDelete',
      { filePath: uri.fsPath },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      const item = this.store.getItemByPath(uri.fsPath);
      if (item) {
        this.store.deleteItem(item.id);
        logger.debug(
          LogCategory.EXTENSION,
          'Item removed from store',
          'KnowledgeManager.handleFileDelete',
          { itemId: item.id, filePath: uri.fsPath },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
      }
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to handle file deletion',
        'KnowledgeManager.handleFileDelete',
        { filePath: uri.fsPath, error },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    }
  }

  /**
   * Load a single markdown file into the store
   */
  private async loadFile(uri: vscode.Uri): Promise<void> {
    logger.debug(
      LogCategory.EXTENSION,
      'Loading file',
      'KnowledgeManager.loadFile',
      { filePath: uri.fsPath },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      // Skip templates directory
      if (uri.fsPath.includes('/templates/') || uri.fsPath.includes('\\templates\\')) {
        logger.debug(
          LogCategory.EXTENSION,
          'Skipping template file',
          'KnowledgeManager.loadFile',
          { filePath: uri.fsPath },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        return;
      }

      // Read file
      const content = await vscode.workspace.fs.readFile(uri);
      const contentStr = Buffer.from(content).toString('utf8');

      logger.debug(
        LogCategory.EXTENSION,
        'File content read',
        'KnowledgeManager.loadFile',
        { filePath: uri.fsPath, contentLength: contentStr.length },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      // Get file stats
      const stats = await vscode.workspace.fs.stat(uri);

      // Parse into knowledge item
      const item = await this.fileSystem.loadMarkdownFile(
        uri.fsPath,
        contentStr,
        {
          size: stats.size,
          mtime: new Date(stats.mtime),
          ctime: new Date(stats.ctime)
        }
      );

      logger.debug(
        LogCategory.EXTENSION,
        'File parsed into knowledge item',
        'KnowledgeManager.loadFile',
        {
          filePath: uri.fsPath,
          itemId: item.id,
          itemType: item.type,
          itemTitle: item.title,
          itemValid: item.valid
        },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      // Check if item already exists
      const existing = this.store.getItemByPath(uri.fsPath);
      if (existing) {
        // Update existing
        this.store.updateItem(existing.id, item);
        logger.debug(
          LogCategory.EXTENSION,
          'Updated existing item in store',
          'KnowledgeManager.loadFile',
          { itemId: existing.id, filePath: uri.fsPath },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
      } else {
        // Add new
        this.store.addItem(item);
        logger.debug(
          LogCategory.EXTENSION,
          'Added new item to store',
          'KnowledgeManager.loadFile',
          { itemId: item.id, filePath: uri.fsPath },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
      }
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to load file',
        'KnowledgeManager.loadFile',
        { filePath: uri.fsPath, error },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      throw error;
    }
  }

  /**
   * Save a template to the templates directory
   */
  private async saveTemplateToFile(template: Template): Promise<void> {
    const filename = `${this.sanitizeFilename(template.name)}-template.json`;
    const filePath = path.join(this.knowledgeBaseDir, 'templates', filename);

    const json = JSON.stringify(template, null, 2);

    await vscode.workspace.fs.writeFile(
      vscode.Uri.file(filePath),
      Buffer.from(json, 'utf8')
    );
  }

  /**
   * Generate a filename from a title
   */
  private generateFilename(title: string): string {
    const sanitized = this.sanitizeFilename(title);
    const timestamp = new Date().toISOString().split('T')[0];  // YYYY-MM-DD
    return `${timestamp}-${sanitized}.md`;
  }

  /**
   * Sanitize a string for use as a filename
   */
  private sanitizeFilename(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  }

  /**
   * Get directory for a knowledge type
   */
  private getDirectoryForType(type: KnowledgeType): string {
    const typeMap: Record<string, string> = {
      [KnowledgeType.ADR]: 'adrs',
      [KnowledgeType.GOLDEN_PATH]: 'golden-paths',
      [KnowledgeType.DESIGN_PATTERN]: 'patterns',
      [KnowledgeType.STANDARD]: 'standards',
      [KnowledgeType.LEARNING]: 'learnings',
      [KnowledgeType.SNIPPET]: 'snippets'
    };

    return typeMap[type] || 'custom';
  }

  /**
   * Generate a unique template ID
   */
  private generateTemplateId(): string {
    return `template-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Load template JSON files from disk
   * Scans .agent-brain/templates/*.json and loads them into the store
   */
  private async loadTemplatesFromDisk(): Promise<void> {
    logger.info(
      LogCategory.EXTENSION,
      'Loading templates from disk',
      'KnowledgeManager.loadTemplatesFromDisk',
      { templatesDir: path.join(this.knowledgeBaseDir, 'templates') },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      const templatesDir = path.join(this.knowledgeBaseDir, 'templates');

      // Find all JSON files in templates directory
      const pattern = new vscode.RelativePattern(templatesDir, '*.json');
      const files = await vscode.workspace.findFiles(pattern);

      logger.info(
        LogCategory.EXTENSION,
        'Found template files',
        'KnowledgeManager.loadTemplatesFromDisk',
        { fileCount: files.length, files: files.map(f => f.fsPath) },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      let loadedCount = 0;
      let errorCount = 0;

      for (const uri of files) {
        try {
          // Read JSON file
          const content = await vscode.workspace.fs.readFile(uri);
          const templateData = JSON.parse(Buffer.from(content).toString('utf8'));

          // Validate template structure
          if (!templateData.id || !templateData.name || !Array.isArray(templateData.itemIds)) {
            logger.error(
              LogCategory.EXTENSION,
              'Invalid template structure',
              'KnowledgeManager.loadTemplatesFromDisk',
              { filePath: uri.fsPath, templateData },
              LogPathway.KNOWLEDGE_MANAGEMENT
            );
            errorCount++;
            continue;
          }

          // Convert date strings back to Date objects (JSON serialization converts them to strings)
          if (templateData.metadata) {
            if (templateData.metadata.createdAt) {
              templateData.metadata.createdAt = new Date(templateData.metadata.createdAt);
            }
            if (templateData.metadata.updatedAt) {
              templateData.metadata.updatedAt = new Date(templateData.metadata.updatedAt);
            }
          }

          // Add to store
          this.store.addTemplate(templateData);

          logger.debug(
            LogCategory.EXTENSION,
            'Template loaded',
            'KnowledgeManager.loadTemplatesFromDisk',
            {
              templateId: templateData.id,
              name: templateData.name,
              itemCount: templateData.itemIds.length,
              filePath: uri.fsPath
            },
            LogPathway.KNOWLEDGE_MANAGEMENT
          );

          loadedCount++;
        } catch (error) {
          errorCount++;
          logger.error(
            LogCategory.EXTENSION,
            'Failed to load template file',
            'KnowledgeManager.loadTemplatesFromDisk',
            { filePath: uri.fsPath, error },
            LogPathway.KNOWLEDGE_MANAGEMENT
          );
          // Continue loading other templates
        }
      }

      logger.info(
        LogCategory.EXTENSION,
        'Templates loaded from disk',
        'KnowledgeManager.loadTemplatesFromDisk',
        {
          filesFound: files.length,
          templatesLoaded: loadedCount,
          templatesFailed: errorCount,
          templatesInStore: this.store.getAllTemplates().length
        },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to load templates from disk',
        'KnowledgeManager.loadTemplatesFromDisk',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      // Don't throw - template loading failure shouldn't break the entire system
    }
  }
}
