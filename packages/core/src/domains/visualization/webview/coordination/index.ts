/**
 * Visualization Coordination Module
 * Exports coordination components for visualization integration
 */

export {
  AnalysisDataMapper,
  analysisDataMapper,
  type AnalysisData
} from './AnalysisDataMapper';

export {
  VisualizationCoordinator
} from './VisualizationCoordinator';

export {
  NavigationStateMachine,
  createNavigationStateMachine,
  type NavigationState,
  type NavigationAction,
  type StateContext,
  type StateTransition
} from './NavigationStateMachine';
