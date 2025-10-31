/**
 * Visualization Manager
 * Coordinates multiple visualizations and provides a unified interface
 * Handles rendering, updates, and cleanup of all visualization types
 */

import { BaseVisualization, VisualizationData } from './BaseVisualization';
import { SankeyDiagram } from './SankeyDiagram';
import { HeatmapVisualization } from './HeatmapVisualization';
import { BubbleChart } from './BubbleChart';
import { SunburstDiagram } from './SunburstDiagram';
import { DependencyGraph } from './DependencyGraph';
import { TreemapVisualization } from './TreemapVisualization';
import { TimelineVisualization } from './TimelineVisualization';
import { ChordDiagram } from './ChordDiagram';
import { RadarChart } from './RadarChart';
import { StackedBarChart } from './StackedBarChart';
import { MultiLayerSankey } from './MultiLayerSankey';
import { TestCoverageNetworkGraph } from './TestCoverageNetworkGraph';
import { I18nGeographicHeatmap } from './I18nGeographicHeatmap';
import { ArcDiagram } from './ArcDiagram';
import { MatrixView } from './MatrixView';
import { ParallelCoordinates } from './ParallelCoordinates';
import { StreamGraph } from './StreamGraph';
import { CalendarHeatmap } from './CalendarHeatmap';
import { GaugeChart } from './GaugeChart';
import { FlameGraph } from './FlameGraph';
import { AnalysisDataMapper, type AnalysisData } from '../coordination/AnalysisDataMapper';
import { VisualizationCoordinator } from '../coordination/VisualizationCoordinator';

export type VisualizationType =
  | 'sankey'
  | 'heatmap'
  | 'bubble'
  | 'sunburst'
  | 'dependency-graph'
  | 'treemap'
  | 'timeline'
  | 'chord'
  | 'radar'
  | 'stacked-bar'
  | 'multi-layer-sankey'
  | 'test-coverage-network'
  | 'i18n-geographic-heatmap'
  | 'arc-diagram'
  | 'matrix-view'
  | 'parallel-coordinates'
  | 'stream-graph'
  | 'calendar-heatmap'
  | 'gauge'
  | 'flame-graph';

export interface VisualizationManagerConfig {
  enableInteractions?: boolean;
  showLabels?: boolean;
  colorScheme?: string;
  useCoordinator?: boolean;
}

/**
 * Manages lifecycle of visualizations in the Code Structure Review
 */
export class VisualizationManager {
  private visualizations: Map<string, BaseVisualization> = new Map();
  private config: VisualizationManagerConfig;
  private dataMapper: AnalysisDataMapper;
  private coordinator: VisualizationCoordinator | null = null;

  constructor(config: VisualizationManagerConfig = {}) {
    this.config = {
      enableInteractions: config.enableInteractions !== false,
      showLabels: config.showLabels !== false,
      colorScheme: config.colorScheme || 'category10',
      useCoordinator: config.useCoordinator !== false
    };
    this.dataMapper = new AnalysisDataMapper();

    // Initialize coordinator if enabled
    if (this.config.useCoordinator) {
      this.coordinator = new VisualizationCoordinator(this, this.dataMapper);
    }
  }

  /**
   * Initialize with coordinator (for advanced navigation)
   */
  initializeCoordinator(analysisData: AnalysisData): void {
    if (!this.coordinator) {
      this.coordinator = new VisualizationCoordinator(this, this.dataMapper);
    }
    this.coordinator.initialize(analysisData);
  }

  /**
   * Get coordinator instance
   */
  getCoordinator(): VisualizationCoordinator | null {
    return this.coordinator;
  }

