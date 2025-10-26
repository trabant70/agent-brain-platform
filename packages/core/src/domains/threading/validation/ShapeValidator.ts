/**
 * ShapeValidator
 *
 * Validates object shapes and array structures:
 * - Object shape matching
 * - Required/optional fields
 * - Nested objects
 * - Array item types
 * - Unexpected fields detection
 */

import { ShapeDefinition, FieldDefinition, DataContract } from '../contracts';
import { ContractViolation } from '../types';
import { TypeValidator, ValidationResult } from './TypeValidator';

/**
 * Shape Validation Options
 */
export interface ShapeValidationOptions {
  allowExtraFields?: boolean;  // Allow fields not in shape definition
  strictTypes?: boolean;        // Strict type checking
}

/**
 * Default Options
 */
const DEFAULT_OPTIONS: ShapeValidationOptions = {
  allowExtraFields: false,
  strictTypes: true
};

/**
 * ShapeValidator
 */
export class ShapeValidator {
  private typeValidator: TypeValidator;

  constructor(typeValidator?: TypeValidator) {
    this.typeValidator = typeValidator || new TypeValidator();
  }

  /**
   * Validate value against shape definition
   */
  validate(
    value: any,
    shape: ShapeDefinition,
    path: string = 'value',
    paramName?: string,
    options?: ShapeValidationOptions
  ): ValidationResult {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const violations: ContractViolation[] = [];

    // Must be an object
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      violations.push({
        type: 'input',
        paramName,
        expected: 'object',
        actual: Array.isArray(value) ? 'array' : typeof value,
        message: `Expected object, got ${Array.isArray(value) ? 'array' : typeof value}`,
        path,
        severity: 'error',
        agentMessage: `Value at ${path} should be an object but is ${Array.isArray(value) ? 'array' : typeof value}.`
      });
      return { valid: false, violations };
    }

    // Check required fields
    for (const [fieldName, fieldDef] of Object.entries(shape)) {
      const fieldPath = `${path}.${fieldName}`;
      const fieldValue = value[fieldName];

      // Check if field is required
      if (fieldDef.required && fieldValue === undefined) {
        violations.push({
          type: 'input',
          paramName,
          expected: `required field "${fieldName}"`,
          actual: 'undefined',
          message: `Required field "${fieldName}" is missing`,
          path: fieldPath,
          severity: 'error',
          agentMessage: `The field "${fieldName}" is required at ${path} but is missing. Add this field to the object.`
        });
        continue;
      }

      // Skip optional missing fields
      if (!fieldDef.required && fieldValue === undefined) {
        continue;
      }

      // Validate field type
      if (fieldDef.type) {
        const typeResult = this.validateFieldType(
          fieldValue,
          fieldDef.type,
          fieldPath,
          fieldName
        );
        violations.push(...typeResult.violations);
      }

      // Validate field constraints
      if (fieldDef.constraints) {
        // Note: ConstraintValidator will handle this in Phase 3
        // For now, we just validate the structure exists
      }
    }

    // Check for unexpected fields
    if (!opts.allowExtraFields) {
      const definedFields = new Set(Object.keys(shape));
      const actualFields = Object.keys(value);

      for (const field of actualFields) {
        if (!definedFields.has(field)) {
          violations.push({
            type: 'input',
            paramName,
            expected: `no unexpected fields`,
            actual: `field "${field}" present`,
            message: `Unexpected field "${field}" in object`,
            path: `${path}.${field}`,
            severity: 'warning',
            agentMessage: `The field "${field}" at ${path} is not defined in the contract. Either remove it or update the contract to include it.`
          });
        }
      }
    }

