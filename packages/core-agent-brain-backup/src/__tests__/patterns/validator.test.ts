import { PatternValidator } from '../../patterns/validator';
import { Pattern } from '../../learning/types';

describe('PatternValidator', () => {
  let validator: PatternValidator;

  const validPattern: Pattern = {
    id: 'valid-pattern',
    name: 'Valid Test Pattern',
    description: 'A valid pattern for testing',
    category: 'code-quality',
    severity: 'warning',
    trigger: /test\s+pattern/i,
    message: 'This is a valid test pattern',
    metadata: {
      source: 'unit-test',
      confidence: 0.85,
      tags: ['test', 'validation'],
      created: new Date(),
      lastSeen: new Date(),
      occurrences: 1
    }
  };

  beforeEach(() => {
    validator = new PatternValidator();
  });

  describe('Basic Pattern Validation', () => {
    it('should validate a complete, well-formed pattern', async () => {
      const result = await validator.validatePattern(validPattern);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should reject pattern with missing required fields', async () => {
      const incompletePattern = {
        name: 'Incomplete Pattern',
        description: 'Missing required fields'
        // Missing: id, category, severity, trigger, message
      } as any;

      const result = await validator.validatePattern(incompletePattern);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'id', type: 'required' })
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'category', type: 'required' })
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'severity', type: 'required' })
      );
    });

    it('should reject pattern with null or undefined', async () => {
      const nullResult = await validator.validatePattern(null as any);
      const undefinedResult = await validator.validatePattern(undefined as any);

      expect(nullResult.isValid).toBe(false);
      expect(undefinedResult.isValid).toBe(false);
      expect(nullResult.errors[0].type).toBe('invalid');
      expect(undefinedResult.errors[0].type).toBe('invalid');
    });
  });

  describe('Field Type Validation', () => {
    it('should reject pattern with invalid id type', async () => {
      const invalidPattern = {
        ...validPattern,
        id: 123 // Should be string
      } as any;

      const result = await validator.validatePattern(invalidPattern);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'id', type: 'type' })
      );
    });

    it('should reject pattern with empty string id', async () => {
      const invalidPattern = {
        ...validPattern,
        id: ''
      };

      const result = await validator.validatePattern(invalidPattern);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'id', type: 'empty' })
      );
    });

    it('should reject pattern with invalid trigger type', async () => {
      const invalidPattern = {
        ...validPattern,
        trigger: 'string instead of regex'
      } as any;

      const result = await validator.validatePattern(invalidPattern);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'trigger', type: 'type' })
      );
    });

    it('should reject pattern with invalid severity', async () => {
      const invalidPattern = {
        ...validPattern,
        severity: 'invalid-severity'
      } as any;

      const result = await validator.validatePattern(invalidPattern);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'severity', type: 'enum' })
      );
    });

    it('should accept valid severity values', async () => {
      const validSeverities = ['error', 'warning', 'info'];

      for (const severity of validSeverities) {
        const pattern = { ...validPattern, severity } as any;
        const result = await validator.validatePattern(pattern);

        expect(result.isValid).toBe(true);
      }
    });
  });

  describe('Category Validation', () => {
    it('should accept valid category values', async () => {
      const validCategories = [
        'code-quality',
        'performance',
        'security',
        'type-safety',
        'async',
        'syntax',
        'logic',
        'best-practices'
      ];

      for (const category of validCategories) {
        const pattern = { ...validPattern, category };
        const result = await validator.validatePattern(pattern);

        expect(result.isValid).toBe(true);
      }
    });

    it('should warn about unknown categories', async () => {
      const unknownCategoryPattern = {
        ...validPattern,
        category: 'unknown-category'
      };

      const result = await validator.validatePattern(unknownCategoryPattern);

      expect(result.isValid).toBe(true); // Should still be valid
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ field: 'category', type: 'unknown' })
      );
    });
  });

  describe('Regex Validation', () => {
    it('should validate proper regex patterns', async () => {
      const regexPatterns = [
        /simple/,
        /case\s+insensitive/i,
        /global.*match/g,
        /multi.*flag/gim,
        /complex\w+pattern\d{1,3}/,
        /^start.*end$/
      ];

      for (const trigger of regexPatterns) {
        const pattern = { ...validPattern, trigger };
        const result = await validator.validatePattern(pattern);

        expect(result.isValid).toBe(true);
      }
    });

    it('should reject overly complex regex patterns', async () => {
      const complexPattern = {
        ...validPattern,
        trigger: /((((((((((a))))))))))/ // Too many nested groups
      };

      const result = await validator.validatePattern(complexPattern);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({ field: 'trigger', type: 'complexity' })
      );
    });

    it('should warn about potentially dangerous regex patterns', async () => {
      const dangerousPatterns = [
        /(a+)+/, // Catastrophic backtracking
        /(a|a)*/, // Redundant alternation
        /(.*).*/ // Nested quantifiers
      ];

      for (const trigger of dangerousPatterns) {
        const pattern = { ...validPattern, trigger };
        const result = await validator.validatePattern(pattern);

        expect(result.warnings).toContainEqual(
          expect.objectContaining({ field: 'trigger', type: 'dangerous' })
        );
      }
    });
  });

  describe('Metadata Validation', () => {
    it('should validate metadata structure', async () => {
      const validMetadata = {
        source: 'eslint',
        confidence: 0.95,
        tags: ['test', 'validation'],
        created: new Date(),
        lastSeen: new Date(),
        occurrences: 5,
        autoFix: {
          enabled: true,
          strategy: 'replace',
          confidence: 0.8
        }
      };

      const pattern = { ...validPattern, metadata: validMetadata };
      const result = await validator.validatePattern(pattern);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid confidence values', async () => {
      const invalidConfidences = [-0.1, 1.1, 'high', null];

      for (const confidence of invalidConfidences) {
        const pattern = {
          ...validPattern,
          metadata: { ...validPattern.metadata, confidence }
        } as any;

        const result = await validator.validatePattern(pattern);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({ field: 'metadata.confidence', type: 'range' })
        );
      }
    });

    it('should validate tags array', async () => {
      const invalidTagsPattern = {
        ...validPattern,
        metadata: {
          ...validPattern.metadata,
          tags: 'not-an-array'
        }
      } as any;

      const result = await validator.validatePattern(invalidTagsPattern);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'metadata.tags', type: 'type' })
      );
    });

    it('should validate autofix configuration', async () => {
      const invalidAutoFix = {
        enabled: 'yes', // Should be boolean
        strategy: 123, // Should be string
        confidence: 2.0 // Should be 0-1
      };

      const pattern = {
        ...validPattern,
        metadata: {
          ...validPattern.metadata,
          autoFix: invalidAutoFix
        }
      } as any;

      const result = await validator.validatePattern(pattern);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'metadata.autoFix.enabled', type: 'type' })
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'metadata.autoFix.strategy', type: 'type' })
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'metadata.autoFix.confidence', type: 'range' })
      );
    });
  });

  describe('Pattern Conflict Detection', () => {
    it('should detect identical patterns', async () => {
      const patterns = [validPattern, validPattern];

      const conflicts = await validator.detectConflicts(patterns);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('duplicate');
      expect(conflicts[0].patterns).toContain(validPattern.id);
    });

    it('should detect patterns with same trigger', async () => {
      const pattern1 = { ...validPattern, id: 'pattern-1' };
      const pattern2 = { ...validPattern, id: 'pattern-2', name: 'Different name' };

      const conflicts = await validator.detectConflicts([pattern1, pattern2]);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('trigger-overlap');
      expect(conflicts[0].patterns).toContain('pattern-1');
      expect(conflicts[0].patterns).toContain('pattern-2');
    });

    it('should detect patterns with overlapping triggers', async () => {
      const generalPattern: Pattern = {
        ...validPattern,
        id: 'general',
        trigger: /error/i
      };

      const specificPattern: Pattern = {
        ...validPattern,
        id: 'specific',
        trigger: /TypeError.*error/i
      };

      const conflicts = await validator.detectConflicts([generalPattern, specificPattern]);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('trigger-overlap');
    });

    it('should detect contradictory patterns', async () => {
      const pattern1: Pattern = {
        ...validPattern,
        id: 'pattern-1',
        message: 'Use async/await',
        trigger: /promise/i
      };

      const pattern2: Pattern = {
        ...validPattern,
        id: 'pattern-2',
        message: 'Avoid async/await',
        trigger: /promise/i
      };

      const conflicts = await validator.detectConflicts([pattern1, pattern2]);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('contradiction');
    });

    it('should handle empty pattern list', async () => {
      const conflicts = await validator.detectConflicts([]);
      expect(conflicts).toHaveLength(0);
    });
  });

  describe('Pattern Quality Assessment', () => {
    it('should assess pattern quality metrics', async () => {
      const quality = await validator.assessQuality(validPattern);

      expect(quality.score).toBeGreaterThan(0.7);
      expect(quality.criteria).toHaveProperty('completeness');
      expect(quality.criteria).toHaveProperty('specificity');
      expect(quality.criteria).toHaveProperty('usefulness');
      expect(quality.suggestions).toBeDefined();
    });

    it('should suggest improvements for low-quality patterns', async () => {
      const lowQualityPattern: Pattern = {
        id: 'low-quality',
        name: 'Bad',
        description: 'Bad pattern',
        category: 'general',
        severity: 'info',
        trigger: /.*/,  // Too generic
        message: 'Error'  // Too vague
      };

      const quality = await validator.assessQuality(lowQualityPattern);

      expect(quality.score).toBeLessThan(0.5);
      expect(quality.suggestions.length).toBeGreaterThan(0);
      expect(quality.suggestions).toContainEqual(
        expect.objectContaining({ type: 'specificity' })
      );
    });

    it('should reward patterns with good metadata', async () => {
      const richMetadataPattern: Pattern = {
        ...validPattern,
        metadata: {
          ...validPattern.metadata!,
          confidence: 0.95,
          tags: ['well-tagged', 'comprehensive'],
          occurrences: 100,
          context: {
            commonLocations: ['src/utils', 'src/components'],
            codeExamples: ['example1', 'example2']
          }
        }
      };

      const basicPattern: Pattern = {
        ...validPattern,
        metadata: undefined
      };

      const richQuality = await validator.assessQuality(richMetadataPattern);
      const basicQuality = await validator.assessQuality(basicPattern);

      expect(richQuality.score).toBeGreaterThan(basicQuality.score);
    });
  });

  describe('Validation Performance', () => {
    it('should validate large numbers of patterns efficiently', async () => {
      const manyPatterns = Array.from({ length: 1000 }, (_, i) => ({
        ...validPattern,
        id: `pattern-${i}`,
        name: `Pattern ${i}`,
        trigger: new RegExp(`pattern${i}`, 'i')
      }));

      const startTime = Date.now();
      for (const pattern of manyPatterns) {
        await validator.validatePattern(pattern);
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should detect conflicts efficiently for many patterns', async () => {
      const manyPatterns = Array.from({ length: 100 }, (_, i) => ({
        ...validPattern,
        id: `pattern-${i}`,
        trigger: new RegExp(`error${i}`, 'i')
      }));

      const startTime = Date.now();
      const conflicts = await validator.detectConflicts(manyPatterns);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
      expect(Array.isArray(conflicts)).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle patterns with circular references', async () => {
      const circularPattern: any = { ...validPattern };
      circularPattern.self = circularPattern;

      const result = await validator.validatePattern(circularPattern);

      expect(result.isValid).toBe(true); // Should handle gracefully
    });

    it('should handle very long pattern names and descriptions', async () => {
      const longPattern = {
        ...validPattern,
        name: 'x'.repeat(10000),
        description: 'y'.repeat(10000)
      };

      const result = await validator.validatePattern(longPattern);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({ field: 'name', type: 'length' })
      );
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ field: 'description', type: 'length' })
      );
    });

    it('should handle patterns with special unicode characters', async () => {
      const unicodePattern = {
        ...validPattern,
        name: 'Pattern with émojis 🚀',
        description: 'Тест pattern with unicode',
        trigger: /emoji.*🚀/
      };

      const result = await validator.validatePattern(unicodePattern);

      expect(result.isValid).toBe(true);
    });

    it('should handle malformed regex in conflict detection', async () => {
      const validPatternObj = { ...validPattern };
      const malformedPattern = {
        ...validPattern,
        id: 'malformed',
        trigger: '[invalid regex' as any
      };

      const conflicts = await validator.detectConflicts([validPatternObj, malformedPattern]);

      expect(Array.isArray(conflicts)).toBe(true);
      // Should not crash and return whatever conflicts it can detect
    });
  });

  describe('Custom Validation Rules', () => {
    it('should support custom validation rules', async () => {
      const customRule = {
        name: 'custom-rule',
        validate: (pattern: Pattern) => {
          if (pattern.name.includes('forbidden')) {
            return {
              isValid: false,
              error: { field: 'name', type: 'custom', message: 'Forbidden word in name' }
            };
          }
          return { isValid: true };
        }
      };

      validator.addCustomRule(customRule);

      const forbiddenPattern = {
        ...validPattern,
        name: 'forbidden pattern name'
      };

      const result = await validator.validatePattern(forbiddenPattern);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ type: 'custom', message: 'Forbidden word in name' })
      );
    });

    it('should handle errors in custom validation rules', async () => {
      const faultyRule = {
        name: 'faulty-rule',
        validate: () => {
          throw new Error('Custom rule error');
        }
      };

      validator.addCustomRule(faultyRule);

      const result = await validator.validatePattern(validPattern);

      // Should not crash and should still return validation result
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
    });
  });
});