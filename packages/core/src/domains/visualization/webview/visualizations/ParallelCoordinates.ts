/**
 * Parallel Coordinates
 * Multi-dimensional visualization with parallel vertical axes
 *
 * Purpose: Compare multiple metrics across different files/modules
 * Technique: D3 parallel coordinates with interactive axis brushing
 */

import { BaseVisualization, VisualizationConfig } from './BaseVisualization';

export interface ParallelDimension {
  key: string;
  label: string;
  type: 'numeric' | 'categorical';
  domain?: [number, number] | string[];  // numeric range or category values
}

export interface ParallelDataPoint {
  id: string;
  name: string;
  values: Record<string, number | string>;  // dimension key -> value
  category?: string;                         // for coloring
}

export interface ParallelCoordinatesData {
  dimensions: ParallelDimension[];
  data: ParallelDataPoint[];
}

export class ParallelCoordinates extends BaseVisualization {
  private brushes: Map<string, any> = new Map();
  private selectedPoints: Set<string> = new Set();

  constructor(container: HTMLElement, config: VisualizationConfig = {}) {
    super(container, config);
  }

  /**
   * Render parallel coordinates
   */
  protected async renderContent(): Promise<void> {
    const d3 = (window as any).d3;
    if (!this.svg) return;

    const data: ParallelCoordinatesData = this.data;

    // DEFENSIVE: Validate data structure
    if (!data || typeof data !== 'object') {
      this.renderEmptyState(
        'No data available',
        '📊',
        ['Run a code analysis to generate metrics data']
      );
      return;
    }

    if (!Array.isArray(data.dimensions) || data.dimensions.length === 0) {
      this.renderEmptyState(
        'No dimensions available for comparison',
        '📊',
        [
          'Analysis data must include multiple metrics',
          'Ensure files have measurable properties (issues, complexity, etc.)'
        ]
      );
      return;
    }

    if (!Array.isArray(data.data) || data.data.length === 0) {
      this.renderEmptyState(
        'No data points to visualize',
        '📊',
        [
          'No files found in analysis',
          'Apply different filters to see results'
        ]
      );
      return;
    }

    const width = this.getContentWidth();
    const height = this.getContentHeight();

    const margin = { top: 40, right: 20, bottom: 20, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create scales for dimensions
    const dimensionScales = new Map<string, any>();
    const xScale = d3.scalePoint()
      .domain(data.dimensions.map(d => d.key))
      .range([0, innerWidth])
      .padding(0.1);

    data.dimensions.forEach(dim => {
      if (dim.type === 'numeric') {
        const domain = dim.domain as [number, number] || [
          d3.min(data.data, (p: ParallelDataPoint) => p.values[dim.key] as number),
          d3.max(data.data, (p: ParallelDataPoint) => p.values[dim.key] as number)
        ];

        dimensionScales.set(dim.key, d3.scaleLinear()
          .domain(domain)
          .range([innerHeight, 0]));
      } else {
        const domain = dim.domain as string[] ||
          Array.from(new Set(data.data.map((p: ParallelDataPoint) => p.values[dim.key] as string)));

        dimensionScales.set(dim.key, d3.scalePoint()
          .domain(domain)
          .range([innerHeight, 0])
          .padding(0.5));
      }
    });

    // Color scale for categories
    const categories = Array.from(new Set(data.data.map(d => d.category || 'default')));
    const colorScale = d3.scaleOrdinal()
      .domain(categories)
      .range(d3.schemeCategory10);

    const g = this.svg!.select('.visualization-content')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Draw lines (polylines for each data point)
    const lines = g.append('g')
      .attr('class', 'lines')
      .selectAll('path')
      .data(data.data)
      .join('path')
      .attr('d', (d: ParallelDataPoint) => this.path(d, data.dimensions, xScale, dimensionScales))
      .attr('fill', 'none')
      .attr('stroke', (d: ParallelDataPoint) => colorScale(d.category || 'default'))
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.4)
      .style('cursor', 'pointer')
      .on('mouseenter', (event: MouseEvent, d: ParallelDataPoint) => {
        this.showPointTooltip(event, d);
        this.highlightLine(d, lines);
      })
      .on('mouseleave', () => {
        this.hidePointTooltip();
        this.clearLineHighlights(lines);
      })
      .on('click', (_event: MouseEvent, d: ParallelDataPoint) => {
        this.handlePointClick(d);
      });

    // Draw axes
    const axes = g.append('g')
      .attr('class', 'axes')
      .selectAll('g')
      .data(data.dimensions)
      .join('g')
      .attr('class', 'axis')
      .attr('transform', (d: ParallelDimension) => `translate(${xScale(d.key)},0)`);

    // Add axis lines and labels
    axes.each(function(dim: ParallelDimension) {
      const axisGroup = d3.select(this);
      const scale = dimensionScales.get(dim.key);

      // Axis line
      axisGroup.append('line')
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', 'var(--vscode-foreground)')
        .attr('stroke-width', 1);

      // Axis ticks and labels
      const axis = dim.type === 'numeric'
        ? d3.axisLeft(scale).ticks(5)
        : d3.axisLeft(scale);

      axisGroup.call(axis);

      // Dimension label
      axisGroup.append('text')
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .style('fill', 'var(--vscode-foreground)')
        .text(dim.label);
    });

    // Add brushing for filtering
    if (this.config.interactive !== false) {
      this.addBrushes(axes, data.dimensions, lines, dimensionScales, innerHeight);
    }

    // Add legend
    this.addLegend(g, colorScale, categories, innerWidth);

    // Add controls
    this.addControls(lines);
  }

