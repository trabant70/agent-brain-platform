# Agent Brain Platform - Current Architecture Analysis

**Document Generated:** 2025-10-20
**Status:** Based on current codebase state (many domain deletions in progress)

---

## 1. CURRENT DOMAIN STRUCTURE

### Existing Domains (Actively Maintained)

The following domains are **present and functional** in `/packages/core/src/domains/`:

#### 1.1 **events/** - Canonical Event Model
**Responsibility:** Universal event format for the entire system
- **Key Files:**
  - `CanonicalEvent.ts` - Universal event interface
  - `EventType.ts` - Normalized event type enum (commits, PRs, issues, releases, sessions, etc.)
  - `EventSource.ts` - Event source tracking
  - `Author.ts` - Author information
  - `ImpactMetrics.ts` - Change metrics
  - `VisualizationHints.ts` - Rendering guidance
  - `types.ts` - Supporting type definitions
- **Key Principle:** NO transformations after CanonicalEvent creation
- **Event Types Supported:**
  - Git: COMMIT, MERGE, BRANCH_*, TAG_CREATED
  - GitHub: PR_*, ISSUE_*, RELEASE
  - CI/CD: BUILD_*, TEST_RUN
  - Intelligence: LEARNING_STORED, PATTERN_DETECTED, ADR_RECORDED
  - Sessions: AGENT_SESSION
- **Critical Field:** `branches[]` - All branches containing this event (prevents data loss)

#### 1.2 **knowledge/** - Knowledge Management System
**Responsibility:** Markdown-based knowledge item storage and retrieval
- **Key Files:**
  - `types.ts` - Complete type definitions (20 knowledge types, scopes, search results)
  - `KnowledgeStore.ts` - In-memory storage with fast indexing
  - `KnowledgeFileSystem.ts` - File I/O with YAML frontmatter parsing
  - `TemplateEngine.ts` - Template injection/removal for claude.md files
  - `index.ts` - Public API exports

- **Knowledge Types (20 total):**
  - Architectural: ADR, DESIGN_PATTERN, ANTI_PATTERN
  - Process: GOLDEN_PATH, STANDARD, CONVENTION, CHECKLIST
  - Technical: SNIPPET, CONFIGURATION, COMMAND, API_REFERENCE
  - Learning: LEARNING, TROUBLESHOOTING, GOTCHA, TIP
  - Documentation: TEMPLATE, GUIDELINE, WORKFLOW, RUNBOOK
  - Other: CUSTOM

- **Knowledge Scopes:**
  - PERSONAL, TEAM, PROJECT, ORGANIZATION, PUBLIC

- **Storage Location:** `.agent-brain/` directory (directory structure inferred from type)

- **KnowledgeStore Features:**
  - Indexed by: type, scope, tag, path
  - Search with scoring
  - Filter by criteria (types, scopes, tags, query)
  - Statistics tracking
  - Bulk operations

- **KnowledgeFileSystem Features:**
  - Parse markdown with YAML frontmatter
  - Type inference from directory path
  - Title extraction from frontmatter or body
  - Graceful error handling for malformed files
  - YAML escaping for special characters

- **TemplateEngine Features:**
  - Inject templates into claude.md files
  - Remove templates by ID
  - HTML comment markers: `<!-- Agent-Brain Template: name [id: uuid] Start/End -->`
  - Conflict detection (duplicate templates, overlapping items)
  - Template validation and export

#### 1.3 **providers/** - Data Source Adapters
**Responsibility:** Transform external data to CanonicalEvent[]
- **Provider Registry:**
  - `base/ProviderRegistry.ts` - Plugin registration system
  - `base/index.ts` - Base interfaces
  
- **Git Provider:**
  - `git/GitProvider.ts` - Local git repository events
  - `git/GitEventRepository.ts` - Git command execution wrapper
  - `git/git-event.types.ts` - Git-specific types
  - Extracts: commits, branches, tags, merge commits

