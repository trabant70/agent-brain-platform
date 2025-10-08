/**
 * Add Context Rule Command (Phase 2)
 *
 * Allows users to add project-specific rules and guidelines
 * that will be included in future prompt enhancements.
 */

import * as vscode from 'vscode';
import { BaseCommand } from './BaseCommand';
import { ContextManager } from '@agent-brain/core/domains/context';

export class AddContextRuleCommand extends BaseCommand {
  readonly id = 'agentBrain.addContextRule';

  constructor(private contextManager: ContextManager) {
    super();
  }

  protected async execute(): Promise<void> {
    // Get workspace folder
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showWarningMessage('No workspace folder open. Please open a project first.');
      return;
    }

    const projectPath = workspaceFolders[0].uri.fsPath;

    // Get rule from user
    const rule = await vscode.window.showInputBox({
      title: '📋 Add Project Guideline',
      prompt: 'Enter a project-specific rule or guideline',
      placeHolder: 'e.g., Always use async/await instead of Promises',
      ignoreFocusOut: true,
      validateInput: (value) => {
        return value.trim().length < 10
          ? 'Please provide more detail (at least 10 characters)'
          : null;
      }
    });

    if (!rule) {
      return; // User cancelled
    }

    // Add rule to context
    const contextRule = this.contextManager.addRule(projectPath, rule, 'user');

    vscode.window.showInformationMessage(
      `✓ Guideline added! It will be included in future prompts.`
    );

    // Log success
    console.log(`[Agent Brain] Context rule added: ${contextRule.id} - ${rule}`);
  }
}
