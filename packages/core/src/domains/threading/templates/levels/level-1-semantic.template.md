# Level 1: Semantic Logging

## Objective

Add explicit thread markers to log messages using simple prefixes like `[THREAD:DATA_FLOW]`. This provides 80-95% thread identification accuracy with minimal code changes and no build tooling requirements.

## Approach

### Step 1: Choose Thread Names
Identify 3-7 main debugging threads in your system:
```
Common threads:
- DATA_FLOW: Data fetching, transformations, API calls
- CACHE: Cache operations (hit, miss, invalidate)
- VALIDATION: Input validation, business rules
- ERROR_RECOVERY: Error handling, retries, fallbacks
- AUTH: Authentication, authorization
- AGENT_BRAIN: AI agent interactions (if applicable)
- PERFORMANCE: Performance-critical paths
```

### Step 2: Add Thread Prefixes
Modify existing logs to include thread markers:

**Preferred Format**: `[THREAD:NAME]`
```typescript
console.log('[THREAD:DATA_FLOW] Fetching user data');
logger.info('[THREAD:CACHE] Cache hit for key:', key);
```

**Alternate Formats** (all supported):
```typescript
// Lowercase variant
console.log('[thread:data_flow] Processing data');

// Object-based (JSON)
logger.info({ thread: 'CACHE', message: 'Cache miss', key });

// Assignment style
console.log('thread=DATA_FLOW Processing started');
```

### Step 3: Verification
Run threading visualization:
- Thread names appear in filters
- Logs grouped by thread
- Timeline shows thread activities
- Coverage report shows % of logs with threads

## Examples

### Example 1: Basic Console Log Migration
**Before (Level 0)**:
```typescript
async function fetchUserProfile(userId: string) {
  console.log('Fetching user profile', userId);
  const user = await api.getUser(userId);
  console.log('User profile loaded', user.id);
  return user;
}
```

**After (Level 1)**:
```typescript
async function fetchUserProfile(userId: string) {
  console.log('[THREAD:DATA_FLOW] Fetching user profile', userId);
  const user = await api.getUser(userId);
  console.log('[THREAD:DATA_FLOW] User profile loaded', user.id);
  return user;
}
```

**Result**: 100% accurate thread identification for these logs.

### Example 2: Cache Service with Logger
**Before (Level 0)**:
```typescript
class CacheService {
  get(key: string): any {
    logger.debug('Cache lookup', { key });
    const value = this.store.get(key);
    if (value) {
      logger.info('Cache hit', { key });
    } else {
      logger.warn('Cache miss', { key });
    }
    return value;
  }
}
```

**After (Level 1 - String Prefix)**:
```typescript
class CacheService {
  get(key: string): any {
    logger.debug('[THREAD:CACHE] Cache lookup', { key });
    const value = this.store.get(key);
    if (value) {
      logger.info('[THREAD:CACHE] Cache hit', { key });
    } else {
      logger.warn('[THREAD:CACHE] Cache miss', { key });
    }
    return value;
  }
}
```

**After (Level 1 - Object Format)**:
```typescript
class CacheService {
  get(key: string): any {
    logger.debug({ thread: 'CACHE', message: 'Cache lookup', key });
    const value = this.store.get(key);
    if (value) {
      logger.info({ thread: 'CACHE', message: 'Cache hit', key });
    } else {
      logger.warn({ thread: 'CACHE', message: 'Cache miss', key });
    }
    return value;
  }
}
```

### Example 3: Multi-Thread Function
**Before (Level 0)**:
```typescript
async function processOrder(order: Order) {
  console.log('Validating order', order.id);

  if (!order.items.length) {
    console.error('Order validation failed: no items');
    return false;
  }

  console.log('Fetching inventory');
  const inventory = await fetchInventory(order.items);

  console.log('Updating cache');
  cache.set('inventory', inventory);

  return true;
}
```

