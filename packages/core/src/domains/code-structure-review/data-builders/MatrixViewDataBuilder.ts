/**
 * Matrix View Data Builder
 * Transforms dependency data into adjacency matrix format
 *
 * Input: Dependency graph data
 * Output: Matrix cells with source/target indices
 */

import { MatrixViewData, MatrixNode, MatrixCell } from '../../visualization/webview/visualizations/MatrixView';
import { DependencyGraphData } from '../../visualization/webview/visualizations/DependencyGraph';

export class MatrixViewDataBuilder {
  /**
   * Build matrix from dependency graph data
   */
  static buildFromDependencyGraph(graphData: DependencyGraphData): MatrixViewData {
    // Create nodes with indices
    const nodes: MatrixNode[] = graphData.nodes.map((node, index) => ({
      id: node.id,
      name: node.label || node.id,
      group: this.inferGroup(node.id),
      index
    }));

    // Create node ID to index map
    const nodeIndexMap = new Map<string, number>();
    nodes.forEach(node => {
      nodeIndexMap.set(node.id, node.index);
    });

    // Create cells from links
    const cells: MatrixCell[] = [];
    graphData.links.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : (link.source as any).id;
      const targetId = typeof link.target === 'string' ? link.target : (link.target as any).id;

      const sourceIndex = nodeIndexMap.get(sourceId);
      const targetIndex = nodeIndexMap.get(targetId);

      if (sourceIndex !== undefined && targetIndex !== undefined) {
        cells.push({
          source: sourceIndex,
          target: targetIndex,
          value: link.strength || 1,
          type: link.type || 'dependency'
        });
      }
    });

    return { nodes, cells };
  }

  /**
   * Build from analysis results
   */
  static buildFromAnalysis(analysis: any): MatrixViewData {
    const dependencies = analysis?.dependencies || analysis?.metrics?.dependencies;
    if (!dependencies) {
      return this.buildSampleData();
    }

    // If it's already in dependency graph format
    if (dependencies.nodes && dependencies.links) {
      return this.buildFromDependencyGraph(dependencies);
    }

    // Otherwise build from file list
    const nodeMap = new Map<string, number>();
    const nodes: MatrixNode[] = [];
    const cells: MatrixCell[] = [];

    // First pass: create nodes
    if (Array.isArray(dependencies)) {
      dependencies.forEach((dep: any, index: number) => {
        const nodeId = dep.file || dep.path || dep.id;
        nodeMap.set(nodeId, index);

        nodes.push({
          id: nodeId,
          name: this.getFileName(nodeId),
          group: this.inferGroup(nodeId),
          index
        });
      });

      // Second pass: create cells
      dependencies.forEach((dep: any) => {
        const sourceId = dep.file || dep.path || dep.id;
        const sourceIndex = nodeMap.get(sourceId);

        if (sourceIndex !== undefined && dep.dependencies) {
          dep.dependencies.forEach((targetId: string) => {
            const targetIndex = nodeMap.get(targetId);
            if (targetIndex !== undefined) {
              cells.push({
                source: sourceIndex,
                target: targetIndex,
                value: 1,
                type: 'import'
              });
            }
          });
        }
      });
    }

    return { nodes, cells };
  }

  /**
   * Build sample data for demonstration
   */
  static buildSampleData(): MatrixViewData {
    const fileNames = [
      'App.tsx',
      'Header.tsx',
      'Footer.tsx',
      'UserProfile.tsx',
      'ProductList.tsx',
      'ApiService.ts',
      'AuthService.ts',
      'validation.ts',
      'formatters.ts',
      'User.ts',
      'Product.ts',
      'constants.ts'
    ];

    const nodes: MatrixNode[] = fileNames.map((name, index) => {
      const group = name.endsWith('.tsx') ? 'components' :
                    name.includes('Service') ? 'services' :
                    name.endsWith('.ts') && !name.includes('Service') ? 'utils' :
                    'models';

      return {
        id: `src/${group}/${name}`,
        name,
        group,
        index
      };
    });

    const cells: MatrixCell[] = [
      // App dependencies
      { source: 0, target: 1, value: 2, type: 'import' },
      { source: 0, target: 2, value: 1, type: 'import' },
      { source: 0, target: 3, value: 1, type: 'import' },
      { source: 0, target: 4, value: 1, type: 'import' },
      { source: 0, target: 11, value: 1, type: 'import' },

      // Header dependencies
      { source: 1, target: 6, value: 2, type: 'import' },
      { source: 1, target: 8, value: 1, type: 'import' },

      // Footer dependencies
      { source: 2, target: 11, value: 1, type: 'import' },

      // UserProfile dependencies
      { source: 3, target: 6, value: 3, type: 'import' },
      { source: 3, target: 8, value: 1, type: 'import' },
      { source: 3, target: 9, value: 2, type: 'import' },

      // ProductList dependencies
      { source: 4, target: 5, value: 2, type: 'import' },
      { source: 4, target: 8, value: 1, type: 'import' },
      { source: 4, target: 10, value: 2, type: 'import' },

      // ApiService dependencies
      { source: 5, target: 7, value: 2, type: 'import' },
      { source: 5, target: 11, value: 1, type: 'import' },

      // AuthService dependencies
      { source: 6, target: 5, value: 2, type: 'import' },
      { source: 6, target: 7, value: 1, type: 'import' },
      { source: 6, target: 9, value: 2, type: 'import' },

      // Validation dependencies
      { source: 7, target: 9, value: 1, type: 'import' },
      { source: 7, target: 10, value: 1, type: 'import' },

      // Formatters dependencies
      { source: 8, target: 11, value: 1, type: 'import' },

      // User model dependencies
      { source: 9, target: 11, value: 1, type: 'import' },

      // Product model dependencies
      { source: 10, target: 11, value: 1, type: 'import' }
    ];

    return { nodes, cells };
  }

  /**
   * Get strongly connected components
   */
  static detectCycles(data: MatrixViewData): string[][] {
    const adjList = new Map<number, number[]>();
    const visited = new Set<number>();
    const recStack = new Set<number>();
    const cycles: string[][] = [];

    // Build adjacency list
    data.nodes.forEach(node => {
      adjList.set(node.index, []);
    });

    data.cells.forEach(cell => {
      adjList.get(cell.source)?.push(cell.target);
    });

    // DFS to find cycles
    const dfs = (nodeIndex: number, path: number[]): void => {
      visited.add(nodeIndex);
      recStack.add(nodeIndex);
      path.push(nodeIndex);

      const neighbors = adjList.get(nodeIndex) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path]);
        } else if (recStack.has(neighbor)) {
          // Found a cycle
          const cycleStart = path.indexOf(neighbor);
          const cycle = path.slice(cycleStart);
          const cycleNames = cycle.map(i => data.nodes[i].name);
          cycles.push(cycleNames);
        }
      }

      recStack.delete(nodeIndex);
    };

    data.nodes.forEach(node => {
      if (!visited.has(node.index)) {
        dfs(node.index, []);
      }
    });

    return cycles;
  }

  /**
   * Get dependency density by group
   */
  static getGroupDensity(data: MatrixViewData): Map<string, number> {
    const groupNodes = new Map<string, number>();
    const groupLinks = new Map<string, number>();

    // Count nodes per group
    data.nodes.forEach(node => {
      groupNodes.set(node.group, (groupNodes.get(node.group) || 0) + 1);
    });

    // Count links per group
    data.cells.forEach(cell => {
      const sourceGroup = data.nodes[cell.source].group;
      const targetGroup = data.nodes[cell.target].group;

      // Only count intra-group links
      if (sourceGroup === targetGroup) {
        groupLinks.set(sourceGroup, (groupLinks.get(sourceGroup) || 0) + 1);
      }
    });

    // Calculate density: actual_links / possible_links
    const density = new Map<string, number>();
    groupNodes.forEach((count, group) => {
      const possibleLinks = count * (count - 1); // Directed graph
      const actualLinks = groupLinks.get(group) || 0;
      density.set(group, possibleLinks > 0 ? actualLinks / possibleLinks : 0);
    });

    return density;
  }

  /**
   * Get inter-group dependencies
   */
  static getInterGroupDependencies(data: MatrixViewData): Map<string, Map<string, number>> {
    const interGroup = new Map<string, Map<string, number>>();

    data.cells.forEach(cell => {
      const sourceGroup = data.nodes[cell.source].group;
      const targetGroup = data.nodes[cell.target].group;

      if (sourceGroup !== targetGroup) {
        if (!interGroup.has(sourceGroup)) {
          interGroup.set(sourceGroup, new Map());
        }
        const targetMap = interGroup.get(sourceGroup)!;
        targetMap.set(targetGroup, (targetMap.get(targetGroup) || 0) + cell.value);
      }
    });

    return interGroup;
  }

  /**
   * Infer group/module from file path
   */
  private static inferGroup(filePath: string): string {
    const parts = filePath.split('/');

    // Look for common directory names
    for (const part of parts) {
      const lower = part.toLowerCase();
      if (lower === 'components' || lower === 'component') return 'components';
      if (lower === 'services' || lower === 'service') return 'services';
      if (lower === 'utils' || lower === 'util' || lower === 'helpers') return 'utils';
      if (lower === 'models' || lower === 'model' || lower === 'types') return 'models';
      if (lower === 'controllers' || lower === 'controller') return 'controllers';
      if (lower === 'views' || lower === 'view') return 'views';
      if (lower === 'api' || lower === 'apis') return 'api';
    }

    // Fallback: use first directory after src
    const srcIndex = parts.findIndex(p => p.toLowerCase() === 'src');
    if (srcIndex >= 0 && srcIndex < parts.length - 1) {
      return parts[srcIndex + 1];
    }

    return 'other';
  }

  /**
   * Get file name from path
   */
  private static getFileName(filePath: string): string {
    const parts = filePath.split('/');
    return parts[parts.length - 1] || filePath;
  }
}
