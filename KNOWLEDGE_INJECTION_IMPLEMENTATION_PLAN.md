# Knowledge Injection Upgrade - Implementation Plan
## Enterprise Package System Integration

**Created**: 2025-10-07
**Version**: 2.0 (Refined with Real Package Examples)
**Status**: Ready for Implementation
**Estimated Duration**: 5 weeks (25 days)

---

## Executive Summary

This plan implements the **Expertise Package System** to transform Agent Brain from a team learning tool into an Enterprise Knowledge Platform. The implementation is based on:

1. **Real package structure** from `docs/agent_brain_intelligence/agentbrain-expertise-package.json`
2. **Actual planning templates** from `agentbrain-planning-templates.md`
3. **Existing patterns, ADRs, and golden paths** as first use case
4. **Stage 5 enhancement** integrating with current Stage 1-4 architecture

---

## Current Architecture (Phase 3 Complete)

```
Enhancement Flow:
User Prompt → Stage 4 (Success) → Stage 3 (Templates) → Stage 2 (Patterns) → Stage 1 (Context)

Knowledge Domain:
├─ patterns/ (code patterns)
├─ adrs/ (architectural decisions)
├─ learning/ (session learnings)
├─ success/ (success patterns) ← Phase 3
└─ KnowledgeSystem (facade)
```

---

## Target Architecture (After Implementation)

```
Enhancement Flow:
User Prompt → Stage 5 (Packages) → Stage 4 (Success) → Stage 3 → Stage 2 → Stage 1

Knowledge Domain:
├─ patterns/
├─ adrs/
├─ learning/
├─ success/
├─ expertise/ ← NEW
│  ├─ ExpertisePackage.ts
│  ├─ PackageManager.ts
│  ├─ PackageHierarchy.ts
│  ├─ ComplianceValidator.ts
│  ├─ MarkdownConverter.ts
│  └─ PackageAnalytics.ts
├─ planning/ ← NEW
│  ├─ PlanningEngine.ts
│  └─ PlanValidator.ts
└─ KnowledgeSystem (extended)
```

---

## Package Structure (From Real agentbrain-expertise-package.json)

```json
{
  "id": "com.agentbrain.self-improvement",
  "name": "Agent Brain Self-Improvement Package",
  "authority": "organizational",
  "enforcement": "recommended",
  "scope": { "projects": [...], "languages": [...] },

  "rules": [
    {
      "id": "honest-enhancement",
      "category": "architecture",
      "severity": "error",
      "condition": { "patterns": [...], "context": [...] },
      "requirement": "...",
      "rationale": "...",
      "autoFix": { "replacements": {...} }
    }
  ],

  "patterns": [...],
  "planningTemplates": [...],
  "validationCriteria": [...],
  "examples": [...]
}
```

---

## 5-Week Implementation Plan

### **WEEK 1: Package Infrastructure + Loader**

**Goal**: Build foundation to load existing Agent Brain intelligence packages

#### **Day 1: Core Types (Matching Real Structure)**

**CREATE: `packages/core/src/domains/expertise/types.ts`**

Define types matching the actual package JSON:

```typescript
export interface ExpertisePackage {
  // Metadata
  id: string;
  name: string;
  version: string;
  description: string;
  author: ExpertiseAuthor;
  domain: string;

  // Authority & Enforcement
  authority: 'organizational' | 'domain-expert' | 'vendor-spec' | 'community';
  enforcement: 'mandatory' | 'recommended' | 'optional';
  scope: PackageScope;

  // Content
  rules: ExpertiseRule[];
  patterns: ExpertisePattern[];
  planningTemplates: PlanningTemplate[];
  validationCriteria: ValidationCriterion[];
  examples: CodeExample[];

  // Behavior
  metadata: PackageMetadata;
  conflicts: string[];
  dependencies: string[];
  overrides: 'supplement' | 'replace' | 'merge';
}

export interface ExpertiseRule {
  id: string;
  name: string;
  category: string;
  severity: 'error' | 'warning' | 'info';
  description: string;

  condition: {
    patterns: string[];  // Regex patterns
    context: string[];   // Context types
  };

  requirement: string;
  rationale: string;
  validation?: string;

  autoFix?: {
    replacements?: Record<string, string>;
    transform?: string;
  };

  examples?: {
    good?: string;
    bad?: string;
  };
}

export interface ExpertisePattern {
  id: string;
  name: string;
  description: string;
  template: string;
  when: string;
  benefits: string[];
}

export interface PlanningTemplate {
  id: string;
  name: string;
  triggerPatterns: string[];
  sections: PlanningSection[];
  completionCriteria: string[];
}

export interface PlanningSection {
  id: string;
  title: string;
  required: boolean;
  prompt: string;
  validation?: string;
}
```

