/**
 * MemoryLeakPattern - Detect potential memory leaks
 *
 * Identifies patterns where memory usage grows continuously without
 * corresponding releases, indicating potential memory leaks.
 */

import { PatternDetector } from './PatternDetector';
import { LogEntry, DetectedPattern, DeltaLogEntry } from '../../types';

export class MemoryLeakPattern extends PatternDetector {
  getName(): string {
    return 'Memory Leak';
  }

  getDescription(): string {
    return 'Detects continuous memory growth indicating potential memory leaks';
  }

  analyze(entries: LogEntry[]): DetectedPattern[] {
    const results: DetectedPattern[] = [];

    // Extract memory delta entries
    const memoryDeltas = entries.filter(
      e => e.type === 'delta' && e.subtype === 'memory'
    ) as DeltaLogEntry[];

    if (memoryDeltas.length < (this.config.minSampleSize || 10)) {
      return results;
    }

    // Group by context to detect per-function leaks
    const contextGroups = this.groupByContext(memoryDeltas);

    for (const [context, contextEntries] of contextGroups) {
      const leak = this.detectMemoryLeak(context, contextEntries);
      if (leak) {
        results.push(leak);
      }
    }

    return results;
  }

  private detectMemoryLeak(context: string, entries: LogEntry[]): DetectedPattern | null {
    if (entries.length < (this.config.minSampleSize || 10)) {
      return null;
    }

    // Sort by timestamp
    entries.sort((a, b) => a.timestamp - b.timestamp);

    // Extract memory values from evidence
    const memoryValues = entries
      .map(e => this.extractMemoryValue(e as DeltaLogEntry))
      .filter(v => v !== null) as number[];

    if (memoryValues.length < (this.config.minSampleSize || 10)) {
      return null;
    }

    // Calculate trend using linear regression
    const trend = this.calculateTrend(memoryValues);

    // Check if there's consistent growth
    if (trend.slope <= 0 || trend.correlation < 0.6) {
      // No leak pattern or weak correlation
      return null;
    }

    // Calculate statistics
    const stats = this.calculateStats(memoryValues);
    const growthRate = trend.slope; // bytes per sample
    const totalGrowth = stats.max - stats.min;
    const growthPercent = (totalGrowth / stats.min) * 100;

    // Determine impact based on growth rate and pattern strength
    let impact: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let confidence = trend.correlation;

    // Adjust impact based on growth
    if (growthPercent > 500 && trend.correlation > 0.85) {
      impact = 'critical';
      confidence = Math.min(0.98, confidence * 1.1);
    } else if (growthPercent > 200 && trend.correlation > 0.75) {
      impact = 'high';
      confidence = Math.min(0.92, confidence * 1.05);
    } else if (growthPercent > 100 && trend.correlation > 0.65) {
      impact = 'medium';
    } else if (growthPercent > 50 && trend.correlation > 0.6) {
      impact = 'low';
    } else {
      // Growth not significant enough
      return null;
    }

    // Check for acceleration (memory growth speeding up)
    const acceleration = this.detectAcceleration(memoryValues);

    if (acceleration > 0 && acceleration > growthRate * 0.1) {
      // Memory growth is accelerating
      if (impact === 'medium') impact = 'high';
      if (impact === 'high') impact = 'critical';
      confidence = Math.min(0.98, confidence + 0.05);
    }

    // Build evidence
    const evidence = {
      sampleSize: memoryValues.length,
      initialMemory: this.formatBytes(memoryValues[0]),
      finalMemory: this.formatBytes(memoryValues[memoryValues.length - 1]),
      totalGrowth: this.formatBytes(totalGrowth),
      growthPercent: Math.round(growthPercent),
      growthRate: this.formatBytes(growthRate) + '/call',
      trend: {
        slope: Math.round(trend.slope),
        correlation: Math.round(trend.correlation * 100) / 100
      },
      acceleration: acceleration > 0 ? this.formatBytes(acceleration) + '/call²' : 'none',
      stats: {
        mean: this.formatBytes(stats.mean),
        median: this.formatBytes(stats.median),
        stdDev: this.formatBytes(stats.stdDev),
        min: this.formatBytes(stats.min),
        max: this.formatBytes(stats.max)
      },
      recommendation: this.generateRecommendation(growthPercent, acceleration, context)
    };

    return {
      name: this.getName(),
      type: 'memory_leak',
      confidence,
      description: `Memory grew by ${Math.round(growthPercent)}% (${this.formatBytes(totalGrowth)}) over ${memoryValues.length} calls`,
      evidence,
      impact,
      affectedFunctions: [context]
    };
  }

  /**
   * Extract memory value from delta entry evidence
   */
  private extractMemoryValue(entry: DeltaLogEntry): number | null {
    if (entry.evidence && typeof entry.evidence === 'object') {
      const evidence = entry.evidence as any;
      if (evidence.memoryDelta !== undefined) {
        return Math.abs(evidence.memoryDelta);
      }
      if (evidence.currentMemory !== undefined) {
        return evidence.currentMemory;
      }
    }
    return null;
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
    const correlation = denominator === 0 ? 0 : Math.abs(numerator / denominator);

    return { slope, intercept, correlation };
  }

  /**
   * Detect acceleration in memory growth (second derivative)
   */
  private detectAcceleration(values: number[]): number {
    if (values.length < 3) return 0;

    // Calculate differences between consecutive values
    const diffs: number[] = [];
    for (let i = 1; i < values.length; i++) {
      diffs.push(values[i] - values[i - 1]);
    }

    // Calculate second differences (acceleration)
    const secondDiffs: number[] = [];
    for (let i = 1; i < diffs.length; i++) {
      secondDiffs.push(diffs[i] - diffs[i - 1]);
    }

    // Average acceleration
    return secondDiffs.reduce((sum, v) => sum + v, 0) / secondDiffs.length;
  }

  /**
   * Format bytes for human readability
   */
  private formatBytes(bytes: number): string {
    const absBytes = Math.abs(bytes);
    if (absBytes < 1024) return `${Math.round(bytes)}B`;
    if (absBytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
    if (absBytes < 1024 * 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))}MB`;
    return `${Math.round(bytes / (1024 * 1024 * 1024))}GB`;
  }

  /**
   * Generate actionable recommendation
   */
  private generateRecommendation(growthPercent: number, acceleration: number, context: string): string {
    const hasAcceleration = acceleration > 0;

    if (growthPercent > 500) {
      return `Critical memory leak detected in ${context}. ${
        hasAcceleration ? 'Growth is accelerating. ' : ''
      }Immediately investigate: 1) Event listeners not being removed, 2) Global references to objects, 3) Circular references preventing GC. Use heap snapshots to identify retained objects.`;
    } else if (growthPercent > 200) {
      return `Significant memory leak in ${context}. ${
        hasAcceleration ? 'Memory growth is accelerating. ' : ''
      }Check for: 1) Unbounded caches or arrays, 2) Closure scope issues, 3) Detached DOM nodes. Implement periodic cleanup and weak references where appropriate.`;
    } else if (growthPercent > 100) {
      return `Memory leak detected in ${context}. ${
        hasAcceleration ? 'Growth rate is increasing. ' : ''
      }Review: 1) Data structure cleanup logic, 2) Cache invalidation, 3) Resource disposal. Consider implementing memory budgets and automatic cleanup.`;
    } else {
      return `Potential memory leak in ${context}. Monitor trend and investigate if growth continues. Check for accumulated state, growing collections, or missing cleanup logic.`;
    }
  }
}
