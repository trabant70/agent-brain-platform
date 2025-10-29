/**
 * Unified Metadata Registry
 *
 * Orchestrates all 4 sub-registries:
 * - FeatureCompletenessRegistry
 * - UIUXQualityRegistry
 * - TestCoverageRegistry
 * - InternationalizationRegistry
 *
 * Provides unified interface for all analyzers and global statistics.
 */

import { FeatureCompletenessRegistry } from './FeatureCompletenessRegistry';
import { UIUXQualityRegistry } from './UIUXQualityRegistry';
import { TestCoverageRegistry } from './TestCoverageRegistry';
import { InternationalizationRegistry } from './InternationalizationRegistry';

/**
 * Main registry that combines all metadata registries
 */
export class UnifiedMetadataRegistry {
  // Sub-registries
  public readonly featureCompleteness: FeatureCompletenessRegistry;
  public readonly uiuxQuality: UIUXQualityRegistry;
  public readonly testCoverage: TestCoverageRegistry;
  public readonly i18n: InternationalizationRegistry;

  constructor() {
    this.featureCompleteness = new FeatureCompletenessRegistry();
    this.uiuxQuality = new UIUXQualityRegistry();
    this.testCoverage = new TestCoverageRegistry();
    this.i18n = new InternationalizationRegistry();
  }

  // ==================== Global Operations ====================

  /**
   * Get comprehensive statistics across all registries
   */
  getGlobalStats() {
    return {
      featureCompleteness: this.featureCompleteness.getStats(),
      uiuxQuality: this.uiuxQuality.getStats(),
      testCoverage: this.testCoverage.getStats(),
      i18n: this.i18n.getStats(),
      globalSummary: {
        totalEndpoints: this.featureCompleteness.getCounts().endpoints,
        totalComponents: this.featureCompleteness.getCounts().components,
        totalAsyncOps: this.uiuxQuality.getCounts().asyncOperations,
        totalForms: this.uiuxQuality.getCounts().forms,
        totalA11yIssues: this.uiuxQuality.getCounts().a11yIssues,
        totalFiles: this.testCoverage.getCounts().total,
        untestedFiles: this.testCoverage.getCounts().untested,
        untranslatedStrings: this.i18n.getCounts().untranslated
      }
    };
  }

  /**
   * Get memory usage across all registries
   */
  getGlobalMemoryUsage() {
    const fc = this.featureCompleteness.getMemoryUsage();
    const uiux = this.uiuxQuality.getMemoryUsage();
    const test = this.testCoverage.getMemoryUsage();
    const i18n = this.i18n.getMemoryUsage();

    const totalKB = fc.totalKB + uiux.totalKB + test.totalKB + i18n.totalKB;

    return {
      byRegistry: {
        featureCompleteness: fc,
        uiuxQuality: uiux,
        testCoverage: test,
        i18n: i18n
      },
      totals: {
        totalKB,
        totalMB: Math.round((totalKB / 1024) * 10) / 10,
        estimatedVsAST: {
          registryKB: totalKB,
          estimatedASTMB: Math.round((this.testCoverage.getCounts().total * 5 * 1024) / 1024), // 5MB per file
          savingsPercent: this.calculateMemorySavingsPercent(totalKB)
        }
      }
    };
  }

  /**
   * Calculate memory savings vs AST approach
   */
  private calculateMemorySavingsPercent(registryKB: number): number {
    const fileCount = this.testCoverage.getCounts().total;
    if (fileCount === 0) return 0;

    // Estimate: 5MB AST per file, 50KB source per file
    const estimatedASTKB = fileCount * 5 * 1024;
    const estimatedSourceKB = fileCount * 50;
    const estimatedTotalKB = estimatedASTKB + estimatedSourceKB;

    if (estimatedTotalKB === 0) return 0;

    const savings = ((estimatedTotalKB - registryKB) / estimatedTotalKB) * 100;
    return Math.round(savings * 10) / 10;
  }

  /**
   * Get item counts across all registries
   */
  getGlobalCounts() {
    return {
      featureCompleteness: this.featureCompleteness.getCounts(),
      uiuxQuality: this.uiuxQuality.getCounts(),
      testCoverage: this.testCoverage.getCounts(),
      i18n: this.i18n.getCounts(),
      grandTotal: this.calculateGrandTotal()
    };
  }

  /**
   * Calculate grand total of all items
   */
  private calculateGrandTotal(): number {
    const fc = this.featureCompleteness.getCounts();
    const uiux = this.uiuxQuality.getCounts();
    const test = this.testCoverage.getCounts();
    const i18n = this.i18n.getCounts();

    return (
      fc.endpoints +
      fc.apiCalls +
      fc.components +
      fc.mocks +
      uiux.asyncOperations +
      uiux.forms +
      uiux.listRenderings +
      uiux.userActions +
      uiux.a11yIssues +
      test.total +
      i18n.stringLiterals +
      i18n.dateTimeOps +
      i18n.numberFormats +
      i18n.rtlIssues
    );
  }

