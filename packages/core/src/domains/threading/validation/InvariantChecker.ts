/**
 * InvariantChecker
 *
 * Safely evaluates invariant expressions without using eval():
 * - Parse invariant expressions
 * - Evaluate against data
 * - Support common operations (===, >, <, &&, ||, !)
 * - Safe evaluation (no arbitrary code execution)
 */

import { ContractViolation } from '../types';
import { ValidationResult } from './TypeValidator';

/**
 * Supported operators
 */
type Operator = '===' | '!==' | '>' | '<' | '>=' | '<=' | '&&' | '||' | '!';

/**
 * Expression Node
 */
interface ExpressionNode {
  type: 'comparison' | 'logical' | 'unary' | 'literal' | 'path';
  operator?: Operator;
  left?: ExpressionNode;
  right?: ExpressionNode;
  value?: any;
  path?: string;
}

/**
 * InvariantChecker
 */
export class InvariantChecker {
  /**
   * Check invariants against data
   */
  checkInvariants(
    invariants: string[],
    data: any,
    context: string = 'invariant'
  ): ValidationResult {
    const violations: ContractViolation[] = [];

    for (const invariant of invariants) {
      try {
        const result = this.evaluateInvariant(invariant, data);

        if (!result) {
          violations.push({
            type: 'invariant',
            expected: invariant,
            actual: 'false',
            message: `Invariant failed: ${invariant}`,
            path: context,
            severity: 'error',
            agentMessage: `The invariant "${invariant}" must always be true but evaluated to false. Check the data to ensure this condition holds.`
          });
        }
      } catch (error) {
        violations.push({
          type: 'invariant',
          expected: invariant,
          actual: 'error',
          message: `Failed to evaluate invariant: ${(error as Error).message}`,
          path: context,
          severity: 'error',
          agentMessage: `Could not evaluate invariant "${invariant}": ${(error as Error).message}`
        });
      }
    }

    return { valid: violations.length === 0, violations };
  }

  /**
   * Evaluate a single invariant expression
   */
  private evaluateInvariant(expression: string, data: any): boolean {
    const trimmed = expression.trim();

    // Parse expression
    const ast = this.parseExpression(trimmed);

    // Evaluate AST
    return this.evaluateNode(ast, data);
  }

  /**
   * Parse expression into AST
   */
  private parseExpression(expr: string): ExpressionNode {
    // Handle parentheses
    if (expr.startsWith('(') && expr.endsWith(')')) {
      return this.parseExpression(expr.substring(1, expr.length - 1));
    }

    // Handle logical OR (||)
    const orIndex = this.findTopLevelOperator(expr, '||');
    if (orIndex !== -1) {
      return {
        type: 'logical',
        operator: '||',
        left: this.parseExpression(expr.substring(0, orIndex)),
        right: this.parseExpression(expr.substring(orIndex + 2))
      };
    }

    // Handle logical AND (&&)
    const andIndex = this.findTopLevelOperator(expr, '&&');
    if (andIndex !== -1) {
      return {
        type: 'logical',
        operator: '&&',
        left: this.parseExpression(expr.substring(0, andIndex)),
        right: this.parseExpression(expr.substring(andIndex + 2))
      };
    }

    // Handle unary NOT (!)
    if (expr.startsWith('!')) {
      return {
        type: 'unary',
        operator: '!',
        right: this.parseExpression(expr.substring(1))
      };
    }

    // Handle comparison operators
    const comparisonOps: Operator[] = ['===', '!==', '>=', '<=', '>', '<'];
    for (const op of comparisonOps) {
      const opIndex = this.findTopLevelOperator(expr, op);
      if (opIndex !== -1) {
        return {
          type: 'comparison',
          operator: op,
          left: this.parseExpression(expr.substring(0, opIndex)),
          right: this.parseExpression(expr.substring(opIndex + op.length))
        };
      }
    }

    // Handle literals and paths
    return this.parseLiteralOrPath(expr);
  }

  /**
   * Find top-level operator (not inside parentheses)
   */
  private findTopLevelOperator(expr: string, operator: string): number {
    let depth = 0;
    let i = 0;

    while (i < expr.length) {
      if (expr[i] === '(') {
        depth++;
      } else if (expr[i] === ')') {
        depth--;
      } else if (depth === 0 && expr.substring(i, i + operator.length) === operator) {
        return i;
      }
      i++;
    }

    return -1;
  }

