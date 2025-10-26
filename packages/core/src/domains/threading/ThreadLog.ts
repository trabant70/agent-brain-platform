/**
 * ThreadLog - Runtime Tracking and Delta Detection
 *
 * Captures actual function execution behavior and compares against ThreadSpec expectations.
 * Detects deviations and logs them for analysis.
 */

import {
  LogEntry,
  EntryLogEntry,
  ExitLogEntry,
  DeltaLogEntry,
  ErrorLogEntry,
  IOShape,
  ThreadSpecOptions
} from './types';
import { getThreadSpec } from './decorators/ThreadSpec';
import { getGlobalThreadConfig } from './ThreadConfig';

/**
 * Active execution tracking
 */
interface ActiveExecution {
  context: string;
  threads: string[];
  startTime: number;
  startMemory?: number;
  args: any[];
  spec?: ThreadSpecOptions;
}

/**
 * ThreadLog - Runtime tracker
 */
export class ThreadLog {
  private activeExecutions = new Map<string, ActiveExecution>();
  private logBuffer: LogEntry[] = [];
  private flushCallbacks: Array<(entries: LogEntry[]) => void> = [];
  private flushTimer?: NodeJS.Timeout;

  constructor() {
    const config = getGlobalThreadConfig();
    const loggingConfig = config.getLoggingConfig();

    if (loggingConfig.buffer.enabled) {
      this.startFlushTimer(loggingConfig.buffer.flushInterval);
    }
  }

