/**
 * Threading Timeline Visualization
 * Real-time visualization of function execution traces with swim lanes
 *
 * Purpose: Monitor data correctness and execution flow in real-time
 * Features:
 * - Swim lanes for different threads (DATA_FLOW, VALIDATION, etc.)
 * - Event markers (entry, exit, transformation, mutation, violation)
 * - Zoom/pan support for detailed inspection
 * - Tooltips with event details
 * - Color-coding by severity and event type
 *
 * Design:
 * - Horizontal time axis (left to right)
 * - Vertical swim lanes (one per thread)
 * - Event markers positioned by timestamp
 * - Violations highlighted with severity colors
 */

import { BaseVisualization, VisualizationConfig } from './BaseVisualization';

export interface ThreadingTimelineEvent {
  id: string;
  type: 'entry' | 'exit' | 'transformation' | 'mutation' | 'violation';
  timestamp: number;
  context: string;  // Function name
  thread: string;   // Thread name (DATA_FLOW, VALIDATION, etc.)
  duration?: number;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  data?: any;
}

export interface ThreadingTimelineData {
  events: ThreadingTimelineEvent[];
  timeRange?: { start: number; end: number };
}

export class ThreadingTimeline extends BaseVisualization {
  private xScale: any = null;
  private yScale: any = null;
  private zoom: any = null;
  private tooltip: HTMLElement | null = null;
  private threads: string[] = [];

  constructor(container: HTMLElement, config: VisualizationConfig = {}) {
    super(container, {
      ...config,
      margin: config.margin || { top: 40, right: 40, bottom: 40, left: 120 },
      height: config.height || 400
    });
  }

  /**
   * Initialize tooltip element
   */
  async initialize(): Promise<void> {
    await super.initialize();
    this.createTooltip();
  }

  /**
   * Create tooltip element
   */
  private createTooltip(): void {
    // Remove existing tooltip if any
    const existing = document.getElementById('threading-timeline-tooltip');
    if (existing) {
      existing.remove();
    }

    // Create new tooltip
    this.tooltip = document.createElement('div');
    this.tooltip.id = 'threading-timeline-tooltip';
    this.tooltip.style.position = 'absolute';
    this.tooltip.style.display = 'none';
    this.tooltip.style.background = 'var(--vscode-editorHoverWidget-background)';
    this.tooltip.style.border = '1px solid var(--vscode-editorHoverWidget-border)';
    this.tooltip.style.borderRadius = '4px';
    this.tooltip.style.padding = '8px';
    this.tooltip.style.pointerEvents = 'none';
    this.tooltip.style.zIndex = '1000';
    this.tooltip.style.fontSize = '12px';
    this.tooltip.style.fontFamily = 'var(--vscode-font-family)';
    this.tooltip.style.color = 'var(--vscode-foreground)';
    this.tooltip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
    this.tooltip.style.maxWidth = '300px';

    document.body.appendChild(this.tooltip);
  }

