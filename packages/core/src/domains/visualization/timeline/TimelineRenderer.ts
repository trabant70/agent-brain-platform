/**
 * TimelineRenderer - Main D3.js Timeline Visualization
 * Stage 3: Extracted from embedded JavaScript code
 *
 * Handles the core D3.js timeline visualization logic including:
 * - SVG setup and management
 * - Scale configuration (time, band, size)
 * - Branch lane rendering
 * - Event connection rendering
 * - Event node rendering
 * - Axis rendering
 *
 * Now uses EventVisualTheme for consistent styling across all components
 */

import { EventVisualTheme } from '../theme/EventVisualTheme';

export interface TimelineRenderOptions {
    selector: string;
    onEventHover: (event: Event, d: any) => void;
    onEventLeave: (event: Event, d: any) => void;
    onEventClick: (event: Event, d: any) => void;
    onZoom: (event: any) => void;
}

export interface ConnectionData {
    id: string;
    type: string;
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
    event: any;
    targetEvent?: any;
    description?: string;
}

/**
 * TimelineRenderer class - encapsulates D3.js timeline visualization
 */
export class TimelineRenderer {
    private container: any;
    private svg: any;
    private mainGroup: any;
    private lanesGroup: any;
    private connectionsGroup: any;
    private eventsGroup: any;
    private axisGroup: any;

    private xScale: any;
    private yScale: any;
    private sizeScale: any;

    private margin: { top: number; right: number; bottom: number; left: number } = { top: 20, right: 20, bottom: 30, left: 120 };
    private innerWidth: number = 0;
    private innerHeight: number = 0;

    // Store last render data for resize re-rendering
    private lastRenderData: {
        events: any[];
        branches: string[];
        dateRange: [Date, Date];
        impactDomain: [number, number];
    } | null = null;

    private onEventHover: (event: Event, d: any) => void;
    private onEventLeave: (event: Event, d: any) => void;
    private onEventClick: (event: Event, d: any) => void;
    private onZoom: (event: any) => void;

    constructor(options: TimelineRenderOptions) {
        this.onEventHover = options.onEventHover;
        this.onEventLeave = options.onEventLeave;
        this.onEventClick = options.onEventClick;
        this.onZoom = options.onZoom;

        this.setupContainer(options.selector);
        this.setupSVG();
        this.setupScales();

        // Add validation for debugging
        this.validateContainerSetup();
    }

    /**
     * Setup the D3 container selection
     */
    private setupContainer(selector: string): void {
        // Note: d3 is available globally in the webview context
        this.container = (window as any).d3.select(selector);
    }

    /**
     * Setup SVG structure and zoom behavior
     */
    private setupSVG(): void {
        this.svg = this.container.select('svg#main-svg');

        const d3 = (window as any).d3;
        const zoom = d3.zoom()
            .scaleExtent([0.5, 10])
            .translateExtent([[-Infinity, -Infinity], [Infinity, Infinity]])
            .on('zoom', (event: any) => this.onZoom(event));

        this.svg.call(zoom)
            .style('cursor', 'default');  // Use default cursor instead of grab/grabbing

        // Add arrow marker definitions for connection lines
        this.setupArrowMarkers();

        this.mainGroup = this.svg.append('g');
        this.lanesGroup = this.mainGroup.append('g').attr('class', 'lanes');
        this.connectionsGroup = this.mainGroup.append('g').attr('class', 'connections');
        this.eventsGroup = this.mainGroup.append('g').attr('class', 'events');
        this.axisGroup = this.mainGroup.append('g').attr('class', 'axis');
    }

    /**
     * Setup SVG arrow markers for connection lines
     * Creates markers for different connection types with semantic colors
     */
    private setupArrowMarkers(): void {
        const d3 = (window as any).d3;

        // Remove existing defs if any
        this.svg.selectAll('defs').remove();

        const defs = this.svg.append('defs');

        // Define arrow markers for different connection types
        // Use 'context-stroke' to inherit the stroke color from the path
        const markerDefinitions = [
            'arrow-parent-child',
            'arrow-merge-parent',
            'arrow-branch-migration',
            'arrow-release-tag',
            'arrow-pr-merge',
            'arrow-pr-commit',
            'arrow-generic'
        ];

        markerDefinitions.forEach(id => {
            defs.append('marker')
                .attr('id', id)
                .attr('viewBox', '0 0 10 10')
                .attr('refX', 5)  // Position arrow before endpoint so it's not covered by circles
                .attr('refY', 5)
                .attr('markerWidth', 6)
                .attr('markerHeight', 6)
                .attr('orient', 'auto-start-reverse')
                .append('path')
                .attr('d', 'M 0 0 L 10 5 L 0 10 z')
                .attr('fill', 'context-stroke')  // Inherit color from the line
                .style('stroke', 'none');
        });
    }

