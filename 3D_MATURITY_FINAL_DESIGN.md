# 3D Maturity System - Final Design Specification

**Created:** 2025-01-25
**Status:** Ready for Implementation
**Estimated Implementation:** 14-18 hours

---

## Executive Summary

This document defines the final design for the 3D maturity-based knowledge injection system. It incorporates:

1. ✅ **5x5 quadrant grid** (instead of 3x3) for better filtering precision
2. ✅ **Coordinate ranges (footprints)** instead of discrete tags
3. ✅ **Distance-based relevance** with smooth falloff
4. ✅ **Controls button pattern** for UI consistency with timeline component
5. ✅ **Foundational vs specific knowledge** naturally represented by footprint size

---

## Three Key Design Decisions

### Decision 1: 5x5 Grid (25 Quadrants)

**Problem:** 3x3 grid with adjacent selection = 56% coverage (too broad)

**Solution:** 5x5 grid with distance-based relevance = 20% core coverage + gradual falloff

**Dimensions:**
- **Operator Maturity (X-axis):** Novice → Junior → Mid → Senior → Expert (5 levels)
- **Project Maturity (Y-axis):** Planning → Inception → Development → Established → Mature (5 levels)
- **Domain Complexity (Z-axis):** Simple → Standard → Complex (3 levels, dropdown selector)

**Total space:** 25 quadrants per complexity level = 75 total quadrants

### Decision 2: Range-Based Footprints

**Problem:** Discrete tags can't represent foundational vs specific knowledge

**Solution:** Each item has a 3D footprint defined by min/max ranges on each dimension

```typescript
export interface MaturityFootprint {
  operator: { min: 1, max: 4 },    // Spans Novice through Senior
  project: { min: 2, max: 4 },     // Spans Inception through Established
  complexity: { min: 1, max: 2 }   // Spans Simple through Standard
}
```

**Benefits:**
- Foundational patterns have **broad footprints** (50-60 quadrants)
- Specific learnings have **narrow footprints** (2-10 quadrants)
- Distance-based relevance calculation (closer = more relevant)
- Smooth falloff (no hard boundaries)

### Decision 3: Controls Button Pattern

**Problem:** Always-visible configuration panel creates visual clutter

**Solution:** Follow timeline component pattern with collapsible Controls panel

**UI Pattern:**
```
┌─ Context Configuration ─────────────────────┐
│  Current Context: Productive Builder         │
│  (Mid/Development, Standard complexity)       │
│  [⚙️ Controls]                                │
└───────────────────────────────────────────────┘

Click Controls to expand configuration panel ↓
```

**Benefits:**
- Consistent with existing timeline component
- Reduces visual clutter
- Shows current context summary at all times
- Panel only visible when needed

---

## Complete Data Model

### Core Types

```typescript
/**
 * Range along a single dimension
 */
export interface MaturityRange {
  min: number;  // 1-5 for operator/project, 1-3 for complexity
  max: number;  // Must be >= min
}

/**
 * 3D footprint defining where knowledge applies
 */
export interface MaturityFootprint {
  operator: MaturityRange;    // 1=Novice, 5=Expert
  project: MaturityRange;     // 1=Planning, 5=Mature
  complexity: MaturityRange;  // 1=Simple, 3=Complex
}

/**
 * User's current working context (simple)
 */
export interface MaturityContext {
  complexity: DomainComplexity;  // Current complexity level
  quadrant: number;              // Current position (1-25)
  maxItems?: number;             // Optional limit on selected items
}

/**
 * Extended KnowledgeItem with footprint
 */
export interface KnowledgeItem {
  // ... existing fields ...

  /** 3D footprint showing where this knowledge applies */
  maturity?: MaturityFootprint;

  /** Base relevance score (0-1), multiplied by distance-based score */
  relevance?: number;

  /** Metadata for captured learnings */
  capturedAt?: Date;
  capturedContext?: MaturityContext;
}
```

### Enums