  /**
   * Render timeline content
   */
  protected async renderContent(): Promise<void> {
    const d3 = (window as any).d3;
    if (!this.svg || !d3) {
      console.error('[ThreadingTimeline] SVG or D3 not available');
      return;
    }

    const data: ThreadingTimelineData = this.data;

    // Validate data
    if (!data || !data.events || data.events.length === 0) {
      this.renderEmptyState(
        'No threading execution traces recorded',
        '🔄',
        [
          'Enable threading monitoring',
          'Start a session and execute some code',
          'Threading traces will appear here in real-time'
        ]
      );
      return;
    }

    const width = this.getContentWidth();
    const height = this.getContentHeight();

    // Extract unique threads
    this.threads = Array.from(new Set(data.events.map(e => e.thread))).sort();

    // Determine time range
    const timestamps = data.events.map(e => e.timestamp);
    const minTime = data.timeRange?.start || Math.min(...timestamps);
    const maxTime = data.timeRange?.end || Math.max(...timestamps);

    // Add 5% padding on both sides for better visualization
    const timePadding = (maxTime - minTime) * 0.05;

    // Create scales
    this.xScale = d3.scaleLinear()
      .domain([minTime - timePadding, maxTime + timePadding])
      .range([0, width]);

    this.yScale = d3.scaleBand()
      .domain(this.threads)
      .range([0, height])
      .padding(0.2);

    const g = this.svg.select('.visualization-content');

    // Setup zoom behavior
    this.zoom = d3.zoom()
      .scaleExtent([0.5, 10])  // Allow 0.5x to 10x zoom
      .translateExtent([[-width, -height], [width * 2, height * 2]])
      .on('zoom', (event: any) => this.handleZoom(event));

    this.svg.call(this.zoom);

    // Create clip path for zooming
    this.svg.append('defs')
      .append('clipPath')
      .attr('id', 'clip-threading-timeline')
      .append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('x', 0)
      .attr('y', 0);

    // Create zoomable group
    const zoomGroup = g.append('g')
      .attr('class', 'zoom-group')
      .attr('clip-path', 'url(#clip-threading-timeline)');

    // Render swim lanes
    this.renderSwimLanes(g, width, height);

    // Render axes
    this.renderAxes(g, width, height);

    // Render events
    this.renderEvents(zoomGroup, data.events);

    // Render legend
    this.renderLegend(g, width);
  }

  /**
   * Render swim lanes (background)
   */
  private renderSwimLanes(g: any, width: number, height: number): void {
    const laneHeight = this.yScale.bandwidth();

    this.threads.forEach((thread, i) => {
      const y = this.yScale(thread);

      // Alternating background colors
      const fillColor = i % 2 === 0
        ? 'var(--vscode-editor-background)'
        : 'var(--vscode-list-hoverBackground)';

      g.append('rect')
        .attr('class', 'swim-lane')
        .attr('x', 0)
        .attr('y', y)
        .attr('width', width)
        .attr('height', laneHeight)
        .style('fill', fillColor)
        .style('opacity', 0.3);

      // Lane separator line
      if (i < this.threads.length - 1) {
        g.append('line')
          .attr('class', 'lane-separator')
          .attr('x1', 0)
          .attr('x2', width)
          .attr('y1', y + laneHeight)
          .attr('y2', y + laneHeight)
          .style('stroke', 'var(--vscode-panel-border)')
          .style('stroke-width', 1)
          .style('opacity', 0.3);
      }
    });
  }

