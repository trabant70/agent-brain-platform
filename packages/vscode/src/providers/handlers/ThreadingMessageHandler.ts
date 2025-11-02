/**
 * ThreadingMessageHandler
 *
 * Handles all threading:* messages between webview and extension.
 *
 * Purpose:
 * - Connect Threading tab UI to backend threading system
 * - Manage threading configuration and state
 * - Coordinate session management
 * - Trigger analysis and provide timeline data
 *
 * Message Types Handled:
 * - threading:get-state - Get current threading configuration state
 * - threading:toggle - Enable/disable threading monitoring
 * - threading:set-target-level - Set maturity target level
 * - threading:start-session - Start a new threading session
 * - threading:end-session - End the current session
 * - threading:analyze - Analyze recent execution logs
 * - threading:get-timeline-data - Get timeline events for visualization
 * - threading:start-upgrade - Start level upgrade process
 * - threading:view-guide - View level guide documentation
 * - threading:apply-recommendation - Apply migration recommendation
 */

import * as vscode from 'vscode';
import type { WebviewMessage } from '@agent-brain/core/domains/visualization/types';
import {
  getGlobalDataCorrectnessConfig,
  setGlobalDataCorrectnessConfig,
  DataCorrectnessConfig,
  DEVELOPMENT_CONFIG,
  PRODUCTION_CONFIG,
  TESTING_CONFIG,
  DISABLED_CONFIG
} from '@agent-brain/core/domains/threading/config/DataCorrectnessConfig';
import { ExecutionTrace } from '@agent-brain/core/domains/threading/types';
import { ThreadLogger } from '@agent-brain/core/domains/threading/logging/ThreadLogger';
import type { MessageHandler } from '../services/MessageRouter';
import { JsonlFileWriter } from '../../services/threading/JsonlFileWriter';

export interface ThreadingViewState {
  enabled: boolean;
  mode: 'disabled' | 'development' | 'debugging' | 'learning';
  activeThreads: string[];
  sessionActive: boolean;
  multiTierEnabled: boolean;
  detectedLevel: number;
  targetLevel: number;
  showLevelSelector: boolean;
}

export interface TimelineEvent {
  id: string;
  type: 'entry' | 'exit' | 'transformation' | 'mutation' | 'violation';
  timestamp: number;
  context: string;
  thread: string;
  duration?: number;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  data?: any;
}

export interface AnalysisReport {
  patterns: any[];
  insights: any[];
  recommendations: any[];
  bottlenecks: any[];
  summary: string;
}

export class ThreadingMessageHandler implements MessageHandler {
  private config: DataCorrectnessConfig;
  private currentSessionId: string | null = null;
  private executionTraces: ExecutionTrace[] = [];
  private workspacePath: string | undefined;
  private view: vscode.WebviewView;
  private threadLogger: ThreadLogger | null = null;
  private fileWriter: JsonlFileWriter | null = null;

  constructor(config: { view: vscode.WebviewView; workspacePath?: string }) {
    this.view = config.view;
    this.config = getGlobalDataCorrectnessConfig();
    this.workspacePath = config.workspacePath;

    // Initialize ThreadLogger with file writer if workspace path available
    if (this.workspacePath) {
      this.initializeThreadLogger();
    }
  }

  /**
   * Initialize ThreadLogger with JSONL file writer
   */
  private initializeThreadLogger(): void {
    if (!this.workspacePath) {
      return;
    }

    try {
      // Create JSONL file writer
      this.fileWriter = new JsonlFileWriter({
        workspacePath: this.workspacePath,
        bufferSize: 100,
        flushIntervalMs: 5000,
        maxFileSizeMb: 100
      });

      // Create and configure ThreadLogger
      this.threadLogger = new ThreadLogger(this.fileWriter);

      console.log('[ThreadingMessageHandler] ThreadLogger initialized with JSONL file writer');
    } catch (error) {
      console.error('[ThreadingMessageHandler] Failed to initialize ThreadLogger:', error);
    }
  }

