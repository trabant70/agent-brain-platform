# Knowledge and Session Events - Implementation Checklist

**Parent Design**: KNOWLEDGE_AND_SESSION_EVENTS_DESIGN.md
**Version**: 1.0
**Est. Duration**: 2 weeks (10 working days)
**Target**: No TODOs, complete and shippable increments

---

## Progress Overview

- [ ] Phase 1: Foundation (2 days)
- [ ] Phase 2: Providers (2 days)
- [ ] Phase 3: Event Recording (1 day)
- [ ] Phase 4: Visual Design (2 days)
- [ ] Phase 5: Configuration (1 day)
- [ ] Phase 6: Polish & Documentation (2 days)

**Status**: Not Started
**Last Updated**: 2025-10-21

---

## Phase 1: Foundation (Days 1-2)

### Goal
Create storage layer for knowledge events and session journals with full test coverage.

### Tasks

#### Day 1: Knowledge Event Storage

- [ ] **1.1** Create types file
  - **File**: `packages/core/src/domains/events/types.ts`
  - **Content**: `KnowledgeEventRecord` interface
  - **Fields**: id, timestamp, type, knowledgeItemId, knowledgeItemTitle, knowledgeItemType, targetFile, actor
  - **Validation**: TypeScript compiles with no errors

- [ ] **1.2** Create KnowledgeEventStorage class
  - **File**: `packages/core/src/domains/events/KnowledgeEventStorage.ts`
  - **Methods**: `loadAll()`, `recordEvent()`
  - **Validation**: Class compiles, imports correctly
  - **Edge cases**: Handle missing file, malformed JSON, empty array

- [ ] **1.3** Create index export
  - **File**: `packages/core/src/domains/events/index.ts`
  - **Exports**: `KnowledgeEventStorage`, `KnowledgeEventRecord`
  - **Validation**: Can import from `@agent-brain/core/domains/events`

- [ ] **1.4** Write unit tests
  - **File**: `packages/core/tests/unit/events/KnowledgeEventStorage.test.ts`
  - **Tests**:
    - ✓ loads empty array when file doesn't exist
    - ✓ loads existing events from JSON
    - ✓ records new event with generated ID and timestamp
    - ✓ appends to existing events
    - ✓ handles malformed JSON gracefully
  - **Coverage**: >95%
  - **Validation**: `npm test -- KnowledgeEventStorage.test.ts` passes

- [ ] **1.5** Create directory structure
  - **Location**: `.agent-brain/events/`
  - **Action**: Auto-create in KnowledgeEventStorage constructor if missing
  - **Validation**: Manually test by deleting folder and running code

#### Day 2: Session File System

- [ ] **1.6** Create types file
  - **File**: `packages/core/src/domains/sessions/types.ts`
  - **Content**: `SessionJournal` interface
  - **Fields**: id, title, date, summary, tags, topics, filesModified, knowledgeItemsUsed, filePath
  - **Validation**: TypeScript compiles with no errors

- [ ] **1.7** Create SessionFileSystem class
  - **File**: `packages/core/src/domains/sessions/SessionFileSystem.ts`
  - **Methods**:
    - `loadAll()` - scan YYYY-MM folders, parse markdown
    - `getMonthDirectories()` - get all month folders matching pattern
    - `getSessionFolder(date)` - helper for agents
    - `getRecommendedPath(title, date)` - generate file path
    - `parseSessionFile(filePath)` - parse frontmatter
  - **Dependencies**: `gray-matter` (already in package.json)
  - **Validation**: Class compiles, imports correctly
  - **Edge cases**: Missing frontmatter, invalid date, empty body

- [ ] **1.8** Create index export
  - **File**: `packages/core/src/domains/sessions/index.ts`
  - **Exports**: `SessionFileSystem`, `SessionJournal`
  - **Validation**: Can import from `@agent-brain/core/domains/sessions`

- [ ] **1.9** Write unit tests
  - **File**: `packages/core/tests/unit/sessions/SessionFileSystem.test.ts`
  - **Tests**:
    - ✓ returns empty array when directory doesn't exist
    - ✓ scans multiple month directories
    - ✓ parses session with valid frontmatter
    - ✓ generates correct file path from title and date
    - ✓ creates month folder if doesn't exist
    - ✓ handles missing frontmatter fields with defaults
    - ✓ skips files with invalid format
    - ✓ extracts summary from markdown body
  - **Coverage**: >95%
  - **Validation**: `npm test -- SessionFileSystem.test.ts` passes

