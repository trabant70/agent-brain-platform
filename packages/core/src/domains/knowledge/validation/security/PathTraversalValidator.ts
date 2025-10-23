/**
 * Path Traversal Validator
 *
 * Detects path traversal and file system attacks.
 * Protects against:
 * - Directory traversal (../, ..\\)
 * - Absolute paths outside allowed directories
 * - Null byte injection
 * - URL-encoded path traversal
 */

import { MarketplaceTemplate } from '../../types';
import { ITemplateValidator, TemplateValidationResult, ValidationError } from '../types';
import { SecurityPatterns, ValidationErrorCode } from '../constants';

export class PathTraversalValidator implements ITemplateValidator {
  readonly name = 'PathTraversalValidator';
  readonly category = 'security' as const;
  readonly enabled = true;

  validate(template: unknown): TemplateValidationResult {
    const errors: ValidationError[] = [];

    if (typeof template !== 'object' || template === null) {
      return this.emptyResult();
    }

    const tpl = template as any;

    // Check source fields (most likely attack vector)
    if (tpl.source) this.checkPath(tpl.source, 'source', errors);

    // Check item sources
    if (Array.isArray(tpl.items)) {
      tpl.items.forEach((item: any, index: number) => {
        if (item.source) {
          this.checkPath(item.source, `items[${index}].source`, errors);
        }
        if (item.path) {
          this.checkPath(item.path, `items[${index}].path`, errors);
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
        threatsDetected: {
          xss: 0,
          injection: 0,
          pathTraversal: errors.length,
          promptInjection: 0,
          unicode: 0,
          other: 0,
        },
      },
    };
  }

  private checkPath(path: string, field: string, errors: ValidationError[]): void {
    SecurityPatterns.PATH_TRAVERSAL.forEach(pattern => {
      if (pattern.test(path)) {
        errors.push({
          code: ValidationErrorCode.PATH_TRAVERSAL,
          message: 'Path traversal pattern detected',
          field,
          severity: 'critical',
          suggestion: 'Use relative paths within .agent-brain directory only',
          context: { path: path.substring(0, 100), pattern: pattern.toString() },
        });
      }
    });
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
