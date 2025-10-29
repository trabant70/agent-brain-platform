/**
 * Dependency Force Graph
 * Shows import/export relationships between files using force-directed layout
 *
 * Purpose: Help users understand component coupling and architecture
 * Technique: d3.forceSimulation() with multiple forces
 */

import { BaseVisualization, VisualizationConfig } from './BaseVisualization';

export interface DependencyNode {
  id: string;            // File path
  label: string;         // File name
  type: 'component' | 'service' | 'utility' | 'config' | 'test' | 'other';
  issueCount: number;
  inDegree: number;      // How many files depend on this
  outDegree: number;     // How many files this depends on
  group?: number;        // For clustering
}

export interface DependencyLink {
  source: string | DependencyNode;
  target: string | DependencyNode;
  type: 'import' | 'export' | 'both';
  strength: number;      // How many times imported
}

export interface DependencyGraphData {
  nodes: DependencyNode[];
  links: DependencyLink[];
}

export class DependencyGraph extends BaseVisualization {
  private simulation: any = null;
  private nodeElements: any = null;
  private linkElements: any = null;
  private labelElements: any = null;
  private selectedNode: DependencyNode | null = null;

  constructor(container: HTMLElement, config: VisualizationConfig = {}) {
    super(container, config);
  }

  /**
   * Render dependency graph
   */
  protected async renderContent(): Promise<void> {
    const d3 = (window as any).d3;
    if (!this.svg) return;

    const data: DependencyGraphData = this.data;
    const width = this.getContentWidth();
    const height = this.getContentHeight();

    // Create main group
    const g = this.svg!.select('.visualization-content');

    // Create zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event: any) => {
        g.attr('transform', event.transform);
      });

    this.svg!.call(zoom);

    // Create force simulation
    this.simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.links)
        .id((d: any) => d.id)
        .distance((d: any) => 100 / (d.strength || 1))
        .strength((d: any) => Math.min(d.strength || 0.5, 1))
      )
      .force('charge', d3.forceManyBody()
        .strength(-300)
      )
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide()
        .radius((d: any) => this.getNodeRadius(d) + 5)
      )
      .force('x', d3.forceX(width / 2).strength(0.1))
      .force('y', d3.forceY(height / 2).strength(0.1));

    // Create arrow marker for directed edges
    const defs = this.svg!.append('defs');

    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .append('path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', 'var(--vscode-foreground)')
      .style('opacity', 0.4);

    // Render links
    this.linkElements = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(data.links)
      .join('line')
      .attr('stroke', (d: any) => this.getLinkColor(d))
      .attr('stroke-width', (d: any) => Math.min(d.strength || 1, 5))
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', 'url(#arrowhead)');

    // Render nodes
    this.nodeElements = g.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(data.nodes)
      .join('circle')
      .attr('r', (d: any) => this.getNodeRadius(d))
      .attr('fill', (d: any) => this.getNodeColor(d))
      .attr('stroke', 'var(--vscode-panel-border)')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .call(this.createDragBehavior(d3, this.simulation));

    // Render labels
    this.labelElements = g.append('g')
      .attr('class', 'labels')
      .selectAll('text')
      .data(data.nodes)
      .join('text')
      .text((d: any) => d.label)
      .attr('font-size', '10px')
      .attr('fill', 'var(--vscode-foreground)')
      .attr('text-anchor', 'middle')
      .attr('dy', (d: any) => this.getNodeRadius(d) + 12)
      .style('pointer-events', 'none');

    // Add interactions
    this.addNodeInteractions();

    // Update positions on simulation tick
    this.simulation.on('tick', () => {
      this.linkElements
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      this.nodeElements
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y);

      this.labelElements
        .attr('x', (d: any) => d.x)
        .attr('y', (d: any) => d.y);
    });

    // Render legend and controls
    this.renderControls();
  }

  /**
   * Create drag behavior for nodes
   */
  private createDragBehavior(d3: any, simulation: any): any {
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
  }

  /**
   * Add node interactions (click, hover)
   */
  private addNodeInteractions(): void {
    this.nodeElements.on('click', (_event: MouseEvent, d: DependencyNode) => {
      this.handleNodeClick(d);
    });

    this.nodeElements.on('mouseenter', (event: MouseEvent, d: DependencyNode) => {
      this.showNodeTooltip(event, d);
      this.highlightConnections(d);
    });

    this.nodeElements.on('mouseleave', () => {
      this.hideNodeTooltip();
      this.clearHighlights();
    });
  }

  /**
   * Handle node click - select and dispatch event
   */
  private handleNodeClick(node: DependencyNode): void {
    this.selectedNode = node;

    // Highlight this node and its connections
    this.highlightConnections(node, true);

    // Dispatch custom event for file navigation
    window.dispatchEvent(new CustomEvent('dependency-node-click', {
      detail: {
        filePath: node.id,
        fileName: node.label,
        type: node.type,
        issueCount: node.issueCount
      }
    }));
  }

  /**
   * Highlight connections to/from a node
   */
  private highlightConnections(node: DependencyNode, permanent: boolean = false): void {
    const connectedNodeIds = new Set<string>();
    connectedNodeIds.add(node.id);

    // Find connected nodes
    this.linkElements.each((link: DependencyLink) => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;

      if (sourceId === node.id) {
        connectedNodeIds.add(targetId);
      }
      if (targetId === node.id) {
        connectedNodeIds.add(sourceId);
      }
    });

    // Fade non-connected elements
    this.nodeElements
      .style('opacity', (d: DependencyNode) =>
        connectedNodeIds.has(d.id) ? 1 : 0.2
      )
      .attr('stroke-width', (d: DependencyNode) =>
        d.id === node.id ? 4 : (connectedNodeIds.has(d.id) ? 2 : 1)
      );

    this.linkElements
      .style('opacity', (link: DependencyLink) => {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;
        return (sourceId === node.id || targetId === node.id) ? 1 : 0.1;
      });

    this.labelElements
      .style('opacity', (d: DependencyNode) =>
        connectedNodeIds.has(d.id) ? 1 : 0.2
      );
  }

  /**
   * Clear highlights
   */
  private clearHighlights(): void {
    if (this.selectedNode) {
      // Don't clear if a node is selected
      return;
    }

    this.nodeElements
      .style('opacity', 1)
      .attr('stroke-width', 2);

    this.linkElements
      .style('opacity', 0.6);

    this.labelElements
      .style('opacity', 1);
  }

  /**
   * Get node radius based on degree
   */
  private getNodeRadius(node: DependencyNode): number {
    const totalDegree = node.inDegree + node.outDegree;
    const baseRadius = 8;
    const maxRadius = 20;

    // Scale based on degree (more connections = larger node)
    return Math.min(baseRadius + totalDegree * 1.5, maxRadius);
  }

  /**
   * Get node color based on type and issues
   */
  private getNodeColor(node: DependencyNode): string {
    // If node has critical issues, show red
    if (node.issueCount > 10) {
      return '#ef4444';
    } else if (node.issueCount > 5) {
      return '#f97316';
    } else if (node.issueCount > 0) {
      return '#f59e0b';
    }

    // Otherwise color by type
    const typeColors: Record<string, string> = {
      component: '#3b82f6',
      service: '#10b981',
      utility: '#8b5cf6',
      config: '#f59e0b',
      test: '#6b7280',
      other: '#9ca3af'
    };

    return typeColors[node.type] || typeColors.other;
  }

  /**
   * Get link color based on type
   */
  private getLinkColor(link: DependencyLink): string {
    const colors: Record<string, string> = {
      import: 'var(--vscode-foreground)',
      export: 'var(--vscode-descriptionForeground)',
      both: 'var(--vscode-textLink-foreground)'
    };

    return colors[link.type] || colors.import;
  }

  /**
   * Show tooltip for node
   */
  private showNodeTooltip(event: MouseEvent, node: DependencyNode): void {
    const tooltip = this.getOrCreateTooltip();

    tooltip.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">
        ${node.label}
      </div>
      <div style="font-size: 11px; color: var(--vscode-descriptionForeground); margin-bottom: 8px;">
        ${node.type}
      </div>
      <div style="margin-bottom: 8px;">
        <div>Dependencies: <strong>${node.outDegree}</strong></div>
        <div>Dependents: <strong>${node.inDegree}</strong></div>
        <div>Issues: <strong style="color: ${node.issueCount > 0 ? '#ef4444' : 'inherit'}">${node.issueCount}</strong></div>
      </div>
      <div style="font-size: 11px; color: var(--vscode-descriptionForeground);">
        Click to highlight connections
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
   * Hide tooltip
   */
  private hideNodeTooltip(): void {
    const tooltip = document.getElementById('dependency-tooltip');
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }

  /**
   * Get or create tooltip element
   */
  private getOrCreateTooltip(): HTMLElement {
    let tooltip = document.getElementById('dependency-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'dependency-tooltip';
      tooltip.style.cssText = `
        position: fixed;
        max-width: 250px;
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
   * Render controls panel
   */
  private renderControls(): void {
    const controlsContainer = this.container.parentElement?.querySelector('.dependency-controls');
    if (controlsContainer) return; // Already rendered

    const controls = document.createElement('div');
    controls.className = 'dependency-controls';
    controls.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: var(--vscode-editorWidget-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      padding: 8px;
      font-size: 11px;
      z-index: 100;
    `;

    controls.innerHTML = `
      <div style="margin-bottom: 8px; font-weight: bold;">Controls</div>
      <div style="margin-bottom: 4px;">
        <button id="reset-view-btn" style="padding: 4px 8px; font-size: 11px;">Reset View</button>
      </div>
      <div style="margin-bottom: 8px;">
        <label style="display: flex; align-items: center;">
          <input type="checkbox" id="show-labels-check" checked style="margin-right: 4px;">
          Show Labels
        </label>
      </div>
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--vscode-panel-border);">
        <div style="font-weight: bold; margin-bottom: 4px;">Legend</div>
        <div style="display: flex; align-items: center; margin-bottom: 2px;">
          <div style="width: 12px; height: 12px; border-radius: 50%; background: #3b82f6; margin-right: 6px;"></div>
          <span>Component</span>
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 2px;">
          <div style="width: 12px; height: 12px; border-radius: 50%; background: #10b981; margin-right: 6px;"></div>
          <span>Service</span>
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 2px;">
          <div style="width: 12px; height: 12px; border-radius: 50%; background: #8b5cf6; margin-right: 6px;"></div>
          <span>Utility</span>
        </div>
        <div style="display: flex; align-items: center;">
          <div style="width: 12px; height: 12px; border-radius: 50%; background: #ef4444; margin-right: 6px;"></div>
          <span>Has Issues</span>
        </div>
      </div>
    `;

    this.container.parentElement?.appendChild(controls);

    // Add event listeners
    const resetBtn = controls.querySelector('#reset-view-btn');
    resetBtn?.addEventListener('click', () => {
      this.selectedNode = null;
      this.clearHighlights();
      if (this.simulation) {
        this.simulation.alpha(1).restart();
      }
      // Reset zoom
      const d3 = (window as any).d3;
      if (this.svg) {
        this.svg.transition().duration(750).call(
          d3.zoom().transform,
          d3.zoomIdentity
        );
      }
    });

    const labelsCheck = controls.querySelector('#show-labels-check') as HTMLInputElement;
    labelsCheck?.addEventListener('change', (e: Event) => {
      const show = (e.target as HTMLInputElement).checked;
      this.labelElements?.style('display', show ? 'block' : 'none');
    });
  }

  /**
   * Clean up
   */
  override destroy(): void {
    // Stop simulation
    if (this.simulation) {
      this.simulation.stop();
      this.simulation = null;
    }

    // Remove controls
    const controls = this.container.parentElement?.querySelector('.dependency-controls');
    if (controls) {
      controls.remove();
    }

    // Remove tooltip
    const tooltip = document.getElementById('dependency-tooltip');
    if (tooltip) {
      tooltip.remove();
    }

    super.destroy();
  }
}
