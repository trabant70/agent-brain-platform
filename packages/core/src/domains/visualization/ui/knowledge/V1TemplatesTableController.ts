/**
 * V1TemplatesTableController - Renders templates as expandable sections
 *
 * Displays templates with embedded items in a collapsible table view.
 * Each template shows its metadata, item count, version info, and actions.
 * Items within expanded templates show their own details and actions.
 */

import { MarketplaceTemplate, KnowledgeItem, KnowledgeType, getKnowledgeTypeLabel, getKnowledgeTypeIcon, MaturityFootprint } from '../../../knowledge/types';
import { webviewLogger, LogCategory, LogPathway } from '../../webview/WebviewLogger';
import { t } from '../../webview/i18n';

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
  onReorderItem: (templateId: string, itemId: string, newIndex: number) => void;
}

export class V1TemplatesTableController {
  private templates: MarketplaceTemplate[] = [];
  private expandedTemplates: Set<string> = new Set();
  private inlineEditingItem: { templateId: string; itemId: string } | null = null;
  private draggedItem: { templateId: string; itemId: string } | null = null;

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
      // Drop zone (always visible when expanded)
      const dropZone = this.createDropZoneRow(template.id);
      tbody.appendChild(dropZone);

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
        <button class="expand-btn" data-template-id="${template.id}" title="${isExpanded ? t('tooltip.collapseTemplate') : t('tooltip.expandTemplate')}">
          ${expandIcon}
        </button>
      </td>
      <td class="col-type">
        <span class="template-badge">💉 Template</span>
      </td>
      <td class="col-title">
        <strong class="template-title">${this.escapeHtml(template.name)}</strong>
        <div class="template-meta">
          <span class="item-count">${itemCount} ${itemCount === 1 ? 'item' : 'items'}</span>
          ${template.version ? `<span class="version">v${this.escapeHtml(template.version)}</span>` : ''}
          ${template.lastVersionedAt ? `<span class="last-versioned" title="${t('tooltip.lastVersionCheckpoint')}">Last versioned: ${this.formatDate(template.lastVersionedAt)}</span>` : ''}
        </div>
      </td>
      <td class="col-scope">${template.scope || '-'}</td>
      <td class="col-tags">
        ${template.tags?.map(t => `<span class="tag">${this.escapeHtml(t)}</span>`).join(' ') || '-'}
      </td>
      <td class="col-maturity">
        <span style="font-size: 11px; color: var(--vscode-descriptionForeground);">-</span>
      </td>
      <td class="col-actions">
        ${template.source === 'bundled' && !template.userEditable ? '' : '<button class="action-btn" data-action="add-item" data-template-id="' + template.id + '" title="' + t('tooltip.addItemToTemplate') + '">➕</button>'}
        ${template.source === 'bundled' ? '' : '<button class="action-btn" data-action="create-version" data-template-id="' + template.id + '" title="' + t('tooltip.createVersionCheckpoint') + '">💾</button>'}
        <button class="action-btn" data-action="clone" data-template-id="${template.id}" title="${t('template.cloneTemplate')}">📋</button>
        <button class="action-btn" data-action="inject-template" data-template-id="${template.id}" title="${t('tooltip.injectTemplateToFile')}">💉</button>
        ${template.source === 'bundled' ? '' : '<button class="action-btn" data-action="audit-log" data-template-id="' + template.id + '" title="' + t('tooltip.viewAuditLog') + '">📊</button>'}
        <button class="action-btn" data-action="export" data-template-id="${template.id}" title="${t('tooltip.exportTemplateToJSON')}">📤</button>
        ${template.source === 'bundled' ? '' : '<button class="action-btn" data-action="edit" data-template-id="' + template.id + '" title="' + t('tooltip.editTemplate') + '">✏️</button>'}
        ${template.source === 'bundled' ? '' : '<button class="action-btn danger" data-action="delete" data-template-id="' + template.id + '" title="' + t('tooltip.deleteTemplate') + '">🗑️</button>'}
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
    row.draggable = true;

