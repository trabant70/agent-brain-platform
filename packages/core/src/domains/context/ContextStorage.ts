/**
 * ContextStorage - Persists context to .agent-brain/context.json
 *
 * Simple file-based storage following the same pattern as:
 * - ADRStorage (adrs.json)
 * - PatternStorage (patterns.json)
 * - LearningStorage (learnings.json)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Context, StoredContext } from './types';

export class ContextStorage {
  private filePath: string;

  constructor(storagePath: string) {
    this.filePath = path.join(storagePath, 'context.json');
  }

  /**
   * Load all contexts from storage
   */
  async load(): Promise<Record<string, Context>> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      const stored: StoredContext = JSON.parse(data);
      return stored.contexts || {};
    } catch (error: any) {
      // File doesn't exist yet - return empty
      if (error.code === 'ENOENT') {
        return {};
      }
      throw error;
    }
  }

  /**
   * Save all contexts to storage
   */
  async save(contexts: Record<string, Context>): Promise<void> {
    const stored: StoredContext = {
      version: '1.0.0',
      contexts,
      exportedAt: new Date()
    };

    // Ensure directory exists
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });

    // Write to file
    await fs.writeFile(
      this.filePath,
      JSON.stringify(stored, null, 2),
      'utf-8'
    );
  }

  /**
   * Append a single context (useful for incremental saves)
   */
  async append(projectPath: string, context: Context): Promise<void> {
    const contexts = await this.load();
    contexts[projectPath] = context;
    await this.save(contexts);
  }

  /**
   * Get storage file path
   */
  getFilePath(): string {
    return this.filePath;
  }
}
