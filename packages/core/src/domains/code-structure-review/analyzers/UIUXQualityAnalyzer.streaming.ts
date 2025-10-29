/**
 * UI/UX Quality Analyzer (Streaming Version)
 *
 * Analyzes UI/UX quality using pre-populated metadata registries.
 * No AST traversal needed - all metadata already extracted.
 *
 * Detects:
 * - Async operations without error handling
 * - Async operations without loading states
 * - Forms without validation
 * - Lists without empty states
 * - User actions without feedback
 * - Accessibility issues
 */

import type { UnifiedMetadataRegistry } from '../registries/UnifiedMetadataRegistry';
import type {
  AsyncOperationMetadata,
  FormMetadata,
  ListRenderingMetadata,
  UserActionMetadata,
  AccessibilityMetadata
} from '../registries/UIUXQualityRegistry';

export interface UIUXQualityIssue {
  type: 'missing-error-handling' | 'missing-loading-state' | 'missing-validation' | 'missing-empty-state' | 'missing-feedback' | 'accessibility';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  recommendation: string;
  filePath: string;
  lineNumber?: number;
  metadata?: any;
}

export interface UIUXQualityAnalysis {
  categoryId: string;
  categoryName: string;
  score: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  priority: number;
  issues: UIUXQualityIssue[];
  metrics: {
    totalAsyncOps: number;
    asyncOpsWithErrorHandling: number;
    asyncOpsWithLoadingState: number;
    asyncOpsComplete: number;
    totalForms: number;
    formsWithValidation: number;
    totalListRenderings: number;
    listsWithEmptyState: number;
    totalUserActions: number;
    actionsWithFeedback: number;
    totalA11yIssues: number;
    errorHandlingRate: number;
    loadingStateRate: number;
    validationRate: number;
    emptyStateRate: number;
    feedbackRate: number;
  };
  summary: string;
}

/**
 * UI/UX Quality Analyzer using streaming architecture
 */
export class UIUXQualityAnalyzerStreaming {
  private registry: UnifiedMetadataRegistry;

  constructor(registry: UnifiedMetadataRegistry) {
    this.registry = registry;
  }