  /**
   * Handle threading:* messages (MessageHandler interface)
   */
  async handleMessage(message: WebviewMessage): Promise<boolean> {
    // Only handle threading:* messages
    if (!message.type || !message.type.startsWith('threading:')) {
      return false;
    }

    const response = await this.handleThreadingMessage(message);

    if (response) {
      this.view.webview.postMessage(response);
    }

    return true;
  }

  /**
   * Handle threading:* messages and return response
   */
  private async handleThreadingMessage(message: WebviewMessage): Promise<any> {
    switch (message.type) {
      // State management
      case 'threading:get-state':
        return this.getState();

      case 'threading:toggle':
        return this.toggleThreading(message.payload.enable);

      case 'threading:set-target-level':
        return this.setTargetLevel(message.payload.level);

      // Session management
      case 'threading:start-session':
        return this.startSession();

      case 'threading:end-session':
        return this.endSession();

      // Analysis
      case 'threading:analyze':
        return this.analyzeRecentLogs();

      case 'threading:get-timeline-data':
        return this.getTimelineData();

      // Multi-tier system
      case 'threading:start-upgrade':
        return this.startUpgrade(message.payload.targetLevel);

      case 'threading:view-guide':
        return this.viewGuide(message.payload.level);

      case 'threading:apply-recommendation':
        return this.applyRecommendation(message.payload.recommendationId);

      default:
        console.warn(`[ThreadingMessageHandler] Unknown message type: ${message.type}`);
        return null;
    }
  }

  /**
   * Get current threading state
   */
  private getState(): any {
    const state: ThreadingViewState = {
      enabled: this.config.enabled,
      mode: this.getModeFromConfig(),
      activeThreads: this.getActiveThreads(),
      sessionActive: this.currentSessionId !== null,
      multiTierEnabled: true,
      detectedLevel: 0, // TODO: Implement maturity detection
      targetLevel: 2,
      showLevelSelector: false
    };

    return {
      type: 'threading:state',
      payload: state
    };
  }

  /**
   * Toggle threading on/off
   */
  private toggleThreading(enable: boolean): any {
    if (enable) {
      // Enable with development config for maximum features
      setGlobalDataCorrectnessConfig(DEVELOPMENT_CONFIG);
      console.log('[ThreadingMessageHandler] Threading enabled with development config');
    } else {
      // Disable threading completely
      setGlobalDataCorrectnessConfig(DISABLED_CONFIG);
      console.log('[ThreadingMessageHandler] Threading disabled');
    }

    this.config = getGlobalDataCorrectnessConfig();

    return {
      type: 'threading:state',
      payload: {
        enabled: this.config.enabled,
        mode: this.getModeFromConfig(),
        activeThreads: this.getActiveThreads(),
        sessionActive: this.currentSessionId !== null,
        multiTierEnabled: true,
        detectedLevel: 0,
        targetLevel: 2,
        showLevelSelector: false
      }
    };
  }

  /**
   * Set target maturity level
   */
  private setTargetLevel(level: number): any {
    // TODO: Store target level in workspace state
    console.log(`[ThreadingMessageHandler] Setting target level to ${level}`);

    return {
      type: 'threading:level-changed',
      payload: { from: 0, to: level }
    };
  }

  /**
   * Start a new threading session
   */
  private startSession(): any {
    this.currentSessionId = `session-${Date.now()}`;
    this.executionTraces = [];

    // Start session in ThreadLogger
    if (this.threadLogger) {
      this.threadLogger.startSession({
        id: this.currentSessionId,
        name: `Session ${new Date().toLocaleString()}`,
        startTime: Date.now(),
        endTime: 0,
        traceCount: 0
      });
    }

    console.log(`[ThreadingMessageHandler] Session started: ${this.currentSessionId}`);

    return {
      type: 'threading:session-started',
      payload: { sessionId: this.currentSessionId }
    };
  }

  /**
   * End the current session
   */
  private async endSession(): Promise<any> {
    if (this.currentSessionId) {
      console.log(`[ThreadingMessageHandler] Session ended: ${this.currentSessionId} (${this.executionTraces.length} traces collected)`);

      // End session in ThreadLogger
      if (this.threadLogger) {
        await this.threadLogger.endSession();
      }

      this.currentSessionId = null;
    }

    return {
      type: 'threading:session-ended',
      payload: {}
    };
  }

