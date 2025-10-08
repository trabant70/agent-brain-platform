# Agent Brain Architecture - Comprehensive Design
## VSCode Extension for Coding Agent Intelligence

### Executive Summary

Agent Brain is a VSCode extension that acts as an intelligent wisdom layer between developers and their coding agents (Claude, Copilot, Cursor). It captures prompts, monitors agent activity, enforces patterns, prevents technical debt, and maintains context across long sessions.

**Core Philosophy:**
- We guide, not generate
- We remember what agents forget
- We prevent problems before they happen
- We make every prompt more successful

---

## System Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Agent Brain System                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  Prompt           │  │  Context         │                │
│  │  Intelligence     │  │  Persistence     │                │
│  │  Center           │  │  Manager         │                │
│  └────────┬─────────┘  └────────┬─────────┘                │
│           │                      │                           │
│  ┌────────▼──────────────────────▼─────────┐                │
│  │         Event Capture System            │                │
│  │  ┌─────────┐ ┌─────────┐ ┌──────────┐ │                │
│  │  │Prompt   │ │Activity │ │Test      │ │                │
│  │  │Adapter  │ │Adapter  │ │Adapter   │ │                │
│  │  └─────────┘ └─────────┘ └──────────┘ │                │
│  └──────────────────┬──────────────────────┘                │
│                     │                                        │
│  ┌──────────────────▼──────────────────────┐                │
│  │         Session Rollup Engine           │                │
│  │  (Prompt-based event boundaries)        │                │
│  └──────────────────┬──────────────────────┘                │
│                     │                                        │
│  ┌──────────────────▼──────────────────────┐                │
│  │         Pattern & Quality Engine         │                │
│  │  ┌─────────┐ ┌─────────┐ ┌──────────┐ │                │
│  │  │Pattern  │ │ADR      │ │Tech Debt │ │                │
│  │  │Matcher  │ │Enforcer │ │Preventer │ │                │
│  │  └─────────┘ └─────────┘ └──────────┘ │                │
│  └──────────────────┬──────────────────────┘                │
│                     │                                        │
│  ┌──────────────────▼──────────────────────┐                │
│  │         Knowledge Storage                │                │
│  │     .agent-brain/ JSON files            │                │
│  └──────────────────────────────────────────┘                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Prompt Intelligence Center

The front door for all AI coding assistance. Captures, enhances, and routes prompts.

```typescript
interface PromptIntelligenceCenter {
  // Capture user intent
  capturePrompt(rawPrompt: string): Promise<EnhancedPrompt>;
  
  // Apply knowledge and context
  enhance(prompt: string): EnhancedPrompt[] {
    return [
      {
        version: "With Full Context",
        confidence: 0.95,
        prompt: this.applyMicrosoftXML(prompt),
        knowledge: this.gatherRelevantPatterns(prompt),
        warnings: this.detectRisks(prompt)
      },
      {
        version: "Quick Fix",
        confidence: 0.70,
        prompt: this.createMinimal(prompt)
      },
      {
        version: "Comprehensive",
        confidence: 0.85,
        prompt: this.createThorough(prompt)
      }
    ];
  }
  
  // Route to appropriate agent
  sendToAgent(prompt: EnhancedPrompt, target: AgentType): void;
}
```

**UI Components:**
- Prompt input panel (webview)
- Enhancement suggestions
- Version selector
- Knowledge application viewer
- Target agent selector

### 2. Session Rollup Engine

Implements the prompt-based event model. Groups all agent activity between prompts into logical events.

```typescript
interface SessionRollupEngine {
  private currentRollup: AgentActivityRollup | null;
  
  // Start new session on prompt
  onUserPrompt(prompt: string, agentId: string): void {
    this.finalizeCurrentRollup();
    this.currentRollup = {
      sessionId: generateId(),
      userPrompt: prompt,
      agentId: agentId,
      startTime: new Date(),
      activities: []
    };
  }
  
  // Accumulate activities
  onAgentActivity(activity: AgentActivity): void {
    if (!this.currentRollup) return;
    
    this.currentRollup.activities.push(activity);
    this.resetIdleTimer();
  }
  
  // Finalize on next prompt or timeout
  finalizeCurrentRollup(): CanonicalEvent | null {
    if (!this.currentRollup) return null;
    
    const event = this.convertToEvent(this.currentRollup);
    this.currentRollup = null;
    return event;
  }
}
```

### 3. Context Persistence Manager

Maintains critical context across compaction events, preventing "context amnesia."

