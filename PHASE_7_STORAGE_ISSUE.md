# Phase 7 Follow-up: Persistent Storage Issue

**Date:** 2025-10-05
**Status:** 🔴 ISSUE IDENTIFIED - Needs Fix

## Problem

**Learnings and patterns do NOT survive VSCode restarts** because we're using in-memory storage.

### Current Implementation

**File:** `packages/core/src/domains/visualization/orchestration/DataOrchestrator.ts` (line 123)

```typescript
const learningSystem = new LearningSystem();  // ❌ Uses MemoryLearningStorage by default
```

**File:** `packages/core/src/domains/intelligence/core/learning/LearningSystem.ts` (line 31)

```typescript
this.storage = config?.storage || new MemoryLearningStorage();  // ❌ In-memory only
```

### Impact

- ❌ Learnings lost on VSCode restart
- ❌ Patterns lost on VSCode restart
- ❌ ADRs (Architectural Decision Records) lost on VSCode restart
- ❌ No persistence across sessions

## Solution

We already have `FileLearningStorage` implemented! We just need to use it.

### Option 1: Use Workspace-Scoped Storage (RECOMMENDED)

Store learnings per workspace in `.agent-brain/` directory:

```typescript
// In DataOrchestrator.initialize()
const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
const storagePath = workspaceRoot
  ? path.join(workspaceRoot, '.agent-brain', 'patterns.json')
  : path.join(os.homedir(), '.agent-brain', 'patterns.json');

const learningSystem = new LearningSystem({
  storage: new FileLearningStorage(storagePath)
});
```

**Pros:**
- ✅ Learnings specific to each project
- ✅ Can be committed to git (if desired)
- ✅ Team can share learnings
- ✅ Survives VSCode restarts

**File structure:**
```
my-project/
  .agent-brain/
    patterns.json       # Learning patterns
    adrs.json          # Architectural decisions (future)
  src/
  package.json
```

### Option 2: Use VSCode ExtensionContext Storage

Use VSCode's built-in workspace state:

```typescript
// In extension.ts, pass to DataOrchestrator
const storagePath = context.storageUri?.fsPath
  || context.globalStorageUri.fsPath;

const learningSystem = new LearningSystem({
  storage: new FileLearningStorage(path.join(storagePath, 'patterns.json'))
});
```

**Pros:**
- ✅ Managed by VSCode
- ✅ Survives restarts
- ✅ Per-workspace isolation

**Cons:**
- ❌ Not easily shareable with team
- ❌ Harder to inspect/debug

### Option 3: Hybrid Approach (BEST)

Use workspace storage with fallback to extension storage:

```typescript
const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
const storagePath = workspaceRoot
  ? path.join(workspaceRoot, '.agent-brain', 'patterns.json')  // Workspace-scoped
  : path.join(context.globalStorageUri.fsPath, 'patterns.json'); // Fallback to global

const learningSystem = new LearningSystem({
  storage: new FileLearningStorage(storagePath)
});
```

## Pattern Storage Structure

The `FileLearningStorage` implementation already exists and is production-ready:

### Storage Format (JSON)

```json
[
  {
    "id": "pattern_1733435923789_x7k2m9p",
    "name": "TypeScript Type Error Pattern",
    "category": "compilation",
    "description": "Missing type definition for interface property",
    "rootCause": {
      "type": "missing-type",
      "location": "src/types.ts:42"
    },
    "preventionRule": {
      "trigger": "interface.*{",
      "check": "all properties have types"
    },
    "fixApproach": "Add explicit type annotation",
    "service": "core",
    "confidenceScore": 0.95,
    "autoFixable": false,
    "occurrences": 3
  }
]
```

### Features Already Implemented

✅ **Load on startup** - `loadFromFile()` in constructor
✅ **Save on store** - `saveToFile()` after every pattern add
✅ **Auto-create directory** - Creates `.agent-brain/` if missing
✅ **Error handling** - Gracefully handles missing file
✅ **Similarity matching** - Finds related patterns
✅ **Update/Delete** - Full CRUD operations

## PatternSystem Storage

**Current Status:** PatternSystem also needs persistent storage.

**File:** `packages/core/src/domains/intelligence/core/patterns/PatternSystem.ts`

Check if it has similar storage needs for detected patterns.

## Recommended Implementation Steps

1. **Update DataOrchestrator** to use FileLearningStorage
2. **Add workspace path resolution** (requires VSCode context)
3. **Pass ExtensionContext to DataOrchestrator** (architecture change needed)
4. **Add .agent-brain/ to .gitignore** (optional - team decision)
5. **Test persistence** across VSCode restarts

## Alternative: Configuration-Based Storage

Add to VSCode settings:

```json
{
  "agentBrain.storage.location": "workspace" | "global",
  "agentBrain.storage.path": ".agent-brain"
}
```

## Quick Fix (Immediate)

**Minimal change to enable persistence:**

```typescript
// In DataOrchestrator.ts
import { createFileLearningSystem } from '../../intelligence';

// Replace:
const learningSystem = new LearningSystem();

// With:
const learningSystem = createFileLearningSystem('.agent-brain/patterns.json');
```

This will store in `.agent-brain/patterns.json` relative to VSCode's working directory.

⚠️ **Note:** This assumes VSCode is opened in the project root. Better solution requires ExtensionContext.

## Verification

After implementing:

1. Add a learning/pattern
2. Restart VSCode
3. Check if learning/pattern still exists
4. Verify `.agent-brain/patterns.json` file created

## Next Steps

Would you like me to:
1. Implement the quick fix (simple change)?
2. Implement the full solution (pass ExtensionContext through)?
3. Add configuration options for storage location?
