/**
 * TimelineDataAdapter - GitEvent to TimelineEvent Conversion
 *
 * ARCHITECTURE NOTE: This adapter bridges our new GitEvent system with the existing
 * timeline visualization. It converts GitEvents and relationships to the TimelineEvent
 * format that the visualization expects.
 *
 * KEY IMPROVEMENT: Provides rich metadata for connection rendering and proper
 * branch positioning using reflog-based dates.
 *
 * This adapter allows us to completely replace the timeline data source while
 * maintaining compatibility with the existing visualization system.
 */

import {
    GitEvent,
    GitEventCollection,
    GitEventRelationship,
    ConnectionLine,
    EventPosition,
    FilteredGitEvents,
    GitEventFilter
} from '../domain/git-event.types';

// Import existing timeline types for compatibility
import { TimelineEvent } from '../core/timeline-types';

/**
 * Configuration for timeline data adaptation
 */
export interface TimelineAdapterConfig {
    impactCalculationMode: 'file-based' | 'line-based' | 'hybrid';
    defaultImpactValues: Record<string, number>;
    enhanceMetadata: boolean;
    preserveConnectionData: boolean;
    generateSyntheticPRs: boolean; // Create PR events from merge analysis
}

export const DEFAULT_ADAPTER_CONFIG: TimelineAdapterConfig = {
    impactCalculationMode: 'hybrid',
    defaultImpactValues: {
        commit: 30,
        merge: 70,
        'branch-created': 40,
        release: 100
    },
    enhanceMetadata: true,
    preserveConnectionData: true,
    generateSyntheticPRs: true
};

/**
 * Position calculator for timeline events
 */
interface PositionCalculator {
    calculateEventPositions(events: TimelineEvent[], branches: string[]): Map<string, EventPosition>;
    getBranchLaneMap(): Map<string, number>;
}

/**
 * Adapter for converting GitEvent data to TimelineEvent format
 */
export class TimelineDataAdapter {
    private readonly config: TimelineAdapterConfig;
    private branchLaneMap: Map<string, number> = new Map();
    private connectionLines: ConnectionLine[] = [];

    constructor(config: Partial<TimelineAdapterConfig> = {}) {
        this.config = { ...DEFAULT_ADAPTER_CONFIG, ...config };
    }

    /**
     * Main adaptation method - converts GitEventCollection to timeline format
     */
    adaptGitEventsToTimeline(
        collection: GitEventCollection,
        filter?: GitEventFilter
    ): {
        timelineEvents: TimelineEvent[];
        connectionLines: ConnectionLine[];
        metadata: AdaptationMetadata;
    } {
        console.log(`TimelineDataAdapter: Adapting ${collection.events.length} git events to timeline format...`);

        // Apply filtering if provided
        const filteredEvents = filter ? this.applyFilter(collection, filter) : {
            events: collection.events,
            relationships: collection.relationships,
            stats: this.calculateBasicStats(collection.events)
        };

        // Convert GitEvents to TimelineEvents
        const timelineEvents = this.convertEventsToTimelineFormat(filteredEvents.events);

        // Generate synthetic PR events if enabled
        if (this.config.generateSyntheticPRs) {
            const syntheticPRs = this.generateSyntheticPREvents(
                filteredEvents.events,
                filteredEvents.relationships
            );
            timelineEvents.push(...syntheticPRs);
        }

        // Sort by timestamp
        timelineEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        // Build branch lane mapping
        this.buildBranchLaneMapping(timelineEvents);

        // Calculate event positions for connection rendering
        const eventPositions = this.calculateEventPositions(timelineEvents);

        // Store connection lines for visualization
        this.connectionLines = this.adaptConnectionLines(filteredEvents.relationships, eventPositions);

        // Build adaptation metadata
        const metadata: AdaptationMetadata = {
            originalEventCount: collection.events.length,
            filteredEventCount: filteredEvents.events.length,
            timelineEventCount: timelineEvents.length,
            connectionCount: this.connectionLines.length,
            branchCount: collection.branches.length,
            adaptationDate: new Date(),
            filterApplied: !!filter
        };

        console.log(`TimelineDataAdapter: Adapted to ${timelineEvents.length} timeline events with ${this.connectionLines.length} connections`);

        return {
            timelineEvents,
            connectionLines: this.connectionLines,
            metadata
        };
    }

