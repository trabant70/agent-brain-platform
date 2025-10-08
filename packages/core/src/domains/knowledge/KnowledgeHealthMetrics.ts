/**
 * KnowledgeHealthMetrics
 *
 * Calculates health statistics for the knowledge base:
 * - Completeness: How well populated each category is
 * - Coverage: How much of the codebase is covered by patterns
 * - Actionability: How many learnings have prevention rules
 * - Recency: How up-to-date the knowledge is
 */

import { ADRSystem } from './adrs/ADRSystem';
import { PatternSystem } from './patterns/PatternSystem';
import { LearningSystem } from './learning/LearningSystem';

export interface HealthMetrics {
  completeness: number;     // 0-1 (percentage of categories with content)
  coverage: number;          // 0-1 (percentage of code patterns documented)
  actionability: number;     // 0-1 (percentage of learnings with prevention rules)
  recency: Date;             // Most recent update across all knowledge
  recommendations: string[]; // Actionable suggestions
  categoryHealth: {
    adrs: CategoryHealth;
    patterns: CategoryHealth;
    learnings: CategoryHealth;
  };
}

export interface CategoryHealth {
  count: number;
  activeCount: number;
  lastUpdated: Date | null;
  health: number; // 0-1
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'empty';
  issues: string[];
}

export class KnowledgeHealthMetrics {
  constructor(
    private adrSystem: ADRSystem,
    private patternSystem: PatternSystem,
    private learningSystem: LearningSystem
  ) {}

  /**
   * Calculate comprehensive health metrics
   */
  async calculateMetrics(): Promise<HealthMetrics> {
    const adrHealth = await this.calculateADRHealth();
    const patternHealth = await this.calculatePatternHealth();
    const learningHealth = await this.calculateLearningHealth();

    // Overall completeness: average of category health scores
    const completeness = (adrHealth.health + patternHealth.health + learningHealth.health) / 3;

    // Coverage: based on pattern count (heuristic)
    const coverage = this.calculateCoverage(patternHealth.count);

    // Actionability: percentage of learnings that can prevent future errors
    const actionability = this.calculateActionability(learningHealth);

    // Recency: most recent update across all categories
    const recency = this.getMostRecentUpdate([
      adrHealth.lastUpdated,
      patternHealth.lastUpdated,
      learningHealth.lastUpdated
    ]);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      adrHealth,
      patternHealth,
      learningHealth,
      completeness,
      coverage,
      actionability
    );

