/**
 * Category Detail Panel
 * Displays category-specific visualizations for Code Structure Review
 *
 * Layout:
 * - Tabbed visualizations: Heatmap, Sankey, Timeline, Stacked Bar
 * - Lazy rendering: Only active tab visualization is rendered
 * - Collapsible filters and AI suggestions (category-specific)
 */

import { VisualizationCoordinator } from '../coordination/VisualizationCoordinator';
import type { AnalysisData } from '../coordination/AnalysisDataMapper';
import { CollapsibleFilterPanel } from './CollapsibleFilterPanel';
import type { FilterCriteria } from './CollapsibleFilterPanel';
import { SuggestionPanel } from '../ai-suggestions/SuggestionPanel';
import { VisualizationTabManager } from './VisualizationTabManager';
import type { VisualizationTab as VizTab } from './VisualizationTabManager';

/**
 * Category Detail Panel Controller
 */
export class CategoryDetailPanel {
  private container: HTMLElement;
  private coordinator: VisualizationCoordinator;
  private filterPanel: CollapsibleFilterPanel | null = null;
  private suggestionPanel: SuggestionPanel | null = null;
  private tabManager: VisualizationTabManager | null = null;
  private categoryId: string | null = null;
  private categoryName: string | null = null;
  private isRendered: boolean = false;
  private analysisData: AnalysisData | null = null;

  constructor(container: HTMLElement, coordinator: VisualizationCoordinator) {
    this.container = container;
    this.coordinator = coordinator;
  }

  /**
   * Render category detail panel
   */
  async render(analysisData: AnalysisData, categoryId: string, categoryName: string): Promise<void> {
    this.analysisData = analysisData;
    this.categoryId = categoryId;
    this.categoryName = categoryName;
    this.clear();

    // Find category data
    const category = analysisData.categories?.find(c => c.categoryId === categoryId);
    if (!category) {
      this.showError(`Category "${categoryName}" not found`);
      return;
    }

    // Create panel structure
    this.container.innerHTML = `
      <div class="category-detail-panel">
        <div class="panel-header">
          <div class="panel-title-group">
            <h2 class="panel-title">${this.escapeHtml(categoryName)}</h2>
            <span class="category-badge category-badge-${category.status || 'warning'}">
              ${this.getStatusLabel(category.status)}
            </span>
          </div>
          <div class="panel-actions">
            <button class="btn-back" title="Back to overview">
              <span class="icon">←</span> Overview
            </button>
          </div>
        </div>

        <!-- Collapsible Filter Panel -->
        <div id="filter-panel-container"></div>

        <!-- AI Suggestions (category-specific) -->
        <div id="suggestions-container"></div>

        <div class="panel-stats">
          <div class="stat-item">
            <span class="stat-label">Total Issues</span>
            <span class="stat-value">${category.issues?.length || 0}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Critical</span>
            <span class="stat-value stat-critical">
              ${category.issues?.filter(i => i.severity === 'critical').length || 0}
            </span>
          </div>
          <div class="stat-item">
            <span class="stat-label">High</span>
            <span class="stat-value stat-high">
              ${category.issues?.filter(i => i.severity === 'high').length || 0}
            </span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Score</span>
            <span class="stat-value stat-score ${this.getScoreClass(category.score || 0)}">
              ${category.score || 0}/100
            </span>
          </div>
        </div>

        <div class="panel-content">
          <!-- Tabbed Visualizations -->
          <div id="viz-tab-container"></div>
        </div>

        <!-- Issue list -->
        <div class="panel-footer">
          <details class="issue-details">
            <summary>
              <span class="summary-label">View Issues (${category.issues?.length || 0})</span>
              <span class="summary-icon">▼</span>
            </summary>
            <div class="issue-list" id="issue-list">
              <!-- Issues will be populated here -->
            </div>
          </details>
        </div>
      </div>
    `;

    // Render search filter
    this.renderFilterPanel(analysisData);

    // Render AI suggestions (category-specific)
    this.renderSuggestions(analysisData, categoryId);

    // Render visualization tabs
    this.renderVisualizationTabs();

    // Populate issue list
    this.populateIssueList(category.issues || []);

    // Setup event listeners
    this.setupEventListeners();

    this.isRendered = true;

    // Render visualizations after DOM is ready
    // Use requestAnimationFrame to ensure the DOM has been painted
    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
    await this.renderVisualizations(analysisData);
  }

  /**
   * Render filter panel
   */
  private renderFilterPanel(analysisData: AnalysisData): void {
    const filterContainer = document.getElementById('filter-panel-container');
    if (!filterContainer) return;

    this.filterPanel = new CollapsibleFilterPanel(filterContainer, {
      showCategoryFilter: false, // Category tabs don't need category filter
      defaultCollapsed: true,
      onFilterChange: (criteria) => {
        this.handleFilterChange(criteria);
      }
    });

    this.filterPanel.render(analysisData);
  }

  /**
   * Render AI suggestions for this category
   */
  private renderSuggestions(analysisData: AnalysisData, categoryId: string): void {
    const suggestionsContainer = document.getElementById('suggestions-container');
    if (!suggestionsContainer) return;

    this.suggestionPanel = new SuggestionPanel(suggestionsContainer, {
      maxSuggestions: 5,
      defaultCollapsed: true,
      onNavigateToFile: (filePath: string) => {
        // Send message to extension to open file
        window.dispatchEvent(new CustomEvent('open-file-requested', {
          detail: { filePath }
        }));
      }
    });

    // Render with category ID so suggestions are filtered to this category
    this.suggestionPanel.render(analysisData, categoryId);
  }

