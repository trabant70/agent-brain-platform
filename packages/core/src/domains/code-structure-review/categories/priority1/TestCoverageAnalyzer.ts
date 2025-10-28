/**
 * Test Coverage Analyzer
 *
 * Detects:
 * - Files without test files
 * - Critical code paths without tests
 * - Low test coverage areas
 * - Missing edge case tests
 */

import type {
  CategoryAnalysis,
  AnalysisContext,
  Issue,
  CategoryConfig,
  TestCoverageResult,
  UntestedCode
} from '../../types';
import { AnalysisCategory } from '../base/AnalysisCategory';
import { CATEGORY_IDS, CATEGORY_METADATA, CategoryPriority } from '../base/CategoryTypes';
import { AnalysisContextUtils } from '../../analysis/AnalysisContext';

/**
 * Analyzes test coverage across codebase
 */
export class TestCoverageAnalyzer extends AnalysisCategory {
  constructor(config?: Partial<CategoryConfig>) {
    const metadata = CATEGORY_METADATA[CATEGORY_IDS.TEST_COVERAGE];

    super({
      id: metadata.id,
      name: metadata.name,
      icon: metadata.icon,
      description: metadata.description,
      priority: CategoryPriority.CRITICAL,
      enabled: true,
      thresholds: {
        excellent: 90,
        good: 75,
        warning: 50,
        critical: 0
      },
      ...config
    });
  }

  /**
   * Run test coverage analysis
   */
  async analyze(context: AnalysisContext): Promise<CategoryAnalysis> {
    const issues: Issue[] = [];
    const metrics: Record<string, number> = {};

    const contextUtils = new AnalysisContextUtils(context);
    const codeFiles = contextUtils.getCodeFiles();

    // Separate test files from production files
    const { productionFiles, testFiles } = this.separateTestFiles(codeFiles);

    // Find files without tests
    const untestedFiles = this.findUntestedFiles(productionFiles, testFiles);

    // Categorize untested files by importance
    const criticalUntested = this.categorizeCriticalFiles(untestedFiles);

    // Create issues for untested critical files
    criticalUntested.forEach(file => {
      const importance = this.determineFileImportance(file.path);

      issues.push(
        this.createIssue({
          id: `test-coverage-untested-${file.path.replace(/[^a-zA-Z0-9]/g, '-')}`,
          severity: importance === 'critical' ? 'critical' : 'high',
          title: `No tests for ${this.getFileName(file.path)}`,
          description: `This ${this.getFileCategory(file.path)} file has no test coverage. ${this.getImportanceReason(file.path)}`,
          filePath: file.path,
          detectorId: 'test-coverage-detector',
          fixSuggestion: `Create test file: ${this.suggestTestFileName(file.path)}`,
          aiPromptHint: `Help me write tests for ${file.path}. Focus on critical paths and edge cases.`
        })
      );
    });

    // Calculate metrics
    metrics.totalProductionFiles = productionFiles.length;
    metrics.totalTestFiles = testFiles.length;
    metrics.untestedFiles = untestedFiles.length;
    metrics.testCoverage =
      productionFiles.length > 0
        ? Math.round(
            ((productionFiles.length - untestedFiles.length) / productionFiles.length) *
              100
          )
        : 100;

    metrics.criticalUntestedFiles = criticalUntested.length;
    metrics.testToCodeRatio =
      productionFiles.length > 0
        ? Math.round((testFiles.length / productionFiles.length) * 100)
        : 0;

    // Create analysis result
    return this.createAnalysisResult(issues, metrics);
  }

  /**
   * Separate test files from production files
   */
  private separateTestFiles(
    files: ReturnType<AnalysisContextUtils['getCodeFiles']>
  ): {
    productionFiles: typeof files;
    testFiles: typeof files;
  } {
    const testFiles: typeof files = [];
    const productionFiles: typeof files = [];

    files.forEach(file => {
      if (this.isTestFile(file.path)) {
        testFiles.push(file);
      } else {
        productionFiles.push(file);
      }
    });

    return { productionFiles, testFiles };
  }

  /**
   * Check if file is a test file
   */
  private isTestFile(filePath: string): boolean {
    return (
      filePath.includes('.test.') ||
      filePath.includes('.spec.') ||
      filePath.includes('__tests__/') ||
      filePath.includes('__mocks__/')
    );
  }

