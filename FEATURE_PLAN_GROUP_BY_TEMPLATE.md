# Feature Plan: Group By Template

## 📋 Executive Summary

Add "Template" as a fourth grouping dimension in the Knowledge tab, allowing users to view knowledge items organized by which templates contain them. This creates a clearer mental model by showing how items are organized into reusable template bundles.

**Current Grouping Options:**
- Type (ADR, Design Pattern, Learning, etc.)
- Scope (Personal, Team, Project, Organization, Public)
- Tag (User-defined tags)

**Proposed Addition:**
- **Template** (Groups items by which templates contain them)

---

## 🎯 User Value Proposition

### Problem
Users create templates to group related knowledge items (e.g., "API Design Checklist", "Security Standards"), but there's no visual way to see items organized by their template membership in the Knowledge table.

### Solution
Add "Template" grouping to show items organized by template membership, making it clear:
- Which items belong to which templates
- Which items aren't in any template (orphaned items)
- How templates organize the knowledge base

### Use Cases
1. **Template Overview** - "Show me all items in my 'API Design Checklist' template"
2. **Orphan Detection** - "Which knowledge items aren't part of any template yet?"
3. **Template Maintenance** - "What's actually in my security standards template?"

---

## 🔍 Investigation Summary

### Current Architecture

**Template Structure:**
```json
{
  "id": "template-1760954445858-01ugn9x",
  "name": "API Design Checklist",
  "itemIds": ["knowledge-abc", "knowledge-xyz"],
  "metadata": { ... }
}
```

**Storage:**
- Templates: `.agent-brain/templates/*.json` (JSON files)
- Knowledge Items: `.agent-brain/*/*.md` (Markdown with YAML frontmatter)

**Relationship Model:**
```
Template → itemIds[]  (one-way reference)
   ↓
Knowledge Items (no reverse reference to templates)
```

**Existing Infrastructure:**
- ✅ `KnowledgeStore.getTemplatesContainingItem(itemId)` - Lookup method exists
- ✅ Grouping system supports extensible dimensions (type, scope, tag)
- ✅ Many-to-many grouping already implemented (tags work this way)
- ✅ Collapse/expand functionality works generically

---

## 🏗️ Implementation Plan

### Phase 1: Type System Extension
**File:** `packages/core/src/domains/visualization/ui/knowledge/KnowledgeTableController.ts`

**Changes:**
1. Extend `TableState` interface:
```typescript
export interface TableState {
  // ... existing properties
  groupBy: 'type' | 'scope' | 'tag' | 'template';  // ADD 'template'
  collapsedSections: Set<string>;
}
```

2. Update `groupItems()` method to handle template dimension
3. Update `getGroupDisplayInfo()` to handle template dimension

---

### Phase 2: Grouping Algorithm

**Location:** `KnowledgeTableController.groupItems()` method (line 346-369)

**New Logic for Template Grouping:**
```typescript
private groupItems(
  items: KnowledgeItem[],
  dimension: 'type' | 'scope' | 'tag' | 'template'
): Map<string, KnowledgeItem[]> {
  const groups = new Map<string, KnowledgeItem[]>();

  for (const item of items) {
    let keys: string[];

    if (dimension === 'template') {
      // NEW: Template grouping logic
      const templates = this.getTemplatesForItem(item.id);

      if (templates.length === 0) {
        keys = ['__no_template__'];  // Special key for orphaned items
      } else {
        keys = templates.map(t => t.id);  // Item appears in each template group
      }
    } else if (dimension === 'tag') {
      // Existing tag logic (many-to-many)
      keys = item.tags.length > 0 ? item.tags : ['(no tags)'];
    } else {
      // Existing type/scope logic (one-to-one)
      keys = [item[dimension]];
    }

    for (const key of keys) {
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    }
  }

  return groups;
}
```

**Helper Method (NEW):**
```typescript
private getTemplatesForItem(itemId: string): Template[] {
  // This needs access to template data
  // Option A: Pass templates in state
  // Option B: Access via controller reference
  // Option C: Send from extension as part of knowledge:loaded message

  return this.state.templates.filter(t => t.itemIds.includes(itemId));
}
```

---

### Phase 3: Display Info for Template Groups

**Location:** `KnowledgeTableController.getGroupDisplayInfo()` (line 313-341)