  /**
   * Generate path for a data point
   */
  private path(
    point: ParallelDataPoint,
    dimensions: ParallelDimension[],
    xScale: any,
    dimensionScales: Map<string, any>
  ): string {
    const d3 = (window as any).d3;
    const pathData = d3.line()(
      dimensions.map(dim => {
        const x = xScale(dim.key);
        const scale = dimensionScales.get(dim.key);
        const value = point.values[dim.key];
        const y = scale(value);
        return [x, y];
      })
    );
    return pathData || '';
  }

  /**
   * Add brushes for interactive filtering
   */
  private addBrushes(
    axes: any,
    dimensions: ParallelDimension[],
    lines: any,
    dimensionScales: Map<string, any>,
    height: number
  ): void {
    const d3 = (window as any).d3;
    const data = this.data as ParallelCoordinatesData;

    axes.each((dim: ParallelDimension) => {
      const brush = d3.brushY()
        .extent([[-10, 0], [10, height]])
        .on('brush end', () => {
          this.updateSelection(lines, dimensions, dimensionScales, data.data);
        });

      d3.select(`.axis`)
        .filter((d: ParallelDimension) => d.key === dim.key)
        .call(brush);

      this.brushes.set(dim.key, brush);
    });
  }

  /**
   * Update line selection based on brush filters
   */
  private updateSelection(
    lines: any,
    dimensions: ParallelDimension[],
    dimensionScales: Map<string, any>,
    data: ParallelDataPoint[]
  ): void {
    const d3 = (window as any).d3;

    // Get active brush selections
    const selections = new Map<string, [number, number]>();

    dimensions.forEach(dim => {
      const brushSelection = d3.brushSelection(
        d3.select('.axis')
          .filter((d: ParallelDimension) => d.key === dim.key)
          .node()
      );

      if (brushSelection) {
        selections.set(dim.key, brushSelection as [number, number]);
      }
    });

    // Filter lines based on selections
    lines
      .attr('stroke-opacity', (point: ParallelDataPoint) => {
        // Check if point passes all brush filters
        for (const [dimKey, selection] of selections.entries()) {
          const scale = dimensionScales.get(dimKey);
          const value = point.values[dimKey];
          const y = scale(value);

          if (y < selection[0] || y > selection[1]) {
            return 0.1;
          }
        }
        return 0.6;
      })
      .attr('stroke-width', (point: ParallelDataPoint) => {
        for (const [dimKey, selection] of selections.entries()) {
          const scale = dimensionScales.get(dimKey);
          const value = point.values[dimKey];
          const y = scale(value);

          if (y < selection[0] || y > selection[1]) {
            return 1;
          }
        }
        return 2.5;
      });
  }

