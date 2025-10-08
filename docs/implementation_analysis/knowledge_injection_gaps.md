# Knowledge Injection Implementation - Gap Analysis

**Date**: 2025-10-07
**Plan Document**: `KNOWLEDGE_INJECTION_IMPLEMENTATION_PLAN.md`
**Status**: Weeks 1-3 Complete, Weeks 4-5 Incomplete

---

## Executive Summary

The Knowledge Injection System implementation completed the **backend/core functionality** (Weeks 1-3) but did not implement the **UI components** (Week 2, Day 10), **VSCode integration** (Week 3-4), or **enterprise features** (Week 5).

**What Was Completed:**
- ✅ Week 1: Package infrastructure (types, managers, converters, hierarchy) - 100%
- ✅ Week 2: Planning engine + Stage 5 (backend only) - 80%
- ✅ Week 3: Compliance validator (backend only) - 75%
- ✅ Week 4: Import/Export classes (backend only) - 40%
- ❌ Week 5: Not started - 0%

**Overall Completion**: ~60% (backend complete, UI/integration incomplete)

---

## Detailed Gap Analysis

### Week 2 Gaps (Day 10)

#### PlanningGuide UI Component

**Status**: Not implemented
**Guidance Completeness**: 70%

**What the Plan Provides:**
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
    // Complete HTML template rendering logic
    // Section rendering with required/optional badges
    // Completion criteria display
  }
}
```

**What's Missing:**
1. CSS styling - File mentioned but not specified
2. Event handlers - Close button, checkbox interactions not wired
3. Integration points:
   - Where to call `show()`
   - Who creates `#planning-guide-container`
   - When to trigger display (during prompt enhancement?)
4. Interaction with planning enforcement flow
5. How to track completion state

**Can Implement?** ✅ YES with design decisions

**Needs:**
- CSS design based on existing UI patterns (PopupController, etc.)
- Determine integration point in enhancement flow
- Add event handlers for interactivity
- Decide on completion tracking strategy

**Estimated Effort**: 3-4 hours

---

### Week 3 Gaps

#### Day 13: ComplianceMonitor UI Component

**Status**: Not implemented
**Guidance Completeness**: 75%

**What the Plan Provides:**
```typescript
export class ComplianceMonitor {
  private violations: ValidationIssue[] = [];

  updateViolations(result: ValidationResult): void {
    this.violations = result.violations;
    this.render();
  }

  private render(): void {
    // Complete HTML structure
    // Conditional rendering based on violations
    // Severity-based grouping
    // Auto-fix button display
  }

  private renderSummary(): string { /* ... */ }
  private renderViolations(): string { /* ... */ }
  private getIcon(severity: string): string { /* ... */ }
}
```

**What's Missing:**
1. CSS styling - File mentioned but not specified
2. Auto-fix button click handler
3. Real-time update mechanism:
   - When to call `updateViolations()`
   - Trigger on save? On type? On command?
4. Integration with ComplianceValidator
5. Container element creation and placement

**Can Implement?** ✅ YES with design decisions

**Needs:**
- CSS styling matching existing patterns
- Wire auto-fix to `ComplianceValidator.applyAutoFixes()`
- Determine validation trigger strategy
- Decide where monitor panel should appear

**Estimated Effort**: 3-4 hours

---

#### Day 14: ComplianceProvider VSCode Integration

**Status**: Not implemented
**Guidance Completeness**: 60%

**What the Plan Provides:**
```typescript
export class ComplianceProvider implements vscode.CodeActionProvider {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private validator: ComplianceValidator;

  async validateDocument(document: vscode.TextDocument): Promise<void> {
    const code = document.getText();
    const context = this.getContext(document); // ❌ Not implemented

    const result = this.validator.validateAgainstPackages(code, context);
    // Maps violations to diagnostics
  }

  provideCodeActions(...): vscode.CodeAction[] {
    // TODO: Implement auto-fix actions ❌
  }
}
```

**What's Missing (Critical):**
1. `getContext()` method - Must extract:
   - Language from document
   - Framework (how to detect?)
   - File path
   - Project context
2. Auto-fix CodeAction implementation
3. Validation trigger strategy:
   - On document save?
   - On document change with debounce?
   - On command execution?
4. Registration in extension.ts
5. Status bar indicator for compliance status

