/**
 * Parallel Coordinates Data Builder
 * Transforms analysis metrics into multi-dimensional parallel coordinates format
 *
 * Input: Analysis results with multiple metrics
 * Output: Multi-dimensional data points with parallel axes
 */

import { ParallelCoordinatesData, ParallelDimension, ParallelDataPoint } from '../../visualization/webview/visualizations/ParallelCoordinates';

export class ParallelCoordinatesDataBuilder {
  /**
   * Build from analysis results with file metrics
   */
  static buildFromAnalysis(analysis: any): ParallelCoordinatesData {
    const files = analysis?.files || analysis?.metrics?.files || [];
    if (files.length === 0) {
      return this.buildSampleData();
    }

    // Define dimensions based on available metrics
    const dimensions: ParallelDimension[] = [
      { key: 'complexity', label: 'Complexity', type: 'numeric', domain: [0, 100] },
      { key: 'coverage', label: 'Test Coverage %', type: 'numeric', domain: [0, 100] },
      { key: 'issues', label: 'Issue Count', type: 'numeric', domain: [0, 50] },
      { key: 'dependencies', label: 'Dependencies', type: 'numeric', domain: [0, 30] },
      { key: 'lines', label: 'Lines of Code', type: 'numeric', domain: [0, 1000] }
    ];

    // Transform files into data points
    const data: ParallelDataPoint[] = files.map((file: any) => ({
      id: file.path || file.id,
      name: this.getFileName(file.path || file.id),
      category: this.inferCategory(file.path || file.id),
      values: {
        complexity: file.complexity || file.metrics?.complexity || 0,
        coverage: file.coverage || file.metrics?.coverage || 0,
        issues: file.issues?.length || file.issueCount || 0,
        dependencies: file.dependencies?.length || file.dependencyCount || 0,
        lines: file.lines || file.loc || file.lineCount || 0
      }
    }));

    return { dimensions, data };
  }

  /**
   * Build from category scores
   */
  static buildFromCategoryScores(categories: any[]): ParallelCoordinatesData {
    if (!categories || categories.length === 0) {
      return this.buildSampleData();
    }

    // Define dimensions based on common category metrics
    const dimensions: ParallelDimension[] = [
      { key: 'score', label: 'Score', type: 'numeric', domain: [0, 100] },
      { key: 'critical', label: 'Critical Issues', type: 'numeric', domain: [0, 20] },
      { key: 'high', label: 'High Issues', type: 'numeric', domain: [0, 30] },
      { key: 'medium', label: 'Medium Issues', type: 'numeric', domain: [0, 40] },
      { key: 'coverage', label: 'Coverage %', type: 'numeric', domain: [0, 100] }
    ];

    // Transform categories into data points
    const data: ParallelDataPoint[] = categories.map((cat: any) => {
      const issues = cat.issues || [];
      const critical = issues.filter((i: any) => i.severity === 'critical').length;
      const high = issues.filter((i: any) => i.severity === 'high').length;
      const medium = issues.filter((i: any) => i.severity === 'medium').length;

      return {
        id: cat.categoryId || cat.id,
        name: cat.categoryName || cat.name,
        category: cat.status || 'default',
        values: {
          score: cat.score || 0,
          critical,
          high,
          medium,
          coverage: cat.metrics?.coverage || 0
        }
      };
    });

    return { dimensions, data };
  }

