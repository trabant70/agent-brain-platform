/**
 * Suggestion Engine
 * Analyzes code structure data and generates AI-powered suggestions
 * for improving code quality, fixing issues, and optimizing workflows
 *
 * Enhanced with pattern detection and maturity-aware filtering
 */

import type { AnalysisData } from '../coordination/AnalysisDataMapper';
import type {
  CodeStructureAnalysis,
  MaturityLevel,
  Pattern,
  UserContext
} from '../../../code-structure-review/types';
import { PatternDetector } from './PatternDetector';
import { PromptGenerator } from '../../../code-structure-review/ai/PromptGenerator';

/**
 * Suggestion types (backward compatible + new types)
 */
export type SuggestionType =
  | 'critical'
  | 'high'
  | 'refactoring'
  | 'best-practice'
  | 'quick-win'
  | 'critical-fix'
  | 'systemic-improvement'
  | 'testing'
  | 'documentation'
  | 'accessibility'
  | 'i18n'
  | 'performance';

/**
 * Suggestion action types
 */
export type SuggestionActionType = 'fix-issue' | 'refactor-file' | 'add-tests' | 'improve-documentation' | 'focus-category' | 'improve-ux' | 'extract-strings';

/**
 * Impact level
 */
export type ImpactLevel = 'high' | 'medium' | 'low';

/**
 * Effort level
 */
export type EffortLevel = 'low' | 'medium' | 'high';

/**
 * Urgency level
 */
export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';

/**
 * Suggestion interface (enhanced)
 */
export interface Suggestion {
  id: string;
  type: SuggestionType;
  title: string;
  description: string;
  category?: string;
  file?: string;
  impact: ImpactLevel;
  effort: EffortLevel;
  urgency?: UrgencyLevel;
  action: {
    type: SuggestionActionType;
    data: any;
  };
  priority: number; // 1-100, higher is more important
  relatedIssues?: string[];
  affectedFiles?: string[];
  aiPrompt?: string;
  learnMoreUrl?: string;
  tags?: string[];
  maturityLevel?: MaturityLevel;
}

/**
 * Suggestion Engine
 */
export class SuggestionEngine {
  private patternDetector: PatternDetector;
  private promptGenerator: PromptGenerator;
  private userContext: UserContext = {
    recentFiles: [],
    recentCategories: [],
    dismissedSuggestions: [],
    completedActions: []
  };

  constructor() {
    this.patternDetector = new PatternDetector();
    this.promptGenerator = new PromptGenerator();
  }

  /**
   * Generate suggestions from CodeStructureAnalysis (new enhanced method)
   */
  generateEnhancedSuggestions(
    analysis: CodeStructureAnalysis,
    maturityLevel: MaturityLevel = 'intermediate',
    context?: Partial<UserContext>
  ): Suggestion[] {
    // Update user context
    if (context) {
      this.userContext = { ...this.userContext, ...context };
    }

    // Detect patterns
    const patterns = this.patternDetector.detectPatterns(analysis);

    const suggestions: Suggestion[] = [];

    // Generate pattern-based suggestions
    for (const pattern of patterns) {
      const allIssues = analysis.categories.flatMap(c => c.issues);
      const issues = allIssues.filter(i => pattern.issueIds.includes(i.id));
      const category = analysis.categories.find(c => pattern.categories.includes(c.categoryId));

      if (!category || issues.length === 0) continue;

      // Determine suggestion type
      const type = this.determineSuggestionType(pattern);

      // Generate AI prompt
      const aiPrompt = this.generatePatternAIPrompt(category, pattern, issues, maturityLevel);

      suggestions.push({
        id: `pattern-${pattern.name}-${Date.now()}`,
        type,
        title: `${pattern.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}: ${issues.length} issues`,
        description: `${pattern.description}. ${pattern.fixStrategy}`,
        category: category.categoryId,
        impact: pattern.potentialImpact,
        effort: pattern.estimatedEffort,
        urgency: pattern.totalIssues >= 10 ? 'high' : 'medium',
        action: {
          type: this.mapCategoryToActionType(category.categoryId),
          data: { pattern, issues: issues.slice(0, 5) }
        },
        priority: 0, // Will be calculated
        relatedIssues: pattern.issueIds,
        affectedFiles: [...new Set(issues.map(i => i.filePath))],
        aiPrompt,
        learnMoreUrl: this.getPatternLearnMoreUrl(pattern.name),
        tags: ['pattern', pattern.name, category.categoryId],
        maturityLevel
      });
    }

    // Calculate priorities for all suggestions
    suggestions.forEach(s => {
      s.priority = this.calculateEnhancedPriority(s, patterns);
    });

    // Filter and sort by maturity level
    const filtered = this.filterByMaturityLevel(suggestions, maturityLevel);
    const sorted = filtered.sort((a, b) => b.priority - a.priority);

    // Filter out dismissed suggestions
    return sorted.filter(s => !this.userContext.dismissedSuggestions.includes(s.id));
  }

