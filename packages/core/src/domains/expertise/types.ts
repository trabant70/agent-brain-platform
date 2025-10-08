/**
 * Expertise Package Types
 *
 * Data structures for expertise packages that enable:
 * - Senior developers to codify expertise
 * - Organizations to enforce standards
 * - AI agents to generate compliant code
 * - Multi-vendor teams to maintain consistency
 *
 * Based on real package structure from:
 * docs/agent_brain_intelligence/agentbrain-expertise-package.json
 */

// ===== Type Aliases =====

/** Authority level - determines priority in hierarchy */
export type AuthorityLevel = 'organizational' | 'domain-expert' | 'vendor-spec' | 'community';

/** Enforcement level - how strictly rules are applied */
export type EnforcementLevel = 'mandatory' | 'recommended' | 'optional';

/** Conflict resolution strategy */
export type ConflictResolution = 'override' | 'merge' | 'skip' | 'error';

/**
 * Expertise Package
 * Complete package containing rules, patterns, templates, and examples
 */
export interface ExpertisePackage {
  // ===== Metadata =====
  /** Unique package identifier (e.g., "com.agentbrain.self-improvement") */
  id: string;

  /** Human-readable package name */
  name: string;

  /** Semantic version (e.g., "1.0.0") */
  version: string;

  /** Package description */
  description: string;

  /** Package author information */
  author: ExpertiseAuthor;

  /** Domain this package covers (e.g., "agent-brain-development", "security", "migration") */
  domain: string;

  // ===== Authority & Enforcement =====
  /** Authority level - determines priority in hierarchy */
  authority: AuthorityLevel;

  /** Enforcement level - how strictly rules are applied */
  enforcement: EnforcementLevel;

  /** Scope - where this package applies */
  scope: PackageScope;

  // ===== Content =====
  /** Expertise rules (what must/should be done) */
  rules: ExpertiseRule[];

  /** Code patterns and templates */
  patterns: ExpertisePattern[];

  /** Planning templates (force structured thinking) */
  planningTemplates: PlanningTemplate[];

  /** Validation criteria (automated checks) */
  validationCriteria: ValidationCriterion[];

  /** Good/bad code examples */
  examples: CodeExample[];

  // ===== Behavior =====
  /** Package metadata (timestamps, tags, etc.) */
  metadata: PackageMetadata;

  /** Package conflicts */
  conflicts?: PackageConflict[];

  /** Package dependencies */
  dependencies?: PackageDependency[];

  /** How this package interacts with others */
  overrides: 'supplement' | 'replace' | 'merge';
}

/**
 * Package Author
 */
export interface ExpertiseAuthor {
  /** Author name */
  name: string;

  /** Author role (e.g., "Chief Architect", "Senior Developer") */
  role: string;

  /** Organization (optional) */
  organization?: string;

  /** Credentials/certifications (optional) */
  credentials?: string[];
}

/**
 * Package Scope
 * Defines where the package applies
 */
export interface PackageScope {
  /** Specific project IDs (optional) */
  projects?: string[];

  /** Programming languages (e.g., "typescript", "python") */
  languages?: string[];

  /** Frameworks (e.g., "react", "express") */
  frameworks?: string[];

  /** Vendor IDs for multi-vendor projects (optional) */
  vendors?: string[];
}

/**
 * Expertise Rule
 * Defines a requirement or recommendation
 */
export interface ExpertiseRule {
  /** Unique rule identifier */
  id: string;

  /** Rule name */
  name: string;

  /** Rule category */
  category: 'architecture' | 'ux' | 'security' | 'performance' | 'style' | 'learning' |
             'process' | 'reliability' | 'analytics' | 'migration';

  /** Severity level */
  severity: 'error' | 'warning' | 'info';

  /** Human-readable description */
  description: string;

  /** Condition that triggers this rule */
  condition: RuleCondition;

  /** What must be done to satisfy this rule */
  requirement: string;

  /** Why this rule matters */
  rationale: string;

  /** How to validate this rule (optional) */
  validation?: string;

  /** Auto-fix information (optional) */
  autoFix?: AutoFix;

  /** Good/bad examples for this rule (optional) */
  examples?: {
    good?: string;
    bad?: string;
  };
}

/**
 * Rule Condition
 * Defines when a rule applies
 * Structure from real agentbrain-expertise-package.json
 */
export interface RuleCondition {
  /** Patterns to match in code (regex strings) */
  patterns: string[];

  /** Context types where rule applies */
  context: string[];
}

/**
 * Auto-Fix
 * Automated fix for rule violations
 */
export interface AutoFix {
  /** Simple find/replace mapping */
  replacements?: Record<string, string>;

  /** Complex transformation (future - code as string) */
  transform?: string;
}

/**
 * Expertise Pattern
 * Reusable code pattern or template
 */
export interface ExpertisePattern {
  /** Unique pattern identifier */
  id: string;

  /** Pattern name */
  name: string;

  /** Pattern description */
  description: string;

  /** Code template */
  template: string;

  /** When to use this pattern */
  when: string;

  /** Benefits of using this pattern */
  benefits: string[];
}

/**
 * Planning Template
 * Forces structured planning before coding
 */
export interface PlanningTemplate {
  /** Unique template identifier */
  id: string;

  /** Template name */
  name: string;

  /** Trigger patterns (regex strings, not RegExp for JSON serialization) */
  triggerPatterns: string[];

  /** Planning sections */
  sections: PlanningSection[];

  /** Completion criteria (simple string array from real package) */
  completionCriteria: string[];
}

/**
 * Planning Section
 * One section of a planning template
 */
export interface PlanningSection {
  /** Section identifier */
  id: string;

  /** Section title */
  title: string;

