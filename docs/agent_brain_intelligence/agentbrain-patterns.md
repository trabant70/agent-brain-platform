# Agent Brain Development Patterns

## Pattern: Stage-Based Enhancement
**Category**: Architecture  
**When to Use**: Adding new capabilities to prompt enhancement

### Context
Need to add new prompt enhancement capabilities without breaking existing functionality or creating untestable monoliths.

### Solution
Create a new stage class that extends the previous stage, adding one specific capability.

### Implementation
```typescript
// Each stage adds ONE capability
class StageN_SpecificCapability extends StageNMinus1 {
  enhance(prompt: string, context: Context): string {
    // Apply this stage's specific enhancement
    let enhanced = this.applySpecificLogic(prompt, context);
    
    // Then apply all previous stages
    return super.enhance(enhanced, context);
  }
  
  private applySpecificLogic(prompt: string, context: Context): string {
    // Single responsibility: one enhancement type
  }
}
```

### Benefits
- Each stage is independently testable
- Can disable stages for debugging
- Clear capability progression
- Graceful degradation on failure

### Example Usage
```typescript
// Stage 3 adds templates, nothing else
class Stage3_StructuredEnhancer extends Stage2_PatternExpander {
  private templates = { bugFix: {...}, feature: {...} };
  
  enhance(prompt: string, context: Context): string {
    const requestType = this.detectType(prompt);
    if (requestType && this.templates[requestType]) {
      return this.templates[requestType].apply(prompt, context);
    }
    return super.enhance(prompt, context);
  }
}
```

---

## Pattern: Knowledge Item with Checkbox Control
**Category**: UI/UX  
**When to Use**: Any user-controllable knowledge element

### Context
Users need to control what knowledge enhances their prompts without editing files.

### Solution
Every knowledge item has three states: checked (active), unchecked (available), and locked (mandatory).

### Implementation
```typescript
interface KnowledgeItem {
  id: string;
  state: 'checked' | 'unchecked' | 'locked';
  
  // Visual representation
  getIcon(): string {
    switch(this.state) {
      case 'locked': return '🔒';  // Can't change
      case 'checked': return '☑';   // Will use
      case 'unchecked': return '☐'; // Won't use
    }
  }
  
  // User interaction
  toggle(): void {
    if (this.state === 'locked') {
      vscode.window.showWarningMessage('Organizational rules cannot be disabled');
      return;
    }
    this.state = this.state === 'checked' ? 'unchecked' : 'checked';
    this.persist();
  }
}
```

### UI Rules
- Locked items appear at top of category
- Checked items sort above unchecked
- Visual hierarchy: Locked > Checked > Unchecked
- Right-click for context menu

---

## Pattern: Webview Message Handler
**Category**: Communication  
**When to Use**: Extension ↔ Webview communication

### Context
Need reliable bidirectional communication between extension and webview with type safety.

### Solution
Define message types, use discriminated unions, always acknowledge receipt.

### Implementation
```typescript
// Define all message types
type WebviewMessage = 
  | { type: 'enhancePrompt'; prompt: string; agent: string }
  | { type: 'promptEnhanced'; enhanced: string; count: number }
  | { type: 'error'; message: string };

// Extension handler
class MessageHandler {
  async handle(message: WebviewMessage): Promise<void> {
    try {
      switch (message.type) {
        case 'enhancePrompt':
          const result = await this.enhance(message);
          this.send({ 
            type: 'promptEnhanced',
            enhanced: result.enhanced,
            count: result.count
          });
          break;
        // ... other cases
      }
    } catch (error) {
      this.send({ type: 'error', message: String(error) });
    }
  }
  
  private send(message: WebviewMessage): void {
    this.panel.webview.postMessage(message);
  }
}

// Webview handler  
function handleMessage(event: MessageEvent<WebviewMessage>) {
  const message = event.data;
  switch (message.type) {
    case 'promptEnhanced':
      updateUI(message.enhanced, message.count);
      break;
    case 'error':
      showError(message.message);
      break;
  }
}
```

### Error Handling
- Always wrap handlers in try-catch
- Send error messages back to webview
- Log errors for debugging
- Show user-friendly error messages

---

## Pattern: Progressive Disclosure UI
**Category**: UI/UX  
**When to Use**: Complex features for novice users

### Context
Novice users need powerful features but get overwhelmed by complexity.

### Solution
Start simple, reveal complexity on demand. Three levels: Essential, Common, Advanced.

### Implementation
```typescript
class ProgressivePanel {
  private level: 'essential' | 'common' | 'advanced' = 'essential';
  
  render(): string {
    let html = this.renderEssential(); // Always show
    
    if (this.level !== 'essential') {
      html += this.renderCommon();      // Show if expanded
    }
    
    if (this.level === 'advanced') {
      html += this.renderAdvanced();    // Show if fully expanded
    }
    
    html += this.renderExpandButton();
    return html;
  }
  
  private renderEssential(): string {
    return `
      <div class="essential-controls">
        <textarea placeholder="What do you want to build?"></textarea>
        <button>Enhance with AI</button>
      </div>
    `;
  }
  
  private renderExpandButton(): string {
    const label = this.level === 'essential' ? 'More Options' : 
                  this.level === 'common' ? 'Advanced' : 'Show Less';
    return `<button onclick="toggleLevel()">${label}</button>`;
  }
}
```

