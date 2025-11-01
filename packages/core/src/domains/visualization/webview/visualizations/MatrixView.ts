/**
 * Matrix View (Adjacency Matrix)
 * Grid layout showing all possible dependencies between files
 *
 * Purpose: Compact view of all relationships, easy to scan for patterns
 * Technique: D3 matrix layout with cell coloring by dependency strength
 */

import { BaseVisualization, VisualizationConfig } from './BaseVisualization';

export interface MatrixNode {
  id: string;
  name: string;
  group: string;          // group/module for sorting
  index: number;
}

export interface MatrixCell {
  source: number;         // source node index
  target: number;         // target node index
  value: number;          // dependency strength
  type?: string;
}

export interface MatrixViewData {
  nodes: MatrixNode[];
  cells: MatrixCell[];
  isEmpty?: boolean;   // Explicit empty state flag
}

export class MatrixView extends BaseVisualization {
  private sortOrder: 'name' | 'group' | 'count' = 'group';

  constructor(container: HTMLElement, config: VisualizationConfig = {}) {
    super(container, config);
  }

  /**
   * Render matrix view
   */
  protected async renderContent(): Promise<void> {
    const d3 = (window as any).d3;
    if (!this.svg) return;

    const data: MatrixViewData = this.data;

    // DEFENSIVE: Check for empty or invalid data
    if (!data || data.isEmpty || !data.nodes || data.nodes.length === 0) {
      this.renderEmptyState(
        'No data to display in matrix',
        '📊',
        [
          'Matrix view requires node data from dependency analysis',
          'Ensure your analysis includes file relationships'
        ]
      );
      return;
    }

    if (data.nodes.length === 1) {
      this.renderEmptyState(
        'Only one node found',
        '⚠️',
        [
          'Matrix view requires at least 2 nodes to show relationships',
          'Try analyzing more files or adjusting filters'
        ]
      );
      return;
    }

    const width = this.getContentWidth();
    const height = this.getContentHeight();

    // Add controls
    this.addControls();

    // Sort nodes
    const sortedNodes = this.sortNodes([...data.nodes], this.sortOrder);

    // Update indices after sorting
    sortedNodes.forEach((node, i) => {
      node.index = i;
    });

    // Calculate cell size
    const margin = { top: 120, right: 20, bottom: 20, left: 120 };
    const cellSize = Math.min(
      (width - margin.left - margin.right) / sortedNodes.length,
      (height - margin.top - margin.bottom) / sortedNodes.length,
      30 // max cell size
    );

    const matrixWidth = cellSize * sortedNodes.length;
    const matrixHeight = cellSize * sortedNodes.length;

    // Create scales
    const xScale = d3.scalePoint()
      .domain(sortedNodes.map((d: MatrixNode) => d.id))
      .range([0, matrixWidth]);

    const yScale = d3.scalePoint()
      .domain(sortedNodes.map((d: MatrixNode) => d.id))
      .range([0, matrixHeight]);

    // Color scale for cell values
    const colorScale = d3.scaleSequential()
      .domain([0, d3.max(data.cells, (d: MatrixCell) => d.value) || 10])
      .interpolator(d3.interpolateBlues);

    const g = this.svg!.select('.visualization-content')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Draw matrix cells
    const cells = g.append('g')
      .attr('class', 'cells')
      .selectAll('rect')
      .data(data.cells)
      .join('rect')
      .attr('x', (d: MatrixCell) => sortedNodes[d.source].index * cellSize)
      .attr('y', (d: MatrixCell) => sortedNodes[d.target].index * cellSize)
      .attr('width', cellSize - 1)
      .attr('height', cellSize - 1)
      .attr('fill', (d: MatrixCell) => d.value > 0 ? colorScale(d.value) : 'transparent')
      .attr('stroke', 'var(--vscode-panel-border)')
      .attr('stroke-width', 0.5)
      .style('cursor', 'pointer')
      .on('mouseenter', (event: MouseEvent, d: MatrixCell) => {
        if (d.value > 0) {
          this.showCellTooltip(event, d, sortedNodes);
          this.highlightCell(d, cells, rowLabels, columnLabels);
        }
      })
      .on('mouseleave', () => {
        this.hideCellTooltip();
        this.clearHighlights(cells, rowLabels, columnLabels);
      })
      .on('click', (_event: MouseEvent, d: MatrixCell) => {
        if (d.value > 0) {
          this.handleCellClick(d, sortedNodes);
        }
      });

    // Draw row labels (targets)
    const rowLabels = g.append('g')
      .attr('class', 'row-labels')
      .selectAll('text')
      .data(sortedNodes)
      .join('text')
      .attr('x', -6)
      .attr('y', (d: MatrixNode) => d.index * cellSize + cellSize / 2)
      .attr('dy', '0.32em')
      .attr('text-anchor', 'end')
      .text((d: MatrixNode) => d.name)
      .style('font-size', `${Math.min(10, cellSize * 0.6)}px`)
      .style('fill', 'var(--vscode-foreground)')
      .style('cursor', 'pointer')
      .on('mouseenter', (event: MouseEvent, d: MatrixNode) => {
        this.highlightRow(d, cells, rowLabels);
      })
      .on('mouseleave', () => {
        this.clearHighlights(cells, rowLabels, columnLabels);
      });

    // Draw column labels (sources)
    const columnLabels = g.append('g')
      .attr('class', 'column-labels')
      .selectAll('text')
      .data(sortedNodes)
      .join('text')
      .attr('x', (d: MatrixNode) => d.index * cellSize + cellSize / 2)
      .attr('y', -6)
      .attr('text-anchor', 'start')
      .attr('transform', (d: MatrixNode) => `rotate(-65,${d.index * cellSize + cellSize / 2},-6)`)
      .text((d: MatrixNode) => d.name)
      .style('font-size', `${Math.min(10, cellSize * 0.6)}px`)
      .style('fill', 'var(--vscode-foreground)')
      .style('cursor', 'pointer')
      .on('mouseenter', (event: MouseEvent, d: MatrixNode) => {
        this.highlightColumn(d, cells, columnLabels);
      })
      .on('mouseleave', () => {
        this.clearHighlights(cells, rowLabels, columnLabels);
      });

    // Add group separators if sorted by group
    if (this.sortOrder === 'group') {
      this.addGroupSeparators(g, sortedNodes, cellSize, matrixWidth, matrixHeight);
    }

    // Add legend
    this.addLegend(g, colorScale, matrixWidth, data.cells);
  }

