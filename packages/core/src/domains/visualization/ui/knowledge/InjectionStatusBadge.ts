/**
 * InjectionStatusBadge - Visual Indicator for Injection Status
 *
 * Displays current injection status for templates and files.
 * Supports 5 status types with distinct visual styling.
 *
 * Status Types:
 * - NOT_INJECTED: ⚪ Not yet injected (gray)
 * - INJECTED: ✅ Successfully injected (green)
 * - PARTIAL: 🔵 Partially injected (blue)
 * - PENDING: 🔄 Pending changes (yellow)
 * - ERROR: ❌ Injection error (red)
 */

import { InjectionStatus, FileInjectionStatus } from '../../../knowledge/GroupTypes';
import { t } from '../../webview/i18n';

export interface InjectionStatusBadgeOptions {
  /** Current injection status */
  status: InjectionStatus;

  /** Optional file injection details */
  fileStatus?: FileInjectionStatus;

  /** Show detailed tooltip on hover */
  showTooltip?: boolean;

  /** Size variant */
  size?: 'small' | 'medium' | 'large';

  /** Click handler for interactive badges */
  onClick?: () => void;
}

export class InjectionStatusBadge {
  /**
   * Render a status badge for a template or file
   */
  static render(options: InjectionStatusBadgeOptions): HTMLElement {
    const {
      status,
      fileStatus,
      showTooltip = true,
      size = 'medium',
      onClick
    } = options;

    const badge = document.createElement('span');
    badge.className = `injection-status-badge status-${status} size-${size}`;

    if (onClick) {
      badge.classList.add('clickable');
      badge.addEventListener('click', onClick);
    }

    // Add icon
    const icon = document.createElement('span');
    icon.className = 'badge-icon';
    icon.textContent = this.getStatusIcon(status);
    badge.appendChild(icon);

    // Add label
    const label = document.createElement('span');
    label.className = 'badge-label';
    label.textContent = this.getStatusLabel(status);
    badge.appendChild(label);

    // Add tooltip if requested
    if (showTooltip) {
      badge.title = this.getTooltipText(status, fileStatus);
    }

    return badge;
  }

  /**
   * Render a compact status indicator (icon only)
   */
  static renderCompact(status: InjectionStatus, tooltip?: string): HTMLElement {
    const indicator = document.createElement('span');
    indicator.className = `injection-status-indicator status-${status}`;
    indicator.textContent = this.getStatusIcon(status);

    if (tooltip) {
      indicator.title = tooltip;
    } else {
      indicator.title = this.getStatusLabel(status);
    }

    return indicator;
  }

  /**
   * Render file injection status with details
   */
  static renderFileStatus(fileStatus: FileInjectionStatus): HTMLElement {
    const container = document.createElement('div');
    container.className = 'file-injection-status';

    // Determine overall status
    const status = this.determineFileStatus(fileStatus);

    // Add status badge
    const badge = this.render({
      status,
      fileStatus,
      showTooltip: true,
      size: 'medium'
    });
    container.appendChild(badge);

    // Add details
    const details = document.createElement('div');
    details.className = 'status-details';
    details.innerHTML = `
      <div class="status-line">
        <span class="label">${t('injection.totalGroups', 'Groups')}:</span>
        <span class="value">${fileStatus.totalGroups}</span>
      </div>
      <div class="status-line">
        <span class="label">${t('injection.individualItems', 'Items')}:</span>
        <span class="value">${fileStatus.individualItems}</span>
      </div>
      <div class="status-line">
        <span class="label">${t('injection.totalInjections', 'Total')}:</span>
        <span class="value">${fileStatus.totalInjections}</span>
      </div>
      ${fileStatus.warnings.length > 0 ? `
        <div class="status-line warning">
          <span class="label">${t('injection.warnings', 'Warnings')}:</span>
          <span class="value">${fileStatus.warnings.length}</span>
        </div>
      ` : ''}
    `;
    container.appendChild(details);

    return container;
  }

  /**
   * Get status icon
   */
  private static getStatusIcon(status: InjectionStatus): string {
    switch (status) {
      case InjectionStatus.NOT_INJECTED:
        return '⚪';
      case InjectionStatus.INJECTED:
        return '✅';
      case InjectionStatus.PARTIAL:
        return '🔵';
      case InjectionStatus.PENDING:
        return '🔄';
      case InjectionStatus.ERROR:
        return '❌';
      default:
        return '⚪';
    }
  }

  /**
   * Get status label
   */
  private static getStatusLabel(status: InjectionStatus): string {
    switch (status) {
      case InjectionStatus.NOT_INJECTED:
        return t('status.notInjected', 'Not Injected');
      case InjectionStatus.INJECTED:
        return t('status.injected', 'Injected');
      case InjectionStatus.PARTIAL:
        return t('status.partial', 'Partial');
      case InjectionStatus.PENDING:
        return t('status.pending', 'Pending');
      case InjectionStatus.ERROR:
        return t('status.error', 'Error');
      default:
        return t('status.unknown', 'Unknown');
    }
  }

  /**
   * Get detailed tooltip text
   */
  private static getTooltipText(status: InjectionStatus, fileStatus?: FileInjectionStatus): string {
    let tooltip = this.getStatusLabel(status);

    if (fileStatus) {
      tooltip += `\n\n`;
      tooltip += `${t('injection.totalGroups', 'Groups')}: ${fileStatus.totalGroups}\n`;
      tooltip += `${t('injection.individualItems', 'Items')}: ${fileStatus.individualItems}\n`;
      tooltip += `${t('injection.totalInjections', 'Total')}: ${fileStatus.totalInjections}`;

      if (fileStatus.warnings.length > 0) {
        tooltip += `\n\n${t('injection.warnings', 'Warnings')}:\n`;
        tooltip += fileStatus.warnings.slice(0, 3).join('\n');
        if (fileStatus.warnings.length > 3) {
          tooltip += `\n... and ${fileStatus.warnings.length - 3} more`;
        }
      }

      tooltip += `\n\n${t('injection.lastScanned', 'Last scanned')}: ${this.formatDate(fileStatus.lastScanned)}`;
    }

    return tooltip;
  }

  /**
   * Determine overall file status from FileInjectionStatus
   */
  private static determineFileStatus(fileStatus: FileInjectionStatus): InjectionStatus {
    if (fileStatus.warnings.length > 0) {
      return InjectionStatus.ERROR;
    }

    if (fileStatus.totalInjections === 0) {
      return InjectionStatus.NOT_INJECTED;
    }

    // If we have both groups and individual items, consider it complete
    if (fileStatus.totalGroups > 0 && fileStatus.individualItems > 0) {
      return InjectionStatus.INJECTED;
    }

    // If we have either groups or items, but not both, it's complete
    if (fileStatus.totalInjections > 0) {
      return InjectionStatus.INJECTED;
    }

    return InjectionStatus.NOT_INJECTED;
  }

  /**
   * Format date for display
   */
  private static formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // Less than 1 minute
    if (diff < 60000) {
      return t('time.justNow', 'just now');
    }

    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return t('time.minutesAgo', `${minutes} minute(s) ago`);
    }

    // Less than 1 day
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return t('time.hoursAgo', `${hours} hour(s) ago`);
    }

    // Format as date
    return date.toLocaleDateString();
  }
}
