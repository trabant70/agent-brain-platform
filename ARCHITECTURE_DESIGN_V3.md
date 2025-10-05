# Agent-Brain Platform - Architectural Design Document

**Version:** 3.0.0
**Status:** Approved Design
**Date:** 2025-10-05
**Philosophy:** Architecturally sound, pragmatic, built for the long term

---

## Executive Summary

This document defines the architecture for the Agent-Brain Platform, a unified system that combines:
- **AI Development Observatory:** Timeline visualization of all development events (git, agents, patterns, learnings)
- **Pattern Intelligence Engine:** Learning from code patterns, test failures, and agent activities
- **Pathway Testing Framework:** Milestone-based testing for the entire system

### Core Design Insight

**The current split between `core` and `vscode` packages is architecturally flawed.** It creates artificial boundaries where there should be integration, duplicates testing infrastructure, and fails to leverage pathway testing across the entire codebase.

### Approved Solution

**Collapse into a cohesive domain architecture** organized by capability, not by deployment target. The VSCode extension is the primary deployment vehicle for a unified platform.

---

## Design Principles

### 1. Domain-Driven Package Structure
Organize by **what the code does** (domain), not **where it runs** (deployment).

### 2. Testing as First-Class Architecture
Pathway testing is not a feature—it's the quality paradigm. Every domain should be pathway-testable.

### 3. Cohesion Over Separation
Keep related concepts together. Split only when there's a compelling reuse case.

### 4. Single Source of Truth
No duplication. One implementation, consumed by all dependents.

### 5. Progressive Enhancement
Build layers that enhance each other, not parallel systems that need integration.

### 6. Two-Tiered Data Flow (NEW)
Agent emissions are first-tier sources that feed learning systems, which are meta-interpretation layers.

### 7. CanonicalEvent as Universal Contract (CRITICAL)
**Everything speaks CanonicalEvent. Everything.**

All data sources (Git, GitHub, Intelligence, Agents) emit CanonicalEvents. All visualizations (Timeline, Dashboard, future viz) consume CanonicalEvents. DataOrchestrator is the single aggregation point.

**No exceptions. No transformations. No separate data paths.**

This is how the timeline and agent-brain repositories merge into one unified architecture: **one event format, one orchestrator, peer visualizations.**

---

## Architectural Layers

### Three-Layer System

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: DATA ACQUISITION (Provider Tier)                       │
│                                                                   │
│  Responsibility: Get raw data from external sources              │
│  Intelligence: Domain-specific (git parsing, agent emission      │
│                interpretation, pattern detection)                │
│  Output: CanonicalEvent[]                                        │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Git Provider │  │GitHub Provider│  │ Agent        │          │
│  │              │  │               │  │ Emission     │          │
│  │  (commits,   │  │  (PRs, issues,│  │ Provider     │          │
│  │   branches)  │  │   releases)   │  │ (Claude,     │          │
│  │              │  │               │  │  Cursor,     │          │
│  │              │  │               │  │  Copilot)    │          │
│  └──────────────┘  └──────────────┘  └──────┬───────┘          │
│                                              │                    │
│                                              ↓                    │
│                                    ┌──────────────────┐          │
│                                    │ Learning System  │          │
│                                    │   (processes     │          │
│                                    │    emissions +   │          │
│                                    │    pathway tests │          │
│                                    │    into patterns)│          │
│                                    └──────┬───────────┘          │
│                                           ↓                       │
│                                  Meta CanonicalEvents             │
│                               (LEARNING_STORED,                  │
│                                PATTERN_DETECTED, etc.)           │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 2: ORCHESTRATION & AGGREGATION                            │
│                                                                   │
│  Responsibility: Aggregate, filter, cache events from providers  │
│  Intelligence: NONE (for now) - Just orchestrate                │
│  Future: Cross-source correlation via Intelligence Helper        │
│  Output: Unified CanonicalEvent[] stream                         │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │             Data Orchestrator                            │    │
│  │  - Aggregate from all providers                          │    │
│  │  - Apply user filters (branch, author, date)             │    │
│  │  - Manage repository-level cache                         │    │
│  │  - Coordinate provider health                            │    │
│  │                                                           │    │
│  │  Future enhancement:                                     │    │
│  │  - Intelligence Helper (cross-event correlation)         │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 3: PRESENTATION (Visualization Tier)                      │
│                                                                   │
│  Responsibility: Transform events into visual representations    │
│  Intelligence: None (pure presentation)                          │
│  Output: Interactive visualizations                              │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │         Visualization Registry                           │    │
│  │  (Peer to Data Provider Registry)                       │    │
│  │                                                           │    │
│  │  Current:                                                │    │
│  │  - Timeline Visualization                                │    │
│  │                                                           │    │
│  │  Future:                                                 │    │
│  │  - Pattern Graph Visualization                           │    │
│  │  - Learning Progress Chart                               │    │
│  │  - Code Complexity Heatmap                               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  Note: Different visualization TYPES (timeline vs graph)         │
│        not different rendering ENGINES (D3 vs Canvas)            │
│        Rendering engine variations add complexity without        │
│        clear user benefit for this use case.                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Package Structure

### Final Architecture

