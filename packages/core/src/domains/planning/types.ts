/**
 * Planning Domain Types
 *
 * Types for enforcing structured planning before coding
 */

import type {
  PlanningTemplate,
  PlanningSection,
  PlanValidationResult
} from '../expertise/types';

// Re-export planning-related types from expertise
// (They're defined there because they're part of ExpertisePackage)
export type {
  PlanningTemplate,
  PlanningSection,
  PlanValidationResult
};

/**
 * Context for planning
 */
export interface PlanningContext {
  /** User prompt */
  prompt: string;

  /** Project type */
  projectType?: string;

  /** Programming language */
  language?: string;

  /** Framework */
  framework?: string;

  /** Task type (if detected) */
  taskType?: string;
}

/**
 * Enhanced Prompt with Planning
 */
export interface EnhancedPromptWithPlan {
  /** Original prompt */
  prompt: string;

  /** Is planning required? */
  planningRequired: boolean;

  /** Template ID (if planning required) */
  template?: string;

  /** Validator function (if planning required) */
  validator?: (response: string) => PlanValidationResult;
}
