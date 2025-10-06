/**
 * IntelligenceProvider
 *
 * Provides intelligence events (patterns, learnings) as CanonicalEvents.
 * Intelligence is both a consumer (via adapters) and a provider (of meta-events).
 */

import { IDataProvider } from '../base';
import { CanonicalEvent, EventType, ProviderCapabilities, ProviderConfig, ProviderContext } from '../../events';
import { LearningSystem, LearningPattern } from '../../intelligence/core/learning';
import { PatternSystem, EnginePattern } from '../../intelligence/core/patterns';
import { ADRSystem, ADR } from '../../intelligence/core/adrs';
import { ADRConverter } from '../../intelligence/converters/ADRConverter';

export class IntelligenceProvider implements IDataProvider {
  readonly id = 'intelligence';
  readonly name = 'Agent-Brain Intelligence';
  readonly version = '0.1.0';
  readonly capabilities: ProviderCapabilities = {
    supportsRealTimeUpdates: false,
    supportsHistoricalData: true,
    supportsFiltering: false,
    supportsSearch: false,
    supportsAuthentication: false,
    supportsWriteOperations: false,
    supportedEventTypes: [EventType.LEARNING_STORED, EventType.PATTERN_DETECTED, EventType.ADR_RECORDED]
  };

  private eventCache: CanonicalEvent[] = [];
  private adrConverter = new ADRConverter();

  constructor(
    private learningSystem: LearningSystem,
    private patternSystem: PatternSystem,
    private adrSystem: ADRSystem
  ) {}

  async initialize(config: ProviderConfig): Promise<void> {
    // No initialization needed
    // Real-time events can be added in Phase 7
  }

  async fetchEvents(context: ProviderContext): Promise<CanonicalEvent[]> {
    const events: CanonicalEvent[] = [];

    // Get learnings as events
    const learnings = await this.learningSystem.getPatterns();
    learnings.forEach(learning => {
      events.push(this.learningToEvent(learning));
    });

    // Get patterns as events
    const patterns = this.patternSystem.getPatterns();
    patterns.forEach(pattern => {
      events.push(this.patternToEvent(pattern));
    });

    // Get ADRs as events
    const adrs = await this.adrSystem.getADRs();
    const adrEvents = this.adrConverter.convertToEvents(adrs);
    events.push(...adrEvents);

    this.eventCache = events;
    return events;
  }

  /**
   * Convert learning to CanonicalEvent
   */
  private learningToEvent(learning: LearningPattern): CanonicalEvent {
    return {
      id: `learning-${learning.id || Date.now()}`,
      canonicalId: `learning-${learning.id || Date.now()}`,
      providerId: this.id,
      type: EventType.LEARNING_STORED,
      timestamp: new Date(),
      title: `Learning: ${learning.name || learning.description}`,
      description: learning.description,
      author: {
        id: 'agent-brain',
        name: 'Agent Brain',
        email: 'noreply@agent-brain.ai'
      },
      branches: [],
      parentIds: [],
      childIds: [],
      metadata: {
        category: learning.category,
        confidence: learning.confidenceScore || 0,
        patternId: learning.id,
        occurrences: learning.occurrences || 1,
        rootCause: learning.rootCause,
        preventionRule: learning.preventionRule
      },
      visualization: {
        icon: '🧠',
        color: '#9B59B6',
        priority: 2
      }
    };
  }

  /**
   * Convert pattern to CanonicalEvent
   */
  private patternToEvent(pattern: EnginePattern): CanonicalEvent {
    return {
      id: `pattern-${pattern.id}`,
      canonicalId: `pattern-${pattern.id}`,
      providerId: this.id,
      type: EventType.PATTERN_DETECTED,
      timestamp: new Date(),
      title: `Pattern: ${pattern.name}`,
      description: pattern.description || `Pattern ${pattern.id} detected`,
      author: {
        id: 'agent-brain',
        name: 'Agent Brain',
        email: 'noreply@agent-brain.ai'
      },
      branches: [],
      parentIds: [],
      childIds: [],
      metadata: {
        patternId: pattern.id,
        category: pattern.category,
        severity: pattern.severity,
        trigger: pattern.trigger instanceof RegExp ? pattern.trigger.source : pattern.trigger,
        autoFixable: pattern.autoFix?.enabled || false
      },
      visualization: {
        icon: '🔍',
        color: '#3498DB',
        priority: 1
      }
    };
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.learningSystem.getPatterns();
      return true;
    } catch {
      return false;
    }
  }

  async dispose(): Promise<void> {
    this.eventCache = [];
  }
}