  /**
   * Sort nodes based on criteria
   */
  private sortNodes(nodes: MatrixNode[], order: 'name' | 'group' | 'count'): MatrixNode[] {
    switch (order) {
      case 'name':
        return nodes.sort((a, b) => a.name.localeCompare(b.name));
      case 'group':
        return nodes.sort((a, b) => {
          if (a.group === b.group) return a.name.localeCompare(b.name);
          return a.group.localeCompare(b.group);
        });
      case 'count':
        // Count dependencies per node
        const counts = new Map<string, number>();
        nodes.forEach(node => counts.set(node.id, 0));

        const data = this.data as MatrixViewData;
        data.cells.forEach(cell => {
          const sourceId = nodes[cell.source]?.id;
          const targetId = nodes[cell.target]?.id;
          if (sourceId) counts.set(sourceId, (counts.get(sourceId) || 0) + cell.value);
          if (targetId) counts.set(targetId, (counts.get(targetId) || 0) + cell.value);
        });

        return nodes.sort((a, b) => (counts.get(b.id) || 0) - (counts.get(a.id) || 0));
      default:
        return nodes;
    }
  }

  /**
   * Add group separators
   */
  private addGroupSeparators(g: any, nodes: MatrixNode[], cellSize: number, width: number, height: number): void {
    const groups: { group: string; start: number; end: number }[] = [];
    let currentGroup = nodes[0]?.group;
    let start = 0;

    nodes.forEach((node, i) => {
      if (node.group !== currentGroup) {
        groups.push({ group: currentGroup, start, end: i });
        currentGroup = node.group;
        start = i;
      }
    });

    if (nodes.length > 0) {
      groups.push({ group: currentGroup, start, end: nodes.length });
    }

    // Draw separators
    groups.forEach(group => {
      if (group.end < nodes.length) {
        const y = group.end * cellSize;
        // Horizontal line
        g.append('line')
          .attr('x1', 0)
          .attr('x2', width)
          .attr('y1', y)
          .attr('y2', y)
          .attr('stroke', 'var(--vscode-foreground)')
          .attr('stroke-width', 2)
          .attr('opacity', 0.3);

        // Vertical line
        g.append('line')
          .attr('x1', y)
          .attr('x2', y)
          .attr('y1', 0)
          .attr('y2', height)
          .attr('stroke', 'var(--vscode-foreground)')
          .attr('stroke-width', 2)
          .attr('opacity', 0.3);
      }
    });
  }

