/**
 * Arc Diagram Data Builder
 * Transforms dependency data into arc diagram format with ordered nodes
 *
 * Input: Dependency graph data
 * Output: Ordered nodes with arc connections
 */

import { ArcDiagramData, ArcNode, ArcLink } from '../../visualization/webview/visualizations/ArcDiagram';
import { DependencyGraphData } from '../../visualization/webview/visualizations/DependencyGraph';

export class ArcDiagramDataBuilder {
  /**
   * Build arc diagram from dependency graph data
   */
  static buildFromDependencyGraph(graphData: DependencyGraphData): ArcDiagramData {
    const nodes: ArcNode[] = [];
    const links: ArcLink[] = [];

    // Count connections for each node
    const connectionCounts = new Map<string, { incoming: number; outgoing: number }>();

    graphData.links.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : (link.source as any).id;
      const targetId = typeof link.target === 'string' ? link.target : (link.target as any).id;

      if (!connectionCounts.has(sourceId)) {
        connectionCounts.set(sourceId, { incoming: 0, outgoing: 0 });
      }
      if (!connectionCounts.has(targetId)) {
        connectionCounts.set(targetId, { incoming: 0, outgoing: 0 });
      }

      connectionCounts.get(sourceId)!.outgoing++;
      connectionCounts.get(targetId)!.incoming++;
    });

    // Create nodes with connection counts
    graphData.nodes.forEach((node, index) => {
      const counts = connectionCounts.get(node.id) || { incoming: 0, outgoing: 0 };

      nodes.push({
        id: node.id,
        name: node.label || node.id,
        type: this.inferNodeType(node.id),
        order: index,
        connections: counts.incoming + counts.outgoing,
        incoming: counts.incoming,
        outgoing: counts.outgoing
      });
    });

    // Create links
    graphData.links.forEach(link => {
      links.push({
        source: typeof link.source === 'string' ? link.source : (link.source as any).id,
        target: typeof link.target === 'string' ? link.target : (link.target as any).id,
        strength: link.strength || 1,
        type: link.type || 'import'
      });
    });

    return { nodes, links };
  }

  /**
   * Build from analysis results
   */
  static buildFromAnalysis(analysis: any): ArcDiagramData {
    const dependencies = analysis?.dependencies || analysis?.metrics?.dependencies;
    if (!dependencies) {
      return this.buildSampleData();
    }

    // If it's already in dependency graph format
    if (dependencies.nodes && dependencies.links) {
      return this.buildFromDependencyGraph(dependencies);
    }

    // Otherwise build from file list
    const nodes: ArcNode[] = [];
    const links: ArcLink[] = [];
    const nodeMap = new Map<string, number>();

    if (Array.isArray(dependencies)) {
      dependencies.forEach((dep: any, index: number) => {
        const nodeId = dep.file || dep.path || dep.id;
        nodeMap.set(nodeId, index);

        nodes.push({
          id: nodeId,
          name: this.getFileName(nodeId),
          type: this.inferNodeType(nodeId),
          order: index,
          connections: (dep.dependencies?.length || 0) + (dep.dependents?.length || 0),
          incoming: dep.dependents?.length || 0,
          outgoing: dep.dependencies?.length || 0
        });

        // Add links
        if (dep.dependencies) {
          dep.dependencies.forEach((targetId: string) => {
            links.push({
              source: nodeId,
              target: targetId,
              strength: 1,
              type: 'import'
            });
          });
        }
      });
    }

    return { nodes, links };
  }

  /**
   * Build sample data for demonstration
   */
  static buildSampleData(): ArcDiagramData {
    const nodes: ArcNode[] = [
      { id: 'src/index.ts', name: 'index.ts', type: 'controller', order: 0, connections: 5, incoming: 0, outgoing: 5 },
      { id: 'src/App.tsx', name: 'App.tsx', type: 'component', order: 1, connections: 8, incoming: 1, outgoing: 7 },
      { id: 'src/services/ApiService.ts', name: 'ApiService.ts', type: 'service', order: 2, connections: 6, incoming: 3, outgoing: 3 },
      { id: 'src/services/AuthService.ts', name: 'AuthService.ts', type: 'service', order: 3, connections: 5, incoming: 2, outgoing: 3 },
      { id: 'src/utils/validation.ts', name: 'validation.ts', type: 'util', order: 4, connections: 7, incoming: 5, outgoing: 2 },
      { id: 'src/utils/formatters.ts', name: 'formatters.ts', type: 'util', order: 5, connections: 4, incoming: 3, outgoing: 1 },
      { id: 'src/models/User.ts', name: 'User.ts', type: 'model', order: 6, connections: 6, incoming: 4, outgoing: 2 },
      { id: 'src/models/Product.ts', name: 'Product.ts', type: 'model', order: 7, connections: 3, incoming: 2, outgoing: 1 },
      { id: 'src/components/UserProfile.tsx', name: 'UserProfile.tsx', type: 'component', order: 8, connections: 5, incoming: 1, outgoing: 4 },
      { id: 'src/components/ProductList.tsx', name: 'ProductList.tsx', type: 'component', order: 9, connections: 4, incoming: 1, outgoing: 3 },
      { id: 'src/components/Header.tsx', name: 'Header.tsx', type: 'component', order: 10, connections: 3, incoming: 1, outgoing: 2 },
      { id: 'src/hooks/useAuth.ts', name: 'useAuth.ts', type: 'util', order: 11, connections: 4, incoming: 2, outgoing: 2 },
      { id: 'src/hooks/useApi.ts', name: 'useApi.ts', type: 'util', order: 12, connections: 3, incoming: 2, outgoing: 1 },
      { id: 'src/config/constants.ts', name: 'constants.ts', type: 'util', order: 13, connections: 5, incoming: 5, outgoing: 0 },
      { id: 'src/api/endpoints.ts', name: 'endpoints.ts', type: 'api', order: 14, connections: 4, incoming: 3, outgoing: 1 }
    ];

    const links: ArcLink[] = [
      // index.ts dependencies
      { source: 'src/index.ts', target: 'src/App.tsx', strength: 1, type: 'import' },
      { source: 'src/index.ts', target: 'src/services/ApiService.ts', strength: 1, type: 'import' },
      { source: 'src/index.ts', target: 'src/services/AuthService.ts', strength: 1, type: 'import' },
      { source: 'src/index.ts', target: 'src/config/constants.ts', strength: 1, type: 'import' },

      // App.tsx dependencies
      { source: 'src/App.tsx', target: 'src/components/Header.tsx', strength: 2, type: 'import' },
      { source: 'src/App.tsx', target: 'src/components/UserProfile.tsx', strength: 1, type: 'import' },
      { source: 'src/App.tsx', target: 'src/components/ProductList.tsx', strength: 1, type: 'import' },
      { source: 'src/App.tsx', target: 'src/hooks/useAuth.ts', strength: 3, type: 'import' },
      { source: 'src/App.tsx', target: 'src/config/constants.ts', strength: 1, type: 'import' },

      // ApiService dependencies
      { source: 'src/services/ApiService.ts', target: 'src/utils/validation.ts', strength: 2, type: 'import' },
      { source: 'src/services/ApiService.ts', target: 'src/api/endpoints.ts', strength: 3, type: 'import' },
      { source: 'src/services/ApiService.ts', target: 'src/config/constants.ts', strength: 1, type: 'import' },

      // AuthService dependencies
      { source: 'src/services/AuthService.ts', target: 'src/services/ApiService.ts', strength: 2, type: 'import' },
      { source: 'src/services/AuthService.ts', target: 'src/models/User.ts', strength: 2, type: 'import' },
      { source: 'src/services/AuthService.ts', target: 'src/utils/validation.ts', strength: 1, type: 'import' },

      // Validation dependencies
      { source: 'src/utils/validation.ts', target: 'src/models/User.ts', strength: 1, type: 'import' },
      { source: 'src/utils/validation.ts', target: 'src/models/Product.ts', strength: 1, type: 'import' },

      // Formatters dependencies
      { source: 'src/utils/formatters.ts', target: 'src/config/constants.ts', strength: 1, type: 'import' },

      // Model dependencies
      { source: 'src/models/User.ts', target: 'src/config/constants.ts', strength: 1, type: 'import' },
      { source: 'src/models/Product.ts', target: 'src/config/constants.ts', strength: 1, type: 'import' },

      // Component dependencies
      { source: 'src/components/UserProfile.tsx', target: 'src/models/User.ts', strength: 2, type: 'import' },
      { source: 'src/components/UserProfile.tsx', target: 'src/utils/formatters.ts', strength: 1, type: 'import' },
      { source: 'src/components/UserProfile.tsx', target: 'src/hooks/useAuth.ts', strength: 2, type: 'import' },

      { source: 'src/components/ProductList.tsx', target: 'src/models/Product.ts', strength: 2, type: 'import' },
      { source: 'src/components/ProductList.tsx', target: 'src/utils/formatters.ts', strength: 1, type: 'import' },
      { source: 'src/components/ProductList.tsx', target: 'src/hooks/useApi.ts', strength: 2, type: 'import' },

      { source: 'src/components/Header.tsx', target: 'src/hooks/useAuth.ts', strength: 1, type: 'import' },
      { source: 'src/components/Header.tsx', target: 'src/utils/formatters.ts', strength: 1, type: 'import' },

      // Hook dependencies
      { source: 'src/hooks/useAuth.ts', target: 'src/services/AuthService.ts', strength: 3, type: 'import' },
      { source: 'src/hooks/useAuth.ts', target: 'src/models/User.ts', strength: 1, type: 'import' },

      { source: 'src/hooks/useApi.ts', target: 'src/services/ApiService.ts', strength: 3, type: 'import' },
      { source: 'src/hooks/useApi.ts', target: 'src/utils/validation.ts', strength: 1, type: 'import' },

      // API dependencies
      { source: 'src/api/endpoints.ts', target: 'src/utils/validation.ts', strength: 2, type: 'import' }
    ];

    return { nodes, links };
  }

  /**
   * Order nodes by dependency depth (topological sort)
   */
  static orderByDependencyDepth(data: ArcDiagramData): ArcDiagramData {
    const nodeMap = new Map(data.nodes.map(n => [n.id, n]));
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();

    // Initialize
    data.nodes.forEach(node => {
      inDegree.set(node.id, 0);
      adjList.set(node.id, []);
    });

    // Build adjacency list and in-degree
    data.links.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : (link.source as any).id;
      const targetId = typeof link.target === 'string' ? link.target : (link.target as any).id;

      adjList.get(sourceId)?.push(targetId);
      inDegree.set(targetId, (inDegree.get(targetId) || 0) + 1);
    });

    // Topological sort (Kahn's algorithm)
    const queue: string[] = [];
    const ordered: ArcNode[] = [];

    // Start with nodes that have no incoming edges
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) {
        queue.push(nodeId);
      }
    });

    let order = 0;
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const node = nodeMap.get(nodeId);

      if (node) {
        ordered.push({ ...node, order: order++ });
      }

      // Reduce in-degree for neighbors
      adjList.get(nodeId)?.forEach(neighborId => {
        const newDegree = (inDegree.get(neighborId) || 1) - 1;
        inDegree.set(neighborId, newDegree);
        if (newDegree === 0) {
          queue.push(neighborId);
        }
      });
    }

    // If there are remaining nodes (cycles), append them
    nodeMap.forEach((node, id) => {
      if (!ordered.find(n => n.id === id)) {
        ordered.push({ ...node, order: order++ });
      }
    });

    return {
      nodes: ordered,
      links: data.links
    };
  }

  /**
   * Order nodes by package/directory structure
   */
  static orderByPackage(data: ArcDiagramData): ArcDiagramData {
    const ordered = [...data.nodes].sort((a, b) => {
      const aParts = a.id.split('/');
      const bParts = b.id.split('/');

      // Compare directory levels
      for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
        if (aParts[i] !== bParts[i]) {
          return aParts[i].localeCompare(bParts[i]);
        }
      }

      return aParts.length - bParts.length;
    });

    ordered.forEach((node, index) => {
      node.order = index;
    });

    return {
      nodes: ordered,
      links: data.links
    };
  }

  /**
   * Get highly connected nodes
   */
  static getHubNodes(data: ArcDiagramData, threshold: number = 5): ArcNode[] {
    return data.nodes
      .filter(node => node.connections >= threshold)
      .sort((a, b) => b.connections - a.connections);
  }

  /**
   * Get leaf nodes (minimal connections)
   */
  static getLeafNodes(data: ArcDiagramData, threshold: number = 2): ArcNode[] {
    return data.nodes
      .filter(node => node.connections <= threshold)
      .sort((a, b) => a.connections - b.connections);
  }

  /**
   * Infer node type from file path
   */
  private static inferNodeType(filePath: string): string {
    const lower = filePath.toLowerCase();

    if (lower.includes('component') || lower.endsWith('.tsx')) return 'component';
    if (lower.includes('service')) return 'service';
    if (lower.includes('util') || lower.includes('helper')) return 'util';
    if (lower.includes('model') || lower.includes('type')) return 'model';
    if (lower.includes('controller')) return 'controller';
    if (lower.includes('view')) return 'view';
    if (lower.includes('api') || lower.includes('endpoint')) return 'api';
    if (lower.includes('hook') || lower.startsWith('use')) return 'util';

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
