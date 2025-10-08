/**
 * KnowledgeSystem - Unified Knowledge Facade
 *
 * Provides a single interface to access all accumulated knowledge:
 * - Patterns (coding patterns, anti-patterns)
 * - ADRs (architectural decisions)
 * - Learnings (lessons from experience)
 *
 * This is the PRIMARY interface for prompt enhancement.
 * Knowledge is retrieved based on context and relevance.
 *
 * Architecture:
 * - Facade pattern over existing intelligence systems
 * - Context-aware relevance scoring
 * - Simple keyword matching for MVP (can be enhanced later)
 */

import { PatternSystem, EnginePattern } from './patterns';
import { ADRSystem, ADR } from './adrs';
import { LearningSystem, LearningPattern } from './learning';
import { ContextManager } from '../context/ContextManager';
import {
  Knowledge,
  PatternKnowledge,
  ADRKnowledge,
  LearningKnowledge,
  ContextRuleKnowledge,
  KnowledgeSummary,
  CategoryCount,
  KnowledgeContext,
  KnowledgeQueryOptions
} from './types';
import {
  PackageManager,
  PackageHierarchy,
  ConflictResolver,
  ComplianceValidator,
  type ExpertisePackage,
  type ExpertiseRule,
  type ExpertisePattern,
  type PlanningTemplate,
  type MergedPackageContent,
  type ComplianceContext,
  type ValidationResult
} from '../expertise';

/**
 * KnowledgeSystem Configuration
 */
export interface KnowledgeSystemConfig {
  /** Maximum patterns to return */
  maxPatterns?: number;

  /** Maximum ADRs to return */
  maxADRs?: number;

  /** Maximum learnings to return */
  maxLearnings?: number;

  /** Minimum relevance score (0.0-1.0) */
  minRelevance?: number;

  /** PackageManager instance (optional - for expertise packages) */
  packageManager?: PackageManager;

  /** Storage path for packages (if creating new PackageManager) */
  packageStoragePath?: string;
}

/**
 * KnowledgeSystem
 * Unified interface for accessing accumulated knowledge
 */
export class KnowledgeSystem {
  private config: Required<Omit<KnowledgeSystemConfig, 'packageManager' | 'packageStoragePath'>>;
  private packageManager?: PackageManager;
  private packageHierarchy: PackageHierarchy;
  private conflictResolver: ConflictResolver;
  private complianceValidator: ComplianceValidator;

  constructor(
    private patterns: PatternSystem,
    private adrs: ADRSystem,
    private learnings: LearningSystem,
    private context?: ContextManager,  // Phase 2: Optional context manager
    config: KnowledgeSystemConfig = {}
  ) {
    // Default configuration
    this.config = {
      maxPatterns: config.maxPatterns || 5,
      maxADRs: config.maxADRs || 3,
      maxLearnings: config.maxLearnings || 3,
      minRelevance: config.minRelevance || 0.3
    };

    // Initialize package support
    if (config.packageManager) {
      this.packageManager = config.packageManager;
    } else if (config.packageStoragePath) {
      this.packageManager = new PackageManager(config.packageStoragePath);
    }

    this.packageHierarchy = new PackageHierarchy();
    this.conflictResolver = new ConflictResolver();
    this.complianceValidator = new ComplianceValidator(this.packageHierarchy, this.conflictResolver);
  }

  /**
   * Get knowledge relevant to a specific context
   * This is the PRIMARY method for prompt enhancement
   */
  async getRelevantKnowledge(context: KnowledgeContext | string, projectPath?: string): Promise<Knowledge> {
    const contextStr = typeof context === 'string' ? context : this.contextToString(context);

    const [patterns, adrs, learnings] = await Promise.all([
      this.findRelevantPatterns(contextStr),
      this.findRelevantADRs(contextStr),
      this.findSimilarLearnings(contextStr)
    ]);

    // Phase 2: Add context rules if context manager is available
    let contextRules: ContextRuleKnowledge[] = [];
    if (this.context && projectPath) {
      const keywords = this.extractKeywords(contextStr);
      const rules = this.context.getRulesForContext(projectPath, keywords);

      // Convert to ContextRuleKnowledge format
      contextRules = rules.map(rule => ({
        id: rule.id,
        rule: rule.rule,
        source: rule.source,
        confidence: rule.confidence,
        appliedCount: rule.appliedCount,
        createdAt: rule.createdAt,
        lastApplied: rule.lastApplied,
        relevanceScore: rule.confidence // Use confidence as relevance score
      }));
    }

    return {
      patterns,
      adrs,
      learnings,
      contextRules
    };
  }

