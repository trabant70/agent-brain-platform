/**
 * PathwayLearningAdapter
 *
 * Connects pathway test failures to the learning system.
 * Closes the feedback loop: Tests → Learnings → Patterns
 */

import { ITestFailureAdapter } from '../base/IntelligenceAdapter';
import { LearningPattern, TestFailure } from '../../core/learning/types';
import { LearningSystem } from '../../core/learning';

/**
 * Pathway test failure format (from PathwayReporter)
 */
export interface PathwayTestFailure {
  pathway: string;
  testName: string;
  failedAtMilestone: string;
  expectedMilestones: string[];
  actualMilestones: string[];
  debugAnalysis: {
    hypotheses: Array<{
      category: string;
      confidence: number;
      description: string;
    }>;
    checklist: string[];
  };
  stackTrace?: string;
  timestamp: Date;
}

/**
 * Adapter that converts pathway test failures into learnings
 */
export class PathwayLearningAdapter implements ITestFailureAdapter {
  readonly id = 'pathway-learning';
  readonly name = 'Pathway Test Learning Adapter';

  constructor(private learningSystem: LearningSystem) {}

  async initialize(): Promise<void> {
    // No initialization needed
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }

  async dispose(): Promise<void> {
    // No cleanup needed
  }

  /**
   * Convert pathway test failure to TestFailure format
   */
  convertToTestFailure(pathwayFailure: PathwayTestFailure): TestFailure {
    return {
      test: `${pathwayFailure.pathway} - ${pathwayFailure.testName}`,
      error: `Failed at milestone: ${pathwayFailure.failedAtMilestone}`,
      file: 'pathway-test',
      context: {
        timestamp: pathwayFailure.timestamp,
        pathway: pathwayFailure.pathway,
        failedMilestone: pathwayFailure.failedAtMilestone,
        expectedMilestones: pathwayFailure.expectedMilestones,
        actualMilestones: pathwayFailure.actualMilestones,
        hypotheses: pathwayFailure.debugAnalysis.hypotheses,
        checklist: pathwayFailure.debugAnalysis.checklist,
        stackTrace: pathwayFailure.stackTrace
      }
    };
  }

  /**
   * Process pathway test failure through learning system
   */
  async processFailure(pathwayFailure: TestFailure): Promise<LearningPattern[]> {
    // If it's already a TestFailure, process directly
    if ('test' in pathwayFailure && 'error' in pathwayFailure) {
      return this.learningSystem.processFailure(pathwayFailure);
    }

    // Otherwise convert from PathwayTestFailure
    const testFailure = this.convertToTestFailure(pathwayFailure as any);
    return this.learningSystem.processFailure(testFailure);
  }

  /**
   * Process multiple pathway failures at once
   */
  async processMultipleFailures(
    failures: PathwayTestFailure[]
  ): Promise<LearningPattern[]> {
    const allPatterns: LearningPattern[] = [];

    for (const failure of failures) {
      const testFailure = this.convertToTestFailure(failure);
      const patterns = await this.learningSystem.processFailure(testFailure);
      allPatterns.push(...patterns);
    }

    return allPatterns;
  }

  /**
   * Load pathway test results from JSON file and process
   */
  async processFromFile(filePath: string): Promise<LearningPattern[]> {
    const fs = await import('fs-extra');

    if (!(await fs.pathExists(filePath))) {
      throw new Error(`Pathway results file not found: ${filePath}`);
    }

    const results = await fs.readJson(filePath);
    const failures: PathwayTestFailure[] = results.failures || [];

    return this.processMultipleFailures(failures);
  }
}
