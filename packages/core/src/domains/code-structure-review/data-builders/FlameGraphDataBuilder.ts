/**
 * Flame Graph Data Builder
 * Transforms profiling and hierarchical data into flame graph format
 *
 * Input: Call stacks, execution traces, or hierarchical timing data
 * Output: Flame graph tree with aggregated values
 */

import { FlameGraphData, FlameNode } from '../../visualization/webview/visualizations/FlameGraph';

export interface StackFrame {
  name: string;
  time: number;
  category?: string;
  details?: Record<string, any>;
}

export interface CallStack {
  frames: StackFrame[];
  timestamp?: number;
  threadId?: string;
}

export interface ExecutionProfile {
  stacks: CallStack[];
  unit?: string;
}

export class FlameGraphDataBuilder {
  /**
   * Build from call stacks (profiling data)
   */
  static buildFromCallStacks(profile: ExecutionProfile): FlameGraphData {
    if (!profile.stacks || profile.stacks.length === 0) {
      return this.buildSampleData();
    }

    // Build tree from stacks
    const root: FlameNode = {
      name: 'root',
      value: 0,
      children: []
    };

    profile.stacks.forEach(stack => {
      this.addStackToTree(root, stack.frames);
    });

    // Calculate total values
    this.calculateValues(root);

    return {
      root,
      unit: profile.unit || 'ms',
      colorScheme: 'category'
    };
  }

  /**
   * Add a call stack to the tree
   */
  private static addStackToTree(root: FlameNode, frames: StackFrame[]): void {
    let current = root;

    for (const frame of frames) {
      // Find or create child node
      if (!current.children) {
        current.children = [];
      }

      let child = current.children.find(c => c.name === frame.name);

      if (!child) {
        child = {
          name: frame.name,
          value: 0,
          category: frame.category,
          details: frame.details,
          children: []
        };
        current.children.push(child);
      }

      // Accumulate time
      child.value += frame.time;

      current = child;
    }
  }

  /**
   * Calculate total values (sum of children + self)
   */
  private static calculateValues(node: FlameNode): number {
    if (!node.children || node.children.length === 0) {
      return node.value;
    }

    let totalChildValue = 0;
    for (const child of node.children) {
      totalChildValue += this.calculateValues(child);
    }

    // Node value includes its own time plus all children
    node.value = Math.max(node.value, totalChildValue);

    return node.value;
  }

  /**
   * Build from file system structure with sizes
   */
  static buildFromFileSystem(files: any[]): FlameGraphData {
    const root: FlameNode = {
      name: 'root',
      value: 0,
      children: []
    };

    files.forEach(file => {
      const path = file.path.split('/');
      this.addPathToTree(root, path, file.size || 0, file.category);
    });

    this.calculateValues(root);

    return {
      root,
      unit: 'bytes',
      colorScheme: 'category'
    };
  }

  /**
   * Add a file path to the tree
   */
  private static addPathToTree(
    root: FlameNode,
    path: string[],
    size: number,
    category?: string
  ): void {
    let current = root;

    for (let i = 0; i < path.length; i++) {
      const segment = path[i];
      if (!segment) continue;

      if (!current.children) {
        current.children = [];
      }

      let child = current.children.find(c => c.name === segment);

      if (!child) {
        child = {
          name: segment,
          value: 0,
          category: i === path.length - 1 ? category : 'directory',
          children: []
        };
        current.children.push(child);
      }

      // For leaf nodes, add size
      if (i === path.length - 1) {
        child.value += size;
      }

      current = child;
    }
  }

  /**
   * Build from dependency chain
   */
  static buildFromDependencies(dependencies: any[]): FlameGraphData {
    const root: FlameNode = {
      name: 'dependencies',
      value: 0,
      children: []
    };

    dependencies.forEach(dep => {
      const parts = dep.name.split('/');
      this.addPathToTree(root, parts, dep.size || 1, dep.type);
    });

    this.calculateValues(root);

    return {
      root,
      unit: 'KB',
      colorScheme: 'category'
    };
  }

  /**
   * Build from execution timeline
   */
  static buildFromTimeline(events: any[]): FlameGraphData {
    // Group events by parent-child relationships
    const eventMap = new Map<string, FlameNode>();

    // Create nodes for all events
    events.forEach(event => {
      eventMap.set(event.id, {
        name: event.name,
        value: event.duration || 0,
        category: event.category,
        details: {
          startTime: event.startTime,
          endTime: event.endTime
        },
        children: []
      });
    });

    // Build tree structure
    const root: FlameNode = {
      name: 'timeline',
      value: 0,
      children: []
    };

    events.forEach(event => {
      const node = eventMap.get(event.id)!;

      if (event.parentId) {
        const parent = eventMap.get(event.parentId);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(node);
        } else {
          root.children!.push(node);
        }
      } else {
        root.children!.push(node);
      }
    });

    this.calculateValues(root);

