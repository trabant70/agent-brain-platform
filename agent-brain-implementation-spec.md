# Agent Brain Implementation Specification
## Detailed Technical Blueprint for VSCode Extension

### Project Structure

```
agent-brain/
├── package.json                    # Extension manifest
├── tsconfig.json                   # TypeScript config
├── webpack.config.js               # Bundler config
├── README.md                       # User documentation
├── .vscodeignore                   # Publishing excludes
│
├── src/
│   ├── extension.ts                # Main entry point
│   ├── constants.ts                # Global constants
│   ├── types.ts                    # Shared type definitions
│   │
│   ├── core/
│   │   ├── AgentBrainManager.ts   # Main coordinator
│   │   ├── StorageManager.ts      # File system operations
│   │   ├── ConfigManager.ts       # Configuration handling
│   │   └── EventBus.ts            # Internal communication
│   │
│   ├── prompt/
│   │   ├── PromptIntelligenceCenter.ts
│   │   ├── PromptEnhancer.ts      # Enhancement logic
│   │   ├── PromptUI.ts            # Webview panel
│   │   ├── MicrosoftXMLFormatter.ts
│   │   └── prompts/
│   │       └── ui.html            # Webview HTML
│   │
│   ├── session/
│   │   ├── SessionRollupEngine.ts # Event grouping
│   │   ├── AgentActivityRollup.ts # Rollup model
│   │   ├── RollupToEventConverter.ts
│   │   └── CompactionDetector.ts  # Context loss detection
│   │
│   ├── context/
│   │   ├── ContextPersistenceManager.ts
│   │   ├── ContextReinforcer.ts   # Reinforcement logic
│   │   ├── CriticalContext.ts     # Context model
│   │   └── ContextMemoryPanel.ts  # Sidebar UI
│   │
│   ├── adapters/
│   │   ├── BaseCaptureAdapter.ts  # Abstract base
│   │   ├── PromptCaptureAdapter.ts
│   │   ├── FileSystemAdapter.ts
│   │   ├── ClipboardAdapter.ts
│   │   ├── DiagnosticAdapter.ts
│   │   ├── TerminalAdapter.ts
│   │   └── AgentSpecificAdapters.ts
│   │
│   ├── patterns/
│   │   ├── PatternMatcher.ts      # Pattern detection
│   │   ├── PatternLoader.ts       # Load from files/URLs
│   │   ├── ADREnforcer.ts         # ADR compliance
│   │   └── ViolationReporter.ts   # Problem reporting
│   │
│   ├── quality/
│   │   ├── TechDebtPreventer.ts   # Quick fix detection
│   │   ├── CodeSmellDetector.ts   # Smell patterns
│   │   ├── QualityAnalyzer.ts     # Quality metrics
│   │   └── TimeAnalyzer.ts        # Quick vs proper fix
│   │
│   ├── intent/
│   │   ├── ProjectIntentAdvisor.ts
│   │   ├── IntentCapture.ts       # Intent dialog
│   │   ├── PatternSuggester.ts    # Pattern recommendations
│   │   └── GuidanceNegotiator.ts  # User selection UI
│   │
│   ├── storage/
│   │   ├── FileStorage.ts         # JSON file operations
│   │   ├── DataModels.ts          # All data interfaces
│   │   ├── FileRotation.ts        # Log rotation
│   │   └── CacheManager.ts        # External data cache
│   │
│   └── ui/
│       ├── StatusBarManager.ts    # Status bar items
│       ├── TreeDataProvider.ts    # Sidebar tree
│       ├── HoverProvider.ts       # Hover information
│       ├── CodeActionProvider.ts  # Quick fixes
│       └── WebviewManager.ts      # Webview coordination
│
├── resources/
│   ├── icons/                     # Extension icons
│   ├── styles/                    # Webview CSS
│   └── templates/                 # Default patterns
│
└── test/
    ├── unit/                      # Unit tests
    ├── integration/               # Integration tests
    └── fixtures/                  # Test data
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)

#### 1.1 Extension Scaffolding

```typescript
// src/extension.ts
import * as vscode from 'vscode';
import { AgentBrainManager } from './core/AgentBrainManager';

