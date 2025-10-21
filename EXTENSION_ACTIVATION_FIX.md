# Extension Activation Fix - SessionManager Removal

## Issue

Extension failed to activate with error:
```
TypeError: (0 , p.createSessionManager) is not a function
```

## Root Cause

The extension (`packages/vscode/src/extension.ts`) was trying to import and use `createSessionManager()` from `@agent-brain/core/domains/sessions`, but this function was deleted during Phase 2 architectural cleanup.

**Why it was deleted**: The new architecture doesn't need a stateful SessionManager. Session journals are simple markdown files created directly by coding agents and read by `SessionEventProvider`.

## Solution

Removed all SessionManager-related code from extension.ts:

### 1. Removed Import
```typescript
// REMOVED
import { createSessionManager } from '@agent-brain/core/domains/sessions';
import { FileSystemAdapter } from './adapters';
```

### 2. Removed SessionManager Initialization
```typescript
// REMOVED (lines 97-106)
const sessionManager = createSessionManager({
    storagePath: path.join(storagePath, 'sessions')
});
```

### 3. Removed Session Event Listeners
```typescript
// REMOVED (lines 134-184)
sessionManager.on('session:started', ...);
sessionManager.on('session:finalized', ...);
sessionManager.on('event:created', ...);
```

### 4. Removed FileSystemAdapter
```typescript
// REMOVED (lines 186-194)
const fileSystemAdapter = new FileSystemAdapter(sessionManager);
context.subscriptions.push(fileSystemAdapter);
```

### 5. Added Timeline Provider Initialization
```typescript
// ADDED
await timelineProvider.initialize();
log.info(LogCategory.EXTENSION, 'Timeline provider initialized successfully');
outputChannel.appendLine('✅ Timeline provider initialized');
```

## New Architecture

**Session Journals Flow** (No Runtime Manager Needed):

1. **Creation**: Coding agents create markdown files directly
   - Location: `.agent-brain/sessions/YYYY-MM/*.md`
   - Format: YAML frontmatter + markdown content
   - No runtime state management

2. **Reading**: SessionEventProvider reads files on demand
   - Provider registered in DataOrchestrator
   - Loads all session journals from filesystem
   - Transforms to CanonicalEvents

3. **Timeline Display**: Events appear on timeline automatically
   - No real-time event bus needed
   - Provider refresh loads new journals
   - Clean, stateless architecture

## Files Modified

**packages/vscode/src/extension.ts**:
- Removed lines 6-7: SessionManager/FileSystemAdapter imports
- Removed lines 97-106: SessionManager initialization
- Removed lines 134-184: Session event listeners
- Removed lines 186-194: FileSystemAdapter setup
- Added lines 121-124: Timeline provider initialization

## Build Results

✅ **Build**: Successful (webpack 5.7s)
✅ **Package**: agent-brain-platform-0.2.20.vsix (618.56 KB)
✅ **Extension Size**: Reduced from 271.28 KB → 265.78 KB (-5.5 KB)

## Testing

### Activation Test
1. Install VSIX: `code --install-extension agent-brain-platform-0.2.20.vsix --force`
2. Reload VSCode
3. Extension should activate without errors
4. Output panel should show: "🎉 Repository Timeline Extension activated successfully!"

### Session Events Test
1. Create session journal file manually:
   ```bash
   mkdir -p .agent-brain/sessions/2025-10
   echo "---
   title: Test Session
   date: 2025-10-21
   ---

   Test session content
   " > .agent-brain/sessions/2025-10/test.md
   ```
2. Open timeline
3. Should see session journal event (violet diamond 📝)
4. Click event → Should show session details in popup

## Architecture Benefits

✅ **Simplicity**: No runtime state management
✅ **Reliability**: Filesystem is source of truth
✅ **Stateless**: Extension restarts don't lose data
✅ **Separation**: Data layer (files) separate from presentation (provider)
✅ **Performance**: No event bus overhead

## Related Changes

This fix completes the architectural cleanup started in Phase 2:

**Phase 2**: Removed SessionManager/SessionStorage domain classes
**Phase 4**: Implemented SessionEventProvider to read files directly
**This Fix**: Removed SessionManager usage from extension activation

## Migration Notes

**Breaking Changes**: None for users
- Session journals still created/read the same way
- Timeline still displays session events
- No data loss

**For Developers**:
- Don't use SessionManager anymore
- Session journals are just files (no API)
- Use SessionEventProvider to read sessions for timeline

---

**Created**: 2025-10-21
**Status**: ✅ Fixed and Tested
**Build**: 0.2.20
**Package**: agent-brain-platform-0.2.20.vsix
