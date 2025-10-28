# Unified Knowledge Table Architecture

**Created:** 2025-01-27
**Status:** Implementation in Progress (Revised Design)
**Estimated Time:** 8-10 hours (much simpler than tab-based approach)

## Overview

Single knowledge table with pluggable grouping strategies. Users select grouping mode from a dropdown, and the table re-groups items accordingly.

## Design Principle

**One table, multiple groupings** - Strategy Pattern instead of multiple view controllers.

## Architecture

### 1. GroupingStrategy Interface

Lightweight strategies that calculate groups without full UI controllers:

```typescript
interface GroupingStrategy {
  // Unique identifier for this strategy
  getMode(): ViewMode;

  // GroupType for injection operations
  getGroupType(): GroupType;

  // Calculate groups from items
  calculateGroups(items: KnowledgeItem[]): GroupSection[];

  // Display name
  getLabel(): string;

  // Icon for dropdown
  getIcon(): string;
}
```

### 2. Concrete Strategies

Each grouping mode is a simple strategy class:

- **TemplateGroupingStrategy** - Group by source template (default)
- **OperatorGroupingStrategy** - Group by operator level (1-5)
- **ProjectGroupingStrategy** - Group by project phase (1-5)
- **ComplexityGroupingStrategy** - Group by complexity (1-3)
- **CatchmentGroupingStrategy** - Group by relevance (IN/PARTIAL/OUT)

### 3. Unified Table Controller

Single controller that swaps strategies:

```typescript
class UnifiedKnowledgeTableController {
  private currentStrategy: GroupingStrategy;
  private strategies: Map<ViewMode, GroupingStrategy>;

  setGrouping(mode: ViewMode): void {
    this.currentStrategy = this.strategies.get(mode);
    this.render(this.items);
  }

  render(items: KnowledgeItem[]): void {
    const groups = this.currentStrategy.calculateGroups(items);
    this.renderGroups(groups);
  }
}
```

### 4. Group-By Selector UI

Simple dropdown above the table:

```html
<div class="knowledge-header">
  <div class="group-by-selector">
    <label>Group by:</label>
    <select id="grouping-mode">
      <option value="by_template">📦 Template</option>
      <option value="by_operator">👤 Operator Level</option>
      <option value="by_project">📊 Project Phase</option>
      <option value="by_complexity">🎯 Complexity</option>
      <option value="by_catchment">🎪 Relevance</option>
    </select>
  </div>
  <button id="toggle-all">Expand/Collapse All</button>
</div>
```

## Benefits Over Tab-Based Approach

| Aspect | Tab-Based ❌ | Unified ✅ |
|--------|-------------|-----------|
| View Controllers | 5 separate | 1 unified |
| DOM Containers | 5 (show/hide) | 1 (always visible) |
| Rendering Logic | Duplicated 5x | Shared, DRY |
| Code Complexity | ~2000 lines | ~800 lines |
| Context Loss | Yes (switching tabs) | No (same table) |
| Implementation Time | 16-20 hours | 8-10 hours |

## Implementation Plan

### Phase 1: Core Infrastructure (2-3 hours)
1. Create GroupingStrategy interface
2. Update ViewMode types (already done)
3. Create TemplateGroupingStrategy (extract from V1TemplatesTableController)

### Phase 2: Additional Strategies (3-4 hours)
1. OperatorGroupingStrategy
2. ProjectGroupingStrategy
3. ComplexityGroupingStrategy
4. CatchmentGroupingStrategy

### Phase 3: Unified Controller (2-3 hours)
1. Create UnifiedKnowledgeTableController or refactor V1TemplatesTableController
2. Add strategy registry and switching
3. Wire up group-by dropdown
4. Handle injection for all group types

### Phase 4: Polish (1-2 hours)
1. CSS styling for dropdown
2. i18n translations
3. Testing
4. Build verification

## File Structure

```
packages/core/src/domains/visualization/ui/knowledge/
├── GroupingStrategy.ts                    # Interface + base
├── strategies/
│   ├── TemplateGroupingStrategy.ts        # Default
│   ├── OperatorGroupingStrategy.ts
│   ├── ProjectGroupingStrategy.ts
│   ├── ComplexityGroupingStrategy.ts
│   └── CatchmentGroupingStrategy.ts
└── UnifiedKnowledgeTableController.ts     # Unified table
```

## Migration Notes

**Discard:**
- ViewModeController.ts (not needed)
- BaseGroupViewController.ts (too heavy)
- Separate view containers in HTML

**Keep:**
- ViewMode.ts (enum and types)
- GroupSection interface
- Existing V1TemplatesTableController rendering logic (extract to unified)

## User Experience

1. User opens Knowledge tab
2. Sees table grouped by Template (default)
3. Clicks "Group by:" dropdown
4. Selects "👤 Operator Level"
5. Table instantly re-groups items by operator level
6. Same expand/collapse, inject, remove buttons work
7. No context loss, no tab switching

## Success Criteria

✅ Single dropdown changes grouping mode
✅ All 5 grouping modes work correctly
✅ Inject button works for each group type
✅ Preview dialogs show correct items
✅ Status indicators show injection state
✅ No code duplication
✅ Smooth UX, no flickering
