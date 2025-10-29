/**
 * Heatmap Visualization
 * Shows files with issue density and severity
 * Helps identify problematic areas of the codebase
 */

import { BaseVisualization, VisualizationConfig } from './BaseVisualization';

export interface HeatmapCell {
  file: string;
  fullPath: string;
  count: number;
  critical: number;
  high: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export type HeatmapData = HeatmapCell[];

export class HeatmapVisualization extends BaseVisualization {
  private readonly maxCellsPerRow = 10;
  private readonly cellSize = 60;
  private readonly cellPadding = 2;

  constructor(container: HTMLElement, config: VisualizationConfig = {}) {
    super(container, {
      ...config,
      margin: config.margin || { top: 40, right: 20, bottom: 60, left: 120 }
    });
  }

  protected async renderContent(): Promise<void> {
    const d3 = (window as any).d3;
    if (!d3) {
      console.error('D3 is not available');
      return;
    }

    const data = this.data as HeatmapData;
    if (!data || data.length === 0) {
      this.renderEmpty();
      return;
    }

    // Sort by severity and count
    const sortedData = [...data].sort((a, b) => {
      // Critical first
      if (a.critical !== b.critical) return b.critical - a.critical;
      // Then high
      if (a.high !== b.high) return b.high - a.high;
      // Then total count
      return b.count - a.count;
    });

    // Take top files (limit to prevent overcrowding)
    const maxFiles = 30;
    const displayData = sortedData.slice(0, maxFiles);

    // Calculate dimensions
    const cellsPerRow = Math.min(this.maxCellsPerRow, displayData.length);
    const rows = Math.ceil(displayData.length / cellsPerRow);

    const contentWidth = this.getContentWidth();
    const availableWidth = contentWidth - this.config.margin.left;
    const cellSize = Math.min(this.cellSize, (availableWidth - (cellsPerRow * this.cellPadding)) / cellsPerRow);

    // Update SVG height to fit all cells
    const totalHeight = rows * (cellSize + this.cellPadding) + this.config.margin.top + this.config.margin.bottom;
    this.svg!.attr('height', totalHeight);

    const g = this.svg!.select('.visualization-content');

    // Create color scale for issue count
    const maxCount = d3.max(displayData, (d: HeatmapCell) => d.count) || 1;
    const colorScale = d3.scaleSequential()
      .domain([0, maxCount])
      .interpolator(d3.interpolateReds);

    // Create cells
    const cells = g.selectAll('.heatmap-cell')
      .data(displayData)
      .join('g')
      .attr('class', 'heatmap-cell')
      .attr('transform', (_d: HeatmapCell, i: number) => {
        const row = Math.floor(i / cellsPerRow);
        const col = i % cellsPerRow;
        const x = col * (cellSize + this.cellPadding);
        const y = row * (cellSize + this.cellPadding);
        return `translate(${x}, ${y})`;
      });

    // Cell rectangles
    cells.append('rect')
      .attr('width', cellSize)
      .attr('height', cellSize)
      .attr('fill', (d: HeatmapCell) => {
        // Use severity-based color for critical/high, otherwise use count-based
        if (d.critical > 0) return this.getSeverityColor('critical');
        if (d.high > 0) return this.getSeverityColor('high');
        return colorScale(d.count);
      })
      .attr('stroke', '#333')
      .attr('stroke-width', 1)
      .attr('rx', 4)
      .attr('class', 'heatmap-rect')
      .style('cursor', 'pointer')
      .on('mouseover', (event: MouseEvent, d: HeatmapCell) => {
        if (this.config.interactive) {
          this.showTooltip(event, d);
          d3.select(event.currentTarget)
            .attr('stroke-width', 2)
            .attr('stroke', '#fff');
        }
      })
      .on('mouseout', (event: MouseEvent) => {
        if (this.config.interactive) {
          this.hideTooltip();
          d3.select(event.currentTarget)
            .attr('stroke-width', 1)
            .attr('stroke', '#333');
        }
      })
      .on('click', (_event: MouseEvent, d: HeatmapCell) => {
        if (this.config.interactive) {
          this.handleCellClick(d);
        }
      });

    // Cell labels (issue count)
    if (this.config.showLabels && cellSize > 40) {
      cells.append('text')
        .attr('x', cellSize / 2)
        .attr('y', cellSize / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .text((d: HeatmapCell) => d.count)
        .style('font-size', `${Math.min(cellSize / 3, 18)}px`)
        .style('font-weight', 'bold')
        .style('fill', (d: HeatmapCell) => {
          // White text on dark backgrounds
          return d.critical > 0 || d.high > 0 || d.count > maxCount / 2 ? '#fff' : '#333';
        })
        .style('pointer-events', 'none');

      // File name (truncated)
      cells.append('text')
        .attr('x', cellSize / 2)
        .attr('y', cellSize + 12)
        .attr('text-anchor', 'middle')
        .text((d: HeatmapCell) => this.truncateFileName(d.file || 'unknown', cellSize))
        .style('font-size', '10px')
        .style('fill', 'var(--vscode-foreground, #333)')
        .style('pointer-events', 'none');
    }

    // Add legend
    this.renderLegend(g, contentWidth, colorScale, maxCount);

    // Add title
    this.renderTitle();
  }

  /**
   * Truncate file name to fit cell width
   */
  private truncateFileName(fileName: string | undefined, cellSize: number): string {
    if (!fileName) return 'unknown';
    const maxChars = Math.floor(cellSize / 6);
    if (fileName.length <= maxChars) return fileName;
    return fileName.substring(0, maxChars - 3) + '...';
  }

  /**
   * Render legend
   */
  private renderLegend(g: any, width: number, colorScale: any, maxCount: number): void {
    const d3 = (window as any).d3;

    const legendWidth = 200;
    const legendHeight = 10;
    const legendX = width - legendWidth - 20;
    const legendY = -30;

    const legend = g.append('g')
      .attr('class', 'heatmap-legend')
      .attr('transform', `translate(${legendX}, ${legendY})`);

    // Create gradient
    const defs = this.svg!.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'heatmap-gradient')
      .attr('x1', '0%')
      .attr('x2', '100%');

    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      gradient.append('stop')
        .attr('offset', `${(i / steps) * 100}%`)
        .attr('stop-color', colorScale((i / steps) * maxCount));
    }

