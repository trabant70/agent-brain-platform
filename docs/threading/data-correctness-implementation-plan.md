# Threading System Data Correctness Extension - Implementation Plan

**Date**: 2025-01-26
**Version**: 1.0
**Based on**: threading-data-correctness-extension.md

---

## Executive Summary

This plan extends the existing threading system (Levels 0-4) with comprehensive data correctness monitoring. The extension adds contract validation, value tracking, transformation monitoring, and visual debugging capabilities.

**Goals**:
- Track data types, values, shapes, and transformations
- Validate contracts at runtime
- Provide visual data flow debugging
- Generate agent-friendly error messages
- Enable collaborative debugging between humans and AI agents

---

## Current State Analysis

### Existing Threading System (v0.4.58)

**Current Capabilities**:
- 5 maturity levels (L0: Observation → L4: Decorators)
- ThreadSpec decorator with timing and memory expectations
- ThreadLog with entry/exit tracking
- Basic IOShape type (type, shape, validate function)
- JSONL logging system
- Analysis and reporting

**Existing Code to Leverage**:
1. `ThreadSpec` decorator (ThreadSpec.ts)
2. `ThreadLog` class (ThreadLog.ts)
3. `ThreadSpecOptions` interface with `input`/`output` of type `IOShape`
4. Log entry system (EntryLogEntry, ExitLogEntry, DeltaLogEntry, ErrorLogEntry)
5. ThreadConfig with enable/disable, sampling, active threads
6. Existing types.ts with 400+ lines of threading types

**Integration Points**:
- Extend `ThreadSpecOptions` with enhanced data contracts (backward compatible)
- Extend `ThreadLog` to capture and validate values
- Enhance `IOShape` type with full contract capabilities
- Add new validation engine alongside existing analysis
- Integrate visualization with existing UI components

---

## Architecture Overview

### Component Structure

```
threading/
├── contracts/          # NEW: Data contract definitions
│   ├── DataContract.ts
│   ├── TypeDefinition.ts
│   ├── ShapeDefinition.ts
│   └── ConstraintDefinition.ts
├── validation/         # NEW: Contract validation engine
│   ├── ContractValidator.ts
│   ├── TypeValidator.ts
│   ├── ShapeValidator.ts
│   ├── ConstraintValidator.ts
│   └── InvariantChecker.ts
├── tracking/           # NEW: Execution and value tracking
│   ├── ExecutionTracker.ts
│   ├── ValueCapture.ts
│   ├── TransformationTracker.ts
│   └── MutationTracker.ts
├── visualization/      # NEW: Data flow visualization
│   ├── DataFlowVisualizer.ts
│   ├── DataInspector.ts
│   └── ViolationRenderer.ts
├── agent/              # NEW: Agent debugging helpers
│   ├── AgentDebugHelper.ts
│   └── FixSuggester.ts
├── decorators/         # EXISTING: Enhanced
│   ├── ThreadSpec.ts   # Extend with data contracts
│   └── ThreadLog.ts    # Extend with value tracking (NEW)
├── ThreadLog.ts        # EXISTING: Enhance
└── types.ts            # EXISTING: Extend
```

### Data Flow

```
1. ThreadSpec Declaration
   ↓
2. Enhanced Options with Data Contracts
   ↓
3. ThreadLog Decorator Wraps Function
   ↓
4. Entry: Capture Args + Validate Contracts
   ↓
5. Execution: Track Transformations + Mutations
   ↓
6. Exit: Capture Result + Validate Contracts
   ↓
7. Check Preconditions/Postconditions/Invariants
   ↓
8. Log Complete Trace + Violations
   ↓
9. Visualize Data Flow + Violations
   ↓
10. Generate Agent-Friendly Debug Info
```

---

## Phase-by-Phase Implementation

### Phase 1: Data Contract Foundation (Days 1-3)

**Goal**: Extend type system with comprehensive data contracts

#### 1.1 Create Contract Type Definitions

**File**: `packages/core/src/domains/threading/contracts/DataContract.ts`

