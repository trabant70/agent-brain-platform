/**
 * ThreadAnalyzer - Main analysis engine
 *
 * Orchestrates pattern detection, generates analysis reports,
 * and provides insights from threading logs.
 */

import {
  LogEntry,
  DetectedPattern,
  AnalysisReport,
  ThreadSession,
  Recommendation,
  AnalysisInsight,
  AnalysisMetrics
} from '../types';
import {
  PatternDetector,
  PerformanceDegradationPattern,
  ErrorClusterPattern,
  MemoryLeakPattern,
  CachePattern
} from './patterns';

export interface AnalyzerConfig {
  enabledDetectors?: string[];
  sensitivity?: 'low' | 'medium' | 'high';
  minSampleSize?: number;
  parallelAnalysis?: boolean;
}

export class ThreadAnalyzer {
  private config: AnalyzerConfig;
  private detectors: Map<string, PatternDetector>;

  constructor(config: Partial<AnalyzerConfig> = {}) {
    this.config = {
      enabledDetectors: ['all'],
      sensitivity: 'medium',
      minSampleSize: 10,
      parallelAnalysis: true,
      ...config
    };

    // Initialize pattern detectors
    this.detectors = new Map();
    this.registerDetectors();
  }

  /**
   * Register all pattern detectors
   */
  private registerDetectors(): void {
    const detectorInstances: PatternDetector[] = [
      new PerformanceDegradationPattern({
        enabled: this.shouldEnableDetector('performance_degradation'),
        sensitivity: this.config.sensitivity,
        minSampleSize: this.config.minSampleSize
      }),
      new ErrorClusterPattern({
        enabled: this.shouldEnableDetector('error_cluster'),
        sensitivity: this.config.sensitivity,
        minSampleSize: this.config.minSampleSize
      }),
      new MemoryLeakPattern({
        enabled: this.shouldEnableDetector('memory_leak'),
        sensitivity: this.config.sensitivity,
        minSampleSize: this.config.minSampleSize
      }),
      new CachePattern({
        enabled: this.shouldEnableDetector('cache_pattern'),
        sensitivity: this.config.sensitivity,
        minSampleSize: this.config.minSampleSize
      })
    ];

    for (const detector of detectorInstances) {
      this.detectors.set(detector.getName(), detector);
    }
  }

  /**
   * Check if a detector should be enabled
   */
  private shouldEnableDetector(detectorName: string): boolean {
    const enabled = this.config.enabledDetectors || ['all'];
    return enabled.includes('all') || enabled.includes(detectorName);
  }

  /**
   * Analyze log entries and generate report
   */
  async analyze(entries: LogEntry[], session?: ThreadSession): Promise<AnalysisReport> {
    const startTime = Date.now();
    const timestamp = Date.now();

    // Run all detectors
    const patterns = await this.runDetectors(entries);

    // Calculate statistics
    const stats = this.calculateStatistics(entries);

    // Identify bottlenecks
    const bottlenecks = this.identifyBottlenecks(entries);

    // Generate insights
    const insights = this.generateInsights(patterns, bottlenecks);

    // Generate summary
    const summary = this.generateSummary(patterns, bottlenecks, stats);

    // Generate recommendations
    const recommendations = this.generateRecommendations(patterns, bottlenecks);

    const analysisTime = Date.now() - startTime;

    // Build metrics
    const timeRange = entries.length > 0 ? {
      start: Math.min(...entries.map(e => e.timestamp)),
      end: Math.max(...entries.map(e => e.timestamp)),
      duration: Math.max(...entries.map(e => e.timestamp)) - Math.min(...entries.map(e => e.timestamp))
    } : { start: 0, end: 0, duration: 0 };

    const metrics: AnalysisMetrics = {
      totalEntries: entries.length,
      deltaCount: entries.filter(e => e.type === 'delta').length,
      errorCount: entries.filter(e => e.type === 'error').length,
      functionsAnalyzed: new Set(entries.map(e => e.context)).size,
      timeRange
    };

    const report: AnalysisReport = {
      session: session || this.createDefaultSession(),
      timestamp,
      patterns,
      insights,
      recommendations,
      summary,
      metrics
    };

    return report;
  }

  /**
   * Run all pattern detectors
   */
  private async runDetectors(entries: LogEntry[]): Promise<DetectedPattern[]> {
    const results: DetectedPattern[] = [];

    if (this.config.parallelAnalysis) {
      // Run detectors in parallel
      const promises = Array.from(this.detectors.values()).map(async detector => {
        if (detector.shouldRun(entries)) {
          return detector.analyze(entries);
        }
        return [];
      });

      const detectorResults = await Promise.all(promises);
      results.push(...detectorResults.flat());
    } else {
      // Run detectors sequentially
      for (const detector of this.detectors.values()) {
        if (detector.shouldRun(entries)) {
          const detectorResults = detector.analyze(entries);
          results.push(...detectorResults);
        }
      }
    }

    // Sort by severity and confidence
    return this.sortPatterns(results);
  }

