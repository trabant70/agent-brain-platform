/**
 * Pattern Engine Types
 *
 * These types are for the internal pattern matching engine.
 * NOT to be confused with RuntimePattern (extension API) or LearningPattern (storage).
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
