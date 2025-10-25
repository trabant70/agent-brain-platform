/**
 * StatisticsCalculator
 *
 * Handles statistics computation and DOM updates for timeline rendering.
 * Responsible for:
 * - Computing summary statistics from processed data
 * - Updating statistics display in the DOM
 * - Formatting statistics for display
 * - Calculating time-based metrics (window, velocity)
 */

import { webviewLogger, LogCategory, LogPathway } from '../WebviewLogger';

interface SummaryStats {
    visible: number;
    total: number;
    contributors: number;
    branches: number;
    window: string;
    velocity: string;
}

interface ProcessedData {
    visibleEvents: any[];
    allEvents: any[];
    fullDateRange: [Date, Date];
    activeBranches: string[];
    statistics?: any;
}

export class StatisticsCalculator {
    /**
     * Calculate summary statistics from processed timeline data
     */
    calculateSummaryStats(
        visibleEventCount: number,
        totalEventCount: number,
        contributorCount: number,
        activeBranches: number,
        fullDateRange: [Date, Date]
    ): SummaryStats {
        return {
            visible: visibleEventCount,
            total: totalEventCount,
            contributors: contributorCount,
            branches: activeBranches,
            window: this.calculateWindow(fullDateRange),
            velocity: this.calculateVelocity(visibleEventCount, fullDateRange)
        };
    }

    /**
     * Calculate full statistics object from processed data
     */
    calculateStatistics(
        visibleEventCount: number,
        totalEventCount: number,
        contributorCount: number,
        activeBranches: number,
        fullDateRange: [Date, Date]
    ) {
        return {
            totalEvents: totalEventCount,
            visibleEvents: visibleEventCount,
            totalContributors: contributorCount,
            totalBranches: activeBranches,
            dateRange: fullDateRange,
            eventTypeCounts: {}
        };
    }

    /**
     * Update statistics display in the DOM
     */
    updateStats(stats: SummaryStats): void {
        const elements = {
            'stat-visible': stats.visible,
            'stat-total': stats.total,
            'stat-contributors': stats.contributors,
            'stat-branches': stats.branches,
            'stat-window': stats.window,
            'stat-velocity': stats.velocity
        };

        Object.entries(elements).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = String(value);
            }
        });

        webviewLogger.debug(
            LogCategory.UI,
            'Statistics display updated',
            'updateStats',
            stats,
            LogPathway.RENDER_PIPELINE
        );
    }

    /**
     * Calculate window (time span in days)
     */
    calculateWindow(dateRange: [Date, Date]): string {
        if (!dateRange || !dateRange[0] || !dateRange[1]) {
            return '-';
        }
        const msPerDay = 24 * 60 * 60 * 1000;
        const days = Math.max(1, Math.ceil((dateRange[1].getTime() - dateRange[0].getTime()) / msPerDay));
        return `${days} ${days === 1 ? 'day' : 'days'}`;
    }

    /**
     * Calculate velocity (events per day)
     */
    calculateVelocity(eventCount: number, dateRange: [Date, Date]): string {
        if (!dateRange || !dateRange[0] || !dateRange[1]) {
            return '0/day';
        }
        const msPerDay = 24 * 60 * 60 * 1000;
        const days = Math.max(1, Math.ceil((dateRange[1].getTime() - dateRange[0].getTime()) / msPerDay));
        const velocity = (eventCount / days).toFixed(2);
        return `${velocity}/day`;
    }

    /**
     * Format date range for display
     */
    formatDateRange(dateRange: [Date, Date]): string {
        if (!dateRange || !dateRange[0] || !dateRange[1]) {
            return 'No date range';
        }

        const formatDate = (date: Date): string => {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        };

        return `${formatDate(dateRange[0])} - ${formatDate(dateRange[1])}`;
    }

    /**
     * Format event count for display
     */
    formatEventCount(count: number, label?: string): string {
        if (count === 0) {
            return `0 ${label || 'events'}`;
        }
        if (count === 1) {
            return `1 ${label ? label.replace(/s$/, '') : 'event'}`;
        }
        return `${count} ${label || 'events'}`;
    }

    /**
     * Calculate percentage of visible events
     */
    calculateVisibilityPercentage(visible: number, total: number): string {
        if (total === 0) return '0%';
        const percentage = (visible / total) * 100;
        return `${percentage.toFixed(1)}%`;
    }

    /**
     * Calculate average events per contributor
     */
    calculateEventsPerContributor(eventCount: number, contributorCount: number): string {
        if (contributorCount === 0) return '0';
        const average = eventCount / contributorCount;
        return average.toFixed(1);
    }

    /**
     * Generate summary text for statistics
     */
    generateSummaryText(stats: SummaryStats): string {
        const parts: string[] = [];

        // Event count
        parts.push(this.formatEventCount(stats.visible, 'events visible'));
        if (stats.total !== stats.visible) {
            parts.push(`out of ${stats.total} total`);
        }

        // Contributors
        if (stats.contributors > 0) {
            parts.push(`by ${stats.contributors} ${stats.contributors === 1 ? 'contributor' : 'contributors'}`);
        }

        // Branches
        if (stats.branches > 0) {
            parts.push(`across ${stats.branches} ${stats.branches === 1 ? 'branch' : 'branches'}`);
        }

        // Time window
        if (stats.window && stats.window !== '-') {
            parts.push(`over ${stats.window}`);
        }

        return parts.join(', ');
    }
}
