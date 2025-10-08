# Agent Brain Wave 2 Implementation Plan

**Date**: October 2025  
**Purpose**: Complete partially implemented features and establish missing connections  
**Duration**: 3-4 weeks  
**Philosophy**: "Complete what works before building what's new"

---

## Executive Summary

Wave 1 successfully established the core Agent Brain architecture with ~60-70% completion across three implementation tracks. Wave 2 focuses on:

1. **Completing Integration** - Wire existing UI components to the extension
2. **Resolving Conflicts** - Fix the Stage 5 naming collision and architectural issues
3. **Filling Critical Gaps** - Add missing components that users expect to exist
4. **Enabling Workflow** - Make the system work end-to-end for real users

**Not in Scope for Wave 2:**
- Enterprise features (vendor coordination, marketplace)
- Advanced experimental features (LLM-assisted Stage 7)
- Complete package creation studio (defer to Wave 3)

---

## Week 1: Complete Core Integration

### Goal
Make existing components actually work together end-to-end.

### Day 1-2: Timeline Real-Time Integration

**Problem**: Sessions only appear in timeline after manual refresh  
**Impact**: Broken user experience

**Tasks:**
1. Add `addRuntimeEvent()` method to TimelineProvider
2. Wire `session:finalized` event to timeline update
3. Test real-time session appearance

**Files to Modify:**
```typescript
// packages/vscode/src/providers/timeline-provider-webpack.ts
export class TimelineProvider {
  private events: CanonicalEvent[] = [];
  
  public addRuntimeEvent(event: CanonicalEvent): void {
    // Add to events array
    this.events.push(event);
    // Sort by timestamp
    this.events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    // Trigger re-render
    this.postMessageToWebview({
      type: 'updateData',
      events: this.events
    });
  }
}

// packages/vscode/src/extension.ts (line ~2467)
sessionManager.on('session:finalized', (session: any, event: CanonicalEvent) => {
  if (timelineProvider) {
    timelineProvider.addRuntimeEvent(event);
    outputChannel.appendLine(`✅ Session added to timeline: ${event.title}`);
  }
});
```

**Success Criteria:**
- [ ] Create session → appears in timeline immediately
- [ ] No manual refresh required
- [ ] Events maintain chronological order

### Day 3: Complete Webview Integration

**Problem**: UI components exist but aren't fully wired  
**Components**: QuickPromptPanel, AICompanionDot, ErrorRecoveryPanel

**Tasks:**

#### 1. Wire QuickPromptPanel
```typescript
// packages/core/src/domains/visualization/webview/SimpleTimelineApp.ts
export class SimpleTimelineApp {
  private quickPromptPanel: QuickPromptPanel;
  
  constructor() {
    // Initialize Quick Prompt Panel
    this.quickPromptPanel = new QuickPromptPanel();
    this.quickPromptPanel.on('enhance', this.handleEnhanceRequest.bind(this));
    this.quickPromptPanel.on('startSession', this.handleStartSession.bind(this));
  }
  
  private handleEnhanceRequest(prompt: string, agent: string) {
    // Send to extension for enhancement
    vscode.postMessage({
      type: 'enhancePrompt',
      prompt,
      agent
    });
  }
}
```

#### 2. Implement Periodic Tip Checking
```typescript
// packages/vscode/src/extension.ts
let tipCheckInterval: NodeJS.Timeout;

// In activate()
tipCheckInterval = setInterval(() => {
  const context = gatherUserContext();
  guidanceEngine.updateContext(context);
  const tip = guidanceEngine.selectTip(context);
  
  if (tip && timelineProvider) {
    timelineProvider.postMessageToWebview({
      type: 'showTip',
      tip: {
        message: tip.message,
        priority: tip.priority
      }
    });
  }
}, 5000); // Every 5 seconds

// In deactivate()
clearInterval(tipCheckInterval);
```

#### 3. Define Error Detection Mechanism
```typescript
// packages/vscode/src/adapters/ErrorDetector.ts
export class ErrorDetector {
  constructor(private sessionManager: SessionManager) {
    // Listen to diagnostics
    vscode.languages.onDidChangeDiagnostics(this.handleDiagnostics.bind(this));
    // Listen to task completions
    vscode.tasks.onDidEndTaskProcess(this.handleTaskEnd.bind(this));
  }
  
  private handleDiagnostics(event: vscode.DiagnosticChangeEvent) {
    for (const uri of event.uris) {
      const diagnostics = vscode.languages.getDiagnostics(uri);
      const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
      
      if (errors.length > 0 && this.sessionManager.hasActiveSession()) {
        // Track error in session
        this.sessionManager.trackActivity({
          type: 'error-detected',
          metadata: {
            file: uri.fsPath,
            errors: errors.map(e => e.message)
          }
        });
        
        // Show error recovery panel
        this.showErrorRecovery(errors[0]);
      }
    }
  }
  
  private showErrorRecovery(error: vscode.Diagnostic) {
    timelineProvider?.postMessageToWebview({
      type: 'showError',
      error: {
        message: error.message,
        file: error.source,
        line: error.range.start.line
      }
    });
  }
}
```