```typescript
export enum OperatorMaturity {
  NOVICE = 'novice',   // 1
  JUNIOR = 'junior',   // 2
  MID = 'mid',         // 3
  SENIOR = 'senior',   // 4
  EXPERT = 'expert'    // 5
}

export enum ProjectMaturity {
  PLANNING = 'planning',         // 1
  INCEPTION = 'inception',       // 2
  DEVELOPMENT = 'development',   // 3
  ESTABLISHED = 'established',   // 4
  MATURE = 'mature'              // 5
}

export enum DomainComplexity {
  SIMPLE = 'simple',      // 1
  STANDARD = 'standard',  // 2
  COMPLEX = 'complex'     // 3
}
```

---

## Selection Algorithm

### Distance-Based Relevance

```typescript
/**
 * Calculate relevance score based on distance from current quadrant
 */
calculateRelevance(
  itemFootprint: MaturityFootprint,
  currentQuadrant: number,
  complexity: DomainComplexity
): number {
  // Convert quadrant to coordinates
  const { operator, project } = quadrantToCoordinates(currentQuadrant);
  const complexityNum = complexityToNumber(complexity);

  // Calculate distance on each dimension (0 if inside range)
  const operatorDist = distanceFromRange(operator, itemFootprint.operator);
  const projectDist = distanceFromRange(project, itemFootprint.project);
  const complexityDist = distanceFromRange(complexityNum, itemFootprint.complexity);

  // Weighted distance (complexity is most important)
  const totalDistance =
    operatorDist * 0.3 +
    projectDist * 0.3 +
    complexityDist * 0.4;

  // Exponential decay: distance 0 = 1.0, distance 1 = 0.45, distance 2 = 0.20
  return Math.exp(-totalDistance * 0.8);
}

/**
 * Distance from a point to a range
 * Returns 0 if point is inside range
 */
function distanceFromRange(point: number, range: MaturityRange): number {
  if (point >= range.min && point <= range.max) {
    return 0; // Inside range = perfect match
  } else if (point < range.min) {
    return range.min - point; // Below range
  } else {
    return point - range.max; // Above range
  }
}
```

### Complete Selection Flow

```typescript
export class MaturitySelector {
  selectItems(
    allItems: KnowledgeItem[],
    context: MaturityContext
  ): Array<{ item: KnowledgeItem; relevance: number }> {

    // Calculate relevance for each item
    const scoredItems = allItems
      .filter(item => item.maturity !== undefined)
      .map(item => {
        // Distance-based relevance (0-1)
        const distanceRelevance = this.calculateRelevance(
          item.maturity!,
          context.quadrant,
          context.complexity
        );

        // Multiply by base relevance (item quality score)
        const baseRelevance = item.relevance || 0.5;
        const finalRelevance = distanceRelevance * baseRelevance;

        return { item, relevance: finalRelevance };
      })
      .filter(entry => entry.relevance > 0.1); // Exclude very low relevance

    // Sort by relevance (highest first)
    scoredItems.sort((a, b) => b.relevance - a.relevance);

    // Apply max items limit
    if (context.maxItems) {
      return scoredItems.slice(0, context.maxItems);
    }

    return scoredItems;
  }
}
```

---

## Example Footprints

### Foundational Pattern (Broad)

**Repository Pattern Implementation**

```json
{
  "title": "Repository Pattern Implementation",
  "type": "pattern",
  "maturity": {
    "operator": { "min": 1, "max": 4 },    // Novice → Senior
    "project": { "min": 2, "max": 4 },     // Inception → Established
    "complexity": { "min": 1, "max": 2 }   // Simple → Standard
  },
  "relevance": 0.8
}
```

**Coverage:** 4 × 3 × 2 = 24 quadrants (32% of space)

### Specific Learning (Narrow)

**Fixed React Hook Dependency Bug**

```json
{
  "title": "Fixed React Hook Dependency Array Bug in UserProfile",
  "type": "learning",
  "maturity": {
    "operator": { "min": 2, "max": 3 },    // Junior → Mid
    "project": { "min": 4, "max": 5 },     // Established → Mature
    "complexity": { "min": 2, "max": 2 }   // Standard only
  },
  "relevance": 0.9
}
```

**Coverage:** 2 × 2 × 1 = 4 quadrants (5% of space)

### Universal Standard (Very Broad)

**Code Review Best Practices**

