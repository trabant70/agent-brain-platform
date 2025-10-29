/**
 * Treemap Visualization
 * Shows hierarchical data as nested rectangles sized by issue count
 *
 * Purpose: Visual hierarchy of categories and their relative sizes
 * Technique: d3.treemap() with hierarchical layout
 */

import { BaseVisualization, VisualizationConfig } from './BaseVisualization';

export interface TreemapNode {
  name: string;
  value?: number;         // Issue count (leaf nodes)
  severity?: 'critical' | 'high' | 'medium' | 'low';
  children?: TreemapNode[];
  categoryId?: string;
  description?: string;
}

export interface TreemapData {
  name: string;
  children: TreemapNode[];
}

export class TreemapVisualization extends BaseVisualization {
  private currentRoot: any = null;  // Current zoom level

  constructor(container: HTMLElement, config: VisualizationConfig = {}) {
    super(container, config);
  }

  /**
   * Render treemap
   */
  protected async renderContent(): Promise<void> {
    const d3 = (window as any).d3;
    if (!this.svg) return;

    const data: TreemapData = this.data;
    const width = this.getContentWidth();
    const height = this.getContentHeight();

    // Create hierarchy
    const root = d3.hierarchy(data)
      .sum((d: TreemapNode) => d.value || 0)
      .sort((a: any, b: any) => (b.value || 0) - (a.value || 0));

    // Create treemap layout
    const treemap = d3.treemap()
      .size([width, height])
      .padding(2)
      .round(true);

    treemap(root);

    // Store current root
    if (!this.currentRoot) {
      this.currentRoot = root;
    }

    // Create main group
    const g = this.svg!.select('.visualization-content');

    // Render cells
    const cells = g.selectAll('g')
      .data(root.descendants())
      .join('g')
      .attr('transform', (d: any) => `translate(${d.x0},${d.y0})`);

    // Add rectangles
    cells.append('rect')
      .attr('width', (d: any) => Math.max(0, d.x1 - d.x0))
      .attr('height', (d: any) => Math.max(0, d.y1 - d.y0))
      .attr('fill', (d: any) => this.getCellColor(d))
      .attr('stroke', 'var(--vscode-panel-border)')
      .attr('stroke-width', 1)
      .style('cursor', (d: any) => d.children ? 'pointer' : 'default')
      .on('click', (_event: MouseEvent, d: any) => {
        if (d.children) {
          this.zoomToNode(d, cells);
        } else {
          this.handleLeafClick(d);
        }
      })
      .on('mouseenter', (event: MouseEvent, d: any) => {
        this.showTooltip(event, d);
      })
      .on('mouseleave', () => {
        this.hideTooltip();
      });

    // Add labels
    cells.append('text')
      .attr('x', 4)
      .attr('y', 16)
      .text((d: any) => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        // Only show label if rectangle is large enough
        return (width > 60 && height > 20) ? d.data.name : '';
      })
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', 'var(--vscode-editor-foreground)')
      .style('pointer-events', 'none');

