/**
 * MergeAnalyzer - Parent-Child Relationship Detection
 *
 * ARCHITECTURE NOTE: This analyzer processes the raw GitEvents from GitEventRepository
 * to identify actual parent-child relationships using git parent hashes.
 *
 * KEY IMPROVEMENT: No more pattern matching on commit messages!
 * Uses actual git parent hash data to build precise relationship maps.
 *
 * Next phase: BranchAnalyzer will handle branch creation relationships
 * and ConnectionMapper will convert relationships to visual connections.
 */

import {
    GitEvent,
    GitEventRelationship,
    GitRelationshipType,
    MergeAnalysisResult,
    GitAnalysisError,
    RelationshipMetadata
} from '../domain/git-event.types';

/**
 * Configuration for merge analysis
 */
export interface MergeAnalysisConfig {
    includeOctopusMerges: boolean;    // Handle merges with >2 parents
    maxParentDepth: number;           // How deep to trace parent chains
    generateVisualHints: boolean;     // Add visual styling metadata
}

export const DEFAULT_MERGE_CONFIG: MergeAnalysisConfig = {
    includeOctopusMerges: true,
    maxParentDepth: 5,
    generateVisualHints: true
};

/**
 * Analyzer for git merge relationships using parent hash data
 */
export class MergeAnalyzer {
    private readonly config: MergeAnalysisConfig;
    private eventMap: Map<string, GitEvent> = new Map();
    private relationships: GitEventRelationship[] = [];

    constructor(config: Partial<MergeAnalysisConfig> = {}) {
        this.config = { ...DEFAULT_MERGE_CONFIG, ...config };
    }

    /**
     * Analyzes merge relationships for a collection of git events
     */
    analyzeRelationships(events: GitEvent[]): GitEventRelationship[] {
        console.log(`MergeAnalyzer: Analyzing ${events.length} events for parent-child relationships...`);

        this.initializeAnalysis(events);

        // Build parent-child relationships
        const parentChildRelationships = this.buildParentChildRelationships();

        // Build merge-specific relationships
        const mergeRelationships = this.buildMergeRelationships();

        // Combine all relationships
        const allRelationships = [...parentChildRelationships, ...mergeRelationships];

        console.log(`MergeAnalyzer: Found ${allRelationships.length} relationships`);
        console.log(`  - ${parentChildRelationships.length} parent-child`);
        console.log(`  - ${mergeRelationships.length} merge-specific`);

        return allRelationships;
    }

    /**
     * Analyzes merge commits in detail
     */
    analyzeMergeCommits(events: GitEvent[]): MergeAnalysisResult[] {
        this.initializeAnalysis(events);

        const mergeEvents = events.filter(e => e.type === 'merge');
        console.log(`MergeAnalyzer: Analyzing ${mergeEvents.length} merge commits in detail...`);

        const results: MergeAnalysisResult[] = [];

        for (const mergeEvent of mergeEvents) {
            try {
                const result = this.analyzeSingleMerge(mergeEvent);
                if (result) {
                    results.push(result);
                }
            } catch (error) {
                console.warn(`MergeAnalyzer: Failed to analyze merge ${mergeEvent.id}:`, error);
            }
        }

        return results;
    }

    /**
     * Initializes analysis by building event maps
     */
    private initializeAnalysis(events: GitEvent[]): void {
        this.eventMap.clear();
        this.relationships = [];

        // Build event lookup map
        for (const event of events) {
            this.eventMap.set(event.id, event);
        }
    }

    /**
     * Builds basic parent-child relationships from git parent hashes
     */
    private buildParentChildRelationships(): GitEventRelationship[] {
        const relationships: GitEventRelationship[] = [];

        for (const event of this.eventMap.values()) {
            if (event.parentHashes && event.parentHashes.length > 0) {
                for (const parentHash of event.parentHashes) {
                    const parentEvent = this.eventMap.get(parentHash);
                    if (parentEvent) {
                        const relationship: GitEventRelationship = {
                            id: `parent-${parentHash}-${event.id}`,
                            sourceEventId: parentHash,
                            targetEventId: event.id,
                            type: 'parent-child',
                            metadata: this.generateParentChildMetadata(parentEvent, event)
                        };

                        relationships.push(relationship);
                    }
                }
            }
        }

        return relationships;
    }

