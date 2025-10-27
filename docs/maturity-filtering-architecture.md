# Maturity-Based Knowledge Filtering: Architectural Design

**Version**: 1.0
**Date**: 2025-10-27
**Status**: Design Phase - Not Yet Implemented

## Executive Summary

This document defines the architecture for Agent Brain Platform's maturity-based knowledge filtering system. The system enables users to configure their current context (Operator Experience, Project Phase, Domain Complexity) and automatically filters knowledge items and templates to show only relevant content for their situation.

## 1. Problem Space

### 1.1 Core Challenge

Knowledge management systems face a fundamental problem: **not all knowledge is relevant to all users at all times**. A junior developer working on a greenfield project has different needs than a senior architect maintaining a mature enterprise system.

### 1.2 Three-Dimensional Context

Agent Brain Platform models user context across three dimensions:

1. **Operator Experience** (5 levels): Novice → Junior → Mid → Senior → Expert
2. **Project Phase** (5 levels): Planning → Inception → Development → Established → Mature
3. **Domain Complexity** (3 levels): Simple → Standard → Complex

This creates a **3D maturity space** where each knowledge item can specify its relevance region.

### 1.3 Key Questions

1. **Catchment Basin**: When a user selects a position in the maturity grid (e.g., Q13 = Mid/Development), which items should be displayed?
2. **Template vs. Item Granularity**: If a template contains items with different maturity footprints, what happens?
3. **User Visibility**: How does the user understand what's being filtered and why?
4. **Injection Behavior**: When injecting templates, do we inject all items or only matched items?

## 2. Current State

### 2.1 Existing Data Model

**MaturityFootprint** (defined in `packages/core/src/domains/knowledge/types.ts:77-93`):
```typescript
export interface MaturityFootprint {
  operator: MaturityRange;    // { min: 1-5, max: 1-5 }
  project: MaturityRange;      // { min: 1-5, max: 1-5 }
  complexity: MaturityRange;   // { min: 1-3, max: 1-3 }
}
```

**Current Capabilities**:
- Templates and items CAN have maturity footprints
- MaturityConfigPanel allows users to select their context
- MaturityRangeSelector allows setting footprints on items
- No active filtering is implemented

### 2.2 Existing UI Components

| Component | File | Purpose | Status |
|-----------|------|---------|--------|
| MaturityConfigPanel | `ui/knowledge/MaturityConfigPanel.ts` | User context configuration | ✅ Working |
| MaturityRangeSelector | `ui/knowledge/MaturityRangeSelector.ts` | Item footprint editor | ✅ Working |
| KnowledgeViewController | `ui/KnowledgeViewController.ts` | Main knowledge UI coordinator | ⚠️ No filtering |
| V1TemplatesTableController | `ui/knowledge/V1TemplatesTableController.ts` | Template list display | ⚠️ No filtering |

### 2.3 Gaps

1. **No Filtering Logic**: Context is configured but not used for filtering
2. **No Visual Indicators**: Users can't see which items match their context
3. **No Catchment Algorithm**: No definition of what "matches" means
4. **Ambiguous Injection**: Template injection doesn't consider maturity

## 3. Architectural Design

### 3.1 Core Principles

1. **Progressive Disclosure**: Show all items by default, filter only when explicitly configured
2. **Transparency**: Always indicate why items are shown or hidden
3. **Item-Level Granularity**: Filter at the item level, not template level
4. **Inclusive Matching**: Use overlap detection, not exact matching
5. **User Control**: Easy to toggle filtering on/off

### 3.2 Catchment Basin Algorithm

#### 3.2.1 The Intersection Model

An item **matches** a user context if the item's maturity footprint **intersects** with the user's selected position.

**Intersection Rules**:
```
Item matches if:
  (item.operator.min <= user.operator <= item.operator.max) AND
  (item.project.min <= user.project <= item.project.max) AND
  (item.complexity.min <= user.complexity <= item.complexity.max)
```

