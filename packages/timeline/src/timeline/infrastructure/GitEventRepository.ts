/**
 * GitEventRepository - Raw Git Data Extraction
 *
 * ARCHITECTURE NOTE: This is the foundation layer that extracts raw git data
 * using enhanced commands (reflog for branch creation, parent hashes for merges).
 *
 * CRITICAL: This class uses actual git relationships, not pattern matching!
 * - Reflog for TRUE branch creation dates (not last commit dates)
 * - Parent hashes for ACTUAL merge detection (not commit message patterns)
 * - --all flag to capture commits from ALL branches
 *
 * Next phase: Build MergeAnalyzer and BranchAnalyzer to process this raw data.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
    GitEvent,
    GitEventCollection,
    CollectionMetadata,
    GitDataError,
    GitEventType
} from '../domain/git-event.types';
import { logger, LogCategory, LogPathway } from '../../utils/Logger';

const execAsync = promisify(exec);

/**
 * Configuration for git data extraction
 */
export interface GitRepositoryConfig {
    maxCommits: number;
    includeAllBranches: boolean;
    timeoutMs: number;
}

export const DEFAULT_GIT_CONFIG: GitRepositoryConfig = {
    maxCommits: 1000,
    includeAllBranches: true,
    timeoutMs: 30000
};

/**
 * Raw git project information
 */
export interface GitProjectInfo {
    name: string;
    rootPath: string;
    isGitRepo: boolean;
}

/**
 * Repository for extracting git events with enhanced data collection
 */
export class GitEventRepository {
    private readonly config: GitRepositoryConfig;
    private cachedProjects: Map<string, GitProjectInfo> = new Map();

    constructor(config: Partial<GitRepositoryConfig> = {}) {
        this.config = { ...DEFAULT_GIT_CONFIG, ...config };
    }

    /**
     * Main entry point - extracts complete git event collection
     */
    async extractGitEvents(projectPath?: string): Promise<GitEventCollection> {
        logger.debug(
            LogCategory.DATA,
            `Starting git event extraction for ${projectPath || 'current workspace'}`,
            'GitEventRepository.extractGitEvents',
            { projectPath },
            LogPathway.DATA_INGESTION
        );

        const project = await this.resolveProject(projectPath);
        if (!project) {
            logger.error(
                LogCategory.DATA,
                'No git repository found',
                'GitEventRepository.extractGitEvents',
                { projectPath },
                LogPathway.DATA_INGESTION
            );
            throw new GitDataError('No git repository found', { projectPath });
        }

        logger.debug(
            LogCategory.DATA,
            `Extracting events from ${project.name}`,
            'GitEventRepository.extractGitEvents',
            { projectName: project.name, rootPath: project.rootPath },
            LogPathway.DATA_INGESTION
        );
        console.log(`GitEventRepository: Extracting events from ${project.name}...`);

        try {
            // Extract all event types in parallel for efficiency
            const [commitEvents, branchEvents, releaseEvents, branchDeletionEvents, checkoutEvents] = await Promise.all([
                this.extractCommitEvents(project),
                this.extractBranchCreationEvents(project),
                this.extractReleaseEvents(project),
                this.extractBranchDeletionEvents(project),
                this.extractCheckoutEvents(project)
            ]);

            // Combine and sort all events by date
            const allEvents = [...commitEvents, ...branchEvents, ...releaseEvents, ...branchDeletionEvents, ...checkoutEvents];
            allEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

            // Build collection metadata
            const metadata = this.buildCollectionMetadata(project, allEvents);

            // Extract unique branches and authors
            const branchSet = new Set(allEvents.map(e => e.branch));
            // Always include 'main' branch as a fallback
            branchSet.add('main');
            const branches = [...branchSet].sort();
            const authors = [...new Set(allEvents.map(e => e.author))].sort();

            // Calculate date range
            const dates = allEvents.map(e => e.date);
            const dateRange: [Date, Date] = [
                new Date(Math.min(...dates.map(d => d.getTime()))),
                new Date(Math.max(...dates.map(d => d.getTime())))
            ];

            const collection: GitEventCollection = {
                events: allEvents,
                relationships: [], // Will be populated by analyzers
                branches,
                authors,
                dateRange,
                metadata
            };

            console.log(`GitEventRepository: Extracted ${allEvents.length} events from ${branches.length} branches`);
            return collection;

        } catch (error: any) {
            throw new GitDataError(
                `Failed to extract git events: ${error.message || 'Unknown error'}`,
                { project: project.name, error }
            );
        }
    }

