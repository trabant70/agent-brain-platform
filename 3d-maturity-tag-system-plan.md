# 3D Tag-Based Maturity System - Pragmatic Implementation Plan

**Created:** 2025-01-25  
**Feature:** Context-aware knowledge injection using tags across three dimensions  
**Complexity:** Medium (Simplified from original)  
**Estimated Time:** 10-12 hours across 4 phases

---

## Problem Statement

Knowledge injection needs to adapt to three contextual dimensions:
1. **Operator Maturity**: Junior/Mid/Senior developer experience
2. **Project Maturity**: Inception/Development/Mature project phase  
3. **Domain Complexity**: Simple/Standard/Complex technical challenges

Current coordinate-based approach is overly complex. A tag-based system is more intuitive and maintainable.

---

## Solution: Tag-Based 3D Selection System

### Core Concept

Replace coordinates with **semantic tags** that describe where knowledge items belong:
- Each item has tags indicating its relevance across all three dimensions
- Users select their current context through a simple UI
- System matches tags to select relevant items
- Learning items are automatically captured with appropriate tags

### The Three Dimensions

```
Complexity Layer (Z-axis selector)
├── Simple    (Basic CRUD, straightforward logic)
├── Standard  (Typical business logic, common patterns)
└── Complex   (Distributed systems, advanced algorithms)

Within each complexity layer:
   Project Maturity (Y-axis)
   ├── Mature       (Established, optimizing)
   ├── Development  (Active building)
   └── Inception    (Starting, planning)
   
   Operator Maturity (X-axis)
   └── Junior └── Mid └── Senior
```

### Visual Model

```
User selects complexity first, then sees relevant 3x3 grid:

[Complexity: Standard ▼]  <- Dropdown selector

   Project →
   ↓         Junior    Mid      Senior
   Inception  [ Q1 ]   [ Q2 ]   [ Q3 ]
   Develop    [ Q4 ]   [ Q5 ]   [ Q6 ]  
   Mature     [ Q7 ]   [ Q8 ]   [ Q9 ]
```

---

## Simplified Tag System

### Knowledge Item Structure

```typescript
interface KnowledgeItem {
  id: string;
  title: string;
  type: 'pattern' | 'learning' | 'standard' | 'guidance';
  body: string;
  
  // NEW: Simple tag-based maturity
  maturity: {
    operator: ('junior' | 'mid' | 'senior')[];      // Can target multiple
    project: ('inception' | 'development' | 'mature')[];
    complexity: ('simple' | 'standard' | 'complex')[];
  };
  
  // Optional weight for prioritization
  relevance?: number;  // 0-1, default 0.5
}
```

**Example Items:**

```json
{
  "title": "Repository Pattern Implementation",
  "type": "pattern",
  "maturity": {
    "operator": ["junior", "mid"],
    "project": ["inception", "development"],
    "complexity": ["simple", "standard"]
  },
  "relevance": 0.8
}

{
  "title": "Distributed Transaction Patterns",
  "type": "pattern",
  "maturity": {
    "operator": ["senior"],
    "project": ["development", "mature"],
    "complexity": ["complex"]
  },
  "relevance": 0.9
}

{
  "title": "Performance Issue with UserService",
  "type": "learning",
  "maturity": {
    "operator": ["mid", "senior"],
    "project": ["mature"],
    "complexity": ["standard"]
  },
  "relevance": 0.7
}
```

### Workspace Configuration

```typescript
interface MaturityContext {
  // Current selections
  complexity: 'simple' | 'standard' | 'complex';
  quadrant: number;  // 1-9 within selected complexity
  
  // Inclusion rules
  includeAdjacent: boolean;  // Include items from adjacent quadrants
  includeAllComplexity: boolean;  // Include items from other complexity levels
  maxItems?: number;  // Optional limit
}
```

**Configuration file:** `.agent-brain/maturity-config.json`
```json
{
  "complexity": "standard",
  "quadrant": 5,
  "includeAdjacent": true,
  "includeAllComplexity": false,
  "maxItems": 25
}
```

---

## Quadrant Semantics & Framing

### Quadrant Mappings with Instructional Framing

