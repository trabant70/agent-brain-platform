/**
 * Runtime Types for Extension API
 *
 * These types define the PUBLIC API contract for Agent Brain extensions.
 * They are simpler than EnginePattern (internal) or LearningPattern (storage).
 *
 * Extensions use these types to define custom patterns and analyzers.
 */

export interface RuntimePattern {
  id: string;
  name: string;
  category: string;
  description: string;
  trigger: RegExp | string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  source?: string;
}

export interface PatternMatch {
  pattern: RuntimePattern;
  location: Location;
  confidence: number;
  context: string;
}

export interface Location {
  file: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
}

export interface Intervention {
  type: 'suggestion' | 'warning' | 'blocking';
  message: string;
  actions?: Action[];
  documentation?: string;
}

export interface Action {
  title: string;
  command: string;
  arguments?: any[];
}

export interface Learning {
  type: string;
  data: any;
  timestamp: Date;
  source: string;
}

export interface Intent {
  type: string;
  confidence: number;
  context: any;
}

export interface InterventionStrategy {
  type: 'blocking' | 'warning' | 'suggestion';
  message: string;
  documentation?: string;
  actions?: Action[];
}

export interface Command {
  id: string;
  title: string;
  handler: (...args: any[]) => any;
}

export interface Configuration {
  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
}

export interface Logger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

// Analyzer interface (for extensions)
export interface Analyzer {
  name: string;
  analyze(code: string, context: any): any;
}

// Core service interfaces (for extensions to interact with)
export interface PatternMatcher {
  match(code: string, patterns: RuntimePattern[]): PatternMatch[];
  addPattern(pattern: RuntimePattern): void;
  removePattern(patternId: string): void;
}

export interface LearningSystem {
  learn(learning: Learning): Promise<void>;
  getLearnings(filter?: LearningFilter): Promise<Learning[]>;
  suggest(context: any): Promise<Suggestion[]>;
}

export interface ASTAnalyzer {
  parse(code: string, language: string): Promise<AST>;
  analyze(ast: AST, patterns: RuntimePattern[]): Promise<AnalysisResult>;
}

// Additional runtime types
export interface Suggestion {
  label: string;
  detail?: string;
  documentation?: string;
  insertText?: string;
}

export interface LearningFilter {
  type?: string;
  source?: string;
  after?: Date;
  before?: Date;
}

export interface AST {
  type: string;
  [key: string]: any;
}

export interface AnalysisContext {
  filePath: string;
  language: string;
  workspaceRoot: string;
}

export interface AnalysisResult {
  patterns: PatternMatch[];
  interventions: Intervention[];
  learnings: Learning[];
}
