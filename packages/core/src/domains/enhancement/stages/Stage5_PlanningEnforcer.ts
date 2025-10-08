/**
 * Stage5_PlanningEnforcer - Enhancement stage that enforces planning before coding
 *
 * Extends Stage 4 (Success Patterns) and adds:
 * - Mandatory planning templates from expertise packages
 * - Plan validation before implementation
 * - Structured thinking enforcement
 *
 * This is the HIGHEST level of enhancement - applies organizational/expert knowledge
 * before any code is written.
 */

import { Stage4_SuccessLearner } from './Stage4_SuccessLearner';
import { EnhancementContext } from '../types';
import { PlanningEngine, EnhancedPromptWithPlan } from '../../planning/PlanningEngine';
import type { PlanningTemplate, Stage5Metadata } from '../../expertise/types';

/**
 * Planning enforcement configuration
 */
export interface PlanningEnforcementConfig {
  /** Whether to enforce planning (can be disabled) */
  enabled?: boolean;

  /** Minimum prompt length to trigger planning (words) */
  minPromptLength?: number;

  /** Keywords that always trigger planning */
  alwaysTriggerKeywords?: string[];

  /** Keywords that never trigger planning */
  neverTriggerKeywords?: string[];
}

/**
 * Stage 5: Planning Enforcement
 * Forces AI to create structured plans before coding
 */
export class Stage5_PlanningEnforcer extends Stage4_SuccessLearner {
  private planningEngine: PlanningEngine;
  private config: Required<PlanningEnforcementConfig>;
  private lastEnhancement?: EnhancedPromptWithPlan;

  constructor(
    successDetector: any,
    profileManager: any,
    planningEngine: PlanningEngine,
    config: PlanningEnforcementConfig = {}
  ) {
    super(successDetector, profileManager);
    this.planningEngine = planningEngine;
    this.config = {
      enabled: config.enabled ?? true,
      minPromptLength: config.minPromptLength || 10,
      alwaysTriggerKeywords: config.alwaysTriggerKeywords || [
        'implement', 'create', 'build', 'develop', 'refactor',
        'migrate', 'design', 'architect', 'feature', 'system'
      ],
      neverTriggerKeywords: config.neverTriggerKeywords || [
        'fix typo', 'update comment', 'rename', 'format',
        'debug', 'test', 'check', 'review'
      ]
    };
  }

  /**
   * Enhance prompt with all stages + planning enforcement
   */
  enhance(prompt: string, context: EnhancementContext): string {
    // Apply Stage 4 enhancements first (success patterns + structural + patterns + context)
    let enhanced = super.enhance(prompt, context);

    // Check if planning should be enforced
    if (!this.shouldEnforcePlanning(prompt, context)) {
      this.lastEnhancement = undefined;
      return enhanced;
    }

    // Get planning templates from engine
    const planningContext = {
      prompt,
      projectType: context.projectType,
      language: context.language,
      framework: context.framework,
      filePaths: context.currentFile ? [context.currentFile] : undefined
    };

    // Enforce planning
    const planningEnhancement = this.planningEngine.enforcePlanning(planningContext);
    this.lastEnhancement = planningEnhancement;

    // If planning is required, inject it
    if (planningEnhancement.planningRequired) {
      enhanced = this.injectPlanningRequirement(
        enhanced,
        planningEnhancement,
        context
      );
    }

    return enhanced;
  }

  /**
   * Get metadata about the last enhancement
   */
  getStage5Metadata(): Stage5Metadata | undefined {
    if (!this.lastEnhancement || !this.lastEnhancement.planningRequired) {
      return {
        planningTemplate: undefined,
        mandatoryRulesApplied: [],
        packagesUsed: []
      };
    }

    return {
      planningTemplate: this.lastEnhancement.templateId,
      mandatoryRulesApplied: [],  // Will be populated when rules are implemented
      packagesUsed: []  // Will be populated when package tracking is added
    };
  }

  /**
   * Get the planning validator function
   */
  getPlanValidator(): ((plan: string, implementation?: string) => any) | undefined {
    return this.lastEnhancement?.validator;
  }

