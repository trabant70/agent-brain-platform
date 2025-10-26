# Level 4: Full Decorators

## Objective

Implement comprehensive threading system using TypeScript decorators (`@ThreadSpec`) with automatic logging, performance tracking, memory analysis, and full integration with the analysis pipeline. This is the most powerful and type-safe level.

## Approach

### Step 1: Enable TypeScript Decorators
Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

### Step 2: Apply @ThreadSpec Decorator
Replace manual threading with declarative decorators:

**Before (Level 1/2/3)**:
```typescript
async function fetchUserProfile(userId: string) {
  return ThreadContext.runAsync('DATA_FLOW', async () => {
    console.log('[THREAD:DATA_FLOW] Fetching user', userId);
    const user = await api.getUser(userId);
    return user;
  });
}
```

**After (Level 4)**:
```typescript
@ThreadSpec({
  threads: ['DATA_FLOW'],
  timing: { min: 10, max: 200 },
  autoLog: true
})
async function fetchUserProfile(userId: string): Promise<User> {
  const user = await api.getUser(userId);
  return user; // Logging automatic, timing tracked
}
```

### Step 3: Configure Threading Options
Comprehensive configuration per function:

```typescript
@ThreadSpec({
  threads: ['CACHE', 'DATA_FLOW'],
  timing: {
    min: 5,      // Warn if < 5ms
    max: 100,    // Warn if > 100ms
    target: 50   // Optimal timing
  },
  autoLog: true,           // Automatic entry/exit logging
  logArguments: false,     // Don't log sensitive args
  logResult: false,        // Don't log return value
  trackMemory: true,       // Track memory allocations
  trackCalls: true,        // Count invocations
  enabled: true            // Can disable at runtime
})
async function cacheableDataFetch(key: string): Promise<Data> {
  // Implementation
}
```

### Step 4: Integration with Analysis Pipeline
Decorators automatically feed into analysis:
- Real-time performance monitoring
- Memory leak detection
- Thread pattern analysis
- Automated insights and recommendations
- Timeline visualization with accurate timing

## Examples

### Example 1: Simple Decorator
```typescript
import { ThreadSpec } from '@agent-brain/core/threading';

/**
 * Fetches user data from API
 */
@ThreadSpec({
  threads: ['DATA_FLOW']
})
async function fetchUser(userId: string): Promise<User> {
  const response = await fetch(`/api/users/${userId}`);
  return response.json();
}

// Automatic logging:
// [THREAD:DATA_FLOW] → fetchUser(userId="123") [0ms]
// [THREAD:DATA_FLOW] ← fetchUser → User {id: 123} [145ms]
```

### Example 2: Performance-Critical Function
```typescript
@ThreadSpec({
  threads: ['PERFORMANCE'],
  timing: {
    max: 50,     // Warn if slower than 50ms
    target: 10   // Optimal: 10ms
  },
  trackMemory: true,
  autoLog: true
})
function computeExpensiveOperation(data: number[]): number {
  // Performance tracked automatically
  return data.reduce((acc, val) => acc + val * Math.sqrt(val), 0);
}

// Automatic warnings if timing exceeded:
// ⚠️ [PERFORMANCE] computeExpensiveOperation exceeded max timing: 75ms > 50ms
```

### Example 3: Multi-Thread Operation
```typescript
@ThreadSpec({
  threads: ['VALIDATION', 'DATA_FLOW', 'CACHE'],
  timing: { max: 200 },
  autoLog: true,
  logArguments: false // Don't log sensitive data
})
async function processUserOrder(order: Order): Promise<OrderResult> {
  // Validation thread
  if (!validateOrder(order)) {
    throw new Error('Invalid order');
  }

  // Data flow thread
  const inventory = await fetchInventory(order.items);

  // Cache thread
  await updateCache('inventory', inventory);

  return { success: true, orderId: order.id };
}

// System automatically logs thread transitions:
// [THREAD:VALIDATION] → processUserOrder [0ms]
// [THREAD:DATA_FLOW] → fetchInventory [25ms]
// [THREAD:CACHE] → updateCache [45ms]
// [THREAD:VALIDATION] ← processUserOrder [150ms]
```