  /**
   * Get knowledge summary for UI display
   */
  async getSummary(): Promise<KnowledgeSummary> {
    const [patterns, adrs, learnings] = await Promise.all([
      this.patterns.getPatterns(),
      this.adrs.getADRs(),
      this.learnings.getPatterns()
    ]);

    return {
      totalPatterns: patterns.length,
      totalADRs: adrs.length,
      totalLearnings: learnings.length,
      recentADRs: this.extractRecentADRs(adrs, 5),
      topPatternCategories: this.calculateTopCategories(patterns, 5),
      topLearningCategories: this.calculateTopLearningCategories(learnings, 5),
      lastUpdated: new Date()
    };
  }

  /**
   * Query knowledge with options
   */
  async queryKnowledge(options: KnowledgeQueryOptions): Promise<Knowledge> {
    // For now, delegate to getRelevantKnowledge
    // Future: implement full query options
    const context = options.categories?.join(' ') || '';
    return this.getRelevantKnowledge(context);
  }

  // ========================================
  // Package Management Methods
  // ========================================

  /**
   * Load expertise package
   */
  async loadPackage(pkg: ExpertisePackage): Promise<void> {
    if (!this.packageManager) {
      throw new Error('PackageManager not initialized');
    }
    await this.packageManager.loadPackage(pkg);
  }

  /**
   * Load package from JSON file
   */
  async loadPackageFromFile(filePath: string): Promise<ExpertisePackage> {
    if (!this.packageManager) {
      throw new Error('PackageManager not initialized');
    }
    return await this.packageManager.loadPackageFromJSON(filePath);
  }

  /**
   * Get all loaded packages
   */
  getLoadedPackages(): ExpertisePackage[] {
    if (!this.packageManager) {
      return [];
    }
    return this.packageManager.getAllPackages();
  }

  /**
   * Get merged package content (respecting authority hierarchy)
   */
  getMergedPackages(): MergedPackageContent {
    const packages = this.getLoadedPackages();
    return this.packageHierarchy.mergePackages(packages);
  }

  /**
   * Get mandatory rules from all packages
   */
  getMandatoryRules(): ExpertiseRule[] {
    const packages = this.getLoadedPackages();
    return this.packageHierarchy.getMandatoryRules(packages);
  }

  /**
   * Get recommended rules from all packages
   */
  getRecommendedRules(): ExpertiseRule[] {
    const packages = this.getLoadedPackages();
    return this.packageHierarchy.getRecommendedRules(packages);
  }

  /**
   * Get planning templates that match a user prompt
   */
  getMatchingPlanningTemplates(userPrompt: string): PlanningTemplate[] {
    const packages = this.getLoadedPackages();
    return this.packageHierarchy.getMatchingTemplates(packages, userPrompt);
  }

  /**
   * Get patterns from packages (merged with authority hierarchy)
   */
  getPackagePatterns(): ExpertisePattern[] {
    const merged = this.getMergedPackages();
    return merged.patterns;
  }

  /**
   * Get rules from packages (merged with authority hierarchy)
   */
  getPackageRules(): ExpertiseRule[] {
    const merged = this.getMergedPackages();
    return merged.rules;
  }

  /**
   * Filter packages by scope (project, language, framework)
   */
  getPackagesByScope(context: {
    project?: string;
    language?: string;
    framework?: string;
  }): ExpertisePackage[] {
    const packages = this.getLoadedPackages();
    return this.conflictResolver.filterByScope(packages, context);
  }

  /**
   * Get package statistics
   */
  getPackageStats(): {
    totalPackages: number;
    totalRules: number;
    totalPatterns: number;
    totalTemplates: number;
    byAuthority: Record<string, number>;
    byEnforcement: Record<string, number>;
  } {
    const packages = this.getLoadedPackages();
    const merged = this.getMergedPackages();

    const byAuthority: Record<string, number> = {};
    const byEnforcement: Record<string, number> = {};

    for (const pkg of packages) {
      byAuthority[pkg.authority] = (byAuthority[pkg.authority] || 0) + 1;
      byEnforcement[pkg.enforcement] = (byEnforcement[pkg.enforcement] || 0) + 1;
    }

    return {
      totalPackages: packages.length,
      totalRules: merged.rules.length,
      totalPatterns: merged.patterns.length,
      totalTemplates: merged.planningTemplates.length,
      byAuthority,
      byEnforcement
    };
  }

  // ========================================
  // Compliance Validation Methods
  // ========================================

