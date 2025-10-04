/**
 * Abstract Timeline Renderer Interface
 * Enables pluggable visualization types while maintaining consistent data contracts
 */

import { ProcessedTimelineData } from '../data/TimelineDataManager';

export interface RendererCapabilities {
    readonly supportsInteraction: boolean;
    readonly supportsZoom: boolean;
    readonly supportsFiltering: boolean;
    readonly supportsTimeRanges: boolean;
    readonly supportsRangeSelection: boolean;
    readonly supportsEventDetails: boolean;
    readonly supportedEventTypes: string[];
    readonly requiresContainer: boolean;
}

export interface RendererOptions {
    theme?: string;
    colorMap?: { [key: string]: string };
    interactions?: boolean;
    animations?: boolean;
    customSettings?: Record<string, any>;
}

export interface ViewportInfo {
    readonly dateRange: [Date, Date];
    readonly visibleEvents: number;
    readonly zoomLevel: number;
}

export interface RendererEvent {
    readonly type: 'hover' | 'click' | 'zoom' | 'brush' | 'resize';
    readonly event?: any;
    readonly position?: { x: number; y: number };
    readonly data?: any;
}

/**
 * Universal Timeline Renderer Interface
 * All visualization implementations must conform to this contract
 */
export interface ITimelineRenderer {
    // Identification
    readonly id: string;
    readonly displayName: string;
    readonly version: string;
    readonly capabilities: RendererCapabilities;

    // Core rendering lifecycle
    initialize(container: HTMLElement | string, options?: RendererOptions): Promise<void>;
    render(data: ProcessedTimelineData): Promise<void>;
    update(data: ProcessedTimelineData): Promise<void>;
    resize(): void;
    destroy(): void;

    // Configuration management
    configure(options: RendererOptions): void;
    getConfiguration(): RendererOptions;

    // Interaction handling
    onEventInteraction?: (event: RendererEvent) => void;
    onViewportChange?: (viewport: ViewportInfo) => void;

    // State management
    setTimeRange(range: [Date, Date]): void;
    setBrushRange(range: [Date, Date] | null): void;
    setTheme(theme: string): void;

    // Viewport control (for slider-driven zoom/pan)
    updateViewport?(timeRange: [Date, Date]): void;
    supportsViewportUpdate?(): boolean;

    // Utility methods
    isInitialized(): boolean;
    getContainer(): HTMLElement | null;
    getViewport(): ViewportInfo;

    // Health and diagnostics
    validate(): Promise<RendererValidationResult>;
    getDebugInfo(): RendererDebugInfo;
}

export interface RendererValidationResult {
    readonly isValid: boolean;
    readonly errors: string[];
    readonly warnings: string[];
}

export interface RendererDebugInfo {
    readonly renderTime: number;
    readonly eventCount: number;
    readonly memoryUsage: number;
    readonly containerSize: { width: number; height: number };
    readonly lastRenderTimestamp: Date;
}

/**
 * Base abstract class with common functionality
 * Concrete renderers can extend this for shared behavior
 */
export abstract class BaseTimelineRenderer implements ITimelineRenderer {
    // Abstract properties that must be implemented
    abstract readonly id: string;
    abstract readonly displayName: string;
    abstract readonly version: string;
    abstract readonly capabilities: RendererCapabilities;

    // Common properties
    protected container: HTMLElement | null = null;
    protected options: RendererOptions = {};
    protected currentData: ProcessedTimelineData | null = null;
    protected initialized: boolean = false;
    protected lastRenderTime: number = 0;
    protected lastRenderTimestamp: Date = new Date();

    // Event handlers
    public onEventInteraction?: (event: RendererEvent) => void;
    public onViewportChange?: (viewport: ViewportInfo) => void;

    // Common initialization
    async initialize(container: HTMLElement | string, options?: RendererOptions): Promise<void> {
        if (typeof container === 'string') {
            const element = document.querySelector(container) as HTMLElement;
            if (!element) {
                throw new Error(`Container not found: ${container}`);
            }
            this.container = element;
        } else {
            this.container = container;
        }

        this.options = { ...this.getDefaultOptions(), ...options };
        await this.initializeRenderer();
        this.initialized = true;
    }

