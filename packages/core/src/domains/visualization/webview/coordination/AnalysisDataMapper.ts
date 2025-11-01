/**
 * Analysis Data Mapper
 * Transforms raw analysis results into visualization-ready data formats
 *
 * Responsibilities:
 * - Convert analysis data to each visualization type's expected format
 * - Apply maturity level filtering
 * - Cache transformed data for performance
 * - Aggregate and summarize data as needed
 */

import type { FilterCriteria } from '../ui-panels/SearchFilter';

// Note: Using any for complex types to avoid circular dependencies during Phase 1
// Will refine types in Phase 2 when implementing specific visualizations
type BubbleChartData = any;
type GaugeData = any;
type RadarChartData = any;
type SunburstNode = any;
type HeatmapData = any;
type SankeyData = any;
type TimelineData = any;
type DependencyGraphData = any;
type ChordData = any;
type ParallelCoordinatesData = any;
type CalendarHeatmapData = any;
type TestCoverageData = any;
type I18nGeographicData = any;
type StackedBarData = any;
type TreemapData = any;
type FlameGraphData = any;

/**
 * Analysis data structure (from Code Structure Review)
 */
export interface AnalysisData {
  summary?: {
    overallScore?: number;
    totalIssues?: number;
    criticalIssues?: number;
    highIssues?: number;
    mediumIssues?: number;
    lowIssues?: number;
    categories?: any[];
  };
  categories?: Array<{
    categoryId: string;
    categoryName: string;
    score?: number;
    status?: string;
    issues?: Array<{
      severity: string;
      file?: string;
      line?: number;
      message?: string;
      category?: string;
      impact?: string;
    }>;
  }>;
  files?: Array<{
    path: string;
    issues?: any[];
    size?: number;
    complexity?: number;
    coverage?: number;
  }>;
  dependencies?: Array<{
    source: string;
    target: string;
    type?: string;
    count?: number;
  }>;
  timeline?: Array<{
    timestamp: Date;
    score?: number;
    issues?: number;
    commit?: string;
  }>;
  testCoverage?: {
    overall?: number;
    files?: Array<{
      file: string;
      coverage: number;
      tests?: string[];
    }>;
  };
  i18n?: {
    locales?: Array<{
      code: string;
      name: string;
      coverage: number;
      missingKeys?: number;
    }>;
  };
}

/**
 * Cache for transformed data
 */
interface DataCache {
  data: any;
  timestamp: number;
  analysisHash: string;
}

/**
 * Analysis Data Mapper
 */
export class AnalysisDataMapper {
  private cache: Map<string, DataCache> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  /**
   * Overview: Category bubble chart
   */
  toBubbleChart(analysis: AnalysisData): BubbleChartData {
    const cacheKey = 'bubble';
    const cached = this.getCached(cacheKey, analysis);
    if (cached) return cached;

    const data: BubbleChartData = {
      children: (analysis.categories || []).map(cat => ({
        id: cat.categoryId,
        name: cat.categoryName,
        value: cat.issues?.length || 0,
        critical: cat.issues?.filter(i => i.severity === 'critical').length || 0,
        high: cat.issues?.filter(i => i.severity === 'high').length || 0,
        score: cat.score || 0,
        status: cat.status || 'warning',
        metadata: {
          categoryId: cat.categoryId,
          issueCount: cat.issues?.length || 0
        }
      }))
    };

    this.setCached(cacheKey, data, analysis);
    return data;
  }

  /**
   * Overview: Overall health gauge
   */
  toGaugeChart(analysis: AnalysisData, metric: 'overall' | 'security' | 'quality' = 'overall'): GaugeData {
    const cacheKey = `gauge-${metric}`;
    const cached = this.getCached(cacheKey, analysis);
    if (cached) return cached;

    let value = 0;
    let label = 'Overall Score';
    let target = 80;

    if (metric === 'overall') {
      value = analysis.summary?.overallScore || 0;
      label = 'Code Quality Score';
    } else {
      const category = (analysis.categories || []).find(c =>
        c.categoryId.toLowerCase().includes(metric)
      );
      value = category?.score || 0;
      label = `${category?.categoryName || metric} Score`;
    }

    const data: GaugeData = {
      value,
      min: 0,
      max: 100,
      target,
      title: label,
      unit: 'pts',
      zones: [
        { from: 0, to: 40, color: '#dc2626', label: 'Critical' },
        { from: 40, to: 70, color: '#f59e0b', label: 'Warning' },
        { from: 70, to: 90, color: '#3b82f6', label: 'Good' },
        { from: 90, to: 100, color: '#10b981', label: 'Excellent' }
      ]
    };

    this.setCached(cacheKey, data, analysis);
    return data;
  }