**Can Implement?** ⚠️ PARTIAL - needs design decisions

**Needs:**
- Context extraction logic design
- Framework detection strategy (parse package.json? config files?)
- Validation trigger strategy decision
- Auto-fix action implementation
- Registration code

**Estimated Effort**: 6-8 hours (complex - VSCode API integration)

---

#### Day 15: PackageAnalytics

**Status**: Not implemented
**Guidance Completeness**: 40%

**What the Plan Provides:**
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

**What's Missing:**
1. Storage mechanism:
   - File format for analytics
   - Storage location (`.agent-brain/analytics/`)
   - Time-series data structure
2. All method implementations
3. Metrics calculation logic
4. When/where to call tracking methods
5. Privacy/opt-out considerations

**Can Implement?** ✅ YES with design decisions

**Needs:**
- Storage format design (JSON? SQLite?)
- Metrics calculation formulas
- Integration points for tracking calls
- Retention policy

**Estimated Effort**: 4-5 hours

---

### Week 4 Gaps

#### Day 16-17: PackageCreationStudio

**Status**: Not implemented
**Guidance Completeness**: 20%

**What the Plan Provides:**
- High-level description: "Multi-step wizard for creating packages"
- Step list:
  1. Metadata (name, domain, author, authority, enforcement)
  2. Rules (visual rule builder)
  3. Patterns (template editor)
  4. Planning Templates (section builder)
  5. Examples (good/bad code)

**What's Missing (Almost Everything):**
1. NO code structure at all
2. Multi-step wizard architecture:
   - Step navigation (next/prev/skip)
   - State management across steps
   - Validation per step
   - Progress indicator
3. Forms for each step:
   - Input fields, dropdowns, validation
4. Visual rule builder:
   - Regex pattern editor with validation
   - Context selector (language, framework)
   - Severity picker
   - Auto-fix editor
5. Pattern template editor:
   - Code editor integration (Monaco?)
   - Syntax highlighting
   - Preview functionality
6. Section builder for planning templates:
   - Dynamic section add/remove
   - Required/optional toggle
   - Validation criteria editor
7. Example editor:
   - Side-by-side good/bad code
   - Syntax highlighting
8. Package preview and validation
9. Save/export functionality

**Can Implement?** ❌ NO - needs extensive planning

**Needs:**
- Full UI/UX design
- Wizard framework/library choice
- Form validation strategy
- Code editor integration approach
- State management pattern
- Component architecture
- CSS framework choice

**Estimated Effort**: 3-5 days (major feature)

**Recommendation**: Needs dedicated design document before implementation.

---

#### Day 19: VSCode Commands

**Status**: Not implemented
**Guidance Completeness**: 30%

**What the Plan Provides:**
- Command names and package.json structure
- List of 4 commands:
  1. `agent-brain.createPackage`
  2. `agent-brain.importPackage`
  3. `agent-brain.exportPackage`
  4. `agent-brain.loadIntelligence`

**What's Missing:**
1. Implementation files:
   - `packages/vscode/src/commands/createPackage.ts`
   - `packages/vscode/src/commands/importPackage.ts`
   - `packages/vscode/src/commands/exportPackage.ts`
   - `packages/vscode/src/commands/loadIntelligencePackages.ts`

2. Command implementations:
   - UI flows (dialogs, pickers, inputs)
   - Error handling with user feedback
   - Progress reporting (for long operations)
   - Success/failure notifications

3. Integration details:
   - Registration in extension.ts
   - Dependency injection
   - Context requirements

**Can Implement?** ⚠️ PARTIAL - by complexity

**Breakdown:**

**Easy - Can Implement Now:**
- ✅ `loadIntelligence` - Simple wrapper around existing function
  ```typescript
  export async function loadIntelligencePackagesCommand() {
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: "Loading Agent Brain Intelligence..."
    }, async (progress) => {
      await loadIntelligencePackages({
        intelligencePath: path.join(workspaceRoot, 'docs/agent_brain_intelligence'),
        storagePath: path.join(workspaceRoot, '.agent-brain'),
        onProgress: (msg) => progress.report({ message: msg })
      });
    });
    vscode.window.showInformationMessage('Intelligence packages loaded successfully');
  }
  ```
  **Estimated Effort**: 30 minutes

