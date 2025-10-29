/**
 * Navigation Breadcrumb
 * Displays and manages breadcrumb navigation for visualization drill-down
 *
 * Example: Overview > Security > auth.ts
 */

import { VisualizationCoordinator, type BreadcrumbItem } from '../coordination/VisualizationCoordinator';

/**
 * Navigation Breadcrumb Controller
 */
export class NavigationBreadcrumb {
  private container: HTMLElement;
  private coordinator: VisualizationCoordinator;

  constructor(container: HTMLElement, coordinator: VisualizationCoordinator) {
    this.container = container;
    this.coordinator = coordinator;

    // Listen for navigation changes
    this.setupNavigationListener();
  }

  /**
   * Render breadcrumb
   */
  render(): void {
    const breadcrumb = this.coordinator.getBreadcrumb();

    if (breadcrumb.length === 0) {
      this.container.innerHTML = '';
      return;
    }

    // Build breadcrumb HTML
    const items = breadcrumb.map((item, index) => {
      const isLast = index === breadcrumb.length - 1;
      const icon = this.getIcon(item.state);

      return `
        <span class="breadcrumb-item ${isLast ? 'active' : ''}">
          ${!isLast ? `
            <button class="breadcrumb-link" data-index="${index}">
              <span class="breadcrumb-icon">${icon}</span>
              <span class="breadcrumb-label">${this.escapeHtml(item.label)}</span>
            </button>
          ` : `
            <span class="breadcrumb-current">
              <span class="breadcrumb-icon">${icon}</span>
              <span class="breadcrumb-label">${this.escapeHtml(item.label)}</span>
            </span>
          `}
          ${!isLast ? '<span class="breadcrumb-separator">›</span>' : ''}
        </span>
      `;
    }).join('');

    this.container.innerHTML = `
      <nav class="breadcrumb-nav" aria-label="Breadcrumb navigation">
        ${items}
      </nav>
    `;

    // Setup click handlers
    this.setupClickHandlers();
  }

  /**
   * Get icon for navigation state
   */
  private getIcon(state: string): string {
    const icons: Record<string, string> = {
      overview: '🏠',
      'category-detail': '📁',
      'file-detail': '📄'
    };
    return icons[state] || '•';
  }

  /**
   * Setup click handlers
   */
  private setupClickHandlers(): void {
    const links = this.container.querySelectorAll('.breadcrumb-link');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const index = parseInt(target.getAttribute('data-index') || '0', 10);
        this.handleBreadcrumbClick(index);
      });
    });
  }

  /**
   * Handle breadcrumb click
   */
  private handleBreadcrumbClick(index: number): void {
    this.coordinator.navigateToBreadcrumb(index);
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
   * Escape HTML
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Clear breadcrumb
   */
  clear(): void {
    this.container.innerHTML = '';
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.clear();
  }
}
