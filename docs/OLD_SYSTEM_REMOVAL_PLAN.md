# Old System Removal Plan

## Overview
Remove the old batch-processing Code Structure Review system completely. The streaming architecture is now the only implementation.

## Files to Remove (Old System)

### 1. Old Analyzers (categories/)
```
packages/core/src/domains/code-structure-review/categories/
├── base/
│   ├── AnalysisCategory.ts          ❌ REMOVE
│   ├── CategoryRegistry.ts          ❌ REMOVE
│   └── CategoryTypes.ts             ❌ REMOVE
├── priority1/
│   ├── FeatureCompletenessAnalyzer.ts        ❌ REMOVE
│   ├── FeatureCompletenessAnalyzer.refactored.ts  ❌ REMOVE (orphaned)
│   ├── UIUXQualityAnalyzer.ts       ❌ REMOVE
│   └── TestCoverageAnalyzer.ts      ❌ REMOVE
└── priority2/
    └── InternationalizationAnalyzer.ts  ❌ REMOVE
```

### 2. Old Orchestration & Processing (analysis/)
```
packages/core/src/domains/code-structure-review/analysis/
├── CategoryOrchestrator.ts          ❌ REMOVE
├── SourceFileParser.ts              ❌ REMOVE
├── AnalysisContext.ts               ❌ REMOVE
├── ResultAggregator.ts              ❌ REMOVE
└── StreamingFileProcessor.ts        ❌ REMOVE (duplicate, old version)
```

### 3. Old Detectors (detectors/)
```
packages/core/src/domains/code-structure-review/detectors/
├── FeatureDetectors.ts              ❌ REMOVE
├── UIUXDetectors.ts                 ❌ REMOVE
└── I18nDetectors.ts                 ❌ REMOVE
```

### 4. Old Registry (registries/)
```
packages/core/src/domains/code-structure-review/registries/
└── MetadataRegistry.ts              ❌ REMOVE (old version)
```

### 5. Old VSCode Provider
```
packages/vscode/src/providers/
└── CodeStructureReviewProvider.ts   ❌ REMOVE (replaced by .streaming.ts)
```

## Files to Keep (New System + Utilities)

### New Streaming Architecture
```
packages/core/src/domains/code-structure-review/
├── registries/                      ✅ KEEP (all files)
├── streaming/                       ✅ KEEP (all files)
├── analyzers/                       ✅ KEEP (all files)
├── orchestration/                   ✅ KEEP (all files)
├── types.ts                         ✅ KEEP (update exports)
└── index.ts                         ✅ KEEP (major update)
```

### Utility Modules (Independent)
```
packages/core/src/domains/code-structure-review/
├── ai/                              ✅ KEEP (prompt generation)
├── reporting/                       ✅ KEEP (reports, knowledge items)
└── data-builders/                   ✅ KEEP (visualization data)
```

### New VSCode Provider
```
packages/vscode/src/providers/
└── CodeStructureReviewProvider.streaming.ts  ✅ KEEP (rename to remove .streaming)
```

## Removal Steps

### Step 1: Remove Old Analyzers
- Delete entire `categories/` directory

### Step 2: Remove Old Orchestration
- Delete `analysis/CategoryOrchestrator.ts`
- Delete `analysis/SourceFileParser.ts`
- Delete `analysis/AnalysisContext.ts`
- Delete `analysis/ResultAggregator.ts`
- Delete `analysis/StreamingFileProcessor.ts` (duplicate)
- Delete empty `analysis/` directory

### Step 3: Remove Old Detectors
- Delete entire `detectors/` directory

### Step 4: Remove Old Registry
- Delete `registries/MetadataRegistry.ts`

### Step 5: Remove Old VSCode Provider
- Delete `packages/vscode/src/providers/CodeStructureReviewProvider.ts`
- Rename `CodeStructureReviewProvider.streaming.ts` → `CodeStructureReviewProvider.ts`

### Step 6: Update Exports
- Update `packages/core/src/domains/code-structure-review/index.ts`
  - Remove old orchestrator exports
  - Remove old analyzer exports
  - Remove old category exports
  - Export new streaming modules

### Step 7: Update Types
- Review `packages/core/src/domains/code-structure-review/types.ts`
- Remove unused types from old system
- Keep types used by utilities (ai, reporting, data-builders)

### Step 8: Verify and Build
- Build core package
- Build vscode package
- Fix any broken imports
- Package VSIX

## Impact Analysis

### Breaking Changes
- ✅ No external API changes (streaming provider has same interface)
- ✅ No command changes needed
- ✅ No settings changes needed

### Benefits
- ✅ Cleaner codebase (~15 files removed, ~5000 lines of code)
- ✅ No confusion about which system to use
- ✅ Easier maintenance
- ✅ Better performance

## Validation
After removal:
1. ✅ TypeScript compilation succeeds
2. ✅ VSIX builds successfully
3. ✅ Extension activates without errors
4. ✅ Code Structure Review command works

## Rollback Plan
Git commit before removal. If issues arise:
```bash
git revert HEAD
```
