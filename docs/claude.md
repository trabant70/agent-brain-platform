# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Agent Brain Platform** is a VSCode extension that provides AI-assisted development through:
- Interactive timeline visualization of git/GitHub events
- Knowledge management system for architectural decisions, patterns, and learnings
- Session tracking and learning capture
- Pathway-based testing infrastructure

**Monorepo Structure:**
- `packages/core` - Shared domain logic, visualization, and infrastructure
- `packages/vscode` - VSCode extension host and provider implementations

**Current Phase:** MVP Phase 1 - Core visualization and knowledge management only. Multiple advanced domains (intelligence, enhancement, expertise, guidance, planning, achievement) have been deferred to future phases.

## Build Commands

### Core Package
```bash
cd packages/core
npm run build          # Compile TypeScript
npm run test           # Run all tests
npm run test:pathways  # Run pathway tests only
npm run clean          # Clean build artifacts
```

### VSCode Extension
```bash
cd packages/vscode
npm run build          # Build extension with webpack (production)
npm run watch          # Watch mode for development
npm run package        # Create VSIX package (auto-bumps version)
npm run clean          # Clean dist directory
```

### Monorepo (from root)
```bash
npm run build              # Build all packages
npm run build:core         # Build core only
npm run build:vscode       # Build vscode only
npm run test               # Run all tests
npm run test:pathways      # Run pathway tests across packages
npm run package:vscode     # Package VSCode extension as VSIX
npm run clean              # Clean all packages
```

### Running Tests
```bash
# Run specific test file
cd packages/core
npx jest path/to/test.test.ts

# Run tests matching pattern
npx jest --testNamePattern="KnowledgeStore"

# Run with coverage
npm run test -- --coverage

# Run pathway tests
npm run test:pathways
```

## Architecture Principles

### Core Architectural Rules

1. **Single Transformation Rule**: Transform data ONCE at provider boundaries. No transformations between layers.

2. **Canonical Event Model**: All components work with `CanonicalEvent[]` - a universal event type preserving ALL source data (40+ fields including metadata, author, stats, git/github-specific data).

3. **Filter, Don't Transform**: Filtering removes events from view but never changes structure.

4. **Simplicity Over Abstraction**: Inline logic preferred over complex pipelines. Fewer layers = fewer bugs.

5. **File System as Source of Truth**: Knowledge items stored as markdown files in `.agent-brain/` directory with YAML frontmatter.

### Key Data Flows

**Timeline Visualization Flow:**
```
GitProvider → CanonicalEvent[] → DataOrchestrator (cache + filter)
→ TimelineProvider → Webview (postMessage)
→ SimpleTimelineApp → D3TimelineRendererImpl → SVG
```

**Knowledge Management Flow:**
```
.agent-brain/**/*.md → KnowledgeFileSystem (parse frontmatter)
→ KnowledgeStore (indexed in-memory) → KnowledgeManager (VSCode service)
→ TimelineProvider → Webview → KnowledgeViewController → UI
```

**Message Protocol (Extension ↔ Webview):**
- Extension: Node.js context, uses `logger` from `@agent-brain/core/infrastructure/logging/Logger`
- Webview: Browser context, uses `webviewLogger` from `WebviewLogger.ts`
- Communication: `postMessage` API with 25+ typed message types (timeline:*, knowledge:*, config)

## Critical Implementation Patterns

### Adding New Knowledge Types

Edit `packages/core/src/domains/knowledge/types.ts`:
```typescript
export enum KnowledgeType {
  NEW_TYPE = 'new-type',
  // ... existing types
}

// Update helper functions
export function getKnowledgeTypeLabel(type: KnowledgeType): string {
  const labels: Record<KnowledgeType, string> = {
    [KnowledgeType.NEW_TYPE]: 'New Type',
    // ...
  };
  return labels[type];
}

export function getKnowledgeTypeIcon(type: KnowledgeType): string {
  const icons: Record<KnowledgeType, string> = {
    [KnowledgeType.NEW_TYPE]: '🆕',
    // ...
  };
  return icons[type];
}
```

