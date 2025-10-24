/**
 * KnowledgeMessageHandler - Handles knowledge management messages
 *
 * Responsibilities:
 * - Knowledge item CRUD operations
 * - Template operations (create, update, apply, export, import)
 * - Claude.md file management
 * - Knowledge data synchronization with webview
 */

import * as vscode from 'vscode';
import { logger, LogCategory, LogPathway } from '@agent-brain/core/infrastructure/logging/Logger';

export interface KnowledgeHandlerContext {
  view: vscode.WebviewView | undefined;
  knowledgeManager: any;
  onTimelineRefresh: () => Promise<void>;
}

export class KnowledgeMessageHandler {
  constructor(private context: KnowledgeHandlerContext) {}

  /**
   * Handle knowledge-related messages
   */
  async handleMessage(message: any): Promise<boolean> {
    switch (message.type) {
      case 'knowledge:load-request':
        // Support reload flag to reload templates from disk (used by refresh button)
        const reload = message.payload?.reload ?? false;
        await this.sendKnowledgeData(reload);
        return true;

      case 'knowledge:scan-claude-files':
        logger.info(
          LogCategory.EXTENSION,
          'Received knowledge:scan-claude-files message from webview',
          'KnowledgeMessageHandler.handleMessage',
          {},
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        await this.sendClaudeMdFiles();
        return true;

      case 'knowledge:update-claude-file':
        await this.handleUpdateClaudeFile(message.payload);
        return true;

      case 'knowledge:create-item':
        await this.handleCreateKnowledgeItem(message.payload);
        return true;

      case 'knowledge:update-item':
        await this.handleUpdateKnowledgeItem(message.payload);
        return true;

      case 'knowledge:delete-item':
        await this.handleDeleteKnowledgeItem(message.payload);
        return true;

      case 'knowledge:create-template':
        await this.handleCreateTemplate(message.payload);
        return true;

      case 'knowledge:update-template':
        await this.handleUpdateTemplate(message.payload);
        return true;

      case 'knowledge:apply-template':
        await this.handleApplyTemplate(message.payload);
        return true;

      case 'knowledge:apply-selected-items':
        await this.handleApplySelectedItems(message.payload);
        return true;

      case 'knowledge:remove-template':
        await this.handleRemoveTemplate(message.payload);
        return true;

      case 'knowledge:publish-template':
        await this.handlePublishTemplate(message.payload);
        return true;

      case 'knowledge:showCreateDialog':
        await this.showCreateKnowledgeItemDialog();
        return true;

      case 'marketplace:request-templates':
        await this.sendMarketplaceTemplates();
        return true;

      case 'marketplace:refresh':
        await this.handleMarketplaceRefresh();
        return true;

      case 'marketplace:install':
        await this.handleMarketplaceInstall(message.payload);
        return true;

      case 'marketplace:uninstall':
        await this.handleMarketplaceUninstall(message.payload);
        return true;

      case 'marketplace:create-template':
        await this.handleMarketplaceCreateTemplate(message.payload);
        return true;

      case 'marketplace:export':
        await this.handleMarketplaceExport(message.payload);
        return true;

      case 'marketplace:import':
        await this.handleMarketplaceImport(message.payload);
        return true;

      case 'marketplace:confirm-import':
        await this.handleMarketplaceConfirmImport(message.payload);
        return true;

      case 'marketplace:delete':
        await this.handleMarketplaceDelete(message.payload);
        return true;

      case 'knowledge:delete-template':
        await this.handleDeleteProjectTemplate(message.payload);
        return true;

      // V1 Template Sections (Phase 4)
      case 'v1:get-templates':
        await this.handleV1GetTemplates();
        return true;

      case 'v1:get-template':
        await this.handleV1GetTemplate(message.payload);
        return true;

      case 'v1:create-template':
        await this.handleV1CreateTemplate(message.payload);
        return true;

      case 'v1:add-item':
        await this.handleV1AddItem(message.payload);
        return true;

      case 'v1:update-item':
        await this.handleV1UpdateItem(message.payload);
        return true;

      case 'v1:delete-item':
        await this.handleV1DeleteItem(message.payload);
        return true;

      case 'v1:create-version':
        await this.handleV1CreateVersion(message.payload);
        return true;

      case 'v1:clone-template':
        await this.handleV1CloneTemplate(message.payload);
        return true;

      case 'v1:get-audit-log':
        await this.handleV1GetAuditLog(message.payload);
        return true;

      case 'v1:check-enabled':
        await this.handleV1CheckEnabled();
        return true;

      case 'v1:import-template':
        await this.handleV1ImportTemplate(message.payload);
        return true;

      case 'v1:inject-template':
        await this.handleV1InjectTemplate(message.payload);
        return true;

      case 'v1:export-template':
        await this.handleV1ExportTemplate(message.payload);
        return true;

      case 'v1:inject-item':
        await this.handleV1InjectItem(message.payload);
        return true;

      case 'v1:move-item':
        await this.handleV1MoveItem(message.payload);
        return true;

      case 'v1:copy-item':
        await this.handleV1CopyItem(message.payload);
        return true;

      case 'v1:delete-template':
        await this.handleV1DeleteTemplate(message.payload);
        return true;

      case 'v1:update-template':
        await this.handleV1UpdateTemplate(message.payload);
        return true;

      default:
        return false; // Not handled by this handler
    }
  }

  /**
   * Send knowledge data to webview
   * @param reload If true, reloads templates from disk before sending
   */
  public async sendKnowledgeData(reload: boolean = false): Promise<void> {
    logger.debug(
      LogCategory.EXTENSION,
      'Sending knowledge data to webview',
      'KnowledgeMessageHandler.sendKnowledgeData',
      {
        hasKnowledgeManager: !!this.context.knowledgeManager,
        hasView: !!this.context.view,
        reload
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    if (!this.context.knowledgeManager || !this.context.view) {
      logger.debug(
        LogCategory.EXTENSION,
        'Cannot send knowledge data - missing manager or view',
        'KnowledgeMessageHandler.sendKnowledgeData',
        {
          hasKnowledgeManager: !!this.context.knowledgeManager,
          hasView: !!this.context.view
        },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      return;
    }

    try {
      // Reload templates from disk if requested (e.g., when refresh button is clicked)
      if (reload) {
        logger.info(
          LogCategory.EXTENSION,
          'Reloading knowledge data from disk',
          'KnowledgeMessageHandler.sendKnowledgeData',
          {},
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        await this.context.knowledgeManager.refreshAll();
      }

      const store = this.context.knowledgeManager.getStore();
      const items = store.getAllItems();

      // Send ONLY LOCAL templates (from .agent-brain/templates/)
      // Published templates appear only in marketplace, not in Knowledge tab
      const templates = this.context.knowledgeManager.getLocalTemplates();

      logger.info(
        LogCategory.EXTENSION,
        'Retrieved knowledge data from store',
        'KnowledgeMessageHandler.sendKnowledgeData',
        {
          itemCount: items.length,
          localTemplateCount: templates.length,
          items: items.map((i: any) => ({ id: i.id, type: i.type, title: i.title })),
          templates: templates.map((t: any) => ({ id: t.id, name: t.name, source: t.source, itemCount: t.items?.length || 0 }))
        },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      this.context.view.webview.postMessage({
        type: 'knowledge:loaded',
        payload: { items, templates }
      });

      // Also send V1 templates if enabled
      if (this.context.knowledgeManager.isV1Enabled()) {
        const v1Templates = await this.context.knowledgeManager.getV1Templates();

        this.context.view.webview.postMessage({
          type: 'v1:templates-data',
          payload: { templates: v1Templates }
        });

        logger.info(
          LogCategory.EXTENSION,
          'Sent V1 templates to webview',
          'KnowledgeMessageHandler.sendKnowledgeData',
          {
            v1TemplateCount: v1Templates.length,
            v1Templates: v1Templates.map((t: any) => ({ id: t.id, name: t.name, source: t.source, itemCount: t.items?.length || 0 }))
          },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
      }

      logger.info(
        LogCategory.EXTENSION,
        'Sent knowledge data to webview successfully',
        'KnowledgeMessageHandler.sendKnowledgeData',
        {
          itemCount: items.length,
          templateCount: templates.length,
          templateNames: templates.map((t: any) => t.name)
        },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to send knowledge data',
        'KnowledgeMessageHandler.sendKnowledgeData',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    }
  }

  /**
   * Send claude.md files to webview
   */
  public async sendClaudeMdFiles(): Promise<void> {
    logger.debug(
      LogCategory.EXTENSION,
      'Sending claude.md files to webview',
      'KnowledgeMessageHandler.sendClaudeMdFiles',
      {
        hasKnowledgeManager: !!this.context.knowledgeManager,
        hasView: !!this.context.view
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    if (!this.context.knowledgeManager || !this.context.view) {
      logger.debug(
        LogCategory.EXTENSION,
        'Cannot send claude.md files - missing manager or view',
        'KnowledgeMessageHandler.sendClaudeMdFiles',
        {
          hasKnowledgeManager: !!this.context.knowledgeManager,
          hasView: !!this.context.view
        },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      return;
    }

    try {
      const files = await this.context.knowledgeManager.scanClaudeMdFiles();

      logger.info(
        LogCategory.EXTENSION,
        'Scanned claude.md files',
        'KnowledgeMessageHandler.sendClaudeMdFiles',
        {
          fileCount: files.length,
          files: files.map((f: any) => ({ path: f.path, contentLength: f.content?.length || 0 }))
        },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      this.context.view.webview.postMessage({
        type: 'knowledge:claude-files',
        payload: { files }
      });

      logger.info(
        LogCategory.EXTENSION,
        'Sent claude.md files to webview',
        'KnowledgeMessageHandler.sendClaudeMdFiles',
        { fileCount: files.length },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to send claude.md files',
        'KnowledgeMessageHandler.sendClaudeMdFiles',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    }
  }

  /**
   * Handle update claude.md file content
   */
  private async handleUpdateClaudeFile(payload: { filePath: string; content: string }): Promise<void> {
    logger.debug(
      LogCategory.EXTENSION,
      'Updating claude.md file content',
      'KnowledgeMessageHandler.handleUpdateClaudeFile',
      { filePath: payload.filePath, contentLength: payload.content.length },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    if (!this.context.knowledgeManager) {
      logger.error(
        LogCategory.EXTENSION,
        'Cannot update claude.md - knowledge manager not available',
        'KnowledgeMessageHandler.handleUpdateClaudeFile',
        {},
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      return;
    }

    try {
      await this.context.knowledgeManager.updateClaudeMdContent(payload.filePath, payload.content);

      // Re-send updated claude.md files to webview
      await this.sendClaudeMdFiles();

      this.context.view?.webview.postMessage({
        type: 'knowledge:success',
        payload: { message: 'Claude.md file updated successfully' }
      });

      logger.info(
        LogCategory.EXTENSION,
        'Claude.md file updated successfully',
        'KnowledgeMessageHandler.handleUpdateClaudeFile',
        { filePath: payload.filePath },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to update claude.md file',
        'KnowledgeMessageHandler.handleUpdateClaudeFile',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      this.context.view?.webview.postMessage({
        type: 'knowledge:error',
        payload: { message: 'Failed to update claude.md file' }
      });
    }
  }

  /**
   * Handle create knowledge item
   */
  private async handleCreateKnowledgeItem(payload: any): Promise<void> {
    if (!this.context.knowledgeManager) {
      return;
    }

    try {
      await this.context.knowledgeManager.createItem(payload);
      await this.sendKnowledgeData();

      // Refresh timeline to show new knowledge event
      await this.context.onTimelineRefresh();

      this.context.view?.webview.postMessage({
        type: 'knowledge:success',
        payload: { message: 'Knowledge item created successfully' }
      });

      logger.info(
        LogCategory.EXTENSION,
        'Knowledge item created successfully - timeline refreshed',
        'KnowledgeMessageHandler.handleCreateKnowledgeItem',
        { type: payload.type, title: payload.title },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to create knowledge item',
        'KnowledgeMessageHandler.handleCreateKnowledgeItem',
        { error },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      this.context.view?.webview.postMessage({
        type: 'knowledge:error',
        payload: { error: error.message }
      });
    }
  }

  /**
   * Handle update knowledge item
   */
  private async handleUpdateKnowledgeItem(payload: any): Promise<void> {
    if (!this.context.knowledgeManager) {
      return;
    }

    try {
      await this.context.knowledgeManager.updateItem(payload.id, payload.updates);
      await this.sendKnowledgeData();

      this.context.view?.webview.postMessage({
        type: 'knowledge:success',
        payload: { message: 'Knowledge item updated successfully' }
      });
    } catch (error: any) {
      this.context.view?.webview.postMessage({
        type: 'knowledge:error',
        payload: { error: error.message }
      });
    }
  }

  /**
   * Handle delete knowledge item
   */
  private async handleDeleteKnowledgeItem(payload: any): Promise<void> {
    if (!this.context.knowledgeManager) {
      return;
    }

    try {
      await this.context.knowledgeManager.deleteItem(payload.id);
      await this.sendKnowledgeData();

      // Refresh timeline to show deletion event
      await this.context.onTimelineRefresh();

      this.context.view?.webview.postMessage({
        type: 'knowledge:success',
        payload: { message: 'Knowledge item deleted successfully' }
      });

      logger.info(
        LogCategory.EXTENSION,
        'Knowledge item deleted successfully - timeline refreshed',
        'KnowledgeMessageHandler.handleDeleteKnowledgeItem',
        { itemId: payload.id },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to delete knowledge item',
        'KnowledgeMessageHandler.handleDeleteKnowledgeItem',
        { itemId: payload.id, error },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      this.context.view?.webview.postMessage({
        type: 'knowledge:error',
        payload: { error: error.message }
      });
    }
  }

  /**
   * Handle create template
   */
  private async handleCreateTemplate(payload: any): Promise<void> {
    if (!this.context.knowledgeManager) {
      return;
    }

    try {
      const template = await this.context.knowledgeManager.createTemplate(payload);
      await this.sendKnowledgeData();

      this.context.view?.webview.postMessage({
        type: 'knowledge:template-created',
        payload: {
          message: 'Template created successfully',
          templateId: template.id,
          templateName: template.name
        }
      });
    } catch (error: any) {
      this.context.view?.webview.postMessage({
        type: 'knowledge:error',
        payload: { error: error.message }
      });
    }
  }

  /**
   * Handle update template
   */
  private async handleUpdateTemplate(payload: any): Promise<void> {
    if (!this.context.knowledgeManager) {
      return;
    }

    try {
      await this.context.knowledgeManager.updateTemplate(payload.templateId, payload.itemIds);

      // Reload project templates to get updated version
      const projectTemplateManager = this.context.knowledgeManager.getProjectTemplateManager();
      await projectTemplateManager.loadTemplatesFromDisk();

      // Refresh knowledge data to show updated template
      await this.sendKnowledgeData();

      const projectTemplate = projectTemplateManager.getTemplate(payload.templateId);
      const templateName = projectTemplate?.name || 'Template';

      this.context.view?.webview.postMessage({
        type: 'knowledge:success',
        payload: { message: `Template "${templateName}" updated successfully` }
      });
    } catch (error: any) {
      this.context.view?.webview.postMessage({
        type: 'knowledge:error',
        payload: { error: error.message }
      });
    }
  }

  /**
   * Handle apply template
   */
  private async handleApplyTemplate(payload: any): Promise<void> {
    if (!this.context.knowledgeManager) {
      return;
    }

    try {
      // Find claude.md file - use payload path if provided, otherwise check active editor, then search workspace
      let claudeMdPath: string | undefined = payload.claudeFilePath;

      if (!claudeMdPath) {
        // Check if active editor has claude.md open
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && activeEditor.document.fileName.toLowerCase().endsWith('claude.md')) {
          claudeMdPath = activeEditor.document.fileName;
          logger.debug(
            LogCategory.EXTENSION,
            'Using claude.md from active editor',
            'KnowledgeMessageHandler.handleApplyTemplate',
            { claudeMdPath },
            LogPathway.KNOWLEDGE_MANAGEMENT
          );
        } else {
          // Search workspace for claude.md (case-insensitive)
          const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
          if (workspaceRoot) {
            const claudeMdFiles = await this.context.knowledgeManager.scanClaudeMdFiles();
            if (claudeMdFiles.length > 0) {
              // Use the first claude.md found (typically the root one)
              claudeMdPath = claudeMdFiles[0].path;
              logger.debug(
                LogCategory.EXTENSION,
                'Found claude.md in workspace',
                'KnowledgeMessageHandler.handleApplyTemplate',
                { claudeMdPath, totalFound: claudeMdFiles.length },
                LogPathway.KNOWLEDGE_MANAGEMENT
              );
            }
          }
        }
      } else {
        logger.debug(
          LogCategory.EXTENSION,
          'Using claude.md from webview selection',
          'KnowledgeMessageHandler.handleApplyTemplate',
          { claudeMdPath },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
      }

      // If still no claude.md found, show error
      if (!claudeMdPath) {
        const errorMsg = 'No claude.md or CLAUDE.md file found. Please create one in your project root.';
        logger.warn(
          LogCategory.EXTENSION,
          'Cannot apply template - no claude.md file',
          'KnowledgeMessageHandler.handleApplyTemplate',
          { templateId: payload.templateId },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );

        this.context.view?.webview.postMessage({
          type: 'knowledge:error',
          payload: { error: errorMsg }
        });
        return;
      }

      logger.info(
        LogCategory.EXTENSION,
        'Applying template to claude.md',
        'KnowledgeMessageHandler.handleApplyTemplate',
        { templateId: payload.templateId, replaceExisting: payload.replaceExisting, claudeMdPath },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      // Pass replaceExisting flag to support idempotent operations
      const result = await this.context.knowledgeManager.applyTemplate(
        payload.templateId,
        claudeMdPath,
        payload.replaceExisting || false
      );
      await this.sendClaudeMdFiles();

      // Send success message to webview
      // Check both project and marketplace template managers
      const projectManager = this.context.knowledgeManager.getProjectTemplateManager();
      const marketplaceManager = this.context.knowledgeManager.getMarketplaceTemplateManager();
      let template = projectManager.getTemplate(payload.templateId);
      if (!template) {
        template = marketplaceManager.getTemplate(payload.templateId);
      }
      const templateName = template?.name || 'Template';
      const action = result?.wasReplaced ? 'updated in' : 'applied to';

      this.context.view?.webview.postMessage({
        type: 'knowledge:success',
        payload: { message: `Template "${templateName}" ${action} ${claudeMdPath.split(/[/\\]/).pop()}` }
      });

      // Refresh timeline to show new knowledge events
      await this.context.onTimelineRefresh();

      logger.info(
        LogCategory.EXTENSION,
        'Template applied successfully - timeline refreshed',
        'KnowledgeMessageHandler.handleApplyTemplate',
        { templateId: payload.templateId, templateName, wasReplaced: result?.wasReplaced, claudeMdPath },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to apply template',
        'KnowledgeMessageHandler.handleApplyTemplate',
        { templateId: payload.templateId, error },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      this.context.view?.webview.postMessage({
        type: 'knowledge:error',
        payload: { error: error.message }
      });
    }
  }

  /**
   * Handle apply selected items
   */
  private async handleApplySelectedItems(payload: any): Promise<void> {
    if (!this.context.knowledgeManager) {
      return;
    }

    try {
      // Find claude.md file - use payload path if provided, otherwise check active editor, then search workspace
      let claudeMdPath: string | undefined = payload.claudeFilePath;

      if (!claudeMdPath) {
        // Check if active editor has claude.md open
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && activeEditor.document.fileName.toLowerCase().endsWith('claude.md')) {
          claudeMdPath = activeEditor.document.fileName;
        } else {
          // Search workspace for claude.md
          const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
          if (workspaceRoot) {
            const claudeMdFiles = await this.context.knowledgeManager.scanClaudeMdFiles();
            if (claudeMdFiles.length > 0) {
              claudeMdPath = claudeMdFiles[0].path;
            }
          }
        }
      } else {
        logger.debug(
          LogCategory.EXTENSION,
          'Using claude.md from webview selection',
          'KnowledgeMessageHandler.handleApplySelectedItems',
          { claudeMdPath },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
      }

      // If still no claude.md found, show error
      if (!claudeMdPath) {
        const errorMsg = 'No claude.md or CLAUDE.md file found. Please create one in your project root.';
        this.context.view?.webview.postMessage({
          type: 'knowledge:error',
          payload: { error: errorMsg }
        });
        return;
      }

      logger.info(
        LogCategory.EXTENSION,
        'Applying selected items to claude.md',
        'KnowledgeMessageHandler.handleApplySelectedItems',
        { itemIds: payload.itemIds, claudeMdPath },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      const result = await this.context.knowledgeManager.applySelectedItems(payload.itemIds, claudeMdPath);
      await this.sendClaudeMdFiles();

      // Send success message with details
      this.context.view?.webview.postMessage({
        type: 'knowledge:success',
        payload: {
          message: result.message || `Applied ${payload.itemIds.length} item(s) to ${claudeMdPath.split(/[/\\]/).pop()}`
        }
      });

      // Refresh timeline to show new knowledge events
      await this.context.onTimelineRefresh();

      logger.info(
        LogCategory.EXTENSION,
        'Selected items applied successfully - timeline refreshed',
        'KnowledgeMessageHandler.handleApplySelectedItems',
        { itemCount: payload.itemIds.length, claudeMdPath },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to apply selected items',
        'KnowledgeMessageHandler.handleApplySelectedItems',
        { itemIds: payload.itemIds, error },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      this.context.view?.webview.postMessage({
        type: 'knowledge:error',
        payload: { error: error.message }
      });
    }
  }

  /**
   * Handle remove template
   */
  private async handleRemoveTemplate(payload: any): Promise<void> {
    if (!this.context.knowledgeManager) {
      return;
    }

    try {
      await this.context.knowledgeManager.removeTemplate(payload.templateId, payload.claudeMdPath);
      await this.sendClaudeMdFiles();

      // Refresh timeline to show new knowledge events
      await this.context.onTimelineRefresh();

      logger.info(
        LogCategory.EXTENSION,
        'Template removed successfully - timeline refreshed',
        'KnowledgeMessageHandler.handleRemoveTemplate',
        { templateId: payload.templateId, claudeMdPath: payload.claudeMdPath },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to remove template',
        'KnowledgeMessageHandler.handleRemoveTemplate',
        { templateId: payload.templateId, error },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      this.context.view?.webview.postMessage({
        type: 'knowledge:error',
        payload: { error: error.message }
      });
    }
  }

  /**
   * Handle publish template to marketplace
   */
  private async handlePublishTemplate(payload: any): Promise<void> {
    if (!this.context.knowledgeManager) {
      return;
    }

    try {
      // Use orchestrator to publish from project to marketplace
      const orchestrator = this.context.knowledgeManager.getTemplateOrchestrator();
      const result = await orchestrator.publishToMarketplace(payload.templateId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to publish template');
      }

      // Get template name for user message
      const projectTemplateManager = this.context.knowledgeManager.getProjectTemplateManager();
      const template = projectTemplateManager.getTemplate(payload.templateId);
      const templateName = template?.name || 'Template';

      logger.debug(
        LogCategory.EXTENSION,
        'Template published via orchestrator',
        'KnowledgeMessageHandler.handlePublishTemplate',
        {
          templateId: result.templateId,
          version: result.version,
          isNewVersion: result.isNewVersion
        },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      // Refresh knowledge data (project templates)
      await this.sendKnowledgeData();

      // Refresh marketplace data to show the published template
      await this.sendMarketplaceTemplates();

      logger.info(
        LogCategory.EXTENSION,
        'Template published successfully',
        'KnowledgeMessageHandler.handlePublishTemplate',
        {
          templateId: result.templateId,
          version: result.version,
          isNewVersion: result.isNewVersion,
          changesSummary: result.changesSummary
        },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      // Send success message with details
      const message = result.isNewVersion
        ? `Template "${templateName}" published as version ${result.version}. ${result.changesSummary}`
        : `Template "${templateName}" published to marketplace as version ${result.version}.`;

      this.context.view?.webview.postMessage({
        type: 'knowledge:publish-success',
        payload: {
          message,
          templateId: result.templateId,
          version: result.version,
          isNewVersion: result.isNewVersion
        }
      });
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to publish template',
        'KnowledgeMessageHandler.handlePublishTemplate',
        { templateId: payload.templateId, error },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      this.context.view?.webview.postMessage({
        type: 'knowledge:error',
        payload: { error: error.message }
      });
    }
  }

  /**
   * Show dialog to create a new knowledge item
   */
  private async showCreateKnowledgeItemDialog(): Promise<void> {
    try {
      // Step 1: Select type
      const typeItems = [
        { label: '📋 ADR', description: 'Architecture Decision Record', value: 'adr' },
        { label: '🎯 Golden Path', description: 'Recommended workflow or approach', value: 'golden-path' },
        { label: '🔧 Design Pattern', description: 'Reusable design solution', value: 'design-pattern' },
        { label: '💡 Tip', description: 'Helpful tip or trick', value: 'tip' },
        { label: '📝 Snippet', description: 'Code snippet', value: 'snippet' },
        { label: '⚙️ Configuration', description: 'Configuration example', value: 'configuration' },
        { label: '📚 Learning', description: 'Something learned', value: 'learning' },
        { label: '🔍 Troubleshooting', description: 'How to solve a problem', value: 'troubleshooting' },
        { label: '⚠️ Gotcha', description: 'Common pitfall or mistake', value: 'gotcha' },
        { label: '📄 Template', description: 'Reusable template', value: 'template' },
        { label: '📖 Guideline', description: 'Guideline or best practice', value: 'guideline' },
        { label: '🔄 Workflow', description: 'Process or workflow', value: 'workflow' },
        { label: '📦 Custom', description: 'Custom knowledge type', value: 'custom' }
      ];

      const selectedType = await vscode.window.showQuickPick(typeItems, {
        placeHolder: 'Select knowledge type',
        title: 'Create Knowledge Item - Step 1/5'
      });

      if (!selectedType) return;

      // Step 2: Select scope
      const scopeItems = [
        { label: '👤 Personal', description: 'Only for you', value: 'personal' },
        { label: '👥 Team', description: 'For your team', value: 'team' },
        { label: '📁 Project', description: 'For this project', value: 'project' },
        { label: '🏢 Organization', description: 'For your organization', value: 'organization' }
      ];

      const selectedScope = await vscode.window.showQuickPick(scopeItems, {
        placeHolder: 'Select scope',
        title: 'Create Knowledge Item - Step 2/5'
      });

      if (!selectedScope) return;

      // Step 3: Enter title
      const title = await vscode.window.showInputBox({
        prompt: 'Enter title',
        placeHolder: 'e.g., "Use dependency injection for services"',
        title: 'Create Knowledge Item - Step 3/5',
        validateInput: (value) => value.trim() ? null : 'Title is required'
      });

      if (!title) return;

      // Step 4: Enter body (optional)
      const body = await vscode.window.showInputBox({
        prompt: 'Enter description (optional, press Enter to skip)',
        placeHolder: 'Markdown content...',
        title: 'Create Knowledge Item - Step 4/5'
      });

      // Step 5: Enter tags (optional)
      const tagsInput = await vscode.window.showInputBox({
        prompt: 'Enter tags separated by commas (optional, press Enter to skip)',
        placeHolder: 'e.g., architecture, patterns, best-practices',
        title: 'Create Knowledge Item - Step 5/5'
      });

      const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

      // Create the item
      await this.handleCreateKnowledgeItem({
        type: selectedType.value,
        scope: selectedScope.value,
        title,
        body: body || '',
        tags
      });

    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to create knowledge item',
        'KnowledgeMessageHandler.showCreateKnowledgeItemDialog',
        error
      );
      vscode.window.showErrorMessage(`Failed to create knowledge item: ${error.message}`);
    }
  }

  // ============================================
  // Marketplace Handlers
  // ============================================

  /**
   * Send marketplace templates to webview
   */
  private async sendMarketplaceTemplates(): Promise<void> {
    logger.debug(
      LogCategory.EXTENSION,
      'Sending marketplace templates to webview',
      'KnowledgeMessageHandler.sendMarketplaceTemplates',
      {},
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      const marketplaceTemplateManager = this.context.knowledgeManager.getMarketplaceTemplateManager();
      const templateRegistry = this.context.knowledgeManager.getTemplateRegistry();

      // Update installation status before sending
      const installed = templateRegistry.getAllInstalled();
      marketplaceTemplateManager.updateInstallationStatus(installed);

      const templates = marketplaceTemplateManager.getAllTemplates();

      logger.info(
        LogCategory.EXTENSION,
        `Loaded ${templates.length} marketplace templates`,
        'KnowledgeMessageHandler.sendMarketplaceTemplates',
        { templateCount: templates.length, installedCount: installed.length },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      this.context.view?.webview.postMessage({
        type: 'marketplace:templates-loaded',
        payload: { templates }
      });
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to load marketplace templates',
        'KnowledgeMessageHandler.sendMarketplaceTemplates',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      this.context.view?.webview.postMessage({
        type: 'marketplace:error',
        payload: { error: error.message }
      });
    }
  }

  /**
   * Handle marketplace refresh request
   * Reloads all templates from disk
   */
  private async handleMarketplaceRefresh(): Promise<void> {
    logger.info(
      LogCategory.EXTENSION,
      'Refreshing marketplace templates',
      'KnowledgeMessageHandler.handleMarketplaceRefresh',
      {},
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      // Reload templates from disk
      const marketplaceManager = this.context.knowledgeManager.getMarketplaceTemplateManager();
      const result = await marketplaceManager.loadAllTemplates();

      // Update installation status
      const templateRegistry = this.context.knowledgeManager.getTemplateRegistry();
      const installed = templateRegistry.getAllInstalled();
      marketplaceManager.updateInstallationStatus(installed);

      logger.info(
        LogCategory.EXTENSION,
        'Marketplace templates refreshed',
        'KnowledgeMessageHandler.handleMarketplaceRefresh',
        {
          bundled: result.bundled,
          user: result.user,
          errors: result.errors.length,
          installedCount: installed.length
        },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      // Send updated templates to webview
      await this.sendMarketplaceTemplates();

      // Show success notification
      vscode.window.showInformationMessage(
        `Marketplace refreshed: ${result.bundled} bundled, ${result.user} user templates loaded`
      );
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to refresh marketplace',
        'KnowledgeMessageHandler.handleMarketplaceRefresh',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      vscode.window.showErrorMessage(`Failed to refresh marketplace: ${error.message}`);

      this.context.view?.webview.postMessage({
        type: 'marketplace:error',
        payload: { error: error.message }
      });
    }
  }

  /**
   * Handle marketplace template installation
   */
  private async handleMarketplaceInstall(payload: { templateId: string }): Promise<void> {
    logger.debug(
      LogCategory.EXTENSION,
      'Installing marketplace template',
      'KnowledgeMessageHandler.handleMarketplaceInstall',
      { templateId: payload.templateId },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      const result = await this.context.knowledgeManager.installMarketplaceTemplate(
        payload.templateId,
        { skipDuplicates: true }
      );

      if (result.success) {
        logger.info(
          LogCategory.EXTENSION,
          'Successfully installed marketplace template',
          'KnowledgeMessageHandler.handleMarketplaceInstall',
          {
            templateId: payload.templateId,
            itemsCreated: result.details?.itemsCreated,
            itemsSkipped: result.details?.itemsSkipped
          },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );

        vscode.window.showInformationMessage(result.message);

        // Notify webview of successful installation
        this.context.view?.webview.postMessage({
          type: 'marketplace:install-success',
          payload: {
            templateId: payload.templateId,
            installedAt: new Date().toISOString()
          }
        });

        // Refresh knowledge data from disk to show newly installed items
        await this.sendKnowledgeData(true); // reload=true to refresh from disk
      } else {
        logger.warn(
          LogCategory.EXTENSION,
          'Failed to install marketplace template',
          'KnowledgeMessageHandler.handleMarketplaceInstall',
          { templateId: payload.templateId, message: result.message },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );

        vscode.window.showErrorMessage(result.message);

        this.context.view?.webview.postMessage({
          type: 'marketplace:install-error',
          payload: {
            templateId: payload.templateId,
            error: result.message
          }
        });
      }
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Exception during marketplace template installation',
        'KnowledgeMessageHandler.handleMarketplaceInstall',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      vscode.window.showErrorMessage(`Failed to install template: ${error.message}`);

      this.context.view?.webview.postMessage({
        type: 'marketplace:install-error',
        payload: {
          templateId: payload.templateId,
          error: error.message
        }
      });
    }
  }

  /**
   * Handle marketplace template uninstallation
   */
  private async handleMarketplaceUninstall(payload: { templateId: string }): Promise<void> {
    logger.debug(
      LogCategory.EXTENSION,
      'Uninstalling marketplace template',
      'KnowledgeMessageHandler.handleMarketplaceUninstall',
      { templateId: payload.templateId },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      const result = await this.context.knowledgeManager.uninstallMarketplaceTemplate(
        payload.templateId
      );

      if (result.success) {
        logger.info(
          LogCategory.EXTENSION,
          'Successfully uninstalled marketplace template',
          'KnowledgeMessageHandler.handleMarketplaceUninstall',
          { templateId: payload.templateId },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );

        vscode.window.showInformationMessage(result.message);

        // Notify webview of successful uninstallation
        this.context.view?.webview.postMessage({
          type: 'marketplace:uninstall-success',
          payload: {
            templateId: payload.templateId
          }
        });

        // Refresh knowledge data from disk to reflect removed items
        await this.sendKnowledgeData(true); // reload=true to refresh from disk
      } else {
        logger.warn(
          LogCategory.EXTENSION,
          'Failed to uninstall marketplace template',
          'KnowledgeMessageHandler.handleMarketplaceUninstall',
          { templateId: payload.templateId, message: result.message },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );

        vscode.window.showErrorMessage(result.message);

        this.context.view?.webview.postMessage({
          type: 'marketplace:uninstall-error',
          payload: {
            templateId: payload.templateId,
            error: result.message
          }
        });
      }
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Exception during marketplace template uninstallation',
        'KnowledgeMessageHandler.handleMarketplaceUninstall',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      vscode.window.showErrorMessage(`Failed to uninstall template: ${error.message}`);

      this.context.view?.webview.postMessage({
        type: 'marketplace:uninstall-error',
        payload: {
          templateId: payload.templateId,
          error: error.message
        }
      });
    }
  }

  /**
   * Handle marketplace template creation
   */
  private async handleMarketplaceCreateTemplate(payload: any): Promise<void> {
    logger.debug(
      LogCategory.EXTENSION,
      'Creating marketplace template',
      'KnowledgeMessageHandler.handleMarketplaceCreateTemplate',
      { name: payload.name },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      const result = await this.context.knowledgeManager.createMarketplaceTemplate({
        name: payload.name,
        description: payload.description,
        category: payload.category,
        tags: payload.tags,
        author: payload.author,
        license: payload.license,
        itemIds: [] // Empty for now - Phase 6 will add item selection
      });

      if (result.success && result.template) {
        logger.info(
          LogCategory.EXTENSION,
          'Successfully created marketplace template',
          'KnowledgeMessageHandler.handleMarketplaceCreateTemplate',
          { templateId: result.template.id, name: result.template.name },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );

        vscode.window.showInformationMessage(result.message);

        // Refresh marketplace templates
        await this.sendMarketplaceTemplates();
      } else {
        logger.warn(
          LogCategory.EXTENSION,
          'Failed to create marketplace template',
          'KnowledgeMessageHandler.handleMarketplaceCreateTemplate',
          { message: result.message },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );

        vscode.window.showErrorMessage(result.message);

        this.context.view?.webview.postMessage({
          type: 'marketplace:create-error',
          payload: { error: result.message }
        });
      }
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Exception during marketplace template creation',
        'KnowledgeMessageHandler.handleMarketplaceCreateTemplate',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      vscode.window.showErrorMessage(`Failed to create template: ${error.message}`);

      this.context.view?.webview.postMessage({
        type: 'marketplace:create-error',
        payload: { error: error.message }
      });
    }
  }

  /**
   * Handle marketplace template export
   */
  private async handleMarketplaceExport(payload: { templateId: string }): Promise<void> {
    logger.debug(
      LogCategory.EXTENSION,
      'Exporting marketplace template',
      'KnowledgeMessageHandler.handleMarketplaceExport',
      { templateId: payload.templateId },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      const marketplaceManager = this.context.knowledgeManager.getMarketplaceTemplateManager();
      const template = marketplaceManager.getTemplate(payload.templateId);

      if (!template) {
        vscode.window.showErrorMessage(`Template not found: ${payload.templateId}`);
        return;
      }

      // Show save dialog
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(`${template.name.toLowerCase().replace(/\s+/g, '-')}.json`),
        filters: {
          'Knowledge Template': ['json']
        },
        saveLabel: 'Export Template'
      });

      if (!uri) {
        // User cancelled
        return;
      }

      // Export template to file
      const result = await marketplaceManager.exportTemplate(template, uri.fsPath);

      if (result.success) {
        logger.info(
          LogCategory.EXTENSION,
          'Successfully exported marketplace template',
          'KnowledgeMessageHandler.handleMarketplaceExport',
          { templateId: payload.templateId, filePath: result.filePath },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );

        vscode.window.showInformationMessage(
          `Template "${template.name}" exported successfully to ${result.filePath}`
        );

        this.context.view?.webview.postMessage({
          type: 'marketplace:export-success',
          payload: {
            templateId: payload.templateId,
            filePath: result.filePath
          }
        });
      } else {
        logger.warn(
          LogCategory.EXTENSION,
          'Failed to export marketplace template',
          'KnowledgeMessageHandler.handleMarketplaceExport',
          { templateId: payload.templateId, message: result.message },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );

        vscode.window.showErrorMessage(result.message || 'Export failed');

        this.context.view?.webview.postMessage({
          type: 'marketplace:export-error',
          payload: {
            templateId: payload.templateId,
            error: result.message
          }
        });
      }
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Exception during marketplace template export',
        'KnowledgeMessageHandler.handleMarketplaceExport',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      vscode.window.showErrorMessage(`Failed to export template: ${error.message}`);

      this.context.view?.webview.postMessage({
        type: 'marketplace:export-error',
        payload: {
          templateId: payload.templateId,
          error: error.message
        }
      });
    }
  }

  /**
   * Handle marketplace template import
   */
  private async handleMarketplaceImport(payload: any): Promise<void> {
    logger.debug(
      LogCategory.EXTENSION,
      'Importing marketplace template',
      'KnowledgeMessageHandler.handleMarketplaceImport',
      {},
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      // Show open dialog
      const uris = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
          'Knowledge Template': ['json']
        },
        openLabel: 'Import Template'
      });

      if (!uris || uris.length === 0) {
        // User cancelled
        return;
      }

      const filePath = uris[0].fsPath;

      // Import template from file
      const marketplaceManager = this.context.knowledgeManager.getMarketplaceTemplateManager();
      const result = await marketplaceManager.importTemplate(filePath);

      if (result.success && result.template) {
        logger.info(
          LogCategory.EXTENSION,
          'Successfully imported marketplace template',
          'KnowledgeMessageHandler.handleMarketplaceImport',
          { templateId: result.template.id, name: result.template.name },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );

        // Send validation result to webview for user review
        this.context.view?.webview.postMessage({
          type: 'marketplace:import-validation-complete',
          payload: {
            template: result.template,
            validationResult: result.validationResult
          }
        });
      } else {
        logger.warn(
          LogCategory.EXTENSION,
          'Failed to import marketplace template',
          'KnowledgeMessageHandler.handleMarketplaceImport',
          { message: result.message, errors: result.errors },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );

        // Show detailed error message
        const errorDetails = result.errors && result.errors.length > 0
          ? `\n\nErrors:\n${result.errors.join('\n')}`
          : '';

        vscode.window.showErrorMessage(result.message + errorDetails);

        this.context.view?.webview.postMessage({
          type: 'marketplace:import-error',
          payload: {
            error: result.message,
            errors: result.errors
          }
        });
      }
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Exception during marketplace template import',
        'KnowledgeMessageHandler.handleMarketplaceImport',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      vscode.window.showErrorMessage(`Failed to import template: ${error.message}`);

      this.context.view?.webview.postMessage({
        type: 'marketplace:import-error',
        payload: {
          error: error.message
        }
      });
    }
  }

  /**
   * Handle marketplace import confirmation (after user reviews validation)
   */
  private async handleMarketplaceConfirmImport(payload: any): Promise<void> {
    const { template } = payload;

    logger.info(
      LogCategory.EXTENSION,
      'User confirmed marketplace template import',
      'KnowledgeMessageHandler.handleMarketplaceConfirmImport',
      { templateId: template.id, name: template.name },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      // Template is already imported to marketplace, just show success
      vscode.window.showInformationMessage(
        `Template "${template.name}" imported successfully to marketplace`
      );

      // Refresh marketplace templates
      await this.sendMarketplaceTemplates();

      this.context.view?.webview.postMessage({
        type: 'marketplace:import-success',
        payload: { template }
      });
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to confirm template import',
        'KnowledgeMessageHandler.handleMarketplaceConfirmImport',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      vscode.window.showErrorMessage(`Failed to complete import: ${error.message}`);
    }
  }

  /**
   * Handle marketplace template deletion (user templates only)
   */
  private async handleMarketplaceDelete(payload: any): Promise<void> {
    const { templateId } = payload;

    logger.info(
      LogCategory.EXTENSION,
      'Deleting marketplace template',
      'KnowledgeMessageHandler.handleMarketplaceDelete',
      { templateId },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      const marketplaceManager = this.context.knowledgeManager.getMarketplaceTemplateManager();
      const template = marketplaceManager.getTemplate(templateId);

      if (!template) {
        vscode.window.showErrorMessage('Template not found');
        return;
      }

      // Only allow deleting user templates
      if (template.source === 'bundled') {
        vscode.window.showWarningMessage('Cannot delete bundled templates');
        return;
      }

      // Delete the template file from marketplace/templates/
      const result = await this.context.knowledgeManager.deleteMarketplaceTemplate(templateId);

      if (result.success) {
        logger.info(
          LogCategory.EXTENSION,
          'Successfully deleted marketplace template',
          'KnowledgeMessageHandler.handleMarketplaceDelete',
          { templateId, name: template.name },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );

        vscode.window.showInformationMessage(
          `Template "${template.name}" deleted from marketplace`
        );

        // Send updated marketplace templates to webview
        // (deleteMarketplaceTemplate already removed from memory)
        await this.sendMarketplaceTemplates();

        this.context.view?.webview.postMessage({
          type: 'marketplace:delete-success',
          payload: { templateId }
        });
      } else {
        vscode.window.showErrorMessage(result.message || 'Failed to delete template');
      }
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Exception during marketplace template deletion',
        'KnowledgeMessageHandler.handleMarketplaceDelete',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      vscode.window.showErrorMessage(`Failed to delete template: ${error.message}`);
    }
  }

  /**
   * Handle project template deletion
   * Deletes template file from .agent-brain/templates/ folder
   */
  private async handleDeleteProjectTemplate(payload: any): Promise<void> {
    const { templateId } = payload;

    logger.info(
      LogCategory.EXTENSION,
      'Deleting project template',
      'KnowledgeMessageHandler.handleDeleteProjectTemplate',
      { templateId },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      // Delete the template file from project templates folder
      const result = await this.context.knowledgeManager.deleteProjectTemplate(templateId);

      if (result.success) {
        logger.info(
          LogCategory.EXTENSION,
          'Successfully deleted project template',
          'KnowledgeMessageHandler.handleDeleteProjectTemplate',
          { templateId },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );

        vscode.window.showInformationMessage(
          `Template deleted from project`
        );

        // Refresh knowledge data (reloads local templates and sends to webview)
        await this.sendKnowledgeData(true);

        this.context.view?.webview.postMessage({
          type: 'knowledge:delete-success',
          payload: { templateId }
        });
      } else {
        vscode.window.showErrorMessage(result.message || 'Failed to delete template');
      }
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Exception during project template deletion',
        'KnowledgeMessageHandler.handleDeleteProjectTemplate',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      vscode.window.showErrorMessage(`Failed to delete template: ${error.message}`);
    }
  }

  // ==========================================================================
  // V1 TEMPLATE SECTIONS MESSAGE HANDLERS (Phase 4)
  // ==========================================================================

  /**
   * Handle v1:get-templates - Get all V1 templates
   */
  private async handleV1GetTemplates(): Promise<void> {
    try {
      logger.debug(
        LogCategory.EXTENSION,
        'Handling v1:get-templates',
        'KnowledgeMessageHandler.handleV1GetTemplates',
        {},
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      const templates = await this.context.knowledgeManager.getV1Templates();

      this.context.view?.webview.postMessage({
        type: 'v1:templates-data',
        payload: { templates }
      });
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to get V1 templates',
        'KnowledgeMessageHandler.handleV1GetTemplates',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      this.context.view?.webview.postMessage({
        type: 'v1:error',
        payload: { message: error.message, operation: 'get-templates' }
      });
    }
  }

  /**
   * Handle v1:get-template - Get specific V1 template
   */
  private async handleV1GetTemplate(payload: { templateId: string }): Promise<void> {
    try {
      logger.debug(
        LogCategory.EXTENSION,
        'Handling v1:get-template',
        'KnowledgeMessageHandler.handleV1GetTemplate',
        { templateId: payload.templateId },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      const template = await this.context.knowledgeManager.getV1Template(payload.templateId);

      this.context.view?.webview.postMessage({
        type: 'v1:template-data',
        payload: { template }
      });
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to get V1 template',
        'KnowledgeMessageHandler.handleV1GetTemplate',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      this.context.view?.webview.postMessage({
        type: 'v1:error',
        payload: { message: error.message, operation: 'get-template' }
      });
    }
  }

  /**
   * Handle v1:create-template - Create new V1 template
   */
  private async handleV1CreateTemplate(payload: {
    name: string;
    description: string;
    category: string;
    tags: string[];
    scope?: string;
  }): Promise<void> {
    try {
      logger.info(
        LogCategory.EXTENSION,
        'Handling v1:create-template',
        'KnowledgeMessageHandler.handleV1CreateTemplate',
        { name: payload.name },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      const template = await this.context.knowledgeManager.createV1Template(payload);

      vscode.window.showInformationMessage(`Template "${template.name}" created successfully`);

      this.context.view?.webview.postMessage({
        type: 'v1:template-created',
        payload: { template }
      });

      // Refresh templates list
      await this.handleV1GetTemplates();
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to create V1 template',
        'KnowledgeMessageHandler.handleV1CreateTemplate',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      vscode.window.showErrorMessage(`Failed to create template: ${error.message}`);

      this.context.view?.webview.postMessage({
        type: 'v1:error',
        payload: { message: error.message, operation: 'create-template' }
      });
    }
  }

  /**
   * Handle v1:add-item - Add item to V1 template
   */
  private async handleV1AddItem(payload: {
    templateId: string;
    title: string;
    body: string;
    type: string;
    scope: string;
    tags: string[];
  }): Promise<void> {
    try {
      logger.info(
        LogCategory.EXTENSION,
        'Handling v1:add-item',
        'KnowledgeMessageHandler.handleV1AddItem',
        { templateId: payload.templateId, title: payload.title },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      const item = await this.context.knowledgeManager.addItemToV1Template(
        payload.templateId,
        {
          title: payload.title,
          body: payload.body,
          type: payload.type,
          scope: payload.scope,
          tags: payload.tags
        }
      );

      vscode.window.showInformationMessage(`Item "${item.title}" added successfully`);

      this.context.view?.webview.postMessage({
        type: 'v1:item-added',
        payload: { templateId: payload.templateId, item }
      });

      // Refresh template data
      await this.handleV1GetTemplate({ templateId: payload.templateId });
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to add V1 item',
        'KnowledgeMessageHandler.handleV1AddItem',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      vscode.window.showErrorMessage(`Failed to add item: ${error.message}`);

      this.context.view?.webview.postMessage({
        type: 'v1:error',
        payload: { message: error.message, operation: 'add-item' }
      });
    }
  }

  /**
   * Handle v1:update-item - Update item in V1 template
   */
  private async handleV1UpdateItem(payload: {
    templateId: string;
    itemId: string;
    updates: {
      title?: string;
      body?: string;
      type?: string;
      scope?: string;
      tags?: string[];
    };
  }): Promise<void> {
    try {
      logger.info(
        LogCategory.EXTENSION,
        'Handling v1:update-item',
        'KnowledgeMessageHandler.handleV1UpdateItem',
        { templateId: payload.templateId, itemId: payload.itemId },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      await this.context.knowledgeManager.updateV1Item(
        payload.templateId,
        payload.itemId,
        payload.updates
      );

      vscode.window.showInformationMessage('Item updated successfully');

      this.context.view?.webview.postMessage({
        type: 'v1:item-updated',
        payload: { templateId: payload.templateId, itemId: payload.itemId }
      });

      // Refresh template data
      await this.handleV1GetTemplate({ templateId: payload.templateId });
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to update V1 item',
        'KnowledgeMessageHandler.handleV1UpdateItem',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      vscode.window.showErrorMessage(`Failed to update item: ${error.message}`);

      this.context.view?.webview.postMessage({
        type: 'v1:error',
        payload: { message: error.message, operation: 'update-item' }
      });
    }
  }

  /**
   * Handle v1:delete-item - Delete item from V1 template
   */
  private async handleV1DeleteItem(payload: {
    templateId: string;
    itemId: string;
  }): Promise<void> {
    try {
      logger.info(
        LogCategory.EXTENSION,
        'Handling v1:delete-item',
        'KnowledgeMessageHandler.handleV1DeleteItem',
        { templateId: payload.templateId, itemId: payload.itemId },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      await this.context.knowledgeManager.deleteV1Item(
        payload.templateId,
        payload.itemId
      );

      vscode.window.showInformationMessage('Item deleted successfully');

      this.context.view?.webview.postMessage({
        type: 'v1:item-deleted',
        payload: { templateId: payload.templateId, itemId: payload.itemId }
      });

      // Refresh template data
      await this.handleV1GetTemplate({ templateId: payload.templateId });
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to delete V1 item',
        'KnowledgeMessageHandler.handleV1DeleteItem',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      vscode.window.showErrorMessage(`Failed to delete item: ${error.message}`);

      this.context.view?.webview.postMessage({
        type: 'v1:error',
        payload: { message: error.message, operation: 'delete-item' }
      });
    }
  }

  /**
   * Handle v1:create-version - Create version checkpoint
   */
  private async handleV1CreateVersion(payload: {
    templateId: string;
    versionNumber: string;
    description: string;
  }): Promise<void> {
    try {
      logger.info(
        LogCategory.EXTENSION,
        'Handling v1:create-version',
        'KnowledgeMessageHandler.handleV1CreateVersion',
        { templateId: payload.templateId, version: payload.versionNumber },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      await this.context.knowledgeManager.createV1Version(
        payload.templateId,
        {
          versionNumber: payload.versionNumber,
          description: payload.description
        }
      );

      vscode.window.showInformationMessage(`Version ${payload.versionNumber} created successfully`);

      this.context.view?.webview.postMessage({
        type: 'v1:version-created',
        payload: { templateId: payload.templateId, versionNumber: payload.versionNumber }
      });

      // Refresh template data
      await this.handleV1GetTemplate({ templateId: payload.templateId });
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to create V1 version',
        'KnowledgeMessageHandler.handleV1CreateVersion',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      vscode.window.showErrorMessage(`Failed to create version: ${error.message}`);

      this.context.view?.webview.postMessage({
        type: 'v1:error',
        payload: { message: error.message, operation: 'create-version' }
      });
    }
  }

  /**
   * Handle v1:clone-template - Clone V1 template
   */
  private async handleV1CloneTemplate(payload: {
    templateId: string;
    newName?: string;
    shallow?: boolean;
  }): Promise<void> {
    try {
      logger.info(
        LogCategory.EXTENSION,
        'Handling v1:clone-template',
        'KnowledgeMessageHandler.handleV1CloneTemplate',
        { templateId: payload.templateId, newName: payload.newName },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      const clonedTemplate = await this.context.knowledgeManager.cloneV1Template(
        payload.templateId,
        {
          newName: payload.newName,
          shallow: payload.shallow
        }
      );

      vscode.window.showInformationMessage(`Template cloned as "${clonedTemplate.name}"`);

      this.context.view?.webview.postMessage({
        type: 'v1:template-cloned',
        payload: { template: clonedTemplate }
      });

      // Refresh templates list
      await this.handleV1GetTemplates();
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to clone V1 template',
        'KnowledgeMessageHandler.handleV1CloneTemplate',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      vscode.window.showErrorMessage(`Failed to clone template: ${error.message}`);

      this.context.view?.webview.postMessage({
        type: 'v1:error',
        payload: { message: error.message, operation: 'clone-template' }
      });
    }
  }

  /**
   * Handle v1:get-audit-log - Get audit log for template
   */
  private async handleV1GetAuditLog(payload: { templateId: string }): Promise<void> {
    try {
      logger.debug(
        LogCategory.EXTENSION,
        'Handling v1:get-audit-log',
        'KnowledgeMessageHandler.handleV1GetAuditLog',
        { templateId: payload.templateId },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      const auditLog = await this.context.knowledgeManager.getV1AuditLog(payload.templateId);

      this.context.view?.webview.postMessage({
        type: 'v1:audit-log-data',
        payload: { templateId: payload.templateId, auditLog }
      });
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to get V1 audit log',
        'KnowledgeMessageHandler.handleV1GetAuditLog',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      this.context.view?.webview.postMessage({
        type: 'v1:error',
        payload: { message: error.message, operation: 'get-audit-log' }
      });
    }
  }

  /**
   * Handle v1:check-enabled - Check if V1 features are enabled
   */
  private async handleV1CheckEnabled(): Promise<void> {
    try {
      logger.debug(
        LogCategory.EXTENSION,
        'Handling v1:check-enabled',
        'KnowledgeMessageHandler.handleV1CheckEnabled',
        {},
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      const enabled = this.context.knowledgeManager.isV1Enabled();

      this.context.view?.webview.postMessage({
        type: 'v1:enabled-status',
        payload: { enabled }
      });
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to check V1 enabled status',
        'KnowledgeMessageHandler.handleV1CheckEnabled',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      this.context.view?.webview.postMessage({
        type: 'v1:error',
        payload: { message: error.message, operation: 'check-enabled' }
      });
    }
  }

  private async handleV1ImportTemplate(payload: { templateJson: any }): Promise<void> {
    try {
      logger.debug(
        LogCategory.EXTENSION,
        'Handling v1:import-template',
        'KnowledgeMessageHandler.handleV1ImportTemplate',
        {},
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      const template = await this.context.knowledgeManager.importV1Template(payload.templateJson);

      vscode.window.showInformationMessage(`Template "${template.name}" imported successfully`);

      this.context.view?.webview.postMessage({
        type: 'v1:import-success',
        payload: { template }
      });

      // Refresh template list
      await this.handleV1GetTemplates();
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to import template',
        'KnowledgeMessageHandler.handleV1ImportTemplate',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      vscode.window.showErrorMessage(`Failed to import template: ${error.message}`);

      this.context.view?.webview.postMessage({
        type: 'v1:error',
        payload: { message: error.message, operation: 'import-template' }
      });
    }
  }

  private async handleV1InjectTemplate(payload: { templateId: string; filePath?: string }): Promise<void> {
    try {
      logger.debug(
        LogCategory.EXTENSION,
        'Handling v1:inject-template',
        'KnowledgeMessageHandler.handleV1InjectTemplate',
        { templateId: payload.templateId },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      // Get target file path (use focused file if not provided)
      let targetFilePath = payload.filePath;
      if (!targetFilePath) {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
          throw new Error('No file is currently open');
        }
        targetFilePath = activeEditor.document.uri.fsPath;
      }

      await this.context.knowledgeManager.injectV1Template(payload.templateId, targetFilePath);

      vscode.window.showInformationMessage(`Template injected to ${targetFilePath}`);

      this.context.view?.webview.postMessage({
        type: 'v1:inject-template-success',
        payload: { templateId: payload.templateId, filePath: targetFilePath }
      });
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to inject template',
        'KnowledgeMessageHandler.handleV1InjectTemplate',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      vscode.window.showErrorMessage(`Failed to inject template: ${error.message}`);

      this.context.view?.webview.postMessage({
        type: 'v1:error',
        payload: { message: error.message, operation: 'inject-template' }
      });
    }
  }

  private async handleV1ExportTemplate(payload: { templateId: string }): Promise<void> {
    try {
      logger.debug(
        LogCategory.EXTENSION,
        'Handling v1:export-template',
        'KnowledgeMessageHandler.handleV1ExportTemplate',
        { templateId: payload.templateId },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      const filePath = await this.context.knowledgeManager.exportV1Template(payload.templateId);

      vscode.window.showInformationMessage(`Template exported to ${filePath}`);

      this.context.view?.webview.postMessage({
        type: 'v1:export-success',
        payload: { templateId: payload.templateId, filePath }
      });
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to export template',
        'KnowledgeMessageHandler.handleV1ExportTemplate',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      vscode.window.showErrorMessage(`Failed to export template: ${error.message}`);

      this.context.view?.webview.postMessage({
        type: 'v1:error',
        payload: { message: error.message, operation: 'export-template' }
      });
    }
  }

  private async handleV1InjectItem(payload: { templateId: string; itemId: string; filePath?: string }): Promise<void> {
    try {
      logger.debug(
        LogCategory.EXTENSION,
        'Handling v1:inject-item',
        'KnowledgeMessageHandler.handleV1InjectItem',
        { templateId: payload.templateId, itemId: payload.itemId },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      // Get target file path (use focused file if not provided)
      let targetFilePath = payload.filePath;
      if (!targetFilePath) {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
          throw new Error('No file is currently open');
        }
        targetFilePath = activeEditor.document.uri.fsPath;
      }

      await this.context.knowledgeManager.injectV1Item(payload.templateId, payload.itemId, targetFilePath);

      vscode.window.showInformationMessage(`Item injected to ${targetFilePath}`);

      this.context.view?.webview.postMessage({
        type: 'v1:inject-item-success',
        payload: { templateId: payload.templateId, itemId: payload.itemId, filePath: targetFilePath }
      });
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to inject item',
        'KnowledgeMessageHandler.handleV1InjectItem',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      vscode.window.showErrorMessage(`Failed to inject item: ${error.message}`);

      this.context.view?.webview.postMessage({
        type: 'v1:error',
        payload: { message: error.message, operation: 'inject-item' }
      });
    }
  }

  private async handleV1MoveItem(payload: { itemId: string; fromTemplateId: string; toTemplateId: string }): Promise<void> {
    try {
      logger.debug(
        LogCategory.EXTENSION,
        'Handling v1:move-item',
        'KnowledgeMessageHandler.handleV1MoveItem',
        { itemId: payload.itemId, fromTemplateId: payload.fromTemplateId, toTemplateId: payload.toTemplateId },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      await this.context.knowledgeManager.moveV1Item(payload.itemId, payload.fromTemplateId, payload.toTemplateId);

      vscode.window.showInformationMessage('Item moved successfully');

      this.context.view?.webview.postMessage({
        type: 'v1:move-item-success',
        payload: { itemId: payload.itemId, fromTemplateId: payload.fromTemplateId, toTemplateId: payload.toTemplateId }
      });

      // Refresh template list
      await this.handleV1GetTemplates();
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to move item',
        'KnowledgeMessageHandler.handleV1MoveItem',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      vscode.window.showErrorMessage(`Failed to move item: ${error.message}`);

      this.context.view?.webview.postMessage({
        type: 'v1:error',
        payload: { message: error.message, operation: 'move-item' }
      });
    }
  }

  private async handleV1CopyItem(payload: { itemId: string; fromTemplateId: string; toTemplateId: string }): Promise<void> {
    try {
      logger.debug(
        LogCategory.EXTENSION,
        'Handling v1:copy-item',
        'KnowledgeMessageHandler.handleV1CopyItem',
        { itemId: payload.itemId, fromTemplateId: payload.fromTemplateId, toTemplateId: payload.toTemplateId },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      await this.context.knowledgeManager.copyV1Item(payload.itemId, payload.fromTemplateId, payload.toTemplateId);

      vscode.window.showInformationMessage('Item copied successfully');

      this.context.view?.webview.postMessage({
        type: 'v1:copy-item-success',
        payload: { itemId: payload.itemId, fromTemplateId: payload.fromTemplateId, toTemplateId: payload.toTemplateId }
      });

      // Refresh template list
      await this.handleV1GetTemplates();
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to copy item',
        'KnowledgeMessageHandler.handleV1CopyItem',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      vscode.window.showErrorMessage(`Failed to copy item: ${error.message}`);

      this.context.view?.webview.postMessage({
        type: 'v1:error',
        payload: { message: error.message, operation: 'copy-item' }
      });
    }
  }

  private async handleV1DeleteTemplate(payload: { templateId: string }): Promise<void> {
    try {
      logger.debug(
        LogCategory.EXTENSION,
        'Handling v1:delete-template',
        'KnowledgeMessageHandler.handleV1DeleteTemplate',
        { templateId: payload.templateId },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      await this.context.knowledgeManager.deleteV1Template(payload.templateId);

      vscode.window.showInformationMessage('Template deleted successfully');

      this.context.view?.webview.postMessage({
        type: 'v1:delete-template-success',
        payload: { templateId: payload.templateId }
      });

      // Refresh template list
      await this.handleV1GetTemplates();
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to delete template',
        'KnowledgeMessageHandler.handleV1DeleteTemplate',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      vscode.window.showErrorMessage(`Failed to delete template: ${error.message}`);

      this.context.view?.webview.postMessage({
        type: 'v1:error',
        payload: { message: error.message, operation: 'delete-template' }
      });
    }
  }

  private async handleV1UpdateTemplate(payload: {
    templateId: string;
    updates: {
      name?: string;
      description?: string;
      category?: string;
      tags?: string[];
      scope?: string;
    };
  }): Promise<void> {
    try {
      logger.debug(
        LogCategory.EXTENSION,
        'Handling v1:update-template',
        'KnowledgeMessageHandler.handleV1UpdateTemplate',
        { templateId: payload.templateId },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      await this.context.knowledgeManager.updateV1Template(payload.templateId, payload.updates);

      vscode.window.showInformationMessage('Template updated successfully');

      this.context.view?.webview.postMessage({
        type: 'v1:update-template-success',
        payload: { templateId: payload.templateId }
      });

      // Refresh template list
      await this.handleV1GetTemplates();
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to update template',
        'KnowledgeMessageHandler.handleV1UpdateTemplate',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      vscode.window.showErrorMessage(`Failed to update template: ${error.message}`);

      this.context.view?.webview.postMessage({
        type: 'v1:error',
        payload: { message: error.message, operation: 'update-template' }
      });
    }
  }
}
