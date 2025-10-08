# 🚀 Agent Brain Complete Implementation Plan
## AI Literacy Training System with Progressive Enhancement

**Created**: 2025-10-07
**Status**: In Progress
**Current Phase**: Phase 1 - Foundation
**Version**: 1.0

---

## 📐 Plan Overview

This document guides the implementation of Agent Brain's complete UX redesign, transforming it from a developer tool into an AI Literacy Training System for novice developers frustrated with AI coding tools.

### **Core Innovation**
Agent Brain is not just a prompt enhancer—it's a training system that:
1. Makes AI behavior transparent ("Here's what the AI knows")
2. Teaches through doing (Every prompt is a lesson)
3. Celebrates progress (Visible growth from novice to proficient)
4. Recovers from failure (Mistakes become learnings)
5. Guides without patronizing (Subtle help, not constant nagging)

### **Progressive Enhancement Strategy**
Implements 8-stage enhancement evolution (from `docs/enhancements/prompt-enhancer-evolution.ts`):
- **Stage 1-2**: Basic context + pattern expansion (Phase 1)
- **Stage 3**: Structural templates (Phase 2)
- **Stage 4**: Learning from success (Phase 3)
- **Stage 5**: Agent-specific optimization (Phase 4)
- **Stage 6-8**: Interactive refinement, LLM-assisted, multi-version (Phase 5)

---

## 🎯 Five-Phase Implementation

### **Phase 1: Foundation - AI Companion + Quick Enhancement** (Days 1-3)
**Objective**: Novices get immediate help and simple prompt building

**Deliverables**:
- ✅ Guidance engine with contextual tips
- ✅ Simple one-screen prompt builder
- ✅ Stage 1-2 enhancement (context + patterns)
- ✅ Error detection system

### **Phase 2: Knowledge Visibility + Templates** (Days 4-6)
**Objective**: Users see and understand what AI knows

**Deliverables**:
- ⬜ Activity bar knowledge tree (friendly names: "Project Rules", "Code Templates", "Mistakes to Avoid")
- ⬜ Status cards showing knowledge health
- ⬜ Stage 3 enhancement (structural templates)
- ⬜ Comparison view (before/after enhancement)

### **Phase 3: Customization + Learning** (Days 7-10)
**Objective**: Users customize relevancy and system learns from success

**Deliverables**:
- ⬜ Project profile wizard (project type, priorities, skill level)
- ⬜ Checkbox control over knowledge items
- ⬜ Stage 4 enhancement (learning from success patterns)
- ⬜ Success celebration system with achievements

### **Phase 4: Golden Paths + Agent Optimization** (Days 11-14)
**Objective**: Step-by-step guides and agent-specific optimization

**Deliverables**:
- ⬜ Golden Path system (procedural workflows)
- ⬜ Workflow capture from successful sessions
- ⬜ Stage 5 enhancement (agent-specific transformations)
- ⬜ Enhancement level progression (Levels 1-5)

### **Phase 5: Advanced Enhancement** (Days 15-18)
**Objective**: Interactive refinement and multi-version generation

**Deliverables**:
- ⬜ Stage 6: Interactive refinement (asks clarifying questions)
- ⬜ Stage 7: LLM-assisted intent recognition (optional)
- ⬜ Stage 8: Multi-version generation (Quick/Thorough/Test-First/Performance)
- ⬜ Community sharing (import/export golden paths)

---

## 📋 PHASE 1: Foundation (Days 1-3) - DETAILED SPEC

### **Files to Create**

#### **1. Core Domain Files**

##### **`packages/core/src/domains/guidance/GuidanceEngine.ts`**
**Purpose**: Context detection and tip selection

**Key Interfaces**:
```typescript
interface UserContext {
  currentActivity: 'idle' | 'browsing_knowledge' | 'building_prompt' |
                   'reviewing_enhancement' | 'working' | 'error_state';
  skillLevel: 'novice' | 'learning' | 'proficient';
  recentErrors: Error[];
  idleTime: number;
  promptLength: number;
  knowledgeItemsSelected: number;
  sessionsCompleted: number;
  sessionsFailed: number;
  lastActionTimestamp: Date;
}

interface GuidanceRule {
  id: string;
  trigger: (ctx: UserContext) => boolean;
  message: string;
  action?: string; // Optional auto-action (e.g., 'showErrorRecovery')
  priority: 'critical' | 'helpful' | 'informational';
  maxShowCount: number; // Stop showing after N times
  timesShown: number;
}

export class GuidanceEngine {
  private rules: GuidanceRule[] = [];
  private shownHistory: Map<string, number> = new Map();
  private currentContext: UserContext;

  constructor();
  updateContext(changes: Partial<UserContext>): void;
  getCurrentContext(): UserContext;
  selectTip(context: UserContext): GuidanceRule | null;
  recordTipShown(ruleId: string): void;
  addRule(rule: GuidanceRule): void;
  private initializeRules(): void;
}
```

**Critical Rules to Implement**:
```typescript
// 1. First-time welcome
{
  id: 'first-time-welcome',
  trigger: (ctx) => ctx.sessionsCompleted === 0 && ctx.currentActivity === 'idle',
  message: "👋 Welcome! I'll help make AI coding work better for you.",
  priority: 'informational',
  maxShowCount: 1
}

// 2. Prompt too short
{
  id: 'prompt-too-short',
  trigger: (ctx) => ctx.currentActivity === 'building_prompt' &&
                     ctx.promptLength < 20 && ctx.idleTime > 10000,
  message: "Try being more specific! Example: 'Add user login with email validation'",
  priority: 'helpful',
  maxShowCount: 3
}

// 3. Error detected
{
  id: 'error-detected',
  trigger: (ctx) => ctx.currentActivity === 'error_state' && ctx.recentErrors.length > 0,
  message: "Let's fix this together. I can help you avoid this next time.",
  action: 'showErrorRecovery',
  priority: 'critical',
  maxShowCount: 999
}

// 4. No knowledge selected
{
  id: 'no-knowledge-selected',
  trigger: (ctx) => ctx.currentActivity === 'building_prompt' &&
                     ctx.knowledgeItemsSelected === 0,
  message: "Without context, the AI won't know your project's standards. Consider adding some rules.",
  priority: 'helpful',
  maxShowCount: 2
}

// 5. Empty knowledge base
{
  id: 'empty-knowledge-base',
  trigger: (ctx) => ctx.sessionsCompleted === 0 && ctx.knowledgeItemsSelected === 0,
  message: "Your knowledge base is empty! Start by recording a few architectural decisions.",
  priority: 'helpful',
  maxShowCount: 1
}
```

##### **`packages/core/src/domains/guidance/index.ts`**
```typescript
export * from './GuidanceEngine';
export * from './types';
```

##### **`packages/core/src/domains/guidance/types.ts`**
```typescript
export interface UserContext { /* ... */ }
export interface GuidanceRule { /* ... */ }
export interface GuidanceTip {
  rule: GuidanceRule;
  timestamp: Date;
}
```

---

##### **`packages/core/src/domains/enhancement/stages/Stage1_ContextInjector.ts`**
**Purpose**: Basic context injection (no intelligence)

```typescript
import { EnhancementContext } from '../types';

export class Stage1_ContextInjector {
  /**
   * Pure context injection - mechanical concatenation
   */
  enhance(prompt: string, context: EnhancementContext): string {
    const parts = [prompt];

    if (context.currentFile) {
      parts.push(`\nCurrent file: ${context.currentFile}`);
    }

    if (context.recentErrors && context.recentErrors.length > 0) {
      parts.push(`\nRecent errors:\n${context.recentErrors.join('\n')}`);
    }

    if (context.testFailures && context.testFailures.length > 0) {
      parts.push(`\nFailing tests: ${context.testFailures.join(', ')}`);
    }

    return parts.join('\n');
  }
}
```

##### **`packages/core/src/domains/enhancement/stages/Stage2_PatternExpander.ts`**
**Purpose**: Pattern-based expansion and missing spec detection

