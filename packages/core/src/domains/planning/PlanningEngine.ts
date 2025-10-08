/**
 * Planning Engine
 *
 * Forces AI to create structured plans before coding.
 * Uses planning templates from expertise packages to ensure
 * proper planning before implementation.
 */

import type {
  PlanningTemplate,
  PlanningSection,
  PlanValidationResult
} from '../expertise/types';

/**
 * Enhanced prompt with planning requirement
 */
export interface EnhancedPromptWithPlan {
  /** Enhanced prompt text (original + planning requirements) */
  prompt: string;

  /** Whether planning is required */
  planningRequired: boolean;

  /** Template ID being used (if planning required) */
  templateId?: string;

  /** Template name being used (if planning required) */
  templateName?: string;

  /** Validator function to check plan adherence */
  validator?: (plan: string, implementation?: string) => PlanValidationResult;
}

/**
 * Context for selecting planning templates
 */
export interface PlanningContext {
  /** User prompt */
  prompt: string;

  /** Project type */
  projectType?: string;

  /** Programming language */
  language?: string;

  /** Framework */
  framework?: string;

  /** Task type (if detected) */
  taskType?: string;

  /** File paths involved */
  filePaths?: string[];
}

/**
 * Planning Engine
 * Enforces structured planning before coding
 */
export class PlanningEngine {
  private templates: Map<string, PlanningTemplate> = new Map();

  constructor(templates: PlanningTemplate[] = []) {
    for (const template of templates) {
      this.templates.set(template.id, template);
    }
  }

  /**
   * Add planning template
   */
  addTemplate(template: PlanningTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Add multiple templates
   */
  addTemplates(templates: PlanningTemplate[]): void {
    for (const template of templates) {
      this.addTemplate(template);
    }
  }

  /**
   * Remove template
   */
  removeTemplate(templateId: string): void {
    this.templates.delete(templateId);
  }

  /**
   * Get all templates
   */
  getTemplates(): PlanningTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): PlanningTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Force AI to create plan before coding
   * This is the PRIMARY method - enhances prompts with planning requirements
   */
  enforcePlanning(context: PlanningContext | string): EnhancedPromptWithPlan {
    const promptText = typeof context === 'string' ? context : context.prompt;
    const contextObj = typeof context === 'string' ? { prompt: context } : context;

    // Find applicable template
    const template = this.selectTemplate(contextObj);

    if (!template) {
      return {
        prompt: promptText,
        planningRequired: false
      };
    }

    // Inject planning requirement
    const enhancedPrompt = this.buildEnhancedPrompt(promptText, template);

    return {
      prompt: enhancedPrompt,
      planningRequired: true,
      templateId: template.id,
      templateName: template.name,
      validator: (plan: string, implementation?: string) =>
        this.validatePlan(plan, template, implementation)
    };
  }

  /**
   * Select appropriate planning template based on context
   */
  private selectTemplate(context: PlanningContext): PlanningTemplate | undefined {
    const promptLower = context.prompt.toLowerCase();
    const templates = this.getTemplates();

    // Find templates with matching trigger patterns
    const matches: Array<{ template: PlanningTemplate; score: number }> = [];

    for (const template of templates) {
      let score = 0;

      // Check trigger patterns
      for (const pattern of template.triggerPatterns) {
        const patternLower = pattern.toLowerCase();
        if (promptLower.includes(patternLower)) {
          score += 10;
        }
      }

      // Boost score for context matches
      if (context.language && template.name.toLowerCase().includes(context.language.toLowerCase())) {
        score += 5;
      }

      if (context.framework && template.name.toLowerCase().includes(context.framework.toLowerCase())) {
        score += 5;
      }

      if (context.taskType && template.name.toLowerCase().includes(context.taskType.toLowerCase())) {
        score += 5;
      }

      if (score > 0) {
        matches.push({ template, score });
      }
    }

    // Return highest scoring template
    if (matches.length === 0) {
      return undefined;
    }

    matches.sort((a, b) => b.score - a.score);
    return matches[0].template;
  }

  /**
   * Build enhanced prompt with planning requirements
   */
  private buildEnhancedPrompt(originalPrompt: string, template: PlanningTemplate): string {
    const sections = this.renderTemplate(template);

    return `MANDATORY: Before writing any code, you must create a detailed plan following this structure.

${sections}

After completing all required sections above, proceed with implementation.

IMPORTANT: Do not skip the planning phase. The plan must address all required sections.

Original request: ${originalPrompt}`;
  }