  /**
   * Log function entry
   */
  enter(
    context: string,
    args: any[],
    threads?: string[]
  ): string | null {
    const config = getGlobalThreadConfig();

    if (!config.isEnabled()) {
      return null;
    }

    // Get spec for this context
    const spec = getThreadSpec(context);

    // Determine threads
    const contextThreads = threads || spec?.threads || [];

    // Check if any active thread matches
    const activeThreads = config.getActiveThreads();
    const relevantThreads = contextThreads.filter(t => activeThreads.includes(t));

    if (relevantThreads.length === 0) {
      return null;  // No active threads for this context
    }

    // Sampling check
    const shouldSample = relevantThreads.some(t => config.shouldSample(t));
    if (!shouldSample) {
      return null;
    }

    // Generate execution ID
    const execId = `${context}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Track active execution
    const execution: ActiveExecution = {
      context,
      threads: relevantThreads,
      startTime: Date.now(),
      startMemory: this.getMemoryUsage(),
      args,
      spec
    };

    this.activeExecutions.set(execId, execution);

    // Log entry
    const entry: EntryLogEntry = {
      type: 'entry',
      context,
      threads: relevantThreads,
      timestamp: execution.startTime,
      args: this.captureIOShapes(args),
      expectations: spec
    };

    this.log(entry);

    return execId;
  }

  /**
   * Log function exit
   */
  exit(
    execId: string | null,
    result: any,
    error?: Error
  ): void {
    if (!execId) {
      return;  // Wasn't tracking this execution
    }

    const execution = this.activeExecutions.get(execId);
    if (!execution) {
      return;  // Execution not found
    }

    const endTime = Date.now();
    const duration = endTime - execution.startTime;
    const endMemory = this.getMemoryUsage();
    const memoryDelta = endMemory && execution.startMemory
      ? endMemory - execution.startMemory
      : undefined;

    // Clean up tracking
    this.activeExecutions.delete(execId);

    // Handle error
    if (error) {
      const errorEntry: ErrorLogEntry = {
        type: 'error',
        context: execution.context,
        threads: execution.threads,
        timestamp: endTime,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      };

      this.log(errorEntry);
      return;
    }

    // Log exit
    const exitEntry: ExitLogEntry = {
      type: 'exit',
      context: execution.context,
      threads: execution.threads,
      timestamp: endTime,
      duration,
      result: this.captureIOShape(result),
      memoryDelta
    };

    this.log(exitEntry);

    // Detect deltas
    if (execution.spec) {
      this.detectDeltas(execution, duration, memoryDelta, result);
    }
  }

  /**
   * Detect deviations from expectations
   */
  private detectDeltas(
    execution: ActiveExecution,
    duration: number,
    memoryDelta: number | undefined,
    result: any
  ): void {
    if (!execution.spec) {
      return;
    }

    const deltas: DeltaLogEntry[] = [];

    // Timing deltas
    if (execution.spec.timing) {
      const { min, max, budget } = execution.spec.timing;

      if (max && duration > max) {
        deltas.push({
          type: 'delta',
          subtype: 'timing',
          context: execution.context,
          threads: execution.threads,
          timestamp: Date.now(),
          expected: `max ${max}ms`,
          actual: `${duration}ms`,
          deviation: 'slow',
          severity: duration > max * 2 ? 'error' : 'warning',
          evidence: { duration, max, overage: duration - max }
        });
      }

      if (min && duration < min) {
        deltas.push({
          type: 'delta',
          subtype: 'timing',
          context: execution.context,
          threads: execution.threads,
          timestamp: Date.now(),
          expected: `min ${min}ms`,
          actual: `${duration}ms`,
          deviation: 'fast',
          severity: 'info',
          evidence: { duration, min, underage: min - duration }
        });
      }

      if (budget && duration > budget) {
        deltas.push({
          type: 'delta',
          subtype: 'timing',
          context: execution.context,
          threads: execution.threads,
          timestamp: Date.now(),
          expected: `budget ${budget}ms`,
          actual: `${duration}ms`,
          deviation: 'slow',
          severity: 'warning',
          evidence: { duration, budget, overbudget: duration - budget }
        });
      }
    }

    // Memory deltas
    if (execution.spec.memory && memoryDelta !== undefined) {
      const { max } = execution.spec.memory;

      if (max && memoryDelta > max) {
        deltas.push({
          type: 'delta',
          subtype: 'memory',
          context: execution.context,
          threads: execution.threads,
          timestamp: Date.now(),
          expected: `max ${this.formatBytes(max)}`,
          actual: `${this.formatBytes(memoryDelta)}`,
          deviation: 'large',
          severity: memoryDelta > max * 2 ? 'error' : 'warning',
          evidence: { memoryDelta, max, overage: memoryDelta - max }
        });
      }
    }

    // Output shape deltas
    if (execution.spec.output && result !== undefined) {
      const actualShape = this.captureIOShape(result);
      const expectedShape = execution.spec.output;

      if (expectedShape.type && actualShape.type !== expectedShape.type) {
        deltas.push({
          type: 'delta',
          subtype: 'io',
          context: execution.context,
          threads: execution.threads,
          timestamp: Date.now(),
          expected: `type: ${expectedShape.type}`,
          actual: `type: ${actualShape.type}`,
          deviation: 'unexpected',
          severity: 'warning',
          evidence: { expected: expectedShape, actual: actualShape }
        });
      }
    }

    // Log all deltas
    deltas.forEach(delta => this.log(delta));
  }

  /**
   * Add entry to log buffer
   */
  private log(entry: LogEntry): void {
    this.logBuffer.push(entry);

    const config = getGlobalThreadConfig();
    const loggingConfig = config.getLoggingConfig();

    // Flush if buffer full
    if (this.logBuffer.length >= loggingConfig.buffer.size) {
      this.flush();
    }
  }

  /**
   * Flush log buffer
   */
  flush(): void {
    if (this.logBuffer.length === 0) {
      return;
    }

    const entries = [...this.logBuffer];
    this.logBuffer = [];

    // Notify callbacks
    this.flushCallbacks.forEach(callback => callback(entries));
  }

  /**
   * Register flush callback
   */
  onFlush(callback: (entries: LogEntry[]) => void): () => void {
    this.flushCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.flushCallbacks.indexOf(callback);
      if (index >= 0) {
        this.flushCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(intervalMs: number): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flush();
    }, intervalMs);
  }

  /**
   * Stop flush timer
   */
  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    // Final flush
    this.flush();
  }

  /**
   * Capture IO shapes from arguments
   */
  private captureIOShapes(args: any[]): IOShape[] {
    return args.map(arg => this.captureIOShape(arg));
  }

  /**
   * Capture IO shape from value
   */
  private captureIOShape(value: any): IOShape {
    const type = this.getTypeString(value);

    return {
      type,
      shape: this.getShapeDescription(value)
    };
  }

  /**
   * Get type string
   */
  private getTypeString(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return 'array';

    const type = typeof value;

    if (type === 'object' && value.constructor) {
      return value.constructor.name;
    }

    return type;
  }

  /**
   * Get shape description
   */
  private getShapeDescription(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (Array.isArray(value)) {
      return `length:${value.length}`;
    }

    if (typeof value === 'string') {
      // Detect common patterns
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
        return 'uuid';
      }
      if (/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(value)) {
        return 'email';
      }
      return `length:${value.length}`;
    }

    if (typeof value === 'number') {
      return Number.isInteger(value) ? 'integer' : 'float';
    }

    if (typeof value === 'object') {
      const keys = Object.keys(value);
      return `keys:${keys.length}`;
    }

    return '';
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number | undefined {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return undefined;
  }

  /**
   * Format bytes to human-readable
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
  }

  /**
   * Get current buffer size
   */
  getBufferSize(): number {
    return this.logBuffer.length;
  }

  /**
   * Get active execution count
   */
  getActiveExecutionCount(): number {
    return this.activeExecutions.size;
  }
}

/**
 * Global log instance (singleton)
 */
let globalLog: ThreadLog | null = null;

/**
 * Get global log instance
 */
export function getGlobalThreadLog(): ThreadLog {
  if (!globalLog) {
    globalLog = new ThreadLog();
  }
  return globalLog;
}

/**
 * Set global log instance
 */
export function setGlobalThreadLog(log: ThreadLog): void {
  globalLog = log;
}

/**
 * Helper to wrap async functions with ThreadLog tracking
 */
export function trackExecution<T>(
  context: string,
  fn: (...args: any[]) => Promise<T>,
  threads?: string[]
): (...args: any[]) => Promise<T> {
  return async function (...args: any[]): Promise<T> {
    const log = getGlobalThreadLog();
    const execId = log.enter(context, args, threads);

    try {
      const result = await fn(...args);
      log.exit(execId, result);
      return result;
    } catch (error) {
      log.exit(execId, undefined, error as Error);
      throw error;
    }
  };
}
