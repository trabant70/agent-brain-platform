/**
 * EventAggregator - Event Grouping and Organization
 * Stage 4: Extracted from embedded JavaScript code
 *
 * Handles:
 * - Branch extraction and organization
 * - Event type aggregation
 * - Author collection
 * - Filter state management
 * - Available options computation
 */

export interface AggregatedBranches {
    all: string[];
    active: string[];
    sorted: string[];
}

export interface AggregatedAuthors {
    all: string[];
    unique: Set<string>;
    sorted: string[];
}

export interface AggregatedEventTypes {
    all: string[];
    unique: Set<string>;
    counts: Map<string, number>;
}

export interface FilterOptions {
    branches: string[];
    authors: string[];
    eventTypes: string[];
}

/**
 * Event aggregator for organizing timeline data
 */
export class EventAggregator {
    private d3: any;

    constructor() {
        // D3 is available globally in webview context
        this.d3 = (window as any).d3;
    }

    /**
     * Extract and organize branches from events
     */
    aggregateBranches(events: any[]): AggregatedBranches {
        const allBranches = events.map(e => e.branch).filter(Boolean);
        const uniqueBranches = Array.from(new Set(allBranches));
        const sortedBranches = uniqueBranches.sort();

        return {
            all: allBranches,
            active: uniqueBranches,
            sorted: sortedBranches
        };
    }

    /**
     * Extract and organize authors from events
     */
    aggregateAuthors(events: any[]): AggregatedAuthors {
        const allAuthors = events.map(e => e.author).filter(Boolean);
        const uniqueAuthors = new Set(allAuthors);
        const sortedAuthors = Array.from(uniqueAuthors).sort();

        return {
            all: allAuthors,
            unique: uniqueAuthors,
            sorted: sortedAuthors
        };
    }

    /**
     * Extract and organize event types from events
     */
    aggregateEventTypes(events: any[]): AggregatedEventTypes {
        const allTypes = events.map(e => e.type).filter(Boolean);
        const uniqueTypes = new Set(allTypes);

        // Count occurrences of each type
        const typeCounts = this.d3.rollup(events, (v: any[]) => v.length, (d: any) => d.type);

        return {
            all: allTypes,
            unique: uniqueTypes,
            counts: typeCounts
        };
    }

    /**
     * Generate available filter options from events
     */
    generateFilterOptions(events: any[]): FilterOptions {
        const branches = this.aggregateBranches(events);
        const authors = this.aggregateAuthors(events);
        const eventTypes = this.aggregateEventTypes(events);

        return {
            branches: branches.sorted,
            authors: authors.sorted,
            eventTypes: Array.from(eventTypes.unique).sort()
        };
    }

    /**
     * Get active branches for visualization
     */
    getActiveBranches(events: any[]): string[] {
        return this.aggregateBranches(events).sorted;
    }

    /**
     * Count unique contributors in a set of events
     */
    countUniqueContributors(events: any[]): number {
        return this.aggregateAuthors(events).unique.size;
    }

    /**
     * Group events by a specific field
     */
    groupEventsByField(events: any[], field: string): Map<string, any[]> {
        return this.d3.group(events, (d: any) => d[field]);
    }

    /**
     * Count events by type for display
     */
    getEventTypeCounts(events: any[]): Map<string, number> {
        return this.aggregateEventTypes(events).counts;
    }

    /**
     * Get events for a specific time period
     */
    getEventsInPeriod(events: any[], startDate: Date, endDate: Date): any[] {
        return events.filter(event => {
            const eventDate = new Date(event.timestamp);
            return eventDate >= startDate && eventDate <= endDate;
        });
    }

    /**
     * Aggregate events by date for timeline visualization
     */
    aggregateEventsByDate(events: any[]): Map<string, any[]> {
        const dateFormat = this.d3.timeFormat("%Y-%m-%d");
        return this.d3.group(events, (d: any) => dateFormat(new Date(d.timestamp)));
    }

    /**
     * Get summary statistics for events
     */
    getEventSummary(events: any[]): {
        totalEvents: number;
        uniqueBranches: number;
        uniqueAuthors: number;
        uniqueEventTypes: number;
        dateRange: [Date, Date] | null;
    } {
        if (events.length === 0) {
            return {
                totalEvents: 0,
                uniqueBranches: 0,
                uniqueAuthors: 0,
                uniqueEventTypes: 0,
                dateRange: null
            };
        }

        const branches = this.aggregateBranches(events);
        const authors = this.aggregateAuthors(events);
        const eventTypes = this.aggregateEventTypes(events);
        const dateRange = this.d3.extent(events, (d: any) => new Date(d.timestamp));

        return {
            totalEvents: events.length,
            uniqueBranches: branches.active.length,
            uniqueAuthors: authors.unique.size,
            uniqueEventTypes: eventTypes.unique.size,
            dateRange: dateRange
        };
    }
}