```typescript
interface ContextPersistenceManager {
  // Critical context that must survive
  criticalContext: {
    invariants: string[];        // Never-forget rules
    decisions: Decision[];       // Key choices made
    workingOn: WorkContext;      // Current task
    sessionLearnings: string[];  // Discovered patterns
  };
  
  // Detect context loss
  detectCompaction(agentOutput: string): boolean;
  
  // Reinforce context
  generateReinforcement(): string {
    return `
      <context_reminder priority="critical">
        <never_forget>
          ${this.criticalContext.invariants}
        </never_forget>
        <recent_decisions>
          ${this.criticalContext.decisions.slice(-3)}
        </recent_decisions>
        <current_state>
          ${this.criticalContext.workingOn}
        </current_state>
      </context_reminder>
    `;
  }
}
```

### 4. Tech Debt Preventer

Intervenes before quick fixes become permanent problems.

```typescript
interface TechDebtPreventer {
  // Analyze prompt for quick-fix intent
  analyzeIntent(prompt: string): QualityRisk;
  
  // Detect code smells
  detectQuickFixSmells(code: string): CodeSmell[] {
    return [
      this.checkForTodos(code),
      this.checkForAnyTypes(code),
      this.checkForCodeDuplication(code),
      this.checkForDisabledLinting(code),
      this.checkForEmptyCatches(code)
    ];
  }
  
  // Suggest alternatives
  suggestQualityApproach(quickFix: string): QualityAlternative {
    return {
      warning: "This appears to be a quick fix",
      timeAnalysis: {
        quickFix: { now: 5, later: 120 },  // minutes
        properFix: { now: 20, later: 0 }
      },
      suggestion: this.generateProperApproach(quickFix)
    };
  }
}
```

### 5. Project Intent Advisor

Captures high-level intent and negotiates appropriate guardrails.

```typescript
interface ProjectIntentAdvisor {
  // Initial project setup
  async initializeProject(): Promise<ProjectContext> {
    const intent = await this.captureIntent();
    const patterns = await this.suggestPatterns(intent);
    const selected = await this.userSelectsPatterns(patterns);
    
    return {
      intent,
      applicablePatterns: selected,
      createdAt: new Date(),
      evolution: []
    };
  }
  
  // Update guidance over time
  async reviewGuidance(): Promise<void> {
    const current = await this.loadProjectContext();
    const suggested = await this.suggestNewPatterns(current);
    const updated = await this.userUpdatesSelection(suggested);
    
    current.evolution.push({
      date: new Date(),
      changes: this.diffPatterns(current, updated),
      reason: await this.captureReason()
    });
    
    await this.saveProjectContext(current);
  }
}
```

---

## Data Capture Architecture

### Capture Adapters

```typescript
// Base adapter interface
interface ICaptureAdapter {
  id: string;
  initialize(context: vscode.ExtensionContext): Promise<void>;
  capture(event: any): void;
  dispose(): void;
}

// Specialized adapters
class PromptCaptureAdapter {
  // Captures prompts from multiple sources
  sources: [
    'clipboard',          // Copy/paste detection
    'agentBrainUI',      // Our prompt UI
    'terminal',          // Terminal monitoring
    'extension'          // Other extension integration
  ];
}

class AgentActivityAdapter {
  // Monitors agent actions
  monitors: [
    'fileChanges',       // File modifications
    'testRuns',          // Test execution
    'terminalCommands',  // Commands run
    'diagnostics'        // Errors/warnings
  ];
}

class TestResultAdapter {
  // Captures test outcomes
  sources: [
    'jestReporter',      // Jest integration
    'pathwayTests',      // Pathway test results
    'terminal'           // Test output parsing
  ];
}
```

---

## Storage Architecture

### File Structure

```
.agent-brain/
├── project-intent.json       # High-level project context
├── session-context.json      # Current session memory
├── timeline.json            # Event history (rotated)
├── patterns.json            # Active patterns
├── learnings.json           # Accumulated learnings
├── config.json              # User configuration
└── cache/
    ├── external-patterns.json  # Cached from GitHub
    ├── team-adrs.json          # Team ADRs
    └── compaction-events.json # Track context losses
```

### Data Models

```typescript
interface ProjectIntent {
  intent: string;                    // "Build a real-time collaboration tool"
  goals: string[];                   // Extracted objectives
  applicablePatterns: PatternId[];   // Selected patterns
  notApplicable: PatternId[];        // Explicitly excluded
  evolution: EvolutionEntry[];       // Changes over time
}

interface SessionContext {
  sessionId: string;
  agentType: 'claude' | 'copilot' | 'cursor';
  startTime: Date;
  invariants: string[];              // Critical rules
  decisions: Decision[];             // Key choices
  workingOn: WorkContext;            // Current focus
  compactionEvents: CompactionEvent[];
}

interface AgentActivityRollup {
  sessionId: string;
  userPrompt: string;                // Original intent
  startTime: Date;
  endTime?: Date;
  activities: Activity[];            // All actions
  metrics: {
    filesChanged: number;
    linesAdded: number;
    linesRemoved: number;
    testsRun: number;
    testsPassed: number;
  };
  status: 'in-progress' | 'completed' | 'abandoned';
}

interface CanonicalEvent {
  id: string;
  type: 'agent-task' | 'commit' | 'test' | 'pattern-violation';
  timestamp: Date;
  title: string;                    // User's prompt
  description: string;               // Generated summary
  author: { id: string; name: string };
  impact: ImpactMetrics;
  metadata: any;                     // Full rollup data
}
```

