/**
 * Prompt Command
 *
 * Main command for creating enhanced prompts with Agent Brain knowledge.
 * Guides user through prompt creation, knowledge gathering, and prompt enhancement.
 */

import * as vscode from 'vscode';
import { BaseCommand } from './BaseCommand';
import { KnowledgeSystem } from '@agent-brain/core/domains/knowledge';
import { SessionManager } from '@agent-brain/core/domains/sessions';
import { AgentType } from '@agent-brain/core/domains/sessions/types';
import { PromptEnhancer } from '../prompt';

export class PromptCommand extends BaseCommand {
  readonly id = 'agentBrain.newPrompt';

  constructor(
    private sessionManager: SessionManager,
    private knowledgeSystem: KnowledgeSystem,
    private enhancer: PromptEnhancer
  ) {
    super();
  }

  protected async execute(): Promise<void> {
    // Step 1: Get prompt from user
    const prompt = await this.getPromptFromUser();
    if (!prompt) {
      return; // User cancelled
    }

    // Step 2: Select agent type
    const agentType = await this.selectAgentType();
    if (!agentType) {
      return; // User cancelled
    }

    // Step 3: Enhance with knowledge
    await this.enhanceAndShowPrompt(prompt, agentType);
  }

  /**
   * Enhance prompt with knowledge and show to user
   */
  private async enhanceAndShowPrompt(prompt: string, agentType: AgentType): Promise<void> {
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Agent Brain',
      cancellable: false
    }, async (progress) => {
      progress.report({ message: 'Gathering knowledge...' });

      // Get project path for context rules (Phase 2)
      const workspaceFolders = vscode.workspace.workspaceFolders;
      const projectPath = workspaceFolders?.[0]?.uri.fsPath;

      // Get relevant knowledge based on prompt
      const knowledge = await this.knowledgeSystem.getRelevantKnowledge(prompt, projectPath);

      progress.report({ message: 'Enhancing prompt...' });

      // Create enhanced prompt
      const enhancedPrompt = await this.enhancer.enhance(prompt, knowledge);

      progress.report({ message: 'Ready!' });

      // Calculate total knowledge items (including context rules)
      const knowledgeCount = knowledge.patterns.length + knowledge.adrs.length + knowledge.learnings.length + (knowledge.contextRules?.length || 0);

      // Show to user
      await this.showPrompt(enhancedPrompt, agentType, knowledgeCount);
    });
  }

  /**
   * Get prompt from user via input box
   */
  private async getPromptFromUser(): Promise<string | undefined> {
    return await vscode.window.showInputBox({
      title: '🧠 Agent Brain - New Prompt',
      prompt: 'What would you like to build?',
      placeHolder: 'e.g., Add JWT authentication to user service...',
      ignoreFocusOut: true,
      validateInput: (value) => {
        return value.trim().length < 10
          ? 'Please provide more detail (at least 10 characters)'
          : null;
      }
    });
  }

  /**
   * Show agent type selection quick pick
   */
  private async selectAgentType(): Promise<AgentType | undefined> {
    const agentChoice = await vscode.window.showQuickPick([
      {
        label: '$(hubot) Claude',
        description: 'Anthropic Claude via terminal or extension',
        value: 'claude' as const
      },
      {
        label: '$(rocket) GitHub Copilot',
        description: 'GitHub Copilot in VSCode',
        value: 'copilot' as const
      },
      {
        label: '$(edit) Cursor',
        description: 'Cursor AI assistant',
        value: 'cursor' as const
      },
      {
        label: '$(question) Other',
        description: 'Other AI coding assistant',
        value: 'unknown' as const
      }
    ], {
      title: 'Which AI assistant are you using?',
      placeHolder: 'Select your agent...'
    });

    return agentChoice?.value;
  }

  /**
   * Show enhanced prompt to user
   */
  private async showPrompt(enhancedPrompt: string, agentType: AgentType, knowledgeCount: number): Promise<void> {
    const message = knowledgeCount > 0
      ? `🧠 Agent Brain enhanced your prompt with ${knowledgeCount} knowledge items`
      : `🧠 Agent Brain - Prompt Ready (${agentType})`;

    const action = await vscode.window.showInformationMessage(
      message,
      {
        modal: true,
        detail: enhancedPrompt
      },
      'Copy to Clipboard',
      'Start Session',
      'Cancel'
    );

    if (action === 'Copy to Clipboard') {
      await vscode.env.clipboard.writeText(enhancedPrompt);
      vscode.window.showInformationMessage('✓ Enhanced prompt copied to clipboard');
    } else if (action === 'Start Session') {
      // Start tracking session
      await this.sessionManager.startSession(enhancedPrompt, agentType);

      // Copy to clipboard
      await vscode.env.clipboard.writeText(enhancedPrompt);

      // Show success message
      vscode.window.showInformationMessage(
        '✓ Session started! Agent Brain is now tracking your work.',
        'Show Status'
      ).then(choice => {
        if (choice === 'Show Status') {
          vscode.commands.executeCommand('agentBrain.showStatus');
        }
      });
    }
  }
}
