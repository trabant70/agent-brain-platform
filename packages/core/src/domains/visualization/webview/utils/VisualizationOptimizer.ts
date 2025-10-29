/**
 * Visualization Optimizer
 * Performance optimization utilities for D3 visualizations
 *
 * Features:
 * - Debouncing and throttling for resize/interaction handlers
 * - Canvas fallback for large datasets
 * - Virtualization helpers
 * - Performance monitoring
 */

export interface OptimizationConfig {
  debounceDelay?: number;
  throttleDelay?: number;
  maxSvgNodes?: number;
  enableVirtualization?: boolean;
  enablePerformanceMonitoring?: boolean;
}

export interface PerformanceMetrics {
  renderTime: number;
  updateTime: number;
  nodeCount: number;
  memoryUsage?: number;
}

/**
 * Visualization Optimizer
 */
export class VisualizationOptimizer {
  private config: Required<OptimizationConfig>;
  private metrics: Map<string, PerformanceMetrics> = new Map();

  constructor(config: OptimizationConfig = {}) {
    this.config = {
      debounceDelay: config.debounceDelay ?? 150,
      throttleDelay: config.throttleDelay ?? 16, // ~60fps
      maxSvgNodes: config.maxSvgNodes ?? 1000,
      enableVirtualization: config.enableVirtualization ?? true,
      enablePerformanceMonitoring: config.enablePerformanceMonitoring ?? false
    };
  }

  /**
   * Debounce function execution
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    delay?: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout | null = null;

    return (...args: Parameters<T>) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        func(...args);
        timeoutId = null;
      }, delay ?? this.config.debounceDelay);
    };
  }

  /**
   * Throttle function execution
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    delay?: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;
    let timeoutId: NodeJS.Timeout | null = null;

    return (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCall;
      const throttleDelay = delay ?? this.config.throttleDelay;

      if (timeSinceLastCall >= throttleDelay) {
        lastCall = now;
        func(...args);
      } else {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
          lastCall = Date.now();
          func(...args);
          timeoutId = null;
        }, throttleDelay - timeSinceLastCall);
      }
    };
  }

  /**
   * Request animation frame wrapper
   */
  requestAnimationFrame(callback: () => void): number {
    return window.requestAnimationFrame(callback);
  }

  /**
   * Cancel animation frame
   */
  cancelAnimationFrame(id: number): void {
    window.cancelAnimationFrame(id);
  }

  /**
   * Batch DOM updates
   */
  batchUpdates(updates: Array<() => void>): void {
    this.requestAnimationFrame(() => {
      updates.forEach(update => update());
    });
  }

  /**
   * Check if should use canvas instead of SVG
   */
  shouldUseCanvas(nodeCount: number): boolean {
    return nodeCount > this.config.maxSvgNodes;
  }

  /**
   * Virtualize large datasets
   */
  virtualizeData<T>(
    data: T[],
    visibleRange: { start: number; end: number }
  ): T[] {
    if (!this.config.enableVirtualization) {
      return data;
    }

    const { start, end } = visibleRange;
    return data.slice(start, end);
  }

  /**
   * Calculate visible range for virtualization
   */
  calculateVisibleRange(
    totalItems: number,
    scrollTop: number,
    containerHeight: number,
    itemHeight: number,
    buffer: number = 5
  ): { start: number; end: number } {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
    const endIndex = Math.min(
      totalItems,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + buffer
    );

    return { start: startIndex, end: endIndex };
  }

  /**
   * Start performance measurement
   */
  startMeasure(id: string): void {
    if (!this.config.enablePerformanceMonitoring) return;

    performance.mark(`${id}-start`);
  }

  /**
   * End performance measurement
   */
  endMeasure(id: string, type: 'render' | 'update'): void {
    if (!this.config.enablePerformanceMonitoring) return;

    performance.mark(`${id}-end`);
    performance.measure(id, `${id}-start`, `${id}-end`);

    const measure = performance.getEntriesByName(id)[0];
    if (!measure) return;

    const existing = this.metrics.get(id) || {
      renderTime: 0,
      updateTime: 0,
      nodeCount: 0
    };

    if (type === 'render') {
      existing.renderTime = measure.duration;
    } else {
      existing.updateTime = measure.duration;
    }

    this.metrics.set(id, existing);

    // Clean up
    performance.clearMarks(`${id}-start`);
    performance.clearMarks(`${id}-end`);
    performance.clearMeasures(id);
  }

