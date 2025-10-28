/**
 * AI Prompt Generator
 * Generates context-aware prompts based on analysis results and maturity level
 */

import type {
  CodeStructureAnalysis,
  CategoryAnalysis,
  Issue,
  GeneratedPrompt,
  PromptContext,
  CodeSnippet,
  MaturityLevel,
  AIPromptTemplate
} from '../types';
import { getPromptTemplate } from './PromptTemplates';

/**
 * Generates AI prompts from analysis results
 */
export class PromptGenerator {
  /**
   * Generate prompt for a specific category and maturity level
   */
  generatePrompt(
    categoryAnalysis: CategoryAnalysis,
    maturityLevel: MaturityLevel,
    codeSnippets?: CodeSnippet[]
  ): GeneratedPrompt | null {
    const template = getPromptTemplate(categoryAnalysis.categoryId, maturityLevel);

    if (!template) {
      console.warn(
        `No prompt template found for ${categoryAnalysis.categoryId} at ${maturityLevel} level`
      );
      return null;
    }

    // Build context
    const context = this.buildPromptContext(
      categoryAnalysis,
      maturityLevel,
      codeSnippets
    );

    // Substitute variables in template
    const prompt = this.substituteVariables(template, categoryAnalysis, context);

    return {
      templateId: template.id,
      prompt,
      context,
      threadingMetadata: {
        category: categoryAnalysis.categoryId,
        maturityLevel,
        issueCount: categoryAnalysis.issues.length,
        score: categoryAnalysis.score
      }
    };
  }

  /**
   * Build prompt context from analysis
   */
  private buildPromptContext(
    categoryAnalysis: CategoryAnalysis,
    maturityLevel: MaturityLevel,
    codeSnippets?: CodeSnippet[]
  ): PromptContext {
    const topIssues = this.getTopIssues(categoryAnalysis.issues, 5);

    return {
      categoryId: categoryAnalysis.categoryId,
      maturityLevel,
      relatedIssues: topIssues,
      relevantMetrics: categoryAnalysis.metrics,
      codeSnippets: codeSnippets || []
    };
  }

  /**
   * Get top issues by severity
   */
  private getTopIssues(issues: Issue[], limit: number = 5): Issue[] {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

    return issues
      .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
      .slice(0, limit);
  }

  /**
   * Substitute variables in template
   */
  private substituteVariables(
    template: AIPromptTemplate,
    categoryAnalysis: CategoryAnalysis,
    context: PromptContext
  ): string {
    let prompt = template.template;

    // Get top issue
    const topIssue = context.relatedIssues[0];

    // Build variable map
    const variables: Record<string, string> = {
      issueCount: categoryAnalysis.issues.length.toString(),
      topIssue: topIssue ? topIssue.title : 'No issues found',
      categoryName: categoryAnalysis.categoryName,
      score: categoryAnalysis.score.toString(),
      status: categoryAnalysis.status,
      filePath: topIssue?.filePath || 'N/A',
      lineNumber: topIssue?.lineNumber?.toString() || 'N/A',
      componentName: this.extractComponentName(topIssue?.filePath),
      issueType: topIssue?.detectorId || 'unknown',
      ...this.buildMetricVariables(categoryAnalysis.metrics),
      codeSnippet: this.buildCodeSnippet(context.codeSnippets[0]),
      codeSnippets: this.buildCodeSnippets(context.codeSnippets),
      relatedIssues: this.buildRelatedIssues(context.relatedIssues.slice(1, 4)),
      affectedFiles: this.buildAffectedFiles(context.relatedIssues)
    };

    // Replace all variables
    template.variables.forEach(varName => {
      const value = variables[varName] || `[${varName}]`;
      prompt = prompt.replace(new RegExp(`{{${varName}}}`, 'g'), value);
    });

    return prompt;
  }

