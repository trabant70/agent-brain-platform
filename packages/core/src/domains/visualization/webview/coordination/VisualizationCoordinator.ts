/**
 * Visualization Coordinator (Simplified)
 * Manages visualization data flow and state
 *
 * Post-Refactoring Responsibilities:
 * - Hold current analysis data
 * - Provide data mapper instance
 * - Provide visualization manager instance
 * - NO navigation state (removed - filter-driven architecture)
 */

import { AnalysisDataMapper, type AnalysisData } from './AnalysisDataMapper';
import { VisualizationManager } from '../visualizations/VisualizationManager';

/**
 * Visualization Coordinator (Simplified - Filter-Driven)
 */
export class VisualizationCoordinator {
  private visualizationManager: VisualizationManager;
  private dataMapper: AnalysisDataMapper;
  private analysisData: AnalysisData | null = null;

  constructor(
    visualizationManager: VisualizationManager,
    dataMapper?: AnalysisDataMapper
  ) {
    this.visualizationManager = visualizationManager;
    this.dataMapper = dataMapper || new AnalysisDataMapper();
  }

  /**
   * Initialize with analysis data
   */
  async initialize(analysisData: AnalysisData): Promise<void> {
    this.analysisData = analysisData;
  }

  /**
   * Set analysis data
   */
  setAnalysisData(data: AnalysisData): void {
    this.analysisData = data;
  }

  /**
   * Get analysis data
   */
  getAnalysisData(): AnalysisData | null {
    return this.analysisData;
  }

  /**
   * Get data mapper
   */
  getDataMapper(): AnalysisDataMapper {
    return this.dataMapper;
  }

  /**
   * Get visualization manager
   */
  getVisualizationManager(): VisualizationManager {
    return this.visualizationManager;
  }

  /**
   * Destroy coordinator
   */
  destroy(): void {
    if (this.visualizationManager) {
      this.visualizationManager.destroyAll();
    }
    this.analysisData = null;
  }
}
