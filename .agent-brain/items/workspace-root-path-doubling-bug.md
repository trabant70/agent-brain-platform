---
title: Workspace Root Path Doubling Bug
type: learning
scope: project
tags: providers, paths, configuration, bug-fix
source: knowledge-events-not-showing
author: Agent Session
version: 1
---

# Workspace Root Path Doubling Bug

## Problem
Knowledge events and session journals weren't showing on timeline. Providers couldn't find event data files.

## Root Cause
**Path doubling**: `./.agent-brain/.agent-brain/events/knowledge-events.json`

The problem occurred because:
1. `DataOrchestrator` has `storagePath` = `./.agent-brain`
2. This was passed to providers as `workspaceRoot`
3. Providers then constructed: `path.join(workspaceRoot, '.agent-brain', 'events')`
4. Result: `./.agent-brain/.agent-brain/events/` (doubled!)

## Expected vs Actual

**Expected**:
- `workspaceRoot` = `.` (project root)
- Provider constructs: `./.agent-brain/events/knowledge-events.json` ✅

**Actual (before fix)**:
- `workspaceRoot` = `./.agent-brain` (storage path)
- Provider constructs: `./.agent-brain/.agent-brain/events/knowledge-events.json` ❌

## Solution

Extract parent directory from `storagePath` before passing to providers:

```typescript
// DataOrchestrator.ts - Knowledge provider registration
const workspaceRoot = this.storagePath.replace(/\/?\.agent-brain\/?$/, '') || '.';
await this.providerRegistry.registerProvider(knowledgeProvider, {
  enabled: true,
  settings: {
    workspaceRoot: workspaceRoot  // Now '.' instead of './.agent-brain'
  }
});
```

**Regex explanation**: `replace(/\/?\.agent-brain\/?$/, '')`
- Remove trailing `.agent-brain` (with optional leading/trailing slashes)
- If result is empty, default to `.` (current directory)

## Lesson

**Variable naming matters**:
- `storagePath` = Where to store `.agent-brain` directory
- `workspaceRoot` = Project root directory (parent of `.agent-brain`)

Don't conflate these two concepts. Providers expect `workspaceRoot`, not `storagePath`.

## Detection

Check file paths in provider logs:
```
[KnowledgeEventProvider] Loading from: ./.agent-brain/.agent-brain/events/  ❌
[KnowledgeEventProvider] Loading from: ./.agent-brain/events/               ✅
```

## Related
- `DataOrchestrator.ts` lines 159-193
- `KnowledgeEventStorage.ts` lines 32-34
- `SessionFileSystem.ts` (similar pattern)
- Version: 0.2.28
