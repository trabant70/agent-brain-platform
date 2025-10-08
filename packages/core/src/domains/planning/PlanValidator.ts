/**
 * Plan Validator
 *
 * Validates that AI-generated plans:
 * 1. Follow the planning template structure
 * 2. Include all required sections
 * 3. Meet completion criteria
 * 4. Are detailed enough for implementation
 */

import type {
  PlanningTemplate,
  PlanningSection,
  PlanValidationResult
} from '../expertise/types';

/**
 * Validation options
 */
export interface ValidationOptions {
  /** Minimum words per section */
  minWordsPerSection?: number;

  /** Check for actionable items (e.g., "must", "should", "will") */
  requireActionableLanguage?: boolean;

  /** Check for specific technical terms */
  requiredTerms?: string[];

  /** Strictness level */
  strictness?: 'strict' | 'normal' | 'lenient';
}

/**
 * Section validation detail
 */
export interface SectionValidation {
  sectionId: string;
  sectionTitle: string;
  exists: boolean;
  wordCount: number;
  hasActionableLanguage: boolean;
  missingTerms: string[];
  score: number;  // 0-100
}

/**
 * Detailed validation result
 */
export interface DetailedValidationResult extends PlanValidationResult {
  /** Validation details for each section */
  sectionDetails: SectionValidation[];

  /** Overall quality assessment */
  quality: 'excellent' | 'good' | 'adequate' | 'poor';

  /** Suggestions for improvement */
  suggestions: string[];
}

/**
 * Plan Validator
 * Provides comprehensive validation of planning adherence
 */
export class PlanValidator {
  private options: Required<ValidationOptions>;

  constructor(options: ValidationOptions = {}) {
    this.options = {
      minWordsPerSection: options.minWordsPerSection || 20,
      requireActionableLanguage: options.requireActionableLanguage ?? true,
      requiredTerms: options.requiredTerms || [],
      strictness: options.strictness || 'normal'
    };
  }

  /**
   * Validate plan against template
   */
  validate(plan: string, template: PlanningTemplate): DetailedValidationResult {
    const missingSections: string[] = [];
    const incompleteCriteria: string[] = [];
    const sectionDetails: SectionValidation[] = [];
    const suggestions: string[] = [];

    const planLower = plan.toLowerCase();

    // Validate each section
    for (const section of template.sections) {
      const validation = this.validateSection(plan, planLower, section);
      sectionDetails.push(validation);

      if (section.required && !validation.exists) {
        missingSections.push(section.title);
        suggestions.push(`Add required section: ${section.title}`);
      } else if (validation.exists && validation.wordCount < this.options.minWordsPerSection) {
        suggestions.push(`Expand section "${section.title}" with more details (currently ${validation.wordCount} words)`);
      }

      if (this.options.requireActionableLanguage && !validation.hasActionableLanguage) {
        suggestions.push(`Add actionable language to "${section.title}" (e.g., "will", "must", "should")`);
      }

      if (validation.missingTerms.length > 0) {
        suggestions.push(`Include technical terms in "${section.title}": ${validation.missingTerms.join(', ')}`);
      }
    }

    // Validate completion criteria
    if (template.completionCriteria && template.completionCriteria.length > 0) {
      for (const criterion of template.completionCriteria) {
        if (!this.checkCriterion(planLower, criterion)) {
          incompleteCriteria.push(criterion);
          suggestions.push(`Address completion criterion: ${criterion}`);
        }
      }
    }

    // Calculate overall score
    const totalSections = template.sections.length;
    const totalCriteria = template.completionCriteria?.length || 0;
    const requiredSections = template.sections.filter(s => s.required).length;

    let score = 0;

    // Section completeness (50% weight)
    const sectionScore = this.calculateSectionScore(sectionDetails, template);
    score += sectionScore * 0.5;

    // Criteria completeness (30% weight)
    if (totalCriteria > 0) {
      const criteriaScore = ((totalCriteria - incompleteCriteria.length) / totalCriteria) * 100;
      score += criteriaScore * 0.3;
    } else {
      score += 30; // Full points if no criteria
    }

    // Quality metrics (20% weight)
    const qualityScore = this.calculateQualityScore(sectionDetails);
    score += qualityScore * 0.2;

    score = Math.round(score);

    // Determine quality
    const quality = this.determineQuality(score, missingSections.length, sectionDetails);

    return {
      valid: missingSections.length === 0,
      missingSections,
      incompleteCriteria,
      score,
      sectionDetails,
      quality,
      suggestions
    };
  }

