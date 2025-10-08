/**
 * SuccessPatternDetector - Analyzes successful sessions and creates/updates patterns
 *
 * This is the core intelligence that learns from what works well
 */

import { SuccessPattern, SuccessPatternFactory, SessionSummary, AppliesWhen } from './SuccessPattern';
import { SuccessMetrics } from './SuccessMetrics';
import * as fs from 'fs';
import * as path from 'path';

export interface DetectorConfig {
  storagePath: string;
  minConfidenceThreshold: number;  // 0-1, patterns below this are discarded
  maxPatternsPerType: number;      // Max patterns to keep per task type
  similarityThreshold: number;     // 0-1, how similar patterns must be to merge
}

export class SuccessPatternDetector {
  private patterns: Map<string, SuccessPattern> = new Map();
  private config: DetectorConfig;
  private patternsFilePath: string;

  constructor(config: DetectorConfig) {
    this.config = config;
    this.patternsFilePath = path.join(config.storagePath, 'success-patterns.json');
    this.loadPatterns();
  }

  /**
   * Analyze a successful session and create/update patterns
   */
  async analyzeSuccess(sessionSummary: SessionSummary): Promise<SuccessPattern[]> {
    if (!sessionSummary.outcome.success) {
      throw new Error('Cannot analyze unsuccessful session for success patterns');
    }

    const taskType = this.inferTaskType(sessionSummary.prompt);
    const projectType = undefined;  // TODO: Get from ProjectProfileManager

    // Find similar existing patterns
    const similarPatterns = this.findSimilarPatterns(
      taskType,
      sessionSummary.knowledgeUsed,
      sessionSummary.prompt
    );

    const updatedPatterns: SuccessPattern[] = [];

    if (similarPatterns.length > 0) {
      // Update existing patterns
      for (const existingPattern of similarPatterns) {
        const updated = SuccessPatternFactory.updateWithOutcome(
          existingPattern,
          sessionSummary,
          true  // This is a success
        );

        this.patterns.set(updated.id, updated);
        updatedPatterns.push(updated);
      }
    } else {
      // Create new pattern
      const newPattern = SuccessPatternFactory.createFromSession(
        sessionSummary,
        taskType,
        projectType
      );

      this.patterns.set(newPattern.id, newPattern);
      updatedPatterns.push(newPattern);
    }

    // Merge very similar patterns
    await this.mergeSimilarPatterns();

    // Prune low-confidence patterns
    this.pruneLowConfidencePatterns();

    // Save to disk
    await this.savePatterns();

    return updatedPatterns;
  }

  /**
   * Record a failure to update pattern confidence
   */
  async recordFailure(sessionSummary: SessionSummary, patternsApplied: string[]): Promise<void> {
    for (const patternId of patternsApplied) {
      const pattern = this.patterns.get(patternId);
      if (pattern) {
        const updated = SuccessPatternFactory.updateWithOutcome(
          pattern,
          sessionSummary,
          false  // This is a failure
        );

        this.patterns.set(updated.id, updated);
      }
    }

    // Prune patterns that are now low-confidence
    this.pruneLowConfidencePatterns();

    await this.savePatterns();
  }

  /**
   * Get patterns that apply to a given context
   */
  getApplicablePatterns(
    taskType: string,
    contextHints: string[],
    projectType?: string
  ): SuccessPattern[] {
    const applicable: SuccessPattern[] = [];

    for (const pattern of this.patterns.values()) {
      if (this.patternApplies(pattern, taskType, contextHints, projectType)) {
        applicable.push(pattern);
      }
    }

    // Sort by confidence (highest first)
    applicable.sort((a, b) => b.evidence.confidence - a.evidence.confidence);

    return applicable;
  }

  /**
   * Get all patterns sorted by effectiveness
   */
  getAllPatterns(sortBy: 'confidence' | 'usage' | 'recent' = 'confidence'): SuccessPattern[] {
    const patterns = Array.from(this.patterns.values());

    switch (sortBy) {
      case 'confidence':
        return patterns.sort((a, b) => b.evidence.confidence - a.evidence.confidence);

      case 'usage':
        return patterns.sort((a, b) => b.timesApplied - a.timesApplied);

      case 'recent':
        return patterns.sort((a, b) => {
          const aTime = a.lastAppliedAt?.getTime() || 0;
          const bTime = b.lastAppliedAt?.getTime() || 0;
          return bTime - aTime;
        });

      default:
        return patterns;
    }
  }

