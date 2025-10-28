# Knowledge View Modes Architecture

**Created:** 2025-01-27
**Status:** Implementation in Progress
**Estimated Time:** 16-20 hours

## Overview

This document describes the architecture for multiple view modes in the Knowledge Management tab, allowing users to view and organize knowledge items by different grouping strategies beyond just templates.

## Problem Statement

Currently, the Knowledge tab only displays items grouped by their source templates (providence). However, the backend infrastructure (`GroupTypes.ts`, `GroupOperationsService`) supports 5 different grouping strategies:

1. **TEMPLATE** - By source template (✅ Currently implemented)
2. **OPERATOR_RANGE** - By operator experience level (1-5) ❌ Missing UI
3. **PROJECT_RANGE** - By project maturity phase (1-5) ❌ Missing UI
4. **COMPLEXITY_RANGE** - By domain complexity (1-3) ❌ Missing UI
5. **CATCHMENT** - By maturity catchment basin status ❌ Missing UI

## Design Goals

1. **Pluggable Architecture** - Easy to add new view modes without modifying core logic
2. **Consistent UI** - All views share common interaction patterns
3. **Backend Reuse** - Leverage existing GroupOperationsService infrastructure
4. **Smooth Switching** - Users can switch between views seamlessly
5. **Injection Support** - Each view supports injecting its grouping into claude.md files

## Architecture Components

### 1. ViewMode Enumeration

```typescript
// packages/core/src/domains/visualization/ui/knowledge/ViewMode.ts

export enum ViewMode {
  BY_TEMPLATE = 'by_template',           // Group by source template
  BY_OPERATOR = 'by_operator',           // Group by operator level
  BY_PROJECT = 'by_project',             // Group by project phase
  BY_COMPLEXITY = 'by_complexity',       // Group by complexity level
  BY_CATCHMENT = 'by_catchment'          // Group by catchment status
}
```

### 2. Base Group View Controller

Abstract base class that all group view controllers extend:

```typescript
// packages/core/src/domains/visualization/ui/knowledge/BaseGroupViewController.ts

export interface GroupViewCallbacks {
  onInjectGroup: (groupType: GroupType, groupId: string, itemIds: string[]) => void;
  onRemoveGroup: (groupType: GroupType, groupId: string) => void;
  onShowNotification: (message: string, type: string, duration: number) => void;
}

export abstract class BaseGroupViewController {
  protected items: KnowledgeItem[] = [];
  protected maturityContext: MaturityContext | null = null;

  constructor(protected callbacks: GroupViewCallbacks) {}

  // Abstract methods that subclasses must implement
  abstract render(items: KnowledgeItem[]): void;
  abstract getGroupType(): GroupType;
  abstract calculateGroups(items: KnowledgeItem[]): Map<string, KnowledgeItem[]>;

  // Common methods shared by all views
  setItems(items: KnowledgeItem[]): void {
    this.items = items;
    this.render(items);
  }

  setMaturityContext(context: MaturityContext | null): void {
    this.maturityContext = context;
    this.render(this.items);
  }

  protected renderGroupHeader(groupId: string, groupLabel: string, itemCount: number): HTMLElement {
    // Common header rendering logic
  }

  protected renderGroupActions(groupId: string, itemIds: string[]): HTMLElement {
    // Common action buttons (inject, remove)
  }
}
```

### 3. View Mode Controller

Manages the active view mode and orchestrates switching:

```typescript
// packages/core/src/domains/visualization/ui/knowledge/ViewModeController.ts

export class ViewModeController {
  private currentMode: ViewMode = ViewMode.BY_TEMPLATE;
  private viewControllers: Map<ViewMode, BaseGroupViewController> = new Map();

  constructor(private containerElement: HTMLElement) {}

  registerView(mode: ViewMode, controller: BaseGroupViewController): void {
    this.viewControllers.set(mode, controller);
  }

  setViewMode(mode: ViewMode): void {
    const controller = this.viewControllers.get(mode);
    if (!controller) {
      throw new Error(`View controller for mode ${mode} not registered`);
    }

    this.currentMode = mode;
    this.renderActiveView();
  }

  getActiveController(): BaseGroupViewController | undefined {
    return this.viewControllers.get(this.currentMode);
  }

  private renderActiveView(): void {
    // Hide all views, show active
    this.viewControllers.forEach((controller, mode) => {
      const element = this.getViewElement(mode);
      element.style.display = mode === this.currentMode ? 'block' : 'none';
    });
  }
}
```

### 4. Specific View Controllers

Each grouping strategy has its own controller:

#### OperatorRangeViewController
Groups items by operator experience levels (1=Novice through 5=Expert).

