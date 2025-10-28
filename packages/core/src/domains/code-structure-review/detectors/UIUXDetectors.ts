/**
 * Detectors for UI/UX quality analysis
 */

import * as ts from 'typescript';
import type {
  SourceFile,
  LoadingStateIssue,
  ErrorHandlingIssue,
  EmptyStateIssue,
  FormValidationIssue,
  UserFeedbackIssue,
  AccessibilityIssue
} from '../types';
import { ASTTraversal } from '../analysis/SourceFileParser';

/**
 * Detect missing loading states for async operations
 */
export class LoadingStateDetector {
  /**
   * Find async operations without loading indicators
   */
  detectMissingLoadingStates(files: SourceFile[]): LoadingStateIssue[] {
    const issues: LoadingStateIssue[] = [];

    files.forEach(file => {
      if (!file.ast) return;

      const sourceFile = file.ast as ts.SourceFile;
      const asyncOperations = ASTTraversal.findAsyncOperations(sourceFile);

      asyncOperations.forEach(asyncNode => {
        const component = ASTTraversal.getContainingFunction(asyncNode);
        if (!component) return;

        const componentName = this.getComponentName(component);
        if (!componentName) return;

        // Check if component has loading state variable
        const hasLoadingState = this.hasLoadingStateVariable(component, sourceFile);

        if (!hasLoadingState) {
          issues.push({
            componentName,
            filePath: file.path,
            lineNumber: ASTTraversal.getLineNumber(asyncNode, sourceFile),
            asyncOperation: this.describeAsyncOperation(asyncNode),
            hasLoadingIndicator: false,
            loadingType: 'none'
          });
        }
      });
    });

    return issues;
  }

  /**
   * Check if component has loading state variable
   */
  private hasLoadingStateVariable(component: ts.Node, sourceFile: ts.SourceFile): boolean {
    let hasLoading = false;

    ASTTraversal.visit(component, node => {
      // Check for useState with 'loading' in name
      if (ts.isCallExpression(node)) {
        const { expression } = node;
        if (ts.isIdentifier(expression) && expression.text === 'useState') {
          // Check if destructured variable includes 'loading'
          const parent = node.parent;
          if (
            parent &&
            ts.isVariableDeclaration(parent) &&
            ts.isArrayBindingPattern(parent.name)
          ) {
            const elements = parent.name.elements;
            elements.forEach(element => {
              if (
                ts.isBindingElement(element) &&
                ts.isIdentifier(element.name) &&
                element.name.text.toLowerCase().includes('loading')
              ) {
                hasLoading = true;
              }
            });
          }
        }
      }

      // Check for 'loading' variable declaration
      if (ts.isVariableDeclaration(node)) {
        if (
          node.name &&
          ts.isIdentifier(node.name) &&
          node.name.text.toLowerCase().includes('loading')
        ) {
          hasLoading = true;
        }
      }
    });

    return hasLoading;
  }

  /**
   * Get component name from function
   */
  private getComponentName(node: ts.Node): string | undefined {
    if (ts.isFunctionDeclaration(node) && node.name) {
      return node.name.text;
    }
    if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      // Try to get name from variable declaration
      if (node.parent && ts.isVariableDeclaration(node.parent) && node.parent.name) {
        if (ts.isIdentifier(node.parent.name)) {
          return node.parent.name.text;
        }
      }
    }
    return undefined;
  }

  /**
   * Describe async operation
   */
  private describeAsyncOperation(node: ts.Node): string {
    if (ts.isAwaitExpression(node)) {
      return 'await expression';
    }
    if (ts.isCallExpression(node)) {
      return 'promise chain (.then)';
    }
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node)
    ) {
      return 'async function';
    }
    return 'async operation';
  }
}

/**
 * Detect missing error handling
 */
