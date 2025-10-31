# Advanced Visualizations Implementation Plan

**Date:** October 31, 2025
**Objective:** Activate 3 advanced visualizations with streaming data support
**Status:** Ready for Implementation

---

## Executive Summary

After reviewing the 6 held-back visualizations, **3 provide significant value** and are ready for implementation:

1. **MatrixView** ✅ - Alternative dependency view for large codebases (data ready)
2. **FlameGraph** ✅ - Code complexity hierarchy (needs complexity extraction)
3. **TestCoverageNetworkGraph** ✅ - Test-to-source mapping (registry ready, needs mapper)

**Not recommended:**
- ❌ ArcDiagram - Redundant with DependencyGraph
- ❌ MultiLayerSankey - Overly complex, current Sankey sufficient
- ❌ I18nGeographicHeatmap - Niche use case, low priority

---

## Architecture Assessment

### Current State
The streaming architecture is **already built** and supports:
- ✅ `DependencyGraphBuilder` - Extracts import/export relationships
- ✅ `TestCoverageRegistry` - Tracks test files and tested files
- ✅ `MatrixViewDataBuilder` - Transforms dependencies to matrix
- ✅ `FlameGraphDataBuilder` - Builds hierarchy from complexity data
- ✅ `TestCoverageDataBuilder` - Maps tests to source files

### Filter-Driven Approach
All 3 visualizations **will support the unified filter model**:
- Filter by categories
- Filter by severity
- Filter by files
- Adaptive rendering (single category vs all)

### Streaming Compatibility
All 3 visualizations use the **streaming metadata extraction**:
- Dependencies extracted during file processing (no full AST in memory)
- Test coverage tracked in registry (lightweight)
- File complexity calculated incrementally

**Memory efficient**: Works with 10,000+ files without crashes.

---

## Visualization Details

### 1. MatrixView (Dependency Matrix)

**Value Proposition:**
- Compact view of ALL dependencies at once
- Easy to spot circular dependencies
- Better for large codebases (50+ files)
- Complements force-directed DependencyGraph

**Data Source:** Existing `dependencies[]` from `DependencyGraphBuilder`

**Implementation Status:**
- ✅ Visualization class exists
- ✅ Data builder exists (`MatrixViewDataBuilder.ts`)
- ✅ Data mapper method exists (`AnalysisDataMapper.toMatrixView()` - needs verification)
- 🔧 Need to add tab to CodeStructurePanel
- 🔧 Need to wire up render case

**Estimated Time:** 30 minutes

