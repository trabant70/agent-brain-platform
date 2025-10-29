/**
 * Calendar Heatmap
 * Day-by-day activity heatmap in calendar format
 *
 * Purpose: Visualize daily activity patterns and identify trends
 * Technique: D3 with calendar layout showing intensity by color
 */

import { BaseVisualization, VisualizationConfig } from './BaseVisualization';

export interface CalendarDay {
  date: Date | string;
  value: number;
  details?: Record<string, any>;
}

export interface CalendarHeatmapData {
  days: CalendarDay[];
  metric: string;
  maxValue?: number;
}

export class CalendarHeatmap extends BaseVisualization {
  private selectedDay: CalendarDay | null = null;

  constructor(container: HTMLElement, config: VisualizationConfig = {}) {
    super(container, config);
  }

  /**
   * Render calendar heatmap
   */
  protected async renderContent(): Promise<void> {
    const d3 = (window as any).d3;
    if (!this.svg) return;

    const data: CalendarHeatmapData = this.data;
    const width = this.getContentWidth();
    const height = this.getContentHeight();

    // Parse dates
    const parsedDays = data.days.map(d => ({
      ...d,
      date: typeof d.date === 'string' ? new Date(d.date) : d.date
    }));

    // Get date range
    const dates = parsedDays.map(d => d.date as Date);
    const minDate = d3.min(dates);
    const maxDate = d3.max(dates);

    // Determine year range
    const startYear = minDate.getFullYear();
    const endYear = maxDate.getFullYear();
    const years = endYear - startYear + 1;

    // Calculate cell size
    const cellSize = Math.min(Math.floor((width - 100) / 53), 15); // 53 weeks max
    const yearHeight = cellSize * 8; // 7 days + spacing

    // Color scale
    const maxVal = data.maxValue || d3.max(parsedDays, (d: CalendarDay) => d.value) || 100;
    const colorScale = d3.scaleSequential()
      .domain([0, maxVal])
      .interpolator(d3.interpolateGreens);

    // Create day map for quick lookup
    const dayMap = new Map(
      parsedDays.map(d => [
        d3.timeFormat('%Y-%m-%d')(d.date as Date),
        d
      ])
    );

    const g = this.svg!.select('.visualization-content');

    // Draw each year
    for (let yearOffset = 0; yearOffset < years; yearOffset++) {
      const year = startYear + yearOffset;
      const yearGroup = g.append('g')
        .attr('class', 'year')
        .attr('transform', `translate(50, ${yearOffset * (yearHeight + 20)})`);

      // Year label
      yearGroup.append('text')
        .attr('x', -10)
        .attr('y', -5)
        .attr('text-anchor', 'end')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .style('fill', 'var(--vscode-foreground)')
        .text(year);

      // Get all days in the year
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31);
      const allDays: Date[] = [];

      for (let d = new Date(yearStart); d <= yearEnd; d.setDate(d.getDate() + 1)) {
        allDays.push(new Date(d));
      }

      // Draw cells
      const cells = yearGroup.selectAll('rect')
        .data(allDays)
        .join('rect')
        .attr('class', 'day')
        .attr('width', cellSize - 1)
        .attr('height', cellSize - 1)
        .attr('x', (d: Date) => this.getWeekNumber(d) * cellSize)
        .attr('y', (d: Date) => d.getDay() * cellSize)
        .attr('fill', (d: Date) => {
          const key = d3.timeFormat('%Y-%m-%d')(d);
          const dayData = dayMap.get(key);
          if (!dayData) return 'var(--vscode-input-background)';
          return colorScale(dayData.value);
        })
        .attr('stroke', 'var(--vscode-panel-border)')
        .attr('stroke-width', 0.5)
        .style('cursor', 'pointer')
        .on('mouseenter', (event: MouseEvent, d: Date) => {
          const key = d3.timeFormat('%Y-%m-%d')(d);
          const dayData = dayMap.get(key);
          if (dayData) {
            this.showDayTooltip(event, dayData, data.metric);
            this.highlightDay(d, cells);
          }
        })
        .on('mouseleave', () => {
          this.hideDayTooltip();
          this.clearDayHighlights(cells);
        })
        .on('click', (_event: MouseEvent, d: Date) => {
          const key = d3.timeFormat('%Y-%m-%d')(d);
          const dayData = dayMap.get(key);
          if (dayData) {
            this.handleDayClick(dayData);
          }
        });

      // Month outlines
      this.drawMonthOutlines(yearGroup, year, cellSize);

      // Day labels (M, W, F)
      const dayLabels = ['M', 'W', 'F'];
      const dayIndices = [1, 3, 5];

      yearGroup.selectAll('.day-label')
        .data(dayIndices)
        .join('text')
        .attr('class', 'day-label')
        .attr('x', -5)
        .attr('y', (d: number) => d * cellSize + cellSize / 2)
        .attr('dy', '0.31em')
        .attr('text-anchor', 'end')
        .style('font-size', '10px')
        .style('fill', 'var(--vscode-descriptionForeground)')
        .text((_d: number, i: number) => dayLabels[i]);
    }

    // Add legend
    this.addLegend(g, colorScale, maxVal, width - 200, height - 50);

