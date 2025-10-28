/**
 * UnifiedKnowledgeTableController - Single table with pluggable grouping strategies
 *
 * Replaces the multiple view controllers with a unified table that can switch
 * between different grouping strategies via a dropdown selector.
 *
 * Features:
 * - Strategy-based grouping (Template, Operator, Project, Complexity, Catchment)
 * - Expand/collapse groups
 * - Group injection to claude.md files
 * - Injection status indicators
 * - Maturity context awareness
 */

import { KnowledgeItem, MaturityContext, MarketplaceTemplate } from '../../../knowledge/types';
import { GroupType, InjectionStatus } from '../../../knowledge/GroupTypes';
import { ViewMode, GroupSection, getViewModeInfo, getAllViewModes } from './ViewMode';
import { GroupingStrategy } from './GroupingStrategy';
import { TemplateGroupingStrategy } from './strategies/TemplateGroupingStrategy';
import { OperatorGroupingStrategy } from './strategies/OperatorGroupingStrategy';
import { ProjectGroupingStrategy } from './strategies/ProjectGroupingStrategy';
import { ComplexityGroupingStrategy } from './strategies/ComplexityGroupingStrategy';
import { CatchmentGroupingStrategy } from './strategies/CatchmentGroupingStrategy';
import { t } from '../../webview/i18n';
import { webviewLogger, LogCategory, LogPathway } from '../../webview/WebviewLogger';
import { ModalDialog } from '../ModalDialog';

/**
 * Callbacks from table controller to parent
 */
export interface UnifiedKnowledgeTableCallbacks {
  onInjectGroup: (groupType: GroupType, groupId: string, itemIds: string[]) => void;
  onRemoveGroup: (groupType: GroupType, groupId: string) => void;
  onEditItem: (templateId: string, itemId: string) => void;
  onDeleteItem: (templateId: string, itemId: string) => void;
  onShowNotification: (message: string, type: 'info' | 'warning' | 'error', duration: number) => void;
  // Template-specific actions
  onCloneTemplate?: (templateId: string) => void;
  onEditTemplate?: (templateId: string) => void;
  onDeleteTemplate?: (templateId: string) => void;
  onAddItemToTemplate?: (templateId: string) => void;
  onViewTemplateAuditLog?: (templateId: string) => void;
  // Get selected file for injection
  getSelectedFile?: () => string | undefined;
}

/**
 * Unified knowledge table with grouping strategies
 */
export class UnifiedKnowledgeTableController {
  private containerId: string;
  private dropdownId: string;
  private currentMode: ViewMode = ViewMode.BY_TEMPLATE;
  private strategies: Map<ViewMode, GroupingStrategy> = new Map();
  private items: KnowledgeItem[] = [];
  private templates: MarketplaceTemplate[] = [];
  private maturityContext: MaturityContext | null = null;
  private expandedGroups: Set<string> = new Set();
  private groupInjectionStatus: Map<string, { status: InjectionStatus; files: string[] }> = new Map();

