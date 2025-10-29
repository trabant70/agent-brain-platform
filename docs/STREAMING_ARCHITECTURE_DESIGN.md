# Code Structure Review: Streaming Architecture Design

## Executive Summary

This document outlines the complete refactor of the Code Structure Review module from a memory-intensive batch processing model to a memory-efficient streaming architecture.

**Goal**: Enable full analysis of 10,000+ files without memory issues or UI freezes while maintaining 100% feature completeness.

**Approach**: Stream-and-extract pattern with lightweight metadata registries.

---

## Current System Analysis

### Existing Analyzers

1. **FeatureCompletenessAnalyzer** (Priority 1 - Critical)
   - Detects: Disconnected endpoints, API calls, mocked services
   - Detectors: EndpointDetector, APICallDetector, MockDetector, ComponentDetector

2. **UIUXQualityAnalyzer** (Priority 1 - Critical)
   - Detects: Missing loading states, error handling, empty states, form validation, user feedback, accessibility issues
   - Detectors: LoadingStateDetector, ErrorHandlingDetector, EmptyStateDetector, FormValidationDetector, UserFeedbackDetector, AccessibilityDetector

3. **TestCoverageAnalyzer** (Priority 1 - Critical)
   - Detects: Files without tests, critical untested code
   - Analysis: Pattern-based (file matching)

4. **InternationalizationAnalyzer** (Priority 2 - High)
   - Detects: Hardcoded strings, date/time formatting, number formatting, RTL support
   - Detectors: HardcodedStringDetector, TranslationCoverageDetector, DateTimeFormatDetector, NumberFormatDetector, RTLSupportDetector

### Current Memory Issues

| Component | Memory Usage (1000 files) | Issue |
|-----------|---------------------------|-------|
| File content storage | ~200 MB | All files kept in memory |
| AST cache | ~1000 MB | All ASTs kept indefinitely |
| Detector traversals | ~200 MB (working) | Multiple full traversals |
| **Total** | **~1400 MB** | **Causes freezes** |

---

## Streaming Architecture Overview

### Core Principles

1. **Stream Processing**: Process one file at a time
2. **Immediate Extraction**: Extract metadata from AST immediately
3. **Immediate Disposal**: Discard AST after extraction (GC eligible)
4. **Lightweight Storage**: Keep only extracted metadata
5. **UI Yielding**: Yield to event loop every N files
6. **Progress Updates**: Real-time progress notifications

### Memory Profile

| Component | Memory Usage (1000 files) | Savings |
|-----------|---------------------------|---------|
| Current file AST | ~1-5 MB (at a time) | Transient |
| Metadata registries | ~30-50 MB | Persistent |
| Working memory | ~50 MB | Minimal |
| **Total** | **~80-100 MB** | **93% reduction** |

---

## Metadata Registry Architecture

### Complete Metadata Taxonomy