  /**
   * Calculate overall statistics
   */
  private calculateStatistics(entries: LogEntry[]): any {
    const exitEntries = entries.filter(e => e.type === 'exit');
    const errorEntries = entries.filter(e => e.type === 'error');
    const deltaEntries = entries.filter(e => e.type === 'delta');

    // Calculate timing statistics
    const durations = exitEntries
      .map(e => (e as any).duration)
      .filter(d => d !== undefined) as number[];

    const timingStats = durations.length > 0 ? {
      count: durations.length,
      mean: Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length),
      min: Math.round(Math.min(...durations)),
      max: Math.round(Math.max(...durations)),
      total: Math.round(durations.reduce((sum, d) => sum + d, 0))
    } : null;

    // Calculate error statistics
    const errorsByContext = new Map<string, number>();
    for (const error of errorEntries) {
      errorsByContext.set(error.context, (errorsByContext.get(error.context) || 0) + 1);
    }

    const errorStats = {
      total: errorEntries.length,
      uniqueContexts: errorsByContext.size,
      byContext: Array.from(errorsByContext.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([context, count]) => ({ context, count }))
    };

    // Calculate thread statistics
    const threadCounts = new Map<string, number>();
    for (const entry of entries) {
      for (const thread of entry.threads) {
        threadCounts.set(thread, (threadCounts.get(thread) || 0) + 1);
      }
    }

    const threadStats = {
      active: threadCounts.size,
      distribution: Array.from(threadCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([thread, count]) => ({ thread, count }))
    };

    // Calculate delta statistics
    const deltaStats = {
      total: deltaEntries.length,
      bySubtype: this.countBySubtype(deltaEntries)
    };

