/**
 * Core Data Provider Abstraction
 *
 * Future providers: Git, GitHub API, JIRA, ADO, Agent-Brain, Custom APIs
 * This interface enables pluggable data sources for the timeline
 */

export interface IDataProvider {
    readonly id: string;
    readonly name: string;
    readonly version: string;
    readonly capabilities: IProviderCapabilities;

    /**
     * Initialize the provider (authentication, configuration, etc.)
     */
    initialize(config: IProviderConfig): Promise<void>;

    /**
     * Check if provider is healthy and ready
     */
    isHealthy(): Promise<boolean>;

    /**
     * Fetch timeline events for a specific context
     */
    fetchEvents(context: IProviderContext): Promise<IRawProviderEvent[]>;

    /**
     * Get available filter options for this provider
     */
    getFilterOptions(context: IProviderContext): Promise<IProviderFilterOptions>;

    /**
     * Cleanup resources
     */
    dispose(): Promise<void>;
}

export interface IProviderCapabilities {
    readonly supportsRealTimeUpdates: boolean;
    readonly supportsHistoricalData: boolean;
    readonly supportsFiltering: boolean;
    readonly supportsSearch: boolean;
    readonly supportsAuthentication: boolean;
    readonly supportsWriteOperations: boolean;
    readonly maxRequestsPerMinute?: number;
    readonly supportedEventTypes: string[];
}

export interface IProviderConfig {
    readonly enabled: boolean;
    readonly authentication?: IProviderAuth;
    readonly caching?: IProviderCaching;
    readonly rateLimiting?: IProviderRateLimit;
    readonly customSettings?: Record<string, any>;
}

export interface IProviderAuth {
    readonly type: 'none' | 'basic' | 'oauth' | 'token' | 'custom';
    readonly credentials?: Record<string, string>;
    readonly refreshToken?: string;
    readonly expiresAt?: Date;
}

export interface IProviderCaching {
    readonly enabled: boolean;
    readonly ttlMinutes: number;
    readonly maxCacheSize: number;
}

export interface IProviderRateLimit {
    readonly requestsPerMinute: number;
    readonly burstSize: number;
    readonly backoffStrategy: 'linear' | 'exponential';
}

export interface IProviderContext {
    readonly workspaceRoot: string;
    readonly projectPath?: string;
    readonly timeRange?: ITimeRange;
    readonly filters?: Record<string, any>;
}

export interface ITimeRange {
    readonly start: Date;
    readonly end: Date;
}

export interface IRawProviderEvent {
    readonly id: string;
    readonly providerId: string;
    readonly eventType: string;
    readonly timestamp: Date;
    readonly title: string;
    readonly description?: string;
    readonly author?: IEventAuthor;
    readonly metadata: Record<string, any>;
    readonly parentEventIds?: string[];
    readonly childEventIds?: string[];
    readonly tags?: string[];
    readonly sourceUrl?: string;
}

export interface IEventAuthor {
    readonly id: string;
    readonly name: string;
    readonly email?: string;
    readonly avatarUrl?: string;
}

export interface IProviderFilterOptions {
    readonly authors: IEventAuthor[];
    readonly eventTypes: string[];
    readonly projects: string[];
    readonly branches?: string[];
    readonly tags?: string[];
    readonly customFilters?: ICustomFilter[];
}

export interface ICustomFilter {
    readonly id: string;
    readonly name: string;
    readonly type: 'text' | 'select' | 'date' | 'number' | 'boolean';
    readonly options?: any[];
    readonly defaultValue?: any;
}

export interface IProviderError extends Error {
    readonly providerId: string;
    readonly errorCode: string;
    readonly isRetryable: boolean;
    readonly retryAfterSeconds?: number;
}