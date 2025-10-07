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

  constructor(extensionUri: vscode.Uri, storagePath?: string) {
    this.extensionUri = extensionUri;
    this.orchestrator = new DataOrchestrator({
      storagePath: storagePath || './.agent-brain'
    });
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

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      await this.handleMessage(message);
    });

    // Send resize message when view becomes visible (catches tab switches)
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        // Small delay to let VS Code finish layout
        setTimeout(() => {
          this.sendMessage({ type: 'resize' });
        }, 50);
      }
    });

    // IMPORTANT: Initialize orchestrator before loading data
    try {
      await this.orchestrator.initialize();
    } catch (error) {
      this.sendMessage({
        type: 'error',
        message: `Failed to initialize: ${error}`
      });
      return;
    }

    // Load initial data - will use active file if available, or first workspace folder
    await this.loadTimelineForActiveFile();

    // Listen for editor changes
    vscode.window.onDidChangeActiveTextEditor(async () => {
      await this.loadTimelineForActiveFile();
    });
  }

  /**
   * Handle messages from webview
   */
  private async handleMessage(message: any): Promise<void> {
    try {
      switch (message.type) {
        case 'requestData':
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

        default:
      }
    } catch (error) {
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
