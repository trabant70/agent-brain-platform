/**
 * Test Coverage Data Builder
 * Transforms test coverage information into network graph data
 *
 * Input: Test coverage reports (Istanbul, Jest, etc.)
 * Output: Bipartite graph of tests and source files
 */

import { TestCoverageData, TestNode, TestLink } from '../../visualization/webview/visualizations/TestCoverageNetworkGraph';

export interface CoverageReport {
  file: string;
  lines: {
    total: number;
    covered: number;
    pct: number;
  };
  functions: {
    total: number;
    covered: number;
    pct: number;
  };
  statements: {
    total: number;
    covered: number;
    pct: number;
  };
  branches: {
    total: number;
    covered: number;
    pct: number;
  };
}

export interface TestFileMapping {
  testFile: string;
  sourceFile: string;
  coveragePercent: number;
  linesCovered: number;
}

export class TestCoverageDataBuilder {
  /**
   * Build test coverage network from coverage data
   */
  static buildFromCoverage(
    coverageReports: CoverageReport[],
    testMappings: TestFileMapping[]
  ): TestCoverageData {
    const nodeMap = new Map<string, TestNode>();
    const links: TestLink[] = [];

    // Create source nodes from coverage reports
    coverageReports.forEach(report => {
      const fileName = this.getFileName(report.file);
      nodeMap.set(report.file, {
        id: report.file,
        name: fileName,
        type: 'source',
        filePath: report.file,
        coverage: report.lines.pct,
        linesCovered: report.lines.covered,
        totalLines: report.lines.total
      });
    });

    // Create test nodes and links from mappings
    testMappings.forEach(mapping => {
      // Add test node if not exists
      if (!nodeMap.has(mapping.testFile)) {
        const fileName = this.getFileName(mapping.testFile);
        nodeMap.set(mapping.testFile, {
          id: mapping.testFile,
          name: fileName,
          type: 'test',
          filePath: mapping.testFile,
          testCount: 1
        });
      } else {
        // Increment test count
        const testNode = nodeMap.get(mapping.testFile)!;
        testNode.testCount = (testNode.testCount || 0) + 1;
      }

      // Create link
      links.push({
        source: mapping.testFile,
        target: mapping.sourceFile,
        coveragePercent: mapping.coveragePercent,
        linesCovered: mapping.linesCovered
      });
    });

    // Calculate overall coverage
    const totalLines = coverageReports.reduce((sum, r) => sum + r.lines.total, 0);
    const coveredLines = coverageReports.reduce((sum, r) => sum + r.lines.covered, 0);
    const overallCoverage = totalLines > 0 ? (coveredLines / totalLines) * 100 : 0;

    return {
      nodes: Array.from(nodeMap.values()),
      links,
      overallCoverage
    };
  }

  /**
   * Build from analysis results (simpler format)
   */
  static buildFromAnalysis(analysis: any): TestCoverageData {
    const nodeMap = new Map<string, TestNode>();
    const links: TestLink[] = [];

    // Look for coverage data in analysis
    const coverageData = analysis?.metrics?.testCoverage || analysis?.testCoverage;
    if (!coverageData) {
      return this.buildSampleData();
    }

    // Process files with coverage
    if (coverageData.files) {
      coverageData.files.forEach((file: any) => {
        nodeMap.set(file.path, {
          id: file.path,
          name: this.getFileName(file.path),
          type: 'source',
          filePath: file.path,
          coverage: file.coverage,
          linesCovered: file.linesCovered,
          totalLines: file.totalLines
        });
      });
    }

    // Process test files
    if (coverageData.tests) {
      coverageData.tests.forEach((test: any) => {
        nodeMap.set(test.path, {
          id: test.path,
          name: this.getFileName(test.path),
          type: 'test',
          filePath: test.path,
          testCount: test.testCount || 1
        });

        // Create links to covered files
        if (test.covers) {
          test.covers.forEach((covered: any) => {
            links.push({
              source: test.path,
              target: covered.file,
              coveragePercent: covered.coverage,
              linesCovered: covered.linesCovered
            });
          });
        }
      });
    }

    return {
      nodes: Array.from(nodeMap.values()),
      links,
      overallCoverage: coverageData.overall || 0
    };
  }

