/**
 * Timeline Data Builder
 * Builds time series data from historical analysis results
 *
 * Input: Array of analysis results with timestamps
 * Output: Timeline data with points and trend information
 */

import { TimelineData, TimelinePoint } from '../../visualization/webview/visualizations/TimelineVisualization';

export interface HistoricalAnalysis {
  commitHash: string;
  commitMessage?: string;
  author?: string;
  timestamp: Date | string;
  analysis: any;  // Full analysis result
}

export class TimelineDataBuilder {
  /**
   * Build timeline from historical analyses
   */
  static buildTimeline(analyses: HistoricalAnalysis[]): TimelineData {
    // Sort by timestamp
    const sorted = [...analyses].sort((a, b) => {
      const timeA = typeof a.timestamp === 'string' ? new Date(a.timestamp) : a.timestamp;
      const timeB = typeof b.timestamp === 'string' ? new Date(b.timestamp) : b.timestamp;
      return timeA.getTime() - timeB.getTime();
    });

    // Extract categories from first analysis
    const categories = this.extractCategories(sorted[0]?.analysis);

    // Build timeline points
    const points: TimelinePoint[] = sorted.map(hist => {
      const timestamp = typeof hist.timestamp === 'string' ? new Date(hist.timestamp) : hist.timestamp;

      return {
        timestamp,
        commitHash: hist.commitHash,
        commitMessage: hist.commitMessage,
        author: hist.author,
        overallScore: this.calculateOverallScore(hist.analysis),
        categoryScores: this.extractCategoryScores(hist.analysis, categories),
        issueCounts: this.extractIssueCounts(hist.analysis)
      };
    });

    return {
      points,
      categories
    };
  }

  /**
   * Extract category names from analysis
   */
  private static extractCategories(analysis: any): string[] {
    if (!analysis?.categories) return [];

    return analysis.categories.map((cat: any) => cat.name);
  }

  /**
   * Calculate overall score from analysis
   */
  private static calculateOverallScore(analysis: any): number {
    if (analysis?.summary?.overallScore !== undefined) {
      return analysis.summary.overallScore;
    }

    // Calculate from categories if not available
    if (analysis?.categories) {
      const scores = analysis.categories.map((cat: any) => cat.score || 0);
      if (scores.length === 0) return 0;

      return Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
    }

    return 0;
  }

  /**
   * Extract category scores
   */
  private static extractCategoryScores(analysis: any, categories: string[]): Record<string, number> {
    const scores: Record<string, number> = {};

    if (analysis?.categories) {
      analysis.categories.forEach((cat: any) => {
        scores[cat.name] = cat.score || 0;
      });
    }

    // Ensure all categories have a score
    categories.forEach(cat => {
      if (!(cat in scores)) {
        scores[cat] = 0;
      }
    });

    return scores;
  }

  /**
   * Extract issue counts by severity
   */
  private static extractIssueCounts(analysis: any): {
    critical: number;
    high: number;
    medium: number;
    low: number;
  } {
    const counts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    if (analysis?.categories) {
      analysis.categories.forEach((category: any) => {
        if (category.issues) {
          category.issues.forEach((issue: any) => {
            const severity = issue.severity as 'critical' | 'high' | 'medium' | 'low';
            if (severity in counts) {
              counts[severity]++;
            }
          });
        }
      });
    }

    return counts;
  }

  /**
   * Build sample timeline (for testing/demo)
   */
  static buildSampleTimeline(): TimelineData {
    const now = new Date();
    const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const categories = ['Feature Completeness', 'UI/UX Quality', 'Test Coverage', 'Internationalization'];

    const points: TimelinePoint[] = [
      {
        timestamp: daysAgo(30),
        commitHash: 'a1b2c3d',
        commitMessage: 'Initial implementation',
        author: 'Alice',
        overallScore: 45,
        categoryScores: {
          'Feature Completeness': 50,
          'UI/UX Quality': 40,
          'Test Coverage': 30,
          'Internationalization': 60
        },
        issueCounts: { critical: 5, high: 12, medium: 8, low: 3 }
      },
      {
        timestamp: daysAgo(25),
        commitHash: 'e4f5g6h',
        commitMessage: 'Add UI components',
        author: 'Bob',
        overallScore: 52,
        categoryScores: {
          'Feature Completeness': 55,
          'UI/UX Quality': 60,
          'Test Coverage': 35,
          'Internationalization': 58
        },
        issueCounts: { critical: 4, high: 10, medium: 12, low: 5 }
      },
      {
        timestamp: daysAgo(20),
        commitHash: 'i7j8k9l',
        commitMessage: 'Fix critical bugs',
        author: 'Alice',
        overallScore: 68,
        categoryScores: {
          'Feature Completeness': 70,
          'UI/UX Quality': 75,
          'Test Coverage': 50,
          'Internationalization': 65
        },
        issueCounts: { critical: 1, high: 8, medium: 10, low: 7 }
      },
      {
        timestamp: daysAgo(15),
        commitHash: 'm0n1o2p',
        commitMessage: 'Add comprehensive tests',
        author: 'Charlie',
        overallScore: 78,
        categoryScores: {
          'Feature Completeness': 72,
          'UI/UX Quality': 78,
          'Test Coverage': 85,
          'Internationalization': 68
        },
        issueCounts: { critical: 0, high: 5, medium: 8, low: 6 }
      },
      {
        timestamp: daysAgo(10),
        commitHash: 'q3r4s5t',
        commitMessage: 'Improve accessibility',
        author: 'Bob',
        overallScore: 82,
        categoryScores: {
          'Feature Completeness': 75,
          'UI/UX Quality': 88,
          'Test Coverage': 85,
          'Internationalization': 72
        },
        issueCounts: { critical: 0, high: 3, medium: 6, low: 8 }
      },
      {
        timestamp: daysAgo(5),
        commitHash: 'u6v7w8x',
        commitMessage: 'Add i18n support',
        author: 'Alice',
        overallScore: 87,
        categoryScores: {
          'Feature Completeness': 78,
          'UI/UX Quality': 90,
          'Test Coverage': 88,
          'Internationalization': 92
        },
        issueCounts: { critical: 0, high: 2, medium: 4, low: 5 }
      },
      {
        timestamp: daysAgo(1),
        commitHash: 'y9z0a1b',
        commitMessage: 'Final polish and optimization',
        author: 'Charlie',
        overallScore: 91,
        categoryScores: {
          'Feature Completeness': 92,
          'UI/UX Quality': 93,
          'Test Coverage': 90,
          'Internationalization': 90
        },
        issueCounts: { critical: 0, high: 1, medium: 3, low: 4 }
      }
    ];

    return { points, categories };
  }