export class ErrorHandlingDetector {
  /**
   * Find async operations without error handling
   */
  detectMissingErrorHandling(files: SourceFile[]): ErrorHandlingIssue[] {
    const issues: ErrorHandlingIssue[] = [];

    files.forEach(file => {
      if (!file.ast) return;

      const sourceFile = file.ast as ts.SourceFile;
      const asyncOperations = ASTTraversal.findAsyncOperations(sourceFile);

      asyncOperations.forEach(asyncNode => {
        const component = ASTTraversal.getContainingFunction(asyncNode);
        if (!component) return;

        const componentName = this.getComponentName(component);
        if (!componentName) return;

        // Check for try-catch or .catch()
        const hasErrorHandling = this.hasErrorHandling(asyncNode, component);

        if (!hasErrorHandling) {
          issues.push({
            componentName,
            filePath: file.path,
            lineNumber: ASTTraversal.getLineNumber(asyncNode, sourceFile),
            errorSource: 'async operation',
            hasErrorBoundary: false,
            showsUserMessage: false,
            errorType: 'network'
          });
        }
      });
    });

    return issues;
  }

  /**
   * Check if async operation has error handling
   */
  private hasErrorHandling(asyncNode: ts.Node, scope: ts.Node): boolean {
    // Check if inside try-catch
    if (this.isInsideTryCatch(asyncNode)) {
      return true;
    }

    // Check if .catch() is called
    if (this.hasCatchCall(asyncNode)) {
      return true;
    }

    // Check for error state variable
    if (this.hasErrorStateVariable(scope)) {
      return true;
    }

    return false;
  }

