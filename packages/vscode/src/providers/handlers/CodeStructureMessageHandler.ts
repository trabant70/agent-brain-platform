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

        // New message types for KnowledgeWebviewIntegration
        case 'code-structure-review:request-data':
          await this.handleRequestData();
          return true;

        case 'code-structure-review:run-analysis':
          await this.handleRunAnalysis(message.payload);
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
      this.sendMessage({
        type: 'code-structure-review:error',
        payload: {
          error: error instanceof Error ? error.message : 'Unknown error occurred'
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
      const visualizationData = this.provider.getVisualizationData();

      // Send legacy format
      this.sendMessage({
        type: 'code-structure:analysis-complete',
        payload: {
          analysis,
          visualizations: visualizationData
        }
      });

      // Send new format for KnowledgeWebviewIntegration
      this.sendMessage({
        type: 'code-structure-review:data',
        data: {
          summary: analysis.summary,
          categories: analysis.categories,
          files: visualizationData?.files || [],
          dependencies: visualizationData?.dependencies || [],
          timeline: visualizationData?.timeline || [],
          testCoverage: visualizationData?.testCoverage || {},
          i18n: visualizationData?.i18n || {}
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
      this.sendMessage({
        type: 'code-structure-review:error',
        error: error instanceof Error ? error.message : 'Analysis failed'
      });
    }
  }

  /**
   * Handle quick analysis request
   */
  private async handleQuickAnalysis(): Promise<void> {
    this.sendMessage({ type: 'code-structure:analysis-start' });

    try {
      // Quick analysis now uses the same streaming analysis as full analysis
      const analysis = await this.provider.analyzeWorkspace();
      const visualizationData = this.provider.getVisualizationData();

      // Send legacy format
      this.sendMessage({
        type: 'code-structure:analysis-complete',
        payload: {
          analysis,
          visualizations: visualizationData
        }
      });

      // Send new format for KnowledgeWebviewIntegration
      this.sendMessage({
        type: 'code-structure-review:data',
        data: {
          summary: analysis.summary,
          categories: analysis.categories,
          files: visualizationData?.files || [],
          dependencies: visualizationData?.dependencies || [],
          timeline: visualizationData?.timeline || [],
          testCoverage: visualizationData?.testCoverage || {},
          i18n: visualizationData?.i18n || {}
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
      this.sendMessage({
        type: 'code-structure-review:error',
        error: error instanceof Error ? error.message : 'Analysis failed'
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

  /**
   * Handle request for current analysis data
   * Sends current analysis to webview or empty state if no analysis exists
   */
  private async handleRequestData(): Promise<void> {
    logger.debug(
      LogCategory.WEBVIEW,
      'Request for code structure data received',
      'handleRequestData'
    );

    try {
      const currentAnalysis = this.provider.getCurrentAnalysis();

      if (currentAnalysis) {
        // Send existing analysis data
        const visualizationData = this.provider.getVisualizationData();

        this.sendMessage({
          type: 'code-structure-review:data',
          data: {
            summary: currentAnalysis.summary,
            categories: currentAnalysis.categories,
            files: visualizationData?.files || [],
            dependencies: visualizationData?.dependencies || [],
            timeline: visualizationData?.timeline || [],
            testCoverage: visualizationData?.testCoverage || {},
            i18n: visualizationData?.i18n || {}
          }
        });

        logger.info(
          LogCategory.WEBVIEW,
          'Sent existing code structure data to webview',
          'handleRequestData',
          { score: currentAnalysis.summary.overallScore, issues: currentAnalysis.summary.totalIssues }
        );
      } else {
        // No analysis available - send empty state
        this.sendMessage({
          type: 'code-structure-review:clear'
        });

        logger.debug(
          LogCategory.WEBVIEW,
          'No analysis data available, sent clear message',
          'handleRequestData'
        );
      }
    } catch (error) {
      logger.error(
        LogCategory.WEBVIEW,
        'Failed to get current analysis data',
        'handleRequestData',
        error
      );
      this.sendMessage({
        type: 'code-structure-review:error',
        error: error instanceof Error ? error.message : 'Failed to retrieve analysis data'
      });
    }
  }

  /**
   * Handle run analysis request
   * Triggers a full analysis and sends results to webview
   */
  private async handleRunAnalysis(payload: any = {}): Promise<void> {
    logger.info(
      LogCategory.WEBVIEW,
      'Run analysis requested from webview',
      'handleRunAnalysis',
      payload
    );

    try {
      // Run full analysis
      const analysis = await this.provider.analyzeWorkspace();
      const visualizationData = this.provider.getVisualizationData();

      // Send results to webview
      this.sendMessage({
        type: 'code-structure-review:data',
        data: {
          summary: analysis.summary,
          categories: analysis.categories,
          files: visualizationData?.files || [],
          dependencies: visualizationData?.dependencies || [],
          timeline: visualizationData?.timeline || [],
          testCoverage: visualizationData?.testCoverage || {},
          i18n: visualizationData?.i18n || {}
        }
      });

      logger.info(
        LogCategory.WEBVIEW,
        'Analysis complete, data sent to webview',
        'handleRunAnalysis',
        {
          score: analysis.summary.overallScore,
          totalIssues: analysis.summary.totalIssues,
          categories: analysis.categories.length
        }
      );

      vscode.window.showInformationMessage(
        `Code Structure Analysis complete: ${analysis.summary.overallScore}/100 score, ${analysis.summary.totalIssues} issues found`
      );
    } catch (error) {
      logger.error(
        LogCategory.WEBVIEW,
        'Analysis failed',
        'handleRunAnalysis',
        error
      );

      this.sendMessage({
        type: 'code-structure-review:error',
        error: error instanceof Error ? error.message : 'Analysis failed'
      });

      vscode.window.showErrorMessage(
        `Code structure analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
