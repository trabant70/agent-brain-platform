/**
 * VSCode API Mock for Testing
 * Provides minimal VSCode API implementation for component tests
 */

export class Uri {
    static file(path: string): Uri {
        return new Uri(path);
    }

    constructor(public fsPath: string) {}

    toString(): string {
        return this.fsPath;
    }
}

export class EventEmitter<T> {
    private listeners: Array<(e: T) => void> = [];

    event = (listener: (e: T) => void) => {
        this.listeners.push(listener);
        return { dispose: () => {} };
    };

    fire(data: T): void {
        this.listeners.forEach(listener => listener(data));
    }

    dispose(): void {
        this.listeners = [];
    }
}

export const workspace = {
    workspaceFolders: [] as any[],

    getConfiguration: (section?: string) => ({
        get: <T>(key: string, defaultValue?: T): T | undefined => {
            return defaultValue;
        },
        update: async () => {},
        has: () => false,
        inspect: () => undefined
    }),

    onDidChangeConfiguration: new EventEmitter<any>().event,

    fs: {
        readFile: async (uri: Uri) => Buffer.from(''),
        writeFile: async () => {},
        stat: async () => ({ type: 1, ctime: 0, mtime: 0, size: 0 })
    }
};

export const window = {
    activeTextEditor: undefined as any,

    showInformationMessage: async (message: string, ...items: string[]) => {
        console.log('[Mock] Info:', message);
        return items[0];
    },

    showErrorMessage: async (message: string, ...items: string[]) => {
        console.error('[Mock] Error:', message);
        return items[0];
    },

    showWarningMessage: async (message: string, ...items: string[]) => {
        console.warn('[Mock] Warning:', message);
        return items[0];
    },

    createOutputChannel: (name: string) => ({
        append: () => {},
        appendLine: () => {},
        clear: () => {},
        show: () => {},
        hide: () => {},
        dispose: () => {}
    }),

    createWebviewPanel: () => ({
        webview: {
            html: '',
            onDidReceiveMessage: new EventEmitter<any>().event,
            postMessage: async () => true
        },
        onDidDispose: new EventEmitter<void>().event,
        dispose: () => {}
    })
};

export const commands = {
    registerCommand: (command: string, callback: (...args: any[]) => any) => {
        return { dispose: () => {} };
    },

    executeCommand: async (command: string, ...args: any[]) => {
        console.log('[Mock] Execute command:', command);
        return undefined;
    }
};

export const ExtensionContext = {
    subscriptions: [] as any[],
    extensionPath: '/mock/extension/path',
    globalState: {
        get: () => undefined,
        update: async () => {}
    },
    workspaceState: {
        get: () => undefined,
        update: async () => {}
    }
};

export enum ConfigurationTarget {
    Global = 1,
    Workspace = 2,
    WorkspaceFolder = 3
}

export enum FileType {
    Unknown = 0,
    File = 1,
    Directory = 2,
    SymbolicLink = 64
}

// Export all as named exports AND as default for different import styles
module.exports = {
    Uri,
    EventEmitter,
    workspace,
    window,
    commands,
    ExtensionContext,
    ConfigurationTarget,
    FileType
};
