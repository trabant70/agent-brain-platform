/**
 * FixSuggester
 *
 * Analyzes violations and generates code fix suggestions:
 * - Type conversion suggestions
 * - Constraint fix patterns
 * - Regex patterns for string constraints
 * - Refactoring recommendations
 * - Example code snippets
 */

import { ContractViolation } from '../types';
import { DataContract, ConstraintDefinition } from '../contracts';

/**
 * Fix suggestion
 */
export interface FixSuggestion {
  violation: ContractViolation;
  description: string;
  codeSnippet?: string;
  explanation: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * FixSuggester
 */
export class FixSuggester {
  /**
   * Generate fix suggestions for a violation
   */
  suggest(violation: ContractViolation): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    switch (violation.type) {
      case 'input':
        suggestions.push(...this.suggestInputFixes(violation));
        break;
      case 'output':
        suggestions.push(...this.suggestOutputFixes(violation));
        break;
      case 'precondition':
        suggestions.push(...this.suggestPreconditionFixes(violation));
        break;
      case 'postcondition':
        suggestions.push(...this.suggestPostconditionFixes(violation));
        break;
      case 'invariant':
        suggestions.push(...this.suggestInvariantFixes(violation));
        break;
    }

    return suggestions;
  }

  /**
   * Generate fix suggestions for all violations
   */
  suggestAll(violations: ContractViolation[]): FixSuggestion[] {
    const allSuggestions: FixSuggestion[] = [];

    for (const violation of violations) {
      allSuggestions.push(...this.suggest(violation));
    }

    return allSuggestions;
  }

  /**
   * Suggest input fixes
   */
  private suggestInputFixes(violation: ContractViolation): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    // Type conversion suggestions
    if (this.isTypeMismatch(violation)) {
      suggestions.push(this.suggestTypeConversion(violation));
    }

    // String pattern suggestions
    if (this.isStringPatternMismatch(violation)) {
      suggestions.push(this.suggestStringPattern(violation));
    }

    // Numeric range suggestions
    if (this.isNumericRangeViolation(violation)) {
      suggestions.push(this.suggestNumericRange(violation));
    }

    // Array constraint suggestions
    if (this.isArrayConstraintViolation(violation)) {
      suggestions.push(this.suggestArrayConstraint(violation));
    }

    // Missing required field
    if (this.isMissingRequiredField(violation)) {
      suggestions.push(this.suggestAddField(violation));
    }

