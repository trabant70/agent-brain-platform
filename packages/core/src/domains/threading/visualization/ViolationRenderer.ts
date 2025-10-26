/**
 * ViolationRenderer
 *
 * Formats contract violations for display:
 * - Color coding by severity
 * - Path highlighting
 * - Fix suggestions
 * - Example code snippets
 * - Agent-friendly formatting
 */

import { ContractViolation } from '../types';

/**
 * Render options
 */
export interface RenderOptions {
  format?: 'text' | 'markdown' | 'html';
  includeAgentMessage?: boolean;
  includePath?: boolean;
  colorize?: boolean;
}

/**
 * Default render options
 */
const DEFAULT_RENDER_OPTIONS: RenderOptions = {
  format: 'text',
  includeAgentMessage: true,
  includePath: true,
  colorize: false
};

/**
 * Severity colors (ANSI codes)
 */
const SEVERITY_COLORS = {
  info: '\x1b[36m',      // Cyan
  warning: '\x1b[33m',   // Yellow
  error: '\x1b[31m',     // Red
  critical: '\x1b[35m'   // Magenta
};

/**
 * Severity emojis
 */
const SEVERITY_EMOJIS = {
  info: 'ℹ️',
  warning: '⚠️',
  error: '❌',
  critical: '🔥'
};

/**
 * Reset ANSI color
 */
const RESET_COLOR = '\x1b[0m';

/**
 * ViolationRenderer
 */
export class ViolationRenderer {
  /**
   * Render a single violation
   */
  render(violation: ContractViolation, options?: RenderOptions): string {
    const opts = { ...DEFAULT_RENDER_OPTIONS, ...options };

    switch (opts.format) {
      case 'markdown':
        return this.renderMarkdown(violation, opts);
      case 'html':
        return this.renderHTML(violation, opts);
      default:
        return this.renderText(violation, opts);
    }
  }

  /**
   * Render multiple violations
   */
  renderAll(violations: ContractViolation[], options?: RenderOptions): string {
    const opts = { ...DEFAULT_RENDER_OPTIONS, ...options };

    if (violations.length === 0) {
      return this.renderNoViolations(opts);
    }

    const rendered = violations.map(v => this.render(v, opts));

    switch (opts.format) {
      case 'markdown':
        return this.renderMarkdownSummary(violations, rendered);
      case 'html':
        return this.renderHTMLSummary(violations, rendered);
      default:
        return this.renderTextSummary(violations, rendered);
    }
  }

  /**
   * Render as plain text
   */
  private renderText(violation: ContractViolation, opts: RenderOptions): string {
    const parts: string[] = [];

    // Severity indicator
    const emoji = SEVERITY_EMOJIS[violation.severity];
    const color = opts.colorize ? SEVERITY_COLORS[violation.severity] : '';
    const reset = opts.colorize ? RESET_COLOR : '';

    parts.push(`${color}${emoji} ${violation.severity.toUpperCase()}${reset}`);

    // Type indicator
    parts.push(`[${violation.type}]`);

    // Path
    if (opts.includePath && violation.path) {
      parts.push(`at ${violation.path}`);
    }

    // Parameter name
    if (violation.paramName) {
      parts.push(`(${violation.paramName})`);
    }

    // Message
    parts.push(`\n  ${violation.message}`);

    // Expected vs Actual
    if (violation.expected && violation.actual) {
      parts.push(`\n  Expected: ${violation.expected}`);
      parts.push(`\n  Actual:   ${violation.actual}`);
    }

    // Agent message
    if (opts.includeAgentMessage && violation.agentMessage) {
      parts.push(`\n  💡 ${violation.agentMessage}`);
    }

    return parts.join(' ');
  }

