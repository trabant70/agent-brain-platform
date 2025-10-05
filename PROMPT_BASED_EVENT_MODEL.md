# Prompt-Based Event Model - Visual Guide

**The Breakthrough Design Decision**

---

## The Problem We Solved

**Question:** What constitutes a CanonicalEvent for coding agent activity?

**Challenges:**
- ❌ Every keystroke? (too granular)
- ❌ Every file save? (too many events)
- ❌ Time windows? (arbitrary boundaries)
- ❌ Inferred sessions? (requires heuristics)

**Solution:** Let the user tell us through their prompts! 🎯

---

## The Prompt-Based Model

### Core Principle
```
Event = [User Prompt] → [Agent Work] → [Next User Prompt | Timeout]
```

### Why This Works

1. **Explicit Intent** - User states their goal in the prompt
2. **Natural Boundaries** - Prompts are clear session markers
3. **Logical Units** - One task request = one event
4. **No Guesswork** - Don't need to infer when sessions start/end
5. **Industry Aligned** - Similar to git commits, Copilot sessions

---

## Visual Flow

### Scenario: Developer Using Claude Code

```
┌─────────────────────────────────────────────────────────────┐
│ User Types Prompt                                            │
│ "Add null safety to UserValidator"                          │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ ClaudeCodeAdapter.onUserPrompt()                             │
│ • Finalizes previous session (if any)                        │
│ • Creates new AgentActivityRollup                           │
│ • Stores user prompt as title                               │
│ • Starts idle timeout watcher (5 min)                       │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Agent Works (Activities Accumulate)                          │
│                                                              │
│ Activity 1: Edit UserValidator.ts (+12 -2 lines)            │
│   → ClaudeCodeAdapter.onAgentActivity()                     │
│   → Accumulates in rollup.activities.filesModified          │
│   → Resets idle timer                                       │
│                                                              │
│ Activity 2: Edit UserValidator.test.ts (+3 -1 lines)        │
│   → ClaudeCodeAdapter.onAgentActivity()                     │
│   → Accumulates in rollup.activities.filesModified          │
│   → Resets idle timer                                       │
│                                                              │
│ Activity 3: Run tests (npm test)                            │
│   → ClaudeCodeAdapter.onAgentActivity()                     │
│   → Accumulates in rollup.activities.testsRun               │
│   → Updates rollup.testsPass = true                         │
│   → Resets idle timer                                       │
└────────────────────────┬────────────────────────────────────┘
                         ↓
                    ┌────────┐
                    │ OR     │
                    └────────┘
         ┌──────────────┴──────────────┐
         ↓                              ↓
┌──────────────────┐         ┌──────────────────────┐
│ Next User Prompt │   OR    │ 5 Min Idle Timeout   │
└────────┬─────────┘         └──────────┬───────────┘
         └──────────────┬───────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ ClaudeCodeAdapter.finalizeRollup()                           │
│ • Sets rollup.endTime = now                                  │
│ • Sets rollup.status = 'completed'                          │
│ • Clears idle timer                                         │
│ • Returns AgentActivityRollup                               │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ RollupToEventConverter.convert()                             │
│                                                              │
│ AgentActivityRollup → CanonicalEvent                        │
│                                                              │
│ • title: "Add null safety to UserValidator" (user's words)  │
│ • description: "Modified 2 files (+15 -3 lines), ..."       │
│ • timestamp: rollup.endTime                                 │
│ • author: { id: 'claude-code', name: 'Claude Code' }        │
│ • impact: { filesChanged: 2, linesAdded: 15, ... }          │
│ • metadata: { activities: [...], sessionDuration: 154, ... }│
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ AgentEmissionProvider.fetchEvents()                          │
│ Returns: CanonicalEvent[]                                    │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ DataOrchestrator.getEvents()                                 │
│ Aggregates: Git events + Agent events + Intelligence events  │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Timeline Visualization                                       │
│                                                              │
│ [Commit] feat: add UserValidator                            │
│     ↓                                                        │
│ [Agent Task] Add null safety to UserValidator (2m 34s)      │
│   ├─ Modified 2 files (+15 -3 lines)                        │
│   ├─ Tests: 5/5 passed ✅                                   │
│   └─ [Click to expand detailed activities]                  │
│     ↓                                                        │
│ [Commit] refactor: cleanup after null safety                │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Structures

### 1. AgentActivityRollup (Intermediate)

**Purpose:** Accumulate activity between prompts

**NOT a CanonicalEvent** - This is internal to the adapter

```typescript
interface AgentActivityRollup {
  // Session Identity
  sessionId: 'claude-session-1633024800-xyz123',
  agentId: 'claude-code',

  // User Intent (EXPLICIT - no inference!)
  userPrompt: 'Add null safety to UserValidator',