    return {
      root,
      unit: 'ms',
      colorScheme: 'category'
    };
  }

  /**
   * Build from module imports
   */
  static buildFromModuleImports(modules: any[]): FlameGraphData {
    const root: FlameNode = {
      name: 'modules',
      value: 0,
      children: []
    };

    const moduleMap = new Map<string, FlameNode>();

    // Create nodes for all modules
    modules.forEach(mod => {
      const node: FlameNode = {
        name: mod.name,
        value: mod.size || 1,
        category: mod.type || 'module',
        details: {
          imports: mod.imports?.length || 0,
          exports: mod.exports?.length || 0
        },
        children: []
      };

      moduleMap.set(mod.name, node);
    });

    // Build import tree
    modules.forEach(mod => {
      const node = moduleMap.get(mod.name)!;

      if (mod.imports && mod.imports.length > 0) {
        mod.imports.forEach((importName: string) => {
          const importedNode = moduleMap.get(importName);
          if (importedNode && !node.children!.some(c => c.name === importName)) {
            node.children!.push(importedNode);
          }
        });
      }

      // If no parent, add to root
      if (!mod.importedBy || mod.importedBy.length === 0) {
        root.children!.push(node);
      }
    });

    this.calculateValues(root);

    return {
      root,
      unit: 'modules',
      colorScheme: 'category'
    };
  }

  /**
   * Build sample data for demonstration
   */
  static buildSampleData(): FlameGraphData {
    const root: FlameNode = {
      name: 'main()',
      value: 1000,
      category: 'application',
      children: [
        {
          name: 'initializeApp()',
          value: 200,
          category: 'initialization',
          children: [
            {
              name: 'loadConfig()',
              value: 50,
              category: 'io'
            },
            {
              name: 'setupRoutes()',
              value: 100,
              category: 'initialization'
            },
            {
              name: 'connectDatabase()',
              value: 50,
              category: 'database'
            }
          ]
        },
        {
          name: 'processRequests()',
          value: 700,
          category: 'processing',
          children: [
            {
              name: 'handleRequest()',
              value: 600,
              category: 'processing',
              children: [
                {
                  name: 'validateInput()',
                  value: 100,
                  category: 'validation'
                },
                {
                  name: 'queryDatabase()',
                  value: 300,
                  category: 'database',
                  children: [
                    {
                      name: 'executeQuery()',
                      value: 200,
                      category: 'database'
                    },
                    {
                      name: 'parseResults()',
                      value: 100,
                      category: 'processing'
                    }
                  ]
                },
                {
                  name: 'renderResponse()',
                  value: 200,
                  category: 'rendering',
                  children: [
                    {
                      name: 'compileTemplate()',
                      value: 100,
                      category: 'rendering'
                    },
                    {
                      name: 'serializeData()',
                      value: 100,
                      category: 'processing'
                    }
                  ]
                }
              ]
            },
            {
              name: 'logRequest()',
              value: 100,
              category: 'logging'
            }
          ]
        },
        {
          name: 'cleanup()',
          value: 100,
          category: 'cleanup',
          children: [
            {
              name: 'closeConnections()',
              value: 50,
              category: 'cleanup'
            },
            {
              name: 'flushLogs()',
              value: 50,
              category: 'logging'
            }
          ]
        }
      ]
    };

    return {
      root,
      unit: 'ms',
      colorScheme: 'category'
    };
  }

  /**
   * Merge multiple flame graphs
   */
  static merge(graphs: FlameGraphData[]): FlameGraphData {
    if (graphs.length === 0) {
      return this.buildSampleData();
    }

    if (graphs.length === 1) {
      return graphs[0];
    }

    const mergedRoot: FlameNode = {
      name: 'merged',
      value: 0,
      children: []
    };

    graphs.forEach(graph => {
      if (graph.root.children) {
        graph.root.children.forEach(child => {
          const existing = mergedRoot.children!.find(c => c.name === child.name);
          if (existing) {
            this.mergeNodes(existing, child);
          } else {
            mergedRoot.children!.push({ ...child });
          }
        });
      }
    });

    this.calculateValues(mergedRoot);

    return {
      root: mergedRoot,
      unit: graphs[0].unit,
      colorScheme: graphs[0].colorScheme
    };
  }

  /**
   * Merge two nodes
   */
  private static mergeNodes(target: FlameNode, source: FlameNode): void {
    target.value += source.value;

    if (source.children) {
      if (!target.children) {
        target.children = [];
      }

      source.children.forEach(sourceChild => {
        const targetChild = target.children!.find(c => c.name === sourceChild.name);
        if (targetChild) {
          this.mergeNodes(targetChild, sourceChild);
        } else {
          target.children!.push({ ...sourceChild });
        }
      });
    }
  }

  /**
   * Filter flame graph by minimum value
   */
  static filterByMinValue(data: FlameGraphData, minValue: number): FlameGraphData {
    const filteredRoot = this.filterNode(data.root, minValue);

    return {
      root: filteredRoot || data.root,
      unit: data.unit,
      colorScheme: data.colorScheme
    };
  }

  /**
   * Filter a node and its children
   */
  private static filterNode(node: FlameNode, minValue: number): FlameNode | null {
    if (node.value < minValue) {
      return null;
    }

    const filteredNode: FlameNode = {
      ...node,
      children: []
    };

    if (node.children) {
      filteredNode.children = node.children
        .map(child => this.filterNode(child, minValue))
        .filter((child): child is FlameNode => child !== null);
    }

    return filteredNode;
  }

  /**
   * Get statistics about flame graph
   */
  static getStatistics(data: FlameGraphData): {
    totalValue: number;
    nodeCount: number;
    maxDepth: number;
    categories: Set<string>;
  } {
    let nodeCount = 0;
    let maxDepth = 0;
    const categories = new Set<string>();

    const traverse = (node: FlameNode, depth: number) => {
      nodeCount++;
      maxDepth = Math.max(maxDepth, depth);

      if (node.category) {
        categories.add(node.category);
      }

      if (node.children) {
        node.children.forEach(child => traverse(child, depth + 1));
      }
    };

    traverse(data.root, 0);

    return {
      totalValue: data.root.value,
      nodeCount,
      maxDepth,
      categories
    };
  }
}
