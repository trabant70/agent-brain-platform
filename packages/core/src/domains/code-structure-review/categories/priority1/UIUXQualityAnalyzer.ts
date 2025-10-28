/**
 * UI/UX Quality Analyzer
 *
 * Detects:
 * - Missing loading states for async operations
 * - Missing error handling and error display
 * - Missing empty states for lists
 * - Missing form validation
 * - Missing user feedback for actions
 * - Accessibility issues (WCAG compliance)
 */

import type {
  CategoryAnalysis,
  AnalysisContext,
  Issue,
  CategoryConfig,
  UIUXQualityResult
} from '../../types';
import { AnalysisCategory } from '../base/AnalysisCategory';
import { CATEGORY_IDS, CATEGORY_METADATA, CategoryPriority } from '../base/CategoryTypes';
import {
  LoadingStateDetector,
  ErrorHandlingDetector,
  EmptyStateDetector,
  FormValidationDetector,
  UserFeedbackDetector,
  AccessibilityDetector
} from '../../detectors/UIUXDetectors';
import { AnalysisContextUtils } from '../../analysis/AnalysisContext';

/**
 * Analyzes UI/UX quality across frontend components
 */
export class UIUXQualityAnalyzer extends AnalysisCategory {
  private loadingStateDetector: LoadingStateDetector;
  private errorHandlingDetector: ErrorHandlingDetector;
  private emptyStateDetector: EmptyStateDetector;
  private formValidationDetector: FormValidationDetector;
  private userFeedbackDetector: UserFeedbackDetector;
  private accessibilityDetector: AccessibilityDetector;

  constructor(config?: Partial<CategoryConfig>) {
    const metadata = CATEGORY_METADATA[CATEGORY_IDS.UI_UX_QUALITY];

    super({
      id: metadata.id,
      name: metadata.name,
      icon: metadata.icon,
      description: metadata.description,
      priority: CategoryPriority.CRITICAL,
      enabled: true,
      thresholds: {
        excellent: 95,
        good: 80,
        warning: 60,
        critical: 0
      },
      ...config
    });

    this.loadingStateDetector = new LoadingStateDetector();
    this.errorHandlingDetector = new ErrorHandlingDetector();
    this.emptyStateDetector = new EmptyStateDetector();
    this.formValidationDetector = new FormValidationDetector();
    this.userFeedbackDetector = new UserFeedbackDetector();
    this.accessibilityDetector = new AccessibilityDetector();
  }

