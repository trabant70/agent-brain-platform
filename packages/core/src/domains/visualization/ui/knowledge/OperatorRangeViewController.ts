/**
 * OperatorRangeViewController - Group items by operator experience level
 *
 * Groups knowledge items based on their operator maturity footprint:
 * - Novice (1): Items for those just starting
 * - Junior (2): Items for developers with basic experience
 * - Mid (3): Items for intermediate developers
 * - Senior (4): Items for experienced developers
 * - Expert (5): Items for advanced practitioners
 *
 * Items with range footprints (e.g., min=2, max=4) appear in multiple groups.
 */

import { KnowledgeItem } from '../../../knowledge/types';
import { GroupType } from '../../../knowledge/GroupTypes';
import { GroupSection, GroupCalculationResult } from './ViewMode';
import { BaseGroupViewController, GroupViewCallbacks } from './BaseGroupViewController';
import { webviewLogger, LogCategory, LogPathway } from '../../webview/WebviewLogger';

/**
 * Operator maturity levels
 */
enum OperatorLevel {
  NOVICE = 1,
  JUNIOR = 2,
  MID = 3,
  SENIOR = 4,
  EXPERT = 5
}

/**
 * Metadata for operator levels
 */
interface OperatorLevelInfo {
  level: OperatorLevel;
  label: string;
  description: string;
  icon: string;
}

const OPERATOR_LEVELS: OperatorLevelInfo[] = [
  {
    level: OperatorLevel.NOVICE,
    label: 'Novice',
    description: 'Just starting out, learning fundamentals',
    icon: '🌱'
  },
  {
    level: OperatorLevel.JUNIOR,
    label: 'Junior',
    description: 'Building foundational skills and experience',
    icon: '🌿'
  },
  {
    level: OperatorLevel.MID,
    label: 'Mid-Level',
    description: 'Comfortable with common patterns and practices',
    icon: '🌳'
  },
  {
    level: OperatorLevel.SENIOR,
    label: 'Senior',
    description: 'Deep expertise, can handle complex scenarios',
    icon: '🏔️'
  },
  {
    level: OperatorLevel.EXPERT,
    label: 'Expert',
    description: 'Master-level understanding, innovates solutions',
    icon: '⭐'
  }
];

/**
 * View controller for operator range grouping
 */
export class OperatorRangeViewController extends BaseGroupViewController {
  constructor(containerId: string, callbacks: GroupViewCallbacks) {
    super(containerId, callbacks);

    webviewLogger.info(
      LogCategory.UI,
      'OperatorRangeViewController initialized',
      'OperatorRangeViewController.constructor',
      { containerId },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Return the GroupType for this view
   */
  getGroupType(): GroupType {
    return GroupType.OPERATOR_RANGE;
  }

  /**
   * Calculate groups by operator level
   */
  calculateGroups(items: KnowledgeItem[]): GroupCalculationResult {
    const groups: GroupSection[] = [];
    const ungrouped: string[] = [];

    // Create a group for each operator level
    OPERATOR_LEVELS.forEach(levelInfo => {
      const groupItems = this.getItemsForLevel(items, levelInfo.level);

      if (groupItems.length > 0) {
        groups.push({
          id: `operator-${levelInfo.level}`,
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
      if (!item.maturity || !item.maturity.operator) {
        ungrouped.push(item.id);
      }
    });

    webviewLogger.debug(
      LogCategory.UI,
      'Operator groups calculated',
      'OperatorRangeViewController.calculateGroups',
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
   * Get items that apply to a specific operator level
   *
   * An item applies to a level if the level falls within its operator range.
   * For example, an item with operator: {min: 2, max: 4} applies to Junior, Mid, and Senior.
   */
  private getItemsForLevel(items: KnowledgeItem[], level: OperatorLevel): KnowledgeItem[] {
    return items.filter(item => {
      if (!item.maturity || !item.maturity.operator) {
        return false;
      }

      const { min, max } = item.maturity.operator;

      // Check if level falls within the item's range
      const matches = level >= min && level <= max;

      // Apply maturity context filtering if available
      if (matches && this.maturityContext) {
        // If user has a specific operator level context, we could filter further
        // For now, we include all items that match the level
        return true;
      }

      return matches;
    });
  }

  /**
   * Override render to add level-specific styling
   */
  render(): void {
    super.render();

    // Add operator-specific class to container
    if (this.containerElement) {
      this.containerElement.classList.add('operator-range-view');
    }
  }

  /**
   * Get human-readable label for operator level
   */
  private getLevelLabel(level: OperatorLevel): string {
    const info = OPERATOR_LEVELS.find(l => l.level === level);
    return info ? info.label : `Level ${level}`;
  }

  /**
   * Get icon for operator level
   */
  private getLevelIcon(level: OperatorLevel): string {
    const info = OPERATOR_LEVELS.find(l => l.level === level);
    return info ? info.icon : '👤';
  }
}
