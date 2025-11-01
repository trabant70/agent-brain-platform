/**
 * Data Validator
 * Runtime validation for visualization data contracts
 *
 * Purpose: Catch data contract violations and provide safe fallbacks
 * Benefits:
 * - Prevents crashes from malformed data
 * - Provides actionable error messages
 * - Returns safe empty states on validation failure
 */

import type {
  TestCoverageGraphData,
  DependencyGraphData,
  ParallelCoordinatesData,
  StreamGraphData,
  MatrixViewData,
  HeatmapData,
  SankeyData,
  BubbleChartData,
  GaugeData,
  RadarChartData,
  TimelineData,
  ValidationResult
} from '../contracts/VisualizationDataContracts';

/**
 * Data Validator Class
 */
export class DataValidator {
  /**
   * Validate Test Coverage Graph Data
   */
  static validateTestCoverage(data: any): ValidationResult<TestCoverageGraphData> {
    const errors: string[] = [];

    if (!data) {
      errors.push('Data is null or undefined');
      return this.createFailure(errors);
    }

    if (!Array.isArray(data.nodes)) {
      errors.push('Missing or invalid "nodes" array');
    }

    if (!Array.isArray(data.links)) {
      errors.push('Missing or invalid "links" array');
    }

    if (typeof data.overallCoverage !== 'number') {
      errors.push('Missing or invalid "overallCoverage" number');
    }

    if (errors.length > 0) {
      return this.createFailure(errors);
    }

    // Validate node structure
    for (const node of data.nodes) {
      if (!node.id || typeof node.id !== 'string') {
        errors.push(`Node missing valid "id": ${JSON.stringify(node)}`);
      }
      if (!node.type || !['test', 'source'].includes(node.type)) {
        errors.push(`Node has invalid "type": ${node.type}`);
      }
    }

    if (errors.length > 0) {
      return this.createFailure(errors);
    }

    return {
      valid: true,
      data: data as TestCoverageGraphData
    };
  }

  /**
   * Validate Dependency Graph Data
   */
  static validateDependencyGraph(data: any): ValidationResult<DependencyGraphData> {
    const errors: string[] = [];

    if (!data) {
      errors.push('Data is null or undefined');
      return this.createFailure(errors);
    }

    if (!Array.isArray(data.nodes)) {
      errors.push('Missing or invalid "nodes" array');
    }

    if (!Array.isArray(data.links)) {
      errors.push('Missing or invalid "links" array');
    }

    if (typeof data.isEmpty !== 'boolean') {
      errors.push('Missing or invalid "isEmpty" boolean');
    }

    if (errors.length > 0) {
      return this.createFailure(errors);
    }

    return {
      valid: true,
      data: data as DependencyGraphData
    };
  }

  /**
   * Validate Parallel Coordinates Data
   */
  static validateParallelCoordinates(data: any): ValidationResult<ParallelCoordinatesData> {
    const errors: string[] = [];

    if (!data) {
      errors.push('Data is null or undefined');
      return this.createFailure(errors);
    }

    if (!Array.isArray(data.dimensions)) {
      errors.push('Missing or invalid "dimensions" array');
    } else if (data.dimensions.length === 0) {
      errors.push('Dimensions array is empty');
    }

    if (!Array.isArray(data.data)) {
      errors.push('Missing or invalid "data" array');
    }

    if (errors.length > 0) {
      return this.createFailure(errors);
    }

    // Validate dimension structure
    for (const dim of data.dimensions) {
      if (!dim.key || typeof dim.key !== 'string') {
        errors.push(`Dimension missing valid "key": ${JSON.stringify(dim)}`);
      }
      if (!dim.type || !['numeric', 'categorical'].includes(dim.type)) {
        errors.push(`Dimension has invalid "type": ${dim.type}`);
      }
    }

    if (errors.length > 0) {
      return this.createFailure(errors);
    }

    return {
      valid: true,
      data: data as ParallelCoordinatesData
    };
  }

  /**
   * Validate Stream Graph Data
   */
  static validateStreamGraph(data: any): ValidationResult<StreamGraphData> {
    const errors: string[] = [];

    if (!data) {
      errors.push('Data is null or undefined');
      return this.createFailure(errors);
    }

    if (!Array.isArray(data.data)) {
      errors.push('Missing or invalid "data" array');
    }

    if (!Array.isArray(data.layers)) {
      errors.push('Missing or invalid "layers" array');
    }

    if (errors.length > 0) {
      return this.createFailure(errors);
    }

    return {
      valid: true,
      data: data as StreamGraphData
    };
  }

