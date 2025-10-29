/**
 * Streaming Analyzers Exports
 *
 * New streaming architecture analyzers that work with metadata registries
 * instead of AST caching. Memory-efficient and scalable.
 */

// Feature Completeness
export {
  FeatureCompletenessAnalyzerStreaming,
  type FeatureCompletenessAnalysis,
  type FeatureCompletenessIssue
} from './FeatureCompletenessAnalyzer.streaming';

// UI/UX Quality
export {
  UIUXQualityAnalyzerStreaming,
  type UIUXQualityAnalysis,
  type UIUXQualityIssue
} from './UIUXQualityAnalyzer.streaming';

// Test Coverage
export {
  TestCoverageAnalyzerStreaming,
  type TestCoverageAnalysis,
  type TestCoverageIssue
} from './TestCoverageAnalyzer.streaming';

// Internationalization
export {
  InternationalizationAnalyzerStreaming,
  type I18nAnalysis,
  type I18nIssue
} from './InternationalizationAnalyzer.streaming';
