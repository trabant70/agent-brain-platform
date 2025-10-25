# 2D Maturity-Based Dynamic Knowledge Injection System

**Created:** 2025-10-25
**Feature:** Context-aware knowledge injection using operator and project maturity dimensions
**Complexity:** Large
**Estimated Time:** 23-30 hours across 6 phases

---

## Problem Statement

Knowledge injection needs to adapt to multiple dimensions of context:

1. **Operator Experience Level**: Junior vs Mid vs Senior developers need different levels of guidance
2. **Project Maturity**: New projects need standards/best-practices, mature projects need learned patterns
3. **Domain-Specific Expertise**: An operator can be senior in frontend but junior in backend

Current system lacks a mechanism to dynamically select and prioritize knowledge items based on these contextual dimensions.

---

## Solution: 2D Maturity Space with Soft Boundary Selection

### Core Concept

A **continuous 2D coordinate system** where:
- **X-axis: Operator Maturity** (0 = junior → 100 = senior)
- **Y-axis: Project Maturity** (0 = inception → 100 = mature)

Users select one of **9 quadrants** representing distinct maturity combinations. Selection creates a probabilistic **"shadow"** that extends beyond the quadrant with soft boundaries, allowing items in adjacent areas to be included with lower priority.

### Visual Model

```
   Project Maturity
   100 ┌─────┬─────┬─────┐
       │  7  │  8  │  9  │  Mature
    66 ├─────┼─────┼─────┤
       │  4  │  5  │  6  │  Development
    33 ├─────┼─────┼─────┤
       │  1  │  2  │  3  │  Inception
     0 └─────┴─────┴─────┘
       0    33   66  100
          Junior  Mid  Senior
```

**Quadrant Mappings:**

| Quadrant | Operator | Project | Label | Use Case |
|----------|----------|---------|-------|----------|
| Q1 | Junior | Inception | "Eager Learner" | New developer starting new project |
| Q2 | Mid | Inception | "Applying Skills" | Experienced dev on new project |
| Q3 | Senior | Inception | "Planning Senior" | Expert setting up new architecture |
| Q4 | Junior | Development | "Learning Builder" | Junior on established project |
| Q5 | Mid | Development | "Balanced Builder" | Mid-level on active project |
| Q6 | Senior | Development | "Guiding Builder" | Senior contributing to active project |
| Q7 | Junior | Mature | "Mature Adapter" | Junior learning established codebase |
| Q8 | Mid | Mature | "Mature Adopter" | Mid-level on mature project |
| Q9 | Senior | Mature | "Teaching Expert" | Expert on mature project, documenting |

---

## Shadow Selection with Soft Boundaries

### Shadow Characteristics

- **Center**: Highest relevance (1.0) at quadrant center point
- **Primary zone**: High relevance (0.7-1.0) within selected quadrant
- **Secondary zone**: Medium relevance (0.4-0.7) in adjacent quadrants
- **Tertiary zone**: Low relevance (0.2-0.4) in diagonal quadrants
- **Fade zone**: Minimal relevance (<0.2) in distant quadrants

### Relevance Function (Gaussian-like)

```typescript
relevance = exp(-(distance / spread)^falloff)

where:
  distance = sqrt((item.op - cursor.op)^2 + (item.proj - cursor.proj)^2)
  spread = user-adjustable parameter (how wide shadow extends)
  falloff = user-adjustable parameter (how steep the decay is)
```

### User-Adjustable Shadow Parameters

| Parameter | Range | Effect |
|-----------|-------|--------|
| **Spread** | 10-50 | How wide the shadow extends. Small = tight focus, Large = broad coverage |
| **Falloff** | 0.5-5.0 | How quickly relevance drops. Low = gradual fade, High = sharp cutoff |
| **Threshold** | 0.0-1.0 | Minimum relevance score to include item. High = fewer items, Low = more items |

---

## Data Model

### Knowledge Item Maturity Metadata

```typescript
interface MaturityMetadata {
  operator: {
    center: number;    // 0-100, optimal operator maturity
    spread: number;    // How broad the relevance range is
  };
  project: {
    center: number;    // 0-100, optimal project maturity
    spread: number;
  };
}

interface KnowledgeItem {
  id: string;
  title: string;
  type: KnowledgeType;
  body: string;
  tags: string[];
  maturity: MaturityMetadata;  // NEW
  // ... existing fields
}
```

