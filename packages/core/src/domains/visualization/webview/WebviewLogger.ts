/**
 * WebviewLogger - Browser-side logging with pathway support
 *
 * Mirrors the extension-side Logger API but uses browser console
 * Supports the same pathway-based filtering for consistent debugging
 *
 * Key differences from extension Logger:
 * - Uses console.log/debug/warn/error instead of VS Code Output
 * - No file output (browser environment)
 * - Can optionally relay logs to extension via postMessage
 */

/**
 * Log levels (mirror extension Logger)
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 4
}

/**
 * Log categories (mirror extension Logger)
 */
export enum LogCategory {
    EXTENSION = 'EXT',
    DATA = 'DAT',
    ORCHESTRATION = 'ORC',
    VISUALIZATION = 'VIZ',
    UI = 'UI',
    PERFORMANCE = 'PERF',
    FILTERING = 'FILT',
    CACHE = 'CACHE',
    GIT = 'GIT',
    GITHUB = 'GITHUB',
    WEBVIEW = 'WV',
    TEST = 'TEST'
}

/**
 * Log pathways (mirror extension Logger)
 */
export enum LogPathway {
    NONE = '',
    DATA_INGESTION = 'INGEST',
    FILTER_APPLY = 'FILTER',
    STATE_PERSIST = 'PERSIST',
    RENDER_PIPELINE = 'RENDER',
    USER_INTERACTION = 'INTERACT',
    WEBVIEW_MESSAGING = 'MESSAGE',
    CONFIG_SYNC = 'CONFIG',
    RANGE_SELECTOR = 'RANGE',
    LEGEND = 'LEGEND'
}

/**
 * Webview Logger Configuration
 */
interface WebviewLoggerConfig {
    level: LogLevel;
    enabledCategories: Set<LogCategory>;
    pathwayMode: 'disabled' | 'filter' | 'exclusive';
    enabledPathways: Set<LogPathway>;
    relayToExtension: boolean;
}

/**
 * Webview Logger - Browser console logging with pathway support
 */
class WebviewLogger {
    private config: WebviewLoggerConfig = {
        level: LogLevel.INFO,
        enabledCategories: new Set(Object.values(LogCategory)),
        pathwayMode: 'disabled',
        enabledPathways: new Set([LogPathway.NONE]),
        relayToExtension: false
    };

    // VSCode API for relaying logs to extension (set externally)
    private vscode: any = null;

    /**
     * Set log level
     */
    setLogLevel(level: LogLevel): void {
        this.config.level = level;
        console.log(`[WebviewLogger] Log level set to ${LogLevel[level]}`);
    }

    /**
     * Enable specific categories
     */
    enableCategories(categories: LogCategory[]): void {
        this.config.enabledCategories = new Set(categories);
        console.log(`[WebviewLogger] Enabled categories:`, categories);
    }

    /**
     * Set pathway mode
     */
    setPathwayMode(mode: 'disabled' | 'filter' | 'exclusive'): void {
        this.config.pathwayMode = mode;
        console.log(`[WebviewLogger] Pathway mode set to ${mode}`);
    }

    /**
     * Enable specific pathways
     */
    enablePathways(pathways: LogPathway[]): void {
        this.config.enabledPathways = new Set(pathways);
        console.log(`[WebviewLogger] Enabled pathways:`, pathways);
    }

    /**
     * Set VSCode API for relaying logs
     */
    setVSCodeAPI(vscode: any): void {
        this.vscode = vscode;
    }

    /**
     * Enable/disable relaying logs to extension
     */
    setRelayToExtension(enabled: boolean): void {
        this.config.relayToExtension = enabled;
    }

    /**
     * Check if log should be emitted
     */
    private shouldLog(level: LogLevel, category: LogCategory, pathway: LogPathway): boolean {
        // Level check
        if (level < this.config.level) {
            return false;
        }

        // Category check
        if (!this.config.enabledCategories.has(category)) {
            return false;
        }

        // Pathway check
        if (this.config.pathwayMode === 'disabled') {
            return true;
        }

        if (this.config.pathwayMode === 'filter' || this.config.pathwayMode === 'exclusive') {
            return this.config.enabledPathways.has(pathway);
        }

        return true;
    }

    /**
     * Format log message
     */
    private formatMessage(
        level: LogLevel,
        category: LogCategory,
        message: string,
        context?: string,
        pathway?: LogPathway
    ): string {
        const levelStr = LogLevel[level].padEnd(5);
        const pathwayStr = (pathway && pathway.length > 0) ? ` [${pathway}]` : '';
        const contextStr = context ? ` [${context}]` : '';
        return `[${levelStr}] [${category}]${pathwayStr}${contextStr} ${message}`;
    }

    /**
     * Emit log to console and optionally relay to extension
     */
    private emit(
        level: LogLevel,
        category: LogCategory,
        message: string,
        context?: string,
        data?: any,
        pathway: LogPathway = LogPathway.NONE
    ): void {
        if (!this.shouldLog(level, category, pathway)) {
            return;
        }

        const formattedMessage = this.formatMessage(level, category, message, context, pathway);

        // Console output with appropriate method
        switch (level) {
            case LogLevel.DEBUG:
                if (data) {
                    console.debug(formattedMessage, data);
                } else {
                    console.debug(formattedMessage);
                }
                break;
            case LogLevel.INFO:
                if (data) {
                    console.log(formattedMessage, data);
                } else {
                    console.log(formattedMessage);
                }
                break;
            case LogLevel.WARN:
                if (data) {
                    console.warn(formattedMessage, data);
                } else {
                    console.warn(formattedMessage);
                }
                break;
            case LogLevel.ERROR:
                if (data) {
                    console.error(formattedMessage, data);
                } else {
                    console.error(formattedMessage);
                }
                break;
        }

        // Relay to extension if enabled
        if (this.config.relayToExtension && this.vscode) {
            try {
                this.vscode.postMessage({
                    type: 'webviewLog',
                    level: LogLevel[level],
                    category,
                    pathway,
                    message,
                    context,
                    data
                });
            } catch (error) {
                console.error('[WebviewLogger] Failed to relay log to extension:', error);
            }
        }
    }

