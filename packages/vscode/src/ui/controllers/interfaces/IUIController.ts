/**
 * Modular UI Controller Architecture
 *
 * Manages multi-faceted popup systems and user interactions
 */

import { INormalizedEvent } from '../../../data/normalization/interfaces';

export interface IUIController {
    readonly id: string;
    readonly name: string;

    /**
     * Initialize the controller
     */
    initialize(context: IUIContext): Promise<void>;

    /**
     * Handle user interaction
     */
    handleInteraction(interaction: IUserInteraction): Promise<IInteractionResult>;

    /**
     * Update controller state
     */
    updateState(state: any): Promise<void>;

    /**
     * Cleanup resources
     */
    dispose(): Promise<void>;
}

export interface IUIContext {
    readonly webview: any; // vscode.Webview
    readonly extensionContext: any; // vscode.ExtensionContext
    readonly rootElement?: HTMLElement;
    readonly theme: ITheme;
    readonly accessibility: IAccessibilitySettings;
}

export interface ITheme {
    readonly isDark: boolean;
    readonly colors: Record<string, string>;
    readonly fonts: Record<string, string>;
    readonly spacing: Record<string, number>;
}

export interface IAccessibilitySettings {
    readonly highContrast: boolean;
    readonly reducedMotion: boolean;
    readonly screenReader: boolean;
    readonly fontSize: number;
}

export interface IUserInteraction {
    readonly type: InteractionType;
    readonly target: IInteractionTarget;
    readonly data: any;
    readonly timestamp: Date;
    readonly modifiers?: IInteractionModifiers;
}

export enum InteractionType {
    CLICK = 'click',
    DOUBLE_CLICK = 'double-click',
    RIGHT_CLICK = 'right-click',
    HOVER = 'hover',
    HOVER_OUT = 'hover-out',
    KEY_PRESS = 'key-press',
    DRAG_START = 'drag-start',
    DRAG_END = 'drag-end',
    SELECTION_CHANGE = 'selection-change',
    SCROLL = 'scroll',
    ZOOM = 'zoom'
}

export interface IInteractionTarget {
    readonly elementId: string;
    readonly elementType: string;
    readonly event?: INormalizedEvent;
    readonly coordinates?: ICoordinates;
    readonly boundingBox?: IBoundingBox;
}

export interface ICoordinates {
    readonly x: number;
    readonly y: number;
    readonly screenX?: number;
    readonly screenY?: number;
}

export interface IBoundingBox {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}

export interface IInteractionModifiers {
    readonly ctrlKey: boolean;
    readonly shiftKey: boolean;
    readonly altKey: boolean;
    readonly metaKey: boolean;
}

export interface IInteractionResult {
    readonly handled: boolean;
    readonly preventDefault?: boolean;
    readonly stopPropagation?: boolean;
    readonly actions?: IUIAction[];
    readonly newState?: any;
}

export interface IUIAction {
    readonly type: UIActionType;
    readonly target?: string;
    readonly payload: any;
}

export enum UIActionType {
    SHOW_POPUP = 'show-popup',
    HIDE_POPUP = 'hide-popup',
    SHOW_TOOLTIP = 'show-tooltip',
    HIDE_TOOLTIP = 'hide-tooltip',
    SHOW_CONTEXT_MENU = 'show-context-menu',
    HIDE_CONTEXT_MENU = 'hide-context-menu',
    UPDATE_SELECTION = 'update-selection',
    NAVIGATE_TO_EVENT = 'navigate-to-event',
    FILTER_EVENTS = 'filter-events',
    EXPORT_DATA = 'export-data',
    OPEN_EXTERNAL_LINK = 'open-external-link',
    SHOW_NOTIFICATION = 'show-notification'
}

export interface IPopupController extends IUIController {
    /**
     * Show a popup at the specified location
     */
    showPopup(popup: IPopupDefinition): Promise<void>;

    /**
     * Hide a specific popup
     */
    hidePopup(popupId: string): Promise<void>;

    /**
     * Hide all popups
     */
    hideAllPopups(): Promise<void>;

    /**
     * Update popup content
     */
    updatePopup(popupId: string, content: IPopupContent): Promise<void>;

    /**
     * Get active popups
     */
    getActivePopups(): IPopupInstance[];
}

export interface IPopupDefinition {
    readonly id: string;
    readonly type: PopupType;
    readonly content: IPopupContent;
    readonly positioning: IPopupPositioning;
    readonly behavior: IPopupBehavior;
    readonly styling?: IPopupStyling;
}

