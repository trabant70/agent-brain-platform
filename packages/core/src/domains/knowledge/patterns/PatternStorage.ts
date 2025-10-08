/**
 * Pattern Storage
 * File-based persistence for pattern detection rules
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { EnginePattern } from './types';

/**
 * Storage interface for patterns
 */
export interface PatternStorage {
  save(patterns: EnginePattern[]): Promise<void>;
  load(): Promise<EnginePattern[]>;
  getMetadata(): Promise<PatternStorageMetadata>;
}

/**
 * Metadata about stored patterns
 */
export interface PatternStorageMetadata {
  version: string;
  exportedAt: string;
  totalPatterns: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  autoFixablePatterns: number;
}

/**
 * File-based pattern storage
 * Stores patterns in JSON format with metadata
 */
export class FilePatternStorage implements PatternStorage {
  constructor(private filePath: string) {}

  async save(patterns: EnginePattern[]): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true });

      const data = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        statistics: this.computeStatistics(patterns),
        patterns: patterns.map(p => this.serializePattern(p))
      };

      await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      throw error;
    }
  }

  async load(): Promise<EnginePattern[]> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      const data = JSON.parse(content);

      const patterns = (data.patterns || []).map((p: any) =>
        this.deserializePattern(p)
      );

      return patterns;
    } catch (error) {
      // File doesn't exist or is invalid - return empty array
      return [];
    }
  }

  async getMetadata(): Promise<PatternStorageMetadata> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      const data = JSON.parse(content);
      return {
        version: data.version,
        exportedAt: data.exportedAt,
        totalPatterns: data.statistics.totalPatterns,
        byCategory: data.statistics.byCategory,
        bySeverity: data.statistics.bySeverity,
        autoFixablePatterns: data.statistics.autoFixablePatterns
      };
    } catch {
      return {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        totalPatterns: 0,
        byCategory: {},
        bySeverity: {},
        autoFixablePatterns: 0
      };
    }
  }

  /**
   * Serialize pattern for JSON storage
   * Converts RegExp to string for JSON compatibility
   */
  private serializePattern(pattern: EnginePattern): any {
    return {
      ...pattern,
      // Convert RegExp to string for JSON
      trigger: pattern.trigger instanceof RegExp
        ? pattern.trigger.source
        : pattern.trigger
    };
  }

  /**
   * Deserialize pattern from JSON
   * Converts string back to RegExp where appropriate
   */
  private deserializePattern(data: any): EnginePattern {
    return {
      ...data,
      // Convert string back to RegExp if it looks like a regex pattern
      trigger: typeof data.trigger === 'string' && this.isRegExpString(data.trigger)
        ? new RegExp(data.trigger)
        : data.trigger
    };
  }

  /**
   * Heuristic to detect if a string should be a RegExp
   * Checks for regex metacharacters
   */
  private isRegExpString(str: string): boolean {
    return /[\^\$\.\*\+\?\[\]\{\}\(\)\|\\]/.test(str);
  }

  /**
   * Compute statistics about patterns for metadata
   */
  private computeStatistics(patterns: EnginePattern[]): PatternStorageMetadata {
    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    patterns.forEach(p => {
      byCategory[p.category] = (byCategory[p.category] || 0) + 1;
      bySeverity[p.severity] = (bySeverity[p.severity] || 0) + 1;
    });

    const autoFixablePatterns = patterns.filter(p => p.autoFix?.enabled).length;

    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      totalPatterns: patterns.length,
      byCategory,
      bySeverity,
      autoFixablePatterns
    };
  }
}
