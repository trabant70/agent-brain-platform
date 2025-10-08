# Agent Brain Golden Paths - Development Workflows

## Golden Path: Add New Enhancement Stage

**Purpose**: Add a new capability to the prompt enhancement pipeline  
**Duration**: 2-4 hours  
**Complexity**: Medium

### Prerequisites
- [ ] Understand existing stages 1-8
- [ ] Identify specific capability to add
- [ ] Determine stage number (next sequential)

### Step 1: Create Stage Class File
**Location**: `packages/core/src/domains/enhancement/stages/StageN_[Capability].ts`

```typescript
import { StageNMinus1 } from './StageNMinus1_[PreviousCapability]';
import { EnhancementContext, EnhancedPrompt } from '../types';

export class StageN_[Capability] extends StageNMinus1 {
  // Add ONE specific capability
  
  enhance(prompt: string, context: EnhancementContext): string {
    // Your new logic
    let enhanced = this.apply[Capability](prompt, context);
    
    // Chain to previous stages
    return super.enhance(enhanced, context);
  }
  
  private apply[Capability](prompt: string, context: EnhancementContext): string {
    // Implementation of your specific enhancement
  }
}
```

### Step 2: Add Tests
**Location**: `packages/core/src/domains/enhancement/stages/__tests__/StageN_[Capability].test.ts`

```typescript
describe('StageN_[Capability]', () => {
  let stage: StageN_[Capability];
  
  beforeEach(() => {
    stage = new StageN_[Capability]();
  });
  
  test('should apply [capability] when [condition]', () => {
    const input = 'original prompt';
    const context = { /* relevant context */ };
    const result = stage.enhance(input, context);
    
    expect(result).toContain('[expected enhancement]');
  });
  
  test('should not apply when [negative condition]', () => {
    // Test when enhancement shouldn't apply
  });
  
  test('should chain to previous stages', () => {
    // Verify previous stage enhancements still work
  });
});
```

### Step 3: Update PromptEnhancerFactory
**Location**: `packages/core/src/domains/enhancement/PromptEnhancerFactory.ts`

```typescript
static create(config: EnhancerConfig): PromptEnhancer {
  // Add your stage to the cascade
  if (config.enable[Capability]) {
    return new StageN_[Capability]();
  }
  
  // ... existing cascade
}
```

### Step 4: Add Configuration Option
**Location**: `packages/core/src/domains/enhancement/types.ts`

```typescript
export interface EnhancerConfig {
  // ... existing options
  enable[Capability]?: boolean;  // Add your flag
}
```

### Step 5: Update UI to Show Stage
**Location**: `packages/core/src/domains/visualization/ui/EnhancementLevelIndicator.ts`

```typescript
const stages = [
  // ... existing stages
  { number: N, name: '[Capability]', icon: '[emoji]' }
];
```

### Step 6: Document the Stage
**Location**: `docs/enhancement-stages.md`

Add documentation explaining:
- What the stage does
- When it's activated  
- Example before/after
- Configuration options

### Step 7: Test End-to-End
Run through complete enhancement flow:
1. Create prompt that should trigger your enhancement
2. Verify enhancement applies correctly
3. Check that previous stages still work
4. Test with your enhancement disabled

### Success Criteria
- [ ] Stage only adds ONE capability
- [ ] Previous stages still function
- [ ] Tests pass for positive and negative cases
- [ ] Can be enabled/disabled independently
- [ ] Documented with examples

---

## Golden Path: Create Knowledge Package

**Purpose**: Package expertise for distribution  
**Duration**: 1-2 hours  
**Complexity**: Medium

### Prerequisites
- [ ] Identify domain expertise to package
- [ ] Collect examples of good/bad code
- [ ] Define rules and patterns

### Step 1: Initialize Package Structure
Create folder: `.agent-brain/packages/[domain-name]/`

```
[domain-name]/
├── package.json         # Metadata
├── rules/              # Expertise rules
├── templates/          # Planning templates
├── patterns/           # Code patterns
├── examples/           # Good/bad examples
└── README.md          # Documentation
```

### Step 2: Define Package Metadata
**File**: `package.json`

```json
{
  "id": "org.company.domain-name",
  "name": "Domain Expertise Package",
  "version": "1.0.0",
  "author": {
    "name": "Your Name",
    "role": "Senior Developer",
    "organization": "Company"
  },
  "domain": "specific-domain",
  "authority": "domain-expert",
  "enforcement": "recommended",
  "description": "Expert knowledge for [domain]",
  "keywords": ["domain", "expertise", "patterns"]
}
```

