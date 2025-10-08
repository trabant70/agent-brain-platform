/**
 * TabManager - Multi-tab UI Navigation Controller
 *
 * Manages tab switching, state persistence, and tab lifecycle events
 */

import { EventEmitter } from 'events';

export type TabId = 'timeline' | 'prompt' | 'config' | 'knowledge' | 'support';

export interface TabChangeEvent {
  from: TabId | null;
  to: TabId;
  timestamp: Date;
}

export class TabManager extends EventEmitter {
  private activeTab: TabId = 'timeline';
  private tabButtons: Map<TabId, HTMLElement> = new Map();
  private tabContents: Map<TabId, HTMLElement> = new Map();
  private initialized: boolean = false;

  /**
   * Initialize tab manager with DOM elements
   */
  initialize(): void {
    if (this.initialized) {
      console.warn('[TabManager] Already initialized');
      return;
    }

    // Find all tab buttons
    const buttons = document.querySelectorAll('.tab-button');
    buttons.forEach((button) => {
      const tabId = button.getAttribute('data-tab') as TabId;
      if (tabId) {
        this.tabButtons.set(tabId, button as HTMLElement);

        // Add click listener
        button.addEventListener('click', () => {
          this.switchTab(tabId);
        });
      }
    });

    // Find all tab contents
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach((content) => {
      const tabId = content.id.replace('tab-', '') as TabId;
      if (tabId) {
        this.tabContents.set(tabId, content as HTMLElement);
      }
    });

    // Restore saved tab from localStorage
    const savedTab = this.loadSavedTab();
    if (savedTab && this.tabButtons.has(savedTab)) {
      this.activeTab = savedTab;
      this.updateUI();
    }

    this.initialized = true;
    console.log('[TabManager] Initialized with tabs:', Array.from(this.tabButtons.keys()));
  }

  /**
   * Switch to a different tab
   */
  switchTab(tabId: TabId): void {
    if (!this.initialized) {
      console.error('[TabManager] Not initialized');
      return;
    }

    if (!this.tabButtons.has(tabId)) {
      console.error(`[TabManager] Unknown tab: ${tabId}`);
      return;
    }

    if (this.activeTab === tabId) {
      // Already on this tab
      return;
    }

    const previousTab = this.activeTab;
    this.activeTab = tabId;

    // Update UI
    this.updateUI();

    // Save to localStorage
    this.saveActiveTab();

    // Emit tab change event
    const event: TabChangeEvent = {
      from: previousTab,
      to: tabId,
      timestamp: new Date()
    };
    this.emit('tab:changed', event);

    console.log(`[TabManager] Switched from ${previousTab} to ${tabId}`);
  }

  /**
   * Get currently active tab
   */
  getActiveTab(): TabId {
    return this.activeTab;
  }

  /**
   * Check if a tab is active
   */
  isTabActive(tabId: TabId): boolean {
    return this.activeTab === tabId;
  }

  /**
   * Update UI to reflect active tab
   */
  private updateUI(): void {
    // Update tab buttons
    this.tabButtons.forEach((button, tabId) => {
      if (tabId === this.activeTab) {
        button.classList.add('active');
        button.setAttribute('aria-selected', 'true');
      } else {
        button.classList.remove('active');
        button.setAttribute('aria-selected', 'false');
      }
    });

    // Update tab contents
    this.tabContents.forEach((content, tabId) => {
      if (tabId === this.activeTab) {
        content.classList.add('active');
        content.setAttribute('aria-hidden', 'false');
      } else {
        content.classList.remove('active');
        content.setAttribute('aria-hidden', 'true');
      }
    });
  }

  /**
   * Save active tab to localStorage
   */
  private saveActiveTab(): void {
    try {
      localStorage.setItem('agentbrain.activeTab', this.activeTab);
    } catch (error) {
      console.warn('[TabManager] Failed to save active tab:', error);
    }
  }

  /**
   * Load saved tab from localStorage
   */
  private loadSavedTab(): TabId | null {
    try {
      const saved = localStorage.getItem('agentbrain.activeTab');
      if (saved && this.isValidTabId(saved)) {
        return saved as TabId;
      }
    } catch (error) {
      console.warn('[TabManager] Failed to load saved tab:', error);
    }
    return null;
  }

  /**
   * Validate tab ID
   */
  private isValidTabId(id: string): id is TabId {
    return ['timeline', 'prompt', 'config', 'knowledge', 'support'].includes(id);
  }

  /**
   * Get all available tabs
   */
  getAvailableTabs(): TabId[] {
    return Array.from(this.tabButtons.keys());
  }

  /**
   * Dispose of event listeners
   */
  dispose(): void {
    this.removeAllListeners();
    this.tabButtons.clear();
    this.tabContents.clear();
    this.initialized = false;
  }
}