**Success Criteria:**
- [ ] Stats bar button opens Quick Prompt Panel
- [ ] Tip dot shows periodic guidance
- [ ] Errors trigger recovery panel
- [ ] All three UI components functional

### Day 4-5: Context Domain Implementation

**Problem**: Phase 5 of unified plan not started  
**Impact**: No context persistence/reinforcement

**Create Context Domain:**

```typescript
// packages/core/src/domains/context/types.ts
export interface Context {
  id: string;
  projectId: string;
  rules: ContextRule[];
  decisions: ContextDecision[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ContextRule {
  id: string;
  rule: string;
  source: 'user' | 'learned' | 'inferred';
  confidence: number;
  appliedCount: number;
}

export interface ContextDecision {
  id: string;
  decision: string;
  rationale: string;
  timestamp: Date;
  sessionId?: string;
}
```

```typescript
// packages/core/src/domains/context/ContextManager.ts
export class ContextManager {
  private rules: Map<string, ContextRule> = new Map();
  private decisions: ContextDecision[] = [];
  
  addRule(rule: string, source: ContextRule['source'] = 'user'): void {
    const id = this.generateId();
    this.rules.set(id, {
      id,
      rule,
      source,
      confidence: source === 'user' ? 1.0 : 0.5,
      appliedCount: 0
    });
    this.persist();
  }
  
  addDecision(decision: string, rationale: string, sessionId?: string): void {
    this.decisions.push({
      id: this.generateId(),
      decision,
      rationale,
      timestamp: new Date(),
      sessionId
    });
    this.persist();
  }
  
  getRulesForContext(keywords: string[]): ContextRule[] {
    return Array.from(this.rules.values())
      .filter(rule => keywords.some(kw => 
        rule.rule.toLowerCase().includes(kw.toLowerCase())
      ))
      .sort((a, b) => b.confidence - a.confidence);
  }
  
  getRecentDecisions(limit: number = 10): ContextDecision[] {
    return this.decisions
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
}
```

```typescript
// packages/core/src/domains/context/ContextStorage.ts
export class ContextStorage {
  constructor(private storagePath: string) {}
  
  async save(context: Context): Promise<void> {
    const filePath = path.join(this.storagePath, 'context.json');
    await fs.writeFile(filePath, JSON.stringify(context, null, 2));
  }
  
  async load(): Promise<Context | null> {
    const filePath = path.join(this.storagePath, 'context.json');
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  
  async append(rule?: ContextRule, decision?: ContextDecision): Promise<void> {
    const context = await this.load() || this.createEmpty();
    if (rule) context.rules.push(rule);
    if (decision) context.decisions.push(decision);
    context.updatedAt = new Date();
    await this.save(context);
  }
}
```

```typescript
// packages/core/src/domains/context/ContextReinforcer.ts
export class ContextReinforcer {
  constructor(
    private contextManager: ContextManager,
    private knowledgeSystem: KnowledgeSystem
  ) {}
  
  generateReinforcement(session: Session): string {
    const rules = this.contextManager.getRulesForContext(
      this.extractKeywords(session.prompt)
    );
    const decisions = this.contextManager.getRecentDecisions(5);
    
    if (rules.length === 0 && decisions.length === 0) {
      return ''; // No reinforcement needed
    }
    
    const sections: string[] = [];
    
    if (rules.length > 0) {
      sections.push('## Context Rules\n' + 
        rules.map(r => `- ${r.rule}`).join('\n'));
    }
    
    if (decisions.length > 0) {
      sections.push('## Recent Decisions\n' +
        decisions.map(d => `- ${d.decision}: ${d.rationale}`).join('\n'));
    }
    
    return sections.join('\n\n');
  }
  
  shouldReinforce(session: Session): boolean {
    // Reinforce if:
    // 1. Session is long (>10 activities)
    // 2. Been more than 30 minutes
    // 3. Detected potential context loss
    return session.activities.length > 10 ||
           this.getSessionDuration(session) > 30 * 60 * 1000 ||
           this.detectContextLoss(session);
  }
  
  private detectContextLoss(session: Session): boolean {
    // Simple heuristic: Recent activities contradict rules
    const recentActivities = session.activities.slice(-5);
    const rules = this.contextManager.getRulesForContext([]);
    
    // Check if recent code violates known rules
    // This is simplified - real implementation would be more sophisticated
    return false; // Placeholder
  }
}
```

**Success Criteria:**
- [ ] Context domain created with all 3 components
- [ ] `.agent-brain/context.json` file created
- [ ] Integration with SessionManager
- [ ] Basic reinforcement generation working

---

## Week 2: Complete Missing UI Components

### Day 6-7: Comparison View Implementation

**Problem**: Users can't see before/after enhancement  
**File**: `packages/core/src/domains/visualization/ui/ComparisonView.ts`

