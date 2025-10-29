/**
 * Gauge Chart
 * Semi-circular gauge for single metric display with target indicators
 *
 * Purpose: Show current value vs target with color zones
 * Technique: D3 arc generation with needle indicator
 */

import { BaseVisualization, VisualizationConfig } from './BaseVisualization';

export interface GaugeZone {
  from: number;
  to: number;
  color: string;
  label?: string;
}

export interface GaugeData {
  value: number;
  min: number;
  max: number;
  target?: number;
  zones?: GaugeZone[];
  unit?: string;
  title?: string;
  subtitle?: string;
}

export class GaugeChart extends BaseVisualization {
  private needle: any = null;
  private currentValue: number = 0;

  constructor(container: HTMLElement, config: VisualizationConfig = {}) {
    super(container, config);
  }

  /**
   * Render gauge chart
   */
  protected async renderContent(): Promise<void> {
    const d3 = (window as any).d3;
    if (!this.svg) return;

    const data: GaugeData = this.data;
    const width = this.getContentWidth();
    const height = this.getContentHeight();

    // Calculate dimensions
    const radius = Math.min(width, height * 1.5) / 2 - 20;
    const centerX = width / 2;
    const centerY = height * 0.75;

    // Create scales
    const angleScale = d3.scaleLinear()
      .domain([data.min, data.max])
      .range([-Math.PI / 2, Math.PI / 2])
      .clamp(true);

    const g = this.svg!.select('.visualization-content')
      .attr('transform', `translate(${centerX},${centerY})`);

    // Draw zones (background arcs)
    if (data.zones && data.zones.length > 0) {
      this.drawZones(g, data.zones, angleScale, radius);
    } else {
      // Default zones: red, yellow, green
      const defaultZones: GaugeZone[] = [
        { from: data.min, to: data.min + (data.max - data.min) * 0.33, color: '#ef4444', label: 'Low' },
        { from: data.min + (data.max - data.min) * 0.33, to: data.min + (data.max - data.min) * 0.67, color: '#f59e0b', label: 'Medium' },
        { from: data.min + (data.max - data.min) * 0.67, to: data.max, color: '#22c55e', label: 'High' }
      ];
      this.drawZones(g, defaultZones, angleScale, radius);
    }

    // Draw ticks
    this.drawTicks(g, data, angleScale, radius);

    // Draw target indicator
    if (data.target !== undefined) {
      this.drawTarget(g, data.target, angleScale, radius);
    }

    // Draw needle
    this.needle = this.drawNeedle(g, data.value, angleScale, radius);
    this.currentValue = data.value;

    // Draw center circle
    g.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', 8)
      .attr('fill', 'var(--vscode-editor-background)')
      .attr('stroke', 'var(--vscode-foreground)')
      .attr('stroke-width', 2);

    // Draw value display
    this.drawValueDisplay(g, data, radius);

    // Draw title
    if (data.title) {
      g.append('text')
        .attr('x', 0)
        .attr('y', -radius - 30)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('font-weight', 'bold')
        .style('fill', 'var(--vscode-foreground)')
        .text(data.title);
    }

    // Draw subtitle
    if (data.subtitle) {
      g.append('text')
        .attr('x', 0)
        .attr('y', -radius - 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', 'var(--vscode-descriptionForeground)')
        .text(data.subtitle);
    }

    // Add interactivity
    this.addInteractivity(g, data, angleScale, radius);
  }

  /**
   * Draw color zones
   */
  private drawZones(
    g: any,
    zones: GaugeZone[],
    angleScale: any,
    radius: number
  ): void {
    const d3 = (window as any).d3;

    const arc = d3.arc()
      .innerRadius(radius * 0.75)
      .outerRadius(radius)
      .startAngle((d: GaugeZone) => angleScale(d.from))
      .endAngle((d: GaugeZone) => angleScale(d.to));

    g.append('g')
      .attr('class', 'zones')
      .selectAll('path')
      .data(zones)
      .join('path')
      .attr('d', arc)
      .attr('fill', (d: GaugeZone) => d.color)
      .attr('opacity', 0.8)
      .attr('stroke', 'var(--vscode-panel-border)')
      .attr('stroke-width', 1);
  }

  /**
   * Draw tick marks and labels
   */
  private drawTicks(
    g: any,
    data: GaugeData,
    angleScale: any,
    radius: number
  ): void {
    const numTicks = 5;
    const tickValues: number[] = [];
    const step = (data.max - data.min) / (numTicks - 1);

    for (let i = 0; i < numTicks; i++) {
      tickValues.push(data.min + step * i);
    }

    const ticks = g.append('g')
      .attr('class', 'ticks')
      .selectAll('g')
      .data(tickValues)
      .join('g')
      .attr('transform', (d: number) => {
        const angle = angleScale(d);
        return `rotate(${(angle * 180 / Math.PI)})`;
      });

    // Tick lines
    ticks.append('line')
      .attr('x1', radius * 0.75 - 5)
      .attr('x2', radius * 0.75)
      .attr('y1', 0)
      .attr('y2', 0)
      .attr('stroke', 'var(--vscode-foreground)')
      .attr('stroke-width', 2);

    // Tick labels - position them outside the arc and rotate for readability
    g.append('g')
      .attr('class', 'tick-labels')
      .selectAll('text')
      .data(tickValues)
      .join('text')
      .attr('transform', (d: number) => {
        const angle = angleScale(d);
        const labelRadius = radius * 0.75 - 20;
        const x = Math.cos(angle) * labelRadius;
        const y = Math.sin(angle) * labelRadius;
        // Rotate each label by -90 degrees (counter-clockwise quarter turn)
        const angleDeg = angle * 180 / Math.PI;
        const rotationAngle = angleDeg - 90;
        return `translate(${x},${y}) rotate(${rotationAngle})`;
      })
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('font-size', '11px')
      .style('fill', 'var(--vscode-foreground)')
      .text((d: number) => d.toFixed(0));
  }

  /**
   * Draw target indicator
   */
  private drawTarget(
    g: any,
    target: number,
    angleScale: any,
    radius: number
  ): void {
    const angle = angleScale(target);

    const targetGroup = g.append('g')
      .attr('class', 'target-indicator')
      .attr('transform', `rotate(${(angle * 180 / Math.PI)})`);

    // Target line
    targetGroup.append('line')
      .attr('x1', radius * 0.7)
      .attr('x2', radius * 1.05)
      .attr('y1', 0)
      .attr('y2', 0)
      .attr('stroke', 'var(--vscode-charts-orange)')
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', '5,5');

    // Target marker
    targetGroup.append('circle')
      .attr('cx', radius * 1.05)
      .attr('cy', 0)
      .attr('r', 5)
      .attr('fill', 'var(--vscode-charts-orange)')
      .attr('stroke', 'var(--vscode-editor-background)')
      .attr('stroke-width', 2);

    // Target label
    const labelAngle = angle;
    const labelRadius = radius * 1.15;
    const labelX = Math.cos(labelAngle) * labelRadius;
    const labelY = Math.sin(labelAngle) * labelRadius;

    g.append('text')
      .attr('x', labelX)
      .attr('y', labelY)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .style('fill', 'var(--vscode-charts-orange)')
      .text(`Target: ${target.toFixed(0)}`);
  }

  /**
   * Draw needle indicator
   */
  private drawNeedle(
    g: any,
    value: number,
    angleScale: any,
    radius: number
  ): any {
    const angle = angleScale(value);

    const needleGroup = g.append('g')
      .attr('class', 'needle')
      .attr('transform', `rotate(${(angle * 180 / Math.PI)})`);

    // Needle path (triangle)
    const needleLength = radius * 0.7;
    const needleWidth = 6;

    needleGroup.append('path')
      .attr('d', `M 0,${-needleWidth} L ${needleLength},0 L 0,${needleWidth} Z`)
      .attr('fill', 'var(--vscode-focusBorder)')
      .attr('stroke', 'var(--vscode-foreground)')
      .attr('stroke-width', 1);

    return needleGroup;
  }

  /**
   * Draw value display
   */
  private drawValueDisplay(
    g: any,
    data: GaugeData,
    radius: number
  ): void {
    const valueGroup = g.append('g')
      .attr('class', 'value-display')
      .attr('transform', `translate(0,${radius * 0.4})`);

    // Current value
    valueGroup.append('text')
      .attr('x', 0)
      .attr('y', 0)
      .attr('text-anchor', 'middle')
      .style('font-size', '32px')
      .style('font-weight', 'bold')
      .style('fill', 'var(--vscode-foreground)')
      .text(data.value.toFixed(1));

    // Unit
    if (data.unit) {
      valueGroup.append('text')
        .attr('x', 0)
        .attr('y', 25)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', 'var(--vscode-descriptionForeground)')
        .text(data.unit);
    }

    // Percentage of range
    const percentage = ((data.value - data.min) / (data.max - data.min)) * 100;
    valueGroup.append('text')
      .attr('x', 0)
      .attr('y', 45)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', 'var(--vscode-descriptionForeground)')
      .text(`${percentage.toFixed(0)}% of range`);
  }

  /**
   * Add interactivity
   */
  private addInteractivity(
    g: any,
    data: GaugeData,
    angleScale: any,
    radius: number
  ): void {
    const d3 = (window as any).d3;

    // Add invisible arc for hover detection
    const arc = d3.arc()
      .innerRadius(0)
      .outerRadius(radius)
      .startAngle(-Math.PI / 2)
      .endAngle(Math.PI / 2);

    g.append('path')
      .attr('d', arc)
      .attr('fill', 'transparent')
      .style('cursor', 'pointer')
      .on('mousemove', (event: MouseEvent) => {
        const [x, y] = d3.pointer(event);
        const angle = Math.atan2(y, x);

        // Only show tooltip if within gauge range
        if (angle >= -Math.PI / 2 && angle <= Math.PI / 2) {
          const value = angleScale.invert(angle);
          this.showGaugeTooltip(event, value, data);
        }
      })
      .on('mouseleave', () => {
        this.hideGaugeTooltip();
      })
      .on('click', () => {
        this.handleGaugeClick(data);
      });
  }

  /**
   * Show gauge tooltip
   */
  private showGaugeTooltip(event: MouseEvent, hoverValue: number, data: GaugeData): void {
    const tooltip = this.getOrCreateTooltip();

    let html = `
      <div style="font-weight: bold; margin-bottom: 8px;">
        Gauge Details
      </div>
      <div style="margin-bottom: 4px;">
        Current: <strong>${data.value.toFixed(1)}${data.unit || ''}</strong>
      </div>
      <div style="margin-bottom: 4px;">
        Hover: <strong>${hoverValue.toFixed(1)}${data.unit || ''}</strong>
      </div>
      <div style="margin-bottom: 4px;">
        Range: <strong>${data.min} - ${data.max}</strong>
      </div>
    `;

    if (data.target !== undefined) {
      const diff = data.value - data.target;
      const diffStr = diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
      html += `
        <div style="margin-bottom: 4px;">
          Target: <strong>${data.target.toFixed(1)}</strong>
        </div>
        <div style="color: ${diff >= 0 ? 'var(--vscode-charts-green)' : 'var(--vscode-charts-red)'};">
          Difference: <strong>${diffStr}</strong>
        </div>
      `;
    }

    tooltip.innerHTML = html;
    tooltip.style.display = 'block';
    tooltip.style.left = `${event.clientX + 10}px`;
    tooltip.style.top = `${event.clientY + 10}px`;

    this.adjustTooltipPosition(tooltip);
  }

  /**
   * Hide tooltip
   */
  private hideGaugeTooltip(): void {
    const tooltip = document.getElementById('gauge-chart-tooltip');
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }

  /**
   * Get or create tooltip
   */
  private getOrCreateTooltip(): HTMLElement {
    let tooltip = document.getElementById('gauge-chart-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'gauge-chart-tooltip';
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
   * Handle gauge click
   */
  private handleGaugeClick(data: GaugeData): void {
    window.dispatchEvent(new CustomEvent('gauge-click', {
      detail: {
        value: data.value,
        target: data.target,
        min: data.min,
        max: data.max,
        title: data.title
      }
    }));
  }

  /**
   * Animate needle to new value
   */
  async animateToValue(newValue: number, duration: number = 1000): Promise<void> {
    const d3 = (window as any).d3;
    if (!this.needle || !this.data) return;

    const data: GaugeData = this.data;
    const angleScale = d3.scaleLinear()
      .domain([data.min, data.max])
      .range([-Math.PI / 2, Math.PI / 2])
      .clamp(true);

    const oldAngle = angleScale(this.currentValue);
    const newAngle = angleScale(newValue);

    return new Promise((resolve) => {
      this.needle
        .transition()
        .duration(duration)
        .attrTween('transform', () => {
          const interpolate = d3.interpolate(oldAngle, newAngle);
          return (t: number) => {
            const angle = interpolate(t);
            return `rotate(${(angle * 180 / Math.PI)})`;
          };
        })
        .on('end', () => {
          this.currentValue = newValue;
          resolve();
        });
    });
  }

  /**
   * Update gauge with new data
   */
  override async update(newData: GaugeData): Promise<void> {
    const oldValue = this.data ? (this.data as GaugeData).value : 0;
    await super.update(newData);

    if (this.needle && oldValue !== newData.value) {
      await this.animateToValue(newData.value);
    }
  }

  /**
   * Clean up
   */
  override destroy(): void {
    const tooltip = document.getElementById('gauge-chart-tooltip');
    if (tooltip) {
      tooltip.remove();
    }

    this.needle = null;
    this.currentValue = 0;

    super.destroy();
  }
}
