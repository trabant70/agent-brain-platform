/**
 * Agent Brain Core
 * Main entry point for the Agent Brain platform
 */

// Core engine exports
export * from './engine/agent-brain-core';

// API exports (runtime types and interfaces)
export * from './api/extension-api';
export * from './api/extension-loader';
export * from './api/types';

// Learning system exports (learning/training types and interfaces)
export {
  LearningSystem,
  createFileLearningSystem,
  createMemoryLearningSystem,
  LearningPattern,
  TestFailure,
  LearningMetrics,
  PatternConverter,
  LearningAnalyzer,
  LearningPropagator,
  LearningStorage,
  MemoryLearningStorage,
  FileLearningStorage
} from './learning';

// Pattern system exports
export * from './patterns';

// Default export for easy importing
export { AgentBrainCore as default } from './engine/agent-brain-core';