/**
 * Detectors for feature completeness analysis
 */

import * as ts from 'typescript';
import type {
  SourceFile,
  EndpointInfo,
  ComponentInfo,
  MockedServiceInfo
} from '../types';
import { ASTTraversal } from '../analysis/SourceFileParser';

/**
 * Detect backend API endpoints (Express-style)
 */
export class EndpointDetector {
  /**
   * Extract all endpoints from backend files
   */
  detectEndpoints(files: SourceFile[]): EndpointInfo[] {
    const endpoints: EndpointInfo[] = [];

    files.forEach(file => {
      if (!file.ast) return;

      // Find Express route definitions
      const expressEndpoints = this.findExpressRoutes(file);
      endpoints.push(...expressEndpoints);

      // Find Fastify route definitions
      const fastifyEndpoints = this.findFastifyRoutes(file);
      endpoints.push(...fastifyEndpoints);
    });

    return endpoints;
  }

  /**
   * Find Express routes: app.get('/path', handler), router.post('/path', handler)
   */
  private findExpressRoutes(file: SourceFile): EndpointInfo[] {
    const endpoints: EndpointInfo[] = [];
    const sourceFile = file.ast as ts.SourceFile;

    ASTTraversal.visit(sourceFile, node => {
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

            // Extract path from first argument
            if (ts.isStringLiteral(pathArg)) {
              const path = pathArg.text;
              const lineNumber = ASTTraversal.getLineNumber(node, sourceFile);

              // Get handler name if available
              const handler = this.extractHandlerName(args[1]);

              endpoints.push({
                path,
                method: method.toUpperCase(),
                filePath: file.path,
                lineNumber,
                handler,
                connectedToFrontend: false,
                usageCount: 0
              });
            }
          }
        }
      }
    });

    return endpoints;
  }

  /**
   * Find Fastify routes: fastify.get('/path', handler)
   */
  private findFastifyRoutes(file: SourceFile): EndpointInfo[] {
    // Similar logic to Express
    return [];
  }

  /**
   * Extract handler function name
   */
  private extractHandlerName(node: ts.Node | undefined): string {
    if (!node) return 'anonymous';

    if (ts.isIdentifier(node)) {
      return node.text;
    }

    if (ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
      return 'anonymous';
    }

    return 'unknown';
  }
}

/**
 * Detect frontend API calls
 */
export class APICallDetector {
  /**
   * Extract all API calls from frontend files
   */
  detectAPICalls(files: SourceFile[]): Array<{
    filePath: string;
    lineNumber: number;
    method: string;
    path: string;
  }> {
    const apiCalls: Array<{
      filePath: string;
      lineNumber: number;
      method: string;
      path: string;
    }> = [];

    files.forEach(file => {
      if (!file.ast) return;

      const calls = this.findFetchCalls(file);
      apiCalls.push(...calls);

      const axioCalls = this.findAxiosCalls(file);
      apiCalls.push(...axioCalls);
    });

    return apiCalls;
  }

  /**
   * Find fetch() calls
   */
  private findFetchCalls(
    file: SourceFile
  ): Array<{ filePath: string; lineNumber: number; method: string; path: string }> {
    const calls: Array<{
      filePath: string;
      lineNumber: number;
      method: string;
      path: string;
    }> = [];
    const sourceFile = file.ast as ts.SourceFile;

    const fetchCalls = ASTTraversal.findCallsByName(sourceFile, 'fetch');

    fetchCalls.forEach(call => {
      const args = call.arguments;
      if (args.length === 0) return;

      // First argument is URL
      const urlArg = args[0];
      let path = '';

      if (ts.isStringLiteral(urlArg)) {
        path = urlArg.text;
      } else if (ts.isTemplateExpression(urlArg)) {
        // Template string: `/api/users/${id}`
        path = this.extractTemplateStringPath(urlArg);
      }

      if (path) {
        // Extract method from options (second argument)
        let method = 'GET'; // Default
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

        calls.push({
          filePath: file.path,
          lineNumber: ASTTraversal.getLineNumber(call, sourceFile),
          method,
          path: this.normalizePath(path)
        });
      }
    });

    return calls;
  }

  /**
   * Find axios calls
   */
  private findAxiosCalls(
    file: SourceFile
  ): Array<{ filePath: string; lineNumber: number; method: string; path: string }> {
    const calls: Array<{
      filePath: string;
      lineNumber: number;
      method: string;
      path: string;
    }> = [];
    const sourceFile = file.ast as ts.SourceFile;

    // Find axios.get(), axios.post(), etc.
    ASTTraversal.visit(sourceFile, node => {
      if (ts.isCallExpression(node)) {
        const { expression, arguments: args } = node;

        if (
          ts.isPropertyAccessExpression(expression) &&
          ts.isIdentifier(expression.expression) &&
          expression.expression.text === 'axios' &&
          ts.isIdentifier(expression.name)
        ) {
          const method = expression.name.text.toUpperCase();
          const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

          if (httpMethods.includes(method) && args.length >= 1) {
            const urlArg = args[0];
            let path = '';

            if (ts.isStringLiteral(urlArg)) {
              path = urlArg.text;
            } else if (ts.isTemplateExpression(urlArg)) {
              path = this.extractTemplateStringPath(urlArg);
            }

            if (path) {
              calls.push({
                filePath: file.path,
                lineNumber: ASTTraversal.getLineNumber(node, sourceFile),
                method,
                path: this.normalizePath(path)
              });
            }
          }
        }
      }
    });

    return calls;
  }

