# Data Correctness Extension - Quick Start Guide

The Data Correctness Extension adds runtime contract validation, execution tracking, and agent-friendly debugging to the Agent Brain Platform threading system.

## Installation

The extension is built-in to Agent Brain Platform v0.4.58+. No separate installation needed.

## Basic Usage

### 1. Define a Data Contract

```typescript
import { ThreadSpec, createType, createShape, createNumber } from '@agent-brain/core/threading';

@ThreadSpec({
  threads: ['DATA_FLOW'],
  expects: {
    params: {
      'userId': {
        type: createType('string'),
        constraints: { pattern: /^[a-z0-9-]+$/ }
      },
      'age': {
        type: createType('number'),
        constraints: { min: 0, max: 120 }
      }
    },
    preconditions: ['args[0].length > 0', 'args[1] >= 0']
  },
  produces: {
    type: {
      type: createType('object'),
      shape: createShape({
        id: { type: createType('string'), required: true },
        name: { type: createType('string'), required: true },
        age: { type: createType('number'), required: true }
      })
    },
    postconditions: ['result.age === args[1]']
  }
})
async function getUser(userId: string, age: number) {
  return { id: userId, name: 'John', age };
}
```

### 2. Enable Execution Tracking

```typescript
import { ThreadLogDecorator } from '@agent-brain/core/threading';

@ThreadLogDecorator('DATA_FLOW', 'VALIDATION')
async function processData(input: any) {
  // Automatically tracked:
  // - Input arguments
  // - Return value
  // - Mutations
  // - Transformations
  // - Contract violations

  return transform(input);
}
```

### 3. Configure Monitoring

```typescript
import { setGlobalDataCorrectnessConfig, DEVELOPMENT_CONFIG } from '@agent-brain/core/threading';

// Use preset configuration
setGlobalDataCorrectnessConfig(DEVELOPMENT_CONFIG);

// Or customize
setGlobalDataCorrectnessConfig({
  enabled: true,
  capture: { mode: 'full' },
  validation: {
    failOnViolations: false,
    failOnSeverity: 'error'
  },
  privacy: {
    enabled: true,
    redactionPatterns: [/password/i, /token/i]
  }
});
```

## Configuration Presets

### Development Mode
```typescript
import { DEVELOPMENT_CONFIG } from '@agent-brain/core/threading';
setGlobalDataCorrectnessConfig(DEVELOPMENT_CONFIG);
```
- Full capture
- Verbose output
- All debugging features enabled
- Doesn't fail on violations

### Production Mode
```typescript
import { PRODUCTION_CONFIG } from '@agent-brain/core/threading';
setGlobalDataCorrectnessConfig(PRODUCTION_CONFIG);
```
- Sampled capture (1%)
- Minimal output
- Lightweight monitoring
- Privacy-focused

### Testing Mode
```typescript
import { TESTING_CONFIG } from '@agent-brain/core/threading';
setGlobalDataCorrectnessConfig(TESTING_CONFIG);
```
- Full capture
- Strict validation
- Fails on warnings
- Verbose debugging

### Disabled Mode
```typescript
import { DISABLED_CONFIG } from '@agent-brain/core/threading';
setGlobalDataCorrectnessConfig(DISABLED_CONFIG);
```
- No overhead
- All monitoring disabled

## Viewing Results

### 1. JSONL Logs

Execution traces are automatically logged to `.agent-brain/threading-logs/`:

```bash
tail -f .agent-brain/threading-logs/thread-log-*.jsonl | jq
```

### 2. Debug Reports

```typescript
import { generateDebugReport } from '@agent-brain/core/threading';

// After execution
const trace = executionTracker.getCompleteTrace();
const report = generateDebugReport(trace);

console.log(report.summary);
console.log('Violations:', report.violations.length);
console.log('Suggestions:', report.suggestions);
console.log('Next Steps:', report.nextSteps);
```

### 3. Visualizations

```typescript
import { visualizeTrace, renderViolations } from '@agent-brain/core/threading';

// Generate Mermaid diagram
const diagram = visualizeTrace(trace, { format: 'mermaid' });

// Render violations as HTML
const html = renderViolations(trace.violations, { format: 'html' });
```

## Privacy Features

### Automatic Redaction

Sensitive fields are automatically redacted:

```typescript
// These fields are automatically protected:
const user = {
  username: 'john',
  password: 'secret',      // → [REDACTED]
  apiKey: 'key123',        // → [REDACTED]
  email: 'john@example.com' // → shown (unless configured)
};
```

### Custom Redaction

```typescript
setGlobalDataCorrectnessConfig({
  privacy: {
    enabled: true,
    redactionPatterns: [
      /secret/i,
      /private/i,
      /ssn/i,
      /credit.*card/i
    ],
    maxStringLength: 1000,
    maxArrayLength: 100,
    maxDepth: 10
  }
});
```

## Contract Types

### Type Definitions

```typescript
import { createType, createUnion, createLiteral } from '@agent-brain/core/threading';

// Basic types
const stringType = createType('string');
const numberType = createType('number');
const booleanType = createType('boolean');

// Nullable types
const nullableString = createType('string', { nullable: true });

// Union types
const stringOrNumber = createUnion(
  createType('string'),
  createType('number')
);

// Literal types
const status = createUnion(
  createLiteral('pending'),
  createLiteral('active'),
  createLiteral('completed')
);

// Generic types
const arrayOfStrings = createType('array', {
  generic: createType('string')
});
```

### Shape Definitions

```typescript
import { createShape } from '@agent-brain/core/threading';

const userShape = createShape({
  id: {
    type: createType('string'),
    required: true
  },
  name: {
    type: createType('string'),
    required: true
  },
  email: {
    type: createType('string'),
    required: false
  },
  age: {
    type: createType('number'),
    required: true,
    constraints: { min: 0, max: 120 }
  }
});
```

