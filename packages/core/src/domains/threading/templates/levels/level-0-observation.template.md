# Level 0: Observation

## Objective

Enable passive observation of existing log messages to identify thread-worthy debugging contexts without requiring any code changes. This is the entry point for teams exploring threading or working with legacy codebases.

## Approach

### Step 1: Identify Existing Logging
1. Scan codebase for existing logging calls:
   - `console.log()`, `console.error()`, `console.warn()`
   - `logger.info()`, `logger.debug()`, `logger.error()`
   - Custom logging frameworks
2. No modifications to existing code required
3. No configuration files needed

### Step 2: Pattern Recognition
The threading system will automatically detect patterns in existing logs:
- Log messages containing common thread indicators (e.g., "cache", "validation", "fetch")
- Temporal patterns (sequences of related operations)
- Contextual clues (function names, file paths, variable names)

### Step 3: Observation Dashboard
View detected patterns in the threading visualization:
- Timeline shows log events
- Hover to see inferred thread context
- Filter by detected patterns
- No accuracy guarantees - best effort inference only

## Examples

### Example 1: Console Logs (No Changes Needed)
```typescript
// Existing code - NO CHANGES REQUIRED
async function fetchUserProfile(userId: string) {
  console.log('Fetching user profile', userId);
  const user = await api.getUser(userId);
  console.log('User profile loaded', user.id);
  return user;
}
```

**Observation**: System infers potential `DATA_FLOW` thread from "fetch" keyword and API call pattern.

### Example 2: Logger Framework (No Changes Needed)
```typescript
// Existing code - NO CHANGES REQUIRED
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

**Observation**: System infers potential `CACHE` thread from "cache" keyword and class name.

### Example 3: Mixed Logging (No Changes Needed)
```typescript
// Existing code - NO CHANGES REQUIRED
function validateInput(data: any) {
  console.log('Starting validation');

  if (!data.email) {
    console.error('Email validation failed');
    return false;
  }

  console.log('Validation passed');
  return true;
}
```

**Observation**: System infers potential `VALIDATION` thread from "validation" keyword.

## Validation Rules

### Success Criteria
- ✅ No code changes required
- ✅ No build errors introduced
- ✅ Existing logs continue to work normally
- ✅ Timeline visualization shows log events
- ✅ Hover tooltips show inferred thread context
- ✅ Basic filtering by inferred patterns available

### Quality Criteria (Best Effort)
- 🔍 Thread inference accuracy: 30-60% (acceptable at L0)
- 🔍 Pattern detection coverage: Any existing logs detected
- 🔍 False positives: Expected and acceptable

### What's NOT Expected at Level 0
- ❌ High accuracy thread identification
- ❌ Guaranteed thread assignment
- ❌ Thread timing analysis
- ❌ Cross-function thread tracking
- ❌ Memory or performance profiling

## Acceptable Fallbacks

### If No Logs Exist
**Fallback**: Add minimal console.log() statements to key functions
```typescript
function criticalOperation() {
  console.log('Operation started');
  // ... existing code ...
  console.log('Operation completed');
}
```

### If Inference Accuracy Too Low
**Fallback**: Move to Level 1 (Semantic) for explicit thread markers

### If No Observable Patterns
**Fallback**: System shows raw log timeline without thread grouping - still useful for temporal analysis

## Partial Implementation Strategy

### Minimum Viable (10% Coverage)
- Add logs to 1-2 critical functions
- Observe patterns in threading dashboard
- Learn what threads are valuable to track

### Recommended Starting Point (30% Coverage)
- Add logs to key entry points (API handlers, event listeners)
- Add logs to frequently-called utilities
- Add logs to error paths

### Progressive Enhancement
1. **Week 1**: Observe existing logs (0% changes)
2. **Week 2**: Add logs to 2-3 critical paths
3. **Week 3**: Evaluate patterns, decide if L0 sufficient or upgrade to L1

## Benefits of Level 0

1. **Zero Risk**: No code changes means no bugs introduced
2. **Instant Start**: Works with existing codebase immediately
3. **Learning Tool**: Discover what threads matter in your system
4. **Low Commitment**: Evaluate threading system without investment
5. **Legacy Friendly**: Works with any codebase, any age

## Limitations of Level 0

1. **Low Accuracy**: 30-60% thread inference accuracy
2. **No Guarantees**: Patterns may be missed or misclassified
3. **Limited Analysis**: No timing, memory, or cross-function tracking
4. **Heuristic-Based**: Relies on keyword matching and patterns
5. **No IDE Support**: No autocomplete, validation, or refactoring

## When to Stay at Level 0

- Exploring threading system for the first time
- Working with legacy code you cannot modify
- Need zero-risk observability
- Just learning what threads exist in your system
- Temporary observation during debugging

## When to Upgrade to Level 1

- Need more accurate thread identification (>80%)
- Want explicit control over thread names
- Ready to make minimal code changes ([THREAD:X] prefixes)
- Want better filtering and visualization
- Thread patterns are now clear and worth tracking systematically

## Agent Instructions (For AI Code Assistants)

If you are an AI agent working with this codebase:

1. **DO NOT add threading code** at Level 0
2. **DO NOT modify existing logs** unless explicitly requested
3. **DO observe** patterns in existing logs and report findings
4. **DO suggest** upgrading to Level 1 if patterns are clear
5. **DO help** user understand what threads exist in their system

When analyzing code at Level 0:
- Look for console.log, logger calls, and similar
- Identify potential thread names from keywords
- Report confidence levels honestly (30-60% is normal)
- Suggest which logs would benefit from explicit thread markers

## Technical Details

### Detection Patterns
The system uses these heuristics for thread inference:

| Pattern | Inferred Thread | Confidence |
|---------|----------------|------------|
| "fetch", "load", "get" | DATA_FLOW | Medium |
| "cache", "hit", "miss" | CACHE | High |
| "validate", "check" | VALIDATION | Medium |
| "error", "retry", "recover" | ERROR_RECOVERY | Medium |
| "auth", "login", "permission" | AUTH | High |

### Performance Impact
- **Overhead**: <5ms per log message
- **Memory**: ~100KB for pattern recognition engine
- **No runtime instrumentation**: Purely observational

---

**Next Level**: [Level 1: Semantic Logging](./level-1-semantic.template.md) - Add explicit thread markers with minimal code changes.
