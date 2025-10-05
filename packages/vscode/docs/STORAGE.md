# Storage Architecture

**Last Updated:** 2025-10-05

## Overview

Agent-Brain uses a simple, transparent file-based storage system for persistent intelligence data. Learnings, patterns, and architectural decisions survive VSCode restarts and can optionally be shared with your team.

## Storage Hierarchy

### 1. Workspace Storage (Preferred)

- **Location**: `<workspace>/.agent-brain/`
- **Visibility**: Visible in file explorer
- **Shareability**: Can be committed to version control
- **Scope**: Shared across workspace
- **Use Case**: Project-specific learnings and patterns

**Example:**
```
your-project/
  .agent-brain/
    learnings.json     # Learning patterns from failures
    patterns.json      # Detection rules (future)
    adrs.json          # Architectural decisions (future)
    config.json        # Intelligence settings (future)
  src/
  package.json
  .gitignore           # Optionally add .agent-brain/
```

### 2. Global Storage (Fallback)

- **Location**: `~/.vscode/extensions/.../globalStorage/agent-brain/`
- **Visibility**: Hidden from user
- **Shareability**: Not shareable
- **Scope**: Survives workspace changes
- **Use Case**: When no workspace is open

**Path Resolution:**
```typescript
// Windows
C:\Users\<username>\AppData\Roaming\Code\User\globalStorage\agent-brain\

// macOS
~/Library/Application Support/Code/User/globalStorage/agent-brain/

// Linux
~/.config/Code/User/globalStorage/agent-brain/
```

## Storage Files

### learnings.json

Stores learning patterns extracted from test failures, build errors, and code analysis.

**Format:**
```json
[
  {
    "id": "pattern_1733435923789_x7k2m9p",
    "name": "TypeScript Type Error - Missing Property Type",
    "category": "compilation",
    "description": "Interface property missing explicit type annotation",
    "confidenceScore": 0.95,
    "occurrences": 3,
    "rootCause": {
      "type": "missing-type-annotation",
      "location": "src/types.ts:42",
      "context": "interface UserProfile"
    },
    "preventionRule": {
      "trigger": "interface.*{",
      "check": "all properties have type annotations"
    },
    "fixApproach": "Add explicit type annotation to property",
    "service": "typescript",
    "autoFixable": false
  }
]
```

**Schema:**
- `id`: Unique identifier (generated)
- `name`: Human-readable pattern name
- `category`: Classification (compilation, runtime, testing, etc.)
- `description`: What the pattern represents
- `confidenceScore`: 0.0-1.0 confidence in pattern validity
- `occurrences`: Number of times pattern was observed
- `rootCause`: Structured analysis of the underlying issue
- `preventionRule`: How to prevent this pattern in future
- `fixApproach`: Suggested fix strategy
- `service`: Related service/technology
- `autoFixable`: Whether auto-fix is available

### patterns.json (Future)

Will store code pattern detection rules.

**Planned Format:**
```json
{
  "version": "1.0.0",
  "exportedAt": "2025-10-05T12:00:00.000Z",
  "patterns": [
    {
      "id": "react-hooks-dependency",
      "name": "React useEffect Missing Dependency",
      "category": "react",
      "severity": "warning",
      "trigger": "/useEffect\\(/",
      "message": "useEffect hook may be missing dependencies",
      "autoFix": {
        "enabled": true
      }
    }
  ]
}
```

### adrs.json (Future)

Architectural Decision Records.

### config.json (Future)

Intelligence system configuration.

## Implementation Details

### File Storage Implementation

Uses `FileLearningStorage` class from intelligence domain:

**Key Features:**
- Auto-loads on startup (`loadFromFile()` in constructor)
- Auto-saves after every change (`saveToFile()` after mutations)
- Creates directory if missing (`fs.mkdir` with `recursive: true`)
- Graceful error handling (empty array if file missing/corrupt)
- Full CRUD operations (create, read, update, delete)

**Code Location:**
```
packages/core/src/domains/intelligence/core/learning/LearningStorage.ts
```

### Storage Path Resolution

Handled in `extension.ts`:

```typescript
function getStoragePath(context: vscode.ExtensionContext): string {
  // Try workspace first (preferred)
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  if (workspaceRoot) {
    return path.join(workspaceRoot, '.agent-brain');
  }

  // Fallback to global storage
  return path.join(context.globalStorageUri.fsPath, 'agent-brain');
}
```

### Initialization Flow

1. Extension activates (`activate()` in extension.ts)
2. Storage path determined (`getStoragePath()`)
3. Path passed to `TimelineProvider`
4. TimelineProvider passes to `DataOrchestrator`
5. DataOrchestrator creates storage directory
6. `LearningSystem` initialized with `FileLearningStorage`
7. Learnings auto-loaded from file on startup

## Privacy & Security

### What Data Is Stored?

✅ **Stored:**
- Pattern names and descriptions
- Error messages and stack traces
- File paths and line numbers
- Code snippets (for context)
- Test failure information

