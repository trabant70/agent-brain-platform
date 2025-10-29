/**
 * Stacked Bar Data Builder
 * Aggregates issues by file and severity for stacked bar visualization
 *
 * Input: Analysis results with file issues
 * Output: File breakdown with severity counts
 */

import { StackedBarData, FileIssueBreakdown } from '../../visualization/webview/visualizations/StackedBarChart';

export class StackedBarDataBuilder {
  /**
   * Build stacked bar data from analysis
   */
  static buildFromAnalysis(analysis: any, topN: number = 20): StackedBarData {
    const fileMap = new Map<string, FileIssueBreakdown>();

    // Aggregate issues by file
    if (analysis?.categories) {
      analysis.categories.forEach((category: any) => {
        if (category.issues) {
          category.issues.forEach((issue: any) => {
            if (!fileMap.has(issue.filePath)) {
              fileMap.set(issue.filePath, {
                filePath: issue.filePath,
                fileName: this.getFileName(issue.filePath),
                critical: 0,
                high: 0,
                medium: 0,
                low: 0,
                total: 0
              });
            }

            const fileData = fileMap.get(issue.filePath)!;
            fileData.total++;

            const severity = issue.severity as 'critical' | 'high' | 'medium' | 'low';
            if (severity in fileData) {
              (fileData as any)[severity]++;
            }
          });
        }
      });
    }

    // Convert to array and sort by total
    const files = Array.from(fileMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, topN);

    const maxCount = files.length > 0 ? files[0].total : 0;

    return { files, maxCount };
  }

  /**
   * Extract file name from path
   */
  private static getFileName(filePath: string): string {
    const parts = filePath.split('/');
    return parts[parts.length - 1] || filePath;
  }

  /**
   * Build sample data for demonstration
   */
  static buildSampleData(): StackedBarData {
    const files: FileIssueBreakdown[] = [
      {
        filePath: 'src/components/UserProfile.tsx',
        fileName: 'UserProfile.tsx',
        critical: 3,
        high: 5,
        medium: 2,
        low: 1,
        total: 11
      },
      {
        filePath: 'src/services/ApiService.ts',
        fileName: 'ApiService.ts',
        critical: 2,
        high: 4,
        medium: 3,
        low: 0,
        total: 9
      },
      {
        filePath: 'src/utils/validation.ts',
        fileName: 'validation.ts',
        critical: 0,
        high: 6,
        medium: 1,
        low: 1,
        total: 8
      },
      {
        filePath: 'src/components/Dashboard.tsx',
        fileName: 'Dashboard.tsx',
        critical: 1,
        high: 3,
        medium: 2,
        low: 1,
        total: 7
      },
      {
        filePath: 'src/api/endpoints.ts',
        fileName: 'endpoints.ts',
        critical: 0,
        high: 2,
        medium: 3,
        low: 1,
        total: 6
      },
      {
        filePath: 'src/models/User.ts',
        fileName: 'User.ts',
        critical: 1,
        high: 1,
        medium: 2,
        low: 1,
        total: 5
      },
      {
        filePath: 'src/components/LoginForm.tsx',
        fileName: 'LoginForm.tsx',
        critical: 0,
        high: 3,
        medium: 1,
        low: 0,
        total: 4
      },
      {
        filePath: 'src/utils/formatters.ts',
        fileName: 'formatters.ts',
        critical: 0,
        high: 1,
        medium: 2,
        low: 1,
        total: 4
      },
      {
        filePath: 'src/services/AuthService.ts',
        fileName: 'AuthService.ts',
        critical: 1,
        high: 1,
        medium: 1,
        low: 0,
        total: 3
      },
      {
        filePath: 'src/config/constants.ts',
        fileName: 'constants.ts',
        critical: 0,
        high: 0,
        medium: 2,
        low: 1,
        total: 3
      }
    ];

    return { files, maxCount: 11 };
  }

  /**
   * Filter to only show files with critical issues
   */
  static filterCriticalOnly(data: StackedBarData): StackedBarData {
    const criticalFiles = data.files.filter(f => f.critical > 0);
    return {
      files: criticalFiles,
      maxCount: criticalFiles.length > 0 ? criticalFiles[0].total : 0
    };
  }

  /**
   * Group files by directory
   */
  static groupByDirectory(files: FileIssueBreakdown[]): Map<string, FileIssueBreakdown[]> {
    const dirMap = new Map<string, FileIssueBreakdown[]>();

    files.forEach(file => {
      const dir = this.getDirectory(file.filePath);
      if (!dirMap.has(dir)) {
        dirMap.set(dir, []);
      }
      dirMap.get(dir)!.push(file);
    });

    return dirMap;
  }

  /**
   * Get directory from file path
   */
  private static getDirectory(filePath: string): string {
    const parts = filePath.split('/');
    if (parts.length <= 1) return '/';
    return parts.slice(0, -1).join('/');
  }

  /**
   * Calculate directory-level statistics
   */
  static aggregateByDirectory(files: FileIssueBreakdown[]): FileIssueBreakdown[] {
    const dirMap = new Map<string, FileIssueBreakdown>();

    files.forEach(file => {
      const dir = this.getDirectory(file.filePath);

      if (!dirMap.has(dir)) {
        dirMap.set(dir, {
          filePath: dir,
          fileName: dir,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          total: 0
        });
      }

      const dirData = dirMap.get(dir)!;
      dirData.critical += file.critical;
      dirData.high += file.high;
      dirData.medium += file.medium;
      dirData.low += file.low;
      dirData.total += file.total;
    });

    return Array.from(dirMap.values())
      .sort((a, b) => b.total - a.total);
  }

  /**
   * Get files with highest severity ratio
   */
  static getHighestSeverityRatio(files: FileIssueBreakdown[], topN: number = 10): FileIssueBreakdown[] {
    return [...files]
      .sort((a, b) => {
        const ratioA = (a.critical * 10 + a.high * 5) / (a.total || 1);
        const ratioB = (b.critical * 10 + b.high * 5) / (b.total || 1);
        return ratioB - ratioA;
      })
      .slice(0, topN);
  }
}