    // Configuration management
    configure(options: RendererOptions): void {
        this.options = { ...this.options, ...options };
        this.applyConfiguration();
    }

    getConfiguration(): RendererOptions {
        return { ...this.options };
    }

    // State management
    setTimeRange(range: [Date, Date]): void {
        this.handleTimeRangeChange(range);
    }

    setBrushRange(range: [Date, Date] | null): void {
        this.handleBrushRangeChange(range);
    }

    setTheme(theme: string): void {
        this.options.theme = theme;
        this.applyTheme(theme);
    }

    // Utility methods
    isInitialized(): boolean {
        return this.initialized;
    }

    getContainer(): HTMLElement | null {
        return this.container;
    }

    getViewport(): ViewportInfo {
        return this.getCurrentViewport();
    }

    // Health and diagnostics
    async validate(): Promise<RendererValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!this.initialized) {
            errors.push('Renderer not initialized');
        }

        if (!this.container) {
            errors.push('No container element');
        }

        if (!this.currentData) {
            warnings.push('No data loaded');
        }

        const customValidation = await this.performCustomValidation();
        errors.push(...customValidation.errors);
        warnings.push(...customValidation.warnings);

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    getDebugInfo(): RendererDebugInfo {
        const containerSize = this.container
            ? { width: this.container.clientWidth, height: this.container.clientHeight }
            : { width: 0, height: 0 };

        return {
            renderTime: this.lastRenderTime,
            eventCount: this.currentData?.visibleEvents.length || 0,
            memoryUsage: this.estimateMemoryUsage(),
            containerSize,
            lastRenderTimestamp: this.lastRenderTimestamp
        };
    }

    // Protected methods for subclasses to implement
    protected abstract initializeRenderer(): Promise<void>;
    protected abstract renderData(data: ProcessedTimelineData): Promise<void>;
    protected abstract updateData(data: ProcessedTimelineData): Promise<void>;
    protected abstract performResize(): void;
    protected abstract cleanup(): void;

    // Protected methods with default implementations
    protected getDefaultOptions(): RendererOptions {
        return {
            theme: 'vscode',
            interactions: true,
            animations: true
        };
    }

    protected applyConfiguration(): void {
        // Default implementation - override if needed
    }

    protected applyTheme(theme: string): void {
        // Default implementation - override if needed
    }

    protected handleTimeRangeChange(range: [Date, Date]): void {
        // Default implementation - override if needed
    }

    protected handleBrushRangeChange(range: [Date, Date] | null): void {
        // Default implementation - override if needed
    }

    protected getCurrentViewport(): ViewportInfo {
        return {
            dateRange: [new Date(), new Date()],
            visibleEvents: this.currentData?.visibleEvents.length || 0,
            zoomLevel: 1.0
        };
    }

    protected async performCustomValidation(): Promise<{ errors: string[]; warnings: string[] }> {
        return { errors: [], warnings: [] };
    }

    protected estimateMemoryUsage(): number {
        // Simple estimation - override for more accurate measurement
        return (this.currentData?.visibleEvents.length || 0) * 100; // bytes
    }

    // Final implementations that call abstract methods
    async render(data: ProcessedTimelineData): Promise<void> {
        const startTime = performance.now();
        this.currentData = data;
        await this.renderData(data);
        this.lastRenderTime = performance.now() - startTime;
        this.lastRenderTimestamp = new Date();
    }

    async update(data: ProcessedTimelineData): Promise<void> {
        const startTime = performance.now();
        this.currentData = data;
        await this.updateData(data);
        this.lastRenderTime = performance.now() - startTime;
        this.lastRenderTimestamp = new Date();
    }

    resize(): void {
        this.performResize();
    }

    destroy(): void {
        this.cleanup();
        this.container = null;
        this.currentData = null;
        this.initialized = false;
    }
}