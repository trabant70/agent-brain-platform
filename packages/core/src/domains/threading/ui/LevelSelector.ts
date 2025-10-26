/**
 * LevelSelector - Visual level selector with upgrade guidance
 *
 * Interactive component for selecting target threading maturity level
 * with information about each level and migration guidance.
 */

import { MaturityLevel } from '../types';

export interface LevelInfo {
  level: MaturityLevel;
  name: string;
  shortName: string;
  description: string;
  effort: 'none' | 'low' | 'medium' | 'medium-high' | 'high';
  features: string[];
  examples: string[];
  icon: string;
  color: string;
}

export interface LevelSelectorConfig {
  currentLevel: MaturityLevel;
  targetLevel?: MaturityLevel;
  onLevelSelect?: (level: MaturityLevel) => void;
}

export class LevelSelector {
  private config: LevelSelectorConfig;
  private levels: LevelInfo[];

  constructor(config: LevelSelectorConfig) {
    this.config = config;
    this.levels = this.initializeLevels();
  }

  /**
   * Initialize level information
   */
  private initializeLevels(): LevelInfo[] {
    return [
      {
        level: MaturityLevel.OBSERVATION,
        name: 'Observation',
        shortName: 'L0',
        description: 'Passive observation of existing logs with no code changes',
        effort: 'none',
        features: [
          'No code changes required',
          'Works with existing logging',
          'Basic pattern detection',
          'Minimal overhead'
        ],
        examples: [
          'console.log("Fetching user")',
          'logger.info("Cache hit")'
        ],
        icon: '👁️',
        color: '#6c757d'
      },
      {
        level: MaturityLevel.SEMANTIC,
        name: 'Semantic Logging',
        shortName: 'L1',
        description: 'Add thread indicators to log messages for better visibility',
        effort: 'low',
        features: [
          'Thread-aware log filtering',
          'Pattern recognition',
          'Format flexibility',
          'Thread normalization'
        ],
        examples: [
          'console.log("[THREAD:DATA_FLOW] Fetching user")',
          'logger.info({thread: "CACHE", msg: "Hit"})'
        ],
        icon: '🏷️',
        color: '#17a2b8'
      },
      {
        level: MaturityLevel.ANNOTATION,
        name: 'JSDoc Annotations',
        shortName: 'L2',
        description: 'Document threading intent with JSDoc annotations',
        effort: 'medium',
        features: [
          'Static analysis',
          'IDE integration',
          'Documentation generation',
          'Type hints'
        ],
        examples: [
          '/** @thread DATA_FLOW */',
          'async function getUser(id) { }'
        ],
        icon: '📝',
        color: '#ffc107'
      },
      {
        level: MaturityLevel.CONDITIONAL,
        name: 'ThreadContext API',
        shortName: 'L3',
        description: 'Runtime thread management with ThreadContext pattern',
        effort: 'medium-high',
        features: [
          'Dynamic threading',
          'Nested contexts',
          'Runtime enable/disable',
          'Context propagation'
        ],
        examples: [
          'ThreadContext.run("DATA_FLOW", async () => {',
          '  await processData();',
          '})'
        ],
        icon: '⚙️',
        color: '#fd7e14'
      },
      {
        level: MaturityLevel.DECORATOR,
        name: 'Full Decorators',
        shortName: 'L4',
        description: 'Complete decorator pattern with comprehensive analysis',
        effort: 'high',
        features: [
          'Type-safe decorators',
          'Automatic logging',
          'Performance tracking',
          'Memory analysis',
          'Full analysis pipeline'
        ],
        examples: [
          '@ThreadSpec({',
          '  threads: ["DATA_FLOW"],',
          '  timing: { max: 100 }',
          '})',
          'async function getUser(id) { }'
        ],
        icon: '🎯',
        color: '#28a745'
      }
    ];
  }