    return suggestions;
  }

  /**
   * Suggest output fixes
   */
  private suggestOutputFixes(violation: ContractViolation): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    // Return type mismatch
    if (this.isTypeMismatch(violation)) {
      suggestions.push({
        violation,
        description: 'Fix return type',
        codeSnippet: this.generateReturnTypeSnippet(violation),
        explanation: `The function returns ${violation.actual} but should return ${violation.expected}. Ensure the return statement produces the correct type.`,
        priority: 'high'
      });
    }

    return suggestions;
  }

  /**
   * Suggest precondition fixes
   */
  private suggestPreconditionFixes(violation: ContractViolation): FixSuggestion[] {
    return [{
      violation,
      description: 'Add precondition check',
      codeSnippet: this.generatePreconditionSnippet(violation),
      explanation: `Add validation at the start of the function to ensure: ${violation.expected}`,
      priority: 'high'
    }];
  }

  /**
   * Suggest postcondition fixes
   */
  private suggestPostconditionFixes(violation: ContractViolation): FixSuggestion[] {
    return [{
      violation,
      description: 'Ensure postcondition',
      codeSnippet: this.generatePostconditionSnippet(violation),
      explanation: `Ensure the function guarantees: ${violation.expected}`,
      priority: 'high'
    }];
  }

  /**
   * Suggest invariant fixes
   */
  private suggestInvariantFixes(violation: ContractViolation): FixSuggestion[] {
    return [{
      violation,
      description: 'Maintain invariant',
      explanation: `The invariant "${violation.expected}" must always hold. Review the function logic to ensure this condition is maintained throughout execution.`,
      priority: 'critical'
    }];
  }

  /**
   * Check if violation is a type mismatch
   */
  private isTypeMismatch(violation: ContractViolation): boolean {
    return violation.message.toLowerCase().includes('type') ||
           violation.message.toLowerCase().includes('expected') &&
           violation.expected !== violation.actual;
  }

  /**
   * Check if violation is a string pattern mismatch
   */
  private isStringPatternMismatch(violation: ContractViolation): boolean {
    return violation.message.toLowerCase().includes('pattern') ||
           violation.message.toLowerCase().includes('match');
  }

  /**
   * Check if violation is a numeric range violation
   */
  private isNumericRangeViolation(violation: ContractViolation): boolean {
    return violation.message.toLowerCase().includes('minimum') ||
           violation.message.toLowerCase().includes('maximum') ||
           violation.message.toLowerCase().includes('range');
  }

  /**
   * Check if violation is an array constraint violation
   */
  private isArrayConstraintViolation(violation: ContractViolation): boolean {
    return violation.message.toLowerCase().includes('array') ||
           violation.message.toLowerCase().includes('items');
  }

  /**
   * Check if violation is a missing required field
   */
  private isMissingRequiredField(violation: ContractViolation): boolean {
    return violation.message.toLowerCase().includes('required') &&
           violation.message.toLowerCase().includes('missing');
  }

  /**
   * Suggest type conversion
   */
  private suggestTypeConversion(violation: ContractViolation): FixSuggestion {
    const { expected, actual, path } = violation;

    let codeSnippet = '';
    let explanation = '';

    // Number conversions
    if (expected === 'number' && actual === 'string') {
      codeSnippet = `const value = Number(${path}) // or parseInt(${path}, 10) or parseFloat(${path})`;
      explanation = 'Convert string to number using Number(), parseInt(), or parseFloat()';
    } else if (expected === 'string' && actual === 'number') {
      codeSnippet = `const value = String(${path}) // or ${path}.toString()`;
      explanation = 'Convert number to string using String() or .toString()';
    } else if (expected === 'boolean' && actual === 'string') {
      codeSnippet = `const value = ${path} === 'true'`;
      explanation = 'Convert string to boolean by comparison';
    } else if (expected === 'array' && actual !== 'array') {
      codeSnippet = `const value = Array.isArray(${path}) ? ${path} : [${path}]`;
      explanation = 'Wrap non-array value in an array';
    } else {
      codeSnippet = `const value: ${expected} = ${path} as ${expected}`;
      explanation = `Cast ${actual} to ${expected} (use with caution)`;
    }

    return {
      violation,
      description: `Convert ${actual} to ${expected}`,
      codeSnippet,
      explanation,
      priority: 'high'
    };
  }

  /**
   * Suggest string pattern fix
   */
  private suggestStringPattern(violation: ContractViolation): FixSuggestion {
    const pattern = this.extractPattern(violation.expected);

    return {
      violation,
      description: 'Fix string pattern',
      codeSnippet: `if (!/${pattern}/.test(value)) {\n  throw new Error('Invalid format');\n}`,
      explanation: `Ensure the string matches the pattern: ${pattern}`,
      priority: 'medium'
    };
  }

  /**
   * Suggest numeric range fix
   */
  private suggestNumericRange(violation: ContractViolation): FixSuggestion {
    const { expected, actual } = violation;

    let codeSnippet = '';

    if (expected.includes('>=')) {
      const min = this.extractNumber(expected);
      codeSnippet = `if (value < ${min}) {\n  value = ${min}; // or throw error\n}`;
    } else if (expected.includes('<=')) {
      const max = this.extractNumber(expected);
      codeSnippet = `if (value > ${max}) {\n  value = ${max}; // or throw error\n}`;
    } else {
      codeSnippet = `// Adjust value to be within range: ${expected}`;
    }

    return {
      violation,
      description: 'Fix numeric range',
      codeSnippet,
      explanation: `Ensure the number is within the expected range: ${expected}`,
      priority: 'medium'
    };
  }

  /**
   * Suggest array constraint fix
   */
  private suggestArrayConstraint(violation: ContractViolation): FixSuggestion {
    const { expected } = violation;

    let codeSnippet = '';

    if (expected.includes('minItems')) {
      const min = this.extractNumber(expected);
      codeSnippet = `while (array.length < ${min}) {\n  array.push(defaultValue);\n}`;
    } else if (expected.includes('maxItems')) {
      const max = this.extractNumber(expected);
      codeSnippet = `if (array.length > ${max}) {\n  array = array.slice(0, ${max});\n}`;
    } else if (expected.includes('unique')) {
      codeSnippet = `const uniqueArray = [...new Set(array)];`;
    }

    return {
      violation,
      description: 'Fix array constraint',
      codeSnippet,
      explanation: `Ensure the array meets the constraint: ${expected}`,
      priority: 'medium'
    };
  }

  /**
   * Suggest adding field
   */
  private suggestAddField(violation: ContractViolation): FixSuggestion {
    const fieldName = this.extractFieldName(violation.expected);

    return {
      violation,
      description: `Add required field: ${fieldName}`,
      codeSnippet: `const obj = {\n  ...existingObject,\n  ${fieldName}: /* value */\n};`,
      explanation: `The field "${fieldName}" is required but missing. Add it to the object.`,
      priority: 'high'
    };
  }

  /**
   * Generate return type snippet
   */
  private generateReturnTypeSnippet(violation: ContractViolation): string {
    const { expected } = violation;
    return `// Ensure function returns: ${expected}\nreturn value as ${expected};`;
  }

  /**
   * Generate precondition snippet
   */
  private generatePreconditionSnippet(violation: ContractViolation): string {
    const { expected } = violation;
    return `if (!(${expected})) {\n  throw new Error('Precondition failed: ${expected}');\n}`;
  }

  /**
   * Generate postcondition snippet
   */
  private generatePostconditionSnippet(violation: ContractViolation): string {
    const { expected } = violation;
    return `// Before returning, ensure:\n// ${expected}\nif (!(${expected})) {\n  throw new Error('Postcondition failed');\n}`;
  }

  /**
   * Extract pattern from expected string
   */
  private extractPattern(expected: string): string {
    const match = expected.match(/pattern\s+(.+)/);
    return match ? match[1] : expected;
  }

  /**
   * Extract number from string
   */
  private extractNumber(text: string): number {
    const match = text.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  /**
   * Extract field name from expected string
   */
  private extractFieldName(expected: string): string {
    const match = expected.match(/field\s+"([^"]+)"/);
    return match ? match[1] : 'field';
  }
}

/**
 * Global fix suggester instance
 */
let globalFixSuggester: FixSuggester | undefined;

/**
 * Get global fix suggester
 */
export function getGlobalFixSuggester(): FixSuggester {
  if (!globalFixSuggester) {
    globalFixSuggester = new FixSuggester();
  }
  return globalFixSuggester;
}

/**
 * Convenience function to suggest fixes
 */
export function suggestFixes(violations: ContractViolation[]): FixSuggestion[] {
  return getGlobalFixSuggester().suggestAll(violations);
}
