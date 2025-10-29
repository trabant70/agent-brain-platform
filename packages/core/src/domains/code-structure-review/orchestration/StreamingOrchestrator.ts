/**
 * Streaming Orchestrator
 *
 * Orchestrates the complete streaming analysis pipeline:
 * 1. Scan workspace files
 * 2. Stream-process files (extract metadata)
 * 3. Run analyzers on populated registries
 * 4. Aggregate and return results
 *
 * Memory-efficient: Only one file's AST in memory at a time
 */

import { UnifiedMetadataRegistry } from '../registries/UnifiedMetadataRegistry';
import { StreamingFileProcessor, type StreamingOptions } from '../streaming/StreamingFileProcessor';
import { ProgressEventEmitter, type ProgressEvent } from '../streaming/ProgressEventEmitter';
import {
  FeatureCompletenessAnalyzerStreaming,
  UIUXQualityAnalyzerStreaming,
  TestCoverageAnalyzerStreaming,
  InternationalizationAnalyzerStreaming,
  type FeatureCompletenessAnalysis,
  type UIUXQualityAnalysis,
  type TestCoverageAnalysis,
  type I18nAnalysis
} from '../analyzers';

export interface StreamingAnalysisOptions {
  /**
   * Files to analyze
   */
  files: Array<{ path: string; content: string }>;

  /**
   * Streaming processor options
   */
  streamingOptions?: StreamingOptions;

  /**
   * Which analyzers to run (default: all)
   */
  enabledAnalyzers?: Array<'feature-completeness' | 'ui-ux-quality' | 'test-coverage' | 'i18n'>;

  /**
   * Progress callback
   */
  onProgress?: (event: ProgressEvent) => void;

  /**
   * Maturity context for filtering results
   */
  maturityContext?: any;
}

export interface StreamingAnalysisResult {
  summary: {
    overallScore: number;
    totalIssues: number;
    totalFiles: number;
    analyzedFiles: number;
    duration: number;
    memoryUsage: {
      registryKB: number;
      registryMB: number;
      estimatedASTMB: number;
      savingsPercent: number;
    };
  };
  categories: Array<
    FeatureCompletenessAnalysis |
    UIUXQualityAnalysis |
    TestCoverageAnalysis |
    I18nAnalysis
  >;
  maturityContext?: any;
  timestamp: Date;
}

/**
 * Streaming orchestrator for memory-efficient code analysis
 */
export class StreamingOrchestrator {
  private registry: UnifiedMetadataRegistry;
  private processor: StreamingFileProcessor;
  private progressEmitter: ProgressEventEmitter;

  constructor() {
    this.registry = new UnifiedMetadataRegistry();
    this.progressEmitter = new ProgressEventEmitter();
    this.processor = new StreamingFileProcessor(this.registry, {
      batchSize: 50,
      enableProgress: true
    });
  }

  /**
   * Run complete streaming analysis
   */
  async analyze(options: StreamingAnalysisOptions): Promise<StreamingAnalysisResult> {
    console.log('[StreamingOrchestrator] Starting streaming analysis');
    console.log(`[StreamingOrchestrator] Files to analyze: ${options.files.length}`);

    const startTime = Date.now();

    try {
      // Reset registry
      this.registry.clearAll();
      this.progressEmitter.reset();

      // Subscribe to progress events
      if (options.onProgress) {
        this.progressEmitter.on(options.onProgress);
      }

      // Subscribe processor's progress emitter to our progress emitter
      this.processor.getProgressEmitter().on((event) => {
        this.progressEmitter.emitExtractingProgress(
          event.current,
          event.total,
          event.details?.currentFile,
          event.details?.registrySize
        );
      });

      // Phase 1: Emit scanning start
      this.progressEmitter.emitScanningStart(options.files.length);

      // Phase 2: Stream-process files (extract metadata)
      console.log('[StreamingOrchestrator] Phase 1: Stream-processing files...');
      this.progressEmitter.emitExtractingStart(options.files.length);

      await this.processor.processFiles(options.files);

      const extractionDuration = Date.now() - startTime;
      const memUsage = this.registry.getGlobalMemoryUsage();
      console.log(`[StreamingOrchestrator] ✓ Extraction complete in ${extractionDuration}ms`);
      console.log(`[StreamingOrchestrator]   Registry size: ${memUsage.totals.totalMB}MB`);
      console.log(`[StreamingOrchestrator]   Memory savings: ${memUsage.totals.estimatedVsAST.savingsPercent}%`);

      // Phase 3: Run analyzers
      console.log('[StreamingOrchestrator] Phase 2: Running analyzers...');
      const analyzerStartTime = Date.now();

      const enabledAnalyzers = options.enabledAnalyzers || [
        'feature-completeness',
        'ui-ux-quality',
        'test-coverage',
        'i18n'
      ];

      this.progressEmitter.emitAnalyzingStart(enabledAnalyzers.length);

      const categoryResults: Array<any> = [];

      // Run analyzers sequentially (they're fast, no AST traversal)
      for (let i = 0; i < enabledAnalyzers.length; i++) {
        const analyzerId = enabledAnalyzers[i];
        this.progressEmitter.emitAnalyzingProgress(i, enabledAnalyzers.length, analyzerId);

        const analyzerStart = Date.now();
        const result = await this.runAnalyzer(analyzerId);

        if (result) {
          categoryResults.push(result);
        }

        const analyzerDuration = Date.now() - analyzerStart;
        this.progressEmitter.emitAnalyzerComplete(i + 1, enabledAnalyzers.length, analyzerId, analyzerDuration);
      }

      const analyzerDuration = Date.now() - analyzerStartTime;
      console.log(`[StreamingOrchestrator] ✓ Analyzers complete in ${analyzerDuration}ms`);

      this.progressEmitter.emitAnalyzingComplete(enabledAnalyzers.length, analyzerDuration);

      // Phase 4: Aggregate results
      console.log('[StreamingOrchestrator] Phase 3: Aggregating results...');
      this.progressEmitter.emitAggregatingStart();

      const result = this.aggregateResults(categoryResults, options, startTime, memUsage);

      this.progressEmitter.emitAggregatingComplete();

      const totalDuration = Date.now() - startTime;
      console.log(`[StreamingOrchestrator] ✓ Analysis complete in ${totalDuration}ms`);
      console.log(`[StreamingOrchestrator]   Total issues: ${result.summary.totalIssues}`);
      console.log(`[StreamingOrchestrator]   Overall score: ${result.summary.overallScore}/100`);

      this.progressEmitter.emitComplete(totalDuration, result.summary.totalIssues, result.summary.overallScore);

      // Unsubscribe progress callback
      if (options.onProgress) {
        this.progressEmitter.off(options.onProgress);
      }

      return result;
    } catch (error) {
      console.error('[StreamingOrchestrator] ✗ Analysis failed:', error);
      this.progressEmitter.emitError((error as Error).message);
      throw error;
    }
  }