  /**
   * Check if planning should be enforced
   */
  private shouldEnforcePlanning(prompt: string, context: EnhancementContext): boolean {
    // Check if planning is enabled
    if (!this.config.enabled) {
      return false;
    }

    const promptLower = prompt.toLowerCase();

    // Never trigger keywords - always skip planning
    for (const keyword of this.config.neverTriggerKeywords) {
      if (promptLower.includes(keyword.toLowerCase())) {
        return false;
      }
    }

    // Always trigger keywords - always enforce planning
    for (const keyword of this.config.alwaysTriggerKeywords) {
      if (promptLower.includes(keyword.toLowerCase())) {
        return true;
      }
    }

    // Check prompt length
    const wordCount = prompt.split(/\s+/).length;
    if (wordCount < this.config.minPromptLength) {
      return false;  // Too short, probably not a complex task
    }

    // Check if there are available templates
    const templates = this.planningEngine.getTemplates();
    if (templates.length === 0) {
      return false;  // No templates available
    }

    return true;
  }

  /**
   * Inject planning requirement into enhanced prompt
   */
  private injectPlanningRequirement(
    enhanced: string,
    planningEnhancement: EnhancedPromptWithPlan,
    context: EnhancementContext
  ): string {
    // Build the planning section
    const planningSections: string[] = [];

    // Add planning header
    planningSections.push('\n');
    planningSections.push('='.repeat(80));
    planningSections.push('⚠️  MANDATORY PLANNING REQUIREMENT ⚠️');
    planningSections.push('='.repeat(80));
    planningSections.push('');

    // Add explanation
    planningSections.push('Before writing ANY code, you MUST create a detailed plan.');
    planningSections.push('This planning requirement comes from organizational expertise packages.');
    planningSections.push('');

    // Add template name if available
    if (planningEnhancement.templateName) {
      planningSections.push(`📋 Planning Template: ${planningEnhancement.templateName}`);
      planningSections.push('');
    }

    // Add the planning template content
    // Extract the template rendering from the planning enhancement
    const templateMatch = planningEnhancement.prompt.match(/# Planning Template:[\s\S]*/);
    if (templateMatch) {
      planningSections.push(templateMatch[0]);
    }

    planningSections.push('');
    planningSections.push('⚠️  DO NOT SKIP THIS PLANNING PHASE ⚠️');
    planningSections.push('');
    planningSections.push('After completing all required planning sections, you may proceed with implementation.');
    planningSections.push('='.repeat(80));
    planningSections.push('');

    // Insert planning requirement at the beginning (after Stage 4 enhancements)
    return planningSections.join('\n') + '\n' + enhanced;
  }

  /**
   * Update planning templates (allows dynamic template management)
   */
  updateTemplates(templates: PlanningTemplate[]): void {
    // Clear existing templates
    const existing = this.planningEngine.getTemplates();
    for (const template of existing) {
      this.planningEngine.removeTemplate(template.id);
    }

    // Add new templates
    this.planningEngine.addTemplates(templates);
  }

  /**
   * Add a single template
   */
  addTemplate(template: PlanningTemplate): void {
    this.planningEngine.addTemplate(template);
  }

  /**
   * Remove a template
   */
  removeTemplate(templateId: string): void {
    this.planningEngine.removeTemplate(templateId);
  }

  /**
   * Get current templates
   */
  getTemplates(): PlanningTemplate[] {
    return this.planningEngine.getTemplates();
  }

  /**
   * Get statistics
   */
  getStats(): {
    planningEnabled: boolean;
    totalTemplates: number;
    lastPlanningRequired: boolean;
    lastTemplateUsed?: string;
  } {
    return {
      planningEnabled: this.config.enabled,
      totalTemplates: this.planningEngine.getTemplates().length,
      lastPlanningRequired: this.lastEnhancement?.planningRequired || false,
      lastTemplateUsed: this.lastEnhancement?.templateName
    };
  }

  /**
   * Enable/disable planning enforcement
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Check if planning enforcement is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
}
