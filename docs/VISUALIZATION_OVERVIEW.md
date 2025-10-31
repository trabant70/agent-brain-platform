# Visualization Usage Overview

This document maps all D3 visualizations to their specific usage contexts within the Agent Brain Platform, with analysis of redundancies and recommendations.

## Summary

**Total Visualization Classes**: 22 (including 2 infrastructure classes)
**Currently Active**: 13 (optimized + 2 advanced)
**Not Yet Active**: 7
**Infrastructure**: 2 (BaseVisualization, VisualizationManager)

**Last Major Update**: Added 2 advanced visualizations (MatrixView, TestCoverageNetworkGraph)

---

## Visualization Matrix

### ✅ Currently Active (13 visualizations - Optimized + Advanced)

| # | Visualization | Tab ID | Purpose | Status |
|---|---------------|--------|---------|--------|
| 1 | **GaugeChart** | `gauge` | Overall quality score display (single metric) | ✅ Essential |
| 2 | **BubbleChart** | `bubble` | Category overview with score-based sizing | ✅ Essential |
| 3 | **RadarChart** | `radar` | Multi-dimensional category comparison | ✅ Essential |
| 4 | **SankeyDiagram** | `sankey` | Issue flow (Category→Severity or File→Severity) | ✅ Essential |
| 5 | **StackedBarChart** | `stacked-bar` | Severity distribution per file | ✅ Essential |
| 6 | **HeatmapVisualization** | `heatmap` | File × Severity issue density matrix | ✅ Essential |
| 7 | **TimelineVisualization** | `timeline` | Historical score trends (line chart) | ✅ Essential |
| 8 | **TreemapVisualization** | `treemap` | Hierarchical data as nested rectangles | ✅ Essential |
| 9 | **DependencyGraph** | `dependencies` | Code dependencies force-directed graph | ✅ Essential |
| 10 | **MatrixView** | `matrix` | Dependency adjacency matrix (compact view) | ✅ Advanced |
| 11 | **ParallelCoordinates** | `parallel` | Multi-metric file comparison | ✅ Advanced |
| 12 | **TestCoverageNetworkGraph** | `test-network` | Test-to-source mapping (bipartite graph) | ✅ Advanced |
| 13 | **CalendarHeatmap** | `calendar` | Daily activity patterns (calendar format) | ✅ Essential |

### ❌ Removed (3 visualizations - Redundant)

| # | Visualization | Reason for Removal | Replacement |
|---|---------------|-------------------|-------------|
| 12 | **ChordDiagram** | Redundant with DependencyGraph (same data, less intuitive) | Use DependencyGraph |
| 13 | **StreamGraph** | Redundant with TimelineVisualization (less precise) | Use Timeline |
| 14 | **SunburstDiagram** | Redundant with TreemapVisualization (less practical) | Use Treemap |

### 🔜 Not Yet Active (6 visualizations)

| # | Visualization | Purpose | Status | Redundancy Risk |
|---|---------------|---------|--------|-----------------|
| 15 | **ArcDiagram** | Sequential dependencies (linear with arcs) | Not wired up | ❌ Redundant with Dependencies |
| 16 | **MatrixView** | Adjacency matrix of all dependencies | Not wired up | ✅ Complementary to Dependencies |
| 17 | **MultiLayerSankey** | 3+ layer flow (frontend → API → service → DB) | Not wired up | ⚠️ More complex than Sankey |
| 18 | **TestCoverageNetworkGraph** | Bipartite test-to-source graph | Needs data | ✅ Unique (specialized) |
| 19 | **FlameGraph** | Performance profiling hierarchy | Needs data | ⚠️ Similar to Treemap/Sunburst |
| 20 | **I18nGeographicHeatmap** | Translation coverage by region | Needs data | ✅ Unique (specialized) |

### 🔧 Infrastructure (2 classes)

| # | Class | Purpose |
|---|-------|---------|
| 21 | **BaseVisualization** | Base class for all visualizations |
| 22 | **VisualizationManager** | Factory/coordinator for visualization lifecycle |

---

## Redundancy Analysis & Recommendations

After reviewing all 20 visualization implementations, several show similar concepts in different visual formats. Here's the analysis:

### 🔴 High Redundancy (Consider Removing)

**1. Dependency Visualizations (4 showing same data)**

All four visualizations show the same dependency data in different layouts:
- **DependencyGraph** (✅ Active) - Force-directed, most interactive and intuitive
- **ChordDiagram** (✅ Active) - Circular layout, aesthetically pleasing but less clear
- **ArcDiagram** (❌ Not active) - Linear with arcs, limited use case
- **MatrixView** (❌ Not active) - Grid layout, compact for large datasets

