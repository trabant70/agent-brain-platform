/**
 * Registry Module Exports
 *
 * Exports all registry classes and their metadata types
 */

// Feature Completeness Registry
export {
  FeatureCompletenessRegistry,
  type EndpointMetadata,
  type APICallMetadata,
  type ComponentMetadata,
  type MockDataMetadata
} from './FeatureCompletenessRegistry';

// UI/UX Quality Registry
export {
  UIUXQualityRegistry,
  type AsyncOperationMetadata,
  type FormMetadata,
  type ListRenderingMetadata,
  type UserActionMetadata,
  type AccessibilityMetadata
} from './UIUXQualityRegistry';

// Test Coverage Registry
export {
  TestCoverageRegistry,
  type FileMetadata
} from './TestCoverageRegistry';

// Internationalization Registry
export {
  InternationalizationRegistry,
  type StringLiteralMetadata,
  type DateTimeOperationMetadata,
  type NumberFormatMetadata,
  type RTLIssueMetadata
} from './InternationalizationRegistry';

// Unified Metadata Registry
export {
  UnifiedMetadataRegistry
} from './UnifiedMetadataRegistry';
