/**
 * AuditLogger Unit Tests
 */

import { AuditLogger } from '../AuditLogger';
import { AuditOperation, AuditLogEntry } from '../types';

describe('AuditLogger', () => {
  let auditLogger: AuditLogger;

  beforeEach(() => {
    auditLogger = new AuditLogger();
  });

  describe('createEntry', () => {
    it('should create an audit log entry with all required fields', () => {
      const entry = auditLogger.createEntry({
        operation: AuditOperation.TEMPLATE_CREATED,
        actor: 'user',
        details: {
          context: 'Test template created'
        }
      });

      expect(entry).toBeDefined();
      expect(entry.id).toMatch(/^audit-/);
      expect(entry.timestamp).toBeInstanceOf(Date);
      expect(entry.operation).toBe(AuditOperation.TEMPLATE_CREATED);
      expect(entry.actor).toBe('user');
      expect(entry.details.context).toBe('Test template created');
    });

    it('should include before and after snapshots when provided', () => {
      const before = { name: 'Old Name' };
      const after = { name: 'New Name' };

      const entry = auditLogger.createEntry({
        operation: AuditOperation.METADATA_UPDATED,
        actor: 'user',
        details: {},
        before,
        after
      });

      expect(entry.before).toEqual(before);
      expect(entry.after).toEqual(after);
    });

    it('should generate unique IDs for each entry', () => {
      const entry1 = auditLogger.createEntry({
        operation: AuditOperation.ITEM_ADDED,
        actor: 'user',
        details: {}
      });

      const entry2 = auditLogger.createEntry({
        operation: AuditOperation.ITEM_ADDED,
        actor: 'user',
        details: {}
      });

      expect(entry1.id).not.toBe(entry2.id);
    });
  });

  describe('query', () => {
    let sampleLog: AuditLogEntry[];

    beforeEach(() => {
      sampleLog = [
        auditLogger.createEntry({
          operation: AuditOperation.TEMPLATE_CREATED,
          actor: 'user',
          details: {}
        }),
        auditLogger.createEntry({
          operation: AuditOperation.ITEM_ADDED,
          actor: 'system',
          details: { itemId: 'item-1' }
        }),
        auditLogger.createEntry({
          operation: AuditOperation.ITEM_UPDATED,
          actor: 'user',
          details: { itemId: 'item-1' }
        })
      ];
    });

    it('should return all entries when no filters provided', () => {
      const results = auditLogger.query(sampleLog);
      expect(results).toHaveLength(3);
    });

    it('should filter by operation types', () => {
      const results = auditLogger.query(sampleLog, {
        operations: [AuditOperation.ITEM_ADDED, AuditOperation.ITEM_UPDATED]
      });

      expect(results).toHaveLength(2);
      expect(results.every(e =>
        e.operation === AuditOperation.ITEM_ADDED ||
        e.operation === AuditOperation.ITEM_UPDATED
      )).toBe(true);
    });

    it('should filter by actor', () => {
      const results = auditLogger.query(sampleLog, {
        actor: 'user'
      });

      expect(results).toHaveLength(2);
      expect(results.every(e => e.actor === 'user')).toBe(true);
    });

    it('should filter by item ID', () => {
      const results = auditLogger.query(sampleLog, {
        itemId: 'item-1'
      });

      expect(results).toHaveLength(2);
    });

    it('should limit results', () => {
      const results = auditLogger.query(sampleLog, {
        limit: 2
      });

      expect(results).toHaveLength(2);
    });

    it('should sort by timestamp in descending order by default', () => {
      const results = auditLogger.query(sampleLog);

      for (let i = 0; i < results.length - 1; i++) {
        const currentTime = typeof results[i].timestamp === 'string'
          ? new Date(results[i].timestamp).getTime()
          : (results[i].timestamp as Date).getTime();
        const nextTime = typeof results[i + 1].timestamp === 'string'
          ? new Date(results[i + 1].timestamp).getTime()
          : (results[i + 1].timestamp as Date).getTime();
        expect(currentTime).toBeGreaterThanOrEqual(nextTime);
      }
    });

    it('should sort by timestamp in ascending order when specified', () => {
      const results = auditLogger.query(sampleLog, {
        sortOrder: 'asc'
      });

      for (let i = 0; i < results.length - 1; i++) {
        const currentTime = typeof results[i].timestamp === 'string'
          ? new Date(results[i].timestamp).getTime()
          : (results[i].timestamp as Date).getTime();
        const nextTime = typeof results[i + 1].timestamp === 'string'
          ? new Date(results[i + 1].timestamp).getTime()
          : (results[i + 1].timestamp as Date).getTime();
        expect(currentTime).toBeLessThanOrEqual(nextTime);
      }
    });
  });

  describe('getRecent', () => {
    it('should return the most recent N entries', () => {
      const log: AuditLogEntry[] = [];
      for (let i = 0; i < 20; i++) {
        log.push(auditLogger.createEntry({
          operation: AuditOperation.ITEM_ADDED,
          actor: 'user',
          details: {}
        }));
      }

      const recent = auditLogger.getRecent(log, 5);
      expect(recent).toHaveLength(5);
    });

    it('should default to 10 entries', () => {
      const log: AuditLogEntry[] = [];
      for (let i = 0; i < 20; i++) {
        log.push(auditLogger.createEntry({
          operation: AuditOperation.ITEM_ADDED,
          actor: 'user',
          details: {}
        }));
      }

      const recent = auditLogger.getRecent(log);
      expect(recent).toHaveLength(10);
    });
  });

  describe('getByOperation', () => {
    it('should return only entries matching the operation', () => {
      const log = [
        auditLogger.createEntry({
          operation: AuditOperation.TEMPLATE_CREATED,
          actor: 'user',
          details: {}
        }),
        auditLogger.createEntry({
          operation: AuditOperation.ITEM_ADDED,
          actor: 'user',
          details: {}
        }),
        auditLogger.createEntry({
          operation: AuditOperation.ITEM_ADDED,
          actor: 'user',
          details: {}
        })
      ];

      const results = auditLogger.getByOperation(log, AuditOperation.ITEM_ADDED);
      expect(results).toHaveLength(2);
      expect(results.every(e => e.operation === AuditOperation.ITEM_ADDED)).toBe(true);
    });
  });

  describe('getInjectionHistory', () => {
    it('should return only injection-related entries', () => {
      const log = [
        auditLogger.createEntry({
          operation: AuditOperation.ITEM_INJECTED,
          actor: 'user',
          details: {}
        }),
        auditLogger.createEntry({
          operation: AuditOperation.ITEM_ADDED,
          actor: 'user',
          details: {}
        }),
        auditLogger.createEntry({
          operation: AuditOperation.TEMPLATE_INJECTED,
          actor: 'user',
          details: {}
        }),
        auditLogger.createEntry({
          operation: AuditOperation.ITEM_REMOVED_FROM_FILE,
          actor: 'user',
          details: {}
        })
      ];

      const results = auditLogger.getInjectionHistory(log);
      expect(results).toHaveLength(3);
    });
  });

  describe('getVersionHistory', () => {
    it('should return only version-related entries', () => {
      const log = [
        auditLogger.createEntry({
          operation: AuditOperation.TEMPLATE_VERSIONED,
          actor: 'user',
          details: {}
        }),
        auditLogger.createEntry({
          operation: AuditOperation.ITEM_ADDED,
          actor: 'user',
          details: {}
        }),
        auditLogger.createEntry({
          operation: AuditOperation.TEMPLATE_RESTORED,
          actor: 'user',
          details: {}
        })
      ];

      const results = auditLogger.getVersionHistory(log);
      expect(results).toHaveLength(2);
    });
  });

  describe('exportToJSON', () => {
    it('should export audit log to valid JSON', () => {
      const log = [
        auditLogger.createEntry({
          operation: AuditOperation.TEMPLATE_CREATED,
          actor: 'user',
          details: {}
        })
      ];

      const json = auditLogger.exportToJSON(log);
      const parsed = JSON.parse(json);

      expect(parsed.exportedAt).toBeDefined();
      expect(parsed.entryCount).toBe(1);
      expect(parsed.entries).toHaveLength(1);
    });
  });

  describe('getStatistics', () => {
    it('should calculate statistics correctly', () => {
      const log = [
        auditLogger.createEntry({
          operation: AuditOperation.TEMPLATE_CREATED,
          actor: 'user',
          details: {}
        }),
        auditLogger.createEntry({
          operation: AuditOperation.ITEM_ADDED,
          actor: 'system',
          details: {}
        }),
        auditLogger.createEntry({
          operation: AuditOperation.ITEM_ADDED,
          actor: 'user',
          details: {}
        })
      ];

      const stats = auditLogger.getStatistics(log);

      expect(stats.totalEntries).toBe(3);
      expect(stats.operationCounts[AuditOperation.ITEM_ADDED]).toBe(2);
      expect(stats.operationCounts[AuditOperation.TEMPLATE_CREATED]).toBe(1);
      expect(stats.actorCounts['user']).toBe(2);
      expect(stats.actorCounts['system']).toBe(1);
      expect(stats.oldestEntry).toBeInstanceOf(Date);
      expect(stats.newestEntry).toBeInstanceOf(Date);
    });

    it('should handle empty log', () => {
      const stats = auditLogger.getStatistics([]);

      expect(stats.totalEntries).toBe(0);
      expect(stats.oldestEntry).toBeNull();
      expect(stats.newestEntry).toBeNull();
    });
  });
});