  /**
   * Check if node is inside try-catch
   */
  private isInsideTryCatch(node: ts.Node): boolean {
    let current = node.parent;
    while (current) {
      if (ts.isTryStatement(current)) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  /**
   * Check if promise has .catch()
   */
  private hasCatchCall(node: ts.Node): boolean {
    // Look for .catch() in the expression chain
    if (ts.isCallExpression(node)) {
      let current: ts.Node | undefined = node.parent;
      while (current && ts.isCallExpression(current)) {
        const { expression } = current;
        if (
          ts.isPropertyAccessExpression(expression) &&
          ts.isIdentifier(expression.name) &&
          expression.name.text === 'catch'
        ) {
          return true;
        }
        current = current.parent;
      }
    }
    return false;
  }

  /**
   * Check for error state variable
   */
  private hasErrorStateVariable(scope: ts.Node): boolean {
    let hasError = false;

    ASTTraversal.visit(scope, node => {
      if (ts.isVariableDeclaration(node)) {
        if (
          node.name &&
          ts.isIdentifier(node.name) &&
          node.name.text.toLowerCase().includes('error')
        ) {
          hasError = true;
        }
      }

      // useState with 'error' in name
      if (ts.isCallExpression(node)) {
        const { expression } = node;
        if (ts.isIdentifier(expression) && expression.text === 'useState') {
          const parent = node.parent;
          if (
            parent &&
            ts.isVariableDeclaration(parent) &&
            ts.isArrayBindingPattern(parent.name)
          ) {
            const elements = parent.name.elements;
            elements.forEach(element => {
              if (
                ts.isBindingElement(element) &&
                ts.isIdentifier(element.name) &&
                element.name.text.toLowerCase().includes('error')
              ) {
                hasError = true;
              }
            });
          }
        }
      }
    });

    return hasError;
  }

  /**
   * Get component name
   */
  private getComponentName(node: ts.Node): string | undefined {
    if (ts.isFunctionDeclaration(node) && node.name) {
      return node.name.text;
    }
    if (node.parent && ts.isVariableDeclaration(node.parent) && node.parent.name) {
      if (ts.isIdentifier(node.parent.name)) {
        return node.parent.name.text;
      }
    }
    return undefined;
  }
}

/**
 * Detect missing empty states
 */
export class EmptyStateDetector {
  /**
   * Find components rendering lists without empty state checks
   */
  detectMissingEmptyStates(files: SourceFile[]): EmptyStateIssue[] {
    const issues: EmptyStateIssue[] = [];

    files.forEach(file => {
      if (!file.ast || file.language !== 'tsx') return;

      const sourceFile = file.ast as ts.SourceFile;

      // Find .map() calls (list rendering)
      ASTTraversal.visit(sourceFile, node => {
        if (ts.isCallExpression(node)) {
          const { expression } = node;

          // Check for array.map()
          if (
            ts.isPropertyAccessExpression(expression) &&
            ts.isIdentifier(expression.name) &&
            expression.name.text === 'map'
          ) {
            const component = ASTTraversal.getContainingFunction(node);
            if (!component) return;

            const componentName = this.getComponentName(component);
            if (!componentName) return;

            // Check if there's an empty state check before the map
            const hasEmptyCheck = this.hasEmptyStateCheck(
              expression.expression,
              component
            );

            if (!hasEmptyCheck) {
              issues.push({
                componentName,
                filePath: file.path,
                lineNumber: ASTTraversal.getLineNumber(node, sourceFile),
                dataSource: 'array.map()',
                hasEmptyState: false,
                emptyStateQuality: 'none'
              });
            }
          }
        }
      });
    });

    return issues;
  }

  /**
   * Check if there's an empty state check
   */
  private hasEmptyStateCheck(arrayExpression: ts.Expression, scope: ts.Node): boolean {
    // Look for if (array.length === 0) or similar checks
    let hasCheck = false;

    ASTTraversal.visit(scope, node => {
      // Check for conditional expressions
      if (ts.isIfStatement(node) || ts.isConditionalExpression(node)) {
        const condition = ts.isIfStatement(node) ? node.expression : node.condition;

        // Check if condition involves .length
        const conditionText = condition.getText();
        if (conditionText.includes('.length') && conditionText.includes('0')) {
          hasCheck = true;
        }
      }

      // Check for logical AND with length check
      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
        const leftText = node.left.getText();
        if (leftText.includes('.length') && leftText.includes('0')) {
          hasCheck = true;
        }
      }
    });

    return hasCheck;
  }

  /**
   * Get component name
   */
  private getComponentName(node: ts.Node): string | undefined {
    if (ts.isFunctionDeclaration(node) && node.name) {
      return node.name.text;
    }
    if (node.parent && ts.isVariableDeclaration(node.parent) && node.parent.name) {
      if (ts.isIdentifier(node.parent.name)) {
        return node.parent.name.text;
      }
    }
    return undefined;
  }
}

/**
 * Detect form validation issues
 */
export class FormValidationDetector {
  /**
   * Find forms without proper validation
   */
  detectFormValidationIssues(files: SourceFile[]): FormValidationIssue[] {
    const issues: FormValidationIssue[] = [];

    files.forEach(file => {
      if (!file.ast || file.language !== 'tsx') return;

      const sourceFile = file.ast as ts.SourceFile;

      // Find form elements
      ASTTraversal.visit(sourceFile, node => {
        if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
          const tagName = this.getJSXTagName(node);

          if (tagName === 'form') {
            const component = ASTTraversal.getContainingFunction(node);
            if (!component) return;

            const componentName = this.getComponentName(component);
            if (!componentName) return;

            // Check for validation logic
            const hasValidation = this.hasValidationLogic(component);

            if (!hasValidation) {
              issues.push({
                formName: componentName,
                filePath: file.path,
                lineNumber: ASTTraversal.getLineNumber(node, sourceFile),
                missingValidation: ['input validation', 'error messages'],
                clientSideOnly: true,
                showsInlineErrors: false
              });
            }
          }
        }
      });
    });

    return issues;
  }

  /**
   * Get JSX tag name
   */
  private getJSXTagName(node: ts.JsxElement | ts.JsxSelfClosingElement): string {
    if (ts.isJsxElement(node)) {
      const openingElement = node.openingElement;
      if (ts.isIdentifier(openingElement.tagName)) {
        return openingElement.tagName.text;
      }
    }
    if (ts.isJsxSelfClosingElement(node)) {
      if (ts.isIdentifier(node.tagName)) {
        return node.tagName.text;
      }
    }
    return '';
  }

