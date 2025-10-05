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
      console.log('TimelineProvider: Initializing orchestrator...');
      await this.orchestrator.initialize();
      console.log('TimelineProvider: Orchestrator initialized');
    } catch (error) {
      console.error('TimelineProvider: Failed to initialize orchestrator:', error);
      this.sendMessage({
        type: 'error',
        message: `Failed to initialize: ${error}`
      });
      return;
    }

    // Load initial data - will use active file if available, or first workspace folder
    console.log('TimelineProvider: Loading initial data...');
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
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling message:', error);
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
        console.log('TimelineProvider: No active file, checking workspace folders...');
        const workspaceFolders = vscode.workspace.workspaceFolders;

        if (!workspaceFolders || workspaceFolders.length === 0) {
          console.log('TimelineProvider: No workspace folders open');
          this.sendMessage({
            type: 'info',
            message: 'Open a folder or workspace to view repository timeline'
          });
          return;
        }

        // Use first workspace folder as the repository
        repoPath = workspaceFolders[0].uri.fsPath;
        fileName = 'All Files'; // No specific file selected
        console.log(`TimelineProvider: Using workspace folder: ${repoPath}`);
      } else {
        // Active file exists - use its directory as repo path
        repoPath = path.dirname(activeFile);
        fileName = path.basename(activeFile);
        console.log(`TimelineProvider: Using active file: ${activeFile}`);
      }

      this.currentRepoPath = repoPath;

      console.log(`TimelineProvider: Loading timeline for: ${repoPath}`);

      // Send loading state
      this.sendMessage({
        type: 'loading',
        isLoading: true
      });

      // Fetch events with filters from orchestrator
      // This uses persisted filter state for this repository (or empty state if first time)
      console.log('TimelineProvider: Fetching events with filters from orchestrator...');
      const result = await this.orchestrator.getEventsWithFilters(repoPath, undefined, forceRefresh);
      console.log(`TimelineProvider: Received ${result.allEvents.length} total events, ${result.filteredEvents.length} after filters`);

      // Get enabled provider IDs for sync mode availability
      const enabledProviders = this.orchestrator.getEnabledProviderIds();

      // Send to webview
      logger.debug(LogCategory.WEBVIEW, `Sending timelineData to webview: ${result.allEvents.length} total, ${result.filteredEvents.length} filtered`, 'loadTimelineForActiveFile', undefined, LogPathway.WEBVIEW_MESSAGING);

      // DEBUG: Check sources[] before sending
      const eventsWithSources = result.allEvents.filter((e: any) => e.sources && e.sources.length > 0);
      console.log(`[TimelineProvider] DEBUG: About to send ${result.allEvents.length} events, ${eventsWithSources.length} have sources[]`);
      if (eventsWithSources.length > 0) {
        const sample = eventsWithSources[0];
        console.log(`[TimelineProvider] Sample event before postMessage:`, {
          title: sample.title,
          sources: sample.sources?.map((s: any) => s.providerId)
        });
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
      console.log(`[TimelineProvider] After serialization: ${stillHaveSources.length} events still have sources[]`);

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

      console.log(`TimelineProvider: Successfully sent data to webview (${result.allEvents.length} total, ${result.filteredEvents.length} filtered)`);

    } catch (error) {
      console.error('Error loading timeline:', error);
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
      console.log('[TimelineProvider] ═══ applyFilters() ═══');
      console.log('[TimelineProvider]   currentRepoPath:', this.currentRepoPath);

      if (!this.currentRepoPath) {
        console.warn('[TimelineProvider]   WARNING: No current repo path, cannot apply filters');
        return;
      }

      console.log('[TimelineProvider]   Persisting filter state to FilterStateManager...');
      // Persist filter state for this repository
      this.orchestrator.updateFilterState(this.currentRepoPath, filters);

      console.log('[TimelineProvider]   Calling orchestrator.getEventsWithFilters()...');
      // Get events with new filters
      const result = await this.orchestrator.getEventsWithFilters(this.currentRepoPath, filters, false);

      console.log('[TimelineProvider]   Result from orchestrator:');
      console.log('[TimelineProvider]     - allEvents:', result.allEvents.length);
      console.log('[TimelineProvider]     - filteredEvents:', result.filteredEvents.length);
      console.log('[TimelineProvider]     - appliedFilters:', JSON.stringify(result.appliedFilters, null, 2));

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
      console.error('[TimelineProvider]   ERROR applying filters:', error);
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
   */
  private getHtmlForWebview(webview: vscode.Webview): string {
    // Get URIs for assets
    const vendorsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'vendors.js')
    );

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'webview.js')
    );

    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'visualization', 'styles', 'timeline.css')
    );

    // Get CSP source
    const cspSource = webview.cspSource;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="
        default-src 'none';
        style-src ${cspSource} 'unsafe-inline';
        script-src ${cspSource} 'unsafe-eval';
        font-src ${cspSource};
        img-src ${cspSource} data: https:;
    ">
    <link rel="stylesheet" href="${styleUri}">
    <title>AB Timeline</title>
