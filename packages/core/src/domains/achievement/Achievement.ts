/**
 * Achievement - Data model for unlockable achievements
 *
 * Achievements provide positive reinforcement and track user progress
 */

export type AchievementCategory = 'getting-started' | 'mastery' | 'consistency' | 'quality';

export interface AchievementCriteria {
  metric: string;        // e.g., 'sessionsCompleted', 'successRate', 'adrsCreated'
  operator: '>=' | '>' | '==' | '<=' | '<';
  value: number;

  // Optional complex criteria
  and?: AchievementCriteria[];
  or?: AchievementCriteria[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;  // emoji
  category: AchievementCategory;

  // Unlock criteria
  criteria: AchievementCriteria;

  // Progress tracking
  unlocked: boolean;
  unlockedAt?: Date;
  progress: number;  // 0-1
  currentValue?: number;  // Current metric value
  targetValue?: number;   // Target metric value

  // Metadata
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;  // Achievement points for gamification
}

/**
 * Built-in achievements that ship with Agent Brain
 */
export const BUILT_IN_ACHIEVEMENTS: Omit<Achievement, 'unlocked' | 'unlockedAt' | 'progress' | 'currentValue' | 'targetValue'>[] = [
  // Getting Started
  {
    id: 'first-prompt',
    name: 'Getting Started',
    description: 'Created your first enhanced prompt',
    icon: '🚀',
    category: 'getting-started',
    criteria: {
      metric: 'promptsEnhanced',
      operator: '>=',
      value: 1
    },
    rarity: 'common',
    points: 10
  },
  {
    id: 'first-success',
    name: 'First Win',
    description: 'Completed your first successful session',
    icon: '🎉',
    category: 'getting-started',
    criteria: {
      metric: 'sessionsCompleted',
      operator: '>=',
      value: 1,
      and: [{
        metric: 'lastSessionSuccess',
        operator: '==',
        value: 1
      }]
    },
    rarity: 'common',
    points: 20
  },
  {
    id: 'knowledge-explorer',
    name: 'Knowledge Explorer',
    description: 'Enabled your first knowledge item',
    icon: '🔍',
    category: 'getting-started',
    criteria: {
      metric: 'knowledgeItemsEnabled',
      operator: '>=',
      value: 1
    },
    rarity: 'common',
    points: 15
  },

  // Consistency
  {
    id: '10-sessions',
    name: 'Consistent',
    description: 'Completed 10 sessions',
    icon: '📊',
    category: 'consistency',
    criteria: {
      metric: 'sessionsCompleted',
      operator: '>=',
      value: 10
    },
    rarity: 'common',
    points: 50
  },
  {
    id: '50-sessions',
    name: 'Dedicated',
    description: 'Completed 50 sessions',
    icon: '💪',
    category: 'consistency',
    criteria: {
      metric: 'sessionsCompleted',
      operator: '>=',
      value: 50
    },
    rarity: 'rare',
    points: 100
  },
  {
    id: '100-sessions',
    name: 'Veteran',
    description: 'Completed 100 sessions',
    icon: '🏆',
    category: 'consistency',
    criteria: {
      metric: 'sessionsCompleted',
      operator: '>=',
      value: 100
    },
    rarity: 'epic',
    points: 200
  },
  {
    id: 'week-streak',
    name: 'Week Warrior',
    description: 'Used Agent Brain for 7 days in a row',
    icon: '🔥',
    category: 'consistency',
    criteria: {
      metric: 'currentStreak',
      operator: '>=',
      value: 7
    },
    rarity: 'rare',
    points: 75
  },

  // Quality
  {
    id: '90-percent-success',
    name: 'Expert',
    description: 'Achieved 90% session success rate (min 10 sessions)',
    icon: '⭐',
    category: 'quality',
    criteria: {
      metric: 'successRate',
      operator: '>=',
      value: 0.9,
      and: [{
        metric: 'sessionsCompleted',
        operator: '>=',
        value: 10
      }]
    },
    rarity: 'epic',
    points: 150
  },
  {
    id: 'perfect-ten',
    name: 'Perfect Ten',
    description: '10 successful sessions in a row',
    icon: '💯',
    category: 'quality',
    criteria: {
      metric: 'successStreak',
      operator: '>=',
      value: 10
    },
    rarity: 'rare',
    points: 100
  },
  {
    id: 'zero-errors',
    name: 'Bug Free',
    description: 'Completed 5 sessions with zero errors',
    icon: '✨',
    category: 'quality',
    criteria: {
      metric: 'zeroErrorSessions',
      operator: '>=',
      value: 5
    },
    rarity: 'rare',
    points: 80
  },

  // Mastery
  {
    id: '5-adrs',
    name: 'Rule Maker',
    description: 'Created 5 project rules (ADRs)',
    icon: '📐',
    category: 'mastery',
    criteria: {
      metric: 'adrsCreated',
      operator: '>=',
      value: 5
    },
    rarity: 'rare',
    points: 75
  },
  {
    id: '10-patterns',
    name: 'Pattern Master',
    description: 'Created 10 code templates',
    icon: '📋',
    category: 'mastery',
    criteria: {
      metric: 'patternsCreated',
      operator: '>=',
      value: 10
    },
    rarity: 'epic',
    points: 100
  },
  {
    id: 'all-knowledge-types',
    name: 'Knowledge Master',
    description: 'Used all 4 knowledge types in prompts',
    icon: '🧠',
    category: 'mastery',
    criteria: {
      metric: 'knowledgeTypesUsed',
      operator: '>=',
      value: 4
    },
    rarity: 'rare',
    points: 90
  },
  {
    id: 'skill-up-learning',
    name: 'Leveling Up',
    description: 'Progressed from novice to learning skill level',
    icon: '📈',
    category: 'mastery',
    criteria: {
      metric: 'skillLevel',
      operator: '>=',
      value: 2  // 1=novice, 2=learning, 3=proficient
    },
    rarity: 'rare',
    points: 100
  },
  {
    id: 'skill-up-proficient',
    name: 'Proficient Developer',
    description: 'Reached proficient skill level',
    icon: '🎓',
    category: 'mastery',
    criteria: {
      metric: 'skillLevel',
      operator: '>=',
      value: 3
    },
    rarity: 'epic',
    points: 200
  },
  {
    id: 'success-pattern-creator',
    name: 'Pattern Learner',
    description: 'Created your first success pattern',
    icon: '🔮',
    category: 'mastery',
    criteria: {
      metric: 'successPatternsCreated',
      operator: '>=',
      value: 1
    },
    rarity: 'rare',
    points: 85
  },
  {
    id: 'template-master',
    name: 'Template Wizard',
    description: 'Used all 6 structural templates',
    icon: '🪄',
    category: 'mastery',
    criteria: {
      metric: 'templatesUsed',
      operator: '>=',
      value: 6
    },
    rarity: 'epic',
    points: 120
  },

  // Legendary achievements
  {
    id: 'completionist',
    name: 'Completionist',
    description: 'Unlocked all other achievements',
    icon: '👑',
    category: 'mastery',
    criteria: {
      metric: 'achievementsUnlocked',
      operator: '>=',
      value: 17  // Total achievements minus this one
    },
    rarity: 'legendary',
    points: 500
  }
];

/**
 * Utility functions for working with achievements
 */
export class AchievementUtils {

