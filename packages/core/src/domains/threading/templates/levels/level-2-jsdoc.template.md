# Level 2: JSDoc Annotations

## Objective

Document threading intent using JSDoc `@thread` annotations. This provides IDE autocomplete, static analysis, and documentation generation while maintaining the runtime flexibility of Level 1.

## Approach

### Step 1: Add JSDoc @thread Annotations
Document thread assignment at the function level:

```typescript
/**
 * Fetches user profile from API
 * @thread DATA_FLOW
 */
async function fetchUserProfile(userId: string): Promise<User> {
  // Implementation
}
```

### Step 2: Combine with Level 1 Logging
Keep Level 1 log prefixes for runtime identification:

```typescript
/**
 * @thread CACHE
 */
class CacheService {
  get(key: string): any {
    console.log('[THREAD:CACHE] Cache lookup', key);
    // Implementation
  }
}
```

### Step 3: Static Analysis
Run static analysis to:
- Find functions missing `@thread` annotations
- Detect inconsistencies between JSDoc and runtime logs
- Generate coverage reports
- Validate thread names against allowed list

## Examples

### Example 1: Function-Level Annotation
```typescript
/**
 * Validates user input according to business rules
 * @thread VALIDATION
 * @param input - User input to validate
 * @returns True if valid, false otherwise
 */
function validateUserInput(input: any): boolean {
  console.log('[THREAD:VALIDATION] Starting validation');

  if (!input.email || !input.email.includes('@')) {
    console.error('[THREAD:VALIDATION] Email validation failed');
    return false;
  }

  console.log('[THREAD:VALIDATION] Validation passed');
  return true;
}
```

### Example 2: Class-Level Annotation
```typescript
/**
 * Manages user authentication and authorization
 * @thread AUTH
 */
class AuthService {
  /**
   * Authenticates user with credentials
   * @inherits-thread
   */
  async login(username: string, password: string): Promise<Token> {
    console.log('[THREAD:AUTH] Login attempt', username);
    // Implementation
  }

  /**
   * Validates access token
   * @inherits-thread
   */
  validateToken(token: string): boolean {
    console.log('[THREAD:AUTH] Token validation');
    // Implementation
  }
}
```

**Note**: `@inherits-thread` (custom convention) indicates method inherits thread from class.

### Example 3: Multi-Thread Function with Explicit Marking
```typescript
/**
 * Processes order through validation, data fetch, and caching
 * @thread VALIDATION - Primary thread for order validation
 * @thread DATA_FLOW - For inventory fetch
 * @thread CACHE - For inventory caching
 */
async function processOrder(order: Order): Promise<boolean> {
  // Validation thread
  console.log('[THREAD:VALIDATION] Validating order', order.id);
  if (!order.items.length) {
    console.error('[THREAD:VALIDATION] No items in order');
    return false;
  }

  // Data flow thread
  console.log('[THREAD:DATA_FLOW] Fetching inventory');
  const inventory = await fetchInventory(order.items);

  // Cache thread
  console.log('[THREAD:CACHE] Updating inventory cache');
  cache.set('inventory', inventory);

  return true;
}
```

### Example 4: TypeScript with Type Hints
```typescript
/**
 * User repository with caching
 * @thread DATA_FLOW
 * @thread CACHE
 */
class UserRepository {
  /**
   * @thread DATA_FLOW
   */
  async getById(id: string): Promise<User> {
    console.log('[THREAD:DATA_FLOW] Fetching user', id);

    // Check cache first
    const cached = this.checkCache(id); // CACHE thread
    if (cached) return cached;

    const user = await api.getUser(id);
    this.updateCache(id, user); // CACHE thread

    return user;
  }

  /**
   * @thread CACHE
   * @private
   */
  private checkCache(id: string): User | null {
    console.log('[THREAD:CACHE] Cache lookup', id);
    return cache.get(id);
  }

  /**
   * @thread CACHE
   * @private
   */
  private updateCache(id: string, user: User): void {
    console.log('[THREAD:CACHE] Cache update', id);
    cache.set(id, user);
  }
}
```

### Example 5: Async Error Handling
```typescript
/**
 * Fetches data with automatic retry on failure
 * @thread DATA_FLOW - For successful data fetching
 * @thread ERROR_RECOVERY - For retry logic
 */
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  console.log('[THREAD:DATA_FLOW] Starting fetch operation');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      console.log('[THREAD:DATA_FLOW] Fetch successful');
      return result;
    } catch (error) {
      console.error('[THREAD:ERROR_RECOVERY] Fetch failed, attempt', attempt);

      if (attempt === maxRetries) {
        console.error('[THREAD:ERROR_RECOVERY] Max retries reached');
        throw error;
      }

      console.log('[THREAD:ERROR_RECOVERY] Retrying...');
      await delay(1000 * attempt);
    }
  }

  throw new Error('Unreachable');
}
```

## Validation Rules

### Success Criteria
- ✅ Functions have `@thread` JSDoc tags
- ✅ Thread names match runtime log prefixes
- ✅ JSDoc syntax is valid
- ✅ Documentation generated correctly
- ✅ IDE shows thread hints on hover
- ✅ Static analysis detects missing annotations

### Quality Criteria
- 🎯 Annotation coverage: 60-80% of thread-relevant functions
- 🎯 Consistency: JSDoc matches runtime logs 95%+
- 🎯 Documentation quality: Clear thread purpose documented
- 🎯 Thread name validation: Names from approved list

