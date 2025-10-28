/**
 * Feature Completeness Analyzer
 *
 * Detects:
 * - Disconnected backend endpoints (no frontend calling them)
 * - Disconnected frontend components (calling non-existent APIs)
 * - Mocked services (hardcoded data, static JSON)
 * - Incomplete features (missing backend, frontend, or tests)
 */

import type {
  CategoryAnalysis,
  AnalysisContext,
  Issue,
  CategoryConfig,
  FeatureCompletenessResult,
  EndpointInfo,
  ComponentInfo
} from '../../types';
import { AnalysisCategory } from '../base/AnalysisCategory';
import { CATEGORY_IDS, CATEGORY_METADATA, CategoryPriority } from '../base/CategoryTypes';
import {
  EndpointDetector,
  APICallDetector,
  MockDetector,
  ComponentDetector
} from '../../detectors/FeatureDetectors';

/**
 * Analyzes feature completeness across frontend and backend
 */
export class FeatureCompletenessAnalyzer extends AnalysisCategory {
  private endpointDetector: EndpointDetector;
  private apiCallDetector: APICallDetector;
  private mockDetector: MockDetector;
  private componentDetector: ComponentDetector;

  constructor(config?: Partial<CategoryConfig>) {
    const metadata = CATEGORY_METADATA[CATEGORY_IDS.FEATURE_COMPLETENESS];

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

    this.endpointDetector = new EndpointDetector();
    this.apiCallDetector = new APICallDetector();
    this.mockDetector = new MockDetector();
    this.componentDetector = new ComponentDetector();
  }

  /**
   * Run feature completeness analysis
   */
  async analyze(context: AnalysisContext): Promise<CategoryAnalysis> {
    const issues: Issue[] = [];
    const metrics: Record<string, number> = {};

    // Separate backend and frontend files
    const backendFiles = this.filterBackendFiles(context.files);
    const frontendFiles = this.filterFrontendFiles(context.files);

    // Detect all endpoints and API calls
    const endpoints = this.endpointDetector.detectEndpoints(backendFiles);
    const apiCalls = this.apiCallDetector.detectAPICalls(frontendFiles);
    const mocks = this.mockDetector.detectMocks(context.files);
    const components = this.componentDetector.detectComponents(frontendFiles);

    // Match endpoints with API calls
    const { connectedEndpoints, disconnectedEndpoints } = this.matchEndpointsWithCalls(
      endpoints,
      apiCalls
    );

    // Match API calls with endpoints
    const disconnectedCalls = this.findDisconnectedCalls(apiCalls, endpoints);

    // Update connection status
    endpoints.forEach(endpoint => {
      endpoint.connectedToFrontend = connectedEndpoints.some(e => e === endpoint);
    });

    // Create issues for disconnected endpoints
    disconnectedEndpoints.forEach(endpoint => {
      issues.push(
        this.createIssue({
          id: `feature-comp-endpoint-${endpoint.path}-${endpoint.method}`,
          severity: 'high',
          title: `Disconnected endpoint: ${endpoint.method} ${endpoint.path}`,
          description: `Backend endpoint exists but no frontend code calls it. This could indicate incomplete feature implementation or dead code.`,
          filePath: endpoint.filePath,
          lineNumber: endpoint.lineNumber,
          detectorId: 'endpoint-detector',
          fixSuggestion: `Either implement frontend code to use this endpoint, or remove it if it's no longer needed.`,
          aiPromptHint: `This endpoint appears unused. Help me determine if: 1) Frontend implementation is missing, 2) It's dead code to remove, or 3) I missed the usage.`
        })
      );
    });

    // Create issues for disconnected API calls
    disconnectedCalls.forEach(call => {
      issues.push(
        this.createIssue({
          id: `feature-comp-call-${call.method}-${call.path}`,
          severity: 'critical',
          title: `API call to non-existent endpoint: ${call.method} ${call.path}`,
          description: `Frontend code makes API call but no matching backend endpoint exists. This will cause runtime errors.`,
          filePath: call.filePath,
          lineNumber: call.lineNumber,
          detectorId: 'api-call-detector',
          fixSuggestion: `Implement the backend endpoint ${call.method} ${call.path} or fix the API call path.`,
          aiPromptHint: `This API call will fail because the endpoint doesn't exist. Help me implement the missing endpoint.`
        })
      );
    });

    // Create issues for mocked services
    mocks.forEach(mock => {
      const severity =
        mock.mockType === 'hardcoded' ? 'medium' : 'low';

      issues.push(
        this.createIssue({
          id: `feature-comp-mock-${mock.serviceName}`,
          severity,
          title: `Mocked service detected: ${mock.serviceName}`,
          description: `Code uses ${mock.mockType} data instead of real API integration. This may indicate incomplete feature implementation.`,
          filePath: mock.filePath,
          lineNumber: mock.lineNumber,
          detectorId: 'mock-detector',
          fixSuggestion: `Replace mock data with real API calls or remove if testing code.`,
          aiPromptHint: `This code uses ${mock.mockType} data. Help me integrate with the real backend API.`
        })
      );
    });

    // Calculate metrics
    metrics.totalEndpoints = endpoints.length;
    metrics.connectedEndpoints = connectedEndpoints.length;
    metrics.disconnectedEndpoints = disconnectedEndpoints.length;
    metrics.endpointConnectionRate =
      endpoints.length > 0
        ? Math.round((connectedEndpoints.length / endpoints.length) * 100)
        : 100;

    metrics.totalAPICalls = apiCalls.length;
    metrics.disconnectedAPICalls = disconnectedCalls.length;

    metrics.totalComponents = components.length;
    metrics.mockedServices = mocks.length;

    metrics.featureCompleteness = this.calculateFeatureCompleteness(
      endpoints.length,
      connectedEndpoints.length,
      disconnectedCalls.length,
      mocks.length
    );

    // Create analysis result
    return this.createAnalysisResult(issues, metrics);
  }

