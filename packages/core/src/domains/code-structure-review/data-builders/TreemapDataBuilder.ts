/**
 * Treemap Data Builder
 * Transforms category analysis into hierarchical treemap structure
 *
 * Input: Analysis results with categories and issues
 * Output: Hierarchical tree structure for treemap visualization
 */

import { TreemapData, TreemapNode } from '../../visualization/webview/visualizations/TreemapVisualization';

export interface CategoryIssues {
  categoryId: string;
  categoryName: string;
  description?: string;
  issues: {
    severity: 'critical' | 'high' | 'medium' | 'low';
    count: number;
  }[];
  totalIssues: number;
}

export class TreemapDataBuilder {
  /**
   * Build treemap data from categories
   */
  static buildTree(categories: CategoryIssues[]): TreemapData {
    const children: TreemapNode[] = categories.map(category => {
      // Create child nodes for each severity level
      const severityNodes: TreemapNode[] = category.issues
        .filter(issue => issue.count > 0)
        .map(issue => ({
          name: `${issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)} (${issue.count})`,
          value: issue.count,
          severity: issue.severity,
          categoryId: category.categoryId,
          description: `${issue.count} ${issue.severity} severity issues in ${category.categoryName}`
        }));

      // Create category node
      return {
        name: category.categoryName,
        categoryId: category.categoryId,
        description: category.description,
        children: severityNodes.length > 0 ? severityNodes : undefined,
        value: severityNodes.length === 0 ? category.totalIssues : undefined
      };
    });

    return {
      name: 'All Categories',
      children
    };
  }

  /**
   * Build from analysis results
   */
  static buildFromAnalysis(analysis: any): TreemapData {
    const categories: CategoryIssues[] = [];

    if (analysis.categories) {
      analysis.categories.forEach((category: any) => {
        // Count issues by severity
        const severityCounts = {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        };

        let totalIssues = 0;

        if (category.issues) {
          category.issues.forEach((issue: any) => {
            totalIssues++;
            const severity = issue.severity as 'critical' | 'high' | 'medium' | 'low';
            if (severity in severityCounts) {
              severityCounts[severity]++;
            }
          });
        }

        // Create issues array
        const issues = Object.entries(severityCounts).map(([severity, count]) => ({
          severity: severity as 'critical' | 'high' | 'medium' | 'low',
          count
        }));

        categories.push({
          categoryId: category.id,
          categoryName: category.name,
          description: category.description,
          issues,
          totalIssues
        });
      });
    }

    // If no categories, create sample data
    if (categories.length === 0) {
      categories.push(
        {
          categoryId: 'feature-completeness',
          categoryName: 'Feature Completeness',
          description: 'Backend and frontend connectivity',
          issues: [
            { severity: 'critical', count: 3 },
            { severity: 'high', count: 5 },
            { severity: 'medium', count: 2 },
            { severity: 'low', count: 1 }
          ],
          totalIssues: 11
        },
        {
          categoryId: 'ui-ux-quality',
          categoryName: 'UI/UX Quality',
          description: 'User experience issues',
          issues: [
            { severity: 'critical', count: 1 },
            { severity: 'high', count: 7 },
            { severity: 'medium', count: 8 },
            { severity: 'low', count: 3 }
          ],
          totalIssues: 19
        },
        {
          categoryId: 'test-coverage',
          categoryName: 'Test Coverage',
          description: 'Missing or inadequate tests',
          issues: [
            { severity: 'high', count: 12 },
            { severity: 'medium', count: 5 },
            { severity: 'low', count: 2 }
          ],
          totalIssues: 19
        }
      );
    }

    return this.buildTree(categories);
  }

  /**
   * Build simple flat treemap (no hierarchy, just categories)
   */
  static buildFlat(categories: CategoryIssues[]): TreemapData {
    const children: TreemapNode[] = categories.map(category => ({
      name: category.categoryName,
      value: category.totalIssues,
      categoryId: category.categoryId,
      description: category.description,
      severity: this.getOverallSeverity(category)
    }));

    return {
      name: 'All Issues',
      children
    };
  }

  /**
   * Get overall severity for category (highest severity with issues)
   */
  private static getOverallSeverity(category: CategoryIssues): 'critical' | 'high' | 'medium' | 'low' {
    const criticalCount = category.issues.find(i => i.severity === 'critical')?.count || 0;
    if (criticalCount > 0) return 'critical';

    const highCount = category.issues.find(i => i.severity === 'high')?.count || 0;
    if (highCount > 0) return 'high';

    const mediumCount = category.issues.find(i => i.severity === 'medium')?.count || 0;
    if (mediumCount > 0) return 'medium';

    return 'low';
  }

  /**
   * Build treemap by file (alternative view)
   */
  static buildByFile(analysis: any): TreemapData {
    const fileMap = new Map<string, {
      path: string;
      issueCount: number;
      severity: 'critical' | 'high' | 'medium' | 'low';
    }>();

    // Extract file data from categories
    if (analysis.categories) {
      analysis.categories.forEach((category: any) => {
        if (category.issues) {
          category.issues.forEach((issue: any) => {
            if (!fileMap.has(issue.filePath)) {
              fileMap.set(issue.filePath, {
                path: issue.filePath,
                issueCount: 0,
                severity: 'low'
              });
            }

            const fileData = fileMap.get(issue.filePath)!;
            fileData.issueCount++;

            // Update severity to highest
            if (this.compareSeverity(issue.severity, fileData.severity) > 0) {
              fileData.severity = issue.severity;
            }
          });
        }
      });
    }

    // Convert to treemap nodes
    const children: TreemapNode[] = Array.from(fileMap.values())
      .map(file => ({
        name: this.getFileName(file.path),
        value: file.issueCount,
        severity: file.severity,
        description: `${file.issueCount} issues in ${file.path}`
      }))
      .sort((a, b) => (b.value || 0) - (a.value || 0))
      .slice(0, 50); // Limit to top 50 files

    return {
      name: 'Files with Issues',
      children
    };
  }

  /**
   * Extract file name from path
   */
  private static getFileName(filePath: string): string {
    const parts = filePath.split('/');
    return parts[parts.length - 1];
  }

  /**
   * Compare severities (returns 1 if a > b, -1 if a < b, 0 if equal)
   */
  private static compareSeverity(
    a: 'critical' | 'high' | 'medium' | 'low',
    b: 'critical' | 'high' | 'medium' | 'low'
  ): number {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return severityOrder[a] - severityOrder[b];
  }

  /**
   * Filter to show only severe issues (critical and high)
   */
  static filterSevereOnly(data: TreemapData): TreemapData {
    const filteredChildren = data.children
      .map(category => {
        if (!category.children) return category;

        const severeChildren = category.children.filter(
          child => child.severity === 'critical' || child.severity === 'high'
        );

        if (severeChildren.length === 0) return null;

        return {
          ...category,
          children: severeChildren
        };
      })
      .filter(c => c !== null) as TreemapNode[];

    return {
      name: 'Severe Issues',
      children: filteredChildren
    };
  }
}
