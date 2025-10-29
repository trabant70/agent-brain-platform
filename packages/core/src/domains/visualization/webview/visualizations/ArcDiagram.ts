/**
 * Arc Diagram
 * Linear layout with arc connections showing sequential dependencies
 *
 * Purpose: Visualize ordered/sequential dependencies and detect patterns
 * Technique: D3 with arc path generation for connections
 */

import { BaseVisualization, VisualizationConfig } from './BaseVisualization';

export interface ArcNode {
  id: string;
  name: string;
  type: string;           // file type (component, service, util, etc.)
  order: number;          // position in sequence
  connections: number;    // total number of connections
  incoming?: number;      // incoming connections count
  outgoing?: number;      // outgoing connections count
}

export interface ArcLink {
  source: string | number;
  target: string | number;
  strength: number;       // dependency strength
  type?: string;          // dependency type (import, call, etc.)
}

export interface ArcDiagramData {
  nodes: ArcNode[];
  links: ArcLink[];
}

export class ArcDiagram extends BaseVisualization {
  private sortOrder: 'default' | 'connections' | 'type' = 'default';

  constructor(container: HTMLElement, config: VisualizationConfig = {}) {
    super(container, config);
  }

  /**
   * Render arc diagram
   */
  protected async renderContent(): Promise<void> {
    const d3 = (window as any).d3;
    if (!this.svg) return;

    const data: ArcDiagramData = this.data;
    const width = this.getContentWidth();
    const height = this.getContentHeight();

    // Add controls
    this.addControls();

    // Sort nodes based on current order
    const sortedNodes = this.sortNodes([...data.nodes], this.sortOrder);

    // Create x scale for node positions
    const xScale = d3.scalePoint()
      .domain(sortedNodes.map((d: ArcNode) => d.id))
      .range([50, width - 50])
      .padding(0.5);

    // Calculate node positions
    const nodePositions = new Map<string, number>();
    sortedNodes.forEach((node: ArcNode) => {
      nodePositions.set(node.id, xScale(node.id));
    });

    const g = this.svg!.select('.visualization-content');

    // Draw horizontal baseline
    g.append('line')
      .attr('class', 'baseline')
      .attr('x1', 50)
      .attr('y1', height / 2)
      .attr('x2', width - 50)
      .attr('y2', height / 2)
      .attr('stroke', 'var(--vscode-panel-border)')
      .attr('stroke-width', 1);

    // Draw arcs (links)
    const links = g.append('g')
      .attr('class', 'links')
      .selectAll('path')
      .data(data.links)
      .join('path')
      .attr('d', (d: any) => this.createArcPath(d, nodePositions, height))
      .attr('fill', 'none')
      .attr('stroke', (d: any) => this.getLinkColor(d))
      .attr('stroke-width', (d: any) => Math.max(1, d.strength))
      .attr('stroke-opacity', 0.4)
      .style('cursor', 'pointer')
      .on('mouseenter', (event: MouseEvent, d: any) => {
        this.showLinkTooltip(event, d);
        this.highlightLink(d, links, nodes);
      })
      .on('mouseleave', () => {
        this.hideLinkTooltip();
        this.clearHighlights(links, nodes);
      });

    // Draw nodes
    const nodes = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(sortedNodes)
      .join('g')
      .attr('class', 'node')
      .attr('transform', (d: ArcNode) => `translate(${nodePositions.get(d.id)},${height / 2})`)
      .style('cursor', 'pointer');

    // Add node circles
    nodes.append('circle')
      .attr('r', (d: ArcNode) => this.getNodeRadius(d))
      .attr('fill', (d: ArcNode) => this.getNodeColor(d))
      .attr('stroke', 'var(--vscode-panel-border)')
      .attr('stroke-width', 2);

    // Add connection count indicator
    nodes.filter((d: ArcNode) => d.connections > 0)
      .append('circle')
      .attr('r', (d: ArcNode) => this.getNodeRadius(d) + 4)
      .attr('fill', 'none')
      .attr('stroke', (d: ArcNode) => this.getConnectionColor(d.connections))
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '2,2');

    // Add node labels
    nodes.append('text')
      .attr('dy', '1.5em')
      .attr('text-anchor', 'middle')
      .text((d: ArcNode) => d.name)
      .style('font-size', '10px')
      .style('fill', 'var(--vscode-foreground)')
      .style('pointer-events', 'none')
      .each(function(d: ArcNode) {
        // Rotate labels if they're too long
        const textLength = (this as SVGTextElement).getComputedTextLength();
        if (textLength > 60) {
          d3.select(this)
            .attr('transform', 'rotate(-45)')
            .attr('dx', '-0.8em')
            .attr('dy', '0.5em')
            .attr('text-anchor', 'end');
        }
      });