  /**
   * Find production files without corresponding test files
   */
  private findUntestedFiles(
    productionFiles: any[],
    testFiles: any[]
  ): any[] {
    const untestedFiles: any[] = [];

    productionFiles.forEach(prodFile => {
      const hasTest = testFiles.some(testFile =>
        this.isTestForFile(testFile.path, prodFile.path)
      );

      if (!hasTest) {
        untestedFiles.push(prodFile);
      }
    });

    return untestedFiles;
  }

  /**
   * Check if test file is for production file
   */
  private isTestForFile(testPath: string, prodPath: string): boolean {
    // Remove test extensions
    const testBase = testPath
      .replace('.test.', '.')
      .replace('.spec.', '.')
      .replace('__tests__/', '');

    // Get base name without extension
    const prodBase = this.getBaseName(prodPath);
    const testBaseName = this.getBaseName(testBase);

    return testBaseName === prodBase;
  }

  /**
   * Get base name without extension
   */
  private getBaseName(filePath: string): string {
    const parts = filePath.split('/');
    const fileName = parts[parts.length - 1];
    return fileName.replace(/\.(ts|tsx|js|jsx)$/, '');
  }

  /**
   * Categorize critical files that need tests
   */
  private categorizeCriticalFiles(untestedFiles: any[]): any[] {
    return untestedFiles.filter(file => {
      const importance = this.determineFileImportance(file.path);
      return importance === 'critical' || importance === 'high';
    });
  }

  /**
   * Determine importance of file
   */
  private determineFileImportance(
    filePath: string
  ): 'critical' | 'high' | 'medium' | 'low' {
    const path = filePath.toLowerCase();

    // Critical: Services, utilities, business logic
    if (
      path.includes('/services/') ||
      path.includes('/utils/') ||
      path.includes('/lib/') ||
      path.includes('/core/') ||
      path.match(/\.(service|util|helper|validator)\.(ts|js)$/)
    ) {
      return 'critical';
    }

    // High: Components with business logic, API handlers
    if (
      path.includes('/components/') ||
      path.includes('/api/') ||
      path.includes('/controllers/') ||
      path.match(/\.(controller|handler|middleware)\.(ts|js)$/)
    ) {
      return 'high';
    }

    // Medium: UI components, pages
    if (
      path.includes('/pages/') ||
      path.includes('/views/') ||
      path.match(/\.(component|page)\.(tsx|jsx)$/)
    ) {
      return 'medium';
    }

    // Low: Everything else
    return 'low';
  }

  /**
   * Get file category description
   */
  private getFileCategory(filePath: string): string {
    const path = filePath.toLowerCase();

    if (path.includes('/services/') || path.match(/\.service\.(ts|js)$/)) {
      return 'service';
    }
    if (path.includes('/utils/') || path.match(/\.(util|helper)\.(ts|js)$/)) {
      return 'utility';
    }
    if (path.includes('/components/')) {
      return 'component';
    }
    if (path.includes('/api/') || path.match(/\.(controller|handler)\.(ts|js)$/)) {
      return 'API handler';
    }
    if (path.includes('/pages/') || path.includes('/views/')) {
      return 'page';
    }

    return 'code';
  }

  /**
   * Get importance reason
   */
  private getImportanceReason(filePath: string): string {
    const importance = this.determineFileImportance(filePath);

    const reasons: Record<string, string> = {
      critical:
        'This is critical business logic that requires thorough testing to prevent bugs.',
      high: 'This code handles important functionality and should have test coverage.',
      medium: 'Testing would improve confidence in this functionality.',
      low: 'Consider adding tests when time permits.'
    };

    return reasons[importance];
  }

  /**
   * Get file name from path
   */
  private getFileName(filePath: string): string {
    const parts = filePath.split('/');
    return parts[parts.length - 1];
  }

  /**
   * Suggest test file name
   */
  private suggestTestFileName(filePath: string): string {
    const parts = filePath.split('/');
    const fileName = parts[parts.length - 1];

    // Replace extension with .test.extension
    const testFileName = fileName.replace(/\.(ts|tsx|js|jsx)$/, '.test.$1');

    // Keep in same directory or suggest __tests__ folder
    parts[parts.length - 1] = testFileName;
    return parts.join('/');
  }

  /**
   * Custom scoring based on test coverage
   */
  calculateScore(issues: Issue[]): number {
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const highIssues = issues.filter(i => i.severity === 'high');

    // Start at 100
    let score = 100;

    // Critical untested files (services, utils) heavily penalized
    score -= criticalIssues.length * 15;

    // High priority untested files (components, API handlers)
    score -= highIssues.length * 8;

    return Math.max(0, Math.round(score));
  }
}
