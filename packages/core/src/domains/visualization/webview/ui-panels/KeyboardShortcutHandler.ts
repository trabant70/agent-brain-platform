/**
 * Keyboard Shortcut Handler
 * Manages keyboard shortcuts for visualization navigation and interaction
 *
 * Supported shortcuts:
 * - Ctrl/Cmd + F: Focus search input
 * - Escape: Clear search, close filter panel, or navigate back
 * - Ctrl/Cmd + Shift + F: Toggle filter panel
 * - Ctrl/Cmd + H: Navigate to overview (home)
 * - Ctrl/Cmd + B: Navigate back
 * - Arrow keys: Navigate between tabs (when focused)
 */

import { VisualizationCoordinator } from '../coordination/VisualizationCoordinator';

export interface KeyboardShortcutConfig {
  enableSearch?: boolean;
  enableNavigation?: boolean;
  enableFilters?: boolean;
  enableTabs?: boolean;
}

/**
 * Keyboard Shortcut Handler
 */
export class KeyboardShortcutHandler {
  private coordinator: VisualizationCoordinator;
  private config: Required<KeyboardShortcutConfig>;
  private boundKeyHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(
    coordinator: VisualizationCoordinator,
    config: KeyboardShortcutConfig = {}
  ) {
    this.coordinator = coordinator;
    this.config = {
      enableSearch: config.enableSearch !== false,
      enableNavigation: config.enableNavigation !== false,
      enableFilters: config.enableFilters !== false,
      enableTabs: config.enableTabs !== false
    };
  }

  /**
   * Initialize keyboard shortcuts
   */
  initialize(): void {
    this.boundKeyHandler = this.handleKeyDown.bind(this);
    document.addEventListener('keydown', this.boundKeyHandler);
  }

  /**
   * Handle keydown events
   */
  private handleKeyDown(e: KeyboardEvent): void {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? e.metaKey : e.ctrlKey;

    // Don't handle shortcuts if user is typing in an input/textarea
    const target = e.target as HTMLElement;
    const isTyping = ['INPUT', 'TEXTAREA'].includes(target.tagName);

    // Ctrl/Cmd + F: Focus search
    if (this.config.enableSearch && modKey && e.key === 'f' && !e.shiftKey) {
      e.preventDefault();
      this.focusSearch();
      return;
    }

    // Ctrl/Cmd + Shift + F: Toggle filter panel
    if (this.config.enableFilters && modKey && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      this.toggleFilterPanel();
      return;
    }

    // Ctrl/Cmd + H: Navigate to home/overview
    if (this.config.enableNavigation && modKey && e.key === 'h') {
      e.preventDefault();
      this.navigateToHome();
      return;
    }

    // Ctrl/Cmd + B: Navigate back
    if (this.config.enableNavigation && modKey && e.key === 'b') {
      e.preventDefault();
      this.navigateBack();
      return;
    }

    // Escape: Clear search, close filter, or navigate back
    if (e.key === 'Escape') {
      // If typing, first blur the input
      if (isTyping) {
        target.blur();
        return;
      }

      // Check if filter panel is open
      const filterPanel = document.querySelector('.filter-panel.expanded');
      if (filterPanel) {
        this.closeFilterPanel();
        return;
      }

      // Check if search has content
      const searchInput = document.getElementById('search-input') as HTMLInputElement;
      if (searchInput && searchInput.value) {
        this.clearSearch();
        return;
      }

      // Otherwise navigate back (if not on overview)
      if (this.config.enableNavigation) {
        const context = this.coordinator.getContext();
        if (context.state !== 'overview') {
          this.navigateBack();
        }
      }
      return;
    }

    // Arrow keys for tab navigation (only when not typing)
    if (this.config.enableTabs && !isTyping) {
      const tabs = document.querySelectorAll('.viz-tab');
      if (tabs.length > 0) {
        const activeTab = document.querySelector('.viz-tab.active') as HTMLElement;

        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          this.navigateTabs(tabs, activeTab, -1);
          return;
        }

        if (e.key === 'ArrowRight') {
          e.preventDefault();
          this.navigateTabs(tabs, activeTab, 1);
          return;
        }
      }
    }
  }

  /**
   * Focus search input
   */
  private focusSearch(): void {
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
      console.log('Keyboard shortcut: Focused search input');
    }
  }

  /**
   * Toggle filter panel
   */
  private toggleFilterPanel(): void {
    const filterToggle = document.getElementById('filter-toggle') as HTMLButtonElement;
    if (filterToggle) {
      filterToggle.click();
      console.log('Keyboard shortcut: Toggled filter panel');
    }
  }

  /**
   * Close filter panel
   */
  private closeFilterPanel(): void {
    const filterPanel = document.querySelector('.filter-panel.expanded');
    const filterToggle = document.getElementById('filter-toggle') as HTMLButtonElement;

    if (filterPanel && filterToggle) {
      filterToggle.click();
      console.log('Keyboard shortcut: Closed filter panel');
    }
  }

  /**
   * Clear search
   */
  private clearSearch(): void {
    const searchClear = document.getElementById('search-clear') as HTMLButtonElement;
    if (searchClear) {
      searchClear.click();
      console.log('Keyboard shortcut: Cleared search');
    }
  }

  /**
   * Navigate to home/overview
   */
  private navigateToHome(): void {
    const context = this.coordinator.getContext();
    if (context.state !== 'overview') {
      this.coordinator.navigateToOverview();
      console.log('Keyboard shortcut: Navigated to overview');
    }
  }

  /**
   * Navigate back
   */
  private navigateBack(): void {
    const context = this.coordinator.getContext();
    if (context.state !== 'overview') {
      this.coordinator.navigateBack();
      console.log('Keyboard shortcut: Navigated back');
    }
  }

  /**
   * Navigate between tabs using arrow keys
   */
  private navigateTabs(tabs: NodeListOf<Element>, activeTab: HTMLElement | null, direction: number): void {
    if (!activeTab) return;

    const tabsArray = Array.from(tabs);
    const currentIndex = tabsArray.indexOf(activeTab);

    if (currentIndex === -1) return;

    const newIndex = currentIndex + direction;

    // Wrap around
    const wrappedIndex = ((newIndex % tabsArray.length) + tabsArray.length) % tabsArray.length;
    const newTab = tabsArray[wrappedIndex] as HTMLElement;

    if (newTab) {
      newTab.click();
      newTab.focus();
      console.log(`Keyboard shortcut: Navigated to tab ${wrappedIndex + 1}`);
    }
  }

  /**
   * Get keyboard shortcuts help text
   */
  getShortcutsHelp(): string {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? 'Cmd' : 'Ctrl';

    const shortcuts: string[] = [];

    if (this.config.enableSearch) {
      shortcuts.push(`${modKey}+F: Focus search`);
    }

    if (this.config.enableFilters) {
      shortcuts.push(`${modKey}+Shift+F: Toggle filters`);
    }

    if (this.config.enableNavigation) {
      shortcuts.push(`${modKey}+H: Go to overview`);
      shortcuts.push(`${modKey}+B: Go back`);
      shortcuts.push('Escape: Clear search / Close filter / Go back');
    }

    if (this.config.enableTabs) {
      shortcuts.push('Left/Right Arrow: Switch tabs');
    }

    return shortcuts.join('\n');
  }

  /**
   * Dispose keyboard shortcuts
   */
  dispose(): void {
    if (this.boundKeyHandler) {
      document.removeEventListener('keydown', this.boundKeyHandler);
      this.boundKeyHandler = null;
    }
  }
}
