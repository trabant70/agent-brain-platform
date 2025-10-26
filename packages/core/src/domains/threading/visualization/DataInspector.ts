/**
 * DataInspector
 *
 * Utilities for inspecting and comparing data:
 * - Side-by-side expected vs actual
 * - Tree view of data structures
 * - Type highlighting
 * - Diff view for changes
 * - Value comparison
 */

import { ValueSnapshot } from '../types';

/**
 * Inspection options
 */
export interface InspectionOptions {
  format?: 'text' | 'markdown' | 'html';
  maxDepth?: number;
  showTypes?: boolean;
  showSizes?: boolean;
  colorize?: boolean;
}

/**
 * Default options
 */
const DEFAULT_INSPECTION_OPTIONS: InspectionOptions = {
  format: 'markdown',
  maxDepth: 5,
  showTypes: true,
  showSizes: false,
  colorize: false
};

/**
 * Diff operation
 */
type DiffOperation = 'add' | 'remove' | 'change' | 'same';

/**
 * Diff entry
 */
interface DiffEntry {
  path: string;
  operation: DiffOperation;
  oldValue?: any;
  newValue?: any;
}

/**
 * DataInspector
 */
export class DataInspector {
  /**
   * Inspect a value snapshot
   */
  inspect(snapshot: ValueSnapshot, options?: InspectionOptions): string {
    const opts = { ...DEFAULT_INSPECTION_OPTIONS, ...options };

    switch (opts.format) {
      case 'html':
        return this.inspectHTML(snapshot, opts);
      case 'text':
        return this.inspectText(snapshot, opts);
      default:
        return this.inspectMarkdown(snapshot, opts);
    }
  }

  /**
   * Compare two value snapshots
   */
  compare(
    expected: ValueSnapshot,
    actual: ValueSnapshot,
    options?: InspectionOptions
  ): string {
    const opts = { ...DEFAULT_INSPECTION_OPTIONS, ...options };

    switch (opts.format) {
      case 'html':
        return this.compareHTML(expected, actual, opts);
      case 'text':
        return this.compareText(expected, actual, opts);
      default:
        return this.compareMarkdown(expected, actual, opts);
    }
  }

  /**
   * Generate diff between two values
   */
  diff(oldValue: any, newValue: any): DiffEntry[] {
    const diffs: DiffEntry[] = [];

    this.diffRecursive(oldValue, newValue, '', diffs);

    return diffs;
  }

  /**
   * Inspect as Markdown
   */
  private inspectMarkdown(snapshot: ValueSnapshot, opts: InspectionOptions): string {
    const parts: string[] = [];

    // Preview
    if (snapshot.preview) {
      parts.push(`**Value**: \`${snapshot.preview}\``);
    }

    // Type
    if (opts.showTypes) {
      parts.push(`**Type**: \`${this.formatType(snapshot.type)}\``);
    }

    // Size
    if (opts.showSizes && snapshot.size !== undefined) {
      parts.push(`**Size**: ${this.formatBytes(snapshot.size)}`);
    }

    // Flags
    if (snapshot.redacted) {
      parts.push('🔒 *Value redacted for privacy*');
    }
    if (snapshot.truncated) {
      parts.push('✂️ *Value truncated*');
    }

    // Shape (for objects/arrays)
    if (snapshot.shape) {
      parts.push('');
      parts.push('**Structure**:');
      parts.push(this.formatShapeMarkdown(snapshot.shape, opts));
    }

    return parts.join('\n');
  }

  /**
   * Inspect as HTML
   */
  private inspectHTML(snapshot: ValueSnapshot, opts: InspectionOptions): string {
    let html = '<div class="data-inspector">';

    // Preview
    if (snapshot.preview) {
      html += `<div class="inspector-preview"><code>${this.escapeHTML(snapshot.preview)}</code></div>`;
    }

    // Type
    if (opts.showTypes) {
      html += `<div class="inspector-type">Type: <code>${this.formatType(snapshot.type)}</code></div>`;
    }

    // Size
    if (opts.showSizes && snapshot.size !== undefined) {
      html += `<div class="inspector-size">Size: ${this.formatBytes(snapshot.size)}</div>`;
    }

    // Flags
    if (snapshot.redacted) {
      html += '<div class="inspector-flag redacted">🔒 Value redacted for privacy</div>';
    }
    if (snapshot.truncated) {
      html += '<div class="inspector-flag truncated">✂️ Value truncated</div>';
    }

    html += '</div>';

    return html;
  }

