/**
 * Conflict Resolver
 *
 * Resolves conflicts between expertise packages based on:
 * - Authority hierarchy
 * - Explicit package dependencies
 * - Override strategies
 * - Scope matching
 */

import type {
  ExpertisePackage,
  ConflictResolution,
  ExpertiseRule,
  ExpertisePattern,
  PlanningTemplate
} from './types';
import { PackageHierarchy } from './PackageHierarchy';

export interface Conflict {
  type: 'rule' | 'pattern' | 'template';
  itemId: string;
  packages: string[];  // Package IDs involved
  description: string;
}

export interface ResolvedConflict extends Conflict {
  resolution: ConflictResolution;
  winningPackage: string;
  reason: string;
}

export class ConflictResolver {
  private hierarchy: PackageHierarchy;

  constructor() {
    this.hierarchy = new PackageHierarchy();
  }

  /**
   * Detect conflicts between packages
   */
  detectConflicts(packages: ExpertisePackage[]): Conflict[] {
    const conflicts: Conflict[] = [];

    // Check for rule conflicts
    const ruleConflicts = this.detectRuleConflicts(packages);
    conflicts.push(...ruleConflicts);

    // Check for pattern conflicts
    const patternConflicts = this.detectPatternConflicts(packages);
    conflicts.push(...patternConflicts);

    // Check for template conflicts
    const templateConflicts = this.detectTemplateConflicts(packages);
    conflicts.push(...templateConflicts);

    return conflicts;
  }

  /**
   * Resolve conflicts between packages
   */
  resolveConflicts(
    packages: ExpertisePackage[],
    conflicts: Conflict[]
  ): ResolvedConflict[] {
    return conflicts.map(conflict => {
      return this.resolveConflict(packages, conflict);
    });
  }

  /**
   * Resolve a single conflict
   */
  private resolveConflict(
    packages: ExpertisePackage[],
    conflict: Conflict
  ): ResolvedConflict {
    // Get packages involved in conflict
    const involvedPackages = packages.filter(pkg =>
      conflict.packages.includes(pkg.id)
    );

    // Check for explicit conflict declarations
    const explicitResolution = this.checkExplicitConflicts(involvedPackages, conflict);
    if (explicitResolution) {
      return {
        ...conflict,
        resolution: explicitResolution.resolution,
        winningPackage: explicitResolution.winningPackage,
        reason: 'Explicit conflict declaration'
      };
    }

    // Check for dependency-based resolution
    const dependencyResolution = this.resolveThroughDependencies(involvedPackages, conflict);
    if (dependencyResolution) {
      return {
        ...conflict,
        resolution: dependencyResolution.resolution,
        winningPackage: dependencyResolution.winningPackage,
        reason: 'Package dependency hierarchy'
      };
    }

    // Fall back to authority hierarchy
    const sortedPackages = this.hierarchy.sortByAuthority(involvedPackages);
    const winner = sortedPackages[0];

    return {
      ...conflict,
      resolution: 'override',
      winningPackage: winner.id,
      reason: `Higher authority (${winner.authority})`
    };
  }

  /**
   * Check for explicit conflict declarations in packages
   */
  private checkExplicitConflicts(
    packages: ExpertisePackage[],
    conflict: Conflict
  ): { resolution: ConflictResolution; winningPackage: string } | null {
    for (const pkg of packages) {
      const declaredConflict = pkg.conflicts?.find(c =>
        c.packages.some(id => conflict.packages.includes(id))
      );

      if (declaredConflict) {
        return {
          resolution: declaredConflict.resolution,
          winningPackage: pkg.id
        };
      }
    }

    return null;
  }

  /**
   * Resolve conflict through package dependencies
   */
  private resolveThroughDependencies(
    packages: ExpertisePackage[],
    conflict: Conflict
  ): { resolution: ConflictResolution; winningPackage: string } | null {
    // Check if one package depends on another
    for (const pkg of packages) {
      if (!pkg.dependencies || pkg.dependencies.length === 0) {
        continue;
      }

      // If this package depends on another package in conflict,
      // the dependency should win
      const dependency = pkg.dependencies.find(dep =>
        conflict.packages.includes(dep.packageId)
      );

      if (dependency) {
        // The package being depended on wins
        return {
          resolution: 'override',
          winningPackage: dependency.packageId
        };
      }
    }

    return null;
  }