```typescript
export class ComparisonView {
  private container: HTMLElement;
  private leftPanel: HTMLElement;
  private rightPanel: HTMLElement;
  
  constructor(containerId: string = 'comparison-view') {
    this.container = document.getElementById(containerId) || this.createElement();
    this.render();
  }
  
  show(original: string, enhanced: string, metadata: EnhancementMetadata): void {
    this.leftPanel.innerHTML = this.renderCode(original, 'Original Prompt');
    this.rightPanel.innerHTML = this.renderCode(enhanced, 'Enhanced Prompt');
    
    // Show diff highlights
    this.highlightDifferences(original, enhanced);
    
    // Show metadata
    this.renderMetadata(metadata);
    
    // Show knowledge items used
    this.renderKnowledgeItems(metadata.knowledgeUsed);
    
    this.container.style.display = 'flex';
  }
  
  private renderCode(code: string, title: string): string {
    return `
      <div class="code-panel">
        <h3>${title}</h3>
        <pre><code>${this.escapeHtml(code)}</code></pre>
      </div>
    `;
  }
  
  private highlightDifferences(original: string, enhanced: string): void {
    // Use diff library to highlight changes
    const diff = this.computeDiff(original, enhanced);
    
    // Add visual indicators for additions
    diff.additions.forEach(addition => {
      this.addHighlight(this.rightPanel, addition, 'addition');
    });
  }
  
  private renderMetadata(metadata: EnhancementMetadata): void {
    const metadataEl = document.createElement('div');
    metadataEl.className = 'enhancement-metadata';
    metadataEl.innerHTML = `
      <div class="metadata-item">
        <span class="label">Stage:</span>
        <span class="value">${metadata.stage}</span>
      </div>
      <div class="metadata-item">
        <span class="label">Patterns Applied:</span>
        <span class="value">${metadata.patternsApplied}</span>
      </div>
      <div class="metadata-item">
        <span class="label">Context Added:</span>
        <span class="value">${metadata.contextItemsAdded}</span>
      </div>
    `;
    this.container.appendChild(metadataEl);
  }
  
  hide(): void {
    this.container.style.display = 'none';
  }
}
```

**CSS Addition:**
```css
/* packages/core/src/domains/visualization/styles/components/comparison-view.css */
.comparison-view {
  display: flex;
  gap: 20px;
  padding: 20px;
  background: var(--vscode-editor-background);
}

.code-panel {
  flex: 1;
  border: 1px solid var(--vscode-panel-border);
  border-radius: 4px;
  padding: 15px;
}

.code-panel h3 {
  margin-top: 0;
  color: var(--vscode-foreground);
}

.code-panel pre {
  overflow-x: auto;
  background: var(--vscode-textCodeBlock-background);
  padding: 10px;
  border-radius: 4px;
}

.highlight-addition {
  background-color: rgba(0, 255, 0, 0.1);
  border-left: 3px solid #00ff00;
}

.enhancement-metadata {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: var(--vscode-panel-background);
  padding: 10px;
  border-radius: 4px;
}
```

### Day 8-9: Knowledge Health Metrics

**Problem**: No visibility into knowledge quality  
**Files**: Create health metrics system

```typescript
// packages/core/src/domains/knowledge/KnowledgeHealthMetrics.ts
export class KnowledgeHealthMetrics {
  constructor(
    private knowledgeSystem: KnowledgeSystem,
    private profileManager: ProjectProfileManager
  ) {}
  
  async calculateHealth(): Promise<HealthMetrics> {
    const patterns = await this.knowledgeSystem.getAllPatterns();
    const adrs = await this.knowledgeSystem.getAllADRs();
    const learnings = await this.knowledgeSystem.getAllLearnings();
    const goldenPaths = await this.knowledgeSystem.getAllGoldenPaths();
    
    return {
      completeness: this.calculateCompleteness(patterns, adrs, learnings, goldenPaths),
      coverage: this.calculateCoverage(patterns, adrs),
      actionability: this.calculateActionability(learnings),
      recency: this.calculateRecency(patterns, adrs, learnings),
      recommendations: this.generateRecommendations()
    };
  }
  
  private calculateCompleteness(
    patterns: any[], 
    adrs: any[], 
    learnings: any[], 
    goldenPaths: any[]
  ): CompletennessScore {
    const scores = {
      patterns: patterns.length > 0 ? Math.min(patterns.length / 10, 1) : 0,
      adrs: adrs.length > 0 ? Math.min(adrs.length / 5, 1) : 0,
      learnings: learnings.length > 0 ? Math.min(learnings.length / 20, 1) : 0,
      goldenPaths: goldenPaths.length > 0 ? Math.min(goldenPaths.length / 3, 1) : 0
    };
    
    const overall = (scores.patterns + scores.adrs + scores.learnings + scores.goldenPaths) / 4;
    
    return {
      overall: Math.round(overall * 100),
      breakdown: scores,
      status: overall > 0.75 ? 'good' : overall > 0.5 ? 'fair' : 'needs-attention'
    };
  }
  
  private calculateCoverage(patterns: any[], adrs: any[]): CoverageScore {
    // Check coverage of common scenarios
    const commonScenarios = [
      'authentication', 'validation', 'error-handling',
      'testing', 'api', 'database', 'ui-components'
    ];
    
    const covered = commonScenarios.filter(scenario => 
      patterns.some(p => p.name.toLowerCase().includes(scenario)) ||
      adrs.some(a => a.title.toLowerCase().includes(scenario))
    );
    
    return {
      percentage: Math.round((covered.length / commonScenarios.length) * 100),
      covered: covered,
      missing: commonScenarios.filter(s => !covered.includes(s))
    };
  }
  
  private generateRecommendations(): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // Check for missing categories
    if (this.knowledgeSystem.getAllPatterns().length === 0) {
      recommendations.push({
        priority: 'high',
        message: 'Start by documenting your most common code patterns',
        action: 'Create first pattern',
        command: 'agent-brain.createPattern'
      });
    }
    
    // Add more recommendation logic
    
    return recommendations;
  }
}
```