```
agent-brain-platform/
├── packages/
│   ├── core/                          [DOMAIN: Core Platform]
│   │   ├── src/
│   │   │   ├── domains/              [Business domains]
│   │   │   │   │
│   │   │   │   ├── events/           [Event System Foundation]
│   │   │   │   │   ├── CanonicalEvent.ts
│   │   │   │   │   ├── EventType.ts  [Git, PR, Pattern, Learning, Agent types]
│   │   │   │   │   ├── Author.ts
│   │   │   │   │   ├── ImpactMetrics.ts
│   │   │   │   │   ├── VisualizationHints.ts
│   │   │   │   │   └── types.ts
│   │   │   │   │
│   │   │   │   ├── intelligence/     [Pattern & Learning Engine]
│   │   │   │   │   ├── engine/
│   │   │   │   │   │   └── AgentBrainCore.ts       [Main analysis orchestrator]
│   │   │   │   │   ├── patterns/
│   │   │   │   │   │   ├── PatternEngine.ts        [Pattern matching & validation]
│   │   │   │   │   │   ├── PatternValidator.ts     [Pattern quality checks]
│   │   │   │   │   │   └── PatternSystem.ts        [Pattern management]
│   │   │   │   │   ├── learning/
│   │   │   │   │   │   ├── LearningAnalyzer.ts     [Extract patterns from failures]
│   │   │   │   │   │   ├── LearningPropagator.ts   [Apply learnings across codebase]
│   │   │   │   │   │   ├── LearningStorage.ts      [Persist learnings]
│   │   │   │   │   │   └── LearningSystem.ts       [Orchestrator]
│   │   │   │   │   ├── versioning/
│   │   │   │   │   │   └── PatternVersionControl.ts [Pattern versioning]
│   │   │   │   │   └── adapters/                    [CRITICAL: Intelligence Input Mechanisms]
│   │   │   │   │       ├── base/
│   │   │   │   │       │   └── IntelligenceAdapter.ts [Base adapter interface]
│   │   │   │   │       ├── extensions/              [Plugin System for Custom Patterns/ADRs]
│   │   │   │   │       │   ├── ExtensionAPI.ts      [Extension interface]
│   │   │   │   │       │   ├── ExtensionLoader.ts   [Load npm extensions]
│   │   │   │   │       │   └── ExtensionRegistry.ts [Manage loaded extensions]
│   │   │   │   │       ├── webhooks/                [Real-time Events & External Triggers]
│   │   │   │   │       │   ├── WebSocketAdapter.ts  [Real-time learning events]
│   │   │   │   │       │   └── AnalysisTrigger.ts   [External analysis triggers]
│   │   │   │   │       ├── testing/                 [Test Integration]
│   │   │   │   │       │   └── PathwayLearningAdapter.ts [Pathway tests → Learning]
│   │   │   │   │       └── agents/                  [FUTURE: Agent Integration]
│   │   │   │   │           └── AgentEmissionAdapter.ts [Agent work → Learning]
│   │   │   │   │
│   │   │   │   ├── providers/        [Data Providers - Tier 1]
│   │   │   │   │   ├── base/
│   │   │   │   │   │   ├── IDataProvider.ts        [Provider interface]
│   │   │   │   │   │   ├── ProviderRegistry.ts     [Provider lifecycle management]
│   │   │   │   │   │   └── ProviderConfig.ts       [Provider configuration]
│   │   │   │   │   ├── git/
│   │   │   │   │   │   ├── GitProvider.ts
│   │   │   │   │   │   └── GitEventRepository.ts
│   │   │   │   │   ├── github/
│   │   │   │   │   │   ├── GitHubProvider.ts
│   │   │   │   │   │   └── GitHubClient.ts
│   │   │   │   │   ├── intelligence/                [NEW: Intelligence as Provider]
│   │   │   │   │   │   └── IntelligenceProvider.ts      [Wraps learning/pattern domains]
│   │   │   │   │   └── agents/                      [FUTURE: Agent Emission Providers]
│   │   │   │   │       ├── AgentEmissionProvider.ts     [Aggregator for all agents]
│   │   │   │   │       ├── adapters/
│   │   │   │   │       │   ├── ClaudeCodeAdapter.ts     [Claude Code emissions]
│   │   │   │   │       │   ├── CursorAdapter.ts         [Cursor emissions]
│   │   │   │   │       │   ├── CopilotAdapter.ts        [GitHub Copilot emissions]
│   │   │   │   │       │   └── CommitMessageAdapter.ts  [Structured commit metadata]
│   │   │   │   │       └── types.ts                     [Agent emission types]
│   │   │   │   │
│   │   │   │   ├── visualization/    [Timeline Rendering & UI]
│   │   │   │   │   ├── timeline/
│   │   │   │   │   │   ├── D3TimelineRenderer.ts
│   │   │   │   │   │   ├── EventRenderer.ts
│   │   │   │   │   │   ├── LegendRenderer.ts
│   │   │   │   │   │   └── InteractionHandler.ts
│   │   │   │   │   ├── filters/
│   │   │   │   │   │   ├── FilterController.ts
│   │   │   │   │   │   ├── FilterStateManager.ts
│   │   │   │   │   │   └── FilterOptions.ts
│   │   │   │   │   ├── ui/
│   │   │   │   │   │   ├── RangeSelector.ts
│   │   │   │   │   │   └── TimelineControls.ts
│   │   │   │   │   ├── webview/
│   │   │   │   │   │   ├── SimpleTimelineApp.ts    [Webview application]
│   │   │   │   │   │   └── WebviewLogger.ts        [Browser-safe logging]
│   │   │   │   │   ├── styles/                      [CSS for visualization]
│   │   │   │   │   ├── theme/
│   │   │   │   │   │   └── EventVisualTheme.ts     [Colors, shapes, z-index]
│   │   │   │   │   └── orchestration/
│   │   │   │   │       └── DataOrchestrator.ts     [Coordinates providers + filtering]
│   │   │   │   │
│   │   │   │   └── extension/        [VSCode Integration]
│   │   │   │       ├── providers/
│   │   │   │       │   ├── TimelineProvider.ts     [Webview lifecycle]
│   │   │   │       │   └── WelcomeViewProvider.ts
│   │   │   │       ├── commands/
│   │   │   │       │   └── TimelineCommands.ts     [VSCode command handlers]
│   │   │   │       └── activation/
│   │   │   │           └── ExtensionActivator.ts   [Orchestrates startup]
│   │   │   │
│   │   │   └── infrastructure/       [Cross-cutting Concerns]
│   │   │       ├── registries/       [NEW: Unified Registry Pattern]
│   │   │       │   ├── Registry.ts              [Base registry implementation]
│   │   │       │   ├── DataProviderRegistry.ts  [Specialized for data providers]
│   │   │       │   └── VisualizationRegistry.ts [NEW: Peer to provider registry]
│   │   │       ├── logging/
│   │   │       │   ├── Logger.ts
│   │   │       │   ├── LogCapture.ts
│   │   │       │   └── LogPathway.ts
│   │   │       ├── testing/          [Pathway Testing Framework]
│   │   │       │   ├── PathwayAsserter.ts
│   │   │       │   ├── PathwayDebugger.ts
│   │   │       │   ├── PathwayReporter.ts
│   │   │       │   ├── TimelineUISimulator.ts
│   │   │       │   └── pathway-matchers.ts
│   │   │       ├── storage/
│   │   │       │   └── FileStorage.ts
│   │   │       ├── config/
│   │   │       │   └── FeatureFlags.ts
│   │   │       └── communication/    [Future: WebSocket, EventBus]
│   │   │           └── WebSocketService.ts
│   │   │
│   │   ├── tests/                    [Pathway tests for ALL domains]
│   │   │   ├── pathways/
│   │   │   │   ├── intelligence/     [NEW: Pattern detection, learning pathways]
│   │   │   │   │   ├── pattern-detection.pathway.test.ts
│   │   │   │   │   ├── learning-cycle.pathway.test.ts
│   │   │   │   │   └── suggestion-generation.pathway.test.ts
│   │   │   │   ├── visualization/    [Timeline rendering, filtering pathways]
│   │   │   │   │   ├── timeline-render.pathway.test.ts
│   │   │   │   │   ├── filter-apply.pathway.test.ts
│   │   │   │   │   └── range-selector.pathway.test.ts
│   │   │   │   ├── providers/        [NEW: Data ingestion pathways]
│   │   │   │   │   ├── git-ingestion.pathway.test.ts
│   │   │   │   │   ├── github-ingestion.pathway.test.ts
│   │   │   │   │   └── agent-emission-ingestion.pathway.test.ts
│   │   │   │   └── integration/      [Cross-domain pathways]
│   │   │   │       ├── git-to-timeline.pathway.test.ts
│   │   │   │       ├── agent-emission-to-learning.pathway.test.ts
│   │   │   │       ├── learning-to-visualization.pathway.test.ts
│   │   │   │       └── end-to-end.pathway.test.ts
│   │   │   ├── fixtures/             [Shared test data]
│   │   │   ├── mocks/                [Mock implementations]
│   │   │   ├── setup/                [Test configuration]
│   │   │   └── utils/                [Test utilities]
│   │   │
│   │   └── package.json
│   │
│   └── extension/                     [DEPLOYMENT: VSCode Extension Wrapper]
│       ├── src/
│       │   ├── extension.ts          [Extension entry point]
│       │   ├── activate.ts           [Activation orchestration]
│       │   └── commands/             [VSCode command implementations]
│       ├── images/                   [Extension assets]
│       ├── webpack.config.js         [Extension + webview bundling]
│       ├── package.json              [VSCode extension manifest]
│       └── README.md
│
├── docs/                             [Platform documentation]
│   ├── ARCHITECTURE.md               [This document]
│   ├── PATHWAY_TESTING.md
│   ├── DATA_FLOW.md                  [NEW: Tier 1 → Tier 2 flow diagrams]
│   ├── AGENT_INTEGRATION.md          [NEW: How to add agent adapters]
│   └── DEVELOPER_GUIDE.md
│
├── lerna.json
├── package.json
└── tsconfig.json
```