  /**
   * Render as Markdown
   */
  private renderMarkdown(violation: ContractViolation, opts: RenderOptions): string {
    const parts: string[] = [];
    const emoji = SEVERITY_EMOJIS[violation.severity];

    // Header
    parts.push(`### ${emoji} ${violation.severity.toUpperCase()} - ${violation.type}`);

    // Path
    if (opts.includePath && violation.path) {
      parts.push(`**Location**: \`${violation.path}\``);
    }

    // Parameter
    if (violation.paramName) {
      parts.push(`**Parameter**: \`${violation.paramName}\``);
    }

    // Message
    parts.push(`**Message**: ${violation.message}`);

    // Expected vs Actual
    if (violation.expected && violation.actual) {
      parts.push('');
      parts.push('| | Value |');
      parts.push('|---|---|');
      parts.push(`| Expected | \`${violation.expected}\` |`);
      parts.push(`| Actual | \`${violation.actual}\` |`);
    }

    // Agent message
    if (opts.includeAgentMessage && violation.agentMessage) {
      parts.push('');
      parts.push(`> 💡 **Suggestion**: ${violation.agentMessage}`);
    }

    return parts.join('\n');
  }

  /**
   * Render as HTML
   */
  private renderHTML(violation: ContractViolation, opts: RenderOptions): string {
    const severityClass = `violation-${violation.severity}`;
    const emoji = SEVERITY_EMOJIS[violation.severity];

    let html = `<div class="violation ${severityClass}">`;

    // Header
    html += `<div class="violation-header">`;
    html += `<span class="violation-emoji">${emoji}</span>`;
    html += `<span class="violation-severity">${violation.severity.toUpperCase()}</span>`;
    html += `<span class="violation-type">[${violation.type}]</span>`;
    html += `</div>`;

    // Details
    html += `<div class="violation-details">`;

    if (opts.includePath && violation.path) {
      html += `<div class="violation-path">at <code>${violation.path}</code></div>`;
    }

    if (violation.paramName) {
      html += `<div class="violation-param">Parameter: <code>${violation.paramName}</code></div>`;
    }

    html += `<div class="violation-message">${violation.message}</div>`;

    // Expected vs Actual
    if (violation.expected && violation.actual) {
      html += `<table class="violation-comparison">`;
      html += `<tr><th>Expected</th><td><code>${this.escapeHTML(violation.expected)}</code></td></tr>`;
      html += `<tr><th>Actual</th><td><code>${this.escapeHTML(violation.actual)}</code></td></tr>`;
      html += `</table>`;
    }

    // Agent message
    if (opts.includeAgentMessage && violation.agentMessage) {
      html += `<div class="violation-suggestion">💡 ${violation.agentMessage}</div>`;
    }

    html += `</div></div>`;

    return html;
  }

  /**
   * Render "no violations" message
   */
  private renderNoViolations(opts: RenderOptions): string {
    switch (opts.format) {
      case 'markdown':
        return '✅ **No violations found**';
      case 'html':
        return '<div class="no-violations">✅ No violations found</div>';
      default:
        return '✅ No violations found';
    }
  }

  /**
   * Render text summary
   */
  private renderTextSummary(violations: ContractViolation[], rendered: string[]): string {
    const summary = this.getSummary(violations);
    const parts: string[] = [];

    parts.push(`\n${'='.repeat(60)}`);
    parts.push(`CONTRACT VIOLATIONS SUMMARY`);
    parts.push(`${'='.repeat(60)}`);
    parts.push(`Total: ${summary.total}`);
    parts.push(`Critical: ${summary.critical} | Errors: ${summary.errors} | Warnings: ${summary.warnings} | Info: ${summary.info}`);
    parts.push(`${'='.repeat(60)}\n`);

    parts.push(rendered.join('\n\n'));

    return parts.join('\n');
  }

  /**
   * Render Markdown summary
   */
  private renderMarkdownSummary(violations: ContractViolation[], rendered: string[]): string {
    const summary = this.getSummary(violations);
    const parts: string[] = [];

    parts.push('# Contract Violations Summary');
    parts.push('');
    parts.push(`**Total**: ${summary.total} violations`);
    parts.push('');
    parts.push('| Severity | Count |');
    parts.push('|---|---|');
    parts.push(`| 🔥 Critical | ${summary.critical} |`);
    parts.push(`| ❌ Error | ${summary.errors} |`);
    parts.push(`| ⚠️ Warning | ${summary.warnings} |`);
    parts.push(`| ℹ️ Info | ${summary.info} |`);
    parts.push('');
    parts.push('---');
    parts.push('');

    parts.push(rendered.join('\n\n---\n\n'));

    return parts.join('\n');
  }

