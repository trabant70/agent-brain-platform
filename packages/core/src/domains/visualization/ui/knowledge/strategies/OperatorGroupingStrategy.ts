/**
 * OperatorGroupingStrategy - Group items by operator experience level
 *
 * Groups items into 5 levels based on their operator maturity footprint:
 * 1. Novice - Just starting out
 * 2. Junior - Building foundational skills
 * 3. Mid - Comfortable with common patterns
 * 4. Senior - Deep expertise
 * 5. Expert - Master-level understanding
 */

import { KnowledgeItem, MaturityContext } from '../../../../knowledge/types';
import { GroupType } from '../../../../knowledge/GroupTypes';
import { ViewMode, GroupSection } from '../ViewMode';
import { BaseGroupingStrategy } from '../GroupingStrategy';

const OPERATOR_LEVELS = [
  { level: 1, label: 'Novice', icon: '🌱', description: 'Just starting out, learning fundamentals' },
  { level: 2, label: 'Junior', icon: '🌿', description: 'Building foundational skills' },
  { level: 3, label: 'Mid-Level', icon: '🌳', description: 'Comfortable with common patterns' },
  { level: 4, label: 'Senior', icon: '🏔️', description: 'Deep expertise, handles complexity' },
  { level: 5, label: 'Expert', icon: '⭐', description: 'Master-level, innovates solutions' }
];

export class OperatorGroupingStrategy extends BaseGroupingStrategy {
  getMode(): ViewMode {
    return ViewMode.BY_OPERATOR;
  }

  getGroupType(): GroupType {
    return GroupType.OPERATOR_RANGE;
  }

  getLabel(): string {
    return 'Operator Level';
  }

  getIcon(): string {
    return '👤';
  }

  getDescription(): string {
    return 'Group by operator experience level (Novice → Expert)';
  }

  calculateGroups(items: KnowledgeItem[], context?: MaturityContext | null): GroupSection[] {
    const groups: GroupSection[] = [];

    // Filter items that have operator maturity
    const { validItems } = this.filterItemsWithMaturity(
      items,
      (item) => !!(item.maturity?.operator)
    );

    // Create a group for each operator level
    OPERATOR_LEVELS.forEach(levelInfo => {
      const groupItems = validItems.filter(item => {
        const { min, max } = item.maturity!.operator!;
        return this.isLevelInRange(levelInfo.level, min, max);
      });

      if (groupItems.length > 0) {
        groups.push(
          this.createGroupSection(
            `operator-${levelInfo.level}`,
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
