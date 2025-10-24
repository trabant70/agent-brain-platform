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
  KnowledgeStats,
  ClaudeMdFile,
  CreateKnowledgeItemOptions,
  KnowledgeType,
  KnowledgeScope,
  ImportOptions,
  ImportResult,
  // Marketplace (Phase 2+)
  TemplateRegistry,
  TemplateInstaller,
  MarketplaceTemplate,
  TemplateCategory,
  TemplateSource,
  // V1 Template Sections (Phase 3)
  TemplateStore,
  AuditLogger,
  VersionManager,
  TemplateCloner,
  TemplateMigration,
  MigrationResult
} from '@agent-brain/core/domains/knowledge';
import { ProjectTemplateManager } from '@agent-brain/core/domains/knowledge/project/ProjectTemplateManager';
import { MarketplaceTemplateManager, PublishResult } from '@agent-brain/core/domains/knowledge/marketplace/MarketplaceTemplateManager';
import { TemplateUsageTracker } from '@agent-brain/core/domains/knowledge/project/TemplateUsageTracker';
import { TemplateOrchestrator } from './TemplateOrchestrator';
import { KnowledgeEventStorage } from '@agent-brain/core/domains/events';
import { logger, LogCategory, LogPathway } from '@agent-brain/core/infrastructure/logging/Logger';

// TODO: Phase 3 - Remove old Template type after UI migration
type Template = any;
type CreateTemplateOptions = any;

export class KnowledgeManager {
  private store: KnowledgeStore;
  private fileSystem: KnowledgeFileSystem;
  private templateEngine: TemplateEngine;
  private eventStorage: KnowledgeEventStorage;
  private watchers: vscode.FileSystemWatcher[] = [];
  private initialized: boolean = false;
  private knowledgeBaseDir: string;

  // Template Management (Refactored Phase 3)
  private projectTemplateManager: ProjectTemplateManager;
  private marketplaceTemplateManager: MarketplaceTemplateManager;
  private templateUsageTracker: TemplateUsageTracker;
  private templateOrchestrator: TemplateOrchestrator;

  // Shared services
  private templateRegistry: TemplateRegistry;
  private templateInstaller: TemplateInstaller;

  // V1 Template Sections (NEW - Phase 3)
  private templateStore: TemplateStore;
  private auditLogger: AuditLogger;
  private versionManager: VersionManager;
  private templateCloner: TemplateCloner;
  private templateMigration: TemplateMigration;
  private v1Enabled: boolean = true;  // V1 is now the default and only UI

  // DEPRECATED: Remove after migration complete
  // Local templates (for Knowledge tab grouping only, NOT in marketplace)
  private localTemplates: MarketplaceTemplate[] = [];

  constructor(
    private workspaceRoot: string,
    private extensionContext: vscode.ExtensionContext
  ) {
    this.knowledgeBaseDir = path.join(workspaceRoot, '.agent-brain');
    this.store = new KnowledgeStore();
    this.fileSystem = new KnowledgeFileSystem(workspaceRoot);
    this.templateEngine = new TemplateEngine(this.store);
    this.eventStorage = new KnowledgeEventStorage(workspaceRoot);

    // Initialize shared services
    this.templateRegistry = new TemplateRegistry(this.knowledgeBaseDir);
    this.templateInstaller = new TemplateInstaller(this.store, this.templateRegistry);

    // Initialize project template manager
    const projectTemplatesPath = path.join(this.knowledgeBaseDir, 'templates');
    this.projectTemplateManager = new ProjectTemplateManager(
      projectTemplatesPath,
      (itemId: string) => this.store.getItem(itemId)
    );

    // Initialize marketplace template manager
    const bundledTemplatesPath = this.getBundledTemplatesPath();
    const marketplaceTemplatesPath = path.join(this.knowledgeBaseDir, 'marketplace', 'templates');
    this.marketplaceTemplateManager = new MarketplaceTemplateManager(
      bundledTemplatesPath,
      marketplaceTemplatesPath
    );

    // Initialize usage tracker
    this.templateUsageTracker = new TemplateUsageTracker(this.knowledgeBaseDir);

    // Initialize orchestrator
    this.templateOrchestrator = new TemplateOrchestrator(
      this.projectTemplateManager,
      this.marketplaceTemplateManager,
      this.templateInstaller,
      this.templateRegistry
    );

    // Initialize V1 Template Sections components
    this.templateStore = new TemplateStore();
    this.auditLogger = new AuditLogger();
    this.versionManager = new VersionManager();
    this.templateCloner = new TemplateCloner();
    this.templateMigration = new TemplateMigration();
  }

