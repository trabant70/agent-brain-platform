/**
 * BaseGroupViewController - Abstract base class for group view controllers
 *
 * Provides common functionality for all group-based views:
 * - Item management and filtering
 * - Group header rendering
 * - Injection/removal actions
 * - Maturity context awareness
 * - Expand/collapse state
 *
 * Subclasses must implement:
 * - calculateGroups(): Define how items are grouped
 * - getGroupType(): Return the GroupType for this view
 */

import { KnowledgeItem, MaturityContext } from '../../../knowledge/types';
import { GroupType, InjectionStatus } from '../../../knowledge/GroupTypes';
import { GroupSection, GroupCalculationResult } from './ViewMode';
import { t } from '../../webview/i18n';
import { webviewLogger, LogCategory, LogPathway } from '../../webview/WebviewLogger';

/**
 * Callbacks from group view controllers to parent
 */
export interface GroupViewCallbacks {
  /**
   * Request to inject a group into a claude.md file
   */
  onInjectGroup: (groupType: GroupType, groupId: string, itemIds: string[]) => void;

  /**
   * Request to remove a group from a claude.md file
   */
  onRemoveGroup: (groupType: GroupType, groupId: string) => void;

  /**
   * Show a notification to the user
   */
  onShowNotification: (message: string, type: 'info' | 'warning' | 'error', duration: number) => void;
}

/**
 * Abstract base class for all group view controllers
 */
export abstract class BaseGroupViewController {
  protected items: KnowledgeItem[] = [];
  protected maturityContext: MaturityContext | null = null;
  protected expandedGroups: Set<string> = new Set();
  protected groupInjectionStatus: Map<string, InjectionStatus> = new Map();
  protected containerElement: HTMLElement | null = null;

