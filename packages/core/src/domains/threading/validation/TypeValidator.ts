/**
 * TypeValidator
 *
 * Validates values against TypeDefinition specifications:
 * - Primitive types (string, number, boolean, etc.)
 * - Constructor types (Date, RegExp, custom classes)
 * - Union types (string | number)
 * - Literal types ('success' | 'failure')
 * - Generic types (Array<T>, Promise<T>)
 * - Nullable types
 */

import { TypeDefinition } from '../contracts';
import { ContractViolation } from '../types';

/**
 * Validation Result
 */
export interface ValidationResult {
  valid: boolean;
  violations: ContractViolation[];
}

/**
 * TypeValidator
 */
export class TypeValidator {
  /**
   * Validate value against type definition
   */
  validate(
    value: any,
    typeDef: TypeDefinition,
    path: string = 'value',
    paramName?: string
  ): ValidationResult {
    const violations: ContractViolation[] = [];

    // Handle null
    if (value === null) {
      if (typeDef.nullable) {
        return { valid: true, violations: [] };
      }
      if (typeDef.base === 'null') {
        return { valid: true, violations: [] };
      }
      violations.push({
        type: 'input',
        paramName,
        expected: this.formatTypeDefinition(typeDef),
        actual: 'null',
        message: `Expected ${this.formatTypeDefinition(typeDef)}, got null`,
        path,
        severity: 'error',
        agentMessage: `Value at ${path} is null but the contract requires ${this.formatTypeDefinition(typeDef)}. Check if null handling is needed.`
      });
      return { valid: false, violations };
    }

    // Handle undefined
    if (value === undefined) {
      if (typeDef.base === 'undefined') {
        return { valid: true, violations: [] };
      }
      violations.push({
        type: 'input',
        paramName,
        expected: this.formatTypeDefinition(typeDef),
        actual: 'undefined',
        message: `Expected ${this.formatTypeDefinition(typeDef)}, got undefined`,
        path,
        severity: 'error',
        agentMessage: `Value at ${path} is undefined but the contract requires ${this.formatTypeDefinition(typeDef)}. Ensure the value is provided.`
      });
      return { valid: false, violations };
    }

    // Handle union types
    if (typeDef.union && typeDef.union.length > 0) {
      return this.validateUnion(value, typeDef.union, path, paramName);
    }

    // Handle literal types
    if (typeDef.literal !== undefined) {
      return this.validateLiteral(value, typeDef.literal, path, paramName);
    }

    // Handle generic types
    if (typeDef.generic) {
      return this.validateGeneric(value, typeDef.generic, path, paramName);
    }

    // Handle base type
    return this.validateBaseType(value, typeDef.base, path, paramName);
  }

  /**
   * Validate base type
   */
  private validateBaseType(
    value: any,
    base: TypeDefinition['base'],
    path: string,
    paramName?: string
  ): ValidationResult {
    const violations: ContractViolation[] = [];
    const actualType = typeof value;

    if (base === 'any') {
      return { valid: true, violations: [] };
    }

    if (base === 'array') {
      if (!Array.isArray(value)) {
        violations.push({
          type: 'input',
          paramName,
          expected: 'array',
          actual: actualType,
          message: `Expected array, got ${actualType}`,
          path,
          severity: 'error',
          agentMessage: `Value at ${path} should be an array but is ${actualType}. Use array syntax [].`
        });
      }
      return { valid: violations.length === 0, violations };
    }

    if (base === 'null') {
      if (value !== null) {
        violations.push({
          type: 'input',
          paramName,
          expected: 'null',
          actual: actualType,
          message: `Expected null, got ${actualType}`,
          path,
          severity: 'error'
        });
      }
      return { valid: violations.length === 0, violations };
    }

    if (base === 'undefined') {
      if (value !== undefined) {
        violations.push({
          type: 'input',
          paramName,
          expected: 'undefined',
          actual: actualType,
          message: `Expected undefined, got ${actualType}`,
          path,
          severity: 'error'
        });
      }
      return { valid: violations.length === 0, violations };
    }

    // Primitive types
    if (actualType !== base) {
      violations.push({
        type: 'input',
        paramName,
        expected: base,
        actual: actualType,
        message: `Expected ${base}, got ${actualType}`,
        path,
        severity: 'error',
        agentMessage: `Type mismatch at ${path}: expected ${base} but received ${actualType}. Convert the value to ${base}.`
      });
    }

    return { valid: violations.length === 0, violations };
  }

