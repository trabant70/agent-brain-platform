/**
 * Unicode Validator
 *
 * Detects Unicode-based attack vectors discovered in 2024-2025 CVE research.
 * Protects against:
 * - Unpaired surrogates (U+D800-U+DFFF) for privilege escalation
 * - Unicode truncation attacks (parser mismatches)
 * - Homoglyph attacks (lookalike characters)
 * - RTL override attacks
 * - Zero-width character steganography
 * - Excessive combining characters
 *
 * Research sources:
 * - JSON injection Unicode attacks (2024-2025)
 * - ujson parser vulnerability (truncation)
 * - Veracode Unicode obfuscation research
 */

import { MarketplaceTemplate } from '../../types';
import {
  ITemplateValidator,
  TemplateValidationResult,
  ValidationError,
  ValidationWarning,
} from '../types';
import { SecurityPatterns, ValidationErrorCode } from '../constants';

export class UnicodeValidator implements ITemplateValidator {
  readonly name = 'UnicodeValidator';
  readonly category = 'security' as const;
  readonly enabled = true;

  validate(template: unknown): TemplateValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (typeof template !== 'object' || template === null) {
      return this.emptyResult();
    }

    const tpl = template as any;
    let sanitizedTemplate = JSON.parse(JSON.stringify(template));