  /**
   * Render HTML summary
   */
  private renderHTMLSummary(violations: ContractViolation[], rendered: string[]): string {
    const summary = this.getSummary(violations);

    let html = '<div class="violations-report">';

    // Summary header
    html += '<div class="violations-summary">';
    html += '<h2>Contract Violations Summary</h2>';
    html += `<div class="total-count">Total: ${summary.total} violations</div>`;
    html += '<div class="severity-counts">';
    html += `<span class="count-critical">🔥 ${summary.critical}</span>`;
    html += `<span class="count-error">❌ ${summary.errors}</span>`;
    html += `<span class="count-warning">⚠️ ${summary.warnings}</span>`;
    html += `<span class="count-info">ℹ️ ${summary.info}</span>`;
    html += '</div>';
    html += '</div>';

    // Violations list
    html += '<div class="violations-list">';
    html += rendered.join('');
    html += '</div>';

    html += '</div>';

    return html;
  }

  /**
   * Get violation summary statistics
   */
  private getSummary(violations: ContractViolation[]) {
    return {
      total: violations.length,
      critical: violations.filter(v => v.severity === 'critical').length,
      errors: violations.filter(v => v.severity === 'error').length,
      warnings: violations.filter(v => v.severity === 'warning').length,
      info: violations.filter(v => v.severity === 'info').length
    };
  }

  /**
   * Escape HTML special characters
   */
  private escapeHTML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Generate CSS for HTML rendering
   */
  static generateCSS(): string {
    return `
.violation {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 12px;
  margin: 8px 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.violation-critical {
  border-left: 4px solid #d946ef;
  background: #fdf4ff;
}

.violation-error {
  border-left: 4px solid #dc2626;
  background: #fef2f2;
}

.violation-warning {
  border-left: 4px solid #eab308;
  background: #fefce8;
}

.violation-info {
  border-left: 4px solid #0ea5e9;
  background: #f0f9ff;
}

.violation-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 600;
}

.violation-severity {
  font-size: 12px;
  letter-spacing: 0.5px;
}

.violation-type {
  font-size: 11px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 3px;
}

.violation-details {
  font-size: 14px;
  line-height: 1.6;
}

.violation-path,
.violation-param {
  font-size: 12px;
  color: #6b7280;
  margin: 4px 0;
}

.violation-message {
  margin: 8px 0;
}

.violation-comparison {
  margin: 8px 0;
  border-collapse: collapse;
  width: 100%;
  font-size: 13px;
}

.violation-comparison th {
  text-align: left;
  padding: 4px 8px;
  background: #f9fafb;
  font-weight: 600;
  width: 80px;
}

.violation-comparison td {
  padding: 4px 8px;
}

.violation-suggestion {
  margin-top: 8px;
  padding: 8px;
  background: #f0fdf4;
  border-left: 3px solid #22c55e;
  font-size: 13px;
}

.violations-summary {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
}

.violations-summary h2 {
  margin: 0 0 12px 0;
  font-size: 18px;
}

.total-count {
  font-size: 14px;
  margin-bottom: 8px;
}

.severity-counts {
  display: flex;
  gap: 16px;
  font-size: 14px;
}

.severity-counts span {
  padding: 4px 8px;
  border-radius: 4px;
  background: white;
}

.no-violations {
  padding: 24px;
  text-align: center;
  color: #22c55e;
  font-size: 16px;
  font-weight: 500;
}
`;
  }
}

/**
 * Global violation renderer instance
 */
let globalViolationRenderer: ViolationRenderer | undefined;

/**
 * Get global violation renderer
 */
export function getGlobalViolationRenderer(): ViolationRenderer {
  if (!globalViolationRenderer) {
    globalViolationRenderer = new ViolationRenderer();
  }
  return globalViolationRenderer;
}

/**
 * Convenience function to render violation
 */
export function renderViolation(violation: ContractViolation, options?: RenderOptions): string {
  return getGlobalViolationRenderer().render(violation, options);
}

/**
 * Convenience function to render all violations
 */
export function renderViolations(violations: ContractViolation[], options?: RenderOptions): string {
  return getGlobalViolationRenderer().renderAll(violations, options);
}