---

## Key Architectural Decisions

### 1. Two-Tiered Data Provider Architecture

**Decision:** Agent emissions are **first-tier data sources** that feed into the canonical event system.

**Rationale:**
- Developers want to see **when** coding agents did **what** (timeline view)
- Agent activities are events just like commits, PRs, and releases
- Fits naturally with timeline, branch, and event concepts
- Enables direct visualization of agent work

**Event Boundary Model:** User prompts define event boundaries (see [CANONICAL_EVENT_DESIGN.md](CANONICAL_EVENT_DESIGN.md))
- Event = [User Prompt] → [Agent Work] → [Next User Prompt | Timeout]
- User prompt text becomes event title/intent (explicit, no inference)
- All agent activities between prompts = one CanonicalEvent with detailed rollup in metadata

**Implementation:**
```typescript
// First tier: Agent emissions with prompt-based boundaries
ClaudeCodeAdapter (tracks prompts, accumulates activity)
  ↓
AgentActivityRollup (session between prompts)
  ↓
RollupToEventConverter
  ↓
CanonicalEvent(type: AGENT_TASK_COMPLETED)

// Flows to timeline immediately
AgentEmissionProvider → DataOrchestrator → Timeline
```

**Example Flow:**
```
User Prompt: "Add null safety to UserValidator"
  ↓
Claude Code edits 2 files, runs tests
  ↓
Next User Prompt (or 5min idle timeout)
  ↓
ClaudeCodeAdapter finalizes session rollup
  ↓
AgentEmissionProvider creates CanonicalEvent
  type: AGENT_TASK_COMPLETED
  timestamp: 2025-10-05T10:32:34Z
  title: "Add null safety to UserValidator" (user's exact words)
  description: "Modified 2 files (+15 -3 lines), 5/5 tests passed"
  metadata: {
    userPrompt: "Add null safety to UserValidator",
    sessionDuration: 154,
    activities: { filesModified: [...], testsRun: [...] },
    testsPass: true
  }
  ↓
DataOrchestrator aggregates with git events
  ↓
Timeline displays: commit (git) → agent task (claude) → commit (git)
  - Click to drill down into detailed file changes, test runs
```

---

### 2. Learning System as Meta-Interpretation Layer

**Decision:** Learning system is a **consumable hook** that processes agent emissions (and pathway tests) into patterns.

**Rationale:**
- Learning system does what it does best: **extract patterns from activities**
- Agent emissions are just another input source (like test failures)
- Learning outputs are **also events** (LEARNING_STORED, PATTERN_DETECTED)
- Creates a feedback loop: activity → learning → visualization

**Implementation:**
```typescript
// Learning as consumer of agent emissions
class LearningSystem {
  // Can consume ANY event type
  processEvent(event: CanonicalEvent): LearningPattern[] {
    if (event.type === AGENT_ACTION) {
      return this.analyzeAgentBehavior(event);
    }
    if (event.type === TEST_FAILURE) {
      return this.analyzeTestFailure(event);
    }
    // ... other event types
  }
}

// Learning as provider of meta-events
class IntelligenceProvider implements IDataProvider {
  async fetchEvents(): Promise<CanonicalEvent[]> {
    const patterns = await this.learningSystem.getPatterns();
    return patterns.map(p => this.toCanonicalEvent(p));
  }
}
```

**Data Flow:**
```
Agent Emission (Tier 1)
  ↓
CanonicalEvent(AGENT_ACTION)
  ↓
  ├─→ Timeline (direct visualization)
  │
  └─→ LearningSystem.processEvent()
      ↓
      LearningPattern created
      ↓
      IntelligenceProvider.fetchEvents()
      ↓
      CanonicalEvent(PATTERN_DETECTED)
      ↓
      Timeline (meta visualization - shows pattern was learned)
```

**This creates TWO event streams:**
1. **Direct stream:** Agent actions visible on timeline immediately
2. **Meta stream:** Patterns learned from those actions also visible

---

### 3. Current Architecture with Future Intelligence Helper

**Decision:** Keep current DataOrchestrator simple. Consider Intelligence Helper only **after** all integration flows work and are pathway-tested.

**Rationale:**
- **Pragmatism over premature optimization**
- Don't add abstraction before feeling the pain
- Get agent emission → timeline working first
- Get learning system → visualization working first
- Once those flows are stable and tested, **then** consider cross-event correlation

**Current Implementation:**
```typescript
class DataOrchestrator {
  // Simple aggregation
  async getEvents(context): Promise<CanonicalEvent[]> {
    const providers = this.registry.getHealthyProviders();
    const events = await Promise.all(
      providers.map(p => p.fetchEvents(context))
    );
    return this.deduplicate(events.flat());
  }
}
```

**Future Enhancement (when needed):**
```typescript
class DataOrchestrator {
  constructor(
    private providers: ProviderRegistry,
    private intelligence?: IntelligenceHelper  // Optional helper
  ) {}

  async getEvents(context): Promise<CanonicalEvent[]> {
    const raw = await this.aggregateFromProviders(context);
    const filtered = this.applyFilters(raw);

    // Only if intelligence helper is configured
    if (this.intelligence) {
      return this.intelligence.enrich(filtered);  // Correlations, insights
    }

    return filtered;
  }
}
```

