# Visualization Usage Overview

This document maps all 20+ D3 visualizations to their specific usage contexts within the Agent Brain Platform.

## Summary

**Total Visualizations**: 22 (including base class)
**Currently Used**: 7
**Placeholder/Future**: 15

---

## Visualization Matrix

| # | Visualization | Status | Used In | Purpose |
|---|---------------|--------|---------|---------|
| 1 | **BubbleChart** | ✅ **ACTIVE** | Code Structure - Overview Panel | Category overview with score-based sizing |
| 2 | **GaugeChart** | ✅ **ACTIVE** | Code Structure - Overview Panel | Overall quality score display |
| 3 | **HeatmapVisualization** | ✅ **ACTIVE** | Code Structure - Category Detail | File-level issue heatmap |
| 4 | **SankeyDiagram** | ✅ **ACTIVE** | Code Structure - Category Detail | Flow from endpoints to features |
| 5 | **StackedBarChart** | ✅ **ACTIVE** | Code Structure - Category Detail | Issue breakdown by severity |
| 6 | **TimelineVisualization** | ✅ **ACTIVE** | Code Structure - Category Detail | Historical score trends |
| 7 | **BaseVisualization** | ✅ **ACTIVE** | N/A | Base class for all visualizations |
| 8 | **ArcDiagram** | 🔜 **PLACEHOLDER** | Not yet used | Planned for dependency visualization |
| 9 | **CalendarHeatmap** | 🔜 **PLACEHOLDER** | Not yet used | Planned for activity patterns |
| 10 | **ChordDiagram** | 🔜 **PLACEHOLDER** | Not yet used | Planned for module relationships |
| 11 | **DependencyGraph** | 🔜 **PLACEHOLDER** | Not yet used | Planned for code dependencies |
| 12 | **FlameGraph** | 🔜 **PLACEHOLDER** | Not yet used | Planned for performance profiling |
| 13 | **I18nGeographicHeatmap** | 🔜 **PLACEHOLDER** | Not yet used | Planned for translation coverage |
| 14 | **MatrixView** | 🔜 **PLACEHOLDER** | Not yet used | Planned for test coverage matrix |
| 15 | **MultiLayerSankey** | 🔜 **PLACEHOLDER** | Not yet used | Advanced feature flow analysis |
| 16 | **ParallelCoordinates** | 🔜 **PLACEHOLDER** | Not yet used | Multi-dimensional comparisons |
| 17 | **RadarChart** | 🔜 **PLACEHOLDER** | Not yet used | Category comparison |
| 18 | **StreamGraph** | 🔜 **PLACEHOLDER** | Not yet used | Trends over time |
| 19 | **SunburstDiagram** | 🔜 **PLACEHOLDER** | Not yet used | Hierarchical code structure |
| 20 | **TestCoverageNetworkGraph** | 🔜 **PLACEHOLDER** | Not yet used | Test-to-code relationships |
| 21 | **TreemapVisualization** | 🔜 **PLACEHOLDER** | Not yet used | File size by category |
| 22 | **VisualizationManager** | ✅ **ACTIVE** | N/A | Factory/coordinator for all viz |

---

## Detailed Usage by Tab/Context

### 1. Code Structure Review Tab

#### **Overview Panel** (`OverviewPanel.ts`)

Shown when first opening Code Structure Review - provides high-level summary.

**Visualizations Used:**
1. **BubbleChart** (`viz-bubble-chart`)
   - **Data**: Categories with scores and issue counts
   - **Purpose**: Quick visual comparison of all categories
   - **Interaction**: Click bubble → navigate to category detail
   - **Location**: Top of overview panel

2. **GaugeChart** (`viz-gauge-chart`)
   - **Data**: Overall quality score (0-100)
   - **Purpose**: Single-metric quality indicator
   - **Features**: Colored zones (red/yellow/green), target indicator
   - **Location**: Header summary area

#### **Category Detail Panel** (`CategoryDetailPanel.ts`)

Shown when drilling into a specific category (Feature Completeness, UI/UX, etc).

**Visualizations Used:**
1. **HeatmapVisualization** (`viz-category-heatmap`)
   - **Data**: Files × Issue count grid
   - **Purpose**: Identify hotspot files
   - **Features**: Color intensity by issue count, click to see details
   - **Location**: Top of category detail

2. **SankeyDiagram** (`viz-category-sankey`)
   - **Data**: Backend endpoints → Frontend connections
   - **Purpose**: Visualize feature flow/completeness
   - **D3 Plugin**: Requires `d3-sankey` (NOW INSTALLED ✅)
   - **Fallback**: Shows summary statistics if library missing
   - **Location**: Middle section

3. **TimelineVisualization** (`viz-category-timeline`)
   - **Data**: Historical analysis results
   - **Purpose**: Track improvement/regression over time
   - **Features**: Multi-line chart, category scores + overall
   - **Persistence**: Now saves last 10 analyses to `.agent-brain/code-structure-review/analysis-history.json` ✅
   - **Location**: Bottom of visualizations section

4. **StackedBarChart** (`viz-category-stacked-bar`)
   - **Data**: Files with issue breakdown (Critical/High/Medium/Low)
   - **Purpose**: Severity distribution per file
   - **Features**: Color-coded bars, click for file details
   - **Location**: Issue breakdown section

#### **File Detail Panel** (`FileDetailPanel.ts`)

Shown when drilling into a specific file.

**Visualizations Used**: None currently (uses tables/lists)

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

## Recent Additions (v0.5.26)

### 1. D3 Sankey Plugin ✅
- **Installed**: `d3-sankey` and `@types/d3-sankey`
- **Configured**: Exposed on `window.d3.sankey` in `main.ts`
- **Impact**: SankeyDiagram now functional (previously showed fallback)

### 2. Analysis History Persistence ✅
- **Storage**: `.agent-brain/code-structure-review/analysis-history.json`
- **Format**: JSON with version, lastUpdated, history array
- **Retention**: Last 10 analyses
- **Impact**: TimelineVisualization now shows historical trends

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

## Why So Many Unused Visualizations?

The 15 placeholder visualizations were created as part of the initial architecture design to support future features:

**Planned Features:**
- Dependency analysis (ArcDiagram, DependencyGraph, ChordDiagram)
- Performance profiling (FlameGraph)
- Geographic i18n analysis (I18nGeographicHeatmap)
- Advanced metrics (RadarChart, ParallelCoordinates)
- Historical trends (StreamGraph, CalendarHeatmap)
- Code structure (SunburstDiagram, TreemapVisualization)
- Test coverage (TestCoverageNetworkGraph, MatrixView)

**Status**: Ready to use when data pipelines are implemented.

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

## Future Roadmap

### Phase 1: Currently Active (7 visualizations)
- ✅ BubbleChart
- ✅ GaugeChart
- ✅ HeatmapVisualization
- ✅ SankeyDiagram (newly functional)
- ✅ StackedBarChart
- ✅ TimelineVisualization (newly functional with history)
- ✅ BaseVisualization

### Phase 2: Near-term Activation
- RadarChart (category comparison)
- TreemapVisualization (file size distribution)
- DependencyGraph (code dependencies)

### Phase 3: Advanced Features
- FlameGraph (performance)
- CalendarHeatmap (activity patterns)
- TestCoverageNetworkGraph (test relationships)

---

**Last Updated**: October 29, 2025
**Version**: 0.5.26
