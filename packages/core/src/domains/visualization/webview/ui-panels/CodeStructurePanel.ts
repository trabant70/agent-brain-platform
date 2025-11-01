/**
 * Code Structure Panel (Unified)
 * Single filter-driven panel for Code Structure Review
 *
 * Architecture:
 * - Filter state is the single source of truth
 * - No navigation state (no "overview" vs "detail")
 * - All visualizations adapt based on filter context
 * - Selecting 1 category = detail-level visualizations
 * - Selecting multiple/all categories = overview-level visualizations
 */

import { VisualizationCoordinator } from '../coordination/VisualizationCoordinator';
import type { AnalysisData } from '../coordination/AnalysisDataMapper';
import type { FilterCriteria } from './CollapsibleFilterPanel';
import { SuggestionPanel } from '../ai-suggestions/SuggestionPanel';
import { VisualizationTabManager } from './VisualizationTabManager';
import type { VisualizationTab as VizTab } from './VisualizationTabManager';
import { IssueDetailModal, type IssueDetail } from './IssueDetailModal';

/**
 * Unified Code Structure Panel
 */
export class CodeStructurePanel {
  private container: HTMLElement;
  private coordinator: VisualizationCoordinator;
  private suggestionPanel: SuggestionPanel | null = null;
  private tabManager: VisualizationTabManager | null = null;
  private analysisData: AnalysisData | null = null;
  private currentFilter: FilterCriteria = {};
  private isFilterPanelOpen: boolean = false;
  private issueModal: IssueDetailModal;

  constructor(container: HTMLElement, coordinator: VisualizationCoordinator) {
    this.container = container;
    this.coordinator = coordinator;
    this.issueModal = new IssueDetailModal();
  }

  /**
   * Render the unified panel
   */
  async render(analysisData: AnalysisData): Promise<void> {
    this.analysisData = analysisData;
    this.clear();

    // Create unified panel structure (compact, no heading)
    this.container.innerHTML = `
      <div class="code-structure-panel compact">
        <!-- Sliding Filter Panel (Timeline-style) -->
        <div id="filter-control-panel" class="filter-control-panel">
          <div class="filter-panel-header">
            <h3>Filters & Settings</h3>
            <button id="close-filter-panel" class="btn btn-icon" title="Close">×</button>
          </div>
          <div class="filter-panel-content">
            <!-- Filter Grid -->
            <div class="code-structure-filter-grid" id="code-structure-filter-grid">
              <!-- Categories Section -->
              <div class="code-structure-filter-section">
                <div class="code-structure-section-header">
                  <span>Categories</span>
                  <span class="code-structure-section-count" id="categories-count">0</span>
                </div>
                <div class="code-structure-checkbox-list" id="categories-list"></div>
              </div>

              <!-- Severities Section -->
              <div class="code-structure-filter-section">
                <div class="code-structure-section-header">
                  <span>Severities</span>
                  <span class="code-structure-section-count" id="severities-count">0</span>
                </div>
                <div class="code-structure-checkbox-list" id="severities-list"></div>
              </div>

              <!-- Files Section -->
              <div class="code-structure-filter-section">
                <div class="code-structure-section-header">
                  <span>Files</span>
                  <span class="code-structure-section-count" id="files-count">0</span>
                </div>
                <div class="code-structure-checkbox-list" id="files-list"></div>
              </div>
            </div>

            <!-- Filter Actions -->
            <div class="code-structure-filter-actions">
              <button class="btn-clear" id="clear-filters">Clear All</button>
              <button class="btn-apply" id="apply-filters">Apply Filters</button>
            </div>
          </div>
        </div>

        <!-- AI Suggestions (collapsible, default collapsed) -->
        <div id="suggestions-container" class="compact-section"></div>

        <!-- Stats Summary -->
        <div class="panel-stats compact-stats" id="panel-stats">
          <!-- Stats will be populated dynamically -->
        </div>

        <!-- Visualization Tabs -->
        <div class="panel-content compact-content">
          <div id="viz-tab-container"></div>
        </div>

        <!-- Issue List Table (collapsible) -->
        <div class="panel-section compact-section">
          <details class="issue-details" id="issue-details-section">
            <summary class="issue-summary">
              <span class="summary-icon">📋</span>
              <span class="summary-label">All Issues</span>
              <span class="summary-count" id="issue-count-badge">0</span>
              <span class="summary-arrow">▼</span>
            </summary>
            <div class="issue-list-container" id="issue-list-container">
              <!-- Issue table will be populated here -->
            </div>
          </details>
        </div>
      </div>
    `;

    // Render filter panel
    this.renderFilterPanel(analysisData);

    // Setup filter panel toggle handlers
    this.setupFilterPanelHandlers();

    // Render AI suggestions
    this.renderSuggestions(analysisData);

    // Render visualization tabs
    this.renderVisualizationTabs();

    // Initial render with no filter (all data)
    await this.handleFilterChange({});

    // Setup bubble click handler to filter by category
    this.setupBubbleClickHandler();

    // Use requestAnimationFrame to ensure DOM is ready
    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
  }

