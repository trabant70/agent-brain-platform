# 3D Maturity System - Coordinate Range Design

**Created:** 2025-01-25
**Refinement:** Range-based footprints instead of discrete tags
**Key Insight:** Foundational knowledge spans broad ranges, specific knowledge has narrow footprints

---

## Problem with Tag-Based Approach

The discrete tag approach is too simplistic:

```typescript
// TOO SIMPLISTIC
maturity: {
  operator: ['junior', 'mid'],        // Just 2 discrete values
  project: ['inception', 'development'], // Just 2 discrete values
  complexity: ['standard']               // Just 1 value
}
```

**Issues:**
1. ❌ Can't represent gradual applicability
2. ❌ Can't distinguish between "foundational" vs "specific" knowledge
3. ❌ Can't calculate distance-based relevance
4. ❌ Can't visualize knowledge footprint

---

## Solution: Coordinate Ranges (Footprints)

Each knowledge item defines **ranges** across each dimension:

```typescript
// BETTER - Range-based footprints
maturity: {
  operator: { min: 2, max: 4 },        // Junior through Senior (3 levels)
  project: { min: 2, max: 4 },         // Inception through Established (3 levels)
  complexity: { min: 1, max: 2 }       // Simple through Standard (2 levels)
}
```

This represents a **3D box** in maturity space that defines where the knowledge is applicable.

---

## Updated Data Model

### MaturityRange Interface

```typescript
/**
 * Range along a single dimension (1-5 scale)
 */
export interface MaturityRange {
  min: number;  // 1-5
  max: number;  // 1-5, must be >= min
}

/**
 * 3D footprint - defines applicability across all three dimensions
 */
export interface MaturityFootprint {
  /** Operator maturity range (1=Novice, 5=Expert) */
  operator: MaturityRange;

  /** Project maturity range (1=Planning, 5=Mature) */
  project: MaturityRange;

  /** Complexity range (1=Simple, 2=Standard, 3=Complex) */
  complexity: MaturityRange;
}

/**
 * Extended KnowledgeItem with footprint
 */
export interface KnowledgeItem {
  id: string;
  type: KnowledgeType;
  scope: KnowledgeScope;
  title: string;
  body: string;
  tags: string[];

  // ... existing fields ...

  /**
   * Maturity footprint - defines where this knowledge applies
   * Items without footprint are treated as "universal" (apply everywhere)
   */
  maturity?: MaturityFootprint;

  /**
   * Base relevance score (0-1)
   * Used as multiplier for distance-based relevance calculation
   */
  relevance?: number;
}
```

---

## Examples of Footprints

### Example 1: Foundational Pattern (Broad Footprint)

**"Repository Pattern Implementation"**

```json
{
  "title": "Repository Pattern Implementation",
  "type": "pattern",
  "maturity": {
    "operator": { "min": 1, "max": 4 },    // Novice through Senior (4 levels)
    "project": { "min": 2, "max": 4 },     // Inception through Established (3 levels)
    "complexity": { "min": 1, "max": 2 }   // Simple through Standard (2 levels)
  },
  "relevance": 0.8
}
```

**Footprint size:** 4 × 3 × 2 = 24 quadrants out of 75 total (32% coverage)

**Interpretation:**
- Useful for Novice through Senior developers
- Most relevant during Inception through Established phases
- Not needed for complex systems (they use more sophisticated patterns)
- Excluded from Planning (too early) and Mature (already established)

### Example 2: Specific Learning (Narrow Footprint)

**"Fixed React Hook Dependency Array Bug in UserProfile Component"**

```json
{
  "title": "Fixed React Hook Dependency Array Bug in UserProfile",
  "type": "learning",
  "maturity": {
    "operator": { "min": 2, "max": 3 },    // Junior through Mid (2 levels)
    "project": { "min": 4, "max": 5 },     // Established through Mature (2 levels)
    "complexity": { "min": 2, "max": 2 }   // Standard only (1 level)
  },
  "relevance": 0.9
}
```

**Footprint size:** 2 × 2 × 1 = 4 quadrants out of 75 total (5% coverage)