**Example Item:**
```json
{
  "id": "item-123",
  "title": "Component Testing Best Practices",
  "type": "best-practice",
  "maturity": {
    "operator": {
      "center": 30,    // Targets junior-mid operators
      "spread": 15     // Relevant from ~15-45 range
    },
    "project": {
      "center": 20,    // Targets early projects
      "spread": 10     // Relevant from ~10-30 range
    }
  },
  "body": "Always write tests for components..."
}
```

### Maturity Configuration Schema

```typescript
interface ShadowParams {
  spread: number;      // 10-50
  falloff: number;     // 0.5-5.0
  threshold: number;   // 0.0-1.0
}

interface MaturityConfig {
  quadrant: number;         // 1-9
  shadowParams: ShadowParams;
  inheritFrom?: string;     // Optional: reference to parent config
}
```

**Global Defaults:**
```json
// .agent-brain/maturity-defaults.json
{
  "quadrant": 5,           // Mid operator, development project
  "shadowParams": {
    "spread": 30,
    "falloff": 2.0,
    "threshold": 0.3
  }
}
```

**Folder-Specific Override:**
```json
// .agent-brain/frontend/maturity.json
{
  "quadrant": 8,           // Senior in frontend, mature project
  "shadowParams": {
    "spread": 25,          // Tighter focus
    "falloff": 2.5,        // Sharper cutoff
    "threshold": 0.4       // Higher bar
  },
  "inheritFrom": "defaults"
}
```

---

## Folder-Level Configuration with Inheritance

### File Structure

```
/.agent-brain
  /maturity-defaults.json           → Workspace-level defaults
  /frontend
    /maturity.json                   → Frontend-specific (senior)
    /CLAUDE.md                        → Frontend injections
  /backend
    /maturity.json                   → Backend-specific (junior)
    /CLAUDE.md                        → Backend injections
  /templates
    /frontend-patterns.json          → Templates with maturity metadata
    /backend-patterns.json
```

### Configuration Resolution Hierarchy

1. Check for `.agent-brain/[current-folder]/maturity.json`
2. If not found, walk up directory tree to find nearest config
3. Fall back to `.agent-brain/maturity-defaults.json`
4. If none exist, use hardcoded defaults (quadrant 5, spread 30, falloff 2.0, threshold 0.3)

### Seeding New Folders

When creating a new folder-specific config, initialize from workspace defaults:

```typescript
async function createFolderConfig(folderPath: string): Promise<MaturityConfig> {
  const defaults = await loadWorkspaceDefaults();
  const newConfig = { ...defaults, inheritFrom: 'defaults' };
  await saveConfig(folderPath, newConfig);
  return newConfig;
}
```

---

## Relevance Scoring Algorithm

### Core Algorithm

```typescript
interface MaturityPoint {
  operator: number;  // 0-100
  project: number;   // 0-100
}

function quadrantToCenterPoint(quadrant: number): MaturityPoint {
  const col = ((quadrant - 1) % 3);      // 0, 1, 2
  const row = Math.floor((quadrant - 1) / 3); // 0, 1, 2

  return {
    operator: 16.67 + (col * 33.33),  // 16.67, 50, 83.33
    project: 16.67 + (row * 33.33)
  };
}

function calculateRelevance(
  itemMaturity: MaturityPoint,
  config: MaturityConfig
): number {
  const cursor = quadrantToCenterPoint(config.quadrant);
  const { spread, falloff } = config.shadowParams;

  // Euclidean distance in 2D space
  const distance = Math.sqrt(
    Math.pow(itemMaturity.operator - cursor.operator, 2) +
    Math.pow(itemMaturity.project - cursor.project, 2)
  );

  // Gaussian-like decay function
  const normalizedDistance = distance / spread;
  const relevance = Math.exp(-Math.pow(normalizedDistance, falloff));

  return relevance;
}

function selectItems(
  items: KnowledgeItem[],
  config: MaturityConfig
): Array<{ item: KnowledgeItem; relevance: number }> {
  const scored = items.map(item => ({
    item,
    relevance: calculateRelevance(
      {
        operator: item.maturity.operator.center,
        project: item.maturity.project.center
      },
      config
    )
  }));

  // Filter by threshold and sort by relevance (descending)
  return scored
    .filter(s => s.relevance >= config.shadowParams.threshold)
    .sort((a, b) => b.relevance - a.relevance);
}
```

