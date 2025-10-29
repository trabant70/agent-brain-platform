/**
 * Multi-Layer Sankey Diagram
 * Enhanced Sankey showing 3+ layers (frontend → API → service → database)
 *
 * Purpose: Visualize complete data flow through system architecture
 * Technique: d3-sankey with automatic layer positioning
 */

import { BaseVisualization, VisualizationConfig } from './BaseVisualization';

export interface MultiLayerNode {
  id: string;
  name: string;
  layer: number;         // 0=frontend, 1=API, 2=service, 3=database, etc
  type: string;          // node type (component, endpoint, service, query)
  value?: number;        // Optional value for sizing
}

export interface MultiLayerLink {
  source: string | number;
  target: string | number;
  value: number;
  status?: 'connected' | 'disconnected' | 'mocked';
}

export interface MultiLayerSankeyData {
  nodes: MultiLayerNode[];
  links: MultiLayerLink[];
  layers: string[];      // Layer names for display
}

export class MultiLayerSankey extends BaseVisualization {
  constructor(container: HTMLElement, config: VisualizationConfig = {}) {
    super(container, config);
  }

  /**
   * Render multi-layer Sankey
   */
  protected async renderContent(): Promise<void> {
    const d3 = (window as any).d3;
    if (!this.svg) return;

    const data: MultiLayerSankeyData = this.data;
    const width = this.getContentWidth();
    const height = this.getContentHeight();

    // Create Sankey generator
    const sankey = d3.sankey()
      .nodeWidth(20)
      .nodePadding(10)
      .extent([[0, 0], [width, height]])
      .nodeId((d: any) => d.id);

    // Prepare data
    const graph = sankey({
      nodes: data.nodes.map(d => ({ ...d })),
      links: data.links.map(d => ({ ...d }))
    });

    // Create main group
    const g = this.svg!.select('.visualization-content');

    // Draw layer backgrounds
    this.drawLayerBackgrounds(g, data.layers, width, height);

    // Draw links
    const links = g.append('g')
      .attr('class', 'links')
      .selectAll('path')
      .data(graph.links)
      .join('path')
      .attr('d', d3.sankeyLinkHorizontal())
      .attr('stroke', (d: any) => this.getLinkColor(d))
      .attr('stroke-width', (d: any) => Math.max(1, d.width))
      .attr('stroke-opacity', 0.5)
      .attr('fill', 'none')
      .style('cursor', 'pointer')
      .on('mouseenter', (event: MouseEvent, d: any) => {
        this.showLinkTooltip(event, d);
        this.highlightLink(d, links);
      })
      .on('mouseleave', () => {
        this.hideLinkTooltip();
        this.clearLinkHighlights(links);
      });

    // Draw nodes
    const nodes = g.append('g')
      .attr('class', 'nodes')
      .selectAll('rect')
      .data(graph.nodes)
      .join('rect')
      .attr('x', (d: any) => d.x0)
      .attr('y', (d: any) => d.y0)
      .attr('width', (d: any) => d.x1 - d.x0)
      .attr('height', (d: any) => d.y1 - d.y0)
      .attr('fill', (d: any) => this.getNodeColor(d))
      .attr('stroke', 'var(--vscode-panel-border)')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mouseenter', (event: MouseEvent, d: any) => {
        this.showNodeTooltip(event, d);
      })
      .on('mouseleave', () => {
        this.hideNodeTooltip();
      })
      .on('click', (_event: MouseEvent, d: any) => {
        this.handleNodeClick(d);
      });

    // Add node labels
    g.append('g')
      .attr('class', 'node-labels')
      .selectAll('text')
      .data(graph.nodes)
      .join('text')
      .attr('x', (d: any) => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
      .attr('y', (d: any) => (d.y0 + d.y1) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d: any) => d.x0 < width / 2 ? 'start' : 'end')
      .text((d: any) => d.name)
      .style('font-size', '11px')
      .style('fill', 'var(--vscode-foreground)')
      .style('pointer-events', 'none');

    // Add layer labels at the top
    this.addLayerLabels(g, data.layers, width);
  }

  /**
   * Draw layer backgrounds
   */
  private drawLayerBackgrounds(g: any, layers: string[], width: number, height: number): void {
    if (layers.length === 0) return;

    const layerWidth = width / layers.length;

    g.append('g')
      .attr('class', 'layer-backgrounds')
      .selectAll('rect')
      .data(layers)
      .join('rect')
      .attr('x', (_d: string, i: number) => i * layerWidth)
      .attr('y', 0)
      .attr('width', layerWidth)
      .attr('height', height)
      .attr('fill', (_d: string, i: number) => i % 2 === 0 ? 'transparent' : 'var(--vscode-input-background)')
      .attr('opacity', 0.3);
  }

  /**
   * Add layer labels at the top
   */
  private addLayerLabels(g: any, layers: string[], width: number): void {
    if (layers.length === 0) return;

    const layerWidth = width / layers.length;

    g.append('g')
      .attr('class', 'layer-labels')
      .selectAll('text')
      .data(layers)
      .join('text')
      .attr('x', (_d: string, i: number) => i * layerWidth + layerWidth / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', 'var(--vscode-foreground)')
      .text((d: string) => d);
  }

  /**
   * Get node color based on type and layer
   */
  private getNodeColor(node: any): string {
    const typeColors: Record<string, string> = {
      component: '#3b82f6',
      endpoint: '#10b981',
      service: '#f59e0b',
      query: '#8b5cf6',
      database: '#ec4899'
    };

    return typeColors[node.type] || '#6b7280';
  }

  /**
   * Get link color based on status
   */
  private getLinkColor(link: any): string {
    if (!link.status) return 'var(--vscode-foreground)';

    const statusColors: Record<string, string> = {
      connected: '#10b981',
      disconnected: '#ef4444',
      mocked: '#f59e0b'
    };

    return statusColors[link.status] || 'var(--vscode-foreground)';
  }

  /**
   * Highlight link
   */
  private highlightLink(link: any, links: any): void {
    links
      .attr('stroke-opacity', (d: any) => d === link ? 0.8 : 0.2);
  }

  /**
   * Clear link highlights
   */
  private clearLinkHighlights(links: any): void {
    links.attr('stroke-opacity', 0.5);
  }

  /**
   * Show link tooltip
   */
  private showLinkTooltip(event: MouseEvent, link: any): void {
    const tooltip = this.getOrCreateTooltip();

    const statusIcons: Record<string, string> = {
      connected: '✅',
      disconnected: '❌',
      mocked: '⚠️'
    };

    const statusIcon = statusIcons[link.status] || '';

    tooltip.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">
        ${statusIcon} Connection
      </div>
      <div style="margin-bottom: 8px;">
        <div style="margin-bottom: 4px;">
          <span style="color: var(--vscode-descriptionForeground);">From:</span>
          <strong>${link.source.name}</strong>
        </div>
        <div>
          <span style="color: var(--vscode-descriptionForeground);">To:</span>
          <strong>${link.target.name}</strong>
        </div>
      </div>
      <div>
        Flow: <strong>${link.value}</strong> calls
      </div>
      ${link.status ? `
        <div style="margin-top: 8px; padding: 8px; background: ${this.getLinkColor(link)}20; border-left: 3px solid ${this.getLinkColor(link)};">
          Status: <strong>${link.status}</strong>
        </div>
      ` : ''}
    `;

    tooltip.style.display = 'block';
    tooltip.style.left = `${event.clientX + 10}px`;
    tooltip.style.top = `${event.clientY + 10}px`;

    // Adjust if off screen
    setTimeout(() => {
      const rect = tooltip.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        tooltip.style.left = `${window.innerWidth - rect.width - 10}px`;
      }
      if (rect.bottom > window.innerHeight) {
        tooltip.style.top = `${window.innerHeight - rect.height - 10}px`;
      }
    }, 0);
  }

  /**
   * Show node tooltip
   */
  private showNodeTooltip(event: MouseEvent, node: any): void {
    const tooltip = this.getOrCreateTooltip();

    const sourceLinks = node.sourceLinks || [];
    const targetLinks = node.targetLinks || [];

    tooltip.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">
        ${node.name}
      </div>
      <div style="font-size: 11px; color: var(--vscode-descriptionForeground); margin-bottom: 8px;">
        ${node.type} (Layer ${node.layer})
      </div>
      <div>
        <div>Incoming connections: <strong>${targetLinks.length}</strong></div>
        <div>Outgoing connections: <strong>${sourceLinks.length}</strong></div>
      </div>
      <div style="margin-top: 8px; font-size: 11px; color: var(--vscode-descriptionForeground);">
        Click for details
      </div>
    `;

    tooltip.style.display = 'block';
    tooltip.style.left = `${event.clientX + 10}px`;
    tooltip.style.top = `${event.clientY + 10}px`;

    // Adjust if off screen
    setTimeout(() => {
      const rect = tooltip.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        tooltip.style.left = `${window.innerWidth - rect.width - 10}px`;
      }
      if (rect.bottom > window.innerHeight) {
        tooltip.style.top = `${window.innerHeight - rect.height - 10}px`;
      }
    }, 0);
  }

  /**
   * Hide tooltips
   */
  private hideLinkTooltip(): void {
    const tooltip = document.getElementById('multilayer-sankey-tooltip');
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }

  private hideNodeTooltip(): void {
    this.hideLinkTooltip();
  }

  /**
   * Get or create tooltip
   */
  private getOrCreateTooltip(): HTMLElement {
    let tooltip = document.getElementById('multilayer-sankey-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'multilayer-sankey-tooltip';
      tooltip.style.cssText = `
        position: fixed;
        max-width: 300px;
        padding: 12px;
        background: var(--vscode-editorHoverWidget-background);
        border: 1px solid var(--vscode-editorHoverWidget-border);
        border-radius: 4px;
        font-size: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        pointer-events: none;
        display: none;
      `;
      document.body.appendChild(tooltip);
    }
    return tooltip;
  }

  /**
   * Handle node click
   */
  private handleNodeClick(node: any): void {
    window.dispatchEvent(new CustomEvent('multilayer-sankey-node-click', {
      detail: {
        id: node.id,
        name: node.name,
        layer: node.layer,
        type: node.type
      }
    }));
  }

  /**
   * Clean up
   */
  override destroy(): void {
    const tooltip = document.getElementById('multilayer-sankey-tooltip');
    if (tooltip) {
      tooltip.remove();
    }

    super.destroy();
  }
}
