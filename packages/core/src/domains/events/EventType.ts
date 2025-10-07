/**
 * Normalized event types across all providers
 */
export enum EventType {
  // Git events
  COMMIT = 'commit',
  MERGE = 'merge',
  BRANCH_CREATED = 'branch-created',
  BRANCH_DELETED = 'branch-deleted',
  BRANCH_CHECKOUT = 'branch-checkout',
  TAG_CREATED = 'tag-created',

  // Release events
  RELEASE = 'release',
  DEPLOYMENT = 'deployment',

  // Pull request events
  PR_OPENED = 'pr-opened',
  PR_MERGED = 'pr-merged',
  PR_CLOSED = 'pr-closed',
  PR_REVIEWED = 'pr-reviewed',

  // Issue events
  ISSUE_OPENED = 'issue-opened',
  ISSUE_CLOSED = 'issue-closed',
  ISSUE_COMMENTED = 'issue-commented',

  // CI/CD events
  BUILD_SUCCESS = 'build-success',
  BUILD_FAILED = 'build-failed',
  TEST_RUN = 'test-run',

  // Intelligence events
  LEARNING_STORED = 'learning-stored',
  PATTERN_DETECTED = 'pattern-detected',
  ADR_RECORDED = 'adr-recorded',

  // Agent Brain session events (Phase 1)
  AGENT_SESSION = 'agent-session',

  // Agent events (for future - Phase 9)
  AGENT_TASK_COMPLETED = 'agent-task-completed',
  AGENT_TASK_ABANDONED = 'agent-task-abandoned',

  // Custom
  CUSTOM = 'custom'
}