    /**
     * Extracts commit and merge events using parent hash analysis
     * Enhanced with branch containment mapping for multi-branch visibility
     */
    private async extractCommitEvents(project: GitProjectInfo): Promise<GitEvent[]> {
        logger.debug(
            LogCategory.DATA,
            'Extracting commit events',
            'GitEventRepository.extractCommitEvents',
            { maxCommits: this.config.maxCommits, includeAllBranches: this.config.includeAllBranches },
            LogPathway.DATA_INGESTION
        );

        const maxCountFlag = `--max-count=${this.config.maxCommits}`;
        const branchFlag = this.config.includeAllBranches ? '--all' : '';

        // Enhanced git log with parent hashes (%P) for merge detection
        // Added --source to identify which ref provided each commit
        const command = [
            'git log',
            branchFlag,
            '--source',  // Shows which ref (branch) found each commit
            maxCountFlag,
            '--pretty=format:"%H|%P|%an|%cI|%s|%D"',
            '--numstat'
        ].filter(Boolean).join(' ');

        logger.debug(
            LogCategory.DATA,
            `Executing git command: ${command}`,
            'GitEventRepository.extractCommitEvents',
            { command },
            LogPathway.DATA_INGESTION
        );
        console.log(`GitEventRepository: Executing: ${command}`);

        try {
            // Extract branch containment map in parallel
            const [logOutput, branchContainment] = await Promise.all([
                execAsync(command, {
                    cwd: project.rootPath,
                    timeout: this.config.timeoutMs,
                    maxBuffer: 10 * 1024 * 1024 // 10MB buffer
                }),
                this.extractBranchContainmentMap(project)
            ]);

            return this.parseCommitOutput(logOutput.stdout, branchContainment);

        } catch (error) {
            console.warn('GitEventRepository: Failed to extract commits:', error);
            return [];
        }
    }

    /**
     * Extracts branch creation events using reflog for actual creation dates
     */
    private async extractBranchCreationEvents(project: GitProjectInfo): Promise<GitEvent[]> {
        try {
            // Get all local branch names
            const { stdout: branchOutput } = await execAsync(
                'git branch --format="%(refname:short)"',
                { cwd: project.rootPath, timeout: this.config.timeoutMs }
            );

            const branchNames = branchOutput.trim().split('\n').filter(Boolean);
            console.log(`GitEventRepository: Found ${branchNames.length} branches for reflog analysis`);

            // Extract creation events for each branch using reflog
            const branchPromises = branchNames.map(branchName =>
                this.extractBranchCreationEvent(project, branchName)
            );

            const branchEvents = (await Promise.all(branchPromises))
                .filter((event): event is GitEvent => event !== null);

            console.log(`GitEventRepository: Extracted ${branchEvents.length} branch creation events`);
            return branchEvents;

        } catch (error) {
            console.warn('GitEventRepository: Failed to extract branch events:', error);
            return [];
        }
    }

    /**
     * Extracts a single branch creation event using reflog
     */
    private async extractBranchCreationEvent(
        project: GitProjectInfo,
        branchName: string
    ): Promise<GitEvent | null> {
        try {
            // Get the last (oldest) entry in reflog - this is the branch creation
            const command = `git reflog show --format="%H|%an|%cI|%gs" "refs/heads/${branchName}" | tail -1`;

            const { stdout } = await execAsync(command, {
                cwd: project.rootPath,
                timeout: this.config.timeoutMs
            });

            const [hash, author, dateStr, reflogSubject] = stdout.trim().split('|');

            if (hash && dateStr) {
                return {
                    id: `${hash}-branch-${branchName}`,
                    type: 'branch-created',
                    author: author || 'Unknown',
                    date: new Date(dateStr),
                    title: `Branch '${branchName}' created`,
                    branch: branchName,
                    metadata: {
                        visualType: 'branch-start' as const,
                        importance: 'medium' as const
                    }
                };
            }

            return null;

        } catch (error: any) {
            // Some branches may not have reflog entries - this is normal
            console.debug(`GitEventRepository: No reflog for branch ${branchName}:`, error.message || 'Unknown error');
            return null;
        }
    }

