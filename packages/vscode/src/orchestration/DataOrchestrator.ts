/**
 * DataOrchestrator - Simplified Central Coordinator
 *
 * NEW ARCHITECTURE:
 * - Works natively with CanonicalEvent (no transformations)
 * - Simple caching by repository
 * - Inline filtering (no separate pipeline)
 * - Coordinates providers via ProviderRegistry
 *
 * REMOVED COMPLEXITY:
 * - No MultiSourceNormalizationCache
 * - No EventNormalizer
 * - No FilteringPipeline
 * - No TimelineEngineAdapter
 * - No transformation layers
 *
 * Data flows cleanly:
 * Provider → CanonicalEvent[] → Cache → Filter → Renderer
 */

import {
  CanonicalEvent,
  EventType,
  FilterOptions,
  FilterState,
  CachedRepoData,
  ProviderContext
} from '@agent-brain/core/domains/events';
import { ProviderRegistry, GitProvider, GitHubProvider } from '@agent-brain/core/domains/providers';
import { FilterStateManager } from './FilterStateManager';
import { EventMatcher } from './EventMatcher';
import { logger, LogCategory, LogPathway, createContextLogger } from '../utils/Logger';
import { FeatureFlagManager, Feature } from '../core/FeatureFlags';

export interface DataOrchestratorOptions {
  cacheTTL?: number; // Cache time-to-live in milliseconds
}

/**
 * Simplified DataOrchestrator
 * Manages data fetching, caching, and filtering with zero transformations
 */
export class DataOrchestrator {
  private readonly log = createContextLogger(LogCategory.ORCHESTRATION);

  // Simple cache: repoPath → cached data
  private cache = new Map<string, CachedRepoData>();

  // Provider registry for plugin management
  private providerRegistry: ProviderRegistry;

  // Filter state manager for per-repository filter persistence
  private filterStateManager: FilterStateManager;

  // Event matcher for deduplication
  private eventMatcher: EventMatcher;

  // Options
  private cacheTTL: number;

  // Current state
  private currentRepoPath: string = '';

  constructor(options: DataOrchestratorOptions = {}) {
    this.cacheTTL = options.cacheTTL || 300000; // 5 minutes default
    this.providerRegistry = new ProviderRegistry();
    this.filterStateManager = new FilterStateManager();
    this.eventMatcher = new EventMatcher();
    this.log.info(
      LogCategory.ORCHESTRATION,
      'DataOrchestrator constructed with simplified architecture',
      'constructor',
      { cacheTTL: this.cacheTTL },
      LogPathway.DATA_INGESTION
    );
  }

  /**
   * Initialize orchestrator and register providers
   */
  async initialize(): Promise<void> {
    this.log.info(
      LogCategory.ORCHESTRATION,
      'Initializing DataOrchestrator',
      'initialize',
      undefined,
      LogPathway.DATA_INGESTION
    );

    // Register Git provider (always enabled)
    const gitProvider = new GitProvider();
    await this.providerRegistry.registerProvider(gitProvider, {
      enabled: true,
      priority: 1
    });

    // Register GitHub provider (feature flag protected)
    const featureFlags = FeatureFlagManager.getInstance();
    const githubEnabled = await featureFlags.isFeatureEnabled(Feature.GITHUB_PROVIDER);

    if (githubEnabled) {
      this.log.info(LogCategory.ORCHESTRATION, 'GitHub provider feature is enabled', 'initialize');

      try {
        const githubProvider = new GitHubProvider();
        await this.providerRegistry.registerProvider(githubProvider, {
          enabled: false, // Disabled by default - user can enable in UI
          priority: 2
        });
        this.log.info(LogCategory.ORCHESTRATION, 'GitHub provider registered successfully', 'initialize');
      } catch (error) {
        this.log.error(LogCategory.ORCHESTRATION, `Failed to register GitHub provider: ${error}`, 'initialize');
        // Continue without GitHub provider
      }
    } else {
      this.log.info(LogCategory.ORCHESTRATION, 'GitHub provider feature is disabled', 'initialize');
    }

    this.log.info(
      LogCategory.ORCHESTRATION,
      'Initialization complete',
      'initialize',
      undefined,
      LogPathway.DATA_INGESTION
    );
  }