  /**
   * Overview: Category radar comparison
   */
  toRadarChart(analysis: AnalysisData): RadarChartData {
    const cacheKey = 'radar';
    const cached = this.getCached(cacheKey, analysis);
    if (cached) return cached;

    const categories = analysis.categories || [];

    const data: RadarChartData = {
      datasets: [
        {
          name: 'Current Score',
          dataPoints: categories.map(cat => ({
            category: cat.categoryName,
            score: cat.score || 0,
            maxScore: 100,
            description: cat.categoryId
          }))
        },
        {
          name: 'Target',
          dataPoints: categories.map(cat => ({
            category: cat.categoryName,
            score: 80, // Target score
            maxScore: 100,
            description: 'Target score'
          }))
        }
      ]
    };

    this.setCached(cacheKey, data, analysis);
    return data;
  }

  /**
   * Overview: File hierarchy sunburst
   */
  toSunburstDiagram(analysis: AnalysisData): SunburstNode {
    const cacheKey = 'sunburst';
    const cached = this.getCached(cacheKey, analysis);
    if (cached) return cached;

    const files = Array.isArray(analysis.files) ? analysis.files : [];
    const root = this.buildFileHierarchy(files);

    this.setCached(cacheKey, root, analysis);
    return root;
  }

  /**
   * Category Detail: Issue density heatmap
   */
  toHeatmap(analysis: AnalysisData, categoryId?: string): HeatmapData {
    const cacheKey = `heatmap-${categoryId || 'all'}`;
    const cached = this.getCached(cacheKey, analysis);
    if (cached) return cached;

    const categories = analysis.categories || [];
    const targetCategory = categoryId
      ? categories.find(c => c.categoryId === categoryId)
      : null;

    // Get issues from target category or all categories
    const issues = targetCategory
      ? (targetCategory.issues || [])
      : categories.flatMap(c => c.issues || []);

    // Group issues by file
    const fileIssueMap = new Map<string, { critical: number; high: number; medium: number; low: number; total: number }>();

    issues.forEach(issue => {
      const filePath = issue.file || 'unknown';
      if (!fileIssueMap.has(filePath)) {
        fileIssueMap.set(filePath, { critical: 0, high: 0, medium: 0, low: 0, total: 0 });
      }
      const counts = fileIssueMap.get(filePath)!;
      counts.total++;
      if (issue.severity === 'critical') counts.critical++;
      else if (issue.severity === 'high') counts.high++;
      else if (issue.severity === 'medium') counts.medium++;
      else if (issue.severity === 'low') counts.low++;
    });

    // Convert to HeatmapCell array
    const data: HeatmapData = Array.from(fileIssueMap.entries()).map(([filePath, counts]) => {
      const fileName = filePath.split('/').pop() || filePath;
      const maxSeverity: 'critical' | 'high' | 'medium' | 'low' =
        counts.critical > 0 ? 'critical' :
        counts.high > 0 ? 'high' :
        counts.medium > 0 ? 'medium' : 'low';

      return {
        file: fileName,
        fullPath: filePath,
        count: counts.total,
        critical: counts.critical,
        high: counts.high,
        severity: maxSeverity
      };
    });

    this.setCached(cacheKey, data, analysis);
    return data;
  }

  /**
   * Overview: Category → Severity flow sankey (for overview page)
   */
  toOverviewSankey(analysis: AnalysisData): SankeyData {
    const cacheKey = 'sankey-overview';
    const cached = this.getCached(cacheKey, analysis);
    if (cached) return cached;

    const categories = analysis.categories || [];

    if (categories.length === 0) {
      return { nodes: [], links: [] };
    }

    // Create flow: Category → Severity
    const categoryNodes: Array<{ id: string; name: string }> = [];
    const severityNodes = new Set<string>();
    const links: Array<{ source: string; target: string; value: number }> = [];

    categories.forEach(cat => {
      const issues = cat.issues || [];
      if (issues.length > 0) {
        // Add category node
        categoryNodes.push({
          id: `category-${cat.categoryId}`,
          name: cat.categoryName
        });

        // Aggregate severity counts
        issues.forEach(issue => {
          if (issue.severity) {
            severityNodes.add(issue.severity);
            const sourceId = `category-${cat.categoryId}`;
            const targetId = `severity-${issue.severity}`;
            const existing = links.find(l => l.source === sourceId && l.target === targetId);
            if (existing) {
              existing.value++;
            } else {
              links.push({ source: sourceId, target: targetId, value: 1 });
            }
          }
        });
      }
    });

    const nodes = [
      ...categoryNodes,
      ...Array.from(severityNodes).map(sev => ({
        id: `severity-${sev}`,
        name: sev.toUpperCase()
      }))
    ];

    const data: SankeyData = { nodes, links };

    this.setCached(cacheKey, data, analysis);
    return data;
  }

