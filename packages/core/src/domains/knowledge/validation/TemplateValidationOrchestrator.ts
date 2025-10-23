/**
 * Template Validation Orchestrator
 *
 * Coordinates validation pipeline using Chain of Responsibility pattern.
 * Runs structure → security → business validators in sequence.
 * Aggregates results and provides comprehensive validation report.
 */

import { MarketplaceTemplate } from '../types';
import {
  ITemplateValidator,
  TemplateValidationResult,
  ValidationConfig,
  ValidationError,
  ValidationWarning,
} from './types';
import { DEFAULT_VALIDATION_CONFIG } from './constants';

export class TemplateValidationOrchestrator {
  private validators: ITemplateValidator[] = [];
  private config: ValidationConfig;

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = { ...DEFAULT_VALIDATION_CONFIG, ...config };
  }

  /**
   * Register a validator
   */
  registerValidator(validator: ITemplateValidator): void {
    if (validator.enabled) {
      this.validators.push(validator);
    }
  }

  /**
   * Register multiple validators
   */
  registerValidators(validators: ITemplateValidator[]): void {
    validators.forEach(v => this.registerValidator(v));
  }

  /**
   * Validate a template through all registered validators
   */
  validate(template: unknown): TemplateValidationResult {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const validatorsRun: string[] = [];

    // Track threats by category
    const threatsDetected = {
      xss: 0,
      injection: 0,
      pathTraversal: 0,
      promptInjection: 0,
      unicode: 0,
      other: 0,
    };

    // Calculate original size
    const originalSize = this.calculateSize(template);

    // Sort validators by category: structure → security → business
    const sortedValidators = this.sortValidatorsByPriority(this.validators);

    let sanitizedData: MarketplaceTemplate | undefined;

    // Run each validator
    for (const validator of sortedValidators) {
      validatorsRun.push(validator.name);

      const result = validator.validate(template);

      // Accumulate errors and warnings
      errors.push(...result.errors);
      warnings.push(...result.warnings);

      // Track threats
      result.errors.forEach(error => {
        if (error.code.includes('XSS')) threatsDetected.xss++;
        else if (error.code.includes('INJECTION')) {
          if (error.code.includes('PROMPT')) threatsDetected.promptInjection++;
          else threatsDetected.injection++;
        }
        else if (error.code.includes('PATH')) threatsDetected.pathTraversal++;
        else if (error.code.includes('UNICODE')) threatsDetected.unicode++;
        else threatsDetected.other++;
      });

      // If we have sanitized data, use it for next validator
      if (result.sanitizedData) {
        sanitizedData = result.sanitizedData;
        template = sanitizedData;
      }

      // Fail fast if configured and we have critical errors
      if (this.config.failFast && !result.isValid) {
        break;
      }
    }

    const durationMs = Date.now() - startTime;
    const sanitizedSize = sanitizedData ? this.calculateSize(sanitizedData) : undefined;

    // Determine overall validity: no critical errors
    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      warnings,
      sanitizedData: isValid ? sanitizedData : undefined,
      metadata: {
        validatedAt: new Date(),
        validatorsRun,
        durationMs,
        originalSize,
        sanitizedSize,
        threatsDetected,
      },
    };
  }

  /**
   * Sort validators by priority: structure → security → business
   */
  private sortValidatorsByPriority(validators: ITemplateValidator[]): ITemplateValidator[] {
    const priority = { structure: 1, security: 2, business: 3 };
    return [...validators].sort((a, b) => priority[a.category] - priority[b.category]);
  }

  /**
   * Calculate size of object in bytes (rough estimate)
   */
  private calculateSize(obj: unknown): number {
    return JSON.stringify(obj).length;
  }

  /**
   * Get configuration
   */
  getConfig(): ValidationConfig {
    return { ...this.config };
  }

  /**
   * Get registered validators
   */
  getValidators(): ITemplateValidator[] {
    return [...this.validators];
  }

  /**
   * Clear all validators (useful for testing)
   */
  clearValidators(): void {
    this.validators = [];
  }
}
