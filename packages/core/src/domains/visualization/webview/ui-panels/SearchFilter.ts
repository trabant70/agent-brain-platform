/**
 * Search and Filter Component
 * Provides search and filtering capabilities for visualizations
 */

import { VisualizationCoordinator } from '../coordination/VisualizationCoordinator';
import type { AnalysisData } from '../coordination/AnalysisDataMapper';

/**
 * Filter criteria
 */
export interface FilterCriteria {
  searchQuery?: string;
  categories?: string[];
  severities?: string[];
  filePattern?: string;
  minScore?: number;
  maxScore?: number;
}

/**
 * Search Filter Component
 */
export class SearchFilter {
  private container: HTMLElement;
  private coordinator: VisualizationCoordinator;
  private analysisData: AnalysisData | null = null;
  private currentFilter: FilterCriteria = {};
  private onFilterChange: ((filter: FilterCriteria) => void) | null = null;

  constructor(container: HTMLElement, coordinator: VisualizationCoordinator) {
    this.container = container;
    this.coordinator = coordinator;
  }

  /**
   * Render search filter
   */
  render(analysisData: AnalysisData): void {
    this.analysisData = analysisData;

    const categories = analysisData.categories || [];
    const severities = ['critical', 'high', 'medium', 'low'];

    this.container.innerHTML = `
      <div class="search-filter" style="display: flex; gap: 0.75rem; align-items: center; margin-bottom: 1rem;">
        <!-- Search input -->
        <div class="filter-section" style="flex: 1;">
          <div class="search-input-wrapper">
            <span class="search-icon">🔍</span>
            <input type="text"
                   id="search-input"
                   class="search-input"
                   placeholder="Search issues, files, or categories..."
                   autocomplete="off">
            <button class="search-clear" id="search-clear" title="Clear search">×</button>
          </div>
        </div>

        <!-- Filter toggle -->
        <div class="filter-section" style="flex-shrink: 0;">
          <button class="filter-toggle" id="filter-toggle">
            <span class="filter-icon">⚙️</span>
            <span class="filter-label">Filters</span>
            <span class="filter-count" id="filter-count"></span>
            <span class="toggle-arrow">▼</span>
          </button>
        </div>

        <!-- Filter panel (collapsible) -->
        <div class="filter-panel" id="filter-panel">
          <!-- Category filters -->
          <div class="filter-group">
            <div class="filter-group-header">
              <span class="filter-group-title">Categories</span>
              <button class="filter-group-clear" data-group="categories">Clear</button>
            </div>
            <div class="filter-options">
              ${categories.map(cat => `
                <label class="filter-option">
                  <input type="checkbox"
                         name="category"
                         value="${cat.categoryId}"
                         class="filter-checkbox">
                  <span class="filter-option-label">${this.escapeHtml(cat.categoryName)}</span>
                  <span class="filter-option-count">${cat.issues?.length || 0}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <!-- Severity filters -->
          <div class="filter-group">
            <div class="filter-group-header">
              <span class="filter-group-title">Severity</span>
              <button class="filter-group-clear" data-group="severities">Clear</button>
            </div>
            <div class="filter-options">
              ${severities.map(severity => `
                <label class="filter-option">
                  <input type="checkbox"
                         name="severity"
                         value="${severity}"
                         class="filter-checkbox">
                  <span class="filter-option-label severity-${severity}">
                    ${severity.toUpperCase()}
                  </span>
                </label>
              `).join('')}
            </div>
          </div>

          <!-- Score range -->
          <div class="filter-group">
            <div class="filter-group-header">
              <span class="filter-group-title">Score Range</span>
              <button class="filter-group-clear" data-group="score">Clear</button>
            </div>
            <div class="filter-range">
              <div class="range-inputs">
                <input type="number"
                       id="score-min"
                       class="range-input"
                       placeholder="Min"
                       min="0"
                       max="100">
                <span class="range-separator">-</span>
                <input type="number"
                       id="score-max"
                       class="range-input"
                       placeholder="Max"
                       min="0"
                       max="100">
              </div>
            </div>
          </div>

          <!-- File pattern -->
          <div class="filter-group">
            <div class="filter-group-header">
              <span class="filter-group-title">File Pattern</span>
              <button class="filter-group-clear" data-group="filePattern">Clear</button>
            </div>
            <input type="text"
                   id="file-pattern"
                   class="filter-text-input"
                   placeholder="e.g., *.ts, src/**/*.tsx">
          </div>

          <!-- Actions -->
          <div class="filter-actions">
            <button class="btn-filter-apply" id="filter-apply">Apply Filters</button>
            <button class="btn-filter-reset" id="filter-reset">Reset All</button>
          </div>
        </div>
      </div>
    `;

    this.setupEventListeners();
    this.updateFilterCount();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Search input
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    if (searchInput) {
      let debounceTimer: NodeJS.Timeout;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.handleSearchChange(searchInput.value);
        }, 300);
      });
    }

    // Search clear
    const searchClear = document.getElementById('search-clear');
    if (searchClear) {
      searchClear.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
          this.handleSearchChange('');
        }
      });
    }

    // Filter toggle
    const filterToggle = document.getElementById('filter-toggle');
    const filterPanel = document.getElementById('filter-panel');
    if (filterToggle && filterPanel) {
      filterToggle.addEventListener('click', () => {
        const isExpanded = filterPanel.classList.toggle('expanded');
        filterToggle.classList.toggle('expanded', isExpanded);
      });
    }

    // Category checkboxes
    const categoryCheckboxes = this.container.querySelectorAll('input[name="category"]');
    categoryCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.handleFilterChange();
      });
    });

    // Severity checkboxes
    const severityCheckboxes = this.container.querySelectorAll('input[name="severity"]');
    severityCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.handleFilterChange();
      });
    });

    // Score range inputs
    const scoreMin = document.getElementById('score-min');
    const scoreMax = document.getElementById('score-max');
    [scoreMin, scoreMax].forEach(input => {
      if (input) {
        input.addEventListener('change', () => {
          this.handleFilterChange();
        });
      }
    });

    // File pattern
    const filePattern = document.getElementById('file-pattern');
    if (filePattern) {
      filePattern.addEventListener('change', () => {
        this.handleFilterChange();
      });
    }

    // Group clear buttons
    const clearButtons = this.container.querySelectorAll('.filter-group-clear');
    clearButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const group = target.getAttribute('data-group');
        this.clearFilterGroup(group);
      });
    });

    // Apply button
    const applyButton = document.getElementById('filter-apply');
    if (applyButton) {
      applyButton.addEventListener('click', () => {
        this.applyFilters();
      });
    }

    // Reset button
    const resetButton = document.getElementById('filter-reset');
    if (resetButton) {
      resetButton.addEventListener('click', () => {
        this.resetFilters();
      });
    }
  }

  /**
   * Handle search change
   */
  private handleSearchChange(query: string): void {
    this.currentFilter.searchQuery = query;
    this.updateFilterCount();
    this.emitFilterChange();
  }

  /**
   * Handle filter change
   */
  private handleFilterChange(): void {
    this.currentFilter = this.getCurrentFilterState();
    this.updateFilterCount();
  }

  /**
   * Get current filter state
   */
  private getCurrentFilterState(): FilterCriteria {
    const categories: string[] = [];
    const severities: string[] = [];

    // Get checked categories
    this.container.querySelectorAll('input[name="category"]:checked').forEach(checkbox => {
      categories.push((checkbox as HTMLInputElement).value);
    });

    // Get checked severities
    this.container.querySelectorAll('input[name="severity"]:checked').forEach(checkbox => {
      severities.push((checkbox as HTMLInputElement).value);
    });

    // Get score range
    const scoreMin = (document.getElementById('score-min') as HTMLInputElement)?.value;
    const scoreMax = (document.getElementById('score-max') as HTMLInputElement)?.value;

    // Get file pattern
    const filePattern = (document.getElementById('file-pattern') as HTMLInputElement)?.value;

    return {
      searchQuery: this.currentFilter.searchQuery,
      categories: categories.length > 0 ? categories : undefined,
      severities: severities.length > 0 ? severities : undefined,
      minScore: scoreMin ? parseInt(scoreMin, 10) : undefined,
      maxScore: scoreMax ? parseInt(scoreMax, 10) : undefined,
      filePattern: filePattern || undefined
    };
  }

  /**
   * Apply filters
   */
  private applyFilters(): void {
    this.emitFilterChange();
  }

  /**
   * Reset all filters
   */
  private resetFilters(): void {
    // Clear search
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.value = '';
    }

    // Uncheck all checkboxes
    this.container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      (checkbox as HTMLInputElement).checked = false;
    });

    // Clear score inputs
    const scoreMin = document.getElementById('score-min') as HTMLInputElement;
    const scoreMax = document.getElementById('score-max') as HTMLInputElement;
    if (scoreMin) scoreMin.value = '';
    if (scoreMax) scoreMax.value = '';

    // Clear file pattern
    const filePattern = document.getElementById('file-pattern') as HTMLInputElement;
    if (filePattern) filePattern.value = '';

    // Reset current filter
    this.currentFilter = {};
    this.updateFilterCount();
    this.emitFilterChange();
  }

  /**
   * Clear specific filter group
   */
  private clearFilterGroup(group: string | null): void {
    if (!group) return;

    switch (group) {
      case 'categories':
        this.container.querySelectorAll('input[name="category"]').forEach(checkbox => {
          (checkbox as HTMLInputElement).checked = false;
        });
        break;

      case 'severities':
        this.container.querySelectorAll('input[name="severity"]').forEach(checkbox => {
          (checkbox as HTMLInputElement).checked = false;
        });
        break;

      case 'score':
        const scoreMin = document.getElementById('score-min') as HTMLInputElement;
        const scoreMax = document.getElementById('score-max') as HTMLInputElement;
        if (scoreMin) scoreMin.value = '';
        if (scoreMax) scoreMax.value = '';
        break;

      case 'filePattern':
        const filePattern = document.getElementById('file-pattern') as HTMLInputElement;
        if (filePattern) filePattern.value = '';
        break;
    }

    this.handleFilterChange();
  }

  /**
   * Update filter count badge
   */
  private updateFilterCount(): void {
    const filterCount = document.getElementById('filter-count');
    if (!filterCount) return;

    const count = this.getActiveFilterCount();
    if (count > 0) {
      filterCount.textContent = count.toString();
      filterCount.style.display = 'inline-block';
    } else {
      filterCount.style.display = 'none';
    }
  }

  /**
   * Get active filter count
   */
  private getActiveFilterCount(): number {
    let count = 0;

    if (this.currentFilter.searchQuery) count++;
    if (this.currentFilter.categories?.length) count++;
    if (this.currentFilter.severities?.length) count++;
    if (this.currentFilter.minScore !== undefined || this.currentFilter.maxScore !== undefined) count++;
    if (this.currentFilter.filePattern) count++;

    return count;
  }

  /**
   * Emit filter change event
   */
  private emitFilterChange(): void {
    if (this.onFilterChange) {
      this.onFilterChange(this.currentFilter);
    }

    window.dispatchEvent(new CustomEvent('filter-change', {
      detail: this.currentFilter
    }));
  }

  /**
   * Set filter change callback
   */
  onFilter(callback: (filter: FilterCriteria) => void): void {
    this.onFilterChange = callback;
  }

  /**
   * Get current filter
   */
  getFilter(): FilterCriteria {
    return { ...this.currentFilter };
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
   * Clear component
   */
  clear(): void {
    this.container.innerHTML = '';
    this.currentFilter = {};
    this.onFilterChange = null;
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.clear();
  }
}
