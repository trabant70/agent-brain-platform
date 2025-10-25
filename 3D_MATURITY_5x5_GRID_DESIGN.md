# 5x5 Grid Maturity System - Refined Design

**Created:** 2025-01-25
**Purpose:** Address adjacent quadrant over-selection issue
**Previous:** 3x3 grid (5/9 = 56% coverage with adjacent)
**Updated:** 5x5 grid (5/25 = 20% coverage with adjacent)

---

## Problem with 3x3 Grid

The original 3x3 grid has insufficient granularity:

- **With adjacent quadrants enabled**: Selects 5 out of 9 quadrants (56% of all items)
- **Result**: Defeats the purpose of context-specific filtering
- **User feedback**: "we would get pretty much most if not all of the items"

---

## Solution: 5x5 Grid

A 5x5 grid provides better granularity while maintaining intuitive categorization:

- **With adjacent quadrants enabled**: Selects 5 out of 25 quadrants (20% of items)
- **Better filtering**: More precise context matching
- **More flexibility**: Finer-grained progression paths

---

## 5-Level Dimension Scales

### Operator Maturity (X-axis) - 5 Levels

| Level | Label | Description | Typical Behavior |
|-------|-------|-------------|------------------|
| 1 | **Novice** | New to programming or domain | Needs step-by-step guidance, foundational concepts |
| 2 | **Junior** | 0-2 years experience | Follows established patterns, learning best practices |
| 3 | **Mid** | 2-5 years experience | Applies patterns independently, moderate complexity |
| 4 | **Senior** | 5-10 years experience | Designs solutions, handles complex problems |
| 5 | **Expert** | 10+ years experience | Architects systems, defines standards |

### Project Maturity (Y-axis) - 5 Levels

| Level | Label | Description | Typical Activities |
|-------|-------|-------------|-------------------|
| 1 | **Planning** | Pre-inception, research phase | Exploring options, evaluating approaches |
| 2 | **Inception** | Starting new project | Architecture decisions, foundation setup |
| 3 | **Development** | Active building phase | Feature implementation, iterating on design |
| 4 | **Established** | Stable but growing | Adding features, refining existing code |
| 5 | **Mature** | Production, maintenance | Optimization, bug fixes, documentation |

---

## Updated TypeScript Definitions

### Enums (Update in `types.ts`)

```typescript
/**
 * Operator maturity levels (5 levels)
 */
export enum OperatorMaturity {
  NOVICE = 'novice',   // NEW
  JUNIOR = 'junior',
  MID = 'mid',
  SENIOR = 'senior',
  EXPERT = 'expert'    // NEW (was just "senior")
}

/**
 * Project maturity levels (5 levels)
 */
export enum ProjectMaturity {
  PLANNING = 'planning',         // NEW
  INCEPTION = 'inception',
  DEVELOPMENT = 'development',
  ESTABLISHED = 'established',   // NEW
  MATURE = 'mature'
}

/**
 * Domain complexity levels (unchanged)
 */
export enum DomainComplexity {
  SIMPLE = 'simple',
  STANDARD = 'standard',
  COMPLEX = 'complex'
}
```

### Quadrant Mapping (1-25)

