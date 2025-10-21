# Refactoring Plan - Large File Decomposition

**Created:** 2025-10-21
**Goal:** Reduce code complexity by decomposing large monolithic files into focused, maintainable modules

## Executive Summary

**Current State:**
- 4 files over 1,500 lines (total: 7,300 lines)
- Duplicate FilterController implementations (3,142 lines combined)
- KnowledgeViewController is a "god object" with 144 methods (2,361 lines)

**Target State:**
- No files over 1,000 lines
- Single FilterController implementation
- Modular, testable components with clear responsibilities
- Estimated reduction: ~3,000+ lines through consolidation and extraction

---

## Phase 1: FilterController Consolidation (IMMEDIATE)

**Priority:** 🔴 CRITICAL - Technical debt, duplicate code

**Current State:**
- `/packages/core/src/domains/visualization/ui/FilterController.ts` (1,611 lines)
- `/packages/core/src/domains/visualization/filters/FilterController.ts` (1,531 lines)
- Total: 3,142 lines of duplicated/divergent code

**Key Differences:**
- ui/ version: Control panel dropdown, AB-Knowledge/AB-Sessions provider toggles, collapsible sections
- filters/ version: Draggable floating menu, "coming soon" placeholders, active filters badges

**Tasks:**

### 1.1 Analysis & Decision
- [ ] Compare both implementations feature-by-feature
- [ ] Identify which version is actively used by SimpleTimelineApp.ts
- [ ] Document feature matrix (which features from each to keep)
- [ ] Decide: Merge or Delete obsolete version

### 1.2 Implementation
- [ ] Create backup of both files
- [ ] Merge best features into single implementation OR delete obsolete version
- [ ] Update imports across codebase
- [ ] Remove unused file and directory (if filters/ becomes empty)

### 1.3 Verification
- [ ] Run build - verify no compilation errors
- [ ] Test filter functionality in extension
- [ ] Verify both provider toggles and event filtering work
- [ ] Commit changes

**Estimated Impact:**
- Remove ~1,500 lines of duplicate code
- Single source of truth for filtering

---

## Phase 2: KnowledgeViewController Decomposition (HIGH PRIORITY)

**Priority:** 🔴 HIGH - God object anti-pattern, 2,361 lines

**Current State:**
- Single massive controller handling 7+ responsibilities
- 144 methods, many generating inline HTML
- Untestable monolith

**Target Architecture:**

```
ui/knowledge/
├── KnowledgeViewController.ts           (~300 lines - orchestrator)
├── KnowledgeTableController.ts          (~400 lines - table rendering)
├── ClaudeMdAccordionController.ts       (~350 lines - accordion UI)
├── KnowledgeFormController.ts           (~500 lines - CRUD forms)
├── TemplateController.ts                (~250 lines - templates)
├── utils/
│   ├── MarkdownRenderer.ts              (~100 lines - markdown)
│   └── KnowledgeFilters.ts              (~150 lines - filtering logic)
└── templates/
    ├── table-templates.ts               (~200 lines - HTML templates)
    ├── form-templates.ts                (~200 lines - HTML templates)
    └── accordion-templates.ts           (~150 lines - HTML templates)
```

**Tasks:**

### 2.1 Extract Utilities (Foundation) ✅ COMPLETE
- [x] Create `ui/knowledge/utils/MarkdownRenderer.ts`
  - [x] Extract `renderMarkdown()` method (67 lines → 84 lines standalone)
  - [x] Extract `escapeHtml()` method
  - [ ] Add unit tests (deferred - future enhancement)
- [x] Create `ui/knowledge/utils/KnowledgeFilters.ts`
  - [x] Extract `getFilteredItems()` method (62 lines → 92 lines standalone)
  - [x] Extract filtering logic
  - [ ] Add unit tests (deferred - future enhancement)
- [x] Update KnowledgeViewController to use utilities (2,361 → 2,240 lines, -121)
- [x] Build and verify (commit 2d57de6)

### 2.2 Extract HTML Templates ✅ COMPLETE
- [x] Create `ui/knowledge/templates/table-templates.ts` (90 lines)
  - [x] Extract table empty state from `renderKnowledgeTable()`
  - [x] Extract group header template from `renderKnowledgeTable()`
  - [x] Extract row HTML from `createItemRow()`
  - [x] Use template literal functions with proper escaping
- [x] Create `ui/knowledge/templates/form-constants.ts` (114 lines)
  - [x] Extract TYPE_OPTIONS and SCOPE_OPTIONS arrays
  - [x] Extract TYPE_DISPLAY_TO_VALUE and SCOPE_DISPLAY_TO_VALUE mappings
  - [x] Extract TYPE_VALUE_TO_DISPLAY and SCOPE_VALUE_TO_DISPLAY mappings
  - [x] Used by both `createNewItem()` and `showEditForm()`
  - Note: Forms use ModalDialog utility, so extracted constants instead of templates