**Trigger for adding Intelligence Helper:**
- When we need to correlate: "Pattern X applied after commit Y that fixed bug Z"
- When we need temporal analysis: "Learning effectiveness over time"
- When we need anomaly detection: "Unusual pattern propagation"
- **Not before we have real use cases**

---

### 4. Visualization Registry as Peer to Provider Registry

**Decision:** Elevate VisualizationRegistry to **infrastructure layer** as a peer to DataProviderRegistry.

**Rationale:**
- Providers answer: "Where does data come from?"
- Visualizations answer: "How do we show data?"
- Both are pluggable, both need health monitoring, both are configurable
- **Symmetry**: Input plugins (providers) and Output plugins (visualizations)

**Architecture:**
```
infrastructure/registries/
├── Registry.ts                    [Base pattern]
├── DataProviderRegistry.ts        [Input plugins]
└── VisualizationRegistry.ts       [Output plugins]
```

**Interface Symmetry:**
```typescript
interface IDataProvider {
  id: string;
  name: string;
  capabilities: ProviderCapabilities;
  fetchEvents(context): Promise<CanonicalEvent[]>;
  isHealthy(): Promise<boolean>;
}

interface IVisualization {
  id: string;
  name: string;
  capabilities: VisualizationCapabilities;
  render(events: CanonicalEvent[]): Promise<void>;
  isHealthy(): Promise<boolean>;
}
```

**Current Visualization:**
- Timeline (D3-based event visualization over time)

**Future Visualizations:**
- Pattern Graph (node-link diagram of pattern relationships)
- Learning Progress Chart (line graph of learning effectiveness)
- Code Complexity Heatmap (file-based complexity visualization)

**Note on Rendering Engines:**
Different rendering engines (D3 vs Canvas vs WebGL) for the **same visualization type** add complexity without clear user benefit. Timeline uses D3 SVG. If performance becomes an issue in the future, we can add Canvas renderer as an **implementation detail** of TimelineVisualization, not as a separate registered visualization.

---

## Domain Breakdown

### domains/events/ - Event System Foundation

**Purpose:** Universal event format—the language everything speaks

**Key principle:** This is the **contract** between providers and visualizations. Rich enough to represent any data source, specific enough to be immediately useful.

**Contents:**
- `CanonicalEvent.ts` - Universal event type with all fields
- `EventType.ts` - Comprehensive enum (git, GitHub, agent, pattern, learning types)
- Supporting types (Author, ImpactMetrics, VisualizationHints)

**Why foundational:** Every other domain builds on this. Events are immutable facts.

---

### domains/intelligence/ - Pattern & Learning Engine

**Purpose:** Extract patterns from activities, learn from failures, propagate knowledge, validate against ADRs

**Key principle:** Intelligence has its OWN input adapters (extensions, webhooks, triggers) - this is the core capability of agent-brain. Intelligence is both a consumer (of events) and a provider (of meta-events).

**Critical Architectural Insight:**
The intelligence domain contains the original agent-brain's core capability: **multiple input adapters** that collect data to learn from and verify that architectural decisions are followed. These input mechanisms must be preserved exactly.

**Structure:**
```
intelligence/
├── engine/
│   └── AgentBrainCore.ts          [Main orchestrator]
├── patterns/
│   ├── PatternEngine.ts           [Pattern matching]
│   ├── PatternValidator.ts        [Validate against ADRs]
│   └── PatternSystem.ts           [Facade]
├── learning/
│   ├── LearningAnalyzer.ts        [Extract patterns from failures]
│   ├── LearningStorage.ts         [Persist learnings]
│   ├── LearningPropagator.ts      [Apply learnings across codebase]
│   └── LearningSystem.ts          [Facade]
├── versioning/
│   └── PatternVersionControl.ts   [Pattern versioning]
└── adapters/                      [INPUT ADAPTERS - THE CORE]
    ├── base/
    │   └── IntelligenceAdapter.ts [Base adapter interface]
    ├── extensions/                [Plugin System for Custom Patterns/ADRs]
    │   ├── ExtensionAPI.ts       [Extension interface]
    │   ├── ExtensionLoader.ts    [Load npm extensions]
    │   └── ExtensionRegistry.ts  [Manage loaded extensions]
    ├── webhooks/                  [Real-time Events & External Triggers]
    │   ├── WebSocketAdapter.ts   [Real-time learning events]
    │   └── AnalysisTrigger.ts    [External analysis triggers]
    ├── testing/                   [Test Integration]
    │   └── PathwayLearningAdapter.ts [Pathway tests → Learning]
    └── agents/                    [FUTURE: Agent Integration]
        └── AgentEmissionAdapter.ts [Agent work → Learning]
```

**Intelligence Input Adapters (Must Preserve):**

#### 1. Extension System (Plugin Architecture)
Teams extend agent-brain with custom patterns, analyzers, and ADRs:

```typescript
// Extensions loaded from npm packages (@agent-brain-ext/*)
interface AgentBrainExtension {
  name: string;
  version: string;

  patterns?(): Pattern[];              // Custom patterns
  analyzers?(): Analyzer[];            // Custom code analyzers
  beforeAnalysis?(code, context): void; // Pre-analysis hook
  afterAnalysis?(results): void;        // Post-analysis hook
  interventionStrategy?(intent): Strategy; // Custom interventions
  onLearn?(learning): void;             // Learning event hook
  commands?(): Command[];               // Custom commands
}

// Example:
//  @agent-brain-ext/company-adr - Company architecture decision records
//  @agent-brain-ext/security-patterns - Security best practices
//  @agent-brain-ext/react-patterns - React-specific patterns
```

#### 2. WebSocket Events (Real-time Intelligence Feed)
Real-time learning events, analysis triggers, external system integration:

```typescript
WebSocketEvents {
  // Outbound: Learning notifications
  'pattern-discovered': (pattern) => void;
  'pattern-applied': (patternId, file) => void;
  'failure-processed': (failure) => void;
  'metrics-updated': (metrics) => void;

  // Inbound: Triggers (INPUT)
  'trigger-analysis': (files[]) => void;
  'apply-suggestion': (patternId, file) => void;
}
```

#### 3. Analysis Trigger (REST - INPUT ONLY)
External systems can trigger analysis:

```typescript
POST /api/analyze        // Trigger analysis on files
POST /api/patterns       // Add custom pattern

// NOTE: GET endpoints ELIMINATED!
// Dashboard no longer has separate API
// Dashboard is now a Visualization that queries DataOrchestrator
```

