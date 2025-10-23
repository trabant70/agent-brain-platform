/**
 * TemplateController - Manages knowledge template operations
 *
 * Handles template creation, selection, application, export/import, and removal.
 * Extracted from KnowledgeViewController for better separation of concerns.
 */

import { MarketplaceTemplate } from '../../../knowledge/types';
import { ModalDialog } from '../ModalDialog';
import { webviewLogger, LogCategory, LogPathway } from '../../webview/WebviewLogger';

export interface TemplateState {
  templates: MarketplaceTemplate[];
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
  loadData(templates: MarketplaceTemplate[]): void {
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
        templateCount: this.state.templates?.length || 0,
        templates: this.state.templates?.map(t => ({
          id: t.id,
          name: t.name,
          itemCount: t.items?.length || 0
        })) || []
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

    // Preserve current selection before re-rendering
    const previousSelection = selector.value;

    selector.innerHTML = '<option value="">Select template...</option>';

    for (const template of this.state.templates) {
      const option = document.createElement('option');
      option.value = template.id;
      option.textContent = `${template.name} (${template.items?.length || 0} items)`;
      selector.appendChild(option);

      webviewLogger.debug(
        LogCategory.UI,
        'Added template option to selector',
        'TemplateController.renderTemplateControls',
        { templateId: template.id, templateName: template.name },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    }

    // Restore previous selection if it still exists
    if (previousSelection && this.state.templates.some(t => t.id === previousSelection)) {
      selector.value = previousSelection;
      webviewLogger.debug(
        LogCategory.UI,
        'Restored template selection',
        'TemplateController.renderTemplateControls',
        { templateId: previousSelection },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    }

    webviewLogger.info(
      LogCategory.UI,
      'Template controls rendered',
      'TemplateController.renderTemplateControls',
      {
        optionsAdded: this.state.templates.length,
        totalOptions: selector.options.length,
        selectedTemplate: selector.value || 'none'
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
    const publishBtn = document.getElementById('publish-template') as HTMLButtonElement;
    const deleteBtn = document.getElementById('delete-template') as HTMLButtonElement;

    // Enable save and apply-selected buttons when items are selected
    if (saveBtn) saveBtn.disabled = !hasSelection;
    if (applySelectedBtn) applySelectedBtn.disabled = !hasSelection;

    // Apply template button requires template selection
    const selector = document.getElementById('template-selector') as HTMLSelectElement;
    const hasTemplateSelected = selector?.value;
    if (applyTemplateBtn) applyTemplateBtn.disabled = !hasTemplateSelected;

    // Publish button enabled when USER template is selected
    if (publishBtn) {
      const template = this.state.templates.find(t => t.id === selector?.value);
      const canPublish = hasTemplateSelected && template?.source === 'user';
      publishBtn.disabled = !canPublish;
    }

    // Delete button enabled when ANY template is selected (bundled or user)
    if (deleteBtn) {
      deleteBtn.disabled = !hasTemplateSelected;
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
      // Creating new template - show comprehensive form
      const formData = await modal.showForm({
        title: 'Create Marketplace Template',
        submitText: 'Create Template',
        fields: [
          {
            name: 'name',
            label: 'Template Name',
            type: 'text',
            required: true,
            placeholder: 'e.g., "API Design Checklist"'
          },
          {
            name: 'description',
            label: 'Description',
            type: 'textarea',
            required: true,
            placeholder: 'Brief description of what this template provides (1-2 sentences)'
          },
          {
            name: 'category',
            label: 'Category',
            type: 'select',
            required: true,
            options: [
              'development',
              'documentation',
              'best-practices',
              'architecture',
              'testing',
              'security',
              'onboarding',
              'workflows',
              'general'
            ],
            defaultValue: 'general'
          },
          {
            name: 'tags',
            label: 'Tags',
            type: 'text',
            required: false,
            placeholder: 'e.g., api, rest, design (comma-separated)'
          },
          {
            name: 'authorName',
            label: 'Author Name',
            type: 'text',
            required: true,
            placeholder: 'Your name or organization'
          },
          {
            name: 'authorEmail',
            label: 'Author Email (optional)',
            type: 'text',
            required: false,
            placeholder: 'author@example.com'
          },
          {
            name: 'authorUrl',
            label: 'Author URL (optional)',
            type: 'text',
            required: false,
            placeholder: 'https://github.com/username'
          },
          {
            name: 'license',
            label: 'License',
            type: 'select',
            required: true,
            options: [
              'MIT',
              'Apache-2.0',
              'GPL-3.0',
              'BSD-3-Clause',
              'CC-BY-4.0',
              'CC-BY-SA-4.0',
              'Proprietary',
              'Other'
            ],
            defaultValue: 'MIT'
          }
        ]
      });

      if (!formData) {
        return; // User cancelled
      }

      // Parse tags from comma-separated string
      const tags = formData.tags
        ? formData.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0)
        : [];

      this.callbacks.onSendMessage({
        type: 'knowledge:create-template',
        payload: {
          name: formData.name,
          description: formData.description,
          category: formData.category,
          tags,
          author: {
            name: formData.authorName,
            email: formData.authorEmail || undefined,
            url: formData.authorUrl || undefined
          },
          license: formData.license,
          itemIds: selectedIds
        }
      });

      this.callbacks.onShowNotification(
        `Creating template "${formData.name}" with ${selectedIds.length} item(s)...`,
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
   * Publish template to marketplace
   * Validates template and sends to backend for publishing
   */
  async publishTemplate(): Promise<void> {
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
    if (!template) {
      this.callbacks.onShowNotification('Template not found', 'error');
      return;
    }

    // Only allow publishing USER templates (not bundled ones)
    if (template.source === 'bundled') {
      this.callbacks.onShowNotification(
        'Cannot publish bundled templates. Only user-created templates can be published.',
        'warning'
      );
      return;
    }

    // Validate required metadata
    const validationErrors: string[] = [];
    if (!template.name || template.name.trim().length === 0) {
      validationErrors.push('Template name is required');
    }
    if (!template.description || template.description.trim().length === 0) {
      validationErrors.push('Template description is required');
    }
    if (!template.author?.name || template.author.name.trim().length === 0) {
      validationErrors.push('Author name is required');
    }
    if (!template.category) {
      validationErrors.push('Template category is required');
    }
    if (!template.items || template.items.length === 0) {
      validationErrors.push('Template must contain at least one knowledge item');
    }

    if (validationErrors.length > 0) {
      this.callbacks.onShowNotification(
        `Cannot publish template: ${validationErrors.join(', ')}`,
        'error'
      );
      return;
    }

    // Send message to backend to handle publishing
    this.callbacks.onSendMessage({
      type: 'knowledge:publish-template',
      payload: { templateId }
    });

    this.callbacks.onShowNotification(
      `Publishing template "${template.name}" to marketplace...`,
      'info'
    );
  }

  /**
   * Delete template from project
   * Can delete both bundled and user templates from the project
   */
  async deleteTemplate(): Promise<void> {
    const selector = document.getElementById('template-selector') as HTMLSelectElement;
    const templateId = selector?.value;

    if (!templateId) {
      this.callbacks.onShowNotification(
        'Please select a template to delete',
        'warning'
      );
      return;
    }

    const template = this.state.templates.find(t => t.id === templateId);
    if (!template) {
      this.callbacks.onShowNotification('Template not found', 'error');
      return;
    }

    // Confirm deletion
    const modal = new ModalDialog();
    const confirmed = await modal.confirm(
      `Delete template "${template.name}" from your project? This will remove the template file from .agent-brain/templates/.`,
      'Confirm Deletion'
    );

    if (!confirmed) {
      return;
    }

    // Send delete message
    this.callbacks.onSendMessage({
      type: 'knowledge:delete-template',
      payload: { templateId }
    });

    this.callbacks.onShowNotification(
      `Deleting template "${template.name}"...`,
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

    const itemIds = template.items?.map(item => item.id) || [];

    webviewLogger.debug(
      LogCategory.UI,
      'Found template, updating selections',
      'TemplateController.handleTemplateSelection',
      {
        templateName: template.name,
        templateItemCount: itemIds.length,
        templateItemIds: itemIds
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // We need to update selections through the callback, but we can't directly access selectedItems
    // The table controller owns the selection state, so we need to work through callbacks

    // Count how many items are found/missing
    let selectedCount = 0;
    let missingCount = 0;

    for (const itemId of itemIds) {
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
        totalTemplateItems: itemIds.length
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
      payload: { templateItemIds: itemIds }
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