</head>
<body>
    <div id="container">
        <div id="stats-bar">
            <div class="stats-items">
                <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="margin-right: 8px; vertical-align: middle;">
                    <style>
                        .timeline-element {
                            fill: #8C8C8C;
                            stroke: #8C8C8C;
                            transition: all 0.2s ease;
                        }
                        .bg-circle {
                            stroke: #8C8C8C;
                            opacity: 0.4;
                            transition: all 0.2s ease;
                        }
                        .inner-ring {
                            stroke: #1E1E1E;
                            opacity: 0.3;
                            transition: opacity 0.2s ease;
                        }
                        svg:hover .timeline-element {
                            fill: #C5C5C5;
                            stroke: #C5C5C5;
                        }
                        svg:hover .bg-circle {
                            stroke: #C5C5C5;
                            opacity: 0.5;
                        }
                        svg:hover .inner-ring {
                            opacity: 0.5;
                        }
                        .accent-dot {
                            fill: #8C8C8C;
                            transition: all 0.2s ease;
                        }
                        svg:hover .accent-dot {
                            fill: #C5C5C5;
                        }
                    </style>
                    <circle cx="12" cy="12" r="12" fill="none" class="bg-circle"/>
                    <line x1="12" y1="3" x2="12" y2="21" class="timeline-element" stroke-width="2" stroke-linecap="round"/>
                    <circle cx="12" cy="6" r="2.5" class="timeline-element"/>
                    <circle cx="12" cy="6" r="1.8" fill="none" class="inner-ring" stroke-width="0.4"/>
                    <circle cx="12" cy="12" r="3" class="timeline-element"/>
                    <circle cx="12" cy="12" r="2.3" fill="none" class="inner-ring" stroke-width="0.4"/>
                    <circle cx="12" cy="18" r="2.5" class="timeline-element"/>
                    <circle cx="12" cy="18" r="1.8" fill="none" class="inner-ring" stroke-width="0.4"/>
                    <line x1="14.5" y1="6" x2="20" y2="6" class="timeline-element" stroke-width="1.5" stroke-linecap="round"/>
                    <circle cx="20.5" cy="6" r="1.2" class="timeline-element"/>
                    <line x1="9.5" y1="12" x2="4" y2="12" class="timeline-element" stroke-width="1.5" stroke-linecap="round"/>
                    <circle cx="3.5" cy="12" r="1.2" class="timeline-element"/>
                    <line x1="14.5" y1="18" x2="20" y2="18" class="timeline-element" stroke-width="1.5" stroke-linecap="round"/>
                    <circle cx="20.5" cy="18" r="1.2" class="timeline-element"/>
                    <circle cx="12" cy="2" r="0.4" class="accent-dot" opacity="0.6"/>
                    <circle cx="12" cy="22" r="0.4" class="accent-dot" opacity="0.6"/>
                    <circle cx="12" cy="8.5" r="0.3" class="accent-dot" opacity="0.5"/>
                    <circle cx="12" cy="9.5" r="0.3" class="accent-dot" opacity="0.5"/>
                    <circle cx="12" cy="14.5" r="0.3" class="accent-dot" opacity="0.5"/>
                    <circle cx="12" cy="15.5" r="0.3" class="accent-dot" opacity="0.5"/>
                </svg>
                <div class="stat-item" data-tooltip="Count of events currently displayed after applying filters"><span class="stat-label">Visible Events:</span><span class="stat-value" id="stat-visible">0</span></div>
                <div class="stat-item" data-tooltip="Total count of all events in the repository, regardless of filters"><span class="stat-label">Total Events:</span><span class="stat-value" id="stat-total">0</span></div>
                <div class="stat-item" data-tooltip="Number of unique authors who contributed to the currently visible events"><span class="stat-label">Contributors:</span><span class="stat-value" id="stat-contributors">0</span></div>
                <div class="stat-item" data-tooltip="Count of branches with visible events (affected by filters)"><span class="stat-label">Active Branches:</span><span class="stat-value" id="stat-branches">0</span></div>
                <div class="stat-item" data-tooltip="Time span in days between first and last visible event"><span class="stat-label">Window:</span><span class="stat-value" id="stat-window">-</span></div>
                <div class="stat-item" data-tooltip="Development activity rate: events per day (higher = more frequent commits/changes)"><span class="stat-label">Velocity:</span><span class="stat-value" id="stat-velocity">0/day</span></div>
            </div>
            <div class="filters-trigger" id="filters-trigger" tabindex="0" role="button" aria-label="Show controls menu">Controls</div>
        </div>
        <div id="context-bar" class="context-bar">
            <span class="context-label">REPO:</span> <span id="context-repo" class="context-value">-</span>
            <span class="context-separator">--</span>
            <span class="context-label">FILE:</span> <span id="context-file" class="context-value">-</span>
        </div>
        <div id="timeline-container">
            <div id="branch-timeline-container" class="timeline-main">
                <div id="visualization">
                    <svg id="main-svg"></svg>
                    <div class="tooltip" id="tooltip"></div>
                    <div class="toast" id="toast"></div>
                    <div class="event-popup" id="event-popup">
                        <button class="popup-close" id="popup-close">×</button>
                        <div class="popup-lock-indicator" id="popup-lock-indicator" title="Popup is locked - click outside or press Escape to close">📌</div>
                        <div class="popup-header">
                            <div class="popup-title-row">
                                <span class="popup-event-type" id="popup-event-type"></span>
                                <span class="popup-timestamp" id="popup-timestamp"></span>
                            </div>
                            <h3 class="popup-title" id="popup-title"></h3>
                            <div class="popup-tabs" id="popup-tabs" style="display: none;">
                                <div class="popup-tab active" data-tab="overview">Overview</div>
                                <div class="popup-tab" data-tab="impact">Impact</div>
                                <div class="popup-tab" data-tab="related">Related</div>
                                <div class="popup-tab" data-tab="technical">Technical</div>
                            </div>
                        </div>
                        <div class="popup-content" id="popup-content">
                            <div class="popup-tab-content active" id="tab-overview"></div>
                            <div class="popup-tab-content" id="tab-impact"></div>
                            <div class="popup-tab-content" id="tab-related"></div>
                            <div class="popup-tab-content" id="tab-technical"></div>
                        </div>
                        <div class="popup-action-bar" id="popup-action-bar"></div>
                    </div>
                    <div class="legend" id="timeline-legend">
                        <div class="legend-title">Legend</div>
                        <div class="legend-content">
                            <div id="legend-items"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div id="range-selector-section" class="range-selector-section">
            <div id="range-selector" class="range-selector-container">
                <svg id="range-svg"></svg>
                <div class="range-label start" id="range-start-label">-</div>
                <div class="range-label end" id="range-end-label">-</div>
            </div>
        </div>
    </div>
    <script src="${vendorsUri}"></script>
    <script src="${scriptUri}"></script>
</body>
</html>`;
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
    console.error('Failed to initialize TimelineProvider:', error);
  });

  // Register webview view provider
  const disposable = vscode.window.registerWebviewViewProvider(
    TimelineProvider.viewType,
    provider,
    {
      webviewOptions: {
        retainContextWhenHidden: true
      }
    }
  );

  return disposable;
}
