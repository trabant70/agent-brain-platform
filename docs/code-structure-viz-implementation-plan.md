# Code Structure Review - Visualization Implementation Plan

**Status**: In Progress
**Last Updated**: 2025-10-28
**Current Implementation**: ~70% complete

---

## Executive Summary

This document maps all visualization concepts from the architectural guidance to the actual implementation, identifies gaps, and provides a prioritized implementation roadmap. The approach balances user impact, technical complexity, and dependencies.

### Current State
- ✅ **Visualization Infrastructure**: BaseVisualization, VisualizationManager complete
- ✅ **Progressive Disclosure**: MaturityLevelAdapter with 4 levels (novice → expert)
- ✅ **Educational Tooltips**: Context-sensitive help system
- ✅ **3 Core Visualizations**: Sankey, Heatmap, Bubble Chart
- ⏳ **17 Additional Visualizations**: Planned and prioritized below

---

## Visualization Inventory

### ✅ Already Implemented (3/20)

#### 1. Sankey Diagram (Feature Completeness Flow)
- **Location**: `/packages/core/src/domains/visualization/webview/visualizations/SankeyDiagram.ts`
- **Purpose**: Shows endpoint connectivity between backend and frontend
- **Features**: Color-coded links (green=connected, red=disconnected, orange=mocked), interactive tooltips
- **Integration**: Renders in Feature Completeness category section

#### 2. Heatmap Visualization (Issue Density)
- **Location**: `/packages/core/src/domains/visualization/webview/visualizations/HeatmapVisualization.ts`
- **Purpose**: File-level issue concentration with severity coloring
- **Features**: Click-to-drill-down to file details, severity-based colors, file labels
- **Integration**: Renders in all category sections for file-level issues

#### 3. Bubble Chart (Category Overview)
- **Location**: `/packages/core/src/domains/visualization/webview/visualizations/BubbleChart.ts`
- **Purpose**: High-level category comparison (size=issue count, color=status)
- **Features**: Interactive click to expand category, pack layout, status colors
- **Integration**: Renders at analysis summary level

---

## Priority 1: Core User Experience (High Impact, Medium Complexity)

These visualizations directly help users understand AI-generated code structure and should be implemented first.

### 4. Sunburst Diagram (Code Architecture Hierarchy)
**Priority**: P1
**User Impact**: ⭐⭐⭐⭐⭐ (Critical for understanding project structure)
**Technical Complexity**: ⭐⭐⭐

**Purpose**: Show nested directory/file structure with color-coded health status

**Data Structure**:
```typescript
interface SunburstNode {
  name: string;           // File or directory name
  path: string;          // Full path
  children?: SunburstNode[];
  value?: number;        // Issue count or LOC
  issueCount: number;
  criticalIssues: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
}
```

**D3 Technique**: `d3.partition()`, `d3.arc()`

**Interactions**:
- Click to zoom into directory
- Breadcrumb navigation to zoom out
- Tooltip showing file stats
- Hover highlights path to root

**Integration Point**: Code Structure tab header (first visualization users see)

**Data Builder**: Create `SunburstDataBuilder` in `/detectors/` that traverses analysis results and builds hierarchy

---

### 5. Code Dependency Graph (File Relationships)
**Priority**: P1
**User Impact**: ⭐⭐⭐⭐⭐ (Essential for understanding component connections)
**Technical Complexity**: ⭐⭐⭐⭐

**Purpose**: Show import/export relationships between files

**Data Structure**:
```typescript
interface DependencyNode {
  id: string;            // File path
  label: string;         // File name
  type: 'component' | 'service' | 'utility' | 'config';
  issueCount: number;
  inDegree: number;      // How many files depend on this
  outDegree: number;     // How many files this depends on
}

interface DependencyLink {
  source: string;
  target: string;
  type: 'import' | 'export' | 'both';
  strength: number;      // How many times imported
}
```

**D3 Technique**: `d3.forceSimulation()`, `d3.forceLink()`, `d3.forceCollide()`

