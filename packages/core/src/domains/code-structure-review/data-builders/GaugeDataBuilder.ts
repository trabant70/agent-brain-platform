/**
 * Gauge Data Builder
 * Transforms metric data into gauge chart format
 *
 * Input: Single metric with min/max/target values
 * Output: Gauge-ready data with zones and formatting
 */

import { GaugeData, GaugeZone } from '../../visualization/webview/visualizations/GaugeChart';

export interface MetricData {
  value: number;
  min?: number;
  max?: number;
  target?: number;
  unit?: string;
  title?: string;
}

export class GaugeDataBuilder {
  /**
   * Build from metric data
   */
  static buildFromMetric(metric: MetricData): GaugeData {
    const min = metric.min ?? 0;
    const max = metric.max ?? 100;

    return {
      value: Math.max(min, Math.min(max, metric.value)),
      min,
      max,
      target: metric.target,
      unit: metric.unit,
      title: metric.title,
      zones: this.generateDefaultZones(min, max)
    };
  }

  /**
   * Build from score data (0-100 scale)
   */
  static buildFromScore(
    score: number,
    title: string,
    target?: number
  ): GaugeData {
    return {
      value: Math.max(0, Math.min(100, score)),
      min: 0,
      max: 100,
      target,
      unit: 'points',
      title,
      zones: this.generateScoreZones()
    };
  }

  /**
   * Build from code quality metrics
   */
  static buildFromCodeQuality(analysis: any): GaugeData {
    let totalScore = 0;
    let categoryCount = 0;

    if (analysis.categories) {
      analysis.categories.forEach((cat: any) => {
        if (typeof cat.score === 'number') {
          totalScore += cat.score;
          categoryCount++;
        }
      });
    }

    const averageScore = categoryCount > 0 ? totalScore / categoryCount : 0;

    return {
      value: averageScore,
      min: 0,
      max: 100,
      target: 80,
      unit: 'points',
      title: 'Overall Code Quality Score',
      subtitle: `Based on ${categoryCount} categories`,
      zones: this.generateScoreZones()
    };
  }

  /**
   * Build from test coverage
   */
  static buildFromTestCoverage(
    coverage: number,
    target: number = 80
  ): GaugeData {
    return {
      value: Math.max(0, Math.min(100, coverage)),
      min: 0,
      max: 100,
      target,
      unit: '%',
      title: 'Test Coverage',
      zones: [
        { from: 0, to: 50, color: '#ef4444', label: 'Poor' },
        { from: 50, to: 70, color: '#f59e0b', label: 'Fair' },
        { from: 70, to: 85, color: '#eab308', label: 'Good' },
        { from: 85, to: 100, color: '#22c55e', label: 'Excellent' }
      ]
    };
  }

  /**
   * Build from performance metric
   */
  static buildFromPerformance(
    responseTime: number,
    maxAcceptable: number = 1000,
    target: number = 200
  ): GaugeData {
    return {
      value: Math.min(maxAcceptable, responseTime),
      min: 0,
      max: maxAcceptable,
      target,
      unit: 'ms',
      title: 'Response Time',
      zones: [
        { from: 0, to: target, color: '#22c55e', label: 'Fast' },
        { from: target, to: maxAcceptable * 0.7, color: '#eab308', label: 'Acceptable' },
        { from: maxAcceptable * 0.7, to: maxAcceptable, color: '#ef4444', label: 'Slow' }
      ]
    };
  }

  /**
   * Build from complexity metric
   */
  static buildFromComplexity(
    complexity: number,
    maxComplexity: number = 50
  ): GaugeData {
    return {
      value: Math.min(maxComplexity, complexity),
      min: 0,
      max: maxComplexity,
      target: maxComplexity * 0.4,
      unit: 'cyclomatic',
      title: 'Code Complexity',
      zones: [
        { from: 0, to: maxComplexity * 0.3, color: '#22c55e', label: 'Simple' },
        { from: maxComplexity * 0.3, to: maxComplexity * 0.6, color: '#eab308', label: 'Moderate' },
        { from: maxComplexity * 0.6, to: maxComplexity, color: '#ef4444', label: 'Complex' }
      ]
    };
  }

  /**
   * Build from technical debt
   */
  static buildFromTechnicalDebt(
    debtMinutes: number,
    maxDebt: number = 1440 // 1 day
  ): GaugeData {
    const hours = debtMinutes / 60;

    return {
      value: Math.min(maxDebt, debtMinutes),
      min: 0,
      max: maxDebt,
      target: maxDebt * 0.25,
      unit: 'hours',
      title: 'Technical Debt',
      subtitle: `${hours.toFixed(1)} hours`,
      zones: [
        { from: 0, to: maxDebt * 0.33, color: '#22c55e', label: 'Low' },
        { from: maxDebt * 0.33, to: maxDebt * 0.67, color: '#f59e0b', label: 'Medium' },
        { from: maxDebt * 0.67, to: maxDebt, color: '#ef4444', label: 'High' }
      ]
    };
  }

