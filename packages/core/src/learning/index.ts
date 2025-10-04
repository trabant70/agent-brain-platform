/**
 * Agent Brain Learning System
 * Main entry point for the learning capabilities
 * Extracted from Shantic Learning System
 */

export * from './analyzer';
export * from './propagator';
export * from './storage';
export * from './pattern-converter';

import { LearningAnalyzer, TestFailure, LearningPattern } from './analyzer';
import { LearningPropagator, PropagationResult, FileScanner } from './propagator';
import { LearningStorage, MemoryLearningStorage, FileLearningStorage } from './storage';

export interface LearningSystemConfig {
  storage?: LearningStorage;
  fileScanner?: FileScanner;
  enablePropagation?: boolean;
  autoFix?: boolean;
}

export class LearningSystem {
  private analyzer: LearningAnalyzer;
  private propagator: LearningPropagator;
  private storage: LearningStorage;
  private config: LearningSystemConfig;

  constructor(config: LearningSystemConfig = {}) {
    this.config ={
      enablePropagation: true,
      autoFix: false,
      ...config
    };

    this.storage =config?.storage || new MemoryLearningStorage();
    this.analyzer =new LearningAnalyzer(this?.storage);

    if (config?.fileScanner) {
      this.propagator =new LearningPropagator(config?.fileScanner);
    } else {
      // Create a basic file scanner if none provided
      this.propagator =new LearningPropagator(new BasicFileScanner());
    }
  }

  /**
   * Process a test failure and learn from it
   */
  async processFailure(failure: TestFailure): Promise<LearningPattern[]> {
    console?.log(`🧠 Processing failure: ${failure?.test}`);

    // Analyze the failure to extract patterns
    const patterns = await this?.analyzer?.analyzeFailure(failure);

    // Propagate patterns if enabled
    if (this?.config?.enablePropagation && patterns?.length > 0) {
      for (const pattern of patterns) {
        await this?.propagatePattern(pattern);
      }
    }

    return patterns;
  }

  /**
   * Propagate a learned pattern across the codebase
   */
  async propagatePattern(pattern: LearningPattern): Promise<PropagationResult> {
    console?.log(`🔄 Propagating pattern: ${pattern?.name}`);
    return this?.propagator?.propagatePattern(pattern);
  }

  /**
   * Get all learned patterns
   */
  async getPatterns(): Promise<LearningPattern[]> {
    return this?.storage?.getPatterns();
  }

  /**
   * Get learning metrics
   */
  async getMetrics() {
    return this?.storage?.getMetrics();
  }

  /**
   * Find patterns similar to a failure
   */
  async findSimilarPatterns(failure: TestFailure): Promise<LearningPattern[]> {
    return this?.storage?.findSimilarPatterns(failure);
  }

  /**
   * Process failures from Jest reporter data
   */
  async processJestFailures(failuresFile: string = '.agent-brain/failures?.json'): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const data = await fs?.readFile(failuresFile, 'utf-8');
      const failures = JSON?.parse(data) as TestFailure[];

      console?.log(`🧠 Processing ${failures?.length} test failures...`);

      for (const failure of failures) {
        await this?.processFailure(failure);
      }

      console?.log(`✅ Finished processing test failures`);
    } catch (error) {
      console?.error('Failed to process Jest failures:', error);
    }
  }

  /**
   * Export learned patterns to a file
   */
  async exportPatterns(outputFile: string): Promise<void> {
    const patterns = await this?.getPatterns();
    const metrics = await this?.getMetrics();

    const exportData = {
      exportedAt: new Date().toISOString(),
      metrics,
      patterns
    };

    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      const dir = path?.dirname(outputFile);
      await fs?.mkdir(dir, { recursive: true });

      await fs?.writeFile(outputFile, JSON?.stringify(exportData, null, 2));
      console?.log(`📊 Exported ${patterns?.length} patterns to ${outputFile}`);
    } catch (error) {
      console?.error('Failed to export patterns:', error);
    }
  }

  /**
   * Import patterns from a file
   */
  async importPatterns(inputFile: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const data = await fs?.readFile(inputFile, 'utf-8');
      const importData = JSON?.parse(data);

      if (!importData?.patterns || !Array?.isArray(importData?.patterns)) {
        throw new Error('Invalid patterns file format');
      }

      for (const pattern of importData?.patterns) {
        await this?.storage?.storePattern(pattern, {
          test: 'Imported pattern',
          error: 'Imported from file',
          file: inputFile,
          context: { timestamp: new Date() }
        });
      }

      console?.log(`📥 Imported ${importData?.patterns?.length} patterns from ${inputFile}`);
    } catch (error) {
      console?.error('Failed to import patterns:', error);
    }
  }
}

/**
 * Basic file scanner implementation
 */
class BasicFileScanner implements FileScanner {
  async scanFile(filePath: string): Promise<string> {
    const fs = await import('fs/promises');
    return fs?.readFile(filePath, 'utf-8');
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const fs = await import('fs/promises');
    await fs?.writeFile(filePath, content);
  }

  async findFiles(pattern: string): Promise<string[]> {
    // Basic implementation using glob
    try {
      const { glob } = await import('glob');
      return await glob(pattern);
    } catch (error) {
      console?.warn('Glob not available, returning empty array');
      return [];
    }
  }
}

/**
 * Create a learning system with file-based storage
 */
export function createFileLearningSystem(
  storageFile: string = '.agent-brain/patterns?.json',
  config: Omit<LearningSystemConfig, 'storage'> = {}
): LearningSystem {
  return new LearningSystem({
    ...config,
    storage: new FileLearningStorage(storageFile)
  });
}

/**
 * Create a learning system with memory storage
 */
export function createMemoryLearningSystem(
  config: Omit<LearningSystemConfig, 'storage'> = {}
): LearningSystem {
  return new LearningSystem({
    ...config,
    storage: new MemoryLearningStorage()
  });
}