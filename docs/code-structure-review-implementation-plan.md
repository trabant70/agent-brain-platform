# Code Structure Review Module - Detailed Implementation Plan

## 1. Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    VSCode Extension Layer                        │
├─────────────────────────────────────────────────────────────────┤
│  CodeStructureReviewProvider (VSCode-specific)                  │
│  - Workspace file scanning                                       │
│  - VSCode settings integration                                   │
│  - Message handler for webview                                   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────────┐
│                      Core Domain Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  CodeStructureReviewDomain                                       │
│  ├── Analysis Engine                                             │
│  │   ├── CategoryOrchestrator                                    │
│  │   ├── SourceFileParser (AST)                                  │
│  │   └── ResultAggregator                                        │
│  │                                                                │
│  ├── Categories (Priority 1)                                     │
│  │   ├── FeatureCompletenessAnalyzer                             │
│  │   ├── UIUXQualityAnalyzer                                     │
│  │   └── TestCoverageAnalyzer                                    │
│  │                                                                │
│  ├── Categories (Priority 2+)                                    │
│  │   ├── InternationalizationAnalyzer                            │
│  │   ├── StateManagementAnalyzer                                 │
│  │   ├── ErrorHandlingAnalyzer                                   │
│  │   ├── SecurityAnalyzer                                        │
│  │   ├── PerformanceAnalyzer                                     │
│  │   └── AccessibilityAnalyzer                                   │
│  │                                                                │
│  ├── AI Integration                                              │
│  │   ├── PromptGenerator (maturity-aware)                        │
│  │   ├── PromptTemplateStore                                     │
│  │   └── ThreadingIntegration                                    │
│  │                                                                │
│  └── Reporting                                                   │
│      ├── ReportGenerator                                         │
│      ├── VisualizationDataBuilder                                │
│      └── KnowledgeItemGenerator                                  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                   Visualization Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  CodeStructureViewController                                     │
│  ├── Progressive Disclosure UI                                   │
│  │   ├── SummaryView (Novice)                                    │
│  │   ├── DetailView (Intermediate)                               │
│  │   ├── DeepDiveView (Advanced)                                 │
│  │   └── ExpertView (Expert)                                     │
│  │                                                                │
│  ├── D3 Visualizations                                           │
│  │   ├── SankeyDiagram (data flow)                               │
│  │   ├── BubbleChart (issue distribution)                        │
│  │   ├── HeatMap (coverage)                                      │
│  │   └── SunburstChart (hierarchy)                               │
│  │                                                                │
│  └── Interactions                                                │
│      ├── Category Selection                                      │
│      ├── Maturity Level Toggle                                   │
│      ├── AI Prompt Generation                                    │
│      └── Knowledge Item Creation                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. User Action (VSCode)
   ↓
2. CodeStructureReviewProvider.startAnalysis()
   ↓
3. File Scanning (workspace)
   ↓
4. CategoryOrchestrator.analyze(files)
   ↓
5. Parallel Analysis by Categories
   ├─→ FeatureCompletenessAnalyzer.analyze()
   ├─→ UIUXQualityAnalyzer.analyze()
   └─→ InternationalizationAnalyzer.analyze()
   ↓
6. ResultAggregator.combine(results)
   ↓
7. Send to Webview (message)
   ↓
8. CodeStructureViewController.render(analysis)
   ↓
9. User Interaction
   ├─→ Toggle maturity level
   ├─→ Generate AI prompt → ThreadingIntegration
   └─→ Create knowledge item → KnowledgeItemGenerator
