/**
 * Threading System
 *
 * Thread-aware debugging system for collaborative debugging between humans and AI agents.
 *
 * @example
 * ```typescript
 * import { ThreadSpec } from '@agent-brain/core/threading';
 *
 * @ThreadSpec({
 *   threads: ['DATA_FLOW'],
 *   timing: { min: 10, max: 100 }
 * })
 * async function getUser(id: string): Promise<User> {
 *   // Implementation
 * }
 * ```
 */

// Types
export * from './types';

// Decorators
export { ThreadSpec, getThreadSpec, getAllThreadSpecs, clearThreadSpecRegistry, getContextsForThread, getThreadStats } from './decorators/ThreadSpec';

// Configuration
export { ThreadConfigManager, getGlobalThreadConfig, setGlobalThreadConfig, DEFAULT_CONFIG } from './ThreadConfig';

// Runtime Logging
export { ThreadLog, getGlobalThreadLog, setGlobalThreadLog, trackExecution } from './ThreadLog';
