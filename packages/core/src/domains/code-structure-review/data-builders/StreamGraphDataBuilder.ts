/**
 * Stream Graph Data Builder
 * Transforms time-series data into stream graph format
 *
 * Input: Historical data with categories over time
 * Output: Time series with stacked values by category
 */

import { StreamGraphData, StreamDataPoint, StreamLayer } from '../../visualization/webview/visualizations/StreamGraph';

export interface TimeSeriesPoint {
  timestamp: Date | string;
  category: string;
  value: number;
}

export class StreamGraphDataBuilder {
  /**
   * Build from time series data
   */
  static buildFromTimeSeries(points: TimeSeriesPoint[]): StreamGraphData {
    if (points.length === 0) {
      return this.buildSampleData();
    }

    // Group by timestamp
    const timeMap = new Map<string, Record<string, number>>();
    const categories = new Set<string>();

    points.forEach(point => {
      const timeKey = typeof point.timestamp === 'string'
        ? point.timestamp
        : point.timestamp.toISOString();

      if (!timeMap.has(timeKey)) {
        timeMap.set(timeKey, {});
      }

      const values = timeMap.get(timeKey)!;
      values[point.category] = (values[point.category] || 0) + point.value;
      categories.add(point.category);
    });

    // Convert to data points
    const data: StreamDataPoint[] = Array.from(timeMap.entries())
      .map(([timestamp, values]) => ({
        timestamp,
        values
      }))
      .sort((a, b) => {
        const dateA = typeof a.timestamp === 'string' ? new Date(a.timestamp) : a.timestamp;
        const dateB = typeof b.timestamp === 'string' ? new Date(b.timestamp) : b.timestamp;
        return dateA.getTime() - dateB.getTime();
      });

    // Create layers
    const layers: StreamLayer[] = Array.from(categories).map(cat => ({
      key: cat,
      label: this.formatLabel(cat)
    }));

    return { data, layers };
  }

  /**
   * Build from analysis history
   */
  static buildFromAnalysisHistory(analyses: any[]): StreamGraphData {
    if (!analyses || analyses.length === 0) {
      return this.buildSampleData();
    }

    const data: StreamDataPoint[] = [];
    const categoryKeys = new Set<string>();

    analyses.forEach(analysis => {
      const timestamp = analysis.timestamp || analysis.date;
      const values: Record<string, number> = {};

      // Extract category issue counts
      if (analysis.categories) {
        analysis.categories.forEach((cat: any) => {
          const key = cat.categoryId || cat.id;
          const count = cat.issues?.length || 0;
          values[key] = count;
          categoryKeys.add(key);
        });
      }

      data.push({ timestamp, values });
    });

    // Sort by timestamp
    data.sort((a, b) => {
      const dateA = typeof a.timestamp === 'string' ? new Date(a.timestamp) : a.timestamp;
      const dateB = typeof b.timestamp === 'string' ? new Date(b.timestamp) : b.timestamp;
      return dateA.getTime() - dateB.getTime();
    });

    // Create layers
    const layers: StreamLayer[] = Array.from(categoryKeys).map(key => ({
      key,
      label: this.formatLabel(key)
    }));

    return { data, layers };
  }

  /**
   * Build sample data for demonstration
   */
  static buildSampleData(): StreamGraphData {
    const startDate = new Date('2024-01-01');
    const data: StreamDataPoint[] = [];

    // Generate 30 days of data
    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      // Simulate varying issue counts with trends
      const t = i / 30;
      data.push({
        timestamp: date,
        values: {
          'security': Math.floor(15 + 10 * Math.sin(t * Math.PI * 2) + Math.random() * 5),
          'performance': Math.floor(20 + 8 * Math.cos(t * Math.PI * 2) + Math.random() * 6),
          'bugs': Math.floor(25 + 12 * Math.sin(t * Math.PI * 3) + Math.random() * 8),
          'code-quality': Math.floor(18 + 7 * Math.cos(t * Math.PI * 1.5) + Math.random() * 5),
          'documentation': Math.floor(10 + 5 * Math.sin(t * Math.PI * 4) + Math.random() * 3),
          'accessibility': Math.floor(8 + 4 * Math.cos(t * Math.PI * 2.5) + Math.random() * 3)
        }
      });
    }

    const layers: StreamLayer[] = [
      { key: 'security', label: 'Security Issues', color: '#ef4444' },
      { key: 'performance', label: 'Performance Issues', color: '#f59e0b' },
      { key: 'bugs', label: 'Bugs', color: '#ec4899' },
      { key: 'code-quality', label: 'Code Quality', color: '#8b5cf6' },
      { key: 'documentation', label: 'Documentation', color: '#3b82f6' },
      { key: 'accessibility', label: 'Accessibility', color: '#10b981' }
    ];

