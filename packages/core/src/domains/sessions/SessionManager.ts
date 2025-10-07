/**
 * SessionManager - Core session lifecycle management
 *
 * Responsibilities:
 * - Start/finalize sessions
 * - Track activities within sessions
 * - Convert sessions to CanonicalEvents
 * - Emit session lifecycle events
 *
 * Architecture:
 * - Extends EventEmitter for pub/sub
 * - Single active session at a time
 * - Auto-finalizes previous session when starting new one
 * - Zero VSCode dependencies (pure domain logic)
 */

import { EventEmitter } from 'events';
import {
  Session,
  Activity,
  AgentType,
  SessionStatus,
  SessionSummary,
  createEmptySessionSummary,
  isFileSaveActivity,
  isTestRunActivity,
  isDiagnosticActivity
} from './types';
import { CanonicalEvent } from '../events/CanonicalEvent';
import { EventType } from '../events/EventType';
import { Author } from '../events/Author';
import { ImpactMetrics } from '../events/ImpactMetrics';

/**
 * SessionManager - Manages session lifecycle
 */
export class SessionManager extends EventEmitter {
  private currentSession: Session | null = null;

  /**
   * Start a new session
   * If there's an active session, finalize it first
   */
  async startSession(prompt: string, agentType: AgentType): Promise<Session> {
    // Finalize any active session before starting new one
    if (this.currentSession && this.currentSession.status === 'active') {
      await this.finalizeSession('completed');
    }

    this.currentSession = {
      id: this.generateSessionId(),
      prompt,
      agentType,
      startTime: new Date(),
      status: 'active',
      activities: []
    };

    this.emit('session:started', this.currentSession);
    return this.currentSession;
  }

  /**
   * Track an activity in the current session
   * @throws Error if no active session
   */
  trackActivity(activity: Activity): void {
    if (!this.currentSession || this.currentSession.status !== 'active') {
      throw new Error('Cannot track activity: No active session');
    }

    this.currentSession.activities.push(activity);
    this.emit('activity:tracked', activity);
  }

  /**
   * Finalize the current session
   * Converts to CanonicalEvent and emits it
   */
  async finalizeSession(status: 'completed' | 'abandoned'): Promise<CanonicalEvent | null> {
    if (!this.currentSession) {
      return null;
    }

    // Update session status and end time
    this.currentSession.status = status;
    this.currentSession.endTime = new Date();

    // Convert to CanonicalEvent
    const event = this.convertToCanonicalEvent(this.currentSession);

    // Emit events
    this.emit('session:finalized', this.currentSession);
    this.emit('event:created', event);

    // Clear current session
    const finalizedSession = this.currentSession;
    this.currentSession = null;

    return event;
  }

  /**
   * Get the current active session
   */
  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  /**
   * Check if there's an active session
   */
  hasActiveSession(): boolean {
    return this.currentSession !== null && this.currentSession.status === 'active';
  }

  /**
   * Convert Session to CanonicalEvent
   */
  private convertToCanonicalEvent(session: Session): CanonicalEvent {
    const summary = this.calculateSummary(session);

    return {
      // Identity
      id: session.id,
      canonicalId: `agent-brain:${session.id}`,
      providerId: 'agent-brain',
      type: EventType.AGENT_SESSION,

      // Temporal
      timestamp: session.startTime,
      ingestedAt: new Date(),

      // Content
      title: this.formatTitle(session),
      description: this.formatDescription(session, summary),

      // Attribution
      author: this.getSessionAuthor(session),

      // Context - Agent Brain sessions don't have git branches
      branches: [],
      parentIds: [],

      // Metrics
      impact: this.calculateImpact(summary),

      // Metadata - Store session details
      metadata: {
        sessionId: session.id,
        prompt: session.prompt,
        agentType: session.agentType,
        status: session.status,
        duration: session.endTime
          ? session.endTime.getTime() - session.startTime.getTime()
          : 0,
        activityCount: session.activities.length,
        summary: {
          filesModified: Array.from(summary.filesModified),
          linesAdded: summary.linesAdded,
          linesRemoved: summary.linesRemoved,
          testsRun: summary.testsRun,
          testsPassed: summary.testsPassed,
          testsFailed: summary.testsFailed,
          errorCount: summary.errorCount,
          warningCount: summary.warningCount
        }
      }
    };
  }