### Example 4: Class-Level Decoration
```typescript
/**
 * Cache service with automatic threading
 */
@ThreadSpec({
  threads: ['CACHE'],
  autoLog: true,
  trackCalls: true
})
class CacheService {
  private store = new Map<string, any>();

  get(key: string): any | null {
    return this.store.get(key) || null;
    // Auto-logged: [THREAD:CACHE] → CacheService.get(key="user:123")
  }

  set(key: string, value: any): void {
    this.store.set(key, value);
    // Auto-logged: [THREAD:CACHE] → CacheService.set(key="user:123")
  }

  invalidate(key: string): void {
    this.store.delete(key);
    // Auto-logged: [THREAD:CACHE] → CacheService.invalidate(key="user:123")
  }
}

// Call tracking automatically maintained:
// CacheService.get: 1,245 calls, avg 2ms
// CacheService.set: 432 calls, avg 3ms
// CacheService.invalidate: 15 calls, avg 1ms
```

### Example 5: Method-Specific Overrides
```typescript
@ThreadSpec({
  threads: ['DATA_FLOW'],
  autoLog: true
})
class UserRepository {
  /**
   * Inherits class-level threading
   */
  async getById(id: string): Promise<User> {
    return api.getUser(id);
  }

  /**
   * Override for this method
   */
  @ThreadSpec({
    threads: ['CACHE'], // Override to CACHE thread
    timing: { max: 10 },
    trackMemory: true
  })
  async getFromCache(id: string): Promise<User | null> {
    return cache.get(`user:${id}`);
  }

  /**
   * Multi-thread method
   */
  @ThreadSpec({
    threads: ['CACHE', 'DATA_FLOW'],
    timing: { max: 150 }
  })
  async getWithCache(id: string): Promise<User> {
    const cached = await this.getFromCache(id); // CACHE thread
    if (cached) return cached;
    return this.getById(id); // DATA_FLOW thread
  }
}
```

### Example 6: Conditional Threading
```typescript
@ThreadSpec({
  threads: ['VALIDATION'],
  enabled: process.env.NODE_ENV === 'development', // Only in dev
  autoLog: true
})
function validateUserInput(input: any): boolean {
  // Validation logic
  return input.email && input.email.includes('@');
}

// In production: Decorator is no-op (zero overhead)
// In development: Full logging and tracking
```

### Example 7: Error Handling with Threading
```typescript
@ThreadSpec({
  threads: ['DATA_FLOW', 'ERROR_RECOVERY'],
  timing: { max: 300 },
  autoLog: true,
  trackErrors: true
})
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await delay(1000 * attempt);
    }
  }
  throw new Error('Max retries exceeded');
}

// Automatic error tracking:
// [THREAD:ERROR_RECOVERY] Retry attempt 1 failed
// [THREAD:ERROR_RECOVERY] Retry attempt 2 failed
// [THREAD:DATA_FLOW] ← fetchWithRetry [2,450ms] ✓
```

### Example 8: Memory Leak Detection
```typescript
@ThreadSpec({
  threads: ['CACHE'],
  trackMemory: true,
  memoryThreshold: 10 * 1024 * 1024 // 10MB
})
class LargeDataCache {
  private cache = new Map<string, Buffer>();

  set(key: string, data: Buffer): void {
    this.cache.set(key, data);
    // Automatic warning if memory exceeds threshold:
    // ⚠️ [CACHE] LargeDataCache.set memory usage: 12.5MB > 10MB
  }
}
```

## Validation Rules

### Success Criteria
- ✅ TypeScript `experimentalDecorators` enabled
- ✅ @ThreadSpec decorator compiles without errors
- ✅ Automatic logging works as expected
- ✅ Performance tracking captures accurate timing
- ✅ Memory tracking detects allocations
- ✅ Analysis pipeline receives decorator metadata
- ✅ Timeline visualization shows decorated functions

### Quality Criteria
- 🎯 Decorator coverage: 80-95% of thread-relevant functions
- 🎯 Type safety: Full TypeScript type checking
- 🎯 Performance overhead: <5% in production
- 🎯 Accuracy: Timing accurate to ±1ms
- 🎯 Memory tracking: Captures 90%+ allocations

### Compilation Validation
```typescript
// ✅ Good: Valid decorator
@ThreadSpec({
  threads: ['DATA_FLOW'],
  timing: { max: 100 }
})
async function fetchData(): Promise<Data> {}

// ❌ Error: Invalid configuration
@ThreadSpec({
  threads: ['DATA_FLOW'],
  timing: { max: -1 } // Negative timing
})
async function fetchData(): Promise<Data> {}

// ❌ Error: Decorator on invalid target
@ThreadSpec({
  threads: ['DATA_FLOW']
})
const myVariable = 42; // Can't decorate variables
```