```typescript
export interface DataContract {
  type: string | TypeDefinition;
  shape?: ShapeDefinition;
  constraints?: ConstraintDefinition;
  transformations?: TransformationRules;
  examples?: any[];
}

export interface TypeDefinition {
  base: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null' | 'undefined' | 'any';
  nullable?: boolean;
  union?: TypeDefinition[];
  literal?: any;
  generic?: string;
}

export interface ShapeDefinition {
  [key: string]: FieldDefinition;
}

export interface FieldDefinition {
  type: string | TypeDefinition;
  required?: boolean;
  default?: any;
  description?: string;
  constraints?: ConstraintDefinition;
}

export interface ConstraintDefinition {
  // Numeric
  min?: number;
  max?: number;
  range?: [number, number];
  precision?: number;

  // String
  pattern?: RegExp | string;
  minLength?: number;
  maxLength?: number;
  enum?: any[];

  // Array
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  itemType?: string | TypeDefinition;

  // Custom
  validate?: (value: any) => boolean | string;
  invariants?: string[];
}

export interface TransformationRules {
  [key: string]: TransformationRule;
}

export interface TransformationRule {
  from: string | string[];
  to: string | string[];
  transform?: (value: any) => any;
  relationship?: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  preserves?: string[];
  validates?: string[];
}
```

**Effort**: 2 hours

#### 1.2 Extend ThreadSpecOptions

**File**: `packages/core/src/domains/threading/types.ts`

```typescript
// Add to existing types.ts

export interface EnhancedThreadSpecOptions extends ThreadSpecOptions {
  // Existing fields preserved
  threads: string[];
  timing?: TimingExpectation;
  memory?: MemoryExpectation;
  input?: IOShape;  // Keep for backward compatibility
  output?: IOShape; // Keep for backward compatibility
  tags?: string[];
  critical?: boolean;

  // NEW: Enhanced data contracts
  expects?: {
    params?: Record<string, DataContract>;
    context?: Record<string, DataContract>;
    preconditions?: string[];
  };

  produces?: {
    returns?: DataContract;
    mutations?: Record<string, DataContract>;
    postconditions?: string[];
  };

  dataFlow?: {
    transformations?: TransformationRules;
    preserves?: string[];
    sanitizes?: string[];
  };

  invariants?: string[];

  examples?: Array<{
    input: any[];
    output: any;
    description?: string;
  }>;
}
```

**Backward Compatibility Strategy**:
- Keep existing `input`/`output` fields
- If `expects.params` is present, use it; otherwise fall back to `input`
- If `produces.returns` is present, use it; otherwise fall back to `output`
- This allows gradual migration

**Effort**: 1 hour

#### 1.3 Update ThreadSpec Decorator Registry

**File**: `packages/core/src/domains/threading/decorators/ThreadSpec.ts`

```typescript
// Update to use EnhancedThreadSpecOptions
export const threadSpecRegistry = new Map<string, EnhancedThreadSpecOptions>();

export function ThreadSpec(options: EnhancedThreadSpecOptions) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const className = target.constructor?.name || 'Anonymous';
    const context = `${className}.${propertyKey}`;

    // Store enhanced metadata
    threadSpecRegistry.set(context, options);

    // Return original descriptor (zero runtime cost when disabled)
    return descriptor;
  };
}
```

**Effort**: 1 hour

**Phase 1 Total**: 4 hours

---

### Phase 2: Value Tracking & ExecutionTracker (Days 4-7)

**Goal**: Capture data snapshots at entry/exit and track transformations

#### 2.1 Create ExecutionTracker

**File**: `packages/core/src/domains/threading/tracking/ExecutionTracker.ts`

**Responsibilities**:
- Capture entry state (args, context, types, shapes)
- Capture exit state (result, mutations, types, shapes)
- Track transformations during execution
- Record timeline of events
- Generate data flow diagram

**Key Methods**:
```typescript
export class ExecutionTracker {
  captureEntry(entry: EntryPoint): EntryCapture;
  captureExit(exit: ExitPoint): ExitCapture;
  captureTransformation(transform: Transformation): void;
  captureMutation(mutation: Mutation): void;
  getCompleteTrace(): ExecutionTrace;
  getDataFlow(): DataFlowDiagram;
  getViolations(): ContractViolation[];
}
```

**Effort**: 8 hours

#### 2.2 Create ValueCapture Utility

