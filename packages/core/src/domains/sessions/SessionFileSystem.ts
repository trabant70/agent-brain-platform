/**
 * SessionFileSystem - File I/O for Session Journals
 *
 * Handles loading session journals from markdown files with YAML frontmatter.
 * Sessions are organized by month in .agent-brain/sessions/YYYY-MM/ directories.
 *
 * Features:
 * - Month-based directory scanning (YYYY-MM format)
 * - YAML frontmatter parsing
 * - Graceful error handling for malformed files
 * - Pathway logging for debugging
 */

import * as fs from 'fs';
import * as path from 'path';
import { SessionJournal, SessionMonthDirectory, SessionFileMetadata } from './types';
import { logger, LogCategory, LogPathway } from '../../infrastructure/logging/Logger';

export class SessionFileSystem {
    private readonly sessionsRoot: string;

    /**
     * Creates a new SessionFileSystem instance
     * @param workspaceRoot Root directory of the workspace
     */
    constructor(private readonly workspaceRoot: string) {
        this.sessionsRoot = path.join(workspaceRoot, '.agent-brain', 'sessions');

        logger.debug(
            LogCategory.DATA,
            'SessionFileSystem initialized',
            'constructor',
            { sessionsRoot: this.sessionsRoot },
            LogPathway.DATA_INGESTION
        );
    }

    /**
     * Get all month directories (YYYY-MM format)
     * Returns directories sorted chronologically (newest first)
     */
    async getMonthDirectories(): Promise<SessionMonthDirectory[]> {
        logger.debug(
            LogCategory.DATA,
            'Scanning for month directories',
            'getMonthDirectories',
            undefined,
            LogPathway.DATA_INGESTION
        );

        try {
            if (!fs.existsSync(this.sessionsRoot)) {
                logger.debug(
                    LogCategory.DATA,
                    'Sessions root directory does not exist',
                    'getMonthDirectories',
                    { sessionsRoot: this.sessionsRoot },
                    LogPathway.DATA_INGESTION
                );
                return [];
            }

            const entries = await fs.promises.readdir(this.sessionsRoot, { withFileTypes: true });
            const monthDirs: SessionMonthDirectory[] = [];

            // Filter for YYYY-MM pattern directories
            const monthRegex = /^\d{4}-\d{2}$/;

            for (const entry of entries) {
                if (entry.isDirectory() && monthRegex.test(entry.name)) {
                    const dirPath = path.join(this.sessionsRoot, entry.name);
                    const files = await fs.promises.readdir(dirPath);
                    const mdFiles = files.filter(f => f.endsWith('.md'));

                    monthDirs.push({
                        month: entry.name,
                        path: dirPath,
                        sessionCount: mdFiles.length
                    });
                }
            }

            // Sort chronologically (newest first)
            monthDirs.sort((a, b) => b.month.localeCompare(a.month));

            logger.debug(
                LogCategory.DATA,
                'Month directories found',
                'getMonthDirectories',
                { count: monthDirs.length, months: monthDirs.map(d => d.month) },
                LogPathway.DATA_INGESTION
            );

            return monthDirs;
        } catch (error) {
            logger.error(
                LogCategory.DATA,
                'Failed to scan month directories',
                'getMonthDirectories',
                { error: error instanceof Error ? error.message : String(error) }
            );
            return [];
        }
    }

    /**
     * Load all sessions from a specific month directory
     * @param month Month identifier (YYYY-MM format)
     * @returns Array of session journals
     */
    async loadSessionsForMonth(month: string): Promise<SessionJournal[]> {
        logger.debug(
            LogCategory.DATA,
            'Loading sessions for month',
            'loadSessionsForMonth',
            { month },
            LogPathway.DATA_INGESTION
        );

        try {
            const monthDir = path.join(this.sessionsRoot, month);

            if (!fs.existsSync(monthDir)) {
                logger.warn(
                    LogCategory.DATA,
                    'Month directory does not exist',
                    'loadSessionsForMonth',
                    { month, monthDir }
                );
                return [];
            }

            const files = await fs.promises.readdir(monthDir);
            const mdFiles = files.filter(f => f.endsWith('.md'));
            const sessions: SessionJournal[] = [];

            for (const file of mdFiles) {
                const filePath = path.join(monthDir, file);
                try {
                    const content = await fs.promises.readFile(filePath, 'utf8');
                    const session = await this.parseSessionFile(filePath, content);
                    sessions.push(session);
                } catch (error) {
                    logger.warn(
                        LogCategory.DATA,
                        'Failed to parse session file',
                        'loadSessionsForMonth',
                        {
                            file: filePath,
                            error: error instanceof Error ? error.message : String(error)
                        }
                    );
                    // Continue loading other files even if one fails
                }
            }

            logger.debug(
                LogCategory.DATA,
                'Sessions loaded for month',
                'loadSessionsForMonth',
                { month, count: sessions.length },
                LogPathway.DATA_INGESTION
            );

            return sessions;
        } catch (error) {
            logger.error(
                LogCategory.DATA,
                'Failed to load sessions for month',
                'loadSessionsForMonth',
                {
                    month,
                    error: error instanceof Error ? error.message : String(error)
                }
            );
            return [];
        }
    }

