# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Agent Brain Platform is a VSCode extension for AI-assisted development with timeline visualization and knowledge management.

## Architecture

### Tech Stack
- **Language**: TypeScript 5.3+ (strict mode)
- **Platform**: VSCode Extension API 1.80+
- **Build System**: Lerna 8.2+ monorepo with npm workspaces
- **Bundler**: Webpack 5 (production optimization)
- **Visualization**: D3.js 7.9+ for timeline rendering
- **Testing**: Jest (unit tests), TSC for type checking
- **i18n**: VSCode's vscode-nls system with @vscode/l10n-dev

### Monorepo Structure
```
agent-brain-platform/
├── packages/
│   ├── core/          # Domain logic, data models, business rules
│   └── vscode/        # VSCode-specific extension implementation
├── docs/              # Architecture diagrams and documentation
├── l10n/              # Root i18n translations (source of truth)
└── .agent-brain/      # Knowledge base, templates, sessions
```

### Package Architecture

**@agent-brain/core** (packages/core/):
- **domains/events**: Canonical event model, providers (Git, GitHub, Knowledge, Sessions)
- **domains/knowledge**: Knowledge management system (V1 templates, validation, maturity filtering)
- **domains/visualization**: D3 timeline, webview UI controllers, i18n system
- **infrastructure**: Logging, configuration, shared utilities
- No VSCode dependencies - pure TypeScript domain logic

