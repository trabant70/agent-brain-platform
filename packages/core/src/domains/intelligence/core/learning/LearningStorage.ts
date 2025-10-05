/**
 * Agent Brain Learning Storage
 * Storage interface and implementations for learning patterns
 * Extracted from Shantic Learning System
 */

import { LearningPattern, TestFailure, LearningMetrics } from './LearningAnalyzer';

export interface LearningStorage {
  storePattern(pattern: LearningPattern, failure: TestFailure): Promise<void>;
  getPatterns(): Promise<LearningPattern[]>;
  getMetrics(): Promise<LearningMetrics>;
  findSimilarPatterns(failure: TestFailure): Promise<LearningPattern[]>;
  updatePattern(id: string, updates: Partial<LearningPattern>): Promise<void>;
  deletePattern(id: string): Promise<void>;
}

/**
 * In-memory storage implementation for development/testing
 */
export class MemoryLearningStorage implements LearningStorage {
  private patterns: Map<string, LearningPattern> = new Map();
  private failures: Map<string, TestFailure[]> = new Map();

  async storePattern(pattern: LearningPattern, failure: TestFailure): Promise<void> {
    const id = pattern.id || this.generateId();
    pattern.id = id;

    // Store pattern
    this.patterns.set(id, pattern);

    // Store associated failure
    if (!this.failures.has(id)) {
      this.failures.set(id, []);
    }
    this.failures.get(id)!.push(failure);

    console.log(`🧠 Stored pattern: ${pattern.name} (${id})`);
  }

  async getPatterns(): Promise<LearningPattern[]> {
    const patterns = Array.from(this.patterns.values());

    // Add occurrence counts
    return patterns.map(pattern => ({
      ...pattern,
      occurrences: this.failures.get(pattern.id!)?.length || 0
    }));
  }

  async getMetrics(): Promise<LearningMetrics> {
    const patterns = await this.getPatterns();
    const totalOccurrences = patterns.reduce((sum, p) => sum + (p?.occurrences || 0), 0);

    // Calculate category counts
    const categoryMap = new Map<string, number>();
    patterns.forEach(p => {
      categoryMap.set(p?.category, (categoryMap.get(p?.category) || 0) + 1);
    });

    const topCategories = Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b?.count - a?.count)
      .slice(0, 5);

    const avgConfidenceScore = patterns.length > 0
      ? patterns.reduce((sum, p) => sum + (p?.confidenceScore || 0), 0) / patterns.length
      : 0;