  /**
   * Get events for a repository
   * Returns cached data if available, fetches if not
   *
   * @param repoPath - Repository path
   * @param forceRefresh - Force cache invalidation
   * @returns Array of CanonicalEvents
   */
  async getEvents(repoPath: string, forceRefresh = false): Promise<CanonicalEvent[]> {
    this.log.info(LogCategory.ORCHESTRATION, `Getting events for ${repoPath}`, 'getEvents', undefined, LogPathway.DATA_INGESTION);

    // Check cache
    if (!forceRefresh && this.isCacheValid(repoPath)) {
      this.log.info(LogCategory.ORCHESTRATION, 'Returning cached events', 'getEvents', undefined, LogPathway.DATA_INGESTION);
      return this.cache.get(repoPath)!.events;
    }

    // Fetch from providers
    this.log.info(LogCategory.ORCHESTRATION, 'Fetching fresh events from providers', 'getEvents', undefined, LogPathway.DATA_INGESTION);
    const events = await this.fetchFromProviders(repoPath);

    // Compute filter options
    const filterOptions = this.computeFilterOptions(events);

    // Cache
    this.cache.set(repoPath, {
      repoPath,
      events,
      fetchedAt: new Date(),
      filterOptions
    });

    this.currentRepoPath = repoPath;

    this.log.info(LogCategory.ORCHESTRATION, `Cached ${events.length} events`, 'getEvents', undefined, LogPathway.DATA_INGESTION);

    return events;
  }

  /**
   * Get filtered events for a repository
   *
   * @param repoPath - Repository path
   * @param filters - Filter state
   * @param forceRefresh - Force cache invalidation
   * @returns Filtered array of CanonicalEvents
   */
  async getFilteredEvents(
    repoPath: string,
    filters: FilterState,
    forceRefresh = false
  ): Promise<CanonicalEvent[]> {
    this.log.info(LogCategory.ORCHESTRATION, `Getting filtered events for ${repoPath}`, 'getFilteredEvents');

    // Get all events (from cache or fetch)
    const allEvents = await this.getEvents(repoPath, forceRefresh);

    // Apply filters
    const filtered = this.applyFilters(allEvents, filters);

    this.log.info(LogCategory.ORCHESTRATION, `Filtered ${allEvents.length} → ${filtered.length} events`, 'getFilteredEvents');

    return filtered;
  }

  /**
   * Get both all events and filtered events for a repository
   * Returns complete data needed for accurate UI rendering and counts
   *
   * @param repoPath - Repository path
   * @param filters - Filter state (optional - uses persisted state if not provided)
   * @param forceRefresh - Force cache invalidation
   * @returns Object with allEvents, filteredEvents, and filterOptions
   */
  async getEventsWithFilters(
    repoPath: string,
    filters?: FilterState,
    forceRefresh = false
  ): Promise<{
    allEvents: CanonicalEvent[];
    filteredEvents: CanonicalEvent[];
    filterOptions: FilterOptions;
    appliedFilters: FilterState;
  }> {
    this.log.info(LogCategory.ORCHESTRATION, `Getting events with filters for ${repoPath}`, 'getEventsWithFilters');

    // Get all events (from cache or fetch)
    const allEvents = await this.getEvents(repoPath, forceRefresh);

    // Use provided filters OR get persisted filters for this repository
    const appliedFilters = filters || this.filterStateManager.getFilterState(repoPath);

    // Apply filters
    const filteredEvents = this.applyFilters(allEvents, appliedFilters);

    // Get filter options (computed from all events, not filtered)
    const filterOptions = await this.getFilterOptions(repoPath);

    this.log.info(LogCategory.ORCHESTRATION, `Filtered ${allEvents.length} → ${filteredEvents.length} events`, 'getEventsWithFilters');

    // DEBUG: Check if sources[] is present in events
    const eventsWithSources = allEvents.filter(e => e.sources && e.sources.length > 0);
    if (eventsWithSources.length > 0) {
      console.log(`[DataOrchestrator] DEBUG: ${eventsWithSources.length} events have sources[] populated`);
      const sampleEvent = eventsWithSources[0];
      console.log(`[DataOrchestrator] Sample event "${sampleEvent.title}":`, {
        canonicalId: sampleEvent.canonicalId,
        providerId: sampleEvent.providerId,
        hasSources: !!sampleEvent.sources,
        sourcesCount: sampleEvent.sources?.length,
        sources: sampleEvent.sources?.map(s => s.providerId)
      });
    } else {
      console.log(`[DataOrchestrator] WARNING: NO events have sources[] populated!`);
    }

    return {
      allEvents,
      filteredEvents,
      filterOptions,
      appliedFilters
    };
  }

