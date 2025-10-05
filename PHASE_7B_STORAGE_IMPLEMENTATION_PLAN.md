# Phase 7B: Persistent Storage Implementation Plan

**Date:** 2025-10-05
**Status:** 📋 PLANNING (No Implementation Yet)

## Design Decisions (From Discussion)

### 1. Primary Use Case
✅ **Solo developers** for now, team features later
- Start simple, optimize for individual learning
- Build foundation that can scale to teams

### 2. Privacy/Security
✅ **Sanitization placeholder** for future
- Get it working first
- Add data sanitization later (Phase 8+)
- Document potential privacy concerns

### 3. Complexity
✅ **Simple first**
- Workspace storage only (`.agent-brain/`)
- Global fallback for when no workspace open
- No configuration options initially

### 4. Team Collaboration
✅ **Medium priority**
- Support it, but don't force it
- User chooses to commit or gitignore
- Document both workflows clearly

### 5. Naming
✅ **`.agent-brain/`** folder
- Aligns with agent-brain.io branding
- Clear and descriptive
- Discoverable in file explorer

### 6. Configuration UI
✅ **Timeline configuration pages**
- Settings will be in existing timeline UI
- Will carry over to future visualizations
- Consistent UX across features

### 7. User Communication
✅ **Documentation + User choice**
- Clear README documentation
- User manually chooses to add to .gitignore
- No automatic actions
- No notification popups (for now)

---

## Phase 7B Implementation Plan

### Goal
Make learnings and patterns **survive VSCode restarts** with minimal changes.

---

## Part 1: Core Storage Implementation

### 1.1 Update DataOrchestrator

**File:** `packages/core/src/domains/visualization/orchestration/DataOrchestrator.ts`

**Changes:**

```typescript
// Add to imports
import * as path from 'path';
import * as fs from 'fs/promises';

// Add to DataOrchestratorOptions
export interface DataOrchestratorOptions {
  cacheTTL?: number;
  storagePath?: string;  // NEW: Path to .agent-brain/ directory
}

// Update constructor
constructor(options: DataOrchestratorOptions = {}) {
  this.cacheTTL = options.cacheTTL || 300000;
  this.storagePath = options.storagePath || './.agent-brain'; // Simple default
  // ...
}

// Update initialize()
async initialize(): Promise<void> {
  this.log.info(LogCategory.ORCHESTRATION, 'Initializing DataOrchestrator', 'initialize');

  // NEW: Ensure storage directory exists
  await this.ensureStorageDirectory();

  // Register Git provider (always enabled)
  // ... existing code ...

  // Register Intelligence provider with FILE STORAGE
  try {
    this.log.info(LogCategory.ORCHESTRATION, 'Registering Intelligence provider', 'initialize');

    // NEW: Create file-based storage paths
    const learningsPath = path.join(this.storagePath, 'learnings.json');
    const patternsPath = path.join(this.storagePath, 'patterns.json');

    // NEW: Use FileLearningStorage instead of default memory storage
    const learningSystem = new LearningSystem({
      storage: new FileLearningStorage(learningsPath)
    });

    // NOTE: PatternSystem file storage to be implemented in Part 2
    const patternSystem = new PatternSystem();

    const intelligenceProvider = new IntelligenceProvider(learningSystem, patternSystem);

    await this.providerRegistry.registerProvider(intelligenceProvider, {
      enabled: true,
      priority: 3
    });

    this.log.info(
      LogCategory.ORCHESTRATION,
      `Intelligence provider registered (storage: ${this.storagePath})`,
      'initialize'
    );
  } catch (error) {
    this.log.error(LogCategory.ORCHESTRATION, `Failed to register Intelligence provider: ${error}`, 'initialize');
  }

  this.log.info(LogCategory.ORCHESTRATION, 'Initialization complete', 'initialize');
}

// NEW: Helper to ensure storage directory exists
private async ensureStorageDirectory(): Promise<void> {
  try {
    await fs.mkdir(this.storagePath, { recursive: true });
    this.log.debug(
      LogCategory.ORCHESTRATION,
      `Storage directory ready: ${this.storagePath}`,
      'ensureStorageDirectory'
    );
  } catch (error) {
    this.log.error(
      LogCategory.ORCHESTRATION,
      `Failed to create storage directory: ${error}`,
      'ensureStorageDirectory'
    );
    throw error;
  }
}
```

