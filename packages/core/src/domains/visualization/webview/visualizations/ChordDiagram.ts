/**
 * Chord Diagram
 * Shows dependencies between modules/directories using circular layout
 *
 * Purpose: Identify tight coupling between modules
 * Technique: d3.chord() and d3.ribbon()
 */

import { BaseVisualization, VisualizationConfig } from './BaseVisualization';

export interface ChordData {
  modules: string[];      // Module names
  matrix: number[][];     // Dependency counts [from][to]
}

export class ChordDiagram extends BaseVisualization {
  private selectedModule: number | null = null;

  constructor(container: HTMLElement, config: VisualizationConfig = {}) {
    super(container, config);
  }

  /**
   * Render chord diagram
   */
  protected async renderContent(): Promise<void> {
    const d3 = (window as any).d3;
    if (!this.svg) return;

    const data: ChordData = this.data;
    const width = this.getContentWidth();
    const height = this.getContentHeight();
    const outerRadius = Math.min(width, height) * 0.4;
    const innerRadius = outerRadius - 30;

    // Create chord layout
    const chord = d3.chord()
      .padAngle(0.05)
      .sortSubgroups(d3.descending);

    const chords = chord(data.matrix);

    // Create arc generator for outer arcs
    const arc = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius);

    // Create ribbon generator for connections
    const ribbon = d3.ribbon()
      .radius(innerRadius);

    // Color scale
    const color = d3.scaleOrdinal()
      .domain(d3.range(data.modules.length).map(String))
      .range(d3.schemeCategory10);

    // Center the visualization
    const g = this.svg!.select('.visualization-content')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    // Render ribbons (connections)
    const ribbons = g.append('g')
      .attr('class', 'ribbons')
      .selectAll('path')
      .data(chords)
      .join('path')
      .attr('d', ribbon)
      .attr('fill', (d: any) => color(d.target.index))
      .attr('fill-opacity', 0.6)
      .attr('stroke', (d: any) => d3.rgb(color(d.target.index)).darker())
      .attr('stroke-width', 0.5)
      .style('cursor', 'pointer')
      .on('mouseenter', (event: MouseEvent, d: any) => {
        this.highlightConnection(d, ribbons, groups);
        this.showConnectionTooltip(event, d, data.modules);
      })
      .on('mouseleave', () => {
        this.clearHighlights(ribbons, groups);
        this.hideConnectionTooltip();
      });

    // Render groups (modules)
    const groups = g.append('g')
      .attr('class', 'groups')
      .selectAll('g')
      .data(chords.groups)
      .join('g');

