/**
 * Visualization Coordinator
 * Manages visualization navigation, state, and coordination
 *
 * Responsibilities:
 * - Navigation state machine (Overview → Category → File)
 * - Visualization context switching
 * - Event routing and handling
 * - Breadcrumb management
 * - Filter and selection state
 */

import { AnalysisDataMapper, type AnalysisData } from './AnalysisDataMapper';
import { VisualizationManager, type VisualizationType } from '../visualizations/VisualizationManager';

/**
 * Navigation states
 */
export type NavigationState = 'overview' | 'category-detail' | 'file-detail';

/**
 * Navigation context
 */
export interface NavigationContext {
  state: NavigationState;
  categoryId?: string;
  filePath?: string;
  previousState?: NavigationState;
  breadcrumb: BreadcrumbItem[];
}

/**
 * Breadcrumb item
 */
export interface BreadcrumbItem {
  label: string;
  state: NavigationState;
  categoryId?: string;
  filePath?: string;
}

/**
 * Visualization config for each state
 */
export interface StateVisualizationConfig {
  primary: VisualizationType;
  secondary?: VisualizationType[];
  layout: 'single' | 'grid' | 'tabs';
}

/**
 * Event handler type
 */
export type EventHandler = (event: CustomEvent) => void;

/**
 * Visualization Coordinator
 */
export class VisualizationCoordinator {
  private context: NavigationContext;
  private visualizationManager: VisualizationManager;
  private dataMapper: AnalysisDataMapper;
  private analysisData: AnalysisData | null = null;
  private eventHandlers: Map<string, EventHandler[]> = new Map();

  // Visualization configurations for each state
  private readonly stateConfigs: Record<NavigationState, StateVisualizationConfig> = {
    overview: {
      primary: 'bubble',
      secondary: ['gauge', 'radar', 'sunburst'],
      layout: 'grid'
    },
    'category-detail': {
      primary: 'heatmap',
      secondary: ['sankey', 'timeline', 'stacked-bar'],
      layout: 'tabs'
    },
    'file-detail': {
      primary: 'dependency-graph',
      secondary: ['flame-graph', 'parallel-coordinates'],
      layout: 'tabs'
    }
  };

  constructor(
    visualizationManager: VisualizationManager,
    dataMapper?: AnalysisDataMapper
  ) {
    this.visualizationManager = visualizationManager;
    this.dataMapper = dataMapper || new AnalysisDataMapper();
    this.context = {
      state: 'overview',
      breadcrumb: [{ label: 'Overview', state: 'overview' }]
    };

    this.setupEventListeners();
  }

  /**
   * Initialize with analysis data
   */
  async initialize(analysisData: AnalysisData): Promise<void> {
    this.analysisData = analysisData;
    await this.renderCurrentState();
  }

  /**
   * Navigate to overview
   */
  async navigateToOverview(): Promise<void> {
    this.updateContext({
      state: 'overview',
      categoryId: undefined,
      filePath: undefined,
      previousState: this.context.state,
      breadcrumb: [{ label: 'Overview', state: 'overview' }]
    });

    await this.renderCurrentState();
    this.emitNavigationEvent('overview');
  }

  /**
   * Navigate to category detail
   */
  async navigateToCategoryDetail(categoryId: string, categoryName: string): Promise<void> {
    this.updateContext({
      state: 'category-detail',
      categoryId,
      filePath: undefined,
      previousState: this.context.state,
      breadcrumb: [
        { label: 'Overview', state: 'overview' },
        { label: categoryName, state: 'category-detail', categoryId }
      ]
    });

    await this.renderCurrentState();
    this.emitNavigationEvent('category-detail', { categoryId, categoryName });
  }

  /**
   * Navigate to file detail
   */
  async navigateToFileDetail(filePath: string, categoryId?: string): Promise<void> {
    const fileName = this.getFileName(filePath);
    const breadcrumb: BreadcrumbItem[] = [
      { label: 'Overview', state: 'overview' }
    ];

    if (categoryId) {
      const category = this.analysisData?.categories?.find(c => c.categoryId === categoryId);
      if (category) {
        breadcrumb.push({
          label: category.categoryName,
          state: 'category-detail',
          categoryId
        });
      }
    }

    breadcrumb.push({
      label: fileName,
      state: 'file-detail',
      filePath
    });

    this.updateContext({
      state: 'file-detail',
      categoryId,
      filePath,
      previousState: this.context.state,
      breadcrumb
    });

    await this.renderCurrentState();
    this.emitNavigationEvent('file-detail', { filePath, categoryId });
  }