  /**
   * Category Detail: Data flow sankey (File → Severity for single category)
   */
  toSankeyDiagram(analysis: AnalysisData, categoryId: string): SankeyData {
    const cacheKey = `sankey-${categoryId}`;
    const cached = this.getCached(cacheKey, analysis);
    if (cached) return cached;

    const category = (analysis.categories || []).find(c => c.categoryId === categoryId);
    const issues = category?.issues || [];

    // Check if we have any issues with the required fields
    if (issues.length === 0) {
      return { nodes: [], links: [] };
    }

    // Create flow: Files → Severity (simplified, since impact might not be available)
    const fileNodes = new Set<string>();
    const severityNodes = new Set<string>();

    issues.forEach(issue => {
      if (issue.file) fileNodes.add(issue.file);
      if (issue.severity) severityNodes.add(issue.severity);
    });

    // Limit to top 10 files to avoid clutter
    const topFiles = Array.from(fileNodes).slice(0, 10);

    const nodes = [
      ...topFiles.map(file => ({
        id: `file-${file}`,
        name: this.getFileName(file)
      })),
      ...Array.from(severityNodes).map(sev => ({
        id: `severity-${sev}`,
        name: sev.toUpperCase()
      }))
    ];

    const links: Array<{ source: string; target: string; value: number }> = [];

    // File → Severity links (only for top files)
    issues.forEach(issue => {
      if (issue.file && topFiles.includes(issue.file) && issue.severity) {
        const sourceId = `file-${issue.file}`;
        const targetId = `severity-${issue.severity}`;
        const existing = links.find(l => l.source === sourceId && l.target === targetId);
        if (existing) {
          existing.value++;
        } else {
          links.push({ source: sourceId, target: targetId, value: 1 });
        }
      }
    });

    const data: SankeyData = { nodes, links };

    this.setCached(cacheKey, data, analysis);
    return data;
  }

  /**
   * Category Detail: Timeline trends
   */
  toTimelineVisualization(analysis: AnalysisData, categoryId?: string): TimelineData {
    const cacheKey = `timeline-${categoryId || 'all'}`;
    const cached = this.getCached(cacheKey, analysis);
    if (cached) return cached;

    // Since streaming analysis doesn't include historical timeline data,
    // create a single-point timeline from current analysis
    const categories = analysis.categories || [];
    const categoryNames = categories.map(c => c.categoryName);
    const currentTime = new Date();

    const categoryScores: Record<string, number> = {};
    categories.forEach(cat => {
      categoryScores[cat.categoryName] = cat.score || 0;
    });

    const data: TimelineData = {
      categories: categoryNames,
      points: [
        {
          timestamp: currentTime,
          commit: 'current',
          overallScore: analysis.summary?.overallScore || 0,
          categoryScores
        }
      ]
    };

    this.setCached(cacheKey, data, analysis);
    return data;
  }

  /**
   * Advanced: Dependency graph
   * FIXED: Filters out invalid file paths, provides explicit empty states
   */
  toDependencyGraph(analysis: AnalysisData): any {
    const cacheKey = 'dependency-graph';
    const cached = this.getCached(cacheKey, analysis);
    if (cached) return cached;

    const categories = analysis.categories || [];

    // Extract all unique files with valid paths
    const fileMap = new Map<string, any>();
    categories.forEach(cat => {
      (cat.issues || []).forEach(issue => {
        const filePath = issue.file;

        // SKIP invalid file paths (unknown, null, undefined, N/A, etc.)
        if (!filePath ||
            filePath === 'unknown' ||
            filePath === 'N/A' ||
            filePath.trim() === '' ||
            filePath === 'undefined') {
          return;  // Skip this issue
        }

        if (!fileMap.has(filePath)) {
          fileMap.set(filePath, {
            id: filePath,
            issueCount: 0,
            categories: new Set<string>()
          });
        }
        const fileData = fileMap.get(filePath)!;
        fileData.issueCount++;
        fileData.categories.add(cat.categoryName);
      });
    });

    // If no valid files found, return explicit empty state
    if (fileMap.size === 0) {
      const emptyData = {
        nodes: [],
        links: [],
        isEmpty: true,
        emptyReason: 'No valid file data available in analysis results'
      };
      this.setCached(cacheKey, emptyData, analysis);
      return emptyData;
    }

    const files = Array.from(fileMap.values()).slice(0, 30); // Limit to 30 files for performance

    // Create nodes with enhanced metadata
    const nodes = files.map(file => ({
      id: file.id,
      label: this.getFileName(file.id),
      type: this.inferFileType(file.id) as 'component' | 'service' | 'utility' | 'config' | 'test' | 'other',
      issueCount: file.issueCount,
      inDegree: 0,  // Will be calculated
      outDegree: 0,  // Will be calculated
      group: file.categories.size,
      metadata: {
        path: file.id,
        hasIssues: file.issueCount > 0,
        categories: Array.from(file.categories)
      }
    }));

    // Create links based on shared categories (placeholder for real dependencies)
    const links: any[] = [];
    for (let i = 0; i < files.length - 1; i++) {
      for (let j = i + 1; j < files.length; j++) {
        const file1 = files[i];
        const file2 = files[j];

        // Check if files share categories
        const sharedCats = Array.from(file1.categories).filter(c => file2.categories.has(c));
        if (sharedCats.length > 0) {
          links.push({
            source: file1.id,
            target: file2.id,
            type: 'import' as const,
            strength: sharedCats.length
          });

          // Update degrees
          const node1 = nodes.find(n => n.id === file1.id);
          const node2 = nodes.find(n => n.id === file2.id);
          if (node1) node1.outDegree++;
          if (node2) node2.inDegree++;
        }
      }
    }

    const data = {
      nodes,
      links: links.slice(0, 50),  // Limit links for performance
      isEmpty: false
    };

    this.setCached(cacheKey, data, analysis);
    return data;
  }

