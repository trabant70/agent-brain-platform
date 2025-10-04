/**
 * Commit Transformer
 *
 * Transforms GitHub Commit data to CanonicalEvent format.
 */

import { CanonicalEvent, EventType, Author, ImpactMetrics } from '../../../core/CanonicalEvent';
import { GitHubCommit } from '../types/github-api.types';

/**
 * Transform GitHub Commit to CanonicalEvent
 *
 * Handles both regular commits and merge commits.
 */
export function transformCommit(commit: GitHubCommit): CanonicalEvent {
  // Create author
  const author: Author = {
    id: commit.author?.login || commit.commit.author.email,
    name: commit.commit.author.name,
    email: commit.commit.author.email,
    username: commit.author?.login,
    avatarUrl: commit.author?.avatar_url
  };

  // Use commit date
  const timestamp = new Date(commit.commit.author.date);

  // Extract commit message (first line is title, rest is description)
  const messageParts = commit.commit.message.split('\n');
  const title = messageParts[0];
  const description = messageParts.slice(1).join('\n').trim() || undefined;

  // Determine if this is a merge commit (2+ parents)
  const isMerge = commit.parents.length >= 2;
  const eventType = isMerge ? EventType.MERGE : EventType.COMMIT;

  // Build impact metrics if stats are available
  const impact: ImpactMetrics | undefined = commit.stats ? {
    linesAdded: commit.stats.additions,
    linesRemoved: commit.stats.deletions
  } : undefined;

  // Create canonical event
  const event: CanonicalEvent = {
    // Identity
    id: commit.sha,
    canonicalId: `github:${commit.sha}`,
    providerId: 'github',
    type: eventType,

    // Temporal
    timestamp,
    ingestedAt: new Date(),

    // Content
    title,
    description,

    // Attribution
    author,

    // Context - Git
    hash: commit.sha,
    fullHash: commit.sha,
    branches: [], // GitHub API doesn't provide branch info in commit list

    // Context - External
    url: commit.html_url,

    // Relationships
    parentIds: commit.parents.map(p => p.sha),

    // Metrics
    impact,

    // Metadata
    metadata: {
      committer: {
        name: commit.commit.committer.name,
        email: commit.commit.committer.email,
        date: commit.commit.committer.date
      },
      parentCount: commit.parents.length,
      isMerge
    }
  };

  return event;
}

/**
 * Transform multiple commits to canonical events
 */
export function transformCommits(commits: GitHubCommit[]): CanonicalEvent[] {
  return commits.map(transformCommit);
}
