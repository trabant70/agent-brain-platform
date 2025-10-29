/**
 * Educational Tooltips System
 * Provides context-sensitive help adapted to user's maturity level
 *
 * Goal: Help users understand technical concepts without overwhelming them
 */

import { MaturityLevel } from './MaturityLevelAdapter';

export interface TooltipContent {
  novice: string;
  intermediate: string;
  advanced: string;
  expert: string;
}

export class EducationalTooltips {
  private tooltips: Map<string, TooltipContent>;
  private currentLevel: MaturityLevel;

  constructor(maturityLevel: MaturityLevel = 'intermediate') {
    this.currentLevel = maturityLevel;
    this.tooltips = new Map();
    this.initializeTooltips();
  }

  /**
   * Initialize tooltip content
   */
  private initializeTooltips(): void {
    // Code Structure Concepts
    this.addTooltip('feature-completeness', {
      novice: 'Shows if your frontend (buttons, forms) is connected to your backend (server code). Like making sure light switches actually turn on lights.',
      intermediate: 'Analyzes connections between UI components and API endpoints. Detects disconnected features where frontend code exists without backend support, or vice versa.',
      advanced: 'Performs static analysis of API call patterns vs endpoint definitions. Identifies disconnected endpoints, mocked services, and incomplete feature implementations through AST traversal.',
      expert: 'AST-based detector matching fetch/axios patterns against Express/Fastify route definitions. Supports path normalization (/:id), detects mock objects, tracks connection graph.'
    });

    this.addTooltip('ui-ux-quality', {
      novice: 'Checks if your app shows loading spinners, handles errors properly, and works well for all users. Makes sure the app feels smooth and professional.',
      intermediate: 'Detects UX issues: missing loading states for async operations, inadequate error handling, missing empty states, form validation gaps, and accessibility violations.',
      advanced: 'Analyzes React/Vue components for UX anti-patterns. Detects missing useState for async ops, absent error boundaries, WCAG violations. Checks contrast ratios, keyboard nav, ARIA labels.',
      expert: 'AST analysis of component lifecycle. Detects useEffect without loading states, async functions without try-catch, lists without length checks. WCAG AA/AAA compliance scanning.'
    });

    this.addTooltip('test-coverage', {
      novice: 'Shows which parts of your code have tests. Tests are like safety checks - they make sure your code works correctly and doesn\'t break.',
      intermediate: 'Identifies untested files by matching production code to test files. Categorizes by importance (services = critical, components = high, etc). Calculates coverage percentage.',
      advanced: 'Analyzes test file patterns (.test., .spec., __tests__/). Maps production files to tests using basename matching. Prioritizes by file type and directory structure.',
      expert: 'Static analysis for test-to-code mapping. Supports Jest/Vitest patterns. Categorizes by CBO/LCOM metrics for importance. Integration with coverage reports when available.'
    });

    this.addTooltip('internationalization', {
      novice: 'Checks if your text can work in different languages. Makes sure you\'re not hardcoding English text everywhere.',
      intermediate: 'Detects hardcoded strings that should be in translation files. Identifies missing translations, untranslated UI text, and inconsistent i18n usage.',
      advanced: 'Scans for string literals in JSX/TSX. Checks translation coverage across locales. Detects date/number format inconsistencies. Verifies RTL support.',
      expert: 'AST traversal for string literals in component trees. Validates against i18n JSON schemas. Detects ICU message format issues. Checks locale fallback chains.'
    });

    // Technical Terms
    this.addTooltip('endpoint', {
      novice: 'A URL your app connects to, like "/api/users". It\'s like a door your frontend knocks on to get data from the server.',
      intermediate: 'An API endpoint - a URL path with HTTP method (GET, POST, etc.) that handles specific requests. Example: POST /api/users creates a new user.',
      advanced: 'RESTful endpoint definition combining HTTP method, URL pattern (with path params like :id), and handler function. Typically defined in Express/Fastify route config.',
      expert: 'Route definition in web framework. Consists of: HTTP verb, URL pattern (supports path params, wildcards), middleware chain, handler function. Mapped via router instances.'
    });

    this.addTooltip('async-operation', {
      novice: 'Something that takes time to finish, like loading data from the internet. Your app shouldn\'t freeze while waiting.',
      intermediate: 'Asynchronous operation using promises or async/await. Executes without blocking the main thread. Examples: API calls, file I/O, timers.',
      advanced: 'Non-blocking I/O operation. JavaScript event loop handles async execution. Promise-based or callback-based. Requires proper error handling via try-catch or .catch().',
      expert: 'Asynchronous JavaScript operation utilizing microtask/macrotask queues. Promise chain or async/await syntax. Requires error handling, loading state management, cancellation support for component unmount.'
    });

    this.addTooltip('wcag', {
      novice: 'Web Content Accessibility Guidelines - rules to make your website usable by everyone, including people who use screen readers or keyboards.',
      intermediate: 'Accessibility standards (WCAG 2.1) defining requirements for perceivable, operable, understandable, and robust web content. Levels: A (basic), AA (standard), AAA (enhanced).',
      advanced: 'International standard (ISO/IEC 40500) for web accessibility. Covers color contrast ratios, keyboard navigation, screen reader compatibility, focus management, ARIA attributes.',
      expert: 'W3C standard with testable success criteria. Level AA requires 4.5:1 contrast ratio for text, keyboard operability, semantic HTML, proper ARIA roles. Automated testing covers ~30% of criteria.'
    });

    this.addTooltip('severity', {
      novice: 'How important it is to fix an issue. Critical = fix right away, High = fix soon, Medium = fix when you can, Low = nice to have.',
      intermediate: 'Issue priority based on impact and urgency. Critical issues block functionality. High issues affect user experience. Medium/Low issues are improvements.',
      advanced: 'Risk classification: Critical (system failure, data loss), High (degraded UX, performance), Medium (minor bugs), Low (cosmetic, enhancement). Drives fix ordering.',
      expert: 'CVSS-style severity scoring factoring in exploitability, impact, and scope. Critical: runtime failures, security vulns. High: broken UX, accessibility barriers. Medium: degraded perf. Low: code quality.'
    });

    this.addTooltip('mocked-service', {
      novice: 'Fake data used instead of real data from the server. Like using toy money instead of real money - good for testing but shouldn\'t stay in production.',
      intermediate: 'Hardcoded data or stub implementation used instead of actual API calls. Common during development but should be replaced before production.',
      advanced: 'Service layer implementation returning static data. Detected via patterns: hardcoded arrays/objects, mock/stub function names, test fixtures in production code.',
      expert: 'Test double (mock/stub/fake) in production code. Detection: static data returns, absence of network calls, placeholder implementations. Indicates incomplete feature or technical debt.'
    });

    this.addTooltip('score', {
      novice: 'A number (0-100) showing how good your code is. Higher is better! 80+ is great, 60-79 is good, 40-59 needs work, below 40 needs serious attention.',
      intermediate: 'Calculated score based on issue count and severity. Formula: 100 - (critical*20 + high*10 + medium*5). Provides quick health indicator.',
      advanced: 'Weighted aggregate: Critical issues = -20pts, High = -10pts, Medium = -5pts. Normalized to 0-100. Category-specific scoring may apply different weights.',
      expert: 'Composite metric: Σ(severity_weight × issue_count). Threshold-based classification: 90+ (excellent), 70-89 (good), 50-69 (warning), <50 (critical). Comparable across projects.'
    });
  }

