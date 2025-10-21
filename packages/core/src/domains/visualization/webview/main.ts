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
import '../styles/components/knowledge.css';

// Expose D3 globally
window.d3 = d3;

// ═══════════════════════════════════════════════════════════════════════════
// PATHWAY LOGGING CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
//
// Pathway logging is now configured via VSCode settings:
//   - agentBrain.logging.pathwayMode: 'disabled' | 'filter' | 'exclusive'
//   - agentBrain.logging.enabledPathways: string[]
//   - agentBrain.logging.logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'NONE'
//
// Configuration is sent from extension to webview during initialization.
// Default Agent Brain pathways are enabled by default (see package.json).
//
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
 * Update architecture diagram based on theme
 */
function updateArchitectureDiagram(): void {
    const diagram = document.getElementById('architecture-diagram') as HTMLImageElement;
    if (!diagram) return;

    // VSCode adds 'vscode-light', 'vscode-dark', or 'vscode-high-contrast' class to body
    const isDark = document.body.classList.contains('vscode-dark') ||
                   document.body.classList.contains('vscode-high-contrast');

    const currentSrc = diagram.getAttribute('src') || '';
    const expectedSuffix = isDark ? '-dark.svg' : '.svg';

    // Only update if needed (avoid unnecessary reloads)
    if (!currentSrc.endsWith(expectedSuffix)) {
        const baseSrc = isDark
            ? 'assets/agentbrain-complete-diagram-dark.svg'
            : 'assets/agentbrain-complete-diagram.svg';
        diagram.setAttribute('src', baseSrc);
        webviewLogger.debug(LogCategory.WEBVIEW, `Updated diagram to ${isDark ? 'dark' : 'light'} theme`, 'updateArchitectureDiagram');
    }
}

/**
 * Setup theme observer to detect VSCode theme changes
 */
