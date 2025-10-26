# Pathway Log Analyzer Module Implementation Guide

## Overview
This module processes pathway log files generated during execution and provides interactive visualization of thread flows, intersections, and system behavior. Designed for VSCode extension WebView integration.

## Architecture

### Core Components

```typescript
PathwayAnalyzer/
├── LogReader         // Reads and parses .jsonl files
├── ThreadExtractor   // Identifies and maps threads
├── FlowBuilder       // Constructs execution flows
├── Visualizer        // Generates interactive views
└── QueryEngine       // Enables exploration of logs
```

## 1. Log Reader Implementation

```typescript
export class PathwayLogReader {
    private logs: CheckpointEntry[] = [];
    private sessions: Map<string, Session> = new Map();
    
    /**
     * Read pathway logs from JSON Lines format
     */
    async readLogFile(filepath: string): Promise<CheckpointEntry[]> {
        const content = await fs.readFile(filepath, 'utf-8');
        const lines = content.split('\n').filter(l => l.trim());
        
        return lines.map(line => {
            try {
                const entry = JSON.parse(line);
                return this.normalizeEntry(entry);
            } catch (e) {
                console.warn('Invalid log entry:', line);
                return null;
            }
        }).filter(Boolean);
    }
    
    /**
     * Read all logs from session directory
     */
    async readSession(sessionPath: string): Promise<Session> {
        const files = await fs.readdir(sessionPath);
        const logFiles = files.filter(f => f.endsWith('.jsonl'));
        
        const session: Session = {
            id: path.basename(sessionPath),
            startTime: Infinity,
            endTime: 0,
            entries: [],
            threads: new Set(),
            contexts: new Set()
        };
        
        for (const file of logFiles) {
            const entries = await this.readLogFile(path.join(sessionPath, file));
            session.entries.push(...entries);
            
            entries.forEach(entry => {
                session.startTime = Math.min(session.startTime, entry.timestamp);
                session.endTime = Math.max(session.endTime, entry.timestamp);
                entry.threads.forEach(t => session.threads.add(t));
                session.contexts.add(entry.context);
            });
        }
        
        return session;
    }
}
```

## 2. Thread Flow Extraction

```typescript
export class ThreadFlowExtractor {
    /**
     * Build thread execution flows from checkpoint entries
     */
    extractFlows(entries: CheckpointEntry[]): ThreadFlow[] {
        const flowMap = new Map<string, ThreadFlow>();
        
        // Group by thread
        entries.forEach(entry => {
            entry.threads.forEach(thread => {
                if (!flowMap.has(thread)) {
                    flowMap.set(thread, {
                        thread,
                        nodes: [],
                        edges: [],
                        duration: 0,
                        dataFlow: []
                    });
                }
                
                const flow = flowMap.get(thread)!;
                
                // Add node
                flow.nodes.push({
                    id: `${thread}-${entry.timestamp}`,
                    context: entry.context,
                    timestamp: entry.timestamp,
                    data: entry.data,
                    threads: entry.threads
                });
            });
        });
        
        // Build edges (connections between consecutive checkpoints)
        flowMap.forEach(flow => {
            flow.nodes.sort((a, b) => a.timestamp - b.timestamp);
            
            for (let i = 0; i < flow.nodes.length - 1; i++) {
                flow.edges.push({
                    from: flow.nodes[i].id,
                    to: flow.nodes[i + 1].id,
                    duration: flow.nodes[i + 1].timestamp - flow.nodes[i].timestamp,
                    dataTransfer: this.analyzeDataTransfer(flow.nodes[i], flow.nodes[i + 1])
                });
            }
            
            if (flow.nodes.length > 0) {
                flow.duration = flow.nodes[flow.nodes.length - 1].timestamp - flow.nodes[0].timestamp;
            }
        });
        
        return Array.from(flowMap.values());
    }
    
    /**
     * Find thread intersections
     */
    findIntersections(entries: CheckpointEntry[]): Intersection[] {
        const intersections: Intersection[] = [];
        
        entries.forEach(entry => {
            if (entry.threads.length > 1) {
                intersections.push({
                    timestamp: entry.timestamp,
                    context: entry.context,
                    threads: entry.threads,
                    data: entry.data,
                    type: this.classifyIntersection(entry)
                });
            }
        });
        
        return intersections;
    }
    
    private classifyIntersection(entry: CheckpointEntry): IntersectionType {
        // Classify based on thread combinations
        const threads = new Set(entry.threads);
        
        if (threads.has('ERROR_HANDLING')) return 'error';
        if (threads.has('VALIDATION')) return 'validation';
        if (threads.has('AGENT_BRAIN')) return 'enrichment';
        return 'data-flow';
    }
}
```

## 3. Visualization Generator

