# Threading System Implementation Plan

## Overview

Implementing a thread-aware debugging system for collaborative debugging between human operators and AI agents. The system uses decorators and runtime logging to track execution threads, detect anomalies, and extract learnings.

## Goals

1. Enable thread-based debugging without significant runtime overhead
2. Provide real-time visibility into system behavior
3. Automatically detect patterns and performance issues
4. Extract learnings from debugging sessions
5. Create a new "Threading" tab in the Agent Brain extension

## Architecture

### Three-Layer Design

```
ThreadSpec (Compile-time)
    ↓
ThreadLog (Runtime + Simple Deltas)
    ↓
ThreadAnalyzer (Async Intelligence)
```

### Components

1. **Core Threading System** (`packages/core/src/domains/threading/`)
   - Types and interfaces
   - ThreadSpec decorator
   - ThreadLog runtime tracker
   - ThreadAnalyzer pattern detector

2. **VSCode Integration** (`packages/vscode/src/`)
   - ThreadControlCenter (status bar, commands)
   - Configuration management
   - File I/O for logs

3. **Visualization** (`packages/core/src/domains/visualization/`)
   - Threading tab UI
   - Timeline visualization (D3.js)
   - Dashboard controller

## Implementation Phases

### Phase 1: Foundation (Current Sprint)

**Objective**: Core threading infrastructure with minimal UI

#### 1.1 Type Definitions
- [x] `packages/core/src/domains/threading/types.ts`
  - ThreadSpec interface
  - ThreadLog entry types
  - ThreadConfig schema
  - LogEntry formats (entry, exit, delta)

#### 1.2 ThreadSpec Decorator
- [ ] `packages/core/src/domains/threading/decorators/ThreadSpec.ts`
  - Method decorator for expectations
  - Metadata storage (zero runtime cost)
  - TypeScript typing support

#### 1.3 ThreadLog Runtime
- [ ] `packages/core/src/domains/threading/ThreadLog.ts`
  - Capture entry/exit
  - Compare actuals vs expectations
  - Simple delta detection (timing, memory)
  - Buffered JSONL output

#### 1.4 Configuration System
- [ ] `packages/core/src/domains/threading/ThreadConfig.ts`
  - Load/save config from `.threading/config.json`
  - Thread definitions
  - Sampling rates
  - Mode management (disabled/development/debugging/learning)

#### 1.5 Logging Infrastructure
- [ ] `packages/core/src/domains/threading/logging/ThreadLogger.ts`
  - JSONL file writer
  - Buffer management
  - Session-based file organization
- [ ] `packages/core/src/domains/threading/logging/LogRotator.ts`
  - Size-based rotation
  - Age-based cleanup
  - Compression (gzip)

#### 1.6 Control Center
- [ ] `packages/vscode/src/services/threading/ThreadControlCenter.ts`
  - Status bar item
  - Quick toggle commands
  - Config watcher
  - Session management

### Phase 2: Analysis & Patterns

**Objective**: Intelligence layer for pattern detection

#### 2.1 Pattern Detectors
- [ ] `packages/core/src/domains/threading/analysis/patterns/PerformanceDegradationPattern.ts`
- [ ] `packages/core/src/domains/threading/analysis/patterns/ErrorClusterPattern.ts`
- [ ] `packages/core/src/domains/threading/analysis/patterns/MemoryLeakPattern.ts`
- [ ] `packages/core/src/domains/threading/analysis/patterns/CachePattern.ts`

#### 2.2 Analyzer Engine
- [ ] `packages/core/src/domains/threading/analysis/ThreadAnalyzer.ts`
  - Pattern orchestration
  - Correlation analysis
  - Recommendation generation
  - Report creation

#### 2.3 CLI Tools
- [ ] `packages/core/src/domains/threading/cli/analyze.ts`
  - Analyze session logs
  - Generate reports
  - Export insights

### Phase 3: Visualization

**Objective**: Threading dashboard tab

#### 3.1 UI Components
- [ ] `packages/core/src/domains/visualization/ui/threading/ThreadingViewController.ts`
  - Main controller for threading tab
  - Message handling
  - State management

