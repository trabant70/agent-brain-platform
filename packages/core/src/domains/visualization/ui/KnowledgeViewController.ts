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
import { MarkdownRenderer } from './knowledge/utils/MarkdownRenderer';
import { KnowledgeFilters } from './knowledge/utils/KnowledgeFilters';
import { TableTemplates } from './knowledge/templates/table-templates';
import { AccordionTemplates } from './knowledge/templates/accordion-templates';
import {
  TYPE_OPTIONS,
  SCOPE_OPTIONS,
  TYPE_DISPLAY_TO_VALUE,
  SCOPE_DISPLAY_TO_VALUE,
  TYPE_VALUE_TO_DISPLAY,
  SCOPE_VALUE_TO_DISPLAY
} from './knowledge/templates/form-constants';

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
  private isInitialLoad: boolean = true;
  private expandedAccordions: Set<string> = new Set(); // Track which claude.md files are expanded
  private accordionScrollPositions: Map<string, number> = new Map(); // Track scroll positions for each file
  private selectedClaudeFile: string | null = null; // Track which claude.md file is selected for applying knowledge

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

    // Save scroll positions before re-rendering
    this.saveAccordionScrollPositions();

    this.state.claudeMdFiles = files;
    this.renderClaudeMdAccordion();

    // Restore scroll positions after rendering
    this.restoreAccordionScrollPositions();

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
    row.innerHTML = TableTemplates.itemRow(item, isSelected);

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
      container.innerHTML = AccordionTemplates.emptyState();
      return;
    }

    // Auto-select first file if none selected
    if (!this.selectedClaudeFile && this.state.claudeMdFiles.length > 0) {
      this.selectedClaudeFile = this.state.claudeMdFiles[0].path;
    }

    for (const file of this.state.claudeMdFiles) {
      const accordionItem = document.createElement('div');
      // Check if this accordion was previously expanded
      const isExpanded = this.expandedAccordions.has(file.path);
      const isSelected = this.selectedClaudeFile === file.path;
      accordionItem.className = `accordion-item ab-collapsible ${isExpanded ? 'expanded' : 'collapsed'} ${isSelected ? 'selected' : ''}`;
      accordionItem.dataset.filePath = file.path;

      const header = document.createElement('div');
      header.className = 'accordion-header ab-collapsible-header';
      header.innerHTML = AccordionTemplates.accordionHeader(file, isSelected);

      const content = document.createElement('div');
      content.className = 'accordion-content ab-collapsible-body';

      // Build content HTML
      let contentHTML = '';

      // Add Claude.md content section with edit controls
      const renderedMarkdown = (file.content && file.content.trim().length > 0)
        ? MarkdownRenderer.render(file.content)
        : null;
      contentHTML += AccordionTemplates.claudeMdContent(file, renderedMarkdown);

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
                <div class="template-name-value">${MarkdownRenderer.escapeHtml(template.templateName)}</div>
                ${isDuplicate ? '<div class="duplicate-badge">Duplicate</div>' : ''}
              </div>
              <button class="remove-template-btn"
                      data-template-id="${template.templateId}"
                      data-file-path="${file.path}"
                      data-template-index="${idx}"
                      title="Remove template '${MarkdownRenderer.escapeHtml(template.templateName)}'">
                Remove
              </button>
            </div>
            <div class="template-meta">
              <span class="template-id" title="Template ID">ID: ${MarkdownRenderer.escapeHtml(template.templateId.substring(0, 20))}...</span>
              <span class="template-lines">Lines ${template.startLine}-${template.endLine}</span>
            </div>
          </div>
        `;
        }).join('');
        contentHTML += `</div>`;
      }

      content.innerHTML = contentHTML;

      // Add event listener for file selection radio button
      const fileSelector = header.querySelector('.file-selector');
      if (fileSelector) {
        fileSelector.addEventListener('click', (e) => {
          e.stopPropagation(); // Don't trigger accordion toggle
          this.selectedClaudeFile = file.path;

          // Update all accordion items
          const allItems = document.querySelectorAll('.accordion-item');
          allItems.forEach(item => {
            const itemPath = (item as HTMLElement).dataset.filePath;
            if (itemPath === file.path) {
              item.classList.add('selected');
            } else {
              item.classList.remove('selected');
            }
          });

          webviewLogger.info(
            LogCategory.UI,
            'Selected claude.md file for applying knowledge',
            'renderClaudeMdAccordion',
            { selectedFile: file.path },
            LogPathway.KNOWLEDGE_MANAGEMENT
          );

          this.notifications.show({
            type: 'info',
            message: `Selected ${file.relativePath} as target for knowledge items`,
            duration: 2000
          });
        });
      }

      // Add event listener to accordion header
      header.addEventListener('click', (e) => {
        // Don't toggle if clicking on the radio button
        if ((e.target as HTMLElement).closest('.file-selector')) {
          return;
        }
        const wasExpanded = accordionItem.classList.contains('expanded');

        // Toggle between expanded and collapsed
        if (wasExpanded) {
          accordionItem.classList.remove('expanded');
          accordionItem.classList.add('collapsed');
        } else {
          accordionItem.classList.remove('collapsed');
          accordionItem.classList.add('expanded');
        }

        // Track expansion state
        const filePath = accordionItem.dataset.filePath;
        if (filePath) {
          if (wasExpanded) {
            this.expandedAccordions.delete(filePath);
          } else {
            this.expandedAccordions.add(filePath);
          }
        }
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

      // Add event listeners for edit/save/cancel buttons
      const editBtn = content.querySelector('.edit-claude-btn') as HTMLButtonElement;
      const saveBtn = content.querySelector('.save-claude-btn') as HTMLButtonElement;
      const cancelBtn = content.querySelector('.cancel-claude-btn') as HTMLButtonElement;
      const displayDiv = content.querySelector('.claude-md-display') as HTMLElement;
      const editorDiv = content.querySelector('.claude-md-editor') as HTMLElement;
      const textarea = content.querySelector('.claude-md-textarea') as HTMLTextAreaElement;

      if (editBtn && displayDiv && editorDiv && textarea) {
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          displayDiv.style.display = 'none';
          editorDiv.style.display = 'block';
          editBtn.style.display = 'none';
          textarea.focus();
        });

        if (saveBtn) {
          saveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const filePath = saveBtn.getAttribute('data-file-path');
            const newContent = textarea.value;
            if (filePath) {
              this.saveClaudeMdContent(filePath, newContent);
            }
          });
        }

        if (cancelBtn) {
          cancelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            displayDiv.style.display = 'block';
            editorDiv.style.display = 'none';
            editBtn.style.display = '';
            // Reset textarea to original content
            const fileData = this.state.claudeMdFiles.find(f => f.path === file.path);
            if (fileData && textarea) {
              textarea.value = fileData.content;
            }
          });
        }
      }

      // Track scroll position when user scrolls
      content.addEventListener('scroll', () => {
        const filePath = accordionItem.dataset.filePath;
        if (filePath) {
          this.accordionScrollPositions.set(filePath, content.scrollTop);
        }
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

    // Column header sorting
    const sortableHeaders = document.querySelectorAll('.knowledge-table th[data-sort]');
    sortableHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const sortColumn = header.getAttribute('data-sort') as 'title' | 'type' | 'scope';
        if (sortColumn) {
          this.handleSort(sortColumn);
        }
      });
    });

    // Resizable divider
    this.setupResizer();
  }

  /**
   * Setup resizable divider between panels
   */
  private setupResizer(): void {
    const resizer = document.getElementById('knowledge-resizer');
    const leftPanel = document.querySelector('.knowledge-left-panel') as HTMLElement;
    const container = document.querySelector('.knowledge-container') as HTMLElement;

    if (!resizer || !leftPanel || !container) return;

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    const minWidth = 250; // Match CSS min-width
    const maxWidth = 800; // Match CSS max-width

    resizer.addEventListener('mousedown', (e: MouseEvent) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = leftPanel.offsetWidth;

      // Prevent text selection during drag
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';

      e.preventDefault();
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!isResizing) return;

      const delta = e.clientX - startX;
      let newWidth = startWidth + delta;

      // Enforce min/max constraints
      newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

      // Update left panel width
      leftPanel.style.flex = `0 0 ${newWidth}px`;

      e.preventDefault();
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';

        // Save preference to localStorage
        const finalWidth = leftPanel.offsetWidth;
        try {
          localStorage.setItem('knowledge-left-panel-width', finalWidth.toString());
        } catch (err) {
          // Ignore localStorage errors
        }
      }
    });

    // Restore saved width on initialization
    try {
      const savedWidth = localStorage.getItem('knowledge-left-panel-width');
      if (savedWidth) {
        const width = parseInt(savedWidth, 10);
        if (width >= minWidth && width <= maxWidth) {
          leftPanel.style.flex = `0 0 ${width}px`;
        }
      }
    } catch (err) {
      // Ignore localStorage errors
    }
  }

  /**
   * Get filtered items based on current filters
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
  }

  /**
   * Handle column sort click
   */
  handleSort(column: 'title' | 'type' | 'scope'): void {
    webviewLogger.debug(
      LogCategory.UI,
      'Sort column clicked',
      'handleSort',
      { column },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Toggle direction if same column, otherwise reset to ascending
    if (this.state.sortBy === column) {
      this.state.sortDirection = this.state.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.state.sortBy = column;
      this.state.sortDirection = 'asc';
    }

    this.renderKnowledgeTable();
    this.updateSortIndicators();

    webviewLogger.debug(
      LogCategory.UI,
      'Sort applied',
      'handleSort',
      { sortBy: this.state.sortBy, sortDirection: this.state.sortDirection },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Update sort indicators in table headers
   */
  private updateSortIndicators(): void {
    const headers = document.querySelectorAll('.knowledge-table th[data-sort]');
    headers.forEach(header => {
      const sortColumn = header.getAttribute('data-sort');

      // Remove all sorting classes
      header.classList.remove('sorted-asc', 'sorted-desc', 'sortable');

      // Add sortable class for cursor styling
      header.classList.add('sortable');

      // Add appropriate class if this is the active sort column
      if (sortColumn === this.state.sortBy) {
        if (this.state.sortDirection === 'asc') {
          header.classList.add('sorted-asc');
        } else {
          header.classList.add('sorted-desc');
        }
      }
    });
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
    this.sendMessage({
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
        'KnowledgeViewController.showEditForm',
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
          type: TYPE_DISPLAY_TO_VALUE[result.type] || 'custom',
          scope: SCOPE_DISPLAY_TO_VALUE[result.scope] || 'personal',
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

    if (!this.selectedClaudeFile) {
      this.notifications.show({
        type: 'warning',
        message: 'Please select a claude.md file first (click the radio button next to the file name)'
      });
      return;
    }

    const fileName = this.selectedClaudeFile.split(/[/\\]/).pop() || 'claude.md';

    this.sendMessage({
      type: 'knowledge:apply-selected-items',
      payload: {
        itemIds: selectedIds,
        claudeFilePath: this.selectedClaudeFile
      }
    });

    this.notifications.show({
      type: 'info',
      message: `Applying ${selectedIds.length} selected item(s) to ${fileName}...`
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

    if (!this.selectedClaudeFile) {
      this.notifications.show({
        type: 'warning',
        message: 'Please select a claude.md file first (click the radio button next to the file name)'
      });
      return;
    }

    const template = this.state.templates.find(t => t.id === templateId);
    const templateName = template?.name || 'template';
    const fileName = this.selectedClaudeFile.split(/[/\\]/).pop() || 'claude.md';

    this.sendMessage({
      type: 'knowledge:apply-template',
      payload: {
        templateId,
        replaceExisting: true,
        claudeFilePath: this.selectedClaudeFile
      }
    });

    this.notifications.show({
      type: 'info',
      message: `Applying template "${templateName}" to ${fileName}...`
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
   * Save updated claude.md content
   */
  saveClaudeMdContent(filePath: string, content: string): void {
    this.sendMessage({
      type: 'knowledge:update-claude-file',
      payload: { filePath, content }
    });

    this.notifications.show({
      type: 'info',
      message: 'Saving changes to claude.md...'
    });
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
   * Save scroll positions of all accordion content areas
   */
  private saveAccordionScrollPositions(): void {
    const accordionItems = document.querySelectorAll('.accordion-item');
    accordionItems.forEach((item) => {
      const filePath = (item as HTMLElement).dataset.filePath;
      const content = item.querySelector('.accordion-content');

      if (filePath && content) {
        const scrollTop = content.scrollTop;
        if (scrollTop > 0) {
          this.accordionScrollPositions.set(filePath, scrollTop);
          webviewLogger.debug(
            LogCategory.UI,
            'Saved scroll position for accordion',
            'saveAccordionScrollPositions',
            { filePath, scrollTop },
            LogPathway.KNOWLEDGE_MANAGEMENT
          );
        }
      }
    });
  }

  /**
   * Restore scroll positions of all accordion content areas
   */
  private restoreAccordionScrollPositions(): void {
    // Use setTimeout to ensure DOM is fully updated
    setTimeout(() => {
      const accordionItems = document.querySelectorAll('.accordion-item');
      accordionItems.forEach((item) => {
        const filePath = (item as HTMLElement).dataset.filePath;
        const content = item.querySelector('.accordion-content');

        if (filePath && content) {
          const savedScrollTop = this.accordionScrollPositions.get(filePath);
          if (savedScrollTop !== undefined && savedScrollTop > 0) {
            content.scrollTop = savedScrollTop;
            webviewLogger.debug(
              LogCategory.UI,
              'Restored scroll position for accordion',
              'restoreAccordionScrollPositions',
              { filePath, scrollTop: savedScrollTop },
              LogPathway.KNOWLEDGE_MANAGEMENT
            );
          }
        }
      });
    }, 0);
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

}

// Make controller globally accessible for onclick handlers
declare global {
  interface Window {
    knowledgeController: KnowledgeViewController;
  }
}