**Interactions**:
- Click node to highlight all dependencies
- Filter by file type (components, services, etc)
- Search for specific file
- Toggle showing only problematic files

**Integration Point**: New "Dependencies" tab in Code Structure view

**Data Builder**: `DependencyGraphBuilder` - requires AST analysis to extract import/export statements

---

### 6. Treemap (Issue Distribution by Category)
**Priority**: P1
**User Impact**: ⭐⭐⭐⭐ (Quick visual hierarchy)
**Technical Complexity**: ⭐⭐

**Purpose**: Show categories as rectangles sized by issue count

**Data Structure**:
```typescript
interface TreemapNode {
  name: string;          // Category name
  value: number;         // Issue count
  severity: string;      // Overall severity
  children?: TreemapNode[];
}
```

**D3 Technique**: `d3.treemap()`, `d3.hierarchy()`

**Interactions**:
- Click to drill into subcategories
- Hover for tooltip with details
- Color by severity or category

**Integration Point**: Analysis summary section (alternative to bubble chart)

**Data Builder**: Reuse existing category analysis data, transform to hierarchical format

---

## Priority 2: Advanced Insights (High Impact, High Complexity)

These provide deeper understanding but require more sophisticated data analysis.

### 7. Timeline Visualization (Code Evolution)
**Priority**: P2
**User Impact**: ⭐⭐⭐⭐ (Shows how issues evolved)
**Technical Complexity**: ⭐⭐⭐⭐

**Purpose**: Show how code quality metrics changed over git commits

**Data Structure**:
```typescript
interface TimelinePoint {
  timestamp: Date;
  commitHash: string;
  overallScore: number;
  categoryScores: Record<string, number>;
  issuesCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}
```

**D3 Technique**: `d3.line()`, `d3.scaleTime()`, multi-series line chart

**Interactions**:
- Click commit to see detailed analysis
- Toggle showing specific categories
- Compare two commits

**Integration Point**: New "History" tab or expandable section in summary

**Data Builder**: `CodeEvolutionAnalyzer` - run analysis on multiple commits, store results

---

### 8. Chord Diagram (Module Coupling)
**Priority**: P2
**User Impact**: ⭐⭐⭐⭐ (Identifies tight coupling)
**Technical Complexity**: ⭐⭐⭐⭐

**Purpose**: Show dependencies between modules/directories

**Data Structure**:
```typescript
interface ChordData {
  modules: string[];     // Module names
  matrix: number[][];    // Dependency counts [from][to]
}
```

**D3 Technique**: `d3.chord()`, `d3.ribbon()`

**Interactions**:
- Hover to highlight specific module connections
- Click to filter showing only one module
- Color by module type

**Integration Point**: Dependencies tab, adjacent to force graph

**Data Builder**: Aggregate file-level dependencies to directory/module level

---

### 9. Radar Chart (Category Health)
**Priority**: P2
**User Impact**: ⭐⭐⭐ (Good for comparison)
**Technical Complexity**: ⭐⭐

**Purpose**: Show scores across all categories in radial layout

**Data Structure**:
```typescript
interface RadarData {
  category: string;
  score: number;         // 0-100
  maxScore: number;      // Always 100
}
```

**D3 Technique**: `d3.lineRadial()`, `d3.scaleLinear()`

**Interactions**:
- Overlay multiple projects for comparison
- Click axis to jump to category
- Animate changes over time

**Integration Point**: Summary section, alternative to bubble chart

**Data Builder**: Use existing category scores

---

### 10. Flame Graph (Call Stack / Performance)
**Priority**: P2
**User Impact**: ⭐⭐⭐⭐ (For performance-focused analysis)
**Technical Complexity**: ⭐⭐⭐⭐⭐

**Purpose**: Show function call hierarchy with time/complexity

**Data Structure**:
```typescript
interface FlameNode {
  name: string;          // Function name
  value: number;         // Time or complexity
  children?: FlameNode[];
  filePath: string;
  lineNumber: number;
}
```

**D3 Technique**: Custom implementation using `d3.partition()` with horizontal bars

**Interactions**:
- Click to zoom into function
- Search for function name
- Filter by file

