# Agent Brain Conceptual Architecture & Integration Guide

**Purpose**: Provide clear mental model of how Agent Brain components connect and operate  
**Audience**: Coding agent implementing Wave 2 features  
**Version**: 2.0

---

## Core Conceptual Model

Agent Brain is a **knowledge amplification system** that makes AI coding assistants smarter by injecting accumulated wisdom into prompts. Think of it as a "senior developer's brain" that grows smarter over time.

### The Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    USER INTERFACE LAYER                   │
│  (VSCode UI, Timeline Webview, Knowledge Tree, Prompts)  │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                 ENHANCEMENT ENGINE LAYER                  │
│   (Stages 1-5, Context Management, Session Tracking)      │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                   KNOWLEDGE SYSTEM LAYER                  │
│  (ADRs, Patterns, Learnings, Golden Paths, Packages)     │
└─────────────────────────────────────────────────────────┘
```

---

## Key Concepts and Their Relationships

### 1. Knowledge Types (The "What")

**Hierarchical Knowledge** - Each type has different authority levels:

```
🔒 Organizational Rules (ADRs) ──────┐
     ↓ (mandatory, cannot disable)   │
⭐ Expert Packages ──────────────────┤
     ↓ (strongly recommended)        │
👥 Team Patterns ────────────────────┼──→ Knowledge System
     ↓ (shared practices)            │    (unified access)
💡 Personal Learnings ───────────────┤
     ↓ (your discoveries)            │
🛤️ Golden Paths ─────────────────────┘
     (step-by-step workflows)
```

**Key Insight**: Higher-level knowledge overrides lower levels. Organizational rules always apply, personal learnings only when relevant.

### 2. The Enhancement Pipeline (The "How")

**Progressive Enhancement Through Stages**:

```
User Prompt: "fix the bug"
    ↓
Stage 1: Context Injection
    → "fix the bug [in auth.service.ts, TypeError line 42]"
    ↓
Stage 2: Pattern Expansion  
    → "fix the authentication bug [TypeError: Cannot read 'user']"
    ↓
Stage 3: Structural Templates
    → "BUG FIX: Authentication\nSymptom: TypeError\nExpected:..."
    ↓
Stage 4: Success Learning
    → "[Previous fix: Try-catch around async]\nBUG FIX:..."
    ↓
Stage 5: Planning Enforcement
    → "PLAN:\n1. Identify root cause\n2. Write test\n3. Fix\nBUG FIX:..."
```

**Key Insight**: Each stage adds ONE capability. Stages can fail gracefully (5→4→3→2→1).

### 3. The Feedback Loop (The "Why")

```
         ┌─────────────────────────┐
         │   User writes prompt     │
         └────────────┬─────────────┘
                      ↓
         ┌─────────────────────────┐
         │  Enhancement Pipeline    │
         │  applies knowledge       │
         └────────────┬─────────────┘
                      ↓
         ┌─────────────────────────┐
         │  AI generates code       │
         └────────────┬─────────────┘
                      ↓
         ┌─────────────────────────┐
         │  Session tracks result   │
         └────────────┬─────────────┘
                      ↓
         ┌─────────────────────────┐
         │  Success? → Pattern      │
         │  Failure? → Learning     │
         └────────────┬─────────────┘
                      ↓
         ┌─────────────────────────┐
         │  Knowledge System grows  │
         └─────────────────────────┘
                      ↑
                      └──── Feeds back into next prompt
```

**Key Insight**: The system learns from BOTH successes and failures, getting smarter over time.

---

## Data Flow Architecture

### 1. Session Lifecycle Flow

```
PromptCommand.execute()
    ↓
SessionManager.startSession(prompt, agent)
    ↓ (emits 'session:started')
TimelineProvider.addRuntimeEvent() [MISSING - Wave 2]
    ↓
FileSystemAdapter tracks activities
    ↓ (file saves, deletes)
SessionManager.trackActivity()
    ↓
User ends session or timeout
    ↓
SessionManager.finalizeSession()
    ↓ (emits 'session:finalized')
┌───┴───────────────────┐
│                       │
SessionStorage.save()   TimelineProvider.addRuntimeEvent()
(persist to disk)       (show in timeline) [MISSING - Wave 2]
│                       │
└───┬───────────────────┘
    ↓