  /**
   * Check for validation logic
   */
  private hasValidationLogic(component: ts.Node): boolean {
    let hasValidation = false;

    ASTTraversal.visit(component, node => {
      // Check for validation-related function calls
      if (ts.isCallExpression(node)) {
        const text = node.expression.getText();
        if (
          text.includes('validate') ||
          text.includes('Validation') ||
          text.includes('yup') ||
          text.includes('zod') ||
          text.includes('joi')
        ) {
          hasValidation = true;
        }
      }

      // Check for error-related state
      if (ts.isVariableDeclaration(node)) {
        if (
          node.name &&
          ts.isIdentifier(node.name) &&
          node.name.text.toLowerCase().includes('error')
        ) {
          hasValidation = true;
        }
      }
    });

    return hasValidation;
  }

  /**
   * Get component name
   */
  private getComponentName(node: ts.Node): string | undefined {
    if (ts.isFunctionDeclaration(node) && node.name) {
      return node.name.text;
    }
    if (node.parent && ts.isVariableDeclaration(node.parent) && node.parent.name) {
      if (ts.isIdentifier(node.parent.name)) {
        return node.parent.name.text;
      }
    }
    return undefined;
  }
}

/**
 * Detect missing user feedback for actions
 */
export class UserFeedbackDetector {
  /**
   * Find user actions without feedback
   */
  detectMissingFeedback(files: SourceFile[]): UserFeedbackIssue[] {
    const issues: UserFeedbackIssue[] = [];

    files.forEach(file => {
      if (!file.ast) return;

      const sourceFile = file.ast as ts.SourceFile;

      // Find button click handlers with async operations
      ASTTraversal.visit(sourceFile, node => {
        if (this.isButtonClickHandler(node)) {
          const component = ASTTraversal.getContainingFunction(node);
          if (!component) return;

          const componentName = this.getComponentName(component);
          if (!componentName) return;

          // Check if handler has async operations
          const hasAsync = this.containsAsyncOperation(node);

          if (hasAsync) {
            // Check for feedback mechanism (toast, alert, etc.)
            const hasFeedback = this.hasFeedbackMechanism(component);

            if (!hasFeedback) {
              issues.push({
                componentName,
                filePath: file.path,
                lineNumber: ASTTraversal.getLineNumber(node, sourceFile),
                actionType: 'button click',
                hasFeedback: false,
                feedbackType: 'none'
              });
            }
          }
        }
      });
    });

    return issues;
  }

  /**
   * Check if node is a button click handler
   */
  private isButtonClickHandler(node: ts.Node): boolean {
    // Check for onClick, handleClick, onSubmit patterns
    if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node)) {
      if (node.parent && ts.isVariableDeclaration(node.parent) && node.parent.name) {
        if (ts.isIdentifier(node.parent.name)) {
          const name = node.parent.name.text.toLowerCase();
          return (
            name.includes('click') ||
            name.includes('submit') ||
            name.includes('save') ||
            name.includes('delete')
          );
        }
      }
    }
    return false;
  }

  /**
   * Check if function contains async operation
   */
  private containsAsyncOperation(node: ts.Node): boolean {
    let hasAsync = false;

    ASTTraversal.visit(node, child => {
      if (ts.isAwaitExpression(child)) {
        hasAsync = true;
      }
    });

    return hasAsync;
  }

  /**
   * Check for feedback mechanism
   */
  private hasFeedbackMechanism(component: ts.Node): boolean {
    let hasFeedback = false;

    ASTTraversal.visit(component, node => {
      if (ts.isCallExpression(node)) {
        const text = node.expression.getText();
        if (
          text.includes('toast') ||
          text.includes('alert') ||
          text.includes('notify') ||
          text.includes('message') ||
          text.includes('snackbar')
        ) {
          hasFeedback = true;
        }
      }
    });

    return hasFeedback;
  }

  /**
   * Get component name
   */
  private getComponentName(node: ts.Node): string | undefined {
    if (ts.isFunctionDeclaration(node) && node.name) {
      return node.name.text;
    }
    if (node.parent && ts.isVariableDeclaration(node.parent) && node.parent.name) {
      if (ts.isIdentifier(node.parent.name)) {
        return node.parent.name.text;
      }
    }
    return undefined;
  }
}