**Integration Point**: New "Performance" tab (future enhancement)

**Data Builder**: Requires runtime profiling data or static complexity analysis

**Note**: This is lower priority since it requires additional data sources (profiling or advanced AST analysis)

---

## Priority 3: Specialized Views (Medium Impact, Variable Complexity)

These serve specific use cases and can be implemented as enhancements.

### 11. Geographic Heatmap (Internationalization Coverage)
**Priority**: P3
**User Impact**: ⭐⭐⭐ (Only for i18n-focused projects)
**Technical Complexity**: ⭐⭐⭐

**Purpose**: Show translation coverage by locale on world map

**Data Structure**:
```typescript
interface I18nCoverage {
  locale: string;        // 'en-US', 'fr-FR', etc
  coverage: number;      // Percentage 0-100
  missingKeys: number;
  totalKeys: number;
}
```

**D3 Technique**: `d3.geoPath()`, TopoJSON, color scales

**Interactions**:
- Click country to see missing translations
- Zoom into regions
- Toggle showing different completion levels

**Integration Point**: Internationalization category detail section

**Data Builder**: Extend `InternationalizationAnalyzer` to calculate per-locale coverage

---

### 12. Sankey Diagram - Enhanced (Multi-Layer Flow)
**Priority**: P3
**User Impact**: ⭐⭐⭐ (Refinement of existing)
**Technical Complexity**: ⭐⭐

**Purpose**: Extend existing Sankey to show 3+ layers (frontend → API → service → database)

**Enhancement**:
- Add middleware layer between endpoints and services
- Show database queries as terminal nodes
- Color code by performance or error rate

**Integration Point**: Replace existing Sankey in Feature Completeness section

**Data Builder**: Extend existing `FeatureCompletenessAnalyzer` to detect service and data layers

---

### 13. Network Graph (Test Coverage Relationships)
**Priority**: P3
**User Impact**: ⭐⭐⭐ (Shows test coverage gaps)
**Technical Complexity**: ⭐⭐⭐⭐

**Purpose**: Show which production files are covered by which test files

**Data Structure**:
```typescript
interface TestCoverageNode {
  id: string;
  type: 'production' | 'test';
  name: string;
  coverage: number;      // For production files
}

interface TestCoverageLink {
  source: string;        // Test file
  target: string;        // Production file
  linesCovered: number;
}
```

**D3 Technique**: Bipartite force layout

**Interactions**:
- Filter showing only uncovered files
- Click test to highlight all covered files
- Group by directory

**Integration Point**: Test Coverage category detail section

**Data Builder**: Extend `TestCoverageAnalyzer` to map test files to production files

---

### 14. Stacked Bar Chart (Issue Breakdown by File)
**Priority**: P3
**User Impact**: ⭐⭐⭐ (Simple, clear)
**Technical Complexity**: ⭐

**Purpose**: Show top N files with issues, stacked by severity

**Data Structure**:
```typescript
interface FileIssueBreakdown {
  filePath: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}
```

**D3 Technique**: `d3.stack()`, `d3.scaleBand()`

**Interactions**:
- Click bar to see file details
- Sort by total or by severity
- Filter by directory

**Integration Point**: All category detail sections

**Data Builder**: Aggregate existing issue data by file

---

### 15. Arc Diagram (Sequential File Dependencies)
**Priority**: P3
**User Impact**: ⭐⭐ (Alternative to force graph)
**Technical Complexity**: ⭐⭐

**Purpose**: Show import order and circular dependencies

**Data Structure**: Same as dependency graph but laid out linearly

**D3 Technique**: Custom arc paths, `d3.scalePoint()`

**Interactions**:
- Highlight circular dependencies
- Click node to see imports/exports
- Sort by different criteria

**Integration Point**: Dependencies tab, alternative visualization

**Data Builder**: Reuse dependency graph builder

---

### 16. Matrix View (File-to-File Dependency Matrix)
**Priority**: P3
**User Impact**: ⭐⭐⭐ (Good for spotting patterns)
**Technical Complexity**: ⭐⭐

