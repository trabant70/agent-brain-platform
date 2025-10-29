/**
 * PatternDetector - Identifies systemic issues across multiple files
 *
 * Detects patterns like:
 * - Multiple components missing loading states
 * - Widespread hardcoded strings (i18n needed)
 * - Many disconnected features
 * - Consistent accessibility violations
 */

import type {
  Pattern,
  Issue,
  CategoryAnalysis,
  CodeStructureAnalysis
} from '../../../code-structure-review/types';

export class PatternDetector {
  /**
   * Detect all patterns in analysis
   */
  detectPatterns(analysis: CodeStructureAnalysis): Pattern[] {
    const patterns: Pattern[] = [];
    const allIssues = this.getAllIssues(analysis);

    // Run all pattern detectors
    patterns.push(...this.detectMissingLoadingStates(allIssues));
    patterns.push(...this.detectHardcodedStrings(allIssues));
    patterns.push(...this.detectDisconnectedFeatures(allIssues));
    patterns.push(...this.detectAccessibilityViolations(allIssues));
    patterns.push(...this.detectMissingErrorHandling(allIssues));
    patterns.push(...this.detectUntestedCode(allIssues));

    // Filter patterns by confidence threshold
    return patterns.filter(p => p.confidence >= 0.6);
  }

  /**
   * Get all issues from all categories
   */
  private getAllIssues(analysis: CodeStructureAnalysis): Issue[] {
    return analysis.categories.flatMap(c => c.issues);
  }

  /**
   * Detect pattern: Missing loading states across multiple components
   */
  private detectMissingLoadingStates(issues: Issue[]): Pattern[] {
    const loadingIssues = issues.filter(i =>
      i.detectorId === 'missing-loading-state' ||
      i.title.toLowerCase().includes('loading state')
    );

    if (loadingIssues.length >= 3) {
      const uniqueFiles = new Set(loadingIssues.map(i => i.filePath));

      return [{
        id: `pattern-${Date.now()}-loading`,
        name: 'missing-loading-states',
        description: 'Multiple components fetch data without loading indicators',
        issueIds: loadingIssues.map(i => i.id),
        confidence: Math.min(1.0, loadingIssues.length / 10), // More issues = higher confidence
        affectedFiles: uniqueFiles.size,
        totalIssues: loadingIssues.length,
        categories: ['ui-ux-quality'],
        fixStrategy: 'Create reusable LoadingWrapper component and apply consistently',
        estimatedEffort: 'medium',
        potentialImpact: 'high'
      }];
    }

    return [];
  }

  /**
   * Detect pattern: Hardcoded strings everywhere (need i18n)
   */
  private detectHardcodedStrings(issues: Issue[]): Pattern[] {
    const i18nIssues = issues.filter(i =>
      i.category === 'internationalization' &&
      (i.detectorId === 'hardcoded-string' || i.title.toLowerCase().includes('hardcoded'))
    );

    if (i18nIssues.length >= 10) {
      const uniqueFiles = new Set(i18nIssues.map(i => i.filePath));

      return [{
        id: `pattern-${Date.now()}-i18n`,
        name: 'hardcoded-strings-everywhere',
        description: 'Widespread hardcoded strings indicate need for i18n infrastructure',
        issueIds: i18nIssues.map(i => i.id),
        confidence: Math.min(1.0, i18nIssues.length / 20),
        affectedFiles: uniqueFiles.size,
        totalIssues: i18nIssues.length,
        categories: ['internationalization'],
        fixStrategy: 'Set up i18n infrastructure (react-i18next) and extract strings systematically',
        estimatedEffort: 'high',
        potentialImpact: 'high'
      }];
    }

    return [];
  }

