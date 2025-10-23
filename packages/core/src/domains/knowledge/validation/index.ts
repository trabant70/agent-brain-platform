/**
 * Template Validation System
 *
 * Complete validation pipeline for marketplace templates.
 * Defends against 2024-2025 attack vectors:
 * - XSS (CVE-2024-41662, CVE-2024-21535, CVE-2024-37304)
 * - Prompt injection (LLM attacks)
 * - Unicode exploits (unpaired surrogates, truncation)
 * - Path traversal and prototype pollution
 * - Content size DoS attacks
 *
 * Usage:
 *   const orchestrator = createDefaultOrchestrator();
 *   const result = orchestrator.validate(importedTemplate);
 *
 *   if (!result.isValid) {
 *     showErrors(result.errors);
 *     return;
 *   }
 *
 *   await installTemplate(result.sanitizedData);
 */

// Core types and orchestrator
export * from './types';
export { ValidationErrorCode, SecurityPatterns, KNOWN_LICENSES, DEFAULT_VALIDATION_CONFIG, ValidationConfig } from './constants';
export { TemplateValidationOrchestrator } from './TemplateValidationOrchestrator';

// Structure validators
export { SchemaValidator } from './structure/SchemaValidator';

// Security validators
export { XSSValidator } from './security/XSSValidator';
export { PromptInjectionValidator } from './security/PromptInjectionValidator';
export { UnicodeValidator } from './security/UnicodeValidator';
export { PathTraversalValidator } from './security/PathTraversalValidator';
export { ContentSizeValidator } from './security/ContentSizeValidator';

// Business validators
export { DuplicateIdValidator } from './business/DuplicateIdValidator';

// Convenience imports
import { TemplateValidationOrchestrator } from './TemplateValidationOrchestrator';
import { SchemaValidator } from './structure/SchemaValidator';
import { XSSValidator } from './security/XSSValidator';
import { PromptInjectionValidator } from './security/PromptInjectionValidator';
import { UnicodeValidator } from './security/UnicodeValidator';
import { PathTraversalValidator } from './security/PathTraversalValidator';
import { ContentSizeValidator } from './security/ContentSizeValidator';
import { DuplicateIdValidator } from './business/DuplicateIdValidator';
import { ValidationConfig, DEFAULT_VALIDATION_CONFIG } from './constants';

/**
 * Create a fully configured validation orchestrator with all validators
 *
 * @param config - Optional custom configuration
 * @returns Configured orchestrator ready to validate templates
 */
export function createDefaultOrchestrator(config?: Partial<ValidationConfig>): TemplateValidationOrchestrator {
  const orchestrator = new TemplateValidationOrchestrator(config);

  // Register validators in order: structure → security → business

  // Structure validators
  orchestrator.registerValidator(new SchemaValidator());

  // Security validators (most critical)
  orchestrator.registerValidator(new XSSValidator());
  orchestrator.registerValidator(new PromptInjectionValidator());
  orchestrator.registerValidator(new UnicodeValidator());
  orchestrator.registerValidator(new PathTraversalValidator());
  orchestrator.registerValidator(new ContentSizeValidator(orchestrator.getConfig()));

  // Business validators
  orchestrator.registerValidator(new DuplicateIdValidator());

  return orchestrator;
}

/**
 * Quick validation function for convenience
 *
 * @param template - Template to validate
 * @param config - Optional custom configuration
 * @returns Validation result
 */
export function validateTemplate(template: unknown, config?: Partial<ValidationConfig>) {
  const orchestrator = createDefaultOrchestrator(config);
  return orchestrator.validate(template);
}
