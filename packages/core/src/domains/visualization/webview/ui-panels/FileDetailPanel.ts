/**
 * File Detail Panel
 * Displays file-specific visualizations for Code Structure Review
 *
 * Layout:
 * - Primary: Dependency graph
 * - Tabs: Flame graph, Parallel coordinates, Code metrics
 */

import { VisualizationCoordinator } from '../coordination/VisualizationCoordinator';
import type { AnalysisData } from '../coordination/AnalysisDataMapper';

type FileVisualizationTab = 'dependency-graph' | 'flame-graph' | 'parallel-coordinates' | 'metrics';

/**
 * File Detail Panel Controller
 */
export class FileDetailPanel {
  private container: HTMLElement;
  private coordinator: VisualizationCoordinator;
  private filePath: string | null = null;
  private categoryId: string | null = null;
  private activeTab: FileVisualizationTab = 'dependency-graph';
  private isRendered: boolean = false;

  constructor(container: HTMLElement, coordinator: VisualizationCoordinator) {
    this.container = container;
    this.coordinator = coordinator;
  }

  /**
   * Render file detail panel
   */
  async render(analysisData: AnalysisData, filePath: string, categoryId?: string): Promise<void> {
    this.filePath = filePath;
    this.categoryId = categoryId || null;
    this.clear();

    // Find file data
    const file = analysisData.files?.find(f => f.path === filePath);
    if (!file) {
      this.showError(`File "${filePath}" not found`);
      return;
    }

    // Extract file info
    const fileName = this.getFileName(filePath);
    const fileIssues = this.getFileIssues(analysisData, filePath);
    const fileMetrics = this.getFileMetrics(file);

    // Create panel structure
    this.container.innerHTML = `
      <div class="file-detail-panel">
        <div class="panel-header">
          <div class="panel-title-group">
            <h2 class="panel-title">${this.escapeHtml(fileName)}</h2>
            <span class="file-path">${this.escapeHtml(filePath)}</span>
          </div>
          <div class="panel-actions">
            <button class="btn-back" title="Back">
              <span class="icon">←</span> Back
            </button>
          </div>
        </div>

        <div class="panel-stats">
          <div class="stat-item">
            <span class="stat-label">Issues</span>
            <span class="stat-value">${fileIssues.length}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Size (LOC)</span>
            <span class="stat-value">${fileMetrics.size}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Complexity</span>
            <span class="stat-value">${fileMetrics.complexity}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Coverage</span>
            <span class="stat-value ${this.getCoverageClass(fileMetrics.coverage)}">
              ${fileMetrics.coverage}%
            </span>
          </div>
        </div>

        <div class="panel-content">
          <!-- Visualization tabs -->
          <div class="viz-tabs">
            <button class="viz-tab ${this.activeTab === 'dependency-graph' ? 'active' : ''}"
                    data-tab="dependency-graph">
              Dependencies
            </button>
            <button class="viz-tab ${this.activeTab === 'flame-graph' ? 'active' : ''}"
                    data-tab="flame-graph">
              Code Structure
            </button>
            <button class="viz-tab ${this.activeTab === 'parallel-coordinates' ? 'active' : ''}"
                    data-tab="parallel-coordinates">
              Metrics Analysis
            </button>
            <button class="viz-tab ${this.activeTab === 'metrics' ? 'active' : ''}"
                    data-tab="metrics">
              Detailed Metrics
            </button>
          </div>

          <!-- Visualization containers -->
          <div class="viz-tab-content">
            <div id="viz-file-dependency-graph"
                 class="viz-container ${this.activeTab === 'dependency-graph' ? 'active' : ''}">
            </div>
            <div id="viz-file-flame-graph"
                 class="viz-container ${this.activeTab === 'flame-graph' ? 'active' : ''}">
            </div>
            <div id="viz-file-parallel-coordinates"
                 class="viz-container ${this.activeTab === 'parallel-coordinates' ? 'active' : ''}">
            </div>
            <div id="viz-file-metrics"
                 class="viz-container metrics-grid ${this.activeTab === 'metrics' ? 'active' : ''}">
              ${this.renderMetricsGrid(file, fileMetrics)}
            </div>
          </div>
        </div>

        <!-- File issues -->
        <div class="panel-footer">
          <details class="issue-details" ${fileIssues.length > 0 ? 'open' : ''}>
            <summary>
              <span class="summary-label">Issues in this File (${fileIssues.length})</span>
              <span class="summary-icon">▼</span>
            </summary>
            <div class="issue-list" id="file-issue-list">
              ${this.renderIssueList(fileIssues)}
            </div>
          </details>
        </div>
      </div>
    `;

    // Render visualizations
    await this.renderVisualizations(analysisData);

    // Setup event listeners
    this.setupEventListeners();

    this.isRendered = true;
  }

  /**
   * Render file visualizations
   */
  private async renderVisualizations(analysisData: AnalysisData): Promise<void> {
    if (!this.filePath) return;

    try {
      // Navigate to file detail to trigger visualization rendering
      await this.coordinator.navigateToFileDetail(this.filePath, this.categoryId || undefined);
    } catch (error) {
      console.error('Error rendering file visualizations:', error);
      this.showError('Failed to render visualizations');
    }
  }