  /**
   * Extract path from template string
   */
  private extractTemplateStringPath(template: ts.TemplateExpression): string {
    // Convert `/api/users/${id}` to `/api/users/:id`
    let path = template.head.text;

    template.templateSpans.forEach(span => {
      path += ':param' + span.literal.text;
    });

    return path;
  }

  /**
   * Normalize path for comparison
   * Convert `/api/users/123` to `/api/users/:id`
   */
  private normalizePath(path: string): string {
    // Remove leading slash
    path = path.replace(/^\//, '');

    // Remove query params
    path = path.split('?')[0];

    // Replace numeric IDs with :id
    path = path.replace(/\/\d+/g, '/:id');

    // Replace UUIDs with :id
    path = path.replace(/\/[0-9a-f-]{36}/gi, '/:id');

    return '/' + path;
  }
}

/**
 * Detect mocked services and hardcoded data
 */
export class MockDetector {
  /**
   * Detect mocked services in files
   */
  detectMocks(files: SourceFile[]): MockedServiceInfo[] {
    const mocks: MockedServiceInfo[] = [];

    files.forEach(file => {
      // Check file path for mock indicators
      if (this.isMockFile(file.path)) {
        const mockInfo: MockedServiceInfo = {
          serviceName: this.extractServiceName(file.path),
          filePath: file.path,
          lineNumber: 1,
          mockType: 'mock-function',
          affectedComponents: []
        };
        mocks.push(mockInfo);
      }

      // Check for hardcoded data arrays
      if (file.ast) {
        const hardcodedMocks = this.findHardcodedData(file);
        mocks.push(...hardcodedMocks);
      }
    });

    return mocks;
  }

  /**
   * Check if file is a mock file
   */
  private isMockFile(filePath: string): boolean {
    const mockIndicators = ['/mock/', '/mocks/', '__mocks__', '.mock.', '.stub.'];
    return mockIndicators.some(indicator => filePath.includes(indicator));
  }

  /**
   * Extract service name from file path
   */
  private extractServiceName(filePath: string): string {
    const parts = filePath.split('/');
    const fileName = parts[parts.length - 1];
    return fileName.replace(/\.(ts|js|tsx|jsx)$/, '');
  }

  /**
   * Find hardcoded data arrays
   */
  private findHardcodedData(file: SourceFile): MockedServiceInfo[] {
    const mocks: MockedServiceInfo[] = [];
    const sourceFile = file.ast as ts.SourceFile;

    ASTTraversal.visit(sourceFile, node => {
      // Find large array literals (> 3 elements) with object literals
      if (ts.isArrayLiteralExpression(node) && node.elements.length > 3) {
        const hasObjectElements = node.elements.some(el =>
          ts.isObjectLiteralExpression(el)
        );

        if (hasObjectElements) {
          mocks.push({
            serviceName: 'hardcoded-data',
            filePath: file.path,
            lineNumber: ASTTraversal.getLineNumber(node, sourceFile),
            mockType: 'hardcoded',
            affectedComponents: []
          });
        }
      }
    });

    return mocks;
  }
}

/**
 * Detect React/Vue components
 */
export class ComponentDetector {
  /**
   * Detect frontend components
   */
  detectComponents(files: SourceFile[]): ComponentInfo[] {
    const components: ComponentInfo[] = [];

    files.forEach(file => {
      if (!file.ast) return;

      const reactComponents = this.findReactComponents(file);
      components.push(...reactComponents);
    });

    return components;
  }

  /**
   * Find React components
   */
  private findReactComponents(file: SourceFile): ComponentInfo[] {
    const components: ComponentInfo[] = [];
    const sourceFile = file.ast as ts.SourceFile;

    ASTTraversal.visit(sourceFile, node => {
      // Function components
      if (ts.isFunctionDeclaration(node) && node.name) {
        const name = node.name.text;

        // Check if it's a component (PascalCase)
        if (this.isPascalCase(name)) {
          components.push({
            name,
            filePath: file.path,
            lineNumber: ASTTraversal.getLineNumber(node, sourceFile),
            apiCalls: [],
            connectedToBackend: false,
            usesRealData: true
          });
        }
      }

      // Arrow function components (export const Component = () => {})
      if (ts.isVariableDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
        const name = node.name.text;

        if (
          this.isPascalCase(name) &&
          node.initializer &&
          ts.isArrowFunction(node.initializer)
        ) {
          components.push({
            name,
            filePath: file.path,
            lineNumber: ASTTraversal.getLineNumber(node, sourceFile),
            apiCalls: [],
            connectedToBackend: false,
            usesRealData: true
          });
        }
      }
    });

    return components;
  }

  /**
   * Check if name is PascalCase
   */
  private isPascalCase(name: string): boolean {
    return /^[A-Z][a-zA-Z0-9]*$/.test(name);
  }
}