```typescript
// packages/vscode/src/views/KnowledgeHealthView.ts
export class KnowledgeHealthView {
  private panel: vscode.WebviewPanel | undefined;
  
  constructor(private context: vscode.ExtensionContext) {}
  
  show(): void {
    this.panel = vscode.window.createWebviewPanel(
      'knowledgeHealth',
      'Knowledge Health',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );
    
    this.panel.webview.html = this.getWebviewContent();
    this.updateHealthMetrics();
  }
  
  private async updateHealthMetrics(): Promise<void> {
    const metrics = await this.healthMetrics.calculateHealth();
    
    this.panel?.webview.postMessage({
      type: 'updateMetrics',
      metrics
    });
  }
  
  private getWebviewContent(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .health-card {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
          }
          
          .health-score {
            font-size: 48px;
            font-weight: bold;
            text-align: center;
          }
          
          .health-score.good { color: #4caf50; }
          .health-score.fair { color: #ff9800; }
          .health-score.needs-attention { color: #f44336; }
          
          .progress-bar {
            width: 100%;
            height: 20px;
            background: var(--vscode-input-background);
            border-radius: 10px;
            overflow: hidden;
          }
          
          .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #4caf50, #8bc34a);
            transition: width 0.3s ease;
          }
        </style>
      </head>
      <body>
        <div class="health-card">
          <h2>Knowledge Completeness</h2>
          <div class="health-score" id="completeness-score">0%</div>
          <div class="progress-bar">
            <div class="progress-fill" id="completeness-bar"></div>
          </div>
        </div>
        
        <div class="health-card">
          <h2>Coverage</h2>
          <div class="health-score" id="coverage-score">0%</div>
          <div id="missing-scenarios"></div>
        </div>
        
        <div class="health-card">
          <h2>Recommendations</h2>
          <ul id="recommendations"></ul>
        </div>
        
        <script>
          // Handle messages from extension
          window.addEventListener('message', event => {
            const message = event.data;
            if (message.type === 'updateMetrics') {
              updateUI(message.metrics);
            }
          });
        </script>
      </body>
      </html>
    `;
  }
}
```

### Day 10: VSCode Commands Implementation

**Problem**: Import/Export commands not implemented  
**Files**: Create command files

```typescript
// packages/vscode/src/commands/importPackage.ts
export class ImportPackageCommand extends BaseCommand {
  readonly id = 'agent-brain.importPackage';
  
