/**
 * TemplateMatchBadge - Match Percentage Indicator
 *
 * Shows how many items in a template match the current maturity context.
 * Displays as a colored badge with percentage and item counts.
 *
 * Color Coding:
 * - 100%: Green (perfect match)
 * - 75-99%: Light green (high match)
 * - 50-74%: Yellow (moderate match)
 * - 25-49%: Orange (low match)
 * - 0-24%: Red (very low match)
 *
 * Display Formats:
 * - Compact: "85%" (percentage only)
 * - Standard: "85% (17/20)" (percentage + counts)
 * - Detailed: Shows breakdown by dimension
 */

import { MatchStats } from '../../../knowledge/GroupTypes';
import { t } from '../../webview/i18n';

export interface TemplateMatchBadgeOptions {
  /** Match statistics */
  stats: MatchStats;

  /** Display format */
  format?: 'compact' | 'standard' | 'detailed';

  /** Size variant */
  size?: 'small' | 'medium' | 'large';

  /** Show tooltip on hover */
  showTooltip?: boolean;

  /** Click handler for interactive badges */
  onClick?: () => void;
}

export class TemplateMatchBadge {
  /**
   * Render a match badge
   */
  static render(options: TemplateMatchBadgeOptions): HTMLElement {
    const {
      stats,
      format = 'standard',
      size = 'medium',
      showTooltip = true,
      onClick
    } = options;

    const badge = document.createElement('span');
    const matchLevel = this.getMatchLevel(stats.matchPercentage);
    badge.className = `template-match-badge match-level-${matchLevel} size-${size}`;

    if (onClick) {
      badge.classList.add('clickable');
      badge.addEventListener('click', onClick);
    }

    // Render content based on format
    switch (format) {
      case 'compact':
        badge.innerHTML = this.renderCompactContent(stats);
        break;
      case 'detailed':
        badge.innerHTML = this.renderDetailedContent(stats);
        break;
      case 'standard':
      default:
        badge.innerHTML = this.renderStandardContent(stats);
        break;
    }

    // Add tooltip
    if (showTooltip) {
      badge.title = this.getTooltipText(stats);
    }

    return badge;
  }

  /**
   * Render a visual match bar (progress bar style)
   */
  static renderMatchBar(stats: MatchStats, width = 200): HTMLElement {
    const container = document.createElement('div');
    container.className = 'template-match-bar-container';
    container.style.width = `${width}px`;

    const bar = document.createElement('div');
    bar.className = 'match-bar';

    const fill = document.createElement('div');
    const matchLevel = this.getMatchLevel(stats.matchPercentage);
    fill.className = `match-bar-fill match-level-${matchLevel}`;
    fill.style.width = `${stats.matchPercentage}%`;

    const label = document.createElement('span');
    label.className = 'match-bar-label';
    label.textContent = `${Math.round(stats.matchPercentage)}%`;

    bar.appendChild(fill);
    bar.appendChild(label);
    container.appendChild(bar);

    // Add counts below bar
    const counts = document.createElement('div');
    counts.className = 'match-bar-counts';
    counts.textContent = `${stats.matchedItems} / ${stats.totalItems} ${t('template.items', 'items')}`;
    container.appendChild(counts);

    container.title = this.getTooltipText(stats);

    return container;
  }

  /**
   * Render inline match indicator (for table cells)
   */
  static renderInline(stats: MatchStats): HTMLElement {
    const inline = document.createElement('span');
    inline.className = 'template-match-inline';

    const matchLevel = this.getMatchLevel(stats.matchPercentage);
    const icon = this.getMatchIcon(matchLevel);

    inline.innerHTML = `
      <span class="match-icon">${icon}</span>
      <span class="match-percentage">${Math.round(stats.matchPercentage)}%</span>
      <span class="match-counts">(${stats.matchedItems}/${stats.totalItems})</span>
    `;

    inline.title = this.getTooltipText(stats);

    return inline;
  }

