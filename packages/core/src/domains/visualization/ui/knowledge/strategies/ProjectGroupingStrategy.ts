/**
 * ProjectGroupingStrategy - Group items by project maturity phase
 *
 * Groups items into 5 phases based on their project maturity footprint:
 * 1. Planning - Requirements gathering, architecture design
 * 2. Inception - Initial development, MVP
 * 3. Development - Active feature development
 * 4. Established - Mature codebase, maintenance mode
 * 5. Mature - Long-lived project, optimization focus
 */

import { KnowledgeItem, MaturityContext } from '../../../../knowledge/types';
import { GroupType } from '../../../../knowledge/GroupTypes';
import { ViewMode, GroupSection } from '../ViewMode';
import { BaseGroupingStrategy } from '../GroupingStrategy';

const PROJECT_PHASES = [
  { phase: 1, label: 'Planning', icon: '📝', description: 'Requirements gathering, architecture' },
  { phase: 2, label: 'Inception', icon: '🚀', description: 'Initial development, MVP' },
  { phase: 3, label: 'Development', icon: '⚡', description: 'Active feature development' },
  { phase: 4, label: 'Established', icon: '🏛️', description: 'Mature codebase, maintenance' },
  { phase: 5, label: 'Mature', icon: '🌟', description: 'Long-lived, optimization focus' }
];

export class ProjectGroupingStrategy extends BaseGroupingStrategy {
  getMode(): ViewMode {
    return ViewMode.BY_PROJECT;
  }

  getGroupType(): GroupType {
    return GroupType.PROJECT_RANGE;
  }

  getLabel(): string {
    return 'Project Phase';
  }

  getIcon(): string {
    return '📊';
  }

  getDescription(): string {
    return 'Group by project maturity phase (Planning → Mature)';
  }

  calculateGroups(items: KnowledgeItem[], context?: MaturityContext | null): GroupSection[] {
    const groups: GroupSection[] = [];

    // Filter items that have project maturity
    const { validItems, ungroupedIds } = this.filterItemsWithMaturity(
      items,
      (item) => !!(item.maturity?.project)
    );

    // Create a group for each project phase
    PROJECT_PHASES.forEach(phaseInfo => {
      const groupItems = validItems.filter(item => {
        const { min, max } = item.maturity!.project!;
        return this.isLevelInRange(phaseInfo.phase, min, max);
      });

      if (groupItems.length > 0) {
        groups.push(
          this.createGroupSection(
            `project-${phaseInfo.phase}`,
            `${phaseInfo.icon} ${phaseInfo.label}`,
            groupItems.map(item => item.id),
            {
              phase: phaseInfo.phase,
              range: `${phaseInfo.phase}`
            },
            phaseInfo.description
          )
        );
      }
    });

    // Add unclassified group at the end
    const unclassifiedGroup = this.createUnclassifiedGroup(ungroupedIds);
    if (unclassifiedGroup) {
      groups.push(unclassifiedGroup);
    }

    return groups;
  }
}
