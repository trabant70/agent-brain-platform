# Agent Brain - Pragmatic Implementation Plan
## 5-Week MVP Development Schedule

### Overview

Based on architectural review, we're building a **focused enhancement** to the timeline, not a complete platform. This plan delivers working features incrementally with clear weekly milestones.

---

## Week 1: Core Session Management

### Goal
Establish the foundation for tracking AI coding sessions without VSCode dependencies.

### Tasks

#### Day 1-2: Project Setup
```bash
# Create package structure
mkdir -p packages/core/sessions
mkdir -p packages/core/knowledge  
mkdir -p packages/core/events
mkdir -p packages/vscode

# Set up TypeScript configs
# packages/core/tsconfig.json - no VSCode types
# packages/vscode/tsconfig.json - includes @types/vscode
```

#### Day 3-4: Session Manager
```typescript
// packages/core/sessions/SessionManager.ts
export class SessionManager extends EventEmitter {
  private currentSession: Session | null = null;
  private storage: SessionStorage;
  
  constructor(storage: SessionStorage) {
    super();
    this.storage = storage;
  }
  
  async startSession(prompt: string, agentType: string): Promise<void> {
    if (this.currentSession) {
      await this.finalizeSession();
    }
    
    this.currentSession = {
      id: uuidv4(),
      prompt,
      agentType,
      startTime: new Date(),
      activities: []
    };
    
    this.emit('session:started', this.currentSession);
  }
  
  trackActivity(activity: Activity): void {
    if (!this.currentSession) {
      console.warn('No active session for activity:', activity);
      return;
    }
    
    this.currentSession.activities.push(activity);
    this.emit('activity:tracked', activity);
  }
  
  async finalizeSession(): Promise<CanonicalEvent | null> {
    if (!this.currentSession) return null;
    
    const event = this.convertToEvent(this.currentSession);
    await this.storage.saveSession(this.currentSession);
    
    this.emit('session:completed', event);
    this.currentSession = null;
    
    return event;
  }
  
  private convertToEvent(session: Session): CanonicalEvent {
    return {
      id: `session-${session.id}`,
      canonicalId: session.id,
      type: EventType.AGENT_SESSION,
      timestamp: session.startTime,
      title: session.prompt,
      description: this.generateDescription(session),
      author: {
        id: session.agentType,
        name: this.getAgentDisplayName(session.agentType)
      },
      impact: this.calculateImpact(session),
      metadata: {
        sessionDuration: this.calculateDuration(session),
        activityCount: session.activities.length
      }
    };
  }
}
```

#### Day 5: Storage Layer
```typescript
// packages/core/sessions/SessionStorage.ts
export class SessionStorage {
  constructor(private storagePath: string) {}
  
  async saveSession(session: Session): Promise<void> {
    const sessions = await this.loadSessions();
    sessions.push(session);
    
    // Keep last 100 sessions
    if (sessions.length > 100) {
      sessions.shift();
    }
    
    await this.writeJson('sessions.json', sessions);
  }
  
  async loadSessions(): Promise<Session[]> {
    return await this.readJson('sessions.json') || [];
  }
}
```

### Deliverables
- ✅ Core package with no VSCode dependencies
- ✅ Session manager with event emitter
- ✅ Storage to `.agent-brain/sessions.json`
- ✅ Unit tests for session lifecycle

---

## Week 2: Knowledge System Refactor

### Goal
Transform patterns/ADRs/learnings from event providers to knowledge enhancers.

### Tasks

#### Day 1-2: Remove IntelligenceProvider
```typescript
// DELETE: providers/intelligence/IntelligenceProvider.ts
// This was wrong abstraction - patterns aren't events

// Create knowledge facade instead
// packages/core/knowledge/KnowledgeSystem.ts
export class KnowledgeSystem {
  constructor(
    private patterns: PatternSystem,
    private adrs: ADRSystem,
    private learnings: LearningStorage
  ) {}
  
  async getRelevantKnowledge(context: string): Promise<Knowledge> {
    const [patterns, adrs, learnings] = await Promise.all([
      this.patterns.findRelevant(context),
      this.adrs.getApplicable(context),
      this.learnings.findSimilar(context)
    ]);
    
    return { patterns, adrs, learnings };
  }
  
  // This is for UI display, not timeline events
  async getKnowledgeSummary(): Promise<KnowledgeSummary> {
    return {
      totalPatterns: await this.patterns.count(),
      totalADRs: await this.adrs.count(),
      recentLearnings: await this.learnings.getRecent(5),
      lastUpdated: new Date()
    };
  }
}
```

