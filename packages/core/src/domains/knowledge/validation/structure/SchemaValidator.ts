/**
 * Schema Validator
 *
 * Validates that the template conforms to expected MarketplaceTemplate structure.
 * Checks required fields, types, and basic structure.
 */

import { MarketplaceTemplate, KnowledgeType, KnowledgeScope, TemplateCategory } from '../../types';
import { ITemplateValidator, TemplateValidationResult, ValidationError } from '../types';
import { ValidationErrorCode } from '../constants';

export class SchemaValidator implements ITemplateValidator {
  readonly name = 'SchemaValidator';
  readonly category = 'structure' as const;
  readonly enabled = true;

  validate(template: unknown): TemplateValidationResult {
    const errors: ValidationError[] = [];

    // Must be an object
    if (typeof template !== 'object' || template === null || Array.isArray(template)) {
      errors.push({
        code: ValidationErrorCode.INVALID_TYPE,
        message: 'Template must be an object',
        field: 'template',
        severity: 'critical',
        suggestion: 'Provide a valid JSON object',
      });

      return this.errorResult(errors);
    }

    const tpl = template as any;

    // Check required fields
    const requiredFields = ['id', 'name', 'description', 'version', 'category', 'author', 'license', 'items'];
    requiredFields.forEach(field => {
      if (!(field in tpl)) {
        errors.push({
          code: ValidationErrorCode.MISSING_REQUIRED_FIELD,
          message: `Missing required field: ${field}`,
          field,
          severity: 'error',
          suggestion: `Add required field "${field}" to template`,
        });
      }
    });

    // Check field types
    if (tpl.id && typeof tpl.id !== 'string') {
      errors.push({
        code: ValidationErrorCode.INVALID_TYPE,
        message: 'Field "id" must be a string',
        field: 'id',
        severity: 'error',
        suggestion: 'Provide string value for id',
      });
    }

    if (tpl.items && !Array.isArray(tpl.items)) {
      errors.push({
        code: ValidationErrorCode.INVALID_TYPE,
        message: 'Field "items" must be an array',
        field: 'items',
        severity: 'error',
        suggestion: 'Provide array of knowledge items',
      });
    }

    // Check enum values
    if (tpl.category && !Object.values(TemplateCategory).includes(tpl.category)) {
      errors.push({
        code: ValidationErrorCode.INVALID_ENUM_VALUE,
        message: `Invalid category: "${tpl.category}"`,
        field: 'category',
        severity: 'error',
        suggestion: `Use one of: ${Object.values(TemplateCategory).join(', ')}`,
      });
    }

    // Check item structure
    if (Array.isArray(tpl.items)) {
      tpl.items.forEach((item: any, index: number) => {
        if (typeof item !== 'object') {
          errors.push({
            code: ValidationErrorCode.INVALID_TYPE,
            message: `Item at index ${index} is not an object`,
            field: `items[${index}]`,
            severity: 'error',
            suggestion: 'Ensure all items are valid knowledge items',
          });
          return;
        }

        // Check required item fields
        ['id', 'type', 'scope', 'title', 'body'].forEach(field => {
          if (!(field in item)) {
            errors.push({
              code: ValidationErrorCode.MISSING_REQUIRED_FIELD,
              message: `Item missing required field: ${field}`,
              field: `items[${index}].${field}`,
              severity: 'error',
              suggestion: `Add "${field}" to knowledge item`,
            });
          }
        });

        // Check enum values for items
        if (item.type && !Object.values(KnowledgeType).includes(item.type)) {
          errors.push({
            code: ValidationErrorCode.INVALID_ENUM_VALUE,
            message: `Invalid knowledge type: "${item.type}"`,
            field: `items[${index}].type`,
            severity: 'error',
            suggestion: `Use valid KnowledgeType enum value`,
          });
        }

        if (item.scope && !Object.values(KnowledgeScope).includes(item.scope)) {
          errors.push({
            code: ValidationErrorCode.INVALID_ENUM_VALUE,
            message: `Invalid scope: "${item.scope}"`,
            field: `items[${index}].scope`,
            severity: 'error',
            suggestion: `Use valid KnowledgeScope enum value`,
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
        originalSize: JSON.stringify(template).length,
        threatsDetected: { xss: 0, injection: 0, pathTraversal: 0, promptInjection: 0, unicode: 0, other: 0 },
      },
    };
  }

  private errorResult(errors: ValidationError[]): TemplateValidationResult {
    return {
      isValid: false,
      errors,
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
