# Pathway Testing Execution Strategies

**Problem:** How do we execute code to generate logs when testing requires VSCode + Webview environment?

**Version:** 0.4.66
**Date:** 2025-10-03

---

## The Dilemma

```
Pathway Tests Need:
1. Real code execution → Generates logs
2. Log capture → Verifies milestones
3. AI debugging → Analyzes failures

BUT:
- Extension code needs VSCode API
- Webview code needs browser context
- Full stack needs both running together
```

**Current TODOs in tests:**
```typescript
it('should complete pathway', async () => {
    const asserter = createDataIngestionPathway();

    // TODO: Execute actual data ingestion flow  ← How do we do this?

    asserter.setCapturedLogs(getLogCapture().getLogs());
    expect(asserter).toCompletePathway();
});
```

---

## Solution Architecture: Multi-Level Testing Strategy

**You're NOT in a corner** - you need a **layered approach**:

```
Level 1: Unit Tests (Mock execution)          ← Quick, isolated
Level 2: Integration Tests (Partial execution) ← Medium, component-level
Level 3: E2E Tests (Full execution)           ← Slow, complete stack
Level 4: Manual Tests (Real usage)            ← Development, debugging
```

---

## Level 1: Unit-Level Pathway Tests (Immediate Solution)

**Approach:** Test individual components in isolation with mocks

### Example: Testing DataOrchestrator

```typescript
// tests/pathways/generated/data-ingestion-unit.pathway.test.ts
import { describe, it, expect, beforeEach } from '@jest/globals';
import { getLogCapture } from '../../utils/LogCapture';
import { createMinimalDataIngestionPathway } from '../definitions';
import { DataOrchestrator } from '../../../src/orchestration/DataOrchestrator';
import { LogPathway } from '../../../src/utils/Logger';

describe('DATA_INGESTION Pathway - Unit Level', () => {
    let orchestrator: DataOrchestrator;

    beforeEach(() => {
        getLogCapture().clear();
        getLogCapture().enable(LogPathway.DATA_INGESTION);

        // Create real orchestrator instance
        orchestrator = new DataOrchestrator();
    });

    it('should complete orchestrator portion of pathway', async () => {
        // Simpler pathway - just the orchestrator milestones
        const asserter = new PathwayAsserter(LogPathway.DATA_INGESTION)
            .expectMilestone('DataOrchestrator.getEvents')
            .expectMilestone('DataOrchestrator.fetchFromProviders');

        // Execute JUST the orchestrator code
        const mockContext = {
            repoPath: '/mock/repo',
            workspaceFolder: { uri: { fsPath: '/mock/repo' } }
        };

        // This WILL execute and generate logs
        try {
            await orchestrator.getEvents(mockContext.repoPath);
        } catch (err) {
            // May fail due to no real git repo, but logs were generated
        }

        // Verify pathway
        asserter.setCapturedLogs(getLogCapture().getLogs());
        const result = asserter.verify();

        if (!result.passed) {
            const pathwayDebugger = new PathwayDebugger(result);
            console.log(pathwayDebugger.formatForAI());
        }

        expect(asserter).toCompletePathway();
    });
});
```

**Pros:**
✅ Can run in Jest
✅ Tests real code (not mocks)
✅ Fast execution
✅ No VSCode required

**Cons:**
❌ Only tests one component
❌ Doesn't test integration points
❌ May need mock data setup

---

## Level 2: Integration-Level Pathway Tests (Recommended)

**Approach:** Test multiple components together using testable harnesses

### Strategy 2A: Headless Orchestrator Tests

