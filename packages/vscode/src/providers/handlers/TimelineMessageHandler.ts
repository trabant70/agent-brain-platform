/**
 * TimelineMessageHandler - Handles timeline-related messages
 *
 * Responsibilities:
 * - Data loading and refresh
 * - Filter application
 * - Provider toggle
 * - Color mode changes
 * - Logging configuration
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { DataOrchestrator } from '@agent-brain/core/domains/visualization/orchestration/DataOrchestrator';
import { FilterState } from '@agent-brain/core/domains/events';
import { logger, LogCategory, LogPathway } from '@agent-brain/core/infrastructure/logging/Logger';
import { WebviewLifecycleManager } from '../services/WebviewLifecycleManager';

export interface TimelineHandlerContext {
  orchestrator: DataOrchestrator;
  view: vscode.WebviewView | undefined;
  currentRepoPath: string;
  isOrchestratorInitialized: boolean;
  isWebviewReady: boolean;
  lifecycleManager: WebviewLifecycleManager;
  onI18nRequest?: () => void;  // Callback to send i18n data to webview
}

export class TimelineMessageHandler {
  constructor(private context: TimelineHandlerContext) {}

  /**
   * Handle timeline-related messages
   */
  async handleMessage(message: any): Promise<boolean> {
    switch (message.type) {
      case 'requestData':
        await this.handleRequestData();
        return true;

      case 'updateFilters':
        await this.handleUpdateFilters(message.filters);
        return true;

      case 'toggleProvider':
        await this.handleToggleProvider(message.providerId, message.enabled);
        return true;

      case 'setColorMode':
        await this.handleSetColorMode(message.mode, message.enabledProviders);
        return true;

      case 'refreshData':
        await this.handleRefreshData();
        return true;

      case 'clearCache':
        await this.handleClearCache();
        return true;

      default:
        return false; // Not handled by this handler
    }
  }

  /**
   * Handle requestData message
   */
  private async handleRequestData(): Promise<void> {
    logger.info(
      LogCategory.WEBVIEW,
      'Webview ready, sending initial data',
      'TimelineMessageHandler.handleRequestData',
      { isOrchestratorInitialized: this.context.isOrchestratorInitialized },
      LogPathway.WEBVIEW_MESSAGING
    );

    // Mark webview as ready (both flags for consistency)
    this.context.isWebviewReady = true;
    this.context.lifecycleManager.setWebviewReady(true);

    // Ensure orchestrator is initialized
    if (!this.context.isOrchestratorInitialized) {
      logger.warn(
        LogCategory.WEBVIEW,
        'Orchestrator not initialized when requestData received, initializing now',
        'TimelineMessageHandler.handleRequestData',
        {},
        LogPathway.DATA_INGESTION
      );
      try {
        await this.context.orchestrator.initialize();
        this.context.isOrchestratorInitialized = true;
      } catch (error) {
        logger.error(
          LogCategory.WEBVIEW,
          'Failed to initialize orchestrator on requestData',
          'TimelineMessageHandler.handleRequestData',
          error,
          LogPathway.DATA_INGESTION
        );
        this.sendMessage({
          type: 'error',
          message: `Failed to initialize: ${error}`
        });
        return;
      }
    }

    // Send i18n data first (webview needs this for initial render)
    if (this.context.onI18nRequest) {
      this.context.onI18nRequest();
    }

    // Send logging configuration (webview is now ready)
    this.sendLoggingConfig();
    // Then send timeline data
    await this.loadTimelineForActiveFile();
  }

  /**
   * Handle updateFilters message
   */
  private async handleUpdateFilters(filters: FilterState): Promise<void> {
    logger.debug(
      LogCategory.WEBVIEW,
      'Received updateFilters message from webview',
      'TimelineMessageHandler.handleUpdateFilters',
      filters,
      LogPathway.WEBVIEW_MESSAGING
    );
    await this.applyFilters(filters);
  }

  /**
   * Handle toggleProvider message
   */
  private async handleToggleProvider(providerId: string, enabled: boolean): Promise<void> {
    logger.debug(
      LogCategory.WEBVIEW,
      `Received toggleProvider: ${providerId} enabled=${enabled}`,
      'TimelineMessageHandler.handleToggleProvider',
      undefined,
      LogPathway.WEBVIEW_MESSAGING
    );
    this.context.orchestrator.setProviderEnabled(providerId, enabled);
    await this.loadTimelineForActiveFile(true); // Force refresh with new provider state
  }

  /**
   * Handle setColorMode message
   */
  private async handleSetColorMode(mode: string, enabledProviders?: string[]): Promise<void> {
    logger.debug(
      LogCategory.WEBVIEW,
      `Received setColorMode: ${mode}`,
      'TimelineMessageHandler.handleSetColorMode',
      { mode, enabledProviders },
      LogPathway.WEBVIEW_MESSAGING
    );
    // Send message to webview to update color mode with provider info
    this.context.view?.webview.postMessage({
      type: 'colorModeChanged',
      mode: mode,
      enabledProviders: enabledProviders || this.context.orchestrator.getEnabledProviderIds()
    });
  }

  /**
   * Handle refreshData message
   */
  private async handleRefreshData(): Promise<void> {
    await this.loadTimelineForActiveFile(true);
  }

  /**
   * Handle clearCache message
   */
  private async handleClearCache(): Promise<void> {
    this.context.orchestrator.invalidateCache();
    await this.loadTimelineForActiveFile(true);
  }

  /**
   * Load timeline for active file
   */
  async loadTimelineForActiveFile(forceRefresh = false): Promise<void> {
    try {
      // Get current file path
      let activeFile = vscode.window.activeTextEditor?.document.uri.fsPath;
      let repoPath: string;
      let fileName: string;

      if (!activeFile) {
        // No active file - try to use first workspace folder
        const workspaceFolders = vscode.workspace.workspaceFolders;

        if (!workspaceFolders || workspaceFolders.length === 0) {
          this.sendMessage({
            type: 'info',
            message: 'Open a folder or workspace to view repository timeline'
          });
          return;
        }

        // Use first workspace folder as the repository
        repoPath = workspaceFolders[0].uri.fsPath;
        fileName = 'All Files'; // No specific file selected
      } else {
        // Active file exists - use its directory as repo path
        repoPath = path.dirname(activeFile);
        fileName = path.basename(activeFile);
      }

      this.context.currentRepoPath = repoPath;

      // Send loading state
      this.sendMessage({
        type: 'loading',
        isLoading: true
      });

      // Fetch events with filters from orchestrator
      const result = await this.context.orchestrator.getEventsWithFilters(repoPath, undefined, forceRefresh);

      // Get enabled provider IDs for sync mode availability
      const enabledProviders = this.context.orchestrator.getEnabledProviderIds();

      // Send to webview
      logger.debug(
        LogCategory.WEBVIEW,
        `Sending timelineData to webview: ${result.allEvents.length} total, ${result.filteredEvents.length} filtered`,
        'TimelineMessageHandler.loadTimelineForActiveFile',
        undefined,
        LogPathway.WEBVIEW_MESSAGING
      );

      // Serialize events for postMessage (convert Date objects to strings)
      const serializeEvent = (event: any) => {
        return {
          ...event,
          timestamp: event.timestamp instanceof Date ? event.timestamp.toISOString() : event.timestamp,
          ingestedAt: event.ingestedAt instanceof Date ? event.ingestedAt.toISOString() : event.ingestedAt,
          sources: event.sources?.map((s: any) => ({
            ...s,
            timestamp: s.timestamp instanceof Date ? s.timestamp.toISOString() : s.timestamp
          }))
        };
      };

      const serializedAllEvents = result.allEvents.map(serializeEvent);
      const serializedFilteredEvents = result.filteredEvents.map(serializeEvent);

      this.sendMessage({
        type: 'timelineData',
        data: {
          allEvents: serializedAllEvents,
          filteredEvents: serializedFilteredEvents,
          filterOptions: result.filterOptions,
          appliedFilters: {
            ...result.appliedFilters,
            enabledProviders
          },
          repoPath,
          activeFile: fileName
        }
      });

    } catch (error) {
      this.sendMessage({
        type: 'error',
        message: `Failed to load timeline: ${error}`
      });
    }
  }

  /**
   * Apply filters and send filtered data
   */
  private async applyFilters(filters: FilterState): Promise<void> {
    try {
      if (!this.context.currentRepoPath) {
        return;
      }

      // Persist filter state for this repository
      this.context.orchestrator.updateFilterState(this.context.currentRepoPath, filters);

      // Get events with new filters
      const result = await this.context.orchestrator.getEventsWithFilters(
        this.context.currentRepoPath,
        filters,
        false
      );

      // Get enabled provider IDs for sync mode availability
      const enabledProviders = this.context.orchestrator.getEnabledProviderIds();

      // Send filtered data to webview
      logger.debug(
        LogCategory.WEBVIEW,
        `Sending filteredData to webview: ${result.allEvents.length} total, ${result.filteredEvents.length} filtered`,
        'TimelineMessageHandler.applyFilters',
        undefined,
        LogPathway.WEBVIEW_MESSAGING
      );

      this.sendMessage({
        type: 'filteredData',
        data: {
          allEvents: result.allEvents,
          filteredEvents: result.filteredEvents,
          filterOptions: result.filterOptions,
          appliedFilters: {
            ...result.appliedFilters,
            enabledProviders
          },
          repoPath: this.context.currentRepoPath
        }
      });

    } catch (error) {
      this.sendMessage({
        type: 'error',
        message: `Failed to apply filters: ${error}`
      });
    }
  }

  /**
   * Send logging configuration to webview
   */
  private sendLoggingConfig(): void {
    const config = vscode.workspace.getConfiguration('agentBrain.logging');

    this.sendMessage({
      type: 'loggingConfig',
      config: {
        pathwayMode: config.get<string>('pathwayMode', 'exclusive'),
        enabledPathways: config.get<string[]>('enabledPathways', [
          'GUID_INIT', 'VALID', 'PLAN', 'MINI', 'DIAG',
          'GOLD', 'PROMPT', 'EVT_FWD', 'KNOWLEDGE'
        ]),
        logLevel: config.get<string>('logLevel', 'INFO')
      }
    });
  }

  /**
   * Send message to webview
   */
  private sendMessage(message: any): void {
    if (this.context.view) {
      this.context.view.webview.postMessage(message);
    }
  }
}
