/**
 * CodeStructureViewController - Main controller for Code Structure Review tab
 *
 * Manages code analysis, issue display, and AI prompt generation.
 */

import { t, tf, onI18nReady } from '../../webview/i18n';
import { NotificationManager } from '../NotificationManager';
import { webviewLogger, LogCategory, LogPathway } from '../../webview/WebviewLogger';

export interface CodeStructureViewState {
  currentAnalysis: any | null;
  maturityLevel: 'novice' | 'intermediate' | 'advanced' | 'expert';
  isAnalyzing: boolean;
}

export class CodeStructureViewController {
  private state: CodeStructureViewState;
  private messageHandler: ((message: any) => void) | null = null;
  private notifications: NotificationManager;

  constructor() {
    console.log('[CodeStructureViewController] Constructor called');
    this.state = {
      currentAnalysis: null,
      maturityLevel: 'intermediate',
      isAnalyzing: false
    };
    this.notifications = new NotificationManager();

    // Re-render when i18n is ready
    onI18nReady(() => {
      console.log('[CodeStructureViewController] i18n ready in constructor callback');
      webviewLogger.debug(LogCategory.UI, 'i18n ready, checking if render needed', 'CodeStructureViewController.constructor');
      const container = document.getElementById('code-structure-content');
      console.log('[CodeStructureViewController] Container found:', !!container, 'has content:', container?.innerHTML?.length);
      if (container && container.innerHTML) {
        webviewLogger.debug(LogCategory.UI, 'Container has content, re-rendering with translations', 'CodeStructureViewController.constructor');
        this.render();
      }
    });
  }

  /**
   * Initialize the code structure view controller
   */
  initialize(onMessage: (message: any) => void): void {
    console.log('[CodeStructureViewController] initialize() called');
    this.messageHandler = onMessage;

    // Wait for i18n before rendering
    onI18nReady(() => {
      console.log('[CodeStructureViewController] i18n ready in initialize callback, calling render()');
      webviewLogger.info(LogCategory.UI, 'i18n ready, rendering Code Structure tab', 'CodeStructureViewController.initialize');
      this.render();
      this.setupEventListeners();
    });

    console.log('[CodeStructureViewController] initialize() completed');
    webviewLogger.info(LogCategory.UI, 'CodeStructureViewController initialized', 'initialize');
  }

  /**
   * Handle messages from the extension
   */
  handleMessage(message: any): void {
    switch (message.type) {
      case 'code-structure:analysis-start':
        this.state.isAnalyzing = true;
        this.renderLoadingState();
        webviewLogger.info(LogCategory.UI, 'Analysis started', 'handleMessage');
        break;

      case 'code-structure:analysis-complete':
        this.state.isAnalyzing = false;
        this.state.currentAnalysis = message.payload.analysis;
        this.renderAnalysis(message.payload.analysis);
        this.notifications.show({
          type: 'success',
          message: t('codeStructure.analysisComplete'),
          duration: 3000
        });
        webviewLogger.info(LogCategory.UI, 'Analysis complete', 'handleMessage', {
          score: message.payload.analysis?.summary?.overallScore,
          issues: message.payload.analysis?.summary?.totalIssues
        });
        break;

      case 'code-structure:analysis-error':
        this.state.isAnalyzing = false;
        this.renderError(message.payload.message);
        this.notifications.show({
          type: 'error',
          message: t('codeStructure.analysisError'),
          duration: 5000
        });
        webviewLogger.error(LogCategory.UI, 'Analysis error', 'handleMessage', message.payload);
        break;

      case 'code-structure:prompt-generated':
        this.showGeneratedPrompt(message.payload.prompt);
        break;

      default:
        webviewLogger.warn(LogCategory.UI, `Unknown message type: ${message.type}`, 'handleMessage');
    }
  }