**Interpretation:**
- Specific bug fix, most useful for Junior/Mid developers learning patterns
- Only relevant in Established/Mature projects (where this component exists)
- Standard complexity only
- Not useful for Novices (too advanced) or Experts (they'd know this)
- Not relevant in Planning/Inception (component doesn't exist yet)

### Example 3: Architectural Standard (Expert-Level, Broad)

**"Distributed Transaction Patterns for Microservices"**

```json
{
  "title": "Distributed Transaction Patterns for Microservices",
  "type": "standard",
  "maturity": {
    "operator": { "min": 4, "max": 5 },    // Senior through Expert (2 levels)
    "project": { "min": 1, "max": 4 },     // Planning through Established (4 levels)
    "complexity": { "min": 3, "max": 3 }   // Complex only (1 level)
  },
  "relevance": 0.95
}
```

**Footprint size:** 2 × 4 × 1 = 8 quadrants out of 75 total (11% coverage)

**Interpretation:**
- Advanced pattern, only for Senior/Expert developers
- Relevant from Planning through Established (architecture decisions)
- Complex systems only
- Not relevant in Mature phase (already decided and implemented)

### Example 4: Universal Guideline (Maximum Footprint)

**"Code Review Best Practices"**

```json
{
  "title": "Code Review Best Practices",
  "type": "standard",
  "maturity": {
    "operator": { "min": 1, "max": 5 },    // All operator levels
    "project": { "min": 2, "max": 5 },     // Inception through Mature
    "complexity": { "min": 1, "max": 3 }   // All complexity levels
  },
  "relevance": 0.7
}
```

**Footprint size:** 5 × 4 × 3 = 60 quadrants out of 75 total (80% coverage)

**Interpretation:**
- Universal best practice
- Applies to all developer levels
- Applies to all project phases except Planning
- Applies to all complexity levels

---

## Selection Algorithm with Ranges

### Distance-Based Relevance Calculation

```typescript
/**
 * Calculate relevance of an item based on distance from current quadrant
 */
function calculateRelevance(
  itemFootprint: MaturityFootprint,
  currentQuadrant: number,
  complexity: number
): number {
  // Convert quadrant to coordinates
  const { operator, project } = quadrantToCoordinates(currentQuadrant);

  // Calculate distance on each dimension
  const operatorDistance = distanceFromRange(operator, itemFootprint.operator);
  const projectDistance = distanceFromRange(project, itemFootprint.project);
  const complexityDistance = distanceFromRange(complexity, itemFootprint.complexity);

  // Exact match: distance = 0, relevance = 1.0
  // One step away: distance = 1, relevance = 0.7
  // Two steps away: distance = 2, relevance = 0.4
  // Three+ steps away: distance >= 3, relevance = 0.1

  // Calculate weighted distance (complexity is more important)
  const totalDistance =
    operatorDistance * 0.3 +
    projectDistance * 0.3 +
    complexityDistance * 0.4;

  // Convert distance to relevance (exponential decay)
  const distanceRelevance = Math.exp(-totalDistance * 0.8);

  return distanceRelevance;
}

/**
 * Calculate distance from a point to a range
 * Returns 0 if point is inside range
 * Returns positive number if point is outside range
 */
function distanceFromRange(point: number, range: MaturityRange): number {
  if (point >= range.min && point <= range.max) {
    return 0; // Inside range
  } else if (point < range.min) {
    return range.min - point; // Below range
  } else {
    return point - range.max; // Above range
  }
}

/**
 * Convert quadrant number to operator/project coordinates
 */
function quadrantToCoordinates(quadrant: number): { operator: number; project: number } {
  const row = Math.ceil(quadrant / 5);     // 1-5 (project)
  const col = ((quadrant - 1) % 5) + 1;    // 1-5 (operator)

  return {
    operator: col,  // 1=Novice, 2=Junior, 3=Mid, 4=Senior, 5=Expert
    project: row    // 1=Planning, 2=Inception, 3=Development, 4=Established, 5=Mature
  };
}
```

### Complete Selection Algorithm

```typescript
export class MaturitySelector {
  /**
   * Select relevant knowledge items based on current context
   * Uses distance-based relevance calculation with footprints
   */
  selectItems(
    allItems: KnowledgeItem[],
    context: MaturityContext
  ): Array<{ item: KnowledgeItem; relevance: number }> {

    const { operator, project } = quadrantToCoordinates(context.quadrant);

    // Calculate relevance for each item
    const scoredItems = allItems
      .filter(item => item.maturity !== undefined) // Skip items without maturity
      .map(item => {
        // Calculate distance-based relevance
        const distanceRelevance = this.calculateRelevance(
          item.maturity!,
          context.quadrant,
          this.complexityToNumber(context.complexity)
        );

        // Multiply by base relevance (item quality score)
        const baseRelevance = item.relevance || 0.5;
        const finalRelevance = distanceRelevance * baseRelevance;

        return {
          item,
          relevance: finalRelevance
        };
      })
      .filter(entry => entry.relevance > 0.1); // Exclude very low relevance items

    // Sort by relevance (descending)
    scoredItems.sort((a, b) => b.relevance - a.relevance);

    // Apply max items limit
    if (context.maxItems) {
      return scoredItems.slice(0, context.maxItems);
    }

    return scoredItems;
  }

  /**
   * Convert complexity enum to number
   */
  private complexityToNumber(complexity: DomainComplexity): number {
    const mapping = {
      [DomainComplexity.SIMPLE]: 1,
      [DomainComplexity.STANDARD]: 2,
      [DomainComplexity.COMPLEX]: 3
    };
    return mapping[complexity];
  }
}
```

---

## Footprint Visualization

### Text-Based Footprint Display

When editing an item, show its footprint coverage:

```
Repository Pattern Implementation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Footprint: 24/75 quadrants (32%)

Operator:   [Novice]──────[Senior]     Expert
            ├────────────────────┤
            1        2    3    4       5

Project:    Planning  [Inception]──────[Established]  Mature
                      ├──────────────────────────┤
                      2          3             4        5

Complexity: [Simple]────[Standard]  Complex
            ├─────────────────┤
            1                 2      3
```

### UI Component for Editing Footprints

```typescript
/**
 * Render footprint editor (range sliders)
 */
renderFootprintEditor(footprint: MaturityFootprint): string {
  return `
    <div class="footprint-editor">
      <h4>Knowledge Applicability (3D Footprint)</h4>

      <!-- Operator Range -->
      <div class="range-editor">
        <label>Operator Maturity Range</label>
        <div class="range-slider-dual">
          <span class="range-label">Novice</span>
          <input type="range" min="1" max="5" value="${footprint.operator.min}" id="op-min" />
          <input type="range" min="1" max="5" value="${footprint.operator.max}" id="op-max" />
          <span class="range-label">Expert</span>
        </div>
        <div class="range-display">
          Selected: <strong>${this.getOperatorLabel(footprint.operator.min)}</strong>
          through
          <strong>${this.getOperatorLabel(footprint.operator.max)}</strong>
        </div>
      </div>

      <!-- Project Range -->
      <div class="range-editor">
        <label>Project Maturity Range</label>
        <div class="range-slider-dual">
          <span class="range-label">Planning</span>
          <input type="range" min="1" max="5" value="${footprint.project.min}" id="proj-min" />
          <input type="range" min="1" max="5" value="${footprint.project.max}" id="proj-max" />
          <span class="range-label">Mature</span>
        </div>
        <div class="range-display">
          Selected: <strong>${this.getProjectLabel(footprint.project.min)}</strong>
          through
          <strong>${this.getProjectLabel(footprint.project.max)}</strong>
        </div>
      </div>

      <!-- Complexity Range -->
      <div class="range-editor">
        <label>Complexity Range</label>
        <div class="range-slider-dual">
          <span class="range-label">Simple</span>
          <input type="range" min="1" max="3" value="${footprint.complexity.min}" id="comp-min" />
          <input type="range" min="1" max="3" value="${footprint.complexity.max}" id="comp-max" />
          <span class="range-label">Complex</span>
        </div>
        <div class="range-display">
          Selected: <strong>${this.getComplexityLabel(footprint.complexity.min)}</strong>
          through
          <strong>${this.getComplexityLabel(footprint.complexity.max)}</strong>
        </div>
      </div>

      <!-- Footprint Summary -->
      <div class="footprint-summary">
        <p>Coverage: <strong>${this.calculateCoverage(footprint)}</strong> quadrants</p>
        <p class="hint">
          Broad footprints (50+ quadrants) = foundational knowledge<br>
          Narrow footprints (1-10 quadrants) = specific knowledge
        </p>
      </div>
    </div>
  `;
}

/**
 * Calculate footprint coverage (number of quadrants)
 */
calculateCoverage(footprint: MaturityFootprint): number {
  const operatorSpan = footprint.operator.max - footprint.operator.min + 1;
  const projectSpan = footprint.project.max - footprint.project.min + 1;
  const complexitySpan = footprint.complexity.max - footprint.complexity.min + 1;

  return operatorSpan * projectSpan * complexitySpan;
}
```

---

## Smart Defaults for New Items

### Automatic Footprint Suggestion

```typescript
/**
 * Suggest footprint based on item type and content analysis
 */
function suggestFootprint(item: KnowledgeItem): MaturityFootprint {
  switch (item.type) {
    case KnowledgeType.PATTERN:
      // Patterns are usually foundational, broad footprint
      return {
        operator: { min: 1, max: 4 },    // Novice through Senior
        project: { min: 2, max: 4 },     // Inception through Established
        complexity: { min: 1, max: 2 }   // Simple through Standard
      };

    case KnowledgeType.LEARNING:
      // Learnings are specific, narrow footprint
      return {
        operator: { min: 2, max: 3 },    // Junior through Mid
        project: { min: 3, max: 5 },     // Development through Mature
        complexity: { min: 2, max: 2 }   // Standard only
      };

    case KnowledgeType.STANDARD:
      // Standards are broad, all levels
      return {
        operator: { min: 1, max: 5 },    // All operators
        project: { min: 2, max: 5 },     // Inception through Mature
        complexity: { min: 1, max: 3 }   // All complexity
      };

    case KnowledgeType.ADR:
      // ADRs are architectural, senior-level
      return {
        operator: { min: 3, max: 5 },    // Mid through Expert
        project: { min: 1, max: 4 },     // Planning through Established
        complexity: { min: 2, max: 3 }   // Standard through Complex
      };

    default:
      // Universal fallback
      return {
        operator: { min: 1, max: 5 },
        project: { min: 1, max: 5 },
        complexity: { min: 1, max: 3 }
      };
  }
}
```

---

## Learning Capture with Context-Based Footprint

```typescript
/**
 * Create learning item with footprint centered on current context
 */
function createLearningFromContext(
  content: string,
  context: MaturityContext
): KnowledgeItem {
  const { operator, project } = quadrantToCoordinates(context.quadrant);
  const complexity = complexityToNumber(context.complexity);

  // Learning footprint: current position ± 1 level
  const footprint: MaturityFootprint = {
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
  };

  return {
    id: generateId(),
    title: extractTitle(content),
    type: KnowledgeType.LEARNING,
    body: content,
    // ... other fields ...
    maturity: footprint,
    relevance: 0.8,
    capturedAt: new Date(),
    capturedContext: context
  };
}
```

---

## Migration Strategy

### Migrating Simple Tags to Ranges

```typescript
/**
 * Convert old tag-based maturity to range-based footprint
 */
function migrateTagsToFootprint(
  tags: { operator: string[]; project: string[]; complexity: string[] }
): MaturityFootprint {
  // Convert tags to numeric levels
  const operatorLevels = tags.operator.map(tagToOperatorLevel);
  const projectLevels = tags.project.map(tagToProjectLevel);
  const complexityLevels = tags.complexity.map(tagToComplexityLevel);

  // Find min/max for each dimension
  return {
    operator: {
      min: Math.min(...operatorLevels),
      max: Math.max(...operatorLevels)
    },
    project: {
      min: Math.min(...projectLevels),
      max: Math.max(...projectLevels)
    },
    complexity: {
      min: Math.min(...complexityLevels),
      max: Math.max(...complexityLevels)
    }
  };
}

function tagToOperatorLevel(tag: string): number {
  const mapping = {
    'novice': 1,
    'junior': 2,
    'mid': 3,
    'senior': 4,
    'expert': 5
  };
  return mapping[tag] || 3;
}

// Similar for project and complexity...
```

---

## Configuration Update

### MaturityContext Remains Simple

The user's **context selection** remains simple (single quadrant + complexity):

```typescript
export interface MaturityContext {
  complexity: DomainComplexity;  // Single value (current complexity)
  quadrant: number;              // Single value (1-25, current position)
  includeAdjacent: boolean;      // Not needed with distance-based relevance
  includeAllComplexity: boolean; // Not needed with distance-based relevance
  maxItems?: number;
}
```

The complexity moves to the **items themselves** via footprints.

---

## Benefits of Range-Based System

### Advantages

1. ✅ **Realistic Applicability**: Knowledge naturally spans ranges, not discrete points
2. ✅ **Foundational vs Specific**: Broad footprints = universal patterns, narrow footprints = specific learnings
3. ✅ **Distance-Based Relevance**: Items closer to your context are more relevant
4. ✅ **Smooth Falloff**: Relevance gradually decreases with distance
5. ✅ **Flexible Coverage**: Items can target any subset of the 3D space
6. ✅ **Visualizable**: Footprints can be shown graphically
7. ✅ **No "Adjacent" Setting Needed**: Distance calculation handles this naturally

### Comparison

| Aspect | Tag-Based | Range-Based (Footprints) |
|--------|-----------|--------------------------|
| Applicability | Discrete points | Continuous ranges |
| Foundational knowledge | Hard to represent | Natural (broad range) |
| Specific knowledge | Natural | Natural (narrow range) |
| Relevance calculation | Binary (match/no-match) | Distance-based (gradual) |
| Footprint visualization | Not possible | Clear 3D representation |
| Configuration complexity | Simple | Simple |
| Implementation complexity | Low | Medium |

---

## Summary

**Key Changes:**

1. **Replace discrete tags** with **MaturityRange** (min/max on each dimension)
2. **Footprint-based selection** using distance calculation
3. **Distance-based relevance** with exponential decay
4. **Footprint editor** with dual-range sliders
5. **Smart defaults** based on item type

**User Context:** Remains simple (single quadrant + complexity)

**Item Metadata:** Now rich (3D footprint showing full applicability)

This approach combines the simplicity of the 5x5 grid with the sophistication of coordinate-based matching!

---

**Status:** Range-based design complete, ready for implementation
