/**
 * Knowledge Event Storage
 *
 * Manages persistence of knowledge-related events to JSON file.
 * Events are stored in `.agent-brain/events/knowledge-events.json` and track:
 * - When users apply/remove knowledge items
 * - When coding agents create new knowledge items
 *
 * This provides timeline visibility into knowledge usage patterns.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
    KnowledgeEventRecord,
    KnowledgeEventsFile,
    RecordKnowledgeEventParams
} from './types';
import { logger, LogCategory, LogPathway } from '../../infrastructure/logging/Logger';

/**
 * Handles reading and writing knowledge events to JSON file
 */
export class KnowledgeEventStorage {
    private readonly filePath: string;
    private readonly dirPath: string;

    /**
     * Creates a new KnowledgeEventStorage instance
     * @param workspaceRoot Root directory of the workspace
     */
    constructor(workspaceRoot: string) {
        this.dirPath = path.join(workspaceRoot, '.agent-brain', 'events');
        this.filePath = path.join(this.dirPath, 'knowledge-events.json');

        logger.debug(
            LogCategory.DATA,
            'KnowledgeEventStorage initialized',
            'constructor',
            { filePath: this.filePath },
            LogPathway.KNOWLEDGE_MANAGEMENT
        );

        // Ensure directory exists
        this.ensureDirectoryExists();
    }

    /**
     * Loads all knowledge events from the JSON file
     * @returns Array of knowledge event records (empty if file doesn't exist)
     */
    async loadAll(): Promise<KnowledgeEventRecord[]> {
        logger.debug(
            LogCategory.DATA,
            'Loading knowledge events',
            'loadAll',
            undefined,
            LogPathway.KNOWLEDGE_MANAGEMENT
        );

        try {
            if (!fs.existsSync(this.filePath)) {
                logger.debug(
                    LogCategory.DATA,
                    'Knowledge events file does not exist, returning empty array',
                    'loadAll',
                    { filePath: this.filePath },
                    LogPathway.KNOWLEDGE_MANAGEMENT
                );
                return [];
            }

            const data = await fs.promises.readFile(this.filePath, 'utf8');
            const parsed: KnowledgeEventsFile = JSON.parse(data);

            logger.debug(
                LogCategory.DATA,
                'Knowledge events loaded successfully',
                'loadAll',
                { count: parsed.events?.length || 0 },
                LogPathway.KNOWLEDGE_MANAGEMENT
            );

            return parsed.events || [];
        } catch (error) {
            logger.error(
                LogCategory.DATA,
                'Failed to load knowledge events',
                'loadAll',
                { error: error instanceof Error ? error.message : String(error) }
            );

            // Return empty array on error (graceful degradation)
            return [];
        }
    }

    /**
     * Records a new knowledge event
     * Automatically generates ID and timestamp
     *
     * @param params Event parameters (id and timestamp auto-generated)
     * @returns The complete event record that was saved
     */
    async recordEvent(params: RecordKnowledgeEventParams): Promise<KnowledgeEventRecord> {
        logger.debug(
            LogCategory.DATA,
            'Recording knowledge event',
            'recordEvent',
            {
                type: params.type,
                knowledgeItemId: params.knowledgeItemId,
                actor: params.actor
            },
            LogPathway.KNOWLEDGE_MANAGEMENT
        );

        try {
            // Load existing events
            const events = await this.loadAll();

            // Create new event with auto-generated ID and timestamp
            const newEvent: KnowledgeEventRecord = {
                id: `ke-${Date.now()}`,
                timestamp: new Date().toISOString(),
                ...params
            };

            // Append to events array
            events.push(newEvent);

            // Save back to file
            const fileData: KnowledgeEventsFile = {
                version: '1.0',
                events
            };

            await fs.promises.writeFile(
                this.filePath,
                JSON.stringify(fileData, null, 2),
                'utf8'
            );

            logger.debug(
                LogCategory.DATA,
                'Knowledge event recorded successfully',
                'recordEvent',
                {
                    id: newEvent.id,
                    totalEvents: events.length
                },
                LogPathway.KNOWLEDGE_MANAGEMENT
            );

            return newEvent;
        } catch (error) {
            logger.error(
                LogCategory.DATA,
                'Failed to record knowledge event',
                'recordEvent',
                { error: error instanceof Error ? error.message : String(error) }
            );

            throw error;
        }
    }

    /**
     * Ensures the .agent-brain/events directory exists
     * Creates it if missing
     * @private
     */
    private ensureDirectoryExists(): void {
        try {
            if (!fs.existsSync(this.dirPath)) {
                fs.mkdirSync(this.dirPath, { recursive: true });

                logger.debug(
                    LogCategory.DATA,
                    'Created knowledge events directory',
                    'ensureDirectoryExists',
                    { dirPath: this.dirPath },
                    LogPathway.KNOWLEDGE_MANAGEMENT
                );
            }
        } catch (error) {
            logger.error(
                LogCategory.DATA,
                'Failed to create knowledge events directory',
                'ensureDirectoryExists',
                { error: error instanceof Error ? error.message : String(error) }
            );

            throw error;
        }
    }

    /**
     * Gets the file path where events are stored
     * Useful for testing and debugging
     * @returns Absolute path to knowledge-events.json
     */
    getFilePath(): string {
        return this.filePath;
    }

    /**
     * Clears all events (use with caution!)
     * Primarily for testing purposes
     */
    async clear(): Promise<void> {
        logger.warn(
            LogCategory.DATA,
            'Clearing all knowledge events',
            'clear',
            undefined,
            LogPathway.KNOWLEDGE_MANAGEMENT
        );

        try {
            const fileData: KnowledgeEventsFile = {
                version: '1.0',
                events: []
            };

            await fs.promises.writeFile(
                this.filePath,
                JSON.stringify(fileData, null, 2),
                'utf8'
            );

            logger.debug(
                LogCategory.DATA,
                'Knowledge events cleared',
                'clear',
                undefined,
                LogPathway.KNOWLEDGE_MANAGEMENT
            );
        } catch (error) {
            logger.error(
                LogCategory.DATA,
                'Failed to clear knowledge events',
                'clear',
                { error: error instanceof Error ? error.message : String(error) }
            );

            throw error;
        }
    }
}
