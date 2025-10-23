/**
 * Duplicate ID Validator
 *
 * Ensures all IDs within the template are unique.
 * Prevents item ID collisions that could cause installation issues.
 */

import { MarketplaceTemplate } from '../../types';
import { ITemplateValidator, TemplateValidationResult, ValidationError } from '../types';
import { ValidationErrorCode } from '../constants';

export class DuplicateIdValidator implements ITemplateValidator {
  readonly name = 'DuplicateIdValidator';
  readonly category = 'business' as const;
  readonly enabled = true;

  validate(template: unknown): TemplateValidationResult {
    const errors: ValidationError[] = [];

    if (typeof template !== 'object' || template === null) {
      return this.emptyResult();
    }

    const tpl = template as any;

    if (!Array.isArray(tpl.items)) {
      return this.emptyResult();
    }

    // Check for duplicate item IDs
    const ids = new Set<string>();
    const duplicates = new Set<string>();

    tpl.items.forEach((item: any, index: number) => {
      if (item.id) {
        if (ids.has(item.id)) {
          duplicates.add(item.id);
        } else {
          ids.add(item.id);
        }
      }
    });

    // Report duplicates
    duplicates.forEach(id => {
      const indices = tpl.items
        .map((item: any, idx: number) => (item.id === id ? idx : -1))
        .filter((idx: number) => idx !== -1);

      errors.push({
        code: ValidationErrorCode.DUPLICATE_ID,
        message: `Duplicate item ID found: "${id}"`,
        field: `items`,
        severity: 'error',
        suggestion: 'Ensure all knowledge item IDs are unique within the template',
        context: { duplicateId: id, indices },
      });
    });

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
