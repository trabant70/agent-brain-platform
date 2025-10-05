/**
 * LegendRenderer - Legend Management and Display
 * Stage 3: Extracted from embedded JavaScript code
 *
 * Handles:
 * - Event type legend rendering
 * - Color mapping display
 * - Dynamic legend updates based on available event types
 *
 * Now uses EventVisualTheme for consistent colors across the extension
 */

import { EventVisualTheme } from '../theme/EventVisualTheme';

export interface LegendOptions {
    selector: string;
    colorMap: { [key: string]: string };
}

/**
 * LegendRenderer class - manages the timeline legend
 */
export class LegendRenderer {
    private legend: any; // D3 selection of .legend element
    private container: any; // D3 selection of #legend-items
    private colorMap: { [key: string]: string };
    private dragSetup: boolean = false;

    constructor(options: LegendOptions) {
        this.colorMap = options.colorMap;
        this.setupContainer(options.selector);
    }

    /**
     * Setup the D3 container selection - EXACTLY like EventDetailsPopup
     */
    private setupContainer(selector: string): void {
        const d3 = (window as any).d3;

        // Select legend directly by ID - same as EventDetailsPopup does
        this.legend = d3.select('#timeline-legend');
        this.container = d3.select(selector);

        console.log('[LegendRenderer] setupContainer - legend selection:', this.legend, 'empty?', this.legend.empty());
        console.log('[LegendRenderer] setupContainer - container selection:', this.container, 'empty?', this.container.empty());
    }

    /**
     * Setup drag behavior - EXACT COPY of FilterController.enableMenuDragging()
     */
    private setupDragBehavior(): void {
        if (this.dragSetup) {
            return;
        }

        const legendElement = document.getElementById('timeline-legend');
        if (!legendElement) {
            console.log('[LegendRenderer] Could not find #timeline-legend');
            return;
        }

        const legendTitle = legendElement.querySelector('.legend-title') as HTMLElement;
        if (!legendTitle) {
            console.log('[LegendRenderer] Could not find .legend-title');
            return;
        }

        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let initialLeft = 0;
        let initialTop = 0;

        const onMouseDown = (e: MouseEvent) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;

            // Get current computed position (not bounding rect)
            const computedStyle = window.getComputedStyle(legendElement);
            initialLeft = parseInt(computedStyle.left) || 0;
            initialTop = parseInt(computedStyle.top) || 0;

            legendElement.style.cursor = 'grabbing';
            legendTitle.style.cursor = 'grabbing';
            e.preventDefault();
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;

            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            legendElement.style.left = `${initialLeft + deltaX}px`;
            legendElement.style.top = `${initialTop + deltaY}px`;
            legendElement.style.right = 'auto';
            legendElement.style.bottom = 'auto';
        };

        const onMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                legendElement.style.cursor = '';
                legendTitle.style.cursor = 'grab';
            }
        };

        legendTitle.addEventListener('mousedown', onMouseDown as EventListener);
        document.addEventListener('mousemove', onMouseMove as EventListener);
        document.addEventListener('mouseup', onMouseUp as EventListener);

        // Make title cursor indicate draggability
        legendTitle.style.cursor = 'grab';

        this.dragSetup = true;
    }

    /**
     * Update legend with available event types and sync states
     */
    updateLegend(availableEventTypes: string[]): void {
        const legendElement = this.container.node()?.parentElement;

        if (!legendElement) {
            return;
        }

        // Clear existing content div
        let contentDiv = legendElement.querySelector('.legend-content');
        if (!contentDiv) {
            // Create content div if it doesn't exist
            contentDiv = document.createElement('div');
            contentDiv.className = 'legend-content';
            legendElement.appendChild(contentDiv);
        }
        contentDiv.innerHTML = '';

        // Use D3 to select the content div
        const d3 = (window as any).d3;
        const contentSelection = d3.select(contentDiv);

        // Defensive programming: filter out any invalid types that may have slipped through
        const validEventTypes = (availableEventTypes || []).filter(type =>
            type && typeof type === 'string' && type.trim().length > 0
        );

        const colorMode = EventVisualTheme.getColorMode();

        // Event Types Section (Shapes and Colors in semantic mode)
        const eventTypeTitle = colorMode === 'semantic'
            ? 'Event Types (Shape & Color)'
            : 'Event Types (Shape)';

        contentSelection.append('div')
            .attr('class', 'legend-section')
            .html(`<div class="legend-section-title">${eventTypeTitle}</div>`);

        contentSelection.append('div')
            .attr('class', 'legend-items')
            .selectAll('.legend-item')
            .data(validEventTypes)
            .join('div')
            .attr('class', 'legend-item')
            .html((d: string) => {
                const visual = EventVisualTheme.getEventVisual(d);
                const label = EventVisualTheme.getEventLabel(d);
                const icon = visual.icon || '●';
                const color = EventVisualTheme.getSemanticColor(d);
                return `<div class="legend-shape" style="color: ${color}">${icon}</div><span>${label}</span>`;
            });

        // Sync States Section (Colors) - only show in sync-state mode
        if (colorMode === 'sync-state') {
            contentSelection.append('div')
                .attr('class', 'legend-section')
                .style('margin-top', '12px')
                .html('<div class="legend-section-title">Sync State (Color)</div>');

            const syncStates = EventVisualTheme.getAllSyncStates();
            contentSelection.append('div')
                .attr('class', 'legend-items')
                .selectAll('.legend-sync-item')
                .data(syncStates)
                .join('div')
                .attr('class', 'legend-item legend-sync-item')
                .html((state: any) => {
                    const visual = EventVisualTheme.getSyncStateVisual(state);
                    return `<div class="legend-color" style="background-color: ${visual.color}"></div><span>${visual.label}</span>`;
                });
        }

        // Setup drag behavior after content is rendered
        this.setupDragBehavior();
    }

    /**
     * Get the standard color map for event types
     * Now delegates to EventVisualTheme for consistency
     */
    static getStandardColorMap(): { [key: string]: string } {
        return EventVisualTheme.getColorMap();
    }
}