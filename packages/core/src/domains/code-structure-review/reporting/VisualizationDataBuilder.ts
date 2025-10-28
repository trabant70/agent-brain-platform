/**
 * Builds D3-compatible visualization data from analysis results
 */

import type {
  CodeStructureAnalysis,
  CategoryAnalysis,
  VisualizationData,
  Issue
} from '../types';

/**
 * Converts analysis data into D3-compatible formats
 */
export class VisualizationDataBuilder {
  /**
   * Build Sankey diagram data for feature completeness (endpoint connections)
   */
  buildSankeyData(category: CategoryAnalysis): VisualizationData {
    // Sankey shows flow from backend → frontend
    const nodes: any[] = [];
    const links: any[] = [];

    // Parse metrics for endpoint data
    const metrics = category.metrics;

    // Add nodes
    nodes.push({ id: 'backend', name: 'Backend Endpoints' });
    nodes.push({ id: 'connected', name: 'Connected' });
    nodes.push({ id: 'disconnected', name: 'Disconnected' });
    nodes.push({ id: 'frontend', name: 'Frontend' });

    // Add links based on metrics
    if (metrics.connectedEndpoints) {
      links.push({
        source: 'backend',
        target: 'connected',
        value: metrics.connectedEndpoints
      });
      links.push({
        source: 'connected',
        target: 'frontend',
        value: metrics.connectedEndpoints
      });
    }

    if (metrics.disconnectedEndpoints) {
      links.push({
        source: 'backend',
        target: 'disconnected',
        value: metrics.disconnectedEndpoints
      });
    }

    return {
      type: 'sankey',
      categoryId: category.categoryId,
      title: 'Endpoint Connection Flow',
      data: { nodes, links },
      config: {
        width: 800,
        height: 400,
        interactive: true,
        showLabels: true,
        colorScheme: 'category10'
      }
    };
  }

  /**
   * Build bubble chart data for issue distribution
   */
  buildBubbleChartData(analysis: CodeStructureAnalysis): VisualizationData {
    const bubbles = analysis.categories.map(category => {
      const criticalCount = category.issues.filter(
        i => i.severity === 'critical'
      ).length;
      const highCount = category.issues.filter(i => i.severity === 'high').length;

      return {
        id: category.categoryId,
        name: category.categoryName,
        value: category.issues.length,
        critical: criticalCount,
        high: highCount,
        score: category.score,
        status: category.status
      };
    });

    return {
      type: 'bubble',
      categoryId: 'all',
      title: 'Issue Distribution by Category',
      data: { children: bubbles },
      config: {
        width: 800,
        height: 600,
        interactive: true,
        showLabels: true,
        colorScheme: 'category10'
      }
    };
  }

  /**
   * Build heatmap data for file-level issues
   */
  buildHeatmapData(category: CategoryAnalysis): VisualizationData {
    // Group issues by file
    const fileIssues: Record<string, Issue[]> = {};

    category.issues.forEach(issue => {
      if (!fileIssues[issue.filePath]) {
        fileIssues[issue.filePath] = [];
      }
      fileIssues[issue.filePath].push(issue);
    });

    // Convert to heatmap format
    const data = Object.entries(fileIssues).map(([filePath, issues]) => {
      const criticalCount = issues.filter(i => i.severity === 'critical').length;
      const highCount = issues.filter(i => i.severity === 'high').length;

      return {
        file: this.getFileName(filePath),
        fullPath: filePath,
        count: issues.length,
        critical: criticalCount,
        high: highCount,
        severity: criticalCount > 0 ? 'critical' : highCount > 0 ? 'high' : 'medium'
      };
    });

    return {
      type: 'heatmap',
      categoryId: category.categoryId,
      title: `Issue Heatmap: ${category.categoryName}`,
      data,
      config: {
        width: 800,
        height: 400,
        interactive: true,
        showLabels: true,
        colorScheme: 'reds'
      }
    };
  }

  /**
   * Build sunburst chart data for category hierarchy
   */
  buildSunburstData(analysis: CodeStructureAnalysis): VisualizationData {
    const children = analysis.categories.map(category => {
      const severityGroups = [
        {
          name: 'Critical',
          value: category.issues.filter(i => i.severity === 'critical').length
        },
        {
          name: 'High',
          value: category.issues.filter(i => i.severity === 'high').length
        },
        {
          name: 'Medium',
          value: category.issues.filter(i => i.severity === 'medium').length
        },
        {
          name: 'Low',
          value: category.issues.filter(i => i.severity === 'low').length
        }
      ].filter(g => g.value > 0);

      return {
        name: category.categoryName,
        children: severityGroups
      };
    });

    return {
      type: 'sunburst',
      categoryId: 'all',
      title: 'Issue Hierarchy',
      data: {
        name: 'Code Structure',
        children
      },
      config: {
        width: 600,
        height: 600,
        interactive: true,
        showLabels: true,
        colorScheme: 'category20'
      }
    };
  }

  /**
   * Build score gauge data
   */
  buildScoreGaugeData(category: CategoryAnalysis): any {
    return {
      type: 'gauge',
      categoryId: category.categoryId,
      title: `${category.categoryName} Score`,
      data: {
        score: category.score,
        status: category.status,
        thresholds: [
          { value: 90, label: 'Excellent', color: '#4CAF50' },
          { value: 70, label: 'Good', color: '#8BC34A' },
          { value: 50, label: 'Warning', color: '#FFC107' },
          { value: 0, label: 'Critical', color: '#F44336' }
        ]
      },
      config: {
        width: 300,
        height: 200,
        interactive: false,
        showLabels: true,
        colorScheme: 'custom'
      }
    };
  }

  /**
   * Build all visualizations for analysis
   */
  buildAllVisualizations(analysis: CodeStructureAnalysis): VisualizationData[] {
    const visualizations: VisualizationData[] = [];

    // Bubble chart for overview
    visualizations.push(this.buildBubbleChartData(analysis));

    // Sunburst for hierarchy
    visualizations.push(this.buildSunburstData(analysis));

    // Category-specific visualizations
    analysis.categories.forEach(category => {
      // Sankey for feature completeness
      if (category.categoryId === 'feature-completeness') {
        visualizations.push(this.buildSankeyData(category));
      }

      // Heatmap for each category
      if (category.issues.length > 0) {
        visualizations.push(this.buildHeatmapData(category));
      }
    });

    return visualizations;
  }

  /**
   * Get file name from path
   */
  private getFileName(filePath: string): string {
    const parts = filePath.split('/');
    return parts[parts.length - 1];
  }
}