  /** Is this section required? */
  required: boolean;

  /** Prompt for AI to answer */
  prompt: string;

  /** How to validate the response (optional) */
  validation?: string;
}

/**
 * Validation Criterion
 * Automated validation check
 */
export interface ValidationCriterion {
  /** Criterion identifier */
  id: string;

  /** Human-readable description */
  description: string;

  /** Check to perform (stored as string, evaluated at runtime) */
  check: string;

  /** Severity if check fails */
  severity: 'error' | 'warning' | 'info';
}

/**
 * Code Example
 * Good/bad code examples for teaching
 */
export interface CodeExample {
  /** Example identifier */
  id: string;

  /** Example title */
  title: string;

  /** Example description */
  description: string;

  /** Prompt that led to this example (optional) */
  prompt?: string;

  /** Good code example */
  good?: string;

  /** Bad code example */
  bad?: string;
}

/**
 * Package Metadata
 * Additional package information
 */
export interface PackageMetadata {
  /** Creation date */
  created: string;

  /** Last updated date */
  updated: string;

  /** Package version */
  version: string;

  /** Minimum Agent Brain version required */
  compatibility: string;

  /** Tags for categorization */
  tags: string[];

  /** Icon/emoji for UI display */
  icon?: string;
}

/**
 * Package Conflict
 * Describes a conflict with another package
 */
export interface PackageConflict {
  /** Package IDs that conflict */
  packages: string[];

  /** How to resolve this conflict */
  resolution: ConflictResolution;

  /** Explanation of the conflict */
  reason?: string;
}

/**
 * Package Dependency
 * Describes a dependency on another package
 */
export interface PackageDependency {
  /** Package ID being depended on */
  packageId: string;

  /** Minimum version required */
  minVersion?: string;

  /** Whether this dependency is optional */
  optional?: boolean;

  /** Reason for the dependency */
  reason?: string;
}

/**
 * Validation Result
 * Result of package validation
 */
export interface ValidationResult {
  /** Is the package valid? */
  valid: boolean;

  /** Validation errors */
  errors: string[];

  /** Validation warnings */
  warnings: string[];
}

/**
 * Conflict
 * Detected conflict between packages
 */
export interface Conflict {
  /** Conflicting package ID */
  packageId: string;

  /** Conflict type */
  type: 'rule' | 'pattern' | 'scope' | 'dependency';

  /** Conflict description */
  description: string;

  /** Severity */
  severity: 'error' | 'warning';

  /** Suggested resolution */
  resolution?: string;
}

/**
 * Conflict Resolution
 * How a conflict was resolved
 */
export interface Resolution {
  /** Conflict that was resolved */
  conflict: Conflict;

  /** Resolution strategy used */
  strategy: 'authority' | 'user-choice' | 'merge' | 'skip';

  /** Resolution action taken */
  action: string;
}

/**
 * Validation Issue
 * Issue found during compliance validation
 */
export interface ValidationIssue {
  /** Rule that was violated */
  ruleId: string;

  /** Rule name */
  ruleName: string;

  /** Severity */
  severity: 'error' | 'warning' | 'info';

  /** Issue message */
  message: string;

  /** Rationale for this rule */
  rationale: string;

  /** Package that defined this rule */
  packageId?: string;

  /** Package name */
  packageName?: string;

  /** Package authority level */
  authority?: string;

  /** Auto-fix available */
  autoFix?: AutoFix;

  /** Location in code (optional) */
  location?: {
    line: number;
    column: number;
    length: number;
  };
}

/**
 * Validation Summary
 * Summary of validation results
 */
export interface ValidationSummary {
  /** Total violations */
  total: number;

  /** Error count */
  errors: number;

  /** Warning count */
  warnings: number;

  /** Info count */
  infos: number;
}

/**
 * Compliance Validation Result
 * Result of validating code against packages
 */
export interface ComplianceValidationResult {
  /** Is code compliant? */
  valid: boolean;

  /** Violations found */
  violations: ValidationIssue[];

  /** Summary statistics */
  summary: ValidationSummary;
}

/**
 * Package Recommendation
 * Recommended package for a project
 */
export interface PackageRecommendation {
  /** Need this package addresses */
  need: string;

  /** Recommended packages */
  packages: ExpertisePackage[];

  /** Expected improvement percentage (0-100) */
  expectedImprovement: number;
}

/**
 * Project Need
 * Identified need in a project
 */
export interface ProjectNeed {
  /** Need category */
  category: string;

  /** Need description */
  description: string;

  /** Priority (1-5) */
  priority: number;

  /** Indicators of this need */
  indicators: string[];
}

/**
 * Package Effectiveness Metrics
 * Metrics for package effectiveness
 */
export interface EffectivenessMetrics {
  /** Times this package was used */
  usageCount: number;

  /** Violations prevented by this package */
  violationsPrevented: number;

  /** Compliance rate (0-100) */
  complianceRate: number;

  /** Top performing rules */
  topRules: Array<{
    ruleId: string;
    ruleName: string;
    preventionCount: number;
  }>;
}

/**
 * Plan Validation Result
 * Result of validating AI's plan adherence
 */
export interface PlanValidationResult {
  /** Is plan valid? */
  valid: boolean;

  /** Missing required sections */
  missingSections: string[];

  /** Incomplete completion criteria */
  incompleteCriteria: string[];

  /** Overall score (0-100) */
  score: number;
}

/**
 * Stage 5 Metadata
 * Metadata added by Stage 5 enhancement
 */
export interface Stage5Metadata {
  /** Planning template used (if any) */
  planningTemplate?: string;

  /** Mandatory rules applied */
  mandatoryRulesApplied: string[];

  /** Packages used in enhancement */
  packagesUsed: string[];
}