  /**
   * Validate a single section
   */
  private validateSection(
    plan: string,
    planLower: string,
    section: PlanningSection
  ): SectionValidation {
    const titleLower = section.title.toLowerCase();

    // Check if section exists
    const exists = this.sectionExists(planLower, titleLower);

    if (!exists) {
      return {
        sectionId: section.id,
        sectionTitle: section.title,
        exists: false,
        wordCount: 0,
        hasActionableLanguage: false,
        missingTerms: this.options.requiredTerms,
        score: 0
      };
    }

    // Extract section content
    const sectionContent = this.extractSectionContent(plan, section.title);

    // Count words
    const wordCount = this.countWords(sectionContent);

    // Check for actionable language
    const hasActionableLanguage = this.hasActionableLanguage(sectionContent);

    // Check for required terms
    const missingTerms = this.findMissingTerms(sectionContent.toLowerCase(), this.options.requiredTerms);

    // Calculate section score
    let sectionScore = 0;

    // Existence: 40 points
    sectionScore += 40;

    // Word count: 30 points
    const wordRatio = Math.min(wordCount / this.options.minWordsPerSection, 1);
    sectionScore += wordRatio * 30;

    // Actionable language: 15 points
    if (hasActionableLanguage) {
      sectionScore += 15;
    }

    // Required terms: 15 points
    const termRatio = this.options.requiredTerms.length > 0
      ? (this.options.requiredTerms.length - missingTerms.length) / this.options.requiredTerms.length
      : 1;
    sectionScore += termRatio * 15;

    return {
      sectionId: section.id,
      sectionTitle: section.title,
      exists: true,
      wordCount,
      hasActionableLanguage,
      missingTerms,
      score: Math.round(sectionScore)
    };
  }

  /**
   * Check if section exists in plan
   */
  private sectionExists(planLower: string, titleLower: string): boolean {
    const patterns = [
      `# ${titleLower}`,
      `## ${titleLower}`,
      `### ${titleLower}`,
      `#### ${titleLower}`,
      `##### ${titleLower}`,
      `${titleLower}:`,
      `${titleLower}\n`,
      `**${titleLower}**`
    ];

    return patterns.some(pattern => planLower.includes(pattern));
  }