| Q | Operator | Project | Complexity | Label | Item Framing |
|---|----------|---------|------------|-------|--------------|
| 1 | Junior | Inception | [Selected] | "Learning Starter" | "📚 Learn: Follow these patterns..." |
| 2 | Mid | Inception | [Selected] | "Applying Foundations" | "🔨 Apply: Use established..." |
| 3 | Senior | Inception | [Selected] | "Architecting" | "🎯 Design: Consider these..." |
| 4 | Junior | Development | [Selected] | "Growing Builder" | "💡 Study: Understand why..." |
| 5 | Mid | Development | [Selected] | "Productive Builder" | "⚡ Build: Implement using..." |
| 6 | Senior | Development | [Selected] | "Lead Builder" | "🌟 Guide: Ensure team..." |
| 7 | Junior | Mature | [Selected] | "Learning Maintainer" | "🔍 Explore: Learn from..." |
| 8 | Mid | Mature | [Selected] | "System Maintainer" | "🔧 Maintain: Keep consistent..." |
| 9 | Senior | Mature | [Selected] | "System Expert" | "📝 Document: Record for team..." |

### Automatic Learning Capture

When in different quadrants, prompt for different types of learnings:

**Q1-Q3 (Inception):** "What foundational decisions did you make?"  
**Q4-Q6 (Development):** "What patterns emerged during implementation?"  
**Q7-Q9 (Mature):** "What optimizations or fixes were discovered?"

---

## Simplified Selection Algorithm

```typescript
function selectItems(
  allItems: KnowledgeItem[],
  context: MaturityContext
): KnowledgeItem[] {
  
  const { operator, project } = quadrantToTags(context.quadrant);
  
  // Primary selection: exact match
  let selected = allItems.filter(item => 
    item.maturity.operator.includes(operator) &&
    item.maturity.project.includes(project) &&
    item.maturity.complexity.includes(context.complexity)
  );
  
  // Include adjacent if enabled
  if (context.includeAdjacent && selected.length < 10) {
    const adjacent = getAdjacentTags(operator, project);
    const adjacentItems = allItems.filter(item =>
      adjacent.some(adj => 
        item.maturity.operator.includes(adj.operator) ||
        item.maturity.project.includes(adj.project)
      ) &&
      item.maturity.complexity.includes(context.complexity)
    );
    selected = [...selected, ...adjacentItems];
  }
  
  // Sort by relevance
  selected.sort((a, b) => (b.relevance || 0.5) - (a.relevance || 0.5));
  
  // Apply limit if specified
  if (context.maxItems) {
    selected = selected.slice(0, context.maxItems);
  }
  
  return selected;
}

function quadrantToTags(quadrant: number): {operator: string, project: string} {
  const mapping = {
    1: {operator: 'junior', project: 'inception'},
    2: {operator: 'mid', project: 'inception'},
    3: {operator: 'senior', project: 'inception'},
    4: {operator: 'junior', project: 'development'},
    5: {operator: 'mid', project: 'development'},
    6: {operator: 'senior', project: 'development'},
    7: {operator: 'junior', project: 'mature'},
    8: {operator: 'mid', project: 'mature'},
    9: {operator: 'senior', project: 'mature'}
  };
  return mapping[quadrant];
}
```

---

## Implementation Phases

### Phase 1: Data Model & Core Logic (3 hours)

**Tasks:**
1. Update `KnowledgeItem` interface with tag-based maturity
2. Create `MaturityContext` configuration type
3. Implement tag-based selection algorithm
4. Add framing templates for each quadrant
5. Create migration script for existing items (default to all tags)

**Deliverables:**
- [ ] Updated TypeScript interfaces
- [ ] Selection algorithm with tests
- [ ] Framing templates defined
- [ ] Migration script ready

---

### Phase 2: Configuration & UI (4 hours)

**Tasks:**
1. Create maturity configuration UI panel:
   - Complexity dropdown selector
   - 3x3 quadrant grid (visual selection)
   - Adjacent inclusion checkbox
   - Max items slider
2. Wire up configuration to workspace settings
3. Add item count preview
4. Implement configuration persistence
5. Add reset to defaults button

**UI Mockup:**
```
┌─ Maturity Configuration ──────────────┐
│                                       │
│ Complexity: [Standard ▼]              │
│                                       │
│ Your Context:                         │
│ ┌─────────────────────┐              │
│ │ 7 │ 8 │ 9 │ Mature  │              │
│ ├───┼───┼───┤         │              │
│ │ 4 │[5]│ 6 │ Develop │              │
│ ├───┼───┼───┤         │              │
│ │ 1 │ 2 │ 3 │ Inception│              │
│ └───┴───┴───┘         │              │
│  Jr  Mid  Sr          │              │
│                                       │
│ ☑ Include adjacent quadrants          │
│ ☐ Include all complexity levels       │
│                                       │
│ Max items: [25] ──────○───            │
│                                       │
│ Items selected: 18                    │
│                                       │
│ [Reset] [Apply]                       │
└───────────────────────────────────────┘
```

