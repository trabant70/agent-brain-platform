/**
 * ThreadConfig - Configuration Management
 *
 * Loads and manages threading system configuration from .threading/config.json
 */

import { ThreadConfig, ThreadDefinition } from './types';

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: ThreadConfig = {
  version: '2.0',
  enabled: false,
  mode: 'disabled',

  threads: {
    definitions: [
      {
        name: 'DATA_FLOW',
        description: 'Main data processing pipeline',
        color: '#4CAF50',
        critical: false
      },
      {
        name: 'CACHE',
        description: 'Cache operations and invalidation',
        color: '#2196F3',
        critical: false
      },
      {
        name: 'VALIDATION',
        description: 'Input validation and sanitization',
        color: '#FFC107',
        critical: true
      },
      {
        name: 'ERROR_RECOVERY',
        description: 'Error handling and recovery paths',
        color: '#F44336',
        critical: true
      },
      {
        name: 'AGENT_BRAIN',
        description: 'Agent Brain knowledge and learning',
        color: '#9C27B0',
        critical: false
      }
    ],
    active: [],
    sampling: {
      default: 100,  // 1% sampling
      performance: 10,  // 10% for perf-sensitive
      error: 1  // Always log errors
    }
  },

  logging: {
    path: '.threading/logs',
    format: 'jsonl',
    buffer: {
      enabled: true,
      size: 1000,
      flushInterval: 1000  // 1 second
    },
    rotation: {
      maxSize: '10MB',
      maxAge: '7d',
      compress: true
    }
  },

  analysis: {
    enabled: true,
    mode: 'batch',
    interval: '5m',
    patterns: [
      'performance-degradation',
      'error-clustering',
      'memory-leak',
      'cache-inefficiency'
    ]
  }
};

/**
 * Configuration Manager
 */
export class ThreadConfigManager {
  private config: ThreadConfig;
  private listeners: Array<(config: ThreadConfig) => void> = [];

  constructor(initialConfig?: ThreadConfig) {
    this.config = initialConfig || { ...DEFAULT_CONFIG };
  }

  /**
   * Get current configuration
   */
  getConfig(): ThreadConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ThreadConfig>): void {
    this.config = {
      ...this.config,
      ...updates
    };

    // Notify listeners
    this.listeners.forEach(listener => listener(this.config));
  }

  /**
   * Check if threading is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled && this.config.mode !== 'disabled';
  }

  /**
   * Get current mode
   */
  getMode(): ThreadConfig['mode'] {
    return this.config.mode;
  }

  /**
   * Enable threading
   */
  enable(mode: ThreadConfig['mode'] = 'development'): void {
    this.updateConfig({ enabled: true, mode });
  }

  /**
   * Disable threading
   */
  disable(): void {
    this.updateConfig({ enabled: false, mode: 'disabled' });
  }

  /**
   * Get active threads
   */
  getActiveThreads(): string[] {
    return [...this.config.threads.active];
  }

  /**
   * Set active threads
   */
  setActiveThreads(threads: string[]): void {
    this.updateConfig({
      threads: {
        ...this.config.threads,
        active: threads
      }
    });
  }

  /**
   * Toggle a thread
   */
  toggleThread(threadName: string): boolean {
    const active = new Set(this.config.threads.active);

    if (active.has(threadName)) {
      active.delete(threadName);
    } else {
      // Verify thread exists
      const threadExists = this.config.threads.definitions.some(
        t => t.name === threadName
      );

      if (!threadExists) {
        throw new Error(`Thread not found: ${threadName}`);
      }

      active.add(threadName);
    }

    this.setActiveThreads(Array.from(active));
    return active.has(threadName);
  }

  /**
   * Get thread definition
   */
  getThreadDefinition(name: string): ThreadDefinition | undefined {
    return this.config.threads.definitions.find(t => t.name === name);
  }

  /**
   * Get all thread definitions
   */
  getAllThreadDefinitions(): ThreadDefinition[] {
    return [...this.config.threads.definitions];
  }

  /**
   * Add thread definition
   */
  addThreadDefinition(definition: ThreadDefinition): void {
    const exists = this.config.threads.definitions.some(
      t => t.name === definition.name
    );

    if (exists) {
      throw new Error(`Thread already exists: ${definition.name}`);
    }

    this.updateConfig({
      threads: {
        ...this.config.threads,
        definitions: [...this.config.threads.definitions, definition]
      }
    });
  }

  /**
   * Get sampling rate for a thread
   */
  getSamplingRate(threadName: string): number {
    const def = this.getThreadDefinition(threadName);

    if (!def) {
      return this.config.threads.sampling.default;
    }

    // Critical threads use error sampling (always)
    if (def.critical) {
      return this.config.threads.sampling.error;
    }

    // TODO: Could add per-thread sampling config
    return this.config.threads.sampling.default;
  }

  /**
   * Should sample this call?
   */
  shouldSample(threadName: string, isError: boolean = false): boolean {
    if (!this.isEnabled()) {
      return false;
    }

    if (isError) {
      return true;  // Always sample errors
    }

    const rate = this.getSamplingRate(threadName);
    return Math.random() < (1 / rate);
  }

  /**
   * Check if thread is active
   */
  isThreadActive(threadName: string): boolean {
    return this.config.threads.active.includes(threadName);
  }

  /**
   * Get logging configuration
   */
  getLoggingConfig() {
    return { ...this.config.logging };
  }

  /**
   * Get analysis configuration
   */
  getAnalysisConfig() {
    return { ...this.config.analysis };
  }

  /**
   * Register configuration change listener
   */
  onChange(listener: (config: ThreadConfig) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Serialize to JSON
   */
  toJSON(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Load from JSON
   */
  fromJSON(json: string): void {
    try {
      const config = JSON.parse(json) as ThreadConfig;
      this.config = config;
      this.listeners.forEach(listener => listener(this.config));
    } catch (error) {
      throw new Error(`Invalid config JSON: ${error}`);
    }
  }

  /**
   * Parse size string to bytes
   */
  static parseSize(sizeStr: string): number {
    const units: Record<string, number> = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024
    };

    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*([A-Z]+)$/i);
    if (!match) {
      throw new Error(`Invalid size format: ${sizeStr}`);
    }

    const [, value, unit] = match;
    const multiplier = units[unit.toUpperCase()];

    if (!multiplier) {
      throw new Error(`Unknown size unit: ${unit}`);
    }

    return parseFloat(value) * multiplier;
  }

  /**
   * Parse duration string to milliseconds
   */
  static parseDuration(durationStr: string): number {
    const units: Record<string, number> = {
      'ms': 1,
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000
    };

    const match = durationStr.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)$/i);
    if (!match) {
      throw new Error(`Invalid duration format: ${durationStr}`);
    }

    const [, value, unit] = match;
    const multiplier = units[unit.toLowerCase()];

    if (multiplier === undefined) {
      throw new Error(`Unknown duration unit: ${unit}`);
    }

    return parseFloat(value) * multiplier;
  }
}

/**
 * Global config instance (singleton)
 */
let globalConfig: ThreadConfigManager | null = null;

/**
 * Get global config instance
 */
export function getGlobalThreadConfig(): ThreadConfigManager {
  if (!globalConfig) {
    globalConfig = new ThreadConfigManager();
  }
  return globalConfig;
}

/**
 * Set global config instance
 */
export function setGlobalThreadConfig(config: ThreadConfigManager): void {
  globalConfig = config;
}