  /**
   * Setup bubble click handler to filter by clicked category
   */
  private setupBubbleClickHandler(): void {
    window.addEventListener('bubble-click', ((event: CustomEvent) => {
      const { categoryId } = event.detail;
      if (categoryId) {
        // Uncheck all categories
        document.querySelectorAll('.code-structure-filter-item input[type="checkbox"][id^="cat-"]').forEach(cb => {
          (cb as HTMLInputElement).checked = false;
        });

        // Check only the clicked category
        const targetCheckbox = document.getElementById(`cat-${categoryId}`) as HTMLInputElement;
        if (targetCheckbox) {
          targetCheckbox.checked = true;
        }

        // Apply filters
        this.applyFiltersFromCheckboxes();

        // Open the filter panel to show what was selected
        this.openFilterPanel();
      }
    }) as EventListener);
  }

  /**
   * Setup filter panel toggle handlers
   */
  private setupFilterPanelHandlers(): void {
    const filterControlPanel = document.getElementById('filter-control-panel');
    const closeButton = document.getElementById('close-filter-panel');

    if (!filterControlPanel) return;

    // Close button handler
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.closeFilterPanel();
      });
    }

    // Click outside to close
    document.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const toggleButton = document.getElementById('toggle-filter-panel');

      // Don't close if clicking the toggle button (let toggleFilterPanel handle it)
      if (toggleButton && toggleButton.contains(target)) {
        return;
      }

      // Close if clicking outside the panel and it's open
      if (this.isFilterPanelOpen &&
          !filterControlPanel.contains(target) &&
          !target.closest('#filter-control-panel')) {
        this.closeFilterPanel();
      }
    });

    // Listen for toggle event from header button
    window.addEventListener('toggle-filter-panel', (() => {
      this.toggleFilterPanel();
    }) as EventListener);
  }

  /**
   * Toggle filter panel open/closed
   */
  toggleFilterPanel(): void {
    if (this.isFilterPanelOpen) {
      this.closeFilterPanel();
    } else {
      this.openFilterPanel();
    }
  }

  /**
   * Open filter panel
   */
  private openFilterPanel(): void {
    const filterControlPanel = document.getElementById('filter-control-panel');
    if (filterControlPanel) {
      filterControlPanel.classList.add('open');
      this.isFilterPanelOpen = true;
    }
  }

  /**
   * Close filter panel
   */
  private closeFilterPanel(): void {
    const filterControlPanel = document.getElementById('filter-control-panel');
    if (filterControlPanel) {
      filterControlPanel.classList.remove('open');
      this.isFilterPanelOpen = false;
    }
  }

  /**
   * Render filter panel with Timeline-style checkboxes
   */
  private renderFilterPanel(analysisData: AnalysisData): void {
    // Extract unique categories
    const categories = analysisData.categories || [];
    const categoryList = document.getElementById('categories-list');
    const categoriesCount = document.getElementById('categories-count');

    if (categoryList && categoriesCount) {
      categoriesCount.textContent = String(categories.length);
      categories.forEach(cat => {
        const item = document.createElement('div');
        item.className = 'code-structure-filter-item';
        item.innerHTML = `
          <input type="checkbox" id="cat-${cat.categoryId}" value="${cat.categoryId}" checked>
          <label for="cat-${cat.categoryId}">${cat.categoryName}</label>
        `;
        categoryList.appendChild(item);
      });
    }

    // Extract unique severities
    const severities = new Set<string>();
    categories.forEach(cat => {
      (cat.issues || []).forEach(issue => {
        if (issue.severity) {
          severities.add(issue.severity);
        }
      });
    });

    const severityList = document.getElementById('severities-list');
    const severitiesCount = document.getElementById('severities-count');

    if (severityList && severitiesCount) {
      const severityOrder = ['critical', 'high', 'medium', 'low'];
      const sortedSeverities = Array.from(severities).sort((a, b) =>
        severityOrder.indexOf(a) - severityOrder.indexOf(b)
      );

      severitiesCount.textContent = String(sortedSeverities.length);
      sortedSeverities.forEach(severity => {
        const item = document.createElement('div');
        item.className = 'code-structure-filter-item';
        item.innerHTML = `
          <input type="checkbox" id="sev-${severity}" value="${severity}" checked>
          <label for="sev-${severity}">${severity.toUpperCase()}</label>
        `;
        severityList.appendChild(item);
      });
    }

    // Extract unique files
    const files = new Set<string>();
    categories.forEach(cat => {
      (cat.issues || []).forEach(issue => {
        if (issue.file) {
          files.add(issue.file);
        }
      });
    });

    const fileList = document.getElementById('files-list');
    const filesCount = document.getElementById('files-count');

    if (fileList && filesCount) {
      const sortedFiles = Array.from(files).sort();
      filesCount.textContent = String(sortedFiles.length);

      // Show first 50 files to avoid overwhelming the UI
      const displayFiles = sortedFiles.slice(0, 50);
      displayFiles.forEach(filePath => {
        const fileName = filePath.split('/').pop() || filePath;
        const item = document.createElement('div');
        item.className = 'code-structure-filter-item';
        item.innerHTML = `
          <input type="checkbox" id="file-${this.escapeHtml(filePath)}" value="${this.escapeHtml(filePath)}" checked>
          <label for="file-${this.escapeHtml(filePath)}" title="${this.escapeHtml(filePath)}">${this.escapeHtml(fileName)}</label>
        `;
        fileList.appendChild(item);
      });

      if (sortedFiles.length > 50) {
        const moreItem = document.createElement('div');
        moreItem.className = 'code-structure-filter-item';
        moreItem.style.fontStyle = 'italic';
        moreItem.style.color = 'var(--vscode-descriptionForeground)';
        moreItem.textContent = `... and ${sortedFiles.length - 50} more files`;
        fileList.appendChild(moreItem);
      }
    }

    // Setup filter action handlers
    const clearButton = document.getElementById('clear-filters');
    const applyButton = document.getElementById('apply-filters');

    if (clearButton) {
      clearButton.addEventListener('click', () => {
        this.clearAllFilters();
      });
    }

    if (applyButton) {
      applyButton.addEventListener('click', () => {
        this.applyFiltersFromCheckboxes();
      });
    }

    // Apply filters on checkbox change (live filtering)
    document.querySelectorAll('.code-structure-filter-item input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.applyFiltersFromCheckboxes();
      });
    });
  }

  /**
   * Clear all filters
   */
  private clearAllFilters(): void {
    document.querySelectorAll('.code-structure-filter-item input[type="checkbox"]').forEach(checkbox => {
      (checkbox as HTMLInputElement).checked = true;
    });
    this.applyFiltersFromCheckboxes();
  }

  /**
   * Apply filters from checkbox selections
   */
  private applyFiltersFromCheckboxes(): void {
    const criteria: FilterCriteria = {};

    // Get selected categories
    const selectedCategories: string[] = [];
    document.querySelectorAll('.code-structure-filter-item input[type="checkbox"][id^="cat-"]:checked').forEach(cb => {
      selectedCategories.push((cb as HTMLInputElement).value);
    });
    if (selectedCategories.length > 0 && selectedCategories.length < (this.analysisData?.categories?.length || 0)) {
      criteria.categories = selectedCategories;
    }

    // Get selected severities
    const selectedSeverities: string[] = [];
    document.querySelectorAll('.code-structure-filter-item input[type="checkbox"][id^="sev-"]:checked').forEach(cb => {
      selectedSeverities.push((cb as HTMLInputElement).value);
    });
    if (selectedSeverities.length > 0 && selectedSeverities.length < 4) {
      criteria.severities = selectedSeverities;
    }

    // Get selected files (file-level filtering not yet implemented in FilterCriteria)
    // TODO: Add file-level filtering support to FilterCriteria type
    // const selectedFiles: string[] = [];
    // document.querySelectorAll('.code-structure-filter-item input[type="checkbox"][id^="file-"]:checked').forEach(cb => {
    //   selectedFiles.push((cb as HTMLInputElement).value);
    // });

    this.handleFilterChange(criteria);
  }

  /**
   * Render AI suggestions
   */
  private renderSuggestions(analysisData: AnalysisData): void {
    const suggestionsContainer = document.getElementById('suggestions-container');
    if (!suggestionsContainer) return;

    this.suggestionPanel = new SuggestionPanel(suggestionsContainer, {
      maxSuggestions: 5,
      defaultCollapsed: true,
      onNavigateToFile: (filePath: string) => {
        window.dispatchEvent(new CustomEvent('open-file-requested', {
          detail: { filePath }
        }));
      }
    });

    // Render with no category filter (shows all suggestions initially)
    this.suggestionPanel.render(analysisData);
  }

  /**
   * Render visualization tabs
   */
  private renderVisualizationTabs(): void {
    const vizTabContainer = document.getElementById('viz-tab-container');
    if (!vizTabContainer) return;

    // All visualizations in one unified tab set
    const tabs: VizTab[] = [
      {
        id: 'gauge',
        label: 'Quality Score',
        icon: '🎯',
        containerId: 'viz-gauge'
      },
      {
        id: 'bubble',
        label: 'Category Overview',
        icon: '⚫',
        containerId: 'viz-bubble'
      },
      {
        id: 'radar',
        label: 'Category Comparison',
        icon: '📡',
        containerId: 'viz-radar'
      },
      {
        id: 'sankey',
        label: 'Issue Flow',
        icon: '🌊',
        containerId: 'viz-sankey'
      },
      {
        id: 'stacked-bar',
        label: 'Severity Distribution',
        icon: '📈',
        containerId: 'viz-stacked-bar'
      },
      {
        id: 'heatmap',
        label: 'Issue Density',
        icon: '🗺️',
        containerId: 'viz-heatmap'
      },
      {
        id: 'timeline',
        label: 'Trend Analysis',
        icon: '📈',
        containerId: 'viz-timeline'
      },
      // NEW: Phase 1 - Working with current data
      {
        id: 'treemap',
        label: 'Category Sizes',
        icon: '🟦',
        containerId: 'viz-treemap'
      },
      {
        id: 'dependencies',
        label: 'Dependencies',
        icon: '🔗',
        containerId: 'viz-dependencies'
      },
      {
        id: 'matrix',
        label: 'Dependency Matrix',
        icon: '⬛',
        containerId: 'viz-matrix'
      },
      {
        id: 'parallel',
        label: 'Multi-Metric',
        icon: '📊',
        containerId: 'viz-parallel'
      },
      {
        id: 'test-network',
        label: 'Test Coverage',
        icon: '🧪',
        containerId: 'viz-test-network'
      },
      {
        id: 'calendar',
        label: 'Activity Calendar',
        icon: '📅',
        containerId: 'viz-calendar'
      }
    ];

    this.tabManager = new VisualizationTabManager(vizTabContainer, {
      tabs,
      defaultTab: 'gauge',
      onTabChange: (tabId) => {
        this.handleTabChange(tabId);
      }
    });

    this.tabManager.render();
  }

  /**
   * Handle filter change - central method that updates everything
   */
  private async handleFilterChange(criteria: FilterCriteria): Promise<void> {
    if (!this.analysisData) return;

    this.currentFilter = criteria;

    // Get data mapper and filter the data
    const dataMapper = this.coordinator.getDataMapper();
    const filteredData = dataMapper.filterAnalysisData(this.analysisData, criteria);

    // Update all components with filtered data
    this.updateStats(filteredData, criteria);
    this.populateIssueList(filteredData);

    // Update AI suggestions with filter
    if (this.suggestionPanel) {
      this.suggestionPanel.setFilter(criteria);
    }

    // Re-render active visualization with filtered data
    if (this.tabManager) {
      const activeTabId = this.tabManager.getActiveTab();
      await this.renderVisualization(activeTabId, filteredData, criteria);
    }
  }

  /**
   * Handle visualization tab change
   */
  private async handleTabChange(tabId: string): Promise<void> {
    if (!this.analysisData) return;

    // Get filtered data
    const dataMapper = this.coordinator.getDataMapper();
    const filteredData = dataMapper.filterAnalysisData(this.analysisData, this.currentFilter);

    // Render the selected visualization
    await this.renderVisualization(tabId, filteredData, this.currentFilter);
  }

  /**
   * Render a specific visualization (adaptive based on filter context)
   */
  private async renderVisualization(
    tabId: string,
    filteredData: AnalysisData,
    filterCriteria: FilterCriteria
  ): Promise<void> {
    const container = this.tabManager?.getTabContainer(tabId);
    if (!container) return;

    // Check if already rendered (lazy rendering)
    if (container.children.length > 0) {
      return;
    }

    try {
      const dataMapper = this.coordinator.getDataMapper();
      const vizManager = this.coordinator.getVisualizationManager();

      // Determine if we're in single-category context
      const isSingleCategory = this.isSingleCategorySelected(filterCriteria);
      const selectedCategoryId = this.getSelectedCategoryId(filterCriteria, filteredData);

      // Render visualization with adaptive logic
      switch (tabId) {
        case 'gauge':
          // Adaptive: overall score or single category score
          const gaugeData = isSingleCategory && selectedCategoryId
            ? dataMapper.toGaugeChart(filteredData, 'quality')  // Could enhance this
            : dataMapper.toGaugeChart(filteredData);
          await vizManager.createVisualization(container.id, 'gauge', gaugeData);
          break;

        case 'bubble':
          // Always show available categories (filtered)
          const bubbleData = dataMapper.toBubbleChart(filteredData);
          await vizManager.createVisualization(container.id, 'bubble', bubbleData);
          break;

        case 'radar':
          // Show filtered categories
          const radarData = dataMapper.toRadarChart(filteredData);
          await vizManager.createVisualization(container.id, 'radar', radarData);
          break;

        case 'sankey':
          // Adaptive: Category→Severity (multiple) or File→Severity (single)
          const sankeyData = isSingleCategory && selectedCategoryId
            ? dataMapper.toSankeyDiagram(filteredData, selectedCategoryId)
            : dataMapper.toOverviewSankey(filteredData);
          await vizManager.createVisualization(container.id, 'sankey', sankeyData);
          break;

        case 'stacked-bar':
          // Show issues by file for filtered data
          const stackedBarData = isSingleCategory && selectedCategoryId
            ? dataMapper.toStackedBarChart(filteredData, selectedCategoryId)
            : dataMapper.toStackedBarChart(filteredData);
          await vizManager.createVisualization(container.id, 'stacked-bar', stackedBarData);
          break;

        case 'heatmap':
          // Show issue density for filtered data
          const heatmapData = isSingleCategory && selectedCategoryId
            ? dataMapper.toHeatmap(filteredData, selectedCategoryId)
            : dataMapper.toHeatmap(filteredData);
          await vizManager.createVisualization(container.id, 'heatmap', heatmapData);
          break;

        case 'timeline':
          // Show trend over time for filtered data
          const timelineData = isSingleCategory && selectedCategoryId
            ? dataMapper.toTimelineVisualization(filteredData, selectedCategoryId)
            : dataMapper.toTimelineVisualization(filteredData);
          await vizManager.createVisualization(container.id, 'timeline', timelineData);
          break;

        // NEW: Phase 1 visualizations
        case 'treemap':
          // Show category sizes as nested rectangles
          const treemapData = dataMapper.toTreemap(filteredData);
          await vizManager.createVisualization(container.id, 'treemap', treemapData);
          break;

        case 'dependencies':
          // Show code dependencies as force-directed graph
          const depData = dataMapper.toDependencyGraph(filteredData);
          await vizManager.createVisualization(container.id, 'dependency-graph', depData);
          break;

        case 'matrix':
          // Show dependency matrix (compact view of all dependencies)
          const matrixData = dataMapper.toMatrixView(filteredData);
          await vizManager.createVisualization(container.id, 'matrix-view', matrixData);
          break;

        case 'parallel':
          // Show multi-dimensional comparison
          const parallelData = dataMapper.toParallelCoordinates(filteredData);
          await vizManager.createVisualization(container.id, 'parallel-coordinates', parallelData);
          break;

        case 'test-network':
          // Show test coverage network (tests → source files)
          const testNetworkData = dataMapper.toTestCoverageNetwork(filteredData);
          await vizManager.createVisualization(container.id, 'test-coverage-network', testNetworkData);
          break;

        case 'calendar':
          // Show daily activity patterns
          const calendarData = dataMapper.toCalendarHeatmap(filteredData);
          await vizManager.createVisualization(container.id, 'calendar-heatmap', calendarData);
          break;
      }
    } catch (error) {
      console.error(`Error rendering ${tabId} visualization:`, error);
    }
  }

  /**
   * Update stats summary
   */
  private updateStats(filteredData: AnalysisData, filterCriteria: FilterCriteria): void {
    const statsContainer = document.getElementById('panel-stats');
    if (!statsContainer) return;

    const summary = filteredData.summary || {};
    const totalIssues = summary.totalIssues || 0;
    const criticalIssues = summary.criticalIssues || 0;
    const highIssues = summary.highIssues || 0;
    const overallScore = summary.overallScore || 0;

    // Show context label if filtering
    const contextLabel = this.getContextLabel(filterCriteria, filteredData);

    statsContainer.innerHTML = `
      ${contextLabel ? `<div class="stats-context">${contextLabel}</div>` : ''}
      <div class="stat-item">
        <span class="stat-label">Total Issues</span>
        <span class="stat-value">${totalIssues}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Critical</span>
        <span class="stat-value stat-critical">${criticalIssues}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">High</span>
        <span class="stat-value stat-high">${highIssues}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Score</span>
        <span class="stat-value stat-score ${this.getScoreClass(overallScore)}">${overallScore}/100</span>
      </div>
    `;
  }

  /**
   * Populate issue list table
   */
  private populateIssueList(filteredData: AnalysisData): void {
    const issueListContainer = document.getElementById('issue-list-container');
    const issueCountBadge = document.getElementById('issue-count-badge');
    if (!issueListContainer) return;

    // Collect all issues from filtered categories
    const allIssues: Array<{
      issue: any;
      categoryName: string;
      categoryId: string;
    }> = [];

    (filteredData.categories || []).forEach(category => {
      (category.issues || []).forEach(issue => {
        allIssues.push({
          issue,
          categoryName: category.categoryName,
          categoryId: category.categoryId
        });
      });
    });

    // Update badge count
    if (issueCountBadge) {
      issueCountBadge.textContent = String(allIssues.length);
    }

    if (allIssues.length === 0) {
      issueListContainer.innerHTML = `
        <div class="no-issues">
          <div class="no-issues-icon">✅</div>
          <p>No issues found with current filters</p>
        </div>
      `;
      return;
    }

    // Render as table (ENHANCED: with truncation, modal, and actions column)
    let html = '<div class="issue-table-wrapper">';
    html += '<table class="issue-table">';
    html += `
      <thead>
        <tr>
          <th class="col-severity">Severity</th>
          <th class="col-category">Category</th>
          <th class="col-file">File</th>
          <th class="col-location">Loc</th>
          <th class="col-message">Issue</th>
          <th class="col-actions">Actions</th>
        </tr>
      </thead>
      <tbody>
    `;

    allIssues.forEach(({ issue, categoryName, categoryId }, index) => {
      const severity = issue.severity || 'medium';
      const file = issue.file || issue.filePath || 'N/A';
      const fileName = file.split('/').pop() || file;
      const location = issue.line
        ? `${issue.line}${issue.column ? `:${issue.column}` : ''}`
        : '-';
      const message = issue.message || issue.description || issue.title || 'Issue detected';

      // Truncate long messages for table display
      const truncatedMessage = message.length > 80
        ? message.substring(0, 77) + '...'
        : message;

      html += `
        <tr class="issue-row severity-${severity}" data-issue-index="${index}">
          <td class="col-severity">
            <span class="severity-badge severity-${severity}">${severity.toUpperCase()}</span>
          </td>
          <td class="col-category">
            <span class="category-link" data-category-id="${this.escapeHtml(categoryId)}">
              ${this.escapeHtml(categoryName)}
            </span>
          </td>
          <td class="col-file" title="${this.escapeHtml(file)}">
            <span class="file-name">${this.escapeHtml(fileName)}</span>
          </td>
          <td class="col-location">${this.escapeHtml(location)}</td>
          <td class="col-message">
            <span class="message-text">${this.escapeHtml(truncatedMessage)}</span>
          </td>
          <td class="col-actions">
            <button class="btn-icon btn-details" data-issue-index="${index}" title="View Details">
              🔍
            </button>
          </td>
        </tr>
      `;
    });

    html += '</tbody></table></div>';
    issueListContainer.innerHTML = html;

    // Add modal click handlers for detail buttons
    console.log('[CodeStructurePanel] Attaching detail button handlers, count:', issueListContainer.querySelectorAll('.btn-details').length);
    issueListContainer.querySelectorAll('.btn-details').forEach((btn, btnIndex) => {
      btn.addEventListener('click', (e) => {
        console.log('[CodeStructurePanel] Detail button clicked, index:', btnIndex);
        const index = parseInt((e.target as HTMLElement).dataset.issueIndex || '0');
        console.log('[CodeStructurePanel] Issue index:', index, 'allIssues length:', allIssues.length);
        const { issue, categoryName } = allIssues[index];
        console.log('[CodeStructurePanel] Calling issueModal.show', { issue, categoryName });
        this.issueModal.show(issue as IssueDetail, categoryName);
      });
    });

    // Add click handlers for category links (filter to that category)
    issueListContainer.querySelectorAll('.category-link').forEach(link => {
      link.addEventListener('click', (e) => {
        const categoryId = (e.target as HTMLElement).dataset.categoryId;
        if (categoryId) {
          // Update checkboxes to show only this category
          document.querySelectorAll('.code-structure-filter-item input[type="checkbox"][id^="cat-"]').forEach(cb => {
            (cb as HTMLInputElement).checked = false;
          });
          const targetCheckbox = document.getElementById(`cat-${categoryId}`) as HTMLInputElement;
          if (targetCheckbox) {
            targetCheckbox.checked = true;
          }
          // Apply the filter
          this.applyFiltersFromCheckboxes();
        }
      });
    });
  }

  /**
   * Check if single category is selected
   */
  private isSingleCategorySelected(filterCriteria: FilterCriteria): boolean {
    return !!(filterCriteria.categories && filterCriteria.categories.length === 1);
  }

  /**
   * Get selected category ID if single category selected
   */
  private getSelectedCategoryId(
    filterCriteria: FilterCriteria,
    filteredData: AnalysisData
  ): string | null {
    if (filterCriteria.categories && filterCriteria.categories.length === 1) {
      return filterCriteria.categories[0];
    }
    return null;
  }

  /**
   * Get context label for stats
   */
  private getContextLabel(filterCriteria: FilterCriteria, filteredData: AnalysisData): string {
    const parts: string[] = [];

    if (filterCriteria.categories && filterCriteria.categories.length > 0) {
      if (filterCriteria.categories.length === 1) {
        const category = filteredData.categories?.find(c => c.categoryId === filterCriteria.categories![0]);
        if (category) {
          parts.push(`Category: ${category.categoryName}`);
        }
      } else {
        parts.push(`${filterCriteria.categories.length} categories selected`);
      }
    }

    if (filterCriteria.severities && filterCriteria.severities.length > 0) {
      parts.push(`Severities: ${filterCriteria.severities.join(', ')}`);
    }

    if (filterCriteria.searchQuery) {
      parts.push(`Search: "${filterCriteria.searchQuery}"`);
    }

    return parts.length > 0 ? `📌 ${parts.join(' • ')}` : '';
  }

  /**
   * Get CSS class for score
   */
  private getScoreClass(score: number): string {
    if (score >= 90) return 'score-excellent';
    if (score >= 70) return 'score-good';
    if (score >= 50) return 'score-warning';
    return 'score-critical';
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
   * Clear panel
   */
  clear(): void {
    if (this.suggestionPanel) {
      this.suggestionPanel.dispose();
      this.suggestionPanel = null;
    }
    if (this.tabManager) {
      this.tabManager.dispose();
      this.tabManager = null;
    }
    this.container.innerHTML = '';
  }

  /**
   * Dispose of panel
   */
  dispose(): void {
    this.clear();
  }
}