    /**
     * Extracts release/tag events with target commit SHA
     */
    private async extractReleaseEvents(project: GitProjectInfo): Promise<GitEvent[]> {
        try {
            // Enhanced command: Get tag object hash AND target commit hash
            // %(objectname) = tag object hash (for annotated tags)
            // %(*objectname) = dereferenced commit hash (what the tag points to)
            const command = 'git tag --sort=-creatordate --format="%(objectname)|%(taggername)|%(creatordate:iso)|%(refname:short)|%(*objectname)"';

            const { stdout } = await execAsync(command, {
                cwd: project.rootPath,
                timeout: this.config.timeoutMs
            });

            if (!stdout.trim()) return [];

            const releaseEvents = stdout.trim().split('\n').map(line => {
                const [tagHash, author, dateStr, tagName, commitHash] = line.split('|');

                // Use commit hash if available (annotated tags), otherwise tag hash (lightweight tags)
                const targetHash = commitHash || tagHash;

                return {
                    id: `${targetHash}-release`,
                    type: 'release' as GitEventType,
                    author: author || 'Unknown',
                    date: new Date(dateStr),
                    title: `Release: ${tagName}`,
                    branch: 'main', // Releases typically on main branch
                    metadata: {
                        tagHash,              // Tag object hash (for annotated tags)
                        targetCommit: targetHash, // Commit hash that tag points to
                        tagName,              // Tag name (v1.0.0, etc.)
                        visualType: 'normal' as const,
                        importance: 'high' as const
                    }
                };
            }).filter(event => event.id && !isNaN(event.date.getTime()));

            console.log(`GitEventRepository: Extracted ${releaseEvents.length} release events`);
            return releaseEvents;

        } catch (error) {
            console.warn('GitEventRepository: Failed to extract releases:', error);
            return [];
        }
    }

    /**
     * Extracts branch deletion events from reflog
     */
    private async extractBranchDeletionEvents(project: GitProjectInfo): Promise<GitEvent[]> {
        try {
            // Use git reflog to find branch deletion events
            const command = 'git reflog --date=iso --format="%H|%gd|%gs|%ci" --grep-reflog="branch: deleted"';

            const { stdout } = await execAsync(command, {
                cwd: project.rootPath,
                timeout: this.config.timeoutMs
            });

            if (!stdout.trim()) return [];

            const deletionEvents = stdout.trim().split('\n')
                .map(line => {
                    const [hash, ref, message, dateStr] = line.split('|');

                    // Extract branch name from message like "branch: deleted refs/heads/feature-x"
                    const branchMatch = message.match(/branch: deleted (?:refs\/heads\/)?(.+)/);
                    if (!branchMatch) return null;

                    const branchName = branchMatch[1];

                    return {
                        id: `${hash}-branch-deleted-${branchName}`,
                        type: 'branch-deleted' as GitEventType,
                        author: 'System',
                        date: new Date(dateStr),
                        title: `Branch '${branchName}' deleted`,
                        branch: branchName,
                        metadata: {
                            visualType: 'normal' as const,
                            importance: 'medium' as const,
                            deletedBranch: branchName
                        }
                    };
                })
                .filter(event => event && event.id && !isNaN(event.date.getTime())) as GitEvent[];

            console.log(`GitEventRepository: Extracted ${deletionEvents.length} branch deletion events`);
            return deletionEvents;

        } catch (error) {
            console.warn('GitEventRepository: Failed to extract branch deletions:', error);
            return [];
        }
    }