  /**
   * Run UI/UX quality analysis
   */
  async analyze(context: AnalysisContext): Promise<CategoryAnalysis> {
    const issues: Issue[] = [];
    const metrics: Record<string, number> = {};

    // Get frontend files only (React/Vue components)
    const contextUtils = new AnalysisContextUtils(context);
    const frontendFiles = contextUtils
      .getCodeFiles()
      .filter(
        file =>
          file.language === 'tsx' ||
          file.language === 'jsx' ||
          file.path.includes('/components/') ||
          file.path.includes('/pages/') ||
          file.path.includes('/views/')
      );

    if (frontendFiles.length === 0) {
      // No frontend files to analyze
      return this.createAnalysisResult([], {
        totalComponents: 0
      });
    }

    // Run all detectors
    const loadingIssues = this.loadingStateDetector.detectMissingLoadingStates(
      frontendFiles
    );
    const errorIssues = this.errorHandlingDetector.detectMissingErrorHandling(
      frontendFiles
    );
    const emptyStateIssues = this.emptyStateDetector.detectMissingEmptyStates(
      frontendFiles
    );
    const formValidationIssues = this.formValidationDetector.detectFormValidationIssues(
      frontendFiles
    );
    const feedbackIssues = this.userFeedbackDetector.detectMissingFeedback(frontendFiles);
    const a11yIssues = this.accessibilityDetector.detectAccessibilityIssues(frontendFiles);

    // Convert loading state issues to Issue format
    loadingIssues.forEach(loadingIssue => {
      issues.push(
        this.createIssue({
          id: `uiux-loading-${loadingIssue.componentName}-${loadingIssue.lineNumber}`,
          severity: 'high',
          title: `Missing loading state in ${loadingIssue.componentName}`,
          description: `Component has ${loadingIssue.asyncOperation} but no loading indicator. Users won't see feedback during async operations.`,
          filePath: loadingIssue.filePath,
          lineNumber: loadingIssue.lineNumber,
          detectorId: 'loading-state-detector',
          fixSuggestion: `Add loading state: const [loading, setLoading] = useState(false); and show <Spinner /> or skeleton while loading.`,
          aiPromptHint: `Help me add a loading state to this component. The async operation happens at line ${loadingIssue.lineNumber}.`
        })
      );
    });

    // Convert error handling issues
    errorIssues.forEach(errorIssue => {
      issues.push(
        this.createIssue({
          id: `uiux-error-${errorIssue.componentName}-${errorIssue.lineNumber}`,
          severity: 'critical',
          title: `Missing error handling in ${errorIssue.componentName}`,
          description: `Async operation without error handling. Errors will be swallowed or cause crashes.`,
          filePath: errorIssue.filePath,
          lineNumber: errorIssue.lineNumber,
          detectorId: 'error-handling-detector',
          fixSuggestion: `Add try-catch block or .catch() handler. Show error message to user.`,
          aiPromptHint: `Help me add proper error handling for the async operation at line ${errorIssue.lineNumber}. Include user-facing error message.`
        })
      );
    });

    // Convert empty state issues
    emptyStateIssues.forEach(emptyIssue => {
      issues.push(
        this.createIssue({
          id: `uiux-empty-${emptyIssue.componentName}-${emptyIssue.lineNumber}`,
          severity: 'medium',
          title: `Missing empty state in ${emptyIssue.componentName}`,
          description: `List rendering without empty state check. Users will see nothing when list is empty.`,
          filePath: emptyIssue.filePath,
          lineNumber: emptyIssue.lineNumber,
          detectorId: 'empty-state-detector',
          fixSuggestion: `Add check: {items.length === 0 ? <EmptyState /> : items.map(...)}`,
          aiPromptHint: `Help me add an empty state for the list at line ${emptyIssue.lineNumber}. Include friendly message and action button.`
        })
      );
    });

    // Convert form validation issues
    formValidationIssues.forEach(formIssue => {
      issues.push(
        this.createIssue({
          id: `uiux-form-${formIssue.formName}-${formIssue.lineNumber}`,
          severity: 'high',
          title: `Missing validation in ${formIssue.formName}`,
          description: `Form without validation. Invalid data can be submitted, causing errors.`,
          filePath: formIssue.filePath,
          lineNumber: formIssue.lineNumber,
          detectorId: 'form-validation-detector',
          fixSuggestion: `Add validation using yup, zod, or custom validation. Show inline error messages.`,
          aiPromptHint: `Help me add form validation to ${formIssue.formName}. Missing: ${formIssue.missingValidation.join(', ')}.`
        })
      );
    });

    // Convert user feedback issues
    feedbackIssues.forEach(feedbackIssue => {
      issues.push(
        this.createIssue({
          id: `uiux-feedback-${feedbackIssue.componentName}-${feedbackIssue.lineNumber}`,
          severity: 'medium',
          title: `Missing user feedback in ${feedbackIssue.componentName}`,
          description: `${feedbackIssue.actionType} without success/error feedback. Users won't know if action completed.`,
          filePath: feedbackIssue.filePath,
          lineNumber: feedbackIssue.lineNumber,
          detectorId: 'user-feedback-detector',
          fixSuggestion: `Add toast notification: toast.success('Action completed!') or similar feedback mechanism.`,
          aiPromptHint: `Help me add user feedback for the ${feedbackIssue.actionType} at line ${feedbackIssue.lineNumber}.`
        })
      );
    });

    // Convert accessibility issues
    a11yIssues.forEach(a11yIssue => {
      const severityMap = {
        critical: 'critical' as const,
        high: 'high' as const,
        medium: 'medium' as const,
        low: 'low' as const
      };

      issues.push(
        this.createIssue({
          id: `uiux-a11y-${a11yIssue.issueType}-${a11yIssue.componentName}-${a11yIssue.lineNumber}`,
          severity: severityMap[a11yIssue.severity],
          title: `Accessibility: ${this.formatA11yIssueType(a11yIssue.issueType)} in ${a11yIssue.componentName}`,
          description: `WCAG ${a11yIssue.wcagLevel} violation: ${this.describeA11yIssue(a11yIssue.issueType)}`,
          filePath: a11yIssue.filePath,
          lineNumber: a11yIssue.lineNumber,
          detectorId: 'accessibility-detector',
          fixSuggestion: this.getA11yFixSuggestion(a11yIssue.issueType),
          aiPromptHint: `Help me fix this accessibility issue: ${a11yIssue.issueType}.`
        })
      );
    });

    // Calculate metrics
    metrics.totalComponents = this.countUniqueComponents([
      ...loadingIssues,
      ...errorIssues,
      ...emptyStateIssues
    ]);

    metrics.loadingStateIssues = loadingIssues.length;
    metrics.errorHandlingIssues = errorIssues.length;
    metrics.emptyStateIssues = emptyStateIssues.length;
    metrics.formValidationIssues = formValidationIssues.length;
    metrics.userFeedbackIssues = feedbackIssues.length;
    metrics.accessibilityIssues = a11yIssues.length;

    // Calculate coverage percentages
    const totalAsyncOperations = loadingIssues.length + errorIssues.length;
    metrics.asyncOperationsCoverage =
      totalAsyncOperations > 0
        ? Math.round(
            ((totalAsyncOperations - loadingIssues.length - errorIssues.length) /
              totalAsyncOperations) *
              100
          )
        : 100;

    metrics.overallUXQuality = this.calculateUXQuality(
      loadingIssues.length,
      errorIssues.length,
      emptyStateIssues.length,
      formValidationIssues.length,
      feedbackIssues.length,
      a11yIssues.length
    );

    // Create analysis result
    return this.createAnalysisResult(issues, metrics);
  }

