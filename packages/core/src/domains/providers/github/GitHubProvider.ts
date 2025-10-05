import * as vscode from 'vscode';
/**
 * GitHub Provider
 *
 * Data provider that fetches timeline events from GitHub API.
 *
 * Features:
 * - VSCode authentication integration
 * - Rate limit management
 * - Pull requests, releases, issues
 * - Feature flag protection
 */
import { IDataProvider } from '../base/ProviderRegistry';
import {
  CanonicalEvent,
  EventType,
  ProviderContext,
  ProviderCapabilities,
  ProviderConfig
} from '../../events';
import { Feature, requireFeature } from '../../../infrastructure/config';
import { GitHubClient, RepositoryInfo } from './GitHubClient';
import { transformPullRequests } from './transformers/pullRequestTransformer';
import { transformReleases } from './transformers/releaseTransformer';
import { transformIssues } from './transformers/issueTransformer';
import { transformCommits } from './transformers/commitTransformer';
import { logger, LogCategory, createContextLogger } from '../../../infrastructure/logging';
import { execSync } from 'child_process';

/**
 * GitHub Provider
 *
 * Implements IDataProvider for GitHub API data source.
 */
export class GitHubProvider implements IDataProvider {
  private readonly log = createContextLogger('GitHubProvider');

  // Provider metadata
  readonly id = 'github';
  readonly name = 'GitHub API';
  readonly version = '1.0.0';
  readonly capabilities: ProviderCapabilities = {
    supportsRealTimeUpdates: false, // Phase 1: no real-time
    supportsHistoricalData: true,
    supportsFiltering: false,
    supportsSearch: false,
    supportsAuthentication: true,
    supportsWriteOperations: false,
    supportedEventTypes: [
      EventType.COMMIT,
      EventType.MERGE,
      EventType.PR_OPENED,
      EventType.PR_MERGED,
      EventType.PR_CLOSED,
      EventType.RELEASE,
      EventType.ISSUE_OPENED,
      EventType.ISSUE_CLOSED
    ]
  };

  // GitHub client (initialized after authentication)
  private githubClient?: GitHubClient;

  // Configuration
  private config?: ProviderConfig;

  constructor() {
    this.log.info(LogCategory.GITHUB, 'GitHubProvider created', 'constructor');
  }

  /**
   * Initialize the provider
   *
   * NOTE: Does NOT authenticate yet - authentication is deferred until first use.
   * This prevents the GitHub login prompt from appearing on extension startup.
   */
  async initialize(config: ProviderConfig): Promise<void> {
    this.log.info(LogCategory.GITHUB, 'Initializing GitHub provider (deferred auth)', 'initialize');

    this.config = config;

    // Don't authenticate yet - wait until provider is actually enabled and used
    // This prevents annoying login prompts on startup

    this.log.info(LogCategory.GITHUB, 'GitHub provider initialized (authentication deferred)', 'initialize');
  }

  /**
   * Ensure the provider is authenticated
   * Called lazily when the provider is first used
   */
  private async ensureAuthenticated(): Promise<void> {
    if (this.githubClient) {
      return; // Already authenticated
    }

    this.log.info(LogCategory.GITHUB, 'Authenticating with GitHub...', 'ensureAuthenticated');

    try {
      // Get GitHub session via VSCode authentication API
      // This triggers the VSCode GitHub login flow if not already authenticated
      const session = await vscode.authentication.getSession(
        'github',
        ['repo', 'read:user'],
        { createIfNone: true }
      );

      if (!session) {
        throw new Error('Failed to authenticate with GitHub');
      }

      this.log.info(LogCategory.GITHUB, `Authenticated as ${session.account.label}`, 'ensureAuthenticated');

      // Initialize GitHub client with access token
      this.githubClient = new GitHubClient({
        token: session.accessToken,
        userAgent: 'vscode-repo-timeline-extension/1.0.0'
      });

      this.log.info(LogCategory.GITHUB, 'GitHub authentication successful', 'ensureAuthenticated');

    } catch (error) {
      this.log.error(LogCategory.GITHUB, `Failed to authenticate: ${error}`, 'ensureAuthenticated');
      throw error;
    }
  }

  /**
   * Check if provider is healthy
   */
  async isHealthy(): Promise<boolean> {
    // If not authenticated yet, consider it healthy (authentication is lazy)
    if (!this.githubClient) {
      return true; // Not authenticated yet, but ready to authenticate when needed
    }

    try {
      // Check rate limit to verify API access
      const rateLimitInfo = await this.githubClient.getRateLimitManager().getRateLimitInfo();
      return rateLimitInfo.remaining > 0;
    } catch (error) {
      this.log.error(LogCategory.GITHUB, `Health check failed: ${error}`, 'isHealthy');
      return false;
    }
  }