**Example**:
- User Context: Operator=3 (Mid), Project=3 (Development), Complexity=2 (Standard)
- Item A Footprint: Operator=[2-4], Project=[2-4], Complexity=[1-3]
- Result: **MATCH** ✅ (3 is within all ranges)

- Item B Footprint: Operator=[4-5], Project=[4-5], Complexity=[3-3]
- Result: **NO MATCH** ❌ (user is outside all ranges)

#### 3.2.2 Wildcards and Defaults

- **No Footprint** = **Universal** (matches everything)
- **Partial Footprint** = Wildcards on missing dimensions
  - Item with only `complexity: [2-2]` → matches any operator/project at Standard complexity

#### 3.2.3 Visual Representation

```
5x5 Grid (Operator × Project):
┌─────────────────────────────────┐
│ 21  22  23  24  25 │ Mature     │
│ 16  17  18  19  20 │ Established│
│ 11  12 [13] 14  15 │ Development│  ← User at Q13
│  6   7   8   9  10 │ Inception  │
│  1   2   3   4   5 │ Planning   │
└─────────────────────────────────┘
  N   J   M   S   E

Item Footprint: Q[6-18] (2×3 rectangle covering Q6,7,8,9,10,11,12,13,14,15,16,17,18)
Result: Q13 is within footprint → MATCH ✅
```

### 3.3 Template vs. Item Behavior

#### 3.3.1 Display Filtering

**Rule**: Filter at **item level**, not template level.

- **Template with Mixed Items**:
  - Template: "Authentication Patterns" (no footprint = universal)
  - Item 1: "Basic Auth" (Simple, Novice/Junior, Planning/Inception)
  - Item 2: "OAuth 2.0" (Standard, Mid/Senior, Development/Established)
  - Item 3: "SAML/SSO" (Complex, Senior/Expert, Established/Mature)

- **User at Mid/Development/Standard**:
  - Template is **SHOWN** (has matched items)
  - Item 1: **HIDDEN** (too simple, too junior)
  - Item 2: **SHOWN** ✅ (perfect match)
  - Item 3: **HIDDEN** (too complex, too senior)
  - Template badge: "1/3 items match"

#### 3.3.2 Injection Behavior

**Rule**: Inject **only matched items**, with clear indication.

When clicking 💉 on a template:
1. **Calculate Matches**: Determine which items match current context
2. **Show Preview Dialog**:
   ```
   ┌──────────────────────────────────────────────┐
   │ Inject: Authentication Patterns              │
   ├──────────────────────────────────────────────┤
   │ Your Context: Mid/Development/Standard       │
   │                                              │
   │ ✅ Items Matching (1):                       │
   │   • OAuth 2.0 Flow Pattern                   │
   │                                              │
   │ ⚠️  Items Excluded (2):                      │
   │   • Basic Auth (too simple/junior)           │
   │   • SAML/SSO (too complex/senior)            │
   │                                              │
   │ ☐ Include all items (ignore maturity)       │
   │                                              │
   │ [ Cancel ]              [ Inject Matched ]   │
   └──────────────────────────────────────────────┘
   ```
3. **User Choice**:
   - Default: Inject only matched items
   - Option: Override and inject all items

#### 3.3.3 Template-Level Footprints

**Interpretation**: Template footprint defines when the **entire template concept** is relevant.

- Template footprint acts as **outer boundary**
- Individual items can have **narrower footprints** within that boundary
- Useful for categorization: "Advanced Patterns" template has Expert footprint, all items inherit that minimum

**Inheritance Rule**:
```typescript
effectiveItemFootprint = intersection(template.maturity, item.maturity)
// If item has no footprint, inherit template's footprint
// If template has no footprint, use item's footprint
// If both have footprints, use intersection (stricter)
```

### 3.4 User Experience Design

#### 3.4.1 Context Configuration Flow

