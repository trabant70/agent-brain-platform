/**
 * Advanced Event Filtering System
 *
 * Supports multi-dimensional filtering across all data providers
 */

import { INormalizedEvent, NormalizedEventType } from '../../data/normalization/interfaces';

export interface IEventFilter {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly filterType: FilterType;

    /**
     * Apply the filter to a collection of events
     */
    apply(events: INormalizedEvent[], criteria: IFilterCriteria): Promise<INormalizedEvent[]>;

    /**
     * Check if an individual event passes the filter
     */
    passes(event: INormalizedEvent, criteria: IFilterCriteria): boolean;

    /**
     * Get available filter options for the given events
     */
    getAvailableOptions(events: INormalizedEvent[]): IFilterOptions;

    /**
     * Validate filter criteria
     */
    validateCriteria(criteria: IFilterCriteria): IFilterValidationResult;
}

export enum FilterType {
    TIME_RANGE = 'time-range',
    AUTHOR = 'author',
    EVENT_TYPE = 'event-type',
    SOURCE_PROVIDER = 'source-provider',
    PROJECT = 'project',
    BRANCH = 'branch',
    TAG = 'tag',
    TEXT_SEARCH = 'text-search',
    CUSTOM = 'custom',
    COMPOSITE = 'composite'
}

export interface IFilterCriteria {
    readonly filterType: FilterType;
    readonly values: any[];
    readonly operator: FilterOperator;
    readonly isInverted?: boolean; // NOT operation
    readonly caseSensitive?: boolean;
    readonly customOptions?: Record<string, any>;
}

export enum FilterOperator {
    EQUALS = 'equals',
    CONTAINS = 'contains',
    STARTS_WITH = 'starts-with',
    ENDS_WITH = 'ends-with',
    IN = 'in',
    NOT_IN = 'not-in',
    GREATER_THAN = 'greater-than',
    LESS_THAN = 'less-than',
    BETWEEN = 'between',
    REGEX = 'regex',
    AND = 'and',
    OR = 'or'
}

export interface IFilterOptions {
    readonly availableValues: any[];
    readonly valueType: 'string' | 'number' | 'date' | 'boolean' | 'object';
    readonly supportedOperators: FilterOperator[];
    readonly suggestions?: string[];
    readonly metadata?: Record<string, any>;
}

export interface IFilterValidationResult {
    readonly isValid: boolean;
    readonly errors: string[];
    readonly warnings: string[];
    readonly suggestions?: string[];
}

export interface ICompositeFilter extends IEventFilter {
    readonly childFilters: IEventFilter[];
    readonly combineOperator: FilterOperator.AND | FilterOperator.OR;

    /**
     * Add a child filter
     */
    addFilter(filter: IEventFilter): void;

    /**
     * Remove a child filter
     */
    removeFilter(filterId: string): void;
}

export interface IFilterManager {
    /**
     * Register a new filter
     */
    registerFilter(filter: IEventFilter): void;

    /**
     * Get available filters
     */
    getAvailableFilters(): IEventFilter[];

    /**
     * Apply multiple filters to events
     */
    applyFilters(events: INormalizedEvent[], filterSet: IFilterSet): Promise<IFilterResult>;

    /**
     * Create a composite filter
     */
    createCompositeFilter(filters: IEventFilter[], operator: FilterOperator.AND | FilterOperator.OR): ICompositeFilter;

    /**
     * Save filter preset
     */
    saveFilterPreset(name: string, filterSet: IFilterSet): Promise<void>;

    /**
     * Load filter preset
     */
    loadFilterPreset(name: string): Promise<IFilterSet>;

    /**
     * Get filter presets
     */
    getFilterPresets(): Promise<IFilterPreset[]>;
}

export interface IFilterSet {
    readonly filters: IAppliedFilter[];
    readonly globalOperator: FilterOperator.AND | FilterOperator.OR;
    readonly metadata?: Record<string, any>;
}

export interface IAppliedFilter {
    readonly filterId: string;
    readonly criteria: IFilterCriteria;
    readonly isEnabled: boolean;
    readonly weight?: number; // For prioritizing filters
}

export interface IFilterResult {
    readonly filteredEvents: INormalizedEvent[];
    readonly totalEvents: number;
    readonly filteredCount: number;
    readonly filterStats: IFilterStats[];
    readonly processingTimeMs: number;
}

export interface IFilterStats {
    readonly filterId: string;
    readonly eventsRemoved: number;
    readonly executionTimeMs: number;
    readonly cacheHits?: number;
}

export interface IFilterPreset {
    readonly id: string;
    readonly name: string;
    readonly description?: string;
    readonly filterSet: IFilterSet;
    readonly createdAt: Date;
    readonly lastUsed?: Date;
    readonly useCount: number;
    readonly isBuiltIn: boolean;
}

export interface IFilterCache {
    /**
     * Get cached filter result
     */
    get(key: string): IFilterResult | undefined;

    /**
     * Cache filter result
     */
    set(key: string, result: IFilterResult): void;

    /**
     * Clear cache
     */
    clear(): void;

    /**
     * Get cache statistics
     */
    getStats(): ICacheStats;
}

export interface ICacheStats {
    readonly totalEntries: number;
    readonly hitRate: number;
    readonly missRate: number;
    readonly averageResponseTime: number;
    readonly memoryUsage: number;
}