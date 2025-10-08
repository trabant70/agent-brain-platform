/**
 * SuccessPattern - Data model for patterns learned from successful sessions
 *
 * Captures what made a session successful so it can be applied to future prompts
 */

export interface AppliesWhen {
  projectType?: string[];      // e.g., ['web-app', 'api-service']
  taskType?: string[];          // e.g., ['bug', 'feature', 'refactor']
  contextHints?: string[];      // e.g., ['authentication', 'database']
}

export interface SuccessFactors {
  knowledgeItemsUsed: string[];  // IDs of ADRs, patterns, learnings that were used
  enhancementLevel: number;      // Which stage was used (1-8)
  userBehaviors?: string[];      // e.g., ['added-tests', 'wrote-docs']
}

export interface SessionSummary {
  sessionId: string;
  timestamp: Date;
  prompt: string;
  outcome: {
    success: boolean;
    compilationPassed: boolean;
    testsPassed: boolean;
    errorsCount: number;
  };
  knowledgeUsed: string[];
}

export interface Evidence {
  successCount: number;
  failureCount: number;
  confidence: number;  // 0-1 (calculated as successCount / (successCount + failureCount))
  lastSuccessAt: Date;
  examples: SessionSummary[];  // Store up to 5 most recent examples
}

export interface Enhancement {
  additionalContext: string[];      // Extra context to add to prompts
  suggestedKnowledge: string[];     // Knowledge item IDs to recommend
  templateAdjustments?: {
    sections?: string[];             // Additional template sections
    placeholders?: Record<string, string>;
  };
}

export interface SuccessPattern {
  id: string;
  name: string;
  description: string;

  // When to apply this pattern
  appliesWhen: AppliesWhen;

  // What made this successful
  successFactors: SuccessFactors;

  // Evidence supporting this pattern
  evidence: Evidence;

  // How to enhance prompts with this pattern
  enhancement: Enhancement;

  // Metadata
  createdAt: Date;
  lastAppliedAt?: Date;
  timesApplied: number;
}

/**
 * Factory functions for creating success patterns
 */
export class SuccessPatternFactory {