  /**
   * Add legend
   */
  private addLegend(g: any, colorScale: any, categories: string[], width: number): void {
    if (categories.length <= 1) return;

    const legend = g.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width - 120}, 0)`);

    const legendItems = legend.selectAll('g')
      .data(categories)
      .join('g')
      .attr('transform', (_d: string, i: number) => `translate(0, ${i * 20})`);

    legendItems.append('rect')
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', (d: string) => colorScale(d));

    legendItems.append('text')
      .attr('x', 20)
      .attr('y', 12)
      .style('font-size', '11px')
      .style('fill', 'var(--vscode-foreground)')
      .text((d: string) => d);
  }

  /**
   * Add control panel
   */
  private addControls(lines: any): void {
    const controls = document.createElement('div');
    controls.className = 'visualization-controls';
    controls.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      display: flex;
      gap: 8px;
      z-index: 10;
    `;

    // Reset brushes button
    const resetBtn = this.createButton('Reset Filters', () => {
      this.resetBrushes();
      lines.attr('stroke-opacity', 0.4).attr('stroke-width', 2);
    });

    controls.appendChild(resetBtn);

    this.container.style.position = 'relative';
    this.container.appendChild(controls);
  }

  /**
   * Create button element
   */
  private createButton(text: string, onClick: () => void): HTMLElement {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
      padding: 6px 12px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
    `;
    btn.addEventListener('click', onClick);
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'var(--vscode-button-hoverBackground)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'var(--vscode-button-background)';
    });
    return btn;
  }

  /**
   * Reset all brushes
   */
  private resetBrushes(): void {
    const d3 = (window as any).d3;

    d3.selectAll('.axis .selection').remove();
    d3.selectAll('.axis .handle').remove();
    d3.selectAll('.axis .overlay').remove();
  }

  /**
   * Highlight line
   */
  private highlightLine(point: ParallelDataPoint, lines: any): void {
    lines
      .attr('stroke-opacity', (d: ParallelDataPoint) => d.id === point.id ? 1 : 0.1)
      .attr('stroke-width', (d: ParallelDataPoint) => d.id === point.id ? 4 : 2);
  }

  /**
   * Clear line highlights
   */
  private clearLineHighlights(lines: any): void {
    lines
      .attr('stroke-opacity', 0.4)
      .attr('stroke-width', 2);
  }

  /**
   * Show point tooltip
   */
  private showPointTooltip(event: MouseEvent, point: ParallelDataPoint): void {
    const tooltip = this.getOrCreateTooltip();
    const data = this.data as ParallelCoordinatesData;

    let html = `
      <div style="font-weight: bold; margin-bottom: 4px;">
        ${point.name}
      </div>
      ${point.category ? `
        <div style="font-size: 11px; color: var(--vscode-descriptionForeground); margin-bottom: 8px;">
          ${point.category}
        </div>
      ` : ''}
      <div>
    `;

    data.dimensions.forEach(dim => {
      const value = point.values[dim.key];
      html += `
        <div style="margin-bottom: 4px;">
          <span style="color: var(--vscode-descriptionForeground);">${dim.label}:</span>
          <strong>${typeof value === 'number' ? value.toFixed(2) : value}</strong>
        </div>
      `;
    });

    html += `
      </div>
      <div style="margin-top: 8px; font-size: 11px; color: var(--vscode-descriptionForeground);">
        Click for details
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
  private hidePointTooltip(): void {
    const tooltip = document.getElementById('parallel-coords-tooltip');
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }

  /**
   * Get or create tooltip
   */
  private getOrCreateTooltip(): HTMLElement {
    let tooltip = document.getElementById('parallel-coords-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'parallel-coords-tooltip';
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
   * Handle point click
   */
  private handlePointClick(point: ParallelDataPoint): void {
    window.dispatchEvent(new CustomEvent('parallel-coords-point-click', {
      detail: {
        id: point.id,
        name: point.name,
        category: point.category,
        values: point.values
      }
    }));
  }

  /**
   * Clean up
   */
  override destroy(): void {
    const tooltip = document.getElementById('parallel-coords-tooltip');
    if (tooltip) {
      tooltip.remove();
    }

    const controls = this.container.querySelector('.visualization-controls');
    if (controls) {
      controls.remove();
    }

    this.brushes.clear();
    this.selectedPoints.clear();

    super.destroy();
  }
}
