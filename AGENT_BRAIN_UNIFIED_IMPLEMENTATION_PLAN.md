# Agent Brain - Unified Implementation Plan
## Comprehensive Architectural Guidance for Multi-Session Development

**Version**: 1.0
**Last Updated**: 2025-10-07
**Architects**: Senior Architect (Human) + AI Architects (Collaborative Review)

---

## Executive Summary

This document represents the **unified vision** of multiple architectural perspectives, synthesizing:
- Original Agent Brain architecture (comprehensive platform vision)
- Pragmatic architecture review (focused MVP approach)
- Deep understanding of existing codebase (timeline, pathway testing, ADRs)

**Core Philosophy**: Build Agent Brain as a **focused wisdom layer** that enhances the existing timeline, not a complete platform replacement.

---

## Table of Contents

1. [Architectural Consensus](#architectural-consensus)
2. [Existing Codebase Assets](#existing-codebase-assets)
3. [Phase-by-Phase Implementation](#phase-by-phase-implementation)
4. [Detailed Code Organization](#detailed-code-organization)
5. [Data Flow Architecture](#data-flow-architecture)
6. [Integration Points](#integration-points)
7. [Migration Strategy](#migration-strategy)
8. [Testing Strategy](#testing-strategy)
9. [Risk Mitigation](#risk-mitigation)
10. [Success Metrics](#success-metrics)

---

## Architectural Consensus

### What Both Architects Agree On

✅ **Knowledge ≠ Events**
Patterns, ADRs, and learnings are **knowledge** that enhances prompts, not timeline events themselves.

✅ **Session-Based Model**
User prompt → agent work → completion = one logical event (not individual file changes).

✅ **Modular UI**
Separate panels for timeline (passive visualization) vs prompt (active interaction).

✅ **Incremental Delivery**
Ship working features weekly, not big-bang release.

✅ **Core Decoupling**
Pure domain logic in `@agent-brain/core` with zero VSCode dependencies.

✅ **Git Events Stay**
Timeline continues to show commit history—it's objective reality.

✅ **Start Simple**
Native VSCode UI (input boxes, quick picks) before complex webviews.

### Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| Remove IntelligenceProvider | Patterns aren't events; wrong abstraction |
| Sessions create timeline events | Prompt-based boundaries are semantically correct |
| No Microsoft XML initially | Complexity without proven value; ship v1 without it |
| No automatic compaction detection | Manual reinforcement is simpler; add later if needed |
| Keep pathway testing system | Already working, provides value, non-invasive |
| Keep full ADR implementation | Users love it, well-designed, integrates cleanly |
| Timeline stays in bottom panel | Established pattern, users know where to find it |
| Prompt UI uses native dialogs | Faster to ship, less code, better UX |

---

## Existing Codebase Assets

### What We Have (Keep & Enhance)

#### ✅ Timeline Visualization System
**Location**: `packages/core/src/domains/visualization/`

**Components**:
- D3TimelineRenderer - Excellent D3.js-based visualization
- TimelineRenderer - Event rendering with providerId support
- EventRenderer - Event details popup with impact analysis
- LegendRenderer - Dynamic legend with Git/Intelligence tabs
- InteractionHandler - Zoom and range selection
- FilterController - Event filtering by type and provider

**Quality**: High. Battle-tested, performant, well-architected.

**Actions**:
- Keep 100%
- Add `EventType.AGENT_SESSION` support
- Update visual theme for session events
- No breaking changes

#### ✅ Events Domain
**Location**: `packages/core/src/domains/events/`

**Components**:
- CanonicalEvent model - Universal event abstraction
- EventType enum - Extensible event taxonomy
- ImpactMetrics - Quantifiable change measurement
- EventSource - Multi-provider support

**Quality**: Excellent. Clean abstraction layer.

**Actions**:
- Add `AGENT_SESSION` to EventType enum
- Add optional `sessionMetadata` to CanonicalEvent
- Keep all existing types

#### ✅ Intelligence Domain (Refactor to Knowledge)
**Location**: `packages/core/src/domains/intelligence/`

**Components to Keep**:
- `core/patterns/PatternSystem` - Pattern engine (excellent)
- `core/patterns/PatternEngine` - Pattern matching logic
- `core/patterns/PatternValidator` - Pattern validation
- `core/adrs/ADRSystem` - Full ADR lifecycle
- `core/adrs/ADRStorage` - JSON persistence
- `core/learning/LearningSystem` - Test failure learning
- `core/learning/LearningStorage` - Pattern storage

**Components to Remove**:
- `providers/intelligence/IntelligenceProvider.ts` - Wrong abstraction
- Any event emission logic from patterns/ADRs

**Actions**:
- Move to `packages/core/src/domains/knowledge/`
- Remove timestamp generation (`new Date()` bug)
- Create KnowledgeSystem facade
- Keep all existing functionality

#### ✅ Pathway Testing System
**Location**: `packages/vscode/tests/pathways/`

**Components**:
- Pathway test framework
- Test reporters
- Integration with learning system

**Quality**: Innovative. Provides real value.

**Actions**:
- Keep 100%
- Integrate with session tracking (test runs become activities)
- No changes to core pathway logic

#### ✅ Logging System
**Location**: `packages/core/src/infrastructure/logging/`

**Components**:
- Pathway logging (LogPathway enum)
- Structured logging with categories
- Log levels and filtering

**Quality**: Excellent for debugging.

**Actions**:
- Add `LogPathway.SESSION` for session events
- Add `LogPathway.KNOWLEDGE` for knowledge retrieval
- Keep all existing pathways

#### ✅ Storage Architecture
**Location**: `.agent-brain/` directory

**Files**:
- `adrs.json` - ADR storage (working)
- `patterns.json` - Pattern definitions
- `learnings.json` - Test failure learnings

**Actions**:
- Add `sessions.json` - Session history
- Add `context.json` - Session context (rules, decisions)
- Keep all existing files

### What We Remove

❌ **IntelligenceProvider** (`packages/core/src/domains/providers/intelligence/`)
- Reason: Architectural mismatch
- Patterns/learnings aren't timeline events
- Creates confusing event duplication
- Timestamp bug (`new Date()` on every fetch)

❌ **Intelligence event emission logic**
- Remove from PatternSystem
- Remove from LearningSystem
- Remove from ADRSystem

### What We Add (New Components)

➕ **Session Management** (`packages/core/src/domains/sessions/`)
- SessionManager - Core session lifecycle
- Session model - Data structure
- SessionStorage - Persistence layer
- ActivityTracker - Activity accumulation

➕ **Knowledge System** (`packages/core/src/domains/knowledge/`)
- KnowledgeSystem - Facade for patterns/ADRs/learnings
- Knowledge model - Unified knowledge structure
- KnowledgeRetriever - Context-aware retrieval

➕ **Context Management** (`packages/core/src/domains/context/`)
- ContextManager - Rules and decisions
- ContextStorage - Persistence
- ContextReinforcer - Reinforcement generation

➕ **Prompt Enhancement** (`packages/vscode/src/prompt/`)
- PromptCommand - Command palette integration
- PromptEnhancer - Knowledge application
- Simple UI using VSCode native dialogs

---

## Phase-by-Phase Implementation

### Phase 0: Pre-Implementation Setup (Day 0)

#### Goals
- Document current architecture
- Set up new package structure
- Create integration test suite baseline

#### Tasks

**0.1 Documentation Baseline**
```bash
# Document current state
git tag v0.1.24-pre-agent-brain

# Create architecture snapshot
cp -r packages/core/src/domains docs/architecture-snapshot-v0.1.24/
```

**0.2 Package Structure Preparation**
```bash
# Create new domain directories (don't move files yet)
mkdir -p packages/core/src/domains/sessions
mkdir -p packages/core/src/domains/knowledge
mkdir -p packages/core/src/domains/context

# Create new VSCode directories
mkdir -p packages/vscode/src/prompt
mkdir -p packages/vscode/src/commands
mkdir -p packages/vscode/src/adapters
```

**0.3 Testing Infrastructure**
```typescript
// test/integration/baseline.test.ts
describe('Baseline Functionality (Pre-Agent-Brain)', () => {
  it('Timeline displays git events', async () => {
    // Capture current behavior
  });

  it('ADR system works', async () => {
    // Document current ADR flow
  });

  it('Pathway tests run', async () => {
    // Ensure pathway system baseline
  });
});
```

**Deliverables**:
- ✅ Architecture documentation snapshot
- ✅ New directory structure created
- ✅ Baseline tests passing
- ✅ Git tag created

---

### Phase 1: Core Session Management (Week 1, 5 days)

#### Day 1: Session Models and Types

**Goal**: Define pure data models with zero dependencies

**Files to Create**:
```typescript
// packages/core/src/domains/sessions/types.ts
export interface Session {
  id: string;
  prompt: string;           // User's original intent
  agentType: AgentType;     // Which AI assistant
  startTime: Date;
  endTime?: Date;
  status: SessionStatus;
  activities: Activity[];
}

export type AgentType = 'claude' | 'copilot' | 'cursor' | 'unknown';

export type SessionStatus =
  | 'active'       // Currently running
  | 'completed'    // Finalized successfully
  | 'abandoned';   // User never finished

export interface Activity {
  id: string;
  type: ActivityType;
  timestamp: Date;
  metadata: Record<string, any>;
}

export type ActivityType =
  | 'file-save'
  | 'file-delete'
  | 'test-run'
  | 'test-pass'
  | 'test-fail'
  | 'terminal-command'
  | 'diagnostic-error'
  | 'diagnostic-warning';

// Activity-specific metadata interfaces
export interface FileSaveActivity extends Activity {
  type: 'file-save';
  metadata: {
    filePath: string;
    linesAdded?: number;
    linesRemoved?: number;
  };
}

export interface TestRunActivity extends Activity {
  type: 'test-run';
  metadata: {
    framework: string;
    testCount: number;
    passed: number;
    failed: number;
    duration: number;
  };
}

// Conversion to timeline event
export interface SessionSummary {
  filesModified: Set<string>;
  linesAdded: number;
  linesRemoved: number;
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
  duration: number;
  activityCount: number;
}
```

**Tests**:
```typescript
// test/unit/sessions/types.test.ts
describe('Session Types', () => {
  it('should create valid session', () => {
    const session: Session = {
      id: 'test-id',
      prompt: 'Add authentication',
      agentType: 'claude',
      startTime: new Date(),
      status: 'active',
      activities: []
    };

    expect(session).toBeDefined();
    expect(session.status).toBe('active');
  });
});
```

**Deliverable**: Pure type definitions, no logic yet.

---

#### Day 2: Session Manager Core

**Goal**: Implement session lifecycle without any external dependencies

**Files to Create**:
```typescript
// packages/core/src/domains/sessions/SessionManager.ts
import { EventEmitter } from 'events';
import { Session, Activity, SessionStatus, SessionSummary } from './types';
import { CanonicalEvent, EventType } from '../events';

export class SessionManager extends EventEmitter {
  private currentSession: Session | null = null;

  /**
   * Start a new session (finalizes current if exists)
   */
  async startSession(prompt: string, agentType: AgentType): Promise<Session> {
    // Finalize previous session if exists
    if (this.currentSession && this.currentSession.status === 'active') {
      await this.finalizeSession('completed');
    }

    this.currentSession = {
      id: this.generateSessionId(),
      prompt,
      agentType,
      startTime: new Date(),
      status: 'active',
      activities: []
    };

    this.emit('session:started', this.currentSession);
    return this.currentSession;
  }

  /**
   * Track activity in current session
   */
  trackActivity(activity: Activity): void {
    if (!this.currentSession) {
      console.warn('SessionManager: No active session for activity', activity);
      return;
    }

    if (this.currentSession.status !== 'active') {
      console.warn('SessionManager: Session not active', this.currentSession.status);
      return;
    }

    this.currentSession.activities.push(activity);
    this.emit('activity:tracked', activity);
  }

  /**
   * Finalize current session
   */
  async finalizeSession(status: 'completed' | 'abandoned'): Promise<CanonicalEvent | null> {
    if (!this.currentSession) {
      return null;
    }

    // Update session
    this.currentSession.endTime = new Date();
    this.currentSession.status = status;

    // Convert to timeline event
    const event = this.convertToCanonicalEvent(this.currentSession);

    // Emit before clearing (so listeners can access final state)
    this.emit('session:finalized', this.currentSession, event);

    // Clear current session
    this.currentSession = null;

    return event;
  }

  /**
   * Get current session (read-only)
   */
  getCurrentSession(): Readonly<Session> | null {
    return this.currentSession ? { ...this.currentSession } : null;
  }

  /**
   * Check if session is active
   */
  hasActiveSession(): boolean {
    return this.currentSession !== null && this.currentSession.status === 'active';
  }

  /**
   * Convert session to CanonicalEvent for timeline
   */
  private convertToCanonicalEvent(session: Session): CanonicalEvent {
    const summary = this.calculateSummary(session);

    return {
      id: `session-${session.id}`,
      canonicalId: session.id,
      providerId: 'agent-brain',
      type: EventType.AGENT_SESSION,
      timestamp: session.startTime,
      title: session.prompt, // User's original words!
      description: this.generateDescription(session, summary),
      author: {
        id: session.agentType,
        name: this.getAgentDisplayName(session.agentType),
        email: `${session.agentType}@agent-brain.ai`
      },
      branches: [],
      parentIds: [],
      childIds: [],
      impact: {
        filesChanged: summary.filesModified.size,
        linesAdded: summary.linesAdded,
        linesRemoved: summary.linesRemoved,
        testsAffected: summary.testsRun,
        architecturalSignificance: this.calculateArchitecturalSignificance(summary)
      },
      metadata: {
        sessionDuration: summary.duration,
        activityCount: summary.activityCount,
        testsRun: summary.testsRun,
        testsPassed: summary.testsPassed,
        testsFailed: summary.testsFailed,
        filesModified: Array.from(summary.filesModified),
        agentType: session.agentType,
        sessionStatus: session.status
      },
      visualization: {
        icon: this.getAgentIcon(session.agentType),
        color: this.getAgentColor(session.agentType),
        priority: 2 // Higher than commits, lower than releases
      }
    };
  }

  /**
   * Calculate session summary metrics
   */
  private calculateSummary(session: Session): SessionSummary {
    const summary: SessionSummary = {
      filesModified: new Set<string>(),
      linesAdded: 0,
      linesRemoved: 0,
      testsRun: 0,
      testsPassed: 0,
      testsFailed: 0,
      duration: 0,
      activityCount: session.activities.length
    };

    // Calculate duration
    if (session.endTime) {
      summary.duration = session.endTime.getTime() - session.startTime.getTime();
    }

    // Aggregate activity metrics
    for (const activity of session.activities) {
      switch (activity.type) {
        case 'file-save':
          summary.filesModified.add(activity.metadata.filePath);
          summary.linesAdded += activity.metadata.linesAdded || 0;
          summary.linesRemoved += activity.metadata.linesRemoved || 0;
          break;

        case 'file-delete':
          summary.filesModified.add(activity.metadata.filePath);
          break;

        case 'test-run':
          summary.testsRun += activity.metadata.testCount || 0;
          summary.testsPassed += activity.metadata.passed || 0;
          summary.testsFailed += activity.metadata.failed || 0;
          break;
      }
    }

    return summary;
  }

  /**
   * Generate human-readable description
   */
  private generateDescription(session: Session, summary: SessionSummary): string {
    const parts: string[] = [];

    // Activity summary
    if (summary.filesModified.size > 0) {
      parts.push(`Modified ${summary.filesModified.size} file${summary.filesModified.size !== 1 ? 's' : ''}`);
    }

    if (summary.linesAdded > 0 || summary.linesRemoved > 0) {
      parts.push(`+${summary.linesAdded}/-${summary.linesRemoved} lines`);
    }

    if (summary.testsRun > 0) {
      parts.push(`${summary.testsPassed}/${summary.testsRun} tests passed`);
    }

    // Duration
    const durationMin = Math.round(summary.duration / 60000);
    if (durationMin > 0) {
      parts.push(`${durationMin} min`);
    }

    return parts.length > 0
      ? parts.join(' • ')
      : `${session.agentType} session completed`;
  }

  /**
   * Calculate architectural significance (0-1)
   */
  private calculateArchitecturalSignificance(summary: SessionSummary): number {
    // Simple heuristic: more files + more changes = higher significance
    const fileScore = Math.min(summary.filesModified.size / 10, 1);
    const lineScore = Math.min((summary.linesAdded + summary.linesRemoved) / 500, 1);
    return (fileScore + lineScore) / 2;
  }

  /**
   * Get display name for agent
   */
  private getAgentDisplayName(agentType: AgentType): string {
    const names: Record<AgentType, string> = {
      'claude': 'Claude',
      'copilot': 'GitHub Copilot',
      'cursor': 'Cursor',
      'unknown': 'AI Assistant'
    };
    return names[agentType];
  }

  /**
   * Get icon for agent
   */
  private getAgentIcon(agentType: AgentType): string {
    const icons: Record<AgentType, string> = {
      'claude': '🧠',
      'copilot': '✈️',
      'cursor': '🖱️',
      'unknown': '🤖'
    };
    return icons[agentType];
  }

  /**
   * Get color for agent
   */
  private getAgentColor(agentType: AgentType): string {
    const colors: Record<AgentType, string> = {
      'claude': '#D97706', // Amber
      'copilot': '#22C55E', // Green
      'cursor': '#3B82F6', // Blue
      'unknown': '#6B7280'  // Gray
    };
    return colors[agentType];
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
```

**Tests**:
```typescript
// test/unit/sessions/SessionManager.test.ts
describe('SessionManager', () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager();
  });

  it('should start a new session', async () => {
    const session = await manager.startSession('Add auth', 'claude');

    expect(session.prompt).toBe('Add auth');
    expect(session.agentType).toBe('claude');
    expect(session.status).toBe('active');
    expect(manager.hasActiveSession()).toBe(true);
  });

  it('should track activities', () => {
    manager.startSession('Test', 'claude');

    manager.trackActivity({
      id: '1',
      type: 'file-save',
      timestamp: new Date(),
      metadata: { filePath: 'test.ts' }
    });

    const current = manager.getCurrentSession();
    expect(current?.activities).toHaveLength(1);
  });

  it('should finalize session and create event', async () => {
    await manager.startSession('Add feature', 'claude');

    manager.trackActivity({
      id: '1',
      type: 'file-save',
      timestamp: new Date(),
      metadata: {
        filePath: 'feature.ts',
        linesAdded: 50,
        linesRemoved: 10
      }
    });

    const event = await manager.finalizeSession('completed');

    expect(event).toBeDefined();
    expect(event?.type).toBe(EventType.AGENT_SESSION);
    expect(event?.title).toBe('Add feature');
    expect(event?.impact.filesChanged).toBe(1);
    expect(event?.impact.linesAdded).toBe(50);
    expect(manager.hasActiveSession()).toBe(false);
  });

  it('should emit events on lifecycle', async () => {
    const started = jest.fn();
    const finalized = jest.fn();

    manager.on('session:started', started);
    manager.on('session:finalized', finalized);

    await manager.startSession('Test', 'claude');
    expect(started).toHaveBeenCalled();

    await manager.finalizeSession('completed');
    expect(finalized).toHaveBeenCalled();
  });

  it('should auto-finalize previous session on new start', async () => {
    await manager.startSession('First', 'claude');
    expect(manager.hasActiveSession()).toBe(true);

    await manager.startSession('Second', 'claude');
    expect(manager.getCurrentSession()?.prompt).toBe('Second');
  });
});
```

**Deliverable**: Fully tested session lifecycle manager.

---

#### Day 3: Session Storage

**Goal**: Persist sessions to `.agent-brain/sessions.json`

**Files to Create**:
```typescript
// packages/core/src/domains/sessions/SessionStorage.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import { Session } from './types';

export interface SessionStorageConfig {
  storagePath: string;
  maxSessions?: number;
}

export class SessionStorage {
  private readonly maxSessions: number;
  private readonly sessionsFile: string;

  constructor(config: SessionStorageConfig) {
    this.maxSessions = config.maxSessions || 100;
    this.sessionsFile = path.join(config.storagePath, 'sessions.json');
  }

  /**
   * Save session to storage
   */
  async saveSession(session: Session): Promise<void> {
    // Ensure directory exists
    await this.ensureDirectory();

    // Load existing sessions
    const sessions = await this.loadAllSessions();

    // Add new session
    sessions.push(session);

    // Maintain max limit (FIFO)
    while (sessions.length > this.maxSessions) {
      sessions.shift();
    }

    // Write back
    await this.writeJson(this.sessionsFile, sessions);
  }

  /**
   * Load all sessions
   */
  async loadAllSessions(): Promise<Session[]> {
    try {
      const data = await fs.readFile(this.sessionsFile, 'utf8');
      const sessions = JSON.parse(data) as Session[];

      // Deserialize dates
      return sessions.map(s => ({
        ...s,
        startTime: new Date(s.startTime),
        endTime: s.endTime ? new Date(s.endTime) : undefined,
        activities: s.activities.map(a => ({
          ...a,
          timestamp: new Date(a.timestamp)
        }))
      }));
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return []; // File doesn't exist yet
      }
      throw error;
    }
  }

  /**
   * Load recent sessions
   */
  async loadRecentSessions(count: number): Promise<Session[]> {
    const all = await this.loadAllSessions();
    return all.slice(-count);
  }

  /**
   * Load sessions by date range
   */
  async loadSessionsByDateRange(start: Date, end: Date): Promise<Session[]> {
    const all = await this.loadAllSessions();
    return all.filter(s =>
      s.startTime >= start && s.startTime <= end
    );
  }

  /**
   * Get session statistics
   */
  async getStatistics(): Promise<SessionStatistics> {
    const sessions = await this.loadAllSessions();

    return {
      totalSessions: sessions.length,
      byAgent: this.countByAgent(sessions),
      byStatus: this.countByStatus(sessions),
      totalActivities: sessions.reduce((sum, s) => sum + s.activities.length, 0),
      avgDuration: this.calculateAvgDuration(sessions)
    };
  }

  /**
   * Clear all sessions (dangerous!)
   */
  async clearAll(): Promise<void> {
    await this.writeJson(this.sessionsFile, []);
  }

  // Private helpers

  private async ensureDirectory(): Promise<void> {
    const dir = path.dirname(this.sessionsFile);
    await fs.mkdir(dir, { recursive: true });
  }

  private async writeJson(filepath: string, data: any): Promise<void> {
    const json = JSON.stringify(data, null, 2);
    await fs.writeFile(filepath, json, 'utf8');
  }

  private countByAgent(sessions: Session[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const session of sessions) {
      counts[session.agentType] = (counts[session.agentType] || 0) + 1;
    }
    return counts;
  }

  private countByStatus(sessions: Session[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const session of sessions) {
      counts[session.status] = (counts[session.status] || 0) + 1;
    }
    return counts;
  }

  private calculateAvgDuration(sessions: Session[]): number {
    const completed = sessions.filter(s => s.endTime);
    if (completed.length === 0) return 0;

    const totalMs = completed.reduce((sum, s) => {
      const duration = s.endTime!.getTime() - s.startTime.getTime();
      return sum + duration;
    }, 0);

    return totalMs / completed.length;
  }
}

interface SessionStatistics {
  totalSessions: number;
  byAgent: Record<string, number>;
  byStatus: Record<string, number>;
  totalActivities: number;
  avgDuration: number;
}
```

**Tests**:
```typescript
// test/unit/sessions/SessionStorage.test.ts
describe('SessionStorage', () => {
  let storage: SessionStorage;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDirectory();
    storage = new SessionStorage({
      storagePath: tempDir,
      maxSessions: 5
    });
  });

  afterEach(async () => {
    await removeTempDirectory(tempDir);
  });

  it('should save and load sessions', async () => {
    const session: Session = {
      id: 'test-1',
      prompt: 'Test',
      agentType: 'claude',
      startTime: new Date(),
      status: 'completed',
      activities: []
    };

    await storage.saveSession(session);
    const loaded = await storage.loadAllSessions();

    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('test-1');
  });

  it('should enforce max sessions limit', async () => {
    // Add 10 sessions (max is 5)
    for (let i = 0; i < 10; i++) {
      await storage.saveSession({
        id: `session-${i}`,
        prompt: `Session ${i}`,
        agentType: 'claude',
        startTime: new Date(),
        status: 'completed',
        activities: []
      });
    }

    const sessions = await storage.loadAllSessions();
    expect(sessions).toHaveLength(5);
    expect(sessions[0].id).toBe('session-5'); // Oldest 5 removed
  });

  it('should calculate statistics', async () => {
    await storage.saveSession({
      id: '1',
      prompt: 'Test 1',
      agentType: 'claude',
      startTime: new Date(),
      endTime: new Date(Date.now() + 60000),
      status: 'completed',
      activities: [{
        id: 'a1',
        type: 'file-save',
        timestamp: new Date(),
        metadata: {}
      }]
    });

    const stats = await storage.getStatistics();
    expect(stats.totalSessions).toBe(1);
    expect(stats.byAgent.claude).toBe(1);
    expect(stats.totalActivities).toBe(1);
  });
});
```

**Deliverable**: Persistent session storage with rotation.

---

#### Day 4: EventType Extension

**Goal**: Add AGENT_SESSION to existing event system

**Files to Modify**:
```typescript
// packages/core/src/domains/events/EventType.ts
export enum EventType {
  // Existing git events
  COMMIT = 'commit',
  MERGE = 'merge',
  TAG = 'tag',
  BRANCH = 'branch',
  RELEASE = 'release',
  PULL_REQUEST = 'pull_request',
  ISSUE = 'issue',

  // Intelligence events (keep for backward compat, but no longer generated)
  PATTERN_DETECTED = 'pattern_detected',
  LEARNING_STORED = 'learning_stored',
  ADR_RECORDED = 'adr_recorded',

  // NEW: Agent Brain session event
  AGENT_SESSION = 'agent_session'
}
```

```typescript
// packages/core/src/domains/events/CanonicalEvent.ts
// Add optional session metadata
export interface CanonicalEvent {
  // ... existing fields ...

  /**
   * Session-specific metadata (only for AGENT_SESSION events)
   */
  sessionMetadata?: {
    sessionDuration: number;        // ms
    activityCount: number;
    testsRun: number;
    testsPassed: number;
    testsFailed: number;
    filesModified: string[];
    agentType: string;
    sessionStatus: 'completed' | 'abandoned';
  };
}
```

**Tests**:
```typescript
// test/unit/events/EventType.test.ts
describe('EventType', () => {
  it('should include AGENT_SESSION type', () => {
    expect(EventType.AGENT_SESSION).toBe('agent_session');
  });

  it('should create session event with metadata', () => {
    const event: CanonicalEvent = {
      id: 'session-1',
      canonicalId: '1',
      providerId: 'agent-brain',
      type: EventType.AGENT_SESSION,
      timestamp: new Date(),
      title: 'Add authentication',
      description: 'Session completed',
      author: { id: 'claude', name: 'Claude' },
      branches: [],
      parentIds: [],
      childIds: [],
      impact: {
        filesChanged: 3,
        linesAdded: 150,
        linesRemoved: 20
      },
      sessionMetadata: {
        sessionDuration: 300000,
        activityCount: 5,
        testsRun: 10,
        testsPassed: 9,
        testsFailed: 1,
        filesModified: ['auth.ts', 'user.ts'],
        agentType: 'claude',
        sessionStatus: 'completed'
      }
    };

    expect(event.type).toBe(EventType.AGENT_SESSION);
    expect(event.sessionMetadata?.agentType).toBe('claude');
  });
});
```

**Deliverable**: Extended event model without breaking changes.

---

#### Day 5: Integration and Testing

**Goal**: Wire SessionManager to storage and create comprehensive tests

**Files to Create**:
```typescript
// packages/core/src/domains/sessions/index.ts
export { SessionManager } from './SessionManager';
export { SessionStorage } from './SessionStorage';
export * from './types';

// Factory function for easy instantiation
export function createSessionManager(storagePath: string): SessionManager {
  const storage = new SessionStorage({ storagePath });
  const manager = new SessionManager();

  // Wire finalization to storage
  manager.on('session:finalized', async (session: Session) => {
    await storage.saveSession(session);
  });

  return manager;
}
```

**Integration Tests**:
```typescript
// test/integration/sessions/session-lifecycle.test.ts
describe('Session Lifecycle Integration', () => {
  let manager: SessionManager;
  let storage: SessionStorage;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDirectory();
    storage = new SessionStorage({ storagePath: tempDir });
    manager = new SessionManager();

    manager.on('session:finalized', async (session) => {
      await storage.saveSession(session);
    });
  });

  afterEach(async () => {
    await removeTempDirectory(tempDir);
  });

  it('should complete full session lifecycle', async () => {
    // Start session
    const session = await manager.startSession('Add feature', 'claude');
    expect(session.status).toBe('active');

    // Track activities
    manager.trackActivity({
      id: '1',
      type: 'file-save',
      timestamp: new Date(),
      metadata: {
        filePath: 'feature.ts',
        linesAdded: 100
      }
    });

    manager.trackActivity({
      id: '2',
      type: 'test-run',
      timestamp: new Date(),
      metadata: {
        framework: 'jest',
        testCount: 5,
        passed: 5,
        failed: 0,
        duration: 1000
      }
    });

    // Finalize
    const event = await manager.finalizeSession('completed');
    expect(event).toBeDefined();
    expect(event?.type).toBe(EventType.AGENT_SESSION);

    // Verify persistence
    const sessions = await storage.loadAllSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].activities).toHaveLength(2);

    // Verify event conversion
    expect(event?.title).toBe('Add feature');
    expect(event?.impact.filesChanged).toBe(1);
    expect(event?.impact.linesAdded).toBe(100);
    expect(event?.sessionMetadata?.testsRun).toBe(5);
  });

  it('should handle session abandonment', async () => {
    await manager.startSession('Unfinished work', 'copilot');
    const event = await manager.finalizeSession('abandoned');

    expect(event?.sessionMetadata?.sessionStatus).toBe('abandoned');
  });

  it('should auto-finalize on new session start', async () => {
    await manager.startSession('First', 'claude');
    manager.trackActivity({
      id: '1',
      type: 'file-save',
      timestamp: new Date(),
      metadata: { filePath: 'first.ts' }
    });

    await manager.startSession('Second', 'claude');

    const sessions = await storage.loadAllSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].prompt).toBe('First');
  });
});
```

**Week 1 Deliverables Summary**:
- ✅ Core session management (SessionManager)
- ✅ Persistent storage (SessionStorage)
- ✅ Event type extension (AGENT_SESSION)
- ✅ Pure domain layer (zero VSCode deps)
- ✅ Comprehensive tests (unit + integration)
- ✅ Ready for VSCode integration

---

### Phase 2: Knowledge System Refactor (Week 2, 5 days)

#### Day 1: Remove IntelligenceProvider

**Goal**: Delete IntelligenceProvider and remove event emission from patterns/ADRs

**Files to Delete**:
```bash
# Delete the provider
rm packages/core/src/domains/providers/intelligence/IntelligenceProvider.ts

# Remove exports
# Edit: packages/core/src/domains/providers/intelligence/index.ts
# Remove: export { IntelligenceProvider } from './IntelligenceProvider';
```

**Files to Modify**:
```typescript
// packages/core/src/domains/intelligence/core/patterns/PatternSystem.ts
// REMOVE any event emission or CanonicalEvent conversion

export class PatternSystem {
  // Keep all existing functionality
  // Remove: any convertToEvent() methods
  // Remove: any event emitters for pattern detection

  // Patterns are KNOWLEDGE, not events!
}
```

```typescript
// packages/core/src/domains/intelligence/core/adrs/ADRSystem.ts
// Keep ADR functionality
// Remove event emission (ADRs still get recorded via command, but don't auto-emit)

export class ADRSystem {
  async createADR(adr: ADR): Promise<void> {
    // Store ADR
    await this.storage.store(adr);

    // DON'T emit as event - ADRs are knowledge
    // Timeline integration happens via manual command if user wants
  }
}
```

**Migration Script**:
```typescript
// scripts/remove-intelligence-provider.ts
/**
 * Migration script to remove IntelligenceProvider references
 */
async function migrateIntelligenceProvider() {
  console.log('Removing IntelligenceProvider...');

  // 1. Remove from DataOrchestrator
  // 2. Remove from timeline provider initialization
  // 3. Update imports throughout codebase

  console.log('✅ IntelligenceProvider removed');
  console.log('   Patterns/ADRs/Learnings are now knowledge-only');
}
```

**Tests**:
```typescript
// Ensure patterns don't emit events
describe('PatternSystem (Post-Migration)', () => {
  it('should NOT emit events when patterns detected', async () => {
    const eventSpy = jest.fn();
    patternSystem.on('event', eventSpy); // Should not exist anymore

    await patternSystem.registerPattern(testPattern);
    expect(eventSpy).not.toHaveBeenCalled();
  });

  it('should still provide pattern data', async () => {
    const patterns = await patternSystem.getPatterns();
    expect(patterns).toBeDefined();
    expect(patterns).toBeInstanceOf(Array);
  });
});
```

**Deliverable**: IntelligenceProvider deleted, no more intelligence events auto-generated.

---

#### Day 2: Create Knowledge Domain

**Goal**: Establish new knowledge domain structure

**Files to Create**:
```typescript
// packages/core/src/domains/knowledge/types.ts
export interface Knowledge {
  patterns: PatternKnowledge[];
  adrs: ADRKnowledge[];
  learnings: LearningKnowledge[];
}

export interface PatternKnowledge {
  id: string;
  name: string;
  description: string;
  category: string;
  relevanceScore?: number; // How relevant to current context
}

export interface ADRKnowledge {
  id: string;
  number: number;
  title: string;
  status: string;
  context: string;
  decision: string;
  relevanceScore?: number;
}

export interface LearningKnowledge {
  id: string;
  name: string;
  description: string;
  category: string;
  occurrences: number;
  confidenceScore: number;
}

export interface KnowledgeSummary {
  totalPatterns: number;
  totalADRs: number;
  totalLearnings: number;
  recentADRs: ADRKnowledge[];
  topPatternCategories: { category: string; count: number }[];
  lastUpdated: Date;
}
```

**Deliverable**: Clean knowledge type definitions.

---

#### Day 3: Knowledge System Facade

**Goal**: Create unified interface for all knowledge sources

**Files to Create**:
```typescript
// packages/core/src/domains/knowledge/KnowledgeSystem.ts
import { PatternSystem } from '../intelligence/core/patterns';
import { ADRSystem } from '../intelligence/core/adrs';
import { LearningSystem } from '../intelligence/core/learning';
import { Knowledge, KnowledgeSummary } from './types';

export class KnowledgeSystem {
  constructor(
    private patterns: PatternSystem,
    private adrs: ADRSystem,
    private learnings: LearningSystem
  ) {}

  /**
   * Get knowledge relevant to a specific context
   * This is the primary method for prompt enhancement
   */
  async getRelevantKnowledge(context: string): Promise<Knowledge> {
    const [patterns, adrs, learnings] = await Promise.all([
      this.findRelevantPatterns(context),
      this.findRelevantADRs(context),
      this.findSimilarLearnings(context)
    ]);

    return {
      patterns,
      adrs,
      learnings
    };
  }

  /**
   * Get knowledge summary for UI display
   */
  async getSummary(): Promise<KnowledgeSummary> {
    const [patterns, adrs, learnings] = await Promise.all([
      this.patterns.getPatterns(),
      this.adrs.getADRs(),
      this.learnings.getPatterns()
    ]);

    return {
      totalPatterns: patterns.length,
      totalADRs: adrs.length,
      totalLearnings: learnings.length,
      recentADRs: this.extractRecentADRs(adrs, 5),
      topPatternCategories: this.calculateTopCategories(patterns, 5),
      lastUpdated: new Date()
    };
  }

  /**
   * Find patterns relevant to context
   */
  private async findRelevantPatterns(context: string): Promise<PatternKnowledge[]> {
    const allPatterns = await this.patterns.getPatterns();

    // Simple keyword matching for MVP
    const contextLower = context.toLowerCase();
    return allPatterns
      .map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category,
        relevanceScore: this.calculatePatternRelevance(p, contextLower)
      }))
      .filter(p => p.relevanceScore > 0.3)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5); // Top 5
  }

  /**
   * Find ADRs relevant to context
   */
  private async findRelevantADRs(context: string): Promise<ADRKnowledge[]> {
    const allADRs = await this.adrs.getADRs();

    // Filter by accepted/proposed status
    const active = allADRs.filter(a =>
      a.status === 'accepted' || a.status === 'proposed'
    );

    // Simple keyword matching
    const contextLower = context.toLowerCase();
    return active
      .map(adr => ({
        id: adr.id,
        number: adr.number,
        title: adr.title,
        status: adr.status,
        context: adr.context,
        decision: adr.decision,
        relevanceScore: this.calculateADRRelevance(adr, contextLower)
      }))
      .filter(a => a.relevanceScore > 0.3)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 3); // Top 3
  }

  /**
   * Find learnings similar to context
   */
  private async findSimilarLearnings(context: string): Promise<LearningKnowledge[]> {
    const allLearnings = await this.learnings.getPatterns();

    // Use existing similarity logic if available
    const contextLower = context.toLowerCase();
    return allLearnings
      .map(l => ({
        id: l.id || '',
        name: l.name,
        description: l.description,
        category: l.category,
        occurrences: l.occurrences || 1,
        confidenceScore: l.confidenceScore || 0.5
      }))
      .filter(l =>
        l.name.toLowerCase().includes(contextLower) ||
        l.description.toLowerCase().includes(contextLower)
      )
      .slice(0, 3); // Top 3
  }

  /**
   * Calculate pattern relevance score (0-1)
   */
  private calculatePatternRelevance(pattern: any, contextLower: string): number {
    let score = 0;

    // Name match (high weight)
    if (pattern.name.toLowerCase().includes(contextLower)) {
      score += 0.5;
    }

    // Description match (medium weight)
    if (pattern.description.toLowerCase().includes(contextLower)) {
      score += 0.3;
    }

    // Category match (low weight)
    if (pattern.category.toLowerCase().includes(contextLower)) {
      score += 0.2;
    }

    return Math.min(score, 1);
  }

  /**
   * Calculate ADR relevance score (0-1)
   */
  private calculateADRRelevance(adr: any, contextLower: string): number {
    let score = 0;

    // Title match (high weight)
    if (adr.title.toLowerCase().includes(contextLower)) {
      score += 0.5;
    }

    // Context/decision match (medium weight)
    if (adr.context.toLowerCase().includes(contextLower) ||
        adr.decision.toLowerCase().includes(contextLower)) {
      score += 0.3;
    }

    // Tags match (low weight)
    if (adr.tags && adr.tags.some((t: string) =>
      t.toLowerCase().includes(contextLower))
    ) {
      score += 0.2;
    }

    return Math.min(score, 1);
  }

  /**
   * Extract recent ADRs
   */
  private extractRecentADRs(adrs: any[], count: number): ADRKnowledge[] {
    return adrs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, count)
      .map(adr => ({
        id: adr.id,
        number: adr.number,
        title: adr.title,
        status: adr.status,
        context: adr.context,
        decision: adr.decision
      }));
  }

  /**
   * Calculate top pattern categories
   */
  private calculateTopCategories(patterns: any[], count: number) {
    const counts = new Map<string, number>();

    for (const pattern of patterns) {
      const category = pattern.category || 'uncategorized';
      counts.set(category, (counts.get(category) || 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, count);
  }
}
```

**Tests**:
```typescript
// test/unit/knowledge/KnowledgeSystem.test.ts
describe('KnowledgeSystem', () => {
  let knowledgeSystem: KnowledgeSystem;
  let patternSystem: PatternSystem;
  let adrSystem: ADRSystem;
  let learningSystem: LearningSystem;

  beforeEach(() => {
    // Create mock systems
    patternSystem = createMockPatternSystem();
    adrSystem = createMockADRSystem();
    learningSystem = createMockLearningSystem();

    knowledgeSystem = new KnowledgeSystem(
      patternSystem,
      adrSystem,
      learningSystem
    );
  });

  it('should retrieve relevant knowledge', async () => {
    const knowledge = await knowledgeSystem.getRelevantKnowledge('authentication');

    expect(knowledge.patterns).toBeDefined();
    expect(knowledge.adrs).toBeDefined();
    expect(knowledge.learnings).toBeDefined();
  });

  it('should filter by relevance score', async () => {
    const knowledge = await knowledgeSystem.getRelevantKnowledge('auth');

    // Should only return highly relevant items
    knowledge.patterns.forEach(p => {
      expect(p.relevanceScore).toBeGreaterThan(0.3);
    });
  });

  it('should generate knowledge summary', async () => {
    const summary = await knowledgeSystem.getSummary();

    expect(summary.totalPatterns).toBeGreaterThanOrEqual(0);
    expect(summary.totalADRs).toBeGreaterThanOrEqual(0);
    expect(summary.topPatternCategories).toBeInstanceOf(Array);
  });
});
```

**Deliverable**: Unified knowledge retrieval system.

---

#### Day 4: Move Intelligence to Knowledge

**Goal**: Reorganize directory structure

**Directory Changes**:
```bash
# Create new structure
mkdir -p packages/core/src/domains/knowledge

# Move (don't copy) existing systems
mv packages/core/src/domains/intelligence/core/patterns packages/core/src/domains/knowledge/patterns
mv packages/core/src/domains/intelligence/core/adrs packages/core/src/domains/knowledge/adrs
mv packages/core/src/domains/intelligence/core/learning packages/core/src/domains/knowledge/learning

# Update exports
# packages/core/src/domains/knowledge/index.ts
```

**Update All Imports**:
```typescript
// Find and replace throughout codebase
// FROM: @agent-brain/core/domains/intelligence/core/patterns
// TO:   @agent-brain/core/domains/knowledge/patterns

// FROM: @agent-brain/core/domains/intelligence/core/adrs
// TO:   @agent-brain/core/domains/knowledge/adrs

// etc.
```

**Migration Checklist**:
- [ ] Move pattern system
- [ ] Move ADR system
- [ ] Move learning system
- [ ] Update all imports in core
- [ ] Update all imports in vscode
- [ ] Update all imports in tests
- [ ] Run full test suite
- [ ] Verify nothing broken

**Deliverable**: Clean knowledge domain structure.

---

#### Day 5: Knowledge Integration Tests

**Goal**: Ensure knowledge system works end-to-end

**Integration Tests**:
```typescript
// test/integration/knowledge/knowledge-retrieval.test.ts
describe('Knowledge Retrieval Integration', () => {
  let knowledgeSystem: KnowledgeSystem;
  let storagePath: string;

  beforeEach(async () => {
    storagePath = await createTempDirectory();

    // Initialize real systems with temp storage
    const patternSystem = new PatternSystem({
      storage: new PatternStorage(path.join(storagePath, 'patterns.json'))
    });

    const adrSystem = new ADRSystem({
      storage: new FileADRStorage(path.join(storagePath, 'adrs.json'))
    });

    const learningSystem = new LearningSystem(
      new MemoryLearningStorage()
    );

    knowledgeSystem = new KnowledgeSystem(
      patternSystem,
      adrSystem,
      learningSystem
    );

    // Seed data
    await seedTestData(patternSystem, adrSystem, learningSystem);
  });

  afterEach(async () => {
    await removeTempDirectory(storagePath);
  });

  it('should find authentication patterns', async () => {
    const knowledge = await knowledgeSystem.getRelevantKnowledge('authentication');

    expect(knowledge.patterns.length).toBeGreaterThan(0);
    expect(knowledge.patterns[0].name).toContain('auth');
  });

  it('should find architectural decisions', async () => {
    const knowledge = await knowledgeSystem.getRelevantKnowledge('database');

    expect(knowledge.adrs.length).toBeGreaterThan(0);
  });

  it('should prioritize by relevance', async () => {
    const knowledge = await knowledgeSystem.getRelevantKnowledge('repository pattern');

    // First result should be most relevant
    if (knowledge.patterns.length > 1) {
      expect(knowledge.patterns[0].relevanceScore)
        .toBeGreaterThanOrEqual(knowledge.patterns[1].relevanceScore);
    }
  });

  it('should handle empty results gracefully', async () => {
    const knowledge = await knowledgeSystem.getRelevantKnowledge('xyznonexistent');

    expect(knowledge.patterns).toEqual([]);
    expect(knowledge.adrs).toEqual([]);
    expect(knowledge.learnings).toEqual([]);
  });
});

async function seedTestData(patterns: PatternSystem, adrs: ADRSystem, learnings: LearningSystem) {
  // Add test patterns
  await patterns.registerPattern({
    id: 'auth-1',
    name: 'Authentication Pattern',
    description: 'Use JWT for authentication',
    category: 'security',
    severity: 'error',
    trigger: /auth/i,
    message: 'Use JWT'
  });

  // Add test ADRs
  await adrs.createADR({
    title: 'Use Repository Pattern for Database Access',
    status: 'accepted',
    context: 'Need consistent data access layer',
    decision: 'Implement repository pattern',
    consequences: 'Easier testing and maintenance'
  });

  // Add test learnings
  // (learnings typically come from test failures)
}
```

**Week 2 Deliverables Summary**:
- ✅ IntelligenceProvider deleted
- ✅ Knowledge domain established
- ✅ KnowledgeSystem facade created
- ✅ Directory structure reorganized
- ✅ All imports updated
- ✅ Comprehensive tests passing
- ✅ Ready for prompt enhancement

---

### Phase 3: Prompt UI & VSCode Integration (Week 3, 5 days)

#### Day 1: Command Registration

**Goal**: Set up basic VSCode command infrastructure

**Files to Create**:
```typescript
// packages/vscode/src/commands/BaseCommand.ts
import * as vscode from 'vscode';

export abstract class BaseCommand {
  abstract readonly id: string;

  register(context: vscode.ExtensionContext): void {
    const command = vscode.commands.registerCommand(
      this.id,
      async (...args: any[]) => {
        try {
          await this.execute(...args);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(`Command failed: ${message}`);
          console.error(`[${this.id}] Error:`, error);
        }
      }
    );

    context.subscriptions.push(command);
  }

  protected abstract execute(...args: any[]): Promise<void>;
}
```

```typescript
// packages/vscode/src/commands/PromptCommand.ts
import * as vscode from 'vscode';
import { BaseCommand } from './BaseCommand';
import { SessionManager } from '@agent-brain/core/domains/sessions';
import { KnowledgeSystem } from '@agent-brain/core/domains/knowledge';
import { PromptEnhancer } from '../prompt/PromptEnhancer';

export class PromptCommand extends BaseCommand {
  readonly id = 'agentBrain.newPrompt';

  constructor(
    private sessionManager: SessionManager,
    private knowledgeSystem: KnowledgeSystem,
    private enhancer: PromptEnhancer
  ) {
    super();
  }

  protected async execute(): Promise<void> {
    // Step 1: Get prompt from user
    const prompt = await vscode.window.showInputBox({
      title: '🧠 Agent Brain - New Prompt',
      prompt: 'What would you like to build?',
      placeHolder: 'e.g., Add JWT authentication to user service...',
      ignoreFocusOut: true,
      validateInput: (value) => {
        return value.trim().length < 10
          ? 'Please provide more detail (at least 10 characters)'
          : null;
      }
    });

    if (!prompt) {
      return; // User cancelled
    }

    // Step 2: Select agent type
    const agentChoice = await vscode.window.showQuickPick([
      {
        label: '$(brain) Claude',
        description: 'Anthropic Claude via terminal or extension',
        value: 'claude' as const
      },
      {
        label: '$(rocket) GitHub Copilot',
        description: 'GitHub Copilot in VSCode',
        value: 'copilot' as const
      },
      {
        label: '$(edit) Cursor',
        description: 'Cursor AI assistant',
        value: 'cursor' as const
      },
      {
        label: '$(question) Other',
        description: 'Other AI coding assistant',
        value: 'unknown' as const
      }
    ], {
      title: 'Which AI assistant are you using?',
      placeHolder: 'Select your agent...'
    });

    if (!agentChoice) {
      return; // User cancelled
    }

    // Step 3: Enhance with knowledge
    await this.enhanceAndSend(prompt, agentChoice.value);
  }

  private async enhanceAndSend(prompt: string, agentType: string): Promise<void> {
    // Show progress
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Agent Brain',
      cancellable: false
    }, async (progress) => {
      progress.report({ message: 'Gathering knowledge...' });

      // Get relevant knowledge
      const knowledge = await this.knowledgeSystem.getRelevantKnowledge(prompt);

      progress.report({ message: 'Enhancing prompt...' });

      // Create enhancement
      const enhanced = await this.enhancer.enhance(prompt, knowledge);

      progress.report({ message: 'Ready!' });

      // Show preview and options
      await this.showEnhancementPreview(prompt, enhanced, agentType);
    });
  }

  private async showEnhancementPreview(
    originalPrompt: string,
    enhancedPrompt: string,
    agentType: string
  ): Promise<void> {
    const action = await vscode.window.showInformationMessage(
      'Agent Brain enhanced your prompt with relevant knowledge',
      {
        modal: true,
        detail: `Original:\n${originalPrompt}\n\n---\n\nEnhanced:\n${enhancedPrompt}`
      },
      'Send to Terminal',
      'Copy to Clipboard',
      'Cancel'
    );

    switch (action) {
      case 'Send to Terminal':
        await this.sendToTerminal(enhancedPrompt, agentType);
        break;

      case 'Copy to Clipboard':
        await vscode.env.clipboard.writeText(enhancedPrompt);
        vscode.window.showInformationMessage('✅ Enhanced prompt copied to clipboard');
        break;
    }
  }

  private async sendToTerminal(prompt: string, agentType: string): Promise<void> {
    // Start session tracking
    await this.sessionManager.startSession(prompt, agentType);

    // Send to terminal
    const terminal = vscode.window.activeTerminal ||
                    vscode.window.createTerminal({
                      name: `AI Assistant (${agentType})`,
                      iconPath: new vscode.ThemeIcon('brain')
                    });

    terminal.show();
    terminal.sendText(prompt);

    vscode.window.showInformationMessage(
      `🧠 Session started. Agent Brain is tracking your ${agentType} session.`,
      'Show Status'
    ).then(choice => {
      if (choice === 'Show Status') {
        vscode.commands.executeCommand('agentBrain.showStatus');
      }
    });
  }
}
```

**Package.json Updates**:
```json
{
  "contributes": {
    "commands": [
      {
        "command": "agentBrain.newPrompt",
        "title": "Agent Brain: New Prompt",
        "category": "Agent Brain",
        "icon": "$(brain)"
      }
    ],
    "keybindings": [
      {
        "command": "agentBrain.newPrompt",
        "key": "ctrl+shift+a",
        "mac": "cmd+shift+a",
        "when": "editorTextFocus"
      }
    ]
  }
}
```

**Deliverable**: Working prompt command with native UI.

---

#### Day 2: Prompt Enhancer

**Goal**: Create knowledge application logic

**Files to Create**:
```typescript
// packages/vscode/src/prompt/PromptEnhancer.ts
import { Knowledge } from '@agent-brain/core/domains/knowledge';

export class PromptEnhancer {
  /**
   * Enhance prompt with knowledge
   * Returns markdown-formatted enhanced prompt (no XML for v1)
   */
  async enhance(prompt: string, knowledge: Knowledge): Promise<string> {
    const sections: string[] = [];

    // Original user intent (most important)
    sections.push(prompt);

    // Add knowledge context if relevant
    if (this.hasRelevantKnowledge(knowledge)) {
      sections.push(''); // Blank line
      sections.push('## Context from Agent Brain');
      sections.push('');

      // Patterns
      if (knowledge.patterns.length > 0) {
        sections.push('**Patterns to follow:**');
        for (const pattern of knowledge.patterns) {
          sections.push(`- ${pattern.name}: ${pattern.description}`);
        }
        sections.push('');
      }

      // ADRs
      if (knowledge.adrs.length > 0) {
        sections.push('**Architecture decisions:**');
        for (const adr of knowledge.adrs) {
          sections.push(`- ADR-${adr.number}: ${adr.title}`);
          sections.push(`  Decision: ${this.truncate(adr.decision, 100)}`);
        }
        sections.push('');
      }

      // Learnings
      if (knowledge.learnings.length > 0) {
        sections.push('**Related learnings:**');
        for (const learning of knowledge.learnings) {
          sections.push(`- ${learning.name} (seen ${learning.occurrences}x)`);
        }
        sections.push('');
      }
    }

    return sections.join('\n');
  }

  /**
   * Check if knowledge has any relevant items
   */
  private hasRelevantKnowledge(knowledge: Knowledge): boolean {
    return knowledge.patterns.length > 0 ||
           knowledge.adrs.length > 0 ||
           knowledge.learnings.length > 0;
  }

  /**
   * Truncate text to max length
   */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }
}
```

**Tests**:
```typescript
// test/unit/prompt/PromptEnhancer.test.ts
describe('PromptEnhancer', () => {
  let enhancer: PromptEnhancer;

  beforeEach(() => {
    enhancer = new PromptEnhancer();
  });

  it('should enhance prompt with patterns', async () => {
    const knowledge: Knowledge = {
      patterns: [{
        id: '1',
        name: 'Repository Pattern',
        description: 'Use repository for data access',
        category: 'architecture',
        relevanceScore: 0.9
      }],
      adrs: [],
      learnings: []
    };

    const enhanced = await enhancer.enhance('Add database', knowledge);

    expect(enhanced).toContain('Add database');
    expect(enhanced).toContain('Repository Pattern');
    expect(enhanced).toContain('Context from Agent Brain');
  });

  it('should handle empty knowledge', async () => {
    const knowledge: Knowledge = {
      patterns: [],
      adrs: [],
      learnings: []
    };

    const enhanced = await enhancer.enhance('Build feature', knowledge);

    expect(enhanced).toBe('Build feature');
    expect(enhanced).not.toContain('Context from Agent Brain');
  });

  it('should include ADRs', async () => {
    const knowledge: Knowledge = {
      patterns: [],
      adrs: [{
        id: '1',
        number: 5,
        title: 'Use microservices',
        status: 'accepted',
        context: 'Need scalability',
        decision: 'Split into services',
        relevanceScore: 0.8
      }],
      learnings: []
    };

    const enhanced = await enhancer.enhance('Scale system', knowledge);

    expect(enhanced).toContain('ADR-5');
    expect(enhanced).toContain('Use microservices');
  });
});
```

**Deliverable**: Clean prompt enhancement logic.

---

#### Day 3: File System Activity Adapter

**Goal**: Track file changes during sessions

**Files to Create**:
```typescript
// packages/vscode/src/adapters/FileSystemAdapter.ts
import * as vscode from 'vscode';
import { SessionManager } from '@agent-brain/core/domains/sessions';
import { Activity } from '@agent-brain/core/domains/sessions/types';

export class FileSystemAdapter {
  private disposables: vscode.Disposable[] = [];

  constructor(private sessionManager: SessionManager) {
    this.setupWatchers();
  }

  private setupWatchers(): void {
    // Watch file saves
    const saveWatcher = vscode.workspace.onDidSaveTextDocument(doc => {
      this.handleFileSave(doc);
    });
    this.disposables.push(saveWatcher);

    // Watch file deletes
    const deleteWatcher = vscode.workspace.onDidDeleteFiles(event => {
      this.handleFileDelete(event);
    });
    this.disposables.push(deleteWatcher);
  }

  private handleFileSave(document: vscode.TextDocument): void {
    if (!this.sessionManager.hasActiveSession()) {
      return; // No active session
    }

    // Calculate line changes (rough estimate)
    const lineCount = document.lineCount;

    const activity: Activity = {
      id: this.generateActivityId(),
      type: 'file-save',
      timestamp: new Date(),
      metadata: {
        filePath: vscode.workspace.asRelativePath(document.uri),
        linesAdded: lineCount, // Simplified - could use git diff
        linesRemoved: 0
      }
    };

    this.sessionManager.trackActivity(activity);
  }

  private handleFileDelete(event: vscode.FileDeleteEvent): void {
    if (!this.sessionManager.hasActiveSession()) {
      return;
    }

    for (const uri of event.files) {
      const activity: Activity = {
        id: this.generateActivityId(),
        type: 'file-delete',
        timestamp: new Date(),
        metadata: {
          filePath: vscode.workspace.asRelativePath(uri)
        }
      };

      this.sessionManager.trackActivity(activity);
    }
  }

  private generateActivityId(): string {
    return `act-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}
```

**Deliverable**: File activity tracking.

---

#### Day 4: Session Management Commands

**Goal**: Add commands for manual session control

**Files to Create**:
```typescript
// packages/vscode/src/commands/EndSessionCommand.ts
import * as vscode from 'vscode';
import { BaseCommand } from './BaseCommand';
import { SessionManager } from '@agent-brain/core/domains/sessions';

export class EndSessionCommand extends BaseCommand {
  readonly id = 'agentBrain.endSession';

  constructor(private sessionManager: SessionManager) {
    super();
  }

  protected async execute(): Promise<void> {
    if (!this.sessionManager.hasActiveSession()) {
      vscode.window.showInformationMessage('No active session to end');
      return;
    }

    const currentSession = this.sessionManager.getCurrentSession();
    if (!currentSession) return;

    // Ask for confirmation
    const choice = await vscode.window.showInformationMessage(
      `End session: "${currentSession.prompt}"?`,
      { modal: true },
      'Complete',
      'Abandon',
      'Cancel'
    );

    if (choice === 'Complete') {
      const event = await this.sessionManager.finalizeSession('completed');

      if (event) {
        vscode.window.showInformationMessage(
          `✅ Session completed: ${event.impact.filesChanged} file(s) changed, ` +
          `${event.sessionMetadata?.activityCount} activities tracked`
        );
      }
    } else if (choice === 'Abandon') {
      await this.sessionManager.finalizeSession('abandoned');
      vscode.window.showInformationMessage('Session abandoned');
    }
  }
}
```

```typescript
// packages/vscode/src/commands/ShowStatusCommand.ts
import * as vscode from 'vscode';
import { BaseCommand } from './BaseCommand';
import { SessionManager } from '@agent-brain/core/domains/sessions';

export class ShowStatusCommand extends BaseCommand {
  readonly id = 'agentBrain.showStatus';

  constructor(private sessionManager: SessionManager) {
    super();
  }

  protected async execute(): Promise<void> {
    const session = this.sessionManager.getCurrentSession();

    if (!session) {
      vscode.window.showInformationMessage('No active session');
      return;
    }

    const duration = Date.now() - session.startTime.getTime();
    const durationMin = Math.floor(duration / 60000);
    const durationSec = Math.floor((duration % 60000) / 1000);

    const message = `
**Active Session**
Prompt: ${session.prompt}
Agent: ${session.agentType}
Duration: ${durationMin}m ${durationSec}s
Activities: ${session.activities.length}
    `.trim();

    const action = await vscode.window.showInformationMessage(
      'Agent Brain Session Status',
      { modal: true, detail: message },
      'End Session',
      'Continue'
    );

    if (action === 'End Session') {
      await vscode.commands.executeCommand('agentBrain.endSession');
    }
  }
}
```

**Package.json**:
```json
{
  "commands": [
    {
      "command": "agentBrain.endSession",
      "title": "Agent Brain: End Session"
    },
    {
      "command": "agentBrain.showStatus",
      "title": "Agent Brain: Show Session Status"
    }
  ]
}
```

**Deliverable**: Session control commands.

---

#### Day 5: Extension Integration

**Goal**: Wire everything together in extension.ts

**Files to Modify**:
```typescript
// packages/vscode/src/extension.ts
import * as vscode from 'vscode';
import * as path from 'path';

// Timeline (existing)
import { TimelineProvider } from './providers/timeline-provider-webpack';
import { WelcomeViewProvider } from './providers/WelcomeViewProvider';

// Agent Brain (new)
import { createSessionManager } from '@agent-brain/core/domains/sessions';
import { KnowledgeSystem } from '@agent-brain/core/domains/knowledge';
import { PatternSystem } from '@agent-brain/core/domains/knowledge/patterns';
import { ADRSystem, FileADRStorage } from '@agent-brain/core/domains/knowledge/adrs';
import { LearningSystem } from '@agent-brain/core/domains/knowledge/learning';

// Commands
import { PromptCommand } from './commands/PromptCommand';
import { EndSessionCommand } from './commands/EndSessionCommand';
import { ShowStatusCommand } from './commands/ShowStatusCommand';

// Adapters
import { FileSystemAdapter } from './adapters/FileSystemAdapter';

// UI
import { PromptEnhancer } from './prompt/PromptEnhancer';

let timelineProvider: TimelineProvider | null = null;
let sessionManager: ReturnType<typeof createSessionManager> | null = null;
let fileSystemAdapter: FileSystemAdapter | null = null;

export async function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('Agent Brain');

  try {
    outputChannel.appendLine('🧠 Activating Agent Brain Platform...');

    // Get storage path
    const storagePath = getStoragePath(context);
    outputChannel.appendLine(`📂 Storage: ${storagePath}`);

    // ============================================================
    // PART 1: AGENT BRAIN CORE (NEW)
    // ============================================================

    outputChannel.appendLine('🔧 Initializing Agent Brain core...');

    // Session Manager
    sessionManager = createSessionManager(storagePath);
    outputChannel.appendLine('✅ Session manager ready');

    // Knowledge System
    const patternSystem = new PatternSystem({
      storage: new PatternStorage(path.join(storagePath, 'patterns.json'))
    });

    const adrSystem = new ADRSystem({
      storage: new FileADRStorage(path.join(storagePath, 'adrs.json'))
    });

    const learningSystem = new LearningSystem(
      new FileLearningStorage(path.join(storagePath, 'learnings.json'))
    );

    const knowledgeSystem = new KnowledgeSystem(
      patternSystem,
      adrSystem,
      learningSystem
    );
    outputChannel.appendLine('✅ Knowledge system ready');

    // Prompt Enhancer
    const promptEnhancer = new PromptEnhancer();

    // File System Adapter
    fileSystemAdapter = new FileSystemAdapter(sessionManager);
    context.subscriptions.push(fileSystemAdapter);
    outputChannel.appendLine('✅ File system adapter active');

    // Register Commands
    new PromptCommand(sessionManager, knowledgeSystem, promptEnhancer)
      .register(context);
    new EndSessionCommand(sessionManager)
      .register(context);
    new ShowStatusCommand(sessionManager)
      .register(context);
    outputChannel.appendLine('✅ Commands registered');

    // ============================================================
    // PART 2: TIMELINE (EXISTING - KEEP)
    // ============================================================

    outputChannel.appendLine('📊 Initializing timeline visualization...');

    // Welcome View (existing)
    const welcomeProvider = new WelcomeViewProvider(context.extensionUri);
    const welcomeView = vscode.window.registerWebviewViewProvider(
      WelcomeViewProvider.viewType,
      welcomeProvider
    );
    context.subscriptions.push(welcomeView);

    // Timeline View (existing)
    timelineProvider = new TimelineProvider(context.extensionUri, storagePath);
    const timelineView = vscode.window.registerWebviewViewProvider(
      TimelineProvider.viewType,
      timelineProvider
    );
    context.subscriptions.push(timelineView);

    // Timeline commands (existing)
    registerTimelineCommands(context, timelineProvider, storagePath);

    outputChannel.appendLine('✅ Timeline visualization ready');

    // ============================================================
    // PART 3: INTEGRATION (NEW)
    // ============================================================

    outputChannel.appendLine('🔗 Integrating session events with timeline...');

    // When session finalized, add to timeline
    sessionManager.on('session:finalized', (session: any, event: any) => {
      if (timelineProvider) {
        // TODO: Add method to timeline provider to accept external events
        // For now, timeline will pick up from sessions.json on next refresh
        outputChannel.appendLine(`✅ Session event created: ${event.title}`);
      }
    });

    outputChannel.appendLine('✅ Integration complete');

    // ============================================================
    // SUCCESS
    // ============================================================

    outputChannel.appendLine('🎉 Agent Brain Platform activated successfully!');
    outputChannel.appendLine('💡 Use Ctrl+Shift+A (Cmd+Shift+A on Mac) to start a new prompt');

    vscode.window.showInformationMessage(
      '🧠 Agent Brain is ready! Press Ctrl+Shift+A to start.',
      'New Prompt'
    ).then(choice => {
      if (choice === 'New Prompt') {
        vscode.commands.executeCommand('agentBrain.newPrompt');
      }
    });

  } catch (error) {
    outputChannel.appendLine(`❌ Activation failed: ${error}`);
    vscode.window.showErrorMessage(`Agent Brain failed to activate: ${error}`);
    throw error;
  }
}

export function deactivate() {
  // Clean up resources
  if (fileSystemAdapter) {
    fileSystemAdapter.dispose();
  }
  if (sessionManager) {
    sessionManager.removeAllListeners();
  }
}

function getStoragePath(context: vscode.ExtensionContext): string {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  return workspaceRoot
    ? path.join(workspaceRoot, '.agent-brain')
    : path.join(context.globalStorageUri.fsPath, 'agent-brain');
}

function registerTimelineCommands(
  context: vscode.ExtensionContext,
  provider: TimelineProvider,
  storagePath: string
) {
  // Existing timeline commands stay as-is
  const showTimelineCommand = vscode.commands.registerCommand(
    'repoTimeline.showTimeline',
    async () => {
      await vscode.commands.executeCommand('workbench.view.extension.repoTimelinePanel');
    }
  );
  context.subscriptions.push(showTimelineCommand);

  // ... other existing commands ...
}
```

**Week 3 Deliverables Summary**:
- ✅ Prompt command with native UI
- ✅ Knowledge-enhanced prompts
- ✅ File system activity tracking
- ✅ Session management commands
- ✅ Full VSCode integration
- ✅ Non-breaking to existing timeline
- ✅ Ready for timeline integration

---

### Phase 4: Timeline Integration (Week 4, 5 days)

**[Detailed implementation of timeline integration showing session events alongside git events]**

### Phase 5: Context Persistence & Polish (Week 5, 5 days)

**[Detailed implementation of context management and final polish]**

---

## [Additional sections continue with same level of detail...]

---

## Implementation Notes

### Critical Success Factors

1. **Backward Compatibility**: Every change must maintain existing timeline functionality
2. **Incremental Testing**: Test after each component, not at the end
3. **Clear Boundaries**: Core domain has zero VSCode dependencies
4. **User Communication**: Clear messaging about what Agent Brain is doing
5. **Performance**: No degradation to timeline rendering

### Common Pitfalls to Avoid

❌ **Don't**: Add VSCode types to core domain
✅ **Do**: Keep core pure, inject dependencies

❌ **Don't**: Break existing ADR/Pattern functionality
✅ **Do**: Move, don't rewrite. Test thoroughly.

❌ **Don't**: Auto-emit events from knowledge systems
✅ **Do**: Knowledge enhances prompts, sessions create events

❌ **Don't**: Build complex webviews first
✅ **Do**: Start with native UI, add webviews later if needed

---

## Conclusion

This plan represents a **pragmatic, thoroughly-researched approach** to building Agent Brain. It respects the existing codebase, ships incrementally, and focuses on core value delivery.

**Ready to begin Phase 1 on your signal.**