  /**
   * Render metrics grid
   */
  private renderMetricsGrid(file: any, metrics: any): string {
    return `
      <div class="metric-cards">
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-icon">📏</span>
            <span class="metric-title">Code Size</span>
          </div>
          <div class="metric-value">${metrics.size}</div>
          <div class="metric-label">Lines of Code</div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-icon">🔀</span>
            <span class="metric-title">Complexity</span>
          </div>
          <div class="metric-value ${this.getComplexityClass(metrics.complexity)}">
            ${metrics.complexity}
          </div>
          <div class="metric-label">Cyclomatic Complexity</div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-icon">✓</span>
            <span class="metric-title">Test Coverage</span>
          </div>
          <div class="metric-value ${this.getCoverageClass(metrics.coverage)}">
            ${metrics.coverage}%
          </div>
          <div class="metric-label">Code Coverage</div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-icon">⚠️</span>
            <span class="metric-title">Issues</span>
          </div>
          <div class="metric-value ${metrics.issueCount > 0 ? 'metric-warning' : ''}">
            ${metrics.issueCount}
          </div>
          <div class="metric-label">Total Issues</div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-icon">📊</span>
            <span class="metric-title">Maintainability</span>
          </div>
          <div class="metric-value ${this.getScoreClass(metrics.maintainability)}">
            ${metrics.maintainability}/100
          </div>
          <div class="metric-label">Maintainability Index</div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-icon">🔗</span>
            <span class="metric-title">Dependencies</span>
          </div>
          <div class="metric-value">${metrics.dependencies}</div>
          <div class="metric-label">Import Count</div>
        </div>
      </div>
    `;
  }

  /**
   * Render issue list
   */
  private renderIssueList(issues: any[]): string {
    if (issues.length === 0) {
      return '<p class="no-issues">No issues found in this file</p>';
    }

    return issues.map(issue => `
      <div class="issue-item severity-${issue.severity || 'medium'}">
        <div class="issue-header">
          <span class="issue-severity">${(issue.severity || 'medium').toUpperCase()}</span>
          ${issue.line ? `<span class="issue-line">Line ${issue.line}</span>` : ''}
          ${issue.category ? `<span class="issue-category">${this.escapeHtml(issue.category)}</span>` : ''}
        </div>
        <div class="issue-message">${this.escapeHtml(issue.message || 'No description')}</div>
      </div>
    `).join('');
  }

  /**
   * Get file issues
   */
  private getFileIssues(analysisData: AnalysisData, filePath: string): any[] {
    const allIssues: any[] = [];

    analysisData.categories?.forEach(category => {
      category.issues?.forEach(issue => {
        if (issue.file === filePath) {
          allIssues.push({
            ...issue,
            category: category.categoryName
          });
        }
      });
    });

    return allIssues;
  }

  /**
   * Get file metrics
   */
  private getFileMetrics(file: any): any {
    return {
      size: file.size || 0,
      complexity: file.complexity || 0,
      coverage: file.coverage || 0,
      issueCount: file.issues?.length || 0,
      maintainability: this.calculateMaintainability(file),
      dependencies: this.calculateDependencies(file)
    };
  }

  /**
   * Calculate maintainability index
   */
  private calculateMaintainability(file: any): number {
    // Simplified maintainability calculation
    const size = file.size || 1;
    const complexity = file.complexity || 1;
    const coverage = file.coverage || 0;
    const issues = file.issues?.length || 0;

    const sizeScore = Math.max(0, 100 - (size / 10));
    const complexityScore = Math.max(0, 100 - (complexity * 2));
    const coverageScore = coverage;
    const issueScore = Math.max(0, 100 - (issues * 5));

    return Math.round((sizeScore + complexityScore + coverageScore + issueScore) / 4);
  }

  /**
   * Calculate dependency count
   */
  private calculateDependencies(file: any): number {
    // This would come from actual dependency analysis
    return 0; // Placeholder
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Back button
    const backBtn = this.container.querySelector('.btn-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.coordinator.navigateBack();
      });
    }

    // Tab switching
    const tabs = this.container.querySelectorAll('.viz-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const tabName = target.getAttribute('data-tab') as FileVisualizationTab;
        this.switchTab(tabName);
      });
    });
  }

  /**
   * Switch visualization tab
   */
  private switchTab(tabName: FileVisualizationTab): void {
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
      const isActive = target.id === `viz-file-${tabName}`;
      target.classList.toggle('active', isActive);
    });
  }

  /**
   * Get file name from path
   */
  private getFileName(path: string): string {
    const parts = path.split('/');
    return parts[parts.length - 1] || path;
  }

  /**
   * Get coverage class
   */
  private getCoverageClass(coverage: number): string {
    if (coverage >= 80) return 'coverage-good';
    if (coverage >= 50) return 'coverage-medium';
    return 'coverage-low';
  }

  /**
   * Get complexity class
   */
  private getComplexityClass(complexity: number): string {
    if (complexity >= 20) return 'complexity-high';
    if (complexity >= 10) return 'complexity-medium';
    return 'complexity-low';
  }

  /**
   * Get score class
   */
  private getScoreClass(score: number): string {
    if (score >= 70) return 'score-good';
    if (score >= 40) return 'score-medium';
    return 'score-low';
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
