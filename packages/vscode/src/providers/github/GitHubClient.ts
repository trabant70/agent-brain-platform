/**
 * GitHub Client
 *
 * Wrapper around @octokit/rest with rate limit management.
 * Provides high-level methods for fetching timeline events.
 */

// @ts-ignore - @octokit/rest is a runtime dependency
import { Octokit } from '@octokit/rest';
import { RateLimitManager } from './RateLimitManager';
import {
  GitHubPullRequest,
  GitHubRelease,
  GitHubIssue,
  GitHubTag,
  GitHubCommit
} from './types/github-api.types';
import { logger, LogCategory, createContextLogger } from '../../utils/Logger';

export interface GitHubClientConfig {
  token: string;
  userAgent?: string;
  baseUrl?: string;
}

export interface RepositoryInfo {
  owner: string;
  repo: string;
}

/**
 * GitHub Client
 *
 * High-level wrapper for GitHub API operations.
 */
export class GitHubClient {
  private readonly log = createContextLogger('GitHubClient');

  private octokit: Octokit;
  private rateLimitManager: RateLimitManager;

  constructor(config: GitHubClientConfig) {
    this.octokit = new Octokit({
      auth: config.token,
      userAgent: config.userAgent || 'repo-timeline-extension/1.0.0',
      baseUrl: config.baseUrl || 'https://api.github.com'
    });

    this.rateLimitManager = new RateLimitManager(this.octokit);

    this.log.info(LogCategory.GITHUB, 'Initialized GitHub client', 'constructor');
  }

  /**
   * Fetch pull requests for a repository
   *
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param state - PR state filter (default: 'all')
   * @param perPage - Results per page (default: 100)
   * @returns Array of pull requests
   */
  async fetchPullRequests(
    owner: string,
    repo: string,
    state: 'open' | 'closed' | 'all' = 'all',
    perPage: number = 100
  ): Promise<GitHubPullRequest[]> {
    this.log.info(LogCategory.GITHUB, `Fetching pull requests for ${owner}/${repo}`, 'fetchPullRequests');

    const cacheKey = `pulls:${owner}/${repo}:${state}`;

    try {
      const response = await this.rateLimitManager.executeWithRateLimit(
        () => this.octokit.pulls.list({
          owner,
          repo,
          state,
          per_page: perPage,
          sort: 'created',
          direction: 'desc'
        }),
        cacheKey
      );

      this.log.info(LogCategory.GITHUB, `Fetched ${(response as any).data.length} pull requests`, 'fetchPullRequests');

      return (response as any).data as GitHubPullRequest[];

    } catch (error) {
      this.log.error(LogCategory.GITHUB, `Failed to fetch pull requests: ${error}`, 'fetchPullRequests');
      throw error;
    }
  }

  /**
   * Fetch releases for a repository
   *
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param perPage - Results per page (default: 100)
   * @returns Array of releases
   */
  async fetchReleases(
    owner: string,
    repo: string,
    perPage: number = 100
  ): Promise<GitHubRelease[]> {
    this.log.info(LogCategory.GITHUB, `Fetching releases for ${owner}/${repo}`, 'fetchReleases');

    const cacheKey = `releases:${owner}/${repo}`;

    try {
      const response = await this.rateLimitManager.executeWithRateLimit(
        () => this.octokit.repos.listReleases({
          owner,
          repo,
          per_page: perPage
        }),
        cacheKey
      );

      this.log.info(LogCategory.GITHUB, `Fetched ${(response as any).data.length} releases`, 'fetchReleases');

      return (response as any).data as GitHubRelease[];

    } catch (error) {
      this.log.error(LogCategory.GITHUB, `Failed to fetch releases: ${error}`, 'fetchReleases');
      throw error;
    }
  }

  /**
   * Fetch issues for a repository (excluding pull requests)
   *
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param state - Issue state filter (default: 'all')
   * @param perPage - Results per page (default: 100)
   * @returns Array of issues (excludes PRs)
   */
  async fetchIssues(
    owner: string,
    repo: string,
    state: 'open' | 'closed' | 'all' = 'all',
    perPage: number = 100
  ): Promise<GitHubIssue[]> {
    this.log.info(LogCategory.GITHUB, `Fetching issues for ${owner}/${repo}`, 'fetchIssues');

    const cacheKey = `issues:${owner}/${repo}:${state}`;

    try {
      const response = await this.rateLimitManager.executeWithRateLimit(
        () => this.octokit.issues.listForRepo({
          owner,
          repo,
          state,
          per_page: perPage,
          sort: 'created',
          direction: 'desc'
        }),
        cacheKey
      );

      // Filter out pull requests (they appear in issues endpoint too)
      const issues = (response as any).data.filter((issue: any) => !issue.pull_request) as GitHubIssue[];

      this.log.info(LogCategory.GITHUB, `Fetched ${issues.length} issues`, 'fetchIssues');

      return issues;

    } catch (error) {
      this.log.error(LogCategory.GITHUB, `Failed to fetch issues: ${error}`, 'fetchIssues');
      throw error;
    }
  }

  /**
   * Fetch tags for a repository
   *
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param perPage - Results per page (default: 100)
   * @returns Array of tags
   */
  async fetchTags(
    owner: string,
    repo: string,
    perPage: number = 100
  ): Promise<GitHubTag[]> {
    this.log.info(LogCategory.GITHUB, `Fetching tags for ${owner}/${repo}`, 'fetchTags');

    const cacheKey = `tags:${owner}/${repo}`;

    try {
      const response = await this.rateLimitManager.executeWithRateLimit(
        () => this.octokit.repos.listTags({
          owner,
          repo,
          per_page: perPage
        }),
        cacheKey
      );

      this.log.info(LogCategory.GITHUB, `Fetched ${(response as any).data.length} tags`, 'fetchTags');

      return (response as any).data as GitHubTag[];

    } catch (error) {
      this.log.error(LogCategory.GITHUB, `Failed to fetch tags: ${error}`, 'fetchTags');
      throw error;
    }
  }

  /**
   * Fetch commits for a repository
   *
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param branch - Branch name (default: repository default branch)
   * @param perPage - Results per page (default: 100)
   * @returns Array of commits
   */
  async fetchCommits(
    owner: string,
    repo: string,
    branch?: string,
    perPage: number = 100
  ): Promise<GitHubCommit[]> {
    this.log.info(LogCategory.GITHUB, `Fetching commits for ${owner}/${repo}${branch ? ` (branch: ${branch})` : ''}`, 'fetchCommits');

    const cacheKey = `commits:${owner}/${repo}:${branch || 'default'}`;

    try {
      const response = await this.rateLimitManager.executeWithRateLimit(
        () => this.octokit.repos.listCommits({
          owner,
          repo,
          sha: branch, // sha parameter accepts branch names too
          per_page: perPage
        }),
        cacheKey
      );

      this.log.info(LogCategory.GITHUB, `Fetched ${(response as any).data.length} commits`, 'fetchCommits');

      return (response as any).data as GitHubCommit[];

    } catch (error) {
      this.log.error(LogCategory.GITHUB, `Failed to fetch commits: ${error}`, 'fetchCommits');
      throw error;
    }
  }

  /**
   * Get rate limit manager
   */
  getRateLimitManager(): RateLimitManager {
    return this.rateLimitManager;
  }

  /**
   * Get raw Octokit instance (for advanced usage)
   */
  getOctokit(): Octokit {
    return this.octokit;
  }
}
