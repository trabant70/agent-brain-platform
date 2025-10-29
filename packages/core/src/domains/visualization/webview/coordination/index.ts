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
  VisualizationCoordinator,
  type NavigationContext,
  type BreadcrumbItem,
  type StateVisualizationConfig,
  type EventHandler
} from './VisualizationCoordinator';

export {
  NavigationStateMachine,
  createNavigationStateMachine,
  type NavigationState,
  type NavigationAction,
  type StateContext,
  type StateTransition
} from './NavigationStateMachine';
