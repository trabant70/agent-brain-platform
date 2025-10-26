/**
 * ResilientAnalyzer - Parse logs with resilience to format inconsistencies
 *
 * Uses multiple parsing strategies to extract maximum value from
 * logs regardless of implementation quality.
 */

import { LogEntry, MaturityLevel, ParseResult } from '../types';
import { FlexibleParser } from './parsers/FlexibleParser';

export interface AnalyzerConfig {
  enabledParsers?: ('strict' | 'flexible' | 'inference')[];
  minimumConfidence?: number;  // 0-1, default 0.5
  fallbackToInference?: boolean;  // Default true
}

export interface ResilientAnalysisResult {
  entries: LogEntry[];
  parseResults: ParseResult[];
  confidence: number;
  parserUsed: 'strict' | 'flexible' | 'inference' | 'mixed';
  warnings: string[];
}

export class ResilientAnalyzer {
  private flexibleParser: FlexibleParser;
  private config: AnalyzerConfig;

  constructor(config: AnalyzerConfig = {}) {
    this.flexibleParser = new FlexibleParser();
    this.config = {
      enabledParsers: config.enabledParsers || ['strict', 'flexible', 'inference'],
      minimumConfidence: config.minimumConfidence ?? 0.5,
      fallbackToInference: config.fallbackToInference ?? true
    };
  }

  /**
   * Analyze log content with resilience to format variations
   */
  async analyze(logContent: string, filePath?: string): Promise<ResilientAnalysisResult> {
    const results: ParseResult[] = [];
    const warnings: string[] = [];

    // Try parsers in order of strictness
    if (this.config.enabledParsers!.includes('strict')) {
      const strictResult = this.parseStrict(logContent, filePath);
      if (strictResult.confidence >= this.config.minimumConfidence!) {
        return {
          entries: this.convertToLogEntries(strictResult, logContent),
          parseResults: [strictResult],
          confidence: strictResult.confidence,
          parserUsed: 'strict',
          warnings
        };
      }
      results.push(strictResult);
      warnings.push(`Strict parsing yielded low confidence (${strictResult.confidence.toFixed(2)})`);
    }

    // Try flexible parser
    if (this.config.enabledParsers!.includes('flexible')) {
      const flexibleResult = this.flexibleParser.parse(logContent, filePath);
      if (flexibleResult.confidence >= this.config.minimumConfidence!) {
        return {
          entries: this.convertToLogEntries(flexibleResult, logContent),
          parseResults: [flexibleResult],
          confidence: flexibleResult.confidence,
          parserUsed: 'flexible',
          warnings
        };
      }
      results.push(flexibleResult);
      warnings.push(`Flexible parsing yielded low confidence (${flexibleResult.confidence.toFixed(2)})`);
    }

    // Try inference parser as last resort
    if (this.config.fallbackToInference && this.config.enabledParsers!.includes('inference')) {
      const inferredResult = this.parseWithInference(logContent, filePath);
      results.push(inferredResult);
      warnings.push('Using inference parser - results may be less accurate');

      return {
        entries: this.convertToLogEntries(inferredResult, logContent),
        parseResults: results,
        confidence: inferredResult.confidence,
        parserUsed: 'inference',
        warnings
      };
    }

    // If all failed, merge results
    if (results.length > 0) {
      const merged = this.mergeResults(results);
      return {
        entries: this.convertToLogEntries(merged, logContent),
        parseResults: results,
        confidence: merged.confidence,
        parserUsed: 'mixed',
        warnings: [...warnings, 'Using merged results from multiple parsers']
      };
    }

    // Complete failure - return empty result
    warnings.push('No parsers succeeded - returning empty result');
    return {
      entries: [],
      parseResults: [],
      confidence: 0,
      parserUsed: 'strict',
      warnings
    };
  }

  /**
   * Parse with strict format requirements
   * Only accepts [THREAD:UPPERCASE_NAME] format
   */
  private parseStrict(content: string, filePath?: string): ParseResult {
    const threads = new Set<string>();
    const variations = new Map();
    const normalized = new Map();

    // Strict pattern: [THREAD:UPPERCASE]
    const strictPattern = /\[THREAD:([A-Z_][A-Z0-9_]*)\]/g;
    const matches = content.matchAll(strictPattern);

    for (const match of matches) {
      threads.add(match[1]);
      normalized.set(match[1], match[1]);
    }

    // Count total log statements
    const logLines = content.split('\n').filter(line =>
      /console\.(log|info|warn|error)|logger\./i.test(line)
    );

    const coverage = logLines.length > 0
      ? (content.match(strictPattern) || []).length / logLines.length
      : 0;

    return {
      threads: Array.from(threads),
      confidence: coverage,
      format: 'strict',
      variations: [],
      normalized
    };
  }

