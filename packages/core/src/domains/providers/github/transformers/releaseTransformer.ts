import * as vscode from 'vscode';
/**
 * Release Transformer
 *
 * Transforms GitHub Release data to CanonicalEvent format.
 */

import { CanonicalEvent, EventType, Author } from '../../../events';
import { GitHubRelease } from '../types/github-api.types';

/**
 * Transform GitHub Release to CanonicalEvent
 *
 * Uses published_at if available, otherwise created_at.
 */
export function transformRelease(release: GitHubRelease): CanonicalEvent {
  // Create author
  const author: Author = {
    id: release.author.login,
    name: release.author.login,
    username: release.author.login,
    avatarUrl: release.author.avatar_url
  };

  // Use published date if available, otherwise created date
  const timestamp = new Date(release.published_at || release.created_at);

  // Create canonical event
  const event: CanonicalEvent = {
    // Identity
    id: `release-${release.id}`,
    canonicalId: `github:release-${release.id}`,
    providerId: 'github',
    type: EventType.RELEASE,

    // Temporal
    timestamp,
    ingestedAt: new Date(),

    // Content
    title: release.name || release.tag_name,
    description: release.body || undefined,

    // Attribution
    author,

    // Context - Tags
    tags: [release.tag_name],
    hash: release.target_commitish,           // ADDED: Target commit SHA
    branches: [], // Releases aren't tied to specific branches

    // Context - External
    url: release.html_url,
    state: release.prerelease ? 'prerelease' : 'release',
    labels: release.prerelease ? ['prerelease'] : ['release'],

    // Relationships
    parentIds: [], // Could link to tag commit if needed

    // Metadata
    metadata: {
      tagName: release.tag_name,
      target_commitish: release.target_commitish, // ADDED: Preserve SHA
      draft: release.draft,
      prerelease: release.prerelease,
      createdAt: release.created_at,
      publishedAt: release.published_at,
      assetCount: release.assets.length,
      assets: release.assets.map(a => ({
        name: a.name,
        downloadCount: a.download_count
      }))
    }
  };

  return event;
}

/**
 * Transform multiple releases to canonical events
 */
export function transformReleases(releases: GitHubRelease[]): CanonicalEvent[] {
  return releases.map(transformRelease);
}
