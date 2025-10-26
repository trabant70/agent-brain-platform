# Thread Analyzer Module - Pragmatic V1 Implementation

## Overview
Simple analyzer for decorator-based thread logs. Focuses on immediate debugging value, not complex visualizations. Designed for VSCode extension developers who need to understand code flows quickly.

## Philosophy
- JSON Lines logs are grep-friendly
- Start with CLI tools, add WebView later
- Focus on finding problems, not pretty graphs
- Work with existing developer workflows

## Core Components (Keep It Simple)

```
ThreadAnalyzer/
├── LogReader.ts      // Parse .jsonl files
├── FlowAnalyzer.ts   // Build execution flows  
├── DeltaAnalyzer.ts  // Find divergence patterns
└── CLI.ts            // Command-line interface
```

## 1. Minimal Log Reader

```typescript
export class ThreadLogReader {
  /**
   * Read and parse thread logs - simple and fast
   */
  readLogs(logPath: string = '.thread-logs'): ThreadEntry[] {
    const entries: ThreadEntry[] = [];
    const files = fs.readdirSync(logPath)
      .filter(f => f.startsWith('thread-') && f.endsWith('.jsonl'));
    
    for (const file of files) {
      const content = fs.readFileSync(path.join(logPath, file), 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());
      
      for (const line of lines) {
        try {
          entries.push(JSON.parse(line));
        } catch {
          // Skip malformed lines
        }
      }
    }
    
    return entries.sort((a, b) => a.timestamp - b.timestamp);
  }
  
  /**
   * Filter logs by criteria
   */
  filter(entries: ThreadEntry[], criteria: {
    threads?: string[];
    context?: string;
    type?: string;
    timeRange?: { start: number; end: number };
  }): ThreadEntry[] {
    return entries.filter(entry => {
      if (criteria.threads && !criteria.threads.some(t => entry.threads?.includes(t))) {
        return false;
      }
      if (criteria.context && !entry.context?.includes(criteria.context)) {
        return false;
      }
      if (criteria.type && entry.type !== criteria.type) {
        return false;
      }
      if (criteria.timeRange) {
        if (entry.timestamp < criteria.timeRange.start || 
            entry.timestamp > criteria.timeRange.end) {
          return false;
        }
      }
      return true;
    });
  }
}
```

## 2. Flow Analyzer

```typescript
export class FlowAnalyzer {
  /**
   * Build execution flow from entries
   */
  buildFlow(entries: ThreadEntry[]): ExecutionFlow {
    const flow: ExecutionFlow = {
      threads: new Set<string>(),
      functions: new Map<string, FunctionStats>(),
      sequences: [],
      errors: [],
      duration: 0
    };
    
    // Group by execution sequences (entry->exit pairs)
    let currentStack: ThreadEntry[] = [];
    
    for (const entry of entries) {
      if (entry.type === 'entry') {
        currentStack.push(entry);
      } else if (entry.type === 'exit' && currentStack.length > 0) {
        const entryLog = currentStack.pop()!;
        const sequence = {
          function: entry.context,
          threads: entry.threads,
          duration: entry.duration,
          start: entryLog.timestamp,
          end: entry.timestamp
        };
        flow.sequences.push(sequence);
        
        // Update function stats
        if (!flow.functions.has(entry.context)) {
          flow.functions.set(entry.context, {
            callCount: 0,
            totalDuration: 0,
            avgDuration: 0,
            minDuration: Infinity,
            maxDuration: 0,
            threads: new Set()
          });
        }
        
        const stats = flow.functions.get(entry.context)!;
        stats.callCount++;
        stats.totalDuration += entry.duration || 0;
        stats.avgDuration = stats.totalDuration / stats.callCount;
        stats.minDuration = Math.min(stats.minDuration, entry.duration || 0);
        stats.maxDuration = Math.max(stats.maxDuration, entry.duration || 0);
        entry.threads?.forEach(t => stats.threads.add(t));
        
        // Track threads
        entry.threads?.forEach(t => flow.threads.add(t));
      } else if (entry.type === 'error') {
        flow.errors.push({
          context: entry.context,
          error: entry.error,
          timestamp: entry.timestamp,
          threads: entry.threads
        });
      }
    }
    
    // Calculate total duration
    if (flow.sequences.length > 0) {
      flow.duration = flow.sequences[flow.sequences.length - 1].end - 
                     flow.sequences[0].start;
    }
    
    return flow;
  }
  
  /**
   * Find thread intersections
   */
  findIntersections(entries: ThreadEntry[]): ThreadIntersection[] {
    const intersections: ThreadIntersection[] = [];
    
    entries.forEach(entry => {
      if (entry.threads && entry.threads.length > 1) {
        intersections.push({
          context: entry.context,
          threads: entry.threads,
          timestamp: entry.timestamp,
          type: entry.type
        });
      }
    });
    
    return intersections;
  }
  
  /**
   * Find performance bottlenecks
   */
  findBottlenecks(flow: ExecutionFlow, threshold: number = 100): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];
    
    flow.functions.forEach((stats, functionName) => {
      if (stats.maxDuration > threshold) {
        bottlenecks.push({
          function: functionName,
          maxDuration: stats.maxDuration,
          avgDuration: stats.avgDuration,
          callCount: stats.callCount,
          severity: stats.maxDuration > 1000 ? 'high' : 
                   stats.maxDuration > 500 ? 'medium' : 'low'
        });
      }
    });
    
    return bottlenecks.sort((a, b) => b.maxDuration - a.maxDuration);
  }
}
```

