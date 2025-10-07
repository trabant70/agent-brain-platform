/**
 * Webview Entry Point - Clean v0.3.0 Architecture
 *
 * Simple flow: CanonicalEvent[] → SimpleTimelineApp → Renderer
 */

import * as d3 from 'd3';
import { SimpleTimelineApp } from './SimpleTimelineApp';
import { EventVisualTheme } from '../theme/EventVisualTheme';
import { webviewLogger, LogLevel, LogCategory, LogPathway } from './WebviewLogger';

// Import CSS - webpack will bundle it inline
import '../styles/timeline.css';

// Expose D3 globally
window.d3 = d3;

// ═══════════════════════════════════════════════════════════════════════════
// PATHWAY DEBUGGING CONFIGURATION (Build-time)
// ═══════════════════════════════════════════════════════════════════════════
//
// To debug specific data flows, enable pathway filtering here before building.
// This filters console output to ONLY logs tagged with selected pathways.
//
// Available Pathways:
//   LogPathway.DATA_INGESTION  - Provider → Orchestrator → Webview → Render
//   LogPathway.FILTER_APPLY    - Filter UI → State → Data refresh
//   LogPathway.STATE_PERSIST   - State save/restore
//   LogPathway.RENDER_PIPELINE - Data processing → D3 → DOM
//   LogPathway.USER_INTERACTION- User events → Handlers → UI updates
//   LogPathway.WEBVIEW_MESSAGING - Extension ↔ Webview messages
//   LogPathway.CONFIG_SYNC     - Config changes → State → UI
//   LogPathway.RANGE_SELECTOR  - Time slider interactions
//   LogPathway.LEGEND          - Legend rendering and categorization
//
// Usage:
//   1. Uncomment lines below
//   2. Set mode: 'exclusive' (strict filtering) or 'filter' (allow NONE pathway too)
//   3. Add pathways to enablePathways([...])
//   4. Rebuild: npm run build && npm run package
//   5. After debugging, comment out and rebuild to restore all logs

// DEBUG CONFIG: Enable pathway filtering
webviewLogger.setPathwayMode('exclusive');
webviewLogger.enablePathways([LogPathway.LEGEND]);
console.log('🔍 DEBUG MODE: LEGEND pathway active');

// ═══════════════════════════════════════════════════════════════════════════

// VSCode API
declare global {
    interface Window {
        acquireVsCodeApi(): any;
        vscode: any;
        d3: any;
        timelineApp: SimpleTimelineApp;
    }
}

/**
 * Initialize the webview
 */
function initializeWebview(): void {
    // Acquire VSCode API
    if (!window.vscode && typeof window.acquireVsCodeApi === 'function') {
        try {
            window.vscode = window.acquireVsCodeApi();
            // Set VSCode API for logger relay (optional)
            webviewLogger.setVSCodeAPI(window.vscode);
            webviewLogger.info(LogCategory.WEBVIEW, 'VSCode API acquired', 'initializeWebview');
        } catch (error) {
            webviewLogger.warn(LogCategory.WEBVIEW, 'Failed to acquire VSCode API', 'initializeWebview', error);
        }
    }

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startApplication);
    } else {
        startApplication();
    }
}

/**
 * Start the application
 */
function startApplication(): void {
    if (typeof window.d3 === 'undefined') {
        webviewLogger.error(LogCategory.WEBVIEW, 'D3.js not loaded', 'startApplication');
        return;
    }

    try {
        webviewLogger.info(LogCategory.WEBVIEW, 'Starting timeline application', 'startApplication');
        window.timelineApp = new SimpleTimelineApp('visualization');
        setupResizeObserver();

        if (window.vscode) {
            webviewLogger.debug(LogCategory.WEBVIEW, 'Requesting initial data from extension', 'startApplication', undefined, LogPathway.WEBVIEW_MESSAGING);
            window.vscode.postMessage({ type: 'requestData' });
        }
    } catch (error) {
        webviewLogger.error(LogCategory.WEBVIEW, 'Failed to start application', 'startApplication', error);
    }
}

/**
 * Setup ResizeObserver for panel resize detection
 */
function setupResizeObserver(): void {
    const resizeObserver = new ResizeObserver(() => {
        if (window.timelineApp) {
            window.timelineApp.handleResize();
        }
    });

    resizeObserver.observe(document.body);
}

/**
 * Setup message handling
 */
