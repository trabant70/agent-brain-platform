/**
 * Sessions Domain
 *
 * Session journals are markdown files created by coding agents to track work.
 * Organized by month in .agent-brain/sessions/YYYY-MM/
 *
 * Architecture:
 * - Sessions are markdown files with YAML frontmatter
 * - SessionFileSystem handles loading/parsing session journals
 * - SessionEventProvider converts sessions to CanonicalEvents for timeline
 */

export * from './types';
export * from './SessionFileSystem';
