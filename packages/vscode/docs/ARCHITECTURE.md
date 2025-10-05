# Repository Timeline Extension - Architecture

**Version:** 0.4.66
**Last Updated:** 2025-10-04
**Architecture:** Simplified Canonical Event with Dual Color Modes and Pathway Testing

---

## Table of Contents

1. [Overview](#overview)
2. [Core Principles](#core-principles)
3. [Architecture Diagram](#architecture-diagram)
4. [Data Flow](#data-flow)
5. [Component Details](#component-details)
6. [Key Design Decisions](#key-design-decisions)
7. [Extension Points](#extension-points)
8. [Performance Characteristics](#performance-characteristics)

---

## Overview

The Repository Timeline Extension visualizes repository evolution through an interactive D3-based timeline with a range selector (slicer). It supports multiple data sources (git, GitHub, JIRA) through a plugin architecture while maintaining zero data loss through a canonical event model.

### Key Features

- **Interactive Timeline**: D3-based visualization with zoom, pan, and range selector
- **Multi-Branch Support**: Full branch visibility with accurate event attribution
- **Shape-Based Events**: 7 unique D3 symbols (circle, diamond, wye, cross, triangle, square, star) for visual differentiation
- **Dual Color Modes**: Toggle between Semantic (event type) and Sync State (location) color schemes
- **Z-Index Layering**: Fixed rendering order ensures important events always visible
- **Control Center**: Unified filtering, configuration, and support interface
- **Filtering**: Branch, author, event type, date range, and provider filters
- **Data Source Plugins**: Extensible provider system for different data sources
- **Zero Transformation**: Single canonical event type prevents data loss

---

## Core Principles

### 1. **Single Transformation Rule**
Transform data exactly **ONCE** - when entering the system at the provider boundary. No transformations occur between layers.

### 2. **Canonical Event Model**
All components work with `CanonicalEvent[]` - a rich, universal event type that preserves ALL source data.

### 3. **Filter, Don't Transform**
Filtering removes events from view but doesn't change their structure. Original data always preserved.

### 4. **Plugin Architecture**
Providers and renderers are pluggable, enabling future extensibility without core changes.

### 5. **Simplicity Over Abstraction**
Inline logic preferred over complex pipelines. Fewer layers = fewer bugs.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     VS CODE EXTENSION HOST                       │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ TimelineProvider (timeline-provider-webpack.ts)            │ │
│  │ - Manages webview lifecycle                                │ │
│  │ - Handles message passing                                  │ │
│  │ - Coordinates with DataOrchestrator                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ↓                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ DataOrchestrator (orchestration/DataOrchestrator.ts)      │ │
│  │ - Repository-level caching                                 │ │
│  │ - Inline filtering logic                                   │ │
│  │ - Provider coordination                                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ↓                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ ProviderRegistry (orchestration/ProviderRegistry.ts)      │ │
│  │ - Provider lifecycle management                            │ │
│  │ - Health monitoring                                        │ │
│  │ - Priority-based provider selection                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ↓                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ IDataProvider Interface                                    │ │
│  │ ├─ fetchEvents(context) → CanonicalEvent[]                │ │
│  │ ├─ getCapabilities() → ProviderCapabilities               │ │
│  │ └─ getFilterOptions() → FilterOptions                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ↓                                    │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │   GitProvider   │  │  GitHubProvider  │  │  JiraProvider  │  │
│  │   (git/local)   │  │  (github)        │  │  (coming soon) │  │
│  └─────────────────┘  └──────────────────┘  └────────────────┘  │
│           ↓                     ↓                                 │
│  ┌────────────────────┐  ┌────────────────────────────────────┐ │
│  │ GitEventRepository │  │ GitHubClient + RateLimitManager    │ │
│  │ - Git commands     │  │ - @octokit/rest wrapper            │ │
│  │ - Commit, branch,  │  │ - VSCode GitHub authentication     │ │
│  │   tag extraction   │  │ - Rate limit protection            │ │
│  │ - Git → Canonical  │  │ - ETag caching                     │ │
│  └────────────────────┘  │ - GitHub API → CanonicalEvent      │ │
│                           └────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    CanonicalEvent[] via postMessage
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                          WEBVIEW                                 │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ SimpleTimelineApp (webview/SimpleTimelineApp.ts)          │ │
│  │ - Message handler                                          │ │
│  │ - Data processing coordinator                              │ │
│  │ - Statistics calculation                                   │ │
│  │ - UI manager integration                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ↓                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ D3TimelineRendererImpl (renderers/D3TimelineRendererImpl) │ │
│  │ - D3-based visualization                                   │ │
│  │ - Range selector (slicer)                                  │ │
│  │ - Zoom & pan controls                                      │ │
│  │ - Event rendering                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ↓                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Visualization Components                                   │ │
│  │ ├─ D3TimelineRenderer - Main timeline SVG                 │ │
│  │ ├─ TimelineRenderer - Event shape rendering (D3 symbols)  │ │
│  │ ├─ InteractionHandler - Brush, zoom, pan                  │ │
│  │ ├─ LegendRenderer - Adaptive legend (mode-aware)          │ │
│  │ └─ EventVisualTheme - Centralized visual theme system     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ↓                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ UI Controllers                                             │ │
│  │ ├─ FilterController - Control Center (3 tabs)             │ │
│  │ ├─ PopupController - Event detail popups                  │ │
│  │ └─ UIControllerManager - Coordination                     │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Initial Load

```
User opens file in VS Code
    ↓
TimelineProvider detects repo path
    ↓
DataOrchestrator.getEvents(repoPath)
    ↓
Check cache (miss)
    ↓
ProviderRegistry.getHealthyProviders()
    ↓
GitProvider.fetchEvents()
    ↓
GitEventRepository.extractGitEvents()
    ↓
Git commands execute (log, branch, tag)
    ↓
Transform GitEvent → CanonicalEvent (ONCE)
    ↓
Return CanonicalEvent[]
    ↓
Cache in DataOrchestrator
    ↓
postMessage to webview
    ↓
SimpleTimelineApp.handleTimelineData()
    ↓
D3TimelineRendererImpl.renderData()
    ↓
Timeline renders with full data
```

### 2. Filter Application

```
User applies branch filter
    ↓
FilterController emits filter change
    ↓
SimpleTimelineApp.handleFilterUpdate()
    ↓
postMessage to extension host
    ↓
DataOrchestrator.getFilteredEvents(filters)
    ↓
Get cached CanonicalEvent[]
    ↓
Apply filters (inline, pure function)
    ↓
Return filtered CanonicalEvent[]
    ↓
postMessage to webview
    ↓
D3TimelineRendererImpl.update()
    ↓
Timeline re-renders with filtered data
```

### 3. Range Selector (Slicer)

```
User drags brush on range selector
    ↓
InteractionHandler.onBrushMove()
    ↓
Calculate new date range from brush position
    ↓
Filter events to date range (client-side)
    ↓
D3TimelineRenderer.update()
    ↓
Main timeline updates to show events in range
```

---

## Component Details

### Extension Host Components

#### TimelineProvider
**File:** `src/providers/timeline-provider-webpack.ts`

**Responsibilities:**
- Create and manage webview
- Handle webview lifecycle (visibility, disposal)
- Coordinate between VS Code and webview
- Message routing

**Key Methods:**
- `resolveWebviewView()` - Initialize webview
- `handleMessage()` - Process messages from webview
- `loadTimelineForActiveFile()` - Fetch and send data
- `applyFilters()` - Apply filters and send results

#### DataOrchestrator
**File:** `src/orchestration/DataOrchestrator.ts`

**Responsibilities:**
- Cache management (repository-level)
- Provider coordination
- Inline filtering
- Filter options extraction

**Key Methods:**
- `getEvents(repoPath)` - Get or fetch events
- `getFilteredEvents(repoPath, filters)` - Apply filters
- `getFilterOptions(repoPath)` - Extract filter options
- `invalidateCache()` - Clear cache

**Filter Logic (Inline):**
```typescript
private applyFilters(events: CanonicalEvent[], filters: FilterState): CanonicalEvent[] {
  return events.filter(event => {
    // Branch filter: Match ANY branch
    if (filters.branches?.length) {
      if (!event.branches.some(b => filters.branches!.includes(b))) {
        return false;
      }
    }

    // Author filter: Match author name
    if (filters.authors?.length) {
      if (!filters.authors.includes(event.author.name)) {
        return false;
      }
    }

    // Event type filter: Exclude types
    if (filters.excludedEventTypes?.length) {
      if (filters.excludedEventTypes.includes(event.type)) {
        return false;
      }
    }

    return true;
  });
}
```

#### GitProvider
**File:** `src/providers/git/GitProvider.ts`

**Responsibilities:**
- Wrap GitEventRepository
- Transform GitEvent → CanonicalEvent (ONCE)
- Preserve ALL git data (especially `branches[]`)

**Transformation Logic:**
```typescript
async fetchEvents(context: ProviderContext): Promise<CanonicalEvent[]> {
  const gitCollection = await this.gitRepo.extractGitEvents(context.repoPath);

  return gitCollection.events.map(gitEvent => ({
    id: gitEvent.id,
    canonicalId: `git-local:${gitEvent.id}`,
    providerId: 'git-local',
    type: this.mapEventType(gitEvent.type),
    timestamp: gitEvent.date,
    title: gitEvent.title,
    author: {
      id: gitEvent.author,
      name: gitEvent.author,
      email: gitEvent.metadata?.email
    },
    branches: gitEvent.branches || [gitEvent.branch], // PRESERVE ALL
    primaryBranch: gitEvent.branch,
    hash: gitEvent.metadata?.hash,
    parentIds: gitEvent.parentHashes || [],
    impact: {
      filesChanged: gitEvent.filesChanged,
      linesAdded: gitEvent.insertions,
      linesRemoved: gitEvent.deletions
    }
  }));
}
```

### Webview Components

#### SimpleTimelineApp
**File:** `src/webview/SimpleTimelineApp.ts`

**Responsibilities:**
- Handle messages from extension host
- Process CanonicalEvent[] data
- Calculate statistics (window, velocity)
- Coordinate renderer and UI controllers

**Statistics Calculation:**
```typescript
private calculateWindow(dateRange: [Date, Date]): string {
  const msPerDay = 24 * 60 * 60 * 1000;
  const days = Math.max(1, Math.ceil(
    (dateRange[1].getTime() - dateRange[0].getTime()) / msPerDay
  ));
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

private calculateVelocity(eventCount: number, dateRange: [Date, Date]): string {
  const msPerDay = 24 * 60 * 60 * 1000;
  const days = Math.max(1, Math.ceil(
    (dateRange[1].getTime() - dateRange[0].getTime()) / msPerDay
  ));
  const velocity = (eventCount / days).toFixed(2);
  return `${velocity}/day`;
}
```

#### D3TimelineRenderer
**File:** `src/visualization/d3/D3TimelineRenderer.ts`

**Responsibilities:**
- SVG setup and scales
- Event circle rendering
- Branch lanes
- Axis rendering
- Legend

#### InteractionHandler
**File:** `src/visualization/d3/InteractionHandler.ts`

**Responsibilities:**
- Range selector (brush)
- Zoom behavior
- Pan behavior
- Histogram rendering
- Brush event handling

---

## Key Design Decisions

### 1. Why CanonicalEvent?

**Problem:** Multiple transformations caused data loss (`branches[]` bug)

**Solution:** Transform ONCE at provider boundary, preserve ALL data

**Benefits:**
- Zero data loss
- Simpler debugging (one format)
- Easy to add new providers
- No transformation bugs between layers

### 2. Why Inline Filtering?

**Problem:** FilteringPipeline added complexity without value

**Solution:** Inline filter logic in DataOrchestrator

**Benefits:**
- ~200 lines of code removed
- Easier to understand
- Faster execution (no pipeline overhead)
- Pure function (no side effects)

### 3. Why SimpleTimelineApp?

**Problem:** Old TimelineApp had complex transformation layers

**Solution:** New SimpleTimelineApp works directly with CanonicalEvent

**Benefits:**
- ~1,500 lines removed
- Direct data flow
- No intermediate formats
- Statistics calculated inline

---

## Extension Points

### Feature Flag System

**Location:** `src/core/FeatureFlags.ts`

Token-based feature enablement for controlled rollout:

```typescript
// Default token enables all features
const DEFAULT_TOKEN = 'ENABLE_ALL_FEATURES_v1';

// Check if feature is enabled
const enabled = await isFeatureEnabled(Feature.GITHUB_PROVIDER);

// Initialize with custom config
const manager = FeatureFlagManager.getInstance({
  token: 'custom-token',
  enableAll: true
});
```

**Features:**
- `GITHUB_PROVIDER` - GitHub API integration
- `JIRA_PROVIDER` - JIRA integration (planned)
- `AGENT_BRAIN` - AI insights (planned)
- `ADVANCED_ANALYTICS` - Advanced analytics (planned)

**Token Validator:**
- Simple string comparison for now
- Future: API validation, expiration checks, feature-specific tokens
- Extensible via `ITokenValidator` interface

### Adding a New Provider

```typescript
export class MyProvider implements IDataProvider {
  readonly id = 'my-provider';
  readonly name = 'My Provider';

  async fetchEvents(context: ProviderContext): Promise<CanonicalEvent[]> {
    const rawData = await this.fetchFromSource(context);

    return rawData.map(raw => ({
      id: raw.id,
      canonicalId: `${this.id}:${raw.id}`,
      providerId: this.id,
      type: this.mapType(raw),
      timestamp: new Date(raw.createdAt),
      title: raw.title,
      author: { id: raw.authorId, name: raw.authorName },
      branches: raw.branches || [],
      parentIds: raw.parents || [],
      metadata: raw.extraData
    }));
  }
}
```

---

## Debugging and Logging

### Pathway-Based Logging System (v0.4.65)

The extension uses a sophisticated **dual-context logging system** that supports pathway-based filtering across both extension and webview environments. This allows you to trace specific data flows through the entire codebase without drowning in irrelevant logs.

#### Core Concept

Instead of just filtering by component (category) or severity (level), you can filter by **data flow pathway** - the end-to-end chain of components involved in a specific feature. This works **identically** in both the extension host (Node.js) and webview (browser) contexts.

#### Architecture

**Extension-Side Logger** (`src/utils/Logger.ts`):
- Runs in Node.js context
- Outputs to VS Code Output panel and Debug Console
- Full TypeScript Logger class with file output support
- Used by providers, orchestrator, and extension host code

**Webview-Side Logger** (`src/webview/WebviewLogger.ts`):
- Runs in browser context (Chromium)
- Outputs to Browser DevTools console (Right-click → Inspect)
- Mirrors extension Logger API exactly
- Optional relay to extension via postMessage
- Globally accessible in console: `window.webviewLogger`

**Why Two Loggers?**
- Extension and webview run in **separate JavaScript contexts**
- Different debugging tools (Output Panel vs DevTools)
- Same API = consistent debugging experience across contexts

#### Available Pathways

| Pathway | Description | Extension Components | Webview Components | Cross-Context |
|---------|-------------|---------------------|-------------------|---------------|
| `DATA_INGESTION` | Provider → Orchestrator → Webview → Render | GitProvider, DataOrchestrator | main.ts, SimpleTimelineApp, Renderer | postMessage |
| `FILTER_APPLY` | Filter UI → State → Data refresh → Re-render | FilterStateManager, DataOrchestrator | FilterController, SimpleTimelineApp | Both |
| `STATE_PERSIST` | State save/restore across sessions | FilterStateManager | FilterController | Both |
| `RENDER_PIPELINE` | Data processing → D3 rendering → DOM updates | *(none - webview only)* | SimpleTimelineApp, D3TimelineRendererImpl | Webview |
| `USER_INTERACTION` | User clicks/hovers → Event handlers → UI updates | *(none - webview only)* | FilterController, InteractionHandler | Webview |
| `WEBVIEW_MESSAGING` | Extension ↔ Webview postMessage communication | TimelineProvider | main.ts | postMessage |
| `CONFIG_SYNC` | Configuration changes → State → UI updates | *(none - webview only)* | FilterController, EventVisualTheme | Webview |
| `RANGE_SELECTOR` | Time slider/brush interactions → Viewport updates | *(none - webview only)* | InteractionHandler, SimpleTimelineApp | Webview |

#### Configuration

Add to your VS Code `settings.json`:

```json
{
  // Log level (error, warn, info, debug, trace)
  "repoTimeline.logging.level": "debug",

  // Pathway mode
  // - "disabled": Pathways ignored, all logs with matching level/category shown
  // - "filter": Only logs with enabled pathways shown
  // - "exclusive": Strict pathway filtering
  "repoTimeline.logging.pathwayMode": "filter",

  // Which pathways to enable (empty = all)
  "repoTimeline.logging.pathways": [
    "FILTER",    // Only show filter pathway logs
    "PERSIST"    // And state persistence logs
  ],

  // Which categories to enable (optional, works with pathways)
  "repoTimeline.logging.categories": [
    "ORC",       // Orchestration
    "FILT"       // Filtering
  ]
}
```

#### Usage in Extension Code

**Basic usage** (existing logs work unchanged):
```typescript
import { logger, LogCategory } from '../utils/Logger';

logger.debug(LogCategory.DATA, 'Fetching events', 'GitProvider.fetchEvents');
// Output: 12:34:56.789 DEBUG DAT    [GitProvider.fetchEvents]: Fetching events
```

**Pathway-specific logging**:
```typescript
import { logger, LogCategory, LogPathway } from '../utils/Logger';

logger.debug(
  LogCategory.DATA,
  'Fetched events from GitHub',
  'GitProvider.fetchEvents',
  { count: events.length },
  LogPathway.DATA_INGESTION  // <-- Add pathway
);
// Output: 12:34:56.789 DEBUG DAT    [INGEST] [GitProvider.fetchEvents]: Fetched events from GitHub
```

**Convenience helpers**:
```typescript
import { PathwayLoggers, LogCategory } from '../utils/Logger';

// Same as above but shorter
PathwayLoggers.dataIngestion.debug(
  LogCategory.DATA,
  'Fetched events from GitHub',
  'GitProvider.fetchEvents',
  { count: events.length }
);
```

#### Usage in Webview Code

**Import WebviewLogger**:
```typescript
import { webviewLogger, LogCategory, LogPathway } from './WebviewLogger';

// Basic logging
webviewLogger.info(LogCategory.VISUALIZATION, 'Rendering timeline', 'render');
// Output in DevTools: [INFO ] [VIZ] Rendering timeline

// Pathway logging
webviewLogger.debug(
  LogCategory.DATA,
  'Processing events for render',
  'handleTimelineData',
  { count: events.length },
  LogPathway.RENDER_PIPELINE
);
// Output: [DEBUG] [DATA] [RENDER] [handleTimelineData] Processing events for render
```

**Interactive Debugging in Browser Console**:
```javascript
// Open DevTools (Right-click → Inspect), then:

// Set log level
webviewLogger.setLogLevel(LogLevel.DEBUG)

// Enable pathway filtering
webviewLogger.setPathwayMode('filter')
webviewLogger.enablePathways([LogPathway.RENDER_PIPELINE])

// Now only render pipeline logs show!
// Refresh the timeline to see filtered logs

// Disable pathway filtering
webviewLogger.setPathwayMode('disabled')

// Check current config
webviewLogger.getConfig()
// Returns: { level: 0, enabledCategories: Set(12), pathwayMode: 'disabled', ... }
```

**Relay Logs to Extension** (optional):
```typescript
// In main.ts initialization
webviewLogger.setVSCodeAPI(window.vscode);
webviewLogger.setRelayToExtension(true);

// Now webview logs also appear in extension Output panel
// Useful for unified log viewing
```

#### How It Works

1. **Emission Control**: Logs are checked **before** being emitted. If pathway is disabled, the log statement doesn't execute at all (not just filtered after).

2. **Modes**:
   - **disabled**: Pathways ignored completely (backward compatible)
   - **filter**: Only emit logs matching enabled pathways
   - **exclusive**: Strict - logs without pathways are suppressed

3. **Default Behavior**: Logs without pathway (or `LogPathway.NONE`) are always shown unless mode is "exclusive"

#### Debugging Scenarios

**Scenario 1: "Why isn't GitHub data showing?"**

*Extension side (VS Code Output panel):*
```json
{
  "repoTimeline.logging.level": "debug",
  "repoTimeline.logging.pathwayMode": "filter",
  "repoTimeline.logging.pathways": ["INGEST"]
}
```

*Webview side (Browser DevTools):*
```javascript
webviewLogger.setLogLevel(LogLevel.DEBUG)
webviewLogger.setPathwayMode('filter')
webviewLogger.enablePathways([LogPathway.DATA_INGESTION])
```

→ See complete flow: Provider → Orchestrator → postMessage → Webview → Renderer

**Scenario 2: "Why doesn't my branch filter work?"**

*Extension side:*
```json
{
  "repoTimeline.logging.pathwayMode": "filter",
  "repoTimeline.logging.pathways": ["FILTER"]
}
```

*Webview side:*
```javascript
webviewLogger.setPathwayMode('filter')
webviewLogger.enablePathways([LogPathway.FILTER_APPLY])
```

→ Trace filter click → state update → data refresh → re-render across both contexts

**Scenario 3: "Why doesn't time window persist?"**

*Webview only (state persistence is webview-side):*
```javascript
webviewLogger.setPathwayMode('filter')
webviewLogger.enablePathways([LogPathway.STATE_PERSIST, LogPathway.RANGE_SELECTOR])
```

→ See state save/restore + time slider interactions in browser console

**Scenario 4: "Timeline renders slowly with 1000+ events"**

*Webview only (rendering is webview-side):*
```javascript
webviewLogger.setLogLevel(LogLevel.DEBUG)
webviewLogger.setPathwayMode('filter')
webviewLogger.enablePathways([LogPathway.RENDER_PIPELINE])

// Also enable performance category
webviewLogger.enableCategories([LogCategory.PERFORMANCE, LogCategory.VISUALIZATION])
```

→ Profile data processing → D3 rendering → DOM updates

**Scenario 5: "Filter changes don't sync between extension and webview"**

*Both contexts (WEBVIEW_MESSAGING pathway):*

Extension:
```json
{
  "repoTimeline.logging.pathways": ["MESSAGE"]
}
```

Webview:
```javascript
webviewLogger.enablePathways([LogPathway.WEBVIEW_MESSAGING])
```

→ See postMessage communication in both directions

#### Environment Variables (for tests/development)

```bash
# Enable specific pathways
REPO_TIMELINE_LOG_PATHWAYS=FILTER,PERSIST npm test

# Set log level
REPO_TIMELINE_LOG_LEVEL=trace npm run dev
```

---

## Performance Characteristics

### Caching
- **Cache Key:** Repository path
- **Cache TTL:** 5 minutes (configurable)
- **Memory:** ~1KB per event

### Filtering
- **Algorithm:** Array.filter() with inline predicates
- **Complexity:** O(n)
- **Target:** <100ms for 1000 events
- **Actual:** ~10ms for 1000 events

### Rendering
- **Initial:** ~200ms for 1000 events
- **Update:** ~50ms for filter change
- **Slicer:** Real-time (60fps)

---

## File Structure

```
src/
├── core/
│   ├── CanonicalEvent.ts          # Core types
│   └── FeatureFlags.ts            # Feature flag system
├── orchestration/
│   ├── DataOrchestrator.ts        # Central coordinator
│   ├── ProviderRegistry.ts        # Provider lifecycle
│   └── FilterStateManager.ts      # Per-repo filter persistence
├── providers/
│   ├── timeline-provider-webpack.ts
│   ├── git/
│   │   └── GitProvider.ts
│   └── github/
│       ├── GitHubProvider.ts      # Main GitHub provider
│       ├── GitHubClient.ts        # @octokit/rest wrapper
│       ├── RateLimitManager.ts    # Rate limit protection
│       ├── transformers/
│       │   ├── pullRequestTransformer.ts
│       │   ├── releaseTransformer.ts
│       │   └── issueTransformer.ts
│       └── types/
│           └── github-api.types.ts
├── utils/
│   └── Logger.ts                  # Extension-side logger (Node.js)
├── timeline/
│   └── infrastructure/
│       └── GitEventRepository.ts
├── webview/
│   ├── main.ts                    # Webview entry point
│   ├── SimpleTimelineApp.ts       # Timeline app coordinator
│   └── WebviewLogger.ts           # Webview-side logger (Browser)
└── visualization/
    ├── d3/
    │   ├── D3TimelineRenderer.ts
    │   ├── InteractionHandler.ts
    │   └── EventRenderer.ts
    └── ui/
        ├── FilterController.ts
        ├── PopupController.ts
        └── UIControllerManager.ts
```

---

## Version History

### v0.4.65 (2025-10-03)
- **Dual-Context Pathway Logging System**
  - Created WebviewLogger mirroring extension Logger API
  - Tagged 302 console.log statements with pathways in webview
  - Full pathway support in both extension and webview contexts
  - Interactive debugging via browser DevTools
  - 8 pathways covering complete data flows
  - Optional log relay from webview to extension
  - Global webview logger access for runtime debugging

### v0.4.2 (2025-10-02)
- **GitHub API Provider Integration**
  - Added GitHubProvider with VSCode authentication
  - Implemented GitHubClient with @octokit/rest
  - Rate limit management with ETag caching
  - PR, Release, and Issue transformers
  - Feature flag system for controlled rollout
  - UI toggle in Configuration tab
- Built on canonical event architecture (zero data loss)

### v0.3.26 (2025-10-02)
- Dual color mode system (Semantic + Sync State)
- Shape-based event differentiation (7 D3 symbols)
- Z-index layering for event visibility
- Control Center UI redesign

### v0.3.0 (2025-10-01)
- Simplified architecture with CanonicalEvent
- Removed transformation layers (~5,400 lines)
- Added statistics tooltips
- Fixed Window/Velocity calculations
- Added activity bar icon

### v0.2.0 (2025-01-12)
- Multi-branch visibility
- Branch filter population
- Branch checkout/switch tracking

### v0.1.0 (Initial)
- Basic timeline visualization
- Git commit extraction
- Range selector

---

## References

- [REFACTORING_PLAN.md](./REFACTORING_PLAN.md) - Detailed refactoring guide
- [CanonicalEvent Schema](./src/core/CanonicalEvent.ts) - Core type definitions
- [D3.js Documentation](https://d3js.org/) - Visualization library

---

**End of Architecture Documentation**

---

## Visual Theme System (v0.3.26)

### EventVisualTheme

**Location:** `src/visualization/theme/EventVisualTheme.ts`

Centralized visual theme system providing single source of truth for all visual properties:

#### Core Types
- **EventShape**: `circle | square | diamond | triangle | star | cross | wye`
- **ColorMode**: `semantic | sync-state`
- **SyncState**: `synced | local-only | remote-only | diverged | unknown`

#### Key Methods
```typescript
getEventVisual(eventType: string): EventTypeVisual
getEventColor(eventType: string, syncState: SyncState): string
getEventShape(eventType: string): EventShape
getEventZIndex(eventType: string): number
determineSyncState(event: any): SyncState
setColorMode(mode: ColorMode): void
```

#### Z-Index Layering Strategy
Fixed 5-tier rendering order (lowest to highest):
- **Tier 1 (z=1-2)**: High frequency events (commits, checkouts)
- **Tier 2 (z=3-4)**: Structural changes (branch create/delete)
- **Tier 3 (z=5-6)**: Integration events (merges, PRs)
- **Tier 4 (z=7-9)**: Metadata (tags, releases, issues)
- **Tier 5 (z=10+)**: Critical events (deployments, CI/CD)

#### Color Palettes
**Semantic Mode** (event type colors):
- Commit: Cyan (#00d4ff)
- Merge: Purple (#a855f7)
- Branch Created: Green (#22c55e)
- Branch Deleted: Red (#ef4444)
- Branch Checkout: Amber (#f59e0b)
- Tag: Yellow (#eab308)

**Sync State Mode** (location colors - non-overlapping):
- Synced: Emerald (#10b981)
- Local Only: Indigo (#6366f1)
- Remote Only: Orange-red (#f97316)
- Diverged: Crimson (#dc2626)
- Unknown: Slate (#64748b)

---

## Control Center (v0.3.26)

**Location:** `src/visualization/ui/FilterController.ts`

Renamed from "Filters" to "Control Center" - unified interface with three tabs:

### Filter Tab
- Event type checkboxes (sorted by z-index, showing shapes)
- Branch selection
- Author filtering
- Search query
- Active filter badges
- Result summary (filtered/total)

### Configuration Tab
- **Display Mode**: Radio buttons for color mode toggle
  - Semantic Mode: Color = event type
  - Sync State Mode: Color = sync state
- **Data Providers**: Enable/disable provider toggles
  - Git (git-local) - enabled by default
  - GitHub API - available (feature flag protected)
  - Agent-Brain - planned

### Support Tab
- Placeholder for future help/documentation content
- Links to external resources

---

## Current State (v0.4.65)

### Active Providers
- **git-local**: Local Git repository events (commits, branches, tags, checkouts)
- **github**: GitHub API provider (PRs, releases, issues) - feature flag protected, disabled by default

### Planned Providers
- **agent-brain**: AI-powered insights and patterns

### Latest Features (v0.4.65)
- **Dual-Context Logging**: Unified pathway-based logging across extension and webview
  - Extension Logger: VS Code Output panel (Node.js context)
  - WebviewLogger: Browser DevTools console (Chromium context)
  - Same API, same pathways, consistent debugging
  - Interactive runtime configuration via browser console
  - Optional log relay from webview to extension

### Previous Features (v0.4.2)
- **Feature Flag System**: Token-based enablement with default "ENABLE_ALL" token
- **GitHub Authentication**: Seamless VSCode OAuth integration
- **Rate Limit Protection**: Automatic throttling with 5000 req/hour management
- **Multi-Provider UI**: Configuration tab with provider enable/disable toggles

### Current Limitations
- Single repository support (no multi-repo aggregation yet)
- GitHub provider disabled by default (user must enable in Configuration tab)
- No real-time GitHub webhook integration (Phase 2 feature)
- GitHub API limited to 100 items per endpoint
- Webview logs require browser DevTools (cannot be viewed in Output panel without relay)

---

## Pathway Testing System (v0.4.66)

**Location:** `tests/pathways/`, `tests/utils/`
**Status:** ✅ Phase 3 Complete - 149 tests (213-298% of target)
**Pass Rate:** 97%+

Revolutionary testing approach that verifies end-to-end data flows by asserting on log emission milestones, providing exact failure locations and AI-debuggable context.

**Achievement Summary:**
- 149 pathway tests across 8 pathways
- All critical flows comprehensively covered
- Performance budgets validated (< 500ms for 1000 events)
- 1 bug discovered and fixed through testing
- Self-densifying coverage strategy implemented

### Overview

Traditional testing: ❌ "Test failed" (no context about where/why)
Pathway testing: ✅ "Failed at milestone 6/10: handleTimelineData not logged - Data flow issue detected"

### Core Components

#### PathwayAsserter
**Location:** `tests/utils/PathwayAsserter.ts`

Fluent API for defining expected milestone sequences:

```typescript
const asserter = new PathwayAsserter(LogPathway.DATA_INGESTION)
    .expectMilestone('extension.activate', {
        message: /Extension.*activated/i
    })
    .expectMilestone('DataOrchestrator.getEvents')
    .expectMilestone('GitDataProvider.fetchEvents')
    .expectOptionalMilestone('CacheManager.checkCache')
    .verify();
```

**Key Methods:**
- `expectMilestone(context, matcher?)` - Add required milestone
- `expectOptionalMilestone(context, matcher?)` - Add optional milestone
- `verify()` - Check all milestones reached, return AssertionReport
- `toJSON()` - Export for Agent-Brain webhook

#### PathwayDebugger
**Location:** `tests/utils/PathwayDebugger.ts`

AI-assisted failure analysis with hypothesis generation:

```typescript
const debugger = new PathwayDebugger(result);
const analysis = debugger.analyzeFailure();

// Generates:
// - Hypotheses with confidence scores (0-100)
// - Debugging checklist (high/medium/low priority)
// - Related code locations
// - Suspicious log patterns
// - AI context for automated fixing
```

**Hypothesis Categories:**
- `data-flow` - Data not passing correctly between components
- `state` - State management issue
- `timing` - Async/await, race condition, timeout
- `configuration` - Config not syncing
- `logic` - Exception or error in code
- `external` - Git/GitHub/network dependency issue

#### LogCapture
**Location:** `tests/utils/LogCapture.ts`

Test-mode logger that intercepts all log emissions:

```typescript
const logCapture = LogCapture.getInstance();
logCapture.enable(LogPathway.DATA_INGESTION);

// Run test...

const logs = logCapture.getLogsForPathway(LogPathway.DATA_INGESTION);
asserter.setCapturedLogs(logs);
```

#### Custom Jest Matchers
**Location:** `tests/utils/pathway-matchers.ts`

```typescript
expect(asserter).toCompletePathway();
expect(asserter).toReachMilestone(3);
expect(asserter).toFailAtMilestone(2);
expect(asserter).toHavePathwayErrors();
expect(asserter).toCompleteWithinTime(1000);
```

### 8 Core Pathways

All pathways defined in `tests/pathways/definitions/`:

| Pathway | Definition File | Flow |
|---------|----------------|------|
| DATA_INGESTION | `data-ingestion.pathway.ts` | Provider → Orchestrator → Webview → Render |
| FILTER_APPLY | `filter-apply.pathway.ts` | Filter UI → State → Data refresh → Re-render |
| STATE_PERSIST | `state-persist.pathway.ts` | State save/restore across sessions |
| RENDER_PIPELINE | `render-pipeline.pathway.ts` | Data → D3 scales → SVG → DOM |
| USER_INTERACTION | `user-interaction.pathway.ts` | User event → Handler → State → UI update |
| WEBVIEW_MESSAGING | `webview-messaging.pathway.ts` | Extension ↔ Webview postMessage |
| CONFIG_SYNC | `config-sync.pathway.ts` | Config change → State → UI updates |
| RANGE_SELECTOR | `range-selector.pathway.ts` | Slider → Brush → Viewport → Re-render |

Each pathway includes:
- Base pathway definition
- Variant pathways (minimal, extended, specific scenarios)
- Factory functions for easy test creation

### Pathway Tests

**Locations:**
- `tests/pathways/unit/` - 30 component tests
- `tests/pathways/integration/` - 30 integration tests (14 Phase 2 + 16 error scenarios)
- `tests/pathways/performance/` - 11 performance validation tests
- `tests/pathways/generated/` - Generated pathway definitions

**Total:** 149 pathway tests across 3 test categories

**Test Breakdown by Pathway:**
- DATA_INGESTION: Unit (5) + Integration (7) + Error (7) = 19 tests
- FILTER_APPLY: Unit (6) + Integration (7) + Error (16) = 29 tests
- STATE_PERSIST: Unit (13) + Integration (2) = 15 tests
- RENDER_PIPELINE: Unit (5) + Integration (13) + Performance (11) = 29 tests
- USER_INTERACTION: Unit (5) + Integration (15) = 20 tests
- WEBVIEW_MESSAGING: Integration (17) = 17 tests
- CONFIG_SYNC: Unit (15) = 15 tests
- RANGE_SELECTOR: Unit (18) = 18 tests

Pathway tests follow this pattern:

```typescript
describe('DATA_INGESTION Pathway', () => {
    beforeEach(() => {
        getLogCapture().clear();
        getLogCapture().enable(LogPathway.DATA_INGESTION);
    });

    it('should complete pathway', async () => {
        const asserter = createDataIngestionPathway();

        // Execute flow...

        asserter.setCapturedLogs(getLogCapture().getLogs());
        const result = asserter.verify();

        // Auto-debug on failure
        if (!result.passed) {
            const debugger = new PathwayDebugger(result);
            console.log(debugger.formatForAI());
            console.log(debugger.toJSON());
        }

        expect(asserter).toCompletePathway();
    });
});
```

### CLI Debugging Tool

**Location:** `scripts/debug-pathway-test.ts`

Command-line tool for analyzing failed pathway tests:

```bash
# Debug latest failure
npm run debug-pathway -- --latest

# Debug specific pathway
npm run debug-pathway -- --pathway DATA_INGESTION

# Show summary
npm run debug-pathway -- --summary

# Export for Agent-Brain webhook
npm run debug-pathway -- --latest --json > failure.json
```

**Output Example:**
```
=== LATEST PATHWAY FAILURE ===

Pathway: DATA_INGESTION
Status: partial

FAILURE POINT:
  handleTimelineData (index 6)
  Reason: Context 'handleTimelineData' never logged

TOP HYPOTHESES:

1. [80% confidence] DATA-FLOW
   Data not flowing correctly through the pipeline
   Evidence:
     - Expected data at: handleTimelineData
     - Last data log: Sending data to webview
   💡 Suggested Fix: Verify data is being passed correctly

DEBUGGING CHECKLIST:
  [HIGH] verify: Verify handleTimelineData function is called
  [HIGH] check: Confirm log statement exists in handleTimelineData
  [HIGH] test: Test data flow from sendToWebview to handleTimelineData

RELATED CODE:
  📁 src/webview/main.ts::handleTimelineData
     Failed milestone - log not emitted here
```

### PathwayReporter

**Location:** `tests/utils/PathwayReporter.ts`

Custom Jest reporter that generates `pathway-results.json`:

```json
{
  "testRun": {
    "timestamp": "2025-10-03T...",
    "totalTests": 24,
    "passed": 18,
    "failed": 6
  },
  "results": [
    {
      "pathway": "DATA_INGESTION",
      "status": "failed",
      "testName": "should complete pathway",
      "report": {...},
      "debugAnalysis": {...}
    }
  ]
}
```

### Agent-Brain Integration

Failed pathway tests automatically output JSON for AI webhook consumption:

**Workflow:**
1. **Test fails** → PathwayDebugger generates analysis
2. **Analysis → Agent-Brain** → AI analyzes hypotheses, context, logs
3. **Agent-Brain → Code fix** → Suggests specific changes with confidence
4. **Apply fix** → Re-run test
5. **Repeat** until test passes

**JSON Structure:**
```json
{
  "pathway": "DATA_INGESTION",
  "status": "failed",
  "failurePoint": {
    "milestone": "handleTimelineData",
    "reason": "Context never logged",
    "index": 6
  },
  "hypotheses": [
    {
      "confidence": 80,
      "category": "data-flow",
      "description": "Data not flowing correctly",
      "evidence": [...],
      "suggestedFix": "Verify data passing...",
      "codeLocations": [...]
    }
  ],
  "checklist": [...],
  "aiContext": {
    "lastSuccessfulMilestone": "extension.sendToWebview",
    "failedMilestone": "handleTimelineData",
    "dataFlow": ["activate", "getEvents", "fetchEvents", "sendToWebview"],
    "stateChanges": [...]
  }
}
```

### Running Pathway Tests

```bash
# All pathway tests
npm test -- pathways/generated

# Specific pathway
npm test -- data-ingestion.pathway.test.ts

# With coverage
npm run test:coverage -- pathways

# With debug output
npm test -- pathways --verbose
```

### Best Practices

1. **Milestone Granularity**: High-level milestones (function entry) not internal steps
2. **Optional Milestones**: Use for conditional flows (caching, feature flags)
3. **Flexible Matchers**: Regex patterns > exact string matches
4. **Pathway Variants**: Create variants for different scenarios (basic, with-cache, error-handling)

### Integration with Existing Testing

Pathway tests complement (not replace) unit/integration tests:

- **Unit Tests**: Test individual functions in isolation
- **Integration Tests**: Test component interactions
- **Pathway Tests**: Verify end-to-end data flows and architecture

### Documentation

Complete pathway testing guide: [PATHWAY_TESTING_GUIDE.md](./PATHWAY_TESTING_GUIDE.md)

Key topics:
- Writing pathway definitions
- Creating pathway tests
- Debugging failures
- Agent-Brain integration
- API reference