  /**
   * Create and render a visualization
   */
  async createVisualization(
    containerId: string,
    type: VisualizationType,
    data: any,
    title?: string
  ): Promise<BaseVisualization | null> {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container ${containerId} not found`);
      return null;
    }

    // Clean up existing visualization in this container
    this.destroyVisualization(containerId);

    // Create new visualization based on type
    let visualization: BaseVisualization | null = null;

    try {
      switch (type) {
        case 'sankey':
          visualization = new SankeyDiagram(container, {
            interactive: this.config.enableInteractions,
            showLabels: this.config.showLabels,
            colorScheme: this.config.colorScheme
          });
          break;

        case 'heatmap':
          visualization = new HeatmapVisualization(container, {
            interactive: this.config.enableInteractions,
            showLabels: this.config.showLabels,
            colorScheme: this.config.colorScheme
          });
          break;

        case 'bubble':
          visualization = new BubbleChart(container, {
            interactive: this.config.enableInteractions,
            showLabels: this.config.showLabels,
            colorScheme: this.config.colorScheme
          });
          break;

        case 'sunburst':
          visualization = new SunburstDiagram(container, {
            interactive: this.config.enableInteractions,
            showLabels: this.config.showLabels,
            colorScheme: this.config.colorScheme
          });
          break;

        case 'dependency-graph':
          visualization = new DependencyGraph(container, {
            interactive: this.config.enableInteractions,
            showLabels: this.config.showLabels,
            colorScheme: this.config.colorScheme
          });
          break;

        case 'treemap':
          visualization = new TreemapVisualization(container, {
            interactive: this.config.enableInteractions,
            showLabels: this.config.showLabels,
            colorScheme: this.config.colorScheme
          });
          break;

        case 'timeline':
          visualization = new TimelineVisualization(container, {
            interactive: this.config.enableInteractions,
            showLabels: this.config.showLabels,
            colorScheme: this.config.colorScheme
          });
          break;

        case 'chord':
          visualization = new ChordDiagram(container, {
            interactive: this.config.enableInteractions,
            showLabels: this.config.showLabels,
            colorScheme: this.config.colorScheme
          });
          break;

        case 'radar':
          visualization = new RadarChart(container, {
            interactive: this.config.enableInteractions,
            showLabels: this.config.showLabels,
            colorScheme: this.config.colorScheme
          });
          break;

        case 'stacked-bar':
          visualization = new StackedBarChart(container, {
            interactive: this.config.enableInteractions,
            showLabels: this.config.showLabels,
            colorScheme: this.config.colorScheme
          });
          break;

        case 'multi-layer-sankey':
          visualization = new MultiLayerSankey(container, {
            interactive: this.config.enableInteractions,
            showLabels: this.config.showLabels,
            colorScheme: this.config.colorScheme
          });
          break;

        case 'test-coverage-network':
          visualization = new TestCoverageNetworkGraph(container, {
            interactive: this.config.enableInteractions,
            showLabels: this.config.showLabels,
            colorScheme: this.config.colorScheme
          });
          break;

        case 'i18n-geographic-heatmap':
          visualization = new I18nGeographicHeatmap(container, {
            interactive: this.config.enableInteractions,
            showLabels: this.config.showLabels,
            colorScheme: this.config.colorScheme
          });
          break;

        case 'arc-diagram':
          visualization = new ArcDiagram(container, {
            interactive: this.config.enableInteractions,
            showLabels: this.config.showLabels,
            colorScheme: this.config.colorScheme
          });
          break;

        case 'matrix-view':
          visualization = new MatrixView(container, {
            interactive: this.config.enableInteractions,
            showLabels: this.config.showLabels,
            colorScheme: this.config.colorScheme
          });
          break;

        case 'parallel-coordinates':
          visualization = new ParallelCoordinates(container, {
            interactive: this.config.enableInteractions,
            showLabels: this.config.showLabels,
            colorScheme: this.config.colorScheme
          });
          break;

        case 'stream-graph':
          visualization = new StreamGraph(container, {
            interactive: this.config.enableInteractions,
            showLabels: this.config.showLabels,
            colorScheme: this.config.colorScheme
          });
          break;

        case 'calendar-heatmap':
          visualization = new CalendarHeatmap(container, {
            interactive: this.config.enableInteractions,
            showLabels: this.config.showLabels,
            colorScheme: this.config.colorScheme
          });
          break;

        case 'gauge':
          visualization = new GaugeChart(container, {
            interactive: this.config.enableInteractions,
            showLabels: this.config.showLabels,
            colorScheme: this.config.colorScheme
          });
          break;

        case 'flame-graph':
          visualization = new FlameGraph(container, {
            interactive: this.config.enableInteractions,
            showLabels: this.config.showLabels,
            colorScheme: this.config.colorScheme
          });
          break;

        default:
          console.warn(`Visualization type ${type} not implemented yet`);
          this.renderPlaceholder(container, type, title);
          return null;
      }

      // Initialize and render
      console.log(`[VisualizationManager] Initializing ${type} visualization in ${containerId}...`);
      await visualization.initialize();
      console.log(`[VisualizationManager] Rendering ${type} visualization...`);
      await visualization.render(data);
      console.log(`[VisualizationManager] ${type} visualization complete`);

      // Store reference
      this.visualizations.set(containerId, visualization);

      return visualization;

    } catch (error) {
      console.error(`Error creating ${type} visualization:`, error);
      this.renderError(container, type, error);
      return null;
    }
  }

  /**
   * Render multiple visualizations from analysis data
   */
  async renderAnalysisVisualizations(
    analysis: any,
    visualizationData?: any[]
  ): Promise<void> {
    if (!analysis) return;

    // Create containers for visualizations
    const overviewContainer = this.ensureContainer('viz-overview', 'Category Overview');
    if (overviewContainer) {
      // Create bubble chart for category overview
      await this.createVisualization(
        'viz-overview',
        'bubble',
        {
          children: (analysis.categories || []).map((cat: any) => ({
            id: cat.categoryId,
            name: cat.categoryName,
            value: cat.issues?.length || 0,
            critical: cat.issues?.filter((i: any) => i.severity === 'critical').length || 0,
            high: cat.issues?.filter((i: any) => i.severity === 'high').length || 0,
            score: cat.score,
            status: cat.status || 'warning'
          }))
        },
        'Category Overview'
      );
    }

    // Render category-specific visualizations
    for (const category of analysis.categories || []) {
      if (category.categoryId === 'feature-completeness') {
        await this.renderFeatureCompletenessVisualizations(category);
      }

      // Render heatmap for each category
      if (category.issues && category.issues.length > 0) {
        await this.renderCategoryHeatmap(category);
      }
    }

    // Render any additional visualizations from visualization data
    if (visualizationData && visualizationData.length > 0) {
      for (const vizData of visualizationData) {
        await this.renderFromVisualizationData(vizData);
      }
    }
  }

  /**
   * Render feature completeness visualizations
   */
  private async renderFeatureCompletenessVisualizations(category: any): Promise<void> {
    const containerId = `viz-${category.categoryId}-sankey`;
    const container = this.ensureContainer(containerId, 'Endpoint Connection Flow');

    if (container) {
      // Extract metrics for Sankey
      const metrics = category.metrics || {};
      const nodes = [
        { id: 'backend', name: 'Backend Endpoints' },
        { id: 'connected', name: 'Connected' },
        { id: 'disconnected', name: 'Disconnected' },
        { id: 'frontend', name: 'Frontend Calls' }
      ];

      const links = [];
      if (metrics.connectedEndpoints > 0) {
        links.push(
          { source: 'backend', target: 'connected', value: metrics.connectedEndpoints, complete: true },
          { source: 'connected', target: 'frontend', value: metrics.connectedEndpoints, complete: true }
        );
      }
      if (metrics.disconnectedEndpoints > 0) {
        links.push(
          { source: 'backend', target: 'disconnected', value: metrics.disconnectedEndpoints, complete: false }
        );
      }

      await this.createVisualization(containerId, 'sankey', { nodes, links });
    }
  }

  /**
   * Render category heatmap
   */
  private async renderCategoryHeatmap(category: any): Promise<void> {
    const containerId = `viz-${category.categoryId}-heatmap`;
    const container = this.ensureContainer(containerId, `${category.categoryName}: Issue Distribution`);

    if (container) {
      // Group issues by file
      const fileIssues: Record<string, any[]> = {};
      for (const issue of category.issues) {
        if (!fileIssues[issue.filePath]) {
          fileIssues[issue.filePath] = [];
        }
        fileIssues[issue.filePath].push(issue);
      }

      // Convert to heatmap format
      const heatmapData = Object.entries(fileIssues).map(([filePath, issues]) => {
        const fileName = filePath.split('/').pop() || filePath;
        const critical = issues.filter(i => i.severity === 'critical').length;
        const high = issues.filter(i => i.severity === 'high').length;

        return {
          file: fileName,
          fullPath: filePath,
          count: issues.length,
          critical,
          high,
          severity: critical > 0 ? 'critical' : high > 0 ? 'high' : 'medium'
        } as any;
      });

      await this.createVisualization(containerId, 'heatmap', heatmapData);
    }
  }

  /**
   * Render from VisualizationData object
   */
  private async renderFromVisualizationData(vizData: VisualizationData): Promise<void> {
    const containerId = `viz-${vizData.categoryId}-${vizData.type}`;
    const container = this.ensureContainer(containerId, vizData.title);

    if (container) {
      await this.createVisualization(containerId, vizData.type as VisualizationType, vizData.data, vizData.title);
    }
  }

  /**
   * Ensure container exists, create if needed
   */
  private ensureContainer(id: string, title: string): HTMLElement | null {
    let container = document.getElementById(id);
    if (!container) {
      // Find visualizations container
      const vizContainer = document.getElementById('visualizations-container');
      if (!vizContainer) {
        console.warn('visualizations-container not found');
        return null;
      }

      // Create new visualization section
      const section = document.createElement('div');
      section.className = 'visualization-section';
      section.innerHTML = `
        <h4 class="visualization-title">${title}</h4>
        <div id="${id}" class="visualization-container"></div>
      `;
      vizContainer.appendChild(section);

      container = document.getElementById(id);
    }

    return container;
  }

  /**
   * Update an existing visualization with new data
   */
  async updateVisualization(containerId: string, data: any): Promise<void> {
    const visualization = this.visualizations.get(containerId);
    if (visualization) {
      await visualization.update(data);
    } else {
      console.warn(`No visualization found for container ${containerId}`);
    }
  }

  /**
   * Destroy a specific visualization
   */
  destroyVisualization(containerId: string): void {
    const visualization = this.visualizations.get(containerId);
    if (visualization) {
      visualization.destroy();
      this.visualizations.delete(containerId);
    }
  }

  /**
   * Destroy all visualizations
   */
  destroyAll(): void {
    for (const [containerId, visualization] of this.visualizations.entries()) {
      visualization.destroy();
      this.visualizations.delete(containerId);
    }

    // Clear visualizations container
    const vizContainer = document.getElementById('visualizations-container');
    if (vizContainer) {
      vizContainer.innerHTML = '';
    }
  }

  /**
   * Render placeholder for not-yet-implemented visualizations
   */
  private renderPlaceholder(container: HTMLElement, type: string, title?: string): void {
    container.innerHTML = `
      <div class="visualization-placeholder" style="
        padding: 40px;
        text-align: center;
        background: var(--vscode-editor-background);
        border: 1px dashed var(--vscode-panel-border);
        border-radius: 4px;
        color: var(--vscode-descriptionForeground);
      ">
        <div style="font-size: 32px; margin-bottom: 12px;">🔧</div>
        <div style="font-size: 14px; margin-bottom: 4px;">${title || type}</div>
        <div style="font-size: 12px;">Visualization coming soon</div>
      </div>
    `;
  }

  /**
   * Render error state
   */
  private renderError(container: HTMLElement, type: string, error: any): void {
    container.innerHTML = `
      <div class="visualization-error" style="
        padding: 30px;
        text-align: center;
        background: var(--vscode-inputValidation-errorBackground);
        border: 1px solid var(--vscode-inputValidation-errorBorder);
        border-radius: 4px;
        color: var(--vscode-inputValidation-errorForeground);
      ">
        <div style="font-size: 32px; margin-bottom: 12px;">⚠️</div>
        <div style="font-size: 14px; margin-bottom: 8px;">Error rendering ${type} visualization</div>
        <div style="font-size: 11px; opacity: 0.8;">${error.message || 'Unknown error'}</div>
      </div>
    `;
  }

  /**
   * Get active visualization count
   */
  getVisualizationCount(): number {
    return this.visualizations.size;
  }

  /**
   * Check if D3 is loaded
   */
  isD3Available(): boolean {
    return typeof (window as any).d3 !== 'undefined';
  }
}

// Export singleton instance
export const visualizationManager = new VisualizationManager();

// Re-export types from coordination module
export type { AnalysisData } from '../coordination/AnalysisDataMapper';
