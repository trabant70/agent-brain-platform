/**
 * GroupingStrategy - Interface for knowledge item grouping strategies
 *
 * Lightweight strategy pattern for grouping items in different ways.
 * Each strategy calculates groups without owning rendering logic.
 */

import { KnowledgeItem, MaturityContext } from '../../../knowledge/types';
import { GroupType } from '../../../knowledge/GroupTypes';
import { ViewMode, GroupSection } from './ViewMode';

/**
 * Interface for grouping strategies
 */
export interface GroupingStrategy {
  /**
   * Get the view mode identifier
   */
  getMode(): ViewMode;

  /**
   * Get the GroupType for injection operations
   */
  getGroupType(): GroupType;

  /**
   * Calculate groups from items
   * @param items All knowledge items
   * @param context Optional maturity context for filtering
   * @returns Calculated groups
   */
  calculateGroups(items: KnowledgeItem[], context?: MaturityContext | null): GroupSection[];

  /**
   * Get display label for this grouping mode
   */
  getLabel(): string;

  /**
   * Get icon/emoji for this grouping mode
   */
  getIcon(): string;

  /**
   * Get description for this grouping mode
   */
  getDescription(): string;
}

/**
 * Abstract base class with common utilities
 */
export abstract class BaseGroupingStrategy implements GroupingStrategy {
  abstract getMode(): ViewMode;
  abstract getGroupType(): GroupType;
  abstract calculateGroups(items: KnowledgeItem[], context?: MaturityContext | null): GroupSection[];
  abstract getLabel(): string;
  abstract getIcon(): string;
  abstract getDescription(): string;

  /**
   * Filter items that don't have required maturity metadata
   */
  protected filterItemsWithMaturity(
    items: KnowledgeItem[],
    dimensionCheck: (item: KnowledgeItem) => boolean
  ): { validItems: KnowledgeItem[]; ungroupedIds: string[] } {
    const validItems: KnowledgeItem[] = [];
    const ungroupedIds: string[] = [];

    items.forEach(item => {
      if (item.maturity && dimensionCheck(item)) {
        validItems.push(item);
      } else {
        ungroupedIds.push(item.id);
      }
    });

    return { validItems, ungroupedIds };
  }

  /**
   * Check if an item's range includes a specific level
   */
  protected isLevelInRange(level: number, min: number, max: number): boolean {
    return level >= min && level <= max;
  }

  /**
   * Create a group section
   */
  protected createGroupSection(
    id: string,
    label: string,
    itemIds: string[],
    metadata?: Record<string, any>,
    description?: string
  ): GroupSection {
    return {
      id,
      label,
      description,
      itemIds,
      metadata,
      isExpanded: false
    };
  }
}
