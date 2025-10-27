/**
 * InjectionPreviewDialog - Preview Knowledge Group Injection
 *
 * Shows users what will be injected before committing to the operation.
 * Displays matched/excluded items, group metadata, and estimated size.
 *
 * Features:
 * - Item-by-item breakdown with match reasons
 * - Visual indicators for matched (✅) vs excluded (⭕) items
 * - Maturity context display
 * - Estimated content size
 * - Toggle to show excluded items
 * - Option to override filtering (inject all items)
 */

import { InjectionPreview, MatchReason, GroupType } from '../../../knowledge/GroupTypes';
import { t } from '../../webview/i18n';
import { ModalDialog } from '../ModalDialog';

export interface InjectionPreviewCallbacks {
  /**
   * Called when user confirms injection
   * @param includeAllItems If true, override filtering and inject all items
   */
  onConfirm: (includeAllItems: boolean) => void;

  /**
   * Called when user cancels
   */
  onCancel: () => void;
}

export class InjectionPreviewDialog {
  private showExcludedItems = false;

  /**
   * Show injection preview dialog
   * Returns promise that resolves when user makes a decision
   */
  async show(
    preview: InjectionPreview,
    callbacks: InjectionPreviewCallbacks
  ): Promise<void> {
    const modal = new ModalDialog();

    try {
      await modal.show({
        title: t('injection.previewTitle', 'Preview Knowledge Injection'),
        content: this.renderPreviewContent(preview),
        buttons: [
          {
            label: t('button.cancel', 'Cancel'),
            onClick: () => {
              callbacks.onCancel();
              modal.close();
            }
          },
          {
            label: t('injection.injectMatchedOnly', 'Inject Matched Items'),
            primary: true,
            onClick: () => {
              callbacks.onConfirm(false);
              modal.close();
            }
          },
          {
            label: t('injection.injectAll', 'Inject All Items'),
            onClick: () => {
              callbacks.onConfirm(true);
              modal.close();
            }
          }
        ],
        width: '800px'
      });

      // Attach event listeners after modal renders
      setTimeout(() => {
        this.attachEventListeners(modal, preview);
      }, 0);
    } catch (error) {
      console.error('[InjectionPreviewDialog] Error showing preview:', error);
      throw error;
    }
  }