  /**
   * Validate Matrix View Data
   */
  static validateMatrixView(data: any): ValidationResult<MatrixViewData> {
    const errors: string[] = [];

    if (!data) {
      errors.push('Data is null or undefined');
      return this.createFailure(errors);
    }

    if (!Array.isArray(data.nodes)) {
      errors.push('Missing or invalid "nodes" array');
    }

    if (!Array.isArray(data.cells)) {
      errors.push('Missing or invalid "cells" array');
    }

    if (errors.length > 0) {
      return this.createFailure(errors);
    }

    return {
      valid: true,
      data: data as MatrixViewData
    };
  }

  /**
   * Validate Heatmap Data
   */
  static validateHeatmap(data: any): ValidationResult<HeatmapData> {
    const errors: string[] = [];

    if (!data) {
      errors.push('Data is null or undefined');
      return this.createFailure(errors);
    }

    if (!Array.isArray(data)) {
      errors.push('Heatmap data must be an array');
      return this.createFailure(errors);
    }

    return {
      valid: true,
      data: data as HeatmapData
    };
  }

  /**
   * Validate Sankey Data
   */
  static validateSankey(data: any): ValidationResult<SankeyData> {
    const errors: string[] = [];

    if (!data) {
      errors.push('Data is null or undefined');
      return this.createFailure(errors);
    }

    if (!Array.isArray(data.nodes)) {
      errors.push('Missing or invalid "nodes" array');
    }

    if (!Array.isArray(data.links)) {
      errors.push('Missing or invalid "links" array');
    }

    if (errors.length > 0) {
      return this.createFailure(errors);
    }

    return {
      valid: true,
      data: data as SankeyData
    };
  }

  /**
   * Validate Bubble Chart Data
   */
  static validateBubbleChart(data: any): ValidationResult<BubbleChartData> {
    const errors: string[] = [];

    if (!data) {
      errors.push('Data is null or undefined');
      return this.createFailure(errors);
    }

    if (!Array.isArray(data.children)) {
      errors.push('Missing or invalid "children" array');
      return this.createFailure(errors);
    }

    return {
      valid: true,
      data: data as BubbleChartData
    };
  }

  /**
   * Validate Gauge Data
   */
  static validateGauge(data: any): ValidationResult<GaugeData> {
    const errors: string[] = [];

    if (!data) {
      errors.push('Data is null or undefined');
      return this.createFailure(errors);
    }

    if (typeof data.value !== 'number') {
      errors.push('Missing or invalid "value" number');
    }

    if (!Array.isArray(data.zones)) {
      errors.push('Missing or invalid "zones" array');
    }

    if (errors.length > 0) {
      return this.createFailure(errors);
    }

    return {
      valid: true,
      data: data as GaugeData
    };
  }

  /**
   * Validate Radar Chart Data
   */
  static validateRadarChart(data: any): ValidationResult<RadarChartData> {
    const errors: string[] = [];

    if (!data) {
      errors.push('Data is null or undefined');
      return this.createFailure(errors);
    }

    if (!Array.isArray(data.datasets)) {
      errors.push('Missing or invalid "datasets" array');
      return this.createFailure(errors);
    }

    return {
      valid: true,
      data: data as RadarChartData
    };
  }

  /**
   * Validate Timeline Data
   */
  static validateTimeline(data: any): ValidationResult<TimelineData> {
    const errors: string[] = [];

    if (!data) {
      errors.push('Data is null or undefined');
      return this.createFailure(errors);
    }

    if (!Array.isArray(data.categories)) {
      errors.push('Missing or invalid "categories" array');
    }

    if (!Array.isArray(data.points)) {
      errors.push('Missing or invalid "points" array');
    }

    if (errors.length > 0) {
      return this.createFailure(errors);
    }

    return {
      valid: true,
      data: data as TimelineData
    };
  }

  /**
   * Create failure result with errors
   */
  private static createFailure(errors: string[]): ValidationResult<any> {
    console.error('Validation failed:', errors);
    return {
      valid: false,
      errors
    };
  }

  /**
   * Safe data access helper
   */
  static safeGet<T>(data: any, path: string, defaultValue: T): T {
    const keys = path.split('.');
    let current = data;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return defaultValue;
      }
      current = current[key];
    }

    return current !== undefined ? current : defaultValue;
  }

  /**
   * Check if array is non-empty
   */
  static isNonEmptyArray(value: any): value is any[] {
    return Array.isArray(value) && value.length > 0;
  }

  /**
   * Check if object has required keys
   */
  static hasKeys(obj: any, keys: string[]): boolean {
    if (!obj || typeof obj !== 'object') {
      return false;
    }

    return keys.every(key => key in obj);
  }
}