  /**
   * Helper: Infer file type from extension (better type inference)
   */
  private inferFileType(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const fileName = this.getFileName(path).toLowerCase();

    // Test files
    if (fileName.includes('.test.') || fileName.includes('.spec.') || fileName.includes('test')) {
      return 'test';
    }

    // Config files
    if (['json', 'yaml', 'yml', 'toml', 'ini', 'env', 'config'].includes(ext)) {
      return 'config';
    }

    // Components (React, Vue, etc.)
    if (['tsx', 'jsx', 'vue', 'svelte'].includes(ext)) {
      return 'component';
    }

    // Services/utilities
    if (fileName.includes('service') || fileName.includes('api') || fileName.includes('client')) {
      return 'service';
    }

    if (fileName.includes('util') || fileName.includes('helper') || fileName.includes('lib')) {
      return 'utility';
    }

    // Default based on extension
    if (['ts', 'js', 'py', 'java', 'go', 'rs', 'cpp', 'c'].includes(ext)) {
      return 'other';
    }

    return 'other';
  }

  /**
   * Advanced: Dependency matrix view
   * Compact visualization of all dependencies in matrix format
   */
  toMatrixView(analysis: AnalysisData): any {
    const cacheKey = 'matrix';
    const cached = this.getCached(cacheKey, analysis);
    if (cached) return cached;

    // Get dependency graph data first
    const depGraph = this.toDependencyGraph(analysis);

    // Use MatrixViewDataBuilder to convert to matrix format
    const MatrixViewDataBuilder = require('../../../code-structure-review/data-builders/MatrixViewDataBuilder').MatrixViewDataBuilder;
    const matrixData = MatrixViewDataBuilder.buildFromDependencyGraph(depGraph);

    this.setCached(cacheKey, matrixData, analysis);
    return matrixData;
  }

  /**
   * Advanced: Module coupling chord diagram
   */
  toChordDiagram(analysis: AnalysisData): ChordData {
    const cacheKey = 'chord';
    const cached = this.getCached(cacheKey, analysis);
    if (cached) return cached;

    const categories = analysis.categories || [];

    // Since we don't have real dependency data yet, create a chord from categories
    // showing how issues overlap between categories (placeholder)
    const modules = categories.map(c => c.categoryName);

    // Create a matrix showing category relationships (simplified for now)
    const matrix: number[][] = Array(modules.length)
      .fill(0)
      .map(() => Array(modules.length).fill(0));

    // Add some connections based on shared files (placeholder logic)
    categories.forEach((cat, i) => {
      categories.forEach((other, j) => {
        if (i !== j) {
          // Count shared files between categories
          const catFiles = new Set((cat.issues || []).map(iss => iss.file));
          const otherFiles = new Set((other.issues || []).map(iss => iss.file));
          const shared = Array.from(catFiles).filter(f => otherFiles.has(f)).length;
          matrix[i][j] = shared;
        }
      });
    });

    const data: ChordData = {
      modules,
      matrix
    };

    this.setCached(cacheKey, data, analysis);
    return data;
  }