  // Temporal Boundaries
  startTime: Date(2025-10-05T10:30:00Z),
  endTime: Date(2025-10-05T10:32:34Z),

  // Accumulated Activities
  activities: {
    filesModified: [
      {
        path: 'src/validators/UserValidator.ts',
        changeType: 'modified',
        linesAdded: 12,
        linesRemoved: 2,
        editCount: 3,
        timestamp: Date(...)
      },
      {
        path: 'src/validators/UserValidator.test.ts',
        changeType: 'modified',
        linesAdded: 3,
        linesRemoved: 1,
        editCount: 1,
        timestamp: Date(...)
      }
    ],
    testsRun: [
      {
        testFile: 'UserValidator.test.ts',
        status: 'passed',
        timestamp: Date(...),
        duration: 245
      }
    ],
    commandsExecuted: [
      {
        command: 'npm test',
        exitCode: 0,
        timestamp: Date(...)
      }
    ]
  },

  // Aggregate Metrics
  totalEdits: 4,
  totalFiles: 2,
  totalLinesAdded: 15,
  totalLinesRemoved: 3,

  // State
  status: 'completed',

  // Quality
  testsPass: true,
  buildSuccess: true
}
```

### 2. CanonicalEvent (Timeline-Ready)

**Purpose:** Timeline-ready event from rollup

**This IS what appears on the timeline**

```typescript
const event: CanonicalEvent = {
  // Identity
  id: 'agent-task-1633024800-a7b3c9',
  canonicalId: 'agent-claude-code-a7b3c9-1633024800',
  providerId: 'agent-emissions',
  type: EventType.AGENT_TASK_COMPLETED,

  // Temporal
  timestamp: Date(2025-10-05T10:32:34Z),

  // Content (User's exact words!)
  title: 'Add null safety to UserValidator',
  description: 'Modified 2 files (+15 -3 lines), 5/5 tests passed',

  // Attribution
  author: {
    id: 'claude-code',
    name: 'Claude Code',
    email: 'agent@platform'
  },

  // Context (no git context for agent tasks)
  branches: [],
  hash: undefined,

  // Relationships
  parentIds: [], // Could link to previous task
  childIds: [],

  // Metrics (Aggregated from rollup)
  impact: {
    filesChanged: 2,
    linesAdded: 15,
    linesRemoved: 3
  },

  // Visualization
  visualization: {
    icon: '🤖',
    color: '#C17E3A', // Claude brand color
    priority: 'medium',
    tags: ['agent', 'claude-code', 'tests-pass']
  },

  // Extensibility (FULL rollup for drill-down)
  metadata: {
    userPrompt: 'Add null safety to UserValidator',
    sessionId: 'claude-session-1633024800-xyz123',
    sessionDuration: 154, // seconds
    idleTimeout: false,

    // Detailed activities for drill-down
    activities: {
      filesModified: [...],
      testsRun: [...],
      commandsExecuted: [...]
    },

    // Quality indicators
    testsPass: true,
    buildSuccess: true,
    errorsEncountered: 0,

    // Agent metadata
    agentType: 'claude-code',
    status: 'completed'
  }
}
```

---

## Session Lifecycle

### Happy Path: Prompt → Work → Next Prompt

```
User: "Add null safety"
  ↓ onUserPrompt()
[Session Start] status: in-progress
  ↓ onAgentActivity() × 4
[Accumulating...] files: 2, lines: +15 -3, tests: pass
  ↓
User: "Now add to PaymentValidator"
  ↓ onUserPrompt() → finalizes previous session
[Session End] status: completed, duration: 154s
  ↓ convert()
CanonicalEvent created
```

### Alternative: Idle Timeout

```
User: "Add null safety"
  ↓ onUserPrompt()
[Session Start] status: in-progress, timer: 5min
  ↓ onAgentActivity() × 4
[Accumulating...] timer resets on each activity
  ↓ (user goes to lunch)
[5 minutes pass...]
  ↓ timeout triggered
[Session End] status: completed, duration: 154s
  ↓ convert()
CanonicalEvent created
```

### Alternative: Session Interrupted

```
User: "Add null safety"
  ↓ onUserPrompt()
[Session Start] status: in-progress
  ↓ onAgentActivity() × 2
[Accumulating...] files: 1, lines: +8 -0
  ↓
User closes IDE
  ↓ onSessionEnd()
[Session End] status: abandoned, duration: 45s
  ↓ convert()
