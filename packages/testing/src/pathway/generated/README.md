# Pathway Tests

This directory contains generated pathway tests for all 8 core data flow pathways.

## Test Files

- **data-ingestion.pathway.test.ts** - Tests Git provider → Orchestrator → Webview → Render flow
- **filter-apply.pathway.test.ts** - Tests Filter UI → State → Data refresh → Re-render flow
- **state-persist.pathway.test.ts** - Tests State save/restore across sessions (TODO)
- **render-pipeline.pathway.test.ts** - Tests Data processing → D3 rendering → DOM updates
- **user-interaction.pathway.test.ts** - Tests User events → Handlers → UI updates (TODO)
- **webview-messaging.pathway.test.ts** - Tests Extension ↔ Webview communication (TODO)
- **config-sync.pathway.test.ts** - Tests Configuration changes → State → UI updates (TODO)
- **range-selector.pathway.test.ts** - Tests Time slider → Viewport → Re-render (TODO)

## Running Pathway Tests

```bash
# Run all pathway tests
npm test -- pathways/generated

# Run specific pathway
npm test -- pathways/generated/data-ingestion.pathway.test.ts

# Run with debug output
npm test -- pathways/generated --verbose
```

## Test Structure

Each pathway test follows this pattern:

```typescript
import { getLogCapture } from '../../utils/LogCapture';
import { PathwayDebugger } from '../../utils/PathwayDebugger';
import { createXxxPathway } from '../definitions/xxx.pathway';

describe('XXX_PATHWAY', () => {
    beforeEach(() => {
        const logCapture = getLogCapture();
        logCapture.clear();
        logCapture.enable(LogPathway.XXX);
    });

    it('should complete pathway', async () => {
        const asserter = createXxxPathway();

        // Execute the flow
        // ...

        // Capture logs and verify
        asserter.setCapturedLogs(getLogCapture().getLogs());
        const result = asserter.verify();

        // If failed, output AI-debuggable context
        if (!result.passed) {
            const debugger = new PathwayDebugger(result);
            console.log(debugger.formatForAI());
            console.log(debugger.toJSON());
        }

        expect(asserter).toCompletePathway();
    });
});
```

## AI-Assisted Debugging

When a pathway test fails, the PathwayDebugger automatically:

1. Identifies the exact failure point
2. Generates hypotheses about root cause (with confidence scores)
3. Creates a debugging checklist
4. Finds related code locations
5. Analyzes log patterns
6. Outputs JSON for Agent-Brain webhook consumption

Example output:

```
=== PATHWAY TEST FAILURE ANALYSIS ===

Pathway: DATA_INGESTION
Status: partial

FAILURE POINT:
  Milestone: handleTimelineData (index 6)
  Reason: Context 'handleTimelineData' never logged

TOP HYPOTHESES:
1. [80% confidence] DATA-FLOW
   Data not flowing correctly through the pipeline
   Evidence:
     - Data-related errors detected in logs
     - Expected data at: handleTimelineData
   Suggested Fix: Verify data is being passed correctly between components.

...
```

## Completing TODO Tests

The TODO test files need:

1. Import actual implementation modules
2. Execute the pathway flow (call functions, trigger events)
3. Mock external dependencies as needed
4. Add assertions specific to that pathway

Example completion:

```typescript
// Before (TODO)
it('should complete pathway', async () => {
    const asserter = createXxxPathway();
    // TODO: Execute flow
    asserter.setCapturedLogs(getLogCapture().getLogs());
    expect(asserter).toCompletePathway();
});

// After (Completed)
it('should complete pathway', async () => {
    const asserter = createXxxPathway();

    const orchestrator = new DataOrchestrator();
    const events = await orchestrator.getEvents();

    asserter.setCapturedLogs(getLogCapture().getLogs());
    expect(asserter).toCompletePathway();
});
```

## Integration with Agent-Brain

Failed tests automatically output JSON that the Agent-Brain webhook can consume:

```json
{
  "pathway": "DATA_INGESTION",
  "status": "failed",
  "failurePoint": {
    "milestone": "handleTimelineData",
    "reason": "Context never logged",
    "index": 6
  },
  "hypotheses": [...],
  "checklist": [...],
  "relatedCode": [...]
}
```

This enables the AI to:
- Understand exactly what failed
- Generate fix hypotheses
- Suggest code changes
- Learn from patterns over time
