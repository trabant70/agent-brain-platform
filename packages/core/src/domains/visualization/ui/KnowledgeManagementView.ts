/**
 * KnowledgeManagementView - Knowledge Base Management Interface
 *
 * Displays ADRs, Patterns, and Learnings with enable/disable toggles
 * Minimal UI implementation for Phase 4
 */

export interface KnowledgeItem {
  id: string;
  type: 'adr' | 'pattern' | 'learning';
  title: string;
  enabled: boolean;
  category?: string;
  description?: string;
}

export class KnowledgeManagementView {
  private container: HTMLElement | null = null;
  private initialized: boolean = false;
  private items: KnowledgeItem[] = [];

  /**
   * Initialize the view
   */
  initialize(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`[KnowledgeManagementView] Container #${containerId} not found`);
      return;
    }

    this.container = container;
    this.render();
    this.initialized = true;

    console.log('[KnowledgeManagementView] Initialized');
  }

  /**
   * Update knowledge items
   */
  updateItems(items: KnowledgeItem[]): void {
    this.items = items;
    this.render();
  }

  /**
   * Render the UI
   */
  private render(): void {
    if (!this.container) return;

    // Group items by type
    const adrs = this.items.filter(item => item.type === 'adr');
    const patterns = this.items.filter(item => item.type === 'pattern');
    const learnings = this.items.filter(item => item.type === 'learning');

    this.container.innerHTML = `
      <div class="knowledge-content">
        <div class="knowledge-header">
          <h2>📚 Knowledge Base</h2>
          <p class="knowledge-subtitle">Manage your project's accumulated wisdom</p>
        </div>

        <div class="knowledge-stats">
          <div class="stat-card">
            <div class="stat-icon">📐</div>
            <div class="stat-content">
              <div class="stat-value">${adrs.length}</div>
              <div class="stat-label">Project Rules</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">📋</div>
            <div class="stat-content">
              <div class="stat-value">${patterns.length}</div>
              <div class="stat-label">Code Templates</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">⚠️</div>
            <div class="stat-content">
              <div class="stat-value">${learnings.length}</div>
              <div class="stat-label">Mistakes to Avoid</div>
            </div>
          </div>
        </div>

        ${this.renderSection('📐 Project Rules (ADRs)', adrs, 'No project rules yet. Use "Record ADR" to add architectural decisions.')}
        ${this.renderSection('📋 Code Templates', patterns, 'No patterns captured yet. These will be learned automatically as you work.')}
        ${this.renderSection('⚠️ Mistakes to Avoid', learnings, 'No learnings yet. This is good! ✨')}
      </div>
    `;

    // Attach event listeners
    this.attachEventListeners();
  }

  /**
   * Render a knowledge section
   */
  private renderSection(title: string, items: KnowledgeItem[], emptyMessage: string): string {
    if (items.length === 0) {
      return `
        <div class="knowledge-section">
          <h3 class="section-title">${title}</h3>
          <div class="empty-state">${emptyMessage}</div>
        </div>
      `;
    }

    const itemsHtml = items.map(item => this.renderItem(item)).join('');

    return `
      <div class="knowledge-section">
        <h3 class="section-title">${title}</h3>
        <div class="knowledge-items">
          ${itemsHtml}
        </div>
      </div>
    `;
  }

  /**
   * Render a single knowledge item
   */
  private renderItem(item: KnowledgeItem): string {
    const checkbox = item.enabled ? '☑' : '☐';
    const statusClass = item.enabled ? 'enabled' : 'disabled';

    return `
      <div class="knowledge-item ${statusClass}" data-id="${item.id}" data-type="${item.type}">
        <div class="item-checkbox">
          <span class="checkbox-icon">${checkbox}</span>
        </div>
        <div class="item-content">
          <div class="item-title">${this.escapeHtml(item.title)}</div>
          ${item.description ? `<div class="item-description">${this.escapeHtml(item.description)}</div>` : ''}
          ${item.category ? `<div class="item-category">${this.escapeHtml(item.category)}</div>` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    if (!this.container) return;

    // Toggle items on click
    const items = this.container.querySelectorAll('.knowledge-item');
    items.forEach(itemEl => {
      itemEl.addEventListener('click', () => {
        const id = itemEl.getAttribute('data-id');
        const type = itemEl.getAttribute('data-type');
        if (id && type) {
          this.toggleItem(id, type as 'adr' | 'pattern' | 'learning');
        }
      });
    });
  }

  /**
   * Toggle item enabled/disabled state
   */
  private toggleItem(id: string, type: 'adr' | 'pattern' | 'learning'): void {
    const item = this.items.find(i => i.id === id && i.type === type);
    if (!item) return;

    item.enabled = !item.enabled;

    // Send message to extension
    if (typeof vscode !== 'undefined') {
      (vscode as any).postMessage({
        command: 'toggleKnowledgeItem',
        itemId: id,
        itemType: type,
        enabled: item.enabled
      });
    }

    this.render();
  }

  /**
   * Escape HTML for safe rendering
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.container = null;
    this.initialized = false;
    this.items = [];
  }
}
