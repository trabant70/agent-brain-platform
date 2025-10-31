# Code Structure Review - Visualization Implementation Plan

**Date:** October 30, 2025
**Version:** 0.5.53+
**Status:** Ready for Implementation

---

## Executive Summary

All 22 visualization classes are **fully implemented** in the codebase. The task is to **wire them up** to the new unified CodeStructurePanel architecture and ensure they work with streaming analysis data and the filter-driven approach.

### Current State

- **Implemented Visualizations:** 22/22 (100%)
- **Active in UI:** 8/22 (36%)
- **Ready to Activate:** 14/22 (64%)

### Scope of Work

1. Add 11 new visualization tabs to CodeStructurePanel
2. Wire up renderVisualization() switch cases for all 19 visualization types
3. Verify AnalysisDataMapper methods produce correct data formats
4. Test all visualizations with streaming analysis data
5. Ensure filter support works for all visualizations

---

## Visualization Inventory

### ✅ Currently Active (8 visualizations)

| # | Visualization | Tab ID | Purpose | Data Source |
|---|---------------|--------|---------|-------------|
| 1 | **GaugeChart** | `gauge` | Overall quality score display | `summary.overallScore` |
| 2 | **BubbleChart** | `bubble` | Category overview with score-based sizing | `categories[]` with scores |
| 3 | **RadarChart** | `radar` | Category comparison across dimensions | `categories[]` scores |
| 4 | **SankeyDiagram** | `sankey` | Issue flow (Category→Severity or File→Severity) | `categories[].issues[]` |
| 5 | **StackedBarChart** | `stacked-bar` | Severity distribution per file | `categories[].issues[]` by file |
| 6 | **HeatmapVisualization** | `heatmap` | Issue density heatmap (File × Severity) | `categories[].issues[]` |
| 7 | **SunburstDiagram** | `sunburst` | Hierarchical file structure | File paths with issue counts |
| 8 | **TimelineVisualization** | `timeline` | Historical score trends | `timeline[]` data |

### 🔜 Ready to Activate (11 visualizations)

| # | Visualization | Proposed Tab ID | Purpose | Data Requirements |
|---|---------------|-----------------|---------|-------------------|
| 9 | **TreemapVisualization** | `treemap` | File/category size by issue count | Hierarchical structure with values |
| 10 | **DependencyGraph** | `dependencies` | Code dependencies force graph | `dependencies[]` source→target |
| 11 | **ChordDiagram** | `chord` | Module relationship matrix | Module-to-module dependencies |
| 12 | **ParallelCoordinates** | `parallel` | Multi-metric comparison | Multiple metrics per file |
| 13 | **CalendarHeatmap** | `calendar` | Daily activity patterns | `timeline[]` with date grouping |
| 14 | **StreamGraph** | `stream` | Issue trends over time by category | Historical `timeline[]` per category |
| 15 | **ArcDiagram** | `arc` | Sequential dependency visualization | Ordered dependencies |
| 16 | **MatrixView** | `matrix` | Test coverage adjacency matrix | Test→Source relationships |
| 17 | **TestCoverageNetworkGraph** | `test-network` | Bipartite test-source graph | `testCoverage.files[]` |
| 18 | **FlameGraph** | `flame` | Performance/complexity hierarchy | File complexity tree |
| 19 | **I18nGeographicHeatmap** | `i18n-map` | Translation coverage by region | `i18n.locales[]` with geographic data |

### 🔧 Infrastructure (2 classes)

| # | Class | Purpose | Status |
|---|-------|---------|--------|
| 20 | **BaseVisualization** | Base class for all visualizations | ✅ Active |
| 21 | **VisualizationManager** | Factory/coordinator | ✅ Active |

---

## Implementation Strategy

### Phase 1: Add Visualizations with Existing Data ✅ (Priority 1)

These visualizations can work with the current AnalysisData structure **immediately**.

#### 1.1 TreemapVisualization

**Tab Configuration:**
```typescript
{
  id: 'treemap',
  label: 'Category Sizes',
  icon: '🟦',
  containerId: 'viz-treemap'
}
```

**Data Mapping:** Already implemented in `AnalysisDataMapper.toTreemap()`

**Render Case:**
```typescript
case 'treemap':
  const treemapData = dataMapper.toTreemap(filteredData);
  await vizManager.createVisualization(container.id, 'treemap', treemapData);
  break;
```

#### 1.2 DependencyGraph

**Tab Configuration:**
```typescript
{
  id: 'dependencies',
  label: 'Dependencies',
  icon: '🔗',
  containerId: 'viz-dependencies'
}
```

**Data Mapping:** Already implemented in `AnalysisDataMapper.toDependencyGraph()`

**Render Case:**
```typescript
case 'dependencies':
  const depData = dataMapper.toDependencyGraph(filteredData);
  await vizManager.createVisualization(container.id, 'dependency-graph', depData);
  break;
```

