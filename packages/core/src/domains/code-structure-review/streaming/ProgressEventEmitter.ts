/**
 * Progress Event Emitter
 *
 * Emits progress events during streaming analysis:
 * - Scanning files
 * - Extracting metadata
 * - Analyzing (running analyzers)
 * - Aggregating results
 * - Complete
 *
 * Events are consumed by UI to show real-time progress
 */

export type ProgressPhase =
  | 'scanning'
  | 'extracting'
  | 'analyzing'
  | 'aggregating'
  | 'complete'
  | 'error';

export interface ProgressEvent {
  phase: ProgressPhase;
  current: number;
  total: number;
  percentage: number;
  message: string;
  details?: {
    filesProcessed?: number;
    registrySize?: number;      // KB
    currentFile?: string;
    currentAnalyzer?: string;
    duration?: number;          // ms
    errorMessage?: string;
  };
  timestamp: number;
}

type ProgressListener = (event: ProgressEvent) => void;

/**
 * Event emitter for analysis progress
 */
export class ProgressEventEmitter {
  private listeners: ProgressListener[] = [];
  private currentPhase: ProgressPhase = 'scanning';
  private startTime: number = 0;

  /**
   * Subscribe to progress events
   */
  on(listener: ProgressListener): void {
    this.listeners.push(listener);
  }

  /**
   * Unsubscribe from progress events
   */
  off(listener: ProgressListener): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Emit progress event to all listeners
   */
  private emit(event: ProgressEvent): void {
    console.log(`[ProgressEventEmitter] ${event.phase}: ${event.percentage}% - ${event.message}`);

    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[ProgressEventEmitter] Error in listener:', error);
      }
    });
  }

  /**
   * Create base progress event
   */
  private createEvent(
    phase: ProgressPhase,
    current: number,
    total: number,
    message: string,
    details?: ProgressEvent['details']
  ): ProgressEvent {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

    return {
      phase,
      current,
      total,
      percentage,
      message,
      details,
      timestamp: Date.now()
    };
  }

  // ==================== Phase-Specific Events ====================

  /**
   * Start scanning files
   */
  emitScanningStart(totalFiles: number): void {
    this.currentPhase = 'scanning';
    this.startTime = Date.now();

    this.emit(
      this.createEvent(
        'scanning',
        0,
        totalFiles,
        'Scanning files...',
        { filesProcessed: 0 }
      )
    );
  }

  /**
   * Scanning progress
   */
  emitScanningProgress(current: number, total: number, currentFile?: string): void {
    this.emit(
      this.createEvent(
        'scanning',
        current,
        total,
        `Scanning files... (${current}/${total})`,
        {
          filesProcessed: current,
          currentFile
        }
      )
    );
  }

  /**
   * Scanning complete
   */
  emitScanningComplete(totalFiles: number): void {
    this.emit(
      this.createEvent(
        'scanning',
        totalFiles,
        totalFiles,
        `Found ${totalFiles} files`,
        {
          filesProcessed: totalFiles,
          duration: Date.now() - this.startTime
        }
      )
    );
  }

  /**
   * Start extracting metadata
   */
  emitExtractingStart(totalFiles: number): void {
    this.currentPhase = 'extracting';

    this.emit(
      this.createEvent(
        'extracting',
        0,
        totalFiles,
        'Extracting metadata...',
        { filesProcessed: 0, registrySize: 0 }
      )
    );
  }

  /**
   * Extracting progress
   */
  emitExtractingProgress(
    current: number,
    total: number,
    currentFile?: string,
    registrySize?: number
  ): void {
    this.emit(
      this.createEvent(
        'extracting',
        current,
        total,
        `Extracting metadata... (${current}/${total})`,
        {
          filesProcessed: current,
          currentFile,
          registrySize
        }
      )
    );
  }

  /**
   * Extraction complete
   */
  emitExtractionComplete(
    totalFiles: number,
    duration: number,
    registrySize: number
  ): void {
    this.emit(
      this.createEvent(
        'extracting',
        totalFiles,
        totalFiles,
        `Metadata extracted from ${totalFiles} files`,
        {
          filesProcessed: totalFiles,
          registrySize,
          duration
        }
      )
    );
  }

  /**
   * Start analyzing
   */
  emitAnalyzingStart(totalAnalyzers: number): void {
    this.currentPhase = 'analyzing';

    this.emit(
      this.createEvent(
        'analyzing',
        0,
        totalAnalyzers,
        'Running analyzers...',
        { currentAnalyzer: '' }
      )
    );
  }

  /**
   * Analyzing progress
   */
  emitAnalyzingProgress(
    current: number,
    total: number,
    currentAnalyzer: string
  ): void {
    this.emit(
      this.createEvent(
        'analyzing',
        current,
        total,
        `Running analyzer: ${currentAnalyzer}`,
        {
          currentAnalyzer
        }
      )
    );
  }

  /**
   * Analyzer complete
   */
  emitAnalyzerComplete(
    current: number,
    total: number,
    analyzerName: string,
    duration: number
  ): void {
    this.emit(
      this.createEvent(
        'analyzing',
        current,
        total,
        `Completed: ${analyzerName}`,
        {
          currentAnalyzer: analyzerName,
          duration
        }
      )
    );
  }

  /**
   * Analyzing complete
   */
  emitAnalyzingComplete(totalAnalyzers: number, duration: number): void {
    this.emit(
      this.createEvent(
        'analyzing',
        totalAnalyzers,
        totalAnalyzers,
        `Analysis complete`,
        {
          duration
        }
      )
    );
  }

  /**
   * Start aggregating results
   */
  emitAggregatingStart(): void {
    this.currentPhase = 'aggregating';

    this.emit(
      this.createEvent(
        'aggregating',
        0,
        1,
        'Aggregating results...'
      )
    );
  }

  /**
   * Aggregating complete
   */
  emitAggregatingComplete(): void {
    this.emit(
      this.createEvent(
        'aggregating',
        1,
        1,
        'Results aggregated'
      )
    );
  }

  /**
   * Everything complete
   */
  emitComplete(totalDuration: number, issueCount: number, score: number): void {
    this.currentPhase = 'complete';

    this.emit(
      this.createEvent(
        'complete',
        1,
        1,
        `Analysis complete: ${issueCount} issues found (score: ${score}/100)`,
        {
          duration: totalDuration
        }
      )
    );
  }

  /**
   * Error occurred
   */
  emitError(errorMessage: string, phase?: ProgressPhase): void {
    this.emit(
      this.createEvent(
        'error',
        0,
        0,
        `Error: ${errorMessage}`,
        {
          errorMessage
        }
      )
    );
  }

  // ==================== Utility Methods ====================

  /**
   * Get current phase
   */
  getCurrentPhase(): ProgressPhase {
    return this.currentPhase;
  }

  /**
   * Get elapsed time
   */
  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Reset emitter
   */
  reset(): void {
    this.currentPhase = 'scanning';
    this.startTime = Date.now();
  }

  /**
   * Clear all listeners
   */
  clearListeners(): void {
    this.listeners = [];
  }

  /**
   * Get listener count
   */
  getListenerCount(): number {
    return this.listeners.length;
  }
}