**Impact:**
- ✅ Learnings now persist to `.agent-brain/learnings.json`
- ✅ Auto-creates directory if missing
- ✅ Logs storage location for debugging
- ⏳ Patterns still in-memory (Part 2)

---

### 1.2 Update TimelineProvider to Pass Storage Path

**File:** `packages/vscode/src/providers/timeline-provider-webpack.ts`

**Changes:**

```typescript
export class TimelineProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'repoTimeline.evolutionView';

  private _view?: vscode.WebviewView;
  private orchestrator: DataOrchestrator;
  private extensionUri: vscode.Uri;
  private currentRepoPath: string = '';

  // NEW: Accept storagePath parameter
  constructor(extensionUri: vscode.Uri, storagePath?: string) {
    this.extensionUri = extensionUri;

    // NEW: Pass storage path to orchestrator
    this.orchestrator = new DataOrchestrator({
      storagePath: storagePath || './.agent-brain'
    });
  }

  // ... rest unchanged
}
```

**Impact:**
- ✅ TimelineProvider can control where storage goes
- ✅ Maintains backward compatibility (default fallback)

---

### 1.3 Update Extension Activation

**File:** `packages/vscode/src/extension.ts`

**Changes:**

```typescript
import * as path from 'path';

export async function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('Repository Timeline');

  log.info(LogCategory.EXTENSION, 'Starting extension activation');
  outputChannel.appendLine('🚀 Activating Repository Timeline Extension...');

  try {
    // NEW: Determine storage location
    const storagePath = getStoragePath(context);
    outputChannel.appendLine(`📂 Intelligence storage: ${storagePath}`);

    // Register the welcome view for the activity bar sidebar
    // ... existing code ...

    // Register the timeline provider for the bottom panel
    log.debug(LogCategory.EXTENSION, 'Creating timeline webview provider', 'registration');
    outputChannel.appendLine('📊 Creating timeline webview provider...');

    // NEW: Pass storage path to TimelineProvider
    timelineProvider = new TimelineProvider(context.extensionUri, storagePath);
    const timelineView = vscode.window.registerWebviewViewProvider(
      TimelineProvider.viewType,
      timelineProvider
    );
    context.subscriptions.push(timelineView);

    // ... rest of existing activation code ...

  } catch (error) {
    // ... existing error handling ...
  }
}

// NEW: Helper function to determine storage path
function getStoragePath(context: vscode.ExtensionContext): string {
  // Try workspace first (preferred)
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  if (workspaceRoot) {
    return path.join(workspaceRoot, '.agent-brain');
  }

  // Fallback to global storage (no workspace open)
  return path.join(context.globalStorageUri.fsPath, 'agent-brain');
}
```

**Impact:**
- ✅ Workspace-scoped storage: `<workspace>/.agent-brain/`
- ✅ Global fallback: `~/.vscode/extensions/.../globalStorage/agent-brain/`
- ✅ Logs location for user visibility

---

## Part 2: PatternSystem File Storage (Future)

**Status:** 🔜 Deferred to later phase

PatternSystem currently stores in-memory. To add persistence:

### Option A: Implement FilePatternStorage

Create similar to `FileLearningStorage`:

```typescript
// NEW FILE: packages/core/src/domains/intelligence/core/patterns/PatternStorage.ts

export interface PatternStorage {
  save(patterns: EnginePattern[]): Promise<void>;
  load(): Promise<EnginePattern[]>;
}

export class FilePatternStorage implements PatternStorage {
  constructor(private filePath: string) {}

  async save(patterns: EnginePattern[]): Promise<void> {
    const data = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      patterns: patterns.map(p => ({
        ...p,
        trigger: p.trigger instanceof RegExp ? p.trigger.source : p.trigger
      }))
    };
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
  }

  async load(): Promise<EnginePattern[]> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      const data = JSON.parse(content);
      return data.patterns || [];
    } catch {
      return [];
    }
  }
}
```

### Option B: Use PatternSystem's Built-in Export/Import

Simpler approach:

