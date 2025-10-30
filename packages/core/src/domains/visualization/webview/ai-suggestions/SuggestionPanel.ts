/**
 * Suggestion Panel Component
 * Container for displaying multiple AI suggestions
 */

import type { Suggestion } from './SuggestionEngine';
import { suggestionEngine } from './SuggestionEngine';
import { SuggestionCard, type SuggestionCardConfig } from './SuggestionCard';
import type { AnalysisData } from '../coordination/AnalysisDataMapper';
import type { FilterCriteria } from '../ui-panels/CollapsibleFilterPanel';

/**
 * Suggestion Panel Configuration
 */
export interface SuggestionPanelConfig extends SuggestionCardConfig {
  maxSuggestions?: number;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

/**
 * Suggestion Panel Component
 */
export class SuggestionPanel {
  private container: HTMLElement;
  private analysisData: AnalysisData | null = null;
  private suggestions: Suggestion[] = [];
  private filteredSuggestions: Suggestion[] = [];
  private config: SuggestionPanelConfig;
  private isCollapsed: boolean = false;
  private currentFilter: FilterCriteria = {};
  private currentCategory: string | null = null;

  constructor(container: HTMLElement, config: SuggestionPanelConfig = {}) {
    this.container = container;
    this.config = {
      maxSuggestions: 5,
      collapsible: true,
      defaultCollapsed: false,
      ...config
    };
    this.isCollapsed = this.config.defaultCollapsed || false;
  }

  /**
   * Render suggestions for analysis data
   */
  render(analysisData: AnalysisData, categoryId?: string): void {
    this.analysisData = analysisData;
    this.currentCategory = categoryId || null;

    // Generate suggestions
    this.suggestions = suggestionEngine.generateSuggestions(analysisData);

    // Apply filtering
    this.applyFiltering();

    // Limit number of suggestions
    const displaySuggestions = this.filteredSuggestions.slice(0, this.config.maxSuggestions);

    if (displaySuggestions.length === 0) {
      this.renderEmpty();
      return;
    }

    // Build panel HTML
    const panel = document.createElement('div');
    panel.className = 'suggestion-panel';
    panel.innerHTML = `
      <div class="suggestion-panel-header">
        <div class="suggestion-panel-title">
          <span class="icon">💡</span>
          <h3>AI Suggestions</h3>
          <span class="suggestion-count">${displaySuggestions.length}</span>
        </div>
        ${this.config.collapsible ? `
          <button class="suggestion-panel-toggle" title="${this.isCollapsed ? 'Expand' : 'Collapse'}">
            <span class="toggle-icon">${this.isCollapsed ? '▶' : '▼'}</span>
          </button>
        ` : ''}
      </div>

      <div class="suggestion-panel-content ${this.isCollapsed ? 'collapsed' : ''}">
        <div class="suggestion-cards-container">
          <!-- Suggestion cards will be inserted here -->
        </div>

        ${this.suggestions.length > this.config.maxSuggestions! ? `
          <div class="suggestion-panel-more">
            <p>+${this.suggestions.length - this.config.maxSuggestions!} more suggestion${this.suggestions.length - this.config.maxSuggestions! !== 1 ? 's' : ''} available</p>
            <button class="btn-show-all-suggestions">Show All Suggestions</button>
          </div>
        ` : ''}
      </div>
    `;

    // Clear container and add panel
    this.container.innerHTML = '';
    this.container.appendChild(panel);

    // Render suggestion cards
    const cardsContainer = panel.querySelector('.suggestion-cards-container') as HTMLElement;
    if (cardsContainer) {
      displaySuggestions.forEach(suggestion => {
        const card = new SuggestionCard(suggestion, analysisData, this.config);
        cardsContainer.appendChild(card.render());
      });
    }

    // Attach event listeners
    this.attachEventListeners(panel);
  }

  /**
   * Render empty state
   */
  private renderEmpty(): void {
    const panel = document.createElement('div');
    panel.className = 'suggestion-panel suggestion-panel-empty';
    panel.innerHTML = `
      <div class="suggestion-panel-header">
        <div class="suggestion-panel-title">
          <span class="icon">💡</span>
          <h3>AI Suggestions</h3>
          <span class="suggestion-count">0</span>
        </div>
        ${this.config.collapsible ? `
          <button class="suggestion-panel-toggle" title="${this.isCollapsed ? 'Expand' : 'Collapse'}">
            <span class="toggle-icon">${this.isCollapsed ? '▶' : '▼'}</span>
          </button>
        ` : ''}
      </div>

      <div class="suggestion-panel-content ${this.isCollapsed ? 'collapsed' : ''}">
        <div class="suggestion-empty-state">
          <div class="empty-icon">💡</div>
          <h4>No AI Suggestions Available</h4>
          <p>No actionable suggestions were generated for this view. Check the issue list below for details.</p>
        </div>
      </div>
    `;

    this.container.innerHTML = '';
    this.container.appendChild(panel);

    // Attach event listeners for collapse toggle
    this.attachEventListeners(panel);
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(panel: HTMLElement): void {
    // Toggle button
    const toggleBtn = panel.querySelector('.suggestion-panel-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.toggleCollapse(panel);
      });
    }

