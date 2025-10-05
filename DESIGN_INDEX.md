# Agent-Brain Platform - Design Documentation Index

**Status:** ✅ Complete Design - Ready for Implementation
**Date:** 2025-10-05

---

## Quick Start

### For Understanding the System
If you're new to this project, read in this order:

1. **[DESIGN_SUMMARY.md](DESIGN_SUMMARY.md)** - Start here! High-level overview
2. **[ARCHITECTURE_DESIGN_V3.md](ARCHITECTURE_DESIGN_V3.md)** - Complete architectural specification
3. **[PROMPT_BASED_EVENT_MODEL.md](PROMPT_BASED_EVENT_MODEL.md)** - The key innovation (Part 2 only)
4. **[CANONICAL_EVENT_DESIGN.md](CANONICAL_EVENT_DESIGN.md)** - Event model deep dive (Part 2 only)

### For Implementation
If you're ready to start building:

1. **[MIGRATION_SEQUENCE.md](MIGRATION_SEQUENCE.md)** - **START HERE!** Recreate vs Enhance approach
2. **[MIGRATION_IMPLEMENTATION_PLAN.md](MIGRATION_IMPLEMENTATION_PLAN.md)** - Detailed implementation steps
3. Execute Part 1 (Phases 1-8) - Recreate what we have
4. Execute Part 2 (Phases 9-11) - Add agent emissions (later)
5. Execute Part 3 (Phase 12) - Finalize

**Important:** Agent emissions (Phases 9-11) are NEW capability - don't start until Part 1 is complete!

---

## Core Design Documents

### 1. DESIGN_SUMMARY.md
**Purpose:** Executive summary of entire design
**Audience:** Everyone - developers, architects, stakeholders
**Key Sections:**
- Architectural layers (Data → Orchestration → Visualization)
- Data structures (AgentActivityRollup, CanonicalEvent)
- Implementation checklist
- Industry alignment
- Design principles achieved

**Why read this:** Best starting point to understand the complete system

---

### 2. ARCHITECTURE_DESIGN_V3.md
**Purpose:** Complete architectural specification
**Audience:** Architects, senior developers
**Key Sections:**
- Design principles (domain-driven, testing-first, cohesion)
- Package structure (domains, infrastructure, extension)
- Architectural decisions (two-tiered providers, learning as meta-layer)
- Data flows (agent → timeline, agent → learning → timeline)
- Testing strategy (pathway testing throughout)

**Why read this:** Definitive source for architectural decisions and rationale

**Key Decisions:**
- ✅ Agent emissions as first-tier data sources
- ✅ Learning system as meta-interpretation layer
- ✅ Visualization registry as peer to provider registry
- ✅ Intelligence Helper deferred until tested
- ✅ Prompt-based event boundaries

---

### 3. CANONICAL_EVENT_DESIGN.md
**Purpose:** Event model specification for agent emissions
**Audience:** Developers implementing agent integration
**Key Sections:**
- Event boundary model (prompt → work → prompt/timeout)
- Session boundary detection (primary: prompts, secondary: timeout)
- Activity rollup structure (intermediate aggregation)
- Conversion to CanonicalEvent (rollup → event)
- Capturing user prompts (VSCode extension integration)
- Visualization implications (timeline display, drill-down)

**Why read this:** Solves "What is a CanonicalEvent?" for agent activity

**Breakthrough Insight:**
```
Event = [User Prompt] → [Agent Work] → [Next User Prompt | Timeout]
```
User's prompt text becomes event title (explicit intent, no inference!)

---

### 4. PROMPT_BASED_EVENT_MODEL.md
**Purpose:** Visual guide to prompt-based events
**Audience:** All developers, especially those implementing adapters
**Key Sections:**
- Visual flow diagram (user prompt → rollup → event → timeline)
- Data structure examples (with real values)
- Session lifecycle (happy path, timeout, interruption)
- Implementation components (adapter, converter, provider)
- Timeline drill-down mockups
- Industry comparison

**Why read this:** Best visual explanation of the core innovation

**What you'll learn:**
- How user prompts define event boundaries
- How activities accumulate in rollups
- How rollups convert to timeline events
- How drill-down provides detailed view

---