  /**
   * Match endpoints with API calls
   */
  private matchEndpointsWithCalls(
    endpoints: EndpointInfo[],
    apiCalls: Array<{ method: string; path: string }>
  ): {
    connectedEndpoints: EndpointInfo[];
    disconnectedEndpoints: EndpointInfo[];
  } {
    const connected: EndpointInfo[] = [];
    const disconnected: EndpointInfo[] = [];

    endpoints.forEach(endpoint => {
      const hasMatch = apiCalls.some(
        call =>
          call.method === endpoint.method &&
          this.pathsMatch(call.path, endpoint.path)
      );

      if (hasMatch) {
        connected.push(endpoint);
      } else {
        disconnected.push(endpoint);
      }
    });

    return {
      connectedEndpoints: connected,
      disconnectedEndpoints: disconnected
    };
  }

  /**
   * Find API calls that don't match any endpoint
   */
  private findDisconnectedCalls(
    apiCalls: Array<{ filePath: string; lineNumber: number; method: string; path: string }>,
    endpoints: EndpointInfo[]
  ): Array<{ filePath: string; lineNumber: number; method: string; path: string }> {
    return apiCalls.filter(call => {
      return !endpoints.some(
        endpoint =>
          endpoint.method === call.method &&
          this.pathsMatch(call.path, endpoint.path)
      );
    });
  }

  /**
   * Check if paths match (considering path parameters)
   */
  private pathsMatch(path1: string, path2: string): boolean {
    // Normalize both paths
    const normalized1 = this.normalizePath(path1);
    const normalized2 = this.normalizePath(path2);

    return normalized1 === normalized2;
  }

  /**
   * Normalize path for comparison
   */
  private normalizePath(path: string): string {
    // Convert /api/users/:id and /api/users/123 to same format
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(/\/:[^/]+/g, '/:id')
      .replace(/^\//, '')
      .toLowerCase();
  }

  /**
   * Calculate overall feature completeness score
   */
  private calculateFeatureCompleteness(
    totalEndpoints: number,
    connectedEndpoints: number,
    disconnectedCalls: number,
    mocks: number
  ): number {
    if (totalEndpoints === 0) return 100;

    // Base score on connection rate
    const connectionScore =
      totalEndpoints > 0 ? (connectedEndpoints / totalEndpoints) * 100 : 100;

    // Penalties
    const disconnectedCallPenalty = disconnectedCalls * 15; // Each disconnected call = -15
    const mockPenalty = mocks * 5; // Each mock = -5

    const score = Math.max(
      0,
      connectionScore - disconnectedCallPenalty - mockPenalty
    );

    return Math.round(score);
  }

  /**
   * Filter backend files
   */
  private filterBackendFiles(files: typeof this.filterRelevantFiles) {
    return files.filter(
      file =>
        file.path.includes('/server/') ||
        file.path.includes('/api/') ||
        file.path.includes('/backend/') ||
        file.path.includes('/routes/') ||
        file.path.match(/\.(route|controller|service)\.(ts|js)$/)
    );
  }

  /**
   * Filter frontend files
   */
  private filterFrontendFiles(files: typeof this.filterRelevantFiles) {
    return files.filter(
      file =>
        file.path.includes('/components/') ||
        file.path.includes('/pages/') ||
        file.path.includes('/views/') ||
        file.path.includes('/frontend/') ||
        file.path.includes('/client/') ||
        file.language === 'tsx' ||
        file.language === 'jsx'
    );
  }

  /**
   * Custom scoring that emphasizes critical issues
   */
  calculateScore(issues: Issue[]): number {
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const highIssues = issues.filter(i => i.severity === 'high');
    const mediumIssues = issues.filter(i => i.severity === 'medium');

    // Start at 100
    let score = 100;

    // Critical issues have huge impact (disconnected API calls will fail)
    score -= criticalIssues.length * 20;

    // High issues are significant (disconnected endpoints indicate problems)
    score -= highIssues.length * 10;

    // Medium issues are concerns (mocked data)
    score -= mediumIssues.length * 3;

    return Math.max(0, Math.round(score));
  }
}
