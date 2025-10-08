/**
 * Compliance Validator
 *
 * Real-time validation of code against expertise package rules.
 * Enforces organizational standards, domain expertise, and vendor specifications.
 */

import type {
  ExpertisePackage,
  ExpertiseRule,
  AuthorityLevel,
  EnforcementLevel
} from './types';
import { PackageHierarchy } from './PackageHierarchy';
import { ConflictResolver } from './ConflictResolver';

/**
 * Context for compliance validation
 */
export interface ComplianceContext {
  /** File being validated */
  filePath?: string;

  /** Programming language */
  language?: string;

  /** Framework */
  framework?: string;

  /** Project type */
  project?: string;

  /** Strict mode - enforce recommended rules */
  strictMode?: boolean;

  /** Only check specific rule categories */
  categories?: string[];
}

/**
 * Validation issue found in code
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

  /** Rationale for the rule */
  rationale: string;

  /** Package that owns this rule */
  packageId: string;

  /** Package name */
  packageName: string;

  /** Package authority level */
  authority: AuthorityLevel;

  /** Line number (if detected) */
  line?: number;

  /** Column number (if detected) */
  column?: number;

  /** Matched pattern */
  matchedPattern?: string;

  /** Auto-fix available */
  autoFix?: {
    replacements?: Record<string, string>;
    transform?: string;
  };
}

/**
 * Summary of validation results
 */
export interface ValidationSummary {
  /** Total violations */
  total: number;

  /** Error count (mandatory rule violations) */
  errors: number;

  /** Warning count (recommended rule violations) */
  warnings: number;

  /** Info count (optional rule violations) */
  infos: number;

  /** Violations by package */
  byPackage: Record<string, number>;

  /** Violations by category */
  byCategory: Record<string, number>;

  /** Violations by authority */
  byAuthority: Record<AuthorityLevel, number>;
}

/**
 * Complete validation result
 */
export interface ValidationResult {
  /** Is code compliant with mandatory rules? */
  valid: boolean;

  /** All violations found */
  violations: ValidationIssue[];

  /** Summary statistics */
  summary: ValidationSummary;

  /** Packages checked */
  packagesChecked: string[];

  /** Rules checked */
  rulesChecked: number;
}

/**
 * Compliance Validator
 * Validates code against expertise package rules
 */
export class ComplianceValidator {
  private packageHierarchy: PackageHierarchy;
  private conflictResolver: ConflictResolver;

  constructor(
    packageHierarchy?: PackageHierarchy,
    conflictResolver?: ConflictResolver
  ) {
    this.packageHierarchy = packageHierarchy || new PackageHierarchy();
    this.conflictResolver = conflictResolver || new ConflictResolver();
  }

  /**
   * Validate code against expertise packages
   */
  validateAgainstPackages(
    code: string,
    packages: ExpertisePackage[],
    context: ComplianceContext = {}
  ): ValidationResult {
    const violations: ValidationIssue[] = [];
    const packagesChecked: string[] = [];
    let rulesChecked = 0;

    // Filter packages by scope
    const applicablePackages = this.conflictResolver.filterByScope(packages, {
      project: context.project,
      language: context.language,
      framework: context.framework
    });

    // Sort by authority (highest first)
    const sortedPackages = this.packageHierarchy.sortByAuthority(applicablePackages);

    // Check each package's rules
    for (const pkg of sortedPackages) {
      packagesChecked.push(pkg.id);

      for (const rule of pkg.rules) {
        // Skip if category filter is active and rule doesn't match
        if (context.categories && context.categories.length > 0) {
          if (!context.categories.includes(rule.category)) {
            continue;
          }
        }

        // Check if we should validate this rule
        if (!this.shouldCheck(rule, pkg.enforcement, context)) {
          continue;
        }

        rulesChecked++;

        // Check the rule
        const violation = this.checkRule(code, rule, pkg, context);
        if (violation) {
          violations.push(violation);
        }
      }
    }

    // Create summary
    const summary = this.createSummary(violations);

    return {
      valid: summary.errors === 0,
      violations,
      summary,
      packagesChecked,
      rulesChecked
    };
  }

  /**
   * Validate a single file
   */
  validateFile(
    filePath: string,
    code: string,
    packages: ExpertisePackage[],
    context: Omit<ComplianceContext, 'filePath'> = {}
  ): ValidationResult {
    return this.validateAgainstPackages(code, packages, {
      ...context,
      filePath
    });
  }

  /**
   * Check if a specific rule should be validated
   */
  private shouldCheck(
    rule: ExpertiseRule,
    enforcement: EnforcementLevel,
    context: ComplianceContext
  ): boolean {
    // Always check mandatory rules
    if (enforcement === 'mandatory') {
      return true;
    }

    // Check recommended rules in strict mode
    if (enforcement === 'recommended' && context.strictMode) {
      return true;
    }

    // Optional rules are never checked automatically
    return false;
  }

