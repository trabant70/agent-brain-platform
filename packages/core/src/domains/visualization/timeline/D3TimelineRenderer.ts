/**
 * Timeline Rendering and Zoom Fixes
 *
 * This fix addresses:
 * 1. Event circles not appearing due to incorrect date range
 * 2. Zoom not creating finer time intervals
 * 3. Proper event positioning based on actual data
 *
 * Main orchestrator that coordinates all D3.js rendering classes:
 * - TimelineRenderer: Main timeline visualization
 * - InteractionHandler: Zoom and range selection
 * - EventRenderer: Event analysis and popup management
 * - LegendRenderer: Legend display
 */

import { TimelineRenderer, TimelineRenderOptions } from './TimelineRenderer';
import { InteractionHandler, InteractionOptions } from './InteractionHandler';
import { EventDetailsPopup, EventAnalyzer } from './EventRenderer';
import { LegendRenderer, LegendOptions } from './LegendRenderer';

export interface D3TimelineOptions {
    timelineSelector: string;
    rangeSelector: string;
    legendSelector: string;
    onEventHover: (event: Event, d: any) => void;
    onEventLeave: (event: Event, d: any) => void;
    onEventClick: (event: Event, d: any) => void;
    onZoom: (event: any) => void;
    onBrush: (selection: [Date, Date] | null) => void;
}

/**
 * Main D3 Timeline Renderer that coordinates all visualization components
 */
export class D3TimelineRenderer {
    private timelineRenderer: TimelineRenderer;
    private interactionHandler: InteractionHandler;
    private eventDetailsPopup: EventDetailsPopup;
    private legendRenderer: LegendRenderer;

    private allEvents: any[] = [];
    private currentDateRange: [Date, Date] = [new Date(), new Date()];
    private currentBrushRange: [Date, Date] | null = null;
    private currentViewport: [Date, Date] | null = null;
    private isInitialRender = true;

    constructor(options: D3TimelineOptions) {
        // Initialize timeline renderer
        const timelineOptions: TimelineRenderOptions = {
            selector: options.timelineSelector,
            onEventHover: (event, d) => {
                console.log('D3TimelineRenderer: [D3TR] event hover', d?.title || d?.type);
                if (options.onEventHover) {
                    options.onEventHover(event, d);
                }
            },
            onEventLeave: (event, d) => {
                console.log('D3TimelineRenderer: [D3TR] event leave', d?.title || d?.type);
                if (options.onEventLeave) {
                    options.onEventLeave(event, d);
                }
            },
            onEventClick: (event, d) => {
                console.log('D3TimelineRenderer: [D3TR] event click', d?.title || d?.type);
                if (options.onEventClick) {
                    options.onEventClick(event, d);
                }
            },
            onZoom: options.onZoom
        };
        this.timelineRenderer = new TimelineRenderer(timelineOptions);

        // Initialize interaction handler
        const interactionOptions: InteractionOptions = {
            selector: options.rangeSelector,
            onBrush: options.onBrush
        };
        this.interactionHandler = new InteractionHandler(interactionOptions);

        // Initialize event details popup
        this.eventDetailsPopup = new EventDetailsPopup();

        // Initialize legend renderer
        const legendOptions: LegendOptions = {
            selector: options.legendSelector,
            colorMap: LegendRenderer.getStandardColorMap()
        };
        this.legendRenderer = new LegendRenderer(legendOptions);
    }

    /**
     * Resize all components
     */
    resize(): void {
        this.timelineRenderer.resize();
        this.interactionHandler.resize();
    }

