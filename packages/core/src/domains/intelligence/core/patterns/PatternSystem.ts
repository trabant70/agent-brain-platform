/**
 * Agent Brain Patterns
 * Main entry point for pattern system
 */

export * from './PatternEngine';
export * from './PatternValidator';
export * from './PatternStorage';

import { PatternEngine, EnginePattern, EnginePatternContext, ValidationResult, EnginePatternCategory } from './PatternEngine';
import { PatternValidator, PatternValidationResult } from './PatternValidator';
import { PatternStorage, PatternStorageMetadata } from './PatternStorage';

export interface PatternsConfig {
  enableValidation?: boolean;
  enableConflictChecking?: boolean;
  autoLoadDefaults?: boolean;
  storage?: PatternStorage;
  autoSave?: boolean;
}

export class PatternSystem {
  private engine: PatternEngine;
  private validator: PatternValidator;
  private config: PatternsConfig;
  private storage?: PatternStorage;

  constructor(config: PatternsConfig = {}) {
    this.config = {
      enableValidation: true,
      enableConflictChecking: true,
      autoLoadDefaults: true,
      autoSave: true,
      ...config
    };

    this.engine = new PatternEngine();
    this.validator = new PatternValidator();
    this.storage = config.storage;
  }

  /**
   * Initialize pattern system and load patterns from storage
   */
  async initialize(): Promise<void> {
    if (this.storage) {
      const patterns = await this.storage.load();
      for (const pattern of patterns) {
        // Register without saving (avoid loop)
        this.engine.registerPattern(pattern);
        this.validator.registerPattern(pattern);
      }
    }
  }

  /**
   * Register a pattern with validation
   */
  async registerPattern(pattern: EnginePattern): Promise<PatternValidationResult> {
    let validation: PatternValidationResult = { valid: true, errors: [], warnings: [], suggestions: [] };

    if (this.config.enableValidation) {
      validation = this.validator.validatePattern(pattern);

      if (!validation.valid) {
        return validation;
      }

      if (validation.warnings.length > 0) {
      }
    }

    if (this.config.enableConflictChecking) {
      const conflicts = this.validator.checkConflicts(pattern);
      if (conflicts.length > 0) {
      }
    }

    // Register with both engine and validator
    this.engine.registerPattern(pattern);
    this.validator.registerPattern(pattern);

    // Auto-save if enabled
    if (this.config.autoSave && this.storage) {
      await this.savePatterns();
    }

    return validation;
  }

  /**
   * Unregister a pattern
   */
  unregisterPattern(patternId: string): boolean {
    const success = this.engine.unregisterPattern(patternId);
    if (success) {
      this.validator.unregisterPattern(patternId);

      // Auto-save if enabled
      if (this.config.autoSave && this.storage) {
        this.savePatterns().catch(err => {
          // Error during auto-save
        });
      }

    }
    return success;
  }

  /**
   * Validate code against patterns
   */
  validateCode(code: string, context: EnginePatternContext): ValidationResult {
    return this.engine.validateCode(code, context);
  }

  /**
   * Validate code by category
   */
  validateByCategory(code: string, category: EnginePatternCategory, context: EnginePatternContext): ValidationResult {
    return this.engine.validateByCategory(code, category, context);
  }

  /**
   * Get all patterns
   */
  getPatterns(): EnginePattern[] {
    return this.engine.getPatterns();
  }

  /**
   * Get patterns by category
   */
  getPatternsByCategory(category: EnginePatternCategory): EnginePattern[] {
    return this.engine.getPatternsByCategory(category);
  }

  /**
   * Apply auto-fixes
   */
  applyAutoFixes(code: string, validationResult: ValidationResult): string {
    return this.engine.applyAutoFixes(code, validationResult.matches);
  }

  /**
   * Get system statistics
   */
  getStatistics() {
    const patterns = this.getPatterns();
    const validationStats = this.validator.getValidationStats();

    const categoryCount = patterns.reduce((acc, pattern) => {
      acc[pattern.category] = (acc[pattern.category] || 0) + 1;
      return acc;
    }, {} as Record<EnginePatternCategory, number>);

    const severityCount = patterns.reduce((acc, pattern) => {
      acc[pattern.severity] = (acc[pattern.severity] || 0) + 1;
      return acc;
    }, {} as any);

    const autoFixableCount = patterns.filter(p => p.autoFix?.enabled).length;

    return {
      totalPatterns: patterns.length,
      byCategory: categoryCount,
      bySeverity: severityCount,
      autoFixablePatterns: autoFixableCount,
      autoFixablePercentage: patterns.length > 0 ? (autoFixableCount / patterns.length) * 100 : 0,
      validation: validationStats
    };
  }

  /**
   * Load patterns from extension
   */
  async loadExtensionPatterns(extensionPatterns: EnginePattern[]): Promise<PatternValidationResult[]> {
    const results: PatternValidationResult[] = [];

    for (const pattern of extensionPatterns) {
      const result = await this.registerPattern(pattern);
      results.push(result);
    }

    const successCount = results.filter(r => r.valid).length;

    return results;
  }

  /**
   * Export patterns to JSON
   */
  exportPatterns(): any {
    const patterns = this.getPatterns();
    const stats = this.getStatistics();

    return {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      statistics: stats,
      patterns: patterns.map(pattern => ({
        ...pattern,
        // Convert RegExp to string for JSON serialization
        trigger: pattern.trigger instanceof RegExp ? pattern.trigger.toString() : pattern.trigger
      }))
    };
  }

  /**
   * Import patterns from JSON
   */
  async importPatterns(data: any): Promise<PatternValidationResult[]> {
    if (!data?.patterns || !Array.isArray(data.patterns)) {
      throw new Error('Invalid patterns data format');
    }

    const patterns = data.patterns.map((p: any) => ({
      ...p,
      // Convert string back to RegExp if needed
      trigger: typeof p.trigger === 'string' && p.trigger.startsWith('/') && p.trigger.endsWith('/')
        ? new RegExp(p.trigger.slice(1, -1))
        : p.trigger
    })) as EnginePattern[];

    return this.loadExtensionPatterns(patterns);
  }

  /**
   * Save patterns to storage
   */
  async savePatterns(): Promise<void> {
    if (this.storage) {
      const patterns = this.getPatterns();
      await this.storage.save(patterns);
    }
  }

  /**
   * Get storage metadata
   */
  async getStorageMetadata(): Promise<PatternStorageMetadata | null> {
    if (this.storage) {
      return await this.storage.getMetadata();
    }
    return null;
  }
}

/**
 * Create a pattern system with default configuration
 */
export function createPatternSystem(config?: PatternsConfig): PatternSystem {
  return new PatternSystem(config);
}

/**
 * Helper function to create a basic pattern
 */
export function createPattern(
  id: string,
  name: string,
  category: EnginePatternCategory,
  trigger: RegExp | string,
  message: string,
  options: Partial<EnginePattern> = {}
): EnginePattern {
  return {
    id,
    name,
    category,
    severity: 'warning',
    trigger,
    message,
    description: message,
    ...options
  };
}