### Levels Guide
- **Essential**: What 80% of users need 80% of the time
- **Common**: Useful options for regular users
- **Advanced**: Power user features, debugging, experiments

---

## Pattern: Error to Learning Pipeline
**Category**: Learning System  
**When to Use**: Any detected error in AI output

### Context
AI makes mistakes. Users panic. Same mistakes repeat.

### Solution
Every error becomes a potential learning with user confirmation.

### Implementation
```typescript
class ErrorLearningPipeline {
  async processError(error: DetectedError): Promise<void> {
    // 1. Detect error pattern
    const pattern = this.extractPattern(error);
    
    // 2. Check if we've seen this before
    const similar = await this.findSimilarLearnings(pattern);
    
    // 3. Show recovery UI
    const action = await this.showRecoveryUI(error, similar);
    
    if (action === 'save-learning') {
      // 4. Create learning
      const learning = {
        id: generateId(),
        name: await this.promptForName(),
        pattern: pattern,
        description: error.message,
        solution: await this.promptForSolution(),
        occurrences: 1,
        created: new Date()
      };
      
      // 5. Save and apply immediately
      await this.saveLearning(learning);
      await this.applyToCurrentContext(learning);
    }
  }
  
  private showRecoveryUI(error: Error, similar: Learning[]): Promise<string> {
    // Show non-scary UI with options
    return vscode.window.showInformationMessage(
      `I noticed an issue: ${error.message}`,
      'Save as Learning',
      'Fix Manually',
      similar.length > 0 ? 'Apply Similar Fix' : undefined
    );
  }
}
```

### Key Principles
- Never blame user for AI failures
- Always offer recovery path
- Learn from every failure
- Apply learnings immediately

---

## Pattern: Guidance Context Tracking
**Category**: Contextual Help  
**When to Use**: Determining when to show tips

### Context
Need to know what user is doing to provide relevant help without being intrusive.

### Solution
Track user activity state machine with debounced transitions.

### Implementation
```typescript
class ActivityTracker {
  private state: UserActivity = 'idle';
  private lastAction: Date = new Date();
  private transitions = new Map<string, NodeJS.Timeout>();
  
  updateActivity(event: string): void {
    // Clear pending transitions
    this.clearTransitions();
    
    // Immediate transitions
    switch (event) {
      case 'prompt-panel-opened':
        this.setState('building_prompt');
        break;
      
      case 'error-detected':
        this.setState('error_state');
        break;
      
      case 'typing':
        if (this.state === 'idle') {
          this.setState('working');
        }
        // Debounce back to idle
        this.scheduleTransition('idle', 30000);
        break;
    }
    
    this.lastAction = new Date();
  }
  
  private scheduleTransition(to: UserActivity, delay: number): void {
    const timer = setTimeout(() => {
      this.setState(to);
    }, delay);
    this.transitions.set(to, timer);
  }
  
  getContext(): UserContext {
    return {
      currentActivity: this.state,
      idleTime: Date.now() - this.lastAction.getTime(),
      // ... other context
    };
  }
}
```

### State Transitions
```
idle -> prompt_building (opens panel)
prompt_building -> reviewing (clicks enhance)
reviewing -> working (starts session)
working -> idle (30s no activity)
any -> error_state (error detected)
error_state -> working (recovery action)
```

---

## Pattern: Template-Based Request Detection
**Category**: Enhancement  
**When to Use**: Determining enhancement strategy

### Context
Different request types need different enhancement approaches.

### Solution
Use regex patterns to categorize requests and apply appropriate templates.

### Implementation
```typescript
class RequestCategorizer {
  private categories = [
    {
      type: 'bugfix',
      patterns: [
        /fix\s+(bug|issue|error|problem)/i,
        /broken|not working|fails/i,
        /debug|troubleshoot/i
      ],
      template: 'bugfix',
      requiredContext: ['recentErrors', 'testFailures']
    },
    {
      type: 'feature',
      patterns: [
        /add|create|implement|build/i,
        /new\s+(feature|functionality)/i
      ],
      template: 'feature',
      requiredContext: ['patterns', 'constraints']
    },
    {
      type: 'refactor',
      patterns: [
        /refactor|clean|improve|optimize/i,
        /technical debt|code smell/i
      ],
      template: 'refactor',
      requiredContext: ['currentState', 'tests']
    }
  ];
  
  categorize(prompt: string): RequestCategory {
    for (const category of this.categories) {
      for (const pattern of category.patterns) {
        if (pattern.test(prompt)) {
          return category;
        }
      }
    }
    return { type: 'generic', template: 'default' };
  }
  
  getMissingContext(category: RequestCategory, context: Context): string[] {
    return category.requiredContext.filter(key => !context[key]);
  }
}
```