  /**
   * Advanced: Multi-dimensional parallel coordinates
   */
  toParallelCoordinates(analysis: AnalysisData): ParallelCoordinatesData {
    const cacheKey = 'parallel';
    const cached = this.getCached(cacheKey, analysis);
    if (cached) return cached;

    const categories = analysis.categories || [];

    // Extract all unique files from all categories
    const fileMap = new Map<string, any>();
    categories.forEach(cat => {
      (cat.issues || []).forEach(issue => {
        const filePath = issue.file || 'unknown';
        if (!fileMap.has(filePath)) {
          fileMap.set(filePath, {
            path: filePath,
            issues: [],
            categories: new Set<string>()
          });
        }
        const fileData = fileMap.get(filePath)!;
        fileData.issues.push(issue);
        fileData.categories.add(cat.categoryName);
      });
    });

    const files = Array.from(fileMap.values());

    // Handle empty data case
    if (files.length === 0) {
      const emptyData: ParallelCoordinatesData = {
        dimensions: [
          { key: 'issues', label: 'Total Issues', type: 'numeric', domain: [0, 1] },
          { key: 'categories', label: 'Categories', type: 'numeric', domain: [0, 1] },
          { key: 'critical', label: 'Critical', type: 'numeric', domain: [0, 1] },
          { key: 'high', label: 'High Priority', type: 'numeric', domain: [0, 1] }
        ],
        data: []
      };
      this.setCached(cacheKey, emptyData, analysis);
      return emptyData;
    }

    // Calculate metrics
    const issueValues = files.map(f => f.issues.length);
    const categoryValues = files.map(f => f.categories.size);
    const criticalValues = files.map(f => f.issues.filter((i: any) => i.severity === 'critical').length);
    const highValues = files.map(f => f.issues.filter((i: any) => i.severity === 'high').length);

    // Calculate max values safely
    const maxIssues = Math.max(...issueValues, 1);
    const maxCategories = Math.max(...categoryValues, 1);
    const maxCritical = Math.max(...criticalValues, 1);
    const maxHigh = Math.max(...highValues, 1);

    const data: ParallelCoordinatesData = {
      dimensions: [
        {
          key: 'issues',
          label: 'Total Issues',
          type: 'numeric',
          domain: [0, maxIssues]
        },
        {
          key: 'categories',
          label: 'Categories',
          type: 'numeric',
          domain: [0, maxCategories]
        },
        {
          key: 'critical',
          label: 'Critical',
          type: 'numeric',
          domain: [0, maxCritical]
        },
        {
          key: 'high',
          label: 'High Priority',
          type: 'numeric',
          domain: [0, maxHigh]
        }
      ],
      data: files.slice(0, 50).map(file => ({  // Limit to 50 files for performance
        id: file.path,
        name: this.getFileName(file.path),
        values: {
          issues: file.issues.length,
          categories: file.categories.size,
          critical: file.issues.filter((i: any) => i.severity === 'critical').length,
          high: file.issues.filter((i: any) => i.severity === 'high').length
        },
        category: this.calculateMaxSeverity(file.issues)
      }))
    };

    this.setCached(cacheKey, data, analysis);
    return data;
  }

  /**
   * Advanced: Activity calendar heatmap
   */
  toCalendarHeatmap(analysis: AnalysisData): CalendarHeatmapData {
    const cacheKey = 'calendar';
    const cached = this.getCached(cacheKey, analysis);
    if (cached) return cached;

    const timeline = analysis.timeline || [];

    // If no timeline, create a single day for current state
    const days = timeline.length > 0
      ? timeline.map(point => ({
          date: point.timestamp,
          value: point.issues || 0,
          details: {
            score: point.score,
            commit: point.commit
          }
        }))
      : [{
          date: new Date(),
          value: analysis.summary?.totalIssues || 0,
          details: {
            score: analysis.summary?.overallScore
          }
        }];

    const maxValue = Math.max(...days.map(d => d.value), 1);

    const data: CalendarHeatmapData = {
      days,
      metric: 'Issues',
      maxValue
    };

    this.setCached(cacheKey, data, analysis);
    return data;
  }

  /**
   * Category Detail: Test coverage network
   * FIXED: Returns unified nodes array matching TestCoverageGraphData contract
   */
  toTestCoverageNetwork(analysis: AnalysisData): any {
    const cacheKey = 'test-coverage';
    const cached = this.getCached(cacheKey, analysis);
    if (cached) return cached;

    const coverage = analysis.testCoverage?.files || [];

    // Create unified nodes array (test nodes + source nodes)
    const nodes: any[] = [];
    const testNodeIds = new Set<string>();

    // Add source files as nodes
    coverage.forEach(file => {
      nodes.push({
        id: `source-${file.file}`,
        name: this.getFileName(file.file),
        type: 'source',
        filePath: file.file,
        coverage: file.coverage,
        linesCovered: 0,  // placeholder
        totalLines: 0     // placeholder
      });

      // Track test files to avoid duplicates
      (file.tests || []).forEach(test => {
        if (!testNodeIds.has(test)) {
          testNodeIds.add(test);
          nodes.push({
            id: `test-${test}`,
            name: this.getFileName(test),
            type: 'test',
            filePath: test,
            testCount: 1
          });
        }
      });
    });

    // Create links from test to source
    const links: any[] = coverage.flatMap(file =>
      (file.tests || []).map(test => ({
        source: `test-${test}`,
        target: `source-${file.file}`,
        coveragePercent: file.coverage || 0,
        linesCovered: 0  // placeholder
      }))
    );

    const data = {
      nodes,
      links,
      overallCoverage: analysis.testCoverage?.overall || 0
    };

    this.setCached(cacheKey, data, analysis);
    return data;
  }

  /**
   * Category Detail: i18n geographic heatmap
   */
  toI18nGeographicHeatmap(analysis: AnalysisData): I18nGeographicData {
    const cacheKey = 'i18n-geo';
    const cached = this.getCached(cacheKey, analysis);
    if (cached) return cached;

    const locales = analysis.i18n?.locales || [];

    const data: I18nGeographicData = {
      regions: locales.map(locale => ({
        code: locale.code,
        name: locale.name,
        value: locale.coverage,
        metadata: {
          missingKeys: locale.missingKeys || 0
        }
      }))
    };

    this.setCached(cacheKey, data, analysis);
    return data;
  }

