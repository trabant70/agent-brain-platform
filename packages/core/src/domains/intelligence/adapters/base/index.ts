/**
 * Base Adapter Exports
 */

export * from './IntelligenceAdapter';
// Export all RuntimeTypes except Analyzer (conflicts with ExtensionAPI) and LearningSystem (conflicts with core class)
export type {
  RuntimePattern,
  PatternMatch,
  Location,
  Intervention,
  Action,
  Learning,
  Intent,
  InterventionStrategy,
  Command,
  Configuration,
  Logger,
  PatternMatcher,
  ASTAnalyzer,
  Suggestion,
  LearningFilter,
  AST,
  AnalysisContext,
  AnalysisResult
} from './RuntimeTypes';