```typescript
// In DataOrchestrator.initialize()
const patternsPath = path.join(this.storagePath, 'patterns.json');
const patternSystem = new PatternSystem();

// Load patterns from file on startup
try {
  const data = JSON.parse(await fs.readFile(patternsPath, 'utf-8'));
  await patternSystem.importPatterns(data);
} catch {
  // No existing patterns file
}

// Save patterns periodically or on shutdown
// (needs lifecycle hook implementation)
```

**Recommendation:** Use Option B initially (simpler), add Option A if we need auto-save.

---

## Part 3: Documentation

### 3.1 Update README.md

**File:** `packages/vscode/README.md`

Add section:

```markdown
## 📂 Data Storage

Agent-Brain stores intelligence data locally to remember learnings across sessions.

### Storage Location

**When workspace is open:**
```
your-project/
  .agent-brain/
    learnings.json    # Captured patterns from test failures and code analysis
    patterns.json     # Code pattern detection rules (future)
```

**When no workspace is open:**
```
~/.vscode/extensions/.../globalStorage/agent-brain/
```

### Privacy Options

Agent-Brain learnings may contain code snippets and error messages from your project.

**Option 1: Keep learnings private** (add to `.gitignore`):
```bash
echo ".agent-brain/" >> .gitignore
```

**Option 2: Share learnings with team** (commit to git):
```bash
git add .agent-brain/
git commit -m "Add team learnings from Agent-Brain"
```

### What's Stored?

- **Learning Patterns**: Insights from test failures, build errors, and code analysis
- **Pattern Rules**: Custom detection rules you've configured
- **ADRs**: Architectural Decision Records (future feature)

All data is stored in **human-readable JSON format** and can be inspected or edited manually.

### Data Sanitization

⚠️ **Note:** Future versions will include automatic sanitization of sensitive data (API keys, credentials, etc.). For now, review `.agent-brain/learnings.json` before committing to version control.
```

### 3.2 Add STORAGE.md (Detailed Documentation)

**File:** `packages/vscode/docs/STORAGE.md`

```markdown
# Storage Architecture

## Overview

Agent-Brain uses a simple, transparent file-based storage system.

## Storage Hierarchy

1. **Workspace Storage** (preferred)
   - Location: `<workspace>/.agent-brain/`
   - Visible in file explorer
   - Can be version controlled
   - Shared across workspace

2. **Global Storage** (fallback)
   - Location: VSCode global storage directory
   - Hidden from user
   - Survives workspace changes
   - Not shareable

## Storage Files

### learnings.json

Stores learning patterns extracted from failures and analysis.

**Format:**
```json
[
  {
    "id": "pattern_1733435923789_x7k2m9p",
    "name": "TypeScript Type Error",
    "category": "compilation",
    "description": "Missing type definition for interface property",
    "confidenceScore": 0.95,
    "occurrences": 3,
    "rootCause": { ... },
    "preventionRule": { ... }
  }
]
```

### patterns.json (Future)

Stores code pattern detection rules.

## Implementation Details

- Uses `FileLearningStorage` from intelligence domain
- Auto-creates directory on first use
- Loads on extension activation
- Saves after each learning capture
- Graceful fallback if file missing/corrupt

## Future Enhancements

- Automatic sensitive data sanitization
- Configurable storage location (via settings)
- Import/export functionality
- Team sync capabilities
```

---

## Part 4: File Structure Changes

### New/Modified Files

```
packages/
  core/
    src/
      domains/
        visualization/
          orchestration/
            DataOrchestrator.ts          # MODIFIED: Add storagePath, use FileLearningStorage
  vscode/
    src/
      extension.ts                       # MODIFIED: Determine storage path, pass to TimelineProvider
      providers/
        timeline-provider-webpack.ts     # MODIFIED: Accept storagePath in constructor
    README.md                            # MODIFIED: Add storage documentation
    docs/
      STORAGE.md                         # NEW: Detailed storage documentation
```

### User's Project Structure (After Running)

```
user-project/
  .agent-brain/                          # NEW: Created automatically
    learnings.json                       # NEW: Persisted learnings
    patterns.json                        # FUTURE
  src/
  package.json
  .gitignore                             # USER DECISION: Add .agent-brain/ or not
```

---

## Testing Plan

### Manual Testing

