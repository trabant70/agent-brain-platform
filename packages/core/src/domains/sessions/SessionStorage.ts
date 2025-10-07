/**
 * SessionStorage - Persistent session storage
 *
 * Responsibilities:
 * - Save/load sessions to/from .agent-brain/sessions.json
 * - Maintain maxSessions limit (FIFO eviction)
 * - Query sessions by date range
 * - Provide session statistics
 *
 * Architecture:
 * - Zero VSCode dependencies (uses Node.js fs/promises)
 * - JSON-based storage with date serialization/deserialization
 * - FIFO eviction when max sessions exceeded
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Session, AgentType, SessionStatus } from './types';

/**
 * Configuration for SessionStorage
 */
export interface SessionStorageConfig {
  /** Directory path for storage (e.g., /path/to/.agent-brain) */
  storagePath: string;

  /** Maximum number of sessions to retain (default: 100) */
  maxSessions?: number;
}

/**
 * Session statistics
 */
export interface SessionStatistics {
  /** Total number of sessions */
  totalSessions: number;

  /** Count of sessions by agent type */
  byAgent: Record<AgentType, number>;

  /** Count of sessions by status */
  byStatus: Record<SessionStatus, number>;

  /** Total number of activities across all sessions */
  totalActivities: number;

  /** Average session duration in milliseconds */
  avgDuration: number;
}

/**
 * SessionStorage - Persistent storage for sessions
 */
export class SessionStorage {
  private readonly maxSessions: number;
  private readonly sessionsFile: string;

  constructor(config: SessionStorageConfig) {
    this.maxSessions = config.maxSessions || 100;
    this.sessionsFile = path.join(config.storagePath, 'sessions.json');
  }

  /**
   * Save a session to storage
   * Automatically maintains maxSessions limit via FIFO eviction
   */
  async saveSession(session: Session): Promise<void> {
    // Ensure storage directory exists
    await this.ensureDirectory();

    // Load existing sessions
    const sessions = await this.loadAllSessions();

    // Add new session
    sessions.push(session);

    // Maintain max limit (remove oldest if exceeded)
    while (sessions.length > this.maxSessions) {
      sessions.shift(); // Remove oldest (FIFO)
    }

    // Write back to disk
    await this.writeJson(this.sessionsFile, sessions);
  }

  /**
   * Load all sessions from storage
   * Returns empty array if file doesn't exist
   */
  async loadAllSessions(): Promise<Session[]> {
    try {
      const data = await fs.readFile(this.sessionsFile, 'utf8');
      const sessions = JSON.parse(data) as Session[];

      // Deserialize Date objects (JSON doesn't preserve Date type)
      return sessions.map(s => this.deserializeSession(s));
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return []; // File doesn't exist yet - normal on first run
      }
      throw error;
    }
  }

  /**
   * Load most recent N sessions
   */
  async loadRecentSessions(count: number): Promise<Session[]> {
    const all = await this.loadAllSessions();
    return all.slice(-count); // Last N sessions
  }

  /**
   * Load sessions within a date range
   */
  async loadSessionsByDateRange(start: Date, end: Date): Promise<Session[]> {
    const all = await this.loadAllSessions();
    return all.filter(s =>
      s.startTime >= start && s.startTime <= end
    );
  }

  /**
   * Get session by ID
   */
  async getSessionById(id: string): Promise<Session | null> {
    const all = await this.loadAllSessions();
    return all.find(s => s.id === id) || null;
  }

  /**
   * Get sessions by agent type
   */
  async getSessionsByAgent(agentType: AgentType): Promise<Session[]> {
    const all = await this.loadAllSessions();
    return all.filter(s => s.agentType === agentType);
  }

  /**
   * Get sessions by status
   */
  async getSessionsByStatus(status: SessionStatus): Promise<Session[]> {
    const all = await this.loadAllSessions();
    return all.filter(s => s.status === status);
  }

  /**
   * Get aggregate session statistics
   */
  async getStatistics(): Promise<SessionStatistics> {
    const sessions = await this.loadAllSessions();

    return {
      totalSessions: sessions.length,
      byAgent: this.countByAgent(sessions),
      byStatus: this.countByStatus(sessions),
      totalActivities: sessions.reduce((sum, s) => sum + s.activities.length, 0),
      avgDuration: this.calculateAvgDuration(sessions)
    };
  }

  /**
   * Delete a specific session
   */
  async deleteSession(id: string): Promise<boolean> {
    const sessions = await this.loadAllSessions();
    const initialLength = sessions.length;
    const filtered = sessions.filter(s => s.id !== id);

    if (filtered.length === initialLength) {
      return false; // Session not found
    }

    await this.writeJson(this.sessionsFile, filtered);
    return true;
  }

  /**
   * Clear all sessions (dangerous!)
   */
  async clearAll(): Promise<void> {
    await this.writeJson(this.sessionsFile, []);
  }

  /**
   * Check if storage file exists
   */
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.sessionsFile);
      return true;
    } catch {
      return false;
    }
  }

  // ========================================
  // Private Helpers
  // ========================================

  /**
   * Ensure storage directory exists
   */
  private async ensureDirectory(): Promise<void> {
    const dir = path.dirname(this.sessionsFile);
    await fs.mkdir(dir, { recursive: true });
  }

  /**
   * Write JSON to file with pretty formatting
   */
  private async writeJson(filepath: string, data: any): Promise<void> {
    const json = JSON.stringify(data, null, 2);
    await fs.writeFile(filepath, json, 'utf8');
  }

  /**
   * Deserialize session from JSON (restore Date objects)
   */
  private deserializeSession(raw: any): Session {
    return {
      ...raw,
      startTime: new Date(raw.startTime),
      endTime: raw.endTime ? new Date(raw.endTime) : undefined,
      activities: raw.activities.map((a: any) => ({
        ...a,
        timestamp: new Date(a.timestamp)
      }))
    };
  }

  /**
   * Count sessions by agent type
   */
  private countByAgent(sessions: Session[]): Record<AgentType, number> {
    const counts: Record<string, number> = {};

    for (const session of sessions) {
      counts[session.agentType] = (counts[session.agentType] || 0) + 1;
    }

    return counts as Record<AgentType, number>;
  }

  /**
   * Count sessions by status
   */
  private countByStatus(sessions: Session[]): Record<SessionStatus, number> {
    const counts: Record<string, number> = {};

    for (const session of sessions) {
      counts[session.status] = (counts[session.status] || 0) + 1;
    }

    return counts as Record<SessionStatus, number>;
  }

  /**
   * Calculate average session duration
   */
  private calculateAvgDuration(sessions: Session[]): number {
    const completed = sessions.filter(s => s.endTime);

    if (completed.length === 0) {
      return 0;
    }

    const totalMs = completed.reduce((sum, s) => {
      const duration = s.endTime!.getTime() - s.startTime.getTime();
      return sum + duration;
    }, 0);

    return totalMs / completed.length;
  }
}
