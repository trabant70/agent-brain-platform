# Level 3: ThreadContext API

## Objective

Enable runtime thread management using the `ThreadContext` API pattern. This provides dynamic thread assignment, nested contexts, runtime enable/disable, and programmatic control without requiring decorators or build tooling.

## Approach

### Step 1: Install/Implement ThreadContext
If not already available, implement the ThreadContext pattern:

```typescript
// Simple ThreadContext implementation
class ThreadContext {
  private static stack: string[] = [];

  static run<T>(threadName: string, fn: () => T): T {
    this.stack.push(threadName);
    try {
      return fn();
    } finally {
      this.stack.pop();
    }
  }

  static async runAsync<T>(threadName: string, fn: () => Promise<T>): Promise<T> {
    this.stack.push(threadName);
    try {
      return await fn();
    } finally {
      this.stack.pop();
    }
  }

  static getCurrent(): string | undefined {
    return this.stack[this.stack.length - 1];
  }
}
```

### Step 2: Wrap Operations in ThreadContext
Replace inline thread markers with ThreadContext wrapping:

**Before (Level 1/2)**:
```typescript
async function fetchUserProfile(userId: string) {
  console.log('[THREAD:DATA_FLOW] Fetching user', userId);
  const user = await api.getUser(userId);
  return user;
}
```

**After (Level 3)**:
```typescript
async function fetchUserProfile(userId: string) {
  return ThreadContext.runAsync('DATA_FLOW', async () => {
    console.log('Fetching user', userId); // Thread inferred from context
    const user = await api.getUser(userId);
    return user;
  });
}
```

### Step 3: Enable Runtime Control
Control threading dynamically:

```typescript
// Enable specific threads
ThreadContext.enable('DATA_FLOW', 'CACHE');

// Disable specific threads
ThreadContext.disable('VALIDATION');

// Check if thread is enabled
if (ThreadContext.isEnabled('DATA_FLOW')) {
  // Execute code
}
```

## Examples

### Example 1: Basic ThreadContext Usage
```typescript
/**
 * Fetches user profile with ThreadContext
 */
async function fetchUserProfile(userId: string): Promise<User> {
  return ThreadContext.runAsync('DATA_FLOW', async () => {
    console.log('Fetching user', userId);

    // Nested context for cache check
    const cached = await ThreadContext.runAsync('CACHE', async () => {
      console.log('Checking cache', userId);
      return cache.get(userId);
    });

    if (cached) return cached;

    const user = await api.getUser(userId);
    console.log('User loaded', user.id);

    // Nested context for cache update
    await ThreadContext.runAsync('CACHE', async () => {
      console.log('Updating cache', userId);
      cache.set(userId, user);
    });

    return user;
  });
}
```

**Result**: Logs automatically tagged with thread from context. Nested CACHE contexts clearly visible in timeline.

### Example 2: Conditional Threading
```typescript
/**
 * Validates input only if validation thread is enabled
 */
function validateUserInput(input: any): boolean {
  // Skip validation if thread disabled
  if (!ThreadContext.isEnabled('VALIDATION')) {
    return true; // Assume valid
  }

  return ThreadContext.run('VALIDATION', () => {
    console.log('Starting validation');

    if (!input.email || !input.email.includes('@')) {
      console.error('Email validation failed');
      return false;
    }

    console.log('Validation passed');
    return true;
  });
}

// In production: Disable validation thread for performance
ThreadContext.disable('VALIDATION');

// In development: Enable all threads
ThreadContext.enableAll();
```

