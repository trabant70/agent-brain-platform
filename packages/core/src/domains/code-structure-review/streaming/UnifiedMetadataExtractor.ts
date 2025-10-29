/**
 * Unified Metadata Extractor
 *
 * Extracts ALL metadata types from a single file in ONE pass:
 * - Feature Completeness: Endpoints, API calls, Components, Mocks
 * - UI/UX Quality: Async ops, Forms, Lists, User actions, Accessibility
 * - Test Coverage: File metadata
 * - I18n: Strings, Date/time, Numbers, RTL
 *
 * This is the key to memory efficiency: Extract once, discard AST immediately.
 */

import * as ts from 'typescript';
import type { SourceFile } from '../types';
import { UnifiedMetadataRegistry } from '../registries/UnifiedMetadataRegistry';
import { TestCoverageRegistry } from '../registries/TestCoverageRegistry';
import { InternationalizationRegistry } from '../registries/InternationalizationRegistry';
import { Logger, LogCategory, LogPathway } from '../../../infrastructure/logging/Logger';

const logger = Logger.getInstance();

/**
 * File classification result
 */
interface FileClassification {
  isBackend: boolean;
  isFrontend: boolean;
  isTest: boolean;
  isProduction: boolean;
  importance: 'critical' | 'high' | 'medium' | 'low';
  category: 'service' | 'component' | 'api' | 'utility' | 'page' | 'middleware' | 'model' | 'other';
}

/**
 * Main metadata extractor class
 */
export class UnifiedMetadataExtractor {
  /**
   * Extract ALL metadata from a single file
   * Called once per file during streaming
   */
  extract(file: SourceFile, registry: UnifiedMetadataRegistry): void {
    logger.trace(LogCategory.DATA, `Extracting metadata from: ${file.path}`, 'MetadataExtractor', undefined, LogPathway.DATA_INGESTION);

    // Classify file first
    const classification = this.classifyFile(file.path);

    // Extract file metadata (no AST needed)
    this.extractFileMetadata(file, classification, registry);

    // If no AST, skip AST-based extraction
    if (!file.ast) {
      logger.trace(LogCategory.DATA, `No AST for: ${file.path}, skipping AST extraction`, 'MetadataExtractor', undefined, LogPathway.DATA_INGESTION);
      return;
    }

    const sourceFile = file.ast as ts.SourceFile;

    // Extract based on file type
    if (classification.isBackend) {
      this.extractEndpoints(sourceFile, file.path, registry);
    }

    if (classification.isFrontend) {
      this.extractAPICallsAndComponents(sourceFile, file.path, registry);
      this.extractFormMetadata(sourceFile, file.path, registry);
      this.extractListRenderings(sourceFile, file.path, registry);
      this.extractUserActions(sourceFile, file.path, registry);
      this.extractAccessibilityIssues(sourceFile, file.path, registry);
    }

    // Extract from all files (regardless of type)
    this.extractAsyncOperations(sourceFile, file.path, registry);
    this.extractStringLiterals(sourceFile, file.path, registry);
    this.extractDateTimeOperations(sourceFile, file.path, registry);
    this.extractNumberFormatting(sourceFile, file.path, registry);
    this.extractRTLIssues(sourceFile, file.path, registry);
    this.extractMockData(sourceFile, file.path, registry);

    logger.trace(LogCategory.DATA, `✓ Extraction complete for: ${file.path}`, 'MetadataExtractor', undefined, LogPathway.DATA_INGESTION);
  }

  // ==================== File Classification ====================

  /**
   * Classify file type and importance
   */
  private classifyFile(filePath: string): FileClassification {
    const path = filePath.toLowerCase();

    const isTest = TestCoverageRegistry.isTestFile(filePath);
    const isProduction = !isTest;

    const isBackend = (
      path.includes('/server/') ||
      path.includes('/api/') ||
      path.includes('/backend/') ||
      path.includes('/routes/') ||
      /\.(route|controller|service)\.(ts|js)$/.test(path)
    );

    const isFrontend = (
      path.includes('/components/') ||
      path.includes('/pages/') ||
      path.includes('/views/') ||
      path.includes('/frontend/') ||
      path.includes('/client/') ||
      path.endsWith('.tsx') ||
      path.endsWith('.jsx')
    );

    const importance = TestCoverageRegistry.determineImportance(filePath);
    const category = TestCoverageRegistry.categorizeFile(filePath);

    return {
      isBackend,
      isFrontend,
      isTest,
      isProduction,
      importance,
      category
    };
  }

