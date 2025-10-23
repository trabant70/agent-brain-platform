/**
 * Audit Logger
 *
 * Creates and manages audit log entries for template and item operations.
 * This is a stateless utility - audit logs are stored in template.auditLog[]
 * by TemplateStore.
 */

import {
  AuditLogEntry,
  AuditOperation,
  AuditDetails
} from './types';

/**
 * Generate a unique ID for audit entries
 */
function generateAuditId(): string {
  return `audit-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Parameters for creating an audit log entry
 */
export interface CreateAuditEntryParams {
  /** Type of operation */
  operation: AuditOperation;

  /** Who performed the operation */
  actor: string;

  /** Operation details */
  details: AuditDetails;

  /** State before change (optional) */
  before?: any;

  /** State after change (optional) */
  after?: any;
}

/**
 * Options for querying audit logs
 */
export interface AuditLogQueryOptions {
  /** Filter by operation types */
  operations?: AuditOperation[];

  /** Filter by actor */
  actor?: string;

  /** Filter by date range (start) */
  startDate?: Date;

  /** Filter by date range (end) */
  endDate?: Date;

  /** Filter by item ID (if operation involves an item) */
  itemId?: string;

  /** Maximum number of results */
  limit?: number;

  /** Sort order */
  sortOrder?: 'asc' | 'desc';
}

/**
 * AuditLogger - Utility for creating and querying audit log entries
 */
export class AuditLogger {
  /**
   * Create a new audit log entry
   */
  createEntry(params: CreateAuditEntryParams): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: generateAuditId(),
      timestamp: new Date(),
      operation: params.operation,
      actor: params.actor,
      details: params.details,
      before: params.before,
      after: params.after
    };

    return entry;
  }

  /**
   * Query audit log entries with filters
   */
  query(
    auditLog: AuditLogEntry[],
    options: AuditLogQueryOptions = {}
  ): AuditLogEntry[] {
    let results = [...auditLog];

    // Filter by operations
    if (options.operations && options.operations.length > 0) {
      results = results.filter(entry =>
        options.operations!.includes(entry.operation)
      );
    }

    // Filter by actor
    if (options.actor) {
      results = results.filter(entry =>
        entry.actor === options.actor
      );
    }

    // Filter by date range
    if (options.startDate) {
      results = results.filter(entry => {
        const timestamp = entry.timestamp instanceof Date
          ? entry.timestamp
          : new Date(entry.timestamp);
        return timestamp >= options.startDate!;
      });
    }

    if (options.endDate) {
      results = results.filter(entry => {
        const timestamp = entry.timestamp instanceof Date
          ? entry.timestamp
          : new Date(entry.timestamp);
        return timestamp <= options.endDate!;
      });
    }

    // Filter by item ID
    if (options.itemId) {
      results = results.filter(entry =>
        entry.details.itemId === options.itemId
      );
    }

    // Sort by timestamp
    const sortOrder = options.sortOrder || 'desc';
    results.sort((a, b) => {
      const aTime = a.timestamp instanceof Date
        ? a.timestamp.getTime()
        : new Date(a.timestamp).getTime();
      const bTime = b.timestamp instanceof Date
        ? b.timestamp.getTime()
        : new Date(b.timestamp).getTime();

      return sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
    });

    // Apply limit
    if (options.limit && options.limit > 0) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Get recent audit entries (last N entries)
   */
  getRecent(auditLog: AuditLogEntry[], count: number = 10): AuditLogEntry[] {
    return this.query(auditLog, { limit: count, sortOrder: 'desc' });
  }

  /**
   * Get audit entries for a specific operation type
   */
  getByOperation(
    auditLog: AuditLogEntry[],
    operation: AuditOperation
  ): AuditLogEntry[] {
    return this.query(auditLog, { operations: [operation] });
  }

  /**
   * Get audit entries for a specific item
   */
  getByItemId(auditLog: AuditLogEntry[], itemId: string): AuditLogEntry[] {
    return this.query(auditLog, { itemId });
  }

  /**
   * Get all injection-related entries
   */
  getInjectionHistory(auditLog: AuditLogEntry[]): AuditLogEntry[] {
    return this.query(auditLog, {
      operations: [
        AuditOperation.ITEM_INJECTED,
        AuditOperation.ITEM_REMOVED_FROM_FILE,
        AuditOperation.TEMPLATE_INJECTED,
        AuditOperation.TEMPLATE_REMOVED_FROM_FILE
      ]
    });
  }

  /**
   * Get all version-related entries
   */
  getVersionHistory(auditLog: AuditLogEntry[]): AuditLogEntry[] {
    return this.query(auditLog, {
      operations: [
        AuditOperation.TEMPLATE_VERSIONED,
        AuditOperation.TEMPLATE_RESTORED
      ]
    });
  }

  /**
   * Export audit log to JSON
   */
  exportToJSON(auditLog: AuditLogEntry[]): string {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        entryCount: auditLog.length,
        entries: auditLog
      },
      null,
      2
    );
  }

  /**
   * Get statistics about the audit log
   */
  getStatistics(auditLog: AuditLogEntry[]): AuditLogStatistics {
    const operationCounts = new Map<AuditOperation, number>();
    const actorCounts = new Map<string, number>();
    let oldestEntry: Date | null = null;
    let newestEntry: Date | null = null;

    for (const entry of auditLog) {
      // Count operations
      const currentCount = operationCounts.get(entry.operation) || 0;
      operationCounts.set(entry.operation, currentCount + 1);

      // Count actors
      const currentActorCount = actorCounts.get(entry.actor) || 0;
      actorCounts.set(entry.actor, currentActorCount + 1);

      // Track oldest/newest
      const timestamp = entry.timestamp instanceof Date
        ? entry.timestamp
        : new Date(entry.timestamp);

      if (!oldestEntry || timestamp < oldestEntry) {
        oldestEntry = timestamp;
      }
      if (!newestEntry || timestamp > newestEntry) {
        newestEntry = timestamp;
      }
    }

    return {
      totalEntries: auditLog.length,
      operationCounts: Object.fromEntries(operationCounts),
      actorCounts: Object.fromEntries(actorCounts),
      oldestEntry,
      newestEntry
    };
  }
}

/**
 * Statistics about an audit log
 */
export interface AuditLogStatistics {
  totalEntries: number;
  operationCounts: Partial<Record<AuditOperation, number>>;
  actorCounts: Record<string, number>;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}
