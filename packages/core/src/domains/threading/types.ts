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

/**
 * ═══════════════════════════════════════════════════════════════════════
 * MULTI-TIER THREADING SYSTEM TYPES
 * ═══════════════════════════════════════════════════════════════════════
 */

/**
 * Maturity Level Enum
 * Progressive threading adoption levels
 */
export enum MaturityLevel {
  OBSERVATION = 0,    // No code changes - observe existing logs
  SEMANTIC = 1,       // [THREAD:X] prefixes in logs
  ANNOTATION = 2,     // JSDoc @thread annotations
  CONDITIONAL = 3,    // ThreadContext API
  DECORATOR = 4       // Full @ThreadSpec/@ThreadLog decorators
}

/**
 * Implementation Indicator
 * Evidence of a specific maturity level in the codebase
 */
export interface ImplementationIndicator {
  level: MaturityLevel;
  filesWithPattern: string[];
  totalOccurrences: number;
  coverage: number;          // 0-1 percentage
  confidence: number;        // 0-1 confidence score
  examples: CodeExample[];
}

/**
 * Code Example
 * Sample code found during detection
 */
export interface CodeExample {
  filePath: string;
  lineNumber: number;
  code: string;
  context?: string;
}

/**
 * Detection Result
 * Result of maturity level detection
 */
export interface DetectionResult {
  detectedLevel: MaturityLevel;
  configuredLevel?: MaturityLevel;
  coverage: CoverageReport;
  inconsistencies: Inconsistency[];
  recommendations: LevelRecommendation[];
  timestamp: number;
}

/**
 * Coverage Report
 * Coverage statistics per level
 */
export interface CoverageReport {
  overall: number;              // 0-1 overall coverage
  byLevel: {
    [MaturityLevel.OBSERVATION]?: number;
    [MaturityLevel.SEMANTIC]?: number;
    [MaturityLevel.ANNOTATION]?: number;
    [MaturityLevel.CONDITIONAL]?: number;
    [MaturityLevel.DECORATOR]?: number;
  };
  byFile: Map<string, FileCoverage>;
  totalFiles: number;
  filesWithThreading: number;
}

/**
 * File Coverage
 * Threading coverage for a single file
 */
export interface FileCoverage {
  filePath: string;
  level: MaturityLevel;
  coverage: number;            // 0-1
  patterns: string[];          // What patterns were found
  linesWithThreading: number;
  totalLines: number;
}

/**
 * Inconsistency
 * Mixed level implementations that should be standardized
 */
export interface Inconsistency {
  type: 'mixed_levels' | 'incomplete_implementation' | 'format_variation';
  description: string;
  severity: 'low' | 'medium' | 'high';
  files: string[];
  suggestion: string;
}

/**
 * Level Recommendation
 * Suggested actions for improving threading maturity
 */
export interface LevelRecommendation {
  action: 'upgrade' | 'standardize' | 'complete' | 'downgrade';
  fromLevel: MaturityLevel;
  toLevel: MaturityLevel;
  reason: string;
  benefits: string[];
  effort: 'trivial' | 'small' | 'medium' | 'large';
  priority: 'low' | 'medium' | 'high';
}

/**
 * Parse Result
 * Result from flexible parsing of logs/code
 */
export interface ParseResult {
  threads: string[];
  confidence: number;
  format: 'strict' | 'flexible' | 'inferred';
  variations: ThreadVariation[];
  normalized: Map<string, string>;  // original -> normalized
}

/**
 * Thread Variation
 * Different ways threads are referenced in code
 */
export interface ThreadVariation {
  original: string;
  normalized: string;
  occurrences: number;
  locations: CodeExample[];
}

/**
 * Migration Result
 * Result of level migration operation
 */
export interface MigrationResult {
  success: boolean;
  fromLevel: MaturityLevel;
  toLevel: MaturityLevel;
  filesModified: string[];
  backup?: BackupInfo;
  errors: MigrationError[];
  warnings: string[];
  duration: number;
}

/**
 * Backup Info
 * Information about migration backup
 */
export interface BackupInfo {
  path: string;
  timestamp: number;
  files: string[];
  size: number;
}

/**
 * Migration Error
 * Error during migration
 */
export interface MigrationError {
  file: string;
  message: string;
  stack?: string;
  recoverable: boolean;
}

/**
 * Health Report
 * Overall system health assessment
 */
export interface HealthReport {
  timestamp: number;
  configuredLevel: MaturityLevel;
  detectedLevel: MaturityLevel;
  coverage: CoverageReport;
  consistency: ConsistencyReport;
  issues: HealthIssue[];
  recommendations: LevelRecommendation[];
  trend: 'improving' | 'stable' | 'degrading';
  score: number;  // 0-100 health score
}

/**
 * Consistency Report
 * How consistent the threading implementation is
 */
export interface ConsistencyReport {
  overallScore: number;  // 0-1
  byFile: Map<string, FileConsistency>;
  issues: ConsistencyIssue[];
}

/**
 * File Consistency
 * Consistency within a single file
 */
export interface FileConsistency {
  filePath: string;
  score: number;  // 0-1
  dominantLevel: MaturityLevel;
  mixedLevels: MaturityLevel[];
  threadNameConsistency: number;  // 0-1
  formatConsistency: number;  // 0-1
}

/**
 * Consistency Issue
 * Specific inconsistency found
 */
export interface ConsistencyIssue {
  type: 'naming' | 'format' | 'level' | 'coverage';
  description: string;
  files: string[];
  impact: 'low' | 'medium' | 'high';
  fix?: string;
}

/**
 * Health Issue
 * Problem detected in health check
 */
export interface HealthIssue {
  category: 'coverage' | 'consistency' | 'performance' | 'error';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  details?: any;
  fix?: string;
}