    /**
     * Load all sessions from all months
     * Useful for timeline visualization
     * @returns Array of all session journals, sorted by date (newest first)
     */
    async loadAllSessions(): Promise<SessionJournal[]> {
        logger.debug(
            LogCategory.DATA,
            'Loading all sessions',
            'loadAllSessions',
            undefined,
            LogPathway.DATA_INGESTION
        );

        try {
            const monthDirs = await this.getMonthDirectories();
            const allSessions: SessionJournal[] = [];

            for (const monthDir of monthDirs) {
                const sessions = await this.loadSessionsForMonth(monthDir.month);
                allSessions.push(...sessions);
            }

            // Sort by startTime (newest first)
            allSessions.sort((a, b) => b.startTime.localeCompare(a.startTime));

            logger.debug(
                LogCategory.DATA,
                'All sessions loaded',
                'loadAllSessions',
                { count: allSessions.length },
                LogPathway.DATA_INGESTION
            );

            return allSessions;
        } catch (error) {
            logger.error(
                LogCategory.DATA,
                'Failed to load all sessions',
                'loadAllSessions',
                { error: error instanceof Error ? error.message : String(error) }
            );
            return [];
        }
    }

    /**
     * Get lightweight metadata for all sessions (without loading full content)
     * Useful for listing views
     */
    async getSessionMetadata(): Promise<SessionFileMetadata[]> {
        logger.debug(
            LogCategory.DATA,
            'Loading session metadata',
            'getSessionMetadata',
            undefined,
            LogPathway.DATA_INGESTION
        );

        try {
            const monthDirs = await this.getMonthDirectories();
            const metadata: SessionFileMetadata[] = [];

            for (const monthDir of monthDirs) {
                const files = await fs.promises.readdir(monthDir.path);
                const mdFiles = files.filter(f => f.endsWith('.md'));

                for (const file of mdFiles) {
                    const filePath = path.join(monthDir.path, file);
                    try {
                        const stats = await fs.promises.stat(filePath);
                        const content = await fs.promises.readFile(filePath, 'utf8');
                        const { data } = this.parseFrontmatter(content);

                        metadata.push({
                            id: data.id || this.generateIdFromPath(filePath),
                            title: data.title || path.basename(file, '.md'),
                            startTime: data.startTime || monthDir.month + '-01T00:00:00.000Z',
                            filePath,
                            fileSize: stats.size,
                            lastModified: stats.mtime
                        });
                    } catch (error) {
                        // Skip malformed files
                        logger.warn(
                            LogCategory.DATA,
                            'Failed to read session metadata',
                            'getSessionMetadata',
                            { file: filePath }
                        );
                    }
                }
            }

            logger.debug(
                LogCategory.DATA,
                'Session metadata loaded',
                'getSessionMetadata',
                { count: metadata.length },
                LogPathway.DATA_INGESTION
            );

            return metadata;
        } catch (error) {
            logger.error(
                LogCategory.DATA,
                'Failed to load session metadata',
                'getSessionMetadata',
                { error: error instanceof Error ? error.message : String(error) }
            );
            return [];
        }
    }

    /**
     * Parse a session markdown file with YAML frontmatter
     * @private
     */
    private async parseSessionFile(filePath: string, content: string): Promise<SessionJournal> {
        const { data, body } = this.parseFrontmatter(content);

        // Extract fields from frontmatter
        const id = data.id || this.generateIdFromPath(filePath);
        const title = data.title || this.extractTitleFromBody(body) || path.basename(filePath, '.md');

        // Parse start and end times
        const startTime = data.startTime || this.extractDateFromPath(filePath) + 'T00:00:00.000Z';
        const endTime = data.endTime || this.getDefaultEndTime(startTime);

        const summary = data.summary;
        const tags = this.parseTags(data.tags);
        const topics = this.parseArray(data.topics);
        const filesModified = this.parseArray(data.filesModified);
        const knowledgeItemsUsed = this.parseArray(data.knowledgeItemsUsed);

        return {
            id,
            title,
            startTime,
            endTime,
            summary,
            tags,
            topics,
            filesModified,
            knowledgeItemsUsed,
            filePath,
            content: body.trim()
        };
    }