  /**
   * Fetch events from GitHub API
   *
   * Feature flag protected - requires GITHUB_PROVIDER feature to be enabled.
   *
   * @param context - Provider context with repository path
   * @returns Array of CanonicalEvents
   */
  async fetchEvents(context: ProviderContext): Promise<CanonicalEvent[]> {
    // Check feature flag
    const { isFeatureEnabled, Feature } = await import('../../../infrastructure/config');
    const enabled = await isFeatureEnabled(Feature.GITHUB_PROVIDER);
    if (!enabled) {
      throw new Error('GitHub provider feature is not enabled. Please configure a valid token.');
    }

    this.log.info(LogCategory.GITHUB, `Fetching events for ${context.repoPath}`, 'fetchEvents');

    // Authenticate on first use (lazy authentication)
    await this.ensureAuthenticated();

    if (!this.githubClient) {
      throw new Error('GitHub provider authentication failed');
    }

    try {
      // Extract owner/repo from git remote
      const repoInfo = await this.parseGitRemote(context.repoPath || context.workspaceRoot || '');

      if (!repoInfo) {
        this.log.warn(LogCategory.GITHUB, 'No GitHub remote found', 'fetchEvents');
        return [];
      }

      this.log.info(LogCategory.GITHUB, `Fetching from ${repoInfo.owner}/${repoInfo.repo}`, 'fetchEvents');

      // Fetch data from GitHub API in parallel
      const [pulls, releases, issues, commits] = await Promise.all([
        this.githubClient.fetchPullRequests(repoInfo.owner, repoInfo.repo, 'all', 100),
        this.githubClient.fetchReleases(repoInfo.owner, repoInfo.repo, 100),
        this.githubClient.fetchIssues(repoInfo.owner, repoInfo.repo, 'all', 100),
        this.githubClient.fetchCommits(repoInfo.owner, repoInfo.repo, undefined, 100) // Fetch default branch
      ]);

      this.log.info(
        LogCategory.GITHUB,
        `Fetched ${pulls.length} PRs, ${releases.length} releases, ${issues.length} issues, ${commits.length} commits`,
        'fetchEvents'
      );

      // Transform to CanonicalEvent (SINGLE TRANSFORMATION)
      const events: CanonicalEvent[] = [
        ...transformPullRequests(pulls),
        ...transformReleases(releases),
        ...transformIssues(issues),
        ...transformCommits(commits)
      ];

      this.log.info(LogCategory.GITHUB, `Transformed to ${events.length} canonical events`, 'fetchEvents');

      return events;

    } catch (error) {
      this.log.error(LogCategory.GITHUB, `Failed to fetch events: ${error}`, 'fetchEvents');
      throw error;
    }
  }

  /**
   * Dispose provider resources
   */
  async dispose(): Promise<void> {
    this.log.info(LogCategory.GITHUB, 'Disposing GitHub provider', 'dispose');
    this.githubClient = undefined;
    this.config = undefined;
  }

  // ==========================================
  // PRIVATE METHODS
  // ==========================================

  /**
   * Parse git remote to extract owner/repo
   *
   * Reads git config to find GitHub remote URL.
   *
   * @param repoPath - Repository path
   * @returns Repository info or null if not a GitHub repo
   */
  private async parseGitRemote(repoPath: string): Promise<RepositoryInfo | null> {
    try {
      // Get remote URL from git config
      const remoteUrl = execSync('git config --get remote.origin.url', {
        cwd: repoPath,
        encoding: 'utf8'
      }).trim();

      this.log.debug(LogCategory.GITHUB, `Remote URL: ${remoteUrl}`, 'parseGitRemote');

      // Parse GitHub URL
      // Supports both HTTPS and SSH formats:
      // - https://github.com/owner/repo.git
      // - git@github.com:owner/repo.git
      const match = remoteUrl.match(/github\.com[:/]([^/]+)\/(.+?)(\.git)?$/);

      if (!match) {
        this.log.warn(LogCategory.GITHUB, 'Not a GitHub repository', 'parseGitRemote');
        return null;
      }

      const owner = match[1];
      const repo = match[2];

      this.log.info(LogCategory.GITHUB, `Parsed: ${owner}/${repo}`, 'parseGitRemote');

      return { owner, repo };

    } catch (error) {
      this.log.error(LogCategory.GITHUB, `Failed to parse git remote: ${error}`, 'parseGitRemote');
      return null;
    }
  }
}
