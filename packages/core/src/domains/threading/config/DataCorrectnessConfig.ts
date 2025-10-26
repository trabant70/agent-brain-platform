/**
 * DataCorrectnessConfig
 *
 * Configuration for data correctness monitoring:
 * - Enable/disable monitoring
 * - Capture modes (full, sampled, disabled)
 * - Privacy settings
 * - Visualization preferences
 * - Analysis preferences
 */

/**
 * Capture mode
 */
export type CaptureMode = 'full' | 'sampled' | 'disabled';

/**
 * Report format
 */
export type ReportFormat = 'text' | 'markdown' | 'html';

/**
 * Detail level
 */
export type DetailLevel = 'minimal' | 'standard' | 'verbose';

/**
 * Privacy settings
 */
export interface PrivacySettings {
  /**
   * Enable privacy redaction
   */
  enabled: boolean;

  /**
   * Patterns to redact (field names)
   */
  redactionPatterns: RegExp[];

  /**
   * Maximum string length before truncation
   */
  maxStringLength: number;

  /**
   * Maximum array length before truncation
   */
  maxArrayLength: number;

  /**
   * Maximum object depth
   */
  maxDepth: number;

  /**
   * Redact URLs
   */
  redactUrls: boolean;

  /**
   * Redact email addresses
   */
  redactEmails: boolean;
}

/**
 * Capture settings
 */
export interface CaptureSettings {
  /**
   * Capture mode
   */
  mode: CaptureMode;

  /**
   * Sampling rate (0-1) when mode is 'sampled'
   */
  samplingRate: number;

  /**
   * Capture arguments
   */
  captureArgs: boolean;

  /**
   * Capture return values
   */
  captureReturnValues: boolean;

  /**
   * Capture mutations
   */
  captureMutations: boolean;

  /**
   * Capture transformations
   */
  captureTransformations: boolean;

  /**
   * Capture context (this)
   */
  captureContext: boolean;
}

/**
 * Validation settings
 */
export interface ValidationSettings {
  /**
   * Enable contract validation
   */
  enabled: boolean;

  /**
   * Fail on violations
   */
  failOnViolations: boolean;

  /**
   * Minimum severity to fail on
   */
  failOnSeverity: 'info' | 'warning' | 'error' | 'critical';

  /**
   * Validate inputs
   */
  validateInputs: boolean;

  /**
   * Validate outputs
   */
  validateOutputs: boolean;

  /**
   * Check preconditions
   */
  checkPreconditions: boolean;

  /**
   * Check postconditions
   */
  checkPostconditions: boolean;

  /**
   * Check invariants
   */
  checkInvariants: boolean;

  /**
   * Allow extra fields in objects
   */
  allowExtraFields: boolean;
}

/**
 * Visualization settings
 */
export interface VisualizationSettings {
  /**
   * Default report format
   */
  defaultFormat: ReportFormat;

  /**
   * Detail level
   */
  detailLevel: DetailLevel;

  /**
   * Show types in comparisons
   */
  showTypes: boolean;

  /**
   * Show sizes
   */
  showSizes: boolean;

  /**
   * Enable colorization (for text output)
   */
  colorize: boolean;

  /**
   * Generate Mermaid diagrams
   */
  generateDiagrams: boolean;

  /**
   * Include data flow visualization
   */
  includeDataFlow: boolean;

  /**
   * Include timeline
   */
  includeTimeline: boolean;
}

/**
 * Analysis settings
 */
export interface AnalysisSettings {
  /**
   * Auto-suggest fixes
   */
  autoSuggestFixes: boolean;

  /**
   * Generate debug reports
   */
  generateDebugReports: boolean;

  /**
   * Include code examples
   */
  includeCodeExamples: boolean;

  /**
   * Extract learnings
   */
  extractLearnings: boolean;

  /**
   * Provide next steps
   */
  provideNextSteps: boolean;

  /**
   * Generate agent messages
   */
  generateAgentMessages: boolean;
}

/**
 * Logging settings
 */
export interface LoggingSettings {
  /**
   * Enable JSONL logging
   */
  enabled: boolean;

  /**
   * Log file path (undefined = auto-generate)
   */
  logFilePath?: string;

  /**
   * Log execution traces
   */
  logExecutionTraces: boolean;

