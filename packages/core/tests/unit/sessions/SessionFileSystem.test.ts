/**
 * Unit tests for SessionFileSystem
 *
 * Tests the session journal file loading and parsing:
 * - Month directory scanning (YYYY-MM)
 * - Loading sessions from specific months
 * - Loading all sessions across months
 * - YAML frontmatter parsing
 * - Graceful error handling
 */

import * as fs from 'fs';
import * as path from 'path';
import { SessionFileSystem } from '../../../src/domains/sessions/SessionFileSystem';
import { SessionJournal } from '../../../src/domains/sessions/types';

describe('SessionFileSystem', () => {
    const testRoot = path.join(__dirname, '../../fixtures/temp-sessions');
    const sessionsRoot = path.join(testRoot, '.agent-brain', 'sessions');

    let filesystem: SessionFileSystem;

    beforeEach(() => {
        // Clean up test directory
        if (fs.existsSync(testRoot)) {
            fs.rmSync(testRoot, { recursive: true, force: true });
        }

        // Create sessions root directory
        fs.mkdirSync(sessionsRoot, { recursive: true });

        // Create filesystem instance
        filesystem = new SessionFileSystem(testRoot);
    });

    afterEach(() => {
        // Clean up test directory
        if (fs.existsSync(testRoot)) {
            fs.rmSync(testRoot, { recursive: true, force: true });
        }
    });

    describe('getMonthDirectories', () => {
        it('should return empty array when no month directories exist', async () => {
            const months = await filesystem.getMonthDirectories();
            expect(months).toEqual([]);
        });

        it('should find valid month directories (YYYY-MM)', async () => {
            // Create month directories
            fs.mkdirSync(path.join(sessionsRoot, '2025-10'), { recursive: true });
            fs.mkdirSync(path.join(sessionsRoot, '2025-09'), { recursive: true });
            fs.mkdirSync(path.join(sessionsRoot, '2024-12'), { recursive: true });

            // Create some session files
            fs.writeFileSync(path.join(sessionsRoot, '2025-10', 'session1.md'), 'test');
            fs.writeFileSync(path.join(sessionsRoot, '2025-10', 'session2.md'), 'test');
            fs.writeFileSync(path.join(sessionsRoot, '2025-09', 'session3.md'), 'test');

            const months = await filesystem.getMonthDirectories();

            expect(months).toHaveLength(3);
            expect(months[0].month).toBe('2025-10');
            expect(months[1].month).toBe('2025-09');
            expect(months[2].month).toBe('2024-12');
            expect(months[0].sessionCount).toBe(2);
            expect(months[1].sessionCount).toBe(1);
            expect(months[2].sessionCount).toBe(0);
        });

        it('should sort months chronologically (newest first)', async () => {
            fs.mkdirSync(path.join(sessionsRoot, '2024-01'), { recursive: true });
            fs.mkdirSync(path.join(sessionsRoot, '2025-12'), { recursive: true });
            fs.mkdirSync(path.join(sessionsRoot, '2025-06'), { recursive: true });

            const months = await filesystem.getMonthDirectories();

            expect(months[0].month).toBe('2025-12');
            expect(months[1].month).toBe('2025-06');
            expect(months[2].month).toBe('2024-01');
        });

        it('should ignore non-YYYY-MM directories', async () => {
            fs.mkdirSync(path.join(sessionsRoot, '2025-10'), { recursive: true });
            fs.mkdirSync(path.join(sessionsRoot, 'invalid'), { recursive: true });
            fs.mkdirSync(path.join(sessionsRoot, '2025'), { recursive: true });
            fs.mkdirSync(path.join(sessionsRoot, '25-10'), { recursive: true });

            const months = await filesystem.getMonthDirectories();

            expect(months).toHaveLength(1);
            expect(months[0].month).toBe('2025-10');
        });

        it('should ignore files in sessions root', async () => {
            fs.mkdirSync(path.join(sessionsRoot, '2025-10'), { recursive: true });
            fs.writeFileSync(path.join(sessionsRoot, 'readme.txt'), 'test');

            const months = await filesystem.getMonthDirectories();

            expect(months).toHaveLength(1);
            expect(months[0].month).toBe('2025-10');
        });
    });

    describe('loadSessionsForMonth', () => {
        it('should return empty array for non-existent month', async () => {
            const sessions = await filesystem.loadSessionsForMonth('2025-10');
            expect(sessions).toEqual([]);
        });

        it('should load sessions from month directory', async () => {
            const monthDir = path.join(sessionsRoot, '2025-10');
            fs.mkdirSync(monthDir, { recursive: true });

            // Create session files with frontmatter
            const session1Content = `---
id: session-1
title: Test Session 1
date: 2025-10-15
summary: A test session
tags: testing, unit-test
topics: sessions
filesModified:
  - src/test.ts
  - src/another.ts
knowledgeItemsUsed:
  - golden-path-testing
---

# Test Session 1

This is the session content.
`;

            const session2Content = `---
id: session-2
title: Test Session 2
date: 2025-10-20
---

# Test Session 2

Another session.
`;

            fs.writeFileSync(path.join(monthDir, 'session1.md'), session1Content);
            fs.writeFileSync(path.join(monthDir, 'session2.md'), session2Content);

            const sessions = await filesystem.loadSessionsForMonth('2025-10');

            expect(sessions).toHaveLength(2);

            const session1 = sessions.find(s => s.id === 'session-1');
            expect(session1).toBeDefined();
            expect(session1?.title).toBe('Test Session 1');
            expect(session1?.date).toBe('2025-10-15');
            expect(session1?.summary).toBe('A test session');
            expect(session1?.tags).toEqual(['testing', 'unit-test']);
            expect(session1?.topics).toEqual(['sessions']);
            expect(session1?.filesModified).toEqual(['src/test.ts', 'src/another.ts']);
            expect(session1?.knowledgeItemsUsed).toEqual(['golden-path-testing']);
            expect(session1?.content).toContain('This is the session content');
        });

        it('should handle sessions without frontmatter', async () => {
            const monthDir = path.join(sessionsRoot, '2025-10');
            fs.mkdirSync(monthDir, { recursive: true });

            const content = `# My Session

Just some content without frontmatter.
`;

            fs.writeFileSync(path.join(monthDir, 'session-no-fm.md'), content);

            const sessions = await filesystem.loadSessionsForMonth('2025-10');

            expect(sessions).toHaveLength(1);
            expect(sessions[0].title).toBe('My Session'); // Extracted from heading
            expect(sessions[0].content).toContain('Just some content');
        });

        it('should extract title from heading if not in frontmatter', async () => {
            const monthDir = path.join(sessionsRoot, '2025-10');
            fs.mkdirSync(monthDir, { recursive: true });

            const content = `---
id: session-3
date: 2025-10-15
---

# Extracted Title

Content here.
`;

            fs.writeFileSync(path.join(monthDir, 'session.md'), content);

            const sessions = await filesystem.loadSessionsForMonth('2025-10');

            expect(sessions[0].title).toBe('Extracted Title');
        });

        it('should use filename as fallback title', async () => {
            const monthDir = path.join(sessionsRoot, '2025-10');
            fs.mkdirSync(monthDir, { recursive: true });

            const content = `---
id: session-4
date: 2025-10-15
---

Some content without a heading.
`;

            fs.writeFileSync(path.join(monthDir, 'my-special-session.md'), content);

            const sessions = await filesystem.loadSessionsForMonth('2025-10');

            expect(sessions[0].title).toBe('my-special-session');
        });

        it('should generate ID from filename if missing', async () => {
            const monthDir = path.join(sessionsRoot, '2025-10');
            fs.mkdirSync(monthDir, { recursive: true });

            const content = `---
title: Test
date: 2025-10-15
---

Content.
`;

            fs.writeFileSync(path.join(monthDir, 'session-12345.md'), content);

            const sessions = await filesystem.loadSessionsForMonth('2025-10');

            expect(sessions[0].id).toBe('session-12345');
        });

        it('should extract date from path if missing from frontmatter', async () => {
            const monthDir = path.join(sessionsRoot, '2025-10');
            fs.mkdirSync(monthDir, { recursive: true });

            const content = `---
title: Test
---

Content.
`;

            fs.writeFileSync(path.join(monthDir, 'session.md'), content);

            const sessions = await filesystem.loadSessionsForMonth('2025-10');

            expect(sessions[0].date).toBe('2025-10-01');
        });

        it('should parse tags as comma-separated string', async () => {
            const monthDir = path.join(sessionsRoot, '2025-10');
            fs.mkdirSync(monthDir, { recursive: true });

            const content = `---
title: Test
date: 2025-10-15
tags: tag1, tag2, tag3
---

Content.
`;

            fs.writeFileSync(path.join(monthDir, 'session.md'), content);

            const sessions = await filesystem.loadSessionsForMonth('2025-10');

            expect(sessions[0].tags).toEqual(['tag1', 'tag2', 'tag3']);
        });

        it('should skip malformed files and continue loading', async () => {
            const monthDir = path.join(sessionsRoot, '2025-10');
            fs.mkdirSync(monthDir, { recursive: true });

            // Good file
            fs.writeFileSync(path.join(monthDir, 'good.md'), `---
title: Good
date: 2025-10-15
---

Good content.
`);

            // Create a file that will cause parsing issues
            // (though our parser is pretty resilient)
            fs.writeFileSync(path.join(monthDir, 'bad.md'), 'incomplete frontmatter\n---');

            // Another good file
            fs.writeFileSync(path.join(monthDir, 'good2.md'), `---
title: Good 2
date: 2025-10-16
---

More good content.
`);

            const sessions = await filesystem.loadSessionsForMonth('2025-10');

            // Should get at least the good files
            expect(sessions.length).toBeGreaterThanOrEqual(2);
        });

        it('should ignore non-markdown files', async () => {
            const monthDir = path.join(sessionsRoot, '2025-10');
            fs.mkdirSync(monthDir, { recursive: true });

            fs.writeFileSync(path.join(monthDir, 'session.md'), `---
title: Markdown
date: 2025-10-15
---

Content.
`);
            fs.writeFileSync(path.join(monthDir, 'readme.txt'), 'Text file');
            fs.writeFileSync(path.join(monthDir, 'image.png'), 'fake image');

            const sessions = await filesystem.loadSessionsForMonth('2025-10');

            expect(sessions).toHaveLength(1);
            expect(sessions[0].title).toBe('Markdown');
        });
    });

    describe('loadAllSessions', () => {
        it('should load sessions from all months', async () => {
            // Create multiple months
            const month1 = path.join(sessionsRoot, '2025-10');
            const month2 = path.join(sessionsRoot, '2025-09');
            const month3 = path.join(sessionsRoot, '2024-12');

            fs.mkdirSync(month1, { recursive: true });
            fs.mkdirSync(month2, { recursive: true });
            fs.mkdirSync(month3, { recursive: true });

            // Add sessions to each month
            fs.writeFileSync(path.join(month1, 's1.md'), `---
title: Oct Session
date: 2025-10-15
---
Oct content.
`);
            fs.writeFileSync(path.join(month2, 's2.md'), `---
title: Sep Session
date: 2025-09-20
---
Sep content.
`);
            fs.writeFileSync(path.join(month3, 's3.md'), `---
title: Dec Session
date: 2024-12-25
---
Dec content.
`);

            const allSessions = await filesystem.loadAllSessions();

            expect(allSessions).toHaveLength(3);

            // Should be sorted by date (newest first)
            expect(allSessions[0].date).toBe('2025-10-15');
            expect(allSessions[1].date).toBe('2025-09-20');
            expect(allSessions[2].date).toBe('2024-12-25');
        });

        it('should return empty array when no sessions exist', async () => {
            const allSessions = await filesystem.loadAllSessions();
            expect(allSessions).toEqual([]);
        });
    });

    describe('getSessionMetadata', () => {
        it('should load lightweight metadata without full content', async () => {
            const monthDir = path.join(sessionsRoot, '2025-10');
            fs.mkdirSync(monthDir, { recursive: true });

            const largeContent = `---
id: session-meta
title: Metadata Test
date: 2025-10-15
---

${'#'.repeat(1000)} Large content that we don't want to load for metadata
`;

            fs.writeFileSync(path.join(monthDir, 'session.md'), largeContent);

            const metadata = await filesystem.getSessionMetadata();

            expect(metadata).toHaveLength(1);
            expect(metadata[0].id).toBe('session-meta');
            expect(metadata[0].title).toBe('Metadata Test');
            expect(metadata[0].date).toBe('2025-10-15');
            expect(metadata[0].fileSize).toBeGreaterThan(0);
            expect(metadata[0].lastModified).toBeInstanceOf(Date);
        });
    });

    describe('getSessionFolder', () => {
        it('should return correct month folder for date string', () => {
            const folder = filesystem.getSessionFolder('2025-10-15');
            expect(folder).toContain('2025-10');
        });

        it('should return correct month folder for Date object', () => {
            const date = new Date('2025-10-15');
            const folder = filesystem.getSessionFolder(date);
            expect(folder).toContain('2025-10');
        });
    });

    describe('ensureMonthDirectory', () => {
        it('should create month directory if missing', async () => {
            const monthDir = path.join(sessionsRoot, '2025-10');
            expect(fs.existsSync(monthDir)).toBe(false);

            await filesystem.ensureMonthDirectory('2025-10');

            expect(fs.existsSync(monthDir)).toBe(true);
        });

        it('should not error if directory already exists', async () => {
            const monthDir = path.join(sessionsRoot, '2025-10');
            fs.mkdirSync(monthDir, { recursive: true });

            await expect(filesystem.ensureMonthDirectory('2025-10')).resolves.not.toThrow();
        });
    });

    describe('edge cases', () => {
        it('should handle special characters in session titles', async () => {
            const monthDir = path.join(sessionsRoot, '2025-10');
            fs.mkdirSync(monthDir, { recursive: true });

            const content = `---
title: Test "quoted" & <special> chars
date: 2025-10-15
---

Content.
`;

            fs.writeFileSync(path.join(monthDir, 'session.md'), content);

            const sessions = await filesystem.loadSessionsForMonth('2025-10');

            expect(sessions[0].title).toBe('Test "quoted" & <special> chars');
        });

        it('should handle empty frontmatter fields', async () => {
            const monthDir = path.join(sessionsRoot, '2025-10');
            fs.mkdirSync(monthDir, { recursive: true });

            const content = `---
title: Test
date: 2025-10-15
summary:
tags:
topics:
---

Content.
`;

            fs.writeFileSync(path.join(monthDir, 'session.md'), content);

            const sessions = await filesystem.loadSessionsForMonth('2025-10');

            expect(sessions[0].summary).toBeUndefined();
            expect(sessions[0].tags).toEqual([]);
            expect(sessions[0].topics).toEqual([]);
        });

        it('should handle very long file paths', async () => {
            const longMonthName = '2025-10';
            const monthDir = path.join(sessionsRoot, longMonthName);
            fs.mkdirSync(monthDir, { recursive: true });

            const longFilename = 'session-' + 'x'.repeat(200) + '.md';

            const content = `---
title: Long Path Test
date: 2025-10-15
---

Content.
`;

            fs.writeFileSync(path.join(monthDir, longFilename), content);

            const sessions = await filesystem.loadSessionsForMonth('2025-10');

            expect(sessions.length).toBeGreaterThan(0);
        });
    });
});
