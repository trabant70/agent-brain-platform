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

export interface AccordionState {
  claudeMdFiles: ClaudeMdFile[];
}

export interface AccordionControllerCallbacks {
  onSaveContent: (filePath: string, content: string) => void;
  onRemoveTemplate: (templateId: string, filePath: string) => void;
  onScanFiles: () => void;
  onShowNotification: (message: string, type: 'info' | 'success' | 'warning' | 'error', duration?: number) => void;
}

export class ClaudeMdAccordionController {
  private state: AccordionState;
  private callbacks: AccordionControllerCallbacks;
  private expandedAccordions: Set<string> = new Set();
  private accordionScrollPositions: Map<string, number> = new Map();
  private scrollToBottom: Set<string> = new Set(); // Track files that should scroll to bottom
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
    const accordions = document.querySelectorAll('.accordion-content');
    accordions.forEach(accordion => {
      const filePath = (accordion.parentElement as HTMLElement)?.dataset.filePath;
      if (filePath) {
        this.accordionScrollPositions.set(filePath, accordion.scrollTop);

        // Check if user is scrolled near the bottom (within 50px)
        const isNearBottom = accordion.scrollTop + accordion.clientHeight >= accordion.scrollHeight - 50;
        if (isNearBottom) {
          this.scrollToBottom.add(filePath);
        } else {
          this.scrollToBottom.delete(filePath);
        }
      }
    });
  }

  /**
   * Restore accordion scroll positions after re-render
   */
  restoreScrollPositions(): void {
    // Wait for next frame to ensure DOM has updated
    requestAnimationFrame(() => {
      this.accordionScrollPositions.forEach((scrollTop, filePath) => {
        const accordionItem = document.querySelector(
          `.accordion-item[data-file-path="${filePath}"]`
        );
        if (accordionItem) {
          const content = accordionItem.querySelector('.accordion-content');
          if (content) {
            // If this file was scrolled to bottom, scroll to new bottom instead of saved position
            if (this.scrollToBottom.has(filePath)) {
              content.scrollTop = content.scrollHeight;
            } else {
              content.scrollTop = scrollTop;
            }
          }
        }
      });
    });
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

      // Show templates section if any
      if (file.templates.length > 0) {
        // Check for duplicate template IDs
        const templateIds = file.templates.map(t => t.templateId);
        const duplicateIds = templateIds.filter((id, index) => templateIds.indexOf(id) !== index);
        const hasDuplicates = duplicateIds.length > 0;

        contentHTML += `<div class="templates-section">`;
        contentHTML += `<div class="templates-header">
          Applied Templates (${file.templates.length})
          ${hasDuplicates ? '<span class="template-warning" title="Duplicate templates detected">⚠️ Duplicates</span>' : ''}
        </div>`;
        contentHTML += file.templates.map((template, idx) => {
          const isDuplicate = duplicateIds.includes(template.templateId) &&
                              templateIds.indexOf(template.templateId) !== idx;
          return `
          <div class="template-section ${isDuplicate ? 'template-duplicate' : ''}">
            <div class="template-header">
              <div class="template-info">
                <div class="template-name-label">Template:</div>
                <div class="template-name-value">${MarkdownRenderer.escapeHtml(template.templateName)}</div>
                ${isDuplicate ? '<div class="duplicate-badge">Duplicate</div>' : ''}
              </div>
              <button class="remove-template-btn"
                      data-template-id="${template.templateId}"
                      data-file-path="${file.path}"
                      data-template-index="${idx}"
                      title="Remove template '${MarkdownRenderer.escapeHtml(template.templateName)}'">
                Remove
              </button>
            </div>
            <div class="template-meta">
              <span class="template-id" title="Template ID">ID: ${MarkdownRenderer.escapeHtml(template.templateId.substring(0, 20))}...</span>
              <span class="template-lines">Lines ${template.startLine}-${template.endLine}</span>
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

          this.callbacks.onShowNotification(
            `Selected ${file.relativePath} as target for knowledge items`,
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

      // Track scroll position when user scrolls
      content.addEventListener('scroll', () => {
        const filePath = accordionItem.dataset.filePath;
        if (filePath) {
          this.accordionScrollPositions.set(filePath, content.scrollTop);

          // Check if user is scrolled near the bottom (within 50px)
          const isNearBottom = content.scrollTop + content.clientHeight >= content.scrollHeight - 50;
          if (isNearBottom) {
            this.scrollToBottom.add(filePath);
          } else {
            this.scrollToBottom.delete(filePath);
          }
        }
      });

      accordionItem.appendChild(header);
      accordionItem.appendChild(content);
      container.appendChild(accordionItem);
    }
  }
}