  /**
   * Render planning template as text
   */
  private renderTemplate(template: PlanningTemplate): string {
    let output = `# Planning Template: ${template.name}\n\n`;

    for (const section of template.sections) {
      const required = section.required ? '[REQUIRED]' : '[OPTIONAL]';
      output += `## ${section.title} ${required}\n\n`;
      output += `${section.prompt}\n\n`;

      if (section.validation) {
        output += `**Validation**: ${section.validation}\n\n`;
      }
    }

    if (template.completionCriteria && template.completionCriteria.length > 0) {
      output += `## Completion Criteria\n\n`;
      output += `The plan is complete when:\n`;
      for (const criterion of template.completionCriteria) {
        output += `- ${criterion}\n`;
      }
      output += `\n`;
    }

    return output;
  }

  /**
   * Validate that plan follows template structure
   */
  private validatePlan(
    plan: string,
    template: PlanningTemplate,
    implementation?: string
  ): PlanValidationResult {
    const missingSections: string[] = [];
    const incompleteCriteria: string[] = [];
    const planLower = plan.toLowerCase();

    // Check required sections exist
    const requiredSections = template.sections.filter(s => s.required);
    for (const section of requiredSections) {
      const sectionExists = this.sectionExists(planLower, section);
      if (!sectionExists) {
        missingSections.push(section.title);
      }
    }

    // Check completion criteria
    if (template.completionCriteria && template.completionCriteria.length > 0) {
      for (const criterion of template.completionCriteria) {
        const criterionLower = criterion.toLowerCase();
        const keywords = this.extractKeywords(criterionLower);

        // Check if any keyword from criterion appears in plan
        const found = keywords.some(keyword => planLower.includes(keyword));
        if (!found) {
          incompleteCriteria.push(criterion);
        }
      }
    }

    // Calculate score (0-100)
    const totalRequiredSections = requiredSections.length;
    const totalCriteria = template.completionCriteria?.length || 0;
    const totalRequirements = totalRequiredSections + totalCriteria;

    let score = 100;
    if (totalRequirements > 0) {
      const missing = missingSections.length + incompleteCriteria.length;
      score = Math.max(0, Math.round(((totalRequirements - missing) / totalRequirements) * 100));
    }

    return {
      valid: missingSections.length === 0,
      missingSections,
      incompleteCriteria,
      score
    };
  }

  /**
   * Check if section exists in plan
   */
  private sectionExists(planLower: string, section: PlanningSection): boolean {
    const titleLower = section.title.toLowerCase();

    // Check for section title with various markdown headers
    const patterns = [
      `# ${titleLower}`,
      `## ${titleLower}`,
      `### ${titleLower}`,
      `#### ${titleLower}`,
      titleLower + ':',
      titleLower + '\n'
    ];

    return patterns.some(pattern => planLower.includes(pattern));
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    return text
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'from', 'have', 'will', 'must', 'should'].includes(word));
  }

  /**
   * Extract plan steps (simple heuristic)
   */
  private extractPlanSteps(plan: string): string[] {
    const steps: string[] = [];
    const lines = plan.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Look for numbered lists, bullet points, or "Step X"
      if (/^(\d+\.|[-*+]|Step \d+)/i.test(trimmed)) {
        // Remove markdown markers and get text
        const stepText = trimmed.replace(/^(\d+\.|[-*+]|Step \d+:?)/i, '').trim();
        if (stepText.length > 10) {
          steps.push(stepText.substring(0, 100)); // Limit length
        }
      }
    }

    return steps;
  }

  /**
   * Extract implemented steps from code/comments (simple heuristic)
   */
  private extractImplementedSteps(implementation: string): string[] {
    const steps: string[] = [];
    const lines = implementation.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Look for comments with steps
      if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*')) {
        const comment = trimmed.replace(/^(\/\/|#|\/\*|\*\/|\*)\s*/, '').trim();
        if (comment.length > 10 && /^(Step|\d+\.|TODO|FIXME)/i.test(comment)) {
          steps.push(comment.substring(0, 100));
        }
      }

      // Look for function/class names (camelCase or snake_case)
      const funcMatch = trimmed.match(/(?:function|class|def|const|let|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
      if (funcMatch) {
        steps.push(funcMatch[1]);
      }
    }

    return steps;
  }

  /**
   * Get template statistics
   */
  getStats(): {
    totalTemplates: number;
    requiredSections: number;
    optionalSections: number;
    avgSectionsPerTemplate: number;
  } {
    const templates = this.getTemplates();
    let totalRequired = 0;
    let totalOptional = 0;
    let totalSections = 0;

    for (const template of templates) {
      for (const section of template.sections) {
        totalSections++;
        if (section.required) {
          totalRequired++;
        } else {
          totalOptional++;
        }
      }
    }

    return {
      totalTemplates: templates.length,
      requiredSections: totalRequired,
      optionalSections: totalOptional,
      avgSectionsPerTemplate: templates.length > 0 ? totalSections / templates.length : 0
    };
  }
}