```

## 2. File Structure

### Core Package (`packages/core/src/domains/code-structure-review/`)

```
packages/core/src/domains/code-structure-review/
├── index.ts                              # Public API exports
├── types.ts                              # Core type definitions
│
├── analysis/
│   ├── CategoryOrchestrator.ts           # Coordinates all category analyzers
│   ├── SourceFileParser.ts               # AST parsing with TypeScript compiler
│   ├── ResultAggregator.ts               # Combines results from categories
│   └── AnalysisContext.ts                # Shared context for analysis
│
├── categories/
│   ├── base/
│   │   ├── AnalysisCategory.ts           # Abstract base class
│   │   ├── CategoryTypes.ts              # Category-specific types
│   │   └── CategoryRegistry.ts           # Register/retrieve categories
│   │
│   ├── priority1/
│   │   ├── FeatureCompletenessAnalyzer.ts
│   │   ├── UIUXQualityAnalyzer.ts
│   │   └── TestCoverageAnalyzer.ts
│   │
│   ├── priority2/
│   │   ├── InternationalizationAnalyzer.ts
│   │   ├── StateManagementAnalyzer.ts
│   │   └── ErrorHandlingAnalyzer.ts
│   │
│   └── priority3/
│       ├── SecurityAnalyzer.ts
│       ├── PerformanceAnalyzer.ts
│       └── AccessibilityAnalyzer.ts
│
├── ai/
│   ├── PromptGenerator.ts                # Generate maturity-aware prompts
│   ├── PromptTemplateStore.ts            # Store prompt templates
│   ├── PromptTemplates.ts                # Template definitions
│   └── ThreadingIntegration.ts           # Integration with threading domain
│
├── reporting/
│   ├── ReportGenerator.ts                # Generate analysis reports
│   ├── VisualizationDataBuilder.ts       # Prepare data for D3
│   └── KnowledgeItemGenerator.ts         # Create knowledge items
│
├── detectors/
│   ├── FeatureDetectors.ts               # Feature completeness detectors
│   ├── UIUXDetectors.ts                  # UI/UX issue detectors
│   ├── I18nDetectors.ts                  # i18n issue detectors
│   └── PatternMatchers.ts                # Reusable pattern matching
│
└── utils/
    ├── ASTTraversal.ts                   # AST traversal helpers
    ├── CodePatterns.ts                   # Common code patterns
    └── Thresholds.ts                     # Scoring thresholds
```

### VSCode Package (`packages/vscode/src/`)

```
packages/vscode/src/
├── providers/
│   ├── CodeStructureReviewProvider.ts    # Main provider
│   └── handlers/
│       └── CodeStructureMessageHandler.ts # Message handler for webview
│
└── services/
    ├── WorkspaceScanner.ts               # Scan workspace files
    └── ConfigurationService.ts           # VSCode settings
```

### Visualization (`packages/core/src/domains/visualization/`)

```
packages/core/src/domains/visualization/
├── ui/
│   ├── CodeStructureViewController.ts    # Main view controller
│   ├── code-structure/
│   │   ├── SummaryViewController.ts      # Novice view
│   │   ├── DetailViewController.ts       # Intermediate view
│   │   ├── DeepDiveViewController.ts     # Advanced view
│   │   ├── ExpertViewController.ts       # Expert view
│   │   └── ProgressiveDisclosureManager.ts
│   │
│   └── visualizations/
│       ├── SankeyDiagramRenderer.ts      # Data flow visualization
│       ├── BubbleChartRenderer.ts        # Issue distribution
│       ├── HeatMapRenderer.ts            # Coverage heatmap
│       └── SunburstChartRenderer.ts      # Hierarchy visualization
│
├── styles/
│   └── code-structure-review.css         # Component styles
│
└── templates/
    └── code-structure-review.html        # HTML template
```

## 3. Core Type Definitions

### types.ts

```typescript
import type { MaturityContext } from '../knowledge/types';

// ============================================================================
// Analysis Results
// ============================================================================

export interface CodeStructureAnalysis {
  timestamp: Date;
  workspace: string;
  categories: CategoryAnalysis[];
  summary: AnalysisSummary;
  maturityContext?: MaturityContext;
}

export interface CategoryAnalysis {
  categoryId: string;
  categoryName: string;
  priority: number;
  score: number; // 0-100
  status: 'excellent' | 'good' | 'warning' | 'critical';
  issues: Issue[];
  metrics: Record<string, number>;
  recommendations: Recommendation[];
}

export interface Issue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  filePath: string;
  lineNumber?: number;
  category: string;
  detectorId: string;
  fixSuggestion?: string;
  aiPromptHint?: string;
}

export interface Recommendation {
  id: string;
  priority: 'immediate' | 'soon' | 'later';
  title: string;
  description: string;
  impact: string;
  effort: 'small' | 'medium' | 'large';
  relatedIssues: string[];
}

export interface AnalysisSummary {
  totalFiles: number;
  analyzedFiles: number;
  totalIssues: number;
  criticalIssues: number;
  overallScore: number;
  categoryScores: Record<string, number>;
}

// ============================================================================
// Category System
// ============================================================================

export interface CategoryConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  priority: number;
  enabled: boolean;
  thresholds: CategoryThresholds;
}

export interface CategoryThresholds {
  excellent: number; // >= this score
  good: number;      // >= this score
  warning: number;   // >= this score
  critical: number;  // < this score
}

export interface AnalysisContext {
  files: SourceFile[];
  maturityContext?: MaturityContext;
  config: AnalysisConfig;
}

