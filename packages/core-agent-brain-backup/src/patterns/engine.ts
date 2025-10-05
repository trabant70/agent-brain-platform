/**
 * Agent Brain Pattern Engine
 * Core pattern matching and validation system
 * Extracted from Shantic Senior System
 */

export interface EnginePatternMatch {
  pattern: EnginePattern;
  location: {
    line: number;
    column: number;
    length: number;
  };
  confidence: number;
  suggestion?: string;
  autoFixable: boolean;
}

export interface EnginePattern {
  id: string;
  name: string;
  description: string;
  category: EnginePatternCategory;
  severity: EnginePatternSeverity;
  trigger: RegExp | string;
  message: string;
  examples?: {
    good: string[];
    bad: string[];
  };
  autoFix?: {
    enabled: boolean;
    replacement?: string;
    transform?: (match: string) => string;
  };
  metadata?: {
    source?: string;
    confidence?: number;
    tags?: string[];
  };
}

export type EnginePatternCategory =
  | 'error-handling'
  | 'type-safety'
  | 'performance'
  | 'security'
  | 'maintainability'
  | 'testability'
  | 'async-patterns'
  | 'code-quality'
  | 'architecture'
  | 'accessibility'
  | 'best-practices';

export type EnginePatternSeverity = 'error' | 'warning' | 'info' | 'suggestion';

export interface EnginePatternContext {
  filePath: string;
  language: string;
  framework?: string;
  fileType: 'source' | 'test' | 'config' | 'documentation';
  projectType?: string;
}

export interface ValidationResult {
  passed: boolean;
  matches: EnginePatternMatch[];
  summary: {
    total: number;
    byCategory: Record<EnginePatternCategory, number>;
    bySeverity: Record<EnginePatternSeverity, number>;
  };
}

export class PatternEngine {
  private patterns: Map<string, EnginePattern> = new Map();
  private categoryPatterns: Map<EnginePatternCategory, EnginePattern[]> = new Map();

  constructor() {
    this?.initializeDefaultPatterns();
  }

  /**
   * Register a pattern with the engine
   */
  registerPattern(pattern: EnginePattern): void {
    this?.patterns?.set(pattern?.id, pattern);

    // Add to category index
    if (!this?.categoryPatterns?.has(pattern?.category)) {
      this?.categoryPatterns?.set(pattern?.category, []);
    }
    this?.categoryPatterns?.get(pattern?.category)!.push(pattern);

    console?.log(`📝 Registered pattern: ${pattern?.name} (${pattern?.category})`);
  }

  /**
   * Unregister a pattern
   */
  unregisterPattern(patternId: string): boolean {
    const pattern = this?.patterns?.get(patternId);
    if (!pattern) return false;

    this?.patterns?.delete(patternId);

    // Remove from category index
    const categoryPatterns = this?.categoryPatterns?.get(pattern?.category);
    if (categoryPatterns) {
      const index = categoryPatterns?.findIndex(p => p?.id === patternId);
      if (index >= 0) {
        categoryPatterns?.splice(index, 1);
      }
    }

    return true;
  }

  /**
   * Validate code against all patterns
   */
  validateCode(code: string, context: EnginePatternContext): ValidationResult {
    const matches: EnginePatternMatch[] = [];

    for (const pattern of this?.patterns?.values()) {
      if (this?.shouldApplyPattern(pattern, context)) {
        const patternMatches = this?.matchPattern(code, pattern);
        matches?.push(...patternMatches);
      }
    }

    // Sort by severity and confidence
    matches?.sort((a, b) => {
      const severityOrder = { error: 4, warning: 3, info: 2, suggestion: 1 };
      const severityDiff = severityOrder[a?.pattern?.severity] - severityOrder[b?.pattern?.severity];
      if (severityDiff !== 0) return severityDiff;
      return b?.confidence - a?.confidence;
    });

    return {
      passed: matches?.filter(m => m?.pattern?.severity === 'error').length === 0,
      matches,
      summary: this?.createSummary(matches)
    };
  }