- [ ] **1.10** Create test fixtures
  - **Location**: `packages/core/tests/fixtures/sessions/`
  - **Files**: Create sample session markdown files for testing
  - **Validation**: Tests use these fixtures

### Acceptance Criteria - Phase 1

- ✅ All TypeScript compiles with no errors
- ✅ `npm test` passes with >95% coverage for new code
- ✅ Can create knowledge event JSON file
- ✅ Can read/write knowledge events
- ✅ Can scan session directories
- ✅ Can parse session markdown with frontmatter
- ✅ Month folders auto-created when needed
- ✅ Graceful error handling for malformed data

### Phase 1 Validation Commands

```bash
# Compile
cd packages/core
npm run build

# Test
npm test -- events/KnowledgeEventStorage.test.ts
npm test -- sessions/SessionFileSystem.test.ts

# Coverage
npm test -- --coverage --collectCoverageFrom="src/domains/{events,sessions}/**/*.ts"
```

---

## Phase 2: Providers (Days 3-4)

### Goal
Create event providers that transform storage data to CanonicalEvents and integrate with timeline.

### Tasks

#### Day 3: Knowledge Event Provider

- [ ] **2.1** Create KnowledgeEventProvider class
  - **File**: `packages/core/src/domains/providers/knowledge/KnowledgeEventProvider.ts`
  - **Implements**: `IDataProvider` interface
  - **Constructor**: Takes `workspaceRoot: string`
  - **Methods**: `fetchEvents(config)`, `toCanonicalEvent(record)`
  - **Validation**: Implements all IDataProvider methods

- [ ] **2.2** Create index export
  - **File**: `packages/core/src/domains/providers/knowledge/index.ts`
  - **Exports**: `KnowledgeEventProvider`
  - **Validation**: Can import from path

- [ ] **2.3** Write unit tests
  - **File**: `packages/core/tests/unit/providers/KnowledgeEventProvider.test.ts`
  - **Tests**:
    - ✓ implements IDataProvider interface
    - ✓ returns empty array when no events
    - ✓ transforms knowledge-apply event correctly
    - ✓ transforms knowledge-create event correctly
    - ✓ transforms knowledge-remove event correctly
    - ✓ sets correct event type (knowledge-applied, etc.)
    - ✓ includes metadata fields
    - ✓ sets correct tags
    - ✓ populates all CanonicalEvent required fields
  - **Coverage**: >95%
  - **Validation**: `npm test -- KnowledgeEventProvider.test.ts` passes

#### Day 4: Session Event Provider

- [ ] **2.4** Create SessionEventProvider class
  - **File**: `packages/core/src/domains/providers/sessions/SessionEventProvider.ts`
  - **Implements**: `IDataProvider` interface
  - **Constructor**: Takes `workspaceRoot: string`
  - **Methods**: `fetchEvents(config)`, `toCanonicalEvent(session)`, `extractSummary(markdown)`
  - **Validation**: Implements all IDataProvider methods

- [ ] **2.5** Create index export
  - **File**: `packages/core/src/domains/providers/sessions/index.ts`
  - **Exports**: `SessionEventProvider`
  - **Validation**: Can import from path

- [ ] **2.6** Write unit tests
  - **File**: `packages/core/tests/unit/providers/SessionEventProvider.test.ts`
  - **Tests**:
    - ✓ implements IDataProvider interface
    - ✓ returns empty array when no sessions
    - ✓ transforms session to CanonicalEvent
    - ✓ extracts summary (first 200 chars)
    - ✓ sets correct event type (session-journal)
    - ✓ includes metadata with filePath, tags, topics, etc.
    - ✓ sets correct tags (includes session.tags)
    - ✓ handles missing optional fields
    - ✓ populates all CanonicalEvent required fields
  - **Coverage**: >95%
  - **Validation**: `npm test -- SessionEventProvider.test.ts` passes

- [ ] **2.7** Register providers in TimelineProvider
  - **File**: `packages/vscode/src/providers/timeline-provider-webpack.ts`
  - **Method**: `initializeDataOrchestrator()`
  - **Add**:
    ```typescript
    const knowledgeEventProvider = new KnowledgeEventProvider(this.workspaceRoot);
    this.dataOrchestrator.registerProvider('knowledge-events', knowledgeEventProvider);

    const sessionEventProvider = new SessionEventProvider(this.workspaceRoot);
    this.dataOrchestrator.registerProvider('session-journals', sessionEventProvider);
    ```
  - **Validation**: Extension compiles, no errors

