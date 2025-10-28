/**
 * ComplexityRangeViewController - Group items by domain complexity
 *
 * Groups knowledge items based on their complexity footprint:
 * - Simple (1): Basic concepts, straightforward implementations
 * - Standard (2): Moderate complexity, common patterns
 * - Complex (3): Advanced concepts, intricate systems
 *
 * Items with range footprints (e.g., min=1, max=2) appear in multiple groups.
 */

import { KnowledgeItem } from '../../../knowledge/types';
import { GroupType } from '../../../knowledge/GroupTypes';
import { GroupSection, GroupCalculationResult } from './ViewMode';
import { BaseGroupViewController, GroupViewCallbacks } from './BaseGroupViewController';
import { webviewLogger, LogCategory, LogPathway } from '../../webview/WebviewLogger';

/**
 * Domain complexity levels
 */
enum ComplexityLevel {
  SIMPLE = 1,
  STANDARD = 2,
  COMPLEX = 3
}

/**
 * Metadata for complexity levels
 */
interface ComplexityLevelInfo {
  level: ComplexityLevel;
  label: string;
  description: string;
  icon: string;
}

const COMPLEXITY_LEVELS: ComplexityLevelInfo[] = [
  {
    level: ComplexityLevel.SIMPLE,
    label: 'Simple',
    description: 'Basic concepts, straightforward implementations',
    icon: '🟢'
  },
  {
    level: ComplexityLevel.STANDARD,
    label: 'Standard',
    description: 'Moderate complexity, common patterns and practices',
    icon: '🟡'
  },
  {
    level: ComplexityLevel.COMPLEX,
    label: 'Complex',
    description: 'Advanced concepts, intricate systems and edge cases',
    icon: '🔴'
  }
];

/**
 * View controller for complexity range grouping
 */
export class ComplexityRangeViewController extends BaseGroupViewController {
  constructor(containerId: string, callbacks: GroupViewCallbacks) {
    super(containerId, callbacks);

    webviewLogger.info(
      LogCategory.UI,
      'ComplexityRangeViewController initialized',
      'ComplexityRangeViewController.constructor',
      { containerId },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Return the GroupType for this view
   */
  getGroupType(): GroupType {
    return GroupType.COMPLEXITY_RANGE;
  }

  /**
   * Calculate groups by complexity level
   */
  calculateGroups(items: KnowledgeItem[]): GroupCalculationResult {
    const groups: GroupSection[] = [];
    const ungrouped: string[] = [];

    // Create a group for each complexity level
    COMPLEXITY_LEVELS.forEach(levelInfo => {
      const groupItems = this.getItemsForLevel(items, levelInfo.level);

      if (groupItems.length > 0) {
        groups.push({
          id: `complexity-${levelInfo.level}`,
          label: `${levelInfo.icon} ${levelInfo.label}`,
          description: levelInfo.description,
          itemIds: groupItems.map(item => item.id),
          metadata: {
            level: levelInfo.level,
            range: `${levelInfo.level}`
          },
          isExpanded: false
        });
      }
    });

    // Find items without maturity metadata
    items.forEach(item => {
      if (!item.maturity || !item.maturity.complexity) {
        ungrouped.push(item.id);
      }
    });

    webviewLogger.debug(
      LogCategory.UI,
      'Complexity groups calculated',
      'ComplexityRangeViewController.calculateGroups',
      {
        totalItems: items.length,
        groupCount: groups.length,
        ungroupedCount: ungrouped.length
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    return {
      groups,
      ungrouped,
      totalItems: items.length
    };
  }

  /**
   * Get items that apply to a specific complexity level
   *
   * An item applies to a level if the level falls within its complexity range.
   * For example, an item with complexity: {min: 1, max: 2} applies to Simple and Standard.
   */
  private getItemsForLevel(items: KnowledgeItem[], level: ComplexityLevel): KnowledgeItem[] {
    return items.filter(item => {
      if (!item.maturity || !item.maturity.complexity) {
        return false;
      }

      const { min, max } = item.maturity.complexity;

      // Check if level falls within the item's range
      const matches = level >= min && level <= max;

      // Apply maturity context filtering if available
      if (matches && this.maturityContext) {
        // If user has a specific complexity context, we could filter further
        // For now, we include all items that match the level
        return true;
      }

      return matches;
    });
  }

  /**
   * Override render to add complexity-specific styling
   */
  render(): void {
    super.render();

    // Add complexity-specific class to container
    if (this.containerElement) {
      this.containerElement.classList.add('complexity-range-view');
    }
  }

  /**
   * Get human-readable label for complexity level
   */
  private getLevelLabel(level: ComplexityLevel): string {
    const info = COMPLEXITY_LEVELS.find(l => l.level === level);
    return info ? info.label : `Level ${level}`;
  }

  /**
   * Get icon for complexity level
   */
  private getLevelIcon(level: ComplexityLevel): string {
    const info = COMPLEXITY_LEVELS.find(l => l.level === level);
    return info ? info.icon : '⚪';
  }
}