    /**
     * Extracts branch checkout/switch events from reflog
     */
    private async extractCheckoutEvents(project: GitProjectInfo): Promise<GitEvent[]> {
        try {
            // Use git reflog to find checkout events
            const command = 'git reflog --date=iso --format="%H|%gd|%gs|%ci"';

            const { stdout } = await execAsync(command, {
                cwd: project.rootPath,
                timeout: this.config.timeoutMs
            });

            if (!stdout.trim()) return [];

            const checkoutEvents = stdout.trim().split('\n')
                .map(line => {
                    const [hash, ref, message, dateStr] = line.split('|');

                    // Match checkout messages like "checkout: moving from main to feature-branch"
                    const checkoutMatch = message.match(/checkout: moving from (.+) to (.+)/);
                    if (!checkoutMatch) return null;

                    const fromBranch = checkoutMatch[1];
                    const toBranch = checkoutMatch[2];

                    return {
                        id: `${hash}-checkout-${toBranch}-${Date.parse(dateStr)}`,
                        type: 'branch-checkout' as GitEventType,
                        author: 'System',
                        date: new Date(dateStr),
                        title: `Switched to branch '${toBranch}'`,
                        branch: toBranch,
                        metadata: {
                            visualType: 'normal' as const,
                            importance: 'low' as const,
                            fromBranch,
                            toBranch,
                            eventSubtype: 'branch-checkout'
                        }
                    };
                })
                .filter(event => event && event.id && !isNaN(event.date.getTime())) as GitEvent[];

            console.log(`GitEventRepository: Extracted ${checkoutEvents.length} branch checkout events`);
            return checkoutEvents;

        } catch (error) {
            console.warn('GitEventRepository: Failed to extract checkout events:', error);
            return [];
        }
    }

    /**
     * Parses git log output with parent hash analysis and branch containment
     */
    private parseCommitOutput(output: string, branchContainment: Map<string, string[]>): GitEvent[] {
        logger.debug(
            LogCategory.DATA,
            'Parsing commit output',
            'GitEventRepository.parseCommitOutput',
            { outputLength: output.length, branchContainmentSize: branchContainment.size },
            LogPathway.DATA_INGESTION
        );

        const events: GitEvent[] = [];
        const lines = output.split('\n');
        let currentEvent: Partial<GitEvent & { parentHashesStr?: string }> | null = null;
        let currentSource: string | null = null; // Track --source ref
        let insertions = 0, deletions = 0, filesChanged = 0;

        for (const line of lines) {
            // With --source flag, refs appear before the commit line
            // Format: refs/heads/branch-name <commit-line>
            if (line.match(/^refs\//)) {
                const parts = line.split(/\s+/);
                currentSource = parts[0]; // e.g., "refs/heads/main"
                continue;
            }

            if (line.includes('|') && !line.match(/^\d+\s+\d+\s+/)) {
                // Process previous event if exists
                if (currentEvent) {
                    events.push(this.finalizeCommitEvent(
                        currentEvent,
                        filesChanged,
                        insertions,
                        deletions,
                        branchContainment,
                        currentSource
                    ));
                }

                // Parse new commit header
                const [hash, parents, author, dateStr, subject, refs] = line.split('|');
                currentEvent = {
                    id: hash,
                    parentHashesStr: parents,
                    author: author || 'Unknown',
                    date: new Date(dateStr),
                    title: subject || 'No commit message',
                    branch: this.extractBranchFromRefs(refs, subject)
                };

                // Reset file change counters
                insertions = 0;
                deletions = 0;
                filesChanged = 0;

            } else if (line.match(/^\d+\s+\d+\s+/)) {
                // Parse numstat line (file changes)
                const [insStr, delStr] = line.split('\t');
                insertions += parseInt(insStr) || 0;
                deletions += parseInt(delStr) || 0;
                filesChanged++;
            }
        }

        // Don't forget the last event
        if (currentEvent) {
            events.push(this.finalizeCommitEvent(
                currentEvent,
                filesChanged,
                insertions,
                deletions,
                branchContainment,
                currentSource
            ));
        }

        console.log(`GitEventRepository: Parsed ${events.length} commit/merge events`);
        return events;
    }

    /**
     * Finalizes a commit event with type detection and branch enrichment
     */
    private finalizeCommitEvent(
        event: Partial<GitEvent & { parentHashesStr?: string }>,
        files: number,
        ins: number,
        del: number,
        branchContainment: Map<string, string[]>,
        sourceRef: string | null
    ): GitEvent {
        const parentHashes = event.parentHashesStr?.split(' ').filter(Boolean) || [];
        const isMerge = parentHashes.length > 1;

        // Extract all branches containing this commit
        const commitBranches = branchContainment.get(event.id!) || [];

        // Debug logging for branch associations
        if (commitBranches.length > 1) {
            console.log(`GitEventRepository: Multi-branch commit found:`, {
                hash: event.id!.substring(0, 7),
                title: event.title?.substring(0, 50),
                branches: commitBranches
            });
        }

        // Clean up source ref to get branch name
        let sourceBranch: string | undefined;
        if (sourceRef) {
            sourceBranch = sourceRef.replace('refs/heads/', '').replace('refs/remotes/origin/', '');
        }

        return {
            id: event.id!,
            type: isMerge ? 'merge' : 'commit',
            author: event.author!,
            date: event.date!,
            title: event.title!,
            branch: event.branch || 'main', // Primary branch (for backwards compatibility)
            branches: commitBranches.length > 0 ? commitBranches : undefined, // All branches containing commit
            parentHashes: parentHashes.length > 0 ? parentHashes : undefined,
            filesChanged: files,
            insertions: ins,
            deletions: del,
            metadata: {
                visualType: isMerge ? 'merge-target' as const : 'normal' as const,
                importance: isMerge ? 'high' as const : 'medium' as const,
                branchContext: commitBranches.length > 0 ? {
                    visibleIn: commitBranches,
                    source: sourceBranch,
                    authoredOn: sourceBranch // Best-effort: assume authored on source branch
                } : undefined
            }
        };
    }

    /**
     * Extracts branch name from git refs with enhanced logic
     */
    private extractBranchFromRefs(refs: string, commitMessage: string): string {
        if (!refs) {
            // For merge commits, try to extract from message
            const mergeMatch = commitMessage.match(/Merge branch '([^']+)'/);
            if (mergeMatch) return mergeMatch[1];
            return 'main';
        }

        // Priority order: remote branches, HEAD, any ref
        const remoteMatch = refs.match(/origin\/([^,\)]+)/);
        if (remoteMatch) return remoteMatch[1];

