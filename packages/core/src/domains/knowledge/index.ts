/**
 * Knowledge Domain
 *
 * Manages accumulated knowledge from patterns, ADRs, and learnings.
 * This knowledge enhances future prompts but does not generate timeline events.
 *
 * Key Concepts:
 * - Knowledge = accumulated wisdom, not temporal events
 * - Used for prompt enhancement and context awareness
 * - Separate from event timeline (which shows user actions)
 */

export * from './types';
export * from './KnowledgeSystem';

// Re-export intelligence systems from their new home
export * from './patterns';
export * from './adrs';
export * from './learning';

// Phase 2: Project profile and health metrics
export * from './ProjectProfileManager';
export * from './KnowledgeHealthMetrics';

// Phase 3: Success pattern detection and learning
export * from './success';
