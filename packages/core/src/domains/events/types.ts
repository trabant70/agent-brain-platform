/**
 * Supporting types for the event system
 */

import { EventType } from './EventType';
import { CanonicalEvent } from './CanonicalEvent';

/**
 * Filter options derived from CanonicalEvent data
 * Computed by analyzing events[], not fetched separately
 */
export interface FilterOptions {
  /** Available branches (from events[].branches, flattened and deduplicated) */
  branches: string[];

  /** Available authors (from events[].author.name + coAuthors) */
  authors: string[];

  /** Available event types (from events[].type) */
  eventTypes: EventType[];

  /** Available providers (from events[].providerId) */
  providers: string[];

  /** Date range (from events[].timestamp) */
  dateRange: {
    earliest: Date;
    latest: Date;
  };

  /** Available tags (from events[].tags) */
  tags?: string[];

  /** Available labels (from events[].labels) */
  labels?: string[];
}

/**
 * Active filter state - Unified Selection Model
 *
 * ALL filters use explicit selection (undefined = show all)
 * Applied with AND logic: event must match ALL specified criteria
 *
 * Multi-Provider Ready:
 * - GitHub API events (PRs, issues, releases)
 * - Agent-brain events (analysis, insights)
 * - Git local events (commits, branches, tags)
 */
export interface FilterState {
  /** Selected branches (undefined = all branches) */
  branches?: string[];
  selectedBranches?: string[];

  /** Selected authors (undefined = all authors) */
  authors?: string[];
  selectedAuthors?: string[];

  /** Excluded event types (LEGACY - exclusion model) */
  excludedEventTypes?: EventType[];

  /** Selected event types (undefined = all types) - INCLUSION MODEL */
  selectedEventTypes?: EventType[];

  /** Selected providers (undefined = all providers) */
  providers?: string[];
  selectedProviders?: string[];

  /** Date range filter */
  dateRange?: {
    start: Date;
    end: Date;
  };

  /** Search query (filter by title/description) */
  searchQuery?: string;

  /** Selected tags (undefined = all tags) */
  tags?: string[];
  selectedTags?: string[];

  /** Selected labels (undefined = all labels) */
  selectedLabels?: string[];

  // ==========================================
  // CONFIGURATION SETTINGS (Non-Filter State)
  // These settings are persisted per repository but don't affect filtering
  // ==========================================

  /** Color mode for timeline visualization */
  colorMode?: 'semantic' | 'sync-state';

  /** Enabled data providers (undefined = use defaults: git-local enabled, others disabled) */
  enabledProviders?: string[];

  /** Show connection lines between events (default: true) */
  showConnections?: boolean;

  /** Time window slider state (range selector) */
  timeWindow?: {
    start: Date | string;
    end: Date | string;
  };
}

/**
 * Cached repository data
 */
export interface CachedRepoData {
  /** Repository path (unique identifier) */
  repoPath: string;

  /** All events from all providers for this repo */
  events: CanonicalEvent[];

  /** When data was fetched */
  fetchedAt: Date;

  /** Filter options computed from events */
  filterOptions: FilterOptions;
}

/**
 * Provider context - minimal information needed to fetch events
 */
export interface ProviderContext {
  /** Repository path or workspace root */
  repoPath?: string;

  /** Workspace folder path */
  workspaceRoot?: string;

  /** Active file path (for context detection) */
  activeFile?: string;

  /** Additional context */
  [key: string]: any;
}

/**
 * Provider capabilities (unchanged from existing architecture)
 */
export interface ProviderCapabilities {
  supportsRealTimeUpdates: boolean;
  supportsHistoricalData: boolean;
  supportsFiltering: boolean;
  supportsSearch: boolean;
  supportsAuthentication: boolean;
  supportsWriteOperations: boolean;
  supportedEventTypes: EventType[];
}

/**
 * Provider configuration (unchanged from existing architecture)
 */
export interface ProviderConfig {
  enabled: boolean;
  priority?: number;
  settings?: Record<string, any>;
}

/**
 * ===================================================================
 * KNOWLEDGE EVENT TYPES
 * ===================================================================
 * Data structures for tracking knowledge-related events:
 * - When users apply/remove knowledge items to guide coding agents
 * - When coding agents create new knowledge items (learnings, patterns)
 *
 * These events are stored in `.agent-brain/events/knowledge-events.json`
 */

/**
 * Type of knowledge event operation
 */
export type KnowledgeEventOperation = 'apply' | 'remove' | 'create';

/**
 * Actor who triggered the event
 */
export type KnowledgeEventActor = 'user' | 'agent';

/**
 * Knowledge event record as stored in JSON file
 *
 * @example
 * ```json
 * {
 *   "id": "ke-1729518900000",
 *   "timestamp": "2025-10-21T14:35:00.000Z",
 *   "type": "apply",
 *   "knowledgeItemId": "golden-path-oauth",
 *   "knowledgeItemTitle": "OAuth Golden Path",
 *   "knowledgeItemType": "golden-path",
 *   "targetFile": "CLAUDE.md",
 *   "actor": "user"
 * }
 * ```
 */
export interface KnowledgeEventRecord {
    /**
     * Unique identifier (timestamp-based)
     * Format: "ke-{milliseconds}"
     */
    id: string;

    /**
     * Event timestamp (ISO 8601 format)
     */
    timestamp: string;

    /**
     * Type of operation performed
     */
    type: KnowledgeEventOperation;

    /**
     * ID of the knowledge item involved
     */
    knowledgeItemId: string;

    /**
     * Title of the knowledge item (denormalized for display)
     */
    knowledgeItemTitle: string;

    /**
     * Type of knowledge item (e.g., "golden-path", "learning", "pattern")
     */
    knowledgeItemType: string;

    /**
     * Target file path where the operation occurred
     * - For apply/remove: Usually "CLAUDE.md"
     * - For create: Path to the created .md file
     */
    targetFile: string;

    /**
     * Who triggered the event
     */
    actor: KnowledgeEventActor;
}

/**
 * Structure of the knowledge-events.json file
 */
export interface KnowledgeEventsFile {
    /**
     * File format version
     */
    version: string;

    /**
     * Array of knowledge events
     */
    events: KnowledgeEventRecord[];
}

/**
 * Parameters for recording a new knowledge event
 * (id and timestamp are auto-generated)
 */
export type RecordKnowledgeEventParams = Omit<KnowledgeEventRecord, 'id' | 'timestamp'>;