⚠️ **Potential Privacy Concerns:**
- Error messages may contain API keys or credentials
- File paths may reveal internal project structure
- Code snippets may contain proprietary logic

### Current Mitigation

- **User Control**: Users decide whether to commit `.agent-brain/` to git
- **Visibility**: Files are visible and can be reviewed before committing
- **JSON Format**: Human-readable, easy to inspect and edit

### Future Enhancements

Planned sanitization features (Phase 8+):

```typescript
// Auto-sanitization before storage
function sanitizeLearning(learning: LearningPattern): LearningPattern {
  return {
    ...learning,
    description: removeApiKeys(learning.description),
    rootCause: removeCredentials(learning.rootCause),
    // Redact sensitive patterns
  };
}
```

## Git Integration

### Option 1: Private Learnings (.gitignore)

Add to `.gitignore`:
```
.agent-brain/
```

**Use Case:**
- Solo developer
- Sensitive project information
- Proprietary code patterns

### Option 2: Team Sharing (Commit)

Commit `.agent-brain/` directory:
```bash
git add .agent-brain/
git commit -m "Add team learnings from Agent-Brain"
git push
```

**Use Case:**
- Team collaboration
- Shared knowledge base
- Consistent patterns across team

### Option 3: Selective Sharing

Use `.gitignore` with exceptions:
```
.agent-brain/*
!.agent-brain/adrs.json     # Share architectural decisions only
```

## Manual Operations

### View Learnings

```bash
# View all learnings
cat .agent-brain/learnings.json | jq .

# Count learnings
cat .agent-brain/learnings.json | jq 'length'

# Filter by category
cat .agent-brain/learnings.json | jq '.[] | select(.category == "typescript")'
```

### Edit Learnings

Learnings are stored in JSON format and can be manually edited:

```bash
# Edit with your preferred editor
code .agent-brain/learnings.json
```

Changes are automatically picked up on next extension reload.

### Export Learnings

```bash
# Backup learnings
cp .agent-brain/learnings.json learnings-backup-2025-10-05.json

# Export for sharing
cp .agent-brain/learnings.json /path/to/shared/location/
```

### Clear Learnings

```bash
# Delete all learnings
rm .agent-brain/learnings.json

# Or reset to empty array
echo "[]" > .agent-brain/learnings.json
```

## Troubleshooting

### Learnings Not Persisting

**Check:**
1. Output channel logs: `Repository Timeline` → Check for storage path
2. File permissions: Ensure write access to workspace directory
3. Storage path: Verify `.agent-brain/` directory exists

**Debug:**
```bash
# Check if directory exists
ls -la .agent-brain/

# Check file contents
cat .agent-brain/learnings.json

# Check permissions
ls -l .agent-brain/learnings.json
```

### Global Storage Used Instead of Workspace

**Symptoms:**
- Learnings disappear when switching workspaces
- No `.agent-brain/` folder in project

**Cause:**
- No workspace folder open in VSCode

**Solution:**
- Open workspace: `File → Open Folder...`
- Check output channel for storage path

### Corrupt Learnings File

**Symptoms:**
- Extension fails to load
- Errors in output channel

**Solution:**
```bash
# Backup current file
mv .agent-brain/learnings.json .agent-brain/learnings.json.bak

# Create fresh empty file
echo "[]" > .agent-brain/learnings.json

# Restart VSCode
```

## Performance

### File Size

- Each learning: ~500 bytes - 2KB (depending on context)
- 100 learnings: ~50KB - 200KB
- 1000 learnings: ~500KB - 2MB

**Performance Impact:**
- Negligible for < 1000 learnings
- JSON parsing is fast for this size
- No noticeable startup delay

### Optimization Strategies

If learnings file grows large (> 1000 entries):

1. **Archive old learnings**: Move to `learnings-archive.json`
2. **Filter by date**: Keep only recent learnings
3. **Aggregate duplicates**: Merge similar patterns

## Future Enhancements

### Phase 8: Data Sanitization
- Auto-detect and redact API keys
- Remove credentials from error messages
- Configurable sanitization rules

### Phase 8B: Configuration UI
- Settings for storage location
- Enable/disable auto-save
- Sanitization preferences

### Phase 8C: Team Features
- Merge learnings from multiple sources
- Conflict resolution
- Learning approval workflow
- Shared pattern libraries

### Phase 8D: Import/Export
- Export learnings to share
- Import from other projects
- Learning templates/presets
- Cross-project pattern reuse

## Related Documentation

- [PHASE_7B_STORAGE_IMPLEMENTATION_PLAN.md](../../../PHASE_7B_STORAGE_IMPLEMENTATION_PLAN.md) - Implementation plan
- [STORAGE_STRATEGY.md](../../../STORAGE_STRATEGY.md) - Strategy and research
- [PHASE_7_STORAGE_ISSUE.md](../../../PHASE_7_STORAGE_ISSUE.md) - Problem analysis