### Example Scoring

Given quadrant 5 (mid operator, development project) with default shadow params:
- Cursor at (50, 50)
- Spread = 30, Falloff = 2.0, Threshold = 0.3

Item positions and scores:
- Item at (50, 50): distance = 0 → relevance = 1.0 ✓ **Included**
- Item at (40, 45): distance = 11.2 → relevance = 0.88 ✓ **Included**
- Item at (70, 30): distance = 28.3 → relevance = 0.39 ✓ **Included**
- Item at (20, 80): distance = 42.4 → relevance = 0.12 ✗ **Excluded** (below threshold)

---

## UI Design - Maturity Configuration Panel

### Layout

```
╔════════════════════════ Maturity Configuration ═══════════════════════╗
║                                                                        ║
║  📍 Select Context Quadrant:                                          ║
║  ┌─────────┬─────────┬─────────┐                                     ║
║  │    7    │    8    │    9    │  ← Mature Project                   ║
║  │  Past   │  Adopt  │  Teach  │                                      ║
║  ├─────────┼─────────┼─────────┤                                     ║
║  │    4    │  [ 5 ]  │    6    │  ← Development (Q5 selected)        ║
║  │  Learn  │  Build  │  Guide  │                                      ║
║  ├─────────┼─────────┼─────────┤                                     ║
║  │    1    │    2    │    3    │  ← Inception                        ║
║  │  Eager  │  Apply  │  Plan   │                                      ║
║  └─────────┴─────────┴─────────┘                                     ║
║     Junior     Mid     Senior    ← Operator Experience                ║
║                                                                        ║
║  🎛️ Shadow Parameters:                                                ║
║  ┌──────────────────────────────────────────────────────────────┐   ║
║  │ Spread:    [========|============] 30    (Shadow width)      │   ║
║  │ Falloff:   [=======|=============] 2.0   (Boundary steepness)│   ║
║  │ Threshold: [======|==============] 0.3   (Inclusion cutoff)  │   ║
║  └──────────────────────────────────────────────────────────────┘   ║
║                                                                        ║
║  🗺️ Shadow Visualization:                                            ║
║  ┌──────────────────────────────────────┐                            ║
║  │100│ ░░░░▒▒▒▓▓█▓▓▒▒▒░░░░   ○  ○      │  Dark = High Relevance     ║
║  │ 66│ ░░▒▒▓▓███████▓▓▒▒░░  ○ ○ ○      │  Light = Low Relevance     ║
║  │ 33│ ░▒▒▓███████████▓▒▒░ ○  ○         │  ○ = Knowledge Items       ║
║  │  0└──────────────────────────────┘  │  █ = Selected Quadrant     ║
║       0    33    66   100                                             ║
║                                                                        ║
║  📋 Items to Inject: 15 items (sorted by relevance)                  ║
║  ┌────────────────────────────────────────────────────────────┐     ║
║  │ ✓ [0.95] Component Testing Best Practices                  │     ║
║  │ ✓ [0.87] State Management Patterns                         │     ║
║  │ ✓ [0.72] API Design Conventions                            │     ║
║  │ ✓ [0.68] Error Handling Standards                          │     ║
║  │ ✓ [0.55] Performance Optimization Tips                     │     ║
║  │   ... 10 more items                                         │     ║
║  └────────────────────────────────────────────────────────────┘     ║
║                                                                        ║
║  💡 Auto-Recommendation: Q6 (confidence: 78%)                         ║
║  Based on: 12 learnings, avg file age 6 months, complexity: 65       ║
║                                                                        ║
║  [ Save to Current Folder ]  [ Save as Workspace Default ]           ║
╚════════════════════════════════════════════════════════════════════════╝
```

### UI Components

1. **Quadrant Grid**
   - 3×3 clickable buttons
   - Visual highlighting of selected quadrant
   - Tooltip on hover showing quadrant description
   - Labels for each quadrant (e.g., "Eager", "Build", "Teach")