SuccessPatternDetector.detectPattern()
    ↓ (if successful)
LearningSystem.createLearning()
    ↓ (if failed)
KnowledgeSystem updated for next time
```

### 2. Knowledge Retrieval Flow

```
User types prompt: "add user authentication"
    ↓
PromptEnhancer.enhance(prompt, context)
    ↓
KnowledgeSystem.getRelevantKnowledge(prompt)
    ↓
    ├─→ PatternSystem.findRelevant("authentication")
    ├─→ ADRSystem.getApplicable("authentication")
    ├─→ LearningSystem.findSimilar("authentication")
    ├─→ GoldenPathSystem.findPaths("authentication") [MISSING - Wave 2]
    └─→ PackageManager.getRelevantPackages()
           ↓
    Merge and prioritize by hierarchy
           ↓
    Return unified Knowledge object
           ↓
Apply through Enhancement Stages 1-5
           ↓
Return enhanced prompt to user
```

### 3. UI Component Communication

```
Extension Host (Node.js)                 Webview (Browser)
─────────────────────────               ──────────────────
                                        
GuidanceEngine                          AICompanionDot
    ↓ selectTip()                           ↑ showTip()
    └──── postMessage('showTip') ──────────→│
                                        
SessionManager                          QuickPromptPanel
    ↑ startSession()                        ↓ onEnhance()
    │←─── postMessage('enhancePrompt') ─────┘
                                        
ErrorDetector                           ErrorRecoveryPanel
    ↓ detectError()                         ↑ showError()
    └──── postMessage('showError') ─────────→│
                                        
ComplianceValidator                     ComplianceMonitor
    ↓ validate()                            ↑ updateViolations()
    └──── postMessage('updateCompliance') ───→│
```

---

## Critical Integration Points

### 1. Real-Time Timeline Updates (BROKEN - Fix in Wave 2)

**Current State**:
```typescript
// extension.ts line ~2467
sessionManager.on('session:finalized', (session, event) => {
  // TODO: Add method to timeline provider to accept external events
  // Sessions only appear after manual refresh ❌
});
```

**Required Fix**:
```typescript
// Add to TimelineProvider
public addRuntimeEvent(event: CanonicalEvent): void {
  this.events.push(event);
  this.postMessageToWebview({ type: 'updateData', events: this.events });
}

// Wire in extension.ts
sessionManager.on('session:finalized', (session, event) => {
  timelineProvider.addRuntimeEvent(event); // ✅ Real-time update
});
```

### 2. Context System Integration (MISSING - Build in Wave 2)

**Where Context Connects**:
```typescript
// 1. Session Manager tracks context
sessionManager.on('activity', (activity) => {
  if (activity.type === 'decision-made') {
    contextManager.addDecision(activity.decision, activity.rationale);
  }
});

// 2. Enhancement pipeline uses context
enhance(prompt: string, context: EnhancementContext) {
  // Add accumulated context
  const contextRules = this.contextManager.getRulesForContext(keywords);
  enhanced = this.applyContext(enhanced, contextRules);
  
  // Check if reinforcement needed
  if (this.contextReinforcer.shouldReinforce(session)) {
    enhanced += this.contextReinforcer.generateReinforcement(session);
  }
}

// 3. Context persists across sessions
const context = await contextStorage.load();
// Context available immediately on VSCode restart
```

### 3. Knowledge Tree Checkbox State

**How Checkbox State Affects Enhancement**:
```typescript
// ProjectProfileManager tracks checkbox state
interface KnowledgeItemState {
  id: string;
  enabled: boolean;  // Checkbox checked?
  locked: boolean;   // Can user change it?
}

// KnowledgeSystem respects checkbox state
getRelevantKnowledge(prompt: string): Knowledge {
  const allPatterns = this.patternSystem.findRelevant(prompt);
  const profile = this.profileManager.getProfile();
  
  // Filter by checkbox state
  const enabledPatterns = allPatterns.filter(p => 
    profile.isEnabled(p.id) || profile.isLocked(p.id)
  );
  
  return enabledPatterns;
}
```

### 4. Error Detection Mechanism (UNDEFINED - Define in Wave 2)

**Error Sources**:
```typescript
// 1. VSCode Diagnostics (syntax errors, linting)
vscode.languages.onDidChangeDiagnostics(event => {
  const errors = getDiagnostics().filter(d => d.severity === Error);
  if (errors.length > 0) {
    errorRecoveryPanel.show(errors[0]);
  }
});

