/**
 * MaturityDetector - Detect actual threading maturity level
 *
 * Scans workspace to determine what level of threading is actually
 * implemented (not just configured). Resilient to partial implementations.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  MaturityLevel,
  DetectionResult,
  ImplementationIndicator,
  CoverageReport,
  FileCoverage,
  Inconsistency,
  LevelRecommendation,
  CodeExample
} from '../types';
import { FlexibleParser } from '../analysis/parsers/FlexibleParser';

export class MaturityDetector {
  private flexibleParser: FlexibleParser;
  private fileExtensions = ['.ts', '.tsx', '.js', '.jsx'];

  constructor() {
    this.flexibleParser = new FlexibleParser();
  }

  /**
   * Detect actual implementation level by scanning workspace
   * Returns HIGHEST consistently implemented level (not highest attempted)
   */
  async detectActualLevel(workspacePath: string): Promise<DetectionResult> {
    // Gather evidence for each level
    const indicators = {
      [MaturityLevel.DECORATOR]: await this.findDecorators(workspacePath),
      [MaturityLevel.CONDITIONAL]: await this.findThreadContext(workspacePath),
      [MaturityLevel.ANNOTATION]: await this.findJSDocThreads(workspacePath),
      [MaturityLevel.SEMANTIC]: await this.findSemanticLogs(workspacePath),
      [MaturityLevel.OBSERVATION]: await this.findAnyLogs(workspacePath)
    };

    // Determine highest consistent level
    const detectedLevel = this.determineConsistentLevel(indicators);

    // Calculate coverage
    const coverage = await this.calculateCoverage(workspacePath, indicators);

    // Find inconsistencies
    const inconsistencies = this.findInconsistencies(indicators);

    // Generate recommendations
    const recommendations = this.generateRecommendations(detectedLevel, coverage, inconsistencies);

    return {
      detectedLevel,
      coverage,
      inconsistencies,
      recommendations,
      timestamp: Date.now()
    };
  }

  /**
   * Find @ThreadSpec and @ThreadLog decorators
   */
  async findDecorators(workspacePath: string): Promise<ImplementationIndicator> {
    const files = await this.getAllSourceFiles(workspacePath);
    const filesWithPattern: string[] = [];
    const examples: CodeExample[] = [];
    let totalOccurrences = 0;

    const decoratorPatterns = [
      /@ThreadSpec\s*\(/g,
      /@ThreadLog\s*\(/g
    ];

    for (const file of files) {
      try {
        const content = await fs.promises.readFile(file, 'utf-8');
        let foundInFile = false;

        for (const pattern of decoratorPatterns) {
          const matches = content.matchAll(pattern);
          for (const match of matches) {
            foundInFile = true;
            totalOccurrences++;

            if (examples.length < 5) { // Limit examples
              const lineNumber = this.getLineNumber(content, match.index || 0);
              examples.push({
                filePath: file,
                lineNumber,
                code: this.getLineContent(content, match.index || 0)
              });
            }
          }
        }

        if (foundInFile) {
          filesWithPattern.push(file);
        }
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }

    // Check if reflect-metadata is installed
    const hasReflectMetadata = await this.checkReflectMetadata(workspacePath);
    const confidence = hasReflectMetadata && filesWithPattern.length > 0 ? 0.9 : 0.5;

    return {
      level: MaturityLevel.DECORATOR,
      filesWithPattern,
      totalOccurrences,
      coverage: files.length > 0 ? filesWithPattern.length / files.length : 0,
      confidence,
      examples
    };
  }

  /**
   * Find ThreadContext.enter/run/exit patterns
   */
  async findThreadContext(workspacePath: string): Promise<ImplementationIndicator> {
    const files = await this.getAllSourceFiles(workspacePath);
    const filesWithPattern: string[] = [];
    const examples: CodeExample[] = [];
    let totalOccurrences = 0;

    const patterns = [
      /ThreadContext\.enter\s*\(/g,
      /ThreadContext\.exit\s*\(/g,
      /ThreadContext\.run\s*\(/g,
      /ThreadContext\.current\s*\(/g
    ];

    for (const file of files) {
      try {
        const content = await fs.promises.readFile(file, 'utf-8');
        let foundInFile = false;

        for (const pattern of patterns) {
          const matches = content.matchAll(pattern);
          for (const match of matches) {
            foundInFile = true;
            totalOccurrences++;

            if (examples.length < 5) {
              const lineNumber = this.getLineNumber(content, match.index || 0);
              examples.push({
                filePath: file,
                lineNumber,
                code: this.getLineContent(content, match.index || 0)
              });
            }
          }
        }

        if (foundInFile) {
          filesWithPattern.push(file);
        }
      } catch (error) {
        continue;
      }
    }

    return {
      level: MaturityLevel.CONDITIONAL,
      filesWithPattern,
      totalOccurrences,
      coverage: files.length > 0 ? filesWithPattern.length / files.length : 0,
      confidence: totalOccurrences > 0 ? 0.8 : 0,
      examples
    };
  }

  /**
   * Find JSDoc @thread annotations
   */
  async findJSDocThreads(workspacePath: string): Promise<ImplementationIndicator> {
    const files = await this.getAllSourceFiles(workspacePath);
    const filesWithPattern: string[] = [];
    const examples: CodeExample[] = [];
    let totalOccurrences = 0;

    // Match JSDoc comments with @thread tag
    const pattern = /\/\*\*[\s\S]*?@thread\s+([A-Z_][A-Z0-9_]*)/gi;

    for (const file of files) {
      try {
        const content = await fs.promises.readFile(file, 'utf-8');
        const matches = content.matchAll(pattern);
        let foundInFile = false;

        for (const match of matches) {
          foundInFile = true;
          totalOccurrences++;

          if (examples.length < 5) {
            const lineNumber = this.getLineNumber(content, match.index || 0);
            examples.push({
              filePath: file,
              lineNumber,
              code: this.getLineContent(content, match.index || 0),
              context: `Thread: ${match[1]}`
            });
          }
        }

        if (foundInFile) {
          filesWithPattern.push(file);
        }
      } catch (error) {
        continue;
      }
    }

    return {
      level: MaturityLevel.ANNOTATION,
      filesWithPattern,
      totalOccurrences,
      coverage: files.length > 0 ? filesWithPattern.length / files.length : 0,
      confidence: totalOccurrences > 0 ? 0.75 : 0,
      examples
    };
  }

  /**
   * Find semantic log patterns [THREAD:X]
   */
  async findSemanticLogs(workspacePath: string): Promise<ImplementationIndicator> {
    const files = await this.getAllSourceFiles(workspacePath);
    const filesWithPattern: string[] = [];
    const examples: CodeExample[] = [];
    let totalOccurrences = 0;

    for (const file of files) {
      try {
        const content = await fs.promises.readFile(file, 'utf-8');
        const result = this.flexibleParser.parse(content, file);

        if (result.threads.length > 0) {
          filesWithPattern.push(file);
          totalOccurrences += result.variations.reduce((sum, v) => sum + v.occurrences, 0);

          // Add examples from variations
          for (const variation of result.variations) {
            if (examples.length < 5) {
              examples.push(...variation.locations.slice(0, 5 - examples.length));
            }
          }
        }
      } catch (error) {
        continue;
      }
    }

    // Calculate average confidence across files
    const avgConfidence = filesWithPattern.length > 0 ? 0.7 : 0;

    return {
      level: MaturityLevel.SEMANTIC,
      filesWithPattern,
      totalOccurrences,
      coverage: files.length > 0 ? filesWithPattern.length / files.length : 0,
      confidence: avgConfidence,
      examples
    };
  }

  /**
   * Find any logging statements (baseline)
   */
  async findAnyLogs(workspacePath: string): Promise<ImplementationIndicator> {
    const files = await this.getAllSourceFiles(workspacePath);
    const filesWithPattern: string[] = [];
    const examples: CodeExample[] = [];
    let totalOccurrences = 0;

    const logPatterns = [
      /console\.(log|info|warn|error|debug)/g,
      /logger\.(log|info|warn|error|debug)/g,
      /\.log\(/g,
      /\.info\(/g,
      /\.warn\(/g,
      /\.error\(/g
    ];

    for (const file of files) {
      try {
        const content = await fs.promises.readFile(file, 'utf-8');
        let foundInFile = false;

        for (const pattern of logPatterns) {
          const matches = content.matchAll(pattern);
          for (const match of matches) {
            foundInFile = true;
            totalOccurrences++;

            if (examples.length < 5) {
              const lineNumber = this.getLineNumber(content, match.index || 0);
              examples.push({
                filePath: file,
                lineNumber,
                code: this.getLineContent(content, match.index || 0)
              });
            }
          }
        }

        if (foundInFile) {
          filesWithPattern.push(file);
        }
      } catch (error) {
        continue;
      }
    }

    return {
      level: MaturityLevel.OBSERVATION,
      filesWithPattern,
      totalOccurrences,
      coverage: files.length > 0 ? filesWithPattern.length / files.length : 0,
      confidence: 1.0, // Always confident about basic logging
      examples
    };
  }

  /**
   * Determine highest consistently implemented level
   * Requires >70% coverage to be considered "consistent"
   */
  private determineConsistentLevel(
    indicators: Record<MaturityLevel, ImplementationIndicator>
  ): MaturityLevel {
    const CONSISTENCY_THRESHOLD = 0.7;

    // Check from highest to lowest level
    for (let level = MaturityLevel.DECORATOR; level >= MaturityLevel.OBSERVATION; level--) {
      const indicator = indicators[level];
      if (indicator.coverage >= CONSISTENCY_THRESHOLD && indicator.confidence > 0.5) {
        return level;
      }
    }

    // If nothing meets threshold, return the level with highest coverage
    let highestLevel = MaturityLevel.OBSERVATION;
    let highestCoverage = 0;

    for (const [level, indicator] of Object.entries(indicators)) {
      if (indicator.coverage > highestCoverage) {
        highestCoverage = indicator.coverage;
        highestLevel = parseInt(level) as MaturityLevel;
      }
    }

    return highestLevel;
  }

  /**
   * Calculate coverage report
   */
  private async calculateCoverage(
    workspacePath: string,
    indicators: Record<MaturityLevel, ImplementationIndicator>
  ): Promise<CoverageReport> {
    const files = await this.getAllSourceFiles(workspacePath);
    const byFile = new Map<string, FileCoverage>();

    // Analyze each file
    for (const file of files) {
      const fileCoverage = await this.analyzeFileCoverage(file, indicators);
      byFile.set(file, fileCoverage);
    }

    // Calculate overall coverage
    const filesWithThreading = Array.from(byFile.values()).filter(
      fc => fc.level > MaturityLevel.OBSERVATION
    ).length;

    return {
      overall: files.length > 0 ? filesWithThreading / files.length : 0,
      byLevel: {
        [MaturityLevel.OBSERVATION]: indicators[MaturityLevel.OBSERVATION].coverage,
        [MaturityLevel.SEMANTIC]: indicators[MaturityLevel.SEMANTIC].coverage,
        [MaturityLevel.ANNOTATION]: indicators[MaturityLevel.ANNOTATION].coverage,
        [MaturityLevel.CONDITIONAL]: indicators[MaturityLevel.CONDITIONAL].coverage,
        [MaturityLevel.DECORATOR]: indicators[MaturityLevel.DECORATOR].coverage
      },
      byFile,
      totalFiles: files.length,
      filesWithThreading
    };
  }

  /**
   * Analyze coverage for a single file
   */
  private async analyzeFileCoverage(
    filePath: string,
    indicators: Record<MaturityLevel, ImplementationIndicator>
  ): Promise<FileCoverage> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      // Determine highest level present in this file
      let level = MaturityLevel.OBSERVATION;
      const patterns: string[] = [];

      if (indicators[MaturityLevel.DECORATOR].filesWithPattern.includes(filePath)) {
        level = MaturityLevel.DECORATOR;
        patterns.push('decorators');
      }
      if (indicators[MaturityLevel.CONDITIONAL].filesWithPattern.includes(filePath)) {
        level = Math.max(level, MaturityLevel.CONDITIONAL);
        patterns.push('ThreadContext');
      }
      if (indicators[MaturityLevel.ANNOTATION].filesWithPattern.includes(filePath)) {
        level = Math.max(level, MaturityLevel.ANNOTATION);
        patterns.push('@thread JSDoc');
      }
      if (indicators[MaturityLevel.SEMANTIC].filesWithPattern.includes(filePath)) {
        level = Math.max(level, MaturityLevel.SEMANTIC);
        patterns.push('[THREAD:X] logs');
      }
      if (indicators[MaturityLevel.OBSERVATION].filesWithPattern.includes(filePath)) {
        level = Math.max(level, MaturityLevel.OBSERVATION);
        patterns.push('basic logging');
      }

      // Count lines with threading
      const linesWithThreading = lines.filter(line =>
        this.hasThreadingPattern(line)
      ).length;

      return {
        filePath,
        level,
        coverage: lines.length > 0 ? linesWithThreading / lines.length : 0,
        patterns,
        linesWithThreading,
        totalLines: lines.length
      };
    } catch (error) {
      return {
        filePath,
        level: MaturityLevel.OBSERVATION,
        coverage: 0,
        patterns: [],
        linesWithThreading: 0,
        totalLines: 0
      };
    }
  }

  /**
   * Check if line has any threading pattern
   */
  private hasThreadingPattern(line: string): boolean {
    const patterns = [
      /@ThreadSpec/,
      /@ThreadLog/,
      /ThreadContext\./,
      /@thread/,
      /\[THREAD:/,
      /\{thread:/
    ];

    return patterns.some(p => p.test(line));
  }

  /**
   * Find inconsistencies in implementation
   */
  private findInconsistencies(
    indicators: Record<MaturityLevel, ImplementationIndicator>
  ): Inconsistency[] {
    const inconsistencies: Inconsistency[] = [];

    // Check for mixed levels within files
    const allFiles = new Set<string>();
    for (const indicator of Object.values(indicators)) {
      indicator.filesWithPattern.forEach(f => allFiles.add(f));
    }

    for (const file of allFiles) {
      const levelsInFile = Object.entries(indicators)
        .filter(([_, ind]) => ind.filesWithPattern.includes(file))
        .map(([level]) => parseInt(level) as MaturityLevel);

      if (levelsInFile.length > 1) {
        const maxLevel = Math.max(...levelsInFile);
        const minLevel = Math.min(...levelsInFile);

        if (maxLevel - minLevel > 1) {
          inconsistencies.push({
            type: 'mixed_levels',
            description: `File uses multiple threading levels (L${minLevel}-L${maxLevel})`,
            severity: 'medium',
            files: [file],
            suggestion: `Standardize on Level ${maxLevel} throughout the file`
          });
        }
      }
    }

    return inconsistencies;
  }

  /**
   * Generate recommendations based on detection
   */
  private generateRecommendations(
    detectedLevel: MaturityLevel,
    coverage: CoverageReport,
    inconsistencies: Inconsistency[]
  ): LevelRecommendation[] {
    const recommendations: LevelRecommendation[] = [];

    // Recommend upgrading if coverage is low
    if (coverage.overall < 0.5 && detectedLevel < MaturityLevel.DECORATOR) {
      recommendations.push({
        action: 'upgrade',
        fromLevel: detectedLevel,
        toLevel: (detectedLevel + 1) as MaturityLevel,
        reason: 'Low coverage detected - consider implementing next level',
        benefits: [
          'Better debugging visibility',
          'More structured threading',
          'Improved analysis capabilities'
        ],
        effort: 'medium',
        priority: 'medium'
      });
    }

    // Recommend standardizing if there are inconsistencies
    if (inconsistencies.length > 0) {
      recommendations.push({
        action: 'standardize',
        fromLevel: detectedLevel,
        toLevel: detectedLevel,
        reason: 'Inconsistent threading patterns detected',
        benefits: [
          'Consistent codebase',
          'Easier maintenance',
          'Better team understanding'
        ],
        effort: 'small',
        priority: 'high'
      });
    }

    return recommendations;
  }

  /**
   * Get all source files in workspace
   */
  private async getAllSourceFiles(workspacePath: string): Promise<string[]> {
    const files: string[] = [];

    async function walk(dir: string): Promise<void> {
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          // Skip node_modules, .git, dist, build, etc.
          if (entry.isDirectory()) {
            if (!['node_modules', '.git', 'dist', 'build', 'out', '.vscode'].includes(entry.name)) {
              await walk(fullPath);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    }

    await walk(workspacePath);
    return files;
  }

  /**
   * Check if reflect-metadata is installed
   */
  private async checkReflectMetadata(workspacePath: string): Promise<boolean> {
    try {
      const packageJsonPath = path.join(workspacePath, 'package.json');
      const packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, 'utf-8'));

      return !!(
        packageJson.dependencies?.['reflect-metadata'] ||
        packageJson.devDependencies?.['reflect-metadata']
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Get line number from character index
   */
  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Get content of line at character index
   */
  private getLineContent(content: string, index: number): string {
    const lines = content.split('\n');
    const lineNumber = this.getLineNumber(content, index);
    return lines[lineNumber - 1] || '';
  }
}