  /**
   * Render the initial Code Structure tab UI
   */
  private render(): void {
    console.log('[CodeStructureViewController] render() called');
    const container = document.getElementById('code-structure-content');
    console.log('[CodeStructureViewController] Container element:', container);
    if (!container) {
      console.error('[CodeStructureViewController] code-structure-content container NOT FOUND!');
      webviewLogger.error(LogCategory.UI, 'Code structure content container not found', 'render');
      return;
    }

    console.log('[CodeStructureViewController] Setting container innerHTML...');
    container.innerHTML = `
      <div class="code-structure-container">
        <!-- Header with controls -->
        <div class="code-structure-header">
          <h2>${t('codeStructure.title', 'Code Structure Review')}</h2>
          <div class="code-structure-controls">
            <div class="maturity-selector">
              <label>${t('codeStructure.maturityLevel', 'Maturity Level')}:</label>
              <select id="maturity-level-select" class="maturity-select">
                <option value="novice">${t('maturity.novice', 'Novice')}</option>
                <option value="intermediate" selected>${t('maturity.intermediate', 'Intermediate')}</option>
                <option value="advanced">${t('maturity.advanced', 'Advanced')}</option>
                <option value="expert">${t('maturity.expert', 'Expert')}</option>
              </select>
            </div>
            <button id="run-quick-analysis" class="btn btn-secondary">
              ${t('codeStructure.quickAnalysis', 'Quick Analysis')}
            </button>
            <button id="run-full-analysis" class="btn btn-primary">
              ${t('codeStructure.fullAnalysis', 'Full Analysis')}
            </button>
          </div>
        </div>

        <!-- Main content area -->
        <div class="code-structure-main" id="code-structure-main">
          ${this.renderEmptyState()}
        </div>
      </div>
    `;

    console.log('[CodeStructureViewController] Container innerHTML set successfully');
    webviewLogger.debug(LogCategory.UI, 'Code Structure tab rendered', 'render');
  }

  /**
   * Render empty state (no analysis yet)
   */
  private renderEmptyState(): string {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <h3>${t('codeStructure.emptyState.title', 'No Analysis Yet')}</h3>
        <p>${t('codeStructure.emptyState.description', 'Run an analysis to detect code structure issues and get AI-powered recommendations.')}</p>
        <ul class="feature-list">
          <li><strong>${t('codeStructure.features.featureCompleteness', 'Feature Completeness')}</strong>: ${t('codeStructure.features.featureCompletenessDesc', 'Detect disconnected endpoints and unused components')}</li>
          <li><strong>${t('codeStructure.features.uiUxQuality', 'UI/UX Quality')}</strong>: ${t('codeStructure.features.uiUxQualityDesc', 'Find missing loading states, error handling, and empty states')}</li>
          <li><strong>${t('codeStructure.features.i18n', 'Internationalization')}</strong>: ${t('codeStructure.features.i18nDesc', 'Identify hardcoded strings and untranslated text')}</li>
          <li><strong>${t('codeStructure.features.testCoverage', 'Test Coverage')}</strong>: ${t('codeStructure.features.testCoverageDesc', 'Detect untested components and missing test cases')}</li>
        </ul>
      </div>
    `;
  }

  /**
   * Render loading state during analysis
   */
  private renderLoadingState(): void {
    const mainContainer = document.getElementById('code-structure-main');
    if (!mainContainer) return;

    mainContainer.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>${t('codeStructure.analyzing', 'Analyzing code structure...')}</p>
      </div>
    `;
  }

