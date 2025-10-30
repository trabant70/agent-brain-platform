/**
 * Overview Panel
 * Displays overview-level visualizations for Code Structure Review
 *
 * Layout:
 * - Tabbed visualizations: Gauge, Bubble, Radar, Sankey, Stacked Bar, Sunburst
 * - Lazy rendering: Only active tab visualization is rendered
 * - Collapsible filters and AI suggestions
 */

import { VisualizationCoordinator } from '../coordination/VisualizationCoordinator';
import type { AnalysisData } from '../coordination/AnalysisDataMapper';
import { CollapsibleFilterPanel } from './CollapsibleFilterPanel';
import type { FilterCriteria } from './CollapsibleFilterPanel';
import { SuggestionPanel } from '../ai-suggestions/SuggestionPanel';
import { VisualizationTabManager } from './VisualizationTabManager';
import type { VisualizationTab } from './VisualizationTabManager';

/**
 * Overview Panel Controller
 */
export class OverviewPanel {
  private container: HTMLElement;
  private coordinator: VisualizationCoordinator;
  private filterPanel: CollapsibleFilterPanel | null = null;
  private suggestionPanel: SuggestionPanel | null = null;
  private tabManager: VisualizationTabManager | null = null;
  private isRendered: boolean = false;
  private analysisData: AnalysisData | null = null;

  constructor(container: HTMLElement, coordinator: VisualizationCoordinator) {
    this.container = container;
    this.coordinator = coordinator;
  }

  /**
   * Render overview panel
   */
  async render(analysisData: AnalysisData): Promise<void> {
    this.analysisData = analysisData;
    this.clear();

    // Create panel structure
    this.container.innerHTML = `
      <div class="overview-panel">
        <!-- Collapsible Filter Panel -->
        <div id="filter-panel-container"></div>

        <!-- AI Suggestions (collapsed by default) -->
        <div id="suggestions-container"></div>

        <div class="panel-content">
          <!-- Tabbed Visualizations -->
          <div id="viz-tab-container"></div>
        </div>

        <!-- Collapsible Issue List -->
        <div class="panel-section">
          <details class="issue-details" id="overview-issues">
            <summary class="issue-summary">
              <span class="summary-icon">📋</span>
              <span class="summary-label">All Issues</span>
              <span class="summary-count" id="issue-count-badge">0</span>
              <span class="summary-arrow">▼</span>
            </summary>
            <div class="issue-list-container" id="overview-issue-list">
              <!-- Issues will be populated here -->
            </div>
          </details>
        </div>

        <!-- Summary stats -->
        <div class="panel-footer">
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">Total Issues</span>
              <span class="stat-value" id="stat-total-issues">-</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Critical</span>
              <span class="stat-value stat-critical" id="stat-critical">-</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">High</span>
              <span class="stat-value stat-high" id="stat-high">-</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Categories</span>
              <span class="stat-value" id="stat-categories">-</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Files Analyzed</span>
              <span class="stat-value" id="stat-files">-</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Overall Score</span>
              <span class="stat-value stat-score" id="stat-score">-</span>
            </div>
          </div>
        </div>
      </div>
    `;

    // Render visualization tabs
    this.renderVisualizationTabs();

    // Render filter panel
    this.renderFilterPanel(analysisData);

    // Render AI suggestions
    this.renderSuggestions(analysisData);

    // Render visualizations
    await this.renderVisualizations(analysisData);

    // Update stats
    this.updateStats(analysisData);

    // Populate issue list
    this.populateIssueList(analysisData);

    // Setup event listeners
    this.setupEventListeners();

    this.isRendered = true;
  }

  /**
   * Render filter panel
   */
  private renderFilterPanel(analysisData: AnalysisData): void {
    const filterContainer = document.getElementById('filter-panel-container');
    if (!filterContainer) return;

    this.filterPanel = new CollapsibleFilterPanel(filterContainer, {
      showCategoryFilter: true, // Overview shows category filter
      defaultCollapsed: true,
      onFilterChange: (criteria) => {
        this.handleFilterChange(criteria);
      }
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
      maxSuggestions: 3,
      defaultCollapsed: true, // Start collapsed for progressive disclosure
      onNavigateToCategory: (categoryId: string) => {
        const category = analysisData.categories?.find(c => c.categoryId === categoryId);
        if (category) {
          this.coordinator.navigateToCategoryDetail(categoryId, category.categoryName);
        }
      }
    });

    this.suggestionPanel.render(analysisData);
  }

