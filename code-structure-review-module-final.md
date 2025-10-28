# Code Structure Review Module - Final Implementation Guide
## Category-Based Visual Code Analysis with Progressive Disclosure

**Purpose**: Help developers of all levels understand code structure and health through intuitive, categorized visualizations  
**Version**: 2.0 Final  
**Date**: 2025-01-07

---

## 1. Module Overview

### Core Philosophy
- **Novice-First**: Default to simple, visual representations
- **Progressive Disclosure**: Complexity revealed as users grow
- **Category-Based**: Organized analysis like threading/knowledge systems
- **Actionable**: Every insight leads to a concrete action
- **Educational**: Learn while reviewing

### Primary Goals
1. **Instant Understanding**: Visual health indicators at a glance
2. **Progressive Depth**: From "76% tested" to mutation testing scores
3. **Maturity-Aware**: UI and AI prompts adapt to user level
4. **Test Coverage Focus**: Critical for AI-generated code quality
5. **Extensible Categories**: Custom analysis for team needs

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────┐
│         Category Management System                   │
│    (Orchestrates all analysis categories)            │
└──────────────────────┬──────────────────────────────┘
                       │
├──────────────────────┼──────────────────────────────┤
│                      │                              │
▼                      ▼                              ▼
Test Coverage    Code Health    Dependencies    Security
Analyzer         Analyzer       Analyzer        Analyzer
│                      │                              │
└──────────────────────┼──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│              Code Analysis Engine                    │
│   (Core metrics, AST parsing, pattern detection)     │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│      Progressive Disclosure WebView Panel            │
│         (Adaptive UI based on user maturity)         │
└─────────────────────────────────────────────────────┘
```

---

## 3. Category System Implementation

### 3.1 Base Category Structure

```typescript
interface AnalysisCategory {
  // Identity
  id: string;
  name: string;
  icon: string;
  description: string;
  priority: number;  // Display order
  
  // Progressive views
  views: {
    summary: SummaryView;      // Novice: One-line status
    detail: DetailView;        // Intermediate: Breakdown
    deepDive: DeepDiveView;    // Advanced: Full analysis
    expert: ExpertView;        // Expert: Custom queries
  };
  
  // Maturity-aware prompts
  aiPrompts: Map<MaturityLevel, PromptTemplate>;
  
  // Thresholds for health status
  thresholds: {
    good: number;
    warning: number;
    critical: number;
  };
  
  // Methods
  analyze(files: SourceFile[]): CategoryAnalysis;
  generateReport(): Report;
  suggestFixes(): Fix[];
}

enum MaturityLevel {
  NOVICE = 1,
  INTERMEDIATE = 2,
  ADVANCED = 3,
  EXPERT = 4
}
```

### 3.2 Core Categories

#### Test Coverage Category (Priority 1)

```typescript
class TestCoverageCategory implements AnalysisCategory {
  id = 'test-coverage';
  name = 'Test Coverage';
  icon = '🧪';
  priority = 1;
  
  thresholds = {
    good: 80,
    warning: 60,
    critical: 40
  };
  
  views = {
    summary: {
      render: (data: CoverageData) => ({
        display: this.getCoverageBar(data.percentage),
        status: this.getStatus(data.percentage),
        message: `${data.percentage}% tested`,
        badge: this.getBadge(data.percentage)
      })
    },
    
    detail: {
      render: (data: CoverageData) => ({
        lineCoverage: data.lines,
        branchCoverage: data.branches,
        functionCoverage: data.functions,
        statementCoverage: data.statements,
        untestedFiles: data.files.filter(f => f.coverage === 0),
        criticalGaps: this.findCriticalGaps(data),
        trends: this.calculateTrends(data.history)
      })
    },
    
    deepDive: {
      render: (data: CoverageData) => ({
        mutationScore: data.mutation?.score,
        survivedMutants: data.mutation?.survived,
        pathCoverage: data.paths,
        assertionDensity: data.assertions / data.tests,
        testMaintainability: this.calculateMaintainability(data.tests),
        flakiness: data.flakyTests / data.totalTests,
        recommendations: this.generateRecommendations(data)
      })
    },
    
    expert: {
      render: (data: CoverageData) => ({
        contractTests: this.analyzeContracts(data),
        propertyBasedSuggestions: this.suggestProperties(data),
        integrationGaps: this.findIntegrationGaps(data),
        performanceTests: this.analyzePerformanceTests(data),
        customQueries: this.enableQueryEngine(data)
      })
    }
  };
  
  aiPrompts = new Map([
    [MaturityLevel.NOVICE, `
      Look at [filename] which has no tests.
      Create simple tests that:
      1. Check if the main function works
      2. Check if it handles errors
      3. Check the output is correct
      Use simple assertions like expect(result).toBe(expected)
    `],
    
    [MaturityLevel.INTERMEDIATE, `
      Analyze [filename] with [coverage]% coverage.
      Generate tests for:
      - Uncovered lines: [lines]
      - Missing branches: [branches]
      - Edge cases
      Follow AAA pattern (Arrange, Act, Assert)
      Include error scenarios and boundary values
    `],
    
    [MaturityLevel.ADVANCED, `
      Review test quality for [module]:
      Current mutation score: [score]%
      
      Generate:
      - Tests to kill survived mutants
      - Integration tests for uncovered paths
      - Property-based tests for invariants
      - Performance regression tests
      Consider: mocking strategies, test isolation, flakiness
    `],
    
    [MaturityLevel.EXPERT, `
      Design comprehensive test strategy for [system]:
      
      Analyze:
      - Contract testing requirements
      - Chaos engineering scenarios
      - Load testing patterns
      - Security test cases
      - Accessibility testing
      
      Provide:
      - Test architecture recommendations
      - CI/CD integration strategy
      - Test data management approach
      - Coverage vs. quality trade-offs
    `]
  ]);
}
```

#### Code Health Category (Priority 2)

```typescript
class CodeHealthCategory implements AnalysisCategory {
  id = 'code-health';
  name = 'Code Health';
  icon = '💪';
  priority = 2;
  
  views = {
    summary: {
      render: (data: HealthData) => ({
        display: `${this.getGrade(data.score)} (${data.score}/100)`,
        topIssues: data.issues.slice(0, 2),
        badge: this.getHealthBadge(data.score)
      })
    },
    
    detail: {
      render: (data: HealthData) => ({
        complexFiles: data.files.filter(f => f.complexity > 20),
        godObjects: data.godObjects,
        codeSmells: data.smells,
        duplications: data.duplicates,
        technicalDebt: this.calculateDebt(data)
      })
    },
    
    deepDive: {
      render: (data: HealthData) => ({
        cyclomaticComplexity: data.cyclomatic,
        cognitiveComplexity: data.cognitive,
        halsteadMetrics: data.halstead,
        maintainabilityIndex: data.maintainability,
        solidViolations: this.checkSolid(data),
        patterns: this.detectPatterns(data)
      })
    }
  };
}
```

#### Feature Completeness Category (Priority 1 - Critical)

```typescript
class FeatureCompletenessCategory implements AnalysisCategory {
  id = 'feature-completeness';
  name = 'Feature Completeness';
  icon = '🔌';
  priority = 1; // Same as test coverage - critical for AI code
  
  thresholds = {
    good: 90,    // 90%+ features fully connected
    warning: 70,  // Some features incomplete
    critical: 50  // Many disconnected features
  };
  
  views = {
    summary: {
      render: (data: CompletenessData) => ({
        display: `${data.connected}/${data.total} features connected`,
        status: this.getStatus(data.percentage),
        criticalIssue: data.mostCriticalGap,
        badge: this.getCompletnessBadge(data)
      })
    },
    
    detail: {
      render: (data: CompletenessData) => ({
        backendOnly: data.backendWithoutFrontend,
        frontendOnly: data.frontendWithoutBackend,
        mockedServices: data.mockedImplementations,
        unusedEndpoints: data.definedButUnusedAPIs,
        deadUI: data.unreachableComponents,
        contractMismatches: data.schemaMismatches
      })
    },
    
    deepDive: {
      render: (data: CompletenessData) => ({
        e2ePaths: this.traceEndToEndPaths(data),
        integrationGaps: this.findIntegrationGaps(data),
        stateManagement: this.analyzeStateConnections(data),
        featureFlags: this.checkFeatureFlags(data),
        apiVersioning: this.checkAPIVersions(data)
      })
    }
  };
  
