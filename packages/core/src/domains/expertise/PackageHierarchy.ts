/**
 * Package Hierarchy
 *
 * Manages authority-based prioritization of expertise packages
 * Implements the package hierarchy system where higher authority packages
 * override lower authority packages
 */

import type {
  ExpertisePackage,
  AuthorityLevel,
  EnforcementLevel,
  ExpertiseRule,
  ExpertisePattern,
  PlanningTemplate
} from './types';

/**
 * Authority precedence (highest to lowest)
 */
const AUTHORITY_PRECEDENCE: AuthorityLevel[] = [
  'organizational',
  'domain-expert',
  'vendor-spec',
  'community'
];

/**
 * Enforcement precedence (highest to lowest)
 */
const ENFORCEMENT_PRECEDENCE: EnforcementLevel[] = [
  'mandatory',
  'recommended',
  'optional'
];

/**
 * Merged package result
 */
export interface MergedPackageContent {
  /** Merged rules from all packages */
  rules: ExpertiseRule[];

  /** Merged patterns from all packages */
  patterns: ExpertisePattern[];

  /** Merged planning templates from all packages */
  planningTemplates: PlanningTemplate[];

  /** Packages that contributed to this merge */
  sourcePackages: string[];

  /** Conflicts that were resolved */
  resolvedConflicts: Array<{
    type: 'rule' | 'pattern' | 'template';
    id: string;
    winner: string;  // Package ID
    loser: string;   // Package ID
    reason: string;
  }>;
}

export class PackageHierarchy {
  /**
   * Merge multiple packages according to authority hierarchy
   */
  mergePackages(packages: ExpertisePackage[]): MergedPackageContent {
    // Sort packages by authority (highest first)
    const sortedPackages = this.sortByAuthority(packages);

    const result: MergedPackageContent = {
      rules: [],
      patterns: [],
      planningTemplates: [],
      sourcePackages: sortedPackages.map(p => p.id),
      resolvedConflicts: []
    };

    // Track what we've added to detect conflicts
    const ruleIds = new Set<string>();
    const patternIds = new Set<string>();
    const templateIds = new Set<string>();

    // Merge in order (highest authority first)
    for (const pkg of sortedPackages) {
      // Merge rules
      for (const rule of pkg.rules) {
        if (!ruleIds.has(rule.id)) {
          result.rules.push(rule);
          ruleIds.add(rule.id);
        } else {
          // Conflict - rule already exists from higher authority
          const existingRule = result.rules.find(r => r.id === rule.id);
          if (existingRule) {
            result.resolvedConflicts.push({
              type: 'rule',
              id: rule.id,
              winner: sortedPackages.find(p => p.rules.includes(existingRule))?.id || 'unknown',
              loser: pkg.id,
              reason: 'Higher authority package takes precedence'
            });
          }
        }
      }

      // Merge patterns
      for (const pattern of pkg.patterns) {
        if (!patternIds.has(pattern.id)) {
          result.patterns.push(pattern);
          patternIds.add(pattern.id);
        } else {
          const existingPattern = result.patterns.find(p => p.id === pattern.id);
          if (existingPattern) {
            result.resolvedConflicts.push({
              type: 'pattern',
              id: pattern.id,
              winner: sortedPackages.find(p => p.patterns.includes(existingPattern))?.id || 'unknown',
              loser: pkg.id,
              reason: 'Higher authority package takes precedence'
            });
          }
        }
      }

      // Merge planning templates
      for (const template of pkg.planningTemplates) {
        if (!templateIds.has(template.id)) {
          result.planningTemplates.push(template);
          templateIds.add(template.id);
        } else {
          const existingTemplate = result.planningTemplates.find(t => t.id === template.id);
          if (existingTemplate) {
            result.resolvedConflicts.push({
              type: 'template',
              id: template.id,
              winner: sortedPackages.find(p => p.planningTemplates.includes(existingTemplate))?.id || 'unknown',
              loser: pkg.id,
              reason: 'Higher authority package takes precedence'
            });
          }
        }
      }
    }

    return result;
  }

  /**
   * Sort packages by authority (highest first)
   */
  sortByAuthority(packages: ExpertisePackage[]): ExpertisePackage[] {
    return [...packages].sort((a, b) => {
      // First sort by authority
      const authA = AUTHORITY_PRECEDENCE.indexOf(a.authority);
      const authB = AUTHORITY_PRECEDENCE.indexOf(b.authority);

      if (authA !== authB) {
        return authA - authB;  // Lower index = higher authority
      }

      // If same authority, sort by enforcement
      const enfA = ENFORCEMENT_PRECEDENCE.indexOf(a.enforcement);
      const enfB = ENFORCEMENT_PRECEDENCE.indexOf(b.enforcement);

      return enfA - enfB;  // Lower index = higher enforcement
    });
  }

  /**
   * Get authority rank (higher number = higher authority)
   */
  getAuthorityRank(level: AuthorityLevel): number {
    const index = AUTHORITY_PRECEDENCE.indexOf(level);
    return AUTHORITY_PRECEDENCE.length - index;
  }

  /**
   * Get enforcement rank (higher number = stricter enforcement)
   */
  getEnforcementRank(level: EnforcementLevel): number {
    const index = ENFORCEMENT_PRECEDENCE.indexOf(level);
    return ENFORCEMENT_PRECEDENCE.length - index;
  }

  /**
   * Filter packages by minimum authority level
   */
  filterByMinimumAuthority(
    packages: ExpertisePackage[],
    minimumAuthority: AuthorityLevel
  ): ExpertisePackage[] {
    const minRank = this.getAuthorityRank(minimumAuthority);
    return packages.filter(pkg => {
      return this.getAuthorityRank(pkg.authority) >= minRank;
    });
  }

  /**
   * Filter packages by enforcement level
   */
  filterByEnforcement(
    packages: ExpertisePackage[],
    enforcement: EnforcementLevel
  ): ExpertisePackage[] {
    return packages.filter(pkg => pkg.enforcement === enforcement);
  }

  /**
   * Get mandatory rules from all packages
   */
  getMandatoryRules(packages: ExpertisePackage[]): ExpertiseRule[] {
    const mandatoryPackages = this.filterByEnforcement(packages, 'mandatory');
    const merged = this.mergePackages(mandatoryPackages);
    return merged.rules;
  }

  /**
   * Get recommended rules from all packages
   */
  getRecommendedRules(packages: ExpertisePackage[]): ExpertiseRule[] {
    const recommendedPackages = this.filterByEnforcement(packages, 'recommended');
    const merged = this.mergePackages(recommendedPackages);
    return merged.rules;
  }

  /**
   * Get planning templates that match a trigger pattern
   */
  getMatchingTemplates(
    packages: ExpertisePackage[],
    userPrompt: string
  ): PlanningTemplate[] {
    const merged = this.mergePackages(packages);

    return merged.planningTemplates.filter(template => {
      return template.triggerPatterns.some(pattern => {
        // Simple case-insensitive substring match
        return userPrompt.toLowerCase().includes(pattern.toLowerCase());
      });
    });
  }

  /**
   * Check if a package can override another
   */
  canOverride(pkg1: ExpertisePackage, pkg2: ExpertisePackage): boolean {
    const rank1 = this.getAuthorityRank(pkg1.authority);
    const rank2 = this.getAuthorityRank(pkg2.authority);

    if (rank1 !== rank2) {
      return rank1 > rank2;
    }

    // Same authority - check enforcement
    const enf1 = this.getEnforcementRank(pkg1.enforcement);
    const enf2 = this.getEnforcementRank(pkg2.enforcement);

    return enf1 > enf2;
  }
}
