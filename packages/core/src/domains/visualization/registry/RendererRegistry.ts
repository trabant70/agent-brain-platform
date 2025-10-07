/**
 * Renderer Registry - Plugin Management for Timeline Visualizations
 * Manages discovery, loading, and lifecycle of timeline renderers
 */

import {
    ITimelineRenderer,
    RendererOptions,
    RendererCapabilities,
    RendererValidationResult
} from '../interfaces/ITimelineRenderer';

export interface RendererDefinition {
    readonly id: string;
    readonly displayName: string;
    readonly description: string;
    readonly version: string;
    readonly author: string;
    readonly capabilities: RendererCapabilities;
    readonly factory: RendererFactory;
    readonly isBuiltIn: boolean;
    readonly defaultOptions?: RendererOptions;
}

export type RendererFactory = (container: HTMLElement | string, options?: RendererOptions) => Promise<ITimelineRenderer>;

export interface RendererRegistryOptions {
    autoLoadBuiltIn?: boolean;
    strictValidation?: boolean;
    enableHealthMonitoring?: boolean;
}

export interface RendererHealthStatus {
    readonly rendererId: string;
    readonly isHealthy: boolean;
    readonly lastCheck: Date;
    readonly errorCount: number;
    readonly lastError?: string;
    readonly performanceMetrics: {
        averageRenderTime: number;
        maxRenderTime: number;
        totalRenders: number;
    };
}

export interface RegistryStats {
    readonly totalRenderers: number;
    readonly healthyRenderers: number;
    readonly averageRenderTime: number;
    readonly totalRenders: number;
    readonly topPerformers: string[];
    readonly capabilityBreakdown: Map<string, number>;
}

/**
 * Central registry for timeline renderer plugins
 */
export class RendererRegistry {
    private renderers = new Map<string, RendererDefinition>();
    private healthStatus = new Map<string, RendererHealthStatus>();
    private activeInstances = new Map<string, ITimelineRenderer[]>();
    private options: RendererRegistryOptions;

    constructor(options: RendererRegistryOptions = {}) {
        this.options = {
            autoLoadBuiltIn: true,
            strictValidation: true,
            enableHealthMonitoring: true,
            ...options
        };

        // Note: loadBuiltInRenderers() is async and should be called separately
        // Use initialize() method for proper async initialization
    }

    /**
     * Initialize the registry (async operations)
     */
    async initialize(): Promise<void> {
        if (this.options.autoLoadBuiltIn) {
            await this.loadBuiltInRenderers();
        }
    }

    /**
     * Register a renderer definition
     */
    async registerRenderer(definition: RendererDefinition): Promise<void> {
        try {

            // Validate renderer definition
            this.validateRendererDefinition(definition);

            // Test renderer creation if strict validation is enabled
            if (this.options.strictValidation) {
                await this.testRendererCreation(definition);
            }

            // Store renderer definition
            this.renderers.set(definition.id, definition);

            // Initialize health monitoring
            if (this.options.enableHealthMonitoring) {
                this.initializeHealthMonitoring(definition.id);
            }


        } catch (error) {
            throw new RendererRegistrationError(definition.id, error as Error);
        }
    }

    /**
     * Unregister a renderer
     */
    async unregisterRenderer(rendererId: string): Promise<void> {
        const definition = this.renderers.get(rendererId);
        if (!definition) {
            throw new RendererNotFoundError(rendererId);
        }

        try {

            // Destroy all active instances
            const instances = this.activeInstances.get(rendererId) || [];
            for (const instance of instances) {
                instance.destroy();
            }

            // Remove from registry
            this.renderers.delete(rendererId);
            this.healthStatus.delete(rendererId);
            this.activeInstances.delete(rendererId);


        } catch (error) {
            throw error;
        }
    }