  /**
   * Extract content for a specific section
   */
  private extractSectionContent(plan: string, sectionTitle: string): string {
    const lines = plan.split('\n');
    let inSection = false;
    let content = '';

    for (const line of lines) {
      const trimmed = line.trim();
      const lowerLine = trimmed.toLowerCase();
      const lowerTitle = sectionTitle.toLowerCase();

      // Check if this is the section header
      if (lowerLine.includes(lowerTitle) && /^#{1,6}\s/.test(trimmed)) {
        inSection = true;
        continue;
      }

      // Check if we've hit the next section
      if (inSection && /^#{1,6}\s/.test(trimmed)) {
        break;
      }

      if (inSection) {
        content += line + '\n';
      }
    }

    return content.trim();
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Check for actionable language
   */
  private hasActionableLanguage(text: string): boolean {
    const actionWords = [
      'will', 'must', 'should', 'shall', 'need to', 'have to',
      'implement', 'create', 'build', 'develop', 'design',
      'ensure', 'verify', 'validate', 'test', 'review'
    ];

    const textLower = text.toLowerCase();
    return actionWords.some(word => textLower.includes(word));
  }

  /**
   * Find missing required terms
   */
  private findMissingTerms(textLower: string, requiredTerms: string[]): string[] {
    return requiredTerms.filter(term => !textLower.includes(term.toLowerCase()));
  }

  /**
   * Check if completion criterion is met
   */
  private checkCriterion(planLower: string, criterion: string): boolean {
    const criterionLower = criterion.toLowerCase();
    const keywords = this.extractKeywords(criterionLower);

    // At least 50% of keywords should appear
    const threshold = Math.ceil(keywords.length * 0.5);
    const matches = keywords.filter(keyword => planLower.includes(keyword));

    return matches.length >= threshold;
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    return text
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'from', 'have', 'will', 'must', 'should', 'when', 'where'].includes(word));
  }

  /**
   * Calculate section score
   */
  private calculateSectionScore(sectionDetails: SectionValidation[], template: PlanningTemplate): number {
    const requiredSections = template.sections.filter(s => s.required);
    const optionalSections = template.sections.filter(s => !s.required);

    let requiredScore = 0;
    let optionalScore = 0;

    for (const detail of sectionDetails) {
      const section = template.sections.find(s => s.id === detail.sectionId);
      if (!section) continue;

      if (section.required) {
        requiredScore += detail.score;
      } else {
        optionalScore += detail.score;
      }
    }

    // Required sections: 80% weight, Optional: 20% weight
    const avgRequiredScore = requiredSections.length > 0 ? requiredScore / requiredSections.length : 100;
    const avgOptionalScore = optionalSections.length > 0 ? optionalScore / optionalSections.length : 100;

    return avgRequiredScore * 0.8 + avgOptionalScore * 0.2;
  }

  /**
   * Calculate quality score based on section details
   */
  private calculateQualityScore(sectionDetails: SectionValidation[]): number {
    if (sectionDetails.length === 0) return 0;

    let totalQuality = 0;

    for (const detail of sectionDetails) {
      let quality = 0;

      // High word count
      if (detail.wordCount >= this.options.minWordsPerSection * 2) {
        quality += 40;
      } else if (detail.wordCount >= this.options.minWordsPerSection) {
        quality += 20;
      }

      // Actionable language
      if (detail.hasActionableLanguage) {
        quality += 30;
      }

      // All required terms present
      if (detail.missingTerms.length === 0 && this.options.requiredTerms.length > 0) {
        quality += 30;
      }

      totalQuality += quality;
    }

    return totalQuality / sectionDetails.length;
  }

  /**
   * Determine overall quality
   */
  private determineQuality(
    score: number,
    missingSectionsCount: number,
    sectionDetails: SectionValidation[]
  ): 'excellent' | 'good' | 'adequate' | 'poor' {
    // Any missing required sections = not excellent
    if (missingSectionsCount > 0) {
      return score >= 70 ? 'adequate' : 'poor';
    }

    // Check section quality
    const avgSectionScore = sectionDetails.reduce((sum, d) => sum + d.score, 0) / sectionDetails.length;

    if (score >= 90 && avgSectionScore >= 85) {
      return 'excellent';
    } else if (score >= 75 && avgSectionScore >= 70) {
      return 'good';
    } else if (score >= 60) {
      return 'adequate';
    } else {
      return 'poor';
    }
  }

  /**
   * Quick validation (just check required sections)
   */
  quickValidate(plan: string, template: PlanningTemplate): PlanValidationResult {
    const missingSections: string[] = [];
    const incompleteCriteria: string[] = [];
    const planLower = plan.toLowerCase();

    // Check required sections
    for (const section of template.sections) {
      if (section.required && !this.sectionExists(planLower, section.title.toLowerCase())) {
        missingSections.push(section.title);
      }
    }

    // Check completion criteria
    if (template.completionCriteria) {
      for (const criterion of template.completionCriteria) {
        if (!this.checkCriterion(planLower, criterion)) {
          incompleteCriteria.push(criterion);
        }
      }
    }

    // Simple score calculation
    const totalRequired = template.sections.filter(s => s.required).length + (template.completionCriteria?.length || 0);
    const missing = missingSections.length + incompleteCriteria.length;
    const score = totalRequired > 0 ? Math.round(((totalRequired - missing) / totalRequired) * 100) : 100;

    return {
      valid: missingSections.length === 0,
      missingSections,
      incompleteCriteria,
      score
    };
  }
}