**New Case:**
```typescript
private getGroupDisplayInfo(
  groupKey: string,
  dimension: 'type' | 'scope' | 'tag' | 'template'
): { icon: string; label: string } {
  if (dimension === 'type') {
    // Existing type logic
    return {
      icon: getKnowledgeTypeIcon(groupKey as KnowledgeType),
      label: getKnowledgeTypeLabel(groupKey as KnowledgeType)
    };
  } else if (dimension === 'scope') {
    // Existing scope logic
    return {
      icon: scopeIcons[groupKey] || '📦',
      label: getKnowledgeScopeLabel(groupKey as KnowledgeScope)
    };
  } else if (dimension === 'template') {
    // NEW: Template display info
    if (groupKey === '__no_template__') {
      return {
        icon: '📭',  // Empty mailbox for "no template"
        label: '(Not in any template)'
      };
    }

    // Find template by ID
    const template = this.state.templates.find(t => t.id === groupKey);
    return {
      icon: '📋',  // Clipboard for templates
      label: template?.name || 'Unknown Template'
    };
  } else {
    // Tag dimension (existing)
    return {
      icon: '🏷️',
      label: groupKey
    };
  }
}
```

---

### Phase 4: UI Button Addition

**File:** `packages/core/src/domains/visualization/templates/timeline.html` (line 149-154)

**Change:**
```html
<div class="grouping-controls ab-toggle-group">
  <label>Group by:</label>
  <button class="group-btn ab-toggle-btn active" data-group="type" title="Group by knowledge type">Type</button>
  <button class="group-btn ab-toggle-btn" data-group="scope" title="Group by scope (Personal, Team, etc.)">Scope</button>
  <button class="group-btn ab-toggle-btn" data-group="tag" title="Group by tags">Tag</button>
  <!-- NEW: Template grouping button -->
  <button class="group-btn ab-toggle-btn" data-group="template" title="Group by template membership">Template</button>
</div>
```

**No JavaScript changes needed** - existing event delegation already handles this!

---

### Phase 5: State Management

**Challenge:** Table controller needs access to template data

**Current State Structure:**
```typescript
export interface TableState {
  allItems: KnowledgeItem[];
  searchTerm: string;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  groupBy: 'type' | 'scope' | 'tag';
  collapsedSections: Set<string>;
  selectedItems: Set<string>;
}
```

**Proposed Addition:**
```typescript
export interface TableState {
  // ... existing properties
  groupBy: 'type' | 'scope' | 'tag' | 'template';  // Extended
  templates: Template[];  // NEW: Template data for grouping
  collapsedSections: Set<string>;
  selectedItems: Set<string>;
}
```

**Data Flow:**
```
Extension (KnowledgeManager)
  ↓ postMessage('knowledge:loaded')
  ↓ payload: { items: [...], templates: [...] }
  ↓
Webview (KnowledgeViewController)
  ↓ handleKnowledgeLoaded(payload)
  ↓
TableController
  ↓ updateState({ allItems: payload.items, templates: payload.templates })
```

---

### Phase 6: Message Protocol Extension

**File:** `packages/vscode/src/services/KnowledgeManager.ts`

**Current Message (line ~200):**
```typescript
this.provider.sendMessage({
  type: 'knowledge:loaded',
  payload: {
    items: allItems,
    // NEW: Add templates
    templates: this.store.getAllTemplates()
  }
});
```

**Webview Handler:** `packages/core/src/domains/visualization/ui/KnowledgeViewController.ts` (line 180-189)

**Current:**
```typescript
private handleKnowledgeLoaded(payload: { items: KnowledgeItem[] }): void {
  webviewLogger.info(LogCategory.KNOWLEDGE, `Loaded ${payload.items.length} knowledge items`);
  this.tableController.updateState({
    allItems: payload.items
  });
  this.renderKnowledgeView();
  this.updateStatusBar();
}
```

**Updated:**
```typescript
private handleKnowledgeLoaded(payload: {
  items: KnowledgeItem[],
  templates: Template[]  // NEW
}): void {
  webviewLogger.info(LogCategory.KNOWLEDGE, `Loaded ${payload.items.length} knowledge items, ${payload.templates.length} templates`);
  this.tableController.updateState({
    allItems: payload.items,
    templates: payload.templates  // NEW
  });
  this.renderKnowledgeView();
  this.updateStatusBar();
}
```

---

## 🎨 Visual Design

