/**
 * Code Structure Review Domain - Public API
 *
 * Streaming architecture for memory-efficient code structure analysis.
 * Supports analysis of 10,000+ files without memory issues or UI freezing.
 */

// Export all types
export * from './types';

// Export streaming orchestration
export {
  StreamingOrchestrator,
  type StreamingAnalysisOptions,
  type StreamingAnalysisResult
} from './orchestration';

// Export streaming infrastructure
export {
  StreamingFileProcessor,
  type StreamingOptions,
  ProgressEventEmitter,
  ProgressEventLogger,
  formatProgressEvent,
  type ProgressEvent,
  type ProgressPhase,
  UnifiedMetadataExtractor
} from './streaming';

// Export registries
export {
  FeatureCompletenessRegistry,
  type EndpointMetadata,
  type APICallMetadata,
  type ComponentMetadata,
  type MockDataMetadata,
  UIUXQualityRegistry,
  type AsyncOperationMetadata,
  type FormMetadata,
  type ListRenderingMetadata,
  type UserActionMetadata,
  type AccessibilityMetadata,
  TestCoverageRegistry,
  type FileMetadata,
  InternationalizationRegistry,
  type StringLiteralMetadata,
  type DateTimeOperationMetadata,
  type NumberFormatMetadata,
  type RTLIssueMetadata,
  UnifiedMetadataRegistry
} from './registries';

// Export streaming analyzers
export {
  FeatureCompletenessAnalyzerStreaming,
  type FeatureCompletenessAnalysis,
  type FeatureCompletenessIssue,
  UIUXQualityAnalyzerStreaming,
  type UIUXQualityAnalysis,
  type UIUXQualityIssue,
  TestCoverageAnalyzerStreaming,
  type TestCoverageAnalysis,
  type TestCoverageIssue,
  InternationalizationAnalyzerStreaming,
  type I18nAnalysis,
  type I18nIssue
} from './analyzers';

// Export AI integration
export { PromptGenerator } from './ai/PromptGenerator';
export { PromptTemplateStore } from './ai/PromptTemplateStore';
export { ThreadingIntegration } from './ai/ThreadingIntegration';
export {
  PROMPT_TEMPLATES,
  getPromptTemplate,
  getCategoryTemplates,
  getMaturityLevelTemplates
} from './ai/PromptTemplates';

// Export reporting
export { ReportGenerator } from './reporting/ReportGenerator';
export { VisualizationDataBuilder } from './reporting/VisualizationDataBuilder';
export { KnowledgeItemGenerator } from './reporting/KnowledgeItemGenerator';

// Export data builders
export * from './data-builders';