    /**
     * Setup D3 scales
     */
    private setupScales(): void {
        const d3 = (window as any).d3;
        this.xScale = d3.scaleTime();
        this.yScale = d3.scaleBand().padding(0.4);
        this.sizeScale = d3.scaleSqrt().range([4, 18]);
    }

    /**
     * Validate container setup for debugging
     */
    private validateContainerSetup(): void {
        console.log('TimelineRenderer: CONTAINER VALIDATION');

        const containerNode = this.container.node();
        const rect = containerNode?.getBoundingClientRect();

        console.log('CONTAINER CHECK:', {
            containerExists: !!containerNode,
            width: rect?.width,
            height: rect?.height,
            display: containerNode ? window.getComputedStyle(containerNode).display : 'unknown',
            visibility: containerNode ? window.getComputedStyle(containerNode).visibility : 'unknown'
        });

        console.log('SVG STRUCTURE CHECK:', {
            svgExists: !!this.svg.node(),
            mainGroupExists: !!this.mainGroup.node(),
            eventsGroupExists: !!this.eventsGroup.node(),
            svgNode: this.svg.node()
        });

        console.log('SCALE CHECK:', {
            xScaleExists: !!this.xScale,
            yScaleExists: !!this.yScale,
            sizeScaleExists: !!this.sizeScale
        });
    }

    /**
     * Resize the visualization
     */
    resize(): void {
        console.log('TimelineRenderer: resize() called');
        const containerNode = this.container.node();
        console.log('TimelineRenderer: container node:', containerNode);

        if (!containerNode) {
            console.error('TimelineRenderer: Container node is null - cannot resize');
            return;
        }

        // Set SVG to use 100% of container - let CSS handle sizing
        this.svg
            .style('width', '100%')
            .style('height', '100%');

        // Get the SVG's actual dimensions after CSS sizing
        const svgNode = this.svg.node();
        let width = 0, height = 0;

        if (svgNode) {
            const svgRect = svgNode.getBoundingClientRect();
            width = svgRect.width;
            height = svgRect.height;
            console.log('TimelineRenderer: SVG actual rendered dimensions:', {
                width: svgRect.width,
                height: svgRect.height
            });
        }

        // Fallback: try container dimensions if SVG has no size
        if (width === 0 || height === 0) {
            const containerRect = containerNode.getBoundingClientRect();
            width = containerRect.width;
            height = containerRect.height;
            console.log('TimelineRenderer: Using container dimensions as fallback:', { width, height });
        }

        if (width === 0 || height === 0) {
            console.warn('TimelineRenderer: Container has zero dimensions:', { width, height });
            // Use fallback dimensions for calculations only
            const fallbackWidth = 800;
            const fallbackHeight = 400;
            console.log('TimelineRenderer: Using fallback dimensions:', { fallbackWidth, fallbackHeight });

            this.margin = {
                top: 20,
                right: 20,
                bottom: 30,
                left: Math.min(120, fallbackWidth * 0.15)
            };
            this.innerWidth = fallbackWidth - this.margin.left - this.margin.right;
            this.innerHeight = fallbackHeight - this.margin.top - this.margin.bottom;
        } else {
            // Dynamic margins based on container size
            this.margin = {
                top: 20,
                right: 20,
                bottom: 30,
                left: Math.min(120, width * 0.15) // Dynamic left margin
            };
            this.innerWidth = width - this.margin.left - this.margin.right;
            this.innerHeight = height - this.margin.top - this.margin.bottom; // Full height usage
        }

        console.log('TimelineRenderer: Final dimensions:', {
            margin: this.margin,
            innerWidth: this.innerWidth,
            innerHeight: this.innerHeight
        });

        this.mainGroup.attr('transform', `translate(${this.margin.left},${this.margin.top})`);
        this.xScale.range([0, this.innerWidth]);
        this.yScale.range([0, this.innerHeight]); // Full height for branches

        // Recalculate branch positioning with dynamic padding
        if (this.yScale.domain().length > 0) {
            // Adjust padding based on available height for better space utilization
            const paddingRatio = Math.max(0.1, Math.min(0.3, 50 / this.innerHeight));
            this.yScale.paddingInner(paddingRatio).paddingOuter(paddingRatio / 2);
        }

        console.log('TimelineRenderer: Scale ranges set:', {
            xScale: this.xScale.range(),
            yScale: this.yScale.range(),
            yScalePadding: this.yScale.paddingInner()
        });

        // If we have data, re-render immediately
        if (this.lastRenderData && this.lastRenderData.events) {
            console.log('TimelineRenderer: Re-rendering after resize with new height:', this.innerHeight);
            console.log('TimelineRenderer: yScale range updated to:', this.yScale.range());
            this.render(
                this.lastRenderData.events,
                this.lastRenderData.branches,
                this.lastRenderData.dateRange,
                this.lastRenderData.impactDomain,
                false // No transition for resize
            );
        } else {
            console.warn('TimelineRenderer: No lastRenderData available for resize re-render');
        }
    }