  /**
   * Navigate back
   */
  async navigateBack(): Promise<void> {
    const currentBreadcrumb = this.context.breadcrumb;

    if (currentBreadcrumb.length <= 1) {
      return; // Already at root
    }

    const previousCrumb = currentBreadcrumb[currentBreadcrumb.length - 2];

    switch (previousCrumb.state) {
      case 'overview':
        await this.navigateToOverview();
        break;
      case 'category-detail':
        if (previousCrumb.categoryId) {
          const category = this.analysisData?.categories?.find(
            c => c.categoryId === previousCrumb.categoryId
          );
          await this.navigateToCategoryDetail(
            previousCrumb.categoryId,
            category?.categoryName || previousCrumb.label
          );
        }
        break;
      case 'file-detail':
        if (previousCrumb.filePath) {
          await this.navigateToFileDetail(previousCrumb.filePath, this.context.categoryId);
        }
        break;
    }
  }

  /**
   * Navigate to breadcrumb item
   */
  async navigateToBreadcrumb(index: number): Promise<void> {
    const crumb = this.context.breadcrumb[index];
    if (!crumb) return;

    switch (crumb.state) {
      case 'overview':
        await this.navigateToOverview();
        break;
      case 'category-detail':
        if (crumb.categoryId) {
          const category = this.analysisData?.categories?.find(
            c => c.categoryId === crumb.categoryId
          );
          await this.navigateToCategoryDetail(
            crumb.categoryId,
            category?.categoryName || crumb.label
          );
        }
        break;
      case 'file-detail':
        if (crumb.filePath) {
          await this.navigateToFileDetail(crumb.filePath, crumb.categoryId);
        }
        break;
    }
  }

  /**
   * Render current state visualizations
   */
  private async renderCurrentState(): Promise<void> {
    if (!this.analysisData) {
      console.warn('No analysis data available');
      return;
    }

    // Clear existing visualizations
    this.visualizationManager.destroyAll();

    const config = this.stateConfigs[this.context.state];

    // Validate containers exist before rendering
    if (!this.validateContainersExist(this.context.state)) {
      console.error(`Required containers not found for state: ${this.context.state}`);
      return;
    }

    switch (this.context.state) {
      case 'overview':
        await this.renderOverview(config);
        break;
      case 'category-detail':
        await this.renderCategoryDetail(config);
        break;
      case 'file-detail':
        await this.renderFileDetail(config);
        break;
    }
  }

  /**
   * Render overview state
   */
  private async renderOverview(config: StateVisualizationConfig): Promise<void> {
    if (!this.analysisData) return;

    // Primary: Bubble chart
    const bubbleData = this.dataMapper.toBubbleChart(this.analysisData);
    await this.visualizationManager.createVisualization(
      'viz-overview-bubble',
      'bubble',
      bubbleData,
      'Category Overview'
    );

    // Secondary visualizations
    if (config.secondary && config.secondary.length > 0) {
      // Gauge
      if (config.secondary.includes('gauge')) {
        const gaugeData = this.dataMapper.toGaugeChart(this.analysisData);
        await this.visualizationManager.createVisualization(
          'viz-overview-gauge',
          'gauge',
          gaugeData,
          'Overall Health'
        );
      }

      // Radar
      if (config.secondary.includes('radar')) {
        const radarData = this.dataMapper.toRadarChart(this.analysisData);
        await this.visualizationManager.createVisualization(
          'viz-overview-radar',
          'radar',
          radarData,
          'Category Comparison'
        );
      }

      // Sunburst
      if (config.secondary.includes('sunburst')) {
        const sunburstData = this.dataMapper.toSunburstDiagram(this.analysisData);
        await this.visualizationManager.createVisualization(
          'viz-overview-sunburst',
          'sunburst',
          sunburstData,
          'File Hierarchy'
        );
      }
    }
  }

  /**
   * Render category detail state
   */
  private async renderCategoryDetail(config: StateVisualizationConfig): Promise<void> {
    if (!this.analysisData || !this.context.categoryId) return;

    // Primary: Heatmap
    const heatmapData = this.dataMapper.toHeatmap(this.analysisData, this.context.categoryId);
    await this.visualizationManager.createVisualization(
      'viz-category-heatmap',
      'heatmap',
      heatmapData,
      'Issue Distribution'
    );

    // Secondary visualizations
    if (config.secondary && config.secondary.length > 0) {
      // Sankey
      if (config.secondary.includes('sankey')) {
        const sankeyData = this.dataMapper.toSankeyDiagram(
          this.analysisData,
          this.context.categoryId
        );
        await this.visualizationManager.createVisualization(
          'viz-category-sankey',
          'sankey',
          sankeyData,
          'Issue Flow'
        );
      }

      // Timeline
      if (config.secondary.includes('timeline')) {
        const timelineData = this.dataMapper.toTimelineVisualization(
          this.analysisData,
          this.context.categoryId
        );
        await this.visualizationManager.createVisualization(
          'viz-category-timeline',
          'timeline',
          timelineData,
          'Trend Analysis'
        );
      }

      // Stacked Bar
      if (config.secondary.includes('stacked-bar')) {
        const stackedBarData = this.dataMapper.toStackedBarChart(
          this.analysisData,
          this.context.categoryId
        );
        await this.visualizationManager.createVisualization(
          'viz-category-stacked-bar',
          'stacked-bar',
          stackedBarData,
          'Severity Breakdown'
        );
      }
    }
  }

