/**
 * UI/UX Quality Registry
 *
 * Stores lightweight metadata for UI/UX quality analysis:
 * - Async operations (loading states, error handling)
 * - Forms (validation)
 * - List renderings (empty states)
 * - User actions (feedback)
 * - Accessibility issues
 *
 * Memory efficient: Stores only essential metadata
 */

export interface AsyncOperationMetadata {
  type: 'fetch' | 'axios' | 'async-function' | 'promise' | 'await';
  filePath: string;
  lineNumber: number;
  functionName?: string;           // Containing function
  componentName?: string;          // Containing component
  hasErrorHandler: boolean;        // Has try-catch or .catch()
  hasLoadingState: boolean;        // Has loading indicator
  hasTryFinally: boolean;          // Has finally block
  hasLoadingVariable?: boolean;    // useState with 'loading'
  hasErrorVariable?: boolean;      // useState with 'error'
  inComponent: boolean;            // Is in a component
}

export interface FormMetadata {
  formName: string;                // Component or form name
  filePath: string;
  lineNumber: number;
  hasValidation: boolean;          // Has any validation
  validationLibrary?: 'yup' | 'zod' | 'react-hook-form' | 'custom';
  fields?: string[];               // Form field names
  hasSubmitHandler: boolean;       // Has onSubmit handler
}

export interface ListRenderingMetadata {
  componentName: string;
  listName?: string;               // Optional list name
  filePath: string;
  lineNumber: number;
  hasEmptyStateCheck: boolean;     // Checks for empty array
  hasEmptyState: boolean;          // Shows empty state message
  arraySource: string;             // Variable name
  renderMethod: '.map' | '.forEach' | 'for-loop';
}

export interface UserActionMetadata {
  actionType: 'button-click' | 'form-submit' | 'delete' | 'save' | 'update';
  componentName: string;
  filePath: string;
  lineNumber: number;
  hasFeedback: boolean;            // Shows user feedback
  feedbackType?: 'toast' | 'alert' | 'inline' | 'notification';
  isAsync: boolean;                // Is async operation
}

export interface AccessibilityMetadata {
  issueType: 'missing-alt' | 'missing-aria' | 'keyboard-nav' | 'color-contrast' | 'missing-label';
  componentName: string;
  filePath: string;
  lineNumber: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  wcagLevel: 'A' | 'AA' | 'AAA';
  element?: string;                // HTML element type
  suggestion?: string;             // Fix suggestion
  description?: string;            // Issue description
  recommendation?: string;         // Recommended fix
}

/**
 * Registry for UI/UX quality metadata
 */
export class UIUXQualityRegistry {
  private asyncOperations: AsyncOperationMetadata[] = [];
  private forms: FormMetadata[] = [];
  private listRenderings: ListRenderingMetadata[] = [];
  private userActions: UserActionMetadata[] = [];
  private a11yIssues: AccessibilityMetadata[] = [];

  // ==================== Async Operations ====================

  /**
   * Add async operation metadata
   */
  addAsyncOperation(operation: AsyncOperationMetadata): void {
    this.asyncOperations.push(operation);
  }

  /**
   * Get all async operations
   */
  getAllAsyncOperations(): AsyncOperationMetadata[] {
    return this.asyncOperations;
  }

  /**
   * Get async operations by file
   */
  getAsyncOperationsByFile(filePath: string): AsyncOperationMetadata[] {
    return this.asyncOperations.filter(op => op.filePath === filePath);
  }

  /**
   * Get async operations by component
   */
  getAsyncOperationsByComponent(componentName: string): AsyncOperationMetadata[] {
    return this.asyncOperations.filter(op => op.componentName === componentName);
  }

  /**
   * Get async operations without error handling
   */
  getAsyncOpsWithoutErrorHandling(): AsyncOperationMetadata[] {
    return this.asyncOperations.filter(op => !op.hasErrorHandler);
  }

  /**
   * Get async operations without loading state
   */
  getAsyncOpsWithoutLoadingState(): AsyncOperationMetadata[] {
    return this.asyncOperations.filter(op => op.inComponent && !op.hasLoadingState);
  }

  /**
   * Get async operations in components without error variable
   */
  getAsyncOpsWithoutErrorVariable(): AsyncOperationMetadata[] {
    return this.asyncOperations.filter(op => op.inComponent && !op.hasErrorVariable);
  }

  // ==================== Form Operations ====================

  /**
   * Add form metadata
   */
  addForm(form: FormMetadata): void {
    this.forms.push(form);
  }

  /**
   * Get all forms
   */
  getAllForms(): FormMetadata[] {
    return this.forms;
  }

  /**
   * Get forms without validation
   */
  getFormsWithoutValidation(): FormMetadata[] {
    return this.forms.filter(f => !f.hasValidation);
  }

  /**
   * Get forms without submit handler
   */
  getFormsWithoutSubmitHandler(): FormMetadata[] {
    return this.forms.filter(f => !f.hasSubmitHandler);
  }

  /**
   * Get forms by file
   */
  getFormsByFile(filePath: string): FormMetadata[] {
    return this.forms.filter(f => f.filePath === filePath);
  }

  // ==================== List Rendering Operations ====================

  /**
   * Add list rendering metadata
   */
  addListRendering(list: ListRenderingMetadata): void {
    this.listRenderings.push(list);
  }

  /**
   * Get all list renderings
   */
  getAllListRenderings(): ListRenderingMetadata[] {
    return this.listRenderings;
  }

  /**
   * Get list renderings without empty state check
   */
  getListRenderingsWithoutEmptyState(): ListRenderingMetadata[] {
    return this.listRenderings.filter(l => !l.hasEmptyStateCheck);
  }

