/**
 * KnowledgeTableController - Manages knowledge items table rendering and interactions
 *
 * Handles table display, filtering, sorting, grouping, and item selection.
 * Extracted from KnowledgeViewController for better separation of concerns.
 */

import { KnowledgeItem, KnowledgeType, KnowledgeScope } from '../../../knowledge/types';
import { TableTemplates } from './templates/table-templates';
import { KnowledgeFilters } from './utils/KnowledgeFilters';
import { webviewLogger, LogCategory, LogPathway } from '../../webview/WebviewLogger';

// TODO: Phase 3 - Replace with MarketplaceTemplate from marketplace domain
type Template = any;

export interface TableState {
  items: KnowledgeItem[];
  templates: Template[];  // Templates for grouping
  selectedItems: Set<string>;
  searchQuery: string;
  filterType: KnowledgeType | null;
  filterScope: KnowledgeScope | null;
  filterTags: string[];
  sortBy: 'title' | 'type' | 'scope' | 'updated';
  sortDirection: 'asc' | 'desc';
  groupBy: 'type' | 'scope' | 'tag' | 'template';
  collapsedSections: Set<string>;
}

export interface TableControllerCallbacks {
  onEditItem: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
}

export class KnowledgeTableController {
  private state: TableState;
  private callbacks: TableControllerCallbacks;
  private isInitialLoad: boolean = true;

  constructor(callbacks: TableControllerCallbacks) {
    this.callbacks = callbacks;
    this.state = {
      items: [],
      templates: [],
      selectedItems: new Set(),
      searchQuery: '',
      filterType: null,
      filterScope: null,
      filterTags: [],
      sortBy: 'updated',
      sortDirection: 'desc',
      groupBy: 'type',
      collapsedSections: new Set()
    };
  }

  /**
   * Load knowledge items data
   */
  loadData(items: KnowledgeItem[], templates: Template[] = []): void {
    this.state.items = items;
    this.state.templates = templates;
    this.renderKnowledgeTable();
  }

  /**
   * Update filter state
   */
  updateFilters(filters: Partial<Pick<TableState, 'searchQuery' | 'filterType' | 'filterScope' | 'filterTags'>>): void {
    if (filters.searchQuery !== undefined) this.state.searchQuery = filters.searchQuery;
    if (filters.filterType !== undefined) this.state.filterType = filters.filterType;
    if (filters.filterScope !== undefined) this.state.filterScope = filters.filterScope;
    if (filters.filterTags !== undefined) this.state.filterTags = filters.filterTags;
    this.renderKnowledgeTable();
  }

  /**
   * Get current selection
   */
  getSelectedItems(): string[] {
    return Array.from(this.state.selectedItems);
  }

  /**
   * Clear selection
   */
  clearSelection(): void {
    this.state.selectedItems.clear();
    this.renderKnowledgeTable();
  }

