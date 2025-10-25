/**
 * SimpleTimelineApp - Refactored Facade
 *
 * REFACTORED: Now a clean facade coordinating specialized services.
 * Reduced from 976 lines to ~600 lines.
 *
 * Delegates to:
 * - EventProcessor (Event processing and transformation)
 * - StatisticsCalculator (Statistics computation and display)
 * - ResizeHandler (Resize and tab change handling)
 *
 * Works directly with CanonicalEvent[] from backend
 * Handles timeline rendering for Git and GitHub events
 * No legacy transformation layers, no old state management
 */

import { D3TimelineRendererImpl } from '../timeline/D3TimelineRendererImpl';
import { UIControllerManager } from '../ui/UIControllerManager';
import { TabManager } from '../ui/TabManager';
import { KnowledgeViewController } from '../ui/KnowledgeViewController';
import { SessionViewController } from '../ui/SessionViewController';
import { webviewLogger, LogCategory, LogPathway } from './WebviewLogger';

// Specialized services (NEW - Facade Pattern)
import { EventProcessor, StatisticsCalculator, ResizeHandler } from './services';

interface CanonicalEvent {
    id: string;
    timestamp: string | Date;
    type: string;
    title: string;
    description?: string;
    author: { id: string; name: string };
    branches: string[];
    primaryBranch?: string;
    hash?: string;
    fullHash?: string;
    providerId?: string;
    sources?: any[];
    impact?: any;
    metadata?: any;
}

interface FilterOptions {
    branches: string[];
    authors: string[];
    eventTypes: string[];
    providers: string[];
    dateRange?: { earliest: Date; latest: Date };
}

export class SimpleTimelineApp {
    private renderer: D3TimelineRendererImpl;
    private uiManager: UIControllerManager;
    private tabManager: TabManager;
    private knowledgeController: KnowledgeViewController;
    private sessionController: SessionViewController;
    private currentEvents: CanonicalEvent[] = [];
    private currentFilterOptions: FilterOptions | null = null;
    private currentAppliedFilters: any = null;  // Current filter state for branch visibility
    private currentProcessedData: any = null;
    private container: HTMLElement;
    private currentRepoPath: string = '';
    private isTimelineTabActive: boolean = true;

    // Specialized services (NEW)
    private eventProcessor: EventProcessor;
    private statisticsCalculator: StatisticsCalculator;
    private resizeHandler: ResizeHandler;

    constructor(containerId: string = 'visualization') {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container #${containerId} not found`);
        }
        this.container = container;

        webviewLogger.info(LogCategory.VISUALIZATION, 'Initializing SimpleTimelineApp with refactored architecture', 'constructor');

        // Initialize specialized services (NEW - Facade Pattern)
        this.eventProcessor = new EventProcessor();
        this.statisticsCalculator = new StatisticsCalculator();
        this.resizeHandler = new ResizeHandler();

        webviewLogger.debug(LogCategory.VISUALIZATION, 'Specialized services initialized', 'constructor', {
            eventProcessor: !!this.eventProcessor,
            statisticsCalculator: !!this.statisticsCalculator,
            resizeHandler: !!this.resizeHandler
        });

        this.uiManager = new UIControllerManager({
            colorMap: {},
            onFilterUpdate: (filterType: string, values: string[]) => {
                webviewLogger.debug(LogCategory.UI, `Filter update: ${filterType}`, 'constructor', values, LogPathway.FILTER_APPLY);
            }
        });

        webviewLogger.debug(LogCategory.VISUALIZATION, 'Initializing renderer', 'constructor', undefined, LogPathway.RENDER_PIPELINE);
        this.renderer = new D3TimelineRendererImpl();

        // Setup renderer with callbacks
        this.renderer.initialize(container, {
            animations: true,
            customSettings: { showLegend: true },
            theme: 'cosmic'
        });

