/**
 * Centralized Logging System for Repository Timeline Extension
 *
 * Provides categorized logging with severity levels for clean console output
 * and detailed debugging when needed.
 */

export enum LogLevel {
    ERROR = 0,   // Critical errors that break functionality
    WARN = 1,    // Warnings about potential issues
    INFO = 2,    // General information about operations
    DEBUG = 3,   // Detailed debugging information
    TRACE = 4    // Very detailed trace information
}

export enum LogCategory {
    EXTENSION = 'EXT',       // Extension lifecycle and activation
    DATA = 'DAT',           // Data providers and fetching
    ORCHESTRATION = 'ORC',  // Data orchestration and state management
    VISUALIZATION = 'VIZ',  // Timeline rendering and visualization
    UI = 'UI',              // User interface and interactions
    PERFORMANCE = 'PERF',   // Performance monitoring
    FILTERING = 'FILT',     // Data filtering operations
    CACHE = 'CACHE',        // Caching operations
    GIT = 'GIT',            // Git operations
    GITHUB = 'GITHUB',      // GitHub API operations
    WEBVIEW = 'WV',         // Webview communication
    TEST = 'TEST'           // Testing and development
}

/**
 * Log Pathways - End-to-end data flow chains for focused debugging
 * When enabled, ONLY logs with matching pathway are emitted
 */
export enum LogPathway {
    NONE = '',                      // No specific pathway (always logged if category/level match)
    DATA_INGESTION = 'INGEST',      // Provider → Orchestrator → Webview → Render
    FILTER_APPLY = 'FILTER',        // Filter UI → State → Data refresh → Re-render
    STATE_PERSIST = 'PERSIST',      // State save/restore across sessions
    RENDER_PIPELINE = 'RENDER',     // Data processing → D3 rendering → DOM updates
    USER_INTERACTION = 'INTERACT',  // User clicks/hovers → Event handlers → UI updates
    WEBVIEW_MESSAGING = 'MESSAGE',  // Extension ↔ Webview postMessage communication
    CONFIG_SYNC = 'CONFIG',         // Configuration changes → State → UI updates
    RANGE_SELECTOR = 'RANGE'        // Time slider/brush interactions → Viewport updates
}

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    category: LogCategory;
    message: string;
    context?: string;
    data?: any;
    pathway?: LogPathway;
}

class Logger {
    private static instance: Logger;
    private currentLogLevel: LogLevel = LogLevel.INFO;
    private enabledCategories: Set<LogCategory> = new Set(Object.values(LogCategory));
    private enabledPathways: Set<LogPathway> = new Set([LogPathway.NONE]); // Default: only logs with no pathway
    private pathwayMode: 'disabled' | 'filter' | 'exclusive' = 'disabled'; // How pathways are enforced
    private logHistory: LogEntry[] = [];
    private maxHistorySize = 1000;
    private testMode: boolean = false;  // Enable test mode for LogCapture integration
    private testModeCallback?: (level: LogLevel, category: LogCategory, message: string, context?: string, data?: any, pathway?: LogPathway) => void;