  /**
   * Build from issue count with severity weighting
   */
  static buildFromIssues(issues: any[]): GaugeData {
    let weightedScore = 0;
    let maxPossibleScore = 100;

    if (!issues || issues.length === 0) {
      return {
        value: 100,
        min: 0,
        max: 100,
        target: 90,
        unit: 'points',
        title: 'Code Health Score',
        zones: this.generateScoreZones()
      };
    }

    // Calculate weighted penalty
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    issues.forEach((issue: any) => {
      switch (issue.severity) {
        case 'critical':
          criticalCount++;
          break;
        case 'high':
          highCount++;
          break;
        case 'medium':
          mediumCount++;
          break;
        case 'low':
          lowCount++;
          break;
      }
    });

    // Weighted penalties
    const penalty = (criticalCount * 10) + (highCount * 5) + (mediumCount * 2) + (lowCount * 1);
    weightedScore = Math.max(0, 100 - penalty);

    return {
      value: weightedScore,
      min: 0,
      max: 100,
      target: 90,
      unit: 'points',
      title: 'Code Health Score',
      subtitle: `${issues.length} total issues`,
      zones: this.generateScoreZones()
    };
  }

  /**
   * Build from percentage
   */
  static buildFromPercentage(
    percentage: number,
    title: string,
    target?: number,
    inverted: boolean = false // true if lower is better
  ): GaugeData {
    const zones = inverted
      ? [
          { from: 0, to: 33, color: '#22c55e', label: 'Low' },
          { from: 33, to: 67, color: '#f59e0b', label: 'Medium' },
          { from: 67, to: 100, color: '#ef4444', label: 'High' }
        ]
      : this.generateScoreZones();

    return {
      value: Math.max(0, Math.min(100, percentage)),
      min: 0,
      max: 100,
      target,
      unit: '%',
      title,
      zones
    };
  }

  /**
   * Generate default zones for arbitrary ranges
   */
  private static generateDefaultZones(min: number, max: number): GaugeZone[] {
    const range = max - min;
    return [
      { from: min, to: min + range * 0.33, color: '#ef4444', label: 'Low' },
      { from: min + range * 0.33, to: min + range * 0.67, color: '#f59e0b', label: 'Medium' },
      { from: min + range * 0.67, to: max, color: '#22c55e', label: 'High' }
    ];
  }

  /**
   * Generate score zones (0-100 scale, higher is better)
   */
  private static generateScoreZones(): GaugeZone[] {
    return [
      { from: 0, to: 40, color: '#ef4444', label: 'Poor' },
      { from: 40, to: 70, color: '#f59e0b', label: 'Fair' },
      { from: 70, to: 85, color: '#eab308', label: 'Good' },
      { from: 85, to: 100, color: '#22c55e', label: 'Excellent' }
    ];
  }

  /**
   * Build custom gauge with specific zones
   */
  static buildCustom(
    value: number,
    min: number,
    max: number,
    zones: GaugeZone[],
    options?: {
      target?: number;
      unit?: string;
      title?: string;
      subtitle?: string;
    }
  ): GaugeData {
    return {
      value: Math.max(min, Math.min(max, value)),
      min,
      max,
      target: options?.target,
      unit: options?.unit,
      title: options?.title,
      subtitle: options?.subtitle,
      zones
    };
  }

  /**
   * Get gauge status based on value and zones
   */
  static getStatus(data: GaugeData): {
    zone: GaugeZone | undefined;
    percentile: number;
    status: 'critical' | 'warning' | 'good' | 'excellent';
  } {
    const percentile = ((data.value - data.min) / (data.max - data.min)) * 100;

    // Find the zone the value falls into
    const zone = data.zones?.find(z => data.value >= z.from && data.value <= z.to);

    let status: 'critical' | 'warning' | 'good' | 'excellent';
    if (percentile < 40) {
      status = 'critical';
    } else if (percentile < 70) {
      status = 'warning';
    } else if (percentile < 85) {
      status = 'good';
    } else {
      status = 'excellent';
    }

    return { zone, percentile, status };
  }

  /**
   * Compare value to target
   */
  static compareToTarget(data: GaugeData): {
    difference: number;
    percentDifference: number;
    meetsTarget: boolean;
    status: 'above' | 'below' | 'at-target';
  } | null {
    if (data.target === undefined) {
      return null;
    }

    const difference = data.value - data.target;
    const percentDifference = (difference / data.target) * 100;
    const tolerance = (data.max - data.min) * 0.02; // 2% tolerance

    let status: 'above' | 'below' | 'at-target';
    if (Math.abs(difference) <= tolerance) {
      status = 'at-target';
    } else if (difference > 0) {
      status = 'above';
    } else {
      status = 'below';
    }

    return {
      difference,
      percentDifference,
      meetsTarget: difference >= 0,
      status
    };
  }
}
