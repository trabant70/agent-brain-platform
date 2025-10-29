/**
 * Integration Controller
 * Main controller that orchestrates visualization integration
 * Manages state between panels, coordinator, and analysis data
 *
 * Architecture:
 * IntegrationController
 *   ├── VisualizationCoordinator (navigation & state)
 *   ├── OverviewPanel (overview visualizations)
 *   ├── CategoryDetailPanel (category visualizations)
 *   ├── NavigationBreadcrumb (breadcrumb nav)
 *   └── VisualizationSelector (viz switching)
 */

import { VisualizationManager } from './visualizations/VisualizationManager';
import { VisualizationCoordinator } from './coordination/VisualizationCoordinator';
import { AnalysisDataMapper, type AnalysisData } from './coordination/AnalysisDataMapper';
import { OverviewPanel } from './ui-panels/OverviewPanel';
import { CategoryDetailPanel } from './ui-panels/CategoryDetailPanel';
import { FileDetailPanel } from './ui-panels/FileDetailPanel';
import { NavigationBreadcrumb } from './ui-panels/NavigationBreadcrumb';
import { KeyboardShortcutHandler } from './ui-panels/KeyboardShortcutHandler';
import { DeepLinkHandler } from './ui-panels/DeepLinkHandler';
import type { NavigationState } from './coordination/NavigationStateMachine';

/**
 * Integration Controller Configuration
 */
export interface IntegrationControllerConfig {
  enableCoordinator?: boolean;
  enableBreadcrumb?: boolean;
  enableKeyboardShortcuts?: boolean;
  enableDeepLinking?: boolean;
  autoUpdateHash?: boolean;
  autoRender?: boolean;
}

/**
 * Integration Controller
 */
export class IntegrationController {
  private visualizationManager: VisualizationManager;
  private coordinator: VisualizationCoordinator;
  private dataMapper: AnalysisDataMapper;

  // UI Components
  private overviewPanel: OverviewPanel | null = null;
  private categoryDetailPanel: CategoryDetailPanel | null = null;
  private fileDetailPanel: FileDetailPanel | null = null;
  private breadcrumb: NavigationBreadcrumb | null = null;
  private keyboardHandler: KeyboardShortcutHandler | null = null;
  private deepLinkHandler: DeepLinkHandler | null = null;

  // State
  private analysisData: AnalysisData | null = null;
  private currentState: NavigationState = 'overview';

  // Containers
  private mainContainer: HTMLElement;
  private breadcrumbContainer: HTMLElement | null = null;

  // Config
  private config: Required<IntegrationControllerConfig>;

  constructor(mainContainer: HTMLElement, config: IntegrationControllerConfig = {}) {
    this.mainContainer = mainContainer;
    this.config = {
      enableCoordinator: config.enableCoordinator !== false,
      enableBreadcrumb: config.enableBreadcrumb !== false,
      enableKeyboardShortcuts: config.enableKeyboardShortcuts !== false,
      enableDeepLinking: config.enableDeepLinking !== false,
      autoUpdateHash: config.autoUpdateHash !== false,
      autoRender: config.autoRender !== false
    };

    // Initialize components
    this.visualizationManager = new VisualizationManager({
      enableInteractions: true,
      showLabels: true,
      useCoordinator: this.config.enableCoordinator
    });

    this.dataMapper = new AnalysisDataMapper();
    this.coordinator = new VisualizationCoordinator(
      this.visualizationManager,
      this.dataMapper
    );

    // Setup navigation listener
    this.setupNavigationListener();

    // Initialize keyboard shortcuts
    if (this.config.enableKeyboardShortcuts) {
      this.keyboardHandler = new KeyboardShortcutHandler(this.coordinator, {
        enableSearch: true,
        enableNavigation: true,
        enableFilters: true,
        enableTabs: true
      });
    }

    // Initialize deep linking
    if (this.config.enableDeepLinking) {
      this.deepLinkHandler = new DeepLinkHandler(this.coordinator);
    }
  }