**Medium - Can Implement with Design:**
- ⚠️ `importPackage` - Needs UX flow design
  - File picker for package file
  - Conflict resolution UI if needed
  - Progress indicator
  - Error handling with actionable messages
  **Estimated Effort**: 2-3 hours

- ⚠️ `exportPackage` - Needs UX flow design
  - Package picker (QuickPick from loaded packages)
  - Save dialog for output location
  - Options picker (with/without dependencies, format)
  - Progress indicator
  **Estimated Effort**: 2-3 hours

**Hard - Blocked by PackageCreationStudio:**
- ❌ `createPackage` - Depends on studio implementation
  - Launches PackageCreationStudio
  - Cannot implement until studio exists
  **Estimated Effort**: 1 hour (once studio is done)

---

#### Day 20: Integration Testing

**Status**: Not completed
**Guidance Completeness**: 80%

**What the Plan Provides:**
Clear test checklist:
- [ ] Load all intelligence packages
- [ ] Test Stage 5 with each package
- [ ] Test compliance validation
- [ ] Test package creation
- [ ] Test import/export
- [ ] Test VSCode commands
- [ ] Test UI components

**What's Missing:**
1. Automated test scripts
2. Test data/fixtures
3. Expected results documentation
4. Regression test suite

**Can Execute?** ⚠️ PARTIAL - blocked by incomplete features

Can test now:
- ✅ Load intelligence packages (backend works)
- ✅ Stage 5 enhancement (backend works)
- ✅ Compliance validation (backend works)
- ✅ Import/export (backend works)

Cannot test yet:
- ❌ Package creation (no studio)
- ❌ VSCode commands (not implemented)
- ❌ UI components (not implemented)

**Estimated Effort**: 2-3 hours (for what can be tested now)

---

### Week 5 Gaps

#### Day 21: Vendor Coordination (Stubs)

**Status**: Not implemented
**Guidance Completeness**: 10%

**What the Plan Provides:**
- Three method names: `synchronizeVendors()`, `getComplianceDashboard()`, `generateComplianceReport()`
- File structure

**What's Missing (Almost Everything):**
1. Method signatures, parameters, return types
2. Type definitions for:
   - Vendor sync data
   - Dashboard structure
   - Report format
3. Vision for vendor coordination:
   - Which vendors? (Azure DevOps, AWS, GitHub Enterprise, Jira?)
   - What data to sync?
   - Authentication/API integration
4. Stub return values

**Can Implement?** ⚠️ YES but meaningless without vision

**Could create:**
```typescript
export class VendorCoordinator {
  async synchronizeVendors(): Promise<void> {
    throw new Error('Vendor coordination not yet implemented');
  }

  async getComplianceDashboard(): Promise<any> {
    throw new Error('Compliance dashboard not yet implemented');
  }

  async generateComplianceReport(): Promise<any> {
    throw new Error('Compliance reporting not yet implemented');
  }
}
```

**Estimated Effort**: 30 minutes (just stubs)

**Recommendation**: Defer until enterprise roadmap is defined. These are placeholders for future work.

---

#### Day 22: Marketplace (Stubs)

**Status**: Not implemented
**Guidance Completeness**: 10%

**What the Plan Provides:**
- Three method names: `browse()`, `purchase()`, `publish()`
- File structure

**What's Missing (Almost Everything):**
1. Package marketplace data model
2. Browse filters/search parameters
3. Purchase flow (free vs paid? billing?)
4. Publishing workflow
5. Registry API contract
6. Package metadata standards
7. Versioning/update strategy
8. Rating/review system

**Can Implement?** ⚠️ YES but meaningless without architecture

**Could create:**
```typescript
export class MarketplaceClient {
  async browse(filters?: any): Promise<any[]> {
    throw new Error('Marketplace not yet available');
  }

  async purchase(packageId: string): Promise<void> {
    throw new Error('Marketplace not yet available');
  }

  async publish(package: ExpertisePackage): Promise<void> {
    throw new Error('Marketplace not yet available');
  }
}
```

**Estimated Effort**: 30 minutes (just stubs)

**Recommendation**: Defer until marketplace strategy is defined. Requires business model decisions.

---

#### Day 23: Package Recommendations

**Status**: Not implemented
**Guidance Completeness**: 40%

**What the Plan Provides:**
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