    /**
     * Main render method
     */
    render(visibleEvents: any[], activeBranches: string[], dateRange: [Date, Date], impactDomain: [number, number], useTransition: boolean): void {
        console.log('TimelineRenderer: render() called');
        console.log('TimelineRenderer: visibleEvents count:', visibleEvents?.length);
        console.log('TimelineRenderer: activeBranches:', activeBranches);
        console.log('TimelineRenderer: dateRange:', dateRange);
        console.log('TimelineRenderer: impactDomain:', impactDomain);

        // Store render data for resize re-rendering
        this.lastRenderData = {
            events: visibleEvents,
            branches: activeBranches,
            dateRange: dateRange,
            impactDomain: impactDomain
        };

        // Early return for empty data to prevent NaN errors
        if (!visibleEvents || visibleEvents.length === 0) {
            console.warn('TimelineRenderer: No events to render, clearing visualization');
            this.clearVisualization();
            return;
        }

        // Ensure container is properly sized before rendering
        if (this.innerWidth === 0 || this.innerHeight === 0) {
            console.warn('TimelineRenderer: Zero dimensions detected, calling resize first');
            this.resize();
        }

        // Validate dimensions after resize
        if (this.innerWidth <= 0 || this.innerHeight <= 0 || isNaN(this.innerWidth) || isNaN(this.innerHeight)) {
            console.error('TimelineRenderer: Invalid dimensions after resize:', {
                innerWidth: this.innerWidth,
                innerHeight: this.innerHeight
            });
            return;
        }

        console.log('TimelineRenderer: Current dimensions:', {
            innerWidth: this.innerWidth,
            innerHeight: this.innerHeight
        });

        // Validate date range
        if (!dateRange || !dateRange[0] || !dateRange[1] || isNaN(dateRange[0].getTime()) || isNaN(dateRange[1].getTime())) {
            console.error('TimelineRenderer: Invalid date range:', dateRange);
            return;
        }

        // Ensure activeBranches has valid data
        const validBranches = activeBranches?.length > 0 ? activeBranches : ['main'];

        this.xScale.domain(dateRange);
        this.yScale.domain(validBranches);
        this.sizeScale.domain([0, impactDomain[1] || 100]);

        console.log('TimelineRenderer: Scale domains set:', {
            xScale: this.xScale.domain(),
            yScale: this.yScale.domain(),
            sizeScale: this.sizeScale.domain()
        });

        console.log('TimelineRenderer: Scale ranges:', {
            xScale: this.xScale.range(),
            yScale: this.yScale.range(),
            sizeScale: this.sizeScale.range()
        });

        this.drawBranchLanes(validBranches, useTransition);
        this.drawConnections(visibleEvents, useTransition);
        this.drawEvents(visibleEvents, useTransition);
        this.updateAxes(useTransition);

        console.log('TimelineRenderer: render() completed');
    }

    /**
     * Clear visualization when no data is available
     */
    private clearVisualization(): void {
        this.lanesGroup.selectAll('*').remove();
        this.connectionsGroup.selectAll('*').remove();
        this.eventsGroup.selectAll('*').remove();
        this.axisGroup.selectAll('*').remove();
    }

    /**
     * Update X-scale for viewport change (zoom/pan)
     * This is a lightweight update without full re-render
     */
    updateXScale(timeRange: [Date, Date]): void {
        console.log('TimelineRenderer: Updating X-scale to:', timeRange);

        const d3 = (window as any).d3;
        if (!d3 || !this.xScale) {
            console.error('TimelineRenderer: D3 or xScale not initialized');
            return;
        }

        // Store original domain for zoom calculations
        const originalDomain = this.xScale.domain();

        // Update the X-scale domain
        this.xScale.domain(timeRange);

        // Update axis with smooth transition
        this.updateAxis();

        // Re-position events for new scale with smooth transition
        this.updateEventPositions();

        console.log('TimelineRenderer: X-scale updated and view transformed');
    }