### Usage
```typescript
const category = categorizer.categorize(prompt);
const missing = categorizer.getMissingContext(category, context);
if (missing.length > 0) {
  context = await gatherContext(missing);
}
const enhanced = templates[category.template].apply(prompt, context);
```

---

## Pattern: Filesystem Knowledge Storage
**Category**: Persistence  
**When to Use**: Storing patterns, learnings, packages

### Context
Need persistent storage that's git-friendly, human-readable, and shareable.

### Solution
Use `.agent-brain/` directory with JSON/Markdown files organized by type.

### Implementation
```typescript
class FileSystemStorage {
  private baseDir = '.agent-brain';
  private watchers = new Map<string, vscode.FileSystemWatcher>();
  
  async save(item: KnowledgeItem): Promise<void> {
    const dir = path.join(this.baseDir, item.type + 's');
    const file = path.join(dir, `${item.id}.${this.getExtension(item)}`);
    
    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });
    
    // Save based on type
    const content = item.type === 'pattern' 
      ? this.toMarkdown(item)
      : JSON.stringify(item, null, 2);
    
    await fs.writeFile(file, content);
    
    // Notify watchers
    this.emit('saved', item);
  }
  
  async load<T extends KnowledgeItem>(type: string): Promise<T[]> {
    const dir = path.join(this.baseDir, type + 's');
    
    try {
      const files = await fs.readdir(dir);
      const items: T[] = [];
      
      for (const file of files) {
        const content = await fs.readFile(path.join(dir, file), 'utf8');
        const item = this.parse<T>(content, file);
        items.push(item);
      }
      
      return items;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return []; // Directory doesn't exist yet
      }
      throw error;
    }
  }
  
  watch(type: string, callback: (items: KnowledgeItem[]) => void): void {
    const pattern = path.join(this.baseDir, type + 's', '*');
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);
    
    watcher.onDidCreate(() => this.reload(type, callback));
    watcher.onDidChange(() => this.reload(type, callback));
    watcher.onDidDelete(() => this.reload(type, callback));
    
    this.watchers.set(type, watcher);
  }
}
```

### Directory Structure
```
.agent-brain/
├── patterns/
│   ├── api-error-handling.md
│   └── repository-pattern.md
├── learnings/
│   ├── auth-token-expiry.json
│   └── array-indexing.json
├── packages/
│   ├── organizational/
│   └── community/
└── sessions/
    └── 2025-01-07-auth-implementation.json
```

---

## Pattern: Success Celebration System
**Category**: Gamification  
**When to Use**: User completes successful session

### Context
Novices need positive reinforcement to build confidence.

### Solution
Celebrate successes with visual feedback and progression tracking.

### Implementation
```typescript
class SuccessCelebration {
  async celebrate(session: CompletedSession): Promise<void> {
    const metrics = this.calculateMetrics(session);
    
    // Visual celebration
    await this.showCelebration(metrics);
    
    // Update progression
    await this.updateProgression(metrics);
    
    // Suggest next action
    await this.suggestNextStep(session);
  }
  
  private async showCelebration(metrics: SessionMetrics): Promise<void> {
    const message = this.getCelebrationMessage(metrics);
    const emoji = this.getCelebrationEmoji(metrics);
    
    // Show notification with animation
    const panel = vscode.window.createWebviewPanel(
      'celebration',
      'Success!',
      vscode.ViewColumn.Two,
      { enableScripts: true }
    );
    
    panel.webview.html = `
      <div class="celebration">
        <div class="emoji-burst">${emoji}</div>
        <h2>${message}</h2>
        <div class="metrics">
          <div>✅ No errors detected</div>
          <div>📚 ${metrics.knowledgeUsed} patterns applied</div>
          <div>⏱️ Completed in ${metrics.duration}</div>
        </div>
        <div class="progression">
          Level ${metrics.userLevel} → ${metrics.userLevel + 1}
        </div>
      </div>
    `;
  }
  
  private getCelebrationMessage(metrics: SessionMetrics): string {
    if (metrics.firstSuccess) {
      return "🎉 Your first successful AI session!";
    }
    if (metrics.streakCount > 3) {
      return `🔥 ${metrics.streakCount} successful sessions in a row!`;
    }
    if (metrics.complexityScore > 8) {
      return "🚀 You tackled a complex challenge!";
    }
    return "✨ Great work! The AI followed your guidance perfectly.";
  }
}
```

### Progression Levels
1. **Novice**: First 5 sessions
2. **Learning**: 5-20 sessions with >50% success
3. **Proficient**: 20-50 sessions with >70% success
4. **Expert**: 50+ sessions with >85% success
5. **Master**: Created shareable patterns/packages