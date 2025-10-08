# Agent Brain - Pragmatic Architecture Specification
## Focused Enhancement to Timeline, Not Platform Replacement

### Architectural Philosophy

**What Agent Brain IS:**
- A wisdom layer that enhances AI coding sessions
- A timeline enrichment that adds prompt-based events
- A knowledge system that improves prompt success
- A context keeper for long sessions

**What Agent Brain IS NOT:**
- A complete IDE replacement
- A new coding platform
- An AI orchestration system
- A kitchen-sink solution

---

## Core Architecture (Simplified)

### Three Clear Layers

```
┌─────────────────────────────────────────────────┐
│           Presentation Layer (VSCode)            │
│  ┌──────────┐ ┌────────┐ ┌──────────────────┐  │
│  │ Timeline │ │ Prompt │ │ Context Sidebar  │  │
│  └─────┬────┘ └────┬───┘ └────────┬─────────┘  │
│        └────────────┼──────────────┘            │
│                     ↓                            │
├─────────────────────────────────────────────────┤
│              Core Domain Layer                   │
│  ┌──────────┐ ┌────────────┐ ┌──────────────┐  │
│  │ Sessions │ │ Knowledge  │ │ Events       │  │
│  │ (NEW)    │ │ (REFACTOR) │ │ (KEEP)       │  │
│  └──────────┘ └────────────┘ └──────────────┘  │
├─────────────────────────────────────────────────┤
│              Storage Layer                       │
│  ┌───────────────────────────────────────────┐  │
│  │        .agent-brain/ JSON files           │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Knowledge != Events**: Patterns/ADRs are knowledge that enhance prompts, not timeline events
2. **Sessions are Events**: User prompt → agent work → completion = one timeline event
3. **Modular UI**: Each panel has one job, does it well
4. **Incremental Value**: Ship working features incrementally

---

## Phase 1: Core Session Management (Week 1)

### What We Build
Basic session tracking without fancy features.

```typescript
// packages/core/sessions/SessionManager.ts
export class SessionManager {
  private currentSession: Session | null = null;
  
  startSession(prompt: string, agentType: string): void {
    // Finalize previous if exists
    if (this.currentSession) {
      this.finalizeSession();
    }
    
    this.currentSession = {
      id: generateId(),
      prompt,
      agentType,
      startTime: new Date(),
      activities: []
    };
  }
  
  trackActivity(activity: Activity): void {
    if (!this.currentSession) return;
    this.currentSession.activities.push(activity);
  }
  
  finalizeSession(): CanonicalEvent | null {
    if (!this.currentSession) return null;
    
    // Convert to timeline event
    const event: CanonicalEvent = {
      id: this.currentSession.id,
      type: EventType.AGENT_SESSION,
      timestamp: this.currentSession.startTime,
      title: this.currentSession.prompt, // User's words
      description: this.summarizeActivities(),
      author: { 
        id: this.currentSession.agentType,
        name: this.getAgentDisplayName()
      },
      impact: {
        filesChanged: this.countFiles(),
        linesAdded: this.countAdded(),
        linesRemoved: this.countRemoved()
      }
    };
    
    this.currentSession = null;
    return event;
  }
}
```

### What We DON'T Build Yet
- ❌ Automatic compaction detection
- ❌ Microsoft XML formatting
- ❌ Clipboard monitoring
- ❌ Terminal parsing
- ❌ Multi-agent detection

---

## Phase 2: Knowledge Layer (Week 2)

### Refactor Intelligence System

```typescript
// REMOVE: IntelligenceProvider as event source
// providers/intelligence/IntelligenceProvider.ts - DELETE THIS

// ADD: Knowledge layer for prompt enhancement
// packages/core/knowledge/KnowledgeSystem.ts
export class KnowledgeSystem {
  constructor(
    private patterns: PatternSystem,
    private adrs: ADRSystem,
    private learnings: LearningSystem
  ) {}
  
  // Knowledge enhances prompts, doesn't create events
  async getRelevantKnowledge(context: string): Promise<Knowledge> {
    return {
      patterns: await this.patterns.findRelevant(context),
      adrs: await this.adrs.getApplicable(context),
      learnings: await this.learnings.findSimilar(context)
    };
  }
  
