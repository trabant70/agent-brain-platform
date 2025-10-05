/**
 * Type Bridges
 *
 * Converts between the three type systems:
 * 1. RuntimePattern (Extension API - public)
 * 2. EnginePattern (Pattern Engine - internal)
 * 3. LearningPattern (Learning Storage - internal)
 */

import { RuntimePattern } from '../adapters/base/RuntimeTypes';
import { EnginePattern, EnginePatternCategory, EnginePatternSeverity } from '../core/patterns/types';
import { LearningPattern } from '../core/learning/types';

export class TypeBridges {
  /**
   * Convert RuntimePattern (from extensions) to EnginePattern (for pattern matching)
   */
  static runtimeToEngine(runtime: RuntimePattern): EnginePattern {
    return {
      id: runtime.id,
      name: runtime.name,
      description: runtime.description,
      category: this.mapCategory(runtime.category),
      severity: this.mapSeverity(runtime.severity),
      trigger: runtime.trigger,
      message: runtime.message,
      metadata: {
        source: runtime.source || 'extension',
        tags: [runtime.category]
      }
    };
  }

  /**
   * Convert EnginePattern to RuntimePattern (for extension API responses)
   */
  static engineToRuntime(engine: EnginePattern): RuntimePattern {
    return {
      id: engine.id,
      name: engine.name,
      category: engine.category,
      description: engine.description,
      trigger: engine.trigger,
      message: engine.message,
      severity: this.mapEngineToRuntimeSeverity(engine.severity),
      source: engine.metadata?.source
    };
  }

  /**
   * Convert LearningPattern to EnginePattern (to use learned patterns in validation)
   */
  static learningToEngine(learning: LearningPattern): EnginePattern {
    return {
      id: learning.id || `learning-${Date.now()}`,
      name: learning.name,
      description: learning.description,
      category: this.mapCategory(learning.category),
      severity: 'warning', // Learned patterns default to warnings
      trigger: this.createTriggerFromLearning(learning),
      message: `Learned pattern: ${learning.description}`,
      metadata: {
        source: 'learning',
        confidence: learning.confidenceScore,
        tags: [learning.category, 'learned']
      }
    };
  }

  /**
   * Convert EnginePattern to LearningPattern (to store discovered patterns)
   */
  static engineToLearning(engine: EnginePattern): LearningPattern {
    return {
      id: engine.id,
      name: engine.name,
      category: engine.category,
      description: engine.description,
      rootCause: {
        trigger: engine.trigger instanceof RegExp ? engine.trigger.source : engine.trigger,
        severity: engine.severity
      },
      preventionRule: {
        message: engine.message,
        autoFix: engine.autoFix?.enabled
      },
      confidenceScore: engine.metadata?.confidence || 0.5,
      autoFixable: engine.autoFix?.enabled
    };
  }

  /**
   * Map string category to EnginePatternCategory
   */
  private static mapCategory(category: string): EnginePatternCategory {
    const validCategories: EnginePatternCategory[] = [
      'error-handling',
      'type-safety',
      'performance',
      'security',
      'maintainability',
      'testability',
      'async-patterns',
      'code-quality',
      'architecture',
      'accessibility',
      'best-practices'
    ];

    // Try exact match
    if (validCategories.includes(category as EnginePatternCategory)) {
      return category as EnginePatternCategory;
    }

    // Try fuzzy match
    const lower = category.toLowerCase().replace(/[_\s]/g, '-');
    const match = validCategories.find(c => c === lower);
    if (match) return match;

    // Default
    return 'code-quality';
  }

  /**
   * Map runtime severity to engine severity
   */
  private static mapSeverity(severity: 'error' | 'warning' | 'info'): EnginePatternSeverity {
    const map: Record<string, EnginePatternSeverity> = {
      'error': 'error',
      'warning': 'warning',
      'info': 'info'
    };
    return map[severity] || 'info';
  }

  /**
   * Map engine severity to runtime severity
   */
  private static mapEngineToRuntimeSeverity(severity: EnginePatternSeverity): 'error' | 'warning' | 'info' {
    if (severity === 'error') return 'error';
    if (severity === 'warning') return 'warning';
    return 'info'; // 'suggestion' and 'info' both map to 'info'
  }

  /**
   * Create a regex trigger from a learning pattern
   */
  private static createTriggerFromLearning(learning: LearningPattern): RegExp | string {
    // If learning has a trigger in rootCause, use it
    if (learning.rootCause?.trigger) {
      if (typeof learning.rootCause.trigger === 'string' && learning.rootCause.trigger.startsWith('/')) {
        try {
          // It's a regex string like "/pattern/flags"
          const match = learning.rootCause.trigger.match(/^\/(.+)\/([gimuy]*)$/);
          if (match) {
            return new RegExp(match[1], match[2]);
          }
        } catch {
          // Fall through to default
        }
      }
      return learning.rootCause.trigger;
    }

    // Otherwise create a simple pattern from name/description
    const escapedName = learning.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(escapedName, 'i');
  }
}
