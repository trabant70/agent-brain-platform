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

/**
 * Normalized event types across all providers
 */
export enum EventType {
  // Git events
  COMMIT = 'commit',
  MERGE = 'merge',
  BRANCH_CREATED = 'branch-created',
  BRANCH_DELETED = 'branch-deleted',
  BRANCH_CHECKOUT = 'branch-checkout',
  TAG_CREATED = 'tag-created',

  // Release events
  RELEASE = 'release',
  DEPLOYMENT = 'deployment',

  // Pull request events
  PR_OPENED = 'pr-opened',
  PR_MERGED = 'pr-merged',
  PR_CLOSED = 'pr-closed',
  PR_REVIEWED = 'pr-reviewed',

  // Issue events
  ISSUE_OPENED = 'issue-opened',
  ISSUE_CLOSED = 'issue-closed',
  ISSUE_COMMENTED = 'issue-commented',

  // CI/CD events
  BUILD_SUCCESS = 'build-success',
  BUILD_FAILED = 'build-failed',
  TEST_RUN = 'test-run',

  // Custom
  CUSTOM = 'custom'
}

/**
 * Author information (normalized across providers)
 */
export interface Author {
  /** Unique identifier (email, username, or provider ID) */
  id: string;

  /** Display name */
  name: string;

  /** Email address (if available) */
  email?: string;

  /** Avatar URL (if available) */
  avatarUrl?: string;

  /** Provider-specific username */
  username?: string;
}

/**
 * Impact/change metrics
 */
export interface ImpactMetrics {
  /** Number of files changed */
  filesChanged?: number;

  /** Lines added */
  linesAdded?: number;

  /** Lines removed */
  linesRemoved?: number;

  /** Cyclomatic complexity delta (future) */
  complexityDelta?: number;

  /** Test coverage delta (future) */
  coverageDelta?: number;

  /** Custom impact score (0-100) */
  impactScore?: number;
}

/**
 * Visualization hints for renderers
 */
export interface VisualizationHints {
  /** Color (hex code) */
  color?: string;

  /** Icon name or emoji */
  icon?: string;

  /** Visual size (affects rendering) */
  size?: 'small' | 'medium' | 'large';

  /** Shape for graph rendering */
  shape?: 'circle' | 'square' | 'diamond' | 'triangle';

  /** Z-index for layering */
  priority?: number;

  /** Connection line style */
  connectionStyle?: 'solid' | 'dashed' | 'dotted';
}

/**
 * Event source information for multi-provider deduplication
 */
export interface EventSource {
  /** Provider ID that contributed this event */
  providerId: string;

  /** Source-specific event ID */
  sourceId: string;

  /** When this source discovered/created the event */
  timestamp?: Date;

  /** Source-specific metadata */
  metadata?: Record<string, unknown>;
}

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
