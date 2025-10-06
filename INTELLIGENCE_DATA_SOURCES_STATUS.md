# Intelligence Data Sources - Current Status & Roadmap

**Date:** 2025-10-05
**Status:** 📋 STATUS REPORT

## Question: Where are ADRs and other guiding inputs stored?

**Short Answer:** They're **not yet implemented**. Currently only learnings from test failures are stored.

## Current State (Phase 7B)

### ✅ What IS Stored

**1. Learning Patterns** (`learnings.json`)
- Source: Test failures (future: pathway tests)
- Location: `.agent-brain/learnings.json`
- Status: **IMPLEMENTED** ✅
- Storage: FileLearningStorage
- Persistence: Survives restarts ✅

**Example:**
```json
{
  "id": "pattern_1733435923789",
  "name": "TypeScript Type Error",
  "category": "compilation",
  "description": "Missing type annotation",
  "confidenceScore": 0.95
}
```

### ❌ What is NOT Yet Stored

**2. Architectural Decision Records (ADRs)**
- Source: Manual user input
- Location: `.agent-brain/adrs.json` (planned)
- Status: **NOT IMPLEMENTED** ❌
- Storage: Needs implementation
- UI: Needs implementation

**3. Code Highlight Recommendations**
- Source: User highlighting code + requesting guidance
- Location: `.agent-brain/highlights.json` or part of ADRs (TBD)
- Status: **NOT IMPLEMENTED** ❌
- VSCode integration: Needs implementation

**4. Pattern Detection Rules**
- Source: Manual user configuration + learned patterns
- Location: `.agent-brain/patterns.json` (planned)
- Status: **PARTIALLY IMPLEMENTED**
  - In-memory: ✅ (PatternSystem exists)
  - File storage: ❌ (not persisted)
- Storage: Needs FilePatternsStorage

**5. Agent Emissions** (Future - Phase 9)
- Source: Claude Code, Cursor, GitHub Copilot
- Location: Will emit CanonicalEvents directly
- Status: **NOT IMPLEMENTED** ❌
- Design: Documented in ARCHITECTURE_DESIGN_V3.md

**6. Pathway Test Learnings**
- Source: Pathway test failures → learning patterns
- Location: `.agent-brain/learnings.json` (same as test failures)
- Status: **ADAPTER CREATED** ⏸️
  - PathwayLearningAdapter exists
  - Not yet connected to actual pathway tests
- Integration: Needs connection

## Planned Storage Structure

```
project-root/
  .agent-brain/
    learnings.json        # ✅ IMPLEMENTED - Test failure patterns
    patterns.json         # ❌ NOT IMPLEMENTED - Detection rules
    adrs.json             # ❌ NOT IMPLEMENTED - Architectural decisions
    highlights.json       # ❌ NOT IMPLEMENTED - Code highlight guidance
    config.json           # ❌ NOT IMPLEMENTED - Intelligence config
```

## Intelligence Input Sources (Per Architecture)

### From ARCHITECTURE_DESIGN_V3.md

The intelligence system has **multiple input adapters**:

```
Intelligence Inputs:
├── Extension Adapter        [Status: Exists in code, not connected]
│   └── Code highlighting    [NOT IMPLEMENTED]
│
├── Webhook Adapter         [Status: Exists in code, not connected]
│   └── External events     [NOT IMPLEMENTED]
│
├── Pathway Testing Adapter [Status: Created, not connected]
│   └── Test failures       [ADAPTER EXISTS]
│
└── Agent Emission Adapter  [Status: Future - Phase 9]
    └── Claude/Copilot      [NOT IMPLEMENTED]
```

## What Each Input Source Needs

### 1. ADRs (Architectural Decision Records)

**Purpose:** Capture architectural decisions made by developers

**User Flow:**
```
User right-clicks in editor
  ↓
Selects "Add Architectural Decision"
  ↓
Form appears with fields:
  - Decision title
  - Context
  - Decision
  - Consequences
  - Alternatives considered
  ↓
Saves to .agent-brain/adrs.json
  ↓
Appears in timeline as ADR_RECORDED event
```

**Data Structure:**
```json
{
  "id": "adr-001",
  "timestamp": "2025-10-05T12:00:00Z",
  "title": "Use React for UI Components",
  "context": "Need component framework for dashboard",
  "decision": "Chose React for component architecture",
  "consequences": "Learning curve for team, but...",
  "alternatives": ["Vue", "Angular", "Svelte"],
  "status": "accepted",
  "tags": ["frontend", "architecture"]
}
```

**Needs Implementation:**
1. ADRStorage class (similar to FileLearningStorage)
2. VSCode command: "Agent-Brain: Record Architectural Decision"
3. Webview form for ADR input
4. ADR → CanonicalEvent converter
5. Timeline visualization for ADR events

### 2. Code Highlight Recommendations

**Purpose:** User highlights code, requests architectural guidance

**User Flow:**
```
User highlights code in editor
  ↓
Right-click → "Agent-Brain: Request Guidance"
  ↓
System analyzes:
  - Code patterns
  - Existing learnings
  - Related ADRs
  ↓
Shows recommendations panel
  ↓
User can:
  - Accept recommendation → Creates ADR
  - Reject recommendation
  - Add manual guidance
  ↓
Saved as ADR or guidance entry
```

**Needs Implementation:**
1. VSCode selection context integration
2. Code analysis engine (use PatternSystem)
3. Recommendation panel UI
4. Integration with ADR system

### 3. Pattern Detection Rules (Persistent)

**Current:** PatternSystem stores rules in-memory
**Needed:** Persist to `.agent-brain/patterns.json`