#### 4. Pathway Learning Adapter (NEW)
Learn from pathway test failures:

```typescript
class PathwayLearningAdapter {
  async processFailure(pathwayTest: PathwayTest): Promise<void> {
    const failure: TestFailure = {
      testName: pathwayTest.name,
      expected: pathwayTest.expectations,
      actual: pathwayTest.results,
      stackTrace: pathwayTest.error
    };

    await learningSystem.processFailure(failure);
  }
}
```

#### 5. Agent Emission Adapter (FUTURE - Phase 9)
Learn from agent coding activities:

```typescript
class AgentEmissionAdapter {
  async processAgentActivity(emission: AgentActivityRollup): Promise<void> {
    // Extract patterns from agent work
    const patterns = await learningAnalyzer.extractFromActivity(emission);

    // Store learnings
    await learningStorage.store(patterns);

    // Validate against ADRs
    await patternValidator.validateAgainstADRs(patterns);
  }
}
```

**Unique Capability: Intelligence is Both Consumer AND Provider**

**As Consumer (Intelligence Adapters → Processing):**
```typescript
// From extensions
extensionLoader.loadFromPackages();
const customPatterns = extensionLoader.getAllPatterns();

// From webhooks
webSocketAdapter.on('trigger-analysis', files => {
  agentBrainCore.analyzeFiles(files);
});

// From pathway tests
pathwayLearningAdapter.processFailure(testFailure);

// From agent emissions (FUTURE)
agentEmissionAdapter.processAgentActivity(emission);
```

**As Provider (Processing → IntelligenceProvider → CanonicalEvents):**
```typescript
class IntelligenceProvider implements IDataProvider {
  constructor(
    private learningSystem: LearningSystem,
    private patternSystem: PatternSystem
  ) {}

  async fetchEvents(): Promise<CanonicalEvent[]> {
    const events: CanonicalEvent[] = [];

    // Learnings as events
    const learnings = await this.learningSystem.getAllLearnings();
    learnings.forEach(learning => {
      events.push({
        type: EventType.LEARNING_STORED,
        title: learning.description,
        timestamp: learning.discoveredAt,
        author: { id: 'agent-brain', name: 'Agent Brain' },
        metadata: { learning, source: learning.source }
      });
    });

    // Patterns as events
    const patterns = await this.patternSystem.getPatterns();
    patterns.forEach(pattern => {
      events.push({
        type: EventType.PATTERN_DETECTED,
        title: pattern.name,
        timestamp: pattern.detectedAt,
        metadata: { pattern }
      });
    });

    return events;
  }

  // Real-time updates
  subscribe(callback: (event: CanonicalEvent) => void): void {
    this.learningSystem.on('learning-stored', learning => {
      callback(this.convertToCanonicalEvent(learning));
    });
  }
}
```

**Data Flow: Intelligence Domain**

```
INPUT ADAPTERS (Data Collection)
├── Extension System → Custom patterns/ADRs
├── WebSocket → Analysis triggers
├── Pathway Tests → Test failures
└── Agent Emissions → FUTURE
           ↓
    PROCESSING LOGIC
    ├── AgentBrainCore (orchestrator)
    ├── LearningSystem (analyze, store, propagate)
    └── PatternSystem (match, validate, version)
           ↓
    OUTPUT PROVIDER
    └── IntelligenceProvider → CanonicalEvents
              ↓
        DataOrchestrator
              ↓
      All Visualizations (Timeline, Dashboard, etc.)
```

**Critical: Dashboard API Eliminated**

The intelligence domain previously had a `dashboard-api.ts` with GET endpoints for patterns, learnings, and metrics. **This is now eliminated** because:

- Dashboard is now a **Visualization** registered in VisualizationRegistry
- Dashboard queries DataOrchestrator for CanonicalEvents (just like Timeline)
- All visualizations are peers consuming from the same orchestrator
- No separate REST API needed

**This is how timeline and agent-brain merge into one unified architecture.**

---

### domains/providers/ - Data Acquisition Layer (Tier 1)

**Purpose:** Convert external data sources into CanonicalEvents

**Key principle:** Each provider handles one data source type. Providers are responsible for transforming source-specific data into universal CanonicalEvent format.

**Structure:**
```
providers/
├── base/              [Provider interface, registry, config]
├── git/               [Local git repository]
├── github/            [GitHub API]
├── intelligence/      [NEW: Intelligence as Provider]
│   └── IntelligenceProvider.ts   [Wraps learning/pattern domains]
└── agents/            [FUTURE: Coding agent emissions]
    ├── AgentEmissionProvider.ts      [Aggregates all agent adapters]
    ├── adapters/
    │   ├── ClaudeCodeAdapter.ts
    │   ├── CursorAdapter.ts
    │   ├── CopilotAdapter.ts
    │   └── CommitMessageAdapter.ts
    └── types.ts
```

**All Providers (Current & Future):**
1. **GitProvider** - Local git commits, branches, tags
2. **GitHubProvider** - PRs, issues, releases from GitHub API
3. **IntelligenceProvider** (NEW Phase 7) - Learnings, patterns detected
4. **AgentEmissionProvider** (FUTURE Phase 9) - Agent coding activities

**Every provider emits CanonicalEvents. Every visualization consumes from DataOrchestrator.**
```

**Agent Provider Architecture:**

```typescript
// Each adapter knows how to interpret one agent's emissions
interface IAgentAdapter {
  agentType: string;  // 'claude', 'cursor', 'copilot'
  canHandle(emission: any): boolean;
  convertToEvent(emission: any): CanonicalEvent;
}

// Provider aggregates all adapters
class AgentEmissionProvider implements IDataProvider {
  private adapters: IAgentAdapter[] = [];

  registerAdapter(adapter: IAgentAdapter): void {
    this.adapters.push(adapter);
  }

  async fetchEvents(context): Promise<CanonicalEvent[]> {
    const emissions = await this.collectEmissions(context);
    return emissions
      .map(e => this.findAdapter(e)?.convertToEvent(e))
      .filter(Boolean);
  }
}
```

**Why agent emissions belong here:**
- They are **data sources** (like git, GitHub)
- They emit **events** that belong on the timeline
- Developers want to see: "When did Claude edit this file?"
- Natural fit with timeline's chronological view

**Integration with Learning:**
Agent emissions feed learning system **after** they become events:
```
Agent Activity
  ↓
AgentAdapter.convertToEvent()
  ↓
CanonicalEvent(AGENT_ACTION)
  ↓
  ├─→ DataOrchestrator → Timeline
  └─→ LearningSystem.processEvent() → IntelligenceProvider → Timeline