    /**
     * Converts GitEvents to TimelineEvent format
     */
    private convertEventsToTimelineFormat(gitEvents: GitEvent[]): TimelineEvent[] {
        return gitEvents.map(gitEvent => this.convertSingleEvent(gitEvent));
    }

    /**
     * Converts a single GitEvent to TimelineEvent
     */
    private convertSingleEvent(gitEvent: GitEvent): TimelineEvent {
        const timelineEvent: TimelineEvent = {
            id: gitEvent.id,
            type: this.mapEventType(gitEvent.type),
            branch: gitEvent.branch || 'main', // Fallback to 'main' if branch is undefined
            author: gitEvent.author,
            timestamp: gitEvent.date.toISOString(),
            title: gitEvent.title,
            description: this.generateEventDescription(gitEvent),
            severity: this.mapEventSeverity(gitEvent),
            impact: this.calculateEventImpact(gitEvent),
            filesChanged: gitEvent.filesChanged,
            linesAdded: gitEvent.insertions,
            linesRemoved: gitEvent.deletions,
            hash: this.extractHashFromId(gitEvent.id),
            metadata: this.enhanceEventMetadata(gitEvent)
        };

        return timelineEvent;
    }

    /**
     * Maps GitEvent types to TimelineEvent types
     */
    private mapEventType(gitEventType: string): 'commit' | 'pr' | 'issue' | 'release' | 'branch' | 'ci' | 'review' | 'fork' | 'star' | 'security' | 'deployment' | 'discussion' {
        switch (gitEventType) {
            case 'commit': return 'commit';
            case 'merge': return 'pr'; // Treat merges as PR events
            case 'branch-created': return 'branch';
            case 'release': return 'release';
            default: return 'commit';
        }
    }

    /**
     * Maps event severity based on type and properties
     */
    private mapEventSeverity(gitEvent: GitEvent): 'info' | 'warning' | 'error' {
        switch (gitEvent.type) {
            case 'merge':
                // Large merges get warning severity
                return (gitEvent.filesChanged || 0) > 10 ? 'warning' : 'info';
            case 'release':
                return 'info';
            case 'branch-created':
                return 'info';
            default:
                // Commits with many changes get warning
                return (gitEvent.filesChanged || 0) > 20 ? 'warning' : 'info';
        }
    }

    /**
     * Calculates event impact using configured mode
     */
    private calculateEventImpact(gitEvent: GitEvent): number {
        const baseImpact = this.config.defaultImpactValues[gitEvent.type] || 30;

        switch (this.config.impactCalculationMode) {
            case 'file-based':
                return Math.min(baseImpact + (gitEvent.filesChanged || 0) * 5, 100);

            case 'line-based':
                const lineChanges = (gitEvent.insertions || 0) + (gitEvent.deletions || 0);
                return Math.min(baseImpact + lineChanges / 10, 100);

            case 'hybrid':
            default:
                const fileWeight = (gitEvent.filesChanged || 0) * 3;
                const lineWeight = ((gitEvent.insertions || 0) + (gitEvent.deletions || 0)) / 20;
                return Math.min(baseImpact + fileWeight + lineWeight, 100);
        }
    }

