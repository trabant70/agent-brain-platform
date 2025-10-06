/**
 * LegendRenderer - Legend Management and Display
 * Stage 3: Extracted from embedded JavaScript code
 *
 * Handles:
 * - Event type legend rendering
 * - Color mapping display
 * - Dynamic legend updates based on available event types
 *
 * Now uses EventVisualTheme for consistent colors across the extension
 */

import { EventVisualTheme } from '../theme/EventVisualTheme';

export interface LegendOptions {
    selector: string;
    colorMap: { [key: string]: string };
}

/**
 * LegendRenderer class - manages the timeline legend
 */
export class LegendRenderer {
    private legend: any; // D3 selection of .legend element
    private container: any; // D3 selection of #legend-items
    private colorMap: { [key: string]: string };
    private dragSetup: boolean = false;
    private currentTab: 'git' | 'intelligence' = 'git';
    private enabledProviders: string[] = ['git-local'];

    constructor(options: LegendOptions) {
        this.colorMap = options.colorMap;
        this.setupContainer(options.selector);
    }

    /**
     * Setup the D3 container selection - EXACTLY like EventDetailsPopup
     */
    private setupContainer(selector: string): void {
        const d3 = (window as any).d3;

        // Select legend directly by ID - same as EventDetailsPopup does
        this.legend = d3.select('#timeline-legend');
        this.container = d3.select(selector);

        console.log('[LegendRenderer] setupContainer - legend selection:', this.legend, 'empty?', this.legend.empty());
        console.log('[LegendRenderer] setupContainer - container selection:', this.container, 'empty?', this.container.empty());
    }

    /**
     * Setup drag behavior - EXACT COPY of FilterController.enableMenuDragging()
     */
    private setupDragBehavior(): void {
        if (this.dragSetup) {
            return;
        }

        const legendElement = document.getElementById('timeline-legend');
        if (!legendElement) {
            console.log('[LegendRenderer] Could not find #timeline-legend');
            return;
        }

        const legendTitle = legendElement.querySelector('.legend-title') as HTMLElement;
        if (!legendTitle) {
            console.log('[LegendRenderer] Could not find .legend-title');
            return;
        }

        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let initialLeft = 0;
        let initialTop = 0;

        const onMouseDown = (e: MouseEvent) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;

            // Get current computed position (not bounding rect)
            const computedStyle = window.getComputedStyle(legendElement);
            initialLeft = parseInt(computedStyle.left) || 0;
            initialTop = parseInt(computedStyle.top) || 0;

            legendElement.style.cursor = 'grabbing';
            legendTitle.style.cursor = 'grabbing';
            e.preventDefault();
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;

            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            legendElement.style.left = `${initialLeft + deltaX}px`;
            legendElement.style.top = `${initialTop + deltaY}px`;
            legendElement.style.right = 'auto';
            legendElement.style.bottom = 'auto';
        };

