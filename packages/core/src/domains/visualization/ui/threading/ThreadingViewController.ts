/**
 * ThreadingViewController - Main controller for Threading tab
 *
 * Manages the threading dashboard, timeline visualization, and analysis panels.
 * Integrates with Phase 2 pattern detection and analysis system.
 * Phase 2: Multi-tier support with AdaptiveControlCenter and LevelSelector.
 */

import { t, onI18nReady } from '../../webview/i18n';
import type { AnalysisReport, DetectedPattern, AnalysisInsight, Recommendation, MaturityLevel, DetectionResult } from '../../../threading/types';
import { AdaptiveControlCenter } from '../../../threading/ui/AdaptiveControlCenter';
import { LevelSelector } from '../../../threading/ui/LevelSelector';
import { ThreadingTimeline, type ThreadingTimelineData } from '../../webview/visualizations/ThreadingTimeline';

export interface ThreadingViewState {
  enabled: boolean;
  mode: 'disabled' | 'development' | 'debugging' | 'learning';
  activeThreads: string[];
  sessionActive: boolean;
  // Multi-tier state
  multiTierEnabled?: boolean;
  detectedLevel?: MaturityLevel;
  targetLevel?: MaturityLevel;
  showLevelSelector?: boolean;
}

export class ThreadingViewController {
  private state: ThreadingViewState;
  private messageHandler: ((message: any) => void) | null = null;
  private controlCenter: AdaptiveControlCenter | null = null;
  private levelSelector: LevelSelector | null = null;
  private timelineVisualization: ThreadingTimeline | null = null;

  constructor() {
    this.state = {
      enabled: false,
      mode: 'disabled',
      activeThreads: [],
      sessionActive: false,
      multiTierEnabled: false,
      showLevelSelector: false
    };

    // Note: Following KnowledgeViewController pattern - no onI18nReady in constructor
    // Initialize() handles rendering directly, t() provides fallback translations if i18n not ready
  }

  /**
   * Initialize the threading view controller
   */
  initialize(onMessage: (message: any) => void): void {
    this.messageHandler = onMessage;

    // Render immediately - t() provides fallback translations if i18n not ready yet
    // Following KnowledgeViewController pattern: direct render, no onI18nReady wrapper
    console.log('[ThreadingViewController] Rendering with translations');
    this.render();
    this.setupEventListeners();

    // Request initial state from backend
    this.sendMessage({ type: 'threading:get-state', payload: {} });
  }

  /**
   * Handle messages from the extension
   */
  async handleMessage(message: any): Promise<void> {
    switch (message.type) {
      case 'threading:state':
        this.updateState(message.payload);
        break;

      case 'threading:timeline-data':
        await this.renderTimeline(message.payload);
        break;

      case 'threading:analysis-data':
        this.renderAnalysis(message.payload);
        break;

      case 'threading:session-started':
        this.state.sessionActive = true;
        this.updateStatusPanel();
        break;

      case 'threading:session-ended':
        this.state.sessionActive = false;
        this.updateStatusPanel();
        break;

      // Multi-tier system messages
      case 'threading:detection-result':
        await this.handleDetectionResult(message.payload);
        break;

      case 'threading:level-changed':
        this.handleLevelChanged(message.payload);
        break;
    }
  }

  /**
   * Handle detection result from maturity detector
   */
  private async handleDetectionResult(result: DetectionResult): Promise<void> {
    this.state.detectedLevel = result.detectedLevel;
    this.state.targetLevel = result.configuredLevel;

    // Initialize control center if workspace path available
    if ((window as any).workspacePath) {
      this.controlCenter = new AdaptiveControlCenter({
        workspacePath: (window as any).workspacePath,
        targetLevel: result.configuredLevel,
        autoDetect: true
      });

      const controlState = await this.controlCenter.initialize();

      // Initialize level selector
      this.levelSelector = new LevelSelector({
        currentLevel: result.detectedLevel,
        targetLevel: result.configuredLevel,
        onLevelSelect: (level) => {
          this.sendMessage({
            type: 'threading:set-target-level',
            payload: { level }
          });
        }
      });
    }

    // Re-render to show control center
    this.renderMultiTierSection();
  }

