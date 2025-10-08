/**
 * Stage 2: Pattern-Based Expansion
 *
 * Add mechanical pattern matching to fix common deficiencies.
 * Still no intelligence, but uses linguistic patterns.
 *
 * Capabilities:
 * - Expand vague pronouns (it, this, that, there)
 * - Detect missing specifications (tests, error handling, etc.)
 */

import { Stage1_ContextInjector } from './Stage1_ContextInjector';
import { EnhancementContext } from '../types';

interface MissingSpecPattern {
  trigger: RegExp;
  missing: RegExp;
  suggest: string;
}

export class Stage2_PatternExpander extends Stage1_ContextInjector {
  private pronounPatterns: Record<string, (ctx: EnhancementContext) => string> = {
    '\\bit\\b': (ctx) => ctx.lastNoun || 'the code',
    '\\bthis\\b': (ctx) => ctx.currentFocus || 'the current implementation',
    '\\bthat\\b': (ctx) => ctx.lastMentioned || 'the previous approach',
    '\\bthere\\b': (ctx) => ctx.currentLocation || 'in the file'
  };

  private missingSpecPatterns: MissingSpecPattern[] = [
    {
      trigger: /^(add|create|implement)/i,
      missing: /test|spec/i,
      suggest: '\n[Consider: Should this include tests?]'
    },
    {
      trigger: /(async|await|fetch|api)/i,
      missing: /error|handle|catch|try/i,
      suggest: '\n[Consider: How should errors be handled?]'
    },
    {
      trigger: /refactor/i,
      missing: /maintain|backward|compatible/i,
      suggest: '\n[Consider: Should this maintain backward compatibility?]'
    },
    {
      trigger: /(database|db|sql)/i,
      missing: /transaction|rollback/i,
      suggest: '\n[Consider: Should this be wrapped in a transaction?]'
    },
    {
      trigger: /(user|auth|login)/i,
      missing: /security|validate|sanitize/i,
      suggest: '\n[Consider: What security validations are needed?]'
    }
  ];

  /**
   * Enhance prompt with pattern expansion
   */
  enhance(prompt: string, context: EnhancementContext): string {
    let enhanced = prompt;

    // Stage 2a: Expand vague references
    for (const [pattern, replacer] of Object.entries(this.pronounPatterns)) {
      const regex = new RegExp(pattern, 'gi');
      enhanced = enhanced.replace(regex, replacer(context));
    }

    // Stage 2b: Detect and suggest missing specifications
    const suggestions: string[] = [];
    for (const spec of this.missingSpecPatterns) {
      if (spec.trigger.test(enhanced) && !spec.missing.test(enhanced)) {
        suggestions.push(spec.suggest);
      }
    }

    if (suggestions.length > 0) {
      enhanced += '\n' + suggestions.join('');
    }

    // Apply Stage 1 context injection
    return super.enhance(enhanced, context);
  }
}