**After (Level 1 - Multi-Thread)**:
```typescript
async function processOrder(order: Order) {
  console.log('[THREAD:VALIDATION] Validating order', order.id);

  if (!order.items.length) {
    console.error('[THREAD:ERROR_RECOVERY] Order validation failed: no items');
    return false;
  }

  console.log('[THREAD:DATA_FLOW] Fetching inventory');
  const inventory = await fetchInventory(order.items);

  console.log('[THREAD:CACHE] Updating cache');
  cache.set('inventory', inventory);

  return true;
}
```

**Result**: Clear visualization of 3 threads interacting in one function.

### Example 4: Gradual Migration (60% Coverage)
You don't need to update all logs at once. Start with critical paths:

```typescript
class UserService {
  async getUser(id: string) {
    // Updated: Critical path
    console.log('[THREAD:DATA_FLOW] Fetching user', id);

    const cached = cache.get(id);
    if (cached) {
      // Updated: Cache interaction
      console.log('[THREAD:CACHE] Cache hit', id);
      return cached;
    }

    // Not updated yet: Less critical
    console.log('Cache miss');

    const user = await api.getUser(id);

    // Updated: Critical path
    console.log('[THREAD:DATA_FLOW] User loaded', user.id);

    return user;
  }
}
```

**Coverage**: 60% (3 out of 5 logs have thread markers) - System still provides valuable insights.

## Validation Rules

### Success Criteria
- ✅ Thread prefixes follow supported format
- ✅ Thread names are UPPERCASE with underscores
- ✅ Existing functionality unchanged
- ✅ Logs still readable by humans
- ✅ Build succeeds without errors
- ✅ Threading visualization shows threads accurately

### Quality Criteria
- 🎯 Thread identification accuracy: 80-95% (for tagged logs)
- 🎯 Coverage target: 60-80% of critical logs
- 🎯 3-7 distinct thread names
- 🎯 Consistent naming across codebase

### Common Mistakes to Avoid
- ❌ Inconsistent naming: `DATA_FLOW` vs `data-flow` vs `dataFlow`
- ❌ Too many threads: >10 threads = harder to track
- ❌ Too generic: `THREAD:SYSTEM` (not helpful)
- ❌ Typos: `[THERAD:DATA_FLOW]`
- ❌ Missing closing bracket: `[THREAD:DATA_FLOW Fetching...`

## Acceptable Fallbacks

### If Existing Logger Doesn't Support Prefixes
**Fallback**: Use object-based format
```typescript
// Instead of string prefix
logger.info('[THREAD:CACHE] Cache hit');

// Use object format
logger.info({ thread: 'CACHE', message: 'Cache hit' });
```

### If Thread Names Are Unclear
**Fallback**: Start with broad categories, refine later
```typescript
// Week 1: Broad
console.log('[THREAD:DATA] Processing data');

// Week 2: Refined
console.log('[THREAD:DATA_FLOW] Processing data');
console.log('[THREAD:DATA_TRANSFORM] Processing data');
```

### If Coverage Is Low (<30%)
**Fallback**: System falls back to Level 0 inference for unmarked logs
- Tagged logs: 95% accuracy
- Untagged logs: 40% accuracy (inference)
- Combined: Still valuable insights

## Partial Implementation Strategy

### Minimum Viable (30% Coverage)
1. Identify 3 most important threads
2. Add markers to entry points (API routes, event handlers)
3. Add markers to frequently-called functions
4. Run visualization, verify thread filtering works

**Time Estimate**: 1-2 hours for small codebase

### Recommended Target (60-70% Coverage)
1. All critical paths marked
2. All error paths marked
3. Key utility functions marked
4. Cache and database operations marked

**Time Estimate**: 4-8 hours for medium codebase

### Comprehensive (80-90% Coverage)
1. All logging statements marked
2. Consistent naming enforced
3. Documentation of thread meanings
4. Code review process includes thread checking

**Time Estimate**: 1-2 days for large codebase