/**
 * Format progress event for display
 */
export function formatProgressEvent(event: ProgressEvent): string {
  const phase = event.phase.toUpperCase().padEnd(12);
  const percent = `${event.percentage}%`.padStart(4);
  const current = `${event.current}/${event.total}`.padStart(10);

  let details = '';
  if (event.details) {
    if (event.details.currentFile) {
      details = ` | ${event.details.currentFile}`;
    } else if (event.details.currentAnalyzer) {
      details = ` | ${event.details.currentAnalyzer}`;
    }
    if (event.details.registrySize) {
      details += ` | ${event.details.registrySize}KB`;
    }
  }

  return `[${phase}] ${percent} ${current} - ${event.message}${details}`;
}

/**
 * Progress event logger for debugging
 */
export class ProgressEventLogger {
  private events: ProgressEvent[] = [];
  private startTime: number = Date.now();

  constructor(private emitter: ProgressEventEmitter) {
    emitter.on(event => this.logEvent(event));
  }

  private logEvent(event: ProgressEvent): void {
    this.events.push(event);
    console.log(formatProgressEvent(event));
  }

  getEvents(): ProgressEvent[] {
    return this.events;
  }

  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }

  getSummary(): {
    totalEvents: number;
    byPhase: Record<ProgressPhase, number>;
    totalDuration: number;
  } {
    const byPhase: Record<string, number> = {};

    this.events.forEach(event => {
      byPhase[event.phase] = (byPhase[event.phase] || 0) + 1;
    });

    return {
      totalEvents: this.events.length,
      byPhase: byPhase as Record<ProgressPhase, number>,
      totalDuration: this.getElapsedTime()
    };
  }

  clear(): void {
    this.events = [];
    this.startTime = Date.now();
  }
}