  protected async execute(): Promise<void> {
    // 1. Show file picker
    const fileUri = await vscode.window.showOpenDialog({
      canSelectMany: false,
      filters: {
        'Agent Brain Package': ['abp', 'json']
      }
    });
    
    if (!fileUri || fileUri.length === 0) return;
    
    try {
      // 2. Read package file
      const packageData = await fs.readFile(fileUri[0].fsPath, 'utf-8');
      const expertisePackage = JSON.parse(packageData);
      
      // 3. Check for conflicts
      const conflicts = await this.packageManager.checkConflicts(expertisePackage);
      
      if (conflicts.length > 0) {
        const action = await vscode.window.showWarningMessage(
          `Package "${expertisePackage.name}" conflicts with existing packages`,
          'Replace', 'Merge', 'Cancel'
        );
        
        if (action === 'Cancel') return;
        
        if (action === 'Replace') {
          await this.packageManager.replacePackage(expertisePackage.id, expertisePackage);
        } else {
          await this.packageManager.mergePackage(expertisePackage);
        }
      } else {
        // 4. Import package
        await this.packageManager.importPackage(expertisePackage);
      }
      
      // 5. Show success
      vscode.window.showInformationMessage(
        `Successfully imported package: ${expertisePackage.name}`
      );
      
      // 6. Refresh knowledge tree
      await vscode.commands.executeCommand('agent-brain.refreshKnowledgeTree');
      
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to import package: ${error.message}`
      );
    }
  }
}
```

```typescript
// packages/vscode/src/commands/exportPackage.ts
export class ExportPackageCommand extends BaseCommand {
  readonly id = 'agent-brain.exportPackage';
  
  protected async execute(): Promise<void> {
    // 1. Show package picker
    const packages = await this.packageManager.getAllPackages();
    
    if (packages.length === 0) {
      vscode.window.showInformationMessage('No packages available to export');
      return;
    }
    
    const selected = await vscode.window.showQuickPick(
      packages.map(p => ({
        label: p.name,
        description: p.description,
        detail: `${p.rules.length} rules, ${p.patterns.length} patterns`,
        package: p
      })),
      { placeHolder: 'Select package to export' }
    );
    
    if (!selected) return;
    
    // 2. Ask for export options
    const includeDependencies = await vscode.window.showQuickPick(
      ['Export with dependencies', 'Export standalone'],
      { placeHolder: 'Export options' }
    ) === 'Export with dependencies';
    
    // 3. Show save dialog
    const saveUri = await vscode.window.showSaveDialog({
      filters: {
        'Agent Brain Package': ['abp'],
        'JSON': ['json']
      },
      defaultUri: vscode.Uri.file(`${selected.package.id}.abp`)
    });
    
    if (!saveUri) return;
    
    try {
      // 4. Export package
      const exportData = includeDependencies ?
        await this.packageManager.exportWithDependencies(selected.package.id) :
        selected.package;
      
      // 5. Write to file
      await fs.writeFile(
        saveUri.fsPath,
        JSON.stringify(exportData, null, 2)
      );
      
      // 6. Show success with open option
      const action = await vscode.window.showInformationMessage(
        `Package exported to ${path.basename(saveUri.fsPath)}`,
        'Open File'
      );
      
      if (action === 'Open File') {
        await vscode.commands.executeCommand('vscode.open', saveUri);
      }
      
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to export package: ${error.message}`
      );
    }
  }
}
```

---

## Week 3: Resolve Conflicts and Architecture Issues

### Day 11: Resolve Stage 5 Naming Collision

**Problem**: Two different "Stage 5" implementations exist  
**Solution**: Renumber UX stages to avoid conflict

**Changes Required:**

1. **Rename UX Advanced Stages:**
   - Current Stage 5 (Planning) stays as is
   - UX Stage 5 (Agent Optimization) → Stage 6
   - UX Stage 6 (Interactive) → Stage 7
   - UX Stage 7 (LLM-Assisted) → Stage 8
   - UX Stage 8 (Multi-Version) → Stage 9

2. **Update Documentation:**
```markdown
## Enhancement Stages Architecture

### Core Stages (Mechanical - No AI Required)
- **Stage 1**: Context Injection - Add file, errors, test failures
- **Stage 2**: Pattern Expansion - Expand pronouns, detect missing specs
- **Stage 3**: Structural Templates - Apply templates (bug fix, feature, etc.)
- **Stage 4**: Success Learning - Apply learned success patterns

### Knowledge Injection Stage
- **Stage 5**: Planning Enforcement - Require structured plans before coding

### Advanced Stages (Future Implementation)
- **Stage 6**: Agent Optimization - Tailor prompts for specific AI agents
- **Stage 7**: Interactive Refinement - Ask clarifying questions
- **Stage 8**: LLM-Assisted Intent - Use secondary AI for intent recognition
- **Stage 9**: Multi-Version Generation - Create multiple prompt versions
```

3. **Update Code Comments:**
```typescript
// packages/core/src/domains/enhancement/PromptEnhancer.ts
/**
 * Prompt Enhancement Pipeline
 * 
 * Stages 1-4: Core mechanical enhancement (always available)
 * Stage 5: Planning enforcement (from Knowledge Injection)
 * Stages 6-9: Advanced features (future implementation)
 * 
 * The system gracefully falls back if a stage fails:
 * Stage 5 → Stage 4 → Stage 3 → Stage 2 → Stage 1
 */
```

### Day 12-13: Implement Basic Golden Paths

**Problem**: Golden Paths category exists but is empty  
**Solution**: Implement minimal golden path system

```typescript
// packages/core/src/domains/knowledge/golden-paths/GoldenPath.ts
export interface GoldenPath {
  id: string;
  name: string;
  description: string;
  category: string;
  steps: GoldenPathStep[];
  metadata: {
    created: Date;
    updated: Date;
    usageCount: number;
    successRate: number;
  };
}

export interface GoldenPathStep {
  order: number;
  name: string;
  description: string;
  required: boolean;
  validation?: string; // Regex or function to validate completion
  tips?: string[];
  patterns?: string[]; // Pattern IDs to apply
  templates?: string[]; // Template IDs to use
}
```

```typescript
// packages/core/src/domains/knowledge/golden-paths/GoldenPathSystem.ts
export class GoldenPathSystem {
  private paths: Map<string, GoldenPath> = new Map();
  
  constructor(private storagePath: string) {
    this.loadPaths();
  }
  
  async createPath(name: string, steps: GoldenPathStep[]): Promise<GoldenPath> {
    const path: GoldenPath = {
      id: this.generateId(),
      name,
      description: '',
      category: 'custom',
      steps,
      metadata: {
        created: new Date(),
        updated: new Date(),
        usageCount: 0,
        successRate: 0
      }
    };
    
    this.paths.set(path.id, path);
    await this.persist();
    return path;
  }
  
