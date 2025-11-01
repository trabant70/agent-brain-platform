/**
 * Test Coverage Network Graph
 * Bipartite layout showing test files connected to source files they cover
 *
 * Purpose: Visualize test coverage relationships
 * Technique: D3 force simulation with bipartite positioning
 */

import { BaseVisualization, VisualizationConfig } from './BaseVisualization';

export interface TestNode {
  id: string;
  name: string;
  type: 'test' | 'source';
  filePath: string;
  coverage?: number;        // Percentage (0-100) for source files
  testCount?: number;       // Number of tests for test files
  linesCovered?: number;
  totalLines?: number;
}

export interface TestLink {
  source: string | number;
  target: string | number;
  coveragePercent: number;  // How much of target this test covers
  linesCovered: number;
}

export interface TestCoverageData {
  nodes: TestNode[];
  links: TestLink[];
  overallCoverage: number;
}

export class TestCoverageNetworkGraph extends BaseVisualization {
  private simulation: any = null;
  private selectedNode: TestNode | null = null;

  constructor(container: HTMLElement, config: VisualizationConfig = {}) {
    super(container, config);
  }

  /**
   * Render test coverage network
   */
  protected async renderContent(): Promise<void> {
    const d3 = (window as any).d3;
    if (!this.svg) return;

    const data: TestCoverageData = this.data;

    // DEFENSIVE: Validate data structure
    if (!data || !Array.isArray(data.nodes) || data.nodes.length === 0) {
      this.renderEmptyState(
        'No test coverage data available',
        '🧪',
        [
          'Run tests with coverage reporting enabled',
          'Ensure your analysis includes test coverage information',
          'Check that test files are properly linked to source files'
        ]
      );
      return;
    }

    if (!Array.isArray(data.links) || data.links.length === 0) {
      this.renderEmptyState(
        'No test-to-source links found',
        '🔗',
        [
          'Coverage data must include relationships between tests and source files',
          'Verify your test coverage tool exports link data'
        ]
      );
      return;
    }

    const width = this.getContentWidth();
    const height = this.getContentHeight();

    // Add controls
    this.addControls();

    // Separate nodes by type for bipartite layout
    const testNodes = data.nodes.filter(n => n.type === 'test');
    const sourceNodes = data.nodes.filter(n => n.type === 'source');

    // Set initial positions for bipartite layout
    const leftX = width * 0.25;
    const rightX = width * 0.75;
    const testSpacing = height / (testNodes.length + 1);
    const sourceSpacing = height / (sourceNodes.length + 1);

    testNodes.forEach((node, i) => {
      (node as any).x = leftX;
      (node as any).y = (i + 1) * testSpacing;
      (node as any).fx = leftX; // Fix x position for bipartite layout
    });

    sourceNodes.forEach((node, i) => {
      (node as any).x = rightX;
      (node as any).y = (i + 1) * sourceSpacing;
      (node as any).fx = rightX; // Fix x position for bipartite layout
    });

    // Create force simulation
    this.simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.links)
        .id((d: any) => d.id)
        .distance(100)
        .strength(0.1))
      .force('charge', d3.forceManyBody()
        .strength(-50))
      .force('y', d3.forceY((d: any) => d.y)
        .strength(0.3))
      .force('collision', d3.forceCollide(20));

    const g = this.svg!.select('.visualization-content');

    // Draw section labels
    this.drawSectionLabels(g, leftX, rightX);

    // Draw links
    const links = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(data.links)
      .join('line')
      .attr('stroke', (d: any) => this.getLinkColor(d))
      .attr('stroke-width', (d: any) => Math.max(1, d.coveragePercent / 10))
      .attr('stroke-opacity', 0.4)
      .attr('stroke-dasharray', (d: any) => d.coveragePercent < 50 ? '3,3' : 'none')
      .style('cursor', 'pointer')
      .on('mouseenter', (event: MouseEvent, d: any) => {
        this.showLinkTooltip(event, d);
        this.highlightLink(d, links, nodes);
      })
      .on('mouseleave', () => {
        this.hideLinkTooltip();
        this.clearHighlights(links, nodes);
      });

    // Draw nodes
    const nodes = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(data.nodes)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(this.drag(this.simulation) as any);

    // Add node circles
    nodes.append('circle')
      .attr('r', (d: any) => d.type === 'test' ? 8 : 10)
      .attr('fill', (d: any) => this.getNodeColor(d))
      .attr('stroke', 'var(--vscode-panel-border)')
      .attr('stroke-width', 2);

    // Add coverage indicators for source nodes
    nodes.filter((d: any) => d.type === 'source' && d.coverage !== undefined)
      .append('circle')
      .attr('r', 14)
      .attr('fill', 'none')
      .attr('stroke', (d: any) => this.getCoverageColor(d.coverage))
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', (d: any) => {
        const circumference = 2 * Math.PI * 14;
        const coverage = d.coverage / 100;
        return `${circumference * coverage} ${circumference * (1 - coverage)}`;
      })
      .attr('transform', 'rotate(-90)');

    // Add labels
    nodes.append('text')
      .attr('dx', (d: any) => d.type === 'test' ? -12 : 12)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d: any) => d.type === 'test' ? 'end' : 'start')
      .text((d: any) => d.name)
      .style('font-size', '10px')
      .style('fill', 'var(--vscode-foreground)')
      .style('pointer-events', 'none');

    // Add event handlers
    nodes
      .on('mouseenter', (event: MouseEvent, d: any) => {
        this.showNodeTooltip(event, d);
        this.highlightNode(d, links, nodes);
      })
      .on('mouseleave', () => {
        this.hideNodeTooltip();
        this.clearHighlights(links, nodes);
      })
      .on('click', (_event: MouseEvent, d: any) => {
        this.handleNodeClick(d);
      });

    // Update positions on simulation tick
    this.simulation.on('tick', () => {
      links
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      nodes.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    // Run simulation briefly then pause
    this.simulation.alpha(1).restart();
    setTimeout(() => {
      this.simulation.alpha(0);
    }, 1000);
  }

  /**
   * Draw section labels
   */
  private drawSectionLabels(g: any, leftX: number, rightX: number): void {
    g.append('text')
      .attr('x', leftX)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .style('fill', 'var(--vscode-foreground)')
      .text('Test Files');

    g.append('text')
      .attr('x', rightX)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .style('fill', 'var(--vscode-foreground)')
      .text('Source Files');
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
      gap: 8px;
      z-index: 10;
    `;

    // Show all button
    const showAllBtn = this.createButton('Show All', () => {
      this.clearHighlights(null, null);
      this.selectedNode = null;
    });

    // Show uncovered button
    const showUncoveredBtn = this.createButton('Show Uncovered', () => {
      this.highlightUncovered();
    });

    controls.appendChild(showAllBtn);
    controls.appendChild(showUncoveredBtn);

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
   * Get node color based on type and coverage
   */
  private getNodeColor(node: TestNode): string {
    if (node.type === 'test') {
      return '#3b82f6'; // Blue for test files
    }

    // Source files colored by coverage
    if (node.coverage === undefined) {
      return '#6b7280'; // Gray if no coverage data
    }

    return this.getCoverageColor(node.coverage);
  }

  /**
   * Get coverage color
   */
  private getCoverageColor(coverage: number): string {
    if (coverage >= 80) return '#10b981'; // Green
    if (coverage >= 50) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  }

  /**
   * Get link color
   */
  private getLinkColor(link: TestLink): string {
    if (link.coveragePercent >= 80) return '#10b981';
    if (link.coveragePercent >= 50) return '#f59e0b';
    return '#ef4444';
  }

  /**
   * Highlight node and connected elements
   */
  private highlightNode(node: TestNode, links: any, nodes: any): void {
    if (!links || !nodes) return;

    const connectedLinks = new Set();
    const connectedNodes = new Set([node.id]);

    links.each((d: any) => {
      if (d.source.id === node.id || d.target.id === node.id) {
        connectedLinks.add(d);
        connectedNodes.add(d.source.id);
        connectedNodes.add(d.target.id);
      }
    });

    links.attr('stroke-opacity', (d: any) => connectedLinks.has(d) ? 0.8 : 0.1);
    nodes.selectAll('circle').attr('opacity', (d: any) => connectedNodes.has(d.id) ? 1 : 0.2);
    nodes.selectAll('text').attr('opacity', (d: any) => connectedNodes.has(d.id) ? 1 : 0.3);
  }

  /**
   * Highlight link and connected nodes
   */
  private highlightLink(link: any, links: any, nodes: any): void {
    if (!links || !nodes) return;

    links.attr('stroke-opacity', (d: any) => d === link ? 0.8 : 0.1);
    nodes.selectAll('circle').attr('opacity', (d: any) =>
      d.id === link.source.id || d.id === link.target.id ? 1 : 0.2
    );
    nodes.selectAll('text').attr('opacity', (d: any) =>
      d.id === link.source.id || d.id === link.target.id ? 1 : 0.3
    );
  }

  /**
   * Clear all highlights
   */
  private clearHighlights(links: any, nodes: any): void {
    const svg = this.svg;
    if (!svg) return;

    const allLinks = links || svg.selectAll('.links line');
    const allNodes = nodes || svg.selectAll('.nodes g');

    allLinks.attr('stroke-opacity', 0.4);
    allNodes.selectAll('circle').attr('opacity', 1);
    allNodes.selectAll('text').attr('opacity', 1);
  }

  /**
   * Highlight uncovered or poorly covered files
   */
  private highlightUncovered(): void {
    const svg = this.svg;
    if (!svg) return;

    const links = svg.selectAll('.links line');
    const nodes = svg.selectAll('.nodes g');

    nodes.selectAll('circle').attr('opacity', (d: any) => {
      if (d.type === 'test') return 0.3;
      return (d.coverage !== undefined && d.coverage < 50) ? 1 : 0.2;
    });

    nodes.selectAll('text').attr('opacity', (d: any) => {
      if (d.type === 'test') return 0.3;
      return (d.coverage !== undefined && d.coverage < 50) ? 1 : 0.2;
    });

    links.attr('stroke-opacity', (d: any) => d.coveragePercent < 50 ? 0.6 : 0.1);
  }

  /**
   * Show node tooltip
   */
  private showNodeTooltip(event: MouseEvent, node: TestNode): void {
    const tooltip = this.getOrCreateTooltip();

    let content = `
      <div style="font-weight: bold; margin-bottom: 4px;">
        ${node.name}
      </div>
      <div style="font-size: 11px; color: var(--vscode-descriptionForeground); margin-bottom: 8px;">
        ${node.type === 'test' ? 'Test File' : 'Source File'}
      </div>
    `;

    if (node.type === 'test') {
      content += `
        <div>Tests: <strong>${node.testCount || 0}</strong></div>
      `;
    } else {
      content += `
        <div>Coverage: <strong style="color: ${this.getCoverageColor(node.coverage || 0)}">${node.coverage?.toFixed(1) || 0}%</strong></div>
        ${node.linesCovered !== undefined ? `
          <div>Lines: <strong>${node.linesCovered}/${node.totalLines}</strong></div>
        ` : ''}
      `;
    }

    content += `
      <div style="margin-top: 8px; font-size: 11px; color: var(--vscode-descriptionForeground);">
        Click for details
      </div>
    `;

    tooltip.innerHTML = content;
    tooltip.style.display = 'block';
    tooltip.style.left = `${event.clientX + 10}px`;
    tooltip.style.top = `${event.clientY + 10}px`;

    this.adjustTooltipPosition(tooltip);
  }

  /**
   * Show link tooltip
   */
  private showLinkTooltip(event: MouseEvent, link: any): void {
    const tooltip = this.getOrCreateTooltip();

    tooltip.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">
        Coverage Link
      </div>
      <div style="margin-bottom: 8px;">
        <div style="margin-bottom: 4px;">
          <span style="color: var(--vscode-descriptionForeground);">Test:</span>
          <strong>${link.source.name}</strong>
        </div>
        <div>
          <span style="color: var(--vscode-descriptionForeground);">Source:</span>
          <strong>${link.target.name}</strong>
        </div>
      </div>
      <div>
        Coverage: <strong style="color: ${this.getLinkColor(link)}">${link.coveragePercent.toFixed(1)}%</strong>
      </div>
      <div>Lines covered: <strong>${link.linesCovered}</strong></div>
    `;

    tooltip.style.display = 'block';
    tooltip.style.left = `${event.clientX + 10}px`;
    tooltip.style.top = `${event.clientY + 10}px`;

    this.adjustTooltipPosition(tooltip);
  }

  /**
   * Hide tooltips
   */
  private hideNodeTooltip(): void {
    const tooltip = document.getElementById('test-coverage-tooltip');
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }

  private hideLinkTooltip(): void {
    this.hideNodeTooltip();
  }

  /**
   * Get or create tooltip
   */
  private getOrCreateTooltip(): HTMLElement {
    let tooltip = document.getElementById('test-coverage-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'test-coverage-tooltip';
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
   * Adjust tooltip position if off screen
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
   * Handle node click
   */
  private handleNodeClick(node: TestNode): void {
    this.selectedNode = node;

    window.dispatchEvent(new CustomEvent('test-coverage-node-click', {
      detail: {
        id: node.id,
        name: node.name,
        type: node.type,
        filePath: node.filePath,
        coverage: node.coverage
      }
    }));
  }

  /**
   * Drag behavior
   */
  private drag(simulation: any): any {
    const d3 = (window as any).d3;

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fy = null;
    }

    return d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
  }

  /**
   * Clean up
   */
  override destroy(): void {
    if (this.simulation) {
      this.simulation.stop();
      this.simulation = null;
    }

    const tooltip = document.getElementById('test-coverage-tooltip');
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