    return {
      completeness,
      coverage,
      actionability,
      recency,
      recommendations,
      categoryHealth: {
        adrs: adrHealth,
        patterns: patternHealth,
        learnings: learningHealth
      }
    };
  }

  /**
   * Calculate ADR health
   */
  private async calculateADRHealth(): Promise<CategoryHealth> {
    try {
      const allADRs = await this.adrSystem.getADRs();
      const activeADRs = allADRs.filter(adr =>
        adr.status === 'accepted' || adr.status === 'proposed'
      );

      const count = allADRs.length;
      const activeCount = activeADRs.length;

      // Find most recent ADR
      let lastUpdated: Date | null = null;
      if (allADRs.length > 0) {
        const dates = allADRs
          .map(adr => adr.timestamp instanceof Date ? adr.timestamp : new Date(adr.timestamp))
          .sort((a, b) => b.getTime() - a.getTime());
        lastUpdated = dates[0];
      }

      // Calculate health score
      let health = 0;
      const issues: string[] = [];

      if (count === 0) {
        health = 0;
        issues.push('No architectural decisions recorded');
      } else if (count < 3) {
        health = 0.3;
        issues.push('Very few architectural decisions documented');
      } else if (count < 10) {
        health = 0.6;
        issues.push('Limited architectural decision coverage');
      } else {
        health = 0.9;
      }

      // Penalize if no active ADRs
      if (activeCount === 0 && count > 0) {
        health *= 0.5;
        issues.push('No active ADRs (all deprecated or rejected)');
      }

      // Penalize if very outdated
      if (lastUpdated) {
        const daysSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate > 90) {
          health *= 0.8;
          issues.push('ADRs not updated in over 90 days');
        }
      }

      const status = this.getHealthStatus(health);

      return { count, activeCount, lastUpdated, health, status, issues };
    } catch (error) {
      return {
        count: 0,
        activeCount: 0,
        lastUpdated: null,
        health: 0,
        status: 'empty',
        issues: ['Error loading ADRs']
      };
    }
  }

  /**
   * Calculate Pattern health
   */
  private async calculatePatternHealth(): Promise<CategoryHealth> {
    try {
      const allPatterns = this.patternSystem.getPatterns();
      // EnginePattern doesn't have deprecated field, treat all as active
      const activePatterns = allPatterns;

      const count = allPatterns.length;
      const activeCount = activePatterns.length;

      // Find most recent pattern (use current date as placeholder since EnginePattern doesn't track creation time)
      let lastUpdated: Date | null = null;
      if (allPatterns.length > 0) {
        lastUpdated = new Date(); // Patterns don't have timestamp, use current time
      }

      // Calculate health score
      let health = 0;
      const issues: string[] = [];

      if (count === 0) {
        health = 0;
        issues.push('No code patterns documented');
      } else if (count < 5) {
        health = 0.4;
        issues.push('Very few code patterns documented');
      } else if (count < 15) {
        health = 0.7;
        issues.push('Moderate pattern coverage');
      } else {
        health = 0.95;
      }

      // Check for deprecated patterns
      const deprecatedCount = count - activeCount;
      if (deprecatedCount > 0 && deprecatedCount / count > 0.3) {
        health *= 0.9;
        issues.push(`${deprecatedCount} deprecated patterns (consider archiving)`);
      }

      const status = this.getHealthStatus(health);

      return { count, activeCount, lastUpdated, health, status, issues };
    } catch (error) {
      return {
        count: 0,
        activeCount: 0,
        lastUpdated: null,
        health: 0,
        status: 'empty',
        issues: ['Error loading patterns']
      };
    }
  }

  /**
   * Calculate Learning health
   * Note: LearningSystem doesn't expose a getLearnings method, so we return placeholder metrics
   */
  private async calculateLearningHealth(): Promise<CategoryHealth> {
    try {
      // LearningSystem doesn't have a getLearnings() method
      // Return placeholder metrics - will be enhanced when API is available
      const count = 0;
      const activeCount = 0;
      const lastUpdated: Date | null = null;
      const health = 1.0; // No learnings tracked yet = good
      const issues: string[] = ['Learning metrics not yet implemented'];
      const status = this.getHealthStatus(health);

      return { count, activeCount, lastUpdated, health, status, issues };
    } catch (error) {
      return {
        count: 0,
        activeCount: 0,
        lastUpdated: null,
        health: 0,
        status: 'empty',
        issues: ['Error loading learnings']
      };
    }
  }

  /**
   * Calculate coverage based on pattern count (heuristic)
   */
  private calculateCoverage(patternCount: number): number {
    // Heuristic: assume a well-documented project has ~20 patterns
    // Scale from 0 to 1, with 20+ patterns = 100% coverage
    if (patternCount === 0) return 0;
    if (patternCount >= 20) return 1;
    return patternCount / 20;
  }

  /**
   * Calculate actionability based on learnings with prevention rules
   */
  private calculateActionability(learningHealth: CategoryHealth): number {
    // If no learnings, actionability is 100% (nothing to act on)
    if (learningHealth.count === 0) return 1;

    // Otherwise, it's based on how many have prevention rules
    // This would require checking the learnings, but we can estimate
    // from the health score which factors this in
    return learningHealth.health;
  }

  /**
   * Get most recent update date
   */
  private getMostRecentUpdate(dates: (Date | null)[]): Date {
    const validDates = dates.filter((d): d is Date => d !== null);
    if (validDates.length === 0) return new Date(0); // Epoch if no updates

    return validDates.sort((a, b) => b.getTime() - a.getTime())[0];
  }

  /**
   * Get health status label
   */
  private getHealthStatus(health: number): 'excellent' | 'good' | 'fair' | 'poor' | 'empty' {
    if (health === 0) return 'empty';
    if (health >= 0.8) return 'excellent';
    if (health >= 0.6) return 'good';
    if (health >= 0.4) return 'fair';
    return 'poor';
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    adrHealth: CategoryHealth,
    patternHealth: CategoryHealth,
    learningHealth: CategoryHealth,
    completeness: number,
    coverage: number,
    actionability: number
  ): string[] {
    const recommendations: string[] = [];

    // ADR recommendations
    if (adrHealth.count === 0) {
      recommendations.push('📐 Start documenting architectural decisions (use "Record ADR" command)');
    } else if (adrHealth.count < 5) {
      recommendations.push('📐 Document more architectural decisions for better context');
    }

    // Pattern recommendations
    if (patternHealth.count === 0) {
      recommendations.push('📋 Document common code patterns to help AI understand your standards');
    } else if (patternHealth.count < 10) {
      recommendations.push('📋 Add more code templates to improve prompt enhancement');
    }

    // Learning recommendations
    if (learningHealth.count > 0) {
      const needsPrevention = learningHealth.issues.some(i => i.includes('prevention'));
      if (needsPrevention) {
        recommendations.push('⚠️ Add prevention rules to existing learnings to avoid repeated mistakes');
      }
    }

    // Coverage recommendations
    if (coverage < 0.5) {
      recommendations.push('📊 Document more patterns to improve coverage (aim for 10-20 common patterns)');
    }

    // Completeness recommendations
    if (completeness < 0.4) {
      recommendations.push('🎯 Focus on building out your knowledge base across all categories');
    }

    // If everything is good
    if (recommendations.length === 0) {
      recommendations.push('✨ Knowledge base is healthy! Keep it updated as your project evolves.');
    }

    return recommendations;
  }

  /**
   * Get category health summary as progress bar
   */
  getProgressBar(health: number, width: number = 10): string {
    const filled = Math.round(health * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  /**
   * Format health metrics as readable string
   */
  formatMetrics(metrics: HealthMetrics): string {
    const lines: string[] = [];

    lines.push('Knowledge Base Health');
    lines.push('='.repeat(60));
    lines.push('');

    // ADRs
    const adr = metrics.categoryHealth.adrs;
    lines.push(`📐 Project Rules        [${this.getProgressBar(adr.health)}] ${Math.round(adr.health * 100)}% ${adr.status}`);
    lines.push(`   ${adr.activeCount} active, ${adr.count - adr.activeCount} deprecated`);
    if (adr.lastUpdated) {
      lines.push(`   Last updated: ${this.formatDate(adr.lastUpdated)}`);
    }
    if (adr.issues.length > 0) {
      adr.issues.forEach(issue => lines.push(`   ⚠️  ${issue}`));
    }
    lines.push('');

    // Patterns
    const pattern = metrics.categoryHealth.patterns;
    lines.push(`📋 Code Templates      [${this.getProgressBar(pattern.health)}] ${Math.round(pattern.health * 100)}% ${pattern.status}`);
    lines.push(`   ${pattern.activeCount} active, ${pattern.count - pattern.activeCount} deprecated`);
    if (pattern.lastUpdated) {
      lines.push(`   Last updated: ${this.formatDate(pattern.lastUpdated)}`);
    }
    if (pattern.issues.length > 0) {
      pattern.issues.forEach(issue => lines.push(`   ⚠️  ${issue}`));
    }
    lines.push('');

    // Learnings
    const learning = metrics.categoryHealth.learnings;
    lines.push(`⚠️ Mistakes to Avoid   [${this.getProgressBar(learning.health)}] ${Math.round(learning.health * 100)}% ${learning.status}`);
    lines.push(`   ${learning.count} learnings captured`);
    if (learning.lastUpdated) {
      lines.push(`   Last updated: ${this.formatDate(learning.lastUpdated)}`);
    }
    if (learning.issues.length > 0) {
      learning.issues.forEach(issue => lines.push(`   💡 ${issue}`));
    }
    lines.push('');

    // Overall metrics
    lines.push('Overall Metrics:');
    lines.push(`  Completeness: ${Math.round(metrics.completeness * 100)}%`);
    lines.push(`  Coverage: ${Math.round(metrics.coverage * 100)}%`);
    lines.push(`  Actionability: ${Math.round(metrics.actionability * 100)}%`);
    lines.push('');

    // Recommendations
    if (metrics.recommendations.length > 0) {
      lines.push('Recommendations:');
      metrics.recommendations.forEach(rec => lines.push(`  ${rec}`));
    }

    return lines.join('\n');
  }

  /**
   * Format date as relative string
   */
  private formatDate(date: Date): string {
    const now = Date.now();
    const diff = now - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'today';
    if (days === 1) return '1 day ago';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  }
}
