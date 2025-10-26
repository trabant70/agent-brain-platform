/**
 * ThreadLogger - JSONL File Writer
 *
 * Writes log entries to JSONL files with buffering and session management.
 */

import { LogEntry, ThreadSession } from '../types';

/**
 * File writer interface (platform-agnostic)
 * VSCode implementation will provide actual file I/O
 */
export interface FileWriter {
  writeLines(lines: string[]): Promise<void>;
  close(): Promise<void>;
}

/**
 * ThreadLogger - Buffered JSONL writer
 */
export class ThreadLogger {
  private fileWriter: FileWriter | null = null;
  private session: ThreadSession | null = null;

  constructor(fileWriter?: FileWriter) {
    this.fileWriter = fileWriter || null;
  }

  /**
   * Set file writer
   */
  setFileWriter(writer: FileWriter): void {
    this.fileWriter = writer;
  }

  /**
   * Start a new session
   */
  startSession(session: ThreadSession): void {
    this.session = session;
  }

  /**
   * End current session
   */
  async endSession(): Promise<void> {
    if (this.session) {
      this.session.endTime = Date.now();
      this.session = null;
    }

    if (this.fileWriter) {
      await this.fileWriter.close();
      this.fileWriter = null;
    }
  }

  /**
   * Get current session
   */
  getCurrentSession(): ThreadSession | null {
    return this.session;
  }

  /**
   * Write log entries
   */
  async writeEntries(entries: LogEntry[]): Promise<void> {
    if (!this.fileWriter) {
      // No writer configured, skip
      return;
    }

    if (entries.length === 0) {
      return;
    }

    // Add session ID to entries if in active session
    const enrichedEntries = entries.map(entry => {
      if (this.session && !entry.session) {
        return { ...entry, session: this.session.id };
      }
      return entry;
    });

    // Convert to JSONL format (one JSON object per line)
    const lines = enrichedEntries.map(entry => JSON.stringify(entry));

    // Write to file
    await this.fileWriter.writeLines(lines);
  }

  /**
   * Parse JSONL file
   */
  static parseJSONL(content: string): LogEntry[] {
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    const entries: LogEntry[] = [];

    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as LogEntry;
        entries.push(entry);
      } catch (error) {
        // Skip invalid lines
        console.warn(`Failed to parse log line: ${error}`);
      }
    }

    return entries;
  }

  /**
   * Generate JSONL content from entries
   */
  static toJSONL(entries: LogEntry[]): string {
    return entries.map(entry => JSON.stringify(entry)).join('\n') + '\n';
  }

  /**
   * Log a single entry
   * Convenience method for logging individual entries
   */
  async log(entry: any): Promise<void> {
    if (!this.fileWriter) {
      // No writer configured, skip
      return;
    }

    // Add session ID if in active session
    const enrichedEntry = this.session && !entry.session
      ? { ...entry, session: this.session.id }
      : entry;

    // Convert to JSONL
    const line = JSON.stringify(enrichedEntry);

    // Write to file
    await this.fileWriter.writeLines([line]);
  }
}

/**
 * Global ThreadLogger instance (singleton)
 */
let globalThreadLogger: ThreadLogger | null = null;

/**
 * Get global ThreadLogger instance
 */
export function getInstance(): ThreadLogger {
  if (!globalThreadLogger) {
    globalThreadLogger = new ThreadLogger();
  }
  return globalThreadLogger;
}

/**
 * Set global ThreadLogger instance
 */
export function setInstance(logger: ThreadLogger): void {
  globalThreadLogger = logger;
}