  /**
   * Handle level change notification
   */
  private handleLevelChanged(payload: { from: MaturityLevel; to: MaturityLevel }): void {
    this.state.detectedLevel = payload.to;

    // Re-initialize level selector
    if (this.levelSelector) {
      this.levelSelector = new LevelSelector({
        currentLevel: payload.to,
        targetLevel: this.state.targetLevel,
        onLevelSelect: (level) => {
          this.sendMessage({
            type: 'threading:set-target-level',
            payload: { level }
          });
        }
      });
    }

    // Re-render multi-tier section
    this.renderMultiTierSection();
  }

  /**
   * Update state from backend
   */
  private updateState(state: Partial<ThreadingViewState>): void {
    this.state = { ...this.state, ...state };
    this.updateStatusPanel();
  }

  /**
   * Render the complete threading view
   */
  render(): void {
    const container = document.getElementById('threading-content');
    if (!container) {
      console.error('[ThreadingViewController] threading-content container not found');
      return;
    }

    container.innerHTML = `
      <div class="threading-container">
        <!-- Status Panel -->
        <div class="threading-status-panel" id="threading-status-panel">
          ${this.renderStatusPanel()}
        </div>

        <!-- Multi-Tier Control Center and Level Selector -->
        <div class="threading-multi-tier-section" id="threading-multi-tier">
          <!-- Will be populated by renderMultiTierSection() -->
        </div>

        <!-- Main Content Area -->
        <div class="threading-main">
          <!-- Timeline Visualization -->
          <div class="threading-timeline-section">
            <h3>${t('threading.timeline')}</h3>
            <div id="threading-timeline" class="threading-timeline">
              <div class="empty-state">
                <span class="codicon codicon-graph-line"></span>
                <p>${t('threading.noData')}</p>
                <p class="help-text">${t('threading.enableThreading')}</p>
              </div>
            </div>
          </div>

          <!-- Analysis Panels -->
          <div class="threading-analysis-section">
            <div class="threading-panels">
              <!-- Patterns -->
              <div class="threading-panel">
                <div class="panel-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                  <h4 style="margin: 0;">${t('threading.patterns')}</h4>
                  <button id="analyze-now-btn" class="btn-secondary" style="font-size: 12px; padding: 4px 12px;">
                    Analyze Now
                  </button>
                </div>
                <div id="threading-patterns" class="panel-content">
                  <p class="empty-state-text">${t('threading.noPatterns')}</p>
                </div>
              </div>

              <!-- Insights -->
              <div class="threading-panel">
                <h4>${t('threading.insights')}</h4>
                <div id="threading-insights" class="panel-content">
                  <p class="empty-state-text">${t('threading.noInsights')}</p>
                </div>
              </div>

              <!-- Recommendations -->
              <div class="threading-panel">
                <h4>${t('threading.recommendations')}</h4>
                <div id="threading-recommendations" class="panel-content">
                  <p class="empty-state-text">${t('threading.noRecommendations')}</p>
                </div>
              </div>

              <!-- Bottlenecks -->
              <div class="threading-panel">
                <h4>${t('threading.bottlenecks')}</h4>
                <div id="threading-bottlenecks" class="panel-content">
                  <p class="empty-state-text">${t('threading.noBottlenecks')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render status panel
   */
  private renderStatusPanel(): string {
    const statusIcon = this.getStatusIcon();
    const statusText = this.getStatusText();

    return `
      <div class="status-header">
        <span class="status-icon">${statusIcon}</span>
        <span class="status-text">${statusText}</span>
      </div>

      <div class="status-controls">
        <button class="btn-primary" id="threading-toggle" title="${t('threading.toggleThreading')}">
          ${this.state.enabled ? t('threading.disable') : t('threading.enable')}
        </button>

        <button class="btn-secondary" id="threading-session" ${this.state.sessionActive ? 'disabled' : ''} title="${t('threading.startSession')}">
          ${this.state.sessionActive ? t('threading.sessionActive') : t('threading.startSession')}
        </button>
      </div>

      <div class="status-info">
        <div class="info-row">
          <span class="label">${t('threading.mode')}:</span>
          <span class="value">${this.state.mode}</span>
        </div>
        <div class="info-row">
          <span class="label">${t('threading.activeThreads')}:</span>
          <span class="value">${this.state.activeThreads.length || 0}</span>
        </div>
      </div>

      <div class="thread-list">
        <h4>${t('threading.threads')}</h4>
        <div id="thread-checkboxes">
          ${this.renderThreadCheckboxes()}
        </div>
      </div>
    `;
  }

  /**
   * Render thread checkboxes
   */
  private renderThreadCheckboxes(): string {
    // Placeholder - will be populated from backend config
    return `<p class="empty-state-text">${t('threading.loadingThreads')}</p>`;
  }

  /**
   * Update status panel
   */
  private updateStatusPanel(): void {
    const panel = document.getElementById('threading-status-panel');
    if (panel) {
      panel.innerHTML = this.renderStatusPanel();
      this.attachStatusPanelListeners();
    }
  }

  /**
   * Get status icon
   */
  private getStatusIcon(): string {
    if (!this.state.enabled) return '🔴';
    if (this.state.mode === 'debugging') return '🟢';
    if (this.state.mode === 'development') return '🟡';
    if (this.state.mode === 'learning') return '🔵';
    return '⚪';
  }

  /**
   * Get status text
   */
  private getStatusText(): string {
    if (!this.state.enabled) return t('threading.disabled');
    return t(`threading.mode.${this.state.mode}`);
  }

  /**
   * Render timeline visualization
   */
  private async renderTimeline(data: ThreadingTimelineData): Promise<void> {
    const container = document.getElementById('threading-timeline');
    if (!container) {
      console.error('[ThreadingViewController] threading-timeline container not found');
      return;
    }

    try {
      // Clear empty state if present
      container.innerHTML = '';

      // Create timeline visualization if not already created
      if (!this.timelineVisualization) {
        this.timelineVisualization = new ThreadingTimeline(container, {
          width: container.clientWidth || 800,
          height: 400,
          margin: { top: 40, right: 40, bottom: 40, left: 120 }
        });

        await this.timelineVisualization.initialize();
      }

      // Render timeline with data
      if (data && data.events && data.events.length > 0) {
        console.log(`[ThreadingViewController] Rendering timeline with ${data.events.length} events`);
        await this.timelineVisualization.render(data);
      } else {
        console.log('[ThreadingViewController] No timeline data to render');
        container.innerHTML = `
          <div class="empty-state">
            <span class="codicon codicon-graph-line"></span>
            <p>${t('threading.noData')}</p>
            <p class="help-text">${t('threading.startSessionToSeeData')}</p>
          </div>
        `;
      }
    } catch (error) {
      console.error('[ThreadingViewController] Failed to render timeline:', error);
      container.innerHTML = `
        <div class="error-state">
          <span class="codicon codicon-error"></span>
          <p>Failed to render timeline visualization</p>
          <p class="help-text">${error}</p>
        </div>
      `;
    }
  }

  /**
   * Render analysis results from AnalysisReport
   */
  private renderAnalysis(report: AnalysisReport | any): void {
    // Handle both AnalysisReport and legacy format
    const analysisData = report as AnalysisReport;

    // Update patterns
    const patterns = document.getElementById('threading-patterns');
    if (patterns && analysisData.patterns) {
      patterns.innerHTML = this.renderPatterns(analysisData.patterns);
    }

    // Update insights
    const insights = document.getElementById('threading-insights');
    if (insights && analysisData.insights) {
      insights.innerHTML = this.renderInsights(analysisData.insights);
    }

    // Update recommendations
    const recommendations = document.getElementById('threading-recommendations');
    if (recommendations && analysisData.recommendations) {
      recommendations.innerHTML = this.renderRecommendations(analysisData.recommendations);
    }

    // Update bottlenecks (legacy support)
    const bottlenecks = document.getElementById('threading-bottlenecks');
    if (bottlenecks) {
      // Check if data has bottlenecks in legacy format or new format
      const bottleneckData = (report as any).bottlenecks || [];
      bottlenecks.innerHTML = this.renderBottlenecks(bottleneckData);
    }

    // Show summary if available
    if (analysisData.summary) {
      this.showAnalysisSummary(analysisData.summary);
    }
  }

  /**
   * Show analysis summary notification
   */
  private showAnalysisSummary(summary: string): void {
    console.log('[ThreadingViewController] Analysis Summary:\n', summary);
    // Could show a toast notification here
  }

  /**
   * Render bottlenecks list
   */
  private renderBottlenecks(bottlenecks: any[]): string {
    if (!bottlenecks || bottlenecks.length === 0) {
      return `<p class="empty-state-text">${t('threading.noBottlenecks')}</p>`;
    }

    return `
      <table class="bottleneck-table">
        <thead>
          <tr>
            <th>${t('threading.function')}</th>
            <th>${t('threading.avg')}</th>
            <th>${t('threading.max')}</th>
            <th>${t('threading.calls')}</th>
          </tr>
        </thead>
        <tbody>
          ${bottlenecks.map(b => `
            <tr>
              <td>${b.function}</td>
              <td>${b.avg}ms</td>
              <td>${b.max}ms</td>
              <td>${b.calls}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  /**
   * Render detected patterns
   */
  private renderPatterns(patterns: DetectedPattern[]): string {
    if (!patterns || patterns.length === 0) {
      return `<p class="empty-state-text">${t('threading.noPatterns')}</p>`;
    }

    return patterns.map(p => {
      const impactColor = this.getImpactColor(p.impact);
      const impactIcon = this.getImpactIcon(p.impact);

      return `
        <div class="pattern-card pattern-${p.impact}">
          <div class="pattern-header">
            <div class="pattern-title">
              <span class="pattern-icon">${impactIcon}</span>
              <span class="pattern-name">${this.escapeHtml(p.name)}</span>
              <span class="pattern-type" style="font-size: 11px; color: var(--vscode-descriptionForeground);">${p.type}</span>
            </div>
            <div class="pattern-badges">
              <span class="pattern-confidence" style="background: rgba(0, 255, 136, 0.15); padding: 2px 8px; border-radius: 3px; font-size: 11px;">
                ${(p.confidence * 100).toFixed(0)}% confidence
              </span>
              <span class="pattern-impact" style="background: ${impactColor}; padding: 2px 8px; border-radius: 3px; font-size: 11px; color: white; font-weight: 600;">
                ${p.impact.toUpperCase()}
              </span>
            </div>
          </div>

          <p class="pattern-description" style="margin: 8px 0; line-height: 1.5;">
            ${this.escapeHtml(p.description)}
          </p>

          ${p.affectedFunctions && p.affectedFunctions.length > 0 ? `
            <div class="pattern-affected" style="margin: 8px 0; font-size: 12px;">
              <strong>Affected:</strong>
              <code style="background: rgba(0, 212, 255, 0.05); padding: 2px 6px; border-radius: 3px;">
                ${p.affectedFunctions.join(', ')}
              </code>
            </div>
          ` : ''}

          ${p.evidence?.recommendation ? `
            <div class="pattern-recommendation" style="margin-top: 12px; padding: 12px; background: rgba(0, 212, 255, 0.05); border-left: 3px solid rgba(0, 212, 255, 0.5); border-radius: 3px;">
              <div style="font-weight: 600; margin-bottom: 4px; font-size: 12px;">💡 Recommendation</div>
              <div style="font-size: 12px; line-height: 1.5;">${this.escapeHtml(p.evidence.recommendation)}</div>
            </div>
          ` : ''}

          <details class="pattern-evidence" style="margin-top: 8px; font-size: 12px;">
            <summary style="cursor: pointer; color: var(--vscode-textLink-foreground); user-select: none;">
              View Evidence
            </summary>
            <pre style="margin-top: 8px; padding: 8px; background: var(--vscode-editor-background); border-radius: 3px; overflow-x: auto; font-size: 11px;">
${JSON.stringify(p.evidence, null, 2)}</pre>
          </details>
        </div>
      `;
    }).join('');
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.attachStatusPanelListeners();
  }

  /**
   * Attach status panel listeners
   */
  private attachStatusPanelListeners(): void {
    // Toggle button
    const toggleBtn = document.getElementById('threading-toggle');
    toggleBtn?.addEventListener('click', () => {
      this.sendMessage({
        type: 'threading:toggle',
        payload: { enable: !this.state.enabled }
      });
    });

    // Session button
    const sessionBtn = document.getElementById('threading-session');
    sessionBtn?.addEventListener('click', () => {
      this.sendMessage({
        type: 'threading:start-session',
        payload: {}
      });
    });

    // Analyze Now button
    const analyzeBtn = document.getElementById('analyze-now-btn');
    analyzeBtn?.addEventListener('click', () => {
      this.requestAnalysis();
    });
  }

  /**
   * Request analysis from backend
   */
  private requestAnalysis(): void {
    console.log('[ThreadingViewController] Requesting analysis');
    this.sendMessage({
      type: 'threading:analyze',
      payload: {}
    });
  }

  /**
   * Export analysis report to JSON
   */
  exportAnalysisReport(report: AnalysisReport): void {
    const dataStr = JSON.stringify(report, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `threading-analysis-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    URL.revokeObjectURL(url);

    console.log('[ThreadingViewController] Analysis report exported');
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
   * Get color for impact level
   */
  private getImpactColor(impact: 'low' | 'medium' | 'high' | 'critical'): string {
    switch (impact) {
      case 'critical': return '#d32f2f';
      case 'high': return '#ff6b35';
      case 'medium': return '#ffb700';
      case 'low': return '#00897b';
      default: return '#757575';
    }
  }

  /**
   * Get icon for impact level
   */
  private getImpactIcon(impact: 'low' | 'medium' | 'high' | 'critical'): string {
    switch (impact) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
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
   * Render analysis insights
   */
  private renderInsights(insights: AnalysisInsight[]): string {
    if (!insights || insights.length === 0) {
      return `<p class="empty-state-text">${t('threading.noInsights')}</p>`;
    }

    return `
      <div class="insights-container">
        ${insights.map(insight => {
          const severityColor = this.getSeverityColor(insight.severity);
          const categoryIcon = this.getCategoryIcon(insight.category);

          return `
            <div class="insight-card insight-${insight.severity}">
              <div class="insight-header">
                <span class="insight-icon">${categoryIcon}</span>
                <span class="insight-title">${this.escapeHtml(insight.title)}</span>
                <span class="insight-severity" style="background: ${severityColor}; padding: 2px 8px; border-radius: 3px; font-size: 11px; color: white;">
                  ${insight.severity.toUpperCase()}
                </span>
              </div>
              <p class="insight-description" style="margin: 8px 0; font-size: 12px; line-height: 1.5;">
                ${this.escapeHtml(insight.description)}
              </p>
              ${insight.rootCause ? `
                <div class="insight-root-cause" style="margin-top: 8px; padding: 8px; background: rgba(255, 107, 53, 0.05); border-left: 3px solid rgba(255, 107, 53, 0.5); border-radius: 3px; font-size: 12px;">
                  <strong>Root Cause:</strong> ${this.escapeHtml(insight.rootCause)}
                </div>
              ` : ''}
              ${insight.relatedPatterns && insight.relatedPatterns.length > 0 ? `
                <div class="insight-related" style="margin-top: 8px; font-size: 11px; color: var(--vscode-descriptionForeground);">
                  Related patterns: ${insight.relatedPatterns.join(', ')}
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  /**
   * Render recommendations
   */
  private renderRecommendations(recommendations: Recommendation[]): string {
    if (!recommendations || recommendations.length === 0) {
      return `<p class="empty-state-text">${t('threading.noRecommendations')}</p>`;
    }

    return `
      <div class="recommendations-container">
        ${recommendations.map((rec, index) => {
          const priorityColor = this.getPriorityColor(rec.priority);
          const priorityIcon = this.getPriorityIcon(rec.priority);

          return `
            <div class="recommendation-card recommendation-${rec.priority}">
              <div class="recommendation-header">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="recommendation-number" style="background: rgba(0, 212, 255, 0.15); padding: 4px 8px; border-radius: 50%; font-weight: 600; font-size: 12px; min-width: 28px; text-align: center;">
                    ${index + 1}
                  </span>
                  <span class="recommendation-icon">${priorityIcon}</span>
                  <span class="recommendation-title" style="font-weight: 600;">${this.escapeHtml(rec.title)}</span>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                  <span class="recommendation-priority" style="background: ${priorityColor}; padding: 2px 8px; border-radius: 3px; font-size: 11px; color: white;">
                    ${rec.priority.toUpperCase()}
                  </span>
                  <span class="recommendation-effort" style="background: rgba(128, 128, 128, 0.2); padding: 2px 8px; border-radius: 3px; font-size: 11px;">
                    ${rec.effort}
                  </span>
                </div>
              </div>
              <p class="recommendation-description" style="margin: 12px 0; font-size: 13px; line-height: 1.5;">
                ${this.escapeHtml(rec.description)}
              </p>
              ${rec.steps && rec.steps.length > 0 ? `
                <div class="recommendation-steps" style="margin-top: 12px;">
                  <div style="font-weight: 600; margin-bottom: 8px; font-size: 12px;">Steps:</div>
                  <ol style="margin: 0; padding-left: 20px; font-size: 12px; line-height: 1.6;">
                    ${rec.steps.map(step => `<li>${this.escapeHtml(step)}</li>`).join('')}
                  </ol>
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  /**
   * Get color for severity
   */
  private getSeverityColor(severity: 'info' | 'warning' | 'error' | 'critical'): string {
    switch (severity) {
      case 'critical': return '#d32f2f';
      case 'error': return '#ff6b35';
      case 'warning': return '#ffb700';
      case 'info': return '#0288d1';
      default: return '#757575';
    }
  }

  /**
   * Get icon for category
   */
  private getCategoryIcon(category: 'performance' | 'error' | 'memory' | 'cache' | 'architecture'): string {
    switch (category) {
      case 'performance': return '⚡';
      case 'error': return '❌';
      case 'memory': return '💾';
      case 'cache': return '📦';
      case 'architecture': return '🏗️';
      default: return '📊';
    }
  }

  /**
   * Get color for priority
   */
  private getPriorityColor(priority: 'low' | 'medium' | 'high' | 'urgent'): string {
    switch (priority) {
      case 'urgent': return '#d32f2f';
      case 'high': return '#ff6b35';
      case 'medium': return '#ffb700';
      case 'low': return '#00897b';
      default: return '#757575';
    }
  }

  /**
   * Get icon for priority
   */
  private getPriorityIcon(priority: 'low' | 'medium' | 'high' | 'urgent'): string {
    switch (priority) {
      case 'urgent': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '📌';
      case 'low': return '💡';
      default: return '📋';
    }
  }

  /**
   * Render multi-tier section (control center and level selector)
   */
  private renderMultiTierSection(): void {
    const container = document.getElementById('threading-multi-tier');
    if (!container) {
      console.warn('[ThreadingViewController] Multi-tier container not found');
      return;
    }

    let html = '';

    // Render control center if initialized
    if (this.controlCenter) {
      html += `
        <div class="multi-tier-control-center">
          ${this.controlCenter.renderHTML()}
        </div>
      `;
    }

    // Render level selector if enabled
    if (this.state.showLevelSelector && this.levelSelector) {
      html += `
        <div class="multi-tier-level-selector">
          <button class="btn btn-secondary" id="toggle-level-selector">
            ${this.state.showLevelSelector ? 'Hide' : 'Show'} Level Selector
          </button>
          <div id="level-selector-content" style="margin-top: 16px;">
            ${this.levelSelector.renderHTML()}
          </div>
        </div>
      `;
    }

    container.innerHTML = html || '<p class="empty-state-text">Multi-tier system not initialized</p>';

    // Attach event listeners for multi-tier controls
    this.attachMultiTierListeners();
  }

  /**
   * Attach event listeners for multi-tier controls
   */
  private attachMultiTierListeners(): void {
    // Upgrade actions
    document.querySelectorAll('[data-action="start-upgrade"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetLevel = this.state.targetLevel;
        if (targetLevel !== undefined) {
          this.sendMessage({
            type: 'threading:start-upgrade',
            payload: { targetLevel }
          });
        }
      });
    });

    // View guide actions
    document.querySelectorAll('[data-action="view-guide"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const level = (e.target as HTMLElement).dataset.level;
        this.sendMessage({
          type: 'threading:view-guide',
          payload: { level: level ? parseInt(level) : undefined }
        });
      });
    });

    // Use detected level action
    document.querySelectorAll('[data-action="use-detected"]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.state.detectedLevel !== undefined) {
          this.sendMessage({
            type: 'threading:set-target-level',
            payload: { level: this.state.detectedLevel }
          });
        }
      });
    });