## Acceptable Fallbacks

### If Decorators Not Supported
**Fallback**: Use Level 3 (ThreadContext) or higher-order functions

```typescript
// Instead of decorator
const fetchData = withThreadSpec(
  { threads: ['DATA_FLOW'], timing: { max: 100 } },
  async () => {
    // Implementation
  }
);
```

### If Performance Overhead Too High
**Fallback**: Disable in production, enable in development

```typescript
const THREADING_ENABLED = process.env.NODE_ENV !== 'production';

@ThreadSpec({
  threads: ['DATA_FLOW'],
  enabled: THREADING_ENABLED
})
async function fetchData() {}
```

### If Build Tooling Issues
**Fallback**: Use Babel plugin or webpack loader

```javascript
// babel.config.js
plugins: [
  ['@babel/plugin-proposal-decorators', { legacy: true }]
]
```

## Partial Implementation Strategy

### Minimum Viable (30% Coverage)
1. Enable decorators in TypeScript
2. Decorate 5-10 critical functions
3. Verify automatic logging works
4. Check timeline visualization

**Time Estimate**: 4-8 hours

### Recommended Target (70% Coverage)
1. Decorate all public API functions
2. Decorate performance-critical paths
3. Configure timing thresholds
4. Enable memory tracking for large operations
5. Integrate with analysis pipeline

**Time Estimate**: 3-5 days

### Comprehensive (90% Coverage)
1. All thread-relevant functions decorated
2. Class-level and method-level decoration
3. Custom timing/memory thresholds per function
4. Automated CI checks for coverage
5. Full integration with monitoring

**Time Estimate**: 1-2 weeks

## Benefits of Level 4

1. **Type Safety**: Full TypeScript type checking
2. **Zero Boilerplate**: Declarative, no manual logging
3. **Automatic Instrumentation**: Logging, timing, memory tracking
4. **Comprehensive Analysis**: Full integration with analysis pipeline
5. **IDE Support**: Autocomplete, refactoring, validation
6. **Performance**: Optimized decorator implementation (<5% overhead)
7. **Error Tracking**: Automatic error capture and analysis
8. **Memory Profiling**: Detect leaks and excessive allocations
9. **Call Tracking**: Automatic invocation counting
10. **Production Ready**: Can be disabled for zero overhead

## Limitations of Level 4

1. **Build Tooling**: Requires TypeScript with decorators enabled
2. **Learning Curve**: Team must understand decorators
3. **Experimental**: TypeScript decorators still experimental
4. **Framework Lock-in**: Tied to TypeScript ecosystem
5. **Debugging**: Decorator stack traces can be confusing
6. **Compilation Time**: Slight increase in build time

## When to Stay at Level 4

- Using TypeScript
- Team comfortable with decorators
- Need comprehensive analysis
- Production deployment requires performance monitoring
- Want type-safe threading system

## When to Consider Alternatives

- Pure JavaScript project (use Level 3)
- Experimental decorators not acceptable (use Level 3)
- Simple use cases (Level 1/2 may suffice)
- Build tooling constraints

## Agent Instructions (For AI Code Assistants)

If you are an AI agent working at Level 4:

### When Writing New Functions
```typescript
@ThreadSpec({
  threads: ['THREAD_NAME'],
  timing: { max: 100 }, // Reasonable default
  autoLog: true
})
async function myFunction(param: string): Promise<Result> {
  // Implementation
  // No manual logging needed
}
```

### When Adding Performance Constraints
```typescript
@ThreadSpec({
  threads: ['PERFORMANCE'],
  timing: {
    min: 1,      // Too fast might indicate cached/skipped
    max: 50,     // Must be fast
    target: 10   // Optimal performance
  },
  trackMemory: true
})
function criticalOperation() {}
```

### When Working with Classes
```typescript
// Class-level for shared config
@ThreadSpec({
  threads: ['DATA_FLOW'],
  autoLog: true
})
class DataService {
  // Methods inherit class-level config

  // Override for specific method
  @ThreadSpec({
    threads: ['CACHE'],
    timing: { max: 10 }
  })
  getCached() {}
}
```

### Code Review Checklist
- [ ] All thread-relevant functions decorated
- [ ] Timing thresholds appropriate
- [ ] Sensitive data not logged (logArguments: false)
- [ ] Memory tracking for large operations
- [ ] Production-ready configuration