  /**
   * Clear all registries
   */
  clearAll(): void {
    this.featureCompleteness.clear();
    this.uiuxQuality.clear();
    this.testCoverage.clear();
    this.i18n.clear();
  }

  // ==================== Cross-Registry Queries ====================

  /**
   * Get all issues for a specific file across all registries
   */
  getIssuesByFile(filePath: string): {
    featureCompleteness: {
      endpoints: any[];
      apiCalls: any[];
      mocks: any[];
    };
    uiuxQuality: {
      asyncOps: any[];
      forms: any[];
      listRenderings: any[];
      userActions: any[];
      a11yIssues: any[];
    };
    testCoverage: {
      file: any | undefined;
    };
    i18n: {
      strings: any[];
      dateTimeOps: any[];
      numberFormats: any[];
      rtlIssues: any[];
    };
  } {
    return {
      featureCompleteness: {
        endpoints: this.featureCompleteness.getEndpointsByFile(filePath),
        apiCalls: this.featureCompleteness.getAPICallsByFile(filePath),
        mocks: this.featureCompleteness.getMocksByFile(filePath)
      },
      uiuxQuality: {
        asyncOps: this.uiuxQuality.getAsyncOperationsByFile(filePath),
        forms: this.uiuxQuality.getFormsByFile(filePath),
        listRenderings: [],
        userActions: [],
        a11yIssues: []
      },
      testCoverage: {
        file: this.testCoverage.getFile(filePath)
      },
      i18n: {
        strings: this.i18n.getStringsByFile(filePath),
        dateTimeOps: this.i18n.getDateTimeOpsByFile(filePath),
        numberFormats: this.i18n.getNumberFormatsByFile(filePath),
        rtlIssues: this.i18n.getRTLIssuesByFile(filePath)
      }
    };
  }

  /**
   * Get components with their related metadata
   */
  getComponentsWithMetadata(): Array<{
    component: any;
    asyncOps: any[];
    apiCalls: any[];
    forms: any[];
    hasTest: boolean;
  }> {
    const components = this.featureCompleteness.getAllComponents();

    return components.map(component => {
      const asyncOps = this.uiuxQuality.getAsyncOperationsByComponent(component.name);
      const apiCalls = this.featureCompleteness.getAPICallsByFile(component.filePath);
      const forms = this.uiuxQuality.getFormsByFile(component.filePath);
      const hasTest = this.testCoverage.hasTest(component.filePath);

      return {
        component,
        asyncOps,
        apiCalls,
        forms,
        hasTest
      };
    });
  }

  /**
   * Get async operations with error/loading state analysis
   */
  getAsyncOperationsAnalysis() {
    const asyncOps = this.uiuxQuality.getAllAsyncOperations();

    return {
      total: asyncOps.length,
      inComponents: asyncOps.filter(op => op.inComponent).length,
      withoutErrorHandling: this.uiuxQuality.getAsyncOpsWithoutErrorHandling().length,
      withoutLoadingState: this.uiuxQuality.getAsyncOpsWithoutLoadingState().length,
      withoutErrorVariable: this.uiuxQuality.getAsyncOpsWithoutErrorVariable().length,
      complete: asyncOps.filter(
        op => op.hasErrorHandler && op.hasLoadingState
      ).length
    };
  }

  /**
   * Get files requiring attention (multiple issues)
   */
  getFilesRequiringAttention(): Array<{
    filePath: string;
    issueCount: number;
    hasNoTest: boolean;
    importance: string;
    issueTypes: string[];
  }> {
    const allFiles = new Set<string>();

    // Collect all files with issues
    this.featureCompleteness.getAllEndpoints().forEach(e => allFiles.add(e.filePath));
    this.featureCompleteness.getAllAPICalls().forEach(c => allFiles.add(c.filePath));
    this.uiuxQuality.getAllAsyncOperations().forEach(op => allFiles.add(op.filePath));
    this.i18n.getUntranslatedStrings().forEach(s => allFiles.add(s.filePath));

    const result: Array<{
      filePath: string;
      issueCount: number;
      hasNoTest: boolean;
      importance: string;
      issueTypes: string[];
    }> = [];

    allFiles.forEach(filePath => {
      const issues = this.getIssuesByFile(filePath);
      const issueTypes: string[] = [];
      let issueCount = 0;

      if (issues.featureCompleteness.endpoints.length > 0) {
        issueTypes.push('endpoints');
        issueCount += issues.featureCompleteness.endpoints.length;
      }
      if (issues.featureCompleteness.apiCalls.length > 0) {
        issueTypes.push('api-calls');
        issueCount += issues.featureCompleteness.apiCalls.length;
      }
      if (issues.uiuxQuality.asyncOps.length > 0) {
        issueTypes.push('async-ops');
        issueCount += issues.uiuxQuality.asyncOps.length;
      }
      if (issues.i18n.strings.length > 0) {
        issueTypes.push('i18n');
        issueCount += issues.i18n.strings.length;
      }

      const fileMetadata = this.testCoverage.getFile(filePath);
      const hasNoTest = fileMetadata ? !fileMetadata.hasCorrespondingTest : false;

      if (issueCount > 0 || hasNoTest) {
        result.push({
          filePath,
          issueCount,
          hasNoTest,
          importance: fileMetadata?.importance || 'unknown',
          issueTypes
        });
      }
    });

    // Sort by issue count descending
    return result.sort((a, b) => b.issueCount - a.issueCount);
  }