**Purpose**: Adjacency matrix showing which files import which

**Data Structure**:
```typescript
interface DependencyMatrix {
  files: string[];
  matrix: boolean[][];   // true if files[i] imports files[j]
}
```

**D3 Technique**: Grid of rectangles with color coding

**Interactions**:
- Hover row to highlight all dependencies
- Reorder by clustering algorithm
- Click cell to see import details

**Integration Point**: Dependencies tab, advanced view

**Data Builder**: Convert dependency graph to matrix format

---

### 17. Circle Packing (Nested Issue Groups)
**Priority**: P3
**User Impact**: ⭐⭐ (Similar to treemap)
**Technical Complexity**: ⭐⭐

**Purpose**: Alternative to treemap with circular layout

**Data Structure**: Same as treemap

**D3 Technique**: `d3.pack()`, `d3.hierarchy()`

**Interactions**: Same as treemap

**Integration Point**: Summary section, user preference toggle

**Data Builder**: Reuse treemap data builder

---

### 18. Stream Graph (Issue Trends Over Time)
**Priority**: P3
**User Impact**: ⭐⭐⭐ (For teams tracking over time)
**Technical Complexity**: ⭐⭐⭐

**Purpose**: Show how different issue types evolved over commits

**Data Structure**: Timeline data with multiple series

**D3 Technique**: `d3.area()`, `d3.stack()`, offset "wiggle"

**Interactions**:
- Click layer to see specific issue type
- Zoom into time range
- Tooltip showing commit details

**Integration Point**: History tab, alternative to line chart

**Data Builder**: Reuse timeline analyzer

---

### 19. Parallel Coordinates (Multi-Dimensional Analysis)
**Priority**: P3
**User Impact**: ⭐⭐ (Advanced users only)
**Technical Complexity**: ⭐⭐⭐⭐

**Purpose**: Compare files across multiple metrics simultaneously

**Data Structure**:
```typescript
interface FileMetrics {
  filePath: string;
  issueCount: number;
  complexity: number;
  dependencies: number;
  testCoverage: number;
  loc: number;
}
```

**D3 Technique**: `d3.scaleLinear()` for each axis, polylines

**Interactions**:
- Brush axis to filter
- Invert axis
- Highlight similar files

**Integration Point**: Advanced features tab (expert mode only)

**Data Builder**: Aggregate all metrics per file

---

### 20. Calendar Heatmap (Daily Activity)
**Priority**: P3
**User Impact**: ⭐⭐ (Interesting but not critical)
**Technical Complexity**: ⭐⭐

**Purpose**: Show commit activity and issue introduction by day

**Data Structure**:
```typescript
interface DailyActivity {
  date: Date;
  commits: number;
  issuesAdded: number;
  issuesFixed: number;
}
```

**D3 Technique**: Grid layout like GitHub contribution graph

**Interactions**:
- Click day to see commits
- Filter by author
- Show different metrics

**Integration Point**: History tab, bottom section

**Data Builder**: Aggregate git history by day

---

## Implementation Roadmap

### Phase 1: Complete Core UX (2-3 days)
**Goal**: Users can understand project structure visually

1. ✅ Sunburst Diagram (Code Hierarchy) - **PRIORITY**
2. ✅ Dependency Force Graph - **PRIORITY**
3. ✅ Treemap (Issue Distribution)

**Deliverables**:
- Data builders for hierarchy and dependencies
- 3 new visualization classes
- Integration into UI with maturity filtering
- Unit tests for data transformations

### Phase 2: Advanced Insights (3-4 days)
**Goal**: Users can track quality over time and identify coupling

1. ✅ Timeline Visualization (Code Evolution)
2. ✅ Chord Diagram (Module Coupling)
3. ✅ Radar Chart (Category Health)

**Deliverables**:
- Historical analysis capability
- Module-level aggregation
- Comparison features
- Animation and transitions

### Phase 3: Specialized Views (2-3 days)
**Goal**: Category-specific deep dives

