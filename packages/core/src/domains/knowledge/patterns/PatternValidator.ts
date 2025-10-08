/**
 * Agent Brain Pattern Validator
 * Validates patterns from extensions and ensures quality
 * Based on Architect's guidance
 */

import { EnginePattern, EnginePatternCategory, EnginePatternSeverity } from './PatternEngine';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface PatternValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  suggestions: string[];
}

export interface ConflictInfo {
  conflictingPattern: EnginePattern;
  conflictType: 'duplicate' | 'overlapping' | 'contradictory';
  description: string;
}

export class PatternValidator {
  private registeredPatterns: Map<string, EnginePattern> = new Map();

  /**
   * Validate a pattern before registration
   */
  validatePattern(pattern: EnginePattern): PatternValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const suggestions: string[] = [];

    // Required fields validation
    this?.validateRequiredFields(pattern, errors);

    // Pattern trigger validation
    this?.validateTrigger(pattern, errors, warnings);

    // Category and severity validation
    this?.validateCategoryAndSeverity(pattern, errors);

    // Auto-fix validation
    this?.validateAutoFix(pattern, errors, warnings);

    // Metadata validation
    this?.validateMetadata(pattern, warnings, suggestions);

    // Quality checks
    this?.performQualityChecks(pattern, warnings, suggestions);

    return {
      valid: errors?.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Check for conflicts with existing patterns
   */
  checkConflicts(pattern: EnginePattern): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];

    for (const [id, existingPattern] of this?.registeredPatterns) {
      if (id === pattern?.id) continue;

      // Check for duplicate IDs
      if (existingPattern?.id === pattern?.id) {
        conflicts?.push({
          conflictingPattern: existingPattern,
          conflictType: 'duplicate',
          description: `Pattern ID '${pattern?.id}' already exists`
        });
      }

      // Check for overlapping triggers
      if (this?.triggersOverlap(pattern?.trigger, existingPattern?.trigger)) {
        conflicts?.push({
          conflictingPattern: existingPattern,
          conflictType: 'overlapping',
          description: `Pattern trigger overlaps with '${existingPattern?.name}'`
        });
      }

      // Check for contradictory patterns
      if (this?.patternsContradict(pattern, existingPattern)) {
        conflicts?.push({
          conflictingPattern: existingPattern,
          conflictType: 'contradictory',
          description: `Pattern contradicts '${existingPattern?.name}'`
        });
      }
    }