    /**
     * Parse YAML frontmatter from markdown content
     * @private
     */
    private parseFrontmatter(content: string): { data: any; body: string } {
        const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
        const match = content.match(frontmatterRegex);

        if (!match) {
            return { data: {}, body: content };
        }

        const [, yamlContent, body] = match;
        const data: any = {};

        // Simple YAML parser (handles basic key: value and key: [list])
        const lines = yamlContent.split('\n');
        let currentKey: string | null = null;
        let isArray = false;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Array item
            if (trimmed.startsWith('- ')) {
                if (currentKey && isArray) {
                    if (!Array.isArray(data[currentKey])) {
                        data[currentKey] = [];
                    }
                    data[currentKey].push(trimmed.substring(2).trim());
                }
                continue;
            }

            // Key-value pair
            const colonIndex = trimmed.indexOf(':');
            if (colonIndex > 0) {
                const key = trimmed.substring(0, colonIndex).trim();
                const value = trimmed.substring(colonIndex + 1).trim();
                currentKey = key;

                if (!value) {
                    // Empty value - might be start of array
                    isArray = true;
                    data[key] = [];
                } else {
                    isArray = false;
                    data[key] = value;
                }
            }
        }

        return { data, body };
    }

    /**
     * Parse tags (comma-separated string or array)
     * @private
     */
    private parseTags(value: any): string[] | undefined {
        if (!value) return undefined;

        if (Array.isArray(value)) {
            return value;
        }

        if (typeof value === 'string') {
            return value.split(',').map(t => t.trim()).filter(t => t.length > 0);
        }

        return undefined;
    }

    /**
     * Parse array fields
     * @private
     */
    private parseArray(value: any): string[] | undefined {
        if (!value) return undefined;

        if (Array.isArray(value)) {
            return value;
        }

        if (typeof value === 'string') {
            // Treat as single-item array
            return [value];
        }

        return undefined;
    }

    /**
     * Extract title from markdown body (first heading)
     * @private
     */
    private extractTitleFromBody(body: string): string | null {
        const headingMatch = body.match(/^#\s+(.+)$/m);
        return headingMatch ? headingMatch[1].trim() : null;
    }

    /**
     * Generate ID from file path
     * @private
     */
    private generateIdFromPath(filePath: string): string {
        const basename = path.basename(filePath, '.md');
        // If filename already has session- prefix, use it
        if (basename.startsWith('session-')) {
            return basename;
        }
        // Otherwise, generate timestamp-based ID
        return `session-${Date.now()}`;
    }

    /**
     * Extract date from file path (from YYYY-MM directory)
     * Returns first day of month as default
     * @private
     */
    private extractDateFromPath(filePath: string): string {
        const monthMatch = filePath.match(/(\d{4}-\d{2})/);
        if (monthMatch) {
            return `${monthMatch[1]}-01`;
        }
        // Fallback to today's date
        return new Date().toISOString().split('T')[0];
    }

    /**
     * Get the appropriate month directory for a given date
     * Creates the directory if it doesn't exist
     * @param date Date string (YYYY-MM-DD or Date object)
     * @returns Path to month directory
     */
    getSessionFolder(date: string | Date): string {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        const month = dateObj.toISOString().substring(0, 7); // YYYY-MM
        const monthDir = path.join(this.sessionsRoot, month);

        logger.debug(
            LogCategory.DATA,
            'Getting session folder for date',
            'getSessionFolder',
            { date, month, monthDir },
            LogPathway.DATA_INGESTION
        );

        return monthDir;
    }

    /**
     * Get default end time (startTime + 1 hour) for sessions without endTime
     * @param startTime ISO 8601 timestamp string
     * @returns ISO 8601 timestamp string (startTime + 1 hour)
     * @private
     */
    private getDefaultEndTime(startTime: string): string {
        const start = new Date(startTime);
        const end = new Date(start.getTime() + 60 * 60 * 1000); // +1 hour
        return end.toISOString();
    }

    /**
     * Ensure a month directory exists
     * Creates it if missing
     */
    async ensureMonthDirectory(month: string): Promise<void> {
        const monthDir = path.join(this.sessionsRoot, month);

        try {
            if (!fs.existsSync(monthDir)) {
                await fs.promises.mkdir(monthDir, { recursive: true });

                logger.debug(
                    LogCategory.DATA,
                    'Created month directory',
                    'ensureMonthDirectory',
                    { month, monthDir },
                    LogPathway.DATA_INGESTION
                );
            }
        } catch (error) {
            logger.error(
                LogCategory.DATA,
                'Failed to create month directory',
                'ensureMonthDirectory',
                {
                    month,
                    error: error instanceof Error ? error.message : String(error)
                }
            );
            throw error;
        }
    }
}