  /**
   * Log violations
   */
  logViolations: boolean;

  /**
   * Log debug reports
   */
  logDebugReports: boolean;

  /**
   * Flush interval (ms)
   */
  flushInterval: number;
}

/**
 * Data correctness configuration
 */
export interface DataCorrectnessConfig {
  /**
   * Enable data correctness monitoring
   */
  enabled: boolean;

  /**
   * Privacy settings
   */
  privacy: PrivacySettings;

  /**
   * Capture settings
   */
  capture: CaptureSettings;

  /**
   * Validation settings
   */
  validation: ValidationSettings;

  /**
   * Visualization settings
   */
  visualization: VisualizationSettings;

  /**
   * Analysis settings
   */
  analysis: AnalysisSettings;

  /**
   * Logging settings
   */
  logging: LoggingSettings;
}

/**
 * Default privacy settings
 */
export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  enabled: true,
  redactionPatterns: [
    /^(password|passwd|pwd|pass)$/i,
    /^(token|apikey|api_key|secret|key)$/i,
    /^(auth|authorization)$/i,
    /^(ssn|social_security)$/i,
    /^(credit_card|creditcard|cc)$/i
  ],
  maxStringLength: 1000,
  maxArrayLength: 100,
  maxDepth: 10,
  redactUrls: false,
  redactEmails: false
};

/**
 * Default capture settings
 */
export const DEFAULT_CAPTURE_SETTINGS: CaptureSettings = {
  mode: 'full',
  samplingRate: 0.1,
  captureArgs: true,
  captureReturnValues: true,
  captureMutations: true,
  captureTransformations: true,
  captureContext: false
};

/**
 * Default validation settings
 */
export const DEFAULT_VALIDATION_SETTINGS: ValidationSettings = {
  enabled: true,
  failOnViolations: false,
  failOnSeverity: 'error',
  validateInputs: true,
  validateOutputs: true,
  checkPreconditions: true,
  checkPostconditions: true,
  checkInvariants: true,
  allowExtraFields: false
};

/**
 * Default visualization settings
 */
export const DEFAULT_VISUALIZATION_SETTINGS: VisualizationSettings = {
  defaultFormat: 'markdown',
  detailLevel: 'standard',
  showTypes: true,
  showSizes: false,
  colorize: false,
  generateDiagrams: true,
  includeDataFlow: true,
  includeTimeline: true
};

/**
 * Default analysis settings
 */
export const DEFAULT_ANALYSIS_SETTINGS: AnalysisSettings = {
  autoSuggestFixes: true,
  generateDebugReports: true,
  includeCodeExamples: true,
  extractLearnings: true,
  provideNextSteps: true,
  generateAgentMessages: true
};

/**
 * Default logging settings
 */
export const DEFAULT_LOGGING_SETTINGS: LoggingSettings = {
  enabled: true,
  logExecutionTraces: true,
  logViolations: true,
  logDebugReports: false,
  flushInterval: 5000
};

/**
 * Default configuration
 */
export const DEFAULT_DATA_CORRECTNESS_CONFIG: DataCorrectnessConfig = {
  enabled: true,
  privacy: DEFAULT_PRIVACY_SETTINGS,
  capture: DEFAULT_CAPTURE_SETTINGS,
  validation: DEFAULT_VALIDATION_SETTINGS,
  visualization: DEFAULT_VISUALIZATION_SETTINGS,
  analysis: DEFAULT_ANALYSIS_SETTINGS,
  logging: DEFAULT_LOGGING_SETTINGS
};

/**
 * Global data correctness configuration
 */
let globalDataCorrectnessConfig: DataCorrectnessConfig = DEFAULT_DATA_CORRECTNESS_CONFIG;

/**
 * Get global data correctness configuration
 */
export function getGlobalDataCorrectnessConfig(): DataCorrectnessConfig {
  return globalDataCorrectnessConfig;
}

/**
 * Set global data correctness configuration
 */