### Step 3: Define Rules
**File**: `rules/rule-name.json`

```json
{
  "id": "rule-001",
  "name": "Descriptive Rule Name",
  "category": "architecture",
  "severity": "error",
  "description": "What this rule enforces",
  "rationale": "Why this matters",
  "condition": {
    "pattern": "regex-to-match",
    "context": ["file-types", "situations"]
  },
  "requirement": "What must be done instead",
  "examples": {
    "bad": "// Code that violates rule",
    "good": "// Code that follows rule"
  }
}
```

### Step 4: Create Planning Template
**File**: `templates/planning-template.yaml`

```yaml
id: template-001
name: Planning Template Name
triggers:
  - "pattern to match"
  - "another trigger"

sections:
  - id: analysis
    title: Analysis Phase
    required: true
    prompt: |
      Before implementing, analyze:
      1. Current state
      2. Requirements
      3. Constraints
    
  - id: design
    title: Design Decisions
    required: true
    prompt: |
      Document your approach:
      - High-level design
      - Component breakdown
      - Integration points

validation:
  - All required sections completed
  - Specific checks for this domain
```

### Step 5: Add Code Patterns
**File**: `patterns/pattern-name.md`

```markdown
# Pattern: [Pattern Name]

## When to Use
[Describe situations where this pattern applies]

## Solution
```typescript
// Show the pattern implementation
```

## Benefits
- [List benefits]

## Example Usage
```typescript
// Complete example
```
```

### Step 6: Include Examples
**File**: `examples/example-001.json`

```json
{
  "id": "example-001",
  "title": "Example Scenario",
  "description": "What this demonstrates",
  "prompt": "Original user request",
  "bad_implementation": {
    "code": "// What not to do",
    "problems": ["Issue 1", "Issue 2"]
  },
  "good_implementation": {
    "code": "// Correct approach",
    "benefits": ["Benefit 1", "Benefit 2"]
  }
}
```

### Step 7: Write Documentation
**File**: `README.md`

```markdown
# [Package Name]

## Overview
Brief description of what expertise this package provides.

## Installation
```bash
agentbrain package install ./[domain-name]
```

## What's Included
- X rules for [domain]
- Y planning templates
- Z code patterns

## When to Use This Package
- Situation 1
- Situation 2

## Requirements
- Prerequisites
- Dependencies

## Author
[Your name and credentials]
```

### Step 8: Validate Package
Run validation command:
```bash
agentbrain package validate ./[domain-name]
```

Check for:
- [ ] Valid JSON/YAML syntax
- [ ] Required fields present
- [ ] No circular dependencies
- [ ] Examples compile/run

### Step 9: Test Package
1. Install in test project
2. Create prompt that should trigger rules
3. Verify planning templates activate
4. Check pattern suggestions appear

### Step 10: Publish (Optional)
```bash
agentbrain package publish ./[domain-name] --registry community
```

### Success Criteria
- [ ] All files valid and complete
- [ ] Rules have clear conditions and requirements
- [ ] Templates improve AI planning
- [ ] Examples demonstrate value
- [ ] Documentation explains usage

---

## Golden Path: Add UI Panel with Guidance

**Purpose**: Add new UI component with contextual help  
**Duration**: 3-4 hours  
**Complexity**: Medium-High

### Prerequisites
- [ ] Design panel layout and behavior
- [ ] Identify help triggers
- [ ] Plan progressive disclosure

### Step 1: Create Panel Controller
**Location**: `packages/core/src/domains/visualization/ui/[PanelName]Controller.ts`

```typescript
export class [PanelName]Controller {
  private panel: HTMLElement | null = null;
  private isVisible = false;
  private level: 'essential' | 'common' | 'advanced' = 'essential';
  
  initialize(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('[PanelName] container not found');
      return;
    }
    
    container.innerHTML = this.render();
    this.attachEventListeners();
    this.registerGuidance();
  }
  
  private render(): string {
    return `
      <div class="[panel-name]-panel" id="[panel-name]-panel">
        ${this.renderEssential()}
        ${this.level !== 'essential' ? this.renderCommon() : ''}
        ${this.level === 'advanced' ? this.renderAdvanced() : ''}
        ${this.renderExpandButton()}
      </div>
    `;
  }
  
  private renderEssential(): string {
    // Minimum viable UI
  }
  
  private registerGuidance(): void {
    // Register contextual help triggers
    if (window.guidanceEngine) {
      window.guidanceEngine.addRule({
        id: '[panel-name]-first-use',
        trigger: (ctx) => ctx.panelsOpened['[panel-name]'] === 1,
        message: 'Helpful tip for first time users',
        priority: 'helpful'
      });
    }
  }
}
```