```typescript
export class OperatorRangeViewController extends BaseGroupViewController {
  getGroupType(): GroupType {
    return GroupType.OPERATOR_RANGE;
  }

  calculateGroups(items: KnowledgeItem[]): Map<string, KnowledgeItem[]> {
    // Group items by operator maturity ranges
    // Items with maturity.operator.min=1, max=2 go in "Novice-Junior" group
    // Items with maturity.operator.min=3, max=4 go in "Mid-Senior" group, etc.
  }
}
```

#### ProjectRangeViewController
Groups items by project maturity phases (1=Planning through 5=Mature).

#### ComplexityRangeViewController
Groups items by domain complexity (1=Simple, 2=Standard, 3=Complex).

#### CatchmentViewController
Groups items by their catchment basin status relative to user's current context.

### 5. View Switcher UI

Tab-based switcher at the top of the Knowledge panel:

```html
<div class="knowledge-view-switcher">
  <button data-view="by_template" class="view-tab active">📦 By Template</button>
  <button data-view="by_operator" class="view-tab">👤 By Operator Level</button>
  <button data-view="by_project" class="view-tab">📊 By Project Phase</button>
  <button data-view="by_complexity" class="view-tab">🎯 By Complexity</button>
  <button data-view="by_catchment" class="view-tab">🎪 By Relevance</button>
</div>
```

## Data Flow

### View Mode Switching
1. User clicks view tab
2. ViewModeController.setViewMode() called
3. Active controller retrieved
4. Container visibility toggled
5. Active controller renders its groups

### Item Rendering
1. KnowledgeViewController receives items from backend
2. Distributes items to all registered view controllers
3. Each controller calculates its groups
4. Only active view is visible

### Group Injection
1. User clicks "💉 Inject" button on a group
2. Controller calls `callbacks.onInjectGroup(groupType, groupId, itemIds)`
3. KnowledgeViewController sends message to backend
4. Backend uses GroupOperationsService to inject
5. Claude.md file updated with group markers

## File Structure

```
packages/core/src/domains/visualization/ui/knowledge/
├── ViewMode.ts                          # ViewMode enum
├── ViewModeController.ts                # View orchestrator
├── BaseGroupViewController.ts           # Abstract base class
├── OperatorRangeViewController.ts       # Operator level view
├── ProjectRangeViewController.ts        # Project phase view
├── ComplexityRangeViewController.ts     # Complexity view
├── CatchmentViewController.ts           # Catchment view
└── V1TemplatesTableController.ts        # Existing template view (refactored to extend base)
```

## CSS Styling

```css
/* View switcher tabs */
.knowledge-view-switcher {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--vscode-panel-border);
}

.view-tab {
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.view-tab:hover {
  background: var(--vscode-list-hoverBackground);
}

.view-tab.active {
  border-bottom-color: var(--vscode-textLink-activeForeground);
  font-weight: 600;
}

/* Group containers */
.group-view-container {
  display: none; /* Hidden by default, shown when active */
}

.group-view-container.active {
  display: block;
}

/* Group sections */
.group-section {
  margin-bottom: 16px;
  border: 1px solid var(--vscode-panel-border);
  border-radius: 4px;
}

.group-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--vscode-sideBar-background);
  border-bottom: 1px solid var(--vscode-panel-border);
  cursor: pointer;
}

.group-section-actions {
  display: flex;
  gap: 8px;
}

.group-item-list {
  padding: 8px;
}
```

## Implementation Phases

### Phase 1: Core Infrastructure (4-5 hours)
- Create ViewMode enum
- Create BaseGroupViewController
- Create ViewModeController
- Add view switcher UI
- Wire up in KnowledgeViewController

### Phase 2: View Controllers (8-10 hours)
- Implement OperatorRangeViewController
- Implement ProjectRangeViewController
- Implement ComplexityRangeViewController
- Implement CatchmentViewController
- Refactor V1TemplatesTableController to extend base

### Phase 3: Integration (4-5 hours)
- Add group injection handling
- Wire up preview dialogs
- Add status indicators
- Backend message handlers
- CSS styling
- i18n translations

## Success Criteria

1. ✅ Users can switch between 5 different view modes
2. ✅ Each view correctly groups items by its dimension
3. ✅ Inject button works for each group type
4. ✅ Preview dialog shows correct items for each group
5. ✅ Status indicators show injection state
6. ✅ All views respect maturity context filtering
7. ✅ Smooth UX with no flickering during switches

## Migration Strategy

**Backwards Compatibility:**
- Template view remains default
- Existing template-based workflows unchanged
- New views are additive, not breaking

**User Education:**
- Tooltip on each tab explaining the grouping
- Help text in each view explaining what it shows
- Examples in documentation

## Future Enhancements

1. **Custom Views** - Allow users to define custom grouping rules
2. **Multi-View** - Show multiple views simultaneously (split screen)
3. **Saved Filters** - Save frequently used view + filter combinations
4. **Analytics** - Track which views users prefer
5. **Export** - Export groups to markdown, JSON, or other formats
