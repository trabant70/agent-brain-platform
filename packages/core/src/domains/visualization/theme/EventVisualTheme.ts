/**
 * EventVisualTheme - Centralized Visual Design System
 *
 * Single source of truth for all visual properties across the extension:
 * - Event type colors (consistent across timeline, filters, legend)
 * - Event shapes (visual differentiation)
 * - Connection line styling
 * - Icons and symbols
 *
 * Benefits:
 * - Session persistence: Colors never change between sessions
 * - Easy extensibility: Add new event types in one place
 * - Visual consistency: All components use the same theme
 * - Type safety: Centralized type definitions
 */

export type EventShape =
    | 'circle'
    | 'square'
    | 'diamond'
    | 'triangle'
    | 'star'
    | 'cross'
    | 'wye';

export interface EventTypeVisual {
    shape: EventShape;
    semanticColor?: string;  // Optional base color (for non-sync contexts)
    icon?: string;  // Unicode emoji or symbol
    label?: string;  // Display label
}

export type SyncState = 'synced' | 'local-only' | 'remote-only' | 'diverged' | 'unknown';

export type ColorMode = 'semantic' | 'sync-state';

export interface SyncStateVisual {
    color: string;
    label: string;
    description: string;
}

export interface ConnectionVisual {
    color: string;
    opacity: number;
    strokeWidth?: number;
    arrowPosition?: 'start' | 'end' | 'both' | 'none';
    label?: string;  // Human-readable label for tooltips
}

export class EventVisualTheme {
    /**
     * Current color mode (can be changed by user)
     */
    private static currentColorMode: ColorMode = 'semantic';

    /**
     * Track which specific providers are currently active
     * Used to determine if sync-state mode is available
     */
    private static activeProviders: Set<string> = new Set(['git-local']);

    /**
     * Sync state color mappings (non-overlapping with semantic colors)
     * Used when colorMode = 'sync-state'
     */
    private static readonly SYNC_STATES: Record<SyncState, SyncStateVisual> = {
        'synced': {
            color: '#10b981',  // Emerald - different from semantic green
            label: 'Synced',
            description: 'Event exists both locally and remotely'
        },
        'local-only': {
            color: '#6366f1',  // Indigo - different from semantic cyan/blue
            label: 'Local Only',
            description: 'Event exists only in local repository (not pushed)'
        },
        'remote-only': {
            color: '#f97316',  // Orange-red - different from semantic amber
            label: 'Remote Only',
            description: 'Event exists only on remote (not fetched locally)'
        },
        'diverged': {
            color: '#dc2626',  // Crimson - darker than semantic red
            label: 'Diverged',
            description: 'Local and remote versions differ'
        },
        'unknown': {
            color: '#64748b',  // Slate - neutral gray
            label: 'Unknown',
            description: 'Sync state cannot be determined'
        }
    };

    /**
     * Core Git event types
     * Shape represents event type, color comes from sync state
     */
    private static readonly GIT_EVENTS: Record<string, EventTypeVisual> = {
        'commit': {
            shape: 'circle',
            semanticColor: '#00d4ff',  // Cyan (for legend/filters)
            icon: '●',
            label: 'Commit'
        },
        'merge': {
            shape: 'diamond',
            semanticColor: '#a855f7',  // Purple
            icon: '◆',
            label: 'Merge'
        },
        'branch-created': {
            shape: 'wye',  // Y shape for branch point
            semanticColor: '#22c55e',  // Green
            icon: 'Y',
            label: 'Branch Created'
        },
        'branch-deleted': {
            shape: 'cross',  // X for deletion
            semanticColor: '#ef4444',  // Red
            icon: '✕',
            label: 'Branch Deleted'
        },
        'branch-checkout': {
            shape: 'triangle',  // Directional change
            semanticColor: '#f59e0b',  // Amber
            icon: '▶',
            label: 'Branch Checkout'
        },
        'tag-created': {
            shape: 'star',
            semanticColor: '#eab308',  // Yellow
            icon: '★',
            label: 'Tag Created'
        }
    };

