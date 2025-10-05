/**
 * Minimal Agent Brain Core exports for VS Code extension
 * Only includes working, tested components
 */

// Export working pattern system
export * from './patterns/index';

// Export core engine (with pattern loading fix)
export { AgentBrainCore, AgentBrainCoreConfig } from './engine/agent-brain-core';

// Export essential types
export {
    Pattern,
    PatternMatch,
    AnalysisContext,
    AnalysisResult
} from './api/types';

// Re-export pattern system for convenience
import { createPatternSystem, PatternSystem } from './patterns/index';
export { createPatternSystem, PatternSystem };

// Export default for easy importing
export default {
    AgentBrainCore: require('./engine/agent-brain-core').AgentBrainCore,
    createPatternSystem,
    PatternSystem
};