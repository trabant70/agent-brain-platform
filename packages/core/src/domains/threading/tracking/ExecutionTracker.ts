/**
 * ExecutionTracker
 *
 * Tracks complete function execution including:
 * - Entry/exit state capture
 * - Data transformations
 * - Mutations
 * - Contract violations
 * - Data flow diagram generation
 */

import {
  EntryPoint,
  ExitPoint,
  EntryCapture,
  ExitCapture,
  Transformation,
  Mutation,
  ContractViolation,
  ExecutionTrace,
  DataFlowDiagram,
  DataFlowNode,
  DataFlowEdge,
  ErrorCapture,
  ValueSnapshot
} from '../types';
import { EnhancedThreadSpecOptions } from '../contracts';
import { ValueCapture, captureValue } from './ValueCapture';

/**
 * Execution Tracker Configuration
 */
export interface ExecutionTrackerConfig {
  captureTransformations: boolean;
  captureMutations: boolean;
  generateDataFlow: boolean;
  valueCapture?: ValueCapture;
}

/**
 * Default Configuration
 */
export const DEFAULT_EXECUTION_TRACKER_CONFIG: ExecutionTrackerConfig = {
  captureTransformations: true,
  captureMutations: true,
  generateDataFlow: true
};

/**
 * ExecutionTracker Class
 */
export class ExecutionTracker {
  private executionId: string;
  private context: string;
  private spec?: EnhancedThreadSpecOptions;
  private config: ExecutionTrackerConfig;
  private valueCapture: ValueCapture;

  private entryCapture?: EntryCapture;
  private exitCapture?: ExitCapture;
  private errorCapture?: ErrorCapture;
  private transformations: Transformation[] = [];
  private mutations: Mutation[] = [];
  private violations: ContractViolation[] = [];

  private startTime: number;

  constructor(
    executionId: string,
    context: string,
    spec?: EnhancedThreadSpecOptions,
    config?: Partial<ExecutionTrackerConfig>
  ) {
    this.executionId = executionId;
    this.context = context;
    this.spec = spec;
    this.config = { ...DEFAULT_EXECUTION_TRACKER_CONFIG, ...config };
    this.valueCapture = config?.valueCapture || new ValueCapture();
    this.startTime = Date.now();
  }

  /**
   * Capture function entry
   */
  captureEntry(entry: EntryPoint): EntryCapture {
    const argsSnapshots = entry.args.map((arg, index) =>
      this.valueCapture.capture(arg, `arg${index}`)
    );

    const thisSnapshot = entry.thisContext
      ? this.valueCapture.capture(entry.thisContext, 'this')
      : undefined;

    this.valueCapture.resetCircularTracking();

    this.entryCapture = {
      args: argsSnapshots,
      thisContext: thisSnapshot,
      timestamp: entry.timestamp,
      threads: entry.threads,
      metadata: entry.metadata
    };

    return this.entryCapture;
  }

  /**
   * Capture function exit
   */
  captureExit(exit: ExitPoint): ExitCapture {
    const resultSnapshot = this.valueCapture.capture(exit.result, 'result');
    this.valueCapture.resetCircularTracking();

    const duration = exit.timestamp - this.startTime;

    this.exitCapture = {
      result: resultSnapshot,
      timestamp: exit.timestamp,
      duration,
      mutations: exit.mutations || this.mutations,
      metadata: exit.metadata
    };

    return this.exitCapture;
  }

  /**
   * Capture error
   */
  captureError(error: Error, state: any): ErrorCapture {
    const stateSnapshot = this.valueCapture.capture(state, 'errorState');
    this.valueCapture.resetCircularTracking();

    this.errorCapture = {
      error,
      state: stateSnapshot,
      timestamp: Date.now(),
      stackTrace: error.stack
    };

    return this.errorCapture;
  }

  /**
   * Capture transformation
   */
  captureTransformation(
    from: string,
    to: string,
    beforeValue: any,
    afterValue: any,
    transformType?: string
  ): void {
    if (!this.config.captureTransformations) return;

    const beforeSnapshot = this.valueCapture.capture(beforeValue, from);
    const afterSnapshot = this.valueCapture.capture(afterValue, to);
    this.valueCapture.resetCircularTracking();

    this.transformations.push({
      from,
      to,
      timestamp: Date.now(),
      beforeValue: beforeSnapshot,
      afterValue: afterSnapshot,
      transformType
    });
  }

  /**
   * Capture mutation
   */
  captureMutation(
    path: string,
    beforeValue: any,
    afterValue: any,
    mutationType: 'set' | 'delete' | 'push' | 'splice' | 'other'
  ): void {
    if (!this.config.captureMutations) return;

    const beforeSnapshot = this.valueCapture.capture(beforeValue, path);
    const afterSnapshot = this.valueCapture.capture(afterValue, path);
    this.valueCapture.resetCircularTracking();

    this.mutations.push({
      path,
      timestamp: Date.now(),
      beforeValue: beforeSnapshot,
      afterValue: afterSnapshot,
      mutationType
    });
  }

  /**
   * Log contract violation
   */
  logContractViolation(violation: ContractViolation): void {
    this.violations.push(violation);
  }

  /**
   * Get current mutations
   */
  getMutations(): Mutation[] {
    return [...this.mutations];
  }

  /**
   * Get current violations
   */
  getViolations(): ContractViolation[] {
    return [...this.violations];
  }

  /**
   * Get complete execution trace
   */
  getCompleteTrace(): ExecutionTrace {
    return {
      executionId: this.executionId,
      context: this.context,
      entry: this.entryCapture!,
      exit: this.exitCapture,
      error: this.errorCapture,
      transformations: [...this.transformations],
      mutations: [...this.mutations],
      violations: [...this.violations],
      dataFlow: this.config.generateDataFlow ? this.generateDataFlow() : undefined
    };
  }