1. ✅ I18n Geographic Heatmap
2. ✅ Test Coverage Network Graph
3. ✅ Enhanced Multi-Layer Sankey
4. ✅ Stacked Bar Chart (File Issues)

**Deliverables**:
- Category-specific data builders
- Integration with existing analyzers
- Drill-down navigation

### Phase 4: Alternative & Advanced (2-3 days)
**Goal**: Expert users get advanced analytical tools

1. ✅ Arc Diagram (Sequential Dependencies)
2. ✅ Matrix View (Dependency Matrix)
3. ✅ Parallel Coordinates (Multi-Dimensional)
4. ✅ Stream Graph (Trends)
5. ✅ Calendar Heatmap (Activity)

**Deliverables**:
- Expert-mode only visualizations
- Advanced filtering and comparison
- Export capabilities

### Phase 5: Performance & Polish (1-2 days)
**Goal**: Production-ready quality

1. ✅ Flame Graph (if data available)
2. ✅ Performance optimization (large datasets)
3. ✅ Accessibility improvements
4. ✅ Responsive design refinement
5. ✅ Comprehensive documentation

---

## Technical Architecture

### File Structure
```
/packages/core/src/domains/visualization/webview/
  visualizations/
    ├── BaseVisualization.ts           ✅ Complete
    ├── VisualizationManager.ts        ✅ Complete
    ├── SankeyDiagram.ts              ✅ Complete
    ├── HeatmapVisualization.ts       ✅ Complete
    ├── BubbleChart.ts                ✅ Complete
    ├── SunburstDiagram.ts            ⏳ Phase 1
    ├── DependencyGraph.ts            ⏳ Phase 1
    ├── TreemapVisualization.ts       ⏳ Phase 1
    ├── TimelineVisualization.ts      ⏳ Phase 2
    ├── ChordDiagram.ts               ⏳ Phase 2
    ├── RadarChart.ts                 ⏳ Phase 2
    ├── FlameGraph.ts                 ⏳ Phase 5
    ├── GeographicHeatmap.ts          ⏳ Phase 3
    ├── NetworkGraph.ts               ⏳ Phase 3
    ├── StackedBarChart.ts            ⏳ Phase 3
    ├── ArcDiagram.ts                 ⏳ Phase 4
    ├── MatrixView.ts                 ⏳ Phase 4
    ├── ParallelCoordinates.ts        ⏳ Phase 4
    ├── StreamGraph.ts                ⏳ Phase 4
    ├── CalendarHeatmap.ts            ⏳ Phase 4
    └── index.ts                      ✅ Complete (update each phase)

/packages/core/src/domains/code-structure-review/
  data-builders/                       ⏳ New directory
    ├── SunburstDataBuilder.ts
    ├── DependencyGraphBuilder.ts
    ├── TimelineDataBuilder.ts
    ├── ModuleAggregator.ts
    └── index.ts
```

### Maturity Level Integration

Each visualization must respect progressive disclosure:

```typescript
// In CodeStructureViewController.renderVisualizations()
const config = this.maturityAdapter.getConfig();

if (config.showVisualizations) {
  // Novice: Only show sunburst + bubble (2 visualizations)
  // Intermediate: Add heatmap + sankey (4 total)
  // Advanced: Add dependency graph + timeline (6 total)
  // Expert: Show all available (20 total)
}
```

### Data Flow

```
1. User opens Code Structure Review
   ↓
2. Analyzers run (FeatureCompleteness, UIUXQuality, etc)
   ↓
3. Results passed to DataBuilders
   ↓
4. DataBuilders transform to visualization-specific format
   ↓
5. VisualizationManager creates appropriate viz instances
   ↓
6. Visualizations render in DOM
   ↓
7. User interacts → CustomEvent dispatched → UI updates
```

### Performance Considerations

- **Lazy Loading**: Only create visualizations when their tab is active
- **Virtualization**: For large datasets (1000+ files), use canvas instead of SVG
- **Debouncing**: Resize and filter operations debounced to 250ms
- **Caching**: Cache expensive transformations (dependency graphs, etc)
- **Progressive Rendering**: Render in chunks for flame graphs with 10K+ nodes

