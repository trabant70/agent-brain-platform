/**
 * FilterStateManager - Session-level Filter State Persistence
 *
 * Responsibilities:
 * - Store filter state per repository path
 * - Restore filter state when switching repositories
 * - Initialize to "all visible" on first access to a repository
 * - Persist for session duration only (in-memory, no disk storage)
 *
 * Design Philosophy:
 * - Each repository starts with empty filter state (all events visible)
 * - Once user applies filters, they are remembered for that repository
 * - Switching between repositories preserves each repo's filter configuration
 * - Clearing cache does NOT reset filter states (they're independent)
 *
 * Future Extensions:
 * - Provider-specific filter states (for agent-brain, etc.)
 * - Filter presets/templates
 * - Export/import filter configurations
 */

import { FilterState } from '@agent-brain/core/domains/events';
import { logger, LogCategory, LogPathway } from '../utils/Logger';

export interface FilterStateManagerOptions {
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Manages filter states for multiple repositories in a session
 */
export class FilterStateManager {
  // Repository path → FilterState mapping
  private repoFilters: Map<string, FilterState> = new Map();

  // Track current repository for debugging
  private currentRepoPath: string | null = null;

  constructor(options: FilterStateManagerOptions = {}) {
    logger.debug(
      LogCategory.ORCHESTRATION,
      'FilterStateManager initialized',
      'FilterStateManager.constructor',
      undefined,
      LogPathway.STATE_PERSIST
    );
  }

  /**
   * Get filter state for a repository
   * Returns empty state {} if repository hasn't been accessed before
   *
   * @param repoPath - Repository path (unique identifier)
   * @returns FilterState for this repository
   */
  getFilterState(repoPath: string): FilterState {
    if (!this.repoFilters.has(repoPath)) {
      // Initialize to "all visible" (empty filter state)
      logger.debug(
        LogCategory.ORCHESTRATION,
        `Initializing filter state for new repo: ${repoPath}`,
        'FilterStateManager.getFilterState',
        { repoPath },
        LogPathway.STATE_PERSIST
      );
      this.repoFilters.set(repoPath, {});
    }

    this.currentRepoPath = repoPath;
    return this.repoFilters.get(repoPath)!;
  }

  /**
   * Set filter state for a repository
   * Overwrites existing state completely
   *
   * @param repoPath - Repository path
   * @param filters - New filter state
   */
  setFilterState(repoPath: string, filters: FilterState): void {
    logger.debug(
      LogCategory.ORCHESTRATION,
      `Updating filter state for ${repoPath}`,
      'FilterStateManager.setFilterState',
      { repoPath, filters },
      LogPathway.STATE_PERSIST
    );
    this.repoFilters.set(repoPath, filters);
    this.currentRepoPath = repoPath;
  }

  /**
   * Update specific filter fields without overwriting entire state
   *
   * @param repoPath - Repository path
   * @param updates - Partial filter state to merge
   */
  updateFilterState(repoPath: string, updates: Partial<FilterState>): void {
    const current = this.getFilterState(repoPath);
    const merged = { ...current, ...updates };
    this.setFilterState(repoPath, merged);
  }

  /**
   * Reset filter state for a repository to "all visible"
   *
   * @param repoPath - Repository path
   */
  resetFilterState(repoPath: string): void {
    logger.debug(
      LogCategory.ORCHESTRATION,
      `Resetting filter state for ${repoPath}`,
      'FilterStateManager.resetFilterState',
      { repoPath },
      LogPathway.STATE_PERSIST
    );
    this.repoFilters.set(repoPath, {});
  }

  /**
   * Clear all filter states (useful for testing or reset scenarios)
   */
  clearAll(): void {
    logger.debug(
      LogCategory.ORCHESTRATION,
      'Clearing all filter states',
      'FilterStateManager.clearAll',
      { count: this.repoFilters.size },
      LogPathway.STATE_PERSIST
    );
    this.repoFilters.clear();
    this.currentRepoPath = null;
  }

  /**
   * Check if a repository has an active filter state
   * (Returns false if repository hasn't been accessed or has empty state)
   *
   * @param repoPath - Repository path
   * @returns true if filters are active
   */
  hasActiveFilters(repoPath: string): boolean {
    const state = this.repoFilters.get(repoPath);
    if (!state) return false;

    // Check if any filter fields are set (even empty arrays count as filters)
    return !!(
      state.selectedBranches !== undefined ||
      state.selectedAuthors !== undefined ||
      state.selectedEventTypes !== undefined ||
      state.selectedProviders !== undefined ||
      state.selectedTags !== undefined ||
      state.selectedLabels !== undefined ||
      state.searchQuery ||
      state.dateRange
    );
  }

  /**
   * Get all tracked repository paths
   *
   * @returns Array of repository paths with filter states
   */
  getTrackedRepositories(): string[] {
    return Array.from(this.repoFilters.keys());
  }

  /**
   * Get current repository path (last accessed)
   *
   * @returns Current repository path or null if none accessed yet
   */
  getCurrentRepoPath(): string | null {
    return this.currentRepoPath;
  }

  /**
   * Get debug information about filter states
   *
   * @returns Summary of all filter states
   */
  getDebugInfo(): { repoPath: string; hasFilters: boolean; filterState: FilterState }[] {
    return Array.from(this.repoFilters.entries()).map(([repoPath, filterState]) => ({
      repoPath,
      hasFilters: this.hasActiveFilters(repoPath),
      filterState
    }));
  }

  /**
   * Export filter states for persistence (future: save to workspace settings)
   *
   * @returns Serializable filter states
   */
  exportStates(): Record<string, FilterState> {
    const exported: Record<string, FilterState> = {};
    this.repoFilters.forEach((state, repoPath) => {
      exported[repoPath] = state;
    });
    return exported;
  }

  /**
   * Import filter states from external source (future: load from workspace settings)
   *
   * @param states - Filter states to import
   */
  importStates(states: Record<string, FilterState>): void {
    // Handle null/undefined gracefully
    if (!states) {
      logger.debug(
        LogCategory.ORCHESTRATION,
        'Importing 0 filter states (null/undefined input)',
        'FilterStateManager.importStates',
        { count: 0 },
        LogPathway.STATE_PERSIST
      );
      return;
    }

    logger.debug(
      LogCategory.ORCHESTRATION,
      `Importing ${Object.keys(states).length} filter states`,
      'FilterStateManager.importStates',
      { count: Object.keys(states).length },
      LogPathway.STATE_PERSIST
    );
    this.repoFilters.clear();
    Object.entries(states).forEach(([repoPath, state]) => {
      this.repoFilters.set(repoPath, state);
    });
  }

  /**
   * Dispose and cleanup resources
   */
  dispose(): void {
    logger.debug(
      LogCategory.ORCHESTRATION,
      'Disposing FilterStateManager',
      'FilterStateManager.dispose',
      undefined,
      LogPathway.STATE_PERSIST
    );
    this.clearAll();
  }
}