  /**
   * Analyze recent execution logs
   */
  private analyzeRecentLogs(): any {
    const traces = this.getRecentTraces(100);

    console.log(`[ThreadingMessageHandler] Analyzing ${traces.length} execution traces`);

    // Generate analysis report
    const report: AnalysisReport = this.generateAnalysisReport(traces);

    return {
      type: 'threading:analysis-data',
      payload: report
    };
  }

  /**
   * Generate analysis report from execution traces
   */
  private generateAnalysisReport(traces: ExecutionTrace[]): AnalysisReport {
    if (traces.length === 0) {
      return {
        patterns: [],
        insights: [],
        recommendations: [],
        bottlenecks: [],
        summary: 'No execution traces recorded yet. Enable threading and execute some code to see analysis.'
      };
    }

    // Analyze violations
    const allViolations = traces.flatMap(t => t.violations);
    const violationsByFunction = new Map<string, number>();

    traces.forEach(trace => {
      if (trace.violations.length > 0) {
        const count = violationsByFunction.get(trace.context) || 0;
        violationsByFunction.set(trace.context, count + trace.violations.length);
      }
    });

    // Detect patterns
    const patterns: any[] = [];
    violationsByFunction.forEach((count, functionName) => {
      if (count >= 3) {
        patterns.push({
          type: 'repeated-violation',
          name: 'Repeated Contract Violations',
          description: `Function "${functionName}" has ${count} contract violations`,
          impact: count >= 10 ? 'critical' : count >= 5 ? 'high' : 'medium',
          confidence: 0.95,
          affectedFunctions: [functionName],
          evidence: {
            violationCount: count,
            recommendation: `Review the contract for ${functionName} and ensure all inputs/outputs meet requirements`
          }
        });
      }
    });

    // Analyze performance
    const performanceTraces = traces.filter(t => t.exit && t.exit.duration > 0);
    const avgDuration = performanceTraces.length > 0
      ? performanceTraces.reduce((sum, t) => sum + (t.exit?.duration || 0), 0) / performanceTraces.length
      : 0;

    const slowTraces = performanceTraces.filter(t => (t.exit?.duration || 0) > avgDuration * 2);

    if (slowTraces.length > 0) {
      const bottleneck = slowTraces.sort((a, b) => (b.exit?.duration || 0) - (a.exit?.duration || 0))[0];
      patterns.push({
        type: 'performance-bottleneck',
        name: 'Performance Bottleneck Detected',
        description: `Function "${bottleneck.context}" is significantly slower than average`,
        impact: 'high',
        confidence: 0.85,
        affectedFunctions: [bottleneck.context],
        evidence: {
          duration: bottleneck.exit?.duration,
          avgDuration: avgDuration,
          recommendation: `Profile ${bottleneck.context} to identify optimization opportunities`
        }
      });
    }

    // Generate insights
    const insights: any[] = [];

    if (allViolations.length > 0) {
      const criticalCount = allViolations.filter(v => v.severity === 'critical').length;
      const errorCount = allViolations.filter(v => v.severity === 'error').length;

      if (criticalCount > 0 || errorCount > 0) {
        insights.push({
          title: 'Contract Validation Issues',
          description: `Found ${criticalCount} critical and ${errorCount} error-level contract violations`,
          severity: criticalCount > 0 ? 'critical' : 'error',
          category: 'error',
          rootCause: 'Input/output data does not match defined contracts',
          relatedPatterns: patterns.filter(p => p.type === 'repeated-violation').map(p => p.name)
        });
      }
    }

    if (avgDuration > 100) {
      insights.push({
        title: 'Performance Impact',
        description: `Average function execution time is ${avgDuration.toFixed(1)}ms`,
        severity: avgDuration > 500 ? 'warning' : 'info',
        category: 'performance',
        rootCause: 'Contract validation and tracking add overhead',
        relatedPatterns: patterns.filter(p => p.type === 'performance-bottleneck').map(p => p.name)
      });
    }

    // Generate recommendations
    const recommendations: any[] = [];

    if (allViolations.length > 5) {
      recommendations.push({
        title: 'Review and Fix Contract Violations',
        description: `You have ${allViolations.length} contract violations. Review the contracts and ensure your code meets the specifications.`,
        priority: allViolations.some(v => v.severity === 'critical') ? 'urgent' : 'high',
        effort: 'medium',
        steps: [
          'Open the Threading tab and review violations',
          'For each violation, understand the expected vs actual values',
          'Update your code to meet the contract requirements',
          'Re-run tests to verify fixes'
        ]
      });
    }

    if (this.config.validation.failOnViolations === false) {
      recommendations.push({
        title: 'Enable Strict Validation for Testing',
        description: 'Consider enabling failOnViolations in your configuration to catch contract violations early.',
        priority: 'medium',
        effort: 'low',
        steps: [
          'Update threading configuration',
          'Set validation.failOnViolations to true',
          'Set validation.failOnSeverity to "error" or "warning"',
          'Run tests to catch violations'
        ]
      });
    }

    // Calculate bottlenecks
    const bottlenecks = performanceTraces
      .sort((a, b) => (b.exit?.duration || 0) - (a.exit?.duration || 0))
      .slice(0, 10)
      .map(trace => ({
        function: trace.context,
        avg: trace.exit?.duration || 0,
        max: trace.exit?.duration || 0,
        calls: 1
      }));

    return {
      patterns,
      insights,
      recommendations,
      bottlenecks,
      summary: this.generateSummary(traces, patterns, insights)
    };
  }

