/**
 * Stream Graph
 * Stacked area chart showing trends over time with flowing layers
 *
 * Purpose: Visualize how different categories/types change over time
 * Technique: D3 stack layout with area generation and smooth curves
 */

import { BaseVisualization, VisualizationConfig } from './BaseVisualization';

export interface StreamDataPoint {
  timestamp: Date | string;
  values: Record<string, number>;  // category -> value
}

export interface StreamLayer {
  key: string;
  label: string;
  color?: string;
}

export interface StreamGraphData {
  data: StreamDataPoint[];
  layers: StreamLayer[];
}

export class StreamGraph extends BaseVisualization {
  private selectedLayer: string | null = null;

  constructor(container: HTMLElement, config: VisualizationConfig = {}) {
    super(container, config);
  }

  /**
   * Render stream graph
   */
  protected async renderContent(): Promise<void> {
    const d3 = (window as any).d3;
    if (!this.svg) return;

    const data: StreamGraphData = this.data;
    const width = this.getContentWidth();
    const height = this.getContentHeight();

    const margin = { top: 20, right: 120, bottom: 40, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Parse timestamps
    const parsedData = data.data.map(d => ({
      timestamp: typeof d.timestamp === 'string' ? new Date(d.timestamp) : d.timestamp,
      values: d.values
    }));

    // Create scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(parsedData, (d: any) => d.timestamp))
      .range([0, innerWidth]);

    // Stack the data
    const stack = d3.stack()
      .keys(data.layers.map(l => l.key))
      .offset(d3.stackOffsetWiggle)  // Creates the flowing stream effect
      .order(d3.stackOrderInsideOut);

    const series = stack(parsedData.map(d => ({
      timestamp: d.timestamp,
      ...d.values
    })));

    // Y scale
    const yMin = d3.min(series, (layer: any) => d3.min(layer, (d: any) => d[0]));
    const yMax = d3.max(series, (layer: any) => d3.max(layer, (d: any) => d[1]));

    const yScale = d3.scaleLinear()
      .domain([yMin, yMax])
      .range([innerHeight, 0]);

    // Color scale
    const colorScale = d3.scaleOrdinal()
      .domain(data.layers.map(l => l.key))
      .range(d3.schemeCategory10);

    const g = this.svg!.select('.visualization-content')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create area generator
    const area = d3.area()
      .x((d: any) => xScale(d.data.timestamp))
      .y0((d: any) => yScale(d[0]))
      .y1((d: any) => yScale(d[1]))
      .curve(d3.curveBasis);  // Smooth curves

    // Draw layers
    const layers = g.append('g')
      .attr('class', 'layers')
      .selectAll('path')
      .data(series)
      .join('path')
      .attr('d', area)
      .attr('fill', (d: any) => {
        const layer = data.layers.find(l => l.key === d.key);
        return layer?.color || colorScale(d.key);
      })
      .attr('stroke', 'none')
      .attr('opacity', 0.8)
      .style('cursor', 'pointer')
      .on('mouseenter', (event: MouseEvent, d: any) => {
        this.showLayerTooltip(event, d, data.layers);
        this.highlightLayer(d.key, layers);
      })
      .on('mouseleave', () => {
        this.hideLayerTooltip();
        this.clearLayerHighlights(layers);
      })
      .on('click', (_event: MouseEvent, d: any) => {
        this.handleLayerClick(d.key, data.layers);
      });

    // Add x-axis
    const xAxis = d3.axisBottom(xScale)
      .ticks(6)
      .tickFormat(d3.timeFormat('%Y-%m-%d'));

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .style('font-size', '10px')
      .style('fill', 'var(--vscode-foreground)');

    // Add y-axis
    const yAxis = d3.axisLeft(yScale)
      .ticks(5);

    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .selectAll('text')
      .style('font-size', '10px')
      .style('fill', 'var(--vscode-foreground)');

    // Y-axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -35)
      .attr('x', -innerHeight / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('fill', 'var(--vscode-foreground)')
      .text('Volume');

    // Add legend
    this.addLegend(g, data.layers, colorScale, innerWidth);

    // Add controls
    this.addControls();
  }

  /**
   * Add legend
   */
  private addLegend(g: any, layers: StreamLayer[], colorScale: any, width: number): void {
    const legend = g.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width + 20}, 0)`);

    const legendItems = legend.selectAll('g')
      .data(layers)
      .join('g')
      .attr('class', 'legend-item')
      .attr('transform', (_d: StreamLayer, i: number) => `translate(0, ${i * 22})`)
      .style('cursor', 'pointer')
      .on('click', (_event: MouseEvent, d: StreamLayer) => {
        this.handleLayerClick(d.key, layers);
      });

    legendItems.append('rect')
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', (d: StreamLayer) => d.color || colorScale(d.key))
      .attr('opacity', 0.8);

    legendItems.append('text')
      .attr('x', 20)
      .attr('y', 12)
      .style('font-size', '11px')
      .style('fill', 'var(--vscode-foreground)')
      .text((d: StreamLayer) => d.label);
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

    // Layout selector
    const label = document.createElement('div');
    label.textContent = 'Layout:';
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
      { value: 'wiggle', label: 'Stream (Wiggle)' },
      { value: 'silhouette', label: 'Centered' },
      { value: 'expand', label: 'Expanded (%)' },
      { value: 'none', label: 'Stacked' }
    ];

    options.forEach(option => {
      const opt = document.createElement('option');
      opt.value = option.value;
      opt.textContent = option.label;
      select.appendChild(opt);
    });

    select.addEventListener('change', (e) => {
      const offset = (e.target as HTMLSelectElement).value;
      this.changeOffset(offset);
    });

    controls.appendChild(label);
    controls.appendChild(select);

    this.container.style.position = 'relative';
    this.container.appendChild(controls);
  }

  /**
   * Change stack offset
   */
  private changeOffset(offsetType: string): void {
    // Store the offset type and re-render
    const d3 = (window as any).d3;

    let offset;
    switch (offsetType) {
      case 'silhouette':
        offset = d3.stackOffsetSilhouette;
        break;
      case 'expand':
        offset = d3.stackOffsetExpand;
        break;
      case 'none':
        offset = d3.stackOffsetNone;
        break;
      case 'wiggle':
      default:
        offset = d3.stackOffsetWiggle;
        break;
    }

    // Re-render with new offset
    this.render(this.data);
  }

  /**
   * Highlight layer
   */
  private highlightLayer(key: string, layers: any): void {
    layers
      .attr('opacity', (d: any) => d.key === key ? 1 : 0.2)
      .attr('stroke', (d: any) => d.key === key ? 'var(--vscode-foreground)' : 'none')
      .attr('stroke-width', (d: any) => d.key === key ? 1 : 0);
  }

  /**
   * Clear layer highlights
   */
  private clearLayerHighlights(layers: any): void {
    layers
      .attr('opacity', 0.8)
      .attr('stroke', 'none')
      .attr('stroke-width', 0);
  }

  /**
   * Show layer tooltip
   */
  private showLayerTooltip(event: MouseEvent, layer: any, allLayers: StreamLayer[]): void {
    const tooltip = this.getOrCreateTooltip();
    const layerInfo = allLayers.find(l => l.key === layer.key);

    if (!layerInfo) return;

    // Calculate total value for this layer
    const total = layer.reduce((sum: number, d: any) => sum + (d[1] - d[0]), 0);
    const avg = total / layer.length;

    tooltip.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">
        ${layerInfo.label}
      </div>
      <div>
        <div>Total Volume: <strong>${total.toFixed(0)}</strong></div>
        <div>Average: <strong>${avg.toFixed(1)}</strong></div>
        <div>Data Points: <strong>${layer.length}</strong></div>
      </div>
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
   * Hide tooltip
   */
  private hideLayerTooltip(): void {
    const tooltip = document.getElementById('stream-graph-tooltip');
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }

  /**
   * Get or create tooltip
   */
  private getOrCreateTooltip(): HTMLElement {
    let tooltip = document.getElementById('stream-graph-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'stream-graph-tooltip';
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
   * Handle layer click
   */
  private handleLayerClick(key: string, layers: StreamLayer[]): void {
    this.selectedLayer = key;
    const layer = layers.find(l => l.key === key);

    window.dispatchEvent(new CustomEvent('stream-graph-layer-click', {
      detail: {
        key,
        label: layer?.label || key
      }
    }));
  }

  /**
   * Clean up
   */
  override destroy(): void {
    const tooltip = document.getElementById('stream-graph-tooltip');
    if (tooltip) {
      tooltip.remove();
    }

    const controls = this.container.querySelector('.visualization-controls');
    if (controls) {
      controls.remove();
    }

    this.selectedLayer = null;

    super.destroy();
  }
}
