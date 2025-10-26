# Data Correctness Extension - Usage Examples

Complete, runnable examples demonstrating the Data Correctness Extension.

## Example 1: Basic Input/Output Validation

```typescript
import {
  ThreadSpec,
  ThreadLogDecorator,
  createType,
  createShape
} from '@agent-brain/core/threading';

// Define contract with input and output validation
@ThreadSpec({
  threads: ['USER_MANAGEMENT'],
  expects: {
    params: {
      'userId': {
        type: createType('string'),
        constraints: {
          minLength: 3,
          maxLength: 50,
          pattern: /^[a-z0-9-]+$/
        }
      }
    }
  },
  produces: {
    type: {
      type: createType('object'),
      shape: createShape({
        id: { type: createType('string'), required: true },
        name: { type: createType('string'), required: true },
        email: { type: createType('string'), required: false }
      })
    }
  }
})
@ThreadLogDecorator('USER_MANAGEMENT')
async function getUser(userId: string) {
  // Fetch user from database
  return {
    id: userId,
    name: 'John Doe',
    email: 'john@example.com'
  };
}

// Usage
const user = await getUser('user-123');  // ✅ Valid
const invalid = await getUser('AB');     // ❌ Violation: too short
const invalid2 = await getUser('User@'); // ❌ Violation: invalid pattern
```

## Example 2: Preconditions and Postconditions

```typescript
import { ThreadSpec, ThreadLogDecorator, createType } from '@agent-brain/core/threading';

@ThreadSpec({
  threads: ['ARRAY_PROCESSING'],
  expects: {
    params: {
      'numbers': {
        type: createType('array', { generic: createType('number') }),
        constraints: { minItems: 1 }
      }
    },
    preconditions: [
      'args[0].length > 0',
      'args[0].every(n => typeof n === "number")'
    ]
  },
  produces: {
    type: createType('number'),
    postconditions: [
      'result >= 0',
      'result <= 100'
    ]
  }
})
@ThreadLogDecorator('ARRAY_PROCESSING')
async function calculatePercentage(numbers: number[]) {
  const sum = numbers.reduce((a, b) => a + b, 0);
  const avg = sum / numbers.length;
  return Math.min(100, Math.max(0, avg));
}

// Usage
const result1 = await calculatePercentage([10, 20, 30]); // ✅ Valid
const result2 = await calculatePercentage([]);           // ❌ Violation: empty array
```

## Example 3: Invariants and State Validation

```typescript
import { ThreadSpec, ThreadLogDecorator, createType } from '@agent-brain/core/threading';

class Counter {
  private count: number = 0;
  private max: number = 100;

  @ThreadSpec({
    threads: ['STATE_MANAGEMENT'],
    expects: {
      params: {
        'amount': {
          type: createType('number'),
          constraints: { min: 0 }
        }
      }
    },
    invariants: [
      'this.count >= 0',
      'this.count <= this.max'
    ]
  })
  @ThreadLogDecorator('STATE_MANAGEMENT')
  async increment(amount: number) {
    this.count += amount;
    if (this.count > this.max) {
      this.count = this.max; // Enforce invariant
    }
    return this.count;
  }
}

// Usage
const counter = new Counter();
await counter.increment(10);   // ✅ count = 10
await counter.increment(95);   // ✅ count = 100 (capped)
```

## Example 4: Union Types and Literals

```typescript
import {
  ThreadSpec,
  ThreadLogDecorator,
  createUnion,
  createLiteral,
  createType
} from '@agent-brain/core/threading';

type Status = 'pending' | 'active' | 'completed' | 'cancelled';

@ThreadSpec({
  threads: ['ORDER_PROCESSING'],
  expects: {
    params: {
      'orderId': {
        type: createType('string')
      },
      'status': {
        type: createUnion(
          createLiteral('pending'),
          createLiteral('active'),
          createLiteral('completed'),
          createLiteral('cancelled')
        )
      }
    }
  },
  produces: {
    type: {
      type: createType('object'),
      shape: createShape({
        orderId: { type: createType('string'), required: true },
        status: {
          type: createUnion(
            createLiteral('pending'),
            createLiteral('active'),
            createLiteral('completed'),
            createLiteral('cancelled')
          ),
          required: true
        },
        updatedAt: { type: createType('number'), required: true }
      })
    }
  }
})
@ThreadLogDecorator('ORDER_PROCESSING')
async function updateOrderStatus(orderId: string, status: Status) {
  return {
    orderId,
    status,
    updatedAt: Date.now()
  };
}

// Usage
await updateOrderStatus('order-1', 'active');     // ✅ Valid
await updateOrderStatus('order-1', 'invalid' as Status); // ❌ Violation: invalid literal
```