    /**
     * External platform events (GitHub, JIRA, etc.)
     * Shape represents event type, color comes from sync state
     */
    private static readonly EXTERNAL_EVENTS: Record<string, EventTypeVisual> = {
        'pr-opened': {
            shape: 'square',
            semanticColor: '#00ff88',  // Bright green (for legend/filters)
            icon: '□',
            label: 'PR Opened'
        },
        'pr-merged': {
            shape: 'diamond',  // Merge operation
            semanticColor: '#8b5cf6',  // Purple
            icon: '◆',
            label: 'PR Merged'
        },
        'pr-closed': {
            shape: 'cross',  // Closed/cancelled
            semanticColor: '#94a3b8',  // Gray
            icon: '✕',
            label: 'PR Closed'
        },
        'issue-opened': {
            shape: 'circle',
            semanticColor: '#ffaa00',  // Orange
            icon: '○',
            label: 'Issue Opened'
        },
        'issue-closed': {
            shape: 'cross',  // Resolved/closed
            semanticColor: '#10b981',  // Green
            icon: '✓',
            label: 'Issue Closed'
        },
        'release': {
            shape: 'star',  // Milestone
            semanticColor: '#ff00ff',  // Magenta
            icon: '★',
            label: 'Release'
        },
        'deployment': {
            shape: 'triangle',  // Upward movement
            semanticColor: '#059669',  // Teal
            icon: '▲',
            label: 'Deployment'
        },
        'ci': {
            shape: 'wye',  // Process branches
            semanticColor: '#9333ea',  // Purple
            icon: '⚙',
            label: 'CI/CD'
        }
    };

    /**
     * Intelligence events (learnings, patterns, ADRs, Agent Brain sessions)
     * Shape represents event type, semantic colors distinguish intelligence sources
     */
    private static readonly INTELLIGENCE_EVENTS: Record<string, EventTypeVisual> = {
        'learning-stored': {
            shape: 'circle',
            semanticColor: '#9B59B6',  // Purple - learning/knowledge
            icon: '🧠',
            label: 'Learning Stored'
        },
        'pattern-detected': {
            shape: 'diamond',
            semanticColor: '#3498DB',  // Blue - pattern/analysis
            icon: '🔍',
            label: 'Pattern Detected'
        },
        'adr-recorded': {
            shape: 'square',
            semanticColor: '#E67E22',  // Orange - architectural decision
            icon: '📐',
            label: 'ADR Recorded'
        },
        'agent-session': {
            shape: 'star',
            semanticColor: '#22C55E',  // Green - AI-assisted work completed
            icon: '🤖',
            label: 'Agent Brain Session'
        }
    };

    /**
     * Connection line styling by type
     *
     * Semantic colors match event types for visual consistency:
     * - Cyan (#00d4ff) for commits
     * - Purple (#a855f7) for merges
     * - Yellow (#eab308) for tags/releases
     * - Green (#22c55e) for successful operations
     */
    private static readonly CONNECTIONS: Record<string, ConnectionVisual> = {
        'parent-child': {
            color: '#00d4ff',  // Cyan - commit color
            opacity: 0.4,
            strokeWidth: 1.5,
            arrowPosition: 'end',
            label: 'Parent Commit'
        },
        'merge-parent': {
            color: '#a855f7',  // Purple - merge color
            opacity: 0.6,
            strokeWidth: 2,
            arrowPosition: 'end',
            label: 'Merge Source'
        },
        'branch-migration': {
            color: 'inherit',  // Inherit from event type
            opacity: 0.3,
            strokeWidth: 1.5,
            arrowPosition: 'start',  // Arrow at start: points FROM origin (main) TO current (feature)
            label: 'Branch Migration'
        },
        'release-tag': {
            color: '#eab308',  // Yellow - tag/release color
            opacity: 0.7,
            strokeWidth: 2,
            arrowPosition: 'start',
            label: 'Release Tag'
        },
        'pr-merge': {
            color: '#22c55e',  // Green - success color
            opacity: 0.6,
            strokeWidth: 2,
            arrowPosition: 'end',
            label: 'Pull Request Merged'
        },
        'pr-commit': {
            color: '#00d4ff',  // Cyan - commit color
            opacity: 0.5,
            strokeWidth: 1.5,
            arrowPosition: 'end',
            label: 'PR Contains Commit'
        },
        'generic': {
            color: '#6366f1',  // Indigo - neutral
            opacity: 0.3,
            strokeWidth: 1,
            arrowPosition: 'none',
            label: 'Connection'
        }
    };

    /**
     * Get complete visual properties for an event type
     */
    static getEventVisual(eventType: string): EventTypeVisual {
        const normalized = eventType.toLowerCase().replace(/_/g, '-');

        return (
            this.GIT_EVENTS[normalized] ||
            this.EXTERNAL_EVENTS[normalized] ||
            this.INTELLIGENCE_EVENTS[normalized] ||
            {
                color: '#6366f1',  // Default indigo
                shape: 'circle' as const,
                icon: '●',
                label: eventType
            } as EventTypeVisual
        );
    }