export interface AnalysisConfig {
  enabledCategories: string[];
  excludePatterns: string[];
  includePatterns: string[];
  maxIssuesPerCategory?: number;
}

// ============================================================================
// Source File Representation
// ============================================================================

export interface SourceFile {
  path: string;
  content: string;
  language: 'typescript' | 'javascript' | 'tsx' | 'jsx' | 'css' | 'html' | 'json';
  ast?: any; // TypeScript AST node
  size: number;
  lines: number;
}

// ============================================================================
// Progressive Disclosure Views
// ============================================================================

export type MaturityLevel = 'novice' | 'intermediate' | 'advanced' | 'expert';

export interface ViewConfig {
  maturityLevel: MaturityLevel;
  visibleCategories: string[];
  visibleMetrics: string[];
  visualizationComplexity: 'simple' | 'moderate' | 'complex';
}

export interface SummaryViewData {
  overallScore: number;
  topIssues: Issue[]; // Top 3-5 critical issues
  quickWins: Recommendation[]; // Easy fixes with high impact
  categoryHighlights: CategoryHighlight[];
}

export interface CategoryHighlight {
  categoryId: string;
  score: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  topIssue?: Issue;
}

export interface DetailViewData extends SummaryViewData {
  categoryDetails: CategoryDetailData[];
  issuesByCategory: Record<string, Issue[]>;
  metricsOverview: Record<string, number>;
}

export interface CategoryDetailData {
  categoryId: string;
  score: number;
  metrics: Record<string, number>;
  issues: Issue[];
  recommendations: Recommendation[];
}

export interface DeepDiveViewData extends DetailViewData {
  visualizations: VisualizationData[];
  issueCorrelations: IssueCorrelation[];
  trendData?: TrendData[];
}

export interface ExpertViewData extends DeepDiveViewData {
  rawMetrics: Record<string, any>;
  astAnalysis: ASTAnalysisData[];
  customQueries: QueryResult[];
}

// ============================================================================
// AI Integration
// ============================================================================

export interface AIPromptTemplate {
  id: string;
  categoryId: string;
  maturityLevel: MaturityLevel;
  template: string;
  variables: string[];
  contextHints: string[];
}

export interface GeneratedPrompt {
  templateId: string;
  prompt: string;
  context: PromptContext;
  threadingMetadata?: any; // For threading integration
}

export interface PromptContext {
  categoryId: string;
  maturityLevel: MaturityLevel;
  relatedIssues: Issue[];
  relevantMetrics: Record<string, number>;
  codeSnippets: CodeSnippet[];
}

export interface CodeSnippet {
  filePath: string;
  lineStart: number;
  lineEnd: number;
  content: string;
  language: string;
}

// ============================================================================
// Visualizations
// ============================================================================

export interface VisualizationData {
  type: 'sankey' | 'bubble' | 'heatmap' | 'sunburst';
  categoryId: string;
  title: string;
  data: any; // D3-specific data structure
  config: VisualizationConfig;
}

export interface VisualizationConfig {
  width?: number;
  height?: number;
  interactive: boolean;
  showLabels: boolean;
  colorScheme: string;
}

// ============================================================================
// Feature Completeness Types
// ============================================================================

export interface FeatureCompletenessResult {
  backendEndpoints: EndpointInfo[];
  frontendComponents: ComponentInfo[];
  disconnectedEndpoints: EndpointInfo[];
  disconnectedComponents: ComponentInfo[];
  mockedServices: MockedServiceInfo[];
  incompleteFeatures: IncompleteFeature[];
}

export interface EndpointInfo {
  path: string;
  method: string;
  filePath: string;
  lineNumber: number;
  handler: string;
  connectedToFrontend: boolean;
  usageCount: number;
}

export interface ComponentInfo {
  name: string;
  filePath: string;
  lineNumber: number;
  apiCalls: string[];
  connectedToBackend: boolean;
  usesRealData: boolean;
}

export interface MockedServiceInfo {
  serviceName: string;
  filePath: string;
  lineNumber: number;
  mockType: 'hardcoded' | 'static-json' | 'mock-function';
  affectedComponents: string[];
}

export interface IncompleteFeature {
  featureName: string;
  hasBackend: boolean;
  hasFrontend: boolean;
  hasTests: boolean;
  completionPercentage: number;
  missingParts: string[];
}

// ============================================================================
// UI/UX Quality Types
// ============================================================================

