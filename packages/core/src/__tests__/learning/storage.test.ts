import { LearningStorage, MemoryLearningStorage, FileLearningStorage } from '../../learning/storage';
import { LearningPattern, TestFailure } from '../../learning/analyzer';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs for FilePatternStorage tests
jest.mock('fs');

describe('Pattern Storage', () => {
  const mockPattern: LearningPattern = {
    id: 'test-pattern-1',
    name: 'Test Pattern',
    description: 'A test pattern for unit testing',
    category: 'code-quality',
    rootCause: {
      type: 'test-pattern',
      pattern: /test\s+pattern/i
    },
    preventionRule: {
      check: 'code-quality',
      message: 'This is a test pattern'
    },
    service: 'unit-test',
    confidenceScore: 0.85,
    occurrences: 3
  };

  const mockPattern2: LearningPattern = {
    id: 'test-pattern-2',
    name: 'Another Test Pattern',
    description: 'Another test pattern',
    category: 'performance',
    severity: 'error',
    trigger: /performance\s+issue/i,
    message: 'Performance issue detected',
    metadata: {
      source: 'unit-test',
      confidence: 0.92,
      tags: ['performance'],
      created: new Date('2024-01-02'),
      lastSeen: new Date('2024-01-16'),
      occurrences: 5
    }
  };

  describe('MemoryPatternStorage', () => {
    let storage: MemoryPatternStorage;

    beforeEach(() => {
      storage = new MemoryPatternStorage();
    });

    describe('Basic Operations', () => {
      it('should store and retrieve patterns', async () => {
        await storage.storePattern(mockPattern);
        const retrieved = await storage.getPattern(mockPattern.id);

        expect(retrieved).toEqual(mockPattern);
      });

      it('should return undefined for non-existent patterns', async () => {
        const retrieved = await storage.getPattern('non-existent');
        expect(retrieved).toBeUndefined();
      });

      it('should list all stored patterns', async () => {
        await storage.storePattern(mockPattern);
        await storage.storePattern(mockPattern2);

        const patterns = await storage.listPatterns();

        expect(patterns).toHaveLength(2);
        expect(patterns).toContainEqual(mockPattern);
        expect(patterns).toContainEqual(mockPattern2);
      });

      it('should update existing patterns', async () => {
        await storage.storePattern(mockPattern);

        const updatedPattern = {
          ...mockPattern,
          name: 'Updated Test Pattern',
          metadata: {
            ...mockPattern.metadata!,
            confidence: 0.95
          }
        };

        await storage.storePattern(updatedPattern);
        const retrieved = await storage.getPattern(mockPattern.id);

        expect(retrieved?.name).toBe('Updated Test Pattern');
        expect(retrieved?.metadata?.confidence).toBe(0.95);
      });

      it('should delete patterns', async () => {
        await storage.storePattern(mockPattern);
        await storage.deletePattern(mockPattern.id);

        const retrieved = await storage.getPattern(mockPattern.id);
        expect(retrieved).toBeUndefined();

        const patterns = await storage.listPatterns();
        expect(patterns).toHaveLength(0);
      });
    });

    describe('Search and Filtering', () => {
      beforeEach(async () => {
        await storage.storePattern(mockPattern);
        await storage.storePattern(mockPattern2);
      });

      it('should search patterns by category', async () => {
        const codeQualityPatterns = await storage.searchPatterns({ category: 'code-quality' });
        expect(codeQualityPatterns).toHaveLength(1);
        expect(codeQualityPatterns[0].id).toBe(mockPattern.id);

        const performancePatterns = await storage.searchPatterns({ category: 'performance' });
        expect(performancePatterns).toHaveLength(1);
        expect(performancePatterns[0].id).toBe(mockPattern2.id);
      });

      it('should search patterns by severity', async () => {
        const warningPatterns = await storage.searchPatterns({ severity: 'warning' });
        expect(warningPatterns).toHaveLength(1);
        expect(warningPatterns[0].id).toBe(mockPattern.id);

        const errorPatterns = await storage.searchPatterns({ severity: 'error' });
        expect(errorPatterns).toHaveLength(1);
        expect(errorPatterns[0].id).toBe(mockPattern2.id);
      });

      it('should search patterns by tags', async () => {
        const testPatterns = await storage.searchPatterns({ tags: ['test'] });
        expect(testPatterns).toHaveLength(1);
        expect(testPatterns[0].id).toBe(mockPattern.id);

        const performancePatterns = await storage.searchPatterns({ tags: ['performance'] });
        expect(performancePatterns).toHaveLength(1);
        expect(performancePatterns[0].id).toBe(mockPattern2.id);
      });

      it('should combine multiple search criteria', async () => {
        const specificPatterns = await storage.searchPatterns({
          category: 'code-quality',
          severity: 'warning',
          tags: ['test']
        });

        expect(specificPatterns).toHaveLength(1);
        expect(specificPatterns[0].id).toBe(mockPattern.id);
      });

      it('should return empty array when no patterns match', async () => {
        const noMatches = await storage.searchPatterns({ category: 'non-existent' });
        expect(noMatches).toHaveLength(0);
      });
    });

    describe('Pattern Metrics', () => {
      beforeEach(async () => {
        await storage.storePattern(mockPattern);
        await storage.storePattern(mockPattern2);
      });

      it('should calculate storage metrics', async () => {
        const metrics = await storage.getMetrics();

        expect(metrics.totalPatterns).toBe(2);
        expect(metrics.totalOccurrences).toBe(8); // 3 + 5
        expect(metrics.avgConfidenceScore).toBeCloseTo(0.885); // (0.85 + 0.92) / 2

        expect(metrics.topCategories).toHaveLength(2);
        const categories = metrics.topCategories.map(c => c.category);
        expect(categories).toContain('code-quality');
        expect(categories).toContain('performance');
      });

      it('should include recent patterns in metrics', async () => {
        const metrics = await storage.getMetrics();

        expect(metrics.recentPatterns).toHaveLength(2);
        expect(metrics.recentPatterns[0].id).toBe(mockPattern2.id); // More recent lastSeen
        expect(metrics.recentPatterns[1].id).toBe(mockPattern.id);
      });
    });

    describe('Data Export/Import', () => {
      beforeEach(async () => {
        await storage.storePattern(mockPattern);
        await storage.storePattern(mockPattern2);
      });

      it('should export patterns to JSON', async () => {
        const exported = await storage.exportPatterns();
        const parsed = JSON.parse(exported);

        expect(parsed).toHaveProperty('version');
        expect(parsed).toHaveProperty('timestamp');
        expect(parsed).toHaveProperty('patterns');
        expect(parsed.patterns).toHaveLength(2);
      });

      it('should import patterns from JSON', async () => {
        const exportData = {
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          patterns: [mockPattern]
        };

        const newStorage = new MemoryPatternStorage();
        await newStorage.importPatterns(JSON.stringify(exportData));

        const patterns = await newStorage.listPatterns();
        expect(patterns).toHaveLength(1);
        expect(patterns[0].id).toBe(mockPattern.id);
      });

      it('should handle malformed import data', async () => {
        await expect(storage.importPatterns('invalid json')).rejects.toThrow();
      });

      it('should handle import data with missing fields', async () => {
        const invalidData = {
          patterns: [{ id: 'incomplete' }] // Missing required fields
        };

        await expect(storage.importPatterns(JSON.stringify(invalidData))).resolves.not.toThrow();
        // Should skip invalid patterns gracefully
      });
    });

    describe('Edge Cases', () => {
      it('should handle storing pattern without metadata', async () => {
        const patternWithoutMetadata: Pattern = {
          id: 'no-metadata',
          name: 'Pattern without metadata',
          description: 'Test pattern',
          category: 'test',
          severity: 'info',
          trigger: /test/,
          message: 'Test message'
        };

        await storage.storePattern(patternWithoutMetadata);
        const retrieved = await storage.getPattern('no-metadata');

        expect(retrieved).toEqual(patternWithoutMetadata);
      });

      it('should handle very large numbers of patterns', async () => {
        const largeNumberOfPatterns = Array.from({ length: 1000 }, (_, i) => ({
          ...mockPattern,
          id: `pattern-${i}`,
          name: `Pattern ${i}`
        }));

        for (const pattern of largeNumberOfPatterns) {
          await storage.storePattern(pattern);
        }

        const patterns = await storage.listPatterns();
        expect(patterns).toHaveLength(1000);

        const metrics = await storage.getMetrics();
        expect(metrics.totalPatterns).toBe(1000);
      });
    });
  });

  describe('FilePatternStorage', () => {
    let storage: FilePatternStorage;
    let mockFs: jest.Mocked<typeof fs>;
    const testStoragePath = '/test/storage/path';

    beforeEach(() => {
      mockFs = fs as jest.Mocked<typeof fs>;
      jest.clearAllMocks();

      storage = new FilePatternStorage(testStoragePath);

      // Default mocks
      mockFs.existsSync.mockReturnValue(true);
      mockFs.mkdirSync.mockImplementation(() => '');
      mockFs.readFileSync.mockReturnValue('{"patterns":[]}');
      mockFs.writeFileSync.mockImplementation(() => {});
    });

    describe('Initialization', () => {
      it('should create storage directory if it does not exist', () => {
        mockFs.existsSync.mockReturnValue(false);

        new FilePatternStorage(testStoragePath);

        expect(mockFs.mkdirSync).toHaveBeenCalledWith(testStoragePath, { recursive: true });
      });

      it('should not create directory if it already exists', () => {
        mockFs.existsSync.mockReturnValue(true);

        new FilePatternStorage(testStoragePath);

        expect(mockFs.mkdirSync).not.toHaveBeenCalled();
      });
    });

    describe('File Operations', () => {
      it('should store pattern to file', async () => {
        await storage.storePattern(mockPattern);

        expect(mockFs.writeFileSync).toHaveBeenCalledWith(
          path.join(testStoragePath, 'patterns.json'),
          expect.stringContaining(mockPattern.id),
          'utf-8'
        );
      });

      it('should load patterns from file', async () => {
        const patternsData = {
          patterns: [mockPattern, mockPattern2]
        };
        mockFs.readFileSync.mockReturnValue(JSON.stringify(patternsData));

        const patterns = await storage.listPatterns();

        expect(patterns).toHaveLength(2);
        expect(patterns).toContainEqual(expect.objectContaining({ id: mockPattern.id }));
        expect(patterns).toContainEqual(expect.objectContaining({ id: mockPattern2.id }));
      });

      it('should handle missing patterns file gracefully', async () => {
        mockFs.readFileSync.mockImplementation(() => {
          throw new Error('ENOENT: no such file');
        });

        const patterns = await storage.listPatterns();
        expect(patterns).toEqual([]);
      });

      it('should handle corrupted patterns file', async () => {
        mockFs.readFileSync.mockReturnValue('invalid json content');

        const patterns = await storage.listPatterns();
        expect(patterns).toEqual([]);
      });
    });

    describe('Data Persistence', () => {
      it('should persist patterns across storage instances', async () => {
        const patternsData = {
          patterns: [mockPattern]
        };
        mockFs.readFileSync.mockReturnValue(JSON.stringify(patternsData));

        const storage1 = new FilePatternStorage(testStoragePath);
        const storage2 = new FilePatternStorage(testStoragePath);

        const patterns1 = await storage1.listPatterns();
        const patterns2 = await storage2.listPatterns();

        expect(patterns1).toEqual(patterns2);
        expect(patterns1).toHaveLength(1);
      });

      it('should handle concurrent access safely', async () => {
        const storage1 = new FilePatternStorage(testStoragePath);
        const storage2 = new FilePatternStorage(testStoragePath);

        // Simulate concurrent writes
        await Promise.all([
          storage1.storePattern(mockPattern),
          storage2.storePattern(mockPattern2)
        ]);

        expect(mockFs.writeFileSync).toHaveBeenCalledTimes(2);
      });
    });

    describe('File System Error Handling', () => {
      it('should handle file write errors', async () => {
        mockFs.writeFileSync.mockImplementation(() => {
          throw new Error('Permission denied');
        });

        await expect(storage.storePattern(mockPattern)).rejects.toThrow('Permission denied');
      });

      it('should handle file read errors', async () => {
        mockFs.readFileSync.mockImplementation(() => {
          throw new Error('Permission denied');
        });

        const patterns = await storage.listPatterns();
        expect(patterns).toEqual([]);
      });

      it('should handle directory creation errors', () => {
        mockFs.existsSync.mockReturnValue(false);
        mockFs.mkdirSync.mockImplementation(() => {
          throw new Error('Permission denied');
        });

        expect(() => new FilePatternStorage(testStoragePath)).toThrow('Permission denied');
      });
    });

    describe('Backup and Recovery', () => {
      it('should create backup before major operations', async () => {
        const existingData = { patterns: [mockPattern] };
        mockFs.readFileSync.mockReturnValue(JSON.stringify(existingData));

        await storage.storePattern(mockPattern2);

        // Should read existing data first (for backup)
        expect(mockFs.readFileSync).toHaveBeenCalled();
        // Then write new data
        expect(mockFs.writeFileSync).toHaveBeenCalled();
      });

      it('should maintain data integrity during import', async () => {
        const importData = {
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          patterns: [mockPattern, mockPattern2]
        };

        await storage.importPatterns(JSON.stringify(importData));

        expect(mockFs.writeFileSync).toHaveBeenCalledWith(
          path.join(testStoragePath, 'patterns.json'),
          expect.stringContaining(mockPattern.id),
          'utf-8'
        );
      });
    });

    describe('Pattern Serialization', () => {
      it('should properly serialize and deserialize RegExp patterns', async () => {
        const patternWithRegex: Pattern = {
          ...mockPattern,
          trigger: /complex\s+regex.*pattern$/gi
        };

        await storage.storePattern(patternWithRegex);

        // Verify the written data contains serialized regex
        const writeCall = mockFs.writeFileSync.mock.calls[0];
        const writtenData = writeCall[1] as string;
        expect(writtenData).toContain('__regex__');
      });

      it('should handle patterns with Date objects', async () => {
        const patternWithDates: Pattern = {
          ...mockPattern,
          metadata: {
            ...mockPattern.metadata!,
            created: new Date('2024-01-01T10:00:00Z'),
            lastSeen: new Date('2024-01-15T15:30:00Z')
          }
        };

        mockFs.readFileSync.mockReturnValue(JSON.stringify({
          patterns: [patternWithDates]
        }));

        const patterns = await storage.listPatterns();
        expect(patterns[0].metadata?.created).toBeInstanceOf(Date);
        expect(patterns[0].metadata?.lastSeen).toBeInstanceOf(Date);
      });
    });
  });

  describe('Storage Interface Compliance', () => {
    const storageImplementations = [
      () => new MemoryPatternStorage(),
      () => {
        const mockFs = fs as jest.Mocked<typeof fs>;
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue('{"patterns":[]}');
        mockFs.writeFileSync.mockImplementation(() => {});
        return new FilePatternStorage('/test/path');
      }
    ];

    storageImplementations.forEach((createStorage, index) => {
      const storageType = index === 0 ? 'Memory' : 'File';

      describe(`${storageType} Storage Interface Compliance`, () => {
        let storage: PatternStorage;

        beforeEach(() => {
          storage = createStorage();
        });

        it('should implement all required methods', () => {
          expect(storage.storePattern).toBeDefined();
          expect(storage.getPattern).toBeDefined();
          expect(storage.listPatterns).toBeDefined();
          expect(storage.deletePattern).toBeDefined();
          expect(storage.searchPatterns).toBeDefined();
          expect(storage.getMetrics).toBeDefined();
          expect(storage.exportPatterns).toBeDefined();
          expect(storage.importPatterns).toBeDefined();
        });

        it('should maintain consistent behavior across implementations', async () => {
          await storage.storePattern(mockPattern);
          const retrieved = await storage.getPattern(mockPattern.id);
          expect(retrieved?.id).toBe(mockPattern.id);

          const patterns = await storage.listPatterns();
          expect(patterns).toHaveLength(1);

          await storage.deletePattern(mockPattern.id);
          const deletedPattern = await storage.getPattern(mockPattern.id);
          expect(deletedPattern).toBeUndefined();
        });
      });
    });
  });
});