  /**
   * Get statistics about patterns
   */
  getStatistics(): {
    totalPatterns: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    byTaskType: Map<string, number>;
    mostUsed: SuccessPattern[];
  } {
    const patterns = Array.from(this.patterns.values());

    const highConfidence = patterns.filter(p => p.evidence.confidence >= 0.8).length;
    const mediumConfidence = patterns.filter(p => p.evidence.confidence >= 0.5 && p.evidence.confidence < 0.8).length;
    const lowConfidence = patterns.filter(p => p.evidence.confidence < 0.5).length;

    const byTaskType = new Map<string, number>();
    for (const pattern of patterns) {
      for (const taskType of pattern.appliesWhen.taskType || []) {
        byTaskType.set(taskType, (byTaskType.get(taskType) || 0) + 1);
      }
    }

    const mostUsed = patterns
      .sort((a, b) => b.timesApplied - a.timesApplied)
      .slice(0, 5);

    return {
      totalPatterns: patterns.length,
      highConfidence,
      mediumConfidence,
      lowConfidence,
      byTaskType,
      mostUsed
    };
  }

  /**
   * Clear all patterns (useful for testing or reset)
   */
  async clearPatterns(): Promise<void> {
    this.patterns.clear();
    await this.savePatterns();
  }

  // Private helper methods

  private inferTaskType(prompt: string): string {
    const lower = prompt.toLowerCase();

    if (/\b(fix|bug|error|issue|broken|crash|fail)\b/.test(lower)) return 'bug';
    if (/\b(add|create|implement|new|feature|build)\b/.test(lower)) return 'feature';
    if (/\b(refactor|clean|improve|reorganize|restructure)\b/.test(lower)) return 'refactor';
    if (/\b(test|spec|coverage|validate)\b/.test(lower)) return 'test';
    if (/\b(document|readme|comment|explain)\b/.test(lower)) return 'docs';
    if (/\b(optimize|performance|speed|slow|fast)\b/.test(lower)) return 'performance';

    return 'other';
  }

  private findSimilarPatterns(
    taskType: string,
    knowledgeUsed: string[],
    prompt: string
  ): SuccessPattern[] {
    const similar: SuccessPattern[] = [];
    const contextHints = this.extractContextHints(prompt);

    for (const pattern of this.patterns.values()) {
      const similarity = this.calculateSimilarity(
        pattern,
        taskType,
        knowledgeUsed,
        contextHints
      );

      if (similarity >= this.config.similarityThreshold) {
        similar.push(pattern);
      }
    }

    return similar;
  }

  private calculateSimilarity(
    pattern: SuccessPattern,
    taskType: string,
    knowledgeUsed: string[],
    contextHints: string[]
  ): number {
    let score = 0;
    let weights = 0;

    // Task type match (weight: 0.4)
    if (pattern.appliesWhen.taskType?.includes(taskType)) {
      score += 0.4;
    }
    weights += 0.4;

    // Knowledge items overlap (weight: 0.4)
    const patternKnowledge = new Set(pattern.successFactors.knowledgeItemsUsed);
    const usedKnowledge = new Set(knowledgeUsed);
    const intersection = new Set([...patternKnowledge].filter(x => usedKnowledge.has(x)));
    const union = new Set([...patternKnowledge, ...usedKnowledge]);

    if (union.size > 0) {
      const overlap = intersection.size / union.size;
      score += overlap * 0.4;
    }
    weights += 0.4;

    // Context hints overlap (weight: 0.2)
    const patternHints = new Set(pattern.appliesWhen.contextHints || []);
    const currentHints = new Set(contextHints);
    const hintIntersection = new Set([...patternHints].filter(x => currentHints.has(x)));
    const hintUnion = new Set([...patternHints, ...currentHints]);

    if (hintUnion.size > 0) {
      const hintOverlap = hintIntersection.size / hintUnion.size;
      score += hintOverlap * 0.2;
    }
    weights += 0.2;

    return weights > 0 ? score / weights : 0;
  }

  private extractContextHints(prompt: string): string[] {
    const hints: string[] = [];
    const commonHints = [
      'authentication', 'authorization', 'database', 'api', 'ui', 'frontend',
      'backend', 'testing', 'performance', 'security', 'deployment', 'logging'
    ];

    const lowerPrompt = prompt.toLowerCase();
    for (const hint of commonHints) {
      if (lowerPrompt.includes(hint)) {
        hints.push(hint);
      }
    }

    return hints;
  }