```

---

### domains/visualization/ - Timeline Rendering & UI

**Purpose:** Transform events into interactive D3-based timeline visualization

**Key principle:** Visualization is **pure presentation**. No business logic, no intelligence, just rendering.

**Contents:**
- **timeline/**: D3 renderers (main, event, legend, interaction)
- **filters/**: Filter UI and state management
- **ui/**: Range selector, timeline controls
- **webview/**: Browser-based app, safe logging
- **styles/**: CSS for all visual components
- **theme/**: Colors, shapes, z-index rules
- **orchestration/**: `DataOrchestrator.ts` - Coordinates providers, filtering, caching

**Note:** DataOrchestrator currently lives here because it's visualization-centric (manages data for timeline). If we add more visualization types, we might promote it to infrastructure. For now, it stays in this domain.

---

### domains/extension/ - VSCode Integration

**Purpose:** Minimal glue layer between VSCode API and core platform

**Key principle:** Isolate VSCode-specific code. Rest of core is platform-agnostic.

**Contents:**
- **providers/**: VSCode webview lifecycle management
- **commands/**: VSCode command handlers
- **activation/**: Extension startup orchestration

**Why minimal:** Most logic lives in other domains. This is just the VSCode-specific wrapper.

---

### infrastructure/ - Cross-Cutting Concerns

**Purpose:** Capabilities used by all domains

**Key additions:**

#### registries/ (NEW)
Unified registry pattern for all pluggable components:
- `Registry.ts` - Base implementation (register, unregister, health checks)
- `DataProviderRegistry.ts` - Specialized for data providers
- `VisualizationRegistry.ts` - **NEW** - Specialized for visualizations

**Why elevated to peer status:**
- Providers and visualizations are symmetrical concepts (input/output plugins)
- Both need health monitoring, lifecycle management, configuration
- VisualizationRegistry enables future visualization types (graph, heatmap, etc.)

#### logging/
Logger with pathway support, already mature

#### testing/
Pathway testing framework, with **NEW** addition:
- `PathwayLearningAdapter.ts` - Connects pathway test failures to learning system

**This closes the feedback loop:**
```
Pathway Test Fails
  ↓
PathwayReporter generates JSON
  ↓
PathwayLearningAdapter converts to TestFailure
  ↓
LearningSystem.processFailure()
  ↓
Pattern learned
  ↓
IntelligenceProvider creates LEARNING_STORED event
  ↓
Timeline shows the learning
```

---

## Data Flows

### Flow 0: Initial Load (Core Operation)

```
User opens file in VS Code
    ↓
TimelineProvider detects repo path
    ↓
DataOrchestrator.getEvents(repoPath)
    ↓
Check cache (cache miss on first load)
    ↓
ProviderRegistry.getHealthyProviders()
    → Returns: [GitProvider, GitHubProvider, IntelligenceProvider]
    ↓
For each provider in parallel:
  GitProvider.fetchEvents(context)
    ↓
  GitEventRepository.extractGitEvents()
    ↓
  Git commands execute (log, branch, tag)
    ↓
  Transform GitEvent → CanonicalEvent (ONCE, at source)
    ↓
  Return CanonicalEvent[]

  GitHubProvider.fetchEvents(context)
    ↓
  GitHubClient.fetchPRs/Issues/Releases()
    ↓
  Transform GitHub API → CanonicalEvent (ONCE, at source)
    ↓
  Return CanonicalEvent[]

  IntelligenceProvider.fetchEvents(context)
    ↓
  LearningSystem.getAllLearnings() + PatternSystem.getPatterns()
    ↓
  Transform Learning/Pattern → CanonicalEvent (ONCE, at source)
    ↓
  Return CanonicalEvent[]
    ↓
DataOrchestrator aggregates all CanonicalEvent[]
    ↓
Sort by timestamp, deduplicate
    ↓
Cache in DataOrchestrator (per repo)
    ↓
postMessage(CanonicalEvent[]) to webview
    ↓
SimpleTimelineApp.handleTimelineData()
    ↓
D3TimelineRenderer.renderData()
    ↓
Timeline renders with full data (git + github + intelligence)
```

**Key principle:** Transform ONCE at provider boundary. Everything downstream works with CanonicalEvent.

---

### Flow 1: Filter Application

```
User applies branch filter (e.g., selects "main" branch only)
    ↓
FilterController emits filter change event
    ↓
SimpleTimelineApp.handleFilterUpdate()
    ↓
postMessage(filterState) to extension host
    ↓
DataOrchestrator.getFilteredEvents(filters)
    ↓
Get cached CanonicalEvent[] (NO network call, NO re-transform)
    ↓
Apply filters (inline, pure function):
  events.filter(e =>
    filters.branches.includes(e.branches) &&
    filters.authors.includes(e.author.name) &&
    filters.eventTypes.includes(e.type) &&
    e.timestamp >= filters.dateRange.start &&
    e.timestamp <= filters.dateRange.end
  )
    ↓
Return filtered CanonicalEvent[]
    ↓
postMessage(filtered CanonicalEvent[]) to webview
    ↓
D3TimelineRenderer.update(filteredEvents)
    ↓
Timeline re-renders with filtered data
    ↓
Legend updates (shows only visible event types)
```

**Key principle:** Filter on cached CanonicalEvents. No provider calls. Fast.

---

### Flow 2: Range Selector (Time Window)

```
User drags brush on range selector (mini timeline at bottom)
    ↓
InteractionHandler.onBrushMove()
    ↓
Calculate new date range from brush position:
  start = xScale.invert(brushSelection[0])
  end = xScale.invert(brushSelection[1])
    ↓
Filter events to date range (client-side, no postMessage):
  visibleEvents = allEvents.filter(e =>
    e.timestamp >= start && e.timestamp <= end
  )
    ↓
D3TimelineRenderer.update(visibleEvents)
    ↓
Main timeline updates to show events in range
    ↓
Y-axis rescales if needed
    ↓
Smooth transition animation (D3)
```

**Key principle:** Entirely client-side. No extension host involved. Instant feedback.

---

### Flow 3: Intelligence Extension Triggered Analysis

```
External system (CI/CD, IDE action, WebSocket) triggers analysis
    ↓
POST /api/analyze { files: ['src/validator.ts'] }
    OR
WebSocket emit('trigger-analysis', files)
    ↓
AnalysisTrigger.handleRequest()
    ↓
AgentBrainCore.analyzeFiles(files)
    ↓
PatternEngine.detectPatterns(code)
    ↓
PatternValidator.validateAgainstADRs(patterns)
    ↓
If new pattern detected:
  LearningStorage.storePattern(pattern)
    ↓
  WebSocket emit('pattern-discovered', pattern)
    ↓
  IntelligenceProvider creates new CanonicalEvent
    ↓
  DataOrchestrator cache updated
    ↓
  postMessage to all connected webviews
    ↓
  Timeline updates in real-time (new PATTERN_DETECTED event appears)
