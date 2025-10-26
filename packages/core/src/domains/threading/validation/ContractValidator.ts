/**
 * ContractValidator
 *
 * Main validator that orchestrates all validation:
 * - Type validation
 * - Shape validation
 * - Constraint validation
 * - Invariant checking
 * - Precondition/postcondition validation
 */

import { DataContract, ContractExpectations, ContractProductions } from '../contracts';
import { ContractViolation } from '../types';
import { TypeValidator, ValidationResult } from './TypeValidator';
import { ShapeValidator } from './ShapeValidator';
import { ConstraintValidator } from './ConstraintValidator';
import { InvariantChecker } from './InvariantChecker';

/**
 * ContractValidator
 */
export class ContractValidator {
  private typeValidator: TypeValidator;
  private shapeValidator: ShapeValidator;
  private constraintValidator: ConstraintValidator;
  private invariantChecker: InvariantChecker;

  constructor(
    typeValidator?: TypeValidator,
    shapeValidator?: ShapeValidator,
    constraintValidator?: ConstraintValidator,
    invariantChecker?: InvariantChecker
  ) {
    this.typeValidator = typeValidator || new TypeValidator();
    this.shapeValidator = shapeValidator || new ShapeValidator(this.typeValidator);
    this.constraintValidator = constraintValidator || new ConstraintValidator();
    this.invariantChecker = invariantChecker || new InvariantChecker();
  }

  /**
   * Validate value against data contract
   */
  validateContract(
    value: any,
    contract: DataContract,
    path: string = 'value',
    paramName?: string
  ): ValidationResult {
    const violations: ContractViolation[] = [];

    // 1. Validate type
    if (contract.type) {
      const typeResult = typeof contract.type === 'string'
        ? this.validateStringType(value, contract.type, path, paramName)
        : this.typeValidator.validate(value, contract.type, path, paramName);

      violations.push(...typeResult.violations);

      // If type validation failed, don't continue with shape/constraints
      if (!typeResult.valid) {
        return { valid: false, violations };
      }
    }

    // 2. Validate shape (for objects)
    if (contract.shape) {
      const shapeResult = this.shapeValidator.validate(value, contract.shape, path, paramName);
      violations.push(...shapeResult.violations);
    }

    // 3. Validate constraints
    if (contract.constraints) {
      const constraintResult = this.constraintValidator.validate(
        value,
        contract.constraints,
        path,
        paramName
      );
      violations.push(...constraintResult.violations);
    }

    return { valid: violations.length === 0, violations };
  }

  /**
   * Validate string type
   */
  private validateStringType(
    value: any,
    type: string,
    path: string,
    paramName?: string
  ): ValidationResult {
    const violations: ContractViolation[] = [];
    const actualType = typeof value;

    if (type === 'array') {
      if (!Array.isArray(value)) {
        violations.push({
          type: 'input',
          paramName,
          expected: 'array',
          actual: actualType,
          message: `Expected array, got ${actualType}`,
          path,
          severity: 'error'
        });
      }
    } else if (actualType !== type) {
      violations.push({
        type: 'input',
        paramName,
        expected: type,
        actual: actualType,
        message: `Expected ${type}, got ${actualType}`,
        path,
        severity: 'error'
      });
    }

    return { valid: violations.length === 0, violations };
  }

  /**
   * Validate input expectations
   */
  validateInputs(
    args: any[],
    expectations: ContractExpectations,
    context: string = 'function'
  ): ValidationResult {
    const violations: ContractViolation[] = [];

    // Validate parameters
    if (expectations.params) {
      for (const [paramName, contract] of Object.entries(expectations.params)) {
        // Find parameter by name (for now, we use index from name like 'arg0', 'arg1', etc.)
        const paramIndex = this.extractParamIndex(paramName);
        const value = paramIndex !== -1 ? args[paramIndex] : undefined;

        const result = this.validateContract(
          value,
          contract,
          `args[${paramIndex}]`,
          paramName
        );

        violations.push(...result.violations);
      }
    }

    // Check preconditions
    if (expectations.preconditions) {
      const preconditionData = { args };
      const result = this.invariantChecker.checkInvariants(
        expectations.preconditions,
        preconditionData,
        `${context}.preconditions`
      );

      violations.push(...result.violations);
    }

    return { valid: violations.length === 0, violations };
  }

