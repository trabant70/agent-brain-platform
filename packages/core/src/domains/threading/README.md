# Threading System Documentation

A comprehensive thread-aware debugging system for collaborative debugging between humans and AI agents.

## Overview

The Threading System provides a powerful framework for tracking, analyzing, and visualizing execution patterns in your codebase. It combines compile-time type safety with runtime analysis to detect performance issues, memory leaks, error patterns, and caching opportunities.

## Architecture

The system consists of four main components:

```
┌─────────────────────────────────────────────────────────────┐
│                    Threading System                          │
├─────────────────┬──────────────┬──────────────┬─────────────┤
│   Decorators    │   Logging    │   Analysis   │     UI      │
│  (@ThreadSpec)  │ (ThreadLog)  │  (Analyzer)  │  (WebView)  │
└─────────────────┴──────────────┴──────────────┴─────────────┘
```

### 1. Decorators Layer (`decorators/`)
- **ThreadSpec**: Decorator for marking functions with threading expectations
- Type definitions for timing, memory, and I/O expectations
- Zero runtime cost - metadata only

### 2. Logging Layer (`logging/`)
- **ThreadLogger**: JSONL-based persistent logger
- Captures entry, exit, delta, and error events
- Buffered writes with configurable flush intervals
- Log rotation and compression support

### 3. Analysis Layer (`analysis/`)
- **ThreadAnalyzer**: Main orchestration engine
- **Pattern Detectors**:
  - PerformanceDegradationPattern
  - ErrorClusterPattern
  - MemoryLeakPattern
  - CachePattern
- Statistical analysis with confidence scoring
- Actionable recommendations generation

### 4. UI Layer (`visualization/`)
- Rich pattern visualization
- Insights and recommendations panels
- Real-time analysis triggers
- Export/import capabilities

## Quick Start

### 1. Decorate Your Functions

```typescript
import { ThreadSpec } from '@agent-brain/core/threading';

@ThreadSpec({
  threads: ['DATA_FLOW', 'PERFORMANCE'],
  timing: { min: 10, max: 100 },
  memory: { max: 1024 * 1024 }, // 1MB
  tags: ['critical', 'user-facing']
})
async function getUserData(userId: string): Promise<User> {
  // Your implementation
  const user = await db.users.findOne({ id: userId });
  return user;
}
```

### 2. Enable Logging

```typescript
import { ThreadLogger, ThreadLog } from '@agent-brain/core/threading';

// Create logger instance
const logger = new ThreadLogger({
  logPath: '.threading/logs',
  enabled: true,
  buffer: {
    enabled: true,
    size: 100,
    flushInterval: 5000 // 5 seconds
  }
});

// Set as global logger
ThreadLog.setGlobalLogger(logger);
```

### 3. Track Execution

```typescript
import { trackExecution } from '@agent-brain/core/threading';

async function myFunction() {
  return trackExecution(
    'myFunction',
    ['DATA_FLOW'],
    async () => {
      // Your code here
      return result;
    }
  );
}
```

### 4. Analyze Logs

```typescript
import { ThreadAnalyzer } from '@agent-brain/core/threading';
import { readFileSync } from 'fs';

// Read log entries
const logData = readFileSync('.threading/logs/thread-2024-01-01.jsonl', 'utf-8');
const entries = logData.trim().split('\n').map(line => JSON.parse(line));

// Create analyzer
const analyzer = new ThreadAnalyzer({
  sensitivity: 'medium',
  minSampleSize: 10,
  parallelAnalysis: true
});

// Run analysis
const report = await analyzer.analyze(entries);

// Access results
console.log('Patterns detected:', report.patterns.length);
console.log('Insights:', report.insights.length);
console.log('Recommendations:', report.recommendations.length);

// Export report
fs.writeFileSync('analysis-report.json', JSON.stringify(report, null, 2));
```

## Pattern Detectors

### Performance Degradation Pattern

Detects progressive slowdown over repeated function calls.

**Algorithm**: Linear regression with correlation analysis

**Detects**:
- Increasing execution time trends
- Correlation strength (r² coefficient)
- Degradation percentage

**Example Output**:
```json
{
  "name": "Performance Degradation",
  "type": "performance_degradation",
  "confidence": 0.85,
  "impact": "high",
  "description": "Execution time increased by 150% over 50 calls",
  "affectedFunctions": ["getUserData"],
  "evidence": {
    "sampleSize": 50,
    "firstDuration": 45,
    "lastDuration": 112,
    "degradationPercent": 149,
    "trend": {
      "slope": 1.34,
      "correlation": 0.85
    }
  }
}
```

### Error Cluster Pattern

Identifies bursts of related errors within time windows.

**Algorithm**: Sliding time-window clustering

**Detects**:
- Error bursts (3+ errors in configurable window)
- Error similarity and correlation
- Error rate (errors/second)

**Configuration**:
- Low sensitivity: 60-second window
- Medium sensitivity: 15-second window
- High sensitivity: 5-second window

### Memory Leak Pattern

Detects continuous memory growth and acceleration.