  /**
   * Get filter options for a repository
   * Computed from events, not fetched separately
   *
   * @param repoPath - Repository path
   * @returns Filter options
   */
  async getFilterOptions(repoPath: string): Promise<FilterOptions> {
    this.log.info(LogCategory.ORCHESTRATION, `Getting filter options for ${repoPath}`, 'getFilterOptions');

    // Ensure we have data
    const cached = this.cache.get(repoPath);
    if (cached) {
      return cached.filterOptions;
    }

    // Fetch and compute
    const events = await this.getEvents(repoPath);
    return this.computeFilterOptions(events);
  }

  /**
   * Invalidate cache for a repository
   *
   * @param repoPath - Repository path (or undefined to clear all)
   */
  invalidateCache(repoPath?: string): void {
    if (repoPath) {
      this.log.info(LogCategory.ORCHESTRATION, `Invalidating cache for ${repoPath}`, 'invalidateCache');
      this.cache.delete(repoPath);
    } else {
      this.log.info(LogCategory.ORCHESTRATION, 'Clearing all caches', 'invalidateCache');
      this.cache.clear();
    }
  }

  /**
   * Update filter state for a repository (persists for session)
   *
   * @param repoPath - Repository path
   * @param filters - New filter state
   */
  updateFilterState(repoPath: string, filters: FilterState): void {
    this.log.info(LogCategory.ORCHESTRATION, `Updating filter state for ${repoPath}`, 'updateFilterState');
    this.filterStateManager.setFilterState(repoPath, filters);
  }

  /**
   * Get current filter state for a repository
   *
   * @param repoPath - Repository path
   * @returns Current filter state
   */
  getFilterState(repoPath: string): FilterState {
    return this.filterStateManager.getFilterState(repoPath);
  }

  /**
   * Reset filter state for a repository to "all visible"
   *
   * @param repoPath - Repository path
   */
  resetFilterState(repoPath: string): void {
    this.filterStateManager.resetFilterState(repoPath);
  }

  /**
   * Get filter state manager (for debugging/testing)
   */
  getFilterStateManager(): FilterStateManager {
    return this.filterStateManager;
  }

  /**
   * Get provider registry (for UI to toggle providers)
   */
  getProviderRegistry(): ProviderRegistry {
    return this.providerRegistry;
  }

  /**
   * Enable or disable a provider and invalidate cache
   */
  setProviderEnabled(providerId: string, enabled: boolean): void {
    this.log.info(LogCategory.ORCHESTRATION, `Setting provider ${providerId} enabled=${enabled}`, 'setProviderEnabled');

    this.providerRegistry.setProviderEnabled(providerId, enabled);

    // Invalidate cache to trigger fresh fetch with new provider state
    this.invalidateCache();
  }

  /**
   * Check if a provider is enabled
   */
  isProviderEnabled(providerId: string): boolean {
    return this.providerRegistry.isProviderEnabled(providerId);
  }

  /**
   * Get list of enabled provider IDs
   * Used to communicate active providers to frontend for sync mode availability
   */
  getEnabledProviderIds(): string[] {
    return this.providerRegistry.getEnabledProviders().map(p => p.id);
  }

  // ==========================================
  // PRIVATE METHODS
  // ==========================================

  /**
   * Fetch events from all healthy providers and deduplicate
   */
  private async fetchFromProviders(repoPath: string): Promise<CanonicalEvent[]> {
    const providers = this.providerRegistry.getHealthyProviders();
    const allEvents: CanonicalEvent[] = [];

    this.log.info(LogCategory.ORCHESTRATION, `Fetching from ${providers.length} providers`, 'fetchFromProviders', undefined, LogPathway.DATA_INGESTION);

    for (const provider of providers) {
      try {
        this.log.info(LogCategory.ORCHESTRATION, `Fetching from ${provider.id}`, 'fetchFromProviders', undefined, LogPathway.DATA_INGESTION);

        const context: ProviderContext = {
          repoPath,
          workspaceRoot: repoPath,
          activeFile: undefined
        };

        const events = await provider.fetchEvents(context);
        allEvents.push(...events);

        this.log.info(LogCategory.ORCHESTRATION, `Provider ${provider.id} returned ${events.length} events`, 'fetchFromProviders', undefined, LogPathway.DATA_INGESTION);

      } catch (error) {
        this.log.error(LogCategory.ORCHESTRATION, `Provider ${provider.id} failed: ${error}`, 'fetchFromProviders', undefined, LogPathway.DATA_INGESTION);
        // Continue with other providers
      }
    }

    // ALWAYS deduplicate to ensure sources[] is populated
    // This is critical for sync state detection even with single provider
    this.log.info(LogCategory.ORCHESTRATION, `Deduplicating ${allEvents.length} events from ${providers.length} provider(s)`, 'fetchFromProviders', undefined, LogPathway.DATA_INGESTION);
    const result = this.eventMatcher.deduplicateEvents(allEvents);
    this.log.info(
      LogCategory.ORCHESTRATION,
      `Deduplication: ${result.stats.totalInput} → ${result.stats.totalOutput} events (${result.stats.duplicatesRemoved} duplicates, ${result.stats.mergedCount} merged)`,
      'fetchFromProviders',
      undefined,
      LogPathway.DATA_INGESTION
    );
    return result.events;
  }

