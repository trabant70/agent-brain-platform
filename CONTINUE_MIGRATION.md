# Continue Migration - Prompt for Resuming Work

**Purpose:** Use this prompt to resume migration work after any disruption (context loss, new session, etc.)

---

## Prompt to Continue Migration

```
I'm continuing the Agent-Brain Platform migration. This is a unified monorepo
that combines timeline visualization with agent-brain intelligence.

CONTEXT:
- Repository: c:\projects\agent-brain-platform
- Current State: Migration in progress
- Goal: Unified architecture with domain-driven design
- Critical: 149 pathway tests must keep passing

CURRENT STRUCTURE:
- packages/vscode/ - Timeline visualization (working, needs reorganization)
  - Git provider, GitHub provider, DataOrchestrator
  - D3 visualization, filters, webview
  - 149 pathway tests (passing)

- packages/core/ - Agent-brain intelligence (working, needs integration)
  - Pattern engine, learning analyzer, learning storage
  - WebSocket API, dashboard server

- packages/timeline/ - 13MB duplicate (DELETE in Phase 1)

MIGRATION APPROACH (3 Parts):

PART 1: Recreate What We Have (Phases 1-8)
- Reorganize into unified domain structure
- Create IntelligenceProvider (learnings as CanonicalEvents)
- Connect WebSocket to timeline
- CHECKPOINT: Extension working with Git + GitHub + Intelligence

PART 2: Add New Capability (Phases 9-11) - FUTURE
- Agent emission tracking (NEW - doesn't exist yet)
- Prompt-based event model
- CHECKPOINT: Timeline shows agent activities

PART 3: Finalization (Phase 12)
- Polish and optimize

CRITICAL RULES:
1. Don't start Part 2 until Part 1 is verified working
2. Test after every phase (npm run test:pathways)
3. Git checkpoint after every successful phase
4. Never break the 149 passing tests
5. Agent emissions are NEW - don't implement until Part 1 done

PLEASE:
1. Read MIGRATION_SEQUENCE.md to understand the approach
2. Read MIGRATION_IMPLEMENTATION_PLAN.md for detailed steps
3. Check git status to see what's been done
4. Ask me which phase we're on, or determine from git commits
5. Continue from where we left off
6. Use TodoWrite to track phase progress

FILES TO READ FIRST:
- MIGRATION_SEQUENCE.md - Why we do Part 1 before Part 2
- MIGRATION_IMPLEMENTATION_PLAN.md - Detailed phase steps
- git log --oneline -10 - See recent progress

After reading those files, tell me:
1. What phase we're currently on
2. What's been completed
3. What's the next step
4. Create todos for remaining work in current phase
```

---

## Quick Reference: What Phase Am I On?

Check git log for recent commits:

```bash
git log --oneline -20
```

### Phase Signatures (Git Commit Messages)

**Phase 1:** `feat: create core package structure for unified architecture`
**Phase 2:** `refactor: move CanonicalEvent system to core/domains/events/`
**Phase 3:** `refactor: move data providers to core/domains/providers/`
**Phase 4:** `refactor: move visualization domain to core/domains/visualization/`
**Phase 5:** `refactor: move infrastructure (logging, testing, registries)`
**Phase 6:** `refactor: move intelligence domain and create IntelligenceProvider`
**Phase 7:** `feat: integrate intelligence provider with DataOrchestrator`
**Phase 8:** `refactor: create extension wrapper package`
**Phase 9:** `feat: create agent emission infrastructure` (Part 2 - FUTURE)
**Phase 10:** `feat: implement ClaudeCodeAdapter` (Part 2 - FUTURE)
**Phase 11:** `feat: integrate agent emissions with timeline` (Part 2 - FUTURE)
**Phase 12:** `feat: final integration and polish` (Part 3 - FUTURE)

### Quick Status Check Commands

```bash
# Check test status
npm run test:pathways --prefix packages/vscode

# Check package structure
ls packages/

# Check if core package exists
ls packages/core/src/domains/

# Check current branch
git branch --show-current

# See uncommitted changes
git status
```

---

## Phase Checkpoints

### After Phase 1
- [ ] packages/timeline/ deleted
- [ ] packages/core/ has new structure with domains/
- [ ] lerna.json configured
- [ ] Tests still pass: 149 passing

