/**
 * Timeline Visualization
 * Shows how code quality metrics changed over git commits
 *
 * Purpose: Track quality evolution and identify when issues were introduced
 * Technique: Multi-series line chart with d3.line() and d3.scaleTime()
 */

import { BaseVisualization, VisualizationConfig } from './BaseVisualization';

export interface TimelinePoint {
  timestamp: Date;
  commitHash: string;
  commitMessage?: string;
  author?: string;
  overallScore: number;
  categoryScores: Record<string, number>;
  issueCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface TimelineData {
  points: TimelinePoint[];
  categories: string[];  // Category names to display
}

export class TimelineVisualization extends BaseVisualization {
  private selectedCategories: Set<string> = new Set();
  private xScale: any = null;
  private yScale: any = null;

  constructor(container: HTMLElement, config: VisualizationConfig = {}) {
    super(container, config);
  }

  /**
   * Render timeline
   */
  protected async renderContent(): Promise<void> {
    const d3 = (window as any).d3;
    if (!this.svg) return;

    const data: TimelineData = this.data;

    // Validate data
    if (!data || !data.categories || !data.points || data.points.length === 0) {
      this.renderEmpty();
      return;
    }

    const width = this.getContentWidth();
    const height = this.getContentHeight();

    // Initially select all categories
    if (this.selectedCategories.size === 0) {
      data.categories.forEach(cat => this.selectedCategories.add(cat));
    }

    // Create scales
    this.xScale = d3.scaleTime()
      .domain(d3.extent(data.points, (d: TimelinePoint) => d.timestamp))
      .range([0, width]);

    this.yScale = d3.scaleLinear()
      .domain([0, 100])  // Scores are 0-100
      .range([height, 0]);

    // Create axes
    const g = this.svg!.select('.visualization-content');

    // X-axis (time)
    const xAxis = d3.axisBottom(this.xScale)
      .ticks(6)
      .tickFormat(d3.timeFormat('%b %d'));

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .selectAll('text')
      .style('fill', 'var(--vscode-foreground)');

    g.select('.x-axis')
      .selectAll('path, line')
      .style('stroke', 'var(--vscode-panel-border)');

    // Y-axis (score)
    const yAxis = d3.axisLeft(this.yScale)
      .ticks(5);

    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .selectAll('text')
      .style('fill', 'var(--vscode-foreground)');

    g.select('.y-axis')
      .selectAll('path, line')
      .style('stroke', 'var(--vscode-panel-border)');

    // Y-axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -35)
      .attr('text-anchor', 'middle')
      .style('fill', 'var(--vscode-foreground)')
      .style('font-size', '12px')
      .text('Code Quality Score');

    // Create color scale for categories
    const colorScale = d3.scaleOrdinal()
      .domain(data.categories)
      .range(['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']);

    // Line generator
    const line = d3.line()
      .x((d: any) => this.xScale(d.timestamp))
      .y((d: any) => this.yScale(d.score))
      .curve(d3.curveMonotoneX);

    // Render lines for each category (only if more than one point)
    if (data.points.length > 1) {
      data.categories.forEach(category => {
        if (!this.selectedCategories.has(category)) return;

        const categoryData = data.points.map(p => ({
          timestamp: p.timestamp,
          score: p.categoryScores[category] || 0,
          point: p
        }));

        g.append('path')
          .datum(categoryData)
          .attr('class', `line line-${this.sanitizeCategoryName(category)}`)
          .attr('fill', 'none')
          .attr('stroke', colorScale(category))
          .attr('stroke-width', 2)
          .attr('d', line);
      });
    }

    // Render overall score line (thicker, dashed) - only if more than one point
    if (data.points.length > 1) {
      const overallData = data.points.map(p => ({
        timestamp: p.timestamp,
        score: p.overallScore,
        point: p
      }));

      g.append('path')
        .datum(overallData)
        .attr('class', 'line line-overall')
        .attr('fill', 'none')
        .attr('stroke', 'var(--vscode-foreground)')
        .attr('stroke-width', 3)
        .attr('stroke-dasharray', '5,5')
        .attr('d', line);
    }

    // Add interactive dots on commits
    this.renderCommitDots(g, data.points, colorScale);

    // Render legend and controls
    this.renderLegend(data.categories, colorScale);
  }

  /**
   * Render commit dots for interaction
   */
  private renderCommitDots(g: any, points: TimelinePoint[], colorScale: any): void {
    const dotGroup = g.append('g').attr('class', 'commit-dots');

    points.forEach(point => {
      dotGroup.append('circle')
        .attr('cx', this.xScale(point.timestamp))
        .attr('cy', this.yScale(point.overallScore))
        .attr('r', 5)
        .attr('fill', 'var(--vscode-editor-background)')
        .attr('stroke', 'var(--vscode-foreground)')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('mouseenter', (event: MouseEvent) => {
          this.showCommitTooltip(event, point);
        })
        .on('mouseleave', () => {
          this.hideCommitTooltip();
        })
        .on('click', () => {
          this.handleCommitClick(point);
        });
    });
  }

  /**
   * Sanitize category name for CSS class
   */
  private sanitizeCategoryName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }

  /**
   * Show commit tooltip
   */
  private showCommitTooltip(event: MouseEvent, point: TimelinePoint): void {
    const tooltip = this.getOrCreateTooltip();

    const d3 = (window as any).d3;
    const dateFormat = d3.timeFormat('%B %d, %Y %H:%M');

    const categoryScores = Object.entries(point.categoryScores)
      .map(([cat, score]) => `<div>${cat}: <strong>${score}</strong></div>`)
      .join('');

    tooltip.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">
        ${point.commitHash.substring(0, 7)}
      </div>
      <div style="font-size: 11px; color: var(--vscode-descriptionForeground); margin-bottom: 4px;">
        ${dateFormat(point.timestamp)}
      </div>
      ${point.author ? `
        <div style="font-size: 11px; margin-bottom: 8px;">
          by ${point.author}
        </div>
      ` : ''}
      ${point.commitMessage ? `
        <div style="margin-bottom: 8px; padding: 8px; background: var(--vscode-input-background); border-radius: 4px; font-size: 11px;">
          ${point.commitMessage}
        </div>
      ` : ''}
      <div style="margin-bottom: 8px;">
        <div>Overall Score: <strong style="font-size: 14px;">${point.overallScore}</strong></div>
      </div>
      <div style="margin-bottom: 8px;">
        <div style="font-weight: bold; margin-bottom: 4px;">Category Scores:</div>
        ${categoryScores}
      </div>
      <div>
        <div style="font-weight: bold; margin-bottom: 4px;">Issues:</div>
        ${point.issueCounts.critical > 0 ? `<div style="color: #ef4444;">Critical: ${point.issueCounts.critical}</div>` : ''}
        ${point.issueCounts.high > 0 ? `<div style="color: #f97316;">High: ${point.issueCounts.high}</div>` : ''}
        ${point.issueCounts.medium > 0 ? `<div style="color: #f59e0b;">Medium: ${point.issueCounts.medium}</div>` : ''}
        ${point.issueCounts.low > 0 ? `<div style="color: #84cc16;">Low: ${point.issueCounts.low}</div>` : ''}
      </div>
      <div style="margin-top: 8px; font-size: 11px; color: var(--vscode-descriptionForeground);">
        Click to see detailed analysis
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
   * Hide commit tooltip
   */
  private hideCommitTooltip(): void {
    const tooltip = document.getElementById('timeline-tooltip');
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }

  /**
   * Get or create tooltip
   */
  private getOrCreateTooltip(): HTMLElement {
    let tooltip = document.getElementById('timeline-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'timeline-tooltip';
      tooltip.style.cssText = `
        position: fixed;
        max-width: 350px;
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
   * Handle commit click
   */
  private handleCommitClick(point: TimelinePoint): void {
    window.dispatchEvent(new CustomEvent('timeline-commit-click', {
      detail: {
        commitHash: point.commitHash,
        timestamp: point.timestamp,
        overallScore: point.overallScore,
        categoryScores: point.categoryScores,
        issueCounts: point.issueCounts
      }
    }));
  }

  /**
   * Render legend
   */
  private renderLegend(categories: string[], colorScale: any): void {
    const legendContainer = this.container.parentElement?.querySelector('.timeline-legend');
    if (legendContainer) return;

    const legend = document.createElement('div');
    legend.className = 'timeline-legend';
    legend.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: var(--vscode-editorWidget-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      padding: 12px;
      font-size: 11px;
      max-width: 200px;
      z-index: 100;
    `;

    let legendHtml = '<div style="font-weight: bold; margin-bottom: 8px;">Metrics</div>';

    // Overall score
    legendHtml += `
      <div style="display: flex; align-items: center; margin-bottom: 4px; cursor: pointer;" data-category="overall">
        <div style="width: 20px; height: 2px; background: var(--vscode-foreground); margin-right: 8px; border-top: 2px dashed var(--vscode-foreground);"></div>
        <span>Overall Score</span>
      </div>
    `;

    // Categories
    categories.forEach(category => {
      const color = colorScale(category);
      const isSelected = this.selectedCategories.has(category);

      legendHtml += `
        <div style="display: flex; align-items: center; margin-bottom: 4px; cursor: pointer; opacity: ${isSelected ? '1' : '0.4'};"
             data-category="${this.sanitizeCategoryName(category)}"
             data-category-name="${category}">
          <div style="width: 20px; height: 2px; background: ${color}; margin-right: 8px;"></div>
          <span>${category}</span>
        </div>
      `;
    });

    legend.innerHTML = legendHtml;
    this.container.parentElement?.appendChild(legend);

    // Add click handlers to toggle categories
    legend.querySelectorAll('[data-category-name]').forEach(item => {
      item.addEventListener('click', () => {
        const categoryName = item.getAttribute('data-category-name');
        if (categoryName) {
          this.toggleCategory(categoryName);
        }
      });
    });
  }

  /**
   * Toggle category visibility
   */
  private toggleCategory(category: string): void {
    if (this.selectedCategories.has(category)) {
      this.selectedCategories.delete(category);
    } else {
      this.selectedCategories.add(category);
    }

    // Re-render
    if (this.svg) {
      this.svg.select('.visualization-content').selectAll('*').remove();
    }
    this.renderContent();
  }

  /**
   * Render empty state
   */
  private renderEmpty(): void {
    this.container.innerHTML = `
      <div class="visualization-empty" style="padding: 40px; text-align: center; color: var(--vscode-descriptionForeground);">
        <div style="font-size: 32px; margin-bottom: 8px;">📈</div>
        <div>Timeline data not available</div>
        <div style="font-size: 11px; margin-top: 8px;">Historical data will appear here after multiple analyses</div>
      </div>
    `;
  }

  /**
   * Clean up
   */
  override destroy(): void {
    const legend = this.container.parentElement?.querySelector('.timeline-legend');
    if (legend) {
      legend.remove();
    }

    const tooltip = document.getElementById('timeline-tooltip');
    if (tooltip) {
      tooltip.remove();
    }

    super.destroy();
  }
}
