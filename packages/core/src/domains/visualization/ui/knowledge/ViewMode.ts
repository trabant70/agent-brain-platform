/**
 * ViewMode - Knowledge organization strategies
 *
 * Defines different ways users can view and organize knowledge items:
 * - BY_TEMPLATE: Group by source template (providence)
 * - BY_OPERATOR: Group by operator experience level (1-5)
 * - BY_PROJECT: Group by project maturity phase (1-5)
 * - BY_COMPLEXITY: Group by domain complexity (1-3)
 * - BY_CATCHMENT: Group by maturity catchment basin status
 */

import { GroupType } from '../../../knowledge/GroupTypes';

/**
 * Available view modes for knowledge organization
 */
export enum ViewMode {
  BY_TEMPLATE = 'by_template',         // Group by source template
  BY_OPERATOR = 'by_operator',         // Group by operator level
  BY_PROJECT = 'by_project',           // Group by project phase
  BY_COMPLEXITY = 'by_complexity',     // Group by complexity level
  BY_CATCHMENT = 'by_catchment'        // Group by catchment status
}

/**
 * Metadata for each view mode
 */
export interface ViewModeInfo {
  mode: ViewMode;
  label: string;                // Display name
  icon: string;                 // Icon/emoji for tab
  description: string;          // Tooltip description
  groupType: GroupType;         // Corresponding GroupType for injection
}

/**
 * View mode metadata registry
 */
export const VIEW_MODE_INFO: Record<ViewMode, ViewModeInfo> = {
  [ViewMode.BY_TEMPLATE]: {
    mode: ViewMode.BY_TEMPLATE,
    label: 'By Template',
    icon: '📦',
    description: 'View items grouped by their source template',
    groupType: GroupType.TEMPLATE
  },
  [ViewMode.BY_OPERATOR]: {
    mode: ViewMode.BY_OPERATOR,
    label: 'By Operator Level',
    icon: '👤',
    description: 'View items grouped by operator experience level (Novice → Expert)',
    groupType: GroupType.OPERATOR_RANGE
  },
  [ViewMode.BY_PROJECT]: {
    mode: ViewMode.BY_PROJECT,
    label: 'By Project Phase',
    icon: '📊',
    description: 'View items grouped by project maturity phase (Planning → Mature)',
    groupType: GroupType.PROJECT_RANGE
  },
  [ViewMode.BY_COMPLEXITY]: {
    mode: ViewMode.BY_COMPLEXITY,
    label: 'By Complexity',
    icon: '🎯',
    description: 'View items grouped by domain complexity (Simple → Complex)',
    groupType: GroupType.COMPLEXITY_RANGE
  },
  [ViewMode.BY_CATCHMENT]: {
    mode: ViewMode.BY_CATCHMENT,
    label: 'By Relevance',
    icon: '🎪',
    description: 'View items grouped by relevance to current maturity context',
    groupType: GroupType.CATCHMENT
  }
};

/**
 * Represents a group of items within a view
 */
export interface GroupSection {
  id: string;                   // Unique group identifier
  label: string;                // Display label for group
  description?: string;         // Optional description
  itemIds: string[];            // IDs of items in this group
  metadata?: Record<string, any>; // Additional metadata
  isExpanded?: boolean;         // UI state
}

/**
 * Result of calculating groups for a view
 */
export interface GroupCalculationResult {
  groups: GroupSection[];       // Calculated groups
  ungrouped: string[];          // Items that don't fit any group
  totalItems: number;           // Total items processed
}

/**
 * Helper function to get view mode info
 */
export function getViewModeInfo(mode: ViewMode): ViewModeInfo {
  return VIEW_MODE_INFO[mode];
}

/**
 * Helper function to get all view modes
 */
export function getAllViewModes(): ViewMode[] {
  return Object.values(ViewMode);
}

/**
 * Helper function to check if a view mode is valid
 */
export function isValidViewMode(mode: string): mode is ViewMode {
  return Object.values(ViewMode).includes(mode as ViewMode);
}
