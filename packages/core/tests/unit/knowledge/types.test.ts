/**
 * Knowledge Types Unit Tests
 *
 * Tests for pure knowledge data structures.
 * These tests validate the knowledge type system without any external dependencies.
 */

import {
  Knowledge,
  PatternKnowledge,
  ADRKnowledge,
  LearningKnowledge,
  KnowledgeSummary,
  CategoryCount,
  KnowledgeQueryOptions,
  KnowledgeContext
} from '../../../src/domains/knowledge/types';

describe('Knowledge Types', () => {
  describe('PatternKnowledge Interface', () => {
    it('should create a valid pattern knowledge object', () => {
      const pattern: PatternKnowledge = {
        id: 'pattern-1',
        name: 'Error Handling Pattern',
        description: 'Always use try-catch for async operations',
        category: 'error-handling',
        severity: 'high',
        relevanceScore: 0.85,
        occurrences: 12,
        lastSeen: new Date('2025-10-07T10:00:00Z')
      };

      expect(pattern.id).toBe('pattern-1');
      expect(pattern.name).toBe('Error Handling Pattern');
      expect(pattern.category).toBe('error-handling');
      expect(pattern.severity).toBe('high');
      expect(pattern.relevanceScore).toBe(0.85);
      expect(pattern.occurrences).toBe(12);
      expect(pattern.lastSeen).toBeInstanceOf(Date);
    });

    it('should support all severity levels', () => {
      const severities: Array<'low' | 'medium' | 'high' | 'critical'> = [
        'low',
        'medium',
        'high',
        'critical'
      ];

      severities.forEach(severity => {
        const pattern: PatternKnowledge = {
          id: `pattern-${severity}`,
          name: `Test Pattern`,
          description: 'Test',
          category: 'test',
          severity
        };

        expect(pattern.severity).toBe(severity);
      });
    });

    it('should allow optional fields to be undefined', () => {
      const pattern: PatternKnowledge = {
        id: 'pattern-minimal',
        name: 'Minimal Pattern',
        description: 'Test',
        category: 'test'
      };

      expect(pattern.severity).toBeUndefined();
      expect(pattern.relevanceScore).toBeUndefined();
      expect(pattern.occurrences).toBeUndefined();
      expect(pattern.lastSeen).toBeUndefined();
    });
  });

  describe('ADRKnowledge Interface', () => {
    it('should create a valid ADR knowledge object', () => {
      const adr: ADRKnowledge = {
        id: 'adr-001',
        number: 1,
        title: 'Use TypeScript for type safety',
        status: 'accepted',
        date: new Date('2025-01-01'),
        context: 'Need better type safety in codebase',
        decision: 'Adopt TypeScript for all new code',
        consequences: 'Improved type safety, steeper learning curve',
        relevanceScore: 0.95,
        supersedes: [],
        supersededBy: []
      };

      expect(adr.id).toBe('adr-001');
      expect(adr.number).toBe(1);
      expect(adr.title).toBe('Use TypeScript for type safety');
      expect(adr.status).toBe('accepted');
      expect(adr.date).toBeInstanceOf(Date);
      expect(adr.context).toBe('Need better type safety in codebase');
      expect(adr.decision).toBe('Adopt TypeScript for all new code');
    });

    it('should support all ADR statuses', () => {
      const statuses: Array<'proposed' | 'accepted' | 'rejected' | 'deprecated' | 'superseded'> = [
        'proposed',
        'accepted',
        'rejected',
        'deprecated',
        'superseded'
      ];

      statuses.forEach(status => {
        const adr: ADRKnowledge = {
          id: `adr-${status}`,
          number: 1,
          title: 'Test ADR',
          status,
          date: new Date(),
          context: 'Test context',
          decision: 'Test decision'
        };

        expect(adr.status).toBe(status);
      });
    });

    it('should handle supersession relationships', () => {
      const adr: ADRKnowledge = {
        id: 'adr-005',
        number: 5,
        title: 'Updated Architecture',
        status: 'accepted',
        date: new Date(),
        context: 'Original architecture was insufficient',
        decision: 'Use microservices',
        supersedes: [3], // Supersedes ADR 3
        supersededBy: [] // Not yet superseded
      };

      expect(adr.supersedes).toEqual([3]);
      expect(adr.supersededBy).toEqual([]);
    });
  });

  describe('LearningKnowledge Interface', () => {
    it('should create a valid learning knowledge object', () => {
      const learning: LearningKnowledge = {
        id: 'learning-1',
        name: 'Async/Await Error Handling',
        description: 'Always wrap async operations in try-catch',
        category: 'bug-fix',
        occurrences: 5,
        confidenceScore: 0.9,
        rootCause: 'Unhandled promise rejections',
        preventionRule: 'Use try-catch or .catch() for all promises',
        lastUpdated: new Date('2025-10-07')
      };

      expect(learning.id).toBe('learning-1');
      expect(learning.name).toBe('Async/Await Error Handling');
      expect(learning.category).toBe('bug-fix');
      expect(learning.occurrences).toBe(5);
      expect(learning.confidenceScore).toBe(0.9);
      expect(learning.rootCause).toBe('Unhandled promise rejections');
      expect(learning.preventionRule).toBe('Use try-catch or .catch() for all promises');
    });

    it('should require confidence score between 0 and 1', () => {
      const validScores = [0.0, 0.5, 0.75, 1.0];

      validScores.forEach(score => {
        const learning: LearningKnowledge = {
          id: 'test',
          name: 'Test',
          description: 'Test',
          category: 'test',
          occurrences: 1,
          confidenceScore: score
        };

        expect(learning.confidenceScore).toBeGreaterThanOrEqual(0.0);
        expect(learning.confidenceScore).toBeLessThanOrEqual(1.0);
      });
    });
  });

  describe('Knowledge Container', () => {
    it('should aggregate all knowledge types', () => {
      const knowledge: Knowledge = {
        patterns: [
          {
            id: 'p1',
            name: 'Pattern 1',
            description: 'Test pattern',
            category: 'test'
          }
        ],
        adrs: [
          {
            id: 'adr-1',
            number: 1,
            title: 'Test ADR',
            status: 'accepted',
            date: new Date(),
            context: 'Test',
            decision: 'Test'
          }
        ],
        learnings: [
          {
            id: 'l1',
            name: 'Learning 1',
            description: 'Test learning',
            category: 'test',
            occurrences: 1,
            confidenceScore: 0.8
          }
        ]
      };

      expect(knowledge.patterns).toHaveLength(1);
      expect(knowledge.adrs).toHaveLength(1);
      expect(knowledge.learnings).toHaveLength(1);
    });

    it('should support empty knowledge', () => {
      const knowledge: Knowledge = {
        patterns: [],
        adrs: [],
        learnings: []
      };

      expect(knowledge.patterns).toEqual([]);
      expect(knowledge.adrs).toEqual([]);
      expect(knowledge.learnings).toEqual([]);
    });
  });

  describe('KnowledgeSummary Interface', () => {
    it('should create a valid knowledge summary', () => {
      const summary: KnowledgeSummary = {
        totalPatterns: 25,
        totalADRs: 10,
        totalLearnings: 15,
        recentADRs: [
          {
            id: 'adr-10',
            number: 10,
            title: 'Recent Decision',
            status: 'accepted',
            date: new Date(),
            context: 'Latest change',
            decision: 'Do this'
          }
        ],
        topPatternCategories: [
          { category: 'error-handling', count: 8 },
          { category: 'testing', count: 6 },
          { category: 'architecture', count: 5 }
        ],
        topLearningCategories: [
          { category: 'bug-fix', count: 10 },
          { category: 'performance', count: 3 }
        ],
        lastUpdated: new Date()
      };

      expect(summary.totalPatterns).toBe(25);
      expect(summary.totalADRs).toBe(10);
      expect(summary.totalLearnings).toBe(15);
      expect(summary.recentADRs).toHaveLength(1);
      expect(summary.topPatternCategories).toHaveLength(3);
      expect(summary.topLearningCategories).toHaveLength(2);
      expect(summary.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('CategoryCount Interface', () => {
    it('should represent category counts', () => {
      const categoryCount: CategoryCount = {
        category: 'error-handling',
        count: 12
      };

      expect(categoryCount.category).toBe('error-handling');
      expect(categoryCount.count).toBe(12);
    });
  });

  describe('KnowledgeQueryOptions Interface', () => {
    it('should create query options with all fields', () => {
      const options: KnowledgeQueryOptions = {
        categories: ['error-handling', 'testing'],
        minRelevance: 0.7,
        limit: 10,
        includeDeprecated: false,
        sortBy: 'relevance'
      };

      expect(options.categories).toEqual(['error-handling', 'testing']);
      expect(options.minRelevance).toBe(0.7);
      expect(options.limit).toBe(10);
      expect(options.includeDeprecated).toBe(false);
      expect(options.sortBy).toBe('relevance');
    });

    it('should support all sort options', () => {
      const sortOptions: Array<'relevance' | 'date' | 'name'> = ['relevance', 'date', 'name'];

      sortOptions.forEach(sortBy => {
        const options: KnowledgeQueryOptions = {
          sortBy
        };

        expect(options.sortBy).toBe(sortBy);
      });
    });

    it('should allow all optional fields', () => {
      const options: KnowledgeQueryOptions = {};

      expect(options.categories).toBeUndefined();
      expect(options.minRelevance).toBeUndefined();
      expect(options.limit).toBeUndefined();
      expect(options.includeDeprecated).toBeUndefined();
      expect(options.sortBy).toBeUndefined();
    });
  });

  describe('KnowledgeContext Interface', () => {
    it('should create a rich knowledge context', () => {
      const context: KnowledgeContext = {
        prompt: 'Add authentication to user service',
        filePaths: ['src/auth.ts', 'src/user.ts'],
        languages: ['typescript', 'javascript'],
        errors: ['TypeError: Cannot read property of undefined'],
        keywords: ['authentication', 'jwt', 'security']
      };

      expect(context.prompt).toBe('Add authentication to user service');
      expect(context.filePaths).toHaveLength(2);
      expect(context.languages).toHaveLength(2);
      expect(context.errors).toHaveLength(1);
      expect(context.keywords).toHaveLength(3);
    });

    it('should allow minimal context', () => {
      const context: KnowledgeContext = {
        prompt: 'Fix bug'
      };

      expect(context.prompt).toBe('Fix bug');
      expect(context.filePaths).toBeUndefined();
      expect(context.languages).toBeUndefined();
      expect(context.errors).toBeUndefined();
      expect(context.keywords).toBeUndefined();
    });

    it('should allow empty context', () => {
      const context: KnowledgeContext = {};

      expect(context.prompt).toBeUndefined();
      expect(context.filePaths).toBeUndefined();
    });
  });

  describe('Type Safety', () => {
    it('should enforce required fields on PatternKnowledge', () => {
      const pattern: PatternKnowledge = {
        id: 'required-test',
        name: 'Required',
        description: 'Required',
        category: 'required'
      };

      expect(pattern).toBeDefined();
    });

    it('should enforce required fields on ADRKnowledge', () => {
      const adr: ADRKnowledge = {
        id: 'required-test',
        number: 1,
        title: 'Required',
        status: 'proposed',
        date: new Date(),
        context: 'Required',
        decision: 'Required'
      };

      expect(adr).toBeDefined();
    });

    it('should enforce required fields on LearningKnowledge', () => {
      const learning: LearningKnowledge = {
        id: 'required-test',
        name: 'Required',
        description: 'Required',
        category: 'required',
        occurrences: 1,
        confidenceScore: 0.5
      };

      expect(learning).toBeDefined();
    });
  });

  describe('Real-World Scenarios', () => {
    it('should model a complete error handling pattern', () => {
      const pattern: PatternKnowledge = {
        id: 'err-001',
        name: 'Async Error Handling',
        description: 'All async functions should use try-catch blocks',
        category: 'error-handling',
        severity: 'high',
        relevanceScore: 0.95,
        occurrences: 23,
        lastSeen: new Date()
      };

      expect(pattern.severity).toBe('high');
      expect(pattern.occurrences).toBeGreaterThan(20);
    });

    it('should model a superseded ADR', () => {
      const oldADR: ADRKnowledge = {
        id: 'adr-003',
        number: 3,
        title: 'Use REST API',
        status: 'superseded',
        date: new Date('2024-01-01'),
        context: 'Need API for frontend',
        decision: 'Build REST API',
        supersededBy: [7] // Superseded by ADR 7 (GraphQL)
      };

      expect(oldADR.status).toBe('superseded');
      expect(oldADR.supersededBy).toContain(7);
    });

    it('should model a high-confidence learning', () => {
      const learning: LearningKnowledge = {
        id: 'learn-042',
        name: 'Database Connection Pooling',
        description: 'Always use connection pooling for database access',
        category: 'performance',
        occurrences: 15,
        confidenceScore: 0.98,
        rootCause: 'Connection overhead causes performance issues',
        preventionRule: 'Configure connection pool in database client',
        lastUpdated: new Date()
      };

      expect(learning.confidenceScore).toBeGreaterThan(0.95);
      expect(learning.category).toBe('performance');
    });
  });
});