export interface UIUXQualityResult {
  loadingStates: LoadingStateIssue[];
  errorHandling: ErrorHandlingIssue[];
  emptyStates: EmptyStateIssue[];
  formValidation: FormValidationIssue[];
  userFeedback: UserFeedbackIssue[];
  accessibility: AccessibilityIssue[];
}

export interface LoadingStateIssue {
  componentName: string;
  filePath: string;
  lineNumber: number;
  asyncOperation: string;
  hasLoadingIndicator: boolean;
  loadingType?: 'spinner' | 'skeleton' | 'progress-bar' | 'none';
}

export interface ErrorHandlingIssue {
  componentName: string;
  filePath: string;
  lineNumber: number;
  errorSource: string;
  hasErrorBoundary: boolean;
  showsUserMessage: boolean;
  errorType?: 'network' | 'validation' | 'runtime';
}

export interface EmptyStateIssue {
  componentName: string;
  filePath: string;
  lineNumber: number;
  dataSource: string;
  hasEmptyState: boolean;
  emptyStateQuality?: 'good' | 'basic' | 'none';
}

export interface FormValidationIssue {
  formName: string;
  filePath: string;
  lineNumber: number;
  missingValidation: string[];
  clientSideOnly: boolean;
  showsInlineErrors: boolean;
}

export interface UserFeedbackIssue {
  componentName: string;
  filePath: string;
  lineNumber: number;
  actionType: string;
  hasFeedback: boolean;
  feedbackType?: 'toast' | 'modal' | 'inline' | 'none';
}

export interface AccessibilityIssue {
  componentName: string;
  filePath: string;
  lineNumber: number;
  issueType: 'missing-aria' | 'missing-alt' | 'keyboard-nav' | 'color-contrast';
  severity: 'critical' | 'high' | 'medium' | 'low';
  wcagLevel: 'A' | 'AA' | 'AAA';
}

// ============================================================================
// Internationalization Types
// ============================================================================

export interface I18nAnalysisResult {
  hardcodedStrings: HardcodedString[];
  missingTranslations: MissingTranslation[];
  dateTimeIssues: DateTimeIssue[];
  numberFormatIssues: NumberFormatIssue[];
  rtlSupport: RTLSupportIssue[];
  i18nCoverage: number; // percentage
}

export interface HardcodedString {
  filePath: string;
  lineNumber: number;
  stringValue: string;
  context: string;
  isUserFacing: boolean;
  suggestedKey?: string;
}

export interface MissingTranslation {
  key: string;
  missingLocales: string[];
  foundIn: string;
  priority: 'high' | 'medium' | 'low';
}

export interface DateTimeIssue {
  filePath: string;
  lineNumber: number;
  issueType: 'no-locale' | 'hardcoded-format' | 'missing-timezone';
  code: string;
}

export interface NumberFormatIssue {
  filePath: string;
  lineNumber: number;
  issueType: 'no-locale' | 'currency' | 'decimal-separator';
  code: string;
}

export interface RTLSupportIssue {
  filePath: string;
  lineNumber: number;
  issueType: 'absolute-positioning' | 'text-align' | 'margin-padding' | 'icon-direction';
  property: string;
}

// ============================================================================
// Correlation and Trends
// ============================================================================

export interface IssueCorrelation {
  issue1Id: string;
  issue2Id: string;
  correlationType: 'causes' | 'related-to' | 'depends-on';
  strength: number; // 0-1
  explanation: string;
}

export interface TrendData {
  timestamp: Date;
  categoryScores: Record<string, number>;
  issueCount: number;
  overallScore: number;
}

export interface ASTAnalysisData {
  filePath: string;
  nodeType: string;
  metrics: Record<string, any>;
}

export interface QueryResult {
  queryName: string;
  results: any[];
  metadata: Record<string, any>;
}
```

## 4. Implementation Strategy

### Phase 1: Core Infrastructure (Days 1-3)

**Goals:**
- Set up project structure
- Create base types and interfaces
- Implement category system foundation
- Create basic analysis engine

**Tasks:**

#### Day 1: Project Structure & Types
1. Create directory structure in core package
2. Define all core types in `types.ts`
3. Create `CategoryRegistry` for managing categories
4. Implement `AnalysisContext` for shared context

#### Day 2: Base Category System
1. Implement `AnalysisCategory` abstract base class
2. Create `CategoryOrchestrator` for parallel analysis
3. Implement `ResultAggregator` for combining results
4. Add basic error handling and logging

#### Day 3: Source File Parser
1. Implement `SourceFileParser` with TypeScript compiler API
2. Create AST traversal utilities
3. Add file type detection
4. Implement caching for parsed files

**Deliverables:**
- Complete type system
- Working category registration system
- Basic AST parsing capability
- Unit tests for core infrastructure

### Phase 2: Priority 1 Categories (Days 4-7)

**Goals:**
- Implement Feature Completeness analyzer
- Implement UI/UX Quality analyzer
- Create basic detectors

#### Day 4-5: Feature Completeness
1. Implement `FeatureCompletenessAnalyzer`
2. Create endpoint detector (Express/Fastify routes)
3. Create component detector (React/Vue components)
4. Implement connection analysis
5. Detect mocked services

**Key Algorithms:**
```typescript
// Detect disconnected endpoints
1. Extract all backend endpoints (Express routes)
2. Extract all frontend API calls (fetch/axios)
3. Match endpoints with API calls by path
4. Report unmatched endpoints as disconnected
5. Calculate connection score