### Example 3: Class-Based ThreadContext
```typescript
/**
 * Cache service with automatic thread context
 */
class CacheService {
  get<T>(key: string): T | null {
    return ThreadContext.run('CACHE', () => {
      console.log('Cache lookup', key);

      const value = this.store.get(key);

      if (value) {
        console.log('Cache hit', key);
      } else {
        console.log('Cache miss', key);
      }

      return value;
    });
  }

  set<T>(key: string, value: T): void {
    ThreadContext.run('CACHE', () => {
      console.log('Cache update', key);
      this.store.set(key, value);
    });
  }

  invalidate(key: string): void {
    ThreadContext.run('CACHE', () => {
      console.log('Cache invalidation', key);
      this.store.delete(key);
    });
  }
}
```

### Example 4: Nested Multi-Thread Operation
```typescript
/**
 * Processes order with nested thread contexts
 */
async function processOrder(order: Order): Promise<boolean> {
  return ThreadContext.runAsync('VALIDATION', async () => {
    console.log('Validating order', order.id);

    if (!order.items.length) {
      return ThreadContext.run('ERROR_RECOVERY', () => {
        console.error('Order validation failed: no items');
        return false;
      });
    }

    // Switch to DATA_FLOW context
    const inventory = await ThreadContext.runAsync('DATA_FLOW', async () => {
      console.log('Fetching inventory');
      return await fetchInventory(order.items);
    });

    // Switch to CACHE context
    await ThreadContext.runAsync('CACHE', async () => {
      console.log('Updating inventory cache');
      cache.set('inventory', inventory);
    });

    console.log('Validation complete');
    return true;
  });
}
```

### Example 5: Dynamic Thread Selection
```typescript
/**
 * Executes operation in dynamically determined thread
 */
async function executeInThread<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  // Determine thread based on operation type
  const threadMap: Record<string, string> = {
    'fetch': 'DATA_FLOW',
    'validate': 'VALIDATION',
    'cache': 'CACHE',
    'authenticate': 'AUTH'
  };

  const threadName = threadMap[operation] || 'UNKNOWN';

  return ThreadContext.runAsync(threadName, async () => {
    console.log(`Executing ${operation} operation`);
    const result = await fn();
    console.log(`Completed ${operation} operation`);
    return result;
  });
}

// Usage
await executeInThread('fetch', async () => {
  return await api.getUser(userId);
});
```

### Example 6: Advanced - Thread Propagation in Promises
```typescript
/**
 * Helper to propagate thread context through Promise chains
 */
class ThreadPromise {
  static wrap<T>(promise: Promise<T>): Promise<T> {
    const currentThread = ThreadContext.getCurrent();
    if (!currentThread) return promise;

    return promise
      .then(result => ThreadContext.run(currentThread, () => result))
      .catch(error => ThreadContext.run(currentThread, () => { throw error; }));
  }
}

// Usage
const user = await ThreadContext.runAsync('DATA_FLOW', async () => {
  const promise = api.getUser(userId);

  // Do other work while waiting
  await someOtherTask();

  // Ensure thread context preserved when promise resolves
  return ThreadPromise.wrap(promise);
});
```

## Validation Rules

### Success Criteria
- ✅ ThreadContext API available and functional
- ✅ Nested contexts work correctly
- ✅ Runtime enable/disable works
- ✅ Logs automatically tagged with thread context
- ✅ Context propagates through async operations
- ✅ Backward compatible with Level 1/2

### Quality Criteria
- 🎯 Context coverage: 70-90% of thread operations
- 🎯 Context depth: 2-3 levels of nesting (not too deep)
- 🎯 Enable/disable performance: <1ms overhead when disabled
- 🎯 Memory: Bounded stack size (max 10 levels)

### Runtime Validation
```typescript
// ✅ Good: Proper nesting
ThreadContext.run('A', () => {
  ThreadContext.run('B', () => {
    // Current thread is 'B'
  });
  // Current thread is 'A' again
});

// ❌ Error: Stack corruption
ThreadContext.stack.push('A'); // Don't manipulate stack directly
ThreadContext.stack.pop();      // Use API methods only

// ⚠️ Warning: Too deep nesting (>5 levels)
ThreadContext.run('A', () => {
  ThreadContext.run('B', () => {
    ThreadContext.run('C', () => {
      ThreadContext.run('D', () => {
        ThreadContext.run('E', () => {
          ThreadContext.run('F', () => {
            // Too deep - consider refactoring
          });
        });
      });
    });
  });
});
```

