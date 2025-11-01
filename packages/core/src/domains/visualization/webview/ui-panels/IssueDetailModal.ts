/**
 * Issue Detail Modal
 * Displays full issue information in a modal overlay
 *
 * Purpose: Provide better UX for viewing complete issue details
 * Benefits:
 * - All issue metadata visible without table overflow
 * - Copy-to-clipboard functionality
 * - Better readability for long messages/suggestions
 */

export interface IssueDetail {
  severity: string;
  file?: string;
  filePath?: string;
  line?: number;
  column?: number;
  message?: string;
  description?: string;
  title?: string;
  suggestion?: string;
  recommendation?: string;
  source?: string;
  impact?: string;
  category?: string;
}

export class IssueDetailModal {
  private modal: HTMLElement | null = null;
  private isOpen: boolean = false;

  /**
   * Show modal with issue details
   */
  show(issue: IssueDetail, categoryName: string): void {
    if (this.isOpen) {
      this.close();
    }

    this.createModal(issue, categoryName);
    this.isOpen = true;

    // Focus trap and accessibility
    setTimeout(() => {
      const closeButton = document.getElementById('close-issue-modal');
      if (closeButton) {
        closeButton.focus();
      }
    }, 100);
  }

  /**
   * Create modal element
   */
  private createModal(issue: IssueDetail, categoryName: string): void {
    // Remove existing modal if any
    if (this.modal) {
      this.modal.remove();
    }

    this.modal = document.createElement('div');
    this.modal.id = 'issue-detail-modal-container';

    const file = issue.file || issue.filePath || 'N/A';
    const message = issue.message || issue.description || issue.title || 'No description available';
    const suggestion = issue.suggestion || issue.recommendation;
    const location = issue.line
      ? `Line ${issue.line}${issue.column ? `:${issue.column}` : ''}`
      : 'N/A';

    this.modal.innerHTML = `
      <div class="modal-overlay" id="issue-modal-overlay">
        <div class="modal-content issue-detail-modal">
          <div class="modal-header">
            <h3>Issue Details</h3>
            <button class="modal-close" id="close-issue-modal" title="Close (Esc)">×</button>
          </div>

          <div class="modal-body">
            <div class="detail-grid">
              <div class="detail-row">
                <span class="detail-label">Category:</span>
                <span class="detail-value">${this.escapeHtml(categoryName)}</span>
              </div>

              <div class="detail-row">
                <span class="detail-label">Severity:</span>
                <span class="severity-badge severity-${issue.severity}">
                  ${issue.severity.toUpperCase()}
                </span>
              </div>

              <div class="detail-row full-width">
                <span class="detail-label">File:</span>
                <div class="detail-value detail-file">
                  <code>${this.escapeHtml(file)}</code>
                  ${file !== 'N/A' ? `
                    <button class="btn-copy" data-copy="${this.escapeHtml(file)}" title="Copy file path">
                      📋 Copy
                    </button>
                  ` : ''}
                </div>
              </div>

              <div class="detail-row">
                <span class="detail-label">Location:</span>
                <span class="detail-value">
                  ${this.escapeHtml(location)}
                </span>
              </div>

              ${issue.source ? `
                <div class="detail-row">
                  <span class="detail-label">Source:</span>
                  <span class="detail-value">${this.escapeHtml(issue.source)}</span>
                </div>
              ` : ''}

              <div class="detail-row full-width">
                <span class="detail-label">Issue:</span>
                <div class="detail-message">
                  ${this.escapeHtml(message)}
                </div>
              </div>

              ${suggestion ? `
                <div class="detail-row full-width">
                  <span class="detail-label">💡 Suggestion:</span>
                  <div class="detail-suggestion">
                    ${this.escapeHtml(suggestion)}
                  </div>
                </div>
              ` : ''}

              ${issue.impact ? `
                <div class="detail-row full-width">
                  <span class="detail-label">Impact:</span>
                  <div class="detail-impact">
                    ${this.escapeHtml(issue.impact)}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>

          <div class="modal-footer">
            ${file !== 'N/A' ? `
              <button class="btn btn-primary" id="goto-file-btn">
                Open File
              </button>
            ` : ''}
            <button class="btn btn-secondary" id="close-modal-btn">
              Close
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.modal);
    this.attachEventListeners(issue);
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(issue: IssueDetail): void {
    // Close button (X)
    const closeButton = document.getElementById('close-issue-modal');
    if (closeButton) {
      closeButton.addEventListener('click', () => this.close());
    }

    // Close button (footer)
    const closeModalBtn = document.getElementById('close-modal-btn');
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => this.close());
    }

    // Click outside to close
    const overlay = document.getElementById('issue-modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.close();
        }
      });
    }

    // ESC key to close
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.close();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);

    // Copy button
    const copyButtons = this.modal?.querySelectorAll('.btn-copy');
    copyButtons?.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const text = (e.target as HTMLElement).dataset.copy || '';
        this.copyToClipboard(text);
      });
    });

    // Go to file button
    const gotoFileBtn = document.getElementById('goto-file-btn');
    if (gotoFileBtn) {
      gotoFileBtn.addEventListener('click', () => {
        this.openFile(issue);
      });
    }
  }

  /**
   * Close modal
   */
  close(): void {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
    this.isOpen = false;
  }

  /**
   * Copy text to clipboard
   */
  private copyToClipboard(text: string): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.showToast('Copied to clipboard');
      }).catch(err => {
        console.error('Failed to copy:', err);
        this.showToast('Failed to copy');
      });
    } else {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        this.showToast('Copied to clipboard');
      } catch (err) {
        console.error('Failed to copy:', err);
        this.showToast('Failed to copy');
      }
      document.body.removeChild(textarea);
    }
  }

  /**
   * Show toast notification
   */
  private showToast(message: string): void {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 2000);
  }

  /**
   * Open file in editor
   */
  private openFile(issue: IssueDetail): void {
    const file = issue.file || issue.filePath;
    if (!file || file === 'N/A') return;

    // Send message to extension to open file
    if ((window as any).vscode) {
      (window as any).vscode.postMessage({
        type: 'openFile',
        file: file,
        line: issue.line,
        column: issue.column
      });
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

  /**
   * Check if modal is currently open
   */
  isModalOpen(): boolean {
    return this.isOpen;
  }
}

/**
 * Singleton instance
 */
export const issueDetailModal = new IssueDetailModal();