// Detect mocked services
1. Find files with "mock", "stub", "fixture" in path
2. Analyze imports in components
3. Check for hardcoded data arrays
4. Detect static JSON imports
5. Report mocked services with affected components
```

#### Day 6-7: UI/UX Quality
1. Implement `UIUXQualityAnalyzer`
2. Create async operation detector
3. Implement loading state detector
4. Create error handling analyzer
5. Implement empty state detector
6. Add form validation checker

**Key Algorithms:**
```typescript
// Detect missing loading states
1. Find async operations (async/await, .then(), useEffect with fetch)
2. Check component for loading state variable
3. Check JSX for loading indicators (<Spinner>, "Loading...")
4. Report missing loading indicators

// Detect missing error handling
1. Find try/catch blocks around async operations
2. Check for error state variables
3. Check for error display in JSX
4. Verify error boundaries in component tree
```

**Deliverables:**
- Working Feature Completeness analyzer
- Working UI/UX Quality analyzer
- Comprehensive detector library
- Integration tests

### Phase 3: Internationalization (Days 8-9)

**Goals:**
- Implement i18n analyzer
- Detect hardcoded strings
- Analyze translation coverage

#### Day 8: I18n Detection
1. Implement `InternationalizationAnalyzer`
2. Create hardcoded string detector
3. Implement translation key checker
4. Add date/time format analyzer

**Key Algorithms:**
```typescript
// Detect hardcoded strings
1. Traverse AST for string literals
2. Filter out: imports, technical constants, test files
3. Check if string is wrapped in t() or i18n()
4. Use heuristics: length > 2, contains spaces, user-facing context
5. Report hardcoded user-facing strings