```typescript
import { Stage1_ContextInjector } from './Stage1_ContextInjector';
import { EnhancementContext } from '../types';

interface MissingSpecPattern {
  trigger: RegExp;
  missing: RegExp;
  suggest: string;
}

export class Stage2_PatternExpander extends Stage1_ContextInjector {
  private pronounPatterns: Record<string, (ctx: EnhancementContext) => string> = {
    '\\bit\\b': (ctx) => ctx.lastNoun || 'the code',
    '\\bthis\\b': (ctx) => ctx.currentFocus || 'the current implementation',
    '\\bthat\\b': (ctx) => ctx.lastMentioned || 'the previous approach',
    '\\bthere\\b': (ctx) => ctx.currentLocation || 'in the file'
  };

  private missingSpecPatterns: MissingSpecPattern[] = [
    {
      trigger: /^(add|create|implement)/i,
      missing: /test|spec/i,
      suggest: '\n[Consider: Should this include tests?]'
    },
    {
      trigger: /(async|await|fetch|api)/i,
      missing: /error|handle|catch|try/i,
      suggest: '\n[Consider: How should errors be handled?]'
    },
    {
      trigger: /refactor/i,
      missing: /maintain|backward|compatible/i,
      suggest: '\n[Consider: Should this maintain backward compatibility?]'
    }
  ];

  enhance(prompt: string, context: EnhancementContext): string {
    let enhanced = prompt;

    // Stage 2a: Expand vague references
    for (const [pattern, replacer] of Object.entries(this.pronounPatterns)) {
      const regex = new RegExp(pattern, 'gi');
      enhanced = enhanced.replace(regex, replacer(context));
    }

    // Stage 2b: Detect and suggest missing specifications
    const suggestions: string[] = [];
    for (const spec of this.missingSpecPatterns) {
      if (spec.trigger.test(enhanced) && !spec.missing.test(enhanced)) {
        suggestions.push(spec.suggest);
      }
    }

    if (suggestions.length > 0) {
      enhanced += '\n' + suggestions.join('');
    }

    // Apply Stage 1 context injection
    return super.enhance(enhanced, context);
  }
}
```

##### **`packages/core/src/domains/enhancement/types.ts`**
```typescript
export interface EnhancementContext {
  currentFile?: string;
  recentErrors?: string[];
  testFailures?: string[];
  patterns?: string[];
  constraints?: string[];
  lastNoun?: string;
  currentFocus?: string;
  lastMentioned?: string;
  currentLocation?: string;
  targetAgent?: 'claude' | 'copilot' | 'cursor' | 'unknown';
}

export interface EnhancedPrompt {
  original: string;
  enhanced: string;
  stage: number;
  itemsUsed: number;
  context: EnhancementContext;
}
```

##### **`packages/core/src/domains/enhancement/PromptEnhancer.ts`**
```typescript
import { Stage1_ContextInjector } from './stages/Stage1_ContextInjector';
import { Stage2_PatternExpander } from './stages/Stage2_PatternExpander';
import { EnhancementContext, EnhancedPrompt } from './types';

export class PromptEnhancer {
  private stage1: Stage1_ContextInjector;
  private stage2: Stage2_PatternExpander;

  constructor() {
    this.stage1 = new Stage1_ContextInjector();
    this.stage2 = new Stage2_PatternExpander();
  }

  /**
   * Enhance prompt using current stage (Stage 2 in Phase 1)
   */
  async enhance(prompt: string, context: EnhancementContext): Promise<EnhancedPrompt> {
    const enhanced = this.stage2.enhance(prompt, context);

    return {
      original: prompt,
      enhanced,
      stage: 2,
      itemsUsed: this.countItemsUsed(context),
      context
    };
  }

  private countItemsUsed(context: EnhancementContext): number {
    let count = 0;
    if (context.patterns?.length) count += context.patterns.length;
    if (context.constraints?.length) count += context.constraints.length;
    return count;
  }
}
```

---

#### **2. Webview UI Files**

##### **`packages/core/src/domains/visualization/ui/QuickPromptPanel.ts`**
**Purpose**: Single-screen prompt builder

```typescript
export class QuickPromptPanel {
  private panelElement: HTMLElement | null = null;
  private textArea: HTMLTextAreaElement | null = null;
  private knowledgePreview: HTMLElement | null = null;
  private isVisible: boolean = false;

  constructor(private onEnhanceCallback: (prompt: string, agent: string) => void) {}

  initialize(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('Quick prompt container not found');
      return;
    }

    container.innerHTML = this.render();
    this.attachEventListeners();
  }

  private render(): string {
    return `
      <div class="quick-prompt-panel" id="quick-prompt-panel" style="display: none;">
        <div class="panel-header">
          <h2>🧠 Get AI Help</h2>
          <button class="close-btn" id="prompt-close-btn">×</button>
        </div>

        <div class="panel-content">
          <label for="prompt-input">What do you want to build?</label>
          <textarea
            id="prompt-input"
            rows="4"
            placeholder="Add user login with email and password"></textarea>

          <div class="knowledge-preview" id="knowledge-preview" style="display:none;">
            ✨ I found <span id="knowledge-count">0</span> helpful rules and templates
            <div class="knowledge-actions">
              <a href="#" id="show-knowledge-link">Show me what I added</a> or
              <a href="#" id="trust-link">Trust you, let's go</a>
            </div>
          </div>

          <div class="agent-selection">
            <label>Which AI are you using?</label>
            <div class="radio-group">
              <label><input type="radio" name="agent" value="claude" checked> Claude</label>
              <label><input type="radio" name="agent" value="copilot"> Copilot</label>
              <label><input type="radio" name="agent" value="cursor"> Cursor</label>
              <label><input type="radio" name="agent" value="unknown"> Other</label>
            </div>
          </div>

          <div class="actions">
            <button id="copy-btn" class="primary-btn">Copy Enhanced Prompt</button>
            <button id="start-session-btn" class="secondary-btn">Start Working & Track It</button>
          </div>
        </div>
      </div>
    `;
  }

  private attachEventListeners(): void {
    this.panelElement = document.getElementById('quick-prompt-panel');
    this.textArea = document.getElementById('prompt-input') as HTMLTextAreaElement;
    this.knowledgePreview = document.getElementById('knowledge-preview');

    // Close button
    document.getElementById('prompt-close-btn')?.addEventListener('click', () => this.hide());

    // Debounced input
    let debounceTimer: NodeJS.Timeout;
    this.textArea?.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const prompt = (e.target as HTMLTextAreaElement).value;
        const agent = this.getSelectedAgent();
        if (prompt.length > 0) {
          this.onEnhanceCallback(prompt, agent);
        }
      }, 500);
    });

    // Copy button
    document.getElementById('copy-btn')?.addEventListener('click', () => {
      this.handleCopy();
    });

    // Start session button
    document.getElementById('start-session-btn')?.addEventListener('click', () => {
      this.handleStartSession();
    });
  }

  show(): void {
    if (this.panelElement) {
      this.panelElement.style.display = 'block';
      this.isVisible = true;
      this.textArea?.focus();
    }
  }

  hide(): void {
    if (this.panelElement) {
      this.panelElement.style.display = 'none';
      this.isVisible = false;
    }
  }

  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  updateKnowledgeCount(count: number): void {
    const countElement = document.getElementById('knowledge-count');
    if (countElement) {
      countElement.textContent = count.toString();
    }

    if (this.knowledgePreview) {
      this.knowledgePreview.style.display = count > 0 ? 'block' : 'none';
    }
  }

  private getSelectedAgent(): string {
    const selected = document.querySelector('input[name="agent"]:checked') as HTMLInputElement;
    return selected?.value || 'claude';
  }

  private handleCopy(): void {
    const prompt = this.textArea?.value || '';
    const agent = this.getSelectedAgent();

    // Send message to extension
    if (window.vscode) {
      window.vscode.postMessage({
        type: 'copyEnhancedPrompt',
        prompt,
        agent
      });
    }
  }

  private handleStartSession(): void {
    const prompt = this.textArea?.value || '';
    const agent = this.getSelectedAgent();

    // Send message to extension
    if (window.vscode) {
      window.vscode.postMessage({
        type: 'startSessionFromPrompt',
        prompt,
        agent
      });
    }

    this.hide();
  }
}
```

##### **`packages/core/src/domains/visualization/ui/AICompanionDot.ts`**
**Purpose**: Subtle tip system

