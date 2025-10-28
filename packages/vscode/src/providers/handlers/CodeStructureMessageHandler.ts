/**
 * Message handler for Code Structure Review
 */

import * as vscode from 'vscode';
import { CodeStructureReviewProvider } from '../CodeStructureReviewProvider';
import type { MaturityLevel } from '@agent-brain/core/domains/code-structure-review';
import { logger, LogCategory } from '@agent-brain/core/infrastructure/logging/Logger';

export interface CodeStructureMessage {
  type: string;
  payload?: any;
}

/**
 * Handles messages between webview and extension for code structure review
 */
export class CodeStructureMessageHandler {
  constructor(
    private provider: CodeStructureReviewProvider,
    private sendMessage: (message: any) => void
  ) {}

  /**
   * Handle message from webview
   */
  async handleMessage(message: CodeStructureMessage): Promise<boolean> {
    try {
      switch (message.type) {
        case 'code-structure:run-full-analysis':
          await this.handleFullAnalysis(message.payload);
          return true;

        case 'code-structure:run-quick-analysis':
          await this.handleQuickAnalysis();
          return true;

        case 'code-structure:generate-prompt':
          await this.handleGeneratePrompt(message.payload);
          return true;

        case 'code-structure:export-report':
          await this.handleExportReport(message.payload);
          return true;

        case 'code-structure:maturity-changed':
          await this.handleMaturityChange(message.payload);
          return true;

        default:
          logger.warn(
            LogCategory.WEBVIEW,
            `Unknown code structure message type: ${message.type}`,
            'CodeStructureMessageHandler.handleMessage'
          );
          return false;
      }
    } catch (error) {
      logger.error(
        LogCategory.WEBVIEW,
        'Error handling code structure message',
        'CodeStructureMessageHandler.handleMessage',
        error
      );
      this.sendMessage({
        type: 'code-structure:analysis-error',
        payload: {
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        }
      });
      return false;
    }
  }

  /**
   * Handle full analysis request
   */
  private async handleFullAnalysis(payload: any): Promise<void> {
    this.sendMessage({ type: 'code-structure:analysis-start' });

    try {
      const analysis = await this.provider.analyzeWorkspace();

      this.sendMessage({
        type: 'code-structure:analysis-complete',
        payload: {
          analysis,
          visualizations: this.provider.getVisualizationData()
        }
      });

      vscode.window.showInformationMessage(
        `Analysis complete: ${analysis.summary.overallScore}/100 score, ${analysis.summary.totalIssues} issues found`
      );
    } catch (error) {
      logger.error(
        LogCategory.WEBVIEW,
        'Full analysis failed',
        'handleFullAnalysis',
        error
      );
      this.sendMessage({
        type: 'code-structure:analysis-error',
        payload: { message: error instanceof Error ? error.message : 'Analysis failed' }
      });
    }
  }

  /**
   * Handle quick analysis request
   */
  private async handleQuickAnalysis(): Promise<void> {
    this.sendMessage({ type: 'code-structure:analysis-start' });

    try {
      const analysis = await this.provider.quickAnalyze();

      this.sendMessage({
        type: 'code-structure:analysis-complete',
        payload: {
          analysis,
          visualizations: this.provider.getVisualizationData()
        }
      });

      vscode.window.showInformationMessage(
        `Quick analysis complete: ${analysis.summary.overallScore}/100 score`
      );
    } catch (error) {
      logger.error(
        LogCategory.WEBVIEW,
        'Quick analysis failed',
        'handleQuickAnalysis',
        error
      );
      this.sendMessage({
        type: 'code-structure:analysis-error',
        payload: { message: error instanceof Error ? error.message : 'Analysis failed' }
      });
    }
  }

  /**
   * Handle generate AI prompt
   */
  private async handleGeneratePrompt(payload: {
    categoryId?: string;
    maturityLevel?: MaturityLevel;
  }): Promise<void> {
    try {
      const prompt = await this.provider.generatePrompt(
        payload.categoryId,
        payload.maturityLevel
      );

      this.sendMessage({
        type: 'code-structure:prompt-generated',
        payload: { prompt }
      });

      // Optionally copy to clipboard
      await vscode.env.clipboard.writeText(prompt);
      vscode.window.showInformationMessage('AI prompt copied to clipboard');
    } catch (error) {
      logger.error(
        LogCategory.WEBVIEW,
        'Failed to generate prompt',
        'handleGeneratePrompt',
        error
      );
      vscode.window.showErrorMessage(`Failed to generate prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle export report
   */
  private async handleExportReport(payload: {
    format: 'summary' | 'detailed' | 'json' | 'csv';
  }): Promise<void> {
    try {
      await this.provider.exportReport(payload.format);
    } catch (error) {
      logger.error(
        LogCategory.WEBVIEW,
        'Failed to export report',
        'handleExportReport',
        error
      );
      vscode.window.showErrorMessage(`Failed to export report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle maturity level change
   */
  private async handleMaturityChange(payload: { maturityLevel: MaturityLevel }): Promise<void> {
    // Update configuration
    await vscode.workspace
      .getConfiguration('agentBrain.codeStructureReview')
      .update('defaultMaturityLevel', payload.maturityLevel, true);

    logger.debug(
      LogCategory.WEBVIEW,
      `Maturity level changed to ${payload.maturityLevel}`,
      'handleMaturityChange'
    );
  }
}
