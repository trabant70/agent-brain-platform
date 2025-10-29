/**
 * Visualization Selector
 * Allows users to switch between different visualization types for current context
 */

import { VisualizationCoordinator } from '../coordination/VisualizationCoordinator';
import type { VisualizationType } from '../visualizations/VisualizationManager';
import type { NavigationState } from '../coordination/NavigationStateMachine';

/**
 * Visualization option
 */
interface VisualizationOption {
  type: VisualizationType;
  label: string;
  description: string;
  icon: string;
}

/**
 * Visualization options by state
 */
const VISUALIZATION_OPTIONS: Record<NavigationState, VisualizationOption[]> = {
  overview: [
    { type: 'bubble', label: 'Bubble Chart', description: 'Category overview', icon: '○' },
    { type: 'gauge', label: 'Gauge', description: 'Overall health', icon: '⊙' },
    { type: 'radar', label: 'Radar', description: 'Category comparison', icon: '◇' },
    { type: 'sunburst', label: 'Sunburst', description: 'File hierarchy', icon: '◉' },
    { type: 'treemap', label: 'Treemap', description: 'Code structure', icon: '▦' }
  ],
  'category-detail': [
    { type: 'heatmap', label: 'Heatmap', description: 'Issue distribution', icon: '▦' },
    { type: 'sankey', label: 'Sankey', description: 'Issue flow', icon: '⇄' },
    { type: 'timeline', label: 'Timeline', description: 'Trend analysis', icon: '📈' },
    { type: 'stacked-bar', label: 'Stacked Bar', description: 'Severity breakdown', icon: '▬' },
    { type: 'chord', label: 'Chord', description: 'Module coupling', icon: '◎' }
  ],
  'file-detail': [
    { type: 'dependency-graph', label: 'Dependencies', description: 'File dependencies', icon: '⊚' },
    { type: 'flame-graph', label: 'Flame Graph', description: 'Code structure', icon: '🔥' },
    { type: 'parallel-coordinates', label: 'Parallel', description: 'Multi-dimensional', icon: '|||' }
  ]
};

/**
 * Visualization Selector Controller
 */
export class VisualizationSelector {
  private container: HTMLElement;
  private coordinator: VisualizationCoordinator;
  private targetContainerId: string;
  private currentState: NavigationState = 'overview';
  private currentType: VisualizationType | null = null;

  constructor(
    container: HTMLElement,
    coordinator: VisualizationCoordinator,
    targetContainerId: string
  ) {
    this.container = container;
    this.coordinator = coordinator;
    this.targetContainerId = targetContainerId;

    // Listen for navigation changes
    this.setupNavigationListener();
  }

  /**
   * Render visualization selector
   */
  render(): void {
    const context = this.coordinator.getContext();
    this.currentState = context.state;

    const options = VISUALIZATION_OPTIONS[this.currentState] || [];

    if (options.length === 0) {
      this.container.innerHTML = '';
      return;
    }

    // Build selector HTML
    const optionsHtml = options.map(option => `
      <button class="viz-option ${option.type === this.currentType ? 'active' : ''}"
              data-type="${option.type}"
              title="${this.escapeHtml(option.description)}">
        <span class="viz-icon">${option.icon}</span>
        <span class="viz-label">${this.escapeHtml(option.label)}</span>
      </button>
    `).join('');

    this.container.innerHTML = `
      <div class="visualization-selector">
        <label class="selector-label">Visualization:</label>
        <div class="viz-options">
          ${optionsHtml}
        </div>
      </div>
    `;

    // Setup click handlers
    this.setupClickHandlers();
  }

  /**
   * Setup click handlers
   */
  private setupClickHandlers(): void {
    const options = this.container.querySelectorAll('.viz-option');
    options.forEach(option => {
      option.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const type = target.getAttribute('data-type') as VisualizationType;
        this.handleVisualizationSwitch(type);
      });
    });
  }

  /**
   * Handle visualization switch
   */
  private async handleVisualizationSwitch(type: VisualizationType): Promise<void> {
    if (type === this.currentType) return;

    try {
      await this.coordinator.switchVisualization(this.targetContainerId, type);
      this.currentType = type;

      // Update UI
      this.updateActiveState(type);
    } catch (error) {
      console.error('Error switching visualization:', error);
    }
  }

  /**
   * Update active state
   */
  private updateActiveState(type: VisualizationType): void {
    const options = this.container.querySelectorAll('.viz-option');
    options.forEach(option => {
      const target = option as HTMLElement;
      const isActive = target.getAttribute('data-type') === type;
      target.classList.toggle('active', isActive);
    });
  }

  /**
   * Setup navigation listener
   */
  private setupNavigationListener(): void {
    window.addEventListener('navigation-change', (() => {
      this.render();
    }) as EventListener);
  }

  /**
   * Set current visualization type
   */
  setCurrentType(type: VisualizationType): void {
    this.currentType = type;
    this.render();
  }

  /**
   * Escape HTML
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Clear selector
   */
  clear(): void {
    this.container.innerHTML = '';
    this.currentType = null;
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.clear();
  }
}
