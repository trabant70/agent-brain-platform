/**
 * RuntimeEventManager
 *
 * Manages runtime events added in real-time.
 * Responsible for:
 * - Storing runtime events
 * - Merging runtime events with provider events
 * - Clearing runtime events
 */

import { CanonicalEvent } from '../../../events';
import { logger, LogCategory, LogPathway } from '../../../../infrastructure/logging';

export class RuntimeEventManager {
  private runtimeEvents: CanonicalEvent[] = [];

  /**
   * Add a runtime event (e.g., from session finalization)
   */
  addRuntimeEvent(event: CanonicalEvent): void {
    logger.info(
      LogCategory.ORCHESTRATION,
      `Adding runtime event: ${event.type} - ${event.title}`,
      'RuntimeEventManager.addRuntimeEvent',
      { eventId: event.id, type: event.type }
    );

    this.runtimeEvents.push(event);
  }

  /**
   * Get all runtime events
   */
  getRuntimeEvents(): CanonicalEvent[] {
    return [...this.runtimeEvents]; // Return copy
  }

  /**
   * Merge provider events with runtime events
   * Returns combined and sorted array
   */
  mergeWithRuntimeEvents(providerEvents: CanonicalEvent[]): CanonicalEvent[] {
    // Merge provider events with runtime events
    const events = [...providerEvents, ...this.runtimeEvents];

    // Sort by timestamp (most recent first)
    events.sort((a, b) => {
      const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
      const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
      return timeB - timeA;
    });

    logger.debug(
      LogCategory.ORCHESTRATION,
      `Merged ${providerEvents.length} provider events + ${this.runtimeEvents.length} runtime events = ${events.length} total`,
      'RuntimeEventManager.mergeWithRuntimeEvents'
    );

    return events;
  }

  /**
   * Clear all runtime events
   */
  clearRuntimeEvents(): void {
    logger.info(
      LogCategory.ORCHESTRATION,
      `Clearing ${this.runtimeEvents.length} runtime events`,
      'RuntimeEventManager.clearRuntimeEvents'
    );

    this.runtimeEvents = [];
  }

  /**
   * Get count of runtime events
   */
  getRuntimeEventCount(): number {
    return this.runtimeEvents.length;
  }
}