        // Initialize UI controllers
        this.uiManager.initialize().then(() => {
            webviewLogger.info(LogCategory.UI, 'UI controllers initialized', 'constructor');
            this.connectFilterCallbacks();
        });

        // Initialize tab manager
        this.tabManager = new TabManager();
        this.tabManager.initialize();

        // Listen for tab changes to pause/resume timeline rendering
        this.tabManager.on('tab:changed', (event: any) => {
            this.handleTabChange(event);
        });

        webviewLogger.info(LogCategory.UI, 'Tab manager initialized', 'constructor');

        // Initialize knowledge controller
        this.knowledgeController = new KnowledgeViewController();

        // Make knowledge controller globally accessible BEFORE initialize (so message responses work)
        (window as any).knowledgeController = this.knowledgeController;

        this.knowledgeController.initialize((message) => {
            // Forward knowledge messages to extension
            if (window.vscode) {
                window.vscode.postMessage(message);
            }
        });

        webviewLogger.info(LogCategory.UI, 'Knowledge controller initialized', 'constructor');

        // If knowledge tab is already active (restored from localStorage), request initial data
        if (this.tabManager.getActiveTab() === 'knowledge') {
            webviewLogger.info(LogCategory.UI, 'Knowledge tab is active on initialization - requesting data', 'constructor', undefined, LogPathway.KNOWLEDGE_MANAGEMENT);
            if (window.vscode) {
                window.vscode.postMessage({ type: 'knowledge:load-request' });
                window.vscode.postMessage({ type: 'knowledge:scan-claude-files' });
            }
        }

        // Initialize session controller
        webviewLogger.info(LogCategory.UI, 'Creating SessionViewController...', 'constructor', undefined, LogPathway.KNOWLEDGE_MANAGEMENT);
        this.sessionController = new SessionViewController();
        webviewLogger.info(LogCategory.UI, 'SessionViewController created', 'constructor', { hasController: !!this.sessionController }, LogPathway.KNOWLEDGE_MANAGEMENT);

        // Make session controller globally accessible BEFORE initialize (so message responses work)
        (window as any).sessionController = this.sessionController;
        webviewLogger.info(LogCategory.UI, 'Session controller assigned to window', 'constructor', {
            onWindow: !!(window as any).sessionController,
            onThis: !!this.sessionController
        }, LogPathway.KNOWLEDGE_MANAGEMENT);

        this.sessionController.initialize((message) => {
            // Forward session messages to extension
            if (window.vscode) {
                window.vscode.postMessage(message);
            }
        });

        webviewLogger.info(LogCategory.UI, 'Session controller initialized', 'constructor', {
            onWindow: !!(window as any).sessionController,
            onThis: !!this.sessionController
        }, LogPathway.KNOWLEDGE_MANAGEMENT);

        // If sessions tab is already active (restored from localStorage), request initial data
        if (this.tabManager.getActiveTab() === 'sessions') {
            webviewLogger.info(LogCategory.UI, 'Sessions tab is active on initialization - requesting data', 'constructor', undefined, LogPathway.KNOWLEDGE_MANAGEMENT);
            this.sessionController.requestInitialLoad();
        }

        // Setup brush callback for range selector
        this.setupRendererCallbacks();

        // Setup legend toggle controls
        this.setupLegendToggle();

