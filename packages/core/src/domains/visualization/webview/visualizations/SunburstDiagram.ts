/**
 * Sunburst Diagram
 * Shows hierarchical directory/file structure with color-coded health status
 *
 * Purpose: Help users understand project architecture at a glance
 * Technique: d3.partition() for layout, d3.arc() for rendering
 */

import { BaseVisualization, VisualizationConfig } from './BaseVisualization';

export interface SunburstNode {
  name: string;           // File or directory name
  path: string;           // Full path
  children?: SunburstNode[];
  value?: number;         // Issue count or LOC
  issueCount: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  type: 'directory' | 'file';
}

export class SunburstDiagram extends BaseVisualization {
  private currentRoot: any = null;  // Current zoom root
  private breadcrumbs: any[] = [];  // Breadcrumb trail

  constructor(container: HTMLElement, config: VisualizationConfig = {}) {
    super(container, config);
  }

  /**
   * Render sunburst diagram
   */
  protected async renderContent(): Promise<void> {
    const d3 = (window as any).d3;
    if (!this.svg) return;

    const data: SunburstNode = this.data;
    const width = this.getContentWidth();
    const height = this.getContentHeight();
    const radius = Math.min(width, height) / 2;

    // Create hierarchy
    const root = d3.hierarchy(data)
      .sum((d: SunburstNode) => d.value || d.issueCount || 1)
      .sort((a: any, b: any) => (b.value || 0) - (a.value || 0));

    // Create partition layout
    const partition = d3.partition()
      .size([2 * Math.PI, radius]);

    partition(root);

    // Arc generator
    const arc = d3.arc()
      .startAngle((d: any) => d.x0)
      .endAngle((d: any) => d.x1)
      .padAngle((d: any) => Math.min((d.x1 - d.x0) / 2, 0.005))
      .padRadius(radius / 2)
      .innerRadius((d: any) => d.y0)
      .outerRadius((d: any) => d.y1 - 1);

    // Get SVG content group
    const g = this.svg!.select('.visualization-content')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    // Store current root for zooming
    if (!this.currentRoot) {
      this.currentRoot = root;
    }

    // Draw arcs
    const paths = g.selectAll('path')
      .data(root.descendants())
      .join('path')
      .attr('fill', (d: any) => this.getNodeColor(d.data))
      .attr('fill-opacity', (d: any) => this.getNodeOpacity(d))
      .attr('d', arc)
      .attr('stroke', 'var(--vscode-panel-border)')
      .attr('stroke-width', 0.5)
      .style('cursor', 'pointer');

    // Add labels for larger segments
    const labels = g.selectAll('text')
      .data(root.descendants().filter((d: any) => {
        // Only show labels for segments with enough space
        const angle = d.x1 - d.x0;
        const depth = d.y1 - d.y0;
        return angle > 0.1 && depth > 20 && d.depth > 0;
      }))
      .join('text')
      .attr('transform', (d: any) => {
        const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
        const y = (d.y0 + d.y1) / 2;
        return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
      })
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('fill', 'var(--vscode-editor-foreground)')
      .style('pointer-events', 'none')
      .text((d: any) => d.data.name);

    // Store reference for click handler
    const self = this;

    // Add tooltips to paths
    paths.nodes().forEach((node: any, index: number) => {
      const d = root.descendants()[index];
      if (node && d) {
        self.addTooltipToElement(node as SVGElement, d.data);
      }
    });

    // Add click handlers for zooming
    paths.on('click', function(event: MouseEvent, d: any) {
      event.stopPropagation();
      self.zoomToNode(d, arc, paths, labels);
    });

    // Click on center to zoom out
    g.append('circle')
      .attr('r', radius / 10)
      .attr('fill', 'var(--vscode-editor-background)')
      .attr('stroke', 'var(--vscode-panel-border)')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', () => {
        if (self.currentRoot && self.currentRoot.parent) {
          self.zoomToNode(self.currentRoot.parent, arc, paths, labels);
        } else {
          self.zoomToNode(root, arc, paths, labels);
        }
      });

    // Add center label
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('font-size', '10px')
      .style('fill', 'var(--vscode-editor-foreground)')
      .style('pointer-events', 'none')
      .text('↑');

    // Render breadcrumbs
    this.renderBreadcrumbs();
  }

  /**
   * Zoom to clicked node
   */
  private zoomToNode(node: any, arc: any, paths: any, labels: any): void {
    const d3 = (window as any).d3;
    this.currentRoot = node;

    // Update breadcrumbs
    this.updateBreadcrumbs(node);

    // Transition arcs
    paths.transition()
      .duration(750)
      .attrTween('d', (d: any) => {
        const i = d3.interpolate(d.x0, node.x0);
        return (t: number) => {
          d.x0 = i(t);
          return arc(d);
        };
      })
      .attr('fill-opacity', (d: any) => {
        // Fade out nodes not in current subtree
        if (this.isAncestor(d, node)) {
          return this.getNodeOpacity(d);
        }
        return 0.3;
      });

    // Transition labels
    labels.transition()
      .duration(750)
      .attr('opacity', (d: any) => {
        return this.isAncestor(d, node) ? 1 : 0;
      });
  }

  /**
   * Check if node d is ancestor of target
   */
  private isAncestor(d: any, target: any): boolean {
    let current = d;
    while (current) {
      if (current === target) return true;
      current = current.parent;
    }
    return false;
  }

  /**
   * Get color for node based on status
   */
  private getNodeColor(node: SunburstNode): string {
    if (node.type === 'directory') {
      // Directories get muted colors
      const statusColors: Record<string, string> = {
        excellent: '#10b98150',
        good: '#84cc1650',
        warning: '#f59e0b50',
        critical: '#ef444450'
      };
      return statusColors[node.status] || '#6b728050';
    } else {
      // Files get full colors
      return this.getStatusColor(node.status);
    }
  }

  /**
   * Get opacity based on depth and type
   */
  private getNodeOpacity(node: any): number {
    if (node.depth === 0) return 0.1;  // Root is nearly invisible
    if (node.data.type === 'directory') return 0.7;
    return 0.9;
  }

  /**
   * Render breadcrumb trail
   */
  private renderBreadcrumbs(): void {
    // Check if breadcrumb container exists in DOM
    const breadcrumbContainer = this.container.parentElement?.querySelector('.sunburst-breadcrumbs');
    if (!breadcrumbContainer) {
      // Create breadcrumb container above visualization
      const container = document.createElement('div');
      container.className = 'sunburst-breadcrumbs';
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
   * Update breadcrumbs when zooming
   */
  private updateBreadcrumbs(node: any): void {
    const breadcrumbContainer = this.container.parentElement?.querySelector('.sunburst-breadcrumbs');
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

    // Add click handlers to breadcrumb items
    breadcrumbContainer.querySelectorAll('span[data-depth]').forEach((span, index) => {
      span.addEventListener('click', () => {
        const targetNode = path[index];
        const arc = (window as any).d3.arc()
          .startAngle((d: any) => d.x0)
          .endAngle((d: any) => d.x1)
          .padAngle((d: any) => Math.min((d.x1 - d.x0) / 2, 0.005))
          .padRadius(Math.min(this.getContentWidth(), this.getContentHeight()) / 4)
          .innerRadius((d: any) => d.y0)
          .outerRadius((d: any) => d.y1 - 1);

        const paths = this.svg!.select('.visualization-content').selectAll('path');
        const labels = this.svg!.select('.visualization-content').selectAll('text');

        this.zoomToNode(targetNode, arc, paths, labels);
      });
    });
  }

  /**
   * Add tooltip to SVG element
   */
  private addTooltipToElement(element: SVGElement, node: SunburstNode): void {
    element.addEventListener('mouseenter', (event) => {
      this.showNodeTooltip(event, node);
    });

    element.addEventListener('mouseleave', () => {
      this.hideNodeTooltip();
    });
  }

  /**
   * Show tooltip for node
   */
  private showNodeTooltip(event: MouseEvent, node: SunburstNode): void {
    const tooltip = this.getOrCreateTooltip();

    const totalIssues = node.issueCount;
    const statusIcon = this.getStatusIcon(node.status);

    tooltip.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">
        ${statusIcon} ${node.name}
      </div>
      <div style="font-size: 11px; color: var(--vscode-descriptionForeground);">
        ${node.type === 'directory' ? 'Directory' : 'File'}
      </div>
      <div style="margin-top: 8px;">
        <div>Total Issues: <strong>${totalIssues}</strong></div>
        ${node.criticalIssues > 0 ? `<div style="color: #ef4444;">Critical: ${node.criticalIssues}</div>` : ''}
        ${node.highIssues > 0 ? `<div style="color: #f97316;">High: ${node.highIssues}</div>` : ''}
        ${node.mediumIssues > 0 ? `<div style="color: #f59e0b;">Medium: ${node.mediumIssues}</div>` : ''}
        ${node.lowIssues > 0 ? `<div style="color: #84cc16;">Low: ${node.lowIssues}</div>` : ''}
      </div>
      <div style="margin-top: 8px; font-size: 11px; color: var(--vscode-descriptionForeground);">
        Click to zoom ${node.type === 'directory' ? 'in' : '(files have details)'}
      </div>
    `;

    tooltip.style.display = 'block';

    // Position tooltip
    const x = event.clientX + 10;
    const y = event.clientY + 10;
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;

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
    const tooltip = document.getElementById('sunburst-tooltip');
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }

  /**
   * Get or create tooltip element
   */
  private getOrCreateTooltip(): HTMLElement {
    let tooltip = document.getElementById('sunburst-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'sunburst-tooltip';
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
   * Get status icon
   */
  private getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      excellent: '✅',
      good: '👍',
      warning: '⚠️',
      critical: '🔴'
    };
    return icons[status] || '📄';
  }

  /**
   * Clean up
   */
  override destroy(): void {
    // Remove breadcrumbs
    const breadcrumbContainer = this.container.parentElement?.querySelector('.sunburst-breadcrumbs');
    if (breadcrumbContainer) {
      breadcrumbContainer.remove();
    }

    // Remove tooltip
    const tooltip = document.getElementById('sunburst-tooltip');
    if (tooltip) {
      tooltip.remove();
    }

    super.destroy();
  }
}
