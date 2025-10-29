/**
 * Streaming Infrastructure Exports
 *
 * Core streaming components for memory-efficient code analysis:
 * - UnifiedMetadataExtractor: Single-pass metadata extraction from ASTs
 * - StreamingFileProcessor: Sequential file processing with UI yielding
 * - ProgressEventEmitter: Real-time progress events and tracking
 */

// Metadata Extractor
export { UnifiedMetadataExtractor } from './UnifiedMetadataExtractor';

// File Processor
export {
  StreamingFileProcessor,
  type StreamingOptions
} from './StreamingFileProcessor';

// Progress System
export {
  ProgressEventEmitter,
  ProgressEventLogger,
  formatProgressEvent,
  type ProgressEvent,
  type ProgressPhase
} from './ProgressEventEmitter';