**File**: `packages/core/src/domains/threading/tracking/ValueCapture.ts`

**Responsibilities**:
- Safely capture values (handle circular refs, large objects)
- Capture types (primitive, constructor, custom types)
- Capture shapes (object structure, array types)
- Generate previews (truncated strings, summarized arrays)
- Calculate sizes

**Privacy Features**:
- Redact passwords, tokens, secrets
- Configurable PII redaction
- Depth limits for objects
- Size limits for strings/arrays

**Effort**: 6 hours

#### 2.3 Create ThreadLog Decorator

**File**: `packages/core/src/domains/threading/decorators/ThreadLog.ts`

This is new (currently only ThreadLog class exists, not decorator).

```typescript
export function ThreadLog(...threads: string[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const spec = Reflect.getMetadata('enhanced:threadspec', target, propertyKey);
      const context = `${target.constructor.name}.${propertyKey}`;
      const executionId = generateExecutionId();

      // Create tracker
      const tracker = new ExecutionTracker(executionId, context, spec);

      // ENTRY: Capture and validate
      tracker.captureEntry({ args, thisContext: this, timestamp: Date.now(), threads });

      // Validate input contracts (if spec.expects)
      if (spec?.expects) {
        const validation = await validateDataContract(args, spec.expects.params);
        if (!validation.valid) {
          tracker.logContractViolation('input', validation);
        }
      }

      try {
        // Execute with tracking proxy
        const proxyContext = createTrackingProxy(this, tracker);
        const result = await originalMethod.apply(proxyContext, args);

        // EXIT: Capture and validate
        tracker.captureExit({ result, timestamp: Date.now(), mutations: tracker.getMutations() });

        // Validate output contracts (if spec.produces)
        if (spec?.produces) {
          const validation = await validateDataContract(result, spec.produces.returns);
          if (!validation.valid) {
            tracker.logContractViolation('output', validation);
          }
        }

        // Log complete trace
        ThreadLogger.log({
          type: 'execution-trace',
          context,
          threads,
          executionId,
          trace: tracker.getCompleteTrace()
        });

        return result;
      } catch (error) {
        tracker.captureError({ error, state: captureErrorState(this), timestamp: Date.now() });
        throw error;
      }
    };

    return descriptor;
  };
}
```

**Effort**: 10 hours

**Phase 2 Total**: 24 hours (3 days)

---

### Phase 3: Data Validation Engine (Days 8-11)

**Goal**: Implement comprehensive contract validation

#### 3.1 Create ContractValidator

**File**: `packages/core/src/domains/threading/validation/ContractValidator.ts`

**Responsibilities**:
- Validate data against contracts
- Check types, shapes, constraints
- Generate violation reports
- Provide detailed error messages

**Effort**: 8 hours

#### 3.2 Create TypeValidator

**File**: `packages/core/src/domains/threading/validation/TypeValidator.ts`

**Handles**:
- Primitive types (string, number, boolean, etc.)
- Constructor types (Date, RegExp, custom classes)
- Union types (string | number)
- Literal types ('success' | 'failure')
- Generic types (Array<T>, Promise<T>)
- Nullable types

**Effort**: 6 hours

#### 3.3 Create ShapeValidator

**File**: `packages/core/src/domains/threading/validation/ShapeValidator.ts`

**Handles**:
- Object shape matching
- Required/optional fields
- Nested objects
- Array item types
- Unexpected fields detection

**Effort**: 6 hours

#### 3.4 Create ConstraintValidator

**File**: `packages/core/src/domains/threading/validation/ConstraintValidator.ts`

**Handles**:
- Numeric constraints (min, max, range, precision)
- String constraints (pattern, length, enum)
- Array constraints (minItems, maxItems, uniqueItems, itemType)
- Custom validators
- Invariant checking

**Effort**: 8 hours

#### 3.5 Create InvariantChecker

**File**: `packages/core/src/domains/threading/validation/InvariantChecker.ts`

**Handles**:
- Parse invariant expressions
- Evaluate against data
- Support common operations (===, >, <, &&, ||, etc.)
- Safe evaluation (no eval())

**Effort**: 6 hours

**Phase 3 Total**: 34 hours (4 days)

---

