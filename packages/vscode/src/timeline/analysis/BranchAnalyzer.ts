/**
 * BranchAnalyzer - Branch Creation and Relationship Mapping
 *
 * ARCHITECTURE NOTE: This analyzer processes branch creation events from GitEventRepository
 * and maps them to their creation points in the commit graph.
 *
 * KEY IMPROVEMENT: Uses reflog-based branch creation dates, not last commit dates!
 * This solves the branch positioning issue where branch circles appeared right of commits.
 *
 * Next phase: ConnectionMapper will convert these relationships to visual connections.
 */

import {
    GitEvent,
    GitEventRelationship,
    BranchAnalysisResult,
    GitAnalysisError,
    RelationshipMetadata
} from '../domain/git-event.types';

/**
 * Configuration for branch analysis
 */
export interface BranchAnalysisConfig {
    excludeMainBranches: string[];    // Branches to exclude from analysis
    maxBranchAge: number;             // Days - ignore very old branches
    includeRemoteBranches: boolean;   // Analyze remote branch relationships
    generateLifespanAnalysis: boolean; // Calculate branch lifespans
}

export const DEFAULT_BRANCH_CONFIG: BranchAnalysisConfig = {
    excludeMainBranches: ['main', 'master', 'develop'],
    maxBranchAge: 365, // 1 year
    includeRemoteBranches: false,
    generateLifespanAnalysis: true
};

/**
 * Information about a branch's lifecycle
 */
interface BranchLifecycle {
    branchName: string;
    creationEvent: GitEvent;
    creationPoint: GitEvent | null;  // The commit the branch was created from
    firstCommit: GitEvent | null;    // First commit on the branch
    mergeEvent: GitEvent | null;     // Where the branch was merged (if any)
    lifespan: number;                // Days from creation to merge/last activity
    commitCount: number;
    authors: string[];
    isActive: boolean;               // Still has recent activity
}

/**
 * Analyzer for git branch relationships and lifecycles
 */
export class BranchAnalyzer {
    private readonly config: BranchAnalysisConfig;
    private eventMap: Map<string, GitEvent> = new Map();
    private branchEvents: Map<string, GitEvent> = new Map(); // branch name -> creation event
    private commitsByBranch: Map<string, GitEvent[]> = new Map();

    constructor(config: Partial<BranchAnalysisConfig> = {}) {
        this.config = { ...DEFAULT_BRANCH_CONFIG, ...config };
    }

    /**
     * Analyzes branch relationships for a collection of git events
     */
    analyzeBranchRelationships(events: GitEvent[]): GitEventRelationship[] {
        console.log(`BranchAnalyzer: Analyzing ${events.length} events for branch relationships...`);

        this.initializeAnalysis(events);

        // Build branch creation relationships
        const creationRelationships = this.buildBranchCreationRelationships();

        // Build branch merge relationships
        const mergeRelationships = this.buildBranchMergeRelationships();

        // Build first commit relationships
        const firstCommitRelationships = this.buildFirstCommitRelationships();

        const allRelationships = [
            ...creationRelationships,
            ...mergeRelationships,
            ...firstCommitRelationships
        ];

        console.log(`BranchAnalyzer: Found ${allRelationships.length} branch relationships`);
        console.log(`  - ${creationRelationships.length} branch creations`);
        console.log(`  - ${mergeRelationships.length} branch merges`);
        console.log(`  - ${firstCommitRelationships.length} first commits`);

        return allRelationships;
    }

    /**
     * Analyzes branch lifecycles in detail
     */
    analyzeBranchLifecycles(events: GitEvent[]): BranchAnalysisResult[] {
        this.initializeAnalysis(events);

        const results: BranchAnalysisResult[] = [];

        for (const [branchName, creationEvent] of this.branchEvents) {
            if (this.shouldAnalyzeBranch(branchName)) {
                try {
                    const lifecycle = this.analyzeBranchLifecycle(branchName, creationEvent);
                    if (lifecycle) {
                        const result: BranchAnalysisResult = {
                            branchName: lifecycle.branchName,
                            creationEvent: lifecycle.creationEvent,
                            creationPoint: lifecycle.creationPoint!,
                            lifespan: lifecycle.lifespan,
                            commitCount: lifecycle.commitCount,
                            authors: lifecycle.authors
                        };
                        results.push(result);
                    }
                } catch (error) {
                    console.warn(`BranchAnalyzer: Failed to analyze branch ${branchName}:`, error);
                }
            }
        }

        return results;
    }

    /**
     * Initializes analysis by organizing events
     */
    private initializeAnalysis(events: GitEvent[]): void {
        this.eventMap.clear();
        this.branchEvents.clear();
        this.commitsByBranch.clear();

        // Build event lookup map
        for (const event of events) {
            this.eventMap.set(event.id, event);

            // Collect branch creation events
            if (event.type === 'branch-created') {
                this.branchEvents.set(event.branch, event);
            }

            // Group commits by branch
            if (event.type === 'commit' || event.type === 'merge') {
                if (!this.commitsByBranch.has(event.branch)) {
                    this.commitsByBranch.set(event.branch, []);
                }
                this.commitsByBranch.get(event.branch)!.push(event);
            }
        }

        // Sort commits by date for each branch
        for (const commits of this.commitsByBranch.values()) {
            commits.sort((a, b) => a.date.getTime() - b.date.getTime());
        }
    }

