/**
 * Integration with threading system for AI conversations
 */

import type {
  GeneratedPrompt,
  ThreadingPromptPayload
} from '../types';

/**
 * Integrates code structure review with threading domain
 */
export class ThreadingIntegration {
  /**
   * Convert generated prompt to threading payload
   */
  createThreadingPayload(
    prompt: GeneratedPrompt,
    workspace: string
  ): ThreadingPromptPayload {
    const relatedFiles = prompt.context.relatedIssues
      .map(issue => issue.filePath)
      .filter((file, index, self) => self.indexOf(file) === index); // Unique files

    return {
      prompt: prompt.prompt,
      context: {
        source: 'code-structure-review',
        categoryId: prompt.context.categoryId,
        maturityLevel: prompt.context.maturityLevel,
        relatedFiles,
        issues: prompt.context.relatedIssues
      },
      metadata: {
        analysisTimestamp: new Date(),
        workspace
      }
    };
  }

  /**
   * Create multiple threading payloads
   */
  createMultiplePayloads(
    prompts: GeneratedPrompt[],
    workspace: string
  ): ThreadingPromptPayload[] {
    return prompts.map(prompt => this.createThreadingPayload(prompt, workspace));
  }

  /**
   * Format prompt for threading system
   * Adds context and formatting for better AI responses
   */
  formatForThreading(payload: ThreadingPromptPayload): string {
    let formatted = payload.prompt;

    // Add context section
    formatted += '\n\n---\n\n';
    formatted += '**Context:**\n';
    formatted += `- Analysis Date: ${payload.metadata.analysisTimestamp.toISOString()}\n`;
    formatted += `- Category: ${payload.context.categoryId}\n`;
    formatted += `- Maturity Level: ${payload.context.maturityLevel}\n`;
    formatted += `- Related Files: ${payload.context.relatedFiles.length}\n`;
    formatted += `- Issues: ${payload.context.issues.length}\n`;

    return formatted;
  }
}