  /**
   * Generate suggestions based on analysis data (original method - backward compatible)
   */
  generateSuggestions(analysis: AnalysisData): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // Rule 1: Critical security/bug issues
    if (analysis.summary?.criticalIssues && analysis.summary.criticalIssues >= 10) {
      suggestions.push(this.createCriticalIssuesSuggestion(analysis));
    } else if (analysis.summary?.criticalIssues && analysis.summary.criticalIssues > 0) {
      suggestions.push(this.createCriticalIssuesSuggestion(analysis));
    }

    // Rule 2: Low test coverage
    if (analysis.testCoverage?.overall !== undefined && analysis.testCoverage.overall < 50) {
      suggestions.push(this.createTestCoverageSuggestion(analysis));
    }

    // Rule 3: Category health issues
    const unhealthyCategories = (analysis.categories || []).filter(
      cat => (cat.score || 0) < 40
    );
    unhealthyCategories.forEach(cat => {
      suggestions.push(this.createCategoryHealthSuggestion(cat, analysis));
    });

    // Rule 4: File hotspots (files with many issues)
    const fileHotspots = this.findFileHotspots(analysis);
    fileHotspots.forEach(file => {
      suggestions.push(this.createFileHotspotSuggestion(file, analysis));
    });

    // Rule 5: High complexity files
    const filesArray = Array.isArray(analysis.files) ? analysis.files : [];
    const complexFiles = filesArray.filter(
      file => (file.complexity || 0) > 20
    );
    complexFiles.slice(0, 3).forEach(file => {
      suggestions.push(this.createComplexitySuggestion(file, analysis));
    });

    // Rule 6: Quick wins (high severity, many issues)
    if (analysis.summary?.highIssues && analysis.summary.highIssues >= 5) {
      suggestions.push(this.createQuickWinsSuggestion(analysis));
    }

    // Sort by priority (highest first)
    return suggestions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Create suggestion for critical issues
   */
  private createCriticalIssuesSuggestion(analysis: AnalysisData): Suggestion {
    const criticalCount = analysis.summary?.criticalIssues || 0;
    const priority = criticalCount >= 10 ? 10 : 9;

    return {
      id: 'critical-issues',
      type: 'critical',
      title: `Address ${criticalCount} Critical Issue${criticalCount !== 1 ? 's' : ''}`,
      description: `There are ${criticalCount} critical severity issues that need immediate attention. These may include security vulnerabilities, data corruption risks, or system crashes.`,
      impact: 'high',
      effort: criticalCount >= 10 ? 'high' : 'medium',
      action: {
        type: 'fix-issue',
        data: {
          severity: 'critical',
          count: criticalCount
        }
      },
      priority
    };
  }

  /**
   * Create suggestion for test coverage
   */
  private createTestCoverageSuggestion(analysis: AnalysisData): Suggestion {
    const coverage = analysis.testCoverage?.overall || 0;
    const filesWithLowCoverage = (analysis.testCoverage?.files || []).filter(
      f => f.coverage < 50
    ).length;

    return {
      id: 'test-coverage',
      type: 'best-practice',
      title: `Improve Test Coverage (Currently ${Math.round(coverage)}%)`,
      description: `Test coverage is below 50%, with ${filesWithLowCoverage} file${filesWithLowCoverage !== 1 ? 's' : ''} needing more tests. Increasing test coverage will improve code reliability and catch bugs earlier.`,
      impact: 'high',
      effort: 'high',
      action: {
        type: 'add-tests',
        data: {
          currentCoverage: coverage,
          targetCoverage: 80,
          filesNeedingTests: filesWithLowCoverage
        }
      },
      priority: 6
    };
  }

  /**
   * Create suggestion for unhealthy category
   */
  private createCategoryHealthSuggestion(category: any, analysis: AnalysisData): Suggestion {
    const score = category.score || 0;
    const issueCount = category.issues?.length || 0;

    return {
      id: `category-${category.categoryId}`,
      type: score < 20 ? 'critical' : 'high',
      title: `Focus on ${category.categoryName} (Score: ${score}/100)`,
      description: `The ${category.categoryName} category has ${issueCount} issue${issueCount !== 1 ? 's' : ''} and needs attention. Addressing these issues will significantly improve overall code quality.`,
      category: category.categoryName,
      impact: 'high',
      effort: issueCount > 20 ? 'high' : 'medium',
      action: {
        type: 'focus-category',
        data: {
          categoryId: category.categoryId,
          categoryName: category.categoryName,
          score,
          issueCount
        }
      },
      priority: score < 20 ? 8 : 7
    };
  }