- [ ] `packages/core/src/domains/visualization/ui/threading/ThreadTimelineController.ts`
  - D3.js timeline visualization
  - Swim lanes for threads
  - Delta markers
  - Intersection points

- [ ] `packages/core/src/domains/visualization/ui/threading/BottleneckPanel.ts`
  - Heatmap of slow operations
  - Performance metrics table

- [ ] `packages/core/src/domains/visualization/ui/threading/PatternPanel.ts`
  - Detected patterns display
  - Confidence indicators
  - Evidence viewer

#### 3.2 Tab Integration
- [ ] Update `packages/core/src/domains/visualization/templates/timeline.html`
  - Add "Threading" tab
  - Container elements for threading UI

- [ ] Update `packages/core/src/domains/visualization/webview/main.ts`
  - Route threading tab activation
  - Message handlers for threading data

- [ ] Add `packages/core/src/domains/visualization/styles/components/threading.css`
  - Thread lane styles
  - Delta marker styles
  - Dashboard layout

### Phase 4: Intelligence & Learning

**Objective**: Learning extraction and integration

#### 4.1 Learning Extractor
- [ ] `packages/core/src/domains/threading/learning/LearningExtractor.ts`
  - Analyze session for insights
  - Generate KnowledgeItem format
  - Tag extraction
  - Evidence formatting

#### 4.2 Knowledge Integration
- [ ] Connect with existing KnowledgeStore
- [ ] Auto-create learning items from sessions
- [ ] Link learnings to timeline events

## File Structure

```
packages/core/src/domains/threading/
├── types.ts                      # Core types and interfaces
├── ThreadConfig.ts               # Configuration management
├── ThreadLog.ts                  # Runtime logging
├── decorators/
│   └── ThreadSpec.ts            # Decorator implementation
├── logging/
│   ├── ThreadLogger.ts          # JSONL writer
│   └── LogRotator.ts            # Log rotation
├── analysis/
│   ├── ThreadAnalyzer.ts        # Main analyzer
│   └── patterns/                # Pattern detectors
│       ├── PerformanceDegradationPattern.ts
│       ├── ErrorClusterPattern.ts
│       ├── MemoryLeakPattern.ts
│       └── CachePattern.ts
├── learning/
│   └── LearningExtractor.ts     # Learning generation
└── index.ts                      # Public exports

packages/vscode/src/services/threading/
├── ThreadControlCenter.ts        # VSCode integration
└── ThreadFileService.ts          # File I/O

packages/core/src/domains/visualization/ui/threading/
├── ThreadingViewController.ts    # Main tab controller
├── ThreadTimelineController.ts   # Timeline viz
├── BottleneckPanel.ts           # Performance panel
└── PatternPanel.ts              # Pattern display

.threading/                       # Workspace config
├── config.json                  # Main config
├── logs/                        # Session logs
│   ├── session-001/
│   └── current/
├── analysis/                    # Analysis results
│   ├── patterns/
│   ├── reports/
│   └── learnings/
└── cache/                       # Temp cache
```

## Configuration Schema

```json
{
  "version": "2.0",
  "enabled": false,
  "mode": "development",
  "threads": {
    "definitions": [
      {
        "name": "DATA_FLOW",
        "description": "Main data processing",
        "color": "#4CAF50",
        "critical": false
      },
      {
        "name": "CACHE",
        "description": "Cache operations",
        "color": "#2196F3",
        "critical": false
      },
      {
        "name": "VALIDATION",
        "description": "Input validation",
        "color": "#FFC107",
        "critical": true
      }
    ],
    "active": [],
    "sampling": {
      "default": 100,
      "performance": 10,
      "error": 1
    }
  },
  "logging": {
    "path": ".threading/logs",
    "format": "jsonl",
    "buffer": {
      "enabled": true,
      "size": 1000,
      "flushInterval": 1000
    },
    "rotation": {
      "maxSize": "10MB",
      "maxAge": "7d",
      "compress": true
    }
  },
  "analysis": {
    "enabled": true,
    "mode": "batch",
    "interval": "5m",
    "patterns": [
      "performance-degradation",
      "error-clustering",
      "memory-leak",
      "cache-inefficiency"
    ]
  }
}
```

## VSCode Commands

