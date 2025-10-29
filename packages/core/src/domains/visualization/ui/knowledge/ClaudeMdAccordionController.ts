/**
 * ClaudeMdAccordionController - Manages Claude.md file accordion display and editing
 *
 * Handles accordion expansion, file selection, content editing, template management, and scroll position tracking.
 * Extracted from KnowledgeViewController for better separation of concerns.
 */

import { ClaudeMdFile } from '../../../knowledge/types';
import { AccordionTemplates } from './templates/accordion-templates';
import { MarkdownRenderer } from './utils/MarkdownRenderer';
import { webviewLogger, LogCategory, LogPathway } from '../../webview/WebviewLogger';
import { t, tf } from '../../webview/i18n';

export interface AccordionState {
  claudeMdFiles: ClaudeMdFile[];
}

export interface AccordionControllerCallbacks {
  onSaveContent: (filePath: string, content: string) => void;
  onRemoveTemplate: (templateId: string, filePath: string) => void;
  onRemoveInjection: (type: 'group' | 'item', groupType: string | null, groupId: string | null, itemId: string | null, filePath: string) => void;
  onScanFiles: () => void;
  onShowNotification: (message: string, type: 'info' | 'success' | 'warning' | 'error', duration?: number) => void;
  onFileSelected?: (filePath: string) => void;
}

export class ClaudeMdAccordionController {
  private state: AccordionState;
  private callbacks: AccordionControllerCallbacks;
  private expandedAccordions: Set<string> = new Set();
  private accordionScrollPositions: Map<string, number> = new Map();
  private selectedClaudeFile: string | null = null;

  constructor(callbacks: AccordionControllerCallbacks) {
    this.callbacks = callbacks;
    this.state = {
      claudeMdFiles: []
    };
  }

  /**
   * Load Claude.md files data
   */
  loadData(files: ClaudeMdFile[]): void {
    this.state.claudeMdFiles = files;
    this.renderClaudeMdAccordion();
  }

  /**
   * Get selected file path
   */
  getSelectedFile(): string | null {
    return this.selectedClaudeFile;
  }

  /**
   * Save accordion scroll positions before re-render
   */
  saveScrollPositions(): void {
    const accordionItems = document.querySelectorAll('.accordion-item');
    accordionItems.forEach((item) => {
      const filePath = (item as HTMLElement).dataset.filePath;
      const content = item.querySelector('.accordion-content');

      if (filePath && content) {
        const scrollTop = content.scrollTop;
        if (scrollTop > 0) {
          this.accordionScrollPositions.set(filePath, scrollTop);
          webviewLogger.debug(
            LogCategory.UI,
            'Saved scroll position for accordion',
            'ClaudeMdAccordionController.saveScrollPositions',
            { filePath, scrollTop },
            LogPathway.KNOWLEDGE_MANAGEMENT
          );
        }
      }
    });
  }

  /**
   * Restore accordion scroll positions after re-render
   */
  restoreScrollPositions(): void {
    // Use setTimeout to ensure DOM is fully updated
    setTimeout(() => {
      const accordionItems = document.querySelectorAll('.accordion-item');
      accordionItems.forEach((item) => {
        const filePath = (item as HTMLElement).dataset.filePath;
        const content = item.querySelector('.accordion-content');

        if (filePath && content) {
          const savedScrollTop = this.accordionScrollPositions.get(filePath);
          if (savedScrollTop !== undefined && savedScrollTop > 0) {
            content.scrollTop = savedScrollTop;
            webviewLogger.debug(
              LogCategory.UI,
              'Restored scroll position for accordion',
              'ClaudeMdAccordionController.restoreScrollPositions',
              { filePath, scrollTop: savedScrollTop },
              LogPathway.KNOWLEDGE_MANAGEMENT
            );
          }
        }
      });
    }, 0);
  }