    // Add value labels for leaf nodes
    cells.filter((d: any) => !d.children)
      .append('text')
      .attr('x', 4)
      .attr('y', 32)
      .text((d: any) => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        return (width > 60 && height > 40) ? `${d.value} issues` : '';
      })
      .attr('font-size', '10px')
      .attr('fill', 'var(--vscode-descriptionForeground)')
      .style('pointer-events', 'none');

    // Render breadcrumbs
    this.renderBreadcrumbs();
  }

  /**
   * Get cell color based on severity and depth
   */
  private getCellColor(d: any): string {
    // Root node
    if (d.depth === 0) {
      return 'var(--vscode-editor-background)';
    }

    // Parent nodes (categories) - use muted colors
    if (d.children) {
      return 'var(--vscode-editorWidget-background)';
    }

    // Leaf nodes (actual issues) - color by severity
    if (d.data.severity) {
      const severityColors: Record<string, string> = {
        critical: '#ef4444',
        high: '#f97316',
        medium: '#f59e0b',
        low: '#84cc16'
      };
      return severityColors[d.data.severity] || '#6b7280';
    }

    // Default color based on depth
    const colorScale = this.getColorScale();
    return colorScale(d.depth);
  }

  /**
   * Zoom to clicked node
   */
  private zoomToNode(node: any, cells: any): void {
    const d3 = (window as any).d3;
    this.currentRoot = node;

    // Update breadcrumbs
    this.updateBreadcrumbs(node);

    // Calculate new coordinates relative to zoomed node
    const x = d3.scaleLinear()
      .domain([node.x0, node.x1])
      .range([0, this.getContentWidth()]);

    const y = d3.scaleLinear()
      .domain([node.y0, node.y1])
      .range([0, this.getContentHeight()]);

    // Transition cells
    cells.transition()
      .duration(750)
      .attr('transform', (d: any) => `translate(${x(d.x0)},${y(d.y0)})`)
      .select('rect')
      .attr('width', (d: any) => Math.max(0, x(d.x1) - x(d.x0)))
      .attr('height', (d: any) => Math.max(0, y(d.y1) - y(d.y0)));

    // Update labels
    cells.selectAll('text')
      .transition()
      .duration(750)
      .attr('opacity', (d: any) => {
        // Only show labels for visible nodes
        return this.isVisible(d, node) ? 1 : 0;
      });
  }

  /**
   * Check if node is visible in current zoom level
   */
  private isVisible(d: any, current: any): boolean {
    return d.depth >= current.depth;
  }

  /**
   * Handle leaf node click - dispatch event
   */
  private handleLeafClick(node: any): void {
    window.dispatchEvent(new CustomEvent('treemap-leaf-click', {
      detail: {
        name: node.data.name,
        value: node.value,
        severity: node.data.severity,
        categoryId: node.data.categoryId,
        description: node.data.description
      }
    }));
  }

  /**
   * Show tooltip
   */
  private showTooltip(event: MouseEvent, node: any): void {
    const tooltip = this.getOrCreateTooltip();

    const isLeaf = !node.children;
    const percentage = ((node.value / node.parent.value) * 100).toFixed(1);

    tooltip.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">
        ${node.data.name}
      </div>
      ${isLeaf ? `
        <div style="font-size: 11px; color: var(--vscode-descriptionForeground); margin-bottom: 4px;">
          ${node.data.severity ? node.data.severity.toUpperCase() : 'Issue'}
        </div>
      ` : ''}
      <div style="margin-bottom: 4px;">
        Issues: <strong>${node.value}</strong>
      </div>
      ${node.parent ? `
        <div style="font-size: 11px; color: var(--vscode-descriptionForeground);">
          ${percentage}% of parent
        </div>
      ` : ''}
      ${node.data.description ? `
        <div style="margin-top: 8px; font-size: 11px; padding-top: 8px; border-top: 1px solid var(--vscode-panel-border);">
          ${node.data.description}
        </div>
      ` : ''}
      ${isLeaf ? `
        <div style="margin-top: 8px; font-size: 11px; color: var(--vscode-descriptionForeground);">
          Click for details
        </div>
      ` : `
        <div style="margin-top: 8px; font-size: 11px; color: var(--vscode-descriptionForeground);">
          Click to zoom in
        </div>
      `}
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
  private hideTooltip(): void {
    const tooltip = document.getElementById('treemap-tooltip');
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }

  /**
   * Get or create tooltip
   */
  private getOrCreateTooltip(): HTMLElement {
    let tooltip = document.getElementById('treemap-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'treemap-tooltip';
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
   * Render breadcrumbs
   */
  private renderBreadcrumbs(): void {
    const breadcrumbContainer = this.container.parentElement?.querySelector('.treemap-breadcrumbs');
    if (!breadcrumbContainer) {
      const container = document.createElement('div');
      container.className = 'treemap-breadcrumbs';
      container.style.cssText = `
        padding: 8px 0;
        font-size: 12px;
        color: var(--vscode-foreground);
        border-bottom: 1px solid var(--vscode-panel-border);
        margin-bottom: 8px;
      `;
      this.container.parentElement?.insertBefore(container, this.container);
    }
  }

  /**
   * Update breadcrumbs
   */
  private updateBreadcrumbs(node: any): void {
    const breadcrumbContainer = this.container.parentElement?.querySelector('.treemap-breadcrumbs');
    if (!breadcrumbContainer) return;

    // Build path from root to current node
    const path: any[] = [];
    let current = node;
    while (current) {
      path.unshift(current);
      current = current.parent;
    }

    // Render breadcrumbs
    const html = path.map((n, i) => {
      const isLast = i === path.length - 1;
      const separator = isLast ? '' : ' <span style="color: var(--vscode-descriptionForeground)">›</span> ';
      const style = isLast
        ? 'font-weight: bold;'
        : 'cursor: pointer; text-decoration: underline;';

      return `<span style="${style}" data-depth="${n.depth}">${n.data.name}</span>${separator}`;
    }).join('');

    breadcrumbContainer.innerHTML = html;

    // Add click handlers
    breadcrumbContainer.querySelectorAll('span[data-depth]').forEach((span, index) => {
      span.addEventListener('click', () => {
        const targetNode = path[index];
        const cells = this.svg!.select('.visualization-content').selectAll('g');
        this.zoomToNode(targetNode, cells);
      });
    });
  }

  /**
   * Clean up
   */
  override destroy(): void {
    // Remove breadcrumbs
    const breadcrumbs = this.container.parentElement?.querySelector('.treemap-breadcrumbs');
    if (breadcrumbs) {
      breadcrumbs.remove();
    }

    // Remove tooltip
    const tooltip = document.getElementById('treemap-tooltip');
    if (tooltip) {
      tooltip.remove();
    }

    super.destroy();
  }
}
