/**
 * Visualization Data Contracts
 * Unified, explicit contracts for all visualization types
 *
 * Purpose: Single source of truth for data shapes flowing from mapper to visualizations
 * Benefits:
 * - Compile-time type safety
 * - Runtime validation support
 * - Self-documenting code
 * - Prevents data contract mismatches
 */

// ============================================================================
// Test Coverage Network
// ============================================================================

export interface TestCoverageNode {
  id: string;
  name: string;
  type: 'test' | 'source';
  filePath: string;
  coverage?: number;        // Percentage (0-100) for source files
  testCount?: number;       // Number of tests for test files
  linesCovered?: number;
  totalLines?: number;
}

export interface TestCoverageLink {
  source: string;
  target: string;
  coveragePercent: number;  // How much of target this test covers
  linesCovered: number;
}

export interface TestCoverageGraphData {
  nodes: TestCoverageNode[];
  links: TestCoverageLink[];
  overallCoverage: number;
}

// ============================================================================
// Dependency Graph
// ============================================================================

export interface DependencyNode {
  id: string;
  label: string;
  type: 'component' | 'service' | 'utility' | 'config' | 'test' | 'other';
  issueCount: number;
  inDegree: number;
  outDegree: number;
  group?: number;
  metadata: {
    path: string;
    hasIssues: boolean;
    categories: string[];
  };
}

export interface DependencyLink {
  source: string;
  target: string;
  type: 'import' | 'export' | 'both';
  strength: number;
}

export interface DependencyGraphData {
  nodes: DependencyNode[];
  links: DependencyLink[];
  isEmpty: boolean;
  emptyReason?: string;
}

// ============================================================================
// Parallel Coordinates
// ============================================================================

export interface ParallelDimension {
  key: string;
  label: string;
  type: 'numeric' | 'categorical';
  domain?: [number, number] | string[];
}

export interface ParallelDataPoint {
  id: string;
  name: string;
  values: Record<string, number | string>;
  category?: string;
}

export interface ParallelCoordinatesData {
  dimensions: ParallelDimension[];
  data: ParallelDataPoint[];
}

// ============================================================================
// Stream Graph
// ============================================================================

export interface StreamDataPoint {
  timestamp: Date | string;
  values: Record<string, number>;
}

export interface StreamLayer {
  key: string;
  label: string;
  color?: string;
}

export interface StreamGraphData {
  data: StreamDataPoint[];
  layers: StreamLayer[];
}

// ============================================================================
// Matrix View
// ============================================================================

export interface MatrixNode {
  id: string;
  name: string;
  group: string;
  index: number;
}

export interface MatrixCell {
  source: number;
  target: number;
  value: number;
  type?: string;
}

export interface MatrixViewData {
  nodes: MatrixNode[];
  cells: MatrixCell[];
  isEmpty?: boolean;
  emptyReason?: string;
}

// ============================================================================
// Heatmap
// ============================================================================

export interface HeatmapCell {
  file: string;
  fullPath: string;
  count: number;
  critical: number;
  high: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export type HeatmapData = HeatmapCell[];

// ============================================================================
// Sankey Diagram
// ============================================================================

export interface SankeyNode {
  id: string;
  name: string;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

// ============================================================================
// Bubble Chart
// ============================================================================

export interface BubbleNode {
  id: string;
  name: string;
  value: number;
  critical: number;
  high: number;
  score: number;
  status: string;
  metadata: {
    categoryId: string;
    issueCount: number;
  };
}

export interface BubbleChartData {
  children: BubbleNode[];
}

// ============================================================================
// Gauge Chart
// ============================================================================

export interface GaugeZone {
  from: number;
  to: number;
  color: string;
  label: string;
}

export interface GaugeData {
  value: number;
  min: number;
  max: number;
  target: number;
  title: string;
  unit: string;
  zones: GaugeZone[];
}

// ============================================================================
// Radar Chart
// ============================================================================

export interface RadarDataPoint {
  category: string;
  score: number;
  maxScore: number;
  description: string;
}

export interface RadarDataset {
  name: string;
  dataPoints: RadarDataPoint[];
}

export interface RadarChartData {
  datasets: RadarDataset[];
}

// ============================================================================
// Timeline
// ============================================================================

export interface TimelinePoint {
  timestamp: Date;
  commit: string;
  overallScore: number;
  categoryScores: Record<string, number>;
}

export interface TimelineData {
  categories: string[];
  points: TimelinePoint[];
}

// ============================================================================
// Calendar Heatmap
// ============================================================================

export interface CalendarDay {
  date: Date;
  value: number;
  details: {
    score?: number;
    commit?: string;
  };
}

export interface CalendarHeatmapData {
  days: CalendarDay[];
  metric: string;
  maxValue: number;
}

// ============================================================================
// I18n Geographic Heatmap
// ============================================================================

export interface I18nRegion {
  code: string;
  name: string;
  value: number;
  metadata: {
    missingKeys: number;
  };
}

export interface I18nGeographicData {
  regions: I18nRegion[];
}

// ============================================================================
// Stacked Bar Chart
// ============================================================================

export interface FileIssueBreakdown {
  filePath: string;
  fileName: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

export interface StackedBarData {
  files: FileIssueBreakdown[];
  maxCount: number;
}

// ============================================================================
// Sunburst & Treemap (Hierarchical)
// ============================================================================

export interface HierarchicalNode {
  name: string;
  value?: number;
  children?: HierarchicalNode[];
  categoryId?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
}

// ============================================================================
// Flame Graph
// ============================================================================

export interface FlameGraphNode {
  name: string;
  value: number;
  children?: FlameGraphNode[];
}

export type FlameGraphData = FlameGraphNode;

// ============================================================================
// Chord Diagram
// ============================================================================

export interface ChordData {
  modules: string[];
  matrix: number[][];
}

// ============================================================================
// Validation Result
// ============================================================================

export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  errors?: string[];
}

// ============================================================================
// Empty State Info
// ============================================================================

export interface EmptyStateInfo {
  message: string;
  icon?: string;
  suggestions?: string[];
}
