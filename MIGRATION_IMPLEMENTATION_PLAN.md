# Agent-Brain Platform - Migration Implementation Plan

**Version:** 1.0.0
**Date:** 2025-10-05
**Based on:** ARCHITECTURE_DESIGN_V3.md
**Status:** Ready for execution

---

## Executive Summary

This document provides a detailed, step-by-step plan to migrate from the current package structure to the unified architecture defined in ARCHITECTURE_DESIGN_V3.md.

### Migration Approach: Recreate Then Enhance

**PART 1: Recreate What We Have (Phases 1-8)**
- Move timeline visualization from packages/vscode/ to unified core structure
- Move agent-brain intelligence from packages/core/ to unified core structure
- Integrate intelligence as a data provider (learnings become CanonicalEvents)
- Connect WebSocket and other agent-brain connectors
- **Result:** Working extension with Git + GitHub + Intelligence providers

**PART 2: Add New Capability (Phases 9-11)**
- Implement agent emission tracking (NEW capability)
- Create prompt-based event model
- Add agent tasks to timeline
- **Result:** Timeline shows agent activities alongside commits and learnings

**PART 3: Finalize (Phase 12)**
- Polish, optimize, document
- **Result:** Production-ready unified platform

### Design Principles

1. **Preserve all working functionality** - Extension continues to work at every checkpoint
2. **Test incrementally** - Verify each change before proceeding
3. **Maintain git history** - Clean commits with rollback points
4. **Recreate first, enhance later** - Don't add new features until existing ones work

**Critical Principle:** The extension is **currently working** (149 pathway tests passing, .vsix packaged). We will not break it.

---

## Current State Analysis

### What's Working ✅

**Extension Functionality:**
- Timeline visualization displaying git commits
- Filter controls (branch, author, date, event type)
- Range selector for time-based zooming
- GitHub provider integration
- Webview messaging between extension and UI
- **149 pathway tests passing** (100% success rate)
- Built and packaged extension: `agent-brain-platform-0.1.0.vsix`

**Key Components:**
```
packages/vscode/
├── src/
│   ├── extension.ts                 [Entry point - working]
│   ├── providers/
│   │   ├── timeline-provider-webpack.ts  [Webview host - working]
│   │   ├── git/GitProvider.ts            [Data provider - working]
│   │   └── github/GitHubProvider.ts      [Data provider - working]
│   ├── orchestration/
│   │   └── DataOrchestrator.ts           [Aggregation - working]
│   ├── visualization/                    [D3 rendering - working]
│   ├── core/
│   │   └── CanonicalEvent.ts            [Event system - working]
│   └── utils/
│       └── Logger.ts                     [Pathway logging - working]
├── tests/pathways/                      [149 tests - passing]
├── webpack.config.js                    [Build config - working]
└── package.json                         [VSCode manifest - working]
```

**Import Dependencies (Critical to preserve):**
```
extension.ts → TimelineProvider
TimelineProvider → DataOrchestrator
DataOrchestrator → ProviderRegistry → GitProvider, GitHubProvider
Providers → CanonicalEvent
All components → Logger
```

### What Needs Migration

**1. Duplicate Code:**
- `packages/timeline/` (13MB) - **Delete entirely** (unused duplicate)

**2. Existing Functionality to Reorganize:**
- `packages/vscode/` - Timeline visualization (working, needs domain structure)
  - Git provider (working)
  - GitHub provider (working)
  - DataOrchestrator (working)
  - D3 visualization (working)
  - 149 pathway tests (passing)

- `packages/core/` - Agent-Brain intelligence (exists, needs integration)
  - Pattern engine (working)
  - Learning analyzer (working)
  - Learning storage (working)
  - Pattern validator (working)
  - WebSocket API (working)
  - Dashboard server (working)

**3. Integration Work Needed:**
- Create IntelligenceProvider to expose learnings as CanonicalEvents
- Connect WebSocket to timeline for real-time learning updates
- Create PathwayLearningAdapter (pathway test failures → learning system)
- Register intelligence provider with DataOrchestrator

**4. New Capabilities (Phase 2):**
- Agent emission providers (NOT YET IMPLEMENTED)
- Prompt-based event model (NOT YET IMPLEMENTED)
- Agent activity rollup (NOT YET IMPLEMENTED)

---

## Migration Strategy

### Core Principles

1. **Incremental Movement** - Move one domain at a time
2. **Import Updates** - Update imports immediately after moving files
3. **Test After Each Phase** - Run pathway tests, verify extension builds
4. **Git Checkpoints** - Commit after each successful phase
5. **Preserve Working Extension** - Never break the .vsix build

### Phase Overview

**PART 1: CORE MIGRATION - Recreate What We Have (Phases 1-8)**
```
Phase 1: Foundation & Cleanup        [2-3 hours]
  ├─ Delete packages/timeline/
  ├─ Create new core package structure
  └─ Set up build configuration

Phase 2: Domain: Events               [1-2 hours]
  ├─ Move CanonicalEvent to core/domains/events/
  ├─ Update all imports
  └─ Test & commit

Phase 3: Domain: Providers            [2-3 hours]
  ├─ Move Git & GitHub providers to core/domains/providers/
  └─ Test & commit

Phase 4: Domain: Visualization        [2-3 hours]
  ├─ Move visualization to core/domains/visualization/
  ├─ Move DataOrchestrator here
  └─ Test & commit

Phase 5: Infrastructure               [2-3 hours]
  ├─ Move Logger, pathway testing to infrastructure/
  ├─ Create registry infrastructure
  └─ Test & commit

Phase 6: Domain: Intelligence         [3-4 hours]
  ├─ Move packages/core/ (agent-brain) to core/domains/intelligence/
  ├─ Create IntelligenceProvider (learnings as CanonicalEvents)
  └─ Test & commit

Phase 7: Intelligence Integration     [2-3 hours]
  ├─ Register IntelligenceProvider with DataOrchestrator
  ├─ Connect WebSocket for real-time learning events
  ├─ Create PathwayLearningAdapter (pathway failures → learning system)
  └─ Test & commit

Phase 8: Extension Wrapper            [2-3 hours]
  ├─ Create packages/extension/
  ├─ Move VSCode glue code
  ├─ Package and verify .vsix
  └─ Test & commit

CHECKPOINT: Extension working with Git, GitHub, and Intelligence providers ✅
           Timeline shows: commits + PRs + learnings
           149 pathway tests + intelligence tests passing
```

**PART 2: NEW CAPABILITY - Agent Emissions (Phases 9-11)**
```
Phase 9: Agent Emission Infrastructure [4-5 hours]
  ├─ Create core/domains/providers/agents/ structure
  ├─ Implement AgentActivityRollup types
  ├─ Implement RollupToEventConverter
  ├─ Create AgentEmissionProvider skeleton
  └─ Test & commit

Phase 10: Claude Code Adapter         [3-4 hours]
  ├─ Implement ClaudeCodeAdapter (prompt-based sessions)
  ├─ Capture user prompts from VSCode extension
  ├─ Accumulate agent activities into rollup
  ├─ Handle session boundaries (prompt/timeout)
  └─ Test & commit

Phase 11: Agent Emissions Integration [2-3 hours]
  ├─ Register AgentEmissionProvider with DataOrchestrator
  ├─ Update timeline to render agent events
  ├─ Create agent emission pathway tests
  ├─ Package and verify
  └─ Test & commit

CHECKPOINT: Extension working with all providers ✅
           Timeline shows: commits + PRs + learnings + agent tasks
           All pathway tests passing including agent emission tests
```

**PART 3: FINALIZATION (Phase 12)**
```
Phase 12: Final Integration & Polish  [2-3 hours]
  ├─ Create VisualizationRegistry
  ├─ Performance optimization
  ├─ Documentation update
  └─ Final package and verification

COMPLETE: Production-ready unified platform ✅
```