  /**
   * Apply filters to events - Unified Selection with AND Logic
   *
   * Pure function: events[] + filters → filtered events[]
   * NO transformation, just filtering
   *
   * AND Logic: Event must match ALL specified criteria to pass
   * Undefined filter = show all (permissive)
   *
   * Multi-Provider Ready: Works with git, GitHub, agent-brain events
   * Supports both legacy (branches, authors) and new (selectedBranches, selectedAuthors) field names
   */
  private applyFilters(events: CanonicalEvent[], filters: FilterState): CanonicalEvent[] {
    this.log.info(LogCategory.ORCHESTRATION, `Applying filters to ${events.length} events`, 'applyFilters', filters, LogPathway.FILTER_APPLY);

    let filteredCount = 0;
    let rejectedByBranch = 0;
    let rejectedByAuthor = 0;
    let rejectedByType = 0;

    const result = events.filter(event => {
      // ========================================
      // 1. BRANCH FILTER (Inclusion)
      // ========================================
      // Support both old (branches) and new (selectedBranches) field names
      const branchFilter = filters.selectedBranches || filters.branches;
      // IMPORTANT: Check for !== undefined, not &&, because empty array [] is truthy but means "show nothing"
      if (branchFilter !== undefined && branchFilter.length > 0) {
        const hasMatchingBranch = event.branches.some(
          branch => branchFilter.includes(branch)
        );
        if (!hasMatchingBranch) {
          rejectedByBranch++;
          return false; // AND: fail if no branch match
        }
      } else if (branchFilter !== undefined && branchFilter.length === 0) {
        // Empty array means "select none" - reject all events
        rejectedByBranch++;
        return false;
      }

      // ========================================
      // 2. AUTHOR FILTER (Inclusion)
      // ========================================
      // Support both old (authors) and new (selectedAuthors) field names
      const authorFilter = filters.selectedAuthors || filters.authors;
      // IMPORTANT: Check for !== undefined, not &&, because empty array [] is truthy but means "show nothing"
      if (authorFilter !== undefined && authorFilter.length > 0) {
        const primaryAuthorMatches = authorFilter.includes(event.author.name);
        const coAuthorMatches = event.coAuthors?.some(
          ca => authorFilter.includes(ca.name)
        );
        if (!primaryAuthorMatches && !coAuthorMatches) {
          rejectedByAuthor++;
          return false; // AND: fail if no author match
        }
      } else if (authorFilter !== undefined && authorFilter.length === 0) {
        // Empty array means "select none" - reject all events
        rejectedByAuthor++;
        return false;
      }

      // ========================================
      // 3. EVENT TYPE FILTER (Inclusion + Legacy Exclusion Support)
      // ========================================
      // New inclusion model
      // IMPORTANT: Check for !== undefined, not &&, because empty array [] is truthy but means "show nothing"
      if (filters.selectedEventTypes !== undefined && filters.selectedEventTypes.length > 0) {
        if (!filters.selectedEventTypes.includes(event.type)) {
          rejectedByType++;
          return false; // AND: fail if type not selected
        }
      } else if (filters.selectedEventTypes !== undefined && filters.selectedEventTypes.length === 0) {
        // Empty array means "select none" - reject all events
        rejectedByType++;
        return false;
      }
      // Legacy exclusion model (for backward compatibility)
      if (filters.excludedEventTypes && filters.excludedEventTypes.length > 0) {
        if (filters.excludedEventTypes.includes(event.type)) {
          rejectedByType++;
          return false;
        }
      }

      // ========================================
      // 4. PROVIDER FILTER (Inclusion)
      // ========================================
      // Support both old (providers) and new (selectedProviders) field names
      const providerFilter = filters.selectedProviders || filters.providers;
      // IMPORTANT: Check for !== undefined, not &&, because empty array [] is truthy but means "show nothing"
      if (providerFilter !== undefined && providerFilter.length > 0) {
        if (!providerFilter.includes(event.providerId)) {
          return false; // AND: fail if provider not selected
        }
      } else if (providerFilter !== undefined && providerFilter.length === 0) {
        // Empty array means "select none" - reject all events
        return false;
      }

      // ========================================
      // 5. DATE RANGE FILTER
      // ========================================
      if (filters.dateRange) {
        if (event.timestamp < filters.dateRange.start ||
            event.timestamp > filters.dateRange.end) {
          return false; // AND: fail if outside date range
        }
      }

      // ========================================
      // 6. SEARCH QUERY FILTER
      // ========================================
      // Search in title, description, and hash
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const titleMatch = event.title.toLowerCase().includes(query);
        const descMatch = event.description?.toLowerCase().includes(query);
        const hashMatch = event.hash?.toLowerCase().includes(query);

        if (!titleMatch && !descMatch && !hashMatch) {
          return false; // AND: fail if no search match
        }
      }

      // ========================================
      // 7. TAG FILTER (Inclusion)
      // ========================================
      // Support both old (tags) and new (selectedTags) field names
      const tagFilter = filters.selectedTags || filters.tags;
      if (tagFilter && tagFilter.length > 0) {
        const hasMatchingTag = event.tags?.some(
          tag => tagFilter.includes(tag)
        );
        if (!hasMatchingTag) {
          return false; // AND: fail if no tag match
        }
      }

      // ========================================
      // 8. LABEL FILTER (Inclusion)
      // ========================================
      // Useful for GitHub issues/PRs, agent-brain categories
      if (filters.selectedLabels && filters.selectedLabels.length > 0) {
        const hasMatchingLabel = event.labels?.some(
          label => filters.selectedLabels!.includes(label)
        );
        if (!hasMatchingLabel) {
          return false; // AND: fail if no label match
        }
      }

      // ========================================
      // PASS: Event matches all specified criteria
      // ========================================
      filteredCount++;
      return true;
    });

