/**
 * Content Size Validator
 *
 * Protects against DoS attacks via excessive content size.
 * Validates:
 * - Total template size
 * - Individual item body size
 * - String field lengths
 * - Array sizes
 */

import { MarketplaceTemplate } from '../../types';
import { ITemplateValidator, TemplateValidationResult, ValidationError, ValidationConfig } from '../types';
import { DEFAULT_VALIDATION_CONFIG, ValidationErrorCode } from '../constants';

export class ContentSizeValidator implements ITemplateValidator {
  readonly name = 'ContentSizeValidator';
  readonly category = 'security' as const;
  readonly enabled = true;

  constructor(private config: ValidationConfig = DEFAULT_VALIDATION_CONFIG) {}

  validate(template: unknown): TemplateValidationResult {
    const errors: ValidationError[] = [];

    if (typeof template !== 'object' || template === null) {
      return this.emptyResult();
    }

    const tpl = template as any;
    const totalSize = JSON.stringify(template).length;

    // Check total template size
    if (totalSize > this.config.maxTemplateSize) {
      errors.push({
        code: ValidationErrorCode.CONTENT_TOO_LARGE,
        message: `Template exceeds maximum size (${totalSize} > ${this.config.maxTemplateSize} bytes)`,
        field: 'template',
        severity: 'critical',
        suggestion: `Reduce template size to under ${Math.round(this.config.maxTemplateSize / 1024 / 1024)}MB`,
        context: { totalSize, limit: this.config.maxTemplateSize },
      });
    }

    // Check string fields
    ['name', 'description'].forEach(field => {
      if (typeof tpl[field] === 'string' && tpl[field].length > this.config.maxStringLength) {
        errors.push({
          code: ValidationErrorCode.STRING_TOO_LONG,
          message: `Field "${field}" exceeds maximum length`,
          field,
          severity: 'error',
          suggestion: `Reduce ${field} to under ${this.config.maxStringLength} characters`,
        });
      }
    });

    // Check items
    if (Array.isArray(tpl.items)) {
      if (tpl.items.length > this.config.maxItemCount) {
        errors.push({
          code: ValidationErrorCode.TOO_MANY_ITEMS,
          message: `Template has too many items (${tpl.items.length} > ${this.config.maxItemCount})`,
          field: 'items',
          severity: 'error',
          suggestion: `Split template into multiple templates`,
        });
      }

      tpl.items.forEach((item: any, index: number) => {
        if (item.body && item.body.length > this.config.maxItemBodySize) {
          errors.push({
            code: ValidationErrorCode.CONTENT_TOO_LARGE,
            message: `Item body exceeds maximum size`,
            field: `items[${index}].body`,
            severity: 'error',
            suggestion: `Reduce body size to under ${Math.round(this.config.maxItemBodySize / 1024)}KB`,
          });
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
      sanitizedData: template as MarketplaceTemplate,
      metadata: {
        validatedAt: new Date(),
        validatorsRun: [this.name],
        durationMs: 0,
        originalSize: totalSize,
        threatsDetected: { xss: 0, injection: 0, pathTraversal: 0, promptInjection: 0, unicode: 0, other: errors.length },
      },
    };
  }

  private emptyResult(): TemplateValidationResult {
    return {
      isValid: true,
      errors: [],
      warnings: [],
      metadata: {
        validatedAt: new Date(),
        validatorsRun: [this.name],
        durationMs: 0,
        originalSize: 0,
        threatsDetected: { xss: 0, injection: 0, pathTraversal: 0, promptInjection: 0, unicode: 0, other: 0 },
      },
    };
  }
}
