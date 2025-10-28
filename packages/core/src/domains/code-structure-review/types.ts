/**
 * Core type definitions for Code Structure Review domain
 */

import type { MaturityContext } from '../knowledge/types';

// Re-export MaturityContext for use in this domain
export type { MaturityContext };

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

export type SourceLanguage = 'typescript' | 'javascript' | 'tsx' | 'jsx' | 'css' | 'html' | 'json';

export interface SourceFile {
  path: string;
  content: string;
  language: SourceLanguage;
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

export type VisualizationType = 'sankey' | 'bubble' | 'heatmap' | 'sunburst';

export interface VisualizationData {
  type: VisualizationType;
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

export type CorrelationType = 'causes' | 'related-to' | 'depends-on';

export interface IssueCorrelation {
  issue1Id: string;
  issue2Id: string;
  correlationType: CorrelationType;
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

// ============================================================================
// Test Coverage Types (Priority 1 Category)
// ============================================================================

export interface TestCoverageResult {
  overallCoverage: CoverageMetrics;
  filesCoverage: FileCoverage[];
  untested: UntestedCode[];
  testQuality: TestQualityMetrics;
}

export interface CoverageMetrics {
  line: number;      // percentage
  branch: number;    // percentage
  function: number;  // percentage
  statement: number; // percentage
}

export interface FileCoverage {
  filePath: string;
  coverage: CoverageMetrics;
  hasTests: boolean;
  testFilePath?: string;
}

export interface UntestedCode {
  filePath: string;
  lineStart: number;
  lineEnd: number;
  codeType: 'function' | 'class' | 'component' | 'util';
  importance: 'critical' | 'high' | 'medium' | 'low';
}

export interface TestQualityMetrics {
  totalTests: number;
  passingTests: number;
  flakyTests: string[];
  slowTests: string[];
  mutationScore?: number; // Mutation testing score
}

// ============================================================================
// Knowledge Integration Types
// ============================================================================

export interface CodeStructureKnowledgeItem {
  type: 'learning' | 'gotcha' | 'best-practice' | 'adr';
  title: string;
  content: string;
  tags: string[];
  source: 'code-structure-review';
  metadata: {
    categoryId: string;
    issueId: string;
    severity: string;
    filePath: string;
    analysisTimestamp: Date;
  };
}

// ============================================================================
// Threading Integration Types
// ============================================================================

export interface ThreadingPromptPayload {
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

// ============================================================================
// Analysis Events (for logging and monitoring)
// ============================================================================

export interface AnalysisEvent {
  type: 'analysis-start' | 'analysis-complete' | 'analysis-error' | 'category-complete';
  timestamp: Date;
  categoryId?: string;
  duration?: number;
  error?: Error;
  metadata?: Record<string, any>;
}
