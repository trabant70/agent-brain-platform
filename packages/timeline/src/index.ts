/**
 * @agent-brain/timeline
 *
 * Timeline visualization and event management package
 */

// Re-export core types from shared
export * from '@agent-brain/shared';

// Export timeline-specific components
export * from './orchestration/DataOrchestrator';
export * from './orchestration/FilterStateManager';
export * from './providers/git/GitProvider';
export * from './visualization/d3/D3TimelineRenderer';
export * from './visualization/renderers/D3TimelineRendererImpl';
export * from './webview/SimpleTimelineApp';
