/**
 * KnowledgeFormController - Manages knowledge item CRUD operations
 *
 * Handles create, edit, and delete operations for knowledge items with modal dialogs.
 * Extracted from KnowledgeViewController for better separation of concerns.
 */

import { KnowledgeItem } from '../../../knowledge/types';
import { ModalDialog } from '../ModalDialog';
import {
  TYPE_OPTIONS,
  SCOPE_OPTIONS,
  TYPE_DISPLAY_TO_VALUE,
  SCOPE_DISPLAY_TO_VALUE,
  TYPE_VALUE_TO_DISPLAY,
  SCOPE_VALUE_TO_DISPLAY
} from './templates/form-constants';
import { webviewLogger, LogCategory, LogPathway } from '../../webview/WebviewLogger';

export interface FormControllerCallbacks {
  onSendMessage: (message: any) => void;
  onShowNotification: (message: string, type: 'info' | 'success' | 'warning' | 'error', duration?: number) => void;
  getItemById: (itemId: string) => KnowledgeItem | undefined;
}

export class KnowledgeFormController {
  private callbacks: FormControllerCallbacks;

  constructor(callbacks: FormControllerCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Create a new knowledge item
   */
  async createNewItem(): Promise<void> {
    const modal = new ModalDialog();

    const result = await modal.showForm({
      title: 'Create Knowledge Item',
      submitText: 'Create',
      cancelText: 'Cancel',
      fields: [
        {
          name: 'type',
          label: 'Type',
          type: 'select',
          required: true,
          options: TYPE_OPTIONS
        },
        {
          name: 'scope',
          label: 'Scope',
          type: 'select',
          required: true,
          options: SCOPE_OPTIONS
        },
        {
          name: 'title',
          label: 'Title',
          type: 'text',
          required: true,
          placeholder: 'e.g., "Use dependency injection for services"'
        },
        {
          name: 'body',
          label: 'Description',
          type: 'textarea',
          required: false,
          placeholder: 'Markdown content (optional)...'
        },
        {
          name: 'tags',
          label: 'Tags',
          type: 'text',
          required: false,
          placeholder: 'e.g., architecture, patterns, best-practices'
        }
      ]
    });

    if (!result) {
      return; // User cancelled
    }

    // Parse tags from comma-separated string
    const tags = result.tags ? result.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t) : [];

    // Send create request to extension
    this.callbacks.onSendMessage({
      type: 'knowledge:create-item',
      payload: {
        type: TYPE_DISPLAY_TO_VALUE[result.type] || 'custom',
        scope: SCOPE_DISPLAY_TO_VALUE[result.scope] || 'personal',
        title: result.title,
        body: result.body || '',
        tags
      }
    });
  }

