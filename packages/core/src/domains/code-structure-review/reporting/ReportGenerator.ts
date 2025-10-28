/**
 * Generates reports from code structure analysis
 */

import type {
  CodeStructureAnalysis,
  CategoryAnalysis,
  Issue
} from '../types';

/**
 * Generates various report formats from analysis results
 */
export class ReportGenerator {
  /**
   * Generate executive summary
   */
  generateExecutiveSummary(analysis: CodeStructureAnalysis): string {
    let summary = `# Code Structure Review - Executive Summary\n\n`;
    summary += `**Analysis Date:** ${analysis.timestamp.toISOString()}\n`;
    summary += `**Overall Score:** ${analysis.summary.overallScore}/100\n\n`;

    // Status assessment
    const status = this.getOverallStatus(analysis.summary.overallScore);
    summary += `**Status:** ${status}\n\n`;

    // Key findings
    summary += `## Key Findings\n\n`;
    summary += `- **Total Issues:** ${analysis.summary.totalIssues}\n`;
    summary += `- **Critical Issues:** ${analysis.summary.criticalIssues}\n`;
    summary += `- **Files Analyzed:** ${analysis.summary.analyzedFiles}/${analysis.summary.totalFiles}\n\n`;

    // Category breakdown
    summary += `## Category Scores\n\n`;
    analysis.categories.forEach(cat => {
      const emoji = this.getStatusEmoji(cat.status);
      summary += `- ${emoji} **${cat.categoryName}:** ${cat.score}/100 (${cat.issues.length} issues)\n`;
    });

    // Recommendations
    summary += `\n## Top Recommendations\n\n`;
    const topRecs = this.getTopRecommendations(analysis);
    topRecs.slice(0, 3).forEach((rec, i) => {
      summary += `${i + 1}. ${rec.title}\n`;
    });

    return summary;
  }

  /**
   * Generate detailed report
   */
  generateDetailedReport(analysis: CodeStructureAnalysis): string {
    let report = `# Code Structure Review - Detailed Report\n\n`;
    report += `**Generated:** ${new Date().toISOString()}\n`;
    report += `**Workspace:** ${analysis.workspace || 'Unknown'}\n\n`;

    // Overview
    report += this.generateOverviewSection(analysis);

    // Each category
    analysis.categories.forEach(category => {
      report += this.generateCategorySection(category);
    });

    return report;
  }

  /**
   * Generate overview section
   */
  private generateOverviewSection(analysis: CodeStructureAnalysis): string {
    let section = `## Overview\n\n`;

    section += `| Metric | Value |\n`;
    section += `|--------|-------|\n`;
    section += `| Overall Score | ${analysis.summary.overallScore}/100 |\n`;
    section += `| Total Issues | ${analysis.summary.totalIssues} |\n`;
    section += `| Critical Issues | ${analysis.summary.criticalIssues} |\n`;
    section += `| Files Analyzed | ${analysis.summary.analyzedFiles} |\n\n`;

    return section;
  }

  /**
   * Generate category section
   */
  private generateCategorySection(category: CategoryAnalysis): string {
    let section = `## ${category.categoryName}\n\n`;

    section += `**Score:** ${category.score}/100\n`;
    section += `**Status:** ${category.status}\n`;
    section += `**Issues:** ${category.issues.length}\n\n`;

    // Metrics
    if (Object.keys(category.metrics).length > 0) {
      section += `### Metrics\n\n`;
      Object.entries(category.metrics).forEach(([key, value]) => {
        section += `- **${this.formatMetricName(key)}:** ${value}\n`;
      });
      section += `\n`;
    }

    // Issues
    if (category.issues.length > 0) {
      section += `### Issues\n\n`;

      const bySeverity = this.groupBySeverity(category.issues);

      ['critical', 'high', 'medium', 'low'].forEach(severity => {
        const issues = bySeverity[severity as keyof typeof bySeverity];
        if (issues && issues.length > 0) {
          section += `#### ${this.capitalize(severity)} (${issues.length})\n\n`;

          issues.forEach(issue => {
            section += `- **${issue.title}**\n`;
            section += `  - File: \`${issue.filePath}\`${issue.lineNumber ? `:${issue.lineNumber}` : ''}\n`;
            section += `  - ${issue.description}\n`;
            if (issue.fixSuggestion) {
              section += `  - Fix: ${issue.fixSuggestion}\n`;
            }
            section += `\n`;
          });
        }
      });
    }

    // Recommendations
    if (category.recommendations.length > 0) {
      section += `### Recommendations\n\n`;
      category.recommendations.forEach((rec, i) => {
        section += `${i + 1}. **${rec.title}** (${rec.priority})\n`;
        section += `   - ${rec.description}\n`;
        section += `   - Impact: ${rec.impact}\n`;
        section += `   - Effort: ${rec.effort}\n\n`;
      });
    }

    return section;
  }

  /**
   * Group issues by severity
   */
  private groupBySeverity(issues: Issue[]): Record<string, Issue[]> {
    return {
      critical: issues.filter(i => i.severity === 'critical'),
      high: issues.filter(i => i.severity === 'high'),
      medium: issues.filter(i => i.severity === 'medium'),
      low: issues.filter(i => i.severity === 'low')
    };
  }

  /**
   * Get overall status
   */
  private getOverallStatus(score: number): string {
    if (score >= 90) return '✅ Excellent';
    if (score >= 70) return '👍 Good';
    if (score >= 50) return '⚠️ Needs Improvement';
    return '❌ Critical';
  }

  /**
   * Get status emoji
   */
  private getStatusEmoji(status: string): string {
    const emojiMap: Record<string, string> = {
      excellent: '✅',
      good: '👍',
      warning: '⚠️',
      critical: '❌'
    };
    return emojiMap[status] || '❓';
  }

  /**
   * Format metric name
   */
  private formatMetricName(name: string): string {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Capitalize string
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Get top recommendations across all categories
   */
  private getTopRecommendations(analysis: CodeStructureAnalysis) {
    const allRecs = analysis.categories.flatMap(cat => cat.recommendations);

    // Sort by priority
    const priorityOrder = { immediate: 0, soon: 1, later: 2 };
    return allRecs.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );
  }

  /**
   * Generate JSON report
   */
  generateJSONReport(analysis: CodeStructureAnalysis): string {
    return JSON.stringify(analysis, null, 2);
  }

  /**
   * Generate CSV report
   */
  generateCSVReport(analysis: CodeStructureAnalysis): string {
    let csv = 'Category,Severity,Title,File,Line,Description\n';

    analysis.categories.forEach(category => {
      category.issues.forEach(issue => {
        const row = [
          category.categoryName,
          issue.severity,
          `"${issue.title.replace(/"/g, '""')}"`,
          issue.filePath,
          issue.lineNumber || '',
          `"${issue.description.replace(/"/g, '""')}"`
        ];
        csv += row.join(',') + '\n';
      });
    });

    return csv;
  }
}