```typescript
/**
 * 5x5 Quadrant to Tags Mapping
 * Quadrant numbering (bottom-up, left-to-right):
 *
 *   21  22  23  24  25  ← Mature
 *   16  17  18  19  20  ← Established
 *   11  12  13  14  15  ← Development
 *   6   7   8   9   10  ← Inception
 *   1   2   3   4   5   ← Planning
 *   ↑   ↑   ↑   ↑   ↑
 *   Nov Jun Mid Sen Exp
 */
export const QUADRANT_MAP_5X5: Record<number, QuadrantMapping> = {
  // Planning row (Y=1)
  1:  { operator: OperatorMaturity.NOVICE, project: ProjectMaturity.PLANNING, label: 'Learning Explorer', framing: 'Discover' },
  2:  { operator: OperatorMaturity.JUNIOR, project: ProjectMaturity.PLANNING, label: 'Research Assistant', framing: 'Learn' },
  3:  { operator: OperatorMaturity.MID, project: ProjectMaturity.PLANNING, label: 'Tech Evaluator', framing: 'Assess' },
  4:  { operator: OperatorMaturity.SENIOR, project: ProjectMaturity.PLANNING, label: 'Solution Architect', framing: 'Design' },
  5:  { operator: OperatorMaturity.EXPERT, project: ProjectMaturity.PLANNING, label: 'Strategic Planner', framing: 'Strategize' },

  // Inception row (Y=2)
  6:  { operator: OperatorMaturity.NOVICE, project: ProjectMaturity.INCEPTION, label: 'Guided Starter', framing: 'Follow' },
  7:  { operator: OperatorMaturity.JUNIOR, project: ProjectMaturity.INCEPTION, label: 'Learning Starter', framing: 'Learn' },
  8:  { operator: OperatorMaturity.MID, project: ProjectMaturity.INCEPTION, label: 'Applying Foundations', framing: 'Apply' },
  9:  { operator: OperatorMaturity.SENIOR, project: ProjectMaturity.INCEPTION, label: 'Architecting', framing: 'Design' },
  10: { operator: OperatorMaturity.EXPERT, project: ProjectMaturity.INCEPTION, label: 'Framework Creator', framing: 'Define' },

  // Development row (Y=3)
  11: { operator: OperatorMaturity.NOVICE, project: ProjectMaturity.DEVELOPMENT, label: 'Assisted Builder', framing: 'Practice' },
  12: { operator: OperatorMaturity.JUNIOR, project: ProjectMaturity.DEVELOPMENT, label: 'Growing Builder', framing: 'Study' },
  13: { operator: OperatorMaturity.MID, project: ProjectMaturity.DEVELOPMENT, label: 'Productive Builder', framing: 'Build' },
  14: { operator: OperatorMaturity.SENIOR, project: ProjectMaturity.DEVELOPMENT, label: 'Lead Builder', framing: 'Guide' },
  15: { operator: OperatorMaturity.EXPERT, project: ProjectMaturity.DEVELOPMENT, label: 'Principal Engineer', framing: 'Architect' },

  // Established row (Y=4)
  16: { operator: OperatorMaturity.NOVICE, project: ProjectMaturity.ESTABLISHED, label: 'Code Explorer', framing: 'Explore' },
  17: { operator: OperatorMaturity.JUNIOR, project: ProjectMaturity.ESTABLISHED, label: 'Feature Developer', framing: 'Implement' },
  18: { operator: OperatorMaturity.MID, project: ProjectMaturity.ESTABLISHED, label: 'System Contributor', framing: 'Enhance' },
  19: { operator: OperatorMaturity.SENIOR, project: ProjectMaturity.ESTABLISHED, label: 'System Steward', framing: 'Improve' },
  20: { operator: OperatorMaturity.EXPERT, project: ProjectMaturity.ESTABLISHED, label: 'Tech Lead', framing: 'Evolve' },

  // Mature row (Y=5)
  21: { operator: OperatorMaturity.NOVICE, project: ProjectMaturity.MATURE, label: 'Codebase Learner', framing: 'Understand' },
  22: { operator: OperatorMaturity.JUNIOR, project: ProjectMaturity.MATURE, label: 'Learning Maintainer', framing: 'Explore' },
  23: { operator: OperatorMaturity.MID, project: ProjectMaturity.MATURE, label: 'System Maintainer', framing: 'Maintain' },
  24: { operator: OperatorMaturity.SENIOR, project: ProjectMaturity.MATURE, label: 'System Expert', framing: 'Document' },
  25: { operator: OperatorMaturity.EXPERT, project: ProjectMaturity.MATURE, label: 'Platform Owner', framing: 'Govern' }
};
```

---

## Updated Selection Algorithm

### Adjacent Quadrant Calculation (5x5)

```typescript
/**
 * Get adjacent quadrants in 5x5 grid
 * Returns up/down/left/right neighbors (no diagonals)
 */
private getAdjacentQuadrants(quadrant: number): number[] {
  const adjacent: number[] = [];

  // Calculate row and column (1-based)
  const row = Math.ceil(quadrant / 5);     // 1-5
  const col = ((quadrant - 1) % 5) + 1;    // 1-5

  // Left neighbor (same row, col-1)
  if (col > 1) {
    adjacent.push(quadrant - 1);
  }

  // Right neighbor (same row, col+1)
  if (col < 5) {
    adjacent.push(quadrant + 1);
  }

  // Down neighbor (row-1, same col)
  if (row > 1) {
    adjacent.push(quadrant - 5);
  }

  // Up neighbor (row+1, same col)
  if (row < 5) {
    adjacent.push(quadrant + 5);
  }

  return adjacent;
}
```

### Example Adjacent Quadrants

```
Quadrant 13 (Mid/Development) - CENTER OF GRID
Adjacent: [12, 14, 8, 18]
         (left, right, down, up)

Grid visualization:
  18
  ↑
12 ← 13 → 14
  ↓
  8

Coverage: 5/25 = 20%
```

```
Quadrant 3 (Mid/Planning) - BOTTOM CENTER
Adjacent: [2, 4, 8]
         (left, right, up)

Grid visualization:
  8
  ↑
2 ← 3 → 4

Coverage: 4/25 = 16%
```

