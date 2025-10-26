/**
 * ThreadSpec Decorator
 *
 * Method decorator for declaring threading expectations.
 * Zero runtime cost when threading is disabled.
 * Stores metadata for runtime comparison and analysis.
 */

import { ThreadSpecOptions } from '../types';
import { EnhancedThreadSpecOptions } from '../contracts';

/**
 * Metadata storage for ThreadSpec decorators
 * Maps className.methodName → ThreadSpecOptions | EnhancedThreadSpecOptions
 */
export const threadSpecRegistry = new Map<string, ThreadSpecOptions | EnhancedThreadSpecOptions>();

/**
 * ThreadSpec decorator
 *
 * @example
 * ```typescript
 * @ThreadSpec({
 *   threads: ['DATA_FLOW', 'CACHE'],
 *   timing: { min: 10, max: 100 },
 *   memory: { max: 1024 * 1024 }
 * })
 * async getUser(id: string): Promise<User> {
 *   // Implementation
 * }
 * ```
 *
 * @example Enhanced with data contracts
 * ```typescript
 * @ThreadSpec({
 *   threads: ['DATA_FLOW'],
 *   expects: {
 *     params: {
 *       userId: { type: 'string', constraints: { pattern: /^[0-9a-f]{8}$/ } }
 *     }
 *   },
 *   produces: {
 *     returns: { type: 'object', shape: { id: { type: 'string', required: true } } }
 *   }
 * })
 * ```
 */
export function ThreadSpec(options: ThreadSpecOptions | EnhancedThreadSpecOptions) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const className = target.constructor?.name || 'Anonymous';
    const context = `${className}.${propertyKey}`;

    // Store metadata
    threadSpecRegistry.set(context, options);

    // Return original descriptor (zero runtime cost when disabled)
    return descriptor;
  };
}

/**
 * Get ThreadSpec metadata for a given context
 */
export function getThreadSpec(context: string): ThreadSpecOptions | EnhancedThreadSpecOptions | undefined {
  return threadSpecRegistry.get(context);
}

/**
 * Get all registered ThreadSpecs
 */
export function getAllThreadSpecs(): Map<string, ThreadSpecOptions | EnhancedThreadSpecOptions> {
  return new Map(threadSpecRegistry);
}

/**
 * Check if a spec is enhanced (has data contracts)
 */
export function isEnhancedSpec(spec: ThreadSpecOptions | EnhancedThreadSpecOptions): spec is EnhancedThreadSpecOptions {
  const enhanced = spec as EnhancedThreadSpecOptions;
  return !!(enhanced.expects || enhanced.produces || enhanced.dataFlow || enhanced.invariants || enhanced.examples);
}

/**
 * Clear ThreadSpec registry (for testing)
 */
export function clearThreadSpecRegistry(): void {
  threadSpecRegistry.clear();
}

/**
 * Get all contexts for a specific thread
 */
export function getContextsForThread(threadName: string): string[] {
  const contexts: string[] = [];

  for (const [context, spec] of threadSpecRegistry.entries()) {
    if (spec.threads.includes(threadName)) {
      contexts.push(context);
    }
  }

  return contexts;
}

/**
 * Get thread participation statistics
 */
export interface ThreadStats {
  threadName: string;
  functionCount: number;
  criticalCount: number;
  contexts: string[];
}

export function getThreadStats(): ThreadStats[] {
  const statsMap = new Map<string, ThreadStats>();

  for (const [context, spec] of threadSpecRegistry.entries()) {
    for (const thread of spec.threads) {
      if (!statsMap.has(thread)) {
        statsMap.set(thread, {
          threadName: thread,
          functionCount: 0,
          criticalCount: 0,
          contexts: []
        });
      }

      const stats = statsMap.get(thread)!;
      stats.functionCount++;
      stats.contexts.push(context);

      if (spec.critical) {
        stats.criticalCount++;
      }
    }
  }

  return Array.from(statsMap.values());
}
