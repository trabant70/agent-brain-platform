/**
 * Stage3_StructuredEnhancer
 *
 * Applies structural templates based on detected intent (bug fix, feature, refactor, etc.)
 * Extends Stage 2 to build on pattern expansion.
 */

import { Stage2_PatternExpander } from './Stage2_PatternExpander';
import { EnhancementContext } from '../types';

export interface EnhancementTemplate {
  name: string;
  sections: string[];
  placeholders: Record<string, string>;
  description: string;
}

export type IntentType = 'bug' | 'feature' | 'refactor' | 'test' | 'docs' | 'performance';

export class Stage3_StructuredEnhancer extends Stage2_PatternExpander {
  private templates: Map<IntentType, EnhancementTemplate>;

  constructor() {
    super();
    this.templates = new Map();
    this.initializeTemplates();
  }

  /**
   * Enhance prompt with structural templates
   */
  enhance(prompt: string, context: EnhancementContext): string {
    // Apply Stage 2 enhancements first (pattern expansion + missing specs)
    let enhanced = super.enhance(prompt, context);

    // Detect intent from prompt
    const intent = this.detectIntent(prompt);

    if (intent) {
      const template = this.getTemplate(intent);
      enhanced = this.applyTemplate(enhanced, template, context);
    }

    return enhanced;
  }

  /**
   * Detect user intent from prompt
   */
  private detectIntent(prompt: string): IntentType | null {
    const intentPatterns: Record<IntentType, RegExp> = {
      bug: /\b(fix|bug|error|issue|broken|crash|fail|defect|problem)\b/i,
      feature: /\b(add|create|implement|new|feature|build|develop)\b/i,
      refactor: /\b(refactor|clean|improve|reorganize|restructure|simplify|optimize code)\b/i,
      test: /\b(test|spec|coverage|validate|verify|unit test|integration test)\b/i,
      docs: /\b(document|readme|comment|explain|describe|doc|documentation)\b/i,
      performance: /\b(optimize|performance|speed|slow|fast|bottleneck|improve performance)\b/i
    };

    // Check patterns in priority order
    const priorityOrder: IntentType[] = ['bug', 'test', 'performance', 'refactor', 'feature', 'docs'];

    for (const intent of priorityOrder) {
      if (intentPatterns[intent].test(prompt)) {
        return intent;
      }
    }

    return null; // No clear intent detected
  }

  /**
   * Get template for intent type
   */
  private getTemplate(intent: IntentType): EnhancementTemplate {
    const template = this.templates.get(intent);
    if (!template) {
      throw new Error(`Template not found for intent: ${intent}`);
    }
    return template;
  }

  /**
   * Apply template to prompt
   */
  private applyTemplate(
    prompt: string,
    template: EnhancementTemplate,
    context: EnhancementContext
  ): string {
    const parts: string[] = [];

    // Add template header
    parts.push(template.sections[0]); // e.g., "## Bug Fix"
    parts.push(prompt);
    parts.push('');

    // Add template sections (skip first which is header)
    for (let i = 1; i < template.sections.length; i++) {
      parts.push(template.sections[i]);
    }

    // Add context-specific information
    if (context.currentFile) {
      parts.push('');
      parts.push(`### Context`);
      parts.push(`File: ${context.currentFile}`);
    }

    if (context.recentErrors && context.recentErrors.length > 0) {
      parts.push('');
      parts.push(`### Recent Errors`);
      context.recentErrors.forEach(err => {
        parts.push(`- ${err}`);
      });
    }

    return parts.join('\n');
  }

