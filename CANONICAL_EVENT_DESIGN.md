# Canonical Event Design for Agent Emissions

## Executive Summary

**Design Decision**: User prompts define event boundaries for coding agent activity.

**Rationale**:
- User prompts provide explicit intent without inference
- Natural session boundaries align with logical units of work
- Aligns with industry patterns (Copilot sessions, LSP lifecycle)
- Simplifies implementation - no heuristic boundary detection needed

## Event Boundary Model

### Core Principle
```
Event = [User Prompt] → [Agent Work] → [Next User Prompt | Timeout]
```

### Event Structure
```typescript
CanonicalEvent {
  // Identity
  id: 'agent-task-${timestamp}-${hash}',
  canonicalId: generateCanonicalId(userPrompt, timestamp),
  providerId: 'agent-emissions',
  type: EventType.AGENT_TASK_COMPLETED,

  // Temporal
  timestamp: taskEndTime,

  // Content - User's intent explicitly captured
  title: userPromptText, // "Add null safety to UserValidator"
  description: generateSummary(rollup), // "Modified 2 files, added 15 lines, removed 3 lines"

  // Attribution
  author: {
    id: agentId, // 'claude-code', 'cursor', 'copilot'
    name: agentDisplayName,
    email: 'agent@platform'
  },

  // Context - Agent-specific (not git-specific)
  branches: [currentBranch], // Maintain compatibility
  hash: undefined, // No git commit yet

  // Relationships
  parentIds: [previousTaskEventId], // Link sequential tasks
  childIds: [], // Populated by subsequent tasks

  // Metrics - Aggregate impact
  impact: {
    filesChanged: rollup.activities.filesModified.length,
    linesAdded: rollup.totalLinesAdded,
    linesRemoved: rollup.totalLinesRemoved
  },

  // Visualization
  visualization: {
    icon: 'robot',
    color: agentColor, // claude: purple, cursor: blue
    priority: 'medium',
    tags: ['agent', agentType, ...inferredTags]
  },

  // Extensibility - Detailed drill-down data
  metadata: {
    // User Context
    userPrompt: userPromptText,
    userIntent: inferredIntent, // Optional AI classification

    // Session Details
    sessionId: sessionId,
    sessionDuration: endTime - startTime,
    idleTimeout: false, // or true if timeout triggered

    // Detailed Activities (for drill-down)
    activities: {
      filesModified: [
        {
          path: 'src/validators/UserValidator.ts',
          changeType: 'modified',
          linesAdded: 12,
          linesRemoved: 2,
          editCount: 5
        },
        // ... more files
      ],
      testsRun: [
        {
          testFile: 'UserValidator.test.ts',
          status: 'passed',
          timestamp: testTime
        }
      ],
      commandsExecuted: [
        { command: 'npm test', exitCode: 0, timestamp: cmdTime }
      ]
    },

    // Quality Indicators
    testsPass: true,
    buildSuccess: true,
    errorsEncountered: 0,

    // Agent Metadata
    agentVersion: '1.0.0',
    conversationTurns: 3, // Multi-turn refinement
    modelUsed: 'claude-sonnet-4-5'
  }
}
```

## Session Boundary Detection

### Primary: User Prompt Signals
**Explicit Start**: User sends new prompt/task
**Explicit End**: User sends next prompt (previous task finalized)

### Secondary: Timeout Strategy
**Idle Timeout**: 5 minutes of no agent activity
- Finalizes current event
- Marks as 'completed' or 'abandoned' based on state

**Session Close**: IDE/extension closed
- Immediate finalization
- Marks current state (completed if tests passing, abandoned if incomplete)

### Edge Cases
1. **Interrupted Session**: User closes IDE mid-work
   - Status: 'abandoned'
   - Capture partial work in rollup
   - Next session creates new event (no parent relationship)

2. **Multi-Turn Refinement**: User sends follow-up to refine same task
   - Creates new event with parent relationship
   - Original event remains immutable
   - Shows iteration in timeline

3. **Background Tasks**: Long-running test suites
   - Include in rollup when completed
   - Event finalized when all tasks complete OR timeout