    /**
     * Generates descriptive text for events
     */
    private generateEventDescription(gitEvent: GitEvent): string {
        const parts: string[] = [];

        if (gitEvent.type === 'merge' && gitEvent.parentHashes) {
            parts.push(`${gitEvent.parentHashes.length}-way merge`);
        }

        if (gitEvent.filesChanged) {
            parts.push(`${gitEvent.filesChanged} files changed`);
        }

        if (gitEvent.insertions || gitEvent.deletions) {
            const insertions = gitEvent.insertions || 0;
            const deletions = gitEvent.deletions || 0;
            parts.push(`+${insertions}/-${deletions} lines`);
        }

        return parts.join(', ') || 'No changes recorded';
    }

    /**
     * Enhances event metadata with connection information
     */
    private enhanceEventMetadata(gitEvent: GitEvent): any {
        const metadata: any = {
            gitEventType: gitEvent.type,
            originalDate: gitEvent.date.toISOString()
        };

        if (this.config.enhanceMetadata) {
            // Add git-specific metadata
            if (gitEvent.parentHashes) {
                metadata.parentHashes = gitEvent.parentHashes;
                metadata.isMerge = gitEvent.parentHashes.length > 1;
                metadata.mergeComplexity = gitEvent.parentHashes.length > 2 ? 'octopus' : 'simple';
            }

            // Add visual hints from original metadata
            if (gitEvent.metadata) {
                metadata.visualType = gitEvent.metadata.visualType;
                metadata.importance = gitEvent.metadata.importance;
            }
        }

        return metadata;
    }

    /**
     * Generates synthetic PR events from merge analysis
     */
    private generateSyntheticPREvents(
        events: GitEvent[],
        relationships: GitEventRelationship[]
    ): TimelineEvent[] {
        const syntheticPRs: TimelineEvent[] = [];

        const mergeEvents = events.filter(e => e.type === 'merge');

        for (const mergeEvent of mergeEvents) {
            // Find source branch relationships for this merge
            const sourceRelationships = relationships.filter(r =>
                r.targetEventId === mergeEvent.id && r.type === 'merge-source'
            );

            if (sourceRelationships.length > 0) {
                // Create a synthetic PR event
                const prEvent: TimelineEvent = {
                    id: `synthetic-pr-${mergeEvent.id}`,
                    type: 'pr',
                    branch: this.inferSourceBranch(mergeEvent, sourceRelationships, events),
                    author: mergeEvent.author,
                    timestamp: mergeEvent.date.toISOString(),
                    title: `PR: ${mergeEvent.title}`,
                    description: `Synthetic PR from merge analysis`,
                    severity: 'info',
                    impact: this.calculateEventImpact(mergeEvent),
                    filesChanged: mergeEvent.filesChanged,
                    linesAdded: mergeEvent.insertions,
                    linesRemoved: mergeEvent.deletions,
                    hash: this.extractHashFromId(mergeEvent.id),
                    metadata: {
                        synthetic: true,
                        mergeCommitId: mergeEvent.id,
                        sourceBranch: this.inferSourceBranch(mergeEvent, sourceRelationships, events),
                        targetBranch: mergeEvent.branch,
                        detectionMethod: 'parent-hash-analysis'
                    }
                };

                syntheticPRs.push(prEvent);
            }
        }

        return syntheticPRs;
    }

    /**
     * Infers source branch from merge relationships
     */
    private inferSourceBranch(
        mergeEvent: GitEvent,
        sourceRelationships: GitEventRelationship[],
        events: GitEvent[]
    ): string {
        if (sourceRelationships.length > 0) {
            const sourceEvent = events.find(e => e.id === sourceRelationships[0].sourceEventId);
            if (sourceEvent) {
                return sourceEvent.branch;
            }
        }
        return 'unknown-branch';
    }

    /**
     * Builds branch lane mapping for consistent positioning
     */
    private buildBranchLaneMapping(timelineEvents: TimelineEvent[]): void {
        const branches = [...new Set(timelineEvents.map(e => e.branch))].sort();
        this.branchLaneMap.clear();

        branches.forEach((branch, index) => {
            this.branchLaneMap.set(branch, index);
        });
    }

