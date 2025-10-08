/**
 * ComparisonView
 *
 * Shows side-by-side comparison of original vs enhanced prompts
 * Helps users understand what knowledge items were added and why
 */

export interface ComparisonMetadata {
  itemsUsed: number;
  stage: number;
  knowledgeItems: Array<{ type: string; name: string; id: string }>;
}

export class ComparisonView {
  private container: HTMLElement | null = null;
  private isVisible: boolean = false;

  /**
   * Initialize the comparison view
   */
  initialize(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Comparison view container #${containerId} not found`);
      return;
    }

    this.container = container;
    container.innerHTML = this.renderHiddenContainer();
  }

  /**
   * Render hidden container (will be shown when needed)
   */
  private renderHiddenContainer(): string {
    return '<div class="comparison-view" id="comparison-view-panel" style="display:none;"></div>';
  }

  /**
   * Show comparison view with data
   */
  show(original: string, enhanced: string, metadata: ComparisonMetadata): void {
    const panel = document.getElementById('comparison-view-panel');
    if (!panel) {
      console.error('Comparison view panel not found');
      return;
    }

    panel.innerHTML = this.renderComparison(original, enhanced, metadata);
    panel.style.display = 'block';
    this.isVisible = true;

    this.attachEventListeners(enhanced);
  }

  /**
   * Hide comparison view
   */
  hide(): void {
    const panel = document.getElementById('comparison-view-panel');
    if (panel) {
      panel.style.display = 'none';
      this.isVisible = false;
    }
  }

  /**
   * Check if visible
   */
  isShowing(): boolean {
    return this.isVisible;
  }

  /**
   * Render comparison UI
   */
  private renderComparison(
    original: string,
    enhanced: string,
    metadata: ComparisonMetadata
  ): string {
    return `
      <div class="comparison-content">
        <div class="comparison-header">
          <h2>📊 Prompt Enhancement Preview</h2>
          <button class="close-btn" id="comparison-close-btn">×</button>
        </div>

        <div class="comparison-columns">
          <div class="comparison-column original">
            <div class="column-header">
              <h3>ORIGINAL</h3>
              <span class="char-count">${original.length} characters</span>
            </div>
            <div class="column-content">
              <pre class="original-text">${this.escapeHtml(original)}</pre>
            </div>
          </div>

          <div class="comparison-divider"></div>

          <div class="comparison-column enhanced">
            <div class="column-header">
              <h3>ENHANCED</h3>
              <span class="char-count">${enhanced.length} characters</span>
            </div>
            <div class="column-content">
              <div class="enhanced-text">${this.renderMarkdown(enhanced)}</div>
            </div>
          </div>
        </div>

        ${this.renderKnowledgeItems(metadata.knowledgeItems)}

        <div class="comparison-footer">
          <div class="metadata">
            <span class="metadata-item">
              <strong>Knowledge Used:</strong> ${metadata.itemsUsed} item${metadata.itemsUsed !== 1 ? 's' : ''}
            </span>
            <span class="metadata-divider">•</span>
            <span class="metadata-item">
              <strong>Enhancement Level:</strong> Stage ${metadata.stage}
            </span>
            <span class="metadata-divider">•</span>
            <span class="metadata-item">
              <strong>Improvement:</strong> +${Math.round(((enhanced.length - original.length) / original.length) * 100)}% context
            </span>
          </div>
          <div class="actions">
            <button class="primary-btn" id="use-enhanced-btn">Use Enhanced Prompt</button>
            <button class="secondary-btn" id="copy-enhanced-btn">Copy to Clipboard</button>
            <button class="secondary-btn" id="cancel-comparison-btn">Cancel</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render knowledge items used
   */
  private renderKnowledgeItems(items: Array<{ type: string; name: string; id: string }>): string {
    if (items.length === 0) {
      return '';
    }

    const itemsByType = this.groupByType(items);
    const sections: string[] = [];

    Object.entries(itemsByType).forEach(([type, typeItems]) => {
      const icon = this.getTypeIcon(type);
      const label = this.getTypeLabel(type);

      sections.push(`
        <div class="knowledge-section">
          <h4>${icon} ${label}</h4>
          <ul class="knowledge-list">
            ${typeItems.map(item => `<li class="knowledge-item">${this.escapeHtml(item.name)}</li>`).join('')}
          </ul>
        </div>
      `);
    });

    return `
      <div class="knowledge-items">
        <h3>Knowledge Items Applied</h3>
        <div class="knowledge-sections">
          ${sections.join('')}
        </div>
      </div>
    `;
  }

  /**
   * Group items by type
   */
  private groupByType(items: Array<{ type: string; name: string; id: string }>): Record<string, Array<{ type: string; name: string; id: string }>> {
    const grouped: Record<string, Array<{ type: string; name: string; id: string }>> = {};

    items.forEach(item => {
      if (!grouped[item.type]) {
        grouped[item.type] = [];
      }
      grouped[item.type].push(item);
    });

    return grouped;
  }

  /**
   * Get icon for knowledge type
   */
  private getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      'adr': '📐',
      'pattern': '📋',
      'learning': '⚠️',
      'golden-path': '🎯'
    };
    return icons[type] || '📄';
  }

  /**
   * Get label for knowledge type
   */
  private getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'adr': 'Project Rules',
      'pattern': 'Code Templates',
      'learning': 'Mistakes to Avoid',
      'golden-path': 'Step-by-Step Guides'
    };
    return labels[type] || type;
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
   * Simple markdown renderer (basic support)
   */
  private renderMarkdown(text: string): string {
    let html = this.escapeHtml(text);

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Code blocks
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');

    // Inline code
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');

    // Lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Checkboxes
    html = html.replace(/- \[ \] (.+)/g, '<li class="checkbox unchecked">☐ $1</li>');
    html = html.replace(/- \[x\] (.+)/gi, '<li class="checkbox checked">☑ $1</li>');

    // Line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(enhancedText: string): void {
    // Close button
    document.getElementById('comparison-close-btn')?.addEventListener('click', () => {
      this.hide();
    });

    // Use enhanced button
    document.getElementById('use-enhanced-btn')?.addEventListener('click', () => {
      this.handleUseEnhanced(enhancedText);
    });

    // Copy button
    document.getElementById('copy-enhanced-btn')?.addEventListener('click', () => {
      this.handleCopy(enhancedText);
    });

    // Cancel button
    document.getElementById('cancel-comparison-btn')?.addEventListener('click', () => {
      this.hide();
    });

    // Escape key to close
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
  }

  /**
   * Handle use enhanced button
   */
  private handleUseEnhanced(enhancedText: string): void {
    // Send message to extension to use the enhanced prompt
    if (window.vscode) {
      window.vscode.postMessage({
        type: 'useEnhancedPrompt',
        enhanced: enhancedText
      });
    }

    this.hide();
  }

  /**
   * Handle copy button
   */
  private handleCopy(enhancedText: string): void {
    // Send message to extension to copy
    if (window.vscode) {
      window.vscode.postMessage({
        type: 'copyEnhancedPrompt',
        enhanced: enhancedText
      });
    }

    // Show visual feedback
    const btn = document.getElementById('copy-enhanced-btn');
    if (btn) {
      const originalText = btn.textContent;
      btn.textContent = '✓ Copied!';
      setTimeout(() => {
        btn.textContent = originalText;
      }, 2000);
    }
  }
}
