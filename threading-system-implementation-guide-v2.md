# Thread-Aware Debugging System Implementation Guide

## Executive Summary

A pragmatic decorator-based threading system that enables collaborative debugging between human operators and AI agents. The system uses three core components:
- **ThreadSpec**: Declares expectations (zero runtime cost)
- **ThreadLog**: Captures reality and detects simple deltas
- **ThreadAnalyzer**: Performs async pattern analysis and learning extraction

## System Architecture

### Three-Layer Design

```
┌──────────────────────────────────────────────────────┐
│                   ThreadSpec                         │
│            (Compile-time Expectations)               │
│  • Timing budgets  • Input/output shapes            │
│  • Memory limits   • Thread participation           │
└──────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────┐
│                   ThreadLog                          │
│         (Runtime Reality + Simple Deltas)            │
│  • Capture actuals  • Compare to spec               │
│  • Log deviations   • Flag simple issues            │
└──────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────┐
│                 ThreadAnalyzer                       │
│        (Async Intelligence + Learning)               │
│  • Pattern detection  • Trend analysis              │
│  • Root cause hints   • Learning extraction         │
└──────────────────────────────────────────────────────┘
```

## Control Center Implementation

### VSCode Extension Integration

```typescript
export class ThreadControlCenter {
  private statusBar: vscode.StatusBarItem;
  private config: ThreadConfig;
  private activeSession?: ThreadSession;
  
  constructor(context: vscode.ExtensionContext) {
    // Status bar indicator
    this.statusBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right, 
      100
    );
    this.updateStatusBar();
    
    // Register commands
    this.registerCommands(context);
    
    // Load config
    this.loadConfig();
    
    // Watch config changes
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('threading')) {
        this.loadConfig();
      }
    });
  }
  
  private updateStatusBar(): void {
    const icon = this.getStatusIcon();
    const threads = this.config.threads.active.join(',');
    
    this.statusBar.text = `${icon} Threading${threads ? `: ${threads}` : ''}`;
    this.statusBar.tooltip = this.getStatusTooltip();
    this.statusBar.command = 'threading.toggle';
    this.statusBar.show();
  }
  
  private getStatusIcon(): string {
    if (!this.config.enabled) return '🔴';
    if (this.config.mode === 'debugging') return '🟢';
    if (this.config.mode === 'development') return '🟡';
    if (this.config.mode === 'learning') return '🔵';
    return '⚪';
  }
}
```

### Configuration Management

#### File Structure
```
.threading/
├── config.json          # Main configuration
├── logs/               # Log files (JSONL format)
│   ├── session-001/    # Session-based organization
│   │   ├── thread-DATA_FLOW.jsonl
│   │   ├── thread-CACHE.jsonl
│   │   └── thread-ERROR.jsonl
│   └── current/        # Active session
├── analysis/           # Analysis results
│   ├── patterns/       # Detected patterns
│   ├── reports/        # Generated reports
│   └── learnings/      # Extracted learnings
└── cache/             # Temporary analysis cache
```

#### Configuration Schema
```json
{
  "version": "2.0",
  "enabled": false,
  "mode": "development",  // disabled|development|debugging|learning
  
  "threads": {
    "definitions": [
      {
        "name": "DATA_FLOW",
        "description": "Main data processing",
        "color": "#4CAF50",
        "critical": false
      }
    ],
    "active": [],        // Currently active threads
    "sampling": {
      "default": 100,    // 1 in 100 calls
      "performance": 10, // More frequent for perf issues
      "error": 1        // Always log errors
    }
  },
  
  "logging": {
    "path": ".threading/logs",
    "format": "jsonl",
    "buffer": {
      "enabled": true,
      "size": 1000,      // Buffer before writing
      "flushInterval": 1000  // ms
    },
    "rotation": {
      "maxSize": "10MB",
      "maxAge": "7d",
      "compress": true
    }
  },
  
  "analysis": {
    "enabled": true,
    "mode": "batch",     // batch|streaming|realtime
    "interval": "5m",    // For batch mode
    "patterns": [
      "performance-degradation",
      "error-clustering",
      "memory-leak",
      "cache-inefficiency"
    ]
  }
}
```

### Operator-Driven Control

