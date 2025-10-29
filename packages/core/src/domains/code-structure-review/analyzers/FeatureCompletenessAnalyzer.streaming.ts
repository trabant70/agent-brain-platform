/**
 * Feature Completeness Analyzer (Streaming Version)
 *
 * Analyzes feature completeness using pre-populated metadata registries.
 * No AST traversal needed - all metadata already extracted.
 *
 * Detects:
 * - Disconnected backend endpoints (no frontend calling them)
 * - Disconnected API calls (calling non-existent endpoints)
 * - Mock/stub usage (temporary implementations)
 * - Components without tests
 */

import type { UnifiedMetadataRegistry } from '../registries/UnifiedMetadataRegistry';
import type {
  EndpointMetadata,
  APICallMetadata,
  ComponentMetadata,
  MockDataMetadata
} from '../registries/FeatureCompletenessRegistry';

export interface FeatureCompletenessIssue {
  type: 'disconnected-endpoint' | 'disconnected-api-call' | 'mock-usage' | 'untested-component';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  recommendation: string;
  filePath: string;
  lineNumber?: number;
  metadata?: any;
}

export interface FeatureCompletenessAnalysis {
  categoryId: string;
  categoryName: string;
  score: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  priority: number;
  issues: FeatureCompletenessIssue[];
  metrics: {
    totalEndpoints: number;
    connectedEndpoints: number;
    disconnectedEndpoints: number;
    totalAPICalls: number;
    connectedAPICalls: number;
    disconnectedAPICalls: number;
    totalComponents: number;
    testedComponents: number;
    untestedComponents: number;
    totalMocks: number;
    connectionRate: number;
    testCoverageRate: number;
  };
  summary: string;
}

/**
 * Feature Completeness Analyzer using streaming architecture
 */
export class FeatureCompletenessAnalyzerStreaming {
  private registry: UnifiedMetadataRegistry;

  constructor(registry: UnifiedMetadataRegistry) {
    this.registry = registry;
  }

  /**
   * Run analysis using registry data
   */
  analyze(): FeatureCompletenessAnalysis {
    console.log('[FeatureCompletenessAnalyzer] Starting analysis from registries');
    const startTime = Date.now();

    const issues: FeatureCompletenessIssue[] = [];

    // Get all metadata from registries
    const endpoints = this.registry.featureCompleteness.getAllEndpoints();
    const apiCalls = this.registry.featureCompleteness.getAllAPICalls();
    const components = this.registry.featureCompleteness.getAllComponents();
    const mocks = this.registry.featureCompleteness.getAllMocks();

    console.log(`[FeatureCompletenessAnalyzer] Loaded: ${endpoints.length} endpoints, ${apiCalls.length} API calls, ${components.length} components, ${mocks.length} mocks`);

    // Detect disconnected endpoints
    const disconnectedEndpoints = this.findDisconnectedEndpoints(endpoints, apiCalls);
    issues.push(...this.createDisconnectedEndpointIssues(disconnectedEndpoints));

    // Detect disconnected API calls
    const disconnectedAPICalls = this.findDisconnectedAPICalls(apiCalls, endpoints);
    issues.push(...this.createDisconnectedAPICallIssues(disconnectedAPICalls));

    // Detect mock usage
    issues.push(...this.createMockUsageIssues(mocks));

    // Detect untested components
    const untestedComponents = this.findUntestedComponents(components);
    issues.push(...this.createUntestedComponentIssues(untestedComponents));

    // Calculate metrics
    const connectedEndpoints = endpoints.length - disconnectedEndpoints.length;
    const connectedAPICalls = apiCalls.length - disconnectedAPICalls.length;
    const testedComponents = components.length - untestedComponents.length;

    const connectionRate = endpoints.length > 0
      ? Math.round((connectedEndpoints / endpoints.length) * 100)
      : 100;

    const testCoverageRate = components.length > 0
      ? Math.round((testedComponents / components.length) * 100)
      : 100;

    const metrics = {
      totalEndpoints: endpoints.length,
      connectedEndpoints,
      disconnectedEndpoints: disconnectedEndpoints.length,
      totalAPICalls: apiCalls.length,
      connectedAPICalls,
      disconnectedAPICalls: disconnectedAPICalls.length,
      totalComponents: components.length,
      testedComponents,
      untestedComponents: untestedComponents.length,
      totalMocks: mocks.length,
      connectionRate,
      testCoverageRate
    };

    // Calculate score
    const score = this.calculateScore(metrics);
    const status = this.getStatus(score);

    const duration = Date.now() - startTime;
    console.log(`[FeatureCompletenessAnalyzer] ✓ Analysis complete: ${issues.length} issues found, score: ${score}/100 in ${duration}ms`);

    return {
      categoryId: 'feature-completeness',
      categoryName: 'Feature Completeness',
      score,
      status,
      priority: 1,
      issues,
      metrics,
      summary: this.generateSummary(metrics, issues.length)
    };
  }

