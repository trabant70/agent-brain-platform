/**
 * Data Contract System for Threading
 *
 * Provides comprehensive type, shape, and constraint definitions for runtime validation
 */

/**
 * Type Definition
 * Describes the type of a value including primitives, objects, arrays, unions, etc.
 */
export interface TypeDefinition {
  base: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null' | 'undefined' | 'any';
  nullable?: boolean;           // Can be null
  union?: TypeDefinition[];      // Union types (e.g., string | number)
  literal?: any;                // Literal types (e.g., 'success' | 'failure')
  generic?: string;             // Generic types (e.g., 'T', 'Array<T>')
}

/**
 * Field Definition
 * Describes a single field in an object shape
 */
export interface FieldDefinition {
  type: string | TypeDefinition;
  required?: boolean;
  default?: any;
  description?: string;
  constraints?: ConstraintDefinition;
}

/**
 * Shape Definition
 * Describes the structure of an object
 */
export interface ShapeDefinition {
  [key: string]: FieldDefinition;
}

/**
 * Constraint Definition
 * Defines validation rules for values
 */
export interface ConstraintDefinition {
  // Numeric constraints
  min?: number;
  max?: number;
  range?: [number, number];
  precision?: number;

  // String constraints
  pattern?: RegExp | string;
  minLength?: number;
  maxLength?: number;
  enum?: any[];

  // Array constraints
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  itemType?: string | TypeDefinition;

  // Custom validators
  validate?: (value: any) => boolean | string;  // Return true or error message
  invariants?: string[];                         // Expressions that must evaluate to true
}

/**
 * Transformation Rule
 * Describes how data flows from one location to another
 */
export interface TransformationRule {
  from: string | string[];      // Source path(s)
  to: string | string[];        // Destination path(s)
  transform?: (value: any) => any;  // Optional transformation function
  relationship?: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  preserves?: string[];         // Properties that should be preserved
  validates?: string[];         // Validation rules for transformation
}

/**
 * Transformation Rules
 * Collection of named transformation rules
 */
export interface TransformationRules {
  [key: string]: TransformationRule;
}

/**
 * Data Contract
 * Complete specification of data type, shape, constraints, and transformations
 */
export interface DataContract {
  type: string | TypeDefinition;
  shape?: ShapeDefinition;
  constraints?: ConstraintDefinition;
  transformations?: TransformationRules;
  examples?: any[];
}

/**
 * Contract Expectations
 * What data is expected as input
 */
export interface ContractExpectations {
  params?: Record<string, DataContract>;        // Function parameters
  context?: Record<string, DataContract>;       // Expected context state
  preconditions?: string[];                     // Conditions that must be true before execution
}

/**
 * Contract Productions
 * What data is produced as output
 */
export interface ContractProductions {
  returns?: DataContract;                       // Return value
  mutations?: Record<string, DataContract>;     // Side effects on context
  postconditions?: string[];                    // Conditions that must be true after execution
}

/**
 * Data Flow Contract
 * Describes how data flows through a function
 */
export interface DataFlowContract {
  transformations?: TransformationRules;
  preserves?: string[];         // Data that should remain unchanged
  sanitizes?: string[];         // Data that should be cleaned/validated
}

/**
 * Enhanced Thread Spec Options
 * Extends ThreadSpecOptions with comprehensive data contracts
 */
export interface EnhancedThreadSpecOptions {
  // Thread participation
  threads: string[];

  // Performance expectations (existing)
  timing?: {
    min?: number;
    max?: number;
    unit?: 'ms' | 's';
  };
  memory?: {
    max?: number;
    unit?: 'MB' | 'KB';
  };

  // Legacy support (backward compatibility)
  input?: {
    type?: string;
    shape?: string;
    validate?: (value: any) => boolean;
  };
  output?: {
    type?: string;
    shape?: string;
    validate?: (value: any) => boolean;
  };
  tags?: string[];
  critical?: boolean;

  // NEW: Enhanced data contracts
  expects?: ContractExpectations;
  produces?: ContractProductions;
  dataFlow?: DataFlowContract;

  // Invariants that must always hold
  invariants?: string[];

  // Example input/output pairs for validation
  examples?: Array<{
    input: any[];
    output: any;
    description?: string;
  }>;
}

/**
 * Helper: Create simple type definition
 */
export function createType(
  base: TypeDefinition['base'],
  options?: { nullable?: boolean; }
): TypeDefinition {
  return {
    base,
    ...options
  };
}

/**
 * Helper: Create union type
 */
export function createUnion(...types: TypeDefinition[]): TypeDefinition {
  return {
    base: 'any',
    union: types
  };
}

/**
 * Helper: Create literal type
 */
export function createLiteral(value: any): TypeDefinition {
  return {
    base: typeof value as TypeDefinition['base'],
    literal: value
  };
}

/**
 * Helper: Create object shape
 */
export function createShape(fields: ShapeDefinition): DataContract {
  return {
    type: { base: 'object' },
    shape: fields
  };
}

/**
 * Helper: Create array contract
 */
export function createArray(itemType: string | TypeDefinition): DataContract {
  return {
    type: { base: 'array' },
    constraints: {
      itemType
    }
  };
}

/**
 * Helper: Create string contract with pattern
 */
export function createString(pattern?: RegExp | string, options?: { minLength?: number; maxLength?: number; }): DataContract {
  return {
    type: { base: 'string' },
    constraints: {
      pattern,
      ...options
    }
  };
}

/**
 * Helper: Create number contract with range
 */
export function createNumber(min?: number, max?: number): DataContract {
  return {
    type: { base: 'number' },
    constraints: {
      min,
      max
    }
  };
}