**What's Missing (The Intelligence):**
1. `analyzeProjectNeeds()` logic:
   - What signals indicate a need?
   - Parse code for anti-patterns?
   - Analyze dependency vulnerabilities?
   - Check for missing best practices?
   - Language/framework detection

2. `findPackagesForNeed()` matching:
   - Keyword matching?
   - Category/domain matching?
   - Rule coverage analysis?
   - ML-based similarity?

3. `estimateImprovement()` scoring:
   - Historical data?
   - Rule impact weights?
   - Coverage percentage?
   - Complexity reduction estimates?

4. Type definitions:
   ```typescript
   interface ProjectNeed {
     description: string;
     severity: 'high' | 'medium' | 'low';
     category: string;
     evidence: string[];
   }

   interface PackageRecommendation {
     need: string;
     packages: ExpertisePackage[];
     expectedImprovement: number;
     reasoning: string;
   }
   ```

**Can Implement?** ⚠️ YES with naive algorithm

**Naive Implementation Approach:**
```typescript
private analyzeProjectNeeds(project: ProjectProfile): ProjectNeed[] {
  const needs: ProjectNeed[] = [];

  // Simple heuristics
  if (!project.hasTests) {
    needs.push({ description: 'Missing test coverage', severity: 'high', ... });
  }

  if (project.languages.includes('typescript') && !project.hasLinter) {
    needs.push({ description: 'No linting configured', severity: 'medium', ... });
  }

  // Could scan for common anti-patterns

  return needs;
}

private findPackagesForNeed(need: ProjectNeed): ExpertisePackage[] {
  const allPackages = this.packageManager.getAllPackages();

  // Simple keyword matching
  return allPackages.filter(pkg => {
    return pkg.domain.includes(need.category) ||
           pkg.name.toLowerCase().includes(need.description.toLowerCase());
  });
}

private estimateImprovement(packages: ExpertisePackage[], project: ProjectProfile): number {
  // Simple scoring: number of applicable rules
  return packages.reduce((score, pkg) => {
    const applicableRules = pkg.rules.filter(r =>
      this.isApplicable(r, project)
    );
    return score + applicableRules.length;
  }, 0);
}
```

**Estimated Effort**:
- Naive version: 4-5 hours
- Sophisticated version: 2-3 days (needs design)

**Recommendation**: Implement naive version now, enhance later with ML/analytics.

---

#### Day 24: UI Integration

**Status**: Not implemented
**Guidance Completeness**: 50%

**What the Plan Provides:**
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

**What's Missing (Critical Architecture Questions):**

1. **"Package tree in knowledge sidebar"**
   - ❓ What sidebar? Where is it?
   - ❓ Is this a VSCode TreeView provider?
   - ❓ What does the tree show? (packages → rules → patterns?)
   - ❓ What actions on tree items?

2. **"Compliance monitor panel"**
   - ❓ Where does this panel live?
   - ❓ VSCode webview panel?
   - ❓ Output channel?
   - ❓ Status bar + problems panel?

3. **"Planning guide in prompt builder"**
   - ❓ What's the prompt builder?
   - ❓ Is this in the timeline webview?
   - ❓ Or a separate input box?
   - ❓ How does user trigger planning?

4. **"Package creation studio"**
   - ❓ How does this launch?
   - ❓ Command palette?
   - ❓ Webview panel?
   - ❓ Multi-panel wizard?

5. **Component Communication:**
   - ❓ Webview messaging protocol?
   - ❓ Event bus?
   - ❓ Direct coupling?
   - ❓ How does timeline communicate with extension host?

**Can Implement?** ❌ NO - blocked by architecture unknowns

**Critical Unknown**: Does Agent Brain have a main webview UI application?

Looking at project structure:
- ✅ `packages/vscode/` - VSCode extension host code
- ✅ `packages/core/src/domains/visualization/` - Timeline rendering
- ❓ Main webview app - NOT FOUND
- ❓ Prompt builder UI - NOT FOUND
- ❓ Knowledge sidebar - NOT FOUND

**Needs Investigation:**
1. Review `packages/vscode/src/extension.ts` to understand UI architecture
2. Find webview entry points
3. Understand timeline provider integration
4. Map out existing UI components
5. Design integration points for new components

**Estimated Effort**:
- Investigation: 2-3 hours
- Implementation: 1-2 days (after architecture is clear)

**Recommendation**: MUST investigate existing architecture before proceeding.

---

#### Day 25: Documentation + VSIX