- **GitHub Provider:**
  - `github/GitHubProvider.ts` - GitHub API integration
  - `github/GitHubClient.ts` - Octokit wrapper
  - `github/RateLimitManager.ts` - API rate limiting
  - `github/transformers/` - Event transformers:
    - `commitTransformer.ts`
    - `pullRequestTransformer.ts`
    - `issueTransformer.ts`
    - `releaseTransformer.ts`
  - `github/types/github-api.types.ts` - GitHub API types

- **Sessions Provider:**
  - `sessions/SessionEventProvider.ts` - Session event generation
  - `sessions/index.ts` - Public API

- **Intelligence Provider (Stub):**
  - `intelligence/index.ts` - Placeholder (deleted implementations)

#### 1.4 **sessions/** - Session Tracking
**Responsibility:** Track coding sessions and learning capture
- **Key Files:**
  - `SessionManager.ts` - Session lifecycle
  - `SessionStorage.ts` - Persistence
  - `types.ts` - Session data structures

#### 1.5 **visualization/** - Webview & Timeline Rendering
**Responsibility:** Data visualization and UI presentation
- **Subdirectories:**

  - **webview/** - Entry point
    - `main.ts` - Webview initialization and message handling
    - `SimpleTimelineApp.ts` - Main timeline application controller
    - `WebviewLogger.ts` - Browser-side logging

  - **timeline/** - D3 Rendering
    - `D3TimelineRendererImpl.ts` - D3 timeline visualization
    - `D3TimelineRenderer.ts` - Renderer interface
    - `EventRenderer.ts` - Individual event rendering
    - `TimelineRenderer.ts` - Legacy?
    - `LegendRenderer.ts` - Legend display
    - `InteractionHandler.ts` - Event interactions (hover, click, zoom)

  - **ui/** - UI Controllers
    - `TabManager.ts` - Multi-tab navigation (timeline, knowledge)
    - `UIControllerManager.ts` - Central UI orchestration
    - `FilterController.ts` - Filter management
    - `PopupController.ts` - Event popup handling
    - `ContextController.ts` - Context information display
    - `KnowledgeViewController.ts` - Knowledge tab controller
    - `ThemeController.ts` - Color/theme management
    - `ModalDialog.ts` - Modal dialogs
    - `NotificationManager.ts` - Notifications

  - **data/** - Data Processing
    - `TimelineDataManager.ts` - Main data coordinator
    - `TimelineDataProcessor.ts` - Data transformation
    - `EventAggregator.ts` - Event aggregation
    - `StatisticsCalculator.ts` - Statistics computation

  - **filters/** - Filtering Logic
    - `FilterController.ts` - Filter UI and state
    - `FilterStateManager.ts` - Filter persistence

  - **orchestration/** - Central Coordination
    - `DataOrchestrator.ts` - Main coordinator (caching, filtering, provider registration)
    - `EventMatcher.ts` - Event deduplication

  - **theme/** - Theming
    - `EventVisualTheme.ts` - Color schemes, shapes, z-indexing

  - **styles/** - CSS
    - `base.css` - Global styles
    - `timeline.css` - Timeline styles
    - `components/` - Component styles (stats, knowledge, etc.)

#### 1.6 **context/** - Project Context
**Responsibility:** Store project-specific rules and decisions
- **Key Files:**
  - `ContextManager.ts` - Context management
  - `ContextStorage.ts` - Persistence
  - `types.ts` - Context types (rules, decisions)

#### 1.7 **extension/** - Extension Interfaces (NEW)
**Responsibility:** Extension service boundaries
- Currently appears to be placeholder for future use

---

## 2. RECENT ARCHITECTURAL CHANGES

### Deleted Domains (Git Status Shows Deletions)
The following domains have been **removed** from the git index:
- `intelligence/` - Complex intelligence/expertise system
- `enhancement/` - Prompt enhancement pipeline (5 stages)
- `expertise/` - Package management system
- `guidance/` - Guidance engine
- `planning/` - Planning engine
- `achievement/` - Achievement tracking system

### Reason for Deletion
**Simplification Strategy:** The architecture has moved from a complex multi-domain system to a **simplified core** focused on:
1. Timeline visualization (CanonicalEvent → D3)
2. Knowledge management (markdown-based)
3. Session tracking

The deleted domains represented "Phase 2-9" aspirational features that have been deferred.

### Architecture Evolution
```
Old (Complex):
Provider → Normalizer → Transformer → Pipeline → Cache → Renderer

New (Simplified):
Provider → CanonicalEvent[] → DataOrchestrator (cache+filter) → Renderer
                            ↓
                        KnowledgeStore
```

---

## 3. KEY FILE LOCATIONS

### Core Package (`packages/core/src/domains/`)

**Timeline Flow:**
```
GitProvider → CanonicalEvent[]
GitHubProvider → CanonicalEvent[]  → DataOrchestrator → FilterStateManager
SessionEventProvider → CanonicalEvent[]
```

**Knowledge Flow:**
```
.agent-brain/**/*.md → KnowledgeFileSystem (parse)
                    → KnowledgeStore (index)
                    → TemplateEngine (inject/remove)
