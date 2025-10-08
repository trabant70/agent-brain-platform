/**
 * Prompt Enhancer
 *
 * Enhances user prompts with relevant knowledge from Agent Brain.
 * Formats knowledge as markdown context that can be sent to AI assistants.
 */

import { Knowledge } from '@agent-brain/core/domains/knowledge';

export class PromptEnhancer {
  /**
   * Enhance prompt with knowledge
   * Returns markdown-formatted enhanced prompt (no XML for v1)
   */
  async enhance(prompt: string, knowledge: Knowledge): Promise<string> {
    const sections: string[] = [];

    // Original user intent (most important - always first)
    sections.push(prompt);

    // Add knowledge context if relevant
    if (this.hasRelevantKnowledge(knowledge)) {
      sections.push(''); // Blank line
      sections.push('## Context from Agent Brain');
      sections.push('');

      // Patterns
      if (knowledge.patterns.length > 0) {
        sections.push('**Patterns to follow:**');
        for (const pattern of knowledge.patterns) {
          sections.push(`- ${pattern.name}: ${pattern.description}`);
        }
        sections.push('');
      }

      // ADRs
      if (knowledge.adrs.length > 0) {
        sections.push('**Architecture decisions:**');
        for (const adr of knowledge.adrs) {
          sections.push(`- ADR-${adr.number}: ${adr.title}`);
          sections.push(`  Decision: ${this.truncate(adr.decision, 100)}`);
        }
        sections.push('');
      }

      // Learnings
      if (knowledge.learnings.length > 0) {
        sections.push('**Related learnings:**');
        for (const learning of knowledge.learnings) {
          sections.push(`- ${learning.name} (seen ${learning.occurrences}x)`);
          if (learning.preventionRule) {
            sections.push(`  → ${this.truncate(learning.preventionRule, 80)}`);
          }
        }
        sections.push('');
      }

      // Context Rules (Phase 2)
      if (knowledge.contextRules && knowledge.contextRules.length > 0) {
        sections.push('**Project guidelines:**');
        for (const rule of knowledge.contextRules) {
          const sourceLabel = rule.source === 'user' ? '✓' : rule.source === 'learned' ? '📚' : '💡';
          sections.push(`- ${sourceLabel} ${rule.rule}`);
        }
        sections.push('');
      }
    }

    return sections.join('\n');
  }

  /**
   * Check if knowledge has any relevant items
   */
  private hasRelevantKnowledge(knowledge: Knowledge): boolean {
    return knowledge.patterns.length > 0 ||
           knowledge.adrs.length > 0 ||
           knowledge.learnings.length > 0 ||
           (knowledge.contextRules && knowledge.contextRules.length > 0);
  }

  /**
   * Truncate text to max length
   */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Create a preview of the enhancement for display
   */
  createPreview(originalPrompt: string, enhancedPrompt: string): string {
    const lines: string[] = [];

    lines.push('=== Original Prompt ===');
    lines.push(originalPrompt);
    lines.push('');
    lines.push('=== Enhanced with Knowledge ===');
    lines.push(enhancedPrompt);

    return lines.join('\n');
  }
}