**Status**: Partially complete
**Guidance Completeness**: 70%

**What the Plan Provides:**
- Three documentation files:
  1. `docs/knowledge-injection-user-guide.md`
  2. `docs/knowledge-injection-package-creation.md`
  3. `docs/knowledge-injection-api.md`
- Build commands
- Comprehensive test plan

**What's Been Done:**
- ✅ Created `docs/user_guides/loading_intelligence_documents.md` (comprehensive guide)
- ✅ VSIX v0.1.30 packaged and tested
- ✅ Build pipeline working

**What's Missing:**
1. `knowledge-injection-package-creation.md` - How to create packages
2. `knowledge-injection-api.md` - API reference
3. npm script: `npm run load-intelligence`
4. Full test plan execution (blocked by incomplete features)

**Can Implement?** ✅ YES for documentation

**Package Creation Guide** - Can write conceptually but needs:
- PackageCreationStudio screenshots/examples
- Step-by-step walkthrough
- Best practices
- Example package creation

**API Reference Guide** - Can write NOW:
- All backend classes are complete
- Full API is implemented
- Just needs documentation

**Estimated Effort**:
- API reference: 2-3 hours
- Package creation guide: 3-4 hours (once studio exists)
- npm script: 15 minutes
- Full test execution: 2-3 hours (once features complete)

---

## Summary of Gaps

### By Implementation Difficulty

**Easy - Can Implement Now (6-8 hours total):**
1. ✅ VendorCoordinator stubs (30 min)
2. ✅ MarketplaceClient stubs (30 min)
3. ✅ VSCode `loadIntelligence` command (30 min)
4. ✅ PackageAnalytics (4-5 hours)
5. ✅ API documentation (2-3 hours)

**Medium - Need Design Decisions (15-20 hours total):**
1. ⚠️ PlanningGuide UI (3-4 hours)
2. ⚠️ ComplianceMonitor UI (3-4 hours)
3. ⚠️ VSCode import/export commands (4-6 hours)
4. ⚠️ PackageRecommender naive version (4-5 hours)

**Hard - Need Architecture Planning (3-5 days total):**
1. ❌ ComplianceProvider VSCode integration (6-8 hours)
2. ❌ UI Integration (Day 24) - 1-2 days
3. ❌ Integration testing (2-3 hours)

**Very Hard - Need Full Specification (5-7 days total):**
1. ❌ PackageCreationStudio - 3-5 days
2. ❌ Package creation guide - 3-4 hours (blocked by studio)

### By Priority

**High Priority - Core Functionality:**
1. VSCode `loadIntelligence` command - Users need to load packages
2. ComplianceMonitor UI - Users need to see violations
3. VSCode import/export commands - Package distribution
4. API documentation - Developer enablement

**Medium Priority - Enhanced Experience:**
1. PlanningGuide UI - Helpful but Stage 5 works without it
2. ComplianceProvider - Nice to have in-editor diagnostics
3. PackageAnalytics - Useful insights but not critical
4. PackageRecommender - Helpful suggestions

**Low Priority - Future Features:**
1. PackageCreationStudio - Can create packages manually via JSON
2. VendorCoordinator - Enterprise feature, future roadmap
3. MarketplaceClient - Requires business model decisions
4. UI Integration - Depends on unclear architecture

---

## Recommended Implementation Order

### Phase 1: Quick Wins (1-2 days)
Make the existing backend immediately usable:

1. ✅ VSCode `loadIntelligence` command (30 min)
2. ✅ VSCode `importPackage` command (2-3 hours)
3. ✅ VSCode `exportPackage` command (2-3 hours)
4. ✅ API documentation (2-3 hours)
5. ✅ Integration testing for backend (2-3 hours)

**Deliverable**: v0.1.31 VSIX with working commands and docs

---

### Phase 2: UI Components (2-3 days)
Add visual feedback for users:

1. ⚠️ ComplianceMonitor UI (3-4 hours)
   - Design CSS
   - Wire to validation
   - Add to timeline webview or separate panel

2. ⚠️ PlanningGuide UI (3-4 hours)
   - Design CSS
   - Wire to Stage 5
   - Show when planning required

3. ⚠️ PackageAnalytics (4-5 hours)
   - Design storage format
   - Implement tracking
   - Add to ComplianceMonitor display

