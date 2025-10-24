/**
 * KnowledgeViewController - Main Orchestrator for Knowledge Management Tab
 *
 * Coordinates four specialized sub-controllers:
 * - KnowledgeTableController: Manages the knowledge items table
 * - ClaudeMdAccordionController: Manages Claude.md file display
 * - KnowledgeFormController: Handles CRUD operations
 * - TemplateController: Manages template operations
 */

import {
  KnowledgeItem,
  ClaudeMdFile,
  KnowledgeType,
  KnowledgeScope,
  MarketplaceTemplate
} from '../../knowledge/types';
import { NotificationManager } from './NotificationManager';
import { webviewLogger, LogCategory, LogPathway } from '../webview/WebviewLogger';
import { KnowledgeTableController } from './knowledge/KnowledgeTableController';
import { ClaudeMdAccordionController } from './knowledge/ClaudeMdAccordionController';
import { KnowledgeFormController } from './knowledge/KnowledgeFormController';
import { TemplateController } from './knowledge/TemplateController';
import { V1TemplatesTableController } from './knowledge/V1TemplatesTableController';
import { V1TemplateFormController } from './knowledge/V1TemplateFormController';
import { AuditLogViewer } from './knowledge/AuditLogViewer';

export interface KnowledgeViewState {
  items: KnowledgeItem[];
  templates: MarketplaceTemplate[];
  claudeMdFiles: ClaudeMdFile[];
  v1Enabled: boolean;
  v1Templates: MarketplaceTemplate[];
}

export class KnowledgeViewController {
  private state: KnowledgeViewState;
  private messageHandler: ((message: any) => void) | null = null;
  private notifications: NotificationManager;
  // V1 is now the only view - no need for view switching
  // private currentView: 'items' | 'templates' = 'templates';

  // Sub-controllers
  private tableController: KnowledgeTableController;
  private accordionController: ClaudeMdAccordionController;
  private formController: KnowledgeFormController;
  private templateController: TemplateController;

  // V1 Sub-controllers
  private v1TemplatesTableController: V1TemplatesTableController;
  private v1TemplateFormController: V1TemplateFormController;
  private auditLogViewer: AuditLogViewer;

  constructor() {
    this.state = {
      items: [],
      templates: [],
      claudeMdFiles: [],
      v1Enabled: false,
      v1Templates: []
    };
    this.notifications = new NotificationManager();

    // Initialize sub-controllers with callbacks
    this.tableController = new KnowledgeTableController({
      onEditItem: (itemId) => this.formController.editItem(itemId),
      onDeleteItem: (itemId) => this.formController.deleteItem(itemId)
    });

    this.accordionController = new ClaudeMdAccordionController({
      onSaveContent: (filePath, content) => this.saveClaudeMdContent(filePath, content),
      onRemoveTemplate: (templateId, filePath) => this.templateController.removeTemplate(templateId, filePath),
      onScanFiles: () => this.scanClaudeMdFiles(),
      onShowNotification: (message, type, duration) => this.notifications.show({ type, message, duration })
    });

    this.formController = new KnowledgeFormController({
      onSendMessage: (message) => this.sendMessage(message),
      onShowNotification: (message, type, duration) => this.notifications.show({ type, message, duration }),
      getItemById: (itemId) => this.state.items.find(i => i.id === itemId)
    });

    this.templateController = new TemplateController({
      onSendMessage: (message) => this.handleTemplateMessage(message),
      onShowNotification: (message, type, duration) => this.notifications.show({ type, message, duration }),
      getSelectedItems: () => this.tableController.getSelectedItems(),
      getSelectedClaudeFile: () => this.accordionController.getSelectedFile(),
      onDeselectAll: () => this.tableController.deselectAll(),
      onRenderTable: () => this.tableController.renderKnowledgeTable(),
      getItemById: (itemId) => this.state.items.find(i => i.id === itemId)
    });

    // Initialize V1 controllers
    this.v1TemplatesTableController = new V1TemplatesTableController({
      onCreateTemplate: () => this.v1TemplateFormController.showCreateTemplateModal(),
      onCloneTemplate: (templateId) => this.handleCloneTemplate(templateId),
      onDeleteTemplate: (templateId) => this.handleDeleteTemplate(templateId),
      onEditTemplate: (templateId) => this.handleEditTemplate(templateId),
      onAddItem: (templateId) => this.v1TemplateFormController.showAddItemToTemplateModal(templateId),
      onEditItem: (templateId, itemId) => this.handleEditItem(templateId, itemId),
      onDeleteItem: (templateId, itemId) => this.handleDeleteItem(templateId, itemId),
      onCreateVersion: (templateId) => this.handleCreateVersion(templateId),
      onViewAuditLog: (templateId) => this.handleViewAuditLog(templateId)
    });

    this.v1TemplateFormController = new V1TemplateFormController({
      onSendMessage: (message) => this.sendMessage(message),
      onShowNotification: (message, type, duration) => this.notifications.show({ type, message, duration })
    });

    this.auditLogViewer = new AuditLogViewer();
  }

