/**
 * Maturity Level Adapter
 * Adapts UI complexity based on user's skill level
 *
 * Philosophy: Show what users need, when they need it
 * - Novice: Simple, visual, guided
 * - Intermediate: Detailed breakdowns, actionable items
 * - Advanced: Full metrics, patterns, deep analysis
 * - Expert: Raw data, custom queries, advanced features
 */

export type MaturityLevel = 'novice' | 'intermediate' | 'advanced' | 'expert';

export interface MaturityConfig {
  showVisualizations: boolean;
  showDetailedMetrics: boolean;
  showRawData: boolean;
  showTechnicalTerms: boolean;
  maxIssuesShown: number;
  explanationDepth: 'simple' | 'detailed' | 'technical' | 'expert';
  enableAdvancedFeatures: boolean;
  categorySortBy: 'priority' | 'severity' | 'count';
}

export class MaturityLevelAdapter {
  private currentLevel: MaturityLevel;
  private config: MaturityConfig;

  constructor(initialLevel: MaturityLevel = 'intermediate') {
    this.currentLevel = initialLevel;
    this.config = this.getConfigForLevel(initialLevel);
  }

  /**
   * Set maturity level and update config
   */
  setLevel(level: MaturityLevel): void {
    this.currentLevel = level;
    this.config = this.getConfigForLevel(level);
  }

  /**
   * Get current maturity level
   */
  getLevel(): MaturityLevel {
    return this.currentLevel;
  }

  /**
   * Get configuration for maturity level
   */
  getConfig(): MaturityConfig {
    return { ...this.config };
  }

  /**
   * Get configuration for specific level
   */
  private getConfigForLevel(level: MaturityLevel): MaturityConfig {
    const configs: Record<MaturityLevel, MaturityConfig> = {
      novice: {
        showVisualizations: true,  // Visual is key for novices
        showDetailedMetrics: false,
        showRawData: false,
        showTechnicalTerms: false,
        maxIssuesShown: 5,  // Don't overwhelm
        explanationDepth: 'simple',
        enableAdvancedFeatures: false,
        categorySortBy: 'priority'
      },
      intermediate: {
        showVisualizations: true,
        showDetailedMetrics: true,
        showRawData: false,
        showTechnicalTerms: true,  // Start introducing terms
        maxIssuesShown: 15,
        explanationDepth: 'detailed',
        enableAdvancedFeatures: false,
        categorySortBy: 'severity'
      },
      advanced: {
        showVisualizations: true,
        showDetailedMetrics: true,
        showRawData: true,
        showTechnicalTerms: true,
        maxIssuesShown: 50,
        explanationDepth: 'technical',
        enableAdvancedFeatures: true,
        categorySortBy: 'count'
      },
      expert: {
        showVisualizations: true,
        showDetailedMetrics: true,
        showRawData: true,
        showTechnicalTerms: true,
        maxIssuesShown: Number.MAX_SAFE_INTEGER,  // Show all
        explanationDepth: 'expert',
        enableAdvancedFeatures: true,
        categorySortBy: 'severity'
      }
    };

    return configs[level];
  }

  /**
   * Adapt summary display based on level
   */
  adaptSummary(summary: any): string {
    const level = this.currentLevel;

    switch (level) {
      case 'novice':
        return this.renderNoviceSummary(summary);
      case 'intermediate':
        return this.renderIntermediateSummary(summary);
      case 'advanced':
        return this.renderAdvancedSummary(summary);
      case 'expert':
        return this.renderExpertSummary(summary);
    }
  }

  /**
   * Novice summary: Simple, emoji-based, encouraging
   */
  private renderNoviceSummary(summary: any): string {
    const score = summary.overallScore;
    const issues = summary.totalIssues;

    const emoji = score >= 80 ? '🎉' : score >= 60 ? '👍' : score >= 40 ? '⚠️' : '🔧';
    const message =
      score >= 80
        ? 'Great job! Your code is in good shape.'
        : score >= 60
        ? 'Looking good! A few things to fix.'
        : score >= 40
        ? 'Needs attention. Let\'s fix some issues.'
        : 'Needs work. Don\'t worry, we can fix this!';

    return `
      <div class="novice-summary">
        <div class="score-emoji">${emoji}</div>
        <div class="score-message">${message}</div>
        <div class="simple-stats">
          <div class="stat">
            <div class="stat-label">Your Score</div>
            <div class="stat-value">${score}/100</div>
          </div>
          <div class="stat">
            <div class="stat-label">Things to Fix</div>
            <div class="stat-value">${issues}</div>
          </div>
        </div>
        <div class="next-steps">
          <strong>What to do next:</strong>
          <ul>
            <li>Look at the top ${Math.min(3, issues)} issues below</li>
            <li>Click "Generate AI Prompt" to get help fixing them</li>
            <li>Fix one issue at a time</li>
          </ul>
        </div>
      </div>
    `;
  }

  /**
   * Intermediate summary: Balanced detail, actionable
   */
  private renderIntermediateSummary(summary: any): string {
    const critical = summary.criticalIssues || 0;
    const high = summary.highPriorityIssues || 0;

    return `
      <div class="intermediate-summary">
        <div class="priority-breakdown">
          <h4>Priority Breakdown</h4>
          <div class="priority-items">
            ${critical > 0 ? `<div class="priority-item critical">
              <span class="count">${critical}</span>
              <span class="label">Critical Issues</span>
              <span class="note">Fix these first</span>
            </div>` : ''}
            ${high > 0 ? `<div class="priority-item high">
              <span class="count">${high}</span>
              <span class="label">High Priority</span>
              <span class="note">Important to address</span>
            </div>` : ''}
          </div>
        </div>
        <div class="action-items">
          <h4>Recommended Actions</h4>
          <ol>
            ${critical > 0 ? '<li>Address critical issues immediately - they may cause failures</li>' : ''}
            ${high > 0 ? '<li>Review high-priority items - they affect code quality</li>' : ''}
            <li>Use visualizations below to understand patterns</li>
            <li>Generate AI prompts for guided fixes</li>
          </ol>
        </div>
      </div>
    `;
  }