  /**
   * Category Detail: Stacked bar chart
   */
  toStackedBarChart(analysis: AnalysisData, categoryId?: string): StackedBarData {
    const cacheKey = `stacked-bar-${categoryId || 'all'}`;
    const cached = this.getCached(cacheKey, analysis);
    if (cached) return cached;

    const categories = analysis.categories || [];
    const targetCategory = categoryId
      ? categories.find(c => c.categoryId === categoryId)
      : null;

    // Get issues from target category or all categories
    const issues = targetCategory
      ? (targetCategory.issues || [])
      : categories.flatMap(c => c.issues || []);

    // Group issues by file
    const fileIssueMap = new Map<string, { critical: number; high: number; medium: number; low: number; total: number }>();

    issues.forEach(issue => {
      const filePath = issue.file || 'unknown';
      if (!fileIssueMap.has(filePath)) {
        fileIssueMap.set(filePath, { critical: 0, high: 0, medium: 0, low: 0, total: 0 });
      }
      const counts = fileIssueMap.get(filePath)!;
      counts.total++;
      if (issue.severity === 'critical') counts.critical++;
      else if (issue.severity === 'high') counts.high++;
      else if (issue.severity === 'medium') counts.medium++;
      else if (issue.severity === 'low') counts.low++;
    });

    // Convert to FileIssueBreakdown array
    const files = Array.from(fileIssueMap.entries()).map(([filePath, counts]) => ({
      filePath,
      fileName: this.getFileName(filePath),
      critical: counts.critical,
      high: counts.high,
      medium: counts.medium,
      low: counts.low,
      total: counts.total
    }));

    // Take top 20 files by total issues
    const sortedFiles = files.sort((a, b) => b.total - a.total).slice(0, 20);
    const maxCount = sortedFiles.length > 0 ? sortedFiles[0].total : 0;

    const data: StackedBarData = {
      files: sortedFiles,
      maxCount
    };

    this.setCached(cacheKey, data, analysis);
    return data;
  }

  /**
   * Overview: Treemap visualization
   */
  toTreemap(analysis: AnalysisData): TreemapData {
    const cacheKey = 'treemap';
    const cached = this.getCached(cacheKey, analysis);
    if (cached) return cached;

    const categories = analysis.categories || [];

    // Build treemap from categories
    const root: TreemapData = {
      name: 'Code Structure',
      children: categories.map(cat => ({
        name: cat.categoryName,
        value: cat.issues?.length || 0,
        categoryId: cat.categoryId,
        severity: this.calculateMaxSeverity(cat.issues || []) as 'critical' | 'high' | 'medium' | 'low'
      }))
    };

    this.setCached(cacheKey, root, analysis);
    return root;
  }

  /**
   * Advanced: Flame graph for file structure
   */
  toFlameGraph(analysis: AnalysisData): FlameGraphData {
    const cacheKey = 'flame-graph';
    const cached = this.getCached(cacheKey, analysis);
    if (cached) return cached;

    const files = Array.isArray(analysis.files) ? analysis.files : [];
    const root = this.buildFlameGraphHierarchy(files);

    this.setCached(cacheKey, root, analysis);
    return root;
  }

