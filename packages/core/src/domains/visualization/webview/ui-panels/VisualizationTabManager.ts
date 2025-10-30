/**
 * Visualization Tab Manager
 * Manages tabbed visualization structure for Code Structure Review
 *
 * Features:
 * - Tab-based navigation between visualizations
 * - Lazy rendering (only render active tab)
 * - Consistent structure for Overview and Category views
 */

export interface VisualizationTab {
  id: string;
  label: string;
  icon?: string;
  containerId: string;
}

export interface VisualizationTabManagerConfig {
  tabs: VisualizationTab[];
  defaultTab?: string;
  onTabChange?: (tabId: string) => void;
}

/**
 * Visualization Tab Manager
 */
export class VisualizationTabManager {
  private container: HTMLElement;
  private config: VisualizationTabManagerConfig;
  private activeTab: string;

  constructor(container: HTMLElement, config: VisualizationTabManagerConfig) {
    this.container = container;
    this.config = config;
    this.activeTab = config.defaultTab || config.tabs[0]?.id || '';
  }

  /**
   * Render tab structure
   */
  render(): void {
    const tabs = this.config.tabs;

    this.container.innerHTML = `
      <div class="viz-tab-manager">
        <!-- Tab Navigation -->
        <div class="viz-tab-nav">
          ${tabs.map(tab => `
            <button
              class="viz-tab-button ${tab.id === this.activeTab ? 'active' : ''}"
              data-tab-id="${tab.id}"
              title="${tab.label}"
            >
              ${tab.icon ? `<span class="viz-tab-icon">${tab.icon}</span>` : ''}
              <span class="viz-tab-label">${tab.label}</span>
            </button>
          `).join('')}
        </div>

        <!-- Tab Content Containers -->
        <div class="viz-tab-content-area">
          ${tabs.map(tab => `
            <div
              id="${tab.containerId}"
              class="viz-tab-pane ${tab.id === this.activeTab ? 'active' : ''}"
              data-tab-id="${tab.id}"
            >
              <!-- Visualization will be rendered here -->
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.setupEventListeners();
  }

  /**
   * Setup event listeners for tab navigation
   */
  private setupEventListeners(): void {
    const tabButtons = this.container.querySelectorAll('.viz-tab-button');
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabId = (button as HTMLElement).dataset.tabId;
        if (tabId) {
          this.switchTab(tabId);
        }
      });
    });
  }

  /**
   * Switch to a different tab
   */
  switchTab(tabId: string): void {
    if (tabId === this.activeTab) return;

    // Update active tab
    this.activeTab = tabId;

    // Update button states
    const buttons = this.container.querySelectorAll('.viz-tab-button');
    buttons.forEach(btn => {
      const btnTabId = (btn as HTMLElement).dataset.tabId;
      if (btnTabId === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update pane visibility
    const panes = this.container.querySelectorAll('.viz-tab-pane');
    panes.forEach(pane => {
      const paneTabId = (pane as HTMLElement).dataset.tabId;
      if (paneTabId === tabId) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });

    // Trigger callback
    if (this.config.onTabChange) {
      this.config.onTabChange(tabId);
    }
  }

  /**
   * Get active tab ID
   */
  getActiveTab(): string {
    return this.activeTab;
  }

  /**
   * Get container for specific tab
   */
  getTabContainer(tabId: string): HTMLElement | null {
    const tab = this.config.tabs.find(t => t.id === tabId);
    if (!tab) return null;
    return document.getElementById(tab.containerId);
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.container.innerHTML = '';
  }
}
