/**
 * PopupController - Sophisticated Event Popup Management Architecture
 *
 * ARCHITECTURAL DESIGN PRINCIPLES:
 *
 * 1. HOVER POPUPS (Non-locked):
 *    - Show immediately on event circle mouseenter
 *    - Hide immediately on event circle mouseleave
 *    - NO transition to popup area (architectural choice for clean UX)
 *    - NO delays, NO timeouts for hiding
 *    - Controlled ONLY by event circle interactions
 *
 * 2. CLICK POPUPS (Locked):
 *    - Show on event circle click
 *    - Stay visible regardless of mouse position
 *    - Hide ONLY when 'X' button is explicitly clicked
 *    - Completely independent of hover interactions
 *    - Support tabs and full functionality
 *
 * 3. STATE MANAGEMENT:
 *    - Clean transitions between hover and click modes
 *    - Clear pending timeouts when switching modes
 *    - Proper isLocked state management
 *    - No interference between interaction types
 */

import { EventDetailsPopup } from '../timeline/EventRenderer';

export interface PopupControllerOptions {
    // PopupController is now a pure UI component - no application action callbacks
    // Application actions are handled by TimelineApp layer
}

export interface EventInteractionHandlers {
    onEventHover: (event: Event, d: any) => void;
    onEventLeave: (event: Event, d: any) => void;
    onEventClick: (event: Event, d: any) => void;
}

/**
 * Popup controller for managing event detail popups
 */
export class PopupController {
    private eventPopup: EventDetailsPopup;
    private currentData: any = null;
    private escapeHandler?: (e: KeyboardEvent) => void;
    private outsideClickHandler?: (e: MouseEvent) => void;

    constructor(options: PopupControllerOptions = {}) {
        // PopupController is now a pure UI component - no application callbacks
        this.eventPopup = new EventDetailsPopup();
        this.setupGlobalHandlers();
    }

    /**
     * Initialize popup controller after DOM is ready
     */
    public initialize(): void {

        // Bind close button to our handler
        this.eventPopup.bindCloseHandler(() => this.handleCloseButton());

        // Setup global handlers
        this.setupGlobalHandlers();
    }