### Phase 4: Visualization System (Days 12-16)

**Goal**: Create interactive data flow visualization

#### 4.1 Create DataFlowVisualizer

**File**: `packages/core/src/domains/threading/visualization/DataFlowVisualizer.ts`

**Features**:
- Generate interactive HTML visualization
- Timeline of execution events
- Data flow diagram with D3.js
- Violation highlighting
- Transformation display
- Clickable event details

**Effort**: 12 hours

#### 4.2 Create DataInspector WebView

**File**: `packages/core/src/domains/threading/visualization/DataInspector.ts`

**Features**:
- Real-time data inspection panel
- Side-by-side expected vs actual
- Tree view of data structures
- Type highlighting
- Diff view for changes
- Violation display

**Effort**: 10 hours

#### 4.3 Create ViolationRenderer

**File**: `packages/core/src/domains/threading/visualization/ViolationRenderer.ts`

**Features**:
- Format violations for display
- Color coding by severity
- Path highlighting
- Fix suggestions
- Example code snippets

**Effort**: 6 hours

#### 4.4 Integrate with ThreadingViewController

**File**: `packages/core/src/domains/visualization/ui/threading/ThreadingViewController.ts`

**Integration**:
- Add "Data Flow" tab
- Add "Violations" panel
- Real-time updates from ThreadLogger
- Link to execution traces

**Effort**: 8 hours

**Phase 4 Total**: 36 hours (4.5 days)

---

### Phase 5: Agent Integration & Polish (Days 17-20)

**Goal**: Generate agent-friendly debugging information

#### 5.1 Create AgentDebugHelper

**File**: `packages/core/src/domains/threading/agent/AgentDebugHelper.ts`

**Features**:
- Generate agent-friendly summaries
- Format violations with explanations
- Suggest specific fixes
- Provide correct examples
- Extract learnings

**Effort**: 8 hours

#### 5.2 Create FixSuggester

**File**: `packages/core/src/domains/threading/agent/FixSuggester.ts`

**Features**:
- Analyze violations
- Generate code fix suggestions
- Provide regex patterns for string constraints
- Suggest type conversions
- Recommend refactorings

**Effort**: 6 hours

#### 5.3 Configuration System

**File**: `packages/core/src/domains/threading/DataCorrectnessConfig.ts`

**Features**:
- Enable/disable data monitoring
- Configure capture modes
- Privacy settings (redaction patterns)
- Visualization options
- Analysis preferences

**Effort**: 4 hours

#### 5.4 Documentation

**Files**:
- User guide for data correctness
- API reference for DataContract
- Examples for common patterns
- Migration guide from IOShape to DataContract

**Effort**: 8 hours

#### 5.5 Testing

**Tests**:
- Unit tests for validators
- Integration tests for full flow
- Performance tests for large objects
- Privacy tests for redaction

**Effort**: 12 hours

**Phase 5 Total**: 38 hours (4.75 days)

---

## Implementation Strategy

### Incremental Rollout

**Week 1**: Foundation (Phase 1 + start Phase 2)
- Days 1-3: Data contract types
- Days 4-5: ExecutionTracker + ValueCapture

**Week 2**: Tracking & Validation (Phase 2 + Phase 3)
- Days 6-7: ThreadLog decorator
- Days 8-11: Full validation engine

**Week 3**: Visualization (Phase 4)
- Days 12-14: DataFlowVisualizer + DataInspector
- Days 15-16: Integration with UI

**Week 4**: Polish & Launch (Phase 5)
- Days 17-18: Agent integration
- Days 19-20: Documentation + testing

**Total**: ~140 hours (~3.5 weeks for 1 developer)

### Backward Compatibility

**Maintaining Compatibility**:
1. Keep existing `IOShape` interface
2. Keep existing `input`/`output` fields in `ThreadSpecOptions`
3. New `expects`/`produces` fields are optional
4. Fallback logic: use new if present, otherwise use old
5. All existing code continues to work unchanged