---

## UI Changes for 5x5 Grid

### Updated MaturityConfigPanel Rendering

```typescript
/**
 * Render 5x5 quadrant grid
 */
private renderQuadrantGrid(): string {
  const quadrantInfo = this.maturitySelector.getQuadrantInfo(this.currentContext.quadrant);

  return `
    <div class="maturity-quadrant-container">
      <p class="quadrant-label">Your Context: <strong>${quadrantInfo.label}</strong></p>

      <div class="maturity-quadrant-grid-5x5">
        <div class="grid-axis-label grid-axis-y">Project Maturity</div>
        <div class="grid-axis-label grid-axis-x">Operator Experience</div>

        <!-- Mature row (Y=5) -->
        <div class="grid-row-label">Mature</div>
        ${this.renderQuadrantButton(21)}
        ${this.renderQuadrantButton(22)}
        ${this.renderQuadrantButton(23)}
        ${this.renderQuadrantButton(24)}
        ${this.renderQuadrantButton(25)}

        <!-- Established row (Y=4) -->
        <div class="grid-row-label">Established</div>
        ${this.renderQuadrantButton(16)}
        ${this.renderQuadrantButton(17)}
        ${this.renderQuadrantButton(18)}
        ${this.renderQuadrantButton(19)}
        ${this.renderQuadrantButton(20)}

        <!-- Development row (Y=3) -->
        <div class="grid-row-label">Development</div>
        ${this.renderQuadrantButton(11)}
        ${this.renderQuadrantButton(12)}
        ${this.renderQuadrantButton(13)}
        ${this.renderQuadrantButton(14)}
        ${this.renderQuadrantButton(15)}

        <!-- Inception row (Y=2) -->
        <div class="grid-row-label">Inception</div>
        ${this.renderQuadrantButton(6)}
        ${this.renderQuadrantButton(7)}
        ${this.renderQuadrantButton(8)}
        ${this.renderQuadrantButton(9)}
        ${this.renderQuadrantButton(10)}

        <!-- Planning row (Y=1) -->
        <div class="grid-row-label">Planning</div>
        ${this.renderQuadrantButton(1)}
        ${this.renderQuadrantButton(2)}
        ${this.renderQuadrantButton(3)}
        ${this.renderQuadrantButton(4)}
        ${this.renderQuadrantButton(5)}

        <!-- Column labels -->
        <div class="grid-col-label">Novice</div>
        <div class="grid-col-label">Junior</div>
        <div class="grid-col-label">Mid</div>
        <div class="grid-col-label">Senior</div>
        <div class="grid-col-label">Expert</div>
      </div>
    </div>
  `;
}
```

### Updated CSS for 5x5 Grid

```css
/* 5x5 Quadrant Grid */
.maturity-quadrant-grid-5x5 {
  display: grid;
  grid-template-columns: 100px repeat(5, 1fr);  /* 5 columns instead of 3 */
  grid-template-rows: auto repeat(5, 50px) auto;  /* 5 rows instead of 3 */
  gap: 6px;  /* Slightly smaller gap for more buttons */
  max-width: 650px;  /* Wider to accommodate 5 columns */
}

/* Smaller buttons for 5x5 grid */
.maturity-quadrant-grid-5x5 .quadrant-btn {
  padding: 8px;  /* Reduced from 12px */
  font-size: 12px;  /* Reduced from 14px */
}
```

---

## Controls Button Pattern (UI Consistency)

### Current Timeline Pattern

The timeline component uses a "Controls" button that opens a configuration panel. To maintain consistency across the extension, the maturity configuration should follow the same pattern.

### Recommended Approach

**Instead of always showing the maturity panel**, use a collapsible/expandable pattern:

```typescript
/**
 * Render maturity configuration with Controls button
 */
renderMaturitySection(): string {
  return `
    <div class="maturity-section">
      <div class="section-header">
        <h3>Context Configuration</h3>
        <button class="btn-icon" id="maturity-controls-toggle" title="Configure maturity context">
          <span class="codicon codicon-settings-gear"></span> Controls
        </button>
      </div>

      <!-- Initially hidden panel -->
      <div id="maturity-config-panel" class="maturity-config-panel" style="display: none;">
        ${this.maturityConfigPanel.render()}
      </div>

      <!-- Current context summary (always visible) -->
      <div class="maturity-summary">
        <span class="summary-label">Current Context:</span>
        <span class="summary-value">${this.getContextSummary()}</span>
      </div>
    </div>
  `;
}

/**
 * Get human-readable context summary
 */
getContextSummary(): string {
  const info = this.maturitySelector.getQuadrantInfo(this.currentContext.quadrant);
  return `${info.label} (${this.currentContext.complexity} complexity)`;
}
```