**Total Estimated Time:**
- Part 1 (Core Migration): 17-23 hours
- Part 2 (Agent Emissions): 9-12 hours
- Part 3 (Finalization): 2-3 hours
- **Total: 28-38 hours**

---

## Detailed Phase Plans

### Phase 1: Foundation & Cleanup

**Objective:** Clean slate and new structure

**Estimated Time:** 2-3 hours

#### Step 1.1: Delete packages/timeline/ ✅

```bash
# Verify it's truly unused
grep -r "from.*@agent-brain/timeline" packages/vscode/
# Should return nothing

# Delete the duplicate
git rm -r packages/timeline/
git commit -m "chore: remove duplicate timeline package (13MB unused code)"
```

**Verification:**
- Extension still builds: `npm run build --prefix packages/vscode`
- No broken imports: `tsc --noEmit` in vscode package

#### Step 1.2: Create Core Package Structure ✅

```bash
# Create new core package
mkdir -p packages/core

# Create domain directories
mkdir -p packages/core/src/domains/{events,intelligence,providers,visualization,extension}
mkdir -p packages/core/src/infrastructure/{registries,logging,testing,storage,config}
mkdir -p packages/core/tests/{pathways,fixtures,mocks,setup,utils}

# Create package.json for core
```

**File:** `packages/core/package.json`
```json
{
  "name": "@agent-brain/core",
  "version": "0.1.0",
  "description": "Core platform for Agent-Brain - unified domains",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "test:pathways": "jest --selectProjects=\"Pathway Tests\"",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "d3": "^7.9.0",
    "@octokit/rest": "^22.0.0"
  },
  "devDependencies": {
    "@types/d3": "^7.4.3",
    "@types/node": "^18.19.0",
    "typescript": "^5.9.2"
  }
}
```

**File:** `packages/core/tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020", "DOM"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**Verification:**
- Directory structure created
- package.json valid: `npm install --prefix packages/core`

#### Step 1.3: Update Root Configuration ✅

**File:** `lerna.json` - Already correct, includes `packages/*`

**File:** `package.json` (root)
```json
{
  "scripts": {
    "build": "lerna run build",
    "build:core": "lerna run build --scope=@agent-brain/core",
    "build:vscode": "lerna run build --scope=@agent-brain/vscode",
    "build:extension": "lerna run build --scope=@agent-brain/extension",
    "test": "lerna run test",
    "test:core": "lerna run test --scope=@agent-brain/core",
    "test:pathways": "lerna run test:pathways",
    "clean": "lerna run clean && lerna clean -y",
    "watch": "lerna run watch --parallel",
    "package:extension": "npm run build && cd packages/extension && vsce package"
  }
}
```

**Git Checkpoint:**
```bash
git add .
git commit -m "feat: create core package structure for unified architecture"
```

---

### Phase 2: Domain: Events

**Objective:** Move CanonicalEvent system to core/domains/events/

**Estimated Time:** 1-2 hours

#### Step 2.1: Move Event System Files ✅

```bash
# Copy (not move yet, to be safe) CanonicalEvent files
cp packages/vscode/src/core/CanonicalEvent.ts packages/core/src/domains/events/
```

**New Structure:**
```
packages/core/src/domains/events/
├── CanonicalEvent.ts          [Main event interface]
├── EventType.ts               [Extract enum from CanonicalEvent.ts]
├── Author.ts                  [Extract interface]
├── ImpactMetrics.ts           [Extract interface]
├── VisualizationHints.ts      [Extract interface]
├── types.ts                   [Supporting types]
└── index.ts                   [Export all]
```

**File:** `packages/core/src/domains/events/index.ts`
```typescript
export * from './CanonicalEvent';
export * from './EventType';
export * from './Author';
export * from './ImpactMetrics';
export * from './VisualizationHints';
export * from './types';
```

#### Step 2.2: Update Imports in vscode Package ✅

**Find all imports:**
```bash
grep -r "from.*core/CanonicalEvent\|from.*CanonicalEvent" packages/vscode/src --include="*.ts"
```

**Replace pattern:**
```typescript
// Before
import { CanonicalEvent } from '../core/CanonicalEvent';

// After
import { CanonicalEvent } from '@agent-brain/core/domains/events';
```

**Files to update (15 files):**
- `src/orchestration/DataOrchestrator.ts`
- `src/providers/timeline-provider-webpack.ts`
- `src/providers/git/GitProvider.ts`
- `src/providers/github/GitHubProvider.ts`
- All transformer files
- Filter files
- Orchestration files

**Automated approach:**
```bash
# Use sed to replace imports (on Unix/Mac/WSL)
find packages/vscode/src -name "*.ts" -type f -exec sed -i \
  "s|from ['\"].*core/CanonicalEvent['\"]|from '@agent-brain/core/domains/events'|g" {} +

# Or manually update each file
```

#### Step 2.3: Configure TypeScript Path Mapping ✅

**File:** `packages/vscode/tsconfig.json`
```json
{
  "compilerOptions": {
    "paths": {
      "@agent-brain/core/*": ["../core/src/*"]
    }
  }
}
```

**File:** `packages/vscode/package.json` - Add dependency
```json
{
  "dependencies": {
    "@agent-brain/core": "^0.1.0",
    ...
  }
}
```

#### Step 2.4: Build and Test ✅

```bash
# Build core package
npm run build:core

# Build vscode package
npm run build:vscode

# Run pathway tests
npm run test:pathways --prefix packages/vscode

# Expected: 149 tests passing (same as before)
```

**Git Checkpoint:**
```bash
git add .
git commit -m "refactor: move CanonicalEvent system to core/domains/events/"
```

---

### Phase 3: Domain: Providers

**Objective:** Move data providers to core/domains/providers/

**Estimated Time:** 2-3 hours

#### Step 3.1: Move Provider Files ✅

```bash
# Create provider structure
mkdir -p packages/core/src/domains/providers/{base,git,github}

# Move provider files
cp -r packages/vscode/src/providers/git/* packages/core/src/domains/providers/git/
cp -r packages/vscode/src/providers/github/* packages/core/src/domains/providers/github/

# Move base interfaces (from orchestration)
cp packages/vscode/src/orchestration/ProviderRegistry.ts packages/core/src/domains/providers/base/
```

**New Structure:**
```
packages/core/src/domains/providers/
├── base/
│   ├── IDataProvider.ts          [Interface]
│   ├── ProviderRegistry.ts       [Registry]
│   ├── ProviderConfig.ts         [Config types]
│   └── index.ts
├── git/
│   ├── GitProvider.ts
│   ├── GitEventRepository.ts
│   └── index.ts
├── github/
│   ├── GitHubProvider.ts
│   ├── GitHubClient.ts
│   ├── transformers/
│   └── index.ts
└── index.ts                      [Export all providers]
```

#### Step 3.2: Update Provider Imports ✅

**Update imports in providers themselves:**
```typescript
// In GitProvider.ts, GitHubProvider.ts
import { CanonicalEvent } from '@agent-brain/core/domains/events';
import { IDataProvider, ProviderConfig } from '@agent-brain/core/domains/providers/base';
```

**Update imports in vscode package:**
```bash
# Find files importing providers
grep -r "from.*providers/git\|from.*providers/github" packages/vscode/src
```

**Replace:**
```typescript
// Before
import { GitProvider } from '../providers/git/GitProvider';

// After
import { GitProvider } from '@agent-brain/core/domains/providers';
```

#### Step 3.3: Build and Test ✅

```bash
npm run build:core
npm run build:vscode
npm run test:pathways --prefix packages/vscode
```

**Expected:** All tests passing, no import errors

**Git Checkpoint:**
```bash
git add .
git commit -m "refactor: move data providers to core/domains/providers/"
```

---

### Phase 4: Domain: Visualization

**Objective:** Move visualization code to core/domains/visualization/

**Estimated Time:** 2-3 hours

#### Step 4.1: Move Visualization Files ✅

**IMPORTANT:** DataOrchestrator stays with visualization (it's visualization-specific orchestration)

```bash
# Create visualization structure
mkdir -p packages/core/src/domains/visualization/{timeline,filters,ui,webview,styles,theme,orchestration}

# Move D3 renderers
cp -r packages/vscode/src/visualization/d3/* packages/core/src/domains/visualization/timeline/
cp -r packages/vscode/src/visualization/renderers/* packages/core/src/domains/visualization/timeline/

# Move filters
cp -r packages/vscode/src/visualization/ui/FilterController.ts packages/core/src/domains/visualization/filters/
cp packages/vscode/src/orchestration/FilterStateManager.ts packages/core/src/domains/visualization/filters/

# Move UI components
cp packages/vscode/src/visualization/ui/RangeSelector.ts packages/core/src/domains/visualization/ui/

# Move webview app
cp packages/vscode/src/webview/* packages/core/src/domains/visualization/webview/

# Move styles
cp -r packages/vscode/src/visualization/styles/* packages/core/src/domains/visualization/styles/

# Move theme
cp packages/vscode/src/visualization/theme/* packages/core/src/domains/visualization/theme/

# Move orchestrator (stays in visualization domain)
cp packages/vscode/src/orchestration/DataOrchestrator.ts packages/core/src/domains/visualization/orchestration/
cp packages/vscode/src/orchestration/EventMatcher.ts packages/core/src/domains/visualization/orchestration/
```

**New Structure:**
```
packages/core/src/domains/visualization/
├── timeline/
│   ├── D3TimelineRenderer.ts
│   ├── EventRenderer.ts
│   ├── LegendRenderer.ts
│   ├── InteractionHandler.ts
│   └── TimelineRenderer.ts
├── filters/
│   ├── FilterController.ts
│   ├── FilterStateManager.ts
│   └── FilterOptions.ts
├── ui/
│   ├── RangeSelector.ts
│   └── TimelineControls.ts
├── webview/
│   ├── SimpleTimelineApp.ts
│   ├── WebviewLogger.ts
│   └── main.ts
├── styles/
│   └── [CSS files]
├── theme/
│   └── EventVisualTheme.ts
├── orchestration/
│   ├── DataOrchestrator.ts
│   ├── EventMatcher.ts
│   └── OrchestratorState.ts
└── index.ts
```

#### Step 4.2: Update Visualization Imports ✅

**Within visualization files:**
```typescript
// Update to use new paths
import { CanonicalEvent } from '@agent-brain/core/domains/events';
import { IDataProvider } from '@agent-brain/core/domains/providers/base';
import { GitProvider } from '@agent-brain/core/domains/providers';
```

**In vscode package:**
```typescript
// Before
import { DataOrchestrator } from '../orchestration/DataOrchestrator';

// After
import { DataOrchestrator } from '@agent-brain/core/domains/visualization/orchestration';
```

#### Step 4.3: Update Webpack Config ✅

**File:** `packages/vscode/webpack.config.js`

**Update webview entry:**
```javascript
const webviewConfig = {
  entry: {
    // Update path to new location
    webview: '../core/src/domains/visualization/webview/main.ts'
  },
  resolve: {
    alias: {
      '@visualization': path.resolve(__dirname, '../core/src/domains/visualization'),
      '@core': path.resolve(__dirname, '../core/src')
    }
  }
}
```

#### Step 4.4: Build and Test ✅

```bash
npm run build:core
npm run build:vscode
npm run test:pathways --prefix packages/vscode

# Test extension package
cd packages/vscode && vsce package
```

**Expected:** Extension packages successfully, all tests pass

**Git Checkpoint:**
```bash
git add .
git commit -m "refactor: move visualization domain to core/domains/visualization/"
```

---

### Phase 5: Infrastructure

**Objective:** Move cross-cutting concerns to infrastructure/

**Estimated Time:** 2-3 hours

#### Step 5.1: Move Logger ✅

```bash
# Move logger
cp packages/vscode/src/utils/Logger.ts packages/core/src/infrastructure/logging/

# Create LogCapture and pathway types (if not already there)
cp packages/vscode/tests/utils/LogCapture.ts packages/core/src/infrastructure/logging/
```

**Structure:**
```
packages/core/src/infrastructure/logging/
├── Logger.ts
├── LogCapture.ts
├── LogPathway.ts
├── createContextLogger.ts
└── index.ts
```

**Update imports:**
```typescript
// Before
import { logger, LogCategory } from './utils/Logger';

// After
import { logger, LogCategory } from '@agent-brain/core/infrastructure/logging';
```

#### Step 5.2: Move Pathway Testing Framework ✅

```bash
# Move pathway testing utils
cp packages/vscode/tests/utils/PathwayAsserter.ts packages/core/src/infrastructure/testing/
cp packages/vscode/tests/utils/PathwayDebugger.ts packages/core/src/infrastructure/testing/
cp packages/vscode/tests/utils/PathwayReporter.ts packages/core/src/infrastructure/testing/
cp packages/vscode/tests/utils/TimelineUISimulator.ts packages/core/src/infrastructure/testing/
cp packages/vscode/tests/utils/pathway-matchers.ts packages/core/src/infrastructure/testing/
```

**Structure:**
```
packages/core/src/infrastructure/testing/
├── PathwayAsserter.ts
├── PathwayDebugger.ts
├── PathwayReporter.ts
├── TimelineUISimulator.ts
├── pathway-matchers.ts
└── index.ts
```

**Update test imports:**
```typescript
// In pathway tests
import { PathwayAsserter } from '@agent-brain/core/infrastructure/testing';
```

#### Step 5.3: Create Registry Infrastructure ✅

**File:** `packages/core/src/infrastructure/registries/Registry.ts`

```typescript
/**
 * Base Registry Pattern
 * Generic implementation for all pluggable components
 */