  /**
   * Render preview content
   */
  private renderPreviewContent(preview: InjectionPreview): string {
    const matchPercentage = preview.totalItems > 0
      ? Math.round((preview.matchedItems.length / preview.totalItems) * 100)
      : 0;

    return `
      <div class="injection-preview">
        <!-- Summary Section -->
        <div class="preview-summary">
          <div class="summary-stat">
            <span class="stat-label">${t('injection.groupType', 'Group Type')}:</span>
            <span class="stat-value">${this.formatGroupType(preview.groupType)}</span>
          </div>
          <div class="summary-stat">
            <span class="stat-label">${t('injection.totalItems', 'Total Items')}:</span>
            <span class="stat-value">${preview.totalItems}</span>
          </div>
          <div class="summary-stat">
            <span class="stat-label">${t('injection.matchedItems', 'Matched Items')}:</span>
            <span class="stat-value match-count">${preview.matchedItems.length} (${matchPercentage}%)</span>
          </div>
          <div class="summary-stat">
            <span class="stat-label">${t('injection.excludedItems', 'Excluded Items')}:</span>
            <span class="stat-value exclude-count">${preview.excludedItems.length}</span>
          </div>
          <div class="summary-stat">
            <span class="stat-label">${t('injection.estimatedSize', 'Estimated Size')}:</span>
            <span class="stat-value">${this.formatSize(preview.estimatedSize)}</span>
          </div>
        </div>

        <!-- Match Indicator -->
        <div class="match-indicator ${matchPercentage === 100 ? 'full-match' : matchPercentage > 50 ? 'partial-match' : 'low-match'}">
          <div class="match-bar" style="width: ${matchPercentage}%"></div>
          <span class="match-label">${matchPercentage}% Match</span>
        </div>

        <!-- Matched Items Section -->
        <div class="preview-section">
          <h4>✅ ${t('injection.matchedItemsTitle', 'Items to be Injected')} (${preview.matchedItems.length})</h4>
          <div class="items-list matched-items">
            ${preview.matchedItems.length > 0
              ? preview.matchedItems.map(item => this.renderMatchedItem(item)).join('')
              : `<p class="empty-message">${t('injection.noMatchedItems', 'No items match the current maturity context')}</p>`
            }
          </div>
        </div>

        <!-- Excluded Items Section (Collapsible) -->
        ${preview.excludedItems.length > 0 ? `
          <div class="preview-section excluded-section">
            <h4 class="toggle-header" id="toggle-excluded">
              <span class="toggle-icon">▶</span>
              ⭕ ${t('injection.excludedItemsTitle', 'Excluded Items')} (${preview.excludedItems.length})
            </h4>
            <div class="items-list excluded-items" style="display: none;">
              ${preview.excludedItems.map(item => this.renderExcludedItem(item)).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Markers Preview -->
        <div class="preview-section markers-section">
          <h4>${t('injection.markersPreview', 'Markers Preview')}</h4>
          <div class="markers-preview">
            <code class="marker-start">${this.escapeHtml(preview.markers.start)}</code>
            <span class="marker-separator">...</span>
            <code class="marker-end">${this.escapeHtml(preview.markers.end)}</code>
          </div>
        </div>

        <!-- Help Text -->
        <div class="preview-help">
          <p><strong>${t('injection.helpTitle', 'What happens next?')}</strong></p>
          <ul>
            <li><strong>${t('injection.injectMatchedOnly')}:</strong> ${t('injection.helpMatchedOnly', 'Only items that match your current maturity context will be injected')}</li>
            <li><strong>${t('injection.injectAll')}:</strong> ${t('injection.helpAll', 'All items will be injected, regardless of maturity context')}</li>
          </ul>
        </div>
      </div>
    `;
  }

  /**
   * Render a matched item with its reasons
   */
  private renderMatchedItem(match: MatchReason): string {
    const dimensionIcons = this.getDimensionIcons(match.dimensions);

    return `
      <div class="item-card matched">
        <div class="item-header">
          <span class="item-icon">✅</span>
          <span class="item-id">${match.itemId}</span>
          <span class="dimension-icons">${dimensionIcons}</span>
        </div>
        <div class="item-reasons">
          ${match.reasons.map(reason => `
            <div class="reason-tag success">${this.escapeHtml(reason)}</div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render an excluded item with its reasons
   */
  private renderExcludedItem(match: MatchReason): string {
    const dimensionIcons = this.getDimensionIcons(match.dimensions);

    return `
      <div class="item-card excluded">
        <div class="item-header">
          <span class="item-icon">⭕</span>
          <span class="item-id">${match.itemId}</span>
          <span class="dimension-icons">${dimensionIcons}</span>
        </div>
        <div class="item-reasons">
          ${match.reasons.map(reason => `
            <div class="reason-tag warning">${this.escapeHtml(reason)}</div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Get dimension icons based on match status
   */
  private getDimensionIcons(dimensions: { operator: boolean; project: boolean; complexity: boolean }): string {
    const icons: string[] = [];

    if (dimensions.operator) {
      icons.push(`<span class="dimension-icon match" title="Operator matches">👤</span>`);
    } else {
      icons.push(`<span class="dimension-icon no-match" title="Operator mismatch">👤</span>`);
    }

    if (dimensions.project) {
      icons.push(`<span class="dimension-icon match" title="Project matches">📁</span>`);
    } else {
      icons.push(`<span class="dimension-icon no-match" title="Project mismatch">📁</span>`);
    }

    if (dimensions.complexity) {
      icons.push(`<span class="dimension-icon match" title="Complexity matches">⚙️</span>`);
    } else {
      icons.push(`<span class="dimension-icon no-match" title="Complexity mismatch">⚙️</span>`);
    }

    return icons.join('');
  }

  /**
   * Format group type for display
   */
  private formatGroupType(groupType: GroupType): string {
    switch (groupType) {
      case GroupType.TEMPLATE:
        return t('groupType.template', 'Template');
      case GroupType.OPERATOR_RANGE:
        return t('groupType.operatorRange', 'Operator Range');
      case GroupType.PROJECT_RANGE:
        return t('groupType.projectRange', 'Project Range');
      case GroupType.COMPLEXITY_RANGE:
        return t('groupType.complexityRange', 'Complexity Range');
      case GroupType.CATCHMENT:
        return t('groupType.catchment', 'Catchment Basin');
      default:
        return groupType;
    }
  }

  /**
   * Format size in bytes to human-readable format
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Attach event listeners to dialog elements
   */
  private attachEventListeners(modal: ModalDialog, preview: InjectionPreview): void {
    // Toggle excluded items
    const toggleButton = document.getElementById('toggle-excluded');
    const excludedList = document.querySelector('.excluded-items') as HTMLElement;

    toggleButton?.addEventListener('click', () => {
      this.showExcludedItems = !this.showExcludedItems;

      const icon = toggleButton.querySelector('.toggle-icon');
      if (icon) {
        icon.textContent = this.showExcludedItems ? '▼' : '▶';
      }

      if (excludedList) {
        excludedList.style.display = this.showExcludedItems ? 'block' : 'none';
      }
    });
  }
}