## Benefits of Level 1

1. **High Accuracy**: 80-95% thread identification
2. **Low Effort**: Simple string prefixes, no tooling
3. **Flexible Formats**: Multiple format styles supported
4. **Gradual Migration**: Works at any coverage level
5. **Human Readable**: Logs still readable without tools
6. **No Build Changes**: No TypeScript config, no decorators
7. **Framework Agnostic**: Works with any logger
8. **Backward Compatible**: Existing tools still work

## Limitations of Level 1

1. **Manual Effort**: Must remember to add prefixes
2. **No IDE Support**: No autocomplete or validation
3. **No Compilation Checks**: Typos not caught until runtime
4. **Limited Analysis**: No timing, memory, or call graphs
5. **String-Based**: Refactoring tools won't update thread names

## When to Stay at Level 1

- Team prefers simplicity over tooling
- No TypeScript or build tooling required
- Need quick wins with minimal friction
- Codebase changes frequently (Level 2-4 maintenance cost higher)
- Thread names not yet stable

## When to Upgrade to Level 2

- Want IDE autocomplete for thread names
- Need documentation of threading intent
- Want static analysis and validation
- Thread names are stable and documented
- Ready to add JSDoc annotations

## Agent Instructions (For AI Code Assistants)

If you are an AI agent working at Level 1:

### When Adding Logs
```typescript
// Good: Include thread prefix
console.log('[THREAD:DATA_FLOW] User data loaded');

// Bad: No thread prefix
console.log('User data loaded');
```

### When Refactoring
- Preserve existing thread prefixes
- Maintain consistent thread naming
- Don't remove thread markers

### When Suggesting Improvements
- Recommend thread prefixes for new logs
- Suggest consistent thread names
- Identify logs missing thread markers
- Report coverage statistics

### Standard Thread Names to Use
Prefer these standard names unless domain-specific threads needed:
- `DATA_FLOW` - Data fetching, processing, API calls
- `CACHE` - Cache operations
- `VALIDATION` - Input validation, business rules
- `ERROR_RECOVERY` - Error handling, retries
- `AUTH` - Authentication, authorization
- `PERFORMANCE` - Performance-critical operations
- `AGENT_BRAIN` - AI agent interactions

## Migration Guide: Level 0 → Level 1

### Step-by-Step Migration

1. **Choose 3-5 Thread Names** (15 minutes)
   - Review Level 0 inference results
   - Identify most common patterns
   - Pick meaningful names

2. **Update Critical Path** (30-60 minutes)
   - Main API entry points
   - Error handling paths
   - Key business logic

3. **Update Utility Functions** (30-60 minutes)
   - Cache operations
   - Database queries
   - External API calls

4. **Verify in UI** (15 minutes)
   - Run threading visualization
   - Check thread filters work
   - Review coverage report

5. **Document Thread Meanings** (15 minutes)
   - Create THREADING.md in repo root
   - Document what each thread means
   - Share with team

**Total Time**: 2-3 hours for small to medium codebase

## Technical Details

### Supported Formats

| Format | Example | Confidence |
|--------|---------|------------|
| Bracket UPPER | `[THREAD:DATA_FLOW]` | 100% |
| Bracket lower | `[thread:data_flow]` | 100% |
| Object | `{thread: "CACHE"}` | 100% |
| Assignment | `thread=DATA_FLOW` | 95% |
| Equals | `[THREAD=NAME]` | 95% |
| Mixed case | `[Thread:DataFlow]` | 90% |

All formats normalized to `DATA_FLOW` internally.

### Performance Impact
- **Overhead**: <1ms per log message (prefix parsing)
- **Memory**: Negligible (<10KB for parsing engine)
- **Build Time**: No change (no compilation step)

---

**Previous Level**: [Level 0: Observation](./level-0-observation.template.md)
**Next Level**: [Level 2: JSDoc Annotations](./level-2-jsdoc.template.md) - Document threading intent with annotations.