    return { data, layers };
  }

  /**
   * Aggregate data by time period
   */
  static aggregateByPeriod(
    data: StreamGraphData,
    period: 'day' | 'week' | 'month'
  ): StreamGraphData {
    const aggregated = new Map<string, Record<string, number>>();

    data.data.forEach(point => {
      const date = typeof point.timestamp === 'string'
        ? new Date(point.timestamp)
        : point.timestamp;

      let key: string;
      switch (period) {
        case 'week':
          // Get week number
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
          break;
        case 'day':
        default:
          key = date.toISOString().split('T')[0];
          break;
      }

      if (!aggregated.has(key)) {
        aggregated.set(key, {});
      }

      const values = aggregated.get(key)!;
      Object.entries(point.values).forEach(([cat, val]) => {
        values[cat] = (values[cat] || 0) + val;
      });
    });

    const aggregatedData: StreamDataPoint[] = Array.from(aggregated.entries())
      .map(([timestamp, values]) => ({ timestamp, values }))
      .sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return dateA.getTime() - dateB.getTime();
      });

    return {
      data: aggregatedData,
      layers: data.layers
    };
  }

  /**
   * Get trend for a specific layer
   */
  static getTrend(data: StreamGraphData, layerKey: string): {
    direction: 'increasing' | 'decreasing' | 'stable';
    change: number;
    average: number;
  } {
    const values = data.data
      .map(d => d.values[layerKey] || 0)
      .filter(v => v > 0);

    if (values.length < 2) {
      return { direction: 'stable', change: 0, average: 0 };
    }

    const average = values.reduce((sum, v) => sum + v, 0) / values.length;
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;

    const change = ((secondAvg - firstAvg) / firstAvg) * 100;

    let direction: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(change) < 5) {
      direction = 'stable';
    } else if (change > 0) {
      direction = 'increasing';
    } else {
      direction = 'decreasing';
    }

    return { direction, change, average };
  }

  /**
   * Get peak values for each layer
   */
  static getPeaks(data: StreamGraphData): Map<string, {
    timestamp: Date | string;
    value: number;
  }> {
    const peaks = new Map<string, { timestamp: Date | string; value: number }>();

    data.layers.forEach(layer => {
      let maxValue = -Infinity;
      let maxTimestamp: Date | string = data.data[0]?.timestamp || new Date();

      data.data.forEach(point => {
        const value = point.values[layer.key] || 0;
        if (value > maxValue) {
          maxValue = value;
          maxTimestamp = point.timestamp;
        }
      });

      peaks.set(layer.key, { timestamp: maxTimestamp, value: maxValue });
    });

    return peaks;
  }

  /**
   * Calculate layer volatility (standard deviation)
   */
  static getVolatility(data: StreamGraphData, layerKey: string): number {
    const values = data.data.map(d => d.values[layerKey] || 0);

    if (values.length === 0) return 0;

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;

    return Math.sqrt(variance);
  }

  /**
   * Format label from key
   */
  private static formatLabel(key: string): string {
    return key
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Fill missing timestamps with zeros
   */
  static fillGaps(data: StreamGraphData, period: 'day' | 'hour' = 'day'): StreamGraphData {
    if (data.data.length < 2) return data;

    const filled: StreamDataPoint[] = [];
    const sorted = [...data.data].sort((a, b) => {
      const dateA = typeof a.timestamp === 'string' ? new Date(a.timestamp) : a.timestamp;
      const dateB = typeof b.timestamp === 'string' ? new Date(b.timestamp) : b.timestamp;
      return dateA.getTime() - dateB.getTime();
    });

    const startDate = typeof sorted[0].timestamp === 'string'
      ? new Date(sorted[0].timestamp)
      : sorted[0].timestamp;
    const endDate = typeof sorted[sorted.length - 1].timestamp === 'string'
      ? new Date(sorted[sorted.length - 1].timestamp)
      : sorted[sorted.length - 1].timestamp;

    const dataMap = new Map(
      sorted.map(d => [
        (typeof d.timestamp === 'string' ? new Date(d.timestamp) : d.timestamp).toISOString(),
        d.values
      ])
    );

    let current = new Date(startDate);
    const increment = period === 'day' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;

    while (current <= endDate) {
      const key = current.toISOString();
      const values = dataMap.get(key);

      if (values) {
        filled.push({ timestamp: new Date(current), values });
      } else {
        // Fill with zeros
        const zeroValues: Record<string, number> = {};
        data.layers.forEach(layer => {
          zeroValues[layer.key] = 0;
        });
        filled.push({ timestamp: new Date(current), values: zeroValues });
      }

      current = new Date(current.getTime() + increment);
    }

    return { data: filled, layers: data.layers };
  }
}
