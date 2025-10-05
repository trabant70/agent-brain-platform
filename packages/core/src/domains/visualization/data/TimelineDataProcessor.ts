/**
 * TimelineDataProcessor - Frontend Data Processing
 * Stage 4: Extracted from embedded JavaScript code
 *
 * Handles frontend-specific data processing including:
 * - Time range calculations
 * - Event filtering for visibility windows
 * - Date range computations
 * - Event time-based filtering
 */

export interface TimeRange {
    start: Date;
    end: Date;
}

export interface TimelineProcessingOptions {
    useCurrentBrush?: boolean;
    defaultDays?: number;
}

/**
 * Frontend data processor for timeline events
 */
export class TimelineDataProcessor {
    private d3: any;

    constructor() {
        // D3 is available globally in webview context
        this.d3 = (window as any).d3;
    }

    /**
     * Calculate full date range from all events
     */
    calculateFullDateRange(events: any[]): [Date, Date] {
        if (events.length === 0) {
            const now = new Date();
            return [this.d3.timeDay.offset(now, -30), now];
        }

        return this.d3.extent(events, (d: any) => new Date(d.timestamp));
    }

    /**
     * Calculate impact domain for scaling
     */
    calculateImpactDomain(events: any[]): [number, number] {
        if (events.length === 0) {
            return [0, 100];
        }

        return this.d3.extent(events, (d: any) => d.impact || 0) || [0, 100];
    }

    /**
     * Filter events for a specific time window
     */
    filterEventsForTimeWindow(events: any[], timeRange: [Date, Date]): any[] {
        return events.filter(event => {
            const eventDate = new Date(event.timestamp);
            return eventDate >= timeRange[0] && eventDate <= timeRange[1];
        });
    }

    /**
     * Get initial view window based on data strategy
     */
    getInitialViewWindow(events: any[], strategy?: any): [Date, Date] {
        if (events.length === 0) {
            const now = new Date();
            return [this.d3.timeDay.offset(now, -7), now];
        }

        // Use strategy if provided (TimeWindowStrategy)
        if (strategy) {
            return strategy.getInitialViewWindow();
        }

        // Fallback: show last 30 days of data
        const fullRange = this.calculateFullDateRange(events);
        return [this.d3.timeDay.offset(fullRange[1], -30), fullRange[1]];
    }

    /**
     * Process events for rendering
     */
    processEventsForRendering(data: any, currentBrushRange?: [Date, Date] | null): {
        allEvents: any[];
        visibleEvents: any[];
        fullDateRange: [Date, Date];
        visibleDateRange: [Date, Date];
        impactDomain: [number, number];
    } {
        const events = data.events || [];
        const allEvents = data.allEvents || [];

        // Calculate ranges
        const fullDateRange = this.calculateFullDateRange(allEvents);
        const visibleDateRange = currentBrushRange || this.getInitialViewWindow(events);

        // Filter events for current view
        const visibleEvents = this.filterEventsForTimeWindow(events, visibleDateRange);

        // Calculate impact domain
        const impactDomain = this.calculateImpactDomain(events);

        return {
            allEvents,
            visibleEvents,
            fullDateRange,
            visibleDateRange,
            impactDomain
        };
    }

    /**
     * Calculate time window duration in days
     */
    calculateTimeWindowDays(timeRange: [Date, Date]): number {
        return Math.ceil((timeRange[1].getTime() - timeRange[0].getTime()) / (1000 * 60 * 60 * 24));
    }

    /**
     * Format date range for display
     */
    formatDateRange(timeRange: [Date, Date]): { start: string; end: string } {
        const dateFormat = this.d3.timeFormat("%b %d, %Y");
        return {
            start: dateFormat(timeRange[0]),
            end: dateFormat(timeRange[1])
        };
    }

    /**
     * Group events by time period (for histogram)
     */
    groupEventsByTimePeriod(events: any[], bins: number = 15): any[] {
        if (events.length === 0) {
            return [];
        }

        const dateRange = this.calculateFullDateRange(events);
        const histogram = this.d3.histogram()
            .value((d: any) => new Date(d.timestamp))
            .domain(dateRange)
            .thresholds(this.d3.scaleTime().domain(dateRange).ticks(bins));

        return histogram(events);
    }
}