    /**
     * Update viewport while preserving timeline structure
     */
    public updateViewport(timeRange: [Date, Date]): void {
        console.log('D3TimelineRenderer: updateViewport called:', timeRange);
        this.currentViewport = timeRange;

        if (!this.timelineRenderer) {
            console.error('D3TimelineRenderer: Timeline renderer not initialized');
            return;
        }

        if (this.allEvents && this.allEvents.length > 0) {
            // Filter events within the new viewport
            const visibleEvents = this.filterEventsForViewport(this.allEvents, timeRange);

            console.log('D3TimelineRenderer: Filtered to', visibleEvents.length, 'visible events');

            // Calculate branches - use default if no events
            const activeBranches = visibleEvents.length > 0
                ? this.getActiveBranches(visibleEvents)
                : ['main'];  // Keep at least one branch for valid scale

            // Calculate impact domain - use default if no events
            const impactDomain = visibleEvents.length > 0
                ? this.calculateImpactDomain(visibleEvents)
                : [1, 100] as [number, number];

            console.log('D3TimelineRenderer: Rendering with', visibleEvents.length, 'events');

            // Always render, even with empty events (to maintain axis/structure)
            this.timelineRenderer.render(
                visibleEvents,  // Can be empty, that's OK
                activeBranches,  // Never empty
                timeRange,
                impactDomain,
                false
            );
        } else {
            console.log('D3TimelineRenderer: No events available, maintaining timeline structure');
            // Maintain timeline structure when no events at all
            this.timelineRenderer.render(
                [],
                ['main'],
                timeRange,
                [1, 100],
                false
            );
        }
    }

    /**
     * Main render method - properly handles initial view window
     */
    render(
        events: any[],
        dateRange: [Date, Date],
        impactDomain: [number, number],
        useTransition: boolean = true
    ): void {
        console.log('D3TimelineRenderer: render() called');
        console.log('  Events count:', events?.length);
        console.log('  Date range provided:', dateRange);
        console.log('  Is initial render:', this.isInitialRender);

        // Store all events for later filtering
        this.allEvents = events || [];

        // Validate and normalize events
        const validatedEvents = this.validateEventData(events);
        if (validatedEvents.length === 0) {
            console.log('D3TimelineRenderer: No valid events - clearing visualization');
            // IMPORTANT: Must clear the visualization when no events, not just return!
            this.timelineRenderer.render(
                [],           // No events
                ['main'],     // Keep at least one branch for valid scale
                dateRange,
                impactDomain,
                false
            );
            this.legendRenderer.updateLegend([]);
            return;
        }

        // Calculate the full date range from all events
        const fullDateRange = this.calculateEventExtent(validatedEvents);

        // Determine the initial view window
        let effectiveViewport: [Date, Date];

        if (this.isInitialRender) {
            // On initial render, check if we have a saved brush range (from persistence)
            if (this.currentBrushRange) {
                // Use saved brush range instead of calculating default
                effectiveViewport = this.currentBrushRange;
                this.currentViewport = effectiveViewport;
                console.log('D3TimelineRenderer: Using saved brush range:', effectiveViewport);
            } else {
                // No saved range, show rightmost 1/3 of timeline (default)
                effectiveViewport = this.calculateInitialViewport(fullDateRange);
                this.currentViewport = effectiveViewport;
                this.currentBrushRange = effectiveViewport;
                console.log('D3TimelineRenderer: Initial viewport calculated:', effectiveViewport);
            }
        } else if (this.currentViewport) {
            // Use current viewport if set
            effectiveViewport = this.currentViewport;
        } else {
            // Fallback to provided date range
            effectiveViewport = dateRange;
        }

        // Filter events to only those within the viewport
        const visibleEvents = this.filterEventsForViewport(validatedEvents, effectiveViewport);
        console.log('D3TimelineRenderer: Visible events after filtering:', visibleEvents.length);

        // Calculate active branches and event types from visible events
        const activeBranches = this.getActiveBranches(visibleEvents);
        const availableEventTypes = this.getAvailableEventTypes(validatedEvents);

        // Render the timeline with only visible events
        this.timelineRenderer.render(
            visibleEvents,
            activeBranches,
            effectiveViewport,
            impactDomain,
            useTransition && !this.isInitialRender
        );

        // Update legend
        this.legendRenderer.updateLegend(availableEventTypes);

        // After initial render, mark as complete
        if (this.isInitialRender) {
            this.isInitialRender = false;
        }

        console.log('D3TimelineRenderer: render completed');
    }

    /**
     * Render the range selector with proper initial selection
     */
    renderRangeSelector(allEvents: any[], fullDateRange: [Date, Date]): void {
        // Calculate initial brush range if not set
        if (!this.currentBrushRange && this.isInitialRender) {
            this.currentBrushRange = this.calculateInitialViewport(fullDateRange);
            console.log('D3TimelineRenderer: Setting initial brush range:', this.currentBrushRange);
        }

        this.interactionHandler.render(allEvents, fullDateRange, this.currentBrushRange || undefined);
    }

