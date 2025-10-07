/**
 * SessionManager Unit Tests
 *
 * Tests for session lifecycle management and event emission.
 * Validates SessionManager without external dependencies.
 */

import { SessionManager } from '../../../src/domains/sessions/SessionManager';
import {
  Session,
  Activity,
  AgentType,
  SessionStatus,
  FileSaveActivity,
  TestRunActivity,
  DiagnosticActivity
} from '../../../src/domains/sessions/types';
import { CanonicalEvent } from '../../../src/domains/events/CanonicalEvent';
import { EventType } from '../../../src/domains/events/EventType';

describe('SessionManager', () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager();
  });

  describe('Session Lifecycle', () => {
    it('should start a new session', async () => {
      const session = await manager.startSession('Add authentication', 'claude');

      expect(session.id).toMatch(/^session-\d+-[a-z0-9]+$/);
      expect(session.prompt).toBe('Add authentication');
      expect(session.agentType).toBe('claude');
      expect(session.status).toBe('active');
      expect(session.startTime).toBeInstanceOf(Date);
      expect(session.endTime).toBeUndefined();
      expect(session.activities).toHaveLength(0);
    });

    it('should emit session:started event', async () => {
      const listener = jest.fn();
      manager.on('session:started', listener);

      const session = await manager.startSession('Test prompt', 'copilot');

      expect(listener).toHaveBeenCalledWith(session);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should track current session', async () => {
      expect(manager.getCurrentSession()).toBeNull();
      expect(manager.hasActiveSession()).toBe(false);

      await manager.startSession('Test', 'claude');

      expect(manager.getCurrentSession()).not.toBeNull();
      expect(manager.hasActiveSession()).toBe(true);
    });

    it('should finalize active session when starting new one', async () => {
      const finalizedListener = jest.fn();
      manager.on('session:finalized', finalizedListener);

      const session1 = await manager.startSession('First session', 'claude');
      const session2 = await manager.startSession('Second session', 'copilot');

      expect(finalizedListener).toHaveBeenCalledTimes(1);
      expect(finalizedListener).toHaveBeenCalledWith(
        expect.objectContaining({
          id: session1.id,
          status: 'completed'
        })
      );

      expect(manager.getCurrentSession()?.id).toBe(session2.id);
    });

    it('should finalize session with completed status', async () => {
      const session = await manager.startSession('Test', 'claude');
      const event = await manager.finalizeSession('completed');

      expect(event).not.toBeNull();
      expect(event?.type).toBe(EventType.AGENT_SESSION);
      expect(manager.getCurrentSession()).toBeNull();
      expect(manager.hasActiveSession()).toBe(false);
    });

    it('should finalize session with abandoned status', async () => {
      await manager.startSession('Test', 'claude');
      const event = await manager.finalizeSession('abandoned');

      expect(event).not.toBeNull();
      expect(event?.metadata?.status).toBe('abandoned');
    });

    it('should return null when finalizing without active session', async () => {
      const event = await manager.finalizeSession('completed');
      expect(event).toBeNull();
    });

    it('should emit session:finalized and event:created', async () => {
      const finalizedListener = jest.fn();
      const eventCreatedListener = jest.fn();

      manager.on('session:finalized', finalizedListener);
      manager.on('event:created', eventCreatedListener);

      await manager.startSession('Test', 'claude');
      await manager.finalizeSession('completed');

      expect(finalizedListener).toHaveBeenCalledTimes(1);
      expect(eventCreatedListener).toHaveBeenCalledTimes(1);
      expect(eventCreatedListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.AGENT_SESSION
        })
      );
    });
  });

  describe('Activity Tracking', () => {
    beforeEach(async () => {
      await manager.startSession('Test session', 'claude');
    });

    it('should track file-save activity', () => {
      const activity: FileSaveActivity = {
        id: 'act-1',
        type: 'file-save',
        timestamp: new Date(),
        metadata: {
          filePath: 'src/auth.ts',
          linesAdded: 50,
          linesRemoved: 10,
          fileSize: 2048
        }
      };

      manager.trackActivity(activity);

      const session = manager.getCurrentSession();
      expect(session?.activities).toHaveLength(1);
      expect(session?.activities[0]).toBe(activity);
    });

    it('should track test-run activity', () => {
      const activity: TestRunActivity = {
        id: 'act-2',
        type: 'test-run',
        timestamp: new Date(),
        metadata: {
          framework: 'jest',
          testCount: 25,
          passed: 24,
          failed: 1,
          duration: 5000,
          suiteName: 'auth.test.ts'
        }
      };

      manager.trackActivity(activity);

      const session = manager.getCurrentSession();
      expect(session?.activities).toHaveLength(1);
      expect(session?.activities[0]).toBe(activity);
    });

    it('should track diagnostic activity', () => {
      const activity: DiagnosticActivity = {
        id: 'act-3',
        type: 'diagnostic-error',
        timestamp: new Date(),
        metadata: {
          filePath: 'src/broken.ts',
          line: 42,
          message: 'Type error',
          severity: 'error',
          source: 'typescript'
        }
      };

      manager.trackActivity(activity);

      const session = manager.getCurrentSession();
      expect(session?.activities).toHaveLength(1);
      expect(session?.activities[0]).toBe(activity);
    });

    it('should track multiple activities', () => {
      const activity1: Activity = {
        id: 'act-1',
        type: 'file-save',
        timestamp: new Date(),
        metadata: { filePath: 'file1.ts' }
      };

      const activity2: Activity = {
        id: 'act-2',
        type: 'file-save',
        timestamp: new Date(),
        metadata: { filePath: 'file2.ts' }
      };

      manager.trackActivity(activity1);
      manager.trackActivity(activity2);

      const session = manager.getCurrentSession();
      expect(session?.activities).toHaveLength(2);
    });

    it('should emit activity:tracked event', () => {
      const listener = jest.fn();
      manager.on('activity:tracked', listener);

      const activity: Activity = {
        id: 'act-1',
        type: 'file-save',
        timestamp: new Date(),
        metadata: { filePath: 'test.ts' }
      };

      manager.trackActivity(activity);

      expect(listener).toHaveBeenCalledWith(activity);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should throw error when tracking without active session', () => {
      manager.finalizeSession('completed');

      const activity: Activity = {
        id: 'act-1',
        type: 'file-save',
        timestamp: new Date(),
        metadata: { filePath: 'test.ts' }
      };

      expect(() => manager.trackActivity(activity)).toThrow(
        'Cannot track activity: No active session'
      );
    });
  });

  describe('CanonicalEvent Conversion', () => {
    it('should convert session to CanonicalEvent', async () => {
      await manager.startSession('Add authentication system', 'claude');

      const activity: FileSaveActivity = {
        id: 'act-1',
        type: 'file-save',
        timestamp: new Date(),
        metadata: {
          filePath: 'src/auth.ts',
          linesAdded: 100,
          linesRemoved: 20
        }
      };

      manager.trackActivity(activity);

      const event = await manager.finalizeSession('completed');

      expect(event).not.toBeNull();
      expect(event?.id).toMatch(/^session-/);
      expect(event?.canonicalId).toMatch(/^agent-brain:session-/);
      expect(event?.providerId).toBe('agent-brain');
      expect(event?.type).toBe(EventType.AGENT_SESSION);
      expect(event?.timestamp).toBeInstanceOf(Date);
      expect(event?.title).toContain('Claude');
      expect(event?.title).toContain('Add authentication system');
      expect(event?.author.id).toBe('agent:claude');
      expect(event?.author.name).toBe('Claude');
      expect(event?.branches).toEqual([]);
      expect(event?.parentIds).toEqual([]);
    });

    it('should include correct agent names', async () => {
      const agentTests: Array<[AgentType, string]> = [
        ['claude', 'Claude'],
        ['copilot', 'GitHub Copilot'],
        ['cursor', 'Cursor AI'],
        ['unknown', 'AI Assistant']
      ];

      for (const [agentType, expectedName] of agentTests) {
        const m = new SessionManager();
        await m.startSession('Test', agentType);
        const event = await m.finalizeSession('completed');

        expect(event?.author.name).toBe(expectedName);
        expect(event?.title).toContain(expectedName);
      }
    });

    it('should calculate impact metrics', async () => {
      await manager.startSession('Test', 'claude');

      manager.trackActivity({
        id: 'act-1',
        type: 'file-save',
        timestamp: new Date(),
        metadata: {
          filePath: 'file1.ts',
          linesAdded: 50,
          linesRemoved: 10
        }
      });

      manager.trackActivity({
        id: 'act-2',
        type: 'file-save',
        timestamp: new Date(),
        metadata: {
          filePath: 'file2.ts',
          linesAdded: 30,
          linesRemoved: 5
        }
      });

      const event = await manager.finalizeSession('completed');

      expect(event?.impact?.filesChanged).toBe(2);
      expect(event?.impact?.linesAdded).toBe(80);
      expect(event?.impact?.linesRemoved).toBe(15);
    });

    it('should include session summary in metadata', async () => {
      await manager.startSession('Test', 'claude');

      manager.trackActivity({
        id: 'act-1',
        type: 'file-save',
        timestamp: new Date(),
        metadata: {
          filePath: 'src/auth.ts',
          linesAdded: 100,
          linesRemoved: 20
        }
      });

      manager.trackActivity({
        id: 'act-2',
        type: 'test-run',
        timestamp: new Date(),
        metadata: {
          framework: 'jest',
          testCount: 10,
          passed: 9,
          failed: 1,
          duration: 5000
        }
      });

      manager.trackActivity({
        id: 'act-3',
        type: 'diagnostic-error',
        timestamp: new Date(),
        metadata: {
          filePath: 'src/broken.ts',
          line: 10,
          message: 'Error',
          severity: 'error'
        }
      });

      const event = await manager.finalizeSession('completed');

      expect(event?.metadata?.summary).toEqual({
        filesModified: ['src/auth.ts'],
        linesAdded: 100,
        linesRemoved: 20,
        testsRun: 10,
        testsPassed: 9,
        testsFailed: 1,
        errorCount: 1,
        warningCount: 0
      });
    });

    it('should truncate long prompts in title', async () => {
      const longPrompt = 'A'.repeat(100);
      await manager.startSession(longPrompt, 'claude');
      const event = await manager.finalizeSession('completed');

      expect(event?.title.length).toBeLessThan(100);
      expect(event?.title).toContain('...');
      expect(event?.metadata?.prompt).toBe(longPrompt); // Full prompt in metadata
    });

    it('should format description with metrics', async () => {
      await manager.startSession('Test', 'claude');

      // Add file changes
      manager.trackActivity({
        id: 'act-1',
        type: 'file-save',
        timestamp: new Date(),
        metadata: {
          filePath: 'file1.ts',
          linesAdded: 50,
          linesRemoved: 10
        }
      });

      // Add tests
      manager.trackActivity({
        id: 'act-2',
        type: 'test-run',
        timestamp: new Date(),
        metadata: {
          framework: 'jest',
          testCount: 20,
          passed: 19,
          failed: 1,
          duration: 5000
        }
      });

      // Add diagnostic
      manager.trackActivity({
        id: 'act-3',
        type: 'diagnostic-warning',
        timestamp: new Date(),
        metadata: {
          filePath: 'test.ts',
          line: 10,
          message: 'Warning',
          severity: 'warning'
        }
      });

      const event = await manager.finalizeSession('completed');

      expect(event?.description).toContain('Duration:');
      expect(event?.description).toContain('Files: 1');
      expect(event?.description).toContain('+50/-10');
      expect(event?.description).toContain('Tests: 19/20 passed');
      expect(event?.description).toContain('Issues: 0 errors, 1 warnings');
      expect(event?.description).toContain('Activities: 3');
    });
  });

  describe('Summary Calculation', () => {
    beforeEach(async () => {
      await manager.startSession('Test', 'claude');
    });

    it('should count unique files modified', async () => {
      manager.trackActivity({
        id: 'act-1',
        type: 'file-save',
        timestamp: new Date(),
        metadata: { filePath: 'file1.ts' }
      });

      manager.trackActivity({
        id: 'act-2',
        type: 'file-save',
        timestamp: new Date(),
        metadata: { filePath: 'file1.ts' } // Same file
      });

      manager.trackActivity({
        id: 'act-3',
        type: 'file-save',
        timestamp: new Date(),
        metadata: { filePath: 'file2.ts' }
      });

      const event = await manager.finalizeSession('completed');

      expect(event?.impact?.filesChanged).toBe(2);
      expect(event?.metadata?.summary.filesModified).toHaveLength(2);
    });

    it('should aggregate test metrics', async () => {
      manager.trackActivity({
        id: 'act-1',
        type: 'test-run',
        timestamp: new Date(),
        metadata: {
          framework: 'jest',
          testCount: 10,
          passed: 10,
          failed: 0,
          duration: 1000
        }
      });

      manager.trackActivity({
        id: 'act-2',
        type: 'test-run',
        timestamp: new Date(),
        metadata: {
          framework: 'jest',
          testCount: 15,
          passed: 14,
          failed: 1,
          duration: 2000
        }
      });

      const event = await manager.finalizeSession('completed');

      expect(event?.metadata?.summary.testsRun).toBe(25);
      expect(event?.metadata?.summary.testsPassed).toBe(24);
      expect(event?.metadata?.summary.testsFailed).toBe(1);
    });

    it('should count diagnostics by severity', async () => {
      manager.trackActivity({
        id: 'act-1',
        type: 'diagnostic-error',
        timestamp: new Date(),
        metadata: {
          filePath: 'test.ts',
          line: 10,
          message: 'Error 1',
          severity: 'error'
        }
      });

      manager.trackActivity({
        id: 'act-2',
        type: 'diagnostic-error',
        timestamp: new Date(),
        metadata: {
          filePath: 'test.ts',
          line: 20,
          message: 'Error 2',
          severity: 'error'
        }
      });

      manager.trackActivity({
        id: 'act-3',
        type: 'diagnostic-warning',
        timestamp: new Date(),
        metadata: {
          filePath: 'test.ts',
          line: 30,
          message: 'Warning',
          severity: 'warning'
        }
      });

      const event = await manager.finalizeSession('completed');

      expect(event?.metadata?.summary.errorCount).toBe(2);
      expect(event?.metadata?.summary.warningCount).toBe(1);
    });

    it('should calculate session duration', async () => {
      const startTime = Date.now();
      await manager.startSession('Test', 'claude');

      // Simulate some time passing
      await new Promise(resolve => setTimeout(resolve, 50));

      const event = await manager.finalizeSession('completed');

      expect(event?.metadata?.duration).toBeGreaterThan(0);
      expect(event?.metadata?.duration).toBeLessThan(1000); // Less than 1 second
    });
  });

  describe('Agent Types', () => {
    it('should support all agent types', async () => {
      const agentTypes: AgentType[] = ['claude', 'copilot', 'cursor', 'unknown'];

      for (const agentType of agentTypes) {
        const m = new SessionManager();
        const session = await m.startSession('Test', agentType);
        expect(session.agentType).toBe(agentType);
      }
    });

    it('should format agent display names correctly', async () => {
      const tests: Array<[AgentType, string, string]> = [
        ['claude', 'Claude', 'claude@agent-brain.dev'],
        ['copilot', 'GitHub Copilot', 'copilot@agent-brain.dev'],
        ['cursor', 'Cursor AI', 'cursor@agent-brain.dev'],
        ['unknown', 'AI Assistant', 'unknown@agent-brain.dev']
      ];

      for (const [agentType, expectedName, expectedEmail] of tests) {
        const m = new SessionManager();
        await m.startSession('Test', agentType);
        const event = await m.finalizeSession('completed');

        expect(event?.author.name).toBe(expectedName);
        expect(event?.author.email).toBe(expectedEmail);
        expect(event?.author.id).toBe(`agent:${agentType}`);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle session with no activities', async () => {
      await manager.startSession('Empty session', 'claude');
      const event = await manager.finalizeSession('completed');

      expect(event?.impact?.filesChanged).toBe(0);
      expect(event?.impact?.linesAdded).toBe(0);
      expect(event?.impact?.linesRemoved).toBe(0);
      expect(event?.metadata?.activityCount).toBe(0);
    });

    it('should handle activities with missing optional fields', async () => {
      await manager.startSession('Test', 'claude');

      manager.trackActivity({
        id: 'act-1',
        type: 'file-save',
        timestamp: new Date(),
        metadata: {
          filePath: 'test.ts'
          // No linesAdded, linesRemoved, fileSize
        }
      });

      const event = await manager.finalizeSession('completed');

      expect(event?.impact?.linesAdded).toBe(0);
      expect(event?.impact?.linesRemoved).toBe(0);
    });

    it('should generate unique session IDs', async () => {
      const ids = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const m = new SessionManager();
        const session = await m.startSession('Test', 'claude');
        ids.add(session.id);
      }

      expect(ids.size).toBe(100); // All unique
    });

    it('should handle rapid start/finalize cycles', async () => {
      for (let i = 0; i < 10; i++) {
        await manager.startSession(`Session ${i}`, 'claude');
        const event = await manager.finalizeSession('completed');
        expect(event).not.toBeNull();
      }

      expect(manager.hasActiveSession()).toBe(false);
    });
  });
});