### Testing Strategy

1. **Data Builders**: Unit tests with sample analysis results
2. **Visualizations**: Visual regression tests using jest-image-snapshot
3. **Interactions**: Integration tests simulating clicks and hovers
4. **Performance**: Benchmark tests with large codebases (10K+ files)

---

## Open Questions & Design Decisions

### 1. Dependency Graph Data Source
**Question**: Should we use AST parsing or rely on TypeScript's language service?
**Decision**: Start with AST parsing (existing in codebase), add TS language service in Phase 5 if needed
**Rationale**: AST parsing already works, TS language service adds dependency

### 2. Timeline Data Storage
**Question**: How to store historical analysis results?
**Options**:
- A. Store JSON files in `.agent-brain/history/`
- B. Use git notes
- C. Separate SQLite database

**Recommendation**: Option A (JSON files)
**Rationale**: Consistent with existing file-based storage, easy to inspect, no new dependencies

### 3. Visualization Selection UI
**Question**: How do users choose which visualization to see?
**Options**:
- A. Tabs for each visualization type
- B. Dropdown selector
- C. Grid of thumbnails

**Recommendation**: Hybrid approach:
- Primary visualizations always visible (sunburst, bubble)
- Secondary visualizations in tabbed panel
- Expert mode shows grid selector

### 4. Mobile/Small Screen Support
**Question**: Should visualizations be responsive to small screens?
**Decision**: Desktop-first, basic mobile support in Phase 5
**Rationale**: VSCode is primarily desktop tool, mobile is edge case

### 5. Accessibility (A11y)
**Question**: How to make D3 visualizations accessible?
**Approach**:
- Provide text alternatives for all visualizations
- Keyboard navigation for interactive elements
- ARIA labels on all SVG elements
- High contrast mode support
- Screen reader announcements for state changes

**Implementation**: Create `A11yHelper` utility class in Phase 5

---

## Success Metrics

### User Experience
- ✅ Users can identify problematic files in < 5 seconds (sunburst/heatmap)
- ✅ Users understand dependencies without reading code (dependency graph)
- ✅ Novice users are not overwhelmed (progressive disclosure)
- ✅ Expert users get full detail (advanced mode)

### Technical Quality
- ✅ All visualizations render in < 1 second for typical project (500 files)
- ✅ No UI freezing during interaction
- ✅ Responsive to window resize
- ✅ Cross-browser compatible (Chrome, Edge, Firefox)

### Completeness
- ✅ 20/20 visualization concepts implemented
- ✅ All category types have relevant visualizations
- ✅ Historical analysis supported
- ✅ Comprehensive documentation

---

## Risk Mitigation

### Risk: Performance with Large Codebases
**Mitigation**:
- Implement virtualization early
- Add file count limits with user warning
- Provide sampling option (show top N files)
- Canvas fallback for SVG-heavy visualizations

### Risk: D3 Version Compatibility
**Mitigation**:
- Pin D3 version in package.json
- Test with D3 v7.9 (already in use)
- Document any D3 API usage that might break

### Risk: Data Quality
**Mitigation**:
- Validate all data structures before rendering
- Provide fallback UI for missing data
- Log warnings for unexpected data
- Show user-friendly error messages

### Risk: Browser Compatibility
**Mitigation**:
- Target VSCode's Electron version (modern Chromium)
- Avoid experimental CSS/JS features
- Test in VSCode insiders build
- Polyfills if needed (unlikely)

---

## Next Steps

1. ✅ **Mark this plan as complete** and commit to repository
2. ✅ **Start Phase 1 Implementation**: Begin with SunburstDiagram
3. ✅ **Create data-builders directory** and SunburstDataBuilder
4. ✅ **Update VisualizationManager** to support new visualization types
5. ✅ **Add visualization type constants** and TypeScript types
6. ✅ **Track progress** using TodoWrite throughout implementation

---

**Document Status**: ✅ Ready for Implementation
**Estimated Total Time**: 10-15 days (across 5 phases)
**Confidence Level**: High (based on successful Phase 0 completion)