2. **Shadow Parameter Sliders**
   - Three range sliders with live value display
   - Min/max labels for each slider
   - Reset to defaults button
   - Tooltip explaining each parameter

3. **Shadow Visualization Canvas**
   - 100×100 pixel canvas rendered with heat map
   - Color gradient: dark (high relevance) → light (low relevance)
   - Knowledge items plotted as dots
   - Selected quadrant marked with indicator
   - Real-time updates as parameters change

4. **Item Preview Panel**
   - Scrollable list of items to be injected
   - Relevance score displayed (0.00-1.00)
   - Color coding: green (>0.8), yellow (0.5-0.8), orange (0.3-0.5)
   - Total count badge
   - Checkbox to toggle items on/off (override)

5. **Auto-Recommendation Badge**
   - Show suggested quadrant with confidence %
   - Brief reasoning text
   - "Apply Recommendation" button

6. **Save Buttons**
   - "Save to Current Folder" → saves to `.agent-brain/[folder]/maturity.json`
   - "Save as Workspace Default" → saves to `.agent-brain/maturity-defaults.json`

---

## Adaptive Framing Based on Quadrant

Different quadrants trigger different tones and instruction styles in injected content:

| Quadrant | Label | Framing Prefix | Tone | Example |
|----------|-------|----------------|------|---------|
| Q1 | Eager Learner | 📚 **Learn:** | Instructional, detailed | "Follow this pattern step-by-step..." |
| Q2 | Applying Skills | 💡 **Apply:** | Practical, actionable | "Use this approach when..." |
| Q3 | Planning Senior | 📋 **Plan:** | Strategic, architectural | "Consider establishing..." |
| Q4 | Learning Builder | 🔨 **Build:** | Hands-on, constructive | "Implement this using..." |
| Q5 | Balanced Builder | ⚖️ **Consider:** | Balanced, evaluative | "Weigh the tradeoffs between..." |
| Q6 | Guiding Builder | 🎓 **Guide:** | Collaborative, teaching | "Share your reasoning for..." |
| Q7 | Mature Adapter | 🔄 **Adapt:** | Contextual, integrative | "Review past patterns and adjust..." |
| Q8 | Mature Adopter | ✅ **Adopt:** | Reinforcing, standardizing | "Integrate this established pattern..." |
| Q9 | Teaching Expert | 👨‍🏫 **Teach:** | Mentoring, documenting | "Document your approach for the team..." |

### Implementation

Wrap injected items with adaptive headers:

```typescript
function wrapWithFraming(item: KnowledgeItem, quadrant: number): string {
  const framingMap = {
    1: { prefix: '📚 **Learn:**', tone: 'instructional' },
    2: { prefix: '💡 **Apply:**', tone: 'practical' },
    3: { prefix: '📋 **Plan:**', tone: 'strategic' },
    4: { prefix: '🔨 **Build:**', tone: 'hands-on' },
    5: { prefix: '⚖️ **Consider:**', tone: 'balanced' },
    6: { prefix: '🎓 **Guide:**', tone: 'teaching' },
    7: { prefix: '🔄 **Adapt:**', tone: 'contextual' },
    8: { prefix: '✅ **Adopt:**', tone: 'reinforcing' },
    9: { prefix: '👨‍🏫 **Teach:**', tone: 'mentoring' }
  };

  const framing = framingMap[quadrant];

  return `
## ${framing.prefix} ${item.title}

${item.body}

---
  `;
}
```

---

## Auto-Recommendation (Future Enhancement)

### Analysis Heuristics

```typescript
interface FolderAnalysis {
  learningsCount: number;
  bestPracticesCount: number;
  codeComplexity: number;        // Average cyclomatic complexity
  fileAge: number;                // Average age in days
  advancedPatterns: number;       // Count of advanced language features
  testCoverage: number;           // Percentage
}

function analyzeFolderContext(folderPath: string): FolderAnalysis {
  return {
    learningsCount: countItemsByType(folderPath, 'learning'),
    bestPracticesCount: countItemsByType(folderPath, 'best-practice'),
    codeComplexity: calculateAverageComplexity(folderPath),
    fileAge: getAverageFileAge(folderPath),
    advancedPatterns: detectAdvancedPatterns(folderPath),
    testCoverage: calculateTestCoverage(folderPath)
  };
}
```