**agent-brain-platform** (packages/vscode/):
- **src/extension.ts**: Extension activation, command registration
- **src/providers/**: VSCode-specific event providers (wraps core providers)
- **src/services/**: Knowledge file I/O, i18n service
- **dist/**: Webpack output (bundled extension.js + webview.js)
- Depends on @agent-brain/core

### Key Domains

**Events Domain** (Timeline Data):
- Canonical event model (timestamp, author, impact, visualization hints)
- Multi-source providers: GitLocal, GitHub, KnowledgeEvents, SessionJournals
- Provider orchestration and event merging
- Data flows: Providers → CanonicalEvent[] → Timeline visualization

**Knowledge Domain** (Templates & Items):
- V1 template system: Templates contain embedded knowledge items
- Types: ADR, design-pattern, golden-path, best-practice, standard, etc.
- Validation: Multi-layer (schema, security, business rules)
- Maturity filtering: Context-based (complexity × quadrant × maxItems)
- Storage: File-based in `.agent-brain/templates/`

**Visualization Domain** (UI & Rendering):
- D3-based timeline with zoom/pan, event nodes, filtering
- Webview architecture: main.ts orchestrates view controllers
- Controllers: SessionViewController, KnowledgeViewController
- i18n system with event-based initialization (onI18nReady)
- Styling: Modular CSS with cosmic theme

### Data Flow

**Extension Startup**:
1. Extension activates (extension.ts)
2. Providers initialize (Git, Knowledge, Sessions)
3. Webview created, HTML/CSS/JS bundled
4. i18n translations loaded → webview receives i18n:init message
5. View controllers initialize → render UI

**Timeline Rendering**:
1. User opens timeline view
2. Extension fetches events from all enabled providers
3. Events merged, sorted by timestamp
4. Sent to webview via postMessage
5. D3 renders timeline nodes, axis, interactions

**Knowledge Management**:
1. Templates loaded from `.agent-brain/templates/`
2. Validation pipeline runs (schema → security → business)
3. Valid templates stored in TemplateStore (in-memory)
4. UI renders table with expansion/collapse
5. User actions (CRUD) → backend → file I/O → state update → UI refresh

**Maturity Filtering**:
1. User configures context (complexity, quadrant, maxItems)
2. Context saved to backend storage
3. Filter applied to knowledge items based on maturity metadata
4. Only relevant items shown in UI

### Design Patterns

**Separation of Concerns**:
- Core package: Platform-agnostic business logic
- VSCode package: Platform-specific integration
- Enables future CLI, web, or other platforms

**Provider Pattern**:
- Event providers implement common interface
- Coordinator orchestrates multiple providers
- Easy to add new sources (Jira, Linear, etc.)

**Controller Pattern** (Visualization):
- SessionViewController: Manages timeline tab
- KnowledgeViewController: Manages knowledge tab
- Sub-controllers: V1TemplatesTableController, MaturityConfigPanel
- Each controller owns its DOM section + event handlers

**Store Pattern** (Knowledge):
- KnowledgeStore: In-memory indexed storage for items
- TemplateStore: Manages templates with embedded items
- Indexes for fast filtering (type, scope, tags)

**Validation Pipeline**:
- Orchestrator coordinates multiple validators
- Each validator has single responsibility
- Security validators: XSS, prompt injection, path traversal
- Business validators: Duplicate IDs, maturity metadata

**Event-Based i18n**:
- Translations loaded asynchronously
- Components register listeners via onI18nReady()
- Re-render when translations available
- Prevents raw key display in UI

### Critical Paths

**i18n System**:
- Source: `/l10n/bundle.l10n.json` (root)
- Build: Webpack copies to `packages/vscode/l10n/`
- Runtime: Extension loads → sends to webview via i18n:init
- Components: Listen for onI18nReady(), re-render with translations

**Template Injection**:
- Templates can inject into CLAUDE.md or other files
- Markers: `<!-- AGENT-BRAIN:template-{id}:START -->` ... `END -->`
- Supports nested item markers
- Used for project-specific AI guidance

**Pathway Logging** (Development):
- Configurable logging system with pathways (INGEST, FILTER, KNOWLEDGE, etc.)
- Filter mode vs exclusive mode
- Console output for debugging
- Helps trace data flow through system

### File Locations

**Knowledge Base**:
- Templates: `.agent-brain/templates/*.json`
- Sessions: `.agent-brain/sessions/YYYY-MM/*.md`
- Knowledge Items: `.agent-brain/{adrs,patterns,learnings,etc}/*.md`

**i18n Translations**:
- Source: `/l10n/bundle.l10n.{locale}.json`
- Build output: `packages/vscode/l10n/`
- Supported: en, de, es, fr, zh-cn

**Build Artifacts**:
- Extension: `packages/vscode/dist/extension.js`
- Webview: `packages/vscode/dist/webview.js`
- VSIX: `packages/vscode/agent-brain-platform-{version}.vsix`

### State Management

**Extension State**:
- Providers maintain event cache
- TemplateStore/KnowledgeStore in-memory
- Maturity context in VSCode globalState

**Webview State**:
- Controllers manage local state
- Message passing with extension backend
- UI state: expanded sections, filters, selections

### Key Constraints

- **No Mixed Patterns**: Core is pure TypeScript, VSCode is extension-specific
- **File-Based Storage**: No database, everything in workspace files
- **i18n Required**: All user-facing strings must use t() function
- **Validation Mandatory**: All templates pass multi-layer validation
- **Provider Independence**: Each provider works standalone

<!-- AGENT-BRAIN-GROUP-START: TYPE=TEMPLATE ID=bundled.agent-brain-base INJECTED_AT=2025-10-28T14:09:31.072Z ITEM_COUNT=8 -->
<!-- Group: TEMPLATE (8 items) -->

<!-- Item: golden-path-session-journals -->
[Content for golden-path-session-journals would be here]

<!-- Item: golden-path-learning-capture -->
[Content for golden-path-learning-capture would be here]

<!-- Item: golden-path-context-survival -->
[Content for golden-path-context-survival would be here]

<!-- Item: best-practice-full-honesty -->
[Content for best-practice-full-honesty would be here]

<!-- Item: best-practice-todo-hygiene -->
[Content for best-practice-todo-hygiene would be here]

<!-- Item: best-practice-coming-back -->
[Content for best-practice-coming-back would be here]

<!-- Item: guideline-knowledge-item-creation -->
[Content for guideline-knowledge-item-creation would be here]

<!-- Item: gotcha-ai-agent-pitfalls -->
[Content for gotcha-ai-agent-pitfalls would be here]

<!-- AGENT-BRAIN-GROUP-END: TYPE=TEMPLATE ID=bundled.agent-brain-base -->

<!-- AGENT-BRAIN-GROUP-START: TYPE=TEMPLATE ID=bundled.reza-rezvani-essentials INJECTED_AT=2025-10-28T14:09:33.802Z ITEM_COUNT=10 -->
<!-- Group: TEMPLATE (10 items) -->

<!-- Item: guideline-architecture-blueprint -->
[Content for guideline-architecture-blueprint would be here]

<!-- Item: guideline-command-center -->
[Content for guideline-command-center would be here]

<!-- Item: standard-style-guide-sheriff -->
[Content for standard-style-guide-sheriff would be here]

<!-- Item: best-practice-test-bench-coach -->
[Content for best-practice-test-bench-coach would be here]

<!-- Item: best-practice-error-handling-mantra -->
[Content for best-practice-error-handling-mantra would be here]

<!-- Item: standard-clean-code-commandments -->
[Content for standard-clean-code-commandments would be here]

<!-- Item: guideline-security-sentry -->
[Content for guideline-security-sentry would be here]

<!-- Item: convention-teamwork-protocol -->
[Content for convention-teamwork-protocol would be here]

<!-- Item: best-practice-edge-case-oracle -->
[Content for best-practice-edge-case-oracle would be here]

<!-- Item: golden-path-agentic-workflow -->
[Content for golden-path-agentic-workflow would be here]

<!-- AGENT-BRAIN-GROUP-END: TYPE=TEMPLATE ID=bundled.reza-rezvani-essentials -->
