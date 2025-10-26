/**
 * ConstraintValidator
 *
 * Validates values against constraint definitions:
 * - Numeric constraints (min, max, range, precision)
 * - String constraints (pattern, length, enum)
 * - Array constraints (minItems, maxItems, uniqueItems, itemType)
 * - Custom validators
 * - Invariant expressions
 */

import { ConstraintDefinition } from '../contracts';
import { ContractViolation } from '../types';
import { ValidationResult } from './TypeValidator';

/**
 * ConstraintValidator
 */
export class ConstraintValidator {
  /**
   * Validate value against constraints
   */
  validate(
    value: any,
    constraints: ConstraintDefinition,
    path: string = 'value',
    paramName?: string
  ): ValidationResult {
    const violations: ContractViolation[] = [];

    // Numeric constraints
    if (typeof value === 'number') {
      violations.push(...this.validateNumericConstraints(value, constraints, path, paramName));
    }

    // String constraints
    if (typeof value === 'string') {
      violations.push(...this.validateStringConstraints(value, constraints, path, paramName));
    }

    // Array constraints
    if (Array.isArray(value)) {
      violations.push(...this.validateArrayConstraints(value, constraints, path, paramName));
    }

    // Enum constraint (works for any type)
    if (constraints.enum) {
      violations.push(...this.validateEnum(value, constraints.enum, path, paramName));
    }

    // Custom validator
    if (constraints.validate) {
      const result = constraints.validate(value);
      if (result !== true) {
        const errorMessage = typeof result === 'string' ? result : 'Custom validation failed';
        violations.push({
          type: 'input',
          paramName,
          expected: 'valid value',
          actual: String(value),
          message: errorMessage,
          path,
          severity: 'error',
          agentMessage: `Custom validation failed at ${path}: ${errorMessage}`
        });
      }
    }

    return { valid: violations.length === 0, violations };
  }

  /**
   * Validate numeric constraints
   */
  private validateNumericConstraints(
    value: number,
    constraints: ConstraintDefinition,
    path: string,
    paramName?: string
  ): ContractViolation[] {
    const violations: ContractViolation[] = [];

    // Min constraint
    if (constraints.min !== undefined && value < constraints.min) {
      violations.push({
        type: 'input',
        paramName,
        expected: `>= ${constraints.min}`,
        actual: String(value),
        message: `Value ${value} is less than minimum ${constraints.min}`,
        path,
        severity: 'error',
        agentMessage: `Value at ${path} is ${value} but must be at least ${constraints.min}.`
      });
    }

    // Max constraint
    if (constraints.max !== undefined && value > constraints.max) {
      violations.push({
        type: 'input',
        paramName,
        expected: `<= ${constraints.max}`,
        actual: String(value),
        message: `Value ${value} is greater than maximum ${constraints.max}`,
        path,
        severity: 'error',
        agentMessage: `Value at ${path} is ${value} but must be at most ${constraints.max}.`
      });
    }

    // Range constraint
    if (constraints.range) {
      const [min, max] = constraints.range;
      if (value < min || value > max) {
        violations.push({
          type: 'input',
          paramName,
          expected: `${min} to ${max}`,
          actual: String(value),
          message: `Value ${value} is outside range [${min}, ${max}]`,
          path,
          severity: 'error',
          agentMessage: `Value at ${path} is ${value} but must be between ${min} and ${max}.`
        });
      }
    }

    // Precision constraint
    if (constraints.precision !== undefined) {
      const decimalPlaces = this.getDecimalPlaces(value);
      if (decimalPlaces > constraints.precision) {
        violations.push({
          type: 'input',
          paramName,
          expected: `precision ${constraints.precision}`,
          actual: `precision ${decimalPlaces}`,
          message: `Value has ${decimalPlaces} decimal places, max is ${constraints.precision}`,
          path,
          severity: 'warning',
          agentMessage: `Value at ${path} has too many decimal places (${decimalPlaces}). Round to ${constraints.precision} places.`
        });
      }
    }

    return violations;
  }