    /**
     * Update axis for new scale
     */
    private updateAxis(): void {
        const d3 = (window as any).d3;
        if (!d3 || !this.axisGroup) return;

        const axis = d3.axisBottom(this.xScale)
            .tickFormat(d3.timeFormat('%b %d'));

        this.axisGroup.transition()
            .duration(750)
            .call(axis);
    }

    /**
     * Update event positions for new scale
     */
    private updateEventPositions(): void {
        const d3 = (window as any).d3;
        if (!d3 || !this.eventsGroup) return;

        // Update event circles positions
        this.eventsGroup.selectAll('.timeline-event')
            .transition()
            .duration(750)
            .attr('cx', (d: any) => this.xScale(new Date(d.timestamp)));

        // Update connection lines if any
        this.updateConnectionLines();
    }

    /**
     * Update connection line positions for new scale
     */
    private updateConnectionLines(): void {
        const d3 = (window as any).d3;
        if (!d3 || !this.connectionsGroup) return;

        // Update connection paths for new scale
        this.connectionsGroup.selectAll('.event-connection')
            .transition()
            .duration(750)
            .attr('d', (d: any) => {
                if (!d.sourceX || !d.targetX) return null;
                const sourceX = this.xScale(new Date(d.sourceEvent?.timestamp || d.sourceX));
                const targetX = this.xScale(new Date(d.targetEvent?.timestamp || d.targetX));
                return `M${sourceX},${d.sourceY} Q${(sourceX + targetX) / 2},${(d.sourceY + d.targetY) / 2} ${targetX},${d.targetY}`;
            });
    }

    /**
     * Draw branch lanes (horizontal lines)
     */
    private drawBranchLanes(branches: string[], useTransition: boolean): void {
        // Validate inputs to prevent NaN errors
        if (!branches || branches.length === 0) {
            console.warn('TimelineRenderer: No branches to draw lanes for');
            return;
        }

        if (!this.innerWidth || isNaN(this.innerWidth) || this.innerWidth <= 0) {
            console.error('TimelineRenderer: Invalid innerWidth for drawing lanes:', this.innerWidth);
            return;
        }

        const lanes = this.lanesGroup.selectAll('.branch-lane').data(branches, (d: any) => d);
        const labels = this.lanesGroup.selectAll('.branch-label').data(branches, (d: any) => d);

        this.withTransition(lanes.exit(), useTransition).attr('opacity', 0).remove();
        this.withTransition(labels.exit(), useTransition).attr('opacity', 0).remove();

        const enterLanes = lanes.enter().append('line').attr('class', 'branch-lane')
            .attr('x1', 0)
            .attr('x2', Math.max(0, this.innerWidth)) // Ensure non-negative, non-NaN width
            .attr('opacity', 0);

        this.withTransition(enterLanes.merge(lanes), useTransition)
            .attr('x2', Math.max(0, this.innerWidth)) // Ensure width is always valid
            .attr('y1', (d: string) => {
                const y = this.yScale(d);
                const bandwidth = this.yScale.bandwidth();
                return (y !== undefined && !isNaN(y) && bandwidth !== undefined && !isNaN(bandwidth))
                    ? y + bandwidth / 2 : 0;
            })
            .attr('y2', (d: string) => {
                const y = this.yScale(d);
                const bandwidth = this.yScale.bandwidth();
                return (y !== undefined && !isNaN(y) && bandwidth !== undefined && !isNaN(bandwidth))
                    ? y + bandwidth / 2 : 0;
            })
            .attr('opacity', 0.3);

        const enterLabels = labels.enter().append('text').attr('class', 'branch-label')
            .attr('x', -10).attr('text-anchor', 'end').attr('alignment-baseline', 'middle')
            .text((d: string) => d).attr('opacity', 0);

        this.withTransition(enterLabels.merge(labels), useTransition)
            .attr('y', (d: string) => {
                const y = this.yScale(d);
                const bandwidth = this.yScale.bandwidth();
                return (y !== undefined && !isNaN(y) && bandwidth !== undefined && !isNaN(bandwidth))
                    ? y + bandwidth / 2 : 0;
            })
            .attr('opacity', 1);
    }