  async captureFromSession(session: Session): Promise<GoldenPath | null> {
    // Analyze successful session to extract workflow
    if (session.status !== 'completed' || !session.metadata?.success) {
      return null;
    }
    
    const steps = this.extractStepsFromActivities(session.activities);
    
    if (steps.length < 2) {
      return null; // Too few steps to make a path
    }
    
    const name = await this.generatePathName(session);
    return this.createPath(name, steps);
  }
  
  private extractStepsFromActivities(activities: Activity[]): GoldenPathStep[] {
    const significantActivities = activities.filter(a => 
      a.type === 'file-created' || 
      a.type === 'file-modified' ||
      a.type === 'test-run' ||
      a.type === 'command-executed'
    );
    
    return significantActivities.map((activity, index) => ({
      order: index + 1,
      name: this.activityToStepName(activity),
      description: this.activityToDescription(activity),
      required: true,
      tips: this.generateTips(activity)
    }));
  }
  
  getAllPaths(): GoldenPath[] {
    return Array.from(this.paths.values());
  }
  
  getPathsByCategory(category: string): GoldenPath[] {
    return this.getAllPaths().filter(p => p.category === category);
  }
  
  async trackUsage(pathId: string, successful: boolean): Promise<void> {
    const path = this.paths.get(pathId);
    if (path) {
      path.metadata.usageCount++;
      if (successful) {
        path.metadata.successRate = 
          (path.metadata.successRate * (path.metadata.usageCount - 1) + 1) / 
          path.metadata.usageCount;
      }
      await this.persist();
    }
  }
}
```

**Add Default Golden Paths:**
```typescript
// packages/core/src/domains/knowledge/golden-paths/defaults.ts
export const DEFAULT_GOLDEN_PATHS: GoldenPath[] = [
  {
    id: 'gp-001',
    name: 'Create REST API Endpoint',
    description: 'Standard workflow for adding a new API endpoint',
    category: 'backend',
    steps: [
      {
        order: 1,
        name: 'Define data model',
        description: 'Create or update the data model/schema',
        required: true,
        patterns: ['data-model-pattern'],
        tips: ['Consider validation requirements', 'Think about relationships']
      },
      {
        order: 2,
        name: 'Add validation',
        description: 'Implement input validation rules',
        required: true,
        patterns: ['validation-pattern'],
        tips: ['Use a validation library', 'Consider edge cases']
      },
      {
        order: 3,
        name: 'Write tests',
        description: 'Create unit and integration tests',
        required: true,
        patterns: ['test-pattern'],
        tips: ['Test happy path and error cases', 'Mock external dependencies']
      },
      {
        order: 4,
        name: 'Implement endpoint',
        description: 'Create the actual endpoint handler',
        required: true,
        patterns: ['endpoint-pattern'],
        tips: ['Follow RESTful conventions', 'Include proper error responses']
      },
      {
        order: 5,
        name: 'Update documentation',
        description: 'Add API documentation',
        required: false,
        tips: ['Include examples', 'Document error codes']
      }
    ],
    metadata: {
      created: new Date(),
      updated: new Date(),
      usageCount: 0,
      successRate: 0
    }
  },
  // Add more default paths...
];
```

### Day 14: ComplianceMonitor UI Integration

**Problem**: ComplianceMonitor UI created but not integrated  
**Solution**: Wire it to the validation system

```typescript
// packages/vscode/src/providers/ComplianceProvider.ts
export class ComplianceProvider implements vscode.CodeActionProvider {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private validator: ComplianceValidator;
  
  constructor(
    private packageHierarchy: PackageHierarchy,
    private context: vscode.ExtensionContext
  ) {
    this.validator = new ComplianceValidator(packageHierarchy);
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('agent-brain');
    
    // Auto-validate on save
    vscode.workspace.onDidSaveTextDocument(this.validateDocument.bind(this));
    
    // Register as code action provider
    context.subscriptions.push(
      vscode.languages.registerCodeActionsProvider(
        { pattern: '**/*.{ts,js,py,java}' },
        this
      )
    );
  }
  
  async validateDocument(document: vscode.TextDocument): Promise<void> {
    const code = document.getText();
    const context = await this.extractContext(document);
    
    const result = await this.validator.validateAgainstPackages(code, context);
    
    // Convert violations to diagnostics
    const diagnostics: vscode.Diagnostic[] = result.violations.map(violation => {
      const range = this.getViolationRange(document, violation);
      const diagnostic = new vscode.Diagnostic(
        range,
        violation.message,
        this.getSeverity(violation.severity)
      );
      diagnostic.code = violation.rule.id;
      diagnostic.source = 'Agent Brain';
      return diagnostic;
    });
    
    this.diagnosticCollection.set(document.uri, diagnostics);
    
    // Send to webview if timeline is visible
    if (timelineProvider) {
      timelineProvider.postMessageToWebview({
        type: 'updateCompliance',
        violations: result.violations,
        validations: result.validations
      });
    }
  }
  
  private async extractContext(document: vscode.TextDocument): Context {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    
    return {
      language: document.languageId,
      framework: await this.detectFramework(workspaceFolder),
      filePath: document.uri.fsPath,
      projectPath: workspaceFolder?.uri.fsPath || ''
    };
  }
  