**Tasks**:
- [ ] Create types.ts with all interfaces
- [ ] Create index.ts exporting types
- [ ] Validate against actual JSON structure

---

#### **Day 2: Package Manager + Markdown Loader**

**CREATE: `packages/core/src/domains/expertise/PackageManager.ts`**

```typescript
export class PackageManager {
  private packages: Map<string, ExpertisePackage> = new Map();
  private storagePath: string;

  constructor(storagePath: string) {
    this.storagePath = path.join(storagePath, 'packages');
  }

  async loadPackageFromJSON(filePath: string): Promise<ExpertisePackage>
  async loadPackageFromURL(url: string): Promise<ExpertisePackage>
  validatePackage(pkg: ExpertisePackage): ValidationResult
  getAllPackages(): ExpertisePackage[]
  getPackageById(id: string): ExpertisePackage | null
  async savePackage(pkg: ExpertisePackage): Promise<void>
}
```

**CREATE: `packages/core/src/domains/expertise/MarkdownConverter.ts`**

Converts Markdown files to ExpertisePackage format:

```typescript
export class MarkdownConverter {
  convertADRsToPackage(markdown: string): ExpertisePackage
  convertPatternsToPackage(markdown: string): ExpertisePackage
  convertGoldenPathsToPackage(markdown: string): ExpertisePackage
  convertPlanningTemplatesToPackage(markdown: string): ExpertisePackage
}
```

**Tasks**:
- [ ] Implement PackageManager
- [ ] Implement MarkdownConverter for ADRs
- [ ] Implement MarkdownConverter for Patterns
- [ ] Implement MarkdownConverter for Golden Paths
- [ ] Implement MarkdownConverter for Planning Templates
- [ ] Test loading all docs/agent_brain_intelligence files

---

#### **Day 3: Package Hierarchy**

**CREATE: `packages/core/src/domains/expertise/PackageHierarchy.ts`**

```typescript
export class PackageHierarchy {
  private packages: Map<string, ExpertisePackage> = new Map();
  private authorityOrder = ['organizational', 'domain-expert', 'vendor-spec', 'community'];

  add(pkg: ExpertisePackage): void
  remove(pkgId: string): void
  inOrder(): ExpertisePackage[]

  getApplicablePackages(context: {
    projectId?: string;
    language?: string;
    framework?: string;
  }): ExpertisePackage[]
}
```

**CREATE: `packages/core/src/domains/expertise/ConflictResolver.ts`**

```typescript
export class ConflictResolver {
  detectConflicts(newPkg: ExpertisePackage, existing: ExpertisePackage[]): Conflict[]
  resolveConflicts(conflicts: Conflict[], strategy: 'authority' | 'user-choice'): Resolution
}
```

**Tasks**:
- [ ] Implement hierarchy with authority ordering
- [ ] Implement conflict detection
- [ ] Test with multiple packages

---

#### **Day 4: Extend KnowledgeSystem**

**MODIFY: `packages/core/src/domains/knowledge/KnowledgeSystem.ts`**

Add package management capabilities:

```typescript
export class KnowledgeSystem {
  private packageManager: PackageManager;
  private packageHierarchy: PackageHierarchy;

  // NEW methods
  async loadPackage(source: string | ExpertisePackage): Promise<void>
  getApplicableRules(context: Context): ExpertiseRule[]
  getMandatoryRules(context: Context): ExpertiseRule[]
  getApplicablePatterns(context: Context): ExpertisePattern[]
  getPlanningTemplate(prompt: string): PlanningTemplate | null
  validateCode(code: string, context: Context): ValidationResult
}
```

**MODIFY: `packages/core/src/domains/knowledge/types.ts`**

Add package knowledge:

```typescript
export interface Knowledge {
  patterns: PatternKnowledge[];
  adrs: ADRKnowledge[];
  learnings: LearningKnowledge[];
  packages: PackageKnowledge[];  // NEW
}

export interface PackageKnowledge {
  packageId: string;
  packageName: string;
  authority: string;
  enforcement: string;
  rulesApplied: string[];
  patternsAvailable: string[];
}
```

**Tasks**:
- [ ] Extend KnowledgeSystem with package methods
- [ ] Update types
- [ ] Test package loading integration

---

#### **Day 5: Intelligence Package Loader Script**

**CREATE: `packages/core/scripts/load-intelligence-packages.ts`**