#### Day 3-4: Migrate Existing Systems
```typescript
// Move these from providers/ to packages/core/knowledge/
// - PatternSystem (already good, just move)
// - ADRSystem (already good, just move)  
// - LearningStorage (already good, just move)

// Update imports throughout codebase
// Remove any event generation code from these systems
```

#### Day 5: Integration Tests
```typescript
// Test knowledge retrieval without event generation
describe('KnowledgeSystem', () => {
  it('should find relevant patterns without creating events', async () => {
    const knowledge = await knowledgeSystem.getRelevantKnowledge('auth');
    
    expect(knowledge.patterns).toHaveLength(3);
    expect(knowledge.patterns[0]).not.toHaveProperty('timestamp');
    // Patterns are knowledge, not events!
  });
});
```

### Deliverables
- ✅ IntelligenceProvider removed
- ✅ Knowledge system established
- ✅ Clean separation: events vs knowledge
- ✅ All tests passing

---

## Week 3: Simple Prompt UI

### Goal
Create minimal prompt interface using VSCode native UI (no complex webview yet).

### Tasks

#### Day 1-2: Command Registration
```typescript
// packages/vscode/commands/PromptCommand.ts
export class PromptCommand {
  static register(context: vscode.ExtensionContext): void {
    const command = vscode.commands.registerCommand(
      'agentBrain.newPrompt',
      () => this.execute()
    );
    
    context.subscriptions.push(command);
  }
  
  static async execute(): Promise<void> {
    // Step 1: Get prompt from user
    const prompt = await vscode.window.showInputBox({
      title: '🧠 Agent Brain',
      prompt: 'What would you like to build?',
      placeHolder: 'Add authentication to the user service...',
      ignoreFocusOut: true
    });
    
    if (!prompt) return;
    
    // Step 2: Get agent type
    const agent = await vscode.window.showQuickPick([
      { label: 'Claude', value: 'claude' },
      { label: 'Copilot', value: 'copilot' },
      { label: 'Cursor', value: 'cursor' }
    ], {
      title: 'Which AI assistant are you using?'
    });
    
    if (!agent) return;
    
    // Step 3: Enhance and confirm
    await this.enhanceAndSend(prompt, agent.value);
  }
  
  private static async enhanceAndSend(prompt: string, agentType: string): Promise<void> {
    // Get knowledge
    const knowledge = await knowledgeSystem.getRelevantKnowledge(prompt);
    
    // Create simple enhancement
    const enhanced = `${prompt}

Context from Agent Brain:
- Follow these patterns: ${knowledge.patterns.map(p => p.name).join(', ')}
- Consider these ADRs: ${knowledge.adrs.map(a => a.title).join(', ')}
${knowledge.learnings.length > 0 ? `- Similar cases found: ${knowledge.learnings.length}` : ''}`;
    
    // Show preview
    const action = await vscode.window.showInformationMessage(
      'Agent Brain enhanced your prompt',
      { modal: true, detail: enhanced },
      'Send to Terminal',
      'Copy to Clipboard',
      'Cancel'
    );
    
    if (action === 'Send to Terminal') {
      // Start session
      sessionManager.startSession(prompt, agentType);
      
      // Send to terminal
      const terminal = vscode.window.activeTerminal || 
                      vscode.window.createTerminal('AI Assistant');
      terminal.show();
      terminal.sendText(enhanced);
    } else if (action === 'Copy to Clipboard') {
      await vscode.env.clipboard.writeText(enhanced);
      vscode.window.showInformationMessage('Enhanced prompt copied!');
    }
  }
}
```

#### Day 3: File System Monitoring
```typescript
// packages/vscode/adapters/FileSystemAdapter.ts
export class FileSystemAdapter {
  constructor(private sessionManager: SessionManager) {
    this.setupWatchers();
  }
  
  private setupWatchers(): void {
    // Watch for file saves during active session
    vscode.workspace.onDidSaveTextDocument(doc => {
      if (sessionManager.hasActiveSession()) {
        sessionManager.trackActivity({
          type: 'file-save',
          file: vscode.workspace.asRelativePath(doc.uri),
          timestamp: new Date()
        });
      }
    });
  }
}
```