  /**
   * Render the Claude.md files accordion
   */
  renderClaudeMdAccordion(): void {
    const container = document.getElementById('claude-files-accordion');
    if (!container) return;

    container.innerHTML = '';

    if (this.state.claudeMdFiles.length === 0) {
      container.innerHTML = AccordionTemplates.emptyState();
      return;
    }

    // Auto-select first file if none selected
    if (!this.selectedClaudeFile && this.state.claudeMdFiles.length > 0) {
      this.selectedClaudeFile = this.state.claudeMdFiles[0].path;
      // Notify parent controller to update injection indicators for auto-selected file
      this.callbacks.onFileSelected?.(this.selectedClaudeFile);
    }

    for (const file of this.state.claudeMdFiles) {
      const accordionItem = document.createElement('div');
      // Check if this accordion was previously expanded
      const isExpanded = this.expandedAccordions.has(file.path);
      const isSelected = this.selectedClaudeFile === file.path;
      accordionItem.className = `accordion-item ab-collapsible ${isExpanded ? 'expanded' : 'collapsed'} ${isSelected ? 'selected' : ''}`;
      accordionItem.dataset.filePath = file.path;

      const header = document.createElement('div');
      header.className = 'accordion-header ab-collapsible-header';
      header.innerHTML = AccordionTemplates.accordionHeader(file, isSelected);

      const content = document.createElement('div');
      content.className = 'accordion-content ab-collapsible-body';

      // Build content HTML
      let contentHTML = '';

      // Add Claude.md content section with edit controls
      const renderedMarkdown = (file.content && file.content.trim().length > 0)
        ? MarkdownRenderer.render(file.content)
        : null;
      contentHTML += AccordionTemplates.claudeMdContent(file, renderedMarkdown);

      // Add V2 groups/items section with removal buttons
      contentHTML += AccordionTemplates.v2GroupsSection(file);

      // Filter to only show actual templates, not individual items (item-xxx)
      // Individual items are shown in the "Individual Items" section
      const actualTemplates = file.templates.filter(t => t.templateId.startsWith('template-'));

      // Show templates section if any actual templates exist
      if (actualTemplates.length > 0) {
        // Check for duplicate template IDs
        const templateIds = actualTemplates.map(t => t.templateId);
        const duplicateIds = templateIds.filter((id, index) => templateIds.indexOf(id) !== index);
        const hasDuplicates = duplicateIds.length > 0;

        contentHTML += `<div class="templates-section">`;
        contentHTML += `<div class="templates-header">
          ${tf('template.appliedTemplates', { count: actualTemplates.length })}
          ${hasDuplicates ? `<span class="template-warning" title="${t('template.duplicatesDetected')}">${t('template.duplicatesWarning')}</span>` : ''}
        </div>`;
        contentHTML += actualTemplates.map((template, idx) => {
          const isDuplicate = duplicateIds.includes(template.templateId) &&
                              templateIds.indexOf(template.templateId) !== idx;
          return `
          <div class="template-section ${isDuplicate ? 'template-duplicate' : ''}">
            <div class="template-header">
              <div class="template-info">
                <div class="template-name-label">${t('template.templateLabel')}</div>
                <div class="template-name-value">${MarkdownRenderer.escapeHtml(template.templateName)}</div>
                ${isDuplicate ? `<div class="duplicate-badge">${t('template.duplicateBadge')}</div>` : ''}
              </div>
              <button class="remove-template-btn"
                      data-template-id="${template.templateId}"
                      data-file-path="${file.path}"
                      data-template-index="${idx}"
                      title="${tf('template.removeTooltip', { name: MarkdownRenderer.escapeHtml(template.templateName) })}">
                ${t('action.remove')}
              </button>
            </div>
            <div class="template-meta">
              <span class="template-id" title="${t('template.templateIdTooltip')}">${t('template.idPrefix')} ${MarkdownRenderer.escapeHtml(template.templateId.substring(0, 20))}...</span>
              <span class="template-lines">${tf('template.linesRange', { start: template.startLine, end: template.endLine })}</span>
            </div>
          </div>
        `;
        }).join('');
        contentHTML += `</div>`;
      }

      content.innerHTML = contentHTML;

      // Add event listener for file selection radio button
      const fileSelector = header.querySelector('.file-selector');
      if (fileSelector) {
        fileSelector.addEventListener('click', (e) => {
          e.stopPropagation(); // Don't trigger accordion toggle
          this.selectedClaudeFile = file.path;

          // Update all accordion items
          const allItems = document.querySelectorAll('.accordion-item');
          allItems.forEach(item => {
            const itemPath = (item as HTMLElement).dataset.filePath;
            if (itemPath === file.path) {
              item.classList.add('selected');
            } else {
              item.classList.remove('selected');
            }
          });

          webviewLogger.info(
            LogCategory.UI,
            'Selected claude.md file for applying knowledge',
            'ClaudeMdAccordionController.renderClaudeMdAccordion',
            { selectedFile: file.path },
            LogPathway.KNOWLEDGE_MANAGEMENT
          );

          // Notify parent controller to update injection indicators
          this.callbacks.onFileSelected?.(file.path);

          this.callbacks.onShowNotification(
            tf('template.selectedFileNotification', { path: file.relativePath }),
            'info',
            2000
          );
        });
      }

      // Add event listener to accordion header
      header.addEventListener('click', (e) => {
        // Don't toggle if clicking on the radio button
        if ((e.target as HTMLElement).closest('.file-selector')) {
          return;
        }
        const wasExpanded = accordionItem.classList.contains('expanded');

        // Toggle between expanded and collapsed
        if (wasExpanded) {
          accordionItem.classList.remove('expanded');
          accordionItem.classList.add('collapsed');
        } else {
          accordionItem.classList.remove('collapsed');
          accordionItem.classList.add('expanded');
        }

        // Track expansion state
        const filePath = accordionItem.dataset.filePath;
        if (filePath) {
          if (wasExpanded) {
            this.expandedAccordions.delete(filePath);
          } else {
            this.expandedAccordions.add(filePath);
          }
        }
      });

      // Add event listeners to all remove template buttons in this content
      const removeButtons = content.querySelectorAll('.remove-template-btn');
      removeButtons.forEach((btn) => {
        const button = btn as HTMLButtonElement;
        button.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const templateId = button.getAttribute('data-template-id');
          const filePath = button.getAttribute('data-file-path');
          if (templateId && filePath) {
            webviewLogger.debug(
              LogCategory.UI,
              'Remove template button clicked via event listener',
              'ClaudeMdAccordionController.renderClaudeMdAccordion',
              { templateId, filePath },
              LogPathway.KNOWLEDGE_MANAGEMENT
            );
            this.callbacks.onRemoveTemplate(templateId, filePath);
          }
        });
      });

