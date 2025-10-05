# Migration Sequence - Recreate Then Enhance

**Date:** 2025-10-05
**Status:** Plan Updated - Ready for Part 1

---

## The Correct Sequence

### ✅ PART 1: Recreate What We Have (Phases 1-8)

**Goal:** Get the current working system into the new unified architecture

**What exists today:**
- Timeline visualization (packages/vscode/) - **WORKING**
  - Git provider, GitHub provider
  - D3 visualization, filters, orchestrator
  - 149 pathway tests passing

- Agent-brain intelligence (packages/core/) - **WORKING**
  - Pattern engine, learning analyzer, storage
  - WebSocket API, dashboard server
  - Unit tests passing

**What we need to do:**
1. Reorganize into domain structure (events, providers, visualization, intelligence, infrastructure)
2. Create IntelligenceProvider to expose learnings as CanonicalEvents
3. Register IntelligenceProvider with DataOrchestrator
4. Connect WebSocket for real-time learning events
5. Create PathwayLearningAdapter (pathway test failures → learning system)
6. Verify everything still works

**Result after Part 1:**
- Working extension with unified architecture
- Timeline shows: **Git commits + GitHub PRs/issues + Learnings**
- All 149 tests + new intelligence tests passing
- .vsix package ready

---

### ⏸️ PART 2: Add New Capability (Phases 9-11)

**Goal:** Add agent emission tracking (NEW capability - doesn't exist yet)

**What doesn't exist yet:**
- Agent emission providers ❌
- Prompt-based event model ❌
- Agent activity rollup ❌
- ClaudeCodeAdapter ❌

**What we'll build (AFTER Part 1 is complete):**
1. Create agent emission infrastructure
2. Implement AgentActivityRollup types
3. Implement RollupToEventConverter
4. Implement ClaudeCodeAdapter with prompt-based sessions
5. Capture user prompts from VSCode
6. Register AgentEmissionProvider with DataOrchestrator
7. Create agent emission pathway tests

**Result after Part 2:**
- Timeline shows: **Git commits + PRs + Learnings + Agent tasks**
- Prompt-based event model working
- Agent activities visible on timeline

---

### 🏁 PART 3: Finalization (Phase 12)

**Goal:** Polish and optimize

- Create VisualizationRegistry
- Performance optimization
- Documentation
- Final packaging

---

## Why This Sequence?

### ❌ Wrong Approach (What We Almost Did)
```
Phase 1-6: Reorganize structure
Phase 7: Build agent emissions (NEW)  ← TOO EARLY!
Phase 8: Extension wrapper
```

**Problem:** We'd be building new features before we've proven the existing ones work in the new structure.

### ✅ Correct Approach (Updated Plan)
```
Part 1 (Phases 1-8): Recreate everything that exists
  └─ CHECKPOINT: Verify it all works
Part 2 (Phases 9-11): Build agent emissions (NEW)
  └─ CHECKPOINT: Verify new capability works
Part 3 (Phase 12): Polish
```

**Why this is better:**
1. **Prove the foundation first** - Get Git, GitHub, Intelligence working in new structure
2. **Test incrementally** - Each phase verifies existing functionality
3. **Reduce risk** - Don't mix reorganization with new features
4. **Clear checkpoints** - Know exactly when existing functionality is safe

---

## What We're Recreating

### Timeline Visualization (Already Works)
- **From:** packages/vscode/src/visualization/
- **To:** packages/core/src/domains/visualization/
- **Status:** Reorganize existing code, no new features

### Git & GitHub Providers (Already Work)
- **From:** packages/vscode/src/providers/git/, packages/vscode/src/providers/github/
- **To:** packages/core/src/domains/providers/git/, packages/core/src/domains/providers/github/
- **Status:** Reorganize existing code, no new features

### Agent-Brain Intelligence (Already Works)
- **From:** packages/core/src/ (patterns/, learning/, engine/, api/)
- **To:** packages/core/src/domains/intelligence/
- **Status:** Reorganize existing code + create IntelligenceProvider wrapper

---

## What We're Building (Later)

### Agent Emissions (Doesn't Exist)
- **To:** packages/core/src/domains/providers/agents/
- **Status:** NEW capability, implement in Part 2
- **Components:**
  - AgentActivityRollup types
  - RollupToEventConverter
  - ClaudeCodeAdapter
  - Prompt capture infrastructure

---

## Timeline of Features

### Phase 1-8 (Part 1) - Timeline Shows:
```
[Commit] feat: add UserValidator
[PR] Merge pull request #42
[Learning] Pattern detected: Null safety pattern
[Commit] refactor: apply pattern
```

**Data sources:** Git, GitHub, Intelligence (all exist today)

### Phase 9-11 (Part 2) - Timeline Shows:
```
[Commit] feat: add UserValidator
[Agent Task] Add null safety to UserValidator (2m 34s)
  └─ Modified 2 files (+15 -3 lines), 5/5 tests passed
[Learning] Pattern detected: Null safety pattern
[Commit] refactor: apply pattern
```

**Data sources:** Git, GitHub, Intelligence, **Agents** (new!)

---

## Key Decisions

### ✅ Recreate First
- Move timeline visualization to unified structure
- Move agent-brain to unified structure
- Create IntelligenceProvider
- Connect WebSocket
- Verify: Extension works with 3 providers

### ⏸️ Enhance Later
- Build agent emission tracking
- Implement prompt-based events
- Add agent tasks to timeline
- Verify: Extension works with 4 providers

### 🎯 The Rule
**Don't start Part 2 until Part 1 checkpoint is verified!**

---

## Updated Documents

- ✅ [MIGRATION_IMPLEMENTATION_PLAN.md](MIGRATION_IMPLEMENTATION_PLAN.md) - Updated with 3-part sequence
- ✅ [DESIGN_SUMMARY.md](DESIGN_SUMMARY.md) - Updated implementation checklist
- ✅ This document - Migration sequence clarification

---

## Next Action

**Begin Phase 1:** Foundation & Cleanup
- Delete packages/timeline/ (duplicate)
- Create new core package structure
- Set up build configuration

See [MIGRATION_IMPLEMENTATION_PLAN.md](MIGRATION_IMPLEMENTATION_PLAN.md) for detailed steps.
