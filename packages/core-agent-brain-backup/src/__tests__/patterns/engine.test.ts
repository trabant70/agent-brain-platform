import { PatternEngine } from '../../patterns/engine';
import { Pattern, TestFailure } from '../../learning/types';

describe('PatternEngine', () => {
  let engine: PatternEngine;

  const mockPattern: Pattern = {
    id: 'null-check-pattern',
    name: 'Null Property Access',
    description: 'Detects attempts to access properties on null/undefined objects',
    category: 'type-safety',
    severity: 'error',
    trigger: /Cannot read propert(y|ies) .+ of (null|undefined)/i,
    message: 'Consider adding null checks before accessing object properties',
    metadata: {
      source: 'typescript',
      confidence: 0.9,
      tags: ['null-safety', 'runtime-error'],
      autoFix: {
        enabled: true,
        strategy: 'optional-chaining',
        confidence: 0.8
      }
    }
  };

  const mockPattern2: Pattern = {
    id: 'async-pattern',
    name: 'Missing Await',
    description: 'Detects promises that are not awaited',
    category: 'async',
    severity: 'warning',
    trigger: /Promise.*not.*awaited/i,
    message: 'Consider awaiting this promise or handling it properly',
    metadata: {
      source: 'eslint',
      confidence: 0.85,
      tags: ['async', 'promises']
    }
  };

  beforeEach(() => {
    engine = new PatternEngine();
  });

  describe('Pattern Registration', () => {
    it('should register a new pattern', async () => {
      await engine.registerPattern(mockPattern);

      const patterns = await engine.getPatterns();
      expect(patterns).toHaveLength(1);
      expect(patterns[0]).toEqual(mockPattern);
    });

    it('should register multiple patterns', async () => {
      await engine.registerPattern(mockPattern);
      await engine.registerPattern(mockPattern2);

      const patterns = await engine.getPatterns();
      expect(patterns).toHaveLength(2);
    });

    it('should update existing pattern when re-registering with same id', async () => {
      await engine.registerPattern(mockPattern);

      const updatedPattern = {
        ...mockPattern,
        name: 'Updated Null Check Pattern',
        metadata: {
          ...mockPattern.metadata!,
          confidence: 0.95
        }
      };

      await engine.registerPattern(updatedPattern);

      const patterns = await engine.getPatterns();
      expect(patterns).toHaveLength(1);
      expect(patterns[0].name).toBe('Updated Null Check Pattern');
      expect(patterns[0].metadata?.confidence).toBe(0.95);
    });

    it('should handle pattern registration errors gracefully', async () => {
      const invalidPattern = {
        ...mockPattern,
        trigger: 'invalid-regex' as any // Invalid regex
      };

      await expect(engine.registerPattern(invalidPattern)).resolves.not.toThrow();

      const patterns = await engine.getPatterns();
      expect(patterns).toHaveLength(0); // Should not register invalid pattern
    });
  });

  describe('Pattern Matching', () => {
    beforeEach(async () => {
      await engine.registerPattern(mockPattern);
      await engine.registerPattern(mockPattern2);
    });

    it('should match test failures against registered patterns', async () => {
      const testFailure: TestFailure = {
        test: 'Property access error',
        error: 'TypeError: Cannot read property "name" of undefined',
        file: 'src/user.ts',
        context: {
          timestamp: new Date(),
          code: 'const name = user.name;'
        }
      };

      const matches = await engine.matchPatterns([testFailure]);

      expect(matches).toHaveLength(1);
      expect(matches[0].pattern.id).toBe('null-check-pattern');
      expect(matches[0].failure).toEqual(testFailure);
      expect(matches[0].confidence).toBeGreaterThan(0.8);
    });

    it('should match multiple patterns to single failure', async () => {
      const complexPattern: Pattern = {
        id: 'complex-pattern',
        name: 'Complex Error',
        description: 'Matches complex error scenarios',
        category: 'general',
        severity: 'error',
        trigger: /Cannot read property/i, // Overlaps with mockPattern
        message: 'General property access error'
      };

      await engine.registerPattern(complexPattern);

      const testFailure: TestFailure = {
        test: 'Property access error',
        error: 'TypeError: Cannot read property "name" of undefined',
        file: 'src/user.ts',
        context: { timestamp: new Date() }
      };

      const matches = await engine.matchPatterns([testFailure]);

      expect(matches.length).toBeGreaterThanOrEqual(2);
      const patternIds = matches.map(m => m.pattern.id);
      expect(patternIds).toContain('null-check-pattern');
      expect(patternIds).toContain('complex-pattern');
    });

    it('should return no matches for non-matching failures', async () => {
      const testFailure: TestFailure = {
        test: 'Unrelated error',
        error: 'SyntaxError: Unexpected token {',
        file: 'src/syntax.ts',
        context: { timestamp: new Date() }
      };

      const matches = await engine.matchPatterns([testFailure]);
      expect(matches).toHaveLength(0);
    });

    it('should handle empty failure list', async () => {
      const matches = await engine.matchPatterns([]);
      expect(matches).toEqual([]);
    });

    it('should calculate appropriate confidence scores', async () => {
      const exactMatch: TestFailure = {
        test: 'Exact match',
        error: 'TypeError: Cannot read property "test" of null',
        file: 'src/test.ts',
        context: { timestamp: new Date() }
      };

      const partialMatch: TestFailure = {
        test: 'Partial match',
        error: 'Error: Cannot read property in complex scenario',
        file: 'src/complex.ts',
        context: { timestamp: new Date() }
      };

      const exactMatches = await engine.matchPatterns([exactMatch]);
      const partialMatches = await engine.matchPatterns([partialMatch]);

      expect(exactMatches[0].confidence).toBeGreaterThan(partialMatches[0].confidence);
    });
  });

  describe('Pattern Filtering', () => {
    beforeEach(async () => {
      await engine.registerPattern(mockPattern);
      await engine.registerPattern(mockPattern2);
    });

    it('should filter patterns by category', async () => {
      const typeSafetyPatterns = await engine.getPatterns({ category: 'type-safety' });
      expect(typeSafetyPatterns).toHaveLength(1);
      expect(typeSafetyPatterns[0].id).toBe('null-check-pattern');

      const asyncPatterns = await engine.getPatterns({ category: 'async' });
      expect(asyncPatterns).toHaveLength(1);
      expect(asyncPatterns[0].id).toBe('async-pattern');
    });

    it('should filter patterns by severity', async () => {
      const errorPatterns = await engine.getPatterns({ severity: 'error' });
      expect(errorPatterns).toHaveLength(1);
      expect(errorPatterns[0].id).toBe('null-check-pattern');

      const warningPatterns = await engine.getPatterns({ severity: 'warning' });
      expect(warningPatterns).toHaveLength(1);
      expect(warningPatterns[0].id).toBe('async-pattern');
    });

    it('should filter patterns by tags', async () => {
      const nullSafetyPatterns = await engine.getPatterns({ tags: ['null-safety'] });
      expect(nullSafetyPatterns).toHaveLength(1);
      expect(nullSafetyPatterns[0].id).toBe('null-check-pattern');

      const asyncPatterns = await engine.getPatterns({ tags: ['async'] });
      expect(asyncPatterns).toHaveLength(1);
      expect(asyncPatterns[0].id).toBe('async-pattern');
    });

    it('should filter patterns by source', async () => {
      const typescriptPatterns = await engine.getPatterns({ source: 'typescript' });
      expect(typescriptPatterns).toHaveLength(1);
      expect(typescriptPatterns[0].id).toBe('null-check-pattern');

      const eslintPatterns = await engine.getPatterns({ source: 'eslint' });
      expect(eslintPatterns).toHaveLength(1);
      expect(eslintPatterns[0].id).toBe('async-pattern');
    });

    it('should combine multiple filter criteria', async () => {
      const specificPatterns = await engine.getPatterns({
        category: 'type-safety',
        severity: 'error',
        source: 'typescript'
      });

      expect(specificPatterns).toHaveLength(1);
      expect(specificPatterns[0].id).toBe('null-check-pattern');
    });

    it('should return empty array when no patterns match filter', async () => {
      const noMatches = await engine.getPatterns({ category: 'non-existent' });
      expect(noMatches).toHaveLength(0);
    });
  });

  describe('Pattern Removal', () => {
    beforeEach(async () => {
      await engine.registerPattern(mockPattern);
      await engine.registerPattern(mockPattern2);
    });

    it('should remove pattern by id', async () => {
      await engine.removePattern('null-check-pattern');

      const patterns = await engine.getPatterns();
      expect(patterns).toHaveLength(1);
      expect(patterns[0].id).toBe('async-pattern');
    });

    it('should handle removal of non-existent pattern', async () => {
      await expect(engine.removePattern('non-existent')).resolves.not.toThrow();

      const patterns = await engine.getPatterns();
      expect(patterns).toHaveLength(2);
    });

    it('should remove all patterns', async () => {
      await engine.removePattern('null-check-pattern');
      await engine.removePattern('async-pattern');

      const patterns = await engine.getPatterns();
      expect(patterns).toHaveLength(0);
    });
  });

  describe('Pattern Statistics', () => {
    beforeEach(async () => {
      await engine.registerPattern(mockPattern);
      await engine.registerPattern(mockPattern2);
    });

    it('should calculate pattern statistics', async () => {
      const testFailures: TestFailure[] = [
        {
          test: 'Null error 1',
          error: 'Cannot read property "a" of null',
          file: 'src/a.ts',
          context: { timestamp: new Date() }
        },
        {
          test: 'Null error 2',
          error: 'Cannot read property "b" of undefined',
          file: 'src/b.ts',
          context: { timestamp: new Date() }
        },
        {
          test: 'Async error',
          error: 'Promise not awaited in function',
          file: 'src/async.ts',
          context: { timestamp: new Date() }
        }
      ];

      const matches = await engine.matchPatterns(testFailures);
      const stats = await engine.getPatternStats();

      expect(stats.totalPatterns).toBe(2);
      expect(stats.totalMatches).toBe(matches.length);
      expect(stats.patternsByCategory['type-safety']).toBe(1);
      expect(stats.patternsByCategory['async']).toBe(1);
    });

    it('should track pattern usage over time', async () => {
      const testFailure: TestFailure = {
        test: 'Usage tracking',
        error: 'Cannot read property "test" of null',
        file: 'src/track.ts',
        context: { timestamp: new Date() }
      };

      await engine.matchPatterns([testFailure]);
      await engine.matchPatterns([testFailure]);

      const stats = await engine.getPatternStats();
      expect(stats.mostUsedPatterns[0].id).toBe('null-check-pattern');
      expect(stats.mostUsedPatterns[0].usageCount).toBe(2);
    });
  });

  describe('Performance Optimization', () => {
    it('should handle large numbers of patterns efficiently', async () => {
      const manyPatterns = Array.from({ length: 1000 }, (_, i) => ({
        ...mockPattern,
        id: `pattern-${i}`,
        name: `Pattern ${i}`,
        trigger: new RegExp(`pattern${i}`, 'i')
      }));

      const startTime = Date.now();
      for (const pattern of manyPatterns) {
        await engine.registerPattern(pattern);
      }
      const registrationTime = Date.now() - startTime;

      expect(registrationTime).toBeLessThan(5000); // Should complete within 5 seconds

      const patterns = await engine.getPatterns();
      expect(patterns).toHaveLength(1000);
    });

    it('should efficiently match against many patterns', async () => {
      const manyPatterns = Array.from({ length: 100 }, (_, i) => ({
        ...mockPattern,
        id: `pattern-${i}`,
        trigger: new RegExp(`error${i}`, 'i')
      }));

      for (const pattern of manyPatterns) {
        await engine.registerPattern(pattern);
      }

      const testFailures = Array.from({ length: 50 }, (_, i) => ({
        test: `Test ${i}`,
        error: `Error${i} occurred`,
        file: `src/file${i}.ts`,
        context: { timestamp: new Date() }
      }));

      const startTime = Date.now();
      const matches = await engine.matchPatterns(testFailures);
      const matchingTime = Date.now() - startTime;

      expect(matchingTime).toBeLessThan(2000); // Should complete within 2 seconds
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should cache compiled regex patterns', async () => {
      const pattern = { ...mockPattern };

      // Register same pattern multiple times
      await engine.registerPattern(pattern);
      await engine.registerPattern(pattern);
      await engine.registerPattern(pattern);

      const testFailure: TestFailure = {
        test: 'Cache test',
        error: 'Cannot read property "cache" of null',
        file: 'src/cache.ts',
        context: { timestamp: new Date() }
      };

      // Multiple matches should use cached regex
      const startTime = Date.now();
      await engine.matchPatterns([testFailure]);
      await engine.matchPatterns([testFailure]);
      await engine.matchPatterns([testFailure]);
      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(100); // Should be very fast with caching
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed regex patterns gracefully', async () => {
      const invalidPattern = {
        ...mockPattern,
        trigger: '[invalid regex' as any
      };

      await expect(engine.registerPattern(invalidPattern)).resolves.not.toThrow();

      const patterns = await engine.getPatterns();
      expect(patterns).toHaveLength(0);
    });

    it('should handle null/undefined patterns', async () => {
      await expect(engine.registerPattern(null as any)).resolves.not.toThrow();
      await expect(engine.registerPattern(undefined as any)).resolves.not.toThrow();

      const patterns = await engine.getPatterns();
      expect(patterns).toHaveLength(0);
    });

    it('should handle malformed test failures in matching', async () => {
      await engine.registerPattern(mockPattern);

      const malformedFailures = [
        null,
        undefined,
        { test: '', error: '', file: '', context: null },
        { test: 'valid', error: null, file: undefined, context: {} }
      ] as any;

      const matches = await engine.matchPatterns(malformedFailures);
      expect(matches).toEqual([]);
    });

    it('should handle circular references in patterns', async () => {
      const circularPattern: any = { ...mockPattern };
      circularPattern.self = circularPattern;

      await expect(engine.registerPattern(circularPattern)).resolves.not.toThrow();
    });
  });

  describe('Pattern Validation', () => {
    it('should validate required pattern fields', async () => {
      const incompletePattern = {
        name: 'Incomplete Pattern'
        // Missing required fields
      } as any;

      await expect(engine.registerPattern(incompletePattern)).resolves.not.toThrow();

      const patterns = await engine.getPatterns();
      expect(patterns).toHaveLength(0);
    });

    it('should validate pattern trigger types', async () => {
      const invalidTriggerPattern = {
        ...mockPattern,
        trigger: 'string instead of regex' as any
      };

      await expect(engine.registerPattern(invalidTriggerPattern)).resolves.not.toThrow();

      const patterns = await engine.getPatterns();
      expect(patterns).toHaveLength(0);
    });

    it('should validate pattern categories', async () => {
      const invalidCategoryPattern = {
        ...mockPattern,
        category: 123 as any // Should be string
      };

      await expect(engine.registerPattern(invalidCategoryPattern)).resolves.not.toThrow();

      const patterns = await engine.getPatterns();
      expect(patterns).toHaveLength(0);
    });
  });

  describe('Pattern Export/Import', () => {
    beforeEach(async () => {
      await engine.registerPattern(mockPattern);
      await engine.registerPattern(mockPattern2);
    });

    it('should export patterns to JSON', async () => {
      const exported = await engine.exportPatterns();
      const parsed = JSON.parse(exported);

      expect(parsed).toHaveProperty('patterns');
      expect(parsed.patterns).toHaveLength(2);
      expect(parsed).toHaveProperty('metadata');
      expect(parsed.metadata).toHaveProperty('exportedAt');
    });

    it('should import patterns from JSON', async () => {
      const exportData = {
        patterns: [mockPattern],
        metadata: {
          exportedAt: new Date().toISOString(),
          version: '1.0.0'
        }
      };

      const newEngine = new PatternEngine();
      await newEngine.importPatterns(JSON.stringify(exportData));

      const patterns = await newEngine.getPatterns();
      expect(patterns).toHaveLength(1);
      expect(patterns[0].id).toBe(mockPattern.id);
    });

    it('should handle malformed import data', async () => {
      await expect(engine.importPatterns('invalid json')).rejects.toThrow();
    });

    it('should handle import data with invalid patterns', async () => {
      const invalidImportData = {
        patterns: [
          mockPattern, // Valid
          { invalid: 'pattern' }, // Invalid
          mockPattern2 // Valid
        ]
      };

      await expect(engine.importPatterns(JSON.stringify(invalidImportData))).resolves.not.toThrow();

      const patterns = await engine.getPatterns();
      expect(patterns).toHaveLength(2); // Should import only valid patterns
    });
  });
});