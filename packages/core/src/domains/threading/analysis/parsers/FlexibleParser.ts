/**
 * FlexibleParser - Parse thread indicators with format resilience
 *
 * Handles variations in thread notation:
 * - Case sensitivity: [THREAD:X], [thread:x], [Thread:X]
 * - Format: [THREAD:X], [THREAD=X], {thread: "X"}, @thread X
 * - Spacing: [THREAD: X], [THREAD :X], [ THREAD:X ]
 * - Naming: DATA_FLOW, dataflow, DataFlow, data-flow, data flow
 */

import { ParseResult, ThreadVariation, CodeExample } from '../../types';

export class FlexibleParser {
  /**
   * Parse content for thread indicators with maximum flexibility
   */
  parse(content: string, filePath?: string): ParseResult {
    const threads = new Set<string>();
    const variations = new Map<string, ThreadVariation>();
    const normalized = new Map<string, string>();

    // All possible patterns for thread indicators
    const patterns = this.getAllPossiblePatterns();

    for (const pattern of patterns) {
      const matches = content.matchAll(pattern);

      for (const match of matches) {
        if (!match[1]) continue;

        const original = match[1].trim();
        const normalizedName = this.normalizeThreadName(original);

        // Track this variation
        if (!variations.has(normalizedName)) {
          variations.set(normalizedName, {
            original: normalizedName,
            normalized: normalizedName,
            occurrences: 0,
            locations: []
          });
        }

        const variation = variations.get(normalizedName)!;
        variation.occurrences++;

        // Add location if file path provided
        if (filePath) {
          const lineNumber = this.getLineNumber(content, match.index || 0);
          variation.locations.push({
            filePath,
            lineNumber,
            code: this.getLineContent(content, match.index || 0),
            context: this.getContext(content, match.index || 0)
          });
        }

        threads.add(normalizedName);
        normalized.set(original, normalizedName);
      }
    }

    return {
      threads: Array.from(threads),
      confidence: this.calculateConfidence(threads.size, content),
      format: this.detectFormat(content),
      variations: Array.from(variations.values()),
      normalized
    };
  }

