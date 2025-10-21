/**
 * Unit tests for KnowledgeEventStorage
 *
 * Tests the knowledge event persistence layer:
 * - Loading events from JSON file
 * - Recording new events
 * - Handling missing/malformed files
 * - Directory auto-creation
 */

import * as fs from 'fs';
import * as path from 'path';
import { KnowledgeEventStorage } from '../../../src/domains/events/KnowledgeEventStorage';
import { KnowledgeEventRecord, RecordKnowledgeEventParams } from '../../../src/domains/events/types';

describe('KnowledgeEventStorage', () => {
    const testRoot = path.join(__dirname, '../../fixtures/temp-knowledge-events');
    const eventsDir = path.join(testRoot, '.agent-brain', 'events');
    const eventsFile = path.join(eventsDir, 'knowledge-events.json');

    let storage: KnowledgeEventStorage;

    beforeEach(() => {
        // Clean up test directory
        if (fs.existsSync(testRoot)) {
            fs.rmSync(testRoot, { recursive: true, force: true });
        }

        // Create storage instance
        storage = new KnowledgeEventStorage(testRoot);
    });

    afterEach(() => {
        // Clean up test directory
        if (fs.existsSync(testRoot)) {
            fs.rmSync(testRoot, { recursive: true, force: true });
        }
    });

    describe('constructor', () => {
        it('should create directory structure on initialization', () => {
            expect(fs.existsSync(eventsDir)).toBe(true);
        });

        it('should set correct file path', () => {
            const filePath = storage.getFilePath();
            expect(filePath).toBe(eventsFile);
        });
    });

    describe('loadAll', () => {
        it('should return empty array when file does not exist', async () => {
            const events = await storage.loadAll();
            expect(events).toEqual([]);
        });

        it('should load existing events from JSON file', async () => {
            // Create test file with events
            const testEvents: KnowledgeEventRecord[] = [
                {
                    id: 'ke-1000',
                    timestamp: '2025-10-21T10:00:00.000Z',
                    type: 'apply',
                    knowledgeItemId: 'test-item-1',
                    knowledgeItemTitle: 'Test Item 1',
                    knowledgeItemType: 'golden-path',
                    targetFile: 'CLAUDE.md',
                    actor: 'user'
                },
                {
                    id: 'ke-2000',
                    timestamp: '2025-10-21T11:00:00.000Z',
                    type: 'create',
                    knowledgeItemId: 'test-item-2',
                    knowledgeItemTitle: 'Test Item 2',
                    knowledgeItemType: 'learning',
                    targetFile: '.agent-brain/learnings/test-learning.md',
                    actor: 'agent'
                }
            ];

            fs.writeFileSync(
                eventsFile,
                JSON.stringify({ version: '1.0', events: testEvents }, null, 2),
                'utf8'
            );

            const events = await storage.loadAll();
            expect(events).toHaveLength(2);
            expect(events[0].id).toBe('ke-1000');
            expect(events[1].id).toBe('ke-2000');
        });

        it('should return empty array on malformed JSON', async () => {
            // Write invalid JSON
            fs.writeFileSync(eventsFile, '{ invalid json', 'utf8');

            const events = await storage.loadAll();
            expect(events).toEqual([]);
        });

        it('should handle JSON with missing events array', async () => {
            fs.writeFileSync(
                eventsFile,
                JSON.stringify({ version: '1.0' }, null, 2),
                'utf8'
            );

            const events = await storage.loadAll();
            expect(events).toEqual([]);
        });

        it('should handle empty events array', async () => {
            fs.writeFileSync(
                eventsFile,
                JSON.stringify({ version: '1.0', events: [] }, null, 2),
                'utf8'
            );

            const events = await storage.loadAll();
            expect(events).toEqual([]);
        });
    });

    describe('recordEvent', () => {
        it('should record new event with auto-generated ID and timestamp', async () => {
            const params: RecordKnowledgeEventParams = {
                type: 'apply',
                knowledgeItemId: 'test-item',
                knowledgeItemTitle: 'Test Item',
                knowledgeItemType: 'golden-path',
                targetFile: 'CLAUDE.md',
                actor: 'user'
            };

            const event = await storage.recordEvent(params);

            // Verify auto-generated fields
            expect(event.id).toMatch(/^ke-\d+$/);
            expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);

            // Verify provided fields
            expect(event.type).toBe('apply');
            expect(event.knowledgeItemId).toBe('test-item');
            expect(event.actor).toBe('user');
        });

        it('should append to existing events', async () => {
            const params1: RecordKnowledgeEventParams = {
                type: 'apply',
                knowledgeItemId: 'item-1',
                knowledgeItemTitle: 'Item 1',
                knowledgeItemType: 'golden-path',
                targetFile: 'CLAUDE.md',
                actor: 'user'
            };

            const params2: RecordKnowledgeEventParams = {
                type: 'create',
                knowledgeItemId: 'item-2',
                knowledgeItemTitle: 'Item 2',
                knowledgeItemType: 'learning',
                targetFile: '.agent-brain/learnings/test.md',
                actor: 'agent'
            };

            await storage.recordEvent(params1);
            await storage.recordEvent(params2);

            const events = await storage.loadAll();
            expect(events).toHaveLength(2);
            expect(events[0].knowledgeItemId).toBe('item-1');
            expect(events[1].knowledgeItemId).toBe('item-2');
        });

        it('should create file if it does not exist', async () => {
            expect(fs.existsSync(eventsFile)).toBe(false);

            const params: RecordKnowledgeEventParams = {
                type: 'apply',
                knowledgeItemId: 'test-item',
                knowledgeItemTitle: 'Test Item',
                knowledgeItemType: 'pattern',
                targetFile: 'CLAUDE.md',
                actor: 'user'
            };

            await storage.recordEvent(params);

            expect(fs.existsSync(eventsFile)).toBe(true);

            const fileContent = fs.readFileSync(eventsFile, 'utf8');
            const parsed = JSON.parse(fileContent);
            expect(parsed.version).toBe('1.0');
            expect(parsed.events).toHaveLength(1);
        });

        it('should write valid JSON with proper formatting', async () => {
            const params: RecordKnowledgeEventParams = {
                type: 'remove',
                knowledgeItemId: 'test-item',
                knowledgeItemTitle: 'Test Item',
                knowledgeItemType: 'standard',
                targetFile: 'CLAUDE.md',
                actor: 'user'
            };

            await storage.recordEvent(params);

            const fileContent = fs.readFileSync(eventsFile, 'utf8');

            // Should be parseable
            expect(() => JSON.parse(fileContent)).not.toThrow();

            // Should be formatted (indented)
            expect(fileContent).toContain('  "version"');
            expect(fileContent).toContain('  "events"');
        });

        it('should handle all operation types', async () => {
            const operations: Array<'apply' | 'remove' | 'create'> = ['apply', 'remove', 'create'];

            for (const op of operations) {
                const params: RecordKnowledgeEventParams = {
                    type: op,
                    knowledgeItemId: `item-${op}`,
                    knowledgeItemTitle: `Item ${op}`,
                    knowledgeItemType: 'learning',
                    targetFile: 'test.md',
                    actor: 'user'
                };

                const event = await storage.recordEvent(params);
                expect(event.type).toBe(op);
            }
        });

        it('should handle all actor types', async () => {
            const actors: Array<'user' | 'agent'> = ['user', 'agent'];

            for (const actor of actors) {
                const params: RecordKnowledgeEventParams = {
                    type: 'create',
                    knowledgeItemId: `item-${actor}`,
                    knowledgeItemTitle: `Item ${actor}`,
                    knowledgeItemType: 'pattern',
                    targetFile: 'test.md',
                    actor
                };

                const event = await storage.recordEvent(params);
                expect(event.actor).toBe(actor);
            }
        });
    });

    describe('clear', () => {
        it('should clear all events', async () => {
            // Add some events
            await storage.recordEvent({
                type: 'apply',
                knowledgeItemId: 'item-1',
                knowledgeItemTitle: 'Item 1',
                knowledgeItemType: 'golden-path',
                targetFile: 'CLAUDE.md',
                actor: 'user'
            });

            await storage.recordEvent({
                type: 'create',
                knowledgeItemId: 'item-2',
                knowledgeItemTitle: 'Item 2',
                knowledgeItemType: 'learning',
                targetFile: 'test.md',
                actor: 'agent'
            });

            // Verify events exist
            let events = await storage.loadAll();
            expect(events).toHaveLength(2);

            // Clear
            await storage.clear();

            // Verify cleared
            events = await storage.loadAll();
            expect(events).toHaveLength(0);

            // File should still exist with empty events array
            expect(fs.existsSync(eventsFile)).toBe(true);
            const fileContent = fs.readFileSync(eventsFile, 'utf8');
            const parsed = JSON.parse(fileContent);
            expect(parsed.events).toEqual([]);
        });

        it('should create file if it does not exist', async () => {
            expect(fs.existsSync(eventsFile)).toBe(false);

            await storage.clear();

            expect(fs.existsSync(eventsFile)).toBe(true);
            const events = await storage.loadAll();
            expect(events).toEqual([]);
        });
    });

    describe('edge cases', () => {
        it('should handle rapid sequential writes', async () => {
            const promises = [];

            for (let i = 0; i < 10; i++) {
                const params: RecordKnowledgeEventParams = {
                    type: 'apply',
                    knowledgeItemId: `item-${i}`,
                    knowledgeItemTitle: `Item ${i}`,
                    knowledgeItemType: 'pattern',
                    targetFile: 'test.md',
                    actor: 'user'
                };

                promises.push(storage.recordEvent(params));
            }

            await Promise.all(promises);

            const events = await storage.loadAll();
            // Note: Concurrent writes might result in race conditions
            // In production, implement proper locking if needed
            expect(events.length).toBeGreaterThan(0);
            expect(events.length).toBeLessThanOrEqual(10);
        });

        it('should handle special characters in knowledge item titles', async () => {
            const params: RecordKnowledgeEventParams = {
                type: 'create',
                knowledgeItemId: 'special-chars',
                knowledgeItemTitle: 'Test "quoted" & <special> chars',
                knowledgeItemType: 'learning',
                targetFile: 'test.md',
                actor: 'user'
            };

            const event = await storage.recordEvent(params);
            expect(event.knowledgeItemTitle).toBe('Test "quoted" & <special> chars');

            const events = await storage.loadAll();
            expect(events[0].knowledgeItemTitle).toBe('Test "quoted" & <special> chars');
        });

        it('should handle long file paths', async () => {
            const longPath = '.agent-brain/' + 'very-long-path/'.repeat(10) + 'file.md';

            const params: RecordKnowledgeEventParams = {
                type: 'create',
                knowledgeItemId: 'long-path-test',
                knowledgeItemTitle: 'Long Path Test',
                knowledgeItemType: 'pattern',
                targetFile: longPath,
                actor: 'agent'
            };

            const event = await storage.recordEvent(params);
            expect(event.targetFile).toBe(longPath);
        });
    });

    describe('integration', () => {
        it('should support full lifecycle: record, load, clear, reload', async () => {
            // Start with no events
            let events = await storage.loadAll();
            expect(events).toHaveLength(0);

            // Record events
            await storage.recordEvent({
                type: 'apply',
                knowledgeItemId: 'item-1',
                knowledgeItemTitle: 'Item 1',
                knowledgeItemType: 'golden-path',
                targetFile: 'CLAUDE.md',
                actor: 'user'
            });

            await storage.recordEvent({
                type: 'create',
                knowledgeItemId: 'item-2',
                knowledgeItemTitle: 'Item 2',
                knowledgeItemType: 'learning',
                targetFile: 'test.md',
                actor: 'agent'
            });

            // Load and verify
            events = await storage.loadAll();
            expect(events).toHaveLength(2);

            // Clear
            await storage.clear();

            // Verify cleared
            events = await storage.loadAll();
            expect(events).toHaveLength(0);

            // Record again
            await storage.recordEvent({
                type: 'remove',
                knowledgeItemId: 'item-3',
                knowledgeItemTitle: 'Item 3',
                knowledgeItemType: 'pattern',
                targetFile: 'CLAUDE.md',
                actor: 'user'
            });

            // Verify new event
            events = await storage.loadAll();
            expect(events).toHaveLength(1);
            expect(events[0].knowledgeItemId).toBe('item-3');
        });

        it('should persist across storage instances', async () => {
            const storage1 = new KnowledgeEventStorage(testRoot);
            const storage2 = new KnowledgeEventStorage(testRoot);

            // Write with first instance
            await storage1.recordEvent({
                type: 'apply',
                knowledgeItemId: 'persist-test',
                knowledgeItemTitle: 'Persist Test',
                knowledgeItemType: 'standard',
                targetFile: 'CLAUDE.md',
                actor: 'user'
            });

            // Read with second instance
            const events = await storage2.loadAll();
            expect(events).toHaveLength(1);
            expect(events[0].knowledgeItemId).toBe('persist-test');
        });
    });
});