    // Level upgrade/downgrade actions
    document.querySelectorAll('[data-action="upgrade"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const level = parseInt((e.target as HTMLElement).dataset.level || '0');
        this.sendMessage({
          type: 'threading:set-target-level',
          payload: { level }
        });
      });
    });

    document.querySelectorAll('[data-action="downgrade"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const level = parseInt((e.target as HTMLElement).dataset.level || '0');
        this.sendMessage({
          type: 'threading:set-target-level',
          payload: { level }
        });
      });
    });

    // Apply recommendation actions
    document.querySelectorAll('[data-action="apply-recommendation"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const recId = (e.target as HTMLElement).dataset.recId;
        this.sendMessage({
          type: 'threading:apply-recommendation',
          payload: { recommendationId: recId }
        });
      });
    });

    // Toggle level selector
    const toggleBtn = document.getElementById('toggle-level-selector');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.state.showLevelSelector = !this.state.showLevelSelector;
        const content = document.getElementById('level-selector-content');
        if (content) {
          content.style.display = this.state.showLevelSelector ? 'block' : 'none';
        }
        toggleBtn.textContent = this.state.showLevelSelector ? 'Hide Level Selector' : 'Show Level Selector';
      });
    }
  }

  /**
   * Destroy and clean up resources
   */
  destroy(): void {
    console.log('[ThreadingViewController] Cleaning up resources');

    // Clean up timeline visualization
    if (this.timelineVisualization) {
      this.timelineVisualization.destroy();
      this.timelineVisualization = null;
    }

    // Clean up control center
    if (this.controlCenter) {
      // AdaptiveControlCenter doesn't have a destroy method, but we can null it
      this.controlCenter = null;
    }

    // Clean up level selector
    if (this.levelSelector) {
      // LevelSelector doesn't have a destroy method, but we can null it
      this.levelSelector = null;
    }

    // Clear message handler
    this.messageHandler = null;
  }
}
