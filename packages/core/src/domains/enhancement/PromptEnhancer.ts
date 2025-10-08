/**
 * Prompt Enhancer
 *
 * Facade that coordinates enhancement stages.
 * Currently implements Stage 1-5 (Phase 1-3 + Planning).
 * Will progressively add stages 6-8 in future phases.
 */

import { Stage1_ContextInjector } from './stages/Stage1_ContextInjector';
import { Stage2_PatternExpander } from './stages/Stage2_PatternExpander';
import { Stage3_StructuredEnhancer } from './stages/Stage3_StructuredEnhancer';
import { Stage4_SuccessLearner } from './stages/Stage4_SuccessLearner';
import { Stage5_PlanningEnforcer } from './stages/Stage5_PlanningEnforcer';
import { EnhancementContext, EnhancedPrompt } from './types';
import { SuccessPatternDetector } from '../knowledge/success/SuccessPatternDetector';
import { ProjectProfileManager } from '../knowledge/ProjectProfileManager';
import { PlanningEngine } from '../planning/PlanningEngine';
import type { Stage5Metadata } from '../expertise/types';

export class PromptEnhancer {
  private stage1: Stage1_ContextInjector;
  private stage2: Stage2_PatternExpander;
  private stage3: Stage3_StructuredEnhancer;
  private stage4: Stage4_SuccessLearner | null = null;
  private stage5: Stage5_PlanningEnforcer | null = null;

  constructor(
    successDetector?: SuccessPatternDetector,
    profileManager?: ProjectProfileManager,
    planningEngine?: PlanningEngine
  ) {
    this.stage1 = new Stage1_ContextInjector();
    this.stage2 = new Stage2_PatternExpander();
    this.stage3 = new Stage3_StructuredEnhancer();

    // Stage 4 is optional - only available if systems are provided
    if (successDetector && profileManager) {
      this.stage4 = new Stage4_SuccessLearner(successDetector, profileManager);

      // Stage 5 is optional - requires Stage 4 + planning engine
      if (planningEngine) {
        this.stage5 = new Stage5_PlanningEnforcer(
          successDetector,
          profileManager,
          planningEngine
        );
      }
    }
  }

  /**
   * Enhance prompt using highest available stage (Stage 5 if available, fallback to Stage 4/3)
   *
   * @param prompt - Original user prompt
   * @param context - Enhancement context
   * @returns Enhanced prompt with metadata
   */
  async enhance(prompt: string, context: EnhancementContext): Promise<EnhancedPrompt> {
    let enhanced: string;
    let stage: number;
    let successPatternsApplied: string[] | undefined;
    let stage5Metadata: Stage5Metadata | undefined;

    if (this.stage5) {
      // Use Stage 5 (includes Stage 1-4 via inheritance + planning enforcement)
      enhanced = this.stage5.enhance(prompt, context);
      stage = 5;
      successPatternsApplied = this.stage5.getPatternIds();
      stage5Metadata = this.stage5.getStage5Metadata();
    } else if (this.stage4) {
      // Use Stage 4 (includes Stage 1-3 via inheritance)
      enhanced = this.stage4.enhance(prompt, context);
      stage = 4;
      successPatternsApplied = this.stage4.getPatternIds();
    } else {
      // Fallback to Stage 3
      enhanced = this.stage3.enhance(prompt, context);
      stage = 3;
    }

    return {
      original: prompt,
      enhanced,
      stage,
      itemsUsed: this.countItemsUsed(context),
      context,
      successPatternsApplied,
      stage5Metadata
    };
  }

  /**
   * Get the Stage 5 instance (if available)
   */
  getStage5(): Stage5_PlanningEnforcer | null {
    return this.stage5;
  }

  /**
   * Check if Stage 5 is available
   */
  hasStage5(): boolean {
    return this.stage5 !== null;
  }

  /**
   * Get current enhancement stage level
   */
  getCurrentStage(): number {
    if (this.stage5) return 5;
    if (this.stage4) return 4;
    return 3;
  }

  /**
   * Count how many knowledge items were used in enhancement
   */
  private countItemsUsed(context: EnhancementContext): number {
    let count = 0;

    if (context.patterns && context.patterns.length > 0) {
      count += context.patterns.length;
    }

    if (context.constraints && context.constraints.length > 0) {
      count += context.constraints.length;
    }

    if (context.recentErrors && context.recentErrors.length > 0) {
      count += 1; // Count errors as one knowledge item
    }

    if (context.testFailures && context.testFailures.length > 0) {
      count += 1; // Count test failures as one knowledge item
    }

    return count;
  }
}
