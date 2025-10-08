/**
 * ADR (Architectural Decision Record) Types
 * Standard format for capturing architectural decisions
 */

/**
 * Architectural Decision Record
 * Documents important architectural choices made during development
 */
export interface ADR {
  id: string;                    // adr-001, adr-002, etc.
  number: number;                // Sequential number
  timestamp: Date;

  // Standard ADR fields
  title: string;
  status: ADRStatus;
  context: string;               // The situation/problem
  decision: string;              // The decision made
  consequences: string;          // Implications of the decision

  // Additional metadata
  alternatives?: string[];       // Other options considered
  supersedes?: string;           // ADR ID this supersedes
  supersededBy?: string;         // ADR ID that supersedes this
  tags: string[];
  author: {
    name: string;
    email?: string;
  };

  // File context (optional)
  relatedFiles?: string[];       // Files this ADR relates to
  codeSnippet?: {
    file: string;
    lineStart: number;
    lineEnd: number;
    code: string;
  };
}

/**
 * ADR Status
 * Lifecycle states for architectural decisions
 */
export enum ADRStatus {
  PROPOSED = 'proposed',         // Proposed but not yet accepted
  ACCEPTED = 'accepted',         // Accepted and active
  DEPRECATED = 'deprecated',     // No longer recommended
  SUPERSEDED = 'superseded'      // Replaced by another ADR
}

/**
 * Metrics about ADRs in the system
 */
export interface ADRMetrics {
  total: number;
  byStatus: Record<ADRStatus, number>;
  byTag: Record<string, number>;
  recentADRs: ADR[];
}