  analyze(workspace: Workspace): CompletenessAnalysis {
    return {
      endpoints: this.analyzeEndpoints(workspace),
      components: this.analyzeComponents(workspace),
      connections: this.traceConnections(workspace),
      mocks: this.detectMocks(workspace),
      contracts: this.validateContracts(workspace),
      completeness: this.calculateCompleteness(workspace)
    };
  }
}
```

##### Feature Completeness Analyzer

```typescript
class FeatureCompletenessAnalyzer {
  /**
   * Trace connections between layers
   */
  async analyzeFeatureCompleteness(workspace: string): Promise<CompletenessReport> {
    // 1. Discover all backend endpoints
    const endpoints = await this.discoverEndpoints(workspace);
    
    // 2. Discover all frontend API calls
    const apiCalls = await this.discoverAPICalls(workspace);
    
    // 3. Discover UI components
    const components = await this.discoverUIComponents(workspace);
    
    // 4. Build connection graph
    const graph = this.buildConnectionGraph(endpoints, apiCalls, components);
    
    // 5. Identify gaps
    return {
      backendOnly: this.findBackendOnlyFeatures(graph),
      frontendOnly: this.findFrontendOnlyFeatures(graph),
      mocked: this.findMockedConnections(graph),
      disconnected: this.findDisconnectedFeatures(graph),
      partial: this.findPartialImplementations(graph)
    };
  }
  
  /**
   * Discover backend endpoints
   */
  private async discoverEndpoints(workspace: string): Promise<Endpoint[]> {
    const endpoints = [];
    
    // Express/Node.js pattern
    const expressPattern = /app\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/g;
    
    // FastAPI/Python pattern
    const fastAPIPattern = /@app\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/g;
    
    // Spring Boot/Java pattern
    const springPattern = /@(Get|Post|Put|Delete|Patch)Mapping\(['"]([^'"]+)['"]/g;
    
    // GraphQL resolvers
    const graphqlPattern = /(\w+):\s*async?\s*\([^)]*\)\s*=>/g;
    
    const files = await this.findBackendFiles(workspace);
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      
      // Extract endpoints
      for (const pattern of [expressPattern, fastAPIPattern, springPattern]) {
        const matches = content.matchAll(pattern);
        for (const match of matches) {
          endpoints.push({
            method: match[1].toUpperCase(),
            path: match[2],
            file: file,
            line: this.getLineNumber(content, match.index),
            implementation: await this.checkImplementation(file, match[2])
          });
        }
      }
    }
    
