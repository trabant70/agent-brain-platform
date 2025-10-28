/**
 * Timeline Provider - Refactored Facade
 *
 * REFACTORED: Now a clean facade coordinating specialized services.
 * Reduced from 611 lines to ~250 lines.
 *
 * Delegates to:
 * - WebviewContentService (HTML generation, CSP, URIs)
 * - MessageRouter (Message routing to handlers)
 * - I18nService (Internationalization)
 * - WebviewLifecycleManager (Lifecycle events)
 */

import * as vscode from 'vscode';
import { DataOrchestrator } from '@agent-brain/core/domains/visualization/orchestration/DataOrchestrator';
import { CanonicalEvent } from '@agent-brain/core/domains/events';
import { logger, LogCategory, LogPathway } from '@agent-brain/core/infrastructure/logging/Logger';
import { CodeStructureReviewProvider } from './CodeStructureReviewProvider';

// Message handlers
import { TimelineMessageHandler } from './handlers/TimelineMessageHandler';
import { KnowledgeMessageHandler } from './handlers/KnowledgeMessageHandler';
import { SessionMessageHandler } from './handlers/SessionMessageHandler';
import { CodeStructureMessageHandler } from './handlers/CodeStructureMessageHandler';

// Specialized services (NEW - Facade Pattern)
import {
  WebviewContentService,
  MessageRouter,
  I18nService,
  WebviewLifecycleManager
} from './services';