  /**
   * Find endpoints that are not called by any frontend code
   */
  private findDisconnectedEndpoints(
    endpoints: EndpointMetadata[],
    apiCalls: APICallMetadata[]
  ): EndpointMetadata[] {
    return endpoints.filter(endpoint => {
      // Check if any API call matches this endpoint
      const hasMatch = apiCalls.some(call =>
        this.matchesEndpoint(call, endpoint)
      );
      return !hasMatch;
    });
  }

  /**
   * Find API calls that don't have corresponding endpoints
   */
  private findDisconnectedAPICalls(
    apiCalls: APICallMetadata[],
    endpoints: EndpointMetadata[]
  ): APICallMetadata[] {
    return apiCalls.filter(call => {
      // Check if any endpoint matches this call
      const hasMatch = endpoints.some(endpoint =>
        this.matchesEndpoint(call, endpoint)
      );
      return !hasMatch;
    });
  }

  /**
   * Check if API call matches endpoint
   */
  private matchesEndpoint(call: APICallMetadata, endpoint: EndpointMetadata): boolean {
    // Normalize paths for comparison
    const callPath = this.normalizePath(call.path);
    const endpointPath = this.normalizePath(endpoint.path);

    // Method must match
    if (call.method.toUpperCase() !== endpoint.method.toUpperCase()) {
      return false;
    }

    // Exact path match
    if (callPath === endpointPath) {
      return true;
    }

    // Pattern match (e.g., /users/:id matches /users/123)
    if (this.pathMatchesPattern(callPath, endpointPath)) {
      return true;
    }

    return false;
  }

  /**
   * Normalize API path for comparison
   */
  private normalizePath(path: string): string {
    // Remove leading/trailing slashes, query params, hash
    let normalized = path.replace(/^\/+|\/+$/g, '');
    normalized = normalized.split('?')[0];
    normalized = normalized.split('#')[0];
    return normalized.toLowerCase();
  }

  /**
   * Check if path matches pattern (e.g., /users/123 matches /users/:id)
   */
  private pathMatchesPattern(path: string, pattern: string): boolean {
    const pathParts = path.split('/');
    const patternParts = pattern.split('/');

    if (pathParts.length !== patternParts.length) {
      return false;
    }

    return patternParts.every((part, i) => {
      // Pattern parameter (e.g., :id, {id}, [id])
      if (part.startsWith(':') || part.startsWith('{') || part.startsWith('[')) {
        return true;
      }
      return part === pathParts[i];
    });
  }

  /**
   * Find components without corresponding tests
   */
  private findUntestedComponents(components: ComponentMetadata[]): ComponentMetadata[] {
    return components.filter(component => {
      const hasTest = this.registry.testCoverage.hasTest(component.filePath);
      return !hasTest;
    });
  }

  /**
   * Create issues for disconnected endpoints
   */
  private createDisconnectedEndpointIssues(endpoints: EndpointMetadata[]): FeatureCompletenessIssue[] {
    return endpoints.map(endpoint => ({
      type: 'disconnected-endpoint',
      severity: 'high',
      title: `Disconnected endpoint: ${endpoint.method} ${endpoint.path}`,
      description: `Backend endpoint ${endpoint.method} ${endpoint.path} is not called by any frontend code. This endpoint may be unused, deprecated, or missing frontend integration.`,
      recommendation: 'Verify if this endpoint should be connected to the frontend, or remove it if it\'s no longer needed.',
      filePath: endpoint.filePath,
      lineNumber: endpoint.lineNumber,
      metadata: endpoint
    }));
  }

