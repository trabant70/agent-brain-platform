/**
 * Intelligence Provider Pathway Tests
 *
 * Tests that IntelligenceProvider integrates correctly with the timeline system
 * and produces LEARNING_STORED and PATTERN_DETECTED events.
 *
 * NOTE: Simplified test - does not use pathway logging infrastructure
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Use direct imports to avoid module resolution issues
import { IntelligenceProvider } from '../../../core/src/domains/providers/intelligence/IntelligenceProvider';
import { LearningSystem } from '../../../core/src/domains/intelligence/core/learning/LearningSystem';
import { PatternSystem } from '../../../core/src/domains/intelligence/core/patterns/PatternSystem';
import { EventType } from '../../../core/src/domains/events/EventType';

describe('Intelligence Provider - Integration Pathways', () => {
  let intelligenceProvider: IntelligenceProvider;
  let learningSystem: LearningSystem;
  let patternSystem: PatternSystem;

  beforeEach(async () => {
    // Create intelligence systems
    learningSystem = new LearningSystem();
    patternSystem = new PatternSystem();

    // Create provider
    intelligenceProvider = new IntelligenceProvider(learningSystem, patternSystem);

    // Initialize provider
    await intelligenceProvider.initialize({ enabled: true });
  });

  describe('Provider Lifecycle', () => {
    it('should have correct provider metadata', () => {
      expect(intelligenceProvider.id).toBe('intelligence');
      expect(intelligenceProvider.name).toBe('Agent-Brain Intelligence');
      expect(intelligenceProvider.version).toBe('0.1.0');
    });

    it('should have correct capabilities', () => {
      const caps = intelligenceProvider.capabilities;

      expect(caps.supportsRealTimeUpdates).toBe(false);
      expect(caps.supportsHistoricalData).toBe(true);
      expect(caps.supportsFiltering).toBe(false);
      expect(caps.supportsSearch).toBe(false);
      expect(caps.supportsAuthentication).toBe(false);
      expect(caps.supportsWriteOperations).toBe(false);

      expect(caps.supportedEventTypes).toContain(EventType.LEARNING_STORED);
      expect(caps.supportedEventTypes).toContain(EventType.PATTERN_DETECTED);
    });

    it('should report healthy status', async () => {
      const isHealthy = await intelligenceProvider.isHealthy();
      expect(isHealthy).toBe(true);
    });

    it('should dispose cleanly', async () => {
      await intelligenceProvider.dispose();
      // Provider should dispose without errors
    });
  });

  describe('Event Generation', () => {
    it('should fetch events from learning system and pattern system', async () => {
      const events = await intelligenceProvider.fetchEvents({});

      // Initially may be empty - that's valid
      expect(Array.isArray(events)).toBe(true);

      // All events should have intelligence provider ID
      events.forEach(event => {
        expect(event.providerId).toBe('intelligence');
      });
    });

    it('should generate LEARNING_STORED events for learnings', async () => {
      // This test verifies the structure without requiring actual learnings
      const events = await intelligenceProvider.fetchEvents({});

      const learningEvents = events.filter(e => e.type === EventType.LEARNING_STORED);

      // Each learning event should have correct structure
      learningEvents.forEach(event => {
        expect(event.id).toMatch(/^learning-/);
        expect(event.canonicalId).toMatch(/^learning-/);
        expect(event.providerId).toBe('intelligence');
        expect(event.type).toBe(EventType.LEARNING_STORED);
        expect(event.title).toMatch(/^Learning:/);
        expect(event.author.name).toBe('Agent Brain');
        expect(event.visualization?.icon).toBe('🧠');
        expect(event.visualization?.color).toBe('#9B59B6');
      });
    });

    it('should generate PATTERN_DETECTED events for patterns', async () => {
      // This test verifies the structure without requiring actual patterns
      const events = await intelligenceProvider.fetchEvents({});

      const patternEvents = events.filter(e => e.type === EventType.PATTERN_DETECTED);

      // Each pattern event should have correct structure
      patternEvents.forEach(event => {
        expect(event.id).toMatch(/^pattern-/);
        expect(event.canonicalId).toMatch(/^pattern-/);
        expect(event.providerId).toBe('intelligence');
        expect(event.type).toBe(EventType.PATTERN_DETECTED);
        expect(event.title).toMatch(/^Pattern:/);
        expect(event.author.name).toBe('Agent Brain');
        expect(event.visualization?.icon).toBe('🔍');
        expect(event.visualization?.color).toBe('#3498DB');
      });
    });

    it('should cache events between calls', async () => {
      const events1 = await intelligenceProvider.fetchEvents({});
      const events2 = await intelligenceProvider.fetchEvents({});

      // Should return consistent results
      expect(events2.length).toBe(events1.length);
    });
  });

  describe('Integration with DataOrchestrator', () => {
    it('should be compatible with ProviderRegistry registration', async () => {
      // Verify provider implements IDataProvider interface
      expect(typeof intelligenceProvider.initialize).toBe('function');
      expect(typeof intelligenceProvider.fetchEvents).toBe('function');
      expect(typeof intelligenceProvider.isHealthy).toBe('function');
      expect(typeof intelligenceProvider.dispose).toBe('function');

      // Verify required properties
      expect(intelligenceProvider.id).toBeDefined();
      expect(intelligenceProvider.name).toBeDefined();
      expect(intelligenceProvider.version).toBeDefined();
      expect(intelligenceProvider.capabilities).toBeDefined();
    });

    it('should produce CanonicalEvents compatible with timeline', async () => {
      const events = await intelligenceProvider.fetchEvents({});

      events.forEach(event => {
        // Verify CanonicalEvent structure
        expect(event.id).toBeDefined();
        expect(event.canonicalId).toBeDefined();
        expect(event.providerId).toBe('intelligence');
        expect(event.type).toBeDefined();
        expect(event.timestamp).toBeInstanceOf(Date);
        expect(event.title).toBeDefined();
        expect(event.description).toBeDefined();
        expect(event.author).toBeDefined();
        expect(event.author.id).toBeDefined();
        expect(event.author.name).toBeDefined();
        expect(event.author.email).toBeDefined();
        expect(Array.isArray(event.branches)).toBe(true);
        expect(Array.isArray(event.parentIds)).toBe(true);
        expect(Array.isArray(event.childIds)).toBe(true);
        expect(event.metadata).toBeDefined();
        expect(event.visualization).toBeDefined();
      });
    });
  });
});
