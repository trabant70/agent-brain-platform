/**
 * Code Structure Review Provider
 * VSCode-specific implementation for code structure analysis
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  CategoryOrchestrator,
  SourceFileParser,
  createAnalysisContext,
  CategoryRegistry,
  FeatureCompletenessAnalyzer,
  UIUXQualityAnalyzer,
  TestCoverageAnalyzer,
  InternationalizationAnalyzer,
  PromptGenerator,
  ReportGenerator,
  VisualizationDataBuilder,
  KnowledgeItemGenerator,
  type CodeStructureAnalysis,
  type AnalysisConfig,
  type MaturityLevel
} from '@agent-brain/core/domains/code-structure-review';

/**
 * Provides code structure review functionality for VSCode
 */
export class CodeStructureReviewProvider {
  private orchestrator: CategoryOrchestrator;
  private parser: SourceFileParser;
  private promptGenerator: PromptGenerator;
  private reportGenerator: ReportGenerator;
  private vizBuilder: VisualizationDataBuilder;
  private knowledgeGenerator: KnowledgeItemGenerator;
  private registry: CategoryRegistry;
  private currentAnalysis?: CodeStructureAnalysis;
  private statusBarItem?: vscode.StatusBarItem;

  constructor() {
    this.registry = CategoryRegistry.getInstance();
    this.initializeAnalyzers();

    this.orchestrator = new CategoryOrchestrator(this.registry);
    this.parser = new SourceFileParser();
    this.promptGenerator = new PromptGenerator();
    this.reportGenerator = new ReportGenerator();
    this.vizBuilder = new VisualizationDataBuilder();
    this.knowledgeGenerator = new KnowledgeItemGenerator();

    this.setupEventListeners();
  }

  /**
   * Initialize and register analyzers
   */
  private initializeAnalyzers(): void {
    this.registry.clear();
    this.registry.register(new FeatureCompletenessAnalyzer());
    this.registry.register(new UIUXQualityAnalyzer());
    this.registry.register(new TestCoverageAnalyzer());
    this.registry.register(new InternationalizationAnalyzer());
  }

  /**
   * Set up event listeners for analysis progress
   */
  private setupEventListeners(): void {
    this.orchestrator.addEventListener((event) => {
      switch (event.type) {
        case 'analysis-start':
          console.log('[CodeStructureReview] Analysis started');
          break;
        case 'category-complete':
          console.log(
            `[CodeStructureReview] Category ${event.categoryId} completed in ${event.duration}ms`
          );
          break;
        case 'analysis-complete':
          console.log(
            `[CodeStructureReview] Analysis complete in ${event.duration}ms`
          );
          break;
        case 'analysis-error':
          console.error(
            `[CodeStructureReview] Analysis error in ${event.categoryId}:`,
            event.error
          );
          break;
      }
    });
  }

