/**
 * AI Companion Dot
 *
 * Subtle tip system - pulsing dot that expands to show contextual tips.
 * Non-intrusive guidance that appears when needed.
 */

export interface TipData {
  id: string;
  message: string;
  priority: 'critical' | 'helpful' | 'informational';
}

export class AICompanionDot {
  private dotElement: HTMLElement | null = null;
  private tipPopup: HTMLElement | null = null;
  private currentTip: TipData | null = null;
  private autoShowTimer: NodeJS.Timeout | null = null;

  /**
   * Initialize the companion dot in the DOM
   */
  initialize(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`AI companion container '${containerId}' not found`);
      return;
    }

    container.innerHTML = this.render();
    this.attachEventListeners();
  }

  /**
   * Render the companion dot HTML
   */
  private render(): string {
    return `
      <div class="ai-companion-dot" id="ai-companion-dot">
        <div class="dot-indicator" id="dot-indicator">💡</div>
        <div class="tip-popup" id="tip-popup" style="display:none;">
          <div class="tip-content" id="tip-content"></div>
          <div class="tip-actions">
            <button id="tip-dismiss" class="tip-btn">Dismiss</button>
            <button id="tip-no-show" class="tip-btn secondary">Don't show again</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    this.dotElement = document.getElementById('dot-indicator');
    this.tipPopup = document.getElementById('tip-popup');

    // Hover to expand
    this.dotElement?.addEventListener('mouseenter', () => {
      if (this.currentTip) {
        this.showPopup();
        this.clearAutoShowTimer();
      }
    });

    // Hide on mouse leave from popup
    this.tipPopup?.addEventListener('mouseleave', () => {
      this.hidePopup();
    });

    // Dismiss button
    const dismissBtn = document.getElementById('tip-dismiss');
    dismissBtn?.addEventListener('click', () => {
      this.hidePopup();
      this.currentTip = null;
      this.removePulse();
    });

    // Don't show again button
    const noShowBtn = document.getElementById('tip-no-show');
    noShowBtn?.addEventListener('click', () => {
      if (this.currentTip && window.vscode) {
        window.vscode.postMessage({
          type: 'suppressTip',
          ruleId: this.currentTip.id
        });
      }
      this.hidePopup();
      this.currentTip = null;
      this.removePulse();
    });
  }

  /**
   * Show a tip to the user
   */
  showTip(tip: TipData): void {
    this.currentTip = tip;

    // Update tip content
    const contentElement = document.getElementById('tip-content');
    if (contentElement) {
      contentElement.textContent = tip.message;
    }

    // Add pulse animation based on priority
    this.removePulse();
    if (this.dotElement) {
      this.dotElement.classList.add(`pulse-${tip.priority}`);
    }

    // Auto-show for critical tips after 2 seconds
    if (tip.priority === 'critical') {
      this.autoShowTimer = setTimeout(() => {
        this.showPopup();
      }, 2000);
    }
  }

  /**
   * Show the tip popup
   */
  private showPopup(): void {
    if (this.tipPopup) {
      this.tipPopup.style.display = 'block';
    }
  }

  /**
   * Hide the tip popup
   */
  private hidePopup(): void {
    if (this.tipPopup) {
      this.tipPopup.style.display = 'none';
    }
  }

  /**
   * Hide the current tip completely
   */
  hideTip(): void {
    this.hidePopup();
    this.currentTip = null;
    this.removePulse();
    this.clearAutoShowTimer();
  }

  /**
   * Remove pulse animation
   */
  private removePulse(): void {
    if (this.dotElement) {
      this.dotElement.classList.remove('pulse-critical', 'pulse-helpful', 'pulse-informational');
    }
  }

  /**
   * Clear auto-show timer
   */
  private clearAutoShowTimer(): void {
    if (this.autoShowTimer) {
      clearTimeout(this.autoShowTimer);
      this.autoShowTimer = null;
    }
  }
}