  /**
   * Create a new success pattern from a successful session
   */
  static createFromSession(
    sessionSummary: SessionSummary,
    taskType: string,
    projectType?: string
  ): SuccessPattern {
    const id = `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      id,
      name: this.generatePatternName(taskType, sessionSummary.knowledgeUsed),
      description: this.generatePatternDescription(sessionSummary),

      appliesWhen: {
        projectType: projectType ? [projectType] : undefined,
        taskType: [taskType],
        contextHints: this.extractContextHints(sessionSummary.prompt)
      },

      successFactors: {
        knowledgeItemsUsed: sessionSummary.knowledgeUsed,
        enhancementLevel: 4,  // Stage 4 is the learning stage
        userBehaviors: this.detectUserBehaviors(sessionSummary)
      },

      evidence: {
        successCount: 1,
        failureCount: 0,
        confidence: 1.0,
        lastSuccessAt: sessionSummary.timestamp,
        examples: [sessionSummary]
      },

      enhancement: {
        additionalContext: this.generateAdditionalContext(sessionSummary),
        suggestedKnowledge: sessionSummary.knowledgeUsed,
        templateAdjustments: undefined
      },

      createdAt: new Date(),
      lastAppliedAt: undefined,
      timesApplied: 0
    };
  }

  /**
   * Merge two similar patterns into one stronger pattern
   */
  static mergePatterns(pattern1: SuccessPattern, pattern2: SuccessPattern): SuccessPattern {
    return {
      ...pattern1,
      evidence: {
        successCount: pattern1.evidence.successCount + pattern2.evidence.successCount,
        failureCount: pattern1.evidence.failureCount + pattern2.evidence.failureCount,
        confidence: this.calculateConfidence(
          pattern1.evidence.successCount + pattern2.evidence.successCount,
          pattern1.evidence.failureCount + pattern2.evidence.failureCount
        ),
        lastSuccessAt: new Date(Math.max(
          pattern1.evidence.lastSuccessAt.getTime(),
          pattern2.evidence.lastSuccessAt.getTime()
        )),
        examples: [
          ...pattern1.evidence.examples,
          ...pattern2.evidence.examples
        ].slice(-5)  // Keep only 5 most recent
      },

      successFactors: {
        ...pattern1.successFactors,
        knowledgeItemsUsed: Array.from(new Set([
          ...pattern1.successFactors.knowledgeItemsUsed,
          ...pattern2.successFactors.knowledgeItemsUsed
        ]))
      }
    };
  }

  /**
   * Update pattern with new session outcome
   */
  static updateWithOutcome(
    pattern: SuccessPattern,
    sessionSummary: SessionSummary,
    success: boolean
  ): SuccessPattern {
    const successCount = pattern.evidence.successCount + (success ? 1 : 0);
    const failureCount = pattern.evidence.failureCount + (success ? 0 : 1);

    return {
      ...pattern,
      evidence: {
        successCount,
        failureCount,
        confidence: this.calculateConfidence(successCount, failureCount),
        lastSuccessAt: success ? sessionSummary.timestamp : pattern.evidence.lastSuccessAt,
        examples: success
          ? [...pattern.evidence.examples, sessionSummary].slice(-5)
          : pattern.evidence.examples
      },
      timesApplied: pattern.timesApplied + 1,
      lastAppliedAt: new Date()
    };
  }

  // Helper methods

  private static generatePatternName(taskType: string, knowledgeUsed: string[]): string {
    const knowledgeCount = knowledgeUsed.length;
    return `Successful ${taskType} with ${knowledgeCount} knowledge items`;
  }

  private static generatePatternDescription(sessionSummary: SessionSummary): string {
    const { outcome, knowledgeUsed } = sessionSummary;
    const parts = ['Session succeeded'];

    if (outcome.compilationPassed) parts.push('with clean compilation');
    if (outcome.testsPassed) parts.push('and passing tests');
    if (knowledgeUsed.length > 0) parts.push(`using ${knowledgeUsed.length} knowledge items`);

    return parts.join(' ');
  }

  private static extractContextHints(prompt: string): string[] {
    const hints: string[] = [];
    const commonHints = [
      'authentication', 'authorization', 'database', 'api', 'ui', 'frontend',
      'backend', 'testing', 'performance', 'security', 'deployment', 'logging'
    ];

    const lowerPrompt = prompt.toLowerCase();
    for (const hint of commonHints) {
      if (lowerPrompt.includes(hint)) {
        hints.push(hint);
      }
    }

    return hints;
  }

  private static detectUserBehaviors(sessionSummary: SessionSummary): string[] {
    const behaviors: string[] = [];
    const prompt = sessionSummary.prompt.toLowerCase();

    if (prompt.includes('test') || sessionSummary.outcome.testsPassed) {
      behaviors.push('added-tests');
    }

    if (prompt.includes('document') || prompt.includes('readme') || prompt.includes('comment')) {
      behaviors.push('wrote-docs');
    }

    if (prompt.includes('error') || prompt.includes('handle') || prompt.includes('catch')) {
      behaviors.push('added-error-handling');
    }

    return behaviors;
  }

  private static generateAdditionalContext(sessionSummary: SessionSummary): string[] {
    const context: string[] = [];

    if (sessionSummary.outcome.testsPassed) {
      context.push('Include test coverage in implementation');
    }

    if (sessionSummary.outcome.compilationPassed && sessionSummary.outcome.testsPassed) {
      context.push('Ensure both compilation and tests pass before completing');
    }

    return context;
  }

  private static calculateConfidence(successCount: number, failureCount: number): number {
    const total = successCount + failureCount;
    if (total === 0) return 0;

    // Confidence is success rate, but with a minimum threshold
    // Need at least 3 examples to have high confidence
    const successRate = successCount / total;
    const experienceFactor = Math.min(total / 3, 1.0);

    return successRate * experienceFactor;
  }
}
