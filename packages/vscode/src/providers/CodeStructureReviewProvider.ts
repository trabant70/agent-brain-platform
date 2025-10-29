/**
 * Code Structure Review Provider
 *
 * VSCode-specific implementation using streaming architecture.
 * Memory-efficient: only one file's AST in memory at a time.
 * Supports analysis of 10,000+ files without memory issues.
 */

import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  StreamingOrchestrator,
  type StreamingAnalysisOptions,
  type StreamingAnalysisResult,
  type ProgressEvent
} from '@agent-brain/core/domains/code-structure-review/orchestration';

export interface AnalysisProgressCallback {
  (event: ProgressEvent): void;
}

export interface ProviderOptions {
  /**
   * Callback for progress events (for webview updates)
   */
  onProgress?: AnalysisProgressCallback;

  /**
   * Workspace folder to analyze
   */
  workspaceFolder?: vscode.WorkspaceFolder;

  /**
   * File patterns to include (default: TypeScript/JavaScript/TSX/JSX)
   */
  includePatterns?: string[];

  /**
   * File patterns to exclude (default: node_modules, dist, build, etc.)
   */
  excludePatterns?: string[];

  /**
   * Which analyzers to run (default: all)
   */
  enabledAnalyzers?: Array<'feature-completeness' | 'ui-ux-quality' | 'test-coverage' | 'i18n'>;

  /**
   * Maturity context for filtering
   */
  maturityContext?: any;
}

/**
 * Code Structure Review Provider for VSCode
 */
interface AnalysisHistoryEntry {
  timestamp: number;
  workspaceFolder: string;
  analysis: StreamingAnalysisResult;
}

export class CodeStructureReviewProvider {
  private orchestrator: StreamingOrchestrator;
  private currentAnalysis?: StreamingAnalysisResult;
  private statusBarItem?: vscode.StatusBarItem;
  private cancellationTokenSource?: vscode.CancellationTokenSource;
  private analysisHistory: AnalysisHistoryEntry[] = [];
  private readonly MAX_HISTORY_SIZE = 10;
  private historyFilePath?: string;

  constructor() {
    this.orchestrator = new StreamingOrchestrator();
    this.setupProgressForwarding();
    this.initializeHistoryStorage();
  }

