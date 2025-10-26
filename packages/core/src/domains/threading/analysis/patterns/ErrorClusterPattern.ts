/**
 * ErrorClusterPattern - Detect clusters of related errors
 *
 * Identifies patterns where errors occur in bursts or cascades,
 * indicating systemic issues, dependency failures, or error propagation.
 */

import { PatternDetector } from './PatternDetector';
import { LogEntry, DetectedPattern, ErrorLogEntry } from '../../types';

export class ErrorClusterPattern extends PatternDetector {
  getName(): string {
    return 'Error Cluster';
  }

  getDescription(): string {
    return 'Detects bursts of related errors occurring within a short time window';
  }

  analyze(entries: LogEntry[]): DetectedPattern[] {
    const results: DetectedPattern[] = [];

    // Extract error entries
    const errorEntries = entries.filter(e => e.type === 'error') as ErrorLogEntry[];

    if (errorEntries.length < 3) {
      // Need at least 3 errors to form a cluster
      return results;
    }

    // Sort by timestamp
    errorEntries.sort((a, b) => a.timestamp - b.timestamp);

    // Detect clusters using time-based windowing
    const clusters = this.detectClusters(errorEntries);

    // Analyze each cluster
    for (const cluster of clusters) {
      const pattern = this.analyzeCluster(cluster);
      if (pattern) {
        results.push(pattern);
      }
    }

    return results;
  }

  /**
   * Detect error clusters using sliding time window
   */
  private detectClusters(errorEntries: ErrorLogEntry[]): ErrorLogEntry[][] {
    const clusters: ErrorLogEntry[][] = [];
    const timeWindow = this.getTimeWindow(); // milliseconds

    let currentCluster: ErrorLogEntry[] = [];
    let clusterStartTime = 0;

    for (const entry of errorEntries) {
      if (currentCluster.length === 0) {
        // Start new cluster
        currentCluster.push(entry);
        clusterStartTime = entry.timestamp;
      } else {
        const timeSinceClusterStart = entry.timestamp - clusterStartTime;

        if (timeSinceClusterStart <= timeWindow) {
          // Add to current cluster
          currentCluster.push(entry);
        } else {
          // Save current cluster if significant
          if (currentCluster.length >= 3) {
            clusters.push([...currentCluster]);
          }

          // Start new cluster
          currentCluster = [entry];
          clusterStartTime = entry.timestamp;
        }
      }
    }

    // Don't forget the last cluster
    if (currentCluster.length >= 3) {
      clusters.push(currentCluster);
    }

    return clusters;
  }

  /**
   * Analyze a single cluster
   */
  private analyzeCluster(cluster: ErrorLogEntry[]): DetectedPattern | null {
    // Get time span of cluster
    const timeRange = this.getTimeRange(cluster);

    // Analyze error patterns
    const errorMessages = cluster.map(e => e.error?.message || 'Unknown error');
    const uniqueErrors = new Set(errorMessages);
    const contexts = new Set(cluster.map(e => e.context));
    const threads = new Set(cluster.flatMap(e => e.threads));

    // Check if errors are related (similar contexts or messages)
    const similarity = this.calculateSimilarity(cluster);

    // Determine impact based on cluster size and error rate
    const errorRate = cluster.length / (timeRange.duration / 1000); // errors per second
    let impact: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let confidence = 0.7;

    if (errorRate > 10 || cluster.length > 20) {
      impact = 'critical';
      confidence = 0.95;
    } else if (errorRate > 5 || cluster.length > 10) {
      impact = 'high';
      confidence = 0.85;
    } else if (errorRate > 2 || cluster.length > 5) {
      impact = 'medium';
      confidence = 0.75;
    }

    // Boost confidence if errors are highly similar
    if (similarity > 0.7) {
      confidence = Math.min(0.98, confidence + 0.1);
    }

    // Build evidence
    const evidence = {
      clusterSize: cluster.length,
      timeSpan: Math.round(timeRange.duration),
      errorRate: Math.round(errorRate * 100) / 100,
      uniqueErrors: uniqueErrors.size,
      affectedContexts: Array.from(contexts),
      affectedThreads: Array.from(threads),
      similarity: Math.round(similarity * 100),
      errorSample: errorMessages.slice(0, 3),
      startTime: new Date(timeRange.start).toISOString(),
      endTime: new Date(timeRange.end).toISOString(),
      recommendation: this.generateRecommendation(cluster, similarity)
    };

    return {
      name: this.getName(),
      type: 'error_cluster',
      confidence,
      description: `${cluster.length} errors occurred within ${Math.round(timeRange.duration / 1000)}s (${Math.round(errorRate)} errors/sec)`,
      evidence,
      impact,
      affectedFunctions: Array.from(contexts)
    };
  }

  /**
   * Calculate similarity between errors in cluster
   */
  private calculateSimilarity(cluster: ErrorLogEntry[]): number {
    const contexts = cluster.map(e => e.context);
    const messages = cluster.map(e => e.error?.message || '');

    // Check context similarity
    const uniqueContexts = new Set(contexts);
    const contextSimilarity = 1 - (uniqueContexts.size / contexts.length);

    // Check message similarity (simplified - count common words)
    const messageSimilarity = this.calculateTextSimilarity(messages);

    // Average of both metrics
    return (contextSimilarity + messageSimilarity) / 2;
  }

  /**
   * Calculate text similarity between messages
   */
  private calculateTextSimilarity(messages: string[]): number {
    if (messages.length === 0) return 0;

    // Extract words from all messages
    const allWords = messages.flatMap(msg =>
      msg.toLowerCase().split(/\W+/).filter(w => w.length > 3)
    );

    if (allWords.length === 0) return 0;

    // Count word frequency
    const wordFreq = new Map<string, number>();
    for (const word of allWords) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }

    // Calculate percentage of shared words
    const sharedWords = Array.from(wordFreq.values()).filter(count => count > 1).length;
    const totalUniqueWords = wordFreq.size;

    return totalUniqueWords === 0 ? 0 : sharedWords / totalUniqueWords;
  }

  /**
   * Get time window based on sensitivity
   */
  private getTimeWindow(): number {
    switch (this.config.sensitivity) {
      case 'low':
        return 60000; // 60 seconds
      case 'high':
        return 5000; // 5 seconds
      case 'medium':
      default:
        return 15000; // 15 seconds
    }
  }

  /**
   * Generate actionable recommendation
   */
  private generateRecommendation(cluster: ErrorLogEntry[], similarity: number): string {
    const errorRate = cluster.length / ((this.getTimeRange(cluster).duration / 1000) || 1);

    if (similarity > 0.8) {
      return `High similarity in error cluster suggests a single root cause. Focus debugging on: ${cluster[0].context}. Check for cascading failures or shared dependencies.`;
    } else if (errorRate > 10) {
      return `Extremely high error rate detected. This may indicate a critical system failure, resource exhaustion, or network issues. Consider implementing circuit breaker pattern.`;
    } else if (cluster.length > 10) {
      return `Large error cluster detected. Review error propagation logic and implement proper error boundaries. Consider adding retry mechanisms with exponential backoff.`;
    } else {
      return `Error cluster detected. Investigate common factors: timing, input data, or environmental conditions. Add structured logging to capture context.`;
    }
  }
}
