/**
 * ViewModeController - Orchestrates switching between knowledge view modes
 *
 * Manages multiple view controllers and coordinates transitions:
 * - Registers view controllers for each mode
 * - Handles view mode switching
 * - Propagates data updates to all views
 * - Shows/hides view containers
 * - Maintains active view state
 */

import { KnowledgeItem, MaturityContext } from '../../../knowledge/types';
import { InjectionStatus } from '../../../knowledge/GroupTypes';
import { ViewMode, getViewModeInfo } from './ViewMode';
import { BaseGroupViewController } from './BaseGroupViewController';
import { webviewLogger, LogCategory, LogPathway } from '../../webview/WebviewLogger';

export interface ViewModeChangeCallback {
  (mode: ViewMode): void;
}

/**
 * Orchestrates multiple view modes
 */
export class ViewModeController {
  private viewControllers: Map<ViewMode, BaseGroupViewController> = new Map();
  private currentMode: ViewMode = ViewMode.BY_TEMPLATE;
  private items: KnowledgeItem[] = [];
  private maturityContext: MaturityContext | null = null;
  private onViewModeChange: ViewModeChangeCallback | null = null;

  constructor() {
    webviewLogger.info(
      LogCategory.UI,
      'ViewModeController initialized',
      'ViewModeController.constructor',
      { defaultMode: this.currentMode },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Register a view controller for a specific mode
   */
  registerView(mode: ViewMode, controller: BaseGroupViewController): void {
    this.viewControllers.set(mode, controller);

    webviewLogger.debug(
      LogCategory.UI,
      'View controller registered',
      'ViewModeController.registerView',
      { mode, controllerType: controller.constructor.name },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Initialize with current data if available
    if (this.items.length > 0) {
      controller.setItems(this.items);
    }
    if (this.maturityContext) {
      controller.setMaturityContext(this.maturityContext);
    }
  }

  /**
   * Set the active view mode
   */
  setViewMode(mode: ViewMode): void {
    if (mode === this.currentMode) {
      return;
    }

    const controller = this.viewControllers.get(mode);
    if (!controller) {
      webviewLogger.error(
        LogCategory.UI,
        'Cannot switch to unregistered view mode',
        'ViewModeController.setViewMode',
        { mode },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      return;
    }

    const previousMode = this.currentMode;
    this.currentMode = mode;

    webviewLogger.info(
      LogCategory.UI,
      'View mode changed',
      'ViewModeController.setViewMode',
      { previousMode, newMode: mode },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Update visibility of view containers
    this.updateViewVisibility();

    // Notify listener
    if (this.onViewModeChange) {
      this.onViewModeChange(mode);
    }

    // Re-render active view to ensure fresh state
    controller.render();
  }

  /**
   * Get the currently active view mode
   */
  getCurrentMode(): ViewMode {
    return this.currentMode;
  }

  /**
   * Get the active view controller
   */
  getActiveController(): BaseGroupViewController | undefined {
    return this.viewControllers.get(this.currentMode);
  }

  /**
   * Get a specific view controller
   */
  getController(mode: ViewMode): BaseGroupViewController | undefined {
    return this.viewControllers.get(mode);
  }

  /**
   * Set items for all view controllers
   */
  setItems(items: KnowledgeItem[]): void {
    this.items = items;

    webviewLogger.debug(
      LogCategory.UI,
      'Setting items for all views',
      'ViewModeController.setItems',
      { itemCount: items.length },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    this.viewControllers.forEach((controller, mode) => {
      controller.setItems(items);
    });
  }

  /**
   * Set maturity context for all view controllers
   */
  setMaturityContext(context: MaturityContext | null): void {
    this.maturityContext = context;

    webviewLogger.debug(
      LogCategory.UI,
      'Setting maturity context for all views',
      'ViewModeController.setMaturityContext',
      { hasContext: !!context },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    this.viewControllers.forEach((controller, mode) => {
      controller.setMaturityContext(context);
    });
  }

  /**
   * Set injection status for all view controllers
   */
  setInjectionStatus(statusMap: Map<string, InjectionStatus>): void {
    webviewLogger.debug(
      LogCategory.UI,
      'Setting injection status for all views',
      'ViewModeController.setInjectionStatus',
      { statusCount: statusMap.size },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    this.viewControllers.forEach((controller, mode) => {
      controller.setInjectionStatus(statusMap);
    });
  }

  /**
   * Expand all groups in active view
   */
  expandAll(): void {
    const controller = this.getActiveController();
    if (controller) {
      controller.expandAll();
    }
  }

  /**
   * Collapse all groups in active view
   */
  collapseAll(): void {
    const controller = this.getActiveController();
    if (controller) {
      controller.collapseAll();
    }
  }

  /**
   * Register callback for view mode changes
   */
  onViewChange(callback: ViewModeChangeCallback): void {
    this.onViewModeChange = callback;
  }

  /**
   * Update visibility of view containers based on active mode
   */
  private updateViewVisibility(): void {
    this.viewControllers.forEach((controller, mode) => {
      const container = document.getElementById(controller['containerId']);
      if (container) {
        const isActive = mode === this.currentMode;
        container.style.display = isActive ? 'block' : 'none';

        if (isActive) {
          container.classList.add('active');
        } else {
          container.classList.remove('active');
        }
      }
    });
  }

  /**
   * Render view switcher tabs
   */
  renderViewSwitcher(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      webviewLogger.warn(
        LogCategory.UI,
        'View switcher container not found',
        'ViewModeController.renderViewSwitcher',
        { containerId },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      return;
    }

    container.className = 'knowledge-view-switcher';
    container.innerHTML = '';

    // Create tab for each registered view
    this.viewControllers.forEach((controller, mode) => {
      const info = getViewModeInfo(mode);
      const tab = document.createElement('button');
      tab.className = 'view-tab';
      tab.dataset.viewMode = mode;
      tab.title = info.description;

      if (mode === this.currentMode) {
        tab.classList.add('active');
      }

      tab.innerHTML = `${info.icon} ${info.label}`;

      tab.addEventListener('click', () => {
        this.setViewMode(mode);
        this.updateTabActiveState();
      });

      container.appendChild(tab);
    });

    webviewLogger.debug(
      LogCategory.UI,
      'View switcher rendered',
      'ViewModeController.renderViewSwitcher',
      { tabCount: this.viewControllers.size },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Update active state of tabs
   */
  private updateTabActiveState(): void {
    const tabs = document.querySelectorAll('.view-tab');
    tabs.forEach(tab => {
      const mode = (tab as HTMLElement).dataset.viewMode as ViewMode;
      if (mode === this.currentMode) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
  }

  /**
   * Get summary of current view state
   */
  getViewSummary(): {
    mode: ViewMode;
    itemCount: number;
    hasMaturityContext: boolean;
    registeredViews: ViewMode[];
  } {
    return {
      mode: this.currentMode,
      itemCount: this.items.length,
      hasMaturityContext: !!this.maturityContext,
      registeredViews: Array.from(this.viewControllers.keys())
    };
  }
}