  /**
   * Add tooltip content
   */
  private addTooltip(key: string, content: TooltipContent): void {
    this.tooltips.set(key, content);
  }

  /**
   * Get tooltip text for current maturity level
   */
  getTooltip(key: string, maturityLevel?: MaturityLevel): string {
    const level = maturityLevel || this.currentLevel;
    const content = this.tooltips.get(key);

    if (!content) {
      return `No tooltip available for: ${key}`;
    }

    return content[level];
  }

  /**
   * Set maturity level
   */
  setMaturityLevel(level: MaturityLevel): void {
    this.currentLevel = level;
  }

  /**
   * Create tooltip HTML element
   */
  createTooltipElement(key: string, term: string, maturityLevel?: MaturityLevel): string {
    const tooltipText = this.getTooltip(key, maturityLevel);

    return `
      <span class="tooltip-trigger" data-tooltip-key="${key}">
        ${term}
        <span class="tooltip-icon">ⓘ</span>
        <div class="tooltip-content">
          ${this.escapeHtml(tooltipText)}
        </div>
      </span>
    `;
  }

  /**
   * Inline tooltip (shows on hover)
   */
  createInlineTooltip(text: string, tooltipKey: string): string {
    return `
      <span class="has-tooltip" data-tooltip-key="${tooltipKey}">
        ${text}
      </span>
    `;
  }