- [ ] **2.8** Integration test
  - **File**: `packages/core/tests/integration/providers.integration.test.ts`
  - **Test setup**:
    - Create test knowledge-events.json
    - Create test session markdown files in month folders
    - Initialize both providers
    - Call fetchEvents()
  - **Tests**:
    - ✓ KnowledgeEventProvider returns CanonicalEvents
    - ✓ SessionEventProvider returns CanonicalEvents
    - ✓ Events have correct structure
    - ✓ Events have unique IDs
    - ✓ Timestamps are valid dates
  - **Validation**: Integration test passes

### Acceptance Criteria - Phase 2

- ✅ Both providers implement IDataProvider
- ✅ All unit tests pass with >95% coverage
- ✅ Integration test passes
- ✅ Providers registered in TimelineProvider
- ✅ Extension builds without errors
- ✅ Events transform correctly to CanonicalEvent
- ✅ All CanonicalEvent required fields populated

### Phase 2 Validation Commands

```bash
# Unit tests
npm test -- providers/KnowledgeEventProvider.test.ts
npm test -- providers/SessionEventProvider.test.ts

# Integration tests
npm test -- providers.integration.test.ts

# Build extension
cd packages/vscode
npm run build

# Manual validation
# 1. Create test knowledge-events.json
# 2. Create test session .md file in 2025-10/ folder
# 3. Launch extension (F5)
# 4. Open timeline
# 5. Check console for provider registration logs
```

---

## Phase 3: Event Recording (Day 5)

### Goal
Record knowledge application/removal events when user interacts with knowledge items via UI.

### Tasks

- [ ] **3.1** Add KnowledgeEventStorage to KnowledgeManager
  - **File**: `packages/vscode/src/services/KnowledgeManager.ts`
  - **Add**: Private field `private eventStorage: KnowledgeEventStorage`
  - **Initialize**: In constructor, create instance with workspace root
  - **Validation**: TypeScript compiles

- [ ] **3.2** Record event in applyItemsToClaudeMd
  - **File**: `packages/vscode/src/services/KnowledgeManager.ts`
  - **Method**: `applyItemsToClaudeMd()`
  - **Add**: After applying each item, call `eventStorage.recordEvent()`
  - **Event data**:
    ```typescript
    {
      type: 'apply',
      knowledgeItemId: item.id,
      knowledgeItemTitle: item.title,
      knowledgeItemType: item.type,
      targetFile,
      actor: 'user'
    }
    ```
  - **Validation**: Code compiles

- [ ] **3.3** Record event in removeItemsFromClaudeMd
  - **File**: `packages/vscode/src/services/KnowledgeManager.ts`
  - **Method**: `removeItemsFromClaudeMd()`
  - **Add**: After removing each item, call `eventStorage.recordEvent()`
  - **Event data**: Same as apply, but `type: 'remove'`
  - **Validation**: Code compiles

- [ ] **3.4** Manual testing
  - **Setup**: Launch extension in debug mode (F5)
  - **Test apply**:
    1. Open Knowledge tab
    2. Select a knowledge item
    3. Click "Apply Selected Items"
    4. Check `.agent-brain/events/knowledge-events.json` created
    5. Verify event recorded with correct data
    6. Verify `actor: "user"`
  - **Test remove**:
    1. Click "Remove from CLAUDE.md"
    2. Check new event added to JSON
    3. Verify `type: "remove"`
  - **Test timeline**:
    1. Refresh timeline (or auto-refresh)
    2. Verify knowledge events appear with purple circles
    3. Click event, verify popup shows details

- [ ] **3.5** Create example knowledge item for agent event recording
  - **File**: `.agent-brain/standards/record-knowledge-creation.md`
  - **Content**: Instructions for coding agents to record events when creating knowledge items
  - **Include**: JavaScript code snippet for recording
  - **Validation**: File created, readable

- [ ] **3.6** Create example knowledge item for session journaling
  - **File**: `.agent-brain/standards/periodic-journaling.md`
  - **Content**: Instructions for coding agents to create session journals
  - **Include**:
    - When to journal (every 10-15 prompts, topic changes)
    - How to create month folder
    - Frontmatter format
    - JavaScript code examples
  - **Validation**: File created, readable