  /**
   * Advanced summary: Full metrics, patterns
   */
  private renderAdvancedSummary(summary: any): string {
    return `
      <div class="advanced-summary">
        <div class="metrics-grid">
          <div class="metric">
            <div class="metric-label">Overall Score</div>
            <div class="metric-value">${summary.overallScore}/100</div>
            <div class="metric-trend">${this.getTrendIndicator(summary)}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Issue Density</div>
            <div class="metric-value">${this.calculateIssueDensity(summary)}</div>
            <div class="metric-note">issues per file</div>
          </div>
          <div class="metric">
            <div class="metric-label">Critical Path Coverage</div>
            <div class="metric-value">${this.estimateCriticalPathCoverage(summary)}%</div>
          </div>
        </div>
        <div class="pattern-insights">
          <h4>Detected Patterns</h4>
          ${this.detectPatterns(summary)}
        </div>
      </div>
    `;
  }

  /**
   * Expert summary: Raw data, correlations
   */
  private renderExpertSummary(summary: any): string {
    return `
      <div class="expert-summary">
        <div class="raw-metrics">
          <pre>${JSON.stringify(summary, null, 2)}</pre>
        </div>
        <div class="correlations">
          <h4>Metric Correlations</h4>
          ${this.analyzeCorrelations(summary)}
        </div>
      </div>
    `;
  }

  /**
   * Filter issues based on maturity level
   */
  filterIssues(issues: any[]): any[] {
    const maxIssues = this.config.maxIssuesShown;

    // For novices, show only critical and high severity
    if (this.currentLevel === 'novice') {
      return issues
        .filter(i => i.severity === 'critical' || i.severity === 'high')
        .slice(0, maxIssues);
    }

    return issues.slice(0, maxIssues);
  }

  /**
   * Adapt issue description based on level
   */
  adaptIssueDescription(issue: any): string {
    const depth = this.config.explanationDepth;

    switch (depth) {
      case 'simple':
        return this.simplifyDescription(issue.description);
      case 'detailed':
        return `${issue.description} ${issue.fixSuggestion || ''}`;
      case 'technical':
        return `${issue.description}\n\nTechnical Details: ${issue.detectorId}\n${issue.fixSuggestion || ''}`;
      case 'expert':
        return `${issue.description}\n\nDetector: ${issue.detectorId}\nLocation: ${issue.filePath}:${issue.lineNumber}\n${issue.fixSuggestion || ''}`;
    }
  }

  /**
   * Simplify technical description for novices
   */
  private simplifyDescription(description: string): string {
    const simplifications: Record<string, string> = {
      'endpoint': 'API function',
      'component': 'UI element',
      'handler': 'function that handles requests',
      'validation': 'checking if data is correct',
      'async operation': 'operation that takes time',
      'WCAG': 'accessibility',
      'mutation': 'change',
      'state': 'data that changes'
    };

    let simplified = description;
    Object.entries(simplifications).forEach(([technical, simple]) => {
      simplified = simplified.replace(new RegExp(technical, 'gi'), simple);
    });

    return simplified;
  }

  /**
   * Helper methods for metrics
   */
  private getTrendIndicator(summary: any): string {
    // Would compare with historical data if available
    return '—';
  }

  private calculateIssueDensity(summary: any): string {
    const filesAnalyzed = summary.analyzedFiles || 1;
    const density = (summary.totalIssues / filesAnalyzed).toFixed(2);
    return density;
  }

  private estimateCriticalPathCoverage(summary: any): number {
    // Simplified estimation based on critical issues
    const criticalIssues = summary.criticalIssues || 0;
    return Math.max(0, 100 - criticalIssues * 10);
  }

  private detectPatterns(summary: any): string {
    const patterns: string[] = [];

    if (summary.criticalIssues > 5) {
      patterns.push('• High concentration of critical issues - suggests systemic problems');
    }
    if (summary.totalIssues > summary.analyzedFiles * 2) {
      patterns.push('• High issue density - consider refactoring');
    }

    return patterns.length > 0
      ? `<ul class="patterns">${patterns.map(p => `<li>${p}</li>`).join('')}</ul>`
      : '<div class="no-patterns">No significant patterns detected</div>';
  }

  private analyzeCorrelations(summary: any): string {
    return `
      <div class="correlations-grid">
        <div>Issue Count ↔ File Count: ${summary.totalIssues / (summary.analyzedFiles || 1)}</div>
        <div>Critical Ratio: ${((summary.criticalIssues || 0) / summary.totalIssues * 100).toFixed(1)}%</div>
      </div>
    `;
  }

  /**
   * Should show visualization section
   */
  shouldShowVisualizations(): boolean {
    return this.config.showVisualizations;
  }

  /**
   * Should show detailed metrics
   */
  shouldShowDetailedMetrics(): boolean {
    return this.config.showDetailedMetrics;
  }

  /**
   * Should show advanced features
   */
  shouldShowAdvancedFeatures(): boolean {
    return this.config.enableAdvancedFeatures;
  }
}