```

**Key principle:** Intelligence input adapters → processing → CanonicalEvent output → timeline visualization. Same flow as git/github.

---

### Flow 4: Agent Emission → Timeline (Direct) [FUTURE - Phase 9]

```
1. User action in Claude Code
   ↓
2. Claude Code emits activity data
   ↓
3. ClaudeCodeAdapter.convertToEvent()
   Creates: CanonicalEvent {
     type: AGENT_FILE_EDIT,
     timestamp: 2025-10-05T10:30:00Z,
     title: "Claude edited validator.ts",
     metadata: { agent: 'claude', changes: '+20 -5' }
   }
   ↓
4. AgentEmissionProvider.fetchEvents() aggregates from all adapters
   ↓
5. DataOrchestrator.getEvents() combines with git, GitHub events
   ↓
6. Timeline renders: commit → agent edit → commit
```

**Pathway Test:**
```typescript
// tests/pathways/providers/agent-emission-ingestion.pathway.test.ts
it('should complete agent emission ingestion pathway', () => {
  const asserter = new PathwayAsserter(LogPathway.DATA_INGESTION)
    .expectMilestone('AgentEmissionProvider.fetchEvents')
    .expectMilestone('ClaudeCodeAdapter.convertToEvent')
    .expectMilestone('DataOrchestrator.aggregateEvents')
    .expectMilestone('Timeline.render');

  // Simulate Claude emission
  emitClaudeActivity({ file: 'test.ts', action: 'edit' });

  expect(asserter).toCompletePathway();
});
```

---

### Flow 2: Agent Emission → Learning → Timeline (Meta)

```
1. Agent emission becomes CanonicalEvent (see Flow 1)
   ↓
2. LearningSystem.processEvent() analyzes agent activity
   Detects: Repeated pattern of adding null checks
   ↓
3. LearningAnalyzer.analyzePattern()
   Creates: LearningPattern {
     name: "Null Safety Pattern",
     category: "type-safety",
     confidence: 0.92
   }
   ↓
4. LearningStorage.storePattern()
   ↓
5. IntelligenceProvider.fetchEvents()
   Creates: CanonicalEvent {
     type: PATTERN_DETECTED,
     timestamp: 2025-10-05T10:30:05Z,
     title: "Pattern: Null Safety",
     metadata: { triggeredBy: 'claude', confidence: 0.92 }
   }
   ↓
6. DataOrchestrator aggregates intelligence events
   ↓
7. Timeline displays:
   - Agent edit (direct event)
   - Pattern detected (meta event, 5s later)
```

**Pathway Test:**
```typescript
// tests/pathways/integration/agent-emission-to-learning.pathway.test.ts
it('should complete agent-to-learning pathway', async () => {
  const asserter = new PathwayAsserter(LogPathway.LEARNING_CYCLE)
    .expectMilestone('AgentEmissionProvider.fetchEvents')
    .expectMilestone('LearningSystem.processEvent')
    .expectMilestone('LearningAnalyzer.analyzePattern')
    .expectMilestone('LearningStorage.storePattern')
    .expectMilestone('IntelligenceProvider.fetchEvents');

  emitClaudeActivity({ file: 'test.ts', pattern: 'null-check' });
  await waitForLearning();

  expect(asserter).toCompletePathway();
});
```

---

### Flow 3: Pathway Test Failure → Learning (Feedback Loop)

```
1. Pathway test fails (e.g., filter-apply.pathway.test.ts)
   ↓
2. PathwayReporter generates pathway-results.json
   {
     pathway: "FILTER_APPLY",
     status: "failed",
     debugAnalysis: { hypotheses: [...], checklist: [...] }
   }
   ↓
3. PathwayLearningAdapter.convertToTestFailure()
   Creates: TestFailure {
     test: "filter-apply pathway",
     error: "Failed at milestone 'FilterController.applyFilter'",
     context: { hypotheses: [...] }
   }
   ↓
4. LearningSystem.processFailure()
   ↓
5. Pattern learned: "Filter state not synchronized before apply"
   ↓
6. IntelligenceProvider creates LEARNING_STORED event
   ↓
7. Timeline shows learning (developer sees system learned from test)
```

**This is powerful:** Tests don't just verify behavior—they **teach the system**.

---

## Testing Strategy

### Pathway Testing Across All Domains

**Coverage:**

**Intelligence Domain:**
- `pattern-detection.pathway.test.ts` - Code → PatternEngine → Pattern
- `learning-cycle.pathway.test.ts` - Failure → Analysis → Storage → Pattern
- `suggestion-generation.pathway.test.ts` - Context → Analysis → Suggestions

**Provider Domain:**
- `git-ingestion.pathway.test.ts` - Repo → GitProvider → Events
- `github-ingestion.pathway.test.ts` - API → GitHubProvider → Events
- `agent-emission-ingestion.pathway.test.ts` - Emission → AgentProvider → Events

**Visualization Domain:**
- `timeline-render.pathway.test.ts` - Events → D3 → DOM
- `filter-apply.pathway.test.ts` - Filter change → Re-render
- `range-selector.pathway.test.ts` - Slider → Brush → Viewport update

**Integration (Cross-Domain):**
- `git-to-timeline.pathway.test.ts` - Git → Provider → Orchestrator → Timeline
- `agent-emission-to-learning.pathway.test.ts` - Agent → Learning → Intelligence events
- `learning-to-visualization.pathway.test.ts` - Learning → Provider → Timeline
- `end-to-end.pathway.test.ts` - All domains together

**Pathway testing validates:**
1. ✅ Data flows through layers correctly
2. ✅ Each milestone is reached in sequence
3. ✅ Failures pinpoint exact location
4. ✅ AI-debuggable output for automated fixing
5. ✅ Tests feed learning system (feedback loop)

---

## Future Enhancements (Not Now)

### Intelligence Helper System

**When to add:** After all current data flows are working and pathway-tested.

**What it does:** Cross-event correlation, temporal analysis, anomaly detection

**Example:**
```typescript
class IntelligenceHelper {
  async enrich(events: CanonicalEvent[]): Promise<EnrichedEvent[]> {
    return this.analyzers.reduce(
      (enriched, analyzer) => analyzer.analyze(enriched),
      events
    );
  }
}

