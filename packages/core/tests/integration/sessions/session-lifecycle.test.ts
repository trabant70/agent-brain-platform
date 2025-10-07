/**
 * Session Lifecycle Integration Tests
 *
 * Tests the complete flow from session start → activity tracking → finalization → persistence.
 * Validates that SessionManager and SessionStorage work together correctly.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  SessionManager,
  SessionStorage,
  createSessionManager,
  Session,
  FileSaveActivity,
  TestRunActivity
} from '../../../src/domains/sessions';
import { EventType } from '../../../src/domains/events/EventType';

describe('Session Lifecycle Integration', () => {
  let manager: SessionManager;
  let storage: SessionStorage;
  let tempDir: string;

  beforeEach(async () => {
    // Create unique temp directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-brain-integration-'));
    storage = new SessionStorage({ storagePath: tempDir });
    manager = new SessionManager();

    // Wire manager to storage - wait for save to complete
    manager.on('session:finalized', async (session: Session) => {
      await storage.saveSession(session);
    });
  });

  // Helper to wait for async event handlers to complete
  const waitForStorage = () => new Promise(resolve => setTimeout(resolve, 50));

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  // ========================================
  // Complete Lifecycle Tests
  // ========================================

  describe('Complete Session Lifecycle', () => {
    it('should complete full session lifecycle with persistence', async () => {
      // Start session
      const session = await manager.startSession('Add authentication feature', 'claude');
      expect(session.status).toBe('active');
      expect(manager.hasActiveSession()).toBe(true);

      // Track file save activity
      manager.trackActivity({
        id: 'act-1',
        type: 'file-save',
        timestamp: new Date(),
        metadata: {
          filePath: 'src/auth.ts',
          linesAdded: 100,
          linesRemoved: 10
        }
      });

      // Track test run activity
      manager.trackActivity({
        id: 'act-2',
        type: 'test-run',
        timestamp: new Date(),
        metadata: {
          framework: 'jest',
          testCount: 5,
          passed: 5,
          failed: 0,
          duration: 1000
        }
      });

      // Finalize session
      const event = await manager.finalizeSession('completed');
      await waitForStorage(); // Wait for async save

      // Verify event was created
      expect(event).toBeDefined();
      expect(event?.type).toBe(EventType.AGENT_SESSION);
      expect(event?.title).toContain('Add authentication feature');
      expect(event?.impact?.filesChanged).toBe(1);
      expect(event?.impact?.linesAdded).toBe(100);

      // Verify session metadata in event
      expect(event?.metadata?.summary.testsRun).toBe(5);
      expect(event?.metadata?.summary.testsPassed).toBe(5);
      expect(event?.metadata?.summary.testsFailed).toBe(0);

      // Verify persistence
      const sessions = await storage.loadAllSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe(session.id);
      expect(sessions[0].prompt).toBe('Add authentication feature');
      expect(sessions[0].status).toBe('completed');
      expect(sessions[0].activities).toHaveLength(2);

      // Verify manager state
      expect(manager.hasActiveSession()).toBe(false);
    });

    it('should handle session abandonment', async () => {
      await manager.startSession('Unfinished work', 'copilot');

      manager.trackActivity({
        id: 'act-1',
        type: 'file-save',
        timestamp: new Date(),
        metadata: { filePath: 'incomplete.ts' }
      });

      const event = await manager.finalizeSession('abandoned');
      await waitForStorage();

      expect(event?.metadata?.status).toBe('abandoned');

      const sessions = await storage.loadAllSessions();
      expect(sessions[0].status).toBe('abandoned');
    });

    it('should handle empty session (no activities)', async () => {
      await manager.startSession('Quick check', 'claude');

      const event = await manager.finalizeSession('completed');
      await waitForStorage();

      expect(event?.metadata?.activityCount).toBe(0);
      expect(event?.impact?.filesChanged).toBe(0);

      const sessions = await storage.loadAllSessions();
      expect(sessions[0].activities).toHaveLength(0);
    });
  });

  // ========================================
  // Auto-Finalization Tests
  // ========================================

  describe('Auto-Finalization', () => {
    it('should auto-finalize previous session when starting new one', async () => {
      // Start first session
      await manager.startSession('First session', 'claude');
      manager.trackActivity({
        id: 'act-1',
        type: 'file-save',
        timestamp: new Date(),
        metadata: { filePath: 'first.ts' }
      });

      // Start second session (should auto-finalize first)
      await manager.startSession('Second session', 'copilot');
      await waitForStorage(); // Wait for first session to be saved

      // Verify first session was persisted
      const sessions = await storage.loadAllSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].prompt).toBe('First session');
      expect(sessions[0].status).toBe('completed');
      expect(sessions[0].activities).toHaveLength(1);

      // Verify second session is now active
      const current = manager.getCurrentSession();
      expect(current?.prompt).toBe('Second session');
    });

    it('should auto-finalize multiple sequential sessions', async () => {
      const prompts = ['Session 1', 'Session 2', 'Session 3'];

      for (const prompt of prompts) {
        await manager.startSession(prompt, 'claude');
        manager.trackActivity({
          id: `act-${prompt}`,
          type: 'file-save',
          timestamp: new Date(),
          metadata: { filePath: `${prompt}.ts` }
        });
        await waitForStorage(); // Wait after each session start
      }

      // First two should be auto-finalized and persisted
      const sessions = await storage.loadAllSessions();
      expect(sessions).toHaveLength(2);
      expect(sessions[0].prompt).toBe('Session 1');
      expect(sessions[1].prompt).toBe('Session 2');

      // Third should still be active
      expect(manager.getCurrentSession()?.prompt).toBe('Session 3');
    });
  });

  // ========================================
  // Factory Function Tests
  // ========================================

  describe('Factory Function', () => {
    it('should create manager with auto-wired storage', async () => {
      const factoryManager = createSessionManager({ storagePath: tempDir });

      await factoryManager.startSession('Test with factory', 'claude');
      await factoryManager.finalizeSession('completed');
      await waitForStorage();

      // Should auto-persist
      const factoryStorage = new SessionStorage({ storagePath: tempDir });
      const sessions = await factoryStorage.loadAllSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].prompt).toBe('Test with factory');
    });

    it('should respect storage configuration', async () => {
      const factoryManager = createSessionManager({
        storagePath: tempDir,
        maxSessions: 2
      });

      // Add 3 sessions
      for (let i = 0; i < 3; i++) {
        await factoryManager.startSession(`Session ${i}`, 'claude');
        await factoryManager.finalizeSession('completed');
        await waitForStorage();
      }

      // Should only keep last 2
      const factoryStorage = new SessionStorage({ storagePath: tempDir });
      const sessions = await factoryStorage.loadAllSessions();
      expect(sessions).toHaveLength(2);
      expect(sessions.map(s => s.prompt)).toEqual(['Session 1', 'Session 2']);
    });
  });

  // ========================================
  // Activity Aggregation Tests
  // ========================================

  describe('Activity Aggregation', () => {
    it('should aggregate multiple file changes', async () => {
      await manager.startSession('Refactor auth module', 'claude');

      // Multiple file saves
      const files = ['auth.ts', 'user.ts', 'session.ts'];
      for (const file of files) {
        manager.trackActivity({
          id: `act-${file}`,
          type: 'file-save',
          timestamp: new Date(),
          metadata: {
            filePath: `src/${file}`,
            linesAdded: 50,
            linesRemoved: 20
          }
        });
      }

      const event = await manager.finalizeSession('completed');
      await waitForStorage();

      expect(event?.impact?.filesChanged).toBe(3);
      expect(event?.impact?.linesAdded).toBe(150); // 50 * 3
      expect(event?.impact?.linesRemoved).toBe(60); // 20 * 3
    });

    it('should aggregate multiple test runs', async () => {
      await manager.startSession('Fix failing tests', 'claude');

      // First test run - failures
      manager.trackActivity({
        id: 'act-1',
        type: 'test-run',
        timestamp: new Date(),
        metadata: {
          framework: 'jest',
          testCount: 10,
          passed: 8,
          failed: 2,
          duration: 2000
        }
      });

      // Second test run - all pass
      manager.trackActivity({
        id: 'act-2',
        type: 'test-run',
        timestamp: new Date(),
        metadata: {
          framework: 'jest',
          testCount: 10,
          passed: 10,
          failed: 0,
          duration: 2000
        }
      });

      const event = await manager.finalizeSession('completed');
      await waitForStorage();

      expect(event?.metadata?.summary.testsRun).toBe(20);
      expect(event?.metadata?.summary.testsPassed).toBe(18);
      expect(event?.metadata?.summary.testsFailed).toBe(2);
    });

    it('should count diagnostic errors and warnings', async () => {
      await manager.startSession('Debug type errors', 'claude');

      // Add errors
      manager.trackActivity({
        id: 'act-1',
        type: 'diagnostic-error',
        timestamp: new Date(),
        metadata: {
          filePath: 'broken.ts',
          line: 10,
          message: 'Type error',
          severity: 'error'
        }
      });

      manager.trackActivity({
        id: 'act-2',
        type: 'diagnostic-error',
        timestamp: new Date(),
        metadata: {
          filePath: 'broken.ts',
          line: 20,
          message: 'Another error',
          severity: 'error'
        }
      });

      // Add warning
      manager.trackActivity({
        id: 'act-3',
        type: 'diagnostic-warning',
        timestamp: new Date(),
        metadata: {
          filePath: 'test.ts',
          line: 5,
          message: 'Warning',
          severity: 'warning'
        }
      });

      const event = await manager.finalizeSession('completed');
      await waitForStorage();

      expect(event?.metadata?.summary.errorCount).toBe(2);
      expect(event?.metadata?.summary.warningCount).toBe(1);
    });
  });

  // ========================================
  // Agent Type Tests
  // ========================================

  describe('Agent Type Handling', () => {
    it('should handle all agent types', async () => {
      const agents = [
        { type: 'claude' as const, expectedName: 'Claude' },
        { type: 'copilot' as const, expectedName: 'GitHub Copilot' },
        { type: 'cursor' as const, expectedName: 'Cursor AI' },
        { type: 'unknown' as const, expectedName: 'AI Assistant' }
      ];

      for (const agent of agents) {
        // Use the main manager for each agent type
        await manager.startSession(`Test ${agent.type}`, agent.type);
        const event = await manager.finalizeSession('completed');
        await waitForStorage();

        expect(event?.author.name).toBe(agent.expectedName);
        expect(event?.title).toContain(agent.expectedName);
      }
    });
  });

  // ========================================
  // Event Structure Validation
  // ========================================

  describe('Event Structure', () => {
    it('should create properly structured CanonicalEvent', async () => {
      await manager.startSession('Structured event test', 'claude');

      manager.trackActivity({
        id: 'act-1',
        type: 'file-save',
        timestamp: new Date(),
        metadata: {
          filePath: 'test.ts',
          linesAdded: 100
        }
      });

      const event = await manager.finalizeSession('completed');
      await waitForStorage();

      // Required CanonicalEvent fields
      expect(event?.id).toBeDefined();
      expect(event?.canonicalId).toBeDefined();
      expect(event?.providerId).toBe('agent-brain');
      expect(event?.type).toBe(EventType.AGENT_SESSION);
      expect(event?.timestamp).toBeInstanceOf(Date);
      expect(event?.title).toBeDefined();
      expect(event?.author).toBeDefined();
      expect(event?.author.id).toBeDefined();
      expect(event?.author.name).toBeDefined();
      expect(Array.isArray(event?.branches)).toBe(true);
      expect(Array.isArray(event?.parentIds)).toBe(true);

      // Impact metrics
      expect(event?.impact).toBeDefined();
      expect(typeof event?.impact?.filesChanged).toBe('number');
      expect(typeof event?.impact?.linesAdded).toBe('number');

      // Session metadata
      expect(event?.metadata).toBeDefined();
      expect(event?.metadata?.prompt).toBe('Structured event test');
      expect(event?.metadata?.agentType).toBe('claude');
      expect(event?.metadata?.summary).toBeDefined();
    });

    it('should include session duration in event', async () => {
      await manager.startSession('Duration test', 'claude');

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      const event = await manager.finalizeSession('completed');
      await waitForStorage();

      expect(event?.metadata?.duration).toBeGreaterThan(0);
      expect(event?.metadata?.duration).toBeGreaterThan(50); // At least 50ms
    });
  });

  // ========================================
  // Storage Query Integration
  // ========================================

  describe('Storage Query Integration', () => {
    it('should query persisted sessions by agent', async () => {
      // Use the main manager that's wired to storage
      await manager.startSession('Claude session', 'claude');
      await manager.finalizeSession('completed');
      await waitForStorage(); // Wait for async save

      // Start new manager for different agent (auto-saves previous)
      await manager.startSession('Copilot session', 'copilot');
      await manager.finalizeSession('completed');
      await waitForStorage(); // Wait for async save

      // Query
      const claudeSessions = await storage.getSessionsByAgent('claude');
      expect(claudeSessions).toHaveLength(1);
      expect(claudeSessions[0].prompt).toBe('Claude session');
    });

    it('should query persisted sessions by status', async () => {
      await manager.startSession('Completed', 'claude');
      await manager.finalizeSession('completed');
      await waitForStorage();

      await manager.startSession('Abandoned', 'claude');
      await manager.finalizeSession('abandoned');
      await waitForStorage();

      const completed = await storage.getSessionsByStatus('completed');
      const abandoned = await storage.getSessionsByStatus('abandoned');

      expect(completed).toHaveLength(1);
      expect(abandoned).toHaveLength(1);
      expect(completed[0].prompt).toBe('Completed');
      expect(abandoned[0].prompt).toBe('Abandoned');
    });

    it('should get statistics across all sessions', async () => {
      // Add multiple sessions
      for (let i = 0; i < 3; i++) {
        await manager.startSession(`Session ${i}`, 'claude');
        manager.trackActivity({
          id: `act-${i}`,
          type: 'file-save',
          timestamp: new Date(),
          metadata: { filePath: `file${i}.ts` }
        });
        await manager.finalizeSession('completed');
        await waitForStorage();
      }

      const stats = await storage.getStatistics();
      expect(stats.totalSessions).toBe(3);
      expect(stats.byAgent['claude']).toBe(3);
      expect(stats.totalActivities).toBe(3);
    });
  });
});
