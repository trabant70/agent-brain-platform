# Agent-Brain Platform - Design Summary

**Status:** ✅ Complete Design - Ready for Implementation
**Date:** 2025-10-05

---

## Executive Summary

The Agent-Brain Platform architecture is fully designed with all critical decisions finalized. The system combines:
- **Timeline Visualization** - Observable development events
- **Pattern Intelligence** - Learning from code patterns and agent behavior
- **Pathway Testing** - Milestone-based verification framework
- **Agent Integration** - First-class support for AI coding assistants

**Key Innovation:** User prompts define event boundaries for agent activity, creating natural, intent-driven sessions that appear on the timeline.

---

## Design Documents

### 1. [ARCHITECTURE_DESIGN_V3.md](ARCHITECTURE_DESIGN_V3.md)
**Purpose:** Complete architectural specification
**Status:** ✅ Approved

**Key Decisions:**
- Domain-driven package structure (events, intelligence, providers, visualization)
- Two-tiered provider architecture (agent emissions → learning system)
- Visualization registry as peer to provider registry
- Intelligence Helper deferred until data flows are tested
- Event boundary model: User Prompt → Agent Work → Next Prompt/Timeout

### 2. [CANONICAL_EVENT_DESIGN.md](CANONICAL_EVENT_DESIGN.md)
**Purpose:** Event model specification for agent emissions
**Status:** ✅ Complete

**Solves:** What constitutes a CanonicalEvent for coding agent activity?

**Solution:** Prompt-based event boundaries
```
Event = [User Prompt] → [Agent Work] → [Next User Prompt | Timeout]
```