    // Add summary stats
    this.addSummaryStats(g, parsedDays, data.metric);
  }

  /**
   * Get week number within year
   */
  private getWeekNumber(date: Date): number {
    const yearStart = new Date(date.getFullYear(), 0, 1);
    const diff = date.getTime() - yearStart.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return Math.floor(diff / oneWeek);
  }

  /**
   * Draw month outlines
   */
  private drawMonthOutlines(g: any, year: number, cellSize: number): void {
    const d3 = (window as any).d3;

    const months: Date[] = [];
    for (let m = 0; m < 12; m++) {
      months.push(new Date(year, m, 1));
    }

    g.selectAll('.month-outline')
      .data(months)
      .join('path')
      .attr('class', 'month-outline')
      .attr('d', (d: Date) => {
        const month = d.getMonth();
        const year = d.getFullYear();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const x1 = this.getWeekNumber(firstDay) * cellSize;
        const x2 = this.getWeekNumber(lastDay) * cellSize + cellSize;
        const y1 = firstDay.getDay() * cellSize;
        const y2 = 7 * cellSize;

        // Simple rectangle outline
        return `M${x1},${y1}L${x2},${y1}L${x2},${y2}L${x1},${y2}Z`;
      })
      .attr('fill', 'none')
      .attr('stroke', 'var(--vscode-foreground)')
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.3);

    // Month labels
    g.selectAll('.month-label')
      .data(months)
      .join('text')
      .attr('class', 'month-label')
      .attr('x', (d: Date) => this.getWeekNumber(d) * cellSize)
      .attr('y', -5)
      .style('font-size', '10px')
      .style('fill', 'var(--vscode-descriptionForeground)')
      .text((d: Date) => d3.timeFormat('%b')(d));
  }

  /**
   * Add legend
   */
  private addLegend(g: any, colorScale: any, maxVal: number, x: number, y: number): void {
    const legendWidth = 150;
    const legendHeight = 15;

    const legend = g.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${x}, ${y})`);

    // Gradient
    const defs = g.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'calendar-gradient')
      .attr('x1', '0%')
      .attr('x2', '100%');

    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const value = (maxVal / steps) * i;
      gradient.append('stop')
        .attr('offset', `${(i / steps) * 100}%`)
        .attr('stop-color', colorScale(value));
    }

    // Legend rect
    legend.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .attr('fill', 'url(#calendar-gradient)')
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
      .text(maxVal.toFixed(0));
  }

  /**
   * Add summary statistics
   */
  private addSummaryStats(g: any, days: CalendarDay[], metric: string): void {
    const stats = document.createElement('div');
    stats.className = 'calendar-stats';
    stats.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      padding: 12px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      font-size: 11px;
      max-width: 200px;
      z-index: 10;
    `;

    const total = days.reduce((sum, d) => sum + d.value, 0);
    const avg = total / days.length;
    const max = Math.max(...days.map(d => d.value));
    const activeDays = days.filter(d => d.value > 0).length;

    stats.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px;">${metric}</div>
      <div style="margin-bottom: 4px;">Total: <strong>${total.toFixed(0)}</strong></div>
      <div style="margin-bottom: 4px;">Average: <strong>${avg.toFixed(1)}</strong></div>
      <div style="margin-bottom: 4px;">Peak: <strong>${max.toFixed(0)}</strong></div>
      <div>Active Days: <strong>${activeDays}/${days.length}</strong></div>
    `;

    this.container.style.position = 'relative';
    this.container.appendChild(stats);
  }

  /**
   * Highlight day
   */
  private highlightDay(date: Date, cells: any): void {
    const d3 = (window as any).d3;
    const targetKey = d3.timeFormat('%Y-%m-%d')(date);

    cells
      .attr('stroke-width', (d: Date) => {
        const key = d3.timeFormat('%Y-%m-%d')(d);
        return key === targetKey ? 2 : 0.5;
      })
      .attr('stroke', (d: Date) => {
        const key = d3.timeFormat('%Y-%m-%d')(d);
        return key === targetKey ? 'var(--vscode-focusBorder)' : 'var(--vscode-panel-border)';
      });
  }

  /**
   * Clear day highlights
   */
  private clearDayHighlights(cells: any): void {
    cells
      .attr('stroke-width', 0.5)
      .attr('stroke', 'var(--vscode-panel-border)');
  }

  /**
   * Show day tooltip
   */
  private showDayTooltip(event: MouseEvent, day: CalendarDay, metric: string): void {
    const d3 = (window as any).d3;
    const tooltip = this.getOrCreateTooltip();

    const dateStr = d3.timeFormat('%A, %B %d, %Y')(day.date as Date);

    let html = `
      <div style="font-weight: bold; margin-bottom: 4px;">
        ${dateStr}
      </div>
      <div>
        ${metric}: <strong>${day.value.toFixed(0)}</strong>
      </div>
    `;

    if (day.details) {
      html += '<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--vscode-panel-border);">';
      Object.entries(day.details).forEach(([key, value]) => {
        html += `<div>${key}: <strong>${value}</strong></div>`;
      });
      html += '</div>';
    }

    html += `
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
  private hideDayTooltip(): void {
    const tooltip = document.getElementById('calendar-heatmap-tooltip');
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }

  /**
   * Get or create tooltip
   */
  private getOrCreateTooltip(): HTMLElement {
    let tooltip = document.getElementById('calendar-heatmap-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'calendar-heatmap-tooltip';
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
   * Handle day click
   */
  private handleDayClick(day: CalendarDay): void {
    const d3 = (window as any).d3;
    this.selectedDay = day;

    window.dispatchEvent(new CustomEvent('calendar-day-click', {
      detail: {
        date: d3.timeFormat('%Y-%m-%d')(day.date as Date),
        value: day.value,
        details: day.details
      }
    }));
  }

  /**
   * Clean up
   */
  override destroy(): void {
    const tooltip = document.getElementById('calendar-heatmap-tooltip');
    if (tooltip) {
      tooltip.remove();
    }

    const stats = this.container.querySelector('.calendar-stats');
    if (stats) {
      stats.remove();
    }

    this.selectedDay = null;

    super.destroy();
  }
}