  /**
   * Initialize with analysis data
   */
  async initialize(analysisData: AnalysisData): Promise<void> {
    this.analysisData = analysisData;

    // Initialize coordinator
    await this.coordinator.initialize(analysisData);

    // Setup UI structure
    this.setupUIStructure();

    // Initialize panels
    await this.initializePanels();

    // Initialize keyboard shortcuts
    if (this.keyboardHandler) {
      this.keyboardHandler.initialize();
      console.log('Keyboard shortcuts initialized');
    }

    // Initialize deep linking
    if (this.deepLinkHandler) {
      this.deepLinkHandler.initialize(analysisData);

      // Enable auto hash updating if configured
      if (this.config.autoUpdateHash) {
        this.deepLinkHandler.enableAutoUpdate();
      }

      console.log('Deep linking initialized');
    }

    // Auto-render if enabled (unless deep linking will handle it)
    if (this.config.autoRender && !window.location.hash) {
      await this.renderCurrentState();
    }
  }

  /**
   * Setup UI structure
   */
  private setupUIStructure(): void {
    // Clear main container
    this.mainContainer.innerHTML = '';

    // Create structure
    const structure = document.createElement('div');
    structure.className = 'visualization-integration';
    structure.innerHTML = `
      <div id="breadcrumb-container" class="breadcrumb-container"></div>
      <div id="content-container" class="content-container"></div>
    `;

    this.mainContainer.appendChild(structure);

    // Get containers
    this.breadcrumbContainer = document.getElementById('breadcrumb-container');
    const contentContainer = document.getElementById('content-container');

    if (!contentContainer) {
      throw new Error('Content container not found');
    }

    // Initialize panels
    if (this.breadcrumbContainer && this.config.enableBreadcrumb) {
      this.breadcrumb = new NavigationBreadcrumb(
        this.breadcrumbContainer,
        this.coordinator
      );
    }

    this.overviewPanel = new OverviewPanel(contentContainer, this.coordinator);
    this.categoryDetailPanel = new CategoryDetailPanel(contentContainer, this.coordinator);
    this.fileDetailPanel = new FileDetailPanel(contentContainer, this.coordinator);
  }

  /**
   * Initialize panels
   */
  private async initializePanels(): Promise<void> {
    // Render breadcrumb
    if (this.breadcrumb) {
      this.breadcrumb.render();
    }
  }

  /**
   * Setup navigation listener
   */
  private setupNavigationListener(): void {
    window.addEventListener('navigation-change', ((event: CustomEvent) => {
      const { state, context } = event.detail;
      this.currentState = state;
      this.handleNavigationChange(state, context);
    }) as EventListener);

    // Listen for refresh requests
    window.addEventListener('overview-refresh-requested', (() => {
      this.refresh();
    }) as EventListener);
  }

  /**
   * Handle navigation change
   */
  private async handleNavigationChange(state: NavigationState, context: any): Promise<void> {
    console.log('Navigation changed:', state, context);

    // Render appropriate panel
    await this.renderCurrentState();
  }

  /**
   * Render current state
   */
  private async renderCurrentState(): Promise<void> {
    if (!this.analysisData) {
      console.warn('No analysis data available');
      return;
    }

    const context = this.coordinator.getContext();

    switch (context.state) {
      case 'overview':
        await this.renderOverview();
        break;

      case 'category-detail':
        if (context.categoryId) {
          const category = this.analysisData.categories?.find(
            c => c.categoryId === context.categoryId
          );
          if (category) {
            await this.renderCategoryDetail(
              context.categoryId,
              category.categoryName
            );
          }
        }
        break;

      case 'file-detail':
        if (context.filePath) {
          await this.renderFileDetail(
            context.filePath,
            context.categoryId
          );
        }
        break;

      default:
        console.warn('Unknown state:', context.state);
    }
  }

  /**
   * Render overview panel
   */
  private async renderOverview(): Promise<void> {
    if (!this.overviewPanel || !this.analysisData) return;

    // Hide category panel
    if (this.categoryDetailPanel) {
      this.categoryDetailPanel.clear();
    }

    // Render overview
    await this.overviewPanel.render(this.analysisData);
  }

