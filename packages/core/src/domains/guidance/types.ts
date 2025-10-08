/**
 * Guidance System Types
 *
 * Defines context and rules for the AI companion guidance system
 */

export interface UserContext {
  /** Current activity the user is engaged in */
  currentActivity: 'idle' | 'browsing_knowledge' | 'building_prompt' |
                   'reviewing_enhancement' | 'working' | 'error_state';

  /** User's skill level (affects verbosity of guidance) */
  skillLevel: 'novice' | 'learning' | 'proficient';

  /** Recent errors encountered */
  recentErrors: Error[];

  /** Time since last user action (milliseconds) */
  idleTime: number;

  /** Current prompt length (if building prompt) */
  promptLength: number;

  /** Number of knowledge items currently selected */
  knowledgeItemsSelected: number;

  /** Total sessions completed successfully */
  sessionsCompleted: number;

  /** Total sessions that failed or were abandoned */
  sessionsFailed: number;

  /** Timestamp of last user action */
  lastActionTimestamp: Date;
}

export interface GuidanceRule {
  /** Unique identifier for this rule */
  id: string;

  /** Function that determines if this rule should trigger */
  trigger: (ctx: UserContext) => boolean;

  /** Message to show the user */
  message: string;

  /** Optional action to take automatically (e.g., 'showErrorRecovery') */
  action?: string;

  /** Priority level for this guidance */
  priority: 'critical' | 'helpful' | 'informational';

  /** Maximum number of times to show this tip */
  maxShowCount: number;

  /** Number of times this tip has been shown */
  timesShown: number;
}

export interface GuidanceTip {
  /** The rule that triggered this tip */
  rule: GuidanceRule;

  /** When this tip was shown */
  timestamp: Date;
}
