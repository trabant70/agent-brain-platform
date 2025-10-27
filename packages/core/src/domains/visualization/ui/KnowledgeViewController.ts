/**
 * KnowledgeViewController - Main Orchestrator for Knowledge Management Tab
 *
 * Coordinates V1 specialized sub-controllers:
 * - V1TemplatesTableController: Manages the templates table
 * - ClaudeMdAccordionController: Manages Claude.md file display
 * - V1TemplateFormController: Handles template CRUD operations
 * - AuditLogViewer: Displays template audit logs
 */

import {
  KnowledgeItem,
  ClaudeMdFile,
  KnowledgeType,
  KnowledgeScope,
  MarketplaceTemplate
} from '../../knowledge/types';
import { InjectionStatus } from '../../knowledge/GroupTypes';
import { NotificationManager } from './NotificationManager';
import { ModalDialog } from './ModalDialog';
import { webviewLogger, LogCategory, LogPathway } from '../webview/WebviewLogger';
import { ClaudeMdAccordionController } from './knowledge/ClaudeMdAccordionController';
import { V1TemplatesTableController } from './knowledge/V1TemplatesTableController';
import { V1TemplateFormController } from './knowledge/V1TemplateFormController';
import { AuditLogViewer } from './knowledge/AuditLogViewer';
import { ValidationResultsModal } from './knowledge/ValidationResultsModal';
import { TemplateValidationOrchestrator } from '../../knowledge/validation/TemplateValidationOrchestrator';
import { SchemaValidator } from '../../knowledge/validation/structure/SchemaValidator';
import { XSSValidator } from '../../knowledge/validation/security/XSSValidator';
import { PromptInjectionValidator } from '../../knowledge/validation/security/PromptInjectionValidator';
import { UnicodeValidator } from '../../knowledge/validation/security/UnicodeValidator';
import { t, tf, onI18nReady } from '../webview/i18n';
import { PathTraversalValidator } from '../../knowledge/validation/security/PathTraversalValidator';
import { ContentSizeValidator } from '../../knowledge/validation/security/ContentSizeValidator';
import { DuplicateIdValidator } from '../../knowledge/validation/business/DuplicateIdValidator';
import { MaturityConfigPanel, type MaturityContext } from './knowledge/MaturityConfigPanel';

// V2 Dynamic Injection Components
import { InjectionPreviewDialog } from './knowledge/InjectionPreviewDialog';
import { InjectionStatusBadge } from './knowledge/InjectionStatusBadge';
import { TemplateMatchBadge } from './knowledge/TemplateMatchBadge';
import type { InjectionPreview, MatchStats } from '../../knowledge/GroupTypes';

export interface KnowledgeViewState {
  claudeMdFiles: ClaudeMdFile[];
  templates: MarketplaceTemplate[];
}

export class KnowledgeViewController {
  private state: KnowledgeViewState;
  private messageHandler: ((message: any) => void) | null = null;
  private notifications: NotificationManager;
  private modal: ModalDialog;

  // V1 Sub-controllers
  private accordionController: ClaudeMdAccordionController;
  private v1TemplatesTableController: V1TemplatesTableController;
  private v1TemplateFormController: V1TemplateFormController;
  private auditLogViewer: AuditLogViewer;

  // Maturity-based filtering
  private maturityConfigPanel: MaturityConfigPanel | null = null;
  private currentMaturityContext: MaturityContext | null = null;

  // V2 Dynamic Injection Components
  private injectionPreviewDialog: InjectionPreviewDialog | null = null;