  /**
   * Build metric variables
   */
  private buildMetricVariables(metrics: Record<string, number>): Record<string, string> {
    const vars: Record<string, string> = {};

    // Map common metric names to variable names
    const metricMap: Record<string, string> = {
      disconnectedEndpoints: 'disconnectedEndpoints',
      connectedEndpoints: 'connectedEndpoints',
      endpointConnectionRate: 'connectionRate',
      featureCompleteness: 'completeness',
      loadingStateIssues: 'loadingIssues',
      errorHandlingIssues: 'errorIssues',
      emptyStateIssues: 'emptyStateIssues',
      overallUXQuality: 'uxScore',
      asyncOperationsCoverage: 'asyncCoverage',
      accessibilityIssues: 'a11yIssues',
      totalComponents: 'componentCount',
      hardcodedStrings: 'hardcodedCount',
      dateTimeIssues: 'datetimeCount',
      numberFormatIssues: 'numberCount',
      i18nCoverage: 'i18nCoverage',
      untestedFiles: 'untestedCount',
      testCoverage: 'coverage',
      criticalUntestedFiles: 'criticalUntested',
      mockedServices: 'mockedServices',
      missingFrontend: 'missingFrontend'
    };

    Object.keys(metrics).forEach(metricKey => {
      const varName = metricMap[metricKey] || metricKey;
      vars[varName] = metrics[metricKey].toString();
    });

    return vars;
  }

  /**
   * Extract component name from file path
   */
  private extractComponentName(filePath?: string): string {
    if (!filePath) return 'Unknown';

    const parts = filePath.split('/');
    const fileName = parts[parts.length - 1];
    return fileName.replace(/\.(tsx?|jsx?)$/, '');
  }

  /**
   * Build code snippet display
   */
  private buildCodeSnippet(snippet?: CodeSnippet): string {
    if (!snippet) return '[No code snippet available]';

    return `\`\`\`${snippet.language}
// ${snippet.filePath}:${snippet.lineStart}
${snippet.content}
\`\`\``;
  }

  /**
   * Build multiple code snippets
   */
  private buildCodeSnippets(snippets: CodeSnippet[]): string {
    if (snippets.length === 0) return '[No code snippets available]';

    return snippets.map(s => this.buildCodeSnippet(s)).join('\n\n');
  }

  /**
   * Build related issues list
   */
  private buildRelatedIssues(issues: Issue[]): string {
    if (issues.length === 0) return 'None';

    return issues
      .map((issue, index) => `${index + 1}. ${issue.title} (${issue.filePath}:${issue.lineNumber || '?'})`)
      .join('\n');
  }

  /**
   * Build affected files list
   */
  private buildAffectedFiles(issues: Issue[]): string {
    const uniqueFiles = new Set(issues.map(i => i.filePath));
    return Array.from(uniqueFiles).join('\n');
  }

  /**
   * Generate prompts for all categories in analysis
   */
  generateAllPrompts(
    analysis: CodeStructureAnalysis,
    maturityLevel: MaturityLevel
  ): GeneratedPrompt[] {
    const prompts: GeneratedPrompt[] = [];

    analysis.categories.forEach(category => {
      // Only generate prompts for categories with issues
      if (category.issues.length > 0) {
        const prompt = this.generatePrompt(category, maturityLevel);
        if (prompt) {
          prompts.push(prompt);
        }
      }
    });

    return prompts;
  }

  /**
   * Generate prompt for top priority issue
   */
  generateTopPriorityPrompt(
    analysis: CodeStructureAnalysis,
    maturityLevel: MaturityLevel
  ): GeneratedPrompt | null {
    // Find category with most critical/high issues
    const sortedCategories = analysis.categories.sort((a, b) => {
      const aCritical = a.issues.filter(i => i.severity === 'critical').length;
      const bCritical = b.issues.filter(i => i.severity === 'critical').length;

      if (aCritical !== bCritical) return bCritical - aCritical;

      const aHigh = a.issues.filter(i => i.severity === 'high').length;
      const bHigh = b.issues.filter(i => i.severity === 'high').length;

      return bHigh - aHigh;
    });

    const topCategory = sortedCategories[0];
    if (!topCategory || topCategory.issues.length === 0) {
      return null;
    }

    return this.generatePrompt(topCategory, maturityLevel);
  }
}
