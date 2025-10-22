/**
 * MarketplaceController - Manages the Marketplace UI
 *
 * Handles:
 * - Rendering marketplace tab
 * - Template card display
 * - Category filters
 * - Search functionality
 * - Install/Uninstall actions
 */

import { webviewLogger, LogCategory, LogPathway } from '../webview/WebviewLogger';
import { ModalDialog } from './ModalDialog';
import { NotificationManager } from './NotificationManager';

// Types from knowledge domain
export interface MarketplaceTemplate {
  id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  tags: string[];
  author: {
    name: string;
    email?: string;
    url?: string;
  };
  license: string;
  source: 'bundled' | 'user';
  itemCount: number;
  isInstalled?: boolean;
  installedAt?: string;
}

export interface MarketplaceState {
  templates: MarketplaceTemplate[];
  selectedCategory: string;
  searchQuery: string;
  sortBy: 'name' | 'date' | 'items';
}

export class MarketplaceController {
  private state: MarketplaceState;
  private messageHandler: ((message: any) => void) | null = null;
  private notificationManager: NotificationManager;

  constructor(options: {
    onSendMessage: (message: any) => void;
    notificationManager: NotificationManager;
  }) {
    this.messageHandler = options.onSendMessage;
    this.notificationManager = options.notificationManager;

    this.state = {
      templates: [],
      selectedCategory: 'all',
      searchQuery: '',
      sortBy: 'name'
    };
  }

  // ============================================
  // Public API
  // ============================================