```typescript
// 1. Feature Completeness Metadata
interface EndpointMetadata {
  path: string;
  method: string;
  filePath: string;
  lineNumber: number;
  handler?: string;
  parameters?: string[];
  hasAuth?: boolean;
  hasValidation?: boolean;
}

interface APICallMetadata {
  path: string;
  method: string;
  filePath: string;
  lineNumber: number;
  isConditional?: boolean;
  hasErrorHandling: boolean;
  hasLoadingState: boolean;
}

interface ComponentMetadata {
  name: string;
  filePath: string;
  lineNumber: number;
  type: 'functional' | 'class';
  hasProps?: boolean;
  hasState?: boolean;
  usesAPIs?: string[];
  asyncOperations?: number;
}

interface MockDataMetadata {
  type: 'hardcoded-array' | 'hardcoded-object' | 'mock-function';
  filePath: string;
  lineNumber: number;
  serviceName?: string;
  dataShape?: string;
}

// 2. UI/UX Quality Metadata
interface AsyncOperationMetadata {
  type: 'fetch' | 'axios' | 'async-function' | 'promise';
  filePath: string;
  lineNumber: number;
  functionName?: string;
  componentName?: string;
  hasErrorHandler: boolean;
  hasLoadingState: boolean;
  hasTryFinally: boolean;
  hasLoadingVariable?: boolean; // useState with 'loading'
  hasErrorVariable?: boolean;   // useState with 'error'
}

interface FormMetadata {
  formName: string;
  filePath: string;
  lineNumber: number;
  hasValidation: boolean;
  validationLibrary?: 'yup' | 'zod' | 'custom';
  fields?: string[];
}

interface ListRenderingMetadata {
  componentName: string;
  filePath: string;
  lineNumber: number;
  hasEmptyStateCheck: boolean;
  arraySource: string;
}

interface UserActionMetadata {
  actionType: 'button-click' | 'form-submit' | 'delete' | 'save';
  componentName: string;
  filePath: string;
  lineNumber: number;
  hasFeedback: boolean;
  feedbackType?: 'toast' | 'alert' | 'inline';
}

interface AccessibilityMetadata {
  issueType: 'missing-alt' | 'missing-aria' | 'keyboard-nav' | 'color-contrast';
  componentName: string;
  filePath: string;
  lineNumber: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  wcagLevel: 'A' | 'AA' | 'AAA';
  element?: string;
}

// 3. Test Coverage Metadata
interface FileMetadata {
  path: string;
  isTestFile: boolean;
  isProductionFile: boolean;
  importance: 'critical' | 'high' | 'medium' | 'low';
  category: 'service' | 'component' | 'api' | 'utility' | 'page';
  hasCorrespondingTest: boolean;
  correspondingTestPath?: string;
}

// 4. Internationalization Metadata
interface StringLiteralMetadata {
  text: string;
  filePath: string;
  lineNumber: number;
  isUserFacing: boolean;
  context: 'jsx' | 'object-property' | 'string-literal';
  inJSX: boolean;
  hasTranslation: boolean;
  suggestedKey?: string;
}

interface DateTimeOperationMetadata {
  filePath: string;
  lineNumber: number;
  issueType: 'no-locale' | 'hardcoded-format' | 'missing-timezone';
  method: string;
  code: string;
}

interface NumberFormatMetadata {
  filePath: string;
  lineNumber: number;
  issueType: 'no-locale' | 'currency' | 'decimal-separator';
  code: string;
}

interface RTLIssueMetadata {
  filePath: string;
  lineNumber: number;
  issueType: 'directional-property' | 'hardcoded-direction';
  property: string;
  value?: string;
}
```

### Registry Classes

```typescript
class FeatureCompletenessRegistry {
  endpoints: Map<string, EndpointMetadata>
  apiCalls: Map<string, APICallMetadata>
  components: Map<string, ComponentMetadata>
  mocks: MockDataMetadata[]
}

class UIUXQualityRegistry {
  asyncOperations: AsyncOperationMetadata[]
  forms: FormMetadata[]
  listRenderings: ListRenderingMetadata[]
  userActions: UserActionMetadata[]
  a11yIssues: AccessibilityMetadata[]
}

class TestCoverageRegistry {
  files: Map<string, FileMetadata>
}

class InternationalizationRegistry {
  stringLiterals: StringLiteralMetadata[]
  dateTimeOps: DateTimeOperationMetadata[]
  numberFormats: NumberFormatMetadata[]
  rtlIssues: RTLIssueMetadata[]
}

class UnifiedMetadataRegistry {
  featureCompleteness: FeatureCompletenessRegistry
  uiuxQuality: UIUXQualityRegistry
  testCoverage: TestCoverageRegistry
  i18n: InternationalizationRegistry
}
```

---

## Streaming File Processor Architecture