    private constructor() {
        // Initialize from configuration or environment
        this.initializeFromConfig();
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    private initializeFromConfig(): void {
        // Check VS Code configuration
        try {
            const vscode = require('vscode');
            const config = vscode.workspace.getConfiguration('repoTimeline');

            const configLevel = config.get('logging.level', 'info') as string;
            this.currentLogLevel = this.parseLogLevel(configLevel);

            const enabledCategories = config.get('logging.categories', []) as string[];
            if (enabledCategories.length > 0) {
                this.enabledCategories = new Set(enabledCategories as LogCategory[]);
            }

            // Pathway configuration
            const pathwayMode = config.get('logging.pathwayMode', 'disabled') as 'disabled' | 'filter' | 'exclusive';
            this.pathwayMode = pathwayMode;

            const enabledPathways = config.get('logging.pathways', []) as string[];
            if (enabledPathways.length > 0) {
                this.enabledPathways = new Set(enabledPathways as LogPathway[]);
                // Always include NONE pathway to allow non-pathway logs
                this.enabledPathways.add(LogPathway.NONE);
            }
        } catch (error) {
            // Fallback for non-VS Code environments (tests, etc.)
            const envLevel = process.env.REPO_TIMELINE_LOG_LEVEL || 'info';
            this.currentLogLevel = this.parseLogLevel(envLevel);

            // Check for pathway env vars
            const envPathways = process.env.REPO_TIMELINE_LOG_PATHWAYS;
            if (envPathways) {
                this.pathwayMode = 'exclusive';
                this.enabledPathways = new Set(envPathways.split(',') as LogPathway[]);
                this.enabledPathways.add(LogPathway.NONE);
            }
        }
    }

    private parseLogLevel(level: string): LogLevel {
        switch (level.toLowerCase()) {
            case 'error': return LogLevel.ERROR;
            case 'warn': return LogLevel.WARN;
            case 'info': return LogLevel.INFO;
            case 'debug': return LogLevel.DEBUG;
            case 'trace': return LogLevel.TRACE;
            default: return LogLevel.INFO;
        }
    }

    public setLogLevel(level: LogLevel): void {
        this.currentLogLevel = level;
    }

    public enableCategory(category: LogCategory): void {
        this.enabledCategories.add(category);
    }

    public disableCategory(category: LogCategory): void {
        this.enabledCategories.delete(category);
    }

    public setEnabledCategories(categories: LogCategory[]): void {
        this.enabledCategories = new Set(categories);
    }

    public enablePathway(pathway: LogPathway): void {
        this.enabledPathways.add(pathway);
    }

    public disablePathway(pathway: LogPathway): void {
        this.enabledPathways.delete(pathway);
    }

    public setEnabledPathways(pathways: LogPathway[]): void {
        this.enabledPathways = new Set(pathways);
        this.enabledPathways.add(LogPathway.NONE); // Always allow non-pathway logs
    }

    public setPathwayMode(mode: 'disabled' | 'filter' | 'exclusive'): void {
        this.pathwayMode = mode;
    }

    /**
     * Enable test mode - all logs will be sent to callback for capture
     */
    public enableTestMode(callback: (level: LogLevel, category: LogCategory, message: string, context?: string, data?: any, pathway?: LogPathway) => void): void {
        this.testMode = true;
        this.testModeCallback = callback;
    }

    /**
     * Disable test mode
     */
    public disableTestMode(): void {
        this.testMode = false;
        this.testModeCallback = undefined;
    }

    /**
     * Check if test mode is enabled
     */
    public isTestMode(): boolean {
        return this.testMode;
    }

    private shouldLog(level: LogLevel, category: LogCategory, pathway: LogPathway = LogPathway.NONE): boolean {
        // Level and category checks (existing logic)
        if (level > this.currentLogLevel) return false;
        if (!this.enabledCategories.has(category)) return false;

        // Pathway checks (new logic)
        if (this.pathwayMode === 'disabled') {
            // Pathways are disabled, log everything that passes level/category
            return true;
        }

        if (this.pathwayMode === 'filter' || this.pathwayMode === 'exclusive') {
            // Only log if pathway is enabled
            return this.enabledPathways.has(pathway);
        }

        return true;
    }

    private formatMessage(level: LogLevel, category: LogCategory, message: string, context?: string, pathway?: LogPathway): string {
        const timestamp = new Date().toISOString().substr(11, 12); // HH:mm:ss.SSS
        const levelStr = LogLevel[level].padEnd(5);
        const categoryStr = category.padEnd(6);
        // Only show pathway if it's defined and not the empty NONE value
        const pathwayStr = (pathway && pathway.length > 0) ? ` [${pathway}]` : '';
        const contextStr = context ? ` [${context}]` : '';

        return `${timestamp} ${levelStr} ${categoryStr}${pathwayStr}${contextStr}: ${message}`;
    }

    private addToHistory(entry: LogEntry): void {
        this.logHistory.push(entry);
        if (this.logHistory.length > this.maxHistorySize) {
            this.logHistory.shift();
        }
    }

    private log(level: LogLevel, category: LogCategory, message: string, context?: string, data?: any, pathway: LogPathway = LogPathway.NONE): void {
        // In test mode, always send to callback regardless of filters
        if (this.testMode && this.testModeCallback) {
            this.testModeCallback(level, category, message, context, data, pathway);
        }

        // Early exit if log should not be emitted
        if (!this.shouldLog(level, category, pathway)) {
            return;
        }

        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            category,
            message,
            context,
            data,
            pathway
        };

        this.addToHistory(entry);

        const formattedMessage = this.formatMessage(level, category, message, context, pathway);

        // Output to appropriate console method based on level (skip in test mode to avoid noise)
        if (!this.testMode) {
            switch (level) {
                case LogLevel.ERROR:
                    console.error(formattedMessage, data ? data : '');
                    break;
                case LogLevel.WARN:
                    console.warn(formattedMessage, data ? data : '');
                    break;
                case LogLevel.INFO:
                    console.info(formattedMessage, data ? data : '');
                    break;
                case LogLevel.DEBUG:
                case LogLevel.TRACE:
                    console.log(formattedMessage, data ? data : '');
                    break;
            }
        }
    }