export class TimelineProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'repoTimeline.evolutionView';

  private _view?: vscode.WebviewView;
  private orchestrator: DataOrchestrator;
  private extensionUri: vscode.Uri;
  private knowledgeManager: any = null;
  private threadControlCenter: any = null;
  private codeStructureProvider?: CodeStructureReviewProvider;

  // Shared state object used by handlers and provider
  private providerState = {
    currentRepoPath: '',
    isOrchestratorInitialized: false,
    isWebviewReady: false
  };

  // Getters/setters for shared state
  private get currentRepoPath(): string { return this.providerState.currentRepoPath; }
  private set currentRepoPath(value: string) { this.providerState.currentRepoPath = value; }
  private get isOrchestratorInitialized(): boolean { return this.providerState.isOrchestratorInitialized; }
  private set isOrchestratorInitialized(value: boolean) { this.providerState.isOrchestratorInitialized = value; }
  private get isWebviewReady(): boolean { return this.providerState.isWebviewReady; }
  private set isWebviewReady(value: boolean) { this.providerState.isWebviewReady = value; }

  // Message handlers
  private timelineHandler!: TimelineMessageHandler;
  private knowledgeHandler!: KnowledgeMessageHandler;
  private sessionHandler!: SessionMessageHandler;
  private codeStructureHandler!: CodeStructureMessageHandler;

  // Specialized services (NEW)
  private webviewContentService: WebviewContentService;
  private messageRouter: MessageRouter;
  private i18nService: I18nService;
  private lifecycleManager: WebviewLifecycleManager;


  constructor(extensionUri: vscode.Uri, workspaceRoot: string) {
    this.extensionUri = extensionUri;
    this.orchestrator = new DataOrchestrator({
      workspaceRoot: workspaceRoot,
      providerSettings: this.getProviderSettings()
    });

    // Initialize services
    this.webviewContentService = new WebviewContentService(extensionUri);
    this.messageRouter = new MessageRouter();
    this.i18nService = new I18nService(extensionUri);
    this.lifecycleManager = new WebviewLifecycleManager({
      onVisibilityChange: (visible) => this.handleVisibilityChange(visible)
    });
  }

  /**
   * Get provider enablement settings from VSCode configuration
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
    if (this.lifecycleManager.getWebviewReady() && this._view) {
      this.sendKnowledgeData();
    }
  }

  /**
   * Set the thread control center instance
   */
  public setThreadControlCenter(controlCenter: any): void {
    this.threadControlCenter = controlCenter;
    logger.debug(LogCategory.EXTENSION, 'Thread Control Center connected to TimelineProvider');

    // Send initial threading state to webview if it's already ready
    if (this.lifecycleManager.getWebviewReady() && this._view) {
      const state = this.threadControlCenter.getState();
      this.sendMessage({
        type: 'threading:state',
        payload: state
      });
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

    // Set HTML content (delegated to WebviewContentService)
    webviewView.webview.html = this.webviewContentService.getHtmlForWebview(webviewView.webview);

    // Initialize message handlers
    this.initializeMessageHandlers(webviewView);

    // Register handlers with message router
    this.messageRouter.registerHandler(this.timelineHandler);
    this.messageRouter.registerHandler(this.knowledgeHandler);
    this.messageRouter.registerHandler(this.sessionHandler);
    this.messageRouter.registerHandler(this.codeStructureHandler);

    // Setup message listener
    this.setupMessageListener(webviewView);

    // Setup lifecycle event listeners (delegated to WebviewLifecycleManager)
    this.lifecycleManager.setupEventListeners(webviewView);

    // Initialize orchestrator if needed
    await this.initializeOrchestrator();

    // Listen for editor changes
    vscode.window.onDidChangeActiveTextEditor(async () => {
      if (this.lifecycleManager.getWebviewReady()) {
        await this.loadTimelineForActiveFile();
      }
    });
  }

  /**
   * Initialize message handlers with shared state
   */
  private initializeMessageHandlers(webviewView: vscode.WebviewView): void {
    const provider = this;

    this.timelineHandler = new TimelineMessageHandler({
      orchestrator: this.orchestrator,
      view: webviewView,
      get currentRepoPath() { return provider.providerState.currentRepoPath; },
      set currentRepoPath(value) { provider.providerState.currentRepoPath = value; },
      get isOrchestratorInitialized() { return provider.providerState.isOrchestratorInitialized; },
      set isOrchestratorInitialized(value) { provider.providerState.isOrchestratorInitialized = value; },
      get isWebviewReady() { return provider.providerState.isWebviewReady; },
      set isWebviewReady(value) { provider.providerState.isWebviewReady = value; },
      onI18nRequest: () => { provider.sendI18nData(); }
    } as any);

    this.knowledgeHandler = new KnowledgeMessageHandler({
      view: webviewView,
      knowledgeManager: this.knowledgeManager,
      onTimelineRefresh: async () => {
        await this.timelineHandler.loadTimelineForActiveFile(true);
      }
    });

    this.sessionHandler = new SessionMessageHandler({
      view: webviewView
    });

    // Initialize code structure review
    this.codeStructureProvider = new CodeStructureReviewProvider();
    this.codeStructureHandler = new CodeStructureMessageHandler(
      this.codeStructureProvider,
      (message) => webviewView.webview.postMessage(message)
    );
  }

  /**
   * Setup webview message listener
   */
  private setupMessageListener(webviewView: vscode.WebviewView): void {
    webviewView.webview.onDidReceiveMessage(async (message) => {
      logger.info(
        LogCategory.WEBVIEW,
        `🔔 Message received: ${message.type}`,
        'onDidReceiveMessage',
        { type: message.type },
        LogPathway.WEBVIEW_MESSAGING
      );

      // Route message to handlers (delegated to MessageRouter)
      await this.routeMessage(message);
    });

    logger.info(
      LogCategory.WEBVIEW,
      '✅ Message listener attached to webview',
      'setupMessageListener',
      undefined,
      LogPathway.WEBVIEW_MESSAGING
    );
  }

  /**
   * Initialize orchestrator (if not already initialized)
   */
  private async initializeOrchestrator(): Promise<void> {
    if (!this.isOrchestratorInitialized) {
      try {
        logger.info(
          LogCategory.EXTENSION,
          'Initializing orchestrator for first time',
          'TimelineProvider.initializeOrchestrator',
          {},
          LogPathway.DATA_INGESTION
        );

        await this.orchestrator.initialize();
        this.isOrchestratorInitialized = true;
      } catch (error) {
        logger.error(
          LogCategory.EXTENSION,
          'Failed to initialize orchestrator',
          'TimelineProvider.initializeOrchestrator',
          error,
          LogPathway.DATA_INGESTION
        );

        this.sendMessage({
          type: 'error',
          message: `Failed to initialize: ${error}`
        });
      }
    } else {
      logger.info(
        LogCategory.EXTENSION,
        'Orchestrator already initialized, reusing existing instance',
        'TimelineProvider.initializeOrchestrator',
        {},
        LogPathway.DATA_INGESTION
      );
    }
  }

  /**
   * Route message to appropriate handler (delegated to MessageRouter)
   */
  private async routeMessage(message: any): Promise<void> {
    try {
      // Handle threading messages
      if (message.type && message.type.startsWith('threading:')) {
        if (this.threadControlCenter) {
          await this.threadControlCenter.handleWebviewMessage(message);
          return;
        } else {
          logger.warn(
            LogCategory.WEBVIEW,
            'Threading message received but no ThreadControlCenter available',
            'routeMessage',
            { type: message.type }
          );
          return;
        }
      }

      // Handle code-structure messages
      if (message.type && message.type.startsWith('code-structure:')) {
        // Code structure messages are handled by CodeStructureReviewProvider
        // For now, we don't have a direct handler in the extension, so messages
        // will be handled by the webview controller directly
        logger.debug(
          LogCategory.WEBVIEW,
          'Code structure message received - handled by webview controller',
          'routeMessage',
          { type: message.type }
        );
        // Allow the message to fall through to messageRouter for potential future backend handlers
      }

      const handled = await this.messageRouter.routeMessage(message);

      // Handle tab changed message (for state tracking)
      if (!handled && message.type === 'tabChanged') {
        logger.debug(
          LogCategory.WEBVIEW,
          `Tab changed: ${message.from} → ${message.to}`,
          'routeMessage',
          { from: message.from, to: message.to },
          LogPathway.WEBVIEW_MESSAGING
        );
        return;
      }

      // Log warning if no handler processed the message
      if (!handled) {
        logger.warn(
          LogCategory.WEBVIEW,
          `Unknown message type received: ${message.type}`,
          'routeMessage',
          { type: message.type },
          LogPathway.WEBVIEW_MESSAGING
        );
      }
    } catch (error) {
      logger.error(
        LogCategory.WEBVIEW,
        `Failed to route message: ${message.type}`,
        'routeMessage',
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
   * Handle webview visibility changes
   */
  private handleVisibilityChange(visible: boolean): void {
    if (visible) {
      // Send resize message when view becomes visible
      setTimeout(() => {
        this.sendMessage({ type: 'resize' });

        // Re-send knowledge data when webview becomes visible
        if (this.knowledgeManager) {
          logger.debug(
            LogCategory.WEBVIEW,
            'Re-sending knowledge data after visibility change',
            'handleVisibilityChange',
            {},
            LogPathway.KNOWLEDGE_MANAGEMENT
          );
          this.sendKnowledgeData();
          this.sendClaudeMdFiles();
        }
      }, 150);
    }
  }

  /**
   * Send message to webview
   */
  public sendMessage(message: any): void {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }

  /**
   * Send i18n data to webview (delegated to I18nService)
   */
  public sendI18nData(): void {
    if (this._view) {
      this.i18nService.sendI18nData(this._view.webview);
    }
  }

  /**
   * Load timeline for active file
   */
  private async loadTimelineForActiveFile(): Promise<void> {
    if (this.timelineHandler) {
      await this.timelineHandler.loadTimelineForActiveFile();
    }
  }

  /**
   * Add a runtime event to the timeline
   */
  public addRuntimeEvent(event: CanonicalEvent): void {
    try {
      logger.info(
        LogCategory.EXTENSION,
        `Adding runtime event to timeline: ${event.type}`,
        'addRuntimeEvent',
        { eventId: event.id, title: event.title }
      );

      this.orchestrator.addRuntimeEvent(event);

      // Refresh timeline if webview is visible
      if (this._view && this.timelineHandler) {
        this.timelineHandler.loadTimelineForActiveFile(true).catch(error => {
          logger.error(
            LogCategory.EXTENSION,
            `Failed to refresh timeline after adding runtime event: ${error}`,
            'addRuntimeEvent'
          );
        });
      }
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        `Failed to add runtime event: ${error}`,
        'addRuntimeEvent'
      );
    }
  }

  /**
   * Send knowledge data to webview (delegates to knowledge handler)
   */
  private sendKnowledgeData(): void {
    if (this.knowledgeHandler) {
      this.knowledgeHandler.sendKnowledgeData();
    }
  }

  /**
   * Send claude.md files to webview (delegates to knowledge handler)
   * Public method to allow external callers (e.g., FocusValidationService) to trigger refresh
   */
  public sendClaudeMdFiles(): void {
    if (this.knowledgeHandler) {
      this.knowledgeHandler.sendClaudeMdFiles();
    }
  }

  /**
   * Dispose provider
   */
  dispose(): void {
    this.orchestrator.dispose();
    this.lifecycleManager.dispose();
  }
}

/**
 * Register timeline provider
 */
export function registerTimelineProvider(context: vscode.ExtensionContext): vscode.Disposable {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  const provider = new TimelineProvider(context.extensionUri, workspaceRoot);

  // Initialize
  provider.initialize().catch(error => {
    logger.error(LogCategory.EXTENSION, 'Failed to initialize TimelineProvider', 'registerTimelineProvider', error);
  });

  // Register webview view provider
  const disposable = vscode.window.registerWebviewViewProvider(
    TimelineProvider.viewType,
    provider
  );

  return disposable;
}