### Group Header Examples

**Template Grouping Active:**
```
┌─────────────────────────────────────────────────────────┐
│ ▼ 📋 API Design Checklist (5)                          │
├─────────────────────────────────────────────────────────┤
│   Golden Path    API Standards           team   ...     │
│   Best Practice  Error Handling          team   ...     │
│   Snippet        Rate Limiting Config    team   ...     │
│   ...                                                    │
├─────────────────────────────────────────────────────────┤
│ ▼ 📋 Security Standards (3)                            │
├─────────────────────────────────────────────────────────┤
│   Standard       OWASP Top 10             org    ...     │
│   Checklist      Security Review          team   ...     │
│   ...                                                    │
├─────────────────────────────────────────────────────────┤
│ ▼ 📭 (Not in any template) (12)                        │
├─────────────────────────────────────────────────────────┤
│   Learning       OAuth Debug Tips         personal ...   │
│   ADR            Use PostgreSQL           project  ...   │
│   ...                                                    │
└─────────────────────────────────────────────────────────┘
```

**Icon Choices:**
- 📋 Template groups (clipboard suggests checklist/collection)
- 📭 No template (empty mailbox suggests "not filed")

**Alternative Icons:**
- 💾 (floppy disk - saved template)
- 📦 (package - bundled items)
- 🗂️ (card file box - organized filing)
- 📁 (folder - collection)

---

## 🔄 Behavior Specification

### Many-to-Many Handling

**Scenario:** Item belongs to 2 templates
```
Item "OAuth Best Practices"
  ↓ appears in
  ├─ Template "API Design Checklist"
  └─ Template "Security Standards"

Result: Item appears TWICE in the table
  - Once under "API Design Checklist" group
  - Once under "Security Standards" group

(Same behavior as current Tag grouping)
```

### Default Grouping
When user first opens Knowledge tab:
- Default: `groupBy: 'type'` (current behavior, unchanged)

### Empty State
If no templates exist:
- All items appear under "(Not in any template)" group
- Template grouping button still works (shows the empty state gracefully)

### Collapsed Sections
When switching to template grouping:
- All sections start collapsed (same as current behavior for grouping changes)
- User can expand individual template groups
- Collapse state persists during session (not across reloads)

---

## 📊 Edge Cases & Considerations

### 1. Item in Multiple Templates
**Behavior:** Item appears multiple times (once per template)
**Count:** Item counted in each template's item count
**Rationale:** Same as tag grouping - shows complete membership

### 2. Item in Zero Templates
**Behavior:** Appears under "(Not in any template)" group
**Icon:** 📭 (empty mailbox)
**Use Case:** Helps identify orphaned items that could be added to templates

### 3. Template Deleted
**Behavior:** Items remain intact, automatically move to "(Not in any template)" group
**Implementation:** No special handling needed - lookup returns empty array

### 4. Template Renamed
**Behavior:** Group header updates immediately when template name changes
**Implementation:** Group key uses template ID, label uses template name

### 5. Performance
**Current Scale:** Typical workspace has 10-50 knowledge items, 2-10 templates
**Algorithm Complexity:** O(items × templates) for grouping
**Optimization:** Not needed for typical scale; consider caching if >1000 items

### 6. Sorting Within Groups
**Default:** Items within each group sorted by title (ascending)
**Behavior:** Same as current grouping - maintains table sort settings

---

## 🚧 Implementation Checklist

### Core Files to Modify

- [ ] **KnowledgeTableController.ts**
  - [ ] Extend `TableState.groupBy` type
  - [ ] Add `templates: Template[]` to state
  - [ ] Extend `groupItems()` for template dimension
  - [ ] Extend `getGroupDisplayInfo()` for template dimension
  - [ ] Add `getTemplatesForItem()` helper method

- [ ] **timeline.html**
  - [ ] Add template grouping button to grouping controls

- [ ] **KnowledgeManager.ts** (Extension)
  - [ ] Include templates in `knowledge:loaded` message payload

- [ ] **KnowledgeViewController.ts**
  - [ ] Update `handleKnowledgeLoaded()` to accept templates
  - [ ] Pass templates to table controller state

### Testing Checklist

- [ ] **Grouping Functionality**
  - [ ] Click Template button → table re-groups by template
  - [ ] Items in templates appear under correct headers
  - [ ] Orphaned items appear under "(Not in any template)"
  - [ ] Item in multiple templates appears multiple times

