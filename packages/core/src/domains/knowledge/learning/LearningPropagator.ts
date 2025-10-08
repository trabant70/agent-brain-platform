/**
 * Agent Brain Learning Propagator
 * Propagates learned patterns across the codebase to prevent similar issues
 * Extracted from Shantic Learning System
 */

import { LearningPattern, TestFailure, PropagationResult, FileScanner } from "./types";

export interface PropagationTarget {
  file: string;
  line: number;
  column: number;
  suggestion: string;
  confidence: number;
  autoFixable: boolean;
}



export class LearningPropagator {
  constructor(private fileScanner: FileScanner) {}

  /**
   * Propagate a learned pattern across the codebase
   */
  async propagatePattern(pattern: LearningPattern): Promise<PropagationResult> {
    const targets: PropagationTarget[] = [];
    let appliedFixes = 0;

    // Find relevant files for this pattern
    const files = await this.findRelevantFiles(pattern);

    for (const file of files) {
      const fileTargets = await this.scanFileForPattern(file, pattern);
      targets.push(...fileTargets);
    }

    // Apply auto-fixes if enabled and pattern is auto-fixable
    if (pattern.autoFixable) {
      appliedFixes = await this.applyAutoFixes(targets);
    }

    return {
      pattern,
      targets,
      totalTargets: targets.length,
      appliedFixes
    };
  }

  /**
   * Find files relevant to a specific pattern
   */
  private async findRelevantFiles(pattern: LearningPattern): Promise<string[]> {
    const extensions = this.getRelevantExtensions(pattern);
    const patterns = extensions.map(ext => `**/*.${ext}`);

    let files: string[] = [];
    for (const filePattern of patterns) {
      const matchedFiles = await this.fileScanner?.findFiles(filePattern);
      files.push(...matchedFiles);
    }

    // Filter out test files and node_modules
    return files.filter(file =>
      !file.includes('node_modules') &&
      !file.includes('.test.') &&
      !file.includes('.spec.') &&
      !file.includes('dist/')
    );
  }

  /**
   * Get relevant file extensions for a pattern
   */
  private getRelevantExtensions(pattern: LearningPattern): string[] {
    const baseExtensions = ['ts', 'js', 'tsx', 'jsx'];

    switch (pattern.category) {
      case 'null-pointer':
      case 'undefined-reference':
      case 'async-patterns':
        return baseExtensions;
      case 'performance':
        return [...baseExtensions, 'vue', 'svelte'];
      case 'code-quality':
        return [...baseExtensions, 'json', 'yml', 'yaml'];
      default:
        return baseExtensions;
    }
  }

  /**
   * Scan a file for occurrences of a pattern
   */
  private async scanFileForPattern(filePath: string, pattern: LearningPattern): Promise<PropagationTarget[]> {
    const content = await this.fileScanner?.scanFile(filePath);
    const targets: PropagationTarget[] = [];

    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      const match = this.matchPatternInLine(line, pattern);
      if (match) {
        targets.push({
          file: filePath,
          line: lineNumber,
          column: match.column,
          suggestion: this.generateSuggestion(pattern, line),
          confidence: pattern.confidenceScore || 0.5,
          autoFixable: pattern.autoFixable || false
        });
      }
    }