```typescript
export class PathwayVisualizer {
    /**
     * Generate Timeline View - shows threads over time
     */
    generateTimelineView(flows: ThreadFlow[]): TimelineView {
        return {
            type: 'timeline',
            config: {
                xAxis: 'time',
                yAxis: 'threads',
                width: 1200,
                height: 400
            },
            data: flows.map(flow => ({
                thread: flow.thread,
                segments: this.buildTimeSegments(flow),
                intersections: this.markIntersections(flow)
            })),
            interactions: {
                hover: 'show-details',
                click: 'zoom-to-segment'
            }
        };
    }
    
    /**
     * Generate Sankey Diagram - shows data flow between components
     */
    generateSankeyView(flows: ThreadFlow[]): SankeyView {
        const nodes = this.extractUniqueContexts(flows);
        const links = this.buildSankeyLinks(flows);
        
        return {
            type: 'sankey',
            nodes: nodes.map((n, i) => ({ id: i, name: n })),
            links: links.map(l => ({
                source: nodes.indexOf(l.from),
                target: nodes.indexOf(l.to),
                value: l.count,
                thread: l.thread
            }))
        };
    }
    
    /**
     * Generate Intersection Heatmap
     */
    generateHeatmap(intersections: Intersection[]): HeatmapView {
        const threadList = Array.from(new Set(
            intersections.flatMap(i => i.threads)
        ));
        
        const matrix: number[][] = threadList.map(t1 => 
            threadList.map(t2 => 0)
        );
        
        intersections.forEach(inter => {
            inter.threads.forEach(t1 => {
                inter.threads.forEach(t2 => {
                    if (t1 !== t2) {
                        const i1 = threadList.indexOf(t1);
                        const i2 = threadList.indexOf(t2);
                        matrix[i1][i2]++;
                    }
                });
            });
        });
        
        return {
            type: 'heatmap',
            threads: threadList,
            matrix,
            colorScale: 'Blues',
            interactive: true
        };
    }
}
```

## 4. WebView Integration

```typescript
export class PathwayAnalyzerWebview {
    private panel: vscode.WebviewPanel;
    private analyzer: PathwayAnalyzer;
    
    async show(context: vscode.ExtensionContext) {
        this.panel = vscode.window.createWebviewPanel(
            'pathwayAnalyzer',
            'Pathway Analyzer',
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );
        
        this.panel.webview.html = this.getHtmlContent();
        
        // Handle messages from webview
        this.panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'loadSession':
                        await this.loadSession(message.sessionPath);
                        break;
                    case 'filterThread':
                        await this.filterByThread(message.thread);
                        break;
                    case 'queryTimeRange':
                        await this.queryTimeRange(message.start, message.end);
                        break;
                    case 'exportVisualization':
                        await this.exportVisualization(message.format);
                        break;
                }
            }
        );
    }
    
    private getHtmlContent(): string {
        return `<!DOCTYPE html>
        <html>
        <head>
            <script src="https://d3js.org/d3.v7.min.js"></script>
            <style>
                .timeline { height: 400px; }
                .thread-line { stroke-width: 3; opacity: 0.8; }
                .intersection { fill: red; r: 5; }
                .selected { stroke: orange; stroke-width: 2; }
            </style>
        </head>
        <body>
            <div id="controls">
                <select id="thread-filter">
                    <option value="all">All Threads</option>
                </select>
                <button onclick="refreshView()">Refresh</button>
                <button onclick="exportView()">Export</button>
            </div>
            
            <div id="timeline" class="timeline"></div>
            <div id="sankey"></div>
            <div id="heatmap"></div>
            <div id="details"></div>
            
            <script>
                const vscode = acquireVsCodeApi();
                
                function loadSession() {
                    vscode.postMessage({ command: 'loadSession' });
                }
                
                function renderTimeline(data) {
                    // D3.js timeline rendering
                    const svg = d3.select('#timeline')
                        .append('svg')
                        .attr('width', 1200)
                        .attr('height', 400);
                    
                    // Render thread lines and intersections
                    // ... D3 implementation
                }
                
                // Listen for data from extension
                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.command) {
                        case 'renderTimeline':
                            renderTimeline(message.data);
                            break;
                        case 'renderSankey':
                            renderSankey(message.data);
                            break;
                    }
                });
            </script>
        </body>
        </html>`;
    }
}
```

## 5. Query Engine for Exploration

