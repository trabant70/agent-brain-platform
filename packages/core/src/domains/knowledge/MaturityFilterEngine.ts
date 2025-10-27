/**
 * MaturityFilterEngine - 3D Maturity-Based Knowledge Filtering
 *
 * Implements intersection-based matching algorithm to determine which knowledge
 * items are relevant for a given maturity context.
 *
 * Algorithm: An item matches if the user's position falls within the item's
 * 3D maturity footprint (operator × project × complexity).
 *
 * Matching Formula:
 *   item.operator.min <= user.operator <= item.operator.max AND
 *   item.project.min <= user.project <= item.project.max AND
 *   item.complexity.min <= user.complexity <= item.complexity.max
 *
 * Key Features:
 * - Item-level granularity (not template-level)
 * - Intersection-based matching
 * - Distance-based relevance scoring
 * - Catchment basin classification
 * - Detailed match explanations
 */

import {
  KnowledgeItem,
  MaturityContext,
  MaturityFootprint,
  DomainComplexity
} from './types';
import {
  MatchStats,
  MatchReason,
  CatchmentStatus
} from './GroupTypes';
import { FramingTemplates } from './FramingTemplates';

/**
 * Convert quadrant number (1-25) to operator and project coordinates
 */
interface QuadrantCoordinates {
  operator: number;  // 1-5
  project: number;   // 1-5
}

/**
 * Convert complexity enum to numeric value
 */
function complexityToNumber(complexity: DomainComplexity): number {
  switch (complexity) {
    case DomainComplexity.SIMPLE:
      return 1;
    case DomainComplexity.STANDARD:
      return 2;
    case DomainComplexity.COMPLEX:
      return 3;
    default:
      return 2;
  }
}

/**
 * Convert quadrant (1-25) to operator/project coordinates
 * Quadrant 1 = (1,1), Quadrant 5 = (5,1), Quadrant 25 = (5,5)
 */
function quadrantToCoordinates(quadrant: number): QuadrantCoordinates {
  const operator = ((quadrant - 1) % 5) + 1;  // Columns 1-5
  const project = Math.floor((quadrant - 1) / 5) + 1;  // Rows 1-5
  return { operator, project };
}

export class MaturityFilterEngine {
  /**
   * Check if an item matches the given maturity context
   * Returns true if user's position falls within item's footprint
   */
  matchesContext(item: KnowledgeItem, context: MaturityContext): boolean {
    // Items without footprint are universal (match everything)
    if (!item.maturity) {
      return true;
    }

    const userPos = this.getUserPosition(context);
    const footprint = item.maturity;

    // Intersection test: user position must fall within all 3 ranges
    const operatorMatch = userPos.operator >= footprint.operator.min &&
                         userPos.operator <= footprint.operator.max;

    const projectMatch = userPos.project >= footprint.project.min &&
                        userPos.project <= footprint.project.max;

    const complexityMatch = userPos.complexity >= footprint.complexity.min &&
                           userPos.complexity <= footprint.complexity.max;

    return operatorMatch && projectMatch && complexityMatch;
  }

  /**
   * Get detailed match reason for an item
   * Explains why item was included or excluded
   */
  getMatchReason(item: KnowledgeItem, context: MaturityContext): MatchReason {
    const userPos = this.getUserPosition(context);
    const reasons: string[] = [];
    const dimensions = {
      operator: true,
      project: true,
      complexity: true
    };

    // Universal items (no footprint) always match
    if (!item.maturity) {
      return {
        itemId: item.id,
        matched: true,
        reasons: ['Universal item (no maturity footprint) - applies to all contexts'],
        dimensions
      };
    }

    const footprint = item.maturity;

    // Check operator dimension
    if (userPos.operator < footprint.operator.min) {
      dimensions.operator = false;
      reasons.push(
        `Operator too low: need ${footprint.operator.min}-${footprint.operator.max}, have ${userPos.operator}`
      );
    } else if (userPos.operator > footprint.operator.max) {
      dimensions.operator = false;
      reasons.push(
        `Operator too high: need ${footprint.operator.min}-${footprint.operator.max}, have ${userPos.operator}`
      );
    } else {
      reasons.push(
        `Operator ${userPos.operator} in range [${footprint.operator.min}-${footprint.operator.max}]`
      );
    }

    // Check project dimension
    if (userPos.project < footprint.project.min) {
      dimensions.project = false;
      reasons.push(
        `Project too low: need ${footprint.project.min}-${footprint.project.max}, have ${userPos.project}`
      );
    } else if (userPos.project > footprint.project.max) {
      dimensions.project = false;
      reasons.push(
        `Project too high: need ${footprint.project.min}-${footprint.project.max}, have ${userPos.project}`
      );
    } else {
      reasons.push(
        `Project ${userPos.project} in range [${footprint.project.min}-${footprint.project.max}]`
      );
    }

    // Check complexity dimension
    if (userPos.complexity < footprint.complexity.min) {
      dimensions.complexity = false;
      reasons.push(
        `Complexity too low: need ${footprint.complexity.min}-${footprint.complexity.max}, have ${userPos.complexity}`
      );
    } else if (userPos.complexity > footprint.complexity.max) {
      dimensions.complexity = false;
      reasons.push(
        `Complexity too high: need ${footprint.complexity.min}-${footprint.complexity.max}, have ${userPos.complexity}`
      );
    } else {
      reasons.push(
        `Complexity ${userPos.complexity} in range [${footprint.complexity.min}-${footprint.complexity.max}]`
      );
    }

    const matched = dimensions.operator && dimensions.project && dimensions.complexity;

    return {
      itemId: item.id,
      matched,
      reasons,
      dimensions
    };
  }

