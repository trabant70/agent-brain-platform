# API Documentation - Repository Timeline Extension

**Version:** 0.4.66
**Last Updated:** 2025-10-04
**Architecture:** Simplified Canonical Event with Dual Color Modes and Pathway Testing

---

## Table of Contents

- [Core Domain](#core-domain)
  - [CanonicalEvent](#canonicalevent)
  - [EventType](#eventtype)
  - [FilterState](#filterstate)
- [Timeline Domain](#timeline-domain)
  - [GitEvent](#gitevent)
  - [GitEventRelationship](#giteventrelationship)
  - [Error Types](#error-types)
- [Data Layer](#data-layer)
  - [IDataProvider](#idataprovider)
  - [GitEventRepository](#giteventrepository)
  - [GitProvider](#gitprovider)
  - [GitHubProvider](#githubprovider)
  - [GitHubClient](#githubclient)
  - [RateLimitManager](#ratelimitmanager)
- [Orchestration Layer](#orchestration-layer)
  - [DataOrchestrator](#dataorchestrator)
  - [ProviderRegistry](#providerregistry)
  - [FilterStateManager](#filterstatemanager)
- [Analysis Layer](#analysis-layer)
  - [MergeAnalyzer](#mergeanalyzer)
  - [BranchAnalyzer](#branchanalyzer)
- [Visualization Layer](#visualization-layer)
  - [ITimelineRenderer](#itimelinerenderer)
  - [D3TimelineRenderer](#d3timelinerenderer)
  - [TimelineDataManager](#timelinedatamanager)
  - [EventVisualTheme](#eventvisualtheme)
- [UI Layer](#ui-layer)
  - [FilterController](#filtercontroller)
  - [IUIController](#iuicontroller)
- [Webview Layer](#webview-layer)
  - [SimpleTimelineApp](#simpletimelineapp)
  - [TimelineProvider](#timelineprovider)
- [Extension Layer](#extension-layer)
  - [Extension Activation](#extension-activation)
  - [WelcomeViewProvider](#welcomeviewprovider)
- [Utilities](#utilities)
  - [Logger](#logger)
  - [WebviewLogger](#webviewlogger)
- [Feature Management](#feature-management)
  - [FeatureFlagManager](#featureflagmanager)
  - [EventMatcher](#eventmatcher)

---

## Core Domain

### CanonicalEvent

**Purpose**: Universal event format for the entire system. All data flows through the system as CanonicalEvent to prevent data loss through transformations.

**File**: `src/core/CanonicalEvent.ts`

#### Interface Definition

```typescript
interface CanonicalEvent {
  // Identity
  id: string;                      // Unique ID within provider scope
  canonicalId: string;             // Globally unique ID (format: "provider-id:event-id")
  providerId: string;              // Source provider ("git-local", "github", "jira")
  sources?: EventSource[];         // Multiple sources for multi-provider deduplication
  type: EventType;                 // Normalized event type

  // Temporal
  timestamp: Date;                 // Event timestamp (when it occurred)
  ingestedAt?: Date;              // When this event was discovered/ingested

  // Content
  title: string;                   // Primary title/subject
  description?: string;            // Detailed description

  // Attribution
  author: Author;                  // Primary author/actor
  coAuthors?: Author[];           // Additional authors (merge commits, co-authors)

  // Context - Git-specific
  branches: string[];              // ALL branches containing this event
  primaryBranch?: string;          // Primary branch (hint for default display)
  tags?: string[];                 // Tags associated with this event
  hash?: string;                   // Commit hash
  fullHash?: string;              // Full commit hash (if hash is abbreviated)

  // Context - External platforms
  pullRequestNumber?: number;      // Pull request number
  issueNumber?: number;            // Issue number
  url?: string;                    // Link to external resource
  state?: string;                  // Platform-specific state
  labels?: string[];               // Labels/categories

  // Relationships
  parentIds: string[];             // Parent event IDs (for DAG construction)
  childIds?: string[];            // Child event IDs (populated during enrichment)
  relatedIds?: string[];          // Related events (cross-references)

  // Metrics
  impact?: ImpactMetrics;         // Impact/change metrics

  // Visualization
  visualization?: VisualizationHints;  // Rendering hints

  // Extensibility
  metadata?: Record<string, unknown>;  // Provider-specific metadata
}
```

#### Supporting Types

```typescript
interface Author {
  id: string;                      // Unique identifier (email, username, or provider ID)
  name: string;                    // Display name
  email?: string;                  // Email address (if available)
  avatarUrl?: string;             // Avatar URL (if available)
  username?: string;              // Provider-specific username
}

interface EventSource {
  providerId: string;              // Provider ID that contributed this event
  sourceId: string;                // Source-specific event ID
  timestamp?: Date;                // When this source discovered/created the event
  metadata?: Record<string, unknown>;  // Source-specific metadata
}

interface ImpactMetrics {
  filesChanged?: number;           // Number of files changed
  linesAdded?: number;            // Lines added
  linesRemoved?: number;          // Lines removed
  complexityDelta?: number;       // Cyclomatic complexity delta
  coverageDelta?: number;         // Test coverage delta
  impactScore?: number;           // Custom impact score (0-100)
}

interface VisualizationHints {
  color?: string;                  // Color (hex code)
  icon?: string;                   // Icon name or emoji
  size?: 'small' | 'medium' | 'large';  // Visual size
  shape?: 'circle' | 'square' | 'diamond' | 'triangle';  // Shape for graph rendering
  priority?: number;               // Z-index for layering
  connectionStyle?: 'solid' | 'dashed' | 'dotted';  // Connection line style
}
```

---

### EventType

**Purpose**: Normalized event types across all providers.

```typescript
enum EventType {
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
```

---

### FilterState

**Purpose**: Active filter state using unified selection model with AND logic.

```typescript
interface FilterState {
  selectedBranches?: string[];      // Selected branches (undefined = all branches)
  selectedAuthors?: string[];       // Selected authors (undefined = all authors)
  selectedEventTypes?: EventType[]; // Selected event types (undefined = all types)
  selectedProviders?: string[];     // Selected providers (undefined = all providers)

  dateRange?: {                     // Date range filter
    start: Date;
    end: Date;
  };

  searchQuery?: string;             // Search query (filter by title/description)
  selectedTags?: string[];          // Selected tags (undefined = all tags)
  selectedLabels?: string[];        // Selected labels (undefined = all labels)

  // Legacy support
  excludedEventTypes?: EventType[]; // Excluded event types (legacy exclusion model)
  branches?: string[];              // Legacy field name
  authors?: string[];               // Legacy field name
  providers?: string[];             // Legacy field name
  tags?: string[];                  // Legacy field name
}
```

---

## Timeline Domain

### GitEvent

**Purpose**: Core Git event interface representing any action in git history.

**File**: `src/timeline/domain/git-event.types.ts`

```typescript
interface GitEvent {
  id: string;                      // Commit hash or unique identifier
  type: GitEventType;              // Event type
  author: string;                  // Author name
  date: Date;                      // Event date
  title: string;                   // Commit message subject or event description
  branch: string;                  // Primary branch (for backwards compatibility)
  branches?: string[];             // All branches containing this commit

  // Optional fields for specific event types
  parentHashes?: string[];         // For merge commits - parent commit references
  filesChanged?: number;           // Number of files changed
  insertions?: number;             // Lines added
  deletions?: number;              // Lines removed

  // Metadata for visual connections
  metadata?: GitEventMetadata;
}

type GitEventType =
  | 'commit'
  | 'merge'
  | 'release'
  | 'branch-created'
  | 'branch-deleted'
  | 'branch-checkout'
  | 'branch-switch'
  | 'tag'
  | 'tag-created';
```

---

### GitEventRelationship

**Purpose**: Represents relationships between two git events.

```typescript
interface GitEventRelationship {
  id: string;                      // Unique relationship ID
  sourceEventId: string;           // Source event ID
  targetEventId: string;           // Target event ID
  type: GitRelationshipType;       // Relationship type
  metadata?: RelationshipMetadata; // Metadata for rendering
}

type GitRelationshipType =
  | 'parent-child'                 // Commit parent-child relationship
  | 'branch-creation'              // Branch created from commit
  | 'merge-source'                 // Source branch of merge
  | 'merge-target'                 // Target branch of merge
  | 'tag-reference';               // Tag points to commit
```

---

### Error Types

**Purpose**: Specialized error types for git operations.

```typescript
class GitEventError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: any
  );
}

class GitAnalysisError extends GitEventError {
  constructor(message: string, context?: any);
}

class GitDataError extends GitEventError {
  constructor(message: string, context?: any);
}
```

---

## Data Layer

### IDataProvider

**Purpose**: Core data provider abstraction enabling pluggable data sources.

**File**: `src/orchestration/ProviderRegistry.ts`

```typescript
interface IDataProvider {
  readonly id: string;             // Provider ID
  readonly name: string;           // Provider name
  readonly version: string;        // Provider version
  readonly capabilities: ProviderCapabilities;  // Provider capabilities

  /**
   * Initialize the provider (authentication, configuration, etc.)
   */
  initialize(config: ProviderConfig): Promise<void>;

  /**
   * Check if provider is healthy and ready
   */
  isHealthy(): Promise<boolean>;

  /**
   * Fetch timeline events for a specific context
   */
  fetchEvents(context: ProviderContext): Promise<CanonicalEvent[]>;

  /**
   * Cleanup resources
   */
  dispose(): Promise<void>;
}
```

---

### GitEventRepository

**Purpose**: Raw Git data extraction using enhanced git commands for accurate relationship detection.

**File**: `src/timeline/infrastructure/GitEventRepository.ts`

#### Class Definition

```typescript
class GitEventRepository {
  constructor(config?: Partial<GitRepositoryConfig>);

  /**
   * Main entry point - extracts complete git event collection
   * @param projectPath - Optional project path (auto-detects if not provided)
   * @returns Complete git event collection with relationships
   */
  async extractGitEvents(projectPath?: string): Promise<GitEventCollection>;

  /**
   * Clears cached project information
   */
  clearCache(): void;

  /**
   * Clear session cache (for active editor changes)
   */
  clearSessionCache(): void;
}
```

#### Configuration

```typescript
interface GitRepositoryConfig {
  maxCommits: number;              // Maximum number of commits to fetch (default: 1000)
  includeAllBranches: boolean;     // Include commits from all branches (default: true)
  timeoutMs: number;               // Git command timeout in ms (default: 30000)
}
```

#### Return Type

```typescript
interface GitEventCollection {
  events: GitEvent[];              // All extracted events
  relationships: GitEventRelationship[];  // Event relationships
  branches: string[];              // All branch names
  authors: string[];               // All author names
  dateRange: [Date, Date];         // Timeline span
  metadata: CollectionMetadata;    // Collection metadata
}
```

---

### GitProvider

**Purpose**: Git data provider that wraps GitEventRepository and transforms output to CanonicalEvent format.

**File**: `src/providers/git/GitProvider.ts`

```typescript
class GitProvider implements IDataProvider {
  readonly id = 'git-local';
  readonly name = 'Local Git Repository';
  readonly version = '2.0.0';
  readonly capabilities: ProviderCapabilities;

  constructor();

  /**
   * Initialize the provider
   */
  async initialize(config: ProviderConfig): Promise<void>;

  /**
   * Check if provider is healthy
   */
  async isHealthy(): Promise<boolean>;

  /**
   * Fetch events from git repository
   * @param context - Provider context with repository path
   * @returns Array of CanonicalEvents
   */
  async fetchEvents(context: ProviderContext): Promise<CanonicalEvent[]>;

  /**
   * Dispose provider resources
   */
  async dispose(): Promise<void>;
}
```

---

### GitHubProvider

**Purpose**: GitHub API data provider for fetching pull requests, releases, and other GitHub events.

**File**: `src/providers/github/GitHubProvider.ts`

```typescript
class GitHubProvider implements IDataProvider {
  readonly id = 'github';
  readonly name = 'GitHub API Provider';
  readonly version = '1.0.0';
  readonly capabilities: ProviderCapabilities;

  constructor();

  /**
   * Initialize the provider with configuration
   */
  async initialize(config: ProviderConfig): Promise<void>;

  /**
   * Check if provider is healthy and authenticated
   */
  async isHealthy(): Promise<boolean>;

  /**
   * Fetch events from GitHub API
   * @param context - Provider context with repository path
   * @returns Array of CanonicalEvents from GitHub
   */
  async fetchEvents(context: ProviderContext): Promise<CanonicalEvent[]>;

  /**
   * Dispose provider resources
   */
  async dispose(): Promise<void>;
}
```

**Supported Event Types**:
- Pull Requests (opened, merged, closed)
- Releases
- Tags
- Issues (future)

**Authentication**: Uses VS Code authentication API or PAT from configuration.

---

### GitHubClient

**Purpose**: Low-level GitHub API client with rate limiting and error handling.

**File**: `src/providers/github/GitHubClient.ts`

```typescript
class GitHubClient {
  constructor(token: string, rateLimitManager?: RateLimitManager);

  /**
   * Fetch pull requests for a repository
   */
  async fetchPullRequests(owner: string, repo: string, state?: 'open' | 'closed' | 'all'): Promise<GitHubPullRequest[]>;

  /**
   * Fetch releases for a repository
   */
  async fetchReleases(owner: string, repo: string): Promise<GitHubRelease[]>;

  /**
   * Fetch tags for a repository
   */
  async fetchTags(owner: string, repo: string): Promise<GitHubTag[]>;

  /**
   * Get rate limit status
   */
  async getRateLimit(): Promise<RateLimitStatus>;
}
```

---

### RateLimitManager

**Purpose**: Manages GitHub API rate limiting with automatic retry and backoff.

**File**: `src/providers/github/RateLimitManager.ts`

```typescript
class RateLimitManager {
  constructor(config?: RateLimitConfig);

  /**
   * Check if request is allowed (respects rate limits)
   */
  async checkRateLimit(): Promise<boolean>;

  /**
   * Update rate limit status from API response
   */
  updateRateLimit(remaining: number, resetAt: Date): void;

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): RateLimitStatus;

  /**
   * Wait until rate limit resets
   */
  async waitForReset(): Promise<void>;
}

interface RateLimitStatus {
  remaining: number;
  limit: number;
  resetAt: Date;
  resetInMs: number;
}
```

---

## Orchestration Layer

### DataOrchestrator

**Purpose**: Simplified central coordinator managing data fetching, caching, and filtering with zero transformations.

**File**: `src/orchestration/DataOrchestrator.ts`

```typescript
class DataOrchestrator {
  constructor(options?: DataOrchestratorOptions);

  /**
   * Initialize orchestrator and register providers
   */
  async initialize(): Promise<void>;

  /**
   * Get events for a repository
   * @param repoPath - Repository path
   * @param forceRefresh - Force cache invalidation
   * @returns Array of CanonicalEvents
   */
  async getEvents(repoPath: string, forceRefresh?: boolean): Promise<CanonicalEvent[]>;

  /**
   * Get filtered events for a repository
   * @param repoPath - Repository path
   * @param filters - Filter state
   * @param forceRefresh - Force cache invalidation
   * @returns Filtered array of CanonicalEvents
   */
  async getFilteredEvents(
    repoPath: string,
    filters: FilterState,
    forceRefresh?: boolean
  ): Promise<CanonicalEvent[]>;

  /**
   * Get both all events and filtered events for a repository
   * @param repoPath - Repository path
   * @param filters - Filter state (optional - uses persisted state if not provided)
   * @param forceRefresh - Force cache invalidation
   * @returns Object with allEvents, filteredEvents, and filterOptions
   */
  async getEventsWithFilters(
    repoPath: string,
    filters?: FilterState,
    forceRefresh?: boolean
  ): Promise<{
    allEvents: CanonicalEvent[];
    filteredEvents: CanonicalEvent[];
    filterOptions: FilterOptions;
    appliedFilters: FilterState;
  }>;

  /**
   * Get filter options for a repository
   * @param repoPath - Repository path
   * @returns Filter options computed from events
   */
  async getFilterOptions(repoPath: string): Promise<FilterOptions>;

  /**
   * Invalidate cache for a repository
   * @param repoPath - Repository path (or undefined to clear all)
   */
  invalidateCache(repoPath?: string): void;

  /**
   * Update filter state for a repository (persists for session)
   * @param repoPath - Repository path
   * @param filters - New filter state
   */
  updateFilterState(repoPath: string, filters: FilterState): void;

  /**
   * Get current filter state for a repository
   * @param repoPath - Repository path
   * @returns Current filter state
   */
  getFilterState(repoPath: string): FilterState;

  /**
   * Enable or disable a provider and invalidate cache
   * @param providerId - Provider ID
   * @param enabled - Whether to enable or disable
   */
  setProviderEnabled(providerId: string, enabled: boolean): void;

  /**
   * Check if a provider is enabled
   * @param providerId - Provider ID
   * @returns Whether provider is enabled
   */
  isProviderEnabled(providerId: string): boolean;

  /**
   * Dispose orchestrator resources
   */
  async dispose(): Promise<void>;
}
```

---

### ProviderRegistry

**Purpose**: Manages discovery, loading, and lifecycle of data providers.

**File**: `src/orchestration/ProviderRegistry.ts`

```typescript
class ProviderRegistry {
  /**
   * Register a data provider
   */
  async registerProvider(provider: IDataProvider, config: ProviderConfig): Promise<void>;

  /**
   * Unregister a data provider
   */
  async unregisterProvider(providerId: string): Promise<void>;

  /**
   * Get a specific provider
   */
  getProvider(providerId: string): IDataProvider | undefined;

  /**
   * Get all registered providers
   */
  getAllProviders(): IDataProvider[];

  /**
   * Get enabled providers
   */
  getEnabledProviders(): IDataProvider[];

  /**
   * Get healthy providers (enabled + healthy)
   */
  getHealthyProviders(): IDataProvider[];

  /**
   * Enable or disable a provider
   */
  setProviderEnabled(providerId: string, enabled: boolean): void;

  /**
   * Check if a provider is enabled
   */
  isProviderEnabled(providerId: string): boolean;

  /**
   * Refresh health status for all providers
   */
  async refreshHealth(): Promise<void>;
}
```

---

### FilterStateManager

**Purpose**: Session-level filter state persistence per repository.

**File**: `src/orchestration/FilterStateManager.ts`

```typescript
class FilterStateManager {
  constructor(options?: FilterStateManagerOptions);

  /**
   * Get filter state for a repository
   * @param repoPath - Repository path (unique identifier)
   * @returns FilterState for this repository
   */
  getFilterState(repoPath: string): FilterState;

  /**
   * Set filter state for a repository
   * @param repoPath - Repository path
   * @param filters - New filter state
   */
  setFilterState(repoPath: string, filters: FilterState): void;

  /**
   * Update specific filter fields without overwriting entire state
   * @param repoPath - Repository path
   * @param updates - Partial filter state to merge
   */
  updateFilterState(repoPath: string, updates: Partial<FilterState>): void;

  /**
   * Reset filter state for a repository to "all visible"
   * @param repoPath - Repository path
   */
  resetFilterState(repoPath: string): void;

  /**
   * Clear all filter states (useful for testing or reset scenarios)
   */
  clearAll(): void;

  /**
   * Check if a repository has an active filter state
   * @param repoPath - Repository path
   * @returns true if filters are active
   */
  hasActiveFilters(repoPath: string): boolean;

  /**
   * Dispose and cleanup resources
   */
  dispose(): void;
}
```

---

## Analysis Layer

### MergeAnalyzer

**Purpose**: Parent-child relationship detection using git parent hash data.

**File**: `src/timeline/analysis/MergeAnalyzer.ts`

```typescript
class MergeAnalyzer {
  constructor(config?: Partial<MergeAnalysisConfig>);

  /**
   * Analyzes merge relationships for a collection of git events
   * @param events - Array of GitEvents
   * @returns Array of GitEventRelationships
   */
  analyzeRelationships(events: GitEvent[]): GitEventRelationship[];

  /**
   * Analyzes merge commits in detail
   * @param events - Array of GitEvents
   * @returns Array of MergeAnalysisResults
   */
  analyzeMergeCommits(events: GitEvent[]): MergeAnalysisResult[];

  /**
   * Finds all descendant events of a given event
   * @param eventId - Event ID to find descendants for
   * @param depth - Maximum depth to search (default: 5)
   * @returns Array of descendant GitEvents
   */
  findDescendants(eventId: string, depth?: number): GitEvent[];

  /**
   * Gets statistics about the merge analysis
   */
  getAnalysisStatistics(): {
    totalEvents: number;
    mergeEvents: number;
    simpleMerges: number;
    octopusMerges: number;
    orphanEvents: number;
  };
}
```

---

### BranchAnalyzer

**Purpose**: Branch creation and relationship mapping using reflog-based branch creation dates.

**File**: `src/timeline/analysis/BranchAnalyzer.ts`

```typescript
class BranchAnalyzer {
  constructor(config?: Partial<BranchAnalysisConfig>);

  /**
   * Analyzes branch relationships for a collection of git events
   * @param events - Array of GitEvents
   * @returns Array of GitEventRelationships
   */
  analyzeBranchRelationships(events: GitEvent[]): GitEventRelationship[];

  /**
   * Analyzes branch lifecycles in detail
   * @param events - Array of GitEvents
   * @returns Array of BranchAnalysisResults
   */
  analyzeBranchLifecycles(events: GitEvent[]): BranchAnalysisResult[];

  /**
   * Gets statistics about branch analysis
   */
  getBranchStatistics(): {
    totalBranches: number;
    activeBranches: number;
    mergedBranches: number;
    averageLifespan: number;
    branchesWithCreationPoint: number;
  };
}
```

---

## Visualization Layer

### ITimelineRenderer

**Purpose**: Universal timeline renderer interface for pluggable visualization types.

**File**: `src/visualization/interfaces/ITimelineRenderer.ts`

```typescript
interface ITimelineRenderer {
  // Identification
  readonly id: string;
  readonly displayName: string;
  readonly version: string;
  readonly capabilities: RendererCapabilities;

  // Core rendering lifecycle
  initialize(container: HTMLElement | string, options?: RendererOptions): Promise<void>;
  render(data: ProcessedTimelineData): Promise<void>;
  update(data: ProcessedTimelineData): Promise<void>;
  resize(): void;
  destroy(): void;

  // Configuration management
  configure(options: RendererOptions): void;
  getConfiguration(): RendererOptions;

  // State management
  setTimeRange(range: [Date, Date]): void;
  setBrushRange(range: [Date, Date] | null): void;
  setTheme(theme: string): void;

  // Viewport control (for slider-driven zoom/pan)
  updateViewport?(timeRange: [Date, Date]): void;

  // Utility methods
  isInitialized(): boolean;
  getContainer(): HTMLElement | null;
  getViewport(): ViewportInfo;

  // Health and diagnostics
  validate(): Promise<RendererValidationResult>;
  getDebugInfo(): RendererDebugInfo;
}
```

---

### D3TimelineRenderer

**Purpose**: Main D3.js timeline renderer coordinating all visualization components.

**File**: `src/visualization/d3/D3TimelineRenderer.ts`

```typescript
class D3TimelineRenderer {
  constructor(options: D3TimelineOptions);

  /**
   * Resize all components
   */
  resize(): void;

  /**
   * Update viewport while preserving timeline structure
   * @param timeRange - New time range to display
   */
  updateViewport(timeRange: [Date, Date]): void;

  /**
   * Main render method - properly handles initial view window
   * @param events - Array of events to render
   * @param dateRange - Full date range of data
   * @param impactDomain - Impact domain for scaling
   * @param useTransition - Whether to use transitions
   */
  render(
    events: any[],
    dateRange: [Date, Date],
    impactDomain: [number, number],
    useTransition?: boolean
  ): void;

  /**
   * Render the range selector with proper initial selection
   * @param allEvents - All events for the range selector
   * @param fullDateRange - Full date range
   */
  renderRangeSelector(allEvents: any[], fullDateRange: [Date, Date]): void;

  /**
   * Show event hover popup
   */
  showEventHover(event: any, position: { x: number; y: number }): void;

  /**
   * Show event locked popup
   */
  showEventLocked(event: any, position: { x: number; y: number }): void;

  /**
   * Hide event popup
   */
  hideEventPopup(): void;
}
```

---

### TimelineDataManager

**Purpose**: Unified frontend data processing manager coordinating all data processing classes.

**File**: `src/visualization/data/TimelineDataManager.ts`

```typescript
class TimelineDataManager {
  constructor();

  /**
   * Process complete timeline data for rendering
   * @param data - Raw timeline data
   * @param currentBrushRange - Current brush range selection
   * @returns Processed timeline data
   */
  processTimelineData(
    data: any,
    currentBrushRange?: [Date, Date] | null
  ): ProcessedTimelineData;

  /**
   * Update statistics for existing processed data
   */
  updateStatistics(
    visibleEvents: any[],
    totalEvents: any[],
    timeRange: [Date, Date],
    activeBranches: string[]
  ): { statistics: TimelineStatistics; summaryStats: any };

  /**
   * Get event type counts for filter chips
   */
  getEventTypeCounts(events: any[]): Map<string, number>;

  /**
   * Calculate velocity metrics
   */
  calculateVelocityMetrics(events: any[], timeRange: [Date, Date]): any;

  /**
   * Calculate distribution metrics
   */
  calculateDistributionMetrics(events: any[]): any;

  /**
   * Calculate impact metrics
   */
  calculateImpactMetrics(events: any[]): any;
}
```

---

### EventVisualTheme

**Purpose**: Dual color mode system with shape-based event differentiation and z-index layering.

**File**: `src/visualization/theme/EventVisualTheme.ts`

```typescript
class EventVisualTheme {
  /**
   * Get color for an event based on current color mode
   * @param event - CanonicalEvent
   * @param colorMode - 'semantic' (event type) or 'sync-state' (location)
   * @returns Hex color code
   */
  getEventColor(event: CanonicalEvent, colorMode: 'semantic' | 'sync-state'): string;

  /**
   * Get D3 symbol for event type (shape-based differentiation)
   * @param eventType - Event type
   * @returns D3 symbol generator
   */
  getEventShape(eventType: EventType): d3.Symbol;

  /**
   * Get z-index priority for event type (layering)
   * @param eventType - Event type
   * @returns Z-index value (0-4)
   */
  getEventZIndex(eventType: EventType): number;

  /**
   * Get legend items for current color mode
   * @param colorMode - Current color mode
   * @returns Array of legend items
   */
  getLegendItems(colorMode: 'semantic' | 'sync-state'): LegendItem[];
}
```

**Color Modes**:
- **Semantic Mode**: Colors indicate event type (commit, merge, PR, release, etc.)
- **Sync State Mode**: Colors indicate sync location (local-only, remote-only, both)

**Shape Mapping**:
- Circle: Commit
- Diamond: Merge
- Square: Release/Tag
- Triangle: Branch operations
- Cross: Delete operations
- Star: Pull requests
- Wye: Deployments

**Z-Index Layers**:
- Layer 0: Commits (most common, bottom)
- Layer 1: Branches
- Layer 2: Merges
- Layer 3: Tags/Releases
- Layer 4: Deployments (top)

---

## UI Layer

### FilterController

**Purpose**: Redesigned filter controller with clear checkbox UI using unified selection model.

**File**: `src/visualization/ui/FilterController.ts`

```typescript
class FilterController {
  constructor(options?: FilterControllerOptions);

  /**
   * Initialize the filter controller
   */
  initialize(): void;

  /**
   * Set callbacks
   */
  setCallbacks(callbacks: {
    onFilterUpdate?: (filters: FilterState) => void;
    onRefreshRequest?: () => void;
  }): void;

  /**
   * Update available filter options and compute counts
   * @param options - Available filter options
   * @param allEvents - All events (unfiltered) for computing total counts
   * @param filteredEvents - Filtered events for computing filtered count
   */
  updateAvailableOptions(
    options: AvailableOptions,
    allEvents?: any[],
    filteredEvents?: any[]
  ): void;

  /**
   * Clear all filters
   */
  clearAllFilters(): void;

  /**
   * Get current filter state
   */
  getFilterState(): FilterState;

  /**
   * Get active filter count
   */
  getActiveFilterCount(): number;
}
```

---

### IUIController

**Purpose**: Modular UI controller architecture for managing multi-faceted popup systems and user interactions.

**File**: `src/ui/controllers/interfaces/IUIController.ts`

```typescript
interface IUIController {
  readonly id: string;
  readonly name: string;

  /**
   * Initialize the controller
   */
  initialize(context: IUIContext): Promise<void>;

  /**
   * Handle user interaction
   */
  handleInteraction(interaction: IUserInteraction): Promise<IInteractionResult>;

  /**
   * Update controller state
   */
  updateState(state: any): Promise<void>;

  /**
   * Cleanup resources
   */
  dispose(): Promise<void>;
}
```

---

## Webview Layer

### SimpleTimelineApp

**Purpose**: Clean implementation working directly with CanonicalEvent[] from backend.

**File**: `src/webview/SimpleTimelineApp.ts`

```typescript
class SimpleTimelineApp {
  constructor(containerId?: string);

  /**
   * Handle data from backend
   * @param allEvents - All events (unfiltered) for total counts
   * @param filteredEvents - Filtered events for rendering
   * @param filterOptions - Available filter options
   * @param repoPath - Repository path
   * @param activeFile - Active file name (optional)
   * @param appliedFilters - Applied filter state
   */
  async handleTimelineData(
    allEvents: CanonicalEvent[],
    filteredEvents: CanonicalEvent[],
    filterOptions: FilterOptions,
    repoPath: string,
    activeFile?: string,
    appliedFilters?: any
  ): Promise<void>;

  /**
   * Handle resize (called from extension message)
   */
  handleResize(): void;

  /**
   * Re-render timeline with current data (for color mode changes)
   */
  rerender(): void;

  /**
   * Dispose
   */
  dispose(): void;
}
```

---

### TimelineProvider

**Purpose**: Simplified extension host working directly with CanonicalEvent[].

**File**: `src/providers/timeline-provider-webpack.ts`

```typescript
class TimelineProvider implements vscode.WebviewViewProvider {
  static readonly viewType = 'repoTimeline.evolutionView';

  constructor(extensionUri: vscode.Uri);

  /**
   * Initialize provider
   */
  async initialize(): Promise<void>;

  /**
   * Resolve webview view
   */
  async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): Promise<void>;

  /**
   * Dispose provider
   */
  dispose(): void;
}
```

**Usage Example**:

```typescript
// In extension.ts
const provider = new TimelineProvider(context.extensionUri);
await provider.initialize();

const disposable = vscode.window.registerWebviewViewProvider(
  TimelineProvider.viewType,
  provider,
  { webviewOptions: { retainContextWhenHidden: true } }
);

context.subscriptions.push(disposable);
```

---

## Extension Layer

### Extension Activation

**File**: `src/extension.ts`

#### Activation Function

```typescript
async function activate(context: vscode.ExtensionContext): Promise<void>
```

**Purpose**: Main extension activation entry point that registers providers and commands.

**Registered Components**:
- Welcome view provider (activity bar sidebar)
- Timeline webview provider (bottom panel)
- Commands: `repoTimeline.showTimeline`, `repoTimeline.refreshData`
- Workspace change listeners
- Active editor change listener

#### Deactivation Function

```typescript
function deactivate(): void
```

**Purpose**: Cleanup resources when extension is deactivated.

---

### WelcomeViewProvider

**Purpose**: Activity bar sidebar view provider showing welcome content and quick actions.

**File**: `src/providers/WelcomeViewProvider.ts`

```typescript
class WelcomeViewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = 'repoTimeline.welcomeView';

  constructor(extensionUri: vscode.Uri);

  /**
   * Resolve webview view (called when view becomes visible)
   */
  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ): void;
}
```

**Features**:
- Repository selection and quick open
- Extension documentation links
- Feature enablement status
- Quick action buttons

---

## Utilities

### Logger

**Purpose**: Centralized logging system with categorization and severity levels.

**File**: `src/utils/Logger.ts`

```typescript
class Logger {
  static getInstance(): Logger;

  /**
   * Set log level
   */
  setLogLevel(level: LogLevel): void;

  /**
   * Enable/disable category
   */
  enableCategory(category: LogCategory): void;
  disableCategory(category: LogCategory): void;

  /**
   * Logging methods
   */
  error(category: LogCategory, message: string, context?: string, data?: any): void;
  warn(category: LogCategory, message: string, context?: string, data?: any): void;
  info(category: LogCategory, message: string, context?: string, data?: any): void;
  debug(category: LogCategory, message: string, context?: string, data?: any): void;
  trace(category: LogCategory, message: string, context?: string, data?: any): void;

  /**
   * Performance logging
   */
  startTimer(category: LogCategory, operation: string, context?: string): () => void;

  async measureAsync<T>(
    category: LogCategory,
    operation: string,
    fn: () => Promise<T>,
    context?: string
  ): Promise<T>;
}

enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

enum LogCategory {
  EXTENSION = 'EXT',
  DATA = 'DAT',
  ORCHESTRATION = 'ORC',
  VISUALIZATION = 'VIZ',
  UI = 'UI',
  PERFORMANCE = 'PERF',
  FILTERING = 'FILT',
  CACHE = 'CACHE',
  GIT = 'GIT',
  GITHUB = 'GITHUB',
  WEBVIEW = 'WV',
  TEST = 'TEST'
}
```

**Usage Example**:

```typescript
import { logger, LogCategory, createContextLogger } from '../utils/Logger';

// Direct usage
logger.info(LogCategory.DATA, 'Fetching events', 'fetchEvents');

// Context logger (recommended)
const log = createContextLogger('MyClass');
log.info(LogCategory.DATA, 'Operation started', 'myMethod');
log.error(LogCategory.DATA, 'Operation failed', 'myMethod', error);

// Performance timing
const timer = logger.startTimer(LogCategory.PERFORMANCE, 'processData', 'MyClass');
// ... do work ...
timer(); // Logs completion time
```

---

### WebviewLogger

**Purpose**: Browser-side logging system that mirrors extension Logger API for webview code.

**File**: `src/webview/WebviewLogger.ts`

```typescript
class WebviewLogger {
  static getInstance(): WebviewLogger;

  /**
   * Set log level
   */
  setLogLevel(level: LogLevel): void;

  /**
   * Logging methods (console-based in browser)
   */
  error(category: LogCategory, message: string, context?: string, data?: any): void;
  warn(category: LogCategory, message: string, context?: string, data?: any): void;
  info(category: LogCategory, message: string, context?: string, data?: any): void;
  debug(category: LogCategory, message: string, context?: string, data?: any): void;
  trace(category: LogCategory, message: string, context?: string, data?: any): void;

  /**
   * Performance timing
   */
  startTimer(category: LogCategory, operation: string, context?: string): () => void;
}
```

**Usage**: Identical API to extension Logger, but outputs to browser console instead of VS Code output channel.

---

## Feature Management

### FeatureFlagManager

**Purpose**: Token-based feature enablement system for controlling access to providers and advanced features.

**File**: `src/core/FeatureFlags.ts`

```typescript
class FeatureFlagManager {
  static getInstance(config?: FeatureFlagConfig): FeatureFlagManager;
  static resetInstance(): void;

  /**
   * Check if a feature is enabled (uses cached result)
   */
  async isFeatureEnabled(feature: Feature): Promise<boolean>;

  /**
   * Refresh feature status (clear cache and re-validate)
   */
  async refreshFeatureStatus(feature: Feature): Promise<boolean>;

  /**
   * Set custom token validator
   */
  setTokenValidator(validator: ITokenValidator): void;

  /**
   * Get current token validator
   */
  getTokenValidator(): ITokenValidator;

  /**
   * Enable all features (development mode)
   */
  enableAllFeatures(): void;
}

enum Feature {
  GITHUB_PROVIDER = 'github-provider',
  JIRA_PROVIDER = 'jira-provider',
  AGENT_BRAIN = 'agent-brain',
  ADVANCED_ANALYTICS = 'advanced-analytics'
}

interface ITokenValidator {
  validateToken(token: string, feature: Feature): Promise<boolean>;
  isFeatureEnabled(feature: Feature): Promise<boolean>;
}
```

**Usage Example**:

```typescript
import { FeatureFlagManager, Feature } from '../core/FeatureFlags';

const featureFlags = FeatureFlagManager.getInstance();
const isEnabled = await featureFlags.isFeatureEnabled(Feature.GITHUB_PROVIDER);

if (isEnabled) {
  // Initialize GitHub provider
}
```

---

### EventMatcher

**Purpose**: Multi-provider event deduplication and merging using intelligent matching strategies.

**File**: `src/orchestration/EventMatcher.ts`

```typescript
class EventMatcher {
  /**
   * Deduplicate events from multiple providers
   * @param events - Array of events from all providers
   * @returns Deduplicated events with sources[] populated
   */
  deduplicateEvents(events: CanonicalEvent[]): DeduplicationResult;
}

interface DeduplicationResult {
  /** Deduplicated events */
  events: CanonicalEvent[];

  /** Statistics about deduplication */
  stats: {
    totalInput: number;
    totalOutput: number;
    mergedCount: number;
    duplicatesRemoved: number;
  };
}
```

**Matching Strategy**:
- **Commits**: Match by hash/sha (supports abbreviated SHAs)
- **Pull Requests**: Match by pullRequestNumber
- **Releases**: Three-tier strategy:
  - Tier 1: Tag name (exact or normalized) - 95-100% confidence
  - Tier 2: Target commit SHA - 100% confidence
  - Tier 3: Fuzzy title + relaxed time - 60-80% confidence
- **Tags**: Match by tag name
- **Branches**: Match by branch name + timestamp proximity

---

## Architecture Overview

### Data Flow

```
Git Repository
    ↓
GitEventRepository (extracts raw git events)
    ↓
GitProvider (transforms to CanonicalEvent[])
    ↓
DataOrchestrator (caches, filters)
    ↓
TimelineProvider (extension host)
    ↓
SimpleTimelineApp (webview)
    ↓
D3TimelineRenderer (visualization)
```

### Key Design Principles

1. **Single Event Format**: All data flows as `CanonicalEvent[]` - no transformations between layers
2. **Explicit Filtering**: Filters use explicit selection (undefined = show all) with AND logic
3. **Multi-Branch Support**: Events preserve ALL branches they appear in via `branches[]` array
4. **Zero Data Loss**: No intermediate transformations that could lose data
5. **Provider Extensibility**: Easy to add new data sources (GitHub, JIRA, etc.)

---

## Common Usage Patterns

### Fetching and Filtering Events

```typescript
// Initialize orchestrator
const orchestrator = new DataOrchestrator();
await orchestrator.initialize();

// Get all events
const events = await orchestrator.getEvents('/path/to/repo');

// Get filtered events
const filtered = await orchestrator.getFilteredEvents('/path/to/repo', {
  selectedBranches: ['main', 'develop'],
  selectedEventTypes: [EventType.COMMIT, EventType.MERGE]
});

// Get both (recommended)
const result = await orchestrator.getEventsWithFilters('/path/to/repo');
// result.allEvents - all events
// result.filteredEvents - filtered events
// result.filterOptions - available filter options
// result.appliedFilters - currently applied filters
```

### Implementing a Custom Provider

```typescript
class MyCustomProvider implements IDataProvider {
  readonly id = 'my-provider';
  readonly name = 'My Custom Provider';
  readonly version = '1.0.0';
  readonly capabilities = { /* ... */ };

  async initialize(config: ProviderConfig): Promise<void> {
    // Setup authentication, configuration, etc.
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }

  async fetchEvents(context: ProviderContext): Promise<CanonicalEvent[]> {
    // Fetch data from your source
    // Transform to CanonicalEvent[]
    return events;
  }

  async dispose(): Promise<void> {
    // Cleanup resources
  }
}

// Register provider
const orchestrator = new DataOrchestrator();
await orchestrator.initialize();
await orchestrator.getProviderRegistry().registerProvider(
  new MyCustomProvider(),
  { enabled: true }
);
```

---

## Version History

- **v0.4.66** - Added pathway testing system, EventMatcher deduplication, GitHub provider integration, feature flag management, dual color modes with shape-based differentiation (current)
- **v0.3.38** - Updated icon system with new SVG designs and hover effects
- **v0.3.35** - Fixed provider checkbox persistence and renamed "Clear All" to "Reset Filter"
- **v0.3.26** - Simplified architecture with canonical event model and dual color modes

---

## Recent Additions (v0.4.66)

### New Components
- **FeatureFlagManager**: Token-based feature enablement for providers
- **EventMatcher**: Multi-provider event deduplication with intelligent matching
- **GitHubProvider**: GitHub API integration for PRs, releases, and tags
- **GitHubClient**: Low-level GitHub API client with rate limiting
- **RateLimitManager**: GitHub API rate limit management
- **EventVisualTheme**: Dual color mode system with shape-based differentiation
- **WelcomeViewProvider**: Activity bar sidebar with quick actions
- **WebviewLogger**: Browser-side logging mirroring extension Logger API

### Enhanced Components
- **CanonicalEvent**: Added `sources[]` field for multi-provider deduplication
- **FilterState**: Added `colorMode`, `enabledProviders`, `showConnections`, `timeWindow`
- **Logger**: Added `LogPathway` enum for end-to-end flow debugging
- **DataOrchestrator**: Integrated EventMatcher for automatic deduplication

### Architecture Improvements
- Multi-provider support with automatic event deduplication
- Pathway-based logging for focused debugging
- Feature flag system for controlled rollout
- GitHub API integration with rate limiting
- Dual color mode visualization with z-index layering

---

This API documentation provides a comprehensive reference for all public APIs in the Repository Timeline Extension codebase, organized by architectural layer with clear examples and type signatures.
