/**
 * JsonlFileWriter
 *
 * VSCode implementation of FileWriter interface for ThreadLogger.
 * Writes execution traces to JSONL files with buffering and auto-flush.
 *
 * Features:
 * - Buffered writes (reduces I/O operations)
 * - Auto-flush on buffer size threshold
 * - Auto-flush on time interval
 * - Daily log rotation (.agent-brain/threading-logs/YYYY-MM-DD.jsonl)
 * - Directory creation if needed
 * - Clean shutdown with final flush
 */

import * as fs from 'fs';
import * as path from 'path';
import { FileWriter } from '@agent-brain/core/domains/threading/logging/ThreadLogger';

export interface JsonlFileWriterOptions {
  workspacePath: string;
  bufferSize?: number;        // Flush after this many lines (default: 100)
  flushIntervalMs?: number;   // Flush every N milliseconds (default: 5000)
  maxFileSizeMb?: number;     // Max file size before rotation (default: 100MB)
}

export class JsonlFileWriter implements FileWriter {
  private buffer: string[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private logFilePath: string;
  private logFileStream: fs.WriteStream | null = null;
  private bufferSize: number;
  private flushIntervalMs: number;
  private maxFileSizeBytes: number;
  private currentFileSize: number = 0;
  private isClosed: boolean = false;

  constructor(options: JsonlFileWriterOptions) {
    this.bufferSize = options.bufferSize ?? 100;
    this.flushIntervalMs = options.flushIntervalMs ?? 5000;
    this.maxFileSizeBytes = (options.maxFileSizeMb ?? 100) * 1024 * 1024;

    // Create log directory structure
    const logsDir = path.join(options.workspacePath, '.agent-brain', 'threading-logs');

    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Generate log file path with current date
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    this.logFilePath = path.join(logsDir, `${today}.jsonl`);

    // Check existing file size
    if (fs.existsSync(this.logFilePath)) {
      const stats = fs.statSync(this.logFilePath);
      this.currentFileSize = stats.size;

      // If file is too large, rotate it
      if (this.currentFileSize > this.maxFileSizeBytes) {
        this.rotateLogFile();
      }
    }

    // Open file stream for appending
    this.logFileStream = fs.createWriteStream(this.logFilePath, {
      flags: 'a', // Append mode
      encoding: 'utf8'
    });

    // Start flush timer
    this.startFlushTimer();

    console.log(`[JsonlFileWriter] Initialized with log file: ${this.logFilePath}`);
  }

  /**
   * Write lines to buffer
   */
  async writeLines(lines: string[]): Promise<void> {
    if (this.isClosed) {
      console.warn('[JsonlFileWriter] Attempted to write to closed writer');
      return;
    }

    if (lines.length === 0) {
      return;
    }

    // Add to buffer
    this.buffer.push(...lines);

    // Auto-flush if buffer exceeds threshold
    if (this.buffer.length >= this.bufferSize) {
      await this.flush();
    }
  }

  /**
   * Flush buffer to disk
   */
  private async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    if (this.isClosed || !this.logFileStream) {
      console.warn('[JsonlFileWriter] Cannot flush - writer is closed');
      return;
    }

    // Get buffered lines
    const linesToWrite = [...this.buffer];
    this.buffer = [];

    // Write to file stream
    const content = linesToWrite.join('\n') + '\n';
    const bytesWritten = Buffer.byteLength(content, 'utf8');

    return new Promise((resolve, reject) => {
      if (!this.logFileStream) {
        reject(new Error('Log file stream is not open'));
        return;
      }

      this.logFileStream.write(content, (error) => {
        if (error) {
          console.error('[JsonlFileWriter] Write error:', error);
          reject(error);
        } else {
          this.currentFileSize += bytesWritten;

          // Check if file size exceeded
          if (this.currentFileSize > this.maxFileSizeBytes) {
            this.rotateLogFile();
          }

          resolve();
        }
      });
    });
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(async () => {
      try {
        await this.flush();
      } catch (error) {
        console.error('[JsonlFileWriter] Flush timer error:', error);
      }
    }, this.flushIntervalMs);
  }

  /**
   * Rotate log file when it gets too large
   */
  private rotateLogFile(): void {
    // Close current stream
    if (this.logFileStream) {
      this.logFileStream.end();
      this.logFileStream = null;
    }

    // Rename current file with timestamp suffix
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedPath = this.logFilePath.replace('.jsonl', `-${timestamp}.jsonl`);

    try {
      if (fs.existsSync(this.logFilePath)) {
        fs.renameSync(this.logFilePath, rotatedPath);
        console.log(`[JsonlFileWriter] Rotated log file to: ${rotatedPath}`);
      }
    } catch (error) {
      console.error('[JsonlFileWriter] Failed to rotate log file:', error);
    }

    // Open new stream
    this.currentFileSize = 0;
    this.logFileStream = fs.createWriteStream(this.logFilePath, {
      flags: 'a',
      encoding: 'utf8'
    });
  }

  /**
   * Close writer and flush remaining buffer
   */
  async close(): Promise<void> {
    if (this.isClosed) {
      return;
    }

    console.log(`[JsonlFileWriter] Closing writer, flushing ${this.buffer.length} remaining entries`);

    // Stop flush timer
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Final flush
    try {
      await this.flush();
    } catch (error) {
      console.error('[JsonlFileWriter] Final flush error:', error);
    }

    // Close file stream
    if (this.logFileStream) {
      return new Promise((resolve, reject) => {
        if (!this.logFileStream) {
          resolve();
          return;
        }

        this.logFileStream.end((error) => {
          if (error) {
            console.error('[JsonlFileWriter] Close error:', error);
            reject(error);
          } else {
            this.logFileStream = null;
            this.isClosed = true;
            console.log('[JsonlFileWriter] Closed successfully');
            resolve();
          }
        });
      });
    } else {
      this.isClosed = true;
    }
  }

  /**
   * Get log file path
   */
  getLogFilePath(): string {
    return this.logFilePath;
  }

  /**
   * Get buffer size
   */
  getBufferSize(): number {
    return this.buffer.length;
  }

  /**
   * Get current file size in bytes
   */
  getCurrentFileSize(): number {
    return this.currentFileSize;
  }
}
