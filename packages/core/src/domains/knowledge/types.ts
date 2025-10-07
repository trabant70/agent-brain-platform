/**
 * Knowledge Domain Types
 *
 * Defines the structure for accumulated knowledge (patterns, ADRs, learnings).
 * This is NOT event data - it's knowledge that enhances future prompts.
 *
 * Architecture:
 * - Pure data types with zero dependencies
 * - Knowledge = accumulated wisdom from past work
 * - Used for prompt enhancement, not timeline display
 */

/**
 * Unified Knowledge container
 * Aggregates all types of knowledge for a given context
 */
export interface Knowledge {
  /** Pattern knowledge (coding patterns, anti-patterns) */
  patterns: PatternKnowledge[];

  /** ADR knowledge (architectural decisions) */
  adrs: ADRKnowledge[];

  /** Learning knowledge (lessons from experience) */
  learnings: LearningKnowledge[];
}

/**
 * Pattern Knowledge
 * Represents coding patterns, anti-patterns, and best practices
 */
export interface PatternKnowledge {
  /** Unique pattern identifier */
  id: string;

  /** Pattern name */
  name: string;

  /** Pattern description */
  description: string;

  /** Pattern category (e.g., 'error-handling', 'testing', 'architecture') */
  category: string;

  /** Severity level (for anti-patterns) */
  severity?: 'low' | 'medium' | 'high' | 'critical';

  /** How relevant this pattern is to current context (0.0-1.0) */
  relevanceScore?: number;

  /** Number of times this pattern has been detected */
  occurrences?: number;

  /** When this pattern was last detected */
  lastSeen?: Date;
}

/**
 * ADR Knowledge
 * Represents Architecture Decision Records
 */
export interface ADRKnowledge {
  /** Unique ADR identifier */
  id: string;

  /** ADR number (sequential) */
  number: number;

  /** ADR title */
  title: string;

  /** ADR status (proposed, accepted, rejected, deprecated, superseded) */
  status: 'proposed' | 'accepted' | 'rejected' | 'deprecated' | 'superseded';

  /** Date of decision */
  date: Date;

  /** Decision context (why was this needed?) */
  context: string;

  /** The decision made */
  decision: string;

  /** Consequences of the decision */
  consequences?: string;

  /** How relevant this ADR is to current context (0.0-1.0) */
  relevanceScore?: number;

  /** ADRs that supersede this one */
  supersededBy?: number[];

  /** ADRs that this supersedes */
  supersedes?: number[];
}

/**
 * Learning Knowledge
 * Represents lessons learned from experience
 */
export interface LearningKnowledge {
  /** Unique learning identifier */
  id: string;

  /** Learning name */
  name: string;

  /** Learning description */
  description: string;

  /** Learning category (e.g., 'bug-fix', 'performance', 'security') */
  category: string;

  /** Number of times this learning has been observed */
  occurrences: number;

  /** Confidence score (0.0-1.0) - how confident we are in this learning */
  confidenceScore: number;

  /** Root cause (what caused the issue?) */
  rootCause?: string;

  /** Prevention rule (how to prevent this in the future?) */
  preventionRule?: string;

  /** When this learning was last updated */
  lastUpdated?: Date;
}

/**
 * Knowledge Summary
 * High-level overview of available knowledge
 * Used for UI display and quick access
 */
export interface KnowledgeSummary {
  /** Total number of patterns */
  totalPatterns: number;

  /** Total number of ADRs */
  totalADRs: number;

  /** Total number of learnings */
  totalLearnings: number;

  /** Most recent ADRs */
  recentADRs: ADRKnowledge[];

  /** Top pattern categories with counts */
  topPatternCategories: CategoryCount[];

  /** Top learning categories with counts */
  topLearningCategories: CategoryCount[];

  /** When this summary was generated */
  lastUpdated: Date;
}

/**
 * Category count for summary statistics
 */
export interface CategoryCount {
  /** Category name */
  category: string;

  /** Number of items in this category */
  count: number;
}

/**
 * Knowledge Query Options
 * Options for filtering and searching knowledge
 */
export interface KnowledgeQueryOptions {
  /** Filter by categories */
  categories?: string[];

  /** Filter by minimum relevance score (0.0-1.0) */
  minRelevance?: number;

  /** Maximum number of results per type */
  limit?: number;

  /** Include deprecated/superseded items */
  includeDeprecated?: boolean;

  /** Sort order */
  sortBy?: 'relevance' | 'date' | 'name';
}

/**
 * Knowledge Context
 * Context information for knowledge retrieval
 * Used to find relevant knowledge for a specific situation
 */
export interface KnowledgeContext {
  /** The prompt or task description */
  prompt?: string;

  /** File paths being worked on */
  filePaths?: string[];

  /** Programming languages involved */
  languages?: string[];

  /** Error messages or issues */
  errors?: string[];

  /** Keywords or tags */
  keywords?: string[];
}
