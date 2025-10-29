/**
 * Test Coverage Analyzer (Streaming Version)
 *
 * Analyzes test coverage using pre-populated metadata registries.
 * No AST traversal needed - all metadata already extracted.
 *
 * Detects:
 * - Production files without corresponding tests
 * - Critical/high-importance files without tests
 * - Test files without corresponding production files (orphans)
 * - Test coverage gaps by category (services, components, utilities, etc.)
 */

import type { UnifiedMetadataRegistry } from '../registries/UnifiedMetadataRegistry';
import { TestCoverageRegistry, type FileMetadata } from '../registries/TestCoverageRegistry';

export interface TestCoverageIssue {
  type: 'missing-test' | 'orphaned-test' | 'critical-untested' | 'category-gap';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  recommendation: string;
  filePath: string;
  metadata?: any;
}

export interface TestCoverageAnalysis {
  categoryId: string;
  categoryName: string;
  score: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  priority: number;
  issues: TestCoverageIssue[];
  metrics: {
    totalFiles: number;
    productionFiles: number;
    testFiles: number;
    testedFiles: number;
    untestedFiles: number;
    orphanedTests: number;
    coveragePercentage: number;
    testToCodeRatio: number;
    byCategoryment: Record<string, {
      total: number;
      tested: number;
      untested: number;
      coverage: number;
    }>;
    byImportance: Record<string, {
      total: number;
      tested: number;
      untested: number;
      coverage: number;
    }>;
  };
  summary: string;
}

/**
 * Test Coverage Analyzer using streaming architecture
 */
export class TestCoverageAnalyzerStreaming {
  private registry: UnifiedMetadataRegistry;

  constructor(registry: UnifiedMetadataRegistry) {
    this.registry = registry;
  }

  /**
   * Run analysis using registry data
   */
  analyze(): TestCoverageAnalysis {
    console.log('[TestCoverageAnalyzer] Starting analysis from registries');
    const startTime = Date.now();

    const issues: TestCoverageIssue[] = [];

    // Get all file metadata
    const allFiles = this.registry.testCoverage.getAllFiles();
    const productionFiles = this.registry.testCoverage.getAllProductionFiles();
    const testFiles = this.registry.testCoverage.getAllTestFiles();

    console.log(`[TestCoverageAnalyzer] Loaded: ${allFiles.length} total files (${productionFiles.length} production, ${testFiles.length} test)`);

    // Find untested files
    const untestedFiles = productionFiles.filter(file => !file.hasCorrespondingTest);
    issues.push(...this.createMissingTestIssues(untestedFiles));

    // Find critical untested files
    const criticalUntested = untestedFiles.filter(file =>
      file.importance === 'critical' || file.importance === 'high'
    );
    if (criticalUntested.length > 0) {
      // These are already in untestedFiles, but mark them specially
      criticalUntested.forEach(file => {
        const existingIssue = issues.find(issue =>
          issue.filePath === file.path && issue.type === 'missing-test'
        );
        if (existingIssue) {
          existingIssue.type = 'critical-untested';
          existingIssue.severity = file.importance === 'critical' ? 'critical' : 'high';
        }
      });
    }

    // Find orphaned test files
    const orphanedTests = this.findOrphanedTests(testFiles, productionFiles);
    issues.push(...this.createOrphanedTestIssues(orphanedTests));

    // Analyze coverage by category
    const byCategory = this.analyzeCoverageByCategory(productionFiles);
    const categoryGaps = this.findCategoryGaps(byCategory);
    issues.push(...this.createCategoryGapIssues(categoryGaps));

    // Analyze coverage by importance
    const byImportance = this.analyzeCoverageByImportance(productionFiles);

    // Calculate metrics
    const testedFiles = productionFiles.filter(file => file.hasCorrespondingTest);
    const coveragePercentage = productionFiles.length > 0
      ? Math.round((testedFiles.length / productionFiles.length) * 100)
      : 100;

    const testToCodeRatio = productionFiles.length > 0
      ? Math.round((testFiles.length / productionFiles.length) * 100)
      : 0;

    const metrics = {
      totalFiles: allFiles.length,
      productionFiles: productionFiles.length,
      testFiles: testFiles.length,
      testedFiles: testedFiles.length,
      untestedFiles: untestedFiles.length,
      orphanedTests: orphanedTests.length,
      coveragePercentage,
      testToCodeRatio,
      byCategoryment: byCategory,
      byImportance
    };

    // Calculate score
    const score = this.calculateScore(metrics);
    const status = this.getStatus(score);

    const duration = Date.now() - startTime;
    console.log(`[TestCoverageAnalyzer] ✓ Analysis complete: ${issues.length} issues found, coverage: ${coveragePercentage}%, score: ${score}/100 in ${duration}ms`);

    return {
      categoryId: 'test-coverage',
      categoryName: 'Test Coverage',
      score,
      status,
      priority: 1,
      issues,
      metrics,
      summary: this.generateSummary(metrics, issues.length)
    };
  }

  /**
   * Find test files without corresponding production files
   */
  private findOrphanedTests(testFiles: FileMetadata[], productionFiles: FileMetadata[]): FileMetadata[] {
    return testFiles.filter(testFile => {
      // Check if this test corresponds to any production file
      const hasCorrespondingProd = productionFiles.some(prodFile =>
        TestCoverageRegistry.isTestForFile(testFile.path, prodFile.path)
      );
      return !hasCorrespondingProd;
    });
  }