  /**
   * Create suggestion for file hotspot
   */
  private createFileHotspotSuggestion(file: any, analysis: AnalysisData): Suggestion {
    return {
      id: `hotspot-${file.path}`,
      type: 'refactoring',
      title: `Refactor ${this.getFileName(file.path)}`,
      description: `This file has ${file.issueCount} issue${file.issueCount !== 1 ? 's' : ''} concentrated in one place. Consider breaking it into smaller, more manageable modules.`,
      file: file.path,
      impact: 'medium',
      effort: 'medium',
      action: {
        type: 'refactor-file',
        data: {
          filePath: file.path,
          issueCount: file.issueCount,
          complexity: file.complexity
        }
      },
      priority: 5
    };
  }

  /**
   * Create suggestion for high complexity
   */
  private createComplexitySuggestion(file: any, analysis: AnalysisData): Suggestion {
    const complexity = file.complexity || 0;

    return {
      id: `complexity-${file.path}`,
      type: 'refactoring',
      title: `Reduce Complexity in ${this.getFileName(file.path)}`,
      description: `This file has high cyclomatic complexity (${complexity}). Consider extracting functions, simplifying logic, or applying design patterns.`,
      file: file.path,
      impact: 'medium',
      effort: complexity > 30 ? 'high' : 'medium',
      action: {
        type: 'refactor-file',
        data: {
          filePath: file.path,
          complexity,
          reason: 'high-complexity'
        }
      },
      priority: 4
    };
  }

  /**
   * Create suggestion for quick wins
   */
  private createQuickWinsSuggestion(analysis: AnalysisData): Suggestion {
    const highCount = analysis.summary?.highIssues || 0;

    return {
      id: 'quick-wins',
      type: 'quick-win',
      title: `Quick Wins: ${highCount} High Priority Issues`,
      description: `There are ${highCount} high-priority issues that can be addressed relatively quickly. Tackling these will provide visible improvements with moderate effort.`,
      impact: 'medium',
      effort: 'low',
      action: {
        type: 'fix-issue',
        data: {
          severity: 'high',
          count: highCount
        }
      },
      priority: 6
    };
  }

  /**
   * Find files with many issues (hotspots)
   */
  private findFileHotspots(analysis: AnalysisData): any[] {
    const fileIssueMap = new Map<string, number>();

    // Count issues per file
    (analysis.categories || []).forEach(category => {
      (category.issues || []).forEach(issue => {
        if (issue.filePath) {
          fileIssueMap.set(issue.filePath, (fileIssueMap.get(issue.filePath) || 0) + 1);
        }
      });
    });

    // Find files with 5+ issues
    const hotspots: any[] = [];
    const filesArray = Array.isArray(analysis.files) ? analysis.files : [];
    fileIssueMap.forEach((count, path) => {
      if (count >= 5) {
        const file = filesArray.find(f => f.path === path);
        hotspots.push({
          path,
          issueCount: count,
          complexity: file?.complexity || 0
        });
      }
    });

    // Sort by issue count (descending) and return top 3
    return hotspots
      .sort((a, b) => b.issueCount - a.issueCount)
      .slice(0, 3);
  }

  /**
   * Get file name from path
   */
  private getFileName(path: string): string {
    const parts = path.split('/');
    return parts[parts.length - 1] || path;
  }

  /**
   * Generate AI prompt for a suggestion
   */
  generatePrompt(suggestion: Suggestion, analysis: AnalysisData): string {
    const baseContext = this.buildBaseContext(analysis);

    switch (suggestion.action.type) {
      case 'fix-issue':
        return this.generateFixIssuePrompt(suggestion, analysis, baseContext);

      case 'refactor-file':
        return this.generateRefactorPrompt(suggestion, analysis, baseContext);

      case 'add-tests':
        return this.generateTestPrompt(suggestion, analysis, baseContext);

      case 'focus-category':
        return this.generateCategoryPrompt(suggestion, analysis, baseContext);

      default:
        return this.generateGenericPrompt(suggestion, baseContext);
    }
  }

