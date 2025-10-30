/**
 * Bubble Chart Visualization
 * Shows category overview with issue count and severity
 * Size = issue count, Color = severity/score
 */

import { BaseVisualization, VisualizationConfig } from './BaseVisualization';
import { Logger, LogCategory, LogPathway } from '../../../../infrastructure/logging/Logger';

const logger = Logger.getInstance();

export interface BubbleData {
  id: string;
  name: string;
  value: number; // Total issues
  critical: number;
  high: number;
  score: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
}

export interface BubbleChartData {
  children: BubbleData[];
}

export class BubbleChart extends BaseVisualization {
  constructor(container: HTMLElement, config: VisualizationConfig = {}) {
    // Let BaseVisualization handle sizing from container
    super(container, {
      ...config,
      margin: config.margin || { top: 20, right: 20, bottom: 20, left: 20 }
    });
  }

  protected async renderContent(): Promise<void> {
    logger.debug(LogCategory.VISUALIZATION, 'BubbleChart renderContent starting', 'BubbleChart', undefined, LogPathway.RENDER_PIPELINE);
    const d3 = (window as any).d3;
    if (!d3) {
      logger.error(LogCategory.VISUALIZATION, 'D3 is not available', 'BubbleChart', undefined, LogPathway.RENDER_PIPELINE);
      return;
    }

    const data = this.data as BubbleChartData;
    logger.debug(LogCategory.VISUALIZATION, 'BubbleChart data check', 'BubbleChart', {
      hasData: !!data,
      hasChildren: !!data?.children,
      childCount: data?.children?.length || 0
    }, LogPathway.RENDER_PIPELINE);

    if (!data || !data.children || data.children.length === 0) {
      logger.debug(LogCategory.VISUALIZATION, 'No data, rendering empty state', 'BubbleChart', undefined, LogPathway.RENDER_PIPELINE);
      this.renderEmpty();
      return;
    }

    const width = this.getContentWidth();
    const height = this.getContentHeight();
    logger.debug(LogCategory.VISUALIZATION, 'Content dimensions', 'BubbleChart', { width, height }, LogPathway.RENDER_PIPELINE);

    // Create hierarchical data for pack layout
    const root = d3.hierarchy({ children: data.children })
      .sum((d: any) => d.value || 0)
      .sort((a: any, b: any) => (b.value || 0) - (a.value || 0));

    logger.debug(LogCategory.VISUALIZATION, `Hierarchy created, root value: ${root.value}`, 'BubbleChart', undefined, LogPathway.RENDER_PIPELINE);

    // Create pack layout
    const pack = d3.pack()
      .size([width, height])
      .padding(3);

    const nodes = pack(root).leaves();
    logger.debug(LogCategory.VISUALIZATION, `Pack layout computed, nodes: ${nodes.length}`, 'BubbleChart', undefined, LogPathway.RENDER_PIPELINE);

    const g = this.svg!.select('.visualization-content');
    logger.debug(LogCategory.VISUALIZATION, `Content group selected: ${!!g.node()}`, 'BubbleChart', undefined, LogPathway.RENDER_PIPELINE);

    // Create bubble groups
    const bubbles = g.selectAll('.bubble')
      .data(nodes)
      .join('g')
      .attr('class', 'bubble')
      .attr('transform', (d: any) => `translate(${d.x},${d.y})`);

    logger.debug(LogCategory.VISUALIZATION, `Bubble groups created: ${bubbles.size()}`, 'BubbleChart', undefined, LogPathway.RENDER_PIPELINE);

    // Draw circles
    bubbles.append('circle')
      .attr('r', (d: any) => d.r)
      .attr('fill', (d: any) => this.getBubbleColor(d.data))
      .attr('opacity', 0.7)
      .attr('stroke', '#333')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseover', (event: MouseEvent, d: any) => {
        if (this.config.interactive) {
          this.showTooltip(event, d.data);
          d3.select(event.currentTarget)
            .attr('opacity', 0.9)
            .attr('stroke-width', 3);
        }
      })
      .on('mouseout', (event: MouseEvent) => {
        if (this.config.interactive) {
          this.hideTooltip();
          d3.select(event.currentTarget)
            .attr('opacity', 0.7)
            .attr('stroke-width', 2);
        }
      })
      .on('click', (_event: MouseEvent, d: any) => {
        if (this.config.interactive) {
          this.handleBubbleClick(d.data);
        }
      });

    // Add labels
    if (this.config.showLabels) {
      // Category name
      bubbles.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', (d: any) => d.r > 40 ? '-0.5em' : '0em')
        .text((d: any) => this.getCategoryLabel(d.data.name, d.r))
        .style('font-size', (d: any) => `${Math.min(d.r / 3, 14)}px`)
        .style('font-weight', 'bold')
        .style('fill', '#fff')
        .style('text-shadow', '0 1px 2px rgba(0,0,0,0.8)')
        .style('pointer-events', 'none');

      // Issue count
      bubbles.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', (d: any) => d.r > 40 ? '1em' : '1.2em')
        .text((d: any) => `${d.data.value} issues`)
        .style('font-size', (d: any) => `${Math.min(d.r / 4, 12)}px`)
        .style('fill', '#fff')
        .style('text-shadow', '0 1px 2px rgba(0,0,0,0.8)')
        .style('pointer-events', 'none')
        .attr('display', (d: any) => d.r > 30 ? null : 'none');

      // Score
      bubbles.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', (d: any) => d.r > 40 ? '2.2em' : '0em')
        .text((d: any) => `${d.data.score}/100`)
        .style('font-size', (d: any) => `${Math.min(d.r / 5, 10)}px`)
        .style('fill', '#fff')
        .style('opacity', 0.9)
        .style('text-shadow', '0 1px 2px rgba(0,0,0,0.8)')
        .style('pointer-events', 'none')
        .attr('display', (d: any) => d.r > 40 ? null : 'none');
    }

    // Add legend
    this.renderLegend(g, width, height);

    logger.debug(LogCategory.VISUALIZATION, 'BubbleChart renderContent completed successfully', 'BubbleChart', undefined, LogPathway.RENDER_PIPELINE);
  }

  /**
   * Get bubble color based on status and severity
   */
  private getBubbleColor(data: BubbleData): string {
    // If critical issues, always use red
    if (data.critical > 0) {
      return this.getSeverityColor('critical');
    }

    // If high issues, use orange
    if (data.high > 0) {
      return this.getSeverityColor('high');
    }

    // Otherwise use status color
    return this.getStatusColor(data.status);
  }

  /**
   * Get category label (truncate if needed)
   */
  private getCategoryLabel(name: string, radius: number): string {
    const maxChars = Math.floor(radius / 4);
    if (name.length <= maxChars) return name;
    return name.substring(0, maxChars - 2) + '..';
  }

  /**
   * Render legend
   */
  private renderLegend(g: any, width: number, height: number): void {
    const d3 = (window as any).d3;

    const legendData = [
      { label: 'Excellent (90+)', color: this.getStatusColor('excellent') },
      { label: 'Good (70-89)', color: this.getStatusColor('good') },
      { label: 'Warning (50-69)', color: this.getStatusColor('warning') },
      { label: 'Critical (<50 or critical issues)', color: this.getStatusColor('critical') }
    ];

    const legend = g.append('g')
      .attr('class', 'bubble-legend')
      .attr('transform', `translate(10, ${height - 80})`);

    const legendItems = legend.selectAll('.legend-item')
      .data(legendData)
      .join('g')
      .attr('class', 'legend-item')
      .attr('transform', (_d: any, i: number) => `translate(0, ${i * 20})`);

    legendItems.append('circle')
      .attr('r', 6)
      .attr('fill', (d: any) => d.color);

    legendItems.append('text')
      .attr('x', 12)
      .attr('dy', '0.35em')
      .text((d: any) => d.label)
      .style('font-size', '11px')
      .style('fill', 'var(--vscode-foreground, #333)');
  }

  /**
   * Show tooltip
   */
  private showTooltip(event: MouseEvent, data: BubbleData): void {
    const tooltip = this.getOrCreateTooltip();

    const criticalBadge = data.critical > 0
      ? `<span style="background: ${this.getSeverityColor('critical')}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; margin-left: 4px;">${data.critical} Critical</span>`
      : '';

    const highBadge = data.high > 0
      ? `<span style="background: ${this.getSeverityColor('high')}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; margin-left: 4px;">${data.high} High</span>`
      : '';

    tooltip.innerHTML = `
      <div class="tooltip-content">
        <div style="margin-bottom: 8px;">
          <strong>${data.name}</strong>
          ${criticalBadge}
          ${highBadge}
        </div>
        <div style="margin: 4px 0;">
          <div>Total Issues: <strong>${data.value}</strong></div>
          <div>Score: <strong style="color: ${this.getStatusColor(data.status)}">${data.score}/100</strong></div>
          <div>Status: <strong>${data.status}</strong></div>
        </div>
        <div style="margin-top: 8px; font-size: 11px; color: #666;">
          Click to view category details
        </div>
      </div>
    `;

    this.positionTooltip(tooltip, event);
  }

  /**
   * Handle bubble click
   */
  private handleBubbleClick(data: BubbleData): void {
    const event = new CustomEvent('bubble-click', {
      detail: {
        categoryId: data.id,
        categoryName: data.name,
        issueCount: data.value,
        score: data.score
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
    setTimeout(() => {
      const tooltipRect = tooltip.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      tooltip.style.left = (x + tooltipRect.width > viewportWidth)
        ? `${event.pageX - tooltipRect.width - 10}px`
        : `${x}px`;

      tooltip.style.top = (y + tooltipRect.height > viewportHeight)
        ? `${event.pageY - tooltipRect.height - 10}px`
        : `${y}px`;
    }, 0);
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
      <div class="visualization-empty" style="padding: 60px; text-align: center; color: var(--vscode-descriptionForeground);">
        <div style="font-size: 48px; margin-bottom: 12px;">📊</div>
        <div style="font-size: 16px; margin-bottom: 8px;">No Categories to Display</div>
        <div style="font-size: 12px;">Run an analysis to see category distribution</div>
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