  /**
   * Calculate trend (improving, stable, declining)
   */
  static calculateTrend(timeline: TimelineData): {
    overall: 'improving' | 'stable' | 'declining';
    changePercent: number;
  } {
    if (timeline.points.length < 2) {
      return { overall: 'stable', changePercent: 0 };
    }

    const first = timeline.points[0].overallScore;
    const last = timeline.points[timeline.points.length - 1].overallScore;
    const change = last - first;
    const changePercent = Math.round((change / first) * 100);

    let overall: 'improving' | 'stable' | 'declining';
    if (changePercent > 5) {
      overall = 'improving';
    } else if (changePercent < -5) {
      overall = 'declining';
    } else {
      overall = 'stable';
    }

    return { overall, changePercent };
  }

  /**
   * Find commits where quality dropped significantly
   */
  static findRegressions(timeline: TimelineData, threshold: number = 10): TimelinePoint[] {
    const regressions: TimelinePoint[] = [];

    for (let i = 1; i < timeline.points.length; i++) {
      const previous = timeline.points[i - 1];
      const current = timeline.points[i];

      const drop = previous.overallScore - current.overallScore;
      if (drop >= threshold) {
        regressions.push(current);
      }
    }

    return regressions;
  }

  /**
   * Find commits where quality improved significantly
   */
  static findImprovements(timeline: TimelineData, threshold: number = 10): TimelinePoint[] {
    const improvements: TimelinePoint[] = [];

    for (let i = 1; i < timeline.points.length; i++) {
      const previous = timeline.points[i - 1];
      const current = timeline.points[i];

      const increase = current.overallScore - previous.overallScore;
      if (increase >= threshold) {
        improvements.push(current);
      }
    }

    return improvements;
  }

  /**
   * Calculate velocity (rate of change)
   */
  static calculateVelocity(timeline: TimelineData): number {
    if (timeline.points.length < 2) return 0;

    const first = timeline.points[0];
    const last = timeline.points[timeline.points.length - 1];

    const scoreDelta = last.overallScore - first.overallScore;
    const timeDelta = last.timestamp.getTime() - first.timestamp.getTime();
    const daysDelta = timeDelta / (1000 * 60 * 60 * 24);

    if (daysDelta === 0) return 0;

    // Points per day
    return scoreDelta / daysDelta;
  }

  /**
   * Filter timeline to date range
   */
  static filterByDateRange(timeline: TimelineData, start: Date, end: Date): TimelineData {
    const filteredPoints = timeline.points.filter(p => {
      return p.timestamp >= start && p.timestamp <= end;
    });

    return {
      points: filteredPoints,
      categories: timeline.categories
    };
  }

  /**
   * Resample timeline (reduce data points)
   */
  static resample(timeline: TimelineData, maxPoints: number): TimelineData {
    if (timeline.points.length <= maxPoints) {
      return timeline;
    }

    // Take every nth point to achieve desired count
    const step = Math.ceil(timeline.points.length / maxPoints);
    const resampledPoints: TimelinePoint[] = [];

    for (let i = 0; i < timeline.points.length; i += step) {
      resampledPoints.push(timeline.points[i]);
    }

    // Always include last point
    if (resampledPoints[resampledPoints.length - 1] !== timeline.points[timeline.points.length - 1]) {
      resampledPoints.push(timeline.points[timeline.points.length - 1]);
    }

    return {
      points: resampledPoints,
      categories: timeline.categories
    };
  }
}