  /**
   * Render visualization tabs
   */
  private renderVisualizationTabs(): void {
    const vizTabContainer = document.getElementById('viz-tab-container');
    if (!vizTabContainer) return;

    // Define visualization tabs
    const tabs: VisualizationTab[] = [
      {
        id: 'gauge',
        label: 'Overall Health',
        icon: '🎯',
        containerId: 'viz-overview-gauge'
      },
      {
        id: 'bubble',
        label: 'Category Overview',
        icon: '⚪',
        containerId: 'viz-overview-bubble'
      },
      {
        id: 'radar',
        label: 'Category Comparison',
        icon: '📊',
        containerId: 'viz-overview-radar'
      },
      {
        id: 'sankey',
        label: 'Issue Flow',
        icon: '🌊',
        containerId: 'viz-overview-sankey'
      },
      {
        id: 'stacked-bar',
        label: 'Severity Distribution',
        icon: '📈',
        containerId: 'viz-overview-stacked-bar'
      },
      {
        id: 'sunburst',
        label: 'File Hierarchy',
        icon: '🌞',
        containerId: 'viz-overview-sunburst'
      }
    ];

    // Create tab manager
    this.tabManager = new VisualizationTabManager(vizTabContainer, {
      tabs,
      defaultTab: 'gauge',
      onTabChange: (tabId) => {
        this.handleTabChange(tabId);
      }
    });

    // Render tabs
    this.tabManager.render();
  }

  /**
   * Handle visualization tab change
   */
  private async handleTabChange(tabId: string): Promise<void> {
    if (!this.analysisData) return;

    // Get the data mapper for any active filters
    const dataMapper = this.coordinator.getDataMapper();
    const filteredData = this.filterPanel
      ? dataMapper.filterAnalysisData(this.analysisData, {})
      : this.analysisData;

    // Lazy render the active tab's visualization
    await this.renderVisualization(tabId, filteredData);
  }

  /**
   * Render a specific visualization
   */
  private async renderVisualization(tabId: string, analysisData: AnalysisData): Promise<void> {
    const container = this.tabManager?.getTabContainer(tabId);
    if (!container) return;

    // Check if already rendered (has children)
    if (container.children.length > 0) {
      return; // Already rendered
    }

    // Ensure coordinator is in overview state
    if (this.coordinator.getContext().state !== 'overview') {
      console.warn('Coordinator not in overview state, navigating...');
      await this.coordinator.navigateToOverview();
      return;
    }

    try {
      // Render the specific visualization based on tab ID
      const vizManager = this.coordinator.getVisualizationManager();
      const vizType = tabId as any; // Map tabId to visualization type

      switch (tabId) {
        case 'gauge':
          await vizManager.createVisualization(container.id, 'gauge', analysisData);
          break;
        case 'bubble':
          await vizManager.createVisualization(container.id, 'bubble', analysisData);
          break;
        case 'radar':
          await vizManager.createVisualization(container.id, 'radar', analysisData);
          break;
        case 'sankey':
          await vizManager.createVisualization(container.id, 'sankey', analysisData);
          break;
        case 'stacked-bar':
          await vizManager.createVisualization(container.id, 'stacked-bar', analysisData);
          break;
        case 'sunburst':
          await vizManager.createVisualization(container.id, 'sunburst', analysisData);
          break;
      }
    } catch (error) {
      console.error(`Error rendering ${tabId} visualization:`, error);
    }
  }

  /**
   * Handle filter change
   */
  private async handleFilterChange(criteria: FilterCriteria): Promise<void> {
    console.log('Filter changed:', criteria);

    if (!this.analysisData) return;

    // Get the data mapper from coordinator
    const dataMapper = this.coordinator.getDataMapper();

    // Apply filters to analysis data
    const filteredData = dataMapper.filterAnalysisData(this.analysisData, criteria);

    // Update AI Suggestions with filter
    if (this.suggestionPanel) {
      this.suggestionPanel.setFilter(criteria);
    }

    // Re-render visualizations with filtered data
    await this.renderVisualizations(filteredData);

    // Update stats with filtered data
    this.updateStats(filteredData);

    // Update issue list with filtered data
    this.populateIssueList(filteredData);
  }