  /**
   * Initialize the marketplace UI
   */
  initialize(): void {
    webviewLogger.info(
      LogCategory.UI,
      'Initializing MarketplaceController',
      'MarketplaceController.initialize',
      {},
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    this.setupEventListeners();
    this.requestTemplates();
  }

  /**
   * Load marketplace templates
   */
  loadTemplates(templates: MarketplaceTemplate[]): void {
    webviewLogger.info(
      LogCategory.UI,
      'Loading marketplace templates',
      'MarketplaceController.loadTemplates',
      { count: templates.length },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    this.state.templates = templates;
    this.renderMarketplace();
  }

  /**
   * Update template installation status
   */
  updateTemplateStatus(templateId: string, isInstalled: boolean, installedAt?: string): void {
    const template = this.state.templates.find(t => t.id === templateId);
    if (template) {
      template.isInstalled = isInstalled;
      template.installedAt = installedAt;
      this.renderMarketplace();
    }
  }

  // ============================================
  // Rendering
  // ============================================

  /**
   * Render the entire marketplace
   */
  private renderMarketplace(): void {
    const container = document.getElementById('marketplace-content');
    if (!container) {
      webviewLogger.warn(
        LogCategory.UI,
        'Marketplace container not found',
        'MarketplaceController.renderMarketplace',
        {},
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      return;
    }

    const filteredTemplates = this.getFilteredTemplates();
    const sortedTemplates = this.sortTemplates(filteredTemplates);

    container.innerHTML = `
      <div class="marketplace-header">
        <div class="marketplace-header-left">
          <h2>🏪 Template Marketplace</h2>
          <div class="marketplace-stats">
            <span>${this.state.templates.length} templates</span>
            <span>${this.state.templates.filter(t => t.isInstalled).length} installed</span>
          </div>
        </div>
        <div class="marketplace-header-right">
          <button id="import-template-btn" class="btn btn-secondary">
            📥 Import Template
          </button>
          <button id="create-template-btn" class="btn btn-primary">
            + Create Template
          </button>
        </div>
      </div>

      ${this.renderFilters()}
      ${this.renderTemplateGrid(sortedTemplates)}
    `;

    this.attachCardListeners();
    this.attachCreateButtonListener();
  }

  /**
   * Render filter controls
   */
  private renderFilters(): string {
    const categories = this.getCategories();

    return `
      <div class="marketplace-filters">
        <div class="filter-group">
          <label>Category:</label>
          <select id="marketplace-category-filter" class="filter-select">
            <option value="all">All Categories</option>
            ${categories.map(cat => `
              <option value="${cat.id}" ${this.state.selectedCategory === cat.id ? 'selected' : ''}>
                ${cat.icon} ${cat.label}
              </option>
            `).join('')}
          </select>
        </div>

        <div class="filter-group">
          <label>Search:</label>
          <input
            type="text"
            id="marketplace-search"
            class="filter-search"
            placeholder="Search templates..."
            value="${this.state.searchQuery}"
          />
        </div>

        <div class="filter-group">
          <label>Sort by:</label>
          <select id="marketplace-sort" class="filter-select">
            <option value="name" ${this.state.sortBy === 'name' ? 'selected' : ''}>Name</option>
            <option value="date" ${this.state.sortBy === 'date' ? 'selected' : ''}>Date</option>
            <option value="items" ${this.state.sortBy === 'items' ? 'selected' : ''}>Items</option>
          </select>
        </div>
      </div>
    `;
  }

  /**
   * Render template grid
   */
  private renderTemplateGrid(templates: MarketplaceTemplate[]): string {
    if (templates.length === 0) {
      return `
        <div class="marketplace-empty">
          <p>No templates found matching your filters.</p>
        </div>
      `;
    }

    return `
      <div class="marketplace-grid">
        ${templates.map(template => this.renderTemplateCard(template)).join('')}
      </div>
    `;
  }

  /**
   * Render a single template card
   */
  private renderTemplateCard(template: MarketplaceTemplate): string {
    const categoryInfo = this.getCategoryInfo(template.category);
    const sourceBadge = template.source === 'bundled' ? '📦 Bundled' : '👤 User';
    const installButton = template.isInstalled
      ? `<button class="btn btn-secondary" data-action="uninstall" data-template-id="${template.id}">
           ✓ Uninstall
         </button>`
      : `<button class="btn btn-primary" data-action="install" data-template-id="${template.id}">
           Install
         </button>`;

    return `
      <div class="template-card ${template.isInstalled ? 'installed' : ''}" data-template-id="${template.id}">
        <div class="template-card-header">
          <div class="template-category-badge">${categoryInfo.icon}</div>
          <div class="template-source-badge">${sourceBadge}</div>
        </div>

        <div class="template-card-body">
          <h3 class="template-name">${this.escapeHtml(template.name)}</h3>
          <p class="template-description">${this.escapeHtml(template.description)}</p>

          <div class="template-meta">
            <span class="template-items">📄 ${template.itemCount} items</span>
            <span class="template-version">v${template.version}</span>
          </div>

          <div class="template-tags">
            ${template.tags.slice(0, 3).map(tag =>
              `<span class="tag">${this.escapeHtml(tag)}</span>`
            ).join('')}
            ${template.tags.length > 3 ? `<span class="tag-more">+${template.tags.length - 3}</span>` : ''}
          </div>

          <div class="template-author">
            <small>by ${this.escapeHtml(template.author.name)}</small>
          </div>
        </div>

        <div class="template-card-footer">
          ${installButton}
          <button class="btn btn-secondary" data-action="details" data-template-id="${template.id}">
            Details
          </button>
        </div>
      </div>
    `;
  }

  // ============================================
  // Event Handlers
  // ============================================

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Category filter
    document.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      if (target.id === 'marketplace-category-filter') {
        this.state.selectedCategory = target.value;
        this.renderMarketplace();
      } else if (target.id === 'marketplace-sort') {
        this.state.sortBy = target.value as any;
        this.renderMarketplace();
      }
    });

    // Search
    document.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.id === 'marketplace-search') {
        this.state.searchQuery = target.value;
        this.renderMarketplace();
      }
    });
  }

  /**
   * Attach listeners to template cards
   */
  private attachCardListeners(): void {
    document.querySelectorAll('[data-action]').forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const action = target.getAttribute('data-action');
        const templateId = target.getAttribute('data-template-id');

        if (!templateId) return;

        switch (action) {
          case 'install':
            this.installTemplate(templateId);
            break;
          case 'uninstall':
            this.uninstallTemplate(templateId);
            break;
          case 'details':
            this.showTemplateDetails(templateId);
            break;
        }
      });
    });
  }

  // ============================================
  // Actions
  // ============================================

  /**
   * Install a template
   */
  private installTemplate(templateId: string): void {
    const template = this.state.templates.find(t => t.id === templateId);
    if (!template) return;

    webviewLogger.info(
      LogCategory.UI,
      'Installing template',
      'MarketplaceController.installTemplate',
      { templateId, name: template.name },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    this.sendMessage({
      type: 'marketplace:install',
      payload: { templateId }
    });
  }

  /**
   * Uninstall a template
   */
  private async uninstallTemplate(templateId: string): Promise<void> {
    const template = this.state.templates.find(t => t.id === templateId);
    if (!template) return;

    webviewLogger.info(
      LogCategory.UI,
      'Uninstalling template',
      'MarketplaceController.uninstallTemplate',
      { templateId, name: template.name },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Show confirmation using ModalDialog (webview-safe)
    const modal = new ModalDialog();
    const confirmed = await modal.confirm(
      `Uninstall "${template.name}"? This will remove items that are not in other templates.`,
      'Confirm Uninstall'
    );

    if (confirmed) {
      this.sendMessage({
        type: 'marketplace:uninstall',
        payload: { templateId }
      });
    }
  }

  /**
   * Attach create and import button listeners
   */
  private attachCreateButtonListener(): void {
    const createBtn = document.getElementById('create-template-btn');
    if (createBtn) {
      createBtn.addEventListener('click', () => this.showCreateTemplateForm());
    }

    const importBtn = document.getElementById('import-template-btn');
    if (importBtn) {
      importBtn.addEventListener('click', () => this.importTemplate());
    }
  }

  /**
   * Show create template form
   */
  private async showCreateTemplateForm(): Promise<void> {
    webviewLogger.info(
      LogCategory.UI,
      'Opening create template form',
      'MarketplaceController.showCreateTemplateForm',
      {},
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Request knowledge items from extension for selection
    this.sendMessage({
      type: 'marketplace:request-knowledge-items',
      payload: {}
    });

    const categories = this.getCategories();
    const modal = new ModalDialog();

    const formData = await modal.showForm({
      title: 'Create Knowledge Template',
      submitText: 'Create Template',
      cancelText: 'Cancel',
      fields: [
        {
          name: 'name',
          label: 'Template Name',
          type: 'text',
          required: true,
          placeholder: 'e.g., My Project Standards'
        },
        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          required: true,
          placeholder: 'Describe what this template contains and when to use it...'
        },
        {
          name: 'category',
          label: 'Category',
          type: 'select',
          required: true,
          options: categories.map(c => c.id),
          defaultValue: 'general'
        },
        {
          name: 'tags',
          label: 'Tags (comma-separated)',
          type: 'text',
          required: false,
          placeholder: 'e.g., coding, standards, best-practices'
        },
        {
          name: 'authorName',
          label: 'Author Name',
          type: 'text',
          required: true,
          placeholder: 'Your name'
        },
        {
          name: 'authorEmail',
          label: 'Author Email',
          type: 'text',
          required: false,
          placeholder: 'your.email@example.com'
        },
        {
          name: 'license',
          label: 'License',
          type: 'select',
          required: true,
          options: ['MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause', 'CC-BY-4.0', 'Proprietary'],
          defaultValue: 'MIT'
        }
      ]
    });

    if (formData) {
      // Parse tags
      const tags = formData.tags
        ? formData.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0)
        : [];

      // Send create request to extension
      this.sendMessage({
        type: 'marketplace:create-template',
        payload: {
          name: formData.name,
          description: formData.description,
          category: formData.category,
          tags,
          author: {
            name: formData.authorName,
            email: formData.authorEmail || undefined
          },
          license: formData.license
        }
      });

      this.notificationManager.show({
        type: 'info',
        message: 'Creating template...'
      });
    }
  }

  /**
   * Show template details in modal
   */
  private async showTemplateDetails(templateId: string): Promise<void> {
    const template = this.state.templates.find(t => t.id === templateId);
    if (!template) return;

    webviewLogger.info(
      LogCategory.UI,
      'Showing template details',
      'MarketplaceController.showTemplateDetails',
      { templateId, name: template.name },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Create modal content
    const content = this.renderTemplateDetailsContent(template);

    // Show modal
    const modal = new ModalDialog();
    await modal.show({
      title: `${this.getCategoryInfo(template.category).icon} ${template.name}`,
      content,
      width: '700px',
      buttons: [
        {
          label: template.isInstalled ? '✓ Installed' : 'Install Template',
          primary: !template.isInstalled,
          onClick: () => {
            if (!template.isInstalled) {
              this.installTemplate(templateId);
            }
          }
        },
        {
          label: '📤 Export',
          primary: false,
          onClick: () => {
            this.exportTemplate(templateId);
          }
        },
        {
          label: 'Close',
          primary: false
        }
      ]
    });
  }

  /**
   * Render template details modal content
   */
  private renderTemplateDetailsContent(template: MarketplaceTemplate): HTMLElement {
    const container = document.createElement('div');
    container.className = 'template-details-modal';

    const categoryInfo = this.getCategoryInfo(template.category);
    const sourceBadge = template.source === 'bundled' ? '📦 Bundled' : '👤 User';

    container.innerHTML = `
      <div class="template-details-header">
        <div class="template-details-badges">
          <span class="badge badge-category">${categoryInfo.icon} ${categoryInfo.label}</span>
          <span class="badge badge-source">${sourceBadge}</span>
          ${template.isInstalled ? '<span class="badge badge-installed">✓ Installed</span>' : ''}
        </div>
        <div class="template-details-version">Version ${template.version}</div>
      </div>

      <div class="template-details-description">
        <p>${this.escapeHtml(template.description)}</p>
      </div>

      <div class="template-details-meta">
        <div class="meta-row">
          <span class="meta-label">Items:</span>
          <span class="meta-value">${template.itemCount} knowledge items</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Category:</span>
          <span class="meta-value">${categoryInfo.label}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Author:</span>
          <span class="meta-value">${this.escapeHtml(template.author.name)}${template.author.email ? ` (${template.author.email})` : ''}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">License:</span>
          <span class="meta-value">${this.escapeHtml(template.license)}</span>
        </div>
        ${template.isInstalled ? `
          <div class="meta-row">
            <span class="meta-label">Installed:</span>
            <span class="meta-value">${new Date(template.installedAt!).toLocaleString()}</span>
          </div>
        ` : ''}
      </div>

      ${template.tags.length > 0 ? `
        <div class="template-details-tags">
          <div class="meta-label">Tags:</div>
          <div class="tags-list">
            ${template.tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
          </div>
        </div>
      ` : ''}

      <div class="template-details-items">
        <h4>Included Knowledge Items</h4>
        <div class="items-preview">
          ${this.renderItemsPreview(template)}
        </div>
      </div>
    `;

    return container;
  }

  /**
   * Render items preview list
   */
  private renderItemsPreview(template: MarketplaceTemplate): string {
    // For Phase 4, we'll request full item details from the extension
    // For now, show item count with a placeholder
    return `
      <div class="items-preview-placeholder">
        <p>This template contains <strong>${template.itemCount} knowledge items</strong>.</p>
        <p>Items will be added to your knowledge base when you install this template.</p>
        <p class="items-preview-note">
          ${template.source === 'bundled'
            ? '📦 This is a bundled template that ships with Agent Brain Platform.'
            : '👤 This is a user-created template that was imported from a file.'}
        </p>
      </div>
    `;
  }

  /**
   * Export template to file
   */
  private exportTemplate(templateId: string): void {
    const template = this.state.templates.find(t => t.id === templateId);
    if (!template) return;

    webviewLogger.info(
      LogCategory.UI,
      'Exporting template',
      'MarketplaceController.exportTemplate',
      { templateId, name: template.name },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Send export request to extension
    this.sendMessage({
      type: 'marketplace:export',
      payload: { templateId }
    });

    this.notificationManager.show({
      type: 'info',
      message: `Exporting "${template.name}"...`
    });
  }

  /**
   * Import template from file
   */
  private importTemplate(): void {
    webviewLogger.info(
      LogCategory.UI,
      'Opening import template dialog',
      'MarketplaceController.importTemplate',
      {},
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Send import request to extension (will open file picker)
    this.sendMessage({
      type: 'marketplace:import',
      payload: {}
    });
  }

  /**
   * Request templates from extension
   */
  private requestTemplates(): void {
    this.sendMessage({
      type: 'marketplace:request-templates',
      payload: {}
    });
  }

  // ============================================
  // Filtering & Sorting
  // ============================================

  /**
   * Get filtered templates
   */
  private getFilteredTemplates(): MarketplaceTemplate[] {
    let filtered = [...this.state.templates];

    // Filter by category
    if (this.state.selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === this.state.selectedCategory);
    }

    // Filter by search query
    if (this.state.searchQuery) {
      const query = this.state.searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  }

  /**
   * Sort templates
   */
  private sortTemplates(templates: MarketplaceTemplate[]): MarketplaceTemplate[] {
    const sorted = [...templates];

    switch (this.state.sortBy) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'date':
        sorted.sort((a, b) => {
          const dateA = a.installedAt || '0';
          const dateB = b.installedAt || '0';
          return dateB.localeCompare(dateA);
        });
        break;
      case 'items':
        sorted.sort((a, b) => b.itemCount - a.itemCount);
        break;
    }

    return sorted;
  }

  // ============================================
  // Helpers
  // ============================================

  /**
   * Get available categories
   */
  private getCategories(): Array<{ id: string; label: string; icon: string }> {
    return [
      { id: 'development', label: 'Development', icon: '💻' },
      { id: 'documentation', label: 'Documentation', icon: '📚' },
      { id: 'best-practices', label: 'Best Practices', icon: '⭐' },
      { id: 'architecture', label: 'Architecture', icon: '🏗️' },
      { id: 'testing', label: 'Testing', icon: '🧪' },
      { id: 'security', label: 'Security', icon: '🔒' },
      { id: 'onboarding', label: 'Onboarding', icon: '🎓' },
      { id: 'workflows', label: 'Workflows', icon: '🔄' },
      { id: 'general', label: 'General', icon: '📦' }
    ];
  }

  /**
   * Get category info
   */
  private getCategoryInfo(categoryId: string): { icon: string; label: string } {
    const category = this.getCategories().find(c => c.id === categoryId);
    return category || { icon: '📦', label: 'General' };
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
   * Send message to extension
   */
  private sendMessage(message: any): void {
    if (this.messageHandler) {
      this.messageHandler(message);
    }
  }
}