    groups.append('path')
      .attr('d', arc as any)
      .attr('fill', (d: any) => color(d.index))
      .attr('stroke', 'var(--vscode-panel-border)')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseenter', (event: MouseEvent, d: any) => {
        this.highlightModule(d.index, ribbons, groups);
        this.showModuleTooltip(event, d, data);
      })
      .on('mouseleave', () => {
        if (this.selectedModule === null) {
          this.clearHighlights(ribbons, groups);
        }
        this.hideModuleTooltip();
      })
      .on('click', (_event: MouseEvent, d: any) => {
        this.handleModuleClick(d.index, ribbons, groups);
      });

    // Add labels
    groups.append('text')
      .each((d: any) => { d.angle = (d.startAngle + d.endAngle) / 2; })
      .attr('dy', '.35em')
      .attr('transform', (d: any) => {
        const angle = d.angle * 180 / Math.PI - 90;
        const rotate = angle > 90 ? angle + 180 : angle;
        return `
          rotate(${angle})
          translate(${outerRadius + 10})
          ${angle > 90 ? 'rotate(180)' : ''}
        `;
      })
      .attr('text-anchor', (d: any) => {
        const angle = d.angle * 180 / Math.PI - 90;
        return angle > 90 ? 'end' : 'start';
      })
      .text((d: any) => data.modules[d.index])
      .style('font-size', '11px')
      .style('fill', 'var(--vscode-foreground)')
      .style('pointer-events', 'none');

    // Render legend
    this.renderLegend(data.modules, color);
  }

  /**
   * Highlight specific connection
   */
  private highlightConnection(connection: any, ribbons: any, groups: any): void {
    ribbons
      .style('opacity', (d: any) =>
        d === connection ? 1 : 0.1
      );

    groups.selectAll('path')
      .style('opacity', (d: any) =>
        d.index === connection.source.index || d.index === connection.target.index ? 1 : 0.3
      );
  }

  /**
   * Highlight module and its connections
   */
  private highlightModule(moduleIndex: number, ribbons: any, groups: any): void {
    ribbons
      .style('opacity', (d: any) =>
        d.source.index === moduleIndex || d.target.index === moduleIndex ? 0.8 : 0.1
      );

    groups.selectAll('path')
      .style('opacity', (d: any) =>
        d.index === moduleIndex ? 1 : 0.3
      );
  }

  /**
   * Clear all highlights
   */
  private clearHighlights(ribbons: any, groups: any): void {
    ribbons.style('opacity', 0.6);
    groups.selectAll('path').style('opacity', 1);
  }

  /**
   * Handle module click - toggle selection
   */
  private handleModuleClick(moduleIndex: number, ribbons: any, groups: any): void {
    if (this.selectedModule === moduleIndex) {
      // Deselect
      this.selectedModule = null;
      this.clearHighlights(ribbons, groups);
    } else {
      // Select
      this.selectedModule = moduleIndex;
      this.highlightModule(moduleIndex, ribbons, groups);
    }

    // Dispatch event
    window.dispatchEvent(new CustomEvent('chord-module-click', {
      detail: {
        moduleIndex,
        selected: this.selectedModule !== null
      }
    }));
  }

  /**
   * Show connection tooltip
   */
  private showConnectionTooltip(event: MouseEvent, connection: any, modules: string[]): void {
    const tooltip = this.getOrCreateTooltip();

    const sourceModule = modules[connection.source.index];
    const targetModule = modules[connection.target.index];
    const value = connection.source.value;

    tooltip.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">
        Module Dependency
      </div>
      <div style="margin-bottom: 8px;">
        <div style="margin-bottom: 4px;">
          <span style="color: var(--vscode-descriptionForeground);">From:</span>
          <strong>${sourceModule}</strong>
        </div>
        <div>
          <span style="color: var(--vscode-descriptionForeground);">To:</span>
          <strong>${targetModule}</strong>
        </div>
      </div>
      <div>
        <span style="color: var(--vscode-descriptionForeground);">Dependencies:</span>
        <strong>${value}</strong>
      </div>
      <div style="margin-top: 8px; font-size: 11px; color: var(--vscode-descriptionForeground);">
        ${value > 10 ? '⚠️ High coupling detected' : 'Normal coupling level'}
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
   * Show module tooltip
   */
  private showModuleTooltip(event: MouseEvent, group: any, data: ChordData): void {
    const tooltip = this.getOrCreateTooltip();

    const moduleName = data.modules[group.index];

    // Calculate total imports and exports
    const imports = data.matrix[group.index].reduce((sum, val) => sum + val, 0);
    const exports = data.matrix.reduce((sum, row) => sum + row[group.index], 0);
    const total = imports + exports;

    tooltip.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">
        ${moduleName}
      </div>
      <div style="margin-bottom: 8px;">
        <div>Imports from others: <strong>${imports}</strong></div>
        <div>Exported to others: <strong>${exports}</strong></div>
        <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid var(--vscode-panel-border);">
          Total connections: <strong>${total}</strong>
        </div>
      </div>
      <div style="font-size: 11px; color: var(--vscode-descriptionForeground);">
        Click to ${this.selectedModule === group.index ? 'deselect' : 'select'} module
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
   * Hide tooltips
   */
  private hideConnectionTooltip(): void {
    const tooltip = document.getElementById('chord-tooltip');
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }

  private hideModuleTooltip(): void {
    this.hideConnectionTooltip();
  }

  /**
   * Get or create tooltip
   */
  private getOrCreateTooltip(): HTMLElement {
    let tooltip = document.getElementById('chord-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'chord-tooltip';
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
  private renderLegend(modules: string[], color: any): void {
    const legendContainer = this.container.parentElement?.querySelector('.chord-legend');
    if (legendContainer) return;

    const legend = document.createElement('div');
    legend.className = 'chord-legend';
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
      max-height: 300px;
      overflow-y: auto;
      z-index: 100;
    `;

    let legendHtml = '<div style="font-weight: bold; margin-bottom: 8px;">Modules</div>';

    modules.forEach((module, index) => {
      const moduleColor = color(index);
      legendHtml += `
        <div style="display: flex; align-items: center; margin-bottom: 4px;">
          <div style="width: 12px; height: 12px; background: ${moduleColor}; margin-right: 8px; border-radius: 2px;"></div>
          <span>${module}</span>
        </div>
      `;
    });

    legend.innerHTML = legendHtml;
    this.container.parentElement?.appendChild(legend);
  }

  /**
   * Clean up
   */
  override destroy(): void {
    const legend = this.container.parentElement?.querySelector('.chord-legend');
    if (legend) {
      legend.remove();
    }

    const tooltip = document.getElementById('chord-tooltip');
    if (tooltip) {
      tooltip.remove();
    }

    super.destroy();
  }
}
