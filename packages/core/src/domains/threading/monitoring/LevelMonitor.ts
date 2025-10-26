/**
 * LevelMonitor - Monitors threading system health and trends
 *
 * Tracks coverage, consistency, implementation quality, and trends over time.
 * Provides health dashboard data and alerts for degradation.
 */

import { MaturityLevel, DetectionResult, CoverageReport } from '../types';
import { MaturityDetector } from '../detection/MaturityDetector';

export interface HealthStatus {
  overall: 'green' | 'yellow' | 'red';
  detectedLevel: MaturityLevel;
  targetLevel?: MaturityLevel;
  coverage: number;
  consistency: number;
  quality: number;
  trend: 'improving' | 'stable' | 'degrading';
  alerts: Alert[];
  timestamp: number;
}

export interface Alert {
  severity: 'info' | 'warning' | 'error';
  message: string;
  category: 'coverage' | 'consistency' | 'quality' | 'level-mismatch' | 'degradation';
  timestamp: number;
}

export interface TrendData {
  timestamp: number;
  coverage: number;
  consistency: number;
  quality: number;
  detectedLevel: MaturityLevel;
}

export interface MonitoringMetrics {
  coverageByLevel: Record<MaturityLevel, number>;
  consistencyScore: number;
  qualityScore: number;
  filesWithThreading: number;
  totalFiles: number;
  threadCount: number;
  avgThreadsPerFile: number;
}

export interface MonitorConfig {
  workspacePath: string;
  targetLevel?: MaturityLevel;
  checkInterval?: number;          // Milliseconds between checks (default: 5 minutes)
  trendHistorySize?: number;       // Number of historical data points to keep
  coverageThreshold?: number;      // Coverage below this triggers warning
  consistencyThreshold?: number;   // Consistency below this triggers warning
}

export class LevelMonitor {
  private config: MonitorConfig;
  private detector: MaturityDetector;
  private trendHistory: TrendData[] = [];
  private intervalHandle?: NodeJS.Timeout;

  constructor(config: MonitorConfig) {
    this.config = {
      checkInterval: 5 * 60 * 1000, // 5 minutes
      trendHistorySize: 100,
      coverageThreshold: 0.6,        // 60%
      consistencyThreshold: 0.7,     // 70%
      ...config
    };

    this.detector = new MaturityDetector();
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring(): void {
    if (this.intervalHandle) {
      return; // Already monitoring
    }

    // Initial check
    this.checkHealth();

    // Schedule periodic checks
    this.intervalHandle = setInterval(() => {
      this.checkHealth();
    }, this.config.checkInterval);
  }

  /**
   * Stop continuous monitoring
   */
  stopMonitoring(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = undefined;
    }
  }

  /**
   * Get current health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const detection = await this.detector.detectActualLevel(this.config.workspacePath);
    const metrics = this.calculateMetrics(detection);
    const trend = this.analyzeTrend();
    const alerts = this.generateAlerts(detection, metrics);

    const overall = this.calculateOverallHealth(metrics, alerts);

    const status: HealthStatus = {
      overall,
      detectedLevel: detection.detectedLevel,
      targetLevel: this.config.targetLevel,
      coverage: detection.coverage.overall,
      consistency: metrics.consistencyScore,
      quality: metrics.qualityScore,
      trend,
      alerts,
      timestamp: Date.now()
    };

    return status;
  }

  /**
   * Get monitoring metrics
   */
  async getMetrics(): Promise<MonitoringMetrics> {
    const detection = await this.detector.detectActualLevel(this.config.workspacePath);
    return this.calculateMetrics(detection);
  }

  /**
   * Get trend history
   */
  getTrendHistory(): TrendData[] {
    return [...this.trendHistory];
  }

  /**
   * Get health dashboard data
   */
  async getDashboardData(): Promise<{
    status: HealthStatus;
    metrics: MonitoringMetrics;
    trends: TrendData[];
    levelDistribution: Record<MaturityLevel, number>;
  }> {
    const status = await this.getHealthStatus();
    const metrics = await this.getMetrics();
    const trends = this.getTrendHistory();

    const detection = await this.detector.detectActualLevel(this.config.workspacePath);
    const levelDistribution = this.calculateLevelDistribution(detection);

    return {
      status,
      metrics,
      trends,
      levelDistribution
    };
  }

  /**
   * Check health and update trend history
   */
  private async checkHealth(): Promise<void> {
    const detection = await this.detector.detectActualLevel(this.config.workspacePath);
    const metrics = this.calculateMetrics(detection);

    // Add to trend history
    const trendData: TrendData = {
      timestamp: Date.now(),
      coverage: detection.coverage.overall,
      consistency: metrics.consistencyScore,
      quality: metrics.qualityScore,
      detectedLevel: detection.detectedLevel
    };

    this.trendHistory.push(trendData);

    // Trim history if exceeds size
    if (this.trendHistory.length > this.config.trendHistorySize!) {
      this.trendHistory.shift();
    }
  }