        webviewLogger.info(LogCategory.VISUALIZATION, 'Renderer initialized', 'constructor');
    }

    /**
     * Connect filter callbacks to extension
     */
    private connectFilterCallbacks() {
        const filterController = this.uiManager.getFilterController();

        filterController.setCallbacks({
            onFilterUpdate: (filters) => {
                webviewLogger.debug(LogCategory.FILTERING, 'Filter update callback triggered', 'onFilterUpdate', filters, LogPathway.FILTER_APPLY);

                // Send filter update to extension
                if (window.vscode) {
                    webviewLogger.debug(LogCategory.WEBVIEW, 'Sending updateFilters message to extension', 'onFilterUpdate', undefined, LogPathway.WEBVIEW_MESSAGING);
                    window.vscode.postMessage({
                        type: 'updateFilters',
                        filters: filters
                    });
                } else {
                    webviewLogger.error(LogCategory.WEBVIEW, 'VSCode API not available for filter update', 'onFilterUpdate');
                }
            },
            onRefreshRequest: () => {
                webviewLogger.debug(LogCategory.UI, 'Refresh requested by user', 'onRefreshRequest', undefined, LogPathway.USER_INTERACTION);
                // Send refresh request to extension
                if (window.vscode) {
                    window.vscode.postMessage({
                        type: 'refreshData'
                    });
                }
            }
        });
    }

    /**
     * Setup renderer callbacks
     */
    private setupRendererCallbacks() {
        // Hook into the renderer's onBrush callback
        const originalOnBrush = (this.renderer as any).handleBrush?.bind(this.renderer);

        (this.renderer as any).handleBrush = (selection: [Date, Date] | null) => {

            // Call original handler
            if (originalOnBrush) {
                originalOnBrush(selection);
            }

            // Update viewport when brush changes
            if (selection && this.currentProcessedData) {
                this.updateViewport(selection);
            }

            // Persist time window state via FilterController
            const filterController = this.uiManager.getFilterController();
            if (selection) {
                filterController.updateTimeWindow({
                    start: selection[0],
                    end: selection[1]
                });
            } else {
                filterController.updateTimeWindow(null);
            }
        };

        // Connect event handlers from PopupController to renderer
        const eventHandlers = this.uiManager.getEventHandlers();
        (this.renderer as any).eventHandlers = eventHandlers;
    }

    /**
     * Setup legend toggle controls
     */
    private setupLegendToggle() {
        const legendElement = document.getElementById('timeline-legend');
        const legendTrigger = document.getElementById('legend-trigger');
        const legendClose = document.getElementById('legend-close');

        if (!legendElement || !legendTrigger || !legendClose) {
            webviewLogger.warn(LogCategory.UI, 'Legend elements not found', 'setupLegendToggle');
            return;
        }

        // Always start with legend visible on extension load
        // User can toggle during session, but it resets to visible on next load
        const isVisible = true;

        // Ensure legend is visible (remove hidden class if present)
        legendElement.classList.remove('hidden');

        // Toggle legend visibility
        const toggleLegend = (visible: boolean) => {
            if (visible) {
                legendElement.classList.remove('hidden');
            } else {
                legendElement.classList.add('hidden');
            }
            localStorage.setItem('timeline-legend-visible', visible.toString());

            webviewLogger.debug(
                LogCategory.UI,
                `Legend ${visible ? 'shown' : 'hidden'}`,
                'toggleLegend',
                { visible },
                LogPathway.LEGEND
            );
        };

        // Legend button - show legend
        legendTrigger.addEventListener('click', () => {
            toggleLegend(true);
        });

        // Close button - hide legend
        legendClose.addEventListener('click', (e) => {
            e.stopPropagation(); // Don't trigger drag
            toggleLegend(false);
        });

        webviewLogger.info(
            LogCategory.UI,
            'Legend toggle initialized',
            'setupLegendToggle',
            { initiallyVisible: isVisible },
            LogPathway.LEGEND
        );
    }

    /**
     * Update viewport based on brush selection
     */
    private updateViewport(dateRange: [Date, Date]) {
        if (!this.currentProcessedData) return;


        // Filter events to visible range
        const visibleEvents = this.currentProcessedData.allEvents.filter((event: any) => {
            const eventDate = new Date(event.timestamp);
            return eventDate >= dateRange[0] && eventDate <= dateRange[1];
        });


        // Update renderer viewport
        this.renderer.updateViewport(dateRange);
    }

    /**
     * Handle data from backend
     *
     * @param allEvents - All events (unfiltered) for total counts
     * @param filteredEvents - Filtered events for rendering
     * @param filterOptions - Available filter options
     * @param repoPath - Repository path
     * @param activeFile - Active file name (optional)
     */
    async handleTimelineData(
        allEvents: CanonicalEvent[],
        filteredEvents: CanonicalEvent[],
        filterOptions: FilterOptions,
        repoPath: string,
        activeFile?: string,
        appliedFilters?: any
    ) {
        webviewLogger.info(LogCategory.DATA, `Handling timeline data: ${allEvents.length} total, ${filteredEvents.length} filtered for ${repoPath}`, 'handleTimelineData', undefined, LogPathway.DATA_INGESTION);

        // Update EventVisualTheme with enabled providers for sync mode availability
        // DataOrchestrator is source of truth - no fallback defaults
        const enabledProviders = appliedFilters?.enabledProviders || [];
        webviewLogger.debug(LogCategory.VISUALIZATION, 'Setting active providers from appliedFilters', 'handleTimelineData', { enabledProviders }, LogPathway.CONFIG_SYNC);
        const EventVisualTheme = (window as any).EventVisualTheme;
        if (EventVisualTheme) {
            EventVisualTheme.setActiveProviders(enabledProviders);
        }

        // Update legend with enabled providers for tab visibility
        if ((this.renderer as any).d3Renderer) {
            const d3Renderer = (this.renderer as any).d3Renderer;
            if (d3Renderer.setEnabledProviders) {
                d3Renderer.setEnabledProviders(enabledProviders);
            }
        }

        this.currentEvents = filteredEvents; // Store filtered events for current state
        this.currentFilterOptions = filterOptions;
        this.currentAppliedFilters = appliedFilters;  // Store applied filters for branch visibility
        this.currentRepoPath = repoPath;

        // Update context bar with repo and file information
        this.updateContextBar(repoPath, activeFile);

        webviewLogger.debug(LogCategory.DATA, 'Processing events for rendering', 'handleTimelineData', undefined, LogPathway.RENDER_PIPELINE);
        // Convert to format renderer expects (use filtered events for rendering)
        // Pass both allEvents count (for total) and filteredEvents (for visible)
        const processedData = this.processEvents(filteredEvents, allEvents.length, filterOptions);

        webviewLogger.debug(LogCategory.DATA, 'Events processed', 'handleTimelineData', {
            visibleEvents: processedData.visibleEvents.length,
            allEvents: processedData.allEvents.length,
            branches: processedData.activeBranches
        }, LogPathway.RENDER_PIPELINE);

        webviewLogger.debug(LogCategory.UI, 'Updating UI controllers', 'handleTimelineData', undefined, LogPathway.FILTER_APPLY);
        // Update UI controllers with new data
        // Pass both allEvents (for total counts) and filteredEvents (for filtered count)
        this.uiManager.updateAvailableOptions({
            branches: filterOptions.branches,
            authors: filterOptions.authors,
            eventTypes: filterOptions.eventTypes
        }, allEvents, filteredEvents);

        // CRITICAL: Synchronize FilterController's internal state with backend's persisted filter state
        // This fixes filter bleeding when switching between repositories
        webviewLogger.debug(LogCategory.FILTERING, 'Synchronizing filter state from backend', 'handleTimelineData', appliedFilters, LogPathway.STATE_PERSIST);
        const filterController = this.uiManager.getFilterController();
        if (appliedFilters) {
            filterController.updateFiltersFromBackend(appliedFilters);
        } else {
            // No filters applied - reset to empty state
            filterController.updateFiltersFromBackend({});
        }

        // Update legend with enabled providers (from filter state)
        if ((this.renderer as any).d3Renderer) {
            const d3Renderer = (this.renderer as any).d3Renderer;
            if (d3Renderer.setEnabledProviders) {
                d3Renderer.setEnabledProviders(enabledProviders);
            }
        }

        // Pass data context to popup controller
        this.uiManager.updateDataContext(processedData);

        // Restore saved time window from filterState BEFORE rendering
        // This ensures the initial render uses the saved brush position instead of the default 1/3
        const savedTimeWindow = filterController.getSavedTimeWindow();
        if (savedTimeWindow) {
            webviewLogger.debug(LogCategory.UI, 'Restoring saved time window', 'handleTimelineData', savedTimeWindow, LogPathway.RANGE_SELECTOR);

            // Pre-set the brush range in renderer BEFORE calling render()
            if ((this.renderer as any).d3Renderer) {
                const d3Renderer = (this.renderer as any).d3Renderer;

                // Store the brush range in D3TimelineRenderer
                // This will be used instead of the default 1/3 viewport calculation
                d3Renderer.updateBrushRange([savedTimeWindow.start, savedTimeWindow.end]);
            }
        }

        webviewLogger.debug(LogCategory.VISUALIZATION, 'Rendering timeline', 'handleTimelineData', undefined, LogPathway.RENDER_PIPELINE);
        // Render (will use the pre-set brush range if it exists)
        await this.render(processedData);

        // If we had a saved time window, update the viewport to match
        if (savedTimeWindow) {
            webviewLogger.debug(LogCategory.UI, 'Updating viewport to match saved window', 'handleTimelineData', undefined, LogPathway.RANGE_SELECTOR);
            this.updateViewport([savedTimeWindow.start, savedTimeWindow.end]);
        }

        webviewLogger.info(LogCategory.VISUALIZATION, 'Timeline data handling completed', 'handleTimelineData', undefined, LogPathway.DATA_INGESTION);
    }

    /**
     * Process events into renderer format (delegated to EventProcessor)
     */
    private processEvents(events: CanonicalEvent[], totalEventCount: number, filterOptions: FilterOptions) {
        // Set current applied filters for branch visibility (used by EventProcessor)
        this.eventProcessor.setAppliedFilters(this.currentAppliedFilters);

        // Delegate to EventProcessor
        return this.eventProcessor.processEvents(events, totalEventCount, filterOptions);
    }

    /**
     * Render the timeline
     */
    private async render(processedData: any) {

        // Store for viewport updates
        this.currentProcessedData = processedData;

        try {
            // @ts-ignore - Access to protected method needed for rendering
            await this.renderer.renderData(processedData);

            // Update stats display
            this.updateStats(processedData.summaryStats);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Update statistics display (delegated to StatisticsCalculator)
     */
    private updateStats(stats: any) {
        this.statisticsCalculator.updateStats(stats);
    }

    /**
     * Update context bar with repo and file information
     */
    private updateContextBar(repoPath: string, activeFile?: string) {
        // Extract repo name (last part of path)
        const pathParts = repoPath.replace(/\\/g, '/').split('/');
        const repoName = pathParts[pathParts.length - 1] || repoPath;

        // Use active file if provided, otherwise show generic label
        const fileName = activeFile || 'All Files';

        const repoElement = document.getElementById('context-repo');
        const fileElement = document.getElementById('context-file');

        if (repoElement) {
            repoElement.textContent = repoName;
            repoElement.title = repoPath; // Full path on hover
        }

        if (fileElement) {
            fileElement.textContent = fileName;
        }
    }

    /**
     * Handle resize (called from extension message, delegated to ResizeHandler)
     */
    handleResize() {
        const isTimelineActive = this.tabManager && this.tabManager.getActiveTab() === 'timeline';

        this.resizeHandler.handleResize(
            this.renderer,
            this.container,
            isTimelineActive,
            this.currentProcessedData
        );
    }

    /**
     * Re-render timeline with current data (for color mode changes, delegated to ResizeHandler)
     */
    rerender() {
        this.resizeHandler.rerender(this.renderer, this.currentProcessedData);
    }

    /**
     * Handle tab change events
     */
    private handleTabChange(event: any): void {
        const { from, to } = event;
        webviewLogger.debug(LogCategory.UI, `Tab changed: ${from} → ${to}`, 'handleTabChange');

        // Update timeline tab active state
        this.isTimelineTabActive = (to === 'timeline');

        // Handle timeline tab deactivation (delegated to ResizeHandler)
        if (to !== 'timeline' && this.renderer) {
            this.resizeHandler.handleTimelineTabDeactivated();
        }

        // Handle timeline tab activation (delegated to ResizeHandler)
        if (to === 'timeline') {
            this.resizeHandler.handleTimelineTabActivated(
                this.renderer,
                this.currentProcessedData,
                window.vscode
            );
        }

        // Load knowledge data when Knowledge tab is activated (if not already loaded)
        if (to === 'knowledge') {
            webviewLogger.debug(LogCategory.UI, 'Knowledge tab activated', 'handleTabChange', undefined, LogPathway.KNOWLEDGE_MANAGEMENT);
            // Only request data if the controller doesn't have any items yet
            // This preserves data when switching between tabs
            const hasData = this.knowledgeController && (this.knowledgeController as any).state?.items?.length > 0;
            if (!hasData && window.vscode) {
                webviewLogger.debug(LogCategory.UI, 'No knowledge data loaded yet - requesting', 'handleTabChange', undefined, LogPathway.KNOWLEDGE_MANAGEMENT);
                window.vscode.postMessage({ type: 'knowledge:load-request' });
                window.vscode.postMessage({ type: 'knowledge:scan-claude-files' });
            } else {
                webviewLogger.debug(LogCategory.UI, 'Knowledge data already loaded - using cached data', 'handleTabChange', undefined, LogPathway.KNOWLEDGE_MANAGEMENT);
            }
        }

        // Load session data when Sessions tab is activated (if not already loaded)
        if (to === 'sessions') {
            webviewLogger.info(LogCategory.UI, 'Sessions tab activated', 'handleTabChange', undefined, LogPathway.KNOWLEDGE_MANAGEMENT);

            // Debug: Check controller state
            const hasController = !!this.sessionController;
            const hasState = this.sessionController && !!(this.sessionController as any).state;
            const sessionsArray = this.sessionController && (this.sessionController as any).state?.sessions;
            const sessionCount = sessionsArray?.length || 0;

            webviewLogger.info(LogCategory.UI, 'Session controller check', 'handleTabChange', {
                hasController,
                hasState,
                sessionCount,
                hasVscode: !!window.vscode
            }, LogPathway.KNOWLEDGE_MANAGEMENT);

            // Only request data if the controller doesn't have any sessions yet
            const hasData = hasController && sessionCount > 0;

            if (!hasData && window.vscode) {
                webviewLogger.info(LogCategory.UI, 'No session data loaded yet - requesting via sessions:load-all', 'handleTabChange', undefined, LogPathway.KNOWLEDGE_MANAGEMENT);
                window.vscode.postMessage({ type: 'sessions:load-all' });
            } else if (hasData) {
                webviewLogger.info(LogCategory.UI, `Session data already loaded (${sessionCount} sessions) - using cached data`, 'handleTabChange', undefined, LogPathway.KNOWLEDGE_MANAGEMENT);
            } else if (!window.vscode) {
                webviewLogger.error(LogCategory.UI, 'Cannot request sessions - VSCode API not available', 'handleTabChange', undefined, LogPathway.KNOWLEDGE_MANAGEMENT);
            }
        }

        // Notify extension of tab change (for analytics/state persistence)
        if (window.vscode) {
            window.vscode.postMessage({
                type: 'tabChanged',
                from,
                to
            });
        }
    }

    /**
     * Dispose
     */
    dispose() {
        webviewLogger.info(
            LogCategory.VISUALIZATION,
            'Disposing SimpleTimelineApp',
            'SimpleTimelineApp.dispose',
            undefined,
            LogPathway.CONFIG_SYNC
        );
        if (this.renderer) {
            // @ts-ignore - Dispose method may not be in interface but is needed
            this.renderer.dispose();
        }
        if (this.tabManager) {
            this.tabManager.dispose();
        }
    }
}