  /**
   * Count unique components across issues
   */
  private countUniqueComponents(
    issues: Array<{ componentName: string }>
  ): number {
    const uniqueNames = new Set(issues.map(i => i.componentName));
    return uniqueNames.size;
  }

  /**
   * Calculate overall UX quality score
   */
  private calculateUXQuality(
    loading: number,
    error: number,
    empty: number,
    form: number,
    feedback: number,
    a11y: number
  ): number {
    // Start at 100
    let score = 100;

    // Critical issues have huge impact
    score -= error * 15; // Missing error handling is critical

    // High severity issues
    score -= loading * 10; // Missing loading states
    score -= form * 8; // Missing form validation

    // Medium severity issues
    score -= empty * 5; // Missing empty states
    score -= feedback * 5; // Missing user feedback

    // Accessibility issues
    score -= a11y * 7; // A11y is important

    return Math.max(0, Math.round(score));
  }

  /**
   * Format accessibility issue type
   */
  private formatA11yIssueType(issueType: string): string {
    const formatted = issueType
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    return formatted;
  }

  /**
   * Describe accessibility issue
   */
  private describeA11yIssue(issueType: string): string {
    const descriptions: Record<string, string> = {
      'missing-alt': 'Image missing alt text for screen readers',
      'missing-aria': 'Interactive element missing ARIA label',
      'keyboard-nav': 'Element not accessible via keyboard',
      'color-contrast': 'Insufficient color contrast ratio'
    };
    return descriptions[issueType] || 'Accessibility issue detected';
  }

  /**
   * Get fix suggestion for accessibility issue
   */
  private getA11yFixSuggestion(issueType: string): string {
    const suggestions: Record<string, string> = {
      'missing-alt': 'Add alt attribute to image: <img src="..." alt="Descriptive text" />',
      'missing-aria':
        'Add aria-label to element: <button aria-label="Close dialog">X</button>',
      'keyboard-nav': 'Add tabIndex={0} and onKeyPress handler for keyboard accessibility',
      'color-contrast':
        'Increase color contrast to meet WCAG AA standards (4.5:1 for normal text)'
    };
    return suggestions[issueType] || 'Review WCAG guidelines for this issue type';
  }

  /**
   * Custom scoring that heavily penalizes missing error handling
   */
  calculateScore(issues: Issue[]): number {
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const highIssues = issues.filter(i => i.severity === 'high');
    const mediumIssues = issues.filter(i => i.severity === 'medium');

    // Start at 100
    let score = 100;

    // Critical issues (missing error handling) are unacceptable
    score -= criticalIssues.length * 20;

    // High issues (missing loading states, form validation) are serious
    score -= highIssues.length * 10;

    // Medium issues (empty states, feedback) affect UX
    score -= mediumIssues.length * 5;

    return Math.max(0, Math.round(score));
  }
}