**Recommendation**:
- **Keep**: DependencyGraph (primary), MatrixView (alternative for large datasets)
- **Remove**: ChordDiagram, ArcDiagram (redundant, less intuitive)

**2. Hierarchy Visualizations (3 showing same structure)**

- **TreemapVisualization** (✅ Active) - Rectangular nested boxes, space-efficient
- **SunburstDiagram** (✅ Active) - Radial/circular, visually striking
- **FlameGraph** (❌ Not active) - Stacked bars, only useful for performance profiling

**Recommendation**:
- **Keep**: Treemap (compact, practical) OR Sunburst (beautiful, intuitive) - pick one
- **Remove**: FlameGraph unless performance profiling becomes a key feature

### 🟡 Medium Redundancy (Consider Consolidating)

**3. Time-based Trend Visualizations (2 similar)**

- **TimelineVisualization** (✅ Active) - Line chart, precise trend tracking
- **StreamGraph** (✅ Active) - Stacked area, shows composition but less precise

**Recommendation**:
- **Keep**: Timeline (more precise, standard format)
- **Consider Removing**: StreamGraph (nice-to-have but not essential)

**4. Flow Visualizations (2 related)**

- **SankeyDiagram** (✅ Active) - 2-layer flow, sufficient for current use case
- **MultiLayerSankey** (❌ Not active) - 3+ layers, adds complexity

**Recommendation**:
- **Keep**: SankeyDiagram (simpler, covers 90% of use cases)
- **Don't Activate**: MultiLayerSankey (overkill unless complex architecture mapping is needed)

### ✅ Low/No Redundancy (Unique Value)

These visualizations provide orthogonal, useful representations:

**Summary & Overview**:
- **GaugeChart** - Single metric display ✅
- **BubbleChart** - Category overview with size encoding ✅
- **RadarChart** - Multi-dimensional comparison ✅

**Issue Analysis**:
- **StackedBarChart** - Severity distribution by file ✅
- **HeatmapVisualization** - Spatial issue density ✅

**Multi-Metric Comparison**:
- **ParallelCoordinates** - Multi-metric file comparison ✅

**Temporal Analysis**:
- **CalendarHeatmap** - Daily activity patterns (different from Timeline) ✅

**Specialized Use Cases**:
- **TestCoverageNetworkGraph** - Test coverage mapping ✅
- **I18nGeographicHeatmap** - Geographic translation coverage ✅

---

## Proposed Visualization Lineup (Optimized)

### Core Set (10 visualizations - no redundancy)

**Summary & Metrics**:
1. GaugeChart - Overall score
2. BubbleChart - Category overview
3. RadarChart - Multi-category comparison

**Issue Analysis**:
4. SankeyDiagram - Issue flow
5. StackedBarChart - Severity distribution
6. HeatmapVisualization - Issue density

**Structure & Dependencies**:
7. TreemapVisualization OR SunburstDiagram - Hierarchy (choose one)
8. DependencyGraph - Code dependencies

**Trends & Patterns**:
9. TimelineVisualization - Historical trends
10. CalendarHeatmap - Activity patterns

### Optional Add-ons (3 visualizations - specialized)

11. **ParallelCoordinates** - Advanced multi-metric comparison
12. **MatrixView** - Alternative dependency view for large codebases
13. **TestCoverageNetworkGraph** - Test coverage (when data available)

### Not Recommended (7 visualizations - redundant)

- ❌ ChordDiagram (use DependencyGraph instead)
- ❌ ArcDiagram (use DependencyGraph instead)
- ❌ StreamGraph (use TimelineVisualization instead)
- ❌ MultiLayerSankey (SankeyDiagram is sufficient)
- ❌ FlameGraph (unless performance profiling is core feature)
- ❌ I18nGeographicHeatmap (niche use case, rarely needed)
- ❌ Duplicate hierarchy viz (keep either Treemap OR Sunburst, not both)

**Impact**: Reducing from 14 to 10-13 active visualizations eliminates redundancy while maintaining comprehensive coverage.

---

## Detailed Usage by Tab/Context

### 1. Code Structure Review Tab

The Code Structure Review tab now uses a **unified filter-driven architecture** with **11 visualization tabs** (optimized).

All visualizations are rendered in `CodeStructurePanel.ts` with consistent filter support:
- Filter by categories (checkboxes)
- Filter by severity (Critical, High, Medium, Low)
- Adaptive rendering (single category vs all categories)

#### Active Visualization Tabs (11)

