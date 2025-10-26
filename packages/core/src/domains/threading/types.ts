/**
 * Threading System Types
 *
 * Core type definitions for the thread-aware debugging system.
 * Provides compile-time expectations, runtime tracking, and analysis types.
 */

/**
 * Thread Definition
 * Defines a logical execution thread for tracking purposes
 */
export interface ThreadDefinition {
  name: string;
  description: string;
  color: string;  // Hex color for visualization
  critical: boolean;  // Whether issues in this thread are critical
}

/**
 * Timing Expectations
 */
export interface TimingExpectation {
  min?: number;  // Minimum expected duration (ms)
  max?: number;  // Maximum expected duration (ms)
  budget?: number;  // Performance budget (ms)
}

/**
 * Memory Expectations
 */
export interface MemoryExpectation {
  max?: number;  // Maximum memory delta (bytes)
  allocation?: {
    max?: number;  // Max allocations allowed
    budget?: number;  // Allocation budget
  };
}

/**
 * Input/Output Shape
 */
export interface IOShape {
  type?: string;  // Type name (e.g., 'string', 'User', 'Promise<User[]>')
  shape?: string;  // Shape description (e.g., 'uuid', 'email', 'array[1-10]')
  validate?: (value: any) => boolean;  // Optional validator
}

/**
 * ThreadSpec Decorator Options
 * Zero runtime cost - metadata only
 */
export interface ThreadSpecOptions {
  threads: string[];  // Which threads this function participates in
  timing?: TimingExpectation;
  memory?: MemoryExpectation;
  input?: IOShape;
  output?: IOShape;
  tags?: string[];  // For categorization
  critical?: boolean;  // Override thread criticality
}

/**
 * Log Entry Base
 */
export interface BaseLogEntry {
  type: 'entry' | 'exit' | 'delta' | 'error';
  context: string;  // Function/method name with class
  threads: string[];
  timestamp: number;  // Unix timestamp (ms)
  session?: string;  // Session ID if in active session
}

/**
 * Function Entry Log
 */
export interface EntryLogEntry extends BaseLogEntry {
  type: 'entry';
  args: IOShape[];  // Captured argument shapes
  expectations?: ThreadSpecOptions;  // Reference to spec
}

/**
 * Function Exit Log
 */
export interface ExitLogEntry extends BaseLogEntry {
  type: 'exit';
  duration: number;  // Execution time (ms)
  result?: IOShape;  // Result shape
  memoryDelta?: number;  // Memory change (bytes)
}

/**
 * Delta Detection Log
 * Captures deviations from expectations
 */
export interface DeltaLogEntry extends BaseLogEntry {
  type: 'delta';
  subtype: 'timing' | 'memory' | 'io' | 'state';
  expected: string;  // Human-readable expectation
  actual: string;  // What actually happened
  deviation: 'slow' | 'fast' | 'large' | 'small' | 'unexpected';
  severity: 'info' | 'warning' | 'error' | 'critical';
  evidence?: any;  // Supporting data
}

/**
 * Error Log Entry
 */
export interface ErrorLogEntry extends BaseLogEntry {
  type: 'error';
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  context: string;
  threads: string[];
}

/**
 * Union of all log entry types
 */
export type LogEntry = EntryLogEntry | ExitLogEntry | DeltaLogEntry | ErrorLogEntry;

/**
 * Thread Configuration
 */
export interface ThreadConfig {
  version: string;
  enabled: boolean;
  mode: 'disabled' | 'development' | 'debugging' | 'learning';

  threads: {
    definitions: ThreadDefinition[];
    active: string[];  // Currently enabled thread names
    sampling: {
      default: number;  // 1 in N calls (100 = 1%)
      performance: number;  // For performance-sensitive threads
      error: number;  // For error paths (1 = always)
    };
  };