    /**
     * Builds branch creation relationships (branch -> creation point)
     */
    private buildBranchCreationRelationships(): GitEventRelationship[] {
        const relationships: GitEventRelationship[] = [];

        for (const [branchName, creationEvent] of this.branchEvents) {
            const creationPoint = this.findBranchCreationPoint(branchName, creationEvent);

            if (creationPoint) {
                const relationship: GitEventRelationship = {
                    id: `branch-creation-${creationPoint.id}-${creationEvent.id}`,
                    sourceEventId: creationPoint.id,
                    targetEventId: creationEvent.id,
                    type: 'branch-creation',
                    metadata: this.generateBranchCreationMetadata(creationPoint, creationEvent, branchName)
                };

                relationships.push(relationship);
            }
        }

        return relationships;
    }

    /**
     * Builds branch merge relationships (branch -> merge point)
     */
    private buildBranchMergeRelationships(): GitEventRelationship[] {
        const relationships: GitEventRelationship[] = [];

        for (const [branchName, creationEvent] of this.branchEvents) {
            const mergeEvent = this.findBranchMergePoint(branchName);

            if (mergeEvent) {
                const relationship: GitEventRelationship = {
                    id: `branch-merge-${creationEvent.id}-${mergeEvent.id}`,
                    sourceEventId: creationEvent.id,
                    targetEventId: mergeEvent.id,
                    type: 'merge-source', // This branch was merged
                    metadata: this.generateBranchMergeMetadata(creationEvent, mergeEvent, branchName)
                };

                relationships.push(relationship);
            }
        }

        return relationships;
    }

    /**
     * Builds first commit relationships (branch creation -> first commit)
     */
    private buildFirstCommitRelationships(): GitEventRelationship[] {
        const relationships: GitEventRelationship[] = [];

        for (const [branchName, creationEvent] of this.branchEvents) {
            const firstCommit = this.findFirstCommitOnBranch(branchName);

            if (firstCommit) {
                const relationship: GitEventRelationship = {
                    id: `first-commit-${creationEvent.id}-${firstCommit.id}`,
                    sourceEventId: creationEvent.id,
                    targetEventId: firstCommit.id,
                    type: 'branch-creation', // Branch leads to first commit
                    metadata: this.generateFirstCommitMetadata(creationEvent, firstCommit, branchName)
                };

                relationships.push(relationship);
            }
        }

        return relationships;
    }

    /**
     * Finds the commit point where a branch was created from
     */
    private findBranchCreationPoint(branchName: string, creationEvent: GitEvent): GitEvent | null {
        // Strategy: Find the commit closest in time before the branch creation
        // that could be the parent commit

        const creationTime = creationEvent.date.getTime();
        const candidates: Array<{ event: GitEvent; timeDiff: number }> = [];

        // Look for commits on other branches that happened just before this branch creation
        for (const event of this.eventMap.values()) {
            if ((event.type === 'commit' || event.type === 'merge') &&
                event.branch !== branchName &&
                event.date.getTime() <= creationTime) {

                const timeDiff = creationTime - event.date.getTime();

                // Only consider commits within a reasonable time window (24 hours)
                if (timeDiff <= 24 * 60 * 60 * 1000) {
                    candidates.push({ event, timeDiff });
                }
            }
        }

        // Return the closest commit in time
        if (candidates.length > 0) {
            candidates.sort((a, b) => a.timeDiff - b.timeDiff);
            return candidates[0].event;
        }

        return null;
    }

    /**
     * Finds where a branch was merged (if it was merged)
     */
    private findBranchMergePoint(branchName: string): GitEvent | null {
        // Look for merge commits that mention this branch or have timing that suggests a merge
        for (const event of this.eventMap.values()) {
            if (event.type === 'merge') {
                // Check if merge commit message mentions the branch
                if (event.title.toLowerCase().includes(branchName.toLowerCase())) {
                    return event;
                }

                // Check if this merge happened after the branch had commits
                const branchCommits = this.commitsByBranch.get(branchName) || [];
                if (branchCommits.length > 0) {
                    const lastBranchCommit = branchCommits[branchCommits.length - 1];
                    const mergeTime = event.date.getTime();
                    const lastCommitTime = lastBranchCommit.date.getTime();

                    // Merge should be after the last commit on the branch
                    if (mergeTime > lastCommitTime &&
                        mergeTime - lastCommitTime <= 7 * 24 * 60 * 60 * 1000) { // Within 7 days
                        return event;
                    }
                }
            }
        }

        return null;
    }

