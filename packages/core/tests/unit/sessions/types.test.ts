/**
 * Session Types Unit Tests
 *
 * Tests for pure data structures and type guards.
 * These tests validate the session type system without any external dependencies.
 */

import {
  AgentType,
  SessionStatus,
  ActivityType,
  Session,
  Activity,
  FileSaveActivity,
  FileDeleteActivity,
  TestRunActivity,
  TerminalCommandActivity,
  DiagnosticActivity,
  SessionSummary,
  isFileSaveActivity,
  isFileDeleteActivity,
  isTestRunActivity,
  isTerminalCommandActivity,
  isDiagnosticActivity,
  createEmptySessionSummary
} from '../../../src/domains/sessions/types';

describe('Session Types', () => {
  describe('Session Interface', () => {
    it('should create a valid active session', () => {
      const session: Session = {
        id: 'test-session-1',
        prompt: 'Add authentication to user service',
        agentType: 'claude',
        startTime: new Date('2025-10-07T10:00:00Z'),
        status: 'active',
        activities: []
      };

      expect(session.id).toBe('test-session-1');
      expect(session.prompt).toBe('Add authentication to user service');
      expect(session.agentType).toBe('claude');
      expect(session.status).toBe('active');
      expect(session.activities).toHaveLength(0);
      expect(session.endTime).toBeUndefined();
    });

    it('should create a valid completed session', () => {
      const startTime = new Date('2025-10-07T10:00:00Z');
      const endTime = new Date('2025-10-07T10:30:00Z');

      const session: Session = {
        id: 'test-session-2',
        prompt: 'Fix bug in payment processing',
        agentType: 'copilot',
        startTime,
        endTime,
        status: 'completed',
        activities: []
      };

      expect(session.status).toBe('completed');
      expect(session.endTime).toBe(endTime);
      expect(session.endTime!.getTime() - session.startTime.getTime()).toBe(30 * 60 * 1000);
    });

    it('should support all agent types', () => {
      const agentTypes: AgentType[] = ['claude', 'copilot', 'cursor', 'unknown'];

      agentTypes.forEach(agentType => {
        const session: Session = {
          id: `session-${agentType}`,
          prompt: 'Test',
          agentType,
          startTime: new Date(),
          status: 'active',
          activities: []
        };

        expect(session.agentType).toBe(agentType);
      });
    });

    it('should support all session statuses', () => {
      const statuses: SessionStatus[] = ['active', 'completed', 'abandoned'];

      statuses.forEach(status => {
        const session: Session = {
          id: `session-${status}`,
          prompt: 'Test',
          agentType: 'claude',
          startTime: new Date(),
          status,
          activities: []
        };

        expect(session.status).toBe(status);
      });
    });
  });

  describe('Activity Interfaces', () => {
    it('should create file-save activity', () => {
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

      expect(activity.type).toBe('file-save');
      expect(activity.metadata.filePath).toBe('src/auth.ts');
      expect(activity.metadata.linesAdded).toBe(50);
    });

    it('should create file-delete activity', () => {
      const activity: FileDeleteActivity = {
        id: 'act-2',
        type: 'file-delete',
        timestamp: new Date(),
        metadata: {
          filePath: 'src/old-code.ts'
        }
      };

      expect(activity.type).toBe('file-delete');
      expect(activity.metadata.filePath).toBe('src/old-code.ts');
    });

    it('should create test-run activity', () => {
      const activity: TestRunActivity = {
        id: 'act-3',
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

      expect(activity.type).toBe('test-run');
      expect(activity.metadata.framework).toBe('jest');
      expect(activity.metadata.testCount).toBe(25);
      expect(activity.metadata.passed).toBe(24);
      expect(activity.metadata.failed).toBe(1);
    });

    it('should create terminal-command activity', () => {
      const activity: TerminalCommandActivity = {
        id: 'act-4',
        type: 'terminal-command',
        timestamp: new Date(),
        metadata: {
          command: 'npm test',
          cwd: '/workspace/project'
        }
      };

      expect(activity.type).toBe('terminal-command');
      expect(activity.metadata.command).toBe('npm test');
    });

    it('should create diagnostic activity', () => {
      const activity: DiagnosticActivity = {
        id: 'act-5',
        type: 'diagnostic-error',
        timestamp: new Date(),
        metadata: {
          filePath: 'src/broken.ts',
          line: 42,
          message: 'Type error: Cannot find name "foo"',
          severity: 'error',
          source: 'typescript'
        }
      };

      expect(activity.type).toBe('diagnostic-error');
      expect(activity.metadata.severity).toBe('error');
      expect(activity.metadata.line).toBe(42);
    });
  });

  describe('Type Guards', () => {
    it('should identify file-save activity', () => {
      const activity: Activity = {
        id: 'act-1',
        type: 'file-save',
        timestamp: new Date(),
        metadata: {
          filePath: 'test.ts'
        }
      };

      expect(isFileSaveActivity(activity)).toBe(true);
      expect(isFileDeleteActivity(activity)).toBe(false);
      expect(isTestRunActivity(activity)).toBe(false);

      if (isFileSaveActivity(activity)) {
        // TypeScript should narrow type here
        expect(activity.metadata.filePath).toBe('test.ts');
      }
    });

    it('should identify file-delete activity', () => {
      const activity: Activity = {
        id: 'act-2',
        type: 'file-delete',
        timestamp: new Date(),
        metadata: {
          filePath: 'old.ts'
        }
      };

      expect(isFileDeleteActivity(activity)).toBe(true);
      expect(isFileSaveActivity(activity)).toBe(false);
    });

    it('should identify test-run activity', () => {
      const activity: Activity = {
        id: 'act-3',
        type: 'test-run',
        timestamp: new Date(),
        metadata: {
          framework: 'jest',
          testCount: 10,
          passed: 10,
          failed: 0,
          duration: 1000
        }
      };

      expect(isTestRunActivity(activity)).toBe(true);
      expect(isFileSaveActivity(activity)).toBe(false);

      if (isTestRunActivity(activity)) {
        expect(activity.metadata.framework).toBe('jest');
      }
    });

    it('should identify terminal-command activity', () => {
      const activity: Activity = {
        id: 'act-4',
        type: 'terminal-command',
        timestamp: new Date(),
        metadata: {
          command: 'npm build'
        }
      };

      expect(isTerminalCommandActivity(activity)).toBe(true);
    });

    it('should identify diagnostic activities', () => {
      const errorActivity: Activity = {
        id: 'act-5',
        type: 'diagnostic-error',
        timestamp: new Date(),
        metadata: {
          filePath: 'test.ts',
          line: 10,
          message: 'Error',
          severity: 'error'
        }
      };

      const warningActivity: Activity = {
        id: 'act-6',
        type: 'diagnostic-warning',
        timestamp: new Date(),
        metadata: {
          filePath: 'test.ts',
          line: 20,
          message: 'Warning',
          severity: 'warning'
        }
      };

      expect(isDiagnosticActivity(errorActivity)).toBe(true);
      expect(isDiagnosticActivity(warningActivity)).toBe(true);
      expect(isFileSaveActivity(errorActivity)).toBe(false);
    });
  });

  describe('SessionSummary', () => {
    it('should create empty session summary', () => {
      const summary = createEmptySessionSummary();

      expect(summary.filesModified).toBeInstanceOf(Set);
      expect(summary.filesModified.size).toBe(0);
      expect(summary.linesAdded).toBe(0);
      expect(summary.linesRemoved).toBe(0);
      expect(summary.testsRun).toBe(0);
      expect(summary.testsPassed).toBe(0);
      expect(summary.testsFailed).toBe(0);
      expect(summary.duration).toBe(0);
      expect(summary.activityCount).toBe(0);
      expect(summary.errorCount).toBe(0);
      expect(summary.warningCount).toBe(0);
    });

    it('should support adding files to modified set', () => {
      const summary = createEmptySessionSummary();

      summary.filesModified.add('file1.ts');
      summary.filesModified.add('file2.ts');
      summary.filesModified.add('file1.ts'); // Duplicate

      expect(summary.filesModified.size).toBe(2);
      expect(summary.filesModified.has('file1.ts')).toBe(true);
      expect(summary.filesModified.has('file2.ts')).toBe(true);
    });

    it('should support metric updates', () => {
      const summary: SessionSummary = {
        filesModified: new Set(['auth.ts', 'user.ts']),
        linesAdded: 150,
        linesRemoved: 30,
        testsRun: 20,
        testsPassed: 19,
        testsFailed: 1,
        duration: 1800000, // 30 minutes
        activityCount: 15,
        errorCount: 2,
        warningCount: 5
      };

      expect(summary.filesModified.size).toBe(2);
      expect(summary.linesAdded).toBe(150);
      expect(summary.testsRun).toBe(20);
      expect(summary.duration).toBe(1800000);
    });
  });

  describe('Activity Types Enum', () => {
    it('should support all activity types', () => {
      const activityTypes: ActivityType[] = [
        'file-save',
        'file-delete',
        'file-create',
        'test-run',
        'test-pass',
        'test-fail',
        'terminal-command',
        'diagnostic-error',
        'diagnostic-warning'
      ];

      activityTypes.forEach(type => {
        const activity: Activity = {
          id: `act-${type}`,
          type,
          timestamp: new Date(),
          metadata: {}
        };

        expect(activity.type).toBe(type);
      });
    });
  });

  describe('Type Safety', () => {
    it('should enforce required fields', () => {
      // This test validates TypeScript compilation
      // If fields are missing, code won't compile

      const session: Session = {
        id: 'required-test',
        prompt: 'Required',
        agentType: 'claude',
        startTime: new Date(),
        status: 'active',
        activities: []
      };

      expect(session).toBeDefined();
    });

    it('should allow optional fields to be undefined', () => {
      const session: Session = {
        id: 'optional-test',
        prompt: 'Test',
        agentType: 'claude',
        startTime: new Date(),
        status: 'active',
        activities: []
        // endTime is optional, not included
      };

      expect(session.endTime).toBeUndefined();
    });
  });
});