// 2. Task Failures (build, test)
vscode.tasks.onDidEndTaskProcess(event => {
  if (event.exitCode !== 0) {
    errorRecoveryPanel.show({ 
      type: 'task-failed',
      task: event.execution.task.name 
    });
  }
});

// 3. Session Tracking (AI-generated errors)
sessionManager.on('activity', activity => {
  if (activity.type === 'error-detected') {
    errorRecoveryPanel.show(activity.error);
    // Offer to create learning
    learningSystem.createFromError(activity.error);
  }
});
```

---

## Stage Architecture Clarification

### The Two "Stage 5" Problem

**Current Confusion**:
- Knowledge Injection Plan: Stage 5 = Planning Enforcement ✅ (implemented)
- UX Plan: Stage 5 = Agent-Specific Optimization ❌ (not implemented)

**Wave 2 Resolution**:
```
Stages 1-4: Core Enhancement (UX Plan)
Stage 5: Planning Enforcement (Knowledge Injection) - KEEP AS IS
Stage 6: Agent-Specific Optimization (was UX Stage 5) - TO BUILD
Stage 7: Interactive Refinement (was UX Stage 6) - FUTURE
Stage 8: LLM-Assisted (was UX Stage 7) - FUTURE  
Stage 9: Multi-Version (was UX Stage 8) - FUTURE
```

**Why This Matters**: The enhancement pipeline must know the correct stage order to apply them properly.

---

## Golden Paths: Workflow Learning

### Concept
Golden Paths are **captured workflows** from successful sessions that become reusable step-by-step guides.

### How They're Created
```
Successful Session Completed
    ↓
SessionManager.finalizeSession('completed')
    ↓
GoldenPathSystem.captureFromSession(session)
    ↓
Extract significant activities:
  - File creations → "Create model"
  - Test runs → "Write tests"
  - Validations → "Add validation"
    ↓
Order steps chronologically
    ↓
Save as Golden Path
    ↓
Available in Knowledge Tree under "Step-by-Step Guides"
    ↓
Next time: "I want to create an API endpoint"
    ↓