```typescript
// tests/pathways/integration/data-flow.pathway.test.ts
import { DataOrchestrator } from '../../../src/orchestration/DataOrchestrator';
import { GitEventRepository } from '../../../src/timeline/infrastructure/GitEventRepository';
import { createDataIngestionPathway } from '../definitions';

describe('DATA_INGESTION Pathway - Integration', () => {
    it('should complete data ingestion through orchestrator', async () => {
        const asserter = new PathwayAsserter(LogPathway.DATA_INGESTION)
            .expectMilestone('DataOrchestrator.getEvents')
            .expectMilestone('GitEventRepository.fetchEvents')
            .expectMilestone('DataOrchestrator.normalizeEvents')
            .expectMilestone('DataOrchestrator.mergeProviderData');

        // Use real test repository
        const testRepoPath = path.join(__dirname, '../../../.git');

        // Create instances
        const repository = new GitEventRepository(testRepoPath);
        const orchestrator = new DataOrchestrator();

        // Execute the flow
        const events = await orchestrator.getEvents(testRepoPath);

        // Verify
        asserter.setCapturedLogs(getLogCapture().getLogs());
        expect(asserter).toCompletePathway();
        expect(events.length).toBeGreaterThan(0);
    });
});
```

**Pros:**
✅ Tests real integration
✅ No VSCode needed (for extension-side code)
✅ Uses project's own .git folder
✅ Validates actual data flow

**Cons:**
❌ Still can't test webview code
❌ Needs real git repository

### Strategy 2B: Mock VSCode API

```typescript
// tests/setup/vscode-mock.ts
export const mockVSCode = {
    workspace: {
        workspaceFolders: [
            { uri: { fsPath: '/mock/path' } }
        ],
        getConfiguration: (section: string) => ({
            get: (key: string) => undefined
        })
    },
    window: {
        createWebviewPanel: jest.fn(),
        showInformationMessage: jest.fn()
    },
    Uri: {
        file: (path: string) => ({ fsPath: path })
    }
};

// In test
jest.mock('vscode', () => mockVSCode);
```

**Pros:**
✅ Can test extension code in Jest
✅ Control VSCode behavior
✅ Fast execution

**Cons:**
❌ Mocks hide real issues
❌ Mocks need maintenance
❌ Not testing real VSCode integration

---

## Level 3: E2E Pathway Tests (Full Stack)

**Approach:** Run the actual extension in VSCode

### Strategy 3A: VSCode Extension Test Framework

```typescript
// tests/e2e/pathways/data-ingestion.e2e.test.ts
import * as vscode from 'vscode';
import { runTests } from '@vscode/test-electron';

describe('DATA_INGESTION Pathway - E2E', () => {
    let extension: vscode.Extension<any>;

    before(async () => {
        // Start VSCode
        extension = vscode.extensions.getExtension('your-extension-id')!;
        await extension.activate();
    });

    it('should complete full data ingestion pathway', async function() {
        this.timeout(10000); // E2E tests are slow

        const asserter = createDataIngestionPathway();

        // Execute the real command
        await vscode.commands.executeCommand('repoTimeline.showTimeline');

        // Wait for webview to be ready
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Get logs from extension
        const logs = getLogCapture().getLogs();

        asserter.setCapturedLogs(logs);
        expect(asserter).toCompletePathway();
    });
});
```

**Setup required:**
```json
// package.json
{
  "scripts": {
    "test:e2e": "node ./out/test/runTest.js"
  }
}
```

```typescript
// tests/e2e/runTest.ts
import { runTests } from '@vscode/test-electron';

async function main() {
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');
    const extensionTestsPath = path.resolve(__dirname, './suite/index');

    await runTests({
        extensionDevelopmentPath,
        extensionTestsPath
    });
}
```

**Pros:**
✅ Tests complete stack
✅ Real VSCode environment
✅ Catches integration issues

**Cons:**
❌ Very slow (10-30s per test)
❌ Complex setup
❌ Flaky (timing issues)
❌ Hard to debug

---

## Level 4: Manual Pathway Validation (Developer Tools)

**Approach:** Developer runs extension and inspects pathway logs

### Strategy 4A: Pathway Replay Tool

Create a tool to validate pathways during manual testing:

```typescript
// src/debug/PathwayValidator.ts
import { logger, LogPathway } from '../utils/Logger';

export class PathwayValidator {
    private recordings: Map<LogPathway, LogEntry[]> = new Map();

    startRecording(pathway: LogPathway) {
        this.recordings.set(pathway, []);
        logger.info(LogCategory.TEST,
            `Started recording pathway: ${LogPathway[pathway]}`,
            'PathwayValidator.startRecording'
        );
    }

    stopRecording(pathway: LogPathway): PathwayReport {
        const logs = this.recordings.get(pathway) || [];

        // Generate report
        return {
            pathway,
            logCount: logs.length,
            milestones: logs.map(l => l.context),
            duration: logs[logs.length - 1]?.timestamp - logs[0]?.timestamp
        };
    }

    validateAgainstDefinition(
        pathway: LogPathway,
        definition: PathwayAsserter
    ): boolean {
        const logs = this.recordings.get(pathway) || [];
        definition.setCapturedLogs(logs);
        const result = definition.verify();

        if (!result.passed) {
            console.error(new PathwayDebugger(result).formatForAI());
        }

        return result.passed;
    }
}

// Usage in extension
const validator = new PathwayValidator();

// Developer triggers this from command palette
vscode.commands.registerCommand('repoTimeline.validatePathway', async () => {
    validator.startRecording(LogPathway.DATA_INGESTION);

    // Developer manually triggers the flow
    await vscode.window.showInformationMessage(
        'Perform the data ingestion action now...'
    );

    await new Promise(resolve => setTimeout(resolve, 5000));

    const report = validator.stopRecording(LogPathway.DATA_INGESTION);

    const passed = validator.validateAgainstDefinition(
        LogPathway.DATA_INGESTION,
        createDataIngestionPathway()
    );

    vscode.window.showInformationMessage(
        passed ? '✅ Pathway Valid!' : '❌ Pathway Failed - Check Output'
    );
});
```

**Pros:**
✅ Real environment
✅ Easy to trigger
✅ Immediate feedback
✅ Good for development

**Cons:**
❌ Not automated
❌ Requires human
❌ Can't run in CI/CD

---

## Recommended Hybrid Approach

**Use ALL levels for different purposes:**

### Phase 1: Unit Pathway Tests (NOW)
```typescript
// Test individual components with minimal mocking
describe('DataOrchestrator Pathway', () => {
    it('should log orchestration milestones', async () => {
        const orchestrator = new DataOrchestrator();
        const testRepo = path.join(__dirname, '../../../');

        await orchestrator.getEvents(testRepo);

        const logs = getLogCapture().getLogsForPathway(LogPathway.DATA_INGESTION);
        expect(logs.length).toBeGreaterThan(0);
        expect(logs.some(l => l.context === 'DataOrchestrator.getEvents')).toBe(true);
    });
});
```

### Phase 2: Integration Pathway Tests (NEXT)
```typescript
// Test data flow through multiple components
describe('Data Flow Integration', () => {
    it('should flow from git → orchestrator → normalized events', async () => {
        // Real components, real data, no VSCode
        const asserter = new PathwayAsserter(LogPathway.DATA_INGESTION)
            .expectMilestone('GitEventRepository.fetchEvents')
            .expectMilestone('DataOrchestrator.normalizeEvents');

        const repo = new GitEventRepository('./');
        const events = await repo.fetchEvents();
        const orchestrator = new DataOrchestrator();
        const normalized = orchestrator.normalizeEvents(events);

        asserter.setCapturedLogs(getLogCapture().getLogs());
        expect(asserter).toCompletePathway();
    });
});
```

### Phase 3: Manual Validation (PARALLEL)
```typescript
// Developer command for interactive testing
vscode.commands.registerCommand('repoTimeline.debugPathway', async () => {
    const pathway = await vscode.window.showQuickPick([
        'DATA_INGESTION',
        'FILTER_APPLY',
        'RENDER_PIPELINE'
    ]);

    // Start recording
    // User performs action
    // Validate and show results
});
```

### Phase 4: E2E (LATER - Optional)
```typescript
// Full stack tests for critical paths only
// Run in CI/CD before releases
```

---

## Practical Implementation Plan

### Week 1: Create Test Fixtures