  private async detectFramework(folder?: vscode.WorkspaceFolder): Promise<string> {
    if (!folder) return 'unknown';
    
    // Check package.json for frameworks
    try {
      const packageJsonPath = path.join(folder.uri.fsPath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };
      
      if (deps.react) return 'react';
      if (deps.vue) return 'vue';
      if (deps.angular) return 'angular';
      if (deps.express) return 'express';
      if (deps.nestjs) return 'nestjs';
      
    } catch {
      // No package.json or error reading
    }
    
    return 'unknown';
  }
  
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];
    
    // Get diagnostics in range
    const diagnostics = context.diagnostics.filter(d => d.source === 'Agent Brain');
    
    for (const diagnostic of diagnostics) {
      if (diagnostic.code) {
        const fix = this.validator.getAutoFix(diagnostic.code as string);
        
        if (fix) {
          const action = new vscode.CodeAction(
            `Fix: ${diagnostic.message}`,
            vscode.CodeActionKind.QuickFix
          );
          
          action.edit = new vscode.WorkspaceEdit();
          action.edit.replace(
            document.uri,
            diagnostic.range,
            fix.replacement
          );
          
          action.diagnostics = [diagnostic];
          actions.push(action);
        }
      }
    }
    
    return actions;
  }
}
```

### Day 15: Package Analytics Implementation

**Problem**: PackageAnalytics not implemented  
**Solution**: Create analytics tracking

```typescript
// packages/core/src/domains/expertise/PackageAnalytics.ts
export class PackageAnalytics {
  private analytics: Map<string, PackageMetrics> = new Map();
  private storagePath: string;
  
  constructor(storagePath: string) {
    this.storagePath = path.join(storagePath, 'analytics');
    this.load();
  }
  
  trackPackageUsage(packageId: string, context: Context): void {
    const metrics = this.getOrCreateMetrics(packageId);
    
    metrics.usageCount++;
    metrics.lastUsed = new Date();
    
    // Track context
    if (!metrics.contexts[context.language]) {
      metrics.contexts[context.language] = 0;
    }
    metrics.contexts[context.language]++;
    
    this.persist();
  }
  
  trackRuleViolation(ruleId: string, packageId: string): void {
    const metrics = this.getOrCreateMetrics(packageId);
    
    if (!metrics.ruleViolations[ruleId]) {
      metrics.ruleViolations[ruleId] = 0;
    }
    metrics.ruleViolations[ruleId]++;
    
    metrics.totalViolations++;
    this.persist();
  }
  
  trackRulePrevention(ruleId: string, packageId: string): void {
    const metrics = this.getOrCreateMetrics(packageId);
    
    if (!metrics.rulePreventions[ruleId]) {
      metrics.rulePreventions[ruleId] = 0;
    }
    metrics.rulePreventions[ruleId]++;
    
    metrics.totalPreventions++;
    this.persist();
  }
  
  getPackageEffectiveness(packageId: string): EffectivenessMetrics {
    const metrics = this.analytics.get(packageId);
    
    if (!metrics) {
      return {
        usageCount: 0,
        violationsPrevented: 0,
        complianceRate: 0,
        topRules: []
      };
    }
    
    const complianceRate = metrics.totalPreventions / 
      (metrics.totalPreventions + metrics.totalViolations) || 0;
    
    const topRules = Object.entries(metrics.rulePreventions)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([ruleId, count]) => ({ ruleId, preventions: count }));
    
