/**
 * TimelineUISimulator - UI Testing Infrastructure for Pathway Tests
 *
 * Provides jsdom-based simulation of UI interactions for integration testing.
 * Enables testing of webview components without full VSCode environment.
 *
 * Phase 2 - Week 3: UI Simulator Tools
 */

import { JSDOM } from 'jsdom';
import { FilterState, EventType } from '../../src/core/CanonicalEvent';
import { getLogCapture, LogEntry } from './LogCapture';
import { LogPathway } from '../../src/utils/Logger';

export interface RenderedEvent {
    id: string;
    type: string;
    timestamp: Date;
    x?: number;
    y?: number;
}

export interface SimulatorOptions {
    width?: number;
    height?: number;
    enableLogging?: boolean;
}

/**
 * Simulates timeline UI for integration testing
 */
export class TimelineUISimulator {
    private dom: JSDOM | null = null;
    private document: Document | null = null;
    private window: Window | null = null;
    private container: HTMLElement | null = null;

    // UI state
    private activeFilters: FilterState = {};
    private visibleDateRange: [Date, Date] | null = null;
    private renderedEvents: RenderedEvent[] = [];

    // Configuration
    private options: Required<SimulatorOptions>;

    constructor(options: SimulatorOptions = {}) {
        this.options = {
            width: options.width || 1200,
            height: options.height || 800,
            enableLogging: options.enableLogging ?? true
        };
    }

