/**
 * Git Project Manager for Repository Timeline Extension
 * Simplified version focused on git repository discovery and data collection
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GitBranchInfo {
    name: string;
    isRemote?: boolean;
    lastCommit?: string;
    author?: string;
    timestamp?: Date;
}

export interface GitProjectInfo {
    name: string;
    rootPath: string;
    isGitRepo: boolean;
    currentBranch?: GitBranchInfo;
    workspaceFolder?: vscode.WorkspaceFolder;
}

export interface GitCommit {
    hash: string;
    author: string;
    date: Date;
    message: string;
    branch: string;
    filesChanged: number;
    insertions: number;
    deletions: number;
}

export interface GitTag {
    name: string;
    hash: string;
    date: Date;
    message: string;
    author: string;
}

export interface GitBranch {
    name: string;
    lastCommit: string;
    author: string;
    date: Date;
    isRemote: boolean;
}

export interface GitHubEvent {
    id: string;
    type: 'pr' | 'issue' | 'ci' | 'fork' | 'star' | 'review';
    title: string;
    author: string;
    date: Date;
    status: string;
    url?: string;
    number?: number;
    branch?: string;
    // PR-specific fields for connection drawing
    sourceBranch?: string;
    targetBranch?: string;
    mergeCommitHash?: string;
    baseBranch?: string;
}

export interface GitHubRepository {
    owner: string;
    name: string;
    fullName: string;
}

export class GitProjectManager {
    private currentProject: GitProjectInfo | null = null;
    private cachedProjects: Map<string, GitProjectInfo> = new Map();

    /**
     * Get current active project based on active editor or workspace
     */
    async getCurrentProject(): Promise<GitProjectInfo | null> {
        // Try to get project from active editor first
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            const filePath = activeEditor.document.uri.fsPath;
            const project = await this.detectProjectFromFile(filePath);
            if (project) {
                this.currentProject = project;
                return project;
            }
        }

        // Fall back to first workspace folder
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            const workspaceFolder = vscode.workspace.workspaceFolders[0];
            const project = await this.detectProjectFromPath(workspaceFolder.uri.fsPath, workspaceFolder);
            if (project) {
                this.currentProject = project;
                return project;
            }
        }

        return null;
    }

    /**
     * Detect project from a file path
     */
    async detectProjectFromFile(filePath: string): Promise<GitProjectInfo | null> {
        const dir = path.dirname(filePath);
        return this.detectProjectFromPath(dir);
    }

    /**
     * Detect project from a directory path
     */
    async detectProjectFromPath(dirPath: string, workspaceFolder?: vscode.WorkspaceFolder): Promise<GitProjectInfo | null> {
        // Check cache first
        if (this.cachedProjects.has(dirPath)) {
            return this.cachedProjects.get(dirPath)!;
        }

        try {
            // Try to find git root
            const gitRoot = await this.findGitRoot(dirPath);
            if (!gitRoot) {
                return null; // Only interested in git repositories
            }

            const projectInfo: GitProjectInfo = {
                name: path.basename(gitRoot),
                rootPath: gitRoot,
                isGitRepo: true,
                workspaceFolder
            };

            // Get current branch info
            projectInfo.currentBranch = await this.getCurrentBranch(gitRoot);

            // Cache the result
            this.cachedProjects.set(dirPath, projectInfo);
            return projectInfo;

        } catch (error) {
            console.warn('Failed to detect project from path:', dirPath, error);
            return null;
        }
    }

    /**
     * Find git repository root
     */
    private async findGitRoot(startPath: string): Promise<string | null> {
        let currentPath = startPath;

        while (currentPath !== path.dirname(currentPath)) {
            const gitPath = path.join(currentPath, '.git');

            try {
                const stats = await fs.promises.stat(gitPath);
                if (stats.isDirectory() || stats.isFile()) {
                    return currentPath;
                }
            } catch {
                // .git doesn't exist, continue up
            }

            currentPath = path.dirname(currentPath);
        }

        return null;
    }

    /**
     * Get current git branch information
     */
    private async getCurrentBranch(gitRoot: string): Promise<GitBranchInfo | undefined> {
        try {
            // Try to get branch from HEAD file first
            const headFile = path.join(gitRoot, '.git', 'HEAD');

            try {
                const headContent = await fs.promises.readFile(headFile, 'utf-8');
                const match = headContent.trim().match(/ref: refs\/heads\/(.+)/);

                if (match) {
                    const branchName = match[1];
                    const additionalInfo = await this.getGitBranchDetails(gitRoot, branchName);

                    return {
                        name: branchName,
                        isRemote: false,
                        ...additionalInfo
                    };
                }
            } catch {
                // HEAD file might not exist or be readable
            }

            // Fallback: try to execute git command
            return await this.getGitBranchViaCommand(gitRoot);

        } catch (error) {
            console.warn('Failed to get git branch info:', error);
            return undefined;
        }
    }

    /**
     * Get git branch details using git commands
     */
    private async getGitBranchDetails(gitRoot: string, branchName: string): Promise<Partial<GitBranchInfo>> {
        try {
            // Get last commit info
            const { stdout } = await execAsync(`git log -1 --format="%H|%an|%ad" --date=iso`, {
                cwd: gitRoot,
                timeout: 10000
            });

            const [commit, author, timestamp] = stdout.trim().split('|');

            return {
                lastCommit: commit,
                author: author,
                timestamp: timestamp ? new Date(timestamp) : undefined
            };
        } catch {
            return {};
        }
    }

    /**
     * Get git branch via command (fallback)
     */
    private async getGitBranchViaCommand(gitRoot: string): Promise<GitBranchInfo | undefined> {
        try {
            const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', {
                cwd: gitRoot,
                timeout: 10000
            });

            const branchName = stdout.trim();

            if (branchName && branchName !== 'HEAD') {
                const additionalInfo = await this.getGitBranchDetails(gitRoot, branchName);

                return {
                    name: branchName,
                    isRemote: branchName.includes('origin/'),
                    ...additionalInfo
                };
            }
        } catch {
            // Git command failed
        }

        return undefined;
    }

    /**
     * Get git commits for timeline data
     */
    async getCommits(project?: GitProjectInfo, options: {
        since?: string;
        branch?: string;
        maxCount?: number;
    } = {}): Promise<GitCommit[]> {
        const targetProject = project || await this.getCurrentProject();
        if (!targetProject || !targetProject.isGitRepo) {
            return [];
        }

        try {
            const {
                since = '60 days ago',
                branch = '',
                maxCount = 500
            } = options;

            let command = `git log --pretty=format:"%H|%an|%ad|%s|%D" --date=iso --numstat --max-count=${maxCount}`;

            if (since) {
                command += ` --since="${since}"`;
            }

            if (branch) {
                command += ` ${branch}`;
            }

            const { stdout } = await execAsync(command, {
                cwd: targetProject.rootPath,
                timeout: 30000
            });

            return this.parseGitLogOutput(stdout);

        } catch (error) {
            console.warn('Failed to get git commits:', error);
            return [];
        }
    }

    /**
     * Parse git log output into structured commit data
     */
    private parseGitLogOutput(output: string): GitCommit[] {
        const commits: GitCommit[] = [];
        const lines = output.split('\n');
        let currentCommit: Partial<GitCommit> | null = null;
        let insertions = 0;
        let deletions = 0;
        let filesChanged = 0;

        for (const line of lines) {
            if (line.includes('|') && !line.match(/^\d+\s+\d+\s+/)) {
                // This is a commit header line
                if (currentCommit) {
                    // Finalize previous commit
                    commits.push({
                        ...currentCommit,
                        filesChanged,
                        insertions,
                        deletions
                    } as GitCommit);
                }

                // Start new commit
                const [hash, author, date, message, refs] = line.split('|');
                const branchMatch = refs?.match(/origin\/([^,\)]+)/);
                const branch = branchMatch ? branchMatch[1] : 'main';

                currentCommit = {
                    hash: hash.trim(),
                    author: author.trim(),
                    date: new Date(date.trim()),
                    message: message.trim(),
                    branch: branch.trim()
                };

                // Reset stats for new commit
                insertions = 0;
                deletions = 0;
                filesChanged = 0;

            } else if (line.match(/^\d+\s+\d+\s+/)) {
                // This is a numstat line (insertions deletions filename)
                const [ins, del] = line.split('\t');
                insertions += parseInt(ins) || 0;
                deletions += parseInt(del) || 0;
                filesChanged++;
            }
        }

        // Don't forget the last commit
        if (currentCommit) {
            commits.push({
                ...currentCommit,
                filesChanged,
                insertions,
                deletions
            } as GitCommit);
        }

        return commits;
    }

    /**
     * Get git branches
     */
    async getBranches(project?: GitProjectInfo): Promise<GitBranch[]> {
        const targetProject = project || await this.getCurrentProject();
        if (!targetProject || !targetProject.isGitRepo) {
            return [];
        }

        try {
            const { stdout } = await execAsync('git branch -a --format="%(refname:short)|%(authorname)|%(authordate:iso)|%(objectname)"', {
                cwd: targetProject.rootPath,
                timeout: 10000
            });

            const branches: GitBranch[] = [];
            const lines = stdout.trim().split('\n');

            for (const line of lines) {
                if (!line.trim()) continue;

                const [name, author, date, hash] = line.split('|');
                if (name && author && date && hash) {
                    branches.push({
                        name: name.replace('origin/', ''),
                        author: author.trim(),
                        date: new Date(date.trim()),
                        lastCommit: hash.trim(),
                        isRemote: name.includes('origin/')
                    });
                }
            }

            return branches;

        } catch (error) {
            console.warn('Failed to get git branches:', error);
            return [];
        }
    }

    /**
     * Get git tags/releases
     */
    async getTags(project?: GitProjectInfo): Promise<GitTag[]> {
        const targetProject = project || await this.getCurrentProject();
        if (!targetProject || !targetProject.isGitRepo) {
            return [];
        }

        try {
            const { stdout } = await execAsync('git tag --sort=-creatordate --format="%(refname:short)|%(objectname)|%(creatordate:iso)|%(taggername)|%(subject)"', {
                cwd: targetProject.rootPath,
                timeout: 10000
            });

            const tags: GitTag[] = [];
            const lines = stdout.trim().split('\n');

            for (const line of lines) {
                if (!line.trim()) continue;

                const [name, hash, date, author, message] = line.split('|');
                if (name && hash && date) {
                    tags.push({
                        name: name.trim(),
                        hash: hash.trim(),
                        date: new Date(date.trim()),
                        author: (author || 'Unknown').trim(),
                        message: (message || '').trim()
                    });
                }
            }

            return tags;

        } catch (error) {
            console.warn('Failed to get git tags:', error);
            return [];
        }
    }

    /**
     * Clear project cache
     */
    clearCache(): void {
        this.cachedProjects.clear();
        this.currentProject = null;
    }

    /**
     * Get all contributors from git history
     */
    async getAllContributors(project?: GitProjectInfo): Promise<string[]> {
        const targetProject = project || await this.getCurrentProject();
        if (!targetProject || !targetProject.isGitRepo) {
            return [];
        }

        try {
            // Use git log without shell pipes for Windows compatibility
            const { stdout } = await execAsync('git log --format="%an" --since="1 year ago"', {
                cwd: targetProject.rootPath,
                timeout: 15000
            });

            // Remove duplicates manually instead of using sort -u
            const authors = stdout.trim().split('\n').filter(author => author.trim().length > 0);
            return [...new Set(authors)]; // Remove duplicates
        } catch (error) {
            console.warn('Failed to get git contributors:', error);
            return [];
        }
    }

    /**
     * Detect GitHub repository from git remote
     */
    async getGitHubRepository(project?: GitProjectInfo): Promise<GitHubRepository | null> {
        const targetProject = project || await this.getCurrentProject();
        if (!targetProject || !targetProject.isGitRepo) {
            return null;
        }

        try {
            const { stdout } = await execAsync('git remote get-url origin', {
                cwd: targetProject.rootPath,
                timeout: 5000
            });

            const remoteUrl = stdout.trim();

            // Parse GitHub URL patterns
            const githubPatterns = [
                /github\.com[:\/]([^\/]+)\/([^\/]+?)(?:\.git)?$/,
                /https:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/
            ];

            for (const pattern of githubPatterns) {
                const match = remoteUrl.match(pattern);
                if (match) {
                    const [, owner, name] = match;
                    return {
                        owner,
                        name,
                        fullName: owner + '/' + name
                    };
                }
            }
        } catch (error) {
            console.warn('Failed to get GitHub repository info:', error);
        }

        return null;
    }

    /**
     * Get GitHub events (requires GitHub token)
     */
    async getGitHubEvents(project?: GitProjectInfo, options: {
        since?: string;
        types?: string[];
    } = {}): Promise<GitHubEvent[]> {
        const targetProject = project || await this.getCurrentProject();
        if (!targetProject || !targetProject.isGitRepo) {
            return [];
        }

        const githubRepo = await this.getGitHubRepository(targetProject);
        if (!githubRepo) {
            console.log('Not a GitHub repository, skipping GitHub events');
            return [];
        }

        const events: GitHubEvent[] = [];
        const { since = '90 days ago', types = ['pr', 'issue'] } = options;

        try {
            // TODO: Implement real GitHub API integration here
            // For now, return empty array - no fake data
            // const githubApiEvents = await this.fetchRealGitHubEvents(githubRepo, since, types);
            // events.push(...githubApiEvents);

            console.log('GitHub events loaded (real API not implemented yet):', events.length);
        } catch (error) {
            console.warn('Failed to get GitHub events:', error);
        }

        return events;
    }

    /**
     * TODO: Implement real GitHub API integration
     * This method would fetch actual GitHub events using the GitHub API
     */
    // private async fetchRealGitHubEvents(repo: GitHubRepository, since: string, types: string[]): Promise<GitHubEvent[]> {
    //     // Real GitHub API implementation would go here
    //     // Would require authentication token and proper API calls
    //     return [];
    // }

    /**
     * Refresh current project (useful when switching branches)
     */
    async refreshCurrentProject(): Promise<GitProjectInfo | null> {
        this.currentProject = null;
        this.cachedProjects.clear();
        return this.getCurrentProject();
    }
}