let manager: AgentBrainManager;

export async function activate(context: vscode.ExtensionContext) {
    console.log('Agent Brain is activating...');
    
    manager = new AgentBrainManager(context);
    
    try {
        await manager.initialize();
        
        // Register all commands
        context.subscriptions.push(
            vscode.commands.registerCommand('agentBrain.newPrompt', 
                () => manager.showPromptUI()),
            vscode.commands.registerCommand('agentBrain.initProject', 
                () => manager.initializeProject()),
            vscode.commands.registerCommand('agentBrain.reinforceContext', 
                () => manager.reinforceContext()),
            vscode.commands.registerCommand('agentBrain.reviewGuidance', 
                () => manager.reviewGuidance())
        );
        
        // Set up status bar
        manager.setupStatusBar();
        
        console.log('Agent Brain activated successfully');
    } catch (error) {
        console.error('Failed to activate Agent Brain:', error);
        vscode.window.showErrorMessage('Agent Brain failed to activate');
    }
}

export function deactivate() {
    manager?.dispose();
}
```

#### 1.2 Storage Manager

```typescript
// src/storage/FileStorage.ts
import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

export class FileStorage {
    private workspacePath: string;
    private storagePath: string;
    
    constructor() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder open');
        }
        
        this.workspacePath = workspaceFolder.uri.fsPath;
        this.storagePath = path.join(this.workspacePath, '.agent-brain');
    }
    
    async initialize(): Promise<void> {
        await this.ensureDirectory(this.storagePath);
        await this.ensureDirectory(path.join(this.storagePath, 'cache'));
        await this.createGitignore();
    }
    
    async readJson<T>(filename: string): Promise<T | null> {
        const filepath = path.join(this.storagePath, filename);
        try {
            const content = await fs.readFile(filepath, 'utf8');
            return JSON.parse(content) as T;
        } catch {
            return null;
        }
    }
    
    async writeJson<T>(filename: string, data: T): Promise<void> {
        const filepath = path.join(this.storagePath, filename);
        const content = JSON.stringify(data, null, 2);
        await fs.writeFile(filepath, content, 'utf8');
    }
    
    async rotateIfNeeded(filename: string, maxSize: number = 5242880): Promise<void> {
        const filepath = path.join(this.storagePath, filename);
        try {
            const stats = await fs.stat(filepath);
            if (stats.size > maxSize) {
                const backup = `${filepath}.${Date.now()}.bak`;
                await fs.rename(filepath, backup);
                
                // Keep only last 3 backups
                await this.cleanOldBackups(filepath);
            }
        } catch {
            // File doesn't exist yet
        }
    }
    
    private async createGitignore(): Promise<void> {
        const gitignorePath = path.join(this.storagePath, '.gitignore');
        const content = `# Personal data (never commit)
timeline.json
context.json
learnings.json
session-*.json

# Backups
*.bak

# Cache can be committed for team sharing
!cache/
`;
        await fs.writeFile(gitignorePath, content, 'utf8');
    }
}
```

---

### Phase 2: Prompt Intelligence (Week 2)

#### 2.1 Prompt Intelligence Center

```typescript
// src/prompt/PromptIntelligenceCenter.ts
import * as vscode from 'vscode';
import { PromptEnhancer } from './PromptEnhancer';
import { PromptUI } from './PromptUI';
import { SessionRollupEngine } from '../session/SessionRollupEngine';

export class PromptIntelligenceCenter {
    private enhancer: PromptEnhancer;
    private ui: PromptUI;
    private sessionEngine: SessionRollupEngine;
    
    constructor(
        private context: vscode.ExtensionContext,
        sessionEngine: SessionRollupEngine
    ) {
        this.enhancer = new PromptEnhancer();
        this.ui = new PromptUI(context);
        this.sessionEngine = sessionEngine;
    }
    