**Deliverables:**
- [ ] Configuration UI panel
- [ ] Settings persistence
- [ ] Live preview of item count
- [ ] Integration with main UI

---

### Phase 3: Injection Integration (2 hours)

**Tasks:**
1. Update `TemplateEngine` to use new selection
2. Apply quadrant-specific framing to items
3. Add maturity context header to injections
4. Update CLAUDE.md with selected items
5. Add debug logging for troubleshooting

**Injection format:**
```markdown
<!-- Agent Brain Context: Standard Complexity, Q5 (Mid/Development) -->
<!-- 18 items selected from 142 total -->

## ⚡ Build: Implement using...

### Repository Pattern Implementation
[Pattern content...]

### Service Layer Best Practices
[Pattern content...]

<!-- Learning Prompt: What patterns emerged during implementation? -->
```

**Deliverables:**
- [ ] Updated injection engine
- [ ] Framed content in CLAUDE.md
- [ ] Context headers
- [ ] Debug logging

---

### Phase 4: Learning Capture Integration (3 hours)

**Tasks:**
1. Add learning capture prompts based on quadrant
2. Auto-tag captured learnings with current context
3. Create learning item templates
4. Add "Capture Learning" quick action
5. Implement relevance scoring for new learnings
6. Test learning flow end-to-end

**Learning template example:**
```typescript
function createLearningItem(
  content: string,
  context: MaturityContext
): KnowledgeItem {
  const {operator, project} = quadrantToTags(context.quadrant);
  
  return {
    id: generateId(),
    title: extractTitle(content),
    type: 'learning',
    body: content,
    maturity: {
      operator: [operator],
      project: [project],
      complexity: [context.complexity]
    },
    relevance: 0.8,  // New learnings start high
    capturedAt: new Date(),
    capturedContext: context
  };
}
```

**Deliverables:**
- [ ] Learning capture prompts
- [ ] Auto-tagging system
- [ ] Quick capture action
- [ ] End-to-end tested

---

## Migration Strategy

### Existing Items
Default all existing items to broad coverage:
```json
{
  "maturity": {
    "operator": ["junior", "mid", "senior"],
    "project": ["inception", "development", "mature"],
    "complexity": ["simple", "standard"]
  },
  "relevance": 0.5
}
```

Then gradually refine based on:
- Item type (patterns → mid/senior, learnings → context-specific)
- Content analysis (look for keywords indicating complexity)
- Usage patterns (which contexts actually use them)

### Workspace Settings
Create default configuration:
```bash
echo '{
  "complexity": "standard",
  "quadrant": 5,
  "includeAdjacent": true,
  "includeAllComplexity": false,
  "maxItems": 25
}' > .agent-brain/maturity-config.json
```

---

## Success Metrics

1. **Simplicity**: Configuration takes < 30 seconds
2. **Relevance**: 80%+ of injected items are contextually appropriate
3. **Learning Capture**: Automated tagging reduces manual work by 90%
4. **Performance**: Selection algorithm runs in < 100ms
5. **Adoption**: Users understand and use the system without training

---

## Testing Strategy

### Unit Tests
- Tag matching logic
- Quadrant to tag conversion
- Adjacent quadrant calculation
- Selection with various contexts

### Integration Tests
- Configuration changes trigger re-selection
- Items inject with proper framing
- Learning capture includes tags
- Migration preserves existing items

### User Acceptance
- Create test scenarios for each quadrant
- Verify appropriate items selected
- Confirm framing makes sense
- Test learning capture flow

---

## Future Enhancements (Not in MVP)

1. **Multi-domain support**: Add domain tags (frontend, backend, devops)
2. **Team profiles**: Quick-switch between team member contexts
3. **Analytics**: Track which items are most useful in each context
4. **Smart progression**: Detect when to suggest moving quadrants
5. **Package bundles**: Pre-configured sets for common scenarios

---

## Key Simplifications from Original

1. **Tags instead of coordinates**: More intuitive, easier to configure
2. **Workspace-only**: No folder-level complexity for now
3. **No heat maps**: Simple grid selection is sufficient
4. **No auto-recommendation**: Manual selection is fine for MVP
5. **Fixed complexity levels**: Three levels cover most cases
6. **No Gaussian scoring**: Simple tag matching with optional adjacency

This approach maintains the power of contextual injection while dramatically reducing implementation complexity.

---

**Total Estimated Time: 10-12 hours**  
**Recommended Order: Phase 1 → 2 → 3 → 4**  
**MVP Ready After: Phase 3 (7-9 hours)**