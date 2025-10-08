/**
 * Context Domain Types
 *
 * Minimal context system for prompt enhancement.
 * Stores project-specific rules and decisions that persist across sessions.
 */

/**
 * Context rule - a guideline or constraint for the project
 */
export interface ContextRule {
  id: string;
  rule: string;
  source: 'user' | 'learned' | 'inferred';
  confidence: number; // 0.0 to 1.0
  appliedCount: number;
  createdAt: Date;
  lastApplied?: Date;
}

/**
 * Context decision - a significant decision made during development
 */
export interface ContextDecision {
  id: string;
  decision: string;
  rationale: string;
  timestamp: Date;
  sessionId?: string;
  relatedRules?: string[]; // IDs of related rules
}

/**
 * Complete context for a project
 */
export interface Context {
  id: string;
  projectPath: string;
  rules: ContextRule[];
  decisions: ContextDecision[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Context for storage (serializable)
 */
export interface StoredContext {
  version: string;
  contexts: Record<string, Context>; // projectPath → Context
  exportedAt: Date;
}
