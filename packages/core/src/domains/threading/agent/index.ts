/**
 * Agent Integration Exports
 *
 * Tools for AI agents to understand and debug data correctness:
 * - Fix suggestions from violations
 * - Debug reports with explanations
 * - Agent-friendly messaging
 */

export { FixSuggester, getGlobalFixSuggester, suggestFixes } from './FixSuggester';
export type { FixSuggestion } from './FixSuggester';

export { AgentDebugHelper, getGlobalAgentDebugHelper, generateDebugReport } from './AgentDebugHelper';
export type { DebugReport, ViolationDebugInfo } from './AgentDebugHelper';
// Note: CodeExample is already exported from '../types'

export { AgentInstructionInjector } from './AgentInstructionInjector';
