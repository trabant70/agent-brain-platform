/**
 * AI prompt templates for each category and maturity level
 */

import type { AIPromptTemplate, MaturityLevel } from '../types';

/**
 * Category IDs used in analysis
 */
const CATEGORY_IDS = {
  FEATURE_COMPLETENESS: 'feature-completeness',
  UI_UX_QUALITY: 'uiux-quality',
  TEST_COVERAGE: 'test-coverage',
  INTERNATIONALIZATION: 'internationalization'
} as const;

/**
 * Prompt templates organized by category and maturity level
 */
export const PROMPT_TEMPLATES: AIPromptTemplate[] = [
  // ============================================================================
  // Feature Completeness - Novice
  // ============================================================================
  {
    id: 'feature-completeness-novice',
    categoryId: CATEGORY_IDS.FEATURE_COMPLETENESS,
    maturityLevel: 'novice',
    template: `I found {{issueCount}} issue(s) in my code where backend and frontend don't connect properly.

**Issue:**
{{topIssue}}

**Location:** {{filePath}}:{{lineNumber}}

Can you help me understand:
1. Is this a bug or intentional?
2. How do I fix it?
3. What should I do to prevent this in the future?`,
    variables: ['issueCount', 'topIssue', 'filePath', 'lineNumber'],
    contextHints: ['Explain concepts simply', 'Provide step-by-step guidance']
  },

  // ============================================================================
  // Feature Completeness - Intermediate
  // ============================================================================
  {
    id: 'feature-completeness-intermediate',
    categoryId: CATEGORY_IDS.FEATURE_COMPLETENESS,
    maturityLevel: 'intermediate',
    template: `Code analysis detected {{issueCount}} feature completeness issue(s).

**Primary Issue:**
{{topIssue}}

**Details:**
- File: {{filePath}}:{{lineNumber}}
- Type: {{issueType}}

**Context:**
{{codeSnippet}}

Could you help me:
1. Determine if this endpoint/component is actually used elsewhere I missed
2. If it's unused, should I implement the missing piece or remove the dead code?
3. Suggest the best approach to connect these parts

**Related Issues:**
{{relatedIssues}}`,
    variables: [
      'issueCount',
      'topIssue',
      'filePath',
      'lineNumber',
      'issueType',
      'codeSnippet',
      'relatedIssues'
    ],
    contextHints: ['Show code examples', 'Suggest architectural patterns']
  },

  // ============================================================================
  // Feature Completeness - Advanced
  // ============================================================================
  {
    id: 'feature-completeness-advanced',
    categoryId: CATEGORY_IDS.FEATURE_COMPLETENESS,
    maturityLevel: 'advanced',
    template: `Architecture analysis found {{issueCount}} disconnections between frontend and backend.

**Analysis Summary:**
- Disconnected endpoints: {{disconnectedEndpoints}}
- Missing frontend: {{missingFrontend}}
- Mocked services: {{mockedServices}}

**Critical Issue:**
{{topIssue}}

**Affected Files:**
{{affectedFiles}}

**Code Context:**
{{codeSnippets}}

I need your expertise to:
1. Validate whether these are genuine issues or false positives
2. Recommend refactoring approach to properly connect these systems
3. Identify any architectural patterns I should follow
4. Suggest how to prevent similar disconnections during development

**Metrics:**
- Connection rate: {{connectionRate}}%
- Feature completeness: {{completeness}}%`,
    variables: [
      'issueCount',
      'disconnectedEndpoints',
      'missingFrontend',
      'mockedServices',
      'topIssue',
      'affectedFiles',
      'codeSnippets',
      'connectionRate',
      'completeness'
    ],
    contextHints: [
      'Deep architectural analysis',
      'Consider system design patterns',
      'Discuss trade-offs'
    ]
  },

  // ============================================================================
  // UI/UX Quality - Novice
  // ============================================================================
  {
    id: 'uiux-quality-novice',
    categoryId: CATEGORY_IDS.UI_UX_QUALITY,
    maturityLevel: 'novice',
    template: `My app has {{issueCount}} UI/UX issue(s) that affect user experience.

**Main Issue:**
{{topIssue}}

**Where:** {{componentName}} ({{filePath}}:{{lineNumber}})

Can you help me:
1. Why is this a problem for users?
2. Show me how to fix it with example code
3. Explain what I should do for similar cases

I want to make my app feel professional and responsive.`,
    variables: [
      'issueCount',
      'topIssue',
      'componentName',
      'filePath',
      'lineNumber'
    ],
    contextHints: [
      'Explain UX principles simply',
      'Provide complete code examples',
      'Show before/after'
    ]
  },

  // ============================================================================
  // UI/UX Quality - Intermediate
  // ============================================================================
  {
    id: 'uiux-quality-intermediate',
    categoryId: CATEGORY_IDS.UI_UX_QUALITY,
    maturityLevel: 'intermediate',
    template: `UX analysis found {{issueCount}} issue(s) in component quality.

**Issue Breakdown:**
- Missing loading states: {{loadingIssues}}
- Missing error handling: {{errorIssues}}
- Missing empty states: {{emptyStateIssues}}

**Primary Issue:**
{{topIssue}}

**Component:** {{componentName}}
**Location:** {{filePath}}:{{lineNumber}}

**Current Code:**
{{codeSnippet}}

I need help with:
1. Best practices for handling these UX patterns
2. Code examples using modern React/Vue patterns (hooks, composables)
3. Suggestions for consistent UX across the application

**Current UX Score:** {{uxScore}}/100`,
    variables: [
      'issueCount',
      'loadingIssues',
      'errorIssues',
      'emptyStateIssues',
      'topIssue',
      'componentName',
      'filePath',
      'lineNumber',
      'codeSnippet',
      'uxScore'
    ],
    contextHints: ['Modern framework patterns', 'Reusable components', 'Consistency']
  },

  // ============================================================================
  // UI/UX Quality - Advanced
  // ============================================================================
  {
    id: 'uiux-quality-advanced',
    categoryId: CATEGORY_IDS.UI_UX_QUALITY,
    maturityLevel: 'advanced',
    template: `Comprehensive UX audit identified {{issueCount}} issues across {{componentCount}} components.

**Issue Distribution:**
- Critical (no error handling): {{criticalIssues}}
- High (missing loading states): {{highIssues}}
- Medium (missing feedback): {{mediumIssues}}
- Accessibility violations: {{a11yIssues}}

**System-Wide Patterns:**
{{patternAnalysis}}

**Sample Issue:**
{{topIssue}}

**Code Context:**
{{codeSnippets}}

Looking for architectural guidance on:
1. Creating a centralized UX pattern library
2. Implementing consistent error boundaries and loading states
3. Building accessible-by-default components
4. Establishing UX testing strategy

**Metrics:**
- Async coverage: {{asyncCoverage}}%
- A11y compliance: {{a11yScore}}%
- Overall UX: {{uxScore}}/100

How can I systematize these improvements across the application?`,
    variables: [
      'issueCount',
      'componentCount',
      'criticalIssues',
      'highIssues',
      'mediumIssues',
      'a11yIssues',
      'patternAnalysis',
      'topIssue',
      'codeSnippets',
      'asyncCoverage',
      'a11yScore',
      'uxScore'
    ],
    contextHints: [
      'System design',
      'Design systems',
      'Architectural patterns',
      'Testing strategies'
    ]
  },

  // ============================================================================
  // Internationalization - Intermediate
  // ============================================================================
  {
    id: 'i18n-intermediate',
    categoryId: CATEGORY_IDS.INTERNATIONALIZATION,
    maturityLevel: 'intermediate',
    template: `i18n analysis found {{issueCount}} internationalization issue(s).

**Issues:**
- Hardcoded strings: {{hardcodedCount}}
- Date/time formatting: {{datetimeCount}}
- Number formatting: {{numberCount}}

**Example Issue:**
{{topIssue}}

**Location:** {{filePath}}:{{lineNumber}}

**Hardcoded String:**
"{{stringValue}}"

Help me:
1. Set up proper i18n infrastructure (i18next, react-intl, vue-i18n?)
2. Extract these strings to translation files
3. Handle date/time and number formatting correctly
4. Organize translation keys effectively

**Current i18n coverage:** {{i18nCoverage}}%`,
    variables: [
      'issueCount',
      'hardcodedCount',
      'datetimeCount',
      'numberCount',
      'topIssue',
      'filePath',
      'lineNumber',
      'stringValue',
      'i18nCoverage'
    ],
    contextHints: ['i18n library setup', 'Translation workflow', 'Best practices']
  },

  // ============================================================================
  // Test Coverage - Intermediate
  // ============================================================================
  {
    id: 'test-coverage-intermediate',
    categoryId: CATEGORY_IDS.TEST_COVERAGE,
    maturityLevel: 'intermediate',
    template: `Test coverage analysis found {{untestedCount}} untested file(s).

**Critical Untested:**
{{criticalUntested}}

**Priority File:**
{{topIssue}}

**File:** {{filePath}}
**Type:** {{fileType}}
**Importance:** {{importance}}

Help me:
1. Write comprehensive tests for this file
2. Identify critical paths and edge cases to test
3. Suggest testing patterns (unit, integration, e2e)
4. Set up test infrastructure if needed

**Current Coverage:** {{coverage}}%
**Target:** 80%+`,
    variables: [
      'untestedCount',
      'criticalUntested',
      'topIssue',
      'filePath',
      'fileType',
      'importance',
      'coverage'
    ],
    contextHints: ['Test patterns', 'Edge cases', 'Test setup']
  }
];

/**
 * Get prompt template by category and maturity level
 */
export function getPromptTemplate(
  categoryId: string,
  maturityLevel: MaturityLevel
): AIPromptTemplate | undefined {
  return PROMPT_TEMPLATES.find(
    t => t.categoryId === categoryId && t.maturityLevel === maturityLevel
  );
}

/**
 * Get all templates for a category
 */
export function getCategoryTemplates(categoryId: string): AIPromptTemplate[] {
  return PROMPT_TEMPLATES.filter(t => t.categoryId === categoryId);
}

/**
 * Get all templates for a maturity level
 */
export function getMaturityLevelTemplates(
  maturityLevel: MaturityLevel
): AIPromptTemplate[] {
  return PROMPT_TEMPLATES.filter(t => t.maturityLevel === maturityLevel);
}