- [x] Create `ui/knowledge/templates/accordion-templates.ts` (98 lines)
  - [x] Extract accordion empty state
  - [x] Extract accordion header template
  - [x] Extract Claude.md content template with edit controls
- [x] Update KnowledgeViewController to use templates (2,240 → 2,004 lines, -236)
- [x] Build and verify (webpack compiled successfully)

### 2.3 Extract Table Controller
- [ ] Create `ui/knowledge/KnowledgeTableController.ts`
  - [ ] Move state: items, selectedItems, sortBy, sortDirection, collapsedSections
  - [ ] Move methods: renderKnowledgeTable, createItemRow, groupItems
  - [ ] Move methods: toggleItemSelection, handleSort, updateSortIndicators
  - [ ] Move methods: toggleSectionCollapse, toggleAllSections, selectAll, deselectAll
  - [ ] Move methods: getFilteredItems (delegate to KnowledgeFilters utility)
  - [ ] Import table templates
  - [ ] Add message callback for communication with parent
  - [ ] Update references to use imported utilities

### 2.4 Extract Accordion Controller
- [ ] Create `ui/knowledge/ClaudeMdAccordionController.ts`
  - [ ] Move state: claudeMdFiles, expandedAccordions, accordionScrollPositions, selectedClaudeFile
  - [ ] Move methods: renderClaudeMdAccordion, saveAccordionScrollPositions, restoreAccordionScrollPositions
  - [ ] Move methods: saveClaudeMdContent, scanClaudeMdFiles
  - [ ] Import accordion templates
  - [ ] Add message callback for communication with parent

### 2.5 Extract Form Controller
- [ ] Create `ui/knowledge/KnowledgeFormController.ts`
  - [ ] Move methods: createNewItem, editItem, showEditForm, deleteItem, showDeleteConfirmation
  - [ ] Move methods: handleOperationResult
  - [ ] Import form templates
  - [ ] Import ModalDialog
  - [ ] Add message callback for communication with parent

### 2.6 Extract Template Controller
- [ ] Create `ui/knowledge/TemplateController.ts`
  - [ ] Move state: templates
  - [ ] Move methods: renderTemplateControls, updateTemplateButtons
  - [ ] Move methods: saveAsTemplate, applySelectedItems, applyTemplateToFocused
  - [ ] Move methods: exportTemplate, importTemplate, handleTemplateSelection, removeTemplate
  - [ ] Add message callback for communication with parent

### 2.7 Refactor Main Controller (Orchestrator)
- [ ] Update KnowledgeViewController to orchestrate sub-controllers
  - [ ] Initialize all sub-controllers in constructor
  - [ ] Delegate loadData() to TableController
  - [ ] Delegate loadClaudeMdFiles() to AccordionController
  - [ ] Forward messages from sub-controllers to extension
  - [ ] Update render() to call sub-controller renders
  - [ ] Remove extracted code
  - [ ] Keep only orchestration logic

### 2.8 Update Imports & References
- [ ] Update SimpleTimelineApp.ts imports
- [ ] Update any other files importing KnowledgeViewController
- [ ] Verify all message passing works

### 2.9 Verification
- [ ] Run build - verify no compilation errors
- [ ] Test all knowledge tab features:
  - [ ] Table rendering, filtering, sorting
  - [ ] Create/edit/delete knowledge items
  - [ ] Claude.md accordion expand/collapse
  - [ ] Template save/apply/export/import
  - [ ] Scroll position preservation
  - [ ] File selection for knowledge application
- [ ] Commit changes

**Estimated Impact:**
- Main controller: 2,361 → ~300 lines (87% reduction)
- Create 4 focused controllers + 3 utilities + 3 template files
- Dramatically improved testability and maintainability

---

## Phase 3: TimelineProvider Decomposition (MEDIUM PRIORITY)

**Priority:** 🟡 MEDIUM - Large message handler, 1,670 lines

**Current State:**
- Single provider handling all message types
- 83+ handler methods
- Mix of concerns (lifecycle, routing, data orchestration)

**Target Architecture:**

```
providers/
├── timeline-provider-webpack.ts              (~400 lines - lifecycle + routing)
└── handlers/
    ├── TimelineMessageHandler.ts             (~400 lines - timeline:*)
    ├── KnowledgeMessageHandler.ts            (~400 lines - knowledge:*)
    └── ConfigMessageHandler.ts               (~200 lines - config)
```

**Tasks:**