  // ==================== Diagnostic Methods ====================

  /**
   * Generate diagnostic report
   */
  generateDiagnosticReport(): string {
    const stats = this.getGlobalStats();
    const memory = this.getGlobalMemoryUsage();
    const counts = this.getGlobalCounts();

    const report = `
=== Unified Metadata Registry Diagnostic Report ===

Memory Usage:
  Total: ${memory.totals.totalMB} MB
  Feature Completeness: ${memory.byRegistry.featureCompleteness.totalKB} KB
  UI/UX Quality: ${memory.byRegistry.uiuxQuality.totalKB} KB
  Test Coverage: ${memory.byRegistry.testCoverage.totalKB} KB
  I18n: ${memory.byRegistry.i18n.totalKB} KB

  Memory Savings vs AST: ${memory.totals.estimatedVsAST.savingsPercent}%
  (${memory.totals.estimatedVsAST.registryKB} KB vs ${memory.totals.estimatedVsAST.estimatedASTMB} MB)

Item Counts:
  Endpoints: ${counts.featureCompleteness.endpoints}
  API Calls: ${counts.featureCompleteness.apiCalls}
  Components: ${counts.featureCompleteness.components}
  Async Operations: ${counts.uiuxQuality.asyncOperations}
  Forms: ${counts.uiuxQuality.forms}
  A11y Issues: ${counts.uiuxQuality.a11yIssues}
  Total Files: ${counts.testCoverage.total}
  Untested Files: ${counts.testCoverage.untested}
  Untranslated Strings: ${counts.i18n.untranslated}

  Grand Total Items: ${counts.grandTotal}

Feature Completeness:
  Connected Endpoints: ${stats.featureCompleteness.endpoints.total}
  API Calls: ${stats.featureCompleteness.apiCalls.total}
  Disconnected Calls: ${stats.featureCompleteness.apiCalls.withoutErrorHandling}

UI/UX Quality:
  Async Ops without Error Handling: ${stats.uiuxQuality.asyncOperations.withoutErrorHandling}
  Async Ops without Loading State: ${stats.uiuxQuality.asyncOperations.withoutLoadingState}
  Forms without Validation: ${stats.uiuxQuality.forms.withoutValidation}

Test Coverage:
  Coverage: ${stats.testCoverage.coverage.percentage}%
  Test to Code Ratio: ${stats.testCoverage.coverage.testToCodeRatio}%

I18n:
  Translation Coverage: ${stats.i18n.stringLiterals.translationCoverage}%
  Overall I18n Readiness: ${stats.i18n.overallI18nReadiness}%

=== End of Report ===
    `.trim();

    return report;
  }

  /**
   * Log diagnostic information to console
   */
  logDiagnostics(): void {
    console.log('[UnifiedMetadataRegistry] Diagnostic Report:');
    console.log(this.generateDiagnosticReport());
  }

  /**
   * Validate registry integrity
   */
  validateIntegrity(): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for orphaned test files
    const testFiles = this.testCoverage.getAllTestFiles();
    const prodFiles = this.testCoverage.getAllProductionFiles();

    testFiles.forEach(testFile => {
      // Find if this test file corresponds to any production file
      const hasCorrespondingProd = prodFiles.some(prodFile =>
        TestCoverageRegistry.isTestForFile(testFile.path, prodFile.path)
      );

      if (!hasCorrespondingProd) {
        warnings.push(`Orphaned test file: ${testFile.path}`);
      }
    });

    // Check for components without files
    const components = this.featureCompleteness.getAllComponents();
    components.forEach(component => {
      const file = this.testCoverage.getFile(component.filePath);
      if (!file) {
        warnings.push(`Component ${component.name} references non-existent file: ${component.filePath}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