### Three-Phase Processing

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: Streaming Extraction (One file at a time)         │
│                                                             │
│  For each file:                                             │
│    1. Read file content                                     │
│    2. Parse AST (ts.createSourceFile)                       │
│    3. Extract ALL metadata types                            │
│    4. Populate registries                                   │
│    5. Discard AST (set to undefined, GC eligible)           │
│    6. Yield to event loop every 50 files                    │
│    7. Report progress                                       │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 2: Analysis (Using registries)                       │
│                                                             │
│  For each analyzer:                                         │
│    1. Read from registries (no AST traversal!)              │
│    2. Apply business logic                                  │
│    3. Generate issues                                       │
│    4. Calculate metrics                                     │
│    5. Return analysis results                               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 3: Aggregation & Reporting                           │
│                                                             │
│    1. Aggregate results from all analyzers                  │
│    2. Calculate overall score                               │
│    3. Generate visualizations                               │
│    4. Return complete analysis                              │
└─────────────────────────────────────────────────────────────┘
```

### Unified Metadata Extractor

```typescript
class UnifiedMetadataExtractor {
  /**
   * Extract ALL metadata types from a single file
   * This is called once per file during streaming
   */
  extract(file: SourceFile, registry: UnifiedMetadataRegistry): void {
    if (!file.ast) return;

    const sourceFile = file.ast as ts.SourceFile;

    // Determine file classification
    const fileClassification = this.classifyFile(file.path);

    // Extract based on file type
    if (fileClassification.isBackend) {
      this.extractEndpoints(sourceFile, file.path, registry.featureCompleteness);
    }

    if (fileClassification.isFrontend) {
      this.extractAPICallsand(sourceFile, file.path, registry.featureCompleteness);
      this.extractComponents(sourceFile, file.path, registry.featureCompleteness);
      this.extractFormMetadata(sourceFile, file.path, registry.uiuxQuality);
      this.extractListRenderings(sourceFile, file.path, registry.uiuxQuality);
      this.extractUserActions(sourceFile, file.path, registry.uiuxQuality);
      this.extractAccessibilityIssues(sourceFile, file.path, registry.uiuxQuality);
    }

    // Extract from all files
    this.extractAsyncOperations(sourceFile, file.path, registry.uiuxQuality);
    this.extractStringLiterals(sourceFile, file.path, registry.i18n);
    this.extractDateTimeOperations(sourceFile, file.path, registry.i18n);
    this.extractNumberFormatting(sourceFile, file.path, registry.i18n);
    this.extractRTLIssues(sourceFile, file.path, registry.i18n);
    this.extractMockData(sourceFile, file.path, registry.featureCompleteness);

    // Test coverage metadata (no AST needed)
    this.extractFileMetadata(file, registry.testCoverage);
  }
}
```

---

## Progress Notification System

### Architecture

```
┌──────────────────────────────────────────────────────────┐
│ Extension (VSCode Process)                               │
│                                                          │
│  StreamingFileProcessor                                  │
│         ↓                                                │
│  Progress Events → Send to Webview                       │
└──────────────────────────────────────────────────────────┘
                    ↓ postMessage
┌──────────────────────────────────────────────────────────┐
│ Webview (Browser Context)                                │
│                                                          │
│  ProgressNotificationManager                             │
│         ↓                                                │
│  Update Progress Bar + Status Text                       │
└──────────────────────────────────────────────────────────┘
```

### Progress Events

```typescript
interface ProgressEvent {
  phase: 'scanning' | 'extracting' | 'analyzing' | 'aggregating' | 'complete';
  current: number;
  total: number;
  percentage: number;
  message: string;
  details?: {
    filesProcessed?: number;
    registrySize?: number;
    currentFile?: string;
  };
}

// Example events:
{
  phase: 'scanning',
  current: 547,
  total: 1243,
  percentage: 44,
  message: 'Scanning files...',
  details: { currentFile: 'src/components/UserProfile.tsx' }
}

{
  phase: 'extracting',
  current: 850,
  total: 1243,
  percentage: 68,
  message: 'Extracting metadata...',
  details: {
    filesProcessed: 850,
    registrySize: 42,  // KB
    currentFile: 'src/services/api.ts'
  }
}