    // Public logging methods
    public error(category: LogCategory, message: string, context?: string, data?: any, pathway: LogPathway = LogPathway.NONE): void {
        this.log(LogLevel.ERROR, category, message, context, data, pathway);
    }

    public warn(category: LogCategory, message: string, context?: string, data?: any, pathway: LogPathway = LogPathway.NONE): void {
        this.log(LogLevel.WARN, category, message, context, data, pathway);
    }

    public info(category: LogCategory, message: string, context?: string, data?: any, pathway: LogPathway = LogPathway.NONE): void {
        this.log(LogLevel.INFO, category, message, context, data, pathway);
    }

    public debug(category: LogCategory, message: string, context?: string, data?: any, pathway: LogPathway = LogPathway.NONE): void {
        this.log(LogLevel.DEBUG, category, message, context, data, pathway);
    }

    public trace(category: LogCategory, message: string, context?: string, data?: any, pathway: LogPathway = LogPathway.NONE): void {
        this.log(LogLevel.TRACE, category, message, context, data, pathway);
    }

    // Utility methods for performance logging
    public startTimer(category: LogCategory, operation: string, context?: string): () => void {
        const startTime = performance.now();
        this.trace(category, `Starting ${operation}`, context);

        return () => {
            const duration = performance.now() - startTime;
            this.debug(category, `Completed ${operation} in ${duration.toFixed(2)}ms`, context);
        };
    }

    public async measureAsync<T>(
        category: LogCategory,
        operation: string,
        fn: () => Promise<T>,
        context?: string
    ): Promise<T> {
        const timer = this.startTimer(category, operation, context);
        try {
            const result = await fn();
            timer();
            return result;
        } catch (error) {
            timer();
            this.error(category, `Failed ${operation}: ${error}`, context, error);
            throw error;
        }
    }

    public measure<T>(
        category: LogCategory,
        operation: string,
        fn: () => T,
        context?: string
    ): T {
        const timer = this.startTimer(category, operation, context);
        try {
            const result = fn();
            timer();
            return result;
        } catch (error) {
            timer();
            this.error(category, `Failed ${operation}: ${error}`, context, error);
            throw error;
        }
    }

    // Log management
    public getLogHistory(): LogEntry[] {
        return [...this.logHistory];
    }

    public clearHistory(): void {
        this.logHistory = [];
    }

    public exportLogs(): string {
        return this.logHistory
            .map(entry => this.formatMessage(entry.level, entry.category, entry.message, entry.context))
            .join('\n');
    }

    // Development helpers
    public logPerformanceMetrics(category: LogCategory, metrics: Record<string, number>, context?: string): void {
        if (this.shouldLog(LogLevel.DEBUG, category)) {
            const formattedMetrics = Object.entries(metrics)
                .map(([key, value]) => `${key}: ${value.toFixed(2)}ms`)
                .join(', ');
            this.debug(category, `Performance metrics: ${formattedMetrics}`, context);
        }
    }

    public logState(category: LogCategory, stateName: string, state: any, context?: string): void {
        if (this.shouldLog(LogLevel.TRACE, category)) {
            this.trace(category, `State ${stateName}`, context, JSON.stringify(state, null, 2));
        }
    }

    public logDataFlow(category: LogCategory, operation: string, input: any, output: any, context?: string): void {
        if (this.shouldLog(LogLevel.TRACE, category)) {
            this.trace(category, `${operation} - Input:`, context, input);
            this.trace(category, `${operation} - Output:`, context, output);
        }
    }
}

// Singleton instance
export const logger = Logger.getInstance();

// Convenience functions for common patterns
export const createContextLogger = (baseContext: string) => ({
    error: (category: LogCategory, message: string, subContext?: string, data?: any, pathway?: LogPathway) =>
        logger.error(category, message, subContext ? `${baseContext}.${subContext}` : baseContext, data, pathway),
    warn: (category: LogCategory, message: string, subContext?: string, data?: any, pathway?: LogPathway) =>
        logger.warn(category, message, subContext ? `${baseContext}.${subContext}` : baseContext, data, pathway),
    info: (category: LogCategory, message: string, subContext?: string, data?: any, pathway?: LogPathway) =>
        logger.info(category, message, subContext ? `${baseContext}.${subContext}` : baseContext, data, pathway),
    debug: (category: LogCategory, message: string, subContext?: string, data?: any, pathway?: LogPathway) =>
        logger.debug(category, message, subContext ? `${baseContext}.${subContext}` : baseContext, data, pathway),
    trace: (category: LogCategory, message: string, subContext?: string, data?: any, pathway?: LogPathway) =>
        logger.trace(category, message, subContext ? `${baseContext}.${subContext}` : baseContext, data, pathway),
    startTimer: (category: LogCategory, operation: string, subContext?: string) =>
        logger.startTimer(category, operation, subContext ? `${baseContext}.${subContext}` : baseContext)
});