| Tab | Visualization | Purpose | Data Requirements |
|-----|---------------|---------|-------------------|
| `gauge` | GaugeChart | Overall quality score (0-100) | `summary.overallScore` |
| `bubble` | BubbleChart | Category overview with sizes | `categories[]` with scores |
| `radar` | RadarChart | Multi-dimensional comparison | Category scores across dimensions |
| `sankey` | SankeyDiagram | Issue flow (Category→Severity) | `categories[].issues[]` |
| `stacked-bar` | StackedBarChart | Severity distribution by file | Issues grouped by file and severity |
| `heatmap` | HeatmapVisualization | Issue density matrix | Files × Severity grid |
| `timeline` | TimelineVisualization | Historical trends | Analysis history data |
| `treemap` | TreemapVisualization | Category sizes (rectangles) | Hierarchical category data |
| `dependencies` | DependencyGraph | Code dependencies graph | `dependencies[]` (source→target) |
| `parallel` | ParallelCoordinates | Multi-metric comparison | Multiple metrics per file |
| `calendar` | CalendarHeatmap | Daily activity patterns | Timeline data with dates |

#### Removed Tabs (3)

| Tab | Visualization | Removed Because | Alternative |
|-----|---------------|-----------------|-------------|
| ~~`chord`~~ | ~~ChordDiagram~~ | Redundant with DependencyGraph | Use `dependencies` tab |
| ~~`stream`~~ | ~~StreamGraph~~ | Redundant with TimelineVisualization | Use `timeline` tab |
| ~~`sunburst`~~ | ~~SunburstDiagram~~ | Redundant with TreemapVisualization | Use `treemap` tab |

#### Visualization Rendering Flow

```
User selects tab
    ↓
CodeStructurePanel.handleTabChange()
    ↓
CodeStructurePanel.renderVisualization(tabId, filteredData, filterCriteria)
    ↓
AnalysisDataMapper.toXXX(filteredData, categoryId?)
    ↓
VisualizationManager.createVisualization(containerId, vizType, data)
    ↓
Specific Visualization Class (e.g., BubbleChart.renderContent())
    ↓
D3 renders to SVG container
```

**Key Features**:
- **Lazy Loading**: Visualizations only render when their tab is activated
- **Filter Integration**: All visualizations respond to filter changes
- **Adaptive Rendering**: Some visualizations adapt based on single vs multi-category selection
- **Error Handling**: Empty state messages when no data available

---

### 2. Timeline Tab (Main/Session Tab)

**Note**: This is the repository timeline, different from Code Structure Review.

**Visualizations Used**:
- Custom D3 timeline (not from the 22 visualization classes)
- Event-based visualization for Git/GitHub/Knowledge/Session events

---

### 3. Knowledge Tab

**Visualizations Used**: None (uses tables, accordions, forms)

---

### 4. Threading Tab

**Visualizations Used**: None (uses UI panels, badges)

---

## Data Flow

```
User Action
    ↓
UI Panel (Overview/CategoryDetail/FileDetail)
    ↓
VisualizationCoordinator.renderCurrentState()
    ↓
AnalysisDataMapper.toXXX() ← Transforms StreamingAnalysisResult
    ↓
VisualizationManager.createVisualization()
    ↓
Specific Visualization Class (e.g., BubbleChart)
    ↓
D3 Rendering in SVG container
```

---

## Recent Changes & Implementation History

### Phase 1 Expansion (v0.5.53 - October 30, 2025) ✅

Added 6 new visualization tabs:
1. **TreemapVisualization** - Category sizes as nested rectangles
2. **DependencyGraph** - Force-directed code dependency graph
3. **ChordDiagram** - Circular module relationship diagram
4. **ParallelCoordinates** - Multi-dimensional metric comparison
5. **CalendarHeatmap** - Daily activity patterns in calendar format
6. **StreamGraph** - Stacked area chart for trends

**Architecture Changes**:
- Unified filter-driven architecture in `CodeStructurePanel`
- Removed navigation-based approach (OverviewPanel, CategoryDetailPanel deleted)
- All visualizations now support consistent filtering
- Added `VisualizationTabManager` for tab management
- Implemented lazy loading (render on tab activation)

### Earlier Additions (v0.5.26) ✅

1. **D3 Sankey Plugin**
   - Installed `d3-sankey` and `@types/d3-sankey`
   - Exposed on `window.d3.sankey` in `main.ts`
   - SankeyDiagram now functional (previously showed fallback)

2. **Analysis History Persistence**
   - Storage: `.agent-brain/code-structure-review/analysis-history.json`
   - Format: JSON with version, lastUpdated, history array
   - Retention: Last 10 analyses
   - TimelineVisualization now shows historical trends

---

## File Locations

### Visualization Classes
`packages/core/src/domains/visualization/webview/visualizations/`

### UI Panels (Usage)
- `packages/core/src/domains/visualization/webview/ui-panels/OverviewPanel.ts`
- `packages/core/src/domains/visualization/webview/ui-panels/CategoryDetailPanel.ts`
- `packages/core/src/domains/visualization/webview/ui-panels/FileDetailPanel.ts`

