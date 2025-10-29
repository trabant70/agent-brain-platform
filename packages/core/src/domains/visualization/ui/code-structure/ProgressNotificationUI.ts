/**
 * Progress Notification UI
 *
 * Real-time progress display for streaming code analysis.
 * Shows:
 * - Current phase (scanning, extracting, analyzing, aggregating)
 * - Progress percentage and counts
 * - Current file or analyzer being processed
 * - Registry memory usage
 * - Estimated time remaining
 */

import type { ProgressEvent, ProgressPhase } from '../../../code-structure-review/streaming/ProgressEventEmitter';

export interface ProgressUIOptions {
  /**
   * Container element to render progress UI into
   */
  container: HTMLElement;

  /**
   * Whether to show detailed information (file names, memory, etc.)
   * Default: true
   */
  showDetails?: boolean;

  /**
   * Whether to show estimated time remaining
   * Default: true
   */
  showTimeEstimate?: boolean;

  /**
   * Callback when user cancels analysis
   */
  onCancel?: () => void;
}

/**
 * Progress notification UI component
 */
export class ProgressNotificationUI {
  private container: HTMLElement;
  private options: Required<ProgressUIOptions>;
  private startTime: number = Date.now();
  private lastEvent: ProgressEvent | null = null;
  private estimatedDuration: number = 0;

  constructor(options: ProgressUIOptions) {
    this.container = options.container;
    this.options = {
      container: options.container,
      showDetails: options.showDetails !== false,
      showTimeEstimate: options.showTimeEstimate !== false,
      onCancel: options.onCancel || (() => {})
    };
  }

  /**
   * Show progress UI
   */
  show(): void {
    this.startTime = Date.now();
    this.render();
  }

  /**
   * Update progress display
   */
  update(event: ProgressEvent): void {
    this.lastEvent = event;
    this.render();
  }

  /**
   * Hide progress UI and show completion
   */
  hide(): void {
    this.container.innerHTML = '';
  }

  /**
   * Set estimated total duration (for time remaining calculation)
   */
  setEstimatedDuration(durationMs: number): void {
    this.estimatedDuration = durationMs;
  }

  /**
   * Render the progress UI
   */
  private render(): void {
    if (!this.lastEvent) {
      // Initial state before first event
      this.container.innerHTML = this.renderInitialState();
      return;
    }

    const event = this.lastEvent;

    // Check if complete
    if (event.phase === 'complete') {
      this.container.innerHTML = this.renderCompleteState(event);
      return;
    }

    // Check if error
    if (event.phase === 'error') {
      this.container.innerHTML = this.renderErrorState(event);
      return;
    }

    // Render active progress
    this.container.innerHTML = this.renderProgressState(event);
  }