  /**
   * Render the knowledge items table
   */
  renderKnowledgeTable(): void {
    const tbody = document.querySelector('#knowledge-table tbody') as HTMLTableSectionElement;
    if (!tbody) {
      webviewLogger.warn(
        LogCategory.UI,
        'Knowledge table tbody not found, skipping render',
        'KnowledgeTableController.renderKnowledgeTable',
        undefined,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      return;
    }

    // Get filtered and sorted items
    const items = this.getFilteredItems();

    webviewLogger.info(
      LogCategory.UI,
      'Filtered items for rendering',
      'KnowledgeTableController.renderKnowledgeTable',
      {
        totalItems: this.state.items.length,
        filteredItems: items.length,
        items: items.map(i => ({ id: i.id, type: i.type, title: i.title }))
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Clear existing rows
    tbody.innerHTML = '';

    if (items.length === 0) {
      webviewLogger.info(
        LogCategory.UI,
        'No items to render, showing empty state',
        'KnowledgeTableController.renderKnowledgeTable',
        {
          hasSearchQuery: !!this.state.searchQuery,
          totalItemsInState: this.state.items.length
        },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      tbody.innerHTML = TableTemplates.emptyState(!!this.state.searchQuery);
      return;
    }

    // Group by selected dimension
    const groups = this.groupItems(items, this.state.groupBy);

    // On initial load, collapse all sections
    if (this.isInitialLoad && groups.size > 0) {
      this.state.collapsedSections.clear();
      for (const groupKey of groups.keys()) {
        this.state.collapsedSections.add(groupKey);
      }
      this.updateToggleAllButton(true);
      this.isInitialLoad = false;
    }

    webviewLogger.debug(
      LogCategory.UI,
      'Rendering item groups',
      'KnowledgeTableController.renderKnowledgeTable',
      {
        groupCount: groups.size,
        groups: Array.from(groups.entries()).map(([type, items]) => ({
          type,
          count: items.length
        }))
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    for (const [groupKey, groupItems] of groups) {
      const isCollapsed = this.state.collapsedSections.has(groupKey);

      // Get display info for this group
      const { icon, label } = this.getGroupDisplayInfo(groupKey, this.state.groupBy);

      // Group header with collapse/expand icon
      const headerRow = document.createElement('tr');
      headerRow.className = 'knowledge-type-header';
      headerRow.dataset.type = groupKey;
      headerRow.style.cursor = 'pointer';
      headerRow.innerHTML = TableTemplates.groupHeader(groupKey, icon, label, groupItems.length, isCollapsed);
      tbody.appendChild(headerRow);

      // Items (hidden if collapsed)
      for (const item of groupItems) {
        const row = this.createItemRow(item);
        row.dataset.typeGroup = groupKey;
        if (isCollapsed) {
          row.style.display = 'none';
        }
        tbody.appendChild(row);
      }
    }

    // Update sort indicators after rendering
    this.updateSortIndicators();

    webviewLogger.info(
      LogCategory.UI,
      'Knowledge table rendered successfully',
      'KnowledgeTableController.renderKnowledgeTable',
      {
        itemsRendered: items.length,
        groupsRendered: groups.size
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Create a table row for a knowledge item
   */
  private createItemRow(item: KnowledgeItem): HTMLTableRowElement {
    const row = document.createElement('tr');
    row.className = 'knowledge-item-row';
    row.dataset.itemId = item.id;

    const isSelected = this.state.selectedItems.has(item.id);
    row.innerHTML = TableTemplates.itemRow(item, isSelected);

    // Add event listeners to buttons (safer than inline onclick)
    const editBtn = row.querySelector('.edit-btn') as HTMLButtonElement;
    const deleteBtn = row.querySelector('.delete-btn') as HTMLButtonElement;

    webviewLogger.debug(
      LogCategory.UI,
      'Looking for buttons in row',
      'KnowledgeTableController.createItemRow',
      {
        itemId: item.id,
        editBtnFound: !!editBtn,
        deleteBtnFound: !!deleteBtn,
        rowHTML: row.innerHTML.substring(0, 200)
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        webviewLogger.debug(
          LogCategory.UI,
          'Edit button clicked via event listener',
          'KnowledgeTableController.createItemRow',
          { itemId: item.id },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        this.callbacks.onEditItem(item.id);
      });

      webviewLogger.debug(
        LogCategory.UI,
        'Edit button listener attached successfully',
        'KnowledgeTableController.createItemRow',
        { itemId: item.id },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    } else {
      webviewLogger.error(
        LogCategory.UI,
        'Edit button NOT FOUND in row!',
        'KnowledgeTableController.createItemRow',
        { itemId: item.id, rowHTML: row.innerHTML },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        webviewLogger.debug(
          LogCategory.UI,
          'Delete button clicked via event listener',
          'KnowledgeTableController.createItemRow',
          { itemId: item.id },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        this.callbacks.onDeleteItem(item.id);
      });

      webviewLogger.debug(
        LogCategory.UI,
        'Delete button listener attached successfully',
        'KnowledgeTableController.createItemRow',
        { itemId: item.id },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    } else {
      webviewLogger.error(
        LogCategory.UI,
        'Delete button NOT FOUND in row!',
        'KnowledgeTableController.createItemRow',
        { itemId: item.id, rowHTML: row.innerHTML },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    }

    return row;
  }

  /**
   * Get filtered and sorted items
   */
  private getFilteredItems(): KnowledgeItem[] {
    return KnowledgeFilters.filter(this.state.items, {
      searchQuery: this.state.searchQuery,
      filterType: this.state.filterType,
      filterScope: this.state.filterScope,
      filterTags: this.state.filterTags,
      sortBy: this.state.sortBy,
      sortDirection: this.state.sortDirection
    });
  }

  /**
   * Get display info for a group
   */
  private getGroupDisplayInfo(groupKey: string, dimension: 'type' | 'scope' | 'tag' | 'template'): { icon: string; label: string } {
    // Import these from types
    const { getKnowledgeTypeIcon, getKnowledgeTypeLabel, getKnowledgeScopeLabel } = require('../../../knowledge/types');

    if (dimension === 'type') {
      return {
        icon: getKnowledgeTypeIcon(groupKey as KnowledgeType),
        label: getKnowledgeTypeLabel(groupKey as KnowledgeType)
      };
    } else if (dimension === 'scope') {
      const scopeIcons: Record<string, string> = {
        'personal': '👤',
        'team': '👥',
        'project': '📁',
        'organization': '🏢',
        'public': '🌐'
      };
      return {
        icon: scopeIcons[groupKey] || '📦',
        label: getKnowledgeScopeLabel(groupKey as KnowledgeScope)
      };
    } else if (dimension === 'template') {
      // Template grouping
      if (groupKey === '__ungrouped__') {
        return {
          icon: '📁',
          label: 'Ungrouped'
        };
      } else {
        // Find the template by ID
        const template = this.state.templates.find(t => t.id === groupKey);
        return {
          icon: '📦',
          label: template?.name || groupKey
        };
      }
    } else {
      // Tag
      return {
        icon: '🏷️',
        label: groupKey
      };
    }
  }

  /**
   * Group items by dimension (type, scope, tag, or template)
   */
  private groupItems(items: KnowledgeItem[], dimension: 'type' | 'scope' | 'tag' | 'template'): Map<string, KnowledgeItem[]> {
    const groups = new Map<string, KnowledgeItem[]>();

    if (dimension === 'template') {
      // For templates, an item can belong to multiple groups
      // Create a map of itemId -> item for quick lookup
      const itemMap = new Map<string, KnowledgeItem>();
      for (const item of items) {
        itemMap.set(item.id, item);
      }

      // Track which items are in at least one template
      const itemsInTemplates = new Set<string>();

      // Group by template
      for (const template of this.state.templates) {
        const templateItems: KnowledgeItem[] = [];
        for (const itemId of template.itemIds) {
          const item = itemMap.get(itemId);
          if (item) {
            templateItems.push(item);
            itemsInTemplates.add(itemId);
          }
        }
        if (templateItems.length > 0) {
          groups.set(template.id, templateItems);
        }
      }

      // Add ungrouped items (items not in any template)
      const ungroupedItems = items.filter(item => !itemsInTemplates.has(item.id));
      if (ungroupedItems.length > 0) {
        groups.set('__ungrouped__', ungroupedItems);
      }

      return groups;
    }

    for (const item of items) {
      let keys: string[];

      if (dimension === 'tag') {
        // For tags, an item can belong to multiple groups
        keys = item.tags.length > 0 ? item.tags : ['(no tags)'];
      } else {
        // For type and scope, an item belongs to one group
        keys = [item[dimension]];
      }

      for (const key of keys) {
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(item);
      }
    }

    return groups;
  }

  /**
   * Toggle item selection
   */
  toggleItemSelection(itemId: string): void {
    webviewLogger.debug(
      LogCategory.UI,
      'Toggle item selection',
      'KnowledgeTableController.toggleItemSelection',
      { itemId, currentlySelected: this.state.selectedItems.has(itemId) },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    if (this.state.selectedItems.has(itemId)) {
      this.state.selectedItems.delete(itemId);
    } else {
      this.state.selectedItems.add(itemId);
    }

    // Update the checkbox state
    const checkbox = document.querySelector(
      `input.item-checkbox[data-item-id="${itemId}"]`
    ) as HTMLInputElement;
    if (checkbox) {
      checkbox.checked = this.state.selectedItems.has(itemId);
    }

    webviewLogger.info(
      LogCategory.UI,
      'Item selection toggled',
      'KnowledgeTableController.toggleItemSelection',
      {
        itemId,
        nowSelected: this.state.selectedItems.has(itemId),
        totalSelected: this.state.selectedItems.size
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Handle column sort
   */
  handleSort(column: 'title' | 'type' | 'scope'): void {
    webviewLogger.debug(
      LogCategory.UI,
      'Handle sort',
      'KnowledgeTableController.handleSort',
      { column, currentSortBy: this.state.sortBy, currentDirection: this.state.sortDirection },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    if (this.state.sortBy === column) {
      // Toggle direction
      this.state.sortDirection = this.state.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // New column, default to ascending
      this.state.sortBy = column;
      this.state.sortDirection = 'asc';
    }

    this.renderKnowledgeTable();

    webviewLogger.info(
      LogCategory.UI,
      'Sort applied',
      'KnowledgeTableController.handleSort',
      { column: this.state.sortBy, direction: this.state.sortDirection },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Update sort indicators in table headers
   */
  private updateSortIndicators(): void {
    const headers = document.querySelectorAll('.knowledge-table th.sortable');
    headers.forEach(header => {
      const column = (header as HTMLElement).dataset.column;
      const indicator = header.querySelector('.sort-indicator');

      if (indicator) {
        if (column === this.state.sortBy) {
          indicator.textContent = this.state.sortDirection === 'asc' ? ' ▲' : ' ▼';
        } else {
          indicator.textContent = '';
        }
      }
    });
  }

  /**
   * Toggle section collapse/expand
   */
  toggleSectionCollapse(type: string): void {
    if (this.state.collapsedSections.has(type)) {
      this.state.collapsedSections.delete(type);
    } else {
      this.state.collapsedSections.add(type);
    }
    this.renderKnowledgeTable();
  }

  /**
   * Toggle all sections
   */
  toggleAllSections(): void {
    const allCollapsed = this.state.collapsedSections.size > 0;

    if (allCollapsed) {
      this.state.collapsedSections.clear();
    } else {
      const items = this.getFilteredItems();
      const groups = this.groupItems(items, this.state.groupBy);
      for (const groupKey of groups.keys()) {
        this.state.collapsedSections.add(groupKey);
      }
    }

    this.updateToggleAllButton(!allCollapsed);
    this.renderKnowledgeTable();
  }

  /**
   * Update toggle all button text
   */
  private updateToggleAllButton(collapsed: boolean): void {
    const btn = document.getElementById('toggle-all-sections') as HTMLButtonElement;
    if (btn) {
      btn.textContent = collapsed ? '▶' : '▼';
      btn.title = collapsed ? 'Expand all sections' : 'Collapse all sections';
    }
  }

  /**
   * Select all items
   */
  selectAll(): void {
    const items = this.getFilteredItems();
    this.state.selectedItems.clear();
    items.forEach(item => this.state.selectedItems.add(item.id));
    this.renderKnowledgeTable();

    webviewLogger.info(
      LogCategory.UI,
      'All items selected',
      'KnowledgeTableController.selectAll',
      { count: this.state.selectedItems.size },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Deselect all items
   */
  deselectAll(): void {
    this.state.selectedItems.clear();
    this.renderKnowledgeTable();

    webviewLogger.info(
      LogCategory.UI,
      'All items deselected',
      'KnowledgeTableController.deselectAll',
      undefined,
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Change grouping dimension
   */
  changeGrouping(groupBy: 'type' | 'scope' | 'tag' | 'template'): void {
    if (this.state.groupBy === groupBy) {
      return; // Already selected
    }

    this.state.groupBy = groupBy;

    // Collapse all sections when changing grouping
    const items = this.getFilteredItems();
    const groups = this.groupItems(items, groupBy);
    this.state.collapsedSections.clear();
    for (const groupKey of groups.keys()) {
      this.state.collapsedSections.add(groupKey);
    }
    this.updateToggleAllButton(true);

    // Update active button visual
    document.querySelectorAll('.group-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`[data-group="${groupBy}"]`);
    activeBtn?.classList.add('active');

    this.renderKnowledgeTable();

    webviewLogger.info(
      LogCategory.UI,
      'Grouping changed',
      'KnowledgeTableController.changeGrouping',
      { groupBy },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }
}
