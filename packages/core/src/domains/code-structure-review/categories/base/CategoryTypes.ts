/**
 * Category-specific type definitions
 */

import type {
  CategoryConfig,
  CategoryAnalysis,
  AnalysisContext,
  Issue,
  Recommendation,
  CategoryThresholds
} from '../../types';

/**
 * Base interface that all category analyzers must implement
 */
export interface ICategoryAnalyzer {
  /**
   * Unique identifier for this category
   */
  readonly id: string;

  /**
   * Human-readable name
   */
  readonly name: string;

  /**
   * Category configuration
   */
  readonly config: CategoryConfig;

  /**
   * Run analysis on the provided context
   */
  analyze(context: AnalysisContext): Promise<CategoryAnalysis>;

  /**
   * Calculate score based on issues found
   */
  calculateScore(issues: Issue[]): number;

  /**
   * Generate recommendations based on issues
   */
  generateRecommendations(issues: Issue[]): Recommendation[];

  /**
   * Determine status based on score
   */
  determineStatus(score: number): 'excellent' | 'good' | 'warning' | 'critical';
}

/**
 * Detector interface for specific issue detection
 */
export interface IDetector<TResult = any> {
  /**
   * Unique identifier for this detector
   */
  readonly id: string;

  /**
   * Detect issues in the provided context
   */
  detect(context: AnalysisContext): Promise<TResult>;
}

/**
 * Category priority levels
 */
export enum CategoryPriority {
  CRITICAL = 1,  // Feature completeness, UI/UX, Test coverage
  HIGH = 2,      // i18n, State management, Error handling
  MEDIUM = 3,    // Security, Performance, Accessibility
  LOW = 4        // Documentation, Code style
}

/**
 * Default thresholds for scoring
 */
export const DEFAULT_THRESHOLDS: CategoryThresholds = {
  excellent: 90,
  good: 70,
  warning: 50,
  critical: 0
};

/**
 * Severity weights for score calculation
 */
export const SEVERITY_WEIGHTS = {
  critical: 10,
  high: 5,
  medium: 2,
  low: 1
} as const;

/**
 * Category metadata for UI display
 */
export interface CategoryMetadata {
  id: string;
  name: string;
  icon: string;
  description: string;
  priority: CategoryPriority;
  color: string;
  keywords: string[];
}

/**
 * Built-in category IDs
 */
export const CATEGORY_IDS = {
  FEATURE_COMPLETENESS: 'feature-completeness',
  UI_UX_QUALITY: 'ui-ux-quality',
  TEST_COVERAGE: 'test-coverage',
  INTERNATIONALIZATION: 'internationalization',
  STATE_MANAGEMENT: 'state-management',
  ERROR_HANDLING: 'error-handling',
  SECURITY: 'security',
  PERFORMANCE: 'performance',
  ACCESSIBILITY: 'accessibility'
} as const;

/**
 * Category metadata registry
 */
export const CATEGORY_METADATA: Record<string, CategoryMetadata> = {
  [CATEGORY_IDS.FEATURE_COMPLETENESS]: {
    id: CATEGORY_IDS.FEATURE_COMPLETENESS,
    name: 'Feature Completeness',
    icon: '🔌',
    description: 'Detects disconnected backend/frontend code and incomplete features',
    priority: CategoryPriority.CRITICAL,
    color: '#4CAF50',
    keywords: ['api', 'endpoint', 'component', 'mock', 'incomplete']
  },
  [CATEGORY_IDS.UI_UX_QUALITY]: {
    id: CATEGORY_IDS.UI_UX_QUALITY,
    name: 'UI/UX Quality',
    icon: '✨',
    description: 'Checks loading states, error handling, empty states, and user feedback',
    priority: CategoryPriority.CRITICAL,
    color: '#2196F3',
    keywords: ['loading', 'error', 'empty-state', 'validation', 'feedback']
  },
  [CATEGORY_IDS.TEST_COVERAGE]: {
    id: CATEGORY_IDS.TEST_COVERAGE,
    name: 'Test Coverage',
    icon: '🧪',
    description: 'Analyzes test coverage and identifies untested code',
    priority: CategoryPriority.CRITICAL,
    color: '#9C27B0',
    keywords: ['test', 'coverage', 'untested', 'quality']
  },
  [CATEGORY_IDS.INTERNATIONALIZATION]: {
    id: CATEGORY_IDS.INTERNATIONALIZATION,
    name: 'Internationalization',
    icon: '🌍',
    description: 'Finds hardcoded strings and missing translations',
    priority: CategoryPriority.HIGH,
    color: '#FF9800',
    keywords: ['i18n', 'translation', 'locale', 'hardcoded', 'string']
  },
  [CATEGORY_IDS.STATE_MANAGEMENT]: {
    id: CATEGORY_IDS.STATE_MANAGEMENT,
    name: 'State Management',
    icon: '🗄️',
    description: 'Analyzes state management patterns and consistency',
    priority: CategoryPriority.HIGH,
    color: '#00BCD4',
    keywords: ['state', 'redux', 'context', 'store']
  },
  [CATEGORY_IDS.ERROR_HANDLING]: {
    id: CATEGORY_IDS.ERROR_HANDLING,
    name: 'Error Handling',
    icon: '⚠️',
    description: 'Checks error handling patterns and coverage',
    priority: CategoryPriority.HIGH,
    color: '#F44336',
    keywords: ['error', 'exception', 'try-catch', 'boundary']
  },
  [CATEGORY_IDS.SECURITY]: {
    id: CATEGORY_IDS.SECURITY,
    name: 'Security',
    icon: '🔒',
    description: 'Identifies potential security vulnerabilities',
    priority: CategoryPriority.MEDIUM,
    color: '#E91E63',
    keywords: ['security', 'xss', 'injection', 'auth']
  },
  [CATEGORY_IDS.PERFORMANCE]: {
    id: CATEGORY_IDS.PERFORMANCE,
    name: 'Performance',
    icon: '⚡',
    description: 'Detects performance issues and optimization opportunities',
    priority: CategoryPriority.MEDIUM,
    color: '#FFEB3B',
    keywords: ['performance', 'optimization', 'slow', 'memory']
  },
  [CATEGORY_IDS.ACCESSIBILITY]: {
    id: CATEGORY_IDS.ACCESSIBILITY,
    name: 'Accessibility',
    icon: '♿',
    description: 'Checks accessibility compliance (WCAG)',
    priority: CategoryPriority.MEDIUM,
    color: '#673AB7',
    keywords: ['accessibility', 'a11y', 'wcag', 'aria']
  }
};