  /**
   * Inspect as text
   */
  private inspectText(snapshot: ValueSnapshot, opts: InspectionOptions): string {
    const parts: string[] = [];

    if (snapshot.preview) {
      parts.push(`Value: ${snapshot.preview}`);
    }

    if (opts.showTypes) {
      parts.push(`Type: ${this.formatType(snapshot.type)}`);
    }

    if (opts.showSizes && snapshot.size !== undefined) {
      parts.push(`Size: ${this.formatBytes(snapshot.size)}`);
    }

    if (snapshot.redacted) {
      parts.push('[REDACTED]');
    }
    if (snapshot.truncated) {
      parts.push('[TRUNCATED]');
    }

    return parts.join(' | ');
  }

  /**
   * Compare as Markdown
   */
  private compareMarkdown(
    expected: ValueSnapshot,
    actual: ValueSnapshot,
    opts: InspectionOptions
  ): string {
    const parts: string[] = [];

    parts.push('### Expected vs Actual');
    parts.push('');

    // Table comparison
    parts.push('| | Expected | Actual |');
    parts.push('|---|---|---|');

    if (expected.preview || actual.preview) {
      parts.push(`| **Value** | \`${expected.preview || 'N/A'}\` | \`${actual.preview || 'N/A'}\` |`);
    }

    if (opts.showTypes) {
      parts.push(`| **Type** | \`${this.formatType(expected.type)}\` | \`${this.formatType(actual.type)}\` |`);
    }

    if (opts.showSizes) {
      const expSize = expected.size !== undefined ? this.formatBytes(expected.size) : 'N/A';
      const actSize = actual.size !== undefined ? this.formatBytes(actual.size) : 'N/A';
      parts.push(`| **Size** | ${expSize} | ${actSize} |`);
    }

    // Type match indicator
    const typeMatch = this.typesMatch(expected.type, actual.type);
    parts.push('');
    parts.push(typeMatch ? '✅ Types match' : '❌ Type mismatch');

    return parts.join('\n');
  }

  /**
   * Compare as HTML
   */
  private compareHTML(
    expected: ValueSnapshot,
    actual: ValueSnapshot,
    opts: InspectionOptions
  ): string {
    let html = '<div class="data-comparison">';

    html += '<table class="comparison-table">';
    html += '<thead><tr><th></th><th>Expected</th><th>Actual</th></tr></thead>';
    html += '<tbody>';

    if (expected.preview || actual.preview) {
      html += '<tr>';
      html += '<th>Value</th>';
      html += `<td><code>${this.escapeHTML(expected.preview || 'N/A')}</code></td>`;
      html += `<td><code>${this.escapeHTML(actual.preview || 'N/A')}</code></td>`;
      html += '</tr>';
    }

    if (opts.showTypes) {
      html += '<tr>';
      html += '<th>Type</th>';
      html += `<td><code>${this.formatType(expected.type)}</code></td>`;
      html += `<td><code>${this.formatType(actual.type)}</code></td>`;
      html += '</tr>';
    }

    html += '</tbody></table>';

    const typeMatch = this.typesMatch(expected.type, actual.type);
    html += `<div class="type-match ${typeMatch ? 'match' : 'mismatch'}">`;
    html += typeMatch ? '✅ Types match' : '❌ Type mismatch';
    html += '</div>';

    html += '</div>';

    return html;
  }