export interface RegistryItem {
  id: string;
  name: string;
}

export interface HealthStatus {
  isHealthy: boolean;
  lastCheck: Date;
  error?: Error;
}

export class Registry<T extends RegistryItem> {
  protected items = new Map<string, T>();
  protected healthStatus = new Map<string, HealthStatus>();

  register(id: string, item: T): void {
    this.items.set(id, item);
    this.healthStatus.set(id, {
      isHealthy: true,
      lastCheck: new Date()
    });
  }

  unregister(id: string): void {
    this.items.delete(id);
    this.healthStatus.delete(id);
  }

  get(id: string): T | undefined {
    return this.items.get(id);
  }

  getAll(): T[] {
    return Array.from(this.items.values());
  }

  getHealthy(): T[] {
    return Array.from(this.items.entries())
      .filter(([id]) => this.healthStatus.get(id)?.isHealthy)
      .map(([, item]) => item);
  }
}
```

**File:** `packages/core/src/infrastructure/registries/DataProviderRegistry.ts`

```typescript
import { Registry } from './Registry';
import { IDataProvider } from '../../domains/providers/base';

export class DataProviderRegistry extends Registry<IDataProvider> {
  // Provider-specific methods
}
```

**File:** `packages/core/src/infrastructure/registries/VisualizationRegistry.ts`

```typescript
import { Registry } from './Registry';

export interface IVisualization {
  id: string;
  name: string;
  render(data: any): Promise<void>;
}

