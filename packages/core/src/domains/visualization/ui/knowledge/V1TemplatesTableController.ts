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
}

export class V1TemplatesTableController {
  private templates: MarketplaceTemplate[] = [];
  private expandedTemplates: Set<string> = new Set();

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
        <button class="action-btn" data-action="audit-log" data-template-id="${template.id}" title="View audit log">📊</button>
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
      case 'audit-log':
        this.callbacks.onViewAuditLog(templateId);
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

    if (action === 'edit') {
      this.callbacks.onEditItem(templateId, itemId);
    } else if (action === 'delete') {
      this.callbacks.onDeleteItem(templateId, itemId);
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
}
