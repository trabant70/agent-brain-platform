/**
 * End Session Command
 *
 * Allows users to manually end the current Agent Brain session.
 * Provides options to complete or abandon the session.
 */

import * as vscode from 'vscode';
import { BaseCommand } from './BaseCommand';
import { SessionManager } from '@agent-brain/core/domains/sessions';

export class EndSessionCommand extends BaseCommand {
  readonly id = 'agentBrain.endSession';

  constructor(private sessionManager: SessionManager) {
    super();
  }

  protected async execute(): Promise<void> {
    if (!this.sessionManager.hasActiveSession()) {
      vscode.window.showInformationMessage('No active session to end');
      return;
    }

    const currentSession = this.sessionManager.getCurrentSession();
    if (!currentSession) return;

    // Ask for confirmation
    const choice = await vscode.window.showInformationMessage(
      `End session: "${currentSession.prompt}"?`,
      { modal: true },
      'Complete',
      'Abandon',
      'Cancel'
    );

    if (choice === 'Complete') {
      const event = await this.sessionManager.finalizeSession('completed');

      if (event) {
        const filesChanged = event.impact.filesChanged;
        const activityCount = event.metadata?.activityCount || 0;

        vscode.window.showInformationMessage(
          `✅ Session completed: ${filesChanged} file(s) changed, ${activityCount} activities tracked`
        );
      }
    } else if (choice === 'Abandon') {
      await this.sessionManager.finalizeSession('abandoned');
      vscode.window.showInformationMessage('Session abandoned');
    }
    // If 'Cancel', do nothing
  }
}
