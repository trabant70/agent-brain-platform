/**
 * RepositoryFilterMemoryService - Centralized repository filter memory management
 *
 * This service encapsulates all repository-specific filter memory logic,
 * ensuring consistent behavior according to the defined rules:
 *
 * RULES IMPLEMENTED:
 * 1. First time in repo A: show all filters selected
 * 2. Setting filters in repo A: save to repo A's memory
 * 3. Reload in repo A: preserve repo A's filter settings
 * 4. Switch to repo B: show all filters selected (first time) or restore saved filters
 * 5. Filter changes in repo B: save to repo B's memory
 * 6. Same repo file changes: no filter changes
 * 7. Reload in repo B: preserve repo B's filters
 * 8. Return to repo A: restore repo A's last filter state
 * 9. Return to repo B: restore repo B's last filter state
 */

import { FilterState, AvailableOptions } from './timeline-types';

export interface RepositoryContext {
    repositoryPath: string;
    hasBeenVisited: boolean;
    lastVisited: Date;
}

export interface FilterMemoryEntry {
    filters: FilterState;
    lastUpdated: Date;
    visitCount: number;
}

export class RepositoryFilterMemoryService {
    private static instance: RepositoryFilterMemoryService | null = null;

    private repositoryFilterMemory: Map<string, FilterMemoryEntry> = new Map();
    private currentRepositoryPath: string | null = null;
    private sessionStartTime: Date = new Date();

    // Singleton pattern to ensure memory persists across data manager instances
    public static getInstance(): RepositoryFilterMemoryService {
        if (!RepositoryFilterMemoryService.instance) {
            RepositoryFilterMemoryService.instance = new RepositoryFilterMemoryService();
            console.log('RepositoryFilterMemory: Created new singleton instance');
        }
        return RepositoryFilterMemoryService.instance;
    }

    // Private constructor to enforce singleton
    private constructor() {
        console.log('RepositoryFilterMemory: Initializing singleton service...');
    }

    /**
     * RULE 1 & 4: Handle repository switching with proper filter initialization
     * - New repositories get all filters selected
     * - Previously visited repositories get their saved filters restored
     */
    handleRepositorySwitch(newRepositoryPath: string, availableOptions: AvailableOptions): FilterState {
        console.log('RepositoryFilterMemory: Handling repository switch', {
            from: this.currentRepositoryPath,
            to: newRepositoryPath,
            isNew: !this.repositoryFilterMemory.has(newRepositoryPath)
        });

        // Save current repository's filters before switching (if we have a current repo)
        if (this.currentRepositoryPath) {
            console.log('RepositoryFilterMemory: Auto-saving filters for previous repository:', this.currentRepositoryPath);
        }

        // Update current repository context
        this.currentRepositoryPath = newRepositoryPath;

        if (this.repositoryFilterMemory.has(newRepositoryPath)) {
            // RULE 8 & 9: Repository has been visited before - restore saved filters
            const memoryEntry = this.repositoryFilterMemory.get(newRepositoryPath)!;
            console.log('RepositoryFilterMemory: Restoring saved filters for repository:', newRepositoryPath, {
                branches: Array.from(memoryEntry.filters.branches),
                eventTypes: Array.from(memoryEntry.filters.eventTypes),
                authors: Array.from(memoryEntry.filters.authors),
                lastUpdated: memoryEntry.lastUpdated,
                visitCount: memoryEntry.visitCount
            });

            // Update visit count and last visited time
            memoryEntry.visitCount++;
            memoryEntry.lastUpdated = new Date();

            return this.cloneFilterState(memoryEntry.filters);
        } else {
            // RULE 1 & 4: New repository - initialize with all filters selected
            console.log('RepositoryFilterMemory: New repository detected, initializing with all filters selected:', newRepositoryPath);
            const allSelectedFilters = this.createAllSelectedFilterState(availableOptions);

            // Save to memory immediately
            this.repositoryFilterMemory.set(newRepositoryPath, {
                filters: this.cloneFilterState(allSelectedFilters),
                lastUpdated: new Date(),
                visitCount: 1
            });

            console.log('RepositoryFilterMemory: Initialized filters for new repository:', {
                repository: newRepositoryPath,
                branches: Array.from(allSelectedFilters.branches),
                eventTypes: Array.from(allSelectedFilters.eventTypes),
                authors: Array.from(allSelectedFilters.authors)
            });

            return allSelectedFilters;
        }
    }

    /**
     * RULE 2 & 5: Handle filter updates within current repository
     */
    updateFiltersForCurrentRepository(filterType: keyof FilterState, values: any): void {
        if (!this.currentRepositoryPath) {
            console.warn('RepositoryFilterMemory: Cannot update filters - no current repository set');
            return;
        }

        console.log('RepositoryFilterMemory: Updating filters for current repository:', this.currentRepositoryPath, {
            filterType,
            values
        });

        if (!this.repositoryFilterMemory.has(this.currentRepositoryPath)) {
            console.warn('RepositoryFilterMemory: Repository not in memory, cannot update filters:', this.currentRepositoryPath);
            return;
        }

        const memoryEntry = this.repositoryFilterMemory.get(this.currentRepositoryPath)!;

        // Update the specific filter type
        switch (filterType) {
            case 'branches':
                memoryEntry.filters.branches = new Set(values);
                break;
            case 'eventTypes':
                memoryEntry.filters.eventTypes = new Set(values);
                break;
            case 'authors':
                memoryEntry.filters.authors = new Set(values);
                break;
            case 'dateRange':
                memoryEntry.filters.dateRange = values;
                break;
        }

        memoryEntry.lastUpdated = new Date();

        console.log('RepositoryFilterMemory: Updated filters saved for repository:', this.currentRepositoryPath, {
            branches: Array.from(memoryEntry.filters.branches),
            eventTypes: Array.from(memoryEntry.filters.eventTypes),
            authors: Array.from(memoryEntry.filters.authors)
        });
    }