```typescript
// tests/fixtures/test-repositories.ts
export class TestRepositories {
    static async createMockRepo(): Promise<string> {
        const tmpDir = path.join(__dirname, '../tmp/mock-repo');
        await fs.mkdir(tmpDir, { recursive: true });

        // Initialize git repo
        execSync('git init', { cwd: tmpDir });
        execSync('git config user.email "test@test.com"', { cwd: tmpDir });
        execSync('git config user.name "Test User"', { cwd: tmpDir });

        // Create commits
        await fs.writeFile(path.join(tmpDir, 'file1.txt'), 'content');
        execSync('git add .', { cwd: tmpDir });
        execSync('git commit -m "Initial commit"', { cwd: tmpDir });

        return tmpDir;
    }

    static useProjectRepo(): string {
        // Use this repo's .git folder for testing
        return path.join(__dirname, '../../');
    }
}
```

### Week 2: Implement Unit Pathway Tests

```typescript
// tests/pathways/unit/orchestrator.pathway.test.ts
describe('DataOrchestrator Pathways - Unit', () => {
    let testRepo: string;

    beforeAll(async () => {
        testRepo = await TestRepositories.createMockRepo();
    });

    it('should complete getEvents pathway milestones', async () => {
        const asserter = new PathwayAsserter(LogPathway.DATA_INGESTION)
            .expectMilestone('DataOrchestrator.getEvents')
            .expectMilestone('DataOrchestrator.fetchFromProviders');

        const orchestrator = new DataOrchestrator();
        await orchestrator.getEvents(testRepo);

        asserter.setCapturedLogs(getLogCapture().getLogs());
        expect(asserter).toCompletePathway();
    });
});
```

### Week 3: Add Integration Tests

```typescript
// tests/pathways/integration/data-flow.test.ts
describe('Data Flow Pathways - Integration', () => {
    it('should complete git → orchestrator → events flow', async () => {
        const asserter = new PathwayAsserter(LogPathway.DATA_INGESTION)
            .expectMilestone('GitEventRepository.fetchEvents')
            .expectMilestone('GitEventRepository.normalizeEvents')
            .expectMilestone('DataOrchestrator.mergeProviderData');

        // Execute real flow
        const repo = new GitEventRepository(testRepo);
        const orchestrator = new DataOrchestrator();

        const rawEvents = await repo.fetchEvents();
        const normalized = repo.normalizeEvents(rawEvents);
        const merged = orchestrator.mergeProviderData([normalized]);

        asserter.setCapturedLogs(getLogCapture().getLogs());
        expect(asserter).toCompletePathway();
    });
});
```

### Week 4: Developer Tools

```typescript
// src/commands/debug-pathway.ts
export function registerPathwayDebugCommand(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('repoTimeline.debugPathway', async () => {
            // Interactive pathway validation
            // Shows live pathway validation during development
        })
    );
}
```

---

## Decision Matrix: Which Strategy to Use?

| Need | Strategy | Speed | Coverage | Setup |
|------|----------|-------|----------|-------|
| Quick validation | Unit | ⚡⚡⚡ | 30% | Easy |
| Component testing | Integration | ⚡⚡ | 60% | Medium |
| Full stack | E2E | ⚡ | 95% | Hard |
| Development | Manual | ⚡⚡⚡ | 100% | Easy |
| CI/CD | Unit + Integration | ⚡⚡ | 75% | Medium |

---

## Answer to Your Question

**"Did I get myself in a corner?"**

**No!** You have **multiple ways forward**:

1. **Immediate (Today):** Write unit tests for individual components
2. **Short-term (This week):** Add integration tests with test fixtures
3. **Medium-term (This month):** Create developer validation tools
4. **Long-term (Optional):** Add E2E tests for critical paths

**You're NOT stuck** - pathway testing works at ALL levels:
- ✅ Unit level (component milestones)
- ✅ Integration level (cross-component flow)
- ✅ E2E level (full stack)
- ✅ Manual level (developer validation)

The infrastructure you built is **flexible enough** to support all of these approaches!

---

## Next Concrete Steps

1. **Create test fixtures** (TestRepositories class)
2. **Write 1 unit pathway test** for DataOrchestrator
3. **Verify it passes** with real logging
4. **Expand to other components**
5. **Add integration tests** when needed

You haven't cornered yourself - you've built a foundation that works at **every level of testing**! 🚀
