/**
 * ProviderCoordinator
 *
 * Manages provider lifecycle and coordination.
 * Responsible for:
 * - Provider registration and initialization
 * - Provider health monitoring
 * - Fetching events from providers
 * - Provider enablement/disablement
 */

import {
  ProviderRegistry,
  GitProvider,
  GitHubProvider,
  KnowledgeEventProvider,
  SessionEventProvider
} from '../../../providers';
import { CanonicalEvent, ProviderContext } from '../../../events';
import { logger, LogCategory, LogPathway } from '../../../../infrastructure/logging';

export interface ProviderSettings {
  gitLocal: boolean;
  github: boolean;
  knowledgeEvents: boolean;
  sessionJournals: boolean;
}

export class ProviderCoordinator {
  private providerRegistry: ProviderRegistry;
  private providerSettings: ProviderSettings;
  private workspaceRoot: string;

  constructor(workspaceRoot: string, providerSettings: ProviderSettings) {
    this.workspaceRoot = workspaceRoot;
    this.providerSettings = providerSettings;
    this.providerRegistry = new ProviderRegistry();
  }

  /**
   * Initialize and register all providers
   */
  async initialize(): Promise<void> {
    logger.info(
      LogCategory.ORCHESTRATION,
      'Initializing providers',
      'ProviderCoordinator.initialize',
      { providerSettings: this.providerSettings },
      LogPathway.DATA_INGESTION
    );

    // Register Git Local provider (conditionally)
    if (this.providerSettings.gitLocal) {
      await this.registerGitLocalProvider();
    } else {
      logger.info(
        LogCategory.ORCHESTRATION,
        'Git Local provider disabled by settings',
        'ProviderCoordinator.initialize'
      );
    }

    // Register GitHub provider (always register, but set enabled based on settings)
    await this.registerGitHubProvider();

    // Register Knowledge Event provider (conditionally)
    if (this.providerSettings.knowledgeEvents) {
      await this.registerKnowledgeEventProvider();
    } else {
      logger.info(
        LogCategory.ORCHESTRATION,
        'Knowledge Event provider disabled by settings',
        'ProviderCoordinator.initialize'
      );
    }

    // Register Session Event provider (conditionally)
    if (this.providerSettings.sessionJournals) {
      await this.registerSessionEventProvider();
    } else {
      logger.info(
        LogCategory.ORCHESTRATION,
        'Session Event provider disabled by settings',
        'ProviderCoordinator.initialize'
      );
    }

    logger.info(
      LogCategory.ORCHESTRATION,
      'Provider initialization complete',
      'ProviderCoordinator.initialize',
      { registeredProviders: this.getEnabledProviderIds() },
      LogPathway.DATA_INGESTION
    );
  }

  /**
   * Register Git Local provider
   */
  private async registerGitLocalProvider(): Promise<void> {
    logger.info(
      LogCategory.ORCHESTRATION,
      'Registering Git Local provider',
      'ProviderCoordinator.registerGitLocalProvider'
    );

    try {
      const gitProvider = new GitProvider();
      await this.providerRegistry.registerProvider(gitProvider, {
        enabled: true,
        priority: 1
      });

      logger.info(
        LogCategory.ORCHESTRATION,
        'Git Local provider registered successfully',
        'ProviderCoordinator.registerGitLocalProvider'
      );
    } catch (error) {
      logger.error(
        LogCategory.ORCHESTRATION,
        `Failed to register Git Local provider: ${error}`,
        'ProviderCoordinator.registerGitLocalProvider'
      );
      // Continue without git - not critical
    }
  }

  /**
   * Register GitHub provider
   */
  private async registerGitHubProvider(): Promise<void> {
    logger.info(
      LogCategory.ORCHESTRATION,
      `Registering GitHub provider (enabled: ${this.providerSettings.github})`,
      'ProviderCoordinator.registerGitHubProvider'
    );

    try {
      const githubProvider = new GitHubProvider();
      await this.providerRegistry.registerProvider(githubProvider, {
        enabled: this.providerSettings.github,
        priority: 2
      });

      logger.info(
        LogCategory.ORCHESTRATION,
        `GitHub provider registered successfully (enabled: ${this.providerSettings.github})`,
        'ProviderCoordinator.registerGitHubProvider'
      );
    } catch (error) {
      logger.error(
        LogCategory.ORCHESTRATION,
        `Failed to register GitHub provider: ${error}`,
        'ProviderCoordinator.registerGitHubProvider'
      );
      // Continue without GitHub provider
    }
  }