export class VisualizationRegistry extends Registry<IVisualization> {
  // Visualization-specific methods
}
```

#### Step 5.4: Build and Test ✅

```bash
npm run build:core
npm run build:vscode
npm run test:pathways --prefix packages/vscode
```

**Git Checkpoint:**
```bash
git add .
git commit -m "refactor: move infrastructure to core/infrastructure/"
```

---

### Phase 6: Domain: Intelligence

**Objective:** Move agent-brain core code to core/domains/intelligence/

**Estimated Time:** 3-4 hours

#### Step 6.1: Move Intelligence Files ✅

```bash
# Copy from old core package
cp -r packages/core/src/patterns packages/core/src/domains/intelligence/
cp -r packages/core/src/learning packages/core/src/domains/intelligence/
cp -r packages/core/src/engine packages/core/src/domains/intelligence/analysis/
```

**Structure:**
```
packages/core/src/domains/intelligence/
├── patterns/
│   ├── PatternEngine.ts
│   ├── PatternValidator.ts
│   ├── PatternSystem.ts
│   └── engine.ts
├── learning/
│   ├── LearningAnalyzer.ts
│   ├── LearningPropagator.ts
│   ├── LearningStorage.ts
│   ├── LearningSystem.ts
│   ├── PathwayLearningAdapter.ts     [NEW]
│   └── types.ts
├── analysis/
│   └── AgentBrainCore.ts
└── index.ts
```

#### Step 6.2: Create PathwayLearningAdapter ✅

**File:** `packages/core/src/domains/intelligence/learning/PathwayLearningAdapter.ts`

```typescript
/**
 * PathwayLearningAdapter
 *
 * Connects pathway test failures to the learning system.
 * This closes the feedback loop: Tests → Learnings → Patterns
 */

import { TestFailure, LearningPattern } from './types';
import { LearningSystem } from './LearningSystem';

export interface PathwayTestFailure {
  pathway: string;
  testName: string;
  failedAtMilestone: string;
  debugAnalysis: {
    hypotheses: Array<{ category: string; confidence: number; description: string }>;
    checklist: string[];
  };
}

export class PathwayLearningAdapter {
  constructor(private learningSystem: LearningSystem) {}

  /**
   * Convert pathway test failure to TestFailure format
   */
  convertToTestFailure(pathwayFailure: PathwayTestFailure): TestFailure {
    return {
      test: `${pathwayFailure.pathway} - ${pathwayFailure.testName}`,
      error: `Failed at milestone: ${pathwayFailure.failedAtMilestone}`,
      file: 'pathway-test',
      context: {
        timestamp: new Date(),
        hypotheses: pathwayFailure.debugAnalysis.hypotheses,
        checklist: pathwayFailure.debugAnalysis.checklist
      }
    };
  }

  /**
   * Process pathway test failure through learning system
   */
  async processPathwayFailure(pathwayFailure: PathwayTestFailure): Promise<LearningPattern[]> {
    const testFailure = this.convertToTestFailure(pathwayFailure);
    return this.learningSystem.processFailure(testFailure);
  }
}
```

#### Step 6.3: Update Intelligence Imports ✅

**Update internal imports:**
```typescript
// In intelligence files
import { CanonicalEvent } from '@agent-brain/core/domains/events';
import { logger } from '@agent-brain/core/infrastructure/logging';
```

#### Step 6.4: Create Intelligence Provider ✅

**File:** `packages/core/src/domains/providers/intelligence/IntelligenceProvider.ts`

```typescript
/**
 * IntelligenceProvider
 *
 * Provides intelligence events (patterns, learnings) as CanonicalEvents
 */

import { IDataProvider, ProviderConfig, ProviderCapabilities, ProviderContext } from '../base';
import { CanonicalEvent, EventType } from '../../events';
import { LearningSystem } from '../../intelligence/learning/LearningSystem';
import { LearningPattern } from '../../intelligence/learning/types';

export class IntelligenceProvider implements IDataProvider {
  readonly id = 'intelligence';
  readonly name = 'Agent-Brain Intelligence';
  readonly version = '0.1.0';
  readonly capabilities: ProviderCapabilities = {
    supportsBranches: false,
    supportsTimeRange: true,
    supportsIncrementalFetch: true,
    supportsRealtime: true
  };

  constructor(private learningSystem: LearningSystem) {}

  async initialize(config: ProviderConfig): Promise<void> {
    // Initialize learning system if needed
  }

  async fetchEvents(context: ProviderContext): Promise<CanonicalEvent[]> {
    const patterns = await this.learningSystem.getPatterns();
    return patterns.map(pattern => this.learningToEvent(pattern));
  }

  private learningToEvent(pattern: LearningPattern): CanonicalEvent {
    return {
      id: `learning-${pattern.id}`,
      type: EventType.LEARNING_STORED,
      timestamp: pattern.learnedAt || new Date(),
      title: `Learning: ${pattern.name}`,
      description: pattern.description,
      author: {
        id: 'agent-brain',
        name: 'Agent Brain',
        email: 'noreply@agent-brain.ai'
      },
      metadata: {
        category: pattern.category,
        confidence: pattern.confidenceScore,
        patternId: pattern.id
      }
    };
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }

  async dispose(): Promise<void> {
    // Cleanup if needed
  }
}
```

#### Step 6.5: Build and Test ✅

```bash
npm run build:core
npm run build:vscode
npm run test:pathways --prefix packages/vscode
```

**Git Checkpoint:**
```bash
git add .
git commit -m "refactor: move intelligence domain and create IntelligenceProvider"
```

---

### Phase 7: Agent Emissions (NEW Capability)

**Objective:** Create agent emission provider system with prompt-based event boundaries

**Estimated Time:** 4-5 hours

**Reference:** See [CANONICAL_EVENT_DESIGN.md](CANONICAL_EVENT_DESIGN.md) for full event model specification

#### Step 7.1: Create Agent Provider Structure ✅

```bash
mkdir -p packages/core/src/domains/providers/agents/adapters
```

**Structure:**
```
packages/core/src/domains/providers/agents/
├── AgentEmissionProvider.ts
├── adapters/
│   ├── IAgentAdapter.ts
│   ├── ClaudeCodeAdapter.ts
│   ├── CursorAdapter.ts
│   ├── CopilotAdapter.ts
│   └── index.ts
├── rollup/                      [NEW: Session rollup infrastructure]
│   ├── AgentActivityRollup.ts   [Accumulates activity between prompts]
│   ├── RollupToEventConverter.ts [Converts rollup to CanonicalEvent]
│   └── SessionBoundaryDetector.ts [Prompt detection + timeout logic]
├── types.ts
└── index.ts
```

#### Step 7.2: Define Agent Types ✅

**File:** `packages/core/src/domains/providers/agents/types.ts`

```typescript
/**
 * Raw agent emissions (not events)
 * These accumulate into a rollup between user prompts
 */
export interface AgentEmission {
  agent: 'claude' | 'cursor' | 'copilot' | string;
  timestamp: Date;
  type: 'file_edit' | 'command_execution' | 'chat_message' | 'suggestion_accepted' | 'user_prompt' | 'test_run';
  data: Record<string, any>;
}

/**
 * Activity rollup structure (between prompts)
 * This is NOT a CanonicalEvent - it's an intermediate aggregation
 */
export interface AgentActivityRollup {
  sessionId: string;
  agentId: string;

  // User Intent (explicit from prompt)
  userPrompt: string;           // "Add null safety to UserValidator"
  inferredIntent?: string;       // Optional AI classification

  // Temporal Boundaries
  startTime: Date;               // When user prompt received
  endTime?: Date;                // When next prompt or timeout

  // Accumulated Activities
  activities: {
    filesModified: FileModification[];
    testsRun: TestExecution[];
    commandsExecuted: CommandExecution[];
    errorsEncountered: ErrorEvent[];
  };

  // Aggregate Metrics
  totalEdits: number;
  totalFiles: number;
  totalLinesAdded: number;
  totalLinesRemoved: number;

  // State
  status: 'in-progress' | 'completed' | 'abandoned';

  // Quality
  testsPass: boolean;
  buildSuccess: boolean;
}

export interface FileModification {
  path: string;
  changeType: 'created' | 'modified' | 'deleted';
  linesAdded: number;
  linesRemoved: number;
  editCount: number;
  timestamp: Date;
}

export interface TestExecution {
  testFile: string;
  status: 'passed' | 'failed' | 'skipped';
  timestamp: Date;
  duration?: number;
}