**Algorithm**: Linear regression + second derivative analysis

**Detects**:
- Memory growth trends
- Growth acceleration (second derivative)
- Leak severity based on growth rate

**Example Evidence**:
```json
{
  "initialMemory": "512KB",
  "finalMemory": "3MB",
  "totalGrowth": "2.5MB",
  "growthPercent": 488,
  "growthRate": "52KB/call",
  "acceleration": "2KB/call²"
}
```

### Cache Pattern

Detects caching opportunities and inefficiencies.

**Three Detection Modes**:

1. **Cache Opportunity**: Repeated expensive calls with same arguments
   - Analyzes repeat rate and potential savings
   - Calculates time savings from caching

2. **Cache Thrashing**: Frequent cache evictions
   - Sliding window analysis of access patterns
   - Identifies cache size issues

3. **Cache Inefficiency**: Bimodal distribution indicating cache misses
   - Analyzes variance in execution times
   - Calculates hit/miss ratios

## Configuration

### ThreadConfig

```typescript
interface ThreadConfig {
  version: string;
  enabled: boolean;
  mode: 'disabled' | 'development' | 'debugging' | 'learning';

  threads: {
    definitions: ThreadDefinition[];
    active: string[];
    sampling: {
      default: number;      // 1 in N calls
      performance: number;  // For perf-sensitive
      error: number;        // For error paths (1 = always)
    };
  };

  logging: {
    path: string;
    format: 'jsonl';
    buffer: {
      enabled: boolean;
      size: number;
      flushInterval: number;
    };
    rotation: {
      maxSize: string;
      maxAge: string;
      compress: boolean;
    };
  };

  analysis: {
    enabled: boolean;
    mode: 'batch' | 'streaming' | 'realtime';
    interval: string;
    patterns: string[];  // Enabled detectors
  };
}
```

### Analyzer Configuration

```typescript
interface AnalyzerConfig {
  enabledDetectors?: string[];  // ['all'] or specific detector names
  sensitivity?: 'low' | 'medium' | 'high';
  minSampleSize?: number;       // Minimum data points (default: 10)
  parallelAnalysis?: boolean;   // Run detectors in parallel
}
```

## UI Integration

The threading system includes a rich UI for visualizing analysis results.

### Features

1. **Pattern Cards**
   - Color-coded impact indicators
   - Confidence percentages
   - Affected functions
   - Expandable evidence

2. **Insights Panel**
   - Category-based grouping
   - Severity indicators
   - Root cause analysis

3. **Recommendations**
   - Prioritized action items
   - Effort estimation
   - Step-by-step guidance

4. **Export/Import**
   - JSON export of analysis reports
   - Offline analysis support

### Message API

```typescript
// Request analysis
webview.postMessage({
  type: 'threading:analyze',
  payload: {}
});

// Handle analysis results
case 'threading:analysis-data':
  controller.renderAnalysis(message.payload);
  break;
```

## Best Practices

### 1. Thread Definitions

Define logical threads that represent execution paths:

```typescript
const threads = [
  {
    name: 'DATA_FLOW',
    description: 'Data retrieval and transformation',
    color: '#00d4ff',
    critical: true
  },
  {
    name: 'UI_UPDATE',
    description: 'User interface updates',
    color: '#00ff88',
    critical: false
  }
];
```

### 2. Timing Expectations

Set realistic timing budgets:

```typescript
@ThreadSpec({
  threads: ['DATA_FLOW'],
  timing: {
    min: 10,    // Warn if faster than 10ms (might indicate caching issue)
    max: 100,   // Warn if slower than 100ms
    budget: 50  // Performance budget
  }
})
```

### 3. Sampling Strategy

Use sampling for high-frequency functions:

```typescript
// Sample 1 in 100 calls for performance-critical code
sampling: {
  default: 100,
  performance: 1000,  // Even less for hot paths
  error: 1            // Always log errors
}
```

### 4. Analysis Workflow

```bash
# 1. Collect logs during development/debugging
npm run threading:enable

# 2. Run analysis
npm run threading:analyze

# 3. Review patterns in UI
# Open VSCode → Agent Brain → Threading tab

# 4. Export report
# Click "Export" in UI or use API

# 5. Apply recommendations
# Address high-priority patterns first
```

## Examples

### Example 1: API Endpoint Monitoring

```typescript
import { ThreadSpec } from '@agent-brain/core/threading';

class UserController {
  @ThreadSpec({
    threads: ['API', 'DATA_FLOW'],
    timing: { max: 200 },
    memory: { max: 5 * 1024 * 1024 }, // 5MB
    tags: ['api', 'user-facing']
  })
  async getUser(req: Request, res: Response) {
    const userId = req.params.id;
    const user = await this.userService.findById(userId);
    return res.json(user);
  }
}
```

### Example 2: Background Job

```typescript
@ThreadSpec({
  threads: ['BACKGROUND_JOB'],
  timing: { max: 30000 }, // 30 seconds
  memory: { max: 100 * 1024 * 1024 }, // 100MB
  tags: ['batch', 'data-processing']
})
async function processUserEmails() {
  const users = await db.users.findAll();
  for (const user of users) {
    await sendEmail(user.email);
  }
}
```

