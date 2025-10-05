/**
 * Impact/change metrics
 */
export interface ImpactMetrics {
  /** Number of files changed */
  filesChanged?: number;

  /** Lines added */
  linesAdded?: number;

  /** Lines removed */
  linesRemoved?: number;

  /** Cyclomatic complexity delta (future) */
  complexityDelta?: number;

  /** Test coverage delta (future) */
  coverageDelta?: number;

  /** Custom impact score (0-100) */
  impactScore?: number;
}
