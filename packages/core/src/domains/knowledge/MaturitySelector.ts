/**
 * MaturitySelector - Distance-based knowledge item selection
 *
 * Filters knowledge items based on their 3D maturity footprint
 * and the user's current maturity context, using distance-based
 * relevance calculation for smooth falloff.
 */

import {
  KnowledgeItem,
  MaturityContext,
  MaturityFootprint,
  MaturityRange,
  OperatorMaturity,
  ProjectMaturity,
  DomainComplexity,
  SelectedKnowledgeItem
} from './types';

/**
 * MaturitySelector - Tag-based knowledge item selection
 * Filters items based on current maturity context using distance-based relevance
 */
export class MaturitySelector {

  /**
   * Select relevant knowledge items based on maturity context
   * Uses distance-based relevance calculation with smooth falloff
   *
   * @param allItems - All available knowledge items
   * @param context - Current maturity context (quadrant + complexity)
   * @returns Array of items with relevance scores, sorted by relevance
   */
  selectItems(
    allItems: KnowledgeItem[],
    context: MaturityContext
  ): SelectedKnowledgeItem[] {

    // Convert context to coordinates
    const { operator, project } = this.quadrantToCoordinates(context.quadrant);
    const complexity = this.complexityToNumber(context.complexity);

    // Calculate relevance for each item
    const scoredItems = allItems
      .map(item => {
        // Items without maturity are universal (always included with base relevance)
        if (!item.maturity) {
          return {
            item,
            relevance: item.relevance || 0.5
          };
        }

        // Calculate distance-based relevance
        const distanceRelevance = this.calculateRelevance(
          item.maturity,
          operator,
          project,
          complexity
        );

        // Multiply by base relevance (item quality score)
        const baseRelevance = item.relevance || 0.5;
        const finalRelevance = distanceRelevance * baseRelevance;

        return {
          item,
          relevance: finalRelevance
        };
      })
      .filter(entry => entry.relevance > 0.1); // Exclude very low relevance items

    // Sort by relevance (descending)
    scoredItems.sort((a, b) => b.relevance - a.relevance);

    // Apply max items limit if specified
    if (context.maxItems && context.maxItems > 0) {
      return scoredItems.slice(0, context.maxItems);
    }

    return scoredItems;
  }

  /**
   * Calculate relevance score based on distance from current coordinates
   * Uses exponential decay: distance 0 = 1.0, distance 1 = 0.45, distance 2 = 0.20
   *
   * @param footprint - Item's maturity footprint
   * @param operatorCoord - Current operator coordinate (1-5)
   * @param projectCoord - Current project coordinate (1-5)
   * @param complexityCoord - Current complexity coordinate (1-3)
   * @returns Relevance score (0-1)
   */
  private calculateRelevance(
    footprint: MaturityFootprint,
    operatorCoord: number,
    projectCoord: number,
    complexityCoord: number
  ): number {
    // Calculate distance on each dimension (0 if inside range)
    const operatorDist = this.distanceFromRange(operatorCoord, footprint.operator);
    const projectDist = this.distanceFromRange(projectCoord, footprint.project);
    const complexityDist = this.distanceFromRange(complexityCoord, footprint.complexity);

    // Weighted distance (complexity is most important)
    const totalDistance =
      operatorDist * 0.3 +
      projectDist * 0.3 +
      complexityDist * 0.4;

    // Exponential decay: e^(-0.8 * distance)
    // distance 0 → 1.0
    // distance 1 → 0.45
    // distance 2 → 0.20
    // distance 3 → 0.09
    return Math.exp(-totalDistance * 0.8);
  }

  /**
   * Calculate distance from a point to a range
   * Returns 0 if point is inside range, positive number otherwise
   *
   * @param point - Current position on dimension
   * @param range - Valid range for this dimension
   * @returns Distance (0 if inside, positive if outside)
   */
  private distanceFromRange(point: number, range: MaturityRange): number {
    if (point >= range.min && point <= range.max) {
      return 0; // Inside range = perfect match
    } else if (point < range.min) {
      return range.min - point; // Below range
    } else {
      return point - range.max; // Above range
    }
  }

  /**
   * Convert quadrant number (1-25) to operator/project coordinates
   * 5x5 grid layout (bottom-up, left-to-right):
   *
   *   21  22  23  24  25  ← Mature (Y=5)
   *   16  17  18  19  20  ← Established (Y=4)
   *   11  12  13  14  15  ← Development (Y=3)
   *   6   7   8   9   10  ← Inception (Y=2)
   *   1   2   3   4   5   ← Planning (Y=1)
   *   ↑   ↑   ↑   ↑   ↑
   *   Nov Jun Mid Sen Exp
   *   (X=1 to X=5)
   *
   * @param quadrant - Quadrant number (1-25)
   * @returns Operator and project coordinates (1-5)
   */
  quadrantToCoordinates(quadrant: number): { operator: number; project: number } {
    if (quadrant < 1 || quadrant > 25) {
      throw new Error(`Invalid quadrant: ${quadrant}. Must be 1-25.`);
    }

    // Calculate row and column (1-based)
    const row = Math.ceil(quadrant / 5);     // 1-5 (project maturity)
    const col = ((quadrant - 1) % 5) + 1;    // 1-5 (operator maturity)

    return {
      operator: col,  // 1=Novice, 2=Junior, 3=Mid, 4=Senior, 5=Expert
      project: row    // 1=Planning, 2=Inception, 3=Development, 4=Established, 5=Mature
    };
  }