    /**
     * Draw connections between events
     */
    private drawConnections(events: any[], useTransition: boolean): void {
        const connectionData = this.buildConnectionData(events);

        const connections = this.connectionsGroup.selectAll('.connection-line')
            .data(connectionData, (d: ConnectionData) => d.id);

        this.withTransition(connections.exit(), useTransition).attr('opacity', 0).remove();

        const enterConnections = connections.enter().append('path')
            .attr('class', 'connection-line')
            .attr('stroke', (d: ConnectionData) => this.getConnectionColor(d.type, d.event))
            .attr('stroke-width', (d: ConnectionData) => Math.max(this.getConnectionStrokeWidth(d.type), 3))  // Minimum 3px for easier hovering
            .attr('fill', 'none')
            .attr('opacity', 0)
            .attr('marker-end', (d: ConnectionData) => this.getArrowMarker(d.type, 'end'))
            .attr('marker-start', (d: ConnectionData) => this.getArrowMarker(d.type, 'start'))
            .style('pointer-events', 'stroke')  // Enable hover on stroke
            .style('cursor', 'help')
            .on('mouseenter.connection', (mouseEvent: MouseEvent, d: ConnectionData) => {
                // Highlight on hover and show tooltip
                const d3 = (window as any).d3;
                const target = mouseEvent.currentTarget as SVGPathElement;
                d3.select(target).attr('stroke-width', Math.max(EventVisualTheme.getConnectionVisual(d.type).strokeWidth || 1, 3) * 1.5);

                // Show connection tooltip - create if doesn't exist
                let tooltipEl = document.getElementById('connection-tooltip');

                // If tooltip doesn't exist, create it dynamically
                if (!tooltipEl) {
                    console.log('[TimelineRenderer] Creating connection-tooltip element');
                    const vizContainer = document.getElementById('visualization');
                    if (vizContainer) {
                        tooltipEl = document.createElement('div');
                        tooltipEl.id = 'connection-tooltip';
                        tooltipEl.className = 'connection-tooltip';
                        tooltipEl.style.display = 'none';

                        const content = document.createElement('div');
                        content.className = 'connection-tooltip-content';
                        tooltipEl.appendChild(content);

                        vizContainer.appendChild(tooltipEl);
                    }
                }

                if (tooltipEl) {
                    const content = tooltipEl.querySelector('.connection-tooltip-content');
                    if (content) {
                        const text = d.description || EventVisualTheme.getConnectionVisual(d.type).label || d.type;
                        content.textContent = text;

                        // Position relative to viewport
                        tooltipEl.style.left = `${mouseEvent.clientX + 10}px`;
                        tooltipEl.style.top = `${mouseEvent.clientY + 10}px`;
                        tooltipEl.style.display = 'block';
                        tooltipEl.classList.add('show');

                        console.log('[TimelineRenderer] Tooltip shown with text:', text);
                    }
                }
            })
            .on('mouseleave.connection', (mouseEvent: MouseEvent, d: ConnectionData) => {
                // Reset on leave and hide tooltip
                const d3 = (window as any).d3;
                const target = mouseEvent.currentTarget as SVGPathElement;
                d3.select(target).attr('stroke-width', Math.max(EventVisualTheme.getConnectionVisual(d.type).strokeWidth || 1, 3));

                // Hide connection tooltip
                const tooltipEl = document.getElementById('connection-tooltip');
                if (tooltipEl) {
                    tooltipEl.classList.remove('show');
                    setTimeout(() => {
                        if (!tooltipEl.classList.contains('show')) {
                            tooltipEl.style.display = 'none';
                        }
                    }, 150); // Match CSS transition duration
                }
            });

        this.withTransition(enterConnections.merge(connections), useTransition)
            .attr('stroke', (d: ConnectionData) => this.getConnectionColor(d.type, d.event))
            .attr('stroke-width', (d: ConnectionData) => Math.max(this.getConnectionStrokeWidth(d.type), 3))
            .attr('opacity', (d: ConnectionData) => this.getConnectionOpacity(d.type))
            .attr('d', (d: ConnectionData) => this.getConnectionPath(d))
            .attr('marker-end', (d: ConnectionData) => this.getArrowMarker(d.type, 'end'))
            .attr('marker-start', (d: ConnectionData) => this.getArrowMarker(d.type, 'start'));

        // Update tooltips for existing connections
        this.withTransition(enterConnections.merge(connections), useTransition)
            .select('title')
            .text((d: ConnectionData) => d.description || EventVisualTheme.getConnectionVisual(d.type).label || d.type);
    }

