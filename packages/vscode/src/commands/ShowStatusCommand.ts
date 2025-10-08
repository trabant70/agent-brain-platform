/**
 * Show Session Status Command
 *
 * Displays information about the current active Agent Brain session.
 * Shows prompt, agent type, duration, and activity count.
 */

import * as vscode from 'vscode';
import { BaseCommand } from './BaseCommand';
import { SessionManager } from '@agent-brain/core/domains/sessions';

export class ShowStatusCommand extends BaseCommand {
  readonly id = 'agentBrain.showStatus';

  constructor(private sessionManager: SessionManager) {
    super();
  }

  protected async execute(): Promise<void> {
    const session = this.sessionManager.getCurrentSession();

    if (!session) {
      vscode.window.showInformationMessage('No active session');
      return;
    }

    const duration = Date.now() - session.startTime.getTime();
    const durationMin = Math.floor(duration / 60000);
    const durationSec = Math.floor((duration % 60000) / 1000);

    // Count unique files modified
    const filesModified = new Set<string>();
    for (const activity of session.activities) {
      if (activity.type === 'file-save' || activity.type === 'file-create' || activity.type === 'file-delete') {
        const filePath = activity.metadata.filePath;
        if (filePath) {
          filesModified.add(filePath);
        }
      }
    }

    const message = `
**Active Session**
Prompt: ${session.prompt}
Agent: ${session.agentType}
Duration: ${durationMin}m ${durationSec}s
Activities: ${session.activities.length}
Files Modified: ${filesModified.size}
    `.trim();

    const action = await vscode.window.showInformationMessage(
      'Agent Brain Session Status',
      { modal: true, detail: message },
      'End Session',
      'Continue'
    );

    if (action === 'End Session') {
      await vscode.commands.executeCommand('agentBrain.endSession');
    }
  }
}
