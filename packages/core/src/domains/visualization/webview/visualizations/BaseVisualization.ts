/**
 * Base class for all D3 visualizations
 * Provides common functionality for rendering, resizing, and updating
 */

import { Logger, LogCategory, LogPathway } from '../../../../infrastructure/logging/Logger';

const logger = Logger.getInstance();

export interface VisualizationConfig {
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  interactive?: boolean;
  showLabels?: boolean;
  colorScheme?: string;
}

export interface VisualizationData {
  type: string;
  categoryId: string;
  title: string;
  data: any;
  config: VisualizationConfig;
}

export abstract class BaseVisualization {
  protected container: HTMLElement;
  protected svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  protected config: Required<VisualizationConfig>;
  protected data: any;
  protected resizeObserver: ResizeObserver | null = null;

  constructor(container: HTMLElement, config: VisualizationConfig = {}) {
    this.container = container;

    // Use container dimensions if not explicitly set
    const containerWidth = container.clientWidth || container.offsetWidth || 800;
    const containerHeight = container.clientHeight || container.offsetHeight || 400;

    this.config = {
      width: config.width || containerWidth,
      height: config.height || containerHeight,
      margin: config.margin || { top: 20, right: 20, bottom: 30, left: 40 },
      interactive: config.interactive !== false,
      showLabels: config.showLabels !== false,
      colorScheme: config.colorScheme || 'category10'
    };
  }

  /**
   * Initialize the visualization
   */
  async initialize(): Promise<void> {
    console.log(`[BaseViz] Initialize starting for ${this.container.id}`);
    console.log(`[BaseViz] Container dimensions:`, {
      clientWidth: this.container.clientWidth,
      clientHeight: this.container.clientHeight,
      offsetWidth: this.container.offsetWidth,
      offsetHeight: this.container.offsetHeight
    });

    this.container.innerHTML = '';

    // Setup resize observer for responsive behavior
    if (this.config.interactive) {
      this.setupResizeObserver();
    }

    await this.createSVG();
    console.log(`[BaseViz] Initialize completed, svg created: ${!!this.svg}`);
  }

  /**
   * Create the base SVG element
   */
  protected createSVG(): void {
    const d3 = (window as any).d3;
    console.log(`[BaseViz] D3 available: ${!!d3}`);

    if (!d3) {
      console.error('[BaseViz] D3 is not loaded!');
      throw new Error('D3 is not loaded');
    }

    console.log(`[BaseViz] Creating SVG with config:`, {
      width: this.config.width,
      height: this.config.height,
      margin: this.config.margin
    });

    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', this.config.width)
      .attr('height', this.config.height)
      .attr('class', 'visualization-svg');

    console.log(`[BaseViz] SVG created: ${!!this.svg}, node: ${!!this.svg?.node()}`);

    // Add a main group for content (respecting margins)
    if (this.svg) {
      const contentGroup = this.svg.append('g')
        .attr('class', 'visualization-content')
        .attr('transform', `translate(${this.config.margin.left},${this.config.margin.top})`);
      console.log(`[BaseViz] Content group created: ${!!contentGroup}`);
    }
  }

  /**
   * Render the visualization with data
   */
  async render(data: any): Promise<void> {
    console.log(`[BaseViz] Render starting for ${this.container.id}, has data: ${!!data}`);
    this.data = data;

    if (!this.svg) {
      console.log('[BaseViz] No SVG, initializing...');
      await this.initialize();
    }

    // Clear previous content
    if (this.svg) {
      const contentGroup = this.svg.select('.visualization-content');
      console.log(`[BaseViz] Content group found: ${!!contentGroup.node()}`);
      contentGroup.selectAll('*').remove();
    }

    // Render the specific visualization
    console.log('[BaseViz] Calling renderContent()...');
    await this.renderContent();
    console.log('[BaseViz] renderContent() completed');

    // Add interactions if enabled
    if (this.config.interactive) {
      this.addInteractions();
    }
  }

  /**
   * Abstract method to render specific visualization content
   */
  protected abstract renderContent(): Promise<void>;

  /**
   * Add interactive behaviors (hover, click, etc.)
   */
  protected addInteractions(): void {
    // Override in subclasses for specific interactions
  }

  /**
   * Update visualization with new data
   */
  async update(data: any): Promise<void> {
    await this.render(data);
  }

  /**
   * Setup responsive resizing
   */
  protected setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (width > 0 && width !== this.config.width) {
          this.handleResize(width);
        }
      }
    });

    this.resizeObserver.observe(this.container);
  }

  /**
   * Handle container resize
   */
  protected handleResize(newWidth: number): void {
    this.config.width = newWidth;
    if (this.data) {
      this.render(this.data);
    }
  }

  /**
   * Get the content width (excluding margins)
   */
  protected getContentWidth(): number {
    return this.config.width - this.config.margin.left - this.config.margin.right;
  }

  /**
   * Get the content height (excluding margins)
   */
  protected getContentHeight(): number {
    return this.config.height - this.config.margin.top - this.config.margin.bottom;
  }

  /**
   * Get D3 color scale based on config
   */
  protected getColorScale(): any {
    const d3 = (window as any).d3;

    switch (this.config.colorScheme) {
      case 'category10':
        return d3.scaleOrdinal(d3.schemeCategory10);
      case 'category20':
        return d3.scaleOrdinal(d3.schemeCategory10.concat(d3.schemeCategory10));
      case 'reds':
        return d3.scaleSequential(d3.interpolateReds);
      case 'blues':
        return d3.scaleSequential(d3.interpolateBlues);
      case 'greens':
        return d3.scaleSequential(d3.interpolateGreens);
      case 'custom':
        return this.getCustomColorScale();
      default:
        return d3.scaleOrdinal(d3.schemeCategory10);
    }
  }

  /**
   * Override for custom color scales
   */
  protected getCustomColorScale(): any {
    const d3 = (window as any).d3;
    return d3.scaleOrdinal(d3.schemeCategory10);
  }

  /**
   * Get severity-based color
   */
  protected getSeverityColor(severity: string): string {
    const colors: Record<string, string> = {
      critical: '#ef4444',
      high: '#f97316',
      medium: '#f59e0b',
      low: '#84cc16',
      info: '#3b82f6'
    };
    return colors[severity] || '#6b7280';
  }

  /**
   * Get status-based color
   */
  protected getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      excellent: '#10b981',
      good: '#84cc16',
      warning: '#f59e0b',
      critical: '#ef4444'
    };
    return colors[status] || '#6b7280';
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    this.container.innerHTML = '';
    this.svg = null;
  }
}