  /**
   * Generate summary text for analysis
   */
  private generateSummary(traces: ExecutionTrace[], patterns: any[], insights: any[]): string {
    const parts: string[] = [];

    parts.push(`Analyzed ${traces.length} execution trace(s)`);

    const allViolations = traces.flatMap(t => t.violations);
    if (allViolations.length > 0) {
      parts.push(`Found ${allViolations.length} contract violation(s)`);
    }

    if (patterns.length > 0) {
      parts.push(`Detected ${patterns.length} pattern(s)`);
    }

    if (insights.length > 0) {
      parts.push(`Generated ${insights.length} insight(s)`);
    }

    return parts.join('. ') + '.';
  }

  /**
   * Get timeline data for visualization
   */
  private getTimelineData(): any {
    const traces = this.getRecentTraces(50);

    console.log(`[ThreadingMessageHandler] Generating timeline data from ${traces.length} traces`);

    // Transform traces into timeline events
    const events: TimelineEvent[] = [];

    traces.forEach(trace => {
      // Entry event
      events.push({
        id: `${trace.context}-entry-${trace.entry.timestamp}`,
        type: 'entry',
        timestamp: trace.entry.timestamp,
        context: trace.context,
        thread: 'DATA_FLOW',
        duration: 0,
        data: {
          args: trace.entry.args.map(arg => ({
            type: arg.type.primitive,
            preview: arg.preview
          }))
        }
      });

      // Transformation events
      trace.transformations.forEach((t, i) => {
        events.push({
          id: `${trace.context}-transform-${i}-${t.timestamp}`,
          type: 'transformation',
          timestamp: t.timestamp,
          context: trace.context,
          thread: 'DATA_FLOW',
          duration: 0,
          data: {
            from: t.from,
            to: t.to,
            beforePreview: t.beforeValue.preview,
            afterPreview: t.afterValue.preview
          }
        });
      });

      // Mutation events
      trace.mutations.forEach((m, i) => {
        events.push({
          id: `${trace.context}-mutation-${i}-${m.timestamp}`,
          type: 'mutation',
          timestamp: m.timestamp,
          context: trace.context,
          thread: 'DATA_FLOW',
          duration: 0,
          data: {
            path: m.path,
            mutationType: m.mutationType,
            beforePreview: m.beforeValue.preview,
            afterPreview: m.afterValue.preview
          }
        });
      });

      // Violation events
      trace.violations.forEach((v, i) => {
        events.push({
          id: `${trace.context}-violation-${i}-${trace.entry.timestamp}`,
          type: 'violation',
          timestamp: trace.entry.timestamp, // Violations don't have timestamp, use entry time
          context: trace.context,
          thread: 'VALIDATION',
          duration: 0,
          severity: v.severity,
          data: {
            type: v.type,
            message: v.message,
            path: v.path,
            expected: v.expected,
            actual: v.actual
          }
        });
      });

      // Exit event
      if (trace.exit) {
        events.push({
          id: `${trace.context}-exit-${trace.exit.timestamp}`,
          type: 'exit',
          timestamp: trace.exit.timestamp,
          context: trace.context,
          thread: 'DATA_FLOW',
          duration: trace.exit.duration,
          data: {
            resultType: trace.exit.result.type.primitive,
            resultPreview: trace.exit.result.preview
          }
        });
      }
    });

    return {
      type: 'threading:timeline-data',
      payload: { events }
    };
  }

