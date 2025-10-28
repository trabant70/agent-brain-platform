/**
 * ComplexityGroupingStrategy - Group items by domain complexity
 *
 * Groups items into 3 levels based on their complexity footprint:
 * 1. Simple - Basic concepts, straightforward implementations
 * 2. Standard - Moderate complexity, common patterns
 * 3. Complex - Advanced concepts, intricate systems
 */

import { KnowledgeItem, MaturityContext } from '../../../../knowledge/types';
import { GroupType } from '../../../../knowledge/GroupTypes';
import { ViewMode, GroupSection } from '../ViewMode';
import { BaseGroupingStrategy } from '../GroupingStrategy';

const COMPLEXITY_LEVELS = [
  { level: 1, label: 'Simple', icon: '🟢', description: 'Basic concepts, straightforward' },
  { level: 2, label: 'Standard', icon: '🟡', description: 'Moderate complexity, common patterns' },
  { level: 3, label: 'Complex', icon: '🔴', description: 'Advanced concepts, intricate systems' }
];

export class ComplexityGroupingStrategy extends BaseGroupingStrategy {
  getMode(): ViewMode {
    return ViewMode.BY_COMPLEXITY;
  }

  getGroupType(): GroupType {
    return GroupType.COMPLEXITY_RANGE;
  }

  getLabel(): string {
    return 'Complexity';
  }

  getIcon(): string {
    return '🎯';
  }

  getDescription(): string {
    return 'Group by domain complexity (Simple → Complex)';
  }

  calculateGroups(items: KnowledgeItem[], context?: MaturityContext | null): GroupSection[] {
    const groups: GroupSection[] = [];

    // Filter items that have complexity maturity
    const { validItems } = this.filterItemsWithMaturity(
      items,
      (item) => !!(item.maturity?.complexity)
    );

    // Create a group for each complexity level
    COMPLEXITY_LEVELS.forEach(levelInfo => {
      const groupItems = validItems.filter(item => {
        const { min, max } = item.maturity!.complexity!;
        return this.isLevelInRange(levelInfo.level, min, max);
      });

      if (groupItems.length > 0) {
        groups.push(
          this.createGroupSection(
            `complexity-${levelInfo.level}`,
            `${levelInfo.icon} ${levelInfo.label}`,
            groupItems.map(item => item.id),
            {
              level: levelInfo.level,
              range: `${levelInfo.level}`
            },
            levelInfo.description
          )
        );
      }
    });

    return groups;
  }
}