  /**
   * Build sample data for demonstration
   */
  static buildSampleData(): ParallelCoordinatesData {
    const dimensions: ParallelDimension[] = [
      { key: 'complexity', label: 'Complexity', type: 'numeric', domain: [0, 100] },
      { key: 'coverage', label: 'Test Coverage %', type: 'numeric', domain: [0, 100] },
      { key: 'issues', label: 'Issue Count', type: 'numeric', domain: [0, 50] },
      { key: 'dependencies', label: 'Dependencies', type: 'numeric', domain: [0, 30] },
      { key: 'maintainability', label: 'Maintainability', type: 'numeric', domain: [0, 100] },
      { key: 'lines', label: 'Lines of Code', type: 'numeric', domain: [0, 1000] }
    ];

    const data: ParallelDataPoint[] = [
      {
        id: 'src/services/UserService.ts',
        name: 'UserService.ts',
        category: 'service',
        values: {
          complexity: 75,
          coverage: 92,
          issues: 3,
          dependencies: 12,
          maintainability: 85,
          lines: 450
        }
      },
      {
        id: 'src/services/AuthService.ts',
        name: 'AuthService.ts',
        category: 'service',
        values: {
          complexity: 68,
          coverage: 88,
          issues: 5,
          dependencies: 15,
          maintainability: 78,
          lines: 520
        }
      },
      {
        id: 'src/components/UserProfile.tsx',
        name: 'UserProfile.tsx',
        category: 'component',
        values: {
          complexity: 45,
          coverage: 75,
          issues: 8,
          dependencies: 8,
          maintainability: 70,
          lines: 320
        }
      },
      {
        id: 'src/components/Dashboard.tsx',
        name: 'Dashboard.tsx',
        category: 'component',
        values: {
          complexity: 82,
          coverage: 65,
          issues: 12,
          dependencies: 18,
          maintainability: 62,
          lines: 680
        }
      },
      {
        id: 'src/components/ProductList.tsx',
        name: 'ProductList.tsx',
        category: 'component',
        values: {
          complexity: 55,
          coverage: 80,
          issues: 6,
          dependencies: 10,
          maintainability: 75,
          lines: 380
        }
      },
      {
        id: 'src/utils/validation.ts',
        name: 'validation.ts',
        category: 'utility',
        values: {
          complexity: 35,
          coverage: 95,
          issues: 2,
          dependencies: 5,
          maintainability: 90,
          lines: 280
        }
      },
      {
        id: 'src/utils/formatters.ts',
        name: 'formatters.ts',
        category: 'utility',
        values: {
          complexity: 25,
          coverage: 98,
          issues: 1,
          dependencies: 3,
          maintainability: 95,
          lines: 180
        }
      },
      {
        id: 'src/utils/api-helpers.ts',
        name: 'api-helpers.ts',
        category: 'utility',
        values: {
          complexity: 40,
          coverage: 85,
          issues: 4,
          dependencies: 7,
          maintainability: 82,
          lines: 250
        }
      },
      {
        id: 'src/models/User.ts',
        name: 'User.ts',
        category: 'model',
        values: {
          complexity: 20,
          coverage: 90,
          issues: 2,
          dependencies: 2,
          maintainability: 92,
          lines: 150
        }
      },
      {
        id: 'src/models/Product.ts',
        name: 'Product.ts',
        category: 'model',
        values: {
          complexity: 28,
          coverage: 88,
          issues: 3,
          dependencies: 4,
          maintainability: 88,
          lines: 200
        }
      },
      {
        id: 'src/api/endpoints.ts',
        name: 'endpoints.ts',
        category: 'api',
        values: {
          complexity: 50,
          coverage: 70,
          issues: 9,
          dependencies: 20,
          maintainability: 68,
          lines: 420
        }
      },
      {
        id: 'src/api/client.ts',
        name: 'client.ts',
        category: 'api',
        values: {
          complexity: 62,
          coverage: 82,
          issues: 7,
          dependencies: 16,
          maintainability: 73,
          lines: 480
        }
      }
    ];

    return { dimensions, data };
  }

  /**
   * Get files with extreme values
   */
  static getOutliers(data: ParallelCoordinatesData, dimension: string, threshold: number = 2): ParallelDataPoint[] {
    const values = data.data.map(p => p.values[dimension] as number).filter(v => typeof v === 'number');
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    );

    return data.data.filter(point => {
      const value = point.values[dimension] as number;
      return typeof value === 'number' && Math.abs(value - mean) > threshold * stdDev;
    });
  }

  /**
   * Get top N performers for a dimension
   */
  static getTopPerformers(data: ParallelCoordinatesData, dimension: string, n: number = 5): ParallelDataPoint[] {
    return [...data.data]
      .filter(p => typeof p.values[dimension] === 'number')
      .sort((a, b) => (b.values[dimension] as number) - (a.values[dimension] as number))
      .slice(0, n);
  }

  /**
   * Get bottom N performers for a dimension
   */
  static getBottomPerformers(data: ParallelCoordinatesData, dimension: string, n: number = 5): ParallelDataPoint[] {
    return [...data.data]
      .filter(p => typeof p.values[dimension] === 'number')
      .sort((a, b) => (a.values[dimension] as number) - (b.values[dimension] as number))
      .slice(0, n);
  }

  /**
   * Calculate correlation between two dimensions
   */
  static calculateCorrelation(data: ParallelCoordinatesData, dim1: string, dim2: string): number {
    const points = data.data.filter(p =>
      typeof p.values[dim1] === 'number' && typeof p.values[dim2] === 'number'
    );

    if (points.length < 2) return 0;

    const x = points.map(p => p.values[dim1] as number);
    const y = points.map(p => p.values[dim2] as number);

    const meanX = x.reduce((sum, v) => sum + v, 0) / x.length;
    const meanY = y.reduce((sum, v) => sum + v, 0) / y.length;

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < x.length; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      numerator += dx * dy;
      denomX += dx * dx;
      denomY += dy * dy;
    }

    const denominator = Math.sqrt(denomX * denomY);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Infer category from file path
   */
  private static inferCategory(filePath: string): string {
    const lower = filePath.toLowerCase();

    if (lower.includes('component') || lower.endsWith('.tsx')) return 'component';
    if (lower.includes('service')) return 'service';
    if (lower.includes('util') || lower.includes('helper')) return 'utility';
    if (lower.includes('model') || lower.includes('type')) return 'model';
    if (lower.includes('api') || lower.includes('endpoint')) return 'api';

    return 'other';
  }

  /**
   * Get file name from path
   */
  private static getFileName(filePath: string): string {
    const parts = filePath.split('/');
    return parts[parts.length - 1] || filePath;
  }

  /**
   * Normalize dimension values to 0-1 range
   */
  static normalize(data: ParallelCoordinatesData): ParallelCoordinatesData {
    const normalized = { ...data };

    data.dimensions.forEach(dim => {
      if (dim.type === 'numeric') {
        const values = data.data.map(p => p.values[dim.key] as number).filter(v => typeof v === 'number');
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min;

        if (range > 0) {
          normalized.data = normalized.data.map(point => ({
            ...point,
            values: {
              ...point.values,
              [dim.key]: ((point.values[dim.key] as number) - min) / range
            }
          }));
        }
      }
    });

    return normalized;
  }
}
