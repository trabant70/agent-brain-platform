/**
 * SuccessMetrics - Calculate and track session success metrics
 *
 * Provides analysis of what makes sessions successful
 */

import { SessionSummary } from './SuccessPattern';

export interface SuccessRate {
  total: number;
  successful: number;
  failed: number;
  rate: number;  // 0-1
}

export interface KnowledgeItemStats {
  itemId: string;
  usageCount: number;
  successCount: number;
  failureCount: number;
  successRate: number;  // 0-1
  avgErrorReduction: number;  // How much it reduces errors on average
}

export interface TaskTypeStats {
  taskType: string;  // 'bug', 'feature', 'refactor', etc.
  total: number;
  successful: number;
  successRate: number;
  avgKnowledgeItemsUsed: number;
  mostEffectiveKnowledge: string[];  // Top 3 knowledge item IDs
}

export interface SuccessMetricsReport {
  overall: SuccessRate;
  byTaskType: Map<string, TaskTypeStats>;
  byKnowledgeItem: Map<string, KnowledgeItemStats>;
  trends: {
    lastWeek: SuccessRate;
    lastMonth: SuccessRate;
    improving: boolean;
  };
  recommendations: string[];
}

export class SuccessMetrics {

  /**
   * Calculate overall success rate from sessions
   */
  static calculateSuccessRate(sessions: SessionSummary[]): SuccessRate {
    const total = sessions.length;
    const successful = sessions.filter(s => s.outcome.success).length;
    const failed = total - successful;

    return {
      total,
      successful,
      failed,
      rate: total > 0 ? successful / total : 0
    };
  }

  /**
   * Analyze success metrics across all dimensions
   */
  static analyzeMetrics(sessions: SessionSummary[]): SuccessMetricsReport {
    return {
      overall: this.calculateSuccessRate(sessions),
      byTaskType: this.calculateTaskTypeStats(sessions),
      byKnowledgeItem: this.calculateKnowledgeItemStats(sessions),
      trends: this.calculateTrends(sessions),
      recommendations: this.generateRecommendations(sessions)
    };
  }

  /**
   * Calculate success rate by task type
   */
  private static calculateTaskTypeStats(sessions: SessionSummary[]): Map<string, TaskTypeStats> {
    const stats = new Map<string, TaskTypeStats>();

    // Group sessions by task type (inferred from prompt)
    const sessionsByType = this.groupSessionsByTaskType(sessions);

    for (const [taskType, typeSessions] of sessionsByType) {
      const successful = typeSessions.filter(s => s.outcome.success).length;
      const total = typeSessions.length;

      // Calculate average knowledge items used
      const totalKnowledgeItems = typeSessions.reduce(
        (sum, s) => sum + s.knowledgeUsed.length,
        0
      );
      const avgKnowledgeItemsUsed = totalKnowledgeItems / total;

      // Find most effective knowledge items for this task type
      const knowledgeEffectiveness = this.calculateKnowledgeEffectiveness(typeSessions);
      const mostEffective = Array.from(knowledgeEffectiveness.entries())
        .sort((a, b) => b[1].successRate - a[1].successRate)
        .slice(0, 3)
        .map(([itemId]) => itemId);

      stats.set(taskType, {
        taskType,
        total,
        successful,
        successRate: total > 0 ? successful / total : 0,
        avgKnowledgeItemsUsed,
        mostEffectiveKnowledge: mostEffective
      });
    }

    return stats;
  }

  /**
   * Calculate statistics for each knowledge item
   */
  private static calculateKnowledgeItemStats(sessions: SessionSummary[]): Map<string, KnowledgeItemStats> {
    const stats = new Map<string, KnowledgeItemStats>();

    for (const session of sessions) {
      for (const itemId of session.knowledgeUsed) {
        if (!stats.has(itemId)) {
          stats.set(itemId, {
            itemId,
            usageCount: 0,
            successCount: 0,
            failureCount: 0,
            successRate: 0,
            avgErrorReduction: 0
          });
        }

        const itemStats = stats.get(itemId)!;
        itemStats.usageCount++;

        if (session.outcome.success) {
          itemStats.successCount++;
        } else {
          itemStats.failureCount++;
        }
      }
    }

    // Calculate success rates
    for (const itemStats of stats.values()) {
      const total = itemStats.successCount + itemStats.failureCount;
      itemStats.successRate = total > 0 ? itemStats.successCount / total : 0;

      // Calculate average error reduction (sessions with this item vs without)
      itemStats.avgErrorReduction = this.calculateErrorReduction(
        sessions,
        itemStats.itemId
      );
    }

    return stats;
  }

