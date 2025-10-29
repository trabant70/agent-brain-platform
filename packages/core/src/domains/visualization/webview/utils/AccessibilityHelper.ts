/**
 * Accessibility Helper
 * Utilities for making D3 visualizations accessible
 *
 * Features:
 * - ARIA labels and descriptions
 * - Keyboard navigation
 * - Screen reader support
 * - Focus management
 * - High contrast mode detection
 */

export interface AccessibleElement {
  element: HTMLElement | SVGElement;
  role?: string;
  label?: string;
  description?: string;
  keyboardHandler?: (event: KeyboardEvent) => void;
}

export interface KeyboardNavigationConfig {
  enableArrowKeys?: boolean;
  enableTabNavigation?: boolean;
  enableEscapeKey?: boolean;
  enableEnterKey?: boolean;
  enableSpaceKey?: boolean;
}

/**
 * Accessibility Helper
 */
export class AccessibilityHelper {
  private focusableElements: Set<Element> = new Set();
  private currentFocusIndex: number = -1;

  /**
   * Make element accessible
   */
  makeAccessible(config: AccessibleElement): void {
    const { element, role, label, description, keyboardHandler } = config;

    // Set ARIA role
    if (role) {
      element.setAttribute('role', role);
    }

    // Set ARIA label
    if (label) {
      element.setAttribute('aria-label', label);
    }

    // Set ARIA description
    if (description) {
      element.setAttribute('aria-describedby', this.createDescription(description));
    }

    // Make focusable
    if (!element.hasAttribute('tabindex')) {
      element.setAttribute('tabindex', '0');
    }

    // Add keyboard handler
    if (keyboardHandler) {
      element.addEventListener('keydown', keyboardHandler as EventListener);
    }

    // Track focusable element
    this.focusableElements.add(element);
  }

