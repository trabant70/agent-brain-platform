/**
 * Complete application state managed by DataOrchestrator
 * This interface defines the single source of truth for the entire application
 */

export interface OrchestratorState {
    // Data Layer
    data: {
        providers: Record<string, ProviderStatus>;  // Plain object, not Map
        rawEvents: Record<string, IRawProviderEvent[]>;  // Plain object, not Map
        processedData: RenderReadyTimelineData | null;
        lastFetchTime: Date | null;
        cacheValid: boolean;
    };

    // Filter Layer
    filters: {
        current: CrossProviderFilterState;
        available: IProviderFilterOptions;
        lastApplied: CrossProviderFilterState | null;
    };

    // View Layer
    view: {
        dateRange: [Date, Date] | null;
        brushRange: [Date, Date] | null;
        selectedRenderer: string;
        zoom: number;
    };

    // UI Layer
    ui: {
        isLoading: boolean;
        isProcessing: boolean;
        errors: Error[];
        lastError: Error | null;
    };

    // Metadata
    meta: {
        version: number;
        lastUpdate: Date;
        updateCount: number;
    };
}

export interface ProviderStatus {
    id: string;
    isHealthy: boolean;
    lastFetch: Date | null;
    eventCount: number;
    error: Error | null;
}

export interface StateUpdate {
    type: 'full' | 'partial' | 'filters' | 'view' | 'data';
    timestamp: Date;
    changes: Partial<OrchestratorState>;
}

/**
 * Cross-provider filter state for consistency across data sources
 */
export interface CrossProviderFilterState {
    branches: string[] | undefined;           // Inclusion: undefined = all branches
    authors: string[] | undefined;            // Inclusion: undefined = all authors
    excludedEventTypes?: string[];            // Exclusion: hide these event types (empty = show all)
    dateRange?: [Date, Date];
    providers?: string[];
    searchQuery?: string;
}

/**
 * Available filter options from all providers
 */
export interface IProviderFilterOptions {
    branches: string[];
    eventTypes: string[];
    authors: string[];
}

/**
 * Raw event interface from providers
 */
export interface IRawProviderEvent {
    id: string;
    type: string;
    timestamp: Date;
    author: string;
    branch: string;
    message: string;
    metadata?: any;
}

/**
 * Render-ready timeline data for frontend consumption
 */
export interface RenderReadyTimelineData {
    events: any[];
    allEvents: any[];
    sourceData?: any[];  // Unfiltered source data for count tracking
    filteredData?: any[];  // Filtered data for count tracking
    sourceEventTypeCounts?: { [key: string]: number };  // Count of each type in source data
    filteredEventTypeCounts?: { [key: string]: number };  // Count of each type in filtered data
    repoName: string;
    currentFile: string;
    stats: any;
    availableOptions: IProviderFilterOptions;
    filterState: CrossProviderFilterState;
    filterOptions: IProviderFilterOptions;
    metadata: any;
    sourceMetadata?: {
        totalEvents: number;
        eventTypeCounts: { [key: string]: number };
        possibleEventTypes?: string[];  // All types that COULD be present from connected providers
        branches: string[];
        authors: string[];
    };
    filteredMetadata?: {
        totalEvents: number;
        eventTypeCounts: { [key: string]: number };
    };
}

/**
 * State subscriber callback function
 */
export type StateSubscriber = (state: OrchestratorState) => void;

/**
 * State update callback for debugging and monitoring
 */
export interface StateUpdateListener {
    onStateUpdate: (update: StateUpdate) => void;
    onError: (error: Error) => void;
}