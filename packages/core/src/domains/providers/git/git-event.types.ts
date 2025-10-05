import * as vscode from 'vscode';
/**
 * Core Git Event Domain Types
 *
 * Defines the fundamental data structures for git events and their relationships.
 * This forms the foundation of our timeline visualization system.
 */

// ===== CORE EVENT TYPES =====

export type GitEventType =
  | 'commit'
  | 'merge'
  | 'release'
  | 'branch-created'
  | 'branch-deleted'
  | 'branch-checkout'
  | 'branch-switch'
  | 'tag'
  | 'tag-created';

/**
 * Core Git Event interface - represents any action in git history
 */
export interface GitEvent {
    id: string;                    // Commit hash or unique identifier
    type: GitEventType;
    author: string;
    date: Date;
    title: string;                 // Commit message subject or event description
    branch: string;                // Primary branch (for backwards compatibility)
    branches?: string[];           // All branches containing this commit

    // Optional fields for specific event types
    parentHashes?: string[];       // For merge commits - parent commit references
    filesChanged?: number;
    insertions?: number;
    deletions?: number;

    // Metadata for visual connections
    metadata?: GitEventMetadata;
}

/**
 * Metadata for event relationships and visual rendering
 */
export interface GitEventMetadata {
    // Git relationships
    parentEvents?: string[];       // IDs of parent events
    childEvents?: string[];        // IDs of child events
    branchPoint?: string;          // ID of branch creation point
    mergePoint?: string;           // ID of merge target

    // Branch context (for multi-branch visibility)
    branchContext?: GitBranchContext;

    // Release/tag metadata
    tagName?: string;              // Tag name (v1.0.0, etc.)
    tagHash?: string;              // Tag object hash (for annotated tags)
    targetCommit?: string;         // Commit hash that tag points to

    // Visual rendering hints
    visualType?: 'normal' | 'merge-source' | 'merge-target' | 'branch-start';
    connectionStyle?: 'straight' | 'curved' | 'dotted';
    importance?: 'low' | 'medium' | 'high';
}

/**
 * Rich branch context for commits that appear in multiple branches
 */
export interface GitBranchContext {
    authoredOn?: string;           // Branch where commit was originally created
    visibleIn: string[];           // All branches where this commit appears
    mergedInto?: string[];         // Branches this was merged into
    source?: string;               // Git ref that provided this commit (from --source flag)
}

// ===== RELATIONSHIP TYPES =====

/**
 * Represents a relationship between two git events
 */
export interface GitEventRelationship {
    id: string;
    sourceEventId: string;
    targetEventId: string;
    type: GitRelationshipType;
    metadata?: RelationshipMetadata;
}

export type GitRelationshipType =
    | 'parent-child'          // Commit parent-child relationship
    | 'branch-creation'       // Branch created from commit
    | 'merge-source'          // Source branch of merge
    | 'merge-target'          // Target branch of merge
    | 'tag-reference';        // Tag points to commit

/**
 * Metadata for relationship rendering
 */
export interface RelationshipMetadata {
    visualStyle?: 'solid' | 'dashed' | 'dotted';
    color?: string;
    opacity?: number;
    description?: string;
}

// ===== COLLECTION TYPES =====

/**
 * Complete git event dataset with relationships
 */
export interface GitEventCollection {
    events: GitEvent[];
    relationships: GitEventRelationship[];
    branches: string[];            // All branch names
    authors: string[];             // All author names
    dateRange: [Date, Date];       // Timeline span
    metadata: CollectionMetadata;
}

/**
 * Metadata about the entire collection
 */
export interface CollectionMetadata {
    repositoryName: string;
    totalEvents: number;
    totalCommits: number;
    totalMerges: number;
    totalBranches: number;
    uniqueAuthors: number;
    collectionDate: Date;
    extractedAt: Date;
    gitRootPath: string;
}

// ===== ANALYSIS RESULT TYPES =====

/**
 * Result of merge analysis
 */
export interface MergeAnalysisResult {
    mergeCommit: GitEvent;
    sourceEvents: GitEvent[];     // Events being merged
    targetBranch: string;
    branchLifetime: number;       // Days from branch creation to merge
    complexity: 'simple' | 'complex' | 'octopus';
}

/**
 * Result of branch analysis
 */
export interface BranchAnalysisResult {
    branchName: string;
    creationEvent: GitEvent;
    creationPoint: GitEvent;      // The commit the branch was created from
    lifespan: number;             // Days from creation to merge/abandonment
    commitCount: number;
    authors: string[];
}

// ===== FILTER TYPES =====

/**
 * Filter criteria for git events
 */
export interface GitEventFilter {
    eventTypes?: GitEventType[];
    branches?: string[];
    authors?: string[];
    dateRange?: [Date, Date];
    includeRelationships?: GitRelationshipType[];
}

/**
 * Result of applying filters
 */
export interface FilteredGitEvents {
    events: GitEvent[];
    relationships: GitEventRelationship[];
    stats: FilterStats;
}

export interface FilterStats {
    totalEvents: number;
    filteredEvents: number;
    eventTypeCounts: Record<GitEventType, number>;
    branchCounts: Record<string, number>;
    authorCounts: Record<string, number>;
}

// ===== POSITIONING TYPES =====

/**
 * Visual positioning information for timeline rendering
 */
export interface EventPosition {
    eventId: string;
    x: number;                    // Temporal position
    y: number;                    // Branch lane position
    branch: string;
    importance: number;           // Visual weight/size
}

/**
 * Connection line information for rendering
 */
export interface ConnectionLine {
    id: string;
    sourcePosition: EventPosition;
    targetPosition: EventPosition;
    relationship: GitEventRelationship;
    path: string;                 // SVG path string
    style: ConnectionStyle;
}

export interface ConnectionStyle {
    color: string;
    width: number;
    opacity: number;
    dashArray?: string;
}

// ===== ERROR TYPES =====

export class GitEventError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly context?: any
    ) {
        super(message);
        this.name = 'GitEventError';
    }
}

export class GitAnalysisError extends GitEventError {
    constructor(message: string, context?: any) {
        super(message, 'ANALYSIS_ERROR', context);
    }
}

export class GitDataError extends GitEventError {
    constructor(message: string, context?: any) {
        super(message, 'DATA_ERROR', context);
    }
}