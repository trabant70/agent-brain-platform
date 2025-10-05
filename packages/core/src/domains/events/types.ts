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
