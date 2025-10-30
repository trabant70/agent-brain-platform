/**
 * Collapsible Filter Panel
 * Provides comprehensive filtering for Code Structure Review analysis
 *
 * Features:
 * - Collapsible section (default collapsed)
 * - Search query input
 * - Category filter (Overview only)
 * - Severity multi-select
 * - Score range (min/max)
 * - File pattern (glob)
 * - Apply/Reset actions
 */

import type { AnalysisData } from '../coordination/AnalysisDataMapper';

export interface FilterCriteria {
  searchQuery?: string;
  categories?: string[];
  severities?: string[];
  scoreMin?: number;
  scoreMax?: number;
  filePattern?: string;
}

export interface CollapsibleFilterPanelConfig {
  showCategoryFilter: boolean; // Only shown on Overview tab
  defaultCollapsed?: boolean;
  onFilterChange?: (criteria: FilterCriteria) => void;
}

/**
 * Collapsible Filter Panel
 */
export class CollapsibleFilterPanel {
  private container: HTMLElement;
  private config: Required<CollapsibleFilterPanelConfig>;
  private analysisData: AnalysisData | null = null;
  private isCollapsed: boolean;
  private currentCriteria: FilterCriteria = {};

  constructor(container: HTMLElement, config: CollapsibleFilterPanelConfig) {
    this.container = container;
    this.config = {
      showCategoryFilter: config.showCategoryFilter,
      defaultCollapsed: config.defaultCollapsed !== false,
      onFilterChange: config.onFilterChange || (() => {})
    };
    this.isCollapsed = this.config.defaultCollapsed;
  }