  /**
   * Render file detail state
   */
  private async renderFileDetail(config: StateVisualizationConfig): Promise<void> {
    if (!this.analysisData || !this.context.filePath) return;

    // Primary: Dependency graph
    const dependencyData = this.dataMapper.toDependencyGraph(this.analysisData);
    await this.visualizationManager.createVisualization(
      'viz-file-dependency-graph',
      'dependency-graph',
      dependencyData,
      'Dependencies'
    );

    // Secondary visualizations
    if (config.secondary && config.secondary.length > 0) {
      // Flame graph
      if (config.secondary.includes('flame-graph')) {
        const flameData = this.dataMapper.toFlameGraph(this.analysisData);
        await this.visualizationManager.createVisualization(
          'viz-file-flame-graph',
          'flame-graph',
          flameData,
          'Code Structure'
        );
      }

      // Parallel coordinates
      if (config.secondary.includes('parallel-coordinates')) {
        const parallelData = this.dataMapper.toParallelCoordinates(this.analysisData);
        await this.visualizationManager.createVisualization(
          'viz-file-parallel-coordinates',
          'parallel-coordinates',
          parallelData,
          'Multi-Dimensional Analysis'
        );
      }
    }
  }

  /**
   * Switch visualization type for current state
   */
  async switchVisualization(
    containerId: string,
    visualizationType: VisualizationType
  ): Promise<void> {
    if (!this.analysisData) return;

    // Map visualization type to data
    let data: any;

    switch (visualizationType) {
      case 'bubble':
        data = this.dataMapper.toBubbleChart(this.analysisData);
        break;
      case 'gauge':
        data = this.dataMapper.toGaugeChart(this.analysisData);
        break;
      case 'radar':
        data = this.dataMapper.toRadarChart(this.analysisData);
        break;
      case 'sunburst':
        data = this.dataMapper.toSunburstDiagram(this.analysisData);
        break;
      case 'heatmap':
        data = this.dataMapper.toHeatmap(this.analysisData, this.context.categoryId);
        break;
      case 'sankey':
        data = this.dataMapper.toSankeyDiagram(
          this.analysisData,
          this.context.categoryId || ''
        );
        break;
      case 'timeline':
        data = this.dataMapper.toTimelineVisualization(
          this.analysisData,
          this.context.categoryId
        );
        break;
      case 'dependency-graph':
        data = this.dataMapper.toDependencyGraph(this.analysisData);
        break;
      case 'chord':
        data = this.dataMapper.toChordDiagram(this.analysisData);
        break;
      case 'parallel-coordinates':
        data = this.dataMapper.toParallelCoordinates(this.analysisData);
        break;
      case 'calendar-heatmap':
        data = this.dataMapper.toCalendarHeatmap(this.analysisData);
        break;
      case 'stacked-bar':
        data = this.dataMapper.toStackedBarChart(this.analysisData, this.context.categoryId);
        break;
      case 'treemap':
        data = this.dataMapper.toTreemap(this.analysisData);
        break;
      case 'flame-graph':
        data = this.dataMapper.toFlameGraph(this.analysisData);
        break;
      case 'test-coverage-network':
        data = this.dataMapper.toTestCoverageNetwork(this.analysisData);
        break;
      case 'i18n-geographic-heatmap':
        data = this.dataMapper.toI18nGeographicHeatmap(this.analysisData);
        break;
      default:
        console.warn(`Unknown visualization type: ${visualizationType}`);
        return;
    }

    // Destroy existing and create new
    this.visualizationManager.destroyVisualization(containerId);
    await this.visualizationManager.createVisualization(
      containerId,
      visualizationType,
      data,
      this.getVisualizationTitle(visualizationType)
    );
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Bubble chart click → navigate to category
    this.addEventListener('bubble-click', async (event) => {
      const { id, name } = event.detail;
      await this.navigateToCategoryDetail(id, name);
    });

    // Heatmap cell click → navigate to file
    this.addEventListener('heatmap-cell-click', async (event) => {
      const { metadata } = event.detail;
      if (metadata?.file) {
        await this.navigateToFileDetail(metadata.file, metadata.category);
      }
    });

    // Sunburst click → navigate based on depth
    this.addEventListener('sunburst-click', async (event) => {
      const { data } = event.detail;
      if (data.depth === 1 && data.data?.categoryId) {
        await this.navigateToCategoryDetail(data.data.categoryId, data.data.name);
      }
    });

    // Dependency graph node click → navigate to file
    this.addEventListener('dependency-node-click', async (event) => {
      const { id } = event.detail;
      await this.navigateToFileDetail(id);
    });
  }

