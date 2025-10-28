/**
 * ProjectRangeViewController - Group items by project maturity phase
 *
 * Groups knowledge items based on their project maturity footprint:
 * - Planning (1): Early stage, requirements gathering
 * - Inception (2): Initial development, MVP building
 * - Development (3): Active feature development
 * - Established (4): Mature codebase, maintenance mode
 * - Mature (5): Long-lived project, optimization focus
 *
 * Items with range footprints (e.g., min=2, max=4) appear in multiple groups.
 */

import { KnowledgeItem } from '../../../knowledge/types';
import { GroupType } from '../../../knowledge/GroupTypes';
import { GroupSection, GroupCalculationResult } from './ViewMode';
import { BaseGroupViewController, GroupViewCallbacks } from './BaseGroupViewController';
import { webviewLogger, LogCategory, LogPathway } from '../../webview/WebviewLogger';

/**
 * Project maturity phases
 */
enum ProjectPhase {
  PLANNING = 1,
  INCEPTION = 2,
  DEVELOPMENT = 3,
  ESTABLISHED = 4,
  MATURE = 5
}

/**
 * Metadata for project phases
 */
interface ProjectPhaseInfo {
  phase: ProjectPhase;
  label: string;
  description: string;
  icon: string;
}

const PROJECT_PHASES: ProjectPhaseInfo[] = [
  {
    phase: ProjectPhase.PLANNING,
    label: 'Planning',
    description: 'Requirements gathering, architecture design',
    icon: '📝'
  },
  {
    phase: ProjectPhase.INCEPTION,
    label: 'Inception',
    description: 'Initial development, MVP, proof of concept',
    icon: '🚀'
  },
  {
    phase: ProjectPhase.DEVELOPMENT,
    label: 'Development',
    description: 'Active feature development, rapid iteration',
    icon: '⚡'
  },
  {
    phase: ProjectPhase.ESTABLISHED,
    label: 'Established',
    description: 'Mature codebase, stability focus, maintenance',
    icon: '🏛️'
  },
  {
    phase: ProjectPhase.MATURE,
    label: 'Mature',
    description: 'Long-lived project, optimization, legacy management',
    icon: '🌟'
  }
];

/**
 * View controller for project range grouping
 */
export class ProjectRangeViewController extends BaseGroupViewController {
  constructor(containerId: string, callbacks: GroupViewCallbacks) {
    super(containerId, callbacks);

    webviewLogger.info(
      LogCategory.UI,
      'ProjectRangeViewController initialized',
      'ProjectRangeViewController.constructor',
      { containerId },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Return the GroupType for this view
   */
  getGroupType(): GroupType {
    return GroupType.PROJECT_RANGE;
  }

  /**
   * Calculate groups by project phase
   */
  calculateGroups(items: KnowledgeItem[]): GroupCalculationResult {
    const groups: GroupSection[] = [];
    const ungrouped: string[] = [];

    // Create a group for each project phase
    PROJECT_PHASES.forEach(phaseInfo => {
      const groupItems = this.getItemsForPhase(items, phaseInfo.phase);

      if (groupItems.length > 0) {
        groups.push({
          id: `project-${phaseInfo.phase}`,
          label: `${phaseInfo.icon} ${phaseInfo.label}`,
          description: phaseInfo.description,
          itemIds: groupItems.map(item => item.id),
          metadata: {
            phase: phaseInfo.phase,
            range: `${phaseInfo.phase}`
          },
          isExpanded: false
        });
      }
    });

    // Find items without maturity metadata
    items.forEach(item => {
      if (!item.maturity || !item.maturity.project) {
        ungrouped.push(item.id);
      }
    });

    webviewLogger.debug(
      LogCategory.UI,
      'Project groups calculated',
      'ProjectRangeViewController.calculateGroups',
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
   * Get items that apply to a specific project phase
   *
   * An item applies to a phase if the phase falls within its project range.
   * For example, an item with project: {min: 2, max: 4} applies to Inception, Development, and Established.
   */
  private getItemsForPhase(items: KnowledgeItem[], phase: ProjectPhase): KnowledgeItem[] {
    return items.filter(item => {
      if (!item.maturity || !item.maturity.project) {
        return false;
      }

      const { min, max } = item.maturity.project;

      // Check if phase falls within the item's range
      const matches = phase >= min && phase <= max;

      // Apply maturity context filtering if available
      if (matches && this.maturityContext) {
        // If user has a specific project phase context, we could filter further
        // For now, we include all items that match the phase
        return true;
      }

      return matches;
    });
  }

  /**
   * Override render to add phase-specific styling
   */
  render(): void {
    super.render();

    // Add project-specific class to container
    if (this.containerElement) {
      this.containerElement.classList.add('project-range-view');
    }
  }

  /**
   * Get human-readable label for project phase
   */
  private getPhaseLabel(phase: ProjectPhase): string {
    const info = PROJECT_PHASES.find(p => p.phase === phase);
    return info ? info.label : `Phase ${phase}`;
  }

  /**
   * Get icon for project phase
   */
  private getPhaseIcon(phase: ProjectPhase): string {
    const info = PROJECT_PHASES.find(p => p.phase === phase);
    return info ? info.icon : '📊';
  }
}