  /**
   * Build sample data for demonstration
   */
  static buildSampleData(): TestCoverageData {
    const sourceFiles: TestNode[] = [
      {
        id: 'src/services/UserService.ts',
        name: 'UserService.ts',
        type: 'source',
        filePath: 'src/services/UserService.ts',
        coverage: 95.5,
        linesCovered: 210,
        totalLines: 220
      },
      {
        id: 'src/services/AuthService.ts',
        name: 'AuthService.ts',
        type: 'source',
        filePath: 'src/services/AuthService.ts',
        coverage: 88.2,
        linesCovered: 150,
        totalLines: 170
      },
      {
        id: 'src/utils/validation.ts',
        name: 'validation.ts',
        type: 'source',
        filePath: 'src/utils/validation.ts',
        coverage: 75.0,
        linesCovered: 90,
        totalLines: 120
      },
      {
        id: 'src/utils/formatters.ts',
        name: 'formatters.ts',
        type: 'source',
        filePath: 'src/utils/formatters.ts',
        coverage: 45.5,
        linesCovered: 50,
        totalLines: 110
      },
      {
        id: 'src/components/UserProfile.tsx',
        name: 'UserProfile.tsx',
        type: 'source',
        filePath: 'src/components/UserProfile.tsx',
        coverage: 62.3,
        linesCovered: 95,
        totalLines: 152
      },
      {
        id: 'src/api/endpoints.ts',
        name: 'endpoints.ts',
        type: 'source',
        filePath: 'src/api/endpoints.ts',
        coverage: 30.0,
        linesCovered: 45,
        totalLines: 150
      }
    ];

    const testFiles: TestNode[] = [
      {
        id: 'tests/services/UserService.test.ts',
        name: 'UserService.test.ts',
        type: 'test',
        filePath: 'tests/services/UserService.test.ts',
        testCount: 15
      },
      {
        id: 'tests/services/AuthService.test.ts',
        name: 'AuthService.test.ts',
        type: 'test',
        filePath: 'tests/services/AuthService.test.ts',
        testCount: 12
      },
      {
        id: 'tests/utils/validation.test.ts',
        name: 'validation.test.ts',
        type: 'test',
        filePath: 'tests/utils/validation.test.ts',
        testCount: 8
      },
      {
        id: 'tests/components/UserProfile.test.tsx',
        name: 'UserProfile.test.tsx',
        type: 'test',
        filePath: 'tests/components/UserProfile.test.tsx',
        testCount: 10
      },
      {
        id: 'tests/integration/auth-flow.test.ts',
        name: 'auth-flow.test.ts',
        type: 'test',
        filePath: 'tests/integration/auth-flow.test.ts',
        testCount: 6
      }
    ];

    const links: TestLink[] = [
      // UserService tests
      {
        source: 'tests/services/UserService.test.ts',
        target: 'src/services/UserService.ts',
        coveragePercent: 95.5,
        linesCovered: 210
      },
      {
        source: 'tests/services/UserService.test.ts',
        target: 'src/utils/validation.ts',
        coveragePercent: 45.0,
        linesCovered: 54
      },
      {
        source: 'tests/services/UserService.test.ts',
        target: 'src/utils/formatters.ts',
        coveragePercent: 30.0,
        linesCovered: 33
      },
      // AuthService tests
      {
        source: 'tests/services/AuthService.test.ts',
        target: 'src/services/AuthService.ts',
        coveragePercent: 88.2,
        linesCovered: 150
      },
      {
        source: 'tests/services/AuthService.test.ts',
        target: 'src/utils/validation.ts',
        coveragePercent: 30.0,
        linesCovered: 36
      },
      // Validation tests
      {
        source: 'tests/utils/validation.test.ts',
        target: 'src/utils/validation.ts',
        coveragePercent: 75.0,
        linesCovered: 90
      },
      // UserProfile component tests
      {
        source: 'tests/components/UserProfile.test.tsx',
        target: 'src/components/UserProfile.tsx',
        coveragePercent: 62.3,
        linesCovered: 95
      },
      {
        source: 'tests/components/UserProfile.test.tsx',
        target: 'src/utils/formatters.ts',
        coveragePercent: 15.5,
        linesCovered: 17
      },
      // Integration tests
      {
        source: 'tests/integration/auth-flow.test.ts',
        target: 'src/services/AuthService.ts',
        coveragePercent: 65.0,
        linesCovered: 110
      },
      {
        source: 'tests/integration/auth-flow.test.ts',
        target: 'src/api/endpoints.ts',
        coveragePercent: 30.0,
        linesCovered: 45
      },
      {
        source: 'tests/integration/auth-flow.test.ts',
        target: 'src/services/UserService.ts',
        coveragePercent: 40.0,
        linesCovered: 88
      }
    ];

    return {
      nodes: [...testFiles, ...sourceFiles],
      links,
      overallCoverage: 66.1
    };
  }

