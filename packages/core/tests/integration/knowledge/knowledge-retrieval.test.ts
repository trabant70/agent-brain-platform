/**
 * Knowledge Retrieval Integration Tests
 *
 * Tests the complete flow of knowledge retrieval across PatternSystem, ADRSystem, and LearningSystem.
 * Validates that KnowledgeSystem correctly integrates all three systems with real storage.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { KnowledgeSystem } from '../../../src/domains/knowledge/KnowledgeSystem';
import { PatternSystem } from '../../../src/domains/knowledge/patterns';
import { ADRSystem } from '../../../src/domains/knowledge/adrs';
import { LearningSystem } from '../../../src/domains/knowledge/learning';
import { FilePatternStorage } from '../../../src/domains/knowledge/patterns/PatternStorage';
import { FileADRStorage } from '../../../src/domains/knowledge/adrs/ADRStorage';
import { MemoryLearningStorage } from '../../../src/domains/knowledge/learning/LearningStorage';
import { EnginePattern } from '../../../src/domains/knowledge/patterns/types';
import { ADR, ADRStatus } from '../../../src/domains/knowledge/adrs/types';
import { LearningPattern } from '../../../src/domains/knowledge/learning/types';

describe('Knowledge Retrieval Integration', () => {
  let knowledgeSystem: KnowledgeSystem;
  let patternSystem: PatternSystem;
  let adrSystem: ADRSystem;
  let learningSystem: LearningSystem;
  let tempDir: string;

  beforeEach(async () => {
    // Create unique temp directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-brain-knowledge-'));

    // Initialize real systems with temp storage
    const patternStorage = new FilePatternStorage(path.join(tempDir, 'patterns.json'));
    const adrStorage = new FileADRStorage(path.join(tempDir, 'adrs.json'));
    const learningStorage = new MemoryLearningStorage();

    patternSystem = new PatternSystem({ storage: patternStorage, autoSave: true });
    adrSystem = new ADRSystem({ storage: adrStorage });
    learningSystem = new LearningSystem(learningStorage);

    await patternSystem.initialize();

    knowledgeSystem = new KnowledgeSystem(patternSystem, adrSystem, learningSystem);

    // Seed test data
    await seedTestData(patternSystem, adrSystem, learningSystem);
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  // ========================================
  // Knowledge Retrieval Tests
  // ========================================

  describe('Pattern Retrieval', () => {
    it('should find authentication patterns', async () => {
      // First check that patterns were registered
      const allPatterns = patternSystem.getPatterns();
      expect(allPatterns.length).toBeGreaterThan(0);

      const knowledge = await knowledgeSystem.getRelevantKnowledge('authentication');

      expect(knowledge.patterns.length).toBeGreaterThan(0);
      const authPattern = knowledge.patterns.find(p => p.name.toLowerCase().includes('auth'));
      expect(authPattern).toBeDefined();
      expect(authPattern?.category).toBe('security');
    });

    it('should find error handling patterns', async () => {
      const knowledge = await knowledgeSystem.getRelevantKnowledge('error handling');

      expect(knowledge.patterns.length).toBeGreaterThan(0);
      const errorPattern = knowledge.patterns.find(p => p.name.toLowerCase().includes('error'));
      expect(errorPattern).toBeDefined();
    });

    it('should find testing patterns', async () => {
      const knowledge = await knowledgeSystem.getRelevantKnowledge('testing');

      expect(knowledge.patterns.length).toBeGreaterThan(0);
      const testPattern = knowledge.patterns.find(p => p.category === 'testing');
      expect(testPattern).toBeDefined();
    });
  });

  describe('ADR Retrieval', () => {
    it('should find architectural decisions', async () => {
      const knowledge = await knowledgeSystem.getRelevantKnowledge('database');

      expect(knowledge.adrs.length).toBeGreaterThan(0);
      const dbADR = knowledge.adrs.find(a => a.title.toLowerCase().includes('database'));
      expect(dbADR).toBeDefined();
      expect(dbADR?.status).toBe('accepted');
    });

    it('should find repository pattern ADR', async () => {
      const knowledge = await knowledgeSystem.getRelevantKnowledge('repository pattern');

      expect(knowledge.adrs.length).toBeGreaterThan(0);
      const repoADR = knowledge.adrs.find(a => a.title.toLowerCase().includes('repository'));
      expect(repoADR).toBeDefined();
    });

    it('should only return accepted/proposed ADRs', async () => {
      const knowledge = await knowledgeSystem.getRelevantKnowledge('architecture');

      // All returned ADRs should be active (not superseded/rejected)
      knowledge.adrs.forEach(adr => {
        expect(['accepted', 'proposed']).toContain(adr.status);
      });
    });
  });

  describe('Learning Retrieval', () => {
    it('should find async error learnings', async () => {
      const knowledge = await knowledgeSystem.getRelevantKnowledge('async error');

      expect(knowledge.learnings.length).toBeGreaterThan(0);
      const asyncLearning = knowledge.learnings.find(l => l.name.toLowerCase().includes('async'));
      expect(asyncLearning).toBeDefined();
      expect(asyncLearning?.category).toBe('bug-fix');
    });

    it('should sort learnings by confidence', async () => {
      const knowledge = await knowledgeSystem.getRelevantKnowledge('performance');

      if (knowledge.learnings.length > 1) {
        // Should be sorted by confidence score (highest first)
        for (let i = 0; i < knowledge.learnings.length - 1; i++) {
          expect(knowledge.learnings[i].confidenceScore).toBeGreaterThanOrEqual(
            knowledge.learnings[i + 1].confidenceScore
          );
        }
      }
    });
  });

  // ========================================
  // Relevance and Prioritization Tests
  // ========================================

  describe('Relevance Scoring', () => {
    it('should prioritize by relevance score', async () => {
      const knowledge = await knowledgeSystem.getRelevantKnowledge('repository pattern');

      // First pattern should be most relevant
      if (knowledge.patterns.length > 1) {
        expect(knowledge.patterns[0].relevanceScore || 0).toBeGreaterThanOrEqual(
          knowledge.patterns[1].relevanceScore || 0
        );
      }

      // First ADR should be most relevant
      if (knowledge.adrs.length > 1) {
        expect(knowledge.adrs[0].relevanceScore || 0).toBeGreaterThanOrEqual(
          knowledge.adrs[1].relevanceScore || 0
        );
      }
    });

    it('should assign high relevance to exact matches', async () => {
      const knowledge = await knowledgeSystem.getRelevantKnowledge('JWT Authentication');

      const jwtPattern = knowledge.patterns.find(p => p.name.includes('JWT'));
      if (jwtPattern) {
        expect(jwtPattern.relevanceScore).toBeGreaterThan(0.5);
      }
    });

    it('should filter by minimum relevance', async () => {
      const knowledge = await knowledgeSystem.getRelevantKnowledge('testing');

      // All returned items should meet minimum relevance threshold (default 0.3)
      knowledge.patterns.forEach(p => {
        if (p.relevanceScore !== undefined) {
          expect(p.relevanceScore).toBeGreaterThanOrEqual(0.3);
        }
      });
    });
  });

  // ========================================
  // Cross-System Integration Tests
  // ========================================

  describe('Cross-System Integration', () => {
    it('should retrieve knowledge from all three systems', async () => {
      const knowledge = await knowledgeSystem.getRelevantKnowledge('authentication security');

      // Should have results from multiple systems
      const hasPatterns = knowledge.patterns.length > 0;
      const hasADRs = knowledge.adrs.length > 0;
      const hasLearnings = knowledge.learnings.length > 0;

      // At least 2 out of 3 systems should have relevant knowledge
      const systemsWithResults = [hasPatterns, hasADRs, hasLearnings].filter(Boolean).length;
      expect(systemsWithResults).toBeGreaterThanOrEqual(2);
    });

    it('should handle complex contexts with multiple keywords', async () => {
      const knowledge = await knowledgeSystem.getRelevantKnowledge({
        prompt: 'Implement secure authentication with error handling',
        keywords: ['authentication', 'security', 'error'],
        filePaths: ['src/auth.ts'],
        languages: ['typescript']
      });

      expect(knowledge).toBeDefined();
      expect(knowledge.patterns).toBeDefined();
      expect(knowledge.adrs).toBeDefined();
      expect(knowledge.learnings).toBeDefined();

      // Should find security-related knowledge
      const hasSecurityKnowledge =
        knowledge.patterns.some(p => p.category === 'security') ||
        knowledge.adrs.some(a => a.title.toLowerCase().includes('auth') || a.title.toLowerCase().includes('security'));

      expect(hasSecurityKnowledge).toBe(true);
    });

    it('should handle empty results gracefully', async () => {
      const knowledge = await knowledgeSystem.getRelevantKnowledge('xyznonexistent');

      expect(knowledge.patterns).toEqual([]);
      expect(knowledge.adrs).toEqual([]);
      expect(knowledge.learnings).toEqual([]);
    });
  });

  // ========================================
  // Summary and Statistics Tests
  // ========================================

  describe('Knowledge Summary', () => {
    it('should generate complete knowledge summary', async () => {
      const summary = await knowledgeSystem.getSummary();

      expect(summary).toBeDefined();
      expect(summary.totalPatterns).toBeGreaterThan(0);
      expect(summary.totalADRs).toBeGreaterThan(0);
      expect(summary.totalLearnings).toBeGreaterThan(0);
      expect(summary.lastUpdated).toBeInstanceOf(Date);
    });

    it('should list recent ADRs in summary', async () => {
      const summary = await knowledgeSystem.getSummary();

      expect(summary.recentADRs).toBeDefined();
      expect(Array.isArray(summary.recentADRs)).toBe(true);

      // Recent ADRs should be sorted by date (newest first)
      if (summary.recentADRs.length > 1) {
        for (let i = 0; i < summary.recentADRs.length - 1; i++) {
          expect(summary.recentADRs[i].date.getTime()).toBeGreaterThanOrEqual(
            summary.recentADRs[i + 1].date.getTime()
          );
        }
      }
    });

    it('should show top pattern categories', async () => {
      const summary = await knowledgeSystem.getSummary();

      expect(summary.topPatternCategories).toBeDefined();
      expect(Array.isArray(summary.topPatternCategories)).toBe(true);

      // Should be sorted by count (highest first)
      if (summary.topPatternCategories.length > 1) {
        for (let i = 0; i < summary.topPatternCategories.length - 1; i++) {
          expect(summary.topPatternCategories[i].count).toBeGreaterThanOrEqual(
            summary.topPatternCategories[i + 1].count
          );
        }
      }
    });

    it('should show top learning categories', async () => {
      const summary = await knowledgeSystem.getSummary();

      expect(summary.topLearningCategories).toBeDefined();
      expect(Array.isArray(summary.topLearningCategories)).toBe(true);
    });
  });

  // ========================================
  // Persistence Integration Tests
  // ========================================

  describe('Storage Persistence', () => {
    it('should persist patterns to storage', async () => {
      // Pattern should already be saved (autoSave: true)
      const patterns = await patternSystem.getPatterns();
      expect(patterns.length).toBeGreaterThan(0);

      // Create new pattern system with same storage
      const patternStorage2 = new FilePatternStorage(path.join(tempDir, 'patterns.json'));
      const patternSystem2 = new PatternSystem({ storage: patternStorage2 });
      await patternSystem2.initialize();

      // Should load previously saved patterns
      const loadedPatterns = patternSystem2.getPatterns();
      expect(loadedPatterns.length).toBe(patterns.length);
    });

    it('should persist ADRs to storage', async () => {
      const adrs = await adrSystem.getADRs();
      expect(adrs.length).toBeGreaterThan(0);

      // Create new ADR system with same storage
      const adrStorage2 = new FileADRStorage(path.join(tempDir, 'adrs.json'));
      const adrSystem2 = new ADRSystem({ storage: adrStorage2 });

      // Should load previously saved ADRs
      const loadedADRs = await adrSystem2.getADRs();
      expect(loadedADRs.length).toBe(adrs.length);
    });
  });

  // ========================================
  // Real-World Scenario Tests
  // ========================================

  describe('Real-World Scenarios', () => {
    it('should provide knowledge for authentication implementation', async () => {
      const knowledge = await knowledgeSystem.getRelevantKnowledge({
        prompt: 'Implement user authentication system',
        keywords: ['authentication', 'security', 'jwt'],
        filePaths: ['src/auth/authentication.ts'],
        languages: ['typescript']
      });

      // Should find authentication pattern
      const authPattern = knowledge.patterns.find(p => p.name.toLowerCase().includes('auth'));
      expect(authPattern).toBeDefined();

      // Should have security-related knowledge
      const hasSecurityInfo =
        knowledge.patterns.some(p => p.category === 'security') ||
        knowledge.adrs.some(a => a.context.toLowerCase().includes('security'));
      expect(hasSecurityInfo).toBe(true);
    });

    it('should provide knowledge for debugging error', async () => {
      const knowledge = await knowledgeSystem.getRelevantKnowledge({
        prompt: 'Fix async error in data fetching',
        errors: ['Unhandled promise rejection', 'TypeError'],
        keywords: ['async', 'error', 'promise']
      });

      // Should find error handling patterns
      const hasErrorKnowledge =
        knowledge.patterns.some(p => p.name.toLowerCase().includes('error')) ||
        knowledge.learnings.some(l => l.name.toLowerCase().includes('error') || l.category === 'bug-fix');

      expect(hasErrorKnowledge).toBe(true);
    });

    it('should provide knowledge for architecture decision', async () => {
      const knowledge = await knowledgeSystem.getRelevantKnowledge({
        prompt: 'Decide on data access layer architecture',
        keywords: ['architecture', 'database', 'repository', 'pattern']
      });

      // Should find repository pattern ADR
      const repoADR = knowledge.adrs.find(a =>
        a.title.toLowerCase().includes('repository') ||
        a.decision.toLowerCase().includes('repository')
      );
      expect(repoADR).toBeDefined();
    });
  });
});

// ========================================
// Helper Functions
// ========================================

/**
 * Seed test data into all three knowledge systems
 */
