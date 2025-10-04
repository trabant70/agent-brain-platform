/**
 * StateInspector - Development and Debugging Tool
 * Comprehensive state monitoring and debugging capabilities for DataOrchestrator
 *
 * Features:
 * - Real-time state inspection
 * - State change history tracking
 * - Performance metrics monitoring
 * - Error tracking and analysis
 * - Debug logging with filtering
 * - State validation and integrity checks
 */

import { OrchestratorState, StateUpdate, StateUpdateListener } from './OrchestratorState';

export interface StateInspectorOptions {
    enabled?: boolean;
    maxHistorySize?: number;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    trackPerformance?: boolean;
    validateState?: boolean;
    consoleOutput?: boolean;
}

export interface StateHistoryEntry {
    timestamp: Date;
    state: OrchestratorState;
    update: StateUpdate;
    performanceMetrics?: PerformanceMetrics;
    validationResults?: ValidationResult[];
}

export interface PerformanceMetrics {
    stateUpdateDuration: number;
    subscriberNotificationDuration: number;
    totalSubscribers: number;
    cacheHitRate: number;
    memoryUsage?: {
        state: number;
        cache: number;
        subscribers: number;
    };
}

export interface ValidationResult {
    level: 'info' | 'warn' | 'error';
    message: string;
    path?: string;
    expectedType?: string;
    actualType?: string;
}

export interface StateMetrics {
    totalStateUpdates: number;
    averageUpdateDuration: number;
    errorCount: number;
    subscriberCount: number;
    cacheSize: number;
    memoryUsage: number;
    uptime: number;
}

/**
 * StateInspector - Advanced debugging tool for state management
 */
export class StateInspector implements StateUpdateListener {
    private options: Required<StateInspectorOptions>;
    private history: StateHistoryEntry[] = [];
    private startTime: Date;
    private metrics: StateMetrics;
    private isEnabled: boolean;

    // Performance tracking
    private updateTimes: number[] = [];
    private errorLog: Array<{ timestamp: Date; error: Error; context?: any }> = [];

    // State validation rules
    private validationRules: Array<(state: OrchestratorState) => ValidationResult[]> = [];

    constructor(options: StateInspectorOptions = {}) {
        this.options = {
            enabled: options.enabled ?? true,
            maxHistorySize: options.maxHistorySize ?? 100,
            logLevel: options.logLevel ?? 'info',
            trackPerformance: options.trackPerformance ?? true,
            validateState: options.validateState ?? true,
            consoleOutput: options.consoleOutput ?? true
        };

        this.startTime = new Date();
        this.isEnabled = this.options.enabled;

        this.metrics = {
            totalStateUpdates: 0,
            averageUpdateDuration: 0,
            errorCount: 0,
            subscriberCount: 0,
            cacheSize: 0,
            memoryUsage: 0,
            uptime: 0
        };

        this.initializeValidationRules();

        if (this.isEnabled && this.options.consoleOutput) {
            this.log('info', 'StateInspector initialized', { options: this.options });
        }
    }

    /**
     * StateUpdateListener implementation
     */
    onStateUpdate(update: StateUpdate): void {
        if (!this.isEnabled) return;

        const startTime = performance.now();

        try {
            // Get current state (assumes we have access to it)
            const currentState = this.getCurrentState();

            // Track performance
            const performanceMetrics = this.options.trackPerformance ?
                this.capturePerformanceMetrics(startTime) : undefined;

            // Validate state
            const validationResults = this.options.validateState ?
                this.validateState(currentState) : undefined;

            // Create history entry
            const historyEntry: StateHistoryEntry = {
                timestamp: new Date(),
                state: this.cloneState(currentState),
                update,
                performanceMetrics,
                validationResults
            };

            // Add to history
            this.addToHistory(historyEntry);

            // Update metrics
            this.updateMetrics(performance.now() - startTime);

            // Log state change
            this.logStateChange(update, performanceMetrics, validationResults);

        } catch (error) {
            this.onError(error as Error);
        }
    }