## Migration Guide: Level 3 → Level 4

### Step-by-Step Migration

1. **Enable Decorators** (15 minutes)
   ```json
   // tsconfig.json
   {
     "compilerOptions": {
       "experimentalDecorators": true,
       "emitDecoratorMetadata": true
     }
   }
   ```

2. **Install Threading Package** (5 minutes)
   ```bash
   npm install @agent-brain/core
   ```

3. **Replace ThreadContext with Decorators** (4-8 hours)
   **Before**:
   ```typescript
   async function fetchData() {
     return ThreadContext.runAsync('DATA_FLOW', async () => {
       console.log('Fetching...');
       return await api.getData();
     });
   }
   ```

   **After**:
   ```typescript
   @ThreadSpec({
     threads: ['DATA_FLOW'],
     autoLog: true
   })
   async function fetchData() {
     return await api.getData(); // Logging automatic
   }
   ```

4. **Add Timing Constraints** (2-4 hours)
   - Identify performance-critical functions
   - Add timing configuration
   - Run tests to verify thresholds

5. **Enable Memory Tracking** (1-2 hours)
   - Add to large-data operations
   - Set memory thresholds
   - Test memory warnings work

6. **Integrate with Analysis** (2-4 hours)
   - Configure analysis pipeline
   - Verify timeline visualization
   - Test recommendations generation

7. **Testing** (4-8 hours)
   - Unit tests for decorated functions
   - Performance benchmarks
   - Memory leak tests
   - Integration tests

**Total Time**: 2-3 weeks for large codebase

## Technical Details

### Decorator Implementation
```typescript
export function ThreadSpec(config: ThreadSpecConfig) {
  return function (
    target: any,
    propertyKey?: string,
    descriptor?: PropertyDescriptor
  ) {
    if (descriptor) {
      // Method decorator
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const startTime = performance.now();
        const startMemory = process.memoryUsage().heapUsed;

        try {
          if (config.autoLog) {
            log(`→ ${propertyKey}`, args);
          }

          const result = await originalMethod.apply(this, args);

          const endTime = performance.now();
          const duration = endTime - startTime;
          const memory = process.memoryUsage().heapUsed - startMemory;

          // Timing validation
          if (config.timing?.max && duration > config.timing.max) {
            warn(`${propertyKey} exceeded max timing: ${duration}ms > ${config.timing.max}ms`);
          }

          // Memory validation
          if (config.trackMemory && config.memoryThreshold && memory > config.memoryThreshold) {
            warn(`${propertyKey} exceeded memory threshold: ${memory} > ${config.memoryThreshold}`);
          }

          if (config.autoLog) {
            log(`← ${propertyKey} [${duration.toFixed(2)}ms]`, result);
          }

          // Send to analysis pipeline
          trackExecution({
            thread: config.threads[0],
            function: propertyKey,
            duration,
            memory,
            timestamp: Date.now()
          });

          return result;
        } catch (error) {
          if (config.trackErrors) {
            trackError({
              thread: config.threads[0],
              function: propertyKey,
              error: error.message
            });
          }
          throw error;
        }
      };

      return descriptor;
    }
    // Class decorator implementation...
  };
}
```

### Performance Impact
- **Overhead (enabled)**: 2-5ms per decorated function call
- **Overhead (disabled)**: 0ms (no-op)
- **Memory**: ~50KB for decorator metadata
- **Build time**: +10-20% (decorator compilation)

### Configuration Options
```typescript
interface ThreadSpecConfig {
  threads: string[];                    // Thread names
  timing?: {
    min?: number;                       // Minimum expected time (ms)
    max?: number;                       // Maximum allowed time (ms)
    target?: number;                    // Optimal time (ms)
  };
  autoLog?: boolean;                    // Automatic entry/exit logging
  logArguments?: boolean;               // Log function arguments
  logResult?: boolean;                  // Log return value
  trackMemory?: boolean;                // Track memory allocations
  trackCalls?: boolean;                 // Count invocations
  trackErrors?: boolean;                // Track error occurrences
  memoryThreshold?: number;             // Warn if exceeded (bytes)
  enabled?: boolean;                    // Runtime enable/disable
}
```

---

**Previous Level**: [Level 3: ThreadContext API](./level-3-context.template.md)

**This is the highest maturity level**. For most projects, Level 4 provides comprehensive threading capabilities with excellent developer experience.