  /**
   * Calculate trends over time
   */
  private static calculateTrends(sessions: SessionSummary[]): SuccessMetricsReport['trends'] {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const lastWeekSessions = sessions.filter(
      s => s.timestamp >= oneWeekAgo
    );
    const lastMonthSessions = sessions.filter(
      s => s.timestamp >= oneMonthAgo
    );
    const olderSessions = sessions.filter(
      s => s.timestamp < oneMonthAgo
    );

    const lastWeekRate = this.calculateSuccessRate(lastWeekSessions);
    const lastMonthRate = this.calculateSuccessRate(lastMonthSessions);
    const olderRate = this.calculateSuccessRate(olderSessions);

    // Trend is improving if recent rate is higher than older rate
    const improving = lastWeekRate.rate > olderRate.rate;

    return {
      lastWeek: lastWeekRate,
      lastMonth: lastMonthRate,
      improving
    };
  }

  /**
   * Generate actionable recommendations based on metrics
   */
  private static generateRecommendations(sessions: SessionSummary[]): string[] {
    const recommendations: string[] = [];
    const metrics = this.analyzeMetrics(sessions);

    // Low overall success rate
    if (metrics.overall.rate < 0.6 && metrics.overall.total >= 5) {
      recommendations.push(
        'Your success rate is below 60%. Consider enabling more knowledge items or reviewing your project rules.'
      );
    }

    // Find knowledge items with high success rates
    const highPerformers = Array.from(metrics.byKnowledgeItem.values())
      .filter(item => item.successRate > 0.8 && item.usageCount >= 3)
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 3);

    if (highPerformers.length > 0) {
      const itemNames = highPerformers.map(item => item.itemId).join(', ');
      recommendations.push(
        `These knowledge items have high success rates: ${itemNames}. Consider keeping them enabled.`
      );
    }

    // Find underperforming task types
    for (const [taskType, stats] of metrics.byTaskType) {
      if (stats.successRate < 0.5 && stats.total >= 3) {
        recommendations.push(
          `${taskType} tasks have low success rate. Consider adding more templates or patterns for ${taskType}.`
        );
      }
    }

    // Improving trend
    if (metrics.trends.improving && metrics.overall.total >= 10) {
      recommendations.push(
        '🎉 Great progress! Your success rate is improving over time. Keep up the good work!'
      );
    }

    // Not enough data
    if (metrics.overall.total < 5) {
      recommendations.push(
        'Complete a few more sessions to get personalized recommendations based on your patterns.'
      );
    }

    return recommendations;
  }

  // Helper methods

  private static groupSessionsByTaskType(sessions: SessionSummary[]): Map<string, SessionSummary[]> {
    const groups = new Map<string, SessionSummary[]>();

    for (const session of sessions) {
      const taskType = this.inferTaskType(session.prompt);

      if (!groups.has(taskType)) {
        groups.set(taskType, []);
      }

      groups.get(taskType)!.push(session);
    }

    return groups;
  }

  private static inferTaskType(prompt: string): string {
    const lower = prompt.toLowerCase();

    if (/\b(fix|bug|error|issue|broken|crash|fail)\b/.test(lower)) return 'bug';
    if (/\b(add|create|implement|new|feature|build)\b/.test(lower)) return 'feature';
    if (/\b(refactor|clean|improve|reorganize|restructure)\b/.test(lower)) return 'refactor';
    if (/\b(test|spec|coverage|validate)\b/.test(lower)) return 'test';
    if (/\b(document|readme|comment|explain)\b/.test(lower)) return 'docs';
    if (/\b(optimize|performance|speed|slow|fast)\b/.test(lower)) return 'performance';

    return 'other';
  }

  private static calculateKnowledgeEffectiveness(sessions: SessionSummary[]): Map<string, { successRate: number }> {
    const effectiveness = new Map<string, { successCount: number; failureCount: number; successRate: number }>();

    for (const session of sessions) {
      for (const itemId of session.knowledgeUsed) {
        if (!effectiveness.has(itemId)) {
          effectiveness.set(itemId, { successCount: 0, failureCount: 0, successRate: 0 });
        }

        const stats = effectiveness.get(itemId)!;
        if (session.outcome.success) {
          stats.successCount++;
        } else {
          stats.failureCount++;
        }
      }
    }

    // Calculate success rates
    for (const stats of effectiveness.values()) {
      const total = stats.successCount + stats.failureCount;
      stats.successRate = total > 0 ? stats.successCount / total : 0;
    }

    return effectiveness;
  }

  private static calculateErrorReduction(sessions: SessionSummary[], itemId: string): number {
    const withItem = sessions.filter(s => s.knowledgeUsed.includes(itemId));
    const withoutItem = sessions.filter(s => !s.knowledgeUsed.includes(itemId));

    if (withItem.length === 0 || withoutItem.length === 0) {
      return 0;
    }

    const avgErrorsWithItem = withItem.reduce((sum, s) => sum + s.outcome.errorsCount, 0) / withItem.length;
    const avgErrorsWithoutItem = withoutItem.reduce((sum, s) => sum + s.outcome.errorsCount, 0) / withoutItem.length;

    // Return reduction as a positive number (higher is better)
    return Math.max(0, avgErrorsWithoutItem - avgErrorsWithItem);
  }
}
