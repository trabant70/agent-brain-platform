# Agent Brain Platform - Quick Reference

## ACTIVE DOMAINS

| Domain | Location | Purpose |
|--------|----------|---------|
| **events** | `/domains/events/` | Universal CanonicalEvent format |
| **knowledge** | `/domains/knowledge/` | Markdown-based knowledge items |
| **providers** | `/domains/providers/` | Git, GitHub, Session adapters |
| **visualization** | `/domains/visualization/` | D3 timeline, UI controllers, webview |
| **sessions** | `/domains/sessions/` | Session tracking |
| **context** | `/domains/context/` | Project rules & decisions |
| **extension** | `/domains/extension/` | Future extension interfaces |

## DELETED DOMAINS

- intelligence, enhancement, expertise, guidance, planning, achievement

## KEY CLASSES

**Core Logic:**
- `CanonicalEvent` - Universal event type (40+ fields)
- `KnowledgeStore` - Indexed in-memory storage
- `KnowledgeFileSystem` - Markdown I/O with YAML parsing
- `TemplateEngine` - Template injection/removal
- `DataOrchestrator` - Main coordinator (caching, filtering)
- `GitProvider`, `GitHubProvider` - Event extraction

**Webview:**
- `SimpleTimelineApp` - Main UI orchestrator
- `D3TimelineRendererImpl` - SVG rendering engine
- `TabManager` - Multi-tab navigation
- `UIControllerManager` - Filter, popup, context controllers

**VSCode:**
- `TimelineProvider` - Webview provider & message router
- `KnowledgeManager` - File watching, CRUD, templates

## MESSAGE TYPES (25+)

**Timeline:** requestData, timelineData, filteredData, updateFilters, toggleProvider, setColorMode, refreshData, clearCache, resize

**Knowledge:** knowledge:load-request, knowledge:loaded, knowledge:scan-claude-files, knowledge:create-item, knowledge:update-item, knowledge:delete-item, knowledge:create-template, knowledge:apply-template, knowledge:remove-template, knowledge:export-template, knowledge:showCreateDialog, knowledge:showEditDialog

## KNOWLEDGE TYPES (20)

ADR, DESIGN_PATTERN, ANTI_PATTERN, GOLDEN_PATH, STANDARD, CONVENTION, CHECKLIST, SNIPPET, CONFIGURATION, COMMAND, API_REFERENCE, LEARNING, TROUBLESHOOTING, GOTCHA, TIP, TEMPLATE, GUIDELINE, WORKFLOW, RUNBOOK, CUSTOM

## EVENT TYPES

**Git:** COMMIT, MERGE, BRANCH_CREATED, BRANCH_DELETED, TAG_CREATED
**GitHub:** PR_OPENED, PR_MERGED, PR_CLOSED, ISSUE_OPENED, ISSUE_CLOSED, RELEASE
**CI/CD:** BUILD_SUCCESS, BUILD_FAILED, TEST_RUN
**Intelligence:** LEARNING_STORED, PATTERN_DETECTED, ADR_RECORDED
**Sessions:** AGENT_SESSION

## BUILD COMMANDS

```bash
# Core package
cd packages/core
npm run build      # TypeScript compilation
npm run test       # Run tests
npm run test:pathways  # Pathway tests

# VSCode package
cd packages/vscode
npm run build      # Webpack bundle
npm run watch      # Development mode
npm run package    # Create VSIX

# Monorepo (from root)
npm run build
npm run test
npm run package:vscode
```

## CRITICAL FILES

| File | Purpose |
|------|---------|
| `CanonicalEvent.ts` | Event schema |
| `KnowledgeStore.ts` | In-memory storage |
| `KnowledgeFileSystem.ts` | File I/O |
| `TemplateEngine.ts` | Template management |
| `DataOrchestrator.ts` | Central coordinator |
| `SimpleTimelineApp.ts` | Webview main app |
| `TimelineProvider` | Extension host |
| `KnowledgeManager.ts` | VSCode service layer |
| `webpack.config.js` | Build config |

## ARCHITECTURE PRINCIPLES

1. **Single Transformation Rule** - Transform ONCE at provider boundaries
2. **Canonical Event Model** - All components use CanonicalEvent[]
3. **Filter, Don't Transform** - Filtering removes, never changes
4. **Simplicity Over Abstraction** - Fewer layers, fewer bugs
5. **File System as Truth** - .agent-brain/ markdown files are source

## DATA FLOWS

```
Timeline:
GitProvider/GitHubProvider → CanonicalEvent[] → 
DataOrchestrator (cache+filter) → SimpleTimelineApp → D3SVG

Knowledge:
.agent-brain/**/*.md → KnowledgeFileSystem → 
KnowledgeStore → TemplateEngine → VSCode UI
```

## KNOWLEDGE STORAGE

```
.agent-brain/
├── adrs/
├── golden-paths/
├── patterns/
├── standards/
├── learnings/
├── snippets/
├── commands/
├── troubleshooting/
├── workflows/
├── runbooks/
└── templates/
```

Each item is a markdown file with YAML frontmatter:
```yaml
---
title: Item Title
type: golden-path
scope: team
source: optional.path
tags: tag1, tag2
author: Name
version: 1
---

# Markdown content here
```

## LOGGING

**Extension:** `LogCategory` + `LogPathway` + level (DEBUG/INFO/WARN/ERROR)
**Webview:** Browser console with relay to extension

**Pathways:** DATA_INGESTION, FILTER_APPLY, RENDER_PIPELINE, KNOWLEDGE_MANAGEMENT, WEBVIEW_MESSAGING, etc.

**VSCode Settings:**
- `agentBrain.logging.pathwayMode` - exclusive|filter|disabled
- `agentBrain.logging.enabledPathways` - array
- `agentBrain.logging.logLevel` - DEBUG|INFO|WARN|ERROR

## FILE PATHS

All absolute paths in `/mnt/c/projects/agent-brain-platform/`

**Core:**
- `packages/core/src/domains/events/CanonicalEvent.ts`
- `packages/core/src/domains/knowledge/{KnowledgeStore.ts,KnowledgeFileSystem.ts,TemplateEngine.ts}`
- `packages/core/src/domains/visualization/orchestration/DataOrchestrator.ts`

**VSCode:**
- `packages/vscode/src/services/KnowledgeManager.ts`
- `packages/vscode/src/providers/timeline-provider-webpack.ts`

**Webview:**
- `packages/core/src/domains/visualization/webview/main.ts`
- `packages/core/src/domains/visualization/webview/SimpleTimelineApp.ts`

## CURRENT STATUS

- **Complete:** Timeline viz, knowledge mgmt, file watching, templates, filtering
- **Deleted:** Intelligence system, prompt enhancement, guidance, planning
- **Phase:** MVP (Phase 1)
- **Next:** Phase 2+ deferred (intelligence system)