    async showPromptUI(): Promise<void> {
        const rawPrompt = await this.ui.show();
        if (!rawPrompt) return;
        
        // Generate enhancement versions
        const versions = await this.enhancer.enhance(rawPrompt);
        
        // Let user choose
        const selected = await this.ui.showVersionSelector(versions);
        if (!selected) return;
        
        // Start new session
        this.sessionEngine.onUserPrompt(selected.prompt, selected.targetAgent);
        
        // Send to agent
        await this.sendToAgent(selected);
    }
    
    private async sendToAgent(enhanced: EnhancedPrompt): Promise<void> {
        switch (enhanced.targetAgent) {
            case 'claude-terminal':
                await this.sendToTerminal(enhanced.prompt);
                break;
            case 'claude-extension':
                await this.sendToClaudeExtension(enhanced.prompt);
                break;
            case 'copilot':
                await this.sendToCopilot(enhanced.prompt);
                break;
        }
    }
    
    private async sendToTerminal(prompt: string): Promise<void> {
        const terminal = vscode.window.activeTerminal || 
                        vscode.window.createTerminal('Claude');
        terminal.show();
        terminal.sendText(prompt);
    }
}
```

#### 2.2 Prompt Enhancer

```typescript
// src/prompt/PromptEnhancer.ts
import { ContextPersistenceManager } from '../context/ContextPersistenceManager';
import { PatternMatcher } from '../patterns/PatternMatcher';
import { MicrosoftXMLFormatter } from './MicrosoftXMLFormatter';

export class PromptEnhancer {
    private contextManager: ContextPersistenceManager;
    private patternMatcher: PatternMatcher;
    private xmlFormatter: MicrosoftXMLFormatter;
    
    async enhance(rawPrompt: string): Promise<EnhancedPrompt[]> {
        const context = await this.contextManager.getCurrentContext();
        const patterns = await this.patternMatcher.findRelevant(rawPrompt);
        
        return [
            this.createFullContextVersion(rawPrompt, context, patterns),
            this.createQuickVersion(rawPrompt),
            this.createComprehensiveVersion(rawPrompt, context, patterns)
        ];
    }
    
    private createFullContextVersion(
        prompt: string, 
        context: CriticalContext,
        patterns: Pattern[]
    ): EnhancedPrompt {
        const xml = this.xmlFormatter.format({
            system: {
                role: 'Senior developer',
                context: context.workingOn
            },
            knowledge: {
                invariants: context.invariants,
                decisions: context.decisions,
                patterns: patterns
            },
            task: prompt,
            constraints: context.invariants,
            examples: this.findRelevantExamples(prompt)
        });
        
        return {
            version: 'With Full Context',
            confidence: 0.95,
            prompt: xml,
            targetAgent: 'claude'
        };
    }
}
```

---

### Phase 3: Session Management (Week 3)

#### 3.1 Session Rollup Engine

```typescript
// src/session/SessionRollupEngine.ts
import { AgentActivityRollup } from './AgentActivityRollup';
import { EventBus } from '../core/EventBus';

export class SessionRollupEngine {
    private currentRollup: AgentActivityRollup | null = null;
    private idleTimer: NodeJS.Timeout | null = null;
    private readonly IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
    
    constructor(private eventBus: EventBus) {
        this.setupEventListeners();
    }
    
    onUserPrompt(prompt: string, agentId: string): void {
        // Finalize previous session if exists
        if (this.currentRollup) {
            this.finalizeRollup('new-prompt');
        }
        
        // Start new session
        this.currentRollup = new AgentActivityRollup({
            sessionId: this.generateSessionId(),
            userPrompt: prompt,
            agentId: agentId,
            startTime: new Date()
        });
        
        // Start idle timer
        this.resetIdleTimer();
        
        // Emit event
        this.eventBus.emit('session:started', this.currentRollup);
    }
    
    onAgentActivity(activity: AgentActivity): void {
        if (!this.currentRollup) {
            console.warn('Activity without session:', activity);
            return;
        }
        
        // Add to current rollup
        this.currentRollup.addActivity(activity);
        
        // Reset idle timer
        this.resetIdleTimer();
        
        // Update metrics
        this.updateMetrics(activity);
    }
    