    /**
     * Builds merge-specific relationships (source/target branches)
     */
    private buildMergeRelationships(): GitEventRelationship[] {
        const relationships: GitEventRelationship[] = [];

        for (const event of this.eventMap.values()) {
            if (event.type === 'merge' && event.parentHashes && event.parentHashes.length >= 2) {
                // For merge commits, identify source and target relationships
                const mergeRelationships = this.buildMergeSourceTargetRelationships(event);
                relationships.push(...mergeRelationships);
            }
        }

        return relationships;
    }

    /**
     * Builds source/target relationships for a merge commit
     */
    private buildMergeSourceTargetRelationships(mergeEvent: GitEvent): GitEventRelationship[] {
        const relationships: GitEventRelationship[] = [];

        if (!mergeEvent.parentHashes || mergeEvent.parentHashes.length < 2) {
            return relationships;
        }

        // First parent is typically the target branch (where merge happened)
        const targetParentHash = mergeEvent.parentHashes[0];
        const targetParent = this.eventMap.get(targetParentHash);

        if (targetParent) {
            relationships.push({
                id: `merge-target-${targetParentHash}-${mergeEvent.id}`,
                sourceEventId: targetParentHash,
                targetEventId: mergeEvent.id,
                type: 'merge-target',
                metadata: this.generateMergeTargetMetadata(targetParent, mergeEvent)
            });
        }

        // Remaining parents are source branches being merged
        for (let i = 1; i < mergeEvent.parentHashes.length; i++) {
            const sourceParentHash = mergeEvent.parentHashes[i];
            const sourceParent = this.eventMap.get(sourceParentHash);

            if (sourceParent) {
                relationships.push({
                    id: `merge-source-${sourceParentHash}-${mergeEvent.id}`,
                    sourceEventId: sourceParentHash,
                    targetEventId: mergeEvent.id,
                    type: 'merge-source',
                    metadata: this.generateMergeSourceMetadata(sourceParent, mergeEvent, i)
                });
            }
        }

        return relationships;
    }

    /**
     * Analyzes a single merge commit in detail
     */
    private analyzeSingleMerge(mergeEvent: GitEvent): MergeAnalysisResult | null {
        if (!mergeEvent.parentHashes || mergeEvent.parentHashes.length < 2) {
            return null;
        }

        const sourceEvents: GitEvent[] = [];

        // Collect source events (all parents except first)
        for (let i = 1; i < mergeEvent.parentHashes.length; i++) {
            const sourceEvent = this.eventMap.get(mergeEvent.parentHashes[i]);
            if (sourceEvent) {
                sourceEvents.push(sourceEvent);
            }
        }

        // Determine complexity
        let complexity: 'simple' | 'complex' | 'octopus';
        if (mergeEvent.parentHashes.length === 2) {
            complexity = 'simple';
        } else if (mergeEvent.parentHashes.length > 2) {
            complexity = 'octopus';
        } else {
            complexity = 'complex';
        }

        // Calculate branch lifetime (simplified - would need branch creation analysis)
        const branchLifetime = this.estimateBranchLifetime(mergeEvent, sourceEvents);

        return {
            mergeCommit: mergeEvent,
            sourceEvents,
            targetBranch: mergeEvent.branch,
            branchLifetime,
            complexity
        };
    }

    /**
     * Generates metadata for parent-child relationships
     */
    private generateParentChildMetadata(parentEvent: GitEvent, childEvent: GitEvent): RelationshipMetadata {
        const metadata: RelationshipMetadata = {
            description: `${parentEvent.title.substring(0, 30)}... → ${childEvent.title.substring(0, 30)}...`
        };

        if (this.config.generateVisualHints) {
            // Same branch = straight line, different branch = curved
            if (parentEvent.branch === childEvent.branch) {
                metadata.visualStyle = 'solid';
                metadata.color = '#6366f1'; // Indigo for same-branch
                metadata.opacity = 0.4;
            } else {
                metadata.visualStyle = 'dashed';
                metadata.color = '#f59e0b'; // Amber for cross-branch
                metadata.opacity = 0.6;
            }
        }

        return metadata;
    }

