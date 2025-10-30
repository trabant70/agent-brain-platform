/**
 * CodeStructureViewController - Main controller for Code Structure Review tab
 *
 * Manages code analysis, issue display, and AI prompt generation.
 */

import { t, tf, onI18nReady } from '../../webview/i18n';
import { NotificationManager } from '../NotificationManager';
import { webviewLogger, LogCategory, LogPathway } from '../../webview/WebviewLogger';
import { createIntegrationController, type IntegrationController, type AnalysisData } from '../../webview/IntegrationController';
import { MaturityLevelAdapter, EducationalTooltips, type MaturityLevel } from '../../webview/progressive-disclosure';
import { createProgressNotification, type ProgressNotificationUI } from './ProgressNotificationUI';
import type { ProgressEvent } from '../../../code-structure-review/streaming/ProgressEventEmitter';

export interface CodeStructureViewState {
  currentAnalysis: any | null;
  maturityLevel: 'novice' | 'intermediate' | 'advanced' | 'expert';
  isAnalyzing: boolean;
}

export class CodeStructureViewController {
  private state: CodeStructureViewState;
  private messageHandler: ((message: any) => void) | null = null;
  private notifications: NotificationManager;
  private maturityAdapter: MaturityLevelAdapter;
  private tooltips: EducationalTooltips;
  private integrationController: IntegrationController | null = null;
  private progressNotification: ProgressNotificationUI | null = null;

