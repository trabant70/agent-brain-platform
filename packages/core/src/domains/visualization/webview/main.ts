/**
 * Webview Entry Point - Clean v0.3.0 Architecture
 *
 * Simple flow: CanonicalEvent[] → SimpleTimelineApp → Renderer
 */

import * as d3 from 'd3';
import { SimpleTimelineApp } from './SimpleTimelineApp';
import { EventVisualTheme } from '../theme/EventVisualTheme';
import { webviewLogger, LogLevel, LogCategory, LogPathway } from './WebviewLogger';
import { initI18n } from './i18n';

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

    // Get the webview URIs that were injected by the provider
    const lightSrc = diagram.getAttribute('data-light-src');
    const darkSrc = diagram.getAttribute('data-dark-src');

    if (!lightSrc || !darkSrc) {
        webviewLogger.warn(LogCategory.WEBVIEW, 'Architecture diagram data attributes not found', 'updateArchitectureDiagram');
        return;
    }

    const targetSrc = isDark ? darkSrc : lightSrc;
    const currentSrc = diagram.getAttribute('src') || '';

    // Only update if needed (avoid unnecessary reloads)
    if (currentSrc !== targetSrc) {
        diagram.setAttribute('src', targetSrc);
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
        webviewLogger.info(LogCategory.WEBVIEW, 'TimelineApp created and assigned to window', 'startApplication', {
            hasTimelineApp: !!window.timelineApp,
            hasSessionController: !!((window as any).sessionController),
            appHasSessionController: !!(window.timelineApp && (window.timelineApp as any).sessionController)
        });
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
    console.log('[main.ts] setupMessageHandling() called - message listener being attached');
    window.addEventListener('message', async event => {
        const message = event.data;
        console.log('[main.ts] Message received:', message.type, message);

        try {
            switch (message.type) {
                case 'i18n:init':
                    // Initialize internationalization with locale and translations
                    console.log('[main.ts] Received i18n:init message:', {
                        locale: message.payload?.locale,
                        translationsCount: message.payload?.translations ? Object.keys(message.payload.translations).length : 0,
                        hasPayload: !!message.payload,
                        payloadKeys: message.payload ? Object.keys(message.payload) : []
                    });

                    if (message.payload && message.payload.locale && message.payload.translations) {
                        initI18n(message.payload.locale, message.payload.translations);
                        webviewLogger.info(
                            LogCategory.WEBVIEW,
                            `i18n initialized with locale: ${message.payload.locale}, ${Object.keys(message.payload.translations).length} keys`,
                            'setupMessageHandling'
                        );
                    } else {
                        console.error('[main.ts] i18n:init message missing required fields!', message);
                    }
                    break;

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
                    // Reload knowledge data
                    requestKnowledgeData();
                    break;

                case 'knowledge:success':
                    showKnowledgeSuccess(message.payload.message);
                    break;

                case 'knowledge:template-created':
                    handleTemplateCreated(message.payload);
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

                default:
                    // Route threading messages to ThreadingViewController
                    if (message.type.startsWith('threading:')) {
                        const threadingController = (window as any).threadingController;
                        if (threadingController && typeof threadingController.handleMessage === 'function') {
                            threadingController.handleMessage(message);
                            webviewLogger.debug(
                                LogCategory.WEBVIEW,
                                `Routed threading message to ThreadingViewController: ${message.type}`,
                                'setupMessageHandling',
                                { messageType: message.type }
                            );
                        } else {
                            webviewLogger.warn(
                                LogCategory.WEBVIEW,
                                `ThreadingViewController not available for threading message: ${message.type}`,
                                'setupMessageHandling',
                                { messageType: message.type }
                            );
                        }
                    }
                    // Route V1 Template Sections messages to KnowledgeViewController
                    else if (message.type.startsWith('v1:')) {
                        const knowledgeController = (window as any).knowledgeController;
                        if (knowledgeController && typeof knowledgeController.handleMessage === 'function') {
                            knowledgeController.handleMessage(message);
                            webviewLogger.debug(
                                LogCategory.WEBVIEW,
                                `Routed V1 message to KnowledgeViewController: ${message.type}`,
                                'setupMessageHandling',
                                { messageType: message.type },
                                LogPathway.KNOWLEDGE_MANAGEMENT
                            );
                        } else {
                            webviewLogger.warn(
                                LogCategory.WEBVIEW,
                                `KnowledgeViewController not available for V1 message: ${message.type}`,
                                'setupMessageHandling',
                                { messageType: message.type },
                                LogPathway.KNOWLEDGE_MANAGEMENT
                            );
                        }
                    }
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
 * Handle template created - select it in the dropdown
 */
function handleTemplateCreated(payload: any): void {
    webviewLogger.info(
        LogCategory.UI,
        'Template created, selecting in dropdown',
        'handleTemplateCreated',
        { templateId: payload.templateId, templateName: payload.templateName },
        LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Show success notification
    showKnowledgeSuccess(payload.message);

    // Select the newly created template in the dropdown
    const knowledgeController = (window as any).knowledgeController;
    if (knowledgeController && typeof knowledgeController.selectTemplate === 'function') {
        knowledgeController.selectTemplate(payload.templateId);
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

    // Debug: Log what's available
    webviewLogger.info(
        LogCategory.WEBVIEW,
        'Checking for session controller',
        'handleSessionsLoaded',
        {
            windowSessionController: typeof (window as any).sessionController,
            windowTimelineApp: typeof window.timelineApp,
            windowKeys: Object.keys(window).filter(k => k.includes('session') || k.includes('timeline'))
        },
        LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Try to get controller from window, fallback to timelineApp instance
    let sessionController = (window as any).sessionController;

    if (!sessionController && window.timelineApp && (window.timelineApp as any).sessionController) {
        webviewLogger.info(
            LogCategory.WEBVIEW,
            'Controller not on window, using timelineApp instance',
            'handleSessionsLoaded',
            undefined,
            LogPathway.KNOWLEDGE_MANAGEMENT
        );
        sessionController = (window.timelineApp as any).sessionController;
        // Also assign to window for future messages
        (window as any).sessionController = sessionController;
    }

    if (sessionController) {
        webviewLogger.debug(
            LogCategory.WEBVIEW,
            'Passing sessions data to controller',
            'handleSessionsLoaded',
            { sessionsToLoad: data.sessions?.length || 0 },
            LogPathway.KNOWLEDGE_MANAGEMENT
        );

        sessionController.loadData(data.sessions);

        webviewLogger.info(
            LogCategory.UI,
            'Sessions loaded into controller',
            'handleSessionsLoaded',
            { sessionsLoaded: data.sessions?.length || 0 },
            LogPathway.KNOWLEDGE_MANAGEMENT
        );
    } else {
        webviewLogger.error(
            LogCategory.WEBVIEW,
            'Cannot load sessions - controller not available anywhere',
            'handleSessionsLoaded',
            {
                hasWindowController: !!(window as any).sessionController,
                hasTimelineApp: !!window.timelineApp,
                hasAppController: !!(window.timelineApp && (window.timelineApp as any).sessionController)
            },
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

// ============================================
// Marketplace Message Handlers
// ============================================

/**
 * Handle marketplace templates loaded
 */
function showValidationLogViewer(template: any, validationResult: any): void {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'validation-log-overlay';
    overlay.innerHTML = `
        <div class="validation-log-modal">
            <div class="validation-log-header">
                <h2>🔒 Security Validation Complete</h2>
                <p class="template-name">${escapeHtml(template.name)}</p>
            </div>

            <div class="validation-log-summary">
                ${renderValidationSummary(validationResult)}
            </div>

            <div class="validation-log-details">
                <button class="btn btn-secondary validation-toggle-details" id="toggle-validation-details">
                    📋 View Detailed Validation Log
                </button>
                <div class="validation-details-content" id="validation-details-content" style="display: none;">
                    ${renderValidationDetails(validationResult)}
                </div>
            </div>

            <div class="validation-log-footer">
                <button class="btn btn-secondary" id="validation-cancel-btn">Cancel</button>
                <button class="btn btn-primary" id="validation-proceed-btn">
                    ✓ Proceed with Import
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Attach event listeners
    const toggleBtn = document.getElementById('toggle-validation-details');
    const detailsContent = document.getElementById('validation-details-content');
    const cancelBtn = document.getElementById('validation-cancel-btn');
    const proceedBtn = document.getElementById('validation-proceed-btn');

    if (toggleBtn && detailsContent) {
        toggleBtn.addEventListener('click', () => {
            const isVisible = detailsContent.style.display !== 'none';
            detailsContent.style.display = isVisible ? 'none' : 'block';
            toggleBtn.textContent = isVisible ? '📋 View Detailed Validation Log' : '📋 Hide Validation Log';
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
    }

    if (proceedBtn) {
        proceedBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
            // Confirm import with extension
            window.vscode.postMessage({
                type: 'marketplace:confirm-import',
                payload: { template }
            });
        });
    }
}

/**
 * Render validation summary section
 */
function renderValidationSummary(validationResult: any): string {
    const { metadata } = validationResult;
    const threats = metadata.threatsDetected;
    const totalThreats = Object.values(threats).reduce((sum: number, count: any) => sum + count, 0);
    const validatorChecks = metadata.validatorChecks || [];

    const statusIcon = validationResult.isValid ? '✅' : '⚠️';
    const statusText = validationResult.isValid ? 'All Checks Passed' : 'Issues Detected';
    const statusClass = validationResult.isValid ? 'success' : 'warning';

    // Count passed/failed validators
    const passedCount = validatorChecks.filter((v: any) => v.passed).length;
    const failedCount = validatorChecks.filter((v: any) => !v.passed).length;

    return `
        <div class="validation-status ${statusClass}">
            <span class="status-icon">${statusIcon}</span>
            <span class="status-text">${statusText}</span>
        </div>

        <div class="validation-stats">
            <div class="stat">
                <span class="stat-label">Validators Run:</span>
                <span class="stat-value">${metadata.validatorsRun.length}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Passed:</span>
                <span class="stat-value" style="color: var(--vscode-testing-iconPassed)">${passedCount}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Failed:</span>
                <span class="stat-value ${failedCount > 0 ? 'error' : ''}">${failedCount}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Execution Time:</span>
                <span class="stat-value">${metadata.durationMs}ms</span>
            </div>
        </div>

        ${validatorChecks.length > 0 ? `
            <div class="validator-checklist">
                <h4>📋 Validation Checklist</h4>
                <div class="checklist-items">
                    ${validatorChecks.map((check: any) => {
                        const icon = check.passed ? '✅' : '❌';
                        const status = check.passed ? 'passed' : 'failed';
                        const categoryLabel = check.category === 'structure' ? '📐 Structure' :
                                            check.category === 'security' ? '🔒 Security' : '💼 Business';
                        const errorCount = check.errors.length;
                        const warningCount = check.warnings.length;

                        return `
                            <div class="checklist-item ${status}">
                                <span class="check-icon">${icon}</span>
                                <div class="check-content">
                                    <div class="check-header">
                                        <span class="check-name">${escapeHtml(check.name)}</span>
                                        <span class="check-category">${categoryLabel}</span>
                                    </div>
                                    ${!check.passed ? `
                                        <div class="check-issues">
                                            ${errorCount > 0 ? `<span class="issue-count error">⚠️ ${errorCount} error${errorCount > 1 ? 's' : ''}</span>` : ''}
                                            ${warningCount > 0 ? `<span class="issue-count warning">⚠️ ${warningCount} warning${warningCount > 1 ? 's' : ''}</span>` : ''}
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        ` : ''}

        ${totalThreats > 0 ? `
            <div class="threats-breakdown">
                <h4>🛡️ Threats Detected & Sanitized:</h4>
                <ul>
                    ${threats.xss > 0 ? `<li>🔒 XSS Attacks: ${threats.xss}</li>` : ''}
                    ${threats.promptInjection > 0 ? `<li>🤖 Prompt Injection: ${threats.promptInjection}</li>` : ''}
                    ${threats.unicode > 0 ? `<li>🔤 Unicode Exploits: ${threats.unicode}</li>` : ''}
                    ${threats.injection > 0 ? `<li>💉 Code Injection: ${threats.injection}</li>` : ''}
                    ${threats.pathTraversal > 0 ? `<li>📂 Path Traversal: ${threats.pathTraversal}</li>` : ''}
                </ul>
                <p class="sanitization-notice">✓ All threats have been automatically sanitized</p>
            </div>
        ` : ''}

        ${!validationResult.isValid ? `
            <div class="user-decision-notice">
                <p><strong>⚠️ Review the issues above and decide:</strong></p>
                <p>You can proceed with importing this template despite the validation failures. The content has been sanitized where possible.</p>
            </div>
        ` : ''}
    `;
}

/**
 * Render detailed validation log
 */
function renderValidationDetails(validationResult: any): string {
    const { metadata, errors, warnings } = validationResult;

    return `
        <div class="validation-log-section">
            <h4>Validators Executed:</h4>
            <ul class="validator-list">
                ${metadata.validatorsRun.map((name: string) => `
                    <li class="validator-item">
                        <span class="validator-icon">✓</span>
                        <span class="validator-name">${escapeHtml(name)}</span>
                    </li>
                `).join('')}
            </ul>
        </div>

        ${errors.length > 0 ? `
            <div class="validation-log-section">
                <h4>Errors Found (${errors.length}):</h4>
                <ul class="error-list">
                    ${errors.map((err: any) => `
                        <li class="error-item">
                            <div class="error-header">
                                <span class="error-code">[${err.code}]</span>
                                <span class="error-field">${escapeHtml(err.field)}</span>
                            </div>
                            <div class="error-message">${escapeHtml(err.message)}</div>
                            ${err.suggestion ? `
                                <div class="error-suggestion">💡 ${escapeHtml(err.suggestion)}</div>
                            ` : ''}
                        </li>
                    `).join('')}
                </ul>
            </div>
        ` : ''}

        ${warnings.length > 0 ? `
            <div class="validation-log-section">
                <h4>Warnings (${warnings.length}):</h4>
                <ul class="warning-list">
                    ${warnings.map((warn: any) => `
                        <li class="warning-item">
                            <div class="warning-header">
                                <span class="warning-code">[${warn.code}]</span>
                                <span class="warning-field">${escapeHtml(warn.field)}</span>
                            </div>
                            <div class="warning-message">${escapeHtml(warn.message)}</div>
                            ${warn.suggestion ? `
                                <div class="warning-suggestion">💡 ${escapeHtml(warn.suggestion)}</div>
                            ` : ''}
                        </li>
                    `).join('')}
                </ul>
            </div>
        ` : ''}

        <div class="validation-log-section">
            <h4>Performance:</h4>
            <div class="performance-stats">
                <div>Original Size: ${formatBytes(metadata.originalSize)}</div>
                ${metadata.sanitizedSize ? `
                    <div>Sanitized Size: ${formatBytes(metadata.sanitizedSize)}</div>
                ` : ''}
                <div>Duration: ${metadata.durationMs}ms</div>
            </div>
        </div>
    `;
}

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/**
 * Escape HTML to prevent XSS in displayed content
 */
function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Setup support sub-tabs handling
 */
function setupSupportSubTabs(): void {
    const subTabButtons = document.querySelectorAll('.support-sub-tab');
    const subContents = document.querySelectorAll('.support-sub-content');

    subTabButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const targetTab = (button as HTMLElement).getAttribute('data-support-tab');

            if (!targetTab) {
                return;
            }

            // Update button states
            subTabButtons.forEach((btn) => {
                const isActive = (btn as HTMLElement).getAttribute('data-support-tab') === targetTab;
                if (isActive) {
                    btn.classList.add('active');
                    (btn as HTMLElement).style.background = 'var(--vscode-tab-activeBackground)';
                    (btn as HTMLElement).style.color = 'var(--vscode-tab-activeForeground)';
                    (btn as HTMLElement).style.fontWeight = '500';
                } else {
                    btn.classList.remove('active');
                    (btn as HTMLElement).style.background = 'var(--vscode-tab-inactiveBackground)';
                    (btn as HTMLElement).style.color = 'var(--vscode-tab-inactiveForeground)';
                    (btn as HTMLElement).style.fontWeight = 'normal';
                }
            });

            // Update content visibility
            subContents.forEach((content) => {
                const contentId = (content as HTMLElement).id;
                const isActive = contentId === `support-tab-${targetTab}`;
                if (isActive) {
                    (content as HTMLElement).style.display = 'flex';
                    (content as HTMLElement).classList.add('active');
                } else {
                    (content as HTMLElement).style.display = 'none';
                    (content as HTMLElement).classList.remove('active');
                }
            });

            webviewLogger.debug(LogCategory.UI, `Switched to support sub-tab: ${targetTab}`, 'setupSupportSubTabs');
        });
    });

    webviewLogger.debug(LogCategory.UI, 'Support sub-tabs initialized', 'setupSupportSubTabs');
}

/**
 * Setup diagram zoom and pan functionality
 */
function setupDiagramZoom(): void {
    const diagram = document.getElementById('architecture-diagram') as HTMLImageElement;
    const viewport = document.getElementById('diagram-viewport') as HTMLElement;
    const container = document.getElementById('diagram-container') as HTMLElement;
    const zoomInBtn = document.getElementById('diagram-zoom-in') as HTMLButtonElement;
    const zoomOutBtn = document.getElementById('diagram-zoom-out') as HTMLButtonElement;
    const zoomResetBtn = document.getElementById('diagram-zoom-reset') as HTMLButtonElement;

    if (!diagram || !viewport || !container || !zoomInBtn || !zoomOutBtn || !zoomResetBtn) {
        webviewLogger.warn(LogCategory.UI, 'Diagram zoom elements not found', 'setupDiagramZoom');
        return;
    }

    // Zoom state
    let scale = 1;
    let translateX = 0;
    let translateY = 0;
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    const MIN_SCALE = 0.1;
    const MAX_SCALE = 5;
    const ZOOM_STEP = 0.2;

    /**
     * Apply current transform to viewport
     */
    function applyTransform(): void {
        viewport.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        webviewLogger.debug(LogCategory.UI, 'Applied diagram transform', 'applyTransform', { scale, translateX, translateY });
    }

    /**
     * Calculate initial scale to fit diagram in container
     */
    function calculateFitScale(): void {
        if (!container || !diagram) return;

        // Wait for image to load to get natural dimensions
        if (!diagram.complete) {
            diagram.addEventListener('load', calculateFitScale, { once: true });
            return;
        }

        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const imageWidth = diagram.naturalWidth || diagram.width;
        const imageHeight = diagram.naturalHeight || diagram.height;

        if (!containerWidth || !containerHeight || !imageWidth || !imageHeight) {
            webviewLogger.warn(LogCategory.UI, 'Cannot calculate fit scale - missing dimensions', 'calculateFitScale', {
                containerWidth,
                containerHeight,
                imageWidth,
                imageHeight
            });
            return;
        }

        // Calculate scale to fit both width and height with 20px padding
        const padding = 20;
        const scaleX = (containerWidth - padding * 2) / imageWidth;
        const scaleY = (containerHeight - padding * 2) / imageHeight;
        scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 1x initially

        // Center the image
        translateX = 0;
        translateY = 0;

        applyTransform();
        webviewLogger.info(LogCategory.UI, 'Calculated fit scale for diagram', 'calculateFitScale', {
            scale,
            containerWidth,
            containerHeight,
            imageWidth,
            imageHeight
        });
    }

    /**
     * Zoom in
     */
    function zoomIn(): void {
        const newScale = Math.min(scale + ZOOM_STEP, MAX_SCALE);
        if (newScale !== scale) {
            scale = newScale;
            applyTransform();
        }
    }

    /**
     * Zoom out
     */
    function zoomOut(): void {
        const newScale = Math.max(scale - ZOOM_STEP, MIN_SCALE);
        if (newScale !== scale) {
            scale = newScale;
            applyTransform();
        }
    }

    /**
     * Reset zoom to fit screen
     */
    function resetZoom(): void {
        calculateFitScale();
    }

    /**
     * Handle mouse wheel zoom
     */
    function handleWheel(e: WheelEvent): void {
        e.preventDefault();

        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale + delta));

        if (newScale !== scale) {
            scale = newScale;
            applyTransform();
        }
    }

    /**
     * Handle drag start
     */
    function handleDragStart(e: MouseEvent): void {
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        viewport.style.cursor = 'grabbing';
        e.preventDefault();
    }

    /**
     * Handle drag move
     */
    function handleDragMove(e: MouseEvent): void {
        if (!isDragging) return;

        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        applyTransform();
    }

    /**
     * Handle drag end
     */
    function handleDragEnd(): void {
        if (isDragging) {
            isDragging = false;
            viewport.style.cursor = 'grab';
        }
    }

    // Add event listeners
    zoomInBtn.addEventListener('click', zoomIn);
    zoomOutBtn.addEventListener('click', zoomOut);
    zoomResetBtn.addEventListener('click', resetZoom);
    viewport.addEventListener('wheel', handleWheel, { passive: false });
    viewport.addEventListener('mousedown', handleDragStart);
    viewport.addEventListener('mousemove', handleDragMove);
    viewport.addEventListener('mouseup', handleDragEnd);
    viewport.addEventListener('mouseleave', handleDragEnd);

    // Calculate initial fit
    calculateFitScale();

    // Recalculate on window resize
    window.addEventListener('resize', () => {
        if (scale === 1) {
            calculateFitScale();
        }
    });

    webviewLogger.info(LogCategory.UI, 'Diagram zoom and pan initialized', 'setupDiagramZoom');
}

// Initialize
setupMessageHandling();
initializeWebview();
setupSupportSubTabs();
setupDiagramZoom();