    // Render gradient rectangle
    legend.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#heatmap-gradient)');

    // Add labels
    legend.append('text')
      .attr('x', 0)
      .attr('y', legendHeight + 12)
      .text('0')
      .style('font-size', '10px')
      .style('fill', 'var(--vscode-foreground, #333)');

    legend.append('text')
      .attr('x', legendWidth)
      .attr('y', legendHeight + 12)
      .attr('text-anchor', 'end')
      .text(`${maxCount} issues`)
      .style('font-size', '10px')
      .style('fill', 'var(--vscode-foreground, #333)');
  }

  /**
   * Render title
   */
  private renderTitle(): void {
    if (!this.config.showLabels) return;

    const d3 = (window as any).d3;
    const g = this.svg!.select('.visualization-content');

    g.append('text')
      .attr('x', 0)
      .attr('y', -15)
      .attr('class', 'heatmap-title')
      .text('Issue Heatmap: Files with Most Problems')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .style('fill', 'var(--vscode-foreground, #333)');
  }

  /**
   * Show tooltip for cell
   */
  private showTooltip(event: MouseEvent, cell: HeatmapCell): void {
    const tooltip = this.getOrCreateTooltip();

    tooltip.innerHTML = `
      <div class="tooltip-content">
        <strong>${cell.file}</strong>
        <div style="margin-top: 4px; font-size: 11px; color: #666;">${cell.fullPath}</div>
        <div style="margin-top: 8px;">
          <div>Total Issues: <strong>${cell.count}</strong></div>
          ${cell.critical > 0 ? `<div style="color: ${this.getSeverityColor('critical')}">Critical: ${cell.critical}</div>` : ''}
          ${cell.high > 0 ? `<div style="color: ${this.getSeverityColor('high')}">High: ${cell.high}</div>` : ''}
        </div>
        <div style="margin-top: 8px; font-size: 11px; color: #666;">Click to view issues</div>
      </div>
    `;

    this.positionTooltip(tooltip, event);
  }

  /**
   * Handle cell click - emit event for navigation
   */
  private handleCellClick(cell: HeatmapCell): void {
    // Dispatch custom event that the view controller can listen to
    const event = new CustomEvent('heatmap-cell-click', {
      detail: {
        filePath: cell.fullPath,
        issueCount: cell.count
      }
    });
    window.dispatchEvent(event);
  }

  /**
   * Get or create tooltip
   */
  private getOrCreateTooltip(): HTMLElement {
    let tooltip = document.getElementById('viz-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'viz-tooltip';
      tooltip.className = 'visualization-tooltip';
      tooltip.style.cssText = `
        position: fixed;
        background: var(--vscode-editorHoverWidget-background, white);
        border: 1px solid var(--vscode-editorHoverWidget-border, #ccc);
        border-radius: 4px;
        padding: 8px 12px;
        font-size: 12px;
        pointer-events: none;
        z-index: 10000;
        display: none;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      `;
      document.body.appendChild(tooltip);
    }
    return tooltip;
  }

  /**
   * Position tooltip
   */
  private positionTooltip(tooltip: HTMLElement, event: MouseEvent): void {
    tooltip.style.display = 'block';
    const x = event.pageX + 10;
    const y = event.pageY + 10;

    // Ensure tooltip stays in viewport
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    tooltip.style.left = (x + tooltipRect.width > viewportWidth)
      ? `${event.pageX - tooltipRect.width - 10}px`
      : `${x}px`;

    tooltip.style.top = (y + tooltipRect.height > viewportHeight)
      ? `${event.pageY - tooltipRect.height - 10}px`
      : `${y}px`;
  }

  /**
   * Hide tooltip
   */
  private hideTooltip(): void {
    const tooltip = document.getElementById('viz-tooltip');
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }

  /**
   * Render empty state
   */
  private renderEmpty(): void {
    this.container.innerHTML = `
      <div class="visualization-empty" style="padding: 40px; text-align: center; color: var(--vscode-descriptionForeground);">
        <div style="font-size: 32px; margin-bottom: 8px;">📊</div>
        <div>No issues found</div>
        <div style="font-size: 11px; margin-top: 8px;">Run an analysis to see file-level issue distribution</div>
      </div>
    `;
  }

  /**
   * Clean up
   */
  destroy(): void {
    super.destroy();
    const tooltip = document.getElementById('viz-tooltip');
    if (tooltip) {
      tooltip.remove();
    }
  }
}