    // Add event handlers
    nodes
      .on('mouseenter', (event: MouseEvent, d: ArcNode) => {
        this.showNodeTooltip(event, d);
        this.highlightNode(d, links, nodes, data.links);
      })
      .on('mouseleave', () => {
        this.hideNodeTooltip();
        this.clearHighlights(links, nodes);
      })
      .on('click', (_event: MouseEvent, d: ArcNode) => {
        this.handleNodeClick(d);
      });
  }

  /**
   * Create arc path between two nodes
   */
  private createArcPath(link: ArcLink, nodePositions: Map<string, number>, height: number): string {
    const sourceId = typeof link.source === 'string' ? link.source : (link.source as any).id;
    const targetId = typeof link.target === 'string' ? link.target : (link.target as any).id;

    const x1 = nodePositions.get(sourceId) || 0;
    const x2 = nodePositions.get(targetId) || 0;
    const y = height / 2;

    // Calculate arc parameters
    const dx = Math.abs(x2 - x1);
    const radius = dx / 2;

    // Determine if arc goes above or below based on direction
    const above = x2 > x1;
    const sweep = above ? 0 : 1;

    // Create SVG arc path
    return `M ${x1},${y} A ${radius},${radius} 0 0,${sweep} ${x2},${y}`;
  }

  /**
   * Sort nodes based on criteria
   */
  private sortNodes(nodes: ArcNode[], order: 'default' | 'connections' | 'type'): ArcNode[] {
    switch (order) {
      case 'connections':
        return nodes.sort((a, b) => b.connections - a.connections);
      case 'type':
        return nodes.sort((a, b) => {
          if (a.type === b.type) return a.name.localeCompare(b.name);
          return a.type.localeCompare(b.type);
        });
      case 'default':
      default:
        return nodes.sort((a, b) => a.order - b.order);
    }
  }

  /**
   * Add control panel
   */
  private addControls(): void {
    const controls = document.createElement('div');
    controls.className = 'visualization-controls';
    controls.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 10;
    `;

    // Sort order selector
    const label = document.createElement('div');
    label.textContent = 'Sort by:';
    label.style.cssText = `
      font-size: 11px;
      color: var(--vscode-foreground);
      margin-bottom: 4px;
    `;

    const select = document.createElement('select');
    select.style.cssText = `
      padding: 4px 8px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
    `;

    const options = [
      { value: 'default', label: 'Default Order' },
      { value: 'connections', label: 'Connection Count' },
      { value: 'type', label: 'File Type' }
    ];

    options.forEach(option => {
      const opt = document.createElement('option');
      opt.value = option.value;
      opt.textContent = option.label;
      select.appendChild(opt);
    });

    select.addEventListener('change', (e) => {
      this.sortOrder = (e.target as HTMLSelectElement).value as any;
      this.render(this.data); // Re-render with new sort order
    });

    controls.appendChild(label);
    controls.appendChild(select);

    this.container.style.position = 'relative';
    this.container.appendChild(controls);
  }

  /**
   * Get node radius based on connections
   */
  private getNodeRadius(node: ArcNode): number {
    const baseRadius = 6;
    const maxRadius = 12;
    const connections = node.connections || 0;

    // Scale radius based on connections (logarithmic)
    if (connections === 0) return baseRadius;
    return Math.min(baseRadius + Math.log2(connections + 1) * 2, maxRadius);
  }

  /**
   * Get node color based on type
   */
  private getNodeColor(node: ArcNode): string {
    const typeColors: Record<string, string> = {
      component: '#3b82f6',
      service: '#10b981',
      util: '#f59e0b',
      model: '#8b5cf6',
      controller: '#ec4899',
      view: '#06b6d4',
      api: '#14b8a6'
    };

    return typeColors[node.type] || '#6b7280';
  }

  /**
   * Get connection count color
   */
  private getConnectionColor(connections: number): string {
    if (connections > 10) return '#ef4444'; // Red for highly connected
    if (connections > 5) return '#f59e0b';  // Orange
    return '#10b981'; // Green
  }

  /**
   * Get link color based on strength
   */
  private getLinkColor(link: ArcLink): string {
    if (link.strength > 5) return '#ef4444';
    if (link.strength > 2) return '#f59e0b';
    return 'var(--vscode-foreground)';
  }

  /**
   * Highlight node and connected arcs
   */
  private highlightNode(node: ArcNode, links: any, nodes: any, linkData: ArcLink[]): void {
    const connectedLinks = new Set();
    const connectedNodes = new Set([node.id]);

    linkData.forEach((link: ArcLink) => {
      const sourceId = typeof link.source === 'string' ? link.source : (link.source as any).id;
      const targetId = typeof link.target === 'string' ? link.target : (link.target as any).id;

      if (sourceId === node.id || targetId === node.id) {
        connectedLinks.add(link);
        connectedNodes.add(sourceId);
        connectedNodes.add(targetId);
      }
    });

    links.attr('stroke-opacity', (d: any) => connectedLinks.has(d) ? 0.8 : 0.1);
    links.attr('stroke-width', (d: any) => connectedLinks.has(d) ? Math.max(2, d.strength * 1.5) : Math.max(1, d.strength));

    nodes.selectAll('circle').attr('opacity', (d: any) => connectedNodes.has(d.id) ? 1 : 0.2);
    nodes.selectAll('text').attr('opacity', (d: any) => connectedNodes.has(d.id) ? 1 : 0.3);
  }

  /**
   * Highlight link and connected nodes
   */
  private highlightLink(link: any, links: any, nodes: any): void {
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;

    links.attr('stroke-opacity', (d: any) => d === link ? 0.8 : 0.1);
    links.attr('stroke-width', (d: any) => d === link ? Math.max(3, d.strength * 2) : Math.max(1, d.strength));

    nodes.selectAll('circle').attr('opacity', (d: any) =>
      d.id === sourceId || d.id === targetId ? 1 : 0.2
    );
    nodes.selectAll('text').attr('opacity', (d: any) =>
      d.id === sourceId || d.id === targetId ? 1 : 0.3
    );
  }

  /**
   * Clear all highlights
   */
  private clearHighlights(links: any, nodes: any): void {
    links.attr('stroke-opacity', 0.4);
    links.attr('stroke-width', (d: any) => Math.max(1, d.strength));
    nodes.selectAll('circle').attr('opacity', 1);
    nodes.selectAll('text').attr('opacity', 1);
  }

  /**
   * Show node tooltip
   */
  private showNodeTooltip(event: MouseEvent, node: ArcNode): void {
    const tooltip = this.getOrCreateTooltip();

    tooltip.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">
        ${node.name}
      </div>
      <div style="font-size: 11px; color: var(--vscode-descriptionForeground); margin-bottom: 8px;">
        ${node.type}
      </div>
      <div>
        Total connections: <strong>${node.connections}</strong>
      </div>
      ${node.incoming !== undefined ? `
        <div>Incoming: <strong>${node.incoming}</strong></div>
      ` : ''}
      ${node.outgoing !== undefined ? `
        <div>Outgoing: <strong>${node.outgoing}</strong></div>
      ` : ''}
      <div style="margin-top: 8px; font-size: 11px; color: var(--vscode-descriptionForeground);">
        Click for details
      </div>
    `;

    tooltip.style.display = 'block';
    tooltip.style.left = `${event.clientX + 10}px`;
    tooltip.style.top = `${event.clientY + 10}px`;

    this.adjustTooltipPosition(tooltip);
  }

  /**
   * Show link tooltip
   */
  private showLinkTooltip(event: MouseEvent, link: any): void {
    const tooltip = this.getOrCreateTooltip();

    const sourceName = typeof link.source === 'string' ? link.source : link.source.name;
    const targetName = typeof link.target === 'string' ? link.target : link.target.name;

    tooltip.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">
        Dependency
      </div>
      <div style="margin-bottom: 8px;">
        <div style="margin-bottom: 4px;">
          <span style="color: var(--vscode-descriptionForeground);">From:</span>
          <strong>${sourceName}</strong>
        </div>
        <div>
          <span style="color: var(--vscode-descriptionForeground);">To:</span>
          <strong>${targetName}</strong>
        </div>
      </div>
      <div>
        Strength: <strong>${link.strength}</strong>
      </div>
      ${link.type ? `<div>Type: <strong>${link.type}</strong></div>` : ''}
    `;

    tooltip.style.display = 'block';
    tooltip.style.left = `${event.clientX + 10}px`;
    tooltip.style.top = `${event.clientY + 10}px`;

    this.adjustTooltipPosition(tooltip);
  }

  /**
   * Hide tooltips
   */
  private hideNodeTooltip(): void {
    const tooltip = document.getElementById('arc-diagram-tooltip');
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }

  private hideLinkTooltip(): void {
    this.hideNodeTooltip();
  }

  /**
   * Get or create tooltip
   */
  private getOrCreateTooltip(): HTMLElement {
    let tooltip = document.getElementById('arc-diagram-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'arc-diagram-tooltip';
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
   * Adjust tooltip position if off screen
   */
  private adjustTooltipPosition(tooltip: HTMLElement): void {
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
   * Handle node click
   */
  private handleNodeClick(node: ArcNode): void {
    window.dispatchEvent(new CustomEvent('arc-diagram-node-click', {
      detail: {
        id: node.id,
        name: node.name,
        type: node.type,
        connections: node.connections
      }
    }));
  }

  /**
   * Clean up
   */
  override destroy(): void {
    const tooltip = document.getElementById('arc-diagram-tooltip');
    if (tooltip) {
      tooltip.remove();
    }

    const controls = this.container.querySelector('.visualization-controls');
    if (controls) {
      controls.remove();
    }

    super.destroy();
  }
}