  /**
   * Calculate session summary metrics
   */
  private calculateSummary(session: Session): SessionSummary {
    const summary = createEmptySessionSummary();

    for (const activity of session.activities) {
      summary.activityCount++;

      if (isFileSaveActivity(activity)) {
        summary.filesModified.add(activity.metadata.filePath);
        summary.linesAdded += activity.metadata.linesAdded || 0;
        summary.linesRemoved += activity.metadata.linesRemoved || 0;
      }

      if (isTestRunActivity(activity)) {
        summary.testsRun += activity.metadata.testCount;
        summary.testsPassed += activity.metadata.passed;
        summary.testsFailed += activity.metadata.failed;
      }

      if (isDiagnosticActivity(activity)) {
        if (activity.type === 'diagnostic-error') {
          summary.errorCount++;
        } else {
          summary.warningCount++;
        }
      }
    }

    // Calculate duration
    if (session.endTime) {
      summary.duration = session.endTime.getTime() - session.startTime.getTime();
    }

    return summary;
  }

  /**
   * Format session title for timeline display
   */
  private formatTitle(session: Session): string {
    const agentName = this.getAgentDisplayName(session.agentType);

    // Truncate prompt if too long
    const maxLength = 80;
    const prompt = session.prompt.length > maxLength
      ? session.prompt.substring(0, maxLength) + '...'
      : session.prompt;

    return `${agentName}: ${prompt}`;
  }

  /**
   * Format session description with summary metrics
   */
  private formatDescription(session: Session, summary: SessionSummary): string {
    const parts: string[] = [];

    // Duration
    const durationMinutes = Math.round(summary.duration / 60000);
    parts.push(`Duration: ${durationMinutes}m`);

    // File changes
    if (summary.filesModified.size > 0) {
      parts.push(`Files: ${summary.filesModified.size}`);
      if (summary.linesAdded > 0 || summary.linesRemoved > 0) {
        parts.push(`+${summary.linesAdded}/-${summary.linesRemoved}`);
      }
    }

    // Tests
    if (summary.testsRun > 0) {
      parts.push(`Tests: ${summary.testsPassed}/${summary.testsRun} passed`);
    }

    // Diagnostics
    if (summary.errorCount > 0 || summary.warningCount > 0) {
      parts.push(`Issues: ${summary.errorCount} errors, ${summary.warningCount} warnings`);
    }

    // Activities
    parts.push(`Activities: ${summary.activityCount}`);

    return parts.join(' | ');
  }

  /**
   * Get Author for session
   * Agent Brain sessions are authored by the AI agent
   */
  private getSessionAuthor(session: Session): Author {
    const agentName = this.getAgentDisplayName(session.agentType);

    return {
      id: `agent:${session.agentType}`,
      name: agentName,
      email: `${session.agentType}@agent-brain.dev`
    };
  }

  /**
   * Calculate impact metrics from summary
   */
  private calculateImpact(summary: SessionSummary): ImpactMetrics {
    return {
      filesChanged: summary.filesModified.size,
      linesAdded: summary.linesAdded,
      linesRemoved: summary.linesRemoved
    };
  }

  /**
   * Get display name for agent type
   */
  private getAgentDisplayName(agentType: AgentType): string {
    const names: Record<AgentType, string> = {
      'claude': 'Claude',
      'copilot': 'GitHub Copilot',
      'cursor': 'Cursor AI',
      'unknown': 'AI Assistant'
    };
    return names[agentType];
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `session-${timestamp}-${random}`;
  }
}