### Step 2: Add Styles
**Location**: `packages/core/src/domains/visualization/styles/components/[panel-name].css`

```css
.[panel-name]-panel {
  /* Panel container */
  position: fixed;
  background: var(--vscode-editor-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  animation: slideIn 0.3s ease-out;
}

/* Progressive disclosure levels */
.[panel-name]-panel .common-controls {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--vscode-panel-border);
}

.[panel-name]-panel .advanced-controls {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--vscode-panel-border);
  background: var(--vscode-editor-background);
}

/* Responsive */
@media (max-width: 600px) {
  .[panel-name]-panel {
    width: 100%;
    max-width: 100%;
  }
}
```

### Step 3: Add to HTML Template
**Location**: `packages/core/src/domains/visualization/templates/timeline.html`

```html
<!-- Add container for your panel -->
<div id="[panel-name]-container"></div>

<!-- Add trigger button if needed -->
<button id="[panel-name]-trigger" class="panel-trigger">
  [Icon] [Panel Name]
</button>
```

### Step 4: Register in App
**Location**: `packages/core/src/domains/visualization/webview/SimpleTimelineApp.ts`

```typescript
import { [PanelName]Controller } from '../ui/[PanelName]Controller';

export class SimpleTimelineApp {
  private [panelName]Controller: [PanelName]Controller;
  
  constructor() {
    // ... existing code
    this.[panelName]Controller = new [PanelName]Controller();
  }
  
  async initialize() {
    // ... existing code
    this.[panelName]Controller.initialize('[panel-name]-container');
    
    // Wire up trigger
    document.getElementById('[panel-name]-trigger')?.addEventListener('click', () => {
      this.[panelName]Controller.toggle();
      this.trackPanelOpen('[panel-name]');
    });
  }
}
```

### Step 5: Add Message Handlers
**Location**: `packages/vscode/src/providers/timeline-provider-webpack.ts`

```typescript
case '[panelName]Action':
  await this.handle[PanelName]Action(message);
  break;

private async handle[PanelName]Action(message: any): Promise<void> {
  // Handle panel-specific actions
  try {
    // Process action
    const result = await this.process[PanelName](message.data);
    
    // Send response
    this.sendMessage({
      type: '[panelName]Result',
      result
    });
    
    // Track for guidance
    this.updateGuidanceContext({
      lastAction: '[panelName]Action',
      panelState: message.data
    });
  } catch (error) {
    this.sendMessage({
      type: 'error',
      message: `[PanelName] error: ${error}`
    });
  }
}
```

### Step 6: Add Contextual Help
**Location**: `packages/core/src/domains/guidance/rules/[panel-name]-rules.ts`

```typescript
export const [panelName]Rules: GuidanceRule[] = [
  {
    id: '[panel-name]-empty-state',
    trigger: (ctx) => ctx.currentPanel === '[panel-name]' && ctx.panelState.isEmpty,
    message: 'Start by [action]. Example: [example]',
    priority: 'helpful',
    maxShowCount: 2
  },
  {
    id: '[panel-name]-error-recovery',
    trigger: (ctx) => ctx.currentPanel === '[panel-name]' && ctx.lastError?.source === '[panel-name]',
    message: 'To fix this: [solution]',
    priority: 'critical',
    action: 'showRecovery'
  },
  {
    id: '[panel-name]-success-tip',
    trigger: (ctx) => ctx.panelActions['[panel-name]'] === 1,
    message: 'Great! Now you can [next step]',
    priority: 'informational',
    maxShowCount: 1
  }
];
```

### Step 7: Add Tests
**Location**: `packages/core/src/domains/visualization/ui/__tests__/[PanelName]Controller.test.ts`

```typescript
describe('[PanelName]Controller', () => {
  let controller: [PanelName]Controller;
  let container: HTMLElement;
  
  beforeEach(() => {
    container = document.createElement('div');
    container.id = '[panel-name]-container';
    document.body.appendChild(container);
    
    controller = new [PanelName]Controller();
    controller.initialize('[panel-name]-container');
  });
  
  test('should render essential controls by default', () => {
    expect(container.querySelector('.essential-controls')).toBeTruthy();
    expect(container.querySelector('.common-controls')).toBeFalsy();
  });
  
  test('should expand to show common controls', () => {
    const expandBtn = container.querySelector('.expand-button');
    expandBtn?.click();
    
    expect(container.querySelector('.common-controls')).toBeTruthy();
  });
  
  test('should register guidance rules', () => {
    expect(window.guidanceEngine.rules).toContainEqual(
      expect.objectContaining({ id: '[panel-name]-first-use' })
    );
  });
});
```