### Example 3: Custom Analysis

```typescript
import { ThreadAnalyzer } from '@agent-brain/core/threading';

// Create custom analyzer with specific detectors
const analyzer = new ThreadAnalyzer({
  enabledDetectors: ['memory_leak', 'cache_pattern'],
  sensitivity: 'high',
  minSampleSize: 5
});

// Analyze recent logs
const report = await analyzer.analyze(recentEntries);

// Filter critical issues
const criticalPatterns = report.patterns.filter(p => p.impact === 'critical');

// Send alerts
if (criticalPatterns.length > 0) {
  await notificationService.alert({
    title: 'Critical Performance Issues Detected',
    patterns: criticalPatterns,
    report: report.summary
  });
}
```

## Type Definitions

### LogEntry Types

```typescript
type LogEntry = EntryLogEntry | ExitLogEntry | DeltaLogEntry | ErrorLogEntry;

interface EntryLogEntry {
  type: 'entry';
  context: string;
  threads: string[];
  timestamp: number;
  args: any[];
  expectations?: ThreadSpecOptions;
}

interface ExitLogEntry {
  type: 'exit';
  context: string;
  threads: string[];
  timestamp: number;
  duration: number;
  result?: any;
  memoryDelta?: number;
}

interface DeltaLogEntry {
  type: 'delta';
  context: string;
  threads: string[];
  timestamp: number;
  subtype: 'timing' | 'memory' | 'io' | 'state';
  expected: string;
  actual: string;
  deviation: 'slow' | 'fast' | 'large' | 'small' | 'unexpected';
  severity: 'info' | 'warning' | 'error' | 'critical';
  evidence?: any;
}

interface ErrorLogEntry {
  type: 'error';
  context: string;
  threads: string[];
  timestamp: number;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
}
```

### Analysis Types

```typescript
interface AnalysisReport {
  session?: ThreadSession;
  timestamp: number;
  patterns: DetectedPattern[];
  insights: AnalysisInsight[];
  recommendations: Recommendation[];
  summary: string;
  metrics?: AnalysisMetrics;
}

interface DetectedPattern {
  name: string;
  type: string;
  confidence: number;
  description: string;
  evidence: any;
  impact: 'low' | 'medium' | 'high' | 'critical';
  affectedFunctions?: string[];
  trend?: TrendAnalysis;
}

interface Recommendation {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  effort: 'trivial' | 'small' | 'medium' | 'large';
  impact: 'low' | 'medium' | 'high';
  steps?: string[];
  code?: {
    language: string;
    snippet: string;
  };
}
```

## Performance Considerations

### Overhead

- **Decorator**: Zero runtime overhead (metadata only)
- **Logging**: ~0.1-0.5ms per log entry (buffered)
- **Analysis**: Runs asynchronously, no impact on application

### Optimization Tips

1. **Use Sampling**: Don't log every call in production
2. **Buffer Writes**: Enable buffering for better I/O performance
3. **Async Analysis**: Run analysis in background or batch mode
4. **Log Rotation**: Keep logs manageable with rotation policies

## Troubleshooting

### Logs Not Being Written

```typescript
// Check if logging is enabled
console.log('Logging enabled:', ThreadLog.isEnabled());

// Manually flush buffer
await logger.flush();

// Check log file path
console.log('Log path:', logger.getLogPath());
```

### No Patterns Detected

```typescript
// Check sample size
const analyzer = new ThreadAnalyzer({
  minSampleSize: 5  // Reduce for testing
});

// Check if detectors are enabled
console.log('Enabled detectors:', analyzer.getDetectors());

// Enable specific detectors
const analyzer = new ThreadAnalyzer({
  enabledDetectors: ['performance_degradation', 'memory_leak']
});
```

### High Memory Usage

```typescript
// Reduce buffer size
const logger = new ThreadLogger({
  buffer: {
    enabled: true,
    size: 50,  // Smaller buffer
    flushInterval: 1000  // Flush more frequently
  }
});

// Enable log compression
rotation: {
  maxSize: '10MB',
  maxAge: '7d',
  compress: true  // Compress rotated logs
}
```

## Future Enhancements

- **Timeline Visualization**: D3.js-based timeline showing execution flow
- **Real-time Analysis**: Streaming analysis as logs are written
- **Pattern History**: Track pattern trends over time
- **AI Recommendations**: LLM-powered optimization suggestions
- **Integration with Profilers**: Link with V8 profiler, Chrome DevTools
- **Cross-Session Analysis**: Compare patterns across sessions
- **Custom Pattern Detectors**: Plugin system for custom patterns

## Contributing

When adding new pattern detectors:

1. Extend `PatternDetector` base class
2. Implement `analyze()`, `getName()`, `getDescription()`
3. Return `DetectedPattern` with proper typing
4. Include evidence and recommendations
5. Add tests with sample data
6. Update documentation

## License

MIT

## Credits

Built with ❤️ for Agent Brain Platform

🤖 Powered by Claude Code
