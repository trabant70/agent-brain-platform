/**
 * FocusValidationService - VSCode Integration for Focus-Based Validation
 *
 * Integrates FocusUpdateHandler with VSCode's editor events:
 * - onDidSaveTextDocument: Validate when user saves
 * - onDidChangeActiveTextEditor: Validate when switching tabs
 * - onWillSaveTextDocument: Optional pre-save validation
 *
 * Provides UI notifications for validation warnings and errors.
 */

import * as vscode from 'vscode';
import {
  FocusUpdateHandler,
  FocusUpdateConfig,
  ValidationResult,
  ClaudeMdScanner,
  TemplateEngine
} from '@agent-brain/core/domains/knowledge';
import { logger, LogCategory, LogPathway } from '@agent-brain/core/infrastructure/logging/Logger';

export class FocusValidationService {
  private focusHandler: FocusUpdateHandler;
  private disposables: vscode.Disposable[] = [];
  private lastValidationTime: Map<string, Date> = new Map();

  constructor(
    scanner: ClaudeMdScanner,
    config?: Partial<FocusUpdateConfig>
  ) {
    this.focusHandler = new FocusUpdateHandler(
      scanner,
      {
        onValidationComplete: (filePath, result) => this.handleValidationComplete(filePath, result),
        onWarningPrompt: (filePath, warnings) => this.showWarningPrompt(filePath, warnings),
        onAutoFixApplied: (filePath, fixes) => this.showAutoFixNotification(filePath, fixes)
      },
      config
    );

    this.registerEventHandlers();
  }