### After Phase 2
- [ ] core/domains/events/ exists with CanonicalEvent
- [ ] All imports updated in vscode package
- [ ] Tests still pass: 149 passing

### After Phase 3
- [ ] core/domains/providers/ has git/ and github/
- [ ] Imports updated
- [ ] Tests still pass: 149 passing

### After Phase 4
- [ ] core/domains/visualization/ has timeline, filters, orchestration
- [ ] Webpack config updated
- [ ] Tests still pass: 149 passing

### After Phase 5
- [ ] core/infrastructure/ has logging, testing, registries
- [ ] Logger imports updated everywhere
- [ ] Tests still pass: 149 passing

### After Phase 6
- [ ] core/domains/intelligence/ has patterns, learning, engine
- [ ] IntelligenceProvider created
- [ ] Agent-brain tests still pass

### After Phase 7
- [ ] IntelligenceProvider registered with DataOrchestrator
- [ ] WebSocket connected
- [ ] PathwayLearningAdapter created
- [ ] Intelligence pathway tests created
- [ ] **CHECKPOINT: Timeline shows learnings** ✅

### After Phase 8
- [ ] packages/extension/ created
- [ ] VSCode glue code moved
- [ ] .vsix packages successfully
- [ ] **CHECKPOINT: Extension working with 3 providers** ✅
- [ ] **PART 1 COMPLETE** ✅

### After Phase 9 (FUTURE - Part 2)
- [ ] core/domains/providers/agents/ created
- [ ] AgentActivityRollup types defined
- [ ] RollupToEventConverter implemented
- [ ] EventType.AGENT_TASK_COMPLETED added

### After Phase 10 (FUTURE - Part 2)
- [ ] ClaudeCodeAdapter implemented
- [ ] Prompt capture working
- [ ] Idle timeout logic working

### After Phase 11 (FUTURE - Part 2)
- [ ] AgentEmissionProvider registered
- [ ] Timeline renders agent events
- [ ] Agent pathway tests passing
- [ ] **CHECKPOINT: Timeline shows agent tasks** ✅
- [ ] **PART 2 COMPLETE** ✅

### After Phase 12 (FUTURE - Part 3)
- [ ] VisualizationRegistry created
- [ ] Performance optimized
- [ ] Documentation updated
- [ ] **COMPLETE** ✅

---

## Emergency Recovery Commands

If tests are failing after a phase:

```bash
# See what changed
git diff HEAD~1

# Rollback to previous commit
git reset --hard HEAD~1

# Check test output
npm run test:pathways --prefix packages/vscode 2>&1 | tee test-output.log

# Run specific failing test
npx jest path/to/test.ts --prefix packages/vscode
```

---

## Key Files to Reference

### For Understanding
- [MIGRATION_SEQUENCE.md](MIGRATION_SEQUENCE.md) - Why Part 1 before Part 2
- [DESIGN_SUMMARY.md](DESIGN_SUMMARY.md) - Overall design
- [ARCHITECTURE_DESIGN_V3.md](ARCHITECTURE_DESIGN_V3.md) - Architecture details

### For Implementation
- [MIGRATION_IMPLEMENTATION_PLAN.md](MIGRATION_IMPLEMENTATION_PLAN.md) - Step-by-step guide
- Current file (CONTINUE_MIGRATION.md) - Resume prompt

### For Part 2 (Agent Emissions - FUTURE)
- [CANONICAL_EVENT_DESIGN.md](CANONICAL_EVENT_DESIGN.md) - Event model
- [PROMPT_BASED_EVENT_MODEL.md](PROMPT_BASED_EVENT_MODEL.md) - Visual guide

**Don't read Part 2 docs until Part 1 is complete!**

---

## What NOT to Do

❌ **Don't skip to agent emissions** - Part 2 comes after Part 1
❌ **Don't break the tests** - 149 must keep passing
❌ **Don't skip checkpoints** - Verify after each phase
❌ **Don't skip git commits** - Commit after each successful phase
❌ **Don't mix phases** - One phase at a time
❌ **Don't implement new features in Part 1** - Just reorganize existing code

---

## Example Session Start

```
User: I want to continue the migration