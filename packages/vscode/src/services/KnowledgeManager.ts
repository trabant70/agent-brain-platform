/**
 * KnowledgeManager - Refactored Facade
 *
 * REFACTORED: Now a thin facade coordinating specialized services.
 * Reduced from 1,770 lines to ~300 lines.
 *
 * Delegates to:
 * - KnowledgeFileService (File I/O for knowledge items)
 * - TemplateFileService (Template file operations)
 * - TemplateOperationsService (Template CRUD business logic)
 * - TemplateInjectionService (Template injection/removal)
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {
  KnowledgeStore,
  KnowledgeFileSystem,
  TemplateEngine,
  KnowledgeStats,
  ClaudeMdFile,
  MarketplaceTemplate,
  TemplateCategory,
  TemplateSource,
  KnowledgeScope,
  KnowledgeType,
  KnowledgeItem,
  TemplateStore,
  AuditLogger,
  VersionManager,
  TemplateCloner,
  TemplateRegistry,
  TemplateInstaller,
  MaturityContext,
  MaturityConfigManager
} from '@agent-brain/core/domains/knowledge';

import { KnowledgeEventStorage } from '@agent-brain/core/domains/events';
import { logger, LogCategory, LogPathway } from '@agent-brain/core/infrastructure/logging/Logger';

// Import specialized services
import {
  KnowledgeFileService,
  TemplateFileService,
  TemplateOperationsService,
  TemplateInjectionService
} from './knowledge';

export class KnowledgeManager {
  // Core domain objects
  private store: KnowledgeStore;
  private fileSystem: KnowledgeFileSystem;
  private templateEngine: TemplateEngine;
  private eventStorage: KnowledgeEventStorage;

  // Template management (V1)
  private templateStore: TemplateStore;
  private auditLogger: AuditLogger;
  private versionManager: VersionManager;
  private templateCloner: TemplateCloner;
  private templateRegistry: TemplateRegistry;
  private templateInstaller: TemplateInstaller;

  // Specialized services (NEW - Facade Pattern)
  private knowledgeFileService: KnowledgeFileService;
  private templateFileService: TemplateFileService;
  private templateOperationsService: TemplateOperationsService;
  private templateInjectionService: TemplateInjectionService;

  private initialized: boolean = false;
  private knowledgeBaseDir: string;

  constructor(
    private workspaceRoot: string,
    private extensionContext: vscode.ExtensionContext
  ) {
    this.knowledgeBaseDir = path.join(workspaceRoot, '.agent-brain');

    // Initialize core domain objects
    this.store = new KnowledgeStore();
    this.fileSystem = new KnowledgeFileSystem(workspaceRoot);
    this.templateEngine = new TemplateEngine(this.store);
    this.eventStorage = new KnowledgeEventStorage(workspaceRoot);

    // Initialize V1 template components
    this.templateStore = new TemplateStore();
    this.auditLogger = new AuditLogger();
    this.versionManager = new VersionManager();
    this.templateCloner = new TemplateCloner();
    this.templateRegistry = new TemplateRegistry(this.knowledgeBaseDir);
    this.templateInstaller = new TemplateInstaller(this.store, this.templateRegistry);

    // Initialize specialized services
    this.knowledgeFileService = new KnowledgeFileService(
      workspaceRoot,
      this.fileSystem,
      this.templateEngine
    );

    this.templateFileService = new TemplateFileService(
      workspaceRoot,
      extensionContext,
      this.fileSystem
    );

    this.templateOperationsService = new TemplateOperationsService(
      workspaceRoot,
      this.templateStore,
      this.auditLogger,
      this.versionManager,
      this.templateCloner,
      this.fileSystem
    );

    this.templateInjectionService = new TemplateInjectionService(
      this.templateStore,
      this.templateEngine
    );
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
      await this.knowledgeFileService.ensureKnowledgeDirectory();

      // Load all knowledge items
      await this.refreshAll();

      // Load bundled templates into TemplateStore
      await this.templateFileService.loadBundledTemplates(this.templateStore);

      // Load user templates from .agent-brain/templates/
      await this.templateFileService.loadTemplatesFromFiles(this.templateStore);

      // Setup file watchers
      this.knowledgeFileService.setupFileWatchers(this.handleTemplateChange.bind(this));

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
   * Items are now stored embedded in templates, not as separate .md files
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

      // Extract all items from templates and add to store
      const allTemplates = this.templateStore.getAllTemplates();
      let itemCount = 0;

      for (const template of allTemplates) {
        if (template.items && Array.isArray(template.items)) {
          for (const item of template.items) {
            this.store.addItem(item);
            itemCount++;
          }
        }
      }

      logger.info(
        LogCategory.EXTENSION,
        'Knowledge refresh complete (items from templates)',
        'KnowledgeManager.refreshAll',
        {
          itemsInStore: this.store.getAllItems().length,
          templatesLoaded: allTemplates.length
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
   * Handle template file change event
   */
  private async handleTemplateChange(uri: vscode.Uri): Promise<void> {
    logger.debug(
      LogCategory.EXTENSION,
      'Template file changed, reloading all items',
      'KnowledgeManager.handleTemplateChange',
      { filePath: uri.fsPath },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      await this.refreshAll();
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to reload items after template change',
        'KnowledgeManager.handleTemplateChange',
        { filePath: uri.fsPath, error },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    }
  }

  // ==========================================================================
  // CLAUDE.MD FILE OPERATIONS (Delegated to KnowledgeFileService)
  // ==========================================================================

  async scanClaudeMdFiles(): Promise<ClaudeMdFile[]> {
    return this.knowledgeFileService.scanClaudeMdFiles();
  }

  async updateClaudeMdContent(filePath: string, content: string): Promise<void> {
    return this.knowledgeFileService.updateClaudeMdContent(filePath, content);
  }

  // ==========================================================================
  // V1 TEMPLATE OPERATIONS (Delegated to TemplateOperationsService)
  // ==========================================================================

  async getV1Templates(): Promise<MarketplaceTemplate[]> {
    return this.templateStore.getAllTemplates();
  }

  async getV1Template(templateId: string): Promise<MarketplaceTemplate | null> {
    return this.templateStore.getTemplate(templateId);
  }

  async createV1Template(options: {
    name: string;
    description: string;
    category: TemplateCategory;
    tags: string[];
    scope?: KnowledgeScope;
  }): Promise<MarketplaceTemplate> {
    const template = await this.templateOperationsService.createTemplate(options);
    await this.templateFileService.saveTemplatesToFiles(this.templateStore);
    return template;
  }

  async updateV1Template(templateId: string, updates: {
    name?: string;
    description?: string;
    category?: string;
    tags?: string[];
    scope?: string;
  }): Promise<void> {
    await this.templateOperationsService.updateTemplate(templateId, updates);
    await this.templateFileService.saveTemplatesToFiles(this.templateStore);
  }

  async deleteV1Template(templateId: string): Promise<void> {
    await this.templateOperationsService.deleteTemplate(templateId);
    // Note: deleteTemplate already handles file deletion
  }

  async addItemToV1Template(templateId: string, options: {
    title: string;
    body: string;
    type: KnowledgeType;
    scope: KnowledgeScope;
    tags: string[];
  }): Promise<KnowledgeItem> {
    const item = await this.templateOperationsService.addItemToTemplate(templateId, options);
    await this.templateFileService.saveTemplatesToFiles(this.templateStore);
    return item;
  }

  async updateV1Item(templateId: string, itemId: string, updates: {
    title?: string;
    body?: string;
    type?: KnowledgeType;
    scope?: KnowledgeScope;
    tags?: string[];
  }): Promise<void> {
    await this.templateOperationsService.updateItem(templateId, itemId, updates);
    await this.templateFileService.saveTemplatesToFiles(this.templateStore);
  }

  async deleteV1Item(templateId: string, itemId: string): Promise<void> {
    await this.templateOperationsService.deleteItem(templateId, itemId);
    await this.templateFileService.saveTemplatesToFiles(this.templateStore);
  }

  async cloneV1Template(templateId: string, options: {
    newName?: string;
    shallow?: boolean;
  }): Promise<MarketplaceTemplate> {
    const clonedTemplate = await this.templateOperationsService.cloneTemplate(templateId, options);
    await this.templateFileService.saveTemplatesToFiles(this.templateStore);
    return clonedTemplate;
  }

  async createV1Version(templateId: string, options: {
    versionNumber: string;
    description: string;
  }): Promise<void> {
    await this.templateOperationsService.createVersion(templateId, options);
    await this.templateFileService.saveTemplatesToFiles(this.templateStore);
  }

  async moveV1Item(itemId: string, fromTemplateId: string, toTemplateId: string): Promise<void> {
    await this.templateOperationsService.moveItem(itemId, fromTemplateId, toTemplateId);
    await this.templateFileService.saveTemplatesToFiles(this.templateStore);
  }

  async copyV1Item(itemId: string, fromTemplateId: string, toTemplateId: string): Promise<void> {
    await this.templateOperationsService.copyItem(itemId, fromTemplateId, toTemplateId);
    await this.templateFileService.saveTemplatesToFiles(this.templateStore);
  }

  async reorderV1Item(templateId: string, itemId: string, newIndex: number): Promise<void> {
    await this.templateOperationsService.reorderItem(templateId, itemId, newIndex);
    await this.templateFileService.saveTemplatesToFiles(this.templateStore);
  }

  async getV1AuditLog(templateId: string): Promise<any[]> {
    return this.templateOperationsService.getAuditLog(templateId);
  }

  async importV1Template(templateJson: any): Promise<MarketplaceTemplate> {
    const template = await this.templateOperationsService.importTemplate(templateJson);
    await this.templateFileService.saveTemplatesToFiles(this.templateStore);
    return template;
  }

  async exportV1Template(templateId: string): Promise<string> {
    const result = await this.templateOperationsService.exportTemplate(templateId);
    return result.filePath;
  }

  // ==========================================================================
  // TEMPLATE INJECTION (Delegated to TemplateInjectionService)
  // ==========================================================================

  async injectV1Template(templateId: string, targetFilePath: string): Promise<void> {
    await this.templateInjectionService.injectTemplate(templateId, targetFilePath);
    await this.templateFileService.saveTemplatesToFiles(this.templateStore);
  }

  async injectV1Item(templateId: string, itemId: string, targetFilePath: string): Promise<void> {
    await this.templateInjectionService.injectItem(templateId, itemId, targetFilePath);
    await this.templateFileService.saveTemplatesToFiles(this.templateStore);
  }

  async removeV1Template(templateId: string, targetFilePath: string): Promise<void> {
    await this.templateInjectionService.removeTemplate(templateId, targetFilePath);
  }

  // ==========================================================================
  // MATURITY-BASED FILTERING
  // ==========================================================================

  /**
   * Get current maturity configuration
   * Loads from .agent-brain/maturity-config.json or returns defaults
   */
  async getMaturityContext(): Promise<MaturityContext> {
    const configPath = path.join(this.knowledgeBaseDir, 'maturity-config.json');

    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');
        const json = JSON.parse(content);
        const context = MaturityConfigManager.fromJSON(json);

        // Validate before returning
        const validation = MaturityConfigManager.validate(context);
        if (!validation.valid) {
          logger.warn(
            LogCategory.EXTENSION,
            `Invalid maturity config, using defaults: ${validation.errors.join(', ')}`,
            'KnowledgeManager.getMaturityContext',
            {},
            LogPathway.KNOWLEDGE_MANAGEMENT
          );
          return MaturityConfigManager.createDefault();
        }

        logger.debug(
          LogCategory.EXTENSION,
          'Loaded maturity context from config',
          'KnowledgeManager.getMaturityContext',
          { quadrant: context.quadrant, complexity: context.complexity },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );

        return context;
      }
    } catch (error) {
      logger.warn(
        LogCategory.EXTENSION,
        'Failed to load maturity config, using defaults',
        'KnowledgeManager.getMaturityContext',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    }

    // Return defaults if file doesn't exist or parse failed
    return MaturityConfigManager.createDefault();
  }

  /**
   * Save maturity configuration
   * Writes to .agent-brain/maturity-config.json
   */
  async saveMaturityContext(context: MaturityContext): Promise<void> {
    const configPath = path.join(this.knowledgeBaseDir, 'maturity-config.json');

    // Validate before saving
    const validation = MaturityConfigManager.validate(context);
    if (!validation.valid) {
      throw new Error(`Invalid maturity configuration: ${validation.errors.join(', ')}`);
    }

    const json = MaturityConfigManager.toJSON(context);
    fs.writeFileSync(configPath, JSON.stringify(json, null, 2), 'utf-8');

    logger.info(
      LogCategory.EXTENSION,
      'Maturity configuration saved',
      'KnowledgeManager.saveMaturityContext',
      { quadrant: context.quadrant, complexity: context.complexity },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Update maturity configuration (partial update)
   * Only updates specified fields, keeps others unchanged
   */
  async updateMaturityContext(partial: Partial<MaturityContext>): Promise<MaturityContext> {
    const current = await this.getMaturityContext();
    const updated = MaturityConfigManager.merge(partial, current);
    await this.saveMaturityContext(updated);
    return updated;
  }

  // ==========================================================================
  // STORE ACCESS
  // ==========================================================================

  getStore(): KnowledgeStore {
    return this.store;
  }

  getStats(): KnowledgeStats {
    return this.store.getStats();
  }

  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================

  dispose(): void {
    this.knowledgeFileService.dispose();
  }
}
