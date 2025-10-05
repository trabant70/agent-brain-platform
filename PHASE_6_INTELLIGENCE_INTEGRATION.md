# Phase 6: Intelligence Domain Integration - Detailed Plan

**Status:** Ready for Implementation
**Estimated Time:** 6-8 hours (NOT rushed)
**Date:** 2025-10-05

---

## Executive Summary

Phase 6 integrates the agent-brain intelligence domain (~4,500 LOC) into the unified architecture. This is **NOT** a simple copy-paste—it requires careful refactoring to:

1. **Preserve all intelligence capabilities** (patterns, learning, extensions, webhooks)
2. **Fix architectural inconsistencies** (type conflicts, import paths)
3. **Integrate with unified event system** (IntelligenceProvider as data source)
4. **Prepare for pathway testing** (adapt to pathway framework)
5. **Enable future agent emissions** (learning from coding agents)

---

## Current State Analysis

### What We Have in Backup (`packages/core-agent-brain-backup/`)

```
src/
├── api/                          [6 files, ~1,200 LOC]
│   ├── extension-api.ts          ✅ Extension system (KEEP)
│   ├── extension-loader.ts       ✅ Plugin loader (KEEP)
│   ├── websocket.ts              ✅ Real-time events (KEEP)
│   ├── types.ts                  ⚠️ Runtime types (CONFLICTS with learning types)
│   ├── dashboard-api.ts          ❌ Separate dashboard API (ELIMINATE)
│   └── server.ts                 ❌ Standalone server (ELIMINATE for now)
│
├── engine/                       [1 file, ~300 LOC]
│   └── agent-brain-core.ts       ⚠️ Main orchestrator (REFACTOR)
│
├── learning/                     [5 files, ~1,400 LOC]
│   ├── analyzer.ts               ✅ Learning analyzer (KEEP)
│   ├── storage.ts                ✅ Learning storage (KEEP)
│   ├── propagator.ts             ✅ Learning propagator (KEEP)
│   ├── pattern-converter.ts      ⚠️ Converts to runtime Pattern (REVIEW)
│   └── index.ts                  ✅ Learning system (KEEP)
│
├── patterns/                     [3 files, ~900 LOC]
│   ├── engine.ts                 ✅ Pattern engine (KEEP)
│   ├── validator.ts              ✅ Pattern validator (KEEP)
│   └── index.ts                  ✅ Pattern system (KEEP)
│
└── versioning/                   [1 file, ~250 LOC]
    └── pattern-version-control.ts ✅ Pattern versioning (KEEP)
```

### Key Architectural Issues Identified

#### 1. **Type System Conflict** 🔴 CRITICAL
```typescript
// api/types.ts defines runtime Pattern:
interface Pattern {
  id: string;
  name: string;
  trigger: RegExp | string;
  severity: 'error' | 'warning' | 'info';
  // ... runtime fields
}

// patterns/engine.ts defines EnginePattern:
interface EnginePattern {
  id: string;
  name: string;
  trigger: RegExp | string;
  severity: 'error' | 'warning' | 'suggestion';
  autoFix?: { enabled: boolean; transform: Function };
  // ... engine-specific fields
}

// learning/analyzer.ts defines LearningPattern:
interface LearningPattern {
  id?: string;
  name: string;
  category: string;
  rootCause: any;
  preventionRule: any;
  // ... learning-specific fields
}

❌ THREE DIFFERENT "Pattern" types!
```

**Resolution Strategy:**
- `api/types.ts` → `adapters/base/RuntimeTypes.ts` (for extension API)
- `patterns/engine.ts` → Keep `EnginePattern` (pattern matching)
- `learning/analyzer.ts` → Keep `LearningPattern` (learned knowledge)
- Create clear conversion functions between types

#### 2. **Circular Dependencies** 🔴 CRITICAL
```typescript
// agent-brain-core.ts imports from api/types.ts
import { Pattern, PatternMatcher } from '../api/types';

// api/types.ts imports from learning
import { LearningPattern } from '../learning';

// learning/pattern-converter.ts imports from api/types
import { Pattern } from '../api/types';

❌ Circular import chain!
```

**Resolution Strategy:**
- Move shared interfaces to `adapters/base/`
- Engine and Learning don't import from each other
- AgentBrainCore orchestrates, doesn't depend on runtime types