  // Knowledge can still be displayed in UI, just not as events
  async getKnowledgeStats(): Promise<KnowledgeStats> {
    return {
      totalPatterns: await this.patterns.count(),
      totalADRs: await this.adrs.count(),
      recentLearnings: await this.learnings.getRecent(10)
    };
  }
}
```

---

## Phase 3: Simple Prompt UI (Week 3)

### Minimal Viable Prompt Interface

```typescript
// packages/vscode/prompt-ui/PromptCommand.ts
export class PromptCommand {
  constructor(
    private sessionManager: SessionManager,
    private knowledgeSystem: KnowledgeSystem
  ) {}
  
  async execute(): Promise<void> {
    // Simple input box first (not full webview)
    const prompt = await vscode.window.showInputBox({
      title: 'Agent Brain Prompt',
      placeHolder: 'What do you want to build?',
      prompt: 'Describe your task...'
    });
    
    if (!prompt) return;
    
    // Get relevant knowledge
    const knowledge = await this.knowledgeSystem.getRelevantKnowledge(prompt);
    
    // Show simple enhancement (not multiple versions initially)
    const enhanced = this.createEnhancedPrompt(prompt, knowledge);
    
    // Let user review
    const proceed = await vscode.window.showInformationMessage(
      'Agent Brain added context to your prompt',
      { modal: true, detail: enhanced },
      'Send to Agent', 'Cancel'
    );
    
    if (proceed === 'Send to Agent') {
      // Start session
      this.sessionManager.startSession(prompt, 'claude');
      
      // Send to terminal (simplest integration)
      const terminal = vscode.window.activeTerminal;
      if (terminal) {
        terminal.sendText(enhanced);
      }
    }
  }
  
  private createEnhancedPrompt(prompt: string, knowledge: Knowledge): string {
    // Simple markdown format (no XML initially)
    return `
${prompt}

Context from Agent Brain:
- Patterns to follow: ${knowledge.patterns.map(p => p.name).join(', ')}
- Architecture decisions: ${knowledge.adrs.map(a => a.title).join(', ')}
- Related learnings: ${knowledge.learnings.length} similar cases found
    `.trim();
  }
}
```

---

## Phase 4: Timeline Integration (Week 4)

### Add Session Events to Timeline

```typescript
// packages/vscode/timeline/TimelineEnhancement.ts
export class TimelineEnhancement {
  constructor(
    private sessionManager: SessionManager,
    private dataOrchestrator: DataOrchestrator
  ) {
    // Listen for session completions
    this.sessionManager.on('sessionComplete', (event: CanonicalEvent) => {
      // Add to timeline data
      this.dataOrchestrator.addEvent(event);
    });
  }
  
  // Timeline now shows:
  // 1. Git events (commits, merges) - existing
  // 2. Agent sessions (prompted work) - new
  // Both share same CanonicalEvent model
}
```

Timeline visualization stays mostly the same, just with new event type:

```typescript
// Visual differentiation for session events
if (event.type === EventType.AGENT_SESSION) {
  return {
    shape: d3.symbolStar,
    color: '#22C55E', // Green for AI sessions
    icon: '🤖'
  };
}
```

---

## Phase 5: Context Persistence (Week 5)

### Simple Context Tracking

```typescript
// packages/core/context/ContextManager.ts
export class ContextManager {
  private context: SessionContext = {
    rules: [],
    decisions: []
  };
  
  addRule(rule: string): void {
    if (!this.context.rules.includes(rule)) {
      this.context.rules.push(rule);
      this.save();
    }
  }
  
  addDecision(decision: string): void {
    this.context.decisions.push({
      what: decision,
      when: new Date()
    });
    
    // Keep only last 10
    if (this.context.decisions.length > 10) {
      this.context.decisions.shift();
    }
    
    this.save();
  }
  
  getReinforcement(): string {
    // Simple text format
    return `
Remember these rules:
${this.context.rules.map(r => `- ${r}`).join('\n')}

Recent decisions:
${this.context.decisions.map(d => `- ${d.what}`).join('\n')}
    `.trim();
  }
}
```

### Simple Context UI (Tree View)

```typescript
// packages/vscode/context-sidebar/ContextTreeProvider.ts
export class ContextTreeProvider implements vscode.TreeDataProvider<ContextItem> {
  getTreeItem(element: ContextItem): vscode.TreeItem {
    return {
      label: element.label,
      description: element.description,
      collapsibleState: element.children 
        ? vscode.TreeItemCollapsibleState.Expanded 
        : vscode.TreeItemCollapsibleState.None
    };
  }
  