    /**
     * Get color for event based on current color mode
     * Auto-falls back to semantic mode if git-local + github are not both enabled
     */
    static getEventColor(eventType: string, syncState: SyncState = 'unknown'): string {
        // Auto-fallback: sync-state only meaningful with git-local + github both enabled
        if (!this.isSyncStateModeAvailable()) {
            return this.getSemanticColor(eventType);
        }

        if (this.currentColorMode === 'semantic') {
            return this.getSemanticColor(eventType);
        } else {
            return this.SYNC_STATES[syncState]?.color || this.SYNC_STATES.unknown.color;
        }
    }

    /**
     * Set the current color mode
     */
    static setColorMode(mode: ColorMode): void {
        this.currentColorMode = mode;
    }

    /**
     * Get the current color mode
     */
    static getColorMode(): ColorMode {
        return this.currentColorMode;
    }

    /**
     * Update the list of active providers
     * Used to determine if sync-state mode is available
     * Auto-switches to semantic mode if git-local + github combo is broken
     */
    static setActiveProviders(providerIds: string[]): void {
        this.activeProviders = new Set(providerIds);

        // Auto-switch to semantic mode if git-local + github combo is broken
        if (!this.isSyncStateModeAvailable() && this.currentColorMode === 'sync-state') {
            this.currentColorMode = 'semantic';
        }
    }

    /**
     * Get the list of active provider IDs
     */
    static getActiveProviders(): string[] {
        return Array.from(this.activeProviders);
    }

    /**
     * Check if sync-state mode is available
     * Requires BOTH git-local AND github to be enabled
     */
    static isSyncStateModeAvailable(): boolean {
        return this.activeProviders.has('git-local') && this.activeProviders.has('github');
    }

    /**
     * Get semantic color for event type (for legend/filters where sync doesn't apply)
     */
    static getSemanticColor(eventType: string): string {
        return this.getEventVisual(eventType).semanticColor || '#6366f1';
    }

    /**
     * Get shape for event type
     */
    static getEventShape(eventType: string): EventShape {
        return this.getEventVisual(eventType).shape;
    }

    /**
     * Get sync state visual properties
     */
    static getSyncStateVisual(syncState: SyncState): SyncStateVisual {
        return this.SYNC_STATES[syncState] || this.SYNC_STATES.unknown;
    }

    /**
     * Determine sync state from event metadata
     *
     * Enhanced with divergence detection:
     * - Checks if local and remote versions differ (hash/timestamp mismatch)
     */
    static determineSyncState(event: any): SyncState {
        // DEBUG: Log for releases and issues to understand sync state determination
        const isRelease = event.type === 'release';
        const isIssue = event.type === 'issue-opened' || event.type === 'issue-closed';
        const shouldLog = isRelease || isIssue;

        // DEBUG: Log ALL event types to find the issue
        if (event.title && event.title.includes('Remote-only')) {
        }

        // Check if event has multiple sources (both git-local and github)
        if (event.sources && Array.isArray(event.sources)) {
            const localSource = event.sources.find((s: any) => s.providerId === 'git-local');
            const remoteSource = event.sources.find((s: any) =>
                s.providerId === 'github' || s.providerId === 'github-api'
            );

            if (shouldLog) {
            }

            // Both sources exist - check for divergence
            if (localSource && remoteSource) {
                // Check if timestamps or hashes differ significantly
                const diverged = this.checkDivergence(event, localSource, remoteSource);
                if (shouldLog) {
                }
                return diverged ? 'diverged' : 'synced';
            }

            // Only one source
            if (localSource && !remoteSource) {
                if (shouldLog) console.log(`  → Only local source, returning: local-only`);
                return 'local-only';
            }
            if (!localSource && remoteSource) {
                if (shouldLog) console.log(`  → Only remote source, returning: remote-only`);
                return 'remote-only';
            }
        }

        // Fallback: check single providerId
        if (shouldLog) {
        }

        if (event.providerId === 'git-local') return 'local-only';
        if (event.providerId === 'github' || event.providerId === 'github-api') return 'remote-only';

        return 'unknown';
    }