### Static Analysis Checks
```typescript
// ✅ Good: Annotation matches log
/**
 * @thread DATA_FLOW
 */
function fetchData() {
  console.log('[THREAD:DATA_FLOW] Fetching...');
}

// ⚠️ Warning: Annotation-log mismatch
/**
 * @thread CACHE
 */
function fetchData() {
  console.log('[THREAD:DATA_FLOW] Fetching...'); // Logs DATA_FLOW but annotated as CACHE
}

// ❌ Error: No annotation
function fetchData() { // Thread-relevant but not annotated
  console.log('[THREAD:DATA_FLOW] Fetching...');
}
```

## Acceptable Fallbacks

### If IDE Doesn't Support Custom JSDoc Tags
**Fallback**: Use standard JSDoc with custom parser
```typescript
/**
 * @description Fetches user data
 * @category threading
 * @tag DATA_FLOW
 */
```

### If Team Doesn't Want JSDoc Overhead
**Fallback**: Use TypeScript namespaces or decorators (move toward Level 4)

### If Static Analysis Tool Not Available
**Fallback**: Manual code reviews, Level 1 still works at runtime

## Partial Implementation Strategy

### Minimum Viable (30% Coverage)
1. Annotate public API functions
2. Annotate classes with primary thread
3. Run basic consistency check

**Time Estimate**: 2-4 hours

### Recommended Target (60% Coverage)
1. All public functions annotated
2. Key private functions annotated
3. Static analysis integrated into CI
4. Documentation generated

**Time Estimate**: 1-2 days

### Comprehensive (80% Coverage)
1. All thread-relevant functions annotated
2. Multi-thread functions explicitly documented
3. Thread inheritance documented
4. Automated enforcement in PR checks

**Time Estimate**: 2-3 days

## Benefits of Level 2

1. **IDE Integration**: Autocomplete, hover hints, navigation
2. **Documentation**: Auto-generated threading documentation
3. **Static Analysis**: Catch errors before runtime
4. **Team Communication**: Clear intent in code reviews
5. **Refactoring Support**: Find all functions in a thread
6. **Type Safety**: Can build TypeScript types from annotations
7. **Backward Compatible**: Level 1 logs still work

## Limitations of Level 2

1. **Documentation Overhead**: Must maintain JSDoc comments
2. **No Runtime Enforcement**: Annotations don't affect execution
3. **Consistency Burden**: Must keep JSDoc and logs in sync
4. **Limited Tooling**: Custom JSDoc tags need custom tooling
5. **No Dynamic Threading**: Can't change thread at runtime

## When to Stay at Level 2

- Team values documentation
- IDE support is important
- Static analysis is part of workflow
- Thread assignments are stable
- No need for runtime thread control

## When to Upgrade to Level 3

- Need runtime enable/disable of threads
- Want dynamic thread context
- Need nested thread contexts
- Want programmatic thread control
- Ready to adopt ThreadContext API

## Agent Instructions (For AI Code Assistants)

If you are an AI agent working at Level 2:

### When Creating New Functions
```typescript
/**
 * Brief description of function
 * @thread THREAD_NAME
 * @param paramName - Description
 * @returns Description
 */
function myFunction(paramName: string): ReturnType {
  console.log('[THREAD:THREAD_NAME] Log message');
  // Implementation
}
```

### When Refactoring
- Update `@thread` annotations when moving code
- Keep annotations in sync with runtime logs
- Validate thread names against approved list

### Static Analysis Tasks
- Find functions with logs but no `@thread` annotation
- Find mismatches between annotations and logs
- Generate coverage reports
- Suggest missing annotations

### Documentation Generation
- Extract all `@thread` annotations
- Group functions by thread
- Generate thread map visualization
- Create threading architecture docs

## Migration Guide: Level 1 → Level 2

### Step-by-Step Migration

1. **Identify Thread-Relevant Functions** (30 minutes)
   - Run Level 1 coverage report
   - List functions with `[THREAD:X]` logs
   - Prioritize by importance

2. **Add JSDoc Annotations** (2-4 hours)
   - Start with public API functions
   - Add `@thread` tags matching log prefixes
   - Include thread purpose in description

3. **Setup Static Analysis** (1 hour)
   - Create custom JSDoc parser or use ESLint
   - Define allowed thread names
   - Configure CI checks

4. **Generate Documentation** (30 minutes)
   - Use JSDoc tool to generate HTML
   - Create threading architecture diagram
   - Share with team

5. **Enforce Consistency** (ongoing)
   - Add to PR checklist
   - Run automated checks
   - Review for annotation-log mismatches

**Total Time**: 4-8 hours for small to medium codebase

## Technical Details

### JSDoc Tag Format
```typescript
@thread THREAD_NAME - Optional description
```

### Multiple Threads
```typescript
@thread PRIMARY_THREAD - Main thread
@thread SECONDARY_THREAD - Secondary operations
```

### Custom Tags (Optional Extensions)
```typescript
@inherits-thread - Inherits thread from parent class/function
@thread-context THREAD_NAME - Uses ThreadContext (Level 3 hybrid)
@thread-timing max=100ms - Performance expectations
```

### Static Analysis Implementation
```typescript
// Example ESLint rule (pseudo-code)
rules: {
  'threading/require-thread-annotation': {
    pattern: /\[THREAD:([A-Z_]+)\]/,
    requireJSDoc: true,
    validateConsistency: true
  }
}
```

### IDE Configuration (VS Code example)
```json
{
  "jsdoc.tags": {
    "thread": {
      "type": "string",
      "description": "Threading context for debugging"
    }
  }
}
```

### Performance Impact
- **Overhead**: None at runtime (documentation only)
- **Build Time**: +5-10% if generating docs
- **IDE**: Minimal (standard JSDoc parsing)

---

**Previous Level**: [Level 1: Semantic Logging](./level-1-semantic.template.md)
**Next Level**: [Level 3: ThreadContext API](./level-3-context.template.md) - Runtime thread management.