  /**
   * Add legend
   */
  private addLegend(g: any, colorScale: any, matrixWidth: number, cells: MatrixCell[]): void {
    const legendWidth = 150;
    const legendHeight = 15;
    const legendX = matrixWidth - legendWidth;
    const legendY = -60;

    const legend = g.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${legendX},${legendY})`);

    // Gradient
    const defs = g.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'matrix-gradient')
      .attr('x1', '0%')
      .attr('x2', '100%');

    const maxValue = Math.max(...cells.map(c => c.value));
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const value = (maxValue / steps) * i;
      gradient.append('stop')
        .attr('offset', `${(i / steps) * 100}%`)
        .attr('stop-color', colorScale(value));
    }

    // Legend rect
    legend.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .attr('fill', 'url(#matrix-gradient)')
      .attr('stroke', 'var(--vscode-panel-border)');

    // Legend labels
    legend.append('text')
      .attr('x', 0)
      .attr('y', legendHeight + 12)
      .attr('text-anchor', 'start')
      .style('font-size', '10px')
      .style('fill', 'var(--vscode-foreground)')
      .text('0');

    legend.append('text')
      .attr('x', legendWidth)
      .attr('y', legendHeight + 12)
      .attr('text-anchor', 'end')
      .style('font-size', '10px')
      .style('fill', 'var(--vscode-foreground)')
      .text(maxValue.toString());

    legend.append('text')
      .attr('x', legendWidth / 2)
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('font-weight', 'bold')
      .style('fill', 'var(--vscode-foreground)')
      .text('Dependency Strength');
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
      { value: 'group', label: 'Module/Group' },
      { value: 'name', label: 'Name' },
      { value: 'count', label: 'Dependency Count' }
    ];

    options.forEach(option => {
      const opt = document.createElement('option');
      opt.value = option.value;
      opt.textContent = option.label;
      if (option.value === this.sortOrder) {
        opt.selected = true;
      }
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
   * Highlight cell and related labels
   */
  private highlightCell(cell: MatrixCell, cells: any, rowLabels: any, columnLabels: any): void {
    cells.attr('opacity', (d: MatrixCell) => d === cell ? 1 : 0.2);
    rowLabels.attr('font-weight', (d: MatrixNode) => d.index === cell.target ? 'bold' : 'normal');
    columnLabels.attr('font-weight', (d: MatrixNode) => d.index === cell.source ? 'bold' : 'normal');
  }

  /**
   * Highlight row
   */
  private highlightRow(node: MatrixNode, cells: any, rowLabels: any): void {
    cells.attr('opacity', (d: MatrixCell) => d.target === node.index && d.value > 0 ? 1 : 0.2);
    rowLabels.attr('font-weight', (d: MatrixNode) => d.index === node.index ? 'bold' : 'normal');
  }

  /**
   * Highlight column
   */
  private highlightColumn(node: MatrixNode, cells: any, columnLabels: any): void {
    cells.attr('opacity', (d: MatrixCell) => d.source === node.index && d.value > 0 ? 1 : 0.2);
    columnLabels.attr('font-weight', (d: MatrixNode) => d.index === node.index ? 'bold' : 'normal');
  }

  /**
   * Clear highlights
   */
  private clearHighlights(cells: any, rowLabels: any, columnLabels: any): void {
    cells.attr('opacity', 1);
    rowLabels.attr('font-weight', 'normal');
    columnLabels.attr('font-weight', 'normal');
  }

  /**
   * Show cell tooltip
   */
  private showCellTooltip(event: MouseEvent, cell: MatrixCell, nodes: MatrixNode[]): void {
    const tooltip = this.getOrCreateTooltip();

    const source = nodes[cell.source];
    const target = nodes[cell.target];

    tooltip.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">
        Dependency
      </div>
      <div style="margin-bottom: 8px;">
        <div style="margin-bottom: 4px;">
          <span style="color: var(--vscode-descriptionForeground);">From:</span>
          <strong>${source.name}</strong>
        </div>
        <div>
          <span style="color: var(--vscode-descriptionForeground);">To:</span>
          <strong>${target.name}</strong>
        </div>
      </div>
      <div>
        Strength: <strong>${cell.value}</strong>
      </div>
      ${cell.type ? `<div>Type: <strong>${cell.type}</strong></div>` : ''}
    `;

    tooltip.style.display = 'block';
    tooltip.style.left = `${event.clientX + 10}px`;
    tooltip.style.top = `${event.clientY + 10}px`;

    this.adjustTooltipPosition(tooltip);
  }

  /**
   * Hide tooltip
   */
  private hideCellTooltip(): void {
    const tooltip = document.getElementById('matrix-view-tooltip');
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }

  /**
   * Get or create tooltip
   */
  private getOrCreateTooltip(): HTMLElement {
    let tooltip = document.getElementById('matrix-view-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'matrix-view-tooltip';
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
   * Handle cell click
   */
  private handleCellClick(cell: MatrixCell, nodes: MatrixNode[]): void {
    const source = nodes[cell.source];
    const target = nodes[cell.target];

    window.dispatchEvent(new CustomEvent('matrix-cell-click', {
      detail: {
        source: { id: source.id, name: source.name },
        target: { id: target.id, name: target.name },
        value: cell.value,
        type: cell.type
      }
    }));
  }

  /**
   * Clean up
   */
  override destroy(): void {
    const tooltip = document.getElementById('matrix-view-tooltip');
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
