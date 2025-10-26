/**
 * AdaptiveControlCenter - UI that adapts to detected maturity level
 *
 * Provides appropriate controls and guidance based on what's actually
 * implemented (not just configured).
 */

import { MaturityLevel, DetectionResult, LevelRecommendation } from '../types';
import { MaturityDetector } from '../detection/MaturityDetector';

export interface ControlCenterConfig {
  workspacePath: string;
  targetLevel?: MaturityLevel;
  autoDetect?: boolean;
}

export interface ControlCenterState {
  detectedLevel: MaturityLevel;
  configuredLevel?: MaturityLevel;
  detection: DetectionResult;
  showUpgradeGuidance: boolean;
  showLevelSelector: boolean;
}

export class AdaptiveControlCenter {
  private detector: MaturityDetector;
  private config: ControlCenterConfig;
  private state: ControlCenterState | null = null;

  constructor(config: ControlCenterConfig) {
    this.config = config;
    this.detector = new MaturityDetector();
  }

  /**
   * Initialize control center - detect actual level
   */
  async initialize(): Promise<ControlCenterState> {
    // Detect what's actually implemented
    const detection = await this.detector.detectActualLevel(this.config.workspacePath);

    // Load configured level if available
    const configuredLevel = this.config.targetLevel;

    // Determine UI state
    const showUpgradeGuidance = configuredLevel !== undefined &&
                                 detection.detectedLevel < configuredLevel;
    const showLevelSelector = true; // Always show for now

    this.state = {
      detectedLevel: detection.detectedLevel,
      configuredLevel,
      detection,
      showUpgradeGuidance,
      showLevelSelector
    };

    return this.state;
  }

  /**
   * Get current state (must initialize first)
   */
  getState(): ControlCenterState {
    if (!this.state) {
      throw new Error('AdaptiveControlCenter not initialized. Call initialize() first.');
    }
    return this.state;
  }

  /**
   * Render control center HTML
   */
  renderHTML(): string {
    if (!this.state) {
      return '<div class="control-center-error">Control Center not initialized</div>';
    }

    const { detectedLevel, configuredLevel, detection, showUpgradeGuidance } = this.state;

    return `
      <div class="adaptive-control-center">
        ${this.renderLevelIndicator(detectedLevel, configuredLevel)}
        ${this.renderCoverageSummary(detection)}
        ${showUpgradeGuidance ? this.renderUpgradeGuidance(detection) : ''}
        ${this.renderControls(detectedLevel)}
        ${this.renderRecommendations(detection.recommendations)}
      </div>
    `;
  }