### Acceptance Criteria - Phase 3

- ✅ Knowledge application creates event in JSON file
- ✅ Knowledge removal creates event in JSON file
- ✅ Events have correct structure and data
- ✅ Events appear on timeline after refresh
- ✅ No errors in console
- ✅ Example knowledge items created for agents
- ✅ Timeline shows events with correct visual appearance

### Phase 3 Validation Commands

```bash
# Build and run
cd packages/vscode
npm run build
# Press F5 to launch extension

# Manual tests (see 3.4 above)

# Check JSON file
cat .agent-brain/events/knowledge-events.json

# Verify structure
# Should have: id, timestamp, type, knowledgeItemId, etc.
```

---

## Phase 4: Visual Design (Days 6-7)

### Goal
Add visual styling, colors, shapes, popups, and legend entries for new event types.

### Tasks

#### Day 6: Theme Configuration

- [ ] **4.1** Add event colors
  - **File**: `packages/core/src/domains/visualization/theme/EventVisualTheme.ts`
  - **Add to**: `eventTypeColors`
  - **Colors**:
    ```typescript
    'knowledge-applied': '#9370DB',
    'knowledge-removed': '#9370DB80',  // 50% opacity
    'knowledge-created': '#20B2AA',
    'session-journal': '#FF8C00'
    ```
  - **Validation**: TypeScript compiles

- [ ] **4.2** Add event shapes
  - **File**: `packages/core/src/domains/visualization/theme/EventVisualTheme.ts`
  - **Add to**: `eventTypeShapes`
  - **Shapes**:
    ```typescript
    'knowledge-applied': d3.symbolCircle,
    'knowledge-removed': d3.symbolCircle,
    'knowledge-created': d3.symbolStar,
    'session-journal': d3.symbolDiamond
    ```
  - **Validation**: TypeScript compiles

- [ ] **4.3** Add event z-index
  - **File**: `packages/core/src/domains/visualization/theme/EventVisualTheme.ts`
  - **Add to**: `eventTypeZIndex`
  - **Z-index**:
    ```typescript
    'knowledge-applied': 5,
    'knowledge-removed': 4,
    'knowledge-created': 5,
    'session-journal': 6
    ```
  - **Validation**: TypeScript compiles

- [ ] **4.4** Add event labels
  - **File**: `packages/core/src/domains/visualization/theme/EventVisualTheme.ts`
  - **Add to**: `eventTypeLabels`
  - **Labels**:
    ```typescript
    'knowledge-applied': 'Knowledge Applied',
    'knowledge-removed': 'Knowledge Removed',
    'knowledge-created': 'Knowledge Created',
    'session-journal': 'Session Journal'
    ```
  - **Validation**: TypeScript compiles

- [ ] **4.5** Update legend
  - **File**: `packages/core/src/domains/visualization/timeline/LegendRenderer.ts`
  - **Method**: `getLegendItems()`
  - **Add**: Four new legend items
  - **Validation**: Legend renders with new items

#### Day 7: Popup Customization & CSS

- [ ] **4.6** Add knowledge event popup
  - **File**: `packages/core/src/domains/visualization/ui/PopupController.ts`
  - **Method**: `renderEventPopup()`
  - **Add**: Case for knowledge events
  - **Create**: `renderKnowledgeEventPopup(event)` method
  - **Content**:
    - Actor icon (👤 user, 🤖 agent)
    - Event title
    - Knowledge item type badge
    - Target file
    - Actor label
    - Timestamp
    - Button: "View Knowledge Item"
  - **Validation**: Popup renders correctly

- [ ] **4.7** Add session journal popup
  - **File**: `packages/core/src/domains/visualization/ui/PopupController.ts`
  - **Create**: `renderSessionJournalPopup(event)` method
  - **Content**:
    - Session icon (📝)
    - Title
    - Summary
    - Topics (tags)
    - Files modified (list, max 5)
    - Knowledge items used
    - Date
    - Button: "View Full Journal"
  - **Validation**: Popup renders correctly

- [ ] **4.8** Add popup CSS
  - **File**: `packages/core/src/domains/visualization/styles/timeline.css`
  - **Add**: Styles for:
    - `.event-popup.knowledge-event`
    - `.event-popup.session-event`
    - `.popup-header` (with icon)
    - `.popup-body` (fields)
    - `.popup-actions` (buttons)
    - `.badge` (knowledge type)
    - `.tags` (topic tags)
    - `.file-list` (files modified)
  - **Validation**: CSS loads, no syntax errors

