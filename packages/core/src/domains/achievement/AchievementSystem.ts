/**
 * AchievementSystem - Tracks user progress and unlocks achievements
 *
 * Provides positive reinforcement and gamification
 */

import { Achievement, BUILT_IN_ACHIEVEMENTS, AchievementUtils } from './Achievement';
import * as fs from 'fs';
import * as path from 'path';

export interface UserMetrics {
  // Prompt metrics
  promptsEnhanced: number;

  // Session metrics
  sessionsCompleted: number;
  successfulSessions: number;
  failedSessions: number;
  successRate: number;  // 0-1
  lastSessionSuccess: number;  // 0 or 1

  // Streak metrics
  currentStreak: number;  // Days in a row
  successStreak: number;  // Successful sessions in a row

  // Error metrics
  zeroErrorSessions: number;

  // Knowledge metrics
  knowledgeItemsEnabled: number;
  knowledgeTypesUsed: number;  // How many different types (ADRs, patterns, learnings, golden-paths)
  adrsCreated: number;
  patternsCreated: number;
  learningsCreated: number;

  // Pattern metrics
  successPatternsCreated: number;
  templatesUsed: number;  // How many different templates (bug, feature, refactor, etc.)

  // Skill progression
  skillLevel: number;  // 1=novice, 2=learning, 3=proficient

  // Meta metrics
  achievementsUnlocked: number;
}

export interface AchievementEvent {
  achievement: Achievement;
  timestamp: Date;
  previousProgress: number;
  newProgress: number;
}

export class AchievementSystem {
  private achievements: Map<string, Achievement> = new Map();
  private metrics: UserMetrics;
  private storagePath: string;
  private achievementsFilePath: string;
  private metricsFilePath: string;

  constructor(storagePath: string) {
    this.storagePath = storagePath;
    this.achievementsFilePath = path.join(storagePath, 'achievements.json');
    this.metricsFilePath = path.join(storagePath, 'user-metrics.json');

    // Initialize default metrics
    this.metrics = this.getDefaultMetrics();

    // Load saved data
    this.loadAchievements();
    this.loadMetrics();

    // Initialize built-in achievements if not present
    this.initializeBuiltInAchievements();
  }

  /**
   * Update metrics and check for new achievement unlocks
   */
  async updateMetrics(updates: Partial<UserMetrics>): Promise<AchievementEvent[]> {
    // Update metrics
    this.metrics = {
      ...this.metrics,
      ...updates
    };

    // Recalculate derived metrics
    this.metrics.successRate = this.metrics.sessionsCompleted > 0
      ? this.metrics.successfulSessions / this.metrics.sessionsCompleted
      : 0;

    // Check for unlocks
    const events = await this.checkUnlocks();

    // Save updated state
    await this.saveMetrics();
    if (events.length > 0) {
      await this.saveAchievements();
    }

    return events;
  }

  /**
   * Get all achievements
   */
  getAllAchievements(): Achievement[] {
    return Array.from(this.achievements.values());
  }

  /**
   * Get achievements by category
   */
  getAchievementsByCategory(category: Achievement['category']): Achievement[] {
    return this.getAllAchievements().filter(a => a.category === category);
  }

  /**
   * Get unlocked achievements
   */
  getUnlockedAchievements(): Achievement[] {
    return this.getAllAchievements().filter(a => a.unlocked);
  }

  /**
   * Get locked achievements (sorted by progress)
   */
  getLockedAchievements(): Achievement[] {
    const locked = this.getAllAchievements().filter(a => !a.unlocked);
    return locked.sort((a, b) => b.progress - a.progress);
  }

  /**
   * Get achievement by ID
   */
  getAchievement(id: string): Achievement | undefined {
    return this.achievements.get(id);
  }

  /**
   * Get current user metrics
   */
  getMetrics(): UserMetrics {
    return { ...this.metrics };
  }

  /**
   * Get statistics summary
   */
  getStatistics(): {
    totalAchievements: number;
    unlockedAchievements: number;
    totalPoints: number;
    completionPercentage: number;
    nextAchievement?: Achievement;
    recentUnlocks: Achievement[];
  } {
    const all = this.getAllAchievements();
    const unlocked = this.getUnlockedAchievements();
    const totalPoints = unlocked.reduce((sum, a) => sum + a.points, 0);

    // Find next closest achievement
    const locked = this.getLockedAchievements();
    const nextAchievement = locked.length > 0 ? locked[0] : undefined;

    // Get recently unlocked (last 5)
    const recentUnlocks = unlocked
      .filter(a => a.unlockedAt)
      .sort((a, b) => b.unlockedAt!.getTime() - a.unlockedAt!.getTime())
      .slice(0, 5);

    return {
      totalAchievements: all.length,
      unlockedAchievements: unlocked.length,
      totalPoints,
      completionPercentage: all.length > 0 ? (unlocked.length / all.length) * 100 : 0,
      nextAchievement,
      recentUnlocks
    };
  }