  /**
   * Render error state
   */
  private renderError(errorMessage: string): void {
    const mainContainer = document.getElementById('code-structure-main');
    if (!mainContainer) return;

    mainContainer.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <h3>${t('codeStructure.error.title', 'Analysis Failed')}</h3>
        <p>${errorMessage}</p>
        <button id="retry-analysis" class="btn btn-primary">
          ${t('codeStructure.retry', 'Retry')}
        </button>
      </div>
    `;

    // Add retry handler
    document.getElementById('retry-analysis')?.addEventListener('click', () => {
      this.runFullAnalysis();
    });
  }

  /**
   * Render analysis results
   */
  private renderAnalysis(analysis: any): void {
    const mainContainer = document.getElementById('code-structure-main');
    if (!mainContainer) return;

    const summary = analysis.summary;
    const categories = analysis.categories || [];

    mainContainer.innerHTML = `
      <div class="analysis-results">
        <!-- Summary Dashboard -->
        <div class="summary-dashboard">
          <div class="score-card ${this.getScoreClass(summary.overallScore)}">
            <div class="score-value">${summary.overallScore}</div>
            <div class="score-label">${t('codeStructure.overallScore', 'Overall Score')}</div>
          </div>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">${summary.totalIssues}</div>
              <div class="stat-label">${t('codeStructure.totalIssues', 'Total Issues')}</div>
            </div>
            <div class="stat-item">
              <div class="stat-value critical">${summary.criticalIssues || 0}</div>
              <div class="stat-label">${t('codeStructure.critical', 'Critical')}</div>
            </div>
            <div class="stat-item">
              <div class="stat-value high">${summary.highPriorityIssues || 0}</div>
              <div class="stat-label">${t('codeStructure.high', 'High')}</div>
            </div>
            <div class="stat-item">
              <div class="stat-value medium">${summary.mediumPriorityIssues || 0}</div>
              <div class="stat-label">${t('codeStructure.medium', 'Medium')}</div>
            </div>
          </div>
        </div>

        <!-- Category Results -->
        <div class="categories-container">
          <h3>${t('codeStructure.categories', 'Categories')}</h3>
          <div class="categories-list">
            ${categories.map((cat: any) => this.renderCategoryCard(cat)).join('')}
          </div>
        </div>

        <!-- Actions -->
        <div class="analysis-actions">
          <button id="generate-prompt" class="btn btn-primary">
            ${t('codeStructure.generatePrompt', 'Generate AI Prompt')}
          </button>
          <button id="export-report" class="btn btn-secondary">
            ${t('codeStructure.exportReport', 'Export Report')}
          </button>
        </div>
      </div>
    `;

    // Setup event listeners for analysis actions
    this.setupAnalysisActionListeners();

    webviewLogger.info(LogCategory.UI, 'Analysis results rendered', 'renderAnalysis', {
      categories: categories.length,
      issues: summary.totalIssues
    });
  }

  /**
   * Render a single category card
   */
  private renderCategoryCard(category: any): string {
    const statusClass = category.status || 'warning';
    const issuesCount = category.issues?.length || 0;

    return `
      <div class="category-card status-${statusClass}">
        <div class="category-header">
          <h4>${category.categoryName}</h4>
          <div class="category-score">${category.score}/100</div>
        </div>
        <div class="category-stats">
          <span class="issue-count">${issuesCount} ${t('codeStructure.issues', 'issues')}</span>
          <span class="priority-badge">P${category.priority}</span>
        </div>
        ${issuesCount > 0 ? `
          <button class="btn-link view-issues-btn" data-category-id="${category.categoryId}">
            ${t('codeStructure.viewIssues', 'View Issues')} →
          </button>
        ` : ''}
      </div>
    `;
  }

  /**
   * Get CSS class based on score
   */
  private getScoreClass(score: number): string {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'warning';
    return 'critical';
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Quick analysis button
    document.getElementById('run-quick-analysis')?.addEventListener('click', () => {
      this.runQuickAnalysis();
    });

    // Full analysis button
    document.getElementById('run-full-analysis')?.addEventListener('click', () => {
      this.runFullAnalysis();
    });

    // Maturity level selector
    document.getElementById('maturity-level-select')?.addEventListener('change', (e) => {
      const select = e.target as HTMLSelectElement;
      this.state.maturityLevel = select.value as any;
      this.sendMessage({
        type: 'code-structure:maturity-changed',
        payload: { maturityLevel: this.state.maturityLevel }
      });
    });

    webviewLogger.debug(LogCategory.UI, 'Event listeners setup', 'setupEventListeners');
  }

  /**
   * Setup event listeners for analysis actions
   */
  private setupAnalysisActionListeners(): void {
    // Generate prompt button
    document.getElementById('generate-prompt')?.addEventListener('click', () => {
      this.sendMessage({
        type: 'code-structure:generate-prompt',
        payload: { maturityLevel: this.state.maturityLevel }
      });
    });

    // Export report button
    document.getElementById('export-report')?.addEventListener('click', () => {
      this.sendMessage({
        type: 'code-structure:export-report',
        payload: { format: 'summary' }
      });
    });

    // View issues buttons
    document.querySelectorAll('.view-issues-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const categoryId = (e.target as HTMLElement).dataset.categoryId;
        this.showCategoryIssues(categoryId);
      });
    });
  }

  /**
   * Run quick analysis
   */
  private runQuickAnalysis(): void {
    this.sendMessage({
      type: 'code-structure:run-quick-analysis',
      payload: {}
    });
    webviewLogger.info(LogCategory.UI, 'Quick analysis requested', 'runQuickAnalysis');
  }

  /**
   * Run full analysis
   */
  private runFullAnalysis(): void {
    this.sendMessage({
      type: 'code-structure:run-full-analysis',
      payload: {}
    });
    webviewLogger.info(LogCategory.UI, 'Full analysis requested', 'runFullAnalysis');
  }

  /**
   * Show issues for a specific category
   */
  private showCategoryIssues(categoryId: string | undefined): void {
    if (!categoryId) return;

    const category = this.state.currentAnalysis?.categories?.find((c: any) => c.categoryId === categoryId);
    if (!category) return;

    const mainContainer = document.getElementById('code-structure-main');
    if (!mainContainer) return;

    mainContainer.innerHTML = `
      <div class="category-issues-view">
        <button id="back-to-summary" class="btn-link back-btn">← ${t('codeStructure.backToSummary', 'Back to Summary')}</button>

        <div class="category-issues-header">
          <h3>${category.categoryName}</h3>
          <div class="category-score">${category.score}/100</div>
        </div>

        <div class="issues-list">
          ${category.issues.map((issue: any) => this.renderIssueCard(issue)).join('')}
        </div>
      </div>
    `;

    // Setup back button
    document.getElementById('back-to-summary')?.addEventListener('click', () => {
      this.renderAnalysis(this.state.currentAnalysis);
    });
  }

  /**
   * Render a single issue card
   */
  private renderIssueCard(issue: any): string {
    const severityClass = issue.severity || 'medium';

    return `
      <div class="issue-card severity-${severityClass}">
        <div class="issue-header">
          <span class="severity-badge">${issue.severity}</span>
          <span class="issue-title">${issue.title}</span>
        </div>
        <p class="issue-description">${issue.description}</p>
        ${issue.filePath ? `
          <div class="issue-location">
            <span class="file-path">${issue.filePath}${issue.lineNumber ? `:${issue.lineNumber}` : ''}</span>
          </div>
        ` : ''}
        ${issue.recommendation ? `
          <div class="issue-recommendation">
            <strong>${t('codeStructure.recommendation', 'Recommendation')}:</strong>
            <p>${issue.recommendation}</p>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Show generated prompt
   */
  private showGeneratedPrompt(prompt: string): void {
    // Create modal with the generated prompt
    const modalHtml = `
      <div class="prompt-modal">
        <h3>${t('codeStructure.generatedPrompt', 'Generated AI Prompt')}</h3>
        <div class="prompt-content">
          <pre>${this.escapeHtml(prompt)}</pre>
        </div>
        <div class="modal-actions">
          <button id="copy-prompt" class="btn btn-primary">${t('codeStructure.copyToClipboard', 'Copy to Clipboard')}</button>
          <button id="close-prompt-modal" class="btn btn-secondary">${t('common.close', 'Close')}</button>
        </div>
      </div>
    `;

    // Show in a modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = modalHtml;
    document.body.appendChild(overlay);

    // Setup event listeners
    document.getElementById('copy-prompt')?.addEventListener('click', () => {
      navigator.clipboard.writeText(prompt).then(() => {
        this.notifications.show({
          type: 'success',
          message: t('codeStructure.copiedToClipboard', 'Copied to clipboard'),
          duration: 2000
        });
      });
    });

    document.getElementById('close-prompt-modal')?.addEventListener('click', () => {
      overlay.remove();
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
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
   * Send message to extension
   */
  private sendMessage(message: any): void {
    if (this.messageHandler) {
      this.messageHandler(message);
    } else {
      webviewLogger.warn(LogCategory.UI, 'No message handler set', 'sendMessage');
    }
  }
}
