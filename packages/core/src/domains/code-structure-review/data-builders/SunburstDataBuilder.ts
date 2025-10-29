/**
 * Sunburst Data Builder
 * Transforms flat analysis results into hierarchical tree structure for sunburst diagram
 *
 * Input: Analysis results with file paths and issues
 * Output: Nested tree structure with directories and files
 */

import { SunburstNode } from '../../visualization/webview/visualizations/SunburstDiagram';

export interface FileAnalysis {
  filePath: string;
  issueCount: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
}

export class SunburstDataBuilder {
  /**
   * Build sunburst tree from analysis results
   */
  static buildTree(files: FileAnalysis[], rootPath: string = '/'): SunburstNode {
    // Create root node
    const root: SunburstNode = {
      name: rootPath,
      path: rootPath,
      children: [],
      issueCount: 0,
      criticalIssues: 0,
      highIssues: 0,
      mediumIssues: 0,
      lowIssues: 0,
      status: 'excellent',
      type: 'directory'
    };

    // Build tree structure
    files.forEach(file => {
      this.insertFile(root, file);
    });

    // Calculate aggregated metrics
    this.calculateMetrics(root);

    // Calculate status for all nodes
    this.calculateStatus(root);

    return root;
  }

  /**
   * Insert file into tree
   */
  private static insertFile(root: SunburstNode, file: FileAnalysis): void {
    const pathParts = file.filePath.split('/').filter(part => part.length > 0);

    let currentNode = root;

    // Traverse/create directory nodes
    for (let i = 0; i < pathParts.length - 1; i++) {
      const dirName = pathParts[i];
      const dirPath = pathParts.slice(0, i + 1).join('/');

      // Find or create directory node
      let dirNode = currentNode.children?.find(
        child => child.name === dirName && child.type === 'directory'
      );

      if (!dirNode) {
        dirNode = {
          name: dirName,
          path: dirPath,
          children: [],
          issueCount: 0,
          criticalIssues: 0,
          highIssues: 0,
          mediumIssues: 0,
          lowIssues: 0,
          status: 'excellent',
          type: 'directory'
        };
        if (!currentNode.children) {
          currentNode.children = [];
        }
        currentNode.children.push(dirNode);
      }

      currentNode = dirNode;
    }

    // Add file node
    const fileName = pathParts[pathParts.length - 1];
    const fileNode: SunburstNode = {
      name: fileName,
      path: file.filePath,
      issueCount: file.issueCount,
      criticalIssues: file.criticalIssues,
      highIssues: file.highIssues,
      mediumIssues: file.mediumIssues,
      lowIssues: file.lowIssues,
      status: 'excellent', // Will be calculated later
      type: 'file'
    };

    if (!currentNode.children) {
      currentNode.children = [];
    }
    currentNode.children.push(fileNode);
  }

  /**
   * Calculate aggregated metrics for directories
   */
  private static calculateMetrics(node: SunburstNode): void {
    if (node.type === 'file') {
      // File node metrics are already set
      return;
    }

    // Directory node - aggregate from children
    if (node.children) {
      node.issueCount = 0;
      node.criticalIssues = 0;
      node.highIssues = 0;
      node.mediumIssues = 0;
      node.lowIssues = 0;

      node.children.forEach(child => {
        // Recursively calculate child metrics first
        this.calculateMetrics(child);

        // Aggregate to parent
        node.issueCount += child.issueCount;
        node.criticalIssues += child.criticalIssues;
        node.highIssues += child.highIssues;
        node.mediumIssues += child.mediumIssues;
        node.lowIssues += child.lowIssues;
      });
    }
  }

  /**
   * Calculate status based on issue severity
   */
  private static calculateStatus(node: SunburstNode): void {
    if (node.criticalIssues > 0) {
      node.status = 'critical';
    } else if (node.highIssues > 0) {
      node.status = 'warning';
    } else if (node.mediumIssues > 0) {
      node.status = 'good';
    } else {
      node.status = 'excellent';
    }

    // Recursively calculate status for children
    if (node.children) {
      node.children.forEach(child => {
        this.calculateStatus(child);
      });
    }
  }

  /**
   * Build tree from code structure analysis results
   */
  static buildFromAnalysis(analysis: any): SunburstNode {
    const files: FileAnalysis[] = [];

    // Extract file data from categories
    if (analysis.categories) {
      analysis.categories.forEach((category: any) => {
        if (category.issues) {
          category.issues.forEach((issue: any) => {
            // Find or create file entry
            let fileEntry = files.find(f => f.filePath === issue.filePath);
            if (!fileEntry) {
              fileEntry = {
                filePath: issue.filePath,
                issueCount: 0,
                criticalIssues: 0,
                highIssues: 0,
                mediumIssues: 0,
                lowIssues: 0
              };
              files.push(fileEntry);
            }

            // Increment counts
            fileEntry.issueCount++;
            switch (issue.severity) {
              case 'critical':
                fileEntry.criticalIssues++;
                break;
              case 'high':
                fileEntry.highIssues++;
                break;
              case 'medium':
                fileEntry.mediumIssues++;
                break;
              case 'low':
                fileEntry.lowIssues++;
                break;
            }
          });
        }
      });
    }

    // If no files found, create a sample structure
    if (files.length === 0) {
      files.push({
        filePath: 'src/index.ts',
        issueCount: 0,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
        lowIssues: 0
      });
    }

    return this.buildTree(files, 'project');
  }

  /**
   * Prune tree to only show nodes with issues (optional filtering)
   */
  static pruneEmptyNodes(node: SunburstNode): SunburstNode | null {
    // Keep node if it has issues
    if (node.issueCount > 0) {
      // If it's a directory, prune children recursively
      if (node.type === 'directory' && node.children) {
        node.children = node.children
          .map(child => this.pruneEmptyNodes(child))
          .filter(child => child !== null) as SunburstNode[];

        // Keep directory if it has children after pruning
        if (node.children.length > 0) {
          return node;
        }
      } else {
        // File with issues - keep it
        return node;
      }
    }

    // Node has no issues and no children with issues - remove it
    return null;
  }

  /**
   * Limit tree depth for performance (large codebases)
   */
  static limitDepth(node: SunburstNode, maxDepth: number, currentDepth: number = 0): SunburstNode {
    if (currentDepth >= maxDepth) {
      // Collapse all children at max depth
      const collapsedNode = { ...node };
      delete collapsedNode.children;
      return collapsedNode;
    }

    if (node.children) {
      node.children = node.children.map(child =>
        this.limitDepth(child, maxDepth, currentDepth + 1)
      );
    }

    return node;
  }

  /**
   * Get top N files by issue count
   */
  static getTopFiles(node: SunburstNode, count: number): FileAnalysis[] {
    const files: FileAnalysis[] = [];

    const collectFiles = (n: SunburstNode) => {
      if (n.type === 'file') {
        files.push({
          filePath: n.path,
          issueCount: n.issueCount,
          criticalIssues: n.criticalIssues,
          highIssues: n.highIssues,
          mediumIssues: n.mediumIssues,
          lowIssues: n.lowIssues
        });
      }

      if (n.children) {
        n.children.forEach(collectFiles);
      }
    };

    collectFiles(node);

    return files
      .sort((a, b) => {
        // Sort by critical first, then by total
        if (b.criticalIssues !== a.criticalIssues) {
          return b.criticalIssues - a.criticalIssues;
        }
        return b.issueCount - a.issueCount;
      })
      .slice(0, count);
  }
}