```typescript
async function loadIntelligencePackages() {
  const manager = new PackageManager('.agent-brain');
  const converter = new MarkdownConverter();

  // 1. Load main expertise package
  await manager.loadPackageFromJSON(
    'docs/agent_brain_intelligence/agentbrain-expertise-package.json'
  );

  // 2. Load ADRs
  const adrsPackage = converter.convertADRsToPackage(
    fs.readFileSync('docs/agent_brain_intelligence/agentbrain-adrs.md', 'utf8')
  );
  await manager.savePackage(adrsPackage);

  // 3. Load Patterns
  const patternsPackage = converter.convertPatternsToPackage(
    fs.readFileSync('docs/agent_brain_intelligence/agentbrain-patterns.md', 'utf8')
  );
  await manager.savePackage(patternsPackage);

  // 4. Load Golden Paths
  const goldenPathsPackage = converter.convertGoldenPathsToPackage(
    fs.readFileSync('docs/agent_brain_intelligence/agentbrain-golden-paths.md', 'utf8')
  );
  await manager.savePackage(goldenPathsPackage);

  // 5. Load Planning Templates
  const templatesPackage = converter.convertPlanningTemplatesToPackage(
    fs.readFileSync('docs/agent_brain_intelligence/agentbrain-planning-templates.md', 'utf8')
  );
  await manager.savePackage(templatesPackage);

  console.log('✅ All intelligence packages loaded');
}
```

**Tasks**:
- [ ] Create loader script
- [ ] Add npm script: `"load-intelligence": "ts-node scripts/load-intelligence-packages.ts"`
- [ ] Run and verify all packages load
- [ ] Verify storage in `.agent-brain/packages/`

**Week 1 Deliverable**: All Agent Brain intelligence packages loaded successfully

---

### **WEEK 2: Planning Templates + Stage 5**

**Goal**: Enable planning template enforcement and create Stage 5 enhancement

#### **Day 6: Planning Engine**

**CREATE: `packages/core/src/domains/planning/PlanningEngine.ts`**

```typescript
export class PlanningEngine {
  private templates: Map<string, PlanningTemplate> = new Map();

  selectTemplate(prompt: string, context: Context): PlanningTemplate | null {
    // Match trigger patterns against prompt
    for (const template of this.templates.values()) {
      for (const pattern of template.triggerPatterns) {
        if (new RegExp(pattern, 'i').test(prompt)) {
          return template;
        }
      }
    }
    return null;
  }

  enforcePlanning(prompt: string, template: PlanningTemplate): string {
    return `
MANDATORY: Before implementing, create a detailed plan following this structure:

${this.renderTemplate(template)}

Only after completing all required sections above, proceed with implementation.

Original request: ${prompt}
    `;
  }

  private renderTemplate(template: PlanningTemplate): string {
    return template.sections.map(section => `
## ${section.title}${section.required ? ' [REQUIRED]' : ' [OPTIONAL]'}

${section.prompt}

${section.validation ? `Validation: ${section.validation}` : ''}
    `).join('\n');
  }
}
```

**CREATE: `packages/core/src/domains/planning/types.ts`**

**CREATE: `packages/core/src/domains/planning/index.ts`**

**Tasks**:
- [ ] Implement PlanningEngine
- [ ] Test template matching
- [ ] Test prompt injection

---

#### **Day 7: Plan Validator**

**CREATE: `packages/core/src/domains/planning/PlanValidator.ts`**

```typescript
export class PlanValidator {
  validatePlanAdherence(
    aiResponse: string,
    template: PlanningTemplate
  ): PlanValidationResult {
    const sections = this.extractSections(aiResponse);
    const missing: string[] = [];
    const incomplete: string[] = [];

    // Check required sections
    for (const section of template.sections.filter(s => s.required)) {
      if (!sections.has(section.id)) {
        missing.push(section.title);
      }
    }

    // Check completion criteria
    const criteriaResults = this.checkCriteria(aiResponse, template.completionCriteria);

    return {
      valid: missing.length === 0,
      missingSections: missing,
      incompleteCriteria: template.completionCriteria.filter((_, i) => !criteriaResults[i]),
      score: this.calculateScore(sections.size, missing.length, criteriaResults)
    };
  }

  private extractSections(response: string): Map<string, string> {
    // Parse markdown headers to find sections
  }

  private checkCriteria(response: string, criteria: string[]): boolean[] {
    // Check each criterion against response
  }
}
```

**Tasks**:
- [ ] Implement plan validation
- [ ] Test with real AI responses
- [ ] Test completion criteria checking

---

#### **Day 8-9: Stage 5 Enhancement**

**CREATE: `packages/core/src/domains/enhancement/stages/Stage5_PackageEnhancer.ts`**