```
Threading: Enable                  # Enable threading system
Threading: Disable                 # Disable threading system
Threading: Toggle Thread           # Toggle specific thread
Threading: Start Session           # Start named debugging session
Threading: Analyze                 # Run analysis on current session
Threading: Show Dashboard          # Open threading tab
Threading: Clear Logs              # Clear old logs
Threading: Export Learning         # Generate knowledge item
```

## Data Flow

### 1. Decorated Function Call

```typescript
@ThreadSpec({
  threads: ['DATA_FLOW'],
  timing: { min: 10, max: 100 },
  memory: { max: 1024 * 1024 }
})
async function getUser(id: string): Promise<User> {
  // Implementation
}
```

### 2. Runtime Capture

```
Function Entry → ThreadLog.enter()
    ↓
Function Execution
    ↓
Function Exit → ThreadLog.exit()
    ↓
Delta Detection → Compare actuals vs spec
    ↓
Write to Buffer → JSONL entry
    ↓
Flush to File (when buffer full or interval elapsed)
```

### 3. Analysis Flow

```
Log Files → ThreadAnalyzer.analyze()
    ↓
Pattern Detectors Run (async)
    ↓
Correlate Patterns
    ↓
Generate Insights & Recommendations
    ↓
Create Report
    ↓
(Optional) Extract Learning → KnowledgeStore
```

### 4. Visualization Update

```
Analysis Report → ThreadingViewController
    ↓
Update Timeline (D3.js)
Update Bottleneck Panel
Update Pattern Panel
    ↓
User Interaction → Filter, zoom, inspect
```

## Success Criteria

### Phase 1 (Foundation)
- [ ] ThreadSpec decorator compiles and runs with zero overhead when disabled
- [ ] ThreadLog captures entry/exit with < 5ms overhead
- [ ] Status bar shows threading state correctly
- [ ] Config loads/saves from `.threading/config.json`
- [ ] Logs write to JSONL files correctly

### Phase 2 (Analysis)
- [ ] Pattern detectors identify at least 2 real issues
- [ ] Analysis runs in < 5 seconds for 10k log entries
- [ ] Recommendations are actionable

### Phase 3 (Visualization)
- [ ] Threading tab renders without errors
- [ ] Timeline shows thread swim lanes correctly
- [ ] Delta markers appear at correct timestamps
- [ ] Bottleneck panel highlights slow functions

### Phase 4 (Learning)
- [ ] Learning extractor generates valid KnowledgeItems
- [ ] Learnings appear in knowledge base
- [ ] Learnings link back to threading sessions

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Performance overhead too high | High | Use sampling, disable by default, buffer writes |
| Log files grow too large | Medium | Implement rotation, compression, cleanup |
| Pattern detection too noisy | Medium | Tune confidence thresholds, add filters |
| Complexity overwhelms users | High | Start simple, progressive disclosure, good defaults |
| D3.js bundle size | Low | Already using D3 for timeline |

## Testing Strategy

### Unit Tests
- ThreadSpec decorator metadata
- ThreadLog delta detection
- Pattern detector algorithms
- Config schema validation

### Integration Tests
- Full decorator → log → analyze flow
- File I/O (logs, config)
- WebView message passing

### Manual Testing
- Create sample debugging session
- Verify timeline visualization
- Check pattern detection
- Test learning extraction

## Timeline

### Sprint 1 (Week 1): Foundation
- Days 1-2: Types, ThreadSpec, ThreadLog
- Days 3-4: Config, Logging, Control Center
- Day 5: Testing, documentation

### Sprint 2 (Week 2): Analysis
- Days 1-3: Pattern detectors
- Days 4-5: Analyzer engine, testing

### Sprint 3 (Week 3): Visualization
- Days 1-2: Threading tab setup
- Days 3-4: D3.js timeline, panels
- Day 5: Testing, polish

### Sprint 4 (Week 4): Intelligence
- Days 1-2: Learning extractor
- Days 3-4: Knowledge integration
- Day 5: End-to-end testing, documentation

## Next Steps

1. Create `packages/core/src/domains/threading/types.ts`
2. Implement `ThreadSpec` decorator
3. Create `ThreadLog` runtime tracker
4. Set up configuration system
5. Add status bar control

Let's begin with Phase 1 implementation.
