/**
 * FocusUpdateHandler - Focus-Based Validation for Knowledge Injections
 *
 * Handles validation when user navigates away from or saves a file with
 * pending injection changes. Provides UI feedback and prevents data loss.
 *
 * Design Principles:
 * - Non-blocking: User can always navigate away (no forced blocking)
 * - Informative: Shows what has changed and what will be validated
 * - Opt-in: Focus validation is optional (can be disabled in settings)
 * - Graceful degradation: If validation fails, user can still proceed
 *
 * Validation Triggers:
 * - File save (always validate)
 * - Tab switch (validate if pending changes)
 * - File close (validate if pending changes)
 * - Window blur (optional, configurable)
 *
 * Validation Actions:
 * - Scan file for marker integrity
 * - Check for orphaned items
 * - Validate marker pairing
 * - Report warnings/errors to user
 */

import {
  GroupChange,
  ScanResult,
  ScanTrigger
} from './GroupTypes';
import { ClaudeMdScanner } from './ClaudeMdScanner';
import { logger, LogCategory, LogPathway } from '../../infrastructure/logging/Logger';

export interface FocusUpdateConfig {
  /** Enable validation on file save (default: true) */
  validateOnSave: boolean;

  /** Enable validation on tab switch (default: true) */
  validateOnTabSwitch: boolean;

  /** Enable validation on file close (default: true) */
  validateOnClose: boolean;

  /** Enable validation on window blur (default: false) */
  validateOnBlur: boolean;

  /** Show validation warnings in notifications (default: true) */
  showWarnings: boolean;

  /** Auto-fix simple issues (default: false) */
  autoFix: boolean;
}

export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;

  /** Scan result with detailed information */
  scanResult: ScanResult;

  /** Human-readable summary */
  summary: string;

  /** Suggested actions */
  suggestions: string[];

  /** Whether auto-fix is possible */
  canAutoFix: boolean;
}

export interface FocusUpdateCallbacks {
  /**
   * Called when validation completes
   */
  onValidationComplete?: (filePath: string, result: ValidationResult) => void;

  /**
   * Called when user needs to be prompted about warnings
   * Should return true if user wants to proceed despite warnings
   */
  onWarningPrompt?: (filePath: string, warnings: string[]) => Promise<boolean>;

  /**
   * Called when auto-fix is applied
   */
  onAutoFixApplied?: (filePath: string, fixes: string[]) => void;
}

export class FocusUpdateHandler {
  private pendingChanges: Map<string, GroupChange[]> = new Map();
  private config: FocusUpdateConfig;

  constructor(
    private scanner: ClaudeMdScanner,
    private callbacks: FocusUpdateCallbacks = {},
    config?: Partial<FocusUpdateConfig>
  ) {
    this.config = {
      validateOnSave: true,
      validateOnTabSwitch: true,
      validateOnClose: true,
      validateOnBlur: false,
      showWarnings: true,
      autoFix: false,
      ...config
    };
  }