## Example 5: Nested Object Validation

```typescript
import { ThreadSpec, ThreadLogDecorator, createType, createShape } from '@agent-brain/core/threading';

@ThreadSpec({
  threads: ['USER_REGISTRATION'],
  expects: {
    params: {
      'userData': {
        type: createType('object'),
        shape: createShape({
          username: {
            type: createType('string'),
            required: true,
            constraints: { minLength: 3, maxLength: 20 }
          },
          email: {
            type: createType('string'),
            required: true,
            constraints: {
              pattern: /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i
            }
          },
          profile: {
            type: createType('object'),
            required: false,
            shape: createShape({
              firstName: { type: createType('string'), required: true },
              lastName: { type: createType('string'), required: true },
              age: {
                type: createType('number'),
                required: false,
                constraints: { min: 13, max: 120 }
              }
            })
          }
        })
      }
    }
  }
})
@ThreadLogDecorator('USER_REGISTRATION')
async function registerUser(userData: any) {
  // Save user to database
  return { id: generateId(), ...userData };
}

// Usage
await registerUser({
  username: 'john_doe',
  email: 'john@example.com',
  profile: {
    firstName: 'John',
    lastName: 'Doe',
    age: 30
  }
}); // ✅ Valid

await registerUser({
  username: 'ab',  // ❌ Too short
  email: 'invalid-email',  // ❌ Invalid pattern
  profile: {
    firstName: 'John'
    // ❌ Missing required lastName
  }
});
```

## Example 6: Data Transformation Tracking

```typescript
import { ThreadSpec, ThreadLogDecorator, createType } from '@agent-brain/core/threading';

@ThreadSpec({
  threads: ['DATA_TRANSFORMATION'],
  dataFlow: {
    nodes: [
      { id: 'input', type: 'input', label: 'Raw Data' },
      { id: 'parse', type: 'transformation', label: 'Parse JSON' },
      { id: 'validate', type: 'validation', label: 'Validate Schema' },
      { id: 'transform', type: 'transformation', label: 'Transform Fields' },
      { id: 'output', type: 'output', label: 'Clean Data' }
    ],
    edges: [
      { from: 'input', to: 'parse', label: 'raw' },
      { from: 'parse', to: 'validate', label: 'parsed' },
      { from: 'validate', to: 'transform', label: 'validated' },
      { from: 'transform', to: 'output', label: 'transformed' }
    ]
  }
})
@ThreadLogDecorator('DATA_TRANSFORMATION')
async function processData(rawData: string) {
  // Parse
  const parsed = JSON.parse(rawData);

  // Validate
  if (!parsed.id || !parsed.name) {
    throw new Error('Invalid schema');
  }

  // Transform
  const transformed = {
    id: parsed.id.toUpperCase(),
    name: parsed.name.trim(),
    timestamp: Date.now()
  };

  return transformed;
}

// The system automatically tracks:
// - Input: rawData
// - Transformation 1: raw → parsed
// - Transformation 2: parsed → validated
// - Transformation 3: validated → transformed
// - Output: transformed
```

## Example 7: Configuration and Privacy

