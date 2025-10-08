/**
 * Stage4_SuccessLearner - Enhancement stage that applies success patterns
 *
 * Extends Stage 3 (Structural Templates) and adds:
 * - Success patterns from previous sessions
 * - Knowledge item prioritization based on effectiveness
 * - Context recommendations from successful outcomes
 */

import { Stage3_StructuredEnhancer } from './Stage3_StructuredEnhancer';
import { EnhancementContext } from '../types';
import { SuccessPatternDetector } from '../../knowledge/success/SuccessPatternDetector';
import { SuccessPattern } from '../../knowledge/success/SuccessPattern';
import { ProjectProfileManager } from '../../knowledge/ProjectProfileManager';

export class Stage4_SuccessLearner extends Stage3_StructuredEnhancer {
  private successDetector: SuccessPatternDetector;
  private profileManager: ProjectProfileManager;
  private patternsApplied: SuccessPattern[] = [];

  constructor(
    successDetector: SuccessPatternDetector,
    profileManager: ProjectProfileManager
  ) {
    super();
    this.successDetector = successDetector;
    this.profileManager = profileManager;
  }

  /**
   * Enhance prompt with structural templates + success patterns
   */
  enhance(prompt: string, context: EnhancementContext): string {
    // Reset patterns applied for this enhancement
    this.patternsApplied = [];

    // Apply Stage 3 enhancements first (structural templates)
    let enhanced = super.enhance(prompt, context);

    // Detect task type and context hints
    const taskType = this.detectTaskType(prompt);
    const contextHints = this.extractContextHints(prompt);
    const projectType = context.projectType;

    // Get applicable success patterns
    const applicablePatterns = this.successDetector.getApplicablePatterns(
      taskType,
      contextHints,
      projectType
    );

    if (applicablePatterns.length === 0) {
      // No patterns to apply, return Stage 3 result
      return enhanced;
    }

    // Apply success patterns
    enhanced = this.applySuccessPatterns(
      enhanced,
      applicablePatterns,
      context
    );

    return enhanced;
  }

  /**
   * Get patterns that were applied in the last enhancement
   */
  getPatternsApplied(): SuccessPattern[] {
    return [...this.patternsApplied];
  }

  /**
   * Get pattern IDs for tracking purposes
   */
  getPatternIds(): string[] {
    return this.patternsApplied.map(p => p.id);
  }

  // Private methods

  private applySuccessPatterns(
    enhanced: string,
    patterns: SuccessPattern[],
    context: EnhancementContext
  ): string {
    const additions: string[] = [];

    // Apply top 3 most confident patterns
    const topPatterns = patterns.slice(0, 3);

    for (const pattern of topPatterns) {
      this.patternsApplied.push(pattern);

      // Add additional context from pattern
      if (pattern.enhancement.additionalContext.length > 0) {
        additions.push('\n### Success Insights');
        for (const contextItem of pattern.enhancement.additionalContext) {
          additions.push(`- ${contextItem}`);
        }
      }

      // Suggest knowledge items that worked well
      const suggestedKnowledge = this.filterSuggestedKnowledge(
        pattern.enhancement.suggestedKnowledge,
        context
      );

      if (suggestedKnowledge.length > 0) {
        additions.push('\n### Recommended Knowledge Items');
        additions.push(`Based on ${pattern.evidence.successCount} successful sessions:`);
        for (const itemId of suggestedKnowledge) {
          const itemName = this.getKnowledgeItemName(itemId, context);
          additions.push(`- ${itemName} (success rate: ${this.formatConfidence(pattern.evidence.confidence)})`);
        }
      }

      // Add pattern metadata at lower confidence
      if (pattern.evidence.confidence < 0.8) {
        additions.push(
          `\n_Note: This pattern has ${pattern.evidence.successCount}/${pattern.evidence.successCount + pattern.evidence.failureCount} success rate. Consider reviewing the approach._`
        );
      }
    }

    // Append additions to enhanced prompt
    if (additions.length > 0) {
      enhanced += '\n' + additions.join('\n');
    }

    // Add metadata comment
    const metadata = this.generateMetadataComment(topPatterns);
    if (metadata) {
      enhanced += '\n\n' + metadata;
    }

    return enhanced;
  }

  private filterSuggestedKnowledge(
    suggested: string[],
    context: EnhancementContext
  ): string[] {
    // Filter out knowledge items that are already in context
    const existingKnowledge = new Set([
      ...(context.patterns || []),
      ...(context.constraints || [])
    ]);

    return suggested.filter(itemId => !existingKnowledge.has(itemId));
  }

  private getKnowledgeItemName(itemId: string, context: EnhancementContext): string {
    // Try to get friendly name from context
    // For now, return the ID (in real implementation, would look up from systems)
    return itemId;
  }

  private formatConfidence(confidence: number): string {
    const percent = Math.round(confidence * 100);
    return `${percent}%`;
  }

  private generateMetadataComment(patterns: SuccessPattern[]): string {
    if (patterns.length === 0) return '';

    const lines: string[] = [];
    lines.push('---');
    lines.push('');
    lines.push('**Enhancement Level:** Stage 4 (Success Learning)');
    lines.push(`**Patterns Applied:** ${patterns.length}`);

    if (patterns.length > 0) {
      const totalSuccesses = patterns.reduce((sum, p) => sum + p.evidence.successCount, 0);
      const avgConfidence = patterns.reduce((sum, p) => sum + p.evidence.confidence, 0) / patterns.length;

      lines.push(`**Based On:** ${totalSuccesses} successful sessions`);
      lines.push(`**Confidence:** ${this.formatConfidence(avgConfidence)}`);
    }

    lines.push('');
    lines.push('_This prompt was enhanced using patterns learned from your successful sessions._');

    return lines.join('\n');
  }

  private detectTaskType(prompt: string): string {
    const lower = prompt.toLowerCase();

    if (/\b(fix|bug|error|issue|broken|crash|fail)\b/.test(lower)) return 'bug';
    if (/\b(add|create|implement|new|feature|build)\b/.test(lower)) return 'feature';
    if (/\b(refactor|clean|improve|reorganize|restructure)\b/.test(lower)) return 'refactor';
    if (/\b(test|spec|coverage|validate)\b/.test(lower)) return 'test';
    if (/\b(document|readme|comment|explain)\b/.test(lower)) return 'docs';
    if (/\b(optimize|performance|speed|slow|fast)\b/.test(lower)) return 'performance';

    return 'other';
  }

  private extractContextHints(prompt: string): string[] {
    const hints: string[] = [];
    const commonHints = [
      'authentication', 'authorization', 'database', 'api', 'ui', 'frontend',
      'backend', 'testing', 'performance', 'security', 'deployment', 'logging'
    ];

    const lowerPrompt = prompt.toLowerCase();
    for (const hint of commonHints) {
      if (lowerPrompt.includes(hint)) {
        hints.push(hint);
      }
    }

    return hints;
  }
}
