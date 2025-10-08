/**
 * Expertise Package System
 *
 * Enables:
 * - Loading and managing expertise packages
 * - Package hierarchy based on authority
 * - Compliance validation
 * - Package creation and distribution
 */

export * from './types';
export { PackageManager } from './PackageManager';
export { MarkdownConverter } from './MarkdownConverter';
export { PackageHierarchy } from './PackageHierarchy';
export { ConflictResolver } from './ConflictResolver';
export type { MergedPackageContent } from './PackageHierarchy';
export type { Conflict, ResolvedConflict } from './ConflictResolver';
export {
  loadIntelligencePackages,
  runStandalone as runIntelligenceLoader
} from './loadIntelligencePackages';
export type {
  LoadIntelligenceOptions,
  LoadIntelligenceResult
} from './loadIntelligencePackages';
export { ComplianceValidator } from './ComplianceValidator';
export type {
  ComplianceContext,
  ValidationIssue,
  ValidationSummary,
  ValidationResult
} from './ComplianceValidator';
export { PackageImporter } from './PackageImporter';
export type {
  ImportOptions,
  ImportResult
} from './PackageImporter';
export { PackageExporter } from './PackageExporter';
export type {
  ExportOptions,
  ExportResult
} from './PackageExporter';
