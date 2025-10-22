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
        await this.sendKnowledgeData();
        return true;

      case 'knowledge:scan-claude-files':
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

      case 'knowledge:export-template':
        await this.handleExportTemplate(message.payload);
        return true;

      case 'knowledge:import-template':
        await this.handleImportTemplate(message.payload);
        return true;

      case 'knowledge:showCreateDialog':
        await this.showCreateKnowledgeItemDialog();
        return true;

      case 'marketplace:request-templates':
        await this.sendMarketplaceTemplates();
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

      default:
        return false; // Not handled by this handler
    }
  }

  /**
   * Send knowledge data to webview
   */
  public async sendKnowledgeData(): Promise<void> {
    logger.debug(
      LogCategory.EXTENSION,
      'Sending knowledge data to webview',
      'KnowledgeMessageHandler.sendKnowledgeData',
      {
        hasKnowledgeManager: !!this.context.knowledgeManager,
        hasView: !!this.context.view
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
      const store = this.context.knowledgeManager.getStore();
      const marketplaceManager = this.context.knowledgeManager.getMarketplaceManager();
      const items = store.getAllItems();
      const templates = marketplaceManager.getAllTemplates();

      logger.info(
        LogCategory.EXTENSION,
        'Retrieved knowledge data from store and marketplace',
        'KnowledgeMessageHandler.sendKnowledgeData',
        {
          itemCount: items.length,
          templateCount: templates.length,
          items: items.map((i: any) => ({ id: i.id, type: i.type, title: i.title })),
          templates: templates.map((t: any) => ({ id: t.id, name: t.name, itemCount: t.itemIds?.length }))
        },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      this.context.view.webview.postMessage({
        type: 'knowledge:loaded',
        payload: { items, templates }
      });

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
      await this.context.knowledgeManager.createTemplate(payload);
      await this.sendKnowledgeData();

      this.context.view?.webview.postMessage({
        type: 'knowledge:success',
        payload: { message: 'Template created successfully' }
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
      await this.sendKnowledgeData();

      const store = this.context.knowledgeManager.getStore();
      const template = store.getTemplate(payload.templateId);
      const templateName = template?.name || 'Template';

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
      const store = this.context.knowledgeManager.getStore();
      const template = store.getTemplate(payload.templateId);
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
   * Handle export template
   */
  private async handleExportTemplate(payload: any): Promise<void> {
    if (!this.context.knowledgeManager) {
      return;
    }

    try {
      const path = await this.context.knowledgeManager.exportTemplate(payload.templateId);

      this.context.view?.webview.postMessage({
        type: 'knowledge:success',
        payload: { message: `Template exported to ${path}` }
      });
    } catch (error: any) {
      this.context.view?.webview.postMessage({
        type: 'knowledge:error',
        payload: { error: error.message }
      });
    }
  }

  /**
   * Handle import template from file
   */
  private async handleImportTemplate(payload: any): Promise<void> {
    if (!this.context.knowledgeManager) {
      return;
    }

    try {
      // Show file picker dialog
      const fileUris = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
          'Markdown': ['md'],
          'All Files': ['*']
        },
        title: 'Select Template File to Import'
      });

      if (!fileUris || fileUris.length === 0) {
        return; // User cancelled
      }

      const filePath = fileUris[0].fsPath;

      // Import the template (using default options: skip conflicts, skip duplicate items)
      const result = await this.context.knowledgeManager.importTemplateFromFile(filePath, {
        conflictResolution: 'skip',
        skipDuplicateItems: true
      });

      // Refresh knowledge data
      await this.sendKnowledgeData();

      if (result.success) {
        // Send success with details
        const details = [];
        if (result.itemsCreated > 0) details.push(`${result.itemsCreated} items created`);
        if (result.itemsUpdated > 0) details.push(`${result.itemsUpdated} items updated`);
        if (result.itemsSkipped > 0) details.push(`${result.itemsSkipped} items skipped`);

        const message = `Template "${result.templateName}" imported successfully` +
          (details.length > 0 ? `: ${details.join(', ')}` : '');

        this.context.view?.webview.postMessage({
          type: 'knowledge:import-success',
          payload: {
            message,
            templateId: result.templateId,
            warnings: result.warnings
          }
        });
      } else {
        // Send errors
        this.context.view?.webview.postMessage({
          type: 'knowledge:error',
          payload: {
            error: result.errors.join(', '),
            warnings: result.warnings
          }
        });
      }
    } catch (error: any) {
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
      const marketplaceManager = this.context.knowledgeManager.getMarketplaceManager();
      const templates = marketplaceManager.getAllTemplates();

      logger.info(
        LogCategory.EXTENSION,
        `Loaded ${templates.length} marketplace templates`,
        'KnowledgeMessageHandler.sendMarketplaceTemplates',
        { templateCount: templates.length },
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

        // Refresh knowledge data to show newly installed items
        await this.sendKnowledgeData();
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

        // Refresh knowledge data to reflect removed items
        await this.sendKnowledgeData();
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
      const marketplaceManager = this.context.knowledgeManager.getMarketplaceManager();
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
      const marketplaceManager = this.context.knowledgeManager.getMarketplaceManager();
      const result = await marketplaceManager.importTemplate(filePath);

      if (result.success && result.template) {
        logger.info(
          LogCategory.EXTENSION,
          'Successfully imported marketplace template',
          'KnowledgeMessageHandler.handleMarketplaceImport',
          { templateId: result.template.id, name: result.template.name },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );

        vscode.window.showInformationMessage(
          `Template "${result.template.name}" imported successfully`
        );

        // Refresh marketplace templates
        await this.sendMarketplaceTemplates();

        this.context.view?.webview.postMessage({
          type: 'marketplace:import-success',
          payload: {
            template: result.template
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
}