  /**
   * Create help icon with tooltip
   */
  createHelpIcon(tooltipKey: string, size: 'small' | 'medium' | 'large' = 'small'): string {
    const icons = {
      small: '12px',
      medium: '16px',
      large: '20px'
    };

    return `
      <span class="help-icon"
            data-tooltip-key="${tooltipKey}"
            style="font-size: ${icons[size]}; cursor: help;"
            title="Click for more information">
        ⓘ
      </span>
    `;
  }

  /**
   * Initialize tooltip event listeners
   */
  initializeTooltipListeners(): void {
    // Add hover listeners for tooltips
    document.addEventListener('mouseover', (event) => {
      const target = event.target as HTMLElement;

      if (target.classList.contains('has-tooltip') || target.classList.contains('help-icon')) {
        const key = target.dataset.tooltipKey;
        if (key) {
          this.showTooltip(target, key);
        }
      }
    });

    document.addEventListener('mouseout', (event) => {
      const target = event.target as HTMLElement;

      if (target.classList.contains('has-tooltip') || target.classList.contains('help-icon')) {
        this.hideTooltip();
      }
    });
  }

  /**
   * Show tooltip near element
   */
  private showTooltip(element: HTMLElement, key: string): void {
    const tooltipText = this.getTooltip(key);

    // Create or get tooltip container
    let tooltipEl = document.getElementById('educational-tooltip');
    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.id = 'educational-tooltip';
      tooltipEl.className = 'educational-tooltip';
      tooltipEl.style.cssText = `
        position: fixed;
        max-width: 300px;
        padding: 12px 16px;
        background: var(--vscode-editorHoverWidget-background);
        border: 1px solid var(--vscode-editorHoverWidget-border);
        border-radius: 6px;
        font-size: 13px;
        line-height: 1.5;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        pointer-events: none;
        display: none;
      `;
      document.body.appendChild(tooltipEl);
    }

    tooltipEl.innerHTML = tooltipText;
    tooltipEl.style.display = 'block';

    // Position near element
    const rect = element.getBoundingClientRect();
    tooltipEl.style.left = `${rect.left}px`;
    tooltipEl.style.top = `${rect.bottom + 5}px`;

    // Adjust if tooltip goes off screen
    setTimeout(() => {
      const tooltipRect = tooltipEl!.getBoundingClientRect();
      if (tooltipRect.right > window.innerWidth) {
        tooltipEl!.style.left = `${window.innerWidth - tooltipRect.width - 10}px`;
      }
      if (tooltipRect.bottom > window.innerHeight) {
        tooltipEl!.style.top = `${rect.top - tooltipRect.height - 5}px`;
      }
    }, 0);
  }

  /**
   * Hide tooltip
   */
  private hideTooltip(): void {
    const tooltipEl = document.getElementById('educational-tooltip');
    if (tooltipEl) {
      tooltipEl.style.display = 'none';
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
   * Get all available tooltip keys
   */
  getAvailableTooltips(): string[] {
    return Array.from(this.tooltips.keys());
  }

  /**
   * Check if tooltip exists
   */
  hasTooltip(key: string): boolean {
    return this.tooltips.has(key);
  }
}
