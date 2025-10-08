# Pathway Optimization Heuristics

**Version:** 0.4.66
**Date:** 2025-10-03

## Overview

This document defines heuristics for optimizing pathway definitions to create effective, maintainable, and AI-debuggable tests.

---

## Core Question: What Makes a "Good" Pathway?

A good pathway balances:
1. **Coverage** - Captures the essential data flow
2. **Precision** - Pinpoints failures accurately
3. **Maintainability** - Survives refactoring
4. **Debuggability** - Provides actionable insights

---

## Heuristic 1: Milestone Granularity

### The Goldilocks Principle

**Too Coarse:**
```typescript
// ❌ Only 2 milestones - can't pinpoint failure
createDataIngestionPathway()
    .expectMilestone('start')
    .expectMilestone('end');
```

**Too Fine:**
```typescript
// ❌ 50+ milestones - brittle, maintenance nightmare
createDataIngestionPathway()
    .expectMilestone('validateInput')
    .expectMilestone('checkNull')
    .expectMilestone('parseJSON')
    .expectMilestone('validateSchema')
    .expectMilestone('transformField1')
    .expectMilestone('transformField2')
    // ... 44 more milestones
```

**Just Right:**
```typescript
// ✅ 5-12 milestones - captures key transition points
createDataIngestionPathway()
    .expectMilestone('DataOrchestrator.getEvents')      // Entry
    .expectMilestone('GitDataProvider.fetchEvents')     // Data source
    .expectMilestone('GitDataProvider.normalizeEvents') // Transform
    .expectMilestone('extension.sendToWebview')         // Boundary
    .expectMilestone('webview.handleData')              // Reception
    .expectMilestone('D3TimelineRenderer.render');      // Output
```

### Heuristic Rule:

**5-12 Milestones per Pathway**
- Minimum 5: Enough to locate failures
- Maximum 12: Maintainable without overwhelming
- Sweet spot: 7-9 milestones

### Milestone Selection Criteria:

Mark as milestone if the point is:
1. **System Boundary** - Crossing extension/webview, process boundaries
2. **Data Transformation** - Structure changes (raw → normalized)
3. **State Change** - Critical state mutations
4. **External Dependency** - Git/GitHub/file system calls
5. **Error-Prone** - Historical failure points
6. **Performance Critical** - Known bottlenecks

**Don't mark as milestone:**
- Internal loops (unless loop entry/exit)
- Utility functions (unless complex)
- Simple getters/setters
- Validation checks (unless gateway validation)

---

## Heuristic 2: Pathway Boundaries

### Where Should Pathways Start and End?

**Data Flow Boundaries:**

```
User Action → [PATHWAY STARTS] → Business Logic → [PATHWAY ENDS] → Visual Feedback
```

**Start Points (Entry Milestones):**
- User interaction (click, type, drag)
- External event (file change, timer)
- System trigger (startup, refresh)
- API call received

**End Points (Exit Milestones):**
- DOM updated
- Data persisted
- Message sent
- User feedback shown

### Example:

```typescript
// ✅ Clear boundaries
createFilterApplyPathway()
    .expectMilestone('FilterController.handleFilterChange')  // START: User clicked
    .expectMilestone('FilterController.validateFilters')     // Business logic
    .expectMilestone('FilterController.applyFilters')        // Business logic
    .expectMilestone('extension.sendFilteredData')           // Boundary cross
    .expectMilestone('webview.handleFilteredData')           // Reception
    .expectMilestone('SimpleTimelineApp.rerender');          // END: DOM updated
```

---

## Heuristic 3: Pathway Coverage vs Overlap

### Coverage Target: 80/20 Rule

**80% of critical flows** should be covered by **20% of pathways**

Calculate coverage:
```
Coverage = (Unique functions with milestones) / (Total critical functions) × 100%
```

**Critical Functions:**
- Public API methods
- Cross-boundary communication
- Data transformations
- State mutations
- Rendering logic

### Pathway Overlap Strategy:

**Minimize Redundancy:**
- Each pathway should test a **distinct flow**
- Shared components appear in multiple pathways (OK)
- Same exact milestone sequence = redundant pathway (Bad)

**Overlap Analysis:**