---

## UI Components

### 1. Activity Bar Icon
- Shows Agent Brain status
- Quick access to prompt UI
- Violation count badge

### 2. Prompt Intelligence Panel (Webview)
- Rich prompt input
- Enhancement versions
- Knowledge application
- Target selection

### 3. Context Memory Sidebar (Tree View)
- Current invariants
- Recent decisions
- Session timeline
- Compaction warnings

### 4. Status Bar Items
- Pattern violations
- Active agent
- Session duration
- Quick reinforce button

### 5. Hover Providers
- Pattern information
- ADR references
- Learning suggestions

### 6. Quick Fix Actions
- Apply pattern
- Fix violation
- Reinforce context
- Generate test

---

## Key Workflows

### 1. Starting a New Task

```
User → "Agent Brain: New Prompt" command
     → Prompt Intelligence UI opens
     → User types intent
     → System enhances with context
     → User selects version
     → Prompt sent to agent
     → Session tracking begins
```

### 2. Handling Compaction Events

```
Agent generates code
     → Violation detected
     → Check for compaction signs
     → If detected: 
        → Warning notification
        → Auto-reinforce option
        → Context reminder injected
```

### 3. Project Initialization

```
New project → "Agent Brain: Initialize"
           → Capture intent dialog
           → Pattern suggestion
           → User selection
           → Save to .agent-brain/
           → Configure adapters
```

### 4. Pattern Enforcement

```
File save → Pattern matcher runs
         → Violations detected
         → Problems panel updated
         → Quick fixes offered
         → Learning recorded
```

---

## Integration Points

### VSCode APIs Used

```typescript
// Extension basics
vscode.ExtensionContext
vscode.workspace.workspaceFolders

// UI components
vscode.window.createWebviewPanel()      // Prompt UI
vscode.window.createTreeView()          // Sidebar
vscode.window.createStatusBarItem()     // Status
vscode.languages.createDiagnosticCollection() // Problems

// Event subscriptions
vscode.workspace.onDidSaveTextDocument()
vscode.workspace.onDidChangeTextDocument()
vscode.window.onDidChangeActiveTextEditor()
vscode.env.clipboard                    // Clipboard monitoring

// Language features
vscode.languages.registerHoverProvider()
vscode.languages.registerCodeActionsProvider()
```

### External Integrations

```typescript
// Pattern sources
GitHub: 'https://raw.githubusercontent.com/org/patterns/main/'
GitLab: 'https://gitlab.com/api/v4/projects/:id/repository/files'

// Agent integrations
ClaudeExtension: 'anthropic.claude-vscode'
CopilotExtension: 'github.copilot'
ContinueExtension: 'continue.continue'

// Test frameworks
Jest: Custom reporter
Mocha: Reporter plugin
Vitest: Reporter plugin
```

---

## Configuration Schema

```json
{
  "agentBrain.enabled": true,
  "agentBrain.promptUI.enabled": true,
  "agentBrain.promptUI.autoEnhance": true,
  "agentBrain.contextPersistence.enabled": true,
  "agentBrain.contextPersistence.reinforceOnCompaction": true,
  "agentBrain.techDebtPrevention.enabled": true,
  "agentBrain.techDebtPrevention.blockQuickFixes": false,
  "agentBrain.patterns.source": "https://github.com/org/patterns",
  "agentBrain.patterns.enforcement": "warn",
  "agentBrain.storage.location": ".agent-brain",
  "agentBrain.storage.maxTimelineEntries": 1000,
  "agentBrain.adapters.terminal.enabled": true,
  "agentBrain.adapters.clipboard.enabled": true,
  "agentBrain.adapters.fileSystem.enabled": true
}
```

---

## Performance Considerations

### Memory Management
- Rotate timeline.json at 5MB
- Keep max 1000 events in memory
- Lazy load patterns
- Cache external data for 1 hour

### Responsiveness
- Debounce file change events (500ms)
- Throttle pattern matching (1s)
- Background processing for analysis
- Progressive UI loading

### Privacy
- Personal learnings never shared
- Team patterns in separate files
- Opt-in telemetry only
- Local storage only by default

---

## Success Metrics

### User Experience
- Prompt success rate > 80%
- Context reinforcement effectiveness
- Pattern violation reduction over time
- Time saved on debugging

### Technical Metrics
- Memory usage < 100MB
- Response time < 100ms
- Pattern match time < 50ms
- Zero data loss on crashes