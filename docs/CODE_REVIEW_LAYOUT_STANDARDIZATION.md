# Code Structure Review - Layout Standardization Plan

**Date:** 2025-10-29
**Goal:** Standardize layout between Overview and Category views with tab-based navigation

## Design Reference
- **Overview.png**: Shows Overview tab layout with Categories filter
- **Category.png**: Shows Category tab layout without Categories filter

## Layout Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Overview] [UI/UX] [Test Coverage] [Internationalization] [Feature...]      │
│                                             [Maturity ▼] [Run Analysis]     │
├─────────────────────────────────────────────────────────────────────────────┤
│ 🔍 Filters ▼ (collapsed by default)                                        │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ [Search...] [Categories*] [Severity] [Score Range] [File Pattern]      │ │
│ │ [Apply] [Reset]                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ 💡 AI Suggestions ▼ (collapsed by default, filtered)                       │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ [Suggestion cards matching: active tab + all filters]                  │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ 📊 Visualizations:                                                          │
│ [Gauge] [Bubble] [Radar] [Sankey] [Stacked Bar] [Sunburst] ...            │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ [Active visualization shown here - maximized space]                    │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘

*Categories filter only shown on Overview tab
```

## Fixed Category Tabs

1. **Overview** - Shows all categories combined
2. **UI/UX Quality** - Category-specific view
3. **Test Coverage** - Category-specific view
4. **Internationalization** - Category-specific view
5. **Feature Completeness** - Category-specific view

## Key Changes

### Remove
- ❌ Breadcrumb navigation system
- ❌ Refresh button
- ❌ "View Categories" button
- ❌ Current inline filter toggle button
- ❌ Concurrent visualization layout (all visible at once)

### Add/Change
- ✅ Tab-based navigation (Overview + 4 categories)
- ✅ Collapsible Filter section (default: collapsed)
- ✅ Collapsible AI Suggestions (default: collapsed)
- ✅ Tabbed visualization structure
- ✅ Filter AI Suggestions by active tab + all filter criteria

## Filter Behavior

### Overview Tab Filters:
- **Search**: Text search across issues, files, categories
- **Categories**: Multi-select checkboxes (UI/UX, Test Coverage, I18n, Features)
- **Severity**: Multi-select (Critical, High, Medium, Low)
- **Score Range**: Min/Max numeric inputs
- **File Pattern**: Text input (glob pattern)

### Category Tab Filters:
- Same as Overview **EXCEPT no Categories filter** (already in specific category)

### AI Suggestions Filtering:
- Apply ALL active filters to suggestions:
  - Active tab/category
  - Search query
  - Severity selection
  - Score range
  - File pattern
- Show only suggestions matching criteria

## Visualization Tabs

### Overview Tab Visualizations:
1. **Gauge** - Overall health score
2. **Bubble Chart** - Category overview
3. **Radar Chart** - Category comparison
4. **Sankey Diagram** - Issue flow
5. **Stacked Bar** - Severity distribution
6. **Sunburst** - File hierarchy

### Category Tab Visualizations:
1. **Gauge** - Category score
2. **Radar Chart** - Actual vs Target
3. **Sankey Diagram** - File-to-severity flow
4. **Stacked Bar** - Severity breakdown
5. **Tree Map** - File distribution
6. **Issue List** - Detailed issues

## Implementation Tasks

### 1. Header Component (CodeStructureViewController)
- Create tab navigation bar
- Fixed tabs: Overview + 4 categories
- Right side: Maturity dropdown + Run Analysis button
- Tab switching updates URL hash
- Active tab styling

### 2. Filter Component (New: CollapsibleFilterPanel)
- Collapsible section (default: collapsed)
- Header: "🔍 Filters ▼"
- Search input (left)
- Filter groups (horizontal layout):
  - Categories (Overview only)
  - Severity (checkboxes)
  - Score Range (min/max inputs)
  - File Pattern (text input)
- Apply + Reset buttons
- Emit filter change events

### 3. AI Suggestions Component (SuggestionPanel)
- Make collapsible (default: collapsed)
- Header: "💡 AI Suggestions ▼"
- Filter suggestions by:
  - Active tab/category
  - All filter criteria (search, severity, score, file pattern)
- Show filtered count in header

### 4. Visualization Tabs (New: VisualizationTabManager)
- Sub-tab navigation for visualizations
- Each viz in separate tab (maximizes space)
- Same structure for Overview and Category views
- Lazy load visualizations (only render active tab)

### 5. OverviewPanel Refactor
- Remove breadcrumbs
- Remove refresh/view categories buttons
- Use VisualizationTabManager
- Connect to CollapsibleFilterPanel

### 6. CategoryDetailPanel Refactor
- Remove breadcrumbs
- Use VisualizationTabManager
- Connect to CollapsibleFilterPanel (without Categories filter)

### 7. VisualizationCoordinator Updates
- Handle tab-based navigation
- Update state machine (no breadcrumb states)
- Filter data based on active tab + filters

### 8. NavigationBreadcrumb
- Delete component (no longer needed)

## Files to Modify

### Core Visualization Files:
- `/packages/core/src/domains/visualization/ui/code-structure/CodeStructureViewController.ts`
- `/packages/core/src/domains/visualization/webview/ui-panels/OverviewPanel.ts`
- `/packages/core/src/domains/visualization/webview/ui-panels/CategoryDetailPanel.ts`
- `/packages/core/src/domains/visualization/webview/ui-panels/NavigationBreadcrumb.ts` (DELETE)
- `/packages/core/src/domains/visualization/webview/coordination/VisualizationCoordinator.ts`

### New Components to Create:
- `/packages/core/src/domains/visualization/webview/ui-panels/CollapsibleFilterPanel.ts`
- `/packages/core/src/domains/visualization/webview/ui-panels/VisualizationTabManager.ts`

### Styles:
- `/packages/core/src/domains/visualization/styles/components/tabs.css` (new)
- `/packages/core/src/domains/visualization/styles/components/filters.css` (update)

## Success Criteria

✅ Tab navigation works (Overview + 4 categories)
✅ Filters are collapsible (default collapsed)
✅ AI Suggestions are collapsible (default collapsed) and filtered
✅ Visualizations in tabs (maximized space)
✅ No breadcrumbs anywhere
✅ Categories filter only on Overview tab
✅ All filters apply to AI Suggestions
✅ Consistent layout between Overview and Category views

## Testing Checklist

- [ ] Switch between tabs (Overview ↔ Categories)
- [ ] Expand/collapse Filters section
- [ ] Expand/collapse AI Suggestions section
- [ ] Apply filters and verify AI Suggestions update
- [ ] Switch visualization tabs
- [ ] Verify Categories filter only on Overview
- [ ] Run Analysis from any tab
- [ ] Change Maturity level from any tab
- [ ] Verify cached data persists across tab switches

---

**Implementation Priority:** High
**Estimated Effort:** Large refactor (multiple components)
**Risk:** Medium (significant UI restructuring)