export function setGlobalDataCorrectnessConfig(config: Partial<DataCorrectnessConfig>): void {
  globalDataCorrectnessConfig = {
    ...globalDataCorrectnessConfig,
    ...config,
    privacy: { ...globalDataCorrectnessConfig.privacy, ...config.privacy },
    capture: { ...globalDataCorrectnessConfig.capture, ...config.capture },
    validation: { ...globalDataCorrectnessConfig.validation, ...config.validation },
    visualization: { ...globalDataCorrectnessConfig.visualization, ...config.visualization },
    analysis: { ...globalDataCorrectnessConfig.analysis, ...config.analysis },
    logging: { ...globalDataCorrectnessConfig.logging, ...config.logging }
  };
}

/**
 * Reset configuration to defaults
 */
export function resetDataCorrectnessConfig(): void {
  globalDataCorrectnessConfig = DEFAULT_DATA_CORRECTNESS_CONFIG;
}

/**
 * Create custom configuration
 */
export function createDataCorrectnessConfig(config: Partial<DataCorrectnessConfig>): DataCorrectnessConfig {
  return {
    enabled: config.enabled ?? DEFAULT_DATA_CORRECTNESS_CONFIG.enabled,
    privacy: { ...DEFAULT_PRIVACY_SETTINGS, ...config.privacy },
    capture: { ...DEFAULT_CAPTURE_SETTINGS, ...config.capture },
    validation: { ...DEFAULT_VALIDATION_SETTINGS, ...config.validation },
    visualization: { ...DEFAULT_VISUALIZATION_SETTINGS, ...config.visualization },
    analysis: { ...DEFAULT_ANALYSIS_SETTINGS, ...config.analysis },
    logging: { ...DEFAULT_LOGGING_SETTINGS, ...config.logging }
  };
}

/**
 * Preset configurations
 */

/**
 * Development mode - verbose, all features enabled
 */
export const DEVELOPMENT_CONFIG: DataCorrectnessConfig = createDataCorrectnessConfig({
  enabled: true,
  capture: { ...DEFAULT_CAPTURE_SETTINGS, mode: 'full' },
  validation: { ...DEFAULT_VALIDATION_SETTINGS, failOnViolations: false },
  visualization: { ...DEFAULT_VISUALIZATION_SETTINGS, detailLevel: 'verbose' },
  analysis: { ...DEFAULT_ANALYSIS_SETTINGS },
  logging: { ...DEFAULT_LOGGING_SETTINGS, logDebugReports: true }
});

/**
 * Production mode - minimal, sampled
 */
export const PRODUCTION_CONFIG: DataCorrectnessConfig = createDataCorrectnessConfig({
  enabled: true,
  capture: { ...DEFAULT_CAPTURE_SETTINGS, mode: 'sampled', samplingRate: 0.01 },
  validation: { ...DEFAULT_VALIDATION_SETTINGS, failOnViolations: false },
  visualization: { ...DEFAULT_VISUALIZATION_SETTINGS, detailLevel: 'minimal' },
  analysis: { ...DEFAULT_ANALYSIS_SETTINGS, autoSuggestFixes: false, includeCodeExamples: false },
  logging: { ...DEFAULT_LOGGING_SETTINGS, logDebugReports: false }
});

/**
 * Testing mode - strict validation, fail on violations
 */
export const TESTING_CONFIG: DataCorrectnessConfig = createDataCorrectnessConfig({
  enabled: true,
  capture: { ...DEFAULT_CAPTURE_SETTINGS, mode: 'full' },
  validation: { ...DEFAULT_VALIDATION_SETTINGS, failOnViolations: true, failOnSeverity: 'warning' },
  visualization: { ...DEFAULT_VISUALIZATION_SETTINGS, detailLevel: 'verbose' },
  analysis: { ...DEFAULT_ANALYSIS_SETTINGS },
  logging: { ...DEFAULT_LOGGING_SETTINGS, logDebugReports: true }
});

/**
 * Disabled mode - no monitoring
 */
export const DISABLED_CONFIG: DataCorrectnessConfig = createDataCorrectnessConfig({
  enabled: false,
  capture: { ...DEFAULT_CAPTURE_SETTINGS, mode: 'disabled' },
  validation: { ...DEFAULT_VALIDATION_SETTINGS, enabled: false },
  analysis: { ...DEFAULT_ANALYSIS_SETTINGS, autoSuggestFixes: false },
  logging: { ...DEFAULT_LOGGING_SETTINGS, enabled: false }
});