  constructor() {
    this.state = {
      claudeMdFiles: [],
      templates: []
    };
    this.notifications = new NotificationManager();
    this.modal = new ModalDialog();

    // Initialize V1 controllers
    this.accordionController = new ClaudeMdAccordionController({
      onSaveContent: (filePath, content) => this.saveClaudeMdContent(filePath, content),
      onRemoveTemplate: (templateId, filePath) => {
        webviewLogger.debug(
          LogCategory.UI,
          'Removing template from file',
          'KnowledgeViewController.onRemoveTemplate',
          { templateId, filePath },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        // Send message to extension to remove the template from the file
        if (window.vscode) {
          window.vscode.postMessage({
            type: 'v1:remove-injected-template',
            payload: { templateId, filePath }
          });
        } else {
          webviewLogger.error(
            LogCategory.UI,
            'Cannot remove template - VSCode API not available',
            'KnowledgeViewController.onRemoveTemplate',
            undefined,
            LogPathway.KNOWLEDGE_MANAGEMENT
          );
        }
      },
      onScanFiles: () => this.scanClaudeMdFiles(),
      onShowNotification: (message, type, duration) => this.notifications.show({ type, message, duration })
    });

    this.v1TemplatesTableController = new V1TemplatesTableController({
      onCreateTemplate: () => this.v1TemplateFormController.showCreateTemplateModal(),
      onCloneTemplate: (templateId) => this.handleCloneTemplate(templateId),
      onDeleteTemplate: (templateId) => this.handleDeleteTemplate(templateId),
      onEditTemplate: (templateId) => this.handleEditTemplate(templateId),
      onAddItem: (templateId) => this.v1TemplateFormController.showAddItemToTemplateModal(templateId),
      onEditItem: (templateId, itemId) => this.handleEditItem(templateId, itemId),
      onDeleteItem: (templateId, itemId) => this.handleDeleteItem(templateId, itemId),
      onCreateVersion: (templateId) => this.handleCreateVersion(templateId),
      onViewAuditLog: (templateId) => this.handleViewAuditLog(templateId),
      onInjectTemplate: (templateId) => this.handleInjectTemplate(templateId),
      onExportTemplate: (templateId) => this.handleExportTemplate(templateId),
      onInjectItem: (templateId, itemId) => this.handleInjectItem(templateId, itemId),
      onEditItemInline: (templateId, itemId) => this.handleEditItemInline(templateId, itemId),
      onUpdateItem: (templateId, itemId, updates) => this.handleUpdateItem(templateId, itemId, updates),
      onMoveItem: (itemId, fromTemplateId, toTemplateId) => this.handleMoveItem(itemId, fromTemplateId, toTemplateId),
      onCopyItem: (itemId, fromTemplateId, toTemplateId) => this.handleCopyItem(itemId, fromTemplateId, toTemplateId),
      onReorderItem: (templateId, itemId, newIndex) => this.handleReorderItem(templateId, itemId, newIndex)
    });

    this.v1TemplateFormController = new V1TemplateFormController({
      onSendMessage: (message) => this.sendMessage(message),
      onShowNotification: (message, type, duration) => this.notifications.show({ type, message, duration })
    });

    this.auditLogViewer = new AuditLogViewer();

    // Initialize maturity config panel
    this.maturityConfigPanel = new MaturityConfigPanel({
      onSaveContext: (context) => this.saveMaturityContext(context),
      onContextChanged: (context) => {
        this.currentMaturityContext = context;
        this.v1TemplatesTableController.setMaturityContext(context);
        // Could add live preview here if needed
      }
    });

    // Initialize V2 injection preview dialog
    this.injectionPreviewDialog = new InjectionPreviewDialog();

    // Re-render status bar and maturity panel when i18n is ready to ensure translations are applied
    onI18nReady(() => {
      console.log('[KnowledgeViewController] i18n ready, updating UI with translations');
      this.updateStatusBar();
      this.renderMaturityPanel();  // Re-render maturity panel to apply translations
    });
  }

  /**
   * Initialize the knowledge view controller
   */
  initialize(onMessage: (message: any) => void): void {
    this.messageHandler = onMessage;

    // Load V1 templates
    this.loadV1Templates();

    // Request current maturity context from backend
    this.sendMessage({ type: 'maturity:get-context', payload: {} });

    this.setupEventListeners();
    this.render();

    webviewLogger.info(
      LogCategory.UI,
      'KnowledgeViewController initialized and exposed on window',
      'KnowledgeViewController.initialize',
      { controllerExists: !!(window as any).knowledgeController },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }


  /**
   * Handle messages from the extension
   */
  handleMessage(message: any): void {
    switch (message.type) {
      case 'v1:templates-data':
        this.state.templates = message.payload.templates || [];
        this.v1TemplatesTableController.render(this.state.templates);
        // Update injection status based on current claude.md files
        this.updateInjectionStatus(this.state.claudeMdFiles);
        webviewLogger.info(
          LogCategory.UI,
          'V1 templates data received and rendered',
          'KnowledgeViewController.handleMessage',
          { templatesCount: this.state.templates.length },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        break;

      case 'v1:template-data':
        // Update single template in state
        const updatedTemplate = message.payload.template;
        const index = this.state.templates.findIndex(t => t.id === updatedTemplate.id);
        if (index >= 0) {
          this.state.templates[index] = updatedTemplate;
        } else {
          this.state.templates.push(updatedTemplate);
        }
        this.v1TemplatesTableController.render(this.state.templates);
        webviewLogger.debug(
          LogCategory.UI,
          'V1 template updated in state and rendered',
          'KnowledgeViewController.handleMessage',
          { templateId: updatedTemplate.id },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        break;

      case 'v1:template-created':
      case 'v1:template-cloned':
        // Reload all templates
        this.loadV1Templates();
        webviewLogger.info(
          LogCategory.UI,
          'V1 template created/cloned, reloading all templates',
          'KnowledgeViewController.handleMessage',
          { messageType: message.type },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        break;

      case 'v1:audit-log-data':
        const { templateId, auditLog } = message.payload;
        const template = this.state.templates.find(t => t.id === templateId);
        if (template) {
          this.auditLogViewer.showAuditLog(templateId, template.name, auditLog);
        }
        webviewLogger.debug(
          LogCategory.UI,
          'Audit log data received',
          'KnowledgeViewController.handleMessage',
          { templateId, entriesCount: auditLog?.length || 0 },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        break;

      case 'v1:import-success':
        this.notifications.show({
          type: 'success',
          message: 'Template imported successfully!',
          duration: 3000
        });
        this.loadV1Templates();
        break;

      case 'v1:inject-template-success':
        this.notifications.show({
          type: 'success',
          message: `Template injected to ${message.payload.filePath}`,
          duration: 3000
        });
        // Request fresh claude.md files to update injection status
        this.scanClaudeMdFiles();
        break;

      case 'v1:export-success':
        this.notifications.show({
          type: 'success',
          message: `Template exported to ${message.payload.filePath}`,
          duration: 3000
        });
        break;

      case 'v1:inject-item-success':
        this.notifications.show({
          type: 'success',
          message: 'Item injected successfully!',
          duration: 3000
        });
        break;

      case 'v1:update-item-success':
        this.notifications.show({
          type: 'success',
          message: 'Item updated successfully!',
          duration: 3000
        });
        // Templates already reloaded by backend
        break;

      case 'v1:move-item-success':
        this.notifications.show({
          type: 'success',
          message: 'Item moved successfully!',
          duration: 3000
        });
        this.loadV1Templates();
        break;

      case 'v1:copy-item-success':
        this.notifications.show({
          type: 'success',
          message: 'Item copied successfully!',
          duration: 3000
        });
        this.loadV1Templates();
        break;

      case 'v1:delete-template-success':
        this.notifications.show({
          type: 'success',
          message: 'Template deleted successfully!',
          duration: 3000
        });
        // Templates already reloaded by backend
        break;

      case 'v1:delete-item-success':
        this.notifications.show({
          type: 'success',
          message: 'Item deleted successfully!',
          duration: 3000
        });
        // Templates already reloaded by backend
        break;

      case 'v1:error':
        this.notifications.show({
          type: 'error',
          message: `V1 Error: ${message.payload.message}`,
          duration: 5000
        });
        webviewLogger.error(
          LogCategory.UI,
          'V1 operation error',
          'KnowledgeViewController.handleMessage',
          { operation: message.payload.operation, error: message.payload.message },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        break;

      // V2 Dynamic Injection Preview
      case 'v1:preview-injection-data':
        this.handlePreviewInjectionResponse(message.payload);
        break;

      // Maturity-based filtering
      case 'maturity:context-data':
        if (this.maturityConfigPanel && message.payload.context) {
          this.currentMaturityContext = message.payload.context;
          this.maturityConfigPanel.setContext(message.payload.context);
          this.v1TemplatesTableController.setMaturityContext(message.payload.context);
        }
        webviewLogger.debug(
          LogCategory.UI,
          'Maturity context data received',
          'KnowledgeViewController.handleMessage',
          { quadrant: message.payload.context?.quadrant, complexity: message.payload.context?.complexity },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        break;

      case 'maturity:save-success':
        if (this.maturityConfigPanel && message.payload.context) {
          this.currentMaturityContext = message.payload.context;
          this.maturityConfigPanel.setContext(message.payload.context);
          this.v1TemplatesTableController.setMaturityContext(message.payload.context);
        }
        webviewLogger.info(
          LogCategory.UI,
          'Maturity context saved',
          'KnowledgeViewController.handleMessage',
          { quadrant: message.payload.context?.quadrant, complexity: message.payload.context?.complexity },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        break;

      case 'maturity:error':
        this.notifications.show({
          type: 'error',
          message: `Maturity Error: ${message.payload.message}`,
          duration: 5000
        });
        webviewLogger.error(
          LogCategory.UI,
          'Maturity operation error',
          'KnowledgeViewController.handleMessage',
          { operation: message.payload.operation, error: message.payload.message },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        break;
    }
  }

  /**
   * Load V1 templates from extension
   */
  private loadV1Templates(): void {
    this.sendMessage({ type: 'v1:get-templates' });
  }

  /**
   * Handle clone template action
   */
  private handleCloneTemplate(templateId: string): void {
    const template = this.state.templates.find(t => t.id === templateId);
    if (template) {
      this.v1TemplateFormController.showCloneTemplateModal(template);
    }
  }

  /**
   * Handle delete template action
   */
  private async handleDeleteTemplate(templateId: string): Promise<void> {
    const template = this.state.templates.find(t => t.id === templateId);
    if (!template) return;

    const itemCount = template.items?.length || 0;
    const message = itemCount > 0
      ? `Delete template "${template.name}"? This will also delete all ${itemCount} items.`
      : `Delete template "${template.name}"?`;

    const confirmed = await this.modal.confirm(message, 'Delete Template');
    if (confirmed) {
      this.sendMessage({
        type: 'v1:delete-template',
        payload: { templateId }
      });
    }
  }

  /**
   * Handle edit template action
   */
  private handleEditTemplate(templateId: string): void {
    const template = this.state.templates.find(t => t.id === templateId);
    if (!template) {
      this.notifications.show({
        type: 'error',
        message: 'Template not found',
        duration: 3000
      });
      return;
    }

    this.v1TemplateFormController.showEditTemplateModal(template);
  }

  /**
   * Handle edit item action (modal form)
   */
  private handleEditItem(templateId: string, itemId: string): void {
    // Find the template and item
    const template = this.state.templates.find(t => t.id === templateId);
    const item = template?.items?.find(i => i.id === itemId);
    if (!item) {
      this.notifications.show({
        type: 'error',
        message: 'Item not found',
        duration: 3000
      });
      return;
    }

    // Show edit modal
    this.v1TemplateFormController.showEditItemModal(templateId, item);
  }

  /**
   * Handle delete item action
   */
  private async handleDeleteItem(templateId: string, itemId: string): Promise<void> {
    const template = this.state.templates.find(t => t.id === templateId);
    const item = template?.items?.find(i => i.id === itemId);
    if (!item) return;

    const confirmed = await this.modal.confirm(
      `Delete item "${item.title}" from template?`,
      'Delete Item'
    );
    if (confirmed) {
      this.sendMessage({
        type: 'v1:delete-item',
        payload: { templateId, itemId }
      });
    }
  }

  /**
   * Handle create version action
   */
  private handleCreateVersion(templateId: string): void {
    this.v1TemplateFormController.showCreateVersionModal(templateId);
  }

  /**
   * Handle view audit log action
   */
  private handleViewAuditLog(templateId: string): void {
    this.sendMessage({
      type: 'v1:get-audit-log',
      payload: { templateId }
    });
  }

  /**
   * Handle inject template action
   */
  private async handleInjectTemplate(templateId: string): Promise<void> {
    const focusedFile = this.accordionController.getSelectedFile();
    if (!focusedFile) {
      this.notifications.show({
        type: 'warning',
        message: 'Please select a claude.md file first',
        duration: 3000
      });
      return;
    }

    // Request preview data from extension
    this.notifications.show({
      type: 'info',
      message: 'Generating injection preview...',
      duration: 2000
    });

    // Request preview with current maturity context
    this.sendMessage({
      type: 'v1:preview-template-injection',
      payload: {
        templateId,
        filePath: focusedFile,
        maturityContext: this.currentMaturityContext
      }
    });

    // Response will be handled in handlePreviewInjectionResponse
  }

  /**
   * Handle export template action
   */
  private handleExportTemplate(templateId: string): void {
    this.notifications.show({
      type: 'info',
      message: 'Exporting template...',
      duration: 2000
    });

    this.sendMessage({
      type: 'v1:export-template',
      payload: { templateId }
    });
  }

  /**
   * Handle inject item action
   */
  private async handleInjectItem(templateId: string, itemId: string): Promise<void> {
    const focusedFile = this.accordionController.getSelectedFile();
    if (!focusedFile) {
      this.notifications.show({
        type: 'warning',
        message: 'Please select a claude.md file first',
        duration: 3000
      });
      return;
    }

    // For single item injection, skip preview and inject directly
    // (Preview is more useful for full template injection with multiple items)
    this.notifications.show({
      type: 'info',
      message: 'Injecting item...',
      duration: 2000
    });

    this.sendMessage({
      type: 'v1:inject-item',
      payload: { templateId, itemId, filePath: focusedFile }
    });
  }

  /**
   * Handle inline edit item action
   */
  private handleEditItemInline(templateId: string, itemId: string): void {
    // Toggle inline editing mode in table controller
    this.v1TemplatesTableController.toggleInlineEdit(templateId, itemId);
  }

  /**
   * Handle update item action
   */
  private handleUpdateItem(templateId: string, itemId: string, updates: any): void {
    this.notifications.show({
      type: 'info',
      message: 'Updating item...',
      duration: 2000
    });

    this.sendMessage({
      type: 'v1:update-item',
      payload: { templateId, itemId, updates }
    });
  }

  /**
   * Handle move item action
   */
  private handleMoveItem(itemId: string, fromTemplateId: string, toTemplateId: string): void {
    this.notifications.show({
      type: 'info',
      message: 'Moving item...',
      duration: 2000
    });

    this.sendMessage({
      type: 'v1:move-item',
      payload: { itemId, fromTemplateId, toTemplateId }
    });
  }

  /**
   * Handle copy item action
   */
  private handleCopyItem(itemId: string, fromTemplateId: string, toTemplateId: string): void {
    this.notifications.show({
      type: 'info',
      message: 'Copying item...',
      duration: 2000
    });

    this.sendMessage({
      type: 'v1:copy-item',
      payload: { itemId, fromTemplateId, toTemplateId }
    });
  }

  /**
   * Handle reorder item action
   */
  private handleReorderItem(templateId: string, itemId: string, newIndex: number): void {
    this.sendMessage({
      type: 'v1:reorder-item',
      payload: { templateId, itemId, newIndex }
    });
  }

  /**
   * Handle import template action
   */
  private handleImportTemplate(): void {
    // Create file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const content = event.target?.result as string;
          try {
            const templateJson = JSON.parse(content);

            // Validate basic structure
            if (!templateJson.id || !templateJson.name) {
              this.notifications.show({
                type: 'error',
                message: 'Invalid template format: missing id or name',
                duration: 5000
              });
              return;
            }

            // Run comprehensive validation
            webviewLogger.info(
              LogCategory.UI,
              'Running template validation',
              'KnowledgeViewController.handleImportTemplate',
              { templateId: templateJson.id, templateName: templateJson.name },
              LogPathway.KNOWLEDGE_MANAGEMENT
            );

            const orchestrator = this.createValidationOrchestrator();
            const validationResult = orchestrator.validate(templateJson);

            webviewLogger.info(
              LogCategory.UI,
              'Validation complete',
              'KnowledgeViewController.handleImportTemplate',
              {
                isValid: validationResult.isValid,
                errorCount: validationResult.errors.length,
                warningCount: validationResult.warnings.length,
                durationMs: validationResult.metadata.durationMs
              },
              LogPathway.KNOWLEDGE_MANAGEMENT
            );

            // If validation has failures, show modal
            if (validationResult.errors.length > 0 || validationResult.warnings.length > 0) {
              const modal = new ValidationResultsModal();
              const decision = await modal.show(validationResult, templateJson.name);

              if (decision === 'cancel') {
                this.notifications.show({
                  type: 'info',
                  message: 'Import cancelled',
                  duration: 3000
                });
                return;
              }
              // User chose 'proceed', continue with import
            }

            // Import (use sanitized data if available)
            const dataToImport = validationResult.sanitizedData || templateJson;

            this.notifications.show({
              type: 'info',
              message: 'Importing template...',
              duration: 2000
            });

            this.sendMessage({
              type: 'v1:import-template',
              payload: { templateJson: dataToImport }
            });
          } catch (error) {
            this.notifications.show({
              type: 'error',
              message: `Invalid JSON: ${(error as Error).message}`,
              duration: 5000
            });
          }
        };
        reader.readAsText(file);
      } catch (error) {
        this.notifications.show({
          type: 'error',
          message: `Failed to import template: ${(error as Error).message}`,
          duration: 5000
        });
      }
    };

    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  }

  /**
   * Show V1 templates view (now the only view)
   */
  private showV1TemplatesView(): void {
    webviewLogger.info(
      LogCategory.UI,
      'Switching to V1 templates view',
      'KnowledgeViewController.showV1TemplatesView',
      { templatesCount: this.state.templates.length },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Render maturity configuration panel
    this.renderMaturityPanel();

    // Render V1 templates using the table controller
    this.v1TemplatesTableController.render(this.state.templates);
  }

  /**
   * Load knowledge data from extension (no-op for V1 - data comes via v1:templates-data message)
   */
  loadData(): void {
    // V1 system uses v1:templates-data message instead of this method
    // Kept for backward compatibility but does nothing
    webviewLogger.debug(
      LogCategory.UI,
      'loadData called (no-op in V1 system)',
      'KnowledgeViewController.loadData',
      {},
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Load claude.md files
   */
  loadClaudeMdFiles(files: ClaudeMdFile[]): void {
    webviewLogger.info(
      LogCategory.UI,
      'Loading claude.md files into controller',
      'KnowledgeViewController.loadClaudeMdFiles',
      {
        filesCount: files?.length || 0,
        files: files?.map(f => ({ path: f.path, contentLength: f.content?.length || 0 })) || []
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Save scroll positions before re-rendering
    this.accordionController.saveScrollPositions();

    this.state.claudeMdFiles = files;

    // Delegate to accordion controller
    this.accordionController.loadData(files);

    // Restore scroll positions after rendering
    this.accordionController.restoreScrollPositions();

    // Update injection status for all templates
    this.updateInjectionStatus(files);

    webviewLogger.info(
      LogCategory.UI,
      'Claude.md files loaded and rendered via controller',
      'KnowledgeViewController.loadClaudeMdFiles',
      {
        filesLoaded: this.state.claudeMdFiles.length
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Update injection status for all templates based on claude.md files
   */
  private updateInjectionStatus(files: ClaudeMdFile[]): void {
    // Extract all injected template IDs from claude.md files
    const injectedTemplateIds = new Set<string>();
    for (const file of files) {
      if (file.templates && file.templates.length > 0) {
        for (const templateSection of file.templates) {
          injectedTemplateIds.add(templateSection.templateId);
        }
      }
    }

    // Build injection status map for all templates
    const statusMap = new Map<string, InjectionStatus>();
    for (const template of this.state.templates) {
      if (injectedTemplateIds.has(template.id)) {
        statusMap.set(template.id, InjectionStatus.INJECTED);
      } else {
        statusMap.set(template.id, InjectionStatus.NOT_INJECTED);
      }
    }

    // Update the table controller
    this.v1TemplatesTableController.setInjectionStatus(statusMap);

    webviewLogger.debug(
      LogCategory.UI,
      'Injection status updated for templates',
      'KnowledgeViewController.updateInjectionStatus',
      {
        totalTemplates: this.state.templates.length,
        injectedCount: injectedTemplateIds.size,
        notInjectedCount: this.state.templates.length - injectedTemplateIds.size
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Render the complete knowledge view
   */
  render(): void {
    // V1 is now the only view - always show templates
    this.showV1TemplatesView();

    this.accordionController.renderClaudeMdAccordion();
    this.updateStatusBar();
  }

  /**
   * Update status bar
   */
  private updateStatusBar(): void {
    const statusText = document.getElementById('knowledge-status-text');
    const itemCount = document.getElementById('knowledge-item-count');

    if (statusText) {
      statusText.textContent = t('status.ready');
    }

    if (itemCount) {
      // V1 system shows template count instead of item count
      itemCount.textContent = tf('knowledge.templatesCount', { count: this.state.templates.length });
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Toggle all sections button - delegate to V1 table controller
    const toggleAllBtn = document.getElementById('toggle-all-sections');
    toggleAllBtn?.addEventListener('click', () => {
      this.v1TemplatesTableController.toggleAllSections();
    });

    // V1 Create Template button
    const createTemplateBtn = document.getElementById('create-v1-template');
    createTemplateBtn?.addEventListener('click', () => this.v1TemplateFormController.showCreateTemplateModal());

    // Import Template button
    const importBtn = document.getElementById('import-template');
    importBtn?.addEventListener('click', () => this.handleImportTemplate());

    // Refresh button
    const refreshBtn = document.getElementById('refresh-knowledge');
    refreshBtn?.addEventListener('click', () => this.refreshKnowledgeData());

    // Scan claude files button
    const scanBtn = document.getElementById('scan-claude-files');
    scanBtn?.addEventListener('click', () => this.scanClaudeMdFiles());

    // Resizable divider
    this.setupResizer();
  }

  /**
   * Setup resizable divider between panels
   */
  private setupResizer(): void {
    const resizer = document.getElementById('knowledge-resizer');
    const leftPanel = document.querySelector('.knowledge-left-panel') as HTMLElement;
    const container = document.querySelector('.knowledge-container') as HTMLElement;

    if (!resizer || !leftPanel || !container) return;

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    const minWidth = 250; // Match CSS min-width
    const maxWidth = 800; // Match CSS max-width

    resizer.addEventListener('mousedown', (e: MouseEvent) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = leftPanel.offsetWidth;

      // Prevent text selection during drag
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';

      e.preventDefault();
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!isResizing) return;

      const delta = e.clientX - startX;
      let newWidth = startWidth + delta;

      // Enforce min/max constraints
      newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

      // Update left panel width
      leftPanel.style.flex = `0 0 ${newWidth}px`;

      e.preventDefault();
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';

        // Save preference to localStorage
        const finalWidth = leftPanel.offsetWidth;
        try {
          localStorage.setItem('knowledge-left-panel-width', finalWidth.toString());
        } catch (err) {
          // Ignore localStorage errors
        }
      }
    });

    // Restore saved width on initialization
    try {
      const savedWidth = localStorage.getItem('knowledge-left-panel-width');
      if (savedWidth) {
        const width = parseInt(savedWidth, 10);
        if (width >= minWidth && width <= maxWidth) {
          leftPanel.style.flex = `0 0 ${width}px`;
        }
      }
    } catch (err) {
      // Ignore localStorage errors
    }
  }

  /**
   * Save updated claude.md content
   */
  saveClaudeMdContent(filePath: string, content: string): void {
    this.sendMessage({
      type: 'knowledge:update-claude-file',
      payload: { filePath, content }
    });

    this.notifications.show({
      type: 'info',
      message: 'Saving changes to claude.md...'
    });
  }

  /**
   * Scan for claude.md files
   */
  scanClaudeMdFiles(): void {
    this.sendMessage({
      type: 'knowledge:scan-claude-files'
    });
  }

  /**
   * Refresh knowledge data from extension
   * Reloads both knowledge items AND templates from disk
   */
  refreshKnowledgeData(): void {
    this.sendMessage({
      type: 'knowledge:load-request',
      payload: { reload: true }
    });
    this.sendMessage({
      type: 'knowledge:scan-claude-files'
    });
  }

  /**
   * Select a template in the dropdown
   * Used after template creation to enable 3-click workflow: Create → Apply → Publish
   */
  selectTemplate(templateId: string): void {
    webviewLogger.info(
      LogCategory.UI,
      'Selecting template in dropdown',
      'KnowledgeViewController.selectTemplate',
      { templateId },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    const selector = document.getElementById('template-selector') as HTMLSelectElement;
    if (!selector) {
      webviewLogger.error(
        LogCategory.UI,
        'Template selector not found',
        'KnowledgeViewController.selectTemplate',
        { templateId },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      return;
    }

    // Check if the template exists in the dropdown
    const option = Array.from(selector.options).find(opt => opt.value === templateId);
    if (!option) {
      webviewLogger.warn(
        LogCategory.UI,
        'Template not found in dropdown options',
        'KnowledgeViewController.selectTemplate',
        { templateId, availableOptions: Array.from(selector.options).map(o => o.value) },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      return;
    }

    // Select the template
    selector.value = templateId;

    // Trigger change event to update button states
    selector.dispatchEvent(new Event('change'));

    webviewLogger.info(
      LogCategory.UI,
      'Template selected successfully',
      'KnowledgeViewController.selectTemplate',
      { templateId },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Send message to extension
   */
  private sendMessage(message: any): void {
    if (this.messageHandler) {
      this.messageHandler(message);
    }
  }

  /**
   * Handle operation results (success/error notifications)
   * Called by parent when extension sends operation results
   */
  handleOperationResult(operation: string, success: boolean, message?: string): void {
    if (success) {
      this.notifications.show({
        type: 'success',
        message: message || `${operation} completed successfully`
      });
    } else {
      this.notifications.show({
        type: 'error',
        message: message || `${operation} failed`,
        duration: 6000 // Show errors longer
      });
    }
  }

  /**
   * Create validation orchestrator with all validators registered
   */
  private createValidationOrchestrator(): TemplateValidationOrchestrator {
    const orchestrator = new TemplateValidationOrchestrator();

    // Register validators in order: structure → security → business
    orchestrator.registerValidators([
      // Structure validators
      new SchemaValidator(),
      // Security validators
      new XSSValidator(),
      new PromptInjectionValidator(),
      new UnicodeValidator(),
      new PathTraversalValidator(),
      new ContentSizeValidator(),
      // Business validators
      new DuplicateIdValidator()
    ]);

    return orchestrator;
  }

  /**
   * Save maturity context (called by MaturityConfigPanel)
   */
  private saveMaturityContext(context: MaturityContext): void {
    this.sendMessage({
      type: 'maturity:save-context',
      payload: { context }
    });
  }

  /**
   * Render maturity configuration panel in DOM
   * Called to inject the panel into the knowledge view
   */
  renderMaturityPanel(): void {
    if (!this.maturityConfigPanel) return;

    const container = document.querySelector('.knowledge-left-panel');
    if (container) {
      // Check if panel already exists
      const existing = container.querySelector('.maturity-section');
      if (existing) {
        existing.remove();
      }

      // Insert maturity panel at the top
      const panel = this.maturityConfigPanel.render();
      container.insertBefore(panel, container.firstChild);
    }
  }

  // ============================================
  // V2 Dynamic Injection Helper Methods
  // ============================================

  /**
   * Handle preview injection response from extension
   * Shows the preview dialog and sends injection request if confirmed
   */
  private async handlePreviewInjectionResponse(payload: any): Promise<void> {
    const { preview, templateId, filePath } = payload;

    if (!preview) {
      this.notifications.show({
        type: 'error',
        message: 'Failed to generate injection preview',
        duration: 3000
      });
      return;
    }

    webviewLogger.info(
      LogCategory.UI,
      'Showing injection preview dialog',
      'KnowledgeViewController.handlePreviewInjectionResponse',
      { templateId, matchedItems: preview.matchedItems.length, excludedItems: preview.excludedItems.length },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Show preview dialog and wait for user decision
    const { confirmed, includeAllItems } = await this.showInjectionPreview(preview);

    if (!confirmed) {
      this.notifications.show({
        type: 'info',
        message: 'Injection cancelled',
        duration: 2000
      });
      return;
    }

    // User confirmed - send injection request
    this.notifications.show({
      type: 'info',
      message: 'Injecting template...',
      duration: 2000
    });

    this.sendMessage({
      type: 'v1:inject-template-confirmed',
      payload: {
        templateId,
        filePath,
        includeAllItems,
        maturityContext: this.currentMaturityContext
      }
    });

    webviewLogger.info(
      LogCategory.UI,
      'Injection confirmed and request sent',
      'KnowledgeViewController.handlePreviewInjectionResponse',
      { templateId, includeAllItems },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Show injection preview dialog before injecting
   * Returns promise that resolves with user's choice (includeAllItems)
   */
  async showInjectionPreview(preview: InjectionPreview): Promise<{ confirmed: boolean; includeAllItems: boolean }> {
    if (!this.injectionPreviewDialog) {
      return { confirmed: false, includeAllItems: false };
    }

    return new Promise((resolve) => {
      this.injectionPreviewDialog!.show(preview, {
        onConfirm: (includeAllItems: boolean) => {
          resolve({ confirmed: true, includeAllItems });
        },
        onCancel: () => {
          resolve({ confirmed: false, includeAllItems: false });
        }
      });
    });
  }

  /**
   * Create injection status badge element
   */
  createStatusBadge(status: any, options?: any): HTMLElement {
    return InjectionStatusBadge.render({
      status,
      ...options
    });
  }

  /**
   * Create template match badge element
   */
  createMatchBadge(stats: MatchStats, options?: any): HTMLElement {
    return TemplateMatchBadge.render({
      stats,
      ...options
    });
  }

  /**
   * Create inline match indicator
   */
  createInlineMatchIndicator(stats: MatchStats): HTMLElement {
    return TemplateMatchBadge.renderInline(stats);
  }

  /**
   * Create match bar visualization
   */
  createMatchBar(stats: MatchStats, width?: number): HTMLElement {
    return TemplateMatchBadge.renderMatchBar(stats, width);
  }
}

// Make controller globally accessible for onclick handlers
declare global {
  interface Window {
    knowledgeController: KnowledgeViewController;
  }
}
