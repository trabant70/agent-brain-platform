/**
 * Generates knowledge items from code structure issues
 */

import type {
  Issue,
  CategoryAnalysis,
  CodeStructureKnowledgeItem
} from '../types';

/**
 * Converts analysis issues into knowledge items
 */
export class KnowledgeItemGenerator {
  /**
   * Generate knowledge item from issue
   */
  generateFromIssue(
    issue: Issue,
    categoryName: string
  ): CodeStructureKnowledgeItem {
    const type = this.determineKnowledgeType(issue);
    const title = this.generateTitle(issue);
    const content = this.generateContent(issue, categoryName);
    const tags = this.generateTags(issue, categoryName);

    return {
      type,
      title,
      content,
      tags,
      source: 'code-structure-review',
      metadata: {
        categoryId: issue.category,
        issueId: issue.id,
        severity: issue.severity,
        filePath: issue.filePath,
        analysisTimestamp: new Date()
      }
    };
  }

  /**
   * Determine knowledge item type from issue
   */
  private determineKnowledgeType(
    issue: Issue
  ): 'learning' | 'gotcha' | 'best-practice' | 'adr' {
    // Critical/High severity issues become learnings or best practices
    if (issue.severity === 'critical' || issue.severity === 'high') {
      return issue.aiPromptHint ? 'learning' : 'best-practice';
    }

    // Medium severity issues are typically gotchas
    if (issue.severity === 'medium') {
      return 'gotcha';
    }

    // Low severity are tips/learnings
    return 'learning';
  }

  /**
   * Generate knowledge item title
   */
  private generateTitle(issue: Issue): string {
    // Convert issue title to imperative form
    const title = issue.title;

    // Remove component/file names for generalization
    const generalTitle = title
      .replace(/in [A-Z][a-zA-Z0-9]+/g, '') // Remove "in ComponentName"
      .replace(/:\s*.+$/, '') // Remove everything after colon
      .trim();

    // Convert to imperative
    const imperative = this.toImperative(generalTitle);

    return imperative;
  }

  /**
   * Convert to imperative form
   */
  private toImperative(text: string): string {
    // Simple heuristics
    if (text.startsWith('Missing ')) {
      return text.replace('Missing ', 'Always add ');
    }
    if (text.startsWith('No ')) {
      return text.replace('No ', 'Provide ');
    }
    if (text.includes('without')) {
      return text.replace(' without ', ' with ');
    }
    return text;
  }

  /**
   * Generate knowledge item content
   */
  private generateContent(issue: Issue, categoryName: string): string {
    let content = `## Problem\n\n${issue.description}\n\n`;

    content += `## Context\n\nDetected in: \`${issue.filePath}\`\n`;
    if (issue.lineNumber) {
      content += `Line: ${issue.lineNumber}\n`;
    }
    content += `Category: ${categoryName}\n`;
    content += `Severity: ${issue.severity}\n\n`;

    if (issue.fixSuggestion) {
      content += `## Solution\n\n${issue.fixSuggestion}\n\n`;
    }

    content += `## Why This Matters\n\n`;
    content += this.explainImportance(issue);

    if (issue.aiPromptHint) {
      content += `\n\n## Getting Help\n\n${issue.aiPromptHint}\n`;
    }

    content += `\n\n---\n*Discovered by Code Structure Review on ${new Date().toISOString().split('T')[0]}*`;

    return content;
  }

  /**
   * Explain why issue is important
   */
  private explainImportance(issue: Issue): string {
    const importanceMap: Record<string, string> = {
      critical:
        'This is a critical issue that can cause runtime errors or severely impact user experience. It should be fixed immediately.',
      high: 'This issue significantly affects code quality and user experience. It should be prioritized in the next development cycle.',
      medium:
        'This issue impacts maintainability and consistency. Address it when time permits.',
      low: 'This is a minor issue that improves code quality. Consider fixing during refactoring.'
    };

    return (
      importanceMap[issue.severity] ||
      'This issue affects code quality and should be addressed.'
    );
  }

  /**
   * Generate tags for knowledge item
   */
  private generateTags(issue: Issue, categoryName: string): string[] {
    const tags: string[] = [];

    // Add category tag
    tags.push(categoryName.toLowerCase().replace(/\s+/g, '-'));

    // Add severity tag
    tags.push(issue.severity);

    // Add detector-specific tags
    if (issue.detectorId) {
      const detectorTags = this.getDetectorTags(issue.detectorId);
      tags.push(...detectorTags);
    }

    // Add technology tags based on file path
    const techTags = this.getTechnologyTags(issue.filePath);
    tags.push(...techTags);

    return Array.from(new Set(tags)); // Unique tags
  }

  /**
   * Get tags from detector ID
   */
  private getDetectorTags(detectorId: string): string[] {
    const tagMap: Record<string, string[]> = {
      'endpoint-detector': ['api', 'backend', 'routes'],
      'api-call-detector': ['api', 'frontend', 'http'],
      'mock-detector': ['testing', 'mock', 'stub'],
      'loading-state-detector': ['ux', 'loading', 'async'],
      'error-handling-detector': ['error-handling', 'exceptions'],
      'empty-state-detector': ['ux', 'empty-state'],
      'form-validation-detector': ['forms', 'validation'],
      'accessibility-detector': ['a11y', 'wcag', 'accessibility'],
      'hardcoded-string-detector': ['i18n', 'translation'],
      'datetime-format-detector': ['i18n', 'datetime', 'locale'],
      'test-coverage-detector': ['testing', 'coverage']
    };

    return tagMap[detectorId] || [];
  }

  /**
   * Get technology tags from file path
   */
  private getTechnologyTags(filePath: string): string[] {
    const tags: string[] = [];

    if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
      tags.push('react');
    }
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      tags.push('typescript');
    }
    if (filePath.includes('/components/')) {
      tags.push('components');
    }
    if (filePath.includes('/api/') || filePath.includes('/routes/')) {
      tags.push('api');
    }

    return tags;
  }

  /**
   * Generate multiple knowledge items from category
   */
  generateFromCategory(
    category: CategoryAnalysis,
    maxItems: number = 5
  ): CodeStructureKnowledgeItem[] {
    // Get top issues by severity
    const topIssues = category.issues
      .filter(i => i.severity === 'critical' || i.severity === 'high')
      .slice(0, maxItems);

    return topIssues.map(issue =>
      this.generateFromIssue(issue, category.categoryName)
    );
  }
}