    const typeLabel = getKnowledgeTypeLabel(item.type as KnowledgeType);
    const typeIcon = getKnowledgeTypeIcon(item.type as KnowledgeType);

    // Check if template is bundled and not user-editable
    const template = this.templates.find(t => t.id === templateId);
    const isBundledNotEditable = template?.source === 'bundled' && !template?.userEditable;

    row.innerHTML = `
      <td class="col-select">
        <div class="item-indent"></div>
      </td>
      <td class="col-type">
        <span class="type-badge">${typeIcon} ${this.escapeHtml(typeLabel)}</span>
      </td>
      <td class="col-title">${this.escapeHtml(item.title)}</td>
      <td class="col-scope">${this.escapeHtml(item.scope)}</td>
      <td class="col-tags">
        ${item.tags?.map(t => `<span class="tag">${this.escapeHtml(t)}</span>`).join(' ') || '-'}
      </td>
      <td class="col-maturity" style="position: relative;">
        ${this.renderMaturityIndicators(item.maturity)}
        <button class="info-btn" style="margin-left: 4px; padding: 0 4px; font-size: 10px; cursor: pointer; border: 1px solid var(--vscode-button-border); background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border-radius: 2px;" title="${t('tooltip.showDetails')}">ⓘ</button>
        ${template ? this.renderInfoPopup(item, template) : ''}
      </td>
      <td class="col-actions">
        ${isBundledNotEditable ? '' : '<button class="action-btn" data-action="edit-inline" data-template-id="' + templateId + '" data-item-id="' + item.id + '" title="' + t('tooltip.editItemInline') + '">📝</button>'}
        <button class="action-btn" data-action="inject-item" data-template-id="${templateId}" data-item-id="${item.id}" title="${t('tooltip.injectItemToFile')}">💉</button>
        ${isBundledNotEditable ? '' : '<button class="action-btn" data-action="edit" data-template-id="' + templateId + '" data-item-id="' + item.id + '" title="' + t('tooltip.editItem') + '">✏️</button>'}
        ${isBundledNotEditable ? '' : '<button class="action-btn danger" data-action="delete" data-template-id="' + templateId + '" data-item-id="' + item.id + '" title="' + t('tooltip.deleteItem') + '">🗑️</button>'}
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

    // Info button event listener
    const infoBtn = row.querySelector('.info-btn');
    const infoPopup = row.querySelector('.item-info-popup') as HTMLElement;
    if (infoBtn && infoPopup) {
      infoBtn.addEventListener('mouseenter', () => {
        infoPopup.style.display = 'block';
      });
      infoBtn.addEventListener('mouseleave', () => {
        setTimeout(() => {
          if (!infoPopup.matches(':hover')) {
            infoPopup.style.display = 'none';
          }
        }, 100);
      });
      infoPopup.addEventListener('mouseleave', () => {
        infoPopup.style.display = 'none';
      });
    }

    // Drag-drop event listeners
    row.addEventListener('dragstart', (e) => this.handleDragStart(e, templateId, item.id));
    row.addEventListener('dragend', (e) => this.handleDragEnd(e));
    row.addEventListener('dragover', (e) => this.handleItemDragOver(e, templateId, item.id));
    row.addEventListener('dragleave', (e) => this.handleItemDragLeave(e));
    row.addEventListener('drop', (e) => this.handleItemDrop(e, templateId, item.id));

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
        <input type="text" id="edit-tags-${item.id}" class="inline-edit-input" value="${item.tags?.join(', ') || ''}" placeholder="${t('input.tagsPlaceholder')}" />
      </td>
      <td class="col-maturity">
        ${this.renderMaturityIndicators(item.maturity)}
      </td>
      <td class="col-actions">
        <button class="action-btn" data-action="save-edit" data-template-id="${templateId}" data-item-id="${item.id}" title="${t('tooltip.saveChanges')}">💾</button>
        <button class="action-btn" data-action="cancel-edit" data-template-id="${templateId}" data-item-id="${item.id}" title="${t('tooltip.cancelEditing')}">❌</button>
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
   * Toggle all templates expanded/collapsed
   */
  toggleAllSections(): void {
    const allExpanded = this.expandedTemplates.size === this.templates.length;

    if (allExpanded) {
      // Collapse all
      this.expandedTemplates.clear();
      webviewLogger.debug(
        LogCategory.UI,
        'All templates collapsed',
        'V1TemplatesTableController.toggleAllSections',
        { templateCount: this.templates.length },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    } else {
      // Expand all
      this.templates.forEach(t => this.expandedTemplates.add(t.id));
      webviewLogger.debug(
        LogCategory.UI,
        'All templates expanded',
        'V1TemplatesTableController.toggleAllSections',
        { templateCount: this.templates.length },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    }

    this.render(this.templates);

    // Update button icon
    const toggleBtn = document.getElementById('toggle-all-sections');
    if (toggleBtn) {
      toggleBtn.textContent = allExpanded ? '▶' : '▼';
    }
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
          <div style="font-size: 48px; margin-bottom: 16px;">💉</div>
          <div style="font-size: 16px; color: var(--vscode-descriptionForeground); margin-bottom: 8px;">
            No V1 templates yet
          </div>
          <div style="font-size: 14px; color: var(--vscode-descriptionForeground);">
            Click "💉 Create Template" to create your first template
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
   * Create drop zone row for drag-drop
   */
  private createDropZoneRow(templateId: string): HTMLElement {
    const row = document.createElement('tr');
    row.className = 'template-drop-zone';
    row.dataset.templateId = templateId;

    row.innerHTML = `
      <td colspan="7" class="drop-zone-cell">
        <div class="drop-zone-indicator">Drop items here to add to template</div>
      </td>
    `;

    // Event listeners
    row.addEventListener('dragover', (e) => this.handleDragOver(e, templateId));
    row.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    row.addEventListener('drop', (e) => this.handleDrop(e, templateId));

    return row;
  }

  /**
   * Handle drag start
   */
  private handleDragStart(e: DragEvent, templateId: string, itemId: string): void {
    this.draggedItem = { templateId, itemId };
    e.dataTransfer!.effectAllowed = 'copyMove';
    e.dataTransfer!.setData('text/plain', itemId);

    const target = e.currentTarget as HTMLElement;
    target.classList.add('dragging');

    webviewLogger.debug(
      LogCategory.UI,
      'Drag started',
      'V1TemplatesTableController.handleDragStart',
      { templateId, itemId },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Handle drag end
   */
  private handleDragEnd(e: DragEvent): void {
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('dragging');
    this.clearDropZoneHighlights();

    webviewLogger.debug(
      LogCategory.UI,
      'Drag ended',
      'V1TemplatesTableController.handleDragEnd',
      undefined,
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Handle drag over
   */
  private handleDragOver(e: DragEvent, targetTemplateId: string): void {
    e.preventDefault();
    e.stopPropagation();

    // Set drop effect based on Ctrl key
    e.dataTransfer!.dropEffect = e.ctrlKey ? 'copy' : 'move';

    // Highlight drop zone
    const target = e.currentTarget as HTMLElement;
    target.classList.add('drop-zone-active');
  }

  /**
   * Handle drag leave
   */
  private handleDragLeave(e: DragEvent): void {
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drop-zone-active');
  }

  /**
   * Handle drop
   */
  private handleDrop(e: DragEvent, targetTemplateId: string): void {
    e.preventDefault();
    e.stopPropagation();

    if (!this.draggedItem) {
      webviewLogger.warn(
        LogCategory.UI,
        'Drop without dragged item',
        'V1TemplatesTableController.handleDrop',
        undefined,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      return;
    }

    const { templateId: sourceTemplateId, itemId } = this.draggedItem;
    const isCopy = e.ctrlKey;

    // Same template and not copying? No-op
    if (sourceTemplateId === targetTemplateId && !isCopy) {
      webviewLogger.debug(
        LogCategory.UI,
        'Drop to same template ignored',
        'V1TemplatesTableController.handleDrop',
        { sourceTemplateId, targetTemplateId },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      this.clearDropZoneHighlights();
      this.draggedItem = null;
      return;
    }

    webviewLogger.info(
      LogCategory.UI,
      isCopy ? 'Item copied via drag-drop' : 'Item moved via drag-drop',
      'V1TemplatesTableController.handleDrop',
      { itemId, sourceTemplateId, targetTemplateId, isCopy },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Call appropriate callback
    if (isCopy) {
      this.callbacks.onCopyItem(itemId, sourceTemplateId, targetTemplateId);
    } else {
      this.callbacks.onMoveItem(itemId, sourceTemplateId, targetTemplateId);
    }

    // Clean up
    this.clearDropZoneHighlights();
    this.draggedItem = null;
  }

  /**
   * Clear drop zone highlights
   */
  private clearDropZoneHighlights(): void {
    document.querySelectorAll('.drop-zone-active').forEach(el => {
      el.classList.remove('drop-zone-active');
    });
    document.querySelectorAll('.drop-target-before, .drop-target-after').forEach(el => {
      el.classList.remove('drop-target-before', 'drop-target-after');
    });
  }

  /**
   * Handle drag over an item row (for reordering)
   */
  private handleItemDragOver(e: DragEvent, targetTemplateId: string, targetItemId: string): void {
    if (!this.draggedItem) return;

    e.preventDefault();
    e.stopPropagation();

    const { templateId: sourceTemplateId, itemId: sourceItemId } = this.draggedItem;

    // Only allow reordering within same template
    if (sourceTemplateId !== targetTemplateId) {
      return;
    }

    // Don't drop on self
    if (sourceItemId === targetItemId) {
      return;
    }

    // Set drop effect
    e.dataTransfer!.dropEffect = 'move';

    // Determine drop position (before or after target item)
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const mouseY = e.clientY;

    // Clear previous highlights
    this.clearDropZoneHighlights();

    // Add appropriate highlight
    if (mouseY < midpoint) {
      target.classList.add('drop-target-before');
    } else {
      target.classList.add('drop-target-after');
    }
  }

  /**
   * Handle drag leave from an item row
   */
  private handleItemDragLeave(e: DragEvent): void {
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drop-target-before', 'drop-target-after');
  }

  /**
   * Handle drop on an item row (for reordering)
   */
  private handleItemDrop(e: DragEvent, targetTemplateId: string, targetItemId: string): void {
    e.preventDefault();
    e.stopPropagation();

    if (!this.draggedItem) return;

    const { templateId: sourceTemplateId, itemId: sourceItemId } = this.draggedItem;

    // Only allow reordering within same template
    if (sourceTemplateId !== targetTemplateId) {
      webviewLogger.debug(
        LogCategory.UI,
        'Cross-template drop on item ignored (use drop zone instead)',
        'V1TemplatesTableController.handleItemDrop',
        { sourceTemplateId, targetTemplateId },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      this.clearDropZoneHighlights();
      return;
    }

    // Don't drop on self
    if (sourceItemId === targetItemId) {
      this.clearDropZoneHighlights();
      this.draggedItem = null;
      return;
    }

    // Find the template and items
    const template = this.templates.find(t => t.id === targetTemplateId);
    if (!template || !template.items) {
      this.clearDropZoneHighlights();
      this.draggedItem = null;
      return;
    }

    // Find target item index
    const targetIndex = template.items.findIndex(i => i.id === targetItemId);
    if (targetIndex === -1) {
      this.clearDropZoneHighlights();
      this.draggedItem = null;
      return;
    }

    // Determine drop position
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const mouseY = e.clientY;
    const dropBefore = mouseY < midpoint;

    // Calculate new index
    let newIndex = dropBefore ? targetIndex : targetIndex + 1;

    // Adjust if moving item down
    const sourceIndex = template.items.findIndex(i => i.id === sourceItemId);
    if (sourceIndex !== -1 && sourceIndex < newIndex) {
      newIndex--;
    }

    webviewLogger.info(
      LogCategory.UI,
      'Item reordered within template',
      'V1TemplatesTableController.handleItemDrop',
      { templateId: targetTemplateId, itemId: sourceItemId, oldIndex: sourceIndex, newIndex, dropBefore },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Call reorder callback
    this.callbacks.onReorderItem(targetTemplateId, sourceItemId, newIndex);

    // Clean up
    this.clearDropZoneHighlights();
    this.draggedItem = null;
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

  /**
   * Render maturity indicators for an item
   */
  private renderMaturityIndicators(maturity: MaturityFootprint | undefined): string {
    if (!maturity) {
      return '<span style="font-size: 11px; color: var(--vscode-descriptionForeground);">All</span>';
    }

    const { operator, project, complexity } = maturity;

    // Create compact visual indicators
    const operatorRange = operator.min === operator.max ? `${operator.min}` : `${operator.min}-${operator.max}`;
    const projectRange = project.min === project.max ? `${project.min}` : `${project.min}-${project.max}`;
    const complexityMap: Record<number, string> = { 1: 'S', 2: 'M', 3: 'C' };
    let complexityStr = 'Any';
    if (complexity.min === complexity.max) {
      complexityStr = complexityMap[complexity.min] || 'Any';
    } else if (complexity.min !== 1 || complexity.max !== 3) {
      complexityStr = `${complexityMap[complexity.min]}-${complexityMap[complexity.max]}`;
    }

    return `
      <div class="maturity-indicators" style="display: flex; flex-direction: column; gap: 2px; font-size: 10px;">
        <div class="maturity-indicator" style="display: flex; align-items: center; gap: 4px;">
          <span style="color: var(--vscode-descriptionForeground); min-width: 16px;">Op:</span>
          <span style="background: var(--vscode-button-background); padding: 1px 4px; border-radius: 2px; font-weight: 600;">${operatorRange}</span>
        </div>
        <div class="maturity-indicator" style="display: flex; align-items: center; gap: 4px;">
          <span style="color: var(--vscode-descriptionForeground); min-width: 16px;">Pr:</span>
          <span style="background: var(--vscode-button-background); padding: 1px 4px; border-radius: 2px; font-weight: 600;">${projectRange}</span>
        </div>
        ${complexityStr !== 'Any' ? `
          <div class="maturity-indicator" style="display: flex; align-items: center; gap: 4px;">
            <span style="color: var(--vscode-descriptionForeground); min-width: 16px;">Cx:</span>
            <span style="background: var(--vscode-button-background); padding: 1px 4px; border-radius: 2px; font-weight: 600;">${complexityStr}</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render info popup for item details
   */
  private renderInfoPopup(item: KnowledgeItem, template: MarketplaceTemplate): string {
    const maturity = item.maturity;
    let maturityText = 'All contexts';
    if (maturity) {
      const opRange = maturity.operator.min === maturity.operator.max
        ? `${maturity.operator.min}`
        : `${maturity.operator.min}-${maturity.operator.max}`;
      const prRange = maturity.project.min === maturity.project.max
        ? `${maturity.project.min}`
        : `${maturity.project.min}-${maturity.project.max}`;
      const cxRange = maturity.complexity.min === maturity.complexity.max
        ? `${maturity.complexity.min}`
        : `${maturity.complexity.min}-${maturity.complexity.max}`;
      maturityText = `Operator: ${opRange}, Project: ${prRange}, Complexity: ${cxRange}`;
    }

    return `
      <div class="item-info-popup" style="position: absolute; z-index: 1000; background: var(--vscode-editorHoverWidget-background); border: 1px solid var(--vscode-editorHoverWidget-border); border-radius: 4px; padding: 8px; font-size: 12px; min-width: 200px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: none;">
        <div style="margin-bottom: 4px;"><strong>Source:</strong> ${this.escapeHtml(item.source || template.source || 'user')}</div>
        <div style="margin-bottom: 4px;"><strong>Template:</strong> ${this.escapeHtml(template.name)}</div>
        <div style="margin-bottom: 4px;"><strong>Maturity:</strong> ${maturityText}</div>
        ${item.id ? `<div style="margin-bottom: 4px;"><strong>ID:</strong> ${this.escapeHtml(item.id)}</div>` : ''}
      </div>
    `;
  }
}