#### 3. **Dashboard API Duplication** 🟡 MEDIUM
```typescript
// dashboard-api.ts provides REST endpoints:
GET /api/patterns      // Get all patterns
GET /api/learnings     // Get all learnings
GET /api/metrics       // Get learning metrics

❌ This duplicates provider functionality!
```

**Resolution Strategy:**
- **Phase 6:** Skip dashboard API entirely
- **Phase 7:** Dashboard becomes a Visualization consuming from DataOrchestrator
- IntelligenceProvider provides all data via CanonicalEvents

#### 4. **Pathway Testing Gap** 🟡 MEDIUM
```
Agent-brain has traditional unit tests:
- __tests__/patterns/engine.test.ts
- __tests__/learning/analyzer.test.ts

But NO pathway tests!

Timeline has:
- 149 pathway tests
- PathwayAsserter framework
- AI-debuggable output
```

**Resolution Strategy:**
- **Phase 6:** Keep existing unit tests, run them
- **Phase 7:** Create intelligence pathway tests:
  - `pattern-detection.pathway.test.ts`
  - `learning-cycle.pathway.test.ts`
  - `extension-loading.pathway.test.ts`
  - `intelligence-provider.pathway.test.ts`

---

## Refined Architecture: Intelligence Domain

### Correct Structure (Based on Analysis)

```
packages/core/src/domains/intelligence/
│
├── core/                         [Core Intelligence Logic]
│   ├── engine/
│   │   └── AgentBrainCore.ts    [Main orchestrator - REFACTORED]
│   ├── patterns/
│   │   ├── PatternEngine.ts     [Pattern matching engine]
│   │   ├── PatternValidator.ts  [Validate patterns against ADRs]
│   │   ├── PatternSystem.ts     [Facade for pattern operations]
│   │   └── types.ts             [EnginePattern, EnginePatternContext]
│   ├── learning/
│   │   ├── LearningAnalyzer.ts  [Extract patterns from failures]
│   │   ├── LearningStorage.ts   [Persist learnings]
│   │   ├── LearningPropagator.ts [Apply learnings across codebase]
│   │   ├── LearningSystem.ts    [Facade for learning operations]
│   │   └── types.ts             [LearningPattern, TestFailure]
│   └── versioning/
│       └── PatternVersionControl.ts [Pattern versioning]
│
├── adapters/                     [Input Mechanisms - THE CORE CAPABILITY]
│   ├── base/
│   │   ├── IntelligenceAdapter.ts [Base adapter interface]
│   │   └── RuntimeTypes.ts      [Extension API types - from api/types.ts]
│   ├── extensions/              [Plugin System]
│   │   ├── ExtensionAPI.ts      [FROM: api/extension-api.ts]
│   │   ├── ExtensionLoader.ts   [FROM: api/extension-loader.ts]
│   │   └── ExtensionRegistry.ts [NEW: Registry for extensions]
│   ├── webhooks/                [Real-time Events]
│   │   ├── WebSocketAdapter.ts  [FROM: api/websocket.ts]
│   │   └── AnalysisTrigger.ts   [NEW: REST trigger handler]
│   ├── testing/                 [Test Integration]
│   │   └── PathwayLearningAdapter.ts [NEW: Pathway tests → Learning]
│   └── agents/                  [FUTURE: Phase 9]
│       └── AgentEmissionAdapter.ts [Agent work → Learning]
│
├── converters/                   [Type Conversions]
│   ├── PatternConverter.ts      [FROM: learning/pattern-converter.ts]
│   └── TypeBridges.ts          [NEW: Bridge Runtime ↔ Engine ↔ Learning types]
│
└── index.ts                      [Unified exports]
```

### Type System Resolution

```typescript
// Clear separation of concerns:

// 1. Runtime Types (for Extension API)
// adapters/base/RuntimeTypes.ts
export interface RuntimePattern {
  id: string;
  name: string;
  trigger: RegExp | string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  source: string;
}

// 2. Engine Types (for Pattern Matching)
// core/patterns/types.ts
export interface EnginePattern {
  id: string;
  name: string;
  category: EnginePatternCategory;
  trigger: RegExp | string;
  severity: 'error' | 'warning' | 'suggestion';
  message: string;
  autoFix?: AutoFixConfig;
  metadata?: Record<string, any>;
}

// 3. Learning Types (for Knowledge Storage)
// core/learning/types.ts
export interface LearningPattern {
  id?: string;
  name: string;
  category: string;
  description: string;
  rootCause: any;
  preventionRule: any;
  confidenceScore?: number;
  occurrences?: number;
}

// 4. Type Converters (Bridge between worlds)
// converters/TypeBridges.ts
export class TypeBridges {
  static runtimeToEngine(runtime: RuntimePattern): EnginePattern { ... }
  static engineToLearning(engine: EnginePattern): LearningPattern { ... }
  static learningToEngine(learning: LearningPattern): EnginePattern { ... }
}
```