```

**Visualization Flow:**
```
DataOrchestrator → SimpleTimelineApp → D3TimelineRendererImpl → SVG
                                    ↓
                              UIControllerManager
                                    ↓
                         (TabManager, FilterController, etc.)
```

### VSCode Package (`packages/vscode/src/`)

**Key Service Layer:**
- `services/KnowledgeManager.ts` - **Complete 27KB implementation**
  - File watching and auto-loading
  - CRUD operations for knowledge items
  - Template creation and application
  - claude.md file management
  - VSCode workspace integration

**Providers:**
- `providers/timeline-provider-webpack.ts` - **Main extension host**
  - Message routing (extension ↔ webview)
  - Orchestrator initialization
  - Knowledge data transmission
  - Data refresh coordination

**Commands:**
- `commands/index.ts` - Command registration

**Adapters:**
- `adapters/` - File system and event adapters (stub)

---

## 4. MESSAGE PROTOCOL (Extension ↔ Webview)

### Current Message Types

#### Timeline Management
| Message Type | Direction | Purpose |
|-------------|-----------|---------|
| `requestData` | Webview → Extension | Webview ready, request timeline data |
| `timelineData` | Extension → Webview | Send CanonicalEvent[] |
| `filteredData` | Extension → Webview | Send filtered CanonicalEvent[] |
| `updateFilters` | Webview → Extension | Apply new filters |
| `toggleProvider` | Webview → Extension | Enable/disable provider |
| `setColorMode` | Webview → Extension | Change color theme |
| `colorModeChanged` | Extension → Webview | Theme update response |
| `refreshData` | Webview → Extension | Force data refresh |
| `clearCache` | Webview → Extension | Clear orchestrator cache |
| `resize` | Extension → Webview | Trigger resize handler |

#### Knowledge Management
| Message Type | Direction | Purpose |
|-------------|-----------|---------|
| `knowledge:load-request` | Webview → Extension | Request knowledge items |
| `knowledge:loaded` | Extension → Webview | Send KnowledgeItem[] |
| `knowledge:scan-claude-files` | Webview → Extension | Find claude.md files |
| `knowledge:claude-files` | Extension → Webview | Send claude.md locations |
| `knowledge:create-item` | Webview → Extension | Create new item |
| `knowledge:update-item` | Webview → Extension | Update existing item |
| `knowledge:delete-item` | Webview → Extension | Delete item |
| `knowledge:create-template` | Webview → Extension | Create template |
| `knowledge:apply-template` | Webview → Extension | Apply template to file |
| `knowledge:remove-template` | Webview → Extension | Remove template |
| `knowledge:export-template` | Webview → Extension | Export template |
| `knowledge:showCreateDialog` | Webview → Extension | Show create dialog |
| `knowledge:showEditDialog` | Webview → Extension | Show edit dialog |
| `knowledge:item-updated` | Extension → Webview | Item changed |
| `knowledge:item-deleted` | Extension → Webview | Item removed |

#### Agent Brain Features
| Message Type | Direction | Purpose |
|-------------|-----------|---------|
| `guidance.*` | Bidirectional | Agent Brain guidance requests |
| `knowledge.*` | Bidirectional | Agent Brain knowledge requests |
| `error` | Extension → Webview | Error response |

#### Configuration
| Message Type | Direction | Purpose |
|-------------|-----------|---------|
| `loggingConfig` | Extension → Webview | Send logging configuration |

### Message Flow Sequence

```
Webview Startup:
1. Webview sends: { type: 'requestData' }
2. Extension receives 'requestData'
3. Extension sends: { type: 'loggingConfig', config: {...} }
4. Extension sends: { type: 'timelineData', data: CanonicalEvent[] }
5. Extension sends: { type: 'knowledge:loaded', payload: KnowledgeItem[] }
6. Extension sends: { type: 'knowledge:claude-files', payload: [...] }