export interface CommandExecution {
  command: string;
  exitCode: number;
  timestamp: Date;
  output?: string;
}

export interface ErrorEvent {
  message: string;
  file?: string;
  line?: number;
  timestamp: Date;
}

/**
 * Agent adapter interface - now handles rollup conversion
 */
export interface IAgentAdapter {
  agentType: string;
  canHandle(emission: any): boolean;

  // Event handlers
  onUserPrompt(prompt: string): void;
  onAgentActivity(activity: AgentEmission): void;
  onSessionEnd(): void;

  // Rollup management
  getCurrentRollup(): AgentActivityRollup | null;
  finalizeRollup(): AgentActivityRollup | null;
}
```

#### Step 7.3: Create ClaudeCodeAdapter ✅

**File:** `packages/core/src/domains/providers/agents/adapters/ClaudeCodeAdapter.ts`

```typescript
import { IAgentAdapter, AgentEmission, AgentActivityRollup, FileModification } from '../types';

/**
 * ClaudeCodeAdapter - Accumulates Claude Code activity between user prompts
 *
 * Event Boundary: User Prompt → Agent Work → Next User Prompt (or timeout)
 * Outputs: AgentActivityRollup (converted to CanonicalEvent by RollupToEventConverter)
 */
export class ClaudeCodeAdapter implements IAgentAdapter {
  readonly agentType = 'claude-code';

  private currentRollup: AgentActivityRollup | null = null;
  private idleTimer: NodeJS.Timeout | null = null;
  private readonly IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  canHandle(emission: any): boolean {
    return emission?.agent === 'claude' || emission?.source === 'claude-code';
  }

  /**
   * User prompt received - start new session, finalize previous
   */
  onUserPrompt(prompt: string): void {
    // Finalize previous rollup if exists
    if (this.currentRollup) {
      this.finalizeRollup();
    }

    // Start new rollup
    this.currentRollup = {
      sessionId: this.generateSessionId(),
      agentId: 'claude-code',
      userPrompt: prompt,
      startTime: new Date(),
      activities: {
        filesModified: [],
        testsRun: [],
        commandsExecuted: [],
        errorsEncountered: []
      },
      totalEdits: 0,
      totalFiles: 0,
      totalLinesAdded: 0,
      totalLinesRemoved: 0,
      status: 'in-progress',
      testsPass: false,
      buildSuccess: false
    };

    // Start idle watcher
    this.startIdleWatcher();
  }

  /**
   * Agent activity received - accumulate into current rollup
   */
  onAgentActivity(activity: AgentEmission): void {
    if (!this.currentRollup) {
      // No active session - ignore activity or create implicit session
      console.warn('ClaudeCodeAdapter: Activity received without active session');
      return;
    }

    // Accumulate based on activity type
    switch (activity.type) {
      case 'file_edit':
        this.accumulateFileEdit(activity);
        break;
      case 'test_run':
        this.accumulateTestRun(activity);
        break;
      case 'command_execution':
        this.accumulateCommand(activity);
        break;
    }

    // Reset idle timer on activity
    this.resetIdleWatcher();
  }

  /**
   * Session ended (IDE closed, user requested)
   */
  onSessionEnd(): void {
    if (this.currentRollup) {
      this.currentRollup.status = 'abandoned';
      this.finalizeRollup();
    }
  }

  /**
   * Get current rollup (for provider to convert to event)
   */
  getCurrentRollup(): AgentActivityRollup | null {
    return this.currentRollup;
  }

  /**
   * Finalize rollup and return it
   */
  finalizeRollup(): AgentActivityRollup | null {
    if (!this.currentRollup) {
      return null;
    }

    this.clearIdleWatcher();

    const rollup = {
      ...this.currentRollup,
      endTime: new Date(),
      status: this.currentRollup.status === 'in-progress' ? 'completed' : this.currentRollup.status
    };

    this.currentRollup = null;
    return rollup;
  }

  // Private accumulation methods

  private accumulateFileEdit(activity: AgentEmission): void {
    const fileModification: FileModification = {
      path: activity.data.file,
      changeType: activity.data.changeType || 'modified',
      linesAdded: activity.data.linesAdded || 0,
      linesRemoved: activity.data.linesRemoved || 0,
      editCount: 1,
      timestamp: activity.timestamp
    };

    this.currentRollup!.activities.filesModified.push(fileModification);
    this.currentRollup!.totalEdits++;
    this.currentRollup!.totalFiles = new Set(
      this.currentRollup!.activities.filesModified.map(f => f.path)
    ).size;
    this.currentRollup!.totalLinesAdded += fileModification.linesAdded;
    this.currentRollup!.totalLinesRemoved += fileModification.linesRemoved;
  }

  private accumulateTestRun(activity: AgentEmission): void {
    this.currentRollup!.activities.testsRun.push({
      testFile: activity.data.testFile,
      status: activity.data.status,
      timestamp: activity.timestamp,
      duration: activity.data.duration
    });

    // Update test pass status
    this.currentRollup!.testsPass = this.currentRollup!.activities.testsRun.every(
      t => t.status === 'passed' || t.status === 'skipped'
    );
  }

  private accumulateCommand(activity: AgentEmission): void {
    this.currentRollup!.activities.commandsExecuted.push({
      command: activity.data.command,
      exitCode: activity.data.exitCode || 0,
      timestamp: activity.timestamp,
      output: activity.data.output
    });
  }

  // Idle timeout management

  private startIdleWatcher(): void {
    this.clearIdleWatcher();
    this.idleTimer = setTimeout(() => {
      if (this.currentRollup) {
        this.currentRollup.status = 'completed'; // or 'abandoned' based on state
        this.finalizeRollup();
      }
    }, this.IDLE_TIMEOUT_MS);
  }

  private resetIdleWatcher(): void {
    this.startIdleWatcher();
  }