  /**
   * Compare as text
   */
  private compareText(
    expected: ValueSnapshot,
    actual: ValueSnapshot,
    opts: InspectionOptions
  ): string {
    const parts: string[] = [];

    parts.push('EXPECTED vs ACTUAL:');
    parts.push(`  Expected: ${expected.preview || 'N/A'}`);
    parts.push(`  Actual:   ${actual.preview || 'N/A'}`);

    if (opts.showTypes) {
      parts.push(`  Expected Type: ${this.formatType(expected.type)}`);
      parts.push(`  Actual Type:   ${this.formatType(actual.type)}`);
    }

    const typeMatch = this.typesMatch(expected.type, actual.type);
    parts.push(typeMatch ? '  Types match: YES' : '  Types match: NO');

    return parts.join('\n');
  }

  /**
   * Format shape as Markdown
   */
  private formatShapeMarkdown(shape: any, opts: InspectionOptions): string {
    if (shape.keys) {
      return `- Keys: ${shape.keys.join(', ')}`;
    }
    if (shape.arrayLength !== undefined) {
      return `- Array length: ${shape.arrayLength}\n- Item type: ${shape.itemType || 'unknown'}`;
    }
    return '- Structure: [complex]';
  }

  /**
   * Format type
   */
  private formatType(type: any): string {
    const parts: string[] = [];

    if (type.custom) {
      return type.custom;
    }

    if (type.isArray) {
      return 'Array';
    }

    if (type.isPromise) {
      return 'Promise';
    }

    if (type.isNull) {
      return 'null';
    }

    if (type.isUndefined) {
      return 'undefined';
    }

    return type.primitive || 'unknown';
  }

  /**
   * Check if types match
   */
  private typesMatch(type1: any, type2: any): boolean {
    if (type1.primitive !== type2.primitive) return false;
    if (type1.isArray !== type2.isArray) return false;
    if (type1.isPromise !== type2.isPromise) return false;
    if (type1.custom !== type2.custom) return false;
    return true;
  }

  /**
   * Recursive diff
   */
  private diffRecursive(
    oldVal: any,
    newVal: any,
    path: string,
    diffs: DiffEntry[]
  ): void {
    // Both undefined/null - no change
    if (oldVal === undefined && newVal === undefined) return;
    if (oldVal === null && newVal === null) return;

    // Value added
    if (oldVal === undefined || oldVal === null) {
      diffs.push({ path, operation: 'add', newValue: newVal });
      return;
    }

    // Value removed
    if (newVal === undefined || newVal === null) {
      diffs.push({ path, operation: 'remove', oldValue: oldVal });
      return;
    }

    // Primitive comparison
    if (typeof oldVal !== 'object' || typeof newVal !== 'object') {
      if (oldVal !== newVal) {
        diffs.push({ path, operation: 'change', oldValue: oldVal, newValue: newVal });
      } else {
        diffs.push({ path, operation: 'same', oldValue: oldVal, newValue: newVal });
      }
      return;
    }

    // Array comparison
    if (Array.isArray(oldVal) && Array.isArray(newVal)) {
      const maxLen = Math.max(oldVal.length, newVal.length);
      for (let i = 0; i < maxLen; i++) {
        this.diffRecursive(oldVal[i], newVal[i], `${path}[${i}]`, diffs);
      }
      return;
    }

    // Object comparison
    const allKeys = new Set([...Object.keys(oldVal), ...Object.keys(newVal)]);
    for (const key of allKeys) {
      const newPath = path ? `${path}.${key}` : key;
      this.diffRecursive(oldVal[key], newVal[key], newPath, diffs);
    }
  }

  /**
   * Format bytes
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  /**
   * Escape HTML
   */
  private escapeHTML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

/**
 * Global data inspector instance
 */
let globalDataInspector: DataInspector | undefined;

/**
 * Get global data inspector
 */
export function getGlobalDataInspector(): DataInspector {
  if (!globalDataInspector) {
    globalDataInspector = new DataInspector();
  }
  return globalDataInspector;
}

/**
 * Convenience function to inspect value
 */
export function inspectValue(snapshot: ValueSnapshot, options?: InspectionOptions): string {
  return getGlobalDataInspector().inspect(snapshot, options);
}

/**
 * Convenience function to compare values
 */
export function compareValues(
  expected: ValueSnapshot,
  actual: ValueSnapshot,
  options?: InspectionOptions
): string {
  return getGlobalDataInspector().compare(expected, actual, options);
}