### Recommendation Logic

```typescript
function recommendQuadrant(analysis: FolderAnalysis): {
  quadrant: number;
  confidence: number;
  reasoning: string;
} {
  // Project maturity scoring (Y-axis)
  let projectScore = 0;
  if (analysis.learningsCount > analysis.bestPracticesCount * 2) projectScore += 30;
  if (analysis.fileAge > 180) projectScore += 30; // 6+ months old
  if (analysis.testCoverage > 70) projectScore += 20;
  projectScore = Math.min(projectScore, 100);

  // Operator maturity scoring (X-axis)
  let operatorScore = 0;
  if (analysis.codeComplexity > 10) operatorScore += 30;
  if (analysis.advancedPatterns > 5) operatorScore += 30;
  if (analysis.testCoverage > 80) operatorScore += 20;
  operatorScore = Math.min(operatorScore, 100);

  // Convert scores to row/col
  const row = Math.floor(projectScore / 34);  // 0, 1, 2
  const col = Math.floor(operatorScore / 34); // 0, 1, 2

  const quadrant = (row * 3) + col + 1;

  // Confidence based on signal strength
  const signals = [
    analysis.learningsCount > 0,
    analysis.fileAge > 30,
    analysis.codeComplexity > 5,
    analysis.testCoverage > 50
  ];
  const confidence = signals.filter(Boolean).length / signals.length;

  const reasoning = `Based on: ${analysis.learningsCount} learnings, ` +
                   `avg file age ${Math.floor(analysis.fileAge)} days, ` +
                   `complexity score ${analysis.codeComplexity.toFixed(1)}`;

  return { quadrant, confidence, reasoning };
}
```

---

## Implementation Phases

### Phase 1: Core Metadata & Data Model (Foundation)

**Duration:** 3-4 hours

**Tasks:**
1. Extend `KnowledgeItem` type with `maturity` metadata
2. Create `MaturityMetadata`, `MaturityConfig`, `ShadowParams` interfaces
3. Implement relevance scoring functions:
   - `quadrantToCenterPoint()`
   - `calculateRelevance()`
   - `selectItems()`
4. Write unit tests for scoring algorithm edge cases
5. Update bundled templates with maturity coordinates (initial estimates)
6. Create migration for existing items (default: center=50, spread=20)

**Deliverables:**
- [ ] Types defined in `types.ts`
- [ ] Scoring algorithm in `MaturityScoring.ts`
- [ ] Unit tests passing
- [ ] Bundled templates updated

---

### Phase 2: Configuration Management (Storage & Inheritance)

**Duration:** 2-3 hours

**Tasks:**
1. Create `MaturityConfigManager` service
   - Load/save maturity configs from JSON files
   - Handle workspace defaults
   - Support folder-specific overrides
2. Implement configuration resolution hierarchy:
   - Check current folder
   - Walk up directory tree
   - Fall back to workspace defaults
3. Create default configuration files:
   - `.agent-brain/maturity-defaults.json`
4. Implement seeding logic for new folders
5. Add configuration validation (range checks, schema validation)

**Deliverables:**
- [ ] `MaturityConfigManager.ts` implemented
- [ ] Config resolution working
- [ ] Default configs created
- [ ] Validation in place

---

### Phase 3: UI - Quadrant Selector & Parameter Tuning

**Duration:** 4-5 hours

**Tasks:**
1. Add "Maturity Configuration" section to Knowledge tab
2. Create 3×3 quadrant grid component:
   - Clickable buttons with labels
   - Visual highlighting of selected quadrant
   - Tooltips with descriptions
3. Add shadow parameter sliders:
   - Spread slider (10-50)
   - Falloff slider (0.5-5.0)
   - Threshold slider (0.0-1.0)
   - Live value display
4. Create item preview panel:
   - Show filtered items with relevance scores
   - Color-coded by relevance level
   - Total count badge
5. Wire up event handlers:
   - Quadrant selection updates config
   - Slider changes update preview
   - Save buttons persist config
6. Add CSS styling for quadrant grid and sliders

**Deliverables:**
- [ ] Quadrant selector UI working
- [ ] Sliders functional
- [ ] Item preview updating in real-time
- [ ] Save functionality working

---

### Phase 4: Shadow Visualization (Heat Map)

