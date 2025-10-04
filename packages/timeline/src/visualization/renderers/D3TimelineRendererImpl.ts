/**
 * D3 Timeline Renderer Implementation
 * Wraps the existing D3TimelineRenderer to conform to the ITimelineRenderer interface
 */

import {
    ITimelineRenderer,
    BaseTimelineRenderer,
    RendererCapabilities,
    RendererOptions,
    ViewportInfo,
    RendererEvent,
    RendererValidationResult
} from '../interfaces/ITimelineRenderer';
import { ProcessedTimelineData } from '../data/TimelineDataManager';
import { D3TimelineRenderer } from '../d3/D3TimelineRenderer';

export class D3TimelineRendererImpl extends BaseTimelineRenderer {
    public readonly id = 'd3-timeline';
    public readonly displayName = 'D3.js Timeline';
    public readonly version = '1.0.0';

    public readonly capabilities: RendererCapabilities = {
        supportsInteraction: true,
        supportsZoom: true,
        supportsFiltering: true,
        supportsTimeRanges: true,
        supportsRangeSelection: true,
        supportsEventDetails: true,
        supportedEventTypes: ['commit', 'merge', 'branch', 'release', 'pr', 'issue', 'ci'],
        requiresContainer: true
    };

    private d3Renderer: D3TimelineRenderer | null = null;
    private currentTimeRange: [Date, Date] = [new Date(), new Date()];
    private currentBrushRange: [Date, Date] | null = null;
    public eventHandlers: any = null; // Set by SimpleTimelineApp

    protected async initializeRenderer(): Promise<void> {
        const containerInfo = this.container instanceof HTMLElement ?
            `Element(id=${this.container.id || 'none'}, style.display=${this.container.style.display})` :
            String(this.container);

        console.log(`D3TimelineRendererImpl: [INIT-${Date.now()}] initializeRenderer called`);
        console.log(`D3TimelineRendererImpl: [INIT-${Date.now()}] container:`, containerInfo);

        if (!this.container) {
            console.error('D3TimelineRendererImpl: Container is required for D3 Timeline Renderer');
            throw new Error('Container is required for D3 Timeline Renderer');
        }

        // Check if this is a test container (hidden)
        const isTestContainer = this.container instanceof HTMLElement &&
            this.container.style.display === 'none';
        console.log(`D3TimelineRendererImpl: [INIT-${Date.now()}] isTestContainer:`, isTestContainer);

        // Create container structure for D3 renderer
        console.log(`D3TimelineRendererImpl: [INIT-${Date.now()}] Setting up container structure...`);
        this.setupContainerStructure();

        // Initialize D3 renderer with event handlers
        console.log('D3TimelineRendererImpl: Initializing D3 renderer...');
        const d3Options = {
            timelineSelector: '#visualization',
            rangeSelector: '#range-selector',
            legendSelector: '#legend-items',
            onEventHover: (event: Event, d: any) => {
                console.log('D3TimelineRendererImpl: [D3TRI] onEventHover', d?.title || d?.type);
                // Use PopupController handlers if available, fallback to local handlers
                if (this.eventHandlers?.onEventHover) {
                    this.eventHandlers.onEventHover(event, d);
                } else {
                    this.handleEventHover(event, d);
                }
            },
            onEventLeave: (event: Event, d: any) => {
                console.log('D3TimelineRendererImpl: [D3TRI] onEventLeave', d?.title || d?.type);
                if (this.eventHandlers?.onEventLeave) {
                    this.eventHandlers.onEventLeave(event, d);
                } else {
                    this.handleEventLeave(event, d);
                }
            },
            onEventClick: (event: Event, d: any) => {
                console.log('D3TimelineRendererImpl: [D3TRI] onEventClick', d?.title || d?.type);
                if (this.eventHandlers?.onEventClick) {
                    this.eventHandlers.onEventClick(event, d);
                } else {
                    this.handleEventClick(event, d);
                }
            },
            onZoom: (event: any) => this.handleZoom(event),
            onBrush: (selection: [Date, Date] | null) => this.handleBrush(selection)
        };

        this.d3Renderer = new D3TimelineRenderer(d3Options);
        console.log('D3TimelineRendererImpl: D3 renderer created successfully');
        console.log('D3TimelineRendererImpl: initializeRenderer completed');
    }

