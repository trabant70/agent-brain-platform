# Visualization System

Comprehensive D3-based visualization library for the Agent Brain Platform's Code Structure Review module.

## Table of Contents

- [Architecture](#architecture)
- [Available Visualizations](#available-visualizations)
- [Usage Guide](#usage-guide)
- [Data Builders](#data-builders)
- [Performance Optimization](#performance-optimization)
- [Accessibility](#accessibility)
- [Examples](#examples)

## Architecture

### Core Components

```
visualization/
├── webview/
│   ├── visualizations/        # 20 D3-based visualizations
│   │   ├── BaseVisualization.ts
│   │   ├── SankeyDiagram.ts
│   │   └── ...
│   ├── utils/                 # Performance & accessibility utilities
│   │   ├── VisualizationOptimizer.ts
│   │   └── AccessibilityHelper.ts
│   └── VisualizationManager.ts
└── data-builders/             # Data transformation utilities
    ├── SunburstDataBuilder.ts
    └── ...
```

### Design Patterns

- **Inheritance**: All visualizations extend `BaseVisualization`
- **Factory Pattern**: `VisualizationManager` creates and manages visualizations
- **Builder Pattern**: Data builders transform raw data into visualization-ready formats
- **Observer Pattern**: Custom events for inter-visualization communication

## Available Visualizations

### Phase 1: Priority Visualizations

#### 1. Sankey Diagram
**Purpose**: Visualize flow between nodes (e.g., API flow, data flow)

```typescript
import { SankeyDiagram } from './visualizations';

const data = {
  nodes: [
    { id: 'frontend', name: 'Frontend' },
    { id: 'backend', name: 'Backend' }
  ],
  links: [
    { source: 'frontend', target: 'backend', value: 100 }
  ]
};

const viz = new SankeyDiagram(container);
await viz.initialize();
await viz.render(data);
```

**Key Features**:
- Interactive hover highlighting
- Click-to-drill navigation
- Color-coded links
- Automatic layout optimization

#### 2. Heatmap
**Purpose**: Show issue density across files

```typescript
import { HeatmapVisualization } from './visualizations';

const data = [
  { file: 'App.ts', category: 'Security', severity: 'critical', count: 5 },
  { file: 'Utils.ts', category: 'Performance', severity: 'high', count: 3 }
];

const viz = new HeatmapVisualization(container);
await viz.render(data);
```

**Key Features**:
- Color intensity by severity
- Interactive cell highlighting
- Sortable rows and columns
- Zoom and pan

#### 3. Bubble Chart
**Purpose**: Category overview with size-encoded metrics

```typescript
import { BubbleChart } from './visualizations';

const data = {
  children: [
    { id: 'security', name: 'Security', value: 50, critical: 10 },
    { id: 'performance', name: 'Performance', value: 30, critical: 5 }
  ]
};

const viz = new BubbleChart(container);
await viz.render(data);
```

**Key Features**:
- Force-directed layout
- Size and color encoding
- Collision detection
- Interactive tooltips

#### 4. Sunburst Diagram
**Purpose**: Hierarchical code structure visualization

```typescript
import { SunburstDiagram } from './visualizations';

const data = {
  name: 'root',
  children: [
    { name: 'src', children: [...], size: 1000 }
  ]
};

const viz = new SunburstDiagram(container);
await viz.render(data);
```

**Key Features**:
- Radial hierarchical layout
- Zoom-to-node interaction
- Breadcrumb navigation
- Size and color encoding

### Phase 2: Advanced Insights

#### 5. Timeline Visualization
**Purpose**: Code quality evolution over time

```typescript
import { TimelineVisualization } from './visualizations';

const data = {
  series: [
    {
      key: 'security',
      label: 'Security Score',
      data: [
        { timestamp: new Date('2024-01-01'), score: 85 },
        { timestamp: new Date('2024-01-02'), score: 87 }
      ]
    }
  ]
};

const viz = new TimelineVisualization(container);
await viz.render(data);
```

**Key Features**:
- Multi-series line charts
- Interactive commit dots
- Toggleable categories
- Trend analysis

#### 6. Chord Diagram
**Purpose**: Module coupling visualization

```typescript
import { ChordDiagram } from './visualizations';

const data = {
  nodes: ['ModuleA', 'ModuleB', 'ModuleC'],
  matrix: [
    [0, 10, 5],
    [10, 0, 8],
    [5, 8, 0]
  ]
};

const viz = new ChordDiagram(container);
await viz.render(data);
```

**Key Features**:
- Circular layout
- Ribbon thickness by coupling strength
- Interactive highlighting
- Bidirectional relationships

#### 7. Radar Chart
**Purpose**: Multi-dimensional category comparison

```typescript
import { RadarChart } from './visualizations';

const data = {
  dimensions: [
    { key: 'security', label: 'Security', max: 100 },
    { key: 'performance', label: 'Performance', max: 100 }
  ],
  datasets: [
    {
      label: 'Current',
      values: { security: 85, performance: 75 }
    }
  ]
};

const viz = new RadarChart(container);
await viz.render(data);
```

**Key Features**:
- Polar coordinate system
- Multi-dataset overlay
- Interactive legend
- Area fill and outline

### Phase 3: Specialized Views

#### 8-11. Advanced Visualizations
- **Stacked Bar Chart**: File issue breakdown by severity
- **Multi-Layer Sankey**: 3+ stage flow diagrams
- **Test Coverage Network**: Bipartite test-to-source mapping
- **I18n Geographic Heatmap**: Translation coverage by region

### Phase 4: Alternative & Advanced Views

#### 12-16. Specialized Layouts
- **Arc Diagram**: Sequential dependency visualization
- **Matrix View**: Adjacency matrix with grouping
- **Parallel Coordinates**: Multi-dimensional data analysis
- **Stream Graph**: Time-series trends with flowing layers
- **Calendar Heatmap**: Day-by-day activity patterns

### Phase 5: Performance & Polish

#### 17-18. KPI Visualizations
- **Gauge Chart**: Single metric with zones and targets
- **Flame Graph**: Performance profiling and call stacks

## Usage Guide

### Basic Usage

```typescript
import { VisualizationManager } from './visualization';

const manager = new VisualizationManager({
  enableInteractions: true,
  showLabels: true,
  colorScheme: 'category10'
});

// Create a visualization
const viz = await manager.createVisualization(
  'my-container',
  'bubble',
  data,
  'Category Overview'
);

// Update data
await manager.updateVisualization('my-container', newData);

// Clean up
manager.destroyVisualization('my-container');
```

### With Performance Optimization

```typescript
import { visualizationOptimizer } from './utils';

// Debounce resize handler
const handleResize = visualizationOptimizer.debounce(() => {
  viz.resize();
}, 150);

window.addEventListener('resize', handleResize);

// Check if should use canvas for large dataset
if (visualizationOptimizer.shouldUseCanvas(data.length)) {
  // Use canvas rendering
}

// Measure performance
visualizationOptimizer.startMeasure('my-viz');
await viz.render(data);
visualizationOptimizer.endMeasure('my-viz', 'render');

const metrics = visualizationOptimizer.getMetrics('my-viz');
console.log('Render time:', metrics.renderTime, 'ms');
```

### With Accessibility

```typescript
import { accessibilityHelper } from './utils';

// Make elements accessible
const nodes = svg.selectAll('.node');
nodes.each(function(d, i) {
  accessibilityHelper.makeAccessible({
    element: this,
    role: 'img',
    label: `Node ${i}: ${d.name}`,
    description: `Value: ${d.value}`,
    keyboardHandler: (e) => {
      if (e.key === 'Enter') {
        // Handle interaction
      }
    }
  });
});

// Add keyboard navigation
accessibilityHelper.addKeyboardNavigation(
  container,
  Array.from(nodes.nodes()),
  {
    enableArrowKeys: true,
    enableEnterKey: true
  }
);

// Announce changes
accessibilityHelper.announce('Data updated: 5 new issues found');
```

## Data Builders

Data builders transform raw analysis data into visualization-ready formats.

### Example: Sunburst Data Builder

```typescript
import { SunburstDataBuilder } from './data-builders';

// From file analysis
const files = [
  { path: 'src/App.ts', size: 1000, issues: 5 },
  { path: 'src/Utils.ts', size: 500, issues: 2 }
];

const sunburstData = SunburstDataBuilder.buildFromFiles(files);

// With category filtering
const filteredData = SunburstDataBuilder.filterByCategory(
  sunburstData,
  'Security'
);

// Aggregate by depth
const aggregated = SunburstDataBuilder.aggregateByDepth(
  sunburstData,
  3 // max depth
);
```

### Available Data Builders

All visualizations have corresponding data builders:
- `SunburstDataBuilder`
- `DependencyGraphBuilder`
- `TreemapDataBuilder`
- `TimelineDataBuilder`
- `StackedBarDataBuilder`
- `TestCoverageDataBuilder`
- `I18nDataBuilder`
- `ArcDiagramDataBuilder`
- `MatrixViewDataBuilder`
- `ParallelCoordinatesDataBuilder`
- `StreamGraphDataBuilder`
- `CalendarHeatmapDataBuilder`
- `GaugeDataBuilder`
- `FlameGraphDataBuilder`

## Performance Optimization

### Best Practices

1. **Use Debouncing/Throttling**:
```typescript
// Debounce resize
const debouncedResize = visualizationOptimizer.debounce(() => {
  viz.resize();
}, 150);

// Throttle scroll
const throttledScroll = visualizationOptimizer.throttle(() => {
  updateVisibleRange();
}, 16);
```

2. **Virtualize Large Datasets**:
```typescript
const visibleData = visualizationOptimizer.virtualizeData(
  allData,
  { start: 0, end: 100 }
);
```

3. **Sample or Aggregate**:
```typescript
// Sample data
const sampled = visualizationOptimizer.sampleData(data, 500);

// Aggregate data
const aggregated = visualizationOptimizer.aggregateData(
  data,
  100,
  (bucket) => bucket[0] // Use first item
);
```

4. **Use Canvas for Large Datasets**:
```typescript
if (visualizationOptimizer.shouldUseCanvas(nodeCount)) {
  // Render to canvas instead of SVG
  const canvas = visualizationOptimizer.createOffscreenCanvas(800, 600);
  // ... render to canvas
}
```

5. **Batch DOM Updates**:
```typescript
visualizationOptimizer.batchUpdates([
  () => element1.setAttribute('x', '10'),
  () => element2.setAttribute('y', '20'),
  () => element3.setAttribute('fill', 'red')
]);
```

### Performance Monitoring

```typescript
// Enable monitoring
const optimizer = new VisualizationOptimizer({
  enablePerformanceMonitoring: true
});

// Get metrics
const metrics = optimizer.getAllMetrics();
metrics.forEach((metric, id) => {
  console.log(`${id}:`, {
    renderTime: metric.renderTime,
    updateTime: metric.updateTime,
    nodeCount: metric.nodeCount
  });
});

// Check memory usage
if (optimizer.isLowMemory()) {
  console.warn('Low memory detected');
  // Reduce quality or sample data
}
```

## Accessibility

### ARIA Labels

All visualizations support ARIA labels:

```typescript
// Automatic labeling
accessibilityHelper.labelChartElements(
  elements,
  (element, index) => `Bar ${index}: ${element.value}`
);
```

### Keyboard Navigation

Navigate visualizations with keyboard:
- **Arrow Keys**: Move between elements
- **Enter/Space**: Activate element
- **Escape**: Return to container
- **Home/End**: Jump to first/last element
- **Tab**: Sequential navigation

### Screen Reader Support

```typescript
// Create live region for announcements
const liveRegion = accessibilityHelper.createLiveRegion('viz-announcer');

// Announce changes
accessibilityHelper.announce('Filter applied: showing 10 of 50 items');

// Add alternative text
accessibilityHelper.addAltTextDescription(
  container,
  'Bubble chart showing security issues by category'
);

// Provide data table alternative
const table = accessibilityHelper.createDataTableAlternative(
  data,
  [
    { key: 'name', label: 'Category' },
    { key: 'value', label: 'Issue Count' }
  ]
);
container.appendChild(table);
```

### Accessibility Preferences

```typescript
// Check user preferences
if (accessibilityHelper.prefersReducedMotion()) {
  // Disable animations
  viz.config.animationDuration = 0;
}

if (accessibilityHelper.isHighContrastMode()) {
  // Use high contrast colors
  viz.config.colorScheme = 'high-contrast';
}
```

## Examples

### Complete Example: Interactive Bubble Chart

```typescript
import {
  BubbleChart,
  visualizationOptimizer,
  accessibilityHelper
} from '@agent-brain/core/visualization';

// Create container
const container = document.getElementById('my-viz');

// Create visualization
const viz = new BubbleChart(container, {
  interactive: true,
  showLabels: true,
  colorScheme: 'category10'
});

// Initialize
await viz.initialize();

// Prepare data
const data = {
  children: [
    { id: 'security', name: 'Security', value: 50, critical: 10 },
    { id: 'performance', name: 'Performance', value: 30, critical: 5 }
  ]
};

// Measure performance
visualizationOptimizer.startMeasure('bubble-render');
await viz.render(data);
visualizationOptimizer.endMeasure('bubble-render', 'render');

// Add accessibility
const bubbles = container.querySelectorAll('.bubble');
accessibilityHelper.addKeyboardNavigation(
  container,
  Array.from(bubbles)
);

// Handle resize with debouncing
const handleResize = visualizationOptimizer.debounce(() => {
  viz.resize();
}, 150);

window.addEventListener('resize', handleResize);

// Listen for events
window.addEventListener('bubble-click', (event: CustomEvent) => {
  const { id, name, value } = event.detail;
  accessibilityHelper.announce(`Selected ${name} with ${value} issues`);
});

// Clean up
window.addEventListener('beforeunload', () => {
  viz.destroy();
  accessibilityHelper.dispose();
  window.removeEventListener('resize', handleResize);
});
```

### Integration with UI Controller

```typescript
import { VisualizationManager } from './visualization';

class CodeStructureViewController {
  private vizManager: VisualizationManager;

  constructor() {
    this.vizManager = new VisualizationManager({
      enableInteractions: true,
      showLabels: true
    });
  }

  async renderOverview(analysis: any): Promise<void> {
    // Create bubble chart for categories
    await this.vizManager.createVisualization(
      'viz-overview',
      'bubble',
      {
        children: analysis.categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          value: cat.issues.length,
          critical: cat.criticalIssues
        }))
      },
      'Category Overview'
    );

    // Create heatmap for file issues
    await this.vizManager.createVisualization(
      'viz-heatmap',
      'heatmap',
      analysis.fileIssues,
      'Issue Distribution'
    );

    // Create timeline for trends
    await this.vizManager.createVisualization(
      'viz-timeline',
      'timeline',
      analysis.historicalData,
      'Quality Trends'
    );
  }

  async dispose(): Promise<void> {
    this.vizManager.destroyAll();
  }
}
```

## Testing

### Unit Tests

```typescript
import { BubbleChart } from './visualizations';

describe('BubbleChart', () => {
  let container: HTMLElement;
  let viz: BubbleChart;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    viz = new BubbleChart(container);
  });

  afterEach(() => {
    viz.destroy();
    document.body.removeChild(container);
  });

  it('should render bubbles', async () => {
    const data = {
      children: [
        { id: '1', name: 'Test', value: 10 }
      ]
    };

    await viz.initialize();
    await viz.render(data);

    const bubbles = container.querySelectorAll('circle');
    expect(bubbles.length).toBe(1);
  });
});
```

## API Reference

See individual visualization files for complete API documentation. Each visualization extends `BaseVisualization` with these common methods:

- `initialize()`: Set up D3 and create SVG
- `render(data)`: Render visualization
- `update(data)`: Update with new data
- `resize()`: Handle container resize
- `destroy()`: Clean up resources

## Contributing

When adding new visualizations:

1. Extend `BaseVisualization`
2. Implement `renderContent()` method
3. Add TypeScript interfaces for data types
4. Create corresponding data builder
5. Add to `VisualizationManager`
6. Update documentation
7. Add accessibility features
8. Write tests

## License

Part of the Agent Brain Platform - Internal Use Only