    /**
     * Build connection data from events
     */
    private buildConnectionData(events: any[]): ConnectionData[] {
        const connectionData: ConnectionData[] = [];

        events.forEach(event => {
            // 1. PR to merge commit connections
            if (event.type === 'pr' && event.metadata) {
                const sourceBranch = event.metadata.sourceBranch || event.branch;
                const targetBranch = event.metadata.targetBranch || 'main';

                if (this.yScale(sourceBranch) !== undefined && this.yScale(targetBranch) !== undefined) {
                    connectionData.push({
                        id: `pr-${event.id}`,
                        type: 'pr-merge',
                        sourceX: this.xScale(new Date(event.timestamp)),
                        sourceY: this.yScale(sourceBranch) + this.yScale.bandwidth() / 2,
                        targetX: this.xScale(new Date(event.timestamp)) + 60,
                        targetY: this.yScale(targetBranch) + this.yScale.bandwidth() / 2,
                        event: event
                    });
                }
            }

            // 2. Generic connections from metadata.connections array
            if (event.metadata && event.metadata.connections) {
                event.metadata.connections.forEach((conn: any, index: number) => {
                    const targetEvent = events.find(e => e.id === conn.targetId);
                    if (targetEvent &&
                        this.yScale(event.branch) !== undefined &&
                        this.yScale(targetEvent.branch) !== undefined) {

                        connectionData.push({
                            id: `conn-${event.id}-${index}`,
                            type: conn.type || 'generic',
                            sourceX: this.xScale(new Date(event.timestamp)),
                            sourceY: this.yScale(event.branch) + this.yScale.bandwidth() / 2,
                            targetX: this.xScale(new Date(targetEvent.timestamp)),
                            targetY: this.yScale(targetEvent.branch) + this.yScale.bandwidth() / 2,
                            event: event,
                            targetEvent: targetEvent,
                            description: conn.description
                        });
                    }
                });
            }

            // 3. Direct PR connections
            if (event.type === 'pr' && event.metadata && event.metadata.connectedCommitId) {
                const targetEvent = events.find(e => e.id === event.metadata.connectedCommitId);
                if (targetEvent &&
                    this.yScale(event.branch) !== undefined &&
                    this.yScale(targetEvent.branch) !== undefined) {

                    connectionData.push({
                        id: `direct-${event.id}`,
                        type: 'pr-commit',
                        sourceX: this.xScale(new Date(event.timestamp)),
                        sourceY: this.yScale(event.branch) + this.yScale.bandwidth() / 2,
                        targetX: this.xScale(new Date(targetEvent.timestamp)),
                        targetY: this.yScale(targetEvent.branch) + this.yScale.bandwidth() / 2,
                        event: event,
                        targetEvent: targetEvent
                    });
                }
            }
        });

        return connectionData;
    }

    /**
     * Get connection color based on type
     * Now uses EventVisualTheme for consistency
     * For branch-migration, uses the event type color (e.g., cyan for commits)
     */
    private getConnectionColor(connectionType: string, event?: any): string {
        // For branch migrations, use the event type color
        if (connectionType === 'branch-migration' && event && event.type) {
            return EventVisualTheme.getEventColor(event.type);
        }

        const visual = EventVisualTheme.getConnectionVisual(connectionType);
        // If color is 'inherit', fall back to event type color
        if (visual.color === 'inherit' && event && event.type) {
            return EventVisualTheme.getEventColor(event.type);
        }

        return visual.color;
    }

    /**
     * Get connection opacity based on type
     * Now uses EventVisualTheme for consistency
     */
    private getConnectionOpacity(connectionType: string): number {
        return EventVisualTheme.getConnectionVisual(connectionType).opacity;
    }

    /**
     * Get connection stroke width based on type
     */
    private getConnectionStrokeWidth(connectionType: string): number {
        return EventVisualTheme.getConnectionVisual(connectionType).strokeWidth || 1;
    }

    /**
     * Get arrow marker for connection
     */
    private getArrowMarker(connectionType: string, position: 'start' | 'end'): string {
        const visual = EventVisualTheme.getConnectionVisual(connectionType);
        const arrowPos = visual.arrowPosition || 'none';

        if (arrowPos === 'none') return '';
        if (arrowPos === 'both') return `url(#arrow-${connectionType})`;
        if (arrowPos === position) return `url(#arrow-${connectionType})`;

        return '';
    }

    /**
     * Get SVG path for connection
     * Shortens endpoints by 10% to prevent arrows from being covered by event circles
     */
    private getConnectionPath(connection: ConnectionData): string {
        let { sourceX, sourceY, targetX, targetY, type } = connection;

        // Shorten line by 10% on each end to position arrows before event circles
        const dx = targetX - sourceX;
        const dy = targetY - sourceY;
        const shortenFactor = 0.1;

        sourceX = sourceX + dx * shortenFactor;
        sourceY = sourceY + dy * shortenFactor;
        targetX = targetX - dx * shortenFactor;
        targetY = targetY - dy * shortenFactor;

        // Different path styles for different connection types
        if (type === 'pr-merge' || type === 'pr-commit') {
            // Curved path for PR connections
            const controlX1 = sourceX + 30;
            const controlX2 = targetX - 30;
            return `M ${sourceX} ${sourceY} C ${controlX1} ${sourceY}, ${controlX2} ${targetY}, ${targetX} ${targetY}`;
        } else if (type === 'branch_to_pr' || type === 'source_branch') {
            // Straight line for branch relationships
            return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
        } else {
            // Default curved path for other connections
            const controlY = sourceY + (targetY - sourceY) * 0.3;
            return `M ${sourceX} ${sourceY} Q ${(sourceX + targetX) / 2} ${controlY} ${targetX} ${targetY}`;
        }
    }