  /**
   * Get all regex patterns for thread detection
   */
  private getAllPossiblePatterns(): RegExp[] {
    return [
      // Standard format: [THREAD:NAME]
      /\[THREAD:\s*([A-Za-z_][A-Za-z0-9_-]*)\s*\]/gi,

      // Case variation: [thread:NAME], [Thread:NAME]
      /\[thread:\s*([A-Za-z_][A-Za-z0-9_-]*)\s*\]/gi,

      // Format variation: [THREAD=NAME]
      /\[THREAD\s*=\s*([A-Za-z_][A-Za-z0-9_-]*)\s*\]/gi,

      // Structured logging: {thread: "NAME"}
      /\{\s*thread\s*:\s*['"`]([A-Za-z_][A-Za-z0-9_-]*)['"`]\s*\}/gi,

      // Object property: .thread = "NAME"
      /\.thread\s*=\s*['"`]([A-Za-z_][A-Za-z0-9_-]*)['"`]/gi,

      // JSDoc style: @thread NAME
      /@thread\s+([A-Za-z_][A-Za-z0-9_-]*)/gi,

      // Natural language: "Thread: NAME" or "Thread = NAME"
      /Thread\s*[:=]\s*([A-Za-z_][A-Za-z0-9_-]*)/gi,

      // Variable assignment: thread = 'NAME'
      /thread\s*=\s*['"`]([A-Za-z_][A-Za-z0-9_-]*)['"`]/gi
    ];
  }

  /**
   * Normalize thread name to canonical form
   * Examples:
   * - DATA_FLOW, dataflow, DataFlow, data-flow, data flow → DATA_FLOW
   */
  normalizeThreadName(raw: string): string {
    return raw
      .trim()
      // Replace spaces and hyphens with underscores
      .replace(/[\s-]/g, '_')
      // Convert to uppercase
      .toUpperCase()
      // Remove any characters that aren't A-Z, 0-9, or underscore
      .replace(/[^A-Z0-9_]/g, '')
      // Collapse multiple underscores
      .replace(/__+/g, '_')
      // Remove leading/trailing underscores
      .replace(/^_+|_+$/g, '');
  }

  /**
   * Calculate confidence score based on thread patterns found
   */
  private calculateConfidence(threadCount: number, content: string): number {
    if (threadCount === 0) return 0;

    const lines = content.split('\n');
    const logLines = lines.filter(line => this.isLikelyLogStatement(line));

    if (logLines.length === 0) return 0.5; // Thread found but no logs

    // Count how many log lines have thread indicators
    const threadedLogs = logLines.filter(line =>
      this.getAllPossiblePatterns().some(pattern => pattern.test(line))
    );

    // Confidence = percentage of logs that have thread indicators
    const coverage = threadedLogs.length / logLines.length;

    // Boost confidence if multiple different threads found (indicates intentional use)
    const diversityBonus = Math.min(threadCount * 0.1, 0.3);

    return Math.min(coverage + diversityBonus, 1.0);
  }

  /**
   * Detect the primary format used
   */
  private detectFormat(content: string): 'strict' | 'flexible' | 'inferred' {
    const strictPattern = /\[THREAD:[A-Z_]+\]/g;
    const strictMatches = (content.match(strictPattern) || []).length;

    const allMatches = this.getAllPossiblePatterns().reduce((count, pattern) => {
      return count + (content.match(pattern) || []).length;
    }, 0);

    if (strictMatches === allMatches && strictMatches > 0) {
      return 'strict';
    } else if (allMatches > 0) {
      return 'flexible';
    } else {
      return 'inferred';
    }
  }

  /**
   * Check if a line is likely a log statement
   */
  private isLikelyLogStatement(line: string): boolean {
    const logPatterns = [
      /console\.(log|info|warn|error|debug)/,
      /logger\.(log|info|warn|error|debug)/,
      /log\.(log|info|warn|error|debug)/,
      /winston\./,
      /bunyan\./,
      /pino\./,
      /\.log\(/,
      /\.info\(/,
      /\.warn\(/,
      /\.error\(/,
      /\.debug\(/
    ];

    return logPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Get line number from character index
   */
  private getLineNumber(content: string, index: number): number {
    const lines = content.substring(0, index).split('\n');
    return lines.length;
  }

  /**
   * Get content of line at character index
   */
  private getLineContent(content: string, index: number): string {
    const lines = content.split('\n');
    const lineNumber = this.getLineNumber(content, index);
    return lines[lineNumber - 1] || '';
  }

  /**
   * Get surrounding context (3 lines before and after)
   */
  private getContext(content: string, index: number): string {
    const lines = content.split('\n');
    const lineNumber = this.getLineNumber(content, index);
    const start = Math.max(0, lineNumber - 4); // 3 lines before (0-indexed)
    const end = Math.min(lines.length, lineNumber + 3); // 3 lines after

    return lines.slice(start, end).join('\n');
  }

  /**
   * Parse multiple files concurrently
   */
  async parseFiles(files: Map<string, string>): Promise<Map<string, ParseResult>> {
    const results = new Map<string, ParseResult>();

    for (const [filePath, content] of files) {
      const result = this.parse(content, filePath);
      results.set(filePath, result);
    }

    return results;
  }

  /**
   * Merge parse results from multiple files
   */
  mergeResults(results: ParseResult[]): ParseResult {
    const allThreads = new Set<string>();
    const allVariations = new Map<string, ThreadVariation>();
    const allNormalized = new Map<string, string>();
    let totalConfidence = 0;

    for (const result of results) {
      // Collect threads
      result.threads.forEach(t => allThreads.add(t));

      // Merge variations
      for (const variation of result.variations) {
        const existing = allVariations.get(variation.normalized);
        if (existing) {
          existing.occurrences += variation.occurrences;
          existing.locations.push(...variation.locations);
        } else {
          allVariations.set(variation.normalized, { ...variation });
        }
      }

      // Merge normalized map
      result.normalized.forEach((norm, orig) => {
        allNormalized.set(orig, norm);
      });

      totalConfidence += result.confidence;
    }

    return {
      threads: Array.from(allThreads),
      confidence: results.length > 0 ? totalConfidence / results.length : 0,
      format: this.determineDominantFormat(results),
      variations: Array.from(allVariations.values()),
      normalized: allNormalized
    };
  }

  /**
   * Determine the dominant format across multiple results
   */
  private determineDominantFormat(results: ParseResult[]): 'strict' | 'flexible' | 'inferred' {
    const counts = { strict: 0, flexible: 0, inferred: 0 };

    for (const result of results) {
      counts[result.format]++;
    }

    if (counts.strict >= counts.flexible && counts.strict >= counts.inferred) {
      return 'strict';
    } else if (counts.flexible >= counts.inferred) {
      return 'flexible';
    } else {
      return 'inferred';
    }
  }
}