```typescript
import { Stage4_SuccessLearner } from './Stage4_SuccessLearner';
import { KnowledgeSystem } from '../../knowledge/KnowledgeSystem';
import { PlanningEngine } from '../../planning/PlanningEngine';

export class Stage5_PackageEnhancer extends Stage4_SuccessLearner {
  constructor(
    private knowledgeSystem: KnowledgeSystem,
    private planningEngine: PlanningEngine,
    successDetector?: SuccessPatternDetector,
    profileManager?: ProjectProfileManager
  ) {
    super(successDetector, profileManager);
  }

  enhance(prompt: string, context: EnhancementContext): string {
    let enhanced = prompt;
    const metadata: Stage5Metadata = {
      planningTemplate: undefined,
      mandatoryRulesApplied: [],
      packagesUsed: []
    };

    // 1. Check for planning template
    const template = this.planningEngine.selectTemplate(prompt, context);
    if (template) {
      enhanced = this.planningEngine.enforcePlanning(enhanced, template);
      metadata.planningTemplate = template.id;
    }

    // 2. Get mandatory rules
    const mandatoryRules = this.knowledgeSystem.getMandatoryRules(context);
    if (mandatoryRules.length > 0) {
      enhanced = this.injectMandatoryRules(enhanced, mandatoryRules);
      metadata.mandatoryRulesApplied = mandatoryRules.map(r => r.id);
    }

    // 3. Get applicable patterns from packages
    const patterns = this.knowledgeSystem.getApplicablePatterns(context);
    if (patterns.length > 0) {
      enhanced = this.injectPatterns(enhanced, patterns);
    }

    // 4. Track packages used
    const packages = this.knowledgeSystem.getApplicablePackages(context);
    metadata.packagesUsed = packages.map(p => p.id);

    // 5. Chain to Stage 4
    enhanced = super.enhance(enhanced, context);

    // Store metadata for result
    this.lastMetadata = metadata;

    return enhanced;
  }

  getMetadata(): Stage5Metadata {
    return this.lastMetadata;
  }

  private injectMandatoryRules(prompt: string, rules: ExpertiseRule[]): string {
    return `${prompt}

## MANDATORY REQUIREMENTS (Cannot be overridden):

${rules.map(r => `
### ${r.name}
**Requirement**: ${r.requirement}
**Rationale**: ${r.rationale}
${r.examples ? `
Good Example:
\`\`\`
${r.examples.good}
\`\`\`

Bad Example:
\`\`\`
${r.examples.bad}
\`\`\`
` : ''}
`).join('\n')}
`;
  }

  private injectPatterns(prompt: string, patterns: ExpertisePattern[]): string {
    return `${prompt}

## Recommended Patterns:

${patterns.map(p => `
### ${p.name}
**When to use**: ${p.when}
**Template**:
\`\`\`typescript
${p.template}
\`\`\`
**Benefits**: ${p.benefits.join(', ')}
`).join('\n')}
`;
  }
}
```

**MODIFY: `packages/core/src/domains/enhancement/PromptEnhancer.ts`**

```typescript
export class PromptEnhancer {
  private stage5: Stage5_PackageEnhancer | null = null;

  constructor(
    knowledgeSystem?: KnowledgeSystem,
    planningEngine?: PlanningEngine,
    successDetector?: SuccessPatternDetector,
    profileManager?: ProjectProfileManager
  ) {
    // Stage 5 is optional
    if (knowledgeSystem && planningEngine) {
      this.stage5 = new Stage5_PackageEnhancer(
        knowledgeSystem,
        planningEngine,
        successDetector,
        profileManager
      );
    } else if (successDetector && profileManager) {
      this.stage4 = new Stage4_SuccessLearner(successDetector, profileManager);
    }
  }

  async enhance(prompt: string, context: EnhancementContext): Promise<EnhancedPrompt> {
    let enhanced: string;
    let stage: number;
    let metadata: any = {};

    if (this.stage5) {
      enhanced = this.stage5.enhance(prompt, context);
      stage = 5;
      metadata = this.stage5.getMetadata();
    } else if (this.stage4) {
      enhanced = this.stage4.enhance(prompt, context);
      stage = 4;
    } else {
      enhanced = this.stage3.enhance(prompt, context);
      stage = 3;
    }

    return {
      original: prompt,
      enhanced,
      stage,
      ...metadata
    };
  }
}
```

**MODIFY: `packages/core/src/domains/enhancement/types.ts`**

```typescript
export interface EnhancedPrompt {
  original: string;
  enhanced: string;
  stage: number;
  itemsUsed: number;
  context: EnhancementContext;

  // Stage 4
  successPatternsApplied?: string[];

  // Stage 5 (NEW)
  packagesUsed?: string[];
  planningTemplate?: string;
  mandatoryRulesApplied?: string[];
}
```

**Tasks**:
- [ ] Implement Stage5_PackageEnhancer
- [ ] Update PromptEnhancer with Stage 5 support
- [ ] Update types
- [ ] Test Stage 5 with real package
- [ ] Test fallback to Stage 4

---

#### **Day 10: Planning UI Component**

