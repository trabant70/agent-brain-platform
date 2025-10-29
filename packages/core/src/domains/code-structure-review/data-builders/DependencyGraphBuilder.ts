/**
 * Dependency Graph Data Builder
 * Extracts import/export relationships from code analysis
 *
 * Input: File paths and import statements
 * Output: Graph structure with nodes (files) and links (dependencies)
 */

import { DependencyGraphData, DependencyNode, DependencyLink } from '../../visualization/webview/visualizations/DependencyGraph';

export interface FileImport {
  filePath: string;
  importedFrom: string;     // Path of file being imported
  importType: 'default' | 'named' | 'namespace';
}

export interface FileInfo {
  filePath: string;
  imports: string[];        // Files this file imports
  exports: string[];        // Symbols this file exports
  issueCount: number;
}

export class DependencyGraphBuilder {
  /**
   * Build dependency graph from file information
   */
  static buildGraph(files: FileInfo[]): DependencyGraphData {
    const nodes: DependencyNode[] = [];
    const links: DependencyLink[] = [];
    const nodeMap = new Map<string, DependencyNode>();

    // Create nodes for each file
    files.forEach(file => {
      const node: DependencyNode = {
        id: file.filePath,
        label: this.getFileName(file.filePath),
        type: this.inferFileType(file.filePath),
        issueCount: file.issueCount,
        inDegree: 0,   // Will calculate below
        outDegree: file.imports.length,
        group: this.getFileGroup(file.filePath)
      };

      nodes.push(node);
      nodeMap.set(file.filePath, node);
    });

    // Create links and calculate in-degrees
    const linkCounts = new Map<string, number>();

    files.forEach(file => {
      file.imports.forEach(importPath => {
        const targetNode = nodeMap.get(importPath);
        if (targetNode) {
          // Increment in-degree for target
          targetNode.inDegree++;

          // Create link (avoiding duplicates)
          const linkKey = `${file.filePath}->${importPath}`;
          const existingCount = linkCounts.get(linkKey) || 0;
          linkCounts.set(linkKey, existingCount + 1);

          if (existingCount === 0) {
            // First time seeing this link
            links.push({
              source: file.filePath,
              target: importPath,
              type: 'import',
              strength: 1
            });
          } else {
            // Update existing link strength
            const link = links.find(l =>
              (typeof l.source === 'string' ? l.source : l.source.id) === file.filePath &&
              (typeof l.target === 'string' ? l.target : l.target.id) === importPath
            );
            if (link) {
              link.strength = existingCount + 1;
            }
          }
        }
      });
    });

    return { nodes, links };
  }

  /**
   * Extract file name from path
   */
  private static getFileName(filePath: string): string {
    const parts = filePath.split('/');
    return parts[parts.length - 1];
  }

  /**
   * Infer file type from path and name
   */
  private static inferFileType(filePath: string): 'component' | 'service' | 'utility' | 'config' | 'test' | 'other' {
    const lowerPath = filePath.toLowerCase();

    // Test files
    if (lowerPath.includes('.test.') || lowerPath.includes('.spec.') || lowerPath.includes('__tests__')) {
      return 'test';
    }

    // Config files
    if (lowerPath.includes('config') || lowerPath.match(/\.(config|rc)\.(ts|js|json)$/)) {
      return 'config';
    }

    // Components (React, Vue, etc.)
    if (lowerPath.includes('component') ||
        lowerPath.includes('/ui/') ||
        lowerPath.includes('/views/') ||
        lowerPath.match(/\.(tsx|vue|svelte)$/)) {
      return 'component';
    }

    // Services
    if (lowerPath.includes('service') ||
        lowerPath.includes('provider') ||
        lowerPath.includes('/api/') ||
        lowerPath.includes('/services/')) {
      return 'service';
    }

    // Utilities
    if (lowerPath.includes('util') ||
        lowerPath.includes('helper') ||
        lowerPath.includes('lib') ||
        lowerPath.includes('/utils/')) {
      return 'utility';
    }

    return 'other';
  }

  /**
   * Get file group for clustering (based on directory)
   */
  private static getFileGroup(filePath: string): number {
    const parts = filePath.split('/');
    if (parts.length < 2) return 0;

    // Group by top-level directory
    const topDir = parts[0];
    return this.hashString(topDir) % 10; // 10 different groups
  }

