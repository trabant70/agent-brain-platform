# Pathway Testing Guide

Complete guide to pathway-based testing for the Repository Timeline Extension.

## Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Getting Started](#getting-started)
4. [Writing Pathway Tests](#writing-pathway-tests)
5. [Debugging Failed Tests](#debugging-failed-tests)
6. [Agent-Brain Integration](#agent-brain-integration)
7. [Best Practices](#best-practices)
8. [API Reference](#api-reference)

## Overview

Pathway testing is a novel approach that verifies end-to-end data flows by asserting on **log emission milestones** rather than just final outcomes. This provides:

- **Exact failure location** - Know which step in the data flow failed
- **AI-debuggable context** - Structured output for automated debugging
- **Hypothesis generation** - Confidence-scored theories about failure causes
- **Architecture validation** - Tests verify the actual execution path matches design

### Traditional vs Pathway Testing

**Traditional Testing:**
```typescript
// ❌ Only tells you if it works, not where it failed
it('should load data', async () => {
    const data = await loadData();
    expect(data).toBeDefined();
    expect(data.length).toBeGreaterThan(0);
});
```

**Pathway Testing:**
```typescript
// ✅ Tells you exactly where in the flow it failed
it('should complete data ingestion pathway', async () => {
    const asserter = createDataIngestionPathway();

    await loadData();

    asserter.setCapturedLogs(getLogCapture().getLogs());
    const result = asserter.verify();

    // If failed, get AI-debuggable analysis
    if (!result.passed) {
        const pathwayDebugger = new PathwayDebugger(result);
        console.log(pathwayDebugger.formatForAI());
    }

    expect(asserter).toCompletePathway();
});
```

## Core Concepts

### 1. Pathways

A **pathway** is an end-to-end data flow through the system. The extension has 8 core pathways:

| Pathway | Flow |
|---------|------|
| `DATA_INGESTION` | Git Provider → Orchestrator → Webview → Render |
| `FILTER_APPLY` | Filter UI → State → Data Refresh → Re-render |
| `STATE_PERSIST` | State Change → Save → Restore → Apply |
| `RENDER_PIPELINE` | Data → D3 Scales → SVG → DOM |
| `USER_INTERACTION` | User Event → Handler → State → UI Update |
| `WEBVIEW_MESSAGING` | Extension ↔ Webview postMessage |
| `CONFIG_SYNC` | Config Change → State → UI Updates |
| `RANGE_SELECTOR` | Slider → Brush → Viewport → Re-render |

### 2. Milestones

A **milestone** is a specific point in a pathway marked by a log emission:

```typescript
logger.debug(LogCategory.DATA,
    'Fetching git events',
    'GitDataProvider.fetchEvents',  // ← Milestone context
    { repoPath },
    LogPathway.DATA_INGESTION       // ← Pathway tag
);
```

### 3. PathwayAsserter

The `PathwayAsserter` class verifies that expected milestones are reached:

```typescript
const asserter = new PathwayAsserter(LogPathway.DATA_INGESTION)
    .expectMilestone('extension.activate', {
        message: /Extension.*activated/i
    })
    .expectMilestone('DataOrchestrator.getEvents')
    .expectMilestone('GitDataProvider.fetchEvents')
    .expectOptionalMilestone('CacheManager.checkCache');
```

### 4. PathwayDebugger

The `PathwayDebugger` analyzes failures and generates AI-debuggable context:

```typescript
const pathwayDebugger = new PathwayDebugger(result);
const analysis = pathwayDebugger.analyzeFailure();

// Generates:
// - Hypotheses with confidence scores
// - Debugging checklist
// - Related code locations
// - Log pattern analysis
// - AI context for Agent-Brain
```

## Getting Started

### Installation

Pathway testing is already set up in the project. No additional installation needed.

### Running Pathway Tests

```bash
# Run all pathway tests
npm test -- pathways/generated

# Run specific pathway
npm test -- pathways/generated/data-ingestion.pathway.test.ts

# Run with coverage
npm run test:coverage -- pathways

# Run in watch mode
npm run test:watch -- pathways
```

### Viewing Results

```bash
# Show summary
npm run debug-pathway -- --summary

# Debug latest failure
npm run debug-pathway -- --latest

# Debug all failures
npm run debug-pathway -- --all

# Debug specific pathway
npm run debug-pathway -- --pathway DATA_INGESTION
```

## Writing Pathway Tests

### Step 1: Define the Pathway

Create a pathway definition (or use existing ones):

```typescript
// tests/pathways/definitions/my-feature.pathway.ts
import { PathwayAsserter } from '../../utils/PathwayAsserter';
import { LogPathway, LogCategory } from '../../../src/utils/Logger';

export function createMyFeaturePathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.USER_INTERACTION)
        .expectMilestone('MyFeature.initialize', {
            message: /Initializing feature/i,
            category: LogCategory.UI
        })
        .expectMilestone('MyFeature.loadData')
        .expectMilestone('MyFeature.render')
        .expectOptionalMilestone('MyFeature.cache');
}
```

### Step 2: Write the Test

```typescript
// tests/pathways/generated/my-feature.pathway.test.ts
import { describe, it, expect, beforeEach } from '@jest/globals';
import { getLogCapture } from '../../utils/LogCapture';
import { PathwayDebugger } from '../../utils/PathwayDebugger';
import { createMyFeaturePathway } from '../definitions/my-feature.pathway';
import { LogPathway } from '../../../src/utils/Logger';

describe('MY_FEATURE Pathway', () => {
    beforeEach(() => {
        const logCapture = getLogCapture();
        logCapture.clear();
        logCapture.enable(LogPathway.USER_INTERACTION);
    });

    it('should complete feature pathway', async () => {
        const asserter = createMyFeaturePathway();

        // Execute the feature flow
        const feature = new MyFeature();
        await feature.initialize();
        await feature.loadData();
        await feature.render();

        // Verify pathway
        asserter.setCapturedLogs(getLogCapture().getLogs());
        const result = asserter.verify();

        // Debug on failure
        if (!result.passed) {
            const pathwayDebugger = new PathwayDebugger(result);
            console.log('\n=== FAILURE ANALYSIS ===');
            console.log(pathwayDebugger.formatForAI());
            console.log('\n=== AGENT-BRAIN JSON ===');
            console.log(pathwayDebugger.toJSON());
        }

        expect(asserter).toCompletePathway();
    });
});
```

### Step 3: Add Logging to Code

Ensure your code emits logs at the expected milestones:

```typescript
// src/features/MyFeature.ts
import { logger, LogCategory, LogPathway } from '../utils/Logger';

export class MyFeature {
    async initialize() {
        logger.debug(
            LogCategory.UI,
            'Initializing feature',
            'MyFeature.initialize',
            undefined,
            LogPathway.USER_INTERACTION
        );

        // Implementation...
    }

    async loadData() {
        logger.debug(
            LogCategory.DATA,
            'Loading feature data',
            'MyFeature.loadData',
            undefined,
            LogPathway.USER_INTERACTION
        );

        // Implementation...
    }

    async render() {
        logger.debug(
            LogCategory.VISUALIZATION,
            'Rendering feature UI',
            'MyFeature.render',
            undefined,
            LogPathway.USER_INTERACTION
        );

        // Implementation...
    }
}
```

## Debugging Failed Tests

### Using the CLI Debugger

```bash
# Debug latest failure
npm run debug-pathway -- --latest
```

Output:
```
=== LATEST PATHWAY FAILURE ===

Pathway: DATA_INGESTION
Status: partial

FAILURE POINT:
  handleTimelineData (index 6)
  Reason: Context 'handleTimelineData' never logged

SUMMARY:
  Pathway failed at 'handleTimelineData' after successfully
  completing 'extension.sendToWebview'. 6/10 milestones reached.

TOP HYPOTHESES:

1. [80% confidence] DATA-FLOW
   Data not flowing correctly through the pipeline
   Evidence:
     - Expected data at: handleTimelineData
     - Last data log: Sending data to webview
   💡 Suggested Fix: Verify data is being passed correctly
      from extension.sendToWebview to handleTimelineData

2. [75% confidence] TIMING
   Large time gap suggests async operation issue
   Evidence:
     - 1250ms elapsed between last success and failure
     - May indicate promise not resolving
   💡 Suggested Fix: Check for missing await keywords

DEBUGGING CHECKLIST:
  [HIGH] verify: Verify handleTimelineData function is called
  [HIGH] check: Confirm log statement exists
  [HIGH] test: Test data flow from sendToWebview to handleTimelineData

RELATED CODE:
  📁 src/webview/main.ts::handleTimelineData
     Failed milestone - log not emitted here
  📁 src/extension.ts::sendToWebview
     Last successful - check data flow from here
```

### Custom Matchers

```typescript
// Assert pathway completes
expect(asserter).toCompletePathway();

// Assert specific milestone reached
expect(asserter).toReachMilestone(3);

// Assert pathway fails at specific milestone
expect(asserter).toFailAtMilestone(2);

// Assert pathway has errors
expect(asserter).toHavePathwayErrors();

// Assert completion time
expect(asserter).toCompleteWithinTime(1000);
```

## Agent-Brain Integration

### JSON Output Format

Failed tests automatically generate JSON for Agent-Brain webhook:

```json
{
  "pathway": "DATA_INGESTION",
  "status": "failed",
  "summary": "Pathway failed at 'handleTimelineData'...",
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
  "relatedCode": [...],
  "logAnalysis": {...},
  "aiContext": {...}
}
```

### Webhook Integration

```bash
# Export for webhook
npm run debug-pathway -- --latest --json > failure.json

# Post to Agent-Brain (example)
curl -X POST https://agent-brain.io/analyze \
  -H "Content-Type: application/json" \
  -d @failure.json
```

### AI-Driven Fix Loop

1. **Test fails** → PathwayDebugger generates analysis
2. **Analysis → Agent-Brain** → AI analyzes hypotheses
3. **Agent-Brain → Code fix** → Suggests specific changes
4. **Apply fix** → Re-run test
5. **Repeat** until test passes

## Best Practices

### 1. Milestone Granularity

**✅ Good - High-level milestones:**
```typescript
.expectMilestone('DataOrchestrator.getEvents')
.expectMilestone('GitDataProvider.fetchEvents')
.expectMilestone('webview.handleData')
```

**❌ Bad - Too granular:**
```typescript
.expectMilestone('validateInput')
.expectMilestone('checkCache')
.expectMilestone('parseResponse')
.expectMilestone('transformData')
// ... 20 more milestones
```

### 2. Optional Milestones

Use for conditional flows:

```typescript
.expectMilestone('loadData')
.expectOptionalMilestone('checkCache')  // Only if caching enabled
.expectMilestone('processData')
```

### 3. Matcher Specificity

**Flexible (recommended):**
```typescript
.expectMilestone('fetchEvents', {
    message: /Fetching.*events/i
})
```

**Strict (brittle):**
```typescript
.expectMilestone('fetchEvents', {
    message: 'Fetching events for repository /path/to/repo',
    data: { repoPath: '/exact/path' }
})
```

### 4. Pathway Variants

Create variants for different scenarios:

```typescript
export function createBasicPathway() { ... }
export function createWithCachingPathway() { ... }
export function createErrorHandlingPathway() { ... }
```

## API Reference

### PathwayAsserter

```typescript
class PathwayAsserter {
    constructor(pathway: LogPathway)

    expectMilestone(
        context: string,
        matcher?: {
            message?: string | RegExp;
            data?: Record<string, any>;
            category?: LogCategory;
        }
    ): this

    expectOptionalMilestone(context: string, matcher?): this

    setCapturedLogs(logs: LogEntry[]): void

    verify(): AssertionReport

    getResult(): AssertionReport | undefined

    getFailureReport(): string

    toJSON(): string
}
```

### PathwayDebugger

```typescript
class PathwayDebugger {
    constructor(report: AssertionReport)

    analyzeFailure(): DebugAnalysis

    formatForAI(): string

    toJSON(): string
}
```

### LogCapture

```typescript
class LogCapture {
    static getInstance(): LogCapture

    enable(pathwayFilter?: LogPathway): void
    disable(): void
    clear(): void

    getLogs(): LogEntry[]
    getLogsForPathway(pathway: LogPathway): LogEntry[]
    getLogsForContext(context: string): LogEntry[]

    getSummary(): {...}
    toJSON(): string
}
```

### Custom Matchers

```typescript
expect(asserter: PathwayAsserter).toCompletePathway()
expect(asserter: PathwayAsserter).toReachMilestone(index: number)
expect(asserter: PathwayAsserter).toFailAtMilestone(index: number)
expect(asserter: PathwayAsserter).toHavePathwayErrors()
expect(asserter: PathwayAsserter).toCompleteWithinTime(maxMs: number)
```

## Troubleshooting

### Test Always Fails at First Milestone

**Cause:** Logger not in test mode or logs not being captured.

**Fix:**
```typescript
// Ensure setup runs
import '../../setup/pathway-setup';

beforeEach(() => {
    getLogCapture().enable(LogPathway.YOUR_PATHWAY);
});
```

### Logs Not Captured

**Cause:** Pathway parameter missing from log call.

**Fix:**
```typescript
// ❌ Missing pathway
logger.debug(LogCategory.DATA, 'Fetching', 'fetch');

// ✅ Include pathway
logger.debug(LogCategory.DATA, 'Fetching', 'fetch',
    undefined, LogPathway.DATA_INGESTION);
```

### Milestone Never Matched

**Cause:** Context string doesn't match exactly.

**Fix:**
```typescript
// Pathway expects:
.expectMilestone('MyClass.myMethod')

// Code must log:
logger.debug(..., 'MyClass.myMethod')  // Exact match
```

---

**Happy Pathway Testing! 🚀**

For questions or issues, see [ARCHITECTURE.md](./ARCHITECTURE.md) or create an issue.