**Benefits:**
- ✅ Explicit intent capture (user's own words)
- ✅ Natural session boundaries (no heuristics)
- ✅ Logical work units (one task = one event)
- ✅ Industry alignment (similar to git commits)
- ✅ Rich drill-down (full activity rollup in metadata)

**Data Flow:**
```
User Prompt: "Add null safety to UserValidator"
  ↓
Claude edits 2 files, runs tests (accumulated in AgentActivityRollup)
  ↓
Next User Prompt (or 5min idle timeout)
  ↓
RollupToEventConverter creates CanonicalEvent:
  - title: "Add null safety to UserValidator" (user's exact words)
  - description: "Modified 2 files (+15 -3 lines), 5/5 tests passed"
  - metadata: { activities: [...], sessionDuration: 154, testsPass: true }
  ↓
Timeline displays agent task alongside git commits
```

### 3. [MIGRATION_IMPLEMENTATION_PLAN.md](MIGRATION_IMPLEMENTATION_PLAN.md)
**Purpose:** Step-by-step implementation plan
**Status:** ✅ Ready for execution

**10 Phases, 23-33 hours:**
1. Foundation & Cleanup (2-3h)
2. Domain: Events (1-2h)
3. Domain: Providers (2-3h)
4. Domain: Visualization (2-3h)
5. Infrastructure (2-3h)
6. Domain: Intelligence (3-4h)
7. **Agent Emissions (4-5h)** - Implements prompt-based model
8. Extension Wrapper (2-3h)
9. Pathway Tests Expansion (3-4h)
10. Final Integration (2-3h)

**Critical Principle:** Preserve 149 passing pathway tests throughout migration

---

## Architectural Layers

### Layer 1: Data Acquisition (Provider Tier)
**Responsibility:** Convert external sources into CanonicalEvents

**Providers:**
- **GitProvider** - Local repository commits
- **GitHubProvider** - PRs, issues, releases
- **AgentEmissionProvider** - **NEW** - Coding agent tasks
  - ClaudeCodeAdapter (prompt-based sessions)
  - CursorAdapter (planned)
  - CopilotAdapter (planned)
- **IntelligenceProvider** - Learnings, patterns (meta-events)

**Agent Emission Flow:**
```typescript
// User sends prompt
agentProvider.onUserPrompt('claude-code', 'Add null safety to UserValidator');

// Agent works, adapter accumulates activity
claudeAdapter.onAgentActivity({ type: 'file_edit', file: 'UserValidator.ts', ... });
claudeAdapter.onAgentActivity({ type: 'test_run', status: 'passed', ... });

// Next prompt or timeout triggers conversion
const rollup = claudeAdapter.finalizeRollup();
const event = converter.convert(rollup);
// → CanonicalEvent with user prompt as title, full activity in metadata
```

### Layer 2: Orchestration & Aggregation
**Responsibility:** Aggregate, filter, cache events

**DataOrchestrator:**
- Aggregates from all providers (git, github, agents, intelligence)
- Applies user filters (branch, author, date, event type)
- Manages repository-level cache
- Coordinates provider health

**Future Enhancement:** Intelligence Helper for cross-event correlation (deferred)

### Layer 3: Presentation (Visualization Tier)
**Responsibility:** Transform events into visualizations

**Visualization Registry:**
- Current: Timeline (D3-based chronological view)
- Future: Pattern Graph, Learning Chart, Code Heatmap

**Timeline Display Example:**
```
[Commit] feat: add UserValidator
    ↓
[Agent Task] Add null safety to UserValidator (2m 34s)
  ├─ Modified 2 files (+15 -3 lines)
  ├─ Tests: 5/5 passed ✅
  └─ [Click to expand detailed activities]
    ↓
[Commit] refactor: cleanup after null safety
```

---

## Data Structures

### AgentActivityRollup (Intermediate)
```typescript
interface AgentActivityRollup {
  sessionId: string;
  agentId: string;

  // User Intent (explicit)
  userPrompt: string;              // "Add null safety to UserValidator"

  // Temporal Boundaries
  startTime: Date;                 // When prompt received
  endTime?: Date;                  // When next prompt or timeout

  // Accumulated Activities
  activities: {
    filesModified: FileModification[];
    testsRun: TestExecution[];
    commandsExecuted: CommandExecution[];
    errorsEncountered: ErrorEvent[];
  };

  // Aggregate Metrics
  totalEdits: number;
  totalFiles: number;
  totalLinesAdded: number;
  totalLinesRemoved: number;

  // State
  status: 'in-progress' | 'completed' | 'abandoned';

  // Quality
  testsPass: boolean;
  buildSuccess: boolean;
}
```

### CanonicalEvent (Timeline-Ready)
```typescript
interface CanonicalEvent {
  id: string;
  type: EventType.AGENT_TASK_COMPLETED;
  timestamp: Date;

  // User's exact prompt
  title: string;                    // "Add null safety to UserValidator"
  description: string;              // "Modified 2 files (+15 -3 lines), 5/5 tests passed"

  // Agent as author
  author: {
    id: 'claude-code',
    name: 'Claude Code'
  };

  // Aggregate impact
  impact: {
    filesChanged: number;
    linesAdded: number;
    linesRemoved: number;
  };

  // Visualization
  visualization: {
    icon: '🤖',
    color: '#C17E3A',              // Claude brand color
    tags: ['agent', 'claude-code', 'tests-pass']
  };

  // Full rollup for drill-down
  metadata: {
    userPrompt: string;
    sessionDuration: number;
    activities: AgentActivityRollup['activities'];
    testsPass: boolean;
    status: string;
  };
}
```

---

## Implementation Checklist

### PART 1: Core Migration - Recreate What We Have

#### Phases 1-5: Domain Organization (10-14 hours)
- [ ] Delete timeline package (13MB duplicate)
- [ ] Create core package structure
- [ ] Move CanonicalEvent to core/domains/events/
- [ ] Move Git & GitHub providers to core/domains/providers/
- [ ] Move visualization to core/domains/visualization/
- [ ] Move Logger & pathway testing to infrastructure/
- [ ] Create registry infrastructure
- [ ] **Verify: 149 pathway tests still passing** ✅

#### Phase 6: Intelligence Domain (3-4 hours)
- [ ] Move packages/core/ (agent-brain) to core/domains/intelligence/
  - Pattern engine, learning analyzer, learning storage, pattern validator
- [ ] Create IntelligenceProvider (learnings as CanonicalEvents)
- [ ] **Verify: Agent-brain tests still passing** ✅

#### Phase 7: Intelligence Integration (2-3 hours)
- [ ] Register IntelligenceProvider with DataOrchestrator
- [ ] Connect WebSocket for real-time learning events
- [ ] Create PathwayLearningAdapter (pathway failures → learning system)
- [ ] Create intelligence pathway tests
- [ ] **Verify: Timeline shows Git + GitHub + Learning events** ✅

#### Phase 8: Extension Wrapper (2-3 hours)
- [ ] Create minimal packages/extension/
- [ ] Move VSCode-specific glue code
- [ ] Package and verify .vsix
- [ ] **CHECKPOINT: Extension working with 3 providers** ✅

**End of Part 1: Working extension with Git, GitHub, Intelligence**

---

### PART 2: New Capability - Agent Emissions

#### Phase 9: Agent Emission Infrastructure (4-5 hours)
- [ ] Create core/domains/providers/agents/ structure
- [ ] Define types: AgentEmission, AgentActivityRollup, FileModification, etc.
- [ ] Implement RollupToEventConverter
  - [ ] convert(rollup) → CanonicalEvent
  - [ ] generateSummary() - auto-description
  - [ ] Agent colors, icons, display names
- [ ] Create AgentEmissionProvider skeleton
- [ ] Add EventType.AGENT_TASK_COMPLETED to enum

#### Phase 10: Claude Code Adapter (3-4 hours)
- [ ] Implement ClaudeCodeAdapter with:
  - [ ] onUserPrompt() - starts new session
  - [ ] onAgentActivity() - accumulates activity
  - [ ] finalizeRollup() - triggered by next prompt or timeout
  - [ ] Idle timeout watcher (5 min default)
- [ ] Capture user prompts from VSCode extension
- [ ] Unit test adapter in isolation

#### Phase 11: Agent Emissions Integration (2-3 hours)
- [ ] Register AgentEmissionProvider with DataOrchestrator
- [ ] Update timeline to render agent events
- [ ] Create agent emission pathway tests
  - [ ] Agent emission ingestion pathway
  - [ ] Prompt-to-event conversion pathway
  - [ ] Multi-turn refinement pathway
  - [ ] Idle timeout handling pathway
  - [ ] Agent → Learning integration pathway
- [ ] Package and verify
- [ ] **CHECKPOINT: Extension working with 4 providers** ✅

**End of Part 2: Timeline shows agent activities alongside commits and learnings**

---

### PART 3: Finalization

#### Phase 12: Final Integration & Polish (2-3 hours)
- [ ] Create VisualizationRegistry
- [ ] Performance optimization
- [ ] Documentation update
- [ ] Final package and verification
- [ ] **COMPLETE: Production-ready unified platform** ✅

---

## Industry Alignment

### Comparison with Standards

| Approach | Boundary | Intent Capture | Granularity | Our Choice |
|----------|----------|----------------|-------------|------------|
| **LSP Events** | didOpen → didClose | No | File session | ❌ Too fine |
| **Copilot Telemetry** | 24h windows | Inferred | Aggregated | ⚠️ Too coarse |
| **Git Commits** | Explicit commit | Commit message | Logical change | ✅ Similar! |
| **Our Prompt-Based** | User prompt | Explicit | Task completion | ✅ **OPTIMAL** |

**Why Prompt-Based Wins:**
1. **Explicit Intent:** User states goal in prompt (like commit message, but before work)
2. **Natural Boundaries:** Prompts are clear session markers
3. **Logical Units:** Each prompt = one task/request
4. **No Inference:** Don't need to guess when task starts/ends
5. **Drill-Down Ready:** Rollup structure provides all details

---

## Design Principles Achieved

✅ **Domain-Driven:** Package structure organized by capability
✅ **Testing First-Class:** Pathway testing throughout
✅ **Cohesion Over Separation:** Related concepts together
✅ **Single Source of Truth:** No duplication
✅ **Progressive Enhancement:** Layers enhance each other
✅ **Two-Tiered Data Flow:** Emissions → Learning → Visualization
✅ **Symmetric Registries:** Provider (input) peers with Visualization (output)
✅ **Pragmatic Architecture:** Build what's needed, defer complexity
✅ **Event-Driven:** Immutable events flow through system
✅ **Intent-Explicit:** User prompts capture intent without inference

---

## Next Steps

### Immediate (Part 1 - Core Migration)
1. **Review this summary** with team
2. **Begin Phase 1** - Foundation & cleanup
3. **Execute Phases 2-8** - Recreate working extension with unified architecture
4. **Maintain git checkpoints** after each phase
5. **Test incrementally** - verify 149 tests stay passing
6. **CHECKPOINT:** Working extension showing Git + GitHub + Intelligence on timeline

### Future (Part 2 - Agent Emissions)
7. **Execute Phases 9-11** - Add agent emission tracking capability
8. **Implement Claude Code adapter** with prompt-based sessions
9. **Create agent pathway tests**
10. **CHECKPOINT:** Timeline shows agent activities alongside commits and learnings

### Finalization (Part 3)
11. **Execute Phase 12** - Polish and optimize
12. **COMPLETE:** Production-ready unified platform

**Critical:** Don't start Part 2 (agent emissions) until Part 1 (core migration) is complete and working!

---

## Key Insights

### The User Prompt as Event Boundary
The decision to use user prompts as event boundaries was the breakthrough that simplified the entire agent activity model:

**Before (Complex):**
- Need heuristics to detect session boundaries
- Infer user intent from activity patterns
- Complex state machines for session lifecycle
- Ambiguous event granularity

**After (Simple):**
- User prompt = explicit session start
- User's words = explicit intent (no inference!)
- Next prompt or timeout = explicit session end
- Event = complete user request with detailed rollup

**This aligns perfectly with:**
- How developers think ("I asked Claude to add null safety")
- Git commit model (one logical change = one commit)
- Industry patterns (Copilot sessions, LSP lifecycle)
- Timeline visualization (show what user requested, when)

### Learning as Meta-Interpretation
Learning system is both consumer AND provider:
- **Consumes:** Agent emissions, pathway test failures, code patterns
- **Processes:** Extracts patterns, validates learnings
- **Emits:** New events (PATTERN_DETECTED, LEARNING_STORED)

This creates a **feedback loop** where the system learns from its own activities and displays those learnings on the timeline alongside the original events.

### Intelligence Helper Deferred (Pragmatic)
Don't add cross-event correlation until we have:
- Real use cases requiring it
- Working data flows to test with
- Pathway tests validating basic functionality

**Build what's needed now, prepare for future enhancements.**

---

**All design decisions complete. Ready for implementation.**
