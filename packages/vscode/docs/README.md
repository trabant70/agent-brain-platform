# Agent Brain Platform - VSCode Extension Documentation

## Overview

This is the unified VSCode extension for the Agent Brain Platform, providing timeline visualization with pathway testing for AI-assisted development.

## Documentation Index

### User Documentation
- **[INSTALL.md](../INSTALL.md)** - Installation and testing guide for the extension

### Testing Documentation

#### Pathway Testing (Advanced)
The extension uses a revolutionary **pathway-based testing** system that verifies end-to-end data flows by asserting on log emission milestones.

📚 **Pathway Testing Guides:**
- **[PATHWAY_TESTING_GUIDE.md](./pathway-testing/PATHWAY_TESTING_GUIDE.md)** - Complete guide to pathway testing (START HERE)
- **[PATHWAY_TESTING_API.md](./pathway-testing/PATHWAY_TESTING_API.md)** - API reference for all 8 pathways
- **[PATHWAY_TESTING_IMPLEMENTATION.md](./pathway-testing/PATHWAY_TESTING_IMPLEMENTATION.md)** - Implementation summary and phases
- **[PATHWAY_TESTING_ARTICLE.md](./pathway-testing/PATHWAY_TESTING_ARTICLE.md)** - Deep dive article on the approach
- **[PATHWAY_TESTING_EXECUTION_STRATEGIES.md](./pathway-testing/PATHWAY_TESTING_EXECUTION_STRATEGIES.md)** - Test execution strategies
- **[PATHWAY_OPTIMIZATION_HEURISTICS.md](./pathway-testing/PATHWAY_OPTIMIZATION_HEURISTICS.md)** - Performance optimization guide

## Quick Start - Running Tests

```bash
# Run all tests
npm test

# Run pathway tests only
npm run test:pathway

# Run specific pathway category
npm run test:pathway:unit          # Unit pathway tests
npm run test:pathway:integration   # Integration pathway tests
npm run test:pathway:performance   # Performance pathway tests

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## What is Pathway Testing?

Unlike traditional unit tests that check final output, **pathway tests verify the journey** through the code by asserting on log emissions at critical milestones.

### Benefits
- ✅ **Exact failure location** - Know which step in the data flow failed
- ✅ **AI-debuggable** - Structured output for automated debugging
- ✅ **Self-evolving** - Tests get more precise as code matures
- ✅ **Flow-oriented** - Tests verify entire pathways, not just units
- ✅ **Minimal mocking** - Tests use real code paths

### The 8 Core Pathways

1. **DATA_INGESTION** - Git → Orchestrator → Webview → Render
2. **FILTER_APPLY** - Filter UI → State → Data Refresh → Re-render
3. **STATE_PERSIST** - State Change → Save → Restore → Apply
4. **RENDER_PIPELINE** - Data → D3 Scales → SVG → DOM
5. **USER_INTERACTION** - User Event → Handler → State → UI Update
6. **WEBVIEW_MESSAGING** - Extension ↔ Webview postMessage
7. **CONFIG_SYNC** - Config Change → State → UI Updates
8. **RANGE_SELECTOR** - Slider → Brush → Viewport → Re-render

## Test Structure

```
tests/
├── pathways/
│   ├── definitions/        # Pathway DSL definitions (8 files)
│   ├── generated/          # Auto-generated pathway tests (3 files)
│   ├── integration/        # Integration pathway tests (6 files)
│   ├── unit/               # Unit pathway tests (7 files)
│   └── performance/        # Performance pathway tests (2 files)
├── setup/                  # Test configuration
│   ├── jest.setup.ts
│   ├── pathway-setup.ts
│   └── pathway-integration-setup.ts
├── mocks/                  # VSCode API mocks
├── fixtures/               # Test data factories
└── utils/                  # Test utilities
    ├── PathwayAsserter.ts   # Core pathway assertion engine
    ├── PathwayDebugger.ts   # AI-assisted failure analysis
    ├── PathwayReporter.ts   # Custom Jest reporter
    ├── LogCapture.ts        # Log interception for testing
    └── pathway-matchers.ts  # Custom Jest matchers
```

## Example Pathway Test

```typescript
import { createDataIngestionPathway } from '../definitions/data-ingestion.pathway';
import { getLogCapture } from '../../utils/LogCapture';
import { PathwayDebugger } from '../../utils/PathwayDebugger';

it('should complete data ingestion pathway', async () => {
    const asserter = createDataIngestionPathway();

    // Execute the flow
    await orchestrator.getEvents(repoPath);

    // Verify pathway milestones
    asserter.setCapturedLogs(getLogCapture().getLogs());
    const result = asserter.verify();

    // AI-assisted debugging on failure
    if (!result.passed) {
        const debugger = new PathwayDebugger(result);
        console.log(debugger.formatForAI());  // Human-readable
        console.log(debugger.toJSON());       // Agent-Brain JSON
    }

    expect(asserter).toCompletePathway();
});
```

## Contributing

When adding new features, ensure you:
1. Add appropriate log milestones with `LogPathway` tags
2. Update or create pathway definitions
3. Write pathway tests for new data flows
4. Run `npm run test:pathway` before committing

## Migration Status

✅ **Pathway Testing Fully Migrated** (2025-10-04)
- 26 pathway test files
- 8 pathway definitions
- All test utilities (PathwayAsserter, PathwayDebugger, LogCapture)
- 6 comprehensive documentation files
- Jest configuration with 6 test projects

---

For more information, see the [Pathway Testing Guide](./pathway-testing/PATHWAY_TESTING_GUIDE.md).
