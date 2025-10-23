/**
 * Prompt Injection Validator
 *
 * Detects LLM/AI agent prompt injection attacks based on 2024-2025 research.
 * Protects against:
 * - Direct prompt injection (instruction override)
 * - Indirect prompt injection (hidden instructions in data)
 * - Encoding-based evasion (Base64, Unicode, emoji)
 * - HTML comment injection (user example attack)
 * - Knowledge poisoning attempts
 *
 * Research sources:
 * - OWASP LLM01:2025 Prompt Injection
 * - Agent Hijacking research (Snyk Labs)
 * - MCP tool poisoning vulnerabilities
 */

import { MarketplaceTemplate } from '../../types';
import {
  ITemplateValidator,
  TemplateValidationResult,
  ValidationError,
  ValidationWarning,
} from '../types';
import { SecurityPatterns, ValidationErrorCode } from '../constants';

export class PromptInjectionValidator implements ITemplateValidator {
  readonly name = 'PromptInjectionValidator';
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
          promptInjection: errors.length,
          unicode: 0,
          other: 0,
        },
      },
    };
  }

  /**
   * Recursively check object for prompt injection
   */
  private checkObject(
    obj: any,
    path: string,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    sanitizedObj: any
  ): void {
    if (typeof obj === 'string') {
      const result = this.checkPromptInjection(obj, path);
      errors.push(...result.errors);
      warnings.push(...result.warnings);

      // Update sanitized object if needed
      if (result.sanitized !== obj) {
        this.setNestedValue(sanitizedObj, path, result.sanitized);
      }
    } else if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        const itemPath = path ? `${path}[${index}]` : `[${index}]`;
        this.checkObject(item, itemPath, errors, warnings, sanitizedObj);
      });
    } else if (typeof obj === 'object' && obj !== null) {
      Object.keys(obj).forEach(key => {
        const keyPath = path ? `${path}.${key}` : key;
        this.checkObject(obj[key], keyPath, errors, warnings, sanitizedObj);
      });
    }
  }

  /**
   * Check for prompt injection patterns
   */
  private checkPromptInjection(
    text: string,
    field: string
  ): { errors: ValidationError[]; warnings: ValidationWarning[]; sanitized: string } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let sanitized = text;

    // 1. Check for HTML comment injection (from user example)
    if (SecurityPatterns.HTML_COMMENTS.test(text)) {
      const commentContent = text.match(SecurityPatterns.HTML_COMMENTS);
      if (commentContent) {
        // Check if comments contain instruction patterns
        const hasInstructions = SecurityPatterns.PROMPT_INJECTION.some(pattern =>
          commentContent.some(comment => pattern.test(comment))
        );

        if (hasInstructions) {
          errors.push({
            code: ValidationErrorCode.HTML_COMMENT_INJECTION,
            message: 'HTML comment with prompt injection detected',
            field,
            severity: 'critical',
            suggestion: 'Remove HTML comments containing instructions',
            context: { example: commentContent[0].substring(0, 100) },
          });
        } else {
          warnings.push({
            code: 'HTML_COMMENT_PRESENT',
            message: 'HTML comments found (potential injection vector)',
            field,
            suggestion: 'Consider removing HTML comments from template content',
          });
        }
      }

      // Strip ALL HTML comments for safety
      sanitized = sanitized.replace(SecurityPatterns.HTML_COMMENTS, '');
    }

    // 2. Check for direct prompt injection patterns
    SecurityPatterns.PROMPT_INJECTION.forEach(pattern => {
      if (pattern.test(text)) {
        errors.push({
          code: ValidationErrorCode.PROMPT_INJECTION,
          message: 'Prompt injection pattern detected',
          field,
          severity: 'critical',
          suggestion: 'Remove instruction override attempts from content',
          context: {
            pattern: pattern.toString(),
            example: this.extractMatch(text, pattern),
          },
        });
      }
    });

    // 3. Check for instruction injection keywords
    const instructionKeywords = [
      'NEW INSTRUCTION',
      'SYSTEM MESSAGE',
      'SYSTEM PROMPT',
      'ASSISTANT BEHAVIOR',
      'MODEL BEHAVIOR',
      'OVERRIDE RULES',
      'IGNORE SAFETY',
    ];

    instructionKeywords.forEach(keyword => {
      if (text.toUpperCase().includes(keyword)) {
        errors.push({
          code: ValidationErrorCode.INSTRUCTION_INJECTION,
          message: `Instruction injection keyword detected: "${keyword}"`,
          field,
          severity: 'critical',
          suggestion: 'Remove meta-instructions from template content',
          context: { keyword },
        });
      }
    });

    // 4. Check for encoding evasion
    SecurityPatterns.ENCODING_EVASION.forEach(pattern => {
      if (pattern.test(text)) {
        warnings.push({
          code: ValidationErrorCode.ENCODING_EVASION,
          message: 'Encoded content detected (potential evasion technique)',
          field,
          suggestion: 'Use plain text instead of encoded content',
          context: { pattern: pattern.toString() },
        });
      }
    });

    // 5. Check for context confusion patterns
    const contextConfusionPatterns = [
      /article/gi,
      /comment/gi,
      /review/gi,
      /feedback/gi,
      /discussion/gi,
    ];

    const hasContextConfusion = contextConfusionPatterns.some(p => p.test(text));
    const hasInstructions = SecurityPatterns.PROMPT_INJECTION.some(p => p.test(text));

    if (hasContextConfusion && hasInstructions) {
      errors.push({
        code: 'CONTEXT_CONFUSION_ATTACK',
        message: 'Context confusion attack detected (disguised instructions)',
        field,
        severity: 'critical',
        suggestion: 'Content appears to disguise instructions as benign context',
        context: { technique: 'context_confusion' },
      });
    }

    // 6. Check for role-play attempts
    const rolePlayPatterns = [
      /you\s+are\s+(now\s+)?a\s+/gi,
      /act\s+as\s+(a|an)\s+/gi,
      /pretend\s+(you\s+are|to\s+be)/gi,
      /role[-\s]?play/gi,
      /simulate\s+being/gi,
    ];

    rolePlayPatterns.forEach(pattern => {
      if (pattern.test(text)) {
        errors.push({
          code: 'ROLEPLAY_INJECTION',
          message: 'Role-play injection attempt detected',
          field,
          severity: 'critical',
          suggestion: 'Remove role-play instructions from content',
          context: { pattern: pattern.toString() },
        });
      }
    });

    // 7. Check for memory manipulation
    const memoryPatterns = [
      /add\s+to\s+(memory|context|custom\s+memory)/gi,
      /remember\s+that/gi,
      /store\s+in\s+memory/gi,
      /save\s+to\s+memory/gi,
    ];

    memoryPatterns.forEach(pattern => {
      if (pattern.test(text)) {
        errors.push({
          code: 'MEMORY_MANIPULATION',
          message: 'Memory manipulation attempt detected',
          field,
          severity: 'critical',
          suggestion: 'Remove attempts to manipulate agent memory',
          context: { pattern: pattern.toString() },
        });
      }
    });

    return { errors, warnings, sanitized };
  }

  /**
   * Extract matching text for context
   */
  private extractMatch(text: string, pattern: RegExp): string {
    const match = text.match(pattern);
    return match ? match[0].substring(0, 50) : '';
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