    /**
     * Create a renderer instance
     */
    async createRenderer(
        rendererId: string,
        container: HTMLElement | string,
        options?: RendererOptions
    ): Promise<ITimelineRenderer> {
        const definition = this.renderers.get(rendererId);
        if (!definition) {
            throw new RendererNotFoundError(rendererId);
        }

        try {

            // Merge default options with provided options
            const mergedOptions = { ...definition.defaultOptions, ...options };

            // Create renderer instance using factory
            const instance = await definition.factory(container, mergedOptions);

            // Track active instance
            const instances = this.activeInstances.get(rendererId) || [];
            instances.push(instance);
            this.activeInstances.set(rendererId, instances);

            // Setup health monitoring if enabled
            if (this.options.enableHealthMonitoring) {
                this.setupInstanceMonitoring(rendererId, instance);
            }

            return instance;

        } catch (error) {
            throw new RendererCreationError(rendererId, error as Error);
        }
    }

    /**
     * Get renderer definition
     */
    getRenderer(rendererId: string): RendererDefinition | undefined {
        return this.renderers.get(rendererId);
    }

    /**
     * Get all registered renderers
     */
    getAllRenderers(): RendererDefinition[] {
        return Array.from(this.renderers.values());
    }

    /**
     * Get renderers by capability
     */
    getRenderersByCapability(capability: keyof RendererCapabilities): RendererDefinition[] {
        return Array.from(this.renderers.values())
            .filter(def => def.capabilities[capability] === true);
    }

    /**
     * Get healthy renderers
     */
    getHealthyRenderers(): RendererDefinition[] {
        return Array.from(this.renderers.values())
            .filter(def => {
                const health = this.healthStatus.get(def.id);
                return health?.isHealthy !== false;
            });
    }

    /**
     * Get built-in renderers
     */
    getBuiltInRenderers(): RendererDefinition[] {
        return Array.from(this.renderers.values())
            .filter(def => def.isBuiltIn);
    }

    /**
     * Get third-party renderers
     */
    getThirdPartyRenderers(): RendererDefinition[] {
        return Array.from(this.renderers.values())
            .filter(def => !def.isBuiltIn);
    }

    /**
     * Perform health checks on all renderers
     */
    async performHealthChecks(): Promise<Map<string, RendererHealthStatus>> {

        const healthResults = new Map<string, RendererHealthStatus>();

        for (const [rendererId] of this.renderers) {
            try {
                const health = await this.checkRendererHealth(rendererId);
                healthResults.set(rendererId, health);
                this.healthStatus.set(rendererId, health);
            } catch (error) {
            }
        }

        return healthResults;
    }

    /**
     * Get registry statistics
     */
    getRegistryStats(): RegistryStats {
        const totalRenderers = this.renderers.size;
        const healthyRenderers = Array.from(this.healthStatus.values())
            .filter(status => status.isHealthy).length;

        const allMetrics = Array.from(this.healthStatus.values())
            .map(status => status.performanceMetrics);

        const averageRenderTime = allMetrics.length > 0
            ? allMetrics.reduce((sum, metrics) => sum + metrics.averageRenderTime, 0) / allMetrics.length
            : 0;

        const totalRenders = allMetrics.reduce((sum, metrics) => sum + metrics.totalRenders, 0);

        const topPerformers = Array.from(this.healthStatus.entries())
            .sort(([, a], [, b]) => a.performanceMetrics.averageRenderTime - b.performanceMetrics.averageRenderTime)
            .slice(0, 3)
            .map(([id]) => id);

        const capabilityBreakdown = new Map<string, number>();
        for (const def of this.renderers.values()) {
            for (const [capability, hasCapability] of Object.entries(def.capabilities)) {
                if (hasCapability) {
                    capabilityBreakdown.set(capability, (capabilityBreakdown.get(capability) || 0) + 1);
                }
            }
        }

        return {
            totalRenderers,
            healthyRenderers,
            averageRenderTime,
            totalRenders,
            topPerformers,
            capabilityBreakdown
        };
    }

    /**
     * Load built-in renderers
     */
    private async loadBuiltInRenderers(): Promise<void> {

        // Built-in renderers will be registered by their respective modules
        // This method serves as a hook for auto-discovery
    }