// Check translation coverage
1. Extract all translation keys from code
2. Load translation files for all locales
3. Compare keys across locales
4. Report missing translations per locale
5. Calculate coverage percentage
```

#### Day 9: I18n Advanced
1. Implement RTL support checker
2. Add number/currency format detector
3. Create locale-specific detectors
4. Add i18n best practices checker

**Deliverables:**
- Working i18n analyzer
- Hardcoded string detection
- Translation coverage reports

### Phase 4: Progressive Disclosure UI (Days 10-13)

**Goals:**
- Create webview UI with maturity levels
- Implement progressive disclosure
- Basic visualizations

#### Day 10: UI Foundation
1. Create HTML template (`code-structure-review.html`)
2. Implement `CodeStructureViewController`
3. Add maturity level selector
4. Create category list/grid view

#### Day 11: View Controllers
1. Implement `SummaryViewController` (novice)
2. Implement `DetailViewController` (intermediate)
3. Implement `DeepDiveViewController` (advanced)
4. Implement `ExpertViewController` (expert)

#### Day 12: Progressive Disclosure Manager
1. Implement view switching logic
2. Add smooth transitions
3. Implement data filtering by maturity
4. Add local storage for preferences

#### Day 13: Basic Visualizations
1. Implement score gauges (D3)
2. Create simple bar charts for category scores
3. Add issue severity breakdown chart
4. Implement trend line (if history available)

**Deliverables:**
- Working webview UI
- All 4 maturity levels functional
- Basic D3 visualizations
- Responsive layout

### Phase 5: AI Integration (Days 14-16)

**Goals:**
- Implement prompt generation
- Integrate with threading system
- Create knowledge items

#### Day 14: Prompt System
1. Implement `PromptGenerator`
2. Create `PromptTemplateStore`
3. Define prompt templates for each category × maturity level
4. Add variable substitution

#### Day 15: Threading Integration
1. Implement `ThreadingIntegration`
2. Connect to existing threading domain
3. Add "Generate AI Prompt" button to UI
4. Send prompts to threading system

#### Day 16: Knowledge Items
1. Implement `KnowledgeItemGenerator`
2. Create templates for converting issues to knowledge items
3. Add "Create Learning" button to UI
4. Integrate with knowledge domain

**Deliverables:**
- Working AI prompt generation
- Threading integration functional
- Knowledge item creation working

### Phase 6: Advanced Visualizations (Days 17-19)

**Goals:**
- Implement Sankey diagram
- Implement bubble chart
- Implement heatmap
- Implement sunburst chart

#### Day 17: Sankey Diagram
1. Implement `SankeyDiagramRenderer`
2. Build data flow visualization (backend → frontend)
3. Add interactive tooltips
4. Color code by connection status

#### Day 18: Bubble Chart & Heatmap
1. Implement `BubbleChartRenderer` for issue distribution
2. Implement `HeatMapRenderer` for file-level issues
3. Add zoom/pan interactions
4. Add drill-down capability

#### Day 19: Sunburst Chart
1. Implement `SunburstChartRenderer` for category hierarchy
2. Add interactive expansion
3. Implement breadcrumb navigation
4. Add export to image functionality

**Deliverables:**
- 4 advanced D3 visualizations
- Interactive and responsive
- Export capabilities

### Phase 7: VSCode Integration (Days 20-22)

**Goals:**
- Implement VSCode provider
- Add command palette commands
- Integrate with settings
- Add status bar item

#### Day 20: Provider Implementation
1. Implement `CodeStructureReviewProvider`
2. Add workspace file scanning
3. Implement progress reporting
4. Add cancellation support

#### Day 21: Commands & Settings
1. Register "Analyze Code Structure" command
2. Add "Quick Analysis" command (Priority 1 only)
3. Create VSCode settings schema
4. Implement configuration service

#### Day 22: UI Integration
1. Add status bar item with score
2. Implement webview panel
3. Add context menu items
4. Create quick pick for category selection

**Deliverables:**
- Full VSCode integration
- Command palette commands
- Settings integration
- Status bar indicator

### Phase 8: Testing & Polish (Days 23-25)

**Goals:**
- Comprehensive testing
- Performance optimization
- Documentation

#### Day 23: Testing
1. Unit tests for all analyzers
2. Integration tests for full analysis flow
3. E2E tests for VSCode commands
4. Test edge cases and error handling

#### Day 24: Performance
1. Profile analysis performance
2. Implement caching strategy
3. Optimize AST traversal
4. Add incremental analysis (only changed files)

#### Day 25: Documentation
1. Write API documentation
2. Create user guide
3. Add JSDoc comments
4. Create troubleshooting guide

**Deliverables:**
- >80% test coverage
- Optimized performance
- Complete documentation

## 5. Integration Points

### With Existing Knowledge System

```typescript
// Generate knowledge items from code structure issues
interface CodeStructureKnowledgeItem {
  type: 'learning' | 'gotcha' | 'best-practice';
  title: string;
  content: string;
  tags: string[];
  source: 'code-structure-review';
  metadata: {
    categoryId: string;
    issueId: string;
    severity: string;
    filePath: string;
  };
}

// Example: Convert UI/UX issue to learning
const issue: Issue = {
  id: 'uiux-001',
  severity: 'high',
  title: 'Missing loading state in UserList',
  description: 'Component fetches data but shows no loading indicator',
  filePath: 'src/components/UserList.tsx',
  category: 'ui-ux-quality'
};

const knowledgeItem: CodeStructureKnowledgeItem = {
  type: 'learning',
  title: 'Always show loading states for async operations',
  content: `
## Problem
The UserList component fetches data asynchronously but doesn't show a loading indicator, leaving users confused during the fetch.

## Solution
Add a loading state and show a spinner or skeleton while data is loading:
\`\`\`tsx
const [loading, setLoading] = useState(false);
if (loading) return <Spinner />;
\`\`\`

## Impact
Improves perceived performance and user experience by providing feedback during async operations.
  `,
  tags: ['ui-ux', 'loading-state', 'react', 'async'],
  source: 'code-structure-review',
  metadata: {
    categoryId: 'ui-ux-quality',
    issueId: 'uiux-001',
    severity: 'high',
    filePath: 'src/components/UserList.tsx'
  }
};
```

### With Existing Threading System

```typescript
// Generate AI prompts and send to threading
interface ThreadingPromptPayload {
  prompt: string;
  context: {
    source: 'code-structure-review';
    categoryId: string;
    maturityLevel: MaturityLevel;
    relatedFiles: string[];
    issues: Issue[];
  };
  metadata: {
    analysisTimestamp: Date;
    workspace: string;
  };
}