  /**
   * Validate union type
   */
  private validateUnion(
    value: any,
    unionTypes: TypeDefinition[],
    path: string,
    paramName?: string
  ): ValidationResult {
    // Try each type in the union
    for (const typeDef of unionTypes) {
      const result = this.validate(value, typeDef, path, paramName);
      if (result.valid) {
        return result;
      }
    }

    // None matched
    const expected = unionTypes.map(t => this.formatTypeDefinition(t)).join(' | ');
    const actual = typeof value;

    return {
      valid: false,
      violations: [{
        type: 'input',
        paramName,
        expected,
        actual,
        message: `Expected ${expected}, got ${actual}`,
        path,
        severity: 'error',
        agentMessage: `Value at ${path} doesn't match any of the allowed types: ${expected}. Current type is ${actual}.`
      }]
    };
  }

  /**
   * Validate literal type
   */
  private validateLiteral(
    value: any,
    literal: any,
    path: string,
    paramName?: string
  ): ValidationResult {
    const violations: ContractViolation[] = [];

    if (value !== literal) {
      violations.push({
        type: 'input',
        paramName,
        expected: JSON.stringify(literal),
        actual: JSON.stringify(value),
        message: `Expected literal value ${JSON.stringify(literal)}, got ${JSON.stringify(value)}`,
        path,
        severity: 'error',
        agentMessage: `Value at ${path} must be exactly ${JSON.stringify(literal)} but is ${JSON.stringify(value)}. Use the exact literal value.`
      });
    }

    return { valid: violations.length === 0, violations };
  }

  /**
   * Validate generic type
   */
  private validateGeneric(
    value: any,
    generic: string,
    path: string,
    paramName?: string
  ): ValidationResult {
    const violations: ContractViolation[] = [];

    // Handle Array<T>
    if (generic.startsWith('Array<')) {
      if (!Array.isArray(value)) {
        violations.push({
          type: 'input',
          paramName,
          expected: generic,
          actual: typeof value,
          message: `Expected ${generic}, got ${typeof value}`,
          path,
          severity: 'error',
          agentMessage: `Value at ${path} should be an array (${generic}) but is ${typeof value}.`
        });
      }
      return { valid: violations.length === 0, violations };
    }

    // Handle Promise<T>
    if (generic.startsWith('Promise<')) {
      if (!(value instanceof Promise)) {
        violations.push({
          type: 'input',
          paramName,
          expected: generic,
          actual: typeof value,
          message: `Expected ${generic}, got ${typeof value}`,
          path,
          severity: 'error',
          agentMessage: `Value at ${path} should be a Promise (${generic}) but is ${typeof value}.`
        });
      }
      return { valid: violations.length === 0, violations };
    }

    // Generic type parameter (e.g., 'T') - accept any
    return { valid: true, violations: [] };
  }

  /**
   * Format type definition for error messages
   */
  private formatTypeDefinition(typeDef: TypeDefinition): string {
    if (typeDef.literal !== undefined) {
      return JSON.stringify(typeDef.literal);
    }

    if (typeDef.union) {
      return typeDef.union.map(t => this.formatTypeDefinition(t)).join(' | ');
    }

    if (typeDef.generic) {
      return typeDef.generic;
    }

    let formatted = typeDef.base;
    if (typeDef.nullable) {
      formatted += ' | null';
    }

    return formatted;
  }

  /**
   * Validate constructor type
   */
  validateConstructor(
    value: any,
    constructorName: string,
    path: string = 'value',
    paramName?: string
  ): ValidationResult {
    const violations: ContractViolation[] = [];

    if (value === null || value === undefined) {
      violations.push({
        type: 'input',
        paramName,
        expected: constructorName,
        actual: value === null ? 'null' : 'undefined',
        message: `Expected instance of ${constructorName}, got ${value === null ? 'null' : 'undefined'}`,
        path,
        severity: 'error'
      });
      return { valid: false, violations };
    }

    const actualConstructor = value.constructor?.name;

    if (actualConstructor !== constructorName) {
      violations.push({
        type: 'input',
        paramName,
        expected: constructorName,
        actual: actualConstructor || 'unknown',
        message: `Expected instance of ${constructorName}, got ${actualConstructor || 'unknown'}`,
        path,
        severity: 'error',
        agentMessage: `Value at ${path} should be an instance of ${constructorName} but is ${actualConstructor || 'unknown'}.`
      });
    }

    return { valid: violations.length === 0, violations };
  }
}

/**
 * Global type validator instance
 */
let globalTypeValidator: TypeValidator | undefined;

/**
 * Get global type validator
 */
export function getGlobalTypeValidator(): TypeValidator {
  if (!globalTypeValidator) {
    globalTypeValidator = new TypeValidator();
  }
  return globalTypeValidator;
}

/**
 * Convenience function to validate type
 */
export function validateType(
  value: any,
  typeDef: TypeDefinition,
  path?: string,
  paramName?: string
): ValidationResult {
  return getGlobalTypeValidator().validate(value, typeDef, path, paramName);
}
