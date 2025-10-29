/**
 * Feature Completeness Registry
 *
 * Stores lightweight metadata for feature completeness analysis:
 * - Backend endpoints
 * - Frontend API calls
 * - Components
 * - Mock data
 *
 * Memory efficient: ~200 bytes per item vs 5MB per AST
 */

export interface EndpointMetadata {
  path: string;                    // "/api/users/:id"
  method: string;                  // "GET", "POST", etc.
  filePath: string;                // Source file path
  lineNumber: number;              // Line number in source
  handler?: string;                // Handler function name
  parameters?: string[];           // Path parameters
  hasAuth?: boolean;              // Has authentication middleware
  hasValidation?: boolean;        // Has validation middleware
}

export interface APICallMetadata {
  path: string;                    // "/api/users/123"
  method: string;                  // "GET", "POST", etc.
  filePath: string;                // Source file path
  lineNumber: number;              // Line number in source
  isConditional?: boolean;        // Inside if/conditional
  hasErrorHandling: boolean;       // Has catch or error callback
  hasLoadingState: boolean;        // Has loading indicator
}

export interface ComponentMetadata {
  name: string;                    // "UserProfile"
  filePath: string;                // Source file path
  lineNumber: number;              // Line number in source
  type: 'functional' | 'class';   // Component type
  hasProps?: boolean;             // Has props interface
  hasState?: boolean;             // Uses state/hooks
  usesAPIs?: string[];            // API endpoints it calls
  asyncOperations?: number;        // Count of async operations
}

export interface MockDataMetadata {
  name: string;                    // Mock name or identifier
  type: 'hardcoded-array' | 'hardcoded-object' | 'mock-function' | 'fixture';
  filePath: string;
  lineNumber: number;
  isPermanent: boolean;            // Is this intentional mock/test data
  serviceName?: string;            // What service is mocked
  dataShape?: string;              // Brief description of data
}

/**
 * Registry for feature completeness metadata
 */
export class FeatureCompletenessRegistry {
  private endpoints: Map<string, EndpointMetadata> = new Map();
  private apiCalls: Map<string, APICallMetadata> = new Map();
  private components: Map<string, ComponentMetadata> = new Map();
  private mocks: MockDataMetadata[] = [];

  // ==================== Endpoint Operations ====================

  /**
   * Add an endpoint to the registry
   */
  addEndpoint(endpoint: EndpointMetadata): void {
    const key = `${endpoint.method}:${endpoint.path}`;
    this.endpoints.set(key, endpoint);
  }

  /**
   * Get a specific endpoint
   */
  getEndpoint(method: string, path: string): EndpointMetadata | undefined {
    const key = `${method}:${path}`;
    return this.endpoints.get(key);
  }

  /**
   * Get all endpoints
   */
  getAllEndpoints(): EndpointMetadata[] {
    return Array.from(this.endpoints.values());
  }

  /**
   * Get endpoints by method
   */
  getEndpointsByMethod(method: string): EndpointMetadata[] {
    return this.getAllEndpoints().filter(e => e.method === method);
  }

  /**
   * Get endpoints by file
   */
  getEndpointsByFile(filePath: string): EndpointMetadata[] {
    return this.getAllEndpoints().filter(e => e.filePath === filePath);
  }

  // ==================== API Call Operations ====================

  /**
   * Add an API call to the registry
   */
  addAPICall(call: APICallMetadata): void {
    const key = `${call.filePath}:${call.lineNumber}`;
    this.apiCalls.set(key, call);
  }

  /**
   * Get all API calls
   */
  getAllAPICalls(): APICallMetadata[] {
    return Array.from(this.apiCalls.values());
  }

  /**
   * Get API calls by file
   */
  getAPICallsByFile(filePath: string): APICallMetadata[] {
    return this.getAllAPICalls().filter(c => c.filePath === filePath);
  }

  /**
   * Get API calls without error handling
   */
  getAPICallsWithoutErrorHandling(): APICallMetadata[] {
    return this.getAllAPICalls().filter(c => !c.hasErrorHandling);
  }

  /**
   * Get API calls without loading state
   */
  getAPICallsWithoutLoadingState(): APICallMetadata[] {
    return this.getAllAPICalls().filter(c => !c.hasLoadingState);
  }

