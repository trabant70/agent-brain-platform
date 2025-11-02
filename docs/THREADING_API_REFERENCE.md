# Threading System API Reference

## Table of Contents

1. [Core APIs](#core-apis)
2. [Decorators](#decorators)
3. [Configuration](#configuration)
4. [Contracts](#contracts)
5. [Tracking](#tracking)
6. [Validation](#validation)
7. [Logging](#logging)
8. [Message Protocol](#message-protocol)

## Core APIs

### DataCorrectnessConfig

Global configuration for the threading system.

#### `getGlobalDataCorrectnessConfig()`

Get the current global configuration.

```typescript
import { getGlobalDataCorrectnessConfig } from '@agent-brain/core/domains/threading/config/DataCorrectnessConfig';

const config = getGlobalDataCorrectnessConfig();
console.log('Threading enabled:', config.enabled);
```

**Returns**: `DataCorrectnessConfig`

#### `setGlobalDataCorrectnessConfig(config)`

Set the global configuration.

```typescript
import {
  setGlobalDataCorrectnessConfig,
  DEVELOPMENT_CONFIG
} from '@agent-brain/core/domains/threading/config/DataCorrectnessConfig';

// Use predefined config
setGlobalDataCorrectnessConfig(DEVELOPMENT_CONFIG);

// Or custom config
setGlobalDataCorrectnessConfig({
  enabled: true,
  validation: {
    enabled: true,
    failOnViolations: false,
    failOnSeverity: 'error'
  },
  tracking: {
    captureEntry: true,
    captureExit: true,
    captureTransformations: true,
    captureMutations: true
  }
});
```

**Parameters**:
- `config: DataCorrectnessConfig` - Configuration object

**Returns**: `void`

#### Predefined Configurations

```typescript
import {
  DISABLED_CONFIG,      // All features disabled
  DEVELOPMENT_CONFIG,   // Full tracking, log violations
  TESTING_CONFIG,       // Fail on violations
  PRODUCTION_CONFIG     // Minimal tracking, sampling
} from '@agent-brain/core/domains/threading/config/DataCorrectnessConfig';
```

### DataCorrectnessConfig Interface

```typescript
interface DataCorrectnessConfig {
  enabled: boolean;

  validation: {
    enabled: boolean;
    failOnViolations: boolean;
    failOnSeverity: 'info' | 'warning' | 'error' | 'critical';
  };

  tracking: {
    captureEntry: boolean;
    captureExit: boolean;
    captureTransformations: boolean;
    captureMutations: boolean;
    captureSnapshots: boolean;
  };

  performance: {
    maxTracesInMemory: number;
    samplingRate?: number;          // 0.0 to 1.0
    debounceMs?: number;
    maxSnapshotDepth?: number;
  };
}
```

## Decorators

### @ThreadSpec

Mark a function for threading monitoring with contract specification.

#### Basic Usage

```typescript
import { ThreadSpec } from '@agent-brain/core/domains/threading/decorators/ThreadSpec';
import { DataContract } from '@agent-brain/core/domains/threading/contracts/DataContract';

class OrderService {
  @ThreadSpec({
    thread: 'ORDER_PROCESSING',
    contract: new DataContract({
      input: {
        type: 'object',
        properties: {
          orderId: { type: 'string' },
          items: { type: 'array' },
          total: { type: 'number' }
        },
        required: ['orderId', 'items', 'total']
      },
      output: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          orderId: { type: 'string' }
        }
      }
    })
  })
  async processOrder(order: Order): Promise<ProcessResult> {
    // Implementation
  }
}
```

#### Options

```typescript
interface ThreadSpecOptions {
  thread: string;                    // Thread name
  contract: DataContract;            // Data contract
  maturityLevel?: number;            // Maturity tier (0-3)
  metadata?: Record<string, any>;    // Custom metadata
}
```

### @ThreadLog

Simpler decorator for logging without contract validation.

#### Basic Usage

```typescript
import { ThreadLog } from '@agent-brain/core/domains/threading/decorators/ThreadLog';

class UserService {
  @ThreadLog({
    thread: 'USER_MANAGEMENT',
    level: 'debug'
  })
  getUserById(id: string): User {
    // Implementation
  }
}
```

#### Options

```typescript
interface ThreadLogOptions {
  thread: string;                    // Thread name
  level?: 'debug' | 'info' | 'warn' | 'error';
  skipValidation?: boolean;          // Skip contract validation
}
```

## Configuration

### Configuration Modes

#### Development Mode

```typescript
const DEVELOPMENT_CONFIG: DataCorrectnessConfig = {
  enabled: true,
  validation: {
    enabled: true,
    failOnViolations: false,
    failOnSeverity: 'critical'
  },
  tracking: {
    captureEntry: true,
    captureExit: true,
    captureTransformations: true,
    captureMutations: true,
    captureSnapshots: false
  },
  performance: {
    maxTracesInMemory: 10000,
    samplingRate: 1.0,
    debounceMs: 0,
    maxSnapshotDepth: 5
  }
};
```

#### Testing Mode

```typescript
const TESTING_CONFIG: DataCorrectnessConfig = {
  enabled: true,
  validation: {
    enabled: true,
    failOnViolations: true,        // Fail tests
    failOnSeverity: 'error'
  },
  tracking: {
    captureEntry: true,
    captureExit: true,
    captureTransformations: false,
    captureMutations: false,
    captureSnapshots: false
  },
  performance: {
    maxTracesInMemory: 5000,
    samplingRate: 1.0,
    debounceMs: 0
  }
};
```

#### Production Mode

```typescript
const PRODUCTION_CONFIG: DataCorrectnessConfig = {
  enabled: true,
  validation: {
    enabled: true,
    failOnViolations: false,       // Never fail
    failOnSeverity: 'critical'
  },
  tracking: {
    captureEntry: true,
    captureExit: true,
    captureTransformations: false,
    captureMutations: false,
    captureSnapshots: false
  },
  performance: {
    maxTracesInMemory: 1000,
    samplingRate: 0.1,             // Sample 10%
    debounceMs: 100,
    maxSnapshotDepth: 2
  }
};
```

## Contracts

### DataContract

Define contracts for function inputs and outputs.

#### Creating a Contract

```typescript
import { DataContract } from '@agent-brain/core/domains/threading/contracts/DataContract';

const orderContract = new DataContract({
  input: {
    type: 'object',
    properties: {
      orderId: {
        type: 'string',
        pattern: '^ORD-\\d{6}$'
      },
      items: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          properties: {
            productId: { type: 'string' },
            quantity: { type: 'number', minimum: 1 },
            price: { type: 'number', minimum: 0 }
          },
          required: ['productId', 'quantity', 'price']
        }
      },
      total: {
        type: 'number',
        minimum: 0
      }
    },
    required: ['orderId', 'items', 'total']
  },
  output: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      orderId: { type: 'string' },
      confirmationNumber: { type: 'string' }
    },
    required: ['success', 'orderId']
  }
});
```

#### Contract Schema

Based on JSON Schema specification:

```typescript
interface ContractSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';

  // Object types
  properties?: Record<string, ContractSchema>;
  required?: string[];
  additionalProperties?: boolean | ContractSchema;

  // Array types
  items?: ContractSchema;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;

  // String types
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  format?: 'email' | 'uri' | 'date-time' | 'uuid';

  // Number types
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;

  // All types
  enum?: any[];
  const?: any;

  // Metadata
  description?: string;
  examples?: any[];
}
```

## Tracking

### ExecutionTracker

Low-level API for tracking execution traces.

#### Creating a Tracker

```typescript
import { ExecutionTracker } from '@agent-brain/core/domains/threading/tracking/ExecutionTracker';

const tracker = new ExecutionTracker({
  context: 'processOrder',
  thread: 'ORDER_PROCESSING',
  metadata: {
    userId: 'user-123',
    sessionId: 'session-456'
  }
});
```

#### Capturing Entry

```typescript
tracker.captureEntry([order], {
  timestamp: Date.now(),
  metadata: { source: 'api' }
});
```

#### Capturing Exit

```typescript
const result = await processOrderLogic(order);

tracker.captureExit(result, {
  timestamp: Date.now(),
  duration: performance.now() - startTime
});
```

#### Capturing Transformations

```typescript
tracker.trackTransformation(
  beforeValue,
  afterValue,
  'reduce',
  Date.now()
);
```

#### Capturing Mutations

```typescript
tracker.trackMutation(
  'cart.items[2].quantity',
  'property-set',
  oldValue,
  newValue,
  Date.now()
);
```

#### Getting the Trace

```typescript
const trace: ExecutionTrace = tracker.getTrace();
console.log('Violations:', trace.violations.length);
console.log('Transformations:', trace.transformations.length);
```

### ExecutionTrace Interface

```typescript
interface ExecutionTrace {
  context: string;                   // Function name
  thread: string;                    // Thread name
  entry: {
    timestamp: number;
    args: CapturedValue[];
  };
  exit?: {
    timestamp: number;
    result: CapturedValue;
    duration: number;
  };
  transformations: Transformation[];
  mutations: Mutation[];
  violations: ContractViolation[];
  snapshots: Snapshot[];
  metadata: Record<string, any>;
}
```

## Validation

### ContractValidator

Validate values against contracts.

#### Creating a Validator

```typescript
import { ContractValidator } from '@agent-brain/core/domains/threading/validation/ContractValidator';

const validator = new ContractValidator();
```

#### Validating Input

```typescript
const violations = validator.validateInput(
  orderContract,
  [order]
);

if (violations.length > 0) {
  console.error('Input validation failed:', violations);
}
```

#### Validating Output

```typescript
const violations = validator.validateOutput(
  orderContract,
  result
);

if (violations.length > 0) {
  console.error('Output validation failed:', violations);
}
```

### ContractViolation Interface

```typescript
interface ContractViolation {
  type: 'type-mismatch' | 'missing-property' | 'constraint-violation' | 'unknown';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  path: string;                      // JSON path to violation
  expected?: any;
  actual?: any;
  constraint?: string;
}
```

## Logging

### ThreadLogger

Log execution traces to persistent storage.

#### Creating a Logger

```typescript
import { ThreadLogger } from '@agent-brain/core/domains/threading/logging/ThreadLogger';
import { JsonlFileWriter } from 'packages/vscode/src/services/threading/JsonlFileWriter';

const fileWriter = new JsonlFileWriter({
  workspacePath: '/path/to/workspace',
  bufferSize: 100,
  flushIntervalMs: 5000
});

const logger = new ThreadLogger(fileWriter);
```

#### Starting a Session

```typescript
logger.startSession({
  id: 'session-123',
  name: 'Order Processing Test',
  startTime: Date.now(),
  endTime: 0,
  traceCount: 0
});
```

#### Logging Traces

```typescript
await logger.log(executionTrace);
```

#### Ending a Session

```typescript
await logger.endSession();
```

#### Closing the Logger

```typescript
await logger.close();
```

### FileWriter Interface

```typescript
interface FileWriter {
  writeLines(lines: string[]): Promise<void>;
  close(): Promise<void>;
}
```

## Message Protocol

### Webview ↔ Extension Messages

#### Threading State Request

**From Webview**:
```typescript
{
  type: 'threading:get-state',
  payload: {}
}
```

**To Webview**:
```typescript
{
  type: 'threading:state',
  payload: {
    enabled: boolean;
    mode: 'disabled' | 'development' | 'debugging' | 'learning';
    activeThreads: string[];
    sessionActive: boolean;
    multiTierEnabled: boolean;
    detectedLevel: number;
    targetLevel: number;
    showLevelSelector: boolean;
  }
}
```

#### Toggle Threading

**From Webview**:
```typescript
{
  type: 'threading:toggle',
  payload: {
    enable: boolean
  }
}
```

**Response**: Same as state response

#### Start Session

**From Webview**:
```typescript
{
  type: 'threading:start-session',
  payload: {}
}
```

**To Webview**:
```typescript
{
  type: 'threading:session-started',
  payload: {
    sessionId: string
  }
}
```

#### End Session

**From Webview**:
```typescript
{
  type: 'threading:end-session',
  payload: {}
}
```

**To Webview**:
```typescript
{
  type: 'threading:session-ended',
  payload: {}
}
```

#### Request Analysis

**From Webview**:
```typescript
{
  type: 'threading:analyze',
  payload: {}
}
```

**To Webview**:
```typescript
{
  type: 'threading:analysis-data',
  payload: {
    patterns: DetectedPattern[];
    insights: AnalysisInsight[];
    recommendations: Recommendation[];
    bottlenecks: Bottleneck[];
    summary: string;
  }
}
```

#### Request Timeline Data

**From Webview**:
```typescript
{
  type: 'threading:get-timeline-data',
  payload: {}
}
```

**To Webview**:
```typescript
{
  type: 'threading:timeline-data',
  payload: {
    events: ThreadingTimelineEvent[];
    timeRange?: {
      start: number;
      end: number;
    }
  }
}
```

### Analysis Data Types

#### DetectedPattern

```typescript
interface DetectedPattern {
  type: string;
  name: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;                // 0.0 to 1.0
  affectedFunctions: string[];
  evidence: Record<string, any>;
}
```

#### AnalysisInsight

```typescript
interface AnalysisInsight {
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: 'performance' | 'error' | 'memory' | 'cache' | 'architecture';
  rootCause: string;
  relatedPatterns: string[];
}
```

#### Recommendation

```typescript
interface Recommendation {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  effort: 'low' | 'medium' | 'high';
  steps: string[];
}
```

## Examples

### Example 1: Basic Function Monitoring

```typescript
import { ThreadSpec } from '@agent-brain/core/domains/threading/decorators/ThreadSpec';
import { DataContract } from '@agent-brain/core/domains/threading/contracts/DataContract';

class Calculator {
  @ThreadSpec({
    thread: 'MATH',
    contract: new DataContract({
      input: {
        type: 'array',
        items: { type: 'number' },
        minItems: 1
      },
      output: {
        type: 'number'
      }
    })
  })
  sum(numbers: number[]): number {
    return numbers.reduce((a, b) => a + b, 0);
  }
}

const calc = new Calculator();
const result = calc.sum([1, 2, 3, 4, 5]);  // Monitored
```

### Example 2: Custom Analysis

```typescript
import { getGlobalDataCorrectnessConfig } from '@agent-brain/core/domains/threading/config/DataCorrectnessConfig';

// Get execution traces
const traces = getExecutionTraces();  // Your implementation

// Analyze for specific pattern
const slowFunctions = traces
  .filter(t => t.exit && t.exit.duration > 1000)
  .map(t => ({
    function: t.context,
    duration: t.exit!.duration
  }))
  .sort((a, b) => b.duration - a.duration);

console.log('Slow functions:', slowFunctions);
```

### Example 3: Programmatic Configuration

```typescript
import {
  setGlobalDataCorrectnessConfig,
  getGlobalDataCorrectnessConfig
} from '@agent-brain/core/domains/threading/config/DataCorrectnessConfig';

// Custom config for specific scenario
const customConfig = {
  ...getGlobalDataCorrectnessConfig(),
  validation: {
    enabled: true,
    failOnViolations: true,
    failOnSeverity: 'warning'
  },
  tracking: {
    captureEntry: true,
    captureExit: true,
    captureTransformations: false,
    captureMutations: false,
    captureSnapshots: false
  }
};

// Apply temporarily
setGlobalDataCorrectnessConfig(customConfig);

// Run critical code
await runCriticalOperation();

// Restore previous config
setGlobalDataCorrectnessConfig(previousConfig);
```

---

**Next Steps**: [User Guide](./THREADING_USER_GUIDE.md) | [Architecture](./THREADING_ARCHITECTURE.md)
