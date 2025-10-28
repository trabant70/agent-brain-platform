/**
 * Analysis context provides shared state and utilities during analysis
 */

import type {
  AnalysisContext as IAnalysisContext,
  AnalysisConfig,
  SourceFile,
  MaturityContext
} from '../types';

/**
 * Create an analysis context with defaults
 */
export function createAnalysisContext(
  files: SourceFile[],
  config?: Partial<AnalysisConfig>,
  maturityContext?: MaturityContext
): IAnalysisContext {
  const defaultConfig: AnalysisConfig = {
    enabledCategories: [],
    excludePatterns: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx'
    ],
    includePatterns: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    maxIssuesPerCategory: 100
  };

  return {
    files,
    config: { ...defaultConfig, ...config },
    maturityContext
  };
}

/**
 * Filter files based on include/exclude patterns
 */
export function filterFiles(
  files: SourceFile[],
  includePatterns: string[],
  excludePatterns: string[]
): SourceFile[] {
  return files.filter(file => {
    // Check exclude patterns first
    for (const pattern of excludePatterns) {
      if (matchPattern(file.path, pattern)) {
        return false;
      }
    }

    // If include patterns are specified, file must match at least one
    if (includePatterns.length > 0) {
      return includePatterns.some(pattern => matchPattern(file.path, pattern));
    }

    return true;
  });
}

/**
 * Simple glob pattern matching
 * Supports: *, **, ?
 */
function matchPattern(path: string, pattern: string): boolean {
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/\./g, '\\.') // Escape dots
    .replace(/\*\*/g, '.*') // ** matches any characters
    .replace(/\*/g, '[^/]*') // * matches any characters except /
    .replace(/\?/g, '.'); // ? matches single character

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(path);
}

/**
 * Get files by language
 */
export function getFilesByLanguage(
  files: SourceFile[],
  languages: string[]
): SourceFile[] {
  return files.filter(file => languages.includes(file.language));
}

/**
 * Get files by path pattern
 */
export function getFilesByPattern(
  files: SourceFile[],
  pattern: string
): SourceFile[] {
  return files.filter(file => matchPattern(file.path, pattern));
}

/**
 * Context utilities for analyzers
 */
export class AnalysisContextUtils {
  constructor(private context: IAnalysisContext) {}

  /**
   * Get filtered files for analysis
   */
  getFilteredFiles(): SourceFile[] {
    return filterFiles(
      this.context.files,
      this.context.config.includePatterns,
      this.context.config.excludePatterns
    );
  }

  /**
   * Get TypeScript/TSX files
   */
  getTypeScriptFiles(): SourceFile[] {
    return getFilesByLanguage(this.getFilteredFiles(), ['typescript', 'tsx']);
  }

  /**
   * Get JavaScript/JSX files
   */
  getJavaScriptFiles(): SourceFile[] {
    return getFilesByLanguage(this.getFilteredFiles(), ['javascript', 'jsx']);
  }

  /**
   * Get all code files (TS, TSX, JS, JSX)
   */
  getCodeFiles(): SourceFile[] {
    return getFilesByLanguage(this.getFilteredFiles(), [
      'typescript',
      'tsx',
      'javascript',
      'jsx'
    ]);
  }

  /**
   * Get CSS files
   */
  getStyleFiles(): SourceFile[] {
    return getFilesByLanguage(this.getFilteredFiles(), ['css']);
  }

  /**
   * Get JSON files
   */
  getJSONFiles(): SourceFile[] {
    return getFilesByLanguage(this.getFilteredFiles(), ['json']);
  }

  /**
   * Get HTML files
   */
  getHTMLFiles(): SourceFile[] {
    return getFilesByLanguage(this.getFilteredFiles(), ['html']);
  }

  /**
   * Get files by custom pattern
   */
  getFilesByPattern(pattern: string): SourceFile[] {
    return getFilesByPattern(this.getFilteredFiles(), pattern);
  }

  /**
   * Check if maturity context is available
   */
  hasMaturityContext(): boolean {
    return this.context.maturityContext !== undefined;
  }

  /**
   * Get maturity context
   */
  getMaturityContext(): MaturityContext | undefined {
    return this.context.maturityContext;
  }

  /**
   * Get configuration value
   */
  getConfig(): AnalysisConfig {
    return this.context.config;
  }

  /**
   * Get total file count
   */
  getTotalFileCount(): number {
    return this.context.files.length;
  }

  /**
   * Get filtered file count
   */
  getFilteredFileCount(): number {
    return this.getFilteredFiles().length;
  }
}