```json
{
  "title": "Code Review Best Practices",
  "type": "standard",
  "maturity": {
    "operator": { "min": 1, "max": 5 },    // All levels
    "project": { "min": 2, "max": 5 },     // Inception → Mature
    "complexity": { "min": 1, "max": 3 }   // All complexity
  },
  "relevance": 0.7
}
```

**Coverage:** 5 × 4 × 3 = 60 quadrants (80% of space)

---

## UI Implementation

### Controls Button Pattern

```typescript
/**
 * Render maturity section with collapsible controls
 */
renderMaturitySection(): string {
  return `
    <div class="maturity-section">
      <div class="section-header">
        <div class="header-left">
          <h3>Context Configuration</h3>
          <span class="context-summary">${this.getContextSummary()}</span>
        </div>
        <button class="btn-controls" id="maturity-controls-toggle">
          <span class="codicon codicon-settings-gear"></span>
          Controls
        </button>
      </div>

      <!-- Collapsible configuration panel (hidden by default) -->
      <div id="maturity-config-panel" class="config-panel" style="display: none;">
        ${this.renderConfigPanel()}
      </div>
    </div>
  `;
}

/**
 * Get human-readable context summary
 */
getContextSummary(): string {
  const info = QUADRANT_MAP_5X5[this.currentContext.quadrant];
  return `${info.label} (${this.currentContext.complexity} complexity)`;
}
```

### Configuration Panel (5x5 Grid)

```typescript
renderConfigPanel(): string {
  return `
    <div class="maturity-config-body">
      <!-- Complexity Dropdown -->
      <div class="complexity-selector">
        <label>Complexity Level:</label>
        <select id="complexity-select">
          <option value="simple">Simple (Basic CRUD, straightforward logic)</option>
          <option value="standard" selected>Standard (Typical business logic)</option>
          <option value="complex">Complex (Distributed systems, algorithms)</option>
        </select>
      </div>

      <!-- 5x5 Quadrant Grid -->
      <div class="quadrant-grid-5x5">
        <!-- Grid labels and buttons -->
        ${this.render5x5Grid()}
      </div>

      <!-- Max Items Slider -->
      <div class="max-items-control">
        <label>Maximum items: <span id="max-items-value">25</span></label>
        <input type="range" id="max-items-slider" min="5" max="50" value="25" step="5" />
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <button class="btn-secondary" id="reset-defaults">Reset to Defaults</button>
        <button class="btn-primary" id="apply-config">Apply Configuration</button>
      </div>
    </div>
  `;
}
```

### Footprint Editor for Items

```typescript
/**
 * Render footprint editor when creating/editing items
 */
renderFootprintEditor(footprint: MaturityFootprint): string {
  return `
    <div class="footprint-editor">
      <h4>Knowledge Applicability (3D Footprint)</h4>
      <p class="hint">Define where this knowledge is most useful</p>

      <!-- Operator Range -->
      <div class="range-editor">
        <label>Operator Maturity</label>
        <div class="dual-range-slider">
          <input type="range" min="1" max="5" value="${footprint.operator.min}"
                 id="op-min" class="range-min" />
          <input type="range" min="1" max="5" value="${footprint.operator.max}"
                 id="op-max" class="range-max" />
        </div>
        <div class="range-labels">
          <span>Novice</span>
          <span>Junior</span>
          <span>Mid</span>
          <span>Senior</span>
          <span>Expert</span>
        </div>
        <div class="range-display">
          <strong>${this.getOperatorLabel(footprint.operator.min)}</strong>
          through
          <strong>${this.getOperatorLabel(footprint.operator.max)}</strong>
        </div>
      </div>

      <!-- Project Range (similar structure) -->
      <!-- Complexity Range (similar structure) -->

      <!-- Footprint Summary -->
      <div class="footprint-summary">
        <p>Coverage: <strong>${this.calculateCoverage(footprint)}</strong> quadrants
           (<strong>${this.calculatePercentage(footprint)}%</strong> of space)</p>
        <p class="classification">
          ${this.classifyFootprint(footprint)}
        </p>
      </div>
    </div>
  `;
}

/**
 * Classify footprint as foundational, specific, or universal
 */
classifyFootprint(footprint: MaturityFootprint): string {
  const coverage = this.calculateCoverage(footprint);

  if (coverage >= 50) {
    return '📚 <strong>Universal/Foundational</strong> - Applies broadly across contexts';
  } else if (coverage >= 15) {
    return '🔨 <strong>General</strong> - Applies to multiple contexts';
  } else {
    return '🎯 <strong>Specific</strong> - Applies to narrow context';
  }
}
```