/**
 * Detect accessibility issues
 */
export class AccessibilityDetector {
  /**
   * Find accessibility issues in JSX
   */
  detectAccessibilityIssues(files: SourceFile[]): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];

    files.forEach(file => {
      if (!file.ast || file.language !== 'tsx') return;

      const sourceFile = file.ast as ts.SourceFile;

      // Find JSX elements
      ASTTraversal.visit(sourceFile, node => {
        if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
          const tagName = this.getJSXTagName(node);
          const component = ASTTraversal.getContainingFunction(node);
          if (!component) return;

          const componentName = this.getComponentName(component);
          if (!componentName) return;

          // Check for missing alt on images
          if (tagName === 'img') {
            const hasAlt = this.hasAttribute(node, 'alt');
            if (!hasAlt) {
              issues.push({
                componentName,
                filePath: file.path,
                lineNumber: ASTTraversal.getLineNumber(node, sourceFile),
                issueType: 'missing-alt',
                severity: 'high',
                wcagLevel: 'A'
              });
            }
          }

          // Check for buttons without aria-label (if no text content)
          if (tagName === 'button') {
            const hasAriaLabel = this.hasAttribute(node, 'aria-label');
            const hasTextContent = this.hasTextContent(node);

            if (!hasAriaLabel && !hasTextContent) {
              issues.push({
                componentName,
                filePath: file.path,
                lineNumber: ASTTraversal.getLineNumber(node, sourceFile),
                issueType: 'missing-aria',
                severity: 'medium',
                wcagLevel: 'A'
              });
            }
          }
        }
      });
    });

    return issues;
  }

  /**
   * Get JSX tag name
   */
  private getJSXTagName(node: ts.JsxElement | ts.JsxSelfClosingElement): string {
    if (ts.isJsxElement(node)) {
      const openingElement = node.openingElement;
      if (ts.isIdentifier(openingElement.tagName)) {
        return openingElement.tagName.text;
      }
    }
    if (ts.isJsxSelfClosingElement(node)) {
      if (ts.isIdentifier(node.tagName)) {
        return node.tagName.text;
      }
    }
    return '';
  }

  /**
   * Check if element has specific attribute
   */
  private hasAttribute(
    node: ts.JsxElement | ts.JsxSelfClosingElement,
    attrName: string
  ): boolean {
    const attributes = ts.isJsxElement(node)
      ? node.openingElement.attributes
      : node.attributes;

    return attributes.properties.some(
      prop =>
        ts.isJsxAttribute(prop) &&
        ts.isIdentifier(prop.name) &&
        prop.name.text === attrName
    );
  }

  /**
   * Check if element has text content
   */
  private hasTextContent(node: ts.JsxElement | ts.JsxSelfClosingElement): boolean {
    if (ts.isJsxElement(node)) {
      return node.children.some(
        child =>
          ts.isJsxText(child) ||
          ts.isJsxExpression(child) ||
          ts.isJsxElement(child)
      );
    }
    return false;
  }

  /**
   * Get component name
   */
  private getComponentName(node: ts.Node): string | undefined {
    if (ts.isFunctionDeclaration(node) && node.name) {
      return node.name.text;
    }
    if (node.parent && ts.isVariableDeclaration(node.parent) && node.parent.name) {
      if (ts.isIdentifier(node.parent.name)) {
        return node.parent.name.text;
      }
    }
    return undefined;
  }
}