  /**
   * Reset all achievements (for testing)
   */
  async resetAchievements(): Promise<void> {
    for (const achievement of this.achievements.values()) {
      achievement.unlocked = false;
      achievement.unlockedAt = undefined;
      achievement.progress = 0;
      achievement.currentValue = undefined;
    }

    await this.saveAchievements();
  }

  /**
   * Reset metrics (for testing)
   */
  async resetMetrics(): Promise<void> {
    this.metrics = this.getDefaultMetrics();
    await this.saveMetrics();
  }

  // Private methods

  private async checkUnlocks(): Promise<AchievementEvent[]> {
    const events: AchievementEvent[] = [];
    const metricsRecord = this.metricsToRecord();

    for (const achievement of this.achievements.values()) {
      if (achievement.unlocked) continue;

      const previousProgress = achievement.progress;
      const unlocked = AchievementUtils.evaluateCriteria(achievement.criteria, metricsRecord);
      const newProgress = AchievementUtils.calculateProgress(achievement.criteria, metricsRecord);

      // Update progress
      achievement.progress = newProgress;
      achievement.currentValue = metricsRecord[achievement.criteria.metric];
      achievement.targetValue = achievement.criteria.value;

      // Check for unlock
      if (unlocked) {
        achievement.unlocked = true;
        achievement.unlockedAt = new Date();
        this.metrics.achievementsUnlocked++;

        events.push({
          achievement: { ...achievement },
          timestamp: new Date(),
          previousProgress,
          newProgress: 1.0
        });
      }
    }

    return events;
  }

  private metricsToRecord(): Record<string, number> {
    return { ...this.metrics } as Record<string, number>;
  }

  private initializeBuiltInAchievements(): void {
    for (const builtIn of BUILT_IN_ACHIEVEMENTS) {
      if (!this.achievements.has(builtIn.id)) {
        const achievement: Achievement = {
          ...builtIn,
          unlocked: false,
          progress: 0,
          currentValue: undefined,
          targetValue: builtIn.criteria.value
        };

        this.achievements.set(achievement.id, achievement);
      }
    }
  }

  private getDefaultMetrics(): UserMetrics {
    return {
      promptsEnhanced: 0,
      sessionsCompleted: 0,
      successfulSessions: 0,
      failedSessions: 0,
      successRate: 0,
      lastSessionSuccess: 0,
      currentStreak: 0,
      successStreak: 0,
      zeroErrorSessions: 0,
      knowledgeItemsEnabled: 0,
      knowledgeTypesUsed: 0,
      adrsCreated: 0,
      patternsCreated: 0,
      learningsCreated: 0,
      successPatternsCreated: 0,
      templatesUsed: 0,
      skillLevel: 1,  // Start as novice
      achievementsUnlocked: 0
    };
  }

  private loadAchievements(): void {
    try {
      if (fs.existsSync(this.achievementsFilePath)) {
        const data = fs.readFileSync(this.achievementsFilePath, 'utf8');
        const parsed = JSON.parse(data);

        for (const achievementData of parsed.achievements || []) {
          const achievement: Achievement = {
            ...achievementData,
            unlockedAt: achievementData.unlockedAt ? new Date(achievementData.unlockedAt) : undefined
          };

          this.achievements.set(achievement.id, achievement);
        }
      }
    } catch (error) {
      console.error('Failed to load achievements:', error);
      // Start fresh if loading fails
      this.achievements.clear();
    }
  }

  private async saveAchievements(): Promise<void> {
    try {
      const dir = path.dirname(this.achievementsFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = {
        version: '1.0',
        lastSaved: new Date().toISOString(),
        achievements: Array.from(this.achievements.values())
      };

      fs.writeFileSync(
        this.achievementsFilePath,
        JSON.stringify(data, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('Failed to save achievements:', error);
      throw error;
    }
  }

  private loadMetrics(): void {
    try {
      if (fs.existsSync(this.metricsFilePath)) {
        const data = fs.readFileSync(this.metricsFilePath, 'utf8');
        const parsed = JSON.parse(data);

        this.metrics = {
          ...this.getDefaultMetrics(),
          ...parsed.metrics
        };
      }
    } catch (error) {
      console.error('Failed to load metrics:', error);
      // Use defaults if loading fails
      this.metrics = this.getDefaultMetrics();
    }
  }

  private async saveMetrics(): Promise<void> {
    try {
      const dir = path.dirname(this.metricsFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = {
        version: '1.0',
        lastSaved: new Date().toISOString(),
        metrics: this.metrics
      };

      fs.writeFileSync(
        this.metricsFilePath,
        JSON.stringify(data, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('Failed to save metrics:', error);
      throw error;
    }
  }
}
