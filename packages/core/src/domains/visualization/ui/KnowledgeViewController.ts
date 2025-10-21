/**
 * KnowledgeViewController - UI Controller for Knowledge Management Tab
 *
 * Handles rendering and interaction for the knowledge management interface.
 * Manages knowledge items table, claude.md accordion, and template controls.
 */

import {
  KnowledgeItem,
  Template,
  ClaudeMdFile,
  KnowledgeType,
  KnowledgeScope,
  getKnowledgeTypeLabel,
  getKnowledgeTypeIcon,
  getKnowledgeScopeLabel
} from '../../knowledge/types';
import { ModalDialog } from './ModalDialog';
import { NotificationManager } from './NotificationManager';
import { webviewLogger, LogCategory, LogPathway } from '../webview/WebviewLogger';

export interface KnowledgeViewState {
  items: KnowledgeItem[];
  templates: Template[];
  claudeMdFiles: ClaudeMdFile[];
  selectedItems: Set<string>;
  searchQuery: string;
  filterType: KnowledgeType | null;
  filterScope: KnowledgeScope | null;
  filterTags: string[];
  groupBy: 'type' | 'scope' | 'tag'; // Primary grouping dimension
  sortBy: 'title' | 'type' | 'scope' | 'updated';
  sortDirection: 'asc' | 'desc';
  collapsedSections: Set<string>; // Track collapsed sections (group-agnostic)
}

export class KnowledgeViewController {
  private state: KnowledgeViewState;
  private messageHandler: ((message: any) => void) | null = null;
  private notifications: NotificationManager;

  constructor() {
    this.state = {
      items: [],
      templates: [],
      claudeMdFiles: [],
      selectedItems: new Set(),
      searchQuery: '',
      filterType: null,
      filterScope: null,
      filterTags: [],
      groupBy: 'type', // Default grouping by type
      sortBy: 'updated',
      sortDirection: 'desc',
      collapsedSections: new Set()
    };
    this.notifications = new NotificationManager();
  }

