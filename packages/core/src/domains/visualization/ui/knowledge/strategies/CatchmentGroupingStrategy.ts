/**
 * CatchmentGroupingStrategy - Group items by relevance to current maturity context
 *
 * Groups items into 3 categories based on how well they match the user's context:
 * - IN: Fully within catchment basin (perfect match)
 * - PARTIAL: Partially matches context (some dimensions match)
 * - OUT: Outside catchment basin (no match)
 *
 * Requires maturity context to be set, otherwise all items are ungrouped.
 */

import { KnowledgeItem, MaturityContext } from '../../../../knowledge/types';
import { GroupType, CatchmentStatus } from '../../../../knowledge/GroupTypes';
import { ViewMode, GroupSection } from '../ViewMode';
import { BaseGroupingStrategy } from '../GroupingStrategy';
import { MaturityFilterEngine } from '../../../../knowledge/MaturityFilterEngine';

export class CatchmentGroupingStrategy extends BaseGroupingStrategy {
  private filterEngine: MaturityFilterEngine;

  constructor() {
    super();
    this.filterEngine = new MaturityFilterEngine();
  }

  getMode(): ViewMode {
    return ViewMode.BY_CATCHMENT;
  }

  getGroupType(): GroupType {
    return GroupType.CATCHMENT;
  }

  getLabel(): string {
    return 'Relevance';
  }

  getIcon(): string {
    return '🎪';
  }

  getDescription(): string {
    return 'Group by relevance to current maturity context';
  }

  calculateGroups(items: KnowledgeItem[], context?: MaturityContext | null): GroupSection[] {
    // If no context, can't determine catchment
    if (!context) {
      return [];
    }

    const groups: GroupSection[] = [];

    // Filter items that have maturity metadata
    const { validItems } = this.filterItemsWithMaturity(
      items,
      (item) => !!(item.maturity)
    );

    // Categorize each item by catchment status
    const inCatchment: KnowledgeItem[] = [];
    const partialCatchment: KnowledgeItem[] = [];
    const outCatchment: KnowledgeItem[] = [];

    validItems.forEach(item => {
      const status = this.determineCatchmentStatus(item, context);

      switch (status) {
        case CatchmentStatus.IN:
          inCatchment.push(item);
          break;
        case CatchmentStatus.PARTIAL:
          partialCatchment.push(item);
          break;
        case CatchmentStatus.OUT:
          outCatchment.push(item);
          break;
      }
    });

    // Create groups
    if (inCatchment.length > 0) {
      groups.push(
        this.createGroupSection(
          'catchment-in',
          '✅ Fully Relevant',
          inCatchment.map(item => item.id),
          { status: CatchmentStatus.IN },
          'Items that perfectly match your current context'
        )
      );
    }

    if (partialCatchment.length > 0) {
      groups.push(
        this.createGroupSection(
          'catchment-partial',
          '🔵 Partially Relevant',
          partialCatchment.map(item => item.id),
          { status: CatchmentStatus.PARTIAL },
          'Items that partially match your context'
        )
      );
    }

    if (outCatchment.length > 0) {
      groups.push(
        this.createGroupSection(
          'catchment-out',
          '⚪ Not Relevant',
          outCatchment.map(item => item.id),
          { status: CatchmentStatus.OUT },
          'Items outside your current context'
        )
      );
    }

    return groups;
  }

  /**
   * Determine catchment status for an item
   */
  private determineCatchmentStatus(item: KnowledgeItem, context: MaturityContext): CatchmentStatus {
    if (!item.maturity) {
      return CatchmentStatus.OUT;
    }

    // Use the filter engine to check if item matches context
    const matches = this.filterEngine.matchesContext(item, context);

    if (matches) {
      // Check if it's a perfect match or partial match
      const isFullMatch = this.isFullMatch(item, context);
      return isFullMatch ? CatchmentStatus.IN : CatchmentStatus.PARTIAL;
    }

    return CatchmentStatus.OUT;
  }

  /**
   * Check if item fully matches context (all dimensions match)
   */
  private isFullMatch(item: KnowledgeItem, context: MaturityContext): boolean {
    if (!item.maturity) {
      return false;
    }

    // Check if context's quadrant and complexity are within item's ranges
    // This is a simplified check - could be more sophisticated
    const complexityLevel = this.complexityToNumber(context.complexity);
    const complexityMatches = complexityLevel && item.maturity.complexity ?
      this.isLevelInRange(complexityLevel, item.maturity.complexity.min, item.maturity.complexity.max) :
      false;

    // For quadrant, we'd need to decompose it into operator/project coordinates
    // Simplified for now - consider it full match if complexity matches and item has ranges
    return complexityMatches;
  }

  /**
   * Convert DomainComplexity enum to number (1-3)
   */
  private complexityToNumber(complexity: any): number {
    const map: Record<string, number> = {
      'simple': 1,
      'standard': 2,
      'complex': 3
    };
    return map[complexity] || 0;
  }
}