  constructor() {
    console.log('[CodeStructureViewController] Constructor called');
    this.state = {
      currentAnalysis: null,
      maturityLevel: 'intermediate',
      isAnalyzing: false
    };
    this.notifications = new NotificationManager();
    this.maturityAdapter = new MaturityLevelAdapter('intermediate');
    this.tooltips = new EducationalTooltips('intermediate');

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

      // Request cached data when tab first initializes
      this.requestCachedData();
    });

    // Listen for tab changes to request cached data when becoming visible
    const tabManager = (window as any).tabManager;
    if (tabManager && typeof tabManager.on === 'function') {
      tabManager.on('tab:changed', (event: any) => {
        if (event.to === 'code-review') {
          // Tab became visible, request cached data if we don't have any
          if (!this.state.currentAnalysis) {
            webviewLogger.debug(LogCategory.UI, 'Code Review tab became visible, requesting cached data', 'CodeStructureViewController.initialize');
            this.requestCachedData();
          }
        }
      });
    }

    console.log('[CodeStructureViewController] initialize() completed');
    webviewLogger.info(LogCategory.UI, 'CodeStructureViewController initialized', 'initialize');
  }

  /**
   * Request cached analysis data from extension
   */
  private requestCachedData(): void {
    if (this.messageHandler && (window as any).vscode) {
      webviewLogger.debug(LogCategory.UI, 'Requesting cached code structure data', 'requestCachedData', undefined, LogPathway.WEBVIEW_MESSAGING);
      (window as any).vscode.postMessage({
        type: 'code-structure-review:request-data'
      });
    }
  }

  /**
   * Handle messages from the extension
   */
  handleMessage(message: any): void {
    switch (message.type) {
      case 'code-structure:analysis-start':
        this.state.isAnalyzing = true;
        this.renderLoadingStateWithProgress();
        webviewLogger.info(LogCategory.UI, 'Analysis started', 'handleMessage');
        break;

      case 'code-structure:progress':
        this.handleProgressEvent(message.payload as ProgressEvent);
        break;

      case 'code-structure:analysis-complete':
        this.state.isAnalyzing = false;
        this.state.currentAnalysis = message.payload.analysis;
        this.renderAnalysis(message.payload.analysis, message.payload.visualizations);
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

      // New message format for IntegrationController
      case 'code-structure-review:data':
        this.handleAnalysisData(message.data);
        break;

      case 'code-structure-review:clear':
        this.clearAnalysis();
        break;

      case 'code-structure-review:error':
        this.state.isAnalyzing = false;
        this.renderError(message.error || 'Analysis failed');
        this.notifications.show({
          type: 'error',
          message: t('codeStructure.analysisError'),
          duration: 5000
        });
        webviewLogger.error(LogCategory.UI, 'Analysis error', 'handleMessage', message);
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
        <!-- Tab Navigation Header -->
        <div class="code-structure-tabs-header">
          <div class="category-tabs">
            <button class="category-tab active" data-category="overview">
              ${t('codeStructure.overview', 'Overview')}
            </button>
            <button class="category-tab" data-category="ui-ux">
              ${t('codeStructure.uiUxQuality', 'UI/UX')}
            </button>
            <button class="category-tab" data-category="test-coverage">
              ${t('codeStructure.testCoverage', 'Test Coverage')}
            </button>
            <button class="category-tab" data-category="i18n">
              ${t('codeStructure.internationalization', 'Internationalization')}
            </button>
            <button class="category-tab" data-category="features">
              ${t('codeStructure.featureCompleteness', 'Feature Completeness')}
            </button>
          </div>
          <div class="header-controls">
            <label>${t('codeStructure.maturity', 'Maturity')}:</label>
            <select id="maturity-level-select">
              <option value="novice">${t('maturity.novice', 'Novice')}</option>
              <option value="intermediate" selected>${t('maturity.intermediate', 'Intermediate')}</option>
              <option value="advanced">${t('maturity.advanced', 'Advanced')}</option>
              <option value="expert">${t('maturity.expert', 'Expert')}</option>
            </select>
            <button id="run-analysis" class="btn btn-primary">
              ${t('codeStructure.runAnalysis', 'Run Analysis')}
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
   * Render loading state with progress notification
   */
  private renderLoadingStateWithProgress(): void {
    const mainContainer = document.getElementById('code-structure-main');
    if (!mainContainer) return;

    // Create container for progress notification
    mainContainer.innerHTML = `
      <div class="loading-state-with-progress">
        <div id="progress-notification-container"></div>
      </div>
    `;

    // Initialize progress notification
    const container = document.getElementById('progress-notification-container');
    if (container) {
      this.progressNotification = createProgressNotification({
        container,
        showDetails: true,
        showTimeEstimate: true,
        onCancel: () => {
          this.sendMessage({
            type: 'code-structure:cancel-analysis',
            payload: {}
          });
        }
      });
      this.progressNotification.show();
    }
  }

  /**
   * Handle progress event from backend
   */
  private handleProgressEvent(event: ProgressEvent): void {
    if (this.progressNotification) {
      this.progressNotification.update(event);

      // If complete, hide progress after a delay
      if (event.phase === 'complete') {
        setTimeout(() => {
          if (this.progressNotification) {
            this.progressNotification.dispose();
            this.progressNotification = null;
          }
        }, 2000);
      }

      // If error, keep showing until user dismisses
      if (event.phase === 'error') {
        this.state.isAnalyzing = false;
      }
    }

    webviewLogger.debug(LogCategory.UI, 'Progress event received', 'handleProgressEvent', {
      phase: event.phase,
      percentage: event.percentage,
      message: event.message
    });
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
      this.runAnalysis();
    });
  }

  /**
   * Render analysis results with visualizations
   */
  private async renderAnalysis(analysis: any, visualizations?: any[]): Promise<void> {
    const mainContainer = document.getElementById('code-structure-main');
    if (!mainContainer) return;

    const summary = analysis.summary;
    const categories = analysis.categories || [];

    // Get maturity-adapted summary
    const adaptedSummary = this.maturityAdapter.adaptSummary(summary);

    // Filter categories/issues based on maturity level
    const displayCategories = this.maturityAdapter.shouldShowDetailedMetrics()
      ? categories
      : categories.filter((c: any) => c.priority === 1); // Show only priority 1 for novices

    mainContainer.innerHTML = `
      <div class="analysis-results" data-maturity-level="${this.state.maturityLevel}">
        <!-- Maturity-Adapted Summary -->
        ${adaptedSummary}

        <!-- Visualizations Section (shown based on maturity) -->
        ${this.maturityAdapter.shouldShowVisualizations() ? `
        <div class="visualizations-wrapper">
          <h3>
            ${t('codeStructure.visualizations', 'Visual Analysis')}
            ${this.tooltips.createHelpIcon('visualizations', 'small')}
          </h3>
          <div id="visualizations-container" class="visualizations-container"></div>
        </div>
        ` : ''}

        <!-- Category Results -->
        <div class="categories-container">
          <h3>${t('codeStructure.categories', 'Categories')}</h3>
          <div class="categories-list">
            ${displayCategories.map((cat: any) => this.renderCategoryCard(cat)).join('')}
          </div>
        </div>

        <!-- Actions -->
        <div class="analysis-actions">
          <button id="generate-prompt" class="btn btn-primary">
            ${t('codeStructure.generatePrompt', 'Generate AI Prompt')}
          </button>
          ${this.maturityAdapter.shouldShowAdvancedFeatures() ? `
          <button id="export-report" class="btn btn-secondary">
            ${t('codeStructure.exportReport', 'Export Report')}
          </button>
          <button id="view-raw-data" class="btn btn-secondary">
            View Raw Data
          </button>
          ` : ''}
        </div>
      </div>
    `;

    // Setup event listeners for analysis actions
    this.setupAnalysisActionListeners();

    // Initialize tooltips
    this.tooltips.initializeTooltipListeners();

    // Render visualizations (only if maturity level allows)
    if (this.maturityAdapter.shouldShowVisualizations()) {
      await this.renderVisualizations(analysis, visualizations);
    }

    webviewLogger.info(LogCategory.UI, 'Analysis results rendered', 'renderAnalysis', {
      categories: categories.length,
      issues: summary.totalIssues,
      maturityLevel: this.state.maturityLevel
    });
  }

  /**
   * Handle analysis data from new message format (code-structure-review:data)
   */
  private async handleAnalysisData(data: AnalysisData): Promise<void> {
    webviewLogger.info(LogCategory.UI, 'Received analysis data', 'handleAnalysisData', {
      hasData: !!data,
      score: data.summary?.overallScore,
      categories: data.categories?.length
    });

    this.state.isAnalyzing = false;
    this.state.currentAnalysis = data;

    // Initialize or refresh IntegrationController with new data
    await this.initializeIntegrationController(data);

    this.notifications.show({
      type: 'success',
      message: t('codeStructure.analysisComplete'),
      duration: 3000
    });
  }

  /**
   * Clear analysis and reset to empty state
   */
  private clearAnalysis(): void {
    this.state.currentAnalysis = null;
    this.state.isAnalyzing = false;

    // Dispose integration controller
    if (this.integrationController) {
      this.integrationController.dispose();
      this.integrationController = null;
    }

    // Re-render empty state
    this.render();
  }

  /**
   * Initialize IntegrationController with analysis data
   */
  private async initializeIntegrationController(data: AnalysisData): Promise<void> {
    const container = document.getElementById('code-structure-main');
    if (!container) {
      webviewLogger.error(LogCategory.UI, 'code-structure-main container not found', 'initializeIntegrationController');
      return;
    }

    try {
      // Clear container
      container.innerHTML = '';

      // Dispose existing controller
      if (this.integrationController) {
        this.integrationController.dispose();
      }

      // Create new integration controller
      this.integrationController = createIntegrationController(container, {
        enableCoordinator: true,
        enableKeyboardShortcuts: true,
        enableDeepLinking: false, // Disabled for tab integration
        autoUpdateHash: false,
        autoRender: true
      });

      // Initialize with data
      await this.integrationController.initialize(data);

      webviewLogger.info(LogCategory.UI, 'IntegrationController initialized with analysis data', 'initializeIntegrationController', {
        hasD3: this.integrationController.isD3Available(),
        score: data.summary?.overallScore
      });
    } catch (error) {
      webviewLogger.error(LogCategory.UI, 'Failed to initialize IntegrationController', 'initializeIntegrationController', error);
      this.renderError('Failed to initialize visualizations');
    }
  }

  /**
   * Render visualizations for the analysis (legacy method kept for backward compatibility)
   */
  private async renderVisualizations(analysis: any, visualizationData?: any[]): Promise<void> {
    // Convert to AnalysisData format and use IntegrationController
    const analysisData: AnalysisData = {
      summary: analysis.summary,
      categories: analysis.categories,
      files: visualizationData || [],
      dependencies: [],
      timeline: [],
      testCoverage: {},
      i18n: {}
    };

    await this.initializeIntegrationController(analysisData);
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
   * Handle tab switch
   */
  private handleTabSwitch(category: string | undefined): void {
    if (!category) return;

    // Update active tab styling
    document.querySelectorAll('.category-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    const clickedTab = document.querySelector(`[data-category="${category}"]`);
    if (clickedTab) {
      clickedTab.classList.add('active');
    }

    webviewLogger.info(LogCategory.UI, 'Tab switched', 'handleTabSwitch', { category });

    // If no analysis data, just update the UI state
    if (!this.integrationController || !this.state.currentAnalysis) {
      return;
    }

    // Navigate to the appropriate view
    if (category === 'overview') {
      this.integrationController.navigateToOverview();
    } else {
      // Map category ID to category name and navigate
      const categoryMap: Record<string, { id: string; name: string }> = {
        'ui-ux': { id: 'ui-ux-quality', name: 'UI/UX Quality' },
        'test-coverage': { id: 'test-coverage', name: 'Test Coverage' },
        'i18n': { id: 'internationalization', name: 'Internationalization' },
        'features': { id: 'feature-completeness', name: 'Feature Completeness' }
      };

      const categoryInfo = categoryMap[category];
      if (categoryInfo) {
        this.integrationController.navigateToCategoryDetail(categoryInfo.id, categoryInfo.name);
      }
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Tab navigation
    document.querySelectorAll('.category-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const button = e.target as HTMLButtonElement;
        const category = button.dataset.category;
        this.handleTabSwitch(category);
      });
    });

    // Run analysis button
    const runAnalysisButton = document.getElementById('run-analysis');
    console.log('[CodeStructureViewController] Run Analysis button found:', runAnalysisButton);
    webviewLogger.debug(LogCategory.UI, 'Run Analysis button element', 'setupEventListeners', {
      found: !!runAnalysisButton,
      elementId: runAnalysisButton?.id
    }, LogPathway.WEBVIEW_MESSAGING);

    if (runAnalysisButton) {
      runAnalysisButton.addEventListener('click', () => {
        console.log('[CodeStructureViewController] Run Analysis button clicked!');
        webviewLogger.info(LogCategory.UI, 'Run Analysis button clicked', 'runAnalysisButton.click', undefined, LogPathway.WEBVIEW_MESSAGING);
        this.runAnalysis();
      });
      console.log('[CodeStructureViewController] Run Analysis button event listener attached');
      webviewLogger.info(LogCategory.UI, 'Run Analysis button listener attached', 'setupEventListeners', undefined, LogPathway.WEBVIEW_MESSAGING);
    } else {
      console.error('[CodeStructureViewController] Run Analysis button NOT FOUND');
      webviewLogger.error(LogCategory.UI, 'Run Analysis button not found in DOM', 'setupEventListeners', undefined, LogPathway.WEBVIEW_MESSAGING);
    }

    // Maturity level selector
    document.getElementById('maturity-level-select')?.addEventListener('change', (e) => {
      const select = e.target as HTMLSelectElement;
      this.state.maturityLevel = select.value as MaturityLevel;

      // Update adapters
      this.maturityAdapter.setLevel(this.state.maturityLevel);
      this.tooltips.setMaturityLevel(this.state.maturityLevel);

      // Re-render if we have analysis data
      if (this.state.currentAnalysis) {
        this.renderAnalysis(this.state.currentAnalysis);
      }

      // Notify backend
      this.sendMessage({
        type: 'code-structure:maturity-changed',
        payload: { maturityLevel: this.state.maturityLevel }
      });

      webviewLogger.info(LogCategory.UI, 'Maturity level changed', 'maturity-level-select', {
        level: this.state.maturityLevel
      });
    });

    // Visualization interaction events
    this.setupVisualizationEventListeners();

    webviewLogger.debug(LogCategory.UI, 'Event listeners setup complete', 'setupEventListeners');
  }

  /**
   * Setup visualization interaction event listeners
   */
  private setupVisualizationEventListeners(): void {
    // Listen for bubble chart clicks (category drill-down)
    window.addEventListener('bubble-click', ((event: CustomEvent) => {
      const { categoryId, categoryName } = event.detail;
      webviewLogger.info(LogCategory.UI, 'Bubble clicked', 'bubble-click', { categoryId });
      this.showCategoryIssues(categoryId);
    }) as EventListener);

    // Listen for heatmap cell clicks (file navigation)
    window.addEventListener('heatmap-cell-click', ((event: CustomEvent) => {
      const { filePath, issueCount } = event.detail;
      webviewLogger.info(LogCategory.UI, 'Heatmap cell clicked', 'heatmap-cell-click', { filePath });

      // Show issues for this specific file
      if (this.state.currentAnalysis) {
        this.showFileIssues(filePath);
      }
    }) as EventListener);
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
   * Run analysis
   */
  private runAnalysis(): void {
    console.log('[CodeStructureViewController] runAnalysis() called');
    console.log('[CodeStructureViewController] messageHandler exists:', !!this.messageHandler);
    console.log('[CodeStructureViewController] window.vscode exists:', !!(window as any).vscode);

    webviewLogger.info(LogCategory.UI, 'Run Analysis method called', 'runAnalysis', {
      hasMessageHandler: !!this.messageHandler,
      hasVscode: !!(window as any).vscode
    }, LogPathway.WEBVIEW_MESSAGING);

    this.sendMessage({
      type: 'code-structure-review:run-analysis',
      payload: {}
    });

    webviewLogger.info(LogCategory.UI, 'Analysis request message sent', 'runAnalysis', undefined, LogPathway.WEBVIEW_MESSAGING);
    console.log('[CodeStructureViewController] Analysis request message sent to extension');
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
      if (this.state.currentAnalysis) {
        this.renderAnalysis(this.state.currentAnalysis);
      }
    });
  }

  /**
   * Show issues for a specific file
   */
  private showFileIssues(filePath: string): void {
    if (!this.state.currentAnalysis) return;

    const mainContainer = document.getElementById('code-structure-main');
    if (!mainContainer) return;

    // Collect all issues for this file across all categories
    const allIssues: any[] = [];
    for (const category of this.state.currentAnalysis.categories || []) {
      const fileIssues = (category.issues || []).filter((issue: any) => issue.filePath === filePath);
      allIssues.push(...fileIssues.map((issue: any) => ({ ...issue, category: category.categoryName })));
    }

    if (allIssues.length === 0) {
      webviewLogger.warn(LogCategory.UI, 'No issues found for file', 'showFileIssues', { filePath });
      return;
    }

    const fileName = filePath.split('/').pop() || filePath;

    mainContainer.innerHTML = `
      <div class="file-issues-view">
        <button id="back-to-summary" class="btn-link back-btn">← ${t('codeStructure.backToSummary', 'Back to Summary')}</button>

        <div class="file-issues-header">
          <h3>${fileName}</h3>
          <div class="file-path">${filePath}</div>
          <div class="issue-count">${allIssues.length} issue${allIssues.length !== 1 ? 's' : ''}</div>
        </div>

        <div class="issues-list">
          ${allIssues.map((issue: any) => this.renderIssueCard(issue)).join('')}
        </div>
      </div>
    `;

    // Setup back button
    document.getElementById('back-to-summary')?.addEventListener('click', () => {
      if (this.state.currentAnalysis) {
        this.renderAnalysis(this.state.currentAnalysis);
      }
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
    console.log('[CodeStructureViewController] sendMessage() called with:', message);

    if (this.messageHandler) {
      console.log('[CodeStructureViewController] Calling messageHandler with message');
      webviewLogger.debug(LogCategory.UI, 'Sending message via messageHandler', 'sendMessage', {
        type: message.type
      }, LogPathway.WEBVIEW_MESSAGING);

      try {
        this.messageHandler(message);
        console.log('[CodeStructureViewController] messageHandler called successfully');
        webviewLogger.debug(LogCategory.UI, 'Message sent successfully', 'sendMessage', undefined, LogPathway.WEBVIEW_MESSAGING);
      } catch (error) {
        console.error('[CodeStructureViewController] Error calling messageHandler:', error);
        webviewLogger.error(LogCategory.UI, 'Error sending message', 'sendMessage', error, LogPathway.WEBVIEW_MESSAGING);
      }
    } else {
      console.warn('[CodeStructureViewController] No message handler set!');
      webviewLogger.warn(LogCategory.UI, 'No message handler set', 'sendMessage', undefined, LogPathway.WEBVIEW_MESSAGING);
    }
  }
}
