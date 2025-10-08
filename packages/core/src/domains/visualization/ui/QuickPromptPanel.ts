/**
 * Quick Prompt Panel
 *
 * Simple single-screen UI for building prompts.
 * No wizard complexity - just the essentials.
 */

export class QuickPromptPanel {
  private panelElement: HTMLElement | null = null;
  private textArea: HTMLTextAreaElement | null = null;
  private knowledgePreview: HTMLElement | null = null;
  private isVisible: boolean = false;
  private onEnhanceCallback: (prompt: string, agent: string) => void;

  constructor(onEnhanceCallback: (prompt: string, agent: string) => void) {
    this.onEnhanceCallback = onEnhanceCallback;
  }

  /**
   * Initialize the panel in the DOM
   */
  initialize(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Quick prompt container '${containerId}' not found`);
      return;
    }

    container.innerHTML = this.render();
    this.attachEventListeners();
  }

  /**
   * Render the panel HTML
   */
  private render(): string {
    return `
      <div class="quick-prompt-panel" id="quick-prompt-panel" style="display: none;">
        <div class="panel-header">
          <h2>🧠 Get AI Help</h2>
          <button class="close-btn" id="prompt-close-btn" aria-label="Close">×</button>
        </div>

        <div class="panel-content">
          <label for="prompt-input">What do you want to build?</label>
          <textarea
            id="prompt-input"
            rows="4"
            placeholder="Add user login with email and password"
            aria-label="Prompt input"></textarea>

          <div class="knowledge-preview" id="knowledge-preview" style="display:none;">
            ✨ I found <span id="knowledge-count">0</span> helpful rules and templates
            <div class="knowledge-actions">
              <a href="#" id="show-knowledge-link">Show me what I added</a> or
              <a href="#" id="trust-link">Trust you, let's go</a>
            </div>
          </div>

          <div class="agent-selection">
            <label>Which AI are you using?</label>
            <div class="radio-group">
              <label>
                <input type="radio" name="agent" value="claude" checked>
                Claude
              </label>
              <label>
                <input type="radio" name="agent" value="copilot">
                Copilot
              </label>
              <label>
                <input type="radio" name="agent" value="cursor">
                Cursor
              </label>
              <label>
                <input type="radio" name="agent" value="unknown">
                Other
              </label>
            </div>
          </div>

          <div class="actions">
            <button id="copy-btn" class="primary-btn">Copy Enhanced Prompt</button>
            <button id="start-session-btn" class="secondary-btn">Start Working & Track It</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners to panel elements
   */
  private attachEventListeners(): void {
    this.panelElement = document.getElementById('quick-prompt-panel');
    this.textArea = document.getElementById('prompt-input') as HTMLTextAreaElement;
    this.knowledgePreview = document.getElementById('knowledge-preview');

    // Close button
    const closeBtn = document.getElementById('prompt-close-btn');
    closeBtn?.addEventListener('click', () => this.hide());

    // Debounced input handler
    let debounceTimer: NodeJS.Timeout;
    this.textArea?.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const prompt = (e.target as HTMLTextAreaElement).value;
        const agent = this.getSelectedAgent();
        if (prompt.length > 0) {
          this.onEnhanceCallback(prompt, agent);
        }
      }, 500); // 500ms debounce
    });

    // Copy button
    const copyBtn = document.getElementById('copy-btn');
    copyBtn?.addEventListener('click', () => this.handleCopy());

    // Start session button
    const startSessionBtn = document.getElementById('start-session-btn');
    startSessionBtn?.addEventListener('click', () => this.handleStartSession());

    // Knowledge links
    const showKnowledgeLink = document.getElementById('show-knowledge-link');
    showKnowledgeLink?.addEventListener('click', (e) => {
      e.preventDefault();
      // TODO: Expand to full wizard view (Phase 2)
      console.log('Show knowledge details (future: expand to wizard)');
    });

    const trustLink = document.getElementById('trust-link');
    trustLink?.addEventListener('click', (e) => {
      e.preventDefault();
      // Just proceed with enhancement as-is
      this.handleCopy();
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });
  }

  /**
   * Show the panel
   */
  show(): void {
    if (this.panelElement) {
      this.panelElement.style.display = 'block';
      this.isVisible = true;
      // Focus the textarea
      setTimeout(() => this.textArea?.focus(), 100);
    }
  }

  /**
   * Hide the panel
   */
  hide(): void {
    if (this.panelElement) {
      this.panelElement.style.display = 'none';
      this.isVisible = false;
    }
  }

  /**
   * Toggle panel visibility
   */
  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Update with enhanced prompt result
   */
  updateEnhanced(enhanced: string, itemsUsed: number): void {
    // Update textarea with enhanced version
    if (this.textArea) {
      this.textArea.value = enhanced;
    }

    // Update knowledge count
    this.updateKnowledgeCount(itemsUsed);
  }

  /**
   * Update the knowledge count display
   */
  updateKnowledgeCount(count: number): void {
    const countElement = document.getElementById('knowledge-count');
    if (countElement) {
      countElement.textContent = count.toString();
    }

    // Show/hide preview based on count
    if (this.knowledgePreview) {
      this.knowledgePreview.style.display = count > 0 ? 'block' : 'none';
    }
  }

  /**
   * Get the currently selected AI agent
   */
  private getSelectedAgent(): string {
    const selected = document.querySelector('input[name="agent"]:checked') as HTMLInputElement;
    return selected?.value || 'claude';
  }

  /**
   * Handle copy button click
   */
  private handleCopy(): void {
    const prompt = this.textArea?.value || '';
    const agent = this.getSelectedAgent();

    if (prompt.trim().length === 0) {
      return; // Don't send empty prompts
    }

    // Send message to extension
    if (window.vscode) {
      window.vscode.postMessage({
        type: 'copyEnhancedPrompt',
        prompt,
        agent
      });
    }
  }

  /**
   * Handle start session button click
   */
  private handleStartSession(): void {
    const prompt = this.textArea?.value || '';
    const agent = this.getSelectedAgent();

    if (prompt.trim().length === 0) {
      return; // Don't start session with empty prompt
    }

    // Send message to extension
    if (window.vscode) {
      window.vscode.postMessage({
        type: 'startSessionFromPrompt',
        prompt,
        agent
      });
    }

    // Hide panel after starting session
    this.hide();
  }
}