    /**
     * Setup global event handlers for popup management
     */
    private setupGlobalHandlers(): void {
        // Escape key handler
        this.escapeHandler = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && this.eventPopup.isLocked) {
                this.closePopups();
            }
        };

        // Click outside handler
        this.outsideClickHandler = (e: MouseEvent) => {
            if (!this.eventPopup.isLocked) return;

            const popupElement = document.getElementById('event-popup');
            const target = e.target as HTMLElement;

            if (popupElement &&
                !popupElement.contains(target) &&
                !target.closest('.event-group') &&
                !target.closest('.event-node')) {
                this.closePopups();
            }
        };

        // Add listeners
        document.addEventListener('keydown', this.escapeHandler);
        document.addEventListener('click', this.outsideClickHandler);
    }

    /**
     * Get event interaction handlers for visualization
     */
    getEventHandlers(): EventInteractionHandlers {
        return {
            onEventHover: (event: Event, d: any) => this.handleEventHover(event, d),
            onEventLeave: (event: Event, d: any) => this.handleEventLeave(event, d),
            onEventClick: (event: Event, d: any) => this.handleEventClick(event, d)
        };
    }

    /**
     * Handle event hover
     */
    private handleEventHover(event: Event, d: any): void {

        // Don't show hover if locked popup is open
        if (this.eventPopup.isLocked) {
            return;
        }

        const mouseEvent = event as MouseEvent;
        const position = { x: mouseEvent.pageX, y: mouseEvent.pageY };

        this.eventPopup.showHover(d, position, this.currentData?.allEvents || []);
    }

    /**
     * Handle event leave
     */
    private handleEventLeave(event: Event, d: any): void {

        // Only hide if not locked
        if (!this.eventPopup.isLocked) {
            this.eventPopup.hide();
        }
    }

    /**
     * Handle event click
     */
    private handleEventClick(event: Event, d: any): void {

        const mouseEvent = event as MouseEvent;
        mouseEvent.stopPropagation();

        const position = { x: mouseEvent.pageX, y: mouseEvent.pageY };

        this.eventPopup.showLocked(d, position, this.currentData?.allEvents || []);

        // Re-bind close button after showing locked popup
        this.eventPopup.bindCloseHandler(() => this.handleCloseButton());

        // PopupController only handles popup display - file actions handled by TimelineApp
        // Removed duplicate onEventAction call to prevent double file opening
    }

    /**
     * Handle close button click
     */
    private handleCloseButton(): void {
        this.closePopups();

        // PopupController only handles popup state - no application actions needed
        // Application layer (TimelineApp) handles file/commit actions
    }

    /**
     * Close all popups
     */
    closePopups(): void {
        if (this.eventPopup) {
            this.eventPopup.hide();
        }
    }

    /**
     * Update the data context for popups
     */
    updateDataContext(data: any): void {
        this.currentData = data;
    }

    /**
     * Show popup for specific event
     */
    showEventPopup(event: any, position: { x: number; y: number }, locked: boolean = false): void {
        if (locked) {
            this.eventPopup.showLocked(event, position, this.currentData?.allEvents || []);
        } else {
            this.eventPopup.showHover(event, position, this.currentData?.allEvents || []);
        }
    }

    /**
     * Hide current popup
     */
    hidePopup(): void {
        this.eventPopup.hide();
    }

    /**
     * Check if popup is currently visible
     */
    isPopupVisible(): boolean {
        return this.eventPopup && this.eventPopup.isLocked;
    }

    /**
     * Get current popup event
     */
    getCurrentPopupEvent(): any {
        return this.eventPopup ? this.eventPopup.currentEvent : null;
    }

    /**
     * Switch popup tab (if popup is locked)
     */
    switchPopupTab(tabName: string): void {
        if (this.eventPopup && this.eventPopup.isLocked) {
            this.eventPopup.switchTab(tabName);
        }
    }

    /**
     * Position popup at specific coordinates
     */
    positionPopup(position: { x: number; y: number }): void {
        if (this.eventPopup) {
            // Access private method through type assertion
            (this.eventPopup as any)._positionPopup(position);
        }
    }

    /**
     * Set popup lock state
     */
    setPopupLocked(locked: boolean): void {
        if (this.eventPopup) {
            this.eventPopup.isLocked = locked;
        }
    }

    /**
     * Handle popup close action
     */
    handlePopupClose(): void {
        this.closePopups();

        // PopupController only handles popup state - no application actions
    }

    /**
     * Handle popup drag start
     */
    handlePopupDragStart(event: any): void {
        // Popup drag is handled by EventDetailsPopup internally
    }

    /**
     * Update popup content for current event
     */
    refreshPopupContent(): void {
        if (this.eventPopup && this.eventPopup.currentEvent) {
            const currentEvent = this.eventPopup.currentEvent;
            const isLocked = this.eventPopup.isLocked;

            if (isLocked) {
                // Refresh locked popup
                this.eventPopup.hide();
                setTimeout(() => {
                    const position = { x: 0, y: 0 }; // Will be repositioned
                    this.eventPopup.showLocked(currentEvent, position, this.currentData?.allEvents || []);
                }, 50);
            }
        }
    }

    /**
     * Get popup statistics
     */
    getPopupStats(): {
        isVisible: boolean;
        isLocked: boolean;
        currentEventId?: string;
        currentTab?: string;
    } {
        if (!this.eventPopup) {
            return { isVisible: false, isLocked: false };
        }

        return {
            isVisible: !!this.eventPopup.currentEvent,
            isLocked: this.eventPopup.isLocked,
            currentEventId: this.eventPopup.currentEvent?.id,
            currentTab: this.eventPopup.currentTab
        };
    }

    /**
     * Cleanup
     */
    public destroy(): void {

        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler);
        }
        if (this.outsideClickHandler) {
            document.removeEventListener('click', this.outsideClickHandler);
        }
        this.closePopups();
    }
}