  /**
   * Record node count
   */
  recordNodeCount(id: string, count: number): void {
    if (!this.config.enablePerformanceMonitoring) return;

    const existing = this.metrics.get(id) || {
      renderTime: 0,
      updateTime: 0,
      nodeCount: 0
    };

    existing.nodeCount = count;
    this.metrics.set(id, existing);
  }

  /**
   * Get metrics for a visualization
   */
  getMetrics(id: string): PerformanceMetrics | undefined {
    return this.metrics.get(id);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, PerformanceMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Clear metrics
   */
  clearMetrics(id?: string): void {
    if (id) {
      this.metrics.delete(id);
    } else {
      this.metrics.clear();
    }
  }

  /**
   * Sample data for performance (use every nth item)
   */
  sampleData<T>(data: T[], maxSamples: number): T[] {
    if (data.length <= maxSamples) {
      return data;
    }

    const step = Math.ceil(data.length / maxSamples);
    const sampled: T[] = [];

    for (let i = 0; i < data.length; i += step) {
      sampled.push(data[i]);
    }

    return sampled;
  }

  /**
   * Aggregate data for performance
   */
  aggregateData<T>(
    data: T[],
    maxBuckets: number,
    aggregator: (bucket: T[]) => T
  ): T[] {
    if (data.length <= maxBuckets) {
      return data;
    }

    const bucketSize = Math.ceil(data.length / maxBuckets);
    const aggregated: T[] = [];

    for (let i = 0; i < data.length; i += bucketSize) {
      const bucket = data.slice(i, i + bucketSize);
      aggregated.push(aggregator(bucket));
    }

    return aggregated;
  }

  /**
   * Optimize SVG performance
   */
  optimizeSvg(svg: SVGSVGElement): void {
    // Enable GPU acceleration
    svg.style.transform = 'translateZ(0)';
    svg.style.willChange = 'transform';

    // Disable anti-aliasing for better performance
    svg.style.shapeRendering = 'crispEdges';
  }

  /**
   * Create offscreen canvas for rendering
   */
  createOffscreenCanvas(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  /**
   * Batch process array in chunks
   */
  async batchProcess<T, R>(
    items: T[],
    processor: (item: T) => R,
    chunkSize: number = 100
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);

      // Process chunk
      const chunkResults = chunk.map(processor);
      results.push(...chunkResults);

      // Yield to main thread
      if (i + chunkSize < items.length) {
        await this.yieldToMainThread();
      }
    }

    return results;
  }

  /**
   * Yield to main thread
   */
  private yieldToMainThread(): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, 0);
    });
  }

  /**
   * Check if running in production mode
   */
  isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Log performance warning
   */
  logPerformanceWarning(message: string, metrics?: any): void {
    if (!this.isProduction()) {
      console.warn(`[Performance Warning] ${message}`, metrics);
    }
  }

  /**
   * Estimate memory usage
   */
  estimateMemoryUsage(): number | undefined {
    if ('memory' in performance && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return undefined;
  }

  /**
   * Check if low memory
   */
  isLowMemory(): boolean {
    const memory = this.estimateMemoryUsage();
    if (!memory) return false;

    // Consider low memory if using more than 80% of limit
    const limit = (performance as any).memory?.jsHeapSizeLimit;
    return limit && memory > limit * 0.8;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.metrics.clear();
  }
}

/**
 * Singleton instance
 */
export const visualizationOptimizer = new VisualizationOptimizer({
  enablePerformanceMonitoring: process.env.NODE_ENV !== 'production'
});

/**
 * Decorator for measuring method performance
 */
export function Measure(target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
  const originalMethod = descriptor.value;

  descriptor.value = async function (this: any, ...args: any[]) {
    const id = `${target.constructor.name}.${propertyKey}`;
    visualizationOptimizer.startMeasure(id);

    try {
      const result = await originalMethod.apply(this, args);
      visualizationOptimizer.endMeasure(id, 'render');
      return result;
    } catch (error) {
      visualizationOptimizer.endMeasure(id, 'render');
      throw error;
    }
  };
}