CanonicalEvent created (partial work captured)
```

---

## Implementation Components

### 1. ClaudeCodeAdapter
**Role:** Accumulate activity, detect boundaries, create rollups

**Key Methods:**
- `onUserPrompt(prompt)` - Start new session, finalize previous
- `onAgentActivity(activity)` - Accumulate into current rollup
- `finalizeRollup()` - End session, return rollup
- `onSessionEnd()` - Handle IDE close

### 2. RollupToEventConverter
**Role:** Transform rollup into timeline-ready CanonicalEvent

**Key Methods:**
- `convert(rollup)` - Main transformation
- `generateSummary(rollup)` - Auto-description
- `getAgentColor/Icon/DisplayName()` - Visualization helpers

### 3. AgentEmissionProvider
**Role:** Aggregate rollups from all adapters, provide to DataOrchestrator

**Key Methods:**
- `registerAdapter(adapter)` - Add Claude, Cursor, Copilot adapters
- `fetchEvents(context)` - Collect rollups, convert to events
- `onUserPrompt(agentType, prompt)` - Forward to correct adapter

---

## Timeline Drill-Down

### Collapsed View (Default)
```
[🤖] Add null safety to UserValidator (2m 34s)
     Modified 2 files (+15 -3 lines), 5/5 tests passed
```

### Expanded View (Click to drill down)
```
┌─────────────────────────────────────────────────────────┐
│ 🤖 Add null safety to UserValidator                     │
│                                                          │
│ Session: claude-session-1633024800-xyz123               │
│ Duration: 2m 34s                                        │
│ Status: Completed ✅                                    │
│                                                          │
│ ───────────────────────────────────────────────────────│
│                                                          │
│ 📁 Files Modified (2)                                   │
│   ├─ src/validators/UserValidator.ts                    │
│   │  └─ +12 -2 lines (3 edits)                         │
│   └─ src/validators/UserValidator.test.ts              │
│      └─ +3 -1 lines (1 edit)                           │
│                                                          │
│ 🧪 Tests Run (1)                                        │
│   └─ UserValidator.test.ts ✅ Passed (245ms)           │
│                                                          │
│ 💻 Commands Executed (1)                                │
│   └─ npm test (exit 0)                                 │
│                                                          │
│ ✅ Quality Checks                                       │
│   • Tests: 5/5 passed                                  │
│   • Build: Success                                      │
│   • Errors: 0                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Comparison with Alternatives

### ❌ Keystroke-Level Events
**Problem:** Thousands of events, noise overwhelms signal
```
[Agent] Typed 'n'
[Agent] Typed 'u'
[Agent] Typed 'l'
[Agent] Typed 'l'
...
❌ Unusable for timeline visualization
```

### ❌ File-Level Events
**Problem:** Multiple files per task, unclear boundaries
```
[Agent] Modified UserValidator.ts
[Agent] Modified UserValidator.test.ts
[Agent] Modified index.ts
...
❌ Where does one task end and another begin?
```

### ❌ Time-Window Events
**Problem:** Arbitrary boundaries, no intent
```
[Agent] Activity (10:30:00 - 10:35:00)
  Modified 3 files
  ❌ What was the user trying to accomplish?
```

### ✅ Prompt-Based Events
**Solution:** Natural, intent-driven, perfect granularity
```
[Agent Task] Add null safety to UserValidator (2m 34s)
  Modified 2 files (+15 -3 lines), 5/5 tests passed
  ✅ Clear intent, logical unit, perfect for timeline
```

---

## Industry Alignment

| System | Event Boundary | Our Similarity |
|--------|----------------|----------------|
| **Git Commits** | Developer decides "this is done" | ✅ User prompt is decision point |
| **Copilot Sessions** | 24h windows or explicit end | ✅ Prompt or timeout ends session |
| **LSP Protocol** | didOpen → didChange → didSave → didClose | ✅ Prompt → activity → finalize |
| **Event Sourcing** | Aggregate boundaries | ✅ Prompt defines aggregate |

**We align with industry best practices while being more explicit about intent.**

---

## Benefits Recap

### For Developers
✅ See **what** they asked for (user's exact words)
✅ See **when** it happened (timeline position)
✅ See **impact** (files, lines, tests)
✅ Drill down for **details** (all activities)

### For the System
✅ No heuristics needed (prompts are explicit)
✅ Natural session boundaries (prompts or timeout)
✅ Logical work units (one task = one event)
✅ Rich context (full rollup in metadata)

### For Timeline Visualization
✅ Right granularity (not too fine, not too coarse)
✅ Clear intent (user's words as title)
✅ Chronological flow (agent tasks among commits)
✅ Interactive drill-down (expand for details)

---

## Next Steps

1. ✅ Design complete (this document)
2. ✅ Architecture approved (ARCHITECTURE_DESIGN_V3.md)
3. ✅ Implementation plan ready (MIGRATION_IMPLEMENTATION_PLAN.md)
4. ⏭️ Begin Phase 7: Implement agent emissions
5. ⏭️ Test with real Claude Code sessions
6. ⏭️ Add Cursor and Copilot adapters

---

**The prompt-based model is the breakthrough that makes agent activity observable, understandable, and actionable.**