  /**
   * Render level indicator with badges
   */
  private renderLevelIndicator(detected: MaturityLevel, configured?: MaturityLevel): string {
    const levelNames = {
      [MaturityLevel.OBSERVATION]: 'Observation',
      [MaturityLevel.SEMANTIC]: 'Semantic',
      [MaturityLevel.ANNOTATION]: 'Annotation',
      [MaturityLevel.CONDITIONAL]: 'Conditional',
      [MaturityLevel.DECORATOR]: 'Decorator'
    };

    const levelColors = {
      [MaturityLevel.OBSERVATION]: '#6c757d',
      [MaturityLevel.SEMANTIC]: '#17a2b8',
      [MaturityLevel.ANNOTATION]: '#ffc107',
      [MaturityLevel.CONDITIONAL]: '#fd7e14',
      [MaturityLevel.DECORATOR]: '#28a745'
    };

    const mismatch = configured !== undefined && detected !== configured;

    return `
      <div class="level-indicator ${mismatch ? 'level-mismatch' : ''}">
        <div class="level-badge-container">
          <div class="level-badge" style="background: ${levelColors[detected]}">
            <div class="level-number">L${detected}</div>
            <div class="level-name">${levelNames[detected]}</div>
          </div>
          <div class="level-label">Detected</div>
        </div>

        ${configured !== undefined ? `
          <div class="level-arrow">${detected < configured ? '→ 🎯' : detected > configured ? '→ ⚠️' : '✓'}</div>
          <div class="level-badge-container">
            <div class="level-badge" style="background: ${levelColors[configured]}; opacity: 0.7">
              <div class="level-number">L${configured}</div>
              <div class="level-name">${levelNames[configured]}</div>
            </div>
            <div class="level-label">Target</div>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render coverage summary
   */
  private renderCoverageSummary(detection: DetectionResult): string {
    const { coverage } = detection;
    const overallPercent = Math.round(coverage.overall * 100);

    const coverageColor = overallPercent >= 70 ? '#28a745' :
                          overallPercent >= 50 ? '#ffc107' : '#dc3545';

    return `
      <div class="coverage-summary">
        <div class="coverage-header">
          <span class="coverage-title">Coverage</span>
          <span class="coverage-value" style="color: ${coverageColor}">
            ${overallPercent}%
          </span>
        </div>

        <div class="coverage-bar-container">
          <div class="coverage-bar" style="width: ${overallPercent}%; background: ${coverageColor}"></div>
        </div>

        <div class="coverage-details">
          <div class="coverage-stat">
            <span class="stat-label">Files with Threading:</span>
            <span class="stat-value">${coverage.filesWithThreading} / ${coverage.totalFiles}</span>
          </div>
        </div>

        <div class="coverage-by-level">
          ${this.renderCoverageByLevel(coverage.byLevel)}
        </div>
      </div>
    `;
  }

  /**
   * Render coverage breakdown by level
   */
  private renderCoverageByLevel(byLevel: Partial<Record<MaturityLevel, number>>): string {
    const levels = [
      { level: MaturityLevel.DECORATOR, name: 'L4: Decorators', icon: '🎯' },
      { level: MaturityLevel.CONDITIONAL, name: 'L3: ThreadContext', icon: '⚙️' },
      { level: MaturityLevel.ANNOTATION, name: 'L2: JSDoc', icon: '📝' },
      { level: MaturityLevel.SEMANTIC, name: 'L1: Semantic', icon: '🏷️' },
      { level: MaturityLevel.OBSERVATION, name: 'L0: Basic Logs', icon: '👁️' }
    ];

    return levels.map(({ level, name, icon }) => {
      const coverage = byLevel[level] || 0;
      const percent = Math.round(coverage * 100);
      const color = percent >= 70 ? '#28a745' :
                    percent >= 30 ? '#ffc107' : '#6c757d';

      return `
        <div class="level-coverage-row">
          <span class="level-coverage-label">${icon} ${name}</span>
          <div class="level-coverage-bar-container">
            <div class="level-coverage-bar" style="width: ${percent}%; background: ${color}"></div>
          </div>
          <span class="level-coverage-value">${percent}%</span>
        </div>
      `;
    }).join('');
  }

  /**
   * Render upgrade guidance
   */
  private renderUpgradeGuidance(detection: DetectionResult): string {
    const { detectedLevel, configuredLevel } = this.state!;
    const gap = configuredLevel! - detectedLevel;

    const recommendation = detection.recommendations.find(r => r.action === 'upgrade');

    return `
      <div class="upgrade-guidance">
        <div class="upgrade-header">
          <span class="upgrade-icon">🎯</span>
          <span class="upgrade-title">Upgrade Available</span>
        </div>

        <div class="upgrade-message">
          Your target level is <strong>L${configuredLevel}</strong>, but only
          <strong>L${detectedLevel}</strong> is currently detected.
          ${gap > 1 ? `This is a ${gap}-level jump.` : 'This is a one-level upgrade.'}
        </div>

        ${recommendation ? `
          <div class="upgrade-recommendation">
            <div class="recommendation-reason">${recommendation.reason}</div>
            <div class="recommendation-benefits">
              <strong>Benefits:</strong>
              <ul>
                ${recommendation.benefits.map(b => `<li>${b}</li>`).join('')}
              </ul>
            </div>
            <div class="recommendation-effort">
              Effort: <span class="effort-badge effort-${recommendation.effort}">${recommendation.effort}</span>
            </div>
          </div>
        ` : ''}

        <div class="upgrade-actions">
          <button class="btn btn-primary" data-action="start-upgrade">
            Start Upgrade to L${configuredLevel}
          </button>
          <button class="btn btn-secondary" data-action="view-guide">
            View Upgrade Guide
          </button>
          <button class="btn btn-tertiary" data-action="use-detected">
            Use L${detectedLevel} Only
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render level-appropriate controls
   */
  private renderControls(level: MaturityLevel): string {
    const controls = {
      [MaturityLevel.OBSERVATION]: this.getObservationControls(),
      [MaturityLevel.SEMANTIC]: this.getSemanticControls(),
      [MaturityLevel.ANNOTATION]: this.getAnnotationControls(),
      [MaturityLevel.CONDITIONAL]: this.getConditionalControls(),
      [MaturityLevel.DECORATOR]: this.getDecoratorControls()
    };

    return `
      <div class="level-controls">
        <div class="controls-header">Controls (Level ${level})</div>
        ${controls[level]}
      </div>
    `;
  }

  /**
   * Level 0 controls: Basic observation
   */
  private getObservationControls(): string {
    return `
      <div class="control-group">
        <label class="control-label">
          <input type="checkbox" id="threading-enabled" checked>
          Enable Threading Observation
        </label>
        <p class="control-description">
          Passively observe existing logs. No code changes required.
        </p>
      </div>
    `;
  }

  /**
   * Level 1 controls: Semantic filtering
   */
  private getSemanticControls(): string {
    return `
      <div class="control-group">
        <label class="control-label">Thread Filter</label>
        <select id="thread-filter" class="control-select">
          <option value="">All Threads</option>
          <option value="DATA_FLOW">DATA_FLOW</option>
          <option value="CACHE">CACHE</option>
          <option value="VALIDATION">VALIDATION</option>
          <option value="ERROR_RECOVERY">ERROR_RECOVERY</option>
          <option value="AGENT_BRAIN">AGENT_BRAIN</option>
        </select>
        <p class="control-description">
          Filter logs by thread name. Supports [THREAD:X] format and variations.
        </p>
      </div>
    `;
  }

  /**
   * Level 2 controls: Static analysis
   */
  private getAnnotationControls(): string {
    return `
      <div class="control-group">
        <label class="control-label">
          <input type="checkbox" id="show-coverage">
          Show Coverage Report
        </label>
        <label class="control-label">
          <input type="checkbox" id="validate-annotations">
          Validate JSDoc Annotations
        </label>
        <p class="control-description">
          Static analysis of @thread JSDoc annotations.
        </p>
      </div>
    `;
  }

  /**
   * Level 3 controls: Runtime control
   */
  private getConditionalControls(): string {
    return `
      <div class="control-group">
        <label class="control-label">
          <input type="checkbox" id="runtime-enable" checked>
          Enable Runtime Threading
        </label>
        <label class="control-label">
          <input type="checkbox" id="show-context-viewer">
          Show Context Viewer
        </label>
        <p class="control-description">
          Runtime control via ThreadContext API.
        </p>
      </div>
    `;
  }

  /**
   * Level 4 controls: Full system
   */
  private getDecoratorControls(): string {
    return `
      <div class="control-group">
        <button class="btn btn-primary" data-action="analyze-now">
          Analyze Now
        </button>
        <button class="btn btn-secondary" data-action="export-report">
          Export Report
        </button>
        <button class="btn btn-secondary" data-action="view-timeline">
          View Timeline
        </button>
        <p class="control-description">
          Full decorator-based threading system with comprehensive analysis.
        </p>
      </div>
    `;
  }

  /**
   * Render recommendations
   */
  private renderRecommendations(recommendations: LevelRecommendation[]): string {
    if (recommendations.length === 0) {
      return '';
    }

    // Sort by priority
    const sorted = [...recommendations].sort((a, b) => {
      const priority = { high: 3, medium: 2, low: 1 };
      return (priority[b.priority] || 0) - (priority[a.priority] || 0);
    });

    return `
      <div class="recommendations">
        <div class="recommendations-header">Recommendations</div>
        ${sorted.map(rec => this.renderRecommendation(rec)).join('')}
      </div>
    `;
  }

  /**
   * Render single recommendation
   */
  private renderRecommendation(rec: LevelRecommendation): string {
    const priorityColors = {
      high: '#dc3545',
      medium: '#ffc107',
      low: '#17a2b8'
    };

    const actionIcons = {
      upgrade: '⬆️',
      standardize: '📐',
      complete: '✅',
      downgrade: '⬇️'
    };

    return `
      <div class="recommendation-card priority-${rec.priority}">
        <div class="recommendation-header">
          <span class="recommendation-icon">${actionIcons[rec.action]}</span>
          <span class="recommendation-action">${rec.action.toUpperCase()}</span>
          <span class="recommendation-priority" style="background: ${priorityColors[rec.priority]}">
            ${rec.priority}
          </span>
        </div>

        <div class="recommendation-body">
          <div class="recommendation-reason">${rec.reason}</div>

          ${rec.benefits.length > 0 ? `
            <div class="recommendation-benefits">
              <strong>Benefits:</strong>
              <ul>
                ${rec.benefits.map(b => `<li>${b}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          <div class="recommendation-footer">
            <span class="effort-indicator">
              Effort: <span class="effort-badge effort-${rec.effort}">${rec.effort}</span>
            </span>
            <button class="btn btn-sm btn-primary" data-action="apply-recommendation" data-rec-id="${rec.action}">
              Apply
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Get status text for status bar
   */
  getStatusText(): string {
    if (!this.state) {
      return '🧵 Threading: Initializing...';
    }

    const { detectedLevel, detection } = this.state;
    const coverage = Math.round(detection.coverage.overall * 100);

    const levelNames = ['L0', 'L1', 'L2', 'L3', 'L4'];

    return `🧵 Threading: ${levelNames[detectedLevel]} (${coverage}%)`;
  }

  /**
   * Get status tooltip
   */
  getStatusTooltip(): string {
    if (!this.state) {
      return 'Threading system initializing...';
    }

    const { detectedLevel, configuredLevel, detection } = this.state;
    const levelNames = {
      0: 'Observation',
      1: 'Semantic',
      2: 'Annotation',
      3: 'Conditional',
      4: 'Decorator'
    };

    let tooltip = `Detected Level: ${levelNames[detectedLevel]}\n`;
    tooltip += `Coverage: ${Math.round(detection.coverage.overall * 100)}%\n`;
    tooltip += `Files: ${detection.coverage.filesWithThreading}/${detection.coverage.totalFiles}`;

    if (configuredLevel !== undefined && configuredLevel !== detectedLevel) {
      tooltip += `\n\nTarget Level: ${levelNames[configuredLevel]}`;
      tooltip += `\nClick to view upgrade guidance`;
    }

    return tooltip;
  }
}