  /**
   * Validate code against loaded packages
   */
  validateCode(
    code: string,
    context: ComplianceContext = {}
  ): ValidationResult {
    const packages = this.getLoadedPackages();
    return this.complianceValidator.validateAgainstPackages(code, packages, context);
  }

  /**
   * Validate a file against loaded packages
   */
  validateFile(
    filePath: string,
    code: string,
    context: Omit<ComplianceContext, 'filePath'> = {}
  ): ValidationResult {
    const packages = this.getLoadedPackages();
    return this.complianceValidator.validateFile(filePath, code, packages, context);
  }

  /**
   * Apply auto-fixes to code
   */
  applyAutoFixes(code: string, validationResult: ValidationResult): string {
    return this.complianceValidator.applyAutoFixes(code, validationResult.violations);
  }

  /**
   * Get the ComplianceValidator instance
   */
  getComplianceValidator(): ComplianceValidator {
    return this.complianceValidator;
  }

  // ========================================
  // Private Helper Methods
  // ========================================

  /**
   * Convert KnowledgeContext to search string
   */
  private contextToString(context: KnowledgeContext): string {
    const parts: string[] = [];

    if (context.prompt) parts.push(context.prompt);
    if (context.keywords) parts.push(...context.keywords);
    if (context.errors) parts.push(...context.errors);
    if (context.languages) parts.push(...context.languages);
    if (context.filePaths) {
      // Extract file names/extensions for matching
      const fileInfo = context.filePaths.map(fp => {
        const parts = fp.split('/');
        return parts[parts.length - 1]; // filename
      });
      parts.push(...fileInfo);
    }

    return parts.join(' ');
  }

  /**
   * Extract keywords from context string (Phase 2)
   * Simple word extraction - can be enhanced with NLP later
   */
  private extractKeywords(contextStr: string): string[] {
    // Split on whitespace and common delimiters
    const words = contextStr
      .toLowerCase()
      .split(/[\s,;.!?(){}[\]]+/)
      .filter(word => word.length > 3); // Filter out short words

    // Remove duplicates
    return Array.from(new Set(words));
  }