  /**
   * Convert coordinates back to quadrant number
   *
   * @param operator - Operator coordinate (1-5)
   * @param project - Project coordinate (1-5)
   * @returns Quadrant number (1-25)
   */
  coordinatesToQuadrant(operator: number, project: number): number {
    if (operator < 1 || operator > 5 || project < 1 || project > 5) {
      throw new Error(`Invalid coordinates: operator=${operator}, project=${project}. Must be 1-5.`);
    }

    return (project - 1) * 5 + operator;
  }

  /**
   * Convert complexity enum to numeric coordinate
   *
   * @param complexity - Complexity enum value
   * @returns Numeric coordinate (1-3)
   */
  private complexityToNumber(complexity: DomainComplexity): number {
    const mapping: Record<DomainComplexity, number> = {
      [DomainComplexity.SIMPLE]: 1,
      [DomainComplexity.STANDARD]: 2,
      [DomainComplexity.COMPLEX]: 3
    };
    return mapping[complexity];
  }

  /**
   * Convert numeric coordinate to complexity enum
   *
   * @param coord - Numeric coordinate (1-3)
   * @returns Complexity enum value
   */
  numberToComplexity(coord: number): DomainComplexity {
    const mapping: Record<number, DomainComplexity> = {
      1: DomainComplexity.SIMPLE,
      2: DomainComplexity.STANDARD,
      3: DomainComplexity.COMPLEX
    };

    if (!mapping[coord]) {
      throw new Error(`Invalid complexity coordinate: ${coord}. Must be 1-3.`);
    }

    return mapping[coord];
  }

  /**
   * Convert operator coordinate to enum
   *
   * @param coord - Operator coordinate (1-5)
   * @returns Operator maturity enum
   */
  numberToOperator(coord: number): OperatorMaturity {
    const mapping: Record<number, OperatorMaturity> = {
      1: OperatorMaturity.NOVICE,
      2: OperatorMaturity.JUNIOR,
      3: OperatorMaturity.MID,
      4: OperatorMaturity.SENIOR,
      5: OperatorMaturity.EXPERT
    };

    if (!mapping[coord]) {
      throw new Error(`Invalid operator coordinate: ${coord}. Must be 1-5.`);
    }

    return mapping[coord];
  }

  /**
   * Convert project coordinate to enum
   *
   * @param coord - Project coordinate (1-5)
   * @returns Project maturity enum
   */
  numberToProject(coord: number): ProjectMaturity {
    const mapping: Record<number, ProjectMaturity> = {
      1: ProjectMaturity.PLANNING,
      2: ProjectMaturity.INCEPTION,
      3: ProjectMaturity.DEVELOPMENT,
      4: ProjectMaturity.ESTABLISHED,
      5: ProjectMaturity.MATURE
    };

    if (!mapping[coord]) {
      throw new Error(`Invalid project coordinate: ${coord}. Must be 1-5.`);
    }

    return mapping[coord];
  }

  /**
   * Calculate footprint coverage (number of quadrants covered)
   *
   * @param footprint - Maturity footprint
   * @returns Number of quadrants (1-75, or per-complexity layer if specified)
   */
  calculateCoverage(footprint: MaturityFootprint): number {
    const operatorSpan = footprint.operator.max - footprint.operator.min + 1;
    const projectSpan = footprint.project.max - footprint.project.min + 1;
    const complexitySpan = footprint.complexity.max - footprint.complexity.min + 1;

    return operatorSpan * projectSpan * complexitySpan;
  }

  /**
   * Calculate footprint coverage as percentage of total space
   *
   * @param footprint - Maturity footprint
   * @returns Percentage (0-100)
   */
  calculateCoveragePercentage(footprint: MaturityFootprint): number {
    const coverage = this.calculateCoverage(footprint);
    const totalSpace = 5 * 5 * 3; // 75 total quadrants
    return Math.round((coverage / totalSpace) * 100);
  }

  /**
   * Classify footprint by size
   *
   * @param footprint - Maturity footprint
   * @returns Classification label
   */
  classifyFootprint(footprint: MaturityFootprint): 'specific' | 'general' | 'universal' {
    const coverage = this.calculateCoverage(footprint);

    if (coverage >= 50) {
      return 'universal'; // 67%+ of space
    } else if (coverage >= 15) {
      return 'general';   // 20%+ of space
    } else {
      return 'specific';  // <20% of space
    }
  }
}
