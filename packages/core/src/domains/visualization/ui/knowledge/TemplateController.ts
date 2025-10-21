/**
 * TemplateController - Manages knowledge template operations
 *
 * Handles template creation, selection, application, export/import, and removal.
 * Extracted from KnowledgeViewController for better separation of concerns.
 */

import { Template } from '../../../knowledge/types';
import { ModalDialog } from '../ModalDialog';
import { webviewLogger, LogCategory, LogPathway } from '../../webview/WebviewLogger';

export interface TemplateState {
  templates: Template[];
}

export interface TemplateControllerCallbacks {
  onSendMessage: (message: any) => void;
  onShowNotification: (message: string, type: 'info' | 'success' | 'warning' | 'error', duration?: number) => void;
  getSelectedItems: () => string[];
  getSelectedClaudeFile: () => string | null;
  onDeselectAll: () => void;
  onRenderTable: () => void;
  getItemById: (itemId: string) => any | undefined;
}

export class TemplateController {
  private state: TemplateState;
  private callbacks: TemplateControllerCallbacks;

  constructor(callbacks: TemplateControllerCallbacks) {
    this.callbacks = callbacks;
    this.state = {
      templates: []
    };
  }

  /**
   * Load templates data
   */
  loadData(templates: Template[]): void {
    this.state.templates = templates;
    this.renderTemplateControls();
  }