async function seedTestData(
  patternSystem: PatternSystem,
  adrSystem: ADRSystem,
  learningSystem: LearningSystem
): Promise<void> {
  // Add test patterns
  const testPatterns: EnginePattern[] = [
    {
      id: 'auth-1',
      name: 'JWT Authentication Pattern',
      description: 'Use JWT tokens for stateless authentication',
      category: 'security',
      severity: 'high',
      trigger: /auth|jwt/i,
      message: 'Consider using JWT for authentication'
    },
    {
      id: 'error-1',
      name: 'Async Error Handling',
      description: 'Always wrap async operations in try-catch blocks',
      category: 'error-handling',
      severity: 'high',
      trigger: /async|await/i,
      message: 'Wrap async operations in try-catch'
    },
    {
      id: 'test-1',
      name: 'Unit Testing Pattern',
      description: 'Write unit tests for all business logic',
      category: 'testing',
      severity: 'medium',
      trigger: /test/i,
      message: 'Add unit tests'
    },
    {
      id: 'perf-1',
      name: 'Database Connection Pooling',
      description: 'Use connection pooling for database access',
      category: 'performance',
      severity: 'medium',
      trigger: /database|db/i,
      message: 'Use connection pooling'
    }
  ];

  for (const pattern of testPatterns) {
    await patternSystem.registerPattern(pattern);
  }

  // Add test ADRs
  const testADRs: Partial<ADR>[] = [
    {
      title: 'Use Repository Pattern for Database Access',
      status: ADRStatus.ACCEPTED,
      context: 'Need consistent data access layer across the application',
      decision: 'Implement repository pattern for all database operations',
      consequences: 'Easier testing and maintenance, but adds abstraction layer',
      tags: ['architecture', 'database', 'repository']
    },
    {
      title: 'Adopt TypeScript for Type Safety',
      status: ADRStatus.ACCEPTED,
      context: 'Need better type safety and developer experience',
      decision: 'Migrate codebase to TypeScript',
      consequences: 'Improved type safety, better IDE support, steeper learning curve',
      tags: ['typescript', 'type-safety']
    },
    {
      title: 'Use JWT for Authentication',
      status: ADRStatus.ACCEPTED,
      context: 'Need stateless authentication for API',
      decision: 'Implement JWT-based authentication',
      consequences: 'Stateless, scalable, but requires token management',
      tags: ['authentication', 'security', 'jwt']
    }
  ];

  for (const adr of testADRs) {
    await adrSystem.createADR(adr as ADR);
  }

  // Add test learnings
  // Note: LearningSystem typically learns from test failures via processFailure()
  // For testing purposes, we'll use direct storage access via the private storage
  const testFailures = [
    {
      test: 'async error handling test',
      error: 'Unhandled promise rejection',
      file: 'src/utils.ts',
      context: {
        code: 'await fetchData()',
        timestamp: new Date()
      }
    },
    {
      test: 'connection pool test',
      error: 'Connection timeout',
      file: 'src/db.ts',
      context: {
        code: 'db.connect()',
        timestamp: new Date()
      }
    },
    {
      test: 'test isolation issue',
      error: 'State mutation detected',
      file: 'tests/user.test.ts',
      context: {
        code: 'expect(state).toBe(initial)',
        timestamp: new Date()
      }
    }
  ];

  // Process failures to generate learnings
  for (const failure of testFailures) {
    try {
      await learningSystem.processFailure(failure);
    } catch (error) {
      // Ignore failures in test setup
    }
  }
}