  logging: {
    path: string;  // Relative to workspace
    format: 'jsonl';
    buffer: {
      enabled: boolean;
      size: number;  // Buffer size before flush
      flushInterval: number;  // ms
    };
    rotation: {
      maxSize: string;  // e.g., "10MB"
      maxAge: string;  // e.g., "7d"
      compress: boolean;
    };
  };

  analysis: {
    enabled: boolean;
    mode: 'batch' | 'streaming' | 'realtime';
    interval: string;  // e.g., "5m"
    patterns: string[];  // Enabled pattern detectors
  };
}

/**
 * Thread Session
 * Named debugging session
 */
export interface ThreadSession {
  id: string;
  name: string;
  description?: string;
  startTime: number;
  endTime?: number;
  threads: string[];  // Active threads in this session
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * Pattern Detection Result
 */
export interface PatternResult {
  detected: boolean;
  confidence: number;  // 0-1
  evidence: any[];
  recommendation?: string;
  impact?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Trend Analysis
 */
export interface TrendAnalysis {
  slope: number;  // Rate of change
  r2: number;  // Coefficient of determination (fit quality)
  samples: number;
  prediction?: number;  // Predicted next value
}

/**
 * Analysis Report
 */
export interface AnalysisReport {
  session?: ThreadSession;
  timestamp: number;
  patterns: DetectedPattern[];
  insights: AnalysisInsight[];
  recommendations: Recommendation[];
  summary: string;
  metrics?: AnalysisMetrics;
}

/**
 * Detected Pattern
 */
export interface DetectedPattern {
  name: string;
  type: string;  // Pattern type ID
  confidence: number;
  description: string;
  evidence: any;
  impact: 'low' | 'medium' | 'high' | 'critical';
  affectedFunctions?: string[];
  trend?: TrendAnalysis;
}

/**
 * Analysis Insight
 */
export interface AnalysisInsight {
  title: string;
  description: string;
  category: 'performance' | 'error' | 'memory' | 'cache' | 'architecture';
  severity: 'info' | 'warning' | 'error' | 'critical';
  rootCause?: string;
  relatedPatterns: string[];  // Pattern names
}

/**
 * Recommendation
 */
export interface Recommendation {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  effort: 'trivial' | 'small' | 'medium' | 'large';
  impact: 'low' | 'medium' | 'high';
  steps?: string[];
  code?: {
    language: string;
    snippet: string;
  };
}

/**
 * Analysis Metrics
 */
export interface AnalysisMetrics {
  totalEntries: number;
  deltaCount: number;
  errorCount: number;
  functionsAnalyzed: number;
  timeRange: {
    start: number;
    end: number;
    duration: number;
  };
  before?: Record<string, number>;
  after?: Record<string, number>;
  improvement?: string;
}

/**
 * Timeline Data
 * For visualization
 */
export interface TimelineData {
  threads: ThreadLane[];
  deltas: DeltaMarker[];
  intersections: ThreadIntersection[];
  timeRange: {
    start: number;
    end: number;
  };
}

/**
 * Thread Lane (Swim Lane)
 */
export interface ThreadLane {
  thread: ThreadDefinition;
  executions: Execution[];
}

/**
 * Execution Block
 */
export interface Execution {
  context: string;  // Function name
  start: number;
  end: number;
  duration: number;
  hasDeltas: boolean;
  status: 'success' | 'warning' | 'error';
}

/**
 * Delta Marker for Timeline
 */
export interface DeltaMarker {
  timestamp: number;
  thread: string;
  type: DeltaLogEntry['subtype'];
  severity: DeltaLogEntry['severity'];
  context: string;
  tooltip: string;
}

/**
 * Thread Intersection
 * Where two threads meet (function participates in multiple threads)
 */
export interface ThreadIntersection {
  threads: string[];
  timestamp: number;
  context: string;
  duration: number;
}

/**
 * Bottleneck Data
 */
export interface BottleneckData {
  function: string;
  threads: string[];
  metrics: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
    max: number;
  };
  calls: number;
  trend?: 'improving' | 'stable' | 'degrading';
}