  /**
   * Render template controls (dropdown and buttons)
   */
  renderTemplateControls(): void {
    webviewLogger.debug(
      LogCategory.UI,
      'Rendering template controls',
      'TemplateController.renderTemplateControls',
      {
        templateCount: this.state.templates.length,
        templates: this.state.templates.map(t => ({ id: t.id, name: t.name, itemCount: t.itemIds.length }))
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    const selector = document.getElementById('template-selector') as HTMLSelectElement;
    if (!selector) {
      webviewLogger.error(
        LogCategory.UI,
        'Template selector element not found',
        'TemplateController.renderTemplateControls',
        { elementId: 'template-selector' },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      return;
    }

    selector.innerHTML = '<option value="">Select template...</option>';

    for (const template of this.state.templates) {
      const option = document.createElement('option');
      option.value = template.id;
      option.textContent = `${template.name} (${template.itemIds.length} items)`;
      selector.appendChild(option);

      webviewLogger.debug(
        LogCategory.UI,
        'Added template option to selector',
        'TemplateController.renderTemplateControls',
        { templateId: template.id, templateName: template.name },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    }

    webviewLogger.info(
      LogCategory.UI,
      'Template controls rendered',
      'TemplateController.renderTemplateControls',
      {
        optionsAdded: this.state.templates.length,
        totalOptions: selector.options.length
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    this.updateTemplateButtons();
  }

  /**
   * Update template button states based on selection
   */
  updateTemplateButtons(): void {
    const selectedCount = this.callbacks.getSelectedItems().length;
    const hasSelection = selectedCount > 0;

    const saveBtn = document.getElementById('save-template') as HTMLButtonElement;
    const applySelectedBtn = document.getElementById('apply-selected') as HTMLButtonElement;
    const applyTemplateBtn = document.getElementById('apply-template') as HTMLButtonElement;
    const exportBtn = document.getElementById('export-template') as HTMLButtonElement;

    // Enable save and apply-selected buttons when items are selected
    if (saveBtn) saveBtn.disabled = !hasSelection;
    if (applySelectedBtn) applySelectedBtn.disabled = !hasSelection;

    // Apply template button requires template selection
    const selector = document.getElementById('template-selector') as HTMLSelectElement;
    const hasTemplateSelected = selector?.value;
    if (applyTemplateBtn) applyTemplateBtn.disabled = !hasTemplateSelected;
    if (exportBtn && selector) {
      exportBtn.disabled = !selector.value;
    }
  }

  /**
   * Save selected items as a template
   */
  async saveAsTemplate(): Promise<void> {
    const selectedIds = this.callbacks.getSelectedItems();
    if (selectedIds.length === 0) {
      this.callbacks.onShowNotification(
        'Please select at least one knowledge item to create a template',
        'warning'
      );
      return;
    }

    // Check if a template is currently selected (editing mode)
    const selector = document.getElementById('template-selector') as HTMLSelectElement;
    const currentTemplateId = selector?.value;
    const currentTemplate = currentTemplateId
      ? this.state.templates.find(t => t.id === currentTemplateId)
      : null;

    const modal = new ModalDialog();

    if (currentTemplate) {
      // Editing existing template
      const message = `Update template "${currentTemplate.name}" with ${selectedIds.length} item(s)?`;
      const confirmed = await modal.confirm(message, 'Update Template');

      if (!confirmed) {
        return; // User cancelled
      }

      this.callbacks.onSendMessage({
        type: 'knowledge:update-template',
        payload: {
          templateId: currentTemplate.id,
          itemIds: selectedIds
        }
      });

      this.callbacks.onShowNotification(
        `Template "${currentTemplate.name}" updated with ${selectedIds.length} item(s). Remember to re-apply this template to any claude.md files where it was previously used.`,
        'success',
        8000
      );
    } else {
      // Creating new template
      const name = await modal.prompt('Template name:', {
        required: true,
        placeholder: 'e.g., "API Design Checklist"'
      });

      if (!name) {
        return; // User cancelled
      }

      this.callbacks.onSendMessage({
        type: 'knowledge:create-template',
        payload: {
          name,
          itemIds: selectedIds
        }
      });

      this.callbacks.onShowNotification(
        `Creating template "${name}" with ${selectedIds.length} item(s)...`,
        'info'
      );
    }
  }

  /**
   * Apply selected items directly to focused claude.md
   */
  applySelectedItems(): void {
    const selectedIds = this.callbacks.getSelectedItems();
    if (selectedIds.length === 0) {
      this.callbacks.onShowNotification(
        'Please select at least one knowledge item to apply',
        'warning'
      );
      return;
    }

    const selectedClaudeFile = this.callbacks.getSelectedClaudeFile();
    if (!selectedClaudeFile) {
      this.callbacks.onShowNotification(
        'Please select a claude.md file first (click the radio button next to the file name)',
        'warning'
      );
      return;
    }

    const fileName = selectedClaudeFile.split(/[/\\]/).pop() || 'claude.md';

    this.callbacks.onSendMessage({
      type: 'knowledge:apply-selected-items',
      payload: {
        itemIds: selectedIds,
        claudeFilePath: selectedClaudeFile
      }
    });

    this.callbacks.onShowNotification(
      `Applying ${selectedIds.length} selected item(s) to ${fileName}...`,
      'info'
    );
  }

  /**
   * Apply template to focused claude.md
   */
  applyTemplateToFocused(): void {
    const selector = document.getElementById('template-selector') as HTMLSelectElement;
    const templateId = selector?.value;

    if (!templateId) {
      this.callbacks.onShowNotification(
        'Please select a template from the dropdown',
        'warning'
      );
      return;
    }

    const selectedClaudeFile = this.callbacks.getSelectedClaudeFile();
    if (!selectedClaudeFile) {
      this.callbacks.onShowNotification(
        'Please select a claude.md file first (click the radio button next to the file name)',
        'warning'
      );
      return;
    }

    const template = this.state.templates.find(t => t.id === templateId);
    const templateName = template?.name || 'template';
    const fileName = selectedClaudeFile.split(/[/\\]/).pop() || 'claude.md';

    this.callbacks.onSendMessage({
      type: 'knowledge:apply-template',
      payload: {
        templateId,
        replaceExisting: true,
        claudeFilePath: selectedClaudeFile
      }
    });

    this.callbacks.onShowNotification(
      `Applying template "${templateName}" to ${fileName}...`,
      'info'
    );
  }

  /**
   * Export selected template
   */
  exportTemplate(): void {
    const selector = document.getElementById('template-selector') as HTMLSelectElement;
    const templateId = selector?.value;

    if (!templateId) {
      this.callbacks.onShowNotification(
        'Please select a template from the dropdown',
        'warning'
      );
      return;
    }

    const template = this.state.templates.find(t => t.id === templateId);
    const templateName = template?.name || 'template';

    this.callbacks.onSendMessage({
      type: 'knowledge:export-template',
      payload: { templateId }
    });

    this.callbacks.onShowNotification(
      `Exporting template "${templateName}"...`,
      'info'
    );
  }

  /**
   * Import template from file
   */
  importTemplate(): void {
    // Send message to backend to trigger file picker
    this.callbacks.onSendMessage({
      type: 'knowledge:import-template',
      payload: {}
    });

    this.callbacks.onShowNotification(
      'Select a template file to import...',
      'info'
    );
  }

  /**
   * Handle template selection from dropdown
   * Updates selected items to match the template's knowledge items
   */
  handleTemplateSelection(templateId: string): void {
    webviewLogger.info(
      LogCategory.UI,
      'Template selected from dropdown',
      'TemplateController.handleTemplateSelection',
      { templateId },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    if (!templateId) {
      // Empty selection - clear all selections
      webviewLogger.debug(
        LogCategory.UI,
        'Empty template selection, clearing selections',
        'TemplateController.handleTemplateSelection',
        {},
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      this.callbacks.onDeselectAll();
      return;
    }

    const template = this.state.templates.find(t => t.id === templateId);
    if (!template) {
      webviewLogger.error(
        LogCategory.UI,
        'Template not found in state',
        'TemplateController.handleTemplateSelection',
        { templateId, availableTemplates: this.state.templates.map(t => ({ id: t.id, name: t.name })) },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      this.callbacks.onShowNotification('Template not found', 'error');
      return;
    }

    webviewLogger.debug(
      LogCategory.UI,
      'Found template, updating selections',
      'TemplateController.handleTemplateSelection',
      {
        templateName: template.name,
        templateItemCount: template.itemIds.length,
        templateItemIds: template.itemIds
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // We need to update selections through the callback, but we can't directly access selectedItems
    // The table controller owns the selection state, so we need to work through callbacks

    // Count how many items are found/missing
    let selectedCount = 0;
    let missingCount = 0;

    for (const itemId of template.itemIds) {
      const itemExists = !!this.callbacks.getItemById(itemId);
      if (itemExists) {
        selectedCount++;
      } else {
        missingCount++;
        webviewLogger.warn(
          LogCategory.UI,
          'Template references missing knowledge item',
          'TemplateController.handleTemplateSelection',
          { templateId, templateName: template.name, missingItemId: itemId },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
      }
    }

    webviewLogger.info(
      LogCategory.UI,
      'Template selection applied to checkboxes',
      'TemplateController.handleTemplateSelection',
      {
        templateName: template.name,
        itemsSelected: selectedCount,
        itemsMissing: missingCount,
        totalTemplateItems: template.itemIds.length
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    if (missingCount > 0) {
      this.callbacks.onShowNotification(
        `Template "${template.name}" selected. Note: ${missingCount} item(s) not found in current knowledge base.`,
        'warning'
      );
    } else {
      this.callbacks.onShowNotification(
        `Template "${template.name}" selected (${selectedCount} items)`,
        'success'
      );
    }

    // Signal that the table needs to select items for this template
    // This will be handled by the main controller
    this.callbacks.onSendMessage({
      type: 'internal:select-template-items',
      payload: { templateItemIds: template.itemIds }
    });

    this.updateTemplateButtons();
  }

  /**
   * Remove template from claude.md
   */
  async removeTemplate(templateId: string, claudeMdPath: string): Promise<void> {
    const template = this.state.templates.find(t => t.id === templateId);
    const templateName = template?.name || 'this template';

    const modal = new ModalDialog();
    const confirmed = await modal.confirm(
      `Remove template "${templateName}" from claude.md?`,
      'Confirm Removal'
    );

    if (confirmed) {
      this.callbacks.onSendMessage({
        type: 'knowledge:remove-template',
        payload: { templateId, claudeMdPath }
      });

      this.callbacks.onShowNotification(
        `Removing template "${templateName}" from claude.md...`,
        'info'
      );
    }
  }
}