  /**
   * Evaluate criteria against metrics
   */
  static evaluateCriteria(criteria: AchievementCriteria, metrics: Record<string, number>): boolean {
    const value = metrics[criteria.metric] ?? 0;

    // Evaluate main criteria
    let result = false;
    switch (criteria.operator) {
      case '>=':
        result = value >= criteria.value;
        break;
      case '>':
        result = value > criteria.value;
        break;
      case '==':
        result = value === criteria.value;
        break;
      case '<=':
        result = value <= criteria.value;
        break;
      case '<':
        result = value < criteria.value;
        break;
    }

    // Evaluate AND conditions
    if (criteria.and && criteria.and.length > 0) {
      const andResults = criteria.and.map(c => this.evaluateCriteria(c, metrics));
      result = result && andResults.every(r => r);
    }

    // Evaluate OR conditions
    if (criteria.or && criteria.or.length > 0) {
      const orResults = criteria.or.map(c => this.evaluateCriteria(c, metrics));
      result = result || orResults.some(r => r);
    }

    return result;
  }

  /**
   * Calculate progress toward achievement (0-1)
   */
  static calculateProgress(criteria: AchievementCriteria, metrics: Record<string, number>): number {
    const value = metrics[criteria.metric] ?? 0;
    const target = criteria.value;

    if (target === 0) return 1;

    const progress = Math.min(value / target, 1);
    return progress;
  }

  /**
   * Get achievement color based on rarity
   */
  static getRarityColor(rarity: Achievement['rarity']): string {
    switch (rarity) {
      case 'common': return '#9CA3AF';    // Gray
      case 'rare': return '#3B82F6';      // Blue
      case 'epic': return '#8B5CF6';      // Purple
      case 'legendary': return '#F59E0B'; // Gold
    }
  }

  /**
   * Sort achievements by unlock status and rarity
   */
  static sortAchievements(achievements: Achievement[]): Achievement[] {
    return achievements.sort((a, b) => {
      // Unlocked first
      if (a.unlocked !== b.unlocked) {
        return a.unlocked ? -1 : 1;
      }

      // Then by progress (higher first)
      if (a.progress !== b.progress) {
        return b.progress - a.progress;
      }

      // Then by rarity
      const rarityOrder = { common: 0, rare: 1, epic: 2, legendary: 3 };
      return rarityOrder[b.rarity] - rarityOrder[a.rarity];
    });
  }
}