  /**
   * Transform to StreamGraph data
   * Shows how category issue counts change over time
   */
  toStreamGraph(analysis: AnalysisData, categoryId?: string): any {
    const cacheKey = `stream-graph-${categoryId || 'all'}`;
    const cached = this.getCached(cacheKey, analysis);
    if (cached) return cached;

    const timeline = Array.isArray(analysis.timeline) ? analysis.timeline : [];
    const categories = Array.isArray(analysis.categories) ? analysis.categories : [];

    // If no timeline data, create a single point from current state
    if (timeline.length === 0) {
      const currentTime = new Date();

      if (categoryId) {
        const category = categories.find(c => c.categoryId === categoryId);
        if (!category || !category.issues) {
          return { data: [], layers: [] };
        }

        // Group issues by file
        const fileIssues = new Map<string, number>();
        category.issues.forEach(issue => {
          const file = this.getFileName(issue.file || 'Unknown');
          fileIssues.set(file, (fileIssues.get(file) || 0) + 1);
        });

        // Create layers for top 10 files
        const topFiles = Array.from(fileIssues.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);

        const values: Record<string, number> = {};
        topFiles.forEach(([file, count]) => {
          values[file] = count;
        });

        const data = {
          data: [{ timestamp: currentTime, values }],
          layers: topFiles.map(([file]) => ({ key: file, label: file }))
        };

        this.setCached(cacheKey, data, analysis);
        return data;
      }

      // Category-level
      const values: Record<string, number> = {};
      categories.forEach(cat => {
        values[cat.categoryName] = cat.issues?.length || 0;
      });

      const data = {
        data: [{ timestamp: currentTime, values }],
        layers: categories.map(cat => ({ key: cat.categoryName, label: cat.categoryName }))
      };

      this.setCached(cacheKey, data, analysis);
      return data;
    }

    // If single category selected, show file-level streams
    if (categoryId) {
      const category = categories.find(c => c.categoryId === categoryId);
      if (!category || !category.issues) {
        return { data: [], layers: [] };
      }

      // Group issues by file
      const fileIssues = new Map<string, number>();
      category.issues.forEach(issue => {
        const file = this.getFileName(issue.file || 'Unknown');
        fileIssues.set(file, (fileIssues.get(file) || 0) + 1);
      });

      // Create layers for top 10 files
      const topFiles = Array.from(fileIssues.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      // Create data points for each timeline point
      const dataPoints = timeline.map(t => {
        const values: Record<string, number> = {};
        topFiles.forEach(([file, count]) => {
          values[file] = count / timeline.length;
        });
        return { timestamp: t.timestamp, values };
      });

      const data = {
        data: dataPoints,
        layers: topFiles.map(([file]) => ({ key: file, label: file }))
      };

      this.setCached(cacheKey, data, analysis);
      return data;
    }

    // Show category-level streams
    const dataPoints = timeline.map(t => {
      const values: Record<string, number> = {};
      categories.forEach(cat => {
        values[cat.categoryName] = (cat.issues?.length || 0) / timeline.length;
      });
      return { timestamp: t.timestamp, values };
    });

    const data = {
      data: dataPoints,
      layers: categories.map(cat => ({ key: cat.categoryName, label: cat.categoryName }))
    };

    this.setCached(cacheKey, data, analysis);
    return data;
  }

  /**
   * Helper: Build file hierarchy for sunburst/treemap
   */
  private buildFileHierarchy(files: any[]): any {
    const root: any = {
      name: 'root',
      children: []
    };

    files.forEach((file: any) => {
      const parts = file.path.split('/');
      let current = root;

      parts.forEach((part: string, index: number) => {
        if (!current.children) {
          current.children = [];
        }

        let child = current.children.find((c: any) => c.name === part);
        if (!child) {
          child = {
            name: part,
            children: index < parts.length - 1 ? [] : undefined,
            value: index === parts.length - 1 ? (file.issues?.length || 1) : undefined
          };
          current.children.push(child);
        }

        current = child;
      });
    });

    return root;
  }

  /**
   * Helper: Build flame graph hierarchy
   */
  private buildFlameGraphHierarchy(files: any[]): FlameGraphData {
    const root = this.buildFileHierarchy(files);

    const convertToFlameNode = (node: any): any => {
      return {
        name: node.name,
        value: node.size || (node.children?.reduce((sum: number, c: any) => sum + (c.size || 0), 0) || 1),
        children: node.children?.map(convertToFlameNode)
      };
    };

    return convertToFlameNode(root);
  }

  /**
   * Helper: Get file name from path
   */
  private getFileName(path: string): string {
    const parts = path.split('/');
    return parts[parts.length - 1] || path;
  }

  /**
   * Helper: Get file type from extension
   */
  private getFileType(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    const typeMap: Record<string, string> = {
      ts: 'TypeScript',
      js: 'JavaScript',
      tsx: 'React',
      jsx: 'React',
      css: 'Style',
      scss: 'Style',
      html: 'Markup',
      json: 'Config',
      md: 'Docs'
    };
    return typeMap[ext || ''] || 'Other';
  }

  /**
   * Helper: Calculate max severity from issues
   */
  private calculateMaxSeverity(issues: any[]): string {
    if (issues.some(i => i.severity === 'critical')) return 'critical';
    if (issues.some(i => i.severity === 'high')) return 'high';
    if (issues.some(i => i.severity === 'medium')) return 'medium';
    if (issues.some(i => i.severity === 'low')) return 'low';
    return 'info';
  }

  /**
   * Helper: Get color for severity
   */
  private getSeverityColor(severity: string): string {
    const colors: Record<string, string> = {
      critical: '#dc2626',
      high: '#f59e0b',
      medium: '#3b82f6',
      low: '#10b981',
      info: '#6b7280'
    };
    return colors[severity] || '#6b7280';
  }

  /**
   * Filter analysis data based on criteria
   * @param analysis The original analysis data
   * @param criteria Filter criteria from SearchFilter
   * @returns Filtered analysis data
   */
  filterAnalysisData(analysis: AnalysisData, criteria: FilterCriteria): AnalysisData {
    // If no filters applied, return original data
    if (!this.hasActiveFilters(criteria)) {
      return analysis;
    }

    // Deep clone to avoid mutations
    const filtered: AnalysisData = {
      summary: { ...analysis.summary },
      categories: [],
      files: [],
      dependencies: analysis.dependencies ? [...analysis.dependencies] : [],
      timeline: analysis.timeline ? [...analysis.timeline] : [],
      testCoverage: analysis.testCoverage ? { ...analysis.testCoverage } : {},
      i18n: analysis.i18n ? { ...analysis.i18n } : {}
    };

    // Filter categories
    const filteredCategories = this.filterCategories(
      analysis.categories || [],
      criteria
    );
    filtered.categories = filteredCategories;

    // Filter files
    const filteredFiles = this.filterFiles(
      Array.isArray(analysis.files) ? analysis.files : [],
      criteria
    );
    filtered.files = filteredFiles;

    // Recalculate summary based on filtered data
    filtered.summary = this.recalculateSummary(filteredCategories);

    // Clear cache when filters change
    this.clearCache();

    return filtered;
  }

  /**
   * Check if any filters are active
   */
  private hasActiveFilters(criteria: FilterCriteria): boolean {
    return !!(
      criteria.searchQuery ||
      criteria.categories?.length ||
      criteria.severities?.length ||
      criteria.filePattern ||
      criteria.minScore !== undefined ||
      criteria.maxScore !== undefined
    );
  }

  /**
   * Filter categories based on criteria
   */
  private filterCategories(categories: any[], criteria: FilterCriteria): any[] {
    return categories
      .filter(cat => {
        // Category ID filter
        if (criteria.categories?.length && !criteria.categories.includes(cat.categoryId)) {
          return false;
        }

        // Score range filter
        if (criteria.minScore !== undefined && (cat.score || 0) < criteria.minScore) {
          return false;
        }
        if (criteria.maxScore !== undefined && (cat.score || 0) > criteria.maxScore) {
          return false;
        }

        // Search query (search in category name)
        if (criteria.searchQuery) {
          const query = criteria.searchQuery.toLowerCase();
          if (!cat.categoryName.toLowerCase().includes(query)) {
            return false;
          }
        }

        return true;
      })
      .map(cat => ({
        ...cat,
        issues: this.filterIssues(cat.issues || [], criteria)
      }));
  }

  /**
   * Filter issues based on criteria
   */
  private filterIssues(issues: any[], criteria: FilterCriteria): any[] {
    return issues.filter(issue => {
      // Severity filter
      if (criteria.severities?.length && !criteria.severities.includes(issue.severity)) {
        return false;
      }

      // File pattern filter
      if (criteria.filePattern && issue.file) {
        if (!this.matchesFilePattern(issue.file, criteria.filePattern)) {
          return false;
        }
      }

      // Search query (search in issue message and file)
      if (criteria.searchQuery) {
        const query = criteria.searchQuery.toLowerCase();
        const matchesMessage = issue.message?.toLowerCase().includes(query);
        const matchesFile = issue.file?.toLowerCase().includes(query);
        if (!matchesMessage && !matchesFile) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Filter files based on criteria
   */
  private filterFiles(files: any[], criteria: FilterCriteria): any[] {
    return files.filter(file => {
      // File pattern filter
      if (criteria.filePattern) {
        if (!this.matchesFilePattern(file.path, criteria.filePattern)) {
          return false;
        }
      }

      // Search query (search in file path)
      if (criteria.searchQuery) {
        const query = criteria.searchQuery.toLowerCase();
        if (!file.path.toLowerCase().includes(query)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Match file path against pattern (supports wildcards)
   */
  private matchesFilePattern(path: string, pattern: string): boolean {
    // Convert glob-like pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(path);
  }

  /**
   * Recalculate summary based on filtered categories
   */
  private recalculateSummary(categories: any[]): any {
    let totalIssues = 0;
    let criticalIssues = 0;
    let highIssues = 0;
    let mediumIssues = 0;
    let lowIssues = 0;

    categories.forEach(cat => {
      const issues = cat.issues || [];
      totalIssues += issues.length;
      criticalIssues += issues.filter((i: any) => i.severity === 'critical').length;
      highIssues += issues.filter((i: any) => i.severity === 'high').length;
      mediumIssues += issues.filter((i: any) => i.severity === 'medium').length;
      lowIssues += issues.filter((i: any) => i.severity === 'low').length;
    });

    // Recalculate overall score based on remaining issues
    const overallScore = Math.max(0, 100 - (criticalIssues * 5) - (highIssues * 3) - (mediumIssues * 1));

    return {
      overallScore,
      totalIssues,
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues,
      categories
    };
  }

  /**
   * Helper: Generate hash for analysis data
   */
  private hashAnalysis(analysis: AnalysisData): string {
    return JSON.stringify({
      categoryCount: analysis.categories?.length || 0,
      fileCount: analysis.files?.length || 0,
      score: analysis.summary?.overallScore || 0,
      issues: analysis.summary?.totalIssues || 0
    });
  }

  /**
   * Get cached data if valid
   */
  private getCached(key: string, analysis: AnalysisData): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    const isExpired = now - cached.timestamp > this.cacheTimeout;
    const hashMatch = cached.analysisHash === this.hashAnalysis(analysis);

    if (isExpired || !hashMatch) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Set cached data
   */
  private setCached(key: string, data: any, analysis: AnalysisData): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      analysisHash: this.hashAnalysis(analysis)
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

/**
 * Singleton instance
 */
export const analysisDataMapper = new AnalysisDataMapper();