---

## Implementation Plan: Phase 6A-6E

### Phase 6A: Fix Type System (2 hours)

**Goal:** Resolve type conflicts before copying files

**Steps:**
1. Create `core/patterns/types.ts` - Extract EnginePattern and related types
2. Create `core/learning/types.ts` - Extract LearningPattern and TestFailure
3. Create `adapters/base/RuntimeTypes.ts` - Move api/types.ts content here
4. Create `converters/TypeBridges.ts` - Bridge functions
5. Update all imports in backup to use new paths (dry run, don't copy yet)

**Verification:**
- All types compile independently
- No circular dependencies
- Clear ownership of each type

---

### Phase 6B: Copy Core Intelligence (1.5 hours)

**Goal:** Copy patterns, learning, engine with fixed imports

**Steps:**
1. Copy `patterns/` → `core/patterns/` (using new types.ts)
2. Copy `learning/` → `core/learning/` (using new types.ts)
3. Copy `engine/` → `core/engine/` (refactored to use new structure)
4. Copy `versioning/` → `core/versioning/`
5. Update all imports to use `@agent-brain/core` paths

**Files to refactor:**
```typescript
// core/engine/AgentBrainCore.ts - REFACTORED VERSION
export class AgentBrainCore {
  constructor(
    private patternSystem: PatternSystem,
    private learningSystem: LearningSystem,
    private extensionLoader?: ExtensionLoader
  ) {}

  async analyzeDocument(code: string, context: AnalysisContext): Promise<AnalysisResult> {
    // Use PatternSystem directly
    const validation = this.patternSystem.validateCode(code, context);

    // Learn from results
    if (validation.matches.length > 0) {
      // Convert EnginePattern matches to learning input
      // ...
    }

    return {
      patterns: validation.matches,
      interventions: this.generateInterventions(validation),
      learnings: []
    };
  }
}
```

**Verification:**
- `npm run build` in core package succeeds
- No circular dependencies
- All exports available

---

### Phase 6C: Copy Intelligence Adapters (1.5 hours)

**Goal:** Copy extension system, webhooks with proper structure

**Steps:**
1. Copy `api/extension-api.ts` → `adapters/extensions/ExtensionAPI.ts`
2. Copy `api/extension-loader.ts` → `adapters/extensions/ExtensionLoader.ts`
3. Create `adapters/extensions/ExtensionRegistry.ts` (NEW)
4. Copy `api/websocket.ts` → `adapters/webhooks/WebSocketAdapter.ts`
5. Create `adapters/webhooks/AnalysisTrigger.ts` (NEW - REST endpoints)
6. Update imports to use RuntimeTypes from `adapters/base/`

**New ExtensionRegistry:**
```typescript
// adapters/extensions/ExtensionRegistry.ts
export class ExtensionRegistry {
  private extensions = new Map<string, AgentBrainExtension>();

  register(extension: AgentBrainExtension): void {
    this.extensions.set(extension.name, extension);
  }

  getAll(): AgentBrainExtension[] {
    return Array.from(this.extensions.values());
  }

  getAllPatterns(): RuntimePattern[] {
    return this.getAll()
      .flatMap(ext => ext.patterns?.() || []);
  }
}
```

**Verification:**
- Extensions can load
- WebSocket adapter compiles
- No import errors

---

### Phase 6D: Create IntelligenceProvider (1 hour)

**Goal:** Wrap intelligence as a data provider

**Already created** in previous work, but needs updating:

```typescript
// providers/intelligence/IntelligenceProvider.ts - UPDATED
export class IntelligenceProvider implements IDataProvider {
  readonly id = 'intelligence';
  readonly name = 'Agent-Brain Intelligence';

  constructor(
    private learningSystem: LearningSystem,
    private patternSystem: PatternSystem
  ) {}

  async fetchEvents(): Promise<CanonicalEvent[]> {
    const events: CanonicalEvent[] = [];

    // Get learnings as events
    const learnings = await this.learningSystem.getPatterns();
    events.push(...learnings.map(l => this.learningToEvent(l)));

    // Get patterns as events
    const patterns = this.patternSystem.getPatterns();
    events.push(...patterns.map(p => this.patternToEvent(p)));

    return events;
  }

  private learningToEvent(learning: LearningPattern): CanonicalEvent {
    return {
      id: `learning-${learning.id}`,
      type: EventType.LEARNING_STORED,
      timestamp: new Date(),
      title: `Learning: ${learning.name}`,
      description: learning.description,
      // ... full mapping
    };
  }
}
```

**Verification:**
- IntelligenceProvider compiles
- fetchEvents() returns CanonicalEvent[]
- Types align correctly

---

### Phase 6E: Create PathwayLearningAdapter (1 hour)

**Goal:** Connect pathway test failures to learning system

**Already created**, but verify integration:

```typescript
// adapters/testing/PathwayLearningAdapter.ts
export class PathwayLearningAdapter implements ITestFailureAdapter {
  async processFailure(pathwayFailure: PathwayTestFailure): Promise<LearningPattern[]> {
    const testFailure: TestFailure = {
      test: pathwayFailure.testName,
      error: pathwayFailure.failedAtMilestone,
      file: 'pathway-test',
      context: {
        timestamp: new Date(),
        // Include pathway debugging data
        hypotheses: pathwayFailure.debugAnalysis.hypotheses,
        checklist: pathwayFailure.debugAnalysis.checklist
      }
    };

    return this.learningSystem.processFailure(testFailure);
  }
}
```

**Verification:**
- Adapter compiles
- Can process PathwayTestFailure
- Integrates with LearningSystem

---

## Integration with Existing Systems

### 1. Provider Registry Integration

```typescript
// domains/visualization/orchestration/DataOrchestrator.ts
import { IntelligenceProvider } from '../../providers/intelligence';
import { LearningSystem, PatternSystem } from '../../intelligence';

async initialize(): Promise<void> {
  // ... existing providers ...

  // Create intelligence systems
  const learningSystem = new LearningSystem({
    storage: new FileLearningStorage('.agent-brain/learnings.json')
  });
  const patternSystem = new PatternSystem({
    enableValidation: true,
    enableConflictChecking: true
  });

  // Create provider
  const intelligenceProvider = new IntelligenceProvider(
    learningSystem,
    patternSystem
  );

  await this.providerRegistry.registerProvider(intelligenceProvider, {
    enabled: true,
    priority: 3
  });
}
```

### 2. Extension System Integration

```typescript
// Extension loading at startup
import { ExtensionLoader, ExtensionRegistry } from '@agent-brain/core/domains/intelligence/adapters/extensions';

const extensionRegistry = new ExtensionRegistry();
const extensionLoader = new ExtensionLoader(context);

// Load from npm packages (@agent-brain-ext/*)
await extensionLoader.loadFromPackages();

// Load local extensions
await extensionLoader.loadLocal('.agent-brain/extensions');

// Get patterns from all extensions
const extensionPatterns = extensionRegistry.getAllPatterns();

// Register with pattern system
for (const pattern of extensionPatterns) {
  await patternSystem.registerPattern(pattern);
}
```

### 3. WebSocket Real-time Events

```typescript
// Optional: Real-time learning notifications
import { AgentBrainWebSocket } from '@agent-brain/core/domains/intelligence/adapters/webhooks';

const wsAdapter = new AgentBrainWebSocket(httpServer);

// Emit when patterns discovered
learningSystem.on('pattern-stored', (pattern) => {
  wsAdapter.broadcastPatternDiscovered(pattern);
});
```

---

## Pathway Testing Strategy (Phase 7)

### Intelligence Pathway Tests to Create

```
packages/core/tests/pathways/intelligence/
├── pattern-detection.pathway.test.ts
│   └─ Test: Code → PatternEngine → Pattern detected
│
├── learning-cycle.pathway.test.ts
│   └─ Test: Failure → Analyzer → Storage → Pattern
│
├── extension-loading.pathway.test.ts
│   └─ Test: npm package → ExtensionLoader → Patterns registered
│
├── pathway-learning-adapter.pathway.test.ts
│   └─ Test: PathwayFailure → Adapter → Learning stored
│
└── intelligence-provider.pathway.test.ts
    └─ Test: Learning → Provider → CanonicalEvent
```

### Example Pathway Test

```typescript
// pattern-detection.pathway.test.ts
describe('Pattern Detection Pathway', () => {
  it('should complete pattern detection pathway', async () => {
    const asserter = new PathwayAsserter(LogPathway.PATTERN_DETECTION)
      .expectMilestone('AgentBrainCore.analyzeDocument')
      .expectMilestone('PatternEngine.validateCode')
      .expectMilestone('PatternValidator.checkPattern');

    const core = new AgentBrainCore();
    await core.analyzeDocument('const x = null; x.prop;', {
      filePath: 'test.ts',
      language: 'typescript'
    });

    expect(asserter).toCompletePathway();
  });
});
```

---

## Agent Emissions Integration (Future - Phase 9)

### AgentEmissionAdapter (Learning Input)

```typescript
// adapters/agents/AgentEmissionAdapter.ts
export class AgentEmissionAdapter implements IIntelligenceAdapter {
  constructor(
    private learningSystem: LearningSystem,
    private patternSystem: PatternSystem
  ) {}

  async processAgentActivity(rollup: AgentActivityRollup): Promise<void> {
    // Extract patterns from agent work
    const insights = this.analyzeAgentWork(rollup);

    // Store as learnings
    for (const insight of insights) {
      const learning: LearningPattern = {
        name: insight.name,
        category: 'agent-behavior',
        description: insight.description,
        rootCause: { agentTask: rollup.userPrompt },
        preventionRule: insight.rule,
        confidenceScore: insight.confidence
      };

      await this.learningSystem.storePattern(learning);
    }
  }

  private analyzeAgentWork(rollup: AgentActivityRollup): Insight[] {
    // Example: Detect repeated null safety additions
    const nullSafetyFiles = rollup.activities.filesModified
      .filter(f => this.detectsNullSafety(f));

    if (nullSafetyFiles.length >= 3) {
      return [{
        name: 'Null Safety Pattern',
        description: 'Agent frequently adds null checks',
        rule: 'Suggest null safety upfront',
        confidence: 0.8
      }];
    }

    return [];
  }
}
```

This creates the feedback loop:
```
Agent Activity → AgentEmissionAdapter → LearningPattern → IntelligenceProvider → Timeline
```

---

## Success Criteria

### Phase 6 Complete When:
- ✅ All intelligence code migrated to `core/domains/intelligence/`
- ✅ No type conflicts (Runtime, Engine, Learning types separate)
- ✅ No circular dependencies
- ✅ IntelligenceProvider works as data provider
- ✅ Extension system functional
- ✅ WebSocket adapter functional
- ✅ PathwayLearningAdapter functional
- ✅ Core package builds without errors
- ✅ Existing unit tests pass
- ✅ Can create IntelligenceProvider instance
- ✅ fetchEvents() returns CanonicalEvent[]

### NOT Required in Phase 6:
- ❌ Pathway tests (Phase 7)
- ❌ Dashboard visualization (Phase 7)
- ❌ Agent emission adapter (Phase 9)
- ❌ Real-time WebSocket server (Phase 7, optional)

---

## Rollback Plan

### If Type Refactoring Fails (Phase 6A)
```bash
# Restore backup
git reset --hard HEAD~1
# Review type conflicts
# Create clearer separation strategy
```

### If Integration Fails (Phase 6D)
```bash
# Intelligence works standalone but doesn't integrate
# Option 1: Keep as separate capability, integrate later
# Option 2: Simplify IntelligenceProvider (return empty for now)
```

### Nuclear Option
```bash
# Keep intelligence in backup
# Phase 6 becomes "stub IntelligenceProvider"
# Full integration in dedicated Phase 6.5
```

---

## Time Estimates (Realistic)

| Phase | Task | Time | Cumulative |
|-------|------|------|------------|
| 6A | Fix type system | 2h | 2h |
| 6B | Copy core intelligence | 1.5h | 3.5h |
| 6C | Copy adapters | 1.5h | 5h |
| 6D | Update IntelligenceProvider | 1h | 6h |
| 6E | Verify PathwayLearningAdapter | 1h | 7h |
| - | Testing & debugging | 1h | 8h |

**Total: 6-8 hours of focused work**

---

## Next Steps

After Phase 6 complete:
1. **Phase 7:** Intelligence Integration
   - Register IntelligenceProvider with DataOrchestrator
   - Verify timeline shows intelligence events
   - Create intelligence pathway tests
   - Connect WebSocket (optional)

2. **Phase 8:** Extension Wrapper Clean
   - Already done! ✅

3. **Phase 9-11:** Agent Emissions (Part 2 - New Capability)

---

**This plan ensures we integrate intelligence correctly, not quickly.**