  getChildren(element?: ContextItem): ContextItem[] {
    if (!element) {
      return [
        { label: 'Rules', children: this.getRules() },
        { label: 'Decisions', children: this.getDecisions() }
      ];
    }
    return element.children || [];
  }
}
```

---

## What We're NOT Building (Yet)

### Deprioritized Features
1. **Automatic agent detection** - User manually indicates agent type
2. **Compaction detection** - User manually triggers reinforcement  
3. **XML formatting** - Simple markdown enhancement
4. **Multiple prompt versions** - Single enhanced version
5. **Clipboard monitoring** - User copies prompt manually
6. **Pattern enforcement** - Information only, no blocking
7. **Tech debt prevention** - Just warnings, no intervention

### Why This Is Better
- **Faster to ship** - MVP in 5 weeks, not 20
- **Less risky** - Proven features before speculation
- **User-driven** - Add complexity based on feedback
- **Maintainable** - Smaller codebase, clearer purpose

---

## File Structure (Simplified)

```
agent-brain-platform/
├── packages/
│   ├── core/                    # Pure domain logic
│   │   ├── sessions/            # Session management
│   │   ├── knowledge/           # Patterns, ADRs, Learnings
│   │   ├── context/            # Context persistence
│   │   └── events/             # CanonicalEvent (existing)
│   │
│   └── vscode/
│       ├── extension.ts         # Entry point
│       ├── commands/            # VSCode commands
│       │   ├── PromptCommand.ts
│       │   └── ReinforceCommand.ts
│       ├── timeline/            # Timeline integration
│       │   └── TimelineEnhancement.ts
│       └── sidebar/             # Context tree view
│           └── ContextTreeProvider.ts
│
├── .agent-brain/                # Storage (existing)
│   ├── sessions.json           # Session history
│   ├── context.json            # Current context
│   └── knowledge/              # Cached patterns
│
└── test/
    ├── core/                    # Unit tests (no VSCode)
    └── integration/             # VSCode integration tests
```

---

## Migration Path

### From Current State
1. **Keep timeline visualization** - It works well
2. **Keep CanonicalEvent model** - Good abstraction
3. **Keep pathway logging** - Excellent for debugging
4. **Remove IntelligenceProvider** - Wrong abstraction
5. **Add SessionManager** - New core capability
6. **Refactor patterns/ADRs** - From providers to knowledge

### Incremental Releases
- **v0.5**: Basic session tracking (manual start/stop)
- **v0.6**: Simple prompt enhancement
- **v0.7**: Context persistence
- **v0.8**: Automatic session detection
- **v1.0**: Full feature set

---

## Success Metrics (Realistic)

### Week 5 Goals
- ✅ Sessions appear in timeline
- ✅ Basic prompt enhancement works
- ✅ Context persists between sessions
- ✅ No performance degradation
- ✅ Backward compatible

### What Success Looks Like
- User can track AI sessions visually
- Prompts get basic context injection
- Context survives VSCode restart
- Timeline still shows git events
- Everything "just works"

---

## Technical Decisions

### Why No Microsoft XML?
- Adds complexity without proven value
- Claude accepts many formats
- Can A/B test and add later if beneficial

### Why No Automatic Detection?
- Hard to detect all agents reliably
- User indication is simpler and clearer
- Can add detection later based on patterns

### Why Separate UI Panels?
- Timeline is for visualization
- Prompt UI needs different interaction model
- Mixing concerns creates confusion

### Why Keep Git Events?
- They're real, objective events
- Users expect to see commits
- Timeline without git feels incomplete

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Scope creep returns | Strict feature freeze for MVP |
| Performance issues | Profile early, optimize later |
| User confusion | Clear documentation, simple UI |
| Integration complexity | Start with terminal only |
| Knowledge quality | Manual curation initially |

---

## The Bottom Line

This pragmatic architecture:
1. **Solves real problems** (context loss, prompt success)
2. **Ships quickly** (5 weeks vs 20)
3. **Stays focused** (timeline enhancement, not platform)
4. **Remains flexible** (can add features based on usage)
5. **Works today** (not speculative future)

The coding agent's architectural review was invaluable. This revised specification addresses their concerns while maintaining the core vision of Agent Brain as a wisdom layer for AI-assisted development.