  /**
   * Track a pending change for a file
   * Changes are accumulated until focus is lost
   */
  trackPendingChange(filePath: string, change: GroupChange): void {
    if (!this.pendingChanges.has(filePath)) {
      this.pendingChanges.set(filePath, []);
    }
    this.pendingChanges.get(filePath)!.push(change);

    logger.info(
      LogCategory.DATA,
      'Tracked pending change',
      'FocusUpdateHandler.trackPendingChange',
      { filePath, changeType: change.type, groupType: change.groupType },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Clear pending changes for a file
   */
  clearPendingChanges(filePath: string): void {
    this.pendingChanges.delete(filePath);
  }

  /**
   * Get pending changes for a file
   */
  getPendingChanges(filePath: string): GroupChange[] {
    return this.pendingChanges.get(filePath) || [];
  }

  /**
   * Check if file has pending changes
   */
  hasPendingChanges(filePath: string): boolean {
    return this.pendingChanges.has(filePath) && this.pendingChanges.get(filePath)!.length > 0;
  }

  /**
   * Validate file on focus lost
   * Returns validation result for UI display
   */
  async validateOnFocusLost(
    filePath: string,
    content: string,
    trigger: 'save' | 'tabSwitch' | 'close' | 'blur'
  ): Promise<ValidationResult> {
    // Check if validation is enabled for this trigger
    if (!this.shouldValidate(trigger)) {
      return this.createPassResult();
    }

    logger.info(
      LogCategory.DATA,
      'Validating on focus lost',
      'FocusUpdateHandler.validateOnFocusLost',
      { filePath, trigger, hasPendingChanges: this.hasPendingChanges(filePath) },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Scan file for issues
    const scanResult = this.scanner.scanFile(content);

    // Build validation result
    const result = this.buildValidationResult(filePath, scanResult);

    // Notify callback
    this.callbacks.onValidationComplete?.(filePath, result);

    // Show warning prompt if needed
    if (!result.valid && this.config.showWarnings && result.scanResult.warnings.length > 0) {
      const shouldProceed = await this.callbacks.onWarningPrompt?.(
        filePath,
        result.scanResult.warnings
      );

      if (!shouldProceed) {
        logger.info(
          LogCategory.DATA,
          'User cancelled due to validation warnings',
          'FocusUpdateHandler.validateOnFocusLost',
          { filePath },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
      }
    }

    // Apply auto-fix if enabled and possible
    if (this.config.autoFix && result.canAutoFix) {
      await this.applyAutoFix(filePath, scanResult);
    }

    // Clear pending changes after validation
    if (trigger === 'save') {
      this.clearPendingChanges(filePath);
    }

    return result;
  }

  /**
   * Validate multiple files (workspace-wide validation)
   */
  async validateMultipleFiles(
    files: Array<{ filePath: string; content: string }>
  ): Promise<Map<string, ValidationResult>> {
    const results = new Map<string, ValidationResult>();

    for (const file of files) {
      const result = await this.validateOnFocusLost(
        file.filePath,
        file.content,
        'save'
      );
      results.set(file.filePath, result);
    }

    return results;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<FocusUpdateConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if validation should run for this trigger
   */
  private shouldValidate(trigger: 'save' | 'tabSwitch' | 'close' | 'blur'): boolean {
    switch (trigger) {
      case 'save':
        return this.config.validateOnSave;
      case 'tabSwitch':
        return this.config.validateOnTabSwitch;
      case 'close':
        return this.config.validateOnClose;
      case 'blur':
        return this.config.validateOnBlur;
      default:
        return false;
    }
  }

  /**
   * Build validation result from scan result
   */
  private buildValidationResult(filePath: string, scanResult: ScanResult): ValidationResult {
    const valid = scanResult.warnings.length === 0 && scanResult.orphanedItems.length === 0;

    // Build summary
    let summary = valid
      ? 'All knowledge injections are valid'
      : `Found ${scanResult.warnings.length} warning(s)`;

    if (scanResult.orphanedItems.length > 0) {
      summary += ` and ${scanResult.orphanedItems.length} orphaned item(s)`;
    }

    // Build suggestions
    const suggestions: string[] = [];
    if (scanResult.warnings.length > 0) {
      suggestions.push('Review and fix marker issues');
    }
    if (scanResult.orphanedItems.length > 0) {
      suggestions.push('Remove or re-inject orphaned items');
    }
    if (scanResult.groups.length === 0 && scanResult.individualItems.length === 0) {
      suggestions.push('No knowledge items detected');
    }

    // Check if auto-fix is possible
    const canAutoFix = scanResult.orphanedItems.length === 0 && scanResult.warnings.length <= 2;

    return {
      valid,
      scanResult,
      summary,
      suggestions,
      canAutoFix
    };
  }

  /**
   * Create a passing validation result (for when validation is disabled)
   */
  private createPassResult(): ValidationResult {
    return {
      valid: true,
      scanResult: {
        groups: [],
        individualItems: [],
        orphanedItems: [],
        totalInjectionCount: 0,
        warnings: []
      },
      summary: 'Validation skipped',
      suggestions: [],
      canAutoFix: false
    };
  }

  /**
   * Apply auto-fix for simple issues
   */
  private async applyAutoFix(filePath: string, scanResult: ScanResult): Promise<void> {
    const fixes: string[] = [];

    // For now, just log what would be fixed
    // Real implementation would modify the file content

    if (fixes.length > 0) {
      this.callbacks.onAutoFixApplied?.(filePath, fixes);
      logger.info(
        LogCategory.DATA,
        'Applied auto-fix',
        'FocusUpdateHandler.applyAutoFix',
        { filePath, fixes },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    }
  }
}
