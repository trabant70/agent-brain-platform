/**
 * DataOrchestrator - Refactored Facade
 *
 * REFACTORED: Now a clean facade coordinating specialized services.
 * Reduced from 847 lines to ~300 lines.
 *
 * Delegates to:
 * - EventCacheService (Caching with TTL)
 * - EventFilterService (Complex filtering logic)
 * - ProviderCoordinator (Provider lifecycle)
 * - RuntimeEventManager (Runtime events)
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import {
  CanonicalEvent,
  FilterOptions,
  FilterState
} from '../../events';
import { FilterStateManager } from '../filters/FilterStateManager';
import { EventMatcher } from './EventMatcher';
import { logger, LogCategory, LogPathway, createContextLogger } from '../../../infrastructure/logging';

// Specialized services (NEW - Facade Pattern)
import {
  EventCacheService,
  EventFilterService,
  ProviderCoordinator,
  ProviderSettings,
  RuntimeEventManager
} from './services';

export interface DataOrchestratorOptions {
  cacheTTL?: number;
  workspaceRoot: string; // REQUIRED
  providerSettings?: ProviderSettings;
}

/**
 * Simplified DataOrchestrator
 * Manages data fetching, caching, and filtering with zero transformations
 */
export class DataOrchestrator {
  private readonly log = createContextLogger(LogCategory.ORCHESTRATION);

  // Filter state manager for per-repository filter persistence
  private filterStateManager: FilterStateManager;

  // Event matcher for deduplication
  private eventMatcher: EventMatcher;

  // Options
  private workspaceRoot: string;
  private storagePath: string;
  private providerSettings: ProviderSettings;

  // Current state
  private currentRepoPath: string = '';

  // Specialized services (NEW)
  private cacheService: EventCacheService;
  private filterService: EventFilterService;
  private providerCoordinator: ProviderCoordinator;
  private runtimeEventManager: RuntimeEventManager;

  constructor(options: DataOrchestratorOptions) {
    // Validate required workspaceRoot
    if (!options.workspaceRoot) {
      throw new Error('DataOrchestrator requires workspaceRoot in options');
    }

    // Validate workspaceRoot doesn't end with .agent-brain
    if (options.workspaceRoot.endsWith('.agent-brain')) {
      throw new Error(
        `workspaceRoot should not end with .agent-brain. ` +
        `Received: ${options.workspaceRoot}. ` +
        `Expected workspace root directory (e.g., /workspace).`
      );
    }

    this.workspaceRoot = options.workspaceRoot;
    this.storagePath = path.join(this.workspaceRoot, '.agent-brain');
    this.providerSettings = this.getProviderSettings(options.providerSettings);

    // Initialize legacy components
    this.filterStateManager = new FilterStateManager();
    this.eventMatcher = new EventMatcher();

    // Initialize services
    this.cacheService = new EventCacheService(options.cacheTTL);
    this.filterService = new EventFilterService();
    this.providerCoordinator = new ProviderCoordinator(
      this.workspaceRoot,
      this.providerSettings
    );
    this.runtimeEventManager = new RuntimeEventManager();

    this.log.info(
      LogCategory.ORCHESTRATION,
      'DataOrchestrator constructed with simplified architecture',
      'constructor',
      {
        cacheTTL: options.cacheTTL,
        workspaceRoot: this.workspaceRoot,
        storagePath: this.storagePath,
        providerSettings: this.providerSettings
      },
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
      { providerSettings: this.providerSettings },
      LogPathway.DATA_INGESTION
    );

    // Ensure storage directory exists
    await this.ensureStorageDirectory();

    // Initialize providers (delegated to ProviderCoordinator)
    await this.providerCoordinator.initialize();

    this.log.info(
      LogCategory.ORCHESTRATION,
      'Initialization complete',
      'initialize',
      { registeredProviders: this.providerCoordinator.getEnabledProviderIds() },
      LogPathway.DATA_INGESTION
    );
  }