  /**
   * Build base context for prompts
   */
  private buildBaseContext(analysis: AnalysisData): string {
    const score = analysis.summary?.overallScore || 0;
    const totalIssues = analysis.summary?.totalIssues || 0;

    return `Project Context:
- Overall Code Quality Score: ${score}/100
- Total Issues: ${totalIssues}
- Critical: ${analysis.summary?.criticalIssues || 0}
- High: ${analysis.summary?.highIssues || 0}
- Medium: ${analysis.summary?.mediumIssues || 0}

`;
  }

  /**
   * Generate prompt for fixing issues
   */
  private generateFixIssuePrompt(suggestion: Suggestion, analysis: AnalysisData, context: string): string {
    const { severity, count } = suggestion.action.data;

    const issues = this.getIssuesBySeverity(analysis, severity).slice(0, 10);
    const issueList = issues.map((issue, i) =>
      `${i + 1}. ${issue.filePath}:${issue.line || '?'} - ${issue.message}`
    ).join('\n');

    return `${context}Task: Fix ${count} ${severity} severity issue${count !== 1 ? 's' : ''}

Top Issues:
${issueList}

Please analyze these issues and provide:
1. Root cause analysis
2. Recommended fixes with code examples
3. Prevention strategies for similar issues
4. Priority order for addressing them

Focus on actionable, specific solutions.`;
  }

  /**
   * Generate prompt for refactoring
   */
  private generateRefactorPrompt(suggestion: Suggestion, analysis: AnalysisData, context: string): string {
    const { filePath, complexity, reason } = suggestion.action.data;

    return `${context}Task: Refactor ${filePath}

File Details:
- Complexity: ${complexity}
- Reason: ${reason || 'high issue concentration'}

Please provide a refactoring plan that includes:
1. Identification of code smells and anti-patterns
2. Suggested architectural improvements
3. Step-by-step refactoring approach
4. Code examples for key changes
5. Testing strategy to ensure no regressions

Focus on improving maintainability and reducing complexity.`;
  }

  /**
   * Generate prompt for adding tests
   */
  private generateTestPrompt(suggestion: Suggestion, analysis: AnalysisData, context: string): string {
    const { currentCoverage, targetCoverage, filesNeedingTests } = suggestion.action.data;

    return `${context}Task: Improve Test Coverage

Current State:
- Coverage: ${Math.round(currentCoverage)}%
- Target: ${targetCoverage}%
- Files Needing Tests: ${filesNeedingTests}

Please provide:
1. Testing strategy for critical paths
2. Example test cases for key functionality
3. Recommended testing frameworks and tools
4. Coverage improvement roadmap
5. Best practices for maintaining high coverage

Focus on high-value tests that catch real bugs.`;
  }

  /**
   * Generate prompt for category focus
   */
  private generateCategoryPrompt(suggestion: Suggestion, analysis: AnalysisData, context: string): string {
    const { categoryName, score, issueCount } = suggestion.action.data;

    return `${context}Task: Improve ${categoryName} Category

Category Status:
- Score: ${score}/100
- Total Issues: ${issueCount}

Please analyze this category and provide:
1. Root causes for low score
2. Prioritized action items
3. Quick wins for immediate improvement
4. Long-term improvement strategy
5. Best practices for this category

Focus on practical, implementable solutions.`;
  }

  /**
   * Generate generic prompt
   */
  private generateGenericPrompt(suggestion: Suggestion, context: string): string {
    return `${context}Task: ${suggestion.title}

${suggestion.description}

Please provide:
1. Detailed analysis of the situation
2. Recommended approach
3. Implementation steps
4. Potential risks and mitigation
5. Success metrics

Focus on actionable guidance.`;
  }

  /**
   * Get issues by severity
   */
  private getIssuesBySeverity(analysis: AnalysisData, severity: string): any[] {
    const issues: any[] = [];

    (analysis.categories || []).forEach(category => {
      (category.issues || []).forEach(issue => {
        if (issue.severity === severity) {
          issues.push({
            ...issue,
            category: category.categoryName
          });
        }
      });
    });

    return issues;
  }

  // =========================================================================
  // Enhanced methods for pattern-based suggestions
  // =========================================================================

  /**
   * Determine suggestion type from pattern
   */
  private determineSuggestionType(pattern: Pattern): SuggestionType {
    if (pattern.estimatedEffort === 'low' || pattern.estimatedEffort === 'medium') {
      return 'quick-win';
    }
    if (pattern.estimatedEffort === 'high' && pattern.potentialImpact === 'high') {
      return 'systemic-improvement';
    }
    if (pattern.name.includes('test')) {
      return 'testing';
    }
    if (pattern.name.includes('i18n') || pattern.name.includes('hardcoded')) {
      return 'i18n';
    }
    if (pattern.name.includes('accessibility')) {
      return 'accessibility';
    }
    return 'critical-fix';
  }