  private clearIdleWatcher(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  private generateSessionId(): string {
    return `claude-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

#### Step 7.4: Create RollupToEventConverter ✅

**File:** `packages/core/src/domains/providers/agents/rollup/RollupToEventConverter.ts`

```typescript
import { AgentActivityRollup } from '../types';
import { CanonicalEvent, EventType } from '../../../events';

/**
 * Converts AgentActivityRollup to CanonicalEvent
 * This is where rollup becomes a timeline-ready event
 */
export class RollupToEventConverter {
  convert(rollup: AgentActivityRollup): CanonicalEvent {
    return {
      id: this.generateEventId(rollup),
      canonicalId: this.generateCanonicalId(rollup),
      providerId: 'agent-emissions',
      type: EventType.AGENT_TASK_COMPLETED,
      timestamp: rollup.endTime || new Date(),

      // User's exact prompt as title
      title: rollup.userPrompt,

      // Auto-generated summary
      description: this.generateSummary(rollup),

      // Agent as author
      author: {
        id: rollup.agentId,
        name: this.getAgentDisplayName(rollup.agentId),
        email: 'agent@platform'
      },

      // Context - maintain compatibility with git events
      branches: [], // No git context for agent tasks
      hash: undefined,

      // Relationships
      parentIds: [], // Could link to previous task if tracked
      childIds: [],

      // Aggregate impact metrics
      impact: {
        filesChanged: rollup.totalFiles,
        linesAdded: rollup.totalLinesAdded,
        linesRemoved: rollup.totalLinesRemoved
      },

      // Visualization hints
      visualization: {
        icon: this.getAgentIcon(rollup.agentId),
        color: this.getAgentColor(rollup.agentId),
        priority: 'medium',
        tags: ['agent', rollup.agentId, ...(rollup.testsPass ? ['tests-pass'] : [])]
      },

      // Full rollup data in metadata for drill-down
      metadata: {
        userPrompt: rollup.userPrompt,
        sessionId: rollup.sessionId,
        sessionDuration: this.calculateDuration(rollup),
        idleTimeout: rollup.status === 'abandoned',

        // Detailed activities for drill-down
        activities: rollup.activities,

        // Quality indicators
        testsPass: rollup.testsPass,
        buildSuccess: rollup.buildSuccess,
        errorsEncountered: rollup.activities.errorsEncountered.length,

        // Agent metadata
        agentType: rollup.agentId,
        status: rollup.status
      }
    };
  }

  private generateEventId(rollup: AgentActivityRollup): string {
    return `agent-task-${rollup.startTime.getTime()}-${this.hashString(rollup.userPrompt)}`;
  }

  private generateCanonicalId(rollup: AgentActivityRollup): string {
    // Include prompt hash for deduplication
    return `agent-${rollup.agentId}-${this.hashString(rollup.userPrompt)}-${rollup.startTime.getTime()}`;
  }

  private generateSummary(rollup: AgentActivityRollup): string {
    const parts: string[] = [];

    if (rollup.totalFiles > 0) {
      parts.push(`Modified ${rollup.totalFiles} file${rollup.totalFiles > 1 ? 's' : ''}`);
    }

    if (rollup.totalLinesAdded > 0 || rollup.totalLinesRemoved > 0) {
      parts.push(`+${rollup.totalLinesAdded} -${rollup.totalLinesRemoved} lines`);
    }

    if (rollup.activities.testsRun.length > 0) {
      const passed = rollup.activities.testsRun.filter(t => t.status === 'passed').length;
      parts.push(`${passed}/${rollup.activities.testsRun.length} tests passed`);
    }

    if (rollup.activities.commandsExecuted.length > 0) {
      parts.push(`${rollup.activities.commandsExecuted.length} command${rollup.activities.commandsExecuted.length > 1 ? 's' : ''} run`);
    }

    return parts.join(', ') || 'Agent task completed';
  }

  private calculateDuration(rollup: AgentActivityRollup): number {
    if (!rollup.endTime) return 0;
    return (rollup.endTime.getTime() - rollup.startTime.getTime()) / 1000; // seconds
  }

  private getAgentDisplayName(agentId: string): string {
    const names: Record<string, string> = {
      'claude-code': 'Claude Code',
      'cursor': 'Cursor',
      'copilot': 'GitHub Copilot'
    };
    return names[agentId] || agentId;
  }

  private getAgentIcon(agentId: string): string {
    const icons: Record<string, string> = {
      'claude-code': '🤖',
      'cursor': '⚡',
      'copilot': '🚁'
    };
    return icons[agentId] || '🔧';
  }

  private getAgentColor(agentId: string): string {
    const colors: Record<string, string> = {
      'claude-code': '#C17E3A', // Claude brand color
      'cursor': '#0066CC',
      'copilot': '#2B3137'
    };
    return colors[agentId] || '#666666';
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
}
```

#### Step 7.5: Update AgentEmissionProvider ✅

**File:** `packages/core/src/domains/providers/agents/AgentEmissionProvider.ts`

```typescript
import { IDataProvider, ProviderConfig, ProviderCapabilities, ProviderContext } from '../base';
import { CanonicalEvent } from '../../events';
import { IAgentAdapter } from './types';
import { RollupToEventConverter } from './rollup/RollupToEventConverter';

/**
 * AgentEmissionProvider - Aggregates rollups from all agent adapters
 * Converts rollups to CanonicalEvents via RollupToEventConverter
 */
export class AgentEmissionProvider implements IDataProvider {
  readonly id = 'agent-emissions';
  readonly name = 'Agent Emissions';
  readonly version = '0.1.0';
  readonly capabilities: ProviderCapabilities = {
    supportsBranches: false,
    supportsTimeRange: true,
    supportsIncrementalFetch: true,
    supportsRealtime: true
  };

  private adapters: IAgentAdapter[] = [];
  private converter = new RollupToEventConverter();
  private completedEvents: CanonicalEvent[] = [];

  registerAdapter(adapter: IAgentAdapter): void {
    this.adapters.push(adapter);
  }

  async initialize(config: ProviderConfig): Promise<void> {
    // Initialize adapters if needed
  }

  async fetchEvents(context: ProviderContext): Promise<CanonicalEvent[]> {
    // Collect completed rollups from all adapters
    for (const adapter of this.adapters) {
      const rollup = adapter.finalizeRollup();
      if (rollup) {
        const event = this.converter.convert(rollup);
        this.completedEvents.push(event);
      }
    }

    // Filter by time range if specified
    if (context.timeRange) {
      const [start, end] = context.timeRange;
      return this.completedEvents.filter(e =>
        e.timestamp >= start && e.timestamp <= end
      );
    }

    return this.completedEvents;
  }

  /**
   * Called when user sends prompt to agent
   */
  onUserPrompt(agentType: string, prompt: string): void {
    const adapter = this.adapters.find(a => a.agentType === agentType);
    if (adapter) {
      adapter.onUserPrompt(prompt);
    }
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }

  async dispose(): Promise<void> {
    this.completedEvents = [];
    for (const adapter of this.adapters) {
      adapter.onSessionEnd();
    }
  }
}
```

#### Step 7.6: Extend EventType Enum ✅

**File:** `packages/core/src/domains/events/EventType.ts`

```typescript
export enum EventType {
  // ... existing types ...

  // Agent events (prompt-based)
  AGENT_TASK_COMPLETED = 'agent-task-completed',
  AGENT_TASK_ABANDONED = 'agent-task-abandoned',

  // ... rest of types ...
}
```

#### Step 7.6: Register Agent Provider in DataOrchestrator ✅

**File:** `packages/core/src/domains/visualization/orchestration/DataOrchestrator.ts`

```typescript
import { AgentEmissionProvider } from '../../providers/agents/AgentEmissionProvider';
import { ClaudeCodeAdapter } from '../../providers/agents/adapters/ClaudeCodeAdapter';

async initialize(): Promise<void> {
  // ... existing providers ...

  // Register Agent Emission provider
  const agentProvider = new AgentEmissionProvider();
  agentProvider.registerAdapter(new ClaudeCodeAdapter());

  await this.providerRegistry.registerProvider(agentProvider, {
    enabled: true,
    priority: 4
  });
}
```

#### Step 7.7: Build and Test ✅

```bash
npm run build:core
npm run build:vscode
npm run test:pathways --prefix packages/vscode
```

**Git Checkpoint:**
```bash
git add .
git commit -m "feat: add agent emission provider system with ClaudeCodeAdapter"
```

---

### Phase 8: Extension Wrapper

**Objective:** Create minimal extension package

**Estimated Time:** 2-3 hours

#### Step 8.1: Create Extension Package ✅

```bash
mkdir -p packages/extension/src
```

**File:** `packages/extension/package.json`

```json
{
  "name": "@agent-brain/extension",
  "displayName": "Agent Brain Platform",
  "description": "Unified platform for AI-assisted development",
  "version": "0.1.0",
  "publisher": "agent-brain",
  "engines": {
    "vscode": "^1.80.0"
  },
  "main": "./dist/extension.js",
  "dependencies": {
    "@agent-brain/core": "^0.1.0"
  },
  "devDependencies": {
    "@types/vscode": "^1.80.0",
    "@vscode/vsce": "^2.22.0",
    "typescript": "^5.9.2",
    "webpack": "^5.101.3"
  },
  "scripts": {
    "build": "webpack --mode production",
    "watch": "webpack --mode development --watch",
    "package": "vsce package"
  }
}
```

#### Step 8.2: Move Extension Entry Point ✅

**File:** `packages/extension/src/extension.ts`

```typescript
import * as vscode from 'vscode';
import { ExtensionActivator } from '@agent-brain/core/domains/extension/activation';

let activator: ExtensionActivator;

export async function activate(context: vscode.ExtensionContext) {
  activator = new ExtensionActivator(context);
  await activator.activate();
}

export function deactivate() {
  if (activator) {
    activator.deactivate();
  }
}
```

#### Step 8.3: Create ExtensionActivator in Core ✅

**File:** `packages/core/src/domains/extension/activation/ExtensionActivator.ts`

```typescript
import * as vscode from 'vscode';
import { TimelineProvider } from '../providers/TimelineProvider';
import { WelcomeViewProvider } from '../providers/WelcomeViewProvider';

export class ExtensionActivator {
  constructor(private context: vscode.ExtensionContext) {}

  async activate(): Promise<void> {
    // Register providers, commands, etc.
    // (Move logic from current extension.ts)
  }

  deactivate(): void {
    // Cleanup
  }
}
```

#### Step 8.4: Configure Extension Build ✅

**File:** `packages/extension/webpack.config.js`

```javascript
const path = require('path');

module.exports = {
  target: 'node',
  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2'
  },
  externals: {
    vscode: 'commonjs vscode'
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@agent-brain/core': path.resolve(__dirname, '../core/dist')
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  }
};
```

#### Step 8.5: Build and Test ✅

```bash
npm run build:core
npm run build:extension

# Package extension
cd packages/extension && vsce package
```

**Verification:**
- Extension packages successfully
- .vsix file created
- Install and test in VSCode

**Git Checkpoint:**
```bash
git add .
git commit -m "feat: create minimal extension wrapper package"
```

---

### Phase 9: Pathway Tests Expansion

**Objective:** Add pathway tests for new domains

**Estimated Time:** 3-4 hours

#### Step 9.1: Move Existing Pathway Tests to Core ✅

```bash
# Move pathway tests
cp -r packages/vscode/tests/pathways/* packages/core/tests/pathways/

# Organize by domain
mkdir -p packages/core/tests/pathways/{intelligence,providers,visualization,integration}

# Move existing tests to visualization/
mv packages/core/tests/pathways/*.pathway.test.ts packages/core/tests/pathways/visualization/
```

#### Step 9.2: Create Intelligence Pathway Tests ✅

**File:** `packages/core/tests/pathways/intelligence/pattern-detection.pathway.test.ts`

```typescript
import { PathwayAsserter } from '@agent-brain/core/infrastructure/testing';
import { LogPathway } from '@agent-brain/core/infrastructure/logging';
import { AgentBrainCore } from '@agent-brain/core/domains/intelligence';

describe('Pattern Detection Pathway', () => {
  it('should complete pattern detection pathway', async () => {
    const asserter = new PathwayAsserter(LogPathway.PATTERN_DETECTION)
      .expectMilestone('AgentBrainCore.analyzeDocument')
      .expectMilestone('PatternEngine.validateCode')
      .expectMilestone('PatternValidator.checkPattern');

    const core = new AgentBrainCore();
    await core.analyzeDocument('const x = null; x.prop;', {
      filePath: 'test.ts',
      language: 'typescript',
      fileType: 'source'
    });

    expect(asserter).toCompletePathway();
  });
});
```

**File:** `packages/core/tests/pathways/intelligence/learning-cycle.pathway.test.ts`

```typescript
describe('Learning Cycle Pathway', () => {
  it('should complete learning cycle pathway', async () => {
    const asserter = new PathwayAsserter(LogPathway.LEARNING_CYCLE)
      .expectMilestone('LearningSystem.processFailure')
      .expectMilestone('LearningAnalyzer.analyzeFailure')
      .expectMilestone('LearningStorage.storePattern');

    const learningSystem = new LearningSystem();
    await learningSystem.processFailure({
      test: 'null check test',
      error: 'Cannot read property of null',
      file: 'test.ts',
      context: { timestamp: new Date() }
    });

    expect(asserter).toCompletePathway();
  });
});
```

#### Step 9.3: Create Provider Pathway Tests ✅

**File:** `packages/core/tests/pathways/providers/agent-emission-ingestion.pathway.test.ts`

```typescript
describe('Agent Emission Ingestion Pathway', () => {
  it('should complete agent emission to timeline pathway', async () => {
    const asserter = new PathwayAsserter(LogPathway.DATA_INGESTION)
      .expectMilestone('AgentEmissionProvider.fetchEvents')
      .expectMilestone('ClaudeCodeAdapter.convertToEvent')
      .expectMilestone('DataOrchestrator.aggregateEvents');

    const provider = new AgentEmissionProvider();
    provider.registerAdapter(new ClaudeCodeAdapter());

    provider.addEmission({
      agent: 'claude',
      timestamp: new Date(),
      type: 'file_edit',
      data: { file: 'test.ts', changes: '+5 -2' }
    });

    const events = await provider.fetchEvents({});

    expect(asserter).toCompletePathway();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe(EventType.AGENT_FILE_EDIT);
  });
});
```

#### Step 9.4: Create Integration Pathway Tests ✅

**File:** `packages/core/tests/pathways/integration/agent-to-learning.pathway.test.ts`

```typescript
describe('Agent Emission to Learning Pathway', () => {
  it('should process agent emission through learning system', async () => {
    const asserter = new PathwayAsserter(LogPathway.LEARNING_CYCLE)
      .expectMilestone('AgentEmissionProvider.fetchEvents')
      .expectMilestone('LearningSystem.processEvent')
      .expectMilestone('IntelligenceProvider.fetchEvents');

    // Agent emits activity
    const agentProvider = new AgentEmissionProvider();
    agentProvider.addEmission({
      agent: 'claude',
      type: 'file_edit',
      timestamp: new Date(),
      data: { file: 'validator.ts', pattern: 'null-check' }
    });

    const agentEvents = await agentProvider.fetchEvents({});

    // Learning system processes it
    const learningSystem = new LearningSystem();
    await learningSystem.processEvent(agentEvents[0]);

    // Intelligence provider exposes learning
    const intelligenceProvider = new IntelligenceProvider(learningSystem);
    const learningEvents = await intelligenceProvider.fetchEvents({});

    expect(asserter).toCompletePathway();
    expect(learningEvents).toContainEqual(
      expect.objectContaining({ type: EventType.LEARNING_STORED })
    );
  });
});
```

#### Step 9.5: Configure Jest in Core Package ✅

**File:** `packages/core/jest.config.js`

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.pathway.test.ts'],
  projects: [
    {
      displayName: 'Intelligence Pathways',
      testMatch: ['<rootDir>/tests/pathways/intelligence/**/*.pathway.test.ts']
    },
    {
      displayName: 'Provider Pathways',
      testMatch: ['<rootDir>/tests/pathways/providers/**/*.pathway.test.ts']
    },
    {
      displayName: 'Integration Pathways',
      testMatch: ['<rootDir>/tests/pathways/integration/**/*.pathway.test.ts']
    }
  ]
};
```

#### Step 9.6: Run All Pathway Tests ✅

```bash
# Run core pathway tests
npm run test:pathways --prefix packages/core

