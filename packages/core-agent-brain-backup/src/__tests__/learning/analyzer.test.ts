import { PatternAnalyzer } from '../../learning/analyzer';
import { TestFailure, Pattern } from '../../learning/types';

describe('PatternAnalyzer', () => {
  let analyzer: PatternAnalyzer;

  beforeEach(() => {
    analyzer = new PatternAnalyzer();
  });

  describe('Pattern Analysis', () => {
    it('should analyze test failures and extract patterns', async () => {
      const testFailures: TestFailure[] = [
        {
          test: 'TypeError: Cannot read property "name" of undefined',
          error: 'TypeError: Cannot read property "name" of undefined at getUserName',
          file: 'src/user.ts',
          context: {
            timestamp: new Date(),
            code: 'function getUserName(user) { return user.name; }'
          }
        },
        {
          test: 'TypeError: Cannot read property "name" of undefined',
          error: 'TypeError: Cannot read property "name" of undefined at getDisplayName',
          file: 'src/profile.ts',
          context: {
            timestamp: new Date(),
            code: 'function getDisplayName(profile) { return profile.name; }'
          }
        }
      ];

      const patterns = await analyzer.analyzeFailures(testFailures);

      expect(patterns).toHaveLength(1);
      expect(patterns[0].name).toContain('Null/Undefined Property Access');
      expect(patterns[0].trigger).toBeInstanceOf(RegExp);
      expect(patterns[0].category).toBe('type-safety');
      expect(patterns[0].severity).toBe('error');
      expect(patterns[0].metadata?.confidence).toBeGreaterThan(0.8);
    });

    it('should identify recurring patterns across multiple failures', async () => {
      const testFailures: TestFailure[] = [
        {
          test: 'Expected 3 but got 2',
          error: 'Expected 3 but got 2',
          file: 'src/calc.ts',
          context: { timestamp: new Date() }
        },
        {
          test: 'Expected "hello" but got "hi"',
          error: 'Expected "hello" but got "hi"',
          file: 'src/greeting.ts',
          context: { timestamp: new Date() }
        },
        {
          test: 'Expected true but got false',
          error: 'Expected true but got false',
          file: 'src/validation.ts',
          context: { timestamp: new Date() }
        }
      ];

      const patterns = await analyzer.analyzeFailures(testFailures);

      expect(patterns).toHaveLength(1);
      expect(patterns[0].name).toContain('Test Assertion Mismatch');
      expect(patterns[0].metadata?.occurrences).toBe(3);
    });

    it('should extract context information from failures', async () => {
      const testFailures: TestFailure[] = [
        {
          test: 'Cannot call forEach on undefined',
          error: 'TypeError: Cannot read property "forEach" of undefined',
          file: 'src/list.ts',
          context: {
            timestamp: new Date(),
            code: 'const items = getItems();\nitems.forEach(item => process(item));',
            line: 2,
            column: 6
          }
        }
      ];

      const patterns = await analyzer.analyzeFailures(testFailures);

      expect(patterns[0].metadata?.context).toBeDefined();
      expect(patterns[0].metadata?.context?.commonLocations).toContain('src/list.ts');
      expect(patterns[0].metadata?.context?.codeExamples).toHaveLength(1);
    });

    it('should handle empty failure list', async () => {
      const patterns = await analyzer.analyzeFailures([]);
      expect(patterns).toEqual([]);
    });

    it('should group similar failures by error type', async () => {
      const testFailures: TestFailure[] = [
        {
          test: 'ReferenceError: undefinedVar is not defined',
          error: 'ReferenceError: undefinedVar is not defined',
          file: 'src/a.ts',
          context: { timestamp: new Date() }
        },
        {
          test: 'ReferenceError: missingFunction is not defined',
          error: 'ReferenceError: missingFunction is not defined',
          file: 'src/b.ts',
          context: { timestamp: new Date() }
        },
        {
          test: 'TypeError: Cannot read property',
          error: 'TypeError: Cannot read property "x" of null',
          file: 'src/c.ts',
          context: { timestamp: new Date() }
        }
      ];

      const patterns = await analyzer.analyzeFailures(testFailures);

      expect(patterns).toHaveLength(2); // ReferenceError group and TypeError group

      const referenceErrorPattern = patterns.find(p => p.name.includes('Reference'));
      expect(referenceErrorPattern?.metadata?.occurrences).toBe(2);

      const typeErrorPattern = patterns.find(p => p.name.includes('Type'));
      expect(typeErrorPattern?.metadata?.occurrences).toBe(1);
    });
  });

  describe('Pattern Confidence Scoring', () => {
    it('should assign higher confidence to frequently occurring patterns', async () => {
      const frequentFailures = Array.from({ length: 10 }, (_, i) => ({
        test: 'TypeError: Cannot read property "name" of undefined',
        error: 'TypeError: Cannot read property "name" of undefined',
        file: `src/file${i}.ts`,
        context: { timestamp: new Date() }
      }));

      const rareFailures = [
        {
          test: 'SyntaxError: Unexpected token',
          error: 'SyntaxError: Unexpected token "{"',
          file: 'src/rare.ts',
          context: { timestamp: new Date() }
        }
      ];

      const frequentPatterns = await analyzer.analyzeFailures(frequentFailures);
      const rarePatterns = await analyzer.analyzeFailures(rareFailures);

      expect(frequentPatterns[0].metadata?.confidence).toBeGreaterThan(
        rarePatterns[0].metadata?.confidence
      );
    });

    it('should consider code context quality in confidence scoring', async () => {
      const richContextFailure = [
        {
          test: 'TypeError',
          error: 'TypeError: Cannot read property "name" of undefined',
          file: 'src/user.ts',
          context: {
            timestamp: new Date(),
            code: 'function getUserName(user) {\n  return user.name;\n}',
            line: 2,
            column: 15,
            stackTrace: 'at getUserName (user.ts:2:15)'
          }
        }
      ];

      const poorContextFailure = [
        {
          test: 'TypeError',
          error: 'TypeError: Cannot read property "name" of undefined',
          file: 'src/unknown.ts',
          context: { timestamp: new Date() }
        }
      ];

      const richPatterns = await analyzer.analyzeFailures(richContextFailure);
      const poorPatterns = await analyzer.analyzeFailures(poorContextFailure);

      expect(richPatterns[0].metadata?.confidence).toBeGreaterThan(
        poorPatterns[0].metadata?.confidence
      );
    });
  });

  describe('Pattern Categories', () => {
    it('should categorize type-related errors correctly', async () => {
      const typeFailures: TestFailure[] = [
        {
          test: 'TypeError: undefined property',
          error: 'TypeError: Cannot read property "x" of undefined',
          file: 'src/test.ts',
          context: { timestamp: new Date() }
        }
      ];

      const patterns = await analyzer.analyzeFailures(typeFailures);
      expect(patterns[0].category).toBe('type-safety');
    });

    it('should categorize syntax errors correctly', async () => {
      const syntaxFailures: TestFailure[] = [
        {
          test: 'SyntaxError: missing bracket',
          error: 'SyntaxError: Unexpected end of input',
          file: 'src/test.ts',
          context: { timestamp: new Date() }
        }
      ];

      const patterns = await analyzer.analyzeFailures(syntaxFailures);
      expect(patterns[0].category).toBe('syntax');
    });

    it('should categorize logic errors correctly', async () => {
      const logicFailures: TestFailure[] = [
        {
          test: 'Expected result mismatch',
          error: 'Expected 5 but received 3',
          file: 'src/test.ts',
          context: { timestamp: new Date() }
        }
      ];

      const patterns = await analyzer.analyzeFailures(logicFailures);
      expect(patterns[0].category).toBe('logic');
    });
  });

  describe('Pattern Severity Assessment', () => {
    it('should assign error severity to runtime errors', async () => {
      const errorFailures: TestFailure[] = [
        {
          test: 'ReferenceError',
          error: 'ReferenceError: variable is not defined',
          file: 'src/test.ts',
          context: { timestamp: new Date() }
        }
      ];

      const patterns = await analyzer.analyzeFailures(errorFailures);
      expect(patterns[0].severity).toBe('error');
    });

    it('should assign warning severity to potential issues', async () => {
      const warningFailures: TestFailure[] = [
        {
          test: 'Deprecated API usage',
          error: 'Warning: Function xyz is deprecated',
          file: 'src/test.ts',
          context: { timestamp: new Date() }
        }
      ];

      const patterns = await analyzer.analyzeFailures(warningFailures);
      expect(patterns[0].severity).toBe('warning');
    });
  });

  describe('Auto-fix Suggestions', () => {
    it('should suggest auto-fixes for common patterns', async () => {
      const fixableFailures: TestFailure[] = [
        {
          test: 'Missing semicolon',
          error: 'SyntaxError: Missing semicolon',
          file: 'src/test.ts',
          context: {
            timestamp: new Date(),
            code: 'const x = 5\nconst y = 10',
            line: 1
          }
        }
      ];

      const patterns = await analyzer.analyzeFailures(fixableFailures);

      expect(patterns[0].autoFix?.enabled).toBe(true);
      expect(patterns[0].autoFix?.strategy).toBeDefined();
      expect(patterns[0].autoFix?.confidence).toBeGreaterThan(0.7);
    });

    it('should not suggest auto-fixes for complex patterns', async () => {
      const complexFailures: TestFailure[] = [
        {
          test: 'Complex logic error',
          error: 'Business logic validation failed',
          file: 'src/business.ts',
          context: { timestamp: new Date() }
        }
      ];

      const patterns = await analyzer.analyzeFailures(complexFailures);
      expect(patterns[0].autoFix?.enabled).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should handle large numbers of failures efficiently', async () => {
      const manyFailures = Array.from({ length: 1000 }, (_, i) => ({
        test: `Test ${i}`,
        error: `Error ${i % 10}`, // Create some repetition
        file: `src/file${i % 100}.ts`,
        context: { timestamp: new Date() }
      }));

      const startTime = Date.now();
      const patterns = await analyzer.analyzeFailures(manyFailures);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.length).toBeLessThan(50); // Should group similar patterns
    });

    it('should deduplicate identical patterns', async () => {
      const duplicateFailures = Array.from({ length: 5 }, () => ({
        test: 'Identical test',
        error: 'Identical error message',
        file: 'src/same.ts',
        context: { timestamp: new Date() }
      }));

      const patterns = await analyzer.analyzeFailures(duplicateFailures);

      expect(patterns).toHaveLength(1);
      expect(patterns[0].metadata?.occurrences).toBe(5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle failures with malformed error messages', async () => {
      const malformedFailures: TestFailure[] = [
        {
          test: '',
          error: '',
          file: '',
          context: { timestamp: new Date() }
        },
        {
          test: 'null',
          error: null as any,
          file: undefined as any,
          context: { timestamp: new Date() }
        }
      ];

      const patterns = await analyzer.analyzeFailures(malformedFailures);
      expect(patterns).toEqual([]);
    });

    it('should handle failures with very long error messages', async () => {
      const longError = 'Error: ' + 'x'.repeat(10000);
      const longFailures: TestFailure[] = [
        {
          test: 'Long error test',
          error: longError,
          file: 'src/test.ts',
          context: { timestamp: new Date() }
        }
      ];

      const patterns = await analyzer.analyzeFailures(longFailures);
      expect(patterns).toHaveLength(1);
      expect(patterns[0].message.length).toBeLessThan(500); // Should truncate
    });

    it('should handle failures with special characters in paths', async () => {
      const specialCharFailures: TestFailure[] = [
        {
          test: 'Special path test',
          error: 'File not found',
          file: 'src/тест файл.ts', // Cyrillic characters
          context: { timestamp: new Date() }
        },
        {
          test: 'Unicode test',
          error: 'Unicode error 🚫',
          file: 'src/émoji-file.ts',
          context: { timestamp: new Date() }
        }
      ];

      const patterns = await analyzer.analyzeFailures(specialCharFailures);
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].metadata?.context?.commonLocations).toBeDefined();
    });
  });
});