  /**
   * Get recent execution traces
   */
  private getRecentTraces(limit: number): ExecutionTrace[] {
    // For now, return the in-memory traces from current session
    // In the future, this would read from JSONL log files
    return this.executionTraces.slice(-limit);
  }

  /**
   * Start level upgrade process
   */
  private startUpgrade(targetLevel: number): any {
    // TODO: Implement upgrade wizard
    console.log(`[ThreadingMessageHandler] Starting upgrade to level ${targetLevel}`);
    return { success: true };
  }

  /**
   * View level guide
   */
  private viewGuide(level: number | undefined): any {
    // TODO: Open markdown guide in editor
    console.log(`[ThreadingMessageHandler] Viewing guide for level ${level}`);
    return { success: true };
  }

  /**
   * Apply migration recommendation
   */
  private applyRecommendation(recId: string): any {
    // TODO: Apply code transformation
    console.log(`[ThreadingMessageHandler] Applying recommendation ${recId}`);
    return { success: true };
  }

  /**
   * Get mode from config
   */
  private getModeFromConfig(): 'disabled' | 'development' | 'debugging' | 'learning' {
    if (!this.config.enabled) {
      return 'disabled';
    }

    if (this.config === TESTING_CONFIG) {
      return 'debugging';
    }

    if (this.config === DEVELOPMENT_CONFIG) {
      return 'development';
    }

    return 'development';
  }

  /**
   * Get active threads
   */
  private getActiveThreads(): string[] {
    // TODO: Get from actual thread registry
    // For now, return common thread names
    if (!this.config.enabled) {
      return [];
    }

    return ['DATA_FLOW', 'VALIDATION'];
  }

  /**
   * Add execution trace (called by ThreadLogger or decorators)
   */
  async addExecutionTrace(trace: ExecutionTrace): Promise<void> {
    if (this.currentSessionId) {
      this.executionTraces.push(trace);

      // Log to JSONL file
      if (this.threadLogger) {
        try {
          await this.threadLogger.log(trace);
        } catch (error) {
          console.error('[ThreadingMessageHandler] Failed to log trace:', error);
        }
      }

      // Limit memory usage - keep only last 1000 traces
      if (this.executionTraces.length > 1000) {
        this.executionTraces = this.executionTraces.slice(-1000);
      }
    }
  }

  /**
   * Dispose and cleanup resources
   */
  async dispose(): Promise<void> {
    console.log('[ThreadingMessageHandler] Disposing resources');

    // End any active session
    if (this.currentSessionId) {
      await this.endSession();
    }

    // Close file writer
    if (this.fileWriter) {
      try {
        await this.fileWriter.close();
        this.fileWriter = null;
      } catch (error) {
        console.error('[ThreadingMessageHandler] Failed to close file writer:', error);
      }
    }

    this.threadLogger = null;
  }

  /**
   * Get workspace path
   */
  getWorkspacePath(): string | undefined {
    return this.workspacePath;
  }

  /**
   * Set workspace path
   */
  setWorkspacePath(path: string | undefined): void {
    this.workspacePath = path;
  }
}
