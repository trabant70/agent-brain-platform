/**
 * WebviewLifecycleManager
 *
 * Manages webview lifecycle events and state.
 * Responsible for:
 * - Handling visibility changes
 * - Managing webview ready state
 * - Coordinating refresh on visibility restoration
 * - Setting up event listeners
 */

import * as vscode from 'vscode';
import { logger, LogCategory, LogPathway } from '@agent-brain/core/infrastructure/logging/Logger';

export interface LifecycleCallbacks {
  onVisibilityChange?: (visible: boolean) => void;
  onWebviewReady?: () => void;
  onDispose?: () => void;
}

export class WebviewLifecycleManager {
  private isWebviewReady: boolean = false;
  private disposables: vscode.Disposable[] = [];

  constructor(private callbacks: LifecycleCallbacks = {}) {}

  /**
   * Setup lifecycle event listeners for a webview
   */
  setupEventListeners(webviewView: vscode.WebviewView): void {
    // Handle visibility changes
    const visibilityListener = webviewView.onDidChangeVisibility(() => {
      this.handleVisibilityChange(webviewView.visible);
    });

    this.disposables.push(visibilityListener);

    logger.info(
      LogCategory.WEBVIEW,
      'Webview lifecycle listeners attached',
      'WebviewLifecycleManager.setupEventListeners',
      undefined,
      LogPathway.WEBVIEW_MESSAGING
    );
  }

  /**
   * Handle webview visibility changes
   */
  private handleVisibilityChange(visible: boolean): void {
    if (visible) {
      logger.info(
        LogCategory.WEBVIEW,
        'Webview became visible',
        'WebviewLifecycleManager.handleVisibilityChange',
        { isWebviewReady: this.isWebviewReady },
        LogPathway.WEBVIEW_MESSAGING
      );

      // Invoke callback after short delay to allow layout to settle
      // This is critical when returning from other windows (Terminal, etc.)
      setTimeout(() => {
        if (this.callbacks.onVisibilityChange) {
          this.callbacks.onVisibilityChange(true);
        }
      }, 150);
    } else {
      logger.info(
        LogCategory.WEBVIEW,
        'Webview became hidden',
        'WebviewLifecycleManager.handleVisibilityChange',
        {},
        LogPathway.WEBVIEW_MESSAGING
      );

      // Note: Don't reset ready flag - webview state persists when hidden
      // this.isWebviewReady = false;  // REMOVED: This was causing data loss

      if (this.callbacks.onVisibilityChange) {
        this.callbacks.onVisibilityChange(false);
      }
    }
  }

  /**
   * Mark webview as ready (receives data requests)
   */
  setWebviewReady(ready: boolean): void {
    this.isWebviewReady = ready;

    if (ready && this.callbacks.onWebviewReady) {
      this.callbacks.onWebviewReady();
    }

    logger.debug(
      LogCategory.WEBVIEW,
      `Webview ready state: ${ready}`,
      'WebviewLifecycleManager.setWebviewReady',
      { isReady: ready },
      LogPathway.WEBVIEW_MESSAGING
    );
  }

  /**
   * Get webview ready state
   */
  getWebviewReady(): boolean {
    return this.isWebviewReady;
  }

  /**
   * Dispose lifecycle manager and cleanup event listeners
   */
  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];

    if (this.callbacks.onDispose) {
      this.callbacks.onDispose();
    }

    logger.debug(
      LogCategory.WEBVIEW,
      'Webview lifecycle manager disposed',
      'WebviewLifecycleManager.dispose'
    );
  }
}