  /**
   * Edit a knowledge item
   */
  editItem(itemId: string): void {
    webviewLogger.debug(
      LogCategory.UI,
      'Edit button clicked - entry point',
      'KnowledgeFormController.editItem',
      { itemId },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      const item = this.callbacks.getItemById(itemId);
      if (!item) {
        webviewLogger.error(
          LogCategory.UI,
          'Cannot edit item - item not found',
          'KnowledgeFormController.editItem',
          { itemId },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        this.callbacks.onShowNotification('Knowledge item not found', 'error');
        return;
      }

      webviewLogger.info(
        LogCategory.UI,
        'Item found, showing edit dialog',
        'KnowledgeFormController.editItem',
        { itemId, title: item.title, type: item.type },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      // Show the edit form asynchronously
      this.showEditForm(item).catch(error => {
        webviewLogger.error(
          LogCategory.UI,
          'Error showing edit form',
          'KnowledgeFormController.editItem',
          { itemId, error: error.message, stack: error.stack },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        this.callbacks.onShowNotification(`Failed to show edit form: ${error.message}`, 'error');
      });

    } catch (error: any) {
      webviewLogger.error(
        LogCategory.UI,
        'Unexpected error during edit operation',
        'KnowledgeFormController.editItem',
        { itemId, error: error.message, stack: error.stack },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      this.callbacks.onShowNotification(`Failed to edit item: ${error.message}`, 'error');
    }
  }

  /**
   * Show edit form modal (extracted async logic)
   */
  private async showEditForm(item: KnowledgeItem): Promise<void> {
    webviewLogger.debug(
      LogCategory.UI,
      'Creating edit form modal',
      'KnowledgeFormController.showEditForm',
      { itemId: item.id, title: item.title },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    const modal = new ModalDialog();

    const result = await modal.showForm({
      title: `Edit Knowledge Item: ${item.title}`,
      submitText: 'Save',
      cancelText: 'Cancel',
      fields: [
        {
          name: 'type',
          label: 'Type',
          type: 'select',
          required: true,
          options: TYPE_OPTIONS,
          defaultValue: TYPE_VALUE_TO_DISPLAY[item.type] || '📦 Custom'
        },
        {
          name: 'scope',
          label: 'Scope',
          type: 'select',
          required: true,
          options: SCOPE_OPTIONS,
          defaultValue: SCOPE_VALUE_TO_DISPLAY[item.scope] || '👤 Personal'
        },
        {
          name: 'title',
          label: 'Title',
          type: 'text',
          required: true,
          placeholder: 'e.g., "Use dependency injection for services"',
          defaultValue: item.title
        },
        {
          name: 'body',
          label: 'Description',
          type: 'textarea',
          required: false,
          placeholder: 'Markdown content (optional)...',
          defaultValue: item.body
        },
        {
          name: 'tags',
          label: 'Tags',
          type: 'text',
          required: false,
          placeholder: 'e.g., architecture, patterns, best-practices',
          defaultValue: item.tags.join(', ')
        },
        {
          name: 'source',
          label: 'Source',
          type: 'text',
          required: false,
          placeholder: 'e.g., auth.oauth.keycloak',
          defaultValue: item.source || ''
        }
      ]
    });

    if (!result) {
      webviewLogger.debug(
        LogCategory.UI,
        'Edit dialog cancelled by user',
        'KnowledgeFormController.showEditForm',
        { itemId: item.id },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      return; // User cancelled
    }

    // Parse tags from comma-separated string
    const tags = result.tags ? result.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t) : [];

    webviewLogger.info(
      LogCategory.UI,
      'Sending update request for knowledge item',
      'KnowledgeFormController.showEditForm',
      { itemId: item.id, updates: { type: result.type, scope: result.scope, title: result.title } },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Send update request to extension
    this.callbacks.onSendMessage({
      type: 'knowledge:update-item',
      payload: {
        id: item.id,
        updates: {
          type: TYPE_DISPLAY_TO_VALUE[result.type] || 'custom',
          scope: SCOPE_DISPLAY_TO_VALUE[result.scope] || 'personal',
          title: result.title,
          body: result.body || '',
          tags,
          source: result.source || ''
        }
      }
    });

    this.callbacks.onShowNotification(`Updating "${result.title}"...`, 'info');
  }

  /**
   * Delete a knowledge item
   */
  deleteItem(itemId: string): void {
    webviewLogger.debug(
      LogCategory.UI,
      'Delete button clicked - entry point',
      'KnowledgeFormController.deleteItem',
      { itemId },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      const item = this.callbacks.getItemById(itemId);

      if (!item) {
        webviewLogger.error(
          LogCategory.UI,
          'Cannot delete item - item not found',
          'KnowledgeFormController.deleteItem',
          { itemId },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        this.callbacks.onShowNotification('Knowledge item not found', 'error');
        return;
      }

      webviewLogger.info(
        LogCategory.UI,
        'Item found, showing confirmation dialog',
        'KnowledgeFormController.deleteItem',
        { itemId, title: item.title, type: item.type },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      // Use ModalDialog.confirm() instead of browser confirm() (which is blocked by VSCode sandbox)
      this.showDeleteConfirmation(item).catch(error => {
        webviewLogger.error(
          LogCategory.UI,
          'Error showing delete confirmation',
          'KnowledgeFormController.deleteItem',
          { itemId, error: error.message, stack: error.stack },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        this.callbacks.onShowNotification(`Failed to show confirmation: ${error.message}`, 'error');
      });

    } catch (error: any) {
      webviewLogger.error(
        LogCategory.UI,
        'Unexpected error during delete operation',
        'KnowledgeFormController.deleteItem',
        { itemId, error: error.message, stack: error.stack },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      this.callbacks.onShowNotification(`Failed to delete item: ${error.message}`, 'error');
    }
  }

  /**
   * Show delete confirmation modal (extracted async logic)
   */
  private async showDeleteConfirmation(item: KnowledgeItem): Promise<void> {
    webviewLogger.debug(
      LogCategory.UI,
      'Creating delete confirmation modal',
      'KnowledgeFormController.showDeleteConfirmation',
      { itemId: item.id, title: item.title },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    const modal = new ModalDialog();
    const message = `Are you sure you want to delete "${item.title}"?\n\nThis action cannot be undone. The markdown file will be permanently deleted from your .agent-brain directory.`;

    const confirmed = await modal.confirm(message, 'Confirm Delete');

    webviewLogger.debug(
      LogCategory.UI,
      `User ${confirmed ? 'confirmed' : 'cancelled'} delete operation`,
      'KnowledgeFormController.showDeleteConfirmation',
      { itemId: item.id, title: item.title, confirmed },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    if (!confirmed) {
      return;
    }

    webviewLogger.info(
      LogCategory.UI,
      'Sending delete request to extension',
      'KnowledgeFormController.showDeleteConfirmation',
      { itemId: item.id, title: item.title, path: item.path },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    this.callbacks.onSendMessage({
      type: 'knowledge:delete-item',
      payload: { id: item.id }
    });

    this.callbacks.onShowNotification(`Deleting "${item.title}"...`, 'info');

    webviewLogger.debug(
      LogCategory.UI,
      'Delete request sent successfully',
      'KnowledgeFormController.showDeleteConfirmation',
      { itemId: item.id },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Handle operation result from extension
   */
  handleOperationResult(operation: string, success: boolean, message?: string): void {
    if (success) {
      this.callbacks.onShowNotification(
        message || `${operation} completed successfully`,
        'success'
      );
    } else {
      this.callbacks.onShowNotification(
        message || `${operation} failed`,
        'error',
        6000 // Show errors longer
      );
    }
  }
}