## Acceptable Fallbacks

### If Async Context Not Available
**Fallback**: Use continuation-local-storage (cls-hooked) or AsyncLocalStorage (Node 13.10+)

```typescript
import { AsyncLocalStorage } from 'async_hooks';

const threadStorage = new AsyncLocalStorage<string>();

class ThreadContext {
  static runAsync<T>(threadName: string, fn: () => Promise<T>): Promise<T> {
    return threadStorage.run(threadName, fn);
  }

  static getCurrent(): string | undefined {
    return threadStorage.getStore();
  }
}
```

### If Performance Impact Too High
**Fallback**: Make threading optional
```typescript
const THREADING_ENABLED = process.env.NODE_ENV === 'development';

class ThreadContext {
  static run<T>(threadName: string, fn: () => T): T {
    if (!THREADING_ENABLED) return fn(); // Skip in production
    return this.runWithContext(threadName, fn);
  }
}
```

### If Context Lost in Callbacks
**Fallback**: Manual context passing
```typescript
function processWithThread(threadName: string, data: any) {
  const context = { thread: threadName };
  return process(data, context);
}
```

## Partial Implementation Strategy

### Minimum Viable (40% Coverage)
1. Implement basic ThreadContext (run, getCurrent)
2. Wrap 3-5 critical operations
3. Test nested contexts work
4. Verify logs tagged correctly

**Time Estimate**: 4-8 hours

### Recommended Target (70% Coverage)
1. Full ThreadContext API (enable/disable, isEnabled)
2. All major operations wrapped
3. Nested contexts tested
4. Runtime controls integrated into UI

**Time Estimate**: 2-3 days

### Comprehensive (90% Coverage)
1. All thread operations use ThreadContext
2. Advanced features (ThreadPromise, propagation)
3. Performance optimizations
4. Comprehensive testing

**Time Estimate**: 4-5 days

## Benefits of Level 3

1. **Runtime Control**: Enable/disable threads without code changes
2. **Dynamic Threading**: Programmatic thread selection
3. **Nested Contexts**: Clear visualization of thread hierarchy
4. **Context Propagation**: Automatic thread tagging of logs
5. **No Build Tooling**: Works without decorators or transpilation
6. **Backward Compatible**: Can coexist with Level 1/2
7. **Testing Friendly**: Easy to mock and control in tests

## Limitations of Level 3

1. **API Learning Curve**: Team must learn ThreadContext API
2. **Wrapper Overhead**: More verbose than Level 1/2
3. **Async Complexity**: Context propagation in async code tricky
4. **Performance**: ~1-5ms overhead per context switch
5. **Manual Wrapping**: Must remember to wrap operations

## When to Stay at Level 3

- Need runtime control of threading
- Dynamic thread selection required
- Nested contexts are valuable
- Want testing flexibility
- Not ready for decorators (Level 4)

## When to Upgrade to Level 4

- Want zero-overhead abstractions
- Prefer declarative style (decorators)
- Need compile-time validation
- Want automatic instrumentation
- TypeScript with experimentalDecorators enabled

## Agent Instructions (For AI Code Assistants)

If you are an AI agent working at Level 3:

### When Writing New Functions
```typescript
async function myFunction(param: string): Promise<Result> {
  return ThreadContext.runAsync('THREAD_NAME', async () => {
    console.log('Operation starting');
    // Implementation
    console.log('Operation complete');
    return result;
  });
}
```

### When Refactoring
- Wrap thread-relevant operations in ThreadContext
- Preserve nesting structure
- Ensure finally blocks restore context

### Performance Optimization
- Use isEnabled() to skip disabled threads
- Minimize context switching in hot paths
- Cache ThreadContext.getCurrent() if called frequently