```typescript
export class AICompanionDot {
  private dotElement: HTMLElement | null = null;
  private tipPopup: HTMLElement | null = null;
  private currentTip: any = null;

  initialize(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('AI companion container not found');
      return;
    }

    container.innerHTML = this.render();
    this.attachEventListeners();
  }

  private render(): string {
    return `
      <div class="ai-companion-dot" id="ai-companion-dot">
        <div class="dot-indicator" id="dot-indicator">💡</div>
        <div class="tip-popup" id="tip-popup" style="display:none;">
          <div class="tip-content" id="tip-content"></div>
          <div class="tip-actions">
            <button id="tip-dismiss" class="tip-btn">Dismiss</button>
            <button id="tip-no-show" class="tip-btn secondary">Don't show again</button>
          </div>
        </div>
      </div>
    `;
  }

  private attachEventListeners(): void {
    this.dotElement = document.getElementById('dot-indicator');
    this.tipPopup = document.getElementById('tip-popup');

    // Hover to expand
    this.dotElement?.addEventListener('mouseenter', () => {
      if (this.currentTip) {
        this.showPopup();
      }
    });

    this.tipPopup?.addEventListener('mouseleave', () => {
      this.hidePopup();
    });

    // Dismiss button
    document.getElementById('tip-dismiss')?.addEventListener('click', () => {
      this.hidePopup();
      this.currentTip = null;
    });

    // Don't show again button
    document.getElementById('tip-no-show')?.addEventListener('click', () => {
      if (this.currentTip && window.vscode) {
        window.vscode.postMessage({
          type: 'suppressTip',
          ruleId: this.currentTip.id
        });
      }
      this.hidePopup();
      this.currentTip = null;
    });
  }

  showTip(tip: { id: string; message: string; priority: string }): void {
    this.currentTip = tip;

    const contentElement = document.getElementById('tip-content');
    if (contentElement) {
      contentElement.textContent = tip.message;
    }

    // Add pulse animation based on priority
    if (this.dotElement) {
      this.dotElement.classList.remove('pulse-critical', 'pulse-helpful', 'pulse-info');
      this.dotElement.classList.add(`pulse-${tip.priority}`);
    }

    // Auto-show for critical tips
    if (tip.priority === 'critical') {
      setTimeout(() => this.showPopup(), 2000);
    }
  }

  private showPopup(): void {
    if (this.tipPopup) {
      this.tipPopup.style.display = 'block';
    }
  }

  private hidePopup(): void {
    if (this.tipPopup) {
      this.tipPopup.style.display = 'none';
    }
  }

  hideTip(): void {
    this.hidePopup();
    this.currentTip = null;

    if (this.dotElement) {
      this.dotElement.classList.remove('pulse-critical', 'pulse-helpful', 'pulse-info');
    }
  }
}
```

##### **`packages/core/src/domains/visualization/ui/ErrorRecoveryPanel.ts`**
**Purpose**: Error detection and recovery UI

```typescript
interface DetectedError {
  type: string;
  message: string;
  line?: number;
  file?: string;
}

export class ErrorRecoveryPanel {
  private panelElement: HTMLElement | null = null;

  initialize(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = this.renderHidden();
  }

  private renderHidden(): string {
    return `<div class="error-recovery-panel" id="error-recovery-panel" style="display:none;"></div>`;
  }

  showError(error: DetectedError, similarErrors: any[]): void {
    this.panelElement = document.getElementById('error-recovery-panel');
    if (!this.panelElement) return;

    this.panelElement.innerHTML = this.renderErrorUI(error, similarErrors);
    this.panelElement.style.display = 'block';
    this.attachErrorEventListeners();
  }

  private renderErrorUI(error: DetectedError, similarErrors: any[]): string {
    return `
      <div class="error-recovery-content">
        <div class="panel-header">
          <h2>🐛 AI Made a Mistake</h2>
          <button class="close-btn" id="error-close-btn">×</button>
        </div>

        <div class="error-details">
          <p>I see this error in your code:</p>
          <pre class="error-message">${error.message}</pre>
          ${error.file ? `<p class="error-file">File: ${error.file}${error.line ? `:${error.line}` : ''}</p>` : ''}
        </div>

        ${similarErrors.length > 0 ? `
          <div class="similar-errors">
            <p>💡 I found ${similarErrors.length} similar mistake${similarErrors.length > 1 ? 's' : ''} we fixed before:</p>
            <ul>
              ${similarErrors.map(e => `
                <li>
                  <label>
                    <input type="checkbox" checked data-learning-id="${e.id}">
                    ${e.name} (fixed ${e.occurrences} time${e.occurrences > 1 ? 's' : ''})
                  </label>
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}

        <div class="recovery-actions">
          <div class="action-group">
            <p>✅ I can help the AI avoid this next time</p>
            <button id="save-learning-btn" class="primary-btn">Save as "Mistake to Avoid"</button>
            <button id="skip-learning-btn" class="secondary-btn">Not now</button>
          </div>

          <div class="action-group">
            <p>🔧 Want me to suggest a fix?</p>
            <button id="ask-fix-btn" class="primary-btn">Ask AI to Fix It</button>
            <button id="self-fix-btn" class="secondary-btn">I'll fix it myself</button>
          </div>
        </div>
      </div>
    `;
  }

  private attachErrorEventListeners(): void {
    document.getElementById('error-close-btn')?.addEventListener('click', () => this.hide());

    document.getElementById('save-learning-btn')?.addEventListener('click', () => {
      const selectedLearnings = this.getSelectedLearnings();
      if (window.vscode) {
        window.vscode.postMessage({
          type: 'saveErrorLearning',
          learnings: selectedLearnings
        });
      }
      this.hide();
    });

    document.getElementById('skip-learning-btn')?.addEventListener('click', () => {
      this.hide();
    });

    document.getElementById('ask-fix-btn')?.addEventListener('click', () => {
      if (window.vscode) {
        window.vscode.postMessage({
          type: 'requestErrorFix'
        });
      }
      this.hide();
    });

    document.getElementById('self-fix-btn')?.addEventListener('click', () => {
      this.hide();
    });
  }

  private getSelectedLearnings(): string[] {
    const checkboxes = document.querySelectorAll('input[data-learning-id]:checked');
    return Array.from(checkboxes).map(cb => (cb as HTMLInputElement).dataset.learningId || '');
  }

  hide(): void {
    if (this.panelElement) {
      this.panelElement.style.display = 'none';
    }
  }
}
```

---

#### **3. Styles**

##### **`packages/core/src/domains/visualization/styles/components/prompt-panels.css`**
**Purpose**: Styles for quick prompt and error recovery panels