  constructor(
    protected containerId: string,
    protected callbacks: GroupViewCallbacks
  ) {
    webviewLogger.debug(
      LogCategory.UI,
      'BaseGroupViewController initialized',
      'BaseGroupViewController.constructor',
      { containerId, controllerType: this.constructor.name },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Abstract: Calculate groups from items
   * Subclasses define their grouping logic here
   */
  abstract calculateGroups(items: KnowledgeItem[]): GroupCalculationResult;

  /**
   * Abstract: Get the GroupType for this view
   */
  abstract getGroupType(): GroupType;

  /**
   * Set items and trigger re-render
   */
  setItems(items: KnowledgeItem[]): void {
    this.items = items;
    this.render();
  }

  /**
   * Set maturity context and trigger re-render
   */
  setMaturityContext(context: MaturityContext | null): void {
    this.maturityContext = context;
    this.render();
  }

  /**
   * Set injection status for groups
   */
  setInjectionStatus(statusMap: Map<string, InjectionStatus>): void {
    this.groupInjectionStatus = statusMap;
    this.render();
  }

  /**
   * Main render method - builds the entire view
   */
  render(): void {
    this.containerElement = document.getElementById(this.containerId);
    if (!this.containerElement) {
      webviewLogger.warn(
        LogCategory.UI,
        'Container element not found',
        'BaseGroupViewController.render',
        { containerId: this.containerId },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      return;
    }

    const result = this.calculateGroups(this.items);

    webviewLogger.debug(
      LogCategory.UI,
      'Rendering group view',
      'BaseGroupViewController.render',
      {
        controllerType: this.constructor.name,
        groupCount: result.groups.length,
        totalItems: result.totalItems,
        ungrouped: result.ungrouped.length
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    this.containerElement.innerHTML = '';

    if (result.groups.length === 0) {
      this.renderEmptyState();
      return;
    }

    result.groups.forEach(group => {
      const groupElement = this.renderGroup(group);
      this.containerElement!.appendChild(groupElement);
    });

    // Render ungrouped items if any
    if (result.ungrouped.length > 0) {
      const ungroupedElement = this.renderUngroupedItems(result.ungrouped);
      this.containerElement!.appendChild(ungroupedElement);
    }
  }

  /**
   * Render a single group section
   */
  protected renderGroup(group: GroupSection): HTMLElement {
    const section = document.createElement('div');
    section.className = 'group-section';
    section.dataset.groupId = group.id;

    const isExpanded = this.expandedGroups.has(group.id);
    const injectionStatus = this.groupInjectionStatus.get(group.id) || InjectionStatus.NOT_INJECTED;

    // Header
    const header = this.renderGroupHeader(group, isExpanded, injectionStatus);
    section.appendChild(header);

    // Items (only if expanded)
    if (isExpanded) {
      const itemsList = this.renderGroupItems(group);
      section.appendChild(itemsList);
    }

    return section;
  }

  /**
   * Render group header with expand/collapse and actions
   */
  protected renderGroupHeader(
    group: GroupSection,
    isExpanded: boolean,
    status: InjectionStatus
  ): HTMLElement {
    const header = document.createElement('div');
    header.className = 'group-section-header';

    const expandIcon = isExpanded ? '▼' : '▶';
    const statusBadge = this.getStatusBadge(status);

    header.innerHTML = `
      <div class="group-header-left">
        <button class="expand-btn" data-group-id="${group.id}" title="${isExpanded ? 'Collapse' : 'Expand'}">
          ${expandIcon}
        </button>
        <strong class="group-label">${this.escapeHtml(group.label)}</strong>
        <span class="item-count">${group.itemIds.length} items</span>
        ${statusBadge}
      </div>
      <div class="group-header-right">
        ${this.renderGroupActions(group, status)}
      </div>
    `;

    // Wire up expand/collapse
    const expandBtn = header.querySelector('.expand-btn');
    expandBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleGroup(group.id);
    });

    return header;
  }

  /**
   * Render action buttons for a group
   */
  protected renderGroupActions(group: GroupSection, status: InjectionStatus): string {
    const groupType = this.getGroupType();
    const canInject = status !== InjectionStatus.INJECTED;
    const canRemove = status === InjectionStatus.INJECTED;

    let actions = '';

    if (canInject) {
      actions += `
        <button class="action-btn" data-action="inject" data-group-id="${group.id}" title="Inject group to claude.md">
          💉 Inject
        </button>
      `;
    }

    if (canRemove) {
      actions += `
        <button class="action-btn" data-action="remove" data-group-id="${group.id}" title="Remove group from claude.md">
          🗑️ Remove
        </button>
      `;
    }

    return actions;
  }

  /**
   * Render items within a group
   */
  protected renderGroupItems(group: GroupSection): HTMLElement {
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
  protected renderItemRow(item: KnowledgeItem): HTMLElement {
    const row = document.createElement('div');
    row.className = 'group-item-row';
    row.dataset.itemId = item.id;

    row.innerHTML = `
      <div class="item-type">${this.getTypeIcon(item.type)}</div>
      <div class="item-title">${this.escapeHtml(item.title)}</div>
      <div class="item-scope">${this.escapeHtml(item.scope)}</div>
      <div class="item-tags">
        ${item.tags?.map(t => `<span class="tag">${this.escapeHtml(t)}</span>`).join(' ') || '-'}
      </div>
    `;

    return row;
  }

  /**
   * Render empty state when no groups exist
   */
  protected renderEmptyState(): void {
    if (!this.containerElement) return;

    this.containerElement.innerHTML = `
      <div class="group-view-empty-state">
        <div style="font-size: 48px; margin-bottom: 16px;">📦</div>
        <div style="font-size: 16px; color: var(--vscode-descriptionForeground); margin-bottom: 8px;">
          No items to display
        </div>
        <div style="font-size: 14px; color: var(--vscode-descriptionForeground);">
          Items will appear here once they have maturity metadata
        </div>
      </div>
    `;
  }

  /**
   * Render ungrouped items section
   */
  protected renderUngroupedItems(itemIds: string[]): HTMLElement {
    const section = document.createElement('div');
    section.className = 'group-section ungrouped';

    const header = document.createElement('div');
    header.className = 'group-section-header';
    header.innerHTML = `
      <div class="group-header-left">
        <strong class="group-label">⚪ Ungrouped Items</strong>
        <span class="item-count">${itemIds.length} items</span>
      </div>
    `;
    section.appendChild(header);

    const itemsList = document.createElement('div');
    itemsList.className = 'group-item-list';
    const ungroupedItems = this.items.filter(item => itemIds.includes(item.id));
    ungroupedItems.forEach(item => {
      const itemRow = this.renderItemRow(item);
      itemsList.appendChild(itemRow);
    });
    section.appendChild(itemsList);

    return section;
  }

  /**
   * Toggle group expand/collapse
   */
  protected toggleGroup(groupId: string): void {
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
    const result = this.calculateGroups(this.items);
    result.groups.forEach(group => this.expandedGroups.add(group.id));
    this.render();
  }

  /**
   * Collapse all groups
   */
  collapseAll(): void {
    this.expandedGroups.clear();
    this.render();
  }

  /**
   * Get status badge HTML
   */
  protected getStatusBadge(status: InjectionStatus): string {
    const badges = {
      [InjectionStatus.NOT_INJECTED]: '<span class="status-badge not-injected">⚪ Not Injected</span>',
      [InjectionStatus.INJECTED]: '<span class="status-badge injected">✅ Injected</span>',
      [InjectionStatus.PARTIAL]: '<span class="status-badge partial">🔵 Partial</span>',
      [InjectionStatus.PENDING]: '<span class="status-badge pending">🔄 Pending</span>',
      [InjectionStatus.ERROR]: '<span class="status-badge error">❌ Error</span>'
    };
    return badges[status] || '';
  }

  /**
   * Get icon for knowledge type
   */
  protected getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      'adr': '📋',
      'design-pattern': '🎨',
      'golden-path': '🌟',
      'best-practice': '✨',
      'standard': '📏',
      'learning': '💡',
      'snippet': '📝',
      'troubleshooting': '🔧'
    };
    return icons[type] || '📄';
  }

  /**
   * Escape HTML to prevent XSS
   */
  protected escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