```
1. User opens Knowledge tab
   └─> Sees "Context Configuration" panel at top
       Current: "Mid/Development (Standard complexity)" [⚙️ Controls]

2. User clicks [⚙️ Controls]
   └─> Modal opens with 3 sections:
       • Complexity dropdown: Simple | Standard | Complex
       • 5×5 Grid: Click-drag to select operator/project range
       • Max Items slider: 5-50

3. User selects new context
   └─> Click [Save]
       └─> Context saved to workspace settings
           └─> Knowledge list automatically re-filters
```

#### 3.4.2 Filtering Visual Language

**Template Row Indicators**:
```
┌─────────────────────────────────────────────────────────────┐
│ ▶ 💉 Authentication Patterns                   [12/15 items]│ ← Badge shows match ratio
│   📋 Clone  💉 Inject  📊 Audit  ✏️ Edit  🗑️ Delete          │
│   Context: Mid-Expert, Dev-Mature, Standard                  │ ← Shows template's footprint
└─────────────────────────────────────────────────────────────┘
```

**Item Row Indicators**:
```
Expanded template view:
┌─────────────────────────────────────────────────────────────┐
│   ✅ OAuth 2.0 Flow Pattern                          Standard│ ← Green = match
│      Tags: auth, oauth, security                             │
│      Context: Mid-Senior, Dev-Established                    │
│      💉 Inject  ✏️ Edit  🗑️ Delete                          │
├─────────────────────────────────────────────────────────────┤
│   ⚪ SAML/SSO Enterprise                              Complex│ ← Gray = no match
│      Tags: auth, enterprise, saml                            │
│      Context: Senior-Expert, Established-Mature              │
│      💉 Inject  ✏️ Edit  🗑️ Delete                          │
│      ⚠️ Outside your context (too complex/senior)            │ ← Reason shown
└─────────────────────────────────────────────────────────────┘
```

**Filter Toggle**:
```
┌─────────────────────────────────────────────────────────────┐
│ Context Configuration: Mid/Development (Standard)            │
│ Filtering: [🔴 OFF]  ←Click to enable                       │  ← Prominent toggle
│                                                              │
│ When enabled: Show only items matching your context         │
│ Currently showing: All 127 items                             │
└─────────────────────────────────────────────────────────────┘

After enabling:
┌─────────────────────────────────────────────────────────────┐
│ Context Configuration: Mid/Development (Standard)            │
│ Filtering: [🟢 ON]   ←Click to disable                      │
│                                                              │
│ Showing: 43 matched items (84 filtered out)                 │
│ [Show all] to temporarily disable                            │
└─────────────────────────────────────────────────────────────┘
```

#### 3.4.3 Empty States

**No Matches**:
```
┌─────────────────────────────────────────────────────────────┐
│              🔍 No items match your context                  │
│                                                              │
│   Your context: Junior/Planning/Simple                       │
│   Available items: 127                                       │
│   Matched items: 0                                           │
│                                                              │
│   Suggestions:                                               │
│   • Expand your context range (edit configuration)          │
│   • Disable filtering to see all items                       │
│   • Create items for your context                            │
│                                                              │
│   [Edit Context]  [Disable Filtering]  [Create Item]        │
└─────────────────────────────────────────────────────────────┘
```

### 3.5 Complexity Handling

**Complexity is Independent**: Unlike Operator/Project (which form a 2D grid), Complexity is a separate dimension.

**Filtering Logic**:
```typescript
function matchesContext(item: KnowledgeItem, context: MaturityContext): boolean {
  // No footprint = universal match
  if (!item.maturity) return true;

  const footprint = item.maturity;

  // Check operator dimension
  const operatorMatch = context.quadrant % 5; // Extract operator from quadrant
  if (operatorMatch < footprint.operator.min || operatorMatch > footprint.operator.max) {
    return false;
  }

  // Check project dimension
  const projectMatch = Math.floor(context.quadrant / 5); // Extract project from quadrant
  if (projectMatch < footprint.project.min || projectMatch > footprint.project.max) {
    return false;
  }

  // Check complexity dimension (independent)
  const complexityValue = {
    'simple': 1,
    'standard': 2,
    'complex': 3
  }[context.complexity];

  if (complexityValue < footprint.complexity.min || complexityValue > footprint.complexity.max) {
    return false;
  }

  return true; // All dimensions match
}
```