**Deliverable**: v0.1.32 VSIX with UI feedback

---

### Phase 3: Architecture Investigation (1 week)
Understand and document existing UI architecture:

1. ❓ Map Agent Brain UI architecture
   - Where does timeline live?
   - How do webviews communicate?
   - Where should new components integrate?

2. ❓ Design component integration strategy
   - Sidebar tree view design
   - Panel placement strategy
   - Communication patterns

3. ❓ Document findings
   - Architecture diagram
   - Integration guide
   - Component guidelines

**Deliverable**: Architecture document for Phase 4

---

### Phase 4: Advanced Integration (2-3 weeks)
Requires Phase 3 architecture understanding:

1. ❌ ComplianceProvider with diagnostics
2. ❌ Full UI integration (Day 24)
3. ❌ PackageCreationStudio (major feature)
4. ❌ Package creation guide

**Deliverable**: v0.2.0 VSIX - Full Knowledge Injection System

---

### Phase 5: Enterprise Features (Future)
Defer until roadmap defined:

1. VendorCoordinator (requires enterprise strategy)
2. MarketplaceClient (requires business model)
3. PackageRecommender ML enhancement (requires analytics data)

**Deliverable**: v0.3.0 - Enterprise Edition

---

## Critical Blockers

### 1. UI Architecture Understanding
**Blocker**: Don't know where UI components should integrate
**Impact**: Cannot implement Day 24 UI Integration
**Resolution**: Investigate existing architecture
**Effort**: 2-3 hours investigation

### 2. PackageCreationStudio Specification
**Blocker**: Only 20% specified, needs full design
**Impact**: Cannot implement package creation
**Resolution**: Write detailed specification document
**Effort**: 1-2 days planning

### 3. Framework Detection Strategy
**Blocker**: ComplianceProvider needs to detect frameworks
**Impact**: Context extraction incomplete
**Resolution**: Design detection heuristics
**Effort**: 2-3 hours design

---

## Files to Create (Priority Order)

### Immediate (Phase 1):
1. `packages/vscode/src/commands/loadIntelligencePackages.ts`
2. `packages/vscode/src/commands/importPackage.ts`
3. `packages/vscode/src/commands/exportPackage.ts`
4. `docs/knowledge-injection-api.md`
5. `package.json` - Add npm scripts

### Near-term (Phase 2):
1. `packages/core/src/domains/visualization/ui/ComplianceMonitor.ts`
2. `packages/core/src/domains/visualization/styles/components/compliance-monitor.css`
3. `packages/core/src/domains/visualization/ui/PlanningGuide.ts`
4. `packages/core/src/domains/visualization/styles/components/planning-guide.css`
5. `packages/core/src/domains/expertise/PackageAnalytics.ts`

### Medium-term (Phase 3):
1. `docs/architecture/agent-brain-ui-architecture.md` (INVESTIGATE FIRST)
2. `docs/architecture/component-integration-guide.md`

### Long-term (Phase 4):
1. `packages/vscode/src/providers/ComplianceProvider.ts`
2. `docs/specifications/package-creation-studio-spec.md` (PLAN FIRST)
3. `packages/core/src/domains/visualization/ui/PackageCreationStudio.ts`
4. `docs/knowledge-injection-package-creation.md`

### Future (Phase 5):
1. `packages/core/src/domains/enterprise/VendorCoordinator.ts` (stub)
2. `packages/core/src/domains/marketplace/MarketplaceClient.ts` (stub)
3. `packages/core/src/domains/expertise/PackageRecommender.ts`

---

## Conclusion

The Knowledge Injection System has a **solid backend foundation** (Weeks 1-3) but lacks **UI/integration** (Weeks 4-5).

**Immediate Value Path**: Implement Phase 1 (VSCode commands + docs) to make the system usable.

**Biggest Unknown**: Agent Brain UI architecture - must investigate before Phase 4.

**Biggest Gap**: PackageCreationStudio - needs full specification document.

**Recommendation**:
1. Execute Phase 1 (1-2 days) for immediate value
2. Execute Phase 2 (2-3 days) for user feedback
3. Investigate architecture (Phase 3) before attempting Phase 4
4. Write PackageCreationStudio spec before implementing
5. Defer enterprise features (Phase 5) until strategy is defined

---

**Next Steps**: Review this analysis, prioritize phases, and decide implementation order.