User Interaction:
1. Webview sends: { type: 'updateFilters', filters: {...} }
2. Extension applies filters via DataOrchestrator
3. Extension sends: { type: 'filteredData', data: CanonicalEvent[] }

Visibility Changes:
1. User switches VSCode tabs (webview becomes visible)
2. Extension detects visibility change
3. Extension sends: { type: 'resize' }
4. Extension re-sends knowledge data
```

---

## 5. KNOWLEDGE SYSTEM IMPLEMENTATION

### Directory Structure
```
.agent-brain/
├── adrs/                  # ADR (Architecture Decision Records)
├── golden-paths/          # Golden paths (recommended approaches)
├── patterns/              # Design patterns
├── standards/             # Coding/process standards
├── learnings/             # Session learnings
├── snippets/              # Code snippets
├── commands/              # CLI commands
├── troubleshooting/       # Problem solutions
├── workflows/             # Workflows
├── runbooks/              # Operational runbooks
├── templates/             # Saved templates (JSON)
├── exports/               # Exported files
└── [other]/               # Custom types → custom/ dir
```

### Frontmatter Format
```markdown
---
title: My Item
type: golden-path
scope: team
source: auth.oauth.keycloak
tags: authentication, oauth
author: Developer Name
version: 1
---

# Markdown Body

Content here...
```

**Required Fields:** title, type, scope
**Optional Fields:** source, tags, author, version

### KnowledgeStore Indexing
```typescript
// Fast lookups by
- Type (Map<KnowledgeType, Set<itemIds>>)
- Scope (Map<KnowledgeScope, Set<itemIds>>)
- Tag (Map<tag, Set<itemIds>>)
- Path (Map<path, itemId>)
```

### File Watching & Auto-Reload
- Watches `.agent-brain/**/*.md` pattern
- 200ms debounce on changes
- Auto-reloads changed/deleted files
- Graceful error handling for malformed files (returns fallback item)

### TemplateEngine Marker Format
```html
<!-- Agent-Brain Template: Template Name [id: uuid-here] Start -->

[Generated content from knowledge items]

