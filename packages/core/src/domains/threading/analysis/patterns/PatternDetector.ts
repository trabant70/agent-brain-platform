/**
 * PatternDetector - Base interface for pattern detection
 *
 * All pattern detectors implement this interface to provide
 * consistent pattern detection across different types of issues.
 */

import { LogEntry, DetectedPattern } from '../../types';

export interface PatternDetectorConfig {
  enabled: boolean;
  sensitivity?: 'low' | 'medium' | 'high';
  minSampleSize?: number;
  confidenceThreshold?: number;
}

export abstract class PatternDetector {
  protected config: PatternDetectorConfig;

  constructor(config: Partial<PatternDetectorConfig> = {}) {
    this.config = {
      enabled: true,
      sensitivity: 'medium',
      minSampleSize: 10,
      confidenceThreshold: 0.7,
      ...config
    };
  }

  /**
   * Analyze log entries and detect patterns
   */
  abstract analyze(entries: LogEntry[]): DetectedPattern[];

  /**
   * Get detector name
   */
  abstract getName(): string;

  /**
   * Get detector description
   */
  abstract getDescription(): string;

  /**
   * Check if detector should run
   */
  shouldRun(entries: LogEntry[]): boolean {
    return this.config.enabled && entries.length >= (this.config.minSampleSize || 10);
  }

  /**
   * Calculate confidence score (0-1)
   */
  protected calculateConfidence(evidence: any): number {
    // Override in subclasses for specific confidence calculations
    return 0.5;
  }

  /**
   * Filter entries by thread
   */
  protected filterByThread(entries: LogEntry[], threadName: string): LogEntry[] {
    return entries.filter(e => e.threads.includes(threadName));
  }

  /**
   * Filter entries by context
   */
  protected filterByContext(entries: LogEntry[], context: string): LogEntry[] {
    return entries.filter(e => e.context === context);
  }

  /**
   * Get time range of entries
   */
  protected getTimeRange(entries: LogEntry[]): { start: number; end: number; duration: number } {
    if (entries.length === 0) {
      return { start: 0, end: 0, duration: 0 };
    }

    const timestamps = entries.map(e => e.timestamp);
    const start = Math.min(...timestamps);
    const end = Math.max(...timestamps);

    return { start, end, duration: end - start };
  }

  /**
   * Group entries by context
   */
  protected groupByContext(entries: LogEntry[]): Map<string, LogEntry[]> {
    const groups = new Map<string, LogEntry[]>();

    for (const entry of entries) {
      const existing = groups.get(entry.context) || [];
      existing.push(entry);
      groups.set(entry.context, existing);
    }

    return groups;
  }

  /**
   * Calculate statistical measures
   */
  protected calculateStats(values: number[]): {
    mean: number;
    median: number;
    stdDev: number;
    min: number;
    max: number;
  } {
    if (values.length === 0) {
      return { mean: 0, median: 0, stdDev: 0, min: 0, max: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    return { mean, median, stdDev, min, max };
  }
}