  /**
   * Calculate monitoring metrics
   */
  private calculateMetrics(detection: DetectionResult): MonitoringMetrics {
    const { coverage } = detection;

    // Coverage by level
    const coverageByLevel = {
      [MaturityLevel.OBSERVATION]: coverage.byLevel[MaturityLevel.OBSERVATION] || 0,
      [MaturityLevel.SEMANTIC]: coverage.byLevel[MaturityLevel.SEMANTIC] || 0,
      [MaturityLevel.ANNOTATION]: coverage.byLevel[MaturityLevel.ANNOTATION] || 0,
      [MaturityLevel.CONDITIONAL]: coverage.byLevel[MaturityLevel.CONDITIONAL] || 0,
      [MaturityLevel.DECORATOR]: coverage.byLevel[MaturityLevel.DECORATOR] || 0
    };

    // Consistency score (0-1)
    // Higher when single level dominates, lower when mixed
    const consistencyScore = this.calculateConsistencyScore(coverageByLevel);

    // Quality score (0-1)
    // Based on coverage, consistency, and level appropriateness
    const qualityScore = this.calculateQualityScore(detection, consistencyScore);

    // Thread statistics
    const threadNames = new Set<string>();
    let totalThreads = 0;

    coverage.byFile.forEach(fileCoverage => {
      const patterns = fileCoverage.patterns || [];
      patterns.forEach((p: string) => threadNames.add(p));
      totalThreads += patterns.length;
    });

    const avgThreadsPerFile = coverage.filesWithThreading > 0
      ? totalThreads / coverage.filesWithThreading
      : 0;

    return {
      coverageByLevel,
      consistencyScore,
      qualityScore,
      filesWithThreading: coverage.filesWithThreading,
      totalFiles: coverage.totalFiles,
      threadCount: threadNames.size,
      avgThreadsPerFile
    };
  }

  /**
   * Calculate consistency score
   */
  private calculateConsistencyScore(coverageByLevel: Record<MaturityLevel, number>): number {
    const values = Object.values(coverageByLevel);
    const max = Math.max(...values);
    const sum = values.reduce((a, b) => a + b, 0);

    if (sum === 0) return 0;

    // Consistency is high when one level dominates
    // Low when multiple levels have significant coverage
    return max / sum;
  }