  /**
   * Validate output productions
   */
  validateOutputs(
    result: any,
    args: any[],
    thisContext: any,
    productions: ContractProductions,
    context: string = 'function'
  ): ValidationResult {
    const violations: ContractViolation[] = [];

    // Validate return value
    if (productions.returns) {
      const returnResult = this.validateContract(
        result,
        productions.returns,
        'result',
        'return'
      );

      violations.push(...returnResult.violations);
    }

    // Check postconditions
    if (productions.postconditions) {
      const postconditionData = { args, result, this: thisContext };
      const postconditionResult = this.invariantChecker.checkInvariants(
        productions.postconditions,
        postconditionData,
        `${context}.postconditions`
      );

      violations.push(...postconditionResult.violations);
    }

    return { valid: violations.length === 0, violations };
  }

  /**
   * Validate invariants
   */
  validateInvariants(
    invariants: string[],
    data: any,
    context: string = 'invariants'
  ): ValidationResult {
    return this.invariantChecker.checkInvariants(invariants, data, context);
  }

  /**
   * Extract parameter index from parameter name
   * Supports formats: 'arg0', 'arg1', 'param0', 'param1', or numeric strings
   */
  private extractParamIndex(paramName: string): number {
    // Try extracting from 'arg0', 'arg1', etc.
    const argMatch = paramName.match(/^arg(\d+)$/i);
    if (argMatch) {
      return parseInt(argMatch[1], 10);
    }

    // Try extracting from 'param0', 'param1', etc.
    const paramMatch = paramName.match(/^param(\d+)$/i);
    if (paramMatch) {
      return parseInt(paramMatch[1], 10);
    }

    // Try direct number
    const numMatch = paramName.match(/^(\d+)$/);
    if (numMatch) {
      return parseInt(numMatch[1], 10);
    }

    // Return -1 if no match (parameter not found)
    return -1;
  }

  /**
   * Validate record of contracts (for multiple parameters)
   */
  validateRecord(
    values: Record<string, any>,
    contracts: Record<string, DataContract>,
    basePath: string = ''
  ): ValidationResult {
    const violations: ContractViolation[] = [];

    for (const [key, contract] of Object.entries(contracts)) {
      const value = values[key];
      const path = basePath ? `${basePath}.${key}` : key;

      const result = this.validateContract(value, contract, path, key);
      violations.push(...result.violations);
    }

    return { valid: violations.length === 0, violations };
  }
}

/**
 * Global contract validator instance
 */
let globalContractValidator: ContractValidator | undefined;

/**
 * Get global contract validator
 */
export function getGlobalContractValidator(): ContractValidator {
  if (!globalContractValidator) {
    globalContractValidator = new ContractValidator();
  }
  return globalContractValidator;
}

/**
 * Convenience function to validate contract
 */
export function validateContract(
  value: any,
  contract: DataContract,
  path?: string,
  paramName?: string
): ValidationResult {
  return getGlobalContractValidator().validateContract(value, contract, path, paramName);
}

/**
 * Convenience function to validate inputs
 */
export function validateInputs(
  args: any[],
  expectations: ContractExpectations,
  context?: string
): ValidationResult {
  return getGlobalContractValidator().validateInputs(args, expectations, context);
}

/**
 * Convenience function to validate outputs
 */
export function validateOutputs(
  result: any,
  args: any[],
  thisContext: any,
  productions: ContractProductions,
  context?: string
): ValidationResult {
  return getGlobalContractValidator().validateOutputs(result, args, thisContext, productions, context);
}