- [ ] **4.9** Visual QA
  - **Setup**: Launch extension with test data
  - **Create test data**:
    - Add 2-3 knowledge events (apply, create, remove)
    - Add 1-2 session journal files
  - **Tests**:
    - ✓ Knowledge applied: purple circle
    - ✓ Knowledge created: teal star
    - ✓ Knowledge removed: faded purple circle
    - ✓ Session journal: orange diamond
    - ✓ Legend shows all 4 event types
    - ✓ Clicking knowledge event shows correct popup
    - ✓ Clicking session event shows correct popup
    - ✓ Popup styling matches VSCode theme
    - ✓ Z-index layering correct (sessions on top)
    - ✓ Events don't overlap commit events incorrectly

### Acceptance Criteria - Phase 4

- ✅ All event types render with correct colors
- ✅ All event types render with correct shapes
- ✅ Legend displays all new event types
- ✅ Popups show detailed information
- ✅ Popup styling matches VSCode theme
- ✅ Popup actions work (view knowledge item, view journal)
- ✅ No visual regressions on existing event types
- ✅ Z-index layering correct
- ✅ CSS compiles without errors

### Phase 4 Validation Commands

```bash
# Build
cd packages/vscode
npm run build

# Manual visual testing (see 4.9 above)

# Create test data
cat > .agent-brain/events/knowledge-events.json << 'EOF'
{
  "version": "1.0",
  "events": [
    {
      "id": "ke-1729518900000",
      "timestamp": "2025-10-21T14:35:00.000Z",
      "type": "apply",
      "knowledgeItemId": "golden-path-oauth",
      "knowledgeItemTitle": "OAuth Golden Path",
      "knowledgeItemType": "golden-path",
      "targetFile": "CLAUDE.md",
      "actor": "user"
    }
  ]
}
EOF

mkdir -p .agent-brain/sessions/2025-10
cat > .agent-brain/sessions/2025-10/2025-10-21-test-session.md << 'EOF'
---
title: Test Session
date: 2025-10-21
tags: [test]
topics: [testing, validation]
---

# Test Session

This is a test session journal.
EOF

# Launch and visually verify all rendering
```

---

## Phase 5: Configuration (Day 8)

### Goal
Add VSCode settings to toggle event sources on/off.

### Tasks

- [ ] **5.1** Add settings schema to package.json
  - **File**: `packages/vscode/package.json`
  - **Section**: `contributes.configuration`
  - **Add**:
    ```json
    "agentBrain.timeline.eventSources": {
      "type": "object",
      "default": {
        "git": true,
        "github": true,
        "knowledgeEvents": true,
        "sessionJournals": true
      },
      "properties": { ... },
      "description": "Control which event sources are displayed on the timeline"
    }
    ```
  - **Validation**: Extension builds, settings appear in VSCode settings UI

- [ ] **5.2** Read configuration in TimelineProvider
  - **File**: `packages/vscode/src/providers/timeline-provider-webpack.ts`
  - **Method**: Modify `fetchEvents()` or create new `getEnabledProviders()`
  - **Add**: Read `agentBrain.timeline.eventSources` config
  - **Validation**: Code compiles

- [ ] **5.3** Filter providers based on config
  - **File**: `packages/vscode/src/providers/timeline-provider-webpack.ts`
  - **Logic**: Only fetch from enabled providers
  - **Implementation**:
    ```typescript
    const eventSources = config.get('agentBrain.timeline.eventSources');
    if (eventSources.git) {
      // fetch git events
    }
    if (eventSources.knowledgeEvents) {
      // fetch knowledge events
    }
    // etc.
    ```
  - **Validation**: Code compiles

- [ ] **5.4** Test configuration changes
  - **Setup**: Launch extension
  - **Tests**:
    - ✓ Open VSCode settings (Cmd/Ctrl + ,)
    - ✓ Search "Agent Brain event sources"
    - ✓ See all four toggles (git, github, knowledgeEvents, sessionJournals)
    - ✓ All enabled by default
    - ✓ Disable "Knowledge Events"
    - ✓ Refresh timeline - no knowledge events shown
    - ✓ Re-enable - events reappear
    - ✓ Disable "Session Journals"
    - ✓ Refresh timeline - no session events shown
    - ✓ Test all combinations

