/**
 * Sessions Domain
 *
 * Manages AI coding session tracking from prompt to completion.
 * Sessions represent the core unit of Agent Brain activity.
 */

export * from './types';
export * from './SessionManager';
export * from './SessionStorage';

import { SessionManager } from './SessionManager';
import { SessionStorage, SessionStorageConfig } from './SessionStorage';
import { Session } from './types';

/**
 * Factory function to create a SessionManager with automatic persistence
 *
 * This wires SessionManager to SessionStorage so that finalized sessions
 * are automatically persisted to disk.
 *
 * @param storageConfig - Configuration for SessionStorage
 * @returns SessionManager instance with storage wired up
 */
export function createSessionManager(storageConfig: SessionStorageConfig): SessionManager {
  const storage = new SessionStorage(storageConfig);
  const manager = new SessionManager();

  // Wire finalization to storage - sessions are auto-saved when finalized
  manager.on('session:finalized', async (session: Session) => {
    await storage.saveSession(session);
  });

  return manager;
}