  /**
   * Get events for a repository
   * Returns cached data if available, fetches if not
   */
  async getEvents(repoPath: string, forceRefresh = false): Promise<CanonicalEvent[]> {
    this.log.info(
      LogCategory.ORCHESTRATION,
      `Getting events for ${repoPath}`,
      'getEvents',
      undefined,
      LogPathway.DATA_INGESTION
    );

    // Check cache (delegated to EventCacheService)
    if (!forceRefresh) {
      const cachedEvents = this.cacheService.getCachedEvents(repoPath);
      if (cachedEvents) {
        this.log.info(
          LogCategory.ORCHESTRATION,
          'Returning cached events',
          'getEvents',
          undefined,
          LogPathway.DATA_INGESTION
        );
        return cachedEvents;
      }
    }

    // Fetch from providers (delegated to ProviderCoordinator)
    this.log.info(
      LogCategory.ORCHESTRATION,
      'Fetching fresh events from providers',
      'getEvents',
      undefined,
      LogPathway.DATA_INGESTION
    );

    const providerEvents = await this.providerCoordinator.fetchFromProviders(
      repoPath,
      this.eventMatcher
    );

    // Merge with runtime events (delegated to RuntimeEventManager)
    const events = this.runtimeEventManager.mergeWithRuntimeEvents(providerEvents);

    // Compute filter options (delegated to EventFilterService)
    const filterOptions = this.filterService.computeFilterOptions(events);

    // Cache (delegated to EventCacheService)
    this.cacheService.setCachedEvents(repoPath, events, filterOptions);

    this.currentRepoPath = repoPath;

    this.log.info(
      LogCategory.ORCHESTRATION,
      `Cached ${events.length} events (${providerEvents.length} from providers + ${this.runtimeEventManager.getRuntimeEventCount()} runtime)`,
      'getEvents',
      undefined,
      LogPathway.DATA_INGESTION
    );

    return events;
  }

  /**
   * Get filtered events for a repository
   */
  async getFilteredEvents(
    repoPath: string,
    filters: FilterState,
    forceRefresh = false
  ): Promise<CanonicalEvent[]> {
    this.log.info(
      LogCategory.ORCHESTRATION,
      `Getting filtered events for ${repoPath}`,
      'getFilteredEvents'
    );

    // Get all events (from cache or fetch)
    const allEvents = await this.getEvents(repoPath, forceRefresh);

    // Apply filters (delegated to EventFilterService)
    const filtered = this.filterService.applyFilters(allEvents, filters);

    this.log.info(
      LogCategory.ORCHESTRATION,
      `Filtered ${allEvents.length} → ${filtered.length} events`,
      'getFilteredEvents'
    );

    return filtered;
  }

  /**
   * Get both all events and filtered events for a repository
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
    this.log.info(
      LogCategory.ORCHESTRATION,
      `Getting events with filters for ${repoPath}`,
      'getEventsWithFilters'
    );

    // Get all events (from cache or fetch)
    const allEvents = await this.getEvents(repoPath, forceRefresh);

    // Use provided filters OR get persisted filters for this repository
    const appliedFilters = filters || this.filterStateManager.getFilterState(repoPath);

    // Apply filters (delegated to EventFilterService)
    const filteredEvents = this.filterService.applyFilters(allEvents, appliedFilters);

    // Get filter options (delegated to EventFilterService)
    const filterOptions = await this.getFilterOptions(repoPath);

    this.log.info(
      LogCategory.ORCHESTRATION,
      `Filtered ${allEvents.length} → ${filteredEvents.length} events`,
      'getEventsWithFilters'
    );

    return {
      allEvents,
      filteredEvents,
      filterOptions,
      appliedFilters
    };
  }

  /**
   * Get filter options for a repository
   */
  async getFilterOptions(repoPath: string): Promise<FilterOptions> {
    this.log.info(
      LogCategory.ORCHESTRATION,
      `Getting filter options for ${repoPath}`,
      'getFilterOptions'
    );

    // Check cache
    const cached = this.cacheService.getCachedData(repoPath);
    if (cached) {
      return cached.filterOptions;
    }

    // Fetch and compute
    const events = await this.getEvents(repoPath);
    return this.filterService.computeFilterOptions(events);
  }

