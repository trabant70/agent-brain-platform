/**
 * File System Activity Adapter
 *
 * Bridges VSCode file system events to Agent Brain session activity tracking.
 * Automatically tracks file saves, creates, and deletes during active sessions.
 */

import * as vscode from 'vscode';
import { SessionManager } from '@agent-brain/core/domains/sessions';
import { Activity, FileSaveMetadata, FileDeleteMetadata, FileCreateMetadata } from '@agent-brain/core/domains/sessions/types';

export class FileSystemAdapter {
  private disposables: vscode.Disposable[] = [];

  constructor(private sessionManager: SessionManager) {
    this.setupWatchers();
  }

  private setupWatchers(): void {
    // Watch file saves
    const saveWatcher = vscode.workspace.onDidSaveTextDocument(doc => {
      this.handleFileSave(doc);
    });
    this.disposables.push(saveWatcher);

    // Watch file deletes
    const deleteWatcher = vscode.workspace.onDidDeleteFiles(event => {
      this.handleFileDelete(event);
    });
    this.disposables.push(deleteWatcher);

    // Watch file creates
    const createWatcher = vscode.workspace.onDidCreateFiles(event => {
      this.handleFileCreate(event);
    });
    this.disposables.push(createWatcher);
  }

  private handleFileSave(document: vscode.TextDocument): void {
    if (!this.sessionManager.hasActiveSession()) {
      return; // No active session
    }

    // Skip non-file schemes (like output, debug, etc.)
    if (document.uri.scheme !== 'file') {
      return;
    }

    const metadata: FileSaveMetadata = {
      filePath: vscode.workspace.asRelativePath(document.uri),
      linesAdded: document.lineCount,
      fileSize: Buffer.byteLength(document.getText(), 'utf8')
    };

    const activity: Activity = {
      id: this.generateActivityId(),
      type: 'file-save',
      timestamp: new Date(),
      metadata
    };

    try {
      this.sessionManager.trackActivity(activity);
    } catch (error) {
      // Silently ignore - session may have ended
      console.debug('[FileSystemAdapter] Failed to track activity:', error);
    }
  }

  private handleFileDelete(event: vscode.FileDeleteEvent): void {
    if (!this.sessionManager.hasActiveSession()) {
      return;
    }

    for (const uri of event.files) {
      // Skip non-file schemes
      if (uri.scheme !== 'file') {
        continue;
      }

      const metadata: FileDeleteMetadata = {
        filePath: vscode.workspace.asRelativePath(uri)
      };

      const activity: Activity = {
        id: this.generateActivityId(),
        type: 'file-delete',
        timestamp: new Date(),
        metadata
      };

      try {
        this.sessionManager.trackActivity(activity);
      } catch (error) {
        console.debug('[FileSystemAdapter] Failed to track activity:', error);
      }
    }
  }

  private handleFileCreate(event: vscode.FileCreateEvent): void {
    if (!this.sessionManager.hasActiveSession()) {
      return;
    }

    for (const uri of event.files) {
      // Skip non-file schemes
      if (uri.scheme !== 'file') {
        continue;
      }

      const metadata: FileCreateMetadata = {
        filePath: vscode.workspace.asRelativePath(uri)
      };

      const activity: Activity = {
        id: this.generateActivityId(),
        type: 'file-create',
        timestamp: new Date(),
        metadata
      };

      try {
        this.sessionManager.trackActivity(activity);
      } catch (error) {
        console.debug('[FileSystemAdapter] Failed to track activity:', error);
      }
    }
  }

  private generateActivityId(): string {
    return `act-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}
