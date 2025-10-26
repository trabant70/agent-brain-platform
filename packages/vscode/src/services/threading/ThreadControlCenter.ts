/**
 * ThreadControlCenter - VSCode Integration for Threading System
 *
 * Manages:
 * - Status bar item for threading status
 * - Commands for threading operations
 * - File I/O for threading logs
 * - Communication with webview for threading UI
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ThreadConfig, ThreadLogger, ThreadSession, LogEntry } from '@agent-brain/core/domains/threading';
import { logger, LogCategory } from '@agent-brain/core/infrastructure/logging/Logger';

export class ThreadControlCenter {
  private statusBarItem: vscode.StatusBarItem;
  private workspaceRoot: string;
  private logsPath: string;
  private currentLogger: ThreadLogger | null = null;
  private currentSession: ThreadSession | null = null;
  private webviewMessageCallback: ((message: any) => void) | null = null;

  constructor(workspaceRoot: string, context: vscode.ExtensionContext) {
    this.workspaceRoot = workspaceRoot;
    this.logsPath = path.join(workspaceRoot, '.agent-brain', 'threading-logs');

    // Create status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'agentBrain.threading.toggle';
    this.updateStatusBar(false, 'disabled');
    this.statusBarItem.show();

    // Register for cleanup
    context.subscriptions.push(this.statusBarItem);

    logger.info(LogCategory.EXTENSION, 'ThreadControlCenter initialized', 'constructor', {
      workspaceRoot,
      logsPath: this.logsPath
    });
  }

  /**
   * Set the webview message callback for sending messages to the webview
   */
  setWebviewMessageCallback(callback: (message: any) => void): void {
    this.webviewMessageCallback = callback;
    logger.debug(LogCategory.EXTENSION, 'Webview message callback set', 'setWebviewMessageCallback');
  }

  /**
   * Send message to webview
   */
  private sendToWebview(message: any): void {
    if (this.webviewMessageCallback) {
      this.webviewMessageCallback(message);
    } else {
      logger.warn(LogCategory.EXTENSION, 'No webview callback available', 'sendToWebview', { message });
    }
  }

  /**
   * Update status bar
   */
  private updateStatusBar(enabled: boolean, mode: string): void {
    if (enabled) {
      this.statusBarItem.text = `$(debug-alt) Threading: ${mode}`;
      this.statusBarItem.backgroundColor = undefined;
      this.statusBarItem.tooltip = `Threading system is ${mode}. Click to toggle.`;
    } else {
      this.statusBarItem.text = '$(debug-alt-small) Threading: Off';
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      this.statusBarItem.tooltip = 'Threading system is disabled. Click to enable.';
    }
  }

  /**
   * Get threading state
   */
  getState(): any {
    return {
      enabled: this.currentLogger !== null,
      mode: this.currentSession?.mode || 'disabled',
      sessionActive: this.currentSession !== null,
      session: this.currentSession,
      threads: [] // TODO: Load from config
    };
  }

  /**
   * Toggle threading system
   */
  async toggleThreading(): Promise<void> {
    const enabled = this.currentLogger !== null;

    if (enabled) {
      await this.disableThreading();
    } else {
      await this.enableThreading();
    }

    // Notify webview
    this.sendToWebview({
      type: 'threading:state',
      payload: this.getState()
    });
  }

  /**
   * Enable threading system
   */
  async enableThreading(): Promise<void> {
    try {
      // Ensure logs directory exists
      await this.ensureLogsDirectory();

      // Create logger
      this.currentLogger = new ThreadLogger();

      // Update UI
      this.updateStatusBar(true, 'development');

      logger.info(LogCategory.EXTENSION, 'Threading system enabled', 'enableThreading');

      vscode.window.showInformationMessage('Threading system enabled');
    } catch (error) {
      logger.error(LogCategory.EXTENSION, 'Failed to enable threading', 'enableThreading', error);
      vscode.window.showErrorMessage(`Failed to enable threading: ${error}`);
    }
  }

  /**
   * Disable threading system
   */
  async disableThreading(): Promise<void> {
    try {
      // End current session if active
      if (this.currentSession) {
        await this.endSession();
      }

      // Clean up logger
      if (this.currentLogger) {
        await this.currentLogger.endSession();
        this.currentLogger = null;
      }

      // Update UI
      this.updateStatusBar(false, 'disabled');

      logger.info(LogCategory.EXTENSION, 'Threading system disabled', 'disableThreading');

      vscode.window.showInformationMessage('Threading system disabled');
    } catch (error) {
      logger.error(LogCategory.EXTENSION, 'Failed to disable threading', 'disableThreading', error);
      vscode.window.showErrorMessage(`Failed to disable threading: ${error}`);
    }
  }

  /**
   * Start a new threading session
   */
  async startSession(mode: 'development' | 'debugging' | 'learning' = 'development'): Promise<void> {
    if (!this.currentLogger) {
      vscode.window.showWarningMessage('Please enable threading first');
      return;
    }

    if (this.currentSession) {
      vscode.window.showWarningMessage('A session is already active. End it first.');
      return;
    }

    try {
      // Create session
      const sessionId = `session-${Date.now()}`;
      const session: ThreadSession = {
        id: sessionId,
        startTime: Date.now(),
        mode,
        metadata: {
          workspaceRoot: this.workspaceRoot,
          vscodeVersion: vscode.version
        }
      };

      this.currentSession = session;
      this.currentLogger.startSession(session);

      // Create session log file
      const logFilePath = await this.createSessionLogFile(session);

      // Set up file writer
      const fileWriter = {
        writeLines: async (lines: string[]) => {
          await fs.promises.appendFile(logFilePath, lines.join('\n') + '\n', 'utf-8');
        },
        close: async () => {
          // File is auto-closed
        }
      };

      this.currentLogger.setFileWriter(fileWriter);

      // Update status bar
      this.updateStatusBar(true, mode);

      // Notify webview
      this.sendToWebview({
        type: 'threading:session-started',
        payload: { session }
      });

      logger.info(LogCategory.EXTENSION, 'Threading session started', 'startSession', {
        sessionId,
        mode,
        logFile: logFilePath
      });

      vscode.window.showInformationMessage(`Threading session started: ${mode} mode`);
    } catch (error) {
      logger.error(LogCategory.EXTENSION, 'Failed to start session', 'startSession', error);
      vscode.window.showErrorMessage(`Failed to start session: ${error}`);
    }
  }

  /**
   * End current threading session
   */
  async endSession(): Promise<void> {
    if (!this.currentSession) {
      vscode.window.showWarningMessage('No active session to end');
      return;
    }

    try {
      const sessionId = this.currentSession.id;

      // End session in logger
      if (this.currentLogger) {
        await this.currentLogger.endSession();
      }

      // Notify webview
      this.sendToWebview({
        type: 'threading:session-ended',
        payload: { sessionId }
      });

      this.currentSession = null;

      logger.info(LogCategory.EXTENSION, 'Threading session ended', 'endSession', { sessionId });

      vscode.window.showInformationMessage('Threading session ended');
    } catch (error) {
      logger.error(LogCategory.EXTENSION, 'Failed to end session', 'endSession', error);
      vscode.window.showErrorMessage(`Failed to end session: ${error}`);
    }
  }

  /**
   * Toggle a specific thread
   */
  async toggleThread(threadName: string): Promise<void> {
    // TODO: Implement thread toggling with ThreadConfigManager
    logger.info(LogCategory.EXTENSION, 'Toggle thread requested', 'toggleThread', { threadName });

    // For now, just notify webview
    this.sendToWebview({
      type: 'threading:thread-toggled',
      payload: { threadName }
    });
  }

  /**
   * Change threading mode
   */
  async changeMode(mode: 'development' | 'debugging' | 'learning'): Promise<void> {
    if (this.currentSession) {
      // Can't change mode during active session
      vscode.window.showWarningMessage('Cannot change mode during active session. End session first.');
      return;
    }

    // Update status bar
    if (this.currentLogger) {
      this.updateStatusBar(true, mode);
    }

    // Notify webview
    this.sendToWebview({
      type: 'threading:mode-changed',
      payload: { mode }
    });

    logger.info(LogCategory.EXTENSION, 'Threading mode changed', 'changeMode', { mode });
  }

  /**
   * Load threading logs from file
   */
  async loadLogs(sessionId?: string): Promise<LogEntry[]> {
    try {
      let logFile: string;

      if (sessionId) {
        // Load specific session
        logFile = path.join(this.logsPath, `${sessionId}.jsonl`);
      } else {
        // Load latest session
        const files = await fs.promises.readdir(this.logsPath);
        const jsonlFiles = files.filter(f => f.endsWith('.jsonl')).sort().reverse();

        if (jsonlFiles.length === 0) {
          return [];
        }

        logFile = path.join(this.logsPath, jsonlFiles[0]);
      }

      // Read and parse JSONL
      const content = await fs.promises.readFile(logFile, 'utf-8');
      const entries = ThreadLogger.parseJSONL(content);

      logger.debug(LogCategory.EXTENSION, 'Loaded threading logs', 'loadLogs', {
        file: logFile,
        entryCount: entries.length
      });

      return entries;
    } catch (error) {
      logger.error(LogCategory.EXTENSION, 'Failed to load logs', 'loadLogs', error);
      return [];
    }
  }

  /**
   * List all threading sessions
   */
  async listSessions(): Promise<string[]> {
    try {
      await this.ensureLogsDirectory();
      const files = await fs.promises.readdir(this.logsPath);
      const sessions = files
        .filter(f => f.endsWith('.jsonl'))
        .map(f => f.replace('.jsonl', ''))
        .sort()
        .reverse();

      return sessions;
    } catch (error) {
      logger.error(LogCategory.EXTENSION, 'Failed to list sessions', 'listSessions', error);
      return [];
    }
  }

  /**
   * Ensure logs directory exists
   */
  private async ensureLogsDirectory(): Promise<void> {
    try {
      await fs.promises.mkdir(this.logsPath, { recursive: true });
    } catch (error) {
      // Ignore if already exists
      if ((error as any).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Create session log file
   */
  private async createSessionLogFile(session: ThreadSession): Promise<string> {
    await this.ensureLogsDirectory();
    const fileName = `${session.id}.jsonl`;
    const filePath = path.join(this.logsPath, fileName);
    return filePath;
  }

  /**
   * Handle message from webview
   */
  async handleWebviewMessage(message: any): Promise<void> {
    try {
      switch (message.type) {
        case 'threading:get-state':
          this.sendToWebview({
            type: 'threading:state',
            payload: this.getState()
          });
          break;

        case 'threading:toggle':
          await this.toggleThreading();
          break;

        case 'threading:start-session':
          await this.startSession(message.payload?.mode);
          break;

        case 'threading:end-session':
          await this.endSession();
          break;

        case 'threading:toggle-thread':
          await this.toggleThread(message.payload?.threadName);
          break;

        case 'threading:change-mode':
          await this.changeMode(message.payload?.mode);
          break;

        case 'threading:load-logs':
          const logs = await this.loadLogs(message.payload?.sessionId);
          this.sendToWebview({
            type: 'threading:timeline-data',
            payload: { logs }
          });
          break;

        case 'threading:list-sessions':
          const sessions = await this.listSessions();
          this.sendToWebview({
            type: 'threading:sessions-list',
            payload: { sessions }
          });
          break;

        default:
          logger.warn(LogCategory.EXTENSION, 'Unknown threading message type', 'handleWebviewMessage', {
            type: message.type
          });
      }
    } catch (error) {
      logger.error(LogCategory.EXTENSION, 'Error handling webview message', 'handleWebviewMessage', error);
    }
  }

  /**
   * Dispose resources
   */
  async dispose(): Promise<void> {
    // End current session
    if (this.currentSession) {
      await this.endSession();
    }

    // Clean up logger
    if (this.currentLogger) {
      await this.currentLogger.endSession();
      this.currentLogger = null;
    }

    // Dispose status bar
    this.statusBarItem.dispose();

    logger.info(LogCategory.EXTENSION, 'ThreadControlCenter disposed', 'dispose');
  }
}
