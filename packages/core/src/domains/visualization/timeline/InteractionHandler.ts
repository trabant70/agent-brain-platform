/**
 * InteractionHandler - Fixed Range Selector with Visible Slider
 * Handles histogram bar chart with overlaid brush selector
 */

export interface InteractionOptions {
    selector: string;
    onBrush: (selection: [Date, Date] | null) => void;
}

export class InteractionHandler {
    private container: any;
    private svg: any;
    private rangeGroup: any;
    private rangeBarsGroup: any;
    private rangeAxisGroup: any;
    private brushGroup: any;
    private brush: any;
    private xScale: any;
    private yScale: any;
    // Increased bottom margin for visible labels
    private margin = { top: 5, right: 10, bottom: 35, left: 10 };
    private innerWidth: number = 0;
    private innerHeight: number = 0;
    private onBrush: (selection: [Date, Date] | null) => void;
    private isInitialized: boolean = false;
    private lastSelection: [number, number] | null = null;
    private isInitialRender = true;

    constructor(options: InteractionOptions) {
        this.onBrush = options.onBrush;

        // Initialize immediately if DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize(options.selector));
        } else {
            // Direct initialization without delay
            this.initialize(options.selector);
        }
    }

    private initialize(selector: string): void {
        const d3 = (window as any).d3;


        if (!d3) {
            return;
        }

        // Setup container
        this.container = d3.select(selector);
        if (this.container.empty()) {
            return;
        }

        // Log container dimensions for debugging
        const containerNode = this.container.node();
        const rect = containerNode?.getBoundingClientRect();

        // Create or select SVG
        this.svg = this.container.select('svg#range-svg');

        if (this.svg.empty()) {
            this.svg = this.container.append('svg')
                .attr('id', 'range-svg')
                .style('width', '100%')
                .style('height', '100%')
                .style('display', 'block');
        } else {
        }

        const svgNode = this.svg.node();
        const svgRect = svgNode?.getBoundingClientRect();

        // Create main group
        this.rangeGroup = this.svg.append('g')
            .attr('class', 'range-group')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        // Create layers in z-order (first = bottom, last = top)
        this.rangeBarsGroup = this.rangeGroup.append('g')
            .attr('class', 'range-bars-layer');

        this.rangeAxisGroup = this.rangeGroup.append('g')
            .attr('class', 'range-axis-layer');

        this.brushGroup = this.rangeGroup.append('g')
            .attr('class', 'brush-layer');

        // Setup scales
        this.xScale = d3.scaleTime();
        this.yScale = d3.scaleLinear();

        // Initial resize to set dimensions
        this.resize();

        this.isInitialized = true;
    }

    resize(): void {
        if (!this.container || this.container.empty()) return;

        const d3 = (window as any).d3;
        const containerNode = this.container.node();
        if (!containerNode) return;

        const { width, height } = containerNode.getBoundingClientRect();

        // Use actual dimensions
        const actualWidth = Math.max(width || 800, 200);
        const actualHeight = Math.max(height || 80, 80);


        this.svg
            .attr('width', actualWidth)
            .attr('height', actualHeight);

        this.innerWidth = Math.max(actualWidth - this.margin.left - this.margin.right, 100);
        this.innerHeight = Math.max(actualHeight - this.margin.top - this.margin.bottom, 40);

        this.xScale.range([0, this.innerWidth]);
        this.yScale.range([this.innerHeight, 0]);

        // Setup brush with proper event handling
        if (d3 && d3.brushX) {
            this.brush = d3.brushX()
                .extent([[0, 0], [this.innerWidth, this.innerHeight]])
                .on('brush end', (event: any) => {
                    const selection = event.selection;

                    if (selection && this.onBrush) {
                        // Check if selection changed significantly
                        const selectionChanged = !this.lastSelection ||
                            Math.abs(selection[0] - this.lastSelection[0]) > 0.5 ||
                            Math.abs(selection[1] - this.lastSelection[1]) > 0.5;

                        if (selectionChanged) {
                            this.lastSelection = [selection[0], selection[1]];
                            const dateRange = selection.map((x: number) => this.xScale.invert(x));

                            // Trigger callback for all user interactions and end events
                            if (event.sourceEvent || event.type === 'end') {
                                this.onBrush(dateRange);
                            }
                        }
                    }
                });
        }
    }

    render(allEvents: any[], fullDateRange: [Date, Date], currentBrushRange?: [Date, Date]): void {
        if (!this.isInitialized) {
            return;
        }

        const d3 = (window as any).d3;


        // Check SVG visibility in DOM
        const svgNode = this.svg.node();
        if (svgNode) {
            const computedStyle = window.getComputedStyle(svgNode);
            const boundingRect = svgNode.getBoundingClientRect();
        }

        if (!d3 || allEvents.length === 0 || !fullDateRange[0] || !fullDateRange[1]) {
            return;
        }

        // Set domain for scales
        this.xScale.domain(fullDateRange);

        // Create histogram data
        const histogramData = this.createHistogramData(allEvents, fullDateRange);
        const maxCount = Math.max(...histogramData.map(d => d.count));
        this.yScale.domain([0, maxCount]);

        // Update range labels to show full repository timeline (first to last event)
        this.updateRangeLabels(fullDateRange);

        // Clear previous content
        this.rangeBarsGroup.selectAll('*').remove();
        this.rangeAxisGroup.selectAll('*').remove();

        // Draw histogram bars
        const barWidth = this.innerWidth / histogramData.length;

        const bars = this.rangeBarsGroup.selectAll('.range-bar')
            .data(histogramData)
            .enter()
            .append('rect')
            .attr('class', 'range-bar')
            .attr('x', (d: any) => this.xScale(d.date))
            .attr('y', (d: any) => this.yScale(d.count))
            .attr('width', Math.max(barWidth - 1, 1))
            .attr('height', (d: any) => this.innerHeight - this.yScale(d.count))
            .style('fill', '#4a90e2')
            .style('opacity', 0.3);


        // Store histogram data for hover detection
        (this as any).currentHistogramData = histogramData;
        (this as any).currentBarWidth = barWidth;

        // Log first few bar positions for debugging
        if (bars.size() > 0) {
            const firstBar = bars.nodes()[0];
            if (firstBar) {
            }
        }

        // Create X-axis
        const axis = d3.axisBottom(this.xScale)
            .ticks(6)
            .tickFormat(d3.timeFormat('%b %d'));

        this.rangeAxisGroup
            .attr('transform', `translate(0,${this.innerHeight})`)
            .call(axis)
            .selectAll('text')
            .style('font-size', '10px')
            .style('font-weight', '400');

        // Setup brush if not already done
        if (!this.brush) {
            this.brush = d3.brushX()
                .extent([[0, 0], [this.innerWidth, this.innerHeight]])
                .on('brush end', (event: any) => {
                    const selection = event.selection;

                    if (selection && this.onBrush) {
                        const selectionChanged = !this.lastSelection ||
                            Math.abs(selection[0] - this.lastSelection[0]) > 0.5 ||
                            Math.abs(selection[1] - this.lastSelection[1]) > 0.5;

                        if (selectionChanged) {
                            this.lastSelection = [selection[0], selection[1]];
                            const dateRange = selection.map((x: number) => this.xScale.invert(x));

                            if (event.sourceEvent || event.type === 'end') {
                                this.onBrush(dateRange);
                            }
                        }
                    }
                });
        }

        // Apply brush
        this.brushGroup.call(this.brush);

        // Configure brush to prevent drawing new brush but allow all dragging
        // Strategy: Make overlay non-interactive (prevents crosshair + drawing)
        // Keep selection and handles fully interactive (allows dragging brush + edges)
        this.brushGroup.select('.overlay')
            .style('pointer-events', 'none') // Block drawing new brush (no crosshair)
            .style('cursor', 'default'); // Remove crosshair cursor

        this.brushGroup.selectAll('.handle')
            .style('pointer-events', 'all') // Keep edge handles draggable
            .style('cursor', 'ew-resize'); // Horizontal resize cursor

        this.brushGroup.select('.selection')
            .style('pointer-events', 'all') // Keep selection draggable
            .style('cursor', 'move'); // Move cursor when over selection

        // Add histogram hover detection to the entire range group
        // This works alongside brush interaction
        this.rangeGroup
            .on('mousemove.histogram', (event: MouseEvent) => {
                this.handleHistogramHover(event);
            })
            .on('mouseleave.histogram', () => {
                this.clearHistogramHighlight();
            });


        // Set initial brush selection

        if (currentBrushRange && currentBrushRange[0] && currentBrushRange[1]) {
            // Use provided range

            let x0 = this.xScale(currentBrushRange[0]);
            let x1 = this.xScale(currentBrushRange[1]);


            // Clamp coordinates to valid range
            x0 = Math.max(0, Math.min(x0, this.innerWidth));
            x1 = Math.max(0, Math.min(x1, this.innerWidth));

            // Ensure x0 < x1
            if (x0 >= x1) {
                x0 = Math.max(0, x1 - 10); // Minimum 10px brush width
            }


            if (!isNaN(x0) && !isNaN(x1)) {
                this.brushGroup.call(this.brush.move, [x0, x1]);

                // On initial render, trigger the callback
                if (this.isInitialRender) {
                    this.isInitialRender = false;
                    // Small delay to ensure DOM is ready
                    setTimeout(() => {
                        if (this.onBrush) {
                            this.onBrush(currentBrushRange);
                        }
                    }, 100);
                }
            } else {
            }
        } else {
            // Set default brush to rightmost 1/3 of the timeline
            const timeDiff = fullDateRange[1].getTime() - fullDateRange[0].getTime();
            const startTime = fullDateRange[1].getTime() - (timeDiff / 3);
            const defaultRange: [Date, Date] = [new Date(startTime), fullDateRange[1]];

            const x0 = this.xScale(defaultRange[0]);
            const x1 = this.xScale(defaultRange[1]);

            this.brushGroup.call(this.brush.move, [x0, x1]);

            this.isInitialRender = false;

            // Trigger callback with initial selection
            setTimeout(() => {
                if (this.onBrush) {
                    this.onBrush(defaultRange);
                }
            }, 100);
        }

        // Style the brush
        this.brushGroup.selectAll('.selection')
            .style('fill', '#4a90e2')
            .style('fill-opacity', 0.25)
            .style('stroke', '#4a90e2')
            .style('stroke-width', 2);

        this.brushGroup.selectAll('.handle')
            .style('fill', '#ffffff')
            .style('stroke', '#4a90e2')
            .style('stroke-width', 2);
    }

    private createHistogramData(events: any[], dateRange: [Date, Date]): any[] {
        const numBins = 40;
        const timeDiff = dateRange[1].getTime() - dateRange[0].getTime();
        const binSize = timeDiff / numBins;

        const bins: any[] = [];
        for (let i = 0; i < numBins; i++) {
            const binStart = new Date(dateRange[0].getTime() + i * binSize);
            bins.push({
                date: binStart,
                count: 0
            });
        }

        // Count events in each bin
        events.forEach(event => {
            const eventTime = new Date(event.timestamp || event.date);
            if (eventTime >= dateRange[0] && eventTime <= dateRange[1]) {
                const binIndex = Math.min(
                    Math.floor((eventTime.getTime() - dateRange[0].getTime()) / binSize),
                    numBins - 1
                );
                bins[binIndex].count++;
            }
        });

        return bins;
    }

    updateRangeLabels(dateRange: [Date, Date], formatter?: any): void {
        const d3 = (window as any).d3;
        if (!d3 || !dateRange || dateRange.length !== 2) return;

        const formatDate = formatter || d3.timeFormat("%b %d, %Y");

        const startLabel = document.getElementById('range-start-label');
        const endLabel = document.getElementById('range-end-label');

        if (startLabel) {
            startLabel.textContent = formatDate(dateRange[0]);
        }

        if (endLabel) {
            endLabel.textContent = formatDate(dateRange[1]);
        }
    }

    /**
     * Show histogram tooltip
     */
    private showHistogramTooltip(event: MouseEvent, data: any): void {
        const d3 = (window as any).d3;
        if (!d3) return;

        const tooltip = d3.select('#tooltip');
        if (tooltip.empty()) {
            return;
        }

        const formatDate = d3.timeFormat("%b %d, %Y");

        // Get position relative to the range selector container
        const containerNode = this.container.node();
        if (!containerNode) return;

        const containerRect = containerNode.getBoundingClientRect();

        // Position tooltip:
        // X: align lower-left corner with mouse X position
        // Y: just above the top of the range panel
        const tooltipX = event.clientX;
        const tooltipY = containerRect.top - 5; // 5px above the range panel


        tooltip.html(`
            <div style="font-weight: bold; margin-bottom: 5px;">
                ${formatDate(data.date)}
            </div>
            <div>
                Events: <strong>${data.count}</strong>
            </div>
        `)
        .style('visibility', 'visible')
        .style('opacity', '1')
        .style('left', `${tooltipX}px`)
        .style('bottom', `calc(100vh - ${tooltipY}px)`) // Position from bottom so it grows upward
        .style('top', 'auto') // Clear any previous top positioning
        .style('position', 'fixed')
        .style('transform', 'translateY(0)'); // Ensure no transform offset
    }

    /**
     * Hide histogram tooltip
     */
    private hideHistogramTooltip(): void {
        const d3 = (window as any).d3;
        if (!d3) return;

        const tooltip = d3.select('#tooltip');
        if (tooltip.empty()) return;

        tooltip
            .style('visibility', 'hidden')
            .style('opacity', '0');
    }

    /**
     * Handle histogram hover - detect which bar is under cursor
     */
    private handleHistogramHover(event: MouseEvent): void {
        const d3 = (window as any).d3;
        if (!d3) return;

        const histogramData = (this as any).currentHistogramData;
        const barWidth = (this as any).currentBarWidth;

        if (!histogramData || !barWidth) return;

        // Get mouse position relative to range group
        const [mouseX] = d3.pointer(event, this.rangeGroup.node());

        // Find which bar the mouse is over
        const barIndex = Math.floor(mouseX / barWidth);

        if (barIndex >= 0 && barIndex < histogramData.length) {
            const barData = histogramData[barIndex];

            // Highlight the bar - select from rangeBarsGroup to ensure we get the right bars
            this.rangeBarsGroup.selectAll('.range-bar')
                .attr('opacity', (d: any, i: number) => i === barIndex ? 0.6 : 0.3)
                .attr('fill', (d: any, i: number) => i === barIndex ? '#5aa5ff' : '#4a90e2');

            // Show tooltip
            this.showHistogramTooltip(event, barData);
        }
    }

    /**
     * Clear histogram highlight and tooltip
     */
    private clearHistogramHighlight(): void {
        const d3 = (window as any).d3;
        if (!d3) return;

        // Restore all bars - use rangeBarsGroup to ensure correct selection
        this.rangeBarsGroup.selectAll('.range-bar')
            .attr('opacity', 0.3)
            .attr('fill', '#4a90e2');

        this.hideHistogramTooltip();
    }
}