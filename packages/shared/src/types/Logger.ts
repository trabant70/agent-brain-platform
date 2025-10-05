/**
 * Logger Types and Enums
 * Shared logging interfaces for the Agent Brain Platform
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