<!-- Agent-Brain Template: Template Name [id: uuid-here] End -->
```

### Template Features
- Conflict detection (duplicate application)
- Item overlap detection
- Marker validation
- Export to standalone files

---

## 6. BUILD SYSTEM

### Core Package (`packages/core/`)

**Build Script:**
```bash
npm run build    # TypeScript → dist/
npm run test     # Run jest tests
npm run test:pathways  # Run pathway-specific tests
npm run clean    # Remove dist/
```

**TypeScript Config:** `tsconfig.json`
- Target: ES2020
- Module: commonjs
- Declaration: true
- Source maps enabled

### VSCode Package (`packages/vscode/`)

**Build Scripts:**
```bash
npm run build      # Production webpack build
npm run watch      # Development watch mode
npm run package    # Create VSIX (bumps version)
npm run clean      # Remove dist/
```

**Webpack Configuration:** `webpack.config.js`
- **3 Entry Points:**

  1. **Extension (Node.js):**
     - Entry: `src/extension.ts`
     - Target: Node (commonjs2)
     - Output: `dist/extension.js`
     - Externals: vscode
     - Source maps for debugging

  2. **Webview (Browser):**
     - Entry: `../core/src/domains/visualization/webview/main.ts`
     - Target: Web (bundle)
     - Output: `dist/webview/[name].[contenthash].js`
     - CSS inline via style-loader
     - D3 bundled

  3. **Assets:**
     - Copy styles from core
     - Copy templates
     - Copy images

**Loaders:**
- `ts-loader` - TypeScript compilation
- `style-loader` + `css-loader` - CSS bundling
- `copy-webpack-plugin` - Asset copying

**Aliasing:**
```
@agent-brain/core → ../core/src
@visualization → ../core/src/domains/visualization
@webview → ../core/src/domains/visualization/webview
```

### Monorepo Scripts (from root)

```bash
npm run build              # Build all packages
npm run build:core         # Build core only
npm run build:vscode       # Build vscode only
npm run test               # Run all tests
npm run test:pathways      # Run pathway tests
npm run package:vscode     # Create VSIX
npm run clean              # Clean all packages
```

---

## 7. ARCHITECTURAL PATTERNS

### Single Transformation Rule
**Principle:** Transform data ONCE at provider boundaries only
- ✅ Providers transform to CanonicalEvent[]
- ❌ NO transformations between visualization layers
- ❌ NO intermediate adapter layers
- Result: Data flows unchanged through entire system

### Canonical Event Model
**Universal Format:** All components work with `CanonicalEvent[]`
- Preserves ALL source data (especially `branches[]`)
- Extensible via `metadata` field (use sparingly)
- Normalized event types across providers
- Prevents data loss through transformations

### Filter, Don't Transform
**Filtering Strategy:**
- Filtering removes events from view but never changes structure
- Multiple filter criteria combined via DataOrchestrator
- FilterStateManager persists filter state per repository

### Simplicity Over Abstraction
- Inline logic preferred over complex pipelines
- Fewer layers = fewer bugs
- Direct method calls instead of event buses

### File System as Source of Truth
- Knowledge items stored as markdown files in `.agent-brain/`
- File watching triggers auto-reload
- Directory structure infers knowledge type
- Frontmatter stores metadata

---

## 8. CURRENT LIMITATIONS & KNOWN ISSUES

### Deleted Features (Not Currently Available)
1. **Intelligence/Expertise System** - Complex expertise package management
2. **Prompt Enhancement Pipeline** - 5-stage prompt enhancement
3. **Guidance Engine** - AI guidance features
4. **Planning Engine** - Planning capabilities
5. **Achievement System** - Achievement tracking

### Known Constraints
1. **Git Limitations:** Cannot retrieve all historical branches for old commits (API limitation)
2. **Knowledge File Format:** Simple YAML parsing (not full YAML spec)
3. **Template Markers:** HTML comments must be precisely formatted
4. **Webview Threading:** Single threaded (D3 rendering can block)

### Architecture Decisions for Future
- Phase 2+: Intelligence system (learnings, patterns, ADRs)
- Phase 3+: Guidance engine
- Phase 4+: AI-powered features
- Current: MVP focused on visualization & knowledge

---

## 9. EXTENSION ENTRY POINTS

### Extension Initialization
**File:** `packages/vscode/src/extension.ts`
- Creates TimelineProvider
- Initializes KnowledgeManager
- Registers commands
- Sets up event listeners

### Webview Initialization
**File:** `packages/core/src/domains/visualization/webview/main.ts`
1. Acquires VSCode API
2. Initializes SimpleTimelineApp
3. Sets up message listener
4. Requests initial data from extension
5. Renders D3 timeline when data received

### Message Flow Order
```
Extension activates
  → Create TimelineProvider
  → Create KnowledgeManager
  → Register with VSCode

User opens timeline view
  → Webview loads main.ts
  → Webview calls acquireVsCodeApi()
  → Webview sends 'requestData'
  
Extension receives 'requestData'
  → Initialize DataOrchestrator
  → Fetch events from providers
  → Send 'loggingConfig'
  → Send 'timelineData'
  → Send 'knowledge:loaded'
  → Send 'knowledge:claude-files'

Webview receives messages
  → Store in SimpleTimelineApp
  → Initialize UI controllers
  → Render D3 timeline
  → Display knowledge items
```

---

## 10. LOGGING & DEBUGGING

### Logger Configuration

**Extension Logger:**
```typescript
import { logger, LogCategory, LogPathway } from '@agent-brain/core/infrastructure/logging/Logger';

