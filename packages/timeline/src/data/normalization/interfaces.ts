/**
 * Data Normalization Layer Interfaces
 *
 * Converts disparate provider data into unified timeline events
 */

import { IRawProviderEvent } from '../providers/interfaces/IDataProvider';

export interface INormalizedEvent {
    readonly id: string;
    readonly normalizedId: string; // Globally unique across all providers
    readonly sourceProviderId: string;
    readonly eventType: NormalizedEventType;
    readonly timestamp: Date;
    readonly title: string;
    readonly description?: string;
    readonly author: INormalizedAuthor;
    readonly metadata: INormalizedEventMetadata;
    readonly relationships: IEventRelationships;
    readonly visualization: IVisualizationHints;
}

export enum NormalizedEventType {
    COMMIT = 'commit',
    MERGE = 'merge',
    BRANCH_CREATED = 'branch-created',
    BRANCH_DELETED = 'branch-deleted',
    TAG_CREATED = 'tag-created',
    RELEASE = 'release',
    PULL_REQUEST_OPENED = 'pull-request-opened',
    PULL_REQUEST_MERGED = 'pull-request-merged',
    PULL_REQUEST_CLOSED = 'pull-request-closed',
    ISSUE_OPENED = 'issue-opened',
    ISSUE_CLOSED = 'issue-closed',
    DEPLOYMENT = 'deployment',
    BUILD_SUCCESS = 'build-success',
    BUILD_FAILURE = 'build-failure',
    REQUIREMENT_CREATED = 'requirement-created',
    REQUIREMENT_UPDATED = 'requirement-updated',
    CUSTOM = 'custom'
}

export interface INormalizedAuthor {
    readonly id: string;
    readonly name: string;
    readonly email?: string;
    readonly displayName: string;
    readonly avatarUrl?: string;
    readonly sourceProvider: string;
}

export interface INormalizedEventMetadata {
    readonly sourceUrl?: string;
    readonly parentCommitHashes?: string[];
    readonly branchName?: string;
    readonly tagName?: string;
    readonly pullRequestNumber?: number;
    readonly issueNumber?: number;
    readonly buildId?: string;
    readonly deploymentEnvironment?: string;
    readonly filesChanged?: IFileChange[];
    readonly customData?: Record<string, any>;
}

export interface IFileChange {
    readonly path: string;
    readonly changeType: 'added' | 'modified' | 'deleted' | 'renamed';
    readonly linesAdded?: number;
    readonly linesDeleted?: number;
    readonly oldPath?: string; // For renames
}

export interface IEventRelationships {
    readonly parentEventIds: string[];
    readonly childEventIds: string[];
    readonly relatedEventIds: string[];
    readonly groupId?: string; // For grouping related events
    readonly sequenceNumber?: number; // For ordering within a group
}

export interface IVisualizationHints {
    readonly color?: string;
    readonly icon?: string;
    readonly size?: 'small' | 'medium' | 'large';
    readonly shape?: 'circle' | 'square' | 'diamond' | 'triangle';
    readonly priority?: number; // For layering/z-index
    readonly connectionStyle?: 'solid' | 'dashed' | 'dotted';
    readonly grouping?: IGroupingHint;
}

export interface IGroupingHint {
    readonly groupType: 'branch' | 'feature' | 'release' | 'sprint' | 'custom';
    readonly groupId: string;
    readonly groupLabel: string;
    readonly groupColor?: string;
}

export interface IEventNormalizer {
    /**
     * Normalize a raw provider event into the standard format
     */
    normalize(rawEvent: IRawProviderEvent): Promise<INormalizedEvent>;

    /**
     * Batch normalize multiple events efficiently
     */
    normalizeBatch(rawEvents: IRawProviderEvent[]): Promise<INormalizedEvent[]>;

    /**
     * Check if this normalizer can handle the given provider type
     */
    canHandle(providerId: string): boolean;
}

export interface IEventMerger {
    /**
     * Merge duplicate events from different providers
     */
    mergeDuplicates(events: INormalizedEvent[]): Promise<INormalizedEvent[]>;

    /**
     * Resolve conflicts between events
     */
    resolveConflicts(events: INormalizedEvent[]): Promise<INormalizedEvent[]>;

    /**
     * Build relationships between events
     */
    buildRelationships(events: INormalizedEvent[]): Promise<INormalizedEvent[]>;
}

export interface IEventAggregator {
    /**
     * Combine events from multiple providers
     */
    aggregateEvents(providerEvents: Map<string, IRawProviderEvent[]>): Promise<INormalizedEvent[]>;

    /**
     * Get aggregation statistics
     */
    getAggregationStats(): IAggregationStats;
}

export interface IAggregationStats {
    readonly totalRawEvents: number;
    readonly totalNormalizedEvents: number;
    readonly duplicatesRemoved: number;
    readonly conflictsResolved: number;
    readonly relationshipsBuilt: number;
    readonly processingTimeMs: number;
    readonly providerBreakdown: Map<string, number>;
}