  // ==================== Test Coverage Extraction ====================

  /**
   * Extract file metadata (no AST needed)
   */
  private extractFileMetadata(
    file: SourceFile,
    classification: FileClassification,
    registry: UnifiedMetadataRegistry
  ): void {
    registry.testCoverage.addFile({
      path: file.path,
      isTestFile: classification.isTest,
      isProductionFile: classification.isProduction,
      importance: classification.importance,
      category: classification.category,
      hasCorrespondingTest: false, // Will be updated later
      size: file.size,
      lines: file.lines
    });
  }

  // ==================== Feature Completeness Extraction ====================

  /**
   * Extract backend API endpoints
   */
  private extractEndpoints(
    sourceFile: ts.SourceFile,
    filePath: string,
    registry: UnifiedMetadataRegistry
  ): void {
    this.visit(sourceFile, (node) => {
      if (ts.isCallExpression(node)) {
        const { expression, arguments: args } = node;

        // Check for app.METHOD() or router.METHOD()
        if (
          ts.isPropertyAccessExpression(expression) &&
          ts.isIdentifier(expression.name)
        ) {
          const method = expression.name.text;
          const httpMethods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];

          if (httpMethods.includes(method) && args.length >= 1) {
            const pathArg = args[0];

            if (ts.isStringLiteral(pathArg)) {
              const path = pathArg.text;
              const lineNumber = this.getLineNumber(node, sourceFile);

              registry.featureCompleteness.addEndpoint({
                path,
                method: method.toUpperCase(),
                filePath,
                lineNumber,
                handler: this.extractHandlerName(args[1])
              });
            }
          }
        }
      }
    });
  }

  /**
   * Extract API calls and components
   */
  private extractAPICallsAndComponents(
    sourceFile: ts.SourceFile,
    filePath: string,
    registry: UnifiedMetadataRegistry
  ): void {
    // Extract components
    this.extractComponents(sourceFile, filePath, registry);

    // Extract API calls (fetch, axios)
    this.visit(sourceFile, (node) => {
      if (ts.isCallExpression(node)) {
        const { expression } = node;

        // fetch() calls
        if (ts.isIdentifier(expression) && expression.text === 'fetch') {
          const apiCall = this.extractFetchCall(node, sourceFile, filePath);
          if (apiCall) {
            registry.featureCompleteness.addAPICall(apiCall);
          }
        }

        // axios calls
        if (
          ts.isPropertyAccessExpression(expression) &&
          ts.isIdentifier(expression.expression) &&
          expression.expression.text === 'axios' &&
          ts.isIdentifier(expression.name)
        ) {
          const apiCall = this.extractAxiosCall(node, expression, sourceFile, filePath);
          if (apiCall) {
            registry.featureCompleteness.addAPICall(apiCall);
          }
        }
      }
    });
  }

  /**
   * Extract components (React/Vue)
   */
  private extractComponents(
    sourceFile: ts.SourceFile,
    filePath: string,
    registry: UnifiedMetadataRegistry
  ): void {
    this.visit(sourceFile, (node) => {
      // Function components: function MyComponent() or const MyComponent = () =>
      if (ts.isFunctionDeclaration(node) || ts.isVariableStatement(node)) {
        const component = this.extractFunctionComponent(node, sourceFile, filePath);
        if (component) {
          registry.featureCompleteness.addComponent(component);
        }
      }

      // Class components: class MyComponent extends React.Component
      if (ts.isClassDeclaration(node) && node.name) {
        const name = node.name.text;
        if (this.isPascalCase(name)) {
          registry.featureCompleteness.addComponent({
            name,
            filePath,
            lineNumber: this.getLineNumber(node, sourceFile),
            type: 'class'
          });
        }
      }
    });
  }

  /**
   * Extract fetch() call metadata
   */
  private extractFetchCall(
    node: ts.CallExpression,
    sourceFile: ts.SourceFile,
    filePath: string
  ): any | null {
    const args = node.arguments;
    if (args.length === 0) return null;

    const urlArg = args[0];
    let path = '';

    if (ts.isStringLiteral(urlArg)) {
      path = urlArg.text;
    } else if (ts.isTemplateExpression(urlArg)) {
      path = this.extractTemplateStringPath(urlArg);
    }

    if (!path) return null;

    let method = 'GET';
    if (args.length >= 2 && ts.isObjectLiteralExpression(args[1])) {
      const methodProp = args[1].properties.find(
        prop =>
          ts.isPropertyAssignment(prop) &&
          ts.isIdentifier(prop.name) &&
          prop.name.text === 'method'
      );

      if (
        methodProp &&
        ts.isPropertyAssignment(methodProp) &&
        ts.isStringLiteral(methodProp.initializer)
      ) {
        method = methodProp.initializer.text.toUpperCase();
      }
    }

    return {
      path,
      method,
      filePath,
      lineNumber: this.getLineNumber(node, sourceFile),
      hasErrorHandling: this.hasErrorHandling(node),
      hasLoadingState: false // Will need context analysis
    };
  }

  /**
   * Extract axios call metadata
   */
  private extractAxiosCall(
    node: ts.CallExpression,
    expression: ts.PropertyAccessExpression,
    sourceFile: ts.SourceFile,
    filePath: string
  ): any | null {
    const method = expression.name.text.toUpperCase();
    const args = node.arguments;

    if (args.length > 0 && ts.isStringLiteral(args[0])) {
      return {
        path: args[0].text,
        method,
        filePath,
        lineNumber: this.getLineNumber(node, sourceFile),
        hasErrorHandling: this.hasErrorHandling(node),
        hasLoadingState: false
      };
    }

    return null;
  }

  /**
   * Extract function component
   */
  private extractFunctionComponent(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: string
  ): any | null {
    let componentName: string | undefined;
    let lineNumber: number | undefined;

    if (ts.isFunctionDeclaration(node) && node.name) {
      const name = node.name.text;
      if (this.isPascalCase(name)) {
        componentName = name;
        lineNumber = this.getLineNumber(node, sourceFile);
      }
    } else if (ts.isVariableStatement(node)) {
      const declaration = node.declarationList.declarations[0];
      if (
        declaration &&
        ts.isIdentifier(declaration.name) &&
        declaration.initializer &&
        (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer))
      ) {
        const name = declaration.name.text;
        if (this.isPascalCase(name)) {
          componentName = name;
          lineNumber = this.getLineNumber(declaration, sourceFile);
        }
      }
    }

    if (componentName && lineNumber) {
      return {
        name: componentName,
        filePath,
        lineNumber,
        type: 'functional' as const
      };
    }

    return null;
  }

  /**
   * Extract mock data
   */
  private extractMockData(
    sourceFile: ts.SourceFile,
    filePath: string,
    registry: UnifiedMetadataRegistry
  ): void {
    this.visit(sourceFile, (node) => {
      // Hardcoded arrays with objects (common mock pattern)
      if (ts.isArrayLiteralExpression(node) && node.elements.length > 0) {
        const firstElement = node.elements[0];
        if (ts.isObjectLiteralExpression(firstElement)) {
          registry.featureCompleteness.addMock({
            name: 'hardcoded-array',
            type: 'hardcoded-array',
            filePath,
            lineNumber: this.getLineNumber(node, sourceFile),
            isPermanent: false,
            dataShape: `Array of ${node.elements.length} objects`
          });
        }
      }
    });
  }

  // ==================== UI/UX Quality Extraction ====================

  /**
   * Extract async operations
   */
  private extractAsyncOperations(
    sourceFile: ts.SourceFile,
    filePath: string,
    registry: UnifiedMetadataRegistry
  ): void {
    this.visit(sourceFile, (node) => {
      let asyncOp: any | null = null;

      // Await expressions
      if (ts.isAwaitExpression(node)) {
        const containingFunction = this.getContainingFunction(node);
        const componentName = containingFunction ? this.getComponentName(containingFunction) : undefined;

        asyncOp = {
          type: 'await' as const,
          filePath,
          lineNumber: this.getLineNumber(node, sourceFile),
          componentName,
          hasErrorHandler: this.hasErrorHandling(node),
          hasLoadingState: false,
          hasTryFinally: this.isInTryFinally(node),
          hasLoadingVariable: containingFunction ? this.hasLoadingStateVariable(containingFunction, sourceFile) : false,
          hasErrorVariable: containingFunction ? this.hasErrorStateVariable(containingFunction) : false,
          inComponent: !!componentName
        };
      }

      // Async function declarations
      if (
        (ts.isFunctionDeclaration(node) ||
          ts.isArrowFunction(node) ||
          ts.isMethodDeclaration(node)) &&
        node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword)
      ) {
        const functionName = ts.isFunctionDeclaration(node) && node.name
          ? node.name.text
          : 'anonymous';

        asyncOp = {
          type: 'async-function' as const,
          filePath,
          lineNumber: this.getLineNumber(node, sourceFile),
          functionName,
          hasErrorHandler: this.hasErrorHandling(node),
          hasLoadingState: false,
          hasTryFinally: false,
          inComponent: false
        };
      }

      if (asyncOp) {
        registry.uiuxQuality.addAsyncOperation(asyncOp);
      }
    });
  }

  /**
   * Extract form metadata
   */
  private extractFormMetadata(
    sourceFile: ts.SourceFile,
    filePath: string,
    registry: UnifiedMetadataRegistry
  ): void {
    // Look for form elements in JSX
    this.visit(sourceFile, (node) => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tagName = node.tagName;
        if (ts.isIdentifier(tagName) && tagName.text.toLowerCase() === 'form') {
          const hasValidation = this.formHasValidation(node);
          const hasSubmitHandler = this.formHasSubmitHandler(node);

          registry.uiuxQuality.addForm({
            formName: 'Form',
            filePath,
            lineNumber: this.getLineNumber(node, sourceFile),
            hasValidation,
            hasSubmitHandler
          });
        }
      }
    });
  }

  /**
   * Extract list renderings
   */
  private extractListRenderings(
    sourceFile: ts.SourceFile,
    filePath: string,
    registry: UnifiedMetadataRegistry
  ): void {
    this.visit(sourceFile, (node) => {
      // Look for .map() calls
      if (ts.isCallExpression(node)) {
        const { expression } = node;
        if (
          ts.isPropertyAccessExpression(expression) &&
          ts.isIdentifier(expression.name) &&
          expression.name.text === 'map'
        ) {
          const componentName = this.getContainingComponentName(node);
          const hasEmptyStateCheck = this.hasEmptyStateCheck(node);

          if (componentName) {
            registry.uiuxQuality.addListRendering({
              componentName,
              filePath,
              lineNumber: this.getLineNumber(node, sourceFile),
              hasEmptyStateCheck,
              hasEmptyState: hasEmptyStateCheck,
              arraySource: 'unknown',
              renderMethod: '.map'
            });
          }
        }
      }
    });
  }

  /**
   * Extract user actions
   */
  private extractUserActions(
    sourceFile: ts.SourceFile,
    filePath: string,
    registry: UnifiedMetadataRegistry
  ): void {
    // Look for button clicks, form submits in JSX
    this.visit(sourceFile, (node) => {
      if (ts.isJsxAttribute(node)) {
        if (ts.isIdentifier(node.name)) {
          const attrName = node.name.text;

          if (attrName === 'onClick' || attrName === 'onSubmit') {
            const componentName = this.getContainingComponentName(node);
            if (componentName) {
              registry.uiuxQuality.addUserAction({
                actionType: attrName === 'onClick' ? 'button-click' : 'form-submit',
                componentName,
                filePath,
                lineNumber: this.getLineNumber(node, sourceFile),
                hasFeedback: false, // Would need deeper analysis
                isAsync: false
              });
            }
          }
        }
      }
    });
  }

  /**
   * Extract accessibility issues
   */
  private extractAccessibilityIssues(
    sourceFile: ts.SourceFile,
    filePath: string,
    registry: UnifiedMetadataRegistry
  ): void {
    this.visit(sourceFile, (node) => {
      // Check for img without alt
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tagName = node.tagName;
        if (ts.isIdentifier(tagName) && tagName.text === 'img') {
          const hasAlt = node.attributes.properties.some(
            prop =>
              ts.isJsxAttribute(prop) &&
              ts.isIdentifier(prop.name) &&
              prop.name.text === 'alt'
          );

          if (!hasAlt) {
            const componentName = this.getContainingComponentName(node) || 'Unknown';
            registry.uiuxQuality.addAccessibilityIssue({
              issueType: 'missing-alt',
              componentName,
              filePath,
              lineNumber: this.getLineNumber(node, sourceFile),
              severity: 'high',
              wcagLevel: 'A',
              element: 'img'
            });
          }
        }
      }
    });
  }

  // ==================== I18n Extraction ====================

  /**
   * Extract string literals
   */
  private extractStringLiterals(
    sourceFile: ts.SourceFile,
    filePath: string,
    registry: UnifiedMetadataRegistry
  ): void {
    this.visit(sourceFile, (node) => {
      if (ts.isStringLiteral(node)) {
        const text = node.text;

        // Check if user-facing
        if (InternationalizationRegistry.isLikelyUserFacing(text)) {
          const hasTranslation = this.isWrappedInTranslationFunction(node);
          const inJSX = this.isInJSX(node);
          const context = this.getStringContext(node);

          registry.i18n.addStringLiteral({
            text,
            filePath,
            lineNumber: this.getLineNumber(node, sourceFile),
            isUserFacing: true,
            context,
            inJSX,
            hasTranslation,
            suggestedKey: InternationalizationRegistry.suggestTranslationKey(text)
          });
        }
      }
    });
  }

  /**
   * Extract date/time operations
   */
  private extractDateTimeOperations(
    sourceFile: ts.SourceFile,
    filePath: string,
    registry: UnifiedMetadataRegistry
  ): void {
    this.visit(sourceFile, (node) => {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        const methodName = node.expression.name.text;

        // toLocaleDateString, toLocaleTimeString without locale
        if (
          (methodName === 'toLocaleDateString' ||
            methodName === 'toLocaleTimeString' ||
            methodName === 'toLocaleString') &&
          node.arguments.length === 0
        ) {
          registry.i18n.addDateTimeOperation({
            filePath,
            lineNumber: this.getLineNumber(node, sourceFile),
            type: methodName === 'toLocaleDateString' ? 'date' : methodName === 'toLocaleTimeString' ? 'time' : 'datetime',
            functionName: methodName,
            usesLocale: false,
            requiresLocalization: true,
            isUserFacing: true,
            issueType: 'no-locale',
            method: methodName,
            code: node.getText(sourceFile).substring(0, 100),
            hasLocaleParam: false
          });
        }
      }
    });
  }

  /**
   * Extract number formatting
   */
  private extractNumberFormatting(
    sourceFile: ts.SourceFile,
    filePath: string,
    registry: UnifiedMetadataRegistry
  ): void {
    this.visit(sourceFile, (node) => {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        const methodName = node.expression.name.text;

        // toLocaleString on numbers without locale
        if (methodName === 'toLocaleString' && node.arguments.length === 0) {
          registry.i18n.addNumberFormat({
            filePath,
            lineNumber: this.getLineNumber(node, sourceFile),
            type: 'number',
            usesLocale: false,
            requiresLocalization: true,
            isUserFacing: true,
            issueType: 'no-locale',
            code: node.getText(sourceFile).substring(0, 100),
            hasLocaleParam: false,
            isCurrency: false
          });
        }
      }
    });
  }

  /**
   * Extract RTL issues
   */
  private extractRTLIssues(
    sourceFile: ts.SourceFile,
    filePath: string,
    registry: UnifiedMetadataRegistry
  ): void {
    // Look for style properties with directional values
    this.visit(sourceFile, (node) => {
      if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name)) {
        const propertyName = node.name.text;

        if (InternationalizationRegistry.isDirectionalProperty(propertyName)) {
          registry.i18n.addRTLIssue({
            filePath,
            lineNumber: this.getLineNumber(node, sourceFile),
            severity: 'medium',
            issueType: 'directional-property',
            property: propertyName,
            propertyName: propertyName,
            suggestion: InternationalizationRegistry.suggestLogicalProperty(propertyName)
          });
        }
      }
    });
  }

  // ==================== Helper Methods ====================

  /**
   * Visit all nodes in AST
   */
  private visit(node: ts.Node, callback: (node: ts.Node) => void): void {
    callback(node);
    ts.forEachChild(node, child => this.visit(child, callback));
  }

  /**
   * Get line number for node
   */
  private getLineNumber(node: ts.Node, sourceFile: ts.SourceFile): number {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    return line + 1; // Convert to 1-based
  }

  /**
   * Extract handler function name
   */
  private extractHandlerName(node: ts.Node | undefined): string {
    if (!node) return 'anonymous';
    if (ts.isIdentifier(node)) return node.text;
    return 'anonymous';
  }

  /**
   * Extract path from template string
   */
  private extractTemplateStringPath(node: ts.TemplateExpression): string {
    const head = node.head.text;
    return head || '/api/...';
  }

  /**
   * Check if node has error handling
   */
  private hasErrorHandling(node: ts.Node): boolean {
    let current = node.parent;
    while (current) {
      if (ts.isTryStatement(current)) return true;
      current = current.parent;
    }
    return false;
  }

  /**
   * Check if node is in try-finally
   */
  private isInTryFinally(node: ts.Node): boolean {
    let current = node.parent;
    while (current) {
      if (ts.isTryStatement(current) && current.finallyBlock) return true;
      current = current.parent;
    }
    return false;
  }

  /**
   * Check if component has loading state variable
   */
  private hasLoadingStateVariable(component: ts.Node, sourceFile: ts.SourceFile): boolean {
    let hasLoading = false;
    this.visit(component, node => {
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
   * Check if component has error state variable
   */
  private hasErrorStateVariable(scope: ts.Node): boolean {
    let hasError = false;
    this.visit(scope, node => {
      if (ts.isVariableDeclaration(node)) {
        if (
          node.name &&
          ts.isIdentifier(node.name) &&
          node.name.text.toLowerCase().includes('error')
        ) {
          hasError = true;
        }
      }
    });
    return hasError;
  }

  /**
   * Get containing function
   */
  private getContainingFunction(node: ts.Node): ts.Node | undefined {
    let current = node.parent;
    while (current) {
      if (
        ts.isFunctionDeclaration(current) ||
        ts.isArrowFunction(current) ||
        ts.isMethodDeclaration(current)
      ) {
        return current;
      }
      current = current.parent;
    }
    return undefined;
  }

  /**
   * Get component name from function
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

  /**
   * Get containing component name
   */
  private getContainingComponentName(node: ts.Node): string | undefined {
    const func = this.getContainingFunction(node);
    return func ? this.getComponentName(func) : undefined;
  }

  /**
   * Check if PascalCase
   */
  private isPascalCase(name: string): boolean {
    return /^[A-Z][a-zA-Z0-9]*$/.test(name);
  }

  /**
   * Check if node is wrapped in translation function
   */
  private isWrappedInTranslationFunction(node: ts.Node): boolean {
    if (node.parent && ts.isCallExpression(node.parent)) {
      const { expression } = node.parent;
      if (ts.isIdentifier(expression)) {
        const name = expression.text;
        return name === 't' || name === 'i18n' || name === '$t' || name === 'translate';
      }
    }
    return false;
  }

  /**
   * Check if node is in JSX
   */
  private isInJSX(node: ts.Node): boolean {
    let current = node.parent;
    while (current) {
      if (
        ts.isJsxElement(current) ||
        ts.isJsxSelfClosingElement(current) ||
        ts.isJsxExpression(current)
      ) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  /**
   * Get string context
   */
  private getStringContext(node: ts.Node): 'jsx' | 'object-property' | 'string-literal' {
    if (this.isInJSX(node)) return 'jsx';
    if (node.parent && ts.isPropertyAssignment(node.parent)) return 'object-property';
    return 'string-literal';
  }

  /**
   * Check if form has validation
   */
  private formHasValidation(node: ts.JsxOpeningElement | ts.JsxSelfClosingElement): boolean {
    // Look for validation-related attributes
    return node.attributes.properties.some(
      prop =>
        ts.isJsxAttribute(prop) &&
        ts.isIdentifier(prop.name) &&
        (prop.name.text.includes('valid') || prop.name.text.includes('error'))
    );
  }

  /**
   * Check if form has submit handler
   */
  private formHasSubmitHandler(node: ts.JsxOpeningElement | ts.JsxSelfClosingElement): boolean {
    return node.attributes.properties.some(
      prop =>
        ts.isJsxAttribute(prop) &&
        ts.isIdentifier(prop.name) &&
        prop.name.text === 'onSubmit'
    );
  }

  /**
   * Check if list has empty state check
   */
  private hasEmptyStateCheck(node: ts.Node): boolean {
    // Look for length check in parent nodes
    let current = node.parent;
    let depth = 0;
    while (current && depth < 5) {
      if (ts.isConditionalExpression(current)) {
        return true;
      }
      if (ts.isIfStatement(current)) {
        return true;
      }
      current = current.parent;
      depth++;
    }
    return false;
  }
}