    /**
     * Check if local and remote sources have diverged
     * Returns true if there are significant differences
     */
    private static checkDivergence(event: any, localSource: any, remoteSource: any): boolean {
        // For commits/merges: If the event has a hash, they were already matched by SHA
        // If EventMatcher merged them, they have the SAME hash - so they're NOT diverged
        if (event.hash || event.fullHash) {
            // If the merged event has a hash, it means EventMatcher matched them by hash
            // This indicates they're the same commit, so NOT diverged
            return false;
        }

        // For other events (releases, issues, etc.): Check timestamp difference (>24 hours = suspicious)
        if (localSource.timestamp && remoteSource.timestamp) {
            const localTime = new Date(localSource.timestamp).getTime();
            const remoteTime = new Date(remoteSource.timestamp).getTime();
            const diff = Math.abs(localTime - remoteTime);
            const oneDayMs = 24 * 60 * 60 * 1000;
            const diffHours = diff / (60 * 60 * 1000);

            // DEBUG: Log timestamp comparison for non-commit events

            if (diff > oneDayMs) {
                return true; // Diverged - timestamps too far apart
            }
        }

        return false; // Not diverged - sources match well enough
    }

    /**
     * Get icon for event type
     */
    static getEventIcon(eventType: string): string {
        return this.getEventVisual(eventType).icon || '●';
    }

    /**
     * Get display label for event type
     */
    static getEventLabel(eventType: string): string {
        return this.getEventVisual(eventType).label || eventType;
    }

    /**
     * Get connection visual properties
     */
    static getConnectionVisual(connectionType: string): ConnectionVisual {
        return this.CONNECTIONS[connectionType] || this.CONNECTIONS['generic'];
    }

    /**
     * Get all defined event types (for legend/filters)
     */
    static getAllEventTypes(): string[] {
        return [
            ...Object.keys(this.GIT_EVENTS),
            ...Object.keys(this.EXTERNAL_EVENTS),
            ...Object.keys(this.INTELLIGENCE_EVENTS)
        ];
    }

    /**
     * Get color map (for legacy compatibility - uses semantic colors)
     */
    static getColorMap(): Record<string, string> {
        const map: Record<string, string> = {};
        this.getAllEventTypes().forEach(type => {
            map[type] = this.getSemanticColor(type);
        });
        return map;
    }

    /**
     * Get all sync states (for legend)
     */
    static getAllSyncStates(): SyncState[] {
        return Object.keys(this.SYNC_STATES) as SyncState[];
    }

    /**
     * Check if event type is defined in theme
     */
    static hasEventType(eventType: string): boolean {
        const normalized = eventType.toLowerCase().replace(/_/g, '-');
        return !!(this.GIT_EVENTS[normalized] || this.EXTERNAL_EVENTS[normalized] || this.INTELLIGENCE_EVENTS[normalized]);
    }

    /**
     * Get z-index for event type (for rendering order)
     * Higher z-index = rendered on top (more visible/important)
     *
     * Layering strategy:
     * - Tier 1 (1-2): High frequency, low impact (commits, checkouts)
     * - Tier 2 (3-4): Structural changes (branch create/delete)
     * - Tier 3 (5-6): Integration events (merges, PRs)
     * - Tier 4 (7-9): High visibility metadata (tags, releases, issues)
     * - Tier 5 (10+): Critical events (deployments, CI/CD)
     */
    static getEventZIndex(eventType: string): number {
        const normalized = eventType.toLowerCase().replace(/_/g, '-');

        // Tier 1 - High frequency, low impact
        if (normalized === 'commit') return 1;
        if (normalized === 'branch-checkout') return 2;

        // Tier 2 - Structural changes
        if (normalized === 'branch-created') return 3;
        if (normalized === 'branch-deleted') return 4;

        // Tier 3 - Integration events
        if (normalized === 'merge') return 5;
        if (normalized === 'pr-merged') return 6;
        if (normalized === 'pr-closed') return 6;

        // Tier 4 - High visibility metadata
        if (normalized === 'tag-created') return 7;
        if (normalized === 'pr-opened') return 7;
        if (normalized === 'issue-opened') return 8;
        if (normalized === 'issue-closed') return 8;
        if (normalized === 'release') return 9;

        // Tier 5 - Critical events
        if (normalized === 'deployment') return 10;
        if (normalized === 'ci') return 10;

        // Intelligence events - high visibility
        if (normalized === 'learning-stored') return 8;
        if (normalized === 'pattern-detected') return 8;
        if (normalized === 'adr-recorded') return 9;  // ADRs are architectural - very important
        if (normalized === 'agent-session') return 9;  // Agent Brain sessions - critical milestone

        // Default: middle tier
        return 5;
    }
}