    return conflicts;
  }

  /**
   * Register a pattern for conflict checking
   */
  registerPattern(pattern: EnginePattern): void {
    this?.registeredPatterns?.set(pattern?.id, pattern);
  }

  /**
   * Unregister a pattern
   */
  unregisterPattern(patternId: string): void {
    this?.registeredPatterns?.delete(patternId);
  }

  /**
   * Validate pattern updates
   */
  validateUpdate(patternId: string, updates: Partial<EnginePattern>): PatternValidationResult {
    const existingPattern = this?.registeredPatterns?.get(patternId);
    if (!existingPattern) {
      return {
        valid: false,
        errors: [{ field: 'id', message: 'Pattern not found', severity: 'error' }],
        warnings: [],
        suggestions: []
      };
    }

    // Create updated pattern for validation
    const updatedPattern = { ...existingPattern, ...updates };
    return this?.validatePattern(updatedPattern);
  }

  private validateRequiredFields(pattern: EnginePattern, errors: ValidationError[]): void {
    const requiredFields: (keyof EnginePattern)[] = ['id', 'name', 'description', 'category', 'severity', 'trigger', 'message'];

    for (const field of requiredFields) {
      if (!pattern[field]) {
        errors?.push({
          field,
          message: `Required field '${field}' is missing`,
          severity: 'error'
        });
      }
    }

    // Validate field types
    if (pattern?.id && typeof pattern?.id !== 'string') {
      errors?.push({
        field: 'id',
        message: 'ID must be a string',
        severity: 'error'
      });
    }

    if (pattern?.name && typeof pattern?.name !== 'string') {
      errors?.push({
        field: 'name',
        message: 'Name must be a string',
        severity: 'error'
      });
    }
  }

  private validateTrigger(pattern: EnginePattern, errors: ValidationError[], warnings: ValidationError[]): void {
    if (!pattern?.trigger) return;

    try {
      // Test if string trigger can be converted to RegExp
      if (typeof pattern?.trigger === 'string') {
        new RegExp(pattern?.trigger);
      } else if (pattern?.trigger instanceof RegExp) {
        // Test the regex
        pattern?.trigger?.test('test string');
      } else {
        errors?.push({
          field: 'trigger',
          message: 'Trigger must be a string or RegExp',
          severity: 'error'
        });
      }
    } catch (error) {
      errors?.push({
        field: 'trigger',
        message: `Invalid regex pattern: ${error}`,
        severity: 'error'
      });
    }

    // Check for overly broad patterns
    if (typeof pattern?.trigger === 'string' || pattern?.trigger instanceof RegExp) {
      const triggerStr = pattern?.trigger?.toString();
      if (triggerStr?.length < 3) {
        warnings?.push({
          field: 'trigger',
          message: 'Very short trigger pattern may match too broadly',
          severity: 'warning'
        });
      }

      // Check for dangerous patterns
      if (triggerStr?.includes('.*.*') || triggerStr?.includes('.+.+')) {
        warnings?.push({
          field: 'trigger',
          message: 'Complex patterns may impact performance',
          severity: 'warning'
        });
      }
    }
  }

  private validateCategoryAndSeverity(pattern: EnginePattern, errors: ValidationError[]): void {
    const validCategories: EnginePatternCategory[] = [
      'error-handling', 'type-safety', 'performance', 'security',
      'maintainability', 'testability', 'async-patterns', 'code-quality',
      'architecture', 'accessibility', 'best-practices'
    ];

    const validSeverities: EnginePatternSeverity[] = ['error', 'warning', 'info', 'suggestion'];

    if (pattern?.category && !validCategories?.includes(pattern?.category)) {
      errors?.push({
        field: 'category',
        message: `Invalid category. Must be one of: ${validCategories?.join(', ')}`,
        severity: 'error'
      });
    }

    if (pattern?.severity && !validSeverities?.includes(pattern?.severity)) {
      errors?.push({
        field: 'severity',
        message: `Invalid severity. Must be one of: ${validSeverities?.join(', ')}`,
        severity: 'error'
      });
    }
  }

  private validateAutoFix(pattern: EnginePattern, errors: ValidationError[], warnings: ValidationError[]): void {
    if (!pattern?.autoFix) return;

    const autoFix = pattern?.autoFix;

    if (typeof autoFix?.enabled !== 'boolean') {
      errors?.push({
        field: 'autoFix?.enabled',
        message: 'autoFix?.enabled must be a boolean',
        severity: 'error'
      });
    }

    if (autoFix?.enabled) {
      if (!autoFix?.replacement && !autoFix?.transform) {
        errors?.push({
          field: 'autoFix',
          message: 'Auto-fixable patterns must have either replacement or transform',
          severity: 'error'
        });
      }

      if (autoFix?.replacement && autoFix?.transform) {
        warnings?.push({
          field: 'autoFix',
          message: 'Pattern has both replacement and transform - only one will be used',
          severity: 'warning'
        });
      }

      if (autoFix?.transform && typeof autoFix?.transform !== 'function') {
        errors?.push({
          field: 'autoFix?.transform',
          message: 'transform must be a function',
          severity: 'error'
        });
      }
    }
  }

  private validateMetadata(pattern: EnginePattern, warnings: ValidationError[], suggestions: string[]): void {
    if (!pattern?.metadata) {
      suggestions?.push('Consider adding metadata for better pattern organization');
      return;
    }

    const metadata = pattern?.metadata;

    if (metadata?.confidence !== undefined) {
      if (typeof metadata?.confidence !== 'number' ||
          metadata?.confidence < 0 ||
          metadata?.confidence > 1) {
        warnings?.push({
          field: 'metadata?.confidence',
          message: 'Confidence should be a number between 0 and 1',
          severity: 'warning'
        });
      }
    }

    if (metadata?.tags && !Array?.isArray(metadata?.tags)) {
      warnings?.push({
        field: 'metadata?.tags',
        message: 'Tags should be an array of strings',
        severity: 'warning'
      });
    }
  }

  private performQualityChecks(pattern: EnginePattern, warnings: ValidationError[], suggestions: string[]): void {
    // Check message quality
    if (pattern?.message && pattern?.message?.length < 10) {
      warnings?.push({
        field: 'message',
        message: 'Very short message may not be helpful to users',
        severity: 'warning'
      });
    }

    if (pattern?.message && !pattern?.message?.match(/[.!?]$/)) {
      suggestions?.push('Consider ending message with proper punctuation');
    }

    // Check for examples
    if (!pattern?.examples) {
      suggestions?.push('Adding examples improves pattern understanding');
    } else {
      if (!pattern?.examples?.bad || pattern?.examples?.bad?.length === 0) {
        suggestions?.push('Add bad examples to show what to avoid');
      }
      if (!pattern?.examples?.good || pattern?.examples?.good?.length === 0) {
        suggestions?.push('Add good examples to show recommended approach');
      }
    }

    // Check description quality
    if (pattern?.description && pattern?.description === pattern?.message) {
      suggestions?.push('Description and message are identical - consider making description more detailed');
    }
  }

  private triggersOverlap(trigger1: RegExp | string, trigger2: RegExp | string): boolean {
    // Simple overlap detection - could be more sophisticated
    const str1 = trigger1?.toString();
    const str2 = trigger2?.toString();

    // Check if one pattern is a subset of another
    return str1?.includes(str2?.replace(/^\/|\/[gimuy]*$/g, '')) ||
           str2?.includes(str1?.replace(/^\/|\/[gimuy]*$/g, ''));
  }

  private patternsContradict(pattern1: EnginePattern, pattern2: EnginePattern): boolean {
    // Check if patterns are in the same category but suggest opposite things
    if (pattern1?.category !== pattern2?.category) return false;

    // Simple contradiction detection - could be enhanced
    const message1 = pattern1?.message?.toLowerCase();
    const message2 = pattern2?.message?.toLowerCase();

    const contradictoryPairs = [
      ['avoid', 'use'],
      ['never', 'always'],
      ['remove', 'add'],
      ['delete', 'keep']
    ];

    for (const [word1, word2] of contradictoryPairs) {
      if ((message1?.includes(word1) && message2?.includes(word2)) ||
          (message1?.includes(word2) && message2?.includes(word1))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get pattern validation statistics
   */
  getValidationStats(): {
    totalPatterns: number;
    validPatterns: number;
    invalidPatterns: number;
    conflictCount: number;
  } {
    let validCount = 0;
    let conflictCount = 0;

    for (const pattern of this?.registeredPatterns?.values()) {
      const validation = this?.validatePattern(pattern);
      if (validation?.valid) validCount++;

      const conflicts = this?.checkConflicts(pattern);
      conflictCount += conflicts?.length;
    }

    return {
      totalPatterns: this?.registeredPatterns?.size,
      validPatterns: validCount,
      invalidPatterns: this?.registeredPatterns?.size - validCount,
      conflictCount
    };
  }
}