  /**
   * Generate data flow diagram
   */
  generateDataFlow(): DataFlowDiagram {
    const nodes: DataFlowNode[] = [];
    const edges: DataFlowEdge[] = [];

    // Add input nodes
    if (this.entryCapture) {
      this.entryCapture.args.forEach((arg, index) => {
        nodes.push({
          id: `input-arg${index}`,
          label: `arg${index}`,
          type: 'input',
          value: arg,
          timestamp: this.entryCapture!.timestamp
        });
      });

      if (this.entryCapture.thisContext) {
        nodes.push({
          id: 'input-this',
          label: 'this',
          type: 'input',
          value: this.entryCapture.thisContext,
          timestamp: this.entryCapture.timestamp
        });
      }
    }

    // Add transformation nodes
    this.transformations.forEach((transform, index) => {
      const transformId = `transform-${index}`;
      nodes.push({
        id: transformId,
        label: transform.transformType || 'transform',
        type: 'transformation',
        timestamp: transform.timestamp
      });

      // Add edge from source
      edges.push({
        from: this.findNodeIdForPath(transform.from, nodes),
        to: transformId,
        label: 'from'
      });

      // Add edge to destination
      const destId = `transform-result-${index}`;
      nodes.push({
        id: destId,
        label: transform.to,
        type: 'transformation',
        value: transform.afterValue,
        timestamp: transform.timestamp
      });

      edges.push({
        from: transformId,
        to: destId,
        label: 'to',
        transformationType: transform.transformType
      });
    });

    // Add mutation nodes
    this.mutations.forEach((mutation, index) => {
      const mutationId = `mutation-${index}`;
      nodes.push({
        id: mutationId,
        label: `${mutation.mutationType}: ${mutation.path}`,
        type: 'mutation',
        value: mutation.afterValue,
        timestamp: mutation.timestamp
      });

      // Try to find source
      const sourceId = this.findNodeIdForPath(mutation.path, nodes);
      if (sourceId) {
        edges.push({
          from: sourceId,
          to: mutationId,
          label: mutation.mutationType
        });
      }
    });

    // Add output node
    if (this.exitCapture) {
      nodes.push({
        id: 'output-result',
        label: 'result',
        type: 'output',
        value: this.exitCapture.result,
        timestamp: this.exitCapture.timestamp
      });

      // Connect last transformation/mutation to output
      if (this.transformations.length > 0) {
        const lastTransform = this.transformations[this.transformations.length - 1];
        edges.push({
          from: `transform-result-${this.transformations.length - 1}`,
          to: 'output-result',
          label: 'returns'
        });
      } else if (nodes.some(n => n.type === 'input')) {
        // Direct input -> output
        edges.push({
          from: 'input-arg0',
          to: 'output-result',
          label: 'returns'
        });
      }
    }

    return { nodes, edges };
  }

  /**
   * Find node ID for a given path
   */
  private findNodeIdForPath(path: string, nodes: DataFlowNode[]): string {
    // Try exact match
    const exactMatch = nodes.find(n => n.label === path);
    if (exactMatch) return exactMatch.id;

    // Try prefix match (e.g., 'args[0]' matches 'input-arg0')
    if (path.startsWith('args[')) {
      const argIndex = path.match(/args\[(\d+)\]/)?.[1];
      if (argIndex !== undefined) {
        return `input-arg${argIndex}`;
      }
    }

    if (path === 'this') {
      return 'input-this';
    }

    // Default to first input
    return nodes.find(n => n.type === 'input')?.id || 'input-arg0';
  }

  /**
   * Get execution summary
   */
  getExecutionSummary(): string {
    const duration = this.exitCapture
      ? this.exitCapture.duration
      : Date.now() - this.startTime;

    const parts: string[] = [
      `Execution: ${this.context}`,
      `Duration: ${duration}ms`,
      `Transformations: ${this.transformations.length}`,
      `Mutations: ${this.mutations.length}`,
      `Violations: ${this.violations.length}`
    ];

    if (this.errorCapture) {
      parts.push(`Error: ${this.errorCapture.error.message}`);
    }

    return parts.join(' | ');
  }

  /**
   * Check if execution has violations
   */
  hasViolations(): boolean {
    return this.violations.length > 0;
  }

  /**
   * Check if execution has errors
   */
  hasError(): boolean {
    return this.errorCapture !== undefined;
  }

  /**
   * Get execution duration
   */
  getDuration(): number {
    if (this.exitCapture) {
      return this.exitCapture.duration;
    }
    return Date.now() - this.startTime;
  }
}

/**
 * Generate unique execution ID
 */
export function generateExecutionId(): string {
  return `exec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create tracking proxy
 * Wraps an object to track mutations
 */
export function createTrackingProxy(target: any, tracker: ExecutionTracker): any {
  if (target === null || typeof target !== 'object') {
    return target;
  }

  return new Proxy(target, {
    set(obj: any, prop: string | symbol, value: any): boolean {
      const propStr = String(prop);
      const oldValue = obj[propStr];

      // Capture mutation
      tracker.captureMutation(
        `this.${propStr}`,
        oldValue,
        value,
        'set'
      );

      // Perform the set
      obj[propStr] = value;
      return true;
    },

    deleteProperty(obj: any, prop: string | symbol): boolean {
      const propStr = String(prop);
      const oldValue = obj[propStr];

      // Capture mutation
      tracker.captureMutation(
        `this.${propStr}`,
        oldValue,
        undefined,
        'delete'
      );

      // Perform the delete
      delete obj[propStr];
      return true;
    }
  });
}