#### 1.3 ChordDiagram

**Tab Configuration:**
```typescript
{
  id: 'chord',
  label: 'Module Relations',
  icon: '🔄',
  containerId: 'viz-chord'
}
```

**Data Mapping:** Already implemented in `AnalysisDataMapper.toChordDiagram()`

#### 1.4 ParallelCoordinates

**Tab Configuration:**
```typescript
{
  id: 'parallel',
  label: 'Multi-Metric Compare',
  icon: '📊',
  containerId: 'viz-parallel'
}
```

**Data Mapping:** Already implemented in `AnalysisDataMapper.toParallelCoordinates()`

#### 1.5 CalendarHeatmap

**Tab Configuration:**
```typescript
{
  id: 'calendar',
  label: 'Activity Calendar',
  icon: '📅',
  containerId: 'viz-calendar'
}
```

**Data Mapping:** Already implemented in `AnalysisDataMapper.toCalendarHeatmap()`

#### 1.6 StreamGraph

**Tab Configuration:**
```typescript
{
  id: 'stream',
  label: 'Trend Stream',
  icon: '🌊',
  containerId: 'viz-stream'
}
```

**Data Mapping:** Already implemented in `AnalysisDataMapper.toStreamGraph()` (needs to be added to mapper)

---

### Phase 2: Visualizations Requiring Data Enhancement 📋 (Priority 2)

These visualizations need additional data from the streaming analysis pipeline.

#### 2.1 TestCoverageNetworkGraph

**Required Data:** Test file → Source file relationships

**Backend Enhancement:**
- Analyzer needs to capture test import statements
- Map test files to tested source files
- Add to `AnalysisData.testCoverage.files[]`

**Frontend:**
- `AnalysisDataMapper.toTestCoverageNetwork()` already implemented
- Add tab when data is available

#### 2.2 MatrixView

**Required Data:** Binary test coverage matrix

**Backend Enhancement:**
- Create test × source adjacency matrix
- Calculate coverage strength (0-1)

**Frontend:**
- `AnalysisDataMapper.toMatrixView()` (needs to be implemented in mapper)
- Add tab when data is available

#### 2.3 FlameGraph

**Required Data:** Hierarchical file complexity/performance data

**Backend Enhancement:**
- Calculate cyclomatic complexity per function
- Build call graph hierarchy
- Add timing data if available

**Frontend:**
- `AnalysisDataMapper.toFlameGraph()` already implemented
- Add tab when data is available

#### 2.4 I18nGeographicHeatmap

**Required Data:** Locale coverage with geographic coordinates

**Backend Enhancement:**
- Scan i18n files for locale codes
- Map locale codes to geographic regions
- Calculate translation percentage per locale

**Frontend:**
- `AnalysisDataMapper.toI18nGeographic()` (needs to be implemented)
- Add tab when data is available

#### 2.5 ArcDiagram

**Required Data:** Sequential dependencies (import order)

**Backend Enhancement:**
- Parse import statements to determine order
- Build directed dependency graph
- Topological sort for sequential layout

**Frontend:**
- `AnalysisDataMapper.toArcDiagram()` (needs to be implemented)
- Add tab when data is available

---

## Implementation Steps

### Step 1: Update CodeStructurePanel Tabs ✅

**File:** `packages/core/src/domains/visualization/webview/ui-panels/CodeStructurePanel.ts`

**Action:** Add 11 new tabs to `renderVisualizationTabs()` method

```typescript
const tabs: VizTab[] = [
  // Existing 8 tabs...
  { id: 'gauge', label: 'Quality Score', icon: '🎯', containerId: 'viz-gauge' },
  { id: 'bubble', label: 'Category Overview', icon: '⚫', containerId: 'viz-bubble' },
  { id: 'radar', label: 'Category Comparison', icon: '📡', containerId: 'viz-radar' },
  { id: 'sankey', label: 'Issue Flow', icon: '🌊', containerId: 'viz-sankey' },
  { id: 'stacked-bar', label: 'Severity Distribution', icon: '📈', containerId: 'viz-stacked-bar' },
  { id: 'heatmap', label: 'Issue Density', icon: '🗺️', containerId: 'viz-heatmap' },
  { id: 'sunburst', label: 'File Hierarchy', icon: '🌞', containerId: 'viz-sunburst' },
  { id: 'timeline', label: 'Trend Analysis', icon: '📈', containerId: 'viz-timeline' },

  // NEW: Phase 1 - Working with current data
  { id: 'treemap', label: 'Category Sizes', icon: '🟦', containerId: 'viz-treemap' },
  { id: 'dependencies', label: 'Dependencies', icon: '🔗', containerId: 'viz-dependencies' },
  { id: 'chord', label: 'Module Relations', icon: '🔄', containerId: 'viz-chord' },
  { id: 'parallel', label: 'Multi-Metric', icon: '📊', containerId: 'viz-parallel' },
  { id: 'calendar', label: 'Activity Calendar', icon: '📅', containerId: 'viz-calendar' },
  { id: 'stream', label: 'Trend Stream', icon: '🌊', containerId: 'viz-stream' },

  // NEW: Phase 2 - Requires data enhancement (add when data ready)
  // { id: 'test-network', label: 'Test Coverage', icon: '🧪', containerId: 'viz-test-network' },
  // { id: 'matrix', label: 'Coverage Matrix', icon: '⬛', containerId: 'viz-matrix' },
  // { id: 'flame', label: 'Complexity Flame', icon: '🔥', containerId: 'viz-flame' },
  // { id: 'i18n-map', label: 'I18n Coverage', icon: '🌍', containerId: 'viz-i18n-map' },
  // { id: 'arc', label: 'Dependency Arc', icon: '🌉', containerId: 'viz-arc' },
];
```