  /**
   * Render visualization tabs
   */
  private renderVisualizationTabs(): void {
    const vizTabContainer = document.getElementById('viz-tab-container');
    if (!vizTabContainer) return;

    // Define visualization tabs for category detail
    const tabs: VizTab[] = [
      {
        id: 'heatmap',
        label: 'Issue Distribution',
        icon: '🗺️',
        containerId: 'viz-category-heatmap'
      },
      {
        id: 'sankey',
        label: 'Issue Flow',
        icon: '🌊',
        containerId: 'viz-category-sankey'
      },
      {
        id: 'timeline',
        label: 'Trend Analysis',
        icon: '📈',
        containerId: 'viz-category-timeline'
      },
      {
        id: 'stacked-bar',
        label: 'Severity Breakdown',
        icon: '📊',
        containerId: 'viz-category-stacked-bar'
      }
    ];

    // Create tab manager
    this.tabManager = new VisualizationTabManager(vizTabContainer, {
      tabs,
      defaultTab: 'heatmap',
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
    if (!this.analysisData || !this.categoryId) return;

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
    if (!container || !this.categoryId) return;

    // Check if already rendered (has children)
    if (container.children.length > 0) {
      return; // Already rendered
    }

    // Ensure coordinator is in category-detail state
    if (this.coordinator.getContext().state !== 'category-detail') {
      console.warn('Coordinator not in category-detail state, navigating...');
      await this.coordinator.navigateToCategoryDetail(this.categoryId, this.categoryName || '');
      return;
    }

    try {
      // Render the specific visualization based on tab ID
      const vizManager = this.coordinator.getVisualizationManager();

      switch (tabId) {
        case 'heatmap':
          await vizManager.createVisualization(container.id, 'heatmap', analysisData);
          break;
        case 'sankey':
          await vizManager.createVisualization(container.id, 'sankey', analysisData);
          break;
        case 'timeline':
          await vizManager.createVisualization(container.id, 'timeline', analysisData);
          break;
        case 'stacked-bar':
          await vizManager.createVisualization(container.id, 'stacked-bar', analysisData);
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
    console.log('Category filter changed:', criteria);

    if (!this.analysisData || !this.categoryId || !this.categoryName) return;

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

    // Find the category in filtered data
    const category = filteredData.categories?.find(c => c.categoryId === this.categoryId);
    if (category) {
      // Update issue list with filtered issues
      this.populateIssueList(category.issues || []);
    }
  }

  /**
   * Render category visualizations (lazy rendering via tabs)
   */
  private async renderVisualizations(analysisData: AnalysisData): Promise<void> {
    if (!this.tabManager) return;

    // Get the active tab and render only that visualization
    const activeTabId = this.tabManager.getActiveTab();
    await this.renderVisualization(activeTabId, analysisData);
  }

  /**
   * Populate issue list
   */
  private populateIssueList(issues: any[]): void {
    const issueList = document.getElementById('issue-list');
    if (!issueList) return;

    if (issues.length === 0) {
      issueList.innerHTML = '<p class="no-issues">No issues found in this category</p>';
      return;
    }

    // Group issues by file
    const fileGroups = new Map<string, any[]>();
    issues.forEach(issue => {
      const file = issue.file || 'No file specified';
      if (!fileGroups.has(file)) {
        fileGroups.set(file, []);
      }
      fileGroups.get(file)!.push(issue);
    });

    // Render grouped issues
    let html = '';
    fileGroups.forEach((fileIssues, fileName) => {
      html += `
        <div class="file-group">
          <div class="file-header">
            <span class="file-name">${this.escapeHtml(fileName)}</span>
            <span class="file-count">${fileIssues.length} issue${fileIssues.length !== 1 ? 's' : ''}</span>
          </div>
          <div class="file-issues">
            ${fileIssues.map(issue => {
              // Build a meaningful description from available fields
              const parts: string[] = [];

              if (issue.message) {
                parts.push(issue.message);
              }

              if (issue.category && issue.category !== this.categoryName) {
                parts.push(`Category: ${issue.category}`);
              }

              if (issue.impact) {
                parts.push(`Impact: ${issue.impact}`);
              }

              if (issue.rule) {
                parts.push(`Rule: ${issue.rule}`);
              }

              const description = parts.length > 0
                ? parts.join(' • ')
                : 'Issue detected - details pending analysis';

              return `
                <div class="issue-item severity-${issue.severity || 'medium'}">
                  <div class="issue-header">
                    <span class="issue-severity">${(issue.severity || 'medium').toUpperCase()}</span>
                    ${issue.line ? `<span class="issue-line">Line ${issue.line}</span>` : ''}
                    ${issue.column ? `<span class="issue-column">:${issue.column}</span>` : ''}
                  </div>
                  <div class="issue-message">${this.escapeHtml(description)}</div>
                  ${issue.suggestion ? `
                    <div class="issue-suggestion">
                      💡 ${this.escapeHtml(issue.suggestion)}
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    });

    issueList.innerHTML = html;
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Back button
    const backBtn = this.container.querySelector('.btn-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.coordinator.navigateToOverview();
      });
    }

    // Listen for heatmap cell clicks to navigate to file
    window.addEventListener('heatmap-cell-click', ((event: CustomEvent) => {
      const { metadata } = event.detail;
      if (metadata?.file) {
        this.coordinator.navigateToFileDetail(metadata.file, this.categoryId || undefined);
      }
    }) as EventListener);
  }

  /**
   * Get status label
   */
  private getStatusLabel(status?: string): string {
    const labels: Record<string, string> = {
      excellent: 'Excellent',
      good: 'Good',
      warning: 'Needs Attention',
      critical: 'Critical'
    };
    return labels[status || 'warning'] || 'Unknown';
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
   * Escape HTML
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
