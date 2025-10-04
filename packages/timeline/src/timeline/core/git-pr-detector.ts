/**
 * Git-Based Pull Request Detection System
 *
 * Analyzes Git commit history to detect synthetic PR events without requiring
 * GitHub API integration. Provides visual connection lines and PR insights
 * based purely on Git commit patterns and branch relationships.
 */

import { GitCommit, GitBranch } from '../../utils/git-project-manager';
import { TimelineEvent } from './timeline-types';

// ===== INTERFACES & TYPES =====

/**
 * Represents different types of merge patterns found in commit messages
 */
export interface MergePattern {
    readonly name: string;
    readonly regex: RegExp;
    readonly sourceBranchGroup: number;  // Regex group containing source branch
    readonly prNumberGroup?: number;     // Regex group containing PR number
    readonly platform: 'github' | 'gitlab' | 'bitbucket' | 'azure' | 'generic';
}

/**
 * Result of analyzing a commit message for PR merge patterns
 */
export interface MergePatternResult {
    readonly pattern: MergePattern;
    readonly prNumber?: string;
    readonly sourceBranch?: string;
    readonly targetBranch?: string;
    readonly mergeType: 'merge' | 'squash' | 'rebase';
    readonly confidence: number;  // 0-1 confidence score
}

/**
 * Information about a branch and its relationship to a merge
 */
export interface BranchInfo {
    readonly name: string;
    readonly creationDate: Date;
    readonly author: string;
    readonly lastCommit: string;
    readonly isFeatureBranch: boolean;
    readonly estimatedCommitCount: number;
}

/**
 * Comprehensive information about a detected PR merge
 */
export interface MergeInfo {
    readonly mergeCommit: GitCommit;
    readonly patternResult: MergePatternResult;
    readonly sourceBranch?: BranchInfo;
    readonly targetBranch: string;
    readonly estimatedDuration: number;  // Days from branch creation to merge
    readonly impact: number;             // Calculated impact score
    readonly commitCount: number;        // Estimated commits in the PR
}

/**
 * Configuration for PR detection behavior
 */
export interface PRDetectionConfig {
    readonly maxPRAge: number;           // Days - how far back to look
    readonly minConfidence: number;      // 0-1 - minimum confidence to include
    readonly includeDirectMerges: boolean;  // Include branch merges without PR numbers
    readonly featureBranchPatterns: RegExp[];  // Patterns that indicate feature branches
}

// ===== DEFAULT CONFIGURATIONS =====

