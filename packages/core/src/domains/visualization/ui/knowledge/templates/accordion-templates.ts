/**
 * accordion-templates.ts - HTML templates for Claude.md accordion
 *
 * Provides template functions for generating accordion HTML elements.
 * Extracted from KnowledgeViewController for better maintainability.
 */

import { MarkdownRenderer } from '../utils/MarkdownRenderer';
import { t, tf } from '../../../webview/i18n';
import { ScanResult } from '../../../../knowledge/GroupTypes';

export interface ClaudeMdFile {
  path: string;
  relativePath: string;
  content: string;
  hasConflicts: boolean;
  conflicts?: string[];
  templates: any[];
  // V2 Group Injection Scan Results
  groups?: number;
  individualItems?: number;
  totalInjections?: number;
  scanWarnings?: string[];
  scanResult?: ScanResult;
}

export class AccordionTemplates {
  /**
   * Template for empty state when no Claude.md files exist
   */
  static emptyState(): string {
    return `
      <div class="empty-state" style="padding: 20px; text-align: center;">
        <div style="font-size: 24px; margin-bottom: 8px;">📄</div>
        <div style="color: var(--vscode-descriptionForeground);">${t('claudemd.noFilesFound')}</div>
      </div>
    `;
  }

  /**
   * Template for accordion header
   */
  static accordionHeader(file: ClaudeMdFile, isSelected: boolean): string {
    // Build V2 injection tooltip with item names
    let v2Tooltip = '';
    const totalInjections = (file.totalInjections ?? 0);
    if (totalInjections > 0 && file.scanResult) {
      // Build detailed tooltip with group/item names
      v2Tooltip = `Injections: ${totalInjections}&#10;&#10;`;

      // List groups with their item counts
      if (file.scanResult.groups.length > 0) {
        v2Tooltip += `Groups (${file.scanResult.groups.length}):&#10;`;
        file.scanResult.groups.forEach(group => {
          const groupLabel = `${group.type}: ${group.id}`;
          const itemInfo = group.items && group.items.length > 0 ? ` (${group.items.length} items)` : '';
          v2Tooltip += `  • ${groupLabel}${itemInfo}&#10;`;
        });
      }

      // List individual items
      if (file.scanResult.individualItems.length > 0) {
        if (file.scanResult.groups.length > 0) {
          v2Tooltip += `&#10;`;
        }
        v2Tooltip += `Individual Items (${file.scanResult.individualItems.length}):&#10;`;
        file.scanResult.individualItems.forEach(item => {
          v2Tooltip += `  • ${item.id}&#10;`;
        });
      }
    } else if (totalInjections > 0) {
      // Fallback if no scan result
      const groups = file.groups ?? 0;
      const individualItems = file.individualItems ?? 0;
      v2Tooltip = `Injections: ${totalInjections}&#10;`;
      if (groups > 0) {
        v2Tooltip += `Groups: ${groups}&#10;`;
      }
      if (individualItems > 0) {
        v2Tooltip += `Individual Items: ${individualItems}&#10;`;
      }
      if (file.scanWarnings && file.scanWarnings.length > 0) {
        v2Tooltip += `&#10;Warnings: ${file.scanWarnings.length}`;
      }
    }

    // Build conflict tooltip if there are validation errors
    let conflictTooltip = '';
    if (file.hasConflicts && file.conflicts && file.conflicts.length > 0) {
      conflictTooltip = file.conflicts.join('&#10;'); // Use &#10; for newlines in HTML title attribute
    }

    return `
      <span class="file-selector" data-file-path="${file.path}" title="${t('claudemd.selectFileTooltip')}">
        <input type="radio" name="selected-claude-file" ${isSelected ? 'checked' : ''}>
      </span>
      <span class="accordion-icon ab-collapsible-icon">▼</span>
      <span class="accordion-title ab-collapsible-title">📄 ${MarkdownRenderer.escapeHtml(file.relativePath)}</span>
      ${file.hasConflicts ? `<span class="conflict-badge ab-badge-error" title="${conflictTooltip}">${t('template.conflictsBadge')}</span>` : ''}
      ${totalInjections > 0 ? `<span class="injection-count ab-collapsible-badge" style="background: rgba(0, 200, 100, 0.2); border: 1px solid rgba(0, 200, 100, 0.4);" title="${v2Tooltip}">✅ ${totalInjections}</span>` : ''}
      ${(file.scanWarnings && file.scanWarnings.length > 0) ? `<span class="warning-badge ab-badge-warning" title="${file.scanWarnings.join('&#10;')}">⚠️</span>` : ''}
    `;
  }