  /**
   * Validate code against specific category
   */
  validateByCategory(code: string, category: EnginePatternCategory, context: EnginePatternContext): ValidationResult {
    const categoryPatterns = this?.categoryPatterns?.get(category) || [];
    const matches: EnginePatternMatch[] = [];

    for (const pattern of categoryPatterns) {
      if (this?.shouldApplyPattern(pattern, context)) {
        const patternMatches = this?.matchPattern(code, pattern);
        matches?.push(...patternMatches);
      }
    }

    return {
      passed: matches?.filter(m => m?.pattern?.severity === 'error').length === 0,
      matches,
      summary: this?.createSummary(matches)
    };
  }

  /**
   * Get all registered patterns
   */
  getPatterns(): EnginePattern[] {
    return Array?.from(this?.patterns?.values());
  }

  /**
   * Get patterns by category
   */
  getPatternsByCategory(category: EnginePatternCategory): EnginePattern[] {
    return this?.categoryPatterns?.get(category) || [];
  }

  /**
   * Find a pattern by ID
   */
  getPattern(id: string): EnginePattern | undefined {
    return this?.patterns?.get(id);
  }

  /**
   * Apply auto-fixes to code
   */
  applyAutoFixes(code: string, matches: EnginePatternMatch[]): string {
    let fixedCode = code;
    const lines = code?.split('\n');

    // Sort matches by line number (descending) to maintain line numbers
    const autoFixableMatches = matches
      .filter(m => m?.autoFixable && m?.pattern?.autoFix?.enabled)
      .sort((a, b) => b?.location?.line - a?.location?.line);

    for (const match of autoFixableMatches) {
      const lineIndex = match?.location?.line - 1;
      if (lineIndex >= 0 && lineIndex < lines?.length) {
        const line = lines[lineIndex];

        if (match?.pattern?.autoFix?.replacement) {
          // Direct replacement
          lines[lineIndex] = line?.replace(
            match?.pattern?.trigger as RegExp,
            match?.pattern?.autoFix?.replacement
          );
        } else if (match?.pattern?.autoFix?.transform) {
          // Transform function
          const matchText = this?.extractMatchText(line, match);
          const transformed = match?.pattern?.autoFix?.transform(matchText);
          lines[lineIndex] = line?.replace(matchText, transformed);
        }
      }
    }

    return lines?.join('\n');
  }

  private shouldApplyPattern(pattern: EnginePattern, context: EnginePatternContext): boolean {
    // Check if pattern is relevant to the file type
    if (pattern?.metadata?.tags) {
      const tags = pattern?.metadata?.tags;

      // Skip test patterns for non-test files
      if (tags?.includes('test-only') && context?.fileType !== 'test') {
        return false;
      }

      // Skip source patterns for test files
      if (tags?.includes('source-only') && context?.fileType === 'test') {
        return false;
      }

      // Check language-specific patterns
      if (tags?.includes(`${context?.language}-only`) &&
          !tags?.includes(context?.language)) {
        return false;
      }
    }

    return true;
  }

  private matchPattern(code: string, pattern: EnginePattern): EnginePatternMatch[] {
    const matches: EnginePatternMatch[] = [];
    const lines = code?.split('\n');

    for (let i = 0; i < lines?.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      let regex: RegExp;
      if (pattern?.trigger instanceof RegExp) {
        regex = new RegExp(pattern?.trigger?.source, 'g');
      } else {
        regex = new RegExp(pattern?.trigger, 'g');
      }

      let match;
      while ((match = regex?.exec(line)) !== null) {
        matches?.push({
          pattern,
          location: {
            line: lineNumber,
            column: match?.index,
            length: match[0].length
          },
          confidence: pattern?.metadata?.confidence || 0.8,
          suggestion: this?.generateSuggestion(pattern, match[0]),
          autoFixable: pattern?.autoFix?.enabled || false
        });
      }
    }

    return matches;
  }