    protected async renderData(data: ProcessedTimelineData): Promise<void> {
        const rendererId = `RENDER-${Date.now()}`;
        console.log(`D3TimelineRendererImpl: [${rendererId}] renderData called with data:`, data);
        console.log(`D3TimelineRendererImpl: [${rendererId}] visibleEvents count:`, data.visibleEvents?.length);
        console.log(`D3TimelineRendererImpl: [${rendererId}] allEvents count:`, data.allEvents?.length);
        console.log(`D3TimelineRendererImpl: [${rendererId}] visibleDateRange:`, data.visibleDateRange);
        console.log(`D3TimelineRendererImpl: [${rendererId}] fullDateRange:`, data.fullDateRange);
        console.log(`D3TimelineRendererImpl: [${rendererId}] impactDomain:`, data.impactDomain);
        console.log(`D3TimelineRendererImpl: [${rendererId}] summaryStats:`, data.summaryStats);

        if (!this.d3Renderer) {
            console.error('D3TimelineRendererImpl: D3 renderer not initialized');
            throw new Error('D3 renderer not initialized');
        }

        console.log('D3TimelineRendererImpl: d3Renderer exists, proceeding with render...');

        // Update current time range
        this.currentTimeRange = data.visibleDateRange;

        try {
            // NOTE: Do NOT call resize() here - it re-renders with stale cached data!
            // The render() method handles sizing internally (lines 284-285 in TimelineRenderer.ts)

            // Render main timeline
            console.log('D3TimelineRendererImpl: Calling d3Renderer.render...');
            this.d3Renderer.render(
                data.visibleEvents,
                data.visibleDateRange,
                data.impactDomain,
                this.options.animations !== false
            );
            console.log('D3TimelineRendererImpl: d3Renderer.render completed');

            // Render range selector
            console.log('D3TimelineRendererImpl: Calling d3Renderer.renderRangeSelector...');
            this.d3Renderer.renderRangeSelector(
                data.allEvents,
                data.fullDateRange
            );
            console.log('D3TimelineRendererImpl: d3Renderer.renderRangeSelector completed');

            // Update brush range if set
            if (this.currentBrushRange) {
                console.log('D3TimelineRendererImpl: Updating brush range...');
                this.d3Renderer.updateBrushRange(this.currentBrushRange);
            }

            console.log('D3TimelineRendererImpl: renderData completed successfully');
        } catch (error) {
            console.error('D3TimelineRendererImpl: Error in renderData:', error);
            throw error;
        }
    }

    protected async updateData(data: ProcessedTimelineData): Promise<void> {
        // For D3 renderer, update is the same as render
        await this.renderData(data);
    }

    protected performResize(): void {
        if (this.d3Renderer) {
            this.d3Renderer.resize();
        }
    }

    protected cleanup(): void {
        if (this.d3Renderer) {
            // D3TimelineRenderer doesn't have explicit cleanup, but we can clear the container
            if (this.container) {
                this.container.innerHTML = '';
            }
            this.d3Renderer = null;
        }
    }

    protected getCurrentViewport(): ViewportInfo {
        return {
            dateRange: this.currentTimeRange,
            visibleEvents: this.currentData?.visibleEvents.length || 0,
            zoomLevel: 1.0 // D3 renderer doesn't expose zoom level directly
        };
    }

    protected handleTimeRangeChange(range: [Date, Date]): void {
        this.currentTimeRange = range;
        if (this.currentData) {
            // Update the data with new time range
            const updatedData: ProcessedTimelineData = {
                ...this.currentData,
                visibleDateRange: range
            };
            this.renderData(updatedData);
        }
    }

    protected handleBrushRangeChange(range: [Date, Date] | null): void {
        this.currentBrushRange = range;
        if (this.d3Renderer) {
            this.d3Renderer.updateBrushRange(range);
        }
    }

    /**
     * Update viewport implementation
     */
    updateViewport(timeRange: [Date, Date]): void {
        console.log('D3TimelineRendererImpl: Updating viewport to:', timeRange);

        if (!this.d3Renderer) {
            throw new Error('D3 renderer not initialized');
        }

        // Pass viewport update to D3 renderer
        this.d3Renderer.updateViewport(timeRange);

        // Store for future renders
        this.currentTimeRange = timeRange;
    }

    /**
     * Check viewport support
     */
    supportsViewportUpdate(): boolean {
        return true;
    }

    protected async performCustomValidation(): Promise<{ errors: string[]; warnings: string[] }> {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!this.container) {
            errors.push('Container element is required');
        } else {
            // Check if D3 is available
            if (typeof (window as any).d3 === 'undefined') {
                errors.push('D3.js library is not available');
            }

            // Check container structure
            const timeline = document.getElementById('visualization');
            const rangeSelector = document.getElementById('range-selector');
            const legend = document.getElementById('legend-items');

            if (!timeline) warnings.push('Timeline container not found');
            if (!rangeSelector) warnings.push('Range selector container not found');
            if (!legend) warnings.push('Legend container not found');
        }