### 5. MIGRATION_IMPLEMENTATION_PLAN.md
**Purpose:** Step-by-step implementation guide
**Audience:** Developers executing the migration
**Key Sections:**
- 10-phase migration plan (23-33 hours)
- Current state analysis (what's working, what needs migration)
- Detailed steps for each phase (bash commands, file changes)
- Git checkpoint instructions
- Testing verification at each step

**Why read this:** Your roadmap for implementation

**Critical Principle:**
Preserve 149 passing pathway tests throughout migration

**Phase 7 (Agent Emissions) includes:**
- AgentActivityRollup types
- ClaudeCodeAdapter implementation
- RollupToEventConverter implementation
- AgentEmissionProvider implementation
- EventType enum extensions

---

## Supporting Documents

### UNIFIED_PLATFORM_MIGRATION.md
**Purpose:** Migration tracking (historical)
**Status:** ✅ Complete
**Content:** Shows all 6 migration steps from two repos to unified monorepo

### Migration Progress Documents
**Location:** `packages/vscode/`
**Files:**
- `MIGRATION_COMPLETE.md` - Pathway testing migration results
- `MIGRATION_PROGRESS.md` - Detailed migration log
- `PATHWAY_MIGRATION_PLAN.md` - Original pathway migration plan

**Status:** All marked complete ✅

---

## Architecture At A Glance

### Package Structure
```
packages/
├── core/                          [All business logic]
│   ├── domains/
│   │   ├── events/               [CanonicalEvent system]
│   │   ├── intelligence/         [Patterns, learning]
│   │   ├── providers/            [Git, GitHub, Agents]
│   │   │   └── agents/           [NEW: Agent emissions]
│   │   │       ├── adapters/     [Claude, Cursor, Copilot]
│   │   │       └── rollup/       [Session aggregation]
│   │   ├── visualization/        [Timeline, filters]
│   │   └── extension/            [VSCode glue]
│   ├── infrastructure/
│   │   ├── registries/           [Provider & Viz registries]
│   │   ├── logging/
│   │   └── testing/              [Pathway framework]
│   └── tests/pathways/
└── extension/                     [Minimal VSCode wrapper]
```

### Data Flow
```
User Prompt
  ↓
ClaudeCodeAdapter (accumulates activity)
  ↓
AgentActivityRollup (intermediate)
  ↓
RollupToEventConverter
  ↓
CanonicalEvent (timeline-ready)
  ↓
DataOrchestrator (aggregates with git/github)
  ↓
Timeline Visualization
```

### Event Structure
```typescript
CanonicalEvent {
  title: "Add null safety to UserValidator",  // User's exact prompt
  description: "Modified 2 files (+15 -3 lines), 5/5 tests passed",
  metadata: {
    userPrompt: "Add null safety to UserValidator",
    sessionDuration: 154,
    activities: { filesModified: [...], testsRun: [...], ... },
    testsPass: true
  }
}
```

---

## Key Innovations

### 1. Prompt-Based Event Boundaries
**Problem:** What granularity for agent events?
**Solution:** User prompts define event boundaries
**Benefits:**
- Explicit intent (user's words)
- Natural boundaries (prompts or timeout)
- Logical units (one task = one event)
- No heuristics needed

### 2. Two-Tiered Provider Architecture
**Problem:** How to integrate agent emissions and learning?
**Solution:**
- Tier 1: Agent emissions as direct events (visible on timeline)
- Tier 2: Learning system processes emissions into patterns (meta-events)
**Benefits:**
- Developers see agent activity immediately
- Learning creates meta-interpretation layer
- Both appear on timeline (direct + learned patterns)

### 3. Rollup-to-Event Conversion
**Problem:** How to capture detailed activity without overwhelming timeline?
**Solution:**
- Accumulate activities in AgentActivityRollup (intermediate)
- Convert to single CanonicalEvent with rollup in metadata
- Timeline shows summary, drill-down shows details
**Benefits:**
- Right granularity for timeline
- Full detail preserved for drill-down
- User intent (prompt) as event title

### 4. Pathway Testing Throughout
**Problem:** How to ensure quality across entire codebase?
**Solution:**
- Pathway testing for all domains (events, providers, visualization, intelligence)
- Tests emit structured logs for AI debugging
- Failed pathway tests feed learning system (feedback loop)
**Benefits:**
- Tests verify data flows end-to-end
- AI can debug failures automatically
- System learns from its own test failures

---

## Industry Alignment

### Comparison with Standards

| Approach | Event Boundary | Intent | Our Model |
|----------|----------------|--------|-----------|
| **LSP** | File lifecycle | No | ❌ Too fine |
| **Copilot** | 24h windows | Inferred | ❌ Too coarse |
| **Git** | Explicit commit | Commit msg | ✅ Similar! |
| **Ours** | User prompt | Explicit | ✅ **Optimal** |

**We combine the best of all:**
- Explicit boundaries like git commits
- Natural sessions like LSP
- Intent capture like commit messages
- But **before** work happens (prompt vs commit message)

---

## Implementation Timeline

### Phases 1-6: Core Migration (15-19 hours)
- Delete timeline package duplicate
- Create core package structure
- Move domains: events, providers, visualization, intelligence
- Move infrastructure: logging, testing, registries
- Create IntelligenceProvider
- **Checkpoint:** 149 tests still passing

### Phase 7: Agent Emissions (4-5 hours)
- Create agent provider structure
- Implement rollup infrastructure
- Implement ClaudeCodeAdapter
- Implement RollupToEventConverter
- Update AgentEmissionProvider
- Add EventType.AGENT_TASK_COMPLETED
- **Checkpoint:** Agent emission pathway test passing

### Phases 8-10: Final Integration (7-10 hours)
- Create extension wrapper
- Expand pathway tests
- Register all components
- Package extension
- **Checkpoint:** All tests passing, extension working

**Total: 23-33 hours over 3-5 days**

---

## Testing Strategy

### Pathway Tests by Domain

**Intelligence:**
- pattern-detection.pathway.test.ts
- learning-cycle.pathway.test.ts
- suggestion-generation.pathway.test.ts

**Providers:**
- git-ingestion.pathway.test.ts
- github-ingestion.pathway.test.ts
- **agent-emission-ingestion.pathway.test.ts** (NEW)

**Visualization:**
- timeline-render.pathway.test.ts
- filter-apply.pathway.test.ts
- range-selector.pathway.test.ts

**Integration:**
- git-to-timeline.pathway.test.ts
- **agent-emission-to-learning.pathway.test.ts** (NEW)
- **learning-to-visualization.pathway.test.ts** (NEW)
- end-to-end.pathway.test.ts

**Current Status:** 149 passing (100% success rate)
**Target:** 149 + new agent tests passing

---

## Design Principles Checklist

✅ **Domain-Driven Design** - Package structure by capability
✅ **Testing as First-Class** - Pathway tests throughout
✅ **Cohesion Over Separation** - Related concepts together
✅ **Single Source of Truth** - No duplication
✅ **Progressive Enhancement** - Layers enhance each other
✅ **Two-Tiered Data Flow** - Direct + meta interpretation
✅ **Symmetric Registries** - Input (providers) + output (visualizations)
✅ **Pragmatic Architecture** - Build needed, defer complexity
✅ **Event-Driven** - Immutable events flow through system
✅ **Intent-Explicit** - User prompts capture intent

---

## Questions & Answers

### Q: Why not capture every file edit as an event?
**A:** Too granular. Timeline would be overwhelmed with noise. One task (user prompt) = one event is the right abstraction.

### Q: How do we know when a task ends?
**A:** Two ways: (1) User sends next prompt, (2) 5 min idle timeout. Both are explicit signals.

### Q: What if user interrupts session (closes IDE)?
**A:** Session marked 'abandoned', partial work captured in rollup, event still created with what was done.

### Q: How to see detailed file changes?
**A:** Click event on timeline to drill down. Full rollup with all activities available in metadata.

### Q: Does this work for Cursor and Copilot too?
**A:** Yes! Same pattern. Each gets an adapter (CursorAdapter, CopilotAdapter) that implements prompt detection and activity accumulation.

### Q: What if there's no explicit user prompt?
**A:** Adapter can create implicit session from first activity (with warning). But best practice is to capture prompts.

### Q: How does learning system use agent events?
**A:** LearningSystem.processEvent() consumes agent events, analyzes patterns (e.g., "Claude often adds null checks"), creates meta-events (PATTERN_DETECTED) that also appear on timeline.

---

## Next Steps

1. **For Architects:** Review ARCHITECTURE_DESIGN_V3.md
2. **For Developers:** Read PROMPT_BASED_EVENT_MODEL.md
3. **For Implementers:** Follow MIGRATION_IMPLEMENTATION_PLAN.md
4. **For Everyone:** Start with DESIGN_SUMMARY.md

**All design complete. Ready to build!** 🚀

---

## Document Relationships

```
DESIGN_INDEX.md (you are here)
    ↓
DESIGN_SUMMARY.md
    ├→ ARCHITECTURE_DESIGN_V3.md (full architecture)
    ├→ CANONICAL_EVENT_DESIGN.md (event model)
    ├→ PROMPT_BASED_EVENT_MODEL.md (visual guide)
    └→ MIGRATION_IMPLEMENTATION_PLAN.md (implementation)

Supporting:
- UNIFIED_PLATFORM_MIGRATION.md (migration history)
- packages/vscode/MIGRATION_*.md (pathway migration)
```

**Start with DESIGN_SUMMARY.md, drill down as needed.**
