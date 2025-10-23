/**
 * Session Types
 *
 * Data structures for session journals created by coding agents.
 * Sessions are markdown files that track work across multiple prompts,
 * organized by month in .agent-brain/sessions/YYYY-MM/
 */

/**
 * Session journal record as parsed from markdown file with YAML frontmatter
 *
 * Example file: `.agent-brain/sessions/2025-10/session-authentication-refactor.md`
 *
 * ```markdown
 * ---
 * id: session-1729518900000
 * title: Authentication Refactor
 * date: 2025-10-21
 * summary: Refactored OAuth implementation to use new KeyCloak integration
 * tags: authentication, oauth, refactoring, backend, security
 * filesModified:
 *   - src/auth/oauth.ts
 *   - src/auth/keycloak.ts
 *   - tests/auth/oauth.test.ts
 * knowledgeItemsUsed:
 *   - golden-path-oauth
 *   - standard-security-practices
 * ---

# Session: Authentication Refactor

## Context
Started with issue #123 - migrate from old OAuth to KeyCloak...

## Changes Made
1. Created new KeyCloak adapter...
2. Updated OAuth flow...

## Decisions
- Chose KeyCloak over Auth0 because...

## Next Steps
- [ ] Add integration tests
- [ ] Update documentation
 * ```
 */
export interface SessionJournal {
    /**
     * Unique identifier (timestamp-based)
     * Format: "session-{milliseconds}"
     */
    id: string;

    /**
     * Session title (from frontmatter or extracted from first heading)
     */
    title: string;

    /**
     * Session start time (ISO 8601 timestamp)
     * Used for timeline visualization - bar start position
     */
    startTime: string;

    /**
     * Session end time (ISO 8601 timestamp)
     * Used for timeline visualization - bar end position
     */
    endTime: string;

    /**
     * Brief summary of the session (1-2 sentences)
     * Optional but recommended
     */
    summary?: string;

    /**
     * Tags for categorization
     * Comma-separated in frontmatter, parsed to array
     */
    tags?: string[];

    /**
     * List of files modified during this session
     * Relative paths from workspace root
     */
    filesModified?: string[];

    /**
     * Knowledge items that were applied/referenced during this session
     * References to knowledge item IDs
     */
    knowledgeItemsUsed?: string[];

    /**
     * Absolute path to the session markdown file
     * Set when loading from filesystem
     */
    filePath: string;

    /**
     * Markdown content (body of the file, without frontmatter)
     * Optional - only loaded when needed for display
     */
    content?: string;
}

/**
 * Parameters for creating a new session journal
 * (id and filePath are auto-generated)
 */
export type CreateSessionParams = Omit<SessionJournal, 'id' | 'filePath'>;

/**
 * Month directory metadata
 * Used for efficient scanning of session files
 */
export interface SessionMonthDirectory {
    /**
     * Month identifier (YYYY-MM format)
     */
    month: string;

    /**
     * Absolute path to the directory
     */
    path: string;

    /**
     * Number of session files in this month
     */
    sessionCount: number;
}

/**
 * Session file metadata (lightweight, for listing)
 */
export interface SessionFileMetadata {
    /**
     * Session ID
     */
    id: string;

    /**
     * Session title
     */
    title: string;

    /**
     * Session start time (ISO 8601 timestamp)
     */
    startTime: string;

    /**
     * File path
     */
    filePath: string;

    /**
     * File size in bytes
     */
    fileSize: number;

    /**
     * Last modified timestamp
     */
    lastModified: Date;
}
