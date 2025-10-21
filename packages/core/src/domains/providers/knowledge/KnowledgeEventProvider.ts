/**
 * KnowledgeEventProvider - Knowledge Event Timeline Integration
 *
 * Transforms knowledge events into CanonicalEvents for timeline visualization.
 * Knowledge events track when users apply/remove knowledge items and when
 * agents create new learnings.
 *
 * Data Flow:
 * .agent-brain/events/knowledge-events.json → KnowledgeEventStorage
 * → KnowledgeEventProvider → CanonicalEvent[] → Timeline
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
import { KnowledgeEventStorage } from '../../events/KnowledgeEventStorage';
import { KnowledgeEventRecord } from '../../events/types';
import { logger, LogCategory, LogPathway } from '../../../infrastructure/logging/Logger';

export class KnowledgeEventProvider implements IDataProvider {
  public readonly id = 'knowledge-events';
  public readonly name = 'Knowledge Events';
  public readonly version = '1.0.0';

  public readonly capabilities: ProviderCapabilities = {
    supportsRealTimeUpdates: false,
    supportsHistoricalData: true,
    supportsFiltering: true,
    supportsSearch: true,
    supportsAuthentication: false,
    supportsWriteOperations: false,
    supportedEventTypes: [
      EventType.KNOWLEDGE_APPLIED,
      EventType.KNOWLEDGE_REMOVED,
      EventType.KNOWLEDGE_CREATED
    ]
  };

  private storage: KnowledgeEventStorage | null = null;
  private config?: ProviderConfig;
  private isInitialized = false;

  /**
   * Initialize the provider
   */
  async initialize(config: ProviderConfig): Promise<void> {
    try {
      logger.debug(
        LogCategory.DATA,
        'Initializing KnowledgeEventProvider',
        'initialize',
        { config },
        LogPathway.DATA_INGESTION
      );

      this.config = config;
      
      // Get workspace root from config settings
      const workspaceRoot = config.settings?.workspaceRoot || config.settings?.storagePath;
      if (!workspaceRoot) {
        throw new Error('KnowledgeEventProvider requires workspaceRoot in config.settings');
      }

      this.storage = new KnowledgeEventStorage(workspaceRoot);
      this.isInitialized = true;

      logger.debug(
        LogCategory.DATA,
        'KnowledgeEventProvider initialized successfully',
        'initialize',
        undefined,
        LogPathway.DATA_INGESTION
      );
    } catch (error) {
      logger.error(
        LogCategory.DATA,
        'Failed to initialize KnowledgeEventProvider',
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
    if (!this.isInitialized || !this.storage) {
      return false;
    }

    try {
      // Simple health check - try to load events
      await this.storage.loadAll();
      return true;
    } catch (error) {
      logger.warn(
        LogCategory.DATA,
        'KnowledgeEventProvider health check failed',
        'isHealthy',
        { error: error instanceof Error ? error.message : String(error) }
      );
      return false;
    }
  }

  /**
   * Fetch knowledge events and transform to CanonicalEvent[]
   * This is THE transformation boundary
   */
  async fetchEvents(context: ProviderContext): Promise<CanonicalEvent[]> {
    if (!this.isInitialized || !this.storage) {
      throw new Error('KnowledgeEventProvider not initialized');
    }

    try {
      logger.debug(
        LogCategory.DATA,
        'Fetching knowledge events',
        'fetchEvents',
        undefined,
        LogPathway.DATA_INGESTION
      );

      const records = await this.storage.loadAll();

      logger.debug(
        LogCategory.DATA,
        'Knowledge events loaded from storage',
        'fetchEvents',
        { count: records.length },
        LogPathway.DATA_INGESTION
      );

      // Transform to CanonicalEvents
      const events = records.map(record => this.transformToCanonicalEvent(record));

      logger.debug(
        LogCategory.DATA,
        'Knowledge events transformed to CanonicalEvents',
        'fetchEvents',
        { count: events.length },
        LogPathway.DATA_INGESTION
      );

      return events;
    } catch (error) {
      logger.error(
        LogCategory.DATA,
        'Failed to fetch knowledge events',
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
      'Disposing KnowledgeEventProvider',
      'dispose',
      undefined,
      LogPathway.DATA_INGESTION
    );

    this.storage = null;
    this.isInitialized = false;
  }

  /**
   * Transform KnowledgeEventRecord to CanonicalEvent
   * @private
   */
  private transformToCanonicalEvent(record: KnowledgeEventRecord): CanonicalEvent {
    // Map event type
    const eventType = this.mapEventType(record.type);

    // Create author (user or agent)
    const author: Author = {
      id: record.actor,
      name: record.actor === 'user' ? 'User' : 'Agent',
      email: record.actor === 'user' ? 'user@local' : 'agent@local',
      username: record.actor
    };

    // Build description
    const description = this.buildDescription(record);

    // Create impact metrics (minimal for knowledge events)
    const impact: ImpactMetrics = {
      filesChanged: 1, // The knowledge item file or CLAUDE.md
      linesAdded: 0,
      linesRemoved: 0
    };

    // Build canonical event
    const event: CanonicalEvent = {
      // Identity
      id: record.id,
      canonicalId: `${this.id}:${record.id}`,
      providerId: this.id,
      type: eventType,

      // Temporal
      timestamp: new Date(record.timestamp),

      // Content
      title: record.knowledgeItemTitle,
      description,

      // Attribution
      author,

      // Context - Git (not applicable for knowledge events)
      branches: [],
      tags: [
        'knowledge-event',
        record.type,
        record.knowledgeItemType,
        record.actor
      ],

      // Relationships (for DAG construction)
      parentIds: [], // Knowledge events have no parent relationships

      // Impact
      impact,

      // Metadata (extensible for provider-specific data)
      metadata: {
        knowledgeEventType: record.type,
        knowledgeItemId: record.knowledgeItemId,
        knowledgeItemType: record.knowledgeItemType,
        targetFile: record.targetFile,
        actor: record.actor
      },

      // Labels
      labels: [record.knowledgeItemType, record.actor]
    };

    return event;
  }

  /**
   * Map knowledge event type to EventType enum
   * @private
   */
  private mapEventType(type: 'apply' | 'remove' | 'create'): EventType {
    switch (type) {
      case 'apply':
        return EventType.KNOWLEDGE_APPLIED;
      case 'remove':
        return EventType.KNOWLEDGE_REMOVED;
      case 'create':
        return EventType.KNOWLEDGE_CREATED;
    }
  }

  /**
   * Build human-readable description
   * @private
   */
  private buildDescription(record: KnowledgeEventRecord): string {
    const actorName = record.actor === 'user' ? 'User' : 'Coding agent';
    const typeLabel = record.knowledgeItemType.replace(/-/g, ' ');

    switch (record.type) {
      case 'apply':
        return `${actorName} applied ${typeLabel} "${record.knowledgeItemTitle}" to ${record.targetFile}`;
      case 'remove':
        return `${actorName} removed ${typeLabel} "${record.knowledgeItemTitle}" from ${record.targetFile}`;
      case 'create':
        return `${actorName} created new ${typeLabel} "${record.knowledgeItemTitle}" at ${record.targetFile}`;
    }
  }
}
