/**
 * Enhancement Types
 *
 * Types for the prompt enhancement system
 */

export interface EnhancementContext {
  /** Current file being worked on */
  currentFile?: string;

  /** Recent errors encountered */
  recentErrors?: string[];

  /** Test failures */
  testFailures?: string[];

  /** Known patterns to follow */
  patterns?: string[];

  /** Project constraints */
  constraints?: string[];

  /** Last noun mentioned (for pronoun expansion) */
  lastNoun?: string;

  /** Current focus (for "this" expansion) */
  currentFocus?: string;

  /** Last thing mentioned (for "that" expansion) */
  lastMentioned?: string;

  /** Current location (for "there" expansion) */
  currentLocation?: string;

  /** Target AI agent */
  targetAgent?: 'claude' | 'copilot' | 'cursor' | 'unknown';

  /** Files in the project */
  files?: string[];

  /** Last working commit */
  lastWorkingCommit?: string;

  /** Recent changes */
  recentChanges?: string;

  /** Test coverage info */
  testCoverage?: string;

  /** Project type (from profile wizard) - Phase 3 */
  projectType?: 'web-app' | 'cli-tool' | 'library' | 'mobile-app' | 'api-service';

  /** Primary programming language */
  language?: string;

  /** Framework being used */
  framework?: string;
}

export interface EnhancedPrompt {
  /** Original user prompt */
  original: string;

  /** Enhanced version with context */
  enhanced: string;

  /** Which enhancement stage was used */
  stage: number;

  /** Number of knowledge items used */
  itemsUsed: number;

  /** Context that was applied */
  context: EnhancementContext;

  /** Success pattern IDs applied (Stage 4+) - Phase 3 */
  successPatternsApplied?: string[];

  /** Stage 5 metadata (planning enforcement) */
  stage5Metadata?: import('../expertise/types').Stage5Metadata;
}
