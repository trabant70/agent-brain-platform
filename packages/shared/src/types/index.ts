/**
 * Shared types for Agent Brain Platform
 *
 * These types are used across all packages:
 * - timeline: Event visualization
 * - core: Pattern detection and analysis
 * - testing: Pathway testing framework
 * - vscode: Extension integration
 */

export * from './CanonicalEvent';
export * from './Logger';

/**
 * Base provider interface
 */
export interface IDataProvider {
  /** Provider identifier */
  readonly id: string;

  /** Provider display name */
  readonly name: string;

  /** Provider capabilities */
  readonly capabilities: import('./CanonicalEvent').ProviderCapabilities;

  /** Fetch events for given context */
  fetchEvents(context: import('./CanonicalEvent').ProviderContext): Promise<import('./CanonicalEvent').CanonicalEvent[]>;

  /** Initialize provider */
  initialize(config?: import('./CanonicalEvent').ProviderConfig): Promise<void>;

  /** Cleanup provider resources */
  dispose(): Promise<void>;
}

/**
 * Session information for tracking AI-assisted development
 */
export interface AgentSession {
  /** Session ID */
  id: string;

  /** Agent type */
  agent: 'claude' | 'cursor' | 'copilot' | 'manual' | string;

  /** Session start time */
  startTime: Date;

  /** Session end time (if completed) */
  endTime?: Date;

  /** User intent/goal for this session */
  intent?: string;

  /** Events generated during this session */
  events: import('./CanonicalEvent').CanonicalEvent[];

  /** Session outcome */
  outcome?: 'success' | 'failure' | 'in-progress' | 'abandoned';

  /** Session metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Pattern information for agent-brain core
 */
export interface Pattern {
  /** Pattern identifier */
  id: string;

  /** Pattern name */
  name: string;

  /** Pattern description */
  description: string;

  /** Pattern category */
  category: 'architecture' | 'performance' | 'security' | 'best-practice' | 'anti-pattern';

  /** Severity level */
  severity: 'info' | 'warning' | 'error' | 'critical';

  /** Pattern confidence (0-1) */
  confidence: number;

  /** When pattern was detected */
  detectedAt: Date;

  /** Pattern metadata */
  metadata?: Record<string, unknown>;
}