    return targets;
  }

  /**
   * Check if a line matches a pattern
   */
  private matchPatternInLine(line: string, pattern: LearningPattern): { column: number } | null {
    // Define pattern matchers based on category
    const matchers = this.getPatternMatchers(pattern);

    for (const matcher of matchers) {
      const match = line.match(matcher.regex);
      if (match) {
        return {
          column: match.index || 0
        };
      }
    }

    return null;
  }

  /**
   * Get pattern matchers for a specific pattern
   */
  private getPatternMatchers(pattern: LearningPattern): Array<{ regex: RegExp; suggestion: string }> {
    switch (pattern.category) {
      case 'null-pointer':
        return [
          {
            regex: /(\w+)\.(\w+)(?!\?)/g,
            suggestion: 'Consider using optional chaining: $1?.$2'
          }
        ];

      case 'undefined-reference':
        return [
          {
            regex: /(?:^|\s)(\w+)(?=\s*[\(\.=])/g,
            suggestion: 'Ensure variable is defined before use'
          }
        ];

      case 'async-patterns':
        return [
          {
            regex: /(?:^|\s)(\w+)\s*\(/g,
            suggestion: 'Consider adding await if this is an async call'
          }
        ];

      case 'performance':
        return [
          {
            regex: /\.map\(.*\)\s*\.map\(/g,
            suggestion: 'Consider combining multiple map operations'
          }
        ];

      case 'code-quality':
        if (pattern.name === 'Debug Statement') {
          return [
            {
              regex: /console\.log\(/g,
              suggestion: 'Remove debug console.log statement'
            }
          ];
        }
        break;
    }

    return [];
  }

  /**
   * Generate a suggestion for a specific pattern and line
   */
  private generateSuggestion(pattern: LearningPattern, line: string): string {
    const matchers = this.getPatternMatchers(pattern);

    for (const matcher of matchers) {
      if (matcher.regex?.test(line)) {
        return matcher.suggestion;
      }
    }

    return pattern.description;
  }

  /**
   * Apply auto-fixes to targets
   */
  private async applyAutoFixes(targets: PropagationTarget[]): Promise<number> {
    let appliedCount = 0;
    const fileUpdates = new Map<string, string>();

    // Group targets by file
    const targetsByFile = new Map<string, PropagationTarget[]>();
    for (const target of targets) {
      if (!target.autoFixable) continue;

      if (!targetsByFile.has(target.file)) {
        targetsByFile.set(target.file, []);
      }
      targetsByFile.get(target.file)!.push(target);
    }

    // Apply fixes file by file
    for (const [filePath, fileTargets] of targetsByFile) {
      try {
        const content = await this.fileScanner?.scanFile(filePath);
        let updatedContent = content;

        // Sort targets by line number (descending) to maintain line numbers
        fileTargets.sort((a, b) => b?.line - a?.line);

        for (const target of fileTargets) {
          updatedContent = this.applyFixToLine(updatedContent, target);
          appliedCount++;
        }

        if (updatedContent !== content) {
          await this.fileScanner?.writeFile(filePath, updatedContent);
          fileUpdates.set(filePath, updatedContent);
        }
      } catch (error) {
      }
    }

    return appliedCount;
  }

  /**
   * Apply a fix to a specific line in content
   */
  private applyFixToLine(content: string, target: PropagationTarget): string {
    const lines = content.split('\n');
    const lineIndex = target.line - 1;

    if (lineIndex >= 0 && lineIndex < lines.length) {
      const line = lines[lineIndex];

      // Apply specific fixes based on the suggestion
      if (target.suggestion?.includes('optional chaining')) {
        lines[lineIndex] = line.replace(/(\w+)\.(\w+)/g, '$1?.$2');
      } else if (target.suggestion?.includes('Remove debug console.log')) {
        lines[lineIndex] = line.replace(/console\.log\(.*\);?/, '');
      } else if (target.suggestion?.includes('adding await')) {
        lines[lineIndex] = line.replace(/(\w+)\s*\(/g, 'await $1(');
      }
    }

    return lines.join('\n');
  }

  /**
   * Get propagation statistics
   */
  async getStatistics(): Promise<{
    totalPatterns: number;
    totalPropagations: number;
    averageTargetsPerPattern: number;
    autoFixSuccessRate: number;
  }> {
    // This would typically come from storage
    // For now, return mock data
    return {
      totalPatterns: 0,
      totalPropagations: 0,
      averageTargetsPerPattern: 0,
      autoFixSuccessRate: 0
    };
  }
}