```typescript
// Calculate Jaccard similarity
function pathwaySimilarity(pathway1, pathway2): number {
    const set1 = new Set(pathway1.milestones);
    const set2 = new Set(pathway2.milestones);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
}

// ✅ Good: 30% overlap (shared infrastructure)
pathwaySimilarity(DATA_INGESTION, FILTER_APPLY) = 0.30

// ❌ Bad: 90% overlap (redundant pathway)
pathwaySimilarity(FILTER_APPLY, FILTER_APPLY_V2) = 0.90
```

**Rule:** Keep pathway similarity < 60%

---

## Heuristic 4: Variant Pathways

### When to Create Variants

Create pathway variants for:
1. **Different entry points** - Same flow, different triggers
2. **Feature flags** - Optional behavior (with/without caching)
3. **Error scenarios** - Happy path vs error path
4. **Performance modes** - Fast path vs slow path
5. **User roles** - Admin vs regular user

### Variant Naming Convention:

```typescript
// Base pathway
createDataIngestionPathway()           // Default, happy path

// Entry point variants
createManualDataIngestionPathway()     // User triggered
createAutoDataIngestionPathway()       // Timer triggered

// Feature variants
createDataIngestionWithCachingPathway()
createDataIngestionWithoutCachingPathway()

// Scope variants
createMinimalDataIngestionPathway()    // Core flow only
createExtendedDataIngestionPathway()   // + optional features
```

### Heuristic: Variant Justification

Each variant must differ by:
- **At least 30% of milestones** (different flow)
- **OR** test a **distinct failure mode**
- **OR** validate a **specific configuration**

---

## Heuristic 5: Optional Milestones

### When to Mark Milestones Optional

```typescript
.expectOptionalMilestone(context, matcher?)
```

**Use optional milestones for:**
1. **Feature flags** - May not execute if disabled
2. **Conditional logic** - Depends on data (if/else branches)
3. **Performance optimizations** - Cache hits skip work
4. **Degraded modes** - Fallback when primary fails
5. **Async race conditions** - Timing-dependent

### Example:

```typescript
createDataIngestionPathway()
    .expectMilestone('fetchData')                          // Required
    .expectOptionalMilestone('CacheManager.checkCache')    // Only if enabled
    .expectOptionalMilestone('CacheManager.hitCache')      // Only if hit
    .expectMilestone('processData')                        // Required
    .expectOptionalMilestone('Analytics.track')            // Only in prod
    .expectMilestone('renderData');                        // Required
```

### Heuristic: Optional Ratio

**Keep optional milestones < 30% of total**