// Analyzers:
- CorrelationAnalyzer: "Pattern X applied after commit Y that fixed bug Z"
- TemporalAnalyzer: "Learning effectiveness increasing over time"
- AnomalyDetector: "Unusual spike in pattern propagation"
```

**Integration:**
```typescript
class DataOrchestrator {
  constructor(
    private providers: ProviderRegistry,
    private intelligence?: IntelligenceHelper  // Optional
  ) {}
}
```

**Trigger:** When we have real use cases for cross-event insights.

---

### Additional Visualization Types

**When to add:** After timeline visualization is mature and we have specific use cases.

**Candidates:**
- **Pattern Graph:** Node-link diagram showing pattern dependencies
- **Learning Progress:** Line chart of learning effectiveness over time
- **Code Heatmap:** File-based complexity/change frequency visualization

**Architecture ready:** VisualizationRegistry already supports this.

```typescript
visualizationRegistry.register(
  new PatternGraphVisualization({
    renderer: 'force-directed-graph',
    capabilities: { supportsInteraction: true }
  })
);
```

---

## Migration from Current State

### Phase 1: Foundation
1. Delete `packages/timeline/` (13MB duplicate code)
2. Create new `packages/core/` structure
3. Move shared types to `core/src/domains/events/`

### Phase 2: Intelligence
1. Move pattern/learning code to `core/src/domains/intelligence/`
2. Create `PathwayLearningAdapter.ts`
3. Add intelligence pathway tests

### Phase 3: Providers
1. Move git/github providers to `core/src/domains/providers/`
2. Create `core/src/domains/providers/agents/`
3. Implement first agent adapter (Claude Code)
4. Add provider pathway tests

### Phase 4: Visualization
1. Move timeline code to `core/src/domains/visualization/`
2. Move orchestrator to `visualization/orchestration/`
3. Create `VisualizationRegistry` in infrastructure
4. Register TimelineVisualization

### Phase 5: Testing
1. Move pathway testing to `core/src/infrastructure/testing/`
2. Create pathway tests for all domains
3. Implement pathway → learning feedback loop

### Phase 6: Extension Wrapper
1. Create minimal `packages/extension/`
2. Move VSCode-specific glue code
3. Configure build/packaging

**Each phase:**
- Has git checkpoint
- Maintains passing tests
- Incrementally migrates functionality

---

## Comparison: Before vs After

### Directory Count
- **Before:** 4 packages (shared, core, timeline, vscode), fragmented concerns
- **After:** 2 packages (core, extension), cohesive domains

### Lines of Code
- **Before:** ~60,000 LOC (including 13MB duplication)
- **After:** ~47,000 LOC (duplication removed)

### Test Infrastructure
- **Before:** Two separate (core: Jest, vscode: Pathway)
- **After:** One unified (pathway testing for everything)

### Data Flows
- **Before:** Unclear integration points, manual type conversions
- **After:** Clear tier system (providers → orchestrator → visualizations)

### Agent Integration
- **Before:** No clear integration point
- **After:** First-class providers with adapter pattern

### Learning Integration
- **Before:** Isolated in core package
- **After:** Integrated as both consumer and provider of events

### Visualization Flexibility
- **Before:** Hardcoded timeline
- **After:** Registry-based, ready for multiple visualization types

---

## Open Questions (Answered)

### 1. Domain Naming
**Approved:** `events`, `intelligence`, `providers`, `visualization`, `extension`

### 2. Infrastructure Location
**Approved:** Testing utilities in `infrastructure/testing/`

### 3. Extension Package
**Approved:** Keep as minimal wrapper

### 4. Documentation Location
**Approved:** Elevate to root `docs/` directory

### 5. Rendering Engine Variations
**Decision:** Not useful for this use case. Timeline uses D3 SVG. If performance becomes an issue, add Canvas as implementation detail of TimelineVisualization, not as separate registered type.

---

## Conclusion

This architecture:
- ✅ **Cohesive:** Related concepts together, organized by domain
- ✅ **Decoupled:** Clear boundaries, registry-based plugin systems
- ✅ **Testable:** Pathway testing throughout, tests feed learning
- ✅ **Maintainable:** No duplication, clear locations, single source of truth
- ✅ **Pragmatic:** Solves real problems, defers complexity until needed
- ✅ **Future-proof:** Ready for agent integration, multiple visualizations, intelligence helpers
- ✅ **Two-Tiered:** Agent emissions as first-tier sources, learning as meta-interpretation
- ✅ **Symmetric:** Provider registry (input) peers with visualization registry (output)

**Status:** Approved and ready for implementation

---

## Appendix: Key Insights from Architectural Discussion

### Why Agent Emissions are Tier-1 Data Sources

From the architectural review session, the decision to make agent emissions first-tier providers (rather than processed inputs to intelligence) came from this key insight:

> "Coders will want to see when a coding agent did what, that fits with the timeline, branch, and event concepts."

This means:
1. Agent activities are **events** just like commits
2. They deserve timeline visualization immediately
3. They fit the chronological narrative developers expect
4. Learning can **also** consume them (dual purpose)

**This is different from:** Treating agent emissions as "raw data for intelligence processing only." They are valuable **as events** in their own right.

### Why Learning is Meta-Interpretation, Not Just Analysis

The learning system:
1. **Consumes** events (agent emissions, test failures, pathway results)
2. **Processes** them into patterns
3. **Emits** new events (learnings, patterns detected)

This creates a **meta layer:** Events about events. Patterns about activities.

**Example:**
- Direct event: "Claude edited validator.ts at 10:30am"
- Meta event: "Null safety pattern detected at 10:30:05am (triggered by Claude's edit)"

Both appear on the timeline, showing **what happened** and **what was learned**.

### Why Intelligence Helper is Deferred

From the discussion:
> "Keep current architecture in place, with consideration for an intelligence helper system, but not until all integration data flows work and are tested."

**Rationale:**
- Don't add abstraction before feeling the pain
- Get basic flows working first (agent → timeline, learning → timeline)
- Pathway test everything
- **Then** add cross-event intelligence if use cases emerge

This is **pragmatic architecture:** Build what's needed now, prepare for future enhancements.

### Why Visualization Registry is Peer to Provider Registry

The insight that these are **symmetric** concepts:
- **Providers** answer: "Where does data come from?" (Input plugins)
- **Visualizations** answer: "How do we show data?" (Output plugins)

Both need:
- Registration/lifecycle management
- Health monitoring
- Configuration
- Plugin architecture

**This symmetry** justifies elevating visualization registry to infrastructure, as a peer to provider registry.

### Why Rendering Engine Variations Don't Matter

From discussion:
> "I am not sure why different rendering engines are even useful?"

**Analysis:**
- D3 SVG works well for timeline visualization
- Canvas/WebGL offer performance benefits **only** at scale (10,000+ events)
- Current use case: Hundreds of events, not thousands
- Adding rendering engine abstraction adds complexity without clear benefit

**Decision:** Use D3. If performance becomes an issue (unlikely), add Canvas renderer as **implementation detail** of TimelineVisualization, not as user-selectable option.

---

**Document Version History:**
- v1.0 (Initial proposal) - Collapsed architecture
- v2.0 (After first review) - Added three-layer model
- v3.0 (Current) - Two-tiered providers, learning as meta-layer, visualization registry elevation