  /**
   * Map category to action type
   */
  private mapCategoryToActionType(categoryId: string): SuggestionActionType {
    const actionMap: Record<string, SuggestionActionType> = {
      'feature-completeness': 'fix-issue',
      'ui-ux-quality': 'improve-ux',
      'internationalization': 'extract-strings',
      'test-coverage': 'add-tests'
    };
    return actionMap[categoryId] || 'fix-issue';
  }

  /**
   * Generate AI prompt for pattern
   */
  private generatePatternAIPrompt(
    category: any,
    pattern: Pattern,
    issues: any[],
    maturityLevel: MaturityLevel
  ): string {
    // Use existing prompt generator if available
    const generated = this.promptGenerator.generatePrompt(category, maturityLevel);
    const basePrompt = generated?.prompt || '';

    // Enhance with pattern information
    return `${basePrompt}

**Pattern Detected**: ${pattern.name}
${pattern.description}

**Recommendation**: ${pattern.fixStrategy}

**Affected locations** (${issues.length}):
${issues.slice(0, 5).map((i: any, idx: number) => `${idx + 1}. ${i.filePath}:${i.lineNumber || '?'} - ${i.title}`).join('\n')}
${issues.length > 5 ? `\n... and ${issues.length - 5} more` : ''}`;
  }

  /**
   * Get learn more URL for pattern
   */
  private getPatternLearnMoreUrl(patternName: string): string | undefined {
    const urls: Record<string, string> = {
      'missing-loading-states': 'https://web.dev/loading-best-practices/',
      'hardcoded-strings-everywhere': 'https://react.i18next.com/',
      'disconnected-features': 'https://martinfowler.com/articles/feature-toggles.html',
      'consistent-accessibility-violations': 'https://www.w3.org/WAI/WCAG21/quickref/',
      'missing-error-handling': 'https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary',
      'widespread-untested-code': 'https://jestjs.io/docs/getting-started'
    };
    return urls[patternName];
  }

  /**
   * Calculate enhanced priority (0-100)
   */
  private calculateEnhancedPriority(suggestion: Suggestion, patterns: Pattern[]): number {
    const urgencyScore = {
      critical: 40,
      high: 30,
      medium: 20,
      low: 10
    }[suggestion.urgency || 'medium'];

    const impactMultiplier = {
      high: 2.0,
      medium: 1.5,
      low: 1.0
    }[suggestion.impact];

    const effortDivisor = {
      low: 1.0,
      medium: 1.5,
      high: 2.5
    }[suggestion.effort];

    // Pattern bonus
    const pattern = patterns.find(p =>
      suggestion.relatedIssues?.some(id => p.issueIds.includes(id))
    );
    const patternBonus = pattern ? 20 * pattern.confidence : 0;

    // Type bonus
    const typeBonus = {
      'critical-fix': 20,
      'quick-win': 15,
      'systemic-improvement': 10,
      'testing': 8,
      'i18n': 7,
      'accessibility': 12,
      'performance': 10,
      'critical': 20,
      'high': 15,
      'refactoring': 5,
      'best-practice': 5,
      'documentation': 3
    }[suggestion.type] || 5;

    const rawScore = (urgencyScore * impactMultiplier) / effortDivisor + patternBonus + typeBonus;

    return Math.min(100, Math.max(0, Math.round(rawScore)));
  }

  /**
   * Filter suggestions by maturity level
   */
  private filterByMaturityLevel(
    suggestions: Suggestion[],
    maturityLevel: MaturityLevel
  ): Suggestion[] {
    switch (maturityLevel) {
      case 'novice':
        return suggestions
          .filter(s => s.effort !== 'high')
          .filter(s => s.type !== 'systemic-improvement')
          .slice(0, 3);

      case 'intermediate':
        return suggestions
          .filter(s => s.type !== 'systemic-improvement' || s.priority > 70)
          .slice(0, 5);

      case 'advanced':
        return suggestions
          .filter(s => s.priority > 40)
          .slice(0, 8);

      case 'expert':
        return suggestions; // All suggestions

      default:
        return suggestions.slice(0, 5);
    }
  }

  /**
   * Update user context
   */
  updateUserContext(context: Partial<UserContext>): void {
    this.userContext = { ...this.userContext, ...context };
  }

  /**
   * Get user context
   */
  getUserContext(): UserContext {
    return { ...this.userContext };
  }
}

/**
 * Singleton instance
 */
export const suggestionEngine = new SuggestionEngine();