        return { errors, warnings };
    }

    protected estimateMemoryUsage(): number {
        // Estimate based on events and DOM elements
        const eventCount = this.currentData?.visibleEvents.length || 0;
        const baseUsage = eventCount * 200; // bytes per event

        // Add DOM overhead
        const domElements = this.container?.querySelectorAll('*').length || 0;
        const domUsage = domElements * 50; // bytes per DOM element

        return baseUsage + domUsage;
    }

    // Event handlers that bridge to the abstract interface
    private handleEventHover(event: Event, d: any): void {
        console.log('D3TimelineRendererImpl: [D3TRI] handleEventHover - emitting hover event');
        const rendererEvent: RendererEvent = {
            type: 'hover',
            event: { type: 'mouseenter', originalEvent: event, data: d },
            position: { x: (event as MouseEvent).pageX, y: (event as MouseEvent).pageY },
            data: d
        };

        if (this.onEventInteraction) {
            this.onEventInteraction(rendererEvent);
        }

        // PopupController handles popup display through onEventInteraction
        // No direct D3 popup calls - let the sophisticated architecture handle it
    }

    private handleEventLeave(event: Event, d: any): void {
        console.log('D3TimelineRendererImpl: [D3TRI] handleEventLeave - emitting leave event');
        const rendererEvent: RendererEvent = {
            type: 'hover',
            event: { type: 'mouseleave', originalEvent: event, data: d },
            data: d
        };

        if (this.onEventInteraction) {
            this.onEventInteraction(rendererEvent);
        }

        // PopupController handles popup hiding through onEventInteraction
        // No direct D3 popup calls - let the sophisticated architecture handle it
    }

    private handleEventClick(event: Event, d: any): void {
        console.log('D3TimelineRendererImpl: [D3TRI] handleEventClick - emitting click event');
        const rendererEvent: RendererEvent = {
            type: 'click',
            event: event,
            position: { x: (event as MouseEvent).pageX, y: (event as MouseEvent).pageY },
            data: d
        };

        if (this.onEventInteraction) {
            this.onEventInteraction(rendererEvent);
        }

        // PopupController handles locked popup display through onEventInteraction
        // No direct D3 popup calls - let the sophisticated architecture handle it
    }

    private handleZoom(event: any): void {
        const rendererEvent: RendererEvent = {
            type: 'zoom',
            event: event,
            data: event
        };

        if (this.onEventInteraction) {
            this.onEventInteraction(rendererEvent);
        }
    }

    private handleBrush(selection: [Date, Date] | null): void {
        this.currentBrushRange = selection;

        const rendererEvent: RendererEvent = {
            type: 'brush',
            data: selection
        };

        if (this.onEventInteraction) {
            this.onEventInteraction(rendererEvent);
        }

        // Notify viewport change
        if (this.onViewportChange && selection) {
            const viewport: ViewportInfo = {
                dateRange: selection,
                visibleEvents: this.currentData?.visibleEvents.length || 0,
                zoomLevel: 1.0
            };
            this.onViewportChange(viewport);
        }
    }

    private setupContainerStructure(): void {
        if (!this.container) return;

        console.log('D3TimelineRendererImpl: Setting up container structure for container:', this.container.id);

        // Check if we have the existing timeline.html structure
        const existingVisualization = document.getElementById('visualization');
        const existingRangeSelector = document.getElementById('range-selector');
        const existingLegend = document.getElementById('legend-items');

        if (existingVisualization && existingRangeSelector && existingLegend) {
            console.log('D3TimelineRendererImpl: Using existing HTML template structure');
            // Use the existing HTML template structure - no need to create new DOM
            return;
        }

        console.log('D3TimelineRendererImpl: Creating fallback DOM structure');

        // Create the necessary container structure for D3 renderer (fallback only)
        this.container.innerHTML = `
            <div class="d3-timeline-container">
                <div id="visualization" class="timeline-visualization">
                    <svg id="main-svg"></svg>
                </div>
                <div id="range-selector" class="range-selector">
                    <svg id="range-svg"></svg>
                </div>
                <div class="legend">
                    <div class="legend-title">Legend</div>
                    <div id="legend-items"></div>
                </div>
            </div>
        `;

        // Add basic styling
        const style = document.createElement('style');
        style.textContent = `
            .d3-timeline-container {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
            }

            .timeline-visualization {
                flex: 1;
                min-height: 400px;
            }

            .range-selector {
                height: 80px;
                margin: 10px 0;
            }

            .timeline-legend {
                height: 40px;
                display: flex;
                align-items: center;
                padding: 5px 10px;
            }
        `;

        this.container.appendChild(style);
    }
}

// Factory function for renderer registry
export async function createD3TimelineRenderer(
    container: HTMLElement | string,
    options?: RendererOptions
): Promise<ITimelineRenderer> {
    const renderer = new D3TimelineRendererImpl();
    await renderer.initialize(container, options);
    return renderer;
}