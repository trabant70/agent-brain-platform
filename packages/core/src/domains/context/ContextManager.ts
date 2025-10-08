/**
 * ContextManager - Manages context rules and decisions
 *
 * Minimal implementation focused on:
 * - Adding/retrieving rules
 * - Recording decisions
 * - Finding relevant context for prompt enhancement
 */

import { ContextRule, ContextDecision, Context } from './types';
import { EventEmitter } from 'events';

export class ContextManager extends EventEmitter {
  private contexts: Map<string, Context> = new Map();

  /**
   * Get or create context for a project
   */
  getContext(projectPath: string): Context {
    if (!this.contexts.has(projectPath)) {
      this.contexts.set(projectPath, {
        id: this.generateId(),
        projectPath,
        rules: [],
        decisions: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    return this.contexts.get(projectPath)!;
  }

  /**
   * Add a rule to project context
   */
  addRule(projectPath: string, rule: string, source: ContextRule['source'] = 'user'): ContextRule {
    const context = this.getContext(projectPath);

    const contextRule: ContextRule = {
      id: this.generateId(),
      rule,
      source,
      confidence: source === 'user' ? 1.0 : 0.5,
      appliedCount: 0,
      createdAt: new Date()
    };

    context.rules.push(contextRule);
    context.updatedAt = new Date();

    this.emit('rule:added', contextRule);
    this.emit('context:updated', context);

    return contextRule;
  }

  /**
   * Add a decision to project context
   */
  addDecision(
    projectPath: string,
    decision: string,
    rationale: string,
    sessionId?: string,
    relatedRules?: string[]
  ): ContextDecision {
    const context = this.getContext(projectPath);

    const contextDecision: ContextDecision = {
      id: this.generateId(),
      decision,
      rationale,
      timestamp: new Date(),
      sessionId,
      relatedRules
    };

    context.decisions.push(contextDecision);
    context.updatedAt = new Date();

    this.emit('decision:added', contextDecision);
    this.emit('context:updated', context);

    return contextDecision;
  }

  /**
   * Get rules relevant to given keywords
   * Used by PromptEnhancer to find applicable rules
   */
  getRulesForContext(projectPath: string, keywords: string[]): ContextRule[] {
    const context = this.getContext(projectPath);

    if (keywords.length === 0) {
      // No keywords - return all rules sorted by confidence
      return context.rules
        .slice()
        .sort((a, b) => b.confidence - a.confidence);
    }

    // Filter rules that match any keyword
    const relevantRules = context.rules.filter(rule =>
      keywords.some(keyword =>
        rule.rule.toLowerCase().includes(keyword.toLowerCase())
      )
    );

    // Sort by confidence (high to low)
    return relevantRules.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get recent decisions (for context reinforcement)
   */
  getRecentDecisions(projectPath: string, limit: number = 10): ContextDecision[] {
    const context = this.getContext(projectPath);

    return context.decisions
      .slice()
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Mark a rule as applied (increments usage count)
   */
  markRuleApplied(projectPath: string, ruleId: string): void {
    const context = this.getContext(projectPath);
    const rule = context.rules.find(r => r.id === ruleId);

    if (rule) {
      rule.appliedCount++;
      rule.lastApplied = new Date();

      // Increase confidence slightly when applied successfully
      rule.confidence = Math.min(1.0, rule.confidence + 0.05);

      context.updatedAt = new Date();
      this.emit('rule:applied', rule);
      this.emit('context:updated', context);
    }
  }

  /**
   * Get all rules for a project
   */
  getAllRules(projectPath: string): ContextRule[] {
    return this.getContext(projectPath).rules;
  }

  /**
   * Get all decisions for a project
   */
  getAllDecisions(projectPath: string): ContextDecision[] {
    return this.getContext(projectPath).decisions;
  }

  /**
   * Load contexts from storage
   */
  loadContexts(contexts: Record<string, Context>): void {
    Object.entries(contexts).forEach(([projectPath, context]) => {
      // Convert date strings back to Date objects
      context.createdAt = new Date(context.createdAt);
      context.updatedAt = new Date(context.updatedAt);
      context.rules.forEach(rule => {
        rule.createdAt = new Date(rule.createdAt);
        if (rule.lastApplied) {
          rule.lastApplied = new Date(rule.lastApplied);
        }
      });
      context.decisions.forEach(decision => {
        decision.timestamp = new Date(decision.timestamp);
      });

      this.contexts.set(projectPath, context);
    });

    this.emit('contexts:loaded', this.contexts.size);
  }

  /**
   * Get all contexts for serialization
   */
  getAllContexts(): Record<string, Context> {
    const result: Record<string, Context> = {};
    this.contexts.forEach((context, projectPath) => {
      result[projectPath] = context;
    });
    return result;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
