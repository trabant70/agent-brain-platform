/**
 * Module Aggregator
 * Aggregates file-level dependencies to module/directory level for chord diagram
 *
 * Input: File dependencies
 * Output: Module-level dependency matrix
 */

import { ChordData } from '../../visualization/webview/visualizations/ChordDiagram';
import { DependencyGraphData } from '../../visualization/webview/visualizations/DependencyGraph';

export class ModuleAggregator {
  /**
   * Aggregate file dependencies to module level
   */
  static aggregateToModules(dependencies: DependencyGraphData, level: number = 1): ChordData {
    // Extract modules from file paths
    const moduleMap = new Map<string, Set<string>>();

    dependencies.nodes.forEach(node => {
      const module = this.getModuleName(node.id, level);
      if (!moduleMap.has(module)) {
        moduleMap.set(module, new Set());
      }
      moduleMap.get(module)!.add(node.id);
    });

    const modules = Array.from(moduleMap.keys());
    const moduleCount = modules.length;

    // Initialize matrix
    const matrix: number[][] = Array(moduleCount).fill(0).map(() => Array(moduleCount).fill(0));

    // Count dependencies between modules
    dependencies.links.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;

      const sourceModule = this.getModuleName(sourceId, level);
      const targetModule = this.getModuleName(targetId, level);

      // Skip self-dependencies
      if (sourceModule === targetModule) return;

      const sourceIndex = modules.indexOf(sourceModule);
      const targetIndex = modules.indexOf(targetModule);

      if (sourceIndex >= 0 && targetIndex >= 0) {
        matrix[sourceIndex][targetIndex] += link.strength || 1;
      }
    });

    return { modules, matrix };
  }

  /**
   * Extract module name from file path
   */
  private static getModuleName(filePath: string, level: number): string {
    const parts = filePath.split('/').filter(p => p.length > 0);

    if (parts.length === 0) return 'root';
    if (parts.length <= level) return parts.join('/');

    return parts.slice(0, level).join('/');
  }

  /**
   * Build from analysis (alternative approach using categories)
   */
  static buildFromCategories(analysis: any): ChordData {
    // If analysis has categories, create modules from them
    if (analysis?.categories) {
      const modules = analysis.categories.map((cat: any) => cat.name);
      const moduleCount = modules.length;

      // Create a simplified matrix showing issue relationships
      const matrix: number[][] = Array(moduleCount).fill(0).map(() => Array(moduleCount).fill(0));

      // For simplicity, create connections based on shared files
      const fileToCategories = new Map<string, Set<number>>();

      analysis.categories.forEach((category: any, catIndex: number) => {
        if (category.issues) {
          category.issues.forEach((issue: any) => {
            if (!fileToCategories.has(issue.filePath)) {
              fileToCategories.set(issue.filePath, new Set());
            }
            fileToCategories.get(issue.filePath)!.add(catIndex);
          });
        }
      });

      // Create connections between categories that share files
      fileToCategories.forEach(categorySet => {
        const categories = Array.from(categorySet);
        for (let i = 0; i < categories.length; i++) {
          for (let j = i + 1; j < categories.length; j++) {
            matrix[categories[i]][categories[j]]++;
            matrix[categories[j]][categories[i]]++;
          }
        }
      });

      return { modules, matrix };
    }

    // Fallback: create sample data
    return this.buildSampleData();
  }

  /**
   * Build sample data for demonstration
   */
  static buildSampleData(): ChordData {
    const modules = [
      'components',
      'services',
      'utils',
      'api',
      'models',
      'views'
    ];

    const matrix = [
      [0, 15, 8, 5, 12, 20],   // components
      [15, 0, 12, 18, 10, 8],   // services
      [8, 12, 0, 6, 5, 3],      // utils
      [5, 18, 6, 0, 15, 4],     // api
      [12, 10, 5, 15, 0, 8],    // models
      [20, 8, 3, 4, 8, 0]       // views
    ];

    return { modules, matrix };
  }

  /**
   * Filter matrix to only show strong connections
   */
  static filterWeakConnections(data: ChordData, threshold: number): ChordData {
    const filteredMatrix = data.matrix.map(row =>
      row.map(value => value >= threshold ? value : 0)
    );

    return {
      modules: data.modules,
      matrix: filteredMatrix
    };
  }

  /**
   * Get most coupled modules
   */
  static getMostCoupled(data: ChordData, count: number = 5): Array<{
    module: string;
    totalConnections: number;
  }> {
    const connections = data.modules.map((module, index) => {
      const totalConnections = data.matrix[index].reduce((sum, val) => sum + val, 0) +
                               data.matrix.reduce((sum, row) => sum + row[index], 0);

      return { module, totalConnections };
    });

    return connections
      .sort((a, b) => b.totalConnections - a.totalConnections)
      .slice(0, count);
  }

  /**
   * Detect circular dependencies between modules
   */
  static detectCircularDependencies(data: ChordData): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<number>();
    const stack = new Set<number>();

    function dfs(moduleIndex: number, path: number[]) {
      visited.add(moduleIndex);
      stack.add(moduleIndex);
      path.push(moduleIndex);

      // Check all modules this one depends on
      data.matrix[moduleIndex].forEach((value, targetIndex) => {
        if (value > 0) {
          if (!visited.has(targetIndex)) {
            dfs(targetIndex, [...path]);
          } else if (stack.has(targetIndex)) {
            // Found a cycle
            const cycleStart = path.indexOf(targetIndex);
            if (cycleStart !== -1) {
              const cycle = path.slice(cycleStart).map(i => data.modules[i]);
              cycles.push(cycle);
            }
          }
        }
      });

      stack.delete(moduleIndex);
    }

    // Run DFS from each unvisited module
    data.modules.forEach((_, index) => {
      if (!visited.has(index)) {
        dfs(index, []);
      }
    });

    return cycles;
  }

  /**
   * Calculate coupling metrics
   */
  static calculateCouplingMetrics(data: ChordData): {
    averageCoupling: number;
    maxCoupling: number;
    couplingDistribution: Record<string, number>;
  } {
    let totalConnections = 0;
    let maxConnections = 0;

    data.matrix.forEach(row => {
      const rowSum = row.reduce((sum, val) => sum + val, 0);
      totalConnections += rowSum;
      maxConnections = Math.max(maxConnections, rowSum);
    });

    const averageCoupling = totalConnections / (data.modules.length * (data.modules.length - 1));

    // Distribution by strength
    const distribution: Record<string, number> = {
      weak: 0,      // 1-5
      moderate: 0,  // 6-10
      strong: 0,    // 11-20
      veryStrong: 0 // 21+
    };

    data.matrix.forEach(row => {
      row.forEach(value => {
        if (value === 0) return;
        if (value <= 5) distribution.weak++;
        else if (value <= 10) distribution.moderate++;
        else if (value <= 20) distribution.strong++;
        else distribution.veryStrong++;
      });
    });

    return {
      averageCoupling,
      maxCoupling: maxConnections,
      couplingDistribution: distribution
    };
  }
}