  /**
   * Add event listener
   */
  addEventListener(eventType: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);

    // Add to window
    window.addEventListener(eventType, handler as EventListener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(eventType: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index >= 0) {
        handlers.splice(index, 1);
      }
    }

    window.removeEventListener(eventType, handler as EventListener);
  }

  /**
   * Emit navigation event
   */
  private emitNavigationEvent(state: NavigationState, data?: any): void {
    window.dispatchEvent(
      new CustomEvent('navigation-change', {
        detail: {
          state,
          context: this.context,
          data
        }
      })
    );
  }

  /**
   * Update context
   */
  private updateContext(newContext: Partial<NavigationContext>): void {
    this.context = {
      ...this.context,
      ...newContext
    };
  }

  /**
   * Get current context
   */
  getContext(): NavigationContext {
    return { ...this.context };
  }

  /**
   * Get breadcrumb
   */
  getBreadcrumb(): BreadcrumbItem[] {
    return [...this.context.breadcrumb];
  }

  /**
   * Get data mapper
   */
  getDataMapper(): AnalysisDataMapper {
    return this.dataMapper;
  }

  /**
   * Validate that required containers exist for the current state
   */
  private validateContainersExist(state: NavigationState): boolean {
    const requiredContainers: Record<NavigationState, string[]> = {
      'overview': [
        'viz-overview-bubble',
        'viz-overview-gauge',
        'viz-overview-radar',
        'viz-overview-sunburst'
      ],
      'category-detail': [
        'viz-category-heatmap',
        'viz-category-sankey',
        'viz-category-timeline',
        'viz-category-stacked-bar'
      ],
      'file-detail': [
        'viz-file-dependency-graph',
        'viz-file-flame-graph',
        'viz-file-parallel-coordinates'
      ]
    };

    const containers = requiredContainers[state] || [];
    const missingContainers: string[] = [];

    for (const containerId of containers) {
      if (!document.getElementById(containerId)) {
        missingContainers.push(containerId);
      }
    }

    if (missingContainers.length > 0) {
      console.warn(
        `Missing containers for state "${state}":`,
        missingContainers.join(', ')
      );
      return false;
    }

    return true;
  }

  /**
   * Get file name from path
   */
  private getFileName(path: string): string {
    const parts = path.split('/');
    return parts[parts.length - 1] || path;
  }

  /**
   * Get visualization title
   */
  private getVisualizationTitle(type: VisualizationType): string {
    const titles: Record<VisualizationType, string> = {
      'bubble': 'Category Overview',
      'gauge': 'Overall Health',
      'radar': 'Category Comparison',
      'sunburst': 'File Hierarchy',
      'heatmap': 'Issue Distribution',
      'sankey': 'Issue Flow',
      'timeline': 'Trend Analysis',
      'dependency-graph': 'Dependencies',
      'chord': 'Module Coupling',
      'parallel-coordinates': 'Multi-Dimensional Analysis',
      'calendar-heatmap': 'Activity Calendar',
      'stacked-bar': 'Severity Breakdown',
      'treemap': 'Code Structure',
      'flame-graph': 'Performance Profile',
      'test-coverage-network': 'Test Coverage',
      'i18n-geographic-heatmap': 'Translation Coverage',
      'multi-layer-sankey': 'Multi-Stage Flow',
      'arc-diagram': 'Sequential Dependencies',
      'matrix-view': 'Adjacency Matrix',
      'stream-graph': 'Trend Streams'
    };
    return titles[type] || type;
  }

  /**
   * Refresh current view
   */
  async refresh(analysisData?: AnalysisData): Promise<void> {
    if (analysisData) {
      this.analysisData = analysisData;
      this.dataMapper.clearCache();
    }
    await this.renderCurrentState();
  }

  /**
   * Cleanup
   */
  dispose(): void {
    // Remove all event listeners
    this.eventHandlers.forEach((handlers, eventType) => {
      handlers.forEach(handler => {
        window.removeEventListener(eventType, handler as EventListener);
      });
    });
    this.eventHandlers.clear();

    // Clear data
    this.analysisData = null;
    this.dataMapper.clearCache();
  }
}