  /**
   * Create description element
   */
  private createDescription(text: string): string {
    const id = `desc-${Math.random().toString(36).substr(2, 9)}`;
    const desc = document.createElement('div');
    desc.id = id;
    desc.className = 'sr-only';
    desc.textContent = text;
    desc.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    `;
    document.body.appendChild(desc);
    return id;
  }

  /**
   * Add keyboard navigation to visualization
   */
  addKeyboardNavigation(
    container: HTMLElement,
    items: Element[],
    config: KeyboardNavigationConfig = {}
  ): void {
    const {
      enableArrowKeys = true,
      enableTabNavigation = true,
      enableEscapeKey = true,
      enableEnterKey = true,
      enableSpaceKey = true
    } = config;

    container.addEventListener('keydown', (event: KeyboardEvent) => {
      const focusableItems = Array.from(items).filter(item =>
        !item.hasAttribute('aria-hidden') && item.getAttribute('tabindex') !== '-1'
      );

      if (focusableItems.length === 0) return;

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          if (enableArrowKeys) {
            event.preventDefault();
            this.focusNext(focusableItems);
          }
          break;

        case 'ArrowLeft':
        case 'ArrowUp':
          if (enableArrowKeys) {
            event.preventDefault();
            this.focusPrevious(focusableItems);
          }
          break;

        case 'Home':
          event.preventDefault();
          this.focusFirst(focusableItems);
          break;

        case 'End':
          event.preventDefault();
          this.focusLast(focusableItems);
          break;

        case 'Escape':
          if (enableEscapeKey) {
            event.preventDefault();
            this.returnFocus(container);
          }
          break;

        case 'Enter':
          if (enableEnterKey) {
            const activeElement = document.activeElement;
            if (activeElement && focusableItems.includes(activeElement)) {
              event.preventDefault();
              this.triggerClick(activeElement as HTMLElement);
            }
          }
          break;

        case ' ':
          if (enableSpaceKey) {
            const activeElement = document.activeElement;
            if (activeElement && focusableItems.includes(activeElement)) {
              event.preventDefault();
              this.triggerClick(activeElement as HTMLElement);
            }
          }
          break;

        case 'Tab':
          if (!enableTabNavigation) {
            event.preventDefault();
          }
          break;
      }
    });
  }

  /**
   * Focus next item
   */
  private focusNext(items: Element[]): void {
    const currentIndex = items.findIndex(item => item === document.activeElement);
    const nextIndex = (currentIndex + 1) % items.length;
    (items[nextIndex] as HTMLElement).focus();
    this.currentFocusIndex = nextIndex;
  }

  /**
   * Focus previous item
   */
  private focusPrevious(items: Element[]): void {
    const currentIndex = items.findIndex(item => item === document.activeElement);
    const prevIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
    (items[prevIndex] as HTMLElement).focus();
    this.currentFocusIndex = prevIndex;
  }

  /**
   * Focus first item
   */
  private focusFirst(items: Element[]): void {
    (items[0] as HTMLElement).focus();
    this.currentFocusIndex = 0;
  }

  /**
   * Focus last item
   */
  private focusLast(items: Element[]): void {
    const lastIndex = items.length - 1;
    (items[lastIndex] as HTMLElement).focus();
    this.currentFocusIndex = lastIndex;
  }

  /**
   * Return focus to container
   */
  private returnFocus(container: HTMLElement): void {
    container.focus();
    this.currentFocusIndex = -1;
  }

  /**
   * Trigger click on element
   */
  private triggerClick(element: HTMLElement): void {
    element.click();
  }

  /**
   * Create live region for announcements
   */
  createLiveRegion(id: string, politeness: 'polite' | 'assertive' = 'polite'): HTMLElement {
    let region = document.getElementById(id);

    if (!region) {
      region = document.createElement('div');
      region.id = id;
      region.setAttribute('aria-live', politeness);
      region.setAttribute('aria-atomic', 'true');
      region.className = 'sr-only';
      region.style.cssText = `
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
      `;
      document.body.appendChild(region);
    }

    return region;
  }

  /**
   * Announce to screen reader
   */
  announce(message: string, regionId: string = 'viz-live-region'): void {
    const region = this.createLiveRegion(regionId);
    region.textContent = message;

    // Clear after announcement
    setTimeout(() => {
      region.textContent = '';
    }, 1000);
  }

  /**
   * Add ARIA labels to chart elements
   */
  labelChartElements(
    elements: Element[],
    labelGenerator: (element: Element, index: number) => string
  ): void {
    elements.forEach((element, index) => {
      const label = labelGenerator(element, index);
      element.setAttribute('aria-label', label);
      element.setAttribute('role', 'img');
      element.setAttribute('tabindex', '0');
    });
  }

  /**
   * Check if high contrast mode is enabled
   */
  isHighContrastMode(): boolean {
    // Check for high contrast media query
    if (window.matchMedia) {
      const highContrast = window.matchMedia('(prefers-contrast: high)');
      return highContrast.matches;
    }
    return false;
  }

  /**
   * Check if reduced motion is preferred
   */
  prefersReducedMotion(): boolean {
    if (window.matchMedia) {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      return reducedMotion.matches;
    }
    return false;
  }

  /**
   * Check if user prefers dark mode
   */
  prefersDarkMode(): boolean {
    if (window.matchMedia) {
      const darkMode = window.matchMedia('(prefers-color-scheme: dark)');
      return darkMode.matches;
    }
    return false;
  }

  /**
   * Add focus visible styles
   */
  addFocusStyles(element: HTMLElement | SVGElement): void {
    element.addEventListener('focus', () => {
      element.setAttribute('data-focus-visible', 'true');
    });

    element.addEventListener('blur', () => {
      element.removeAttribute('data-focus-visible');
    });

    // Add CSS for focus styles
    const style = document.createElement('style');
    style.textContent = `
      [data-focus-visible="true"] {
        outline: 2px solid var(--vscode-focusBorder);
        outline-offset: 2px;
      }
    `;
    if (!document.head.querySelector('style[data-focus-styles]')) {
      style.setAttribute('data-focus-styles', 'true');
      document.head.appendChild(style);
    }
  }

  /**
   * Create skip link
   */
  createSkipLink(targetId: string, text: string = 'Skip to visualization'): HTMLElement {
    const skipLink = document.createElement('a');
    skipLink.href = `#${targetId}`;
    skipLink.textContent = text;
    skipLink.className = 'skip-link';
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 0;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      padding: 8px;
      text-decoration: none;
      z-index: 100;
    `;

    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '0';
    });

    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px';
    });

    return skipLink;
  }

  /**
   * Add alternative text description
   */
  addAltTextDescription(
    container: HTMLElement,
    description: string
  ): void {
    const textDiv = document.createElement('div');
    textDiv.className = 'sr-only';
    textDiv.textContent = description;
    textDiv.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    `;
    container.appendChild(textDiv);
    container.setAttribute('aria-describedby', textDiv.id || `desc-${Date.now()}`);
  }

  /**
   * Create data table alternative
   */
  createDataTableAlternative(
    data: any[],
    columns: Array<{ key: string; label: string }>
  ): HTMLTableElement {
    const table = document.createElement('table');
    table.className = 'sr-only';
    table.setAttribute('role', 'table');

    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    columns.forEach(col => {
      const th = document.createElement('th');
      th.textContent = col.label;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create body
    const tbody = document.createElement('tbody');
    data.forEach(row => {
      const tr = document.createElement('tr');
      columns.forEach(col => {
        const td = document.createElement('td');
        td.textContent = String(row[col.key] ?? '');
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    return table;
  }

  /**
   * Add touch support for mobile
   */
  addTouchSupport(element: HTMLElement, onTouch: (event: TouchEvent) => void): void {
    element.addEventListener('touchstart', onTouch, { passive: true });
    element.addEventListener('touchmove', onTouch, { passive: true });
    element.addEventListener('touchend', onTouch, { passive: true });
  }

  /**
   * Clean up accessibility resources
   */
  dispose(): void {
    this.focusableElements.clear();
    this.currentFocusIndex = -1;

    // Clean up live regions
    const liveRegions = document.querySelectorAll('[aria-live]');
    liveRegions.forEach(region => {
      if (region.id.startsWith('viz-') || region.id.startsWith('desc-')) {
        region.remove();
      }
    });
  }
}

/**
 * Singleton instance
 */
export const accessibilityHelper = new AccessibilityHelper();
