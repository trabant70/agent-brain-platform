/**
 * Stacked Bar Chart
 * Shows top N files with issues, stacked by severity
 *
 * Purpose: Identify files with most issues and their severity distribution
 * Technique: d3.stack() with d3.scaleBand()
 */

import { BaseVisualization, VisualizationConfig } from './BaseVisualization';

export interface FileIssueBreakdown {
  filePath: string;
  fileName: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

export interface StackedBarData {
  files: FileIssueBreakdown[];
  maxCount?: number;  // For scaling
}

export class StackedBarChart extends BaseVisualization {
  private sortBy: 'total' | 'critical' = 'total';

  constructor(container: HTMLElement, config: VisualizationConfig = {}) {
    super(container, config);
  }

  /**
   * Render stacked bar chart
   */
  protected async renderContent(): Promise<void> {
    const d3 = (window as any).d3;
    if (!this.svg) return;

    const data: StackedBarData = this.data;

    // Validate data
    if (!data || !data.files || data.files.length === 0) {
      this.renderEmpty();
      return;
    }

    const width = this.getContentWidth();
    const height = this.getContentHeight();

    // Sort files
    const sortedFiles = this.sortFiles(data.files);

    // Create scales
    const xScale = d3.scaleLinear()
      .domain([0, data.maxCount || d3.max(sortedFiles, (d: FileIssueBreakdown) => d.total)])
      .range([0, width]);

    const yScale = d3.scaleBand()
      .domain(sortedFiles.map(d => d.fileName))
      .range([0, height])
      .padding(0.2);

    // Stack generator
    const stack = d3.stack()
      .keys(['critical', 'high', 'medium', 'low']);

    const stackedData = stack(sortedFiles);

    // Color scale
    const colorScale = d3.scaleOrdinal()
      .domain(['critical', 'high', 'medium', 'low'])
      .range([
        this.getSeverityColor('critical'),
        this.getSeverityColor('high'),
        this.getSeverityColor('medium'),
        this.getSeverityColor('low')
      ]);

    // Create main group
    const g = this.svg!.select('.visualization-content');

    // Draw axes
    const xAxis = d3.axisBottom(xScale)
      .ticks(5);

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .selectAll('text')
      .style('fill', 'var(--vscode-foreground)');

    g.select('.x-axis')
      .selectAll('path, line')
      .style('stroke', 'var(--vscode-panel-border)');

    const yAxis = d3.axisLeft(yScale);

    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .selectAll('text')
      .style('fill', 'var(--vscode-foreground)')
      .style('font-size', '11px');

    g.select('.y-axis')
      .selectAll('path, line')
      .style('stroke', 'var(--vscode-panel-border)');

    // X-axis label
    g.append('text')
      .attr('x', width / 2)
      .attr('y', height + 35)
      .attr('text-anchor', 'middle')
      .style('fill', 'var(--vscode-foreground)')
      .style('font-size', '12px')
      .text('Number of Issues');

    // Draw stacked bars
    const groups = g.selectAll('.severity-group')
      .data(stackedData)
      .join('g')
      .attr('class', 'severity-group')
      .attr('fill', (d: any) => colorScale(d.key));

    groups.selectAll('rect')
      .data((d: any) => {
        // Add severity key to each segment for tooltip access
        return d.map((segment: any) => {
          segment.severity = d.key;
          return segment;
        });
      })
      .join('rect')
      .attr('x', (d: any) => xScale(d[0]))
      .attr('y', (d: any) => yScale(d.data.fileName) || 0)
      .attr('width', (d: any) => xScale(d[1]) - xScale(d[0]))
      .attr('height', yScale.bandwidth())
      .style('cursor', 'pointer')
      .on('mouseenter', (event: MouseEvent, d: any) => {
        this.showSegmentTooltip(event, d);
      })
      .on('mouseleave', () => {
        this.hideSegmentTooltip();
      })
      .on('click', (_event: MouseEvent, d: any) => {
        this.handleBarClick(d.data);
      });

    // Add total count labels at the end of bars
    g.selectAll('.total-label')
      .data(sortedFiles)
      .join('text')
      .attr('class', 'total-label')
      .attr('x', (d: FileIssueBreakdown) => xScale(d.total) + 5)
      .attr('y', (d: FileIssueBreakdown) => (yScale(d.fileName) || 0) + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .style('fill', 'var(--vscode-foreground)')
      .text((d: FileIssueBreakdown) => d.total);

    // Render controls
    this.renderControls();
  }

  /**
   * Sort files by criteria
   */
  private sortFiles(files: FileIssueBreakdown[]): FileIssueBreakdown[] {
    return [...files].sort((a, b) => {
      if (this.sortBy === 'critical') {
        if (b.critical !== a.critical) {
          return b.critical - a.critical;
        }
      }
      return b.total - a.total;
    });
  }

  /**
   * Show segment tooltip
   */
  private showSegmentTooltip(event: MouseEvent, segment: any): void {
    const tooltip = this.getOrCreateTooltip();

    const severity = segment.severity || 'unknown'; // Severity key added during data binding
    const count = segment[1] - segment[0];
    const file = segment.data;

    tooltip.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">
        ${file.fileName}
      </div>
      <div style="margin-bottom: 8px; padding: 8px; background: ${this.getSeverityColor(severity)}20; border-left: 3px solid ${this.getSeverityColor(severity)}; font-size: 11px;">
        <strong>${severity.charAt(0).toUpperCase() + severity.slice(1)}</strong> severity: ${count} issues
      </div>
      <div style="font-size: 11px;">
        <div>Critical: <strong>${file.critical}</strong></div>
        <div>High: <strong>${file.high}</strong></div>
        <div>Medium: <strong>${file.medium}</strong></div>
        <div>Low: <strong>${file.low}</strong></div>
        <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid var(--vscode-panel-border);">
          Total: <strong>${file.total}</strong>
        </div>
      </div>
      <div style="margin-top: 8px; font-size: 11px; color: var(--vscode-descriptionForeground);">
        Click to view file details
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
   * Hide segment tooltip
   */
  private hideSegmentTooltip(): void {
    const tooltip = document.getElementById('stacked-bar-tooltip');
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }

  /**
   * Get or create tooltip
   */
  private getOrCreateTooltip(): HTMLElement {
    let tooltip = document.getElementById('stacked-bar-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'stacked-bar-tooltip';
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
   * Handle bar click
   */
  private handleBarClick(file: FileIssueBreakdown): void {
    window.dispatchEvent(new CustomEvent('stacked-bar-click', {
      detail: {
        filePath: file.filePath,
        fileName: file.fileName,
        breakdown: {
          critical: file.critical,
          high: file.high,
          medium: file.medium,
          low: file.low,
          total: file.total
        }
      }
    }));
  }

  /**
   * Render controls
   */
  private renderControls(): void {
    // Remove existing controls first
    const existingControls = this.container.querySelector('.stacked-bar-controls');
    if (existingControls) {
      existingControls.remove();
    }

    const controls = document.createElement('div');
    controls.className = 'stacked-bar-controls';
    controls.style.cssText = `
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

    controls.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px;">Sort By</div>
      <div style="margin-bottom: 4px;">
        <label style="display: flex; align-items: center; cursor: pointer;">
          <input type="radio" name="sort" value="total" ${this.sortBy === 'total' ? 'checked' : ''} style="margin-right: 6px;">
          Total Issues
        </label>
      </div>
      <div>
        <label style="display: flex; align-items: center; cursor: pointer;">
          <input type="radio" name="sort" value="critical" ${this.sortBy === 'critical' ? 'checked' : ''} style="margin-right: 6px;">
          Critical Issues
        </label>
      </div>
      <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid var(--vscode-panel-border);">
        <div style="font-weight: bold; margin-bottom: 4px;">Legend</div>
        <div style="display: flex; align-items: center; margin-bottom: 2px;">
          <div style="width: 12px; height: 12px; background: ${this.getSeverityColor('critical')}; margin-right: 6px;"></div>
          <span>Critical</span>
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 2px;">
          <div style="width: 12px; height: 12px; background: ${this.getSeverityColor('high')}; margin-right: 6px;"></div>
          <span>High</span>
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 2px;">
          <div style="width: 12px; height: 12px; background: ${this.getSeverityColor('medium')}; margin-right: 6px;"></div>
          <span>Medium</span>
        </div>
        <div style="display: flex; align-items: center;">
          <div style="width: 12px; height: 12px; background: ${this.getSeverityColor('low')}; margin-right: 6px;"></div>
          <span>Low</span>
        </div>
      </div>
    `;

    this.container.appendChild(controls);

    // Add event listeners
    controls.querySelectorAll('input[name="sort"]').forEach(radio => {
      radio.addEventListener('change', (e: Event) => {
        const target = e.target as HTMLInputElement;
        this.sortBy = target.value as 'total' | 'critical';

        // Re-render
        if (this.svg) {
          this.svg.select('.visualization-content').selectAll('*').remove();
        }
        this.renderContent();
      });
    });
  }

  /**
   * Render empty state
   */
  private renderEmpty(): void {
    this.container.innerHTML = `
      <div class="visualization-empty" style="padding: 40px; text-align: center; color: var(--vscode-descriptionForeground);">
        <div style="font-size: 32px; margin-bottom: 8px;">📊</div>
        <div>No file data available</div>
        <div style="font-size: 11px; margin-top: 8px;">Run an analysis to see file-level issue breakdown</div>
      </div>
    `;
  }

  /**
   * Clean up
   */
  override destroy(): void {
    const controls = this.container.querySelector('.stacked-bar-controls');
    if (controls) {
      controls.remove();
    }

    const tooltip = document.getElementById('stacked-bar-tooltip');
    if (tooltip) {
      tooltip.remove();
    }

    super.destroy();
  }
}