    /**
     * Update brush range
     */
    updateBrushRange(range: [Date, Date] | null): void {
        this.currentBrushRange = range;
    }

    /**
     * Set enabled providers for legend tab visibility
     */
    setEnabledProviders(providers: string[]): void {
        this.legendRenderer.setEnabledProviders(providers);
    }

    /**
     * Show event hover popup
     */
    showEventHover(event: any, position: { x: number; y: number }): void {
        this.eventDetailsPopup.showHover(event, position, this.allEvents);
    }

    /**
     * Show event locked popup
     */
    showEventLocked(event: any, position: { x: number; y: number }): void {
        this.eventDetailsPopup.showLocked(event, position, this.allEvents);
    }

    /**
     * Hide event popup
     */
    hideEventPopup(): void {
        this.eventDetailsPopup.hide();
    }

    /**
     * Get optimal initial view window for events
     */
    getInitialViewWindow(events: any[]): [Date, Date] {
        if (!events || events.length === 0) {
            const now = new Date();
            return [new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), now];
        }

        const d3 = (window as any).d3;
        const extent = d3.extent(events, (d: any) => d.timestamp);
        return extent[0] && extent[1] ? extent : [new Date(), new Date()];
    }

    /**
     * Get optimal range extent for events
     */
    getRangeExtent(events: any[]): [Date, Date] {
        if (!events || events.length === 0) {
            const now = new Date();
            return [new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), now];
        }

        const d3 = (window as any).d3;
        const extent = d3.extent(events, (d: any) => d.timestamp);
        return extent[0] && extent[1] ? extent : [new Date(), new Date()];
    }

    /**
     * Analyze event impact
     */
    analyzeEventImpact(event: any): any {
        return EventAnalyzer.calculateImpactBreakdown(event);
    }

    /**
     * Find events related to target event
     */
    findRelatedEvents(targetEvent: any): any[] {
        return EventAnalyzer.findRelatedEvents(targetEvent, this.allEvents);
    }

    /**
     * Calculate initial viewport (rightmost 1/3 of timeline)
     */
    private calculateInitialViewport(fullRange: [Date, Date]): [Date, Date] {
        const start = fullRange[0].getTime();
        const end = fullRange[1].getTime();
        const totalDuration = end - start;

        // Calculate 1/3 duration from the right
        const viewportDuration = totalDuration / 3;
        const viewportStart = end - viewportDuration;

        return [new Date(viewportStart), new Date(end)];
    }

    /**
     * Filter events to only those within the viewport with inclusive boundary checking
     */
    private filterEventsForViewport(events: any[], viewport: [Date, Date]): any[] {
        if (!events || events.length === 0) {
            console.log('D3TimelineRenderer: No events to filter - returning empty array');
            return [];
        }

        if (!viewport || !viewport[0] || !viewport[1]) {
            console.log('D3TimelineRenderer: Invalid viewport - returning all events');
            return events;
        }

        const filtered = events.filter(event => {
            const eventTime = event.timestamp instanceof Date ?
                event.timestamp : new Date(event.timestamp);

            // Use inclusive boundaries (>= and <=) to catch events at edges
            const inRange = eventTime >= viewport[0] && eventTime <= viewport[1];

            if (!inRange) {
                console.log('D3TimelineRenderer: Event', event.id, 'at', eventTime.toISOString(),
                            'filtered OUT of viewport');
            }

            return inRange;
        });

        console.log(`D3TimelineRenderer: Filtered ${events.length} events to ${filtered.length}`);
        return filtered;
    }

    /**
     * Get active branches from events
     */
    private getActiveBranches(events: any[]): string[] {
        const branches = new Set(events.map(e => e.branch || 'main'));
        return Array.from(branches).sort();
    }

    /**
     * Get available event types from events
     */
    private getAvailableEventTypes(events: any[]): string[] {
        const types = new Set(events.map(e => e.type || 'commit'));
        return Array.from(types).sort();
    }

    /**
     * Validate and normalize event data
     */
    private validateEventData(events: any[]): any[] {
        if (!events || !Array.isArray(events)) {
            console.warn('D3TimelineRenderer: Invalid events data');
            return [];
        }

        return events.filter(event => {
            if (!event || !event.timestamp) return false;

            // Normalize timestamp
            if (!(event.timestamp instanceof Date)) {
                event.timestamp = new Date(event.timestamp);
            }

            // Validate timestamp
            if (isNaN(event.timestamp.getTime())) {
                console.warn('D3TimelineRenderer: Invalid event timestamp:', event);
                return false;
            }

            // Set defaults
            event.branch = event.branch || 'main';
            event.type = event.type || 'commit';
            event.impact = event.impact || 1;

            return true;
        });
    }

    /**
     * Calculate the actual date extent from events
     */
    private calculateEventExtent(events: any[]): [Date, Date] {
        if (!events || events.length === 0) {
            const now = new Date();
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return [oneWeekAgo, now];
        }

        const d3 = (window as any).d3;
        if (!d3) {
            console.error('D3 not available for extent calculation');
            const firstEvent = new Date(events[0].timestamp);
            const lastEvent = new Date(events[events.length - 1].timestamp);
            return [firstEvent, lastEvent];
        }

        const extent = d3.extent(events, (d: any) => d.timestamp);

        if (!extent[0] || !extent[1]) {
            console.warn('Unable to calculate extent, using fallback');
            const now = new Date();
            const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return [oneMonthAgo, now];
        }

        // Add padding to the extent (5% on each side)
        const timeSpan = extent[1].getTime() - extent[0].getTime();
        const padding = timeSpan * 0.05;

        return [
            new Date(extent[0].getTime() - padding),
            new Date(extent[1].getTime() + padding)
        ];
    }



    /**
     * Calculate zoom level based on time range
     */
    private calculateZoomLevel(timeRange: [Date, Date]): number {
        if (!this.currentDateRange) {
            return 1.0;
        }

        const currentSpan = this.currentDateRange[1].getTime() - this.currentDateRange[0].getTime();
        const newSpan = timeRange[1].getTime() - timeRange[0].getTime();

        return currentSpan / newSpan;
    }

    /**
     * Calculate optimal time intervals based on zoom level
     */
    private calculateOptimalTimeIntervals(timeRange: [Date, Date], zoomLevel: number): any {
        const d3 = (window as any).d3;
        if (!d3) return null;

        const timeSpan = timeRange[1].getTime() - timeRange[0].getTime();
        const days = timeSpan / (24 * 60 * 60 * 1000);

        let interval, format;

        if (days > 365) {
            // Years
            interval = d3.timeYear;
            format = d3.timeFormat('%Y');
        } else if (days > 60) {
            // Months
            interval = d3.timeMonth;
            format = d3.timeFormat('%b %Y');
        } else if (days > 7) {
            // Weeks
            interval = d3.timeWeek;
            format = d3.timeFormat('%b %d');
        } else if (days > 1) {
            // Days
            interval = d3.timeDay;
            format = d3.timeFormat('%b %d');
        } else {
            // Hours
            interval = d3.timeHour;
            format = d3.timeFormat('%H:%M');
        }

        return { interval, format, timeSpan: days };
    }

    /**
     * Calculate impact domain for events
     */
    private calculateImpactDomain(events: any[]): [number, number] {
        if (!events || events.length === 0) {
            return [0, 100];
        }

        const d3 = (window as any).d3;
        if (!d3) {
            return [0, Math.max(...events.map(e => e.impact || 1))];
        }

        const extent = d3.extent(events, (d: any) => d.impact || 1);
        return [extent[0] || 0, extent[1] || 100];
    }

    /**
     * Determine if re-rendering is needed for zoom level
     */
    private shouldReRenderForZoom(zoomLevel: number): boolean {
        // Re-render if zoom changed significantly
        return zoomLevel > 2.0 || zoomLevel < 0.5;
    }

    /**
     * Show empty state when no events are available
     */
    private showEmptyState(): void {
        console.log('D3TimelineRenderer: Showing empty state');

        // Clear any existing content and show empty message
        const d3 = (window as any).d3;
        const visualization = d3.select('#visualization');

        if (!visualization.empty()) {
            visualization.selectAll('*').remove();

            visualization.append('div')
                .attr('class', 'empty-state')
                .style('display', 'flex')
                .style('align-items', 'center')
                .style('justify-content', 'center')
                .style('height', '100%')
                .style('color', '#666')
                .style('font-size', '16px')
                .text('No events to display');
        }
    }
}

// Export all classes for individual use if needed
export { TimelineRenderer, InteractionHandler, EventDetailsPopup, EventAnalyzer, LegendRenderer };