        const headMatch = refs.match(/HEAD -> ([^,\)]+)/);
        if (headMatch) return headMatch[1];

        // Fallback to first ref
        const firstRef = refs.trim().split(', ')[0];
        return firstRef || 'main';
    }

    /**
     * Extracts branch containment map - which commits are in which branches
     * This enables accurate multi-branch visibility
     */
    private async extractBranchContainmentMap(project: GitProjectInfo): Promise<Map<string, string[]>> {
        try {
            // Get all local branches
            const { stdout: branchesOutput } = await execAsync('git branch --format="%(refname:short)"', {
                cwd: project.rootPath,
                timeout: this.config.timeoutMs
            });

            if (!branchesOutput.trim()) {
                return new Map();
            }

            const branches = branchesOutput.trim().split('\n').map(b => b.trim()).filter(Boolean);
            const containmentMap = new Map<string, string[]>();

            // For each branch, get all commit hashes in that branch
            for (const branch of branches) {
                try {
                    const { stdout: commitsOutput } = await execAsync(
                        `git log ${branch} --format="%H" --max-count=${this.config.maxCommits}`,
                        {
                            cwd: project.rootPath,
                            timeout: this.config.timeoutMs
                        }
                    );

                    const commitHashes = commitsOutput.trim().split('\n').filter(Boolean);

                    // Build reverse map: commit -> branches containing it
                    for (const hash of commitHashes) {
                        if (!containmentMap.has(hash)) {
                            containmentMap.set(hash, []);
                        }
                        containmentMap.get(hash)!.push(branch);
                    }
                } catch (error) {
                    console.warn(`GitEventRepository: Failed to get commits for branch ${branch}:`, error);
                }
            }

            console.log(`GitEventRepository: Built containment map for ${containmentMap.size} commits across ${branches.length} branches`);
            console.log(`GitEventRepository: Sample branch data:`, {
                branches: branches,
                sampleCommits: Array.from(containmentMap.entries()).slice(0, 3).map(([hash, branches]) => ({
                    hash: hash.substring(0, 7),
                    branches
                }))
            });
            return containmentMap;

        } catch (error) {
            console.warn('GitEventRepository: Failed to extract branch containment map:', error);
            return new Map();
        }
    }

    /**
     * Extract branch context from reflog for a specific commit
     * Identifies which branch was checked out when the commit was created
     */
    private async extractAuthoringBranchFromReflog(project: GitProjectInfo, commitHash: string): Promise<string | undefined> {
        try {
            // Search reflog for the commit event
            const { stdout } = await execAsync(
                `git reflog --all --format="%H|%gs" --grep-reflog="${commitHash}"`,
                {
                    cwd: project.rootPath,
                    timeout: 5000
                }
            );

            if (!stdout.trim()) return undefined;

            // Look for "commit:" entries which show the active branch
            const lines = stdout.trim().split('\n');
            for (const line of lines) {
                const [, message] = line.split('|');
                if (message && message.startsWith('commit:')) {
                    // The branch context might be in the reflog
                    // This is a best-effort approach
                    return undefined;
                }
            }

            return undefined;
        } catch (error) {
            return undefined;
        }
    }

    /**
     * Builds collection metadata
     */
    private buildCollectionMetadata(project: GitProjectInfo, events: GitEvent[]): CollectionMetadata {
        const commitCount = events.filter(e => e.type === 'commit').length;
        const mergeCount = events.filter(e => e.type === 'merge').length;
        const branchCount = [...new Set(events.map(e => e.branch))].length;

        return {
            repositoryName: project.name,
            totalCommits: commitCount,
            totalMerges: mergeCount,
            totalBranches: branchCount,
            collectionDate: new Date(),
            gitRootPath: project.rootPath
        };
    }

    /**
     * Resolves project information from path or current workspace
     */
    private async resolveProject(projectPath?: string): Promise<GitProjectInfo | null> {
        if (projectPath) {
            return this.detectProjectFromPath(projectPath);
        }

        // Store the current project path to maintain consistency during refreshes
        let targetPath: string | null = null;

        // Try active editor first - this should be the primary source
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            targetPath = path.dirname(activeEditor.document.uri.fsPath);
            console.log(`GitEventRepository: Using active editor path: ${targetPath}`);
            const project = await this.detectProjectFromPath(targetPath);
            if (project) {
                // Cache this as the primary project for this session
                this.cachedProjects.set('__current_session__', project);
                return project;
            }
        }

        // Check if we have a cached session project (for reload consistency)
        if (this.cachedProjects.has('__current_session__')) {
            const cachedProject = this.cachedProjects.get('__current_session__')!;
            console.log(`GitEventRepository: Using cached session project: ${cachedProject.rootPath}`);
            // Verify the cached project still exists
            try {
                await fs.promises.access(path.join(cachedProject.rootPath, '.git'));
                return cachedProject;
            } catch {
                // Cache is stale, remove it
                this.cachedProjects.delete('__current_session__');
            }
        }

        // Fallback to workspace folder
        if (vscode.workspace.workspaceFolders?.[0]) {
            targetPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
            console.log(`GitEventRepository: Falling back to workspace folder: ${targetPath}`);
            return this.detectProjectFromPath(targetPath);
        }

        return null;
    }

    /**
     * Detects git project from filesystem path
     */
    private async detectProjectFromPath(dirPath: string): Promise<GitProjectInfo | null> {
        if (this.cachedProjects.has(dirPath)) {
            return this.cachedProjects.get(dirPath)!;
        }

        try {
            const gitRoot = await this.findGitRoot(dirPath);
            if (!gitRoot) return null;

            const projectInfo: GitProjectInfo = {
                name: path.basename(gitRoot),
                rootPath: gitRoot,
                isGitRepo: true
            };

            this.cachedProjects.set(dirPath, projectInfo);
            return projectInfo;

        } catch (error: any) {
            console.warn('GitEventRepository: Failed to detect project:', error);
            return null;
        }
    }

    /**
     * Finds git root directory by walking up the filesystem
     */
    private async findGitRoot(startPath: string): Promise<string | null> {
        let currentPath = startPath;

        while (currentPath !== path.dirname(currentPath)) {
            try {
                const gitPath = path.join(currentPath, '.git');
                const stats = await fs.promises.stat(gitPath);

                if (stats.isDirectory() || stats.isFile()) {
                    return currentPath;
                }
            } catch {
                // .git not found, continue up
            }

            currentPath = path.dirname(currentPath);
        }

        return null;
    }

    /**
     * Clears cached project information
     */
    clearCache(): void {
        this.cachedProjects.clear();
    }

    /**
     * Clear session cache (for active editor changes)
     */
    clearSessionCache(): void {
        this.cachedProjects.delete('__current_session__');
        console.log('GitEventRepository: Session cache cleared');
    }
}