    /**
     * Calculates event positions for connection rendering
     */
    private calculateEventPositions(timelineEvents: TimelineEvent[]): Map<string, EventPosition> {
        const positions = new Map<string, EventPosition>();

        // This is a simplified position calculation
        // In a full implementation, this would use the actual timeline scale
        timelineEvents.forEach((event, index) => {
            const branchLane = this.branchLaneMap.get(event.branch) || 0;

            positions.set(event.id, {
                eventId: event.id,
                x: index * 50, // Simplified x positioning
                y: branchLane * 40, // Simplified y positioning
                branch: event.branch,
                importance: event.impact
            });
        });

        return positions;
    }

    /**
     * Adapts connection lines to use timeline positioning
     */
    private adaptConnectionLines(
        relationships: GitEventRelationship[],
        eventPositions: Map<string, EventPosition>
    ): ConnectionLine[] {
        // This would use the ConnectionMapper to generate visual connections
        // For now, return empty array - will be implemented when integrating
        // with the actual visualization system
        return [];
    }

    /**
     * Applies filtering to git events
     */
    private applyFilter(collection: GitEventCollection, filter: GitEventFilter): FilteredGitEvents {
        let filteredEvents = collection.events;

        // Filter by event types
        if (filter.eventTypes && filter.eventTypes.length > 0) {
            filteredEvents = filteredEvents.filter(e => filter.eventTypes!.includes(e.type));
        }

        // Filter by branches
        if (filter.branches && filter.branches.length > 0) {
            filteredEvents = filteredEvents.filter(e => filter.branches!.includes(e.branch));
        }

        // Filter by authors
        if (filter.authors && filter.authors.length > 0) {
            filteredEvents = filteredEvents.filter(e => filter.authors!.includes(e.author));
        }

        // Filter by date range
        if (filter.dateRange) {
            const [startDate, endDate] = filter.dateRange;
            filteredEvents = filteredEvents.filter(e =>
                e.date >= startDate && e.date <= endDate
            );
        }

        // Filter relationships to match filtered events
        const eventIds = new Set(filteredEvents.map(e => e.id));
        const filteredRelationships = collection.relationships.filter(r =>
            eventIds.has(r.sourceEventId) && eventIds.has(r.targetEventId)
        );

        return {
            events: filteredEvents,
            relationships: filteredRelationships,
            stats: this.calculateBasicStats(filteredEvents)
        };
    }

    /**
     * Calculates basic statistics for events
     */
    private calculateBasicStats(events: GitEvent[]) {
        const eventTypeCounts: any = {};
        const branchCounts: any = {};
        const authorCounts: any = {};

        for (const event of events) {
            eventTypeCounts[event.type] = (eventTypeCounts[event.type] || 0) + 1;
            branchCounts[event.branch] = (branchCounts[event.branch] || 0) + 1;
            authorCounts[event.author] = (authorCounts[event.author] || 0) + 1;
        }

        return {
            totalEvents: events.length,
            filteredEvents: events.length,
            eventTypeCounts,
            branchCounts,
            authorCounts
        };
    }

    /**
     * Extracts hash from event ID
     */
    private extractHashFromId(id: string): string {
        // Extract first 8 characters of hash from ID
        const hashMatch = id.match(/^([a-f0-9]{8,})/);
        return hashMatch ? hashMatch[1].substring(0, 8) : id.substring(0, 8);
    }

    /**
     * Gets the current connection lines
     */
    getConnectionLines(): ConnectionLine[] {
        return this.connectionLines;
    }

    /**
     * Gets the branch lane mapping
     */
    getBranchLaneMap(): Map<string, number> {
        return new Map(this.branchLaneMap);
    }
}

/**
 * Metadata about the adaptation process
 */
export interface AdaptationMetadata {
    originalEventCount: number;
    filteredEventCount: number;
    timelineEventCount: number;
    connectionCount: number;
    branchCount: number;
    adaptationDate: Date;
    filterApplied: boolean;
}