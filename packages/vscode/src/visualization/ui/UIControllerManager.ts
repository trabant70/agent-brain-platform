/**
 * UIControllerManager - Unified UI Controller Coordination
 * Stage 5: Coordinates all UI controller classes
 *
 * Orchestrates:
 * - FilterController: Filter management
 * - PopupController: Event popup management
 * - ThemeController: Theme switching
 * - ContextController: Context information display
 */

import { FilterController, FilterState, AvailableOptions, CrossProviderFilterState } from './FilterController';
import { PopupController, EventInteractionHandlers } from './PopupController';
import { ThemeController, ThemeDefinition } from './ThemeController';
import { ContextController, ContextInfo } from './ContextController';

export interface UIControllerOptions {
    colorMap?: { [key: string]: string };
    defaultTheme?: string;
    onFilterUpdate?: (filterType: string, values: string[]) => void;
    onEventAction?: (action: string, event: any) => void;
    onThemeChange?: (theme: string) => void;
}

/**
 * Unified UI controller manager
 */
export class UIControllerManager {
    private filterController: FilterController;
    private popupController: PopupController;
    private themeController: ThemeController;
    private contextController: ContextController;

    constructor(options: UIControllerOptions = {}) {
        console.log('UIControllerManager: [UICM] Constructing...');

        // Initialize all controllers
        this.filterController = new FilterController({
            colorMap: options.colorMap || {}
        });

        this.popupController = new PopupController({
            // PopupController is now a pure UI component
            // No application action callbacks - TimelineApp handles file actions
        });

        this.themeController = new ThemeController({
            defaultTheme: options.defaultTheme,
            onThemeChange: options.onThemeChange
        });

        this.contextController = new ContextController();
    }

    /**
     * Initialize UI controller manager
     */
    public async initialize(): Promise<void> {
        console.log('UIControllerManager: [UICM] Initializing...');

        // Initialize filter controller first (sets up DOM elements and event listeners)
        this.filterController.initialize();

        // Initialize popup controller after DOM ready
        this.popupController.initialize();

        // Initialize other components as needed
        console.log('UIControllerManager: [UICM] Initialization complete');
    }

    /**
     * Get event interaction handlers for visualization
     */
    getEventHandlers(): EventInteractionHandlers {
        return this.popupController.getEventHandlers();
    }

    /**
     * Get filter controller for state access
     */
    getFilterController(): FilterController {
        return this.filterController;
    }

    /**
     * Update filters from backend
     */
    updateFiltersFromBackend(filterState: CrossProviderFilterState): void {
        this.filterController.updateFiltersFromBackend(filterState);
    }

    /**
     * Update available filter options
     *
     * @param options - Available filter options
     * @param allEvents - All events (unfiltered)
     * @param filteredEvents - Filtered events (optional)
     */
    updateAvailableOptions(options: AvailableOptions, allEvents?: any[], filteredEvents?: any[]): void {
        this.filterController.updateAvailableOptions(options, allEvents, filteredEvents);
    }

    /**
     * Update context information
     */
    updateContextInfo(data: any): void {
        this.contextController.updateContextInfo(data);
    }



    /**
     * Switch theme
     */
    switchTheme(themeId: string): void {
        this.themeController.switchTheme(themeId);
    }

    /**
     * Reset all filters
     */
    resetFilters(): void {
        this.filterController.resetFilters();
    }

    /**
     * Set available event types for legend
     */
    setAvailableEventTypes(eventTypes: string[]): void {
        this.filterController.setAvailableEventTypes(eventTypes);
    }

    /**
     * Show loading state
     */
    showLoading(message?: string): void {
        this.contextController.showLoading(message);
    }

    /**
     * Show error state
     */
    showError(error: string): void {
        this.contextController.showError(error);
    }

    /**
     * Show success state
     */
    showSuccess(message?: string): void {
        this.contextController.showSuccess(message);
    }

    /**
     * Get current filter state
     */
    getFilterState(): CrossProviderFilterState {
        return this.filterController.getFilterState();
    }

    /**
     * Get current theme
     */
    getCurrentTheme(): string {
        return this.themeController.getCurrentTheme();
    }

    /**
     * Get current context
     */
    getCurrentContext(): ContextInfo {
        return this.contextController.getCurrentContext();
    }

    /**
     * Get popup statistics
     */
    getPopupStats() {
        return this.popupController.getPopupStats();
    }

    /**
     * Get popup controller for external access
     */
    public getPopupController(): PopupController {
        return this.popupController;
    }

    /**
     * Pass data context to popup controller
     */
    public updateDataContext(data: any): void {
        this.popupController.updateDataContext(data);
    }

    /**
     * Close all popups
     */
    public closePopups(): void {
        this.popupController.closePopups();
    }

    /**
     * Show event popup
     */
    showEventPopup(event: any, position: { x: number; y: number }, locked: boolean = false): void {
        this.popupController.showEventPopup(event, position, locked);
    }

    /**
     * Switch popup tab
     */
    switchPopupTab(tabName: string): void {
        this.popupController.switchPopupTab(tabName);
    }

    /**
     * Add custom theme
     */
    addTheme(theme: ThemeDefinition): void {
        this.themeController.addTheme(theme);
    }

    /**
     * Update filter UI
     */
    updateEventTypeFilters(): void {
        this.filterController.updateEventTypeFilters();
    }

    /**
     * Get active filter count
     */
    getActiveFilterCount() {
        return this.filterController.getActiveFilterCount();
    }

    /**
     * Set status message
     */
    setStatus(status: string): void {
        this.contextController.setStatus(status);
    }

    /**
     * Handle resize events
     */
    handleResize(): void {
        // Notify controllers that might need to adjust to new size
        // Currently, most UI elements are responsive via CSS
        console.log('UI controllers handling resize');
    }


    /**
     * Cleanup all controllers
     */
    cleanup(): void {
        // Cleanup any event listeners or resources
        console.log('UI Controller Manager cleanup');
        this.destroy();
    }

    /**
     * Destroy UI controller manager
     */
    public destroy(): void {
        console.log('UIControllerManager: [UICM] Destroying...');
        this.popupController.destroy();
        // Cleanup other controllers as needed
    }

    /**
     * Get debug information
     */
    getDebugInfo(): {
        filters: CrossProviderFilterState;
        theme: string;
        context: ContextInfo;
        popup: any;
    } {
        return {
            filters: this.getFilterState(),
            theme: this.getCurrentTheme(),
            context: this.getCurrentContext(),
            popup: this.getPopupStats()
        };
    }
}