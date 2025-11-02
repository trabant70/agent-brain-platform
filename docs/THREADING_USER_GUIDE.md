# Threading System User Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Configuration](#configuration)
4. [Using the Threading Dashboard](#using-the-threading-dashboard)
5. [Understanding Execution Traces](#understanding-execution-traces)
6. [Analyzing Results](#analyzing-results)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## Introduction

The **AB Threading Data Correctness Monitoring System** is a runtime contract validation framework that helps you:

- **Validate data contracts** at function entry and exit points
- **Track data transformations** as values flow through your application
- **Detect mutations** to objects and arrays in real-time
- **Identify contract violations** with detailed diagnostics
- **Visualize execution flow** using an interactive timeline

### Key Benefits

✅ **Catch bugs early** - Detect type mismatches and contract violations before they cause issues
✅ **Understand data flow** - See exactly how data transforms through your functions
✅ **Debug faster** - Pinpoint the exact location where data becomes invalid
✅ **Prevent regressions** - Continuous monitoring ensures contracts are always met

## Getting Started

### Step 1: Open the Threading Dashboard

1. Open the **Agent Brain Platform** sidebar in VS Code
2. Click on the **Threading** tab
3. You'll see the threading dashboard with status panel and timeline

### Step 2: Enable Threading Monitoring

1. Click the **Enable** button in the status panel
2. Threading mode will activate (default: Development mode)
3. The status indicator will turn green 🟢

### Step 3: Start a Session

1. Click **Start Session** to begin collecting execution traces
2. Execute your code (run tests, use your application, etc.)
3. Execution traces will appear in the timeline visualization

### Step 4: View Results

- **Timeline**: See real-time execution flow with swim lanes for different threads
- **Patterns**: Detected patterns like repeated violations or bottlenecks
- **Insights**: Analysis of contract violations and performance issues
- **Recommendations**: Actionable steps to fix detected issues

## Configuration

### Threading Modes

The system supports multiple modes optimized for different scenarios:

#### Development Mode (Default)
```typescript
{
  enabled: true,
  validation: {
    enabled: true,
    failOnViolations: false,  // Log violations but don't throw
    failOnSeverity: 'critical' // Only fail on critical violations
  },
  tracking: {
    captureEntry: true,
    captureExit: true,
    captureTransformations: true,
    captureMutations: true
  },
  performance: {
    maxTracesInMemory: 10000
  }
}
```

**Use when**: Developing new features, debugging data flow issues

#### Debugging Mode
```typescript
{
  enabled: true,
  validation: {
    enabled: true,
    failOnViolations: true,  // Throw on any violation
    failOnSeverity: 'warning'
  },
  tracking: {
    captureEntry: true,
    captureExit: true,
    captureTransformations: true,
    captureMutations: true,
    captureSnapshots: true  // Capture detailed snapshots
  }
}
```

**Use when**: Investigating specific bugs, need detailed traces

#### Testing Mode
```typescript
{
  enabled: true,
  validation: {
    enabled: true,
    failOnViolations: true,
    failOnSeverity: 'error'  // Fail tests on errors
  },
  tracking: {
    captureEntry: true,
    captureExit: true,
    captureTransformations: false,  // Reduced overhead
    captureMutations: false
  }
}
```

**Use when**: Running automated tests, CI/CD pipelines

#### Production Mode
```typescript
{
  enabled: true,
  validation: {
    enabled: true,
    failOnViolations: false,  // Never fail in production
    failOnSeverity: 'critical'
  },
  tracking: {
    captureEntry: true,
    captureExit: true,
    captureTransformations: false,  // Minimal overhead
    captureMutations: false,
    captureSnapshots: false
  },
  performance: {
    maxTracesInMemory: 1000,  // Lower memory usage
    samplingRate: 0.1  // Sample 10% of calls
  }
}
```

**Use when**: Production deployment (use sparingly, performance impact)

### Changing Configuration

You can change the threading mode from the dashboard:

1. Click **Configure** in the status panel
2. Select the desired mode from the dropdown
3. Configuration applies immediately

## Using the Threading Dashboard

### Status Panel

The status panel shows the current state of the threading system:

- **Status Indicator**:
  - 🔴 Disabled
  - 🟢 Development mode active
  - 🟡 Production mode active
  - 🔵 Learning mode active

- **Controls**:
  - **Enable/Disable**: Toggle threading monitoring
  - **Start Session**: Begin collecting traces
  - **End Session**: Stop collection and save traces

- **Info**:
  - **Mode**: Current configuration mode
  - **Active Threads**: Number of threads being monitored

### Timeline Visualization

The timeline shows execution traces in real-time:

#### Swim Lanes

Each horizontal lane represents a thread:
- **DATA_FLOW**: Function entry/exit and data transformations
- **VALIDATION**: Contract validation events
- **MUTATION**: Object/array mutation tracking

#### Event Markers

- 🟢 **Entry** (green circle): Function entry with input arguments
- 🔵 **Exit** (blue circle): Function exit with return value
- 🟠 **Transformation** (orange diamond): Data transformation detected
- 🟣 **Mutation** (purple square): Object/array mutation detected
- 🔴 **Violation** (red triangle): Contract violation

#### Timeline Controls

- **Zoom**: Scroll wheel or pinch gesture
- **Pan**: Click and drag timeline
- **Hover**: View detailed event information
- **Click**: Select event for detailed view (future feature)

### Analysis Panels

#### Patterns Panel

Shows detected patterns in your execution traces:

- **Repeated Violations**: Functions with multiple contract violations
- **Performance Bottlenecks**: Functions taking significantly longer than average
- **Data Flow Patterns**: Common transformation sequences

Each pattern includes:
- **Impact Level**: Low, Medium, High, Critical
- **Confidence**: How confident the detector is (0-100%)
- **Affected Functions**: List of functions involved
- **Recommendation**: Suggested fix

#### Insights Panel

Analysis insights categorized by:

- **Performance**: Execution time issues
- **Error**: Contract violations and failures
- **Memory**: Memory usage patterns
- **Architecture**: Structural issues detected

Each insight includes:
- **Severity**: Info, Warning, Error, Critical
- **Root Cause**: Why the issue is occurring
- **Related Patterns**: Links to detected patterns

#### Recommendations Panel

Actionable recommendations prioritized by:

- **Urgent**: Must fix immediately (critical violations)
- **High**: Should fix soon (performance issues)
- **Medium**: Fix when convenient (optimization)
- **Low**: Nice to have (code quality)

Each recommendation includes:
- **Effort**: Low, Medium, High
- **Steps**: Numbered list of actions to take
- **Expected Impact**: What will improve

#### Bottlenecks Panel

Performance bottlenecks sorted by impact:

- **Function Name**: Which function is slow
- **Average Duration**: Mean execution time
- **Max Duration**: Worst-case execution time
- **Call Count**: How often it's called

## Understanding Execution Traces

### Entry Events

Captured when a function is called:

```json
{
  "type": "entry",
  "timestamp": 1699123456789,
  "context": "calculateTotal",
  "args": [
    {
      "type": "object",
      "preview": "{ items: Array(5), tax: 0.08 }"
    }
  ]
}
```

**Interpretation**: Function `calculateTotal` was called with an object containing 5 items and 8% tax.

### Exit Events

Captured when a function returns:

```json
{
  "type": "exit",
  "timestamp": 1699123456792,
  "context": "calculateTotal",
  "result": {
    "type": "number",
    "preview": "127.50"
  },
  "duration": 3
}
```

**Interpretation**: Function returned 127.50 after 3ms execution time.

### Transformation Events

Captured when data changes type or structure:

```json
{
  "type": "transformation",
  "timestamp": 1699123456790,
  "from": "array",
  "to": "number",
  "beforeValue": { "preview": "[10, 20, 30, 40, 50]" },
  "afterValue": { "preview": "150" }
}
```

**Interpretation**: Array was reduced to a single number (sum).

### Mutation Events

Captured when objects or arrays are modified:

```json
{
  "type": "mutation",
  "timestamp": 1699123456791,
  "path": "cart.items[2].quantity",
  "mutationType": "property-set",
  "beforeValue": { "preview": "1" },
  "afterValue": { "preview": "3" }
}
```

**Interpretation**: Cart item quantity was changed from 1 to 3.

### Violation Events

Captured when contract validation fails:

```json
{
  "type": "violation",
  "severity": "error",
  "message": "Expected number, received string",
  "path": "args[0].price",
  "expected": "number",
  "actual": "string"
}
```

**Interpretation**: Price field should be a number but received a string instead.

## Analyzing Results

### Reading the Timeline

1. **Identify the thread**: Check which swim lane the event is in
2. **Follow the flow**: Trace events chronologically from left to right
3. **Look for violations**: Red triangles indicate problems
4. **Check durations**: Long gaps between entry/exit suggest slow functions
5. **Spot mutations**: Purple squares show where data is being modified

### Interpreting Patterns

**Example: Repeated Violation Pattern**

```
Pattern: Repeated Contract Violations
Impact: High
Confidence: 95%

Function "processOrder" has 12 contract violations

Evidence:
- Violation type: Type mismatch
- Expected: number
- Received: string
- Path: order.totalAmount

Recommendation:
Review the contract for processOrder and ensure all inputs meet requirements.
Consider adding type conversion or validation before calling this function.
```

**Action**:
1. Check the contract definition for `processOrder`
2. Find where `order.totalAmount` is set
3. Ensure it's always a number, not a string
4. Add type guard or conversion if needed

### Using Insights

**Example: Performance Insight**

```
Insight: Performance Impact
Severity: Warning
Category: Performance

Average function execution time is 250.5ms

Root Cause:
Contract validation and tracking add overhead

Related Patterns:
- Performance Bottleneck in fetchUserData
```

**Action**:
1. Review if all tracking is necessary in this context
2. Consider reducing `captureTransformations` in production
3. Optimize the `fetchUserData` function itself
4. Use sampling rate to reduce overhead

## Best Practices

### 1. Use Appropriate Modes

- **Development**: Full tracking for debugging
- **Testing**: Fail fast on violations
- **Production**: Minimal tracking, never fail

### 2. Start Sessions Intentionally

Don't leave sessions running indefinitely:

```typescript
// ✅ Good: Start session for specific operation
await startSession();
await runCriticalOperation();
await endSession();

// ❌ Bad: Leave session running forever
await startSession();
// ... application runs for hours
```

### 3. Review Violations Regularly

Make it part of your development workflow:

1. Run code with threading enabled
2. Check for violations after each feature
3. Fix violations before committing
4. Run tests in Testing mode in CI

### 4. Use Analysis Reports

Click **Analyze Now** to generate fresh insights:

1. After making changes
2. Before committing code
3. When investigating bugs
4. During code reviews

### 5. Export Traces for Collaboration

Export execution traces to share with team:

1. Click **Export** in the dashboard
2. Share JSONL file with teammates
3. Import in their environment for review

### 6. Clean Up Old Logs

Threading logs accumulate over time:

```bash
# View log directory
ls .agent-brain/threading-logs/

# Remove old logs (older than 7 days)
find .agent-brain/threading-logs/ -name "*.jsonl" -mtime +7 -delete
```

## Troubleshooting

### No Execution Traces Appearing

**Problem**: Timeline is empty even though code is running.

**Solutions**:
1. Ensure threading is **enabled** (green indicator)
2. Verify a **session is active**
3. Check that code has `@ThreadSpec` decorators
4. Look for errors in the developer console (Help > Toggle Developer Tools)

### Too Many Violations

**Problem**: Hundreds of violations make it hard to find real issues.

**Solutions**:
1. Filter by severity: Focus on Critical and Error first
2. Group by function: Find functions with most violations
3. Fix root causes: Often one fix resolves many violations
4. Adjust contract definitions: Contracts might be too strict

### Performance Impact

**Problem**: Application runs slowly with threading enabled.

**Solutions**:
1. Switch to **Production mode** (less tracking)
2. Enable **sampling**: Only track 10% of calls
3. Disable **transformation tracking**: Most expensive feature
4. Reduce **maxTracesInMemory**: Lower memory usage
5. Consider **disabling in production**: Only use in dev/test

### Missing Timeline Data

**Problem**: Some events don't appear in the timeline.

**Solutions**:
1. Check if **buffer is full**: Max 10,000 traces in memory
2. Restart session: End current session and start new one
3. Check **configuration**: Some tracking might be disabled
4. Look for **errors**: Check console for failed writes

### JSONL Files Too Large

**Problem**: Log files consuming too much disk space.

**Solutions**:
1. Reduce **maxFileSizeMb**: Default is 100MB
2. Decrease **buffer size**: Flush more frequently
3. **End sessions** when done: Flushes and closes file
4. Enable **log rotation**: Automatic when size exceeded

### Zoom/Pan Not Working

**Problem**: Can't interact with timeline visualization.

**Solutions**:
1. Ensure D3.js is loaded: Check browser console
2. Refresh the webview: Click refresh icon
3. Check container size: Timeline needs sufficient space
4. Try resizing the sidebar: Sometimes layout gets stuck

## Advanced Topics

### Custom Contract Definitions

See [THREADING_ARCHITECTURE.md](./THREADING_ARCHITECTURE.md) for details on:
- Defining custom contracts
- Creating constraint validators
- Extending the validation system

### Programmatic API

See [THREADING_API_REFERENCE.md](./THREADING_API_REFERENCE.md) for:
- Accessing execution traces programmatically
- Creating custom analyzers
- Integrating with external tools

### Multi-Tier Maturity System

See [threading-data-correctness-extension.md](../threading-data-correctness-extension.md) for:
- Maturity level detection
- Progressive enhancement
- Migration guides

## Support

For issues, questions, or feature requests:

1. Check the [Threading Architecture](./THREADING_ARCHITECTURE.md) documentation
2. Review [Implementation Plan](./THREADING_IMPLEMENTATION_PLAN.md)
3. Open an issue in the repository
4. Consult the team lead

---

**Next Steps**: [API Reference](./THREADING_API_REFERENCE.md) | [Architecture](./THREADING_ARCHITECTURE.md)