  /**
   * Analyze coverage by file category
   */
  private analyzeCoverageByCategory(productionFiles: FileMetadata[]): Record<string, {
    total: number;
    tested: number;
    untested: number;
    coverage: number;
  }> {
    const categories = ['service', 'component', 'api', 'utility', 'page', 'middleware', 'model', 'other'];
    const result: Record<string, any> = {};

    categories.forEach(category => {
      const filesInCategory = productionFiles.filter(file => file.category === category);
      const tested = filesInCategory.filter(file => file.hasCorrespondingTest);

      result[category] = {
        total: filesInCategory.length,
        tested: tested.length,
        untested: filesInCategory.length - tested.length,
        coverage: filesInCategory.length > 0
          ? Math.round((tested.length / filesInCategory.length) * 100)
          : 100
      };
    });

    return result;
  }

  /**
   * Analyze coverage by file importance
   */
  private analyzeCoverageByImportance(productionFiles: FileMetadata[]): Record<string, {
    total: number;
    tested: number;
    untested: number;
    coverage: number;
  }> {
    const importanceLevels = ['critical', 'high', 'medium', 'low'];
    const result: Record<string, any> = {};

    importanceLevels.forEach(importance => {
      const filesInLevel = productionFiles.filter(file => file.importance === importance);
      const tested = filesInLevel.filter(file => file.hasCorrespondingTest);

      result[importance] = {
        total: filesInLevel.length,
        tested: tested.length,
        untested: filesInLevel.length - tested.length,
        coverage: filesInLevel.length > 0
          ? Math.round((tested.length / filesInLevel.length) * 100)
          : 100
      };
    });

    return result;
  }

  /**
   * Find categories with low coverage
   */
  private findCategoryGaps(byCategory: Record<string, { total: number; tested: number; untested: number; coverage: number }>): Array<{
    category: string;
    coverage: number;
    untested: number;
  }> {
    return Object.entries(byCategory)
      .filter(([category, stats]) =>
        stats.total > 0 && stats.coverage < 70 // Less than 70% coverage
      )
      .map(([category, stats]) => ({
        category,
        coverage: stats.coverage,
        untested: stats.untested
      }));
  }

  /**
   * Create issues for files without tests
   */
  private createMissingTestIssues(files: FileMetadata[]): TestCoverageIssue[] {
    return files.map(file => ({
      type: 'missing-test',
      severity: this.getSeverityByImportance(file.importance),
      title: `Missing test: ${this.getFileName(file.path)}`,
      description: `${file.category} file "${this.getFileName(file.path)}" (${file.importance} importance) does not have a corresponding test file.`,
      recommendation: `Create a test file at ${file.correspondingTestPath || 'appropriate test location'}.`,
      filePath: file.path,
      metadata: file
    }));
  }

  /**
   * Create issues for orphaned test files
   */
  private createOrphanedTestIssues(files: FileMetadata[]): TestCoverageIssue[] {
    return files.map(file => ({
      type: 'orphaned-test',
      severity: 'low',
      title: `Orphaned test: ${this.getFileName(file.path)}`,
      description: `Test file "${this.getFileName(file.path)}" does not have a corresponding production file. This test may be outdated or misnamed.`,
      recommendation: 'Verify if the production file was renamed or deleted, and update or remove this test accordingly.',
      filePath: file.path,
      metadata: file
    }));
  }

  /**
   * Create issues for category coverage gaps
   */
  private createCategoryGapIssues(gaps: Array<{ category: string; coverage: number; untested: number }>): TestCoverageIssue[] {
    return gaps.map(gap => ({
      type: 'category-gap',
      severity: gap.coverage < 50 ? 'high' : 'medium',
      title: `Low coverage in ${gap.category} files`,
      description: `Only ${gap.coverage}% of ${gap.category} files have tests (${gap.untested} files untested).`,
      recommendation: `Prioritize testing ${gap.category} files to improve overall coverage.`,
      filePath: '', // Category-level issue, no specific file
      metadata: gap
    }));
  }

  /**
   * Get severity based on file importance
   */
  private getSeverityByImportance(importance: string): 'critical' | 'high' | 'medium' | 'low' {
    switch (importance) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'medium': return 'medium';
      case 'low': return 'low';
      default: return 'medium';
    }
  }

  /**
   * Get filename from path
   */
  private getFileName(path: string): string {
    return path.split('/').pop() || path;
  }

  /**
   * Calculate overall score
   */
  private calculateScore(metrics: TestCoverageAnalysis['metrics']): number {
    // Weight by importance
    const criticalScore = metrics.byImportance.critical.coverage * 0.4; // 40% weight
    const highScore = metrics.byImportance.high.coverage * 0.3; // 30% weight
    const mediumScore = metrics.byImportance.medium.coverage * 0.2; // 20% weight
    const lowScore = metrics.byImportance.low.coverage * 0.1; // 10% weight

    // Orphaned test penalty
    const orphanPenalty = Math.min(metrics.orphanedTests * 2, 10); // Up to -10 points

    const rawScore = criticalScore + highScore + mediumScore + lowScore - orphanPenalty;
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
  private generateSummary(metrics: TestCoverageAnalysis['metrics'], issueCount: number): string {
    const parts: string[] = [];

    parts.push(`Test coverage: ${metrics.coveragePercentage}% (${metrics.testedFiles}/${metrics.productionFiles} files tested).`);

    if (metrics.byImportance.critical.untested > 0) {
      parts.push(`⚠️ ${metrics.byImportance.critical.untested} critical files lack tests.`);
    }

    if (metrics.byImportance.high.untested > 0) {
      parts.push(`${metrics.byImportance.high.untested} high-importance files lack tests.`);
    }

    if (metrics.orphanedTests > 0) {
      parts.push(`${metrics.orphanedTests} orphaned test files found.`);
    }

    if (metrics.coveragePercentage >= 80) {
      return `Good test coverage! ${parts.join(' ')}`;
    }

    return parts.join(' ');
  }
}
