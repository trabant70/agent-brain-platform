/**
 * Abstract base class for all category analyzers
 */

import type {
  CategoryConfig,
  CategoryAnalysis,
  AnalysisContext,
  Issue,
  Recommendation
} from '../../types';
import {
  type ICategoryAnalyzer,
  DEFAULT_THRESHOLDS,
  SEVERITY_WEIGHTS
} from './CategoryTypes';

/**
 * Base class providing common functionality for all category analyzers
 */
export abstract class AnalysisCategory implements ICategoryAnalyzer {
  public readonly id: string;
  public readonly name: string;
  public readonly config: CategoryConfig;

  constructor(config: CategoryConfig) {
    this.id = config.id;
    this.name = config.name;
    this.config = {
      ...config,
      thresholds: config.thresholds || DEFAULT_THRESHOLDS
    };
  }

  /**
   * Main analysis method - must be implemented by subclasses
   */
  abstract analyze(context: AnalysisContext): Promise<CategoryAnalysis>;

  /**
   * Calculate score based on issues found
   * Default implementation: score decreases based on severity weights
   * Override this method for custom scoring logic
   */
  calculateScore(issues: Issue[]): number {
    if (issues.length === 0) {
      return 100;
    }

    // Calculate total penalty based on severity weights
    const totalPenalty = issues.reduce((sum, issue) => {
      return sum + SEVERITY_WEIGHTS[issue.severity];
    }, 0);

    // Base score of 100, subtract penalties
    // Each critical issue = -10 points
    // Each high issue = -5 points
    // Each medium issue = -2 points
    // Each low issue = -1 point
    const score = Math.max(0, 100 - totalPenalty);

    return Math.round(score);
  }

  /**
   * Generate recommendations based on issues
   * Default implementation groups issues by severity
   * Override this method for custom recommendation logic
   */
  generateRecommendations(issues: Issue[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Group issues by severity
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const highIssues = issues.filter(i => i.severity === 'high');
    const mediumIssues = issues.filter(i => i.severity === 'medium');

    // Generate recommendations for critical issues
    if (criticalIssues.length > 0) {
      recommendations.push({
        id: `${this.id}-critical-rec`,
        priority: 'immediate',
        title: `Fix ${criticalIssues.length} critical issue(s)`,
        description: `Address critical issues that significantly impact code quality in ${this.name}`,
        impact: 'High - Critical issues can lead to bugs, poor UX, or maintenance problems',
        effort: criticalIssues.length <= 3 ? 'small' : criticalIssues.length <= 10 ? 'medium' : 'large',
        relatedIssues: criticalIssues.map(i => i.id)
      });
    }

    // Generate recommendations for high severity issues
    if (highIssues.length > 0) {
      recommendations.push({
        id: `${this.id}-high-rec`,
        priority: 'soon',
        title: `Address ${highIssues.length} high priority issue(s)`,
        description: `Fix high priority issues to improve code quality in ${this.name}`,
        impact: 'Medium - High priority issues affect maintainability and user experience',
        effort: highIssues.length <= 5 ? 'small' : highIssues.length <= 15 ? 'medium' : 'large',
        relatedIssues: highIssues.map(i => i.id)
      });
    }

    // Generate recommendations for medium severity issues
    if (mediumIssues.length > 5) {
      recommendations.push({
        id: `${this.id}-medium-rec`,
        priority: 'later',
        title: `Clean up ${mediumIssues.length} medium priority issue(s)`,
        description: `Address medium priority issues when time permits`,
        impact: 'Low to Medium - These issues are worth fixing but not urgent',
        effort: mediumIssues.length <= 10 ? 'small' : mediumIssues.length <= 30 ? 'medium' : 'large',
        relatedIssues: mediumIssues.slice(0, 10).map(i => i.id) // Limit to first 10
      });
    }

    return recommendations;
  }

  /**
   * Determine status based on score and thresholds
   */
  determineStatus(score: number): 'excellent' | 'good' | 'warning' | 'critical' {
    const { excellent, good, warning } = this.config.thresholds;

    if (score >= excellent) {
      return 'excellent';
    } else if (score >= good) {
      return 'good';
    } else if (score >= warning) {
      return 'warning';
    } else {
      return 'critical';
    }
  }

  /**
   * Create a complete CategoryAnalysis result
   * Helper method to standardize result creation
   */
  protected createAnalysisResult(
    issues: Issue[],
    metrics: Record<string, number>,
    customRecommendations?: Recommendation[]
  ): CategoryAnalysis {
    const score = this.calculateScore(issues);
    const status = this.determineStatus(score);
    const recommendations = customRecommendations || this.generateRecommendations(issues);

    return {
      categoryId: this.id,
      categoryName: this.name,
      priority: this.config.priority,
      score,
      status,
      issues,
      metrics,
      recommendations
    };
  }

  /**
   * Create an issue with standard fields
   * Helper method to simplify issue creation
   */
  protected createIssue(params: {
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    filePath: string;
    lineNumber?: number;
    detectorId: string;
    fixSuggestion?: string;
    aiPromptHint?: string;
  }): Issue {
    return {
      ...params,
      category: this.id
    };
  }

  /**
   * Filter files based on category-specific criteria
   * Override this method to implement custom file filtering
   */
  protected filterRelevantFiles(context: AnalysisContext): typeof context.files {
    // Default: return all files
    // Subclasses can override to filter by language, path patterns, etc.
    return context.files;
  }

  /**
   * Check if category is enabled in configuration
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get category metadata for UI display
   */
  getMetadata() {
    return {
      id: this.id,
      name: this.name,
      icon: this.config.icon,
      description: this.config.description,
      priority: this.config.priority
    };
  }
}