  /**
   * Find patterns relevant to context
   */
  private async findRelevantPatterns(context: string): Promise<PatternKnowledge[]> {
    const allPatterns = this.patterns.getPatterns();
    const contextLower = context.toLowerCase();

    return allPatterns
      .map(p => this.convertToPatternKnowledge(p, contextLower))
      .filter(p => (p.relevanceScore || 0) > this.config.minRelevance)
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, this.config.maxPatterns);
  }

  /**
   * Find ADRs relevant to context
   */
  private async findRelevantADRs(context: string): Promise<ADRKnowledge[]> {
    const allADRs = await this.adrs.getADRs();
    const contextLower = context.toLowerCase();

    // Filter by accepted/proposed status (active ADRs)
    const activeADRs = allADRs.filter(a =>
      a.status === 'accepted' || a.status === 'proposed'
    );

    return activeADRs
      .map(adr => this.convertToADRKnowledge(adr, contextLower))
      .filter(a => (a.relevanceScore || 0) > this.config.minRelevance)
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, this.config.maxADRs);
  }

  /**
   * Find learnings similar to context
   */
  private async findSimilarLearnings(context: string): Promise<LearningKnowledge[]> {
    const allLearnings = await this.learnings.getPatterns();
    const contextLower = context.toLowerCase();
    const keywords = contextLower.split(/[\s\-._/]+/).filter(k => k.length > 2);

    return allLearnings
      .filter(l => {
        const learningName = l.name?.toLowerCase() || '';
        const learningDesc = l.description?.toLowerCase() || '';
        const learningCat = l.category?.toLowerCase() || '';

        // Check if any keyword matches
        return keywords.some(keyword =>
          learningName.includes(keyword) ||
          learningDesc.includes(keyword) ||
          learningCat.includes(keyword)
        );
      })
      .map(l => this.convertToLearningKnowledge(l))
      .sort((a, b) => b.confidenceScore - a.confidenceScore)
      .slice(0, this.config.maxLearnings);
  }

  /**
   * Convert engine pattern to PatternKnowledge with relevance
   */
  private convertToPatternKnowledge(pattern: EnginePattern, contextLower: string): PatternKnowledge {
    return {
      id: pattern.id,
      name: pattern.name,
      description: pattern.description || '',
      category: pattern.category || 'uncategorized',
      severity: pattern.severity as any,
      relevanceScore: this.calculatePatternRelevance(pattern, contextLower)
    };
  }

  /**
   * Convert ADR to ADRKnowledge with relevance
   */
  private convertToADRKnowledge(adr: ADR, contextLower: string): ADRKnowledge {
    return {
      id: adr.id,
      number: adr.number,
      title: adr.title,
      status: adr.status as any,
      date: adr.timestamp,
      context: adr.context,
      decision: adr.decision,
      consequences: adr.consequences,
      relevanceScore: this.calculateADRRelevance(adr, contextLower),
      supersedes: adr.supersedes ? [parseInt(adr.supersedes.split('-')[1])] : undefined,
      supersededBy: adr.supersededBy ? [parseInt(adr.supersededBy.split('-')[1])] : undefined,
      tags: adr.tags
    };
  }

  /**
   * Convert learning pattern to LearningKnowledge
   */
  private convertToLearningKnowledge(learning: LearningPattern): LearningKnowledge {
    return {
      id: learning.id || `learning-${Date.now()}`,
      name: learning.name || learning.description || 'Unnamed Learning',
      description: learning.description || '',
      category: learning.category || 'uncategorized',
      occurrences: learning.occurrences || 1,
      confidenceScore: learning.confidenceScore || 0.5,
      rootCause: learning.rootCause,
      preventionRule: learning.preventionRule,
      lastUpdated: learning.createdAt
    };
  }

  /**
   * Calculate pattern relevance score (0-1)
   */
  private calculatePatternRelevance(pattern: EnginePattern, contextLower: string): number {
    let score = 0;
    // Split on whitespace, hyphens, dots, slashes to extract meaningful keywords
    const keywords = contextLower.split(/[\s\-._/]+/).filter(k => k.length > 2);

    const patternName = pattern.name.toLowerCase();
    const patternDesc = pattern.description?.toLowerCase() || '';
    const patternCat = pattern.category?.toLowerCase() || '';

    // Also split pattern fields into words for matching
    const patternNameWords = patternName.split(/[\s\-._/]+/).filter(k => k.length > 2);
    const patternCatWords = patternCat.split(/[\s\-._/]+/).filter(k => k.length > 2);

    for (const keyword of keywords) {
      // Name match (high weight) - check both containment and word match
      if (patternName.includes(keyword) || patternNameWords.some(w => w.includes(keyword) || keyword.includes(w))) {
        score += 0.5;
      }

      // Description match (medium weight)
      if (patternDesc.includes(keyword)) {
        score += 0.3;
      }

      // Category match (low weight) - check both containment and word match
      if (patternCat.includes(keyword) || patternCatWords.some(w => w.includes(keyword) || keyword.includes(w))) {
        score += 0.2;
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * Calculate ADR relevance score (0-1)
   */
  private calculateADRRelevance(adr: ADR, contextLower: string): number {
    let score = 0;
    // Split on whitespace, hyphens, dots, slashes to extract meaningful keywords
    const keywords = contextLower.split(/[\s\-._/]+/).filter(k => k.length > 2);

    const adrTitle = adr.title.toLowerCase();
    const adrContext = adr.context.toLowerCase();
    const adrDecision = adr.decision.toLowerCase();
    const adrTags = (adr.tags || []).map(t => t.toLowerCase());

    for (const keyword of keywords) {
      // Title match (high weight)
      if (adrTitle.includes(keyword)) {
        score += 0.5;
      }

      // Context/decision match (medium weight)
      if (adrContext.includes(keyword) || adrDecision.includes(keyword)) {
        score += 0.3;
      }

      // Tags match (low weight)
      if (adrTags.some(tag => tag.includes(keyword))) {
        score += 0.2;
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * Extract recent ADRs
   */
  private extractRecentADRs(adrs: ADR[], count: number): ADRKnowledge[] {
    return adrs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, count)
      .map(adr => ({
        id: adr.id,
        number: adr.number,
        title: adr.title,
        status: adr.status as any,
        date: adr.timestamp,
        context: adr.context,
        decision: adr.decision
      }));
  }

  /**
   * Calculate top pattern categories
   */
  private calculateTopCategories(patterns: EnginePattern[], count: number): CategoryCount[] {
    const counts = new Map<string, number>();

    for (const pattern of patterns) {
      const category = pattern.category || 'uncategorized';
      counts.set(category, (counts.get(category) || 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, count);
  }

  /**
   * Calculate top learning categories
   */
  private calculateTopLearningCategories(learnings: LearningPattern[], count: number): CategoryCount[] {
    const counts = new Map<string, number>();

    for (const learning of learnings) {
      const category = learning.category || 'uncategorized';
      counts.set(category, (counts.get(category) || 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, count);
  }
}
