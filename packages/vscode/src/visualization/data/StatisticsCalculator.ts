/**
 * StatisticsCalculator - Metrics and Statistics Computation
 * Stage 4: Extracted from embedded JavaScript code
 *
 * Handles:
 * - Timeline statistics calculation
 * - Velocity metrics
 * - Time window analysis
 * - Event distribution metrics
 * - Performance indicators
 */

export interface TimelineStatistics {
    visibleEvents: number;
    totalEvents: number;
    contributors: number;
    activeBranches: number;
    timeWindowDays: number;
    velocity: number;
    eventTypes: { [key: string]: number };
    dateRange: {
        start: string;
        end: string;
    };
}

export interface VelocityMetrics {
    eventsPerDay: number;
    eventsPerWeek: number;
    eventsPerMonth: number;
    averageInterval: number; // hours between events
}

export interface DistributionMetrics {
    eventTypeDistribution: Map<string, number>;
    branchDistribution: Map<string, number>;
    authorDistribution: Map<string, number>;
    timeDistribution: Map<string, number>;
}

/**
 * Statistics calculator for timeline metrics
 */
export class StatisticsCalculator {
    private d3: any;

    constructor() {
        // D3 is available globally in webview context
        this.d3 = (window as any).d3;
    }

    /**
     * Calculate timeline statistics with proper data validation
     */
    calculateTimelineStatistics(
        visibleEvents: any[],
        totalEvents: any[],
        timeRange: [Date, Date],
        activeBranches: string[]
    ): TimelineStatistics {
        // Ensure we have valid data
        const safeVisibleEvents = visibleEvents || [];
        const safeTotalEvents = totalEvents || [];
        const safeBranches = activeBranches || [];

        // Calculate time window in days
        let timeWindowDays = 1;
        if (timeRange && timeRange[0] && timeRange[1]) {
            const msPerDay = 24 * 60 * 60 * 1000;
            timeWindowDays = Math.max(1,
                Math.ceil((timeRange[1].getTime() - timeRange[0].getTime()) / msPerDay)
            );
        }

        // Calculate contributors (unique authors)
        const contributors = new Set(
            safeVisibleEvents
                .map(e => e.author)
                .filter(author => author != null)
        ).size;

        // Calculate velocity (events per day)
        const velocity = safeVisibleEvents.length / timeWindowDays;

        // Event type breakdown
        const eventTypes = new Map<string, number>();
        safeVisibleEvents.forEach(event => {
            const type = event.type || 'unknown';
            eventTypes.set(type, (eventTypes.get(type) || 0) + 1);
        });

        return {
            visibleEvents: safeVisibleEvents.length,
            totalEvents: safeTotalEvents.length,
            contributors: contributors,
            activeBranches: safeBranches.length,
            timeWindowDays: timeWindowDays,
            velocity: parseFloat(velocity.toFixed(2)),
            eventTypes: Object.fromEntries(eventTypes),
            dateRange: timeRange ? {
                start: this.formatDate(timeRange[0]),
                end: this.formatDate(timeRange[1])
            } : { start: 'N/A', end: 'N/A' }
        };
    }

    /**
     * Calculate velocity metrics (events per time period)
     */
    calculateVelocityMetrics(events: any[], timeRange: [Date, Date]): VelocityMetrics {
        const days = this.calculateTimeWindowDays(timeRange);
        const weeks = days / 7;
        const months = days / 30;

        const eventsPerDay = days > 0 ? events.length / days : 0;
        const eventsPerWeek = weeks > 0 ? events.length / weeks : 0;
        const eventsPerMonth = months > 0 ? events.length / months : 0;

        const averageInterval = this.calculateAverageEventInterval(events);

        return {
            eventsPerDay: Number(eventsPerDay.toFixed(1)),
            eventsPerWeek: Number(eventsPerWeek.toFixed(1)),
            eventsPerMonth: Number(eventsPerMonth.toFixed(1)),
            averageInterval: Number(averageInterval.toFixed(1))
        };
    }

    /**
     * Calculate distribution metrics across different dimensions
     */
    calculateDistributionMetrics(events: any[]): DistributionMetrics {
        const eventTypeDistribution = this.d3.rollup(events, (v: any[]) => v.length, (d: any) => d.type);
        const branchDistribution = this.d3.rollup(events, (v: any[]) => v.length, (d: any) => d.branch);
        const authorDistribution = this.d3.rollup(events, (v: any[]) => v.length, (d: any) => d.author);

        // Time distribution by day of week
        const timeDistribution = this.d3.rollup(
            events,
            (v: any[]) => v.length,
            (d: any) => this.d3.timeFormat("%A")(new Date(d.timestamp))
        );

        return {
            eventTypeDistribution,
            branchDistribution,
            authorDistribution,
            timeDistribution
        };
    }

