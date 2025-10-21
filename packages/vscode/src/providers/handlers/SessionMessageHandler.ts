/**
 * SessionMessageHandler - Handles session journal messages
 *
 * Responsibilities:
 * - Load all session journals
 * - Open session files in editor
 */

import * as vscode from 'vscode';
import { logger, LogCategory, LogPathway } from '@agent-brain/core/infrastructure/logging/Logger';

export interface SessionHandlerContext {
  view: vscode.WebviewView | undefined;
}

export class SessionMessageHandler {
  constructor(private context: SessionHandlerContext) {}

  /**
   * Handle session-related messages
   */
  async handleMessage(message: any): Promise<boolean> {
    switch (message.type) {
      case 'sessions:load-all':
        await this.handleLoadSessions();
        return true;

      case 'sessions:open-file':
        await this.handleOpenSessionFile(message.payload);
        return true;

      default:
        return false; // Not handled by this handler
    }
  }

  /**
   * Handle load all sessions request
   */
  private async handleLoadSessions(): Promise<void> {
    try {
      logger.debug(
        LogCategory.EXTENSION,
        'Loading all sessions',
        'SessionMessageHandler.handleLoadSessions',
        undefined,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      // Get workspace root
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        logger.warn(
          LogCategory.EXTENSION,
          'No workspace folder found',
          'SessionMessageHandler.handleLoadSessions'
        );
        this.sendMessage({
          type: 'sessions:loaded',
          payload: { sessions: [] }
        });
        return;
      }

      // Load sessions using SessionFileSystem
      const { SessionFileSystem } = await import('@agent-brain/core/domains/sessions/SessionFileSystem');
      const sessionFS = new SessionFileSystem(workspaceRoot);
      const sessions = await sessionFS.loadAllSessions();

      logger.info(
        LogCategory.EXTENSION,
        'Sessions loaded successfully',
        'SessionMessageHandler.handleLoadSessions',
        { count: sessions.length },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      // Send sessions to webview
      this.sendMessage({
        type: 'sessions:loaded',
        payload: { sessions }
      });

    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to load sessions',
        'SessionMessageHandler.handleLoadSessions',
        { error: error.message }
      );

      this.sendMessage({
        type: 'sessions:error',
        payload: { error: error.message }
      });
    }
  }

  /**
   * Handle open session file request
   */
  private async handleOpenSessionFile(payload: any): Promise<void> {
    try {
      const { filePath } = payload;

      if (!filePath) {
        logger.warn(
          LogCategory.EXTENSION,
          'No file path provided',
          'SessionMessageHandler.handleOpenSessionFile'
        );
        return;
      }

      logger.debug(
        LogCategory.EXTENSION,
        'Opening session file',
        'SessionMessageHandler.handleOpenSessionFile',
        { filePath },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      // Open the file in the editor
      const uri = vscode.Uri.file(filePath);
      const document = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(document);

      logger.info(
        LogCategory.EXTENSION,
        'Session file opened successfully',
        'SessionMessageHandler.handleOpenSessionFile',
        { filePath },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

    } catch (error: any) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to open session file',
        'SessionMessageHandler.handleOpenSessionFile',
        { error: error.message }
      );

      vscode.window.showErrorMessage(`Failed to open session file: ${error.message}`);
    }
  }

  /**
   * Send message to webview
   */
  private sendMessage(message: any): void {
    if (this.context.view) {
      this.context.view.webview.postMessage(message);
    }
  }
}