    /**
     * Validate renderer definition
     */
    private validateRendererDefinition(definition: RendererDefinition): void {
        if (!definition.id || !definition.displayName || !definition.factory) {
            throw new Error('Renderer definition must have id, displayName, and factory');
        }

        if (this.renderers.has(definition.id)) {
            throw new Error(`Renderer with id '${definition.id}' is already registered`);
        }

        if (!definition.capabilities) {
            throw new Error('Renderer definition must specify capabilities');
        }
    }

    /**
     * Test renderer creation during validation
     */
    private async testRendererCreation(definition: RendererDefinition): Promise<void> {
        // Create a temporary container for testing
        const testContainer = document.createElement('div');
        testContainer.style.display = 'none';
        document.body.appendChild(testContainer);

        try {
            const testInstance = await definition.factory(testContainer, definition.defaultOptions);
            const validation = await testInstance.validate();

            if (!validation.isValid) {
                throw new Error(`Renderer validation failed: ${validation.errors.join(', ')}`);
            }

            testInstance.destroy();
        } finally {
            document.body.removeChild(testContainer);
        }
    }

    /**
     * Initialize health monitoring for a renderer
     */
    private initializeHealthMonitoring(rendererId: string): void {
        this.healthStatus.set(rendererId, {
            rendererId,
            isHealthy: true,
            lastCheck: new Date(),
            errorCount: 0,
            performanceMetrics: {
                averageRenderTime: 0,
                maxRenderTime: 0,
                totalRenders: 0
            }
        });
    }

    /**
     * Setup monitoring for a renderer instance
     */
    private setupInstanceMonitoring(rendererId: string, instance: ITimelineRenderer): void {
        // Wrap render method to collect metrics
        const originalRender = instance.render.bind(instance);
        instance.render = async (data) => {
            const startTime = performance.now();
            try {
                await originalRender(data);
                this.recordSuccessfulRender(rendererId, performance.now() - startTime);
            } catch (error) {
                this.recordRenderError(rendererId, error as Error);
                throw error;
            }
        };
    }

    /**
     * Record successful render for metrics
     */
    private recordSuccessfulRender(rendererId: string, renderTime: number): void {
        const status = this.healthStatus.get(rendererId);
        if (!status) return;

        const metrics = status.performanceMetrics;
        const newTotalRenders = metrics.totalRenders + 1;
        const newAverageRenderTime =
            (metrics.averageRenderTime * metrics.totalRenders + renderTime) / newTotalRenders;

        this.healthStatus.set(rendererId, {
            ...status,
            isHealthy: true,
            lastCheck: new Date(),
            performanceMetrics: {
                averageRenderTime: newAverageRenderTime,
                maxRenderTime: Math.max(metrics.maxRenderTime, renderTime),
                totalRenders: newTotalRenders
            }
        });
    }

    /**
     * Record render error
     */
    private recordRenderError(rendererId: string, error: Error): void {
        const status = this.healthStatus.get(rendererId);
        if (!status) return;

        this.healthStatus.set(rendererId, {
            ...status,
            isHealthy: false,
            lastCheck: new Date(),
            errorCount: status.errorCount + 1,
            lastError: error.message
        });
    }

    /**
     * Check health of a specific renderer
     */
    private async checkRendererHealth(rendererId: string): Promise<RendererHealthStatus> {
        const currentStatus = this.healthStatus.get(rendererId);
        if (!currentStatus) {
            throw new Error(`No health status found for renderer: ${rendererId}`);
        }

        // Health check logic - for now, just return current status
        // In the future, this could include more sophisticated checks
        return {
            ...currentStatus,
            lastCheck: new Date()
        };
    }
}

// Error classes
export class RendererRegistrationError extends Error {
    constructor(rendererId: string, cause: Error) {
        super(`Failed to register renderer '${rendererId}': ${cause.message}`);
        this.name = 'RendererRegistrationError';
    }
}

export class RendererNotFoundError extends Error {
    constructor(rendererId: string) {
        super(`Renderer '${rendererId}' not found in registry`);
        this.name = 'RendererNotFoundError';
    }
}

export class RendererCreationError extends Error {
    constructor(rendererId: string, cause: Error) {
        super(`Failed to create renderer '${rendererId}': ${cause.message}`);
        this.name = 'RendererCreationError';
    }
}