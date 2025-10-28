/**
 * Aggregates results from multiple category analyzers
 */

import type {
  CodeStructureAnalysis,
  CategoryAnalysis,
  AnalysisSummary,
  Issue
} from '../types';

/**
 * Aggregate category analysis results into a complete CodeStructureAnalysis
 */
export class ResultAggregator {
  /**
   * Combine multiple category results into a single analysis
   */
  aggregate(
    categoryResults: CategoryAnalysis[],
    workspace: string,
    timestamp: Date = new Date()
  ): CodeStructureAnalysis {
    const summary = this.createSummary(categoryResults);

    return {
      timestamp,
      workspace,
      categories: categoryResults,
      summary
    };
  }

  /**
   * Create analysis summary from category results
   */
  private createSummary(categories: CategoryAnalysis[]): AnalysisSummary {
    // Aggregate all issues
    const allIssues: Issue[] = categories.flatMap(cat => cat.issues);

    // Count critical issues
    const criticalIssues = allIssues.filter(
      issue => issue.severity === 'critical'
    ).length;

    // Calculate category scores
    const categoryScores: Record<string, number> = {};
    categories.forEach(cat => {
      categoryScores[cat.categoryId] = cat.score;
    });

    // Calculate overall score (weighted average by priority)
    const overallScore = this.calculateOverallScore(categories);

    return {
      totalFiles: 0, // Will be set by orchestrator
      analyzedFiles: 0, // Will be set by orchestrator
      totalIssues: allIssues.length,
      criticalIssues,
      overallScore,
      categoryScores
    };
  }

  /**
   * Calculate overall score using weighted average
   * Priority 1 categories have weight 3
   * Priority 2 categories have weight 2
   * Priority 3+ categories have weight 1
   */
  private calculateOverallScore(categories: CategoryAnalysis[]): number {
    if (categories.length === 0) {
      return 100;
    }

    let weightedSum = 0;
    let totalWeight = 0;

    categories.forEach(cat => {
      const weight = this.getPriorityWeight(cat.priority);
      weightedSum += cat.score * weight;
      totalWeight += weight;
    });

    const score = totalWeight > 0 ? weightedSum / totalWeight : 100;
    return Math.round(score);
  }

  /**
   * Get weight for priority level
   */
  private getPriorityWeight(priority: number): number {
    switch (priority) {
      case 1:
        return 3; // Critical categories
      case 2:
        return 2; // High priority categories
      default:
        return 1; // Medium/Low priority categories
    }
  }

  /**
   * Update file counts in summary
   */
  updateFileCounts(
    analysis: CodeStructureAnalysis,
    totalFiles: number,
    analyzedFiles: number
  ): void {
    analysis.summary.totalFiles = totalFiles;
    analysis.summary.analyzedFiles = analyzedFiles;
  }

  /**
   * Get issues grouped by severity
   */
  groupIssuesBySeverity(analysis: CodeStructureAnalysis): {
    critical: Issue[];
    high: Issue[];
    medium: Issue[];
    low: Issue[];
  } {
    const allIssues = analysis.categories.flatMap(cat => cat.issues);

    return {
      critical: allIssues.filter(i => i.severity === 'critical'),
      high: allIssues.filter(i => i.severity === 'high'),
      medium: allIssues.filter(i => i.severity === 'medium'),
      low: allIssues.filter(i => i.severity === 'low')
    };
  }

  /**
   * Get issues grouped by category
   */
  groupIssuesByCategory(analysis: CodeStructureAnalysis): Record<string, Issue[]> {
    const grouped: Record<string, Issue[]> = {};

    analysis.categories.forEach(cat => {
      grouped[cat.categoryId] = cat.issues;
    });

    return grouped;
  }

  /**
   * Get top N issues by severity
   */
  getTopIssues(analysis: CodeStructureAnalysis, limit: number = 10): Issue[] {
    const allIssues = analysis.categories.flatMap(cat => cat.issues);

    // Sort by severity (critical > high > medium > low)
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

    return allIssues
      .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
      .slice(0, limit);
  }

  /**
   * Get categories by status
   */
  getCategoriesByStatus(
    analysis: CodeStructureAnalysis
  ): Record<string, CategoryAnalysis[]> {
    const grouped: Record<string, CategoryAnalysis[]> = {
      excellent: [],
      good: [],
      warning: [],
      critical: []
    };

    analysis.categories.forEach(cat => {
      grouped[cat.status].push(cat);
    });

    return grouped;
  }

  /**
   * Calculate improvement suggestions
   */
  calculateImprovementPotential(analysis: CodeStructureAnalysis): {
    category: string;
    currentScore: number;
    potentialScore: number;
    impact: string;
  }[] {
    const suggestions: Array<{
      category: string;
      currentScore: number;
      potentialScore: number;
      impact: string;
    }> = [];

    analysis.categories.forEach(cat => {
      // Focus on categories with critical/high issues
      const criticalIssues = cat.issues.filter(i => i.severity === 'critical');
      const highIssues = cat.issues.filter(i => i.severity === 'high');

      if (criticalIssues.length > 0 || highIssues.length > 0) {
        // Calculate potential score if critical/high issues are fixed
        const currentScore = cat.score;
        const potentialGain = criticalIssues.length * 10 + highIssues.length * 5;
        const potentialScore = Math.min(100, currentScore + potentialGain);

        if (potentialScore > currentScore + 10) {
          // Only suggest if improvement is significant
          suggestions.push({
            category: cat.categoryName,
            currentScore,
            potentialScore,
            impact:
              potentialScore - currentScore >= 30
                ? 'high'
                : potentialScore - currentScore >= 15
                ? 'medium'
                : 'low'
          });
        }
      }
    });

    // Sort by potential improvement (descending)
    return suggestions.sort(
      (a, b) => b.potentialScore - b.currentScore - (a.potentialScore - a.currentScore)
    );
  }

  /**
   * Generate executive summary text
   */
  generateExecutiveSummary(analysis: CodeStructureAnalysis): string {
    const { summary } = analysis;
    const status = this.getOverallStatus(summary.overallScore);

    let text = `Code structure analysis found ${summary.totalIssues} issue(s) across ${analysis.categories.length} categories. `;

    if (summary.criticalIssues > 0) {
      text += `⚠️ ${summary.criticalIssues} critical issue(s) require immediate attention. `;
    }

    text += `Overall health: ${status} (${summary.overallScore}/100).`;

    return text;
  }

  /**
   * Get overall status from score
   */
  private getOverallStatus(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Needs Improvement';
  }
}