**Example Scenarios**:
- Context: Mid/Development/Simple → Matches items with Simple complexity, regardless of grid position
- Context: Expert/Mature/Complex → Matches items with Complex complexity at Expert/Mature positions

## 4. Implementation Plan

### 4.1 Phase 1: Core Filtering Engine

**New Component**: `MaturityFilterEngine.ts`

```typescript
export class MaturityFilterEngine {
  /**
   * Check if an item matches the user's context
   */
  matchesContext(
    item: KnowledgeItem,
    context: MaturityContext,
    templateFootprint?: MaturityFootprint
  ): MatchResult {
    // Returns: { matches: boolean, reasons: string[] }
  }

  /**
   * Filter a list of items based on context
   */
  filterItems(
    items: KnowledgeItem[],
    context: MaturityContext,
    enabled: boolean
  ): FilteredItemList {
    // Returns: { matched: items[], excluded: items[], reasons: Map }
  }

  /**
   * Calculate template match statistics
   */
  getTemplateStats(
    template: MarketplaceTemplate,
    context: MaturityContext
  ): TemplateMatchStats {
    // Returns: { totalItems: number, matchedItems: number, percentage: number }
  }
}
```

### 4.2 Phase 2: UI Integration

**Modified Components**:
1. **KnowledgeViewController**: Add filter toggle, apply filtering to displayed lists
2. **V1TemplatesTableController**: Show match badges, apply styling
3. **MaturityConfigPanel**: Add filter enable/disable toggle

**New Components**:
1. **InjectionPreviewDialog**: Modal showing matched/excluded items before injection
2. **MatchReasonTooltip**: Hover tooltip explaining why items match/don't match

### 4.3 Phase 3: Persistence & Settings

**Workspace Settings** (`.vscode/settings.json`):
```json
{
  "agentBrain.maturity.context": {
    "complexity": "standard",
    "quadrant": 13,
    "maxItems": 25
  },
  "agentBrain.maturity.filteringEnabled": false,
  "agentBrain.maturity.defaultFootprint": {
    "operator": { "min": 1, "max": 5 },
    "project": { "min": 1, "max": 5 },
    "complexity": { "min": 1, "max": 3 }
  }
}
```

### 4.4 Phase 4: Analytics & Insights

**Future Enhancements**:
- Track which items are most accessed in each context
- Suggest optimal footprints for new items based on usage patterns
- Recommend context adjustments if user frequently disables filtering
- Generate "coverage reports": which contexts lack knowledge items

## 5. Data Flow Diagrams

### 5.1 Configuration Flow
```
User → MaturityConfigPanel (select context)
    → MaturityContext { complexity, quadrant, maxItems }
    → WorkspaceSettings (persist)
    → KnowledgeViewController (trigger re-filter)
    → MaturityFilterEngine (apply filter)
    → V1TemplatesTableController (update display)
```

### 5.2 Display Flow
```
TemplateStore (all templates/items)
    → MaturityFilterEngine.filterItems(context, enabled)
        → For each item:
            → matchesContext(item, context)
                → Check operator range
                → Check project range
                → Check complexity range
                → Return { matches, reasons }
    → FilteredItemList { matched, excluded, reasons }
    → V1TemplatesTableController.renderFiltered()
        → Matched items: ✅ green indicators
        → Excluded items: ⚪ gray + tooltip
```

