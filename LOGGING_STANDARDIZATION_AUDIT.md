# Logging Standardization Audit

**Purpose:** Track conversion of old logging patterns to pathway-compatible standard logging
**Standard Pattern:**
```typescript
logger.debug(
    LogCategory.CATEGORY,
    'Descriptive message',
    'ClassName.methodName',
    { data },
    LogPathway.PATHWAY_NAME
);
```

**Created:** 2025-10-03
**Status:** In Progress

---

## Priority 1: Critical Orchestration Components

These components are core to pathway testing and should be standardized first.

### ✅ Completed

| File | Old Pattern | Lines Changed | Pathways | Status |
|------|-------------|---------------|----------|--------|
| FilterStateManager.ts | `createContextLogger` | 6 methods | STATE_PERSIST | ✅ Complete |

### 🔴 High Priority - Using `createContextLogger`

| File | Current Usage | Estimated Effort | Target Pathway | Priority |
|------|---------------|------------------|----------------|----------|
| orchestration/DataOrchestrator.ts | `createContextLogger` | Low (already has some standard logs) | DATA_INGESTION | **HIGH** |
| orchestration/EventMatcher.ts | `createContextLogger` | Medium | FILTER_APPLY | **HIGH** |
| providers/git/GitProvider.ts | `createContextLogger` | High (complex component) | DATA_INGESTION | **HIGH** |
| providers/github/GitHubProvider.ts | `createContextLogger` | High | DATA_INGESTION | Medium |
| providers/github/GitHubClient.ts | `createContextLogger` | Medium | DATA_INGESTION | Medium |
| providers/github/RateLimitManager.ts | `createContextLogger` | Low | DATA_INGESTION | Low |
| extension.ts | `createContextLogger` | Low | CONFIG_SYNC | Medium |

**Total files with `createContextLogger`:** 7 remaining (8 total, 1 completed)

---

## Priority 2: Components with `console.log()`

These files use console.log() which should be replaced with pathway-aware logging where appropriate.

### Orchestration Layer
- `orchestration/ProviderRegistry.ts` - Medium priority (orchestration component)
- `orchestration/DataOrchestrator.ts` - High priority (already partially standardized)

### Data/Timeline Layer
- `timeline/infrastructure/GitEventRepository.ts` - High priority (already has pathway logs)
- `timeline/integration/TimelineDataAdapter.ts` - Medium priority
- `timeline/core/RepositoryFilterMemoryService.ts` - Low priority
- `timeline/core/git-pr-detector.ts` - Low priority

### Visualization/UI Layer
- `visualization/ui/FilterController.ts` - High priority (already has pathway logs)
- `visualization/ui/UIControllerManager.ts` - Medium priority
- `visualization/ui/PopupController.ts` - Low priority
- `visualization/ui/ThemeController.ts` - Low priority
- `visualization/d3/EventRenderer.ts` - Low priority (visualization code)
- `visualization/d3/D3TimelineRenderer.ts` - Low priority
- `visualization/d3/LegendRenderer.ts` - Low priority
- `visualization/d3/TimelineRenderer.ts` - Low priority
- `visualization/d3/InteractionHandler.ts` - Low priority
- `visualization/renderers/D3TimelineRendererImpl.ts` - Low priority
- `visualization/registry/RendererRegistry.ts` - Low priority
- `visualization/theme/EventVisualTheme.ts` - Low priority

### Provider Layer
- `providers/timeline-provider-webpack.ts` - Medium priority

### Webview Layer (Note: May use WebviewLogger instead)
- `webview/SimpleTimelineApp.ts` - Low priority (webview context)
- `webview/main.ts` - Low priority (webview context)
- `webview/WebviewLogger.ts` - Skip (webview-specific logger)

### Utilities
- `utils/git-project-manager.ts` - Low priority
- `utils/Logger.ts` - Skip (logger implementation itself)

**Total files with console.log():** 24 files

---

## Standardization Strategy

### Phase 1 Cleanup (Current)
Focus on **orchestration and data layer** components that are critical for pathway testing:

1. **EventMatcher.ts** (HIGH) - FILTER_APPLY pathway
   - Used in filter application flow
   - Test suite waiting: filter-pipeline tests

2. **DataOrchestrator.ts** (HIGH) - DATA_INGESTION pathway
   - Already partially standardized
   - Complete remaining `createContextLogger` usage
   - Enable deferred DataOrchestrator pathway tests

3. **GitProvider.ts** (HIGH) - DATA_INGESTION pathway
   - Core data ingestion component
   - Complex but critical for full pathway coverage

4. **ProviderRegistry.ts** (MEDIUM) - CONFIG_SYNC pathway
   - Provider management and configuration
   - Needed for multi-provider testing

### Phase 2 Expansion
Continue with **provider and UI layer** components:

5. **GitHubProvider.ts** (MEDIUM)
6. **GitHubClient.ts** (MEDIUM)
7. **timeline-provider-webpack.ts** (MEDIUM)
8. UI controllers as needed for UI pathway tests

### Phase 3+ (Future)
- Visualization components (Low priority - render layer)
- Webview components (Use WebviewLogger or standard logger as appropriate)
- Utility components

---

## Standard Logging Conversion Checklist

For each file being standardized:

- [ ] Read file and identify all logging statements
- [ ] Determine appropriate pathway(s) for the component
- [ ] Replace `createContextLogger` with direct `logger` imports
- [ ] Update all logging calls to standard pattern:
  - [ ] Add LogCategory
  - [ ] Add context as 'ClassName.methodName'
  - [ ] Add data object (if relevant)
  - [ ] Add LogPathway
- [ ] Remove old logger instance creation
- [ ] Create pathway tests for the component
- [ ] Verify tests pass
- [ ] Update this audit document

---

## Impact Metrics

### Current State
- ✅ 1 file fully standardized (FilterStateManager)
- ⏳ 7 files using `createContextLogger`
- ⏳ 24 files using `console.log()`
- ✅ Standard pattern established and documented

### Target State (Phase 1 Cleanup)
- Convert 3-4 high-priority orchestration components
- Enable DataOrchestrator pathway tests (9 tests)
- Achieve 50-60% pathway coverage
- Validate pattern scales across different component types

---

## Notes

### Webview Logging
Webview components may need special handling:
- WebviewLogger exists for browser context logging
- May need pathway support in WebviewLogger
- Or may use standard logger if running in extension host context

### Visualization Component Strategy
Low-priority visualization/rendering code should only get pathway logging if:
1. It's part of a critical rendering pathway we want to test
2. It has existing bugs that pathway testing could help debug
3. It's being actively developed/refactored

Otherwise, console.log() is acceptable for these components.

### Test-Driven Standardization
Follow the pattern established with FilterStateManager:
1. Write pathway tests first (they will fail)
2. Standardize logging to make tests pass
3. Validate with 100% pass rate

This ensures standardization serves the testing goal rather than being busy work.

---

**Next Action:** Standardize EventMatcher.ts (HIGH priority, FILTER_APPLY pathway)