  constructor(
    containerId: string,
    dropdownId: string,
    private callbacks: UnifiedKnowledgeTableCallbacks
  ) {
    this.containerId = containerId;
    this.dropdownId = dropdownId;

    // Initialize all strategies
    this.initializeStrategies();

    webviewLogger.info(
      LogCategory.UI,
      'UnifiedKnowledgeTableController initialized',
      'UnifiedKnowledgeTableController.constructor',
      { containerId, dropdownId, defaultMode: this.currentMode },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Initialize all grouping strategies
   */
  private initializeStrategies(): void {
    this.strategies.set(ViewMode.BY_TEMPLATE, new TemplateGroupingStrategy());
    this.strategies.set(ViewMode.BY_OPERATOR, new OperatorGroupingStrategy());
    this.strategies.set(ViewMode.BY_PROJECT, new ProjectGroupingStrategy());
    this.strategies.set(ViewMode.BY_COMPLEXITY, new ComplexityGroupingStrategy());
    this.strategies.set(ViewMode.BY_CATCHMENT, new CatchmentGroupingStrategy());

    webviewLogger.debug(
      LogCategory.UI,
      'Grouping strategies initialized',
      'UnifiedKnowledgeTableController.initializeStrategies',
      { strategyCount: this.strategies.size },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Set templates (required for template grouping)
   */
  setTemplates(templates: MarketplaceTemplate[]): void {
    this.templates = templates;

    // Update template strategy
    const templateStrategy = this.strategies.get(ViewMode.BY_TEMPLATE) as TemplateGroupingStrategy;
    if (templateStrategy) {
      templateStrategy.setTemplates(templates);
    }

    // Extract all items from templates
    const allItems: KnowledgeItem[] = [];
    templates.forEach(template => {
      if (template.items) {
        allItems.push(...template.items);
      }
    });
    this.items = allItems;
  }

  /**
   * Set maturity context
   */
  setMaturityContext(context: MaturityContext | null): void {
    this.maturityContext = context;
    this.render();
  }

  /**
   * Set injection status for groups
   */
  setInjectionStatus(statusMap: Map<string, { status: InjectionStatus; files: string[] }>): void {
    this.groupInjectionStatus = statusMap;
    this.render();
  }

  /**
   * Set grouping mode
   */
  setGroupingMode(mode: ViewMode): void {
    if (mode === this.currentMode) {
      return;
    }

    this.currentMode = mode;

    webviewLogger.info(
      LogCategory.UI,
      'Grouping mode changed',
      'UnifiedKnowledgeTableController.setGroupingMode',
      { newMode: mode },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Clear expanded state when switching modes
    this.expandedGroups.clear();

    // Re-render with new grouping
    this.render();
  }

  /**
   * Render the table with current grouping
   */
  render(): void {
    const container = document.getElementById(this.containerId);
    if (!container) {
      webviewLogger.warn(
        LogCategory.UI,
        'Container not found for rendering',
        'UnifiedKnowledgeTableController.render',
        { containerId: this.containerId },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      return;
    }

    // Get current strategy
    const strategy = this.strategies.get(this.currentMode);
    if (!strategy) {
      webviewLogger.error(
        LogCategory.UI,
        'No strategy found for current mode',
        'UnifiedKnowledgeTableController.render',
        { mode: this.currentMode },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      return;
    }

    // Calculate groups
    const groups = strategy.calculateGroups(this.items, this.maturityContext);

    webviewLogger.debug(
      LogCategory.UI,
      'Rendering unified table',
      'UnifiedKnowledgeTableController.render',
      {
        mode: this.currentMode,
        groupCount: groups.length,
        itemCount: this.items.length
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Render dropdown
    this.renderDropdown();

    // Clear container
    container.innerHTML = '';

    if (groups.length === 0) {
      this.renderEmptyState(container);
      return;
    }

    // Render each group
    groups.forEach(group => {
      const groupElement = this.renderGroup(group, strategy);
      container.appendChild(groupElement);
    });

    // Initialize tooltips after rendering
    this.initializeTooltips();
  }

  /**
   * Get or create the shared tooltip element
   */
  private getTooltipElement(): HTMLElement {
    let tooltip = document.querySelector('.custom-tooltip') as HTMLElement;

    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'custom-tooltip';
      tooltip.style.cssText = `
        position: fixed;
        background: var(--vscode-editorHoverWidget-background);
        color: var(--vscode-editorHoverWidget-foreground);
        border: 1px solid var(--vscode-editorHoverWidget-border);
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        line-height: 1.5;
        white-space: pre-line;
        z-index: 10000;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s ease;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      `;
      document.body.appendChild(tooltip);
      console.log('[TOOLTIP] Created new tooltip element');
    }

    return tooltip;
  }

  /**
   * Initialize tooltips for badges within a specific element
   */
  private initializeTooltipsForElement(element: HTMLElement): void {
    const tooltip = this.getTooltipElement();
    const badges = element.querySelectorAll('.status-badge[data-tooltip]');

    console.log(`[TOOLTIP] Initializing ${badges.length} badges in element`);

    badges.forEach((badge, index) => {
      const tooltipText = badge.getAttribute('data-tooltip');
      console.log(`[TOOLTIP] Badge ${index}: tooltip="${tooltipText?.substring(0, 50)}..."`);
      if (!tooltipText) return;

      // Remove existing listeners (if any) to avoid duplicates
      const newBadge = badge.cloneNode(true) as HTMLElement;
      badge.parentNode?.replaceChild(newBadge, badge);

      // Show tooltip on mouse enter
      newBadge.addEventListener('mouseenter', (e: Event) => {
        console.log('[TOOLTIP] mouseenter event fired');
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        tooltip.textContent = tooltipText;
        tooltip.style.opacity = '1';
        tooltip.style.left = `${rect.left}px`;
        tooltip.style.top = `${rect.bottom + 8}px`;
        console.log(`[TOOLTIP] Showing tooltip at (${rect.left}, ${rect.bottom + 8})`);
      });

      // Hide tooltip on mouse leave
      newBadge.addEventListener('mouseleave', () => {
        console.log('[TOOLTIP] mouseleave event fired');
        tooltip.style.opacity = '0';
      });

      // Update tooltip position on mouse move
      newBadge.addEventListener('mousemove', (e: Event) => {
        const mouseEvent = e as MouseEvent;
        tooltip.style.left = `${mouseEvent.clientX - tooltip.offsetWidth / 2}px`;
        tooltip.style.top = `${mouseEvent.clientY + 20}px`;
      });
    });
  }

  /**
   * Initialize custom tooltips for all status badges (legacy method, calls new one)
   */
  private initializeTooltips(): void {
    console.log('[TOOLTIP] initializeTooltips() called for entire container');
    const container = document.getElementById(this.containerId);
    if (container) {
      this.initializeTooltipsForElement(container);
    }
  }

  /**
   * Render group-by dropdown selector
   */
  private renderDropdown(): void {
    const dropdown = document.getElementById(this.dropdownId) as HTMLSelectElement;
    if (!dropdown) {
      return;
    }

    // Clear existing options
    dropdown.innerHTML = '';

    // Add option for each available mode
    getAllViewModes().forEach(mode => {
      const info = getViewModeInfo(mode);
      const option = document.createElement('option');
      option.value = mode;
      option.textContent = `${info.icon} ${info.label}`;
      option.title = info.description;

      if (mode === this.currentMode) {
        option.selected = true;
      }

      dropdown.appendChild(option);
    });

    // Wire up change event
    dropdown.onchange = () => {
      const selectedMode = dropdown.value as ViewMode;
      this.setGroupingMode(selectedMode);
    };
  }

  /**
   * Render a single group
   */
  private renderGroup(group: GroupSection, strategy: GroupingStrategy): HTMLElement {
    const section = document.createElement('div');
    section.className = 'group-section';
    section.dataset.groupId = group.id;

    const isExpanded = this.expandedGroups.has(group.id);
    const injectionInfo = this.groupInjectionStatus.get(group.id) || { status: InjectionStatus.NOT_INJECTED, files: [] };

    // Header
    const header = this.renderGroupHeader(group, isExpanded, injectionInfo, strategy);
    section.appendChild(header);

    // Items (only if expanded)
    if (isExpanded) {
      const itemsList = this.renderGroupItems(group);
      section.appendChild(itemsList);
    }

    return section;
  }

  /**
   * Render group header
   */
  private renderGroupHeader(
    group: GroupSection,
    isExpanded: boolean,
    injectionInfo: { status: InjectionStatus; files: string[] },
    strategy: GroupingStrategy
  ): HTMLElement {
    const header = document.createElement('div');
    header.className = 'group-section-header';

    const expandIcon = isExpanded ? '▼' : '▶';
    const statusBadge = this.getStatusBadge(injectionInfo.status, injectionInfo.files);

    header.innerHTML = `
      <div class="group-header-left">
        <button class="expand-btn" data-group-id="${group.id}" title="${isExpanded ? 'Collapse' : 'Expand'}">
          ${expandIcon}
        </button>
        <strong class="group-label">${this.escapeHtml(group.label)}</strong>
        <span class="item-count">${group.itemIds.length} items</span>
        ${statusBadge}
      </div>
      <div class="group-header-right hover-actions">
        ${this.renderGroupActions(group, injectionInfo.status, strategy)}
      </div>
    `;

    // Wire up expand/collapse
    const expandBtn = header.querySelector('.expand-btn');
    expandBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleGroup(group.id);
    });

    // Wire up action buttons
    this.wireUpActionButtons(header, group, strategy);

    // Initialize tooltips for the status badge in this header
    this.initializeTooltipsForElement(header);

    return header;
  }

  /**
   * Render group action buttons (icon-only with tooltips)
   */
  private renderGroupActions(group: GroupSection, status: InjectionStatus, strategy: GroupingStrategy): string {
    const canInject = status !== InjectionStatus.INJECTED;
    const canRemove = status === InjectionStatus.INJECTED;
    const isTemplateView = strategy.getMode() === ViewMode.BY_TEMPLATE;

    console.log(`[ACTIONS] renderGroupActions for group ${group.id}, mode=${strategy.getMode()}, isTemplateView=${isTemplateView}`);

    let actions = '';

    // Inject/Remove (all views)
    if (canInject) {
      actions += `
        <button class="action-btn inject-btn" data-action="inject" data-group-id="${group.id}" title="${t('grouping.action.inject')}">
          💉
        </button>
      `;
    }

    if (canRemove) {
      actions += `
        <button class="action-btn remove-btn" data-action="remove" data-group-id="${group.id}" title="${t('grouping.action.remove')}">
          ⏏️
        </button>
      `;
    }

    // Template-specific actions (only in template view)
    if (isTemplateView) {
      console.log(`[ACTIONS] Adding template-specific actions for ${group.id}`);
      actions += `
        <button class="action-btn audit-btn" data-action="audit" data-template-id="${group.id}" title="${t('tooltip.viewAuditLog')}">
          📜
        </button>
        <button class="action-btn edit-btn" data-action="edit-template" data-template-id="${group.id}" title="${t('tooltip.editTemplate')}">
          ✏️
        </button>
        <button class="action-btn add-btn" data-action="add-item" data-template-id="${group.id}" title="${t('tooltip.addItemToTemplate')}">
          ➕
        </button>
        <button class="action-btn clone-btn" data-action="clone" data-template-id="${group.id}" title="${t('button.clone')}">
          📋
        </button>
        <button class="action-btn delete-btn" data-action="delete-template" data-template-id="${group.id}" title="${t('tooltip.deleteTemplate')}">
          🗑️
        </button>
      `;
    }

    console.log(`[ACTIONS] Rendered actions HTML length: ${actions.length}`);
    return actions;
  }

  /**
   * Wire up action button event handlers
   */
  private wireUpActionButtons(header: HTMLElement, group: GroupSection, strategy: GroupingStrategy): void {
    console.log(`[WIRE] wireUpActionButtons for group ${group.id}, mode=${strategy.getMode()}`);

    // Inject button
    const injectBtn = header.querySelector('.inject-btn');
    console.log(`[WIRE] inject button found: ${!!injectBtn}`);
    injectBtn?.addEventListener('click', (e) => {
      console.log('[WIRE] inject button clicked');
      e.stopPropagation();
      this.callbacks.onInjectGroup(strategy.getGroupType(), group.id, group.itemIds);
    });

    // Remove button
    const removeBtn = header.querySelector('.remove-btn');
    console.log(`[WIRE] remove button found: ${!!removeBtn}`);
    removeBtn?.addEventListener('click', (e) => {
      console.log('[WIRE] remove button clicked');
      e.stopPropagation();
      this.callbacks.onRemoveGroup(strategy.getGroupType(), group.id);
    });

    // Template-specific actions
    if (strategy.getMode() === ViewMode.BY_TEMPLATE) {
      console.log('[WIRE] In template view mode, wiring template-specific actions');

      // Audit log button
      const auditBtn = header.querySelector('[data-action="audit"]');
      console.log(`[WIRE] audit button found: ${!!auditBtn}`);
      auditBtn?.addEventListener('click', (e) => {
        console.log('[WIRE] audit button clicked');
        e.stopPropagation();
        this.showTemplateAuditLog(group.id);
      });

      // Edit template button
      const editBtn = header.querySelector('[data-action="edit-template"]');
      console.log(`[WIRE] edit-template button found: ${!!editBtn}`);
      editBtn?.addEventListener('click', (e) => {
        console.log('[WIRE] edit-template button clicked');
        e.stopPropagation();
        this.editTemplate(group.id);
      });

      // Clone template button
      const cloneBtn = header.querySelector('[data-action="clone"]');
      console.log(`[WIRE] clone button found: ${!!cloneBtn}`);
      cloneBtn?.addEventListener('click', (e) => {
        console.log('[WIRE] clone button clicked');
        e.stopPropagation();
        this.cloneTemplate(group.id);
      });

      // Delete template button
      const deleteBtn = header.querySelector('[data-action="delete-template"]');
      console.log(`[WIRE] delete-template button found: ${!!deleteBtn}`, deleteBtn);
      deleteBtn?.addEventListener('click', (e) => {
        console.log('[WIRE] DELETE BUTTON CLICKED!');
        e.stopPropagation();
        this.deleteTemplate(group.id);
      });

      // Add item button
      const addBtn = header.querySelector('[data-action="add-item"]');
      console.log(`[WIRE] add-item button found: ${!!addBtn}`);
      addBtn?.addEventListener('click', (e) => {
        console.log('[WIRE] add-item button clicked');
        e.stopPropagation();
        this.addItemToTemplate(group.id);
      });
    }
  }

  /**
   * Render items within a group
   */
  private renderGroupItems(group: GroupSection): HTMLElement {
    const container = document.createElement('div');
    container.className = 'group-item-list';

    const groupItems = this.items.filter(item => group.itemIds.includes(item.id));

    groupItems.forEach(item => {
      const itemRow = this.renderItemRow(item);
      container.appendChild(itemRow);
    });

    return container;
  }

  /**
   * Render a single item row
   */
  private renderItemRow(item: KnowledgeItem): HTMLElement {
    const row = document.createElement('div');
    row.className = 'group-item-row';
    row.dataset.itemId = item.id;

    const isTemplateView = this.currentMode === ViewMode.BY_TEMPLATE;

    // Get injection status for this item
    const itemStatus = this.getItemInjectionStatus(item);

    row.innerHTML = `
      <div class="item-type">${this.getTypeIcon(item.type)}</div>
      <div class="item-title">
        ${this.escapeHtml(item.title)}
        ${itemStatus.badge}
      </div>
      <div class="item-scope">${this.escapeHtml(item.scope)}</div>
      <div class="item-template ${isTemplateView ? 'hide-in-template-view' : ''}">
        ${item.templateName ? this.escapeHtml(item.templateName) : '-'}
      </div>
      <div class="item-maturity">
        ${this.renderMaturityIndicators(item)}
      </div>
      <div class="item-actions hover-actions">
        ${this.renderItemActions(item, isTemplateView)}
      </div>
    `;

    // Wire up item action buttons
    this.wireUpItemActions(row, item);

    // Initialize tooltips for injection status badge
    this.initializeTooltipsForElement(row);

    return row;
  }

  /**
   * Get injection status for an individual item
   */
  private getItemInjectionStatus(item: KnowledgeItem): { status: InjectionStatus; badge: string } {
    if (!item.injectedTo || item.injectedTo.length === 0) {
      return {
        status: InjectionStatus.NOT_INJECTED,
        badge: ''  // Don't show badge for not injected items to reduce clutter
      };
    }

    const files = item.injectedTo.map(rec => rec.filePath);
    const tooltip = `Injected in:\n${files.join('\n')}`;
    const badge = `<span class="status-badge injected item-injected" data-tooltip="${this.escapeHtml(tooltip)}">✅</span>`;

    return {
      status: InjectionStatus.INJECTED,
      badge
    };
  }

  /**
   * Render maturity indicators for an item
   */
  private renderMaturityIndicators(item: KnowledgeItem): string {
    if (!item.maturity) {
      return '<span class="maturity-none">-</span>';
    }

    const complexity = item.maturity.complexity
      ? `C:${item.maturity.complexity.min}${item.maturity.complexity.max !== item.maturity.complexity.min ? `-${item.maturity.complexity.max}` : ''}`
      : '-';

    const operator = item.maturity.operator
      ? `O:${item.maturity.operator.min}${item.maturity.operator.max !== item.maturity.operator.min ? `-${item.maturity.operator.max}` : ''}`
      : '-';

    const project = item.maturity.project
      ? `P:${item.maturity.project.min}${item.maturity.project.max !== item.maturity.project.min ? `-${item.maturity.project.max}` : ''}`
      : '-';

    return `
      <div class="maturity-indicators">
        <span class="maturity-badge complexity" title="Complexity: ${complexity}">${complexity}</span>
        <span class="maturity-badge operator" title="Operator Maturity: ${operator}">${operator}</span>
        <span class="maturity-badge project" title="Project Maturity: ${project}">${project}</span>
      </div>
    `;
  }

  /**
   * Render item action buttons
   */
  private renderItemActions(item: KnowledgeItem, isTemplateView: boolean): string {
    let actions = '';

    // Info/Preview button (all views)
    actions += `
      <button class="item-action-btn info-btn" data-action="preview" data-item-id="${item.id}" title="${t('action.view')}">
        ℹ️
      </button>
    `;

    // Inject individual item (all views)
    actions += `
      <button class="item-action-btn inject-btn" data-action="inject-item" data-item-id="${item.id}" title="${t('tooltip.injectItemToFile')}">
        💉
      </button>
    `;

    // Edit button (all views)
    actions += `
      <button class="item-action-btn edit-btn" data-action="edit" data-item-id="${item.id}" title="${t('tooltip.editItem')}">
        ✏️
      </button>
    `;

    // Audit log button (all views - informational only)
    actions += `
      <button class="item-action-btn audit-btn" data-action="audit" data-item-id="${item.id}" title="${t('tooltip.viewAuditLog')}">
        📜
      </button>
    `;

    // Delete button (template view only)
    if (isTemplateView) {
      actions += `
        <button class="item-action-btn delete-btn" data-action="delete" data-item-id="${item.id}" title="${t('tooltip.deleteItem')}">
          🗑️
        </button>
      `;
    }

    return actions;
  }

  /**
   * Wire up item action buttons
   */
  private wireUpItemActions(row: HTMLElement, item: KnowledgeItem): void {
    // Preview button - supports both hover (quick look) and click (lock in place)
    const previewBtn = row.querySelector('[data-action="preview"]');
    let tooltipTimer: number | null = null;

    previewBtn?.addEventListener('mouseenter', (e) => {
      // Show tooltip after short delay (only if not already locked)
      tooltipTimer = window.setTimeout(() => {
        this.showItemPreviewTooltip(item, e.target as HTMLElement, false);
      }, 300);
    });

    previewBtn?.addEventListener('mouseleave', () => {
      // Cancel tooltip if still pending
      if (tooltipTimer) {
        clearTimeout(tooltipTimer);
        tooltipTimer = null;
      }
      // Hide tooltip only if not locked
      this.hideItemPreviewTooltip(false);
    });

    previewBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      // Cancel hover timer if pending
      if (tooltipTimer) {
        clearTimeout(tooltipTimer);
        tooltipTimer = null;
      }
      // Show locked tooltip with close button
      this.showItemPreviewTooltip(item, e.target as HTMLElement, true);
    });

    // Inject individual item button
    const injectBtn = row.querySelector('[data-action="inject-item"]');
    injectBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.injectIndividualItem(item);
    });

    // Edit button
    const editBtn = row.querySelector('[data-action="edit"]');
    editBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const template = this.templates.find(t => t.items?.some(i => i.id === item.id));
      if (template) {
        this.callbacks.onEditItem(template.id, item.id);
      }
    });

    // Audit log button
    const auditBtn = row.querySelector('[data-action="audit"]');
    auditBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showItemAuditLog(item);
    });

    // Delete button
    const deleteBtn = row.querySelector('[data-action="delete"]');
    deleteBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const template = this.templates.find(t => t.items?.some(i => i.id === item.id));
      if (template) {
        this.callbacks.onDeleteItem(template.id, item.id);
      }
    });
  }

  /**
   * Render empty state
   */
  private renderEmptyState(container: HTMLElement): void {
    container.innerHTML = `
      <div class="group-view-empty-state">
        <div style="font-size: 48px; margin-bottom: 16px;">📦</div>
        <div style="font-size: 16px; color: var(--vscode-descriptionForeground); margin-bottom: 8px;">
          No items to display
        </div>
        <div style="font-size: 14px; color: var(--vscode-descriptionForeground);">
          ${this.getEmptyStateMessage()}
        </div>
      </div>
    `;
  }

  /**
   * Get appropriate empty state message based on current mode
   */
  private getEmptyStateMessage(): string {
    switch (this.currentMode) {
      case ViewMode.BY_TEMPLATE:
        return 'No templates available';
      case ViewMode.BY_OPERATOR:
      case ViewMode.BY_PROJECT:
      case ViewMode.BY_COMPLEXITY:
        return 'Items need maturity metadata to appear in this view';
      case ViewMode.BY_CATCHMENT:
        return 'Set a maturity context to see relevant items';
      default:
        return 'No items available';
    }
  }

  /**
   * Toggle group expand/collapse
   */
  private toggleGroup(groupId: string): void {
    if (this.expandedGroups.has(groupId)) {
      this.expandedGroups.delete(groupId);
    } else {
      this.expandedGroups.add(groupId);
    }
    this.render();
  }

  /**
   * Expand all groups
   */
  expandAll(): void {
    const strategy = this.strategies.get(this.currentMode);
    if (strategy) {
      const groups = strategy.calculateGroups(this.items, this.maturityContext);
      groups.forEach(group => this.expandedGroups.add(group.id));
      this.render();
    }
  }

  /**
   * Collapse all groups
   */
  collapseAll(): void {
    this.expandedGroups.clear();
    this.render();
  }

  /**
   * Toggle all groups (expand if any collapsed, collapse if all expanded)
   */
  toggleAllSections(): void {
    const strategy = this.strategies.get(this.currentMode);
    if (!strategy) return;

    const groups = strategy.calculateGroups(this.items, this.maturityContext);
    const allExpanded = groups.every(group => this.expandedGroups.has(group.id));

    if (allExpanded) {
      this.collapseAll();
    } else {
      this.expandAll();
    }
  }

  /**
   * Get status badge HTML with custom tooltip showing injection locations
   */
  private getStatusBadge(status: InjectionStatus, files: string[]): string {
    // Build tooltip text
    let tooltip = '';
    if (status === InjectionStatus.INJECTED && files.length > 0) {
      tooltip = `Injected in:\n${files.join('\n')}`;
    } else if (status === InjectionStatus.NOT_INJECTED) {
      tooltip = 'Not injected in any CLAUDE.md file';
    } else {
      tooltip = status;
    }

    // Use data-tooltip for custom tooltip implementation
    const badges = {
      [InjectionStatus.NOT_INJECTED]: `<span class="status-badge not-injected" data-tooltip="${this.escapeHtml(tooltip)}">⚪ Not Injected</span>`,
      [InjectionStatus.INJECTED]: `<span class="status-badge injected" data-tooltip="${this.escapeHtml(tooltip)}">✅ Injected</span>`,
      [InjectionStatus.PARTIAL]: `<span class="status-badge partial" data-tooltip="${this.escapeHtml(tooltip)}">🔵 Partial</span>`,
      [InjectionStatus.PENDING]: `<span class="status-badge pending" data-tooltip="${this.escapeHtml(tooltip)}">🔄 Pending</span>`,
      [InjectionStatus.ERROR]: `<span class="status-badge error" data-tooltip="${this.escapeHtml(tooltip)}">❌ Error</span>`
    };
    return badges[status] || '';
  }

  /**
   * Get icon for knowledge type
   */
  private getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      'adr': '📋',
      'design-pattern': '🎨',
      'golden-path': '🌟',
      'best-practice': '✨',
      'standard': '📏',
      'learning': '💡',
      'snippet': '📝',
      'troubleshooting': '🔧',
      'anti-pattern': '⚠️',
      'convention': '📐',
      'checklist': '☑️',
      'configuration': '⚙️',
      'command': '💻',
      'api-reference': '📚',
      'gotcha': '🚨',
      'tip': '💭',
      'template': '📄',
      'guideline': '📖',
      'workflow': '🔄',
      'runbook': '📓'
    };
    return icons[type] || '📄';
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
   * Show rich item preview in centered modal
   */
  private showItemPreview(item: KnowledgeItem, anchor: HTMLElement): void {
    // Remove any existing preview
    document.querySelectorAll('.item-preview-modal').forEach(el => el.remove());

    // Create modal backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'item-preview-modal-backdrop';

    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'item-preview-modal';

    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'item-preview-close';
    closeBtn.innerHTML = '×';
    closeBtn.title = 'Close preview (ESC)';

    // Create content
    const content = document.createElement('div');
    content.className = 'item-preview-content';
    content.innerHTML = `
      <div class="preview-header">
        <div class="preview-title-row">
          <span class="preview-icon">${this.getTypeIcon(item.type)}</span>
          <span class="preview-title">${this.escapeHtml(item.title)}</span>
        </div>
        <span class="preview-type-badge">${item.type}</span>
      </div>
      <div class="preview-meta">
        <span class="preview-meta-item"><strong>Scope:</strong> ${this.escapeHtml(item.scope)}</span>
        ${item.tags && item.tags.length > 0 ? `
          <span class="preview-meta-item"><strong>Tags:</strong> ${item.tags.map(t => `<span class="tag">${this.escapeHtml(t)}</span>`).join(' ')}</span>
        ` : ''}
      </div>
      <div class="preview-divider"></div>
      <div class="preview-body">
        <h4>Content</h4>
        <div class="preview-body-text">${this.escapeHtml(item.body || 'No content')}</div>
      </div>
      ${item.maturity ? `
        <div class="preview-divider"></div>
        <div class="preview-maturity">
          <h4>Maturity Footprint</h4>
          <div class="maturity-grid">
            <div class="maturity-item">
              <span class="maturity-label">Operator:</span>
              <span class="maturity-range">${item.maturity.operator?.min || '?'} - ${item.maturity.operator?.max || '?'}</span>
            </div>
            <div class="maturity-item">
              <span class="maturity-label">Project:</span>
              <span class="maturity-range">${item.maturity.project?.min || '?'} - ${item.maturity.project?.max || '?'}</span>
            </div>
            <div class="maturity-item">
              <span class="maturity-label">Complexity:</span>
              <span class="maturity-range">${item.maturity.complexity?.min || '?'} - ${item.maturity.complexity?.max || '?'}</span>
            </div>
          </div>
        </div>
      ` : ''}
    `;

    // Assemble modal
    modal.appendChild(closeBtn);
    modal.appendChild(content);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    // Remove function
    const remove = () => {
      backdrop.remove();
      document.removeEventListener('keydown', escHandler);
    };

    // Close button handler
    closeBtn.addEventListener('click', remove);

    // Backdrop click handler (close if clicking outside modal)
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        remove();
      }
    });

    // ESC key handler
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') remove();
    };

    document.addEventListener('keydown', escHandler);
  }

  /**
   * Show item preview as hover tooltip
   * @param item The knowledge item to preview
   * @param anchor The anchor element to position near
   * @param locked If true, tooltip stays open with close button until explicitly closed
   */
  private showItemPreviewTooltip(item: KnowledgeItem, anchor: HTMLElement, locked: boolean = false): void {
    // Remove any existing non-locked tooltip
    this.hideItemPreviewTooltip(locked);

    // Don't show hover tooltip if a locked one exists
    if (!locked && document.querySelector('.item-preview-tooltip.locked')) {
      return;
    }

    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.className = locked ? 'item-preview-tooltip locked' : 'item-preview-tooltip';
    tooltip.dataset.tooltipFor = item.id;

    // Build content with optional close button
    tooltip.innerHTML = `
      ${locked ? '<button class="tooltip-close-btn" title="Close">✕</button>' : ''}
      <div class="preview-header">
        <div class="preview-title-row">
          <span class="preview-icon">${this.getTypeIcon(item.type)}</span>
          <span class="preview-title">${this.escapeHtml(item.title)}</span>
        </div>
        <span class="preview-type-badge">${item.type}</span>
      </div>
      <div class="preview-meta">
        <span><strong>Scope:</strong> ${this.escapeHtml(item.scope)}</span>
        ${item.tags && item.tags.length > 0 ? `
          <span><strong>Tags:</strong> ${item.tags.map(t => this.escapeHtml(t)).join(', ')}</span>
        ` : ''}
      </div>
      <div class="preview-divider"></div>
      <div class="preview-body">
        <h4>Content</h4>
        <div class="preview-body-text">${this.escapeHtml(item.body || 'No content')}</div>
      </div>
    `;

    // Add to document
    document.body.appendChild(tooltip);

    // Position near the anchor button
    const rect = anchor.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    // Default position: right of button
    let left = rect.right + 10;
    let top = rect.top;

    // If tooltip would go off right edge, show on left instead
    if (left + tooltipRect.width > window.innerWidth - 10) {
      left = rect.left - tooltipRect.width - 10;
    }

    // If tooltip would go off bottom edge, adjust up
    if (top + tooltipRect.height > window.innerHeight - 10) {
      top = window.innerHeight - tooltipRect.height - 10;
    }

    // If tooltip would go off top edge, adjust down
    if (top < 10) {
      top = 10;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;

    if (locked) {
      // Wire up close button
      const closeBtn = tooltip.querySelector('.tooltip-close-btn');
      closeBtn?.addEventListener('click', () => {
        this.hideItemPreviewTooltip(true);
      });

      // ESC key handler for locked tooltip
      const escHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          this.hideItemPreviewTooltip(true);
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);

      // Store handler for cleanup
      (tooltip as any)._escHandler = escHandler;
    } else {
      // Add hover listener to tooltip itself to keep it open when mouse moves to it
      tooltip.addEventListener('mouseenter', () => {
        // Keep tooltip open
      });

      tooltip.addEventListener('mouseleave', () => {
        this.hideItemPreviewTooltip(false);
      });
    }
  }

  /**
   * Hide item preview tooltip
   * @param force If true, removes even locked tooltips; if false, only removes unlocked
   */
  private hideItemPreviewTooltip(force: boolean = false): void {
    document.querySelectorAll('.item-preview-tooltip').forEach(el => {
      const isLocked = el.classList.contains('locked');
      if (force || !isLocked) {
        // Clean up ESC handler if present
        const escHandler = (el as any)._escHandler;
        if (escHandler) {
          document.removeEventListener('keydown', escHandler);
        }
        el.remove();
      }
    });
  }

  /**
   * Inject individual item to file
   */
  private injectIndividualItem(item: KnowledgeItem): void {
    // Get selected file from callback
    const selectedFile = this.callbacks.getSelectedFile?.();
    if (!selectedFile) {
      this.callbacks.onShowNotification?.('Please select a claude.md file first', 'warning', 3000);
      return;
    }

    const template = this.templates.find(t => t.items?.some(i => i.id === item.id));
    if (template) {
      // Send message to backend with filePath
      if (window.vscode) {
        window.vscode.postMessage({
          type: 'v1:inject-item',
          payload: {
            templateId: template.id,
            itemId: item.id,
            filePath: selectedFile
          }
        });
      }
      this.callbacks.onShowNotification?.(`Injecting item: ${item.title}`, 'info', 2000);
    } else {
      this.callbacks.onShowNotification?.('Could not find template for item', 'error', 3000);
    }
  }

  /**
   * Show item audit log
   */
  private showItemAuditLog(item: KnowledgeItem): void {
    // Find template that contains this item
    const template = this.templates.find(t => t.items?.some(i => i.id === item.id));
    if (!template) {
      this.callbacks.onShowNotification?.('Could not find template for item', 'error', 3000);
      return;
    }

    // Request item audit log from backend
    this.callbacks.onShowNotification?.('Loading item audit log...', 'info', 1000);

    if (window.vscode) {
      window.vscode.postMessage({
        type: 'v1:get-item-audit',
        payload: { templateId: template.id, itemId: item.id }
      });
    }
  }

  /**
   * Show template audit log
   */
  private showTemplateAuditLog(templateId: string): void {
    if (this.callbacks.onViewTemplateAuditLog) {
      this.callbacks.onViewTemplateAuditLog(templateId);
    }
  }

  /**
   * Edit template
   */
  private editTemplate(templateId: string): void {
    console.log(`[UnifiedKnowledgeTableController] editTemplate called with templateId: ${templateId}`);
    console.log(`[UnifiedKnowledgeTableController] onEditTemplate callback exists: ${!!this.callbacks.onEditTemplate}`);
    if (this.callbacks.onEditTemplate) {
      console.log(`[UnifiedKnowledgeTableController] Calling onEditTemplate callback`);
      this.callbacks.onEditTemplate(templateId);
    } else {
      console.log(`[UnifiedKnowledgeTableController] No onEditTemplate callback configured`);
    }
  }

  /**
   * Clone template
   */
  private cloneTemplate(templateId: string): void {
    if (this.callbacks.onCloneTemplate) {
      this.callbacks.onCloneTemplate(templateId);
    }
  }

  /**
   * Delete template
   */
  private async deleteTemplate(templateId: string): Promise<void> {
    if (this.callbacks.onDeleteTemplate) {
      this.callbacks.onDeleteTemplate(templateId);
    }
  }

  /**
   * Add item to template
   */
  private addItemToTemplate(templateId: string): void {
    if (this.callbacks.onAddItemToTemplate) {
      this.callbacks.onAddItemToTemplate(templateId);
    }
  }

  /**
   * Handle messages from backend
   */
  handleMessage(message: any): void {
    switch (message.type) {
      case 'v1:item-audit-data':
        this.displayItemAuditLogModal(message.payload.itemId, message.payload.auditLog);
        break;
      // Add other message handlers as needed
    }
  }

  /**
   * Display item audit log in a modal
   */
  private displayItemAuditLogModal(itemId: string, auditLog: any[]): void {
    // Import ModalDialog dynamically
    const { ModalDialog } = require('../ModalDialog');
    const modal = new ModalDialog();

    const content = `
      <div class="audit-log-view" style="max-height: 500px; overflow-y: auto;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px solid var(--vscode-panel-border);">
              <th style="text-align: left; padding: 8px; font-weight: 600;">${t('column.timestamp')}</th>
              <th style="text-align: left; padding: 8px; font-weight: 600;">${t('column.operation')}</th>
              <th style="text-align: left; padding: 8px; font-weight: 600;">${t('column.actor')}</th>
              <th style="text-align: left; padding: 8px; font-weight: 600;">${t('column.details')}</th>
            </tr>
          </thead>
          <tbody>
            ${auditLog.length === 0 ? `
              <tr>
                <td colspan="4" style="text-align: center; padding: 20px; color: var(--vscode-descriptionForeground);">
                  ${t('audit.noEntriesYet')}
                </td>
              </tr>
            ` : auditLog.map(entry => `
              <tr style="border-bottom: 1px solid var(--vscode-panel-border);">
                <td style="padding: 8px; font-size: 12px;">${new Date(entry.timestamp).toLocaleString()}</td>
                <td style="padding: 8px; font-size: 12px;">${this.escapeHtml(entry.operation || entry.action || '-')}</td>
                <td style="padding: 8px; font-size: 12px;">${this.escapeHtml(entry.actor || entry.user || 'system')}</td>
                <td style="padding: 8px; font-size: 12px;">${this.escapeHtml(entry.details || entry.description || '-')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    modal.show({
      title: `${t('tooltip.viewAuditLog')} - ${itemId}`,
      content,
      buttons: [{ label: t('action.close'), primary: false, onClick: () => {} }],
      width: '800px'
    });
  }
}