    // Show all button
    const showAllBtn = panel.querySelector('.btn-show-all-suggestions');
    if (showAllBtn) {
      showAllBtn.addEventListener('click', () => {
        this.showAllSuggestions();
      });
    }
  }

  /**
   * Toggle collapse/expand
   */
  private toggleCollapse(panel: HTMLElement): void {
    this.isCollapsed = !this.isCollapsed;

    const content = panel.querySelector('.suggestion-panel-content') as HTMLElement;
    const toggleBtn = panel.querySelector('.suggestion-panel-toggle') as HTMLElement;
    const toggleIcon = toggleBtn?.querySelector('.toggle-icon');

    if (content) {
      content.classList.toggle('collapsed', this.isCollapsed);
    }

    if (toggleIcon) {
      toggleIcon.textContent = this.isCollapsed ? '▶' : '▼';
    }

    if (toggleBtn) {
      toggleBtn.title = this.isCollapsed ? 'Expand' : 'Collapse';
    }
  }

  /**
   * Show all suggestions (expand limit)
   */
  private showAllSuggestions(): void {
    if (!this.analysisData) return;

    // Update config to show all
    this.config.maxSuggestions = this.suggestions.length;

    // Re-render
    this.render(this.analysisData);
  }

  /**
   * Get current suggestions
   */
  getSuggestions(): Suggestion[] {
    return [...this.suggestions];
  }

  /**
   * Clear panel
   */
  clear(): void {
    this.container.innerHTML = '';
    this.suggestions = [];
    this.analysisData = null;
  }

  /**
   * Set filter criteria and re-render
   */
  setFilter(criteria: FilterCriteria): void {
    this.currentFilter = criteria;
    if (this.analysisData) {
      this.applyFiltering();
      this.render(this.analysisData, this.currentCategory ?? undefined);
    }
  }

  /**
   * Set active category filter
   */
  setCategory(categoryId: string | null): void {
    this.currentCategory = categoryId;
    if (this.analysisData) {
      this.applyFiltering();
      this.render(this.analysisData, this.currentCategory ?? undefined);
    }
  }

  /**
   * Apply filtering to suggestions based on current filter criteria and category
   */
  private applyFiltering(): void {
    let filtered = [...this.suggestions];

    // Filter by category (if in category tab)
    if (this.currentCategory) {
      filtered = filtered.filter(s =>
        s.category === this.currentCategory
      );
    }

    // Filter by search query
    if (this.currentFilter.searchQuery) {
      const query = this.currentFilter.searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.title.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        (s.category?.toLowerCase().includes(query) ?? false)
      );
    }

    // Filter by categories (from filter panel)
    if (this.currentFilter.categories && this.currentFilter.categories.length > 0) {
      filtered = filtered.filter(s =>
        s.category && this.currentFilter.categories!.includes(s.category)
      );
    }

    // Filter by severity - map severity strings to priority levels
    if (this.currentFilter.severities && this.currentFilter.severities.length > 0) {
      const priorityThresholds: Record<string, number> = {
        'critical': 75,
        'high': 50,
        'medium': 25,
        'low': 0
      };
      const minPriority = Math.min(...this.currentFilter.severities.map(s => priorityThresholds[s] ?? 0));
      filtered = filtered.filter(s => s.priority >= minPriority);
    }

    // Filter by score range (map impact to score)
    if (this.currentFilter.scoreMin !== undefined || this.currentFilter.scoreMax !== undefined) {
      filtered = filtered.filter(s => {
        // Map impact level to score (0-100)
        const impactScore = s.impact === 'high' ? 80 :
                           s.impact === 'medium' ? 50 : 20;

        const min = this.currentFilter.scoreMin ?? 0;
        const max = this.currentFilter.scoreMax ?? 100;
        return impactScore >= min && impactScore <= max;
      });
    }

    // Filter by file pattern (if specified)
    if (this.currentFilter.filePattern) {
      const pattern = this.currentFilter.filePattern.toLowerCase();
      filtered = filtered.filter(s => {
        if (!s.affectedFiles || s.affectedFiles.length === 0) return true;
        return s.affectedFiles.some(file =>
          file.toLowerCase().includes(pattern) ||
          this.matchGlob(file, pattern)
        );
      });
    }

    this.filteredSuggestions = filtered;
  }

  /**
   * Simple glob pattern matching
   */
  private matchGlob(path: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(path);
  }

  /**
   * Dispose panel
   */
  dispose(): void {
    this.clear();
  }
}