  private generateSuggestion(pattern: EnginePattern, matchText: string): string {
    if (pattern?.autoFix?.replacement) {
      return `Replace with: ${pattern?.autoFix?.replacement}`;
    }
    if (pattern?.autoFix?.transform) {
      const transformed = pattern?.autoFix?.transform(matchText);
      return `Replace with: ${transformed}`;
    }
    return pattern?.message;
  }

  private extractMatchText(line: string, match: EnginePatternMatch): string {
    return line?.substring(
      match?.location?.column,
      match?.location?.column + match?.location?.length
    );
  }

  private createSummary(matches: EnginePatternMatch[]) {
    const byCategory: Record<EnginePatternCategory, number> = {} as any;
    const bySeverity: Record<EnginePatternSeverity, number> = {} as any;

    for (const match of matches) {
      const category = match?.pattern?.category;
      const severity = match?.pattern?.severity;

      byCategory[category] = (byCategory[category] || 0) + 1;
      bySeverity[severity] = (bySeverity[severity] || 0) + 1;
    }

    return {
      total: matches?.length,
      byCategory,
      bySeverity
    };
  }

  private initializeDefaultPatterns(): void {
    // Error Handling Patterns
    this?.registerPattern({
      id: 'no-unhandled-promise',
      name: 'Unhandled Promise Rejection',
      description: 'Promises should have error handling',
      category: 'error-handling',
      severity: 'warning',
      trigger: /\.then\([^)]*\)(?!\s*\.catch)/g,
      message: 'Add .catch() to handle promise rejection',
      examples: {
        bad: ['fetch("/api").then(res => res?.json())'],
        good: ['fetch("/api").then(res => res?.json()).catch(err => console?.error(err))']
      }
    });

    // Type Safety Patterns
    this?.registerPattern({
      id: 'no-any-type',
      name: 'Avoid Any Type',
      description: 'Using any type defeats TypeScript\'s purpose',
      category: 'type-safety',
      severity: 'warning',
      trigger: /:\s*any\b/g,
      message: 'Replace any with specific type',
      examples: {
        bad: ['const data: any = response'],
        good: ['const data: ResponseData = response']
      }
    });

    // Performance Patterns
    this?.registerPattern({
      id: 'inefficient-loop',
      name: 'Inefficient Loop Pattern',
      description: 'Multiple array operations that could be combined',
      category: 'performance',
      severity: 'suggestion',
      trigger: /\.map\([^)]+\)\s*\.filter\([^)]+\)/g,
      message: 'Consider combining map and filter operations',
      examples: {
        bad: ['array?.map(x => x * 2).filter(x => x > 10)'],
        good: ['array?.reduce((acc, x) => { const doubled = x * 2; return doubled > 10 ? [...acc, doubled] : acc; }, [])']
      }
    });

    // Security Patterns
    this?.registerPattern({
      id: 'no-eval',
      name: 'Dangerous eval() Usage',
      description: 'eval() can execute arbitrary code',
      category: 'security',
      severity: 'error',
      trigger: /\beval\s*\(/g,
      message: 'Avoid using eval() - security risk',
      examples: {
        bad: ['eval(userInput)'],
        good: ['JSON?.parse(userInput) // for JSON data']
      }
    });

    // Code Quality Patterns
    this?.registerPattern({
      id: 'no-console-log',
      name: 'Debug Console Statement',
      description: 'Console statements should not be in production code',
      category: 'code-quality',
      severity: 'info',
      trigger: /console\.log\(/g,
      message: 'Remove debug console?.log statement',
      autoFix: {
        enabled: true,
        replacement: ''
      },
      examples: {
        bad: ['console?.log("debug info")'],
        good: ['// Use proper logging library instead']
      }
    });

    console?.log(`🔧 Initialized pattern engine with ${this?.patterns?.size} default patterns`);
  }
}