## Activity Rollup Structure

### Internal Rollup (Not a CanonicalEvent)
```typescript
interface AgentActivityRollup {
  // Session Identity
  sessionId: string;
  agentId: string; // 'claude-code', 'cursor'

  // User Intent
  userPrompt: string; // Explicit trigger
  inferredIntent?: string; // Optional AI classification

  // Temporal Boundaries
  startTime: Date; // When prompt received
  endTime?: Date; // When next prompt or timeout

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

interface FileModification {
  path: string;
  changeType: 'created' | 'modified' | 'deleted';
  linesAdded: number;
  linesRemoved: number;
  editCount: number;
  timestamp: Date;
}
```

### Conversion: Rollup → CanonicalEvent
```typescript
class RollupToEventConverter {
  convert(rollup: AgentActivityRollup): CanonicalEvent {
    return {
      id: `agent-task-${rollup.startTime.getTime()}-${hash(rollup.userPrompt)}`,
      type: EventType.AGENT_TASK_COMPLETED,
      timestamp: rollup.endTime || new Date(),

      title: rollup.userPrompt, // User's exact words
      description: this.generateSummary(rollup),

      author: {
        id: rollup.agentId,
        name: getAgentDisplayName(rollup.agentId)
      },

      impact: {
        filesChanged: rollup.totalFiles,
        linesAdded: rollup.totalLinesAdded,
        linesRemoved: rollup.totalLinesRemoved
      },

      metadata: {
        userPrompt: rollup.userPrompt,
        sessionDuration: (rollup.endTime - rollup.startTime) / 1000,
        activities: rollup.activities, // Full detail for drill-down
        testsPass: rollup.testsPass,
        status: rollup.status
      }
    };
  }

  private generateSummary(rollup: AgentActivityRollup): string {
    const parts: string[] = [];

    if (rollup.totalFiles > 0) {
      parts.push(`Modified ${rollup.totalFiles} file${rollup.totalFiles > 1 ? 's' : ''}`);
    }

    if (rollup.totalLinesAdded > 0 || rollup.totalLinesRemoved > 0) {
      parts.push(`+${rollup.totalLinesAdded} -${rollup.totalLinesRemoved} lines`);
    }

    if (rollup.activities.testsRun.length > 0) {
      const passed = rollup.activities.testsRun.filter(t => t.status === 'passed').length;
      parts.push(`${passed}/${rollup.activities.testsRun.length} tests passed`);
    }

    return parts.join(', ') || 'Agent task completed';
  }
}
```

## Capturing User Prompts

### VSCode Extension Integration
```typescript
// In ClaudeCodeAdapter or agent interface
interface AgentInterface {
  onUserPrompt(prompt: string): void;
  onAgentActivity(activity: AgentActivity): void;
  onSessionEnd(): void;
}

class ClaudeCodeAdapter implements AgentInterface {
  private currentRollup: AgentActivityRollup | null = null;

  onUserPrompt(prompt: string): void {
    // Finalize previous task if exists
    if (this.currentRollup) {
      this.finalizeAndEmitEvent(this.currentRollup);
    }

    // Start new rollup
    this.currentRollup = {
      sessionId: generateSessionId(),
      agentId: 'claude-code',
      userPrompt: prompt,
      startTime: new Date(),
      activities: { filesModified: [], testsRun: [], commandsExecuted: [], errorsEncountered: [] },
      totalEdits: 0,
      totalFiles: 0,
      totalLinesAdded: 0,
      totalLinesRemoved: 0,
      status: 'in-progress',
      testsPass: false,
      buildSuccess: false
    };

    // Start idle timeout watcher
    this.startIdleWatcher();
  }

  onAgentActivity(activity: AgentActivity): void {
    if (!this.currentRollup) return;

    // Accumulate activity
    this.currentRollup.activities.filesModified.push(activity.fileChange);
    this.currentRollup.totalEdits++;
    // ... update metrics

    // Reset idle timer
    this.resetIdleWatcher();
  }

  private startIdleWatcher(): void {
    this.clearIdleWatcher();
    this.idleTimer = setTimeout(() => {
      this.finalizeAndEmitEvent(this.currentRollup!, 'timeout');
    }, 5 * 60 * 1000); // 5 minutes
  }
}
```

