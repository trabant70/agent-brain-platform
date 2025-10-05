import * as vscode from 'vscode';
/**
 * GitProvider - Git data extraction with direct CanonicalEvent output
 *
 * This provider wraps GitEventRepository and transforms its output
 * into CanonicalEvent format IN ONE STEP.
 *
 * Key features:
 * - Preserves ALL branches via branches[] array
 * - No intermediate transformations
 * - Direct path from git → CanonicalEvent
 */

import {
  CanonicalEvent,
  EventType,
  Author,
  ImpactMetrics,
  ProviderContext,
  ProviderCapabilities,
  ProviderConfig
} from '../../events';
import { IDataProvider } from '../base/ProviderRegistry';
import { GitEventRepository } from './GitEventRepository';
import { GitEvent } from './git-event.types';
import { logger, LogCategory, createContextLogger } from '../../../infrastructure/logging';

export class GitProvider implements IDataProvider {
  private readonly log = createContextLogger('GitProvider');

  public readonly id = 'git-local';
  public readonly name = 'Local Git Repository';
  public readonly version = '2.0.0';

  public readonly capabilities: ProviderCapabilities = {
    supportsRealTimeUpdates: false,
    supportsHistoricalData: true,
    supportsFiltering: true,
    supportsSearch: true,
    supportsAuthentication: false,
    supportsWriteOperations: false,
    supportedEventTypes: [
      EventType.COMMIT,
      EventType.MERGE,
      EventType.BRANCH_CREATED,
      EventType.BRANCH_DELETED,
      EventType.BRANCH_CHECKOUT,
      EventType.TAG_CREATED
    ]
  };

  private gitEventRepository: GitEventRepository;
  private config?: ProviderConfig;
  private isInitialized = false;

  constructor() {
    this.gitEventRepository = new GitEventRepository();
  }

  /**
   * Initialize the provider
   */
  async initialize(config: ProviderConfig): Promise<void> {
    try {
      this.log.info(LogCategory.GIT, 'Initializing GitProvider', 'initialize');
      this.config = config;
      this.isInitialized = true;
      this.log.info(LogCategory.GIT, 'GitProvider initialized successfully', 'initialize');
    } catch (error) {
      this.log.error(LogCategory.GIT, 'Failed to initialize GitProvider', 'initialize');
      throw error;
    }
  }