    private finalizeRollup(reason: 'timeout' | 'new-prompt' | 'manual'): void {
        if (!this.currentRollup) return;
        
        this.currentRollup.finalize(reason);
        
        // Convert to canonical event
        const event = this.convertToEvent(this.currentRollup);
        
        // Emit for storage
        this.eventBus.emit('event:created', event);
        
        // Clear
        this.currentRollup = null;
        this.clearIdleTimer();
    }
    
    private resetIdleTimer(): void {
        this.clearIdleTimer();
        
        this.idleTimer = setTimeout(() => {
            console.log('Session idle timeout reached');
            this.finalizeRollup('timeout');
        }, this.IDLE_TIMEOUT);
    }
}
```

---

### Phase 4: Context Persistence (Week 4)

#### 4.1 Context Persistence Manager

```typescript
// src/context/ContextPersistenceManager.ts
import { FileStorage } from '../storage/FileStorage';
import { CompactionDetector } from '../session/CompactionDetector';

export class ContextPersistenceManager {
    private criticalContext: CriticalContext;
    private compactionDetector: CompactionDetector;
    
    constructor(private storage: FileStorage) {
        this.compactionDetector = new CompactionDetector();
        this.loadContext();
    }
    
    async loadContext(): Promise<void> {
        const saved = await this.storage.readJson<CriticalContext>('session-context.json');
        
        this.criticalContext = saved || {
            sessionId: '',
            invariants: [],
            decisions: [],
            workingOn: null,
            sessionLearnings: [],
            compactionEvents: []
        };
    }
    
    async saveContext(): Promise<void> {
        await this.storage.writeJson('session-context.json', this.criticalContext);
    }
    
    addInvariant(rule: string): void {
        if (!this.criticalContext.invariants.includes(rule)) {
            this.criticalContext.invariants.push(rule);
            this.saveContext();
        }
    }
    
    addDecision(decision: Decision): void {
        this.criticalContext.decisions.push(decision);
        
        // Keep only last 20 decisions
        if (this.criticalContext.decisions.length > 20) {
            this.criticalContext.decisions.shift();
        }
        
        this.saveContext();
    }
    
    async checkForCompaction(agentOutput: string): Promise<boolean> {
        const isCompaction = this.compactionDetector.detect(agentOutput);
        
        if (isCompaction) {
            this.criticalContext.compactionEvents.push({
                timestamp: new Date(),
                detected: true
            });
            
            // Show warning
            const action = await vscode.window.showWarningMessage(
                'Agent Brain: Context loss detected. Reinforce?',
                'Reinforce Now',
                'Ignore'
            );
            
            if (action === 'Reinforce Now') {
                await this.reinforceContext();
            }
            
            await this.saveContext();
        }
        
        return isCompaction;
    }
    
