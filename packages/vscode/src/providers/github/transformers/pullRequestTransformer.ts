/**
 * Pull Request Transformer
 *
 * Transforms GitHub Pull Request data to CanonicalEvent format.
 */

import { CanonicalEvent, EventType, Author } from '../../../core/CanonicalEvent';
import { GitHubPullRequest } from '../types/github-api.types';

/**
 * Transform GitHub Pull Request to CanonicalEvent
 *
 * Maps PR states:
 * - merged_at exists → PR_MERGED
 * - closed_at exists → PR_CLOSED
 * - otherwise → PR_OPENED
 */
export function transformPullRequest(pr: GitHubPullRequest): CanonicalEvent {
  // Determine event type based on PR state
  let type: EventType;
  let timestamp: Date;

  if (pr.merged_at) {
    type = EventType.PR_MERGED;
    timestamp = new Date(pr.merged_at);
  } else if (pr.closed_at) {
    type = EventType.PR_CLOSED;
    timestamp = new Date(pr.closed_at);
  } else {
    type = EventType.PR_OPENED;
    timestamp = new Date(pr.created_at);
  }

  // Create author
  const author: Author = {
    id: pr.user.login,
    name: pr.user.login,
    username: pr.user.login,
    avatarUrl: pr.user.avatar_url
  };

  // Create canonical event
  const event: CanonicalEvent = {
    // Identity
    id: `pr-${pr.number}`,
    canonicalId: `github:pr-${pr.number}`,
    providerId: 'github',
    type,

    // Temporal
    timestamp,
    ingestedAt: new Date(),

    // Content
    title: pr.title,
    description: pr.body || undefined,

    // Attribution
    author,

    // Context - Branches
    branches: [pr.base.ref, pr.head.ref], // Target and source branches
    primaryBranch: pr.base.ref, // Target branch is primary

    // Context - External
    pullRequestNumber: pr.number,
    url: pr.html_url,
    state: pr.state,
    labels: pr.labels.map(l => l.name),

    // Relationships
    parentIds: [pr.base.sha], // Base commit is the parent

    // Metrics
    impact: {
      filesChanged: pr.changed_files,
      linesAdded: pr.additions,
      linesRemoved: pr.deletions
    },

    // Metadata
    metadata: {
      headSha: pr.head.sha,
      baseSha: pr.base.sha,
      headBranch: pr.head.ref,
      baseBranch: pr.base.ref,
      prState: pr.state,
      mergedAt: pr.merged_at,
      closedAt: pr.closed_at,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at
    }
  };

  return event;
}

/**
 * Transform multiple pull requests to canonical events
 *
 * Note: Each PR can generate multiple events (opened, closed, merged)
 * For simplicity, we generate one event per PR based on its current state.
 */
export function transformPullRequests(prs: GitHubPullRequest[]): CanonicalEvent[] {
  return prs.map(transformPullRequest);
}