  /**
   * Run a specific analyzer
   */
  private async runAnalyzer(analyzerId: string): Promise<any> {
    switch (analyzerId) {
      case 'feature-completeness': {
        const analyzer = new FeatureCompletenessAnalyzerStreaming(this.registry);
        return analyzer.analyze();
      }

      case 'ui-ux-quality': {
        const analyzer = new UIUXQualityAnalyzerStreaming(this.registry);
        return analyzer.analyze();
      }

      case 'test-coverage': {
        const analyzer = new TestCoverageAnalyzerStreaming(this.registry);
        return analyzer.analyze();
      }

      case 'i18n': {
        const analyzer = new InternationalizationAnalyzerStreaming(this.registry);
        return analyzer.analyze();
      }

      default:
        console.warn(`[StreamingOrchestrator] Unknown analyzer: ${analyzerId}`);
        return null;
    }
  }

  /**
   * Aggregate analyzer results into final analysis
   */
  private aggregateResults(
    categoryResults: Array<any>,
    options: StreamingAnalysisOptions,
    startTime: number,
    memUsage: any
  ): StreamingAnalysisResult {
    // Calculate overall score (weighted average)
    const weights = {
      'feature-completeness': 0.30,
      'ui-ux-quality': 0.30,
      'test-coverage': 0.25,
      'i18n': 0.15
    };

    let overallScore = 0;
    let totalWeight = 0;

    categoryResults.forEach(result => {
      const weight = weights[result.categoryId as keyof typeof weights] || 0.25;
      overallScore += result.score * weight;
      totalWeight += weight;
    });

    if (totalWeight > 0) {
      overallScore = Math.round(overallScore / totalWeight);
    }

    // Count total issues
    const totalIssues = categoryResults.reduce((sum, result) => sum + result.issues.length, 0);

    // Calculate duration
    const duration = Date.now() - startTime;

    return {
      summary: {
        overallScore,
        totalIssues,
        totalFiles: options.files.length,
        analyzedFiles: options.files.length,
        duration,
        memoryUsage: {
          registryKB: memUsage.totals.totalKB,
          registryMB: memUsage.totals.totalMB,
          estimatedASTMB: memUsage.totals.estimatedVsAST.estimatedASTMB,
          savingsPercent: memUsage.totals.estimatedVsAST.savingsPercent
        }
      },
      categories: categoryResults,
      maturityContext: options.maturityContext,
      timestamp: new Date()
    };
  }

  /**
   * Get progress emitter for external subscription
   */
  getProgressEmitter(): ProgressEventEmitter {
    return this.progressEmitter;
  }

  /**
   * Get registry for inspection
   */
  getRegistry(): UnifiedMetadataRegistry {
    return this.registry;
  }

  /**
   * Get processor statistics
   */
  getStatistics() {
    return this.processor.getStatistics();
  }

  /**
   * Clear registry and reset state
   */
  clear(): void {
    this.registry.clearAll();
    this.progressEmitter.reset();
  }
}