1. **Initial State** (No .agent-brain/ folder)
   ```
   ✓ Open VSCode in workspace
   ✓ Open timeline
   ✓ Verify .agent-brain/ created
   ✓ Verify learnings.json created (empty array)
   ```

2. **Add a Learning** (via future UI or test)
   ```
   ✓ Add learning pattern
   ✓ Verify saved to learnings.json
   ✓ Verify file contains learning
   ```

3. **Restart VSCode**
   ```
   ✓ Close VSCode
   ✓ Reopen workspace
   ✓ Open timeline
   ✓ Verify learning still exists
   ✓ Check output channel logs for storage path
   ```

4. **No Workspace Scenario**
   ```
   ✓ Open VSCode without folder
   ✓ Open timeline
   ✓ Verify uses global storage
   ✓ Check output channel for global path
   ```

5. **Git Workflow**
   ```
   ✓ Add .agent-brain/ to .gitignore
   ✓ Verify git status doesn't show folder
   ✓ Remove from .gitignore
   ✓ Verify git status shows folder
   ✓ Commit .agent-brain/learnings.json
   ```

### Automated Testing

Update intelligence provider test:

```typescript
// packages/vscode/tests/pathways/unit/intelligence-provider.pathway.test.ts

describe('Persistence', () => {
  it('should persist learnings to file', async () => {
    const storagePath = './test-storage';
    const learningsPath = path.join(storagePath, 'learnings.json');

    const learningSystem = new LearningSystem({
      storage: new FileLearningStorage(learningsPath)
    });

    // Add learning
    await learningSystem.processFailure(testFailure);

    // Verify file exists
    expect(await fs.access(learningsPath)).resolves.toBeUndefined();

    // Verify content
    const content = JSON.parse(await fs.readFile(learningsPath, 'utf-8'));
    expect(content.length).toBeGreaterThan(0);

    // Cleanup
    await fs.rm(storagePath, { recursive: true });
  });
});
```

---

## Build Verification

```bash
# Core package
cd packages/core && npm run build

# VSCode extension
cd packages/vscode && npm run build

# Expected: Zero errors, successful builds
```

---

## Migration Notes

**For existing installations:** No migration needed (no prior persistent storage).

**For future updates:**
- Version field in JSON allows schema migrations
- Can add migration logic when format changes

---

## Future Enhancements (Phase 8+)

### Phase 8A: Data Sanitization
```typescript
// Before saving
const sanitized = sanitizeLearning(learning);
await storage.storePattern(sanitized, failure);

function sanitizeLearning(learning: LearningPattern): LearningPattern {
  return {
    ...learning,
    description: removeApiKeys(learning.description),
    rootCause: removeCredentials(learning.rootCause)
  };
}
```

### Phase 8B: Configuration Options
```json
{
  "agentBrain.storage.location": "workspace" | "global",
  "agentBrain.storage.path": ".agent-brain",
  "agentBrain.storage.autoSanitize": true
}
```

### Phase 8C: Team Features
- Merge learnings from team members
- Sync via git
- Learning approval workflow
- Shared pattern libraries

### Phase 8D: Import/Export
- Export learnings to share
- Import from other projects
- Learning templates/presets

---

## Summary

### What This Achieves

✅ **Learnings survive restarts**
- Stored in `.agent-brain/learnings.json`
- Human-readable JSON format
- Inspectable and editable

✅ **Simple workspace-scoped storage**
- Visible in file explorer
- User controls git behavior
- Fallback to global if no workspace

✅ **Well documented**
- README explains clearly
- Users understand privacy implications
- Both private and team workflows supported

✅ **Minimal code changes**
- Add storagePath to DataOrchestrator
- Pass path from extension.ts
- Use existing FileLearningStorage

### What's Deferred

⏳ **PatternSystem persistence** (Part 2)
⏳ **Data sanitization** (Phase 8A)
⏳ **Configuration UI** (Phase 8B)
⏳ **Team features** (Phase 8C)
⏳ **Auto .gitignore** (Phase 8+)
⏳ **Notification popups** (Phase 8+)

---

## Questions Before Implementation?

1. Storage path determination logic acceptable?
2. Documentation coverage sufficient?
3. Testing approach comprehensive enough?
4. Defer PatternSystem persistence to later?
5. Ready to proceed with implementation?
