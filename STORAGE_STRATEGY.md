# Storage Strategy for Agent-Brain Intelligence Data

**Date:** 2025-10-05
**Status:** 📋 DESIGN PROPOSAL

## Industry Research: How Popular Extensions Handle Storage

### Common Patterns

#### 1. **Workspace-Scoped Files (Most Common for Project Data)**

**Examples:**
- **ESLint**: `.eslintrc.json`, `.eslintignore` in project root
- **Prettier**: `.prettierrc`, `.prettierignore` in project root
- **TypeScript**: `tsconfig.json` in project root
- **Jest**: `jest.config.js` in project root
- **GitLens**: Uses workspace state for repository-specific data

**Pattern:**
```
project-root/
  .eslintrc.json
  .prettierrc
  tsconfig.json
  .vscode/
    settings.json     # Workspace settings
    extensions.json   # Recommended extensions
```

**Communication:**
- ✅ **Self-documenting** - Files visible in explorer
- ✅ **Team shareable** - Committed to git
- ✅ **Discoverable** - Users see files immediately
- ⚠️ **Optional .gitignore** - For generated/cached data

#### 2. **VSCode Workspace State (Hidden Storage)**

**Examples:**
- **GitLens**: Stores view states, UI preferences
- **GitHub Pull Requests**: Stores authentication tokens, cache

**Pattern:**
```
~/.vscode/
  workspaceStorage/
    <workspace-hash>/
      state.vscdb      # SQLite database
```

**Communication:**
- ⚠️ **Hidden** - Users don't see files
- ✅ **Automatic** - No configuration needed
- ❌ **Not shareable** - Per-user only
- ✅ **Documented** - README explains behavior

#### 3. **Global Storage (Cross-Workspace Data)**

**Examples:**
- **Settings Sync**: User preferences across machines
- **Extension managers**: Downloaded extension data

**Pattern:**
```
~/.vscode/
  globalStorage/
    <extension-id>/
      data.json
```

**Communication:**
- ⚠️ **Hidden** - Users don't see files
- ✅ **Persistent** - Survives workspace changes
- ❌ **Not per-project** - Same across all workspaces

#### 4. **Hybrid Approach (Configurable)**

**Examples:**
- **ESLint**: Supports both workspace and global configs
- **Prettier**: Can use workspace or user settings

**Pattern:**
```json
// settings.json
{
  "agentBrain.storage.location": "workspace" | "global",
  "agentBrain.storage.path": ".agent-brain"
}
```

**Communication:**
- ✅ **User choice** - Configurable behavior
- ✅ **Documented** - Settings UI shows options
- ✅ **Default sensible** - Works without config

## Recommended Strategy for Agent-Brain

### Option A: Workspace-First with Fallback (RECOMMENDED)

**Similar to:** ESLint, Prettier, Jest

```
project-root/
  .agent-brain/
    learnings.json        # Learning patterns from test failures
    patterns.json         # Code pattern detection rules
    adrs.json            # Architectural Decision Records
    config.json          # Intelligence system configuration
  .gitignore             # Optionally ignore .agent-brain/
```

**Fallback to global if no workspace:**
```
~/.vscode/extensions/agent-brain/
  globalStorage/
    learnings.json
    patterns.json
```

**Pros:**
- ✅ **Team collaboration** - Can commit `.agent-brain/` to share learnings
- ✅ **Self-documenting** - Visible in file explorer
- ✅ **Project-specific** - Learnings tied to codebase
- ✅ **Inspectable** - Users can view/edit JSON files
- ✅ **Portable** - Works with git, backups, etc.
- ✅ **Fallback** - Works even without workspace

**Cons:**
- ⚠️ Adds files to project directory
- ⚠️ Users must decide whether to commit or ignore

### Option B: VSCode Workspace State Only

**Similar to:** GitLens (for non-shareable data)

```
~/.vscode/workspaceStorage/<hash>/
  agent-brain.json
```

**Pros:**
- ✅ **Hidden** - No clutter in project
- ✅ **Automatic** - No user configuration
- ✅ **Managed by VSCode** - Automatic cleanup

**Cons:**
- ❌ **Not shareable** - Team can't share learnings
- ❌ **Not portable** - Lost if workspace deleted
- ❌ **Not inspectable** - Hard to view/debug
- ❌ **No git integration** - Can't version control learnings