    return {
      usageCount: metrics.usageCount,
      violationsPrevented: metrics.totalPreventions,
      complianceRate: Math.round(complianceRate * 100),
      topRules
    };
  }
  
  private getOrCreateMetrics(packageId: string): PackageMetrics {
    if (!this.analytics.has(packageId)) {
      this.analytics.set(packageId, {
        packageId,
        usageCount: 0,
        totalViolations: 0,
        totalPreventions: 0,
        ruleViolations: {},
        rulePreventions: {},
        contexts: {},
        firstUsed: new Date(),
        lastUsed: new Date()
      });
    }
    return this.analytics.get(packageId)!;
  }
  
  private async persist(): Promise<void> {
    const data = Object.fromEntries(this.analytics);
    await fs.writeFile(
      path.join(this.storagePath, 'package-analytics.json'),
      JSON.stringify(data, null, 2)
    );
  }
  
  private async load(): Promise<void> {
    try {
      const data = await fs.readFile(
        path.join(this.storagePath, 'package-analytics.json'),
        'utf-8'
      );
      const parsed = JSON.parse(data);
      this.analytics = new Map(Object.entries(parsed));
    } catch {
      // File doesn't exist yet
    }
  }
}
```

---

## Week 4: Polish and Testing

### Day 16-17: End-to-End Testing

Create comprehensive test suite for the complete flow:

```typescript
// test/e2e/complete-flow.test.ts
describe('Agent Brain Complete Flow', () => {
  it('should enhance prompt through all stages', async () => {
    // 1. Start with basic prompt
    const prompt = 'fix the authentication bug';
    
    // 2. Enhance through stages 1-5
    const enhanced = await promptEnhancer.enhance(prompt, context);
    
    // 3. Verify each stage's contribution
    expect(enhanced).toContain('Current file:'); // Stage 1
    expect(enhanced).toContain('the authentication bug'); // Stage 2 (expanded)
    expect(enhanced).toContain('Root Cause:'); // Stage 3 template
    expect(enhanced).toContain('Previous successful'); // Stage 4
    expect(enhanced).toContain('Planning:'); // Stage 5
  });
  
  it('should track session and appear in timeline', async () => {
    // 1. Start session
    const session = await sessionManager.startSession('Create user API', 'claude');
    
    // 2. Track activities
    await sessionManager.trackActivity({
      type: 'file-created',
      metadata: { file: 'user.controller.ts' }
    });
    
    // 3. End session
    await sessionManager.finalizeSession('completed');
    
    // 4. Verify appears in timeline
    const events = await timelineProvider.getEvents();
    const sessionEvent = events.find(e => e.type === 'agent-session');
    
    expect(sessionEvent).toBeDefined();
    expect(sessionEvent.title).toBe('Create user API');
  });
  
  it('should show achievements on success', async () => {
    // 1. Complete successful session
    const session = await completeSuccessfulSession();
    
    // 2. Check for achievements
    const achievements = await achievementSystem.checkAchievements(session);
    
    // 3. Verify achievement triggered
    expect(achievements).toContain('first-success');
    
    // 4. Verify celebration shown
    const celebrations = await getCelebrationEvents();
    expect(celebrations).toHaveLength(1);
  });
});
```

### Day 18-19: Documentation Updates

Create comprehensive documentation:

1. **Architecture Overview**
   - Updated stage progression
   - Component relationships
   - Data flow diagrams

2. **User Guide**
   - How to use each feature
   - Tips and tricks
   - Common workflows

3. **API Reference**
   - All public APIs documented
   - Examples for each method
   - Migration guide for v1 users

### Day 20: Performance Optimization

Profile and optimize critical paths:

1. **Knowledge retrieval optimization**
   - Add caching layer
   - Implement lazy loading
   - Use indexes for search

2. **Enhancement pipeline optimization**
   - Parallelize independent stages
   - Cache stage results
   - Implement timeout handling

3. **UI responsiveness**
   - Debounce tip checking
   - Virtual scrolling for large lists
   - Progressive rendering

---

## Success Criteria for Wave 2

### Must Have (Core Functionality)
- [ ] Sessions appear in timeline in real-time
- [ ] Quick Prompt Panel fully functional
- [ ] Error detection and recovery working
- [ ] Context domain implemented
- [ ] Import/Export commands working
- [ ] Comparison View showing before/after
- [ ] Basic Golden Paths (at least 3 defaults)
- [ ] Stage naming conflict resolved

### Should Have (Polish)
- [ ] Knowledge Health Metrics
- [ ] Compliance validation on save
- [ ] Package Analytics tracking
- [ ] Periodic tip system active
- [ ] All tests passing
- [ ] Documentation complete

### Could Have (Nice to Have)
- [ ] Package recommendations
- [ ] Advanced golden path capture
- [ ] Performance optimizations
- [ ] Additional achievements

### Won't Have (Deferred to Wave 3)
- [ ] Complete PackageCreationStudio
- [ ] Enterprise features (vendors, marketplace)
- [ ] Stage 6-9 advanced enhancement
- [ ] LLM integration
- [ ] Multi-version generation

---

## Risk Mitigation

| Risk | Mitigation | Contingency |
|------|------------|-------------|
| Timeline integration breaks existing functionality | Thorough testing before merge | Feature flag to disable |
| Context domain too complex | Start with minimal implementation | Defer advanced features |
| UI components don't integrate well | Test in isolation first | Simplify UI if needed |
| Performance issues with real-time updates | Profile and optimize early | Add debouncing/throttling |
| Stage renumbering causes confusion | Clear documentation and migration guide | Keep old names as aliases |

---

## Definition of Done

A feature is considered complete when:

1. **Code Complete**
   - Implementation matches specification
   - All edge cases handled
   - Error handling in place

2. **Testing Complete**
   - Unit tests written and passing
   - Integration tests where applicable
   - Manual testing performed

3. **Documentation Complete**
   - Code comments added
   - API documentation updated
   - User guide updated if needed

4. **Review Complete**
   - Code reviewed
   - UI/UX reviewed if applicable
   - Performance acceptable

---

## Conclusion

Wave 2 focuses on **completing what was started** rather than building new features. By the end of this 3-4 week sprint:

1. All partially implemented features will be complete
2. The system will work end-to-end for real users
3. Critical architectural issues will be resolved
4. Foundation will be ready for Wave 3 advanced features

The key principle: **"Make it work, then make it better"**

**Next Steps:**
1. Review and approve this plan
2. Assign developers to each week's tasks
3. Set up daily standups for coordination
4. Begin Week 1 implementation on Monday