/**
 * Overview Panel
 * Displays overview-level visualizations for Code Structure Review
 *
 * Layout:
 * - Primary: Bubble chart (category overview)
 * - Secondary: Gauge (overall health), Radar (category comparison), Sunburst (file hierarchy)
 */

import { VisualizationCoordinator } from '../coordination/VisualizationCoordinator';
import type { AnalysisData } from '../coordination/AnalysisDataMapper';
import { SearchFilter } from './SearchFilter';
import type { FilterCriteria } from './SearchFilter';
import { SuggestionPanel } from '../ai-suggestions/SuggestionPanel';

/**
 * Overview Panel Controller
 */
export class OverviewPanel {
  private container: HTMLElement;
  private coordinator: VisualizationCoordinator;
  private searchFilter: SearchFilter | null = null;
  private suggestionPanel: SuggestionPanel | null = null;
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
        <div class="panel-header">
          <h2 class="panel-title">Code Quality Overview</h2>
          <div class="panel-actions">
            <button class="btn-refresh" title="Refresh analysis">
              <span class="icon">⟳</span>
            </button>
          </div>
        </div>

        <!-- Search and filter -->
        <div id="search-filter-container"></div>

        <!-- AI Suggestions -->
        <div id="suggestions-container"></div>

        <div class="panel-content">
          <!-- Primary visualization: Category Overview -->
          <div class="viz-section viz-primary">
            <div class="viz-header">
              <h3 class="viz-title">Category Overview</h3>
              <p class="viz-subtitle">Click a bubble to drill into category details</p>
            </div>
            <div id="viz-overview-bubble" class="viz-container"></div>
          </div>

          <!-- Secondary visualizations grid -->
          <div class="viz-grid">
            <!-- Overall Health Gauge -->
            <div class="viz-section viz-secondary">
              <div class="viz-header">
                <h3 class="viz-title">Overall Health</h3>
              </div>
              <div id="viz-overview-gauge" class="viz-container"></div>
            </div>

            <!-- Category Comparison Radar -->
            <div class="viz-section viz-secondary">
              <div class="viz-header">
                <h3 class="viz-title">Category Comparison</h3>
              </div>
              <div id="viz-overview-radar" class="viz-container"></div>
            </div>

            <!-- File Hierarchy Sunburst -->
            <div class="viz-section viz-secondary">
              <div class="viz-header">
                <h3 class="viz-title">File Structure</h3>
              </div>
              <div id="viz-overview-sunburst" class="viz-container"></div>
            </div>
          </div>
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

    // Render search filter
    this.renderSearchFilter(analysisData);

    // Render AI suggestions
    this.renderSuggestions(analysisData);

    // Render visualizations
    await this.renderVisualizations(analysisData);

    // Update stats
    this.updateStats(analysisData);

    // Setup event listeners
    this.setupEventListeners();

    this.isRendered = true;
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
   * Render AI suggestions
   */
  private renderSuggestions(analysisData: AnalysisData): void {
    const suggestionsContainer = document.getElementById('suggestions-container');
    if (!suggestionsContainer) return;

    this.suggestionPanel = new SuggestionPanel(suggestionsContainer, {
      maxSuggestions: 3,
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
   * Handle filter change
   */
  private async handleFilterChange(criteria: FilterCriteria): Promise<void> {
    console.log('Filter changed:', criteria);

    if (!this.analysisData) return;

    // Get the data mapper from coordinator
    const dataMapper = this.coordinator.getDataMapper();

    // Apply filters to analysis data
    const filteredData = dataMapper.filterAnalysisData(this.analysisData, criteria);

    // Re-render visualizations with filtered data
    await this.renderVisualizations(filteredData);

    // Update stats with filtered data
    this.updateStats(filteredData);
  }

  /**
   * Render all overview visualizations
   */
  private async renderVisualizations(analysisData: AnalysisData): Promise<void> {
    const vizManager = this.coordinator.getContext().state === 'overview'
      ? this.coordinator
      : null;

    if (!vizManager) {
      console.warn('Coordinator not in overview state');
      return;
    }

    try {
      // Navigate to overview to trigger visualization rendering
      await this.coordinator.navigateToOverview();
    } catch (error) {
      console.error('Error rendering overview visualizations:', error);
      this.showError('Failed to render visualizations');
    }
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
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Refresh button
    const refreshBtn = this.container.querySelector('.btn-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.handleRefresh();
      });
    }

    // Listen for bubble click to navigate to category
    window.addEventListener('bubble-click', ((event: CustomEvent) => {
      const { id, name } = event.detail;
      this.handleCategoryClick(id, name);
    }) as EventListener);
  }

  /**
   * Handle refresh
   */
  private handleRefresh(): void {
    window.dispatchEvent(new CustomEvent('overview-refresh-requested'));
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
