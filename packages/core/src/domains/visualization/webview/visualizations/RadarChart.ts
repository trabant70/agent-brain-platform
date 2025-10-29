/**
 * Radar Chart (Spider Chart)
 * Shows scores across multiple categories in radial layout
 *
 * Purpose: Quick comparison of all category scores
 * Technique: d3.lineRadial() with polar coordinates
 */

import { BaseVisualization, VisualizationConfig } from './BaseVisualization';

export interface RadarDataPoint {
  category: string;
  score: number;         // 0-100
  maxScore: number;      // Always 100
  description?: string;
}

export interface RadarData {
  name: string;          // Dataset name (e.g., "Current", "Previous")
  dataPoints: RadarDataPoint[];
}

export interface RadarChartData {
  datasets: RadarData[]; // Can overlay multiple datasets
}

export class RadarChart extends BaseVisualization {
  private selectedDataset: number | null = null;

  constructor(container: HTMLElement, config: VisualizationConfig = {}) {
    super(container, config);
  }

  /**
   * Render radar chart
   */
  protected async renderContent(): Promise<void> {
    const d3 = (window as any).d3;
    if (!this.svg) return;

    const data: RadarChartData = this.data;
    const width = this.getContentWidth();
    const height = this.getContentHeight();
    const radius = Math.min(width, height) / 2 - 40;

    // Center the visualization
    const g = this.svg!.select('.visualization-content')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    // Number of axes (categories)
    const numAxes = data.datasets[0]?.dataPoints.length || 0;
    if (numAxes === 0) return;

    // Angle for each axis
    const angleSlice = (Math.PI * 2) / numAxes;

    // Radial scale
    const rScale = d3.scaleLinear()
      .domain([0, 100])
      .range([0, radius]);

    // Draw circular grid
    this.drawGrid(g, rScale, numAxes, angleSlice, radius);

    // Draw axes
    this.drawAxes(g, data.datasets[0].dataPoints, angleSlice, radius);

    // Color scale for datasets
    const colorScale = d3.scaleOrdinal()
      .domain(data.datasets.map((d, i) => String(i)))
      .range(['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']);

    // Draw each dataset
    data.datasets.forEach((dataset, index) => {
      this.drawDataset(g, dataset, index, angleSlice, rScale, colorScale(String(index)));
    });

    // Render legend
    this.renderLegend(data.datasets, colorScale);
  }

  /**
   * Draw circular grid
   */
  private drawGrid(g: any, rScale: any, numAxes: number, angleSlice: number, radius: number): void {
    const d3 = (window as any).d3;

    // Concentric circles
    const levels = 5;
    const gridGroup = g.append('g').attr('class', 'grid');

    for (let i = 1; i <= levels; i++) {
      const levelRadius = radius * (i / levels);

      gridGroup.append('circle')
        .attr('r', levelRadius)
        .attr('fill', 'none')
        .attr('stroke', 'var(--vscode-panel-border)')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', i === levels ? '0' : '4,4');

      // Add score labels
      if (i < levels) {
        gridGroup.append('text')
          .attr('x', 0)
          .attr('y', -levelRadius)
          .attr('dy', '-0.3em')
          .attr('text-anchor', 'middle')
          .style('font-size', '10px')
          .style('fill', 'var(--vscode-descriptionForeground)')
          .text((100 * i / levels).toFixed(0));
      }
    }

    // Radial lines from center to each axis
    for (let i = 0; i < numAxes; i++) {
      const angle = angleSlice * i - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      gridGroup.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', x)
        .attr('y2', y)
        .attr('stroke', 'var(--vscode-panel-border)')
        .attr('stroke-width', 1);
    }
  }

  /**
   * Draw axes with labels
   */
  private drawAxes(g: any, dataPoints: RadarDataPoint[], angleSlice: number, radius: number): void {
    const axisGroup = g.append('g').attr('class', 'axes');

    dataPoints.forEach((point, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const x = Math.cos(angle) * (radius + 20);
      const y = Math.sin(angle) * (radius + 20);

      // Label
      axisGroup.append('text')
        .attr('x', x)
        .attr('y', y)
        .attr('dy', '0.35em')
        .attr('text-anchor', () => {
          if (Math.abs(x) < 10) return 'middle';
          return x > 0 ? 'start' : 'end';
        })
        .style('font-size', '11px')
        .style('font-weight', 'bold')
        .style('fill', 'var(--vscode-foreground)')
        .text(point.category);
    });
  }