# Run vscode pathway tests
npm run test:pathways --prefix packages/vscode

# Run all pathway tests
npm run test:pathways
```

**Expected:** 200+ pathway tests passing (149 existing + ~50 new)

**Git Checkpoint:**
```bash
git add .
git commit -m "test: add pathway tests for intelligence and agent emission domains"
```

---

### Phase 10: Final Integration

**Objective:** Complete visualization registry and finalize

**Estimated Time:** 2-3 hours

#### Step 10.1: Implement Visualization Registry ✅

**File:** `packages/core/src/infrastructure/registries/VisualizationRegistry.ts`

```typescript
import { Registry } from './Registry';
import { CanonicalEvent } from '../../domains/events';

export interface IVisualization {
  id: string;
  name: string;
  version: string;
  capabilities: VisualizationCapabilities;
  render(events: CanonicalEvent[]): Promise<void>;
  update(events: CanonicalEvent[]): Promise<void>;
  destroy(): void;
  isHealthy(): Promise<boolean>;
}

export interface VisualizationCapabilities {
  supportsInteraction: boolean;
  supportsRealtime: boolean;
  maxEvents: number;
}

export class VisualizationRegistry extends Registry<IVisualization> {
  async createVisualization(
    id: string,
    container: HTMLElement
  ): Promise<IVisualization> {
    const viz = this.get(id);
    if (!viz) {
      throw new Error(`Visualization '${id}' not found`);
    }
    return viz;
  }
}
```

#### Step 10.2: Register Timeline Visualization ✅

**File:** `packages/core/src/domains/visualization/timeline/TimelineVisualization.ts`

```typescript
import { IVisualization, VisualizationCapabilities } from '../../../infrastructure/registries/VisualizationRegistry';
import { CanonicalEvent } from '../../events';
import { D3TimelineRenderer } from './D3TimelineRenderer';