```typescript
export class PathwayQueryEngine {
    private entries: CheckpointEntry[] = [];
    
    /**
     * Query checkpoints by various criteria
     */
    query(criteria: QueryCriteria): QueryResult {
        let results = [...this.entries];
        
        // Filter by thread
        if (criteria.thread) {
            results = results.filter(e => 
                e.threads.includes(criteria.thread!)
            );
        }
        
        // Filter by time range
        if (criteria.startTime && criteria.endTime) {
            results = results.filter(e => 
                e.timestamp >= criteria.startTime! && 
                e.timestamp <= criteria.endTime!
            );
        }
        
        // Filter by context pattern
        if (criteria.contextPattern) {
            const regex = new RegExp(criteria.contextPattern);
            results = results.filter(e => 
                regex.test(e.context)
            );
        }
        
        // Find anomalies (unexpected values)
        if (criteria.findAnomalies) {
            results = this.findAnomalies(results);
        }
        
        return {
            entries: results,
            summary: this.generateSummary(results),
            patterns: this.detectPatterns(results)
        };
    }
    
    /**
     * Detect execution patterns
     */
    private detectPatterns(entries: CheckpointEntry[]): Pattern[] {
        const patterns: Pattern[] = [];
        
        // Detect repeated sequences
        const sequences = this.findRepeatedSequences(entries);
        patterns.push(...sequences);
        
        // Detect performance bottlenecks
        const bottlenecks = this.findBottlenecks(entries);
        patterns.push(...bottlenecks);
        
        // Detect unusual thread combinations
        const unusual = this.findUnusualIntersections(entries);
        patterns.push(...unusual);
        
        return patterns;
    }
    
    /**
     * Find performance bottlenecks
     */
    private findBottlenecks(entries: CheckpointEntry[]): Pattern[] {
        const durations = new Map<string, number[]>();
        
        // Calculate durations between checkpoints
        for (let i = 0; i < entries.length - 1; i++) {
            const duration = entries[i + 1].timestamp - entries[i].timestamp;
            const key = `${entries[i].context}->${entries[i + 1].context}`;
            
            if (!durations.has(key)) {
                durations.set(key, []);
            }
            durations.get(key)!.push(duration);
        }
        
        // Find outliers
        const bottlenecks: Pattern[] = [];
        durations.forEach((times, transition) => {
            const avg = times.reduce((a, b) => a + b, 0) / times.length;
            const max = Math.max(...times);
            
            if (max > avg * 2 && max > 100) { // >100ms and 2x average
                bottlenecks.push({
                    type: 'bottleneck',
                    description: `Slow transition: ${transition}`,
                    occurrences: times.length,
                    impact: `Max: ${max}ms, Avg: ${avg.toFixed(0)}ms`,
                    severity: max > 1000 ? 'high' : 'medium'
                });
            }
        });
        
        return bottlenecks;
    }
}
```

## 6. VSCode Commands Integration

```typescript
export function registerPathwayCommands(context: vscode.ExtensionContext) {
    // Command: Start pathway tracking
    context.subscriptions.push(
        vscode.commands.registerCommand('pathway.startTracking', async () => {
            const threads = await vscode.window.showQuickPick([
                'TEMPLATE_LOADING',
                'AGENT_BRAIN', 
                'VALIDATION',
                'ERROR_HANDLING',
                'ALL'
            ], { 
                canPickMany: true,
                placeHolder: 'Select threads to track'
            });
            
            if (threads) {
                ThreadControl.getInstance().enableThreads(threads);
                vscode.window.showInformationMessage(
                    `Pathway tracking enabled for: ${threads.join(', ')}`
                );
            }
        })
    );
    
    // Command: Analyze pathway logs
    context.subscriptions.push(
        vscode.commands.registerCommand('pathway.analyze', async () => {
            const analyzer = new PathwayAnalyzerWebview();
            await analyzer.show(context);
        })
    );
    
    // Command: Clear pathway logs
    context.subscriptions.push(
        vscode.commands.registerCommand('pathway.clearLogs', async () => {
            const confirm = await vscode.window.showWarningMessage(
                'Clear all pathway logs?',
                'Yes', 'No'
            );
            
            if (confirm === 'Yes') {
                await clearPathwayLogs();
            }
        })
    );
}
```

## Usage Example

```typescript
// 1. Enable pathway tracking for debugging session
await vscode.commands.executeCommand('pathway.startTracking');

// 2. Run the problematic code
await yourExtension.executeFeature();

// 3. Open analyzer
await vscode.commands.executeCommand('pathway.analyze');

// 4. In the analyzer WebView:
// - See timeline of all thread executions
// - Click on intersections to see what threads met
// - Identify bottlenecks (long gaps between checkpoints)
// - Query specific time ranges or threads
// - Export visualizations for documentation
```

## Key Features

1. **Real-time Analysis**: Process logs as they're generated
2. **Interactive Visualization**: Click, zoom, filter in WebView
3. **Pattern Detection**: Automatically identify bottlenecks and anomalies
4. **Query Interface**: Search by thread, time, context, or data patterns
5. **Export Capability**: Save visualizations as SVG/PNG
6. **Performance Metrics**: Duration analysis and bottleneck detection
7. **Thread Intersection Analysis**: See where complexity emerges

## Performance Considerations

- Use JSON Lines format for streaming processing
- Index by timestamp for quick time-range queries
- Limit visualization to last N entries for large logs
- Implement virtual scrolling for long timelines
- Cache processed flows to avoid recomputation

This analyzer provides the foundation for understanding actual system behavior through pathway logs, making the invisible visible.