    // Check all string fields recursively
    this.checkObject(tpl, '', errors, warnings, sanitizedTemplate);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedData: sanitizedTemplate as MarketplaceTemplate,
      metadata: {
        validatedAt: new Date(),
        validatorsRun: [this.name],
        durationMs: 0,
        originalSize: JSON.stringify(template).length,
        sanitizedSize: JSON.stringify(sanitizedTemplate).length,
        threatsDetected: {
          xss: 0,
          injection: 0,
          pathTraversal: 0,
          promptInjection: 0,
          unicode: errors.length,
          other: 0,
        },
      },
    };
  }

  /**
   * Recursively check object for Unicode attacks
   */
  private checkObject(
    obj: any,
    path: string,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    sanitizedObj: any
  ): void {
    if (typeof obj === 'string') {
      const result = this.checkUnicodeAttacks(obj, path);
      errors.push(...result.errors);
      warnings.push(...result.warnings);

      if (result.sanitized !== obj) {
        this.setNestedValue(sanitizedObj, path, result.sanitized);
      }
    } else if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        const itemPath = path ? `${path}[${index}]` : `[${index}]`;
        this.checkObject(item, itemPath, errors, warnings, sanitizedObj);
      });
    } else if (typeof obj === 'object' && obj !== null) {
      // Check keys for Unicode attacks (important for JSON injection)
      Object.keys(obj).forEach(key => {
        const keyResult = this.checkUnicodeAttacks(key, `${path}.<key>`);
        if (keyResult.errors.length > 0) {
          errors.push(...keyResult.errors.map(e => ({
            ...e,
            message: `Unicode attack in object key: ${e.message}`,
            field: path ? `${path}.${key}` : key,
          })));
        }

        const keyPath = path ? `${path}.${key}` : key;
        this.checkObject(obj[key], keyPath, errors, warnings, sanitizedObj);
      });
    }
  }

  /**
   * Check for Unicode attack patterns
   */
  private checkUnicodeAttacks(
    text: string,
    field: string
  ): { errors: ValidationError[]; warnings: ValidationWarning[]; sanitized: string } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let sanitized = text;

    // 1. Unpaired surrogates (U+D800-U+DFFF) - CVE-2024+ privilege escalation
    if (SecurityPatterns.UNICODE.unpairedSurrogates.test(text)) {
      const matches = text.match(SecurityPatterns.UNICODE.unpairedSurrogates);
      errors.push({
        code: ValidationErrorCode.UNPAIRED_SURROGATE,
        message: 'Unpaired UTF-16 surrogate detected (privilege escalation vector)',
        field,
        severity: 'critical',
        suggestion: 'Remove unpaired surrogates (U+D800-U+DFFF)',
        context: {
          cve: 'CVE-2024+ Unicode truncation',
          matches: matches?.map(m => '\\u' + m.charCodeAt(0).toString(16).toUpperCase()),
          explanation: 'Can cause "administrator\\ud888" to be parsed as "administrator"',
        },
      });

      // Strip unpaired surrogates
      sanitized = sanitized.replace(SecurityPatterns.UNICODE.unpairedSurrogates, '');
    }

    // 2. RTL override attacks (can disguise malicious content)
    if (SecurityPatterns.UNICODE.rtlOverride.test(text)) {
      errors.push({
        code: ValidationErrorCode.RTL_OVERRIDE,
        message: 'RTL override character detected (text direction manipulation)',
        field,
        severity: 'error',
        suggestion: 'Remove RTL override characters (U+202E, U+202D, etc.)',
        context: {
          chars: ['U+202E', 'U+202D', 'U+200F', 'U+200E'],
          risk: 'Can make malicious text appear benign',
        },
      });

      sanitized = sanitized.replace(SecurityPatterns.UNICODE.rtlOverride, '');
    }

    // 3. Zero-width characters (steganography, hidden content)
    if (SecurityPatterns.UNICODE.zeroWidth.test(text)) {
      const count = (text.match(SecurityPatterns.UNICODE.zeroWidth) || []).length;

      if (count > 5) {
        errors.push({
          code: ValidationErrorCode.ZERO_WIDTH_CHAR,
          message: `Excessive zero-width characters detected (${count} found)`,
          field,
          severity: 'error',
          suggestion: 'Remove zero-width spaces, joiners, and non-joiners',
          context: {
            count,
            chars: ['U+200B', 'U+200C', 'U+200D', 'U+FEFF'],
            risk: 'Can hide malicious instructions via steganography',
          },
        });
      } else {
        warnings.push({
          code: 'ZERO_WIDTH_CHARS_PRESENT',
          message: `Zero-width characters detected (${count} found)`,
          field,
          suggestion: 'Consider removing zero-width characters',
          context: { count },
        });
      }

      sanitized = sanitized.replace(SecurityPatterns.UNICODE.zeroWidth, '');
    }

    // 4. Homoglyph attacks (Cyrillic lookalikes)
    if (SecurityPatterns.UNICODE.homoglyphs.test(text)) {
      // Only warn if it's in identifier-like contexts (IDs, keys, email)
      if (field.includes('id') || field.includes('email') || field.includes('author')) {
        errors.push({
          code: ValidationErrorCode.HOMOGLYPH_ATTACK,
          message: 'Homoglyph characters detected (lookalike substitution)',
          field,
          severity: 'error',
          suggestion: 'Use ASCII characters only for identifiers',
          context: {
            example: 'Cyrillic "а" looks like Latin "a" but has different codepoint',
            risk: 'Can bypass duplicate checks or impersonate legitimate IDs',
          },
        });
      } else {
        warnings.push({
          code: 'HOMOGLYPH_DETECTED',
          message: 'Non-ASCII lookalike characters detected',
          field,
          suggestion: 'Verify these characters are intentional',
        });
      }
    }

    // 5. Excessive combining characters (rendering abuse, DoS)
    if (SecurityPatterns.UNICODE.excessiveCombining.test(text)) {
      errors.push({
        code: 'EXCESSIVE_COMBINING_CHARS',
        message: 'Excessive combining characters detected (4+ in sequence)',
        field,
        severity: 'error',
        suggestion: 'Limit combining characters to 3 per base character',
        context: {
          risk: 'Can cause rendering issues or DoS',
        },
      });

      // Limit combining characters to 3 per base character
      sanitized = sanitized.replace(/[\u0300-\u036F]{4,}/g, '');
    }

    // 6. Check for Unicode normalization issues
    const normalized = text.normalize('NFC');
    if (normalized !== text && field.includes('id')) {
      warnings.push({
        code: 'UNICODE_NORMALIZATION',
        message: 'Text requires Unicode normalization',
        field,
        suggestion: 'Apply NFC normalization to avoid duplicate ID issues',
        context: {
          explanation: 'Different Unicode sequences can represent same visual character',
        },
      });

      sanitized = normalized;
    }

    // 7. Check for Unicode truncation patterns (parser mismatches)
    const hasUnpairedAndIdentifier =
      SecurityPatterns.UNICODE.unpairedSurrogates.test(text) &&
      (field.includes('id') || field.includes('role') || field.includes('name'));

    if (hasUnpairedAndIdentifier) {
      errors.push({
        code: ValidationErrorCode.UNICODE_TRUNCATION,
        message: 'Unicode truncation attack detected (parser mismatch exploit)',
        field,
        severity: 'critical',
        suggestion: 'Remove unpaired surrogates from identifier fields',
        context: {
          vulnerability: 'ujson parser truncation',
          example: '"administrator\\ud888" becomes "administrator" after parsing',
          impact: 'Can bypass authorization checks via role name manipulation',
        },
      });
    }

    return { errors, warnings, sanitized };
  }

  /**
   * Set nested value in object by path
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    if (!path) return;

    const parts = path.split(/[\.\[\]]/).filter(Boolean);
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) return;
      current = current[part];
    }

    const lastPart = parts[parts.length - 1];
    if (lastPart in current) {
      current[lastPart] = value;
    }
  }

  /**
   * Empty result for non-object input
   */
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
        threatsDetected: {
          xss: 0,
          injection: 0,
          pathTraversal: 0,
          promptInjection: 0,
          unicode: 0,
          other: 0,
        },
      },
    };
  }
}
