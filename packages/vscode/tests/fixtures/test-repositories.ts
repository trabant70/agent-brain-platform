/**
 * Test Repositories Fixture
 * Provides test repository setup for pathway tests
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { execSync } from 'child_process';

export class TestRepositories {
    private static tmpDir = path.join(__dirname, '../tmp');

    /**
     * Create a mock git repository with configurable history
     */
    static async createMockRepo(options: {
        commitCount?: number;
        branchCount?: number;
        withTags?: boolean;
    } = {}): Promise<string> {
        const { commitCount = 5, branchCount = 1, withTags = false } = options;

        const repoPath = path.join(this.tmpDir, `mock-repo-${Date.now()}`);
        await fs.mkdir(repoPath, { recursive: true });

        try {
            // Initialize git repo
            execSync('git init', { cwd: repoPath, stdio: 'ignore' });
            execSync('git config user.email "test@test.com"', { cwd: repoPath, stdio: 'ignore' });
            execSync('git config user.name "Test User"', { cwd: repoPath, stdio: 'ignore' });

            // Create initial commit
            await fs.writeFile(path.join(repoPath, 'README.md'), '# Test Repository');
            execSync('git add .', { cwd: repoPath, stdio: 'ignore' });
            execSync('git commit -m "Initial commit"', { cwd: repoPath, stdio: 'ignore' });

            // Create additional commits
            for (let i = 1; i < commitCount; i++) {
                await fs.writeFile(
                    path.join(repoPath, `file${i}.txt`),
                    `Content for file ${i}`
                );
                execSync('git add .', { cwd: repoPath, stdio: 'ignore' });
                execSync(`git commit -m "Add file${i}.txt"`, { cwd: repoPath, stdio: 'ignore' });
            }

            // Create branches
            for (let i = 1; i < branchCount; i++) {
                const branchName = `feature/branch-${i}`;
                execSync(`git branch ${branchName}`, { cwd: repoPath, stdio: 'ignore' });
                execSync(`git checkout ${branchName}`, { cwd: repoPath, stdio: 'ignore' });

                await fs.writeFile(
                    path.join(repoPath, `branch-${i}.txt`),
                    `Branch ${i} content`
                );
                execSync('git add .', { cwd: repoPath, stdio: 'ignore' });
                execSync(`git commit -m "Branch ${i} work"`, { cwd: repoPath, stdio: 'ignore' });

                execSync('git checkout main', { cwd: repoPath, stdio: 'ignore' });
            }

            // Create tags
            if (withTags) {
                execSync('git tag v1.0.0', { cwd: repoPath, stdio: 'ignore' });
            }

            return repoPath;
        } catch (error) {
            // Cleanup on error
            await this.cleanup(repoPath);
            throw error;
        }
    }

    /**
     * Use the project's own git repository for testing
     * This is fast and requires no setup
     */
    static useProjectRepo(): string {
        return path.join(__dirname, '../../');
    }

    /**
     * Create a repository with specific commit history
     */
    static async createWithCommitHistory(commits: Array<{
        message: string;
        files: Array<{ path: string; content: string }>;
        author?: string;
        email?: string;
    }>): Promise<string> {
        const repoPath = path.join(this.tmpDir, `custom-repo-${Date.now()}`);
        await fs.mkdir(repoPath, { recursive: true });

        try {
            // Initialize
            execSync('git init', { cwd: repoPath, stdio: 'ignore' });

            for (const commit of commits) {
                // Set author if specified
                const author = commit.author || 'Test User';
                const email = commit.email || 'test@test.com';
                execSync(`git config user.name "${author}"`, { cwd: repoPath, stdio: 'ignore' });
                execSync(`git config user.email "${email}"`, { cwd: repoPath, stdio: 'ignore' });

                // Write files
                for (const file of commit.files) {
                    const filePath = path.join(repoPath, file.path);
                    const dir = path.dirname(filePath);
                    await fs.mkdir(dir, { recursive: true });
                    await fs.writeFile(filePath, file.content);
                }

                // Commit
                execSync('git add .', { cwd: repoPath, stdio: 'ignore' });
                execSync(`git commit -m "${commit.message}"`, { cwd: repoPath, stdio: 'ignore' });
            }

            return repoPath;
        } catch (error) {
            await this.cleanup(repoPath);
            throw error;
        }
    }

    /**
     * Create a repository with merge commits
     */
    static async createWithMerges(): Promise<string> {
        const repoPath = path.join(this.tmpDir, `merge-repo-${Date.now()}`);
        await fs.mkdir(repoPath, { recursive: true });

        try {
            // Initialize
            execSync('git init', { cwd: repoPath, stdio: 'ignore' });
            execSync('git config user.email "test@test.com"', { cwd: repoPath, stdio: 'ignore' });
            execSync('git config user.name "Test User"', { cwd: repoPath, stdio: 'ignore' });

            // Create main branch history
            await fs.writeFile(path.join(repoPath, 'main.txt'), 'Main content');
            execSync('git add . && git commit -m "Main commit"', { cwd: repoPath, stdio: 'ignore' });

            // Create feature branch
            execSync('git checkout -b feature', { cwd: repoPath, stdio: 'ignore' });
            await fs.writeFile(path.join(repoPath, 'feature.txt'), 'Feature content');
            execSync('git add . && git commit -m "Feature commit"', { cwd: repoPath, stdio: 'ignore' });

            // Merge back to main
            execSync('git checkout main', { cwd: repoPath, stdio: 'ignore' });
            execSync('git merge feature -m "Merge feature branch"', { cwd: repoPath, stdio: 'ignore' });

            return repoPath;
        } catch (error) {
            await this.cleanup(repoPath);
            throw error;
        }
    }

    /**
     * Cleanup a test repository
     */
    static async cleanup(repoPath: string): Promise<void> {
        try {
            await fs.rm(repoPath, { recursive: true, force: true });
        } catch (error) {
            // Ignore cleanup errors
        }
    }

    /**
     * Cleanup all test repositories
     */
    static async cleanupAll(): Promise<void> {
        try {
            await fs.rm(this.tmpDir, { recursive: true, force: true });
        } catch (error) {
            // Ignore cleanup errors
        }
    }

    /**
     * Get a non-existent repository path for error testing
     */
    static getNonExistentRepoPath(): string {
        return '/non/existent/repo/path';
    }

    /**
     * Create an empty directory (not a git repo) for error testing
     */
    static async createNonGitDirectory(): Promise<string> {
        const dirPath = path.join(this.tmpDir, `non-git-${Date.now()}`);
        await fs.mkdir(dirPath, { recursive: true });
        return dirPath;
    }

    /**
     * Create temporary directory for testing
     */
    static async createTempDirectory(): Promise<string> {
        const dirPath = path.join(this.tmpDir, `temp-${Date.now()}`);
        await fs.mkdir(dirPath, { recursive: true });
        return dirPath;
    }

    /**
     * Create repository with corrupted .git directory
     */
    static async createCorruptedRepo(): Promise<string> {
        const repoPath = path.join(this.tmpDir, `corrupted-repo-${Date.now()}`);
        await fs.mkdir(repoPath, { recursive: true });

        try {
            // Initialize valid repo
            execSync('git init', { cwd: repoPath, stdio: 'ignore' });
            execSync('git config user.email "test@test.com"', { cwd: repoPath, stdio: 'ignore' });
            execSync('git config user.name "Test User"', { cwd: repoPath, stdio: 'ignore' });

            // Create initial commit
            await fs.writeFile(path.join(repoPath, 'file.txt'), 'content');
            execSync('git add . && git commit -m "Initial"', { cwd: repoPath, stdio: 'ignore' });

            // Corrupt the .git/objects directory
            const objectsDir = path.join(repoPath, '.git', 'objects');
            await fs.rm(objectsDir, { recursive: true, force: true });
            await fs.mkdir(objectsDir, { recursive: true });

            return repoPath;
        } catch (error) {
            await this.cleanup(repoPath);
            throw error;
        }
    }

    /**
     * Corrupt commit data in a repository
     */
    static async corruptCommitData(repoPath: string): Promise<void> {
        try {
            // Corrupt the HEAD file
            const headPath = path.join(repoPath, '.git', 'HEAD');
            await fs.writeFile(headPath, 'corrupted data');
        } catch (error) {
            // Ignore if cannot corrupt
        }
    }

    /**
     * Create repository with partial/problematic data
     */
    static async createPartialDataRepo(): Promise<string> {
        const repoPath = path.join(this.tmpDir, `partial-repo-${Date.now()}`);
        await fs.mkdir(repoPath, { recursive: true });

        try {
            // Initialize repo
            execSync('git init', { cwd: repoPath, stdio: 'ignore' });
            execSync('git config user.email "test@test.com"', { cwd: repoPath, stdio: 'ignore' });
            execSync('git config user.name "Test User"', { cwd: repoPath, stdio: 'ignore' });

            // Create some valid commits
            for (let i = 0; i < 3; i++) {
                await fs.writeFile(path.join(repoPath, `file${i}.txt`), `content ${i}`);
                execSync('git add . && git commit -m "Commit ' + i + '"', { cwd: repoPath, stdio: 'ignore' });
            }

            // Repository is valid but represents "partial data" scenario
            // (e.g., some events might be missing metadata in real scenarios)
            return repoPath;
        } catch (error) {
            await this.cleanup(repoPath);
            throw error;
        }
    }

    /**
     * Create repository in detached HEAD state
     */
    static async createDetachedHeadRepo(): Promise<string> {
        const repoPath = path.join(this.tmpDir, `detached-repo-${Date.now()}`);
        await fs.mkdir(repoPath, { recursive: true });

        try {
            // Initialize repo
            execSync('git init', { cwd: repoPath, stdio: 'ignore' });
            execSync('git config user.email "test@test.com"', { cwd: repoPath, stdio: 'ignore' });
            execSync('git config user.name "Test User"', { cwd: repoPath, stdio: 'ignore' });

            // Create commits
            for (let i = 0; i < 3; i++) {
                await fs.writeFile(path.join(repoPath, `file${i}.txt`), `content ${i}`);
                execSync('git add . && git commit -m "Commit ' + i + '"', { cwd: repoPath, stdio: 'ignore' });
            }

            // Get first commit hash and checkout detached HEAD
            const firstCommit = execSync('git rev-list --max-parents=0 HEAD', {
                cwd: repoPath,
                encoding: 'utf-8'
            }).trim();

            execSync(`git checkout ${firstCommit}`, { cwd: repoPath, stdio: 'ignore' });

            return repoPath;
        } catch (error) {
            await this.cleanup(repoPath);
            throw error;
        }
    }
}