  /**
   * Calculate quality score
   */
  private calculateQualityScore(detection: DetectionResult, consistencyScore: number): number {
    const { coverage, inconsistencies } = detection;

    // Base score from coverage
    let score = coverage.overall;

    // Bonus for consistency
    score += consistencyScore * 0.2;

    // Penalty for inconsistencies
    const inconsistencyPenalty = Math.min(inconsistencies.length * 0.05, 0.3);
    score -= inconsistencyPenalty;

    // Clamp to 0-1
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Analyze trend (improving/stable/degrading)
   */
  private analyzeTrend(): 'improving' | 'stable' | 'degrading' {
    if (this.trendHistory.length < 3) {
      return 'stable'; // Not enough data
    }

    // Compare recent 5 points to previous 5 points
    const recentCount = Math.min(5, Math.floor(this.trendHistory.length / 2));
    const recent = this.trendHistory.slice(-recentCount);
    const previous = this.trendHistory.slice(-recentCount * 2, -recentCount);

    if (previous.length === 0) return 'stable';

    // Average coverage and quality
    const recentAvg = {
      coverage: recent.reduce((sum, d) => sum + d.coverage, 0) / recent.length,
      quality: recent.reduce((sum, d) => sum + d.quality, 0) / recent.length
    };

    const previousAvg = {
      coverage: previous.reduce((sum, d) => sum + d.coverage, 0) / previous.length,
      quality: previous.reduce((sum, d) => sum + d.quality, 0) / previous.length
    };

    // Calculate change
    const coverageChange = recentAvg.coverage - previousAvg.coverage;
    const qualityChange = recentAvg.quality - previousAvg.quality;
    const totalChange = coverageChange + qualityChange;

    // Thresholds
    const improvingThreshold = 0.05; // 5% improvement
    const degradingThreshold = -0.05; // 5% degradation

    if (totalChange >= improvingThreshold) {
      return 'improving';
    } else if (totalChange <= degradingThreshold) {
      return 'degrading';
    } else {
      return 'stable';
    }
  }

  /**
   * Generate alerts based on current state
   */
  private generateAlerts(detection: DetectionResult, metrics: MonitoringMetrics): Alert[] {
    const alerts: Alert[] = [];
    const timestamp = Date.now();

    // Coverage alerts
    if (detection.coverage.overall < this.config.coverageThreshold!) {
      alerts.push({
        severity: 'warning',
        message: `Coverage (${Math.round(detection.coverage.overall * 100)}%) below threshold (${this.config.coverageThreshold! * 100}%)`,
        category: 'coverage',
        timestamp
      });
    }

    // Consistency alerts
    if (metrics.consistencyScore < this.config.consistencyThreshold!) {
      alerts.push({
        severity: 'warning',
        message: `Consistency (${Math.round(metrics.consistencyScore * 100)}%) below threshold (${this.config.consistencyThreshold! * 100}%)`,
        category: 'consistency',
        timestamp
      });
    }

    // Level mismatch alerts
    if (this.config.targetLevel !== undefined && detection.detectedLevel !== this.config.targetLevel) {
      const severity = Math.abs(detection.detectedLevel - this.config.targetLevel) >= 2 ? 'error' : 'warning';
      alerts.push({
        severity,
        message: `Detected level (L${detection.detectedLevel}) does not match target (L${this.config.targetLevel})`,
        category: 'level-mismatch',
        timestamp
      });
    }

    // Inconsistency alerts
    if (detection.inconsistencies.length > 10) {
      alerts.push({
        severity: 'warning',
        message: `${detection.inconsistencies.length} inconsistencies detected`,
        category: 'consistency',
        timestamp
      });
    }

    // Quality alerts
    if (metrics.qualityScore < 0.5) {
      alerts.push({
        severity: 'error',
        message: `Low quality score: ${Math.round(metrics.qualityScore * 100)}%`,
        category: 'quality',
        timestamp
      });
    }

    // Trend alerts
    const trend = this.analyzeTrend();
    if (trend === 'degrading') {
      alerts.push({
        severity: 'warning',
        message: 'Threading system quality is degrading',
        category: 'degradation',
        timestamp
      });
    }

    return alerts;
  }

  /**
   * Calculate overall health status
   */
  private calculateOverallHealth(metrics: MonitoringMetrics, alerts: Alert[]): 'green' | 'yellow' | 'red' {
    // Red if any error alerts
    if (alerts.some(a => a.severity === 'error')) {
      return 'red';
    }

    // Red if very low quality
    if (metrics.qualityScore < 0.3) {
      return 'red';
    }

    // Yellow if warnings or low quality
    if (alerts.some(a => a.severity === 'warning') || metrics.qualityScore < 0.6) {
      return 'yellow';
    }

    // Green otherwise
    return 'green';
  }

  /**
   * Calculate level distribution
   */
  private calculateLevelDistribution(detection: DetectionResult): Record<MaturityLevel, number> {
    const distribution: Record<MaturityLevel, number> = {
      [MaturityLevel.OBSERVATION]: 0,
      [MaturityLevel.SEMANTIC]: 0,
      [MaturityLevel.ANNOTATION]: 0,
      [MaturityLevel.CONDITIONAL]: 0,
      [MaturityLevel.DECORATOR]: 0
    };

    // Count files by highest level detected
    detection.coverage.byFile.forEach(fileCoverage => {
      const level = fileCoverage.level;
      if (level !== undefined) {
        distribution[level]++;
      }
    });

    return distribution;
  }

  /**
   * Export dashboard HTML
   */
  renderDashboardHTML(): string {
    return `
      <div class="threading-health-dashboard">
        <div class="health-overview">
          <!-- Overall health indicator -->
          <div class="health-status">
            <div class="status-badge" data-status="green|yellow|red">
              <span class="status-icon">●</span>
              <span class="status-text">System Health</span>
            </div>
          </div>

          <!-- Key metrics -->
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-value" id="coverage-value">--</div>
              <div class="metric-label">Coverage</div>
            </div>
            <div class="metric-card">
              <div class="metric-value" id="consistency-value">--</div>
              <div class="metric-label">Consistency</div>
            </div>
            <div class="metric-card">
              <div class="metric-value" id="quality-value">--</div>
              <div class="metric-label">Quality</div>
            </div>
            <div class="metric-card">
              <div class="metric-value" id="trend-value">--</div>
              <div class="metric-label">Trend</div>
            </div>
          </div>
        </div>

        <!-- Level distribution chart -->
        <div class="level-distribution">
          <h3>Level Distribution</h3>
          <div class="distribution-chart" id="distribution-chart"></div>
        </div>

        <!-- Coverage timeline -->
        <div class="coverage-timeline">
          <h3>Coverage Timeline</h3>
          <div class="timeline-chart" id="timeline-chart"></div>
        </div>

        <!-- Alerts -->
        <div class="alerts-section">
          <h3>Alerts</h3>
          <div class="alerts-list" id="alerts-list">
            <!-- Alerts populated dynamically -->
          </div>
        </div>
      </div>
    `;
  }
}