  /**
   * Parse with inference when explicit indicators are missing
   * Guesses thread based on context clues
   */
  private parseWithInference(content: string, filePath?: string): ParseResult {
    const threads = new Set<string>();
    const normalized = new Map();

    // Infer threads from function/file context
    const inferred = this.inferThreadsFromContext(content, filePath);
    inferred.forEach(t => {
      threads.add(t);
      normalized.set(t, t);
    });

    return {
      threads: Array.from(threads),
      confidence: 0.3, // Low confidence for inferred
      format: 'inferred',
      variations: [],
      normalized
    };
  }

  /**
   * Infer threads from code context
   */
  private inferThreadsFromContext(content: string, filePath?: string): string[] {
    const threads: string[] = [];

    // Database/data operations
    if (/\b(query|find|fetch|get|select|insert|update|delete)\b/i.test(content)) {
      threads.push('DATA_FLOW');
    }

    // Cache operations
    if (/\b(cache|redis|memcached|localStorage|sessionStorage)\b/i.test(content)) {
      threads.push('CACHE');
    }

    // Validation
    if (/\b(validate|validation|validator|schema|check)\b/i.test(content)) {
      threads.push('VALIDATION');
    }

    // Error handling
    if (/\b(try|catch|error|exception|throw|recover|retry)\b/i.test(content)) {
      threads.push('ERROR_RECOVERY');
    }

    // AI/ML operations
    if (/\b(ai|ml|model|embedding|completion|llm|gpt|claude)\b/i.test(content)) {
      threads.push('AGENT_BRAIN');
    }

    // File path hints
    if (filePath) {
      if (/cache/i.test(filePath)) threads.push('CACHE');
      if (/validation/i.test(filePath)) threads.push('VALIDATION');
      if (/db|database|data/i.test(filePath)) threads.push('DATA_FLOW');
      if (/error|recovery/i.test(filePath)) threads.push('ERROR_RECOVERY');
    }

    return [...new Set(threads)]; // Deduplicate
  }

  /**
   * Merge results from multiple parsers
   */
  private mergeResults(results: ParseResult[]): ParseResult {
    const allThreads = new Set<string>();
    const allNormalized = new Map<string, string>();
    let totalConfidence = 0;

    for (const result of results) {
      result.threads.forEach(t => allThreads.add(t));
      result.normalized.forEach((norm, orig) => allNormalized.set(orig, norm));
      totalConfidence += result.confidence;
    }

    return {
      threads: Array.from(allThreads),
      confidence: results.length > 0 ? totalConfidence / results.length : 0,
      format: 'flexible', // Default to flexible for merged
      variations: [],
      normalized: allNormalized
    };
  }

  /**
   * Convert parse result to log entries
   * Creates synthetic log entries from parsed thread information
   */
  private convertToLogEntries(result: ParseResult, content: string): LogEntry[] {
    const entries: LogEntry[] = [];
    const lines = content.split('\n');

    // For each line, check if it contains thread information
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if line is a log statement
      if (!/console\.(log|info|warn|error)|logger\./i.test(line)) {
        continue;
      }

      // Find which thread(s) this line belongs to
      const threads: string[] = [];
      for (const thread of result.threads) {
        // Check if thread name appears in this line (case-insensitive)
        if (new RegExp(thread, 'i').test(line)) {
          threads.push(thread);
        }
      }

      // If no threads found in line, try to infer from context
      if (threads.length === 0 && result.threads.length > 0) {
        // Use first thread as default (better than nothing)
        threads.push(result.threads[0]);
      }

      if (threads.length > 0) {
        // Create a synthetic log entry
        // Note: This is a simplified conversion - full implementation would
        // parse actual log format (JSON, JSONL, etc.)
        entries.push({
          type: 'entry',
          context: this.extractContext(line),
          threads,
          timestamp: Date.now() + i, // Synthetic timestamp
          args: []
        });
      }
    }

    return entries;
  }

  /**
   * Extract context (function name) from log line
   */
  private extractContext(line: string): string {
    // Try to find function name in log message
    const functionMatch = line.match(/function\s+(\w+)|(\w+)\s*\(/);
    if (functionMatch) {
      return functionMatch[1] || functionMatch[2] || 'unknown';
    }

    // Try to extract from class.method pattern
    const classMethodMatch = line.match(/(\w+)\.(\w+)/);
    if (classMethodMatch) {
      return `${classMethodMatch[1]}.${classMethodMatch[2]}`;
    }

    return 'unknown';
  }

  /**
   * Analyze with fallback to different strategies
   */
  async analyzeWithFallback(
    entries: LogEntry[],
    primaryAnalyzer?: any
  ): Promise<any> {
    // If primary analyzer provided, try it first
    if (primaryAnalyzer && typeof primaryAnalyzer.analyze === 'function') {
      try {
        return await primaryAnalyzer.analyze(entries);
      } catch (error) {
        // Primary analyzer failed, continue with resilient analysis
      }
    }

    // Use resilient parsing on the entries
    // Convert entries back to content for re-parsing
    const content = entries.map(e => JSON.stringify(e)).join('\n');
    return this.analyze(content);
  }
}