    /**
     * Draw event circles while preserving timeline structure
     * Handles empty arrays gracefully without breaking axis/timeline
     */
    private drawEvents(events: any[], useTransition: boolean): void {
        console.log('TimelineRenderer: drawEvents() called with', events?.length, 'events');

        // Always do the D3 update pattern, even with empty array
        // This ensures proper cleanup of old events
        const groups = this.eventsGroup.selectAll('.event-group')
            .data(events || [], (d: any) => d.id);

        // Remove old events
        groups.exit()
            .transition()
            .duration(useTransition ? 250 : 0)
            .style('opacity', 0)
            .remove();

        // If no events, we're done (but axis remains)
        if (!events || events.length === 0) {
            console.log('TimelineRenderer: No events to draw, but keeping timeline structure');
            return;
        }

        // Only filter for valid branches if we have events
        const drawableEvents = events.filter((d: any) => this.yScale(d.branch) !== undefined);

        if (drawableEvents.length === 0) {
            console.log('TimelineRenderer: No drawable events (invalid branches)');
            return;
        }

        // Sort events by z-index (lowest first, so highest z-index renders on top)
        const sortedEvents = drawableEvents.sort((a: any, b: any) => {
            const zIndexA = EventVisualTheme.getEventZIndex(a.type);
            const zIndexB = EventVisualTheme.getEventZIndex(b.type);
            return zIndexA - zIndexB;
        });

        console.log('TimelineRenderer: Drawing', sortedEvents.length, 'drawable events (sorted by z-index)');

        // Re-bind with sorted events for enter/update
        const drawableGroups = this.eventsGroup.selectAll('.event-group')
            .data(sortedEvents, (d: any) => d.id);

        // Handle ENTER selection - create new elements
        const enterGroups = drawableGroups.enter()
            .append('g')
            .attr('class', 'event-group')
            .style('opacity', 0);
            // Cursor is set in timeline.css to 'help'

        enterGroups.append('path')
            .attr('class', 'event-node')
            .attr('d', () => {
                const d3 = (window as any).d3;
                return d3.symbol().type(d3.symbolCircle).size(0)();
            });

        // Add emoji icon for intelligence events
        enterGroups.append('text')
            .attr('class', 'event-icon')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .style('opacity', 0)
            .style('pointer-events', 'none');

        enterGroups.append('text')
            .attr('class', 'event-label')
            .attr('text-anchor', 'middle')
            .style('opacity', 0);

        // MERGE enter and update selections
        const mergedGroups = enterGroups.merge(drawableGroups);
        console.log('TimelineRenderer: Merged groups size:', mergedGroups.size());

        // Apply transitions and positioning to all merged groups
        const transition = mergedGroups.transition()
            .duration(useTransition ? 250 : 0);

        transition
            .style('opacity', 1)
            .attr('transform', (d: any, i: number) => {
                const x = this.xScale(new Date(d.timestamp));
                const y = this.yScale(d.branch);
                const safeX = x !== undefined && !isNaN(x) ? x : 0;
                let safeY = y !== undefined && !isNaN(y) ?
                    y + this.yScale.bandwidth() / 2 : 0;

                // Offset intelligence events above branch lanes with staggered tracks
                const isIntelligenceEvent = d.type === 'learning-stored' ||
                                           d.type === 'pattern-detected' ||
                                           d.type === 'adr-recorded';
                if (isIntelligenceEvent) {
                    const bandwidth = this.yScale.bandwidth();

                    // Use a hash of the event ID to determine track (0, 1, or 2)
                    // This provides consistent but varied placement to reduce overlap
                    const trackHash = (d.id || '').split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
                    const track = trackHash % 3;

                    // Three tracks above the lane: 0.6, 0.8, 1.0 bandwidth offsets
                    const offsetMultiplier = 0.6 + (track * 0.2);
                    safeY = safeY - bandwidth * offsetMultiplier;
                }

                // Log first few events for debugging
                if (i < 3) {
                    console.log(`TimelineRenderer: Event ${i} (${d.branch}) positioned at y=${safeY}, yScale range=${this.yScale.range()}`);
                }

                return `translate(${safeX}, ${safeY})`;
            });

        // Check if event is intelligence type
        const isIntelligenceEvent = (d: any) =>
            d.type === 'learning-stored' ||
            d.type === 'pattern-detected' ||
            d.type === 'adr-recorded';

        transition.select('.event-node')
            .attr('d', (d: any) => {
                // Hide D3 shape for intelligence events (we'll use emoji instead)
                if (isIntelligenceEvent(d)) {
                    return null;
                }

                const d3 = (window as any).d3;
                const shape = EventVisualTheme.getEventShape(d.type);
                const size = this.sizeScale(d.impact || 1);
                const area = Math.pow(Math.max(4, size || 4), 2);

                // Map shape names to D3 symbol types
                const shapeMap: Record<string, any> = {
                    'circle': d3.symbolCircle,
                    'square': d3.symbolSquare,
                    'diamond': d3.symbolDiamond,
                    'triangle': d3.symbolTriangle,
                    'star': d3.symbolStar,
                    'cross': d3.symbolCross,
                    'wye': d3.symbolWye
                };

                const symbolType = shapeMap[shape] || d3.symbolCircle;
                return d3.symbol().type(symbolType).size(area)();
            })
            .style('fill', (d: any) => {
                const syncState = EventVisualTheme.determineSyncState(d);
                const color = EventVisualTheme.getEventColor(d.type, syncState);

                // DEBUG: Log sync state and color for releases and first few events
                if (d.type === 'release' || Math.random() < 0.05) {
                    console.log(`[TimelineRenderer] Event "${d.title?.substring(0, 30)}" (${d.type}):`, {
                        syncState,
                        color,
                        colorMode: EventVisualTheme.getColorMode(),
                        activeProviders: EventVisualTheme.getActiveProviders(),
                        hasSources: !!d.sources,
                        sourcesCount: d.sources?.length || 0,
                        sources: d.sources?.map((s: any) => s.providerId) || []
                    });
                }

                return color;
            })
            .style('cursor', 'pointer')
            .style('opacity', (d: any) => isIntelligenceEvent(d) ? 0 : 1);

        // Render emoji icons for intelligence events
        transition.select('.event-icon')
            .text((d: any) => isIntelligenceEvent(d) ? EventVisualTheme.getEventIcon(d.type) : '')
            .style('font-size', (d: any) => {
                if (!isIntelligenceEvent(d)) return '0px';
                const size = this.sizeScale(d.impact || 1);
                return `${Math.max(16, size * 1.5)}px`;  // Emojis need to be larger
            })
            .style('opacity', (d: any) => isIntelligenceEvent(d) ? 1 : 0);

        transition.select('.event-label')
            .attr('y', (d: any) => {
                const size = this.sizeScale(d.impact || 1);
                return -(Math.max(2, size || 2)) - 5;
            })
            .text((d: any) => d.type === 'release' ? d.title : '')
            .style('opacity', (d: any) => d.type === 'release' ? 1 : 0);

        // Clear old event handlers first to prevent conflicts
        mergedGroups
            .on('mouseenter.timeline', null)
            .on('mouseleave.timeline', null)
            .on('click.timeline', null);

        // Attach new handlers with namespaces and logging
        mergedGroups
            .on('mouseenter.timeline', (event: MouseEvent, d: any) => {
                console.log('TimelineRenderer: [TR] event hover', d?.title || d?.type);
                if (this.onEventHover) {
                    this.onEventHover(event, d);
                }
            })
            .on('mouseleave.timeline', (event: MouseEvent, d: any) => {
                console.log('TimelineRenderer: [TR] event leave', d?.title || d?.type);
                if (this.onEventLeave) {
                    this.onEventLeave(event, d);
                }
            })
            .on('click.timeline', (event: MouseEvent, d: any) => {
                console.log('TimelineRenderer: [TR] event click', d?.title || d?.type);
                event.stopPropagation();
                if (this.onEventClick) {
                    this.onEventClick(event, d);
                }
            });

        console.log('TimelineRenderer: drawEvents() completed');
    }

    /**
     * Update time axes
     */
    private updateAxes(useTransition: boolean): void {
        const d3 = (window as any).d3;
        this.axisGroup.attr('transform', `translate(0, ${this.innerHeight})`);
        this.withTransition(this.axisGroup, useTransition)
            .call(d3.axisBottom(this.xScale).ticks(this.innerWidth / 100).tickSizeOuter(0));
    }

    /**
     * Apply transition if requested
     */
    private withTransition(selection: any, useTransition: boolean): any {
        return useTransition ? selection.transition().duration(500) : selection;
    }

}