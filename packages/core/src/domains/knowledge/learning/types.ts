/**
 * Learning System Types
 *
 * These types are for storing and managing learned knowledge.
 * NOT to be confused with EnginePattern (pattern matching) or RuntimePattern (extension API).
 */

export interface TestFailure {
  test: string;
  error: string;
  file: string;
  duration?: number;
  context: {
    code?: string;
    stack?: string;
    timestamp: Date;
    [key: string]: any; // Allow arbitrary context data (e.g., pathway debugging info)
  };
}

export interface LearningPattern {
  id?: string;
  name: string;
  category: string;
  description: string;
  rootCause: any;
  preventionRule: any;
  fixApproach?: string;
  service?: string;
  confidenceScore?: number;
  autoFixable?: boolean;
  occurrences?: number;
  createdAt?: Date;  // Timestamp when pattern was first learned
}

export interface LearningMetrics {
  totalPatterns: number;
  totalOccurrences: number;
  avgConfidenceScore: number;
  topCategories: Array<{ category: string; count: number }>;
  recentPatterns: LearningPattern[];
}

export interface PropagationResult {
  pattern: LearningPattern;
  targets: Array<{
    file: string;
    line: number;
    column: number;
    suggestion: string;
    confidence: number;
    autoFixable: boolean;
  }>;
  totalTargets: number;
  appliedFixes: number;
}

export interface FileScanner {
  scanFile(filePath: string): Promise<string>;
  writeFile(filePath: string, content: string): Promise<void>;
  findFiles(pattern: string): Promise<string[]>;
}