    generateReinforcement(): string {
        return `<context_reminder priority="critical">
  <never_forget>
    ${this.criticalContext.invariants.map(i => `- ${i}`).join('\\n')}
  </never_forget>
  
  <recent_decisions>
    ${this.criticalContext.decisions.slice(-5).map(d => 
      `- ${d.what} (${d.when})`
    ).join('\\n')}
  </recent_decisions>
  
  <working_on>
    ${JSON.stringify(this.criticalContext.workingOn, null, 2)}
  </working_on>
  
  <session_learnings>
    ${this.criticalContext.sessionLearnings.map(l => `- ${l}`).join('\\n')}
  </session_learnings>
</context_reminder>`;
    }
}
```

---

### Phase 5: Quality Prevention (Week 5)

#### 5.1 Tech Debt Preventer

```typescript
// src/quality/TechDebtPreventer.ts
export class TechDebtPreventer {
    private patterns = {
        quickFix: [
            /TODO|FIXME|HACK/gi,
            /any\s*\[\]|any\s*{|:\s*any/g,
            /\/\/ eslint-disable/g,
            /catch\s*\(\s*\w*\s*\)\s*{\s*}/g,
            /console\.(log|error|warn)/g
        ],
        duplication: [
            // Detect copy-paste patterns
        ]
    };
    
    async analyzeIntent(prompt: string): Promise<QualityRisk> {
        const riskIndicators = [
            prompt.includes('quick'),
            prompt.includes('just make it work'),
            prompt.includes('for now'),
            prompt.includes('temporary')
        ];
        
        const riskScore = riskIndicators.filter(Boolean).length / riskIndicators.length;
        
        return {
            score: riskScore,
            level: riskScore > 0.5 ? 'high' : riskScore > 0.2 ? 'medium' : 'low',
            warnings: this.generateWarnings(riskScore)
        };
    }
    
    detectQuickFixSmells(code: string): CodeSmell[] {
        const smells: CodeSmell[] = [];
        
        for (const [name, pattern] of Object.entries(this.patterns.quickFix)) {
            const matches = code.match(pattern);
            if (matches) {
                smells.push({
                    type: name,
                    severity: 'warning',
                    occurrences: matches.length,
                    suggestion: this.getSuggestion(name)
                });
            }
        }
        
        return smells;
    }
    
    async suggestQualityApproach(quickFix: string): Promise<QualityAlternative> {
        const timeAnalysis = this.analyzeTime(quickFix);
        const properApproach = await this.generateProperApproach(quickFix);
        
        return {
            warning: 'This appears to be a quick fix that will create technical debt',
            timeAnalysis,
            properApproach,
            consequences: this.predictConsequences(quickFix)
        };
    }
    
    private analyzeTime(code: string): TimeAnalysis {
        // Heuristic: quick fixes take 5 min now, 2+ hours later
        const complexity = this.estimateComplexity(code);
        
        return {
            quickFix: {
                now: 5,
                later: 120 * complexity
            },
            properFix: {
                now: 20 * complexity,
                later: 0
            }
        };
    }
}
```

---

### Phase 6: Project Intent (Week 6)

#### 6.1 Project Intent Advisor

```typescript
// src/intent/ProjectIntentAdvisor.ts
export class ProjectIntentAdvisor {
    constructor(
        private storage: FileStorage,
        private patternSuggester: PatternSuggester
    ) {}
    
    async initializeProject(): Promise<void> {
        // Capture intent
        const intent = await vscode.window.showInputBox({
            prompt: 'What are you building?',
            placeHolder: 'A real-time collaboration tool for...',
            ignoreFocusOut: true
        });
        
        if (!intent) return;
        
        // Analyze and suggest patterns
        const suggested = await this.patternSuggester.suggest(intent);
        
        // Show selection UI
        const selected = await this.showPatternSelector(suggested);
        
        // Save project context
        const projectContext: ProjectIntent = {
            intent,
            goals: this.extractGoals(intent),
            applicablePatterns: selected.applicable,
            notApplicable: selected.notApplicable,
            createdAt: new Date(),
            evolution: []
        };
        
        await this.storage.writeJson('project-intent.json', projectContext);
        
        vscode.window.showInformationMessage(
            `Agent Brain configured for: ${intent}`
        );
    }
    