### Testing Support
```typescript
// Enable specific threads for testing
beforeEach(() => {
  ThreadContext.enable('DATA_FLOW', 'CACHE');
});

// Disable noisy threads
ThreadContext.disable('LOGGING', 'METRICS');

// Test thread behavior
it('should run in CACHE thread', () => {
  ThreadContext.run('CACHE', () => {
    expect(ThreadContext.getCurrent()).toBe('CACHE');
  });
});
```

## Migration Guide: Level 2 → Level 3

### Step-by-Step Migration

1. **Implement ThreadContext** (2-4 hours)
   - Create ThreadContext class
   - Add run/runAsync methods
   - Add enable/disable/isEnabled
   - Add tests

2. **Wrap Critical Operations** (4-8 hours)
   - Start with entry points
   - Wrap async operations
   - Test nested contexts
   - Verify logs tagged correctly

3. **Add Runtime Controls** (1-2 hours)
   - Integrate enable/disable into UI
   - Add configuration options
   - Test performance with threads disabled

4. **Migrate from Level 1/2** (ongoing)
   - Keep Level 1/2 logs as fallback
   - Gradually replace with ThreadContext
   - Remove explicit thread prefixes once confirmed

5. **Performance Testing** (2-4 hours)
   - Measure overhead
   - Optimize hot paths
   - Add caching if needed

**Total Time**: 1-2 weeks for medium codebase

## Technical Details

### ThreadContext Implementation
```typescript
class ThreadContext {
  private static stack: string[] = [];
  private static enabled = new Set<string>();
  private static disabled = new Set<string>();

  static run<T>(threadName: string, fn: () => T): T {
    if (this.isDisabled(threadName)) return fn();

    this.stack.push(threadName);
    try {
      return fn();
    } finally {
      this.stack.pop();
    }
  }

  static async runAsync<T>(threadName: string, fn: () => Promise<T>): Promise<T> {
    if (this.isDisabled(threadName)) return fn();

    this.stack.push(threadName);
    try {
      return await fn();
    } finally {
      this.stack.pop();
    }
  }

  static getCurrent(): string | undefined {
    return this.stack[this.stack.length - 1];
  }

  static enable(...threads: string[]): void {
    threads.forEach(t => {
      this.enabled.add(t);
      this.disabled.delete(t);
    });
  }

  static disable(...threads: string[]): void {
    threads.forEach(t => {
      this.disabled.add(t);
      this.enabled.delete(t);
    });
  }

  static isEnabled(thread: string): boolean {
    if (this.disabled.has(thread)) return false;
    if (this.enabled.size === 0) return true; // All enabled by default
    return this.enabled.has(thread);
  }

  private static isDisabled(thread: string): boolean {
    return !this.isEnabled(thread);
  }

  static enableAll(): void {
    this.enabled.clear();
    this.disabled.clear();
  }
}
```

### Performance Impact
- **Overhead when enabled**: 1-5ms per context switch
- **Overhead when disabled**: <0.1ms (fast path)
- **Memory**: ~8 bytes per stack frame
- **Stack limit**: Configurable (default 10 levels)

### Integration with Logging
```typescript
// Automatic thread tagging
function log(message: string, ...args: any[]): void {
  const thread = ThreadContext.getCurrent();
  if (thread) {
    console.log(`[THREAD:${thread}] ${message}`, ...args);
  } else {
    console.log(message, ...args);
  }
}

// Usage
ThreadContext.run('DATA_FLOW', () => {
  log('Fetching data'); // Outputs: [THREAD:DATA_FLOW] Fetching data
});
```

---

**Previous Level**: [Level 2: JSDoc Annotations](./level-2-jsdoc.template.md)
**Next Level**: [Level 4: Full Decorators](./level-4-decorator.template.md) - TypeScript decorators with comprehensive analysis.