#### Quick Actions (Command Palette)

```typescript
// Ctrl+Shift+P → "Threading: ..."

"Threading: Enable"          // Quick pick threads
"Threading: Disable"         // Turn off
"Threading: Toggle Thread"   // Toggle specific
"Threading: Start Session"   // Named debugging session
"Threading: Analyze"         // Run analysis now
"Threading: Show Dashboard"  // Open WebView
"Threading: Clear Logs"      // Cleanup
"Threading: Export Learning" // Generate knowledge item
```

#### Status Bar Menu (Right-click)

```
┌─────────────────────────┐
│ 🟡 Threading: Dev       │
├─────────────────────────┤
│ ✓ DATA_FLOW            │
│ ✓ CACHE                │
│   VALIDATION           │
│   ERROR_RECOVERY       │
│   AGENT_BRAIN          │
├─────────────────────────┤
│ Mode: Development      │
│ Sampling: 10%          │
│ Session: investigate-123│
├─────────────────────────┤
│ Analyze Now            │
│ Show Dashboard         │
│ Settings...            │
└─────────────────────────┘
```

## Logging System

### Log Entry Format (JSONL)

```json
{"type":"entry","context":"UserService.getUser","threads":["DATA_FLOW"],"timestamp":1706266800000,"args":[{"type":"string","shape":"uuid"}],"expectations":{"timing":{"min":10,"max":100}}}
{"type":"exit","context":"UserService.getUser","threads":["DATA_FLOW"],"timestamp":1706266800045,"duration":45,"result":{"type":"object","shape":"User"},"memoryDelta":1024}
{"type":"delta","subtype":"timing","context":"UserService.getUser","expected":"10-100ms","actual":"523ms","deviation":"slow","severity":"warning"}
```

### Log Management

#### Writing Strategy
```typescript
class ThreadLogger {
  private buffer: LogEntry[] = [];
  private writeStream?: fs.WriteStream;
  
  log(entry: LogEntry): void {
    if (!this.config.enabled) return;
    
    // Add to buffer
    this.buffer.push(entry);
    
    // Write when buffer full or interval elapsed
    if (this.shouldFlush()) {
      this.flush();
    }
  }
  
  private flush(): void {
    if (this.buffer.length === 0) return;
    
    const lines = this.buffer.map(e => JSON.stringify(e)).join('\n');
    this.writeStream.write(lines + '\n');
    this.buffer = [];
  }
}
```

#### Rotation Policy
```typescript
class LogRotator {
  rotate(): void {
    const files = fs.readdirSync(this.logPath);
    
    for (const file of files) {
      const stats = fs.statSync(path.join(this.logPath, file));
      
      // Size-based rotation
      if (stats.size > this.maxSize) {
        this.archiveLog(file);
      }
      
      // Age-based rotation
      const age = Date.now() - stats.mtimeMs;
      if (age > this.maxAge) {
        this.archiveLog(file);
      }
    }
  }
  
  private archiveLog(file: string): void {
    const archived = `${file}.${Date.now()}.gz`;
    // Compress and move
    createGzip().pipe(
      fs.createReadStream(file),
      fs.createWriteStream(archived)
    );
  }
}
```

## Analysis Component

### Pattern Detection Engine

```typescript
export class ThreadAnalyzer {
  private patterns = {
    'performance-degradation': new PerformanceDegradationPattern(),
    'error-clustering': new ErrorClusterPattern(),
    'memory-leak': new MemoryLeakPattern(),
    'cache-inefficiency': new CachePattern()
  };
  
  async analyze(entries: LogEntry[]): Promise<AnalysisReport> {
    const detectedPatterns = [];
    
    // Run each pattern detector
    for (const [name, detector] of Object.entries(this.patterns)) {
      const results = await detector.detect(entries);
      if (results.confidence > 0.7) {
        detectedPatterns.push({ name, ...results });
      }
    }
    
    // Generate insights
    const insights = this.correlatePatterns(detectedPatterns);
    
    // Create recommendations
    const recommendations = this.generateRecommendations(insights);
    
    return {
      patterns: detectedPatterns,
      insights,
      recommendations,
      summary: this.generateSummary(detectedPatterns)
    };
  }
}
```