        const onMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                legendElement.style.cursor = '';
                legendTitle.style.cursor = 'grab';
            }
        };

        legendTitle.addEventListener('mousedown', onMouseDown as EventListener);
        document.addEventListener('mousemove', onMouseMove as EventListener);
        document.addEventListener('mouseup', onMouseUp as EventListener);

        // Make title cursor indicate draggability
        legendTitle.style.cursor = 'grab';

        this.dragSetup = true;
    }

    /**
     * Set enabled providers to determine which tabs to show
     */
    setEnabledProviders(providers: string[]): void {
        this.enabledProviders = providers || ['git-local'];
    }

    /**
     * Check if event type is an intelligence event
     */
    private isIntelligenceEvent(eventType: string): boolean {
        // Normalize the event type (trim, lowercase) for robust comparison
        const normalized = (eventType || '').toLowerCase().trim();
        return normalized === 'learning-stored' ||
               normalized === 'pattern-detected' ||
               normalized === 'adr-recorded';
    }

    /**
     * Switch between legend tabs
     */
    private switchLegendTab(tab: 'git' | 'intelligence'): void {
        this.currentTab = tab;

        const legendElement = this.container.node()?.parentElement;
        if (!legendElement) return;

        // Update tab button states
        const tabButtons = legendElement.querySelectorAll('.legend-tab-btn');
        tabButtons.forEach((btn: Element) => {
            const btnTab = (btn as HTMLElement).dataset.tab;
            if (btnTab === tab) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Update tab content visibility
        const tabPanels = legendElement.querySelectorAll('.legend-tab-panel');
        tabPanels.forEach((panel: Element) => {
            const panelTab = (panel as HTMLElement).dataset.tab;
            if (panelTab === tab) {
                (panel as HTMLElement).style.display = 'block';
            } else {
                (panel as HTMLElement).style.display = 'none';
            }
        });
    }

    /**
     * Update legend with available event types and sync states
     */
    updateLegend(availableEventTypes: string[]): void {
        const legendElement = this.container.node()?.parentElement;

        if (!legendElement) {
            return;
        }

        // Defensive programming: filter out any invalid types that may have slipped through
        const validEventTypes = (availableEventTypes || []).filter(type =>
            type && typeof type === 'string' && type.trim().length > 0
        );

        // Separate event types by category
        const gitEventTypes = validEventTypes.filter(type => !this.isIntelligenceEvent(type));
        const intelligenceEventTypes = validEventTypes.filter(type => this.isIntelligenceEvent(type));

        // Determine which tabs should be visible
        const showGitTab = this.enabledProviders.includes('git-local') ||
                          this.enabledProviders.includes('github');
        const showIntelligenceTab = this.enabledProviders.includes('intelligence');

        // If no tabs should show, hide legend entirely
        if (!showGitTab && !showIntelligenceTab) {
            legendElement.style.display = 'none';
            return;
        }
        legendElement.style.display = 'block';

        // Clear existing content div
        let contentDiv = legendElement.querySelector('.legend-content');
        if (!contentDiv) {
            // Create content div if it doesn't exist
            contentDiv = document.createElement('div');
            contentDiv.className = 'legend-content';
            legendElement.appendChild(contentDiv);
        }
        contentDiv.innerHTML = '';

        // Only show tabs if both categories exist
        const showTabs = showGitTab && showIntelligenceTab;

        if (showTabs) {
            // Create tab navigation
            const tabNav = document.createElement('div');
            tabNav.className = 'legend-tab-nav';
            tabNav.innerHTML = `
                <button class="legend-tab-btn ${this.currentTab === 'git' ? 'active' : ''}" data-tab="git">Git Events</button>
                <button class="legend-tab-btn ${this.currentTab === 'intelligence' ? 'active' : ''}" data-tab="intelligence">Agent-Brain</button>
            `;
            contentDiv.appendChild(tabNav);

            // Setup tab click handlers
            const gitBtn = tabNav.querySelector('[data-tab="git"]');
            const intelligenceBtn = tabNav.querySelector('[data-tab="intelligence"]');

            if (gitBtn) {
                gitBtn.addEventListener('click', () => this.switchLegendTab('git'));
            }
            if (intelligenceBtn) {
                intelligenceBtn.addEventListener('click', () => this.switchLegendTab('intelligence'));
            }
        }

        const d3 = (window as any).d3;
        const colorMode = EventVisualTheme.getColorMode();

        // Git Events Tab Panel
        if (showGitTab && gitEventTypes.length > 0) {
            const gitPanel = document.createElement('div');
            gitPanel.className = 'legend-tab-panel';
            gitPanel.dataset.tab = 'git';
            gitPanel.style.display = (!showTabs || this.currentTab === 'git') ? 'block' : 'none';
            contentDiv.appendChild(gitPanel);

            const gitSelection = d3.select(gitPanel);
            this.renderEventTypeSection(gitSelection, gitEventTypes, colorMode);
        }

        // Intelligence Events Tab Panel
        if (showIntelligenceTab && intelligenceEventTypes.length > 0) {
            const intelligencePanel = document.createElement('div');
            intelligencePanel.className = 'legend-tab-panel';
            intelligencePanel.dataset.tab = 'intelligence';
            intelligencePanel.style.display = (!showTabs || this.currentTab === 'intelligence') ? 'block' : 'none';
            contentDiv.appendChild(intelligencePanel);

            const intelligenceSelection = d3.select(intelligencePanel);
            this.renderEventTypeSection(intelligenceSelection, intelligenceEventTypes, colorMode);
        }

        // Setup drag behavior after content is rendered
        this.setupDragBehavior();
    }

    /**
     * Render event type section (shared by both tabs)
     */
    private renderEventTypeSection(contentSelection: any, eventTypes: string[], colorMode: string): void {
        // Event Types Section (Shapes and Colors in semantic mode)
        const eventTypeTitle = colorMode === 'semantic'
            ? 'Event Types (Shape & Color)'
            : 'Event Types (Shape)';

        contentSelection.append('div')
            .attr('class', 'legend-section')
            .html(`<div class="legend-section-title">${eventTypeTitle}</div>`);

        contentSelection.append('div')
            .attr('class', 'legend-items')
            .selectAll('.legend-item')
            .data(eventTypes)
            .join('div')
            .attr('class', 'legend-item')
            .html((d: string) => {
                const visual = EventVisualTheme.getEventVisual(d);
                const label = EventVisualTheme.getEventLabel(d);
                const icon = visual.icon || '●';
                const color = EventVisualTheme.getSemanticColor(d);
                return `<div class="legend-shape" style="color: ${color}">${icon}</div><span>${label}</span>`;
            });

        // Sync States Section (Colors) - only show in sync-state mode and only for git events
        if (colorMode === 'sync-state' && eventTypes.some(type => !this.isIntelligenceEvent(type))) {
            contentSelection.append('div')
                .attr('class', 'legend-section')
                .style('margin-top', '12px')
                .html('<div class="legend-section-title">Sync State (Color)</div>');

            const syncStates = EventVisualTheme.getAllSyncStates();
            contentSelection.append('div')
                .attr('class', 'legend-items')
                .selectAll('.legend-sync-item')
                .data(syncStates)
                .join('div')
                .attr('class', 'legend-item legend-sync-item')
                .html((state: any) => {
                    const visual = EventVisualTheme.getSyncStateVisual(state);
                    return `<div class="legend-color" style="background-color: ${visual.color}"></div><span>${visual.label}</span>`;
                });
        }
    }

    /**
     * Get the standard color map for event types
     * Now delegates to EventVisualTheme for consistency
     */
    static getStandardColorMap(): { [key: string]: string } {
        return EventVisualTheme.getColorMap();
    }
}