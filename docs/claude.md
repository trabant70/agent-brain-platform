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