    /**
     * Finds the first commit made on a branch after its creation
     */
    private findFirstCommitOnBranch(branchName: string): GitEvent | null {
        const branchCommits = this.commitsByBranch.get(branchName);

        if (branchCommits && branchCommits.length > 0) {
            const creationEvent = this.branchEvents.get(branchName);
            if (creationEvent) {
                // Find first commit after branch creation
                const creationTime = creationEvent.date.getTime();
                for (const commit of branchCommits) {
                    if (commit.date.getTime() > creationTime) {
                        return commit;
                    }
                }
            }

            // Fallback to first commit chronologically
            return branchCommits[0];
        }

        return null;
    }

    /**
     * Analyzes the complete lifecycle of a branch
     */
    private analyzeBranchLifecycle(branchName: string, creationEvent: GitEvent): BranchLifecycle | null {
        const creationPoint = this.findBranchCreationPoint(branchName, creationEvent);
        const firstCommit = this.findFirstCommitOnBranch(branchName);
        const mergeEvent = this.findBranchMergePoint(branchName);

        const branchCommits = this.commitsByBranch.get(branchName) || [];
        const authors = [...new Set(branchCommits.map(c => c.author))];

        // Calculate lifespan
        let lifespan = 0;
        if (mergeEvent) {
            lifespan = Math.round((mergeEvent.date.getTime() - creationEvent.date.getTime()) / (1000 * 60 * 60 * 24));
        } else if (branchCommits.length > 0) {
            const lastCommit = branchCommits[branchCommits.length - 1];
            lifespan = Math.round((lastCommit.date.getTime() - creationEvent.date.getTime()) / (1000 * 60 * 60 * 24));
        }

        // Determine if branch is still active (has commits in last 30 days)
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const isActive = branchCommits.some(c => c.date.getTime() > thirtyDaysAgo);

        return {
            branchName,
            creationEvent,
            creationPoint,
            firstCommit,
            mergeEvent,
            lifespan,
            commitCount: branchCommits.length,
            authors,
            isActive
        };
    }

    /**
     * Determines if a branch should be analyzed
     */
    private shouldAnalyzeBranch(branchName: string): boolean {
        // Skip main branches if configured
        if (this.config.excludeMainBranches.includes(branchName)) {
            return false;
        }

        // Skip remote branches if not configured to include them
        if (!this.config.includeRemoteBranches && branchName.startsWith('origin/')) {
            return false;
        }

        return true;
    }

    /**
     * Generates metadata for branch creation relationships
     */
    private generateBranchCreationMetadata(
        creationPoint: GitEvent,
        creationEvent: GitEvent,
        branchName: string
    ): RelationshipMetadata {
        return {
            visualStyle: 'dashed',
            color: '#8b5cf6', // Purple for branch creation
            opacity: 0.5,
            description: `Branch '${branchName}' created from ${creationPoint.title.substring(0, 30)}...`
        };
    }

    /**
     * Generates metadata for branch merge relationships
     */
    private generateBranchMergeMetadata(
        creationEvent: GitEvent,
        mergeEvent: GitEvent,
        branchName: string
    ): RelationshipMetadata {
        return {
            visualStyle: 'solid',
            color: '#10b981', // Green for successful merge
            opacity: 0.7,
            description: `Branch '${branchName}' merged`
        };
    }

    /**
     * Generates metadata for first commit relationships
     */
    private generateFirstCommitMetadata(
        creationEvent: GitEvent,
        firstCommit: GitEvent,
        branchName: string
    ): RelationshipMetadata {
        return {
            visualStyle: 'dotted',
            color: '#f59e0b', // Amber for first commit
            opacity: 0.4,
            description: `First commit on '${branchName}': ${firstCommit.title.substring(0, 30)}...`
        };
    }

    /**
     * Gets statistics about branch analysis
     */
    getBranchStatistics(): {
        totalBranches: number;
        activeBranches: number;
        mergedBranches: number;
        averageLifespan: number;
        branchesWithCreationPoint: number;
    } {
        let activeBranches = 0;
        let mergedBranches = 0;
        let totalLifespan = 0;
        let branchesWithCreationPoint = 0;
        let branchesWithLifespan = 0;

        for (const [branchName, creationEvent] of this.branchEvents) {
            if (this.shouldAnalyzeBranch(branchName)) {
                const lifecycle = this.analyzeBranchLifecycle(branchName, creationEvent);
                if (lifecycle) {
                    if (lifecycle.isActive) activeBranches++;
                    if (lifecycle.mergeEvent) mergedBranches++;
                    if (lifecycle.creationPoint) branchesWithCreationPoint++;
                    if (lifecycle.lifespan > 0) {
                        totalLifespan += lifecycle.lifespan;
                        branchesWithLifespan++;
                    }
                }
            }
        }

        return {
            totalBranches: this.branchEvents.size,
            activeBranches,
            mergedBranches,
            averageLifespan: branchesWithLifespan > 0 ? Math.round(totalLifespan / branchesWithLifespan) : 0,
            branchesWithCreationPoint
        };
    }
}