/**
 * Session Management Types
 *
 * Pure data structures for Agent Brain session tracking.
 * Sessions represent user-prompted AI coding work from start to completion.
 *
 * Architecture: These types have ZERO dependencies - they are pure data contracts.
 */

/**
 * AI coding assistant type
 */
export type AgentType =
  | 'claude'    // Anthropic Claude (terminal or extension)
  | 'copilot'   // GitHub Copilot
  | 'cursor'    // Cursor AI
  | 'unknown';  // Other or unspecified

/**
 * Session lifecycle status
 */
export type SessionStatus =
  | 'active'      // Currently running, tracking activities
  | 'completed'   // Successfully finished
  | 'abandoned';  // User stopped without completion

/**
 * Activity type taxonomy
 */
export type ActivityType =
  | 'file-save'           // File was saved
  | 'file-delete'         // File was deleted
  | 'file-create'         // New file created
  | 'test-run'            // Test suite executed
  | 'test-pass'           // Test passed
  | 'test-fail'           // Test failed
  | 'terminal-command'    // Command executed in terminal
  | 'diagnostic-error'    // Error diagnostic appeared
  | 'diagnostic-warning'; // Warning diagnostic appeared

/**
 * Core session model
 * Represents one prompt-to-completion cycle of AI-assisted work
 */
export interface Session {
  /** Unique session identifier */
  id: string;

  /** User's original prompt (their intent in their words) */
  prompt: string;

  /** Which AI assistant is being used */
  agentType: AgentType;

  /** When session started */
  startTime: Date;

  /** When session ended (undefined if active) */
  endTime?: Date;

  /** Current lifecycle status */
  status: SessionStatus;

  /** All activities tracked during this session */
  activities: Activity[];
}

/**
 * Activity model
 * Represents a single action during a session
 */
export interface Activity {
  /** Unique activity identifier */
  id: string;

  /** Activity classification */
  type: ActivityType;

  /** When activity occurred */
  timestamp: Date;

  /** Type-specific metadata */
  metadata: ActivityMetadata;
}

/**
 * Base metadata for all activities
 * Specific activity types extend this with additional fields
 */
export interface ActivityMetadata {
  [key: string]: any;
}

/**
 * File save activity metadata
 */
export interface FileSaveMetadata extends ActivityMetadata {
  /** Relative path to file */
  filePath: string;

  /** Lines added (optional - requires git diff) */
  linesAdded?: number;

  /** Lines removed (optional - requires git diff) */
  linesRemoved?: number;

  /** File size in bytes (optional) */
  fileSize?: number;
}

/**
 * File delete activity metadata
 */
export interface FileDeleteMetadata extends ActivityMetadata {
  /** Relative path to deleted file */
  filePath: string;
}

/**
 * File create activity metadata
 */
export interface FileCreateMetadata extends ActivityMetadata {
  /** Relative path to new file */
  filePath: string;

  /** Initial file size (optional) */
  fileSize?: number;
}

/**
 * Test run activity metadata
 */
export interface TestRunMetadata extends ActivityMetadata {
  /** Test framework (jest, mocha, vitest, etc.) */
  framework: string;

  /** Total number of tests run */
  testCount: number;

  /** Number of passing tests */
  passed: number;

  /** Number of failing tests */
  failed: number;

  /** Test suite duration in milliseconds */
  duration: number;

  /** Test file or suite name (optional) */
  suiteName?: string;
}

/**
 * Terminal command activity metadata
 */
export interface TerminalCommandMetadata extends ActivityMetadata {
  /** Command that was executed */
  command: string;

  /** Working directory (optional) */
  cwd?: string;
}

/**
 * Diagnostic activity metadata
 */
export interface DiagnosticMetadata extends ActivityMetadata {
  /** File where diagnostic occurred */
  filePath: string;

  /** Line number */
  line: number;

  /** Diagnostic message */
  message: string;

  /** Diagnostic severity */
  severity: 'error' | 'warning' | 'info';

  /** Diagnostic source (e.g., 'typescript', 'eslint') */
  source?: string;
}

/**
 * Typed activity interfaces for type safety
 */
export interface FileSaveActivity extends Activity {
  type: 'file-save';
  metadata: FileSaveMetadata;
}

export interface FileDeleteActivity extends Activity {
  type: 'file-delete';
  metadata: FileDeleteMetadata;
}

export interface FileCreateActivity extends Activity {
  type: 'file-create';
  metadata: FileCreateMetadata;
}

export interface TestRunActivity extends Activity {
  type: 'test-run';
  metadata: TestRunMetadata;
}

export interface TerminalCommandActivity extends Activity {
  type: 'terminal-command';
  metadata: TerminalCommandMetadata;
}

export interface DiagnosticActivity extends Activity {
  type: 'diagnostic-error' | 'diagnostic-warning';
  metadata: DiagnosticMetadata;
}

/**
 * Session summary metrics
 * Aggregated statistics calculated from session activities
 */
export interface SessionSummary {
  /** Unique files modified during session */
  filesModified: Set<string>;

  /** Total lines added across all files */
  linesAdded: number;

  /** Total lines removed across all files */
  linesRemoved: number;

  /** Total tests run */
  testsRun: number;

  /** Total tests passed */
  testsPassed: number;

  /** Total tests failed */
  testsFailed: number;

  /** Session duration in milliseconds */
  duration: number;

  /** Total number of activities tracked */
  activityCount: number;

  /** Number of diagnostic errors */
  errorCount: number;

  /** Number of diagnostic warnings */
  warningCount: number;
}

/**
 * Type guard: Check if activity is file-save
 */
export function isFileSaveActivity(activity: Activity): activity is FileSaveActivity {
  return activity.type === 'file-save';
}

/**
 * Type guard: Check if activity is file-delete
 */
export function isFileDeleteActivity(activity: Activity): activity is FileDeleteActivity {
  return activity.type === 'file-delete';
}

/**
 * Type guard: Check if activity is test-run
 */
export function isTestRunActivity(activity: Activity): activity is TestRunActivity {
  return activity.type === 'test-run';
}

/**
 * Type guard: Check if activity is terminal-command
 */
export function isTerminalCommandActivity(activity: Activity): activity is TerminalCommandActivity {
  return activity.type === 'terminal-command';
}

/**
 * Type guard: Check if activity is diagnostic
 */
export function isDiagnosticActivity(activity: Activity): activity is DiagnosticActivity {
  return activity.type === 'diagnostic-error' || activity.type === 'diagnostic-warning';
}

/**
 * Helper: Create empty session summary
 */
export function createEmptySessionSummary(): SessionSummary {
  return {
    filesModified: new Set<string>(),
    linesAdded: 0,
    linesRemoved: 0,
    testsRun: 0,
    testsPassed: 0,
    testsFailed: 0,
    duration: 0,
    activityCount: 0,
    errorCount: 0,
    warningCount: 0
  };
}