    /**
     * Debug log
     */
    debug(
        category: LogCategory,
        message: string,
        context?: string,
        data?: any,
        pathway: LogPathway = LogPathway.NONE
    ): void {
        this.emit(LogLevel.DEBUG, category, message, context, data, pathway);
    }

    /**
     * Info log
     */
    info(
        category: LogCategory,
        message: string,
        context?: string,
        data?: any,
        pathway: LogPathway = LogPathway.NONE
    ): void {
        this.emit(LogLevel.INFO, category, message, context, data, pathway);
    }

    /**
     * Warning log
     */
    warn(
        category: LogCategory,
        message: string,
        context?: string,
        data?: any,
        pathway: LogPathway = LogPathway.NONE
    ): void {
        this.emit(LogLevel.WARN, category, message, context, data, pathway);
    }

    /**
     * Error log
     */
    error(
        category: LogCategory,
        message: string,
        context?: string,
        data?: any,
        pathway: LogPathway = LogPathway.NONE
    ): void {
        this.emit(LogLevel.ERROR, category, message, context, data, pathway);
    }

    /**
     * Get current configuration (for debugging)
     */
    getConfig(): WebviewLoggerConfig {
        return {
            ...this.config,
            enabledCategories: new Set(this.config.enabledCategories),
            enabledPathways: new Set(this.config.enabledPathways)
        };
    }
}

/**
 * Singleton instance
 */
export const webviewLogger = new WebviewLogger();

/**
 * Create context logger helper
 */
export function createWebviewContextLogger(defaultCategory: LogCategory) {
    return {
        debug: (category: LogCategory, message: string, context?: string, data?: any, pathway?: LogPathway) =>
            webviewLogger.debug(category || defaultCategory, message, context, data, pathway),
        info: (category: LogCategory, message: string, context?: string, data?: any, pathway?: LogPathway) =>
            webviewLogger.info(category || defaultCategory, message, context, data, pathway),
        warn: (category: LogCategory, message: string, context?: string, data?: any, pathway?: LogPathway) =>
            webviewLogger.warn(category || defaultCategory, message, context, data, pathway),
        error: (category: LogCategory, message: string, context?: string, data?: any, pathway?: LogPathway) =>
            webviewLogger.error(category || defaultCategory, message, context, data, pathway)
    };
}

/**
 * Pathway-specific loggers (convenience helpers)
 */
export const PathwayLoggers = {
    dataIngestion: {
        debug: (category: LogCategory, message: string, context?: string, data?: any) =>
            webviewLogger.debug(category, message, context, data, LogPathway.DATA_INGESTION),
        info: (category: LogCategory, message: string, context?: string, data?: any) =>
            webviewLogger.info(category, message, context, data, LogPathway.DATA_INGESTION)
    },
    filterApply: {
        debug: (category: LogCategory, message: string, context?: string, data?: any) =>
            webviewLogger.debug(category, message, context, data, LogPathway.FILTER_APPLY),
        info: (category: LogCategory, message: string, context?: string, data?: any) =>
            webviewLogger.info(category, message, context, data, LogPathway.FILTER_APPLY)
    },
    renderPipeline: {
        debug: (category: LogCategory, message: string, context?: string, data?: any) =>
            webviewLogger.debug(category, message, context, data, LogPathway.RENDER_PIPELINE),
        info: (category: LogCategory, message: string, context?: string, data?: any) =>
            webviewLogger.info(category, message, context, data, LogPathway.RENDER_PIPELINE)
    },
    userInteraction: {
        debug: (category: LogCategory, message: string, context?: string, data?: any) =>
            webviewLogger.debug(category, message, context, data, LogPathway.USER_INTERACTION),
        info: (category: LogCategory, message: string, context?: string, data?: any) =>
            webviewLogger.info(category, message, context, data, LogPathway.USER_INTERACTION)
    },
    webviewMessaging: {
        debug: (category: LogCategory, message: string, context?: string, data?: any) =>
            webviewLogger.debug(category, message, context, data, LogPathway.WEBVIEW_MESSAGING),
        info: (category: LogCategory, message: string, context?: string, data?: any) =>
            webviewLogger.info(category, message, context, data, LogPathway.WEBVIEW_MESSAGING)
    },
    rangeSelector: {
        debug: (category: LogCategory, message: string, context?: string, data?: any) =>
            webviewLogger.debug(category, message, context, data, LogPathway.RANGE_SELECTOR),
        info: (category: LogCategory, message: string, context?: string, data?: any) =>
            webviewLogger.info(category, message, context, data, LogPathway.RANGE_SELECTOR)
    }
};

// Expose globally for debugging in browser console
if (typeof window !== 'undefined') {
    (window as any).webviewLogger = webviewLogger;
    (window as any).LogLevel = LogLevel;
    (window as any).LogCategory = LogCategory;
    (window as any).LogPathway = LogPathway;
}
