/**
 * Code Structure Review Domain - Public API
 *
 * This module provides comprehensive code structure analysis capabilities
 * for detecting issues in feature completeness, UI/UX quality, i18n, test coverage, and more.
 */

// Export all types
export * from './types';

// Export category system
export { AnalysisCategory } from './categories/base/AnalysisCategory';
export { CategoryRegistry, getCategoryRegistry } from './categories/base/CategoryRegistry';
export * from './categories/base/CategoryTypes';

// Export analysis engine
export { CategoryOrchestrator, type AnalysisEventListener } from './analysis/CategoryOrchestrator';
export { SourceFileParser, ASTTraversal } from './analysis/SourceFileParser';
export { ResultAggregator } from './analysis/ResultAggregator';
export {
  createAnalysisContext,
  filterFiles,
  getFilesByLanguage,
  getFilesByPattern,
  AnalysisContextUtils
} from './analysis/AnalysisContext';

// Export priority 1 categories
export { FeatureCompletenessAnalyzer } from './categories/priority1/FeatureCompletenessAnalyzer';
export { UIUXQualityAnalyzer } from './categories/priority1/UIUXQualityAnalyzer';
export { TestCoverageAnalyzer } from './categories/priority1/TestCoverageAnalyzer';

// Export priority 2 categories
export { InternationalizationAnalyzer } from './categories/priority2/InternationalizationAnalyzer';

// Export detectors
export {
  EndpointDetector,
  APICallDetector,
  MockDetector,
  ComponentDetector
} from './detectors/FeatureDetectors';
export {
  LoadingStateDetector,
  ErrorHandlingDetector,
  EmptyStateDetector,
  FormValidationDetector,
  UserFeedbackDetector,
  AccessibilityDetector
} from './detectors/UIUXDetectors';
export {
  HardcodedStringDetector,
  TranslationCoverageDetector,
  DateTimeFormatDetector,
  NumberFormatDetector,
  RTLSupportDetector
} from './detectors/I18nDetectors';

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