  /**
   * Get list renderings by component
   */
  getListRenderingsByComponent(componentName: string): ListRenderingMetadata[] {
    return this.listRenderings.filter(l => l.componentName === componentName);
  }

  // ==================== User Action Operations ====================

  /**
   * Add user action metadata
   */
  addUserAction(action: UserActionMetadata): void {
    this.userActions.push(action);
  }

  /**
   * Get all user actions
   */
  getAllUserActions(): UserActionMetadata[] {
    return this.userActions;
  }

  /**
   * Get user actions without feedback
   */
  getUserActionsWithoutFeedback(): UserActionMetadata[] {
    return this.userActions.filter(a => a.isAsync && !a.hasFeedback);
  }

  /**
   * Get user actions by type
   */
  getUserActionsByType(actionType: UserActionMetadata['actionType']): UserActionMetadata[] {
    return this.userActions.filter(a => a.actionType === actionType);
  }

  // ==================== Accessibility Operations ====================

  /**
   * Add accessibility issue
   */
  addAccessibilityIssue(issue: AccessibilityMetadata): void {
    this.a11yIssues.push(issue);
  }

  /**
   * Get all accessibility issues
   */
  getAllAccessibilityIssues(): AccessibilityMetadata[] {
    return this.a11yIssues;
  }

  /**
   * Get accessibility issues by severity
   */
  getAccessibilityIssuesBySeverity(severity: AccessibilityMetadata['severity']): AccessibilityMetadata[] {
    return this.a11yIssues.filter(i => i.severity === severity);
  }

  /**
   * Get accessibility issues by WCAG level
   */
  getAccessibilityIssuesByWCAGLevel(wcagLevel: AccessibilityMetadata['wcagLevel']): AccessibilityMetadata[] {
    return this.a11yIssues.filter(i => i.wcagLevel === wcagLevel);
  }

  /**
   * Get critical accessibility issues
   */
  getCriticalAccessibilityIssues(): AccessibilityMetadata[] {
    return this.a11yIssues.filter(i => i.severity === 'critical' || i.severity === 'high');
  }

  // ==================== Statistics ====================

  /**
   * Get comprehensive statistics
   */
  getStats() {
    return {
      asyncOperations: {
        total: this.asyncOperations.length,
        withoutErrorHandling: this.getAsyncOpsWithoutErrorHandling().length,
        withoutLoadingState: this.getAsyncOpsWithoutLoadingState().length,
        withoutErrorVariable: this.getAsyncOpsWithoutErrorVariable().length,
        inComponents: this.asyncOperations.filter(op => op.inComponent).length,
        byType: this.groupBy(this.asyncOperations, 'type')
      },
      forms: {
        total: this.forms.length,
        withoutValidation: this.getFormsWithoutValidation().length,
        withoutSubmitHandler: this.getFormsWithoutSubmitHandler().length,
        byLibrary: this.groupBy(
          this.forms.filter(f => f.validationLibrary),
          'validationLibrary'
        )
      },
      listRenderings: {
        total: this.listRenderings.length,
        withoutEmptyState: this.getListRenderingsWithoutEmptyState().length,
        byMethod: this.groupBy(this.listRenderings, 'renderMethod')
      },
      userActions: {
        total: this.userActions.length,
        withoutFeedback: this.getUserActionsWithoutFeedback().length,
        byType: this.groupBy(this.userActions, 'actionType'),
        async: this.userActions.filter(a => a.isAsync).length
      },
      accessibility: {
        total: this.a11yIssues.length,
        critical: this.getCriticalAccessibilityIssues().length,
        bySeverity: this.groupBy(this.a11yIssues, 'severity'),
        byWCAGLevel: this.groupBy(this.a11yIssues, 'wcagLevel'),
        byIssueType: this.groupBy(this.a11yIssues, 'issueType')
      }
    };
  }

  /**
   * Get memory usage estimate
   */
  getMemoryUsage(): {
    asyncOperations: number;
    forms: number;
    listRenderings: number;
    userActions: number;
    a11yIssues: number;
    totalKB: number;
  } {
    // Rough estimates: each metadata object is ~100-300 bytes
    const asyncOpsBytes = this.asyncOperations.length * 250;
    const formsBytes = this.forms.length * 200;
    const listBytes = this.listRenderings.length * 150;
    const actionsBytes = this.userActions.length * 150;
    const a11yBytes = this.a11yIssues.length * 200;

    const totalBytes = asyncOpsBytes + formsBytes + listBytes + actionsBytes + a11yBytes;

    return {
      asyncOperations: this.asyncOperations.length,
      forms: this.forms.length,
      listRenderings: this.listRenderings.length,
      userActions: this.userActions.length,
      a11yIssues: this.a11yIssues.length,
      totalKB: Math.round(totalBytes / 1024)
    };
  }

  /**
   * Clear all registries
   */
  clear(): void {
    this.asyncOperations = [];
    this.forms = [];
    this.listRenderings = [];
    this.userActions = [];
    this.a11yIssues = [];
  }

  /**
   * Get item counts
   */
  getCounts() {
    return {
      asyncOperations: this.asyncOperations.length,
      forms: this.forms.length,
      listRenderings: this.listRenderings.length,
      userActions: this.userActions.length,
      a11yIssues: this.a11yIssues.length
    };
  }

  // ==================== Helper Methods ====================

  private groupBy<T>(items: T[], key: keyof T): Record<string, number> {
    return items.reduce((acc, item) => {
      const value = String(item[key] || 'unknown');
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}