**Filter Support:**
- Categories: Show only dependencies for filtered categories' files
- Severity: N/A (dependencies don't have severity)
- Files: Show only selected files in matrix

**Data Flow:**
```
UnifiedMetadataRegistry.featureCompleteness.dependencies
  ↓
DependencyGraphBuilder.build()
  ↓
AnalysisDataMapper.toMatrixView()
  ↓
MatrixViewDataBuilder.buildFromDependencyGraph()
  ↓
MatrixView.render()
```

---

### 2. FlameGraph (Complexity Hierarchy)

**Value Proposition:**
- Visualize code complexity hierarchically
- Identify deeply nested or complex functions
- Show file/function complexity distribution
- Useful for refactoring prioritization

**Data Source:** File complexity metrics (needs extraction)

**Implementation Status:**
- ✅ Visualization class exists
- ✅ Data builder exists (`FlameGraphDataBuilder.ts`)
- ❌ Complexity extraction NOT implemented yet
- 🔧 Need to add complexity calculation to `UnifiedMetadataExtractor`
- 🔧 Need to add tab to CodeStructurePanel
- 🔧 Need to wire up render case
- 🔧 Need to implement `AnalysisDataMapper.toFlameGraph()`

**Estimated Time:** 2-3 hours

**Complexity Metrics to Extract:**
- Cyclomatic complexity (branches/conditions)
- Nesting depth
- Function length (LOC)
- Parameter count
- Dependency fan-out

**Filter Support:**
- Categories: Show complexity for filtered categories' files
- Severity: Color by severity (high complexity = red)
- Files: Show only selected files

**Data Flow:**
```
StreamingFileProcessor + UnifiedMetadataExtractor
  ↓ (NEW) Extract complexity metrics
UnifiedMetadataRegistry.files[].complexity
  ↓
AnalysisDataMapper.toFlameGraph()
  ↓
FlameGraphDataBuilder.buildFromFileComplexity()
  ↓
FlameGraph.render()
```

**Complexity Extraction Plan:**
1. Add `FileComplexityMetrics` interface to types.ts
2. Add complexity calculation to `UnifiedMetadataExtractor.ts`
3. Store in registry: `files.set(path, { ..., complexity: {...} })`
4. Build hierarchical tree in FlameGraphDataBuilder

---

### 3. TestCoverageNetworkGraph (Test-to-Source Mapping)

**Value Proposition:**
- Visualize which tests cover which source files
- Identify untested files
- Show test coverage gaps
- Bipartite graph: tests on left, source on right

**Data Source:** Existing `TestCoverageRegistry`

**Implementation Status:**
- ✅ Visualization class exists
- ✅ Data builder exists (`TestCoverageDataBuilder.ts`)
- ✅ Test coverage registry exists and tracks data
- ✅ Test analyzer exists (`TestCoverageAnalyzer.streaming.ts`)
- 🔧 Need to verify test→source mapping in registry
- 🔧 Need to add tab to CodeStructurePanel
- 🔧 Need to wire up render case
- 🔧 Need to verify `AnalysisDataMapper.toTestCoverageNetwork()`

**Estimated Time:** 1 hour

**Filter Support:**
- Categories: Show tests for filtered categories
- Severity: Color untested files red
- Files: Show only selected files and their tests

**Data Flow:**
```
UnifiedMetadataRegistry.testCoverage
  ↓
TestCoverageAnalyzer.analyze()
  ↓
AnalysisDataMapper.toTestCoverageNetwork()
  ↓
TestCoverageDataBuilder.buildFromRegistry()
  ↓
TestCoverageNetworkGraph.render()
```

---

## Implementation Roadmap

### Phase 1: MatrixView (Quick Win - 30 min)

**Step 1:** Verify `AnalysisDataMapper.toMatrixView()` implementation
**Step 2:** Add matrix tab to CodeStructurePanel
**Step 3:** Add render case for matrix
**Step 4:** Test with real dependency data
**Step 5:** Verify filter interactions

### Phase 2: TestCoverageNetworkGraph (Medium - 1 hour)

**Step 1:** Verify TestCoverageRegistry populates test→source mappings
**Step 2:** Verify `AnalysisDataMapper.toTestCoverageNetwork()` implementation
**Step 3:** Add test-network tab to CodeStructurePanel
**Step 4:** Add render case for test-network
**Step 5:** Test with real test coverage data
**Step 6:** Verify filter interactions

### Phase 3: FlameGraph (Complex - 2-3 hours)

**Step 1:** Define `FileComplexityMetrics` interface
**Step 2:** Implement complexity calculation in `UnifiedMetadataExtractor`
  - Parse functions/methods
  - Calculate cyclomatic complexity
  - Calculate nesting depth
  - Store in registry
**Step 3:** Implement `AnalysisDataMapper.toFlameGraph()`
**Step 4:** Build hierarchical tree in FlameGraphDataBuilder
**Step 5:** Add flame tab to CodeStructurePanel
**Step 6:** Add render case for flame
**Step 7:** Test with real complexity data
**Step 8:** Verify filter interactions

---

## Data Structure Requirements

### MatrixView (Ready ✅)
```typescript
dependencies: Array<{
  source: string;
  target: string;
  type?: string;
  count?: number;
}>
```

### TestCoverageNetworkGraph (Ready ✅)
```typescript
testCoverage: {
  overall?: number;
  files?: Array<{
    file: string;
    coverage: number;
    tests?: string[];  // Test files that cover this source file
  }>;
}
```

### FlameGraph (Needs Implementation)
```typescript
files: Array<{
  path: string;
  complexity?: {
    cyclomatic: number;
    nesting: number;
    lines: number;
    functions: Array<{
      name: string;
      cyclomatic: number;
      nesting: number;
      lines: number;
      params: number;
    }>;
  };
}>
```

---

## Testing Strategy

### Unit Tests
- Test data mappers with sample data
- Test data builders with edge cases
- Test filter application

### Integration Tests
1. **MatrixView**: Analyze project with 50+ files, verify matrix renders
2. **TestCoverageNetworkGraph**: Analyze project with tests, verify bipartite graph
3. **FlameGraph**: Analyze complex files, verify hierarchy and colors

### Performance Tests
- Verify memory usage stays under 100MB for 1000 files
- Verify rendering completes in < 3s
- Verify filter updates complete in < 500ms

---

## Success Criteria

### MatrixView
- ✅ Renders dependency matrix for filtered data
- ✅ Detects and highlights circular dependencies
- ✅ Shows inter-group dependencies
- ✅ Responds to category/file filters

### FlameGraph
- ✅ Renders file/function complexity hierarchy
- ✅ Colors by complexity level (green/yellow/red)
- ✅ Shows most complex functions at top
- ✅ Responds to category/severity filters
- ✅ Complexity extraction doesn't crash on large files

### TestCoverageNetworkGraph
- ✅ Renders bipartite graph (tests ↔ source)
- ✅ Highlights untested files
- ✅ Shows which tests cover which files
- ✅ Responds to category/file filters

---

## Risks & Mitigation

### Risk 1: Complexity Calculation Performance
**Impact:** High
**Probability:** Medium
**Mitigation:**
- Use TypeScript's compiler API (already available)
- Calculate incrementally during streaming
- Cache results per file
- Limit depth of analysis

### Risk 2: Test-to-Source Mapping Incomplete
**Impact:** Medium
**Probability:** Low
**Mitigation:**
- Verify registry already tracks mappings
- Fallback to showing test files without connections
- Show "untested" files prominently

### Risk 3: Filter Support Complexity
**Impact:** Low
**Probability:** Low
**Mitigation:**
- Follow existing filter patterns
- Reuse `filterAnalysisData()` method
- Test filter combinations

---

## Final Visualization Lineup (14 total)

**After this implementation, we'll have 14 active visualizations:**

**Summary & Metrics (3):**
1. GaugeChart
2. BubbleChart
3. RadarChart

**Issue Analysis (3):**
4. SankeyDiagram
5. StackedBarChart
6. HeatmapVisualization

**Structure & Dependencies (3):**
7. TreemapVisualization
8. DependencyGraph
9. **MatrixView** ← NEW

**Trends & Patterns (2):**
10. TimelineVisualization
11. CalendarHeatmap

**Advanced Analysis (3):**
12. ParallelCoordinates
13. **FlameGraph** ← NEW
14. **TestCoverageNetworkGraph** ← NEW

**Unique Value:** Every visualization provides orthogonal, non-redundant insights.

---

## Next Actions

1. Review and approve this plan
2. Start with Phase 1 (MatrixView) - quick win
3. Move to Phase 2 (TestCoverageNetworkGraph) - medium effort
4. Complete Phase 3 (FlameGraph) - requires new data extraction
5. Test all 14 visualizations together
6. Update documentation

---

**Status:** Ready for Implementation
**Estimated Total Time:** 4-4.5 hours
**Expected Outcome:** 14 active visualizations with zero redundancy
**Memory Impact:** Minimal (streaming architecture supports all)