```css
/* Quick Prompt Panel */
.quick-prompt-panel {
  position: fixed;
  right: 20px;
  top: 80px;
  width: 500px;
  max-height: 600px;
  background: var(--vscode-editor-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 9999;
  animation: slideInRight 0.3s ease-out;
  overflow: hidden;
}

@keyframes slideInRight {
  from {
    transform: translateX(520px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.panel-header {
  background: var(--vscode-editorGroupHeader-tabsBackground);
  padding: 12px 16px;
  border-bottom: 1px solid var(--vscode-panel-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--vscode-foreground);
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--vscode-foreground);
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.close-btn:hover {
  opacity: 1;
}

.panel-content {
  padding: 16px;
  max-height: 500px;
  overflow-y: auto;
}

.panel-content label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--vscode-foreground);
}

.panel-content textarea {
  width: 100%;
  padding: 10px;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  font-family: var(--vscode-font-family);
  font-size: 14px;
  resize: vertical;
  min-height: 80px;
}

.panel-content textarea:focus {
  outline: none;
  border-color: var(--vscode-focusBorder);
}

.knowledge-preview {
  margin: 16px 0;
  padding: 12px;
  background: var(--vscode-textBlockQuote-background);
  border-left: 3px solid var(--vscode-textBlockQuote-border);
  border-radius: 4px;
  font-size: 13px;
}

.knowledge-preview #knowledge-count {
  font-weight: 600;
  color: var(--vscode-textLink-foreground);
}

.knowledge-actions {
  margin-top: 8px;
}

.knowledge-actions a {
  color: var(--vscode-textLink-foreground);
  text-decoration: none;
  cursor: pointer;
}

.knowledge-actions a:hover {
  text-decoration: underline;
}

.agent-selection {
  margin: 16px 0;
}

.radio-group {
  display: flex;
  gap: 16px;
  margin-top: 8px;
}

.radio-group label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-weight: normal;
}

.radio-group input[type="radio"] {
  cursor: pointer;
}

.actions {
  margin-top: 20px;
  display: flex;
  gap: 12px;
}

.primary-btn {
  flex: 1;
  padding: 10px 16px;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.primary-btn:hover {
  background: var(--vscode-button-hoverBackground);
}

.secondary-btn {
  flex: 1;
  padding: 10px 16px;
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.secondary-btn:hover {
  background: var(--vscode-button-secondaryHoverBackground);
}

/* AI Companion Dot */
.ai-companion-dot {
  position: relative;
  display: inline-block;
}

.dot-indicator {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 20px;
  transition: transform 0.2s;
}

.dot-indicator:hover {
  transform: scale(1.1);
}

.dot-indicator.pulse-critical {
  animation: pulseCritical 1.5s infinite;
}

.dot-indicator.pulse-helpful {
  animation: pulseHelpful 2s infinite;
}

.dot-indicator.pulse-info {
  animation: pulseInfo 2.5s infinite;
}

@keyframes pulseCritical {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.7; }
}

@keyframes pulseHelpful {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
}

@keyframes pulseInfo {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.9; }
}

.tip-popup {
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 12px;
  min-width: 300px;
  max-width: 400px;
  background: var(--vscode-editorHoverWidget-background);
  border: 1px solid var(--vscode-editorHoverWidget-border);
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  z-index: 10000;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.tip-content {
  margin-bottom: 12px;
  line-height: 1.5;
  color: var(--vscode-foreground);
}

.tip-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.tip-btn {
  padding: 6px 12px;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.tip-btn:hover {
  background: var(--vscode-button-hoverBackground);
}

.tip-btn.secondary {
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
}

.tip-btn.secondary:hover {
  background: var(--vscode-button-secondaryHoverBackground);
}

/* Error Recovery Panel */
.error-recovery-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  max-width: 90vw;
  max-height: 80vh;
  background: var(--vscode-editor-background);
  border: 2px solid var(--vscode-errorForeground);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  z-index: 10001;
  animation: zoomIn 0.3s ease-out;
}

@keyframes zoomIn {
  from {
    transform: translate(-50%, -50%) scale(0.9);
    opacity: 0;
  }
  to {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
}

.error-recovery-content {
  padding: 0;
  max-height: 80vh;
  overflow-y: auto;
}

.error-details {
  padding: 16px;
  border-bottom: 1px solid var(--vscode-panel-border);
}

.error-message {
  margin: 12px 0;
  padding: 12px;
  background: var(--vscode-textCodeBlock-background);
  border-radius: 4px;
  font-family: var(--vscode-editor-font-family);
  font-size: 13px;
  color: var(--vscode-errorForeground);
  white-space: pre-wrap;
  overflow-x: auto;
}

.error-file {
  margin: 8px 0 0 0;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

.similar-errors {
  padding: 16px;
  border-bottom: 1px solid var(--vscode-panel-border);
}

.similar-errors ul {
  list-style: none;
  padding: 0;
  margin: 12px 0 0 0;
}

.similar-errors li {
  margin: 8px 0;
}

.similar-errors label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.similar-errors label:hover {
  background: var(--vscode-list-hoverBackground);
}

.recovery-actions {
  padding: 16px;
}

.action-group {
  margin-bottom: 20px;
}

.action-group:last-child {
  margin-bottom: 0;
}

.action-group p {
  margin: 0 0 8px 0;
  font-weight: 500;
}

.action-group .actions {
  margin-top: 8px;
}
```

##### **Update `packages/core/src/domains/visualization/styles/timeline.css`**
Add import at the top:
```css
@import './components/prompt-panels.css';
```

##### **Update `packages/core/src/domains/visualization/styles/components/stats.css`**
Add button for quick prompt panel in stats bar:
```css
/* Add to existing stats-bar styles */
#stats-bar .quick-prompt-trigger {
  color: var(--vscode-button-foreground);
  background: var(--vscode-button-background);
  padding: 0.25rem 0.75rem;
  border-radius: 3px;
  cursor: pointer;
  font-size: 0.9em;
  font-weight: 500;
  border: 1px solid transparent;
  transition: all 0.2s;
  margin-left: auto;
}

#stats-bar .quick-prompt-trigger:hover {
  background: var(--vscode-button-hoverBackground);
  border-color: var(--vscode-focusBorder);
}
```

---

### **Files to Modify**

#### **1. `packages/core/src/domains/visualization/templates/timeline.html`**
Add containers for new UI components:
```html
<!-- After stats-bar, before timeline-container -->
<div id="quick-prompt-container"></div>
<div id="ai-companion-container"></div>
<div id="error-recovery-container"></div>
```

Modify stats-bar to include quick prompt button:
```html
<div id="stats-bar">
  <div class="stats-items">
    <!-- existing stats items -->
  </div>
  <div class="filters-trigger" id="filters-trigger">Control Center</div>
  <div class="quick-prompt-trigger" id="quick-prompt-trigger">🧠 New AI Prompt</div>
  <div id="ai-companion-slot"></div>
</div>
```

#### **2. `packages/core/src/domains/visualization/webview/SimpleTimelineApp.ts`**
Initialize new controllers:
```typescript
import { QuickPromptPanel } from '../ui/QuickPromptPanel';
import { AICompanionDot } from '../ui/AICompanionDot';
import { ErrorRecoveryPanel } from '../ui/ErrorRecoveryPanel';

export class SimpleTimelineApp {
  private quickPromptPanel: QuickPromptPanel;
  private aiCompanion: AICompanionDot;
  private errorRecovery: ErrorRecoveryPanel;

  constructor(containerId: string) {
    // ... existing code

    // Initialize new UI components
    this.quickPromptPanel = new QuickPromptPanel((prompt, agent) => {
      this.handlePromptEnhancement(prompt, agent);
    });

    this.aiCompanion = new AICompanionDot();
    this.errorRecovery = new ErrorRecoveryPanel();
  }

  async initialize(initialData?: any) {
    // ... existing code

    // Initialize new panels
    this.quickPromptPanel.initialize('quick-prompt-container');
    this.aiCompanion.initialize('ai-companion-slot');
    this.errorRecovery.initialize('error-recovery-container');

    // Attach quick prompt trigger
    document.getElementById('quick-prompt-trigger')?.addEventListener('click', () => {
      this.quickPromptPanel.toggle();
    });
  }

  private handlePromptEnhancement(prompt: string, agent: string): void {
    // Send to extension for enhancement
    if (window.vscode) {
      window.vscode.postMessage({
        type: 'enhancePrompt',
        prompt,
        agent
      });
    }
  }

  // Handle messages from extension
  private handleExtensionMessage(message: any): void {
    // ... existing message handling

    switch (message.type) {
      case 'promptEnhanced':
        this.quickPromptPanel.updateKnowledgeCount(message.knowledgeCount);
        break;

      case 'showTip':
        this.aiCompanion.showTip(message.tip);
        break;

      case 'showErrorRecovery':
        this.errorRecovery.showError(message.error, message.similarErrors);
        break;
    }
  }
}
```