**Duration:** 5-6 hours

**Tasks:**
1. Create canvas-based heat map renderer
   - 100×100 grid
   - Color gradient based on relevance scores
   - Update in real-time as parameters change
2. Plot knowledge items as dots on canvas:
   - Position based on maturity coordinates
   - Color-code by item type
   - Size based on relevance score
   - Tooltip on hover
3. Mark selected quadrant center with indicator
4. Add legend explaining heat map colors
5. Optimize rendering performance (debounce, canvas caching)
6. Make canvas interactive (optional):
   - Click to set custom cursor position
   - Drag cursor to explore
   - Snap to nearest quadrant

**Deliverables:**
- [ ] Heat map canvas rendering
- [ ] Items plotted correctly
- [ ] Real-time updates working
- [ ] Performance optimized

---

### Phase 5: Injection Engine Integration

**Duration:** 3-4 hours

**Tasks:**
1. Update injection flow in `TemplateEngine.ts`:
   - Detect current folder context
   - Load folder's maturity config
   - Score all items using relevance algorithm
   - Filter by threshold
   - Sort by relevance
2. Implement adaptive framing:
   - Map quadrant to framing style
   - Wrap items with contextual headers
   - Add metadata footer
3. Update `KnowledgeManager` to use new scoring
4. Modify CLAUDE.md injection to include maturity context
5. Add logging for debugging (which items selected, scores)
6. Test with different quadrant selections

**Deliverables:**
- [ ] Injection engine using maturity scoring
- [ ] Adaptive framing working
- [ ] Items correctly filtered and sorted
- [ ] Maturity context in injections

---

### Phase 6: Auto-Recommendation (Future Enhancement)

**Duration:** 6-8 hours

**Tasks:**
1. Implement folder analysis heuristics:
   - Count learnings vs best-practices
   - Calculate code complexity
   - Analyze file age
   - Detect advanced patterns
   - Measure test coverage
2. Create recommendation algorithm:
   - Score project maturity
   - Score operator maturity
   - Convert to quadrant
   - Calculate confidence
3. Add recommendation UI:
   - "💡 Auto-Recommendation" badge
   - Show suggested quadrant with confidence %
   - Display reasoning text
   - "Apply Recommendation" button
4. Wire up recommendation to config UI
5. Test with various project types
6. Fine-tune heuristics based on testing

**Deliverables:**
- [ ] Folder analysis working
- [ ] Recommendation algorithm functional
- [ ] UI showing recommendations
- [ ] Heuristics calibrated

---

## Success Criteria

✅ **Data Model**: Template items have maturity metadata, configs stored per-folder
✅ **Scoring**: Relevance algorithm correctly ranks items based on distance from cursor
✅ **UI - Quadrant**: 9-quadrant selector functional, visually clear
✅ **UI - Parameters**: Sliders adjust shadow, preview updates in real-time
✅ **UI - Visualization**: Heat map shows shadow, items plotted as dots
✅ **Injection**: Items filtered and ranked by relevance, injected with adaptive framing
✅ **Configuration**: Folder-level configs work, inherit from workspace defaults
✅ **Testing**: Import test templates with maturity metadata, verify correct filtering

---

## Testing Strategy

### Unit Tests

1. **Scoring Algorithm**
   - Test `quadrantToCenterPoint()` for all 9 quadrants
   - Verify distance calculations
   - Test Gaussian decay function
   - Edge cases: items at exact cursor position, far corners

2. **Configuration Management**
   - Test config loading from files
   - Verify inheritance resolution
   - Test validation (reject invalid configs)

### Integration Tests

1. **UI Components**
   - Quadrant selection triggers config update
   - Slider changes update item preview
   - Save buttons persist to correct files

2. **Injection Engine**
   - Items filtered correctly based on config
   - Relevance scores calculated accurately
   - Adaptive framing applied correctly

### End-to-End Tests

1. **User Workflow**
   - Create new folder config
   - Select quadrant Q5
   - Adjust shadow parameters
   - View item preview
   - Save config
   - Trigger injection
   - Verify correct items in CLAUDE.md

2. **Multi-Folder Scenario**
   - Configure frontend folder (Q8)
   - Configure backend folder (Q4)
   - Switch between folders
   - Verify different items injected