    /**
     * Generates metadata for merge target relationships
     */
    private generateMergeTargetMetadata(targetEvent: GitEvent, mergeEvent: GitEvent): RelationshipMetadata {
        const metadata: RelationshipMetadata = {
            description: `Merge into ${mergeEvent.branch}`
        };

        if (this.config.generateVisualHints) {
            metadata.visualStyle = 'solid';
            metadata.color = '#10b981'; // Green for merge target
            metadata.opacity = 0.7;
        }

        return metadata;
    }

    /**
     * Generates metadata for merge source relationships
     */
    private generateMergeSourceMetadata(
        sourceEvent: GitEvent,
        mergeEvent: GitEvent,
        sourceIndex: number
    ): RelationshipMetadata {
        const metadata: RelationshipMetadata = {
            description: `Merge from ${sourceEvent.branch || 'unknown'}`
        };

        if (this.config.generateVisualHints) {
            metadata.visualStyle = 'solid';
            // Different colors for multiple sources in octopus merges
            const sourceColors = ['#ef4444', '#f97316', '#eab308', '#84cc16']; // Red, orange, yellow, lime
            metadata.color = sourceColors[sourceIndex - 1] || '#6b7280'; // Gray fallback
            metadata.opacity = 0.6;
        }

        return metadata;
    }

    /**
     * Estimates branch lifetime based on commit dates
     */
    private estimateBranchLifetime(mergeEvent: GitEvent, sourceEvents: GitEvent[]): number {
        if (sourceEvents.length === 0) return 0;

        // Find earliest source event date
        const earliestSourceDate = Math.min(...sourceEvents.map(e => e.date.getTime()));
        const mergeDate = mergeEvent.date.getTime();

        // Calculate lifetime in days
        const lifetimeMs = mergeDate - earliestSourceDate;
        return Math.max(0, Math.round(lifetimeMs / (1000 * 60 * 60 * 24)));
    }

    /**
     * Finds all descendant events of a given event
     */
    findDescendants(eventId: string, depth: number = this.config.maxParentDepth): GitEvent[] {
        const descendants: GitEvent[] = [];
        const visited = new Set<string>();

        this.findDescendantsRecursive(eventId, depth, descendants, visited);
        return descendants;
    }

    /**
     * Recursive helper for finding descendants
     */
    private findDescendantsRecursive(
        eventId: string,
        remainingDepth: number,
        descendants: GitEvent[],
        visited: Set<string>
    ): void {
        if (remainingDepth <= 0 || visited.has(eventId)) return;

        visited.add(eventId);

        for (const event of this.eventMap.values()) {
            if (event.parentHashes && event.parentHashes.includes(eventId)) {
                descendants.push(event);
                this.findDescendantsRecursive(event.id, remainingDepth - 1, descendants, visited);
            }
        }
    }

    /**
     * Gets statistics about the merge analysis
     */
    getAnalysisStatistics(): {
        totalEvents: number;
        mergeEvents: number;
        simpleMerges: number;
        octopusMerges: number;
        orphanEvents: number;
    } {
        const totalEvents = this.eventMap.size;
        const mergeEvents = Array.from(this.eventMap.values()).filter(e => e.type === 'merge').length;

        let simpleMerges = 0;
        let octopusMerges = 0;
        let orphanEvents = 0;

        for (const event of this.eventMap.values()) {
            if (event.type === 'merge') {
                const parentCount = event.parentHashes?.length || 0;
                if (parentCount === 2) {
                    simpleMerges++;
                } else if (parentCount > 2) {
                    octopusMerges++;
                }
            } else if (!event.parentHashes || event.parentHashes.length === 0) {
                orphanEvents++;
            }
        }

        return {
            totalEvents,
            mergeEvents,
            simpleMerges,
            octopusMerges,
            orphanEvents
        };
    }
}