    /**
     * RULE 3 & 7: Handle reloads - preserve current repository's filters
     */
    handleReload(): FilterState | null {
        if (!this.currentRepositoryPath) {
            console.warn('RepositoryFilterMemory: Cannot handle reload - no current repository set');
            return null;
        }

        console.log('RepositoryFilterMemory: Handling reload for repository:', this.currentRepositoryPath);

        if (this.repositoryFilterMemory.has(this.currentRepositoryPath)) {
            const memoryEntry = this.repositoryFilterMemory.get(this.currentRepositoryPath)!;
            console.log('RepositoryFilterMemory: Preserving filters during reload:', {
                repository: this.currentRepositoryPath,
                branches: Array.from(memoryEntry.filters.branches),
                eventTypes: Array.from(memoryEntry.filters.eventTypes),
                authors: Array.from(memoryEntry.filters.authors)
            });

            return this.cloneFilterState(memoryEntry.filters);
        }

        console.warn('RepositoryFilterMemory: Repository not in memory during reload:', this.currentRepositoryPath);
        return null;
    }

    /**
     * RULE 6: Check if repository has actually changed (for same-repo file switches)
     */
    hasRepositoryChanged(newRepositoryPath: string): boolean {
        const hasChanged = this.currentRepositoryPath !== newRepositoryPath;
        console.log('RepositoryFilterMemory: Repository change check:', {
            current: this.currentRepositoryPath,
            new: newRepositoryPath,
            hasChanged
        });
        return hasChanged;
    }

    /**
     * Reset filters for current repository (back to all selected)
     */
    resetFiltersForCurrentRepository(availableOptions: AvailableOptions): FilterState {
        if (!this.currentRepositoryPath) {
            console.warn('RepositoryFilterMemory: Cannot reset filters - no current repository set');
            return this.createAllSelectedFilterState(availableOptions);
        }

        console.log('RepositoryFilterMemory: Resetting filters for repository:', this.currentRepositoryPath);

        const allSelectedFilters = this.createAllSelectedFilterState(availableOptions);

        // Update memory with reset filters
        this.repositoryFilterMemory.set(this.currentRepositoryPath, {
            filters: this.cloneFilterState(allSelectedFilters),
            lastUpdated: new Date(),
            visitCount: this.repositoryFilterMemory.get(this.currentRepositoryPath)?.visitCount || 1
        });

        console.log('RepositoryFilterMemory: Filters reset to all selected for repository:', this.currentRepositoryPath);

        return allSelectedFilters;
    }

    /**
     * Get current repository information
     */
    getCurrentRepository(): string | null {
        return this.currentRepositoryPath;
    }

    /**
     * Get current repository's filter state
     */
    getCurrentRepositoryFilters(): FilterState | null {
        if (!this.currentRepositoryPath || !this.repositoryFilterMemory.has(this.currentRepositoryPath)) {
            return null;
        }

        const memoryEntry = this.repositoryFilterMemory.get(this.currentRepositoryPath)!;
        return this.cloneFilterState(memoryEntry.filters);
    }

    /**
     * Clear all repository filter memory (session reset)
     */
    clearAllRepositoryMemory(): void {
        console.log('RepositoryFilterMemory: Clearing all repository filter memory');
        this.repositoryFilterMemory.clear();
        this.currentRepositoryPath = null;
        this.sessionStartTime = new Date();
    }

    /**
     * Reset singleton instance (for extension cleanup/testing)
     */
    public static resetInstance(): void {
        console.log('RepositoryFilterMemory: Resetting singleton instance');
        RepositoryFilterMemoryService.instance = null;
    }

    /**
     * Clear specific repository from memory
     */
    clearRepositoryMemory(repositoryPath: string): void {
        console.log('RepositoryFilterMemory: Clearing memory for repository:', repositoryPath);
        this.repositoryFilterMemory.delete(repositoryPath);

        if (this.currentRepositoryPath === repositoryPath) {
            this.currentRepositoryPath = null;
        }
    }

    /**
     * Get memory statistics for debugging
     */
    getMemoryStats(): any {
        return {
            sessionStartTime: this.sessionStartTime,
            currentRepository: this.currentRepositoryPath,
            repositoriesInMemory: this.repositoryFilterMemory.size,
            repositories: Array.from(this.repositoryFilterMemory.entries()).map(([path, entry]) => ({
                path,
                visitCount: entry.visitCount,
                lastUpdated: entry.lastUpdated,
                hasFilters: {
                    branches: entry.filters.branches.size,
                    eventTypes: entry.filters.eventTypes.size,
                    authors: entry.filters.authors.size
                }
            }))
        };
    }

    // ===== PRIVATE HELPER METHODS =====

    private createAllSelectedFilterState(availableOptions: AvailableOptions): FilterState {
        return {
            branches: new Set(availableOptions.branches.map(b => b.name)),
            eventTypes: new Set(availableOptions.eventTypes.map(et => et.type)),
            authors: new Set(availableOptions.authors.map(a => a.name)),
            dateRange: [null, null]
        };
    }

    private cloneFilterState(filterState: FilterState): FilterState {
        return {
            branches: new Set(filterState.branches),
            eventTypes: new Set(filterState.eventTypes),
            authors: new Set(filterState.authors),
            dateRange: [...filterState.dateRange] as [Date | null, Date | null]
        };
    }
}