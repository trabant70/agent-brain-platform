/**
 * Agent Brain Pattern Engine
 * Core pattern matching and validation system
 */

import {
  EnginePattern,
  EnginePatternMatch,
  EnginePatternCategory,
  EnginePatternSeverity,
  EnginePatternContext,
  ValidationResult
} from './types';

export * from './types';

export class PatternEngine {
  private patterns: Map<string, EnginePattern> = new Map();
  private categoryPatterns: Map<EnginePatternCategory, EnginePattern[]> = new Map();

  constructor() {
    this.initializeDefaultPatterns();
  }

  registerPattern(pattern: EnginePattern): void {
    this.patterns.set(pattern.id, pattern);
    if (!this.categoryPatterns.has(pattern.category)) {
      this.categoryPatterns.set(pattern.category, []);
    }
    this.categoryPatterns.get(pattern.category)!.push(pattern);
  }

  unregisterPattern(patternId: string): boolean {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return false;
    this.patterns.delete(patternId);
    const categoryPatterns = this.categoryPatterns.get(pattern.category);
    if (categoryPatterns) {
      const index = categoryPatterns.findIndex(p => p.id === patternId);
      if (index >= 0) categoryPatterns.splice(index, 1);
    }
    return true;
  }

  validateCode(code: string, context: EnginePatternContext): ValidationResult {
    const matches: EnginePatternMatch[] = [];
    for (const pattern of this.patterns.values()) {
      if (this.shouldApplyPattern(pattern, context)) {
        matches.push(...this.matchPattern(code, pattern));
      }
    }
    matches.sort((a, b) => {
      const severityOrder = { error: 4, warning: 3, info: 2, suggestion: 1 };
      return (severityOrder[b.pattern.severity] - severityOrder[a.pattern.severity]) || (b.confidence - a.confidence);
    });
    return {
      passed: matches.filter(m => m.pattern.severity === 'error').length === 0,
      matches,
      summary: this.createSummary(matches)
    };
  }

  validateByCategory(code: string, category: EnginePatternCategory, context: EnginePatternContext): ValidationResult {
    const matches: EnginePatternMatch[] = [];
    for (const pattern of this.categoryPatterns.get(category) || []) {
      if (this.shouldApplyPattern(pattern, context)) {
        matches.push(...this.matchPattern(code, pattern));
      }
    }
    return { passed: matches.filter(m => m.pattern.severity === 'error').length === 0, matches, summary: this.createSummary(matches) };
  }

  getPatterns(): EnginePattern[] { return Array.from(this.patterns.values()); }
  getPatternsByCategory(category: EnginePatternCategory): EnginePattern[] { return this.categoryPatterns.get(category) || []; }
  getPattern(id: string): EnginePattern | undefined { return this.patterns.get(id); }

  applyAutoFixes(code: string, matches: EnginePatternMatch[]): string {
    const lines = code.split('\n');
    matches.filter(m => m.autoFixable && m.pattern.autoFix?.enabled)
      .sort((a, b) => b.location.line - a.location.line)
      .forEach(match => {
        const idx = match.location.line - 1;
        if (idx >= 0 && idx < lines.length) {
          const line = lines[idx];
          if (match.pattern.autoFix?.replacement) {
            lines[idx] = line.replace(match.pattern.trigger as RegExp, match.pattern.autoFix.replacement);
          } else if (match.pattern.autoFix?.transform) {
            const text = line.substring(match.location.column, match.location.column + match.location.length);
            lines[idx] = line.replace(text, match.pattern.autoFix.transform(text));
          }
        }
      });
    return lines.join('\n');
  }

  private shouldApplyPattern(pattern: EnginePattern, context: EnginePatternContext): boolean {
    if (!pattern.metadata?.tags) return true;
    const tags = pattern.metadata.tags;
    if (tags.includes('test-only') && context.fileType !== 'test') return false;
    if (tags.includes('source-only') && context.fileType === 'test') return false;
    if (tags.includes(`${context.language}-only`) && !tags.includes(context.language)) return false;
    return true;
  }

  private matchPattern(code: string, pattern: EnginePattern): EnginePatternMatch[] {
    const matches: EnginePatternMatch[] = [];
    code.split('\n').forEach((line, i) => {
      const regex = pattern.trigger instanceof RegExp ? new RegExp(pattern.trigger.source, 'g') : new RegExp(pattern.trigger, 'g');
      let match;
      while ((match = regex.exec(line)) !== null) {
        matches.push({
          pattern,
          location: { line: i + 1, column: match.index, length: match[0].length },
          confidence: pattern.metadata?.confidence || 0.8,
          suggestion: pattern.autoFix?.replacement ? `Replace with: ${pattern.autoFix.replacement}` : pattern.message,
          autoFixable: pattern.autoFix?.enabled || false
        });
      }
    });
    return matches;
  }

  private createSummary(matches: EnginePatternMatch[]) {
    const byCategory = {} as Record<EnginePatternCategory, number>;
    const bySeverity = {} as Record<EnginePatternSeverity, number>;
    matches.forEach(m => {
      byCategory[m.pattern.category] = (byCategory[m.pattern.category] || 0) + 1;
      bySeverity[m.pattern.severity] = (bySeverity[m.pattern.severity] || 0) + 1;
    });
    return { total: matches.length, byCategory, bySeverity };
  }

  private initializeDefaultPatterns(): void {
    this.registerPattern({ id: 'no-unhandled-promise', name: 'Unhandled Promise', description: 'Promises need error handling', category: 'error-handling', severity: 'warning', trigger: /\.then\([^)]*\)(?!\s*\.catch)/g, message: 'Add .catch() handler' });
    this.registerPattern({ id: 'no-any-type', name: 'Avoid Any Type', description: 'Using any defeats TypeScript', category: 'type-safety', severity: 'warning', trigger: /:\s*any\b/g, message: 'Use specific type' });
    this.registerPattern({ id: 'no-eval', name: 'Dangerous eval()', description: 'eval() executes arbitrary code', category: 'security', severity: 'error', trigger: /\beval\s*\(/g, message: 'Avoid eval()' });
  }
}