Then add directory mapping in `packages/vscode/src/services/KnowledgeManager.ts`:
```typescript
private getDirectoryForType(type: KnowledgeType): string {
  const typeMap: Record<string, string> = {
    [KnowledgeType.NEW_TYPE]: 'new-types',
    // ...
  };
  return typeMap[type] || 'custom';
}
```

### Adding Data Providers

1. Implement `IDataProvider` interface in `packages/core/src/domains/providers/base/`
2. Transform source data to `CanonicalEvent[]` ONCE in `fetchEvents()` - preserve ALL source data
3. Register in `DataOrchestrator` via `registerProvider()`
4. DataOrchestrator handles caching, filtering, and event merging automatically

### Pathway Logging

Use pathway logging to trace data flows through the system:

```typescript
import { logger, LogCategory, LogPathway } from '@agent-brain/core/infrastructure/logging/Logger';

// Extension side
logger.debug(LogCategory.DATA, 'Loading events', 'fetchEvents',
  { count: events.length }, LogPathway.DATA_INGESTION);

// Webview side
import { webviewLogger, LogCategory, LogPathway } from './WebviewLogger';
webviewLogger.debug(LogCategory.VISUALIZATION, 'Rendering timeline', 'render',
  undefined, LogPathway.RENDER_PIPELINE);
```

**Available Pathways:**
- `DATA_INGESTION` - Provider → DataOrchestrator → Webview
- `FILTER_APPLY` - Filter changes → Data refresh
- `RENDER_PIPELINE` - Data processing → D3 rendering
- `KNOWLEDGE_MANAGEMENT` - Knowledge CRUD operations
- `WEBVIEW_MESSAGING` - Extension ↔ Webview communication

Configure in VSCode settings:
- `agentBrain.logging.pathwayMode`: "disabled" | "filter" | "exclusive"
- `agentBrain.logging.enabledPathways`: Array of pathway names

### Webview Message Handling

**Adding new message types:**

1. Add handler in `packages/vscode/src/providers/timeline-provider-webpack.ts`:
```typescript
private async handleMessage(message: any): Promise<void> {
  switch (message.type) {
    case 'your:new-message':
      await this.handleYourNewMessage(message.payload);
      break;
  }
}

private async handleYourNewMessage(payload: any): Promise<void> {
  // Process message
  // Send response back to webview
  this._view?.webview.postMessage({
    type: 'your:response',
    payload: { data: result }
  });
}
```

2. Add handler in `packages/core/src/domains/visualization/webview/main.ts`:
```typescript
window.addEventListener('message', async event => {
  const message = event.data;
  switch (message.type) {
    case 'your:response':
      handleYourResponse(message.payload);
      break;
  }
});
```

**Existing Message Types (25+):**
- Timeline: `requestData`, `timelineData`, `updateFilters`, `refreshData`, `exportData`, etc.
- Knowledge: `knowledge:load-all`, `knowledge:create-item`, `knowledge:update-item`, `knowledge:delete-item`, `knowledge:apply-template`, etc.
- Config: `loggingConfig`, `error`

### Knowledge Item Frontmatter Format

Knowledge items use YAML frontmatter:
```markdown
---
title: My Knowledge Item
type: golden-path
scope: team
tags: authentication, oauth
source: auth.oauth.keycloak
author: Developer Name
version: 1
---

# Knowledge Item Body

Markdown content here...
```

**Required fields:** title, type, scope
**Optional fields:** tags, source, author, version

**Auto-inference:** Type inferred from directory path if missing, title extracted from first heading if missing.

## Domain Structure

### Core Package (`packages/core/src/domains/`)

**Current Active Domains (7):**