### Step 8: Document Panel Usage
**Location**: `docs/ui-panels.md`

Add section:
```markdown
## [Panel Name]

### Purpose
[What this panel does]

### Opening the Panel
Click the "[Panel Name]" button in [location]

### Progressive Disclosure Levels
- **Essential**: [What's shown by default]
- **Common**: [Additional options]
- **Advanced**: [Power user features]

### Contextual Help
The panel provides help when:
- First time opening
- Encountering errors
- Completing actions
```

### Success Criteria
- [ ] Panel renders with essential controls
- [ ] Progressive disclosure works
- [ ] Responsive on narrow screens
- [ ] Contextual help appears at right time
- [ ] Message handlers work
- [ ] Tests pass
- [ ] Documented

---

## Golden Path: Handle Error and Create Learning

**Purpose**: Convert AI error into reusable learning  
**Duration**: 30 minutes  
**Complexity**: Low

### Prerequisites
- [ ] Error detected in AI output
- [ ] User confirms it's an error

### Step 1: Detect Error Pattern
Identify the type of error:
- Syntax error
- Logic error
- Missing requirement
- Performance issue
- Security vulnerability

### Step 2: Extract Pattern
```typescript
const pattern = {
  type: 'error-type',
  trigger: 'what causes this',
  symptom: 'what goes wrong',
  context: 'when this happens'
};
```

### Step 3: Search Similar Learnings
```typescript
const similar = await learningSystem.findSimilar(pattern);
if (similar.length > 0) {
  // Show user: "I found X similar issues we've fixed before"
}
```

### Step 4: Create Learning
```typescript
const learning = {
  id: generateId(),
  name: await promptUser('Name this learning:'),
  pattern: pattern,
  description: 'What went wrong',
  solution: 'How to prevent it',
  examples: {
    bad: 'Code that causes error',
    good: 'Correct approach'
  },
  metadata: {
    created: new Date(),
    occurrences: 1,
    lastSeen: new Date(),
    successRate: 0
  }
};
```

### Step 5: Get User Confirmation
Show preview:
```
Learning: [Name]
Problem: [Description]
Solution: [Solution]
This will be applied to future prompts.
[Save] [Edit] [Cancel]
```

### Step 6: Save Learning
```typescript
await learningSystem.save(learning);
await knowledgeTree.refresh();
```

### Step 7: Apply Immediately
```typescript
// Add to current context
context.learnings.push(learning);

// Regenerate prompt with learning
const enhanced = await enhancer.enhance(originalPrompt, context);
```

### Step 8: Track Effectiveness
```typescript
// After session
if (sessionSuccessful) {
  learning.metadata.successRate = 
    (learning.metadata.successRate * learning.metadata.occurrences + 1) / 
    (learning.metadata.occurrences + 1);
  learning.metadata.occurrences++;
}
```

### Success Criteria
- [ ] Error pattern extracted
- [ ] Learning created with clear name
- [ ] Solution documented
- [ ] Applied to current session
- [ ] Visible in knowledge tree

---

## Golden Path: Implement Enterprise Feature

**Purpose**: Add multi-team/vendor capability  
**Duration**: 1-2 days  
**Complexity**: High

### Prerequisites
- [ ] Understand organizational requirements
- [ ] Have test vendors/teams available
- [ ] Security review completed

### Step 1: Define Data Model
**Location**: `packages/core/src/domains/enterprise/types.ts`

```typescript
export interface Organization {
  id: string;
  name: string;
  packages: string[];  // Required package IDs
  teams: Team[];
  vendors: Vendor[];
  compliance: ComplianceConfig;
}

export interface Team {
  id: string;
  name: string;
  members: string[];
  packages: string[];  // Additional packages
  overrides: PackageOverride[];
}

export interface Vendor {
  id: string;
  name: string;
  contactEmail: string;
  agentBrainEndpoint?: string;
  lastSync?: Date;
  complianceStatus: ComplianceStatus;
}
```

### Step 2: Create Sync Service
**Location**: `packages/core/src/domains/enterprise/SyncService.ts`