  /**
   * Render level selector HTML
   */
  renderHTML(): string {
    return `
      <div class="level-selector">
        <div class="level-selector-header">
          <h3>Select Threading Maturity Level</h3>
          <p class="level-selector-subtitle">
            Choose the level that matches your project's needs and resources
          </p>
        </div>

        <div class="level-cards">
          ${this.levels.map(level => this.renderLevelCard(level)).join('')}
        </div>

        <div class="level-selector-footer">
          <div class="footer-note">
            💡 <strong>Tip:</strong> Start with Level 1 (Semantic) for quick wins,
            then gradually upgrade as needed.
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render individual level card
   */
  private renderLevelCard(level: LevelInfo): string {
    const isCurrent = level.level === this.config.currentLevel;
    const isTarget = level.level === this.config.targetLevel;
    const isBelow = level.level < this.config.currentLevel;
    const isAbove = level.level > this.config.currentLevel;

    const cardClasses = [
      'level-card',
      isCurrent && 'level-card-current',
      isTarget && 'level-card-target',
      isBelow && 'level-card-below',
      isAbove && 'level-card-above'
    ].filter(Boolean).join(' ');

    return `
      <div class="${cardClasses}" data-level="${level.level}" style="--level-color: ${level.color}">
        <div class="level-card-header">
          <div class="level-card-icon">${level.icon}</div>
          <div class="level-card-title">
            <div class="level-card-name">${level.name}</div>
            <div class="level-card-short">${level.shortName}</div>
          </div>
          ${isCurrent ? '<div class="level-badge level-badge-current">Current</div>' : ''}
          ${isTarget ? '<div class="level-badge level-badge-target">Target</div>' : ''}
        </div>

        <div class="level-card-description">
          ${level.description}
        </div>

        <div class="level-card-effort">
          <span class="effort-label">Effort:</span>
          <span class="effort-value effort-${level.effort}">${level.effort}</span>
        </div>

        <div class="level-card-features">
          <div class="features-label">Features:</div>
          <ul class="features-list">
            ${level.features.map(f => `<li>${f}</li>`).join('')}
          </ul>
        </div>

        <div class="level-card-examples">
          <div class="examples-label">Example:</div>
          <pre class="examples-code">${level.examples.join('\n')}</pre>
        </div>

        <div class="level-card-actions">
          ${this.renderLevelActions(level)}
        </div>
      </div>
    `;
  }

  /**
   * Render action buttons for each level
   */
  private renderLevelActions(level: LevelInfo): string {
    const isCurrent = level.level === this.config.currentLevel;
    const isBelow = level.level < this.config.currentLevel;
    const isAbove = level.level > this.config.currentLevel;

    if (isCurrent) {
      return `
        <button class="btn btn-success btn-block" disabled>
          ✓ Current Level
        </button>
        <button class="btn btn-secondary btn-sm" data-action="view-guide" data-level="${level.level}">
          View Guide
        </button>
      `;
    }

    if (isBelow) {
      return `
        <button class="btn btn-secondary btn-block" data-action="downgrade" data-level="${level.level}">
          Downgrade to ${level.shortName}
        </button>
        <div class="action-note">⚠️ This will remove higher-level features</div>
      `;
    }

    if (isAbove) {
      const gap = level.level - this.config.currentLevel;
      return `
        <button class="btn btn-primary btn-block" data-action="upgrade" data-level="${level.level}">
          Upgrade to ${level.shortName}
        </button>
        <div class="action-note">
          ${gap === 1 ? '✨ One level up' : `⚡ ${gap}-level jump`}
        </div>
        <button class="btn btn-secondary btn-sm" data-action="view-migration" data-level="${level.level}">
          View Migration Path
        </button>
      `;
    }

    return '';
  }

  /**
   * Render compact selector (for status bar or toolbar)
   */
  renderCompact(): string {
    return `
      <div class="level-selector-compact">
        <select class="level-select" id="threading-level-select">
          ${this.levels.map(level => {
            const isCurrent = level.level === this.config.currentLevel;
            return `
              <option value="${level.level}" ${isCurrent ? 'selected' : ''}>
                ${level.icon} ${level.shortName}: ${level.name}
              </option>
            `;
          }).join('')}
        </select>
        <button class="btn btn-sm btn-primary" data-action="apply-level">
          Apply
        </button>
      </div>
    `;
  }

  /**
   * Get level info by level number
   */
  getLevelInfo(level: MaturityLevel): LevelInfo | undefined {
    return this.levels.find(l => l.level === level);
  }

  /**
   * Get upgrade path from current to target
   */
  getUpgradePath(targetLevel: MaturityLevel): LevelInfo[] {
    const current = this.config.currentLevel;
    if (targetLevel <= current) {
      return [];
    }

    return this.levels.filter(l => l.level > current && l.level <= targetLevel);
  }

  /**
   * Render migration path
   */
  renderMigrationPath(targetLevel: MaturityLevel): string {
    const path = this.getUpgradePath(targetLevel);
    if (path.length === 0) {
      return '<div class="migration-path-none">No migration needed</div>';
    }

    return `
      <div class="migration-path">
        <div class="migration-header">
          <h4>Migration Path</h4>
          <p>Step-by-step upgrade from L${this.config.currentLevel} to L${targetLevel}</p>
        </div>

        <div class="migration-steps">
          ${path.map((level, index) => `
            <div class="migration-step">
              <div class="migration-step-number">${index + 1}</div>
              <div class="migration-step-content">
                <div class="migration-step-header">
                  <span class="migration-step-icon">${level.icon}</span>
                  <span class="migration-step-name">${level.name}</span>
                  <span class="migration-step-effort">${level.effort} effort</span>
                </div>
                <div class="migration-step-description">${level.description}</div>
                <div class="migration-step-features">
                  <strong>What you'll gain:</strong>
                  <ul>
                    ${level.features.slice(0, 3).map(f => `<li>${f}</li>`).join('')}
                  </ul>
                </div>
              </div>
              ${index < path.length - 1 ? '<div class="migration-arrow">↓</div>' : ''}
            </div>
          `).join('')}
        </div>

        <div class="migration-footer">
          <button class="btn btn-primary" data-action="start-migration" data-target="${targetLevel}">
            Start Migration
          </button>
          <button class="btn btn-secondary" data-action="view-detailed-guide" data-target="${targetLevel}">
            View Detailed Guide
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render level comparison
   */
  renderComparison(levelA: MaturityLevel, levelB: MaturityLevel): string {
    const infoA = this.getLevelInfo(levelA);
    const infoB = this.getLevelInfo(levelB);

    if (!infoA || !infoB) {
      return '<div class="comparison-error">Invalid levels for comparison</div>';
    }

    return `
      <div class="level-comparison">
        <div class="comparison-header">
          <h4>Level Comparison</h4>
        </div>

        <table class="comparison-table">
          <thead>
            <tr>
              <th>Aspect</th>
              <th>${infoA.icon} ${infoA.shortName}</th>
              <th>${infoB.icon} ${infoB.shortName}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Name</strong></td>
              <td>${infoA.name}</td>
              <td>${infoB.name}</td>
            </tr>
            <tr>
              <td><strong>Effort</strong></td>
              <td><span class="effort-badge effort-${infoA.effort}">${infoA.effort}</span></td>
              <td><span class="effort-badge effort-${infoB.effort}">${infoB.effort}</span></td>
            </tr>
            <tr>
              <td><strong>Features</strong></td>
              <td>
                <ul>
                  ${infoA.features.map(f => `<li>${f}</li>`).join('')}
                </ul>
              </td>
              <td>
                <ul>
                  ${infoB.features.map(f => `<li>${f}</li>`).join('')}
                </ul>
              </td>
            </tr>
            <tr>
              <td><strong>Best For</strong></td>
              <td>${this.getBestUseCase(levelA)}</td>
              <td>${this.getBestUseCase(levelB)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Get best use case for a level
   */
  private getBestUseCase(level: MaturityLevel): string {
    const useCases = {
      [MaturityLevel.OBSERVATION]: 'Legacy projects, initial exploration',
      [MaturityLevel.SEMANTIC]: 'Quick wins, minimal disruption',
      [MaturityLevel.ANNOTATION]: 'Documentation-focused teams',
      [MaturityLevel.CONDITIONAL]: 'Dynamic runtime control needs',
      [MaturityLevel.DECORATOR]: 'Type-safe, production systems'
    };

    return useCases[level] || 'General use';
  }
}