logger.info(LogCategory.EXTENSION, message, methodName, data, LogPathway.DATA_INGESTION);
logger.debug(LogCategory.WEBVIEW, message, methodName, data, LogPathway.WEBVIEW_MESSAGING);
logger.error(LogCategory.ORCHESTRATION, message, methodName, error, LogPathway.RENDER_PIPELINE);
```

**Webview Logger:**
```typescript
import { webviewLogger, LogCategory, LogPathway } from './WebviewLogger';

webviewLogger.info(LogCategory.VISUALIZATION, message, methodName);
webviewLogger.debug(LogCategory.UI, message, methodName, data, LogPathway.FILTER_APPLY);
```

### Log Categories
- EXTENSION, WEBVIEW, ORCHESTRATION, VISUALIZATION, UI, DATA, etc.

### Log Pathways (Configurable in VSCode Settings)
- `DATA_INGESTION` - Provider → Orchestrator
- `FILTER_APPLY` - Filter changes
- `RENDER_PIPELINE` - D3 rendering
- `KNOWLEDGE_MANAGEMENT` - Knowledge CRUD
- `WEBVIEW_MESSAGING` - Extension ↔ Webview
- Plus Agent Brain pathways: GUID_INIT, VALID, PLAN, MINI, DIAG, GOLD, PROMPT, EVT_FWD

### VSCode Settings (agentBrain.*)
```json
"agentBrain.logging.pathwayMode": "exclusive" | "filter" | "disabled"
"agentBrain.logging.enabledPathways": ["KNOWLEDGE", "GUID_INIT", ...]
"agentBrain.logging.logLevel": "DEBUG" | "INFO" | "WARN" | "ERROR" | "NONE"
```

---

## SUMMARY TABLE

| Aspect | Implementation | Status |
|--------|----------------|--------|
| **Core Architecture** | Simplified CanonicalEvent model | Complete |
| **Timeline Visualization** | D3-based SVG with interactions | Complete |
| **Knowledge Management** | Markdown + YAML frontmatter | Complete |
| **Data Providers** | Git, GitHub, Sessions | Complete |
| **Message Protocol** | 25+ message types | Complete |
| **Multi-tab UI** | Timeline + Knowledge tabs | Complete |
| **Filtering System** | By branch, author, type, provider | Complete |
| **File Watching** | Auto-reload on changes | Complete |
| **Templates** | Inject/remove in claude.md | Complete |
| **Intelligence System** | **DELETED** - Deferred |
| **Prompt Enhancement** | **DELETED** - Deferred |
| **Guidance Engine** | **DELETED** - Deferred |
| **Planning Engine** | **DELETED** - Deferred |

---

## ABSOLUTE FILE PATHS (for reference)

**Core Domain Files:**
- `/mnt/c/projects/agent-brain-platform/packages/core/src/domains/events/CanonicalEvent.ts`
- `/mnt/c/projects/agent-brain-platform/packages/core/src/domains/knowledge/types.ts`
- `/mnt/c/projects/agent-brain-platform/packages/core/src/domains/knowledge/KnowledgeStore.ts`
- `/mnt/c/projects/agent-brain-platform/packages/core/src/domains/knowledge/KnowledgeFileSystem.ts`
- `/mnt/c/projects/agent-brain-platform/packages/core/src/domains/knowledge/TemplateEngine.ts`
- `/mnt/c/projects/agent-brain-platform/packages/core/src/domains/visualization/orchestration/DataOrchestrator.ts`

**VSCode Service Files:**
- `/mnt/c/projects/agent-brain-platform/packages/vscode/src/services/KnowledgeManager.ts`
- `/mnt/c/projects/agent-brain-platform/packages/vscode/src/providers/timeline-provider-webpack.ts`

**Webview Files:**
- `/mnt/c/projects/agent-brain-platform/packages/core/src/domains/visualization/webview/main.ts`
- `/mnt/c/projects/agent-brain-platform/packages/core/src/domains/visualization/webview/SimpleTimelineApp.ts`

**Build Configuration:**
- `/mnt/c/projects/agent-brain-platform/packages/vscode/webpack.config.js`
- `/mnt/c/projects/agent-brain-platform/packages/vscode/package.json`
- `/mnt/c/projects/agent-brain-platform/packages/core/package.json`