  /**
   * Get uncovered source files
   */
  static getUncoveredFiles(data: TestCoverageData, threshold: number = 50): TestNode[] {
    return data.nodes.filter(node =>
      node.type === 'source' &&
      node.coverage !== undefined &&
      node.coverage < threshold
    );
  }

  /**
   * Get orphaned source files (no tests covering them)
   */
  static getOrphanedFiles(data: TestCoverageData): TestNode[] {
    const coveredFiles = new Set(data.links.map(link =>
      typeof link.target === 'string' ? link.target : (link.target as any).id
    ));

    return data.nodes.filter(node =>
      node.type === 'source' && !coveredFiles.has(node.id)
    );
  }

  /**
   * Get test files with low coverage impact
   */
  static getLowImpactTests(data: TestCoverageData, threshold: number = 30): TestNode[] {
    const testCoverageMap = new Map<string, number>();

    // Calculate average coverage per test
    data.links.forEach(link => {
      const testId = typeof link.source === 'string' ? link.source : (link.source as any).id;
      const current = testCoverageMap.get(testId) || 0;
      testCoverageMap.set(testId, current + link.coveragePercent);
    });

    return data.nodes.filter(node => {
      if (node.type !== 'test') return false;
      const testLinks = data.links.filter(link =>
        (typeof link.source === 'string' ? link.source : (link.source as any).id) === node.id
      );
      if (testLinks.length === 0) return false;
      const avgCoverage = (testCoverageMap.get(node.id) || 0) / testLinks.length;
      return avgCoverage < threshold;
    });
  }

  /**
   * Calculate coverage statistics
   */
  static calculateStats(data: TestCoverageData): {
    totalTests: number;
    totalSourceFiles: number;
    uncoveredFiles: number;
    orphanedFiles: number;
    avgCoverage: number;
    highCoverageFiles: number;
  } {
    const sourceFiles = data.nodes.filter(n => n.type === 'source');
    const testFiles = data.nodes.filter(n => n.type === 'test');

    const uncovered = this.getUncoveredFiles(data, 50).length;
    const orphaned = this.getOrphanedFiles(data).length;
    const highCoverage = sourceFiles.filter(n => (n.coverage || 0) >= 80).length;

    const avgCoverage = sourceFiles.reduce((sum, n) => sum + (n.coverage || 0), 0) / (sourceFiles.length || 1);

    return {
      totalTests: testFiles.length,
      totalSourceFiles: sourceFiles.length,
      uncoveredFiles: uncovered,
      orphanedFiles: orphaned,
      avgCoverage,
      highCoverageFiles: highCoverage
    };
  }

  /**
   * Extract file name from path
   */
  private static getFileName(filePath: string): string {
    const parts = filePath.split('/');
    return parts[parts.length - 1] || filePath;
  }
}
