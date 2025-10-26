/**
 * AuditLogViewer - Displays audit trail for V1 templates
 *
 * Shows a timeline of all operations performed on a template,
 * including create, update, delete, clone, version operations.
 */

import { ModalDialog } from '../ModalDialog';
import { webviewLogger, LogCategory, LogPathway } from '../../webview/WebviewLogger';
import { t, tf } from '../../webview/i18n';

export interface AuditLogEntry {
  id: string;
  timestamp: Date | string;
  operation: string;
  actor: string;
  details: any;
  before?: any;
  after?: any;
}

export class AuditLogViewer {
  /**
   * Show audit log in a modal dialog
   */
  async showAuditLog(templateId: string, templateName: string, auditLog: AuditLogEntry[]): Promise<void> {
    webviewLogger.info(
      LogCategory.UI,
      'Showing audit log',
      'AuditLogViewer.showAuditLog',
      { templateId, entriesCount: auditLog?.length || 0 },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    const modal = new ModalDialog();

    await modal.show({
      title: tf('modal.auditLog', { name: templateName }),
      content: this.renderAuditLog(auditLog),
      buttons: [
        {
          label: t('action.close'),
          primary: false,
          onClick: () => {}
        }
      ],
      width: '900px'
    });
  }

  /**
   * Render audit log as HTML
   */
  private renderAuditLog(auditLog: AuditLogEntry[]): string {
    if (!auditLog || auditLog.length === 0) {
      return this.renderEmptyState();
    }

    const sortedLog = [...auditLog].sort((a, b) => {
      const aTime = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp.getTime();
      const bTime = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp.getTime();
      return bTime - aTime; // Most recent first
    });

    return `
      <div class="audit-log-container" style="padding: 20px;">
        <table class="audit-log-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead style="position: sticky; top: 0; background: var(--vscode-editor-background); z-index: 1;">
            <tr style="border-bottom: 2px solid var(--vscode-panel-border);">
              <th style="text-align: left; padding: 12px 8px; font-weight: 600; color: var(--vscode-descriptionForeground);">${t('column.timestamp')}</th>
              <th style="text-align: left; padding: 12px 8px; font-weight: 600; color: var(--vscode-descriptionForeground);">${t('column.operation')}</th>
              <th style="text-align: left; padding: 12px 8px; font-weight: 600; color: var(--vscode-descriptionForeground);">${t('column.actor')}</th>
              <th style="text-align: left; padding: 12px 8px; font-weight: 600; color: var(--vscode-descriptionForeground);">${t('column.details')}</th>
            </tr>
          </thead>
          <tbody>
            ${sortedLog.map(entry => this.renderAuditEntry(entry)).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Render a single audit entry
   */
  private renderAuditEntry(entry: AuditLogEntry): string {
    const timestamp = this.formatTimestamp(entry.timestamp);
    const operation = this.formatOperation(entry.operation);
    const details = this.formatDetails(entry.details, entry.operation);
    const actor = this.escapeHtml(entry.actor || t('audit.actorSystem'));

    return `
      <tr style="border-bottom: 1px solid var(--vscode-panel-border);">
        <td style="padding: 12px 8px; font-size: 12px; color: var(--vscode-descriptionForeground); white-space: nowrap;">
          ${timestamp}
        </td>
        <td style="padding: 12px 8px;">
          <span class="audit-operation" style="font-weight: 500;">
            ${operation}
          </span>
        </td>
        <td style="padding: 12px 8px; color: var(--vscode-descriptionForeground);">
          ${actor}
        </td>
        <td style="padding: 12px 8px; font-size: 12px;">
          ${details}
        </td>
      </tr>
    `;
  }

  /**
   * Render empty state
   */
  private renderEmptyState(): string {
    return `
      <div class="empty-state" style="text-align: center; padding: 60px 20px;">
        <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
        <div style="font-size: 16px; color: var(--vscode-descriptionForeground); margin-bottom: 8px;">
          ${t('audit.noEntriesYet')}
        </div>
        <div style="font-size: 13px; color: var(--vscode-descriptionForeground);">
          ${t('audit.operationsTrackedHere')}
        </div>
      </div>
    `;
  }

  /**
   * Format timestamp for display
   */
  private formatTimestamp(timestamp: Date | string): string {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString();

    return `
      <div>${dateStr}</div>
      <div style="font-size: 11px; color: var(--vscode-descriptionForeground);">${timeStr}</div>
    `;
  }

  /**
   * Format operation with icon
   */
  private formatOperation(operation: string): string {
    const icons: Record<string, string> = {
      'template_created': '✨',
      'template_updated': '✏️',
      'template_cloned': '📋',
      'template_deleted': '🗑️',
      'item_added': '➕',
      'item_updated': '📝',
      'item_deleted': '🗑️',
      'item_moved': '↔️',
      'item_copied': '📄',
      'version_created': '💾',
      'version_restored': '⏮️'
    };

    const icon = icons[operation] || '📌';
    const label = operation.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    return `${icon} ${label}`;
  }

  /**
   * Format details based on operation type
   */
  private formatDetails(details: any, operation: string): string {
    if (typeof details === 'string') {
      return this.escapeHtml(details);
    }

    if (!details) {
      return '-';
    }

    const parts: string[] = [];

    // Operation-specific formatting
    if (operation.includes('item')) {
      if (details.itemId) {
        parts.push(`<span style="font-family: monospace; background: var(--vscode-textCodeBlock-background); padding: 2px 4px; border-radius: 2px;">${this.escapeHtml(details.itemId.substring(0, 8))}</span>`);
      }
      if (details.itemTitle) {
        parts.push(`"${this.escapeHtml(details.itemTitle)}"`);
      }
      if (details.itemType) {
        parts.push(`<span style="color: var(--vscode-textLink-foreground);">[${this.escapeHtml(details.itemType)}]</span>`);
      }
      if (details.itemCount !== undefined) {
        parts.push(tf('audit.itemCount', { count: details.itemCount }));
      }
    }

    if (operation.includes('version')) {
      if (details.versionNumber) {
        parts.push(`<strong style="color: var(--vscode-textLink-activeForeground);">v${this.escapeHtml(details.versionNumber)}</strong>`);
      }
      if (details.description) {
        parts.push(`<em>${this.escapeHtml(details.description)}</em>`);
      }
    }

    if (operation.includes('clone')) {
      if (details.sourceTemplateName) {
        parts.push(`${t('audit.from')} <strong>"${this.escapeHtml(details.sourceTemplateName)}"</strong>`);
      } else if (details.sourceTemplateId) {
        parts.push(`${t('audit.from')} <span style="font-family: monospace; background: var(--vscode-textCodeBlock-background); padding: 2px 4px; border-radius: 2px;">${this.escapeHtml(details.sourceTemplateId.substring(0, 8))}</span>`);
      }
      if (details.shallow !== undefined) {
        parts.push(details.shallow ? `<span style="color: var(--vscode-descriptionForeground);">(${t('audit.shallow')})</span>` : `<span style="color: var(--vscode-descriptionForeground);">(${t('audit.deep')})</span>`);
      }
    }

    if (details.comment) {
      parts.push(this.escapeHtml(details.comment));
    }

    // If no specific formatting, try generic JSON display
    if (parts.length === 0) {
      const simplified = this.simplifyDetails(details);
      return `<code style="font-size: 11px; background: var(--vscode-textCodeBlock-background); padding: 2px 4px; border-radius: 2px; max-width: 300px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this.escapeHtml(simplified)}</code>`;
    }

    return parts.join(' • ');
  }

  /**
   * Simplify details object for display
   */
  private simplifyDetails(details: any): string {
    try {
      const simplified: any = {};
      for (const key in details) {
        if (details.hasOwnProperty(key) && key !== 'before' && key !== 'after') {
          simplified[key] = details[key];
        }
      }
      return JSON.stringify(simplified);
    } catch {
      return String(details);
    }
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
