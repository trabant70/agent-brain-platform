/**
 * PromptSupportView - Comprehensive Prompt Enhancement Interface
 *
 * Provides full-featured prompt creation, enhancement, and management
 */

export class PromptSupportView {
  private container: HTMLElement | null = null;
  private initialized: boolean = false;
  private currentPrompt: string = '';
  private currentAgent: string = 'claude';
  private enhancedPrompt: string = '';
  private promptHistory: Array<{ prompt: string; agent: string; timestamp: Date }> = [];
  private knowledgeItems: any[] = [];

  /**
   * Initialize the view
   */
  initialize(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`[PromptSupportView] Container #${containerId} not found`);
      return;
    }

    this.container = container;
    this.loadPromptHistory();
    this.render();
    this.attachEventListeners();
    this.initialized = true;

    console.log('[PromptSupportView] Initialized');
  }

  /**
   * Render the UI
   */
  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <!-- Prompt Input Section -->
      <div class="tab-section">
        <h2 class="tab-section-title">🧠 Create AI-Enhanced Prompt</h2>
        <p class="tab-section-description">
          Enter your prompt below. Agent Brain will enhance it with relevant project knowledge, patterns, and learnings.
        </p>

        <div class="prompt-input-area">
          <label for="prompt-textarea" class="prompt-label">Your Prompt:</label>
          <textarea
            id="prompt-textarea"
            class="prompt-textarea"
            placeholder="Example: Add user authentication to the login page..."
            rows="6"
          ></textarea>

          <div class="agent-selector-row">
            <label for="agent-select" class="agent-label">Target Agent:</label>
            <select id="agent-select" class="agent-select">
              <option value="claude">Claude (Anthropic)</option>
              <option value="gpt4">GPT-4 (OpenAI)</option>
              <option value="gemini">Gemini (Google)</option>
              <option value="copilot">GitHub Copilot</option>
              <option value="custom">Custom Agent</option>
            </select>
          </div>

          <div class="prompt-actions">
            <button id="enhance-btn" class="btn btn-primary">
              ✨ Enhance Prompt
            </button>
            <button id="clear-btn" class="btn btn-secondary">
              🗑️ Clear
            </button>
          </div>
        </div>
      </div>

      <!-- Knowledge Preview Section -->
      <div class="tab-section">
        <h3 class="tab-section-title">📚 Knowledge Items to Include</h3>
        <p class="tab-section-description">
          These items will be automatically included based on relevance to your prompt.
        </p>

        <div id="knowledge-preview" class="knowledge-preview">
          <div class="knowledge-empty">
            Enter a prompt above to see relevant knowledge items...
          </div>
        </div>
      </div>

      <!-- Enhanced Result Section -->
      <div class="tab-section" id="enhanced-section" style="display: none;">
        <h3 class="tab-section-title">✅ Enhanced Prompt</h3>
        <p class="tab-section-description">
          Your prompt has been enhanced with <span id="items-count">0</span> knowledge items.
        </p>

        <div class="enhanced-result">
          <pre id="enhanced-output" class="enhanced-output"></pre>
        </div>

        <div class="enhanced-actions">
          <button id="copy-btn" class="btn btn-primary">
            📋 Copy to Clipboard
          </button>
          <button id="start-session-btn" class="btn btn-success">
            ▶️ Start Session
          </button>
        </div>
      </div>

      <!-- Prompt History Section -->
      <div class="tab-section">
        <h3 class="tab-section-title">📝 Recent Prompts</h3>
        <p class="tab-section-description">
          Your last 10 prompts. Click to reuse.
        </p>

        <div id="prompt-history" class="prompt-history">
          <!-- History items will be populated here -->
        </div>
      </div>
    `;

    this.renderPromptHistory();
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    const promptTextarea = document.getElementById('prompt-textarea') as HTMLTextAreaElement;
    const agentSelect = document.getElementById('agent-select') as HTMLSelectElement;
    const enhanceBtn = document.getElementById('enhance-btn');
    const clearBtn = document.getElementById('clear-btn');
    const copyBtn = document.getElementById('copy-btn');
    const startSessionBtn = document.getElementById('start-session-btn');

    if (promptTextarea) {
      promptTextarea.addEventListener('input', () => {
        this.currentPrompt = promptTextarea.value;
        this.previewKnowledge();
      });
    }

    if (agentSelect) {
      agentSelect.addEventListener('change', () => {
        this.currentAgent = agentSelect.value;
      });
    }

    if (enhanceBtn) {
      enhanceBtn.addEventListener('click', () => {
        this.enhancePrompt();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearPrompt();
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        this.copyToClipboard();
      });
    }

    if (startSessionBtn) {
      startSessionBtn.addEventListener('click', () => {
        this.startSession();
      });
    }
  }

  /**
   * Preview knowledge items for current prompt
   */
  private previewKnowledge(): void {
    const previewContainer = document.getElementById('knowledge-preview');
    if (!previewContainer) return;

    if (!this.currentPrompt.trim()) {
      previewContainer.innerHTML = `
        <div class="knowledge-empty">
          Enter a prompt above to see relevant knowledge items...
        </div>
      `;
      return;
    }

    // Request knowledge preview from extension
    if (window.vscode) {
      window.vscode.postMessage({
        type: 'previewKnowledge',
        prompt: this.currentPrompt
      });
    }

    // Show loading state
    previewContainer.innerHTML = `
      <div class="knowledge-loading">
        <div class="spinner"></div>
        <span>Analyzing prompt for relevant knowledge...</span>
      </div>
    `;
  }

  /**
   * Update knowledge preview with items
   */
  updateKnowledgePreview(items: any[]): void {
    this.knowledgeItems = items;
    const previewContainer = document.getElementById('knowledge-preview');
    if (!previewContainer) return;

    if (items.length === 0) {
      previewContainer.innerHTML = `
        <div class="knowledge-empty">
          No relevant knowledge items found for this prompt.
        </div>
      `;
      return;
    }

    const itemsHTML = items.map(item => `
      <div class="knowledge-item">
        <div class="knowledge-item-icon">${this.getKnowledgeIcon(item.type)}</div>
        <div class="knowledge-item-content">
          <div class="knowledge-item-title">${item.title || item.rule || item.name}</div>
          <div class="knowledge-item-type">${item.type}</div>
        </div>
        <div class="knowledge-item-score">${Math.round(item.relevanceScore * 100)}%</div>
      </div>
    `).join('');

    previewContainer.innerHTML = itemsHTML;
  }

  /**
   * Get icon for knowledge type
   */
  private getKnowledgeIcon(type: string): string {
    const icons: Record<string, string> = {
      'adr': '📐',
      'pattern': '📋',
      'learning': '⚠️',
      'context': '✓',
      'template': '📄'
    };
    return icons[type] || '📚';
  }

  /**
   * Enhance the prompt
   */
  private async enhancePrompt(): Promise<void> {
    if (!this.currentPrompt.trim()) {
      alert('Please enter a prompt first.');
      return;
    }

    // Add to history
    this.addToHistory(this.currentPrompt, this.currentAgent);

    // Request enhancement from extension
    if (window.vscode) {
      window.vscode.postMessage({
        type: 'enhancePrompt',
        prompt: this.currentPrompt,
        agent: this.currentAgent
      });
    }

    // Show loading state
    const enhancedSection = document.getElementById('enhanced-section');
    const enhancedOutput = document.getElementById('enhanced-output');
    if (enhancedSection && enhancedOutput) {
      enhancedSection.style.display = 'block';
      enhancedOutput.textContent = 'Enhancing prompt with knowledge items...';
    }
  }

  /**
   * Update enhanced prompt result
   */
  updateEnhanced(enhanced: string, itemsUsed: number): void {
    this.enhancedPrompt = enhanced;

    const enhancedSection = document.getElementById('enhanced-section');
    const enhancedOutput = document.getElementById('enhanced-output');
    const itemsCount = document.getElementById('items-count');

    if (enhancedSection) {
      enhancedSection.style.display = 'block';
    }

    if (enhancedOutput) {
      enhancedOutput.textContent = enhanced;
    }

    if (itemsCount) {
      itemsCount.textContent = String(itemsUsed);
    }
  }

  /**
   * Clear the prompt
   */
  private clearPrompt(): void {
    const promptTextarea = document.getElementById('prompt-textarea') as HTMLTextAreaElement;
    if (promptTextarea) {
      promptTextarea.value = '';
    }
    this.currentPrompt = '';
    this.enhancedPrompt = '';

    const enhancedSection = document.getElementById('enhanced-section');
    if (enhancedSection) {
      enhancedSection.style.display = 'none';
    }

    const knowledgePreview = document.getElementById('knowledge-preview');
    if (knowledgePreview) {
      knowledgePreview.innerHTML = `
        <div class="knowledge-empty">
          Enter a prompt above to see relevant knowledge items...
        </div>
      `;
    }
  }

  /**
   * Copy enhanced prompt to clipboard
   */
  private async copyToClipboard(): Promise<void> {
    if (!this.enhancedPrompt) {
      alert('No enhanced prompt to copy.');
      return;
    }

    try {
      await navigator.clipboard.writeText(this.enhancedPrompt);

      // Visual feedback
      const copyBtn = document.getElementById('copy-btn');
      if (copyBtn) {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✅ Copied!';
        setTimeout(() => {
          copyBtn.textContent = originalText;
        }, 2000);
      }
    } catch (error) {
      console.error('[PromptSupportView] Failed to copy:', error);
      alert('Failed to copy to clipboard.');
    }
  }

  /**
   * Start a session with current prompt
   */
  private startSession(): void {
    if (!this.currentPrompt.trim()) {
      alert('Please enter a prompt first.');
      return;
    }

    // Request session start from extension
    if (window.vscode) {
      window.vscode.postMessage({
        type: 'startSession',
        prompt: this.currentPrompt,
        agent: this.currentAgent
      });
    }

    alert('Session started! File changes will be tracked.');
  }

  /**
   * Add prompt to history
   */
  private addToHistory(prompt: string, agent: string): void {
    this.promptHistory.unshift({
      prompt,
      agent,
      timestamp: new Date()
    });

    // Keep only last 10
    this.promptHistory = this.promptHistory.slice(0, 10);

    this.savePromptHistory();
    this.renderPromptHistory();
  }

  /**
   * Render prompt history
   */
  private renderPromptHistory(): void {
    const historyContainer = document.getElementById('prompt-history');
    if (!historyContainer) return;

    if (this.promptHistory.length === 0) {
      historyContainer.innerHTML = `
        <div class="history-empty">
          No prompt history yet. Create your first prompt above!
        </div>
      `;
      return;
    }

    const historyHTML = this.promptHistory.map((item, index) => `
      <div class="history-item" data-index="${index}">
        <div class="history-item-header">
          <span class="history-item-agent">${item.agent}</span>
          <span class="history-item-time">${this.formatTimestamp(item.timestamp)}</span>
        </div>
        <div class="history-item-prompt">${this.truncateText(item.prompt, 100)}</div>
      </div>
    `).join('');

    historyContainer.innerHTML = historyHTML;

    // Add click listeners
    document.querySelectorAll('.history-item').forEach(el => {
      el.addEventListener('click', (e) => {
        const index = parseInt((e.currentTarget as HTMLElement).dataset.index || '0');
        this.loadFromHistory(index);
      });
    });
  }

  /**
   * Load prompt from history
   */
  private loadFromHistory(index: number): void {
    const item = this.promptHistory[index];
    if (!item) return;

    const promptTextarea = document.getElementById('prompt-textarea') as HTMLTextAreaElement;
    const agentSelect = document.getElementById('agent-select') as HTMLSelectElement;

    if (promptTextarea) {
      promptTextarea.value = item.prompt;
      this.currentPrompt = item.prompt;
    }

    if (agentSelect) {
      agentSelect.value = item.agent;
      this.currentAgent = item.agent;
    }

    this.previewKnowledge();
  }

  /**
   * Save prompt history to localStorage
   */
  private savePromptHistory(): void {
    try {
      localStorage.setItem('agentbrain.promptHistory', JSON.stringify(this.promptHistory));
    } catch (error) {
      console.warn('[PromptSupportView] Failed to save history:', error);
    }
  }

  /**
   * Load prompt history from localStorage
   */
  private loadPromptHistory(): void {
    try {
      const saved = localStorage.getItem('agentbrain.promptHistory');
      if (saved) {
        this.promptHistory = JSON.parse(saved).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
      }
    } catch (error) {
      console.warn('[PromptSupportView] Failed to load history:', error);
    }
  }

  /**
   * Format timestamp for display
   */
  private formatTimestamp(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  /**
   * Truncate text for display
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.container = null;
    this.initialized = false;
  }
}