### Data Mapping
`packages/core/src/domains/visualization/webview/coordination/AnalysisDataMapper.ts`

### Coordination
`packages/core/src/domains/visualization/webview/coordination/VisualizationCoordinator.ts`

---

## Implementation Status & Data Requirements

### ✅ Fully Implemented (14 active)

All active visualizations have complete implementations and working data mappers. They render successfully with current analysis data.

### 🔧 Needs Data Pipeline (6 not yet active)

These visualizations are implemented but require additional data from the backend:

1. **MatrixView** - Needs adjacency matrix of dependencies
2. **ArcDiagram** - Needs ordered/sequential dependency data
3. **MultiLayerSankey** - Needs multi-layer architectural data (frontend→API→service→DB)
4. **TestCoverageNetworkGraph** - Needs test→source file mapping
5. **FlameGraph** - Needs performance/complexity hierarchy data
6. **I18nGeographicHeatmap** - Needs locale data with geographic coordinates

**Note**: Some of these (ArcDiagram, MultiLayerSankey) are also flagged as redundant and may not be worth implementing.

---

## Adding New Visualizations

To activate a placeholder visualization:

1. **Create Data Mapper** in `AnalysisDataMapper.ts`:
   ```typescript
   toXXX(analysis: AnalysisData): XXXData { ... }
   ```

2. **Add to Coordinator** in `VisualizationCoordinator.ts`:
   ```typescript
   await this.manager.createVisualization('xxx', 'viz-xxx-container', data);
   ```

3. **Add HTML Container** in relevant panel:
   ```html
   <div id="viz-xxx-container" class="visualization-container"></div>
   ```

4. **Implement Data Pipeline** in `StreamingOrchestrator` or analyzer.

---

## Dependencies

| Visualization | D3 Plugins Required | Status |
|---------------|-------------------|--------|
| Most visualizations | `d3` (core) | ✅ Installed |
| SankeyDiagram | `d3-sankey` | ✅ Installed (v0.5.26) |
| MultiLayerSankey | `d3-sankey` | ✅ Ready |
| All others | Core D3 only | ✅ Ready |

---

## Future Roadmap & Recommendations

### ✅ Phase 1: Complete (October 2025)

Expanded from 7 to 14 active visualizations with unified filter-driven architecture.

### 🎯 Phase 2: Optimization (Recommended Next Steps)

**Priority 1: Remove Redundant Visualizations**
1. Remove or disable **ChordDiagram** (use DependencyGraph instead)
2. Remove or disable **StreamGraph** (use TimelineVisualization instead)
3. Choose either **TreemapVisualization** OR **SunburstDiagram** (not both)

**Expected outcome**: Reduce to 10-11 core visualizations with no redundancy

**Priority 2: Add MatrixView (optional)**
- Implement MatrixView as alternative dependency visualization for large codebases
- Requires backend dependency data extraction

### 🔮 Phase 3: Specialized Visualizations (Future)

Only implement if specific use cases emerge:
- **TestCoverageNetworkGraph** - If test coverage tracking becomes core feature
- **FlameGraph** - If performance profiling is needed
- **I18nGeographicHeatmap** - If geographic translation analysis is required

**Do NOT implement**:
- ❌ ArcDiagram - Redundant with DependencyGraph
- ❌ MultiLayerSankey - Overly complex for current use case

---

## Summary

The Agent Brain Platform has **11 active visualizations** providing comprehensive code quality insights with zero redundancy.

### Optimization Results ✅

**Before**: 14 visualizations (3 redundant)
**After**: 11 visualizations (0 redundant)

**Removed Redundant Visualizations:**
- ❌ **ChordDiagram** → Replaced by DependencyGraph (same data, clearer interface)
- ❌ **StreamGraph** → Replaced by TimelineVisualization (more precise trends)
- ❌ **SunburstDiagram** → Replaced by TreemapVisualization (more practical hierarchy)

**Current Lineup (11 visualizations):**
- **Summary & Metrics** (3): Gauge, Bubble, Radar
- **Issue Analysis** (3): Sankey, Stacked Bar, Heatmap
- **Structure & Dependencies** (2): Treemap, Dependencies
- **Trends & Patterns** (2): Timeline, Calendar
- **Advanced Comparison** (1): Parallel Coordinates

**Benefits:**
- ✅ Zero redundancy - each visualization provides unique insight
- ✅ Clearer user experience - less overwhelming
- ✅ Faster navigation - 21% fewer tabs
- ✅ Easier maintenance - smaller codebase footprint

---

**Last Updated**: October 31, 2025
**Version**: 0.5.55 (Optimization Complete)
**Status**: 11 active visualizations, optimized and production-ready