    return {
      totalPatterns: patterns.length,
      totalOccurrences,
      avgConfidenceScore,
      topCategories,
      recentPatterns: patterns.slice(0, 10)
    };
  }

  async findSimilarPatterns(failure: TestFailure): Promise<LearningPattern[]> {
    const patterns = Array.from(this.patterns.values());
    const similar: LearningPattern[] = [];

    for (const pattern of patterns) {
      const similarity = this.calculateSimilarity(failure, pattern);
      if (similarity > 0.7) {
        similar.push({
          ...pattern,
          confidenceScore: similarity
        });
      }
    }

    return similar.sort((a, b) => (b?.confidenceScore || 0) - (a?.confidenceScore || 0));
  }

  async updatePattern(id: string, updates: Partial<LearningPattern>): Promise<void> {
    const existing = this.patterns.get(id);
    if (existing) {
      this.patterns.set(id, { ...existing, ...updates });
    }
  }

  async deletePattern(id: string): Promise<void> {
    this.patterns.delete(id);
    this.failures.delete(id);
  }

  private generateId(): string {
    return `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateSimilarity(failure: TestFailure, pattern: LearningPattern): number {
    let score = 0;

    // Check error message similarity
    if (this.containsSimilarError(failure.error, pattern)) {
      score += 0.5;
    }

    // Check file path similarity
    if (this.containsSimilarFile(failure.file, pattern)) {
      score += 0.3;
    }

    // Check test name similarity
    if (this.containsSimilarTest(failure.test, pattern)) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  private containsSimilarError(error: string, pattern: LearningPattern): boolean {
    const errorKeywords = this.extractKeywords(error);
    const patternKeywords = this.extractKeywords(pattern.description);

    const commonKeywords = errorKeywords.filter(keyword =>
      patternKeywords.includes(keyword)
    );

    return commonKeywords.length > 0;
  }

  private containsSimilarFile(file: string, pattern: LearningPattern): boolean {
    return pattern.service ? file.includes(pattern.service) : false;
  }

  private containsSimilarTest(test: string, pattern: LearningPattern): boolean {
    const testKeywords = this.extractKeywords(test);
    const patternKeywords = this.extractKeywords(pattern.name);

    const commonKeywords = testKeywords.filter(keyword =>
      patternKeywords.includes(keyword)
    );

    return commonKeywords.length > 0;
  }

  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !['the', 'and', 'but', 'for', 'are', 'not', 'you', 'all'].includes(word));
  }
}

/**
 * File-based storage implementation
 */
export class FileLearningStorage implements LearningStorage {
  private patterns: Map<string, LearningPattern> = new Map();
  private storageFile: string;

  constructor(storageFile: string = '.agent-brain/patterns.json') {
    this.storageFile = storageFile;
    this.loadFromFile();
  }

  async storePattern(pattern: LearningPattern, failure: TestFailure): Promise<void> {
    const id = pattern.id || this.generateId();
    pattern.id = id;

    this.patterns.set(id, pattern);
    await this.saveToFile();

    console.log(`🧠 Stored pattern to file: ${pattern.name} (${id})`);
  }

  async getPatterns(): Promise<LearningPattern[]> {
    return Array.from(this.patterns.values());
  }

  async getMetrics(): Promise<LearningMetrics> {
    const patterns = await this.getPatterns();

    const categoryMap = new Map<string, number>();
    patterns.forEach(p => {
      categoryMap.set(p?.category, (categoryMap.get(p?.category) || 0) + 1);
    });

    const topCategories = Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b?.count - a?.count)
      .slice(0, 5);

    const avgConfidenceScore = patterns.length > 0
      ? patterns.reduce((sum, p) => sum + (p?.confidenceScore || 0), 0) / patterns.length
      : 0;

    return {
      totalPatterns: patterns.length,
      totalOccurrences: patterns.length, // Simplified for file storage
      avgConfidenceScore,
      topCategories,
      recentPatterns: patterns.slice(0, 10)
    };
  }

  async findSimilarPatterns(failure: TestFailure): Promise<LearningPattern[]> {
    // Use same logic as memory storage
    const memoryStorage = new MemoryLearningStorage();
    for (const pattern of this.patterns.values()) {
      await memoryStorage.storePattern(pattern, failure);
    }
    return memoryStorage.findSimilarPatterns(failure);
  }

  async updatePattern(id: string, updates: Partial<LearningPattern>): Promise<void> {
    const existing = this.patterns.get(id);
    if (existing) {
      this.patterns.set(id, { ...existing, ...updates });
      await this.saveToFile();
    }
  }

  async deletePattern(id: string): Promise<void> {
    this.patterns.delete(id);
    await this.saveToFile();
  }

  private async loadFromFile(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const data = await fs.readFile(this.storageFile, 'utf-8');
      const patterns = JSON.parse(data) as LearningPattern[];

      this.patterns.clear();
      patterns.forEach(pattern => {
        if (pattern.id) {
          this.patterns.set(pattern.id, pattern);
        }
      });

      console.log(`📂 Loaded ${patterns.length} patterns from ${this.storageFile}`);
    } catch (error) {
      // File doesn't exist or is invalid, start fresh
      console.log(`📂 No existing patterns file, starting fresh`);
    }
  }

  private async saveToFile(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      const dir = path.dirname(this.storageFile);
      await fs.mkdir(dir, { recursive: true });

      const patterns = Array.from(this.patterns.values());
      await fs.writeFile(this.storageFile, JSON.stringify(patterns, null, 2));
    } catch (error) {
      console.error(`Failed to save patterns to ${this.storageFile}:`, error);
    }
  }

  private generateId(): string {
    return `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}