    /**
     * Set up DOM environment with jsdom
     */
    setupDOM(): void {
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Timeline Test</title>
                <style>
                    body { margin: 0; padding: 0; }
                    #visualization { width: ${this.options.width}px; height: ${this.options.height}px; }
                    .filter-button { cursor: pointer; }
                    .range-selector { width: 100%; }
                </style>
            </head>
            <body>
                <div id="visualization"></div>
                <div id="filters"></div>
                <div id="range-selector"></div>
            </body>
            </html>
        `;

        this.dom = new JSDOM(html, {
            url: 'http://localhost',
            pretendToBeVisual: true,
            resources: 'usable'
        });

        this.document = this.dom.window.document;
        this.window = this.dom.window as unknown as Window;
        this.container = this.document.getElementById('visualization');

        // Set up globals for webview code
        (global as any).document = this.document;
        (global as any).window = this.window;
        (global as any).HTMLElement = this.window.HTMLElement;
        (global as any).SVGElement = this.window.SVGElement;

        if (this.options.enableLogging) {
            console.log('[TimelineUISimulator] DOM setup complete', {
                width: this.options.width,
                height: this.options.height
            });
        }
    }

    /**
     * Simulate clicking a filter checkbox/button
     */
    clickFilter(filterType: string, value?: string): void {
        if (!this.document) {
            throw new Error('DOM not set up. Call setupDOM() first.');
        }

        if (this.options.enableLogging) {
            console.log(`[TimelineUISimulator] Clicking filter: ${filterType}`, value);
        }

        // Update internal filter state
        if (filterType === 'eventType') {
            const current = this.activeFilters.selectedEventTypes || [];
            if (value) {
                if (current.includes(value as EventType)) {
                    this.activeFilters.selectedEventTypes = current.filter(t => t !== value);
                } else {
                    this.activeFilters.selectedEventTypes = [...current, value as EventType];
                }
            }
        } else if (filterType === 'branch') {
            const current = this.activeFilters.selectedBranches || [];
            if (value) {
                if (current.includes(value)) {
                    this.activeFilters.selectedBranches = current.filter(b => b !== value);
                } else {
                    this.activeFilters.selectedBranches = [...current, value];
                }
            }
        } else if (filterType === 'author') {
            const current = this.activeFilters.selectedAuthors || [];
            if (value) {
                if (current.includes(value)) {
                    this.activeFilters.selectedAuthors = current.filter(a => a !== value);
                } else {
                    this.activeFilters.selectedAuthors = [...current, value];
                }
            }
        }

        // Trigger filter change event
        this.triggerFilterChange();
    }

    /**
     * Simulate dragging range selector
     */
    dragRangeSelector(startDate: Date, endDate: Date): void {
        if (!this.document) {
            throw new Error('DOM not set up. Call setupDOM() first.');
        }

        if (this.options.enableLogging) {
            console.log('[TimelineUISimulator] Dragging range selector:', {
                start: startDate.toISOString(),
                end: endDate.toISOString()
            });
        }

        this.visibleDateRange = [startDate, endDate];

        // Trigger range change event
        this.triggerRangeChange();
    }

    /**
     * Simulate hovering over an event
     */
    hoverEvent(eventId: string): void {
        if (!this.document) {
            throw new Error('DOM not set up. Call setupDOM() first.');
        }

        if (this.options.enableLogging) {
            console.log(`[TimelineUISimulator] Hovering event: ${eventId}`);
        }

        // Find event element and trigger mouseover
        const eventElement = this.document.querySelector(`[data-event-id="${eventId}"]`);
        if (eventElement) {
            const event = new this.window!.MouseEvent('mouseover', {
                bubbles: true,
                cancelable: true
            });
            eventElement.dispatchEvent(event);
        }
    }

    /**
     * Simulate clicking an event
     */
    clickEvent(eventId: string): void {
        if (!this.document) {
            throw new Error('DOM not set up. Call setupDOM() first.');
        }

        if (this.options.enableLogging) {
            console.log(`[TimelineUISimulator] Clicking event: ${eventId}`);
        }

        // Find event element and trigger click
        const eventElement = this.document.querySelector(`[data-event-id="${eventId}"]`);
        if (eventElement) {
            const event = new this.window!.MouseEvent('click', {
                bubbles: true,
                cancelable: true
            });
            eventElement.dispatchEvent(event);
        }
    }

    /**
     * Get currently rendered events
     */
    getRenderedEvents(): RenderedEvent[] {
        if (!this.document) {
            throw new Error('DOM not set up. Call setupDOM() first.');
        }

        // Parse DOM to extract rendered events
        const eventElements = this.document.querySelectorAll('[data-event-id]');
        this.renderedEvents = Array.from(eventElements).map(el => ({
            id: el.getAttribute('data-event-id') || '',
            type: el.getAttribute('data-event-type') || '',
            timestamp: new Date(el.getAttribute('data-timestamp') || ''),
            x: parseFloat(el.getAttribute('data-x') || '0'),
            y: parseFloat(el.getAttribute('data-y') || '0')
        }));

        return this.renderedEvents;
    }

    /**
     * Get active filter state
     */
    getActiveFilters(): FilterState {
        return { ...this.activeFilters };
    }

    /**
     * Get visible date range from range selector
     */
    getVisibleDateRange(): [Date, Date] | null {
        return this.visibleDateRange ? [...this.visibleDateRange] as [Date, Date] : null;
    }

    /**
     * Capture pathway logs (convenience wrapper)
     */
    capturePathwayLogs(pathway: LogPathway): LogEntry[] {
        return getLogCapture().getLogsForPathway(pathway);
    }

    /**
     * Set rendered events (for testing renderer output)
     */
    setRenderedEvents(events: RenderedEvent[]): void {
        this.renderedEvents = events;

        // Update DOM to reflect rendered events
        if (this.container) {
            this.container.innerHTML = '';
            events.forEach(event => {
                const el = this.document!.createElement('div');
                el.setAttribute('data-event-id', event.id);
                el.setAttribute('data-event-type', event.type);
                el.setAttribute('data-timestamp', event.timestamp.toISOString());
                if (event.x !== undefined) el.setAttribute('data-x', event.x.toString());
                if (event.y !== undefined) el.setAttribute('data-y', event.y.toString());
                el.className = 'timeline-event';
                this.container!.appendChild(el);
            });
        }
    }

    /**
     * Reset simulator state
     */
    reset(): void {
        this.activeFilters = {};
        this.visibleDateRange = null;
        this.renderedEvents = [];

        if (this.container) {
            this.container.innerHTML = '';
        }

        if (this.options.enableLogging) {
            console.log('[TimelineUISimulator] State reset');
        }
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        if (this.dom) {
            this.dom.window.close();
        }

        // Clean up globals
        delete (global as any).document;
        delete (global as any).window;
        delete (global as any).HTMLElement;
        delete (global as any).SVGElement;

        this.dom = null;
        this.document = null;
        this.window = null;
        this.container = null;

        if (this.options.enableLogging) {
            console.log('[TimelineUISimulator] Disposed');
        }
    }

    // Private helper methods

    private triggerFilterChange(): void {
        // Simulate filter change event that would be caught by FilterController
        if (this.window && this.options.enableLogging) {
            console.log('[TimelineUISimulator] Filter change triggered', this.activeFilters);
        }

        // In actual implementation, this would trigger FilterController callbacks
        // For testing, we just update internal state
    }

    private triggerRangeChange(): void {
        // Simulate range change event that would be caught by range selector handlers
        if (this.window && this.options.enableLogging) {
            console.log('[TimelineUISimulator] Range change triggered', this.visibleDateRange);
        }

        // In actual implementation, this would trigger brush callbacks
        // For testing, we just update internal state
    }

    /**
     * Get container element
     */
    getContainer(): HTMLElement | null {
        return this.container;
    }

    /**
     * Get document
     */
    getDocument(): Document | null {
        return this.document;
    }

    /**
     * Get window
     */
    getWindow(): Window | null {
        return this.window;
    }
}
