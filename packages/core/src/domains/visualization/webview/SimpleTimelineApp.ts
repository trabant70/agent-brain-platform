/**
 * SimpleTimelineApp - Clean Implementation
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
import { MarketplaceController } from '../ui/MarketplaceController';
import { NotificationManager } from '../ui/NotificationManager';
import { webviewLogger, LogCategory, LogPathway } from './WebviewLogger';

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
    private marketplaceController: MarketplaceController;
    private currentEvents: CanonicalEvent[] = [];
    private currentFilterOptions: FilterOptions | null = null;
    private currentAppliedFilters: any = null;  // Current filter state for branch visibility
    private currentProcessedData: any = null;
    private container: HTMLElement;
    private currentRepoPath: string = '';
    private isTimelineTabActive: boolean = true;

    constructor(containerId: string = 'visualization') {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container #${containerId} not found`);
        }
        this.container = container;

        webviewLogger.info(LogCategory.VISUALIZATION, 'Initializing SimpleTimelineApp', 'constructor');
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
        this.knowledgeController.initialize((message) => {
            // Forward knowledge messages to extension
            if (window.vscode) {
                window.vscode.postMessage(message);
            }
        });

        // Make knowledge controller globally accessible for onclick handlers
        (window as any).knowledgeController = this.knowledgeController;

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
        this.sessionController = new SessionViewController();
        this.sessionController.initialize((message) => {
            // Forward session messages to extension
            if (window.vscode) {
                window.vscode.postMessage(message);
            }
        });

        // Make session controller globally accessible for onclick handlers
        (window as any).sessionController = this.sessionController;

        webviewLogger.info(LogCategory.UI, 'Session controller initialized', 'constructor', undefined, LogPathway.KNOWLEDGE_MANAGEMENT);

        // If sessions tab is already active (restored from localStorage), request initial data
        if (this.tabManager.getActiveTab() === 'sessions') {
            webviewLogger.info(LogCategory.UI, 'Sessions tab is active on initialization - requesting data', 'constructor', undefined, LogPathway.KNOWLEDGE_MANAGEMENT);
            this.sessionController.requestInitialLoad();
        }

        // Initialize marketplace controller
        const notificationManager = new NotificationManager();
        this.marketplaceController = new MarketplaceController({
            onSendMessage: (message) => {
                // Forward marketplace messages to extension
                if (window.vscode) {
                    window.vscode.postMessage(message);
                }
            },
            notificationManager
        });
        this.marketplaceController.initialize();

        // Make marketplace controller globally accessible for onclick handlers
        (window as any).marketplaceController = this.marketplaceController;

        webviewLogger.info(LogCategory.UI, 'Marketplace controller initialized', 'constructor', undefined, LogPathway.KNOWLEDGE_MANAGEMENT);

        // If marketplace tab is already active (restored from localStorage), request initial data
        if (this.tabManager.getActiveTab() === 'marketplace') {
            webviewLogger.info(LogCategory.UI, 'Marketplace tab is active on initialization - requesting data', 'constructor', undefined, LogPathway.KNOWLEDGE_MANAGEMENT);
            if (window.vscode) {
                window.vscode.postMessage({ type: 'marketplace:request-templates' });
            }
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
     * Process events into renderer format
     */
    private processEvents(events: CanonicalEvent[], totalEventCount: number, filterOptions: FilterOptions) {
        // Store original unique event counts
        const visibleEventCount = events.length;  // Filtered events (changes with filters)

        // MULTI-BRANCH EXPLOSION:
        // Create one render instance per visible branch for each event
        // Connect instances with metadata to show branch migration
        const timelineEvents = events.flatMap(event => {
            // Filter to only selected branches
            const visibleBranches = this.filterEventBranches(event.branches);

            // Determine the origin (primary) branch for this event
            // Prefer event.primaryBranch if it's visible, otherwise use first visible
            const originBranch = visibleBranches.includes(event.primaryBranch || '')
                ? event.primaryBranch
                : visibleBranches[0];

            // Debug: Log event branch mapping (can be removed after testing)
            // console.log(`[processEvents] Event ${event.hash?.substring(0, 7)}: branches=${event.branches.join(',')}, visible=${visibleBranches.join(',')}, origin=${originBranch}`);

            // Create one instance per visible branch
            return visibleBranches.map((branch, index) => {
                const isPrimary = branch === originBranch;
                const instanceId = `${event.id}-${branch}`;

                // Build connections for secondary instances (migration lines)
                const connections = !isPrimary ? [{
                    targetId: `${event.id}-${originBranch}`,  // Connect to primary instance
                    type: 'branch-migration',
                    description: `${event.type.toUpperCase()}: "${event.title?.substring(0, 50) || event.hash?.substring(0, 7)}" migrated from ${originBranch} → ${branch}`
                }] : [];

                // Add release→commit connection for releases
                if (isPrimary && event.type === 'release' && event.hash) {
                    // Find the commit this release tags
                    const targetCommit = events.find(e =>
                        (e.type === 'commit' || e.type === 'merge') &&
                        (e.hash === event.hash || e.fullHash === event.hash)
                    );
                    if (targetCommit) {
                        // Find the branch where this commit is visible
                        const commitBranches = this.filterEventBranches(targetCommit.branches);
                        const targetBranch = commitBranches.includes(originBranch)
                            ? originBranch
                            : commitBranches[0];

                        if (targetBranch) {
                            connections.push({
                                targetId: `${targetCommit.id}-${targetBranch}`,
                                type: 'release-tag',
                                description: `Release ${event.title} tags commit ${event.hash?.substring(0, 7)}`
                            });
                        }
                    }
                }

                return {
                    id: instanceId,
                    originalId: event.id,  // Track original event ID
                    timestamp: typeof event.timestamp === 'string' ? event.timestamp : event.timestamp.toISOString(),
                    type: this.normalizeEventType(event.type),
                    severity: 'info' as const,
                    title: event.title,
                    description: event.description || '',
                    branch: branch,  // Single branch for this instance
                    branches: [branch],  // Single branch array
                    isPrimaryInstance: isPrimary,
                    primaryBranch: originBranch,
                    allBranches: visibleBranches,  // All visible branches for reference
                    author: event.author.name,
                    impact: this.calculateImpact(event),
                    filesChanged: event.impact?.filesChanged,
                    linesAdded: event.impact?.linesAdded,
                    linesRemoved: event.impact?.linesRemoved,
                    hash: event.hash,
                    providerId: event.providerId,  // CRITICAL: Preserve providerId for sync state
                    sources: event.sources,  // CRITICAL: Preserve sources[] for sync state detection
                    metadata: {
                        ...event.metadata,
                        connections: connections  // Add migration connections
                    }
                };
            });
        });

        // Compute date ranges
        const timestamps = timelineEvents.map(e => new Date(e.timestamp));
        const fullDateRange: [Date, Date] = timestamps.length > 0
            ? [new Date(Math.min(...timestamps.map(d => d.getTime()))), new Date(Math.max(...timestamps.map(d => d.getTime())))]
            : [new Date(), new Date()];

        // Compute impact domain
        const impacts = timelineEvents.map(e => e.impact || 1);
        const impactDomain: [number, number] = impacts.length > 0
            ? [Math.min(...impacts), Math.max(...impacts)]
            : [1, 100];

        // Compute active branches from FILTERED events (not all available branches)
        // This ensures branch swimlanes only appear if they have visible events
        const activeBranchesSet = new Set<string>();
        timelineEvents.forEach(event => {
            event.branches.forEach((branch: string) => activeBranchesSet.add(branch));
        });
        const activeBranches = Array.from(activeBranchesSet).sort();

        // Compute unique contributors from FILTERED events (not all available authors)
        const contributorsSet = new Set<string>();
        timelineEvents.forEach(event => {
            contributorsSet.add(event.author);
        });
        const contributorCount = contributorsSet.size;


        return {
            // visibleEvents & allEvents contain EXPANDED instances (one per branch)
            // These are used for rendering and filter counts
            visibleEvents: timelineEvents,
            allEvents: timelineEvents,
            fullDateRange,
            visibleDateRange: fullDateRange,
            impactDomain,
            activeBranches: activeBranches,
            // statistics use ORIGINAL unique event counts (before multi-branch expansion)
            // totalEvents = all events from repo (constant)
            // visibleEvents = filtered events (changes with filters)
            statistics: {
                totalEvents: totalEventCount,                 // ✅ Total events (constant, never changes)
                visibleEvents: visibleEventCount,             // ✅ Visible filtered events (changes)
                totalContributors: contributorCount,          // ✅ From filtered events
                totalBranches: activeBranches.length,         // ✅ From filtered events
                dateRange: fullDateRange,
                eventTypeCounts: {}
            },
            summaryStats: {
                visible: visibleEventCount,                   // ✅ Visible filtered events (changes)
                total: totalEventCount,                       // ✅ Total events (constant, never changes)
                contributors: contributorCount,               // ✅ From filtered events
                branches: activeBranches.length,              // ✅ From filtered events
                window: this.calculateWindow(fullDateRange),
                velocity: this.calculateVelocity(visibleEventCount, fullDateRange)  // ✅ Use visible count for velocity
            }
        };
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
     * Update statistics display
     */
    private updateStats(stats: any) {
        const elements = {
            'stat-visible': stats.visible,
            'stat-total': stats.total,
            'stat-contributors': stats.contributors,
            'stat-branches': stats.branches,
            'stat-window': stats.window,
            'stat-velocity': stats.velocity
        };

        Object.entries(elements).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = String(value);
            }
        });
    }

    /**
     * Calculate window (time span in days)
     */
    private calculateWindow(dateRange: [Date, Date]): string {
        if (!dateRange || !dateRange[0] || !dateRange[1]) {
            return '-';
        }
        const msPerDay = 24 * 60 * 60 * 1000;
        const days = Math.max(1, Math.ceil((dateRange[1].getTime() - dateRange[0].getTime()) / msPerDay));
        return `${days} ${days === 1 ? 'day' : 'days'}`;
    }

    /**
     * Calculate velocity (events per day)
     */
    private calculateVelocity(eventCount: number, dateRange: [Date, Date]): string {
        if (!dateRange || !dateRange[0] || !dateRange[1]) {
            return '0/day';
        }
        const msPerDay = 24 * 60 * 60 * 1000;
        const days = Math.max(1, Math.ceil((dateRange[1].getTime() - dateRange[0].getTime()) / msPerDay));
        const velocity = (eventCount / days).toFixed(2);
        return `${velocity}/day`;
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
     * Helper: Normalize event type
     */
    private normalizeEventType(type: string): string {
        return type.toLowerCase().replace(/-/g, '_');
    }

    /**
     * Helper: Calculate impact
     */
    private calculateImpact(event: CanonicalEvent): number {
        if (!event.impact) return 1;

        const { filesChanged = 0, linesAdded = 0, linesRemoved = 0 } = event.impact;
        const fileImpact = Math.min(filesChanged * 10, 50);
        const lineImpact = Math.min((linesAdded + linesRemoved) / 10, 50);

        return Math.max(1, fileImpact + lineImpact);
    }

    /**
     * Helper: Filter event's branches to only selected branches
     *
     * This implements "Option 3" filtering:
     * - Event passes filter if it appears on ANY selected branch
     * - But event is RENDERED only on the selected branches
     *
     * Example:
     *   Event has branches = ["main", "feature/foo", "feature/bar"]
     *   Selected branches = ["feature/foo", "feature/bar"]
     *   Result: Event shown only on feature/foo and feature/bar swimlanes
     *           (NOT on main swimlane even though event exists on main)
     */
    private filterEventBranches(eventBranches: string[]): string[] {
        // Handle events with no branches (e.g., GitHub releases, issues)
        // These should be displayed in a default "global" lane
        if (!eventBranches || eventBranches.length === 0) {
            return ['main']; // Default to 'main' branch for branch-less events
        }

        // If no applied filters or no branch filter, show all branches
        if (!this.currentAppliedFilters || !this.currentAppliedFilters.selectedBranches) {
            return eventBranches;
        }

        const selectedBranches = this.currentAppliedFilters.selectedBranches;

        // If selectedBranches is empty or undefined, show all branches
        if (!selectedBranches || selectedBranches.length === 0) {
            return eventBranches;
        }

        // Filter to only selected branches
        const visibleBranches = eventBranches.filter(branch =>
            selectedBranches.includes(branch)
        );

        // Safety: if filtering removes all branches, keep first available
        // This shouldn't happen if event passed the filter, but defensive check
        if (visibleBranches.length === 0 && eventBranches.length > 0) {
            return [eventBranches[0]];
        }

        // Final fallback for empty result
        if (visibleBranches.length === 0) {
            return ['main'];
        }

        return visibleBranches;
    }

    /**
     * Handle resize (called from extension message)
     */
    handleResize() {
        webviewLogger.debug(
            LogCategory.UI,
            'Window resize triggered',
            'SimpleTimelineApp.handleResize',
            undefined,
            LogPathway.USER_INTERACTION
        );

        if (!this.renderer) {
            webviewLogger.warn(LogCategory.VISUALIZATION, 'No renderer to resize', 'handleResize');
            return;
        }

        // Check if Timeline tab is currently active
        const isTimelineActive = this.tabManager && this.tabManager.getActiveTab() === 'timeline';

        webviewLogger.debug(
            LogCategory.VISUALIZATION,
            'Resize context',
            'SimpleTimelineApp.handleResize',
            {
                isTimelineActive,
                hasData: !!this.currentProcessedData,
                containerWidth: this.container.getBoundingClientRect().width,
                containerHeight: this.container.getBoundingClientRect().height
            },
            LogPathway.RENDER_PIPELINE
        );

        if (isTimelineActive && this.currentProcessedData) {
            // Timeline is active - use robust restoration logic
            // This is critical when returning from window focus loss (Terminal, etc.)
            webviewLogger.info(
                LogCategory.VISUALIZATION,
                'Timeline active - using robust resize with RAF',
                'SimpleTimelineApp.handleResize',
                undefined,
                LogPathway.RENDER_PIPELINE
            );

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    webviewLogger.debug(LogCategory.VISUALIZATION, 'RAF #1-2 complete - first resize', 'handleResize');
                    this.renderer.resize();

                    setTimeout(() => {
                        webviewLogger.debug(LogCategory.VISUALIZATION, 'Second resize and full render', 'handleResize');
                        this.renderer.resize();
                        this.renderer.render(this.currentProcessedData); // Full render for brush recalculation

                        setTimeout(() => {
                            webviewLogger.debug(LogCategory.VISUALIZATION, 'Final safety resize', 'handleResize');
                            this.renderer.resize();
                        }, 100);
                    }, 100);
                });
            });
        } else {
            // Other tab active or no data - simple resize
            const rect = this.container.getBoundingClientRect();
            webviewLogger.debug(
                LogCategory.VISUALIZATION,
                'Simple resize (non-timeline tab or no data)',
                'SimpleTimelineApp.handleResize',
                { width: rect.width, height: rect.height },
                LogPathway.RENDER_PIPELINE
            );

            this.renderer.resize();

            if (this.currentProcessedData) {
                this.renderer.update(this.currentProcessedData);
            }
        }
    }

    /**
     * Re-render timeline with current data (for color mode changes)
     */
    rerender() {
        webviewLogger.debug(
            LogCategory.VISUALIZATION,
            'Re-render triggered (color mode change or config update)',
            'SimpleTimelineApp.rerender',
            undefined,
            LogPathway.CONFIG_SYNC
        );

        if (!this.renderer) {
            webviewLogger.warn(LogCategory.VISUALIZATION, 'No renderer to re-render', 'rerender');
            return;
        }

        // Re-render with current data if available
        if (this.currentProcessedData) {
            webviewLogger.debug(
                LogCategory.VISUALIZATION,
                'Re-rendering with current data',
                'SimpleTimelineApp.rerender',
                { eventCount: this.currentProcessedData.allEvents.length },
                LogPathway.RENDER_PIPELINE
            );
            this.renderer.update(this.currentProcessedData);
        }
    }

    /**
     * Handle tab change events
     */
    private handleTabChange(event: any): void {
        const { from, to } = event;
        webviewLogger.debug(LogCategory.UI, `Tab changed: ${from} → ${to}`, 'handleTabChange');

        // Update timeline tab active state
        this.isTimelineTabActive = (to === 'timeline');

        // Pause D3 rendering when not on timeline tab (performance optimization)
        if (to !== 'timeline' && this.renderer) {
            webviewLogger.debug(LogCategory.VISUALIZATION, 'Pausing timeline rendering (tab switched away)', 'handleTabChange');
            // D3 renderer doesn't need to animate when hidden
        }

        // Resume rendering when returning to timeline tab
        if (to === 'timeline' && this.currentProcessedData) {
            webviewLogger.debug(LogCategory.VISUALIZATION, 'Resuming timeline rendering (tab switched back)', 'handleTabChange');

            // Use double-RAF to ensure CSS layout has fully settled
            // RAF 1: Browser paints the active tab
            // RAF 2: Layout calculations are complete
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    webviewLogger.debug(LogCategory.VISUALIZATION, 'RAF cycle complete - performing resize', 'handleTabChange');

                    // First resize with fresh dimensions
                    this.renderer.resize();

                    // Delayed full re-render to ensure brush dimensions are perfect
                    setTimeout(() => {
                        webviewLogger.debug(LogCategory.VISUALIZATION, 'Second resize and render', 'handleTabChange');
                        this.renderer.resize(); // Second resize before render

                        // Force a complete re-render with current data
                        if (this.currentProcessedData) {
                            this.renderer.render(this.currentProcessedData);
                        }

                        // THIRD resize after render completes (catches any layout shifts from render)
                        setTimeout(() => {
                            webviewLogger.debug(LogCategory.VISUALIZATION, 'Final safety resize', 'handleTabChange');
                            this.renderer.resize();
                        }, 100);
                    }, 100); // Increased from 50ms to allow full reflow
                });
            });
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
            webviewLogger.debug(LogCategory.UI, 'Sessions tab activated', 'handleTabChange', undefined, LogPathway.KNOWLEDGE_MANAGEMENT);
            // Only request data if the controller doesn't have any sessions yet
            // This preserves data when switching between tabs
            const hasData = this.sessionController && (this.sessionController as any).state?.sessions?.length > 0;
            if (!hasData && window.vscode) {
                webviewLogger.debug(LogCategory.UI, 'No session data loaded yet - requesting', 'handleTabChange', undefined, LogPathway.KNOWLEDGE_MANAGEMENT);
                window.vscode.postMessage({ type: 'sessions:load-all' });
            } else {
                webviewLogger.debug(LogCategory.UI, 'Session data already loaded - using cached data', 'handleTabChange', undefined, LogPathway.KNOWLEDGE_MANAGEMENT);
            }
        }

        // Load marketplace data when Marketplace tab is activated (if not already loaded)
        if (to === 'marketplace') {
            webviewLogger.debug(LogCategory.UI, 'Marketplace tab activated', 'handleTabChange', undefined, LogPathway.KNOWLEDGE_MANAGEMENT);
            // Only request data if the controller doesn't have any templates yet
            // This preserves data when switching between tabs
            const hasData = this.marketplaceController && (this.marketplaceController as any).state?.templates?.length > 0;
            if (!hasData && window.vscode) {
                webviewLogger.debug(LogCategory.UI, 'No marketplace data loaded yet - requesting', 'handleTabChange', undefined, LogPathway.KNOWLEDGE_MANAGEMENT);
                window.vscode.postMessage({ type: 'marketplace:request-templates' });
            } else {
                webviewLogger.debug(LogCategory.UI, 'Marketplace data already loaded - using cached data', 'handleTabChange', undefined, LogPathway.KNOWLEDGE_MANAGEMENT);
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