  /**
   * Render initial loading state
   */
  private renderInitialState(): string {
    return `
      <div class="progress-notification active">
        <div class="progress-header">
          <div class="progress-phase">
            <span class="phase-icon">🔄</span>
            <span class="phase-label">Initializing Analysis...</span>
          </div>
        </div>
        <div class="progress-body">
          <div class="progress-bar-container">
            <div class="progress-bar indeterminate"></div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render active progress state
   */
  private renderProgressState(event: ProgressEvent): string {
    const phaseInfo = this.getPhaseInfo(event.phase);
    const elapsed = Date.now() - this.startTime;
    const timeRemaining = this.estimateTimeRemaining(event.percentage, elapsed);

    return `
      <div class="progress-notification active" data-phase="${event.phase}">
        <!-- Header with phase and cancel button -->
        <div class="progress-header">
          <div class="progress-phase">
            <span class="phase-icon">${phaseInfo.icon}</span>
            <span class="phase-label">${phaseInfo.label}</span>
          </div>
          <button class="btn-icon cancel-btn" id="cancel-analysis" title="Cancel Analysis">
            ✕
          </button>
        </div>

        <!-- Progress bar -->
        <div class="progress-body">
          <div class="progress-bar-container">
            <div class="progress-bar" style="width: ${event.percentage}%">
              <span class="progress-percentage">${event.percentage}%</span>
            </div>
          </div>

          <!-- Progress message -->
          <div class="progress-message">${event.message}</div>

          <!-- Progress stats -->
          <div class="progress-stats">
            <span class="progress-count">${event.current} / ${event.total}</span>
            ${this.options.showTimeEstimate && timeRemaining ? `
              <span class="progress-time">~${timeRemaining} remaining</span>
            ` : ''}
          </div>

          <!-- Details (optional) -->
          ${this.options.showDetails ? this.renderDetails(event) : ''}
        </div>
      </div>
    `;
  }

  /**
   * Render progress details (current file, memory, etc.)
   */
  private renderDetails(event: ProgressEvent): string {
    if (!event.details) return '';

    const details: string[] = [];

    if (event.details.currentFile) {
      const fileName = event.details.currentFile.split('/').pop() || event.details.currentFile;
      details.push(`<div class="detail-item">
        <span class="detail-label">File:</span>
        <span class="detail-value" title="${event.details.currentFile}">${fileName}</span>
      </div>`);
    }

    if (event.details.currentAnalyzer) {
      details.push(`<div class="detail-item">
        <span class="detail-label">Analyzer:</span>
        <span class="detail-value">${event.details.currentAnalyzer}</span>
      </div>`);
    }

    if (event.details.filesProcessed !== undefined) {
      details.push(`<div class="detail-item">
        <span class="detail-label">Files Processed:</span>
        <span class="detail-value">${event.details.filesProcessed}</span>
      </div>`);
    }

    if (event.details.registrySize !== undefined) {
      const sizeMB = (event.details.registrySize / 1024).toFixed(2);
      details.push(`<div class="detail-item">
        <span class="detail-label">Registry Size:</span>
        <span class="detail-value">${sizeMB} MB</span>
      </div>`);
    }

    if (details.length === 0) return '';

    return `
      <div class="progress-details">
        ${details.join('')}
      </div>
    `;
  }

  /**
   * Render completion state
   */
  private renderCompleteState(event: ProgressEvent): string {
    const elapsed = Date.now() - this.startTime;
    const duration = this.formatDuration(event.details?.duration || elapsed);

    return `
      <div class="progress-notification complete">
        <div class="progress-header">
          <div class="progress-phase">
            <span class="phase-icon">✅</span>
            <span class="phase-label">Analysis Complete</span>
          </div>
        </div>
        <div class="progress-body">
          <div class="progress-message">${event.message}</div>
          <div class="progress-stats">
            <span class="progress-time">Completed in ${duration}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render error state
   */
  private renderErrorState(event: ProgressEvent): string {
    return `
      <div class="progress-notification error">
        <div class="progress-header">
          <div class="progress-phase">
            <span class="phase-icon">⚠️</span>
            <span class="phase-label">Analysis Failed</span>
          </div>
        </div>
        <div class="progress-body">
          <div class="error-message">${event.details?.errorMessage || event.message}</div>
          <button class="btn btn-secondary" id="dismiss-error">Dismiss</button>
        </div>
      </div>
    `;
  }

  /**
   * Get phase display information
   */
  private getPhaseInfo(phase: ProgressPhase): { icon: string; label: string } {
    switch (phase) {
      case 'scanning':
        return { icon: '🔍', label: 'Scanning Files' };
      case 'extracting':
        return { icon: '📄', label: 'Extracting Metadata' };
      case 'analyzing':
        return { icon: '🔬', label: 'Running Analyzers' };
      case 'aggregating':
        return { icon: '📊', label: 'Aggregating Results' };
      case 'complete':
        return { icon: '✅', label: 'Complete' };
      case 'error':
        return { icon: '⚠️', label: 'Error' };
      default:
        return { icon: '🔄', label: 'Processing' };
    }
  }

  /**
   * Estimate time remaining based on current progress
   */
  private estimateTimeRemaining(percentage: number, elapsedMs: number): string | null {
    if (percentage === 0) return null;
    if (percentage >= 100) return null;

    const totalEstimated = (elapsedMs / percentage) * 100;
    const remaining = totalEstimated - elapsedMs;

    // If we have a pre-set estimated duration, use that for better accuracy
    if (this.estimatedDuration > 0) {
      const remainingByEstimate = this.estimatedDuration - elapsedMs;
      if (remainingByEstimate > 0) {
        return this.formatDuration(remainingByEstimate);
      }
    }

    return this.formatDuration(remaining);
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);

    if (seconds < 60) {
      return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes < 60) {
      return remainingSeconds > 0
        ? `${minutes}m ${remainingSeconds}s`
        : `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners(): void {
    // Cancel button
    this.container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      if (target.id === 'cancel-analysis' || target.closest('#cancel-analysis')) {
        if (confirm('Are you sure you want to cancel the analysis?')) {
          this.options.onCancel();
        }
      }

      if (target.id === 'dismiss-error' || target.closest('#dismiss-error')) {
        this.hide();
      }
    });
  }

  /**
   * Clean up and remove listeners
   */
  dispose(): void {
    this.container.innerHTML = '';
  }
}

/**
 * Create progress notification UI
 */
export function createProgressNotification(options: ProgressUIOptions): ProgressNotificationUI {
  const notification = new ProgressNotificationUI(options);
  notification.setupEventListeners();
  return notification;
}
