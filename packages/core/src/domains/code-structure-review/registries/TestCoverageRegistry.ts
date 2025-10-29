/**
 * Test Coverage Registry
 *
 * Stores lightweight metadata for test coverage analysis:
 * - File classification (production vs test)
 * - Test-to-file mapping
 * - Importance categorization
 *
 * Memory efficient: Pattern-based metadata, no AST needed
 */

export interface FileMetadata {
  path: string;
  isTestFile: boolean;
  isProductionFile: boolean;
  importance: 'critical' | 'high' | 'medium' | 'low';
  category: 'service' | 'component' | 'api' | 'utility' | 'page' | 'middleware' | 'model' | 'other';
  hasCorrespondingTest: boolean;
  correspondingTestPath?: string;
  size: number;                    // File size in bytes
  lines: number;                   // Line count
}

/**
 * Registry for test coverage metadata
 */
export class TestCoverageRegistry {
  private files: Map<string, FileMetadata> = new Map();
  private testFiles: Map<string, FileMetadata> = new Map();
  private productionFiles: Map<string, FileMetadata> = new Map();

  // ==================== File Operations ====================

  /**
   * Add file metadata
   */
  addFile(file: FileMetadata): void {
    this.files.set(file.path, file);

    if (file.isTestFile) {
      this.testFiles.set(file.path, file);
    }

    if (file.isProductionFile) {
      this.productionFiles.set(file.path, file);
    }
  }

  /**
   * Get file metadata
   */
  getFile(path: string): FileMetadata | undefined {
    return this.files.get(path);
  }

  /**
   * Get all files
   */
  getAllFiles(): FileMetadata[] {
    return Array.from(this.files.values());
  }

  /**
   * Get all test files
   */
  getAllTestFiles(): FileMetadata[] {
    return Array.from(this.testFiles.values());
  }

  /**
   * Get all production files
   */
  getAllProductionFiles(): FileMetadata[] {
    return Array.from(this.productionFiles.values());
  }

  /**
   * Update test mapping after analysis
   */
  updateTestMapping(productionPath: string, testPath: string): void {
    const prodFile = this.productionFiles.get(productionPath);
    if (prodFile) {
      prodFile.hasCorrespondingTest = true;
      prodFile.correspondingTestPath = testPath;
    }
  }

  /**
   * Mark production file as tested
   */
  markAsTested(productionPath: string): void {
    const file = this.productionFiles.get(productionPath);
    if (file) {
      file.hasCorrespondingTest = true;
    }
  }

  // ==================== Query Operations ====================

  /**
   * Get production files without tests
   */
  getUntestedFiles(): FileMetadata[] {
    return Array.from(this.productionFiles.values())
      .filter(f => !f.hasCorrespondingTest);
  }

  /**
   * Get critical untested files
   */
  getCriticalUntestedFiles(): FileMetadata[] {
    return this.getUntestedFiles()
      .filter(f => f.importance === 'critical' || f.importance === 'high');
  }

  /**
   * Get files by importance
   */
  getFilesByImportance(importance: FileMetadata['importance']): FileMetadata[] {
    return this.getAllProductionFiles()
      .filter(f => f.importance === importance);
  }

  /**
   * Get files by category
   */
  getFilesByCategory(category: FileMetadata['category']): FileMetadata[] {
    return this.getAllProductionFiles()
      .filter(f => f.category === category);
  }

  /**
   * Get tested files
   */
  getTestedFiles(): FileMetadata[] {
    return Array.from(this.productionFiles.values())
      .filter(f => f.hasCorrespondingTest);
  }

  /**
   * Find corresponding test file for production file
   */
  findCorrespondingTest(productionPath: string): FileMetadata | undefined {
    const prodFile = this.productionFiles.get(productionPath);
    if (prodFile?.correspondingTestPath) {
      return this.testFiles.get(prodFile.correspondingTestPath);
    }
    return undefined;
  }

  /**
   * Check if production file has test
   */
  hasTest(productionPath: string): boolean {
    const file = this.productionFiles.get(productionPath);
    return file ? file.hasCorrespondingTest : false;
  }

  // ==================== Statistics ====================

  /**
   * Get comprehensive statistics
   */
  getStats() {
    const productionFiles = this.getAllProductionFiles();
    const untestedFiles = this.getUntestedFiles();

    return {
      files: {
        total: this.files.size,
        production: productionFiles.length,
        test: this.testFiles.size
      },
      coverage: {
        tested: productionFiles.length - untestedFiles.length,
        untested: untestedFiles.length,
        percentage: productionFiles.length > 0
          ? Math.round(((productionFiles.length - untestedFiles.length) / productionFiles.length) * 100)
          : 100,
        testToCodeRatio: productionFiles.length > 0
          ? Math.round((this.testFiles.size / productionFiles.length) * 100)
          : 0
      },
      byImportance: {
        critical: this.getFilesByImportance('critical').length,
        criticalUntested: this.getUntestedFiles().filter(f => f.importance === 'critical').length,
        high: this.getFilesByImportance('high').length,
        highUntested: this.getUntestedFiles().filter(f => f.importance === 'high').length,
        medium: this.getFilesByImportance('medium').length,
        mediumUntested: this.getUntestedFiles().filter(f => f.importance === 'medium').length,
        low: this.getFilesByImportance('low').length,
        lowUntested: this.getUntestedFiles().filter(f => f.importance === 'low').length
      },
      byCategory: {
        service: this.getFilesByCategory('service').length,
        serviceUntested: this.getUntestedFiles().filter(f => f.category === 'service').length,
        component: this.getFilesByCategory('component').length,
        componentUntested: this.getUntestedFiles().filter(f => f.category === 'component').length,
        api: this.getFilesByCategory('api').length,
        apiUntested: this.getUntestedFiles().filter(f => f.category === 'api').length,
        utility: this.getFilesByCategory('utility').length,
        utilityUntested: this.getUntestedFiles().filter(f => f.category === 'utility').length,
        page: this.getFilesByCategory('page').length,
        pageUntested: this.getUntestedFiles().filter(f => f.category === 'page').length
      }
    };
  }

