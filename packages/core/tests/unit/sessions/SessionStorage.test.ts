/**
 * SessionStorage Unit Tests
 *
 * Tests for persistent session storage.
 * Uses temporary directories for isolated testing.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { SessionStorage } from '../../../src/domains/sessions/SessionStorage';
import { Session, AgentType, SessionStatus } from '../../../src/domains/sessions/types';

describe('SessionStorage', () => {
  let storage: SessionStorage;
  let tempDir: string;

  beforeEach(async () => {
    // Create unique temp directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-brain-test-'));
    storage = new SessionStorage({
      storagePath: tempDir,
      maxSessions: 5 // Small limit for testing
    });
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  // ========================================
  // Helper Functions
  // ========================================

  const createTestSession = (overrides?: Partial<Session>): Session => {
    const now = new Date();
    return {
      id: `session-${Date.now()}-${Math.random()}`,
      prompt: 'Test session',
      agentType: 'claude',
      startTime: now,
      status: 'completed',
      activities: [],
      ...overrides
    };
  };

  // ========================================
  // Basic CRUD Operations
  // ========================================

  describe('Basic Operations', () => {
    it('should save and load a single session', async () => {
      const session = createTestSession({ prompt: 'Add authentication' });

      await storage.saveSession(session);
      const loaded = await storage.loadAllSessions();

      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe(session.id);
      expect(loaded[0].prompt).toBe('Add authentication');
      expect(loaded[0].agentType).toBe('claude');
      expect(loaded[0].status).toBe('completed');
    });

    it('should deserialize Date objects correctly', async () => {
      const startTime = new Date('2025-10-07T10:00:00Z');
      const endTime = new Date('2025-10-07T11:00:00Z');

      const session = createTestSession({
        startTime,
        endTime,
        activities: [
          {
            id: 'act-1',
            type: 'file-save',
            timestamp: new Date('2025-10-07T10:30:00Z'),
            metadata: { filePath: 'test.ts' }
          }
        ]
      });

      await storage.saveSession(session);
      const loaded = await storage.loadAllSessions();

      expect(loaded[0].startTime).toBeInstanceOf(Date);
      expect(loaded[0].endTime).toBeInstanceOf(Date);
      expect(loaded[0].startTime.toISOString()).toBe(startTime.toISOString());
      expect(loaded[0].endTime?.toISOString()).toBe(endTime.toISOString());
      expect(loaded[0].activities[0].timestamp).toBeInstanceOf(Date);
    });

    it('should save multiple sessions', async () => {
      const sessions = [
        createTestSession({ prompt: 'Session 1' }),
        createTestSession({ prompt: 'Session 2' }),
        createTestSession({ prompt: 'Session 3' })
      ];

      for (const session of sessions) {
        await storage.saveSession(session);
      }

      const loaded = await storage.loadAllSessions();
      expect(loaded).toHaveLength(3);
      expect(loaded.map(s => s.prompt)).toEqual(['Session 1', 'Session 2', 'Session 3']);
    });

    it('should return empty array when no sessions exist', async () => {
      const loaded = await storage.loadAllSessions();
      expect(loaded).toEqual([]);
    });

    it('should check if storage file exists', async () => {
      expect(await storage.exists()).toBe(false);

      await storage.saveSession(createTestSession());

      expect(await storage.exists()).toBe(true);
    });
  });

  // ========================================
  // Max Sessions Limit (FIFO Eviction)
  // ========================================

  describe('Max Sessions Limit', () => {
    it('should enforce maxSessions limit via FIFO eviction', async () => {
      // Add 10 sessions (max is 5)
      for (let i = 0; i < 10; i++) {
        await storage.saveSession(
          createTestSession({
            id: `session-${i}`,
            prompt: `Session ${i}`
          })
        );
      }

      const sessions = await storage.loadAllSessions();

      expect(sessions).toHaveLength(5);
      expect(sessions[0].id).toBe('session-5'); // Oldest 5 removed
      expect(sessions[4].id).toBe('session-9'); // Most recent kept
    });

    it('should maintain order after eviction', async () => {
      for (let i = 0; i < 8; i++) {
        await storage.saveSession(
          createTestSession({ prompt: `Session ${i}` })
        );
      }

      const sessions = await storage.loadAllSessions();

      expect(sessions).toHaveLength(5);
      expect(sessions.map(s => s.prompt)).toEqual([
        'Session 3',
        'Session 4',
        'Session 5',
        'Session 6',
        'Session 7'
      ]);
    });

    it('should handle custom maxSessions', async () => {
      const customStorage = new SessionStorage({
        storagePath: tempDir,
        maxSessions: 2
      });

      for (let i = 0; i < 5; i++) {
        await customStorage.saveSession(
          createTestSession({ prompt: `Session ${i}` })
        );
      }

      const sessions = await customStorage.loadAllSessions();
      expect(sessions).toHaveLength(2);
      expect(sessions.map(s => s.prompt)).toEqual(['Session 3', 'Session 4']);
    });
  });

  // ========================================
  // Query Operations
  // ========================================

  describe('Query Operations', () => {
    beforeEach(async () => {
      // Add test data
      await storage.saveSession(createTestSession({
        id: 'session-1',
        agentType: 'claude',
        status: 'completed',
        startTime: new Date('2025-10-01T10:00:00Z')
      }));

      await storage.saveSession(createTestSession({
        id: 'session-2',
        agentType: 'copilot',
        status: 'active',
        startTime: new Date('2025-10-05T10:00:00Z')
      }));

      await storage.saveSession(createTestSession({
        id: 'session-3',
        agentType: 'claude',
        status: 'abandoned',
        startTime: new Date('2025-10-10T10:00:00Z')
      }));
    });

    it('should load recent N sessions', async () => {
      const recent = await storage.loadRecentSessions(2);

      expect(recent).toHaveLength(2);
      expect(recent[0].id).toBe('session-2');
      expect(recent[1].id).toBe('session-3');
    });

    it('should load sessions by date range', async () => {
      const start = new Date('2025-10-04T00:00:00Z');
      const end = new Date('2025-10-11T00:00:00Z');

      const inRange = await storage.loadSessionsByDateRange(start, end);

      expect(inRange).toHaveLength(2);
      expect(inRange.map(s => s.id)).toEqual(['session-2', 'session-3']);
    });

    it('should get session by ID', async () => {
      const session = await storage.getSessionById('session-2');

      expect(session).not.toBeNull();
      expect(session?.id).toBe('session-2');
      expect(session?.agentType).toBe('copilot');
    });

    it('should return null for non-existent session ID', async () => {
      const session = await storage.getSessionById('non-existent');
      expect(session).toBeNull();
    });

    it('should get sessions by agent type', async () => {
      const claudeSessions = await storage.getSessionsByAgent('claude');

      expect(claudeSessions).toHaveLength(2);
      expect(claudeSessions.every(s => s.agentType === 'claude')).toBe(true);
    });

    it('should get sessions by status', async () => {
      const completed = await storage.getSessionsByStatus('completed');

      expect(completed).toHaveLength(1);
      expect(completed[0].id).toBe('session-1');
    });
  });

  // ========================================
  // Statistics
  // ========================================

  describe('Statistics', () => {
    beforeEach(async () => {
      // Session 1: Claude, completed, 30 min duration
      await storage.saveSession(createTestSession({
        agentType: 'claude',
        status: 'completed',
        startTime: new Date('2025-10-07T10:00:00Z'),
        endTime: new Date('2025-10-07T10:30:00Z'),
        activities: [
          {
            id: 'act-1',
            type: 'file-save',
            timestamp: new Date(),
            metadata: {}
          },
          {
            id: 'act-2',
            type: 'test-run',
            timestamp: new Date(),
            metadata: {}
          }
        ]
      }));

      // Session 2: Copilot, active, no end time
      await storage.saveSession(createTestSession({
        agentType: 'copilot',
        status: 'active',
        startTime: new Date('2025-10-07T11:00:00Z'),
        activities: [
          {
            id: 'act-3',
            type: 'file-save',
            timestamp: new Date(),
            metadata: {}
          }
        ]
      }));

      // Session 3: Claude, abandoned, 15 min duration
      await storage.saveSession(createTestSession({
        agentType: 'claude',
        status: 'abandoned',
        startTime: new Date('2025-10-07T12:00:00Z'),
        endTime: new Date('2025-10-07T12:15:00Z'),
        activities: []
      }));
    });

    it('should calculate total sessions', async () => {
      const stats = await storage.getStatistics();
      expect(stats.totalSessions).toBe(3);
    });

    it('should count sessions by agent', async () => {
      const stats = await storage.getStatistics();

      expect(stats.byAgent['claude']).toBe(2);
      expect(stats.byAgent['copilot']).toBe(1);
    });

    it('should count sessions by status', async () => {
      const stats = await storage.getStatistics();

      expect(stats.byStatus['completed']).toBe(1);
      expect(stats.byStatus['active']).toBe(1);
      expect(stats.byStatus['abandoned']).toBe(1);
    });

    it('should count total activities', async () => {
      const stats = await storage.getStatistics();
      expect(stats.totalActivities).toBe(3); // 2 + 1 + 0
    });

    it('should calculate average duration', async () => {
      const stats = await storage.getStatistics();

      // (30 min + 15 min) / 2 completed sessions = 22.5 min = 1,350,000 ms
      const expectedAvg = ((30 * 60 * 1000) + (15 * 60 * 1000)) / 2;
      expect(stats.avgDuration).toBe(expectedAvg);
    });

    it('should return 0 avg duration when no completed sessions', async () => {
      await storage.clearAll();

      await storage.saveSession(createTestSession({
        status: 'active',
        endTime: undefined
      }));

      const stats = await storage.getStatistics();
      expect(stats.avgDuration).toBe(0);
    });
  });

  // ========================================
  // Deletion
  // ========================================

  describe('Deletion', () => {
    beforeEach(async () => {
      await storage.saveSession(createTestSession({ id: 'session-1' }));
      await storage.saveSession(createTestSession({ id: 'session-2' }));
      await storage.saveSession(createTestSession({ id: 'session-3' }));
    });

    it('should delete a specific session', async () => {
      const deleted = await storage.deleteSession('session-2');

      expect(deleted).toBe(true);

      const remaining = await storage.loadAllSessions();
      expect(remaining).toHaveLength(2);
      expect(remaining.map(s => s.id)).toEqual(['session-1', 'session-3']);
    });

    it('should return false when deleting non-existent session', async () => {
      const deleted = await storage.deleteSession('non-existent');
      expect(deleted).toBe(false);

      const all = await storage.loadAllSessions();
      expect(all).toHaveLength(3); // No change
    });

    it('should clear all sessions', async () => {
      await storage.clearAll();

      const sessions = await storage.loadAllSessions();
      expect(sessions).toEqual([]);
    });
  });

  // ========================================
  // File System Integration
  // ========================================

  describe('File System Integration', () => {
    it('should create storage directory if it doesn\'t exist', async () => {
      const nestedDir = path.join(tempDir, 'nested', 'deep');
      const nestedStorage = new SessionStorage({
        storagePath: nestedDir
      });

      await nestedStorage.saveSession(createTestSession());

      const dirExists = await fs.access(nestedDir).then(() => true).catch(() => false);
      expect(dirExists).toBe(true);
    });

    it('should write formatted JSON', async () => {
      await storage.saveSession(createTestSession({ prompt: 'Test' }));

      const sessionsFile = path.join(tempDir, 'sessions.json');
      const content = await fs.readFile(sessionsFile, 'utf8');

      // Should be pretty-printed (has newlines)
      expect(content).toContain('\n');

      // Should be valid JSON
      const parsed = JSON.parse(content);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
    });

    it('should handle sequential saves', async () => {
      // Save multiple sessions sequentially
      for (let i = 0; i < 10; i++) {
        await storage.saveSession(createTestSession({ prompt: `Session ${i}` }));
      }

      const sessions = await storage.loadAllSessions();
      expect(sessions).toHaveLength(5); // Respects maxSessions

      // Should contain last 5 sessions
      expect(sessions.map(s => s.prompt)).toEqual([
        'Session 5',
        'Session 6',
        'Session 7',
        'Session 8',
        'Session 9'
      ]);
    });
  });

  // ========================================
  // Edge Cases
  // ========================================

  describe('Edge Cases', () => {
    it('should handle sessions with no activities', async () => {
      const session = createTestSession({
        activities: []
      });

      await storage.saveSession(session);
      const loaded = await storage.loadAllSessions();

      expect(loaded[0].activities).toEqual([]);
    });

    it('should handle sessions with many activities', async () => {
      const activities = Array.from({ length: 100 }, (_, i) => ({
        id: `act-${i}`,
        type: 'file-save' as const,
        timestamp: new Date(),
        metadata: { filePath: `file${i}.ts` }
      }));

      const session = createTestSession({ activities });

      await storage.saveSession(session);
      const loaded = await storage.loadAllSessions();

      expect(loaded[0].activities).toHaveLength(100);
    });

    it('should handle sessions without endTime', async () => {
      const session = createTestSession({
        endTime: undefined,
        status: 'active'
      });

      await storage.saveSession(session);
      const loaded = await storage.loadAllSessions();

      expect(loaded[0].endTime).toBeUndefined();
    });

    it('should handle all agent types', async () => {
      const agentTypes: AgentType[] = ['claude', 'copilot', 'cursor', 'unknown'];

      for (const agentType of agentTypes) {
        await storage.saveSession(createTestSession({ agentType }));
      }

      const stats = await storage.getStatistics();
      expect(stats.byAgent['claude']).toBe(1);
      expect(stats.byAgent['copilot']).toBe(1);
      expect(stats.byAgent['cursor']).toBe(1);
      expect(stats.byAgent['unknown']).toBe(1);
    });

    it('should handle all session statuses', async () => {
      const statuses: SessionStatus[] = ['active', 'completed', 'abandoned'];

      for (const status of statuses) {
        await storage.saveSession(createTestSession({ status }));
      }

      const stats = await storage.getStatistics();
      expect(stats.byStatus['active']).toBe(1);
      expect(stats.byStatus['completed']).toBe(1);
      expect(stats.byStatus['abandoned']).toBe(1);
    });

    it('should handle empty date range query', async () => {
      await storage.saveSession(createTestSession({
        startTime: new Date('2025-10-07T10:00:00Z')
      }));

      const start = new Date('2025-11-01T00:00:00Z');
      const end = new Date('2025-11-30T00:00:00Z');

      const sessions = await storage.loadSessionsByDateRange(start, end);
      expect(sessions).toEqual([]);
    });
  });
});
