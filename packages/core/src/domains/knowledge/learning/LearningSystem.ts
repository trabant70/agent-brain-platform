/**
 * Agent Brain Learning System
 * Main entry point for the learning capabilities
 */

import { TestFailure, LearningPattern, PropagationResult, FileScanner } from './types';
import { LearningAnalyzer } from './LearningAnalyzer';
import { LearningPropagator } from './LearningPropagator';
import { LearningStorage, MemoryLearningStorage, FileLearningStorage } from './LearningStorage';

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
      this.propagator =new LearningPropagator(new BasicFileScanner());
    }
  }

  async processFailure(failure: TestFailure): Promise<LearningPattern[]> {
    const patterns = await this?.analyzer?.analyzeFailure(failure);
    if (this?.config?.enablePropagation && patterns?.length > 0) {
      for (const pattern of patterns) {
        await this?.propagatePattern(pattern);
      }
    }
    return patterns;
  }

  async propagatePattern(pattern: LearningPattern): Promise<PropagationResult> {
    return this?.propagator?.propagatePattern(pattern);
  }

  async getPatterns(): Promise<LearningPattern[]> {
    return this?.storage?.getPatterns();
  }

  async getMetrics() {
    return this?.storage?.getMetrics();
  }

  async findSimilarPatterns(failure: TestFailure): Promise<LearningPattern[]> {
    return this?.storage?.findSimilarPatterns(failure);
  }
}

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
    try {
      const { glob } = await import('glob');
      return await glob(pattern);
    } catch (error) {
      return [];
    }
  }
}

export function createFileLearningSystem(
  storageFile: string = '.agent-brain/patterns.json',
  config: Omit<LearningSystemConfig, 'storage'> = {}
): LearningSystem {
  return new LearningSystem({
    ...config,
    storage: new FileLearningStorage(storageFile)
  });
}

export function createMemoryLearningSystem(
  config: Omit<LearningSystemConfig, 'storage'> = {}
): LearningSystem {
  return new LearningSystem({
    ...config,
    storage: new MemoryLearningStorage()
  });
}