  /**
   * Get memory usage estimate
   */
  getMemoryUsage(): {
    totalFiles: number;
    productionFiles: number;
    testFiles: number;
    totalKB: number;
  } {
    // Each FileMetadata is roughly ~150 bytes
    const bytesPerFile = 150;
    const totalBytes = this.files.size * bytesPerFile;

    return {
      totalFiles: this.files.size,
      productionFiles: this.productionFiles.size,
      testFiles: this.testFiles.size,
      totalKB: Math.round(totalBytes / 1024)
    };
  }

  /**
   * Clear all registries
   */
  clear(): void {
    this.files.clear();
    this.testFiles.clear();
    this.productionFiles.clear();
  }

  /**
   * Get item counts
   */
  getCounts() {
    return {
      total: this.files.size,
      production: this.productionFiles.size,
      test: this.testFiles.size,
      untested: this.getUntestedFiles().length
    };
  }

  // ==================== File Classification Helpers ====================

  /**
   * Classify file as test or production
   */
  static isTestFile(filePath: string): boolean {
    const path = filePath.toLowerCase();
    return (
      path.includes('.test.') ||
      path.includes('.spec.') ||
      path.includes('__tests__/') ||
      path.includes('__mocks__/') ||
      path.includes('/tests/') ||
      path.includes('/test/')
    );
  }

  /**
   * Determine file importance
   */
  static determineImportance(filePath: string): FileMetadata['importance'] {
    const path = filePath.toLowerCase();

    // Critical: Core business logic, services, utilities
    if (
      path.includes('/services/') ||
      path.includes('/core/') ||
      path.includes('/lib/') ||
      path.match(/\.(service|util|helper|validator|auth|security)\.(ts|js)$/)
    ) {
      return 'critical';
    }

    // High: API handlers, controllers, middleware, components with logic
    if (
      path.includes('/api/') ||
      path.includes('/controllers/') ||
      path.includes('/middleware/') ||
      path.includes('/handlers/') ||
      path.includes('/models/') ||
      path.match(/\.(controller|handler|middleware|model|repository)\.(ts|js)$/)
    ) {
      return 'high';
    }

    // Medium: UI components, pages with business logic
    if (
      path.includes('/components/') ||
      path.includes('/hooks/') ||
      path.match(/\.(component|hook)\.(tsx|jsx|ts|js)$/)
    ) {
      return 'medium';
    }

    // Low: Everything else (config, types, styles)
    return 'low';
  }

  /**
   * Categorize file type
   */
  static categorizeFile(filePath: string): FileMetadata['category'] {
    const path = filePath.toLowerCase();

    if (path.includes('/services/') || path.match(/\.service\.(ts|js)$/)) {
      return 'service';
    }
    if (path.includes('/components/') || path.match(/\.(component|tsx|jsx)$/)) {
      return 'component';
    }
    if (path.includes('/api/') || path.match(/\.(controller|handler)\.(ts|js)$/)) {
      return 'api';
    }
    if (path.includes('/utils/') || path.match(/\.(util|helper)\.(ts|js)$/)) {
      return 'utility';
    }
    if (path.includes('/pages/') || path.includes('/views/')) {
      return 'page';
    }
    if (path.includes('/middleware/') || path.match(/\.middleware\.(ts|js)$/)) {
      return 'middleware';
    }
    if (path.includes('/models/') || path.match(/\.model\.(ts|js)$/)) {
      return 'model';
    }

    return 'other';
  }

  /**
   * Find possible test file paths for production file
   */
  static getPossibleTestPaths(productionPath: string): string[] {
    const paths: string[] = [];

    // Get base path components
    const parts = productionPath.split('/');
    const fileName = parts[parts.length - 1];
    const fileNameWithoutExt = fileName.replace(/\.(ts|tsx|js|jsx)$/, '');
    const ext = fileName.match(/\.(ts|tsx|js|jsx)$/)?.[0] || '.ts';

    // Same directory variations
    paths.push(productionPath.replace(ext, `.test${ext}`));
    paths.push(productionPath.replace(ext, `.spec${ext}`));

    // __tests__ directory variations
    const dirPath = parts.slice(0, -1).join('/');
    paths.push(`${dirPath}/__tests__/${fileName}`);
    paths.push(`${dirPath}/__tests__/${fileNameWithoutExt}.test${ext}`);
    paths.push(`${dirPath}/__tests__/${fileNameWithoutExt}.spec${ext}`);

    // tests directory variations
    paths.push(`${dirPath}/tests/${fileName}`);
    paths.push(`${dirPath}/tests/${fileNameWithoutExt}.test${ext}`);

    return paths;
  }

  /**
   * Check if test file corresponds to production file
   */
  static isTestForFile(testPath: string, productionPath: string): boolean {
    // Remove test extensions and directories
    const normalizedTest = testPath
      .replace('.test.', '.')
      .replace('.spec.', '.')
      .replace('__tests__/', '')
      .replace('tests/', '');

    // Get base names without extensions
    const testBase = this.getBaseName(normalizedTest);
    const prodBase = this.getBaseName(productionPath);

    return testBase === prodBase;
  }

  /**
   * Get base name without extension
   */
  private static getBaseName(filePath: string): string {
    const parts = filePath.split('/');
    const fileName = parts[parts.length - 1];
    return fileName.replace(/\.(ts|tsx|js|jsx)$/, '');
  }
}