  /**
   * Parse literal or path
   */
  private parseLiteralOrPath(expr: string): ExpressionNode {
    const trimmed = expr.trim();

    // Number literal
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return { type: 'literal', value: parseFloat(trimmed) };
    }

    // String literal (single or double quotes)
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return { type: 'literal', value: trimmed.substring(1, trimmed.length - 1) };
    }

    // Boolean literals
    if (trimmed === 'true') {
      return { type: 'literal', value: true };
    }
    if (trimmed === 'false') {
      return { type: 'literal', value: false };
    }

    // Null literal
    if (trimmed === 'null') {
      return { type: 'literal', value: null };
    }

    // Undefined literal
    if (trimmed === 'undefined') {
      return { type: 'literal', value: undefined };
    }

    // Otherwise, treat as path
    return { type: 'path', path: trimmed };
  }

  /**
   * Evaluate AST node
   */
  private evaluateNode(node: ExpressionNode, data: any): boolean {
    switch (node.type) {
      case 'literal':
        return this.isTruthy(node.value);

      case 'path':
        const value = this.resolvePath(node.path!, data);
        return this.isTruthy(value);

      case 'unary':
        if (node.operator === '!') {
          return !this.evaluateNode(node.right!, data);
        }
        throw new Error(`Unknown unary operator: ${node.operator}`);

      case 'logical':
        if (node.operator === '&&') {
          return this.evaluateNode(node.left!, data) && this.evaluateNode(node.right!, data);
        }
        if (node.operator === '||') {
          return this.evaluateNode(node.left!, data) || this.evaluateNode(node.right!, data);
        }
        throw new Error(`Unknown logical operator: ${node.operator}`);

      case 'comparison':
        return this.evaluateComparison(
          node.operator!,
          node.left!,
          node.right!,
          data
        );

      default:
        throw new Error(`Unknown node type: ${(node as any).type}`);
    }
  }

  /**
   * Evaluate comparison
   */
  private evaluateComparison(
    operator: Operator,
    left: ExpressionNode,
    right: ExpressionNode,
    data: any
  ): boolean {
    const leftValue = this.getNodeValue(left, data);
    const rightValue = this.getNodeValue(right, data);

    switch (operator) {
      case '===':
        return leftValue === rightValue;
      case '!==':
        return leftValue !== rightValue;
      case '>':
        return leftValue > rightValue;
      case '<':
        return leftValue < rightValue;
      case '>=':
        return leftValue >= rightValue;
      case '<=':
        return leftValue <= rightValue;
      default:
        throw new Error(`Unknown comparison operator: ${operator}`);
    }
  }

  /**
   * Get value from node
   */
  private getNodeValue(node: ExpressionNode, data: any): any {
    if (node.type === 'literal') {
      return node.value;
    }
    if (node.type === 'path') {
      return this.resolvePath(node.path!, data);
    }
    // For other node types, evaluate as boolean and return
    return this.evaluateNode(node, data);
  }

  /**
   * Resolve path in data
   */
  private resolvePath(path: string, data: any): any {
    const parts = path.split('.');
    let current = data;

    for (const part of parts) {
      // Handle array indexing
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, name, index] = arrayMatch;
        current = current?.[name]?.[parseInt(index, 10)];
      } else {
        current = current?.[part];
      }

      if (current === undefined) {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Check if value is truthy
   */
  private isTruthy(value: any): boolean {
    return !!value;
  }

  /**
   * Validate invariant syntax (static check)
   */
  validateSyntax(invariant: string): { valid: boolean; error?: string } {
    try {
      this.parseExpression(invariant.trim());
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: (error as Error).message
      };
    }
  }
}

/**
 * Global invariant checker instance
 */
let globalInvariantChecker: InvariantChecker | undefined;

/**
 * Get global invariant checker
 */
export function getGlobalInvariantChecker(): InvariantChecker {
  if (!globalInvariantChecker) {
    globalInvariantChecker = new InvariantChecker();
  }
  return globalInvariantChecker;
}

/**
 * Convenience function to check invariants
 */
export function checkInvariants(
  invariants: string[],
  data: any,
  context?: string
): ValidationResult {
  return getGlobalInvariantChecker().checkInvariants(invariants, data, context);
}