**Implementation Options:**

**Option A: Use PatternSystem's export/import**
```typescript
// On startup
const data = JSON.parse(await fs.readFile(patternsPath));
await patternSystem.importPatterns(data);

// On shutdown or periodically
const data = patternSystem.exportPatterns();
await fs.writeFile(patternsPath, JSON.stringify(data));
```

**Option B: Create FilePatternStorage** (better)
```typescript
class FilePatternStorage implements PatternStorage {
  async save(patterns: EnginePattern[]): Promise<void> {
    // Serialize patterns to JSON
  }

  async load(): Promise<EnginePattern[]> {
    // Deserialize from JSON
  }
}
```

### 4. Pathway Test Integration

**Current State:**
- PathwayLearningAdapter exists
- Converts pathway test failures → LearningPattern
- Not yet connected to actual pathway test runner

**Needs:**
```typescript
// In pathway test runner
if (testFailed) {
  const pathwayFailure: PathwayTestFailure = {
    pathway: 'DATA_INGESTION',
    testName: 'should fetch events',
    failedAtMilestone: 'fetchFromProviders',
    // ... details
  };

  // Convert to learning
  await pathwayLearningAdapter.processFailure(pathwayFailure);
  // Now saved to .agent-brain/learnings.json
}
```

### 5. Agent Emissions (Phase 9 - Future)

**Purpose:** Capture Claude Code, Cursor, Copilot activities

**Data Flow:**
```
Claude Code makes edit
  ↓
Emits structured event
  ↓
AgentEmissionAdapter captures
  ↓
Converts to CanonicalEvent
  ↓
Shows in timeline as AGENT_EDIT event
  ↓
Learning system can analyze for patterns
```

**See:** prompt_based_event_model.md, canonical_event_design.md

## Implementation Roadmap

### Phase 8A: Pattern Persistence (1-2 hours)
- [ ] Create FilePatternStorage class
- [ ] Update PatternSystem to use file storage
- [ ] Add patterns.json auto-save/load
- [ ] Test persistence across restarts

### Phase 8B: ADR System (4-6 hours)
- [ ] Create ADR data model
- [ ] Create FileADRStorage class
- [ ] Add VSCode command "Record Architectural Decision"
- [ ] Create ADR input webview form
- [ ] Add ADR → CanonicalEvent converter
- [ ] Add ADR_RECORDED event type
- [ ] Update timeline to display ADRs
- [ ] Test full flow

### Phase 8C: Code Highlight Guidance (6-8 hours)
- [ ] Add VSCode selection command
- [ ] Integrate with PatternSystem for analysis
- [ ] Create recommendations panel UI
- [ ] Link to ADR system
- [ ] Test with real code

### Phase 8D: Pathway Test Integration (2-3 hours)
- [ ] Connect PathwayLearningAdapter to test runner
- [ ] Update test framework to call adapter on failure
- [ ] Verify learnings are captured
- [ ] Test learning accumulation

### Phase 9: Agent Emissions (Major - TBD)
- [ ] Design emission capture mechanism
- [ ] Create AgentEmissionAdapter
- [ ] Integrate with Claude Code
- [ ] Add AGENT_* event types
- [ ] Test emission → timeline flow

## Current Files That Exist (Not Utilized)

From `packages/core/src/domains/intelligence/adapters/`:

### Extension Adapter
**Location:** `adapters/extensions/`
**Files:**
- ExtensionAPI.ts
- ExtensionLoader.ts
- ExtensionManager.ts

**Purpose:** Load external pattern plugins
**Status:** Code exists, not utilized
**Needs:** Integration with extension marketplace

### Webhook Adapter
**Location:** `adapters/webhooks/`
**Files:**
- WebhookAdapter.ts
- WebSocketAdapter.ts

**Purpose:** Receive events from external systems
**Status:** Code exists, not utilized
**Needs:** Webhook endpoint registration

### Testing Adapter
**Location:** `adapters/testing/`
**Files:**
- PathwayLearningAdapter.ts

**Purpose:** Convert test failures to learnings
**Status:** Created in Phase 6, not connected
**Needs:** Integration with pathway test runner

## Answer Summary

### Current Reality

**Only ONE data source is persisted:**
- ✅ Learning patterns from test failures → `.agent-brain/learnings.json`

**Everything else is either:**
- ⏸️ In-memory only (PatternSystem)
- ❌ Not implemented (ADRs, highlights, guidance)
- 🔜 Future (Agent emissions)

### What You Asked About

**"Where are ADRs stored?"**
- Answer: Nowhere yet. Planned for `.agent-brain/adrs.json`
- Implementation: Phase 8B

**"Where are other guiding inputs?"**
- Code highlights: Not implemented
- Pattern rules: In-memory only (need file storage)
- Pathway learnings: Adapter exists, not connected
- Agent emissions: Future (Phase 9)

### Quick Wins (If You Want to Implement Soon)

**Easiest First:**
1. **Pattern Persistence** (Phase 8A) - Simplest, uses existing export/import
2. **Pathway Integration** (Phase 8D) - Adapter exists, just needs connection
3. **ADR System** (Phase 8B) - Most user-facing value
4. **Code Highlights** (Phase 8C) - Most complex UI

## Questions for Planning

1. **Priority?** Which input source is most valuable to implement next?
2. **ADR Format?** Use standard ADR template or custom format?
3. **Code Highlights?** Should they create ADRs or separate guidance entries?
4. **Pathway Integration?** Should failed pathway tests auto-create learnings?
5. **Timeline?** When do you want Phase 8 implemented?