  /**
   * Invalidate cache for a repository (delegated to EventCacheService)
   */
  invalidateCache(repoPath?: string): void {
    this.cacheService.invalidateCache(repoPath);
  }

  /**
   * Update filter state for a repository
   */
  updateFilterState(repoPath: string, filters: FilterState): void {
    this.log.info(
      LogCategory.ORCHESTRATION,
      `Updating filter state for ${repoPath}`,
      'updateFilterState'
    );
    this.filterStateManager.setFilterState(repoPath, filters);
  }

  /**
   * Get current filter state for a repository
   */
  getFilterState(repoPath: string): FilterState {
    return this.filterStateManager.getFilterState(repoPath);
  }

  /**
   * Reset filter state for a repository
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
  getProviderRegistry(): any {
    return this.providerCoordinator.getProviderRegistry();
  }

  /**
   * Enable or disable a provider (delegated to ProviderCoordinator)
   */
  setProviderEnabled(providerId: string, enabled: boolean): void {
    this.log.info(
      LogCategory.ORCHESTRATION,
      `Setting provider ${providerId} enabled=${enabled}`,
      'setProviderEnabled'
    );

    this.providerCoordinator.setProviderEnabled(providerId, enabled);

    // Invalidate cache to trigger fresh fetch
    this.invalidateCache();
  }

  /**
   * Check if a provider is enabled (delegated to ProviderCoordinator)
   */
  isProviderEnabled(providerId: string): boolean {
    return this.providerCoordinator.isProviderEnabled(providerId);
  }

  /**
   * Get list of enabled provider IDs (delegated to ProviderCoordinator)
   */
  getEnabledProviderIds(): string[] {
    return this.providerCoordinator.getEnabledProviderIds();
  }

  /**
   * Add a runtime event (delegated to RuntimeEventManager)
   */
  addRuntimeEvent(event: CanonicalEvent): void {
    this.runtimeEventManager.addRuntimeEvent(event);

    // Invalidate cache to force re-merge with runtime events
    if (this.currentRepoPath) {
      this.invalidateCache(this.currentRepoPath);
    }
  }

  /**
   * Clear all runtime events (delegated to RuntimeEventManager)
   */
  clearRuntimeEvents(): void {
    this.runtimeEventManager.clearRuntimeEvents();

    if (this.currentRepoPath) {
      this.invalidateCache(this.currentRepoPath);
    }
  }

  /**
   * Ensure storage directory exists
   */
  private async ensureStorageDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.storagePath, { recursive: true });
      this.log.debug(
        LogCategory.ORCHESTRATION,
        `Storage directory ready: ${this.storagePath}`,
        'ensureStorageDirectory',
        undefined,
        LogPathway.DATA_INGESTION
      );
    } catch (error) {
      this.log.error(
        LogCategory.ORCHESTRATION,
        `Failed to create storage directory: ${error}`,
        'ensureStorageDirectory',
        error,
        LogPathway.DATA_INGESTION
      );
      throw error;
    }
  }

  /**
   * Get provider settings with defaults
   */
  private getProviderSettings(settings?: Partial<ProviderSettings>): ProviderSettings {
    const defaults: ProviderSettings = {
      gitLocal: true,
      github: false,
      knowledgeEvents: true,
      sessionJournals: true
    };

    return {
      gitLocal: settings?.gitLocal ?? defaults.gitLocal,
      github: settings?.github ?? defaults.github,
      knowledgeEvents: settings?.knowledgeEvents ?? defaults.knowledgeEvents,
      sessionJournals: settings?.sessionJournals ?? defaults.sessionJournals
    };
  }

  /**
   * Dispose orchestrator resources
   */
  async dispose(): Promise<void> {
    this.log.info(LogCategory.ORCHESTRATION, 'Disposing...', 'dispose');
    this.cacheService.dispose();
    this.runtimeEventManager.clearRuntimeEvents();
  }
}
