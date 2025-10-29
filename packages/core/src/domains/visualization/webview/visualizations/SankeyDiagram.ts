/**
 * Sankey Diagram Visualization
 * Shows flow from backend endpoints → frontend connections
 * Perfect for visualizing feature completeness
 */

import { BaseVisualization, VisualizationConfig } from './BaseVisualization';

export interface SankeyNode {
  id: string;
  name: string;
}

export interface SankeyLink {
  source: string | number;
  target: string | number;
  value: number;
  complete?: boolean;
  mocked?: boolean;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export class SankeyDiagram extends BaseVisualization {
  constructor(container: HTMLElement, config: VisualizationConfig = {}) {
    super(container, {
      ...config,
      height: config.height || 400,
      margin: config.margin || { top: 10, right: 10, bottom: 10, left: 10 }
    });
  }

  protected async renderContent(): Promise<void> {
    const d3 = (window as any).d3;
    if (!d3 || !d3.sankey) {
      console.error('D3 Sankey is not available. Make sure d3-sankey is loaded.');
      this.renderFallback();
      return;
    }

    const data = this.data as SankeyData;
    if (!data || !data.nodes || !data.links) {
      this.renderEmpty();
      return;
    }

    const width = this.getContentWidth();
    const height = this.getContentHeight();

    // Create Sankey generator
    const sankey = d3.sankey()
      .nodeWidth(20)
      .nodePadding(10)
      .extent([[0, 0], [width, height]]);

    // Prepare data (D3 Sankey modifies the data)
    const graph = sankey({
      nodes: data.nodes.map(d => Object.assign({}, d)),
      links: data.links.map(d => Object.assign({}, d))
    });

    const g = this.svg!.select('.visualization-content');

    // Render links (flows)
    g.append('g')
      .attr('class', 'sankey-links')
      .selectAll('path')
      .data(graph.links)
      .join('path')
      .attr('d', d3.sankeyLinkHorizontal())
      .attr('stroke-width', (d: any) => Math.max(1, d.width))
      .attr('stroke', (d: any) => this.getLinkColor(d))
      .attr('fill', 'none')
      .attr('opacity', 0.5)
      .attr('class', 'sankey-link')
      .on('mouseover', (event: MouseEvent, d: any) => {
        if (this.config.interactive) {
          this.showLinkTooltip(event, d);
          d3.select(event.currentTarget).attr('opacity', 0.8);
        }
      })
      .on('mouseout', (event: MouseEvent) => {
        if (this.config.interactive) {
          this.hideTooltip();
          d3.select(event.currentTarget).attr('opacity', 0.5);
        }
      });

    // Render nodes
    const node = g.append('g')
      .attr('class', 'sankey-nodes')
      .selectAll('g')
      .data(graph.nodes)
      .join('g')
      .attr('class', 'sankey-node');

    // Node rectangles
    node.append('rect')
      .attr('x', (d: any) => d.x0)
      .attr('y', (d: any) => d.y0)
      .attr('height', (d: any) => d.y1 - d.y0)
      .attr('width', (d: any) => d.x1 - d.x0)
      .attr('fill', (d: any) => this.getNodeColor(d))
      .attr('stroke', '#333')
      .attr('stroke-width', 1)
      .on('mouseover', (event: MouseEvent, d: any) => {
        if (this.config.interactive) {
          this.showNodeTooltip(event, d);
        }
      })
      .on('mouseout', () => {
        if (this.config.interactive) {
          this.hideTooltip();
        }
      });

    // Node labels
    if (this.config.showLabels) {
      node.append('text')
        .attr('x', (d: any) => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
        .attr('y', (d: any) => (d.y1 + d.y0) / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', (d: any) => d.x0 < width / 2 ? 'start' : 'end')
        .text((d: any) => d.name)
        .style('font-size', '12px')
        .style('fill', 'var(--vscode-foreground, #333)')
        .style('pointer-events', 'none');
    }
  }

  /**
   * Get color for link based on status
   */
  private getLinkColor(link: any): string {
    if (link.mocked) {
      return '#f59e0b'; // Orange for mocked
    }
    if (link.complete === false) {
      return '#ef4444'; // Red for disconnected
    }
    return '#10b981'; // Green for connected
  }

  /**
   * Get color for node
   */
  private getNodeColor(node: any): string {
    // Different colors for different node types
    if (node.id === 'backend') return '#3b82f6';
    if (node.id === 'frontend') return '#8b5cf6';
    if (node.id === 'connected') return '#10b981';
    if (node.id === 'disconnected') return '#ef4444';
    return '#6b7280';
  }

  /**
   * Show tooltip for link
   */
  private showLinkTooltip(event: MouseEvent, link: any): void {
    const tooltip = this.getOrCreateTooltip();

    const sourceName = typeof link.source === 'object' ? link.source.name : link.source;
    const targetName = typeof link.target === 'object' ? link.target.name : link.target;

    let status = 'Connected';
    if (link.mocked) status = 'Mocked';
    if (link.complete === false) status = 'Disconnected';

    tooltip.innerHTML = `
      <div class="tooltip-content">
        <strong>${sourceName} → ${targetName}</strong>
        <div>Flow: ${link.value} endpoint${link.value !== 1 ? 's' : ''}</div>
        <div>Status: <span style="color: ${this.getLinkColor(link)}">${status}</span></div>
      </div>
    `;

    this.positionTooltip(tooltip, event);
  }

  /**
   * Show tooltip for node
   */
  private showNodeTooltip(event: MouseEvent, node: any): void {
    const tooltip = this.getOrCreateTooltip();

    tooltip.innerHTML = `
      <div class="tooltip-content">
        <strong>${node.name}</strong>
        <div>Total flow: ${node.value}</div>
      </div>
    `;

    this.positionTooltip(tooltip, event);
  }

  /**
   * Get or create tooltip element
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
   * Position tooltip near mouse
   */
  private positionTooltip(tooltip: HTMLElement, event: MouseEvent): void {
    tooltip.style.display = 'block';
    tooltip.style.left = `${event.pageX + 10}px`;
    tooltip.style.top = `${event.pageY + 10}px`;
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
   * Render fallback when D3 Sankey is not available
   */
  private renderFallback(): void {
    const data = this.data as SankeyData;
    this.container.innerHTML = `
      <div class="visualization-fallback" style="padding: 20px; text-align: center;">
        <div style="margin-bottom: 12px; color: var(--vscode-descriptionForeground);">
          <strong>Endpoint Connection Flow</strong>
        </div>
        <div style="font-size: 13px;">
          <div>Total Endpoints: ${data.nodes?.length || 0}</div>
          <div>Connections: ${data.links?.length || 0}</div>
        </div>
        <div style="margin-top: 12px; font-size: 11px; color: var(--vscode-descriptionForeground);">
          D3 Sankey visualization not available
        </div>
      </div>
    `;
  }

  /**
   * Render empty state
   */
  private renderEmpty(): void {
    this.container.innerHTML = `
      <div class="visualization-empty" style="padding: 40px; text-align: center; color: var(--vscode-descriptionForeground);">
        <div style="font-size: 32px; margin-bottom: 8px;">📊</div>
        <div>No data to visualize</div>
      </div>
    `;
  }

  /**
   * Clean up tooltips
   */
  destroy(): void {
    super.destroy();
    const tooltip = document.getElementById('viz-tooltip');
    if (tooltip) {
      tooltip.remove();
    }
  }
}