  /**
   * Draw dataset (radar area)
   */
  private drawDataset(
    g: any,
    dataset: RadarData,
    index: number,
    angleSlice: number,
    rScale: any,
    color: string
  ): void {
    const d3 = (window as any).d3;

    // Convert to polar coordinates
    const polarData = dataset.dataPoints.map((point, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const r = rScale(point.score);
      return {
        angle,
        r,
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
        point
      };
    });

    // Line generator
    const lineGenerator = d3.lineRadial()
      .angle((d: any) => d.angle + Math.PI / 2)
      .radius((d: any) => d.r)
      .curve(d3.curveLinearClosed);

    const datasetGroup = g.append('g')
      .attr('class', `dataset dataset-${index}`);

    // Draw filled area
    datasetGroup.append('path')
      .datum(polarData)
      .attr('d', lineGenerator)
      .attr('fill', color)
      .attr('fill-opacity', 0.2)
      .attr('stroke', color)
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseenter', () => {
        this.highlightDataset(index);
      })
      .on('mouseleave', () => {
        this.clearHighlights();
      })
      .on('click', () => {
        this.handleDatasetClick(index);
      });

    // Draw dots at data points
    const dotsGroup = datasetGroup.append('g').attr('class', 'dots');

    polarData.forEach((d, i) => {
      dotsGroup.append('circle')
        .attr('cx', d.x)
        .attr('cy', d.y)
        .attr('r', 4)
        .attr('fill', color)
        .attr('stroke', 'var(--vscode-editor-background)')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('mouseenter', (event: MouseEvent) => {
          this.showDataPointTooltip(event, d.point, dataset.name);
        })
        .on('mouseleave', () => {
          this.hideDataPointTooltip();
        });
    });
  }

  /**
   * Highlight dataset
   */
  private highlightDataset(index: number): void {
    if (!this.svg) return;

    const g = this.svg.select('.visualization-content');

    g.selectAll('.dataset')
      .style('opacity', (d: any, i: number) => i === index ? 1 : 0.3);
  }

  /**
   * Clear highlights
   */
  private clearHighlights(): void {
    if (!this.svg) return;

    const g = this.svg.select('.visualization-content');
    g.selectAll('.dataset').style('opacity', 1);
  }

  /**
   * Handle dataset click
   */
  private handleDatasetClick(index: number): void {
    if (this.selectedDataset === index) {
      this.selectedDataset = null;
      this.clearHighlights();
    } else {
      this.selectedDataset = index;
      this.highlightDataset(index);
    }

    window.dispatchEvent(new CustomEvent('radar-dataset-click', {
      detail: { datasetIndex: index }
    }));
  }

  /**
   * Show data point tooltip
   */
  private showDataPointTooltip(event: MouseEvent, point: RadarDataPoint, datasetName: string): void {
    const tooltip = this.getOrCreateTooltip();

    tooltip.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">
        ${point.category}
      </div>
      <div style="font-size: 11px; color: var(--vscode-descriptionForeground); margin-bottom: 8px;">
        ${datasetName}
      </div>
      <div style="margin-bottom: 4px;">
        Score: <strong style="font-size: 16px;">${point.score}</strong>/100
      </div>
      ${point.description ? `
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--vscode-panel-border); font-size: 11px;">
          ${point.description}
        </div>
      ` : ''}
      <div style="margin-top: 8px; font-size: 11px;">
        ${this.getScoreAssessment(point.score)}
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
   * Get score assessment text
   */
  private getScoreAssessment(score: number): string {
    if (score >= 90) return '✅ Excellent';
    if (score >= 70) return '👍 Good';
    if (score >= 50) return '⚠️ Needs improvement';
    return '🔴 Critical';
  }

  /**
   * Hide data point tooltip
   */
  private hideDataPointTooltip(): void {
    const tooltip = document.getElementById('radar-tooltip');
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }

  /**
   * Get or create tooltip
   */
  private getOrCreateTooltip(): HTMLElement {
    let tooltip = document.getElementById('radar-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'radar-tooltip';
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
   * Render legend
   */
  private renderLegend(datasets: RadarData[], colorScale: any): void {
    if (datasets.length <= 1) return; // No need for legend with single dataset

    const legendContainer = this.container.parentElement?.querySelector('.radar-legend');
    if (legendContainer) return;

    const legend = document.createElement('div');
    legend.className = 'radar-legend';
    legend.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: var(--vscode-editorWidget-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      padding: 12px;
      font-size: 11px;
      z-index: 100;
    `;

    let legendHtml = '<div style="font-weight: bold; margin-bottom: 8px;">Datasets</div>';

    datasets.forEach((dataset, index) => {
      const datasetColor = colorScale(String(index));
      legendHtml += `
        <div style="display: flex; align-items: center; margin-bottom: 4px; cursor: pointer;"
             data-dataset-index="${index}">
          <div style="width: 20px; height: 2px; background: ${datasetColor}; margin-right: 8px;"></div>
          <span>${dataset.name}</span>
        </div>
      `;
    });

    legend.innerHTML = legendHtml;
    this.container.parentElement?.appendChild(legend);

    // Add click handlers
    legend.querySelectorAll('[data-dataset-index]').forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.getAttribute('data-dataset-index') || '0');
        this.handleDatasetClick(index);
      });
    });
  }

  /**
   * Clean up
   */
  override destroy(): void {
    const legend = this.container.parentElement?.querySelector('.radar-legend');
    if (legend) {
      legend.remove();
    }

    const tooltip = document.getElementById('radar-tooltip');
    if (tooltip) {
      tooltip.remove();
    }

    super.destroy();
  }
}