  /**
   * Render overview visualizations (lazy rendering via tabs)
   */
  private async renderVisualizations(analysisData: AnalysisData): Promise<void> {
    if (!this.tabManager) return;

    // Get the active tab and render only that visualization
    const activeTabId = this.tabManager.getActiveTab();
    await this.renderVisualization(activeTabId, analysisData);
  }

  /**
   * Update summary statistics
   */
  private updateStats(analysisData: AnalysisData): void {
    const summary = analysisData.summary || {};

    this.updateStatElement('stat-total-issues', summary.totalIssues || 0);
    this.updateStatElement('stat-critical', summary.criticalIssues || 0);
    this.updateStatElement('stat-high', summary.highIssues || 0);
    this.updateStatElement('stat-categories', analysisData.categories?.length || 0);
    this.updateStatElement('stat-files', analysisData.files?.length || 0);

    const score = summary.overallScore || 0;
    const scoreElement = document.getElementById('stat-score');
    if (scoreElement) {
      scoreElement.textContent = `${score}/100`;
      scoreElement.className = 'stat-value stat-score ' + this.getScoreClass(score);
    }
  }

  /**
   * Update stat element
   */
  private updateStatElement(id: string, value: number | string): void {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = String(value);
    }
  }

  /**
   * Get CSS class for score
   */
  private getScoreClass(score: number): string {
    if (score >= 90) return 'score-excellent';
    if (score >= 70) return 'score-good';
    if (score >= 40) return 'score-warning';
    return 'score-critical';
  }

  /**
   * Populate issue list with all issues from all categories
   */
  private populateIssueList(analysisData: AnalysisData): void {
    const issueListContainer = document.getElementById('overview-issue-list');
    const issueCountBadge = document.getElementById('issue-count-badge');

    if (!issueListContainer) return;

    // Collect all issues from all categories
    const allIssues: Array<{
      issue: any;
      categoryName: string;
      categoryId: string;
    }> = [];

    (analysisData.categories || []).forEach(category => {
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
          <p>No issues found. Great work!</p>
        </div>
      `;
      return;
    }

    // Group issues by category
    const categoryGroups = new Map<string, Array<{ issue: any; categoryName: string; categoryId: string }>>();
    allIssues.forEach(item => {
      if (!categoryGroups.has(item.categoryId)) {
        categoryGroups.set(item.categoryId, []);
      }
      categoryGroups.get(item.categoryId)!.push(item);
    });

    // Render grouped issues as a table
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

    categoryGroups.forEach((items, categoryId) => {
      items.forEach(({ issue, categoryName }) => {
        const severity = issue.severity || 'medium';
        const file = issue.file || issue.filePath || 'N/A';
        const fileName = file.split('/').pop() || file;
        const location = issue.line ? `Line ${issue.line}${issue.column ? `:${issue.column}` : ''}` : '-';

        // Build message from available fields
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
    });

    html += '</tbody></table></div>';
    issueListContainer.innerHTML = html;

    // Add click handlers for category links
    issueListContainer.querySelectorAll('.category-link').forEach(link => {
      link.addEventListener('click', (e) => {
        const categoryId = (e.target as HTMLElement).dataset.categoryId;
        if (categoryId) {
          const category = analysisData.categories?.find(c => c.categoryId === categoryId);
          if (category) {
            this.coordinator.navigateToCategoryDetail(categoryId, category.categoryName);
          }
        }
      });
    });
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
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for bubble click to navigate to category
    window.addEventListener('bubble-click', ((event: CustomEvent) => {
      const { id, name } = event.detail;
      this.handleCategoryClick(id, name);
    }) as EventListener);
  }

  /**
   * Handle category click
   */
  private handleCategoryClick(categoryId: string, categoryName: string): void {
    this.coordinator.navigateToCategoryDetail(categoryId, categoryName);
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'panel-error';
    errorDiv.innerHTML = `
      <div class="error-icon">⚠️</div>
      <div class="error-message">${message}</div>
    `;
    this.container.appendChild(errorDiv);
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
      this.tabManager.dispose();
      this.tabManager = null;
    }
    this.container.innerHTML = '';
    this.isRendered = false;
  }

  /**
   * Check if rendered
   */
  isActive(): boolean {
    return this.isRendered;
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.clear();
  }
}