/**
 * Agent Instructions
 * Instructions for coding agents
 */
export interface AgentInstructions {
  version: string;
  level: MaturityLevel;
  timestamp: string;
  summary: string;
  pattern: string;
  example: string;
  full: string;
  validation: string;
  fallbacks: string[];
  examples: string[];
}

/**
 * Level Template
 * Template for implementing a specific level
 */
export interface LevelTemplate {
  id: string;
  name: string;
  level: MaturityLevel;
  instructions: string;
  examples: CodeExample[];
  validationRules: ValidationRules;
  fallbackInstructions: string;
}

/**
 * Validation Rules
 * Rules for validating level implementation
 */
export interface ValidationRules {
  required: string[];
  optional: string[];
  ignored: string[];
  minimumCoverage?: number;
}

/**
 * ═══════════════════════════════════════════════════════════════════════
 * DATA CORRECTNESS EXTENSION TYPES
 * ═══════════════════════════════════════════════════════════════════════
 */

/**
 * Value Snapshot
 * Captured state of a value at a point in time
 */
export interface ValueSnapshot {
  value: any;                    // Actual value (may be redacted/truncated)
  type: TypeCapture;              // Type information
  shape?: ShapeCapture;           // Shape information (for objects/arrays)
  preview?: string;               // Human-readable preview
  size?: number;                  // Size in bytes (approximate)
  timestamp: number;              // When captured
  redacted?: boolean;             // Whether value was redacted for privacy
  truncated?: boolean;            // Whether value was truncated
}

/**
 * Type Capture
 * Captured type information
 */
export interface TypeCapture {
  primitive: string;              // typeof result
  constructor?: string;           // Constructor name
  custom?: string;                // Custom type name
  isArray: boolean;
  isPromise: boolean;
  isNull: boolean;
  isUndefined: boolean;
}

/**
 * Shape Capture
 * Captured shape information for objects/arrays
 */
export interface ShapeCapture {
  keys?: string[];                // Object keys
  depth: number;                  // Nesting depth
  arrayLength?: number;           // Array length
  itemType?: string;              // Array item type (if consistent)
  structure?: Record<string, any>; // Nested structure (depth-limited)
}

/**
 * Entry Point
 * Function entry information for tracking
 */
export interface EntryPoint {
  args: any[];
  thisContext: any;
  timestamp: number;
  threads: string[];
  metadata?: Record<string, any>;
}

/**
 * Exit Point
 * Function exit information for tracking
 */
export interface ExitPoint {
  result: any;
  timestamp: number;
  mutations?: Mutation[];
  metadata?: Record<string, any>;
}

/**
 * Entry Capture
 * Captured entry state
 */
export interface EntryCapture {
  args: ValueSnapshot[];
  thisContext?: ValueSnapshot;
  timestamp: number;
  threads: string[];
  metadata?: Record<string, any>;
}

/**
 * Exit Capture
 * Captured exit state
 */
export interface ExitCapture {
  result: ValueSnapshot;
  timestamp: number;
  duration: number;
  mutations: Mutation[];
  metadata?: Record<string, any>;
}

/**
 * Transformation
 * Captured data transformation
 */
export interface Transformation {
  from: string;                   // Source path (e.g., 'args[0].userId')
  to: string;                     // Destination path (e.g., 'result.id')
  timestamp: number;
  beforeValue: ValueSnapshot;
  afterValue: ValueSnapshot;
  transformType?: string;         // Type of transformation (map, filter, etc.)
  metadata?: Record<string, any>;
}

/**
 * Mutation
 * Captured mutation to context/state
 */
export interface Mutation {
  path: string;                   // Path to mutated value
  timestamp: number;
  beforeValue: ValueSnapshot;
  afterValue: ValueSnapshot;
  mutationType: 'set' | 'delete' | 'push' | 'splice' | 'other';
  metadata?: Record<string, any>;
}

/**
 * Contract Violation
 * Violation of data contract
 */
export interface ContractViolation {
  type: 'input' | 'output' | 'precondition' | 'postcondition' | 'invariant';
  paramName?: string;
  expected: string;               // Human-readable expectation
  actual: string;                 // What was actually encountered
  value?: ValueSnapshot;
  message: string;
  path?: string;                  // Path to violating value
  severity: 'info' | 'warning' | 'error' | 'critical';
  agentMessage?: string;          // Agent-friendly explanation
}

/**
 * Execution Trace
 * Complete trace of function execution
 */
export interface ExecutionTrace {
  executionId: string;
  context: string;                // Function context
  entry: EntryCapture;
  exit?: ExitCapture;
  error?: ErrorCapture;
  transformations: Transformation[];
  mutations: Mutation[];
  violations: ContractViolation[];
  dataFlow?: DataFlowDiagram;
  metadata?: Record<string, any>;
}

/**
 * Error Capture
 * Captured error state
 */
export interface ErrorCapture {
  error: Error;
  state: ValueSnapshot;           // Context state at error
  timestamp: number;
  stackTrace?: string;
}

/**
 * Data Flow Diagram
 * Visual representation of data flow through function
 */
export interface DataFlowDiagram {
  nodes: DataFlowNode[];
  edges: DataFlowEdge[];
}

/**
 * Data Flow Node
 * Node in data flow diagram
 */
export interface DataFlowNode {
  id: string;
  label: string;
  type: 'input' | 'output' | 'transformation' | 'validation' | 'mutation';
  value?: ValueSnapshot;
  timestamp?: number;
}

/**
 * Data Flow Edge
 * Edge in data flow diagram
 */
export interface DataFlowEdge {
  from: string;                   // Node ID
  to: string;                     // Node ID
  label?: string;
  transformationType?: string;
}
