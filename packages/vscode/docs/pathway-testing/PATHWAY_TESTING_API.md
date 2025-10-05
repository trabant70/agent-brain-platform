# Pathway Testing API Documentation

**Version:** 0.4.66
**Last Updated:** 2025-10-04
**Status:** Production-Ready (149 tests, 97%+ pass rate)

---

## Table of Contents

- [Overview](#overview)
- [Core Concepts](#core-concepts)
- [Pathway Definitions](#pathway-definitions)
  - [DATA_INGESTION](#data_ingestion)
  - [FILTER_APPLY](#filter_apply)
  - [STATE_PERSIST](#state_persist)
  - [RENDER_PIPELINE](#render_pipeline)
  - [USER_INTERACTION](#user_interaction)
  - [WEBVIEW_MESSAGING](#webview_messaging)
  - [CONFIG_SYNC](#config_sync)
  - [RANGE_SELECTOR](#range_selector)
- [Testing API](#testing-api)
  - [PathwayAsserter](#pathwayasserter)
  - [PathwayDebugger](#pathwaydebugger)
  - [LogCapture](#logcapture)
  - [Custom Matchers](#custom-matchers)
- [Test Utilities](#test-utilities)
- [Writing Pathway Tests](#writing-pathway-tests)
- [Performance Budgets](#performance-budgets)
- [AI-Assisted Debugging](#ai-assisted-debugging)

---

## Overview

Pathway testing is a milestone-based testing approach that verifies end-to-end data flows by asserting on log emissions at critical points in the code. Unlike traditional unit tests that check final output, pathway tests validate the **journey** through the codebase.

### Key Benefits

1. **Self-Evolving**: Tests get more precise as code matures with additional log milestones
2. **AI-Debuggable**: Failures pinpoint exact location in data flow for automated fixing
3. **Flow-Oriented**: Tests verify entire pathways, not just isolated units
4. **Failure Context**: Rich debugging information with hypothesis generation
5. **Minimal Mocking**: Tests use real code paths with log interception

### Test Coverage Summary

- **Total Tests**: 149 pathway tests
- **Pass Rate**: 97%+
- **8 Pathways**: All critical flows covered
- **Performance**: < 500ms for 1000 events

---

## Core Concepts

### Pathway

An **end-to-end data flow** through the system, from entry point to completion. Examples:
- User clicks filter → State updates → Data refreshes → UI re-renders
- Git extraction → Normalization → Caching → Rendering

### Milestone

A **log emission point** in the code that marks progress through a pathway. Each milestone has:
- **Context**: Function/method name where log occurs (e.g., `DataOrchestrator.getEvents`)
- **Message**: Optional message pattern to match
- **Data**: Optional data fields to verify
- **Category**: Log category (DATA, ORCHESTRATION, UI, etc.)

### Assertion

A **sequence of expected milestones** for a pathway. Tests verify:
1. All milestones reached in order
2. Optional milestones skipped appropriately
3. No unexpected failures or errors
4. Timing constraints met

---

## Pathway Definitions

### DATA_INGESTION

**Purpose**: Data flow from git repository through orchestrator to normalized events

**Flow**: `GitEventRepository` → `GitProvider` → `DataOrchestrator` → `CanonicalEvent[]`

#### Milestones

| Context | Location | Purpose | Required |
|---------|----------|---------|----------|
| `DataOrchestrator.constructor` | `src/orchestration/DataOrchestrator.ts:76` | Orchestrator initialization | Yes |
| `DataOrchestrator.initialize` | `src/orchestration/DataOrchestrator.ts:89` | Provider registration start | Yes |
| `DataOrchestrator.getEvents` | `src/orchestration/DataOrchestrator.ts:139` | Event fetch request | Yes |
| `DataOrchestrator.getEvents` (cached) | `src/orchestration/DataOrchestrator.ts:143` | Cache hit path | No (optional) |
| `DataOrchestrator.fetchFromProviders` | `src/orchestration/DataOrchestrator.ts:372` | Multi-provider fetch start | Yes |
| `DataOrchestrator.fetchFromProviders` (provider loop) | `src/orchestration/DataOrchestrator.ts:376` | Individual provider fetch | Yes |
| `DataOrchestrator.fetchFromProviders` (dedup) | `src/orchestration/DataOrchestrator.ts:397` | Event deduplication start | Yes |
| `GitEventRepository.extractGitEvents` | `src/timeline/infrastructure/GitEventRepository.ts:75` | Git extraction start | Yes |
| `GitEventRepository.extractCommitEvents` | `src/timeline/infrastructure/GitEventRepository.ts:160` | Commit extraction | Yes |
| `GitEventRepository.parseCommitOutput` | `src/timeline/infrastructure/GitEventRepository.ts:182` | Commit parsing | Yes |

#### Example Test

```typescript
it('should complete git event extraction pathway', async () => {
    const asserter = new PathwayAsserter(LogPathway.DATA_INGESTION)
        .expectMilestone('GitEventRepository.extractGitEvents', {
            message: /Starting git event extraction/i
        })
        .expectMilestone('GitEventRepository.extractCommitEvents', {
            message: /Extracting commit events/i
        })
        .expectMilestone('GitEventRepository.parseCommitOutput', {
            message: /Parsing.*commit/i
        });

    const repository = new GitEventRepository();
    const collection = await repository.extractGitEvents(testRepoPath);

    asserter.setCapturedLogs(getLogCapture().getLogs());
    const result = asserter.verify();

    expect(result.passed).toBe(true);
    expect(collection.events.length).toBeGreaterThan(0);
});
```

---

### FILTER_APPLY

**Purpose**: Filter state changes propagating through system to filtered results

**Flow**: `FilterController` → `FilterStateManager` → `DataOrchestrator.applyFilters` → Re-render

#### Milestones

| Context | Location | Purpose | Required |
|---------|----------|---------|----------|
| `FilterController.constructor` | `src/visualization/ui/FilterController.ts:98` | Filter UI initialization | Yes |
| `FilterController.handleFilterChange` | `src/visualization/ui/FilterController.ts:150` | Filter change detected | Yes |
| `FilterController.clearAllFilters` | `src/visualization/ui/FilterController.ts:228` | Clear all operation | No (optional) |
| `DataOrchestrator.applyFilters` | `src/orchestration/DataOrchestrator.ts:422` | Filter application start | Yes |
| `SimpleTimelineApp.onFilterUpdate` | `src/webview/SimpleTimelineApp.ts:89` | Filter update callback | Yes |

#### Example Test

```typescript
it('should apply event type filter and update UI', async () => {
    const asserter = new PathwayAsserter(LogPathway.FILTER_APPLY)
        .expectMilestone('FilterController.handleFilterChange')
        .expectMilestone('DataOrchestrator.applyFilters')
        .expectMilestone('SimpleTimelineApp.onFilterUpdate');

    const controller = new FilterController();
    controller.setCallbacks({
        onFilterUpdate: (filters) => {
            expect(filters.selectedEventTypes).toEqual(['commit']);
        }
    });

    // Simulate filter change
    controller.handleFilterChange('event-types', ['commit']);

    asserter.setCapturedLogs(getLogCapture().getLogs());
    const result = asserter.verify();

    expect(result.passed).toBe(true);
});
```

---

### STATE_PERSIST

**Purpose**: Filter state persistence across repository switches

**Flow**: `FilterStateManager.setFilterState` → In-memory storage → `getFilterState` retrieval

#### Milestones

| Context | Location | Purpose | Required |
|---------|----------|---------|----------|
| `FilterStateManager.constructor` | `src/orchestration/FilterStateManager.ts:46` | Manager initialization | Yes |
| `FilterStateManager.getFilterState` | `src/orchestration/FilterStateManager.ts:65` | State retrieval | Yes |
| `FilterStateManager.setFilterState` | `src/orchestration/FilterStateManager.ts:87` | State persistence | Yes |
| `FilterStateManager.updateFilterState` | `src/orchestration/FilterStateManager.ts:116` | Partial update | No (optional) |
| `FilterStateManager.resetFilterState` | `src/orchestration/FilterStateManager.ts:130` | State reset | No (optional) |
| `FilterStateManager.exportStates` | `src/orchestration/FilterStateManager.ts:217` | Bulk export | No (optional) |
| `FilterStateManager.importStates` | `src/orchestration/FilterStateManager.ts:227` | Bulk import | No (optional) |

#### Example Test

```typescript
it('should persist filter state per repository', () => {
    const asserter = new PathwayAsserter(LogPathway.STATE_PERSIST)
        .expectMilestone('FilterStateManager.setFilterState')
        .expectMilestone('FilterStateManager.getFilterState');

    const manager = new FilterStateManager();
    const repo1 = '/path/to/repo1';
    const repo2 = '/path/to/repo2';

    // Set different states for two repos
    manager.setFilterState(repo1, { selectedBranches: ['main'] });
    manager.setFilterState(repo2, { selectedBranches: ['develop'] });

    // Verify isolation
    const state1 = manager.getFilterState(repo1);
    const state2 = manager.getFilterState(repo2);

    expect(state1.selectedBranches).toEqual(['main']);
    expect(state2.selectedBranches).toEqual(['develop']);

    asserter.setCapturedLogs(getLogCapture().getLogs());
    expect(asserter.verify().passed).toBe(true);
});
```

---

### RENDER_PIPELINE

**Purpose**: Data processing through visualization layers to DOM rendering

**Flow**: `TimelineDataManager` → `D3TimelineRenderer` → `EventRenderer` → DOM updates

#### Milestones

| Context | Location | Purpose | Required |
|---------|----------|---------|----------|
| `TimelineDataManager.processTimelineData` | Visualization layer | Data processing start | Yes |
| `D3TimelineRenderer.render` | D3 rendering | Main render call | Yes |
| `EventRenderer.renderEvents` | Event rendering | Event drawing | Yes |
| `LegendRenderer.render` | Legend rendering | Legend updates | No (optional) |
| `InteractionHandler.setupEventListeners` | Interaction setup | Event listeners | No (optional) |

#### Performance Budgets

- **Small datasets** (< 100 events): < 50ms
- **Medium datasets** (100-500 events): < 200ms
- **Large datasets** (500-1000 events): < 500ms
- **Animation frame rate**: 60 FPS target

---

### USER_INTERACTION

**Purpose**: User actions triggering event handlers and UI updates

**Flow**: DOM event → `InteractionHandler` → State update → UI feedback

#### Milestones

| Context | Purpose | Required |
|---------|---------|----------|
| `InteractionHandler.handleEventClick` | Event click detected | Yes |
| `InteractionHandler.handleEventHover` | Event hover detected | Yes |
| `InteractionHandler.handleZoom` | Zoom interaction | No |
| `InteractionHandler.handlePan` | Pan interaction | No |
| `PopupController.show` | Popup display | Yes (for hover/click) |

---

### WEBVIEW_MESSAGING

**Purpose**: Extension ↔ Webview communication via postMessage

**Flow**: Extension → `postMessage` → Webview handler → Response → Extension callback

#### Milestones

| Context | Purpose | Required |
|---------|---------|----------|
| `TimelineProvider.sendMessage` | Message sent from extension | Yes |
| `SimpleTimelineApp.handleMessage` | Message received in webview | Yes |
| `SimpleTimelineApp.postResponse` | Response sent back | No (optional) |
| `TimelineProvider.handleWebviewMessage` | Response received | No (optional) |

---

### CONFIG_SYNC

**Purpose**: Configuration changes propagating through system

**Flow**: VS Code settings → Extension config → Webview → UI updates

#### Milestones

| Context | Purpose | Required |
|---------|---------|----------|
| `Extension.onConfigChange` | Config change detected | Yes |
| `DataOrchestrator.updateConfig` | Config applied to orchestrator | Yes |
| `SimpleTimelineApp.handleConfigUpdate` | Config synced to webview | Yes |
| `ThemeController.applyTheme` | Theme updated | No (optional) |

---

### RANGE_SELECTOR

**Purpose**: Time slider/brush interactions updating viewport

**Flow**: Brush interaction → Time range calculation → Viewport update → Re-render

#### Milestones

| Context | Purpose | Required |
|---------|---------|----------|
| `RangeSelector.handleBrushStart` | Brush interaction started | Yes |
| `RangeSelector.calculateTimeRange` | Time range computed | Yes |
| `D3TimelineRenderer.updateViewport` | Viewport updated | Yes |
| `EventRenderer.filterByRange` | Events filtered | Yes |

---

## Testing API

### PathwayAsserter

**Purpose**: Fluent API for defining and verifying expected milestone sequences

**File**: `tests/utils/PathwayAsserter.ts`

#### Class Definition

```typescript
class PathwayAsserter {
  constructor(pathway: LogPathway);

  /**
   * Add an expected milestone (test fails if not reached)
   */
  expectMilestone(context: string, matcher?: {
    message?: string | RegExp;
    data?: Record<string, any>;
    category?: LogCategory;
  }): this;

  /**
   * Add an optional milestone (test passes if skipped)
   */
  expectOptionalMilestone(context: string, matcher?: ...): this;

  /**
   * Get list of expected milestones
   */
  getMilestones(): Milestone[];

  /**
   * Set captured logs for verification
   */
  setCapturedLogs(logs: LogEntry[]): void;

  /**
   * Verify all milestones were reached
   * @returns AssertionReport with detailed results
   */
  verify(): AssertionReport;
}
```

#### Interfaces

```typescript
interface Milestone {
  context: string;              // Function/location name
  optional?: boolean;           // Can be skipped
  matcher?: {
    message?: string | RegExp;  // Expected message pattern
    data?: Record<string, any>; // Expected data fields
    category?: LogCategory;     // Expected log category
  };
}

interface MilestoneResult {
  milestone: Milestone;
  reached: boolean;
  log?: LogEntry;               // Matching log if reached
  reason?: string;              // Failure reason if not reached
  timestamp?: number;           // When milestone was reached
}

interface AssertionReport {
  pathway: LogPathway;
  passed: boolean;
  totalMilestones: number;
  reachedMilestones: number;
  timeline: MilestoneResult[];  // Chronological results
  failedAtIndex?: number;       // First failure index
  executionTime: number;        // Total time (ms)
  suggestions: string[];        // Fix suggestions
  capturedLogs: LogEntry[];     // All pathway logs
}
```

#### Usage Examples

**Basic Pathway Test**:
```typescript
const asserter = new PathwayAsserter(LogPathway.DATA_INGESTION)
  .expectMilestone('fetchEvents')
  .expectMilestone('processEvents')
  .expectMilestone('cacheEvents')
  .verify();

expect(asserter).toCompletePathway();
```

**With Message Matchers**:
```typescript
const asserter = new PathwayAsserter(LogPathway.FILTER_APPLY)
  .expectMilestone('applyFilters', {
    message: /Filtering \d+ events/i
  })
  .expectMilestone('renderFiltered', {
    message: /Rendering \d+ events/i,
    category: LogCategory.VISUALIZATION
  });
```

**With Optional Milestones**:
```typescript
const asserter = new PathwayAsserter(LogPathway.DATA_INGESTION)
  .expectMilestone('fetchEvents')
  .expectOptionalMilestone('cacheHit')  // May skip if cache miss
  .expectMilestone('returnEvents');
```

---

### PathwayDebugger

**Purpose**: AI-assisted failure analysis with hypothesis generation

**File**: `tests/utils/PathwayDebugger.ts`

#### Class Definition

```typescript
class PathwayDebugger {
  constructor(report: AssertionReport);

  /**
   * Generate complete debugging analysis
   */
  analyzeFailure(): DebugAnalysis;

  /**
   * Format analysis for AI agent consumption
   */
  formatForAI(): string;

  /**
   * Format analysis for human developers
   */
  formatForHuman(): string;

  /**
   * Export analysis as JSON
   */
  exportJSON(): string;
}
```

#### Interfaces

```typescript
interface Hypothesis {
  confidence: number;           // 0-100
  category: 'data-flow' | 'state' | 'timing' | 'configuration' | 'logic' | 'external';
  description: string;
  evidence: string[];
  suggestedFix?: string;
  codeLocations?: CodeLocation[];
}

interface CodeLocation {
  file: string;
  function?: string;
  line?: number;
  reason: string;
}

interface ChecklistItem {
  category: 'verify' | 'check' | 'test' | 'review';
  description: string;
  priority: 'high' | 'medium' | 'low';
  automated?: boolean;
}

interface DebugAnalysis {
  pathway: string;
  status: 'failed' | 'partial' | 'timeout';
  summary: string;
  failurePoint: {
    milestone: string;
    reason: string;
    index: number;
  };
  hypotheses: Hypothesis[];      // Sorted by confidence
  checklist: ChecklistItem[];
  relatedCode: CodeLocation[];
  logAnalysis: {
    totalLogs: number;
    errorCount: number;
    warningCount: number;
    suspiciousPatterns: string[];
    timeline: string[];
  };
  aiContext: {
    lastSuccessfulMilestone?: string;
    failedMilestone: string;
    timeBetween?: number;
    dataFlow: string[];
    stateChanges: string[];
  };
}
```

#### Usage Example

```typescript
const asserter = new PathwayAsserter(LogPathway.DATA_INGESTION)
  .expectMilestone('fetchEvents')
  .expectMilestone('processEvents');

asserter.setCapturedLogs(getLogCapture().getLogs());
const result = asserter.verify();

if (!result.passed) {
  const debugger = new PathwayDebugger(result);
  const analysis = debugger.analyzeFailure();

  console.log(debugger.formatForHuman());

  // Top hypothesis
  console.log(`Most likely cause (${analysis.hypotheses[0].confidence}%): ${analysis.hypotheses[0].description}`);

  // Suggested fix
  console.log(`Fix: ${analysis.hypotheses[0].suggestedFix}`);
}
```

**AI-Formatted Output**:
```
=== PATHWAY FAILURE ANALYSIS ===

Pathway: DATA_INGESTION
Status: failed at milestone 2 of 3 (66% complete)

FAILURE POINT:
  Milestone: processEvents
  Reason: Expected log not found in captured logs
  Timeline Position: After 'fetchEvents', before 'cacheEvents'

HYPOTHESES (sorted by confidence):

[95%] DATA-FLOW: Events not reaching processor
  Evidence:
    - fetchEvents completed successfully (100 events)
    - No logs from processEvents function
    - No errors logged
  Suggested Fix: Check if processEvents is being called after fetchEvents
  Code Locations:
    - src/orchestration/DataOrchestrator.ts:fetchEvents (line 148)
    - src/orchestration/DataOrchestrator.ts:processEvents (line 156)

[60%] CONFIGURATION: Logging disabled for processor
  Evidence:
    - Other milestones logged successfully
    - Specific function missing logs
  Suggested Fix: Verify LogPathway.DATA_INGESTION is used in processEvents

DEBUGGING CHECKLIST:
  [HIGH] Verify processEvents function is called after fetchEvents
  [HIGH] Check if processEvents has LogPathway.DATA_INGESTION log statements
  [MEDIUM] Review error handling that might skip processEvents
  [LOW] Check if conditional logic bypasses processEvents

LOG ANALYSIS:
  Total logs captured: 15
  Errors: 0
  Warnings: 0
  Suspicious patterns:
    - Gap of 250ms between fetchEvents and next log (expected ~50ms)

AI CONTEXT:
  Last successful: fetchEvents
  Failed: processEvents
  Time between: 250ms
  Data flow: fetchEvents (100 events) → ??? → (no output)
```

---

### LogCapture

**Purpose**: Test-mode logger interceptor for capturing pathway logs

**File**: `tests/utils/LogCapture.ts`

#### Class Definition

```typescript
class LogCapture {
  static getInstance(): LogCapture;

  /**
   * Enable log capture for specific pathway
   */
  enable(pathwayFilter?: LogPathway): void;

  /**
   * Disable log capture
   */
  disable(): void;

  /**
   * Clear all captured logs
   */
  clear(): void;

  /**
   * Check if capture is enabled
   */
  isEnabled(): boolean;

  /**
   * Capture a log entry (called by Logger in test mode)
   */
  capture(
    level: LogLevel,
    category: LogCategory,
    message: string,
    context?: string,
    data?: any,
    pathway?: LogPathway
  ): void;

  /**
   * Get all captured logs
   */
  getLogs(): LogEntry[];

  /**
   * Get logs for specific pathway
   */
  getLogsForPathway(pathway: LogPathway): LogEntry[];

  /**
   * Get log summary statistics
   */
  getSummary(): LogSummary;
}

interface LogSummary {
  total: number;
  errors: number;
  warnings: number;
  byLevel: Record<string, number>;
  byCategory: Record<string, number>;
  byPathway: Record<string, number>;
}
```

#### Usage Example

```typescript
import { getLogCapture } from '../../utils/LogCapture';
import { LogPathway } from '../../../src/utils/Logger';

beforeEach(() => {
  getLogCapture().clear();
  getLogCapture().enable(LogPathway.DATA_INGESTION);
});

it('should log all milestones', () => {
  // ... run test code ...

  const logs = getLogCapture().getLogsForPathway(LogPathway.DATA_INGESTION);
  expect(logs.length).toBeGreaterThan(0);

  // Check for specific log
  const fetchLog = logs.find(log => log.context === 'fetchEvents');
  expect(fetchLog).toBeDefined();
  expect(fetchLog?.message).toMatch(/Fetching.*events/);
});
```

---

### Custom Matchers

**Purpose**: Jest custom matchers for pathway assertions

**File**: `tests/utils/pathway-matchers.ts`

#### Available Matchers

```typescript
expect.extend({
  /**
   * Assert pathway completed successfully
   */
  toCompletePathway(asserter: PathwayAsserter): MatcherResult;

  /**
   * Assert specific milestone was reached
   */
  toReachMilestone(asserter: PathwayAsserter, context: string): MatcherResult;

  /**
   * Assert pathway completed within time budget
   */
  toCompleteWithin(asserter: PathwayAsserter, maxMs: number): MatcherResult;

  /**
   * Assert no errors logged during pathway
   */
  toHaveNoErrors(asserter: PathwayAsserter): MatcherResult;

  /**
   * Assert specific number of milestones reached
   */
  toReachMilestones(asserter: PathwayAsserter, count: number): MatcherResult;
});
```

#### Usage Examples

```typescript
const asserter = new PathwayAsserter(LogPathway.DATA_INGESTION)
  .expectMilestone('fetchEvents')
  .expectMilestone('processEvents');

asserter.setCapturedLogs(getLogCapture().getLogs());
asserter.verify();

// Custom matchers
expect(asserter).toCompletePathway();
expect(asserter).toReachMilestone('fetchEvents');
expect(asserter).toCompleteWithin(1000);  // 1 second
expect(asserter).toHaveNoErrors();
expect(asserter).toReachMilestones(2);
```

---

## Test Utilities

### Setup Functions

**File**: `tests/setup/pathway-setup.ts`

```typescript
/**
 * Initialize pathway testing infrastructure
 * (Auto-called when imported)
 */
function setupPathwayTesting(): void;

/**
 * Enable log capture for specific pathway
 */
function capturePathway(pathway: LogPathway): void;

/**
 * Get logs for analysis
 */
function getPathwayLogs(pathway?: LogPathway): LogEntry[];

/**
 * Print pathway log summary (debugging)
 */
function printLogSummary(): void;

/**
 * Create test data snapshot for debugging
 */
function createPathwaySnapshot(
  pathway: LogPathway,
  additionalContext?: any
): PathwaySnapshot;

/**
 * Wait for specific log to appear (async tests)
 */
async function waitForLog(
  context: string,
  pathway?: LogPathway,
  timeoutMs?: number
): Promise<boolean>;
```

### Test Fixtures

**File**: `tests/fixtures/canonical-event-factory.ts`

```typescript
/**
 * Create test CanonicalEvent with sensible defaults
 */
function createCanonicalEvent(overrides?: Partial<CanonicalEvent>): CanonicalEvent;

/**
 * Create multiple test events
 */
function createCanonicalEvents(count: number, overrides?: Partial<CanonicalEvent>): CanonicalEvent[];

/**
 * Create event with specific type
 */
function createCommitEvent(overrides?: Partial<CanonicalEvent>): CanonicalEvent;
function createMergeEvent(overrides?: Partial<CanonicalEvent>): CanonicalEvent;
function createReleaseEvent(overrides?: Partial<CanonicalEvent>): CanonicalEvent;
function createPREvent(overrides?: Partial<CanonicalEvent>): CanonicalEvent;
```

---

## Writing Pathway Tests

### Test Structure Template

```typescript
/**
 * [PATHWAY_NAME] Pathway - [Unit/Integration/Performance] Tests
 *
 * Tests [brief description of flow]:
 * [Component A] → [Component B] → [Component C]
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PathwayAsserter } from '../../utils/PathwayAsserter';
import { PathwayDebugger } from '../../utils/PathwayDebugger';
import { getLogCapture } from '../../utils/LogCapture';
import { LogPathway } from '../../../src/utils/Logger';

describe('[PATHWAY_NAME] Pathway - [Test Type]', () => {
    beforeEach(() => {
        getLogCapture().clear();
        getLogCapture().enable(LogPathway.[PATHWAY_NAME]);
    });

    it('should [test description]', async () => {
        // 1. Define expected pathway
        const asserter = new PathwayAsserter(LogPathway.[PATHWAY_NAME])
            .expectMilestone('[context1]', { message: /pattern/ })
            .expectMilestone('[context2]')
            .expectOptionalMilestone('[context3]');

        // 2. Execute code under test
        // ... perform actions that trigger pathway ...

        // 3. Verify pathway
        asserter.setCapturedLogs(getLogCapture().getLogs());
        const result = asserter.verify();

        // 4. Debug on failure
        if (!result.passed) {
            const debugger = new PathwayDebugger(result);
            console.log(debugger.formatForAI());
        }

        // 5. Assert success
        expect(result.passed).toBe(true);

        // 6. Additional assertions
        // ... assert on output, state, etc. ...
    });
});
```

### Best Practices

1. **One pathway per test**: Focus on single flow for clarity
2. **Use meaningful milestone names**: Match function/method names in code
3. **Add message matchers for critical logs**: Verify important data flows
4. **Mark caching/optimization as optional**: Allows different code paths
5. **Always include debugger on failure**: Enables AI-assisted fixing
6. **Test both happy and error paths**: Use separate test files for errors
7. **Set performance budgets**: Use `toCompleteWithin` for critical paths
8. **Clear logs before each test**: Prevent cross-test contamination

### Naming Conventions

**Test Files**:
- Unit tests: `tests/pathways/unit/[component]-[pathway].pathway.test.ts`
- Integration tests: `tests/pathways/integration/[pathway].pathway.test.ts`
- Performance tests: `tests/pathways/performance/[pathway]-performance.pathway.test.ts`
- Error tests: `tests/pathways/integration/[pathway]-errors.pathway.test.ts`

**Test Names**:
- `should [action] [expected outcome]`
- `should handle [error scenario] gracefully`
- `should complete [pathway] within [time] budget`

**Milestones**:
- Use actual function names: `ClassName.methodName`
- Be specific: `fetchEvents` not just `fetch`
- Include class prefix for clarity: `DataOrchestrator.getEvents`

---

## Performance Budgets

### Render Pipeline

| Dataset Size | Budget | Percentile |
|--------------|--------|------------|
| < 100 events | 50ms | p95 |
| 100-500 events | 200ms | p95 |
| 500-1000 events | 500ms | p95 |
| Animation frame | 16.6ms | p99 (60 FPS) |

### Data Ingestion

| Operation | Budget | Percentile |
|-----------|--------|------------|
| Git extraction (100 commits) | 500ms | p95 |
| Git extraction (1000 commits) | 2000ms | p95 |
| Provider fetch | 1000ms | p95 |
| Cache lookup | 10ms | p99 |

### Filter Application

| Operation | Budget | Percentile |
|-----------|--------|------------|
| Filter 1000 events | 50ms | p95 |
| State update | 10ms | p99 |
| UI re-render | 100ms | p95 |

### Example Performance Test

```typescript
it('should complete render within performance budget for large datasets', () => {
    const events = createCanonicalEvents(1000);

    const asserter = new PathwayAsserter(LogPathway.RENDER_PIPELINE)
        .expectMilestone('TimelineDataManager.processTimelineData')
        .expectMilestone('D3TimelineRenderer.render')
        .expectMilestone('EventRenderer.renderEvents');

    const startTime = Date.now();

    // Render 1000 events
    renderer.render(events);

    const duration = Date.now() - startTime;

    asserter.setCapturedLogs(getLogCapture().getLogs());
    const result = asserter.verify();

    expect(result.passed).toBe(true);
    expect(duration).toBeLessThan(500);  // Budget: < 500ms
});
```

---

## AI-Assisted Debugging

### How AI Agents Use Pathway Tests

1. **Failure Detection**: PathwayDebugger generates structured analysis
2. **Hypothesis Generation**: Ranked by confidence with evidence
3. **Code Location Identification**: Exact files/functions to investigate
4. **Fix Suggestions**: Actionable steps to resolve issue
5. **Validation**: Re-run pathway test to confirm fix

### Example AI Workflow

```typescript
// Test fails
const result = asserter.verify();

if (!result.passed) {
  const debugger = new PathwayDebugger(result);
  const analysis = debugger.analyzeFailure();

  // AI Agent consumes analysis
  const aiPrompt = `
    Fix pathway test failure:

    ${debugger.formatForAI()}

    Review these files:
    ${analysis.relatedCode.map(loc => `- ${loc.file}:${loc.line} (${loc.reason})`).join('\n')}

    Top hypothesis (${analysis.hypotheses[0].confidence}%):
    ${analysis.hypotheses[0].description}

    Suggested fix:
    ${analysis.hypotheses[0].suggestedFix}
  `;

  // AI agent applies fix...

  // Re-run test to validate
  const newResult = asserter.verify();
  expect(newResult.passed).toBe(true);
}
```

### PathwayDebugger Output Format

**For AI Agents** (`formatForAI()`):
- Structured text format with clear sections
- Confidence scores for prioritization
- Code locations with line numbers
- Evidence lists for validation
- Suggested fixes with context

**For Humans** (`formatForHuman()`):
- Color-coded output
- Visual timeline
- Summary statistics
- Quick action items
- Copy-paste fixes

**For Export** (`exportJSON()`):
- Full structured data
- Machine-readable
- Integration with CI/CD
- Historical tracking

---

## Test Organization

### Directory Structure

```
tests/
├── fixtures/
│   ├── canonical-event-factory.ts
│   └── test-repositories.ts
├── pathways/
│   ├── generated/              # Auto-generated baseline tests
│   │   ├── data-ingestion.pathway.test.ts
│   │   ├── filter-apply.pathway.test.ts
│   │   └── render-pipeline.pathway.test.ts
│   ├── integration/            # Integration pathway tests
│   │   ├── data-ingestion.pathway.test.ts
│   │   ├── filter-interaction.pathway.test.ts
│   │   ├── filter-apply-errors.pathway.test.ts
│   │   ├── user-interaction.pathway.test.ts
│   │   ├── webview-messaging.pathway.test.ts
│   │   └── render-pipeline.pathway.test.ts
│   ├── performance/            # Performance validation tests
│   │   └── render-performance.pathway.test.ts
│   └── unit/                   # Unit-level pathway tests
│       ├── logger-pathway.test.ts
│       ├── git-event-repository.pathway.test.ts
│       ├── filter-controller.pathway.test.ts
│       ├── data-orchestrator.pathway.test.ts
│       ├── filter-state-manager.pathway.test.ts
│       ├── config-sync.pathway.test.ts
│       └── range-selector.pathway.test.ts
├── setup/
│   └── pathway-setup.ts        # Global test setup
└── utils/
    ├── LogCapture.ts           # Log interceptor
    ├── PathwayAsserter.ts      # Assertion API
    ├── PathwayDebugger.ts      # Failure analysis
    └── pathway-matchers.ts     # Jest custom matchers
```

### Test Statistics

| Category | Tests | Pass Rate |
|----------|-------|-----------|
| Unit Tests | 30 | 100% |
| Integration Tests | 46 | 96% |
| Performance Tests | 11 | 100% |
| Error Scenarios | 16 | 100% |
| Generated Tests | 46 | 96% |
| **Total** | **149** | **97%+** |

---

## Version History

- **v0.4.66** - Current version with 149 tests across 8 pathways
- **v0.4.50** - Added GitHub provider integration tests (Phase 3 completion)
- **v0.4.30** - Added performance tests with budgets (Phase 3)
- **v0.4.10** - Added integration tests for all pathways (Phase 2)
- **v0.3.90** - Initial pathway testing infrastructure (Phase 1)

---

This pathway testing API documentation provides a complete reference for writing, executing, and debugging pathway tests in the Repository Timeline Extension. For more information on the testing philosophy, see `PATHWAY_TESTING_ARTICLE.md`.