### Constraint Definitions

```typescript
// Numeric constraints
{
  type: createType('number'),
  constraints: {
    min: 0,
    max: 100,
    multipleOf: 5,
    precision: 2
  }
}

// String constraints
{
  type: createType('string'),
  constraints: {
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-z0-9-]+$/
  }
}

// Array constraints
{
  type: createType('array'),
  constraints: {
    minItems: 1,
    maxItems: 10,
    uniqueItems: true
  }
}
```

## Invariants

Invariants are expressions that must always hold true:

```typescript
@ThreadSpec({
  threads: ['DATA_FLOW'],
  expects: {
    params: {
      'input': { type: createType('array') }
    },
    preconditions: [
      'args[0].length > 0',           // Array must not be empty
      'args[0][0] !== undefined'      // First element must exist
    ]
  },
  produces: {
    type: createType('array'),
    postconditions: [
      'result.length >= args[0].length',  // Output at least as long as input
      'result[0] !== null'                 // First element not null
    ]
  },
  invariants: [
    'this.state !== null',           // State must never be null
    'this.counter >= 0'              // Counter must be non-negative
  ]
})
async function processArray(input: any[]) {
  // Implementation
}
```

## Agent Integration

### Fix Suggestions

When violations occur, the system automatically generates fix suggestions:

```typescript
import { suggestFixes } from '@agent-brain/core/threading';

const violations = trace.violations;
const suggestions = suggestFixes(violations);

suggestions.forEach(suggestion => {
  console.log(suggestion.description);
  console.log(suggestion.explanation);
  if (suggestion.codeSnippet) {
    console.log('Fix:', suggestion.codeSnippet);
  }
});
```

### Debug Reports

Generate comprehensive debugging information:

```typescript
import { generateDebugReport } from '@agent-brain/core/threading';

const report = generateDebugReport(trace);

// Summary
console.log(report.summary);

// Detailed violation analysis
report.violations.forEach(v => {
  console.log(v.explanation);
  console.log('Impact:', v.impact);
  console.log('How to fix:', v.howToFix);
});

// Code examples
report.examples.forEach(ex => {
  console.log(ex.title);
  console.log(ex.description);
  console.log(ex.code);
});

// Learnings
report.learnings.forEach(learning => {
  console.log('📚', learning);
});

// Next steps
report.nextSteps.forEach(step => {
  console.log(step);
});
```

## Migration from Legacy IOShape

The extension maintains backward compatibility with the legacy IOShape format:

```typescript
// Legacy format (still works)
@ThreadSpec({
  threads: ['DATA_FLOW'],
  input: {
    params: {
      userId: { type: 'string' }
    }
  },
  output: {
    type: 'object'
  }
})

// New enhanced format
@ThreadSpec({
  threads: ['DATA_FLOW'],
  expects: {
    params: {
      'userId': {
        type: createType('string'),
        constraints: { pattern: /^[a-z0-9-]+$/ }
      }
    },
    preconditions: ['args[0].length > 0']
  },
  produces: {
    type: createType('object'),
    postconditions: ['result !== null']
  }
})
```

Both formats can coexist in the same codebase during migration.

## Performance Considerations

### Sampling

For high-throughput functions, use sampling:

```typescript
setGlobalDataCorrectnessConfig({
  capture: {
    mode: 'sampled',
    samplingRate: 0.1  // Capture 10% of executions
  }
});
```

### Selective Capture

Disable specific capture types for better performance:

```typescript
setGlobalDataCorrectnessConfig({
  capture: {
    mode: 'full',
    captureArgs: true,
    captureReturnValues: true,
    captureMutations: false,      // Disable mutation tracking
    captureTransformations: false, // Disable transformation tracking
    captureContext: false          // Disable context capture
  }
});
```

### Conditional Monitoring

Enable only in development:

```typescript
import { setGlobalDataCorrectnessConfig, PRODUCTION_CONFIG, DEVELOPMENT_CONFIG } from '@agent-brain/core/threading';

const config = process.env.NODE_ENV === 'production'
  ? PRODUCTION_CONFIG
  : DEVELOPMENT_CONFIG;

setGlobalDataCorrectnessConfig(config);
```

## Troubleshooting

### Violations Not Being Detected

1. Ensure monitoring is enabled:
```typescript
setGlobalDataCorrectnessConfig({ enabled: true });
```

2. Check validation settings:
```typescript
setGlobalDataCorrectnessConfig({
  validation: { enabled: true }
});
```

3. Verify the function has `@ThreadLogDecorator`:
```typescript
@ThreadLogDecorator('DATA_FLOW')
async function myFunction() { }
```

### Privacy Redaction Too Aggressive

Customize redaction patterns:
```typescript
setGlobalDataCorrectnessConfig({
  privacy: {
    enabled: true,
    redactionPatterns: [/password/i]  // Only redact passwords
  }
});
```

### Performance Issues

1. Use sampling in production:
```typescript
setGlobalDataCorrectnessConfig(PRODUCTION_CONFIG);
```

2. Disable mutation tracking:
```typescript
setGlobalDataCorrectnessConfig({
  capture: { captureMutations: false }
});
```

3. Reduce detail level:
```typescript
setGlobalDataCorrectnessConfig({
  visualization: { detailLevel: 'minimal' }
});
```

## Next Steps

- See [Usage Examples](./usage-examples.md) for complete examples
- See [API Reference](./api-reference.md) for detailed API documentation
- See [Migration Guide](./migration-guide.md) for upgrading from legacy IOShape
