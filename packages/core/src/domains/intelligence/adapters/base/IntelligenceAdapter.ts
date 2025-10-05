/**
 * Base Intelligence Adapter Interface
 *
 * Intelligence adapters are INPUT mechanisms that feed data into the learning system.
 */

import { LearningPattern, TestFailure } from '../../core/learning/types';

export interface IIntelligenceAdapter {
  readonly id: string;
  readonly name: string;
  initialize(): Promise<void>;
  isHealthy(): Promise<boolean>;
  dispose(): Promise<void>;
}

export interface ITestFailureAdapter extends IIntelligenceAdapter {
  processFailure(failure: TestFailure): Promise<LearningPattern[]>;
}

export interface IAnalysisTriggerAdapter extends IIntelligenceAdapter {
  triggerAnalysis(files: string[]): Promise<void>;
  applySuggestion(patternId: string, file: string): Promise<void>;
}

export interface IRealtimeAdapter extends IIntelligenceAdapter {
  subscribe(event: string, callback: (...args: any[]) => void): void;
  unsubscribe(event: string, callback: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): void;
}