  /**
   * Initialize the knowledge view controller
   */
  initialize(onMessage: (message: any) => void): void {
    this.messageHandler = onMessage;
    this.setupEventListeners();
    this.render();

    webviewLogger.info(
      LogCategory.UI,
      'KnowledgeViewController initialized and exposed on window',
      'KnowledgeViewController.initialize',
      { controllerExists: !!(window as any).knowledgeController },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Load knowledge data from extension
   */
  loadData(data: { items: KnowledgeItem[]; templates: Template[] }): void {
    webviewLogger.info(
      LogCategory.UI,
      'Loading knowledge data into controller',
      'KnowledgeViewController.loadData',
      {
        itemsCount: data.items?.length || 0,
        templatesCount: data.templates?.length || 0,
        items: data.items?.map(i => ({ id: i.id, type: i.type, title: i.title })) || []
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    this.state.items = data.items;
    this.state.templates = data.templates;

    webviewLogger.debug(
      LogCategory.UI,
      'State updated, rendering table',
      'KnowledgeViewController.loadData',
      {
        stateItemsCount: this.state.items.length,
        stateTemplatesCount: this.state.templates.length
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    this.renderKnowledgeTable();
    this.renderTemplateControls();
    this.updateStatusBar();

    webviewLogger.info(
      LogCategory.UI,
      'Knowledge data loaded and rendered',
      'KnowledgeViewController.loadData',
      {
        itemsLoaded: this.state.items.length,
        templatesLoaded: this.state.templates.length
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Load claude.md files
   */
  loadClaudeMdFiles(files: ClaudeMdFile[]): void {
    webviewLogger.info(
      LogCategory.UI,
      'Loading claude.md files into controller',
      'KnowledgeViewController.loadClaudeMdFiles',
      {
        filesCount: files?.length || 0,
        files: files?.map(f => ({ path: f.path, contentLength: f.content?.length || 0 })) || []
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    this.state.claudeMdFiles = files;
    this.renderClaudeMdAccordion();

    webviewLogger.info(
      LogCategory.UI,
      'Claude.md files loaded and rendered',
      'KnowledgeViewController.loadClaudeMdFiles',
      {
        filesLoaded: this.state.claudeMdFiles.length
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Render the complete knowledge view
   */
  render(): void {
    this.renderKnowledgeTable();
    this.renderClaudeMdAccordion();
    this.renderTemplateControls();
    this.updateStatusBar();
  }

  /**
   * Render the knowledge items table
   */
  renderKnowledgeTable(): void {
    webviewLogger.debug(
      LogCategory.UI,
      'Rendering knowledge table',
      'KnowledgeViewController.renderKnowledgeTable',
      {
        stateItemsCount: this.state.items.length,
        searchQuery: this.state.searchQuery,
        filterType: this.state.filterType,
        filterScope: this.state.filterScope
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    const tbody = document.getElementById('knowledge-items');
    if (!tbody) {
      webviewLogger.error(
        LogCategory.UI,
        'Cannot render knowledge table - tbody element not found',
        'KnowledgeViewController.renderKnowledgeTable',
        { elementId: 'knowledge-items' },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      return;
    }

    // Get filtered and sorted items
    const items = this.getFilteredItems();

    webviewLogger.info(
      LogCategory.UI,
      'Filtered items for rendering',
      'KnowledgeViewController.renderKnowledgeTable',
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
        'KnowledgeViewController.renderKnowledgeTable',
        {
          hasSearchQuery: !!this.state.searchQuery,
          totalItemsInState: this.state.items.length
        },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      tbody.innerHTML = `
        <tr class="knowledge-empty-state">
          <td colspan="7" style="text-align: center; padding: 40px;">
            <div style="font-size: 48px; margin-bottom: 16px;">📚</div>
            <div style="font-size: 14px; color: var(--vscode-descriptionForeground);">
              ${this.state.searchQuery ? 'No knowledge items match your search' : 'No knowledge items yet. Click "+ Add Item" to create your first item.'}
            </div>
          </td>
        </tr>
      `;
      return;
    }

    // Group by selected dimension
    const groups = this.groupItems(items, this.state.groupBy);

    webviewLogger.debug(
      LogCategory.UI,
      'Rendering item groups',
      'KnowledgeViewController.renderKnowledgeTable',
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
      headerRow.innerHTML = `
        <td colspan="7">
          <span class="collapse-icon">${isCollapsed ? '▶' : '▼'}</span>
          ${icon} ${label} (${groupItems.length})
        </td>
      `;
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

    webviewLogger.info(
      LogCategory.UI,
      'Knowledge table rendered successfully',
      'KnowledgeViewController.renderKnowledgeTable',
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
    const validClass = item.valid ? '' : 'invalid';

    row.innerHTML = `
      <td class="col-select">
        <input type="checkbox"
               class="item-checkbox"
               data-item-id="${item.id}"
               ${isSelected ? 'checked' : ''}>
      </td>
      <td class="col-type ${validClass}">
        <span class="type-badge" data-type="${item.type}">
          ${getKnowledgeTypeIcon(item.type)} ${getKnowledgeTypeLabel(item.type)}
        </span>
      </td>
      <td class="col-title ${validClass}">
        <div class="item-title">${this.escapeHtml(item.title)}</div>
        ${!item.valid ? `<div class="item-error">${this.escapeHtml(item.parseError || 'Parse error')}</div>` : ''}
      </td>
      <td class="col-scope">
        <span class="scope-badge" data-scope="${item.scope}">
          ${getKnowledgeScopeLabel(item.scope)}
        </span>
      </td>
      <td class="col-tags">
        ${item.tags.map(tag => `<span class="tag-badge">${this.escapeHtml(tag)}</span>`).join(' ')}
      </td>
      <td class="col-source">
        ${item.source ? this.escapeHtml(item.source) : '-'}
      </td>
      <td class="col-actions">
        <button class="icon-button edit-btn" data-item-id="${item.id}" title="Edit">
          ✏️
        </button>
        <button class="icon-button delete-btn" data-item-id="${item.id}" title="Delete">
          🗑️
        </button>
      </td>
    `;

    // Add event listeners to buttons (safer than inline onclick)
    const editBtn = row.querySelector('.edit-btn') as HTMLButtonElement;
    const deleteBtn = row.querySelector('.delete-btn') as HTMLButtonElement;

    webviewLogger.debug(
      LogCategory.UI,
      'Looking for buttons in row',
      'KnowledgeViewController.createItemRow',
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
          'KnowledgeViewController.createItemRow',
          { itemId: item.id },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        this.editItem(item.id);
      });

      webviewLogger.debug(
        LogCategory.UI,
        'Edit button listener attached successfully',
        'KnowledgeViewController.createItemRow',
        { itemId: item.id },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    } else {
      webviewLogger.error(
        LogCategory.UI,
        'Edit button NOT FOUND in row!',
        'KnowledgeViewController.createItemRow',
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
          'KnowledgeViewController.createItemRow',
          { itemId: item.id },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        this.deleteItem(item.id);
      });

      webviewLogger.debug(
        LogCategory.UI,
        'Delete button listener attached successfully',
        'KnowledgeViewController.createItemRow',
        { itemId: item.id },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    } else {
      webviewLogger.error(
        LogCategory.UI,
        'Delete button NOT FOUND in row!',
        'KnowledgeViewController.createItemRow',
        { itemId: item.id, rowHTML: row.innerHTML },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    }

    return row;
  }

  /**
   * Render claude.md files accordion
   */
  renderClaudeMdAccordion(): void {
    const container = document.getElementById('claude-files-accordion');
    if (!container) return;

    container.innerHTML = '';

    if (this.state.claudeMdFiles.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 20px; text-align: center;">
          <div style="font-size: 24px; margin-bottom: 8px;">📄</div>
          <div style="color: var(--vscode-descriptionForeground);">No claude.md files found</div>
        </div>
      `;
      return;
    }

    for (const file of this.state.claudeMdFiles) {
      const accordionItem = document.createElement('div');
      accordionItem.className = 'accordion-item';

      const header = document.createElement('div');
      header.className = 'accordion-header';
      header.innerHTML = `
        <span class="accordion-icon">📄</span>
        <span class="accordion-title">${this.escapeHtml(file.relativePath)}</span>
        ${file.hasConflicts ? '<span class="conflict-badge">⚠️ Conflicts</span>' : ''}
        ${file.templates.length > 0 ? `<span class="template-count">${file.templates.length} template${file.templates.length !== 1 ? 's' : ''}</span>` : ''}
      `;

      const content = document.createElement('div');
      content.className = 'accordion-content';

      // Build content HTML
      let contentHTML = '';

      // Show markdown content
      if (file.content && file.content.trim().length > 0) {
        const renderedMarkdown = this.renderMarkdown(file.content);
        contentHTML += `
          <div class="claude-md-content">
            ${renderedMarkdown}
          </div>
        `;
      } else {
        contentHTML += `
          <div style="padding: 12px; color: var(--vscode-descriptionForeground); font-style: italic;">
            File is empty
          </div>
        `;
      }

      // Show templates section if any
      if (file.templates.length > 0) {
        // Check for duplicate template IDs
        const templateIds = file.templates.map(t => t.templateId);
        const duplicateIds = templateIds.filter((id, index) => templateIds.indexOf(id) !== index);
        const hasDuplicates = duplicateIds.length > 0;

        contentHTML += `<div class="templates-section">`;
        contentHTML += `<div class="templates-header">
          Applied Templates (${file.templates.length})
          ${hasDuplicates ? '<span class="template-warning" title="Duplicate templates detected">⚠️ Duplicates</span>' : ''}
        </div>`;
        contentHTML += file.templates.map((template, idx) => {
          const isDuplicate = duplicateIds.includes(template.templateId) &&
                              templateIds.indexOf(template.templateId) !== idx;
          return `
          <div class="template-section ${isDuplicate ? 'template-duplicate' : ''}">
            <div class="template-header">
              <div class="template-info">
                <div class="template-name-label">Template:</div>
                <div class="template-name-value">${this.escapeHtml(template.templateName)}</div>
                ${isDuplicate ? '<div class="duplicate-badge">Duplicate</div>' : ''}
              </div>
              <button class="remove-template-btn"
                      data-template-id="${template.templateId}"
                      data-file-path="${file.path}"
                      data-template-index="${idx}"
                      title="Remove template '${this.escapeHtml(template.templateName)}'">
                Remove
              </button>
            </div>
            <div class="template-meta">
              <span class="template-id" title="Template ID">ID: ${this.escapeHtml(template.templateId.substring(0, 20))}...</span>
              <span class="template-lines">Lines ${template.startLine}-${template.endLine}</span>
            </div>
          </div>
        `;
        }).join('');
        contentHTML += `</div>`;
      }

      content.innerHTML = contentHTML;

      // Add event listener to accordion header
      header.addEventListener('click', () => {
        accordionItem.classList.toggle('active');
      });

      // Add event listeners to all remove template buttons in this content
      const removeButtons = content.querySelectorAll('.remove-template-btn');
      removeButtons.forEach((btn) => {
        const button = btn as HTMLButtonElement;
        button.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const templateId = button.getAttribute('data-template-id');
          const filePath = button.getAttribute('data-file-path');
          if (templateId && filePath) {
            webviewLogger.debug(
              LogCategory.UI,
              'Remove template button clicked via event listener',
              'KnowledgeViewController.renderClaudeMdAccordion',
              { templateId, filePath },
              LogPathway.KNOWLEDGE_MANAGEMENT
            );
            this.removeTemplate(templateId, filePath);
          }
        });
      });

      accordionItem.appendChild(header);
      accordionItem.appendChild(content);
      container.appendChild(accordionItem);
    }
  }

  /**
   * Render template controls
   */
  renderTemplateControls(): void {
    webviewLogger.debug(
      LogCategory.UI,
      'Rendering template controls',
      'KnowledgeViewController.renderTemplateControls',
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
        'KnowledgeViewController.renderTemplateControls',
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
        'KnowledgeViewController.renderTemplateControls',
        { templateId: template.id, templateName: template.name },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    }

    webviewLogger.info(
      LogCategory.UI,
      'Template controls rendered',
      'KnowledgeViewController.renderTemplateControls',
      {
        optionsAdded: this.state.templates.length,
        totalOptions: selector.options.length
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    this.updateTemplateButtons();
  }

  /**
   * Update template button states
   */
  private updateTemplateButtons(): void {
    const selectedCount = this.state.selectedItems.size;
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
   * Update status bar
   */
  private updateStatusBar(): void {
    const statusText = document.getElementById('knowledge-status-text');
    const itemCount = document.getElementById('knowledge-item-count');

    if (statusText) {
      statusText.textContent = 'Ready';
    }

    if (itemCount) {
      const filtered = this.getFilteredItems();
      itemCount.textContent = `${filtered.length} of ${this.state.items.length} items`;
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Select all checkbox
    const selectAll = document.getElementById('knowledge-select-all') as HTMLInputElement;
    selectAll?.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      if (checked) {
        this.selectAll();
      } else {
        this.deselectAll();
      }
    });

    // Toggle all sections button
    const toggleAllBtn = document.getElementById('toggle-all-sections');
    toggleAllBtn?.addEventListener('click', () => this.toggleAllSections());

    // Search input
    const searchInput = document.getElementById('knowledge-search') as HTMLInputElement;
    let searchTimeout: any;
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.state.searchQuery = (e.target as HTMLInputElement).value;
        this.renderKnowledgeTable();
      }, 150);
    });

    // Add item button
    const addBtn = document.getElementById('add-knowledge-item');
    addBtn?.addEventListener('click', () => this.createNewItem());

    // Refresh button
    const refreshBtn = document.getElementById('refresh-knowledge');
    refreshBtn?.addEventListener('click', () => this.refreshKnowledgeData());

    // Scan claude files button
    const scanBtn = document.getElementById('scan-claude-files');
    scanBtn?.addEventListener('click', () => this.scanClaudeMdFiles());

    // Template controls
    const saveTemplateBtn = document.getElementById('save-template');
    saveTemplateBtn?.addEventListener('click', () => this.saveAsTemplate());

    const applySelectedBtn = document.getElementById('apply-selected');
    applySelectedBtn?.addEventListener('click', () => this.applySelectedItems());

    const applyTemplateBtn = document.getElementById('apply-template');
    applyTemplateBtn?.addEventListener('click', () => this.applyTemplateToFocused());

    const exportTemplateBtn = document.getElementById('export-template');
    exportTemplateBtn?.addEventListener('click', () => this.exportTemplate());

    const importTemplateBtn = document.getElementById('import-template');
    importTemplateBtn?.addEventListener('click', () => this.importTemplate());

    // Template selector
    const templateSelector = document.getElementById('template-selector') as HTMLSelectElement;
    templateSelector?.addEventListener('change', (e) => {
      this.handleTemplateSelection((e.target as HTMLSelectElement).value);
    });

    // Item checkboxes (delegated)
    document.addEventListener('change', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('item-checkbox')) {
        const itemId = (target as HTMLInputElement).dataset.itemId;
        if (itemId) {
          this.toggleItemSelection(itemId);
        }
      }
    });

    // Type header collapse/expand (delegated)
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const headerRow = target.closest('.knowledge-type-header');
      if (headerRow && headerRow instanceof HTMLElement) {
        const type = headerRow.dataset.type;
        if (type) {
          this.toggleSectionCollapse(type);
        }
      }
    });

    // Grouping buttons (delegated)
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('group-btn')) {
        const groupBy = target.dataset.group as 'type' | 'scope' | 'tag';
        if (groupBy) {
          this.changeGrouping(groupBy);
        }
      }
    });
  }

  /**
   * Get filtered items based on current filters
   */
  private getFilteredItems(): KnowledgeItem[] {
    let items = [...this.state.items];

    // Apply search filter
    if (this.state.searchQuery) {
      const query = this.state.searchQuery.toLowerCase();
      items = items.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.body.toLowerCase().includes(query) ||
        (item.source && item.source.toLowerCase().includes(query)) ||
        item.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply type filter
    if (this.state.filterType) {
      items = items.filter(item => item.type === this.state.filterType);
    }

    // Apply scope filter
    if (this.state.filterScope) {
      items = items.filter(item => item.scope === this.state.filterScope);
    }

    // Apply tag filter
    if (this.state.filterTags.length > 0) {
      items = items.filter(item =>
        this.state.filterTags.every(tag => item.tags.includes(tag))
      );
    }

    // Sort items
    items.sort((a, b) => {
      let comparison = 0;

      switch (this.state.sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'scope':
          comparison = a.scope.localeCompare(b.scope);
          break;
        case 'updated':
          // Handle both Date objects and ISO strings (postMessage serializes Dates to strings)
          const dateA = a.metadata.updatedAt instanceof Date
            ? a.metadata.updatedAt.getTime()
            : new Date(a.metadata.updatedAt).getTime();
          const dateB = b.metadata.updatedAt instanceof Date
            ? b.metadata.updatedAt.getTime()
            : new Date(b.metadata.updatedAt).getTime();
          comparison = dateA - dateB;
          break;
      }

      return this.state.sortDirection === 'asc' ? comparison : -comparison;
    });

    return items;
  }

  /**
   * Group items by type
   */
  /**
   * Get display icon and label for a group
   */
  private getGroupDisplayInfo(groupKey: string, dimension: 'type' | 'scope' | 'tag'): { icon: string; label: string } {
    switch (dimension) {
      case 'type':
        return {
          icon: getKnowledgeTypeIcon(groupKey as KnowledgeType),
          label: getKnowledgeTypeLabel(groupKey as KnowledgeType)
        };
      case 'scope':
        return {
          icon: this.getScopeIcon(groupKey as KnowledgeScope),
          label: getKnowledgeScopeLabel(groupKey as KnowledgeScope)
        };
      case 'tag':
        return {
          icon: '🏷️',
          label: groupKey === 'untagged' ? 'Untagged' : groupKey
        };
      default:
        return { icon: '', label: groupKey };
    }
  }

  /**
   * Get icon for scope
   */
  private getScopeIcon(scope: KnowledgeScope): string {
    const icons: Record<KnowledgeScope, string> = {
      [KnowledgeScope.PERSONAL]: '👤',
      [KnowledgeScope.TEAM]: '👥',
      [KnowledgeScope.PROJECT]: '📂',
      [KnowledgeScope.ORGANIZATION]: '🏢',
      [KnowledgeScope.PUBLIC]: '🌐'
    };
    return icons[scope] || '📌';
  }

  /**
   * Generic grouping function - groups items by specified dimension
   */
  private groupItems(items: KnowledgeItem[], dimension: 'type' | 'scope' | 'tag'): Map<string, KnowledgeItem[]> {
    const groups = new Map<string, KnowledgeItem[]>();

    for (const item of items) {
      let groupKeys: string[] = [];

      switch (dimension) {
        case 'type':
          groupKeys = [item.type];
          break;
        case 'scope':
          groupKeys = [item.scope];
          break;
        case 'tag':
          // For tags, use first tag or 'Untagged'
          groupKeys = item.tags.length > 0 ? [item.tags[0]] : ['untagged'];
          break;
      }

      // Add item to each group (usually just one, but tags could be multiple)
      for (const key of groupKeys) {
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
    if (this.state.selectedItems.has(itemId)) {
      this.state.selectedItems.delete(itemId);
    } else {
      this.state.selectedItems.add(itemId);
    }
    this.updateTemplateButtons();
  }

  /**
   * Change grouping dimension
   */
  changeGrouping(groupBy: 'type' | 'scope' | 'tag'): void {
    if (this.state.groupBy === groupBy) {
      return; // Already selected
    }

    this.state.groupBy = groupBy;
    this.state.collapsedSections.clear(); // Clear collapsed state when changing grouping

    // Update active button visual
    document.querySelectorAll('.group-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`[data-group="${groupBy}"]`);
    activeBtn?.classList.add('active');

    this.renderKnowledgeTable();
  }

  /**
   * Toggle collapse state for a type section
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
   * Toggle all sections between expanded and collapsed
   */
  toggleAllSections(): void {
    const items = this.getFilteredItems();
    const groups = this.groupItems(items, this.state.groupBy);
    const allGroupKeys = Array.from(groups.keys());

    // If all sections are collapsed, expand all. Otherwise, collapse all.
    const allCollapsed = this.state.collapsedSections.size === allGroupKeys.length;

    if (allCollapsed) {
      // Expand all
      this.state.collapsedSections.clear();
      this.updateToggleAllButton(false);
    } else {
      // Collapse all
      this.state.collapsedSections.clear();
      allGroupKeys.forEach(key => this.state.collapsedSections.add(key));
      this.updateToggleAllButton(true);
    }

    this.renderKnowledgeTable();
  }

  /**
   * Update the toggle all button icon
   */
  private updateToggleAllButton(collapsed: boolean): void {
    const btn = document.getElementById('toggle-all-sections');
    if (btn) {
      btn.textContent = collapsed ? '▶' : '▼';
      btn.title = collapsed ? 'Expand all sections' : 'Collapse all sections';
    }
  }

  /**
   * Select all visible items
   */
  selectAll(): void {
    const items = this.getFilteredItems();
    for (const item of items) {
      this.state.selectedItems.add(item.id);
    }
    this.renderKnowledgeTable();
    this.updateTemplateButtons();
  }

  /**
   * Deselect all items
   */
  deselectAll(): void {
    this.state.selectedItems.clear();
    this.renderKnowledgeTable();
    this.updateTemplateButtons();
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
          options: [
            '📋 ADR',
            '🎯 Golden Path',
            '🔧 Design Pattern',
            '⚠️ Anti-Pattern',
            '📏 Standard',
            '📝 Convention',
            '✅ Checklist',
            '💡 Tip',
            '📝 Snippet',
            '⚙️ Configuration',
            '🔗 API Reference',
            '📚 Learning',
            '🔍 Troubleshooting',
            '⚠️ Gotcha',
            '📄 Template',
            '📖 Guideline',
            '🔄 Workflow',
            '📦 Runbook',
            '📦 Custom'
          ]
        },
        {
          name: 'scope',
          label: 'Scope',
          type: 'select',
          required: true,
          options: ['👤 Personal', '👥 Team', '📁 Project', '🏢 Organization', '🌐 Public']
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

    // Parse type from display string
    const typeMap: Record<string, string> = {
      '📋 ADR': 'adr',
      '🎯 Golden Path': 'golden-path',
      '🔧 Design Pattern': 'design-pattern',
      '⚠️ Anti-Pattern': 'anti-pattern',
      '📏 Standard': 'standard',
      '📝 Convention': 'convention',
      '✅ Checklist': 'checklist',
      '💡 Tip': 'tip',
      '📝 Snippet': 'snippet',
      '⚙️ Configuration': 'configuration',
      '🔗 API Reference': 'api-reference',
      '📚 Learning': 'learning',
      '🔍 Troubleshooting': 'troubleshooting',
      '⚠️ Gotcha': 'gotcha',
      '📄 Template': 'template',
      '📖 Guideline': 'guideline',
      '🔄 Workflow': 'workflow',
      '📦 Runbook': 'runbook',
      '📦 Custom': 'custom'
    };

    const scopeMap: Record<string, string> = {
      '👤 Personal': 'personal',
      '👥 Team': 'team',
      '📁 Project': 'project',
      '🏢 Organization': 'organization',
      '🌐 Public': 'public'
    };

    // Parse tags from comma-separated string
    const tags = result.tags ? result.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t) : [];

    // Send create request to extension
    this.sendMessage({
      type: 'knowledge:create-item',
      payload: {
        type: typeMap[result.type] || 'custom',
        scope: scopeMap[result.scope] || 'personal',
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
      'KnowledgeViewController.editItem',
      { itemId, controllerExists: !!(window as any).knowledgeController },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      const item = this.state.items.find(i => i.id === itemId);
      if (!item) {
        webviewLogger.error(
          LogCategory.UI,
          'Cannot edit item - item not found',
          'KnowledgeViewController.editItem',
          { itemId, availableItems: this.state.items.length },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        this.notifications.show({
          type: 'error',
          message: 'Knowledge item not found'
        });
        return;
      }

      webviewLogger.info(
        LogCategory.UI,
        'Item found, showing edit dialog',
        'KnowledgeViewController.editItem',
        { itemId, title: item.title, type: item.type },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      // Show the edit form asynchronously
      this.showEditForm(item).catch(error => {
        webviewLogger.error(
          LogCategory.UI,
          'Error showing edit form',
          'KnowledgeViewController.editItem',
          { itemId, error: error.message, stack: error.stack },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        this.notifications.show({
          type: 'error',
          message: `Failed to show edit form: ${error.message}`
        });
      });

    } catch (error: any) {
      webviewLogger.error(
        LogCategory.UI,
        'Unexpected error during edit operation',
        'KnowledgeViewController.editItem',
        { itemId, error: error.message, stack: error.stack },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      this.notifications.show({
        type: 'error',
        message: `Failed to edit item: ${error.message}`
      });
    }
  }

  /**
   * Show edit form modal (extracted async logic)
   */
  private async showEditForm(item: KnowledgeItem): Promise<void> {
    webviewLogger.debug(
      LogCategory.UI,
      'Creating edit form modal',
      'KnowledgeViewController.showEditForm',
      { itemId: item.id, title: item.title },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    const modal = new ModalDialog();

    // Map internal type values to display strings
    const typeDisplayMap: Record<string, string> = {
      'adr': '📋 ADR',
      'golden-path': '🎯 Golden Path',
      'design-pattern': '🔧 Design Pattern',
      'anti-pattern': '⚠️ Anti-Pattern',
      'standard': '📏 Standard',
      'convention': '📝 Convention',
      'checklist': '✅ Checklist',
      'tip': '💡 Tip',
      'snippet': '📝 Snippet',
      'configuration': '⚙️ Configuration',
      'api-reference': '🔗 API Reference',
      'learning': '📚 Learning',
      'troubleshooting': '🔍 Troubleshooting',
      'gotcha': '⚠️ Gotcha',
      'template': '📄 Template',
      'guideline': '📖 Guideline',
      'workflow': '🔄 Workflow',
      'runbook': '📦 Runbook',
      'custom': '📦 Custom'
    };

    const scopeDisplayMap: Record<string, string> = {
      'personal': '👤 Personal',
      'team': '👥 Team',
      'project': '📁 Project',
      'organization': '🏢 Organization',
      'public': '🌐 Public'
    };

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
          options: [
            '📋 ADR',
            '🎯 Golden Path',
            '🔧 Design Pattern',
            '⚠️ Anti-Pattern',
            '📏 Standard',
            '📝 Convention',
            '✅ Checklist',
            '💡 Tip',
            '📝 Snippet',
            '⚙️ Configuration',
            '🔗 API Reference',
            '📚 Learning',
            '🔍 Troubleshooting',
            '⚠️ Gotcha',
            '📄 Template',
            '📖 Guideline',
            '🔄 Workflow',
            '📦 Runbook',
            '📦 Custom'
          ],
          defaultValue: typeDisplayMap[item.type] || '📦 Custom'
        },
        {
          name: 'scope',
          label: 'Scope',
          type: 'select',
          required: true,
          options: ['👤 Personal', '👥 Team', '📁 Project', '🏢 Organization', '🌐 Public'],
          defaultValue: scopeDisplayMap[item.scope] || '👤 Personal'
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
        'KnowledgeViewController.showEditForm',
        { itemId: item.id },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      return; // User cancelled
    }

    // Parse type from display string
    const typeMap: Record<string, string> = {
      '📋 ADR': 'adr',
      '🎯 Golden Path': 'golden-path',
      '🔧 Design Pattern': 'design-pattern',
      '⚠️ Anti-Pattern': 'anti-pattern',
      '📏 Standard': 'standard',
      '📝 Convention': 'convention',
      '✅ Checklist': 'checklist',
      '💡 Tip': 'tip',
      '📝 Snippet': 'snippet',
      '⚙️ Configuration': 'configuration',
      '🔗 API Reference': 'api-reference',
      '📚 Learning': 'learning',
      '🔍 Troubleshooting': 'troubleshooting',
      '⚠️ Gotcha': 'gotcha',
      '📄 Template': 'template',
      '📖 Guideline': 'guideline',
      '🔄 Workflow': 'workflow',
      '📦 Runbook': 'runbook',
      '📦 Custom': 'custom'
    };

    const scopeMap: Record<string, string> = {
      '👤 Personal': 'personal',
      '👥 Team': 'team',
      '📁 Project': 'project',
      '🏢 Organization': 'organization',
      '🌐 Public': 'public'
    };

    // Parse tags from comma-separated string
    const tags = result.tags ? result.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t) : [];

    webviewLogger.info(
      LogCategory.UI,
      'Sending update request for knowledge item',
      'KnowledgeViewController.showEditForm',
      { itemId: item.id, updates: { type: result.type, scope: result.scope, title: result.title } },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Send update request to extension
    this.sendMessage({
      type: 'knowledge:update-item',
      payload: {
        id: item.id,
        updates: {
          type: typeMap[result.type] || 'custom',
          scope: scopeMap[result.scope] || 'personal',
          title: result.title,
          body: result.body || '',
          tags,
          source: result.source || ''
        }
      }
    });

    this.notifications.show({
      type: 'info',
      message: `Updating "${result.title}"...`
    });
  }

  /**
   * Delete a knowledge item
   */
  deleteItem(itemId: string): void {
    webviewLogger.debug(
      LogCategory.UI,
      'Delete button clicked - entry point',
      'KnowledgeViewController.deleteItem',
      { itemId, controllerExists: !!(window as any).knowledgeController },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      const item = this.state.items.find(i => i.id === itemId);

      if (!item) {
        webviewLogger.error(
          LogCategory.UI,
          'Cannot delete item - item not found',
          'KnowledgeViewController.deleteItem',
          { itemId, availableItems: this.state.items.length },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        this.notifications.show({
          type: 'error',
          message: 'Knowledge item not found'
        });
        return;
      }

      webviewLogger.info(
        LogCategory.UI,
        'Item found, showing confirmation dialog',
        'KnowledgeViewController.deleteItem',
        { itemId, title: item.title, type: item.type },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      // Use ModalDialog.confirm() instead of browser confirm() (which is blocked by VSCode sandbox)
      this.showDeleteConfirmation(item).catch(error => {
        webviewLogger.error(
          LogCategory.UI,
          'Error showing delete confirmation',
          'KnowledgeViewController.deleteItem',
          { itemId, error: error.message, stack: error.stack },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        this.notifications.show({
          type: 'error',
          message: `Failed to show confirmation: ${error.message}`
        });
      });

    } catch (error: any) {
      webviewLogger.error(
        LogCategory.UI,
        'Unexpected error during delete operation',
        'KnowledgeViewController.deleteItem',
        { itemId, error: error.message, stack: error.stack },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      this.notifications.show({
        type: 'error',
        message: `Failed to delete item: ${error.message}`
      });
    }
  }

  /**
   * Show delete confirmation modal (extracted async logic)
   */
  private async showDeleteConfirmation(item: KnowledgeItem): Promise<void> {
    webviewLogger.debug(
      LogCategory.UI,
      'Creating delete confirmation modal',
      'KnowledgeViewController.showDeleteConfirmation',
      { itemId: item.id, title: item.title },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    const modal = new ModalDialog();
    const message = `Are you sure you want to delete "${item.title}"?\n\nThis action cannot be undone. The markdown file will be permanently deleted from your .agent-brain directory.`;

    const confirmed = await modal.confirm(message, 'Confirm Delete');

    webviewLogger.debug(
      LogCategory.UI,
      `User ${confirmed ? 'confirmed' : 'cancelled'} delete operation`,
      'KnowledgeViewController.showDeleteConfirmation',
      { itemId: item.id, title: item.title, confirmed },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    if (!confirmed) {
      return;
    }

    webviewLogger.info(
      LogCategory.UI,
      'Sending delete request to extension',
      'KnowledgeViewController.showDeleteConfirmation',
      { itemId: item.id, title: item.title, path: item.path },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    this.sendMessage({
      type: 'knowledge:delete-item',
      payload: { id: item.id }
    });

    this.notifications.show({
      type: 'info',
      message: `Deleting "${item.title}"...`
    });

    webviewLogger.debug(
      LogCategory.UI,
      'Delete request sent successfully',
      'KnowledgeViewController.showDeleteConfirmation',
      { itemId: item.id },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Save selected items as a template
   */
  async saveAsTemplate(): Promise<void> {
    const selectedIds = Array.from(this.state.selectedItems);
    if (selectedIds.length === 0) {
      this.notifications.show({
        type: 'warning',
        message: 'Please select at least one knowledge item to create a template'
      });
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

      this.sendMessage({
        type: 'knowledge:update-template',
        payload: {
          templateId: currentTemplate.id,
          itemIds: selectedIds
        }
      });

      this.notifications.show({
        type: 'success',
        message: `Template "${currentTemplate.name}" updated with ${selectedIds.length} item(s). Remember to re-apply this template to any claude.md files where it was previously used.`,
        duration: 8000
      });
    } else {
      // Creating new template
      const name = await modal.prompt('Template name:', {
        required: true,
        placeholder: 'e.g., "API Design Checklist"'
      });

      if (!name) {
        return; // User cancelled
      }

      this.sendMessage({
        type: 'knowledge:create-template',
        payload: {
          name,
          itemIds: selectedIds
        }
      });

      this.notifications.show({
        type: 'info',
        message: `Creating template "${name}" with ${selectedIds.length} item(s)...`
      });
    }
  }

  /**
   * Apply selected items directly to focused claude.md
   */
  applySelectedItems(): void {
    const selectedIds = Array.from(this.state.selectedItems);
    if (selectedIds.length === 0) {
      this.notifications.show({
        type: 'warning',
        message: 'Please select at least one knowledge item to apply'
      });
      return;
    }

    this.sendMessage({
      type: 'knowledge:apply-selected-items',
      payload: { itemIds: selectedIds }
    });

    this.notifications.show({
      type: 'info',
      message: `Applying ${selectedIds.length} selected item(s) to focused claude.md...`
    });
  }

  /**
   * Apply template to focused claude.md
   */
  applyTemplateToFocused(): void {
    const selector = document.getElementById('template-selector') as HTMLSelectElement;
    const templateId = selector?.value;

    if (!templateId) {
      this.notifications.show({
        type: 'warning',
        message: 'Please select a template from the dropdown'
      });
      return;
    }

    const template = this.state.templates.find(t => t.id === templateId);
    const templateName = template?.name || 'template';

    this.sendMessage({
      type: 'knowledge:apply-template',
      payload: { templateId, replaceExisting: true }
    });

    this.notifications.show({
      type: 'info',
      message: `Applying template "${templateName}" to focused claude.md...`
    });
  }

  /**
   * Export selected template
   */
  exportTemplate(): void {
    const selector = document.getElementById('template-selector') as HTMLSelectElement;
    const templateId = selector?.value;

    if (!templateId) {
      this.notifications.show({
        type: 'warning',
        message: 'Please select a template from the dropdown'
      });
      return;
    }

    const template = this.state.templates.find(t => t.id === templateId);
    const templateName = template?.name || 'template';

    this.sendMessage({
      type: 'knowledge:export-template',
      payload: { templateId }
    });

    this.notifications.show({
      type: 'info',
      message: `Exporting template "${templateName}"...`
    });
  }

  /**
   * Import template from file
   */
  importTemplate(): void {
    // Send message to backend to trigger file picker
    this.sendMessage({
      type: 'knowledge:import-template',
      payload: {}
    });

    this.notifications.show({
      type: 'info',
      message: 'Select a template file to import...'
    });
  }

  /**
   * Handle template selection from dropdown
   * Updates selected items to match the template's knowledge items
   */
  handleTemplateSelection(templateId: string): void {
    webviewLogger.info(
      LogCategory.UI,
      'Template selected from dropdown',
      'KnowledgeViewController.handleTemplateSelection',
      { templateId },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    if (!templateId) {
      // Empty selection - clear all selections
      webviewLogger.debug(
        LogCategory.UI,
        'Empty template selection, clearing selections',
        'KnowledgeViewController.handleTemplateSelection',
        {},
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      this.deselectAll();
      return;
    }

    const template = this.state.templates.find(t => t.id === templateId);
    if (!template) {
      webviewLogger.error(
        LogCategory.UI,
        'Template not found in state',
        'KnowledgeViewController.handleTemplateSelection',
        { templateId, availableTemplates: this.state.templates.map(t => ({ id: t.id, name: t.name })) },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      this.notifications.show({
        type: 'error',
        message: 'Template not found'
      });
      return;
    }

    webviewLogger.debug(
      LogCategory.UI,
      'Found template, updating selections',
      'KnowledgeViewController.handleTemplateSelection',
      {
        templateName: template.name,
        templateItemCount: template.itemIds.length,
        templateItemIds: template.itemIds
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Clear current selection
    this.state.selectedItems.clear();

    // Select items from template
    let selectedCount = 0;
    let missingCount = 0;

    for (const itemId of template.itemIds) {
      const itemExists = this.state.items.some(item => item.id === itemId);
      if (itemExists) {
        this.state.selectedItems.add(itemId);
        selectedCount++;
      } else {
        missingCount++;
        webviewLogger.warn(
          LogCategory.UI,
          'Template references missing knowledge item',
          'KnowledgeViewController.handleTemplateSelection',
          { templateId, templateName: template.name, missingItemId: itemId },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
      }
    }

    webviewLogger.info(
      LogCategory.UI,
      'Template selection applied to checkboxes',
      'KnowledgeViewController.handleTemplateSelection',
      {
        templateName: template.name,
        itemsSelected: selectedCount,
        itemsMissing: missingCount,
        totalTemplateItems: template.itemIds.length
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    if (missingCount > 0) {
      this.notifications.show({
        type: 'warning',
        message: `Template "${template.name}" selected. Note: ${missingCount} item(s) not found in current knowledge base.`
      });
    } else {
      this.notifications.show({
        type: 'success',
        message: `Template "${template.name}" selected (${selectedCount} items)`
      });
    }

    // Re-render table to show checked checkboxes
    this.renderKnowledgeTable();
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
      this.sendMessage({
        type: 'knowledge:remove-template',
        payload: { templateId, claudeMdPath }
      });

      this.notifications.show({
        type: 'info',
        message: `Removing template "${templateName}" from claude.md...`
      });
    }
  }

  /**
   * Scan for claude.md files
   */
  scanClaudeMdFiles(): void {
    this.sendMessage({
      type: 'knowledge:scan-claude-files'
    });
  }

  /**
   * Refresh knowledge data from extension
   */
  refreshKnowledgeData(): void {
    this.sendMessage({
      type: 'knowledge:load-request'
    });
    this.sendMessage({
      type: 'knowledge:scan-claude-files'
    });
  }

  /**
   * Send message to extension
   */
  private sendMessage(message: any): void {
    if (this.messageHandler) {
      this.messageHandler(message);
    }
  }

  /**
   * Handle operation results (success/error notifications)
   * Called by parent when extension sends operation results
   */
  handleOperationResult(operation: string, success: boolean, message?: string): void {
    if (success) {
      this.notifications.show({
        type: 'success',
        message: message || `${operation} completed successfully`
      });
    } else {
      this.notifications.show({
        type: 'error',
        message: message || `${operation} failed`,
        duration: 6000 // Show errors longer
      });
    }
  }

  /**
   * Simple markdown renderer
   * Converts markdown to HTML for display in claude.md accordion
   */
  private renderMarkdown(markdown: string): string {
    let html = markdown;

    // Escape HTML first to prevent XSS
    html = this.escapeHtml(html);

    // Headers (h1-h6)
    html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

    // Bold **text** or __text__
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // Italic *text* or _text_
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');

    // Inline code `code`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Code blocks ```lang\ncode\n```
    html = html.replace(/```(\w+)?\n([\s\S]+?)```/g, '<pre><code>$2</code></pre>');

    // Links [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    // Unordered lists
    html = html.replace(/^\s*[-*+]\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Ordered lists
    html = html.replace(/^\s*\d+\.\s+(.+)$/gm, '<li>$1</li>');

    // Blockquotes
    html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');

    // Horizontal rules
    html = html.replace(/^---$/gm, '<hr>');
    html = html.replace(/^\*\*\*$/gm, '<hr>');

    // Line breaks (two spaces at end of line or explicit \n\n)
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/  \n/g, '<br>');

    // Wrap in paragraphs
    html = '<p>' + html + '</p>';

    // Clean up empty paragraphs
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>\s*<\/p>/g, '');

    return html;
  }

  /**
   * Escape HTML
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Make controller globally accessible for onclick handlers
declare global {
  interface Window {
    knowledgeController: KnowledgeViewController;
  }
}
