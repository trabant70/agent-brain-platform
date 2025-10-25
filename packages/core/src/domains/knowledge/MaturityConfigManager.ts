/**
 * MaturityConfigManager - Manages workspace maturity configuration
 *
 * Handles loading, saving, and validation of maturity context.
 * Configuration is stored in .agent-brain/maturity-config.json
 */

import { MaturityContext, DomainComplexity } from './types';

/**
 * MaturityConfigManager - Configuration persistence and validation
 */
export class MaturityConfigManager {

  /**
   * Default maturity configuration for new workspaces
   * Quadrant 13 = Mid operator, Development project (center of 5x5 grid)
   */
  static readonly DEFAULT_CONTEXT: MaturityContext = {
    complexity: DomainComplexity.STANDARD,
    quadrant: 13,  // Center of grid (Mid/Development)
    maxItems: 25
  };

  /**
   * Parse maturity configuration from JSON
   *
   * @param json - Raw JSON object
   * @returns Parsed and validated maturity context
   */
  static fromJSON(json: any): MaturityContext {
    // Ensure complexity is valid
    let complexity = json.complexity as DomainComplexity;
    if (!Object.values(DomainComplexity).includes(complexity)) {
      complexity = DomainComplexity.STANDARD;
    }

    // Ensure quadrant is valid (1-25)
    let quadrant = parseInt(json.quadrant);
    if (isNaN(quadrant) || quadrant < 1 || quadrant > 25) {
      quadrant = 13; // Default to center
    }

    // Ensure maxItems is valid
    let maxItems = json.maxItems ? parseInt(json.maxItems) : 25;
    if (isNaN(maxItems) || maxItems < 1 || maxItems > 100) {
      maxItems = 25;
    }

    return {
      complexity,
      quadrant,
      maxItems
    };
  }

  /**
   * Convert maturity configuration to JSON
   *
   * @param context - Maturity context
   * @returns JSON-serializable object
   */
  static toJSON(context: MaturityContext): any {
    return {
      complexity: context.complexity,
      quadrant: context.quadrant,
      maxItems: context.maxItems || 25
    };
  }

  /**
   * Validate maturity configuration
   *
   * @param context - Maturity context to validate
   * @returns Validation result with errors
   */
  static validate(context: MaturityContext): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate complexity
    if (!Object.values(DomainComplexity).includes(context.complexity)) {
      errors.push(`Invalid complexity: ${context.complexity}. Must be one of: simple, standard, complex.`);
    }

    // Validate quadrant (1-25 for 5x5 grid)
    if (context.quadrant < 1 || context.quadrant > 25 || !Number.isInteger(context.quadrant)) {
      errors.push(`Invalid quadrant: ${context.quadrant}. Must be an integer between 1 and 25.`);
    }

    // Validate max items (optional, but if specified must be 1-100)
    if (context.maxItems !== undefined) {
      if (context.maxItems < 1 || context.maxItems > 100 || !Number.isInteger(context.maxItems)) {
        errors.push(`Invalid maxItems: ${context.maxItems}. Must be an integer between 1 and 100.`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Merge partial context with defaults
   * Useful for updating only some fields
   *
   * @param partial - Partial context update
   * @param current - Current context (or use defaults if not provided)
   * @returns Merged context
   */
  static merge(partial: Partial<MaturityContext>, current?: MaturityContext): MaturityContext {
    const base = current || MaturityConfigManager.DEFAULT_CONTEXT;

    return {
      complexity: partial.complexity !== undefined ? partial.complexity : base.complexity,
      quadrant: partial.quadrant !== undefined ? partial.quadrant : base.quadrant,
      maxItems: partial.maxItems !== undefined ? partial.maxItems : base.maxItems
    };
  }

  /**
   * Create a safe copy of the default context
   *
   * @returns New MaturityContext with default values
   */
  static createDefault(): MaturityContext {
    return {
      ...MaturityConfigManager.DEFAULT_CONTEXT
    };
  }
}