      // Add event listeners to all remove injection buttons (V2 groups/items)
      const removeInjectionButtons = content.querySelectorAll('.remove-injection-btn');
      removeInjectionButtons.forEach((btn) => {
        const button = btn as HTMLButtonElement;
        button.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const injectionType = button.getAttribute('data-injection-type') as 'group' | 'item';
          const groupType = button.getAttribute('data-group-type');
          const groupId = button.getAttribute('data-group-id');
          const itemId = button.getAttribute('data-item-id');
          const filePath = button.getAttribute('data-file-path');

          if (filePath) {
            webviewLogger.debug(
              LogCategory.UI,
              'Remove injection button clicked',
              'ClaudeMdAccordionController.renderClaudeMdAccordion',
              { injectionType, groupType, groupId, itemId, filePath },
              LogPathway.KNOWLEDGE_MANAGEMENT
            );
            this.callbacks.onRemoveInjection(injectionType, groupType, groupId, itemId, filePath);
          }
        });
      });

      // Add event listeners for edit/save/cancel buttons
      const editBtn = content.querySelector('.edit-claude-btn') as HTMLButtonElement;
      const saveBtn = content.querySelector('.save-claude-btn') as HTMLButtonElement;
      const cancelBtn = content.querySelector('.cancel-claude-btn') as HTMLButtonElement;
      const displayDiv = content.querySelector('.claude-md-display') as HTMLElement;
      const editorDiv = content.querySelector('.claude-md-editor') as HTMLElement;
      const textarea = content.querySelector('.claude-md-textarea') as HTMLTextAreaElement;

      if (editBtn && displayDiv && editorDiv && textarea) {
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          displayDiv.style.display = 'none';
          editorDiv.style.display = 'block';
          editBtn.style.display = 'none';
          textarea.focus();
        });

        if (saveBtn) {
          saveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const filePath = saveBtn.getAttribute('data-file-path');
            const newContent = textarea.value;
            if (filePath) {
              this.callbacks.onSaveContent(filePath, newContent);
            }
          });
        }

        if (cancelBtn) {
          cancelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            displayDiv.style.display = 'block';
            editorDiv.style.display = 'none';
            editBtn.style.display = '';
            // Reset textarea to original content
            const fileData = this.state.claudeMdFiles.find(f => f.path === file.path);
            if (fileData && textarea) {
              textarea.value = fileData.content;
            }
          });
        }
      }

      accordionItem.appendChild(header);
      accordionItem.appendChild(content);
      container.appendChild(accordionItem);
    }
  }
}