---

## Migration Plan

### Existing Templates

All existing knowledge items need maturity metadata. Strategy:

**Default Assignment:**
- Assign all existing items to center (50, 50) with spread (20, 20)
- This makes them "universally relevant" until curated

**Gradual Curation:**
- Template maintainers review and adjust maturity positions
- Use UI visualization to see item distribution
- Identify gaps (e.g., no items for Q1, Q9)

**Bulk Operations:**
- Provide script to batch-update items by type:
  - `best-practice` → project=20 (inception)
  - `learning` → project=70 (mature)
  - `pattern` → operator=60 (mid-senior)

### Configuration Files

**Workspace Defaults:**
```bash
# Create default config if missing
if [ ! -f .agent-brain/maturity-defaults.json ]; then
  echo '{"quadrant": 5, "shadowParams": {"spread": 30, "falloff": 2.0, "threshold": 0.3}}' \
    > .agent-brain/maturity-defaults.json
fi
```

**Folder Configs:**
- Do not auto-create; only generate when user explicitly configures a folder
- Provide "Configure Maturity" button in Knowledge tab

---

## Open Questions

### 1. Should items have discrete positions or probability distributions?

**Option A:** Single point with spread (current proposal)
```json
"maturity": {
  "operator": { "center": 50, "spread": 20 },
  "project": { "center": 30, "spread": 15 }
}
```

**Option B:** Explicit min/max ranges
```json
"maturity": {
  "operator": { "min": 30, "max": 70, "optimal": 50 },
  "project": { "min": 15, "max": 45, "optimal": 30 }
}
```

**Recommendation:** Start with Option A (simpler), can migrate to Option B if needed.

### 2. Should we limit items per injection?

- **Hard limit**: Maximum N items regardless of relevance (e.g., top 20)
- **Threshold-based**: Include all items above threshold (current proposal)
- **Token budget**: Estimate token count, stop when budget exceeded

**Recommendation:** Start with threshold-based, add optional hard limit in UI.

### 3. How to handle "always include" items?

Some items should always be injected regardless of maturity (e.g., critical security warnings).

**Option:** Add `alwaysInclude: true` flag to item metadata.

---

## Future Enhancements

### 1. Multi-Dimensional Maturity

Extend beyond 2D to include:
- **Domain expertise**: Frontend, Backend, DevOps, ML, etc.
- **Technology stack**: React, Angular, Vue, Node.js, Python, etc.

**Challenge:** Visualizing >2 dimensions is complex.

### 2. Temporal Adaptation

Track when items are used/ignored over time:
- Auto-adjust maturity positions based on usage patterns
- Fade out unused items
- Promote frequently accessed items

### 3. Team Profiles

Multiple operator profiles per workspace:
- "Sarah (Senior Frontend)"
- "Mike (Junior Backend)"
- Quick switch between profiles

### 4. AI-Assisted Curation

Use LLM to analyze item content and suggest maturity positions:
```typescript
const suggestion = await llm.analyze(item.body);
// Returns: { operator: 65, project: 40, confidence: 0.82 }
```

---

## Timeline Estimate

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 1: Core Data Model | 3-4 hours | 3-4 hours |
| Phase 2: Configuration | 2-3 hours | 5-7 hours |
| Phase 3: Quadrant UI | 4-5 hours | 9-12 hours |
| Phase 4: Visualization | 5-6 hours | 14-18 hours |
| Phase 5: Injection Engine | 3-4 hours | 17-22 hours |
| Phase 6: Auto-Recommend | 6-8 hours | 23-30 hours |

**Total: 23-30 hours**

Can be implemented incrementally. Phases 1-3 provide immediate user value (basic quadrant selection). Phases 4-6 are enhancements.

---

## Notes

- **Workspace-centric design**: All configs stored in `.agent-brain/`, no global state
- **Folder-level granularity**: Supports domain expertise variance (senior in `/frontend`, junior in `/backend`)
- **Visual feedback**: Heat map and item preview help users understand impact of changes
- **Gradual adoption**: Existing templates work with default maturity (50, 50)
- **Extensible**: Framework supports future dimensions (domain, tech stack, etc.)

---

**Status:** Planning Complete
**Next Step:** Begin Phase 1 implementation (Core Data Model)
