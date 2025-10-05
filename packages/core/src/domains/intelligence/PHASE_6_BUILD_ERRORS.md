# Phase 6 Build Errors - Fix List

**Total Errors:** 25
**Build Attempted:** Just now

## Error Categories

### 1. Missing Files (2 errors)
- `PathwayLearningAdapter.ts` - Already exists but not exported correctly
- `IntelligenceAdapter.ts` - File exists, likely import issue

### 2. Type Naming Issues (5 errors)  
- ExtensionAPI.ts: `Pattern` should be `RuntimePattern`
- ExtensionLoader.ts: `Pattern` should be `RuntimePattern`
- PatternConverter.ts: `LearningRuntimePattern` typo (sed error) - should be `LearningPattern`
- PatternConverter.ts: `RuntimeRuntimePattern` typo - should be `RuntimePattern`

### 3. Duplicate Exports (12 errors)
- `learning/index.ts` exports types that are already exported by sub-modules
- `intelligence/index.ts` exports LearningSystem twice

### 4. Type Definition Conflicts (4 errors)
- PropagationResult defined in both types.ts and LearningPropagator.ts
- FileScanner defined in both types.ts and LearningPropagator.ts
- Need to remove duplicates from LearningPropagator.ts

### 5. Interface Compliance (2 errors)
- IntelligenceProvider missing `capabilities` property
- VisualizationHints doesn't have `tags` property

## Fix Order (Easy → Hard)

1. ✅ Fix typos in PatternConverter.ts (LearningRuntimePattern, RuntimeRuntimePattern)
2. ✅ Fix Pattern → RuntimePattern in Extension files
3. ✅ Remove duplicate type definitions in LearningPropagator.ts
4. ✅ Fix duplicate exports in index files
5. ✅ Add capabilities to IntelligenceProvider
6. ✅ Fix VisualizationHints tags property
7. ✅ Ensure PathwayLearningAdapter is properly created

**Status: Ready to fix systematically**

---

## Second Build (After Initial Fixes)

**Errors Reduced:** 25 → 12 (52% reduction!)

### Remaining Issues:

1. **IntelligenceAdapter.ts missing** - Base adapter interface not created yet
2. **Pattern vs RuntimePattern** - Still some references in ExtensionAPI not fixed
3. **Analyzer export conflict** - Still conflicting despite fix attempt
4. **LearningSystem exports** - Still duplicating from types
5. **Capabilities type mismatch** - IntelligenceProvider capabilities doesn't match interface

**Status: Continue fixing...**