  /**
   * Check if provider is healthy
   */
  async isHealthy(): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }

    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      return workspaceFolders !== undefined && workspaceFolders.length > 0;
    } catch (error) {
      this.log.warn(LogCategory.GIT, 'Health check failed', 'isHealthy');
      return false;
    }
  }

  /**
   * Fetch events from git repository
   *
   * This is THE transformation boundary - GitEvent → CanonicalEvent
   * Everything downstream works with CanonicalEvent natively
   */
  async fetchEvents(context: ProviderContext): Promise<CanonicalEvent[]> {
    if (!this.isInitialized) {
      throw new Error('GitProvider not initialized');
    }

    try {
      this.log.info(LogCategory.GIT, 'Fetching git events', 'fetchEvents');

      // Determine target path (prefer repoPath, fall back to active file or workspace)
      const targetPath = this.resolveTargetPath(context);
      if (!targetPath) {
        this.log.warn(LogCategory.GIT, 'No valid git repository path found', 'fetchEvents');
        return [];
      }

      this.log.info(LogCategory.GIT, `Using target path: ${targetPath}`, 'fetchEvents');

      // Extract git events using GitEventRepository
      const gitCollection = await this.gitEventRepository.extractGitEvents(targetPath);

      if (!gitCollection || !gitCollection.events || gitCollection.events.length === 0) {
        this.log.info(LogCategory.GIT, 'No git events found', 'fetchEvents');
        return [];
      }

      this.log.info(LogCategory.GIT, `Extracted ${gitCollection.events.length} git events`, 'fetchEvents');

      // Transform GitEvent → CanonicalEvent (ONCE, AT THE BOUNDARY)
      const canonicalEvents = gitCollection.events.map(gitEvent =>
        this.transformToCanonicalEvent(gitEvent)
      );

      this.log.info(LogCategory.GIT, `Transformed to ${canonicalEvents.length} canonical events`, 'fetchEvents');

      return canonicalEvents;

    } catch (error) {
      this.log.error(LogCategory.GIT, `Error fetching git events: ${error}`, 'fetchEvents');
      throw error;
    }
  }

  /**
   * Transform GitEvent → CanonicalEvent
   *
   * CRITICAL: This preserves branches[] array to prevent data loss
   */
  private transformToCanonicalEvent(gitEvent: GitEvent): CanonicalEvent {
    // Map event type
    const eventType = this.mapEventType(gitEvent.type);

    // Build author
    const author: Author = {
      id: gitEvent.author || 'unknown',
      name: gitEvent.author || 'Unknown',
      email: undefined // GitEvent doesn't expose email currently
    };

    // Extract co-authors if present (from merge commits, etc.)
    // Note: GitEvent doesn't have coAuthors in metadata yet
    const coAuthors: Author[] | undefined = undefined;

    // CRITICAL: Preserve ALL branches
    // gitEvent.branches contains all branches that contain this commit
    // This is what was getting lost in the old architecture
    const branches = gitEvent.branches && gitEvent.branches.length > 0
      ? [...gitEvent.branches]
      : [gitEvent.branch]; // Fallback to primary branch if branches[] is empty

    // Build impact metrics
    const impact: ImpactMetrics | undefined = (
      gitEvent.filesChanged !== undefined ||
      gitEvent.insertions !== undefined ||
      gitEvent.deletions !== undefined
    ) ? {
      filesChanged: gitEvent.filesChanged,
      linesAdded: gitEvent.insertions,
      linesRemoved: gitEvent.deletions
    } : undefined;

    // Build canonical event
    const canonicalEvent: CanonicalEvent = {
      // Identity
      id: gitEvent.id,
      canonicalId: `${this.id}:${gitEvent.id}`,
      providerId: this.id,
      type: eventType,

      // Temporal
      timestamp: gitEvent.date,

      // Content
      title: gitEvent.title || 'No title',
      description: undefined, // GitEvent doesn't have body field

      // Attribution
      author,
      coAuthors,

      // Context - Git
      branches, // PRESERVED - all branches containing this commit
      primaryBranch: gitEvent.branch,
      tags: gitEvent.metadata?.tagName ? [gitEvent.metadata.tagName] : undefined, // ADDED: Populate tags array
      hash: gitEvent.metadata?.targetCommit || gitEvent.id, // ADDED: Use target commit for releases
      fullHash: gitEvent.metadata?.targetCommit || gitEvent.id,

      // Relationships
      parentIds: gitEvent.parentHashes || [],

      // Metrics
      impact,

      // Extensibility
      metadata: {
        ...gitEvent.metadata,
        originalType: gitEvent.type,
        branchContext: gitEvent.metadata?.branchContext
      }
    };

    return canonicalEvent;
  }

  /**
   * Map GitEvent type to CanonicalEvent EventType
   */
  private mapEventType(gitType: string): EventType {
    switch (gitType) {
      case 'commit':
        return EventType.COMMIT;
      case 'merge':
        return EventType.MERGE;
      case 'branch-created':
        return EventType.BRANCH_CREATED;
      case 'branch-deleted':
        return EventType.BRANCH_DELETED;
      case 'branch-checkout':
      case 'branch-switch':
        return EventType.BRANCH_CHECKOUT;
      case 'tag':
      case 'tag-created':
        return EventType.TAG_CREATED;
      case 'release':
        return EventType.RELEASE;
      default:
        return EventType.COMMIT; // Default fallback
    }
  }

  /**
   * Resolve target path from context
   */
  private resolveTargetPath(context: ProviderContext): string | undefined {
    // Priority order:
    // 1. Explicit repoPath in context
    // 2. Active file path (extract directory)
    // 3. Workspace root
    // 4. First workspace folder

    if (context.repoPath) {
      return context.repoPath;
    }

    if (context.activeFile) {
      const path = require('path');
      return path.dirname(context.activeFile);
    }

    if (context.workspaceRoot) {
      return context.workspaceRoot;
    }

    // Fallback to VS Code workspace
    const activeFile = vscode.window.activeTextEditor?.document.uri.fsPath;
    if (activeFile) {
      const path = require('path');
      return path.dirname(activeFile);
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      return workspaceFolders[0].uri.fsPath;
    }

    return undefined;
  }

  /**
   * Dispose provider resources
   */
  async dispose(): Promise<void> {
    this.log.info(LogCategory.GIT, 'Disposing GitProvider', 'dispose');
    this.isInitialized = false;
  }
}