#### Day 4-5: Manual Session Controls
```typescript
// Add commands for manual session management
vscode.commands.registerCommand('agentBrain.endSession', () => {
  sessionManager.finalizeSession();
  vscode.window.showInformationMessage('Session ended and saved to timeline');
});

vscode.commands.registerCommand('agentBrain.showStatus', () => {
  const session = sessionManager.getCurrentSession();
  if (session) {
    vscode.window.showInformationMessage(
      `Active session: ${session.prompt} (${session.activities.length} activities)`
    );
  } else {
    vscode.window.showInformationMessage('No active session');
  }
});
```

### Deliverables
- ✅ Command palette integration
- ✅ Simple prompt enhancement
- ✅ Manual session management
- ✅ File activity tracking

---

## Week 4: Timeline Integration

### Goal
Display AI sessions in the existing timeline alongside git events.

### Tasks

#### Day 1-2: Event Type Addition
```typescript
// packages/core/events/EventType.ts
export enum EventType {
  // Existing
  COMMIT = 'commit',
  MERGE = 'merge',
  TAG = 'tag',
  
  // New
  AGENT_SESSION = 'agent-session'
}

// Update CanonicalEvent to handle sessions
interface CanonicalEvent {
  // ... existing fields ...
  
  // Add session-specific optional fields
  sessionMetadata?: {
    duration: number;
    activityCount: number;
    filesModified: string[];
  };
}
```

#### Day 3: Timeline Provider Update
```typescript
// packages/vscode/timeline/EnhancedTimelineProvider.ts
export class EnhancedTimelineProvider extends TimelineProvider {
  constructor(
    orchestrator: DataOrchestrator,
    private sessionManager: SessionManager
  ) {
    super(orchestrator);
    
    // Listen for session completions
    this.sessionManager.on('session:completed', (event: CanonicalEvent) => {
      this.addEventToTimeline(event);
    });
  }
  
  private addEventToTimeline(event: CanonicalEvent): void {
    // Add to orchestrator's event stream
    this.orchestrator.addDynamicEvent(event);
    
    // Trigger UI refresh
    this.refresh();
  }
}
```

#### Day 4: Visual Differentiation
```typescript
// packages/vscode/timeline/SessionVisualizer.ts
export class SessionVisualizer {
  static getVisualConfig(event: CanonicalEvent): VisualConfig {
    if (event.type === EventType.AGENT_SESSION) {
      return {
        shape: d3.symbolStar,
        color: '#22C55E', // Green
        icon: '🤖',
        size: 8,
        priority: 'high' // Show above commits
      };
    }
    
    // Return default for other types
    return DefaultVisualizer.getConfig(event);
  }
}
```

#### Day 5: Testing
```typescript
// Test session events appear in timeline
it('should show AI sessions in timeline', async () => {
  // Start and complete a session
  await sessionManager.startSession('Add auth', 'claude');
  await sessionManager.trackActivity({ type: 'file-save', file: 'auth.ts' });
  const event = await sessionManager.finalizeSession();
  
  // Check timeline includes session
  const timeline = await timelineProvider.getEvents();
  expect(timeline).toContainEqual(
    expect.objectContaining({
      type: EventType.AGENT_SESSION,
      title: 'Add auth'
    })
  );
});
```

### Deliverables
- ✅ Sessions appear in timeline
- ✅ Visual differentiation from git events
- ✅ Timeline remains performant
- ✅ Backward compatible

---

## Week 5: Context Persistence & Polish

### Goal
Add simple context tracking and polish the experience.

### Tasks

#### Day 1-2: Context Manager
```typescript
// packages/core/context/ContextManager.ts
export class ContextManager {
  private context: Context;
  private storage: ContextStorage;
  
  async addRule(rule: string): Promise<void> {
    if (!this.context.rules.includes(rule)) {
      this.context.rules.push(rule);
      await this.save();
    }
  }
  
  async addDecision(decision: string): Promise<void> {
    this.context.decisions.push({
      what: decision,
      when: new Date()
    });
    
    // Keep last 10
    while (this.context.decisions.length > 10) {
      this.context.decisions.shift();
    }
    
    await this.save();
  }
  
  getReinforcement(): string {
    return `
Current Context:
- Rules: ${this.context.rules.join(', ')}
- Recent decisions: ${this.context.decisions.map(d => d.what).join(', ')}
    `.trim();
  }
}
```

