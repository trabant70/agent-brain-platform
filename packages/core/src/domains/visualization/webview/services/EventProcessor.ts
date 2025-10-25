/**
 * EventProcessor
 *
 * Handles event processing and transformation for timeline rendering.
 * Responsible for:
 * - Processing events into renderer format
 * - Multi-branch explosion (one instance per branch)
 * - Impact calculation
 * - Branch filtering
 * - Connection building (migration lines)
 */

import { webviewLogger, LogCategory, LogPathway } from '../WebviewLogger';

interface CanonicalEvent {
    id: string;
    timestamp: string | Date;
    type: string;
    title: string;
    description?: string;
    author: { id: string; name: string };
    branches: string[];
    primaryBranch?: string;
    hash?: string;
    fullHash?: string;
    providerId?: string;
    sources?: any[];
    impact?: any;
    metadata?: any;
}

interface FilterOptions {
    branches: string[];
    authors: string[];
    eventTypes: string[];
    providers: string[];
    dateRange?: { earliest: Date; latest: Date };
}

export class EventProcessor {
    private currentAppliedFilters: any = null;

    /**
     * Set current applied filters (for branch visibility)
     */
    setAppliedFilters(filters: any): void {
        this.currentAppliedFilters = filters;
    }

    /**
     * Process events into renderer format
     */
    processEvents(events: CanonicalEvent[], totalEventCount: number, filterOptions: FilterOptions): any {
        // Store original unique event counts
        const visibleEventCount = events.length;  // Filtered events (changes with filters)

        // MULTI-BRANCH EXPLOSION:
        // Create one render instance per visible branch for each event
        const timelineEvents = events.flatMap(event => {
            // Filter to only selected branches
            const visibleBranches = this.filterEventBranches(event.branches);

            // Determine the origin (primary) branch for this event
            const originBranch = visibleBranches.includes(event.primaryBranch || '')
                ? event.primaryBranch
                : visibleBranches[0];

            // Create one instance per visible branch
            return visibleBranches.map((branch, index) => {
                const isPrimary = branch === originBranch;
                const instanceId = `${event.id}-${branch}`;

                // Build connections for secondary instances (migration lines)
                const connections = !isPrimary ? [{
                    targetId: `${event.id}-${originBranch}`,
                    type: 'branch-migration',
                    description: `${event.type.toUpperCase()}: "${event.title?.substring(0, 50) || event.hash?.substring(0, 7)}" migrated from ${originBranch} → ${branch}`
                }] : [];

                // Add release→commit connection for releases
                if (isPrimary && event.type === 'release' && event.hash) {
                    const targetCommit = events.find(e =>
                        (e.type === 'commit' || e.type === 'merge') &&
                        (e.hash === event.hash || e.fullHash === event.hash)
                    );
                    if (targetCommit) {
                        const commitBranches = this.filterEventBranches(targetCommit.branches);
                        const targetBranch = commitBranches.includes(originBranch)
                            ? originBranch
                            : commitBranches[0];

                        if (targetBranch) {
                            connections.push({
                                targetId: `${targetCommit.id}-${targetBranch}`,
                                type: 'release-tag',
                                description: `Release ${event.title} tags commit ${event.hash?.substring(0, 7)}`
                            });
                        }
                    }
                }

                return {
                    id: instanceId,
                    originalId: event.id,
                    timestamp: typeof event.timestamp === 'string' ? event.timestamp : event.timestamp.toISOString(),
                    type: this.normalizeEventType(event.type),
                    severity: 'info' as const,
                    title: event.title,
                    description: event.description || '',
                    branch: branch,
                    branches: [branch],
                    isPrimaryInstance: isPrimary,
                    primaryBranch: originBranch,
                    allBranches: visibleBranches,
                    author: event.author.name,
                    impact: this.calculateImpact(event),
                    filesChanged: event.impact?.filesChanged,
                    linesAdded: event.impact?.linesAdded,
                    linesRemoved: event.impact?.linesRemoved,
                    hash: event.hash,
                    providerId: event.providerId,
                    sources: event.sources,
                    metadata: {
                        ...event.metadata,
                        connections: connections
                    }
                };
            });
        });

        // Compute date ranges
        const timestamps = timelineEvents.map(e => new Date(e.timestamp));
        const fullDateRange: [Date, Date] = timestamps.length > 0
            ? [new Date(Math.min(...timestamps.map(d => d.getTime()))), new Date(Math.max(...timestamps.map(d => d.getTime())))]
            : [new Date(), new Date()];

        // Compute impact domain
        const impacts = timelineEvents.map(e => e.impact || 1);
        const impactDomain: [number, number] = impacts.length > 0
            ? [Math.min(...impacts), Math.max(...impacts)]
            : [1, 100];

        // Compute active branches from FILTERED events
        const activeBranchesSet = new Set<string>();
        timelineEvents.forEach(event => {
            event.branches.forEach((branch: string) => activeBranchesSet.add(branch));
        });
        const activeBranches = Array.from(activeBranchesSet).sort();

        // Compute unique contributors from FILTERED events
        const contributorsSet = new Set<string>();
        timelineEvents.forEach(event => {
            contributorsSet.add(event.author);
        });
        const contributorCount = contributorsSet.size;

        return {
            visibleEvents: timelineEvents,
            allEvents: timelineEvents,
            fullDateRange,
            visibleDateRange: fullDateRange,
            impactDomain,
            activeBranches: activeBranches,
            statistics: {
                totalEvents: totalEventCount,
                visibleEvents: visibleEventCount,
                totalContributors: contributorCount,
                totalBranches: activeBranches.length,
                dateRange: fullDateRange,
                eventTypeCounts: {}
            },
            summaryStats: {
                visible: visibleEventCount,
                total: totalEventCount,
                contributors: contributorCount,
                branches: activeBranches.length,
                window: this.calculateWindow(fullDateRange),
                velocity: this.calculateVelocity(visibleEventCount, fullDateRange)
            }
        };
    }