  /**
   * Get path to bundled templates (shipped with extension)
   */
  private getBundledTemplatesPath(): string {
    // Templates are bundled in the extension
    return path.join(this.extensionContext.extensionPath, 'dist', 'knowledge', 'bundled-templates');
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

      // One-time migration: Move templates from old location to marketplace
      await this.migrateTemplatesToMarketplace();

      // Load all knowledge items
      await this.refreshAll();

      // Load project templates
      await this.loadProjectTemplates();

      // Load marketplace templates
      await this.loadMarketplaceTemplates();

      // Load template usage tracker
      await this.templateUsageTracker.load();

      // V1 Migration: Detect if migration to template-as-sections is needed
      await this.detectAndRunV1Migration();

      // Load bundled templates into TemplateStore
      await this.loadBundledTemplatesIntoStore();

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
      // Clear existing items and local templates
      const itemsBeforeClear = this.store.getAllItems().length;
      const templatesBeforeClear = this.localTemplates.length;
      this.store.clear();
      this.localTemplates = [];
      logger.debug(
        LogCategory.EXTENSION,
        'Store and local templates cleared',
        'KnowledgeManager.refreshAll',
        { itemsCleared: itemsBeforeClear, localTemplatesCleared: templatesBeforeClear },
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
          templatesInMarketplace: this.marketplaceTemplateManager.getAllTemplates().length
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
        id: options.id || this.fileSystem.generateId(filePath),  // Use provided ID or generate from path
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
  async createTemplate(options: CreateTemplateOptions): Promise<MarketplaceTemplate> {
    logger.info(
      LogCategory.EXTENSION,
      'Creating project template',
      'KnowledgeManager.createTemplate',
      {
        name: options.name,
        itemCount: options.itemIds.length,
        category: options.category,
        license: options.license
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      // Delegate to ProjectTemplateManager
      const template = await this.projectTemplateManager.createTemplate({
        name: options.name,
        description: options.description,
        category: options.category,
        tags: options.tags,
        author: options.author,
        license: options.license,
        itemIds: options.itemIds
      });

      logger.info(
        LogCategory.EXTENSION,
        'Project template created successfully',
        'KnowledgeManager.createTemplate',
        {
          templateId: template.id,
          name: template.name,
          itemCount: template.itemCount
        },
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
   * Update an existing LOCAL template with new item IDs
   */
  async updateTemplate(templateId: string, itemIds: string[]): Promise<MarketplaceTemplate> {
    logger.info(
      LogCategory.EXTENSION,
      'Updating project template',
      'KnowledgeManager.updateTemplate',
      { templateId, itemCount: itemIds.length },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      // Delegate to ProjectTemplateManager
      const updatedTemplate = await this.projectTemplateManager.updateTemplate(templateId, itemIds);

      logger.info(
        LogCategory.EXTENSION,
        'Project template updated successfully',
        'KnowledgeManager.updateTemplate',
        {
          templateId,
          name: updatedTemplate.name,
          itemCount: updatedTemplate.itemCount,
          version: updatedTemplate.version
        },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      return updatedTemplate;
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to update local template',
        'KnowledgeManager.updateTemplate',
        { templateId, error },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      throw error;
    }
  }

  /**
   * Publish template to marketplace
   * Validates template, checks for existing versions, and publishes with version management
   */
  async publishTemplate(templateId: string): Promise<{
    templateId: string;
    templateName: string;
    version: string;
    isNewVersion: boolean;
    changesSummary: string;
  }> {
    logger.info(
      LogCategory.EXTENSION,
      'Publishing template to marketplace',
      'KnowledgeManager.publishTemplate',
      { templateId },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      // IMPORTANT: Reload marketplace templates to ensure we have the latest version
      // This prevents race conditions when user updates template then immediately publishes
      await this.marketplaceTemplateManager.loadAllTemplates();

      logger.debug(
        LogCategory.EXTENSION,
        'Reloaded marketplace templates before publishing',
        'KnowledgeManager.publishTemplate',
        {},
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      // Get template from LOCAL templates (not marketplace)
      const template = this.localTemplates.find(t => t.id === templateId);
      if (!template) {
        throw new Error(`Template not found in local templates: ${templateId}`);
      }

      // Only allow publishing USER templates
      if (template.source !== TemplateSource.USER) {
        throw new Error('Only user-created templates can be published to marketplace');
      }

      // Check if this template already exists in marketplace (check ALL templates, not just bundled)
      // When you publish a template, it becomes a marketplace template (saved to marketplace/templates/)
      // So we need to check if there's already a version in the marketplace
      const allMarketplaceTemplates = this.marketplaceTemplateManager.getAllTemplates();
      const existingMarketplace = allMarketplaceTemplates.find(t =>
        t.id === template.id || t.name.toLowerCase() === template.name.toLowerCase()
      );

      let newVersion: string;
      let isNewVersion = false;
      let changesSummary = '';

      if (existingMarketplace) {
        // Template exists in marketplace - compare item IDs to detect changes
        const existingItemIds = new Set(existingMarketplace.items.map(item => item.id));
        const currentItemIds = new Set(template.items.map(item => item.id));

        // Check if item composition changed
        const addedItems = Array.from(currentItemIds).filter(id => !existingItemIds.has(id));
        const removedItems = Array.from(existingItemIds).filter(id => !currentItemIds.has(id));
        const hasChanges = addedItems.length > 0 || removedItems.length > 0;

        if (!hasChanges) {
          throw new Error(
            `Template "${template.name}" has no changes compared to published version ${existingMarketplace.version}. ` +
            'Modify the template items before publishing a new version.'
          );
        }

        // Parse existing version and increment patch version
        const versionParts = existingMarketplace.version.split('.');
        const major = parseInt(versionParts[0] || '1');
        const minor = parseInt(versionParts[1] || '0');
        const patch = parseInt(versionParts[2] || '0');
        newVersion = `${major}.${minor}.${patch + 1}`;
        isNewVersion = true;

        // Build changes summary
        const changes: string[] = [];
        if (addedItems.length > 0) {
          changes.push(`${addedItems.length} item(s) added`);
        }
        if (removedItems.length > 0) {
          changes.push(`${removedItems.length} item(s) removed`);
        }
        changesSummary = changes.join(', ');

        logger.info(
          LogCategory.EXTENSION,
          'Publishing new version of existing marketplace template',
          'KnowledgeManager.publishTemplate',
          {
            templateName: template.name,
            templateId: template.id,
            existingSource: existingMarketplace.source,
            oldVersion: existingMarketplace.version,
            newVersion,
            addedItems: addedItems.length,
            removedItems: removedItems.length
          },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
      } else {
        // New template - use version from template or default to 1.0.0
        newVersion = template.version || '1.0.0';
        isNewVersion = false;

        logger.info(
          LogCategory.EXTENSION,
          'Publishing new template to marketplace',
          'KnowledgeManager.publishTemplate',
          {
            templateName: template.name,
            templateId: template.id,
            version: newVersion,
            itemCount: template.items.length
          },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
      }

      // Update template with new version and timestamp
      const publishedTemplate: MarketplaceTemplate = {
        ...template,
        version: newVersion,
        updatedAt: new Date().toISOString()
      };

      // Save to published directory
      const publishedDir = path.join(this.knowledgeBaseDir, 'marketplace', 'published');
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(publishedDir));

      const filename = `${this.sanitizeFilename(template.name)}-${newVersion}.json`;
      const filePath = path.join(publishedDir, filename);

      const json = JSON.stringify(publishedTemplate, null, 2);
      await vscode.workspace.fs.writeFile(
        vscode.Uri.file(filePath),
        Buffer.from(json, 'utf8')
      );

      // Save to marketplace templates directory and add to marketplace manager
      await this.saveMarketplaceTemplateToFile(publishedTemplate);
      this.marketplaceTemplateManager.addUserTemplate(publishedTemplate);

      // Mark the template as installed since it came from the project side
      const itemIds = publishedTemplate.items.map(item => item.id);
      const installResult = this.templateRegistry.install(
        publishedTemplate.id,
        newVersion,
        'user', // USER source since it's a user-created template
        itemIds
      );

      if (installResult.success) {
        await this.templateRegistry.saveRegistry();
        logger.debug(
          LogCategory.EXTENSION,
          'Published template marked as installed',
          'KnowledgeManager.publishTemplate',
          {
            templateId: publishedTemplate.id,
            version: newVersion,
            installedItemIds: itemIds
          },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
      } else {
        logger.warn(
          LogCategory.EXTENSION,
          'Failed to mark published template as installed',
          'KnowledgeManager.publishTemplate',
          {
            templateId: publishedTemplate.id,
            error: installResult.error
          },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
      }

      logger.info(
        LogCategory.EXTENSION,
        'Template published successfully',
        'KnowledgeManager.publishTemplate',
        {
          templateId: publishedTemplate.id,
          version: newVersion,
          publishedPath: filePath,
          markedAsInstalled: installResult.success
        },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      vscode.window.showInformationMessage(
        `Template "${template.name}" published as version ${newVersion}${isNewVersion ? ` (${changesSummary})` : ''}`
      );

      return {
        templateId: publishedTemplate.id,
        templateName: publishedTemplate.name,
        version: newVersion,
        isNewVersion,
        changesSummary
      };
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to publish template',
        'KnowledgeManager.publishTemplate',
        { templateId, error },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      throw error;
    }
  }

  /**
   * Delete a marketplace template (user templates only)
   */
  async deleteMarketplaceTemplate(templateId: string): Promise<{ success: boolean; message?: string }> {
    logger.info(
      LogCategory.EXTENSION,
      'Deleting marketplace template',
      'KnowledgeManager.deleteMarketplaceTemplate',
      { templateId },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      const template = this.marketplaceTemplateManager.getTemplate(templateId);
      if (!template) {
        return { success: false, message: 'Template not found' };
      }

      if (template.source === 'bundled') {
        return { success: false, message: 'Cannot delete bundled templates' };
      }

      // Delete the template file from .agent-brain/marketplace/templates/
      // Marketplace templates use ID-based filenames: {template-id}.json
      const marketplaceTemplatesDir = path.join(this.knowledgeBaseDir, 'marketplace', 'templates');
      const filename = `${templateId}.json`;
      const templateFile = path.join(marketplaceTemplatesDir, filename);
      const templateUri = vscode.Uri.file(templateFile);

      try {
        await vscode.workspace.fs.stat(templateUri);
        await vscode.workspace.fs.delete(templateUri);
        logger.info(
          LogCategory.EXTENSION,
          'Deleted marketplace template file',
          'KnowledgeManager.deleteMarketplaceTemplate',
          { templateId, templateName: template.name, filePath: templateFile },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
      } catch (error) {
        logger.error(
          LogCategory.EXTENSION,
          'Failed to delete template file from disk',
          'KnowledgeManager.deleteMarketplaceTemplate',
          { templateId, templateName: template.name, filePath: templateFile, error },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        return { success: false, message: 'Failed to delete template file' };
      }

      // Remove from marketplace manager
      this.marketplaceTemplateManager.removeUserTemplate(templateId);

      // Uninstall if installed
      const isInstalled = this.templateRegistry.isInstalled(templateId);
      if (isInstalled) {
        this.templateRegistry.uninstall(templateId);
        await this.templateRegistry.saveRegistry();
        logger.info(
          LogCategory.EXTENSION,
          'Unregistered template from installation registry',
          'KnowledgeManager.deleteMarketplaceTemplate',
          { templateId },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
      }

      return { success: true };
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to delete marketplace template',
        'KnowledgeManager.deleteMarketplaceTemplate',
        { templateId, error },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      return { success: false, message: error.message };
    }
  }

  /**
   * Delete a project template from .agent-brain/templates/
   * Only deletes LOCAL project templates, NOT marketplace templates
   */
  async deleteProjectTemplate(templateId: string): Promise<{ success: boolean; message?: string }> {
    logger.info(
      LogCategory.EXTENSION,
      'Deleting project template',
      'KnowledgeManager.deleteProjectTemplate',
      { templateId },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      // Delegate to ProjectTemplateManager
      const result = await this.projectTemplateManager.deleteTemplate(templateId);

      if (result.success) {
        logger.info(
          LogCategory.EXTENSION,
          'Successfully deleted project template',
          'KnowledgeManager.deleteProjectTemplate',
          { templateId },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );

        // Notify marketplace that template was uninstalled from project
        // This updates the UI to remove the "installed in project" highlight
        const uninstallResult = await this.templateOrchestrator.notifyUninstall(templateId);

        if (uninstallResult.success) {
          logger.debug(
            LogCategory.EXTENSION,
            'Marketplace notified of template uninstall',
            'KnowledgeManager.deleteProjectTemplate',
            { templateId, message: uninstallResult.message },
            LogPathway.KNOWLEDGE_MANAGEMENT
          );
        } else {
          logger.warn(
            LogCategory.EXTENSION,
            'Failed to notify marketplace of uninstall',
            'KnowledgeManager.deleteProjectTemplate',
            { templateId, message: uninstallResult.message },
            LogPathway.KNOWLEDGE_MANAGEMENT
          );
        }

        return { success: true };
      } else {
        logger.warn(
          LogCategory.EXTENSION,
          'Failed to delete project template',
          'KnowledgeManager.deleteProjectTemplate',
          { templateId, message: result.message },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        return { success: false, message: result.message };
      }
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to delete local template',
        'KnowledgeManager.deleteProjectTemplate',
        { templateId, error },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      return { success: false, message: error.message };
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
      // Check both project and marketplace template managers
      let template = this.projectTemplateManager.getTemplate(templateId);
      if (!template) {
        template = this.marketplaceTemplateManager.getTemplate(templateId);
      }

      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      // Read claude.md file
      const uri = vscode.Uri.file(claudeMdPath);
      const content = await vscode.workspace.fs.readFile(uri);
      const currentContent = Buffer.from(content).toString('utf8');

      // Get the item IDs to inject
      // For USER templates, extract IDs from embedded items
      // For installed marketplace templates, use installedItemIds
      const itemIds = template.items
        ? template.items.map(item => item.id)
        : (template.installedItemIds || []);

      if (itemIds.length === 0) {
        throw new Error('Template has no items.');
      }

      // Apply template items (with replaceExisting flag for idempotent operation)
      const result = this.templateEngine.injectKnowledgeItems(currentContent, itemIds, replaceExisting);

      if (!result.success) {
        throw new Error(result.error || 'Failed to apply template');
      }

      // Write updated content
      await vscode.workspace.fs.writeFile(
        uri,
        Buffer.from(result.content!, 'utf8')
      );

      // Record knowledge events for each applied item in the template
      logger.debug(
        LogCategory.EXTENSION,
        'Recording apply events for template items',
        'KnowledgeManager.applyTemplate',
        { templateId: template.id, itemIdsCount: itemIds.length },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      for (const itemId of itemIds) {
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
      // Check both project and marketplace template managers
      let template = this.projectTemplateManager.getTemplate(templateId);
      if (!template) {
        template = this.marketplaceTemplateManager.getTemplate(templateId);
      }

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
        { templateId, itemCount: template?.items?.length || 0, hasItems: !!template?.items, templateFound: !!template },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      if (template && template.items) {
        // This is an actual template - record remove event for each item in the template
        for (const item of template.items) {
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
            { templateId, hasTemplate: !!template, hasItems: !!template?.items },
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
      // Check both project and marketplace template managers
      let template = this.projectTemplateManager.getTemplate(templateId);
      if (!template) {
        template = this.marketplaceTemplateManager.getTemplate(templateId);
      }

      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      // Determine target path
      const filename = `${this.sanitizeFilename(template.name)}-v${template.version}.json`;
      const defaultPath = targetPath || path.join(this.knowledgeBaseDir, 'exports', filename);

      // Ensure directory exists
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(path.dirname(defaultPath)));

      // Write file as JSON
      const exportContent = JSON.stringify(template, null, 2);
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
      const existingTemplate = this.marketplaceTemplateManager.getAllTemplates().find(t => t.name === templateName);

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
        const existingItemIds = existingTemplate.items.map(item => item.id);
        const mergedIds = Array.from(new Set([...existingItemIds, ...createdItemIds]));
        await this.updateTemplate(existingTemplate.id, mergedIds);
        finalResult = {
          success: true,
          templateId: existingTemplate.id,
          templateName: existingTemplate.name,
          itemsCreated: createdItemIds.length - existingItemIds.length,
          itemsUpdated: 0,
          itemsSkipped: 0,
          errors: [],
          warnings: validation.warnings
        };
      } else {
        // Create new template
        const items: KnowledgeItem[] = [];
        for (const itemId of createdItemIds) {
          const item = this.store.getItem(itemId);
          if (item) {
            items.push(item);
          }
        }

        const now = new Date().toISOString();
        const newTemplate: MarketplaceTemplate = {
          id: this.generateTemplateId(),
          name: templateName,
          description: parsed.description || '',
          version: parsed.version || '1.0.0',
          createdAt: now,
          updatedAt: now,
          category: parsed.category || TemplateCategory.GENERAL,
          tags: parsed.tags || [],
          author: parsed.author || { name: 'Unknown' },
          license: parsed.license || 'MIT',
          source: TemplateSource.USER,
          items: items,
          itemCount: items.length
        };

        await this.saveMarketplaceTemplateToFile(newTemplate);
        this.marketplaceTemplateManager.addUserTemplate(newTemplate);

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
    const workspaceFolders = vscode.workspace.workspaceFolders;

    logger.info(
      LogCategory.EXTENSION,
      'Scanning for claude.md files',
      'KnowledgeManager.scanClaudeMdFiles',
      {
        workspaceRoot: this.workspaceRoot,
        workspaceFolderCount: workspaceFolders?.length || 0,
        workspaceFolders: workspaceFolders?.map(f => f.uri.fsPath) || []
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    if (!workspaceFolders || workspaceFolders.length === 0) {
      logger.warn(
        LogCategory.EXTENSION,
        'No workspace folders found - cannot scan for claude.md files',
        'KnowledgeManager.scanClaudeMdFiles',
        {},
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      return [];
    }

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

      logger.debug(
        LogCategory.EXTENSION,
        'Searching for claude.md files with patterns',
        'KnowledgeManager.scanClaudeMdFiles',
        { patterns, workspaceRoot: this.workspaceRoot },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      const results = await Promise.all(filePromises);

      logger.debug(
        LogCategory.EXTENSION,
        'Search results by pattern',
        'KnowledgeManager.scanClaudeMdFiles',
        {
          patternResults: patterns.map((pattern, i) => ({
            pattern,
            fileCount: results[i].length,
            files: results[i].map(f => f.fsPath)
          }))
        },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

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
          const templates = this.templateEngine.parseTemplateMarkers(contentStr);

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
            {
              path: uri.fsPath,
              errorMessage: error instanceof Error ? error.message : String(error),
              errorStack: error instanceof Error ? error.stack : undefined
            },
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
   * Save marketplace template to file
   */
  private async saveMarketplaceTemplateToFile(template: MarketplaceTemplate): Promise<void> {
    const filename = `${this.sanitizeFilename(template.name)}-template.json`;
    // Save to marketplace/templates directory (where MarketplaceManager loads from)
    const filePath = path.join(this.knowledgeBaseDir, 'marketplace', 'templates', filename);

    // Ensure templates directory exists
    const templatesDir = path.join(this.knowledgeBaseDir, 'marketplace', 'templates');
    try {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(templatesDir));
    } catch (error) {
      // Directory might already exist, ignore error
    }

    const json = JSON.stringify(template, null, 2);

    logger.debug(
      LogCategory.EXTENSION,
      'Saving marketplace template to file',
      'KnowledgeManager.saveMarketplaceTemplateToFile',
      { filePath, templateId: template.id },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    await vscode.workspace.fs.writeFile(
      vscode.Uri.file(filePath),
      Buffer.from(json, 'utf8')
    );
  }

  /**
   * Save a LOCAL template to .agent-brain/templates/ directory
   */
  private async saveLocalTemplateToFile(template: MarketplaceTemplate): Promise<void> {
    const filename = `${template.id}.json`;
    // Save to LOCAL templates directory
    const filePath = path.join(this.knowledgeBaseDir, 'templates', filename);

    // Ensure templates directory exists
    const templatesDir = path.join(this.knowledgeBaseDir, 'templates');
    try {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(templatesDir));
    } catch (error) {
      // Directory might already exist, ignore error
    }

    const json = JSON.stringify(template, null, 2);

    logger.debug(
      LogCategory.EXTENSION,
      'Saving local template to file',
      'KnowledgeManager.saveLocalTemplateToFile',
      { filePath, templateId: template.id },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

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
    // Flat structure - all knowledge items in single directory
    // Type information is stored in YAML frontmatter
    return 'items';
  }

  /**
   * Generate a unique template ID
   */
  private generateTemplateId(): string {
    return `template-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * One-time migration: Move templates from old location to marketplace
   * Moves templates from .agent-brain/templates/ to .agent-brain/marketplace/templates/
   * This runs once per workspace to consolidate template storage
   */
  private async migrateTemplatesToMarketplace(): Promise<void> {
    const oldTemplatesDir = path.join(this.knowledgeBaseDir, 'templates');
    const newTemplatesDir = path.join(this.knowledgeBaseDir, 'marketplace', 'templates');

    try {
      // Check if old templates directory exists
      const oldDirUri = vscode.Uri.file(oldTemplatesDir);
      try {
        await vscode.workspace.fs.stat(oldDirUri);
      } catch {
        // Old directory doesn't exist, nothing to migrate
        logger.debug(
          LogCategory.EXTENSION,
          'No old templates directory found, skipping migration',
          'KnowledgeManager.migrateTemplatesToMarketplace',
          { oldTemplatesDir },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        return;
      }

      // Find all JSON files in old location
      const pattern = new vscode.RelativePattern(oldTemplatesDir, '*.json');
      const files = await vscode.workspace.findFiles(pattern);

      if (files.length === 0) {
        logger.info(
          LogCategory.EXTENSION,
          'No templates to migrate',
          'KnowledgeManager.migrateTemplatesToMarketplace',
          { oldTemplatesDir },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        return;
      }

      // Ensure new directory exists
      const newDirUri = vscode.Uri.file(newTemplatesDir);
      await vscode.workspace.fs.createDirectory(newDirUri);

      let migratedCount = 0;
      let errorCount = 0;

      for (const oldFileUri of files) {
        try {
          const filename = path.basename(oldFileUri.fsPath);
          const newFileUri = vscode.Uri.file(path.join(newTemplatesDir, filename));

          // Check if file already exists in new location
          try {
            await vscode.workspace.fs.stat(newFileUri);
            logger.debug(
              LogCategory.EXTENSION,
              'Template already exists in new location, skipping',
              'KnowledgeManager.migrateTemplatesToMarketplace',
              { filename },
              LogPathway.KNOWLEDGE_MANAGEMENT
            );
            continue;
          } catch {
            // File doesn't exist in new location, proceed with migration
          }

          // Copy file to new location
          await vscode.workspace.fs.copy(oldFileUri, newFileUri, { overwrite: false });

          logger.debug(
            LogCategory.EXTENSION,
            'Migrated template to marketplace',
            'KnowledgeManager.migrateTemplatesToMarketplace',
            { filename, from: oldFileUri.fsPath, to: newFileUri.fsPath },
            LogPathway.KNOWLEDGE_MANAGEMENT
          );

          migratedCount++;
        } catch (error) {
          errorCount++;
          logger.error(
            LogCategory.EXTENSION,
            'Failed to migrate template',
            'KnowledgeManager.migrateTemplatesToMarketplace',
            { file: oldFileUri.fsPath, error },
            LogPathway.KNOWLEDGE_MANAGEMENT
          );
        }
      }

      if (migratedCount > 0) {
        logger.info(
          LogCategory.EXTENSION,
          'Templates migrated to marketplace',
          'KnowledgeManager.migrateTemplatesToMarketplace',
          {
            migratedCount,
            errorCount,
            oldLocation: oldTemplatesDir,
            newLocation: newTemplatesDir
          },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );

        vscode.window.showInformationMessage(
          `Migrated ${migratedCount} template(s) to marketplace. Old templates can be found in .agent-brain/templates/ if needed.`
        );
      }
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to migrate templates to marketplace',
        'KnowledgeManager.migrateTemplatesToMarketplace',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      // Don't throw - migration failure shouldn't break the extension
    }
  }

  /**
   * Load user template JSON files from disk (for backward compatibility)
   * Scans .agent-brain/templates/*.json (old location) - templates here are LOCAL only
   * New templates should be saved to .agent-brain/marketplace/templates/
   */
  private async loadTemplatesFromDisk(): Promise<void> {
    logger.info(
      LogCategory.EXTENSION,
      'Loading user templates from disk',
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
        'Found user template files',
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
          const template = JSON.parse(Buffer.from(content).toString('utf8'));

          // Basic validation
          if (!template.id || !template.name) {
            logger.error(
              LogCategory.EXTENSION,
              'Invalid template structure - missing id or name',
              'KnowledgeManager.loadTemplatesFromDisk',
              { filePath: uri.fsPath, template },
              LogPathway.KNOWLEDGE_MANAGEMENT
            );
            errorCount++;
            continue;
          }

          let marketplaceTemplate: MarketplaceTemplate;

          // Check if this is old format (with itemIds) or new format (with items)
          if (Array.isArray(template.itemIds)) {
            // OLD FORMAT - migrate from itemIds to embedded items
            logger.debug(
              LogCategory.EXTENSION,
              'Migrating old format template (itemIds)',
              'KnowledgeManager.loadTemplatesFromDisk',
              { templateId: template.id, itemIds: template.itemIds },
              LogPathway.KNOWLEDGE_MANAGEMENT
            );

            // Get full knowledge items for embedding
            const items = template.itemIds
              .map((id: string) => this.store.getItem(id))
              .filter((item: any) => item !== undefined);

            if (items.length === 0) {
              logger.warn(
                LogCategory.EXTENSION,
                'Old format template has no valid items, skipping',
                'KnowledgeManager.loadTemplatesFromDisk',
                { templateId: template.id, itemIds: template.itemIds },
                LogPathway.KNOWLEDGE_MANAGEMENT
              );
              continue;
            }

            marketplaceTemplate = {
              id: template.id,
              name: template.name,
              description: template.description || '',
              version: template.version ? `${template.version}.0.0` : '1.0.0',
              createdAt: template.metadata?.createdAt || new Date().toISOString(),
              updatedAt: template.metadata?.updatedAt || new Date().toISOString(),
              category: template.category || 'general',
              tags: template.tags || [],
              author: template.author || { name: 'User' },
              license: template.license || 'MIT',
              source: 'user' as any,
              items: items,
              itemCount: items.length
            };
          } else if (Array.isArray(template.items)) {
            // NEW FORMAT - already has embedded items
            logger.debug(
              LogCategory.EXTENSION,
              'Loading new format template (embedded items)',
              'KnowledgeManager.loadTemplatesFromDisk',
              { templateId: template.id, itemCount: template.items.length },
              LogPathway.KNOWLEDGE_MANAGEMENT
            );

            if (template.items.length === 0) {
              logger.warn(
                LogCategory.EXTENSION,
                'New format template has no items, skipping',
                'KnowledgeManager.loadTemplatesFromDisk',
                { templateId: template.id },
                LogPathway.KNOWLEDGE_MANAGEMENT
              );
              continue;
            }

            marketplaceTemplate = {
              ...template,
              source: 'user' as any,
              itemCount: template.items.length
            };
          } else {
            logger.error(
              LogCategory.EXTENSION,
              'Template has neither itemIds nor items array',
              'KnowledgeManager.loadTemplatesFromDisk',
              { filePath: uri.fsPath, template },
              LogPathway.KNOWLEDGE_MANAGEMENT
            );
            errorCount++;
            continue;
          }

          // Store as LOCAL template (for Knowledge tab grouping only, NOT in marketplace)
          // Templates in .agent-brain/templates/ are LOCAL ONLY
          // Only templates in .agent-brain/marketplace/templates/ appear in marketplace
          this.localTemplates.push(marketplaceTemplate);

          logger.debug(
            LogCategory.EXTENSION,
            'Local template loaded successfully',
            'KnowledgeManager.loadTemplatesFromDisk',
            {
              templateId: marketplaceTemplate.id,
              name: marketplaceTemplate.name,
              itemCount: marketplaceTemplate.itemCount,
              filePath: uri.fsPath,
              format: Array.isArray(template.itemIds) ? 'old' : 'new',
              location: 'local'
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
        'User templates loaded and migrated',
        'KnowledgeManager.loadTemplatesFromDisk',
        {
          filesFound: files.length,
          templatesMigrated: loadedCount,
          templatesFailed: errorCount,
          totalTemplatesInMarketplace: this.marketplaceTemplateManager.getAllTemplates().length
        },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to load user templates from disk',
        'KnowledgeManager.loadTemplatesFromDisk',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      // Don't throw - template loading failure shouldn't break the entire system
    }
  }

  // ============================================
  // Marketplace Integration (Phase 2)
  // ============================================

  /**
   * Load marketplace templates (bundled + user templates)
   */
  /**
   * Load project templates from .agent-brain/templates/
   */
  private async loadProjectTemplates(): Promise<void> {
    try {
      logger.info(
        LogCategory.EXTENSION,
        'Loading project templates',
        'KnowledgeManager.loadProjectTemplates',
        {},
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      const result = await this.projectTemplateManager.loadTemplatesFromDisk();

      logger.info(
        LogCategory.EXTENSION,
        'Project templates loaded',
        'KnowledgeManager.loadProjectTemplates',
        {
          count: result.count,
          errors: result.errors.length
        },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      if (result.errors.length > 0) {
        logger.warn(
          LogCategory.EXTENSION,
          'Some project templates failed to load',
          'KnowledgeManager.loadProjectTemplates',
          { errors: result.errors },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
      }
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to load project templates',
        'KnowledgeManager.loadProjectTemplates',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    }
  }

  /**
   * Load marketplace templates (bundled + published)
   */
  private async loadMarketplaceTemplates(): Promise<void> {
    try {
      logger.info(
        LogCategory.EXTENSION,
        'Loading marketplace templates',
        'KnowledgeManager.loadMarketplaceTemplates',
        {},
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      const result = await this.marketplaceTemplateManager.loadAllTemplates();

      // Update installation status from registry
      const installed = this.templateRegistry.getAllInstalled();
      this.marketplaceTemplateManager.updateInstallationStatus(installed);

      logger.info(
        LogCategory.EXTENSION,
        'Marketplace templates loaded',
        'KnowledgeManager.loadMarketplaceTemplates',
        {
          bundled: result.bundled,
          user: result.user,
          errors: result.errors.length
        },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      if (result.errors.length > 0) {
        logger.warn(
          LogCategory.EXTENSION,
          'Some templates failed to load',
          'KnowledgeManager.loadMarketplaceTemplates',
          { errors: result.errors },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
      }
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to load marketplace templates',
        'KnowledgeManager.loadMarketplaceTemplates',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    }
  }

  /**
   * Get project template manager (for UI access)
   */
  getProjectTemplateManager(): ProjectTemplateManager {
    return this.projectTemplateManager;
  }

  /**
   * Get marketplace template manager (for UI access)
   */
  getMarketplaceTemplateManager(): MarketplaceTemplateManager {
    return this.marketplaceTemplateManager;
  }

  /**
   * Get template orchestrator (for UI access)
   */
  getTemplateOrchestrator(): TemplateOrchestrator {
    return this.templateOrchestrator;
  }

  /**
   * DEPRECATED: Use getProjectTemplateManager().getAllTemplates() instead
   * Get local templates (from .agent-brain/templates/ - for Knowledge tab grouping only)
   */
  getLocalTemplates(): MarketplaceTemplate[] {
    return this.projectTemplateManager.getAllTemplates();
  }

  /**
   * Get template registry (for UI access)
   */
  getTemplateRegistry(): TemplateRegistry {
    return this.templateRegistry;
  }

  /**
   * Get template installer (for UI access)
   */
  getTemplateInstaller(): TemplateInstaller {
    return this.templateInstaller;
  }

  /**
   * Install a marketplace template
   */
  async installMarketplaceTemplate(
    templateId: string,
    options?: { skipDuplicates?: boolean; updateExisting?: boolean }
  ): Promise<{ success: boolean; message: string; details?: string[] }> {
    try {
      const template = this.marketplaceTemplateManager.getTemplate(templateId);

      if (!template) {
        return {
          success: false,
          message: 'Template not found'
        };
      }

      // Instead of using templateInstaller (which only adds to in-memory store),
      // create actual knowledge item files for each item in the template
      const createdItems: string[] = [];
      const skippedItems: string[] = [];
      const details: string[] = [];

      for (const templateItem of template.items) {
        // Check if item already exists (by looking for file with same ID)
        const existing = this.store.getItem(templateItem.id);

        if (existing && options?.skipDuplicates !== false) {
          skippedItems.push(templateItem.id);
          details.push(`Skipped "${templateItem.title}" (already exists)`);
          continue;
        }

        try {
          // Create actual knowledge item file, preserving the original template item ID
          const createdItem = await this.createItem({
            id: templateItem.id,  // Preserve original template item ID
            type: templateItem.type,
            scope: templateItem.scope,
            title: templateItem.title,
            body: templateItem.body,
            source: templateItem.source,
            tags: templateItem.tags || [],
            author: template.author.name
          });

          createdItems.push(createdItem.id);
          details.push(`Created "${templateItem.title}"`);

          logger.debug(
            LogCategory.EXTENSION,
            'Created knowledge item from template',
            'KnowledgeManager.installMarketplaceTemplate',
            { itemId: createdItem.id, title: createdItem.title },
            LogPathway.KNOWLEDGE_MANAGEMENT
          );
        } catch (error: any) {
          logger.error(
            LogCategory.EXTENSION,
            'Failed to create knowledge item from template',
            'KnowledgeManager.installMarketplaceTemplate',
            { itemTitle: templateItem.title, error: error.message },
            LogPathway.KNOWLEDGE_MANAGEMENT
          );
          details.push(`Failed to create "${templateItem.title}": ${error.message}`);
        }
      }

      if (createdItems.length > 0 || skippedItems.length > 0) {
        // Register installation in registry
        this.templateRegistry.install(
          template.id,
          template.version,
          template.source,
          [...createdItems, ...skippedItems]
        );
        await this.templateRegistry.saveRegistry();

        // Save the template to project templates directory so it appears in dropdown
        const projectTemplate: MarketplaceTemplate = {
          ...template,
          source: 'user' // Mark as user template since it's now in the workspace
        };

        await this.projectTemplateManager.saveTemplateToDisk(projectTemplate);
        await this.projectTemplateManager.loadTemplatesFromDisk();

        logger.info(
          LogCategory.EXTENSION,
          'Saved installed template to project templates',
          'KnowledgeManager.installMarketplaceTemplate',
          { templateId: template.id, itemsCreated: createdItems.length, itemsSkipped: skippedItems.length },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );

        // Update marketplace manager with new installation status
        const installed = this.templateRegistry.getAllInstalled();
        this.marketplaceTemplateManager.updateInstallationStatus(installed);

        return {
          success: true,
          message: `Template "${template.name}" installed successfully (${createdItems.length} items created, ${skippedItems.length} skipped)`,
          details
        };
      }

      return {
        success: false,
        message: 'No items were created'
      };
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to install template',
        'KnowledgeManager.installMarketplaceTemplate',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      return {
        success: false,
        message: `Installation failed: ${error.message}`
      };
    }
  }

  /**
   * Uninstall a marketplace template
   */
  async uninstallMarketplaceTemplate(
    templateId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const template = this.marketplaceTemplateManager.getTemplate(templateId);

      if (!template) {
        return {
          success: false,
          message: 'Template not found'
        };
      }

      const result = await this.templateInstaller.uninstall(templateId);

      if (result.success) {
        // Remove the template from project templates directory
        await this.projectTemplateManager.deleteTemplate(templateId);
        await this.projectTemplateManager.loadTemplatesFromDisk();

        logger.info(
          LogCategory.EXTENSION,
          'Removed template from project templates',
          'KnowledgeManager.uninstallMarketplaceTemplate',
          { templateId },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );

        // Update marketplace manager with new installation status
        const installed = this.templateRegistry.getAllInstalled();
        this.marketplaceTemplateManager.updateInstallationStatus(installed);

        return {
          success: true,
          message: `Template "${template.name}" uninstalled (${result.itemsRemoved} items removed)`
        };
      }

      return {
        success: false,
        message: result.error || 'Uninstallation failed'
      };
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to uninstall template',
        'KnowledgeManager.uninstallMarketplaceTemplate',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      return {
        success: false,
        message: `Uninstallation failed: ${error.message}`
      };
    }
  }

  /**
   * Create a new marketplace template from selected items
   */
  async createMarketplaceTemplate(options: {
    name: string;
    description: string;
    category: TemplateCategory;
    tags: string[];
    itemIds: string[];
    author: { name: string; email?: string; url?: string };
    license?: string;
  }): Promise<{ success: boolean; template?: MarketplaceTemplate; message: string }> {
    try {
      // Get the items
      const items = options.itemIds
        .map(id => this.store.getItem(id))
        .filter((item): item is KnowledgeItem => item !== undefined);

      if (items.length === 0) {
        return {
          success: false,
          message: 'No valid items found'
        };
      }

      // Create template
      const template = this.marketplaceTemplateManager.createTemplate(
        options.name,
        options.description,
        options.category,
        options.tags,
        items,
        options.author,
        options.license || 'MIT'
      );

      // Export to file
      const exportResult = await this.marketplaceTemplateManager.exportTemplate(template);

      if (!exportResult.success) {
        return {
          success: false,
          message: exportResult.error || 'Failed to export template'
        };
      }

      return {
        success: true,
        template,
        message: `Template "${template.name}" created successfully`
      };
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to create marketplace template',
        'KnowledgeManager.createMarketplaceTemplate',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      return {
        success: false,
        message: `Template creation failed: ${error.message}`
      };
    }
  }

  // ==========================================================================
  // V1 TEMPLATE SECTIONS - PUBLIC API (Phase 3)
  // ==========================================================================

  /**
   * Get all templates from TemplateStore (V1)
   */
  async getV1Templates(): Promise<MarketplaceTemplate[]> {
    if (!this.v1Enabled) {
      return [];
    }
    return this.templateStore.getAllTemplates();
  }

  /**
   * Get a specific template by ID (V1)
   */
  async getV1Template(templateId: string): Promise<MarketplaceTemplate | null> {
    if (!this.v1Enabled) {
      return null;
    }
    return this.templateStore.getTemplate(templateId);
  }

  /**
   * Create a new V1 template
   */
  async createV1Template(options: {
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

    // Save to disk
    await this.saveTemplateStoreToFiles();

    logger.info(
      LogCategory.EXTENSION,
      'Created V1 template',
      'KnowledgeManager.createV1Template',
      { templateId: template.id, name: template.name },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    return template;
  }

  /**
   * Add item to V1 template
   */
  async addItemToV1Template(templateId: string, options: {
    title: string;
    body: string;
    type: KnowledgeType;
    scope: KnowledgeScope;
    tags: string[];
  }): Promise<KnowledgeItem> {
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

    // Save to disk
    await this.saveTemplateStoreToFiles();

    logger.info(
      LogCategory.EXTENSION,
      'Added item to V1 template',
      'KnowledgeManager.addItemToV1Template',
      { templateId, itemId: item.id, title: item.title },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    return item;
  }

  /**
   * Update item in V1 template
   */
  async updateV1Item(templateId: string, itemId: string, updates: {
    title?: string;
    body?: string;
    type?: KnowledgeType;
    scope?: KnowledgeScope;
    tags?: string[];
  }): Promise<void> {
    this.templateStore.updateItem(templateId, itemId, updates, 'user');

    // Save to disk
    await this.saveTemplateStoreToFiles();

    logger.info(
      LogCategory.EXTENSION,
      'Updated V1 item',
      'KnowledgeManager.updateV1Item',
      { templateId, itemId },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Delete item from V1 template
   */
  async deleteV1Item(templateId: string, itemId: string): Promise<void> {
    this.templateStore.removeItemFromTemplate(templateId, itemId, 'user');

    // Save to disk
    await this.saveTemplateStoreToFiles();

    logger.info(
      LogCategory.EXTENSION,
      'Deleted V1 item',
      'KnowledgeManager.deleteV1Item',
      { templateId, itemId },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Create version checkpoint for V1 template
   */
  async createV1Version(templateId: string, options: {
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

    // Save to disk
    await this.saveTemplateStoreToFiles();

    logger.info(
      LogCategory.EXTENSION,
      'Created V1 version checkpoint',
      'KnowledgeManager.createV1Version',
      { templateId, versionNumber: options.versionNumber },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Clone a V1 template
   */
  async cloneV1Template(templateId: string, options: {
    newName?: string;
    shallow?: boolean;
  }): Promise<MarketplaceTemplate> {
    const sourceTemplate = this.templateStore.getTemplate(templateId);
    if (!sourceTemplate) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const cloneResult = this.templateCloner.cloneTemplate(
      sourceTemplate,
      {
        newName: options.newName,
        shallow: options.shallow ?? false,
        includeAuditLog: false,
        includeVersionHistory: false,
        createdBy: 'user'
      },
      this.auditLogger
    );

    if (!cloneResult.success || !cloneResult.clonedTemplate) {
      throw new Error(`Clone failed: ${cloneResult.error}`);
    }

    // Add cloned template to store
    this.templateStore.loadTemplates([cloneResult.clonedTemplate]);

    // Save to disk
    await this.saveTemplateStoreToFiles();

    logger.info(
      LogCategory.EXTENSION,
      'Cloned V1 template',
      'KnowledgeManager.cloneV1Template',
      { sourceId: templateId, cloneId: cloneResult.clonedTemplate.id },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    return cloneResult.clonedTemplate;
  }

  /**
   * Get audit log for V1 template
   */
  async getV1AuditLog(templateId: string): Promise<any[]> {
    const template = this.templateStore.getTemplate(templateId);
    if (!template) {
      return [];
    }
    return template.auditLog || [];
  }

  /**
   * Delete a V1 template
   */
  async deleteV1Template(templateId: string): Promise<void> {
    // Get template before deleting (to calculate file path)
    const template = this.templateStore.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Cannot delete bundled templates
    if (template.source === TemplateSource.BUNDLED) {
      throw new Error('Cannot delete bundled templates. Bundled templates are part of the extension.');
    }

    // Calculate file path
    const templatesDir = path.join(this.knowledgeBaseDir, 'templates-v1');
    const filePath = this.fileSystem.getTemplateFilePath(template, templatesDir);

    // Delete from store
    const success = this.templateStore.deleteTemplate(templateId, 'user');
    if (!success) {
      throw new Error(`Failed to delete template ${templateId} from store`);
    }

    // Delete file from disk
    try {
      await vscode.workspace.fs.delete(vscode.Uri.file(filePath));
      logger.debug(
        LogCategory.EXTENSION,
        'Deleted template file',
        'KnowledgeManager.deleteV1Template',
        { filePath },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    } catch (error) {
      logger.warn(
        LogCategory.EXTENSION,
        'Failed to delete template file (may not exist)',
        'KnowledgeManager.deleteV1Template',
        { filePath, error },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      // Continue even if file deletion fails - it may have already been deleted
    }

    logger.info(
      LogCategory.EXTENSION,
      'Deleted V1 template',
      'KnowledgeManager.deleteV1Template',
      { templateId, filePath },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Update V1 template metadata
   */
  async updateV1Template(templateId: string, updates: {
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

    // Save to disk
    await this.saveTemplateStoreToFiles();

    logger.info(
      LogCategory.EXTENSION,
      'Updated V1 template',
      'KnowledgeManager.updateV1Template',
      { templateId, updates },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Move item from one template to another
   */
  async moveV1Item(itemId: string, fromTemplateId: string, toTemplateId: string): Promise<void> {
    const result = this.templateStore.moveItem(itemId, fromTemplateId, toTemplateId, 'user');
    if (!result.success) {
      throw new Error(result.error || 'Failed to move item');
    }

    // Save to disk
    await this.saveTemplateStoreToFiles();

    logger.info(
      LogCategory.EXTENSION,
      'Moved V1 item',
      'KnowledgeManager.moveV1Item',
      { itemId, fromTemplateId, toTemplateId },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Copy item from one template to another
   */
  async copyV1Item(itemId: string, fromTemplateId: string, toTemplateId: string): Promise<void> {
    const result = this.templateStore.copyItem(itemId, toTemplateId, 'user');
    if (!result.success) {
      throw new Error(result.error || 'Failed to copy item');
    }

    // Save to disk
    await this.saveTemplateStoreToFiles();

    logger.info(
      LogCategory.EXTENSION,
      'Copied V1 item',
      'KnowledgeManager.copyV1Item',
      { itemId, fromTemplateId, toTemplateId, newItemId: result.newItemId },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Import V1 template from JSON
   */
  async importV1Template(templateJson: any): Promise<MarketplaceTemplate> {
    // Validate template structure
    if (!templateJson.id || !templateJson.name) {
      throw new Error('Invalid template: missing id or name');
    }

    // Load the template into store
    this.templateStore.loadTemplates([templateJson]);

    // Save to disk
    await this.saveTemplateStoreToFiles();

    logger.info(
      LogCategory.EXTENSION,
      'Imported V1 template',
      'KnowledgeManager.importV1Template',
      { templateId: templateJson.id, name: templateJson.name },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    return templateJson;
  }

  /**
   * Export V1 template to JSON file
   */
  async exportV1Template(templateId: string): Promise<string> {
    const template = this.templateStore.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Create exports directory if it doesn't exist
    const exportsDir = path.join(this.agentBrainPath, 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `template-${template.name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.json`;
    const filePath = path.join(exportsDir, filename);

    // Write template to file
    fs.writeFileSync(filePath, JSON.stringify(template, null, 2), 'utf-8');

    logger.info(
      LogCategory.EXTENSION,
      'Exported V1 template',
      'KnowledgeManager.exportV1Template',
      { templateId, filePath },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    return filePath;
  }

  /**
   * Inject V1 template to a file (e.g., CLAUDE.md)
   */
  async injectV1Template(templateId: string, targetFilePath: string): Promise<void> {
    const template = this.templateStore.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Record injection for all items
    this.templateStore.recordTemplateInjection(templateId, targetFilePath, 'user');

    // Save to disk
    await this.saveTemplateStoreToFiles();

    logger.info(
      LogCategory.EXTENSION,
      'Injected V1 template',
      'KnowledgeManager.injectV1Template',
      { templateId, targetFilePath, itemCount: template.items.length },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Inject single V1 item to a file (e.g., CLAUDE.md)
   */
  async injectV1Item(templateId: string, itemId: string, targetFilePath: string): Promise<void> {
    const template = this.templateStore.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const item = template.items.find(i => i.id === itemId);
    if (!item) {
      throw new Error(`Item ${itemId} not found in template ${templateId}`);
    }

    // Record injection
    this.templateStore.recordItemInjection(itemId, targetFilePath, 'item', templateId, 'user');

    // Save to disk
    await this.saveTemplateStoreToFiles();

    logger.info(
      LogCategory.EXTENSION,
      'Injected V1 item',
      'KnowledgeManager.injectV1Item',
      { templateId, itemId, targetFilePath, itemTitle: item.title },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Check if V1 features are enabled
   */
  isV1Enabled(): boolean {
    return this.v1Enabled;
  }

  // ==========================================================================
  // V1 TEMPLATE SECTIONS - PRIVATE METHODS
  // ==========================================================================

  /**
   * Detect if V1 migration is needed and run it
   * Migration converts old structure (items + templates) to V1 (templates with embedded items)
   */
  private async detectAndRunV1Migration(): Promise<void> {
    try {
      logger.info(
        LogCategory.EXTENSION,
        'Checking if V1 migration is needed',
        'KnowledgeManager.detectAndRunV1Migration',
        {},
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      // Get existing items and templates
      const existingItems = this.store.getAllItems();
      const existingTemplates = await this.marketplaceTemplateManager.listAllTemplates();

      // Check if migration is needed
      const needsMigration = await this.templateMigration.needsMigration(
        existingTemplates,
        existingItems
      );

      if (!needsMigration) {
        logger.info(
          LogCategory.EXTENSION,
          'V1 migration not needed - data structure is up to date',
          'KnowledgeManager.detectAndRunV1Migration',
          {},
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        return;
      }

      logger.info(
        LogCategory.EXTENSION,
        'V1 migration required - starting migration',
        'KnowledgeManager.detectAndRunV1Migration',
        { itemCount: existingItems.length, templateCount: existingTemplates.length },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      // Run migration
      const result = await this.templateMigration.migrate(existingItems, existingTemplates, {
        archiveOldData: true,
        createUngroupedTemplate: true,
        dryRun: false
      });

      if (!result.success) {
        logger.error(
          LogCategory.EXTENSION,
          'V1 migration failed',
          'KnowledgeManager.detectAndRunV1Migration',
          { errors: result.errors },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        return;
      }

      logger.info(
        LogCategory.EXTENSION,
        'V1 migration completed successfully',
        'KnowledgeManager.detectAndRunV1Migration',
        {
          templatesCreated: result.templatesCreated,
          itemsMigrated: result.itemsMigrated,
          orphanedItems: result.orphanedItems
        },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      // Load migrated templates into TemplateStore
      for (const template of result.migratedTemplates) {
        this.templateStore.loadTemplates([template]);
      }

      // Save to disk
      await this.saveTemplateStoreToFiles();

      // Enable V1 features
      this.v1Enabled = true;

      logger.info(
        LogCategory.EXTENSION,
        'V1 features enabled',
        'KnowledgeManager.detectAndRunV1Migration',
        {},
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      // Generate migration report
      const report = this.templateMigration.generateReport(result);
      logger.debug(
        LogCategory.EXTENSION,
        'Migration report',
        'KnowledgeManager.detectAndRunV1Migration',
        { report },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        'Error during V1 migration detection',
        'KnowledgeManager.detectAndRunV1Migration',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    }
  }

  /**
   * Save TemplateStore contents to JSON files
   * Uses flat structure - all templates in single directory
   * Source information is stored in template JSON metadata
   */
  private async saveTemplateStoreToFiles(): Promise<void> {
    try {
      const templates = this.templateStore.getAllTemplates();
      const templatesDir = path.join(this.knowledgeBaseDir, 'templates-v1');

      // Ensure directory exists (flat structure - single directory)
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(templatesDir));

      for (const template of templates) {
        const filePath = this.fileSystem.getTemplateFilePath(template, templatesDir);
        const json = this.fileSystem.toTemplateJson(template);

        await vscode.workspace.fs.writeFile(
          vscode.Uri.file(filePath),
          Buffer.from(json, 'utf8')
        );
      }

      logger.info(
        LogCategory.EXTENSION,
        'Saved TemplateStore to files',
        'KnowledgeManager.saveTemplateStoreToFiles',
        { templateCount: templates.length, directory: templatesDir },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to save TemplateStore to files',
        'KnowledgeManager.saveTemplateStoreToFiles',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      throw error;
    }
  }

  /**
   * Load templates from JSON files into TemplateStore
   */
  private async loadTemplateStoreFromFiles(): Promise<void> {
    try {
      const templatesDir = path.join(this.knowledgeBaseDir, 'templates-v1');

      // Check if directory exists
      try {
        await vscode.workspace.fs.stat(vscode.Uri.file(templatesDir));
      } catch {
        logger.debug(
          LogCategory.EXTENSION,
          'V1 templates directory does not exist yet',
          'KnowledgeManager.loadTemplateStoreFromFiles',
          { directory: templatesDir },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        return;
      }

      // Find all .json files in subdirectories
      const pattern = new vscode.RelativePattern(templatesDir, '**/*.json');
      const files = await vscode.workspace.findFiles(pattern);

      let loadedCount = 0;
      for (const fileUri of files) {
        try {
          const content = await vscode.workspace.fs.readFile(fileUri);
          const json = Buffer.from(content).toString('utf8');

          const template = await this.fileSystem.loadTemplateJson(fileUri.fsPath, json);
          this.templateStore.loadTemplates([template]);
          loadedCount++;
        } catch (error) {
          logger.warn(
            LogCategory.EXTENSION,
            'Failed to load template file',
            'KnowledgeManager.loadTemplateStoreFromFiles',
            { file: fileUri.fsPath, error },
            LogPathway.KNOWLEDGE_MANAGEMENT
          );
        }
      }

      logger.info(
        LogCategory.EXTENSION,
        'Loaded templates into TemplateStore',
        'KnowledgeManager.loadTemplateStoreFromFiles',
        { loadedCount, totalFiles: files.length },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      if (loadedCount > 0) {
        this.v1Enabled = true;

        // Migrate from subdirectory structure to flat structure if needed
        await this.migrateToFlatStructure(templatesDir, files);
      }
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to load TemplateStore from files',
        'KnowledgeManager.loadTemplateStoreFromFiles',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    }
  }

  /**
   * Migrate templates from old subdirectory structure to flat structure
   * Old: .agent-brain/templates-v1/bundled/*.json, user/*.json, etc.
   * New: .agent-brain/templates-v1/*.json
   */
  private async migrateToFlatStructure(templatesDir: string, allFiles: vscode.Uri[]): Promise<void> {
    try {
      const subdirectories = ['bundled', 'user', 'cloned', 'imported'];
      let migratedCount = 0;
      const filesToDelete: vscode.Uri[] = [];

      // Check if any files are in subdirectories
      for (const fileUri of allFiles) {
        const relativePath = path.relative(templatesDir, fileUri.fsPath);
        const parts = relativePath.split(path.sep);

        // If file is in a subdirectory (not directly in templates-v1)
        if (parts.length > 1 && subdirectories.includes(parts[0])) {
          const fileName = path.basename(fileUri.fsPath);
          const newPath = path.join(templatesDir, fileName);

          // Check if file already exists at root level
          try {
            await vscode.workspace.fs.stat(vscode.Uri.file(newPath));
            // File exists at root - just delete the subdirectory copy
            filesToDelete.push(fileUri);
            logger.debug(
              LogCategory.EXTENSION,
              'Template already migrated, will delete old copy',
              'KnowledgeManager.migrateToFlatStructure',
              { oldPath: fileUri.fsPath, newPath },
              LogPathway.KNOWLEDGE_MANAGEMENT
            );
          } catch {
            // File doesn't exist at root - move it
            const content = await vscode.workspace.fs.readFile(fileUri);
            await vscode.workspace.fs.writeFile(vscode.Uri.file(newPath), content);
            filesToDelete.push(fileUri);
            migratedCount++;

            logger.debug(
              LogCategory.EXTENSION,
              'Migrated template to flat structure',
              'KnowledgeManager.migrateToFlatStructure',
              { oldPath: fileUri.fsPath, newPath },
              LogPathway.KNOWLEDGE_MANAGEMENT
            );
          }
        }
      }

      // Delete old files from subdirectories
      for (const fileUri of filesToDelete) {
        try {
          await vscode.workspace.fs.delete(fileUri);
        } catch (error) {
          logger.warn(
            LogCategory.EXTENSION,
            'Failed to delete old template file',
            'KnowledgeManager.migrateToFlatStructure',
            { file: fileUri.fsPath, error },
            LogPathway.KNOWLEDGE_MANAGEMENT
          );
        }
      }

      // Try to delete empty subdirectories
      for (const subdir of subdirectories) {
        const subdirPath = path.join(templatesDir, subdir);
        try {
          await vscode.workspace.fs.delete(vscode.Uri.file(subdirPath), { recursive: false });
          logger.debug(
            LogCategory.EXTENSION,
            'Deleted empty subdirectory',
            'KnowledgeManager.migrateToFlatStructure',
            { subdirectory: subdirPath },
            LogPathway.KNOWLEDGE_MANAGEMENT
          );
        } catch {
          // Ignore errors - directory may not exist or may not be empty
        }
      }

      if (migratedCount > 0) {
        logger.info(
          LogCategory.EXTENSION,
          'Migrated templates to flat structure',
          'KnowledgeManager.migrateToFlatStructure',
          { migratedCount, deletedCount: filesToDelete.length },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
      }
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        'Error during flat structure migration',
        'KnowledgeManager.migrateToFlatStructure',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      // Don't throw - migration failure shouldn't break template loading
    }
  }

  /**
   * Load bundled templates into TemplateStore
   * Bundled templates are always available and cannot be deleted
   */
  private async loadBundledTemplatesIntoStore(): Promise<void> {
    try {
      const bundledPath = this.getBundledTemplatesPath();

      logger.info(
        LogCategory.EXTENSION,
        'Loading bundled templates into TemplateStore',
        'KnowledgeManager.loadBundledTemplatesIntoStore',
        { bundledPath },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      // Check if bundled templates directory exists
      if (!fs.existsSync(bundledPath)) {
        logger.warn(
          LogCategory.EXTENSION,
          'Bundled templates directory not found',
          'KnowledgeManager.loadBundledTemplatesIntoStore',
          { bundledPath },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        return;
      }

      // Read all JSON files from bundled templates directory
      const files = fs.readdirSync(bundledPath).filter(f => f.endsWith('.json'));

      logger.debug(
        LogCategory.EXTENSION,
        'Found bundled template files',
        'KnowledgeManager.loadBundledTemplatesIntoStore',
        { filesCount: files.length, files },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      let loadedCount = 0;
      for (const file of files) {
        try {
          const filePath = path.join(bundledPath, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const template = await this.knowledgeFileSystem.loadTemplateJson(filePath, content);

          // Add to TemplateStore (bundled templates are always added, never replaced by user templates)
          this.templateStore.loadTemplates([template]);
          loadedCount++;

          logger.debug(
            LogCategory.EXTENSION,
            'Loaded bundled template',
            'KnowledgeManager.loadBundledTemplatesIntoStore',
            { templateId: template.id, name: template.name, itemCount: template.items?.length || 0 },
            LogPathway.KNOWLEDGE_MANAGEMENT
          );
        } catch (error) {
          logger.error(
            LogCategory.EXTENSION,
            'Failed to load bundled template file',
            'KnowledgeManager.loadBundledTemplatesIntoStore',
            { file, error },
            LogPathway.KNOWLEDGE_MANAGEMENT
          );
        }
      }

      logger.info(
        LogCategory.EXTENSION,
        'Bundled templates loaded into TemplateStore',
        'KnowledgeManager.loadBundledTemplatesIntoStore',
        { loadedCount, totalFiles: files.length },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to load bundled templates into TemplateStore',
        'KnowledgeManager.loadBundledTemplatesIntoStore',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    }
  }
}