    onError(error: Error): void {
        if (!this.isEnabled) return;

        this.errorLog.push({
            timestamp: new Date(),
            error,
            context: { metricsSnapshot: { ...this.metrics } }
        });

        this.metrics.errorCount++;

        this.log('error', 'StateInspector error', {
            error: error.message,
            stack: error.stack
        });
    }

    // ==============================================
    // PUBLIC INSPECTION INTERFACE
    // ==============================================

    /**
     * Get current state snapshot
     */
    getCurrentStateSnapshot(): OrchestratorState | null {
        if (!this.isEnabled || this.history.length === 0) return null;
        return this.cloneState(this.history[this.history.length - 1].state);
    }

    /**
     * Get state history
     */
    getStateHistory(limit?: number): StateHistoryEntry[] {
        if (!this.isEnabled) return [];
        const actualLimit = limit || this.history.length;
        return this.history.slice(-actualLimit).map(entry => ({
            ...entry,
            state: this.cloneState(entry.state)
        }));
    }

    /**
     * Get performance metrics
     */
    getMetrics(): StateMetrics {
        if (!this.isEnabled) return this.getEmptyMetrics();

        return {
            ...this.metrics,
            uptime: Date.now() - this.startTime.getTime(),
            averageUpdateDuration: this.updateTimes.length > 0 ?
                this.updateTimes.reduce((a, b) => a + b, 0) / this.updateTimes.length : 0
        };
    }

    /**
     * Get error log
     */
    getErrorLog(): Array<{ timestamp: Date; error: Error; context?: any }> {
        if (!this.isEnabled) return [];
        return [...this.errorLog];
    }

    /**
     * Get state changes between two timestamps
     */
    getStateChangesBetween(startTime: Date, endTime: Date): StateHistoryEntry[] {
        if (!this.isEnabled) return [];

        return this.history.filter(entry =>
            entry.timestamp >= startTime && entry.timestamp <= endTime
        );
    }

    /**
     * Find state by version
     */
    getStateByVersion(version: number): StateHistoryEntry | null {
        if (!this.isEnabled) return null;

        return this.history.find(entry =>
            entry.state.meta.version === version
        ) || null;
    }

    /**
     * Export state history as JSON
     */
    exportHistory(): string {
        if (!this.isEnabled) return '[]';

        return JSON.stringify({
            metadata: {
                exportTime: new Date(),
                totalEntries: this.history.length,
                metrics: this.getMetrics(),
                options: this.options
            },
            history: this.history.map(entry => ({
                ...entry,
                state: this.serializeState(entry.state)
            }))
        }, null, 2);
    }

    /**
     * Clear history and reset metrics
     */
    reset(): void {
        if (!this.isEnabled) return;

        this.history = [];
        this.updateTimes = [];
        this.errorLog = [];
        this.metrics = {
            totalStateUpdates: 0,
            averageUpdateDuration: 0,
            errorCount: 0,
            subscriberCount: 0,
            cacheSize: 0,
            memoryUsage: 0,
            uptime: 0
        };
        this.startTime = new Date();

        this.log('info', 'StateInspector reset');
    }

