/**
 * Flame Graph
 * Hierarchical visualization for performance profiling and call stacks
 *
 * Purpose: Show time/resource distribution across hierarchical structures
 * Technique: Stacked bars with zoom/navigation and color coding
 */

import { BaseVisualization, VisualizationConfig } from './BaseVisualization';

export interface FlameNode {
  name: string;
  value: number;
  children?: FlameNode[];
  category?: string;
  details?: Record<string, any>;
}

export interface FlameGraphData {
  root: FlameNode;
  unit?: string;
  colorScheme?: 'category' | 'gradient' | 'random';
}

interface LayoutNode extends FlameNode {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  depth: number;
  parent?: LayoutNode;
}

export class FlameGraph extends BaseVisualization {
  private root: LayoutNode | null = null;
  private currentRoot: LayoutNode | null = null;
  private xScale: any = null;
  private yScale: any = null;
  private colorMap: Map<string, string> = new Map();
  private searchTerm: string = '';
  private maxDepth: number = 0;

  constructor(container: HTMLElement, config: VisualizationConfig = {}) {
    super(container, config);
  }

  /**
   * Render flame graph
   */
  protected async renderContent(): Promise<void> {
    const d3 = (window as any).d3;
    if (!this.svg) return;

    const data: FlameGraphData = this.data;
    const width = this.getContentWidth();
    const height = this.getContentHeight();

    // Layout the flame graph
    this.root = this.layoutFlameGraph(data.root, width);
    this.currentRoot = this.root;

    // Create scales
    this.xScale = d3.scaleLinear()
      .domain([this.root.x0, this.root.x1])
      .range([0, width]);

    this.yScale = d3.scaleLinear()
      .domain([0, this.maxDepth + 1])
      .range([0, height - 60]); // Leave space for controls

    // Build color map
    this.buildColorMap(data.root, data.colorScheme || 'category');

    const g = this.svg!.select('.visualization-content');

    // Render flame graph
    this.renderFlames(g, this.root, width, height);

    // Add controls
    this.addControls();

    // Add breadcrumb navigation
    this.addBreadcrumb([this.root]);
  }

  /**
   * Layout flame graph nodes
   */
  private layoutFlameGraph(
    node: FlameNode,
    totalWidth: number,
    x0: number = 0,
    depth: number = 0,
    parent?: LayoutNode
  ): LayoutNode {
    this.maxDepth = Math.max(this.maxDepth, depth);

    const layoutNode: LayoutNode = {
      ...node,
      x0,
      x1: x0 + totalWidth,
      y0: depth,
      y1: depth + 1,
      depth,
      parent
    };

    if (node.children && node.children.length > 0) {
      const totalChildValue = node.children.reduce((sum, child) => sum + child.value, 0);
      let currentX = x0;

      const layoutChildren: FlameNode[] = [];
      for (const child of node.children) {
        const childWidth = (child.value / totalChildValue) * totalWidth;
        const layoutChild = this.layoutFlameGraph(child, childWidth, currentX, depth + 1, layoutNode);
        layoutChildren.push(layoutChild);
        currentX += childWidth;
      }

      layoutNode.children = layoutChildren;
    }

    return layoutNode;
  }

