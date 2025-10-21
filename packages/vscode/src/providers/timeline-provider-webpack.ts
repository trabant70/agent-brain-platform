/**
 * Timeline Provider - Simplified Extension Host
 *
 * NEW ARCHITECTURE:
 * - Works directly with CanonicalEvent[]
 * - No transformations, just pass-through
 * - Simple message handling
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { DataOrchestrator } from '@agent-brain/core/domains/visualization/orchestration/DataOrchestrator';
import { CanonicalEvent, FilterState } from '@agent-brain/core/domains/events';
import { logger, LogCategory, LogPathway } from '@agent-brain/core/infrastructure/logging/Logger';

export class TimelineProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'repoTimeline.evolutionView';

  private _view?: vscode.WebviewView;
  private orchestrator: DataOrchestrator;
  private extensionUri: vscode.Uri;
  private currentRepoPath: string = '';
  private isOrchestratorInitialized: boolean = false;
  private isWebviewReady: boolean = false;
  private knowledgeManager: any = null;  // KnowledgeManager instance

  constructor(extensionUri: vscode.Uri, storagePath?: string) {
    this.extensionUri = extensionUri;
    this.orchestrator = new DataOrchestrator({
      storagePath: storagePath || './.agent-brain',
      providerSettings: this.getProviderSettings()
    });
  }

  /**
   * Get provider enablement settings from VSCode configuration
   * @private
   */
  private getProviderSettings() {
    const config = vscode.workspace.getConfiguration('agentBrain.providers');
    return {
      gitLocal: config.get<boolean>('gitLocal.enabled', true),
      github: config.get<boolean>('github.enabled', false),
      knowledgeEvents: config.get<boolean>('knowledgeEvents.enabled', true),
      sessionJournals: config.get<boolean>('sessionJournals.enabled', true)
    };
  }

  /**
   * Set the knowledge manager instance
   */
  public setKnowledgeManager(manager: any): void {
    this.knowledgeManager = manager;
    logger.debug(LogCategory.EXTENSION, 'Knowledge Manager connected to TimelineProvider');

    // Send initial knowledge data to webview if it's already ready
    if (this.isWebviewReady && this._view) {
      this.sendKnowledgeData();
    }
  }

  /**
   * Initialize provider
   */
  async initialize(): Promise<void> {
    await this.orchestrator.initialize();
  }

  /**
   * Resolve webview view
   */
  public async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    // Configure webview
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };

    // Set HTML content
    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    // Note: Don't send logging config here - too early (webview not ready yet)
    // It will be sent when webview sends 'requestData' message

    // Initialize Agent Brain Bridge if core is available
    if (this.agentBrainCore) {
      logger.info(
        LogCategory.EXTENSION,
        'Initializing Agent Brain Bridge',
        'TimelineProvider.resolveWebviewView',
        {},
        LogPathway.GUIDANCE_INIT
      );

      this.agentBrainBridge = new AgentBrainBridge({
        core: this.agentBrainCore,
        webview: webviewView.webview
      });
      this.agentBrainBridge.initialize();

      logger.info(
        LogCategory.EXTENSION,
        'Agent Brain Bridge initialized successfully',
        'TimelineProvider.resolveWebviewView',
        {},
        LogPathway.GUIDANCE_INIT
      );
    } else {
      logger.warn(
        LogCategory.EXTENSION,
        'Agent Brain Core not available - guidance features will be disabled',
        'TimelineProvider.resolveWebviewView'
      );
    }

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      logger.info(
        LogCategory.WEBVIEW,
        `🔔 Message received by onDidReceiveMessage listener: ${message.type}`,
        'onDidReceiveMessage',
        { type: message.type },
        LogPathway.WEBVIEW_MESSAGING
      );

      // Route Agent Brain guidance and knowledge requests to bridge
      if (message.type && (message.type.startsWith('guidance.') || message.type.startsWith('knowledge.'))) {
        if (this.agentBrainBridge) {
          await this.agentBrainBridge.handleRequest(message);
        } else {
          logger.warn(
            LogCategory.EXTENSION,
            'Agent Brain not available - cannot handle request',
            'onDidReceiveMessage',
            { type: message.type }
          );
          // Send error back to webview
          webviewView.webview.postMessage({
            type: 'error',
            requestId: message.requestId,
            error: 'Agent Brain features not available. Please open a workspace folder.'
          });
        }
        return; // Early return, don't process further
      }

      // Handle non-guidance messages normally
      await this.handleMessage(message);
    });

    logger.info(
      LogCategory.WEBVIEW,
      '✅ Message listener attached to webview',
      'resolveWebviewView',
      undefined,
      LogPathway.WEBVIEW_MESSAGING
    );

    // Send resize message when view becomes visible (catches window focus restoration)
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        logger.info(
          LogCategory.WEBVIEW,
          'Webview became visible',
          'onDidChangeVisibility',
          { isWebviewReady: this.isWebviewReady },
          LogPathway.WEBVIEW_MESSAGING
        );
        // Longer delay to let VS Code finish layout after focus restoration
        // This is critical when returning from other windows (Terminal, etc.)
        setTimeout(() => {
          this.sendMessage({ type: 'resize' });

          // Re-send knowledge data when webview becomes visible
          // This fixes the issue where data disappears when switching VSCode tabs
          if (this.knowledgeManager) {
            logger.debug(
              LogCategory.WEBVIEW,
              'Re-sending knowledge data after visibility change',
              'onDidChangeVisibility',
              {},
              LogPathway.KNOWLEDGE_MANAGEMENT
            );
            this.sendKnowledgeData();
            this.sendClaudeMdFiles();
          }
        }, 150); // Increased from 50ms to allow full layout settlement
      } else {
        logger.info(
          LogCategory.WEBVIEW,
          'Webview became hidden',
          'onDidChangeVisibility',
          {},
          LogPathway.WEBVIEW_MESSAGING
        );
        // Don't reset ready flag - webview state persists when hidden
        // this.isWebviewReady = false;  // REMOVED: This was causing data loss
      }
    });

    // IMPORTANT: Initialize orchestrator only if not already initialized
    if (!this.isOrchestratorInitialized) {
      try {
        logger.info(
          LogCategory.EXTENSION,
          'Initializing orchestrator for first time',
          'TimelineProvider.resolveWebviewView',
          {},
          LogPathway.DATA_INGESTION
        );
        await this.orchestrator.initialize();
        this.isOrchestratorInitialized = true;
      } catch (error) {
        logger.error(
          LogCategory.EXTENSION,
          'Failed to initialize orchestrator',
          'TimelineProvider.resolveWebviewView',
          error,
          LogPathway.DATA_INGESTION
        );
        this.sendMessage({
          type: 'error',
          message: `Failed to initialize: ${error}`
        });
        return;
      }
    } else {
      logger.info(
        LogCategory.EXTENSION,
        'Orchestrator already initialized, reusing existing instance',
        'TimelineProvider.resolveWebviewView',
        {},
        LogPathway.DATA_INGESTION
      );
    }

    // DO NOT load data here - wait for webview to send 'requestData' message
    // This prevents race condition where data is sent before webview is ready

    // Listen for editor changes
    vscode.window.onDidChangeActiveTextEditor(async () => {
      // Only load if webview is ready
      if (this.isWebviewReady) {
        await this.loadTimelineForActiveFile();
      }
    });
  }

  /**
   * Handle messages from webview
   */
  private async handleMessage(message: any): Promise<void> {
    // Log all incoming messages for debugging
    logger.debug(
      LogCategory.WEBVIEW,
      `Received message from webview: ${message.type}`,
      'handleMessage',
      { type: message.type, hasData: !!message.data },
      LogPathway.WEBVIEW_MESSAGING
    );

    try {
      switch (message.type) {
        case 'requestData':
          logger.info(
            LogCategory.WEBVIEW,
            'Webview ready, sending initial data',
            'handleMessage.requestData',
            { isOrchestratorInitialized: this.isOrchestratorInitialized },
            LogPathway.WEBVIEW_MESSAGING
          );

          // Mark webview as ready
          this.isWebviewReady = true;

          // Ensure orchestrator is initialized
          if (!this.isOrchestratorInitialized) {
            logger.warn(
              LogCategory.WEBVIEW,
              'Orchestrator not initialized when requestData received, initializing now',
              'handleMessage.requestData',
              {},
              LogPathway.DATA_INGESTION
            );
            try {
              await this.orchestrator.initialize();
              this.isOrchestratorInitialized = true;
            } catch (error) {
              logger.error(
                LogCategory.WEBVIEW,
                'Failed to initialize orchestrator on requestData',
                'handleMessage.requestData',
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

          // Send logging configuration first (webview is now ready)
          this.sendLoggingConfig();
          // Then send timeline data
          await this.loadTimelineForActiveFile();
          break;

        case 'updateFilters':
          logger.debug(LogCategory.WEBVIEW, 'Received updateFilters message from webview', 'handleMessage', message.filters, LogPathway.WEBVIEW_MESSAGING);
          await this.applyFilters(message.filters);
          break;

        case 'toggleProvider':
          logger.debug(LogCategory.WEBVIEW, `Received toggleProvider: ${message.providerId} enabled=${message.enabled}`, 'handleMessage', undefined, LogPathway.WEBVIEW_MESSAGING);
          this.orchestrator.setProviderEnabled(message.providerId, message.enabled);
          await this.loadTimelineForActiveFile(true); // Force refresh with new provider state
          break;

        case 'setColorMode':
          logger.debug(LogCategory.WEBVIEW, `Received setColorMode: ${message.mode}`, 'handleMessage', { mode: message.mode, enabledProviders: message.enabledProviders }, LogPathway.WEBVIEW_MESSAGING);
          // Send message to webview to update color mode with provider info
          this._view?.webview.postMessage({
            type: 'colorModeChanged',
            mode: message.mode,
            enabledProviders: message.enabledProviders || this.orchestrator.getEnabledProviderIds()
          });
          break;

        case 'refreshData':
          await this.loadTimelineForActiveFile(true);
          break;

        case 'clearCache':
          this.orchestrator.invalidateCache();
          await this.loadTimelineForActiveFile(true);
          break;

        // Knowledge Management Messages
        case 'knowledge:load-request':
          await this.sendKnowledgeData();
          break;

        case 'knowledge:scan-claude-files':
          await this.sendClaudeMdFiles();
          break;

        case 'knowledge:create-item':
          await this.handleCreateKnowledgeItem(message.payload);
          break;

        case 'knowledge:update-item':
          await this.handleUpdateKnowledgeItem(message.payload);
          break;

        case 'knowledge:delete-item':
          await this.handleDeleteKnowledgeItem(message.payload);
          break;

        case 'knowledge:create-template':
          await this.handleCreateTemplate(message.payload);
          break;

        case 'knowledge:update-template':
          await this.handleUpdateTemplate(message.payload);
          break;

        case 'knowledge:apply-template':
          await this.handleApplyTemplate(message.payload);
          break;

        case 'knowledge:apply-selected-items':
          await this.handleApplySelectedItems(message.payload);
          break;

        case 'knowledge:remove-template':
          await this.handleRemoveTemplate(message.payload);
          break;

        case 'knowledge:export-template':
          await this.handleExportTemplate(message.payload);
          break;

        case 'knowledge:import-template':
          await this.handleImportTemplate(message.payload);
          break;

        case 'knowledge:showCreateDialog':
          await this.showCreateKnowledgeItemDialog();
          break;

        // Note: knowledge:showEditDialog removed - edit is now handled entirely in webview
        // using ModalDialog (similar to create), which provides better UX

        default:
          logger.warn(
            LogCategory.WEBVIEW,
            `Unknown message type received: ${message.type}`,
            'handleMessage',
            { type: message.type },
            LogPathway.WEBVIEW_MESSAGING
          );
      }
    } catch (error) {
      logger.error(
        LogCategory.WEBVIEW,
        `Failed to handle message: ${message.type}`,
        'handleMessage',
        { type: message.type, error },
        LogPathway.WEBVIEW_MESSAGING
      );

      this.sendMessage({
        type: 'error',
        message: `Failed to handle ${message.type}: ${error}`
      });
    }
  }

  /**
   * Load timeline for active file
   */
  private async loadTimelineForActiveFile(forceRefresh = false): Promise<void> {
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

      this.currentRepoPath = repoPath;


      // Send loading state
      this.sendMessage({
        type: 'loading',
        isLoading: true
      });

      // Fetch events with filters from orchestrator
      // This uses persisted filter state for this repository (or empty state if first time)
      const result = await this.orchestrator.getEventsWithFilters(repoPath, undefined, forceRefresh);

      // Get enabled provider IDs for sync mode availability
      const enabledProviders = this.orchestrator.getEnabledProviderIds();

      // Send to webview
      logger.debug(LogCategory.WEBVIEW, `Sending timelineData to webview: ${result.allEvents.length} total, ${result.filteredEvents.length} filtered`, 'loadTimelineForActiveFile', undefined, LogPathway.WEBVIEW_MESSAGING);

      // DEBUG: Check sources[] before sending
      const eventsWithSources = result.allEvents.filter((e: any) => e.sources && e.sources.length > 0);
      if (eventsWithSources.length > 0) {
        const sample = eventsWithSources[0];
      }

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

      // DEBUG: Verify sources[] after serialization
      const stillHaveSources = serializedAllEvents.filter((e: any) => e.sources && e.sources.length > 0);

      this.sendMessage({
        type: 'timelineData',
        data: {
          allEvents: serializedAllEvents,
          filteredEvents: serializedFilteredEvents,
          filterOptions: result.filterOptions,
          appliedFilters: {
            ...result.appliedFilters,
            enabledProviders  // Include enabled providers for sync mode detection
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

      if (!this.currentRepoPath) {
        return;
      }

      // Persist filter state for this repository
      this.orchestrator.updateFilterState(this.currentRepoPath, filters);

      // Get events with new filters
      const result = await this.orchestrator.getEventsWithFilters(this.currentRepoPath, filters, false);


      // Get enabled provider IDs for sync mode availability
      const enabledProviders = this.orchestrator.getEnabledProviderIds();

      // Send filtered data to webview
      logger.debug(LogCategory.WEBVIEW, `Sending filteredData to webview: ${result.allEvents.length} total, ${result.filteredEvents.length} filtered`, 'applyFilters', undefined, LogPathway.WEBVIEW_MESSAGING);
      this.sendMessage({
        type: 'filteredData',
        data: {
          allEvents: result.allEvents,
          filteredEvents: result.filteredEvents,
          filterOptions: result.filterOptions,
          appliedFilters: {
            ...result.appliedFilters,
            enabledProviders  // Include enabled providers for sync mode detection
          },
          repoPath: this.currentRepoPath
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
   * Send message to webview
   */
  private sendMessage(message: any): void {
    if (this._view) {
      this._view.webview.postMessage(message);
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
   * Get HTML for webview
   *
   * Loads the webpack-bundled HTML and injects proper CSP and resource URIs.
   * This ensures a single source of truth: the HTML template.
   *
   * CACHE-BUSTING: Adds version parameter to all script URIs to force VSCode
   * to reload webview content when the extension version changes.
   */
  private getHtmlForWebview(webview: vscode.Webview): string {
    // Read the webpack-bundled HTML file
    const htmlPath = vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'webview.html');
    const htmlContent = fs.readFileSync(htmlPath.fsPath, 'utf8');

    // Get extension version + timestamp for aggressive cache busting
    // Timestamp ensures VSCode ALWAYS reloads webview, even with same version
    const packageJsonPath = vscode.Uri.joinPath(this.extensionUri, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath.fsPath, 'utf8'));
    const cacheBuster = `${packageJson.version.replace(/\./g, '-')}-${Date.now()}`; // e.g., "0-1-6-1696615234567"

    // Get CSP source for this webview
    const cspSource = webview.cspSource;

    // Build Content Security Policy
    const csp = `
      default-src 'none';
      style-src ${cspSource} 'unsafe-inline';
      script-src ${cspSource} 'unsafe-eval';
      font-src ${cspSource};
      img-src ${cspSource} data: https:;
    `.replace(/\s+/g, ' ').trim();

    // Inject CSP meta tag into the HTML head
    const htmlWithCSP = htmlContent.replace(
      '<!-- CSP will be injected by provider at runtime -->',
      `<meta http-equiv="Content-Security-Policy" content="${csp}">`
    );

    // Convert script src paths to webview URIs with cache-busting version parameter
    // The bundled HTML has paths like: <script defer src="vendors.js"></script>
    // We transform to: <script defer src="vscode-webview://...vendors.js?v=0-1-5"></script>
    const htmlWithWebviewUris = htmlWithCSP.replace(
      /src="([^"]+\.js)"/g,
      (match, scriptPath) => {
        const scriptUri = webview.asWebviewUri(
          vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', scriptPath)
        );
        // Add version as query parameter for cache busting
        return `src="${scriptUri}?v=${cacheBuster}"`;
      }
    );

    return htmlWithWebviewUris;
  }

  /**
   * Add a runtime event to the timeline
   * Used for real-time session tracking
   *
   * @param event - CanonicalEvent to add (e.g., from session finalization)
   */
  public addRuntimeEvent(event: CanonicalEvent): void {
    try {
      logger.info(LogCategory.EXTENSION, `Adding runtime event to timeline: ${event.type}`, 'addRuntimeEvent', {
        eventId: event.id,
        title: event.title
      });

      // Add event to orchestrator's runtime events
      this.orchestrator.addRuntimeEvent(event);

      // If webview is visible, refresh to show the new event
      if (this._view && this.currentRepoPath) {
        this.loadTimelineForActiveFile(true).catch(error => {
          logger.error(LogCategory.EXTENSION, `Failed to refresh timeline after adding runtime event: ${error}`, 'addRuntimeEvent');
        });
      }
    } catch (error) {
      logger.error(LogCategory.EXTENSION, `Failed to add runtime event: ${error}`, 'addRuntimeEvent');
    }
  }

  // ============================================
  // Knowledge Management Methods
  // ============================================

  /**
   * Send knowledge data to webview
   */
  private async sendKnowledgeData(): Promise<void> {
    logger.debug(
      LogCategory.EXTENSION,
      'Sending knowledge data to webview',
      'TimelineProvider.sendKnowledgeData',
      {
        hasKnowledgeManager: !!this.knowledgeManager,
        hasView: !!this._view,
        isWebviewReady: this.isWebviewReady
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    if (!this.knowledgeManager || !this._view) {
      logger.debug(
        LogCategory.EXTENSION,
        'Cannot send knowledge data - missing manager or view',
        'TimelineProvider.sendKnowledgeData',
        {
          hasKnowledgeManager: !!this.knowledgeManager,
          hasView: !!this._view
        },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      return;
    }

    try {
      const store = this.knowledgeManager.getStore();
      const items = store.getAllItems();
      const templates = store.getAllTemplates();

      logger.info(
        LogCategory.EXTENSION,
        'Retrieved knowledge data from store',
        'TimelineProvider.sendKnowledgeData',
        {
          itemCount: items.length,
          templateCount: templates.length,
          items: items.map((i: any) => ({ id: i.id, type: i.type, title: i.title })),
          templates: templates.map((t: any) => ({ id: t.id, name: t.name, itemCount: t.itemIds?.length }))
        },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      this._view.webview.postMessage({
        type: 'knowledge:loaded',
        payload: { items, templates }
      });

      logger.info(
        LogCategory.EXTENSION,
        'Sent knowledge data to webview successfully',
        'TimelineProvider.sendKnowledgeData',
        {
          itemCount: items.length,
          templateCount: templates.length,
          templateNames: templates.map((t: any) => t.name)
        },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to send knowledge data',
        'TimelineProvider.sendKnowledgeData',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    }
  }

  /**
   * Send claude.md files to webview
   */
  private async sendClaudeMdFiles(): Promise<void> {
    logger.debug(
      LogCategory.EXTENSION,
      'Sending claude.md files to webview',
      'TimelineProvider.sendClaudeMdFiles',
      {
        hasKnowledgeManager: !!this.knowledgeManager,
        hasView: !!this._view
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    if (!this.knowledgeManager || !this._view) {
      logger.debug(
        LogCategory.EXTENSION,
        'Cannot send claude.md files - missing manager or view',
        'TimelineProvider.sendClaudeMdFiles',
        {
          hasKnowledgeManager: !!this.knowledgeManager,
          hasView: !!this._view
        },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      return;
    }

    try {
      const files = await this.knowledgeManager.scanClaudeMdFiles();

      logger.info(
        LogCategory.EXTENSION,
        'Scanned claude.md files',
        'TimelineProvider.sendClaudeMdFiles',
        {
          fileCount: files.length,
          files: files.map((f: any) => ({ path: f.path, contentLength: f.content?.length || 0 }))
        },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      this._view.webview.postMessage({
        type: 'knowledge:claude-files',
        payload: { files }
      });

      logger.info(
        LogCategory.EXTENSION,
        'Sent claude.md files to webview',
        'TimelineProvider.sendClaudeMdFiles',
        { fileCount: files.length },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to send claude.md files',
        'TimelineProvider.sendClaudeMdFiles',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    }
  }

  /**
   * Handle create knowledge item
   */
  private async handleCreateKnowledgeItem(payload: any): Promise<void> {
    if (!this.knowledgeManager) {
      return;
    }

    try {
      await this.knowledgeManager.createItem(payload);
      await this.sendKnowledgeData();

      this._view?.webview.postMessage({
        type: 'knowledge:success',
        payload: { message: 'Knowledge item created successfully' }
      });
    } catch (error: any) {
      this._view?.webview.postMessage({
        type: 'knowledge:error',
        payload: { error: error.message }
      });
    }
  }

  /**
   * Handle update knowledge item
   */
  private async handleUpdateKnowledgeItem(payload: any): Promise<void> {
    if (!this.knowledgeManager) {
      return;
    }

    try {
      await this.knowledgeManager.updateItem(payload.id, payload.updates);
      await this.sendKnowledgeData();

      this._view?.webview.postMessage({
        type: 'knowledge:success',
        payload: { message: 'Knowledge item updated successfully' }
      });
    } catch (error: any) {
      this._view?.webview.postMessage({
        type: 'knowledge:error',
        payload: { error: error.message }
      });
    }
  }

  /**
   * Handle delete knowledge item
   */
  private async handleDeleteKnowledgeItem(payload: any): Promise<void> {
    if (!this.knowledgeManager) {
      return;
    }

    try {
      await this.knowledgeManager.deleteItem(payload.id);
      await this.sendKnowledgeData();

      this._view?.webview.postMessage({
        type: 'knowledge:success',
        payload: { message: 'Knowledge item deleted successfully' }
      });
    } catch (error: any) {
      this._view?.webview.postMessage({
        type: 'knowledge:error',
        payload: { error: error.message }
      });
    }
  }

  /**
   * Handle create template
   */
  private async handleCreateTemplate(payload: any): Promise<void> {
    if (!this.knowledgeManager) {
      return;
    }

    try {
      await this.knowledgeManager.createTemplate(payload);
      await this.sendKnowledgeData();

      this._view?.webview.postMessage({
        type: 'knowledge:success',
        payload: { message: 'Template created successfully' }
      });
    } catch (error: any) {
      this._view?.webview.postMessage({
        type: 'knowledge:error',
        payload: { error: error.message }
      });
    }
  }

  /**
   * Handle update template
   */
  private async handleUpdateTemplate(payload: any): Promise<void> {
    if (!this.knowledgeManager) {
      return;
    }

    try {
      await this.knowledgeManager.updateTemplate(payload.templateId, payload.itemIds);
      await this.sendKnowledgeData();

      const store = this.knowledgeManager.getStore();
      const template = store.getTemplate(payload.templateId);
      const templateName = template?.name || 'Template';

      this._view?.webview.postMessage({
        type: 'knowledge:success',
        payload: { message: `Template "${templateName}" updated successfully` }
      });
    } catch (error: any) {
      this._view?.webview.postMessage({
        type: 'knowledge:error',
        payload: { error: error.message }
      });
    }
  }

  /**
   * Handle apply template
   */
  private async handleApplyTemplate(payload: any): Promise<void> {
    if (!this.knowledgeManager) {
      return;
    }

    try {
      // Find claude.md file - check active editor first, then search workspace
      let claudeMdPath: string | undefined;

      // Check if active editor has claude.md open
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor && activeEditor.document.fileName.toLowerCase().endsWith('claude.md')) {
        claudeMdPath = activeEditor.document.fileName;
        logger.debug(
          LogCategory.EXTENSION,
          'Using claude.md from active editor',
          'TimelineProvider.handleApplyTemplate',
          { claudeMdPath },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
      } else {
        // Search workspace for claude.md (case-insensitive)
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (workspaceRoot) {
          const claudeMdFiles = await this.knowledgeManager.scanClaudeMdFiles();
          if (claudeMdFiles.length > 0) {
            // Use the first claude.md found (typically the root one)
            claudeMdPath = claudeMdFiles[0].path;
            logger.debug(
              LogCategory.EXTENSION,
              'Found claude.md in workspace',
              'TimelineProvider.handleApplyTemplate',
              { claudeMdPath, totalFound: claudeMdFiles.length },
              LogPathway.KNOWLEDGE_MANAGEMENT
            );
          }
        }
      }

      // If still no claude.md found, show error
      if (!claudeMdPath) {
        const errorMsg = 'No claude.md or CLAUDE.md file found. Please create one in your project root.';
        logger.warn(
          LogCategory.EXTENSION,
          'Cannot apply template - no claude.md file',
          'TimelineProvider.handleApplyTemplate',
          { templateId: payload.templateId },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );

        this._view?.webview.postMessage({
          type: 'knowledge:error',
          payload: { error: errorMsg }
        });
        return;
      }

      logger.info(
        LogCategory.EXTENSION,
        'Applying template to claude.md',
        'TimelineProvider.handleApplyTemplate',
        { templateId: payload.templateId, replaceExisting: payload.replaceExisting, claudeMdPath },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      // Pass replaceExisting flag to support idempotent operations
      const result = await this.knowledgeManager.applyTemplate(
        payload.templateId,
        claudeMdPath,
        payload.replaceExisting || false
      );
      await this.sendClaudeMdFiles();

      // Send success message to webview
      const store = this.knowledgeManager.getStore();
      const template = store.getTemplate(payload.templateId);
      const templateName = template?.name || 'Template';
      const action = result?.wasReplaced ? 'updated in' : 'applied to';

      this._view?.webview.postMessage({
        type: 'knowledge:success',
        payload: { message: `Template "${templateName}" ${action} ${claudeMdPath.split(/[/\\]/).pop()}` }
      });

      logger.info(
        LogCategory.EXTENSION,
        'Template applied successfully',
        'TimelineProvider.handleApplyTemplate',
        { templateId: payload.templateId, templateName, wasReplaced: result?.wasReplaced, claudeMdPath },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to apply template',
        'TimelineProvider.handleApplyTemplate',
        { templateId: payload.templateId, error },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      this._view?.webview.postMessage({
        type: 'knowledge:error',
        payload: { error: error.message }
      });
    }
  }

  /**
   * Handle apply selected items
   */
  private async handleApplySelectedItems(payload: any): Promise<void> {
    if (!this.knowledgeManager) {
      return;
    }

    try {
      // Find claude.md file - check active editor first, then search workspace
      let claudeMdPath: string | undefined;

      // Check if active editor has claude.md open
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor && activeEditor.document.fileName.toLowerCase().endsWith('claude.md')) {
        claudeMdPath = activeEditor.document.fileName;
      } else {
        // Search workspace for claude.md
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (workspaceRoot) {
          const claudeMdFiles = await this.knowledgeManager.scanClaudeMdFiles();
          if (claudeMdFiles.length > 0) {
            claudeMdPath = claudeMdFiles[0].path;
          }
        }
      }

      // If still no claude.md found, show error
      if (!claudeMdPath) {
        const errorMsg = 'No claude.md or CLAUDE.md file found. Please create one in your project root.';
        this._view?.webview.postMessage({
          type: 'knowledge:error',
          payload: { error: errorMsg }
        });
        return;
      }

      logger.info(
        LogCategory.EXTENSION,
        'Applying selected items to claude.md',
        'TimelineProvider.handleApplySelectedItems',
        { itemIds: payload.itemIds, claudeMdPath },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      const result = await this.knowledgeManager.applySelectedItems(payload.itemIds, claudeMdPath);
      await this.sendClaudeMdFiles();

      // Send success message with details
      this._view?.webview.postMessage({
        type: 'knowledge:success',
        payload: {
          message: result.message || `Applied ${payload.itemIds.length} item(s) to ${claudeMdPath.split(/[/\\]/).pop()}`
        }
      });

      logger.info(
        LogCategory.EXTENSION,
        'Selected items applied successfully',
        'TimelineProvider.handleApplySelectedItems',
        { itemCount: payload.itemIds.length, claudeMdPath },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to apply selected items',
        'TimelineProvider.handleApplySelectedItems',
        { itemIds: payload.itemIds, error },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      this._view?.webview.postMessage({
        type: 'knowledge:error',
        payload: { error: error.message }
      });
    }
  }

  /**
   * Handle remove template
   */
  private async handleRemoveTemplate(payload: any): Promise<void> {
    if (!this.knowledgeManager) {
      return;
    }

    try {
      await this.knowledgeManager.removeTemplate(payload.templateId, payload.claudeMdPath);
      await this.sendClaudeMdFiles();
    } catch (error: any) {
      this._view?.webview.postMessage({
        type: 'knowledge:error',
        payload: { error: error.message }
      });
    }
  }

  /**
   * Handle export template
   */
  private async handleExportTemplate(payload: any): Promise<void> {
    if (!this.knowledgeManager) {
      return;
    }

    try {
      const path = await this.knowledgeManager.exportTemplate(payload.templateId);

      this._view?.webview.postMessage({
        type: 'knowledge:success',
        payload: { message: `Template exported to ${path}` }
      });
    } catch (error: any) {
      this._view?.webview.postMessage({
        type: 'knowledge:error',
        payload: { error: error.message }
      });
    }
  }

  /**
   * Handle import template from file
   */
  private async handleImportTemplate(payload: any): Promise<void> {
    if (!this.knowledgeManager) {
      return;
    }

    try {
      // Show file picker dialog
      const fileUris = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
          'Markdown': ['md'],
          'All Files': ['*']
        },
        title: 'Select Template File to Import'
      });

      if (!fileUris || fileUris.length === 0) {
        return; // User cancelled
      }

      const filePath = fileUris[0].fsPath;

      // Import the template (using default options: skip conflicts, skip duplicate items)
      const result = await this.knowledgeManager.importTemplateFromFile(filePath, {
        conflictResolution: 'skip',
        skipDuplicateItems: true
      });

      // Refresh knowledge data
      await this.sendKnowledgeData();

      if (result.success) {
        // Send success with details
        const details = [];
        if (result.itemsCreated > 0) details.push(`${result.itemsCreated} items created`);
        if (result.itemsUpdated > 0) details.push(`${result.itemsUpdated} items updated`);
        if (result.itemsSkipped > 0) details.push(`${result.itemsSkipped} items skipped`);

        const message = `Template "${result.templateName}" imported successfully` +
          (details.length > 0 ? `: ${details.join(', ')}` : '');

        this._view?.webview.postMessage({
          type: 'knowledge:import-success',
          payload: {
            message,
            templateId: result.templateId,
            warnings: result.warnings
          }
        });
      } else {
        // Send errors
        this._view?.webview.postMessage({
          type: 'knowledge:error',
          payload: {
            error: result.errors.join(', '),
            warnings: result.warnings
          }
        });
      }
    } catch (error: any) {
      this._view?.webview.postMessage({
        type: 'knowledge:error',
        payload: { error: error.message }
      });
    }
  }

  /**
   * Show dialog to create a new knowledge item
   */
  private async showCreateKnowledgeItemDialog(): Promise<void> {
    try {
      // Step 1: Select type
      const typeItems = [
        { label: '📋 ADR', description: 'Architecture Decision Record', value: 'adr' },
        { label: '🎯 Golden Path', description: 'Recommended workflow or approach', value: 'golden-path' },
        { label: '🔧 Design Pattern', description: 'Reusable design solution', value: 'design-pattern' },
        { label: '💡 Tip', description: 'Helpful tip or trick', value: 'tip' },
        { label: '📝 Snippet', description: 'Code snippet', value: 'snippet' },
        { label: '⚙️ Configuration', description: 'Configuration example', value: 'configuration' },
        { label: '📚 Learning', description: 'Something learned', value: 'learning' },
        { label: '🔍 Troubleshooting', description: 'How to solve a problem', value: 'troubleshooting' },
        { label: '⚠️ Gotcha', description: 'Common pitfall or mistake', value: 'gotcha' },
        { label: '📄 Template', description: 'Reusable template', value: 'template' },
        { label: '📖 Guideline', description: 'Guideline or best practice', value: 'guideline' },
        { label: '🔄 Workflow', description: 'Process or workflow', value: 'workflow' },
        { label: '📦 Custom', description: 'Custom knowledge type', value: 'custom' }
      ];

      const selectedType = await vscode.window.showQuickPick(typeItems, {
        placeHolder: 'Select knowledge type',
        title: 'Create Knowledge Item - Step 1/5'
      });

      if (!selectedType) return;

      // Step 2: Select scope
      const scopeItems = [
        { label: '👤 Personal', description: 'Only for you', value: 'personal' },
        { label: '👥 Team', description: 'For your team', value: 'team' },
        { label: '📁 Project', description: 'For this project', value: 'project' },
        { label: '🏢 Organization', description: 'For your organization', value: 'organization' }
      ];

      const selectedScope = await vscode.window.showQuickPick(scopeItems, {
        placeHolder: 'Select scope',
        title: 'Create Knowledge Item - Step 2/5'
      });

      if (!selectedScope) return;

      // Step 3: Enter title
      const title = await vscode.window.showInputBox({
        prompt: 'Enter title',
        placeHolder: 'e.g., "Use dependency injection for services"',
        title: 'Create Knowledge Item - Step 3/5',
        validateInput: (value) => value.trim() ? null : 'Title is required'
      });

      if (!title) return;

      // Step 4: Enter body (optional)
      const body = await vscode.window.showInputBox({
        prompt: 'Enter description (optional, press Enter to skip)',
        placeHolder: 'Markdown content...',
        title: 'Create Knowledge Item - Step 4/5'
      });

      // Step 5: Enter tags (optional)
      const tagsInput = await vscode.window.showInputBox({
        prompt: 'Enter tags separated by commas (optional, press Enter to skip)',
        placeHolder: 'e.g., architecture, patterns, best-practices',
        title: 'Create Knowledge Item - Step 5/5'
      });

      const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

      // Create the item
      await this.handleCreateKnowledgeItem({
        type: selectedType.value,
        scope: selectedScope.value,
        title,
        body: body || '',
        tags
      });

    } catch (error: any) {
      logger.error(LogCategory.EXTENSION, 'Failed to create knowledge item', 'showCreateKnowledgeItemDialog', error);
      vscode.window.showErrorMessage(`Failed to create knowledge item: ${error.message}`);
    }
  }

  /**
   * Show dialog to edit an existing knowledge item
   */
  private async showEditKnowledgeItemDialog(item: any): Promise<void> {
    if (!item) {
      logger.warn(LogCategory.EXTENSION, 'No item provided for edit dialog', 'showEditKnowledgeItemDialog');
      return;
    }

    try {
      // For now, just allow editing the title and body
      const newTitle = await vscode.window.showInputBox({
        prompt: 'Edit title',
        value: item.title,
        validateInput: (value) => value.trim() ? null : 'Title is required'
      });

      if (!newTitle) return;

      const newBody = await vscode.window.showInputBox({
        prompt: 'Edit description',
        value: item.body,
        placeHolder: 'Markdown content...'
      });

      if (newBody === undefined) return; // User cancelled

      // Update the item
      await this.handleUpdateKnowledgeItem({
        id: item.id,
        updates: {
          title: newTitle,
          body: newBody
        }
      });

    } catch (error: any) {
      logger.error(LogCategory.EXTENSION, 'Failed to edit knowledge item', 'showEditKnowledgeItemDialog', error);
      vscode.window.showErrorMessage(`Failed to edit knowledge item: ${error.message}`);
    }
  }

  /**
   * Dispose provider
   */
  dispose(): void {
    this.orchestrator.dispose();
  }
}

/**
 * Register timeline provider
 */
export function registerTimelineProvider(context: vscode.ExtensionContext): vscode.Disposable {
  const provider = new TimelineProvider(context.extensionUri);

  // Initialize
  provider.initialize().catch(error => {
  });

  // Register webview view provider
  const disposable = vscode.window.registerWebviewViewProvider(
    TimelineProvider.viewType,
    provider
    // Removed retainContextWhenHidden to force complete reload on every show
    // This prevents VSCode from caching stale webview content
  );

  return disposable;
}