  /**
   * Filter items by maturity context
   * Returns { matched, excluded } arrays with reasons
   */
  filterItems(
    items: KnowledgeItem[],
    context: MaturityContext
  ): {
    matched: MatchReason[];
    excluded: MatchReason[];
  } {
    const matched: MatchReason[] = [];
    const excluded: MatchReason[] = [];

    for (const item of items) {
      const reason = this.getMatchReason(item, context);
      if (reason.matched) {
        matched.push(reason);
      } else {
        excluded.push(reason);
      }
    }

    return { matched, excluded };
  }

  /**
   * Calculate match statistics for a collection of items
   */
  getMatchStats(items: KnowledgeItem[], context: MaturityContext): MatchStats {
    const { matched, excluded } = this.filterItems(items, context);
    const totalItems = items.length;
    const matchedItems = matched.length;
    const excludedItems = excluded.length;
    const matchPercentage = totalItems > 0 ? (matchedItems / totalItems) * 100 : 0;

    return {
      totalItems,
      matchedItems,
      excludedItems,
      matchPercentage
    };
  }

  /**
   * Calculate relevance score for an item (0-1)
   * Uses distance-based formula from footprint center to user position
   */
  calculateRelevance(item: KnowledgeItem, context: MaturityContext): number {
    // Universal items get base relevance or 0.5
    if (!item.maturity) {
      return item.relevance ?? 0.5;
    }

    // Items outside footprint get 0 relevance
    if (!this.matchesContext(item, context)) {
      return 0;
    }

    const userPos = this.getUserPosition(context);
    const footprint = item.maturity;

    // Calculate footprint center
    const centerOperator = (footprint.operator.min + footprint.operator.max) / 2;
    const centerProject = (footprint.project.min + footprint.project.max) / 2;
    const centerComplexity = (footprint.complexity.min + footprint.complexity.max) / 2;

    // Calculate normalized distance from center
    const operatorDist = Math.abs(userPos.operator - centerOperator) / 5;  // Normalize to 0-1
    const projectDist = Math.abs(userPos.project - centerProject) / 5;
    const complexityDist = Math.abs(userPos.complexity - centerComplexity) / 3;

    // Euclidean distance in normalized 3D space
    const distance = Math.sqrt(
      operatorDist ** 2 +
      projectDist ** 2 +
      complexityDist ** 2
    );

    // Convert distance to relevance (closer = more relevant)
    // Max distance in normalized space is sqrt(3) ≈ 1.73
    const maxDistance = Math.sqrt(3);
    const distanceScore = 1 - (distance / maxDistance);

    // Apply base relevance multiplier
    const baseRelevance = item.relevance ?? 0.5;
    return distanceScore * baseRelevance;
  }

  /**
   * Determine catchment status for an item
   * IN: Perfect match (center of footprint)
   * PARTIAL: Within footprint but not at center
   * OUT: Outside footprint
   */
  getCatchmentStatus(item: KnowledgeItem, context: MaturityContext): CatchmentStatus {
    if (!item.maturity) {
      return CatchmentStatus.IN;  // Universal items are always IN
    }

    if (!this.matchesContext(item, context)) {
      return CatchmentStatus.OUT;
    }

    const userPos = this.getUserPosition(context);
    const footprint = item.maturity;

    // Calculate footprint center
    const centerOperator = (footprint.operator.min + footprint.operator.max) / 2;
    const centerProject = (footprint.project.min + footprint.project.max) / 2;
    const centerComplexity = (footprint.complexity.min + footprint.complexity.max) / 2;

    // Check if user is at exact center (within 0.1 tolerance for each dimension)
    const atCenter =
      Math.abs(userPos.operator - centerOperator) < 0.1 &&
      Math.abs(userPos.project - centerProject) < 0.1 &&
      Math.abs(userPos.complexity - centerComplexity) < 0.1;

    return atCenter ? CatchmentStatus.IN : CatchmentStatus.PARTIAL;
  }

  /**
   * Sort items by relevance score (descending)
   */
  sortByRelevance(items: KnowledgeItem[], context: MaturityContext): KnowledgeItem[] {
    return [...items].sort((a, b) => {
      const relevanceA = this.calculateRelevance(a, context);
      const relevanceB = this.calculateRelevance(b, context);
      return relevanceB - relevanceA;
    });
  }

  /**
   * Convert maturity context to numeric coordinates
   */
  private getUserPosition(context: MaturityContext): {
    operator: number;
    project: number;
    complexity: number;
  } {
    const coords = quadrantToCoordinates(context.quadrant);
    return {
      operator: coords.operator,
      project: coords.project,
      complexity: complexityToNumber(context.complexity)
    };
  }

  /**
   * Create maturity footprint from operator/project ranges and complexity
   * Helper for creating group injections
   */
  static createFootprint(
    operatorRange: { min: number; max: number },
    projectRange: { min: number; max: number },
    complexityRange: { min: number; max: number }
  ): MaturityFootprint {
    return {
      operator: operatorRange,
      project: projectRange,
      complexity: complexityRange
    };
  }

  /**
   * Create footprint for a specific quadrant (single point, not range)
   * Used for learning capture
   */
  static createFootprintFromContext(context: MaturityContext): MaturityFootprint {
    const coords = quadrantToCoordinates(context.quadrant);
    const complexity = complexityToNumber(context.complexity);

    return {
      operator: { min: coords.operator, max: coords.operator },
      project: { min: coords.project, max: coords.project },
      complexity: { min: complexity, max: complexity }
    };
  }
}
