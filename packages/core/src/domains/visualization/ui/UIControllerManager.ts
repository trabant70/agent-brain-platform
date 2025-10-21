/**
 * UIControllerManager - Unified UI Controller Coordination
 * Stage 5: Coordinates all UI controller classes
 *
 * Orchestrates:
 * - FilterController: Filter management
 * - PopupController: Event popup management
 * - ContextController: Context information display
 */

import { FilterController, FilterState, AvailableOptions, CrossProviderFilterState } from './FilterController';
import { PopupController, EventInteractionHandlers } from './PopupController';
import { ContextController, ContextInfo } from './ContextController';

export interface UIControllerOptions {
    colorMap?: { [key: string]: string };
    onFilterUpdate?: (filterType: string, values: string[]) => void;
    onEventAction?: (action: string, event: any) => void;
}

/**
 * Unified UI controller manager
 */
export class UIControllerManager {
    private filterController: FilterController;
    private popupController: PopupController;
    private contextController: ContextController;

    constructor(options: UIControllerOptions = {}) {

        // Initialize all controllers
        this.filterController = new FilterController({
            colorMap: options.colorMap || {}
        });

        this.popupController = new PopupController({
            // PopupController is now a pure UI component
            // No application action callbacks - TimelineApp handles file actions
        });

        this.contextController = new ContextController();
    }

    /**
     * Initialize UI controller manager
     */
    public async initialize(): Promise<void> {

        // Initialize filter controller first (sets up DOM elements and event listeners)
        this.filterController.initialize();

        // Initialize popup controller after DOM ready
        this.popupController.initialize();

        // Initialize other components as needed
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
    }


    /**
     * Cleanup all controllers
     */
    cleanup(): void {
        // Cleanup any event listeners or resources
        this.destroy();
    }

    /**
     * Destroy UI controller manager
     */
    public destroy(): void {
        this.popupController.destroy();
        // Cleanup other controllers as needed
    }

    /**
     * Get debug information
     */
    getDebugInfo(): {
        filters: CrossProviderFilterState;
        context: ContextInfo;
        popup: any;
    } {
        return {
            filters: this.getFilterState(),
            context: this.getCurrentContext(),
            popup: this.getPopupStats()
        };
    }
}