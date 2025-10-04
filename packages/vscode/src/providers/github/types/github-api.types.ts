/**
 * GitHub API Type Definitions
 *
 * Simplified types for GitHub API responses.
 * Based on @octokit/rest response types.
 */

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  type: string;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  state: 'open' | 'closed';
  title: string;
  body: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  user: GitHubUser;
  head: {
    ref: string; // Source branch
    sha: string;
  };
  base: {
    ref: string; // Target branch
    sha: string;
  };
  html_url: string;
  labels: Array<{ name: string; color: string }>;
  additions: number;
  deletions: number;
  changed_files: number;
}

export interface GitHubRelease {
  id: number;
  tag_name: string;
  target_commitish: string;      // ADDED: Commit SHA that tag points to
  name: string | null;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at: string | null;
  author: GitHubUser;
  html_url: string;
  assets: Array<{ name: string; download_count: number }>;
}

export interface GitHubIssue {
  id: number;
  number: number;
  state: 'open' | 'closed';
  title: string;
  body: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  user: GitHubUser;
  html_url: string;
  labels: Array<{ name: string; color: string }>;
  pull_request?: { url: string }; // Present if this is a PR
}

export interface GitHubTag {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
}

export interface GitHubDeployment {
  id: number;
  sha: string;
  ref: string;
  environment: string;
  created_at: string;
  updated_at: string;
  creator: GitHubUser;
  description: string | null;
}

export interface GitHubRateLimit {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  used: number;
}

export interface GitHubRateLimitResponse {
  resources: {
    core: GitHubRateLimit;
    search: GitHubRateLimit;
    graphql: GitHubRateLimit;
  };
  rate: GitHubRateLimit;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    committer: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
  author: GitHubUser | null;
  committer: GitHubUser | null;
  html_url: string;
  parents: Array<{ sha: string; url: string }>;
  stats?: {
    additions: number;
    deletions: number;
    total: number;
  };
}