### Step 2: Update renderVisualization() Switch ✅

**File:** Same as Step 1

**Action:** Add cases for all 11 new visualizations

```typescript
private async renderVisualization(
  tabId: string,
  filteredData: AnalysisData,
  filterCriteria: FilterCriteria
): Promise<void> {
  const container = this.tabManager?.getTabContainer(tabId);
  if (!container) return;

  // Check if already rendered (lazy rendering)
  if (container.children.length > 0) {
    return;
  }

  try {
    const dataMapper = this.coordinator.getDataMapper();
    const vizManager = this.coordinator.getVisualizationManager();

    const isSingleCategory = this.isSingleCategorySelected(filterCriteria);
    const selectedCategoryId = this.getSelectedCategoryId(filterCriteria, filteredData);

    switch (tabId) {
      // ... existing 8 cases ...

      // NEW: Phase 1 visualizations
      case 'treemap':
        const treemapData = dataMapper.toTreemap(filteredData);
        await vizManager.createVisualization(container.id, 'treemap', treemapData);
        break;

      case 'dependencies':
        const depData = dataMapper.toDependencyGraph(filteredData);
        await vizManager.createVisualization(container.id, 'dependency-graph', depData);
        break;

      case 'chord':
        const chordData = dataMapper.toChordDiagram(filteredData);
        await vizManager.createVisualization(container.id, 'chord', chordData);
        break;

      case 'parallel':
        const parallelData = dataMapper.toParallelCoordinates(filteredData);
        await vizManager.createVisualization(container.id, 'parallel-coordinates', parallelData);
        break;

      case 'calendar':
        const calendarData = dataMapper.toCalendarHeatmap(filteredData);
        await vizManager.createVisualization(container.id, 'calendar-heatmap', calendarData);
        break;

      case 'stream':
        const streamData = isSingleCategory && selectedCategoryId
          ? dataMapper.toStreamGraph(filteredData, selectedCategoryId)
          : dataMapper.toStreamGraph(filteredData);
        await vizManager.createVisualization(container.id, 'stream-graph', streamData);
        break;

      // Phase 2 cases (add when data ready):
      // case 'test-network': ...
      // case 'matrix': ...
      // case 'flame': ...
      // case 'i18n-map': ...
      // case 'arc': ...
    }
  } catch (error) {
    console.error(`Error rendering ${tabId} visualization:`, error);
  }
}
```

### Step 3: Verify AnalysisDataMapper Methods ✅

**File:** `packages/core/src/domains/visualization/webview/coordination/AnalysisDataMapper.ts`

**Action:** Check that all transformation methods exist and return correct data formats

**Existing Methods:**
- ✅ `toBubbleChart()` - lines 116-143
- ✅ `toGaugeChart()` - lines 144-185
- ✅ `toRadarChart()` - lines 186-222
- ✅ `toSunburstDiagram()` - lines 223-237
- ✅ `toHeatmap()` - lines 238-293
- ✅ `toOverviewSankey()` - lines 294-352
- ✅ `toSankeyDiagram()` - lines 353-413
- ✅ `toTimelineVisualization()` - lines 414-448
- ✅ `toDependencyGraph()` - lines 449-482
- ✅ `toChordDiagram()` - lines 483-516
- ✅ `toParallelCoordinates()` - lines 517-549
- ✅ `toCalendarHeatmap()` - lines 550-576
- ✅ `toTestCoverageNetwork()` - lines 577-637
- ✅ `toStackedBarChart()` - lines 638-695
- ✅ `toTreemap()` - lines 696-710
- ✅ `toFlameGraph()` - lines 711+

**Missing Methods (need to add):**
- ❌ `toStreamGraph()` - Add method for StreamGraph visualization
- ❌ `toMatrixView()` - Add method for MatrixView visualization
- ❌ `toArcDiagram()` - Add method for ArcDiagram visualization
- ❌ `toI18nGeographic()` - Add method for I18nGeographicHeatmap