    /**
     * Filter event's branches to only selected branches
     */
    private filterEventBranches(eventBranches: string[]): string[] {
        // Handle events with no branches
        if (!eventBranches || eventBranches.length === 0) {
            return ['main'];
        }

        // If no applied filters or no branch filter, show all branches
        if (!this.currentAppliedFilters || !this.currentAppliedFilters.selectedBranches) {
            return eventBranches;
        }

        const selectedBranches = this.currentAppliedFilters.selectedBranches;

        // If selectedBranches is empty or undefined, show all branches
        if (!selectedBranches || selectedBranches.length === 0) {
            return eventBranches;
        }

        // Filter to only selected branches
        const visibleBranches = eventBranches.filter(branch =>
            selectedBranches.includes(branch)
        );

        // Safety: if filtering removes all branches, keep first available
        if (visibleBranches.length === 0 && eventBranches.length > 0) {
            return [eventBranches[0]];
        }

        // Final fallback for empty result
        if (visibleBranches.length === 0) {
            return ['main'];
        }

        return visibleBranches;
    }

    /**
     * Normalize event type
     */
    private normalizeEventType(type: string): string {
        return type.toLowerCase().replace(/-/g, '_');
    }

    /**
     * Calculate impact
     */
    private calculateImpact(event: CanonicalEvent): number {
        if (!event.impact) return 1;

        const { filesChanged = 0, linesAdded = 0, linesRemoved = 0 } = event.impact;
        const fileImpact = Math.min(filesChanged * 10, 50);
        const lineImpact = Math.min((linesAdded + linesRemoved) / 10, 50);

        return Math.max(1, fileImpact + lineImpact);
    }

    /**
     * Calculate window (time span in days)
     */
    private calculateWindow(dateRange: [Date, Date]): string {
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
    private calculateVelocity(eventCount: number, dateRange: [Date, Date]): string {
        if (!dateRange || !dateRange[0] || !dateRange[1]) {
            return '0/day';
        }
        const msPerDay = 24 * 60 * 60 * 1000;
        const days = Math.max(1, Math.ceil((dateRange[1].getTime() - dateRange[0].getTime()) / msPerDay));
        const velocity = (eventCount / days).toFixed(2);
        return `${velocity}/day`;
    }
}