## 3. Delta Analyzer

```typescript
export class DeltaAnalyzer {
  /**
   * Analyze timing deltas
   */
  analyzeDeltas(entries: ThreadEntry[]): DeltaReport {
    const deltas = entries.filter(e => e.type?.includes('delta'));
    
    const report: DeltaReport = {
      totalDeltas: deltas.length,
      byType: new Map(),
      byContext: new Map(),
      patterns: []
    };
    
    // Group by type and context
    deltas.forEach(delta => {
      // By type
      const type = delta.type || 'unknown';
      if (!report.byType.has(type)) {
        report.byType.set(type, []);
      }
      report.byType.get(type)!.push(delta);
      
      // By context
      const context = delta.context || 'unknown';
      if (!report.byContext.has(context)) {
        report.byContext.set(context, []);
      }
      report.byContext.get(context)!.push(delta);
    });
    
    // Identify patterns
    report.byContext.forEach((contextDeltas, context) => {
      if (contextDeltas.length > 3) {
        // Repeated delta in same function
        report.patterns.push({
          type: 'repeated-delta',
          context,
          count: contextDeltas.length,
          description: `${context} consistently diverges from expectations`
        });
      }
    });
    
    return report;
  }
  
  /**
   * Generate recommendations based on deltas
   */
  generateRecommendations(report: DeltaReport): string[] {
    const recommendations: string[] = [];
    
    report.byType.forEach((deltas, type) => {
      if (type === 'timing-delta') {
        const slowDeltas = deltas.filter((d: any) => d.deviation === 'slow');
        if (slowDeltas.length > 0) {
          recommendations.push(
            `Performance: ${slowDeltas.length} functions running slower than expected. ` +
            `Consider profiling or optimizing.`
          );
        }
      }
      
      if (type === 'size-delta') {
        recommendations.push(
          `Data Size: Results differ from expected sizes. ` +
          `Review data processing logic or update expectations.`
        );
      }
    });
    
    report.patterns.forEach(pattern => {
      if (pattern.type === 'repeated-delta') {
        recommendations.push(
          `Pattern: ${pattern.context} consistently diverges (${pattern.count} times). ` +
          `Consider updating expectations or investigating root cause.`
        );
      }
    });
    
    return recommendations;
  }
}
```

## 4. Simple CLI Interface

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { ThreadLogReader } from './LogReader';
import { FlowAnalyzer } from './FlowAnalyzer';
import { DeltaAnalyzer } from './DeltaAnalyzer';

const program = new Command();

program
  .name('thread-analyze')
  .description('Analyze thread execution logs')
  .version('1.0.0');

// Show execution flow
program
  .command('flow')
  .description('Show execution flow')
  .option('-t, --thread <thread>', 'Filter by thread')
  .option('-c, --context <context>', 'Filter by context/function')
  .action((options) => {
    const reader = new ThreadLogReader();
    const analyzer = new FlowAnalyzer();
    
    let entries = reader.readLogs();
    
    if (options.thread || options.context) {
      entries = reader.filter(entries, {
        threads: options.thread ? [options.thread] : undefined,
        context: options.context
      });
    }
    
    const flow = analyzer.buildFlow(entries);
    
    console.log('\\n=== EXECUTION FLOW ===');
    console.log(`Duration: ${flow.duration}ms`);
    console.log(`Functions: ${flow.functions.size}`);
    console.log(`Threads: ${Array.from(flow.threads).join(', ')}`);
    console.log(`Errors: ${flow.errors.length}`);
    
    if (flow.errors.length > 0) {
      console.log('\\n=== ERRORS ===');
      flow.errors.forEach(e => {
        console.log(`  ${e.context}: ${e.error}`);
      });
    }
  });

// Show bottlenecks
program
  .command('bottlenecks')
  .description('Find performance bottlenecks')
  .option('-t, --threshold <ms>', 'Duration threshold', '100')
  .action((options) => {
    const reader = new ThreadLogReader();
    const analyzer = new FlowAnalyzer();
    
    const entries = reader.readLogs();
    const flow = analyzer.buildFlow(entries);
    const bottlenecks = analyzer.findBottlenecks(flow, parseInt(options.threshold));
    
    console.log('\\n=== PERFORMANCE BOTTLENECKS ===');
    bottlenecks.forEach(b => {
      console.log(`\\n${b.function}:`);
      console.log(`  Max: ${b.maxDuration}ms`);
      console.log(`  Avg: ${b.avgDuration.toFixed(0)}ms`);
      console.log(`  Calls: ${b.callCount}`);
      console.log(`  Severity: ${b.severity}`);
    });
  });

