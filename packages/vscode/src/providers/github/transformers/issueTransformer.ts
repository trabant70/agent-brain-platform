/**
 * Issue Transformer
 *
 * Transforms GitHub Issue data to CanonicalEvent format.
 */

import { CanonicalEvent, EventType, Author } from '@agent-brain/core/domains/events';
import { GitHubIssue } from '../types/github-api.types';

/**
 * Transform GitHub Issue to CanonicalEvent
 *
 * Maps issue states:
 * - closed_at exists → ISSUE_CLOSED
 * - otherwise → ISSUE_OPENED
 */
export function transformIssue(issue: GitHubIssue): CanonicalEvent {
  // Determine event type based on issue state
  const type = issue.closed_at ? EventType.ISSUE_CLOSED : EventType.ISSUE_OPENED;

  // Use closed date if available, otherwise created date
  const timestamp = new Date(issue.closed_at || issue.created_at);

  // Create author
  const author: Author = {
    id: issue.user.login,
    name: issue.user.login,
    username: issue.user.login,
    avatarUrl: issue.user.avatar_url
  };

  // Create canonical event
  const event: CanonicalEvent = {
    // Identity
    id: `issue-${issue.number}`,
    canonicalId: `github:issue-${issue.number}`,
    providerId: 'github',
    type,

    // Temporal
    timestamp,
    ingestedAt: new Date(),

    // Content
    title: issue.title,
    description: issue.body || undefined,

    // Attribution
    author,

    // Context
    branches: [], // Issues aren't tied to branches

    // Context - External
    issueNumber: issue.number,
    url: issue.html_url,
    state: issue.state,
    labels: issue.labels.map(l => l.name),

    // Relationships
    parentIds: [],

    // Metadata
    metadata: {
      issueState: issue.state,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      closedAt: issue.closed_at
    }
  };

  return event;
}

/**
 * Transform multiple issues to canonical events
 */
export function transformIssues(issues: GitHubIssue[]): CanonicalEvent[] {
  return issues.map(transformIssue);
}
