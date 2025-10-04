/**
 * Agent Brain Learning Analyzer
 * Analyzes test failures and code patterns to extract learning insights
 *
 * This module uses LearningPattern which is different from the runtime Pattern type:
 * - LearningPattern: Rich type for learning from failures (this module)
 * - Pattern: Simple type for runtime analysis (api/types.ts)
 *
 * Extracted from Shantic Learning System
 */

import type { LearningStorage } from './storage';

export interface TestFailure {
  test: string;
  error: string;
  file: string;
  duration?: number;
  context: {
    code?: string;
    stack?: string;
    timestamp: Date;
  };
}

export interface LearningPattern {
  id?: string;
  name: string;
  category: string;
  description: string;
  rootCause: any;
  preventionRule: any;
  fixApproach?: string;
  service?: string;
  confidenceScore?: number;
  autoFixable?: boolean;
  occurrences?: number;
}

export interface LearningMetrics {
  totalPatterns: number;
  totalOccurrences: number;
  avgConfidenceScore: number;
  topCategories: Array<{ category: string; count: number }>;
  recentPatterns: LearningPattern[];
}


export class LearningAnalyzer {
  constructor(private storage: LearningStorage) {}

  /**
   * Analyze a test failure and extract patterns
   */
  async analyzeFailure(failure: TestFailure): Promise<LearningPattern[]> {
    const patterns: LearningPattern[] = [];

    // Check for similar patterns first
    const similarPatterns = await this.storage?.findSimilarPatterns(failure);
    if (similarPatterns.length > 0) {
      return similarPatterns;
    }

    // Analyze error patterns
    const errorPattern = this.analyzeErrorPattern(failure);
    if (errorPattern) {
      patterns.push(errorPattern);
    }

    // Analyze code patterns
    const codePattern = this.analyzeCodePattern(failure);
    if (codePattern) {
      patterns.push(codePattern);
    }

    // Store discovered patterns
    for (const pattern of patterns) {
      await this.storage?.storePattern(pattern, failure);
    }

    return patterns;
  }

  /**
   * Extract patterns from error messages
   */
  private analyzeErrorPattern(failure: TestFailure): LearningPattern | null {
    const { error, test, file } = failure;

    // Common error patterns
    const patterns = [
      {
        regex: /TypeError.*Cannot read propert/i,
        category: 'null-pointer',
        name: 'Null Pointer Access',
        description: 'Accessing property on null or undefined object',
        rootCause: { type: 'null-access', severity: 'high' },
        preventionRule: { check: 'null-safety', autofix: true },
        autoFixable: true
      },
      {
        regex: /ReferenceError.*is not defined/i,
        category: 'undefined-reference',
        name: 'Undefined Reference',
        description: 'Variable or function not defined in scope',
        rootCause: { type: 'scope-error', severity: 'medium' },
        preventionRule: { check: 'import-validation', autofix: false },
        autoFixable: false
      },
      {
        regex: /Expected.*but received/i,
        category: 'assertion-mismatch',
        name: 'Test Assertion Mismatch',
        description: 'Expected value does not match actual value',
        rootCause: { type: 'logic-error', severity: 'low' },
        preventionRule: { check: 'test-validation', autofix: false },
        autoFixable: false
      },
      {
        regex: /timeout.*exceeded/i,
        category: 'timeout',
        name: 'Operation Timeout',
        description: 'Operation took longer than expected',
        rootCause: { type: 'performance', severity: 'medium' },
        preventionRule: { check: 'async-patterns', autofix: false },
        autoFixable: false
      }
    ];

    for (const pattern of patterns) {
      if (pattern.regex?.test(error)) {
        return {
          name: pattern.name,
          category: pattern.category,
          description: pattern.description,
          rootCause: pattern.rootCause,
          preventionRule: pattern.preventionRule,
          autoFixable: pattern.autoFixable,
          confidenceScore: 0.8,
          service: this.extractServiceFromFile(file)
        };
      }
    }

    return null;
  }

  /**
   * Extract patterns from code context
   */
  private analyzeCodePattern(failure: TestFailure): LearningPattern | null {
    const { context, file } = failure;

    if (!context.code) return null;

    // Analyze code structure patterns
    const codePatterns = [
      {
        regex: /async\s+function.*without.*await/i,
        name: 'Missing Await',
        category: 'async-patterns',
        description: 'Async function called without await',
        autoFixable: true
      },
      {
        regex: /\.map\(.*\)\s*\.map\(/i,
        name: 'Inefficient Chaining',
        category: 'performance',
        description: 'Multiple map operations that could be combined',
        autoFixable: true
      },
      {
        regex: /console\.log/i,
        name: 'Debug Statement',
        category: 'code-quality',
        description: 'Console?.log statement left in code',
        autoFixable: true
      }
    ];

    for (const pattern of codePatterns) {
      if (pattern.regex?.test(context.code)) {
        return {
          name: pattern.name,
          category: pattern.category,
          description: pattern.description,
          rootCause: { type: 'code-quality', severity: 'low' },
          preventionRule: { check: 'linting', autofix: pattern.autoFixable },
          autoFixable: pattern.autoFixable,
          confidenceScore: 0.6,
          service: this.extractServiceFromFile(file)
        };
      }
    }

    return null;
  }

  /**
   * Extract service name from file path
   */
  private extractServiceFromFile(filePath: string): string {
    const parts = filePath.split('/');
    const serviceIndex = parts.findIndex(part => part === 'src' || part === 'services');

    if (serviceIndex >= 0 && serviceIndex < parts.length - 1) {
      return parts[serviceIndex + 1];
    }

    return 'unknown';
  }

  /**
   * Calculate confidence score for a pattern
   */
  calculateConfidence(pattern: LearningPattern, occurrences: number): number {
    let score = 0.5; // Base score

    // Increase score based on occurrences
    score += Math.min(occurrences * 0.1, 0.3);

    // Increase score for specific error types
    if (pattern.category === 'null-pointer' || pattern.category === 'undefined-reference') {
      score += 0.2;
    }

    // Increase score if auto-fixable
    if (pattern.autoFixable) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Generate auto-fix suggestions for a pattern
   */
  generateAutoFix(pattern: LearningPattern, code: string): string | null {
    if (!pattern.autoFixable) return null;

    switch (pattern.category) {
      case 'null-pointer':
        return this.generateNullPointerFix(code);
      case 'code-quality':
        if (pattern.name === 'Debug Statement') {
          return code.replace(/console\.log\(.*\);?\s*/g, '');
        }
        break;
      case 'async-patterns':
        if (pattern.name === 'Missing Await') {
          return this.generateAwaitFix(code);
        }
        break;
    }

    return null;
  }

  private generateNullPointerFix(code: string): string {
    // Add optional chaining where possible
    return code.replace(
      /(\w+)\.(\w+)/g,
      '$1?.$2'
    );
  }

  private generateAwaitFix(code: string): string {
    // Add await to async function calls
    return code.replace(
      /(\w+)\s*\(/g,
      'await $1('
    );
  }
}