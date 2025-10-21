/**
 * accordion-templates.ts - HTML templates for Claude.md accordion
 *
 * Provides template functions for generating accordion HTML elements.
 * Extracted from KnowledgeViewController for better maintainability.
 */

import { MarkdownRenderer } from '../utils/MarkdownRenderer';

export interface ClaudeMdFile {
  path: string;
  relativePath: string;
  content: string;
  hasConflicts: boolean;
  templates: any[];
}

export class AccordionTemplates {
  /**
   * Template for empty state when no Claude.md files exist
   */
  static emptyState(): string {
    return `
      <div class="empty-state" style="padding: 20px; text-align: center;">
        <div style="font-size: 24px; margin-bottom: 8px;">📄</div>
        <div style="color: var(--vscode-descriptionForeground);">No claude.md files found</div>
      </div>
    `;
  }

  /**
   * Template for accordion header
   */
  static accordionHeader(file: ClaudeMdFile, isSelected: boolean): string {
    return `
      <span class="file-selector" data-file-path="${file.path}" title="Select this file as target for applying knowledge items">
        <input type="radio" name="selected-claude-file" ${isSelected ? 'checked' : ''}>
      </span>
      <span class="accordion-icon ab-collapsible-icon">▼</span>
      <span class="accordion-title ab-collapsible-title">📄 ${MarkdownRenderer.escapeHtml(file.relativePath)}</span>
      ${file.hasConflicts ? '<span class="conflict-badge ab-badge-error">⚠️ Conflicts</span>' : ''}
      ${file.templates.length > 0 ? `<span class="template-count ab-collapsible-badge">${file.templates.length}</span>` : ''}
    `;
  }

  /**
   * Template for Claude.md file content (with edit controls)
   */
  static claudeMdContent(file: ClaudeMdFile, renderedMarkdown: string | null): string {
    const editControls = `
      <div class="claude-md-controls">
        <button class="edit-claude-btn ab-btn-secondary" data-file-path="${file.path}" title="Edit claude.md content">
          <svg width="14" height="14" viewBox="0 0 16 16" class="action-icon" style="margin-right: 4px; opacity: 1;">
            <path d="M11.5 1.5l3 3-8.5 8.5H3v-3l8.5-8.5z M10 3l2 2" stroke="currentColor" fill="none" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="2" y1="14" x2="14" y2="14" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
          Edit Content
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
              <button class="save-claude-btn ab-btn-primary" data-file-path="${file.path}">💾 Save</button>
              <button class="cancel-claude-btn ab-btn-secondary" data-file-path="${file.path}">✖ Cancel</button>
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
              File is empty
            </div>
          </div>
          <div class="claude-md-editor" style="display: none;">
            <textarea class="claude-md-textarea"></textarea>
            <div class="claude-md-editor-actions">
              <button class="save-claude-btn ab-btn-primary" data-file-path="${file.path}">💾 Save</button>
              <button class="cancel-claude-btn ab-btn-secondary" data-file-path="${file.path}">✖ Cancel</button>
            </div>
          </div>
        </div>
      `;
    }
  }
}