**events/** - Canonical event types and interfaces
- `CanonicalEvent.ts` - Universal event type (40+ fields: id, type, timestamp, title, description, metadata, author, fileStats, additions, deletions, changes, gitHash, branch, tags, isPR, prNumber, etc.)
- `FilterState.ts` - Filter configuration

**knowledge/** - Knowledge management system
- `types.ts` - 20+ knowledge types (ADR, DESIGN_PATTERN, GOLDEN_PATH, LEARNING, STANDARD, SNIPPET, etc.)
- `KnowledgeStore.ts` - In-memory storage with 5 indexes (type, scope, tag, path, source)
- `KnowledgeFileSystem.ts` - Markdown file I/O with YAML frontmatter parsing
- `TemplateEngine.ts` - Template injection/removal for claude.md files
- Index exports all types and classes

**providers/** - Data source adapters
- `git/GitEventRepository.ts` - Local git repository events (commits, branches, tags)
- `github/GitHubEventRepository.ts` - GitHub API integration (PRs, issues, releases)
- `sessions/SessionEventProvider.ts` - Session event provider
- `base/IDataProvider.ts` - Provider interface

**visualization/** - Webview rendering (14 subdirectories)
- `webview/main.ts` - Entry point, sets up message listeners
- `webview/SimpleTimelineApp.ts` - Main UI application orchestrator
- `webview/WebviewLogger.ts` - Browser-side logging
- `timeline/D3TimelineRendererImpl.ts` - D3 SVG rendering engine
- `timeline/InteractionHandler.ts` - Mouse/zoom interactions
- `ui/TabManager.ts` - Multi-tab navigation
- `ui/KnowledgeViewController.ts` - Knowledge UI controller
- `ui/FilterController.ts` - Filter panel controller
- `ui/StatsController.ts` - Statistics panel
- `ui/ModalDialog.ts` - Reusable modal component
- `ui/NotificationManager.ts` - Toast notifications
- `orchestration/DataOrchestrator.ts` - Central coordinator (caching, filtering, provider registration)
- `theme/EventVisualTheme.ts` - Color modes, shapes, z-index layering
- `styles/` - CSS modules

**sessions/** - Session tracking
- `SessionManager.ts` - Lifecycle management
- `SessionStorage.ts` - Persistence

**context/** - Project-specific context
- Types for project rules and decisions

**extension/** - Extension interfaces (placeholder for future)

**Deleted/Deferred Domains (not currently implemented):**
- intelligence/ - Advanced AI features (deferred to Phase 2+)
- enhancement/ - 5-stage prompt enhancement (deferred)
- expertise/ - Package management system (deferred)
- guidance/ - AI guidance engine (deferred)
- planning/ - Planning engine (deferred)
- achievement/ - Achievement tracking (deferred)

### VSCode Package (`packages/vscode/src/`)

**providers/** - VSCode webview providers
- `timeline-provider-webpack.ts` - Main provider (27KB), message routing, lifecycle management
- `WelcomeViewProvider.ts` - Activity bar welcome view

**services/** - Extension services
- `KnowledgeManager.ts` - Knowledge system integration, file watching, CRUD operations, template management

**adapters/** - Event capture adapters
- `FileSystemAdapter.ts` - File change tracking

**commands/** - VSCode commands
- Core commands removed in Phase 1 simplification
- `index.ts` - Command registration

## Extension Points

### Adding New UI Tabs
1. Add button to `packages/core/src/domains/visualization/templates/timeline.html` in `#tab-navigation`
2. Add content div in `#tab-contents`
3. TabManager will handle switching automatically
4. Create controller in `packages/core/src/domains/visualization/ui/`
5. Register in `UIControllerManager.ts`

### Adding New Visualization Themes
Edit `packages/core/src/domains/visualization/theme/EventVisualTheme.ts`:
- Define color palettes in `colorModes`
- Define event shapes (D3 symbols: circle, square, diamond, triangle, star, cross, wye)
- Define z-index layering (1-10+) for event stacking

## Testing

### Pathway Tests
Pathway tests verify end-to-end data flows by asserting on log emission milestones.

**Running:**
```bash
npm test -- pathways/
npm test -- data-ingestion.pathway.test.ts
```

## Common Gotchas

1. **Webview vs Extension Context**: Extension runs in Node.js, webview in Chromium. Cannot share variables directly - use postMessage.

2. **CanonicalEvent Immutability**: Never transform CanonicalEvent after creation. ALL 40+ fields must be preserved. Filter or map to new structures if needed.

3. **Knowledge File Watching**: File changes trigger automatic reload via `KnowledgeManager.setupFileWatcher()`. Has 200ms debounce to prevent excessive reloads.

4. **Template Markers**: Templates use HTML comment markers in claude.md files:
   ```html
   

   ```
   Never manually edit content between markers - use TemplateEngine.

5. **Webpack Bundling**: Webview code is bundled separately via webpack. Three entries:
   - `extension.js` (Node.js)
   - `webview/main.js` (Browser, D3 bundled)
   - Asset copying (HTML, CSS, images)

6. **VSCode Theme Variables**: Always use `var(--vscode-*)` CSS variables for consistent theming.

7. **Message Type Naming**: Use namespaced message types (`knowledge:action`, `timeline:action`) to avoid collisions.

8. **KnowledgeStore Indexes**: Store maintains 5 indexes - updates must maintain index consistency. Use provided methods (addItem, updateItem, deleteItem) rather than direct manipulation.

## Configuration Files

- `packages/core/tsconfig.json` - Core TypeScript config
- `packages/vscode/tsconfig.json` - Extension TypeScript config
- `packages/vscode/webpack.config.js` - Webview bundling (3 entries)
- `packages/vscode/package.json` - Extension manifest (commands, views, settings, keybindings)
- `lerna.json` - Monorepo configuration
- `.agent-brain/` - Knowledge base directory (auto-created)

## Important File Locations

**Entry Points:**
- Extension: `packages/vscode/src/extension.ts`
- Webview: `packages/core/src/domains/visualization/webview/main.ts`

**Core Coordinators:**
- Timeline Provider: `packages/vscode/src/providers/timeline-provider-webpack.ts` (27KB)
- Data Orchestrator: `packages/core/src/domains/visualization/orchestration/DataOrchestrator.ts`
- Knowledge Manager: `packages/vscode/src/services/KnowledgeManager.ts` (27KB)

**Core Domain Files:**
- Canonical Events: `packages/core/src/domains/events/CanonicalEvent.ts`
- Knowledge Types: `packages/core/src/domains/knowledge/types.ts`
- Knowledge Store: `packages/core/src/domains/knowledge/KnowledgeStore.ts`
- Knowledge FileSystem: `packages/core/src/domains/knowledge/KnowledgeFileSystem.ts`
- Template Engine: `packages/core/src/domains/knowledge/TemplateEngine.ts`

**Message Protocol:**
- Extension → Webview: `TimelineProvider._view.webview.postMessage()`
- Webview → Extension: `window.vscode.postMessage()`
- VSCode API object: `window.vscode` (acquired via `acquireVsCodeApi()`)

**Logging:**
- Extension: `@agent-brain/core/infrastructure/logging/Logger`
- Webview: `packages/core/src/domains/visualization/webview/WebviewLogger.ts`
- Configuration: `packages/core/src/infrastructure/logging/LoggingConfig.ts`

## Development Workflow

1. Make changes in `packages/core/src/` or `packages/vscode/src/`
2. Build: `cd packages/vscode && npm run build` (or `npm run watch` for auto-rebuild)
3. Test extension: Press F5 in VSCode (launches Extension Development Host)
4. Debug webview: Right-click webview → "Open Webview Developer Tools"
5. Check logs:
   - VSCode Output panel → "Agent Brain Platform"
   - Webview Console (DevTools)
6. Package: `npm run package:vscode` (creates VSIX in `packages/vscode/`)
7. Install VSIX: `code --install-extension packages/vscode/agent-brain-platform-X.Y.Z.vsix`

## Knowledge System Specifics

**Directory Structure (auto-created in `.agent-brain/`):**
```
.agent-brain/
├── golden-paths/    # Recommended approaches
├── patterns/        # Design patterns
├── standards/       # Coding standards
├── learnings/       # Session learnings
├── adrs/           # Architecture decisions
├── snippets/       # Code snippets
├── templates/      # Saved templates (JSON)
└── exports/        # Exported template files
```

**20 Knowledge Types:**
- ADR, ANTI_PATTERN, API_SPEC, BEST_PRACTICE, CODE_REVIEW_CHECKLIST
- DATA_MODEL, DESIGN_PATTERN, GOLDEN_PATH, HOW_TO_GUIDE, LEARNING
- MEETING_NOTE, ONBOARDING, PERFORMANCE_TIP, REFACTORING_GUIDE, SECURITY_GUIDELINE
- SNIPPET, STANDARD, TECHNICAL_DEBT, TESTING_STRATEGY, TROUBLESHOOTING_GUIDE

**5 Scopes:**
- PERSONAL, TEAM, PROJECT, ORGANIZATION, PUBLIC

**Knowledge Item Lifecycle:**
1. Create via UI or file system
2. Auto-indexed by KnowledgeStore (type, scope, tag, path, source indexes)
3. File watcher detects changes → reload
4. Templates can be applied to inject into claude.md files
5. Export/import via JSON

**Template System:**
- Templates stored as JSON in `.agent-brain/templates/`
- Applied to claude.md or other markdown files
- Uses HTML comment markers for injection/removal tracking
- Supports versioning and conflict detection

<!-- Agent-Brain Template: Template Application Bug - Items Not Visible After Apply [id: knowledge-8ce8f8c2089b] Start -->

## 💡 Template Application Bug - Items Not Visible After Apply

**Tags:** bug-fix, templates, debugging, case-sensitivity, notifications

# Template Application Bug - Items Not Visible After Apply

## Problem Report

User reported: "I selected two items in the knowledge set, saved them as a template and applied the template to the CLAUDE.md file, but cannot see them added to the CLAUDE file."

## Debugging Process

### Step 1: Trace the Data Flow

Analyzed the complete template application flow:

1. **Webview → Extension**: User clicks "Apply Template" → sends `knowledge:apply-template` message
2. **Extension Handler**: `handleApplyTemplate()` in `timeline-provider-webpack.ts`
3. **KnowledgeManager**: `applyTemplate()` method writes to file
4. **TemplateEngine**: `injectTemplate()` generates markdown with HTML comment markers
5. **File Scan**: `scanClaudeMdFiles()` re-scans files and parses template sections
6. **Extension → Webview**: Sends updated file data via `knowledge:claude-files` message
7. **Webview Rendering**: Accordion should show updated content

### Step 2: Check Message Handlers

Found handlers in `timeline-provider-webpack.ts`:
- ✅ `handleCreateTemplate` - sends success message
- ✅ `handleRemoveTemplate` - calls `sendClaudeMdFiles()`
- ❌ `handleApplyTemplate` - **missing success message**

### Step 3: Identify Root Causes

Found **TWO bugs**:

## Bug 1: Case-Sensitive File Check ❌

**File**: `packages/vscode/src/providers/timeline-provider-webpack.ts`
**Line**: 904

**Original Code**:
```typescript
if (!claudeMdPath || !claudeMdPath.endsWith('claude.md')) {
  // Error: file not found
}
```

**Problem**: User's file was named `CLAUDE.md` (uppercase), but check was case-sensitive. The scan method handles both `claude.md` and `CLAUDE.md`, but the apply check didn't.

**Fix**:
```typescript
// Case-insensitive check for claude.md
if (!claudeMdPath || !claudeMdPath.toLowerCase().endsWith('claude.md')) {
  this._view?.webview.postMessage({
    type: 'knowledge:error',
    payload: { error: 'Please open a claude.md file first' }
  });
  return;
}
```

## Bug 2: No Success Message to Webview ❌

**File**: `packages/vscode/src/providers/timeline-provider-webpack.ts`
**Lines**: 891-920

**Problem**: After successfully applying template, no success message was sent to webview, so user got no visual confirmation that the operation completed.

**Comparison**:

**Create Template** (sends success):
```typescript
await this.knowledgeManager.createTemplate(payload);
await this.sendKnowledgeData();

this._view?.webview.postMessage({
  type: 'knowledge:success',
  payload: { message: 'Template created successfully' }
});
```

**Apply Template** (missing success):
```typescript
await this.knowledgeManager.applyTemplate(payload.templateId, claudeMdPath);
await this.sendClaudeMdFiles();
// ❌ No success message sent!
```

**Fix**:
```typescript
await this.knowledgeManager.applyTemplate(payload.templateId, claudeMdPath);
await this.sendClaudeMdFiles();

// Send success message to webview
const store = this.knowledgeManager.getStore();
const template = store.getTemplate(payload.templateId);
const templateName = template?.name || 'Template';

this._view?.webview.postMessage({
  type: 'knowledge:success',
  payload: { message: `Template "${templateName}" applied successfully` }
});
```

## Bug 3: Success/Error Messages Not Showing Notifications ❌

**File**: `packages/core/src/domains/visualization/webview/main.ts`
**Lines**: 391-402

**Problem**: The `showKnowledgeSuccess` and `showKnowledgeError` functions only logged to console - they didn't show toast notifications to the user.

**Original Code**:
```typescript
function showKnowledgeSuccess(message: string): void {
    webviewLogger.info(LogCategory.UI, `Knowledge success: ${message}`, 'showKnowledgeSuccess');
    // Could show a toast notification here  ← Comment but not implemented!
}
```

**Fix**: Wire up to KnowledgeViewController's handleOperationResult:
```typescript
function showKnowledgeSuccess(message: string): void {
    webviewLogger.info(LogCategory.UI, `Knowledge success: ${message}`, 'showKnowledgeSuccess');

    // Show success notification via KnowledgeViewController
    const knowledgeController = (window as any).knowledgeController;
    if (knowledgeController && typeof knowledgeController.handleOperationResult === 'function') {
        knowledgeController.handleOperationResult('Operation', true, message);
    }
}
```

## Complete Fix

### Extension Side (timeline-provider-webpack.ts)

```typescript
private async handleApplyTemplate(payload: any): Promise<void> {
  if (!this.knowledgeManager) {
    return;
  }

  try {
    const activeEditor = vscode.window.activeTextEditor;
    const claudeMdPath = activeEditor?.document.fileName;

    // FIX 1: Case-insensitive check
    if (!claudeMdPath || !claudeMdPath.toLowerCase().endsWith('claude.md')) {
      this._view?.webview.postMessage({
        type: 'knowledge:error',
        payload: { error: 'Please open a claude.md file first' }
      });
      return;
    }

    // Add logging
    logger.info(
      LogCategory.EXTENSION,
      'Applying template to claude.md',
      'TimelineProvider.handleApplyTemplate',
      { templateId: payload.templateId, claudeMdPath },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    await this.knowledgeManager.applyTemplate(payload.templateId, claudeMdPath);
    await this.sendClaudeMdFiles();

    // FIX 2: Send success message
    const store = this.knowledgeManager.getStore();
    const template = store.getTemplate(payload.templateId);
    const templateName = template?.name || 'Template';

    this._view?.webview.postMessage({
      type: 'knowledge:success',
      payload: { message: `Template "${templateName}" applied successfully` }
    });

    logger.info(
      LogCategory.EXTENSION,
      'Template applied successfully',
      'TimelineProvider.handleApplyTemplate',
      { templateId: payload.templateId, templateName },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  } catch (error: any) {
    logger.error(
      LogCategory.EXTENSION,
      'Failed to apply template',
      'TimelineProvider.handleApplyTemplate',
      { templateId: payload.templateId, error },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    this._view?.webview.postMessage({
      type: 'knowledge:error',
      payload: { error: error.message }
    });
  }
}
```

### Webview Side (main.ts)

```typescript
function showKnowledgeSuccess(message: string): void {
    webviewLogger.info(LogCategory.UI, `Knowledge success: ${message}`, 'showKnowledgeSuccess');

    // FIX 3: Show toast notification
    const knowledgeController = (window as any).knowledgeController;
    if (knowledgeController && typeof knowledgeController.handleOperationResult === 'function') {
        knowledgeController.handleOperationResult('Operation', true, message);
    }
}

function showKnowledgeError(error: string): void {
    webviewLogger.error(LogCategory.UI, `Knowledge error: ${error}`, 'showKnowledgeError');

    // FIX 3: Show toast notification
    const knowledgeController = (window as any).knowledgeController;
    if (knowledgeController && typeof knowledgeController.handleOperationResult === 'function') {
        knowledgeController.handleOperationResult('Operation', false, error);
    }
}
```

## How the Template System Works

### File Structure

When a template is applied to `CLAUDE.md`, it appends content with HTML comment markers:

```markdown
# Your existing content

```

### Parsing Templates

The `TemplateEngine.parseTemplateMarkers()` method:
1. Scans file for HTML comment markers
2. Extracts template ID and name from markers
3. Returns `TemplateSection[]` with content, line numbers
4. This data is sent to webview for accordion display

### Why Items Weren't Showing

1. ✅ Template was successfully written to file (TemplateEngine worked)
2. ✅ File was re-scanned (sendClaudeMdFiles called)
3. ✅ Template sections were parsed
4. ❌ **User didn't get confirmation notification**
5. ❌ **Case-sensitive check might have blocked some users**

The accordion should have shown the template content, but without visual feedback, users didn't know to expand it or that the operation succeeded.

## Testing the Fix

### Test Case 1: Uppercase Filename
1. Create file named `CLAUDE.md` (uppercase)
2. Open in editor
3. Select 2 knowledge items
4. Save as template "Test Template"
5. Apply template
6. **Expected**: Success notification appears
7. **Expected**: Template visible in accordion

### Test Case 2: Lowercase Filename
1. Create file named `claude.md` (lowercase)
2. Repeat steps 2-7
3. **Expected**: Same successful behavior

### Test Case 3: Error Handling
1. Don't open any claude.md file
2. Try to apply template
3. **Expected**: Error notification: "Please open a claude.md file first"

## Prevention

### Code Review Checklist
- ✅ Always use case-insensitive file checks for multi-platform support
- ✅ Send success/error messages for all async operations
- ✅ Wire up message handlers to show user notifications
- ✅ Add comprehensive logging for debugging
- ✅ Test with both uppercase and lowercase filenames

### Pattern: Async Operation with Feedback
```typescript
async handleOperation(payload: any): Promise<void> {
  try {
    logger.info('Starting operation', 'handleOperation', payload);

    // Perform operation
    await this.manager.performOperation(payload);

    // Refresh UI data
    await this.sendUpdatedData();

    // Send success message
    this._view?.webview.postMessage({
      type: 'operation:success',
      payload: { message: 'Operation completed successfully' }
    });

    logger.info('Operation completed', 'handleOperation');
  } catch (error: any) {
    logger.error('Operation failed', 'handleOperation', error);

    // Send error message
    this._view?.webview.postMessage({
      type: 'operation:error',
      payload: { error: error.message }
    });
  }
}
```

## Impact

**Before Fix**:
- ❌ Template applied but user got no feedback
- ❌ Case-sensitive file check blocked uppercase filenames
- ❌ No toast notifications for success/error

**After Fix**:
- ✅ Success notification: "Template 'X' applied successfully"
- ✅ Works with both claude.md and CLAUDE.md
- ✅ Error notification if file not open
- ✅ Toast notifications with green/red styling
- ✅ Comprehensive logging for debugging

## Build

**Package**: `agent-brain-platform-0.2.1.vsix` (603.35 KB)
**Status**: ✅ Built and packaged

## Files Modified

1. `packages/vscode/src/providers/timeline-provider-webpack.ts` (~60 lines changed)
   - Case-insensitive file check
   - Success message after template apply
   - Comprehensive logging

2. `packages/core/src/domains/visualization/webview/main.ts` (~20 lines changed)
   - Wire success/error handlers to NotificationManager
   - Show toast notifications

## Related

- Template Engine Implementation (TemplateEngine.ts)
- Template UX Improvements Pattern (design-pattern)
- Notification Manager (NotificationManager.ts)
- Modal Dialog Component (ModalDialog.ts)

<!-- Agent-Brain Template: Template Application Bug - Items Not Visible After Apply [id: knowledge-8ce8f8c2089b] End -->
