/**
 * ScanController - Event-Driven Scanning Coordinator
 *
 * Orchestrates file scanning in response to specific trigger events.
 * Coordinates between the scanner, UI updates, and file system.
 *
 * Key Design Principles:
 * - Event-driven: Scans triggered by specific events, not continuous watching
 * - Stateless: No caching of scan results - always scan fresh on demand
 * - UI-aware: Provides results in formats optimized for UI display
 * - Single file or workspace: Supports both individual file and bulk scanning
 *
 * Trigger Events:
 * - FILE_LOAD: When user opens a claude.md file
 * - POST_INJECTION: After injecting a group
 * - POST_REMOVAL: After removing a group
 * - CONFIG_CHANGE: After maturity settings change
 * - FOCUS_LOST: When user navigates away or saves
 * - MANUAL: User explicitly requests scan
 */

import {
  ScanResult,
  ScanTrigger,
  WorkspaceScanResult,
  FileInjectionStatus,
  InjectionStatus
} from './GroupTypes';
import { ClaudeMdScanner } from './ClaudeMdScanner';
import { logger, LogCategory, LogPathway } from '../../infrastructure/logging/Logger';

export interface ScanControllerCallbacks {
  /**
   * Called when a scan completes for a single file
   */
  onFileScanComplete?: (filePath: string, result: ScanResult, trigger: ScanTrigger) => void;

  /**
   * Called when a workspace scan completes
   */
  onWorkspaceScanComplete?: (result: WorkspaceScanResult, trigger: ScanTrigger) => void;

  /**
   * Called when scan starts (for progress indication)
   */
  onScanStart?: (filePath: string | 'workspace', trigger: ScanTrigger) => void;

  /**
   * Called on scan errors
   */
  onScanError?: (filePath: string, error: string) => void;
}

export class ScanController {
  constructor(
    private scanner: ClaudeMdScanner,
    private callbacks: ScanControllerCallbacks = {}
  ) {}

  /**
   * Trigger a scan for a single file
   *
   * @param filePath Path to claude.md file
   * @param content File content to scan
   * @param trigger What triggered this scan
   */
  async scanFile(
    filePath: string,
    content: string,
    trigger: ScanTrigger
  ): Promise<ScanResult> {
    logger.info(
      LogCategory.DATA,
      `ScanController scanning file: ${filePath}`,
      'ScanController.scanFile',
      { filePath, trigger },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    this.callbacks.onScanStart?.(filePath, trigger);

    try {
      const result = this.scanner.scanFile(content);

      logger.info(
        LogCategory.DATA,
        `ScanController scan complete for ${filePath}`,
        'ScanController.scanFile',
        {
          filePath,
          trigger,
          groups: result.groups.length,
          individualItems: result.individualItems.length,
          warnings: result.warnings.length
        },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      this.callbacks.onFileScanComplete?.(filePath, result, trigger);

      return result;
    } catch (error: any) {
      logger.error(
        LogCategory.DATA,
        `ScanController scan failed for ${filePath}`,
        'ScanController.scanFile',
        { filePath, trigger, error: error.message },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      this.callbacks.onScanError?.(filePath, error.message);

      // Return empty result on error
      return {
        groups: [],
        individualItems: [],
        orphanedItems: [],
        totalInjectionCount: 0,
        warnings: [`Scan failed: ${error.message}`]
      };
    }
  }

  /**
   * Trigger a scan for multiple files (workspace scan)
   *
   * @param files Array of { filePath, content } objects
   * @param trigger What triggered this scan
   */
  async scanWorkspace(
    files: Array<{ filePath: string; content: string }>,
    trigger: ScanTrigger
  ): Promise<WorkspaceScanResult> {
    logger.info(
      LogCategory.DATA,
      `ScanController scanning workspace: ${files.length} files`,
      'ScanController.scanWorkspace',
      { fileCount: files.length, trigger },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    this.callbacks.onScanStart?.('workspace', trigger);

    const results = new Map<string, ScanResult>();
    const filesWithWarnings: string[] = [];
    let totalInjections = 0;

    for (const file of files) {
      try {
        const result = await this.scanFile(file.filePath, file.content, trigger);
        results.set(file.filePath, result);
        totalInjections += result.totalInjectionCount;

        if (result.warnings.length > 0) {
          filesWithWarnings.push(file.filePath);
        }
      } catch (error: any) {
        logger.warn(
          LogCategory.DATA,
          `Skipping file ${file.filePath} due to error`,
          'ScanController.scanWorkspace',
          { filePath: file.filePath, error: error.message },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
      }
    }

    const workspaceResult: WorkspaceScanResult = {
      results,
      totalFiles: files.length,
      totalInjections,
      filesWithWarnings
    };

    logger.info(
      LogCategory.DATA,
      'ScanController workspace scan complete',
      'ScanController.scanWorkspace',
      {
        totalFiles: workspaceResult.totalFiles,
        totalInjections: workspaceResult.totalInjections,
        filesWithWarnings: workspaceResult.filesWithWarnings.length
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    this.callbacks.onWorkspaceScanComplete?.(workspaceResult, trigger);

    return workspaceResult;
  }

  /**
   * Get file injection status for UI display
   */
  getFileInjectionStatus(
    filePath: string,
    scanResult: ScanResult
  ): FileInjectionStatus {
    return {
      filePath,
      totalGroups: scanResult.groups.length,
      individualItems: scanResult.individualItems.length,
      totalInjections: scanResult.totalInjectionCount,
      warnings: scanResult.warnings,
      lastScanned: new Date()
    };
  }

  /**
   * Determine injection status based on scan results
   * Used for UI indicators (✅/⚪/⭕/etc)
   */
  getInjectionStatus(result: ScanResult): InjectionStatus {
    if (result.warnings.length > 0) {
      return InjectionStatus.ERROR;
    }

    if (result.totalInjectionCount === 0) {
      return InjectionStatus.NOT_INJECTED;
    }

    // Check for partial injection (orphaned items)
    if (result.orphanedItems.length > 0) {
      return InjectionStatus.PARTIAL;
    }

    return InjectionStatus.INJECTED;
  }

  /**
   * Quick check if file needs scanning based on trigger
   * Some triggers always scan, others can be optimized
   */
  shouldScan(trigger: ScanTrigger, lastScanTime?: Date): boolean {
    switch (trigger) {
      case ScanTrigger.FILE_LOAD:
      case ScanTrigger.POST_INJECTION:
      case ScanTrigger.POST_REMOVAL:
      case ScanTrigger.MANUAL:
        // Always scan for these triggers
        return true;

      case ScanTrigger.CONFIG_CHANGE:
        // Only scan if we haven't scanned in the last 5 seconds
        if (!lastScanTime) return true;
        const timeSinceLastScan = Date.now() - lastScanTime.getTime();
        return timeSinceLastScan > 5000;

      case ScanTrigger.FOCUS_LOST:
        // Only scan if we haven't scanned in the last 10 seconds
        if (!lastScanTime) return true;
        const timeSinceFocusLost = Date.now() - lastScanTime.getTime();
        return timeSinceFocusLost > 10000;

      default:
        return true;
    }
  }

  /**
   * Register callbacks after construction
   */
  setCallbacks(callbacks: ScanControllerCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }
}
