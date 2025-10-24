/**
 * V1TemplatesTableController - Renders templates as expandable sections
 *
 * Displays templates with embedded items in a collapsible table view.
 * Each template shows its metadata, item count, version info, and actions.
 * Items within expanded templates show their own details and actions.
 */

import { MarketplaceTemplate, KnowledgeItem, KnowledgeType, getKnowledgeTypeLabel } from '../../../knowledge/types';
import { webviewLogger, LogCategory, LogPathway } from '../../webview/WebviewLogger';

export interface V1TemplatesTableCallbacks {
  onCreateTemplate: () => void;
  onCloneTemplate: (templateId: string) => void;
  onDeleteTemplate: (templateId: string) => void;
  onEditTemplate: (templateId: string) => void;
  onAddItem: (templateId: string) => void;
  onEditItem: (templateId: string, itemId: string) => void;
  onDeleteItem: (templateId: string, itemId: string) => void;
  onCreateVersion: (templateId: string) => void;
  onViewAuditLog: (templateId: string) => void;
  onInjectTemplate: (templateId: string) => void;
  onExportTemplate: (templateId: string) => void;
  onInjectItem: (templateId: string, itemId: string) => void;
  onEditItemInline: (templateId: string, itemId: string) => void;
  onUpdateItem: (templateId: string, itemId: string, updates: any) => void;
  onMoveItem: (itemId: string, fromTemplateId: string, toTemplateId: string) => void;
  onCopyItem: (itemId: string, fromTemplateId: string, toTemplateId: string) => void;
}

export class V1TemplatesTableController {
  private templates: MarketplaceTemplate[] = [];
  private expandedTemplates: Set<string> = new Set();
  private inlineEditingItem: { templateId: string; itemId: string } | null = null;

  constructor(private callbacks: V1TemplatesTableCallbacks) {
    webviewLogger.info(
      LogCategory.UI,
      'V1TemplatesTableController initialized',
      'V1TemplatesTableController.constructor',
      undefined,
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Render templates as expandable sections
   */
  render(templates: MarketplaceTemplate[]): void {
    this.templates = templates;
    const tbody = document.getElementById('knowledge-items');
    if (!tbody) {
      webviewLogger.error(
        LogCategory.UI,
        'knowledge-items tbody not found',
        'V1TemplatesTableController.render',
        undefined,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      return;
    }

    tbody.innerHTML = '';

    if (templates.length === 0) {
      this.renderEmptyState(tbody);
      return;
    }

    webviewLogger.debug(
      LogCategory.UI,
      'Rendering V1 templates',
      'V1TemplatesTableController.render',
      { templatesCount: templates.length, expandedCount: this.expandedTemplates.size },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    templates.forEach(template => {
      this.renderTemplateSection(tbody, template);
    });
  }

  /**
   * Render a single template section (header + items if expanded)
   */
  private renderTemplateSection(tbody: HTMLElement, template: MarketplaceTemplate): void {
    // Template header row
    const headerRow = this.createTemplateHeaderRow(template);
    tbody.appendChild(headerRow);

    // Item rows (if expanded)
    if (this.expandedTemplates.has(template.id)) {
      const items = template.items || [];
      if (items.length === 0) {
        // Show empty state within template
        const emptyRow = this.createEmptyItemsRow(template.id);
        tbody.appendChild(emptyRow);
      } else {
        items.forEach(item => {
          const itemRow = this.createItemRow(template.id, item);
          tbody.appendChild(itemRow);
        });
      }
    }
  }

  /**
   * Create template header row
   */
  private createTemplateHeaderRow(template: MarketplaceTemplate): HTMLElement {
    const row = document.createElement('tr');
    row.className = 'template-section-header';
    row.dataset.templateId = template.id;

    const isExpanded = this.expandedTemplates.has(template.id);
    const itemCount = template.items?.length || 0;
    const expandIcon = isExpanded ? '▼' : '▶';

    row.innerHTML = `
      <td class="col-select">
        <button class="expand-btn" data-template-id="${template.id}" title="${isExpanded ? 'Collapse' : 'Expand'} template">
          ${expandIcon}
        </button>
      </td>
      <td class="col-type">
        <span class="template-badge">📦 Template</span>
      </td>
      <td class="col-title">
        <strong>${this.escapeHtml(template.name)}</strong>
        <div class="template-meta">
          <span class="item-count">${itemCount} ${itemCount === 1 ? 'item' : 'items'}</span>
          ${template.version ? `<span class="version">v${this.escapeHtml(template.version)}</span>` : ''}
          ${template.lastVersionedAt ? `<span class="last-versioned" title="Last version checkpoint">Last versioned: ${this.formatDate(template.lastVersionedAt)}</span>` : ''}
        </div>
      </td>
      <td class="col-scope">${template.scope || '-'}</td>
      <td class="col-tags">
        ${template.tags?.map(t => `<span class="tag">${this.escapeHtml(t)}</span>`).join(' ') || '-'}
      </td>
      <td class="col-source">${template.source || 'user'}</td>
      <td class="col-actions">
        <button class="action-btn" data-action="add-item" data-template-id="${template.id}" title="Add item to template">➕</button>
        <button class="action-btn" data-action="create-version" data-template-id="${template.id}" title="Create version checkpoint">💾</button>
        <button class="action-btn" data-action="clone" data-template-id="${template.id}" title="Clone template">📋</button>
        <button class="action-btn" data-action="inject-template" data-template-id="${template.id}" title="Inject template to file">📦</button>
        <button class="action-btn" data-action="audit-log" data-template-id="${template.id}" title="View audit log">📊</button>
        <button class="action-btn" data-action="export" data-template-id="${template.id}" title="Export template to JSON">📤</button>
        <button class="action-btn" data-action="edit" data-template-id="${template.id}" title="Edit template">✏️</button>
        <button class="action-btn danger" data-action="delete" data-template-id="${template.id}" title="Delete template">🗑️</button>
      </td>
    `;

    // Event listeners
    const expandBtn = row.querySelector('.expand-btn');
    expandBtn?.addEventListener('click', () => this.toggleTemplate(template.id));

    const actionButtons = row.querySelectorAll('.action-btn');
    actionButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = (e.currentTarget as HTMLElement).dataset.action;
        const templateId = (e.currentTarget as HTMLElement).dataset.templateId;
        if (action && templateId) {
          this.handleTemplateAction(action, templateId);
        }
      });
    });

    return row;
  }

