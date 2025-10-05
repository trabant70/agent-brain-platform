/**
 * Event source information for multi-provider deduplication
 */
export interface EventSource {
  /** Provider ID that contributed this event */
  providerId: string;

  /** Source-specific event ID */
  sourceId: string;

  /** When this source discovered/created the event */
  timestamp?: Date;

  /** Source-specific metadata */
  metadata?: Record<string, unknown>;
}