### Acceptance Criteria - Phase 5

- ✅ Settings appear in VSCode Settings UI
- ✅ Settings have correct default values (all true)
- ✅ Disabling source removes events from timeline
- ✅ Re-enabling source shows events again
- ✅ Changes take effect on timeline refresh
- ✅ No errors when toggling settings
- ✅ All four sources can be toggled independently

### Phase 5 Validation Commands

```bash
# Build
cd packages/vscode
npm run build

# Launch extension (F5)

# Manual testing (see 5.4 above)

# Verify settings in VSCode
# 1. Open settings (Cmd/Ctrl + ,)
# 2. Search "agent brain event"
# 3. Should see "Timeline: Event Sources"
# 4. Toggle checkboxes
# 5. Refresh timeline and verify
```

---

## Phase 6: Polish & Documentation (Days 9-10)

### Goal
Error handling, loading states, documentation, and final validation.

### Tasks

#### Day 9: Error Handling & Edge Cases

- [ ] **6.1** Error handling in KnowledgeEventStorage
  - **File**: `packages/core/src/domains/events/KnowledgeEventStorage.ts`
  - **Add**:
    - Try-catch around file read with graceful fallback
    - Log errors with logger
    - Return empty array on error
  - **Test**: Corrupt JSON file
  - **Validation**: No crashes, logs error, returns empty array

- [ ] **6.2** Error handling in SessionFileSystem
  - **File**: `packages/core/src/domains/sessions/SessionFileSystem.ts`
  - **Add**:
    - Try-catch around file read
    - Handle missing frontmatter fields with defaults
    - Skip unparseable files, log warning
    - Handle invalid dates gracefully
  - **Test**: Malformed markdown, missing frontmatter
  - **Validation**: No crashes, skips bad files, logs warnings

- [ ] **6.3** Error handling in providers
  - **Files**: KnowledgeEventProvider, SessionEventProvider
  - **Add**: Try-catch around storage operations
  - **Validation**: No crashes on storage errors

- [ ] **6.4** Loading states in UI
  - **File**: Timeline rendering code
  - **Add**: Show spinner/loading indicator while fetching events
  - **Validation**: Loading indicator appears briefly

- [ ] **6.5** Empty states
  - **Timeline**: Show helpful message when no events
  - **Session tab**: Show "No sessions yet" message
  - **Validation**: Empty states render correctly

- [ ] **6.6** Edge case testing
  - **Tests**:
    - ✓ Empty .agent-brain/ directory
    - ✓ Missing events/ subdirectory
    - ✓ Missing sessions/ subdirectory
    - ✓ Corrupted knowledge-events.json
    - ✓ Session file with no frontmatter
    - ✓ Session file with invalid date
    - ✓ Session file with empty body
    - ✓ Very old session (year 2020)
    - ✓ Future-dated session
    - ✓ 100+ events (performance)
    - ✓ Special characters in filenames

#### Day 10: Documentation

- [ ] **6.7** Update CLAUDE.md
  - **File**: `CLAUDE.md`
  - **Add sections**:
    - Event Types (knowledge, session)
    - Provider descriptions
    - Directory structure (.agent-brain/events, sessions/YYYY-MM)
    - How to create session journals (for agents)
    - How to record knowledge events (for agents)
  - **Validation**: Markdown renders correctly

- [ ] **6.8** Add code comments
  - **Files**: All new classes
  - **Add**: JSDoc comments for public methods
  - **Format**:
    ```typescript
    /**
     * Loads all knowledge events from storage.
     * @returns Array of knowledge event records
     */
    async loadAll(): Promise<KnowledgeEventRecord[]> { ... }
    ```
  - **Validation**: TSDoc generates correctly

- [ ] **6.9** Create user guide
  - **File**: `docs/knowledge-and-session-events.md`
  - **Sections**:
    - Overview
    - Event types and what they mean
    - How to view events on timeline
    - How to filter event sources
    - How agents can record events
    - Troubleshooting
  - **Validation**: Document is clear and complete

- [ ] **6.10** Update README
  - **File**: `README.md`
  - **Add**: Bullet points about new features
  - **Validation**: Markdown renders correctly