    /**
     * Calculate velocity (events per day)
     */
    calculateVelocity(events: any[], days: number): number {
        if (days <= 0) return 0;
        return Number((events.length / Math.max(1, days)).toFixed(1));
    }

    /**
     * Calculate time window in days
     */
    private calculateTimeWindowDays(timeRange: [Date, Date]): number {
        return Math.ceil((timeRange[1].getTime() - timeRange[0].getTime()) / (1000 * 60 * 60 * 24));
    }

    /**
     * Count unique contributors
     */
    private countUniqueContributors(events: any[]): number {
        return new Set(events.map(e => e.author).filter(Boolean)).size;
    }

    /**
     * Format date range for display
     */
    private formatDateRange(timeRange: [Date, Date]): { start: string; end: string } {
        const dateFormat = this.d3.timeFormat("%b %d, %Y");
        return {
            start: dateFormat(timeRange[0]),
            end: dateFormat(timeRange[1])
        };
    }

    /**
     * Format single date with validation
     */
    private formatDate(date: Date): string {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
            return 'N/A';
        }
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    /**
     * Generate summary statistics for UI display
     */
    generateStatsSummary(
        visibleEvents: any[],
        totalEvents: any[],
        timeRange: [Date, Date],
        activeBranches: string[]
    ): { [key: string]: string | number } {
        const stats = this.calculateTimelineStatistics(
            visibleEvents,
            totalEvents,
            timeRange,
            activeBranches
        );

        return {
            'stat-visible': stats.visibleEvents,
            'stat-total': stats.totalEvents,
            'stat-contributors': stats.contributors,
            'stat-branches': stats.activeBranches,
            'stat-window': `${stats.timeWindowDays} ${stats.timeWindowDays === 1 ? 'day' : 'days'}`,
            'stat-velocity': `${stats.velocity}/day`,
            'range-start-label': stats.dateRange.start,
            'range-end-label': stats.dateRange.end
        };
    }

    /**
     * Calculate average time interval between events
     */
    private calculateAverageEventInterval(events: any[]): number {
        if (events.length < 2) return 0;

        const sortedEvents = events
            .map(e => new Date(e.timestamp))
            .sort((a, b) => a.getTime() - b.getTime());

        let totalInterval = 0;
        let intervals = 0;

        for (let i = 1; i < sortedEvents.length; i++) {
            const interval = sortedEvents[i].getTime() - sortedEvents[i - 1].getTime();
            totalInterval += interval;
            intervals++;
        }

        // Return average interval in hours
        return intervals > 0 ? totalInterval / intervals / (1000 * 60 * 60) : 0;
    }

    /**
     * Calculate event frequency over time periods
     */
    calculateEventFrequency(events: any[], periodDays: number = 1): Map<string, number> {
        const dateFormat = periodDays === 1
            ? this.d3.timeFormat("%Y-%m-%d")
            : this.d3.timeFormat("%Y-%m");

        return this.d3.rollup(
            events,
            (v: any[]) => v.length,
            (d: any) => dateFormat(new Date(d.timestamp))
        );
    }

    /**
     * Calculate impact metrics
     */
    calculateImpactMetrics(events: any[]): {
        totalImpact: number;
        averageImpact: number;
        maxImpact: number;
        impactDistribution: Map<string, number>;
    } {
        const impacts = events.map(e => e.impact || 0).filter(i => i > 0);

        if (impacts.length === 0) {
            return {
                totalImpact: 0,
                averageImpact: 0,
                maxImpact: 0,
                impactDistribution: new Map()
            };
        }

        const totalImpact = this.d3.sum(impacts);
        const averageImpact = this.d3.mean(impacts);
        const maxImpact = this.d3.max(impacts);

        // Group by impact ranges
        const impactDistribution = this.d3.rollup(
            events.filter(e => e.impact),
            (v: any[]) => v.length,
            (d: any) => {
                const impact = d.impact || 0;
                if (impact < 10) return "Low (0-9)";
                if (impact < 50) return "Medium (10-49)";
                if (impact < 90) return "High (50-89)";
                return "Very High (90+)";
            }
        );

        return {
            totalImpact: Number(totalImpact.toFixed(1)),
            averageImpact: Number(averageImpact.toFixed(1)),
            maxImpact,
            impactDistribution
        };
    }

}