### Step 4: Add Missing AnalysisDataMapper Methods ✅

Add the 4 missing transformation methods to support all visualizations.

### Step 5: Update VisualizationManager Type Mapping ✅

**File:** `packages/core/src/domains/visualization/webview/visualizations/VisualizationManager.ts`

**Action:** Ensure all 19 visualization types are registered

### Step 6: Testing Plan ✅

1. **Unit Test Each Mapper Method**
   - Verify data structure matches visualization expectations
   - Test with empty data
   - Test with minimal data
   - Test with full dataset

2. **Integration Test**
   - Run analysis on real codebase
   - Navigate through all 19 visualization tabs
   - Verify each renders correctly
   - Test filter interactions

3. **Performance Test**
   - Measure rendering time for large datasets
   - Check lazy loading works (visualizations only render on tab activation)
   - Verify no memory leaks

---

## Data Structure Requirements

### Current AnalysisData Structure

```typescript
interface AnalysisData {
  summary?: {
    overallScore?: number;
    totalIssues?: number;
    criticalIssues?: number;
    highIssues?: number;
    mediumIssues?: number;
    lowIssues?: number;
    categories?: any[];
  };
  categories?: Array<{
    categoryId: string;
    categoryName: string;
    score?: number;
    status?: string;
    issues?: Array<{
      severity: string;
      file?: string;
      filePath?: string;
      line?: number;
      column?: number;
      message?: string;
      description?: string;
      category?: string;
      impact?: string;
      suggestion?: string;
    }>;
  }>;
  files?: Array<{
    path: string;
    issues?: any[];
    size?: number;
    complexity?: number;
    coverage?: number;
  }>;
  dependencies?: Array<{
    source: string;
    target: string;
    type?: string;
    count?: number;
  }>;
  timeline?: Array<{
    timestamp: Date;
    score?: number;
    issues?: number;
    commit?: string;
  }>;
  testCoverage?: {
    overall?: number;
    files?: Array<{
      file: string;
      coverage: number;
      tests?: string[];
    }>;
  };
  i18n?: {
    locales?: Array<{
      code: string;
      name: string;
      coverage: number;
      missingKeys?: number;
    }>;
  };
}
```

### Data Enhancements Needed (Phase 2)

1. **Dependencies Array:** Needs population from actual code analysis
2. **TestCoverage.files:** Needs test→source mapping
3. **Files Array:** Needs complexity/size/coverage metrics
4. **I18n.locales:** Needs geographic coordinates for map visualization
5. **Timeline Array:** Needs historical analysis data

---

## Success Criteria

### Phase 1 Complete When:
- ✅ 14 visualizations active in CodeStructurePanel (8 existing + 6 new)
- ✅ All mapper methods produce valid data
- ✅ All visualizations render without errors
- ✅ Filter interactions work for all visualizations
- ✅ Lazy loading works (render on tab activation)
- ✅ No console errors in production build

### Phase 2 Complete When:
- ✅ Backend streaming analyzer enhanced to capture dependency data
- ✅ Test coverage mapping implemented
- ✅ All 19 visualizations active and tested
- ✅ Performance acceptable (<2s render time for any visualization)
- ✅ Documentation updated

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Data format mismatch | Medium | High | Validate mapper output against visualization expectations |
| Performance issues with large datasets | High | Medium | Implement data sampling/pagination for >1000 items |
| Dependency/test data not available | High | Low | Phase 2 visualizations are optional enhancements |
| Visualization rendering errors | Medium | Medium | Comprehensive error handling with fallback messages |

---

## Timeline Estimate

| Phase | Task | Estimated Time |
|-------|------|----------------|
| 1 | Add 6 new tabs | 30 minutes |
| 1 | Add 6 render cases | 30 minutes |
| 1 | Add 4 missing mapper methods | 2 hours |
| 1 | Update VisualizationManager | 15 minutes |
| 1 | Testing & debugging | 2 hours |
| **Phase 1 Total** | | **5 hours** |
| 2 | Backend enhancements | 8 hours |
| 2 | Add remaining 5 tabs | 30 minutes |
| 2 | Testing & polish | 3 hours |
| **Phase 2 Total** | | **11.5 hours** |
| **Grand Total** | | **16.5 hours** |

---

## Next Actions

1. **Immediate:** Implement Phase 1 (6 visualizations with existing data)
2. **Week 1:** Complete Phase 1 testing
3. **Week 2:** Begin Phase 2 backend enhancements
4. **Week 3:** Complete Phase 2 and final testing
5. **Week 4:** Documentation and release

---

**Document Version:** 1.0
**Last Updated:** October 30, 2025
**Author:** Implementation Team
**Status:** Ready for Implementation