  /**
   * Initialize built-in templates
   */
  private initializeTemplates(): void {
    // Bug Fix Template
    this.templates.set('bug', {
      name: 'Bug Fix',
      description: 'Template for fixing bugs and errors',
      sections: [
        '## 🐛 Bug Fix',
        '',
        '**Symptom:** [What is broken or not working?]',
        '**Expected Behavior:** [What should happen instead?]',
        '**Root Cause:** [Why is this happening? What is the underlying issue?]',
        '**Proposed Fix:** [How should this be resolved?]',
        '**Testing:** [How can we verify the fix works?]',
        '**Regression Risk:** [Could this break anything else?]'
      ],
      placeholders: {
        symptom: 'What is broken or not working?',
        expected: 'What should happen instead?',
        rootCause: 'Why is this happening?',
        fix: 'How should this be resolved?',
        testing: 'How can we verify the fix works?'
      }
    });

    // Feature Template
    this.templates.set('feature', {
      name: 'New Feature',
      description: 'Template for implementing new features',
      sections: [
        '## ✨ New Feature',
        '',
        '**User Story:** [Who needs this and why?]',
        '**Acceptance Criteria:** [What defines "done"?]',
        '- [ ] Criterion 1',
        '- [ ] Criterion 2',
        '- [ ] Criterion 3',
        '',
        '**Implementation Approach:** [How should this be built?]',
        '**Edge Cases:** [What could go wrong or needs special handling?]',
        '**Testing Strategy:** [How will we verify this works?]',
        '**Documentation:** [What needs to be documented?]'
      ],
      placeholders: {
        userStory: 'Who needs this and why?',
        acceptanceCriteria: 'What defines done?',
        implementation: 'How should this be built?',
        edgeCases: 'What could go wrong?',
        testing: 'How will we verify this works?'
      }
    });

    // Refactor Template
    this.templates.set('refactor', {
      name: 'Refactoring',
      description: 'Template for code refactoring and improvements',
      sections: [
        '## ♻️ Refactoring',
        '',
        '**Current State:** [What exists now?]',
        '**Problems:** [What needs improvement and why?]',
        '- Problem 1',
        '- Problem 2',
        '',
        '**Proposed Changes:** [What should it become?]',
        '**Benefits:** [Why is this better?]',
        '**Migration Strategy:** [How do we transition safely?]',
        '**Backward Compatibility:** [What might break? How do we handle it?]',
        '**Testing:** [How do we ensure nothing breaks?]'
      ],
      placeholders: {
        currentState: 'What exists now?',
        problems: 'What needs improvement?',
        proposed: 'What should it become?',
        migration: 'How do we transition?',
        compatibility: 'What might break?'
      }
    });

    // Test Template
    this.templates.set('test', {
      name: 'Testing',
      description: 'Template for writing tests',
      sections: [
        '## 🧪 Testing',
        '',
        '**What to Test:** [What functionality/component needs testing?]',
        '**Test Type:** [Unit / Integration / E2E]',
        '**Test Cases:**',
        '- [ ] Happy path: [Normal expected behavior]',
        '- [ ] Edge case: [Boundary conditions]',
        '- [ ] Error case: [What happens when things go wrong]',
        '- [ ] Performance: [Does it perform well?]',
        '',
        '**Test Data:** [What data is needed for testing?]',
        '**Mocks/Stubs:** [What dependencies need to be mocked?]',
        '**Coverage Goal:** [What coverage percentage to achieve?]'
      ],
      placeholders: {
        whatToTest: 'What functionality needs testing?',
        testType: 'Unit / Integration / E2E',
        testCases: 'List of test scenarios',
        testData: 'What data is needed?'
      }
    });

    // Documentation Template
    this.templates.set('docs', {
      name: 'Documentation',
      description: 'Template for documentation tasks',
      sections: [
        '## 📚 Documentation',
        '',
        '**What to Document:** [What needs documentation?]',
        '**Target Audience:** [Who will read this?]',
        '- Developers',
        '- End Users',
        '- DevOps/Operations',
        '',
        '**Content Sections:**',
        '- [ ] Overview/Purpose',
        '- [ ] Getting Started',
        '- [ ] API Reference',
        '- [ ] Examples',
        '- [ ] Troubleshooting',
        '',
        '**Format:** [Markdown / JSDoc / README / Wiki]',
        '**Location:** [Where should this documentation live?]'
      ],
      placeholders: {
        what: 'What needs documentation?',
        audience: 'Who will read this?',
        sections: 'What sections to include?',
        format: 'What format?'
      }
    });

    // Performance Template
    this.templates.set('performance', {
      name: 'Performance Optimization',
      description: 'Template for performance improvements',
      sections: [
        '## ⚡ Performance Optimization',
        '',
        '**Performance Issue:** [What is slow or inefficient?]',
        '**Current Metrics:** [What are the current numbers?]',
        '- Response time:',
        '- Throughput:',
        '- Resource usage:',
        '',
        '**Target Metrics:** [What are we aiming for?]',
        '**Bottleneck Analysis:** [What is causing the slowdown?]',
        '**Proposed Optimizations:**',
        '- Optimization 1',
        '- Optimization 2',
        '',
        '**Trade-offs:** [What are we sacrificing? Complexity? Memory?]',
        '**Measurement Strategy:** [How will we measure improvement?]'
      ],
      placeholders: {
        issue: 'What is slow?',
        currentMetrics: 'Current performance numbers',
        targetMetrics: 'Target performance goals',
        bottleneck: 'What is causing the slowdown?',
        optimizations: 'Proposed improvements'
      }
    });
  }

  /**
   * Get all available templates
   */
  getAvailableTemplates(): Array<{ intent: IntentType; template: EnhancementTemplate }> {
    return Array.from(this.templates.entries()).map(([intent, template]) => ({
      intent,
      template
    }));
  }

  /**
   * Get template by name
   */
  getTemplateByIntent(intent: IntentType): EnhancementTemplate | undefined {
    return this.templates.get(intent);
  }
}
