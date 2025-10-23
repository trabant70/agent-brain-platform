/**
 * Template Validation Types
 *
 * Core type definitions for the template validation system.
 * Designed to defend against:
 * - Prompt injection (2024-2025 LLM attacks)
 * - XSS/injection attacks (CVE-2024-41662, CVE-2024-21535, etc.)
 * - Unicode exploits (unpaired surrogates, truncation)
 * - JSON injection attacks
 * - Path traversal and prototype pollution
 */

import { MarketplaceTemplate } from '../types';

/**
 * Template validation result using Result Pattern
 * Provides detailed feedback on validation success/failure
 */
export interface TemplateValidationResult<T = MarketplaceTemplate> {
  /** Whether the template passed all critical validations */
  isValid: boolean;

  /** Critical errors that prevent template installation */
  errors: ValidationError[];

  /** Non-critical warnings that should be shown to user */
  warnings: ValidationWarning[];

  /** Sanitized version of the template (XSS-safe, normalized) */
  sanitizedData?: T;

  /** Metadata about the validation process */
  metadata: ValidationMetadata;
}

/**
 * Validation error with context
 */
export interface ValidationError {
  /** Error code for programmatic handling */
  code: string;

  /** Human-readable error message */
  message: string;

  /** Field path that failed validation (e.g., "items[0].body") */
  field: string;

  /** Severity level */
  severity: 'critical' | 'error';

  /** Suggested fix for the user */
  suggestion?: string;

  /** Additional context about the error */
  context?: Record<string, any>;
}

/**
 * Validation warning for non-critical issues
 */
export interface ValidationWarning {
  /** Warning code */
  code: string;

  /** Human-readable warning message */
  message: string;

  /** Field that triggered the warning */
  field: string;

  /** Suggested action */
  suggestion?: string;

  /** Additional context */
  context?: Record<string, any>;
}

/**
 * Metadata about the validation process
 */
export interface ValidationMetadata {
  /** Timestamp of validation */
  validatedAt: Date;

  /** List of validators that ran */
  validatorsRun: string[];

  /** Total validation time in milliseconds */
  durationMs: number;

  /** Template size before sanitization */
  originalSize: number;

  /** Template size after sanitization */
  sanitizedSize?: number;

  /** Detected threats by category */
  threatsDetected: {
    xss: number;
    injection: number;
    pathTraversal: number;
    promptInjection: number;
    unicode: number;
    other: number;
  };
}

/**
 * Validator interface using Strategy Pattern
 */
export interface ITemplateValidator {
  /** Unique name of the validator */
  readonly name: string;

  /** Category of validation */
  readonly category: 'structure' | 'security' | 'business';

  /** Whether this validator is enabled */
  readonly enabled: boolean;

  /**
   * Validate the template
   * @param template - Template to validate (may be unknown type initially)
   * @returns Validation result
   */
  validate(template: unknown): TemplateValidationResult<MarketplaceTemplate>;
}

/**
 * Validation configuration
 */
export interface ValidationConfig {
  /** Maximum template size in bytes (default: 5MB) */
  maxTemplateSize: number;

  /** Maximum size per item body (default: 1MB) */
  maxItemBodySize: number;

  /** Maximum number of items per template (default: 100) */
  maxItemCount: number;

  /** Maximum string length for text fields (default: 10000) */
  maxStringLength: number;

  /** Maximum tag count (default: 20) */
  maxTagCount: number;

  /** Maximum tag length (default: 50) */
  maxTagLength: number;

  /** Allowed URL protocols */
  allowedProtocols: string[];

  /** Whether to sanitize content or reject it */
  sanitizeMode: 'reject' | 'sanitize';

  /** Whether to run all validators or stop at first failure */
  failFast: boolean;

  /** Enable strict mode (more aggressive checks) */
  strictMode: boolean;
}
