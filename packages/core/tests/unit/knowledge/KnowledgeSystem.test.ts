/**
 * KnowledgeSystem Unit Tests
 *
 * Tests for the unified knowledge facade that provides access to patterns, ADRs, and learnings.
 * This is the PRIMARY interface for prompt enhancement.
 */

import { KnowledgeSystem, KnowledgeSystemConfig } from '../../../src/domains/knowledge/KnowledgeSystem';
import { PatternSystem, EnginePattern } from '../../../src/domains/knowledge/patterns';
import { ADRSystem, ADR } from '../../../src/domains/knowledge/adrs';
import { LearningSystem, LearningPattern } from '../../../src/domains/knowledge/learning';
import { KnowledgeContext } from '../../../src/domains/knowledge/types';

describe('KnowledgeSystem', () => {
  let patternSystem: PatternSystem;
  let adrSystem: ADRSystem;
  let learningSystem: LearningSystem;
  let knowledgeSystem: KnowledgeSystem;

  // Sample data for testing
  const samplePatterns: EnginePattern[] = [
    {
      id: 'pattern-1',
      name: 'Error Handling Pattern',
      description: 'Always use try-catch for async operations',
      category: 'error-handling',
      severity: 'high'
    },
    {
      id: 'pattern-2',
      name: 'Testing Best Practice',
      description: 'Write unit tests for all business logic',
      category: 'testing',
      severity: 'medium'
    },
    {
      id: 'pattern-3',
      name: 'Architecture Pattern',
      description: 'Use facade pattern for complex subsystems',
      category: 'architecture',
      severity: 'low'
    }
  ];

  const sampleADRs: ADR[] = [
    {
      id: 'adr-001',
      number: 1,
      title: 'Use TypeScript for type safety',
      status: 'accepted',
      timestamp: new Date('2025-01-01'),
      context: 'Need better type safety in codebase',
      decision: 'Adopt TypeScript for all new code',
      consequences: 'Improved type safety, steeper learning curve',
      tags: ['typescript', 'type-safety']
    },
    {
      id: 'adr-002',
      number: 2,
      title: 'Use Jest for testing',
      status: 'accepted',
      timestamp: new Date('2025-02-01'),
      context: 'Need reliable testing framework',
      decision: 'Adopt Jest for unit and integration tests',
      consequences: 'Great developer experience',
      tags: ['jest', 'testing']
    },
    {
      id: 'adr-003',
      number: 3,
      title: 'Use REST API',
      status: 'superseded',
      timestamp: new Date('2024-01-01'),
      context: 'Need API for frontend',
      decision: 'Build REST API',
      consequences: 'Simple but limited',
      supersededBy: [4],
      tags: ['rest', 'api']
    }
  ];

  const sampleLearnings: LearningPattern[] = [
    {
      id: 'learning-1',
      name: 'Async Error Handling',
      description: 'Always wrap async operations in try-catch',
      category: 'bug-fix',
      occurrences: 5,
      confidenceScore: 0.9,
      rootCause: 'Unhandled promise rejections',
      preventionRule: 'Use try-catch or .catch() for all promises',
      lastUpdated: new Date('2025-10-07')
    },
    {
      id: 'learning-2',
      name: 'Database Connection Pooling',
      description: 'Always use connection pooling for database access',
      category: 'performance',
      occurrences: 15,
      confidenceScore: 0.98,
      rootCause: 'Connection overhead causes performance issues',
      preventionRule: 'Configure connection pool in database client',
      lastUpdated: new Date('2025-10-06')
    }
  ];

  beforeEach(() => {
    // Create mock systems
    patternSystem = {
      getPatterns: jest.fn().mockReturnValue(samplePatterns)
    } as any;

    adrSystem = {
      getADRs: jest.fn().mockResolvedValue(sampleADRs)
    } as any;

    learningSystem = {
      getPatterns: jest.fn().mockResolvedValue(sampleLearnings)
    } as any;

    knowledgeSystem = new KnowledgeSystem(patternSystem, adrSystem, learningSystem);
  });

  describe('Constructor and Configuration', () => {
    it('should create KnowledgeSystem with default configuration', () => {
      expect(knowledgeSystem).toBeDefined();
      expect(knowledgeSystem).toBeInstanceOf(KnowledgeSystem);
    });

    it('should create KnowledgeSystem with custom configuration', () => {
      const config: KnowledgeSystemConfig = {
        maxPatterns: 10,
        maxADRs: 5,
        maxLearnings: 5,
        minRelevance: 0.5
      };

      const customKnowledgeSystem = new KnowledgeSystem(
        patternSystem,
        adrSystem,
        learningSystem,
        config
      );

      expect(customKnowledgeSystem).toBeDefined();
    });

    it('should use default values for missing config options', () => {
      const partialConfig: KnowledgeSystemConfig = {
        maxPatterns: 10
      };

      const partialKnowledgeSystem = new KnowledgeSystem(
        patternSystem,
        adrSystem,
        learningSystem,
        partialConfig
      );

      expect(partialKnowledgeSystem).toBeDefined();
    });
  });

  describe('getRelevantKnowledge with String Context', () => {
    it('should return relevant knowledge for "error" context', async () => {
      const knowledge = await knowledgeSystem.getRelevantKnowledge('error');

      expect(knowledge).toBeDefined();
      expect(knowledge.patterns).toBeDefined();
      expect(knowledge.adrs).toBeDefined();
      expect(knowledge.learnings).toBeDefined();

      // Should find error handling pattern
      expect(knowledge.patterns.length).toBeGreaterThan(0);
      expect(knowledge.patterns.some(p => p.name.includes('Error'))).toBe(true);

      // Should find async error handling learning
      expect(knowledge.learnings.length).toBeGreaterThan(0);
      expect(knowledge.learnings.some(l => l.name.includes('Error'))).toBe(true);
    });

    it('should return relevant knowledge for "testing" context', async () => {
      const knowledge = await knowledgeSystem.getRelevantKnowledge('testing');

      expect(knowledge).toBeDefined();

      // Should find testing pattern
      const testingPattern = knowledge.patterns.find(p => p.category === 'testing');
      expect(testingPattern).toBeDefined();
      expect(testingPattern?.name).toBe('Testing Best Practice');

      // Should find Jest ADR
      const jestADR = knowledge.adrs.find(a => a.title.includes('Jest'));
      expect(jestADR).toBeDefined();
    });

    it('should return relevant knowledge for "typescript" context', async () => {
      const knowledge = await knowledgeSystem.getRelevantKnowledge('typescript');

      expect(knowledge).toBeDefined();

      // Should find TypeScript ADR
      const tsADR = knowledge.adrs.find(a => a.title.includes('TypeScript'));
      expect(tsADR).toBeDefined();
      expect(tsADR?.status).toBe('accepted');
    });

    it('should return empty arrays for unmatched context', async () => {
      const knowledge = await knowledgeSystem.getRelevantKnowledge('nonexistent-context-xyz');

      expect(knowledge).toBeDefined();
      expect(knowledge.patterns).toEqual([]);
      expect(knowledge.adrs).toEqual([]);
      expect(knowledge.learnings).toEqual([]);
    });

    it('should filter by minimum relevance score', async () => {
      const configWithHighMinRelevance: KnowledgeSystemConfig = {
        minRelevance: 0.8
      };

      const strictKnowledgeSystem = new KnowledgeSystem(
        patternSystem,
        adrSystem,
        learningSystem,
        configWithHighMinRelevance
      );

      const knowledge = await strictKnowledgeSystem.getRelevantKnowledge('architecture');

      expect(knowledge).toBeDefined();
      // With high minRelevance, should only return highly relevant results
      knowledge.patterns.forEach(p => {
        if (p.relevanceScore) {
          expect(p.relevanceScore).toBeGreaterThanOrEqual(0.8);
        }
      });
    });

    it('should limit results based on configuration', async () => {
      const configWithLimits: KnowledgeSystemConfig = {
        maxPatterns: 1,
        maxADRs: 1,
        maxLearnings: 1
      };

      const limitedKnowledgeSystem = new KnowledgeSystem(
        patternSystem,
        adrSystem,
        learningSystem,
        configWithLimits
      );

      const knowledge = await limitedKnowledgeSystem.getRelevantKnowledge('error');

      expect(knowledge.patterns.length).toBeLessThanOrEqual(1);
      expect(knowledge.adrs.length).toBeLessThanOrEqual(1);
      expect(knowledge.learnings.length).toBeLessThanOrEqual(1);
    });
  });

  describe('getRelevantKnowledge with KnowledgeContext', () => {
    it('should handle KnowledgeContext with prompt', async () => {
      const context: KnowledgeContext = {
        prompt: 'Add error handling to user service'
      };

      const knowledge = await knowledgeSystem.getRelevantKnowledge(context);

      expect(knowledge).toBeDefined();
      expect(knowledge.patterns.some(p => p.name.includes('Error'))).toBe(true);
    });

    it('should handle KnowledgeContext with keywords', async () => {
      const context: KnowledgeContext = {
        keywords: ['testing', 'jest', 'unit-tests']
      };

      const knowledge = await knowledgeSystem.getRelevantKnowledge(context);

      expect(knowledge).toBeDefined();
      // Should find testing-related knowledge
      const hasTestingKnowledge =
        knowledge.patterns.some(p => p.category === 'testing') ||
        knowledge.adrs.some(a => a.title.includes('Jest'));

      expect(hasTestingKnowledge).toBe(true);
    });

    it('should handle KnowledgeContext with filePaths', async () => {
      const context: KnowledgeContext = {
        filePaths: ['src/error-handler.ts', 'src/utils.ts']
      };

      const knowledge = await knowledgeSystem.getRelevantKnowledge(context);

      expect(knowledge).toBeDefined();
      // File name extraction should work
      expect(knowledge.patterns.some(p => p.name.includes('Error'))).toBe(true);
    });

    it('should handle KnowledgeContext with errors', async () => {
      const context: KnowledgeContext = {
        errors: ['TypeError: Cannot read property of undefined', 'Promise rejection'],
        keywords: ['error'] // Add explicit error keyword to help matching
      };

      const knowledge = await knowledgeSystem.getRelevantKnowledge(context);

      expect(knowledge).toBeDefined();
      // Should find error-related knowledge
      expect(knowledge.patterns.some(p => p.category === 'error-handling')).toBe(true);
    });

    it('should handle comprehensive KnowledgeContext', async () => {
      const context: KnowledgeContext = {
        prompt: 'Fix async error in user service',
        filePaths: ['src/user-service.ts'],
        languages: ['typescript'],
        errors: ['Unhandled promise rejection'],
        keywords: ['async', 'await', 'error']
      };

      const knowledge = await knowledgeSystem.getRelevantKnowledge(context);

      expect(knowledge).toBeDefined();
      expect(knowledge.patterns.length).toBeGreaterThan(0);
      expect(knowledge.adrs.length).toBeGreaterThan(0);
      expect(knowledge.learnings.length).toBeGreaterThan(0);

      // Should find error handling pattern
      expect(knowledge.patterns.some(p => p.name.includes('Error'))).toBe(true);

      // Should find TypeScript ADR
      expect(knowledge.adrs.some(a => a.title.includes('TypeScript'))).toBe(true);

      // Should find async error handling learning
      expect(knowledge.learnings.some(l => l.name.includes('Async'))).toBe(true);
    });

    it('should handle empty KnowledgeContext', async () => {
      const context: KnowledgeContext = {};

      const knowledge = await knowledgeSystem.getRelevantKnowledge(context);

      expect(knowledge).toBeDefined();
      // With empty context, should return limited or no results
      expect(knowledge.patterns.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getSummary', () => {
    it('should return complete knowledge summary', async () => {
      const summary = await knowledgeSystem.getSummary();

      expect(summary).toBeDefined();
      expect(summary.totalPatterns).toBe(3);
      expect(summary.totalADRs).toBe(3);
      expect(summary.totalLearnings).toBe(2);
      expect(summary.recentADRs).toBeDefined();
      expect(summary.topPatternCategories).toBeDefined();
      expect(summary.topLearningCategories).toBeDefined();
      expect(summary.lastUpdated).toBeInstanceOf(Date);
    });

    it('should return recent ADRs sorted by date', async () => {
      const summary = await knowledgeSystem.getSummary();

      expect(summary.recentADRs.length).toBeGreaterThan(0);
      expect(summary.recentADRs.length).toBeLessThanOrEqual(5);

      // Should be sorted by date (newest first)
      for (let i = 0; i < summary.recentADRs.length - 1; i++) {
        expect(summary.recentADRs[i].date.getTime()).toBeGreaterThanOrEqual(
          summary.recentADRs[i + 1].date.getTime()
        );
      }
    });

    it('should return top pattern categories with counts', async () => {
      const summary = await knowledgeSystem.getSummary();

      expect(summary.topPatternCategories.length).toBeGreaterThan(0);
      expect(summary.topPatternCategories.length).toBeLessThanOrEqual(5);

      // Should be sorted by count (highest first)
      for (let i = 0; i < summary.topPatternCategories.length - 1; i++) {
        expect(summary.topPatternCategories[i].count).toBeGreaterThanOrEqual(
          summary.topPatternCategories[i + 1].count
        );
      }

      // Each category should have valid data
      summary.topPatternCategories.forEach(cat => {
        expect(cat.category).toBeDefined();
        expect(cat.count).toBeGreaterThan(0);
      });
    });

    it('should return top learning categories with counts', async () => {
      const summary = await knowledgeSystem.getSummary();

      expect(summary.topLearningCategories.length).toBeGreaterThan(0);
      expect(summary.topLearningCategories.length).toBeLessThanOrEqual(5);

      // Should be sorted by count (highest first)
      for (let i = 0; i < summary.topLearningCategories.length - 1; i++) {
        expect(summary.topLearningCategories[i].count).toBeGreaterThanOrEqual(
          summary.topLearningCategories[i + 1].count
        );
      }

      // Each category should have valid data
      summary.topLearningCategories.forEach(cat => {
        expect(cat.category).toBeDefined();
        expect(cat.count).toBeGreaterThan(0);
      });
    });

    it('should handle empty knowledge gracefully', async () => {
      const emptyPatternSystem = {
        getPatterns: jest.fn().mockReturnValue([])
      } as any;

      const emptyADRSystem = {
        getADRs: jest.fn().mockResolvedValue([])
      } as any;

      const emptyLearningSystem = {
        getPatterns: jest.fn().mockResolvedValue([])
      } as any;

      const emptyKnowledgeSystem = new KnowledgeSystem(
        emptyPatternSystem,
        emptyADRSystem,
        emptyLearningSystem
      );

      const summary = await emptyKnowledgeSystem.getSummary();

      expect(summary.totalPatterns).toBe(0);
      expect(summary.totalADRs).toBe(0);
      expect(summary.totalLearnings).toBe(0);
      expect(summary.recentADRs).toEqual([]);
      expect(summary.topPatternCategories).toEqual([]);
      expect(summary.topLearningCategories).toEqual([]);
    });
  });

  describe('queryKnowledge', () => {
    it('should query knowledge with empty options', async () => {
      const knowledge = await knowledgeSystem.queryKnowledge({});

      expect(knowledge).toBeDefined();
      expect(knowledge.patterns).toBeDefined();
      expect(knowledge.adrs).toBeDefined();
      expect(knowledge.learnings).toBeDefined();
    });

    it('should query knowledge with category filter', async () => {
      const knowledge = await knowledgeSystem.queryKnowledge({
        categories: ['testing', 'error-handling']
      });

      expect(knowledge).toBeDefined();
    });

    it('should query knowledge with all options', async () => {
      const knowledge = await knowledgeSystem.queryKnowledge({
        categories: ['testing'],
        minRelevance: 0.5,
        limit: 3,
        sortBy: 'relevance'
      });

      expect(knowledge).toBeDefined();
    });
  });

  describe('Relevance Scoring', () => {
    it('should assign higher relevance to name matches', async () => {
      const knowledge = await knowledgeSystem.getRelevantKnowledge('Error Handling');

      const errorPattern = knowledge.patterns.find(p => p.name.includes('Error Handling'));
      expect(errorPattern).toBeDefined();
      expect(errorPattern?.relevanceScore).toBeGreaterThanOrEqual(0.5);
    });

    it('should assign relevance to description matches', async () => {
      const knowledge = await knowledgeSystem.getRelevantKnowledge('async operations');

      const asyncPattern = knowledge.patterns.find(p =>
        p.description?.includes('async operations')
      );
      expect(asyncPattern).toBeDefined();
      expect(asyncPattern?.relevanceScore).toBeGreaterThan(0);
    });

    it('should assign relevance to category matches', async () => {
      const knowledge = await knowledgeSystem.getRelevantKnowledge('architecture');

      const archPattern = knowledge.patterns.find(p => p.category === 'architecture');
      expect(archPattern).toBeDefined();
      expect(archPattern?.relevanceScore).toBeGreaterThan(0);
    });

    it('should cap relevance score at 1.0', async () => {
      const knowledge = await knowledgeSystem.getRelevantKnowledge(
        'Error Handling Pattern error-handling'
      );

      knowledge.patterns.forEach(p => {
        if (p.relevanceScore) {
          expect(p.relevanceScore).toBeLessThanOrEqual(1.0);
        }
      });
    });
  });

  describe('ADR Filtering', () => {
    it('should only return accepted and proposed ADRs by default', async () => {
      const knowledge = await knowledgeSystem.getRelevantKnowledge('api');

      // REST API ADR is superseded, should not be returned
      const supersededADR = knowledge.adrs.find(a => a.status === 'superseded');
      expect(supersededADR).toBeUndefined();

      // All returned ADRs should be accepted or proposed
      knowledge.adrs.forEach(adr => {
        expect(['accepted', 'proposed']).toContain(adr.status);
      });
    });

    it('should calculate ADR relevance based on title', async () => {
      const knowledge = await knowledgeSystem.getRelevantKnowledge('TypeScript');

      const tsADR = knowledge.adrs.find(a => a.title.includes('TypeScript'));
      expect(tsADR).toBeDefined();
      expect(tsADR?.relevanceScore).toBeGreaterThanOrEqual(0.5);
    });

    it('should calculate ADR relevance based on context/decision', async () => {
      const knowledge = await knowledgeSystem.getRelevantKnowledge('type safety');

      const tsADR = knowledge.adrs.find(a => a.context.includes('type safety'));
      expect(tsADR).toBeDefined();
      expect(tsADR?.relevanceScore).toBeGreaterThan(0);
    });

    it('should calculate ADR relevance based on tags', async () => {
      const knowledge = await knowledgeSystem.getRelevantKnowledge('jest');

      const jestADR = knowledge.adrs.find(a => a.tags?.includes('jest'));
      expect(jestADR).toBeDefined();
      expect(jestADR?.relevanceScore).toBeGreaterThan(0);
    });
  });

  describe('Learning Filtering', () => {
    it('should filter learnings by name', async () => {
      const knowledge = await knowledgeSystem.getRelevantKnowledge('async');

      const asyncLearning = knowledge.learnings.find(l => l.name.includes('Async'));
      expect(asyncLearning).toBeDefined();
      expect(asyncLearning?.name).toBe('Async Error Handling');
    });

    it('should filter learnings by description', async () => {
      const knowledge = await knowledgeSystem.getRelevantKnowledge('connection pooling');

      const poolingLearning = knowledge.learnings.find(l =>
        l.description?.includes('connection pooling')
      );
      expect(poolingLearning).toBeDefined();
    });

    it('should filter learnings by category', async () => {
      const knowledge = await knowledgeSystem.getRelevantKnowledge('performance');

      const perfLearning = knowledge.learnings.find(l => l.category === 'performance');
      expect(perfLearning).toBeDefined();
    });

    it('should sort learnings by confidence score', async () => {
      const knowledge = await knowledgeSystem.getRelevantKnowledge('error');

      // Should be sorted by confidence score (highest first)
      for (let i = 0; i < knowledge.learnings.length - 1; i++) {
        expect(knowledge.learnings[i].confidenceScore).toBeGreaterThanOrEqual(
          knowledge.learnings[i + 1].confidenceScore
        );
      }
    });

    it('should include all learning fields', async () => {
      const knowledge = await knowledgeSystem.getRelevantKnowledge('async');

      const asyncLearning = knowledge.learnings.find(l => l.name.includes('Async'));
      expect(asyncLearning).toBeDefined();

      if (asyncLearning) {
        expect(asyncLearning.id).toBeDefined();
        expect(asyncLearning.name).toBeDefined();
        expect(asyncLearning.description).toBeDefined();
        expect(asyncLearning.category).toBeDefined();
        expect(asyncLearning.occurrences).toBeGreaterThan(0);
        expect(asyncLearning.confidenceScore).toBeGreaterThan(0);
        expect(asyncLearning.rootCause).toBeDefined();
        expect(asyncLearning.preventionRule).toBeDefined();
      }
    });
  });

  describe('Integration Scenarios', () => {
    it('should provide comprehensive knowledge for prompt enhancement', async () => {
      const context: KnowledgeContext = {
        prompt: 'Implement authentication with error handling and testing',
        filePaths: ['src/auth.ts', 'src/auth.test.ts'],
        languages: ['typescript'],
        keywords: ['authentication', 'testing', 'error-handling']
      };

      const knowledge = await knowledgeSystem.getRelevantKnowledge(context);

      expect(knowledge.patterns.length).toBeGreaterThan(0);
      expect(knowledge.adrs.length).toBeGreaterThan(0);
      expect(knowledge.learnings.length).toBeGreaterThan(0);

      // Should find relevant patterns
      const hasErrorPattern = knowledge.patterns.some(p =>
        p.category === 'error-handling' || p.name.includes('Error')
      );
      expect(hasErrorPattern).toBe(true);

      // Should find relevant ADRs
      const hasTestingADR = knowledge.adrs.some(a =>
        a.title.includes('Jest') || a.title.includes('TypeScript')
      );
      expect(hasTestingADR).toBe(true);

      // Should find relevant learnings
      const hasErrorLearning = knowledge.learnings.some(l =>
        l.category === 'bug-fix' || l.name.includes('Error')
      );
      expect(hasErrorLearning).toBe(true);
    });

    it('should handle parallel queries efficiently', async () => {
      const contexts = [
        'error handling',
        'testing',
        'typescript',
        'performance'
      ];

      const promises = contexts.map(ctx => knowledgeSystem.getRelevantKnowledge(ctx));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(4);
      results.forEach(knowledge => {
        expect(knowledge).toBeDefined();
        expect(knowledge.patterns).toBeDefined();
        expect(knowledge.adrs).toBeDefined();
        expect(knowledge.learnings).toBeDefined();
      });
    });

    it('should provide consistent results for same context', async () => {
      const context = 'error handling';

      const result1 = await knowledgeSystem.getRelevantKnowledge(context);
      const result2 = await knowledgeSystem.getRelevantKnowledge(context);

      expect(result1.patterns).toEqual(result2.patterns);
      expect(result1.adrs).toEqual(result2.adrs);
      expect(result1.learnings).toEqual(result2.learnings);
    });
  });
});