  /**
   * Register VSCode event handlers
   */
  private registerEventHandlers(): void {
    // Validate on save
    this.disposables.push(
      vscode.workspace.onDidSaveTextDocument((document) => {
        if (this.isClaudeMdFile(document)) {
          this.validateDocument(document, 'save');
        }
      })
    );

    // Validate on tab switch (optional, can be heavy)
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && this.isClaudeMdFile(editor.document)) {
          // Only validate if file has changed and enough time has passed
          const filePath = editor.document.uri.fsPath;
          if (this.focusHandler.hasPendingChanges(filePath)) {
            this.validateDocument(editor.document, 'tabSwitch');
          }
        }
      })
    );

    // Validate on close
    this.disposables.push(
      vscode.workspace.onDidCloseTextDocument((document) => {
        if (this.isClaudeMdFile(document)) {
          const filePath = document.uri.fsPath;
          if (this.focusHandler.hasPendingChanges(filePath)) {
            this.validateDocument(document, 'close');
          }
        }
      })
    );
  }

  /**
   * Validate a document
   */
  private async validateDocument(
    document: vscode.TextDocument,
    trigger: 'save' | 'tabSwitch' | 'close' | 'blur'
  ): Promise<void> {
    const filePath = document.uri.fsPath;
    const content = document.getText();

    logger.info(
      LogCategory.EXTENSION,
      'Validating document on focus lost',
      'FocusValidationService.validateDocument',
      { filePath, trigger },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      const result = await this.focusHandler.validateOnFocusLost(
        filePath,
        content,
        trigger
      );

      // Update last validation time
      this.lastValidationTime.set(filePath, new Date());

    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        'Validation failed',
        'FocusValidationService.validateDocument',
        { filePath, error: error instanceof Error ? error.message : 'Unknown error' },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      vscode.window.showErrorMessage(
        `Failed to validate ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Handle validation completion
   */
  private handleValidationComplete(filePath: string, result: ValidationResult): void {
    logger.info(
      LogCategory.EXTENSION,
      'Validation complete',
      'FocusValidationService.handleValidationComplete',
      { filePath, valid: result.valid, warnings: result.scanResult.warnings.length },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    if (!result.valid) {
      // Show warning notification
      const message = `${result.summary}\n\nSuggestions: ${result.suggestions.join(', ')}`;
      vscode.window.showWarningMessage(message, 'View Details').then(selection => {
        if (selection === 'View Details') {
          this.showValidationDetails(result);
        }
      });
    }
  }

  /**
   * Show warning prompt to user
   */
  private async showWarningPrompt(filePath: string, warnings: string[]): Promise<boolean> {
    const message = `Found ${warnings.length} warning(s) in ${filePath}:\n\n${warnings.slice(0, 3).join('\n')}${warnings.length > 3 ? `\n... and ${warnings.length - 3} more` : ''}`;

    const choice = await vscode.window.showWarningMessage(
      message,
      { modal: true },
      'Proceed Anyway',
      'Cancel'
    );

    return choice === 'Proceed Anyway';
  }

  /**
   * Show auto-fix notification
   */
  private showAutoFixNotification(filePath: string, fixes: string[]): void {
    vscode.window.showInformationMessage(
      `Applied ${fixes.length} auto-fix(es) to ${filePath}`
    );
  }

  /**
   * Show detailed validation results
   */
  private showValidationDetails(result: ValidationResult): void {
    const panel = vscode.window.createWebviewPanel(
      'validationDetails',
      'Validation Details',
      vscode.ViewColumn.Beside,
      {}
    );

    panel.webview.html = this.getValidationDetailsHtml(result);
  }

  /**
   * Generate HTML for validation details
   */
  private getValidationDetailsHtml(result: ValidationResult): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: var(--vscode-font-family);
              padding: 20px;
            }
            .summary {
              background: var(--vscode-editor-background);
              border-left: 4px solid var(--vscode-editorWarning-foreground);
              padding: 15px;
              margin-bottom: 20px;
            }
            .warning {
              background: var(--vscode-inputValidation-warningBackground);
              border: 1px solid var(--vscode-inputValidation-warningBorder);
              padding: 10px;
              margin: 10px 0;
              border-radius: 3px;
            }
            .suggestion {
              background: var(--vscode-editor-background);
              padding: 10px;
              margin: 5px 0;
              border-left: 3px solid var(--vscode-editorInfo-foreground);
            }
            h2 {
              color: var(--vscode-foreground);
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="summary">
            <h1>Validation Results</h1>
            <p>${result.summary}</p>
            <p><strong>Total Groups:</strong> ${result.scanResult.groups.length}</p>
            <p><strong>Individual Items:</strong> ${result.scanResult.individualItems.length}</p>
            <p><strong>Orphaned Items:</strong> ${result.scanResult.orphanedItems.length}</p>
          </div>

          ${result.scanResult.warnings.length > 0 ? `
            <h2>Warnings (${result.scanResult.warnings.length})</h2>
            ${result.scanResult.warnings.map(warning => `
              <div class="warning">${warning}</div>
            `).join('')}
          ` : ''}

          ${result.suggestions.length > 0 ? `
            <h2>Suggestions</h2>
            ${result.suggestions.map(suggestion => `
              <div class="suggestion">${suggestion}</div>
            `).join('')}
          ` : ''}

          ${result.scanResult.orphanedItems.length > 0 ? `
            <h2>Orphaned Items (${result.scanResult.orphanedItems.length})</h2>
            <ul>
              ${result.scanResult.orphanedItems.map(item => `<li>${item}</li>`).join('')}
            </ul>
          ` : ''}
        </body>
      </html>
    `;
  }

  /**
   * Check if document is a claude.md file
   */
  private isClaudeMdFile(document: vscode.TextDocument): boolean {
    const fileName = document.uri.path.toLowerCase();
    return fileName.endsWith('claude.md') || fileName.endsWith('claude.md.txt');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<FocusUpdateConfig>): void {
    this.focusHandler.updateConfig(config);
  }

  /**
   * Track a pending change
   */
  trackPendingChange(filePath: string, change: any): void {
    this.focusHandler.trackPendingChange(filePath, change);
  }

  /**
   * Clear pending changes for a file
   */
  clearPendingChanges(filePath: string): void {
    this.focusHandler.clearPendingChanges(filePath);
  }

  /**
   * Dispose all event listeners
   */
  dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}