**Event Handler:**

```typescript
// Toggle controls panel visibility
const controlsToggle = document.getElementById('maturity-controls-toggle');
controlsToggle?.addEventListener('click', () => {
  const panel = document.getElementById('maturity-config-panel');
  if (panel) {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  }
});
```

**Benefits:**
1. ✅ **Consistent with timeline** - Same "Controls" button pattern
2. ✅ **Less visual clutter** - Panel hidden until needed
3. ✅ **Always shows current context** - Summary visible at all times
4. ✅ **VSCode icon integration** - Uses codicon settings-gear icon

---

## Default Configuration Update

### New Default (Center of 5x5 Grid)

```json
{
  "complexity": "standard",
  "quadrant": 13,
  "includeAdjacent": true,
  "includeAllComplexity": false,
  "maxItems": 25
}
```

**Quadrant 13** = Mid operator, Development project (center of grid)

---

## Migration from 3x3 to 5x5

### Quadrant Mapping Translation

| Old 3x3 Quadrant | Operator/Project | New 5x5 Quadrant |
|------------------|------------------|------------------|
| Q1 (Junior/Inception) | Junior/Inception | Q7 |
| Q2 (Mid/Inception) | Mid/Inception | Q8 |
| Q3 (Senior/Inception) | Senior/Inception | Q9 |
| Q4 (Junior/Development) | Junior/Development | Q12 |
| Q5 (Mid/Development) | Mid/Development | Q13 |
| Q6 (Senior/Development) | Senior/Development | Q14 |
| Q7 (Junior/Mature) | Junior/Mature | Q22 |
| Q8 (Mid/Mature) | Mid/Mature | Q23 |
| Q9 (Senior/Mature) | Senior/Mature | Q24 |

### Migration Script

```typescript
/**
 * Migrate 3x3 quadrant to 5x5 quadrant
 */
function migrateQuadrant(oldQuadrant: number): number {
  const migration = {
    1: 7,   // Junior/Inception
    2: 8,   // Mid/Inception
    3: 9,   // Senior/Inception
    4: 12,  // Junior/Development
    5: 13,  // Mid/Development (default)
    6: 14,  // Senior/Development
    7: 22,  // Junior/Mature
    8: 23,  // Mid/Mature
    9: 24   // Senior/Mature
  };

  return migration[oldQuadrant] || 13; // Default to center
}
```

---

## Validation Updates

### Updated MaturityConfigManager

```typescript
/**
 * Validate maturity configuration (5x5 grid)
 */
static validate(context: MaturityContext): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate complexity
  if (!Object.values(DomainComplexity).includes(context.complexity)) {
    errors.push(`Invalid complexity: ${context.complexity}`);
  }

  // Validate quadrant (1-25 instead of 1-9)
  if (context.quadrant < 1 || context.quadrant > 25) {
    errors.push(`Invalid quadrant: ${context.quadrant}. Must be 1-25.`);
  }

  // Validate max items
  if (context.maxItems && (context.maxItems < 1 || context.maxItems > 100)) {
    errors.push(`Invalid maxItems: ${context.maxItems}. Must be 1-100.`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

---

## Summary of Changes

### Key Improvements

1. **Better Granularity**: 25 quadrants vs 9 quadrants
2. **Better Filtering**: 20% coverage with adjacent vs 56%
3. **More Progression Paths**: 5 levels allow smoother transitions
4. **UI Consistency**: Controls button pattern matches timeline component
5. **Less Visual Clutter**: Panel hidden until needed

### Updated Estimates

| Component | 3x3 Estimate | 5x5 Estimate | Delta |
|-----------|--------------|--------------|-------|
| Data Model | 3-4 hours | 4-5 hours | +1 hour (more mappings) |
| Configuration | 2-3 hours | 2-3 hours | No change |
| UI Implementation | 4-5 hours | 5-6 hours | +1 hour (larger grid) |
| Injection | 3-4 hours | 3-4 hours | No change |
| **Total** | **12-16 hours** | **14-18 hours** | **+2 hours** |

The additional complexity is minimal (2 hours) and well worth the improved filtering precision.

---

## Next Steps

1. ✅ **Review this design** with user
2. ⏭️ **Update implementation plan** to use 5x5 grid
3. ⏭️ **Update UI mockups** with Controls button pattern
4. ⏭️ **Begin Phase 1 implementation** with 5x5 quadrant mapping

---

**Status:** Design refinement complete, ready for implementation approval