  /**
   * Initialize the knowledge view controller
   */
  initialize(onMessage: (message: any) => void): void {
    this.messageHandler = onMessage;

    // Check if V1 is enabled
    this.sendMessage({ type: 'v1:check-enabled' });

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
   * Handle template-related messages (internal coordination)
   */
  private handleTemplateMessage(message: any): void {
    if (message.type === 'internal:select-template-items') {
      // Template controller wants to select items - coordinate with table controller
      const { templateItemIds } = message.payload;

      // Clear current selection and select template items
      this.tableController.clearSelection();

      // We need to update the table controller's selection
      // The table controller will handle the selection state and re-render
      for (const itemId of templateItemIds) {
        if (this.state.items.some(item => item.id === itemId)) {
          this.tableController.toggleItemSelection(itemId);
        }
      }

      this.templateController.updateTemplateButtons();
    } else {
      // Forward to extension
      this.sendMessage(message);
    }
  }

  /**
   * Handle messages from the extension
   */
  handleMessage(message: any): void {
    switch (message.type) {
      case 'v1:enabled-status':
        this.state.v1Enabled = message.payload.enabled;
        if (this.state.v1Enabled) {
          this.loadV1Templates();
        }
        webviewLogger.info(
          LogCategory.UI,
          'V1 feature status received',
          'KnowledgeViewController.handleMessage',
          { v1Enabled: this.state.v1Enabled },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        break;

      case 'v1:templates-data':
        this.state.v1Templates = message.payload.templates || [];
        this.v1TemplatesTableController.render(this.state.v1Templates);
        webviewLogger.info(
          LogCategory.UI,
          'V1 templates data received and rendered',
          'KnowledgeViewController.handleMessage',
          { templatesCount: this.state.v1Templates.length },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        break;

      case 'v1:template-data':
        // Update single template in state
        const updatedTemplate = message.payload.template;
        const index = this.state.v1Templates.findIndex(t => t.id === updatedTemplate.id);
        if (index >= 0) {
          this.state.v1Templates[index] = updatedTemplate;
        } else {
          this.state.v1Templates.push(updatedTemplate);
        }
        this.v1TemplatesTableController.render(this.state.v1Templates);
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
        const template = this.state.v1Templates.find(t => t.id === templateId);
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
    const template = this.state.v1Templates.find(t => t.id === templateId);
    if (template) {
      this.v1TemplateFormController.showCloneTemplateModal(template);
    }
  }

  /**
   * Handle delete template action
   */
  private handleDeleteTemplate(templateId: string): void {
    const template = this.state.v1Templates.find(t => t.id === templateId);
    if (!template) return;

    const itemCount = template.items?.length || 0;
    const message = itemCount > 0
      ? `Delete template "${template.name}"? This will also delete all ${itemCount} items.`
      : `Delete template "${template.name}"?`;

    if (confirm(message)) {
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
    // TODO: Implement edit template modal
    this.notifications.show({
      type: 'info',
      message: 'Edit template functionality coming soon',
      duration: 3000
    });
  }

  /**
   * Handle edit item action
   */
  private handleEditItem(templateId: string, itemId: string): void {
    const template = this.state.v1Templates.find(t => t.id === templateId);
    const item = template?.items?.find(i => i.id === itemId);
    if (item) {
      // Reuse existing form controller for editing
      this.formController.editItem(itemId);
    }
  }

  /**
   * Handle delete item action
   */
  private handleDeleteItem(templateId: string, itemId: string): void {
    const template = this.state.v1Templates.find(t => t.id === templateId);
    const item = template?.items?.find(i => i.id === itemId);
    if (!item) return;

    if (confirm(`Delete item "${item.title}" from template?`)) {
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
   * Show V1 templates view (now the only view)
   */
  private showV1TemplatesView(): void {
    webviewLogger.info(
      LogCategory.UI,
      'Switching to V1 templates view',
      'KnowledgeViewController.showV1TemplatesView',
      { templatesCount: this.state.v1Templates.length },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Render V1 templates using the table controller
    this.v1TemplatesTableController.render(this.state.v1Templates);
  }

  /**
   * Load knowledge data from extension
   */
  loadData(data: { items: KnowledgeItem[]; templates: MarketplaceTemplate[] }): void {
    webviewLogger.info(
      LogCategory.UI,
      'Loading knowledge data into controller',
      'KnowledgeViewController.loadData',
      {
        itemsCount: data.items?.length || 0,
        templatesCount: data.templates?.length || 0,
        items: data.items?.map(i => ({ id: i.id, type: i.type, title: i.title })) || []
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    this.state.items = data.items;
    this.state.templates = data.templates;

    webviewLogger.debug(
      LogCategory.UI,
      'State updated, delegating to controllers',
      'KnowledgeViewController.loadData',
      {
        stateItemsCount: this.state.items.length,
        stateTemplatesCount: this.state.templates.length
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Delegate to sub-controllers
    this.tableController.loadData(data.items, data.templates);
    this.templateController.loadData(data.templates);
    this.updateStatusBar();

    webviewLogger.info(
      LogCategory.UI,
      'Knowledge data loaded and rendered via controllers',
      'KnowledgeViewController.loadData',
      {
        itemsLoaded: this.state.items.length,
        templatesLoaded: this.state.templates.length
      },
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
   * Render the complete knowledge view
   */
  render(): void {
    // V1 is now the only view - always show templates
    this.showV1TemplatesView();

    this.accordionController.renderClaudeMdAccordion();
    this.templateController.renderTemplateControls();
    this.updateStatusBar();
  }

  /**
   * Update status bar
   */
  private updateStatusBar(): void {
    const statusText = document.getElementById('knowledge-status-text');
    const itemCount = document.getElementById('knowledge-item-count');

    if (statusText) {
      statusText.textContent = 'Ready';
    }

    if (itemCount) {
      const selectedCount = this.tableController.getSelectedItems().length;
      itemCount.textContent = `${this.state.items.length} items`;
      if (selectedCount > 0) {
        itemCount.textContent += ` (${selectedCount} selected)`;
      }
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Select all checkbox - delegate to table controller
    const selectAll = document.getElementById('knowledge-select-all') as HTMLInputElement;
    selectAll?.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      if (checked) {
        this.tableController.selectAll();
      } else {
        this.tableController.deselectAll();
      }
      this.templateController.updateTemplateButtons();
      this.updateStatusBar();
    });

    // Toggle all sections button - delegate to table controller
    const toggleAllBtn = document.getElementById('toggle-all-sections');
    toggleAllBtn?.addEventListener('click', () => {
      this.tableController.toggleAllSections();
    });

    // Search input - delegate to table controller
    const searchInput = document.getElementById('knowledge-search') as HTMLInputElement;
    let searchTimeout: any;
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        const query = (e.target as HTMLInputElement).value;
        this.tableController.updateFilters({ searchQuery: query });
        this.updateStatusBar();
      }, 150);
    });

    // Add item button - delegate to form controller
    const addBtn = document.getElementById('add-knowledge-item');
    addBtn?.addEventListener('click', () => this.formController.createNewItem());

    // V1 Create Template button
    const createTemplateBtn = document.getElementById('create-v1-template');
    createTemplateBtn?.addEventListener('click', () => this.v1TemplateFormController.showCreateTemplateModal());

    // Refresh button
    const refreshBtn = document.getElementById('refresh-knowledge');
    refreshBtn?.addEventListener('click', () => this.refreshKnowledgeData());

    // Scan claude files button
    const scanBtn = document.getElementById('scan-claude-files');
    scanBtn?.addEventListener('click', () => this.scanClaudeMdFiles());

    // Template controls - delegate to template controller
    const saveTemplateBtn = document.getElementById('save-template');
    saveTemplateBtn?.addEventListener('click', () => this.templateController.saveAsTemplate());

    const applySelectedBtn = document.getElementById('apply-selected');
    applySelectedBtn?.addEventListener('click', () => this.templateController.applySelectedItems());

    const applyTemplateBtn = document.getElementById('apply-template');
    applyTemplateBtn?.addEventListener('click', () => this.templateController.applyTemplateToFocused());

    const publishTemplateBtn = document.getElementById('publish-template');
    publishTemplateBtn?.addEventListener('click', () => this.templateController.publishTemplate());

    const deleteTemplateBtn = document.getElementById('delete-template');
    deleteTemplateBtn?.addEventListener('click', () => this.templateController.deleteTemplate());

    // Template selector - delegate to template controller
    const templateSelector = document.getElementById('template-selector') as HTMLSelectElement;
    templateSelector?.addEventListener('change', (e) => {
      this.templateController.handleTemplateSelection((e.target as HTMLSelectElement).value);
    });

    // Item checkboxes (delegated) - delegate to table controller
    document.addEventListener('change', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('item-checkbox')) {
        const itemId = (target as HTMLInputElement).dataset.itemId;
        if (itemId) {
          this.tableController.toggleItemSelection(itemId);
          this.templateController.updateTemplateButtons();
          this.updateStatusBar();
        }
      }
    });

    // Type header collapse/expand (delegated) - delegate to table controller
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const headerRow = target.closest('.knowledge-type-header');
      if (headerRow && headerRow instanceof HTMLElement) {
        const type = headerRow.dataset.type;
        if (type) {
          this.tableController.toggleSectionCollapse(type);
        }
      }
    });

    // Grouping buttons (delegated) - delegate to table controller
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('group-btn')) {
        const groupBy = target.dataset.group as 'type' | 'scope' | 'tag';
        if (groupBy) {
          this.tableController.changeGrouping(groupBy);
          this.updateStatusBar();
        }
      }
    });

    // Column header sorting - delegate to table controller
    const sortableHeaders = document.querySelectorAll('.knowledge-table th[data-sort]');
    sortableHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const sortColumn = header.getAttribute('data-sort') as 'title' | 'type' | 'scope';
        if (sortColumn) {
          this.tableController.handleSort(sortColumn);
          this.updateStatusBar();
        }
      });
    });

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
}

// Make controller globally accessible for onclick handlers
declare global {
  interface Window {
    knowledgeController: KnowledgeViewController;
  }
}
