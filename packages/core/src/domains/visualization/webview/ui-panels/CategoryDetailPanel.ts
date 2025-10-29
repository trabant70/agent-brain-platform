/**
 * Category Detail Panel
 * Displays category-specific visualizations for Code Structure Review
 *
 * Layout:
 * - Primary: Heatmap (issue distribution)
 * - Tabs: Sankey (flow), Timeline (trends), Stacked Bar (severity breakdown)
 */

import { VisualizationCoordinator } from '../coordination/VisualizationCoordinator';
import type { AnalysisData } from '../coordination/AnalysisDataMapper';
import { SearchFilter } from './SearchFilter';
import type { FilterCriteria } from './SearchFilter';
import { SuggestionPanel } from '../ai-suggestions/SuggestionPanel';

type VisualizationTab = 'heatmap' | 'sankey' | 'timeline' | 'stacked-bar';

/**
 * Category Detail Panel Controller
 */
export class CategoryDetailPanel {
  private container: HTMLElement;
  private coordinator: VisualizationCoordinator;
  private searchFilter: SearchFilter | null = null;
  private suggestionPanel: SuggestionPanel | null = null;
  private categoryId: string | null = null;
  private categoryName: string | null = null;
  private activeTab: VisualizationTab = 'heatmap';
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

        <!-- Search and filter -->
        <div id="search-filter-container"></div>

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
          <!-- Visualization tabs -->
          <div class="viz-tabs">
            <button class="viz-tab ${this.activeTab === 'heatmap' ? 'active' : ''}"
                    data-tab="heatmap">
              Issue Distribution
            </button>
            <button class="viz-tab ${this.activeTab === 'sankey' ? 'active' : ''}"
                    data-tab="sankey">
              Issue Flow
            </button>
            <button class="viz-tab ${this.activeTab === 'timeline' ? 'active' : ''}"
                    data-tab="timeline">
              Trend Analysis
            </button>
            <button class="viz-tab ${this.activeTab === 'stacked-bar' ? 'active' : ''}"
                    data-tab="stacked-bar">
              Severity Breakdown
            </button>
          </div>

          <!-- Visualization containers -->
          <div class="viz-tab-content">
            <div id="viz-category-heatmap"
                 class="viz-container ${this.activeTab === 'heatmap' ? 'active' : ''}">
            </div>
            <div id="viz-category-sankey"
                 class="viz-container ${this.activeTab === 'sankey' ? 'active' : ''}">
            </div>
            <div id="viz-category-timeline"
                 class="viz-container ${this.activeTab === 'timeline' ? 'active' : ''}">
            </div>
            <div id="viz-category-stacked-bar"
                 class="viz-container ${this.activeTab === 'stacked-bar' ? 'active' : ''}">
            </div>
          </div>
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
    this.renderSearchFilter(analysisData);

    // Render AI suggestions (category-specific)
    this.renderSuggestions(analysisData, categoryId);

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
   * Render search filter
   */
  private renderSearchFilter(analysisData: AnalysisData): void {
    const filterContainer = document.getElementById('search-filter-container');
    if (!filterContainer) return;

    this.searchFilter = new SearchFilter(filterContainer, this.coordinator);
    this.searchFilter.render(analysisData);

    // Setup filter callback
    this.searchFilter.onFilter((criteria) => {
      this.handleFilterChange(criteria);
    });
  }

  /**
   * Render AI suggestions for this category
   */
  private renderSuggestions(analysisData: AnalysisData, categoryId: string): void {
    const suggestionsContainer = document.getElementById('suggestions-container');
    if (!suggestionsContainer) return;

    this.suggestionPanel = new SuggestionPanel(suggestionsContainer, {
      maxSuggestions: 5,
      onNavigateToFile: (filePath: string) => {
        // Send message to extension to open file
        window.dispatchEvent(new CustomEvent('open-file-requested', {
          detail: { filePath }
        }));
      }
    });

    this.suggestionPanel.render(analysisData);
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
   * Render category visualizations
   * Note: Calls renderCurrentState directly to avoid navigation event loop
   */
  private async renderVisualizations(analysisData: AnalysisData): Promise<void> {
    if (!this.categoryId || !this.categoryName) return;

    // Ensure coordinator is in category-detail state
    if (this.coordinator.getContext().state !== 'category-detail') {
      console.warn('Coordinator not in category-detail state, navigating...');
      await this.coordinator.navigateToCategoryDetail(this.categoryId, this.categoryName);
      return; // Navigation will trigger re-render through IntegrationController
    }

    try {
      // Render visualizations directly without triggering navigation
      await this.coordinator.renderCurrentState();
    } catch (error) {
      console.error('Error rendering category visualizations:', error);
      this.showError('Failed to render visualizations');
    }
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
      const file = issue.file || 'Unknown';
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
            ${fileIssues.map(issue => `
              <div class="issue-item severity-${issue.severity || 'medium'}">
                <div class="issue-header">
                  <span class="issue-severity">${(issue.severity || 'medium').toUpperCase()}</span>
                  ${issue.line ? `<span class="issue-line">Line ${issue.line}</span>` : ''}
                </div>
                <div class="issue-message">${this.escapeHtml(issue.message || 'No description')}</div>
              </div>
            `).join('')}
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

    // Tab switching
    const tabs = this.container.querySelectorAll('.viz-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const tabName = target.getAttribute('data-tab') as VisualizationTab;
        this.switchTab(tabName);
      });
    });

    // Listen for heatmap cell clicks to navigate to file
    window.addEventListener('heatmap-cell-click', ((event: CustomEvent) => {
      const { metadata } = event.detail;
      if (metadata?.file) {
        this.coordinator.navigateToFileDetail(metadata.file, this.categoryId || undefined);
      }
    }) as EventListener);
  }

  /**
   * Switch visualization tab
   */
  private switchTab(tabName: VisualizationTab): void {
    this.activeTab = tabName;

    // Update tab buttons
    const tabs = this.container.querySelectorAll('.viz-tab');
    tabs.forEach(tab => {
      const target = tab as HTMLElement;
      const isActive = target.getAttribute('data-tab') === tabName;
      target.classList.toggle('active', isActive);
    });

    // Update tab content
    const contents = this.container.querySelectorAll('.viz-tab-content .viz-container');
    contents.forEach(content => {
      const target = content as HTMLElement;
      const isActive = target.id === `viz-category-${tabName}`;
      target.classList.toggle('active', isActive);
    });
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
    if (this.searchFilter) {
      this.searchFilter.dispose();
      this.searchFilter = null;
    }
    if (this.suggestionPanel) {
      this.suggestionPanel.dispose();
      this.suggestionPanel = null;
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
