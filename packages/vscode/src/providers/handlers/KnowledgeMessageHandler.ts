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

      case 'v1:import-template':
        await this.handleV1ImportTemplate(message.payload);
        return true;

      case 'v1:inject-template':
        await this.handleV1InjectTemplate(message.payload);
        return true;

      case 'v1:preview-template-injection':
        console.log('[KnowledgeMessageHandler] Received v1:preview-template-injection:', message.payload);
        await this.handleV1PreviewTemplateInjection(message.payload);
        return true;

      case 'v1:inject-template-confirmed':
        console.log('[KnowledgeMessageHandler] Received v1:inject-template-confirmed:', message.payload);
        await this.handleV1InjectTemplateConfirmed(message.payload);
        return true;

      case 'v1:export-template':
        await this.handleV1ExportTemplate(message.payload);
        return true;

      case 'v1:inject-item':
        await this.handleV1InjectItem(message.payload);
        return true;

      case 'v1:get-item-audit':
        await this.handleV1GetItemAudit(message.payload);
        return true;

      case 'v1:move-item':
        await this.handleV1MoveItem(message.payload);
        return true;

      case 'v1:copy-item':
        await this.handleV1CopyItem(message.payload);
        return true;

      case 'v1:reorder-item':
        await this.handleV1ReorderItem(message.payload);
        return true;

      case 'v1:delete-template':
        await this.handleV1DeleteTemplate(message.payload);
        return true;

      case 'v1:update-template':
        await this.handleV1UpdateTemplate(message.payload);
        return true;

      case 'v1:remove-injected-template':
        await this.handleV1RemoveInjectedTemplate(message.payload);
        return true;

      case 'v2:remove-injection':
        await this.handleV2RemoveInjection(message.payload);
        return true;

      // Group operations (new grouping system)
      case 'group:inject':
        await this.handleGroupInject(message.payload);
        return true;

      case 'group:remove':
        await this.handleGroupRemove(message.payload);
        return true;

      // Maturity-based filtering
      case 'maturity:get-context':
        await this.handleGetMaturityContext();
        return true;

      case 'maturity:save-context':
        await this.handleSaveMaturityContext(message.payload);
        return true;

      case 'maturity:update-context':
        await this.handleUpdateMaturityContext(message.payload);
        return true;

      default:
        return false; // Not handled by this handler
    }
  }

  /**
   * Send V1 templates to webview (replaces old sendKnowledgeData)
   */
  public async sendKnowledgeData(): Promise<void> {
    logger.debug(
      LogCategory.EXTENSION,
      'Sending V1 templates to webview',
      'KnowledgeMessageHandler.sendKnowledgeData',
      {},
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Simply trigger V1 templates load
    await this.handleV1GetTemplates();
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

      // Refresh all templates FIRST (this sends updated data to webview)
      await this.handleV1GetTemplates();

      // THEN send success message and notification
      vscode.window.showInformationMessage(`Item "${item.title}" added successfully`);

      this.context.view?.webview.postMessage({
        type: 'v1:item-added',
        payload: { templateId: payload.templateId, item }
      });
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
      maturity?: import('@agent-brain/core/domains/knowledge/types').MaturityFootprint;
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

      // Refresh all templates FIRST (this sends updated data to webview)
      await this.handleV1GetTemplates();

      // THEN send success message and notification
      vscode.window.showInformationMessage('Item updated successfully');

      this.context.view?.webview.postMessage({
        type: 'v1:update-item-success',
        payload: { templateId: payload.templateId, itemId: payload.itemId }
      });
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

      // Refresh all templates FIRST (this sends updated data to webview)
      await this.handleV1GetTemplates();

      // THEN send success message and notification
      vscode.window.showInformationMessage('Item deleted successfully');

      this.context.view?.webview.postMessage({
        type: 'v1:delete-item-success',
        payload: { templateId: payload.templateId, itemId: payload.itemId }
      });
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

      // Get target file path (should be provided from UI)
      let targetFilePath = payload.filePath;
      if (!targetFilePath) {
        throw new Error('No file path provided. Please select a claude.md file in the UI.');
      }

      await this.context.knowledgeManager.injectV1Template(payload.templateId, targetFilePath);

      // Refresh claude.md file statistics
      await this.sendClaudeMdFiles();

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

  /**
   * Handle v1:preview-template-injection - Generate preview for maturity-based injection
   */
  private async handleV1PreviewTemplateInjection(payload: {
    templateId: string;
    filePath?: string;
    maturityContext?: any;
  }): Promise<void> {
    try {
      console.log('[KnowledgeMessageHandler] handleV1PreviewTemplateInjection started with payload:', payload);

      logger.debug(
        LogCategory.EXTENSION,
        'Handling v1:preview-template-injection',
        'KnowledgeMessageHandler.handleV1PreviewTemplateInjection',
        { templateId: payload.templateId },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      // Get target file path (use focused file if not provided)
      let targetFilePath = payload.filePath;
      console.log('[KnowledgeMessageHandler] Initial targetFilePath:', targetFilePath);

      if (!targetFilePath) {
        console.log('[KnowledgeMessageHandler] No filePath in payload');
        throw new Error('No file path provided. Please select a claude.md file in the UI.');
      }

      // Generate preview using maturity context
      console.log('[KnowledgeMessageHandler] Calling previewMaturityInjection...');
      const preview = await this.context.knowledgeManager.previewMaturityInjection(
        payload.templateId,
        payload.maturityContext
      );
      console.log('[KnowledgeMessageHandler] Preview generated:', {
        matchedItems: preview.matchedItems?.length,
        excludedItems: preview.excludedItems?.length,
        totalItems: preview.totalItems
      });

      // Send preview data back to webview
      const responseMessage = {
        type: 'v1:preview-injection-data',
        payload: {
          preview,
          templateId: payload.templateId,
          filePath: targetFilePath
        }
      };
      console.log('[KnowledgeMessageHandler] Sending response to webview:', responseMessage);
      this.context.view?.webview.postMessage(responseMessage);
      console.log('[KnowledgeMessageHandler] Response sent to webview');

      logger.info(
        LogCategory.EXTENSION,
        'Preview generated successfully',
        'KnowledgeMessageHandler.handleV1PreviewTemplateInjection',
        { templateId: payload.templateId, matchedItems: preview.matchedItems.length, excludedItems: preview.excludedItems.length },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to generate injection preview',
        'KnowledgeMessageHandler.handleV1PreviewTemplateInjection',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      vscode.window.showErrorMessage(`Failed to generate preview: ${error.message}`);

      this.context.view?.webview.postMessage({
        type: 'v1:error',
        payload: { message: error.message, operation: 'preview-template-injection' }
      });
    }
  }

  /**
   * Handle v1:inject-template-confirmed - Execute maturity-based injection after user confirmation
   */
  private async handleV1InjectTemplateConfirmed(payload: {
    templateId: string;
    filePath: string;
    includeAllItems: boolean;
    maturityContext?: any;
  }): Promise<void> {
    try {
      logger.debug(
        LogCategory.EXTENSION,
        'Handling v1:inject-template-confirmed',
        'KnowledgeMessageHandler.handleV1InjectTemplateConfirmed',
        { templateId: payload.templateId, includeAllItems: payload.includeAllItems },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      // Execute maturity-based injection
      await this.context.knowledgeManager.injectMaturityTemplate(
        payload.templateId,
        payload.filePath,
        payload.maturityContext,
        payload.includeAllItems
      );

      // Refresh claude.md file statistics
      await this.sendClaudeMdFiles();

      const itemsType = payload.includeAllItems ? 'all items' : 'matched items only';
      vscode.window.showInformationMessage(`Template injected (${itemsType}) to ${payload.filePath}`);

      this.context.view?.webview.postMessage({
        type: 'v1:inject-template-success',
        payload: { templateId: payload.templateId, filePath: payload.filePath }
      });

      logger.info(
        LogCategory.EXTENSION,
        'Template injected successfully with maturity filtering',
        'KnowledgeMessageHandler.handleV1InjectTemplateConfirmed',
        { templateId: payload.templateId, includeAllItems: payload.includeAllItems },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to inject template',
        'KnowledgeMessageHandler.handleV1InjectTemplateConfirmed',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      vscode.window.showErrorMessage(`Failed to inject template: ${error.message}`);

      this.context.view?.webview.postMessage({
        type: 'v1:error',
        payload: { message: error.message, operation: 'inject-template-confirmed' }
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

      // Get target file path (should be provided from UI)
      let targetFilePath = payload.filePath;
      if (!targetFilePath) {
        throw new Error('No file path provided. Please select a claude.md file in the UI.');
      }

      await this.context.knowledgeManager.injectV1Item(payload.templateId, payload.itemId, targetFilePath);

      // Refresh claude.md file statistics
      await this.sendClaudeMdFiles();

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

  private async handleV1GetItemAudit(payload: { templateId: string; itemId: string }): Promise<void> {
    try {
      logger.debug(
        LogCategory.EXTENSION,
        'Handling v1:get-item-audit',
        'KnowledgeMessageHandler.handleV1GetItemAudit',
        { templateId: payload.templateId, itemId: payload.itemId },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      // Get audit log for this item
      const auditLog = await this.context.knowledgeManager.getV1AuditLog(payload.templateId);

      // Filter to events related to this specific item
      const itemAuditLog = auditLog.filter((entry: any) => {
        // Check if the entry relates to this item
        // Audit entries store itemId in details object
        return entry.details?.itemId === payload.itemId ||
               entry.metadata?.itemId === payload.itemId ||
               entry.operation.includes(payload.itemId);
      });

      this.context.view?.webview.postMessage({
        type: 'v1:item-audit-data',
        payload: { templateId: payload.templateId, itemId: payload.itemId, auditLog: itemAuditLog }
      });
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to get item audit log',
        'KnowledgeMessageHandler.handleV1GetItemAudit',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      vscode.window.showErrorMessage(`Failed to get item audit log: ${error.message}`);

      this.context.view?.webview.postMessage({
        type: 'v1:error',
        payload: { message: error.message, operation: 'get-item-audit' }
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

      // Refresh template list FIRST (this sends updated data to webview)
      await this.handleV1GetTemplates();

      // THEN send success message and notification
      vscode.window.showInformationMessage('Item moved successfully');

      this.context.view?.webview.postMessage({
        type: 'v1:move-item-success',
        payload: { itemId: payload.itemId, fromTemplateId: payload.fromTemplateId, toTemplateId: payload.toTemplateId }
      });
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

      // Refresh template list FIRST (this sends updated data to webview)
      await this.handleV1GetTemplates();

      // THEN send success message and notification
      vscode.window.showInformationMessage('Item copied successfully');

      this.context.view?.webview.postMessage({
        type: 'v1:copy-item-success',
        payload: { itemId: payload.itemId, fromTemplateId: payload.fromTemplateId, toTemplateId: payload.toTemplateId }
      });
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

  private async handleV1ReorderItem(payload: { templateId: string; itemId: string; newIndex: number }): Promise<void> {
    try {
      logger.debug(
        LogCategory.EXTENSION,
        'Handling v1:reorder-item',
        'KnowledgeMessageHandler.handleV1ReorderItem',
        { templateId: payload.templateId, itemId: payload.itemId, newIndex: payload.newIndex },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      await this.context.knowledgeManager.reorderV1Item(payload.templateId, payload.itemId, payload.newIndex);

      // Refresh template list FIRST (this sends updated data to webview)
      await this.handleV1GetTemplates();

      // THEN send success message (no notification toast - too noisy for drag-drop)
      this.context.view?.webview.postMessage({
        type: 'v1:reorder-item-success',
        payload: { templateId: payload.templateId, itemId: payload.itemId, newIndex: payload.newIndex }
      });
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to reorder item',
        'KnowledgeMessageHandler.handleV1ReorderItem',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      vscode.window.showErrorMessage(`Failed to reorder item: ${error.message}`);

      this.context.view?.webview.postMessage({
        type: 'v1:error',
        payload: { message: error.message, operation: 'reorder-item' }
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

      // Refresh template list FIRST (this sends updated data to webview)
      await this.handleV1GetTemplates();

      // THEN send success message and notification
      vscode.window.showInformationMessage('Template deleted successfully');

      this.context.view?.webview.postMessage({
        type: 'v1:delete-template-success',
        payload: { templateId: payload.templateId }
      });
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

  private async handleV1RemoveInjectedTemplate(payload: { templateId: string; filePath: string }): Promise<void> {
    try {
      logger.debug(
        LogCategory.EXTENSION,
        'Handling v1:remove-injected-template',
        'KnowledgeMessageHandler.handleV1RemoveInjectedTemplate',
        { templateId: payload.templateId, filePath: payload.filePath },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      await this.context.knowledgeManager.removeV1Template(payload.templateId, payload.filePath);

      // Refresh claude.md file statistics
      await this.sendClaudeMdFiles();

      vscode.window.showInformationMessage(`Template removed from ${payload.filePath}`);

      this.context.view?.webview.postMessage({
        type: 'v1:remove-injected-template-success',
        payload: { templateId: payload.templateId, filePath: payload.filePath }
      });
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to remove injected template',
        'KnowledgeMessageHandler.handleV1RemoveInjectedTemplate',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      vscode.window.showErrorMessage(`Failed to remove template: ${error.message}`);

      this.context.view?.webview.postMessage({
        type: 'v1:error',
        payload: { message: error.message, operation: 'remove-injected-template' }
      });
    }
  }

  /**
   * Handle V2 injection removal (groups or items)
   */
  private async handleV2RemoveInjection(payload: {
    type: 'group' | 'item';
    groupType: string | null;
    groupId: string | null;
    itemId: string | null;
    filePath: string;
  }): Promise<void> {
    try {
      logger.debug(
        LogCategory.EXTENSION,
        'Handling v2:remove-injection',
        'KnowledgeMessageHandler.handleV2RemoveInjection',
        { payload },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      if (payload.type === 'group' && payload.groupType && payload.groupId) {
        // Remove a group
        await this.context.knowledgeManager.removeGroup(
          payload.filePath,
          payload.groupType,
          payload.groupId
        );
        vscode.window.showInformationMessage(`Group removed from ${payload.filePath}`);
      } else if (payload.type === 'item' && payload.itemId) {
        // Remove an individual item
        await this.context.knowledgeManager.removeIndividualItem(
          payload.filePath,
          payload.itemId
        );
        vscode.window.showInformationMessage(`Item removed from ${payload.filePath}`);
      } else {
        throw new Error('Invalid removal request: missing required parameters');
      }

      // Refresh claude.md file statistics
      await this.sendClaudeMdFiles();

      // Refresh timeline to show new knowledge events
      logger.info(
        LogCategory.EXTENSION,
        'Triggering timeline refresh after V2 removal',
        'KnowledgeMessageHandler.handleV2RemoveInjection',
        {},
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      await this.context.onTimelineRefresh();

      this.context.view?.webview.postMessage({
        type: 'v2:remove-injection-success',
        payload: { filePath: payload.filePath }
      });
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to remove V2 injection',
        'KnowledgeMessageHandler.handleV2RemoveInjection',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      vscode.window.showErrorMessage(`Failed to remove injection: ${error.message}`);

      this.context.view?.webview.postMessage({
        type: 'v2:error',
        payload: { message: error.message, operation: 'remove-injection' }
      });
    }
  }

  // ==========================================================================
  // MATURITY-BASED FILTERING HANDLERS
  // ==========================================================================

  /**
   * Get current maturity context
   */
  private async handleGetMaturityContext(): Promise<void> {
    try {
      logger.debug(
        LogCategory.EXTENSION,
        'Handling maturity:get-context',
        'KnowledgeMessageHandler.handleGetMaturityContext',
        {},
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      const context = await this.context.knowledgeManager.getMaturityContext();

      this.context.view?.webview.postMessage({
        type: 'maturity:context-data',
        payload: { context }
      });
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to get maturity context',
        'KnowledgeMessageHandler.handleGetMaturityContext',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      this.context.view?.webview.postMessage({
        type: 'maturity:error',
        payload: { message: error.message, operation: 'get-context' }
      });
    }
  }

  /**
   * Save maturity context
   */
  private async handleSaveMaturityContext(payload: { context: any }): Promise<void> {
    try {
      logger.debug(
        LogCategory.EXTENSION,
        'Handling maturity:save-context',
        'KnowledgeMessageHandler.handleSaveMaturityContext',
        { quadrant: payload.context.quadrant, complexity: payload.context.complexity },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      await this.context.knowledgeManager.saveMaturityContext(payload.context);

      vscode.window.showInformationMessage('Maturity configuration saved');

      this.context.view?.webview.postMessage({
        type: 'maturity:save-success',
        payload: { context: payload.context }
      });
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to save maturity context',
        'KnowledgeMessageHandler.handleSaveMaturityContext',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      vscode.window.showErrorMessage(`Failed to save maturity configuration: ${error.message}`);

      this.context.view?.webview.postMessage({
        type: 'maturity:error',
        payload: { message: error.message, operation: 'save-context' }
      });
    }
  }

  /**
   * Update maturity context (partial update)
   */
  private async handleUpdateMaturityContext(payload: { partial: any }): Promise<void> {
    try {
      logger.debug(
        LogCategory.EXTENSION,
        'Handling maturity:update-context',
        'KnowledgeMessageHandler.handleUpdateMaturityContext',
        payload.partial,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      const updated = await this.context.knowledgeManager.updateMaturityContext(payload.partial);

      this.context.view?.webview.postMessage({
        type: 'maturity:context-data',
        payload: { context: updated }
      });
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to update maturity context',
        'KnowledgeMessageHandler.handleUpdateMaturityContext',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      this.context.view?.webview.postMessage({
        type: 'maturity:error',
        payload: { message: error.message, operation: 'update-context' }
      });
    }
  }

  /**
   * Handle group:inject - Inject a group of items to a file
   */
  private async handleGroupInject(payload: {
    groupType: string;
    groupId: string;
    itemIds: string[];
    filePath: string;
    maturityContext?: any;
  }): Promise<void> {
    try {
      logger.info(
        LogCategory.EXTENSION,
        'Handling group:inject',
        'KnowledgeMessageHandler.handleGroupInject',
        { groupType: payload.groupType, groupId: payload.groupId, itemCount: payload.itemIds.length, filePath: payload.filePath },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      // Call KnowledgeManager to inject the group
      await this.context.knowledgeManager.injectGroup(
        payload.filePath,
        payload.groupType,
        payload.groupId,
        payload.itemIds,
        payload.maturityContext
      );

      vscode.window.showInformationMessage(`Group injected to ${payload.filePath}`);

      // Refresh claude.md files to update injection status
      await this.sendClaudeMdFiles();

      // Refresh timeline to show new knowledge events
      logger.info(
        LogCategory.EXTENSION,
        'Triggering timeline refresh after group injection',
        'KnowledgeMessageHandler.handleGroupInject',
        {},
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      await this.context.onTimelineRefresh();

      this.context.view?.webview.postMessage({
        type: 'group:inject-success',
        payload: { groupType: payload.groupType, groupId: payload.groupId, filePath: payload.filePath }
      });
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to inject group',
        'KnowledgeMessageHandler.handleGroupInject',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      vscode.window.showErrorMessage(`Failed to inject group: ${error.message}`);

      this.context.view?.webview.postMessage({
        type: 'group:error',
        payload: { message: error.message, operation: 'inject' }
      });
    }
  }

  /**
   * Handle group:remove - Remove a group from a file
   */
  private async handleGroupRemove(payload: {
    groupType: string;
    groupId: string;
    filePath: string;
  }): Promise<void> {
    try {
      logger.info(
        LogCategory.EXTENSION,
        'Handling group:remove',
        'KnowledgeMessageHandler.handleGroupRemove',
        { groupType: payload.groupType, groupId: payload.groupId, filePath: payload.filePath },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      // Call KnowledgeManager to remove the group
      await this.context.knowledgeManager.removeGroup(
        payload.filePath,
        payload.groupType,
        payload.groupId
      );

      vscode.window.showInformationMessage(`Group removed from ${payload.filePath}`);

      // Refresh claude.md files to update injection status
      await this.sendClaudeMdFiles();

      // Refresh timeline to show new knowledge events
      logger.info(
        LogCategory.EXTENSION,
        'Triggering timeline refresh after group removal',
        'KnowledgeMessageHandler.handleGroupRemove',
        {},
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      await this.context.onTimelineRefresh();

      this.context.view?.webview.postMessage({
        type: 'group:remove-success',
        payload: { groupType: payload.groupType, groupId: payload.groupId, filePath: payload.filePath }
      });
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to remove group',
        'KnowledgeMessageHandler.handleGroupRemove',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      vscode.window.showErrorMessage(`Failed to remove group: ${error.message}`);

      this.context.view?.webview.postMessage({
        type: 'group:error',
        payload: { message: error.message, operation: 'remove' }
      });
    }
  }
}