  /**
   * Render filter panel
   */
  render(analysisData: AnalysisData): void {
    this.analysisData = analysisData;

    const categories = analysisData.categories || [];
    const collapseIcon = this.isCollapsed ? '▶' : '▼';

    this.container.innerHTML = `
      <div class="collapsible-filter-panel">
        <!-- Header -->
        <div class="filter-header" id="filter-header">
          <span class="filter-icon">🔍</span>
          <span class="filter-title">Filters</span>
          <span class="collapse-arrow">${collapseIcon}</span>
        </div>

        <!-- Filter Content (collapsible) -->
        <div class="filter-content ${this.isCollapsed ? 'collapsed' : 'expanded'}" id="filter-content">
          <div class="filter-row">
            <!-- Search Query -->
            <div class="filter-group">
              <label class="filter-label">Search</label>
              <input
                type="text"
                id="filter-search"
                class="filter-input"
                placeholder="Search issues, files, categories..."
                value="${this.currentCriteria.searchQuery || ''}"
              />
            </div>

            ${this.config.showCategoryFilter ? `
            <!-- Categories -->
            <div class="filter-group">
              <label class="filter-label">Categories</label>
              <div class="filter-checkboxes" id="filter-categories">
                ${categories.map(cat => `
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      class="filter-checkbox"
                      value="${cat.categoryId}"
                      ${this.currentCriteria.categories?.includes(cat.categoryId) ? 'checked' : ''}
                    />
                    <span>${cat.categoryName}</span>
                  </label>
                `).join('')}
              </div>
            </div>
            ` : ''}

            <!-- Severity -->
            <div class="filter-group">
              <label class="filter-label">Severity</label>
              <div class="filter-checkboxes" id="filter-severities">
                ${['critical', 'high', 'medium', 'low'].map(severity => `
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      class="filter-checkbox"
                      value="${severity}"
                      ${this.currentCriteria.severities?.includes(severity) ? 'checked' : ''}
                    />
                    <span>${severity.charAt(0).toUpperCase() + severity.slice(1)}</span>
                  </label>
                `).join('')}
              </div>
            </div>

            <!-- Score Range -->
            <div class="filter-group">
              <label class="filter-label">Score Range</label>
              <div class="score-range-inputs">
                <input
                  type="number"
                  id="filter-score-min"
                  class="filter-input score-input"
                  placeholder="Min"
                  min="0"
                  max="100"
                  value="${this.currentCriteria.scoreMin ?? ''}"
                />
                <span class="range-separator">-</span>
                <input
                  type="number"
                  id="filter-score-max"
                  class="filter-input score-input"
                  placeholder="Max"
                  min="0"
                  max="100"
                  value="${this.currentCriteria.scoreMax ?? ''}"
                />
              </div>
            </div>

            <!-- File Pattern -->
            <div class="filter-group">
              <label class="filter-label">File Pattern</label>
              <input
                type="text"
                id="filter-file-pattern"
                class="filter-input"
                placeholder="e.g., **/*.ts"
                value="${this.currentCriteria.filePattern || ''}"
              />
            </div>
          </div>

          <!-- Actions -->
          <div class="filter-actions">
            <button class="btn btn-primary" id="filter-apply">Apply</button>
            <button class="btn btn-secondary" id="filter-reset">Reset</button>
          </div>
        </div>
      </div>
    `;

    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Toggle collapse
    const header = document.getElementById('filter-header');
    if (header) {
      header.addEventListener('click', () => {
        this.toggleCollapse();
      });
    }

    // Apply button
    const applyBtn = document.getElementById('filter-apply');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        this.applyFilters();
      });
    }

    // Reset button
    const resetBtn = document.getElementById('filter-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetFilters();
      });
    }

    // Enter key on inputs applies filters
    const inputs = this.container.querySelectorAll('input[type="text"], input[type="number"]');
    inputs.forEach(input => {
      input.addEventListener('keypress', (e: Event) => {
        if ((e as KeyboardEvent).key === 'Enter') {
          this.applyFilters();
        }
      });
    });
  }

  /**
   * Toggle collapse state
   */
  private toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;

    const content = document.getElementById('filter-content');
    const arrow = this.container.querySelector('.collapse-arrow');

    if (content) {
      content.className = `filter-content ${this.isCollapsed ? 'collapsed' : 'expanded'}`;
    }

    if (arrow) {
      arrow.textContent = this.isCollapsed ? '▶' : '▼';
    }
  }

  /**
   * Apply current filters
   */
  private applyFilters(): void {
    const criteria: FilterCriteria = {};

    // Search query
    const searchInput = document.getElementById('filter-search') as HTMLInputElement;
    if (searchInput?.value) {
      criteria.searchQuery = searchInput.value;
    }

    // Categories (if shown)
    if (this.config.showCategoryFilter) {
      const categoryCheckboxes = this.container.querySelectorAll('#filter-categories input:checked');
      if (categoryCheckboxes.length > 0) {
        criteria.categories = Array.from(categoryCheckboxes).map(cb => (cb as HTMLInputElement).value);
      }
    }

    // Severities
    const severityCheckboxes = this.container.querySelectorAll('#filter-severities input:checked');
    if (severityCheckboxes.length > 0) {
      criteria.severities = Array.from(severityCheckboxes).map(cb => (cb as HTMLInputElement).value);
    }

    // Score range
    const scoreMinInput = document.getElementById('filter-score-min') as HTMLInputElement;
    const scoreMaxInput = document.getElementById('filter-score-max') as HTMLInputElement;
    if (scoreMinInput?.value) {
      criteria.scoreMin = parseInt(scoreMinInput.value, 10);
    }
    if (scoreMaxInput?.value) {
      criteria.scoreMax = parseInt(scoreMaxInput.value, 10);
    }

    // File pattern
    const filePatternInput = document.getElementById('filter-file-pattern') as HTMLInputElement;
    if (filePatternInput?.value) {
      criteria.filePattern = filePatternInput.value;
    }

    this.currentCriteria = criteria;
    this.config.onFilterChange(criteria);
  }

  /**
   * Reset all filters
   */
  private resetFilters(): void {
    this.currentCriteria = {};

    // Re-render to clear all inputs
    if (this.analysisData) {
      this.render(this.analysisData);
    }

    // Emit empty criteria
    this.config.onFilterChange({});
  }

  /**
   * Get current filter criteria
   */
  getCriteria(): FilterCriteria {
    return { ...this.currentCriteria };
  }

  /**
   * Set filter criteria programmatically
   */
  setCriteria(criteria: FilterCriteria): void {
    this.currentCriteria = criteria;
    if (this.analysisData) {
      this.render(this.analysisData);
    }
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.container.innerHTML = '';
  }
}