// Show deltas
program
  .command('deltas')
  .description('Analyze expectation deltas')
  .action(() => {
    const reader = new ThreadLogReader();
    const analyzer = new DeltaAnalyzer();
    
    const entries = reader.readLogs();
    const report = analyzer.analyzeDeltas(entries);
    const recommendations = analyzer.generateRecommendations(report);
    
    console.log('\\n=== DELTA ANALYSIS ===');
    console.log(`Total Deltas: ${report.totalDeltas}`);
    
    console.log('\\nBy Type:');
    report.byType.forEach((deltas, type) => {
      console.log(`  ${type}: ${deltas.length}`);
    });
    
    console.log('\\nBy Function:');
    report.byContext.forEach((deltas, context) => {
      if (deltas.length > 1) {
        console.log(`  ${context}: ${deltas.length} deltas`);
      }
    });
    
    if (recommendations.length > 0) {
      console.log('\\n=== RECOMMENDATIONS ===');
      recommendations.forEach(r => console.log(`- ${r}`));
    }
  });

// Show intersections
program
  .command('intersections')
  .description('Find thread intersections')
  .action(() => {
    const reader = new ThreadLogReader();
    const analyzer = new FlowAnalyzer();
    
    const entries = reader.readLogs();
    const intersections = analyzer.findIntersections(entries);
    
    console.log('\\n=== THREAD INTERSECTIONS ===');
    console.log(`Total: ${intersections.length}`);
    
    // Group by function
    const byFunction = new Map<string, number>();
    intersections.forEach(i => {
      const count = byFunction.get(i.context) || 0;
      byFunction.set(i.context, count + 1);
    });
    
    console.log('\\nBy Function:');
    Array.from(byFunction.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([func, count]) => {
        console.log(`  ${func}: ${count} intersections`);
      });
  });

program.parse();
```

## 5. VSCode Integration

```typescript
// Simple VSCode commands for thread analysis
export function registerThreadCommands(context: vscode.ExtensionContext) {
  
  // Command: Enable threading
  context.subscriptions.push(
    vscode.commands.registerCommand('threading.enable', async () => {
      const threads = await vscode.window.showQuickPick(
        ['DATA_FLOW', 'VALIDATION', 'CACHE', 'ERROR_RECOVERY', '*'],
        { 
          canPickMany: true,
          placeHolder: 'Select threads to track'
        }
      );
      
      if (threads) {
        const config = {
          enabled: true,
          activeThreads: threads,
          deltaSampling: 10,
          logPath: '.thread-logs'
        };
        
        fs.writeFileSync('.threading-config.json', JSON.stringify(config, null, 2));
        vscode.window.showInformationMessage(`Threading enabled for: ${threads.join(', ')}`);
      }
    })
  );
  
  // Command: Analyze current logs
  context.subscriptions.push(
    vscode.commands.registerCommand('threading.analyze', () => {
      const terminal = vscode.window.createTerminal('Thread Analysis');
      terminal.show();
      terminal.sendText('npx thread-analyze flow');
    })
  );
  
  // Command: Show bottlenecks
  context.subscriptions.push(
    vscode.commands.registerCommand('threading.bottlenecks', () => {
      const terminal = vscode.window.createTerminal('Thread Bottlenecks');
      terminal.show();
      terminal.sendText('npx thread-analyze bottlenecks');
    })
  );
}
```

## Usage Example

```bash
# 1. Enable threading for debugging
echo '{"enabled":true,"activeThreads":["DATA_FLOW"],"deltaSampling":1}' > .threading-config.json

# 2. Run your VSCode extension
# ... logs accumulate ...

# 3. Analyze the flow
npx thread-analyze flow --thread DATA_FLOW

# 4. Find bottlenecks
npx thread-analyze bottlenecks --threshold 200

# 5. Check deltas
npx thread-analyze deltas

# 6. Find complex intersections
npx thread-analyze intersections

# 7. Quick grep for errors
grep '"type":"error"' .thread-logs/*.jsonl | jq '.'

# 8. See specific function
grep '"context":"DataOrchestrator.getEvents"' .thread-logs/*.jsonl | jq '.'
```

## Future Enhancements (V2)

Once V1 proves useful:
1. WebView with D3.js timeline visualization
2. Real-time log streaming
3. Pattern detection ML
4. Integration with VS Code Problems panel
5. Export to various formats

## Key Principles

1. **Text files are debuggable** - JSON Lines can be grep'd, awk'd, jq'd
2. **CLI first** - Quick answers without leaving terminal
3. **Simple is reliable** - Less code, fewer bugs
4. **Progressive enhancement** - Start simple, add complexity if needed
5. **Developer-friendly** - Fits existing workflows

This pragmatic V1 focuses on **finding problems quickly** rather than beautiful visualizations. It's about getting answers in seconds, not building elaborate dashboards.