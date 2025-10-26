/**
 * ThreadingViewController - Main controller for Threading tab
 *
 * Manages the threading dashboard, timeline visualization, and analysis panels.
 */

import { t } from '../../webview/i18n';

export interface ThreadingViewState {
  enabled: boolean;
  mode: 'disabled' | 'development' | 'debugging' | 'learning';
  activeThreads: string[];
  sessionActive: boolean;
}

export class ThreadingViewController {
  private state: ThreadingViewState;
  private messageHandler: ((message: any) => void) | null = null;

  constructor() {
    this.state = {
      enabled: false,
      mode: 'disabled',
      activeThreads: [],
      sessionActive: false
    };
  }

  /**
   * Initialize the threading view controller
   */
  initialize(onMessage: (message: any) => void): void {
    this.messageHandler = onMessage;
    this.setupEventListeners();
    this.render();

    // Request initial state from backend
    this.sendMessage({ type: 'threading:get-state', payload: {} });
  }

  /**
   * Handle messages from the extension
   */
  handleMessage(message: any): void {
    switch (message.type) {
      case 'threading:state':
        this.updateState(message.payload);
        break;

      case 'threading:timeline-data':
        this.renderTimeline(message.payload);
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
    }
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
              <!-- Bottlenecks -->
              <div class="threading-panel">
                <h4>${t('threading.bottlenecks')}</h4>
                <div id="threading-bottlenecks" class="panel-content">
                  <p class="empty-state-text">${t('threading.noBottlenecks')}</p>
                </div>
              </div>

              <!-- Patterns -->
              <div class="threading-panel">
                <h4>${t('threading.patterns')}</h4>
                <div id="threading-patterns" class="panel-content">
                  <p class="empty-state-text">${t('threading.noPatterns')}</p>
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
    return '<p class="empty-state-text">${t(\'threading.loadingThreads\')}</p>';
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
  private renderTimeline(data: any): void {
    const timeline = document.getElementById('threading-timeline');
    if (!timeline) return;

    // TODO: Implement D3.js timeline visualization
    // For now, show placeholder
    timeline.innerHTML = `
      <div class="timeline-placeholder">
        <p>${t('threading.timelineComingSoon')}</p>
        <pre>${JSON.stringify(data, null, 2)}</pre>
      </div>
    `;
  }

  /**
   * Render analysis results
   */
  private renderAnalysis(data: any): void {
    // Update bottlenecks
    const bottlenecks = document.getElementById('threading-bottlenecks');
    if (bottlenecks && data.bottlenecks) {
      bottlenecks.innerHTML = this.renderBottlenecks(data.bottlenecks);
    }

    // Update patterns
    const patterns = document.getElementById('threading-patterns');
    if (patterns && data.patterns) {
      patterns.innerHTML = this.renderPatterns(data.patterns);
    }
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
  private renderPatterns(patterns: any[]): string {
    if (!patterns || patterns.length === 0) {
      return `<p class="empty-state-text">${t('threading.noPatterns')}</p>`;
    }

    return patterns.map(p => `
      <div class="pattern-card">
        <div class="pattern-header">
          <span class="pattern-name">${p.name}</span>
          <span class="pattern-confidence">${(p.confidence * 100).toFixed(0)}%</span>
        </div>
        <p class="pattern-description">${p.description}</p>
        ${p.recommendation ? `<p class="pattern-recommendation">${p.recommendation}</p>` : ''}
      </div>
    `).join('');
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
  }

  /**
   * Send message to extension
   */
  private sendMessage(message: any): void {
    if (this.messageHandler) {
      this.messageHandler(message);
    }
  }
}
