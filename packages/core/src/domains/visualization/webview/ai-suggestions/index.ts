/**
 * AI Suggestions Module
 * Exports all suggestion-related components and utilities
 */

export { SuggestionEngine, suggestionEngine } from './SuggestionEngine';
export { SuggestionCard } from './SuggestionCard';
export { SuggestionPanel } from './SuggestionPanel';
export { PatternDetector } from './PatternDetector';

export type {
  Suggestion,
  SuggestionType,
  SuggestionActionType,
  ImpactLevel,
  EffortLevel,
  UrgencyLevel
} from './SuggestionEngine';

export type {
  SuggestionCardConfig
} from './SuggestionCard';

export type {
  SuggestionPanelConfig
} from './SuggestionPanel';