- [ ] **6.11** Final regression testing
  - **Tests**:
    - ✓ All existing features still work
    - ✓ Git events still render correctly
    - ✓ GitHub events still render correctly
    - ✓ Knowledge tab still works
    - ✓ Applying/removing knowledge items works
    - ✓ Timeline zoom/pan works
    - ✓ Event popups work for all event types
    - ✓ Legend is complete
    - ✓ Filters work
    - ✓ No console errors
    - ✓ Extension loads in < 2 seconds

### Acceptance Criteria - Phase 6

- ✅ All error cases handled gracefully
- ✅ No crashes with malformed data
- ✅ Loading states show for async operations
- ✅ Empty states are informative
- ✅ All code has JSDoc comments
- ✅ CLAUDE.md updated
- ✅ User guide created
- ✅ README updated
- ✅ No regression in existing features
- ✅ All tests pass
- ✅ Build succeeds with no errors or warnings

### Phase 6 Validation Commands

```bash
# Full test suite
cd packages/core
npm test

# Build everything
cd ../..
npm run build

# Check for TypeScript errors
npm run build:core
npm run build:vscode

# Launch extension
cd packages/vscode
code --extensionDevelopmentPath=$(pwd)

# Run through full manual test checklist (see 6.11)
```

---

## Final Validation Checklist

Before marking as complete, verify all of these:

### Code Quality
- [ ] All TypeScript compiles with no errors
- [ ] All tests pass
- [ ] Test coverage >90% for new code
- [ ] No console errors or warnings
- [ ] No TODO comments in code
- [ ] All code has JSDoc comments
- [ ] Code follows existing patterns

### Functionality
- [ ] Knowledge application creates events
- [ ] Knowledge removal creates events
- [ ] Session journals load from files
- [ ] All event types appear on timeline
- [ ] Event colors/shapes correct
- [ ] Event popups show details
- [ ] Legend shows all event types
- [ ] Event source toggles work
- [ ] No performance degradation

### User Experience
- [ ] Events render at correct z-index
- [ ] Popup styling matches theme
- [ ] Loading states appear
- [ ] Empty states are helpful
- [ ] Error messages are clear
- [ ] Documentation is complete

### Edge Cases
- [ ] Handles missing directories
- [ ] Handles corrupted JSON
- [ ] Handles malformed markdown
- [ ] Handles 100+ events
- [ ] Handles special characters
- [ ] Handles future dates
- [ ] Handles very old dates

### Documentation
- [ ] CLAUDE.md updated
- [ ] README updated
- [ ] User guide created
- [ ] Code comments complete
- [ ] Example files created

### Deployment
- [ ] Extension packages successfully (`npm run package:vscode`)
- [ ] VSIX installs without errors
- [ ] Extension activates in fresh VSCode window
- [ ] Works with empty workspace
- [ ] Works with existing workspace

---

## Rollback Plan

If critical issues discovered:

### Phase 6 Issues
- Revert documentation changes
- Fix issues
- Redeploy

### Phase 5 Issues
- Remove settings from package.json
- Remove config reading code
- Providers always enabled

### Phase 4 Issues
- Remove theme changes
- Remove popup customizations
- Events show with default styling

### Phase 3 Issues
- Remove event recording from KnowledgeManager
- Events not recorded but providers still work

### Phase 2 Issues
- Unregister providers
- Remove from initializeDataOrchestrator
- Timeline shows git/github only

### Phase 1 Issues
- Remove storage classes
- Entire feature disabled

---

## Success Metrics

### Technical
- ✅ Build time: < 30s
- ✅ Test time: < 10s
- ✅ Extension load time: < 2s
- ✅ Event fetch time: < 100ms for 1000 events
- ✅ Test coverage: >90%

### Functional
- ✅ All 4 event types render correctly
- ✅ All event sources can be toggled
- ✅ Zero crashes with malformed data
- ✅ Handles 1000+ events without lag

### User Experience
- ✅ Clear visual differentiation between event types
- ✅ Informative popups
- ✅ Helpful empty states
- ✅ Clear documentation

---

## Maintenance Notes

### Future Considerations
- Add event search/filtering
- Add date range filtering
- Add event export
- Add event archival (rotate old events)
- Add visual links between related events
- Add session journal editing UI

### Known Limitations
- Events not editable via UI (must edit files directly)
- No event deletion (must edit JSON/delete files)
- No automatic git commit correlation (future phase)
- Session journals require manual creation by agents

---

**Implementation Status**: Ready to start
**Next Step**: Begin Phase 1, Task 1.1