  /**
   * Render flame bars
   */
  private renderFlames(
    g: any,
    root: LayoutNode,
    width: number,
    height: number
  ): void {
    const d3 = (window as any).d3;

    // Collect all nodes
    const nodes = this.collectNodes(root);

    const bars = g.selectAll('g.flame-node')
      .data(nodes, (d: LayoutNode) => d.name + '-' + d.depth + '-' + d.x0)
      .join('g')
      .attr('class', 'flame-node')
      .attr('transform', (d: LayoutNode) => {
        const x = this.xScale(d.x0);
        const y = this.yScale(d.y0);
        return `translate(${x},${y})`;
      });

    // Bars
    bars.append('rect')
      .attr('width', (d: LayoutNode) => Math.max(0, this.xScale(d.x1) - this.xScale(d.x0) - 1))
      .attr('height', this.yScale(1) - 2)
      .attr('fill', (d: LayoutNode) => this.getNodeColor(d))
      .attr('stroke', 'var(--vscode-panel-border)')
      .attr('stroke-width', 0.5)
      .attr('opacity', (d: LayoutNode) => this.getNodeOpacity(d))
      .style('cursor', 'pointer')
      .on('mouseenter', (event: MouseEvent, d: LayoutNode) => {
        this.showFlameTooltip(event, d);
        d3.select(event.currentTarget).attr('opacity', 1);
      })
      .on('mouseleave', (event: MouseEvent, d: LayoutNode) => {
        this.hideFlameTooltip();
        d3.select(event.currentTarget).attr('opacity', this.getNodeOpacity(d));
      })
      .on('click', (event: MouseEvent, d: LayoutNode) => {
        event.stopPropagation();
        this.zoomToNode(d);
      });

    // Labels
    bars.append('text')
      .attr('x', 4)
      .attr('y', (this.yScale(1) - 2) / 2)
      .attr('dy', '0.35em')
      .style('font-size', '11px')
      .style('fill', 'var(--vscode-editor-background)')
      .style('pointer-events', 'none')
      .text((d: LayoutNode) => {
        const width = this.xScale(d.x1) - this.xScale(d.x0);
        if (width < 40) return '';
        const maxChars = Math.floor(width / 7);
        return d.name.length > maxChars ? d.name.slice(0, maxChars - 3) + '...' : d.name;
      });

    // Value labels
    bars.append('text')
      .attr('x', (d: LayoutNode) => Math.max(0, this.xScale(d.x1) - this.xScale(d.x0) - 8))
      .attr('y', (this.yScale(1) - 2) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .style('font-size', '10px')
      .style('fill', 'var(--vscode-editor-background)')
      .style('pointer-events', 'none')
      .text((d: LayoutNode) => {
        const width = this.xScale(d.x1) - this.xScale(d.x0);
        if (width < 60) return '';
        return d.value.toFixed(0);
      });
  }

  /**
   * Collect all visible nodes
   */
  private collectNodes(node: LayoutNode, nodes: LayoutNode[] = []): LayoutNode[] {
    nodes.push(node);
    if (node.children) {
      for (const child of node.children as LayoutNode[]) {
        this.collectNodes(child, nodes);
      }
    }
    return nodes;
  }

  /**
   * Build color map for nodes
   */
  private buildColorMap(node: FlameNode, scheme: string): void {
    const d3 = (window as any).d3;

    if (scheme === 'category') {
      const categories = new Set<string>();
      this.collectCategories(node, categories);
      const colorScale = d3.scaleOrdinal()
        .domain(Array.from(categories))
        .range(d3.schemeCategory10);

      categories.forEach(cat => {
        this.colorMap.set(cat, colorScale(cat));
      });
    } else if (scheme === 'gradient') {
      // Use a gradient based on depth
      const colorScale = d3.scaleSequential()
        .domain([0, 10])
        .interpolator(d3.interpolateViridis);

      for (let i = 0; i <= 10; i++) {
        this.colorMap.set(`depth-${i}`, colorScale(i));
      }
    }
  }

  /**
   * Collect all categories
   */
  private collectCategories(node: FlameNode, categories: Set<string>): void {
    if (node.category) {
      categories.add(node.category);
    }
    if (node.children) {
      for (const child of node.children) {
        this.collectCategories(child, categories);
      }
    }
  }

  /**
   * Get node color
   */
  private getNodeColor(node: LayoutNode): string {
    const data: FlameGraphData = this.data;
    const scheme = data.colorScheme || 'category';

    if (scheme === 'category' && node.category) {
      return this.colorMap.get(node.category) || '#3b82f6';
    } else if (scheme === 'gradient') {
      return this.colorMap.get(`depth-${Math.min(10, node.depth)}`) || '#3b82f6';
    } else {
      // Random but consistent color based on name
      const hash = this.hashCode(node.name);
      const hue = hash % 360;
      return `hsl(${hue}, 70%, 50%)`;
    }
  }

  /**
   * Get node opacity based on search
   */
  private getNodeOpacity(node: LayoutNode): number {
    if (!this.searchTerm) return 0.9;

    const matches = node.name.toLowerCase().includes(this.searchTerm.toLowerCase());
    return matches ? 1 : 0.3;
  }

  /**
   * Hash code for consistent colors
   */
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Zoom to node
   */
  private zoomToNode(node: LayoutNode): void {
    const d3 = (window as any).d3;

    this.currentRoot = node;

    // Update scales
    this.xScale.domain([node.x0, node.x1]);

    const g = this.svg!.select('.visualization-content');
    const bars = g.selectAll('g.flame-node');

    // Animate transition
    const t = d3.transition().duration(750);

    (bars.transition(t) as any)
      .attr('transform', (d: LayoutNode) => {
        const x = this.xScale(d.x0);
        const y = this.yScale(d.y0 - node.y0);
        return `translate(${x},${y})`;
      })
      .style('opacity', (d: LayoutNode) => {
        // Hide nodes outside the zoomed range
        if (d.y0 < node.y0) return 0;
        return this.getNodeOpacity(d);
      });

    (bars.select('rect')
      .transition(t) as any)
      .attr('width', (d: LayoutNode) => Math.max(0, this.xScale(d.x1) - this.xScale(d.x0) - 1));

    (bars.select('text')
      .transition(t) as any)
      .text((d: LayoutNode) => {
        const width = this.xScale(d.x1) - this.xScale(d.x0);
        if (width < 40) return '';
        const maxChars = Math.floor(width / 7);
        return d.name.length > maxChars ? d.name.slice(0, maxChars - 3) + '...' : d.name;
      });

    // Update breadcrumb
    this.updateBreadcrumb(node);
  }

  /**
   * Add controls
   */
  private addControls(): void {
    const controls = document.createElement('div');
    controls.className = 'flame-controls';
    controls.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      display: flex;
      gap: 8px;
      z-index: 10;
    `;

    // Search input
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search...';
    searchInput.style.cssText = `
      padding: 4px 8px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      font-size: 12px;
    `;

    searchInput.addEventListener('input', (e) => {
      this.searchTerm = (e.target as HTMLInputElement).value;
      this.updateSearch();
    });

    // Reset button
    const resetButton = document.createElement('button');
    resetButton.textContent = 'Reset Zoom';
    resetButton.style.cssText = `
      padding: 4px 12px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
    `;

    resetButton.addEventListener('click', () => {
      if (this.root) {
        this.zoomToNode(this.root);
      }
    });

    controls.appendChild(searchInput);
    controls.appendChild(resetButton);

    this.container.style.position = 'relative';
    this.container.appendChild(controls);
  }

  /**
   * Update search highlighting
   */
  private updateSearch(): void {
    const d3 = (window as any).d3;
    const g = this.svg!.select('.visualization-content');

    (g.selectAll('g.flame-node rect') as any)
      .attr('opacity', (d: LayoutNode) => this.getNodeOpacity(d));
  }

  /**
   * Add breadcrumb navigation
   */
  private addBreadcrumb(path: LayoutNode[]): void {
    const breadcrumb = document.createElement('div');
    breadcrumb.className = 'flame-breadcrumb';
    breadcrumb.style.cssText = `
      position: absolute;
      bottom: 10px;
      left: 10px;
      right: 10px;
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      font-size: 11px;
      color: var(--vscode-foreground);
      z-index: 10;
    `;

    this.container.appendChild(breadcrumb);
    this.updateBreadcrumb(path[path.length - 1]);
  }

  /**
   * Update breadcrumb path
   */
  private updateBreadcrumb(node: LayoutNode): void {
    const breadcrumb = this.container.querySelector('.flame-breadcrumb');
    if (!breadcrumb) return;

    const path: LayoutNode[] = [];
    let current: LayoutNode | undefined = node;
    while (current) {
      path.unshift(current);
      current = current.parent;
    }

    breadcrumb.innerHTML = path.map((n, i) => {
      const isLast = i === path.length - 1;
      const span = `<span style="
        padding: 2px 6px;
        background: ${isLast ? 'var(--vscode-button-background)' : 'var(--vscode-input-background)'};
        color: ${isLast ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)'};
        border-radius: 3px;
        cursor: ${isLast ? 'default' : 'pointer'};
      " data-index="${i}">${n.name}</span>`;
      return span;
    }).join(' <span style="opacity: 0.5;">›</span> ');

