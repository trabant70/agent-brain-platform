/**
 * Suggestion Card Component
 * Displays an individual AI suggestion with actions
 */

import type { Suggestion } from './SuggestionEngine';
import { suggestionEngine } from './SuggestionEngine';
import type { AnalysisData } from '../coordination/AnalysisDataMapper';

/**
 * Suggestion Card Configuration
 */
export interface SuggestionCardConfig {
  onCopyPrompt?: (prompt: string) => void;
  onNavigateToFile?: (filePath: string) => void;
  onNavigateToCategory?: (categoryId: string) => void;
  onDismiss?: (suggestionId: string) => void;
}

/**
 * Suggestion Card Component
 */
export class SuggestionCard {
  private suggestion: Suggestion;
  private analysisData: AnalysisData;
  private config: SuggestionCardConfig;

  constructor(suggestion: Suggestion, analysisData: AnalysisData, config: SuggestionCardConfig = {}) {
    this.suggestion = suggestion;
    this.analysisData = analysisData;
    this.config = config;
  }

  /**
   * Render the suggestion card
   */
  render(): HTMLElement {
    const card = document.createElement('div');
    card.className = `suggestion-card suggestion-${this.suggestion.type}`;
    card.setAttribute('data-suggestion-id', this.suggestion.id);

    card.innerHTML = `
      <div class="suggestion-header">
        <div class="suggestion-badge-group">
          <span class="suggestion-badge suggestion-badge-${this.suggestion.type}">
            ${this.getTypeBadge()}
          </span>
          <span class="suggestion-impact suggestion-impact-${this.suggestion.impact}">
            ${this.getImpactBadge()}
          </span>
          <span class="suggestion-effort suggestion-effort-${this.suggestion.effort}">
            ${this.getEffortBadge()}
          </span>
        </div>
        <button class="suggestion-dismiss" title="Dismiss">×</button>
      </div>

      <div class="suggestion-body">
        <h4 class="suggestion-title">${this.escapeHtml(this.suggestion.title)}</h4>
        <p class="suggestion-description">${this.escapeHtml(this.suggestion.description)}</p>

        ${this.renderContext()}
      </div>

      <div class="suggestion-actions">
        <button class="btn-suggestion-action btn-generate-prompt" data-action="generate-prompt">
          <span class="icon">💡</span> Generate AI Prompt
        </button>
        ${this.renderSecondaryActions()}
      </div>
    `;

    // Attach event listeners
    this.attachEventListeners(card);

    return card;
  }

  /**
   * Render context information (file, category, etc.)
   */
  private renderContext(): string {
    const parts: string[] = [];

    if (this.suggestion.category) {
      parts.push(`<span class="suggestion-meta"><strong>Category:</strong> ${this.escapeHtml(this.suggestion.category)}</span>`);
    }

    if (this.suggestion.file) {
      parts.push(`<span class="suggestion-meta"><strong>File:</strong> <code>${this.escapeHtml(this.suggestion.file)}</code></span>`);
    }

    if (parts.length === 0) return '';

    return `<div class="suggestion-context">${parts.join('')}</div>`;
  }

  /**
   * Render secondary actions
   */
  private renderSecondaryActions(): string {
    const actions: string[] = [];

    // Navigate to file action
    if (this.suggestion.file && this.config.onNavigateToFile) {
      actions.push(`
        <button class="btn-suggestion-secondary" data-action="navigate-file" title="Navigate to file">
          <span class="icon">📄</span> View File
        </button>
      `);
    }

    // Navigate to category action
    if (this.suggestion.category && this.config.onNavigateToCategory) {
      actions.push(`
        <button class="btn-suggestion-secondary" data-action="navigate-category" title="View category">
          <span class="icon">📊</span> View Category
        </button>
      `);
    }

    return actions.join('');
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(card: HTMLElement): void {
    // Generate prompt button
    const generateBtn = card.querySelector('[data-action="generate-prompt"]');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => {
        this.handleGeneratePrompt();
      });
    }

    // Navigate to file button
    const navigateFileBtn = card.querySelector('[data-action="navigate-file"]');
    if (navigateFileBtn) {
      navigateFileBtn.addEventListener('click', () => {
        if (this.suggestion.file && this.config.onNavigateToFile) {
          this.config.onNavigateToFile(this.suggestion.file);
        }
      });
    }

    // Navigate to category button
    const navigateCategoryBtn = card.querySelector('[data-action="navigate-category"]');
    if (navigateCategoryBtn) {
      navigateCategoryBtn.addEventListener('click', () => {
        const categoryData = this.suggestion.action.data;
        if (categoryData?.categoryId && this.config.onNavigateToCategory) {
          this.config.onNavigateToCategory(categoryData.categoryId);
        }
      });
    }

    // Dismiss button
    const dismissBtn = card.querySelector('.suggestion-dismiss');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        this.handleDismiss(card);
      });
    }
  }

  /**
   * Handle generate prompt action
   */
  private async handleGeneratePrompt(): Promise<void> {
    // Use pre-generated prompt if available, otherwise generate it
    const prompt = this.suggestion.aiPrompt ||
      suggestionEngine.generatePrompt(this.suggestion, this.analysisData);

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(prompt);

      // Show success feedback
      this.showToast('✅ AI prompt copied to clipboard!', 'success');

      // Call callback if provided
      if (this.config.onCopyPrompt) {
        this.config.onCopyPrompt(prompt);
      }
    } catch (error) {
      console.error('Failed to copy prompt:', error);
      this.showToast('❌ Failed to copy prompt', 'error');
    }
  }

  /**
   * Handle dismiss action
   */
  private handleDismiss(card: HTMLElement): void {
    // Animate out
    card.style.opacity = '0';
    card.style.transform = 'translateX(20px)';
    card.style.transition = 'all 0.3s ease-out';

    setTimeout(() => {
      card.remove();

      // Call callback if provided
      if (this.config.onDismiss) {
        this.config.onDismiss(this.suggestion.id);
      }
    }, 300);
  }

  /**
   * Get type badge label
   */
  private getTypeBadge(): string {
    const labels: Record<string, string> = {
      'critical': '🔴 Critical',
      'high': '🟠 High Priority',
      'refactoring': '🔄 Refactor',
      'best-practice': '✨ Best Practice',
      'quick-win': '⚡ Quick Win'
    };
    return labels[this.suggestion.type] || this.suggestion.type;
  }

  /**
   * Get impact badge label
   */
  private getImpactBadge(): string {
    const labels: Record<string, string> = {
      'high': 'High Impact',
      'medium': 'Medium Impact',
      'low': 'Low Impact'
    };
    return labels[this.suggestion.impact] || this.suggestion.impact;
  }

  /**
   * Get effort badge label
   */
  private getEffortBadge(): string {
    const labels: Record<string, string> = {
      'high': 'High Effort',
      'medium': 'Medium Effort',
      'low': 'Low Effort'
    };
    return labels[this.suggestion.effort] || this.suggestion.effort;
  }

  /**
   * Show toast notification
   */
  private showToast(message: string, type: 'success' | 'error'): void {
    const toast = document.createElement('div');
    toast.className = `suggestion-toast suggestion-toast-${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    // Remove after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