    return {
      timing: timingStats,
      errors: errorStats,
      threads: threadStats,
      deltas: deltaStats,
      totalEntries: entries.length
    };
  }

  /**
   * Identify performance bottlenecks
   */
  private identifyBottlenecks(entries: LogEntry[]): Array<{
    context: string;
    avgDuration: number;
    maxDuration: number;
    callCount: number;
    totalTime: number;
    severity: 'info' | 'warning' | 'error' | 'critical';
  }> {
    // Group by context
    const contextGroups = new Map<string, number[]>();

    for (const entry of entries) {
      if (entry.type === 'exit' && (entry as any).duration !== undefined) {
        const duration = (entry as any).duration as number;
        const existing = contextGroups.get(entry.context) || [];
        existing.push(duration);
        contextGroups.set(entry.context, existing);
      }
    }

    // Calculate bottleneck metrics
    const bottlenecks = Array.from(contextGroups.entries()).map(([context, durations]) => {
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      const totalTime = durations.reduce((sum, d) => sum + d, 0);

      // Determine severity based on duration and total time
      let severity: 'info' | 'warning' | 'error' | 'critical' = 'info';

      if (maxDuration > 5000 || totalTime > 50000) {
        severity = 'critical';
      } else if (maxDuration > 1000 || totalTime > 10000) {
        severity = 'error';
      } else if (maxDuration > 500 || totalTime > 5000) {
        severity = 'warning';
      }

      return {
        context,
        avgDuration: Math.round(avgDuration),
        maxDuration: Math.round(maxDuration),
        callCount: durations.length,
        totalTime: Math.round(totalTime),
        severity
      };
    });

    // Sort by total time (biggest impact)
    return bottlenecks.sort((a, b) => b.totalTime - a.totalTime).slice(0, 20);
  }

  /**
   * Generate summary text
   */
  private generateSummary(
    patterns: DetectedPattern[],
    bottlenecks: any[],
    stats: any
  ): string {
    const lines: string[] = [];

    // Overview
    lines.push(`Analyzed ${stats.totalEntries} log entries`);

    if (stats.timing) {
      lines.push(
        `Total execution time: ${stats.timing.total}ms across ${stats.timing.count} operations`
      );
    }

    // Patterns found
    if (patterns.length > 0) {
      const criticalCount = patterns.filter(p => p.impact === 'critical').length;
      const highCount = patterns.filter(p => p.impact === 'high').length;
      const mediumCount = patterns.filter(p => p.impact === 'medium').length;

      lines.push(`\nDetected ${patterns.length} patterns:`);
      if (criticalCount > 0) lines.push(`  - ${criticalCount} critical issues`);
      if (highCount > 0) lines.push(`  - ${highCount} high impact`);
      if (mediumCount > 0) lines.push(`  - ${mediumCount} medium impact`);
    } else {
      lines.push('\nNo significant patterns detected');
    }

    // Bottlenecks
    if (bottlenecks.length > 0) {
      const topBottleneck = bottlenecks[0];
      lines.push(
        `\nTop bottleneck: ${topBottleneck.context} (${topBottleneck.totalTime}ms total, ${topBottleneck.callCount} calls)`
      );
    }

    // Errors
    if (stats.errors.total > 0) {
      lines.push(`\n${stats.errors.total} errors across ${stats.errors.uniqueContexts} contexts`);
    }

    return lines.join('\n');
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(patterns: DetectedPattern[], bottlenecks: any[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Add pattern-specific recommendations
    for (const pattern of patterns) {
      if (pattern.impact === 'critical' || pattern.impact === 'high') {
        const rec = pattern.evidence?.recommendation;
        if (rec) {
          recommendations.push({
            title: `${pattern.name}: ${pattern.description}`,
            description: rec,
            priority: pattern.impact === 'critical' ? 'urgent' : 'high',
            effort: 'medium',
            impact: pattern.impact === 'critical' ? 'high' : 'medium'
          });
        }
      }
    }

    // Add bottleneck recommendations
    const criticalBottlenecks = bottlenecks.filter(b => b.severity === 'critical');
    if (criticalBottlenecks.length > 0) {
      for (const bottleneck of criticalBottlenecks.slice(0, 3)) {
        recommendations.push({
          title: `Optimize ${bottleneck.context}`,
          description: `Performance bottleneck detected - consuming ${bottleneck.totalTime}ms total across ${bottleneck.callCount} calls. Consider profiling and optimizing this function.`,
          priority: 'high',
          effort: 'medium',
          impact: 'high'
        });
      }
    }

    // Limit to top 10 recommendations
    return recommendations.slice(0, 10);
  }

  /**
   * Sort patterns by impact and confidence
   */
  private sortPatterns(patterns: DetectedPattern[]): DetectedPattern[] {
    const impactOrder = { critical: 0, high: 1, medium: 2, low: 3 };

    return patterns.sort((a, b) => {
      // Sort by impact first
      const impactDiff = impactOrder[a.impact] - impactOrder[b.impact];
      if (impactDiff !== 0) return impactDiff;

      // Then by confidence
      return b.confidence - a.confidence;
    });
  }

  /**
   * Generate analysis insights from patterns
   */
  private generateInsights(patterns: DetectedPattern[], bottlenecks: any[]): AnalysisInsight[] {
    const insights: AnalysisInsight[] = [];

    // Group patterns by type to identify trends
    const patternsByType = new Map<string, DetectedPattern[]>();
    for (const pattern of patterns) {
      const existing = patternsByType.get(pattern.type) || [];
      existing.push(pattern);
      patternsByType.set(pattern.type, existing);
    }

    // Generate insights from patterns
    for (const [type, typePatterns] of patternsByType) {
      if (typePatterns.length > 0) {
        const highImpact = typePatterns.filter(p => p.impact === 'critical' || p.impact === 'high');

        if (highImpact.length > 0) {
          const categoryMap: Record<string, 'performance' | 'error' | 'memory' | 'cache' | 'architecture'> = {
            'performance_degradation': 'performance',
            'error_cluster': 'error',
            'memory_leak': 'memory',
            'cache_opportunity': 'cache',
            'cache_thrashing': 'cache',
            'cache_inefficiency': 'cache'
          };

          insights.push({
            title: `${typePatterns[0].name} detected`,
            description: `Found ${typePatterns.length} instance(s) of ${type} pattern across different functions`,
            category: categoryMap[type] || 'architecture',
            severity: highImpact.length > 2 ? 'critical' : highImpact.length > 1 ? 'error' : 'warning',
            rootCause: `Multiple functions showing similar ${type} characteristics`,
            relatedPatterns: typePatterns.map(p => p.name)
          });
        }
      }
    }

    // Generate insights from bottlenecks
    if (bottlenecks.length > 5) {
      insights.push({
        title: 'Multiple performance bottlenecks detected',
        description: `${bottlenecks.length} functions identified as performance bottlenecks`,
        category: 'performance',
        severity: 'warning',
        rootCause: 'System may benefit from overall performance optimization review',
        relatedPatterns: []
      });
    }

    return insights;
  }

  /**
   * Count entries by subtype
   */
  private countBySubtype(entries: LogEntry[]): any {
    const counts = new Map<string, number>();

    for (const entry of entries) {
      if ((entry as any).subtype) {
        const subtype = (entry as any).subtype;
        counts.set(subtype, (counts.get(subtype) || 0) + 1);
      }
    }

    return Object.fromEntries(counts);
  }

  /**
   * Create default session for analysis
   */
  private createDefaultSession(): ThreadSession {
    return {
      id: `analysis-${Date.now()}`,
      name: 'Ad-hoc Analysis',
      description: 'Automatic analysis session',
      startTime: Date.now(),
      threads: [] // Unknown threads for ad-hoc analysis
    };
  }

  /**
   * Get list of available detectors
   */
  getDetectors(): string[] {
    return Array.from(this.detectors.keys());
  }

  /**
   * Enable/disable specific detector
   */
  setDetectorEnabled(detectorName: string, enabled: boolean): boolean {
    const detector = this.detectors.get(detectorName);
    if (!detector) return false;

    (detector as any).config.enabled = enabled;
    return true;
  }
}
