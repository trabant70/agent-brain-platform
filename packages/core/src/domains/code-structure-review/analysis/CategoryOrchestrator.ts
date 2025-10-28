/**
 * Orchestrates analysis across multiple category analyzers
 */

import type {
  CodeStructureAnalysis,
  CategoryAnalysis,
  AnalysisContext,
  AnalysisEvent
} from '../types';
import { CategoryRegistry } from '../categories/base/CategoryRegistry';
import { ResultAggregator } from './ResultAggregator';
import { AnalysisContextUtils } from './AnalysisContext';

/**
 * Event listener for analysis events
 */
export type AnalysisEventListener = (event: AnalysisEvent) => void;

/**
 * Orchestrates parallel analysis across categories
 */
export class CategoryOrchestrator {
  private registry: CategoryRegistry;
  private aggregator: ResultAggregator;
  private eventListeners: AnalysisEventListener[];

  constructor(registry?: CategoryRegistry) {
    this.registry = registry || CategoryRegistry.getInstance();
    this.aggregator = new ResultAggregator();
    this.eventListeners = [];
  }

  /**
   * Run analysis with all enabled categories
   */
  async analyze(context: AnalysisContext): Promise<CodeStructureAnalysis> {
    const startTime = Date.now();

    this.emitEvent({
      type: 'analysis-start',
      timestamp: new Date(),
      metadata: {
        totalFiles: context.files.length,
        enabledCategories: context.config.enabledCategories
      }
    });

    try {
      // Get categories to analyze
      const categories =
        context.config.enabledCategories.length > 0
          ? this.registry.getEnabledByIds(context.config.enabledCategories)
          : this.registry.getEnabled();

      if (categories.length === 0) {
        throw new Error('No enabled categories found for analysis');
      }

      // Run analysis for all categories in parallel
      const categoryResults = await this.analyzeCategories(categories, context);

      // Aggregate results
      const contextUtils = new AnalysisContextUtils(context);
      const totalFiles = context.files.length;
      const analyzedFiles = contextUtils.getFilteredFileCount();

      const analysis = this.aggregator.aggregate(categoryResults, '', new Date());
      this.aggregator.updateFileCounts(analysis, totalFiles, analyzedFiles);

      // Add maturity context if available
      if (context.maturityContext) {
        analysis.maturityContext = context.maturityContext;
      }

      const duration = Date.now() - startTime;

      this.emitEvent({
        type: 'analysis-complete',
        timestamp: new Date(),
        duration,
        metadata: {
          totalIssues: analysis.summary.totalIssues,
          overallScore: analysis.summary.overallScore
        }
      });

      return analysis;
    } catch (error) {
      this.emitEvent({
        type: 'analysis-error',
        timestamp: new Date(),
        error: error as Error,
        duration: Date.now() - startTime
      });

      throw error;
    }
  }

  /**
   * Analyze with specific categories
   */
  async analyzeCategories(
    categories: any[],
    context: AnalysisContext
  ): Promise<CategoryAnalysis[]> {
    // Run categories in parallel
    const promises = categories.map(category =>
      this.analyzeSingleCategory(category, context)
    );

    const results = await Promise.allSettled(promises);

    // Extract successful results and log errors
    const categoryResults: CategoryAnalysis[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        categoryResults.push(result.value);
      } else {
        const category = categories[index];
        console.error(
          `Category analysis failed for ${category.id}:`,
          result.reason
        );

        // Create empty result for failed category
        categoryResults.push({
          categoryId: category.id,
          categoryName: category.name,
          priority: category.config.priority,
          score: 0,
          status: 'critical',
          issues: [],
          metrics: {},
          recommendations: [
            {
              id: `${category.id}-error`,
              priority: 'immediate',
              title: 'Analysis Error',
              description: `Failed to analyze ${category.name}: ${result.reason.message}`,
              impact: 'Unable to assess category health',
              effort: 'small',
              relatedIssues: []
            }
          ]
        });
      }
    });

    return categoryResults;
  }

  /**
   * Analyze a single category with timing
   */
  private async analyzeSingleCategory(
    category: any,
    context: AnalysisContext
  ): Promise<CategoryAnalysis> {
    const startTime = Date.now();

    this.emitEvent({
      type: 'analysis-start',
      timestamp: new Date(),
      categoryId: category.id
    });

    try {
      const result = await category.analyze(context);

      const duration = Date.now() - startTime;

      this.emitEvent({
        type: 'category-complete',
        timestamp: new Date(),
        categoryId: category.id,
        duration,
        metadata: {
          issueCount: result.issues.length,
          score: result.score
        }
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.emitEvent({
        type: 'analysis-error',
        timestamp: new Date(),
        categoryId: category.id,
        duration,
        error: error as Error
      });

      throw error;
    }
  }

  /**
   * Add event listener
   */
  addEventListener(listener: AnalysisEventListener): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: AnalysisEventListener): void {
    const index = this.eventListeners.indexOf(listener);
    if (index !== -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: AnalysisEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }

  /**
   * Get registry instance
   */
  getRegistry(): CategoryRegistry {
    return this.registry;
  }

  /**
   * Get aggregator instance
   */
  getAggregator(): ResultAggregator {
    return this.aggregator;
  }

  /**
   * Run quick analysis (Priority 1 categories only)
   */
  async quickAnalyze(context: AnalysisContext): Promise<CodeStructureAnalysis> {
    // Get only priority 1 categories
    const priority1Categories = this.registry.getByPriority(1);

    if (priority1Categories.length === 0) {
      throw new Error('No Priority 1 categories registered');
    }

    const categoryResults = await this.analyzeCategories(priority1Categories, context);

    const contextUtils = new AnalysisContextUtils(context);
    const totalFiles = context.files.length;
    const analyzedFiles = contextUtils.getFilteredFileCount();

    const analysis = this.aggregator.aggregate(categoryResults, '', new Date());
    this.aggregator.updateFileCounts(analysis, totalFiles, analyzedFiles);

    if (context.maturityContext) {
      analysis.maturityContext = context.maturityContext;
    }

    return analysis;
  }

  /**
   * Estimate analysis duration
   */
  estimateDuration(fileCount: number, categoryCount: number): number {
    // Rough estimate: 10ms per file per category
    // Parallelization reduces time by ~60%
    const baseTime = fileCount * categoryCount * 10;
    const parallelTime = baseTime * 0.4;
    return Math.round(parallelTime);
  }
}