    private async showPatternSelector(patterns: SuggestedPattern[]): Promise<Selection> {
        const panel = vscode.window.createWebviewPanel(
            'patternSelector',
            'Select Applicable Patterns',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );
        
        panel.webview.html = this.getPatternSelectorHTML(patterns);
        
        return new Promise((resolve) => {
            panel.webview.onDidReceiveMessage(
                message => {
                    if (message.command === 'select') {
                        resolve(message.selection);
                        panel.dispose();
                    }
                },
                undefined,
                []
            );
        });
    }
}
```

---

## Package.json Configuration

```json
{
  "name": "agent-brain",
  "displayName": "Agent Brain",
  "description": "Intelligent wisdom layer for coding agents",
  "version": "1.0.0",
  "publisher": "agent-brain",
  "engines": {
    "vscode": "^1.74.0"
  },
  "categories": ["Other"],
  "activationEvents": [
    "onStartupFinished"
  ],
  "main": "./dist/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "agentBrain.newPrompt",
        "title": "Agent Brain: New Prompt",
        "icon": "$(sparkle)"
      },
      {
        "command": "agentBrain.initProject",
        "title": "Agent Brain: Initialize Project"
      },
      {
        "command": "agentBrain.reinforceContext",
        "title": "Agent Brain: Reinforce Context"
      },
      {
        "command": "agentBrain.reviewGuidance",
        "title": "Agent Brain: Review Guidance"
      }
    ],
    "configuration": {
      "title": "Agent Brain",
      "properties": {
        "agentBrain.enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable Agent Brain"
        },
        "agentBrain.promptUI.enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable Prompt Intelligence UI"
        },
        "agentBrain.storage.location": {
          "type": "string",
          "default": ".agent-brain",
          "description": "Storage folder location"
        }
      }
    },
    "keybindings": [
      {
        "command": "agentBrain.newPrompt",
        "key": "ctrl+shift+a",
        "mac": "cmd+shift+a"
      }
    ],
    "views": {
      "explorer": [
        {
          "id": "agentBrain.contextMemory",
          "name": "Agent Brain Memory",
          "icon": "$(brain)",
          "contextualTitle": "Context Memory"
        }
      ]
    },
    "viewsWelcome": [
      {
        "view": "agentBrain.contextMemory",
        "contents": "No context captured yet.\n[Initialize Project](command:agentBrain.initProject)"
      }
    ]
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "webpack --mode production",
    "watch": "webpack --mode development --watch",
    "test": "jest"
  },
  "devDependencies": {
    "@types/vscode": "^1.74.0",
    "@types/node": "^18.x",
    "typescript": "^5.0.0",
    "webpack": "^5.0.0",
    "webpack-cli": "^5.0.0",
    "ts-loader": "^9.0.0",
    "jest": "^29.0.0"
  }
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// test/unit/PromptEnhancer.test.ts
describe('PromptEnhancer', () => {
    let enhancer: PromptEnhancer;
    
    beforeEach(() => {
        enhancer = new PromptEnhancer();
    });
    
    it('should create multiple enhancement versions', async () => {
        const versions = await enhancer.enhance('Fix the bug');
        
        expect(versions).toHaveLength(3);
        expect(versions[0].version).toBe('With Full Context');
        expect(versions[0].confidence).toBeGreaterThan(0.9);
    });
    
    it('should apply Microsoft XML format', async () => {
        const versions = await enhancer.enhance('Add authentication');
        const xml = versions[0].prompt;
        
        expect(xml).toContain('<prompt version="1.0">');
        expect(xml).toContain('<task>');
        expect(xml).toContain('</prompt>');
    });
});
```

### Integration Tests

```typescript
// test/integration/SessionFlow.test.ts
describe('Session Flow', () => {
    it('should create event from prompt to completion', async () => {
        const engine = new SessionRollupEngine();
        
        // Start session with prompt
        engine.onUserPrompt('Add user authentication', 'claude');
        
        // Simulate activities
        engine.onAgentActivity({
            type: 'file-modified',
            file: 'auth.ts',
            linesAdded: 50
        });
        
        // Wait for idle timeout
        await sleep(5 * 60 * 1000);
        
        // Should have created event
        const events = await storage.readJson('timeline.json');
        expect(events).toHaveLength(1);
        expect(events[0].title).toBe('Add user authentication');
    });
});
```

---

## Deployment Checklist

### Pre-release
- [ ] All tests passing
- [ ] Memory usage < 100MB
- [ ] No console.log statements
- [ ] README.md complete
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json

### Publishing
```bash
# Install vsce
npm install -g vsce

# Package extension
vsce package

# Publish to marketplace
vsce publish
```

### Post-release
- [ ] Test installation from marketplace
- [ ] Monitor error reports
- [ ] Gather user feedback
- [ ] Plan next iteration

---

## Success Criteria

### Week 1 Milestone
- Extension activates without errors
- Storage system creates .agent-brain folder
- Basic commands registered

### Week 3 Milestone
- Prompt UI functional
- Session tracking working
- Events saved to timeline.json

### Week 6 Milestone
- Full prompt enhancement
- Context persistence
- Pattern enforcement
- Quality prevention
- Project intent capture

### Release Criteria
- 10 beta users testing
- < 5 critical bugs
- < 100ms response time
- Memory usage < 100MB
- Documentation complete