```typescript
export class SyncService {
  async syncOrganization(orgId: string): Promise<SyncResult> {
    const org = await this.loadOrganization(orgId);
    const results: VendorSyncResult[] = [];
    
    for (const vendor of org.vendors) {
      try {
        const result = await this.syncVendor(vendor, org.packages);
        results.push(result);
      } catch (error) {
        results.push({
          vendor: vendor.id,
          success: false,
          error: error.message
        });
      }
    }
    
    return { results, timestamp: new Date() };
  }
  
  private async syncVendor(
    vendor: Vendor, 
    packages: string[]
  ): Promise<VendorSyncResult> {
    if (vendor.agentBrainEndpoint) {
      // Remote sync
      return await this.remoteSyc(vendor, packages);
    } else {
      // Local sync (shared filesystem)
      return await this.localSync(vendor, packages);
    }
  }
}
```

### Step 3: Build Compliance Dashboard
**Location**: `packages/core/src/domains/visualization/ui/ComplianceDashboard.ts`

```typescript
export class ComplianceDashboard {
  render(data: ComplianceData): string {
    return `
      <div class="compliance-dashboard">
        <div class="summary">
          <div class="metric">
            <span class="value">${data.overallCompliance}%</span>
            <span class="label">Overall Compliance</span>
          </div>
        </div>
        
        <div class="vendor-grid">
          ${data.vendors.map(v => `
            <div class="vendor-card ${v.status}">
              <h3>${v.name}</h3>
              <div class="compliance-score">${v.compliance}%</div>
              <div class="violations">
                ${v.violations.map(viol => `
                  <div class="violation ${viol.severity}">
                    ${viol.rule}: ${viol.count}
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
        
        <div class="actions">
          <button onclick="syncAll()">Sync All Vendors</button>
          <button onclick="generateReport()">Generate Report</button>
        </div>
      </div>
    `;
  }
}
```

### Step 4: Add Admin Commands
**Location**: `packages/vscode/src/commands/enterprise-commands.ts`

```typescript
export function registerEnterpriseCommands(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('agentBrain.syncVendors', async () => {
      const org = await selectOrganization();
      const result = await syncService.syncOrganization(org.id);
      
      vscode.window.showInformationMessage(
        `Synced ${result.results.filter(r => r.success).length} of ${result.results.length} vendors`
      );
    }),
    
    vscode.commands.registerCommand('agentBrain.showCompliance', async () => {
      const panel = vscode.window.createWebviewPanel(
        'compliance',
        'Compliance Dashboard',
        vscode.ViewColumn.One,
        { enableScripts: true }
      );
      
      const data = await complianceService.getDashboardData();
      panel.webview.html = dashboard.render(data);
    }),
    
    vscode.commands.registerCommand('agentBrain.enforceCompliance', async () => {
      const level = await vscode.window.showQuickPick([
        'Mandatory Only',
        'Mandatory + Recommended',
        'All Packages'
      ]);
      
      await complianceService.setEnforcementLevel(level);
    })
  );
}
```

### Step 5: Implement Security
```typescript
export class SecurityManager {
  validatePackage(pkg: ExpertisePackage): SecurityValidation {
    return {
      signed: this.verifySignature(pkg),
      sandboxed: this.checkSandbox(pkg),
      permissions: this.validatePermissions(pkg),
      vulnerabilities: this.scanVulnerabilities(pkg)
    };
  }
  
  encryptForTransmission(packages: ExpertisePackage[]): EncryptedPayload {
    // Encrypt for vendor transmission
  }
  
  auditLog(action: string, details: any): void {
    // Log all enterprise actions
  }
}
```

### Step 6: Add Telemetry
```typescript
export class EnterpriseTelemetry {
  track(event: EnterpriseEvent): void {
    // Track without PII
    const sanitized = this.sanitize(event);
    this.send(sanitized);
  }
  
  getMetrics(): EnterpriseMetrics {
    return {
      vendorCount: this.vendors.size,
      packageCount: this.packages.size,
      complianceRate: this.calculateCompliance(),
      syncFrequency: this.averageSyncInterval(),
      errorRate: this.calculateErrorRate()
    };
  }
}
```

### Success Criteria
- [ ] Can sync packages to multiple vendors
- [ ] Compliance dashboard shows real-time status
- [ ] Audit log captures all actions
- [ ] Security validation passes
- [ ] Performance acceptable for 100+ vendors
- [ ] Rollback capability exists