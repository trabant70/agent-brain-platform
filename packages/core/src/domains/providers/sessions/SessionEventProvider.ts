/**
 * SessionEventProvider - Session Journal Timeline Integration
 *
 * Transforms session journal files into CanonicalEvents for timeline visualization.
 * Session journals are markdown files created by coding agents to track work
 * across multiple prompts.
 *
 * Data Flow:
 * .agent-brain/sessions/YYYY-MM/*.md → SessionFileSystem
 * → SessionEventProvider → CanonicalEvent[] → Timeline
 */

import {
  CanonicalEvent,
  EventType,
  Author,
  ImpactMetrics,
  ProviderContext,
  ProviderCapabilities,
  ProviderConfig
} from '../../events';
import { IDataProvider } from '../../../infrastructure/registries/DataProviderRegistry';
import { SessionFileSystem } from '../../sessions/SessionFileSystem';
import { SessionJournal } from '../../sessions/types';
import { logger, LogCategory, LogPathway } from '../../../infrastructure/logging/Logger';

export class SessionEventProvider implements IDataProvider {
  public readonly id = 'session-journals';
  public readonly name = 'Session Journals';
  public readonly version = '1.0.0';

  public readonly capabilities: ProviderCapabilities = {
    supportsRealTimeUpdates: false,
    supportsHistoricalData: true,
    supportsFiltering: true,
    supportsSearch: true,
    supportsAuthentication: false,
    supportsWriteOperations: false,
    supportedEventTypes: [
      EventType.SESSION_JOURNAL
    ]
  };

  private fileSystem: SessionFileSystem | null = null;
  private config?: ProviderConfig;
  private isInitialized = false;

  /**
   * Initialize the provider
   */
  async initialize(config: ProviderConfig): Promise<void> {
    try {
      logger.debug(
        LogCategory.DATA,
        'Initializing SessionEventProvider',
        'initialize',
        { config },
        LogPathway.DATA_INGESTION
      );

      this.config = config;
      
      // Get workspace root from config settings
      const workspaceRoot = config.settings?.workspaceRoot || config.settings?.storagePath;
      if (!workspaceRoot) {
        throw new Error('SessionEventProvider requires workspaceRoot in config.settings');
      }

      this.fileSystem = new SessionFileSystem(workspaceRoot);
      this.isInitialized = true;

      logger.debug(
        LogCategory.DATA,
        'SessionEventProvider initialized successfully',
        'initialize',
        undefined,
        LogPathway.DATA_INGESTION
      );
    } catch (error) {
      logger.error(
        LogCategory.DATA,
        'Failed to initialize SessionEventProvider',
        'initialize',
        { error: error instanceof Error ? error.message : String(error) }
      );
      throw error;
    }
  }

  /**
   * Check if provider is healthy
   */
  async isHealthy(): Promise<boolean> {
    if (!this.isInitialized || !this.fileSystem) {
      return false;
    }

    try {
      // Simple health check - try to get month directories
      await this.fileSystem.getMonthDirectories();
      return true;
    } catch (error) {
      logger.warn(
        LogCategory.DATA,
        'SessionEventProvider health check failed',
        'isHealthy',
        { error: error instanceof Error ? error.message : String(error) }
      );
      return false;
    }
  }

  /**
   * Fetch session journals and transform to CanonicalEvent[]
   * This is THE transformation boundary
   */
  async fetchEvents(context: ProviderContext): Promise<CanonicalEvent[]> {
    if (!this.isInitialized || !this.fileSystem) {
      throw new Error('SessionEventProvider not initialized');
    }

    try {
      logger.debug(
        LogCategory.DATA,
        'Fetching session journals',
        'fetchEvents',
        undefined,
        LogPathway.DATA_INGESTION
      );

      const sessions = await this.fileSystem.loadAllSessions();

      logger.debug(
        LogCategory.DATA,
        'Session journals loaded from filesystem',
        'fetchEvents',
        { count: sessions.length },
        LogPathway.DATA_INGESTION
      );

      // Transform to CanonicalEvents
      const events = sessions.map(session => this.transformToCanonicalEvent(session));

      logger.debug(
        LogCategory.DATA,
        'Session journals transformed to CanonicalEvents',
        'fetchEvents',
        { count: events.length },
        LogPathway.DATA_INGESTION
      );

      return events;
    } catch (error) {
      logger.error(
        LogCategory.DATA,
        'Failed to fetch session journals',
        'fetchEvents',
        { error: error instanceof Error ? error.message : String(error) }
      );
      throw error;
    }
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    logger.debug(
      LogCategory.DATA,
      'Disposing SessionEventProvider',
      'dispose',
      undefined,
      LogPathway.DATA_INGESTION
    );

    this.fileSystem = null;
    this.isInitialized = false;
  }

  /**
   * Transform SessionJournal to CanonicalEvent
   * @private
   */
  private transformToCanonicalEvent(session: SessionJournal): CanonicalEvent {
    // Create author (agent - sessions are created by agents)
    const author: Author = {
      id: 'agent',
      name: 'Coding Agent',
      email: 'agent@local',
      username: 'agent'
    };

    // Build description from summary or first 200 chars of content
    const description = session.summary ||
      (session.content ? this.truncateContent(session.content, 200) : 'Session journal');

    // Create impact metrics based on files modified
    const filesChanged = session.filesModified?.length || 0;
    const impact: ImpactMetrics = {
      filesChanged,
      linesAdded: 0, // Not tracked in session journals
      linesRemoved: 0
    };

    // Parse timestamps and calculate duration
    const startTime = new Date(session.startTime);
    const endTime = new Date(session.endTime);
    const duration = endTime.getTime() - startTime.getTime();

    // Build canonical event
    const event: CanonicalEvent = {
      // Identity
      id: session.id,
      canonicalId: `${this.id}:${session.id}`,
      providerId: this.id,
      type: EventType.SESSION_JOURNAL,

      // Temporal - use startTime as primary timestamp
      timestamp: startTime,

      // Content
      title: session.title,
      description,

      // Attribution
      author,

      // Context - Git (not applicable for sessions)
      branches: [],
      tags: [
        'session-journal',
        ...(session.tags || [])
      ],

      // Relationships (for DAG construction)
      parentIds: [], // Session events have no parent relationships

      // Impact
      impact,

      // Metadata (extensible for provider-specific data)
      metadata: {
        sessionId: session.id,
        summary: session.summary,
        filesModified: session.filesModified,
        knowledgeItemsUsed: session.knowledgeItemsUsed,
        filePath: session.filePath,
        // Session-specific temporal data for timeline bar rendering
        startTime: session.startTime,  // ISO string
        endTime: session.endTime,      // ISO string
        duration: duration,             // milliseconds
        durationFormatted: this.formatDuration(duration),
        // Full content for popup display
        content: session.content        // Markdown body
      },

      // Labels
      labels: ['agent-created']
    };

    return event;
  }

  /**
   * Truncate content to specified length
   * @private
   */
  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) {
      return content;
    }

    return content.substring(0, maxLength).trim() + '...';
  }

  /**
   * Format duration in milliseconds to human-readable string
   * @private
   */
  private formatDuration(ms: number): string {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return '< 1m';
    }
  }
}