export const DEFAULT_MERGE_PATTERNS: MergePattern[] = [
    // GitHub patterns
    {
        name: 'GitHub Standard',
        regex: /Merge pull request #(\d+) from ([\w\-\/]+)/i,
        sourceBranchGroup: 2,
        prNumberGroup: 1,
        platform: 'github'
    },
    {
        name: 'GitHub Squash',
        regex: /^(.+) \(#(\d+)\)$/i,
        sourceBranchGroup: 0,  // Will be derived from branch analysis
        prNumberGroup: 2,
        platform: 'github'
    },
    // GitLab patterns
    {
        name: 'GitLab Merge Request',
        regex: /Merge branch '([\w\-\/]+)' into '([\w\-\/]+)'/i,
        sourceBranchGroup: 1,
        prNumberGroup: 0,
        platform: 'gitlab'
    },
    // Azure DevOps patterns
    {
        name: 'Azure DevOps',
        regex: /Merged PR (\d+): .+ from ([\w\-\/]+)/i,
        sourceBranchGroup: 2,
        prNumberGroup: 1,
        platform: 'azure'
    },
    // Generic merge patterns
    {
        name: 'Generic Branch Merge',
        regex: /Merge branch '([\w\-\/]+)'/i,
        sourceBranchGroup: 1,
        platform: 'generic'
    }
];

export const DEFAULT_FEATURE_BRANCH_PATTERNS: RegExp[] = [
    /^feature\/.+/i,
    /^feat\/.+/i,
    /^fix\/.+/i,
    /^hotfix\/.+/i,
    /^bugfix\/.+/i,
    /^\d+-[\w\-]+/i,        // ticket-description
    /^[a-zA-Z]+\/[\w\-]+/i, // author/feature-name
    /^develop$/i,
    /^staging$/i
];

export const DEFAULT_PR_DETECTION_CONFIG: PRDetectionConfig = {
    maxPRAge: 180,  // 6 months
    minConfidence: 0.6,
    includeDirectMerges: true,
    featureBranchPatterns: DEFAULT_FEATURE_BRANCH_PATTERNS
};

// ===== IMPLEMENTATION CLASSES =====

/**
 * Analyzes commit messages to detect PR merge patterns
 *
 * Supports multiple platforms (GitHub, GitLab, Azure DevOps) and merge types
 * (merge commits, squash merges, rebase merges). Provides confidence scoring
 * to help filter out false positives.
 */
export class PRMergePatternAnalyzer {
    private readonly patterns: MergePattern[];

    constructor(patterns: MergePattern[] = DEFAULT_MERGE_PATTERNS) {
        this.patterns = patterns;
    }

    /**
     * Analyzes a commit message to detect PR merge patterns
     *
     * @param commit The Git commit to analyze
     * @returns MergePatternResult if a pattern is detected, null otherwise
     */
    public analyzeMergeCommit(commit: GitCommit): MergePatternResult | null {
        const message = commit.message.trim();
        const firstLine = message.split('\n')[0];

        // Try each pattern in order of specificity
        for (const pattern of this.patterns) {
            const match = firstLine.match(pattern.regex);
            if (match) {
                const result = this.extractPatternData(pattern, match, commit);
                if (result && result.confidence >= 0.5) {  // Minimum threshold
                    return result;
                }
            }
        }

        // Check for generic merge commit indicators
        if (this.isMergeCommit(commit)) {
            return this.createGenericMergeResult(commit);
        }

        return null;
    }

    /**
     * Extracts structured data from a successful pattern match
     */
    private extractPatternData(
        pattern: MergePattern,
        match: RegExpMatchArray,
        commit: GitCommit
    ): MergePatternResult | null {
        try {
            const sourceBranch = pattern.sourceBranchGroup > 0 ?
                match[pattern.sourceBranchGroup]?.trim() : undefined;

            const prNumber = pattern.prNumberGroup ?
                match[pattern.prNumberGroup]?.trim() : undefined;

            // Determine merge type from commit properties and message
            const mergeType = this.determineMergeType(commit, pattern);

            // Calculate confidence based on pattern specificity and commit properties
            const confidence = this.calculateConfidence(pattern, match, commit, sourceBranch);

            return {
                pattern,
                prNumber,
                sourceBranch,
                targetBranch: commit.branch,
                mergeType,
                confidence
            };
        } catch (error) {
            console.warn('Error extracting pattern data:', error);
            return null;
        }
    }

    /**
     * Determines the type of merge based on commit properties and pattern
     */
    private determineMergeType(commit: GitCommit, pattern: MergePattern): 'merge' | 'squash' | 'rebase' {
        const message = commit.message.toLowerCase();

        // Squash merge indicators
        if (message.includes('squash') || pattern.name.includes('Squash')) {
            return 'squash';
        }

        // Rebase merge indicators
        if (message.includes('rebase') || pattern.name.includes('Rebase')) {
            return 'rebase';
        }

        // Check if this looks like a merge commit (multiple parents would be ideal, but we don't have that data)
        if (message.startsWith('merge ') || message.includes('merged')) {
            return 'merge';
        }

        // Default to merge for explicit merge patterns
        return 'merge';
    }

    /**
     * Calculates confidence score for a pattern match
     */
    private calculateConfidence(
        pattern: MergePattern,
        match: RegExpMatchArray,
        commit: GitCommit,
        sourceBranch?: string
    ): number {
        let confidence = 0.5;  // Base confidence

        // Platform-specific patterns get higher confidence
        if (pattern.platform !== 'generic') {
            confidence += 0.2;
        }

        // PR number presence increases confidence
        if (pattern.prNumberGroup && match[pattern.prNumberGroup]) {
            confidence += 0.2;
        }

        // Valid source branch name increases confidence
        if (sourceBranch && this.isValidBranchName(sourceBranch)) {
            confidence += 0.1;
        }

        // Feature branch patterns increase confidence
        if (sourceBranch && this.looksLikeFeatureBranch(sourceBranch)) {
            confidence += 0.1;
        }

        // Multiple files changed suggests a real merge
        if (commit.filesChanged > 1) {
            confidence += 0.05;
        }

        // Significant line changes suggest a real merge
        if ((commit.insertions + commit.deletions) > 10) {
            confidence += 0.05;
        }

        return Math.min(confidence, 1.0);
    }

    /**
     * Checks if this appears to be a merge commit based on commit properties
     */
    private isMergeCommit(commit: GitCommit): boolean {
        const message = commit.message.toLowerCase();
        const indicators = [
            'merge', 'merged', 'merging',
            'pull request', 'merge request',
            'into main', 'into master', 'into develop'
        ];

        return indicators.some(indicator => message.includes(indicator));
    }

    /**
     * Creates a generic merge result for commits that look like merges but don't match specific patterns
     */
    private createGenericMergeResult(commit: GitCommit): MergePatternResult {
        return {
            pattern: {
                name: 'Generic Merge',
                regex: /merge/i,
                sourceBranchGroup: 0,
                platform: 'generic'
            },
            mergeType: 'merge',
            targetBranch: commit.branch,
            confidence: 0.3  // Lower confidence for generic matches
        };
    }

    /**
     * Validates that a string looks like a reasonable branch name
     */
    private isValidBranchName(branchName: string): boolean {
        // Basic validation: not empty, reasonable length, valid characters
        return branchName.length > 0 &&
               branchName.length <= 250 &&
               /^[\w\-\/\.]+$/.test(branchName) &&
               !branchName.includes('..') &&
               !branchName.startsWith('/') &&
               !branchName.endsWith('/');
    }

    /**
     * Determines if a branch name follows feature branch conventions
     */
    private looksLikeFeatureBranch(branchName: string): boolean {
        return DEFAULT_FEATURE_BRANCH_PATTERNS.some(pattern => pattern.test(branchName));
    }

    /**
     * Gets all supported patterns for debugging/configuration
     */
    public getSupportedPatterns(): MergePattern[] {
        return [...this.patterns];
    }
}

/**
 * Analyzes branch relationships and estimates PR properties
 *
 * Correlates merge commits with branch creation times, estimates PR durations,
 * calculates impact scores, and provides insights into development patterns.
 */
export class BranchRelationshipAnalyzer {
    private readonly config: PRDetectionConfig;
    private readonly branchIndex: Map<string, BranchInfo>;

    constructor(config: PRDetectionConfig = DEFAULT_PR_DETECTION_CONFIG) {
        this.config = config;
        this.branchIndex = new Map();
    }

    /**
     * Indexes all branches for efficient lookup during analysis
     *
     * @param branches Array of Git branches to index
     */
    public indexBranches(branches: GitBranch[]): void {
        this.branchIndex.clear();

        for (const branch of branches) {
            if (!branch.isRemote) {  // Focus on local branches
                const branchInfo: BranchInfo = {
                    name: branch.name,
                    creationDate: branch.date,
                    author: branch.author,
                    lastCommit: branch.lastCommit,
                    isFeatureBranch: this.isFeatureBranch(branch.name),
                    estimatedCommitCount: 0  // Will be calculated during PR analysis
                };

                this.branchIndex.set(branch.name, branchInfo);
            }
        }

        console.log(`BranchAnalyzer: Indexed ${this.branchIndex.size} local branches`);
    }

    /**
     * Finds the most likely source branch for a merge commit
     *
     * @param mergeCommit The merge commit to analyze
     * @param patternResult The pattern match result (may contain branch hints)
     * @returns BranchInfo if found, undefined otherwise
     */
    public findSourceBranch(
        mergeCommit: GitCommit,
        patternResult: MergePatternResult
    ): BranchInfo | undefined {
        // If pattern extraction provided a branch name, try that first
        if (patternResult.sourceBranch) {
            const explicitBranch = this.branchIndex.get(patternResult.sourceBranch);
            if (explicitBranch && this.isValidSourceBranch(explicitBranch, mergeCommit)) {
                return explicitBranch;
            }
        }

        // Find candidate branches based on timing and characteristics
        const candidates = this.findCandidateSourceBranches(mergeCommit);

        // Score and rank candidates
        const scoredCandidates = candidates.map(branch => ({
            branch,
            score: this.scoreBranchCandidate(branch, mergeCommit, patternResult)
        }));

        // Sort by score and return the best match
        scoredCandidates.sort((a, b) => b.score - a.score);

        const bestCandidate = scoredCandidates[0];
        return bestCandidate && bestCandidate.score > 0.5 ? bestCandidate.branch : undefined;
    }

    /**
     * Estimates the duration of a PR based on branch creation and merge timing
     *
     * @param sourceBranch The source branch information
     * @param mergeDate The date the merge occurred
     * @returns Duration in days
     */
    public estimatePRDuration(sourceBranch: BranchInfo, mergeDate: Date): number {
        const creationDate = sourceBranch.creationDate;
        const durationMs = mergeDate.getTime() - creationDate.getTime();
        const durationDays = Math.max(0, Math.round(durationMs / (1000 * 60 * 60 * 24)));

        // Cap at reasonable maximum (avoid outliers from very old branches)
        return Math.min(durationDays, this.config.maxPRAge);
    }

    /**
     * Calculates an impact score for a PR based on commits and changes
     *
     * @param mergeCommit The merge commit
     * @param sourceBranch Source branch information (optional)
     * @param commits All commits (for additional analysis)
     * @returns Impact score from 0-100
     */
    public calculatePRImpact(
        mergeCommit: GitCommit,
        sourceBranch?: BranchInfo,
        commits: GitCommit[] = []
    ): number {
        let impact = 0;

        // Base impact from merge commit
        impact += Math.min(mergeCommit.filesChanged * 5, 30);
        impact += Math.min((mergeCommit.insertions + mergeCommit.deletions) / 10, 20);

        // Estimate impact from related commits on the source branch
        if (sourceBranch) {
            const relatedCommits = this.findRelatedCommits(sourceBranch, mergeCommit, commits);
            impact += Math.min(relatedCommits.length * 3, 25);

            // Additional impact for feature branches (typically more significant)
            if (sourceBranch.isFeatureBranch) {
                impact += 10;
            }
        }

        // Bonus for complex merge messages (indicating significant work)
        if (mergeCommit.message.length > 100) {
            impact += 5;
        }

        // Cap at maximum
        return Math.min(Math.round(impact), 100);
    }

    /**
     * Gets comprehensive statistics about branch patterns
     */
    public getBranchStatistics(): {
        totalBranches: number;
        featureBranches: number;
        averageBranchAge: number;
        branchPatterns: Record<string, number>;
    } {
        const branches = Array.from(this.branchIndex.values());
        const now = new Date();

        const featureBranches = branches.filter(b => b.isFeatureBranch).length;

        const branchAges = branches.map(b =>
            (now.getTime() - b.creationDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const averageBranchAge = branchAges.length > 0 ?
            branchAges.reduce((sum, age) => sum + age, 0) / branchAges.length : 0;

        // Analyze branch naming patterns
        const patterns: Record<string, number> = {};
        for (const branch of branches) {
            const pattern = this.classifyBranchPattern(branch.name);
            patterns[pattern] = (patterns[pattern] || 0) + 1;
        }

        return {
            totalBranches: branches.length,
            featureBranches,
            averageBranchAge: Math.round(averageBranchAge),
            branchPatterns: patterns
        };
    }

    // ===== PRIVATE HELPER METHODS =====

    /**
     * Determines if a branch name follows feature branch conventions
     */
    private isFeatureBranch(branchName: string): boolean {
        return this.config.featureBranchPatterns.some(pattern => pattern.test(branchName));
    }

    /**
     * Validates that a branch could be a valid source for a merge
     */
    private isValidSourceBranch(branch: BranchInfo, mergeCommit: GitCommit): boolean {
        // Branch should have been created before the merge
        if (branch.creationDate >= new Date(mergeCommit.date)) {
            return false;
        }

        // Branch shouldn't be too old
        const daysSinceCreation = (new Date(mergeCommit.date).getTime() - branch.creationDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation > this.config.maxPRAge) {
            return false;
        }

        return true;
    }

    /**
     * Finds candidate source branches for a merge commit
     */
    private findCandidateSourceBranches(mergeCommit: GitCommit): BranchInfo[] {
        const mergeDate = new Date(mergeCommit.date);
        const candidates: BranchInfo[] = [];

        for (const branch of this.branchIndex.values()) {
            if (this.isValidSourceBranch(branch, mergeCommit)) {
                candidates.push(branch);
            }
        }

        return candidates;
    }

    /**
     * Scores a branch as a candidate source for a merge
     */
    private scoreBranchCandidate(
        branch: BranchInfo,
        mergeCommit: GitCommit,
        patternResult: MergePatternResult
    ): number {
        let score = 0;

        // Feature branches are more likely to be PR sources
        if (branch.isFeatureBranch) {
            score += 0.3;
        }

        // Prefer branches created by the same author
        if (branch.author === mergeCommit.author) {
            score += 0.2;
        }

        // Prefer more recent branches (within reason)
        const daysSinceCreation = (new Date(mergeCommit.date).getTime() - branch.creationDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation <= 30) {
            score += 0.2;
        } else if (daysSinceCreation <= 90) {
            score += 0.1;
        }

        // Exact name match from pattern gets high score
        if (patternResult.sourceBranch === branch.name) {
            score += 0.4;
        }

        return Math.min(score, 1.0);
    }

    /**
     * Finds commits that are likely related to a source branch
     */
    private findRelatedCommits(
        sourceBranch: BranchInfo,
        mergeCommit: GitCommit,
        allCommits: GitCommit[]
    ): GitCommit[] {
        // This is a simplified implementation - in a real scenario we'd use git graph analysis
        return allCommits.filter(commit =>
            commit.author === sourceBranch.author &&
            commit.date >= sourceBranch.creationDate &&
            commit.date <= mergeCommit.date &&
            commit.hash !== mergeCommit.hash
        );
    }

    /**
     * Classifies a branch name into a pattern category
     */
    private classifyBranchPattern(branchName: string): string {
        if (/^feature\//.test(branchName)) return 'feature/*';
        if (/^fix\/|^bugfix\/|^hotfix\//.test(branchName)) return 'fix/*';
        if (/^\d+/.test(branchName)) return 'ticket-*';
        if (/^[a-zA-Z]+\//.test(branchName)) return 'author/*';
        if (/^(main|master|develop|staging)$/.test(branchName)) return 'main-branch';
        return 'other';
    }
}

/**
 * Generates synthetic timeline events from merge analysis results
 *
 * Creates properly formatted TimelineEvent objects that integrate seamlessly
 * with the existing timeline visualization system. Handles metadata required
 * for connection drawing and provides meaningful event descriptions.
 */
export class SyntheticEventGenerator {
    private readonly config: PRDetectionConfig;
    private eventCounter: number = 0;

    constructor(config: PRDetectionConfig = DEFAULT_PR_DETECTION_CONFIG) {
        this.config = config;
    }

    /**
     * Creates a synthetic PR event from merge analysis
     *
     * @param mergeInfo Complete information about the detected merge
     * @returns TimelineEvent representing the synthetic PR
     */
    public createPREvent(mergeInfo: MergeInfo): TimelineEvent {
        const { mergeCommit, patternResult, sourceBranch, estimatedDuration, impact } = mergeInfo;

        // Generate unique ID for the synthetic PR
        const prId = this.generatePRId(patternResult, mergeCommit);

        // Create event title based on available information
        const title = this.generatePRTitle(patternResult, sourceBranch, mergeCommit);

        // Create meaningful description
        const description = this.generatePRDescription(mergeInfo);

        // Determine severity based on impact and merge success
        const severity = this.determineSeverity(impact, patternResult.mergeType);

        // Create the timeline event
        const event: TimelineEvent = {
            id: prId,
            type: 'pr',
            branch: sourceBranch?.name || 'unknown-branch',
            author: mergeCommit.author,
            timestamp: mergeCommit.date.toISOString(),
            title,
            description,
            severity,
            impact,
            filesChanged: mergeCommit.filesChanged,
            linesAdded: mergeCommit.insertions,
            linesRemoved: mergeCommit.deletions,
            hash: mergeCommit.hash.substring(0, 8),
            metadata: this.createPRMetadata(mergeInfo)
        };

        return event;
    }

    /**
     * Creates connection events that represent the flow from source to target branch
     *
     * @param mergeInfo Merge information containing branch details
     * @returns Array of connection events (may be empty if insufficient data)
     */
    public createConnectionEvents(mergeInfo: MergeInfo): TimelineEvent[] {
        const { sourceBranch, targetBranch, mergeCommit } = mergeInfo;

        if (!sourceBranch || !targetBranch) {
            return [];
        }

        // Create a connection event that the visualization can use for drawing lines
        const connectionEvent: TimelineEvent = {
            id: `connection-${this.generatePRId(mergeInfo.patternResult, mergeCommit)}`,
            type: 'pr',  // Type stays 'pr' but metadata indicates it's for connection
            branch: sourceBranch.name,
            author: mergeCommit.author,
            timestamp: mergeCommit.date.toISOString(),
            title: `Merge: ${sourceBranch.name} → ${targetBranch}`,
            description: `Connected ${sourceBranch.name} to ${targetBranch}`,
            severity: 'info',
            impact: mergeInfo.impact,
            metadata: {
                ...this.createPRMetadata(mergeInfo),
                isConnection: true,
                connectionType: 'pr-merge',
                sourceBranch: sourceBranch.name,
                targetBranch: targetBranch
            }
        };

        return [connectionEvent];
    }

    /**
     * Creates summary events that provide insights about PR patterns
     *
     * @param allMergeInfo Array of all detected merges
     * @returns Summary timeline events
     */
    public createSummaryEvents(allMergeInfo: MergeInfo[]): TimelineEvent[] {
        if (allMergeInfo.length === 0) {
            return [];
        }

        // Calculate summary statistics
        const totalPRs = allMergeInfo.length;
        const avgDuration = this.calculateAverageDuration(allMergeInfo);
        const avgImpact = this.calculateAverageImpact(allMergeInfo);
        const patternCounts = this.countPatterns(allMergeInfo);

        // Find date range
        const dates = allMergeInfo.map(info => info.mergeCommit.date);
        const latestDate = new Date(Math.max(...dates.map(d => d.getTime())));

        const summaryEvent: TimelineEvent = {
            id: `pr-summary-${Date.now()}`,
            type: 'pr',
            branch: 'summary',
            author: 'System',
            timestamp: latestDate.toISOString(),
            title: `PR Analysis: ${totalPRs} PRs detected`,
            description: `Avg duration: ${avgDuration}d, Avg impact: ${avgImpact}`,
            severity: 'info',
            impact: avgImpact,
            metadata: {
                isSummary: true,
                totalPRs,
                averageDuration: avgDuration,
                averageImpact: avgImpact,
                patternCounts
            }
        };

        return [summaryEvent];
    }

    // ===== PRIVATE HELPER METHODS =====

    /**
     * Generates a unique ID for a PR event
     */
    private generatePRId(patternResult: MergePatternResult, mergeCommit: GitCommit): string {
        if (patternResult.prNumber) {
            return `synthetic-pr-${patternResult.prNumber}`;
        }

        // Use commit hash and increment counter for uniqueness
        return `synthetic-pr-${mergeCommit.hash.substring(0, 8)}-${++this.eventCounter}`;
    }

    /**
     * Generates a meaningful title for the PR event
     */
    private generatePRTitle(
        patternResult: MergePatternResult,
        sourceBranch?: BranchInfo,
        mergeCommit?: GitCommit
    ): string {
        // If we have a PR number, use it
        if (patternResult.prNumber) {
            const sourceInfo = sourceBranch ? ` from ${sourceBranch.name}` : '';
            return `PR #${patternResult.prNumber}${sourceInfo}`;
        }

        // Use source branch if available
        if (sourceBranch) {
            return `Merge from ${sourceBranch.name}`;
        }

        // Fall back to merge commit pattern
        if (patternResult.pattern.platform !== 'generic') {
            return `${patternResult.pattern.platform} merge`;
        }

        // Last resort: use commit message
        const commitTitle = mergeCommit?.message.split('\n')[0].substring(0, 50) || 'Merge commit';
        return commitTitle;
    }

    /**
     * Generates a descriptive text for the PR event
     */
    private generatePRDescription(mergeInfo: MergeInfo): string {
        const { mergeCommit, sourceBranch, estimatedDuration, patternResult } = mergeInfo;
        const parts: string[] = [];

        // Add merge type
        parts.push(`${patternResult.mergeType} merge`);

        // Add duration if available
        if (sourceBranch && estimatedDuration > 0) {
            const durText = estimatedDuration === 1 ? '1 day' : `${estimatedDuration} days`;
            parts.push(`${durText} duration`);
        }

        // Add file change info
        if (mergeCommit.filesChanged > 0) {
            parts.push(`${mergeCommit.filesChanged} files changed`);
        }

        // Add confidence indicator
        const confidence = Math.round(patternResult.confidence * 100);
        parts.push(`${confidence}% confidence`);

        return parts.join(', ');
    }

    /**
     * Determines severity based on impact and merge characteristics
     */
    private determineSeverity(impact: number, mergeType: string): 'info' | 'warning' | 'error' {
        // High impact merges get warning level
        if (impact >= 80) {
            return 'warning';
        }

        // Most merges are informational
        return 'info';
    }

    /**
     * Creates comprehensive metadata for the PR event
     */
    private createPRMetadata(mergeInfo: MergeInfo): Record<string, any> {
        const { mergeCommit, patternResult, sourceBranch, targetBranch, estimatedDuration, impact, commitCount } = mergeInfo;

        return {
            // Pattern analysis results
            detectionPattern: patternResult.pattern.name,
            detectionPlatform: patternResult.pattern.platform,
            detectionConfidence: patternResult.confidence,
            mergeType: patternResult.mergeType,

            // PR properties
            prNumber: patternResult.prNumber,
            sourceBranch: sourceBranch?.name,
            targetBranch,
            estimatedDuration,
            estimatedCommitCount: commitCount,

            // Branch information
            sourceBranchAuthor: sourceBranch?.author,
            sourceBranchCreated: sourceBranch?.creationDate?.toISOString(),
            isFeatureBranch: sourceBranch?.isFeatureBranch,

            // Merge commit details
            mergeCommitHash: mergeCommit.hash,
            mergeCommitMessage: mergeCommit.message,
            mergeCommitAuthor: mergeCommit.author,
            mergeCommitDate: mergeCommit.date.toISOString(),

            // Analysis metadata
            synthetic: true,
            analysisTimestamp: new Date().toISOString(),
            detectorVersion: '1.0.0'
        };
    }

    /**
     * Calculates average duration across all merge info
     */
    private calculateAverageDuration(allMergeInfo: MergeInfo[]): number {
        const validDurations = allMergeInfo
            .map(info => info.estimatedDuration)
            .filter(duration => duration > 0);

        return validDurations.length > 0 ?
            Math.round(validDurations.reduce((sum, d) => sum + d, 0) / validDurations.length) :
            0;
    }

    /**
     * Calculates average impact across all merge info
     */
    private calculateAverageImpact(allMergeInfo: MergeInfo[]): number {
        const impacts = allMergeInfo.map(info => info.impact);
        return impacts.length > 0 ?
            Math.round(impacts.reduce((sum, impact) => sum + impact, 0) / impacts.length) :
            0;
    }

    /**
     * Counts occurrences of different patterns
     */
    private countPatterns(allMergeInfo: MergeInfo[]): Record<string, number> {
        const counts: Record<string, number> = {};

        for (const info of allMergeInfo) {
            const patternName = info.patternResult.pattern.name;
            counts[patternName] = (counts[patternName] || 0) + 1;
        }

        return counts;
    }
}

/**
 * Main Git-based PR detection system
 *
 * Orchestrates all analysis components to detect synthetic PR events from Git
 * history without requiring external API integration. Provides a clean interface
 * for timeline integration and comprehensive error handling.
 */
export class GitBasedPRDetector {
    private readonly patternAnalyzer: PRMergePatternAnalyzer;
    private readonly branchAnalyzer: BranchRelationshipAnalyzer;
    private readonly eventGenerator: SyntheticEventGenerator;
    private readonly config: PRDetectionConfig;

    constructor(config: Partial<PRDetectionConfig> = {}) {
        this.config = { ...DEFAULT_PR_DETECTION_CONFIG, ...config };

        this.patternAnalyzer = new PRMergePatternAnalyzer();
        this.branchAnalyzer = new BranchRelationshipAnalyzer(this.config);
        this.eventGenerator = new SyntheticEventGenerator(this.config);
    }

    /**
     * Main detection method - analyzes Git data and returns synthetic PR events
     *
     * @param commits Array of Git commits to analyze
     * @param branches Array of Git branches for relationship analysis
     * @returns Promise resolving to array of synthetic timeline events
     */
    public async detectPRs(commits: GitCommit[], branches: GitBranch[]): Promise<TimelineEvent[]> {
        console.log(`GitPRDetector: Starting analysis of ${commits.length} commits and ${branches.length} branches`);

        try {
            // Phase 1: Index branches for efficient lookup
            this.branchAnalyzer.indexBranches(branches);

            // Phase 2: Analyze commits for merge patterns
            const detectedMerges = this.analyzeCommitsForMerges(commits);
            console.log(`GitPRDetector: Found ${detectedMerges.length} potential merge commits`);

            // Phase 3: Enhance merge data with branch relationships
            const mergeInfoList = await this.enhanceMergesWithBranchData(detectedMerges, commits);
            console.log(`GitPRDetector: Enhanced ${mergeInfoList.length} merges with branch data`);

            // Phase 4: Filter based on confidence and configuration
            const filteredMerges = this.filterMergesByConfidence(mergeInfoList);
            console.log(`GitPRDetector: ${filteredMerges.length} merges passed confidence filter`);

            // Phase 5: Generate timeline events
            const syntheticEvents = this.generateTimelineEvents(filteredMerges);
            console.log(`GitPRDetector: Generated ${syntheticEvents.length} synthetic events`);

            return syntheticEvents;

        } catch (error) {
            console.error('GitPRDetector: Error during PR detection:', error);
            return [];  // Return empty array rather than throwing
        }
    }

    /**
     * Gets detailed analysis statistics for debugging and insights
     *
     * @param commits Array of Git commits
     * @param branches Array of Git branches
     * @returns Comprehensive analysis statistics
     */
    public async getAnalysisStatistics(commits: GitCommit[], branches: GitBranch[]): Promise<{
        totalCommits: number;
        totalBranches: number;
        potentialMergeCommits: number;
        detectedPRs: number;
        highConfidencePRs: number;
        branchStatistics: any;
        patternDistribution: Record<string, number>;
        averageConfidence: number;
    }> {
        this.branchAnalyzer.indexBranches(branches);
        const detectedMerges = this.analyzeCommitsForMerges(commits);
        const mergeInfoList = await this.enhanceMergesWithBranchData(detectedMerges, commits);
        const filteredMerges = this.filterMergesByConfidence(mergeInfoList);

        const patternDistribution: Record<string, number> = {};
        let totalConfidence = 0;

        for (const merge of mergeInfoList) {
            const patternName = merge.patternResult.pattern.name;
            patternDistribution[patternName] = (patternDistribution[patternName] || 0) + 1;
            totalConfidence += merge.patternResult.confidence;
        }

        return {
            totalCommits: commits.length,
            totalBranches: branches.length,
            potentialMergeCommits: detectedMerges.length,
            detectedPRs: mergeInfoList.length,
            highConfidencePRs: filteredMerges.length,
            branchStatistics: this.branchAnalyzer.getBranchStatistics(),
            patternDistribution,
            averageConfidence: mergeInfoList.length > 0 ? totalConfidence / mergeInfoList.length : 0
        };
    }

    /**
     * Gets the current configuration
     */
    public getConfiguration(): PRDetectionConfig {
        return { ...this.config };
    }

    /**
     * Updates the configuration and reinitializes components
     */
    public updateConfiguration(newConfig: Partial<PRDetectionConfig>): void {
        Object.assign(this.config, newConfig);
        // Reinitialize components with new config if needed
    }

    // ===== PRIVATE ANALYSIS METHODS =====

    /**
     * Phase 2: Analyzes commits to find potential merge patterns
     */
    private analyzeCommitsForMerges(commits: GitCommit[]): Array<{
        commit: GitCommit;
        patternResult: MergePatternResult;
    }> {
        const detectedMerges: Array<{ commit: GitCommit; patternResult: MergePatternResult; }> = [];

        for (const commit of commits) {
            const patternResult = this.patternAnalyzer.analyzeMergeCommit(commit);
            if (patternResult) {
                detectedMerges.push({ commit, patternResult });
            }
        }

        return detectedMerges;
    }

    /**
     * Phase 3: Enhances merge data with branch relationship analysis
     */
    private async enhanceMergesWithBranchData(
        detectedMerges: Array<{ commit: GitCommit; patternResult: MergePatternResult; }>,
        allCommits: GitCommit[]
    ): Promise<MergeInfo[]> {
        const mergeInfoList: MergeInfo[] = [];

        for (const { commit, patternResult } of detectedMerges) {
            try {
                // Find source branch
                const sourceBranch = this.branchAnalyzer.findSourceBranch(commit, patternResult);

                // Calculate properties
                const estimatedDuration = sourceBranch ?
                    this.branchAnalyzer.estimatePRDuration(sourceBranch, commit.date) : 0;

                const impact = this.branchAnalyzer.calculatePRImpact(commit, sourceBranch, allCommits);

                // Estimate commit count (simplified)
                const commitCount = sourceBranch ? this.estimateCommitCount(sourceBranch, commit, allCommits) : 1;

                const mergeInfo: MergeInfo = {
                    mergeCommit: commit,
                    patternResult,
                    sourceBranch,
                    targetBranch: patternResult.targetBranch || commit.branch,
                    estimatedDuration,
                    impact,
                    commitCount
                };

                mergeInfoList.push(mergeInfo);

            } catch (error) {
                console.warn(`GitPRDetector: Error enhancing merge ${commit.hash}:`, error);
                // Continue with other merges
            }
        }

        return mergeInfoList;
    }

    /**
     * Phase 4: Filters merges based on confidence thresholds
     */
    private filterMergesByConfidence(mergeInfoList: MergeInfo[]): MergeInfo[] {
        return mergeInfoList.filter(mergeInfo => {
            const confidence = mergeInfo.patternResult.confidence;

            // Apply minimum confidence threshold
            if (confidence < this.config.minConfidence) {
                return false;
            }

            // Skip very old PRs unless they're high confidence
            if (mergeInfo.estimatedDuration > this.config.maxPRAge && confidence < 0.8) {
                return false;
            }

            // Skip direct merges if configured to do so
            if (!this.config.includeDirectMerges && !mergeInfo.patternResult.prNumber) {
                return false;
            }

            return true;
        });
    }

    /**
     * Phase 5: Generates timeline events from filtered merge data
     */
    private generateTimelineEvents(filteredMerges: MergeInfo[]): TimelineEvent[] {
        const events: TimelineEvent[] = [];

        // Generate main PR events
        for (const mergeInfo of filteredMerges) {
            try {
                const prEvent = this.eventGenerator.createPREvent(mergeInfo);
                events.push(prEvent);

                // Generate connection events if they have valid branch relationships
                const connectionEvents = this.eventGenerator.createConnectionEvents(mergeInfo);
                events.push(...connectionEvents);

            } catch (error) {
                console.warn(`GitPRDetector: Error generating event for merge ${mergeInfo.mergeCommit.hash}:`, error);
            }
        }

        // Generate summary events if we have significant data
        if (filteredMerges.length >= 3) {
            try {
                const summaryEvents = this.eventGenerator.createSummaryEvents(filteredMerges);
                events.push(...summaryEvents);
            } catch (error) {
                console.warn('GitPRDetector: Error generating summary events:', error);
            }
        }

        return events;
    }

    /**
     * Estimates the number of commits in a PR branch
     */
    private estimateCommitCount(sourceBranch: BranchInfo, mergeCommit: GitCommit, allCommits: GitCommit[]): number {
        // This is a simplified estimation - in a real implementation we'd use git graph analysis
        const branchCommits = allCommits.filter(commit =>
            commit.author === sourceBranch.author &&
            commit.date >= sourceBranch.creationDate &&
            commit.date <= mergeCommit.date &&
            commit.hash !== mergeCommit.hash
        );

        return Math.max(1, branchCommits.length);
    }
}