  /**
   * Create issues for disconnected API calls
   */
  private createDisconnectedAPICallIssues(apiCalls: APICallMetadata[]): FeatureCompletenessIssue[] {
    return apiCalls.map(call => ({
      type: 'disconnected-api-call',
      severity: call.hasErrorHandling ? 'medium' : 'high',
      title: `Disconnected API call: ${call.method} ${call.path}`,
      description: `Frontend makes API call to ${call.method} ${call.path}, but no corresponding backend endpoint was found. This will cause runtime errors.`,
      recommendation: 'Create the missing backend endpoint, or update the API call to use the correct endpoint path.',
      filePath: call.filePath,
      lineNumber: call.lineNumber,
      metadata: call
    }));
  }

  /**
   * Create issues for mock usage
   */
  private createMockUsageIssues(mocks: MockDataMetadata[]): FeatureCompletenessIssue[] {
    return mocks.map(mock => ({
      type: 'mock-usage',
      severity: mock.isPermanent ? 'low' : 'medium',
      title: `Mock data detected: ${mock.name}`,
      description: `File contains mock/stub data that should be replaced with real implementation. Mock type: ${mock.type}.`,
      recommendation: mock.isPermanent
        ? 'Document that this is intentional test/demo data.'
        : 'Replace mock data with real API integration.',
      filePath: mock.filePath,
      lineNumber: mock.lineNumber,
      metadata: mock
    }));
  }

  /**
   * Create issues for untested components
   */
  private createUntestedComponentIssues(components: ComponentMetadata[]): FeatureCompletenessIssue[] {
    return components.map(component => ({
      type: 'untested-component',
      severity: component.asyncOperations && component.asyncOperations > 0 ? 'high' : 'medium',
      title: `Untested component: ${component.name}`,
      description: `Component ${component.name} does not have a corresponding test file. ${component.asyncOperations ? `This component has ${component.asyncOperations} async operations that should be tested.` : ''}`,
      recommendation: `Create test file for ${component.name} to ensure reliability.`,
      filePath: component.filePath,
      lineNumber: component.lineNumber,
      metadata: component
    }));
  }

  /**
   * Calculate overall score
   */
  private calculateScore(metrics: FeatureCompletenessAnalysis['metrics']): number {
    // Weight different factors
    const connectionScore = metrics.connectionRate * 0.4; // 40% weight
    const testCoverageScore = metrics.testCoverageRate * 0.3; // 30% weight

    // Mock penalty
    const mockPenalty = Math.min(metrics.totalMocks * 2, 20); // Up to -20 points

    // Disconnected API calls are critical
    const disconnectedCallPenalty = metrics.disconnectedAPICalls * 5; // -5 points each

    const rawScore = connectionScore + testCoverageScore - mockPenalty - disconnectedCallPenalty;
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
  private generateSummary(metrics: FeatureCompletenessAnalysis['metrics'], issueCount: number): string {
    const parts: string[] = [];

    parts.push(`Found ${issueCount} feature completeness issues.`);

    if (metrics.disconnectedEndpoints > 0) {
      parts.push(`${metrics.disconnectedEndpoints} endpoints are not connected to the frontend.`);
    }

    if (metrics.disconnectedAPICalls > 0) {
      parts.push(`${metrics.disconnectedAPICalls} API calls have no corresponding backend endpoint.`);
    }

    if (metrics.untestedComponents > 0) {
      parts.push(`${metrics.untestedComponents} components lack test coverage.`);
    }

    if (metrics.totalMocks > 0) {
      parts.push(`${metrics.totalMocks} mock implementations should be replaced with real code.`);
    }

    if (issueCount === 0) {
      return 'All features are well-connected and tested. Great job!';
    }

    return parts.join(' ');
  }
}