  // ==================== Component Operations ====================

  /**
   * Add a component to the registry
   */
  addComponent(component: ComponentMetadata): void {
    this.components.set(component.name, component);
  }

  /**
   * Get a specific component
   */
  getComponent(name: string): ComponentMetadata | undefined {
    return this.components.get(name);
  }

  /**
   * Get all components
   */
  getAllComponents(): ComponentMetadata[] {
    return Array.from(this.components.values());
  }

  /**
   * Get functional components
   */
  getFunctionalComponents(): ComponentMetadata[] {
    return this.getAllComponents().filter(c => c.type === 'functional');
  }

  /**
   * Get class components
   */
  getClassComponents(): ComponentMetadata[] {
    return this.getAllComponents().filter(c => c.type === 'class');
  }

  /**
   * Get components with async operations
   */
  getComponentsWithAsyncOps(): ComponentMetadata[] {
    return this.getAllComponents().filter(c => c.asyncOperations && c.asyncOperations > 0);
  }

  // ==================== Mock Data Operations ====================

  /**
   * Add mock data to the registry
   */
  addMock(mock: MockDataMetadata): void {
    this.mocks.push(mock);
  }

  /**
   * Get all mocks
   */
  getAllMocks(): MockDataMetadata[] {
    return this.mocks;
  }

  /**
   * Get mocks by type
   */
  getMocksByType(type: MockDataMetadata['type']): MockDataMetadata[] {
    return this.mocks.filter(m => m.type === type);
  }

  /**
   * Get mocks by file
   */
  getMocksByFile(filePath: string): MockDataMetadata[] {
    return this.mocks.filter(m => m.filePath === filePath);
  }

  // ==================== Statistics ====================

  /**
   * Get comprehensive statistics
   */
  getStats() {
    const endpoints = this.getAllEndpoints();
    const apiCalls = this.getAllAPICalls();
    const components = this.getAllComponents();

    return {
      endpoints: {
        total: endpoints.length,
        byMethod: this.groupBy(endpoints, 'method'),
        withAuth: endpoints.filter(e => e.hasAuth).length,
        withValidation: endpoints.filter(e => e.hasValidation).length
      },
      apiCalls: {
        total: apiCalls.length,
        byMethod: this.groupBy(apiCalls, 'method'),
        withoutErrorHandling: this.getAPICallsWithoutErrorHandling().length,
        withoutLoadingState: this.getAPICallsWithoutLoadingState().length,
        conditional: apiCalls.filter(c => c.isConditional).length
      },
      components: {
        total: components.length,
        functional: this.getFunctionalComponents().length,
        class: this.getClassComponents().length,
        withAsyncOps: this.getComponentsWithAsyncOps().length
      },
      mocks: {
        total: this.mocks.length,
        byType: this.groupBy(this.mocks, 'type')
      }
    };
  }

  /**
   * Get memory usage estimate
   */
  getMemoryUsage(): {
    endpoints: number;
    apiCalls: number;
    components: number;
    mocks: number;
    totalKB: number;
  } {
    // Rough estimates: each metadata object is ~100-300 bytes
    const endpointsBytes = this.endpoints.size * 200;
    const apiCallsBytes = this.apiCalls.size * 200;
    const componentsBytes = this.components.size * 250;
    const mocksBytes = this.mocks.length * 150;

    const totalBytes = endpointsBytes + apiCallsBytes + componentsBytes + mocksBytes;

    return {
      endpoints: this.endpoints.size,
      apiCalls: this.apiCalls.size,
      components: this.components.size,
      mocks: this.mocks.length,
      totalKB: Math.round(totalBytes / 1024)
    };
  }

  /**
   * Clear all registries
   */
  clear(): void {
    this.endpoints.clear();
    this.apiCalls.clear();
    this.components.clear();
    this.mocks = [];
  }

  /**
   * Get item counts
   */
  getCounts() {
    return {
      endpoints: this.endpoints.size,
      apiCalls: this.apiCalls.size,
      components: this.components.size,
      mocks: this.mocks.length
    };
  }

  // ==================== Helper Methods ====================

  private groupBy<T>(items: T[], key: keyof T): Record<string, number> {
    return items.reduce((acc, item) => {
      const value = String(item[key]);
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}