  /**
   * Run analysis using registry data
   */
  analyze(): UIUXQualityAnalysis {
    console.log('[UIUXQualityAnalyzer] Starting analysis from registries');
    const startTime = Date.now();

    const issues: UIUXQualityIssue[] = [];

    // Get all metadata from registries
    const asyncOps = this.registry.uiuxQuality.getAllAsyncOperations();
    const forms = this.registry.uiuxQuality.getAllForms();
    const lists = this.registry.uiuxQuality.getAllListRenderings();
    const userActions = this.registry.uiuxQuality.getAllUserActions();
    const a11yIssues = this.registry.uiuxQuality.getAllAccessibilityIssues();

    console.log(`[UIUXQualityAnalyzer] Loaded: ${asyncOps.length} async ops, ${forms.length} forms, ${lists.length} lists, ${userActions.length} actions, ${a11yIssues.length} a11y issues`);

    // Analyze async operations
    const asyncOpsWithoutErrorHandling = asyncOps.filter(op => !op.hasErrorHandler);
    const asyncOpsWithoutLoadingState = asyncOps.filter(op => !op.hasLoadingState);
    const asyncOpsWithoutBoth = asyncOps.filter(op => !op.hasErrorHandler && !op.hasLoadingState);

    issues.push(...this.createMissingErrorHandlingIssues(asyncOpsWithoutErrorHandling));
    issues.push(...this.createMissingLoadingStateIssues(asyncOpsWithoutLoadingState));

    // Analyze forms
    const formsWithoutValidation = forms.filter(form => !form.hasValidation);
    issues.push(...this.createMissingValidationIssues(formsWithoutValidation));

    // Analyze list renderings
    const listsWithoutEmptyState = lists.filter(list => !list.hasEmptyState);
    issues.push(...this.createMissingEmptyStateIssues(listsWithoutEmptyState));

    // Analyze user actions
    const actionsWithoutFeedback = userActions.filter(action => !action.hasFeedback);
    issues.push(...this.createMissingFeedbackIssues(actionsWithoutFeedback));

    // Accessibility issues
    issues.push(...this.createAccessibilityIssues(a11yIssues));

    // Calculate metrics
    const metrics = {
      totalAsyncOps: asyncOps.length,
      asyncOpsWithErrorHandling: asyncOps.length - asyncOpsWithoutErrorHandling.length,
      asyncOpsWithLoadingState: asyncOps.length - asyncOpsWithoutLoadingState.length,
      asyncOpsComplete: asyncOps.filter(op => op.hasErrorHandler && op.hasLoadingState).length,
      totalForms: forms.length,
      formsWithValidation: forms.length - formsWithoutValidation.length,
      totalListRenderings: lists.length,
      listsWithEmptyState: lists.length - listsWithoutEmptyState.length,
      totalUserActions: userActions.length,
      actionsWithFeedback: userActions.length - actionsWithoutFeedback.length,
      totalA11yIssues: a11yIssues.length,
      errorHandlingRate: asyncOps.length > 0
        ? Math.round(((asyncOps.length - asyncOpsWithoutErrorHandling.length) / asyncOps.length) * 100)
        : 100,
      loadingStateRate: asyncOps.length > 0
        ? Math.round(((asyncOps.length - asyncOpsWithoutLoadingState.length) / asyncOps.length) * 100)
        : 100,
      validationRate: forms.length > 0
        ? Math.round(((forms.length - formsWithoutValidation.length) / forms.length) * 100)
        : 100,
      emptyStateRate: lists.length > 0
        ? Math.round(((lists.length - listsWithoutEmptyState.length) / lists.length) * 100)
        : 100,
      feedbackRate: userActions.length > 0
        ? Math.round(((userActions.length - actionsWithoutFeedback.length) / userActions.length) * 100)
        : 100
    };

    // Calculate score
    const score = this.calculateScore(metrics);
    const status = this.getStatus(score);

    const duration = Date.now() - startTime;
    console.log(`[UIUXQualityAnalyzer] ✓ Analysis complete: ${issues.length} issues found, score: ${score}/100 in ${duration}ms`);

    return {
      categoryId: 'ui-ux-quality',
      categoryName: 'UI/UX Quality',
      score,
      status,
      priority: 1,
      issues,
      metrics,
      summary: this.generateSummary(metrics, issues.length)
    };
  }

  /**
   * Create issues for async operations without error handling
   */
  private createMissingErrorHandlingIssues(asyncOps: AsyncOperationMetadata[]): UIUXQualityIssue[] {
    return asyncOps.map(op => ({
      type: 'missing-error-handling',
      severity: op.inComponent ? 'high' : 'medium',
      title: `Missing error handling: ${op.functionName || op.type}`,
      description: `Async operation (${op.type}) in ${op.componentName || op.filePath} does not handle errors. Users will not see error feedback if the operation fails.`,
      recommendation: 'Add try-catch block or .catch() handler to show error message to users.',
      filePath: op.filePath,
      lineNumber: op.lineNumber,
      metadata: op
    }));
  }

  /**
   * Create issues for async operations without loading states
   */
  private createMissingLoadingStateIssues(asyncOps: AsyncOperationMetadata[]): UIUXQualityIssue[] {
    return asyncOps.map(op => ({
      type: 'missing-loading-state',
      severity: op.inComponent ? 'high' : 'medium',
      title: `Missing loading state: ${op.functionName || op.type}`,
      description: `Async operation (${op.type}) in ${op.componentName || op.filePath} does not show loading state. Users won't know the operation is in progress.`,
      recommendation: 'Add loading indicator or disable UI elements during the async operation.',
      filePath: op.filePath,
      lineNumber: op.lineNumber,
      metadata: op
    }));
  }

  /**
   * Create issues for forms without validation
   */
  private createMissingValidationIssues(forms: FormMetadata[]): UIUXQualityIssue[] {
    return forms.map(form => ({
      type: 'missing-validation',
      severity: 'high',
      title: `Missing validation: ${form.formName}`,
      description: `Form "${form.formName}" does not have input validation. This can lead to bad data being submitted or poor user experience.`,
      recommendation: 'Add validation using a library like Yup, Zod, or React Hook Form.',
      filePath: form.filePath,
      lineNumber: form.lineNumber,
      metadata: form
    }));
  }