**Migration Path**:
```typescript
// Old way (still works)
@ThreadSpec({
  threads: ['DATA_FLOW'],
  input: { type: 'string' },
  output: { type: 'User' }
})

// New way (more powerful)
@ThreadSpec({
  threads: ['DATA_FLOW'],
  expects: {
    params: {
      userId: {
        type: 'string',
        constraints: { pattern: /^[0-9a-f]{8}$/ }
      }
    }
  },
  produces: {
    returns: {
      type: 'object',
      shape: {
        id: { type: 'string', required: true },
        name: { type: 'string', required: true }
      }
    }
  }
})
```

### Risk Mitigation

**Performance Risks**:
- **Risk**: Value capture slows down execution
- **Mitigation**: Configurable capture depth, sampling, disable in production

**Privacy Risks**:
- **Risk**: Sensitive data captured in logs
- **Mitigation**: Built-in redaction patterns, configurable privacy settings

**Complexity Risks**:
- **Risk**: Too complex for developers to use
- **Mitigation**: Good defaults, examples, gradual adoption, agent support

---

## Success Criteria

### Phase 1 Success Criteria
- ✅ DataContract types defined and exported
- ✅ EnhancedThreadSpecOptions extends existing types
- ✅ Backward compatibility maintained
- ✅ Builds without errors

### Phase 2 Success Criteria
- ✅ ExecutionTracker captures entry/exit
- ✅ ValueCapture handles all data types safely
- ✅ ThreadLog decorator works with existing ThreadSpec
- ✅ Privacy redaction functional

### Phase 3 Success Criteria
- ✅ ContractValidator validates all constraint types
- ✅ TypeValidator handles union/literal/generic types
- ✅ ShapeValidator detects missing/extra fields
- ✅ InvariantChecker evaluates expressions safely

### Phase 4 Success Criteria
- ✅ DataFlowVisualizer generates interactive HTML
- ✅ DataInspector shows real-time data
- ✅ Violations rendered with context
- ✅ Integration with existing UI seamless

### Phase 5 Success Criteria
- ✅ AgentDebugHelper generates helpful summaries
- ✅ FixSuggester provides actionable fixes
- ✅ Documentation complete
- ✅ Tests passing (>80% coverage)

---

## File Structure Summary

```
packages/core/src/domains/threading/
├── contracts/
│   ├── DataContract.ts                 # NEW (Phase 1)
│   ├── TypeDefinition.ts               # NEW (Phase 1)
│   ├── ShapeDefinition.ts              # NEW (Phase 1)
│   └── ConstraintDefinition.ts         # NEW (Phase 1)
├── validation/
│   ├── ContractValidator.ts            # NEW (Phase 3)
│   ├── TypeValidator.ts                # NEW (Phase 3)
│   ├── ShapeValidator.ts               # NEW (Phase 3)
│   ├── ConstraintValidator.ts          # NEW (Phase 3)
│   └── InvariantChecker.ts             # NEW (Phase 3)
├── tracking/
│   ├── ExecutionTracker.ts             # NEW (Phase 2)
│   ├── ValueCapture.ts                 # NEW (Phase 2)
│   ├── TransformationTracker.ts        # NEW (Phase 2)
│   └── MutationTracker.ts              # NEW (Phase 2)
├── visualization/
│   ├── DataFlowVisualizer.ts           # NEW (Phase 4)
│   ├── DataInspector.ts                # NEW (Phase 4)
│   └── ViolationRenderer.ts            # NEW (Phase 4)
├── agent/
│   ├── AgentDebugHelper.ts             # NEW (Phase 5)
│   └── FixSuggester.ts                 # NEW (Phase 5)
├── decorators/
│   ├── ThreadSpec.ts                   # EXTEND (Phase 1)
│   └── ThreadLog.ts                    # NEW (Phase 2)
├── DataCorrectnessConfig.ts            # NEW (Phase 5)
└── types.ts                            # EXTEND (Phase 1)
```

**Estimated Files**: 25 new + 3 extended = 28 files

**Estimated Lines of Code**: ~8,000 lines

---

## Next Steps

1. ✅ Review and approve this implementation plan
2. Create branch: `feature/data-correctness-extension`
3. Implement Phase 1 (Data Contract Foundation)
4. Test and validate backward compatibility
5. Proceed with Phases 2-5 sequentially
6. Create comprehensive test suite
7. Update documentation
8. Build and package VSIX v0.5.0

---

**End of Implementation Plan**