**CREATE: `packages/core/src/domains/visualization/ui/PlanningGuide.ts`**

```typescript
export class PlanningGuide {
  private template: PlanningTemplate | null = null;

  show(template: PlanningTemplate): void {
    this.template = template;
    const container = document.getElementById('planning-guide-container');
    if (container) {
      container.innerHTML = this.render();
      container.style.display = 'block';
    }
  }

  private render(): string {
    if (!this.template) return '';

    return `
      <div class="planning-guide">
        <div class="guide-header">
          <h3>📋 Planning Required: ${this.template.name}</h3>
          <button class="close-btn">×</button>
        </div>

        <div class="guide-sections">
          ${this.template.sections.map(section => `
            <div class="section ${section.required ? 'required' : 'optional'}">
              <div class="section-header">
                <span class="section-title">${section.title}</span>
                ${section.required ? '<span class="badge">Required</span>' : ''}
              </div>
              <div class="section-prompt">${section.prompt}</div>
              ${section.validation ? `<div class="section-validation">Validation: ${section.validation}</div>` : ''}
              <input type="checkbox" class="section-complete" />
            </div>
          `).join('')}
        </div>

        <div class="completion-criteria">
          <h4>Completion Criteria:</h4>
          <ul>
            ${this.template.completionCriteria.map(c => `<li>${c}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  }
}
```

**CREATE: `packages/core/src/domains/visualization/styles/components/planning-guide.css`**

**Tasks**:
- [ ] Implement PlanningGuide component
- [ ] Create CSS styling
- [ ] Test with planning template

**Week 2 Deliverable**: Stage 5 enhancement working with planning templates

---

### **WEEK 3: Compliance Validation**

**Goal**: Real-time validation against package rules

#### **Day 11-12: Compliance Validator**

**CREATE: `packages/core/src/domains/expertise/ComplianceValidator.ts`**

```typescript
export class ComplianceValidator {
  constructor(
    private packageHierarchy: PackageHierarchy
  ) {}

  validateAgainstPackages(
    code: string,
    context: Context
  ): ValidationResult {
    const packages = this.packageHierarchy.getApplicablePackages(context);
    const violations: ValidationIssue[] = [];

    for (const pkg of packages) {
      for (const rule of pkg.rules) {
        if (this.shouldCheck(rule, pkg.enforcement, context)) {
          const violation = this.checkRule(code, rule);
          if (violation) {
            violations.push({
              ...violation,
              packageId: pkg.id,
              packageName: pkg.name,
              authority: pkg.authority
            });
          }
        }
      }
    }

    return {
      valid: violations.filter(v => v.severity === 'error').length === 0,
      violations,
      summary: this.createSummary(violations)
    };
  }

  private shouldCheck(rule: ExpertiseRule, enforcement: string, context: Context): boolean {
    if (enforcement === 'mandatory') return true;
    if (enforcement === 'recommended' && context.strictMode) return true;
    return false;
  }

  private checkRule(code: string, rule: ExpertiseRule): ValidationIssue | null {
    // Check if any pattern matches
    const matches = rule.condition.patterns.some(pattern =>
      new RegExp(pattern, 'i').test(code)
    );

    if (matches) {
      // Pattern found - check if requirement is met
      // For now, simple check - can be enhanced later
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        message: rule.requirement,
        rationale: rule.rationale,
        autoFix: rule.autoFix
      };
    }

    return null;
  }

  private createSummary(violations: ValidationIssue[]): ValidationSummary {
    return {
      total: violations.length,
      errors: violations.filter(v => v.severity === 'error').length,
      warnings: violations.filter(v => v.severity === 'warning').length,
      infos: violations.filter(v => v.severity === 'info').length
    };
  }
}
```

**Tasks**:
- [ ] Implement ComplianceValidator
- [ ] Test with sample code
- [ ] Test with multiple packages
- [ ] Test authority hierarchy

---

#### **Day 13: Compliance Monitor UI**

**CREATE: `packages/core/src/domains/visualization/ui/ComplianceMonitor.ts`**

```typescript
export class ComplianceMonitor {
  private violations: ValidationIssue[] = [];

  updateViolations(result: ValidationResult): void {
    this.violations = result.violations;
    this.render();
  }

  private render(): void {
    const container = document.getElementById('compliance-monitor');
    if (!container) return;

    container.innerHTML = `
      <div class="compliance-panel">
        <div class="panel-header">
          <h3>📊 Compliance Status</h3>
          ${this.renderSummary()}
        </div>

        ${this.violations.length > 0 ? `
          <div class="violations-list">
            ${this.renderViolations()}
          </div>
        ` : `
          <div class="no-violations">
            ✅ All mandatory rules satisfied
          </div>
        `}
      </div>
    `;
  }

  private renderSummary(): string {
    const errors = this.violations.filter(v => v.severity === 'error').length;
    const warnings = this.violations.filter(v => v.severity === 'warning').length;

    return `
      <div class="summary">
        ${errors > 0 ? `<span class="error-count">⛔ ${errors} Errors</span>` : ''}
        ${warnings > 0 ? `<span class="warning-count">⚠️ ${warnings} Warnings</span>` : ''}
      </div>
    `;
  }

  private renderViolations(): string {
    return this.violations.map(v => `
      <div class="violation ${v.severity}">
        <div class="violation-header">
          <span class="violation-icon">${this.getIcon(v.severity)}</span>
          <span class="violation-name">${v.ruleName}</span>
          <span class="package-badge">${v.packageName}</span>
        </div>
        <div class="violation-message">${v.message}</div>
        <div class="violation-rationale">${v.rationale}</div>
        ${v.autoFix ? `
          <button class="auto-fix-btn" data-violation-id="${v.ruleId}">
            🔧 Auto-fix
          </button>
        ` : ''}
      </div>
    `).join('');
  }

  private getIcon(severity: string): string {
    switch (severity) {
      case 'error': return '⛔';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '•';
    }
  }
}
```

**CREATE: `packages/core/src/domains/visualization/styles/components/compliance-monitor.css`**

**Tasks**:
- [ ] Implement ComplianceMonitor
- [ ] Create CSS styling
- [ ] Test with violations
- [ ] Test auto-fix display

---

#### **Day 14: VSCode Integration**

**CREATE: `packages/vscode/src/providers/ComplianceProvider.ts`**

```typescript
export class ComplianceProvider implements vscode.CodeActionProvider {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private validator: ComplianceValidator;

  constructor(validator: ComplianceValidator) {
    this.validator = validator;
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('agentbrain-compliance');
  }

  async validateDocument(document: vscode.TextDocument): Promise<void> {
    const code = document.getText();
    const context = this.getContext(document);

    const result = this.validator.validateAgainstPackages(code, context);

    const diagnostics = result.violations.map(v => {
      const diagnostic = new vscode.Diagnostic(
        new vscode.Range(0, 0, 0, 0), // TODO: better range detection
        v.message,
        this.getSeverity(v.severity)
      );
      diagnostic.source = 'Agent Brain';
      diagnostic.code = v.ruleId;
      return diagnostic;
    });

    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source === 'Agent Brain') {
        // TODO: Implement auto-fix actions
      }
    }

    return actions;
  }

  private getSeverity(severity: string): vscode.DiagnosticSeverity {
    switch (severity) {
      case 'error': return vscode.DiagnosticSeverity.Error;
      case 'warning': return vscode.DiagnosticSeverity.Warning;
      case 'info': return vscode.DiagnosticSeverity.Information;
      default: return vscode.DiagnosticSeverity.Hint;
    }
  }
}
```

**CREATE: `packages/vscode/src/commands/validateCompliance.ts`**

**Tasks**:
- [ ] Implement ComplianceProvider
- [ ] Register diagnostic collection
- [ ] Add status bar indicator
- [ ] Test in VSCode

---

#### **Day 15: Package Analytics**

**CREATE: `packages/core/src/domains/expertise/PackageAnalytics.ts`**

```typescript
export class PackageAnalytics {
  trackPackageUsage(packageId: string, context: Context): void
  trackRuleViolation(ruleId: string, packageId: string): void
  trackRulePrevention(ruleId: string, packageId: string): void

  getPackageEffectiveness(packageId: string): EffectivenessMetrics {
    return {
      usageCount: this.getUsageCount(packageId),
      violationsPrevented: this.getPreventionCount(packageId),
      complianceRate: this.calculateComplianceRate(packageId),
      topRules: this.getTopRules(packageId)
    };
  }
}
```

**Tasks**:
- [ ] Implement analytics tracking
- [ ] Store metrics in `.agent-brain/analytics/`
- [ ] Test metric collection

**Week 3 Deliverable**: Compliance validation working in VSCode

---

### **WEEK 4: Package Creation & Management**

**Goal**: Enable users to create and manage packages

#### **Day 16-17: Package Creation Studio**

**CREATE: `packages/core/src/domains/visualization/ui/PackageCreationStudio.ts`**

Multi-step wizard for creating packages:
- Step 1: Metadata (name, domain, author, authority, enforcement)
- Step 2: Rules (visual rule builder)
- Step 3: Patterns (template editor)
- Step 4: Planning Templates (section builder)
- Step 5: Examples (good/bad code)

**CREATE: `packages/core/src/domains/visualization/styles/components/package-studio.css`**

**Tasks**:
- [ ] Implement wizard UI
- [ ] Rule builder
- [ ] Pattern editor
- [ ] Template builder
- [ ] Example editor
- [ ] Test complete package creation

---

#### **Day 18: Import/Export**

**CREATE: `packages/core/src/domains/expertise/PackageImporter.ts`**

```typescript
export class PackageImporter {
  async importFromFile(filePath: string): Promise<ExpertisePackage>
  async importFromURL(url: string): Promise<ExpertisePackage>
  async importFromRegistry(packageId: string): Promise<ExpertisePackage> // stub

  private async validateOnImport(pkg: ExpertisePackage): Promise<ValidationResult>
  private async detectConflicts(pkg: ExpertisePackage): Promise<Conflict[]>
}
```

**CREATE: `packages/core/src/domains/expertise/PackageExporter.ts`**

```typescript
export class PackageExporter {
  async exportToFile(packageId: string, filePath: string): Promise<void>
  async exportWithDependencies(packageId: string, filePath: string): Promise<void>
  async bundleForSharing(packageIds: string[], outputPath: string): Promise<void>
}
```

**Tasks**:
- [ ] Implement importer
- [ ] Implement exporter
- [ ] Test import/export cycle

---

#### **Day 19: VSCode Commands**

**CREATE:**
- `packages/vscode/src/commands/createPackage.ts`
- `packages/vscode/src/commands/importPackage.ts`
- `packages/vscode/src/commands/exportPackage.ts`
- `packages/vscode/src/commands/loadIntelligencePackages.ts`

**MODIFY: `packages/vscode/package.json`**

Add commands:
```json
{
  "commands": [
    {
      "command": "agent-brain.createPackage",
      "title": "Create Expertise Package",
      "category": "Agent Brain"
    },
    {
      "command": "agent-brain.importPackage",
      "title": "Import Package",
      "category": "Agent Brain"
    },
    {
      "command": "agent-brain.exportPackage",
      "title": "Export Package",
      "category": "Agent Brain"
    },
    {
      "command": "agent-brain.loadIntelligence",
      "title": "Load Agent Brain Intelligence Packages",
      "category": "Agent Brain"
    }
  ]
}
```

**Tasks**:
- [ ] Implement all commands
- [ ] Register in extension.ts
- [ ] Test in VSCode

---

#### **Day 20: Integration Testing**

Run comprehensive tests:
- [ ] Load all intelligence packages
- [ ] Test Stage 5 with each package
- [ ] Test compliance validation
- [ ] Test package creation
- [ ] Test import/export
- [ ] Test VSCode commands
- [ ] Test UI components

**Week 4 Deliverable**: Full package management working

---

### **WEEK 5: Enterprise + Polish**

**Goal**: Enterprise features (stubs) and final polish

#### **Day 21: Vendor Coordination (Stubs)**

**CREATE: `packages/core/src/domains/enterprise/VendorCoordinator.ts`**

Stub implementations for future:
- synchronizeVendors()
- getComplianceDashboard()
- generateComplianceReport()

**CREATE: `packages/core/src/domains/enterprise/types.ts`**

---

#### **Day 22: Marketplace (Stubs)**

**CREATE: `packages/core/src/domains/marketplace/MarketplaceClient.ts`**

Stub implementations for future:
- browse()
- purchase()
- publish()

**CREATE: `packages/core/src/domains/marketplace/types.ts`**

---

#### **Day 23: Package Recommendations**

**CREATE: `packages/core/src/domains/expertise/PackageRecommender.ts`**

```typescript
export class PackageRecommender {
  recommendPackages(project: ProjectProfile): PackageRecommendation[] {
    const needs = this.analyzeProjectNeeds(project);
    const recommendations: PackageRecommendation[] = [];

    for (const need of needs) {
      const packages = this.findPackagesForNeed(need);
      recommendations.push({
        need: need.description,
        packages,
        expectedImprovement: this.estimateImprovement(packages, project)
      });
    }

    return recommendations.sort((a, b) => b.expectedImprovement - a.expectedImprovement);
  }

  private analyzeProjectNeeds(project: ProjectProfile): ProjectNeed[]
  private findPackagesForNeed(need: ProjectNeed): ExpertisePackage[]
  private estimateImprovement(packages: ExpertisePackage[], project: ProjectProfile): number
}
```

---

#### **Day 24: UI Integration**

Wire all components to main app:
- [ ] Package tree in knowledge sidebar
- [ ] Compliance monitor panel
- [ ] Planning guide in prompt builder
- [ ] Package creation studio
- [ ] Initialize on extension activation

**MODIFY: `packages/vscode/src/extension.ts`**

```typescript
// Initialize package system
const packageManager = new PackageManager(storagePath);
const packageHierarchy = new PackageHierarchy();
const planningEngine = new PlanningEngine();
const complianceValidator = new ComplianceValidator(packageHierarchy);

// Extend KnowledgeSystem
const knowledgeSystem = new KnowledgeSystem(
  patternSystem,
  adrSystem,
  learningSystem,
  packageManager,
  packageHierarchy
);

// Initialize Stage 5
const promptEnhancer = new PromptEnhancer(
  knowledgeSystem,
  planningEngine,
  successDetector,
  profileManager
);

// Register compliance provider
const complianceProvider = new ComplianceProvider(complianceValidator);
context.subscriptions.push(
  vscode.languages.registerCodeActionsProvider('*', complianceProvider)
);
```

---

#### **Day 25: Documentation + VSIX**

**CREATE Documentation:**
- `docs/knowledge-injection-user-guide.md` - How to use packages
- `docs/knowledge-injection-package-creation.md` - How to create packages
- `docs/knowledge-injection-api.md` - API reference

**Run:**
```bash
npm run load-intelligence  # Load all intelligence packages
npm run build             # Build all packages
npx vsce package          # Create v0.2.0 VSIX
```

**Test Plan:**
1. Fresh install v0.2.0
2. Run load-intelligence command
3. Verify 5 packages loaded
4. Test Stage 5 enhancement with planning template
5. Test compliance validation
6. Test package creation
7. Test import/export

**Week 5 Deliverable**: v0.2.0 VSIX with full package system

---

## Success Metrics

### Technical Metrics
- [ ] All 5 intelligence packages load successfully
- [ ] Stage 5 enhancement works with planning templates
- [ ] Compliance validation detects violations
- [ ] Package creation/import/export functional
- [ ] All builds succeed
- [ ] Zero breaking changes to Phase 1-3

### User Experience Metrics
- [ ] Package loading < 1 second
- [ ] Compliance validation < 500ms
- [ ] Stage 5 enhancement < 2 seconds
- [ ] Package creation wizard completable in < 5 minutes

---

## File Structure Summary

```
packages/core/src/domains/
├─ expertise/ (NEW - 12 files)
│  ├─ types.ts
│  ├─ ExpertisePackage.ts
│  ├─ PackageManager.ts
│  ├─ PackageHierarchy.ts
│  ├─ PackageValidator.ts
│  ├─ ComplianceValidator.ts
│  ├─ ConflictResolver.ts
│  ├─ MarkdownConverter.ts
│  ├─ PackageAnalytics.ts
│  ├─ PackageRecommender.ts
│  ├─ PackageImporter.ts
│  ├─ PackageExporter.ts
│  └─ index.ts
│
├─ planning/ (NEW - 4 files)
│  ├─ types.ts
│  ├─ PlanningEngine.ts
│  ├─ PlanValidator.ts
│  └─ index.ts
│
├─ enterprise/ (NEW - 3 files stubs)
│  ├─ types.ts
│  ├─ VendorCoordinator.ts
│  └─ index.ts
│
├─ marketplace/ (NEW - 3 files stubs)
│  ├─ types.ts
│  ├─ MarketplaceClient.ts
│  └─ index.ts
│
├─ enhancement/
│  ├─ stages/
│  │  └─ Stage5_PackageEnhancer.ts (NEW)
│  ├─ PromptEnhancer.ts (MODIFY)
│  └─ types.ts (MODIFY)
│
└─ knowledge/
   ├─ KnowledgeSystem.ts (MODIFY)
   └─ types.ts (MODIFY)
```

---

## Progress Tracking

Use this checklist to track implementation:

### Week 1: Package Infrastructure
- [ ] Day 1: Core types
- [ ] Day 2: Package manager + markdown converter
- [ ] Day 3: Package hierarchy
- [ ] Day 4: Extend KnowledgeSystem
- [ ] Day 5: Intelligence package loader

### Week 2: Planning + Stage 5
- [ ] Day 6: Planning engine
- [ ] Day 7: Plan validator
- [ ] Day 8-9: Stage 5 enhancement
- [ ] Day 10: Planning UI

### Week 3: Compliance
- [ ] Day 11-12: Compliance validator
- [ ] Day 13: Compliance monitor UI
- [ ] Day 14: VSCode integration
- [ ] Day 15: Package analytics

### Week 4: Creation & Management
- [ ] Day 16-17: Package creation studio
- [ ] Day 18: Import/export
- [ ] Day 19: VSCode commands
- [ ] Day 20: Integration testing

### Week 5: Enterprise + Polish
- [ ] Day 21: Vendor coordination stubs
- [ ] Day 22: Marketplace stubs
- [ ] Day 23: Package recommendations
- [ ] Day 24: UI integration
- [ ] Day 25: Documentation + VSIX

---

**Implementation Start Date**: TBD
**Target Completion**: 5 weeks from start
**Version**: 0.2.0 - Knowledge Injection Upgrade
