/**
 * Timeline Provider - Simplified Extension Host
 *
 * NEW ARCHITECTURE:
 * - Works directly with CanonicalEvent[]
 * - No transformations, just pass-through
 * - Message handling delegated to specialized handlers
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import { DataOrchestrator } from '@agent-brain/core/domains/visualization/orchestration/DataOrchestrator';
import { CanonicalEvent } from '@agent-brain/core/domains/events';
import { logger, LogCategory, LogPathway } from '@agent-brain/core/infrastructure/logging/Logger';
import { TimelineMessageHandler } from './handlers/TimelineMessageHandler';
import { KnowledgeMessageHandler } from './handlers/KnowledgeMessageHandler';
import { SessionMessageHandler } from './handlers/SessionMessageHandler';

export class TimelineProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'repoTimeline.evolutionView';

  private _view?: vscode.WebviewView;
  private orchestrator: DataOrchestrator;
  private extensionUri: vscode.Uri;
  private knowledgeManager: any = null;  // KnowledgeManager instance

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

  constructor(extensionUri: vscode.Uri, workspaceRoot: string) {
    this.extensionUri = extensionUri;
    this.orchestrator = new DataOrchestrator({
      workspaceRoot: workspaceRoot,
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

    // Initialize message handlers with shared state
    // Capture provider instance in closure for context getters/setters
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
   * Handle messages from webview - delegates to specialized handlers
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
      // Try timeline handler first
      if (await this.timelineHandler.handleMessage(message)) {
        return;
      }

      // Try knowledge handler
      if (await this.knowledgeHandler.handleMessage(message)) {
        return;
      }

      // Try session handler
      if (await this.sessionHandler.handleMessage(message)) {
        return;
      }

      // No handler recognized the message
      logger.warn(
        LogCategory.WEBVIEW,
        `Unknown message type received: ${message.type}`,
        'handleMessage',
        { type: message.type },
        LogPathway.WEBVIEW_MESSAGING
      );
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
   * Send message to webview
   */
  private sendMessage(message: any): void {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }

  /**
   * Send i18n data to webview
   * Loads the appropriate bundle based on VSCode's display language
   */
  public sendI18nData(): void {
    // Detect VSCode language
    const locale = vscode.env.language || 'en';
    logger.debug(LogCategory.EXTENSION, `Detected VSCode language: ${locale}`, 'sendI18nData');

    // Determine bundle file path
    // Normalize locale: 'zh-cn' -> 'zh-cn', 'en-us' -> 'en', etc.
    const normalizedLocale = locale.toLowerCase();
    let bundleFile = 'bundle.l10n.json'; // Default to English

    // Check if we have a specific translation for this locale
    if (normalizedLocale.startsWith('de')) {
      bundleFile = 'bundle.l10n.de.json';
    } else if (normalizedLocale.startsWith('es')) {
      bundleFile = 'bundle.l10n.es.json';
    } else if (normalizedLocale.startsWith('zh-cn') || normalizedLocale === 'zh') {
      bundleFile = 'bundle.l10n.zh-cn.json';
    } else if (normalizedLocale.startsWith('fr')) {
      bundleFile = 'bundle.l10n.fr.json';
    }

    // Load bundle file
    try {
      const bundlePath = vscode.Uri.joinPath(this.extensionUri, 'l10n', bundleFile);
      const bundleContent = fs.readFileSync(bundlePath.fsPath, 'utf8');
      const translations = JSON.parse(bundleContent);

      logger.info(
        LogCategory.EXTENSION,
        `Loaded i18n bundle: ${bundleFile} (${Object.keys(translations).length} strings)`,
        'sendI18nData'
      );

      // Send to webview
      this.sendMessage({
        type: 'i18n:init',
        payload: {
          locale: locale,
          translations: translations
        }
      });
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        `Failed to load i18n bundle: ${bundleFile}`,
        'sendI18nData',
        error
      );

      // Fallback to English
      try {
        const fallbackPath = vscode.Uri.joinPath(this.extensionUri, 'l10n', 'bundle.l10n.json');
        const fallbackContent = fs.readFileSync(fallbackPath.fsPath, 'utf8');
        const fallbackTranslations = JSON.parse(fallbackContent);

        this.sendMessage({
          type: 'i18n:init',
          payload: {
            locale: 'en',
            translations: fallbackTranslations
          }
        });
      } catch (fallbackError) {
        logger.error(
          LogCategory.EXTENSION,
          'Failed to load fallback English bundle',
          'sendI18nData',
          fallbackError
        );
      }
    }
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
    let htmlWithWebviewUris = htmlWithCSP.replace(
      /src="([^"]+\.js)"/g,
      (match, scriptPath) => {
        const scriptUri = webview.asWebviewUri(
          vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', scriptPath)
        );
        // Add version as query parameter for cache busting
        return `src="${scriptUri}?v=${cacheBuster}"`;
      }
    );

    // Convert asset paths (images, SVGs, etc.) to webview URIs
    // The bundled HTML has paths like: <img src="assets/diagram.svg">
    // We transform to: <img src="vscode-webview://...assets/diagram.svg">
    htmlWithWebviewUris = htmlWithWebviewUris.replace(
      /src="(assets\/[^"]+)"/g,
      (match, assetPath) => {
        const assetUri = webview.asWebviewUri(
          vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', assetPath)
        );
        return `src="${assetUri}"`;
      }
    );

    // Special handling for architecture diagram - inject both theme URIs as data attributes
    // This allows the webview to switch between light/dark without reconstructing URIs
    const lightDiagramUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'assets', 'agentbrain-complete-diagram.svg')
    );
    const darkDiagramUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'assets', 'agentbrain-complete-diagram-dark.svg')
    );

    htmlWithWebviewUris = htmlWithWebviewUris.replace(
      /id="architecture-diagram"/,
      `id="architecture-diagram" data-light-src="${lightDiagramUri}" data-dark-src="${darkDiagramUri}"`
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
      if (this._view && this.timelineHandler) {
        this.timelineHandler.loadTimelineForActiveFile(true).catch(error => {
          logger.error(LogCategory.EXTENSION, `Failed to refresh timeline after adding runtime event: ${error}`, 'addRuntimeEvent');
        });
      }
    } catch (error) {
      logger.error(LogCategory.EXTENSION, `Failed to add runtime event: ${error}`, 'addRuntimeEvent');
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
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  const provider = new TimelineProvider(context.extensionUri, workspaceRoot);

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