```typescript
import {
  setGlobalDataCorrectnessConfig,
  ThreadSpec,
  ThreadLogDecorator,
  createType,
  createShape
} from '@agent-brain/core/threading';

// Configure privacy settings
setGlobalDataCorrectnessConfig({
  privacy: {
    enabled: true,
    redactionPatterns: [
      /password/i,
      /token/i,
      /secret/i,
      /ssn/i,
      /credit.*card/i
    ],
    maxStringLength: 500,
    maxArrayLength: 50,
    maxDepth: 5
  }
});

@ThreadSpec({
  threads: ['AUTHENTICATION'],
  expects: {
    params: {
      'credentials': {
        type: createType('object'),
        shape: createShape({
          username: { type: createType('string'), required: true },
          password: { type: createType('string'), required: true },  // Will be redacted
          apiToken: { type: createType('string'), required: false }  // Will be redacted
        })
      }
    }
  }
})
@ThreadLogDecorator('AUTHENTICATION')
async function authenticate(credentials: any) {
  // Authenticate user
  // In logs, password and apiToken will show as [REDACTED]
  return { success: true, token: generateToken() };
}
```

## Example 8: Debug Reports and Fix Suggestions

```typescript
import {
  ThreadSpec,
  ThreadLogDecorator,
  createType,
  generateDebugReport,
  suggestFixes
} from '@agent-brain/core/threading';

@ThreadSpec({
  threads: ['MATH'],
  expects: {
    params: {
      'value': {
        type: createType('number'),
        constraints: { min: 0, max: 100 }
      }
    }
  },
  produces: {
    type: createType('number'),
    postconditions: ['result >= 0']
  }
})
@ThreadLogDecorator('MATH')
async function calculateSquare(value: number) {
  return value * value;
}

// Trigger violation
try {
  await calculateSquare(150);  // Violates max: 100 constraint
} catch (error) {
  // Get execution trace from logs
  const trace = getLastExecutionTrace();

  // Generate debug report
  const report = generateDebugReport(trace);

  console.log('=== Debug Report ===');
  console.log(report.summary);

  console.log('\n=== Violations ===');
  report.violations.forEach((v, i) => {
    console.log(`${i + 1}. ${v.violation.message}`);
    console.log(`   Explanation: ${v.explanation}`);
    console.log(`   Impact: ${v.impact}`);
    console.log(`   How to fix:`);
    v.howToFix.forEach(step => console.log(`   - ${step}`));
  });

  console.log('\n=== Fix Suggestions ===');
  const suggestions = suggestFixes(trace.violations);
  suggestions.forEach((s, i) => {
    console.log(`${i + 1}. ${s.description}`);
    console.log(`   ${s.explanation}`);
    if (s.codeSnippet) {
      console.log(`\n   ${s.codeSnippet}\n`);
    }
  });

  console.log('\n=== Code Examples ===');
  report.examples.forEach((ex, i) => {
    console.log(`${i + 1}. ${ex.title}`);
    console.log(`   ${ex.description}`);
    console.log(`\n\`\`\`${ex.language}`);
    console.log(ex.code);
    console.log('```\n');
  });

  console.log('\n=== Key Learnings ===');
  report.learnings.forEach(learning => {
    console.log(`📚 ${learning}`);
  });

  console.log('\n=== Next Steps ===');
  report.nextSteps.forEach(step => {
    console.log(step);
  });
}
```

## Example 9: Visualization

```typescript
import {
  ThreadLogDecorator,
  visualizeTrace,
  renderViolations,
  DataFlowVisualizer
} from '@agent-brain/core/threading';

@ThreadLogDecorator('DATA_PIPELINE')
async function processPipeline(data: any) {
  const step1 = await cleanData(data);
  const step2 = await validateData(step1);
  const step3 = await enrichData(step2);
  return step3;
}

// After execution
const trace = getLastExecutionTrace();

// Generate Mermaid diagram
const mermaid = visualizeTrace(trace, {
  format: 'mermaid',
  includeDataFlow: true
});

console.log(mermaid);
// Output:
// ```mermaid
// graph TD
//   input["Raw Data"]
//   clean[["Clean Data"]]
//   validate{Validate}
//   enrich[["Enrich Data"]]
//   output(["Processed Data"])
//
//   input --> clean
//   clean --> validate
//   validate --> enrich
//   enrich --> output
// ```