  /**
   * Template for Claude.md file content (with edit controls)
   */
  static claudeMdContent(file: ClaudeMdFile, renderedMarkdown: string | null): string {
    const editControls = `
      <div class="claude-md-controls">
        <button class="edit-claude-btn ab-btn-secondary" data-file-path="${file.path}" title="${t('claudemd.editContentTooltip')}">
          <svg width="14" height="14" viewBox="0 0 16 16" class="action-icon" style="margin-right: 4px; opacity: 1;">
            <path d="M11.5 1.5l3 3-8.5 8.5H3v-3l8.5-8.5z M10 3l2 2" stroke="currentColor" fill="none" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="2" y1="14" x2="14" y2="14" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
          ${t('claudemd.editContent')}
        </button>
      </div>
    `;

    if (file.content && file.content.trim().length > 0) {
      return `
        ${editControls}
        <div class="claude-md-content" data-file-path="${file.path}">
          <div class="claude-md-display">
            ${renderedMarkdown}
          </div>
          <div class="claude-md-editor" style="display: none;">
            <textarea class="claude-md-textarea">${MarkdownRenderer.escapeHtml(file.content)}</textarea>
            <div class="claude-md-editor-actions">
              <button class="save-claude-btn ab-btn-primary" data-file-path="${file.path}">💾 ${t('claudemd.save')}</button>
              <button class="cancel-claude-btn ab-btn-secondary" data-file-path="${file.path}">✖ ${t('claudemd.cancel')}</button>
            </div>
          </div>
        </div>
      `;
    } else {
      return `
        ${editControls}
        <div class="claude-md-content" data-file-path="${file.path}">
          <div class="claude-md-display">
            <div style="padding: 12px; color: var(--vscode-descriptionForeground); font-style: italic;">
              ${t('claudemd.fileIsEmpty')}
            </div>
          </div>
          <div class="claude-md-editor" style="display: none;">
            <textarea class="claude-md-textarea"></textarea>
            <div class="claude-md-editor-actions">
              <button class="save-claude-btn ab-btn-primary" data-file-path="${file.path}">💾 ${t('claudemd.save')}</button>
              <button class="cancel-claude-btn ab-btn-secondary" data-file-path="${file.path}">✖ ${t('claudemd.cancel')}</button>
            </div>
          </div>
        </div>
      `;
    }
  }

  /**
   * Template for V2 groups and items section with removal buttons
   */
  static v2GroupsSection(file: ClaudeMdFile): string {
    if (!file.scanResult || file.scanResult.totalInjectionCount === 0) {
      return '';
    }

    let sectionsHTML = '';

    // Add groups section
    if (file.scanResult.groups.length > 0) {
      sectionsHTML += `<div class="injections-section">`;
      sectionsHTML += `<div class="injections-header">
        📦 Injected Groups (${file.scanResult.groups.length})
      </div>`;

      file.scanResult.groups.forEach((group, idx) => {
        sectionsHTML += `
        <div class="injection-item">
          <div class="injection-content">
            <div class="injection-details">
              <div class="injection-info-row">
                <span class="injection-label">Type:</span>
                <span class="injection-value">${MarkdownRenderer.escapeHtml(group.type)}</span>
              </div>
              <div class="injection-info-row">
                <span class="injection-label">ID:</span>
                <span class="injection-value">${MarkdownRenderer.escapeHtml(group.id.substring(0, 35))}${group.id.length > 35 ? '...' : ''}</span>
              </div>
              <div class="injection-info-row">
                <span class="injection-label">Lines:</span>
                <span class="injection-value">${group.lineStart}-${group.lineEnd}</span>
                ${group.items && group.items.length > 0 ? `<span class="injection-badge">${group.items.length} item(s)</span>` : ''}
              </div>
            </div>
          </div>
          <button class="remove-injection-btn ab-btn-danger-small"
                  data-group-type="${group.type}"
                  data-group-id="${group.id}"
                  data-file-path="${file.path}"
                  data-injection-type="group"
                  title="Remove this group">
            ✖ Remove
          </button>
        </div>
      `;
      });
      sectionsHTML += `</div>`;
    }

    // Add individual items section
    if (file.scanResult.individualItems.length > 0) {
      sectionsHTML += `<div class="injections-section">`;
      sectionsHTML += `<div class="injections-header">
        📄 Individual Items (${file.scanResult.individualItems.length})
      </div>`;

      file.scanResult.individualItems.forEach((item, idx) => {
        sectionsHTML += `
        <div class="injection-item">
          <div class="injection-content">
            <div class="injection-details">
              <div class="injection-info-row">
                <span class="injection-label">Item:</span>
                <span class="injection-value">${MarkdownRenderer.escapeHtml(item.id)}</span>
              </div>
              <div class="injection-info-row">
                <span class="injection-label">Line:</span>
                <span class="injection-value">${item.line}</span>
              </div>
            </div>
          </div>
          <button class="remove-injection-btn ab-btn-danger-small"
                  data-item-id="${item.id}"
                  data-file-path="${file.path}"
                  data-injection-type="item"
                  title="Remove this item">
            ✖ Remove
          </button>
        </div>
      `;
      });
      sectionsHTML += `</div>`;
    }

    return sectionsHTML;
  }
}