  /**
   * Simple string hash for consistent grouping
   */
  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Build graph from code structure analysis results
   */
  static buildFromAnalysis(analysis: any): DependencyGraphData {
    const files: FileInfo[] = [];

    // If analysis has file data with imports, use it
    if (analysis.files) {
      analysis.files.forEach((file: any) => {
        files.push({
          filePath: file.path,
          imports: file.imports || [],
          exports: file.exports || [],
          issueCount: file.issueCount || 0
        });
      });
    }

    // If analysis has categories with file paths, extract unique files
    if (analysis.categories && files.length === 0) {
      const fileMap = new Map<string, FileInfo>();

      analysis.categories.forEach((category: any) => {
        if (category.issues) {
          category.issues.forEach((issue: any) => {
            if (!fileMap.has(issue.filePath)) {
              fileMap.set(issue.filePath, {
                filePath: issue.filePath,
                imports: [],
                exports: [],
                issueCount: 0
              });
            }

            const fileInfo = fileMap.get(issue.filePath)!;
            fileInfo.issueCount++;
          });
        }
      });

      files.push(...Array.from(fileMap.values()));
    }

    // If still no files, create sample data
    if (files.length === 0) {
      files.push(
        {
          filePath: 'src/index.ts',
          imports: ['src/app.ts', 'src/config.ts'],
          exports: ['main'],
          issueCount: 0
        },
        {
          filePath: 'src/app.ts',
          imports: ['src/services/api.ts', 'src/utils/logger.ts'],
          exports: ['App'],
          issueCount: 2
        },
        {
          filePath: 'src/services/api.ts',
          imports: ['src/config.ts'],
          exports: ['ApiService'],
          issueCount: 1
        },
        {
          filePath: 'src/utils/logger.ts',
          imports: [],
          exports: ['Logger'],
          issueCount: 0
        },
        {
          filePath: 'src/config.ts',
          imports: [],
          exports: ['config'],
          issueCount: 0
        }
      );
    }

    return this.buildGraph(files);
  }

  /**
   * Filter graph to show only files with issues
   */
  static filterIssuesOnly(graph: DependencyGraphData): DependencyGraphData {
    // Find nodes with issues and their direct dependencies
    const relevantNodeIds = new Set<string>();

    graph.nodes.forEach(node => {
      if (node.issueCount > 0) {
        relevantNodeIds.add(node.id);
      }
    });

    // Add nodes that are connected to nodes with issues
    graph.links.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;

      if (relevantNodeIds.has(sourceId) || relevantNodeIds.has(targetId)) {
        relevantNodeIds.add(sourceId);
        relevantNodeIds.add(targetId);
      }
    });

    return {
      nodes: graph.nodes.filter(n => relevantNodeIds.has(n.id)),
      links: graph.links.filter(l => {
        const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
        const targetId = typeof l.target === 'string' ? l.target : l.target.id;
        return relevantNodeIds.has(sourceId) && relevantNodeIds.has(targetId);
      })
    };
  }

  /**
   * Filter graph by file type
   */
  static filterByType(graph: DependencyGraphData, types: string[]): DependencyGraphData {
    const typeSet = new Set(types);
    const relevantNodeIds = new Set<string>();

    graph.nodes.forEach(node => {
      if (typeSet.has(node.type)) {
        relevantNodeIds.add(node.id);
      }
    });

    return {
      nodes: graph.nodes.filter(n => relevantNodeIds.has(n.id)),
      links: graph.links.filter(l => {
        const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
        const targetId = typeof l.target === 'string' ? l.target : l.target.id;
        return relevantNodeIds.has(sourceId) && relevantNodeIds.has(targetId);
      })
    };
  }

  /**
   * Find circular dependencies
   */
  static findCircularDependencies(graph: DependencyGraphData): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const stack = new Set<string>();

    // Build adjacency list
    const adjList = new Map<string, string[]>();
    graph.nodes.forEach(node => {
      adjList.set(node.id, []);
    });

    graph.links.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      adjList.get(sourceId)?.push(targetId);
    });

    // DFS to find cycles
    function dfs(nodeId: string, path: string[]) {
      visited.add(nodeId);
      stack.add(nodeId);
      path.push(nodeId);

      const neighbors = adjList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path]);
        } else if (stack.has(neighbor)) {
          // Found a cycle
          const cycleStart = path.indexOf(neighbor);
          if (cycleStart !== -1) {
            cycles.push(path.slice(cycleStart));
          }
        }
      }

      stack.delete(nodeId);
    }

    // Run DFS from each unvisited node
    graph.nodes.forEach(node => {
      if (!visited.has(node.id)) {
        dfs(node.id, []);
      }
    });

    return cycles;
  }

  /**
   * Get most connected files (hubs)
   */
  static getMostConnected(graph: DependencyGraphData, count: number = 10): DependencyNode[] {
    return graph.nodes
      .sort((a, b) => {
        const degreeA = a.inDegree + a.outDegree;
        const degreeB = b.inDegree + b.outDegree;
        return degreeB - degreeA;
      })
      .slice(0, count);
  }

  /**
   * Get orphaned files (no dependencies)
   */
  static getOrphanedFiles(graph: DependencyGraphData): DependencyNode[] {
    return graph.nodes.filter(node =>
      node.inDegree === 0 && node.outDegree === 0
    );
  }
}
