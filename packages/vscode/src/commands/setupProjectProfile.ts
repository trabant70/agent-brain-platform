/**
 * VSCode Command: Setup Project Profile
 *
 * Launches the project profile wizard to guide users through initial setup
 */

import * as vscode from 'vscode';

export function registerSetupProjectProfileCommand(context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand('agent-brain.setupProjectProfile', async () => {
    // Show info message and open timeline view (which will show wizard)
    const selection = await vscode.window.showInformationMessage(
      '🚀 Welcome to Agent Brain! Let\'s set up your project profile.',
      'Get Started',
      'Skip for Now'
    );

    if (selection === 'Get Started') {
      // Open the Agent Brain timeline view
      await vscode.commands.executeCommand('agent-brain.showTimeline');

      // The timeline webview will receive a message to show the wizard
      // This is handled by the timeline provider
      const config = vscode.workspace.getConfiguration('agent-brain');
      await config.update('showProfileWizard', true, vscode.ConfigurationTarget.Workspace);
    }
  });
}