    /**
     * Enable/disable inspector
     */
    setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
        this.log('info', `StateInspector ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Update inspector options
     */
    updateOptions(newOptions: Partial<StateInspectorOptions>): void {
        this.options = { ...this.options, ...newOptions };
        this.log('info', 'StateInspector options updated', { options: this.options });
    }

    // ==============================================
    // PRIVATE IMPLEMENTATION
    // ==============================================

    /**
     * Initialize state validation rules
     */
    private initializeValidationRules(): void {
        // Required state structure validation
        this.validationRules.push((state: OrchestratorState) => {
            const results: ValidationResult[] = [];

            // Check required top-level properties
            const requiredKeys = ['data', 'filters', 'view', 'ui', 'meta'];
            for (const key of requiredKeys) {
                if (!(key in state)) {
                    results.push({
                        level: 'error',
                        message: `Missing required state property: ${key}`,
                        path: key
                    });
                }
            }

            // Check data integrity
            if (state.data) {
                if (!(state.data.providers instanceof Map)) {
                    results.push({
                        level: 'error',
                        message: 'data.providers must be a Map',
                        path: 'data.providers',
                        expectedType: 'Map',
                        actualType: typeof state.data.providers
                    });
                }

                if (!(state.data.rawEvents instanceof Map)) {
                    results.push({
                        level: 'error',
                        message: 'data.rawEvents must be a Map',
                        path: 'data.rawEvents',
                        expectedType: 'Map',
                        actualType: typeof state.data.rawEvents
                    });
                }
            }

            // Check version consistency
            if (state.meta && typeof state.meta.version !== 'number') {
                results.push({
                    level: 'error',
                    message: 'meta.version must be a number',
                    path: 'meta.version',
                    expectedType: 'number',
                    actualType: typeof state.meta.version
                });
            }

            return results;
        });

        // Performance validation
        this.validationRules.push((state: OrchestratorState) => {
            const results: ValidationResult[] = [];

            // Check for excessive data
            if (state.data?.rawEvents) {
                const totalEvents = Object.values(state.data.rawEvents)
                    .reduce((sum, events) => sum + events.length, 0);

                if (totalEvents > 10000) {
                    results.push({
                        level: 'warn',
                        message: `Large number of events detected: ${totalEvents}`,
                        path: 'data.rawEvents'
                    });
                }
            }

            // Check for excessive errors
            if (state.ui?.errors && state.ui.errors.length > 10) {
                results.push({
                    level: 'warn',
                    message: `Excessive error count: ${state.ui.errors.length}`,
                    path: 'ui.errors'
                });
            }

            return results;
        });
    }

    /**
     * Get current state (placeholder - needs access to DataOrchestrator)
     */
    private getCurrentState(): OrchestratorState {
        // This is a placeholder - in real implementation, this would need
        // access to the DataOrchestrator instance to get current state
        return {} as OrchestratorState;
    }

    /**
     * Capture performance metrics
     */
    private capturePerformanceMetrics(startTime: number): PerformanceMetrics {
        const endTime = performance.now();

        return {
            stateUpdateDuration: endTime - startTime,
            subscriberNotificationDuration: 0, // Would be measured separately
            totalSubscribers: this.metrics.subscriberCount,
            cacheHitRate: this.calculateCacheHitRate(),
            memoryUsage: this.estimateMemoryUsage()
        };
    }

    /**
     * Validate state using all validation rules
     */
    private validateState(state: OrchestratorState): ValidationResult[] {
        const allResults: ValidationResult[] = [];

        for (const rule of this.validationRules) {
            try {
                const results = rule(state);
                allResults.push(...results);
            } catch (error) {
                allResults.push({
                    level: 'error',
                    message: `Validation rule failed: ${(error as Error).message}`
                });
            }
        }

        return allResults;
    }

    /**
     * Add entry to history with size management
     */
    private addToHistory(entry: StateHistoryEntry): void {
        this.history.push(entry);

        // Maintain max history size
        if (this.history.length > this.options.maxHistorySize) {
            this.history = this.history.slice(-this.options.maxHistorySize);
        }
    }

    /**
     * Update performance metrics
     */
    private updateMetrics(duration: number): void {
        this.metrics.totalStateUpdates++;
        this.updateTimes.push(duration);

        // Keep only recent update times for average calculation
        if (this.updateTimes.length > 100) {
            this.updateTimes = this.updateTimes.slice(-100);
        }
    }

    /**
     * Log state change
     */
    private logStateChange(
        update: StateUpdate,
        performanceMetrics?: PerformanceMetrics,
        validationResults?: ValidationResult[]
    ): void {
        if (!this.options.consoleOutput) return;

        const logData: any = {
            type: update.type,
            timestamp: update.timestamp,
            changes: Object.keys(update.changes)
        };

        if (performanceMetrics) {
            logData.performance = {
                duration: `${performanceMetrics.stateUpdateDuration.toFixed(2)}ms`,
                subscribers: performanceMetrics.totalSubscribers
            };
        }

        if (validationResults && validationResults.length > 0) {
            logData.validation = validationResults;
        }

        this.log('debug', 'State updated', logData);
    }

    /**
     * Clone state for safe storage
     */
    private cloneState(state: OrchestratorState): OrchestratorState {
        return JSON.parse(JSON.stringify({
            ...state,
            data: {
                ...state.data,
                providers: { ...state.data.providers },
                rawEvents: { ...state.data.rawEvents }
            }
        }));
    }

    /**
     * Serialize state for export
     */
    private serializeState(state: OrchestratorState): any {
        return {
            ...state,
            data: {
                ...state.data,
                providers: Object.entries(state.data.providers),
                rawEvents: Object.entries(state.data.rawEvents)
            }
        };
    }

    /**
     * Calculate cache hit rate
     */
    private calculateCacheHitRate(): number {
        // Placeholder implementation
        return 0.85; // Would be calculated from actual cache statistics
    }

    /**
     * Estimate memory usage
     */
    private estimateMemoryUsage(): { state: number; cache: number; subscribers: number } {
        // Rough estimation - in production would use more accurate measurement
        const stateSize = JSON.stringify(this.history).length;

        return {
            state: stateSize,
            cache: 0, // Would get from cache manager
            subscribers: this.metrics.subscriberCount * 100 // Rough estimate
        };
    }

    /**
     * Get empty metrics
     */
    private getEmptyMetrics(): StateMetrics {
        return {
            totalStateUpdates: 0,
            averageUpdateDuration: 0,
            errorCount: 0,
            subscriberCount: 0,
            cacheSize: 0,
            memoryUsage: 0,
            uptime: 0
        };
    }

    /**
     * Internal logging with level filtering
     */
    private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
        if (!this.shouldLog(level)) return;

        const logMethod = level === 'debug' ? console.log : console[level];
        const timestamp = new Date().toISOString();

        if (data) {
            logMethod(`[StateInspector ${timestamp}] ${message}:`, data);
        } else {
            logMethod(`[StateInspector ${timestamp}] ${message}`);
        }
    }

    /**
     * Check if should log based on log level
     */
    private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
        const levels = ['debug', 'info', 'warn', 'error'];
        const currentLevelIndex = levels.indexOf(this.options.logLevel);
        const messageLevelIndex = levels.indexOf(level);

        return messageLevelIndex >= currentLevelIndex;
    }
}

/**
 * StateInspector factory for easy integration
 */
export class StateInspectorFactory {
    private static instance: StateInspector | null = null;

    /**
     * Get or create StateInspector instance
     */
    static getInstance(options?: StateInspectorOptions): StateInspector {
        if (!StateInspectorFactory.instance) {
            StateInspectorFactory.instance = new StateInspector(options);
        }
        return StateInspectorFactory.instance;
    }

    /**
     * Reset singleton instance
     */
    static reset(): void {
        StateInspectorFactory.instance = null;
    }

    /**
     * Create development-mode inspector with debug settings
     */
    static createDevelopmentInspector(): StateInspector {
        return new StateInspector({
            enabled: true,
            maxHistorySize: 200,
            logLevel: 'debug',
            trackPerformance: true,
            validateState: true,
            consoleOutput: true
        });
    }

    /**
     * Create production-mode inspector with minimal settings
     */
    static createProductionInspector(): StateInspector {
        return new StateInspector({
            enabled: false, // Disabled by default in production
            maxHistorySize: 50,
            logLevel: 'error',
            trackPerformance: false,
            validateState: false,
            consoleOutput: false
        });
    }
}