  /**
   * Initialize history storage in .agent-brain folder
   */
  private async initializeHistoryStorage(): Promise<void> {
    const workspace = vscode.workspace.workspaceFolders?.[0];
    if (!workspace) return;

    const agentBrainDir = path.join(workspace.uri.fsPath, '.agent-brain');
    const codeReviewDir = path.join(agentBrainDir, 'code-structure-review');
    this.historyFilePath = path.join(codeReviewDir, 'analysis-history.json');

    try {
      // Ensure directory exists
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(codeReviewDir));

      // Load existing history
      await this.loadHistory();
    } catch (error) {
      console.error('[CodeStructureReview] Failed to initialize history storage:', error);
    }
  }

  /**
   * Load analysis history from .agent-brain/code-structure-review/analysis-history.json
   */
  private async loadHistory(): Promise<void> {
    if (!this.historyFilePath) return;

    try {
      const fs = require('fs').promises;
      const content = await fs.readFile(this.historyFilePath, 'utf8');
      const data = JSON.parse(content);

      if (Array.isArray(data.history)) {
        this.analysisHistory = data.history;
        console.log(`[CodeStructureReview] Loaded ${this.analysisHistory.length} historical analyses`);
      }
    } catch (error) {
      // File doesn't exist yet or is invalid - start with empty history
      this.analysisHistory = [];
    }
  }

  /**
   * Save analysis history to .agent-brain/code-structure-review/analysis-history.json
   */
  private async saveHistory(): Promise<void> {
    if (!this.historyFilePath) return;

    try {
      const fs = require('fs').promises;
      const data = {
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        history: this.analysisHistory
      };

      await fs.writeFile(this.historyFilePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`[CodeStructureReview] Saved ${this.analysisHistory.length} analyses to history`);
    } catch (error) {
      console.error('[CodeStructureReview] Failed to save history:', error);
    }
  }

  /**
   * Add current analysis to history
   */
  private async addToHistory(analysis: StreamingAnalysisResult): Promise<void> {
    const workspace = vscode.workspace.workspaceFolders?.[0];
    if (!workspace) return;

    const entry: AnalysisHistoryEntry = {
      timestamp: Date.now(),
      workspaceFolder: workspace.name,
      analysis
    };

    // Add to front of array
    this.analysisHistory.unshift(entry);

    // Keep only MAX_HISTORY_SIZE entries
    if (this.analysisHistory.length > this.MAX_HISTORY_SIZE) {
      this.analysisHistory = this.analysisHistory.slice(0, this.MAX_HISTORY_SIZE);
    }

    await this.saveHistory();
  }

  /**
   * Forward orchestrator progress events
   */
  private setupProgressForwarding(): void {
    // Progress forwarding is set up per-analysis via options.onProgress
  }

  /**
   * Run full streaming analysis on workspace
   */
  async analyzeWorkspace(
    options: ProviderOptions = {}
  ): Promise<StreamingAnalysisResult> {
    const folder = options.workspaceFolder || vscode.workspace.workspaceFolders?.[0];

    if (!folder) {
      throw new Error('No workspace folder open');
    }

    console.log(`[CodeStructureReview] Starting analysis for: ${folder.uri.fsPath}`);

    // Create cancellation token
    this.cancellationTokenSource = new vscode.CancellationTokenSource();

    try {
      // Show progress notification
      return await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Analyzing Code Structure',
          cancellable: true
        },
        async (progress, token) => {
          // Handle cancellation
          token.onCancellationRequested(() => {
            console.log('[CodeStructureReview] Cancellation requested');
            this.cancellationTokenSource?.cancel();
          });

          // Step 1: Scan files
          progress.report({ message: 'Scanning workspace files...', increment: 5 });
          const filePaths = await this.scanWorkspaceFiles(
            folder.uri.fsPath,
            options.includePatterns,
            options.excludePatterns
          );

          console.log(`[CodeStructureReview] Found ${filePaths.length} files`);

          if (token.isCancellationRequested) {
            throw new Error('Analysis cancelled by user');
          }

          // Step 2: Load file contents
          progress.report({ message: 'Loading file contents...', increment: 10 });
          const files = await this.loadFileContents(filePaths);

          console.log(`[CodeStructureReview] Loaded ${files.length} files`);

          if (token.isCancellationRequested) {
            throw new Error('Analysis cancelled by user');
          }

          // Step 3: Run streaming analysis
          progress.report({ message: 'Processing files (streaming)...', increment: 10 });

          const analysis = await this.orchestrator.analyze({
            files,
            enabledAnalyzers: options.enabledAnalyzers,
            maturityContext: options.maturityContext,
            onProgress: (event) => {
              // Forward to webview callback
              if (options.onProgress) {
                options.onProgress(event);
              }

              // Update VSCode progress notification
              const phaseLabels = {
                scanning: 'Scanning files',
                extracting: 'Extracting metadata',
                analyzing: 'Running analyzers',
                aggregating: 'Aggregating results',
                complete: 'Complete',
                error: 'Error'
              };

              progress.report({
                message: `${phaseLabels[event.phase]} (${event.percentage}%)`,
                increment: 0 // Don't increment, use percentage from event
              });

              // Check cancellation during processing
              if (token.isCancellationRequested) {
                throw new Error('Analysis cancelled by user');
              }
            }
          });

          // Step 4: Cache result
          this.currentAnalysis = analysis;

          // Step 4b: Add to history
          await this.addToHistory(analysis);

          // Step 5: Update status bar
          this.updateStatusBar(analysis);

          progress.report({ message: 'Done!', increment: 100 });

          console.log(`[CodeStructureReview] ✓ Analysis complete: ${analysis.summary.totalIssues} issues, score: ${analysis.summary.overallScore}/100`);

          return analysis;
        }
      );
    } catch (error) {
      console.error('[CodeStructureReview] Analysis failed:', error);

      vscode.window.showErrorMessage(
        `Code structure analysis failed: ${(error as Error).message}`
      );

      throw error;
    } finally {
      this.cancellationTokenSource?.dispose();
      this.cancellationTokenSource = undefined;
    }
  }

  /**
   * Scan workspace for files to analyze
   */
  private async scanWorkspaceFiles(
    workspacePath: string,
    includePatterns?: string[],
    excludePatterns?: string[]
  ): Promise<string[]> {
    // Default patterns
    const defaultInclude = [
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx'
    ];

    const defaultExclude = [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/out/**',
      '**/coverage/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.test.js',
      '**/*.test.jsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/*.spec.js',
      '**/*.spec.jsx',
      '**/*.d.ts'
    ];

    const include = includePatterns || defaultInclude;
    const exclude = excludePatterns || defaultExclude;

    console.log(`[CodeStructureReview] Scanning with patterns:`, { include, exclude });

    const filePaths: string[] = [];

    for (const pattern of include) {
      const uris = await vscode.workspace.findFiles(pattern, `{${exclude.join(',')}}`);
      filePaths.push(...uris.map(uri => uri.fsPath));
    }

    // Remove duplicates
    const uniquePaths = [...new Set(filePaths)];

    console.log(`[CodeStructureReview] Found ${uniquePaths.length} unique files`);

    return uniquePaths;
  }

  /**
   * Load file contents
   */
  private async loadFileContents(
    filePaths: string[]
  ): Promise<Array<{ path: string; content: string }>> {
    const files: Array<{ path: string; content: string }> = [];

    for (const filePath of filePaths) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        files.push({ path: filePath, content });
      } catch (error) {
        console.warn(`[CodeStructureReview] Failed to read file: ${filePath}`, error);
        // Skip files that can't be read
      }
    }

    return files;
  }

  /**
   * Update status bar with analysis results
   */
  private updateStatusBar(analysis: StreamingAnalysisResult): void {
    if (!this.statusBarItem) {
      this.statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
      );
      this.statusBarItem.command = 'agent-brain.showCodeStructureReview';
    }

    const score = analysis.summary.overallScore;
    const icon = this.getStatusBarIcon(score);

    this.statusBarItem.text = `${icon} Code: ${score}/100`;
    this.statusBarItem.tooltip = `Code Structure Score: ${score}/100\n${analysis.summary.totalIssues} issues found`;
    this.statusBarItem.show();
  }

  /**
   * Get icon based on score
   */
  private getStatusBarIcon(score: number): string {
    if (score >= 90) return '$(check)';
    if (score >= 70) return '$(info)';
    if (score >= 50) return '$(warning)';
    return '$(error)';
  }

  /**
   * Get current analysis result
   */
  getCurrentAnalysis(): StreamingAnalysisResult | undefined {
    return this.currentAnalysis;
  }

  /**
   * Clear cached analysis
   */
  clearAnalysis(): void {
    this.currentAnalysis = undefined;
    this.orchestrator.clear();
  }

  /**
   * Get analysis history for timeline visualization
   */
  getAnalysisHistory(): AnalysisHistoryEntry[] {
    return this.analysisHistory;
  }

  /**
   * Get orchestrator statistics
   */
  getStatistics() {
    return this.orchestrator.getStatistics();
  }

  /**
   * Get registry for inspection (advanced usage)
   */
  getRegistry() {
    return this.orchestrator.getRegistry();
  }

  /**
   * Get visualization data for webview
   * Returns structured data for UI rendering
   */
  getVisualizationData(): any {
    if (!this.currentAnalysis) {
      return undefined;
    }

    // Transform analysis results into visualization format
    const registry = this.orchestrator.getRegistry();

    return {
      files: registry.testCoverage.getAllFiles().map(f => ({
        path: f.path,
        category: f.category,
        importance: f.importance,
        hasTest: f.hasCorrespondingTest
      })),
      dependencies: [], // Not yet implemented in streaming
      timeline: this.analysisHistory.map(entry => ({
        timestamp: new Date(entry.timestamp).toISOString(),
        overallScore: entry.analysis.summary.overallScore,
        categoryScores: entry.analysis.categories.reduce((acc, cat) => {
          acc[cat.categoryId] = cat.score;
          return acc;
        }, {} as Record<string, number>)
      })),
      testCoverage: {
        percentage: this.currentAnalysis.categories.find(c => c.categoryId === 'test-coverage')?.score || 0,
        testedFiles: registry.testCoverage.getCounts().total - registry.testCoverage.getCounts().untested,
        totalFiles: registry.testCoverage.getCounts().total
      },
      i18n: {
        translationCoverage: registry.i18n.getStats().stringLiterals.translationCoverage,
        untranslated: registry.i18n.getCounts().untranslated
      }
    };
  }

  /**
   * Generate AI prompt for issues
   */
  async generatePrompt(categoryId?: string, maturityLevel?: any): Promise<string> {
    if (!this.currentAnalysis) {
      throw new Error('No analysis available. Run analysis first.');
    }

    const category = categoryId
      ? this.currentAnalysis.categories.find(c => c.categoryId === categoryId)
      : this.currentAnalysis.categories[0];

    if (!category) {
      throw new Error('Category not found');
    }

    // Generate a simple prompt based on the analysis
    let prompt = `# Code Structure Review - ${category.categoryName}\n\n`;
    prompt += `**Score**: ${category.score}/100 (${category.status})\n`;
    prompt += `**Priority**: ${category.priority}\n\n`;
    prompt += `## Issues Found (${category.issues.length})\n\n`;

    category.issues.slice(0, 10).forEach((issue, i) => {
      prompt += `### ${i + 1}. ${issue.title}\n`;
      prompt += `**Severity**: ${issue.severity}\n`;
      prompt += `**File**: ${issue.filePath}${issue.lineNumber ? `:${issue.lineNumber}` : ''}\n`;
      prompt += `**Description**: ${issue.description}\n`;
      prompt += `**Recommendation**: ${issue.recommendation}\n\n`;
    });

    if (category.issues.length > 10) {
      prompt += `\n... and ${category.issues.length - 10} more issues.\n`;
    }

    return prompt;
  }

  /**
   * Export analysis report
   */
  async exportReport(format: 'summary' | 'detailed' | 'json' | 'csv'): Promise<void> {
    if (!this.currentAnalysis) {
      throw new Error('No analysis available. Run analysis first.');
    }

    const workspace = vscode.workspace.workspaceFolders?.[0];
    if (!workspace) {
      throw new Error('No workspace folder found');
    }

    let content: string;
    let extension: string;

    switch (format) {
      case 'json':
        content = JSON.stringify(this.currentAnalysis, null, 2);
        extension = 'json';
        break;

      case 'csv':
        // Simple CSV export of issues
        content = 'Category,Severity,Title,File,Line,Description\n';
        this.currentAnalysis.categories.forEach(cat => {
          cat.issues.forEach(issue => {
            const row = [
              cat.categoryName,
              issue.severity,
              `"${issue.title.replace(/"/g, '""')}"`,
              issue.filePath,
              issue.lineNumber || '',
              `"${issue.description.replace(/"/g, '""')}"`
            ].join(',');
            content += row + '\n';
          });
        });
        extension = 'csv';
        break;

      case 'summary':
      case 'detailed':
      default:
        content = this.generateMarkdownReport(format === 'detailed');
        extension = 'md';
        break;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `code-structure-review-${format}-${timestamp}.${extension}`;
    const filePath = vscode.Uri.joinPath(workspace.uri, fileName);

    await vscode.workspace.fs.writeFile(filePath, Buffer.from(content, 'utf-8'));

    const doc = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(doc);

    vscode.window.showInformationMessage(`Report exported to ${fileName}`);
  }

  /**
   * Generate markdown report
   */
  private generateMarkdownReport(detailed: boolean): string {
    if (!this.currentAnalysis) {
      return '# No analysis available\n';
    }

    let md = '# Code Structure Review Report\n\n';
    md += `**Generated**: ${new Date().toLocaleString()}\n`;
    md += `**Overall Score**: ${this.currentAnalysis.summary.overallScore}/100\n`;
    md += `**Total Issues**: ${this.currentAnalysis.summary.totalIssues}\n\n`;

    md += '## Summary by Category\n\n';
    this.currentAnalysis.categories.forEach(cat => {
      md += `### ${cat.categoryName}\n`;
      md += `- **Score**: ${cat.score}/100 (${cat.status})\n`;
      md += `- **Priority**: ${cat.priority}\n`;
      md += `- **Issues**: ${cat.issues.length}\n`;
      md += `- **Summary**: ${cat.summary}\n\n`;
    });

    if (detailed) {
      md += '## Detailed Issues\n\n';
      this.currentAnalysis.categories.forEach(cat => {
        md += `### ${cat.categoryName}\n\n`;
        cat.issues.forEach((issue, i) => {
          md += `#### ${i + 1}. ${issue.title}\n`;
          md += `- **Severity**: ${issue.severity}\n`;
          md += `- **File**: \`${issue.filePath}\`${issue.lineNumber ? ` (line ${issue.lineNumber})` : ''}\n`;
          md += `- **Description**: ${issue.description}\n`;
          md += `- **Recommendation**: ${issue.recommendation}\n\n`;
        });
      });
    }

    return md;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.statusBarItem?.dispose();
    this.cancellationTokenSource?.dispose();
  }
}