    return endpoints;
  }
  
  /**
   * Discover frontend API calls
   */
  private async discoverAPICalls(workspace: string): Promise<APICall[]> {
    const apiCalls = [];
    
    // Fetch API pattern
    const fetchPattern = /fetch\(['"`]([^'"`]+)['"`]/g;
    
    // Axios pattern
    const axiosPattern = /axios\.(get|post|put|delete|patch)\(['"`]([^'"`]+)['"`]/g;
    
    // React Query pattern
    const reactQueryPattern = /useQuery\(\['"]([^'"]+)['"]/g;
    
    // GraphQL pattern
    const graphqlPattern = /gql`[^`]*(?:query|mutation)\s+(\w+)/g;
    
    const files = await this.findFrontendFiles(workspace);
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      
      // Check for mocked implementations
      const isMocked = this.detectMockIndicators(content);
      
      // Extract API calls
      for (const pattern of [fetchPattern, axiosPattern]) {
        const matches = content.matchAll(pattern);
        for (const match of matches) {
          apiCalls.push({
            url: match[1] || match[2],
            method: match[1] || 'GET',
            file: file,
            line: this.getLineNumber(content, match.index),
            isMocked: isMocked,
            component: this.findParentComponent(file, content)
          });
        }
      }
    }
    
    return apiCalls;
  }
  
  /**
   * Detect mocked services
   */
  private detectMockIndicators(content: string): boolean {
    const mockIndicators = [
      /\/\/ *TODO:? *(?:connect|implement|wire up)/i,
      /\/\/ *MOCK/i,
      /return\s+(?:Promise\.resolve\()?[\[\{].*fake.*[\]\}]/i,
      /return\s+(?:Promise\.resolve\()?[\[\{].*dummy.*[\]\}]/i,
      /return\s+(?:Promise\.resolve\()?[\[\{].*mock.*[\]\}]/i,
      /setTimeout\([^)]*\).*\/\/ *simulate/i,
      /export\s+const\s+mock/i,
      /__mocks__/,
      /\.mock\(/
    ];
    
    return mockIndicators.some(pattern => pattern.test(content));
  }
  
  /**
   * Check if backend implementation is real or stubbed
   */
  private async checkImplementation(file: string, endpoint: string): Promise<ImplementationType> {
    const content = await fs.readFile(file, 'utf-8');
    
    // Find the endpoint handler
    const handlerPattern = new RegExp(`['"\`]${endpoint}['"\`][^{]*{([^}]+)}`);
    const match = content.match(handlerPattern);
    
    if (!match) return 'not-found';
    
    const handler = match[1];
    
    // Check for mock indicators
    if (this.detectMockIndicators(handler)) {
      return 'mocked';
    }
    
    // Check for database/service calls
    const hasRealImplementation = [
      /await\s+\w+\.(?:find|save|create|update|delete)/,  // DB operations
      /await\s+this\.\w+Service/,                         // Service calls
      /await\s+\w+Repository/,                            // Repository pattern
      /SELECT|INSERT|UPDATE|DELETE/i                      // SQL queries
    ].some(pattern => pattern.test(handler));
    
    return hasRealImplementation ? 'implemented' : 'stub';
  }
  
  /**
   * Build connection graph
   */
  private buildConnectionGraph(
    endpoints: Endpoint[],
    apiCalls: APICall[],
    components: UIComponent[]
  ): ConnectionGraph {
    const graph = new Graph();
    
    // Add nodes
    endpoints.forEach(e => graph.addNode('backend', e));
    apiCalls.forEach(a => graph.addNode('api-call', a));
    components.forEach(c => graph.addNode('ui', c));
    
    // Connect API calls to endpoints
    for (const call of apiCalls) {
      const endpoint = this.findMatchingEndpoint(call, endpoints);
      if (endpoint) {
        graph.addEdge(call, endpoint, 'connects-to');
      } else {
        graph.markOrphan(call, 'no-backend');
      }
    }
    
    // Connect components to API calls
    for (const component of components) {
      const calls = apiCalls.filter(c => c.component === component.name);
      if (calls.length === 0) {
        graph.markOrphan(component, 'no-api-calls');
      } else {
        calls.forEach(call => graph.addEdge(component, call, 'uses'));
      }
    }
    
    // Find unused endpoints
    for (const endpoint of endpoints) {
      if (!graph.hasIncomingEdges(endpoint)) {
        graph.markOrphan(endpoint, 'unused');
      }
    }
    
    return graph;
  }
  
  /**
   * Trace end-to-end paths
   */
  private traceEndToEndPaths(graph: ConnectionGraph): E2EPath[] {
    const paths = [];
    
    // Start from UI components
    for (const component of graph.getNodesByType('ui')) {
      const traces = this.traceFromComponent(component, graph);
      
      for (const trace of traces) {
        paths.push({
          name: `${component.name} → ${trace.endpoint}`,
          steps: trace.steps,
          complete: trace.hasDatabase,
          issues: trace.issues
        });
      }
    }
    
    return paths;
  }
  
  /**
   * Validate API contracts
   */
  private async validateContracts(workspace: string): Promise<ContractValidation[]> {
    const validations = [];
    
    // Find API schemas (OpenAPI, GraphQL, TypeScript interfaces)
    const schemas = await this.findSchemas(workspace);
    
    for (const schema of schemas) {
      // Compare frontend expectations vs backend reality
      const frontend = await this.extractFrontendExpectations(schema);
      const backend = await this.extractBackendResponse(schema);
      
      const mismatches = this.compareSchemas(frontend, backend);
      
      if (mismatches.length > 0) {
        validations.push({
          endpoint: schema.endpoint,
          mismatches: mismatches,
          severity: this.calculateSeverity(mismatches)
        });
      }
    }
    
    return validations;
  }
  
  /**
   * Find integration test coverage
   */
  private async analyzeIntegrationTests(workspace: string): Promise<IntegrationCoverage> {
    const tests = await this.findIntegrationTests(workspace);
    const features = await this.findFeatures(workspace);
    
    const coverage = {
      total: features.length,
      tested: 0,
      untested: [],
      partial: []
    };
    
    for (const feature of features) {
      const test = tests.find(t => this.testCoversFeature(t, feature));
      
      if (!test) {
        coverage.untested.push(feature);
      } else if (test.coverage === 'partial') {
        coverage.partial.push(feature);
      } else {
        coverage.tested++;
      }
    }
    
    return coverage;
  }
}
```

##### Visual Representation

```typescript
class FeatureCompletenessVisualization {
  /**
   * Sankey diagram showing data flow
   */
  renderSankeyDiagram(paths: E2EPath[]): void {
    // UI Components → API Calls → Backend Endpoints → Database
    const nodes = [
      { id: 0, name: "UI Components" },
      { id: 1, name: "API Calls" },
      { id: 2, name: "Backend" },
      { id: 3, name: "Database" }
    ];
    
    const links = paths.map(path => ({
      source: path.from,
      target: path.to,
      value: path.weight,
      complete: path.complete,
      mocked: path.hasMocks
    }));
    
    // Color code:
    // Green = fully connected
    // Yellow = partially connected
    // Red = mocked/disconnected
    // Gray = not implemented
  }
  
  /**
   * Feature completeness matrix
   */
  renderFeatureMatrix(features: Feature[]): void {
    // Rows = Features
    // Columns = [UI | API | Backend | DB | Tests]
    // Cells = ✅ Implemented | ⚠️ Mocked | ❌ Missing
    
    const matrix = features.map(feature => ({
      name: feature.name,
      ui: feature.hasUI ? '✅' : '❌',
      api: feature.hasAPI ? (feature.apiMocked ? '⚠️' : '✅') : '❌',
      backend: feature.hasBackend ? (feature.backendMocked ? '⚠️' : '✅') : '❌',
      database: feature.hasDatabase ? '✅' : '❌',
      tests: feature.hasTests ? '✅' : '❌',
      status: this.calculateFeatureStatus(feature)
    }));
    
    // Render as interactive table
    this.renderTable(matrix);
  }
  
  /**
   * Dead code sunburst
   */
  renderDeadCodeSunburst(code: DeadCode[]): void {
    // Center = project
    // Inner ring = modules
    // Outer ring = specific files/functions
    // Color = usage (red = unused, yellow = rarely used, green = active)
    
    const hierarchy = d3.hierarchy(this.buildHierarchy(code))
      .sum(d => d.size)
      .sort((a, b) => b.value - a.value);
    
    const partition = d3.partition()
      .size([2 * Math.PI, radius]);
    
    // Color based on usage
    const color = d3.scaleOrdinal()
      .domain(['unused', 'rare', 'active'])
      .range(['#ef4444', '#f59e0b', '#10b981']);
  }
}
```

#### UI/UX Quality Category (Priority 1 - Critical for User Experience)

```typescript
class UIUXQualityCategory implements AnalysisCategory {
  id = 'ui-ux-quality';
  name = 'UI/UX Quality';
  icon = '🎨';
  priority = 1; // High priority - bad UX kills products
  
  thresholds = {
    good: 90,     // Few minor issues
    warning: 70,  // Several UX problems
    critical: 50  // Many serious UX issues
  };
  
  views = {
    summary: {
      render: (data: UXQualityData) => ({
        display: `${data.score}/100 UX Score`,
        status: this.getStatus(data.score),
        topIssues: data.criticalIssues.slice(0, 3),
        badge: this.getUXBadge(data.score)
      })
    },
    
    detail: {
      render: (data: UXQualityData) => ({
        loadingStates: data.missingLoadingStates,
        errorHandling: data.missingErrorHandling,
        accessibility: data.accessibilityViolations,
        formIssues: data.formUsabilityProblems,
        performance: data.performanceIssues,
        mobileIssues: data.responsiveProblems,
        consistency: data.inconsistentPatterns,
        i18n: data.internationalizationIssues
      })
    },
    
    deepDive: {
      render: (data: UXQualityData) => ({
        renderPerformance: this.analyzeRenderPerf(data),
        a11yAudit: this.fullAccessibilityAudit(data),
        userFlowAnalysis: this.analyzeUserFlows(data),
        interactionLatency: this.measureInteractionLatency(data),
        cognitiveLoad: this.assessCognitiveLoad(data),
        i18nReadiness: this.assessI18nReadiness(data)
      })
    }
  };
}
```

##### UI/UX Pattern Detector

```typescript
class UIUXPatternDetector {
  /**
   * Detect missing loading states
   */
  async detectMissingLoadingStates(files: SourceFile[]): Promise<LoadingStateIssue[]> {
    const issues = [];
    
    // Find data fetching without loading indicators
    const fetchPatterns = [
      /useState\([^)]*\).*fetch\(/,
      /useEffect\(\(\) => \{[^}]*fetch\([^}]*\}/,
      /async\s+\w+\([^)]*\)\s*{(?!.*(?:setLoading|setStatus))/
    ];
    
    for (const file of files) {
      for (const pattern of fetchPatterns) {
        if (pattern.test(file.content)) {
          const hasLoadingUI = /(?:loading|spinner|skeleton|placeholder)/i.test(file.content);
          
          if (!hasLoadingUI) {
            issues.push({
              file: file.path,
              type: 'missing-loading-state',
              severity: 'high',
              message: 'Data fetching without loading indicator'
            });
          }
        }
      }
    }
    
    return issues;
  }
  
  /**
   * Detect missing error handling UI
   */
  async detectMissingErrorHandling(files: SourceFile[]): Promise<ErrorHandlingIssue[]> {
    const issues = [];
    
    for (const file of files) {
      const hasAsyncOps = /await|fetch|axios|promise/i.test(file.content);
      const hasErrorUI = /error|failed|failure.*(?:<|render|return)/i.test(file.content);
      
      if (hasAsyncOps && !hasErrorUI) {
        issues.push({
          file: file.path,
          type: 'missing-error-ui',
          severity: 'high',
          message: 'No error handling UI'
        });
      }
    }
    
    return issues;
  }
  
  /**
   * Detect accessibility violations
   */
  async detectAccessibilityViolations(files: SourceFile[]): Promise<A11yViolation[]> {
    const violations = [];
    
    const a11yPatterns = [
      { pattern: /<img(?![^>]*alt=)/, message: 'Image without alt text' },
      { pattern: /<button(?![^>]*(?:aria-label|children|>.*<))/, message: 'Button without label' },
      { pattern: /onClick(?!.*(?:onKeyDown|onKeyPress))/, message: 'Click without keyboard handler' },
      { pattern: /<div[^>]*onClick/, message: 'Clickable div instead of button' },
      { pattern: /<input(?![^>]*(?:aria-|id=))/, message: 'Input without label' }
    ];
    
    for (const file of files) {
      for (const check of a11yPatterns) {
        if (check.pattern.test(file.content)) {
          violations.push({
            file: file.path,
            message: check.message,
            severity: 'high'
          });
        }
      }
    }
    
    return violations;
  }
  
  /**
   * Detect form usability issues
   */
  async detectFormUsabilityIssues(files: SourceFile[]): Promise<FormIssue[]> {
    const issues = [];
    
    for (const file of files) {
      if (/<form|handleSubmit/.test(file.content)) {
        if (!/validate|validation|errors/.test(file.content)) {
          issues.push({
            file: file.path,
            type: 'form-validation',
            message: 'Form without validation',
            severity: 'medium'
          });
        }
        
        if (!/success|toast|notification/.test(file.content)) {
          issues.push({
            file: file.path,
            type: 'form-feedback',
            message: 'Form without success feedback',
            severity: 'low'
          });
        }
      }
    }
    
    return issues;
  }
  
  /**
   * Detect responsive design issues
   */
  async detectResponsiveIssues(files: SourceFile[]): Promise<ResponsiveIssue[]> {
    const issues = [];
    
    for (const file of files) {
      // Check for fixed widths
      if (/width:\s*\d{3,}px/.test(file.content)) {
        issues.push({
          file: file.path,
          type: 'fixed-width',
          message: 'Fixed width may break on mobile',
          severity: 'medium'
        });
      }
      
      // Check for missing viewport meta
      if (file.path.endsWith('.html') && !/<meta.*viewport/.test(file.content)) {
        issues.push({
          file: file.path,
          type: 'missing-viewport',
          message: 'Missing viewport meta tag',
          severity: 'high'
        });
      }
    }
    
    return issues;
  }
}
```

#### Internationalization Category (Priority 2 - Essential for Global Products)

```typescript
class InternationalizationCategory implements AnalysisCategory {
  id = 'internationalization';
  name = 'Internationalization';
  icon = '🌍';
  priority = 2;
  
  thresholds = {
    good: 90,     // Fully internationalized
    warning: 60,  // Partial i18n
    critical: 30  // Little to no i18n
  };
  
  views = {
    summary: {
      render: (data: I18nData) => ({
        display: `${data.locales.length} locales, ${data.coverage}% translated`,
        status: this.getStatus(data.score),
        criticalIssue: data.hardcodedCount > 0 ? `${data.hardcodedCount} hardcoded strings` : null,
        badge: this.getI18nBadge(data)
      })
    },
    
    detail: {
      render: (data: I18nData) => ({
        supportedLocales: data.locales,
        hardcodedStrings: data.hardcodedStrings,
        missingTranslations: data.missingTranslations,
        dateTimeIssues: data.formattingIssues.filter(i => i.type === 'date'),
        numberIssues: data.formattingIssues.filter(i => i.type === 'number'),
        currencyIssues: data.formattingIssues.filter(i => i.type === 'currency'),
        rtlSupport: data.rtlSupport
      })
    },
    
    deepDive: {
      render: (data: I18nData) => ({
        translationCoverage: this.analyzeTranslationCoverage(data),
        pluralizationSupport: this.checkPluralization(data),
        contextualTranslations: this.checkContextual(data),
        localeDetection: this.analyzeLocaleDetection(data),
        bundleOptimization: this.analyzeBundleSize(data),
        characterEncoding: this.checkEncoding(data)
      })
    }
  };
}
```

##### Internationalization Detector

```typescript
class InternationalizationDetector {
  /**
   * Find hardcoded strings that should be translated
   */
  async findHardcodedStrings(files: SourceFile[]): Promise<HardcodedString[]> {
    const hardcoded = [];
    
    const patterns = [
      />([A-Z][a-z][^<>{]*)</,  // JSX text content
      /(?:error|success|warning|message)\s*[:=]\s*["']([^"']+)["']/gi,
      /(?:label|title|placeholder|text)\s*[:=]\s*["']([^"']+)["']/gi,
      /alert\(['"']([^'"]+)['"]/gi
    ];
    
    for (const file of files) {
      for (const pattern of patterns) {
        const matches = file.content.matchAll(pattern);
        for (const match of matches) {
          // Skip if likely a key or variable
          if (!/^[a-z_]/.test(match[1])) {
            hardcoded.push({
              file: file.path,
              text: match[1],
              line: this.getLineNumber(file.content, match.index),
              suggestion: this.suggestTranslationKey(match[1])
            });
          }
        }
      }
    }
    
    return hardcoded;
  }
  
  /**
   * Check for missing translations
   */
  async findMissingTranslations(workspace: string): Promise<MissingTranslation[]> {
    const missing = [];
    const translationFiles = await this.findTranslationFiles(workspace);
    
    if (translationFiles.length === 0) {
      return [{
        severity: 'critical',
        message: 'No translation files found',
        suggestion: 'Set up i18n with translation files'
      }];
    }
    
    // Compare keys across locales
    const allKeys = new Set<string>();
    const localeKeys = new Map<string, Set<string>>();
    
    for (const file of translationFiles) {
      const locale = this.extractLocale(file);
      const keys = await this.extractKeys(file);
      localeKeys.set(locale, keys);
      keys.forEach(k => allKeys.add(k));
    }
    
    // Find missing keys
    for (const [locale, keys] of localeKeys) {
      for (const key of allKeys) {
        if (!keys.has(key)) {
          missing.push({
            locale,
            key,
            severity: 'high'
          });
        }
      }
    }
    
    return missing;
  }
  
  /**
   * Find date/time/number formatting issues
   */
  async findFormattingIssues(files: SourceFile[]): Promise<FormattingIssue[]> {
    const issues = [];
    
    const patterns = [
      { type: 'date', pattern: /\d{1,2}\/\d{1,2}\/\d{2,4}/, message: 'Hardcoded date format' },
      { type: 'number', pattern: /toFixed\(\d\)(?!.*Intl)/, message: 'Fixed decimals without locale' },
      { type: 'currency', pattern: /[$€£¥₹]/, message: 'Hardcoded currency symbol' },
      { type: 'time', pattern: /\d{1,2}:\d{2}\s*(AM|PM)?/, message: 'Hardcoded time format' }
    ];
    
    for (const file of files) {
      for (const check of patterns) {
        if (check.pattern.test(file.content)) {
          issues.push({
            file: file.path,
            type: check.type,
            message: check.message,
            severity: 'medium',
            suggestion: `Use Intl.${check.type === 'date' ? 'DateTimeFormat' : 'NumberFormat'}`
          });
        }
      }
    }
    
    return issues;
  }
  
  /**
   * Check RTL support
   */
  async checkRTLSupport(files: SourceFile[]): Promise<RTLSupport> {
    const cssFiles = files.filter(f => f.path.includes('.css'));
    let hasRTLSupport = false;
    const issues = [];
    
    for (const file of cssFiles) {
      // Check for RTL-aware styles
      if (/\[dir=["']rtl["']\]/.test(file.content)) {
        hasRTLSupport = true;
      }
      
      // Check for directional styles without RTL consideration
      if (/margin-left|padding-left|float:\s*left/.test(file.content)) {
        if (!/margin-inline-start|padding-inline-start/.test(file.content)) {
          issues.push({
            file: file.path,
            message: 'Directional styles without RTL support',
            severity: 'medium'
          });
        }
      }
    }
    
    return { supported: hasRTLSupport, issues };
  }
  
  /**
   * Generate i18n coverage matrix
   */
  generateCoverageMatrix(data: I18nData): I18nMatrix {
    return {
      locales: data.locales.map(locale => ({
        code: locale,
        name: this.getLocaleName(locale),
        coverage: this.calculateCoverage(locale, data),
        missingKeys: data.missingTranslations.filter(t => t.locale === locale).length,
        dateFormat: this.checkDateFormat(locale, data),
        numberFormat: this.checkNumberFormat(locale, data),
        rtl: this.isRTLLocale(locale)
      }))
    };
  }
}
```

##### I18n Visualization

```typescript
class I18nVisualization {
  renderI18nDashboard(data: I18nData): HTMLElement {
    return `
      <div class="i18n-dashboard">
        <h3>🌍 Internationalization Status</h3>
        
        <!-- Locale Coverage Matrix -->
        <table class="locale-matrix">
          <thead>
            <tr>
              <th>Locale</th>
              <th>Coverage</th>
              <th>Missing</th>
              <th>Date/Time</th>
              <th>Numbers</th>
              <th>RTL</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${data.locales.map(locale => `
              <tr>
                <td>${this.getFlag(locale)} ${locale}</td>
                <td>${this.renderCoverageBar(locale.coverage)}</td>
                <td>${locale.missingCount || 0}</td>
                <td>${locale.dateFormatOk ? '✅' : '⚠️'}</td>
                <td>${locale.numberFormatOk ? '✅' : '⚠️'}</td>
                <td>${locale.rtl ? '✅' : 'N/A'}</td>
                <td>
                  <button onclick="translateMissing('${locale}')">Translate</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <!-- Hardcoded Strings Alert -->
        ${data.hardcodedStrings.length > 0 ? `
          <div class="hardcoded-alert">
            <h4>⚠️ ${data.hardcodedStrings.length} Hardcoded Strings Found</h4>
            <ul>
              ${data.hardcodedStrings.slice(0, 5).map(s => `
                <li>
                  "${s.text}" in ${s.file}:${s.line}
                  <button onclick="extractString('${s.id}')">Extract</button>
                </li>
              `).join('')}
            </ul>
            <button onclick="extractAllStrings()">Extract All Strings</button>
          </div>
        ` : ''}
        
        <!-- Quick Actions -->
        <div class="i18n-actions">
          <button onclick="addLocale()">➕ Add Locale</button>
          <button onclick="validateAllTranslations()">✅ Validate All</button>
          <button onclick="generateMissingWithAI()">🤖 AI Translate</button>
          <button onclick="exportTranslations()">📥 Export</button>
        </div>
      </div>
    `;
  }
}
```

#### Additional Core Categories

```typescript
const categories = [
  new FeatureCompletenessCategory(), // 🔌 Connection verification (CRITICAL)
  new UIUXQualityCategory(),        // 🎨 UX patterns, accessibility, forms
  new InternationalizationCategory(), // 🌍 i18n, localization, RTL
  new TestCoverageCategory(),       // 🧪 Coverage, quality, mutation
  new CodeHealthCategory(),         // 💪 Complexity, maintainability
  new DependenciesCategory(),       // 🔗 Coupling, circular deps
  new SecurityCategory(),           // 🔒 Vulnerabilities, OWASP
  new PerformanceCategory(),        // ⚡ Big-O, memory, bottlenecks
  new DocumentationCategory(),      // 📚 Coverage, quality, examples
  new ArchitectureCategory(),       // 🏗️ Layer violations, patterns
  new AICodeQualityCategory()       // 🤖 AI-specific patterns
];
```

---

## 4. Progressive Disclosure UI

### 4.1 Main Dashboard

```typescript
class CodeStructureDashboard {
  private userLevel: MaturityLevel = MaturityLevel.NOVICE;
  private expandedCategories: Set<string> = new Set();
  
  render(): HTMLElement {
    return `
      <div class="dashboard">
        <!-- Header with level selector -->
        <header>
          <h1>Code Analysis</h1>
          <select id="maturity-level">
            <option value="1">👶 Novice</option>
            <option value="2">🧑 Intermediate</option>
            <option value="3">👨‍💼 Advanced</option>
            <option value="4">🧙 Expert</option>
          </select>
          <button id="settings">⚙️</button>
        </header>
        
        <!-- Critical Alert for Disconnected Features -->
        <div class="critical-alert" v-if="hasDisconnectedFeatures">
          ⚠️ 5 features are not fully connected! 
          Backend exists but no UI for: payment-processing, user-export
          UI exists but backend mocked for: settings-panel, dashboard-widgets
          <button>Show Details</button>
        </div>
        
        <!-- Category filters -->
        <div class="filters">
          <button class="filter-active">All</button>
          <button>Issues Only</button>
          <button>Critical</button>
          ${this.renderCustomFilters()}
        </div>
        
        <!-- Category cards -->
        <div class="categories">
          ${this.renderCategories()}
        </div>
        
        <!-- Feature Completeness Matrix (when expanded) -->
        <div class="feature-matrix" v-if="expandedCategories.has('feature-completeness')">
          <table>
            <thead>
              <tr>
                <th>Feature</th>
                <th>UI</th>
                <th>API</th>
                <th>Backend</th>
                <th>Database</th>
                <th>Tests</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr class="critical">
                <td>User Authentication</td>
                <td>✅</td>
                <td>✅</td>
                <td>⚠️ Mocked</td>
                <td>❌</td>
                <td>❌</td>
                <td>🔴 Incomplete</td>
              </tr>
              <tr class="warning">
                <td>Payment Processing</td>
                <td>❌</td>
                <td>✅</td>
                <td>✅</td>
                <td>✅</td>
                <td>⚠️ Partial</td>
                <td>⚠️ No UI</td>
              </tr>
              <tr class="good">
                <td>User Profile</td>
                <td>✅</td>
                <td>✅</td>
                <td>✅</td>
                <td>✅</td>
                <td>✅</td>
                <td>✅ Complete</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- File explorer with badges -->
        <div class="file-explorer">
          ${this.renderFilesWithBadges()}
        </div>
      </div>
    `;
  }
  
  renderCategories(): string {
    return this.categories
      .sort((a, b) => a.priority - b.priority)
      .map(category => this.renderCategory(category))
      .join('');
  }
  
  renderCategory(category: AnalysisCategory): string {
    const analysis = category.analyze(this.files);
    const isExpanded = this.expandedCategories.has(category.id);
    
    return `
      <div class="category-card" data-category="${category.id}">
        <div class="category-header" onclick="toggleCategory('${category.id}')">
          <span class="icon">${category.icon}</span>
          <span class="name">${category.name}</span>
          <span class="summary">${this.renderSummary(category, analysis)}</span>
          <span class="expand-icon">${isExpanded ? '▼' : '▶'}</span>
        </div>
        
        ${isExpanded ? `
          <div class="category-body">
            ${this.renderExpandedView(category, analysis)}
          </div>
        ` : ''}
      </div>
    `;
  }
  
  renderExpandedView(category: AnalysisCategory, analysis: any): string {
    switch(this.userLevel) {
      case MaturityLevel.NOVICE:
        return this.renderSimpleDetails(category, analysis);
      case MaturityLevel.INTERMEDIATE:
        return this.renderDetailView(category, analysis);
      case MaturityLevel.ADVANCED:
        return this.renderDeepDive(category, analysis);
      case MaturityLevel.EXPERT:
        return this.renderExpertView(category, analysis);
    }
  }
}
```

### 4.2 Visual Components

#### Coverage Bar Component

```typescript
class CoverageBar {
  render(percentage: number): HTMLElement {
    const filled = Math.round(percentage / 10);
    const empty = 10 - filled;
    const color = this.getColor(percentage);
    
    return `
      <div class="coverage-bar">
        <div class="bar" style="background: ${color}">
          ${'█'.repeat(filled)}${'░'.repeat(empty)}
        </div>
        <span class="percentage">${percentage}%</span>
      </div>
    `;
  }
  
  private getColor(percentage: number): string {
    if (percentage >= 80) return '#10b981'; // Green
    if (percentage >= 60) return '#f59e0b'; // Yellow
    if (percentage >= 40) return '#f97316'; // Orange
    return '#ef4444'; // Red
  }
}
```

#### File Health Bubble Chart

```typescript
class FileHealthBubbles {
  render(files: FileMetrics[]): void {
    const bubble = d3.pack()
      .size([this.width, this.height])
      .padding(5);
    
    const root = d3.hierarchy({ children: files })
      .sum(d => d.linesOfCode)
      .sort((a, b) => b.value - a.value);
    
    const nodes = bubble(root).descendants().filter(d => !d.children);
    
    // Create interactive bubbles
    const bubbles = this.svg.selectAll('.bubble')
      .data(nodes)
      .enter().append('g')
      .attr('class', 'bubble')
      .attr('transform', d => `translate(${d.x},${d.y})`);
    
    // Size = LOC, Color = Health
    bubbles.append('circle')
      .attr('r', d => d.r)
      .style('fill', d => this.getHealthColor(d.data))
      .style('opacity', 0.7)
      .on('click', d => this.showFileDetails(d.data))
      .on('mouseover', d => this.showTooltip(d.data));
    
    // Add file name labels
    bubbles.append('text')
      .text(d => this.truncateName(d.data.name))
      .style('font-size', d => Math.min(d.r / 3, 14))
      .style('text-anchor', 'middle');
    
    // Add issue indicators
    bubbles.append('text')
      .attr('class', 'issue-indicator')
      .attr('y', d => -d.r + 10)
      .text(d => this.getIssueIcon(d.data))
      .style('font-size', '16px');
  }
}
```

---

## 5. Test Coverage Deep Dive

### 5.1 Coverage Analysis Engine

```typescript
class TestCoverageAnalyzer {
  async analyzeCoverage(workspace: string): Promise<CoverageReport> {
    // Run coverage tools
    const nycCoverage = await this.runNyc(workspace);
    const jestCoverage = await this.runJest(workspace);
    
    // Merge coverage data
    const merged = this.mergeCoverage([nycCoverage, jestCoverage]);
    
    // Calculate metrics
    return {
      overall: this.calculateOverall(merged),
      byFile: this.calculateByFile(merged),
      uncovered: this.findUncoveredCode(merged),
      critical: this.identifyCriticalGaps(merged),
      quality: await this.assessTestQuality(merged),
      trends: await this.analyzeTrends(merged)
    };
  }
  
  private identifyCriticalGaps(coverage: Coverage): CriticalGap[] {
    const gaps = [];
    
    // Find uncovered error handlers
    for (const file of coverage.files) {
      const ast = this.parseFile(file);
      const errorHandlers = this.findErrorHandlers(ast);
      
      for (const handler of errorHandlers) {
        if (!this.isCovered(handler, coverage)) {
          gaps.push({
            type: 'error-handler',
            location: handler.location,
            risk: 'HIGH',
            suggestion: 'Add tests for error scenarios'
          });
        }
      }
    }
    
    // Find uncovered payment/security code
    const criticalPatterns = [
      /payment|billing|charge/i,
      /auth|security|password/i,
      /encrypt|decrypt|token/i
    ];
    
    for (const pattern of criticalPatterns) {
      const matches = this.findPattern(pattern, coverage);
      gaps.push(...matches.filter(m => !m.covered));
    }
    
    return gaps;
  }
  
  async assessTestQuality(coverage: Coverage): Promise<QualityMetrics> {
    return {
      assertionDensity: await this.calculateAssertionDensity(),
      testMaintainability: await this.assessMaintainability(),
      mutationScore: await this.runMutationTesting(),
      flakiness: await this.detectFlakiness(),
      duplication: await this.findTestDuplication()
    };
  }
}
```

### 5.2 Coverage Visualization

```typescript
class CoverageVisualization {
  renderHeatmap(coverage: FileCoverage[]): void {
    // Create grid where each cell is a file
    // Color intensity = coverage percentage
    // Size = file importance (LOC * complexity)
    
    const grid = d3.select('#coverage-heatmap')
      .selectAll('.file-cell')
      .data(coverage);
    
    grid.enter().append('div')
      .attr('class', 'file-cell')
      .style('background', d => this.coverageToColor(d.percentage))
      .style('width', d => this.sizeByImportance(d))
      .style('height', d => this.sizeByImportance(d))
      .attr('title', d => `${d.file}: ${d.percentage}% covered`)
      .on('click', d => this.drillIntoFile(d));
  }
  
  renderSunburst(coverage: Coverage): void {
    // Hierarchical view: project -> folders -> files
    // Arc size = LOC, Color = coverage
    
    const partition = d3.partition()
      .size([2 * Math.PI, this.radius]);
    
    const root = d3.hierarchy(coverage.tree)
      .sum(d => d.linesOfCode)
      .sort((a, b) => b.value - a.value);
    
    const arc = d3.arc()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .innerRadius(d => d.y0)
      .outerRadius(d => d.y1);
    
    // Render with coverage-based colors
    this.svg.selectAll('path')
      .data(partition(root).descendants())
      .enter().append('path')
      .attr('d', arc)
      .style('fill', d => this.coverageToColor(d.data.coverage));
  }
}
```

---

## 6. Maturity-Aware Features

### 6.1 Adaptive UI

```typescript
class AdaptiveUI {
  private userProfile: UserProfile;
  
  async initialize(): Promise<void> {
    // Load user profile
    this.userProfile = await this.loadProfile();
    
    // Track feature usage
    this.trackUsage();
    
    // Suggest level advancement
    this.monitorReadiness();
  }
  
  renderBasedOnLevel(component: Component, data: any): HTMLElement {
    const level = this.userProfile.maturityLevel;
    
    switch(level) {
      case MaturityLevel.NOVICE:
        return this.renderNoviceView(component, data);
        
      case MaturityLevel.INTERMEDIATE:
        // Show more metrics, enable drill-down
        return this.renderIntermediateView(component, data);
        
      case MaturityLevel.ADVANCED:
        // Full metrics, patterns, suggestions
        return this.renderAdvancedView(component, data);
        
      case MaturityLevel.EXPERT:
        // Custom queries, raw data access
        return this.renderExpertView(component, data);
    }
  }
  
  private monitorReadiness(): void {
    // Track which features user explores
    this.eventBus.on('feature-used', (feature) => {
      this.userProfile.featuresUsed.add(feature);
      
      // Suggest advancement when ready
      if (this.isReadyToAdvance()) {
        this.suggestAdvancement();
      }
    });
  }
  
  private isReadyToAdvance(): boolean {
    const usage = this.userProfile.featuresUsed;
    const level = this.userProfile.maturityLevel;
    
    const requirements = {
      [MaturityLevel.NOVICE]: ['view-details', 'run-analysis'],
      [MaturityLevel.INTERMEDIATE]: ['drill-down', 'compare-metrics'],
      [MaturityLevel.ADVANCED]: ['custom-rules', 'deep-analysis']
    };
    
    const required = requirements[level];
    return required.every(f => usage.has(f));
  }
  
  private suggestAdvancement(): void {
    vscode.window.showInformationMessage(
      'You seem ready for more advanced features. Would you like to unlock them?',
      'Yes, show me more',
      'Not yet'
    ).then(choice => {
      if (choice === 'Yes, show me more') {
        this.userProfile.maturityLevel++;
        this.saveProfile();
        this.refresh();
      }
    });
  }
}
```

### 6.2 Educational Tooltips

```typescript
class EducationalTooltips {
  private tooltips = {
    godObject: {
      novice: "This file is doing too many things. Like a Swiss Army knife - useful but hard to maintain.",
      intermediate: "God Object: A class with too many responsibilities. Violates Single Responsibility Principle.",
      advanced: "God Object detected: 23 methods, 847 LOC, 5+ responsibilities. Consider domain decomposition.",
      expert: "Metrics: WMC=45, DIT=3, NOC=0, CBO=18. Suggest Extract Class refactoring pattern."
    },
    
    testCoverage: {
      novice: "This shows how much of your code is tested. Green is good!",
      intermediate: "Test coverage: Lines covered by tests / Total lines × 100%",
      advanced: "Coverage types: Line, Branch, Function, Statement. Consider path coverage.",
      expert: "Current: Line=76%, Branch=62%, MC/DC=34%. Mutation score: 45%."
    },
    
    complexity: {
      novice: "How many paths through the code. More paths = harder to understand.",
      intermediate: "Cyclomatic complexity: Number of linearly independent paths.",
      advanced: "CC=35. Cognitive complexity=42. Consider extracting methods.",
      expert: "McCabe=35, Cognitive=42, Essential=12. Halstead: n1=45, n2=89, N1=234, N2=567."
    }
  };
  
  show(concept: string, level: MaturityLevel): void {
    const tooltip = this.tooltips[concept];
    const text = tooltip[level];
    
    // Show with appropriate styling
    this.display({
      text,
      className: `tooltip-${level}`,
      learnMoreLink: this.getLearnMoreLink(concept, level)
    });
  }
}
```

---

## 7. Custom Category System

### 7.1 Custom Category Creation

```typescript
class CustomCategoryBuilder {
  createCategory(config: CustomCategoryConfig): AnalysisCategory {
    return {
      id: config.id,
      name: config.name,
      icon: config.icon || '📊',
      
      analyze: (files) => {
        const results = [];
        
        for (const file of files) {
          for (const rule of config.rules) {
            const violations = this.checkRule(file, rule);
            results.push(...violations);
          }
        }
        
        return {
          violations: results,
          score: this.calculateScore(results),
          summary: this.generateSummary(results)
        };
      },
      
      aiPrompts: config.prompts || this.generateDefaultPrompts(config)
    };
  }
  
  // Example: Team-specific category
  createTeamStandardsCategory(): AnalysisCategory {
    return this.createCategory({
      id: 'team-standards',
      name: 'Team Standards',
      icon: '👥',
      rules: [
        {
          name: 'File naming convention',
          pattern: /^[a-z]+(-[a-z]+)*\.(ts|tsx)$/,
          message: 'Use kebab-case for file names'
        },
        {
          name: 'Max file size',
          check: (file) => file.lines <= 200,
          message: 'Files should be under 200 lines'
        },
        {
          name: 'Required file header',
          pattern: /\/\*\*\n \* @author/,
          message: 'Missing required file header'
        }
      ]
    });
  }
}
```

### 7.2 Category Marketplace

```typescript
interface CategoryMarketplace {
  // Share categories with community
  available: [
    {
      name: 'React Best Practices',
      author: 'Facebook',
      downloads: 45000,
      rating: 4.8
    },
    {
      name: 'Node.js Security',
      author: 'OWASP',
      downloads: 23000,
      rating: 4.9
    },
    {
      name: 'Accessibility Audit',
      author: 'a11y-project',
      downloads: 18000,
      rating: 4.7
    }
  ];
  
  install(categoryId: string): Promise<void>;
  publish(category: AnalysisCategory): Promise<void>;
  rate(categoryId: string, rating: number): Promise<void>;
}
```

---

## 8. Integration Points

### 8.1 Threading System Integration

```typescript
class ThreadingIntegration {
  linkAnalysisToThread(
    issue: CodeIssue,
    thread: Thread
  ): void {
    // Connect code issues to discussion threads
    thread.addContext({
      type: 'code-issue',
      category: issue.category,
      severity: issue.severity,
      file: issue.location.file,
      line: issue.location.line
    });
    
    // Show in UI
    issue.relatedThreads.push(thread.id);
  }
  
  generateThreadFromIssue(issue: CodeIssue): Thread {
    return {
      title: `Fix ${issue.type}: ${issue.file}`,
      context: {
        issue,
        suggestedFixes: issue.fixes,
        aiPrompt: this.generatePrompt(issue)
      }
    };
  }
}
```

### 8.2 Knowledge System Integration

```typescript
class KnowledgeIntegration {
  suggestRelevantKnowledge(
    category: AnalysisCategory,
    issues: CodeIssue[]
  ): KnowledgeItem[] {
    const suggestions = [];
    
    // Map issues to knowledge items
    for (const issue of issues) {
      const patterns = this.knowledgeBase.findPatterns({
        type: issue.type,
        category: category.id,
        tags: issue.tags
      });
      
      suggestions.push(...patterns);
    }
    
    // Sort by relevance
    return suggestions.sort((a, b) => 
      b.relevanceScore - a.relevanceScore
    );
  }
  
  createLearningFromFix(
    issue: CodeIssue,
    fix: AppliedFix
  ): void {
    this.knowledgeBase.addLearning({
      trigger: issue.type,
      context: issue.context,
      solution: fix.code,
      outcome: fix.result,
      category: issue.category
    });
  }
}
```

### 8.3 Git Integration

```typescript
class GitIntegration {
  async analyzeCodeEvolution(
    file: string,
    metric: string
  ): Promise<Evolution> {
    const history = await this.git.getFileHistory(file);
    const metrics = [];
    
    for (const commit of history) {
      const version = await this.git.getFileAtCommit(file, commit);
      const analysis = await this.analyzer.analyze(version);
      
      metrics.push({
        commit: commit.hash,
        date: commit.date,
        author: commit.author,
        value: analysis[metric]
      });
    }
    
    return {
      file,
      metric,
      timeline: metrics,
      trend: this.calculateTrend(metrics)
    };
  }
  
  async identifyHotspots(): Promise<Hotspot[]> {
    const fileChanges = await this.git.getChangeFrequency();
    const complexity = await this.analyzer.getComplexity();
    
    // Files with high complexity AND high change frequency
    return fileChanges
      .filter(f => complexity[f.file] > 20)
      .filter(f => f.changes > 10)
      .map(f => ({
        file: f.file,
        risk: f.changes * complexity[f.file],
        message: 'High complexity + frequent changes = bug risk'
      }))
      .sort((a, b) => b.risk - a.risk);
  }
}
```

---

## 9. File Badges System

### 9.1 Badge Generation

```typescript
class FileBadgeGenerator {
  generateBadges(file: FileAnalysis): Badge[] {
    const badges = [];
    
    // Test coverage badge
    badges.push({
      type: 'coverage',
      icon: '🧪',
      text: `${file.coverage}%`,
      color: this.getCoverageColor(file.coverage),
      tooltip: `Test coverage: ${file.coverage}%`
    });
    
    // Health badge
    badges.push({
      type: 'health',
      icon: '💪',
      text: this.getHealthGrade(file.health),
      color: this.getHealthColor(file.health),
      tooltip: `Code health: ${file.health}/100`
    });
    
    // Security badge
    if (file.securityIssues > 0) {
      badges.push({
        type: 'security',
        icon: '🔒',
        text: file.securityIssues.toString(),
        color: 'red',
        tooltip: `${file.securityIssues} security issues`
      });
    }
    
    // Performance badge
    if (file.performanceIssues > 0) {
      badges.push({
        type: 'performance',
        icon: '⚡',
        text: 'Slow',
        color: 'orange',
        tooltip: 'Performance issues detected'
      });
    }
    
    return badges;
  }
  
  renderInExplorer(file: string, badges: Badge[]): void {
    // Add badges to VS Code file explorer
    vscode.window.createTreeView('codeAnalysisBadges', {
      treeDataProvider: {
        getTreeItem: (element) => {
          const item = new vscode.TreeItem(element.label);
          item.description = badges
            .map(b => `${b.icon}${b.text}`)
            .join(' ');
          return item;
        }
      }
    });
  }
}
```

---

## 10. Performance Optimization

### 10.1 Incremental Analysis

```typescript
class IncrementalAnalyzer {
  private cache: Map<string, FileAnalysis> = new Map();
  private dependencyGraph: DependencyGraph;
  
  async analyzeChange(changedFile: string): Promise<void> {
    // Only re-analyze changed file and dependents
    const affected = this.dependencyGraph.getDependents(changedFile);
    affected.add(changedFile);
    
    for (const file of affected) {
      this.cache.delete(file);
      const analysis = await this.analyzeFile(file);
      this.cache.set(file, analysis);
    }
    
    // Update aggregated metrics
    this.updateMetrics();
  }
  
  async analyzeWorkspace(): Promise<WorkspaceAnalysis> {
    // Use parallel processing
    const files = await this.findFiles();
    const batchSize = 10;
    const results = [];
    
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(f => this.analyzeFile(f))
      );
      results.push(...batchResults);
      
      // Update progress
      this.updateProgress((i + batchSize) / files.length);
    }
    
    return this.aggregateResults(results);
  }
}
```

### 10.2 Virtual Rendering

```typescript
class VirtualRenderer {
  renderLargeList(items: any[], container: HTMLElement): void {
    const itemHeight = 80;
    const containerHeight = container.clientHeight;
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    
    let scrollTop = 0;
    let startIndex = 0;
    
    container.addEventListener('scroll', () => {
      scrollTop = container.scrollTop;
      startIndex = Math.floor(scrollTop / itemHeight);
      this.renderVisible(items, startIndex, visibleCount);
    });
    
    // Initial render
    this.renderVisible(items, 0, visibleCount);
  }
  
  private renderVisible(
    items: any[],
    start: number,
    count: number
  ): void {
    const visible = items.slice(start, start + count);
    // Only render visible items
    this.container.innerHTML = visible
      .map(item => this.renderItem(item))
      .join('');
  }
}
```

---

## 11. AI Integration

### 11.1 Prompt Generation

```typescript
class AIPromptGenerator {
  generatePrompt(
    category: AnalysisCategory,
    issue: CodeIssue,
    userLevel: MaturityLevel,
    context: CodeContext
  ): string {
    // Get base prompt for category and level
    let prompt = category.aiPrompts.get(userLevel);
    
    // Special handling for feature completeness issues
    if (category.id === 'feature-completeness') {
      prompt = this.generateCompletenessPrompt(issue, userLevel);
    }
    
    // Inject specific context
    prompt = this.injectContext(prompt, {
      filename: context.file,
      issue: issue.description,
      metrics: issue.metrics,
      codeSnippet: context.snippet
    });
    
    // Add level-appropriate instructions
    prompt += this.getLevelInstructions(userLevel);
    
    // Add output format
    prompt += this.getOutputFormat(userLevel);
    
    return prompt;
  }
  
  private generateCompletenessPrompt(issue: CompletenessIssue, level: MaturityLevel): string {
    const prompts = {
      [MaturityLevel.NOVICE]: `
        The feature "${issue.feature}" is not fully connected.
        ${issue.type === 'backend-only' ? 'Backend exists but no UI.' : ''}
        ${issue.type === 'frontend-only' ? 'UI exists but backend is mocked.' : ''}
        
        Please complete the missing part:
        1. List what needs to be connected
        2. Show the code to connect them
        3. Add simple error handling
        4. Test that it works
      `,
      
      [MaturityLevel.INTERMEDIATE]: `
        Feature "${issue.feature}" has incomplete implementation:
        - Backend: ${issue.backend.status}
        - Frontend: ${issue.frontend.status}
        - API Contract: ${issue.contract.status}
        
        Complete the implementation:
        1. ${issue.missingParts.join('\n2. ')}
        
        Ensure:
        - Proper error handling
        - Loading states
        - Data validation
        - Basic tests
      `,
      
      [MaturityLevel.ADVANCED]: `
        Analyze feature completeness for "${issue.feature}":
        
        Current state:
        ${JSON.stringify(issue.analysis, null, 2)}
        
        Implement:
        1. Missing connections with proper error boundaries
        2. State management integration
        3. Optimistic updates if applicable
        4. Comprehensive error handling
        5. Integration tests covering the full flow
        6. Performance considerations
        
        Consider: race conditions, network failures, data consistency
      `,
      
      [MaturityLevel.EXPERT]: `
        Feature "${issue.feature}" requires full-stack completion:
        
        Analysis: ${JSON.stringify(issue.deepAnalysis, null, 2)}
        
        Provide production-ready implementation:
        1. Complete missing layers with resilience patterns
        2. Implement proper caching strategy
        3. Add circuit breakers for external dependencies
        4. Include telemetry and monitoring
        5. Design for horizontal scaling
        6. Add feature flags for gradual rollout
        7. Include contract tests
        8. Document API changes
        
        Consider: backward compatibility, migration strategy, rollback plan
      `
    };
    
    return prompts[level];
  }
  
  private getLevelInstructions(level: MaturityLevel): string {
    const instructions = {
      [MaturityLevel.NOVICE]: `
        Please explain everything step by step.
        Use simple language and lots of comments.
        Focus on making it work first, then improve.
      `,
      [MaturityLevel.INTERMEDIATE]: `
        Include best practices and explain why.
        Consider edge cases and error handling.
        Use appropriate design patterns.
      `,
      [MaturityLevel.ADVANCED]: `
        Focus on performance and scalability.
        Include comprehensive error handling.
        Consider security implications.
        Suggest alternative approaches.
      `,
      [MaturityLevel.EXPERT]: `
        Provide multiple implementation strategies.
        Include performance benchmarks.
        Consider distributed system implications.
        Suggest architectural improvements.
      `
    };
    
    return instructions[level];
  }
}
```

### 11.2 Related Feature Verification Capabilities

```typescript
class RelatedVerifications {
  /**
   * WebSocket Connection Verification
   */
  async verifyWebSocketConnections(): Promise<WebSocketAnalysis> {
    return {
      clientSockets: await this.findClientSockets(),
      serverHandlers: await this.findServerHandlers(),
      disconnectedSockets: await this.findOrphanedSockets(),
      mockConnections: await this.findMockedWebSockets()
    };
  }
  
  /**
   * State Management Verification
   */
  async verifyStateManagement(): Promise<StateAnalysis> {
    // Check if UI actually updates from backend data
    const storeDefinitions = await this.findStateStores();
    const storeUpdates = await this.findStateUpdaters();
    const storeConsumers = await this.findStateConsumers();
    
    return {
      unusedStores: this.findUnusedStores(storeDefinitions, storeConsumers),
      disconnectedUpdaters: this.findDisconnectedUpdaters(storeUpdates),
      staleData: this.findStaleDataSources(storeDefinitions)
    };
  }
  
  /**
   * Feature Flag Verification
   */
  async verifyFeatureFlags(): Promise<FeatureFlagAnalysis> {
    const flags = await this.findFeatureFlags();
    const usage = await this.findFlagUsage();
    
    return {
      definedButUnused: flags.filter(f => !usage.has(f.name)),
      usedButUndefined: usage.filter(u => !flags.find(f => f.name === u)),
      alwaysEnabled: flags.filter(f => f.defaultValue === true && !f.canToggle),
      deadFlags: await this.findDeadFlags(flags)
    };
  }
  
  /**
   * Authentication Flow Verification
   */
  async verifyAuthFlow(): Promise<AuthFlowAnalysis> {
    return {
      loginImplemented: await this.checkLoginFlow(),
      logoutImplemented: await this.checkLogoutFlow(),
      tokenRefresh: await this.checkTokenRefresh(),
      protectedRoutes: await this.findProtectedRoutes(),
      unprotectedAPIs: await this.findUnprotectedEndpoints(),
      authMiddleware: await this.verifyMiddleware()
    };
  }
  
  /**
   * Database Transaction Verification
   */
  async verifyTransactions(): Promise<TransactionAnalysis> {
    const transactions = await this.findTransactions();
    
    return {
      uncommittedTransactions: await this.findUncommitted(transactions),
      missingRollbacks: await this.findMissingRollbacks(transactions),
      nestedTransactions: await this.findNested(transactions),
      orphanedConnections: await this.findOrphanedConnections()
    };
  }
  
  /**
   * Event Handler Verification
   */
  async verifyEventHandlers(): Promise<EventAnalysis> {
    const emitters = await this.findEventEmitters();
    const listeners = await this.findEventListeners();
    
    return {
      unhandledEvents: emitters.filter(e => !listeners.find(l => l.event === e.event)),
      unusedListeners: listeners.filter(l => !emitters.find(e => e.event === l.event)),
      memoryLeaks: await this.findUnregisteredListeners(listeners)
    };
  }
  
  /**
   * API Rate Limiting Verification
   */
  async verifyRateLimiting(): Promise<RateLimitAnalysis> {
    return {
      unprotectedEndpoints: await this.findUnlimitedEndpoints(),
      inconsistentLimits: await this.findInconsistentLimits(),
      bypassableEndpoints: await this.findBypassable()
    };
  }
  
  /**
   * Caching Strategy Verification
   */
  async verifyCaching(): Promise<CacheAnalysis> {
    return {
      uncachedExpensiveOps: await this.findExpensiveUncached(),
      staleCacheRisks: await this.findStaleCachePoints(),
      cacheInvalidation: await this.verifyCacheInvalidation(),
      redundantCaching: await this.findOverCaching()
    };
  }
}
```

### 11.3 Feature Completeness AI Prompts

```typescript
const featureCompletenessPrompts = {
  backendOnly: {
    novice: `
      I found a backend endpoint that has no frontend:
      Endpoint: [endpoint]
      
      Create a simple UI that:
      1. Has a button or form to trigger this endpoint
      2. Shows the response data
      3. Handles loading and errors
    `,
    expert: `
      Orphaned backend endpoint detected:
      [endpoint details]
      
      Implement complete frontend integration:
      1. Type-safe API client with proper error handling
      2. React Query/SWR integration with caching
      3. Optimistic updates where appropriate
      4. Comprehensive error boundaries
      5. Loading skeletons and progressive enhancement
      6. Accessibility compliance (WCAG 2.1 AA)
    `
  },
  
  frontendOnly: {
    novice: `
      This UI component calls an API that doesn't exist:
      Component: [component]
      API Call: [endpoint]
      
      Please create the backend endpoint that:
      1. Handles the request
      2. Returns appropriate data
      3. Has basic error handling
    `,
    expert: `
      Frontend calling non-existent endpoint:
      [detailed context]
      
      Implement production backend:
      1. RESTful endpoint with proper HTTP semantics
      2. Input validation and sanitization
      3. Authentication/authorization middleware
      4. Rate limiting and abuse prevention
      5. Structured logging and monitoring
      6. Database transactions with proper isolation
      7. Caching strategy
      8. API versioning consideration
    `
  },
  
  mockedService: {
    novice: `
      This feature uses mocked data:
      [mock details]
      
      Replace with real implementation:
      1. Connect to actual database/service
      2. Remove the mock data
      3. Test that it still works
    `,
    expert: `
      Production system using mocked service:
      [detailed mock analysis]
      
      Implement production service:
      1. Design service interface with dependency injection
      2. Implement with proper error handling and retries
      3. Add circuit breaker for resilience
      4. Include distributed tracing
      5. Add health checks and readiness probes
      6. Design for testability (keep mocks for tests)
      7. Document service contracts
      8. Add performance benchmarks
    `
  }
};
```
```

---

## 12. Implementation Phases

### Phase 1: Core Infrastructure (Days 1-3)
- [ ] Category system architecture
- [ ] Base analysis engine
- [ ] File system scanner
- [ ] AST parser setup

### Phase 2: Critical Categories (Days 4-7)
- [ ] **Feature Completeness category (PRIORITY 1)**
  - [ ] Endpoint discovery
  - [ ] API call detection
  - [ ] Mock detection
  - [ ] Connection graph builder
- [ ] **UI/UX Quality category (PRIORITY 1)**
  - [ ] Loading state detection
  - [ ] Error handling detection
  - [ ] Accessibility checker
  - [ ] Form usability analyzer
  - [ ] Responsive design checker

### Phase 3: Feature & UX Deep Dive (Days 8-11)
- [ ] E2E path tracing
- [ ] Contract validation
- [ ] State management verification
- [ ] WebSocket connection verification
- [ ] Dead code detection
- [ ] Performance issue detection
- [ ] Cognitive load assessment

### Phase 4: Internationalization (Days 12-14)
- [ ] **Internationalization category**
  - [ ] Hardcoded string detection
  - [ ] Translation coverage analysis
  - [ ] Date/time/number format checking
  - [ ] RTL support verification
  - [ ] Character encoding validation
- [ ] I18n coverage matrix UI
- [ ] Locale management tools

### Phase 5: Essential Categories (Days 15-17)
- [ ] Test Coverage category
- [ ] Code Health category  
- [ ] Dependencies category
- [ ] Security basics
- [ ] Performance basics

### Phase 6: Progressive UI (Days 18-20)
- [ ] Maturity level selector
- [ ] Progressive disclosure views
- [ ] Category expansion/collapse
- [ ] Educational tooltips
- [ ] Critical alerts for disconnected features
- [ ] UX issue highlighting
- [ ] I18n dashboard

### Phase 7: Advanced Features (Days 21-23)
- [ ] Custom category builder
- [ ] AI prompt generation with completeness focus
- [ ] Advanced security analysis
- [ ] Performance profiling

### Phase 8: Visualizations (Days 24-26)
- [ ] Feature flow Sankey diagram
- [ ] D3.js bubble chart
- [ ] Coverage heatmap
- [ ] Dependency graph
- [ ] Dead code sunburst
- [ ] I18n coverage matrix
- [ ] File badges

### Phase 9: Integration (Days 27-29)
- [ ] Threading system links
- [ ] Knowledge suggestions
- [ ] Git history analysis
- [ ] Session tracking

### Phase 10: Polish & Performance (Days 30-32)
- [ ] Incremental analysis
- [ ] Virtual rendering
- [ ] Caching strategy
- [ ] Error handling
- [ ] User preferences
- [ ] Documentation

---

## 13. Configuration Schema

```json
{
  "agentBrain.codeStructure.enabled": true,
  "agentBrain.codeStructure.defaultMaturityLevel": "novice",
  "agentBrain.codeStructure.categories": {
    "testCoverage": {
      "enabled": true,
      "thresholds": {
        "good": 80,
        "warning": 60,
        "critical": 40
      }
    },
    "codeHealth": {
      "enabled": true,
      "maxComplexity": 20,
      "maxFileSize": 300
    },
    "security": {
      "enabled": true,
      "scanLevel": "standard"
    },
    "custom": []
  },
  "agentBrain.codeStructure.badges": {
    "showInExplorer": true,
    "compactMode": false
  },
  "agentBrain.codeStructure.ai": {
    "promptStyle": "detailed",
    "includeContext": true,
    "maxPromptLength": 2000
  }
}
```

---

## Summary

This comprehensive module provides:

1. **Feature Completeness Verification** (Critical for AI code)
   - Detects backend without frontend and vice versa
   - Identifies mocked vs real implementations
   - Traces complete E2E paths from UI → API → Database
   - Validates API contracts between layers
   - Finds dead code and unused endpoints

2. **UI/UX Quality Analysis** (NEW - Critical for user experience)
   - Missing loading states and error handling
   - Accessibility violations (WCAG compliance)
   - Form usability issues (validation, feedback)
   - Performance problems (re-renders, large lists)
   - Responsive design issues (mobile compatibility)
   - Consistency violations across the app

3. **Internationalization (i18n) Verification** (NEW - Essential for global reach)
   - Detects hardcoded strings that need translation
   - Finds missing translations across locales
   - Date/time/number formatting issues
   - RTL (Right-to-Left) support checking
   - Character encoding problems
   - Locale coverage analysis

4. **Category-based organization** matching successful patterns from threading/knowledge systems

5. **Test coverage as a first-class concern** with deep analysis capabilities

6. **Progressive disclosure** growing from novice to expert views

7. **Maturity-aware AI prompts** providing appropriate guidance at each level

8. **Visual-first design** making complexity immediately understandable

9. **Extensible categories** allowing team customization

10. **Rich integrations** with existing Agent-Brain systems

The system detects "bad design" patterns programmatically:
- **UI/UX Issues**: No loading states, missing error handling, poor accessibility, form crimes
- **I18n Problems**: Hardcoded strings, missing RTL support, incorrect date/number formatting
- **Feature Gaps**: Backend without UI, mocked services, disconnected components

All detectable through code analysis without needing AI interpretation.

**Key Success Metrics:**
- Feature completeness catches 90%+ of disconnected implementations
- UI/UX issues detected before user complaints
- I18n readiness assessed for global deployment
- Novices understand code health within 30 seconds
- 80% of issues have actionable fixes
- Progressive disclosure increases feature adoption by 50%
- Custom categories enable team-specific standards