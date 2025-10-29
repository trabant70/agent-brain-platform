/**
 * Streaming File Processor
 *
 * Processes files one-at-a-time in streaming fashion:
 * 1. Read file content
 * 2. Parse AST
 * 3. Extract metadata
 * 4. Discard AST (GC eligible)
 * 5. Yield to event loop every N files
 * 6. Report progress
 *
 * Memory usage: O(1) per file, not O(n) total
 * Enables full analysis of 10,000+ files without memory issues
 */

import * as ts from 'typescript';
import type { SourceFile, SourceLanguage } from '../types';
import { UnifiedMetadataRegistry } from '../registries/UnifiedMetadataRegistry';
import { UnifiedMetadataExtractor } from './UnifiedMetadataExtractor';
import { ProgressEventEmitter, type ProgressEvent } from './ProgressEventEmitter';

export interface StreamingOptions {
  /**
   * Number of files to process before yielding to event loop
   * Default: 50
   */
  batchSize?: number;

  /**
   * Whether to emit progress events
   * Default: true
   */
  enableProgress?: boolean;

  /**
   * Progress callback
   */
  onProgress?: (event: ProgressEvent) => void;

  /**
   * Error callback
   */
  onError?: (error: Error, filePath: string) => void;
}

/**
 * Streaming processor - processes files sequentially with yielding
 */
export class StreamingFileProcessor {
  private extractor: UnifiedMetadataExtractor;
  private registry: UnifiedMetadataRegistry;
  private progressEmitter: ProgressEventEmitter;
  private options: Required<StreamingOptions>;

  constructor(
    registry: UnifiedMetadataRegistry,
    options: StreamingOptions = {}
  ) {
    this.registry = registry;
    this.extractor = new UnifiedMetadataExtractor();
    this.progressEmitter = new ProgressEventEmitter();

    // Default options
    this.options = {
      batchSize: options.batchSize || 50,
      enableProgress: options.enableProgress !== false,
      onProgress: options.onProgress || (() => {}),
      onError: options.onError || ((error, filePath) => {
        console.error(`[StreamingFileProcessor] Error processing ${filePath}:`, error);
      })
    };

    // Subscribe to progress events
    if (this.options.enableProgress) {
      this.progressEmitter.on(this.options.onProgress);
    }
  }

  /**
   * Process files in streaming fashion
   * Only one file's AST in memory at a time
   */
  async processFiles(
    files: Array<{ path: string; content: string }>
  ): Promise<void> {
    console.log(`[StreamingFileProcessor] Starting streaming processing of ${files.length} files`);
    console.log(`[StreamingFileProcessor] Batch size: ${this.options.batchSize}, Progress: ${this.options.enableProgress}`);

    const startTime = Date.now();

    // Emit scanning complete event
    this.progressEmitter.emitScanningComplete(files.length);

    let processedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        // Parse file (creates AST in memory)
        const sourceFile = this.parseFile(file.path, file.content);

        // Extract metadata (populates registries)
        this.extractor.extract(sourceFile, this.registry);

        // AST is now eligible for garbage collection!
        // We don't keep a reference to it anywhere

        processedCount++;
      } catch (error) {
        errorCount++;
        this.options.onError(error as Error, file.path);
      }

