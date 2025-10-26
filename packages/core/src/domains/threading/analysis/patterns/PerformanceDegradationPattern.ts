/**
 * PerformanceDegradationPattern - Detect performance degradation over time
 *
 * Identifies patterns where execution time increases progressively,
 * indicating potential memory leaks, resource exhaustion, or algorithmic issues.
 */

import { PatternDetector } from './PatternDetector';
import { LogEntry, DetectedPattern, ExitLogEntry, DeltaLogEntry } from '../../types';

export class PerformanceDegradationPattern extends PatternDetector {
  getName(): string {
    return 'Performance Degradation';
  }

  getDescription(): string {
    return 'Detects progressive slowdown in execution time over repeated calls';
  }

  analyze(entries: LogEntry[]): DetectedPattern[] {
    const results: DetectedPattern[] = [];

    // Group by context to analyze per-function degradation
    const contextGroups = this.groupByContext(entries);

    for (const [context, contextEntries] of contextGroups) {
      const degradation = this.detectDegradation(context, contextEntries);
      if (degradation) {
        results.push(degradation);
      }
    }

    return results;
  }

  private detectDegradation(context: string, entries: LogEntry[]): DetectedPattern | null {
    // Extract execution times from exit entries
    const exitEntries = entries.filter(e => e.type === 'exit') as ExitLogEntry[];

    if (exitEntries.length < (this.config.minSampleSize || 10)) {
      return null;
    }

    // Sort by timestamp
    exitEntries.sort((a, b) => a.timestamp - b.timestamp);

    // Calculate durations
    const durations = exitEntries
      .filter(e => e.duration !== undefined)
      .map(e => e.duration as number);

    if (durations.length < (this.config.minSampleSize || 10)) {
      return null;
    }

    // Analyze trend using linear regression
    const trend = this.calculateTrend(durations);

    // Check if there's significant degradation
    if (trend.slope <= 0 || trend.correlation < 0.5) {
      // No degradation or weak correlation
      return null;
    }

    // Calculate degradation severity
    const stats = this.calculateStats(durations);
    const degradationPercent = ((stats.max - stats.min) / stats.min) * 100;

    // Determine impact based on degradation percentage and trend strength
    let impact: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let confidence = trend.correlation;

    if (degradationPercent > 200 && trend.correlation > 0.8) {
      impact = 'critical';
      confidence = Math.min(0.95, confidence * 1.1);
    } else if (degradationPercent > 100 && trend.correlation > 0.7) {
      impact = 'high';
      confidence = Math.min(0.9, confidence * 1.05);
    } else if (degradationPercent > 50 && trend.correlation > 0.6) {
      impact = 'medium';
    }

    // Build evidence
    const evidence = {
      sampleSize: durations.length,
      firstDuration: durations[0],
      lastDuration: durations[durations.length - 1],
      degradationPercent: Math.round(degradationPercent),
      trend: {
        slope: trend.slope,
        intercept: trend.intercept,
        correlation: trend.correlation
      },
      stats: {
        mean: Math.round(stats.mean),
        median: Math.round(stats.median),
        stdDev: Math.round(stats.stdDev),
        min: Math.round(stats.min),
        max: Math.round(stats.max)
      },
      recommendation: this.generateRecommendation(degradationPercent, context)
    };

    return {
      name: this.getName(),
      type: 'performance_degradation',
      confidence,
      description: `Execution time increased by ${Math.round(degradationPercent)}% over ${durations.length} calls`,
      evidence,
      impact,
      affectedFunctions: [context]
    };
  }

  /**
   * Calculate linear regression trend
   */
  private calculateTrend(values: number[]): {
    slope: number;
    intercept: number;
    correlation: number;
  } {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate correlation coefficient
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    const correlation = denominator === 0 ? 0 : numerator / denominator;

    return { slope, intercept, correlation };
  }

  /**
   * Generate actionable recommendation
   */
  private generateRecommendation(degradationPercent: number, context: string): string {
    if (degradationPercent > 200) {
      return `Critical performance degradation detected in ${context}. Investigate for memory leaks, resource exhaustion, or unbounded data structures. Consider profiling with a heap analyzer.`;
    } else if (degradationPercent > 100) {
      return `Significant performance degradation in ${context}. Check for growing collections, inefficient algorithms, or resource accumulation. Review cache invalidation and cleanup logic.`;
    } else if (degradationPercent > 50) {
      return `Moderate performance degradation in ${context}. Monitor resource usage and consider implementing memoization or optimizing hot paths.`;
    } else {
      return `Minor performance degradation detected in ${context}. Continue monitoring to determine if this is a trend.`;
    }
  }
}
