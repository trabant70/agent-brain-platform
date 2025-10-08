/**
 * SupportView - Help, Guides, and License Information
 *
 * Displays the Agent Brain architecture diagram and support information
 */

export class SupportView {
  private container: HTMLElement | null = null;
  private initialized: boolean = false;

  /**
   * Initialize the view
   */
  initialize(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`[SupportView] Container #${containerId} not found`);
      return;
    }

    this.container = container;
    this.render();
    this.initialized = true;

    console.log('[SupportView] Initialized');
  }

  /**
   * Render the UI
   */
  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="support-content">
        <div class="support-header">
          <h1>💡 Agent Brain Platform</h1>
          <p class="support-subtitle">Knowledge Flow & Learning Cycle</p>
        </div>

        <div class="support-message">
          <p>Architecture diagram placeholder - Image loading to be implemented</p>
        </div>
      </div>
    `;
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.container = null;
    this.initialized = false;
  }
}