### 5.3 Injection Flow
```
User clicks 💉 on template
    → InjectionController.prepareInjection(template)
        → MaturityFilterEngine.getTemplateStats(template, context)
        → InjectionPreviewDialog.show({
            matched: [...],
            excluded: [...],
            reasons: Map
          })
    → User chooses:
        [Inject Matched] → TemplateEngine.inject(matchedItems)
        [Include All] → TemplateEngine.inject(allItems)
        [Cancel] → Close dialog
```

## 6. Edge Cases & Considerations

### 6.1 Inheritance Conflicts

**Scenario**: Template has footprint Expert/Mature, item has footprint Novice/Planning

**Resolution**: Use **intersection** (stricter):
- Effective footprint: Empty set (impossible range)
- Item is **never shown** (template context overrides)
- UI Warning: "Item footprint conflicts with template - item will never match"

### 6.2 Multi-Select Context

**Future Feature**: Allow selecting multiple quadrants (e.g., "I'm Mid-Senior working on Dev-Established projects")

**Implementation**: Union of rectangles
- User can drag multiple selections
- Item matches if it overlaps ANY selected rectangle
- More flexible for teams with varied experience levels

### 6.3 Team Contexts

**Future Feature**: Shared team context vs. personal context

**Use Cases**:
- Team lead configures baseline context for whole team
- Individual developers can override with personal context
- Templates can be marked "Team Recommended" for certain contexts

## 7. Success Metrics

### 7.1 Quantitative

- **Filtering Adoption**: % of users who enable maturity filtering
- **Match Rate**: Average % of items matched across all users
- **Configuration Frequency**: How often users change their context
- **Injection Accuracy**: % of injections that use "matched only" vs "all items"

### 7.2 Qualitative

- **Reduced Cognitive Load**: Users report less overwhelming knowledge lists
- **Relevance**: Users find items more applicable to their current work
- **Discoverability**: Users discover items they wouldn't have found otherwise
- **Onboarding**: New team members find appropriate beginner content easily

## 8. Rollout Strategy

### 8.1 Phase 1: Opt-In Beta (Default: Disabled)
- Feature flag: `agentBrain.maturity.betaTesting: true`
- Default filtering: **OFF**
- Visible toggle in UI with "Beta" badge
- Collect feedback on matching algorithm accuracy

### 8.2 Phase 2: Gradual Rollout (Default: Enabled for New Users)
- New installations: Filtering enabled by default
- Existing installations: Prompt user to enable
- Prominent onboarding: "Set your context to see relevant items"

### 8.3 Phase 3: Full Integration
- Filtering always available
- Context configuration part of initial setup wizard
- Analytics dashboard for admins (team/org view)

## 9. Open Questions

1. **Quadrant Ranges**: Should users be able to select rectangular ranges (e.g., Q6-18) instead of single points?
2. **Confidence Scoring**: Should items have confidence scores for how well they match (fuzzy matching)?
3. **Multi-Dimensional Visualization**: How to visualize 3D space (Operator × Project × Complexity) in 2D UI?
4. **Auto-Context Detection**: Can we infer user context from their git history, file edits, or IDE activity?
5. **Context Evolution**: Should system prompt users to update context as they grow (e.g., "You might be Senior now")?

## 10. Conclusion

This architecture provides a **clear, implementable framework** for maturity-based knowledge filtering in Agent Brain Platform. Key design decisions:

✅ **Item-level filtering** (not template-level)
✅ **Intersection-based matching** (intuitive overlap detection)
✅ **Transparent filtering** (always show why items are included/excluded)
✅ **User control** (easy toggle, preview before injection)
✅ **Progressive disclosure** (default off, opt-in for power users)

The system balances **power** (fine-grained 3D maturity space) with **usability** (simple grid UI, clear visual language), making knowledge management both scalable and accessible.

---

**Next Steps**:
1. Review this design with stakeholders
2. Create detailed implementation tickets for each phase
3. Build proof-of-concept filtering engine
4. User test with sample knowledge base
5. Iterate based on feedback

**Document Maintained By**: Development Team
**Last Updated**: 2025-10-27
**Status**: Awaiting Review & Approval