  /**
   * Detect rule conflicts
   */
  private detectRuleConflicts(packages: ExpertisePackage[]): Conflict[] {
    const conflicts: Conflict[] = [];
    const ruleMap = new Map<string, string[]>();  // rule.id -> package IDs

    for (const pkg of packages) {
      for (const rule of pkg.rules) {
        const existing = ruleMap.get(rule.id);
        if (existing) {
          existing.push(pkg.id);
        } else {
          ruleMap.set(rule.id, [pkg.id]);
        }
      }
    }

    // Find rules that appear in multiple packages
    for (const [ruleId, packageIds] of ruleMap.entries()) {
      if (packageIds.length > 1) {
        conflicts.push({
          type: 'rule',
          itemId: ruleId,
          packages: packageIds,
          description: `Rule "${ruleId}" defined in multiple packages`
        });
      }
    }

    return conflicts;
  }

  /**
   * Detect pattern conflicts
   */
  private detectPatternConflicts(packages: ExpertisePackage[]): Conflict[] {
    const conflicts: Conflict[] = [];
    const patternMap = new Map<string, string[]>();  // pattern.id -> package IDs

    for (const pkg of packages) {
      for (const pattern of pkg.patterns) {
        const existing = patternMap.get(pattern.id);
        if (existing) {
          existing.push(pkg.id);
        } else {
          patternMap.set(pattern.id, [pkg.id]);
        }
      }
    }

    for (const [patternId, packageIds] of patternMap.entries()) {
      if (packageIds.length > 1) {
        conflicts.push({
          type: 'pattern',
          itemId: patternId,
          packages: packageIds,
          description: `Pattern "${patternId}" defined in multiple packages`
        });
      }
    }

    return conflicts;
  }

  /**
   * Detect template conflicts
   */
  private detectTemplateConflicts(packages: ExpertisePackage[]): Conflict[] {
    const conflicts: Conflict[] = [];
    const templateMap = new Map<string, string[]>();  // template.id -> package IDs

    for (const pkg of packages) {
      for (const template of pkg.planningTemplates) {
        const existing = templateMap.get(template.id);
        if (existing) {
          existing.push(pkg.id);
        } else {
          templateMap.set(template.id, [pkg.id]);
        }
      }
    }

    for (const [templateId, packageIds] of templateMap.entries()) {
      if (packageIds.length > 1) {
        conflicts.push({
          type: 'template',
          itemId: templateId,
          packages: packageIds,
          description: `Planning template "${templateId}" defined in multiple packages`
        });
      }
    }

    return conflicts;
  }

  /**
   * Check if packages have scope conflicts
   */
  checkScopeCompatibility(pkg1: ExpertisePackage, pkg2: ExpertisePackage): boolean {
    // If no scope defined, always compatible
    if (!pkg1.scope || !pkg2.scope) {
      return true;
    }

    // Check project overlap
    if (pkg1.scope.projects && pkg2.scope.projects) {
      const hasProjectOverlap = pkg1.scope.projects.some(p1 =>
        pkg2.scope.projects?.includes(p1)
      );
      if (!hasProjectOverlap) {
        return true;  // No overlap, no conflict
      }
    }

    // Check language overlap
    if (pkg1.scope.languages && pkg2.scope.languages) {
      const hasLanguageOverlap = pkg1.scope.languages.some(l1 =>
        pkg2.scope.languages?.includes(l1)
      );
      if (!hasLanguageOverlap) {
        return true;  // No overlap, no conflict
      }
    }

    // Check framework overlap
    if (pkg1.scope.frameworks && pkg2.scope.frameworks) {
      const hasFrameworkOverlap = pkg1.scope.frameworks.some(f1 =>
        pkg2.scope.frameworks?.includes(f1)
      );
      if (!hasFrameworkOverlap) {
        return true;  // No overlap, no conflict
      }
    }

    // If we get here, there's overlap in scope
    return false;
  }

  /**
   * Filter packages by scope match
   */
  filterByScope(
    packages: ExpertisePackage[],
    context: {
      project?: string;
      language?: string;
      framework?: string;
    }
  ): ExpertisePackage[] {
    return packages.filter(pkg => {
      if (!pkg.scope) {
        return true;  // No scope = applies everywhere
      }

      // Check project
      if (context.project && pkg.scope.projects) {
        if (!pkg.scope.projects.includes(context.project)) {
          return false;
        }
      }

      // Check language
      if (context.language && pkg.scope.languages) {
        if (!pkg.scope.languages.includes(context.language)) {
          return false;
        }
      }

      // Check framework
      if (context.framework && pkg.scope.frameworks) {
        if (!pkg.scope.frameworks.includes(context.framework)) {
          return false;
        }
      }

      return true;
    });
  }
}