    this.log.info(
      LogCategory.ORCHESTRATION,
      `Filter results: ${result.length} passed (rejected: branch=${rejectedByBranch}, author=${rejectedByAuthor}, type=${rejectedByType})`,
      'applyFilters',
      undefined,
      LogPathway.FILTER_APPLY
    );

    return result;
  }

  /**
   * Compute filter options from events
   * Analyzes events[] to build FilterOptions
   */
  private computeFilterOptions(events: CanonicalEvent[]): FilterOptions {
    const branches = new Set<string>();
    const authors = new Set<string>();
    const types = new Set<EventType>();
    const providers = new Set<string>();
    const tags = new Set<string>();
    const labels = new Set<string>();

    let earliest: Date | undefined;
    let latest: Date | undefined;

    events.forEach(event => {
      // Collect all branches (FLATTEN branches[] array)
      event.branches.forEach(branch => branches.add(branch));

      // Collect all authors (primary + co-authors)
      authors.add(event.author.name);
      event.coAuthors?.forEach(ca => authors.add(ca.name));

      // Collect types and providers
      types.add(event.type);
      providers.add(event.providerId);

      // Collect tags and labels
      event.tags?.forEach(tag => tags.add(tag));
      event.labels?.forEach(label => labels.add(label));

      // Track date range
      if (!earliest || event.timestamp < earliest) {
        earliest = event.timestamp;
      }
      if (!latest || event.timestamp > latest) {
        latest = event.timestamp;
      }
    });

    return {
      branches: Array.from(branches).sort(),
      authors: Array.from(authors).sort(),
      eventTypes: Array.from(types),
      providers: Array.from(providers),
      dateRange: {
        earliest: earliest || new Date(),
        latest: latest || new Date()
      },
      tags: tags.size > 0 ? Array.from(tags).sort() : undefined,
      labels: labels.size > 0 ? Array.from(labels).sort() : undefined
    };
  }

  /**
   * Check if cache is valid for a repository
   */
  private isCacheValid(repoPath: string): boolean {
    const cached = this.cache.get(repoPath);
    if (!cached) {
      return false;
    }

    const age = Date.now() - cached.fetchedAt.getTime();
    return age < this.cacheTTL;
  }

  /**
   * Dispose orchestrator resources
   */
  async dispose(): Promise<void> {
    this.log.info(LogCategory.ORCHESTRATION, 'Disposing...', 'dispose');
    this.cache.clear();
    // Provider registry cleanup would go here
  }
}