## Industry Alignment

### Comparison Matrix

| Approach | Boundary | Intent Capture | Granularity | Our Choice |
|----------|----------|----------------|-------------|------------|
| **LSP Events** | didOpen → didClose | No | File session | ❌ Too fine |
| **Copilot Telemetry** | 24h windows | Inferred | Aggregated | ⚠️ Too coarse |
| **Git Commits** | Explicit commit | Commit message | Logical change | ✅ Similar! |
| **Our Prompt-Based** | User prompt | Explicit | Task completion | ✅ **OPTIMAL** |

### Why Prompt-Based Wins
1. **Explicit Intent**: User states goal in prompt (like commit message, but before work)
2. **Natural Boundaries**: Prompts are clear session markers
3. **Logical Units**: Each prompt = one task/request
4. **No Inference**: Don't need to guess when task starts/ends
5. **Drill-Down Ready**: Rollup structure provides all details

## Visualization Implications

### Timeline Display
```
[User Icon] User Prompt: "Add null safety to UserValidator"
    └─> [Robot Icon] Agent Task Completed (2m 34s)
        ├─ Modified 2 files (+15 -3 lines)
        ├─ Tests: 5/5 passed ✅
        └─ Build: Success ✅

        [Click to expand detailed activities]
```

### Drill-Down View
```
📋 Task Details
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User Prompt: "Add null safety to UserValidator"
Duration: 2m 34s
Agent: Claude Code (Sonnet 4.5)

📁 Files Modified (2)
  ├─ src/validators/UserValidator.ts
  │  └─ +12 -2 lines (5 edits)
  └─ src/validators/UserValidator.test.ts
     └─ +3 -1 lines (2 edits)

🧪 Tests Run (1)
  └─ UserValidator.test.ts ✅ Passed

💻 Commands Executed (1)
  └─ npm test (exit 0)
```

## Implementation Checklist

### Phase 1: Foundation
- [ ] Add `EventType.AGENT_TASK_COMPLETED` to CanonicalEvent enum
- [ ] Create `AgentActivityRollup` interface
- [ ] Create `RollupToEventConverter` class
- [ ] Add agent-specific visualization icons/colors

### Phase 2: Capture Infrastructure
- [ ] Create `AgentInterface` for capturing prompts/activities
- [ ] Implement `ClaudeCodeAdapter` with rollup accumulation
- [ ] Add idle timeout watcher (5 min default)
- [ ] Handle session close/interruption

### Phase 3: Provider Integration
- [ ] Create `AgentEmissionProvider` implementing `IDataProvider`
- [ ] Register with `ProviderRegistry`
- [ ] Emit `CanonicalEvent[]` from rollups
- [ ] Add health monitoring

### Phase 4: Testing
- [ ] Create pathway test: Agent task capture
- [ ] Create pathway test: Multi-turn refinement
- [ ] Create pathway test: Idle timeout handling
- [ ] Create pathway test: Session interruption

## Future Enhancements

### V2: Multi-Agent Support
- Track concurrent agent sessions (Claude + Cursor)
- Attribute changes to correct agent
- Show parallel work on timeline

### V3: Intent Classification
- Optional AI classification of user intent
- Tag events: 'feature', 'bugfix', 'refactor', 'docs'
- Enable intent-based filtering

### V4: Learning Integration
- Pass completed events to learning system
- Detect patterns: "User often asks for null safety after validators"
- Suggest proactive actions

## Conclusion

**The prompt-based event model provides**:
- ✅ Explicit intent capture (user's own words)
- ✅ Natural session boundaries (no heuristics)
- ✅ Logical work units (one task = one event)
- ✅ Industry alignment (similar to git commits)
- ✅ Rich drill-down (full activity rollup in metadata)
- ✅ Simple implementation (clear start/end signals)

This design is **ready for implementation** in Phase 7 of the migration plan.