#### **3. `packages/vscode/src/providers/timeline-provider-webpack.ts`**
Add message handlers:
```typescript
private async handleMessage(message: any): Promise<void> {
  try {
    switch (message.type) {
      // ... existing cases

      case 'enhancePrompt':
        await this.handlePromptEnhancement(message);
        break;

      case 'copyEnhancedPrompt':
        await this.handleCopyPrompt(message);
        break;

      case 'startSessionFromPrompt':
        await this.handleStartSession(message);
        break;

      case 'suppressTip':
        await this.handleSuppressTip(message);
        break;

      case 'saveErrorLearning':
        await this.handleSaveErrorLearning(message);
        break;

      case 'requestErrorFix':
        await this.handleRequestErrorFix(message);
        break;
    }
  } catch (error) {
    this.sendMessage({ type: 'error', message: `${error}` });
  }
}

private async handlePromptEnhancement(message: any): Promise<void> {
  const { prompt, agent } = message;

  // Build enhancement context
  const context: EnhancementContext = {
    currentFile: vscode.window.activeTextEditor?.document.fileName,
    targetAgent: agent,
    // Add more context as needed
  };

  // Enhance using PromptEnhancer
  const enhancer = new PromptEnhancer();
  const result = await enhancer.enhance(prompt, context);

  // Send back to webview
  this.sendMessage({
    type: 'promptEnhanced',
    enhanced: result.enhanced,
    knowledgeCount: result.itemsUsed
  });
}

private async handleCopyPrompt(message: any): Promise<void> {
  const { prompt, agent } = message;

  // Enhance first
  const enhancer = new PromptEnhancer();
  const context: EnhancementContext = {
    currentFile: vscode.window.activeTextEditor?.document.fileName,
    targetAgent: agent
  };
  const result = await enhancer.enhance(prompt, context);

  // Copy to clipboard
  await vscode.env.clipboard.writeText(result.enhanced);

  // Show notification
  vscode.window.showInformationMessage('✓ Enhanced prompt copied to clipboard');
}

private async handleStartSession(message: any): Promise<void> {
  const { prompt, agent } = message;

  // Enhance prompt
  const enhancer = new PromptEnhancer();
  const context: EnhancementContext = {
    currentFile: vscode.window.activeTextEditor?.document.fileName,
    targetAgent: agent
  };
  const result = await enhancer.enhance(prompt, context);

  // Start session
  await this.sessionManager.startSession(result.enhanced, agent);

  // Copy to clipboard
  await vscode.env.clipboard.writeText(result.enhanced);

  // Notify user
  vscode.window.showInformationMessage(
    '✓ Session started! Agent Brain is tracking your work.',
    'Show Status'
  ).then(choice => {
    if (choice === 'Show Status') {
      vscode.commands.executeCommand('agentBrain.showStatus');
    }
  });
}
```

#### **4. `packages/vscode/src/extension.ts`**
Initialize GuidanceEngine and start context tracking:
```typescript
import { GuidanceEngine } from '@agent-brain/core/domains/guidance';

let guidanceEngine: GuidanceEngine;

export async function activate(context: vscode.ExtensionContext) {
  // ... existing initialization

  // Initialize GuidanceEngine
  guidanceEngine = new GuidanceEngine();

  // Start periodic context checking (every 5 seconds)
  const contextTimer = setInterval(() => {
    updateGuidanceContext();

    const userContext = guidanceEngine.getCurrentContext();
    const tip = guidanceEngine.selectTip(userContext);

    if (tip && timelineProvider) {
      timelineProvider.sendTip(tip);
      guidanceEngine.recordTipShown(tip.id);
    }
  }, 5000);

  context.subscriptions.push({
    dispose: () => clearInterval(contextTimer)
  });
}

function updateGuidanceContext(): void {
  const editor = vscode.window.activeTextEditor;
  const idleTime = Date.now() - (guidanceEngine.getCurrentContext().lastActionTimestamp?.getTime() || Date.now());

  guidanceEngine.updateContext({
    currentActivity: determineCurrentActivity(),
    idleTime,
    // Update other context properties as needed
  });
}

function determineCurrentActivity(): string {
  // Logic to determine what user is doing
  // This is simplified - implement based on actual tracking
  if (vscode.window.activeTextEditor) {
    return 'working';
  }
  return 'idle';
}
```

---

### **Phase 1 Testing Checklist**