function setupMessageHandling(): void {
    window.addEventListener('message', async event => {
        const message = event.data;

        try {
            switch (message.type) {
                case 'resize':
                    // Extension detected view visibility change (tab switch)
                    if (window.timelineApp) {
                        window.timelineApp.handleResize();
                    }
                    break;

                case 'timelineData':
                    handleTimelineData(message.data);
                    break;

                case 'filteredData':
                    handleTimelineData(message.data);
                    break;

                case 'colorModeChanged':
                    handleColorModeChanged(message.mode, message.enabledProviders);
                    break;

                case 'error':
                    console.error('[Webview] Error from extension:', message.message);
                    showError(message.message);
                    break;
            }
        } catch (error) {
            console.error('[Webview] Error handling message:', error);
        }
    });
}

/**
 * Handle timeline data from extension
 */
function handleTimelineData(data: any): void {
    webviewLogger.debug(LogCategory.WEBVIEW, 'Received timeline data from extension', 'handleTimelineData', {
        hasAllEvents: !!data.allEvents,
        hasFilteredEvents: !!data.filteredEvents,
        allEventsCount: data.allEvents?.length,
        filteredEventsCount: data.filteredEvents?.length,
        repoPath: data.repoPath
    }, LogPathway.WEBVIEW_MESSAGING);

    // Support both old format (events) and new format (allEvents + filteredEvents)
    const allEvents = data.allEvents || data.events;
    const filteredEvents = data.filteredEvents || data.events;

    // DEBUG: Check if sources[] survived postMessage
    if (allEvents) {
        const eventsWithSources = allEvents.filter((e: any) => e.sources && e.sources.length > 0);
        webviewLogger.debug(LogCategory.DATA, `Received ${allEvents.length} events, ${eventsWithSources.length} have sources[]`, 'handleTimelineData', undefined, LogPathway.DATA_INGESTION);
        if (eventsWithSources.length > 0) {
            const sample = eventsWithSources[0];
            console.log(`[main.ts] Sample event after postMessage:`, {
                title: sample.title,
                hasSources: !!sample.sources,
                sourcesCount: sample.sources?.length,
                sources: sample.sources?.map((s: any) => s.providerId)
            });
        }
    }

    if (!allEvents || !data.filterOptions) {
        webviewLogger.error(LogCategory.WEBVIEW, 'Invalid data structure received', 'handleTimelineData', data);
        return;
    }

    if (!window.timelineApp) {
        webviewLogger.error(LogCategory.WEBVIEW, 'TimelineApp not initialized', 'handleTimelineData');
        return;
    }

    webviewLogger.debug(LogCategory.WEBVIEW, `Passing data to TimelineApp: ${allEvents.length} total, ${filteredEvents.length} filtered`, 'handleTimelineData', undefined, LogPathway.DATA_INGESTION);
    window.timelineApp.handleTimelineData(
        allEvents,
        filteredEvents,
        data.filterOptions,
        data.repoPath || '',
        data.activeFile,
        data.appliedFilters  // Pass applied filters for branch visibility filtering
    );
}

/**
 * Handle color mode change
 */
function handleColorModeChanged(mode: string, enabledProviders?: string[]): void {
    webviewLogger.debug(LogCategory.UI, `Color mode changed to: ${mode}`, 'handleColorModeChanged', { enabledProviders }, LogPathway.CONFIG_SYNC);

    // Update active providers first (critical for sync-state mode to work)
    if (enabledProviders && enabledProviders.length > 0) {
        EventVisualTheme.setActiveProviders(enabledProviders);
        webviewLogger.debug(LogCategory.UI, 'Updated active providers in EventVisualTheme', 'handleColorModeChanged', enabledProviders, LogPathway.CONFIG_SYNC);
    }

    // Set color mode on EventVisualTheme
    EventVisualTheme.setColorMode(mode as any);

    // Re-render timeline with new color mode
    if (window.timelineApp) {
        webviewLogger.debug(LogCategory.VISUALIZATION, 'Re-rendering timeline with new color mode', 'handleColorModeChanged', undefined, LogPathway.RENDER_PIPELINE);
        window.timelineApp.rerender();
    }
}

/**
 * Show error message
 */
function showError(message: string): void {
    const container = document.getElementById('visualization');
    if (container) {
        container.innerHTML = `
            <div style="padding: 20px; color: #ff6b6b; text-align: center;">
                <h3>Error</h3>
                <p>${message}</p>
            </div>
        `;
    }
}

// Initialize
setupMessageHandling();
initializeWebview();
