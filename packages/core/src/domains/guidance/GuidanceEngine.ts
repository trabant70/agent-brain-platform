/**
 * Guidance Engine
 *
 * Detects user context and selects appropriate contextual tips
 * for the AI companion system.
 */

import { UserContext, GuidanceRule, GuidanceTip } from './types';

export class GuidanceEngine {
  private rules: GuidanceRule[] = [];
  private shownHistory: Map<string, number> = new Map();
  private currentContext: UserContext;

  constructor() {
    // Initialize with default novice context
    this.currentContext = {
      currentActivity: 'idle',
      skillLevel: 'novice',
      recentErrors: [],
      idleTime: 0,
      promptLength: 0,
      knowledgeItemsSelected: 0,
      sessionsCompleted: 0,
      sessionsFailed: 0,
      lastActionTimestamp: new Date()
    };

    this.initializeRules();
  }

  /**
   * Update the current user context
   */
  updateContext(changes: Partial<UserContext>): void {
    this.currentContext = {
      ...this.currentContext,
      ...changes
    };
  }

  /**
   * Get the current user context
   */
  getCurrentContext(): UserContext {
    return { ...this.currentContext };
  }

  /**
   * Select the best tip to show based on current context
   * Returns null if no tip should be shown
   */
  selectTip(context: UserContext): GuidanceRule | null {
    // Filter rules by:
    // 1. Trigger condition matches
    // 2. Haven't exceeded max show count
    const eligibleRules = this.rules.filter(rule => {
      const timesShown = this.shownHistory.get(rule.id) || 0;
      const canShow = timesShown < rule.maxShowCount;
      const shouldTrigger = rule.trigger(context);

      return canShow && shouldTrigger;
    });

    if (eligibleRules.length === 0) {
      return null;
    }

    // Sort by priority (critical > helpful > informational)
    const priorityOrder = {
      critical: 3,
      helpful: 2,
      informational: 1
    };

    eligibleRules.sort((a, b) => {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    // Return highest priority rule
    return eligibleRules[0];
  }

  /**
   * Record that a tip was shown to the user
   */
  recordTipShown(ruleId: string): void {
    const currentCount = this.shownHistory.get(ruleId) || 0;
    this.shownHistory.set(ruleId, currentCount + 1);

    // Update the rule's timesShown counter
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.timesShown = currentCount + 1;
    }
  }

  /**
   * Add a custom rule to the guidance system
   */
  addRule(rule: GuidanceRule): void {
    this.rules.push(rule);
  }

  /**
   * Initialize default guidance rules
   */
  private initializeRules(): void {
    // Rule 1: First-time welcome
    this.rules.push({
      id: 'first-time-welcome',
      trigger: (ctx) => ctx.sessionsCompleted === 0 && ctx.currentActivity === 'idle',
      message: "👋 Welcome! I'll help make AI coding work better for you.",
      priority: 'informational',
      maxShowCount: 1,
      timesShown: 0
    });

    // Rule 2: Prompt too short
    this.rules.push({
      id: 'prompt-too-short',
      trigger: (ctx) =>
        ctx.currentActivity === 'building_prompt' &&
        ctx.promptLength < 20 &&
        ctx.idleTime > 10000,
      message: "Try being more specific! Example: 'Add user login with email validation'",
      priority: 'helpful',
      maxShowCount: 3,
      timesShown: 0
    });

    // Rule 3: Error detected
    this.rules.push({
      id: 'error-detected',
      trigger: (ctx) =>
        ctx.currentActivity === 'error_state' &&
        ctx.recentErrors.length > 0,
      message: "Let's fix this together. I can help you avoid this next time.",
      action: 'showErrorRecovery',
      priority: 'critical',
      maxShowCount: 999, // Always show for errors
      timesShown: 0
    });

    // Rule 4: No knowledge selected
    this.rules.push({
      id: 'no-knowledge-selected',
      trigger: (ctx) =>
        ctx.currentActivity === 'building_prompt' &&
        ctx.knowledgeItemsSelected === 0 &&
        ctx.promptLength > 20,
      message: "Without context, the AI won't know your project's standards. Consider adding some rules.",
      priority: 'helpful',
      maxShowCount: 2,
      timesShown: 0
    });

    // Rule 5: Empty knowledge base (first session)
    this.rules.push({
      id: 'empty-knowledge-base',
      trigger: (ctx) =>
        ctx.sessionsCompleted === 0 &&
        ctx.knowledgeItemsSelected === 0 &&
        ctx.currentActivity === 'idle',
      message: "Your knowledge base is empty! Start by recording a few architectural decisions.",
      priority: 'helpful',
      maxShowCount: 1,
      timesShown: 0
    });

    // Rule 6: Many failed sessions (needs help)
    this.rules.push({
      id: 'many-failures',
      trigger: (ctx) =>
        ctx.sessionsFailed > 3 &&
        ctx.sessionsFailed > ctx.sessionsCompleted,
      message: "Having trouble? Try being more specific in your prompts and adding relevant project rules.",
      priority: 'helpful',
      maxShowCount: 2,
      timesShown: 0
    });

    // Rule 7: Success! (celebration)
    this.rules.push({
      id: 'first-success',
      trigger: (ctx) => ctx.sessionsCompleted === 1,
      message: "🎉 Great job! Your first successful session. Keep building your knowledge base!",
      priority: 'informational',
      maxShowCount: 1,
      timesShown: 0
    });

    // Rule 8: Idle too long while building prompt
    this.rules.push({
      id: 'idle-during-prompt',
      trigger: (ctx) =>
        ctx.currentActivity === 'building_prompt' &&
        ctx.idleTime > 45000 && // 45 seconds
        ctx.promptLength === 0,
      message: "Need help getting started? Try describing what you want to build in plain English.",
      priority: 'helpful',
      maxShowCount: 2,
      timesShown: 0
    });
  }
}