After implementation, verify:
- [ ] **GuidanceEngine** initializes and selects appropriate tips
- [ ] **Quick Prompt Panel** opens from stats bar button
- [ ] Typing in prompt textarea triggers enhancement (debounced)
- [ ] Knowledge count updates after enhancement
- [ ] Agent selection radio buttons work
- [ ] "Copy Enhanced Prompt" copies to clipboard and shows notification
- [ ] "Start Working & Track It" creates session and copies prompt
- [ ] **AI Companion Dot** shows pulse animation
- [ ] Hovering dot shows tip popup
- [ ] "Dismiss" hides tip
- [ ] "Don't show again" suppresses future tips
- [ ] **Error Recovery Panel** appears when error detected
- [ ] Similar errors are shown with checkboxes
- [ ] "Save as Mistake to Avoid" creates learning
- [ ] Panels have proper z-index (don't overlap incorrectly)
- [ ] Animations are smooth (slide-in, fade, pulse)

---

### **Phase 1 Checkpoint Document**

Create `PHASE_1_COMPLETE.md`:
```markdown
# Phase 1 Complete: AI Companion + Quick Enhancement

## Implementation Date
[Date completed]

## What Was Implemented
- ✅ GuidanceEngine with 5 initial rules (context detection + tip selection)
- ✅ Stage 1-2 enhancement (context injection + pattern expansion)
- ✅ QuickPromptPanel (simple single-screen UI)
- ✅ AICompanionDot (subtle tip system with pulse animations)
- ✅ ErrorRecoveryPanel (error detection and learning creation)
- ✅ PromptEnhancer facade coordinating stages

## Files Created (11 total)
### Core Domain (6)
1. packages/core/src/domains/guidance/GuidanceEngine.ts
2. packages/core/src/domains/guidance/types.ts
3. packages/core/src/domains/guidance/index.ts
4. packages/core/src/domains/enhancement/stages/Stage1_ContextInjector.ts
5. packages/core/src/domains/enhancement/stages/Stage2_PatternExpander.ts
6. packages/core/src/domains/enhancement/types.ts
7. packages/core/src/domains/enhancement/PromptEnhancer.ts

### Webview UI (3)
8. packages/core/src/domains/visualization/ui/QuickPromptPanel.ts
9. packages/core/src/domains/visualization/ui/AICompanionDot.ts
10. packages/core/src/domains/visualization/ui/ErrorRecoveryPanel.ts

### Styles (1)
11. packages/core/src/domains/visualization/styles/components/prompt-panels.css

## Files Modified (5)
1. packages/core/src/domains/visualization/templates/timeline.html (added containers)
2. packages/core/src/domains/visualization/styles/timeline.css (added import)
3. packages/core/src/domains/visualization/styles/components/stats.css (added trigger button)
4. packages/core/src/domains/visualization/webview/SimpleTimelineApp.ts (initialized controllers)
5. packages/vscode/src/providers/timeline-provider-webpack.ts (added message handlers)
6. packages/vscode/src/extension.ts (initialized guidance engine)

## Enhancement Stages Implemented
- ✅ **Stage 1**: Pure context injection (no intelligence)
- ✅ **Stage 2**: Pattern-based expansion + missing spec detection
- ⬜ Stage 3: Structural templates (Next: Phase 2)

## User Experience Delivered
1. **First-time users** see welcome tip immediately
2. **Prompt building** is simple (one screen, no wizard complexity)
3. **Knowledge enhancement** happens transparently (shows count)
4. **Error recovery** offers help proactively
5. **Guidance tips** are subtle (pulsing dot, not intrusive banner)

## Known Issues / Tech Debt
- None blocking - all features working as designed

## Next Phase: Phase 2 - Knowledge Visibility
**Start Date**: [Planned]
**Key Deliverable**: Activity bar tree view with friendly names

### Next Steps
1. Create KnowledgeTreeProvider (VSCode TreeDataProvider)
2. Rename knowledge categories (ADRs → "Project Rules", etc.)
3. Implement Stage 3 enhancement (structural templates)
4. Create ComparisonView (side-by-side before/after)

### Resumption Guide (If Context Compaction Occurs)
If implementation is interrupted, resume by:
1. Reading this document (PHASE_1_COMPLETE.md)
2. Checking .agent-brain/implementation-state.json
3. Running Phase 1 testing checklist
4. If all pass, proceed to Phase 2 by reading PHASE_2_SPEC section in AGENT_BRAIN_UX_IMPLEMENTATION_PLAN.md
```

---

## 📋 PHASE 2: Knowledge Visibility (Days 4-6) - DETAILED SPEC

### **Objective**
Users see knowledge in friendly, jargon-free terms and understand exactly what context the AI will use.

### **Key User Stories**
1. As a novice, I want to see my "Project Rules" instead of "ADRs"
2. As a user, I want to control which knowledge items are included in my prompts
3. As a developer, I want to compare original vs. enhanced prompts side-by-side
4. As a team member, I want to see the health status of our knowledge base

### **Key Deliverables**

#### 1. Knowledge Tree View (Activity Bar Sidebar)
**Visual Design:**
```
AGENT BRAIN (activity bar icon: 🧠)
├── 📐 Project Rules (3)
│   ├── ☑ ADR-001: Use microservices architecture
│   ├── ☑ ADR-002: PostgreSQL for primary database
│   └── ☐ ADR-003: Kubernetes orchestration
├── 📋 Code Templates (5)
│   ├── ☑ Repository Pattern
│   ├── ☑ Error Handling Standards
│   ├── ☐ API Response Format
│   ├── ☐ Test Structure Convention
│   └── ☐ Logging Best Practices
├── ⚠️ Mistakes to Avoid (2)
│   ├── ☑ Null pointer on user.profile
│   └── ☑ Missing error boundary in React
└── 🎯 Step-by-Step Guides (0)
    └── (empty - Phase 4)
```

**Features:**
- **Checkboxes:** Control inclusion in prompts (checked = included)
- **Counts:** Show total items per category
- **Icons:** Semantic emojis for quick scanning
- **Hover:** Show full details in tooltip
- **Context menu:** Edit, Delete, Disable, View on Timeline
- **Collapse/expand:** Remember state per repository

#### 2. Friendly Category Names
**Renaming Map:**
```typescript
// Before (jargon)          // After (friendly)
ADRs                    →   Project Rules
Patterns                →   Code Templates
Learnings               →   Mistakes to Avoid
Golden Paths            →   Step-by-Step Guides (Phase 4)
```

**Rationale:**
- "Project Rules" = decisions that guide the project
- "Code Templates" = reusable patterns for common tasks
- "Mistakes to Avoid" = learnings from past errors
- "Step-by-Step Guides" = procedural workflows

#### 3. Stage 3: Structural Templates
**Template Detection:**
```typescript
// Detect intent from prompt
const intentPatterns = {
  bug: /\b(fix|bug|error|issue|broken|crash|fail)\b/i,
  feature: /\b(add|create|implement|new|feature|build)\b/i,
  refactor: /\b(refactor|clean|improve|reorganize|restructure)\b/i,
  test: /\b(test|spec|coverage|validate)\b/i,
  docs: /\b(document|readme|comment|explain)\b/i,
  performance: /\b(optimize|performance|speed|slow|fast)\b/i
};
```

**Templates:**
```typescript
// Bug Fix Template
{
  sections: [
    '## Bug Fix',
    'Symptom: [What is broken?]',
    'Expected: [What should happen?]',
    'Root Cause: [Why is it happening?]',
    'Fix: [How to resolve?]',
    'Tests: [How to verify?]'
  ]
}

// Feature Template
{
  sections: [
    '## New Feature',
    'User Story: [Who needs this and why?]',
    'Acceptance Criteria: [What defines done?]',
    'Implementation: [How to build?]',
    'Edge Cases: [What could go wrong?]',
    'Tests: [How to verify?]'
  ]
}

// Refactor Template
{
  sections: [
    '## Refactoring',
    'Current State: [What exists now?]',
    'Problems: [What needs improvement?]',
    'Proposed: [What should it become?]',
    'Migration: [How to transition?]',
    'Backward Compatibility: [What breaks?]'
  ]
}
```

**Application Logic:**
```typescript
class Stage3_StructuredEnhancer extends Stage2_PatternExpander {
  enhance(prompt: string, context: EnhancementContext): string {
    // Apply Stage 2 first (pattern expansion)
    let enhanced = super.enhance(prompt, context);

    // Detect intent
    const intent = this.detectIntent(prompt);

    if (intent) {
      const template = this.getTemplate(intent);
      enhanced = this.applyTemplate(enhanced, template, context);
    }

    return enhanced;
  }
}
```

#### 4. Comparison View (Before/After)
**Visual Design:**
```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Prompt Enhancement Preview                               │
├──────────────────────┬──────────────────────────────────────┤
│ ORIGINAL             │ ENHANCED                             │
├──────────────────────┼──────────────────────────────────────┤
│ Fix the login bug    │ ## Bug Fix                           │
│                      │ Fix the login bug                    │
│                      │                                      │
│                      │ ### Project Rules Applied            │
│                      │ ✓ ADR-001: Use JWT authentication    │
│                      │ ✓ Pattern: Error Handling Standards  │
│                      │                                      │
│                      │ ### Context                          │
│                      │ Current file: src/auth/login.ts      │
│                      │ Recent error: "Cannot read property  │
│                      │ 'token' of undefined"                │
│                      │                                      │
│                      │ Symptom: Users can't log in          │
│                      │ Expected: Login succeeds with JWT    │
│                      │ Root Cause: [To investigate]         │
│                      │ Fix: [To implement]                  │
│                      │ Tests: [To verify]                   │
├──────────────────────┴──────────────────────────────────────┤
│ Knowledge Used: 2 rules, 1 template                         │
│ Enhancement Level: Basic (Stage 3)                          │
│ [Copy Enhanced] [Use This] [Cancel]                         │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Side-by-side diff view
- Syntax highlighting for markdown
- Collapsible sections for added context
- Summary of knowledge items used
- Enhancement level indicator

#### 5. Knowledge Health Status Cards
**Visual Design:**
```
┌─────────────────────────────────────────────────────────────┐
│ Knowledge Base Health                                        │
├─────────────────────────────────────────────────────────────┤
│ 📐 Project Rules        [████████░░] 80% Complete          │
│    3 active, 1 deprecated, 0 superseded                     │
│    Last updated: 2 days ago                                 │
│                                                              │
│ 📋 Code Templates       [████░░░░░░] 40% Coverage          │
│    5 patterns defined, 3 actively used                      │
│    Recommended: Add API response template                   │
│                                                              │
│ ⚠️ Mistakes to Avoid   [██████████] 100% Actionable       │
│    2 learnings captured, both verified                      │
│    No recent errors                                         │
│                                                              │
│ 🎯 Step-by-Step Guides [░░░░░░░░░░] 0% (Phase 4)          │
│    Coming soon: Golden Path workflows                       │
└─────────────────────────────────────────────────────────────┘
```

**Metrics:**
- **Completeness:** % of categories populated
- **Coverage:** % of code patterns documented
- **Actionability:** % of learnings with prevention rules
- **Recency:** Last update timestamp
- **Recommendations:** Suggested next steps

---

### **Files to Create**

#### **1. Core Domain Files**

##### **`packages/core/src/domains/knowledge/ProjectProfileManager.ts`**
**Purpose:** Track which knowledge items are enabled/disabled per project

```typescript
interface KnowledgeItem {
  id: string;
  type: 'adr' | 'pattern' | 'learning' | 'golden-path';
  enabled: boolean;
  lastUsed?: Date;
  useCount: number;
}

interface ProjectProfile {
  projectPath: string;
  knowledgeItems: Map<string, KnowledgeItem>;
  lastModified: Date;
}

export class ProjectProfileManager {
  private profiles: Map<string, ProjectProfile> = new Map();
  private storagePath: string;

  constructor(storagePath: string);

  async loadProfile(projectPath: string): Promise<ProjectProfile>;
  async saveProfile(projectPath: string): Promise<void>;

  enableItem(projectPath: string, itemId: string): void;
  disableItem(projectPath: string, itemId: string): void;
  isItemEnabled(projectPath: string, itemId: string): boolean;

  recordItemUsage(projectPath: string, itemId: string): void;
  getEnabledItems(projectPath: string, type?: string): KnowledgeItem[];

  getStatistics(projectPath: string): {
    totalItems: number;
    enabledItems: number;
    recentlyUsed: KnowledgeItem[];
  };
}
```

##### **`packages/core/src/domains/enhancement/stages/Stage3_StructuredEnhancer.ts`**
**Purpose:** Apply structural templates based on detected intent

```typescript
interface EnhancementTemplate {
  name: string;
  sections: string[];
  placeholders: Record<string, string>;
}

type IntentType = 'bug' | 'feature' | 'refactor' | 'test' | 'docs' | 'performance';

export class Stage3_StructuredEnhancer extends Stage2_PatternExpander {
  private templates: Map<IntentType, EnhancementTemplate>;

  constructor();

  enhance(prompt: string, context: EnhancementContext): string {
    // Apply Stage 2 enhancements first
    let enhanced = super.enhance(prompt, context);

    // Detect intent
    const intent = this.detectIntent(prompt);

    if (intent) {
      const template = this.getTemplate(intent);
      enhanced = this.applyTemplate(enhanced, template, context);
    }

    return enhanced;
  }

  private detectIntent(prompt: string): IntentType | null;
  private getTemplate(intent: IntentType): EnhancementTemplate;
  private applyTemplate(prompt: string, template: EnhancementTemplate, context: EnhancementContext): string;

  private initializeTemplates(): void {
    // Load built-in templates
    this.templates.set('bug', this.createBugTemplate());
    this.templates.set('feature', this.createFeatureTemplate());
    this.templates.set('refactor', this.createRefactorTemplate());
    // ... others
  }
}
```

##### **`packages/core/src/domains/knowledge/KnowledgeHealthMetrics.ts`**
**Purpose:** Calculate knowledge base health statistics

```typescript
interface HealthMetrics {
  completeness: number;  // 0-1
  coverage: number;      // 0-1
  actionability: number; // 0-1
  recency: Date;
  recommendations: string[];
}

export class KnowledgeHealthMetrics {
  constructor(
    private adrSystem: ADRSystem,
    private patternSystem: PatternSystem,
    private learningSystem: LearningSystem
  );

  async calculateMetrics(): Promise<HealthMetrics>;

  private calculateCompleteness(): number;
  private calculateCoverage(): number;
  private calculateActionability(): number;
  private generateRecommendations(): string[];
}
```

---

#### **2. VSCode Extension Files**

##### **`packages/vscode/src/providers/KnowledgeTreeProvider.ts`**
**Purpose:** VSCode TreeDataProvider for knowledge sidebar

```typescript
import * as vscode from 'vscode';

interface KnowledgeTreeItem extends vscode.TreeItem {
  itemId: string;
  itemType: 'category' | 'adr' | 'pattern' | 'learning';
  enabled: boolean;
  data?: any;
}

export class KnowledgeTreeProvider implements vscode.TreeDataProvider<KnowledgeTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<KnowledgeTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(
    private context: vscode.ExtensionContext,
    private profileManager: ProjectProfileManager,
    private adrSystem: ADRSystem,
    private patternSystem: PatternSystem,
    private learningSystem: LearningSystem
  );

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: KnowledgeTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: KnowledgeTreeItem): Promise<KnowledgeTreeItem[]> {
    if (!element) {
      // Root level - show categories
      return this.getRootCategories();
    }

    // Child level - show items in category
    return this.getCategoryItems(element);
  }

  private async getRootCategories(): Promise<KnowledgeTreeItem[]> {
    const projectPath = this.getProjectPath();

    return [
      {
        label: '📐 Project Rules',
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
        itemType: 'category',
        itemId: 'adrs',
        contextValue: 'category'
      },
      {
        label: '📋 Code Templates',
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
        itemType: 'category',
        itemId: 'patterns',
        contextValue: 'category'
      },
      {
        label: '⚠️ Mistakes to Avoid',
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
        itemType: 'category',
        itemId: 'learnings',
        contextValue: 'category'
      },
      {
        label: '🎯 Step-by-Step Guides',
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        itemType: 'category',
        itemId: 'golden-paths',
        contextValue: 'category',
        description: '(Coming in Phase 4)'
      }
    ];
  }

  private async getCategoryItems(category: KnowledgeTreeItem): Promise<KnowledgeTreeItem[]> {
    const projectPath = this.getProjectPath();

    switch (category.itemId) {
      case 'adrs':
        return this.getADRItems(projectPath);
      case 'patterns':
        return this.getPatternItems(projectPath);
      case 'learnings':
        return this.getLearningItems(projectPath);
      case 'golden-paths':
        return []; // Phase 4
      default:
        return [];
    }
  }

  private async getADRItems(projectPath: string): Promise<KnowledgeTreeItem[]> {
    const adrs = await this.adrSystem.getADRs({ status: ['accepted', 'proposed'] });

    return adrs.map(adr => {
      const enabled = this.profileManager.isItemEnabled(projectPath, adr.id);

      return {
        label: `${enabled ? '☑' : '☐'} ADR-${String(adr.number).padStart(3, '0')}: ${adr.title}`,
        itemId: adr.id,
        itemType: 'adr',
        enabled,
        data: adr,
        contextValue: 'adr-item',
        tooltip: `${adr.context}\n\nDecision: ${adr.decision}`,
        command: {
          command: 'agentBrain.toggleKnowledgeItem',
          title: 'Toggle Item',
          arguments: [adr.id, 'adr']
        }
      };
    });
  }

  private getProjectPath(): string {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  }
}
```

##### **`packages/vscode/src/views/KnowledgeHealthView.ts`**
**Purpose:** Webview panel showing knowledge health status

```typescript
export class KnowledgeHealthView {
  private panel: vscode.WebviewPanel | undefined;

