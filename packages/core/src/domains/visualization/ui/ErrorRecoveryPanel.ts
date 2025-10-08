/**
 * Error Recovery Panel
 *
 * Detects errors and offers proactive help.
 * Appears when AI-generated code has issues.
 */

export interface DetectedError {
  type: string;
  message: string;
  line?: number;
  file?: string;
}

export interface SimilarError {
  id: string;
  name: string;
  occurrences: number;
  preventionRule?: string;
}

export class ErrorRecoveryPanel {
  private panelElement: HTMLElement | null = null;

  /**
   * Initialize the panel (hidden by default)
   */
  initialize(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Error recovery container '${containerId}' not found`);
      return;
    }

    container.innerHTML = this.renderHidden();
    this.panelElement = document.getElementById('error-recovery-panel');
  }

  /**
   * Render hidden container
   */
  private renderHidden(): string {
    return `<div class="error-recovery-panel" id="error-recovery-panel" style="display:none;"></div>`;
  }

  /**
   * Show error recovery UI
   */
  showError(error: DetectedError, similarErrors: SimilarError[]): void {
    if (!this.panelElement) {
      console.error('Error recovery panel not initialized');
      return;
    }

    this.panelElement.innerHTML = this.renderErrorUI(error, similarErrors);
    this.panelElement.style.display = 'block';
    this.attachErrorEventListeners();
  }

  /**
   * Render error recovery UI
   */
  private renderErrorUI(error: DetectedError, similarErrors: SimilarError[]): string {
    return `
      <div class="error-recovery-content">
        <div class="panel-header">
          <h2>🐛 AI Made a Mistake</h2>
          <button class="close-btn" id="error-close-btn" aria-label="Close">×</button>
        </div>

        <div class="error-details">
          <p>I see this error in your code:</p>
          <pre class="error-message">${this.escapeHtml(error.message)}</pre>
          ${error.file ? `<p class="error-file">File: ${this.escapeHtml(error.file)}${error.line ? `:${error.line}` : ''}</p>` : ''}
        </div>

        ${similarErrors.length > 0 ? `
          <div class="similar-errors">
            <p>💡 I found ${similarErrors.length} similar mistake${similarErrors.length > 1 ? 's' : ''} we fixed before:</p>
            <ul>
              ${similarErrors.map(e => `
                <li>
                  <label>
                    <input type="checkbox" checked data-learning-id="${e.id}">
                    ${this.escapeHtml(e.name)} (fixed ${e.occurrences} time${e.occurrences > 1 ? 's' : ''})
                  </label>
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}

        <div class="recovery-actions">
          <div class="action-group">
            <p>✅ I can help the AI avoid this next time</p>
            <button id="save-learning-btn" class="primary-btn">Save as "Mistake to Avoid"</button>
            <button id="skip-learning-btn" class="secondary-btn">Not now</button>
          </div>

          <div class="action-group">
            <p>🔧 Want me to suggest a fix?</p>
            <button id="ask-fix-btn" class="primary-btn">Ask AI to Fix It</button>
            <button id="self-fix-btn" class="secondary-btn">I'll fix it myself</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners to error recovery UI
   */
  private attachErrorEventListeners(): void {
    // Close button
    const closeBtn = document.getElementById('error-close-btn');
    closeBtn?.addEventListener('click', () => this.hide());

    // Save learning button
    const saveLearningBtn = document.getElementById('save-learning-btn');
    saveLearningBtn?.addEventListener('click', () => {
      const selectedLearnings = this.getSelectedLearnings();
      if (window.vscode) {
        window.vscode.postMessage({
          type: 'saveErrorLearning',
          learnings: selectedLearnings
        });
      }
      this.hide();
    });

    // Skip learning button
    const skipLearningBtn = document.getElementById('skip-learning-btn');
    skipLearningBtn?.addEventListener('click', () => {
      this.hide();
    });

    // Ask fix button
    const askFixBtn = document.getElementById('ask-fix-btn');
    askFixBtn?.addEventListener('click', () => {
      if (window.vscode) {
        window.vscode.postMessage({
          type: 'requestErrorFix'
        });
      }
      this.hide();
    });

    // Self fix button
    const selfFixBtn = document.getElementById('self-fix-btn');
    selfFixBtn?.addEventListener('click', () => {
      this.hide();
    });

    // Close on Escape key
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.hide();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
  }

  /**
   * Get selected learnings from checkboxes
   */
  private getSelectedLearnings(): string[] {
    const checkboxes = document.querySelectorAll('input[data-learning-id]:checked') as NodeListOf<HTMLInputElement>;
    return Array.from(checkboxes).map(cb => cb.dataset.learningId || '').filter(Boolean);
  }

  /**
   * Hide the error recovery panel
   */
  hide(): void {
    if (this.panelElement) {
      this.panelElement.style.display = 'none';
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