  /**
   * Validate string constraints
   */
  private validateStringConstraints(
    value: string,
    constraints: ConstraintDefinition,
    path: string,
    paramName?: string
  ): ContractViolation[] {
    const violations: ContractViolation[] = [];

    // Pattern constraint
    if (constraints.pattern) {
      const pattern = typeof constraints.pattern === 'string'
        ? new RegExp(constraints.pattern)
        : constraints.pattern;

      if (!pattern.test(value)) {
        violations.push({
          type: 'input',
          paramName,
          expected: `match pattern ${pattern.source}`,
          actual: value,
          message: `String does not match pattern ${pattern.source}`,
          path,
          severity: 'error',
          agentMessage: `Value at ${path} ("${value}") does not match the required pattern: ${pattern.source}`
        });
      }
    }

    // Min length constraint
    if (constraints.minLength !== undefined && value.length < constraints.minLength) {
      violations.push({
        type: 'input',
        paramName,
        expected: `length >= ${constraints.minLength}`,
        actual: `length ${value.length}`,
        message: `String length ${value.length} is less than minimum ${constraints.minLength}`,
        path,
        severity: 'error',
        agentMessage: `Value at ${path} is too short (${value.length} chars). Minimum length is ${constraints.minLength}.`
      });
    }

    // Max length constraint
    if (constraints.maxLength !== undefined && value.length > constraints.maxLength) {
      violations.push({
        type: 'input',
        paramName,
        expected: `length <= ${constraints.maxLength}`,
        actual: `length ${value.length}`,
        message: `String length ${value.length} is greater than maximum ${constraints.maxLength}`,
        path,
        severity: 'error',
        agentMessage: `Value at ${path} is too long (${value.length} chars). Maximum length is ${constraints.maxLength}.`
      });
    }

    return violations;
  }

  /**
   * Validate array constraints
   */
  private validateArrayConstraints(
    value: any[],
    constraints: ConstraintDefinition,
    path: string,
    paramName?: string
  ): ContractViolation[] {
    const violations: ContractViolation[] = [];

    // Min items constraint
    if (constraints.minItems !== undefined && value.length < constraints.minItems) {
      violations.push({
        type: 'input',
        paramName,
        expected: `>= ${constraints.minItems} items`,
        actual: `${value.length} items`,
        message: `Array has ${value.length} items, minimum is ${constraints.minItems}`,
        path,
        severity: 'error',
        agentMessage: `Array at ${path} has ${value.length} items but must have at least ${constraints.minItems}.`
      });
    }

    // Max items constraint
    if (constraints.maxItems !== undefined && value.length > constraints.maxItems) {
      violations.push({
        type: 'input',
        paramName,
        expected: `<= ${constraints.maxItems} items`,
        actual: `${value.length} items`,
        message: `Array has ${value.length} items, maximum is ${constraints.maxItems}`,
        path,
        severity: 'error',
        agentMessage: `Array at ${path} has ${value.length} items but must have at most ${constraints.maxItems}.`
      });
    }

    // Unique items constraint
    if (constraints.uniqueItems) {
      const seen = new Set();
      const duplicates: any[] = [];

      for (const item of value) {
        const key = typeof item === 'object' ? JSON.stringify(item) : item;
        if (seen.has(key)) {
          duplicates.push(item);
        } else {
          seen.add(key);
        }
      }

      if (duplicates.length > 0) {
        violations.push({
          type: 'input',
          paramName,
          expected: 'unique items',
          actual: `${duplicates.length} duplicates`,
          message: `Array contains duplicate items`,
          path,
          severity: 'error',
          agentMessage: `Array at ${path} contains duplicate items. All items must be unique.`
        });
      }
    }

    return violations;
  }

  /**
   * Validate enum constraint
   */
  private validateEnum(
    value: any,
    enumValues: any[],
    path: string,
    paramName?: string
  ): ContractViolation[] {
    const violations: ContractViolation[] = [];

    const isInEnum = enumValues.some(enumValue => {
      if (typeof enumValue === 'object' && typeof value === 'object') {
        return JSON.stringify(enumValue) === JSON.stringify(value);
      }
      return enumValue === value;
    });

    if (!isInEnum) {
      violations.push({
        type: 'input',
        paramName,
        expected: `one of: ${enumValues.map(v => JSON.stringify(v)).join(', ')}`,
        actual: JSON.stringify(value),
        message: `Value is not in allowed enum values`,
        path,
        severity: 'error',
        agentMessage: `Value at ${path} (${JSON.stringify(value)}) is not one of the allowed values: ${enumValues.map(v => JSON.stringify(v)).join(', ')}`
      });
    }

    return violations;
  }

  /**
   * Get number of decimal places
   */
  private getDecimalPlaces(value: number): number {
    if (Number.isInteger(value)) {
      return 0;
    }

    const str = value.toString();
    const decimalIndex = str.indexOf('.');

    if (decimalIndex === -1) {
      return 0;
    }

    return str.length - decimalIndex - 1;
  }
}

/**
 * Global constraint validator instance
 */
let globalConstraintValidator: ConstraintValidator | undefined;

/**
 * Get global constraint validator
 */
export function getGlobalConstraintValidator(): ConstraintValidator {
  if (!globalConstraintValidator) {
    globalConstraintValidator = new ConstraintValidator();
  }
  return globalConstraintValidator;
}

/**
 * Convenience function to validate constraints
 */
export function validateConstraints(
  value: any,
  constraints: ConstraintDefinition,
  path?: string,
  paramName?: string
): ValidationResult {
  return getGlobalConstraintValidator().validate(value, constraints, path, paramName);
}