  /**
   * Check a single rule against code
   */
  private checkRule(
    code: string,
    rule: ExpertiseRule,
    pkg: ExpertisePackage,
    context: ComplianceContext
  ): ValidationIssue | null {
    // Check if any condition pattern matches
    let matched = false;
    let matchedPattern: string | undefined;
    let line: number | undefined;
    let column: number | undefined;

    for (const pattern of rule.condition.patterns) {
      try {
        const regex = new RegExp(pattern, 'gim');
        const match = regex.exec(code);

        if (match) {
          matched = true;
          matchedPattern = pattern;

          // Calculate line and column
          const beforeMatch = code.substring(0, match.index);
          line = beforeMatch.split('\n').length;
          column = beforeMatch.length - beforeMatch.lastIndexOf('\n') - 1;

          break;
        }
      } catch (error) {
        // Invalid regex pattern - skip it
        console.warn(`Invalid regex pattern in rule ${rule.id}: ${pattern}`);
        continue;
      }
    }

    // If pattern matched, this is a potential violation
    if (matched) {
      // Check if context matches
      const contextMatches = this.checkContext(rule, context);
      if (!contextMatches) {
        return null;  // Pattern matched but context doesn't apply
      }

      return {
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        message: rule.requirement,
        rationale: rule.rationale,
        packageId: pkg.id,
        packageName: pkg.name,
        authority: pkg.authority,
        line,
        column,
        matchedPattern,
        autoFix: rule.autoFix
      };
    }

    return null;
  }

  /**
   * Check if rule context matches validation context
   */
  private checkContext(rule: ExpertiseRule, context: ComplianceContext): boolean {
    // If rule has no context requirements, always matches
    if (!rule.condition.context || rule.condition.context.length === 0) {
      return true;
    }

    // Check if any context requirement matches
    for (const ruleContext of rule.condition.context) {
      const contextLower = ruleContext.toLowerCase();

      // Check language
      if (context.language && contextLower.includes(context.language.toLowerCase())) {
        return true;
      }

      // Check framework
      if (context.framework && contextLower.includes(context.framework.toLowerCase())) {
        return true;
      }

      // Check file path
      if (context.filePath && contextLower.includes(context.filePath.toLowerCase())) {
        return true;
      }

      // Generic context match
      if (contextLower === 'all' || contextLower === 'global') {
        return true;
      }
    }

    return false;
  }

  /**
   * Create summary from violations
   */
  private createSummary(violations: ValidationIssue[]): ValidationSummary {
    const summary: ValidationSummary = {
      total: violations.length,
      errors: 0,
      warnings: 0,
      infos: 0,
      byPackage: {},
      byCategory: {},
      byAuthority: {
        organizational: 0,
        'domain-expert': 0,
        'vendor-spec': 0,
        community: 0
      }
    };

    for (const violation of violations) {
      // Count by severity
      if (violation.severity === 'error') {
        summary.errors++;
      } else if (violation.severity === 'warning') {
        summary.warnings++;
      } else {
        summary.infos++;
      }

      // Count by package
      summary.byPackage[violation.packageId] = (summary.byPackage[violation.packageId] || 0) + 1;

      // Count by authority
      summary.byAuthority[violation.authority]++;

      // Extract category from rule name (simple heuristic)
      const category = this.extractCategory(violation.ruleName);
      summary.byCategory[category] = (summary.byCategory[category] || 0) + 1;
    }

    return summary;
  }

  /**
   * Extract category from rule name
   */
  private extractCategory(ruleName: string): string {
    const lower = ruleName.toLowerCase();

    if (lower.includes('security')) return 'security';
    if (lower.includes('performance')) return 'performance';
    if (lower.includes('style') || lower.includes('format')) return 'style';
    if (lower.includes('test')) return 'testing';
    if (lower.includes('doc')) return 'documentation';
    if (lower.includes('error')) return 'error-handling';
    if (lower.includes('type')) return 'typing';

    return 'general';
  }

  /**
   * Apply auto-fixes to code
   */
  applyAutoFixes(code: string, violations: ValidationIssue[]): string {
    let fixed = code;

    // Apply fixes in reverse order (by line number) to preserve positions
    const fixableViolations = violations
      .filter(v => v.autoFix && v.autoFix.replacements)
      .sort((a, b) => (b.line || 0) - (a.line || 0));

    for (const violation of fixableViolations) {
      if (!violation.autoFix?.replacements) continue;

      for (const [pattern, replacement] of Object.entries(violation.autoFix.replacements)) {
        try {
          const regex = new RegExp(pattern, 'g');
          fixed = fixed.replace(regex, replacement);
        } catch (error) {
          console.warn(`Failed to apply auto-fix for ${violation.ruleId}: ${error}`);
        }
      }
    }

    return fixed;
  }

  /**
   * Get fixable violations
   */
  getFixableViolations(violations: ValidationIssue[]): ValidationIssue[] {
    return violations.filter(v => v.autoFix && v.autoFix.replacements);
  }

  /**
   * Get violations by severity
   */
  getViolationsBySeverity(
    violations: ValidationIssue[],
    severity: 'error' | 'warning' | 'info'
  ): ValidationIssue[] {
    return violations.filter(v => v.severity === severity);
  }

  /**
   * Get violations by package
   */
  getViolationsByPackage(violations: ValidationIssue[], packageId: string): ValidationIssue[] {
    return violations.filter(v => v.packageId === packageId);
  }

  /**
   * Get violations by authority
   */
  getViolationsByAuthority(
    violations: ValidationIssue[],
    authority: AuthorityLevel
  ): ValidationIssue[] {
    return violations.filter(v => v.authority === authority);
  }
}