  /**
   * Render category detail panel
   */
  private async renderCategoryDetail(categoryId: string, categoryName: string): Promise<void> {
    if (!this.categoryDetailPanel || !this.analysisData) return;

    // Hide overview panel
    if (this.overviewPanel) {
      this.overviewPanel.clear();
    }

    // Render category detail
    await this.categoryDetailPanel.render(
      this.analysisData,
      categoryId,
      categoryName
    );
  }

  /**
   * Render file detail panel
   */
  private async renderFileDetail(filePath: string, categoryId?: string): Promise<void> {
    if (!this.fileDetailPanel || !this.analysisData) return;

    // Hide other panels
    if (this.overviewPanel) {
      this.overviewPanel.clear();
    }
    if (this.categoryDetailPanel) {
      this.categoryDetailPanel.clear();
    }

    // Render file detail
    await this.fileDetailPanel.render(
      this.analysisData,
      filePath,
      categoryId
    );
  }

  /**
   * Navigate to overview
   */
  async navigateToOverview(): Promise<void> {
    await this.coordinator.navigateToOverview();
  }

  /**
   * Navigate to category detail
   */
  async navigateToCategoryDetail(categoryId: string, categoryName: string): Promise<void> {
    await this.coordinator.navigateToCategoryDetail(categoryId, categoryName);
  }

  /**
   * Navigate to file detail
   */
  async navigateToFileDetail(filePath: string, categoryId?: string): Promise<void> {
    await this.coordinator.navigateToFileDetail(filePath, categoryId);
  }

  /**
   * Navigate back
   */
  async navigateBack(): Promise<void> {
    await this.coordinator.navigateBack();
  }

  /**
   * Refresh current view
   */
  async refresh(newAnalysisData?: AnalysisData): Promise<void> {
    if (newAnalysisData) {
      this.analysisData = newAnalysisData;
    }

    if (this.analysisData) {
      await this.coordinator.refresh(this.analysisData);
      await this.renderCurrentState();
    }
  }

  /**
   * Get current state
   */
  getCurrentState(): NavigationState {
    return this.currentState;
  }

  /**
   * Get coordinator
   */
  getCoordinator(): VisualizationCoordinator {
    return this.coordinator;
  }

  /**
   * Get visualization manager
   */
  getVisualizationManager(): VisualizationManager {
    return this.visualizationManager;
  }

  /**
   * Get analysis data
   */
  getAnalysisData(): AnalysisData | null {
    return this.analysisData;
  }

  /**
   * Check if D3 is available
   */
  isD3Available(): boolean {
    return this.visualizationManager.isD3Available();
  }

  /**
   * Get keyboard shortcuts help
   */
  getKeyboardShortcuts(): string | null {
    return this.keyboardHandler?.getShortcutsHelp() || null;
  }

  /**
   * Get current deep link
   */
  getCurrentDeepLink(): string | null {
    return this.deepLinkHandler?.createDeepLink() || null;
  }

  /**
   * Navigate to deep link
   */
  navigateToDeepLink(hash: string): void {
    if (this.deepLinkHandler) {
      this.deepLinkHandler.updateHash(hash);
    }
  }

  /**
   * Dispose controller and all components
   */
  dispose(): void {
    // Dispose panels
    this.overviewPanel?.dispose();
    this.categoryDetailPanel?.dispose();
    this.fileDetailPanel?.dispose();
    this.breadcrumb?.dispose();

    // Dispose keyboard handler
    this.keyboardHandler?.dispose();

    // Dispose deep link handler
    this.deepLinkHandler?.dispose();

    // Dispose coordinator
    this.coordinator.dispose();

    // Destroy visualizations
    this.visualizationManager.destroyAll();

    // Clear data
    this.analysisData = null;
    this.dataMapper.clearCache();

    // Clear container
    this.mainContainer.innerHTML = '';
  }
}

/**
 * Create integration controller
 */
export function createIntegrationController(
  container: HTMLElement,
  config?: IntegrationControllerConfig
): IntegrationController {
  return new IntegrationController(container, config);
}

// Re-export AnalysisData type for external use
export type { AnalysisData } from './coordination/AnalysisDataMapper';