  /**
   * Render compact content (percentage only)
   */
  private static renderCompactContent(stats: MatchStats): string {
    return `<span class="badge-percentage">${Math.round(stats.matchPercentage)}%</span>`;
  }

  /**
   * Render standard content (percentage + counts)
   */
  private static renderStandardContent(stats: MatchStats): string {
    return `
      <span class="badge-percentage">${Math.round(stats.matchPercentage)}%</span>
      <span class="badge-counts">(${stats.matchedItems}/${stats.totalItems})</span>
    `;
  }

  /**
   * Render detailed content (with breakdown)
   */
  private static renderDetailedContent(stats: MatchStats): string {
    return `
      <div class="badge-main">
        <span class="badge-percentage">${Math.round(stats.matchPercentage)}%</span>
        <span class="badge-label">${t('template.match', 'Match')}</span>
      </div>
      <div class="badge-breakdown">
        <div class="breakdown-item">
          <span class="item-icon">✅</span>
          <span class="item-count">${stats.matchedItems}</span>
        </div>
        <div class="breakdown-item">
          <span class="item-icon">⭕</span>
          <span class="item-count">${stats.excludedItems}</span>
        </div>
      </div>
    `;
  }

  /**
   * Get match level category
   */
  private static getMatchLevel(percentage: number): string {
    if (percentage === 100) return 'perfect';
    if (percentage >= 75) return 'high';
    if (percentage >= 50) return 'moderate';
    if (percentage >= 25) return 'low';
    return 'very-low';
  }

  /**
   * Get match icon
   */
  private static getMatchIcon(level: string): string {
    switch (level) {
      case 'perfect':
        return '✅';
      case 'high':
        return '🟢';
      case 'moderate':
        return '🟡';
      case 'low':
        return '🟠';
      case 'very-low':
        return '🔴';
      default:
        return '⚪';
    }
  }

  /**
   * Get tooltip text
   */
  private static getTooltipText(stats: MatchStats): string {
    const level = this.getMatchLevel(stats.matchPercentage);
    const levelText = this.getMatchLevelText(level);

    let tooltip = `${t('template.matchStatus', 'Match Status')}: ${levelText}\n\n`;
    tooltip += `${t('template.matchPercentage', 'Match Percentage')}: ${Math.round(stats.matchPercentage)}%\n`;
    tooltip += `${t('template.totalItems', 'Total Items')}: ${stats.totalItems}\n`;
    tooltip += `${t('template.matchedItems', 'Matched Items')}: ${stats.matchedItems}\n`;
    tooltip += `${t('template.excludedItems', 'Excluded Items')}: ${stats.excludedItems}`;

    return tooltip;
  }

  /**
   * Get match level text
   */
  private static getMatchLevelText(level: string): string {
    switch (level) {
      case 'perfect':
        return t('matchLevel.perfect', 'Perfect Match');
      case 'high':
        return t('matchLevel.high', 'High Match');
      case 'moderate':
        return t('matchLevel.moderate', 'Moderate Match');
      case 'low':
        return t('matchLevel.low', 'Low Match');
      case 'very-low':
        return t('matchLevel.veryLow', 'Very Low Match');
      default:
        return t('matchLevel.unknown', 'Unknown');
    }
  }

  /**
   * Create match badge from item counts
   * Helper for when you only have counts, not full MatchStats
   */
  static fromCounts(
    matchedItems: number,
    totalItems: number,
    options?: Omit<TemplateMatchBadgeOptions, 'stats'>
  ): HTMLElement {
    const excludedItems = totalItems - matchedItems;
    const matchPercentage = totalItems > 0 ? (matchedItems / totalItems) * 100 : 0;

    const stats: MatchStats = {
      totalItems,
      matchedItems,
      excludedItems,
      matchPercentage
    };

    return this.render({
      stats,
      ...options
    });
  }
}