{
  phase: 'analyzing',
  current: 3,
  total: 4,
  percentage: 75,
  message: 'Running analyzers...',
  details: { currentAnalyzer: 'UI/UX Quality' }
}
```

### UI Components

```typescript
// Progress notification in webview
<div class="progress-notification">
  <div class="progress-header">
    <span class="progress-icon">⚙️</span>
    <span class="progress-title">Code Structure Analysis</span>
    <span class="progress-percentage">68%</span>
  </div>

  <div class="progress-bar-container">
    <div class="progress-bar" style="width: 68%"></div>
  </div>

  <div class="progress-details">
    <span class="progress-message">Extracting metadata...</span>
    <span class="progress-stats">850 / 1,243 files • 42 KB</span>
  </div>

  <div class="progress-current-file">
    src/services/api.ts
  </div>
</div>
```

---

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)

**1.1 Metadata Registries**
- [ ] Create `UnifiedMetadataRegistry` class
- [ ] Implement all registry sub-classes
- [ ] Add memory tracking methods
- [ ] Add statistics methods
- [ ] Unit tests for registries

**1.2 Unified Metadata Extractor**
- [ ] Create `UnifiedMetadataExtractor` class
- [ ] Implement all extraction methods
- [ ] File classification logic
- [ ] Unit tests for extractor

**1.3 Streaming File Processor**
- [ ] Create `StreamingFileProcessor` class
- [ ] Implement one-at-a-time processing
- [ ] Implement yielding mechanism
- [ ] Progress event emission
- [ ] Unit tests for processor

### Phase 2: Progress Notification (Week 1)

**2.1 Backend**
- [ ] Create `ProgressEventEmitter` class
- [ ] Integrate with `StreamingFileProcessor`
- [ ] Add progress calculation logic
- [ ] Send events to webview

**2.2 Frontend**
- [ ] Create `ProgressNotificationManager` class
- [ ] Implement progress UI component
- [ ] Handle progress events from backend
- [ ] Add animations and transitions

### Phase 3: Analyzer Refactoring (Week 2)

**3.1 FeatureCompletenessAnalyzer**
- [ ] Refactor to use `FeatureCompletenessRegistry`
- [ ] Remove AST traversal logic
- [ ] Implement registry-based analysis
- [ ] Integration tests

**3.2 UIUXQualityAnalyzer**
- [ ] Refactor to use `UIUXQualityRegistry`
- [ ] Update all sub-detectors
- [ ] Integration tests

**3.3 TestCoverageAnalyzer**
- [ ] Refactor to use `TestCoverageRegistry`
- [ ] Integration tests

**3.4 InternationalizationAnalyzer**
- [ ] Refactor to use `InternationalizationRegistry`
- [ ] Integration tests

### Phase 4: Orchestrator Update (Week 2)

**4.1 New Orchestration Flow**
- [ ] Update `CategoryOrchestrator` for streaming
- [ ] Implement two-phase approach (extract → analyze)
- [ ] Add progress integration
- [ ] Integration tests

**4.2 Context Management**
- [ ] Update `AnalysisContext` type
- [ ] Add registry references
- [ ] Backward compatibility layer

### Phase 5: Provider Integration (Week 3)

**5.1 VSCode Provider**
- [ ] Update `CodeStructureReviewProvider`
- [ ] Replace file loading logic
- [ ] Integrate streaming processor
- [ ] Add progress reporting to VSCode

**5.2 Extension Commands**
- [ ] Update command handlers
- [ ] Add cancellation support
- [ ] Error handling improvements

### Phase 6: Testing & Validation (Week 3)

**6.1 Correctness Validation**
- [ ] Parallel run tests (old vs new)
- [ ] Compare results for accuracy
- [ ] Edge case testing

**6.2 Performance Benchmarks**
- [ ] Memory usage tests (100, 500, 1000, 5000 files)
- [ ] Execution time benchmarks
- [ ] UI responsiveness tests

**6.3 Load Testing**
- [ ] Test with real large codebases
- [ ] Stress test with 10,000+ files
- [ ] Memory leak detection

### Phase 7: Documentation & Rollout (Week 4)

**7.1 Documentation**
- [ ] Architecture documentation
- [ ] API documentation
- [ ] Migration guide

**7.2 Deployment**
- [ ] Feature flag implementation
- [ ] Gradual rollout plan
- [ ] Monitoring and telemetry

---

## Success Criteria

### Functional Requirements
- ✅ All 4 analyzers refactored and working
- ✅ 100% feature parity with current system
- ✅ All existing tests passing
- ✅ New streaming tests passing

### Performance Requirements
- ✅ Memory usage < 200 MB for 1,000 files
- ✅ Memory usage < 500 MB for 10,000 files
- ✅ Analysis time < 20 seconds for 1,000 files
- ✅ UI remains responsive (no freezes)
- ✅ Progress updates every 1 second

### Quality Requirements
- ✅ Test coverage > 80%
- ✅ No memory leaks
- ✅ Proper error handling
- ✅ Comprehensive logging

---

## Risk Mitigation

### Risk 1: Data Loss During Extraction
**Mitigation**: Comprehensive extraction tests, compare with current system

### Risk 2: Performance Regression
**Mitigation**: Benchmark every commit, automated performance tests

### Risk 3: Memory Leaks
**Mitigation**: Memory profiling, automated leak detection tests

### Risk 4: Incomplete Metadata
**Mitigation**: Cross-validation with current detectors, integration tests

---

## File Organization

```
packages/core/src/domains/code-structure-review/
├── streaming/
│   ├── UnifiedMetadataRegistry.ts
│   ├── UnifiedMetadataExtractor.ts
│   ├── StreamingFileProcessor.ts
│   ├── ProgressEventEmitter.ts
│   └── index.ts
├── registries/
│   ├── FeatureCompletenessRegistry.ts
│   ├── UIUXQualityRegistry.ts
│   ├── TestCoverageRegistry.ts
│   ├── InternationalizationRegistry.ts
│   └── index.ts
├── analysis/
│   ├── StreamingOrchestrator.ts  (new)
│   ├── CategoryOrchestrator.ts   (updated)
│   └── ...
├── categories/
│   ├── priority1/
│   │   ├── FeatureCompletenessAnalyzer.streaming.ts
│   │   ├── UIUXQualityAnalyzer.streaming.ts
│   │   └── TestCoverageAnalyzer.streaming.ts
│   └── priority2/
│       └── InternationalizationAnalyzer.streaming.ts
└── ui/
    └── ProgressNotificationManager.ts

packages/vscode/src/providers/
└── CodeStructureReviewProvider.ts (updated)
```

---

## Timeline

| Week | Focus | Deliverables |
|------|-------|--------------|
| 1 | Core Infrastructure + Progress UI | Registries, Extractor, Processor, Progress system |
| 2 | Analyzer Refactoring | All 4 analyzers refactored |
| 3 | Integration & Testing | Orchestrator, Provider, Tests |
| 4 | Polish & Rollout | Documentation, Deployment |

---

## Next Steps

1. ✅ Complete this design document
2. ⏳ Implement Phase 1: Core Infrastructure
3. ⏳ Implement Phase 2: Progress Notification
4. ⏳ Implement Phase 3: Analyzer Refactoring
5. ⏳ Continue through all phases systematically

---

## Conclusion

This streaming architecture will enable:
- **Full analysis** of large codebases (10,000+ files)
- **93% memory reduction** (1400 MB → 80 MB for 1000 files)
- **Responsive UI** with real-time progress updates
- **100% feature completeness** - no functionality lost
- **Scalable foundation** for future analyzer additions

The systematic implementation plan ensures quality, testability, and successful delivery.
