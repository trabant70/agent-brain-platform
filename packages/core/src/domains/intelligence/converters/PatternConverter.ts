/**
 * Pattern Converter
 * Converts between LearningPattern (rich learning type) and RuntimePattern (runtime analysis type)
 */

import { LearningPattern } from '../core/learning/types';
import { RuntimePattern } from '../adapters/base/RuntimeTypes';

export class PatternConverter {
  /**
   * Convert a LearningPattern to a runtime Pattern for use in AgentBrainCore
   */
  static learningToRuntime(learningPattern: LearningPattern): RuntimePattern {
    // Extract trigger pattern from the learning pattern
    let trigger: RegExp | string;

    if (learningPattern.rootCause?.pattern) {
      trigger = learningPattern.rootCause?.pattern;
    } else {
      // Generate a basic regex trigger from the pattern description
      trigger = this.generateTriggerFromDescription(learningPattern);
    }

    return {
      id: learningPattern.id || this.generateId(),
      name: learningPattern.name,
      category: learningPattern.category,
      description: learningPattern.description,
      trigger,
      message: learningPattern.fixApproach || `Consider reviewing: ${learningPattern.description}`,
      severity: this.mapSeverity(learningPattern),
      source: learningPattern.service || 'learning-system'
    };
  }

  /**
   * Convert a runtime Pattern back to a LearningPattern (useful for learning from runtime matches)
   */
  static runtimeToLearning(pattern: RuntimePattern): LearningPattern {
    return {
      id: pattern.id,
      name: pattern.name,
      category: pattern.category,
      description: pattern.description,
      rootCause: {
        type: 'runtime-pattern',
        pattern: pattern.trigger,
        severity: pattern.severity
      },
      preventionRule: {
        check: pattern.category,
        message: pattern.message
      },
      fixApproach: pattern.message,
      service: pattern.source,
      confidenceScore: 0.8, // Default confidence for converted patterns
      autoFixable: false, // Conservative default
      occurrences: 1
    };
  }

  /**
   * Convert multiple LearningPatterns to runtime Patterns
   */
  static learningArrayToRuntime(learningPatterns: LearningPattern[]): RuntimePattern[] {
    return learningPatterns
      .filter(lp => lp.confidenceScore && lp.confidenceScore > 0.5) // Only convert confident patterns
      .map(lp => this.learningToRuntime(lp));
  }

  /**
   * Generate a regex trigger from a pattern description
   */
  private static generateTriggerFromDescription(learningPattern: LearningPattern): RegExp {
    const category = learningPattern.category.toLowerCase();

    switch (category) {
      case 'null-pointer':
      case 'null-access':
        return /(\w+)\.(\w+)(?!\?)/g; // Property access without optional chaining

      case 'undefined-reference':
        return /undefined.*(\w+)/i;

      case 'async-patterns':
        return /(async|await|Promise)/i;

      case 'code-quality':
        if (learningPattern.name.toLowerCase().includes('console')) {
          return /console\.(log|warn|error|debug)/g;
        }
        return /\b(TODO|FIXME|XXX)\b/i;

      case 'performance':
        return /(for.*in|while.*true|recursive)/i;

      case 'type-safety':
        return /(any\s*[,;}]|as\s+any)/g;

      default:
        // Create a basic regex from pattern name keywords
        const keywords = learningPattern.name
          .split(/[\s\-_]+/)
          .filter(word => word.length > 2)
          .join('|');
        return new RegExp(`\\b(${keywords})\\b`, 'i');
    }
  }

  /**
   * Map learning pattern confidence to runtime severity
   */
  private static mapSeverity(learningPattern: LearningPattern): 'error' | 'warning' | 'info' {
    const confidence = learningPattern.confidenceScore || 0.5;
    const occurrences = learningPattern.occurrences || 1;

    if (confidence > 0.8 && occurrences > 3) return 'error';
    if (confidence > 0.6 && occurrences > 1) return 'warning';
    return 'info';
  }

  /**
   * Generate a unique ID for patterns
   */
  private static generateId(): string {
    return `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate that a LearningPattern can be converted to a runtime Pattern
   */
  static canConvert(learningPattern: LearningPattern): boolean {
    return !!(
      learningPattern.name &&
      learningPattern.category &&
      learningPattern.description &&
      (learningPattern.confidenceScore || 0) > 0.3
    );
  }

  /**
   * Get conversion statistics for debugging
   */
  static getConversionStats(learningPatterns: LearningPattern[]): {
    total: number;
    convertible: number;
    converted: number;
    averageConfidence: number;
  } {
    const convertible = learningPatterns.filter(lp => this.canConvert(lp));
    const converted = convertible.filter(lp => (lp?.confidenceScore || 0) > 0.5);

    const totalConfidence = learningPatterns.reduce(
      (sum, lp) => sum + (lp?.confidenceScore || 0),
      0
    );

    return {
      total: learningPatterns.length,
      convertible: convertible.length,
      converted: converted.length,
      averageConfidence: learningPatterns.length > 0 ? totalConfidence / learningPatterns.length : 0
    };
  }
}