/**
 * table-templates.ts - HTML templates for knowledge items table
 *
 * Provides template functions for generating table HTML elements.
 * Extracted from KnowledgeViewController for better maintainability.
 */

import { KnowledgeItem } from '../../../../knowledge/types';
import { getKnowledgeTypeIcon, getKnowledgeTypeLabel, getKnowledgeScopeLabel } from '../../../../knowledge/types';
import { MarkdownRenderer } from '../utils/MarkdownRenderer';

export class TableTemplates {
  /**
   * Template for empty state when no items exist
   */
  static emptyState(hasSearchQuery: boolean): string {
    return `
      <tr class="knowledge-empty-state">
        <td colspan="7" style="text-align: center; padding: 40px;">
          <div style="font-size: 48px; margin-bottom: 16px;">📚</div>
          <div style="font-size: 14px; color: var(--vscode-descriptionForeground);">
            ${hasSearchQuery ? 'No knowledge items match your search' : 'No knowledge items yet. Click "+ Add Item" to create your first item.'}
          </div>
        </td>
      </tr>
    `;
  }

  /**
   * Template for group header row (collapsible section)
   */
  static groupHeader(groupKey: string, icon: string, label: string, itemCount: number, isCollapsed: boolean): string {
    return `
      <td colspan="7">
        <span class="collapse-icon">${isCollapsed ? '▶' : '▼'}</span>
        ${icon} ${label} (${itemCount})
      </td>
    `;
  }

  /**
   * Template for a knowledge item row
   */
  static itemRow(item: KnowledgeItem, isSelected: boolean): string {
    const validClass = item.valid ? '' : 'invalid';

    return `
      <td class="col-select">
        <input type="checkbox"
               class="item-checkbox"
               data-item-id="${item.id}"
               ${isSelected ? 'checked' : ''}>
      </td>
      <td class="col-type ${validClass}">
        <span class="type-badge" data-type="${item.type}">
          ${getKnowledgeTypeIcon(item.type)} ${getKnowledgeTypeLabel(item.type)}
        </span>
      </td>
      <td class="col-title ${validClass}">
        <div class="item-title">${MarkdownRenderer.escapeHtml(item.title)}</div>
        ${!item.valid ? `<div class="item-error">${MarkdownRenderer.escapeHtml(item.parseError || 'Parse error')}</div>` : ''}
      </td>
      <td class="col-scope">
        <span class="scope-badge" data-scope="${item.scope}">
          ${getKnowledgeScopeLabel(item.scope)}
        </span>
      </td>
      <td class="col-tags">
        ${item.tags.map(tag => `<span class="tag-badge">${MarkdownRenderer.escapeHtml(tag)}</span>`).join(' ')}
      </td>
      <td class="col-source">
        ${item.source ? MarkdownRenderer.escapeHtml(item.source) : '-'}
      </td>
      <td class="col-actions">
        <button class="icon-button edit-btn" data-item-id="${item.id}" title="Edit">
          <svg width="16" height="16" viewBox="0 0 16 16" class="action-icon">
            <path d="M11.5 1.5l3 3-8.5 8.5H3v-3l8.5-8.5z M10 3l2 2" stroke="currentColor" fill="none" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="2" y1="14" x2="14" y2="14" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
        </button>
        <button class="icon-button delete-btn" data-item-id="${item.id}" title="Delete">
          <svg width="16" height="16" viewBox="0 0 16 16" class="action-icon">
            <path d="M3 4h10M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M6 7v5M8 7v5M10 7v5" stroke="currentColor" fill="none" stroke-width="1.2" stroke-linecap="round"/>
            <path d="M4 4l.5 9a1 1 0 001 1h5a1 1 0 001-1l.5-9" stroke="currentColor" fill="none" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
        </button>
      </td>
    `;
  }
}
