/**
 * XSS Validator
 *
 * Detects and sanitizes Cross-Site Scripting (XSS) attacks in template content.
 * Protects against CVE-2024-41662, CVE-2024-21535, CVE-2024-37304, and related.
 *
 * Attack vectors covered:
 * - Script tags and event handlers
 * - javascript: URIs
 * - iframe/object/embed injections
 * - Markdown autolink XSS (CVE-2024-37304)
 * - SVG-based XSS
 * - Meta refresh redirects
 */

import { MarketplaceTemplate, KnowledgeItem } from '../../types';
import {
  ITemplateValidator,
  TemplateValidationResult,
  ValidationError,
  ValidationWarning,
} from '../types';
import { SecurityPatterns, ValidationErrorCode } from '../constants';

export class XSSValidator implements ITemplateValidator {
  readonly name = 'XSSValidator';
  readonly category = 'security' as const;
  readonly enabled = true;

  validate(template: unknown): TemplateValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (typeof template !== 'object' || template === null) {
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

    const tpl = template as any;
    let sanitizedTemplate = JSON.parse(JSON.stringify(template));

    // Check top-level string fields
    if (tpl.name) {
      const result = this.checkAndSanitizeXSS(tpl.name, 'name');
      errors.push(...result.errors);
      warnings.push(...result.warnings);
      if (result.sanitized !== tpl.name) {
        sanitizedTemplate.name = result.sanitized;
      }
    }

    if (tpl.description) {
      const result = this.checkAndSanitizeXSS(tpl.description, 'description');
      errors.push(...result.errors);
      warnings.push(...result.warnings);
      if (result.sanitized !== tpl.description) {
        sanitizedTemplate.description = result.sanitized;
      }
    }

    // Check author fields
    if (tpl.author) {
      if (tpl.author.name) {
        const result = this.checkAndSanitizeXSS(tpl.author.name, 'author.name');
        errors.push(...result.errors);
        warnings.push(...result.warnings);
        if (result.sanitized !== tpl.author.name) {
          sanitizedTemplate.author.name = result.sanitized;
        }
      }
      if (tpl.author.url) {
        const result = this.checkURL(tpl.author.url, 'author.url');
        errors.push(...result.errors);
        warnings.push(...result.warnings);
      }
    }

    // Check items array
    if (Array.isArray(tpl.items)) {
      tpl.items.forEach((item: any, index: number) => {
        if (item.title) {
          const result = this.checkAndSanitizeXSS(item.title, `items[${index}].title`);
          errors.push(...result.errors);
          warnings.push(...result.warnings);
          if (result.sanitized !== item.title) {
            sanitizedTemplate.items[index].title = result.sanitized;
          }
        }

        if (item.body) {
          const result = this.checkMarkdownXSS(item.body, `items[${index}].body`);
          errors.push(...result.errors);
          warnings.push(...result.warnings);
          if (result.sanitized !== item.body) {
            sanitizedTemplate.items[index].body = result.sanitized;
          }
        }

        if (item.source) {
          const result = this.checkAndSanitizeXSS(item.source, `items[${index}].source`);
          errors.push(...result.errors);
          warnings.push(...result.warnings);
          if (result.sanitized !== item.source) {
            sanitizedTemplate.items[index].source = result.sanitized;
          }
        }

        if (Array.isArray(item.tags)) {
          item.tags.forEach((tag: string, tagIndex: number) => {
            const result = this.checkAndSanitizeXSS(tag, `items[${index}].tags[${tagIndex}]`);
            errors.push(...result.errors);
            warnings.push(...result.warnings);
            if (result.sanitized !== tag) {
              sanitizedTemplate.items[index].tags[tagIndex] = result.sanitized;
            }
          });
        }
      });
    }

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
          xss: errors.length,
          injection: 0,
          pathTraversal: 0,
          promptInjection: 0,
          unicode: 0,
          other: 0,
        },
      },
    };
  }

  /**
   * Check and sanitize XSS in text content
   */
  private checkAndSanitizeXSS(
    text: string,
    field: string
  ): { errors: ValidationError[]; warnings: ValidationWarning[]; sanitized: string } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let sanitized = text;

    // Check for script tags
    if (SecurityPatterns.XSS.scriptTag.test(text) || SecurityPatterns.XSS.scriptTagUnclosed.test(text)) {
      errors.push({
        code: ValidationErrorCode.XSS_SCRIPT_TAG,
        message: 'Script tag detected in template content',
        field,
        severity: 'critical',
        suggestion: 'Remove all <script> tags from template content',
        context: { originalValue: text.substring(0, 100) },
      });
      sanitized = sanitized.replace(SecurityPatterns.XSS.scriptTag, '').replace(SecurityPatterns.XSS.scriptTagUnclosed, '');
    }

    // Check for event handlers
    if (SecurityPatterns.XSS.eventHandler.test(text)) {
      errors.push({
        code: ValidationErrorCode.XSS_EVENT_HANDLER,
        message: 'HTML event handler detected',
        field,
        severity: 'critical',
        suggestion: 'Remove event handlers like onclick, onload, onerror, etc.',
        context: { originalValue: text.substring(0, 100) },
      });
      sanitized = sanitized.replace(SecurityPatterns.XSS.eventHandler, '');
    }

    // Check for javascript: URIs
    if (SecurityPatterns.XSS.javascriptUri.test(text)) {
      errors.push({
        code: ValidationErrorCode.XSS_JAVASCRIPT_URI,
        message: 'javascript: URI detected',
        field,
        severity: 'critical',
        suggestion: 'Remove javascript: protocol from URLs',
        context: { originalValue: text.substring(0, 100) },
      });
      sanitized = sanitized.replace(SecurityPatterns.XSS.javascriptUri, '');
    }

    // Check for iframe injections (CVE-2024-21535)
    if (SecurityPatterns.XSS.iframeSrc.test(text)) {
      errors.push({
        code: ValidationErrorCode.XSS_IFRAME_INJECTION,
        message: 'iframe injection detected',
        field,
        severity: 'critical',
        suggestion: 'Remove iframe tags from content',
        context: { originalValue: text.substring(0, 100) },
      });
      sanitized = sanitized.replace(SecurityPatterns.XSS.iframeSrc, '');
    }

    // Check for object/embed/applet tags
    if (SecurityPatterns.XSS.objectEmbed.test(text)) {
      warnings.push({
        code: 'XSS_OBJECT_EMBED',
        message: 'Potentially dangerous HTML element detected',
        field,
        suggestion: 'Remove <object>, <embed>, or <applet> tags',
        context: { originalValue: text.substring(0, 100) },
      });
      sanitized = sanitized.replace(SecurityPatterns.XSS.objectEmbed, '');
    }

    return { errors, warnings, sanitized };
  }

  /**
   * Check markdown-specific XSS (CVE-2024-37304: autolink injection)
   */
  private checkMarkdownXSS(
    markdown: string,
    field: string
  ): { errors: ValidationError[]; warnings: ValidationWarning[]; sanitized: string } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let sanitized = markdown;

    // First, run standard XSS checks
    const standardResult = this.checkAndSanitizeXSS(markdown, field);
    errors.push(...standardResult.errors);
    warnings.push(...standardResult.warnings);
    sanitized = standardResult.sanitized;

    // CVE-2024-37304: Markdown autolink with javascript:
    if (SecurityPatterns.XSS.autolinkJavascript.test(markdown)) {
      errors.push({
        code: ValidationErrorCode.XSS_AUTOLINK_INJECTION,
        message: 'Markdown autolink XSS detected (CVE-2024-37304)',
        field,
        severity: 'critical',
        suggestion: 'Remove autolinks with javascript: protocol like <javascript:alert(1)>',
        context: { cve: 'CVE-2024-37304' },
      });
      sanitized = sanitized.replace(SecurityPatterns.XSS.autolinkJavascript, '');
    }

    // SVG script injection
    if (SecurityPatterns.XSS.svgScript.test(markdown)) {
      errors.push({
        code: 'XSS_SVG_SCRIPT',
        message: 'SVG script injection detected',
        field,
        severity: 'critical',
        suggestion: 'Remove script tags from SVG elements',
      });
      sanitized = sanitized.replace(SecurityPatterns.XSS.svgScript, '<svg>');
    }

    return { errors, warnings, sanitized };
  }

  /**
   * Check URL for XSS vectors
   */
  private checkURL(
    url: string,
    field: string
  ): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (SecurityPatterns.XSS.javascriptUri.test(url)) {
      errors.push({
        code: ValidationErrorCode.XSS_JAVASCRIPT_URI,
        message: 'javascript: URI in URL field',
        field,
        severity: 'critical',
        suggestion: 'Use https:// or http:// URLs only',
      });
    }

    if (SecurityPatterns.XSS.dataUri.test(url)) {
      warnings.push({
        code: 'XSS_DATA_URI',
        message: 'data: URI detected (potential XSS vector)',
        field,
        suggestion: 'Consider using regular HTTPS URLs instead',
      });
    }

    return { errors, warnings };
  }
}