/**
 * Pathway-specific loggers for focused debugging
 * Use these when you want to trace a specific data flow chain
 */
export const PathwayLoggers = {
    dataIngestion: {
        trace: (category: LogCategory, message: string, context?: string, data?: any) =>
            logger.trace(category, message, context, data, LogPathway.DATA_INGESTION),
        debug: (category: LogCategory, message: string, context?: string, data?: any) =>
            logger.debug(category, message, context, data, LogPathway.DATA_INGESTION),
        info: (category: LogCategory, message: string, context?: string, data?: any) =>
            logger.info(category, message, context, data, LogPathway.DATA_INGESTION)
    },
    filterApply: {
        trace: (category: LogCategory, message: string, context?: string, data?: any) =>
            logger.trace(category, message, context, data, LogPathway.FILTER_APPLY),
        debug: (category: LogCategory, message: string, context?: string, data?: any) =>
            logger.debug(category, message, context, data, LogPathway.FILTER_APPLY),
        info: (category: LogCategory, message: string, context?: string, data?: any) =>
            logger.info(category, message, context, data, LogPathway.FILTER_APPLY)
    },
    statePersist: {
        trace: (category: LogCategory, message: string, context?: string, data?: any) =>
            logger.trace(category, message, context, data, LogPathway.STATE_PERSIST),
        debug: (category: LogCategory, message: string, context?: string, data?: any) =>
            logger.debug(category, message, context, data, LogPathway.STATE_PERSIST),
        info: (category: LogCategory, message: string, context?: string, data?: any) =>
            logger.info(category, message, context, data, LogPathway.STATE_PERSIST)
    },
    renderPipeline: {
        trace: (category: LogCategory, message: string, context?: string, data?: any) =>
            logger.trace(category, message, context, data, LogPathway.RENDER_PIPELINE),
        debug: (category: LogCategory, message: string, context?: string, data?: any) =>
            logger.debug(category, message, context, data, LogPathway.RENDER_PIPELINE),
        info: (category: LogCategory, message: string, context?: string, data?: any) =>
            logger.info(category, message, context, data, LogPathway.RENDER_PIPELINE)
    },
    userInteraction: {
        trace: (category: LogCategory, message: string, context?: string, data?: any) =>
            logger.trace(category, message, context, data, LogPathway.USER_INTERACTION),
        debug: (category: LogCategory, message: string, context?: string, data?: any) =>
            logger.debug(category, message, context, data, LogPathway.USER_INTERACTION),
        info: (category: LogCategory, message: string, context?: string, data?: any) =>
            logger.info(category, message, context, data, LogPathway.USER_INTERACTION)
    },
    webviewMessaging: {
        trace: (category: LogCategory, message: string, context?: string, data?: any) =>
            logger.trace(category, message, context, data, LogPathway.WEBVIEW_MESSAGING),
        debug: (category: LogCategory, message: string, context?: string, data?: any) =>
            logger.debug(category, message, context, data, LogPathway.WEBVIEW_MESSAGING),
        info: (category: LogCategory, message: string, context?: string, data?: any) =>
            logger.info(category, message, context, data, LogPathway.WEBVIEW_MESSAGING)
    },
    configSync: {
        trace: (category: LogCategory, message: string, context?: string, data?: any) =>
            logger.trace(category, message, context, data, LogPathway.CONFIG_SYNC),
        debug: (category: LogCategory, message: string, context?: string, data?: any) =>
            logger.debug(category, message, context, data, LogPathway.CONFIG_SYNC),
        info: (category: LogCategory, message: string, context?: string, data?: any) =>
            logger.info(category, message, context, data, LogPathway.CONFIG_SYNC)
    },
    rangeSelector: {
        trace: (category: LogCategory, message: string, context?: string, data?: any) =>
            logger.trace(category, message, context, data, LogPathway.RANGE_SELECTOR),
        debug: (category: LogCategory, message: string, context?: string, data?: any) =>
            logger.debug(category, message, context, data, LogPathway.RANGE_SELECTOR),
        info: (category: LogCategory, message: string, context?: string, data?: any) =>
            logger.info(category, message, context, data, LogPathway.RANGE_SELECTOR)
    }
};

// Export types and enums
export { Logger };