---

## Smart Defaults

### Auto-Suggest Footprints by Item Type

```typescript
function suggestFootprint(item: KnowledgeItem): MaturityFootprint {
  switch (item.type) {
    case KnowledgeType.PATTERN:
      return {
        operator: { min: 1, max: 4 },    // Novice → Senior
        project: { min: 2, max: 4 },     // Inception → Established
        complexity: { min: 1, max: 2 }   // Simple → Standard
      };

    case KnowledgeType.LEARNING:
      return {
        operator: { min: 2, max: 3 },    // Junior → Mid
        project: { min: 3, max: 5 },     // Development → Mature
        complexity: { min: 2, max: 2 }   // Standard only
      };

    case KnowledgeType.STANDARD:
      return {
        operator: { min: 1, max: 5 },    // All operators
        project: { min: 2, max: 5 },     // Inception → Mature
        complexity: { min: 1, max: 3 }   // All complexity
      };

    case KnowledgeType.ADR:
      return {
        operator: { min: 3, max: 5 },    // Mid → Expert
        project: { min: 1, max: 4 },     // Planning → Established
        complexity: { min: 2, max: 3 }   // Standard → Complex
      };
  }
}
```

### Learning Capture with Context-Based Footprint

```typescript
/**
 * Create learning with footprint centered on current context
 * Footprint = current position ± 1 level
 */
function createLearningFromContext(
  content: string,
  context: MaturityContext
): KnowledgeItem {
  const { operator, project } = quadrantToCoordinates(context.quadrant);
  const complexity = complexityToNumber(context.complexity);

  return {
    // ... standard fields ...
    maturity: {
      operator: {
        min: Math.max(1, operator - 1),
        max: Math.min(5, operator + 1)
      },
      project: {
        min: Math.max(1, project - 1),
        max: Math.min(5, project + 1)
      },
      complexity: {
        min: complexity,
        max: complexity  // Learnings are complexity-specific
      }
    },
    relevance: 0.8,
    capturedAt: new Date(),
    capturedContext: context
  };
}
```

---

## Default Configuration

### Workspace Default (maturity-config.json)

```json
{
  "complexity": "standard",
  "quadrant": 13,
  "maxItems": 25
}
```

**Quadrant 13** = Mid operator, Development project (center of grid)

---

## Implementation Phases

### Phase 1: Data Model & Selection Logic (4-5 hours)

1. **Update `types.ts`** (1 hour)
   - Add `MaturityRange`, `MaturityFootprint` interfaces
   - Update `KnowledgeItem` with optional `maturity` field
   - Add 5-level enums for operator/project

2. **Create `MaturitySelector.ts`** (2 hours)
   - Implement `quadrantToCoordinates()`
   - Implement `distanceFromRange()`
   - Implement `calculateRelevance()` with distance-based scoring
   - Implement `selectItems()` with sorting and limiting

3. **Create `FramingTemplates.ts`** (1 hour)
   - Update quadrant mappings for 25 quadrants
   - Update framing templates for all contexts

4. **Unit tests** (1 hour)
   - Test distance calculation
   - Test relevance scoring
   - Test footprint coverage calculation

**Deliverables:**
- ✅ Complete data model with footprints
- ✅ Working selection algorithm with distance-based relevance
- ✅ Framing templates for 25 quadrants
- ✅ Passing unit tests

### Phase 2: Configuration Management (2-3 hours)

1. **Create `MaturityConfigManager.ts`** (1 hour)
   - JSON serialization/deserialization
   - Validation for 1-25 quadrant range
   - Default configuration

2. **Extend `KnowledgeManager.ts`** (1 hour)
   - `getMaturityContext()` - load from .agent-brain/maturity-config.json
   - `saveMaturityContext()` - save with validation

