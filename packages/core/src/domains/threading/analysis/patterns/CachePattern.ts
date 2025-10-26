/**
 * CachePattern - Detect cache efficiency patterns
 *
 * Identifies patterns related to caching: cache misses, inefficient
 * cache usage, cache thrashing, and opportunities for caching.
 */

import { PatternDetector } from './PatternDetector';
import { LogEntry, DetectedPattern, EntryLogEntry, ExitLogEntry } from '../../types';

export class CachePattern extends PatternDetector {
  getName(): string {
    return 'Cache Efficiency';
  }

  getDescription(): string {
    return 'Detects cache-related patterns: misses, thrashing, and optimization opportunities';
  }

  analyze(entries: LogEntry[]): DetectedPattern[] {
    const results: DetectedPattern[] = [];

    // Group entries by context
    const contextGroups = this.groupByContext(entries);

    for (const [context, contextEntries] of contextGroups) {
      // Detect repeated calls with same inputs
      const cacheOpportunity = this.detectCacheOpportunity(context, contextEntries);
      if (cacheOpportunity) {
        results.push(cacheOpportunity);
      }

      // Detect cache thrashing patterns
      const thrashing = this.detectCacheThrashing(context, contextEntries);
      if (thrashing) {
        results.push(thrashing);
      }

      // Detect inefficient cache usage
      const inefficiency = this.detectCacheInefficiency(context, contextEntries);
      if (inefficiency) {
        results.push(inefficiency);
      }
    }

    return results;
  }

  /**
   * Detect opportunities for caching (repeated expensive calls)
   */
  private detectCacheOpportunity(context: string, entries: LogEntry[]): DetectedPattern | null {
    // Find entry/exit pairs with arguments
    const entryExitPairs = this.pairEntryExit(entries);

    if (entryExitPairs.length < (this.config.minSampleSize || 10)) {
      return null;
    }

    // Group by input arguments to find repeated calls
    const argumentGroups = new Map<string, typeof entryExitPairs>();

    for (const pair of entryExitPairs) {
      const argsKey = this.serializeArgs(pair.entry.args);
      const existing = argumentGroups.get(argsKey) || [];
      existing.push(pair);
      argumentGroups.set(argsKey, existing);
    }

    // Find groups with multiple calls (potential cache hits)
    const repeatedCalls = Array.from(argumentGroups.entries())
      .filter(([_, calls]) => calls.length >= 2)
      .sort((a, b) => b[1].length - a[1].length);

    if (repeatedCalls.length === 0) {
      return null;
    }

    // Calculate potential savings
    const totalCalls = entryExitPairs.length;
    const uniqueCalls = argumentGroups.size;
    const repeatRate = ((totalCalls - uniqueCalls) / totalCalls) * 100;

    // Only report if repeat rate is significant
    if (repeatRate < 20) {
      return null;
    }

    // Calculate time that could be saved
    let potentialSavings = 0;
    let actualTime = 0;

    for (const [_, calls] of repeatedCalls) {
      const durations = calls.map(c => c.duration);
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;

      // First call computes, rest could be cache hits (assume 99% speedup)
      actualTime += durations.reduce((sum, d) => sum + d, 0);
      potentialSavings += avgDuration * (calls.length - 1) * 0.99;
    }

    const savingsPercent = (potentialSavings / actualTime) * 100;

    // Determine impact based on potential savings
    let impact: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let confidence = 0.7;

    if (savingsPercent > 70 && repeatRate > 60) {
      impact = 'critical';
      confidence = 0.9;
    } else if (savingsPercent > 50 && repeatRate > 40) {
      impact = 'high';
      confidence = 0.85;
    } else if (savingsPercent > 30 && repeatRate > 20) {
      impact = 'medium';
      confidence = 0.75;
    } else {
      return null;
    }

    // Build evidence
    const topRepeated = repeatedCalls.slice(0, 3).map(([args, calls]) => ({
      args: this.truncateArgs(args),
      callCount: calls.length,
      avgDuration: Math.round(calls.reduce((sum, c) => sum + c.duration, 0) / calls.length)
    }));

    const evidence = {
      totalCalls,
      uniqueCalls,
      repeatRate: Math.round(repeatRate),
      potentialSavings: Math.round(potentialSavings),
      savingsPercent: Math.round(savingsPercent),
      actualTime: Math.round(actualTime),
      topRepeatedCalls: topRepeated,
      recommendation: `Implement memoization or caching for ${context}. With ${totalCalls} calls and ${uniqueCalls} unique inputs, caching could reduce execution time by ~${Math.round(savingsPercent)}%. Consider LRU cache with appropriate TTL.`
    };

    return {
      name: this.getName(),
      type: 'cache_opportunity',
      confidence,
      description: `${Math.round(repeatRate)}% of calls are repeated - caching could save ${Math.round(savingsPercent)}% execution time`,
      evidence,
      impact,
      affectedFunctions: [context]
    };
  }