export class TimelineVisualization implements IVisualization {
  readonly id = 'timeline';
  readonly name = 'Timeline Visualization';
  readonly version = '0.1.0';
  readonly capabilities: VisualizationCapabilities = {
    supportsInteraction: true,
    supportsRealtime: true,
    maxEvents: 10000
  };

  private renderer: D3TimelineRenderer;

  constructor(container: HTMLElement) {
    this.renderer = new D3TimelineRenderer(container);
  }

  async render(events: CanonicalEvent[]): Promise<void> {
    await this.renderer.render(events);
  }

  async update(events: CanonicalEvent[]): Promise<void> {
    await this.renderer.update(events);
  }

  destroy(): void {
    this.renderer.destroy();
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }
}
```

#### Step 10.3: Update DataOrchestrator to Use Registry ✅

**File:** `packages/core/src/domains/visualization/orchestration/DataOrchestrator.ts`

```typescript
import { VisualizationRegistry } from '../../../infrastructure/registries/VisualizationRegistry';

export class DataOrchestrator {
  constructor(
    private providers: DataProviderRegistry,
    private visualizations: VisualizationRegistry
  ) {}

  async renderEvents(events: CanonicalEvent[], visualizationId: string = 'timeline'): Promise<void> {
    const viz = this.visualizations.get(visualizationId);
    if (viz) {
      await viz.render(events);
    }
  }
}
```

#### Step 10.4: Package Extension ✅

```bash
# Build all packages
npm run build

# Package extension
npm run package:extension

# Verify .vsix created
ls -lh packages/extension/*.vsix
```

**Expected:** `agent-brain-platform-0.1.0.vsix` created successfully

#### Step 10.5: Final Verification ✅

**Checklist:**
- [ ] All pathway tests passing (200+)
- [ ] Extension builds without errors
- [ ] Extension packages successfully
- [ ] Install extension in VSCode and verify:
  - [ ] Timeline displays git commits
  - [ ] Filters work correctly
  - [ ] Range selector functions
  - [ ] No console errors

**Git Checkpoint:**
```bash
git add .
git commit -m "feat: complete migration to unified architecture with visualization registry"
```

---

## Post-Migration Cleanup

### Step 11: Remove Old vscode Package ✅

**After verifying extension works:**

```bash
# Remove old vscode package
git rm -r packages/vscode/

# Update lerna.json if needed
# Update root package.json scripts
```

**Git Checkpoint:**
```bash
git commit -m "chore: remove old vscode package after successful migration"
```

### Step 12: Update Documentation ✅

**Update README.md:**
```markdown
# Agent-Brain Platform

Unified platform for AI-assisted development with:
- Timeline visualization of all development events
- Pattern intelligence and learning
- Pathway-based testing

## Architecture

- `packages/core/` - Unified platform with domain-driven architecture
- `packages/extension/` - Minimal VSCode extension wrapper
```

**Update ARCHITECTURE.md to point to V3:**
```bash
mv ARCHITECTURE_DESIGN_V3.md docs/ARCHITECTURE.md
```

**Git Checkpoint:**
```bash
git add .
git commit -m "docs: update documentation for unified architecture"
```

---

## Rollback Procedures

### If Phase Fails

Each phase has a git checkpoint. To rollback:

```bash
# View commits
git log --oneline

# Rollback to specific commit
git reset --hard <commit-hash>

# Or rollback last commit
git reset --hard HEAD~1
```

### If Extension Breaks

```bash
# Verify current extension works first
cd packages/vscode
npm run build
vsce package
# Install and test this .vsix - keep as backup!

# During migration, if something breaks:
git stash  # Save current work
git checkout <last-working-commit>
npm run build:vscode
# Test, identify issue, fix, retry
```

### Critical Preservation Points

**Before each major change:**
```bash
# Create backup branch
git checkout -b backup-before-phase-X

# Make changes
git checkout main

# If things break:
git checkout backup-before-phase-X
```

---

## Success Criteria

### Must Pass Before Moving to Next Phase

**After Each Phase:**
1. ✅ TypeScript compiles without errors: `tsc --noEmit`
2. ✅ Core package builds: `npm run build:core`
3. ✅ Extension package builds: `npm run build:vscode` (or `build:extension`)
4. ✅ Pathway tests pass: `npm run test:pathways`
5. ✅ Extension packages: `vsce package` succeeds

**Final Success:**
1. ✅ 200+ pathway tests passing
2. ✅ Extension installs and runs in VSCode
3. ✅ Timeline visualization works
4. ✅ Agent emissions can be added
5. ✅ Learning system processes events
6. ✅ Visualization registry functional

---

## Time Estimates Summary

| Phase | Description | Time | Cumulative |
|-------|-------------|------|------------|
| 1 | Foundation & Cleanup | 2-3h | 2-3h |
| 2 | Domain: Events | 1-2h | 3-5h |
| 3 | Domain: Providers | 2-3h | 5-8h |
| 4 | Domain: Visualization | 2-3h | 7-11h |
| 5 | Infrastructure | 2-3h | 9-14h |
| 6 | Domain: Intelligence | 3-4h | 12-18h |
| 7 | Agent Emissions | 4-5h | 16-23h |
| 8 | Extension Wrapper | 2-3h | 18-26h |
| 9 | Pathway Tests | 3-4h | 21-30h |
| 10 | Final Integration | 2-3h | 23-33h |
| **Total** | | **23-33 hours** | |

**Spread over:** 3-5 days of focused work

---

## Notes & Considerations

### Import Path Strategy

**Use TypeScript path mapping:**
```json
{
  "compilerOptions": {
    "paths": {
      "@agent-brain/core/*": ["../core/src/*"]
    }
  }
}
```

**This allows:**
```typescript
import { CanonicalEvent } from '@agent-brain/core/domains/events';
```

**Instead of:**
```typescript
import { CanonicalEvent } from '../../../core/src/domains/events';
```

### Webpack Configuration

**Critical:** Update webpack aliases when moving files:
```javascript
resolve: {
  alias: {
    '@core': path.resolve(__dirname, '../core/src'),
    '@visualization': path.resolve(__dirname, '../core/src/domains/visualization')
  }
}
```

### Testing Strategy

**Run tests frequently:**
```bash
# Quick check
npm run build:core && npm run build:vscode

# Full check
npm run test:pathways

# Specific pathway
npm test -- filter-apply.pathway.test.ts
```

### Dependencies Management

**After moving code:**
```bash
# Update package-lock.json
npm install

# Clean install if needed
rm -rf node_modules package-lock.json
npm install
```

---

## Conclusion

This migration plan:

1. ✅ **Preserves working functionality** - Extension works at every checkpoint
2. ✅ **Tests incrementally** - Pathway tests verify each change
3. ✅ **Maintains git history** - Clean commits with rollback points
4. ✅ **Enables new capabilities** - Agent emissions, learning, viz registry
5. ✅ **Follows approved architecture** - Implements ARCHITECTURE_DESIGN_V3.md
6. ✅ **Pragmatic execution** - 23-33 hours over 3-5 days

**Ready for execution.**

---

**Next Step:** Begin Phase 1 after plan approval.