3. **Add message handlers** (1 hour)
   - `maturity:get-context`
   - `maturity:save-context`

**Deliverables:**
- ✅ Configuration persistence
- ✅ Backend services with maturity support
- ✅ Message handlers for context management

### Phase 3: UI Implementation (5-6 hours)

1. **Create `MaturityConfigPanel.ts`** (2 hours)
   - Collapsible panel with Controls button
   - Complexity dropdown
   - 5x5 quadrant grid with click handlers
   - Max items slider
   - Apply/Reset buttons

2. **Create `FootprintEditor.ts`** (2 hours)
   - Dual-range sliders for operator/project/complexity
   - Real-time footprint coverage calculation
   - Footprint classification (foundational/general/specific)
   - Smart defaults by item type

3. **Integrate into `KnowledgeViewController.ts`** (1 hour)
   - Add maturity section with Controls button
   - Wire up message passing
   - Add context summary display

4. **Add CSS styling** (1 hour)
   - Style 5x5 grid (smaller buttons, 6px gap)
   - Style Controls button (codicon integration)
   - Style dual-range sliders
   - Style footprint editor

**Deliverables:**
- ✅ Collapsible maturity configuration panel
- ✅ 5x5 quadrant selector UI
- ✅ Footprint editor for items
- ✅ Consistent Controls button pattern

### Phase 4: Injection Integration (3-4 hours)

1. **Extend `TemplateEngine.ts`** (2 hours)
   - `injectTemplateWithMaturity()` - use MaturitySelector
   - Apply framing based on quadrant
   - Generate context header with item counts

2. **Extend `TemplateOperationsService.ts`** (1 hour)
   - `injectTemplateWithMaturity()` wrapper
   - Add message handler for `v1:inject-template-with-maturity`

3. **Learning capture** (1 hour)
   - Auto-tag captured learnings with footprint
   - Center footprint on current context ± 1 level

**Deliverables:**
- ✅ Maturity-aware injection
- ✅ Framed content in CLAUDE.md
- ✅ Learning capture with auto-footprinting

---

## Migration Strategy

### Existing Templates Without Footprints

```typescript
/**
 * Default footprint for items without maturity metadata
 * Treated as universal/foundational knowledge
 */
const DEFAULT_FOOTPRINT: MaturityFootprint = {
  operator: { min: 1, max: 5 },    // All operators
  project: { min: 1, max: 5 },     // All projects
  complexity: { min: 1, max: 3 }   // All complexity
};
```

Items without `maturity` field are assigned maximum footprint (always selected).

### Migration Script

```bash
# Add smart defaults to existing bundled templates
node scripts/migrate-footprints.ts
```

Script analyzes item type and suggests appropriate footprint.

---

## Success Metrics

1. **Configuration Time**: < 30 seconds to select quadrant and complexity
2. **Relevance**: 80%+ of injected items rated as "useful" by users
3. **Performance**: Selection algorithm < 100ms for 200 items
4. **Adoption**: Users configure maturity without assistance
5. **Footprint Accuracy**: 75%+ of items have appropriate footprints after auto-suggestion

---

## Timeline Summary

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 1: Data Model & Selection | 4-5 hours | 4-5 hours |
| Phase 2: Configuration | 2-3 hours | 6-8 hours |
| Phase 3: UI | 5-6 hours | 11-14 hours |
| Phase 4: Injection | 3-4 hours | 14-18 hours |

**Total: 14-18 hours**
**MVP Ready After: Phase 3** (11-14 hours)

---

## Key Design Principles

1. ✅ **Simple user experience** - User selects one quadrant, system does the rest
2. ✅ **Rich item metadata** - Items have sophisticated footprints showing full applicability
3. ✅ **Distance-based relevance** - Smooth falloff, no hard boundaries
4. ✅ **Foundational vs specific** - Naturally represented by footprint size
5. ✅ **UI consistency** - Controls button pattern matches timeline component
6. ✅ **Smart defaults** - Auto-suggest footprints based on item type
7. ✅ **Backward compatible** - Items without footprints work with universal coverage

---

**Status:** Final design complete, ready for implementation
**Next Step:** Begin Phase 1 implementation
