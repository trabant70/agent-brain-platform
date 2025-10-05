/**
 * CanonicalEvent - Universal event format for the entire system
 *
 * Design Philosophy:
 * - Rich enough to represent any provider's data
 * - Specific enough to be immediately useful
 * - Extensible via metadata, but discourage overuse
 * - Preserves ALL source data to prevent loss (especially branches[])
 *
 * This is the ONLY event type used throughout the system:
 * - Providers output CanonicalEvent[]
 * - Orchestrator caches/filters CanonicalEvent[]
 * - Renderers consume CanonicalEvent[]
 *
 * NO transformations between layers - data flows unchanged.
 */

import { EventType } from './EventType';
import { Author } from './Author';
import { ImpactMetrics } from './ImpactMetrics';
import { VisualizationHints } from './VisualizationHints';
import { EventSource } from './EventSource';

/**
 * CanonicalEvent - The universal event format
 *
 * ALL data flows through the system as CanonicalEvent.
 * This prevents data loss through transformations.
 */
export interface CanonicalEvent {
  // ========================================
  // IDENTITY
  // ========================================

  /** Unique ID within provider scope */
  id: string;

  /** Globally unique ID (format: "provider-id:event-id") */
  canonicalId: string;

  /** Source provider ("git-local", "github", "jira") */
  providerId: string;

  /**
   * Multiple sources for this event (for deduplication)
   * When an event exists in multiple providers (e.g., git-local and github),
   * this array tracks all sources. Used for sync state detection.
   */
  sources?: EventSource[];

  /** Normalized event type */
  type: EventType;

  // ========================================
  // TEMPORAL
  // ========================================

  /** Event timestamp (when it occurred) */
  timestamp: Date;

  /** Optional: When this event was discovered/ingested */
  ingestedAt?: Date;

  // ========================================
  // CONTENT
  // ========================================

  /** Primary title/subject */
  title: string;

  /** Detailed description (optional) */
  description?: string;

  // ========================================
  // ATTRIBUTION
  // ========================================

  /** Primary author/actor */
  author: Author;

  /** Additional authors (merge commits, co-authors, pair programming) */
  coAuthors?: Author[];

  // ========================================
  // CONTEXT - Git-specific
  // ========================================

  /**
   * ALL branches containing this event
   * CRITICAL: This prevents the branches[] loss bug that motivated this refactor
   *
   * For git commits: All branches that contain this commit
   * For other events: Branches where this event is visible/relevant
   */
  branches: string[];

  /**
   * Primary branch (hint for default display)
   * Usually the branch where commit was authored
   */
  primaryBranch?: string;

  /** Tags associated with this event */
  tags?: string[];

  /** Commit hash (git-specific) */
  hash?: string;

  /** Full commit hash (if hash is abbreviated) */
  fullHash?: string;

  // ========================================
  // CONTEXT - External platforms
  // ========================================

  /** Pull request number (GitHub, GitLab, etc.) */
  pullRequestNumber?: number;

  /** Issue number (GitHub, JIRA, etc.) */
  issueNumber?: number;

  /** Link to external resource */
  url?: string;

  /** Platform-specific state (open, closed, merged, etc.) */
  state?: string;

  /** Labels/categories */
  labels?: string[];

  // ========================================
  // RELATIONSHIPS
  // ========================================

  /** Parent event IDs (for DAG construction) */
  parentIds: string[];

  /** Child event IDs (populated during enrichment) */
  childIds?: string[];

  /** Related events (cross-references) */
  relatedIds?: string[];

  // ========================================
  // METRICS
  // ========================================

  /** Impact/change metrics */
  impact?: ImpactMetrics;

  // ========================================
  // VISUALIZATION
  // ========================================

  /** Rendering hints (optional - computed if missing) */
  visualization?: VisualizationHints;

  // ========================================
  // EXTENSIBILITY
  // ========================================

  /**
   * Provider-specific metadata
   * Use sparingly - prefer adding typed fields above
   */
  metadata?: Record<string, unknown>;
}