  private patternApplies(
    pattern: SuccessPattern,
    taskType: string,
    contextHints: string[],
    projectType?: string
  ): boolean {
    // Must meet minimum confidence threshold
    if (pattern.evidence.confidence < this.config.minConfidenceThreshold) {
      return false;
    }

    // Task type must match
    if (pattern.appliesWhen.taskType && !pattern.appliesWhen.taskType.includes(taskType)) {
      return false;
    }

    // Project type must match if specified
    if (projectType && pattern.appliesWhen.projectType) {
      if (!pattern.appliesWhen.projectType.includes(projectType)) {
        return false;
      }
    }

    // Context hints should have some overlap (at least 1)
    if (contextHints.length > 0 && pattern.appliesWhen.contextHints) {
      const hasOverlap = contextHints.some(hint =>
        pattern.appliesWhen.contextHints?.includes(hint)
      );

      if (!hasOverlap) {
        return false;
      }
    }

    return true;
  }

  private async mergeSimilarPatterns(): Promise<void> {
    const patterns = Array.from(this.patterns.values());

    for (let i = 0; i < patterns.length; i++) {
      for (let j = i + 1; j < patterns.length; j++) {
        const pattern1 = patterns[i];
        const pattern2 = patterns[j];

        // Check if patterns are very similar (>90% overlap)
        const similarity = this.calculateSimilarity(
          pattern1,
          pattern2.appliesWhen.taskType?.[0] || 'other',
          pattern2.successFactors.knowledgeItemsUsed,
          pattern2.appliesWhen.contextHints || []
        );

        if (similarity > 0.9) {
          // Merge into pattern1, delete pattern2
          const merged = SuccessPatternFactory.mergePatterns(pattern1, pattern2);
          this.patterns.set(merged.id, merged);
          this.patterns.delete(pattern2.id);

          // Update patterns array to reflect deletion
          patterns.splice(j, 1);
          j--;  // Adjust index after deletion
        }
      }
    }
  }

  private pruneLowConfidencePatterns(): void {
    const toDelete: string[] = [];

    for (const [id, pattern] of this.patterns) {
      if (pattern.evidence.confidence < this.config.minConfidenceThreshold) {
        // Only prune if the pattern has been tried at least 5 times
        const totalAttempts = pattern.evidence.successCount + pattern.evidence.failureCount;
        if (totalAttempts >= 5) {
          toDelete.push(id);
        }
      }
    }

    for (const id of toDelete) {
      this.patterns.delete(id);
    }

    // Also prune excess patterns per task type
    this.pruneExcessPatterns();
  }

  private pruneExcessPatterns(): void {
    // Group patterns by task type
    const byTaskType = new Map<string, SuccessPattern[]>();

    for (const pattern of this.patterns.values()) {
      for (const taskType of pattern.appliesWhen.taskType || ['other']) {
        if (!byTaskType.has(taskType)) {
          byTaskType.set(taskType, []);
        }
        byTaskType.get(taskType)!.push(pattern);
      }
    }

    // For each task type, keep only the top N patterns
    for (const [taskType, patterns] of byTaskType) {
      if (patterns.length > this.config.maxPatternsPerType) {
        // Sort by confidence, keep top N
        const sorted = patterns.sort((a, b) => b.evidence.confidence - a.evidence.confidence);
        const toDelete = sorted.slice(this.config.maxPatternsPerType);

        for (const pattern of toDelete) {
          this.patterns.delete(pattern.id);
        }
      }
    }
  }

  private loadPatterns(): void {
    try {
      if (fs.existsSync(this.patternsFilePath)) {
        const data = fs.readFileSync(this.patternsFilePath, 'utf8');
        const parsed = JSON.parse(data);

        // Convert dates back from strings
        for (const patternData of parsed.patterns || []) {
          const pattern: SuccessPattern = {
            ...patternData,
            createdAt: new Date(patternData.createdAt),
            lastAppliedAt: patternData.lastAppliedAt ? new Date(patternData.lastAppliedAt) : undefined,
            evidence: {
              ...patternData.evidence,
              lastSuccessAt: new Date(patternData.evidence.lastSuccessAt),
              examples: patternData.evidence.examples.map((ex: any) => ({
                ...ex,
                timestamp: new Date(ex.timestamp)
              }))
            }
          };

          this.patterns.set(pattern.id, pattern);
        }
      }
    } catch (error) {
      console.error('Failed to load success patterns:', error);
      // Start fresh if loading fails
      this.patterns.clear();
    }
  }

  private async savePatterns(): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.patternsFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = {
        version: '1.0',
        lastSaved: new Date().toISOString(),
        patterns: Array.from(this.patterns.values())
      };

      fs.writeFileSync(
        this.patternsFilePath,
        JSON.stringify(data, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('Failed to save success patterns:', error);
      throw error;
    }
  }
}
