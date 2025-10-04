/**
 * TimelineDataManager - Unified Frontend Data Processing Manager
 * Stage 4: Coordinates all data processing classes
 *
 * Orchestrates:
 * - TimelineDataProcessor: Time range and filtering
 * - EventAggregator: Event grouping and organization
 * - StatisticsCalculator: Metrics and statistics
 */

import { TimelineDataProcessor } from './TimelineDataProcessor';
import { EventAggregator, FilterOptions } from './EventAggregator';
import { StatisticsCalculator, TimelineStatistics } from './StatisticsCalculator';

export interface ProcessedTimelineData {
    // Raw data
    allEvents: any[];
    visibleEvents: any[];

    // Time ranges
    fullDateRange: [Date, Date];
    visibleDateRange: [Date, Date];
    impactDomain: [number, number];

    // Aggregated data
    activeBranches: string[];
    filterOptions: FilterOptions;

    // Statistics
    statistics: TimelineStatistics;
    summaryStats: { [key: string]: string | number };
}

/**
 * Unified frontend data processing manager
 */
export class TimelineDataManager {
    private dataProcessor: TimelineDataProcessor;
    private eventAggregator: EventAggregator;
    private statisticsCalculator: StatisticsCalculator;

    constructor() {
        this.dataProcessor = new TimelineDataProcessor();
        this.eventAggregator = new EventAggregator();
        this.statisticsCalculator = new StatisticsCalculator();
    }

    /**
     * Process complete timeline data for rendering
     */
    processTimelineData(
        data: any,
        currentBrushRange?: [Date, Date] | null
    ): ProcessedTimelineData {
        // Step 1: Process events for rendering
        const processedEvents = this.dataProcessor.processEventsForRendering(data, currentBrushRange);

        // Step 2: Aggregate data
        const activeBranches = this.eventAggregator.getActiveBranches(processedEvents.allEvents);
        const filterOptions = this.eventAggregator.generateFilterOptions(processedEvents.allEvents);

        // Step 3: Calculate statistics
        const statistics = this.statisticsCalculator.calculateTimelineStatistics(
            processedEvents.visibleEvents,
            processedEvents.allEvents,
            processedEvents.visibleDateRange,
            activeBranches
        );

        const summaryStats = this.statisticsCalculator.generateStatsSummary(
            processedEvents.visibleEvents,
            processedEvents.allEvents,
            processedEvents.visibleDateRange,
            activeBranches
        );

        return {
            // Raw data
            allEvents: processedEvents.allEvents,
            visibleEvents: processedEvents.visibleEvents,

            // Time ranges
            fullDateRange: processedEvents.fullDateRange,
            visibleDateRange: processedEvents.visibleDateRange,
            impactDomain: processedEvents.impactDomain,

            // Aggregated data
            activeBranches,
            filterOptions,

            // Statistics
            statistics,
            summaryStats
        };
    }

    /**
     * Update statistics for existing processed data
     */
    updateStatistics(
        visibleEvents: any[],
        totalEvents: any[],
        timeRange: [Date, Date],
        activeBranches: string[]
    ): { statistics: TimelineStatistics; summaryStats: { [key: string]: string | number } } {
        const statistics = this.statisticsCalculator.calculateTimelineStatistics(
            visibleEvents,
            totalEvents,
            timeRange,
            activeBranches
        );

        const summaryStats = this.statisticsCalculator.generateStatsSummary(
            visibleEvents,
            totalEvents,
            timeRange,
            activeBranches
        );

        return { statistics, summaryStats };
    }

    /**
     * Get event type counts for filter chips
     */
    getEventTypeCounts(events: any[]): Map<string, number> {
        return this.eventAggregator.getEventTypeCounts(events);
    }

    /**
     * Calculate date range formatting
     */
    formatDateRange(timeRange: [Date, Date]): { start: string; end: string } {
        return this.dataProcessor.formatDateRange(timeRange);
    }

    /**
     * Group events for histogram rendering
     */
    groupEventsForHistogram(events: any[], bins: number = 15): any[] {
        return this.dataProcessor.groupEventsByTimePeriod(events, bins);
    }

    /**
     * Get initial view window strategy
     */
    getInitialViewWindow(events: any[], strategy?: any): [Date, Date] {
        return this.dataProcessor.getInitialViewWindow(events, strategy);
    }

    /**
     * Calculate time window duration
     */
    calculateTimeWindowDays(timeRange: [Date, Date]): number {
        return this.dataProcessor.calculateTimeWindowDays(timeRange);
    }

    /**
     * Get events summary for overview
     */
    getEventsSummary(events: any[]): {
        totalEvents: number;
        uniqueBranches: number;
        uniqueAuthors: number;
        uniqueEventTypes: number;
        dateRange: [Date, Date] | null;
    } {
        return this.eventAggregator.getEventSummary(events);
    }

    /**
     * Calculate velocity metrics
     */
    calculateVelocityMetrics(events: any[], timeRange: [Date, Date]) {
        return this.statisticsCalculator.calculateVelocityMetrics(events, timeRange);
    }

    /**
     * Calculate distribution metrics
     */
    calculateDistributionMetrics(events: any[]) {
        return this.statisticsCalculator.calculateDistributionMetrics(events);
    }

    /**
     * Calculate impact metrics
     */
    calculateImpactMetrics(events: any[]) {
        return this.statisticsCalculator.calculateImpactMetrics(events);
    }
}