  /**
   * Register Knowledge Event provider
   */
  private async registerKnowledgeEventProvider(): Promise<void> {
    logger.info(
      LogCategory.ORCHESTRATION,
      '>>> PROVIDER COORDINATOR: Registering Knowledge Event provider <<<',
      'ProviderCoordinator.registerKnowledgeEventProvider',
      { workspaceRoot: this.workspaceRoot },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      const knowledgeProvider = new KnowledgeEventProvider();
      await this.providerRegistry.registerProvider(knowledgeProvider, {
        enabled: true,
        priority: 3,
        settings: {
          workspaceRoot: this.workspaceRoot
        }
      });

      logger.info(
        LogCategory.ORCHESTRATION,
        '>>> PROVIDER COORDINATOR: Knowledge Event provider registered successfully <<<',
        'ProviderCoordinator.registerKnowledgeEventProvider',
        { workspaceRoot: this.workspaceRoot },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    } catch (error) {
      logger.error(
        LogCategory.ORCHESTRATION,
        `>>> PROVIDER COORDINATOR: Failed to register Knowledge Event provider: ${error} <<<`,
        'ProviderCoordinator.registerKnowledgeEventProvider',
        { error },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      // Continue without knowledge events - not critical
    }
  }

  /**
   * Register Session Event provider
   */
  private async registerSessionEventProvider(): Promise<void> {
    logger.info(
      LogCategory.ORCHESTRATION,
      'Registering Session Event provider',
      'ProviderCoordinator.registerSessionEventProvider'
    );

    try {
      const sessionProvider = new SessionEventProvider();
      await this.providerRegistry.registerProvider(sessionProvider, {
        enabled: true,
        priority: 4,
        settings: {
          workspaceRoot: this.workspaceRoot
        }
      });

      logger.info(
        LogCategory.ORCHESTRATION,
        'Session Event provider registered successfully',
        'ProviderCoordinator.registerSessionEventProvider',
        { workspaceRoot: this.workspaceRoot }
      );
    } catch (error) {
      logger.error(
        LogCategory.ORCHESTRATION,
        `Failed to register Session Event provider: ${error}`,
        'ProviderCoordinator.registerSessionEventProvider'
      );
      // Continue without session events - not critical
    }
  }

  /**
   * Fetch events from all healthy providers and deduplicate
   */
  async fetchFromProviders(repoPath: string, eventMatcher: any): Promise<CanonicalEvent[]> {
    const providers = this.providerRegistry.getHealthyProviders();
    const allEvents: CanonicalEvent[] = [];

    logger.info(
      LogCategory.ORCHESTRATION,
      `>>> PROVIDER COORDINATOR: Fetching from ${providers.length} healthy providers <<<`,
      'ProviderCoordinator.fetchFromProviders',
      { providerIds: providers.map(p => p.id) },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    for (const provider of providers) {
      try {
        logger.info(
          LogCategory.ORCHESTRATION,
          `>>> PROVIDER COORDINATOR: Calling fetchEvents on ${provider.id} <<<`,
          'ProviderCoordinator.fetchFromProviders',
          { providerId: provider.id },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );

        const context: ProviderContext = {
          repoPath,
          workspaceRoot: repoPath,
          activeFile: undefined
        };

        const events = await provider.fetchEvents(context);
        allEvents.push(...events);

        logger.info(
          LogCategory.ORCHESTRATION,
          `>>> PROVIDER COORDINATOR: Provider ${provider.id} returned ${events.length} events <<<`,
          'ProviderCoordinator.fetchFromProviders',
          { providerId: provider.id, eventCount: events.length },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
      } catch (error) {
        logger.error(
          LogCategory.ORCHESTRATION,
          `>>> PROVIDER COORDINATOR: Provider ${provider.id} FAILED <<<`,
          'ProviderCoordinator.fetchFromProviders',
          { providerId: provider.id, error },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        // Continue with other providers
      }
    }

    // ALWAYS deduplicate to ensure sources[] is populated
    logger.info(
      LogCategory.ORCHESTRATION,
      `Deduplicating ${allEvents.length} events from ${providers.length} provider(s)`,
      'ProviderCoordinator.fetchFromProviders',
      undefined,
      LogPathway.DATA_INGESTION
    );

    const result = eventMatcher.deduplicateEvents(allEvents);

    logger.info(
      LogCategory.ORCHESTRATION,
      `Deduplication: ${result.stats.totalInput} → ${result.stats.totalOutput} events (${result.stats.duplicatesRemoved} duplicates, ${result.stats.mergedCount} merged)`,
      'ProviderCoordinator.fetchFromProviders',
      undefined,
      LogPathway.DATA_INGESTION
    );

    return result.events;
  }

  /**
   * Enable or disable a provider
   */
  setProviderEnabled(providerId: string, enabled: boolean): void {
    logger.info(
      LogCategory.ORCHESTRATION,
      `Setting provider ${providerId} enabled=${enabled}`,
      'ProviderCoordinator.setProviderEnabled'
    );

    this.providerRegistry.setProviderEnabled(providerId, enabled);
  }

  /**
   * Check if a provider is enabled
   */
  isProviderEnabled(providerId: string): boolean {
    return this.providerRegistry.isProviderEnabled(providerId);
  }

  /**
   * Get list of enabled provider IDs
   */
  getEnabledProviderIds(): string[] {
    return this.providerRegistry.getEnabledProviders().map(p => p.id);
  }

  /**
   * Get provider registry (for testing/debugging)
   */
  getProviderRegistry(): ProviderRegistry {
    return this.providerRegistry;
  }
}