  constructor(
    private context: vscode.ExtensionContext,
    private healthMetrics: KnowledgeHealthMetrics
  );

  async show(): Promise<void> {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'agentBrain.knowledgeHealth',
      'Knowledge Base Health',
      vscode.ViewColumn.Two,
      { enableScripts: true }
    );

    this.panel.webview.html = await this.getHtmlContent();
    this.panel.onDidDispose(() => { this.panel = undefined; });
  }

  private async getHtmlContent(): Promise<string> {
    const metrics = await this.healthMetrics.calculateMetrics();

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          /* Health status card styles */
        </style>
      </head>
      <body>
        <h1>Knowledge Base Health</h1>
        ${this.renderMetricsCards(metrics)}
      </body>
      </html>
    `;
  }

  private renderMetricsCards(metrics: HealthMetrics): string {
    // Render status cards HTML
  }
}
```

---

#### **3. Webview UI Files**

##### **`packages/core/src/domains/visualization/ui/ComparisonView.ts`**
**Purpose:** Show before/after prompt comparison

```typescript
export class ComparisonView {
  private container: HTMLElement | null = null;

  initialize(containerId: string): void;

  show(original: string, enhanced: string, metadata: {
    itemsUsed: number;
    stage: number;
    knowledgeItems: Array<{ type: string; name: string }>;
  }): void;

  hide(): void;

  private render(original: string, enhanced: string, metadata: any): string {
    return `
      <div class="comparison-view">
        <div class="comparison-header">
          <h2>📊 Prompt Enhancement Preview</h2>
          <button class="close-btn">×</button>
        </div>

        <div class="comparison-columns">
          <div class="comparison-column original">
            <h3>ORIGINAL</h3>
            <pre>${this.escapeHtml(original)}</pre>
          </div>

          <div class="comparison-column enhanced">
            <h3>ENHANCED</h3>
            <div class="enhanced-content">
              ${this.renderMarkdown(enhanced)}
            </div>
          </div>
        </div>

        <div class="comparison-footer">
          <div class="metadata">
            Knowledge Used: ${metadata.itemsUsed} items
            • Enhancement Level: Stage ${metadata.stage}
          </div>
          <div class="actions">
            <button class="primary-btn" id="use-enhanced">Use This</button>
            <button class="secondary-btn" id="copy-enhanced">Copy Enhanced</button>
            <button class="secondary-btn" id="cancel-comparison">Cancel</button>
          </div>
        </div>
      </div>
    `;
  }
}
```

---

### **Files to Modify**

#### **1. `packages/vscode/package.json`**
Add activity bar view container and tree view:

```json
{
  "contributes": {
    "viewsContainers": {
      "activitybar": [
        {
          "id": "agentBrain",
          "title": "Agent Brain",
          "icon": "resources/icons/brain.svg"
        }
      ]
    },
    "views": {
      "agentBrain": [
        {
          "id": "agentBrain.knowledgeTree",
          "name": "Knowledge Base"
        }
      ]
    },
    "commands": [
      {
        "command": "agentBrain.refreshKnowledge",
        "title": "Refresh Knowledge",
        "icon": "$(refresh)"
      },
      {
        "command": "agentBrain.toggleKnowledgeItem",
        "title": "Toggle Knowledge Item"
      },
      {
        "command": "agentBrain.showKnowledgeHealth",
        "title": "Show Knowledge Health"
      },
      {
        "command": "agentBrain.addProjectRule",
        "title": "Add Project Rule"
      },
      {
        "command": "agentBrain.addCodeTemplate",
        "title": "Add Code Template"
      }
    ],
    "menus": {
      "view/title": [
        {
          "command": "agentBrain.refreshKnowledge",
          "when": "view == agentBrain.knowledgeTree",
          "group": "navigation"
        }
      ],
      "view/item/context": [
        {
          "command": "agentBrain.toggleKnowledgeItem",
          "when": "view == agentBrain.knowledgeTree && viewItem == adr-item"
        }
      ]
    }
  }
}
```

#### **2. `packages/vscode/src/extension.ts`**
Register tree provider:

```typescript
import { KnowledgeTreeProvider } from './providers/KnowledgeTreeProvider';
import { ProjectProfileManager } from '@agent-brain/core/domains/knowledge';

export async function activate(context: vscode.ExtensionContext) {
  // ... existing initialization

  // Phase 2: Knowledge Tree View
  const profileManager = new ProjectProfileManager(storagePath);
  const knowledgeTreeProvider = new KnowledgeTreeProvider(
    context,
    profileManager,
    adrSystem,
    patternSystem,
    learningSystem
  );

  vscode.window.registerTreeDataProvider('agentBrain.knowledgeTree', knowledgeTreeProvider);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('agentBrain.refreshKnowledge', () => {
      knowledgeTreeProvider.refresh();
    }),

    vscode.commands.registerCommand('agentBrain.toggleKnowledgeItem', (itemId: string, itemType: string) => {
      const projectPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
      const isEnabled = profileManager.isItemEnabled(projectPath, itemId);

      if (isEnabled) {
        profileManager.disableItem(projectPath, itemId);
      } else {
        profileManager.enableItem(projectPath, itemId);
      }

      knowledgeTreeProvider.refresh();
    })
  );
}
```

#### **3. `packages/core/src/domains/visualization/webview/SimpleTimelineApp.ts`**
Add comparison view integration:

```typescript
import { ComparisonView } from '../ui/ComparisonView';

export class SimpleTimelineApp {
  private comparisonView: ComparisonView;

  constructor(containerId: string) {
    // ... existing initialization
    this.comparisonView = new ComparisonView();
  }

  async initialize(initialData?: any) {
    // ... existing initialization
    this.comparisonView.initialize('comparison-container');
  }

  showEnhancementComparison(original: string, enhanced: string, metadata: any): void {
    this.comparisonView.show(original, enhanced, metadata);
  }
}
```

#### **4. `packages/core/src/domains/visualization/templates/timeline.html`**
Add comparison view container:

```html
<!-- After error-recovery-container -->
<div id="comparison-container"></div>
```

---

### **Phase 2 Testing Checklist**

After implementation, verify:

#### Knowledge Tree View
- [ ] Tree shows 4 categories with friendly names
- [ ] ADRs display as "ADR-001: Title" format
- [ ] Checkboxes toggle enabled/disabled state
- [ ] Counts show correct totals per category
- [ ] Hover tooltips show full item details
- [ ] Refresh command updates tree
- [ ] Tree state persists across VSCode restarts

#### Stage 3 Enhancement
- [ ] Bug prompts get bug fix template
- [ ] Feature prompts get feature template
- [ ] Refactor prompts get refactor template
- [ ] Template sections are properly formatted
- [ ] Templates include placeholders for user input
- [ ] Stage 3 extends Stage 2 (inherits pattern expansion)

#### Comparison View
- [ ] Side-by-side columns render correctly
- [ ] Original prompt shows unchanged
- [ ] Enhanced prompt shows markdown formatting
- [ ] Knowledge items used are listed
- [ ] "Use This" button applies enhancement
- [ ] "Copy Enhanced" copies to clipboard
- [ ] "Cancel" closes comparison view

#### Knowledge Health
- [ ] Health metrics calculate correctly
- [ ] Progress bars display percentages
- [ ] Recommendations are actionable
- [ ] Last updated timestamps are current
- [ ] Empty categories show 0% with helpful message

#### Integration
- [ ] ProfileManager persists enabled/disabled state
- [ ] Enhancement respects disabled knowledge items
- [ ] Tree refresh updates after knowledge changes
- [ ] Activity bar icon shows correctly

---

### **Phase 2 Checkpoint Document**

Create `PHASE_2_COMPLETE.md` after implementation with same structure as Phase 1.

---

**Phase 2 specification complete. Ready for implementation.**

---

## 📋 PHASE 3-5: Brief Overview

### **Phase 3: Customization + Learning** (Days 7-10)
- Project profile wizard
- Stage 4 enhancement (learning from success)
- Success celebration system

### **Phase 4: Golden Paths** (Days 11-14)
- GoldenPathSystem with workflows
- Stage 5 enhancement (agent-specific)
- Enhancement level progression

### **Phase 5: Advanced** (Days 15-18)
- Stages 6-8 (interactive, LLM-assisted, multi-version)
- PromptEnhancerFactory (auto-selects stage)
- Community sharing

---

## 🔄 Compaction Recovery Protocol

### **If Context Is Lost During Implementation**

1. **Read current phase checkpoint**: Open `PHASE_N_COMPLETE.md`
2. **Check state file**: Read `.agent-brain/implementation-state.json`
3. **Verify completed work**: Run testing checklist from checkpoint
4. **Resume at next phase**: Follow "Next Steps" section

### **State Tracking File**

Location: `.agent-brain/implementation-state.json`

Updated after each file completion:
```json
{
  "plan_version": "1.0",
  "currentPhase": 1,
  "currentFile": "QuickPromptPanel.ts",
  "fileProgress": "complete",
  "completedPhases": [],
  "enhancementStages": {
    "stage1": "complete",
    "stage2": "complete",
    "stage3": "not-started",
    "stage4": "not-started",
    "stage5": "not-started",
    "stage6": "not-started",
    "stage7": "not-started",
    "stage8": "not-started"
  },
  "features": {
    "guidanceEngine": "complete",
    "quickPromptPanel": "complete",
    "aiCompanionDot": "complete",
    "errorRecovery": "complete",
    "knowledgeTree": "not-started",
    "projectProfile": "not-started",
    "goldenPaths": "not-started",
    "successCelebration": "not-started"
  },
  "lastUpdated": "2025-10-07T...",
  "notes": "Phase 1 complete. All testing passed. Ready for Phase 2."
}
```

---

## ✅ Overall Success Criteria

### **Novice User Success** (Primary Goal)
- [ ] User understands what Agent Brain does within 30 seconds
- [ ] User creates first enhanced prompt in < 2 minutes
- [ ] User sees value (knowledge added) immediately
- [ ] User doesn't feel overwhelmed by complexity

### **Technical Success**
- [ ] All 8 enhancement stages implemented progressively
- [ ] No breaking changes to existing timeline
- [ ] Performance overhead < 100ms for enhancement
- [ ] Error recovery works for common mistakes

### **Learning Success**
- [ ] Users reach "Learning" skill level within 1 week
- [ ] Session success rate improves by 2x with enhancement
- [ ] Users voluntarily add knowledge (ADRs, patterns)
- [ ] Enhancement level progression is visible and motivating

---

## 📊 Progress Tracking

### **Phase Completion**
- ✅ Phase 1: Foundation (Days 1-3) - IN PROGRESS
- ⬜ Phase 2: Knowledge Visibility (Days 4-6)
- ⬜ Phase 3: Customization + Learning (Days 7-10)
- ⬜ Phase 4: Golden Paths (Days 11-14)
- ⬜ Phase 5: Advanced Enhancement (Days 15-18)

### **Enhancement Stages**
- ✅ Stage 1: Context injection - COMPLETE
- ✅ Stage 2: Pattern expansion - COMPLETE
- ⬜ Stage 3: Structural templates
- ⬜ Stage 4: Learning from success
- ⬜ Stage 5: Agent optimization
- ⬜ Stage 6: Interactive refinement
- ⬜ Stage 7: LLM-assisted
- ⬜ Stage 8: Multi-version

### **Features**
- ✅ Guidance engine - COMPLETE
- ✅ Quick prompt panel - COMPLETE
- ✅ AI companion dot - COMPLETE
- ✅ Error recovery - COMPLETE
- ⬜ Knowledge tree
- ⬜ Project profile
- ⬜ Success celebration
- ⬜ Golden paths
- ⬜ Enhancement progression

---

## 🎯 Document Purpose

This document serves as:
1. **Implementation guide** - Step-by-step instructions for each phase
2. **Progress tracker** - Checkboxes show what's done
3. **Compaction recovery** - Resume interrupted work
4. **Historical record** - Documents decisions and rationale

**Update this document after completing each phase.**

---

**Document Version**: 1.0
**Last Updated**: 2025-10-07
**Status**: Phase 1 in progress