### Example Pattern: Performance Degradation

```typescript
class PerformanceDegradationPattern {
  detect(entries: LogEntry[]): PatternResult {
    // Group timing deltas by function
    const timingByFunction = new Map<string, number[]>();
    
    entries
      .filter(e => e.type === 'delta' && e.subtype === 'timing')
      .forEach(e => {
        const timings = timingByFunction.get(e.context) || [];
        timings.push(parseFloat(e.actual));
        timingByFunction.set(e.context, timings);
      });
    
    // Look for increasing trend
    const degrading = [];
    for (const [func, timings] of timingByFunction) {
      if (timings.length < 5) continue;
      
      const trend = this.calculateTrend(timings);
      if (trend.slope > 0.1 && trend.r2 > 0.7) {
        degrading.push({
          function: func,
          degradationRate: `${trend.slope.toFixed(2)}ms per call`,
          confidence: trend.r2,
          samples: timings.length,
          hypothesis: this.generateHypothesis(func, trend)
        });
      }
    }
    
    return {
      detected: degrading.length > 0,
      confidence: Math.max(...degrading.map(d => d.confidence)),
      evidence: degrading,
      recommendation: 'Investigate memory leaks or resource exhaustion'
    };
  }
}
```

## Visualization System

### WebView Dashboard

```typescript
export class ThreadDashboard {
  private panel: vscode.WebviewPanel;
  
  show(context: vscode.ExtensionContext): void {
    this.panel = vscode.window.createWebviewPanel(
      'threadDashboard',
      'Threading Dashboard',
      vscode.ViewColumn.Two,
      { enableScripts: true }
    );
    
    this.panel.webview.html = this.getHtmlContent();
    this.setupMessageHandling();
    this.startDataStreaming();
  }
  
  private getHtmlContent(): string {
    return `<!DOCTYPE html>
    <html>
    <head>
      <script src="https://d3js.org/d3.v7.min.js"></script>
      <style>
        .thread-lane { fill: none; stroke-width: 3; opacity: 0.8; }
        .delta-marker { fill: red; r: 5; }
        .intersection { stroke: orange; stroke-width: 2; }
      </style>
    </head>
    <body>
      <div id="controls">
        <select id="thread-filter">
          <option value="ALL">All Threads</option>
        </select>
        <button id="analyze">Analyze</button>
      </div>
      
      <div id="timeline"></div>
      <div id="bottlenecks"></div>
      <div id="patterns"></div>
      
      <script>
        // D3.js visualization code
        const vscode = acquireVsCodeApi();
        
        // Timeline visualization
        function renderTimeline(data) {
          const svg = d3.select('#timeline')
            .append('svg')
            .attr('width', 1200)
            .attr('height', 400);
          
          // Thread swim lanes
          const lanes = svg.selectAll('.thread-lane')
            .data(data.threads)
            .enter()
            .append('g')
            .attr('class', 'thread-lane')
            .attr('transform', (d, i) => \`translate(0, \${i * 50})\`);
          
          // Function executions as rectangles
          lanes.selectAll('.execution')
            .data(d => d.executions)
            .enter()
            .append('rect')
            .attr('x', d => timeScale(d.start))
            .attr('width', d => timeScale(d.end) - timeScale(d.start))
            .attr('height', 40)
            .attr('fill', d => d.hasDeltas ? '#ff9800' : '#4caf50');
          
          // Delta markers
          svg.selectAll('.delta-marker')
            .data(data.deltas)
            .enter()
            .append('circle')
            .attr('class', 'delta-marker')
            .attr('cx', d => timeScale(d.timestamp))
            .attr('cy', d => threadScale(d.thread));
        }
        
        // Listen for data
        window.addEventListener('message', event => {
          const message = event.data;
          switch (message.type) {
            case 'timeline-data':
              renderTimeline(message.data);
              break;
            case 'patterns':
              renderPatterns(message.data);
              break;
          }
        });
      </script>
    </body>
    </html>`;
  }
}
```

### Visualization Types

#### 1. Thread Timeline
Shows execution flow over time with swim lanes for each thread:
```
DATA_FLOW    ═══╗═════════╗══════════>
                ║         ║