  /**
   * Render axes
   */
  private renderAxes(g: any, width: number, height: number): void {
    const d3 = (window as any).d3;

    // X-axis (time)
    const xAxis = d3.axisBottom(this.xScale)
      .ticks(8)
      .tickFormat((d: number) => {
        const date = new Date(d);
        return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}.${String(date.getMilliseconds()).padStart(3, '0')}`;
      });

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .selectAll('text')
      .style('fill', 'var(--vscode-foreground)')
      .style('font-size', '11px');

    g.select('.x-axis')
      .selectAll('path, line')
      .style('stroke', 'var(--vscode-panel-border)');

    // Y-axis (threads)
    const yAxis = d3.axisLeft(this.yScale);

    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .selectAll('text')
      .style('fill', 'var(--vscode-foreground)')
      .style('font-size', '12px')
      .style('font-weight', '600');

    g.select('.y-axis')
      .selectAll('path, line')
      .style('stroke', 'var(--vscode-panel-border)');

    // X-axis label
    g.append('text')
      .attr('class', 'axis-label')
      .attr('x', width / 2)
      .attr('y', height + 35)
      .style('text-anchor', 'middle')
      .style('fill', 'var(--vscode-descriptionForeground)')
      .style('font-size', '12px')
      .text('Timeline (HH:MM:SS.mmm)');

    // Y-axis label
    g.append('text')
      .attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -100)
      .style('text-anchor', 'middle')
      .style('fill', 'var(--vscode-descriptionForeground)')
      .style('font-size', '12px')
      .text('Thread');
  }

  /**
   * Render event markers
   */
  private renderEvents(zoomGroup: any, events: ThreadingTimelineEvent[]): void {
    const d3 = (window as any).d3;
    const laneHeight = this.yScale.bandwidth();

    // Group events by type for rendering order
    const eventsByType = {
      entry: events.filter(e => e.type === 'entry'),
      transformation: events.filter(e => e.type === 'transformation'),
      mutation: events.filter(e => e.type === 'mutation'),
      exit: events.filter(e => e.type === 'exit'),
      violation: events.filter(e => e.type === 'violation')
    };

    // Render in order: entry, transformation, mutation, exit, violation (violations on top)
    Object.entries(eventsByType).forEach(([type, typeEvents]) => {
      const eventGroup = zoomGroup.append('g').attr('class', `events-${type}`);

      typeEvents.forEach((event: ThreadingTimelineEvent) => {
        const x = this.xScale(event.timestamp);
        const y = this.yScale(event.thread) + laneHeight / 2;

        // Render based on event type
        switch (event.type) {
          case 'entry':
            this.renderEntryMarker(eventGroup, event, x, y);
            break;
          case 'exit':
            this.renderExitMarker(eventGroup, event, x, y);
            break;
          case 'transformation':
            this.renderTransformationMarker(eventGroup, event, x, y);
            break;
          case 'mutation':
            this.renderMutationMarker(eventGroup, event, x, y);
            break;
          case 'violation':
            this.renderViolationMarker(eventGroup, event, x, y);
            break;
        }
      });
    });
  }

  /**
   * Render entry marker (circle)
   */
  private renderEntryMarker(g: any, event: ThreadingTimelineEvent, x: number, y: number): void {
    const marker = g.append('circle')
      .attr('class', 'event-marker entry')
      .attr('cx', x)
      .attr('cy', y)
      .attr('r', 4)
      .style('fill', '#4CAF50')
      .style('stroke', '#2E7D32')
      .style('stroke-width', 1.5)
      .style('cursor', 'pointer');

    this.addTooltipBehavior(marker, event);
  }

  /**
   * Render exit marker (circle)
   */
  private renderExitMarker(g: any, event: ThreadingTimelineEvent, x: number, y: number): void {
    const marker = g.append('circle')
      .attr('class', 'event-marker exit')
      .attr('cx', x)
      .attr('cy', y)
      .attr('r', 4)
      .style('fill', '#2196F3')
      .style('stroke', '#1565C0')
      .style('stroke-width', 1.5)
      .style('cursor', 'pointer');

    this.addTooltipBehavior(marker, event);
  }

  /**
   * Render transformation marker (diamond)
   */
  private renderTransformationMarker(g: any, event: ThreadingTimelineEvent, x: number, y: number): void {
    const size = 6;
    const path = `M${x},${y - size} L${x + size},${y} L${x},${y + size} L${x - size},${y} Z`;

    const marker = g.append('path')
      .attr('class', 'event-marker transformation')
      .attr('d', path)
      .style('fill', '#FF9800')
      .style('stroke', '#F57C00')
      .style('stroke-width', 1.5)
      .style('cursor', 'pointer');

    this.addTooltipBehavior(marker, event);
  }

  /**
   * Render mutation marker (square)
   */
  private renderMutationMarker(g: any, event: ThreadingTimelineEvent, x: number, y: number): void {
    const size = 6;

    const marker = g.append('rect')
      .attr('class', 'event-marker mutation')
      .attr('x', x - size / 2)
      .attr('y', y - size / 2)
      .attr('width', size)
      .attr('height', size)
      .style('fill', '#9C27B0')
      .style('stroke', '#6A1B9A')
      .style('stroke-width', 1.5)
      .style('cursor', 'pointer');

    this.addTooltipBehavior(marker, event);
  }

  /**
   * Render violation marker (triangle with severity color)
   */
  private renderViolationMarker(g: any, event: ThreadingTimelineEvent, x: number, y: number): void {
    const size = 8;
    const path = `M${x},${y - size} L${x + size},${y + size / 2} L${x - size},${y + size / 2} Z`;

    const severityColor = event.severity ? this.getSeverityColor(event.severity) : '#F44336';

    const marker = g.append('path')
      .attr('class', 'event-marker violation')
      .attr('d', path)
      .style('fill', severityColor)
      .style('stroke', '#B71C1C')
      .style('stroke-width', 2)
      .style('cursor', 'pointer')
      .style('filter', 'drop-shadow(0 0 3px rgba(244, 67, 54, 0.5))');

    this.addTooltipBehavior(marker, event);
  }

  /**
   * Add tooltip behavior to marker
   */
  private addTooltipBehavior(marker: any, event: ThreadingTimelineEvent): void {
    const self = this;

    marker
      .on('mouseenter', function (this: SVGElement, mouseEvent: MouseEvent) {
        // Highlight marker
        const d3 = (window as any).d3;
        d3.select(this)
          .transition()
          .duration(150)
          .attr('transform', 'scale(1.3)');

        // Show tooltip
        self.showTooltip(event, mouseEvent);
      })
      .on('mousemove', function (this: SVGElement, mouseEvent: MouseEvent) {
        self.updateTooltipPosition(mouseEvent);
      })
      .on('mouseleave', function (this: SVGElement) {
        // Reset marker
        const d3 = (window as any).d3;
        d3.select(this)
          .transition()
          .duration(150)
          .attr('transform', 'scale(1)');

        // Hide tooltip
        self.hideTooltip();
      });
  }

  /**
   * Show tooltip with event details
   */
  private showTooltip(event: ThreadingTimelineEvent, mouseEvent: MouseEvent): void {
    if (!this.tooltip) return;

    const date = new Date(event.timestamp);
    const timestamp = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}.${String(date.getMilliseconds()).padStart(3, '0')}`;

    let content = `
      <div style="margin-bottom: 4px;">
        <strong style="color: var(--vscode-textLink-foreground);">${this.escapeHtml(event.context)}</strong>
      </div>
      <div style="margin-bottom: 4px;">
        <span style="color: var(--vscode-descriptionForeground);">Type:</span>
        <strong>${this.escapeHtml(event.type)}</strong>
      </div>
      <div style="margin-bottom: 4px;">
        <span style="color: var(--vscode-descriptionForeground);">Thread:</span>
        <strong>${this.escapeHtml(event.thread)}</strong>
      </div>
      <div style="margin-bottom: 4px;">
        <span style="color: var(--vscode-descriptionForeground);">Time:</span>
        ${timestamp}
      </div>
    `;

    if (event.duration !== undefined) {
      content += `
        <div style="margin-bottom: 4px;">
          <span style="color: var(--vscode-descriptionForeground);">Duration:</span>
          ${event.duration.toFixed(2)}ms
        </div>
      `;
    }

    if (event.severity) {
      const severityColor = this.getSeverityColor(event.severity);
      content += `
        <div style="margin-bottom: 4px;">
          <span style="color: var(--vscode-descriptionForeground);">Severity:</span>
          <strong style="color: ${severityColor};">${this.escapeHtml(event.severity.toUpperCase())}</strong>
        </div>
      `;
    }

    if (event.data) {
      content += `<hr style="border: none; border-top: 1px solid var(--vscode-panel-border); margin: 8px 0;">`;

      // Show relevant data based on event type
      if (event.type === 'violation' && event.data.message) {
        content += `
          <div style="margin-top: 4px;">
            <div style="color: var(--vscode-descriptionForeground); font-size: 11px; margin-bottom: 2px;">Message:</div>
            <div style="color: var(--vscode-errorForeground);">${this.escapeHtml(event.data.message)}</div>
          </div>
        `;
      }

      if (event.type === 'transformation') {
        content += `
          <div style="margin-top: 4px;">
            <div style="color: var(--vscode-descriptionForeground); font-size: 11px; margin-bottom: 2px;">Transformation:</div>
            <div>${this.escapeHtml(event.data.from || '')} → ${this.escapeHtml(event.data.to || '')}</div>
          </div>
        `;
      }

      if (event.type === 'mutation') {
        content += `
          <div style="margin-top: 4px;">
            <div style="color: var(--vscode-descriptionForeground); font-size: 11px; margin-bottom: 2px;">Path:</div>
            <div>${this.escapeHtml(event.data.path || '')}</div>
          </div>
        `;
      }
    }

    this.tooltip.innerHTML = content;
    this.tooltip.style.display = 'block';
    this.updateTooltipPosition(mouseEvent);
  }

  /**
   * Update tooltip position
   */
  private updateTooltipPosition(mouseEvent: MouseEvent): void {
    if (!this.tooltip) return;

    const offset = 15;
    const tooltipWidth = this.tooltip.offsetWidth;
    const tooltipHeight = this.tooltip.offsetHeight;

    let left = mouseEvent.pageX + offset;
    let top = mouseEvent.pageY + offset;

    // Adjust if tooltip would go off screen
    if (left + tooltipWidth > window.innerWidth) {
      left = mouseEvent.pageX - tooltipWidth - offset;
    }

    if (top + tooltipHeight > window.innerHeight) {
      top = mouseEvent.pageY - tooltipHeight - offset;
    }

    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.top = `${top}px`;
  }

  /**
   * Hide tooltip
   */
  private hideTooltip(): void {
    if (!this.tooltip) return;
    this.tooltip.style.display = 'none';
  }

  /**
   * Handle zoom behavior
   */
  private handleZoom(event: any): void {
    const d3 = (window as any).d3;
    if (!this.svg) return;

    const g = this.svg.select('.zoom-group');

    // Apply transform to zoomable group
    g.attr('transform', event.transform);

    // Update x-axis scale
    const newXScale = event.transform.rescaleX(this.xScale);

    // Update x-axis
    const xAxis = d3.axisBottom(newXScale)
      .ticks(8)
      .tickFormat((d: number) => {
        const date = new Date(d);
        return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}.${String(date.getMilliseconds()).padStart(3, '0')}`;
      });

    this.svg.select('.x-axis').call(xAxis);
  }

  /**
   * Render legend
   */
  private renderLegend(g: any, width: number): void {
    const legendData = [
      { type: 'entry', label: 'Entry', color: '#4CAF50', shape: 'circle' },
      { type: 'exit', label: 'Exit', color: '#2196F3', shape: 'circle' },
      { type: 'transformation', label: 'Transform', color: '#FF9800', shape: 'diamond' },
      { type: 'mutation', label: 'Mutation', color: '#9C27B0', shape: 'square' },
      { type: 'violation', label: 'Violation', color: '#F44336', shape: 'triangle' }
    ];

    const legendGroup = g.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width - 300}, -30)`);

    legendData.forEach((item, i) => {
      const legendItem = legendGroup.append('g')
        .attr('class', 'legend-item')
        .attr('transform', `translate(${i * 60}, 0)`);

      // Render shape based on type
      if (item.shape === 'circle') {
        legendItem.append('circle')
          .attr('cx', 6)
          .attr('cy', 0)
          .attr('r', 4)
          .style('fill', item.color)
          .style('stroke', 'none');
      } else if (item.shape === 'diamond') {
        const size = 5;
        legendItem.append('path')
          .attr('d', `M6,${-size} L${6 + size},0 L6,${size} L${6 - size},0 Z`)
          .style('fill', item.color)
          .style('stroke', 'none');
      } else if (item.shape === 'square') {
        const size = 5;
        legendItem.append('rect')
          .attr('x', 6 - size / 2)
          .attr('y', -size / 2)
          .attr('width', size)
          .attr('height', size)
          .style('fill', item.color)
          .style('stroke', 'none');
      } else if (item.shape === 'triangle') {
        const size = 6;
        legendItem.append('path')
          .attr('d', `M6,${-size} L${6 + size},${size / 2} L${6 - size},${size / 2} Z`)
          .style('fill', item.color)
          .style('stroke', 'none');
      }

      legendItem.append('text')
        .attr('x', 14)
        .attr('y', 4)
        .style('fill', 'var(--vscode-foreground)')
        .style('font-size', '10px')
        .text(item.label);
    });
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    super.destroy();

    // Remove tooltip
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
  }
}