  /**
   * Detect cache thrashing (cache evictions causing re-computation)
   */
  private detectCacheThrashing(context: string, entries: LogEntry[]): DetectedPattern | null {
    const entryExitPairs = this.pairEntryExit(entries);

    if (entryExitPairs.length < 20) {
      return null;
    }

    // Analyze call pattern over time windows
    const windowSize = 10; // Look at groups of 10 calls
    let thrashingScore = 0;
    let windowCount = 0;

    for (let i = 0; i <= entryExitPairs.length - windowSize; i++) {
      const window = entryExitPairs.slice(i, i + windowSize);
      const argsInWindow = new Set(window.map(p => this.serializeArgs(p.entry.args)));

      // If we see the same arguments multiple times in a small window,
      // it might indicate cache is too small (thrashing)
      const avgRepeats = window.length / argsInWindow.size;

      if (avgRepeats > 1.5) {
        thrashingScore += avgRepeats - 1;
        windowCount++;
      }
    }

    const avgThrashing = windowCount > 0 ? thrashingScore / windowCount : 0;

    // Only report if thrashing is significant
    if (avgThrashing < 0.5) {
      return null;
    }

    let impact: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let confidence = 0.6 + Math.min(0.3, avgThrashing * 0.1);

    if (avgThrashing > 2.0) {
      impact = 'high';
    } else if (avgThrashing > 1.0) {
      impact = 'medium';
    }

    const evidence = {
      sampleSize: entryExitPairs.length,
      thrashingScore: Math.round(avgThrashing * 100) / 100,
      windowsAnalyzed: windowCount,
      recommendation: `Cache size may be too small for ${context}. Consider: 1) Increasing cache size, 2) Using LRU eviction strategy, 3) Implementing cache warming for common inputs. Analyze access patterns to determine optimal cache size.`
    };

    return {
      name: this.getName(),
      type: 'cache_thrashing',
      confidence,
      description: `Detected potential cache thrashing in ${context} - same inputs re-computed frequently`,
      evidence,
      impact,
      affectedFunctions: [context]
    };
  }

  /**
   * Detect inefficient cache usage
   */
  private detectCacheInefficiency(context: string, entries: LogEntry[]): DetectedPattern | null {
    const exitEntries = entries.filter(e => e.type === 'exit') as ExitLogEntry[];

    if (exitEntries.length < (this.config.minSampleSize || 10)) {
      return null;
    }

    // Check for high variance in execution time (cache hits should be fast, misses slow)
    const durations = exitEntries
      .filter(e => e.duration !== undefined)
      .map(e => e.duration as number);

    if (durations.length < (this.config.minSampleSize || 10)) {
      return null;
    }

    const stats = this.calculateStats(durations);

    // High variance might indicate inconsistent cache performance
    const coefficientOfVariation = stats.stdDev / stats.mean;

    // Only report if variance is very high (suggests bimodal distribution)
    if (coefficientOfVariation < 1.0) {
      return null;
    }

    // Try to identify fast calls (cache hits) vs slow calls (cache misses)
    const sortedDurations = [...durations].sort((a, b) => a - b);
    const fastThreshold = sortedDurations[Math.floor(durations.length * 0.25)];
    const slowThreshold = sortedDurations[Math.floor(durations.length * 0.75)];

    const fastCalls = durations.filter(d => d <= fastThreshold).length;
    const slowCalls = durations.filter(d => d >= slowThreshold).length;

    const hitRate = (fastCalls / durations.length) * 100;
    const missRate = (slowCalls / durations.length) * 100;

    // Only report if there's a clear bimodal distribution
    if (slowThreshold / fastThreshold < 5) {
      return null; // Not enough difference
    }

    let impact: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let confidence = 0.7;

    if (missRate > 60) {
      impact = 'high';
      confidence = 0.9;
    } else if (missRate > 40) {
      impact = 'medium';
      confidence = 0.85;
    }

    const evidence = {
      sampleSize: durations.length,
      hitRate: Math.round(hitRate),
      missRate: Math.round(missRate),
      fastCallAvg: Math.round(fastThreshold),
      slowCallAvg: Math.round(slowThreshold),
      speedup: Math.round(slowThreshold / fastThreshold),
      coefficientOfVariation: Math.round(coefficientOfVariation * 100) / 100,
      recommendation: `Optimize cache strategy for ${context}. Current miss rate: ${Math.round(missRate)}%. Consider: 1) Cache warming, 2) Predictive pre-fetching, 3) Better eviction policy, 4) Larger cache size.`
    };

    return {
      name: this.getName(),
      type: 'cache_inefficiency',
      confidence,
      description: `Cache miss rate of ${Math.round(missRate)}% detected in ${context}`,
      evidence,
      impact,
      affectedFunctions: [context]
    };
  }

  /**
   * Pair entry and exit log entries
   */
  private pairEntryExit(entries: LogEntry[]): Array<{
    entry: EntryLogEntry;
    exit: ExitLogEntry;
    duration: number;
  }> {
    const pairs: Array<{ entry: EntryLogEntry; exit: ExitLogEntry; duration: number }> = [];
    const entryEntries = entries.filter(e => e.type === 'entry') as EntryLogEntry[];
    const exitEntries = entries.filter(e => e.type === 'exit') as ExitLogEntry[];

    // Simple pairing: match by index (assumes entries are in order)
    for (let i = 0; i < Math.min(entryEntries.length, exitEntries.length); i++) {
      const entry = entryEntries[i];
      const exit = exitEntries[i];

      if (exit.duration !== undefined) {
        pairs.push({ entry, exit, duration: exit.duration });
      }
    }

    return pairs;
  }

  /**
   * Serialize arguments for comparison
   */
  private serializeArgs(args: any[] | undefined): string {
    if (!args || args.length === 0) return '__empty__';

    try {
      return JSON.stringify(args);
    } catch {
      return '__error__';
    }
  }

  /**
   * Truncate arguments for display
   */
  private truncateArgs(argsKey: string, maxLength: number = 50): string {
    if (argsKey.length <= maxLength) return argsKey;
    return argsKey.substring(0, maxLength) + '...';
  }
}