  /**
   * Create issues for lists without empty states
   */
  private createMissingEmptyStateIssues(lists: ListRenderingMetadata[]): UIUXQualityIssue[] {
    return lists.map(list => ({
      type: 'missing-empty-state',
      severity: 'medium',
      title: `Missing empty state: ${list.listName || 'list rendering'}`,
      description: `List rendering in ${list.filePath} does not show empty state message when there are no items. Users may be confused by a blank screen.`,
      recommendation: 'Add conditional rendering to show helpful message when list is empty.',
      filePath: list.filePath,
      lineNumber: list.lineNumber,
      metadata: list
    }));
  }

  /**
   * Create issues for user actions without feedback
   */
  private createMissingFeedbackIssues(actions: UserActionMetadata[]): UIUXQualityIssue[] {
    return actions.map(action => ({
      type: 'missing-feedback',
      severity: 'medium',
      title: `Missing feedback: ${action.actionType} action`,
      description: `${action.actionType} action in ${action.filePath} does not provide user feedback. Users won't know if their action succeeded or failed.`,
      recommendation: 'Add toast notification, success message, or visual feedback for this action.',
      filePath: action.filePath,
      lineNumber: action.lineNumber,
      metadata: action
    }));
  }

  /**
   * Create accessibility issues
   */
  private createAccessibilityIssues(a11yIssues: AccessibilityMetadata[]): UIUXQualityIssue[] {
    return a11yIssues.map(issue => ({
      type: 'accessibility',
      severity: issue.severity,
      title: `Accessibility: ${issue.issueType}`,
      description: issue.description || `Accessibility issue: ${issue.issueType} in ${issue.element || 'component'}`,
      recommendation: issue.recommendation || issue.suggestion || 'Review accessibility guidelines and fix this issue',
      filePath: issue.filePath,
      lineNumber: issue.lineNumber,
      metadata: issue
    }));
  }

  /**
   * Calculate overall score
   */
  private calculateScore(metrics: UIUXQualityAnalysis['metrics']): number {
    // Weight different factors
    const errorHandlingScore = metrics.errorHandlingRate * 0.3; // 30% weight
    const loadingStateScore = metrics.loadingStateRate * 0.25; // 25% weight
    const validationScore = metrics.validationRate * 0.2; // 20% weight
    const emptyStateScore = metrics.emptyStateRate * 0.1; // 10% weight
    const feedbackScore = metrics.feedbackRate * 0.1; // 10% weight

    // Accessibility penalty
    const a11yPenalty = Math.min(metrics.totalA11yIssues * 3, 15); // Up to -15 points

    const rawScore = errorHandlingScore + loadingStateScore + validationScore + emptyStateScore + feedbackScore - a11yPenalty;
    return Math.max(0, Math.min(100, Math.round(rawScore)));
  }

  /**
   * Get status based on score
   */
  private getStatus(score: number): 'excellent' | 'good' | 'warning' | 'critical' {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'warning';
    return 'critical';
  }

  /**
   * Generate summary text
   */
  private generateSummary(metrics: UIUXQualityAnalysis['metrics'], issueCount: number): string {
    const parts: string[] = [];

    parts.push(`Found ${issueCount} UI/UX quality issues.`);

    if (metrics.asyncOpsWithErrorHandling < metrics.totalAsyncOps) {
      const missing = metrics.totalAsyncOps - metrics.asyncOpsWithErrorHandling;
      parts.push(`${missing} async operations lack error handling.`);
    }

    if (metrics.asyncOpsWithLoadingState < metrics.totalAsyncOps) {
      const missing = metrics.totalAsyncOps - metrics.asyncOpsWithLoadingState;
      parts.push(`${missing} async operations lack loading states.`);
    }

    if (metrics.formsWithValidation < metrics.totalForms) {
      const missing = metrics.totalForms - metrics.formsWithValidation;
      parts.push(`${missing} forms lack validation.`);
    }

    if (metrics.totalA11yIssues > 0) {
      parts.push(`${metrics.totalA11yIssues} accessibility issues found.`);
    }

    if (issueCount === 0) {
      return 'UI/UX quality is excellent. Great user experience!';
    }

    return parts.join(' ');
  }
}