// Example: Generate prompt for feature completeness issue
const prompt: ThreadingPromptPayload = {
  prompt: `
I've detected a backend endpoint that doesn't appear to be connected to the frontend:

**Endpoint:** POST /api/users/:id/preferences
**Location:** src/api/routes/users.ts:45

This endpoint exists but I can't find any frontend code calling it. This could indicate:
1. An incomplete feature implementation
2. Dead code that should be removed
3. A frontend component I missed

Could you help me understand:
- Is this endpoint intentionally unused?
- Should there be a frontend component using it?
- If it's incomplete, what's the plan for implementing the frontend part?

Related files:
- Backend: src/api/routes/users.ts
- Possible frontend locations: src/components/UserSettings.tsx, src/pages/ProfilePage.tsx
  `,
  context: {
    source: 'code-structure-review',
    categoryId: 'feature-completeness',
    maturityLevel: 'intermediate',
    relatedFiles: [
      'src/api/routes/users.ts',
      'src/components/UserSettings.tsx'
    ],
    issues: [/* related issues */]
  },
  metadata: {
    analysisTimestamp: new Date(),
    workspace: '/path/to/workspace'
  }
};
```

### With Visualization System

```typescript
// Use existing visualization infrastructure
import { TimelineViewController } from '../visualization/ui/TimelineViewController';
import { D3Renderer } from '../visualization/renderers/D3Renderer';

// CodeStructureViewController extends base ViewController
class CodeStructureViewController extends BaseViewController {
  private d3Renderer: D3Renderer;

  constructor() {
    super();
    this.d3Renderer = new D3Renderer();
  }