      // Yield to event loop every N files to keep UI responsive
      if ((i + 1) % this.options.batchSize === 0) {
        const memUsage = this.registry.getGlobalMemoryUsage();

        // Emit progress event
        this.progressEmitter.emitExtractingProgress(
          i + 1,
          files.length,
          file.path,
          memUsage.totals.totalKB
        );

        // Yield to event loop
        await this.yield();

        // Log progress
        console.log(
          `[StreamingFileProcessor] Progress: ${i + 1}/${files.length} files, ` +
          `${memUsage.totals.totalKB}KB in registries, ` +
          `${errorCount} errors`
        );
      }
    }

    // Final progress event
    const duration = Date.now() - startTime;
    const memUsage = this.registry.getGlobalMemoryUsage();

    this.progressEmitter.emitExtractionComplete(
      files.length,
      duration,
      memUsage.totals.totalKB
    );

    console.log(`[StreamingFileProcessor] ✓ Streaming complete:`);
    console.log(`  - Files processed: ${processedCount}`);
    console.log(`  - Errors: ${errorCount}`);
    console.log(`  - Duration: ${duration}ms`);
    console.log(`  - Registry size: ${memUsage.totals.totalKB}KB (${memUsage.totals.totalMB}MB)`);
    console.log(`  - Memory savings: ${memUsage.totals.estimatedVsAST.savingsPercent}%`);
    console.log(`  - AST cache would be: ~${memUsage.totals.estimatedVsAST.estimatedASTMB}MB`);
  }

  /**
   * Parse a single file
   * AST is created but NOT cached
   */
  private parseFile(filePath: string, content: string): SourceFile {
    const language = this.detectLanguage(filePath);
    const lines = content.split('\n').length;
    const size = Buffer.byteLength(content, 'utf8');

    let ast: ts.SourceFile | undefined;

    // Only parse code files (TypeScript/JavaScript)
    if (this.isCodeFile(language)) {
      try {
        ast = ts.createSourceFile(
          filePath,
          content,
          ts.ScriptTarget.Latest,
          true // setParentNodes for traversal
        );
      } catch (error) {
        console.warn(`[StreamingFileProcessor] Failed to parse ${filePath}:`, error);
        // Continue without AST
      }
    }

    // Return SourceFile - AST will be GC'd after extraction
    return {
      path: filePath,
      content,
      language,
      ast,
      size,
      lines
    };
  }

  /**
   * Detect language from file path
   */
  private detectLanguage(filePath: string): SourceLanguage {
    const ext = filePath.match(/\.[^.]+$/)?.[0] || '';

    switch (ext) {
      case '.ts': return 'typescript';
      case '.tsx': return 'tsx';
      case '.js': return 'javascript';
      case '.jsx': return 'jsx';
      case '.css': return 'css';
      case '.scss': return 'css';
      case '.less': return 'css';
      case '.html': return 'html';
      case '.json': return 'json';
      default: return 'typescript'; // Default fallback
    }
  }

  /**
   * Check if language requires AST parsing
   */
  private isCodeFile(language: SourceLanguage): boolean {
    return ['typescript', 'tsx', 'javascript', 'jsx'].includes(language);
  }

  /**
   * Yield to event loop
   * This prevents UI freezing
   */
  private yield(): Promise<void> {
    return new Promise(resolve => setImmediate(resolve));
  }

  /**
   * Get current registry
   */
  getRegistry(): UnifiedMetadataRegistry {
    return this.registry;
  }

  /**
   * Get progress emitter for external subscription
   */
  getProgressEmitter(): ProgressEventEmitter {
    return this.progressEmitter;
  }

  /**
   * Estimate processing time
   */
  estimateProcessingTime(fileCount: number): {
    minSeconds: number;
    maxSeconds: number;
    avgSeconds: number;
  } {
    // Rough estimates:
    // - Simple files: 5ms per file
    // - Complex files: 20ms per file
    // - Average: 10ms per file
    // - Yielding overhead: 1ms every batch

    const minMs = fileCount * 5;
    const maxMs = fileCount * 20;
    const avgMs = fileCount * 10;
    const yieldOverhead = Math.ceil(fileCount / this.options.batchSize);

    return {
      minSeconds: Math.round((minMs + yieldOverhead) / 1000),
      maxSeconds: Math.round((maxMs + yieldOverhead) / 1000),
      avgSeconds: Math.round((avgMs + yieldOverhead) / 1000)
    };
  }

  /**
   * Get processing statistics
   */
  getStatistics() {
    const memUsage = this.registry.getGlobalMemoryUsage();
    const counts = this.registry.getGlobalCounts();
    const stats = this.registry.getGlobalStats();

    return {
      memory: memUsage,
      counts,
      stats,
      efficiency: {
        memorySavingsPercent: memUsage.totals.estimatedVsAST.savingsPercent,
        registrySizeKB: memUsage.totals.totalKB,
        estimatedASTSizeMB: memUsage.totals.estimatedVsAST.estimatedASTMB
      }
    };
  }

  /**
   * Clear all registries
   */
  clear(): void {
    this.registry.clearAll();
  }
}