  /**
   * Create item row within a template
   */
  private createItemRow(templateId: string, item: KnowledgeItem): HTMLElement {
    const isEditing = this.inlineEditingItem?.templateId === templateId &&
                      this.inlineEditingItem?.itemId === item.id;

    if (isEditing) {
      return this.createEditableItemRow(templateId, item);
    } else {
      return this.createReadOnlyItemRow(templateId, item);
    }
  }

  /**
   * Create read-only item row
   */
  private createReadOnlyItemRow(templateId: string, item: KnowledgeItem): HTMLElement {
    const row = document.createElement('tr');
    row.className = 'template-item-row';
    row.dataset.templateId = templateId;
    row.dataset.itemId = item.id;

    const typeLabel = getKnowledgeTypeLabel(item.type as KnowledgeType);

    row.innerHTML = `
      <td class="col-select">
        <div class="item-indent"></div>
      </td>
      <td class="col-type">
        <span class="type-badge">${this.escapeHtml(typeLabel)}</span>
      </td>
      <td class="col-title">${this.escapeHtml(item.title)}</td>
      <td class="col-scope">${this.escapeHtml(item.scope)}</td>
      <td class="col-tags">
        ${item.tags?.map(t => `<span class="tag">${this.escapeHtml(t)}</span>`).join(' ') || '-'}
      </td>
      <td class="col-source">${item.source ? this.escapeHtml(item.source) : '-'}</td>
      <td class="col-actions">
        <button class="action-btn" data-action="edit-inline" data-template-id="${templateId}" data-item-id="${item.id}" title="Edit item inline">📝</button>
        <button class="action-btn" data-action="inject-item" data-template-id="${templateId}" data-item-id="${item.id}" title="Inject item to file">💉</button>
        <button class="action-btn" data-action="edit" data-template-id="${templateId}" data-item-id="${item.id}" title="Edit item">✏️</button>
        <button class="action-btn danger" data-action="delete" data-template-id="${templateId}" data-item-id="${item.id}" title="Delete item">🗑️</button>
      </td>
    `;

    // Event listeners
    const actionButtons = row.querySelectorAll('.action-btn');
    actionButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = (e.currentTarget as HTMLElement).dataset.action;
        const tId = (e.currentTarget as HTMLElement).dataset.templateId;
        const iId = (e.currentTarget as HTMLElement).dataset.itemId;
        if (action && tId && iId) {
          this.handleItemAction(action, tId, iId);
        }
      });
    });

    return row;
  }

  /**
   * Create editable item row with input fields
   */
  private createEditableItemRow(templateId: string, item: KnowledgeItem): HTMLElement {
    const row = document.createElement('tr');
    row.className = 'template-item-row editing';
    row.dataset.templateId = templateId;
    row.dataset.itemId = item.id;

    row.innerHTML = `
      <td class="col-select">
        <div class="item-indent"></div>
      </td>
      <td class="col-type">
        <select id="edit-type-${item.id}" class="inline-edit-input">
          ${this.renderKnowledgeTypeOptions(item.type)}
        </select>
      </td>
      <td class="col-title">
        <input type="text" id="edit-title-${item.id}" class="inline-edit-input" value="${this.escapeHtml(item.title)}" />
      </td>
      <td class="col-scope">
        <select id="edit-scope-${item.id}" class="inline-edit-input">
          ${this.renderScopeOptions(item.scope)}
        </select>
      </td>
      <td class="col-tags">
        <input type="text" id="edit-tags-${item.id}" class="inline-edit-input" value="${item.tags?.join(', ') || ''}" placeholder="tag1, tag2, tag3" />
      </td>
      <td class="col-source">${item.source ? this.escapeHtml(item.source) : '-'}</td>
      <td class="col-actions">
        <button class="action-btn" data-action="save-edit" data-template-id="${templateId}" data-item-id="${item.id}" title="Save changes">💾</button>
        <button class="action-btn" data-action="cancel-edit" data-template-id="${templateId}" data-item-id="${item.id}" title="Cancel editing">❌</button>
      </td>
    `;

    // Event listeners for save/cancel
    const saveBtn = row.querySelector('[data-action="save-edit"]');
    const cancelBtn = row.querySelector('[data-action="cancel-edit"]');

    saveBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.saveInlineEdit(templateId, item.id);
    });

    cancelBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.cancelInlineEdit();
    });

    return row;
  }

  /**
   * Create empty items row for templates with no items
   */
  private createEmptyItemsRow(templateId: string): HTMLElement {
    const row = document.createElement('tr');
    row.className = 'template-item-row empty-items-row';
    row.dataset.templateId = templateId;

    row.innerHTML = `
      <td colspan="7" style="text-align: center; padding: 20px; color: var(--vscode-descriptionForeground); font-size: 13px;">
        <div class="item-indent"></div>
        No items in this template yet. Click ➕ to add one.
      </td>
    `;

    return row;
  }

  /**
   * Toggle template expansion
   */
  private toggleTemplate(templateId: string): void {
    if (this.expandedTemplates.has(templateId)) {
      this.expandedTemplates.delete(templateId);
      webviewLogger.debug(
        LogCategory.UI,
        'Template collapsed',
        'V1TemplatesTableController.toggleTemplate',
        { templateId },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    } else {
      this.expandedTemplates.add(templateId);
      webviewLogger.debug(
        LogCategory.UI,
        'Template expanded',
        'V1TemplatesTableController.toggleTemplate',
        { templateId },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    }
    this.render(this.templates);
  }

  /**
   * Handle template-level actions
   */
  private handleTemplateAction(action: string, templateId: string): void {
    webviewLogger.info(
      LogCategory.UI,
      'Template action triggered',
      'V1TemplatesTableController.handleTemplateAction',
      { action, templateId },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    switch (action) {
      case 'add-item':
        this.callbacks.onAddItem(templateId);
        break;
      case 'create-version':
        this.callbacks.onCreateVersion(templateId);
        break;
      case 'clone':
        this.callbacks.onCloneTemplate(templateId);
        break;
      case 'inject-template':
        this.callbacks.onInjectTemplate(templateId);
        break;
      case 'audit-log':
        this.callbacks.onViewAuditLog(templateId);
        break;
      case 'export':
        this.callbacks.onExportTemplate(templateId);
        break;
      case 'edit':
        this.callbacks.onEditTemplate(templateId);
        break;
      case 'delete':
        this.callbacks.onDeleteTemplate(templateId);
        break;
    }
  }

  /**
   * Handle item-level actions
   */
  private handleItemAction(action: string, templateId: string, itemId: string): void {
    webviewLogger.info(
      LogCategory.UI,
      'Item action triggered',
      'V1TemplatesTableController.handleItemAction',
      { action, templateId, itemId },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    switch (action) {
      case 'edit-inline':
        this.callbacks.onEditItemInline(templateId, itemId);
        break;
      case 'inject-item':
        this.callbacks.onInjectItem(templateId, itemId);
        break;
      case 'edit':
        this.callbacks.onEditItem(templateId, itemId);
        break;
      case 'delete':
        this.callbacks.onDeleteItem(templateId, itemId);
        break;
    }
  }

  /**
   * Render empty state when no templates exist
   */
  private renderEmptyState(tbody: HTMLElement): void {
    tbody.innerHTML = `
      <tr class="knowledge-empty-state">
        <td colspan="7" style="text-align: center; padding: 40px;">
          <div style="font-size: 48px; margin-bottom: 16px;">📦</div>
          <div style="font-size: 16px; color: var(--vscode-descriptionForeground); margin-bottom: 8px;">
            No V1 templates yet
          </div>
          <div style="font-size: 14px; color: var(--vscode-descriptionForeground);">
            Click "📦 Create Template" to create your first template
          </div>
        </td>
      </tr>
    `;
  }

  /**
   * Format date for display
   */
  private formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString();
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Toggle inline editing mode for an item
   */
  toggleInlineEdit(templateId: string, itemId: string): void {
    if (this.inlineEditingItem?.templateId === templateId &&
        this.inlineEditingItem?.itemId === itemId) {
      // Cancel editing
      this.inlineEditingItem = null;
    } else {
      // Start editing
      this.inlineEditingItem = { templateId, itemId };
    }

    webviewLogger.debug(
      LogCategory.UI,
      this.inlineEditingItem ? 'Inline edit started' : 'Inline edit cancelled',
      'V1TemplatesTableController.toggleInlineEdit',
      { templateId, itemId },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Re-render to show editable row
    this.render(this.templates);
  }

  /**
   * Save inline edit changes
   */
  private saveInlineEdit(templateId: string, itemId: string): void {
    const typeEl = document.getElementById(`edit-type-${itemId}`) as HTMLSelectElement;
    const titleEl = document.getElementById(`edit-title-${itemId}`) as HTMLInputElement;
    const scopeEl = document.getElementById(`edit-scope-${itemId}`) as HTMLSelectElement;
    const tagsEl = document.getElementById(`edit-tags-${itemId}`) as HTMLInputElement;

    if (!typeEl || !titleEl || !scopeEl || !tagsEl) {
      webviewLogger.error(
        LogCategory.UI,
        'Inline edit elements not found',
        'V1TemplatesTableController.saveInlineEdit',
        { itemId },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      return;
    }

    const updates = {
      type: typeEl.value,
      title: titleEl.value,
      scope: scopeEl.value,
      tags: tagsEl.value.split(',').map(t => t.trim()).filter(t => t.length > 0)
    };

    webviewLogger.info(
      LogCategory.UI,
      'Saving inline edit',
      'V1TemplatesTableController.saveInlineEdit',
      { templateId, itemId, updates },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Call update callback
    this.callbacks.onUpdateItem(templateId, itemId, updates);

    // Exit editing mode
    this.inlineEditingItem = null;
    this.render(this.templates);
  }

  /**
   * Cancel inline edit
   */
  private cancelInlineEdit(): void {
    webviewLogger.debug(
      LogCategory.UI,
      'Inline edit cancelled',
      'V1TemplatesTableController.cancelInlineEdit',
      undefined,
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    this.inlineEditingItem = null;
    this.render(this.templates);
  }

  /**
   * Render knowledge type options for dropdown
   */
  private renderKnowledgeTypeOptions(currentType: string): string {
    const types = [
      { value: 'golden-path', label: 'Golden Path' },
      { value: 'adr', label: 'ADR' },
      { value: 'pattern', label: 'Pattern' },
      { value: 'learning', label: 'Learning' },
      { value: 'snippet', label: 'Snippet' },
      { value: 'standard', label: 'Standard' },
      { value: 'best-practice', label: 'Best Practice' },
      { value: 'how-to', label: 'How-To Guide' },
      { value: 'anti-pattern', label: 'Anti-Pattern' },
      { value: 'api-spec', label: 'API Spec' },
      { value: 'code-review-checklist', label: 'Code Review Checklist' },
      { value: 'data-model', label: 'Data Model' },
      { value: 'design-pattern', label: 'Design Pattern' },
      { value: 'meeting-note', label: 'Meeting Note' },
      { value: 'onboarding', label: 'Onboarding' },
      { value: 'performance-tip', label: 'Performance Tip' },
      { value: 'refactoring-guide', label: 'Refactoring Guide' },
      { value: 'security-guideline', label: 'Security Guideline' },
      { value: 'technical-debt', label: 'Technical Debt' },
      { value: 'testing-strategy', label: 'Testing Strategy' },
      { value: 'troubleshooting-guide', label: 'Troubleshooting Guide' }
    ];

    return types.map(t =>
      `<option value="${t.value}" ${t.value === currentType ? 'selected' : ''}>${t.label}</option>`
    ).join('');
  }

  /**
   * Render scope options for dropdown
   */
  private renderScopeOptions(currentScope: string): string {
    const scopes = [
      { value: 'personal', label: 'Personal' },
      { value: 'team', label: 'Team' },
      { value: 'project', label: 'Project' },
      { value: 'organization', label: 'Organization' },
      { value: 'public', label: 'Public' }
    ];

    return scopes.map(s =>
      `<option value="${s.value}" ${s.value === currentScope ? 'selected' : ''}>${s.label}</option>`
    ).join('');
  }
}