#### Day 3: Context Commands
```typescript
// Simple commands for context management
vscode.commands.registerCommand('agentBrain.addRule', async () => {
  const rule = await vscode.window.showInputBox({
    prompt: 'Enter a rule to remember',
    placeHolder: 'Use Repository pattern for all database access'
  });
  
  if (rule) {
    await contextManager.addRule(rule);
    vscode.window.showInformationMessage('Rule added to Agent Brain memory');
  }
});

vscode.commands.registerCommand('agentBrain.reinforce', async () => {
  const reinforcement = contextManager.getReinforcement();
  const action = await vscode.window.showInformationMessage(
    'Copy context to clipboard?',
    { modal: true, detail: reinforcement },
    'Copy', 'Cancel'
  );
  
  if (action === 'Copy') {
    await vscode.env.clipboard.writeText(reinforcement);
  }
});
```

#### Day 4: Status Bar
```typescript
// packages/vscode/ui/StatusBar.ts
export class StatusBar {
  private item: vscode.StatusBarItem;
  
  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    
    this.item.text = '$(brain) Agent Brain';
    this.item.tooltip = 'Click for Agent Brain menu';
    this.item.command = 'agentBrain.showMenu';
    this.item.show();
  }
  
  updateForSession(session: Session): void {
    this.item.text = `$(brain) Session: ${session.activities.length} activities`;
    this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.activeBackground');
  }
  
  clearSession(): void {
    this.item.text = '$(brain) Agent Brain';
    this.item.backgroundColor = undefined;
  }
}
```

#### Day 5: Polish & Documentation
```typescript
// Add README with clear instructions
// Add configuration options
// Clean up any rough edges
// Ensure all commands have icons and descriptions
```

### Deliverables
- ✅ Context persistence
- ✅ Status bar indicator  
- ✅ Polished command palette
- ✅ Basic documentation
- ✅ Ready for beta testing

---

## Testing Strategy

### Unit Tests (Continuous)
```bash
# Run after each component
npm test -- --coverage

# Core should have 80%+ coverage
# VSCode parts can have lower coverage (harder to test)
```

### Integration Tests (End of each week)
```bash
# Test full workflows
npm run test:integration

# Key scenarios:
# - Start session → track activity → see in timeline
# - Add context → reinforce → context persists
# - Enhance prompt → send to terminal → session created
```

### Manual Testing Checklist
- [ ] Install extension in fresh VSCode
- [ ] Create new prompt
- [ ] Track some activities
- [ ] End session
- [ ] See session in timeline
- [ ] Add context rules
- [ ] Restart VSCode
- [ ] Context persists

---

## Risk Mitigation

| Risk | Mitigation | Week |
|------|------------|------|
| Session/Timeline integration fails | Test early with mock data | 1 |
| Knowledge retrieval too slow | Add caching layer | 2 |
| UI feels clunky | Use native VSCode UI | 3 |
| Context doesn't persist | Test storage thoroughly | 5 |
| Performance issues | Profile and optimize | 5 |

---

## Definition of Done (Week 5)

### Must Have
- ✅ Sessions tracked and appear in timeline
- ✅ Basic prompt enhancement works
- ✅ Context persists across restarts
- ✅ Git events still work
- ✅ No performance degradation

### Nice to Have (if time permits)
- ⭕ Automatic session timeout (5 min idle)
- ⭕ Pattern violation warnings
- ⭕ Export sessions to markdown

### Explicitly Excluded (v2 features)
- ❌ Compaction detection
- ❌ Microsoft XML formatting  
- ❌ Multiple prompt versions
- ❌ Clipboard monitoring
- ❌ Webview prompt UI

---

## Go/No-Go Criteria

### Week 1 Checkpoint
- Core package builds without VSCode deps ✅/❌
- Session manager works with mock data ✅/❌
- **If NO**: Adjust architecture

### Week 3 Checkpoint  
- Prompt command enhances text ✅/❌
- Sessions track activities ✅/❌
- **If NO**: Simplify UI approach

### Week 5 Final
- Timeline shows sessions ✅/❌
- Context persists ✅/❌
- No critical bugs ✅/❌
- **If NO**: Delay release, fix issues

---

## The Bottom Line

This pragmatic plan:
1. **Delivers value in 5 weeks** (not 20)
2. **Focuses on core features** (not everything)
3. **Uses proven patterns** (not speculation)
4. **Ships incrementally** (not big bang)
5. **Learns from user feedback** (not assumptions)

Ready to start Monday with Week 1: Core Session Management.