CACHE       ────╬─────────╬──────>
                ║         ║
VALIDATION  ────╬─────╗───╬──────>
                ↓     ↓   ↓
             [fetch][validate][return]
```

#### 2. Bottleneck Heatmap
Highlights slow operations:
```
Function               Avg    P95    Max    Calls
UserService.getUser    45ms   89ms   523ms  1000  ████████░░
DataService.fetch      23ms   45ms   234ms  2000  █████░░░░░
CacheService.get       5ms    12ms   45ms   5000  ██░░░░░░░░
```

#### 3. Delta Scatter Plot
Shows deviations from expectations over time, useful for spotting patterns.

#### 4. Thread Intersection Graph
Network diagram showing which threads commonly intersect.

## Learning Extraction

### Automatic Learning Generation

```typescript
export class LearningExtractor {
  async extractFromSession(sessionId: string): Promise<KnowledgeItem> {
    const session = await this.loadSession(sessionId);
    const analysis = await this.analyzer.analyze(session.entries);
    
    // Identify significant patterns
    const significant = analysis.patterns.filter(p => 
      p.confidence > 0.8 && 
      p.impact > 'medium'
    );
    
    if (significant.length === 0) return null;
    
    // Generate learning item
    return {
      id: uuid(),
      type: 'learning',
      scope: 'project',
      title: this.generateTitle(significant),
      body: this.generateBody(session, analysis, significant),
      tags: this.extractTags(analysis),
      metadata: {
        source: 'thread-analysis',
        session: sessionId,
        confidence: analysis.confidence,
        patterns: significant.map(p => p.name)
      }
    };
  }
  
  private generateBody(
    session: ThreadSession,
    analysis: AnalysisReport,
    patterns: Pattern[]
  ): string {
    return `# ${this.generateTitle(patterns)}

## Context
- Session: ${session.name}
- Duration: ${session.duration}ms
- Threads: ${session.threads.join(', ')}

## Issue Discovered
${patterns.map(p => `- ${p.description}`).join('\n')}

## Evidence
\`\`\`json
${JSON.stringify(patterns[0].evidence, null, 2)}
\`\`\`

## Root Cause Analysis
${analysis.insights.rootCause}

## Solution
${analysis.recommendations[0]}

## Prevention
${this.generatePrevention(patterns)}

## Performance Impact
- Before: ${analysis.metrics.before}
- After: ${analysis.metrics.after}
- Improvement: ${analysis.metrics.improvement}

## Tags
${analysis.tags.join(', ')}
`;
  }
}
```

### Knowledge Injection Integration

```typescript
// After fixing an issue, generate learning
const learning = await LearningExtractor.extractFromSession('fix-123');

// Add to Agent Brain knowledge base
await AgentBrain.addKnowledgeItem(learning);

// Next time similar code is written, agent suggests:
"Based on learning from 'Database Connection Pool Exhaustion', 
 consider adding connection pooling to this database access pattern."
```

## Pragmatic Implementation Path

### Week 1: Foundation
1. Implement ThreadSpec decorator (metadata only)
2. Add basic ThreadLog with simple delta detection
3. Create control center with status bar
4. Set up JSONL logging

### Week 2: Control & Analysis
1. Add VSCode commands for thread control
2. Implement session management
3. Create basic pattern detection
4. Add CLI for analysis

### Week 3: Visualization
1. Create WebView dashboard
2. Add timeline visualization
3. Implement bottleneck detection
4. Add real-time log tailing

### Week 4: Intelligence
1. Implement learning extraction
2. Add pattern library
3. Create recommendation engine
4. Integrate with Agent Brain

## Success Metrics

- **Debugging Time**: 50% reduction in time to find root cause
- **Pattern Detection**: 80% of performance issues detected automatically
- **Learning Generation**: 1-2 high-quality learnings per week
- **Developer Adoption**: 80% of team using threading for debugging
- **Performance Overhead**: <5ms per decorated function when active

## Conclusion

This threading system provides a pragmatic approach to collaborative debugging between humans and AI. By separating concerns (spec/log/analyze) and keeping decorators simple, we achieve powerful debugging capabilities with minimal runtime overhead. The system grows with your codebase, learning from each debugging session to prevent future issues.