    // Add click handlers
    breadcrumb.querySelectorAll('span[data-index]').forEach((span) => {
      span.addEventListener('click', () => {
        const index = parseInt((span as HTMLElement).dataset.index || '0');
        this.zoomToNode(path[index]);
      });
    });
  }

  /**
   * Show flame tooltip
   */
  private showFlameTooltip(event: MouseEvent, node: LayoutNode): void {
    const data: FlameGraphData = this.data;
    const tooltip = this.getOrCreateTooltip();

    const percentage = this.root ? ((node.value / this.root.value) * 100).toFixed(2) : '0';
    const selfPercentage = node.children
      ? ((node.value - node.children.reduce((sum, c) => sum + c.value, 0)) / (this.root?.value || 1) * 100).toFixed(2)
      : percentage;

    let html = `
      <div style="font-weight: bold; margin-bottom: 8px;">
        ${node.name}
      </div>
      <div style="margin-bottom: 4px;">
        Total: <strong>${node.value.toFixed(2)} ${data.unit || 'ms'}</strong> (${percentage}%)
      </div>
      <div style="margin-bottom: 4px;">
        Self: <strong>${selfPercentage}%</strong>
      </div>
      <div style="margin-bottom: 4px;">
        Depth: <strong>${node.depth}</strong>
      </div>
    `;

    if (node.category) {
      html += `
        <div style="margin-bottom: 4px;">
          Category: <strong>${node.category}</strong>
        </div>
      `;
    }

    if (node.children && node.children.length > 0) {
      html += `
        <div style="margin-bottom: 4px;">
          Children: <strong>${node.children.length}</strong>
        </div>
      `;
    }

    if (node.details) {
      html += '<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--vscode-panel-border);">';
      Object.entries(node.details).forEach(([key, value]) => {
        html += `<div style="font-size: 10px;">${key}: <strong>${value}</strong></div>`;
      });
      html += '</div>';
    }

    html += `
      <div style="margin-top: 8px; font-size: 11px; color: var(--vscode-descriptionForeground);">
        Click to zoom
      </div>
    `;

    tooltip.innerHTML = html;
    tooltip.style.display = 'block';
    tooltip.style.left = `${event.clientX + 10}px`;
    tooltip.style.top = `${event.clientY + 10}px`;

    this.adjustTooltipPosition(tooltip);
  }

  /**
   * Hide tooltip
   */
  private hideFlameTooltip(): void {
    const tooltip = document.getElementById('flame-graph-tooltip');
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }

  /**
   * Get or create tooltip
   */
  private getOrCreateTooltip(): HTMLElement {
    let tooltip = document.getElementById('flame-graph-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'flame-graph-tooltip';
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
   * Adjust tooltip position
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
   * Clean up
   */
  override destroy(): void {
    const tooltip = document.getElementById('flame-graph-tooltip');
    if (tooltip) {
      tooltip.remove();
    }

    const controls = this.container.querySelector('.flame-controls');
    if (controls) {
      controls.remove();
    }

    const breadcrumb = this.container.querySelector('.flame-breadcrumb');
    if (breadcrumb) {
      breadcrumb.remove();
    }

    this.root = null;
    this.currentRoot = null;
    this.xScale = null;
    this.yScale = null;
    this.colorMap.clear();
    this.searchTerm = '';
    this.maxDepth = 0;

    super.destroy();
  }
}