export enum PopupType {
    TOOLTIP = 'tooltip',
    CONTEXT_MENU = 'context-menu',
    MODAL = 'modal',
    PANEL = 'panel',
    NOTIFICATION = 'notification',
    OVERLAY = 'overlay'
}

export interface IPopupContent {
    readonly title?: string;
    readonly body: string | IPopupComponent[];
    readonly actions?: IPopupAction[];
    readonly data?: any;
}

export interface IPopupComponent {
    readonly type: 'text' | 'html' | 'button' | 'link' | 'separator' | 'custom';
    readonly content: string;
    readonly action?: IPopupAction;
    readonly styling?: Record<string, string>;
}

export interface IPopupAction {
    readonly id: string;
    readonly label: string;
    readonly type: 'primary' | 'secondary' | 'danger' | 'success';
    readonly callback: (data: any) => Promise<void>;
    readonly icon?: string;
}

export interface IPopupPositioning {
    readonly strategy: PositioningStrategy;
    readonly anchor?: IPositionAnchor;
    readonly offset?: ICoordinates;
    readonly constraints?: IPositionConstraints;
}

export enum PositioningStrategy {
    FIXED = 'fixed',
    ABSOLUTE = 'absolute',
    RELATIVE = 'relative',
    FOLLOW_CURSOR = 'follow-cursor',
    ANCHOR_TO_ELEMENT = 'anchor-to-element',
    CENTER_SCREEN = 'center-screen'
}

export interface IPositionAnchor {
    readonly elementId?: string;
    readonly coordinates?: ICoordinates;
    readonly side: 'top' | 'bottom' | 'left' | 'right' | 'center';
    readonly alignment: 'start' | 'center' | 'end';
}

export interface IPositionConstraints {
    readonly minX?: number;
    readonly maxX?: number;
    readonly minY?: number;
    readonly maxY?: number;
    readonly keepOnScreen: boolean;
}

export interface IPopupBehavior {
    readonly autoHide: boolean;
    readonly hideOnClickOutside: boolean;
    readonly hideOnScroll: boolean;
    readonly hideOnEscape: boolean;
    readonly hideDelay?: number;
    readonly maxWidth?: number;
    readonly maxHeight?: number;
    readonly resizable: boolean;
    readonly draggable: boolean;
}

export interface IPopupStyling {
    readonly className?: string;
    readonly zIndex?: number;
    readonly opacity?: number;
    readonly animation?: IPopupAnimation;
}

export interface IPopupAnimation {
    readonly show: string;
    readonly hide: string;
    readonly duration: number;
}

export interface IPopupInstance {
    readonly definition: IPopupDefinition;
    readonly isVisible: boolean;
    readonly createdAt: Date;
    readonly element?: HTMLElement;
}

export interface ISelectionController extends IUIController {
    /**
     * Get current selection
     */
    getSelection(): ITimelineSelection;

    /**
     * Update selection
     */
    updateSelection(selection: ITimelineSelection): Promise<void>;

    /**
     * Clear selection
     */
    clearSelection(): Promise<void>;

    /**
     * Add to selection
     */
    addToSelection(events: INormalizedEvent[]): Promise<void>;

    /**
     * Remove from selection
     */
    removeFromSelection(eventIds: string[]): Promise<void>;
}

export interface ITimelineSelection {
    readonly selectedEvents: INormalizedEvent[];
    readonly selectionType: SelectionType;
    readonly selectionRange?: ITimeRange;
    readonly metadata?: Record<string, any>;
}

export interface ITimeRange {
    readonly start: Date;
    readonly end: Date;
}

export enum SelectionType {
    SINGLE_EVENT = 'single-event',
    MULTIPLE_EVENTS = 'multiple-events',
    TIME_RANGE = 'time-range',
    BRANCH = 'branch',
    AUTHOR = 'author',
    CUSTOM = 'custom'
}

export interface IInteractionController extends IUIController {
    /**
     * Register interaction handler
     */
    registerHandler(type: InteractionType, handler: IInteractionHandler): void;

    /**
     * Unregister interaction handler
     */
    unregisterHandler(type: InteractionType, handlerId: string): void;

    /**
     * Process interaction through the chain
     */
    processInteraction(interaction: IUserInteraction): Promise<IInteractionResult>;
}

export interface IInteractionHandler {
    readonly id: string;
    readonly priority: number;

    /**
     * Handle the interaction
     */
    handle(interaction: IUserInteraction): Promise<IInteractionResult>;

    /**
     * Check if this handler can process the interaction
     */
    canHandle(interaction: IUserInteraction): boolean;
}