    return { valid: violations.length === 0, violations };
  }

  /**
   * Validate field type
   */
  private validateFieldType(
    value: any,
    type: string | any,
    path: string,
    fieldName: string
  ): ValidationResult {
    const violations: ContractViolation[] = [];

    // Handle string type names
    if (typeof type === 'string') {
      const actualType = typeof value;

      // Handle special types
      if (type === 'array') {
        if (!Array.isArray(value)) {
          violations.push({
            type: 'input',
            paramName: fieldName,
            expected: 'array',
            actual: actualType,
            message: `Expected array, got ${actualType}`,
            path,
            severity: 'error',
            agentMessage: `Field "${fieldName}" at ${path} should be an array but is ${actualType}.`
          });
        }
      } else if (type === 'object') {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          violations.push({
            type: 'input',
            paramName: fieldName,
            expected: 'object',
            actual: Array.isArray(value) ? 'array' : actualType,
            message: `Expected object, got ${Array.isArray(value) ? 'array' : actualType}`,
            path,
            severity: 'error',
            agentMessage: `Field "${fieldName}" at ${path} should be an object but is ${Array.isArray(value) ? 'array' : actualType}.`
          });
        }
      } else if (actualType !== type) {
        // Primitive type mismatch
        violations.push({
          type: 'input',
          paramName: fieldName,
          expected: type,
          actual: actualType,
          message: `Expected ${type}, got ${actualType}`,
          path,
          severity: 'error',
          agentMessage: `Field "${fieldName}" at ${path} should be ${type} but is ${actualType}.`
        });
      }

      return { valid: violations.length === 0, violations };
    }

    // Handle TypeDefinition
    if (type.base !== undefined) {
      return this.typeValidator.validate(value, type, path, fieldName);
    }

    return { valid: true, violations: [] };
  }

  /**
   * Validate array items
   */
  validateArray(
    value: any,
    itemType: string | any,
    path: string = 'value',
    paramName?: string
  ): ValidationResult {
    const violations: ContractViolation[] = [];

    if (!Array.isArray(value)) {
      violations.push({
        type: 'input',
        paramName,
        expected: 'array',
        actual: typeof value,
        message: `Expected array, got ${typeof value}`,
        path,
        severity: 'error',
        agentMessage: `Value at ${path} should be an array but is ${typeof value}.`
      });
      return { valid: false, violations };
    }

    // Validate each item
    value.forEach((item, index) => {
      const itemPath = `${path}[${index}]`;
      const result = this.validateFieldType(item, itemType, itemPath, `item${index}`);
      violations.push(...result.violations);
    });

    return { valid: violations.length === 0, violations };
  }

  /**
   * Validate nested shape
   */
  validateNested(
    value: any,
    shape: ShapeDefinition,
    path: string = 'value',
    paramName?: string,
    options?: ShapeValidationOptions
  ): ValidationResult {
    return this.validate(value, shape, path, paramName, options);
  }

  /**
   * Validate data contract shape
   */
  validateDataContract(
    value: any,
    contract: DataContract,
    path: string = 'value',
    paramName?: string
  ): ValidationResult {
    const violations: ContractViolation[] = [];

    // Validate type first
    if (contract.type) {
      const typeResult = typeof contract.type === 'string'
        ? this.validateFieldType(value, contract.type, path, paramName || 'value')
        : this.typeValidator.validate(value, contract.type, path, paramName);

      violations.push(...typeResult.violations);

      // If type validation failed, don't continue
      if (!typeResult.valid) {
        return { valid: false, violations };
      }
    }

    // Validate shape if present
    if (contract.shape) {
      const shapeResult = this.validate(value, contract.shape, path, paramName);
      violations.push(...shapeResult.violations);
    }

    return { valid: violations.length === 0, violations };
  }
}

/**
 * Global shape validator instance
 */
let globalShapeValidator: ShapeValidator | undefined;

/**
 * Get global shape validator
 */
export function getGlobalShapeValidator(): ShapeValidator {
  if (!globalShapeValidator) {
    globalShapeValidator = new ShapeValidator();
  }
  return globalShapeValidator;
}

/**
 * Convenience function to validate shape
 */
export function validateShape(
  value: any,
  shape: ShapeDefinition,
  path?: string,
  paramName?: string,
  options?: ShapeValidationOptions
): ValidationResult {
  return getGlobalShapeValidator().validate(value, shape, path, paramName, options);
}
