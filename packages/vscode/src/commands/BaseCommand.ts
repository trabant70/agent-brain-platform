/**
 * Base Command
 *
 * Abstract base class for all VSCode commands.
 * Provides error handling and consistent registration pattern.
 */

import * as vscode from 'vscode';

export abstract class BaseCommand {
  /** Unique command identifier (e.g., 'agentBrain.newPrompt') */
  abstract readonly id: string;

  /**
   * Register the command with VSCode
   */
  register(context: vscode.ExtensionContext): void {
    const command = vscode.commands.registerCommand(
      this.id,
      async (...args: any[]) => {
        try {
          await this.execute(...args);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(`Command failed: ${message}`);
          console.error(`[${this.id}] Error:`, error);
        }
      }
    );

    context.subscriptions.push(command);
    console.log(`[Agent Brain] Registered command: ${this.id}`);
  }

  /**
   * Execute the command
   * Subclasses implement this method with their specific logic
   */
  protected abstract execute(...args: any[]): Promise<void>;
}