Enhancement suggests: "Follow the 'Create REST API' golden path?"
```

### Default Golden Paths
```typescript
// Pre-loaded workflows for common tasks
DEFAULT_GOLDEN_PATHS = [
  'Create REST API Endpoint',    // 5 steps
  'Add Authentication',          // 7 steps
  'Refactor for Testing',       // 4 steps
  'Debug Production Issue',      // 6 steps
  'Setup New Project'           // 8 steps
]
```

---

## Component Initialization Order

**Critical**: Components must initialize in the correct order to avoid dependency issues.

```typescript
// extension.ts activation order
async function activate(context: vscode.ExtensionContext) {
  // 1. Core Storage (others depend on this)
  const storagePath = path.join(context.globalStorageUri.fsPath, '.agent-brain');
  
  // 2. Knowledge Systems (no dependencies)
  const patternSystem = new PatternSystem(storagePath);
  const adrSystem = new ADRSystem(storagePath);
  const learningSystem = new LearningSystem(storagePath);
  const goldenPathSystem = new GoldenPathSystem(storagePath); // Wave 2
  
  // 3. Package System (depends on storage)
  const packageManager = new PackageManager(storagePath);
  const packageHierarchy = new PackageHierarchy();
  
  // 4. Knowledge Facade (depends on all knowledge systems)
  const knowledgeSystem = new KnowledgeSystem(
    patternSystem, adrSystem, learningSystem, 
    goldenPathSystem, packageManager, packageHierarchy
  );
  
  // 5. Context System (depends on knowledge) - Wave 2
  const contextManager = new ContextManager();
  const contextStorage = new ContextStorage(storagePath);
  const contextReinforcer = new ContextReinforcer(contextManager, knowledgeSystem);
  
  // 6. Enhancement (depends on knowledge + context)
  const promptEnhancer = new PromptEnhancer(
    knowledgeSystem, contextReinforcer
  );
  
  // 7. Session Management (depends on enhancement)
  const sessionManager = createSessionManager({ storagePath });
  
  // 8. Guidance (depends on session state)
  const guidanceEngine = new GuidanceEngine();
  
  // 9. UI Providers (depend on everything)
  const knowledgeTreeProvider = new KnowledgeTreeProvider(knowledgeSystem);
  const timelineProvider = new TimelineProvider(context.extensionUri);
  
  // 10. Adapters and Detectors (depend on session manager)
  const fileSystemAdapter = new FileSystemAdapter(sessionManager);
  const errorDetector = new ErrorDetector(sessionManager); // Wave 2
  
  // 11. Commands (depend on all systems)
  new PromptCommand(sessionManager, promptEnhancer).register(context);
  new ImportPackageCommand(packageManager).register(context); // Wave 2
  new ExportPackageCommand(packageManager).register(context); // Wave 2
  
  // 12. Compliance (depends on packages)
  const complianceProvider = new ComplianceProvider(packageHierarchy, context);
  
  // 13. Analytics (observes everything)
  const packageAnalytics = new PackageAnalytics(storagePath); // Wave 2
}
```

---

## Testing Strategy for Integration

### 1. Component Isolation Tests
```typescript
// Test each component works alone
describe('ContextManager', () => {
  it('stores and retrieves rules');
  it('filters rules by keywords');
  it('tracks decision history');
});
```

### 2. Integration Tests
```typescript
// Test components work together
describe('Session to Timeline Flow', () => {
  it('session events appear in timeline immediately');
  it('context persists across sessions');
  it('golden paths capture from successful sessions');
});
```

### 3. End-to-End Tests
```typescript
// Test complete user workflows
describe('Complete Enhancement Flow', () => {
  it('user types prompt → gets enhanced → starts session → sees in timeline');
  it('error detected → recovery panel → create learning → applies next time');
  it('successful session → captures golden path → suggests for similar task');
});
```

---

## Common Pitfalls to Avoid

### 1. Circular Dependencies
```typescript
// ❌ WRONG: Circular dependency
class KnowledgeSystem {
  constructor(private sessionManager: SessionManager) {} // Session needs Knowledge!
}

// ✅ RIGHT: Use events or dependency injection
class KnowledgeSystem {
  // No session manager in constructor
  onSessionComplete(session: Session) {
    // React to session events
  }
}
```

### 2. Missing Await on Async
```typescript
// ❌ WRONG: Forgetting await
const enhanced = promptEnhancer.enhance(prompt); // Returns Promise!

// ✅ RIGHT: Always await async operations
const enhanced = await promptEnhancer.enhance(prompt);
```

### 3. Webview Message Timing
```typescript
// ❌ WRONG: Sending before webview ready
timelineProvider.postMessageToWebview({ type: 'showTip', tip });

// ✅ RIGHT: Check webview is ready
if (timelineProvider && timelineProvider.isWebviewReady()) {
  timelineProvider.postMessageToWebview({ type: 'showTip', tip });
}
```

### 4. Storage Path Issues
```typescript
// ❌ WRONG: Hardcoded paths
const storagePath = '/Users/me/.agent-brain';

// ✅ RIGHT: Use extension context
const storagePath = context.globalStorageUri.fsPath;
```

---

## Summary: The Big Picture

Agent Brain is a **learning system** that:

1. **Captures** knowledge from your coding sessions (patterns, decisions, errors)
2. **Organizes** it hierarchically (org rules → team patterns → personal learnings)
3. **Enhances** your prompts progressively (through stages 1-5+)
4. **Tracks** the results in sessions (with activities and outcomes)
5. **Learns** from successes and failures (creating patterns and learnings)
6. **Visualizes** everything in the timeline (git events + sessions)
7. **Persists** context across sessions (rules and decisions)
8. **Guides** you with tips and golden paths (step-by-step workflows)

The Wave 2 implementation focuses on **connecting these pieces** so they work together seamlessly, creating a continuous learning loop that makes AI coding assistants progressively smarter.

**Key Success Metric**: Can a user go from prompt → enhanced prompt → session → timeline → learning → better next prompt?

If this flow works end-to-end, Agent Brain succeeds in its mission.