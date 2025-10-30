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
import { CollapsibleFilterPanel } from './CollapsibleFilterPanel';
import type { FilterCriteria } from './CollapsibleFilterPanel';
import { SuggestionPanel } from '../ai-suggestions/SuggestionPanel';
import { VisualizationTabManager } from './VisualizationTabManager';
import type { VisualizationTab as VizTab } from './VisualizationTabManager';

/**
 * Unified Code Structure Panel
 */
export class CodeStructurePanel {
  private container: HTMLElement;
  private coordinator: VisualizationCoordinator;
  private filterPanel: CollapsibleFilterPanel | null = null;
  private suggestionPanel: SuggestionPanel | null = null;
  private tabManager: VisualizationTabManager | null = null;
  private analysisData: AnalysisData | null = null;
  private currentFilter: FilterCriteria = {};

  constructor(container: HTMLElement, coordinator: VisualizationCoordinator) {
    this.container = container;
    this.coordinator = coordinator;
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
        <!-- Collapsible Filter Panel (directly under header) -->
        <div id="filter-panel-container" class="compact-filter"></div>

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
      if (categoryId && this.filterPanel) {
        // Filter to show only the clicked category
        this.filterPanel.setCategories([categoryId]);
      }
    }) as EventListener);
  }

  /**
   * Render filter panel
   */
  private renderFilterPanel(analysisData: AnalysisData): void {
    const filterContainer = document.getElementById('filter-panel-container');
    if (!filterContainer) return;

    this.filterPanel = new CollapsibleFilterPanel(filterContainer, {
      showCategoryFilter: true,  // Always show category filter
      defaultCollapsed: true,     // Collapsed by default
      onFilterChange: (criteria) => this.handleFilterChange(criteria)
    });

    this.filterPanel.render(analysisData);
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
        id: 'sunburst',
        label: 'File Hierarchy',
        icon: '🌞',
        containerId: 'viz-sunburst'
      },
      {
        id: 'timeline',
        label: 'Trend Analysis',
        icon: '📈',
        containerId: 'viz-timeline'
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

        case 'sunburst':
          // Show file hierarchy with filtered issues
          const sunburstData = dataMapper.toSunburstDiagram(filteredData);
          await vizManager.createVisualization(container.id, 'sunburst', sunburstData);
          break;

        case 'timeline':
          // Show trend over time for filtered data
          const timelineData = isSingleCategory && selectedCategoryId
            ? dataMapper.toTimelineVisualization(filteredData, selectedCategoryId)
            : dataMapper.toTimelineVisualization(filteredData);
          await vizManager.createVisualization(container.id, 'timeline', timelineData);
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

    // Render as table
    let html = '<div class="issue-table-wrapper">';
    html += '<table class="issue-table">';
    html += `
      <thead>
        <tr>
          <th class="col-severity">Severity</th>
          <th class="col-category">Category</th>
          <th class="col-file">File</th>
          <th class="col-location">Location</th>
          <th class="col-message">Issue</th>
        </tr>
      </thead>
      <tbody>
    `;

    allIssues.forEach(({ issue, categoryName, categoryId }) => {
      const severity = issue.severity || 'medium';
      const file = issue.file || issue.filePath || 'N/A';
      const fileName = file.split('/').pop() || file;
      const location = issue.line ? `Line ${issue.line}${issue.column ? `:${issue.column}` : ''}` : '-';
      const message = issue.message || issue.description || issue.title || 'Issue detected';
      const suggestion = issue.suggestion || issue.recommendation;

      html += `
        <tr class="issue-row severity-${severity}" data-category="${this.escapeHtml(categoryId)}">
          <td class="col-severity">
            <span class="severity-badge severity-${severity}">${severity.toUpperCase()}</span>
          </td>
          <td class="col-category">
            <span class="category-link" data-category-id="${this.escapeHtml(categoryId)}">${this.escapeHtml(categoryName)}</span>
          </td>
          <td class="col-file" title="${this.escapeHtml(file)}">
            ${this.escapeHtml(fileName)}
          </td>
          <td class="col-location">${this.escapeHtml(location)}</td>
          <td class="col-message">
            <div class="issue-message">${this.escapeHtml(message)}</div>
            ${suggestion ? `
              <div class="issue-suggestion">
                <span class="suggestion-icon">💡</span>
                ${this.escapeHtml(suggestion)}
              </div>
            ` : ''}
          </td>
        </tr>
      `;
    });

    html += '</tbody></table></div>';
    issueListContainer.innerHTML = html;

    // Add click handlers for category links (filter to that category)
    issueListContainer.querySelectorAll('.category-link').forEach(link => {
      link.addEventListener('click', (e) => {
        const categoryId = (e.target as HTMLElement).dataset.categoryId;
        if (categoryId && this.filterPanel) {
          // Update filter to show only this category
          this.filterPanel.setCategories([categoryId]);
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
    if (this.filterPanel) {
      this.filterPanel.dispose();
      this.filterPanel = null;
    }
    if (this.suggestionPanel) {
      this.suggestionPanel.dispose();
      this.suggestionPanel = null;
    }
    if (this.tabManager) {
      this.tabManager.destroy();
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