// Render violations as HTML
if (trace.violations.length > 0) {
  const html = renderViolations(trace.violations, {
    format: 'html',
    includeStyles: true
  });

  // Display in webview or save to file
  saveToFile('violations.html', html);
}

// Render as Markdown for docs
const markdown = renderViolations(trace.violations, {
  format: 'markdown'
});

console.log(markdown);
```

## Example 10: Testing with Strict Validation

```typescript
import {
  setGlobalDataCorrectnessConfig,
  TESTING_CONFIG,
  ThreadSpec,
  ThreadLogDecorator,
  createType
} from '@agent-brain/core/threading';

describe('User Service', () => {
  beforeAll(() => {
    // Enable strict validation for tests
    setGlobalDataCorrectnessConfig(TESTING_CONFIG);
  });

  it('should validate user creation', async () => {
    @ThreadSpec({
      threads: ['USER_SERVICE'],
      expects: {
        params: {
          'username': {
            type: createType('string'),
            constraints: { minLength: 3 }
          }
        }
      },
      produces: {
        type: createType('object'),
        postconditions: ['result.id !== undefined']
      }
    })
    @ThreadLogDecorator('USER_SERVICE')
    async function createUser(username: string) {
      return { id: generateId(), username };
    }

    // This will fail the test if violations occur
    const user = await createUser('john');
    expect(user.id).toBeDefined();
  });

  it('should reject invalid input', async () => {
    // With TESTING_CONFIG, this will throw
    await expect(createUser('ab')).rejects.toThrow();
  });
});
```

## Example 11: Production Monitoring with Sampling

```typescript
import {
  setGlobalDataCorrectnessConfig,
  PRODUCTION_CONFIG,
  ThreadLogDecorator
} from '@agent-brain/core/threading';

// Configure for production: minimal overhead, sampled capture
setGlobalDataCorrectnessConfig({
  ...PRODUCTION_CONFIG,
  capture: {
    mode: 'sampled',
    samplingRate: 0.01,  // 1% sampling
    captureArgs: true,
    captureReturnValues: true,
    captureMutations: false,
    captureTransformations: false
  },
  validation: {
    enabled: true,
    failOnViolations: false,  // Don't break production
    failOnSeverity: 'critical'
  }
});

@ThreadLogDecorator('HIGH_THROUGHPUT_API')
async function processRequest(request: any) {
  // Only 1% of executions will be fully tracked
  // Violations are logged but don't throw
  return handleRequest(request);
}
```

## Example 12: Migration from Legacy IOShape

```typescript
// Before: Legacy IOShape
@ThreadSpec({
  threads: ['LEGACY'],
  input: {
    params: {
      userId: { type: 'string' }
    }
  },
  output: {
    type: 'object'
  }
})

// After: Enhanced contracts (both can coexist)
@ThreadSpec({
  threads: ['ENHANCED'],
  expects: {
    params: {
      'userId': {
        type: createType('string'),
        constraints: {
          minLength: 3,
          pattern: /^[a-z0-9-]+$/
        }
      }
    },
    preconditions: ['args[0].length > 0']
  },
  produces: {
    type: createType('object'),
    shape: createShape({
      id: { type: createType('string'), required: true },
      name: { type: createType('string'), required: true }
    }),
    postconditions: ['result.id === args[0]']
  }
})
```

## Running the Examples

All examples are fully typed and can be run directly:

```bash
# Install dependencies
npm install

# Run examples
npm run example:basic
npm run example:validation
npm run example:privacy
npm run example:debugging
npm run example:visualization

# Run with specific configuration
NODE_ENV=development npm run example:basic  # Development mode
NODE_ENV=production npm run example:basic   # Production mode
NODE_ENV=test npm run example:basic         # Testing mode
```

## Next Steps

- See [Quick Start Guide](./quick-start-guide.md) for setup instructions
- See [API Reference](./api-reference.md) for complete API documentation
- See [Migration Guide](./migration-guide.md) for migrating from legacy IOShape