function setupThemeObserver(): void {
    // Initial update
    updateArchitectureDiagram();

    // Watch for theme changes (VSCode changes body class)
    const observer = new MutationObserver(() => {
        updateArchitectureDiagram();
    });

    observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class']
    });
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
        setupThemeObserver();

        if (window.vscode) {
            webviewLogger.debug(LogCategory.WEBVIEW, 'Requesting initial data from extension', 'startApplication', undefined, LogPathway.WEBVIEW_MESSAGING);
            window.vscode.postMessage({ type: 'requestData' });

            // Request initial knowledge data
            webviewLogger.debug(LogCategory.WEBVIEW, 'Requesting initial knowledge data', 'startApplication', undefined, LogPathway.KNOWLEDGE_MANAGEMENT);
            window.vscode.postMessage({ type: 'knowledge:load-request' });
            window.vscode.postMessage({ type: 'knowledge:scan-claude-files' });
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
                case 'loggingConfig':
                    handleLoggingConfig(message.config);
                    break;

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

                // Knowledge Management Messages
                case 'knowledge:loaded':
                    handleKnowledgeLoaded(message.payload);
                    break;

                case 'knowledge:claude-files':
                    handleClaudeMdFiles(message.payload);
                    break;

                case 'knowledge:item-updated':
                case 'knowledge:item-deleted':
                case 'knowledge:template-created':
                    // Reload knowledge data
                    requestKnowledgeData();
                    break;

                case 'knowledge:success':
                    showKnowledgeSuccess(message.payload.message);
                    break;

                case 'knowledge:error':
                    showKnowledgeError(message.payload.error);
                    break;

                // Session History Messages
                case 'sessions:loaded':
                    handleSessionsLoaded(message.payload);
                    break;

                case 'sessions:error':
                    showSessionsError(message.payload.error);
                    break;

                // Note: Legacy AI companion message handlers removed
                // (enhancedPrompt, showTip, showError, showComparison, knowledgePreview, promptEnhanced)
                // These features have been replaced by the modern Guidance, Plans, and Knowledge tabs
                // which use EventBus for real-time updates instead of postMessage handlers

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
 * Handle logging configuration from extension
 */
function handleLoggingConfig(config: any): void {
    if (!config) return;

    // Apply log level
    if (config.logLevel && LogLevel[config.logLevel as keyof typeof LogLevel] !== undefined) {
        webviewLogger.setLogLevel(LogLevel[config.logLevel as keyof typeof LogLevel]);
    }

    // Apply pathway mode
    if (config.pathwayMode) {
        webviewLogger.setPathwayMode(config.pathwayMode);
    }

    // Apply enabled pathways - map string codes to LogPathway enum values
    if (config.enabledPathways && Array.isArray(config.enabledPathways)) {
        const pathwayMap: { [key: string]: LogPathway } = {
            'INGEST': LogPathway.DATA_INGESTION,
            'FILTER': LogPathway.FILTER_APPLY,
            'PERSIST': LogPathway.STATE_PERSIST,
            'RENDER': LogPathway.RENDER_PIPELINE,
            'INTERACT': LogPathway.USER_INTERACTION,
            'MESSAGE': LogPathway.WEBVIEW_MESSAGING,
            'CONFIG': LogPathway.CONFIG_SYNC,
            'RANGE': LogPathway.RANGE_SELECTOR,
            'LEGEND': LogPathway.LEGEND,
            'KNOWLEDGE': LogPathway.KNOWLEDGE_MANAGEMENT,
            'GUID_INIT': LogPathway.GUIDANCE_INIT,
            'VALID': LogPathway.VALIDATION_FLOW,
            'PLAN': LogPathway.PLAN_MANAGEMENT,
            'MINI': LogPathway.MINIPLAN_LIFECYCLE,
            'DIAG': LogPathway.DIAGNOSTICS_FLOW,
            'GOLD': LogPathway.GOLDEN_PATH_TRACKING,
            'PROMPT': LogPathway.PROMPT_BUILDING,
            'EVT_FWD': LogPathway.EVENT_FORWARDING
        };

        const enabledPathways = config.enabledPathways
            .map((code: string) => pathwayMap[code])
            .filter((pathway: LogPathway | undefined) => pathway !== undefined);

        webviewLogger.enablePathways(enabledPathways);
    }

    console.log('[WebviewLogger] Configuration applied:', {
        mode: config.pathwayMode,
        pathways: config.enabledPathways,
        logLevel: config.logLevel
    });
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

/**
 * Handle knowledge data loaded from extension
 */
function handleKnowledgeLoaded(data: any): void {
    webviewLogger.info(LogCategory.WEBVIEW, 'Received knowledge data from extension', 'handleKnowledgeLoaded', {
        itemsCount: data.items?.length || 0,
        templatesCount: data.templates?.length || 0,
        items: data.items?.map((i: any) => ({ id: i.id, type: i.type, title: i.title })) || []
    }, LogPathway.KNOWLEDGE_MANAGEMENT);

    if (window.timelineApp && (window as any).knowledgeController) {
        webviewLogger.debug(LogCategory.WEBVIEW, 'Passing knowledge data to controller', 'handleKnowledgeLoaded', {
            hasController: !!(window as any).knowledgeController,
            itemsToLoad: data.items?.length || 0
        }, LogPathway.KNOWLEDGE_MANAGEMENT);

        (window as any).knowledgeController.loadData(data);

        webviewLogger.info(LogCategory.UI, 'Knowledge data loaded into controller', 'handleKnowledgeLoaded', {
            itemsLoaded: data.items?.length || 0,
            templatesLoaded: data.templates?.length || 0
        }, LogPathway.KNOWLEDGE_MANAGEMENT);
    } else {
        webviewLogger.warn(LogCategory.WEBVIEW, 'Cannot load knowledge data - controller not available', 'handleKnowledgeLoaded', {
            hasTimelineApp: !!window.timelineApp,
            hasController: !!(window as any).knowledgeController
        }, LogPathway.KNOWLEDGE_MANAGEMENT);
    }
}

/**
 * Handle claude.md files from extension
 */
function handleClaudeMdFiles(data: any): void {
    webviewLogger.info(LogCategory.WEBVIEW, 'Received claude.md files from extension', 'handleClaudeMdFiles', {
        filesCount: data.files?.length || 0,
        files: data.files?.map((f: any) => ({ path: f.path, contentLength: f.content?.length || 0 })) || []
    }, LogPathway.KNOWLEDGE_MANAGEMENT);

    if ((window as any).knowledgeController) {
        webviewLogger.debug(LogCategory.WEBVIEW, 'Passing claude.md files to controller', 'handleClaudeMdFiles', {
            hasController: !!(window as any).knowledgeController,
            filesToLoad: data.files?.length || 0
        }, LogPathway.KNOWLEDGE_MANAGEMENT);

        (window as any).knowledgeController.loadClaudeMdFiles(data.files);

        webviewLogger.info(LogCategory.UI, 'Claude.md files loaded into controller', 'handleClaudeMdFiles', {
            filesLoaded: data.files?.length || 0
        }, LogPathway.KNOWLEDGE_MANAGEMENT);
    } else {
        webviewLogger.warn(LogCategory.WEBVIEW, 'Cannot load claude.md files - controller not available', 'handleClaudeMdFiles', {
            hasController: !!(window as any).knowledgeController
        }, LogPathway.KNOWLEDGE_MANAGEMENT);
    }
}

/**
 * Request knowledge data from extension
 */
function requestKnowledgeData(): void {
    if (window.vscode) {
        window.vscode.postMessage({ type: 'knowledge:load-request' });
    }
}

/**
 * Show knowledge success message
 */
function showKnowledgeSuccess(message: string): void {
    webviewLogger.info(LogCategory.UI, `Knowledge success: ${message}`, 'showKnowledgeSuccess');

    // Show success notification via KnowledgeViewController
    const knowledgeController = (window as any).knowledgeController;
    if (knowledgeController && typeof knowledgeController.handleOperationResult === 'function') {
        knowledgeController.handleOperationResult('Operation', true, message);
    }
}

/**
 * Show knowledge error message
 */
function showKnowledgeError(error: string): void {
    webviewLogger.error(LogCategory.UI, `Knowledge error: ${error}`, 'showKnowledgeError');

    // Show error notification via KnowledgeViewController
    const knowledgeController = (window as any).knowledgeController;
    if (knowledgeController && typeof knowledgeController.handleOperationResult === 'function') {
        knowledgeController.handleOperationResult('Operation', false, error);
    }
}

/**
 * Handle sessions loaded from extension
 */
function handleSessionsLoaded(data: any): void {
    webviewLogger.info(
        LogCategory.WEBVIEW,
        'Received sessions data from extension',
        'handleSessionsLoaded',
        { sessionsCount: data.sessions?.length || 0 },
        LogPathway.KNOWLEDGE_MANAGEMENT
    );

    if ((window as any).sessionController) {
        webviewLogger.debug(
            LogCategory.WEBVIEW,
            'Passing sessions data to controller',
            'handleSessionsLoaded',
            { hasController: !!(window as any).sessionController, sessionsToLoad: data.sessions?.length || 0 },
            LogPathway.KNOWLEDGE_MANAGEMENT
        );

        (window as any).sessionController.loadData(data.sessions);

        webviewLogger.info(
            LogCategory.UI,
            'Sessions loaded into controller',
            'handleSessionsLoaded',
            { sessionsLoaded: data.sessions?.length || 0 },
            LogPathway.KNOWLEDGE_MANAGEMENT
        );
    } else {
        webviewLogger.warn(
            LogCategory.WEBVIEW,
            'Cannot load sessions - controller not available',
            'handleSessionsLoaded',
            { hasController: !!(window as any).sessionController },
            LogPathway.KNOWLEDGE_MANAGEMENT
        );
    }
}

/**
 * Show sessions error message
 */
function showSessionsError(error: string): void {
    webviewLogger.error(LogCategory.UI, `Sessions error: ${error}`, 'showSessionsError');
    console.error('[Sessions] Error:', error);
}

// Initialize
setupMessageHandling();
initializeWebview();