### 3.1 Extract Message Handlers
- [ ] Create `providers/handlers/TimelineMessageHandler.ts`
  - [ ] Move all `timeline:*` message handlers
  - [ ] Add provider context reference
- [ ] Create `providers/handlers/KnowledgeMessageHandler.ts`
  - [ ] Move all `knowledge:*` message handlers
  - [ ] Add provider context reference
- [ ] Create `providers/handlers/ConfigMessageHandler.ts`
  - [ ] Move config-related handlers
  - [ ] Add provider context reference

### 3.2 Implement Router Pattern
- [ ] Create handler registry in main provider
- [ ] Route messages by prefix (timeline:, knowledge:, etc.)
- [ ] Delegate to appropriate handler

### 3.3 Verification
- [ ] Run build
- [ ] Test all message types work
- [ ] Commit changes

**Estimated Impact:**
- Main provider: 1,670 → ~400 lines (76% reduction)
- Better separation of concerns

---

## Phase 4: KnowledgeManager Decomposition (MEDIUM PRIORITY)

**Priority:** 🟡 MEDIUM - Large service, 1,658 lines

**Current State:**
- Single service handling file watching, CRUD, templates
- Mix of concerns

**Target Architecture:**

```
services/
├── KnowledgeManager.ts                       (~600 lines - core CRUD)
├── KnowledgeFileWatcher.ts                   (~300 lines - file watching)
└── TemplateService.ts                        (~400 lines - template ops)
```

**Tasks:**

### 4.1 Extract File Watcher
- [ ] Create `services/KnowledgeFileWatcher.ts`
- [ ] Move file watching setup and debounce logic
- [ ] Add callback interface for change notifications

### 4.2 Extract Template Service
- [ ] Create `services/TemplateService.ts`
- [ ] Move template-related operations
- [ ] Add template CRUD methods

### 4.3 Refactor Main Manager
- [ ] Update KnowledgeManager to use extracted services
- [ ] Keep core knowledge item CRUD
- [ ] Delegate to FileWatcher and TemplateService

### 4.4 Verification
- [ ] Run build
- [ ] Test knowledge operations
- [ ] Commit changes

**Estimated Impact:**
- Main manager: 1,658 → ~600 lines (64% reduction)

---

## Success Criteria

**Code Metrics:**
- ✅ No files over 1,000 lines
- ✅ No duplicate implementations
- ✅ Clear single responsibility per file
- ✅ Estimated ~3,000 line reduction through consolidation

**Quality Improvements:**
- ✅ Improved testability (can unit test small modules)
- ✅ Better maintainability (easier to find and fix bugs)
- ✅ Enhanced reusability (controllers can be reused independently)
- ✅ Reduced cognitive load (understand focused modules vs monoliths)

**Verification:**
- ✅ All builds pass
- ✅ No functional regressions
- ✅ All features work as before
- ✅ Comprehensive commit history documenting changes

---

## Progress Tracking

- [x] **Phase 1: FilterController Consolidation (IMMEDIATE)** - ✅ COMPLETE
  - Deleted filters/FilterController.ts (1,531 lines)
  - Updated exports to use ui/FilterController.ts
  - Build verified, committed (729abda), pushed to origin
  - **Net reduction: 1,531 lines of dead code**
- [ ] **Phase 2: KnowledgeViewController Decomposition (HIGH PRIORITY)** - 🚧 IN PROGRESS
  - [x] **Phase 2.1:** Extract utilities (MarkdownRenderer, KnowledgeFilters) ✅
    - Created ui/knowledge/utils/ directory
    - KnowledgeViewController: 2,361 → 2,240 lines (-121)
    - Committed (2d57de6), pushed to origin
  - [x] **Phase 2.2:** Extract HTML templates (table, form constants, accordion) ✅
    - Created ui/knowledge/templates/ directory
    - Created 3 template files: table-templates.ts (90), form-constants.ts (114), accordion-templates.ts (98)
    - KnowledgeViewController: 2,240 → 2,004 lines (-236)
    - Build verified (webpack compiled successfully)
    - **Phase 2.1 + 2.2 total reduction: 357 lines (15% reduction from 2,361 → 2,004)**
  - [ ] **Phase 2.3:** Extract controller classes
  - [ ] **Phase 2.4:** Refactor main controller as orchestrator
- [ ] Phase 3: TimelineProvider Decomposition (MEDIUM PRIORITY)
- [ ] Phase 4: KnowledgeManager Decomposition (MEDIUM PRIORITY)

**Current Phase:** Phase 2.2 - COMPLETE ✅
**Next Step:** Phase 2.3 - Extract Controller Classes
**Status:** Templates and utilities extracted, KnowledgeViewController reduced by 15%, ready for controller extraction