  renderVisualization(data: VisualizationData): void {
    switch (data.type) {
      case 'sankey':
        this.renderSankey(data);
        break;
      case 'bubble':
        this.renderBubble(data);
        break;
      // ...
    }
  }
}
```

## 6. Configuration

### VSCode Settings Schema

```json
{
  "agentBrain.codeStructureReview.enabled": {
    "type": "boolean",
    "default": true,
    "description": "Enable code structure review analysis"
  },
  "agentBrain.codeStructureReview.autoAnalyze": {
    "type": "boolean",
    "default": false,
    "description": "Automatically analyze on file save"
  },
  "agentBrain.codeStructureReview.enabledCategories": {
    "type": "array",
    "items": {
      "type": "string",
      "enum": [
        "feature-completeness",
        "ui-ux-quality",
        "test-coverage",
        "internationalization",
        "state-management",
        "error-handling",
        "security",
        "performance",
        "accessibility"
      ]
    },
    "default": [
      "feature-completeness",
      "ui-ux-quality",
      "internationalization"
    ],
    "description": "Categories to include in analysis"
  },
  "agentBrain.codeStructureReview.defaultMaturityLevel": {
    "type": "string",
    "enum": ["novice", "intermediate", "advanced", "expert"],
    "default": "intermediate",
    "description": "Default maturity level for UI display"
  },
  "agentBrain.codeStructureReview.excludePatterns": {
    "type": "array",
    "items": {
      "type": "string"
    },
    "default": [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/*.test.ts",
      "**/*.spec.ts"
    ],
    "description": "File patterns to exclude from analysis"
  }
}
```

## 7. Success Metrics

### Analysis Performance
- **Target:** Analyze 1000 files in < 10 seconds
- **Measurement:** Profile with large codebases (Agent Brain Platform, VSCode)

### Detection Accuracy
- **Feature Completeness:** >95% accuracy on known disconnected endpoints
- **UI/UX Quality:** >90% accuracy on missing loading states
- **I18n:** >95% accuracy on hardcoded strings

### User Experience
- **Progressive Disclosure:** Users can find relevant info at their level in < 30 seconds
- **AI Prompts:** Generated prompts lead to actionable conversations 80% of the time
- **Knowledge Items:** Generated items require minimal editing before use

### Integration
- **Threading:** Seamless prompt generation and thread creation
- **Knowledge:** Automated knowledge item creation from issues
- **Timeline:** Analysis events appear on timeline correctly

## 8. Risk Mitigation

### Technical Risks

**Risk 1: AST Parsing Performance**
- **Mitigation:** Implement caching, incremental analysis, worker threads
- **Fallback:** Regex-based parsing for simple patterns

**Risk 2: False Positives in Detection**
- **Mitigation:** Conservative detection algorithms, confidence scores
- **Fallback:** User feedback mechanism to improve detectors

**Risk 3: D3 Visualization Complexity**
- **Mitigation:** Start with simple visualizations, progressive enhancement
- **Fallback:** Use static charts if D3 becomes too complex

### Integration Risks

**Risk 4: Threading System Changes**
- **Mitigation:** Use stable public APIs, abstract integration layer
- **Fallback:** Standalone prompt generation without threading

**Risk 5: Knowledge System Changes**
- **Mitigation:** Use existing knowledge item interfaces
- **Fallback:** Export knowledge items as markdown files

## 9. Testing Strategy

### Unit Tests (Jest)
```typescript
describe('FeatureCompletenessAnalyzer', () => {
  it('should detect disconnected backend endpoints', () => {
    const files = [
      createMockFile('backend/routes.ts', `
        app.post('/api/users', handler);
      `),
      createMockFile('frontend/App.tsx', `
        // No API call to /api/users
      `)
    ];

    const result = analyzer.analyze({ files });

    expect(result.disconnectedEndpoints).toHaveLength(1);
    expect(result.disconnectedEndpoints[0].path).toBe('/api/users');
  });

  it('should not flag connected endpoints', () => {
    const files = [
      createMockFile('backend/routes.ts', `
        app.post('/api/users', handler);
      `),
      createMockFile('frontend/UserService.ts', `
        fetch('/api/users', { method: 'POST' });
      `)
    ];

    const result = analyzer.analyze({ files });

    expect(result.disconnectedEndpoints).toHaveLength(0);
  });
});
```

### Integration Tests
```typescript
describe('Code Structure Analysis End-to-End', () => {
  it('should perform full analysis on sample project', async () => {
    const provider = new CodeStructureReviewProvider();
    const result = await provider.analyzeWorkspace('/path/to/sample');

    expect(result.categories).toHaveLength(3); // Feature, UX, i18n
    expect(result.summary.totalFiles).toBeGreaterThan(0);
    expect(result.summary.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.summary.overallScore).toBeLessThanOrEqual(100);
  });
});
```

### Manual Testing Checklist
- [ ] Analyze Agent Brain Platform codebase
- [ ] Verify all 3 priority 1 categories produce results
- [ ] Test each maturity level view
- [ ] Generate AI prompts for various issue types
- [ ] Create knowledge items from detected issues
- [ ] Test visualization interactions (zoom, pan, drill-down)
- [ ] Verify performance on large codebases (>1000 files)
- [ ] Test configuration options work correctly
- [ ] Verify i18n strings are translated
- [ ] Test edge cases (empty project, single file, errors)

## 10. Deployment Plan

### Phase 1: Internal Alpha (Days 26-27)
- Deploy to local VSCode extension
- Test with Agent Brain Platform codebase
- Gather initial feedback
- Fix critical bugs

### Phase 2: Beta Testing (Days 28-29)
- Create VSIX package
- Share with beta testers
- Collect feedback on accuracy and usability
- Iterate on detectors based on feedback

### Phase 3: Documentation (Day 30)
- Finalize user guide
- Record demo video
- Create tutorial for adding new categories
- Write blog post announcement

### Phase 4: Release (Days 31-32)
- Merge to main branch
- Bump version number
- Create release notes
- Publish VSIX
- Announce to users

## 11. Future Enhancements (Post-MVP)

### Additional Categories
- **Dependency Health** - Outdated packages, unused dependencies
- **Code Duplication** - Similar code blocks, refactoring opportunities
- **Architecture Violations** - Layer violations, circular dependencies
- **Documentation Coverage** - Missing JSDoc, outdated comments

### Advanced Features
- **Historical Tracking** - Track score trends over time
- **Team Comparison** - Compare projects or teams
- **Custom Rules** - User-defined analysis rules
- **CI/CD Integration** - Run analysis in pipelines
- **Export Reports** - PDF, HTML, JSON export

### AI Enhancements
- **Automated Fixes** - Auto-generate fix PRs
- **Contextual Prompts** - More sophisticated prompt generation
- **Learning from Fixes** - Improve detectors based on user fixes

## 12. Next Steps

1. **Create base type definitions** - Implement `types.ts` with all interfaces
2. **Set up directory structure** - Create all folders and index files
3. **Implement CategoryRegistry** - Foundation for category system
4. **Create AnalysisCategory base class** - Abstract class for all analyzers
5. **Implement SourceFileParser** - AST parsing with TypeScript compiler

The implementation will proceed incrementally, with continuous testing and integration with existing Agent Brain Platform systems.