### Option C: Configurable (Most Flexible)

Allow users to choose via settings:

```json
{
  "agentBrain.storage.location": "workspace",  // or "global" or "vscode"
  "agentBrain.storage.path": ".agent-brain",
  "agentBrain.storage.shareLearnings": true
}
```

**Pros:**
- ✅ **User choice** - Respects different workflows
- ✅ **Flexible** - Adapts to team vs solo projects

**Cons:**
- ⚠️ **Complex** - More configuration options
- ⚠️ **More code** - Multiple storage backends

## Recommended Implementation: Option A (Workspace-First)

### Storage Locations

```typescript
interface StorageConfig {
  // Workspace storage (preferred)
  workspace: {
    learnings: '<workspace>/.agent-brain/learnings.json',
    patterns: '<workspace>/.agent-brain/patterns.json',
    adrs: '<workspace>/.agent-brain/adrs.json'
  },

  // Global fallback (no workspace open)
  global: {
    learnings: '<globalStorage>/learnings.json',
    patterns: '<globalStorage>/patterns.json'
  }
}
```

### User Communication Strategy

#### 1. **First Run: Information Message**

```typescript
vscode.window.showInformationMessage(
  'Agent-Brain will store learnings in .agent-brain/ folder. ' +
  'Add to .gitignore to keep private, or commit to share with team.',
  'Open Folder',
  'Learn More'
);
```

#### 2. **Documentation (README.md)**

```markdown
## Data Storage

Agent-Brain stores intelligence data in your workspace:

### 📂 Storage Location

- **Workspace**: `.agent-brain/` folder in your project root
- **Global fallback**: VSCode global storage (when no workspace is open)

### 🔐 Privacy Options

**Option 1: Keep learnings private** (add to `.gitignore`):
```
.agent-brain/
```

**Option 2: Share learnings with team** (commit to git):
```
git add .agent-brain/
git commit -m "Add team learnings"
```

### 📝 Storage Files

- `learnings.json` - Learning patterns from test failures and analysis
- `patterns.json` - Code pattern detection rules
- `adrs.json` - Architectural Decision Records
```

#### 3. **Settings UI**

```json
// package.json contributions
"contributes": {
  "configuration": {
    "properties": {
      "agentBrain.storage.location": {
        "type": "string",
        "enum": ["workspace", "global"],
        "default": "workspace",
        "description": "Where to store intelligence data"
      },
      "agentBrain.storage.autoGitignore": {
        "type": "boolean",
        "default": false,
        "description": "Automatically add .agent-brain/ to .gitignore"
      }
    }
  }
}
```

#### 4. **Status Bar Item (Optional)**

```typescript
const storageStatusBar = vscode.window.createStatusBarItem(
  vscode.StatusBarAlignment.Right,
  100
);
storageStatusBar.text = "$(database) .agent-brain/";
storageStatusBar.tooltip = "Intelligence data: .agent-brain/learnings.json";
storageStatusBar.command = "agentBrain.openStorageFolder";
```

#### 5. **Welcome View (Sidebar)**

```typescript
// In WelcomeViewProvider webview
<div class="storage-info">
  <h3>📂 Storage Location</h3>
  <p>Learnings saved in: <code>.agent-brain/</code></p>
  <button onclick="openFolder()">Open Folder</button>
  <button onclick="configure()">Configure</button>
</div>
```

#### 6. **Output Channel Logging**

```typescript
outputChannel.appendLine('📂 Intelligence storage initialized');
outputChannel.appendLine(`   Workspace: ${workspacePath}/.agent-brain/`);
outputChannel.appendLine(`   Files: learnings.json, patterns.json`);
outputChannel.appendLine(`   Tip: Add to .gitignore to keep private`);
```

### Auto-Gitignore Feature (Optional)

```typescript
async function autoAddToGitignore(workspaceRoot: string) {
  const setting = vscode.workspace.getConfiguration('agentBrain')
    .get<boolean>('storage.autoGitignore');

  if (!setting) return;

  const gitignorePath = path.join(workspaceRoot, '.gitignore');
  let content = '';

  try {
    content = await fs.readFile(gitignorePath, 'utf-8');
  } catch {
    // .gitignore doesn't exist
  }

  if (!content.includes('.agent-brain')) {
    content += '\n# Agent-Brain intelligence data (private)\n.agent-brain/\n';
    await fs.writeFile(gitignorePath, content);

    vscode.window.showInformationMessage(
      'Added .agent-brain/ to .gitignore'
    );
  }
}
```