  /**
   * Run full analysis on workspace
   */
  async analyzeWorkspace(
    workspaceFolder?: vscode.WorkspaceFolder,
    options?: Partial<AnalysisConfig>
  ): Promise<CodeStructureAnalysis> {
    const folder =
      workspaceFolder || vscode.workspace.workspaceFolders?.[0];

    if (!folder) {
      throw new Error('No workspace folder open');
    }

    // Show progress
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Analyzing Code Structure',
        cancellable: false
      },
      async (progress) => {
        try {
          // Step 1: Scan files
          progress.report({ message: 'Scanning files...', increment: 10 });
          const files = await this.scanWorkspaceFiles(folder.uri.fsPath);

          // Step 2: Parse files
          progress.report({ message: 'Parsing files...', increment: 20 });
          const sourceFiles = await this.parseFiles(files);

          // Step 3: Create context
          const config = this.getAnalysisConfig(options);
          const context = createAnalysisContext(sourceFiles, config);

          // Step 4: Run analysis
          progress.report({ message: 'Analyzing code...', increment: 30 });
          const analysis = await this.orchestrator.analyze(context);

          // Update workspace path
          analysis.workspace = folder.uri.fsPath;

          // Step 5: Cache results
          progress.report({ message: 'Finalizing...', increment: 40 });
          this.currentAnalysis = analysis;

          // Update status bar
          this.updateStatusBar(analysis);

          return analysis;
        } catch (error) {
          vscode.window.showErrorMessage(
            `Code structure analysis failed: ${error.message}`
          );
          throw error;
        }
      }
    );
  }

  /**
   * Run quick analysis (Priority 1 categories only)
   */
  async quickAnalyze(
    workspaceFolder?: vscode.WorkspaceFolder
  ): Promise<CodeStructureAnalysis> {
    const folder =
      workspaceFolder || vscode.workspace.workspaceFolders?.[0];

    if (!folder) {
      throw new Error('No workspace folder open');
    }

    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Quick Code Analysis',
        cancellable: false
      },
      async (progress) => {
        progress.report({ message: 'Scanning...', increment: 20 });
        const files = await this.scanWorkspaceFiles(folder.uri.fsPath);

        progress.report({ message: 'Analyzing...', increment: 40 });
        const sourceFiles = await this.parseFiles(files);
        const context = createAnalysisContext(sourceFiles);

        const analysis = await this.orchestrator.quickAnalyze(context);
        analysis.workspace = folder.uri.fsPath;

        this.currentAnalysis = analysis;
        this.updateStatusBar(analysis);

        return analysis;
      }
    );
  }

  /**
   * Scan workspace for code files
   */
  private async scanWorkspaceFiles(
    workspacePath: string
  ): Promise<Array<{ path: string; content: string }>> {
    const config = vscode.workspace.getConfiguration('agentBrain.codeStructureReview');
    const includePatterns = config.get<string[]>('includePatterns', [
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx'
    ]);

    const excludePatterns = config.get<string[]>('excludePatterns', [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/*.test.ts',
      '**/*.spec.ts'
    ]);

    const files: Array<{ path: string; content: string }> = [];

    // Use VSCode's file search
    for (const pattern of includePatterns) {
      const uris = await vscode.workspace.findFiles(
        pattern,
        `{${excludePatterns.join(',')}}`
      );

      for (const uri of uris) {
        try {
          const content = await fs.readFile(uri.fsPath, 'utf-8');
          const relativePath = path.relative(workspacePath, uri.fsPath);
          files.push({ path: relativePath, content });
        } catch (error) {
          console.warn(`Failed to read file ${uri.fsPath}:`, error);
        }
      }
    }

    return files;
  }

  /**
   * Parse files to SourceFile format
   */
  private async parseFiles(
    files: Array<{ path: string; content: string }>
  ): Promise<ReturnType<SourceFileParser['parseMultiple']>> {
    return this.parser.parseMultiple(files);
  }

  /**
   * Get analysis configuration from VSCode settings
   */
  private getAnalysisConfig(
    overrides?: Partial<AnalysisConfig>
  ): AnalysisConfig {
    const config = vscode.workspace.getConfiguration('agentBrain.codeStructureReview');

    return {
      enabledCategories: config.get<string[]>('enabledCategories', []),
      excludePatterns: config.get<string[]>('excludePatterns', [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/*.test.ts',
        '**/*.spec.ts'
      ]),
      includePatterns: config.get<string[]>('includePatterns', [
        '**/*.ts',
        '**/*.tsx',
        '**/*.js',
        '**/*.jsx'
      ]),
      ...overrides
    };
  }

  /**
   * Update status bar with analysis results
   */
  private updateStatusBar(analysis: CodeStructureAnalysis): void {
    if (!this.statusBarItem) {
      this.statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
      );
    }

    const score = analysis.summary.overallScore;
    const icon = this.getStatusIcon(score);

    this.statusBarItem.text = `${icon} Code: ${score}/100`;
    this.statusBarItem.tooltip = `Code Structure Score: ${score}/100\nIssues: ${analysis.summary.totalIssues}\nClick for details`;
    this.statusBarItem.command = 'agentBrain.showCodeStructureReview';
    this.statusBarItem.show();
  }

  /**
   * Get status icon based on score
   */
  private getStatusIcon(score: number): string {
    if (score >= 90) return '✅';
    if (score >= 70) return '👍';
    if (score >= 50) return '⚠️';
    return '❌';
  }

  /**
   * Generate AI prompt for current analysis
   */
  async generatePrompt(
    categoryId?: string,
    maturityLevel?: MaturityLevel
  ): Promise<string> {
    if (!this.currentAnalysis) {
      throw new Error('No analysis available. Run analysis first.');
    }

    const level =
      maturityLevel ||
      vscode.workspace
        .getConfiguration('agentBrain.codeStructureReview')
        .get<MaturityLevel>('defaultMaturityLevel', 'intermediate');

    if (categoryId) {
      const category = this.currentAnalysis.categories.find(
        (c) => c.categoryId === categoryId
      );
      if (!category) {
        throw new Error(`Category ${categoryId} not found`);
      }

      const prompt = this.promptGenerator.generatePrompt(category, level);
      return prompt?.prompt || 'No prompt generated';
    } else {
      const prompt = this.promptGenerator.generateTopPriorityPrompt(
        this.currentAnalysis,
        level
      );
      return prompt?.prompt || 'No issues found';
    }
  }

  /**
   * Generate report
   */
  async generateReport(format: 'summary' | 'detailed' | 'json' | 'csv' = 'summary'): Promise<string> {
    if (!this.currentAnalysis) {
      throw new Error('No analysis available. Run analysis first.');
    }

    switch (format) {
      case 'summary':
        return this.reportGenerator.generateExecutiveSummary(this.currentAnalysis);
      case 'detailed':
        return this.reportGenerator.generateDetailedReport(this.currentAnalysis);
      case 'json':
        return this.reportGenerator.generateJSONReport(this.currentAnalysis);
      case 'csv':
        return this.reportGenerator.generateCSVReport(this.currentAnalysis);
      default:
        return this.reportGenerator.generateExecutiveSummary(this.currentAnalysis);
    }
  }

  /**
   * Export report to file
   */
  async exportReport(format: 'summary' | 'detailed' | 'json' | 'csv'): Promise<void> {
    const report = await this.generateReport(format);

    const extension = format === 'json' ? 'json' : format === 'csv' ? 'csv' : 'md';
    const defaultUri = vscode.Uri.file(
      path.join(
        vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
        `code-structure-review.${extension}`
      )
    );

    const uri = await vscode.window.showSaveDialog({
      defaultUri,
      filters: {
        'Report': [extension]
      }
    });

    if (uri) {
      await fs.writeFile(uri.fsPath, report, 'utf-8');
      vscode.window.showInformationMessage(`Report exported to ${uri.fsPath}`);
    }
  }

  /**
   * Get current analysis
   */
  getCurrentAnalysis(): CodeStructureAnalysis | undefined {
    return this.currentAnalysis;
  }

  /**
   * Get visualization data
   */
  getVisualizationData() {
    if (!this.currentAnalysis) {
      throw new Error('No analysis available. Run analysis first.');
    }

    return this.vizBuilder.buildAllVisualizations(this.currentAnalysis);
  }

  /**
   * Generate knowledge items from analysis
   */
  generateKnowledgeItems(maxPerCategory: number = 3): Array<any> {
    if (!this.currentAnalysis) {
      throw new Error('No analysis available. Run analysis first.');
    }

    const items: any[] = [];

    this.currentAnalysis.categories.forEach((category) => {
      const categoryItems = this.knowledgeGenerator.generateFromCategory(
        category,
        maxPerCategory
      );
      items.push(...categoryItems);
    });

    return items;
  }

  /**
   * Dispose provider
   */
  dispose(): void {
    this.statusBarItem?.dispose();
    this.parser.clearCache();
  }
}
