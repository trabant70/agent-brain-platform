/**
 * Session Event Provider
 *
 * Provides Agent Brain session events to the timeline visualization.
 * Reads finalized sessions from SessionStorage and converts to CanonicalEvents.
 */

import { IDataProvider } from '../../../infrastructure/registries/DataProviderRegistry';
import {
  CanonicalEvent,
  ProviderContext,
  ProviderCapabilities,
  ProviderConfig
} from '../../events';
import { SessionStorage } from '../../sessions/SessionStorage';
import { Session } from '../../sessions/types';
import { EventType } from '../../events/EventType';
import { Author } from '../../events/Author';
import { ImpactMetrics } from '../../events/ImpactMetrics';

export class SessionEventProvider implements IDataProvider {
  readonly id = 'agent-brain-sessions';
  readonly name = 'Agent Brain Sessions';
  readonly version = '1.0.0';
  readonly capabilities: ProviderCapabilities = {
    supportsRealTimeUpdates: false,
    supportsHistoricalData: true,
    supportsFiltering: true,
    supportsSearch: false,
    supportsAuthentication: false,
    supportsWriteOperations: false,
    supportedEventTypes: []
  };

  private storage: SessionStorage | null = null;
  private storagePath: string = '';

  async initialize(config: ProviderConfig): Promise<void> {
    // Get storage path from config settings
    this.storagePath = config.settings?.storagePath || './.agent-brain/sessions';

    // Initialize session storage
    this.storage = new SessionStorage({
      storagePath: this.storagePath
    });
  }

  async fetchEvents(context: ProviderContext): Promise<CanonicalEvent[]> {
    if (!this.storage) {
      throw new Error('SessionEventProvider not initialized');
    }

    try {
      // Load all sessions from storage
      const sessions = await this.storage.loadAllSessions();

      // Convert sessions to CanonicalEvents
      const events: CanonicalEvent[] = sessions.map(session =>
        this.convertSessionToEvent(session)
      );

      // Filter by date range if provided
      if (context.since || context.until) {
        return events.filter(event => {
          const eventTime = event.timestamp.getTime();
          const sinceTime = context.since?.getTime() ?? 0;
          const untilTime = context.until?.getTime() ?? Date.now();
          return eventTime >= sinceTime && eventTime <= untilTime;
        });
      }

      return events;
    } catch (error) {
      // If storage doesn't exist yet, return empty array
      if (error instanceof Error && error.message.includes('ENOENT')) {
        return [];
      }
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    // Provider is healthy if storage is initialized
    return this.storage !== null;
  }

  async dispose(): Promise<void> {
    this.storage = null;
  }

  /**
   * Convert Session to CanonicalEvent
   * Mirrors the conversion logic in SessionManager
   */
  private convertSessionToEvent(session: Session): CanonicalEvent {
    const summary = this.calculateSummary(session);

    return {
      // Identity
      id: session.id,
      canonicalId: `agent-brain:${session.id}`,
      providerId: this.id,
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
          errorCount: summary.errorCount,
          warningCount: summary.warningCount
        }
      }
    };
  }

  private calculateSummary(session: Session): {
    filesModified: Set<string>;
    linesAdded: number;
    linesRemoved: number;
    errorCount: number;
    warningCount: number;
  } {
    const summary = {
      filesModified: new Set<string>(),
      linesAdded: 0,
      linesRemoved: 0,
      errorCount: 0,
      warningCount: 0
    };

    for (const activity of session.activities) {
      // Track files
      if (activity.type === 'file-save' || activity.type === 'file-create' || activity.type === 'file-delete') {
        const filePath = activity.metadata.filePath;
        if (filePath) {
          summary.filesModified.add(filePath);
        }
      }

      // Track lines
      if (activity.type === 'file-save') {
        summary.linesAdded += activity.metadata.linesAdded || 0;
        summary.linesRemoved += activity.metadata.linesRemoved || 0;
      }

      // Track diagnostics
      if (activity.type === 'diagnostic-error') {
        summary.errorCount++;
      } else if (activity.type === 'diagnostic-warning') {
        summary.warningCount++;
      }
    }

    return summary;
  }

  private formatTitle(session: Session): string {
    const statusEmoji = session.status === 'completed' ? '✅' : '⚠️';
    const agentIcon = this.getAgentIcon(session.agentType);
    return `${statusEmoji} ${agentIcon} ${session.prompt.substring(0, 60)}${session.prompt.length > 60 ? '...' : ''}`;
  }

  private formatDescription(session: Session, summary: any): string {
    const duration = session.endTime
      ? Math.floor((session.endTime.getTime() - session.startTime.getTime()) / 1000 / 60)
      : 0;

    return `Agent: ${session.agentType}\n` +
           `Duration: ${duration}m\n` +
           `Files: ${summary.filesModified.size}\n` +
           `Activities: ${session.activities.length}`;
  }

  private getAgentIcon(agentType: string): string {
    switch (agentType) {
      case 'claude': return '🤖';
      case 'copilot': return '🚁';
      case 'cursor': return '✏️';
      default: return '🔧';
    }
  }

  private getSessionAuthor(session: Session): Author {
    return {
      id: 'agent-brain',
      name: `Agent Brain (${session.agentType})`,
      email: 'agent-brain@local'
    };
  }

  private calculateImpact(summary: any): ImpactMetrics {
    return {
      filesChanged: summary.filesModified.size,
      linesAdded: summary.linesAdded,
      linesRemoved: summary.linesRemoved,
      impactScore: this.calculateImpactScore(summary)
    };
  }

  private calculateImpactScore(summary: any): number {
    // Simple heuristic: more files + more errors = higher impact
    // Return score 0-100
    const fileImpact = Math.min(summary.filesModified.size * 10, 50);
    const errorImpact = Math.min(summary.errorCount * 5, 30);
    return Math.min(fileImpact + errorImpact, 100);
  }
}