## Implementation Code

### DataOrchestrator Changes

```typescript
// Add to DataOrchestratorOptions
export interface DataOrchestratorOptions {
  cacheTTL?: number;
  storagePath?: string;  // NEW: Path to storage directory
  extensionContext?: vscode.ExtensionContext;  // NEW: For global storage fallback
}

// In constructor
constructor(options: DataOrchestratorOptions = {}) {
  this.cacheTTL = options.cacheTTL || 300000;
  this.storagePath = options.storagePath || this.getDefaultStoragePath();
  this.context = options.extensionContext;
  // ...
}

private getDefaultStoragePath(): string {
  // Try workspace first
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (workspaceRoot) {
    return path.join(workspaceRoot, '.agent-brain');
  }

  // Fallback to global storage
  if (this.context) {
    return this.context.globalStorageUri.fsPath;
  }

  // Last resort fallback
  return path.join(process.cwd(), '.agent-brain');
}

async initialize(): Promise<void> {
  // Ensure storage directory exists
  await fs.mkdir(this.storagePath, { recursive: true });

  // Create storage paths
  const learningsPath = path.join(this.storagePath, 'learnings.json');
  const patternsPath = path.join(this.storagePath, 'patterns.json');

  // Create systems with file storage
  const learningSystem = new LearningSystem({
    storage: new FileLearningStorage(learningsPath)
  });

  const patternSystem = new PatternSystem({
    storagePath: patternsPath  // NEW: needs implementation
  });

  // Log storage location
  this.log.info(
    LogCategory.ORCHESTRATION,
    `Intelligence storage: ${this.storagePath}`,
    'initialize'
  );

  // ... rest of initialization
}
```

### Extension.ts Changes

```typescript
export async function activate(context: vscode.ExtensionContext) {
  // Get workspace root
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  const storagePath = workspaceRoot
    ? path.join(workspaceRoot, '.agent-brain')
    : context.globalStorageUri.fsPath;

  // Show first-run message
  const isFirstRun = !context.globalState.get('agentBrain.initialized');
  if (isFirstRun && workspaceRoot) {
    const result = await vscode.window.showInformationMessage(
      'Agent-Brain will store learnings in .agent-brain/ folder. ' +
      'Add to .gitignore to keep private, or commit to share with team.',
      'Open Folder',
      'Add to .gitignore',
      'Dismiss'
    );

    if (result === 'Add to .gitignore') {
      await autoAddToGitignore(workspaceRoot);
    } else if (result === 'Open Folder') {
      vscode.commands.executeCommand('revealInExplorer', vscode.Uri.file(storagePath));
    }

    context.globalState.update('agentBrain.initialized', true);
  }

  // Create timeline provider with storage path
  const timelineProvider = new TimelineProvider(
    context.extensionUri,
    storagePath,
    context
  );

  // ... rest of activation
}
```

## Comparison to Popular Extensions

| Extension | Storage Location | User Communication |
|-----------|-----------------|-------------------|
| **ESLint** | `.eslintrc.json` | File visible in explorer, documented in README |
| **Prettier** | `.prettierrc` | File visible in explorer, settings UI |
| **Jest** | `jest.config.js` | File visible in explorer, documented |
| **GitLens** | Workspace state | Status bar item, welcome view, settings |
| **GitHub PR** | Global state | Authentication flow, settings |
| **Agent-Brain** | `.agent-brain/` | 📂 Info message + README + Settings + Status bar |

## Recommendation Summary

✅ **Use Option A: Workspace-First with Global Fallback**

**Communication Strategy:**
1. First-run information message with options
2. Comprehensive README documentation
3. Settings UI configuration
4. Optional status bar indicator
5. Output channel logging
6. Optional auto-gitignore feature

**Benefits:**
- Matches industry standards (ESLint, Prettier)
- Self-documenting (visible files)
- Team-shareable (git-committable)
- Inspectable (JSON files)
- Graceful fallback (global storage)
- User-friendly (clear communication)

This approach is **architecturally sound** and follows **VSCode best practices**.
