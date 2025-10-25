/**
 * V1TemplateFormController - Handles modals for V1 template operations
 *
 * Manages create/edit/clone template modals, add/edit item modals,
 * and version creation modals. Uses the ModalDialog component.
 */

import { MarketplaceTemplate, TemplateCategory } from '../../../knowledge/types';
import { ModalDialog } from '../ModalDialog';
import { webviewLogger, LogCategory, LogPathway } from '../../webview/WebviewLogger';

export interface V1TemplateFormCallbacks {
  onSendMessage: (message: any) => void;
  onShowNotification: (message: string, type: 'success' | 'error' | 'warning' | 'info', duration?: number) => void;
}

export class V1TemplateFormController {
  constructor(private callbacks: V1TemplateFormCallbacks) {
    webviewLogger.info(
      LogCategory.UI,
      'V1TemplateFormController initialized',
      'V1TemplateFormController.constructor',
      undefined,
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Show create template modal
   */
  async showCreateTemplateModal(): Promise<void> {
    const modal = new ModalDialog();

    const content = `
      <div style="padding: 20px; display: flex; flex-direction: column; gap: 16px;">
        <div class="form-group">
          <label for="template-name" style="display: block; margin-bottom: 4px; font-weight: 600;">Name *</label>
          <input type="text" id="template-name" required style="width: 100%; padding: 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 2px;" />
        </div>
        <div class="form-group">
          <label for="template-description" style="display: block; margin-bottom: 4px; font-weight: 600;">Description *</label>
          <textarea id="template-description" rows="3" required style="width: 100%; padding: 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 2px; resize: vertical;"></textarea>
        </div>
        <div class="form-group">
          <label for="template-category" style="display: block; margin-bottom: 4px; font-weight: 600;">Category *</label>
          <select id="template-category" required style="width: 100%; padding: 8px; background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground); border: 1px solid var(--vscode-dropdown-border); border-radius: 2px;">
            <option value="development">Development</option>
            <option value="best-practices">Best Practices</option>
            <option value="documentation">Documentation</option>
            <option value="testing">Testing</option>
            <option value="security">Security</option>
            <option value="architecture">Architecture</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div class="form-group">
          <label for="template-tags" style="display: block; margin-bottom: 4px; font-weight: 600;">Tags (comma-separated)</label>
          <input type="text" id="template-tags" placeholder="api, rest, patterns" style="width: 100%; padding: 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 2px;" />
        </div>
        <div class="form-group">
          <label for="template-scope" style="display: block; margin-bottom: 4px; font-weight: 600;">Scope *</label>
          <select id="template-scope" required style="width: 100%; padding: 8px; background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground); border: 1px solid var(--vscode-dropdown-border); border-radius: 2px;">
            <option value="personal">Personal</option>
            <option value="team">Team</option>
            <option value="project">Project</option>
            <option value="organization">Organization</option>
          </select>
        </div>
      </div>
    `;

    await modal.show({
      title: 'Create V1 Template',
      content,
      buttons: [
        {
          label: 'Cancel',
          primary: false,
          onClick: () => {}
        },
        {
          label: 'Create Template',
          primary: true,
          onClick: () => {
            const formData = this.extractFormData(['template-name', 'template-description', 'template-category', 'template-tags', 'template-scope']);
            if (this.validateRequiredFields(formData, ['template-name', 'template-description', 'template-category', 'template-scope'])) {
              this.createTemplate(formData);
            }
          }
        }
      ],
      width: '500px'
    });
  }

  /**
   * Show clone template modal
   */
  async showCloneTemplateModal(template: MarketplaceTemplate): Promise<void> {
    const modal = new ModalDialog();

    const content = `
      <div style="padding: 20px; display: flex; flex-direction: column; gap: 16px;">
        <div style="padding: 12px; background: var(--vscode-textBlockQuote-background); border-left: 4px solid var(--vscode-textLink-activeForeground); border-radius: 2px;">
          <div style="font-weight: 600; margin-bottom: 4px;">Source Template</div>
          <div style="font-size: 13px;">${this.escapeHtml(template.name)}</div>
          <div style="font-size: 12px; color: var(--vscode-descriptionForeground); margin-top: 4px;">
            ${template.items?.length || 0} items • v${template.version || '1.0'}
          </div>
        </div>
        <div class="form-group">
          <label for="clone-name" style="display: block; margin-bottom: 4px; font-weight: 600;">New Template Name *</label>
          <input type="text" id="clone-name" value="${this.escapeHtml(template.name)} (Copy)" required style="width: 100%; padding: 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 2px;" />
        </div>
        <div class="form-group">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" id="clone-shallow" />
            <span>Shallow clone (without audit trail and version history)</span>
          </label>
          <div style="font-size: 12px; color: var(--vscode-descriptionForeground); margin-top: 4px; margin-left: 24px;">
            Deep clone (default) includes all items, audit trail, and version history. Shallow clone includes all items but starts fresh with no history.
          </div>
        </div>
      </div>
    `;

    await modal.show({
      title: 'Clone Template',
      content,
      buttons: [
        {
          label: 'Cancel',
          primary: false,
          onClick: () => {}
        },
        {
          label: 'Clone',
          primary: true,
          onClick: () => {
            const formData = this.extractFormData(['clone-name', 'clone-shallow']);
            if (formData['clone-name']) {
              this.cloneTemplate(template.id, formData);
            } else {
              this.callbacks.onShowNotification('Please enter a name for the cloned template', 'error');
            }
          }
        }
      ],
      width: '500px'
    });
  }

  /**
   * Show edit template modal
   */
  async showEditTemplateModal(template: MarketplaceTemplate): Promise<void> {
    const modal = new ModalDialog();

    const content = `
      <div style="padding: 20px; display: flex; flex-direction: column; gap: 16px;">
        <div class="form-group">
          <label for="edit-template-name" style="display: block; margin-bottom: 4px; font-weight: 600;">Name *</label>
          <input type="text" id="edit-template-name" value="${this.escapeHtml(template.name)}" required style="width: 100%; padding: 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 2px;" />
        </div>
        <div class="form-group">
          <label for="edit-template-description" style="display: block; margin-bottom: 4px; font-weight: 600;">Description *</label>
          <textarea id="edit-template-description" rows="3" required style="width: 100%; padding: 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 2px; resize: vertical;">${this.escapeHtml(template.description)}</textarea>
        </div>
        <div class="form-group">
          <label for="edit-template-category" style="display: block; margin-bottom: 4px; font-weight: 600;">Category *</label>
          <select id="edit-template-category" required style="width: 100%; padding: 8px; background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground); border: 1px solid var(--vscode-dropdown-border); border-radius: 2px;">
            <option value="development" ${template.category === 'development' ? 'selected' : ''}>Development</option>
            <option value="best-practices" ${template.category === 'best-practices' ? 'selected' : ''}>Best Practices</option>
            <option value="documentation" ${template.category === 'documentation' ? 'selected' : ''}>Documentation</option>
            <option value="testing" ${template.category === 'testing' ? 'selected' : ''}>Testing</option>
            <option value="security" ${template.category === 'security' ? 'selected' : ''}>Security</option>
            <option value="architecture" ${template.category === 'architecture' ? 'selected' : ''}>Architecture</option>
            <option value="custom" ${template.category === 'custom' ? 'selected' : ''}>Custom</option>
          </select>
        </div>
        <div class="form-group">
          <label for="edit-template-tags" style="display: block; margin-bottom: 4px; font-weight: 600;">Tags (comma-separated)</label>
          <input type="text" id="edit-template-tags" value="${this.escapeHtml(template.tags?.join(', ') || '')}" placeholder="api, rest, patterns" style="width: 100%; padding: 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 2px;" />
        </div>
        <div class="form-group">
          <label for="edit-template-scope" style="display: block; margin-bottom: 4px; font-weight: 600;">Scope *</label>
          <select id="edit-template-scope" required style="width: 100%; padding: 8px; background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground); border: 1px solid var(--vscode-dropdown-border); border-radius: 2px;">
            <option value="personal" ${template.scope === 'personal' ? 'selected' : ''}>Personal</option>
            <option value="team" ${template.scope === 'team' ? 'selected' : ''}>Team</option>
            <option value="project" ${template.scope === 'project' ? 'selected' : ''}>Project</option>
            <option value="organization" ${template.scope === 'organization' ? 'selected' : ''}>Organization</option>
          </select>
        </div>
      </div>
    `;

    await modal.show({
      title: `Edit Template: ${template.name}`,
      content,
      buttons: [
        {
          label: 'Cancel',
          primary: false,
          onClick: () => {}
        },
        {
          label: 'Save Changes',
          primary: true,
          onClick: () => {
            const formData = this.extractFormData(['edit-template-name', 'edit-template-description', 'edit-template-category', 'edit-template-tags', 'edit-template-scope']);
            if (formData['edit-template-name'] && formData['edit-template-description']) {
              this.editTemplate(template.id, formData);
            } else {
              this.callbacks.onShowNotification('Please fill in all required fields', 'error');
            }
          }
        }
      ],
      width: '500px'
    });
  }

  /**
   * Show add item to template modal
   */
  async showAddItemToTemplateModal(templateId: string): Promise<void> {
    const modal = new ModalDialog();

    const content = `
      <div style="padding: 20px; display: flex; flex-direction: column; gap: 16px;">
        <div class="form-group">
          <label for="item-title" style="display: block; margin-bottom: 4px; font-weight: 600;">Title *</label>
          <input type="text" id="item-title" required style="width: 100%; padding: 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 2px;" />
        </div>
        <div class="form-group">
          <label for="item-body" style="display: block; margin-bottom: 4px; font-weight: 600;">Body (Markdown) *</label>
          <textarea id="item-body" rows="10" required placeholder="# Heading\n\nYour markdown content here..." style="width: 100%; padding: 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 2px; font-family: 'Courier New', monospace; resize: vertical;"></textarea>
        </div>
        <div class="form-group">
          <label for="item-type" style="display: block; margin-bottom: 4px; font-weight: 600;">Type *</label>
          <select id="item-type" required style="width: 100%; padding: 8px; background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground); border: 1px solid var(--vscode-dropdown-border); border-radius: 2px;">
            <option value="golden-path">Golden Path</option>
            <option value="pattern">Pattern</option>
            <option value="adr">ADR (Architecture Decision Record)</option>
            <option value="best-practice">Best Practice</option>
            <option value="standard">Standard</option>
            <option value="learning">Learning</option>
            <option value="snippet">Snippet</option>
            <option value="api-spec">API Spec</option>
          </select>
        </div>
        <div class="form-group">
          <label for="item-scope" style="display: block; margin-bottom: 4px; font-weight: 600;">Scope *</label>
          <select id="item-scope" required style="width: 100%; padding: 8px; background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground); border: 1px solid var(--vscode-dropdown-border); border-radius: 2px;">
            <option value="personal">Personal</option>
            <option value="team">Team</option>
            <option value="project">Project</option>
          </select>
        </div>
        <div class="form-group">
          <label for="item-tags" style="display: block; margin-bottom: 4px; font-weight: 600;">Tags (comma-separated)</label>
          <input type="text" id="item-tags" placeholder="auth, oauth, security" style="width: 100%; padding: 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 2px;" />
        </div>
      </div>
    `;

    await modal.show({
      title: 'Add Item to Template',
      content,
      buttons: [
        {
          label: 'Cancel',
          primary: false,
          onClick: () => {}
        },
        {
          label: 'Add Item',
          primary: true,
          onClick: () => {
            const formData = this.extractFormData(['item-title', 'item-body', 'item-type', 'item-scope', 'item-tags']);
            if (this.validateRequiredFields(formData, ['item-title', 'item-body', 'item-type', 'item-scope'])) {
              this.addItemToTemplate(templateId, formData);
            }
          }
        }
      ],
      width: '600px'
    });
  }

  /**
   * Show edit item modal
   */
  async showEditItemModal(templateId: string, item: any): Promise<void> {
    const modal = new ModalDialog();

    const content = `
      <div style="padding: 20px; display: flex; flex-direction: column; gap: 16px;">
        <div class="form-group">
          <label for="edit-item-title" style="display: block; margin-bottom: 4px; font-weight: 600;">Title *</label>
          <input type="text" id="edit-item-title" required value="${this.escapeHtml(item.title)}" style="width: 100%; padding: 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 2px;" />
        </div>
        <div class="form-group">
          <label for="edit-item-body" style="display: block; margin-bottom: 4px; font-weight: 600;">Body (Markdown) *</label>
          <textarea id="edit-item-body" rows="10" required placeholder="# Heading\n\nYour markdown content here..." style="width: 100%; padding: 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 2px; font-family: 'Courier New', monospace; resize: vertical;">${this.escapeHtml(item.body || '')}</textarea>
        </div>
        <div class="form-group">
          <label for="edit-item-type" style="display: block; margin-bottom: 4px; font-weight: 600;">Type *</label>
          <select id="edit-item-type" required style="width: 100%; padding: 8px; background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground); border: 1px solid var(--vscode-dropdown-border); border-radius: 2px;">
            <option value="golden-path" ${item.type === 'golden-path' ? 'selected' : ''}>Golden Path</option>
            <option value="pattern" ${item.type === 'pattern' ? 'selected' : ''}>Pattern</option>
            <option value="adr" ${item.type === 'adr' ? 'selected' : ''}>ADR (Architecture Decision Record)</option>
            <option value="best-practice" ${item.type === 'best-practice' ? 'selected' : ''}>Best Practice</option>
            <option value="standard" ${item.type === 'standard' ? 'selected' : ''}>Standard</option>
            <option value="learning" ${item.type === 'learning' ? 'selected' : ''}>Learning</option>
            <option value="snippet" ${item.type === 'snippet' ? 'selected' : ''}>Snippet</option>
            <option value="api-spec" ${item.type === 'api-spec' ? 'selected' : ''}>API Spec</option>
          </select>
        </div>
        <div class="form-group">
          <label for="edit-item-scope" style="display: block; margin-bottom: 4px; font-weight: 600;">Scope *</label>
          <select id="edit-item-scope" required style="width: 100%; padding: 8px; background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground); border: 1px solid var(--vscode-dropdown-border); border-radius: 2px;">
            <option value="personal" ${item.scope === 'personal' ? 'selected' : ''}>Personal</option>
            <option value="team" ${item.scope === 'team' ? 'selected' : ''}>Team</option>
            <option value="project" ${item.scope === 'project' ? 'selected' : ''}>Project</option>
          </select>
        </div>
        <div class="form-group">
          <label for="edit-item-tags" style="display: block; margin-bottom: 4px; font-weight: 600;">Tags (comma-separated)</label>
          <input type="text" id="edit-item-tags" placeholder="auth, oauth, security" value="${this.escapeHtml((item.tags || []).join(', '))}" style="width: 100%; padding: 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 2px;" />
        </div>
      </div>
    `;

    await modal.show({
      title: `Edit Item: ${item.title}`,
      content,
      buttons: [
        {
          label: 'Cancel',
          primary: false,
          onClick: () => {}
        },
        {
          label: 'Save Changes',
          primary: true,
          onClick: () => {
            const formData = this.extractFormData(['edit-item-title', 'edit-item-body', 'edit-item-type', 'edit-item-scope', 'edit-item-tags']);
            if (this.validateRequiredFields(formData, ['edit-item-title', 'edit-item-body', 'edit-item-type', 'edit-item-scope'])) {
              this.editItem(templateId, item.id, formData);
            }
          }
        }
      ],
      width: '600px'
    });
  }

  /**
   * Show create version checkpoint modal
   */
  async showCreateVersionModal(templateId: string): Promise<void> {
    const modal = new ModalDialog();

    const content = `
      <div style="padding: 20px; display: flex; flex-direction: column; gap: 16px;">
        <div style="padding: 12px; background: var(--vscode-textBlockQuote-background); border-left: 4px solid var(--vscode-textLink-activeForeground); border-radius: 2px; font-size: 13px;">
          Creating a version checkpoint saves a complete snapshot of the template and all its items at this point in time. You can restore this version later if needed.
        </div>
        <div class="form-group">
          <label for="version-number" style="display: block; margin-bottom: 4px; font-weight: 600;">Version Number *</label>
          <input type="text" id="version-number" placeholder="2.0" required style="width: 100%; padding: 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 2px;" />
          <div style="font-size: 12px; color: var(--vscode-descriptionForeground); margin-top: 4px;">
            Use semantic versioning (e.g., 1.0, 1.1, 2.0)
          </div>
        </div>
        <div class="form-group">
          <label for="version-description" style="display: block; margin-bottom: 4px; font-weight: 600;">Description *</label>
          <textarea id="version-description" rows="3" placeholder="Added 5 new security patterns, updated OAuth implementation" required style="width: 100%; padding: 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 2px; resize: vertical;"></textarea>
        </div>
      </div>
    `;

    await modal.show({
      title: 'Create Version Checkpoint',
      content,
      buttons: [
        {
          label: 'Cancel',
          primary: false,
          onClick: () => {}
        },
        {
          label: 'Create Checkpoint',
          primary: true,
          onClick: () => {
            const formData = this.extractFormData(['version-number', 'version-description']);
            if (this.validateRequiredFields(formData, ['version-number', 'version-description'])) {
              this.createVersion(templateId, formData);
            }
          }
        }
      ],
      width: '500px'
    });
  }

  /**
   * Create template from form data
   */
  private createTemplate(formData: Record<string, any>): void {
    const tags = formData['template-tags']
      ? formData['template-tags'].split(',').map((t: string) => t.trim()).filter((t: string) => t)
      : [];

    this.callbacks.onSendMessage({
      type: 'v1:create-template',
      payload: {
        name: formData['template-name'],
        description: formData['template-description'],
        category: formData['template-category'],
        tags,
        scope: formData['template-scope']
      }
    });

    webviewLogger.info(
      LogCategory.UI,
      'Create template message sent',
      'V1TemplateFormController.createTemplate',
      { name: formData['template-name'] },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Clone template from form data
   */
  private cloneTemplate(templateId: string, formData: Record<string, any>): void {
    this.callbacks.onSendMessage({
      type: 'v1:clone-template',
      payload: {
        templateId,
        newName: formData['clone-name'],
        shallow: formData['clone-shallow'] || false
      }
    });

    webviewLogger.info(
      LogCategory.UI,
      'Clone template message sent',
      'V1TemplateFormController.cloneTemplate',
      { templateId, newName: formData['clone-name'], shallow: formData['clone-shallow'] },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Edit template from form data
   */
  private editTemplate(templateId: string, formData: Record<string, any>): void {
    const tags = formData['edit-template-tags']
      ? formData['edit-template-tags'].split(',').map((t: string) => t.trim()).filter((t: string) => t)
      : [];

    this.callbacks.onSendMessage({
      type: 'v1:update-template',
      payload: {
        templateId,
        updates: {
          name: formData['edit-template-name'],
          description: formData['edit-template-description'],
          category: formData['edit-template-category'],
          tags,
          scope: formData['edit-template-scope']
        }
      }
    });

    webviewLogger.info(
      LogCategory.UI,
      'Edit template message sent',
      'V1TemplateFormController.editTemplate',
      { templateId, name: formData['edit-template-name'] },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Add item to template from form data
   */
  private addItemToTemplate(templateId: string, formData: Record<string, any>): void {
    const tags = formData['item-tags']
      ? formData['item-tags'].split(',').map((t: string) => t.trim()).filter((t: string) => t)
      : [];

    this.callbacks.onSendMessage({
      type: 'v1:add-item',
      payload: {
        templateId,
        title: formData['item-title'],
        body: formData['item-body'],
        type: formData['item-type'],
        scope: formData['item-scope'],
        tags
      }
    });

    webviewLogger.info(
      LogCategory.UI,
      'Add item message sent',
      'V1TemplateFormController.addItemToTemplate',
      { templateId, title: formData['item-title'] },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Edit item from form data
   */
  private editItem(templateId: string, itemId: string, formData: Record<string, any>): void {
    const tags = formData['edit-item-tags']
      ? formData['edit-item-tags'].split(',').map((t: string) => t.trim()).filter((t: string) => t)
      : [];

    this.callbacks.onSendMessage({
      type: 'v1:update-item',
      payload: {
        templateId,
        itemId,
        title: formData['edit-item-title'],
        body: formData['edit-item-body'],
        type: formData['edit-item-type'],
        scope: formData['edit-item-scope'],
        tags
      }
    });

    webviewLogger.info(
      LogCategory.UI,
      'Edit item message sent',
      'V1TemplateFormController.editItem',
      { templateId, itemId, title: formData['edit-item-title'] },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Create version checkpoint from form data
   */
  private createVersion(templateId: string, formData: Record<string, any>): void {
    this.callbacks.onSendMessage({
      type: 'v1:create-version',
      payload: {
        templateId,
        versionNumber: formData['version-number'],
        description: formData['version-description']
      }
    });

    webviewLogger.info(
      LogCategory.UI,
      'Create version message sent',
      'V1TemplateFormController.createVersion',
      { templateId, versionNumber: formData['version-number'] },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Extract form data from DOM
   */
  private extractFormData(fieldIds: string[]): Record<string, any> {
    const data: Record<string, any> = {};
    fieldIds.forEach(id => {
      const element = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (element) {
        if (element.type === 'checkbox') {
          data[id] = (element as HTMLInputElement).checked;
        } else {
          data[id] = element.value.trim();
        }
      }
    });
    return data;
  }

  /**
   * Validate required fields
   */
  private validateRequiredFields(formData: Record<string, any>, requiredFields: string[]): boolean {
    for (const field of requiredFields) {
      if (!formData[field] || formData[field] === '') {
        this.callbacks.onShowNotification(`Please fill in all required fields`, 'error');
        return false;
      }
    }
    return true;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