Too many optional milestones = weak pathway (doesn't enforce flow)

```
Optional Ratio = (Optional milestones) / (Total milestones)

✅ Good:  3 optional / 10 total = 30%
❌ Bad:   8 optional / 10 total = 80%
```

---

## Heuristic 6: Matcher Specificity

### Flexibility vs Precision Trade-off

**Flexible (Recommended):**
```typescript
.expectMilestone('fetchEvents', {
    message: /Fetching.*events/i,     // Regex, case-insensitive
    category: LogCategory.DATA
})
```

**Precise (Brittle):**
```typescript
.expectMilestone('fetchEvents', {
    message: 'Fetching events for repository /exact/path/to/repo',
    data: { repoPath: '/exact/path/to/repo', count: 42 },
    category: LogCategory.DATA
})
```

### Matcher Strength Levels:

1. **Context only** (weakest)
   ```typescript
   .expectMilestone('myFunction')
   ```

2. **Context + Category** (weak)
   ```typescript
   .expectMilestone('myFunction', { category: LogCategory.DATA })
   ```

3. **Context + Message Pattern** (moderate)
   ```typescript
   .expectMilestone('myFunction', { message: /Pattern/i })
   ```

4. **Context + Message + Category** (strong)
   ```typescript
   .expectMilestone('myFunction', {
       message: /Pattern/i,
       category: LogCategory.DATA
   })
   ```

5. **Full specification** (strongest, most brittle)
   ```typescript
   .expectMilestone('myFunction', {
       message: 'Exact string',
       category: LogCategory.DATA,
       data: { specific: 'values' }
   })
   ```

### Heuristic Rule:

**Use Level 3 (moderate) by default**
- Strong enough to catch issues
- Flexible enough to survive refactoring

**Use Level 4-5 only for:**
- Security-critical flows
- Compliance validation
- Financial transactions
- Data integrity checks

---

## Heuristic 7: Performance Budgets

### Pathway Execution Time Targets

```typescript
.expectMilestone(...)
.verify();

expect(asserter).toCompleteWithinTime(budget);
```

**Budget Guidelines:**

| Pathway Type | Budget (ms) | Rationale |
|--------------|-------------|-----------|
| User Interaction | 100ms | Feels instant |
| Data Fetching | 2000ms | User patience limit |
| Rendering | 500ms | Visual smoothness |
| State Persistence | 1000ms | Background operation |
| Network/API | 5000ms | Network variance |

### Performance Milestone Tracking:

```typescript
const asserter = createRenderPipelinePathway();

// Execute...

const result = asserter.verify();

// Analyze timing between milestones
result.timeline.forEach((milestone, i) => {
    if (i > 0 && milestone.reached) {
        const prev = result.timeline[i-1];
        const delta = milestone.timestamp! - prev.timestamp!;
        if (delta > 1000) {
            console.warn(`Slow step: ${prev.milestone.context} → ${milestone.milestone.context} (${delta}ms)`);
        }
    }
});
```

---

## Heuristic 8: Error Coverage

### Every Pathway Needs Error Scenarios

**For each pathway, define:**

1. **Happy path** - Everything works
2. **Early failure** - Fails at first milestone
3. **Mid-flow failure** - Fails after some progress
4. **Timeout/Async failure** - Never completes
5. **Partial success** - Some milestones, not all

### Example:

```typescript
describe('DATA_INGESTION Pathway', () => {
    it('should complete successfully', () => {
        // Happy path
    });

    it('should fail when git provider unavailable', () => {
        // Early failure
        expect(result.failedAtIndex).toBe(1);
    });

    it('should fail when webview unreachable', () => {
        // Mid-flow failure
        expect(result.failedAtIndex).toBeGreaterThan(3);
    });

    it('should timeout if data fetch hangs', () => {
        // Async failure
        expect(result.status).toBe('timeout');
    });
});
```

---

## Heuristic 9: AI Debuggability

### Optimize Pathways for AI Analysis

**Good for AI:**
```typescript
// ✅ Descriptive contexts
.expectMilestone('UserService.authenticateUser')
.expectMilestone('DatabaseAdapter.queryUsers')
.expectMilestone('PermissionChecker.validateAccess')

// ✅ Semantic messages
.expectMilestone('auth', {
    message: /Authentication (succeeded|failed) for user/
})
```

**Bad for AI:**
```typescript
// ❌ Cryptic contexts
.expectMilestone('fn1')
.expectMilestone('fn2')
.expectMilestone('fn3')

// ❌ Vague messages
.expectMilestone('process', {
    message: /Processing/
})
```

### AI-Friendly Heuristics:

1. **Descriptive Context Names**
   - Include class/module: `MyClass.myMethod`
   - Use verbs: `processData`, `validateInput`, `renderUI`

2. **Semantic Log Messages**
   - Include action: "Fetching", "Validating", "Rendering"
   - Include subject: "events", "user", "data"
   - Include outcome: "succeeded", "failed", "completed"

3. **Structured Data**
   ```typescript
   logger.debug(LogCategory.DATA,
       'User authenticated successfully',
       'UserService.authenticate',
       { userId, authMethod, timestamp },  // ← Structured data
       LogPathway.USER_INTERACTION
   );
   ```

---

## Heuristic 10: Pathway Evolution

### When to Update Pathways

**Update pathway when:**
1. **Architecture changes** - New component added to flow
2. **Refactoring** - Function names/contexts change
3. **Performance optimization** - New fast path added
4. **Feature addition** - Optional behavior added
5. **Bug fix** - Error case now handled

**Don't update for:**
- Internal implementation changes (same API)
- Variable renaming (not in logs)
- Comment updates
- Non-functional changes

### Version Pathways

```typescript
// When flow significantly changes, create new version
createDataIngestionPathway_v1()  // Original
createDataIngestionPathway_v2()  // After caching added
createDataIngestionPathway_v3()  // After multi-provider support

// Keep old versions for regression testing
```

### Deprecation Strategy:

1. **Phase 1:** Mark as deprecated, create new version
2. **Phase 2:** Both versions run (60 days)
3. **Phase 3:** Old version runs with warnings (30 days)
4. **Phase 4:** Remove old version

---

## Measurement Metrics

### Track These Metrics:

1. **Pathway Coverage**
   ```
   Coverage = (Functions with milestones) / (Total critical functions)
   Target: > 80%
   ```

2. **Failure Localization Rate**
   ```
   FLR = (Failures pinpointed to exact function) / (Total failures)
   Target: > 90%
   ```

3. **False Positive Rate**
   ```
   FPR = (Tests failed incorrectly) / (Total test runs)
   Target: < 5%
   ```

4. **AI Fix Success Rate**
   ```
   AFSR = (AI-suggested fixes that worked) / (Total AI suggestions)
   Target: > 60%
   ```

5. **Maintenance Cost**
   ```
   MC = (Pathway updates per refactoring) / (Code changes)
   Target: < 0.3
   ```

---

## Decision Framework

### Use This to Decide Pathway Structure:

```
START

Is this a critical user flow?
├─ NO → Don't create pathway
└─ YES → Continue

Does an existing pathway cover 60%+ of this flow?
├─ YES → Create variant of existing pathway
└─ NO → Create new pathway

How many critical transition points? (boundaries, transforms, state changes)
├─ < 5 → Too simple, combine with another flow
├─ 5-12 → Perfect, create pathway
└─ > 12 → Too complex, split into 2 pathways

Can AI understand failure from milestones alone?
├─ NO → Add more semantic milestones
└─ YES → Good to go

Does it survive refactoring (contexts are stable)?
├─ NO → Use more stable milestone contexts
└─ YES → Ship it!
```

---

## Best Practices Summary

### The 10 Commandments of Pathway Design:

1. **5-12 milestones per pathway** - Not too few, not too many
2. **Clear entry/exit points** - Know where flow starts and ends
3. **80/20 coverage** - Cover critical flows first
4. **< 60% similarity** - Minimize pathway overlap
5. **Variants for branches** - Different configs = different pathways
6. **< 30% optional** - Keep flow enforcement strong
7. **Moderate matcher strength** - Balance precision and flexibility
8. **Performance budgets** - Set time expectations
9. **Test error scenarios** - Happy path + 4 failure modes
10. **AI-friendly naming** - Descriptive, semantic, structured

---

## Example: Evaluating a Pathway

```typescript
// Is this a good pathway?
createMyPathway()
    .expectMilestone('start')                                    // ❌ Too generic
    .expectMilestone('MyClass.validateInput')                    // ✅ Descriptive
    .expectOptionalMilestone('cache')                            // ❌ Not specific
    .expectMilestone('process')                                  // ❌ Too generic
    .expectMilestone('DatabaseAdapter.query', {                  // ✅ Good context
        message: /Querying.*records/,                            // ✅ Flexible matcher
        category: LogCategory.DATA
    })
    .expectOptionalMilestone('transform1')                       // ❌ What is this?
    .expectOptionalMilestone('transform2')                       // ❌ Too many optional
    .expectOptionalMilestone('transform3')
    .expectMilestone('ApiClient.sendResponse');                  // ✅ Clear end

// Score: 4/10 milestones good = 40% quality
// Needs improvement!
```

**Improved Version:**

```typescript
createDataProcessingPathway()
    .expectMilestone('DataProcessor.receive', {                  // ✅ Clear entry
        message: /Received.*request/
    })
    .expectMilestone('InputValidator.validate')                  // ✅ Explicit step
    .expectOptionalMilestone('CacheManager.lookup')              // ✅ Justified optional
    .expectMilestone('DatabaseAdapter.query', {                  // ✅ External call
        message: /Querying.*records/,
        category: LogCategory.DATA
    })
    .expectMilestone('DataTransformer.transform')                // ✅ Critical transform
    .expectMilestone('ApiClient.sendResponse', {                 // ✅ Clear exit
        message: /Response sent.*200/
    });

// Score: 6/6 milestones good = 100% quality!
```

---

## Conclusion

Good pathway design is both art and science:

**Science:** Follow heuristics, measure metrics
**Art:** Understand data flows, anticipate failures

Use these heuristics as guidelines, not rigid rules. The goal is **AI-debuggable tests that survive refactoring while catching real issues**.

---

**Remember:** The best pathway is one that **fails loudly and specifically** when something breaks!