  /**
   * Detect pattern: Many disconnected features
   */
  private detectDisconnectedFeatures(issues: Issue[]): Pattern[] {
    const completenessIssues = issues.filter(i =>
      i.category === 'feature-completeness' &&
      (i.detectorId.includes('disconnected') || i.detectorId.includes('orphan'))
    );

    if (completenessIssues.length >= 5) {
      const uniqueFiles = new Set(completenessIssues.map(i => i.filePath));

      return [{
        id: `pattern-${Date.now()}-completeness`,
        name: 'disconnected-features',
        description: 'Multiple features have missing frontend or backend components',
        issueIds: completenessIssues.map(i => i.id),
        confidence: Math.min(1.0, completenessIssues.length / 10),
        affectedFiles: uniqueFiles.size,
        totalIssues: completenessIssues.length,
        categories: ['feature-completeness'],
        fixStrategy: 'Audit and connect all features end-to-end, prioritize by user impact',
        estimatedEffort: 'high',
        potentialImpact: 'high'
      }];
    }

    return [];
  }

  /**
   * Detect pattern: Consistent accessibility violations
   */
  private detectAccessibilityViolations(issues: Issue[]): Pattern[] {
    const a11yIssues = issues.filter(i =>
      i.category === 'ui-ux-quality' &&
      (i.detectorId.includes('accessibility') || i.detectorId.includes('a11y'))
    );

    if (a11yIssues.length >= 5) {
      // Check if it's the same type of violation repeated
      const violationTypes = a11yIssues.map(i => i.detectorId);
      const uniqueTypes = new Set(violationTypes);

      if (uniqueTypes.size <= 3) {
        // Same types of violations repeated = pattern
        return [{
          id: `pattern-${Date.now()}-a11y`,
          name: 'consistent-accessibility-violations',
          description: 'Similar accessibility violations across components indicate systemic issue',
          issueIds: a11yIssues.map(i => i.id),
          confidence: 0.9,
          affectedFiles: new Set(a11yIssues.map(i => i.filePath)).size,
          totalIssues: a11yIssues.length,
          categories: ['ui-ux-quality'],
          fixStrategy: 'Create accessible-by-default component library and refactor existing components',
          estimatedEffort: 'high',
          potentialImpact: 'high'
        }];
      }
    }

    return [];
  }

  /**
   * Detect pattern: Missing error handling
   */
  private detectMissingErrorHandling(issues: Issue[]): Pattern[] {
    const errorIssues = issues.filter(i =>
      i.detectorId === 'missing-error-handling' ||
      i.title.toLowerCase().includes('error handling')
    );

    if (errorIssues.length >= 4) {
      const uniqueFiles = new Set(errorIssues.map(i => i.filePath));

      return [{
        id: `pattern-${Date.now()}-errors`,
        name: 'missing-error-handling',
        description: 'Multiple components lack proper error handling',
        issueIds: errorIssues.map(i => i.id),
        confidence: Math.min(1.0, errorIssues.length / 8),
        affectedFiles: uniqueFiles.size,
        totalIssues: errorIssues.length,
        categories: ['ui-ux-quality'],
        fixStrategy: 'Implement error boundary pattern and consistent error handling strategy',
        estimatedEffort: 'medium',
        potentialImpact: 'high'
      }];
    }

    return [];
  }

  /**
   * Detect pattern: Widespread untested code
   */
  private detectUntestedCode(issues: Issue[]): Pattern[] {
    const testIssues = issues.filter(i =>
      i.category === 'test-coverage' &&
      (i.detectorId === 'untested-file' || i.severity === 'critical')
    );

    if (testIssues.length >= 5) {
      const uniqueFiles = new Set(testIssues.map(i => i.filePath));

      return [{
        id: `pattern-${Date.now()}-tests`,
        name: 'widespread-untested-code',
        description: 'Many critical files lack test coverage',
        issueIds: testIssues.map(i => i.id),
        confidence: Math.min(1.0, testIssues.length / 10),
        affectedFiles: uniqueFiles.size,
        totalIssues: testIssues.length,
        categories: ['test-coverage'],
        fixStrategy: 'Establish testing infrastructure and systematically add tests, prioritize by criticality',
        estimatedEffort: 'high',
        potentialImpact: 'high'
      }];
    }

    return [];
  }

  /**
   * Find pattern by ID
   */
  findPattern(patterns: Pattern[], issueId: string): Pattern | null {
    return patterns.find(p => p.issueIds.includes(issueId)) || null;
  }

  /**
   * Get patterns for specific category
   */
  getPatternsForCategory(patterns: Pattern[], categoryId: string): Pattern[] {
    return patterns.filter(p => p.categories.includes(categoryId));
  }
}