- [ ] **UI Behavior**
  - [ ] Group headers show correct icon (📋 or 📭)
  - [ ] Group headers show correct template names
  - [ ] Item count in header matches displayed items
  - [ ] Collapse/expand works for template groups

- [ ] **Edge Cases**
  - [ ] Zero templates → all items under "Not in any template"
  - [ ] Template deleted → items move to "Not in any template"
  - [ ] Empty template → header shows "(0 items)"
  - [ ] Switch between grouping dimensions → works smoothly

- [ ] **Data Flow**
  - [ ] Extension sends template data in payload
  - [ ] Webview receives and stores template data
  - [ ] Table controller can access template data
  - [ ] Lookup works: `getTemplatesForItem(id)` returns correct templates

---

## 🎯 Success Criteria

1. ✅ User can click "Template" button to group by template
2. ✅ Items appear under their template group headers
3. ✅ Orphaned items appear under "(Not in any template)"
4. ✅ Items in multiple templates appear in each group
5. ✅ Group headers show template names with item counts
6. ✅ Collapse/expand works for template groups
7. ✅ No errors in console
8. ✅ Performance remains smooth (<100ms for grouping)

---

## 🔮 Future Enhancements (Out of Scope)

- **Quick Actions on Group Headers**
  - "Apply this template" button on group header
  - "Export template" from group header
  - "Edit template" from group header

- **Visual Indicators**
  - Badge showing template count on items
  - Color-coding by template

- **Advanced Filtering**
  - Filter to show only items in templates
  - Filter to show only orphaned items

- **Bulk Operations**
  - "Add all to template" from group selection
  - "Remove from template" bulk action

---

## 💡 Alternative Approaches (Considered & Rejected)

### Option A: Two-Way References
**Idea:** Store template IDs in knowledge item frontmatter
```yaml
---
title: My Item
templates: [template-1, template-2]
---
```

**Rejected Because:**
- Violates single source of truth principle
- Templates already own the relationship
- Would require syncing frontmatter with template JSON
- Adds complexity without clear benefit

### Option B: Virtual "Template Pool" Section
**Idea:** Show templates as a separate section above the table

**Rejected Because:**
- Doesn't integrate with existing grouping UI
- Creates separate mental model
- Less discoverable than button

### Option C: Nested Grouping
**Idea:** Group by Type → then by Template within each type

**Rejected Because:**
- Too complex for MVP
- Unclear user value
- Can be added later if needed

---

## 📝 Implementation Notes

### Template Data Access Pattern
```typescript
// In KnowledgeTableController
private getTemplatesForItem(itemId: string): Template[] {
  // Access templates from state
  return this.state.templates.filter(t =>
    t.itemIds.includes(itemId)
  );
}
```

### Group Key Strategy
Use **template ID** as group key (not name):
- Handles template renames gracefully
- Unique and stable
- Maps cleanly to template lookup

```typescript
// Good: Use ID as key
keys = templates.map(t => t.id);

// Bad: Use name as key (unstable)
keys = templates.map(t => t.name);
```

### Special Key Convention
Use `__no_template__` as key for orphaned items:
- Double underscore prefix signals "special" key
- Won't collide with actual template IDs
- Easy to detect and handle specially

---

## 🚀 Rollout Strategy

1. **Development**
   - Implement in feature branch
   - Test with sample knowledge base
   - Verify message protocol works

2. **Testing**
   - Test with real workspace data
   - Verify performance with 50+ items
   - Check all edge cases

3. **Documentation**
   - Update user guide
   - Add screenshot to README
   - Document in CLAUDE.md

4. **Release**
   - Version bump (minor version)
   - Include in release notes
   - No migration needed (backward compatible)

---

## 📋 Summary

**Effort Estimate:** Small (2-3 hours)

**Complexity:** Low
- Leverages existing grouping infrastructure
- Clean separation of concerns
- No database changes needed

**Risk:** Very Low
- Purely additive feature (no breaking changes)
- Existing code handles many-to-many grouping (tags)
- Template data already available in extension

**User Impact:** Medium-High
- Makes templates more discoverable
- Helps organize knowledge base
- Natural mental model for users

**Recommendation:** ✅ **Implement**
- Clean architectural fit
- Low implementation cost
- Clear user value
- No technical debt introduced
