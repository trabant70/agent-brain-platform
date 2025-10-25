# 3D Tag-Based Maturity System - Detailed Implementation Plan

**Created:** 2025-01-25
**Architect Review:** Incorporated simplified tag-based approach
**Codebase Integration:** Full integration with existing Agent Brain architecture
**Estimated Time:** 10-14 hours across 4 phases
**Status:** Ready for implementation

---

## Executive Summary

This plan implements a simplified 3D maturity system using **semantic tags** instead of numeric coordinates. The system extends our existing knowledge management infrastructure with minimal disruption while adding powerful context-aware injection capabilities.

### Key Architectural Decisions

1. **Tag-based over Coordinate-based**: Semantic tags (`junior`, `mid`, `senior`) instead of coordinates (0-100)
2. **Workspace-centric**: Single configuration per workspace (no folder-level complexity for MVP)
3. **Extend, Don't Replace**: Adds maturity metadata to existing `KnowledgeItem` structure
4. **Simple UI First**: Dropdown + grid selection, skip complex visualizations for MVP
5. **Backward Compatible**: Existing templates work without maturity tags (default to broad coverage)

---

## Current Codebase Analysis

### Existing Infrastructure (What We Have)

✅ **Core Types** (`packages/core/src/domains/knowledge/types.ts`)
- `KnowledgeItem` interface - Our base item structure
- `KnowledgeType` enum - Pattern, learning, standard, etc.
- `MarketplaceTemplate` - Template structure with items array

✅ **Template Engine** (`packages/core/src/domains/knowledge/TemplateEngine.ts`)
- Marker-based injection system (`<!-- AGENT-BRAIN:id:START -->`)
- `injectTemplate()` - Injects template into CLAUDE.md
- `removeTemplate()` - Removes injected content
- Already supports item-level and template-level markers

✅ **Knowledge View Controller** (`packages/core/src/domains/visualization/ui/KnowledgeViewController.ts`)
- Main UI orchestrator for Knowledge tab
- Sub-controllers: `V1TemplatesTableController`, `V1TemplateFormController`, `AccordionController`
- Message passing to extension backend
- Handles template CRUD operations

✅ **Template Store** (`packages/core/src/domains/knowledge/TemplateStore.ts`)
- In-memory store for templates
- CRUD operations with audit logging
- Item reordering (just implemented!)
- Supports template cloning, versioning

✅ **Backend Services** (`packages/vscode/src/services/`)
- `KnowledgeManager.ts` - Orchestrates template operations
- `TemplateOperationsService.ts` - Business logic layer
- `TemplateFileService.ts` - File I/O operations
- `KnowledgeMessageHandler.ts` - Handles webview ↔ extension messages

### What Needs to Be Added

❌ **Maturity Metadata** - Tag-based maturity on knowledge items
❌ **Maturity Context** - Workspace configuration for current context
❌ **Selection Algorithm** - Tag-based filtering logic
❌ **Maturity UI Panel** - Complexity dropdown + quadrant grid
❌ **Framing Templates** - Context-specific item wrapping
❌ **Configuration Persistence** - Save/load maturity config

---

## Data Model Changes

### 1. Extend KnowledgeItem Interface

**File**: `packages/core/src/domains/knowledge/types.ts`

```typescript
// NEW: Maturity tag enums
export enum OperatorMaturity {
  JUNIOR = 'junior',
  MID = 'mid',
  SENIOR = 'senior'
}

export enum ProjectMaturity {
  INCEPTION = 'inception',
  DEVELOPMENT = 'development',
  MATURE = 'mature'
}

export enum DomainComplexity {
  SIMPLE = 'simple',
  STANDARD = 'standard',
  COMPLEX = 'complex'
}

// NEW: Maturity metadata structure
export interface MaturityTags {
  operator: OperatorMaturity[];      // Can apply to multiple levels
  project: ProjectMaturity[];
  complexity: DomainComplexity[];
}

// EXTEND existing KnowledgeItem interface
export interface KnowledgeItem {
  id: string;
  type: KnowledgeType;
  scope: KnowledgeScope;
  title: string;
  body: string;
  tags: string[];

  // ... existing fields ...

  // NEW: Maturity-based targeting
  maturity?: MaturityTags;           // Optional for backward compatibility
  relevance?: number;                // 0-1, default 0.5 for prioritization

  // NEW: Learning capture metadata
  capturedAt?: Date;
  capturedContext?: MaturityContext;
}
```

### 2. Create Maturity Context Configuration

**File**: `packages/core/src/domains/knowledge/types.ts` (add to existing file)

```typescript
/**
 * Maturity context - workspace-level configuration
 * Represents operator's current working context
 */
export interface MaturityContext {
  /** Current complexity level */
  complexity: DomainComplexity;

  /** Selected quadrant (1-9) within complexity level */
  quadrant: number;

  /** Include items from adjacent quadrants? */
  includeAdjacent: boolean;

  /** Include items from other complexity levels? */
  includeAllComplexity: boolean;

  /** Optional maximum number of items to inject */
  maxItems?: number;
}

/**
 * Quadrant to tag mapping
 * Used to convert quadrant number to operator + project tags
 */
export interface QuadrantMapping {
  operator: OperatorMaturity;
  project: ProjectMaturity;
  label: string;
  framing: string;
}

/**
 * Framing template for different quadrants
 * Determines how items are presented based on context
 */
export interface FramingTemplate {
  prefix: string;        // e.g., "📚 Learn:"
  tone: string;          // e.g., "instructional"
  learningPrompt: string; // e.g., "What foundational decisions did you make?"
}
```

---

## Phase 1: Core Data Model & Selection Logic

**Duration:** 3-4 hours
**Files Modified:**
- `packages/core/src/domains/knowledge/types.ts`
- `packages/core/src/domains/knowledge/MaturitySelector.ts` (NEW)
- `packages/core/src/domains/knowledge/FramingTemplates.ts` (NEW)

### Task 1.1: Extend Type Definitions (30 min)

**Add to `types.ts`:**

1. Define maturity enums (`OperatorMaturity`, `ProjectMaturity`, `DomainComplexity`)
2. Create `MaturityTags` interface
3. Add `maturity` and `relevance` fields to `KnowledgeItem`
4. Create `MaturityContext` interface
5. Create `QuadrantMapping` and `FramingTemplate` interfaces

**Deliverable:** Updated `types.ts` with all new interfaces

### Task 1.2: Create Maturity Selector Service (1.5 hours)

**Create `packages/core/src/domains/knowledge/MaturitySelector.ts`:**

```typescript
import {
  KnowledgeItem,
  MaturityContext,
  MaturityTags,
  OperatorMaturity,
  ProjectMaturity,
  DomainComplexity,
  QuadrantMapping
} from './types';

/**
 * MaturitySelector - Tag-based knowledge item selection
 * Filters items based on current maturity context
 */
export class MaturitySelector {

  /**
   * Quadrant number (1-9) to operator/project tags mapping
   */
  private static readonly QUADRANT_MAP: Record<number, QuadrantMapping> = {
    1: { operator: OperatorMaturity.JUNIOR, project: ProjectMaturity.INCEPTION, label: 'Learning Starter', framing: 'Learn' },
    2: { operator: OperatorMaturity.MID, project: ProjectMaturity.INCEPTION, label: 'Applying Foundations', framing: 'Apply' },
    3: { operator: OperatorMaturity.SENIOR, project: ProjectMaturity.INCEPTION, label: 'Architecting', framing: 'Design' },
    4: { operator: OperatorMaturity.JUNIOR, project: ProjectMaturity.DEVELOPMENT, label: 'Growing Builder', framing: 'Study' },
    5: { operator: OperatorMaturity.MID, project: ProjectMaturity.DEVELOPMENT, label: 'Productive Builder', framing: 'Build' },
    6: { operator: OperatorMaturity.SENIOR, project: ProjectMaturity.DEVELOPMENT, label: 'Lead Builder', framing: 'Guide' },
    7: { operator: OperatorMaturity.JUNIOR, project: ProjectMaturity.MATURE, label: 'Learning Maintainer', framing: 'Explore' },
    8: { operator: OperatorMaturity.MID, project: ProjectMaturity.MATURE, label: 'System Maintainer', framing: 'Maintain' },
    9: { operator: OperatorMaturity.SENIOR, project: ProjectMaturity.MATURE, label: 'System Expert', framing: 'Document' }
  };

  /**
   * Select relevant knowledge items based on maturity context
   */
  selectItems(
    allItems: KnowledgeItem[],
    context: MaturityContext
  ): Array<{ item: KnowledgeItem; relevance: number }> {

    const { operator, project } = this.quadrantToTags(context.quadrant);

    // Phase 1: Exact match on all three dimensions
    let selected = this.selectExactMatches(allItems, operator, project, context.complexity);

    // Phase 2: Include adjacent quadrants if enabled
    if (context.includeAdjacent && selected.length < 10) {
      const adjacent = this.selectAdjacentMatches(allItems, operator, project, context.complexity);
      selected = [...selected, ...adjacent];
    }

    // Phase 3: Include other complexity levels if enabled
    if (context.includeAllComplexity && selected.length < 15) {
      const otherComplexity = this.selectOtherComplexity(allItems, operator, project, context.complexity);
      selected = [...selected, ...otherComplexity];
    }

    // Remove duplicates
    const uniqueItems = this.deduplicateItems(selected);

    // Sort by relevance score (descending)
    uniqueItems.sort((a, b) => b.relevance - a.relevance);

    // Apply max items limit if specified
    if (context.maxItems) {
      return uniqueItems.slice(0, context.maxItems);
    }

    return uniqueItems;
  }

  /**
   * Select items that exactly match current context
   */
  private selectExactMatches(
    items: KnowledgeItem[],
    operator: OperatorMaturity,
    project: ProjectMaturity,
    complexity: DomainComplexity
  ): Array<{ item: KnowledgeItem; relevance: number }> {

    return items
      .filter(item => {
        if (!item.maturity) return false; // Skip items without maturity tags

        return (
          item.maturity.operator.includes(operator) &&
          item.maturity.project.includes(project) &&
          item.maturity.complexity.includes(complexity)
        );
      })
      .map(item => ({
        item,
        relevance: item.relevance || 0.5
      }));
  }

  /**
   * Select items from adjacent quadrants
   */
  private selectAdjacentMatches(
    items: KnowledgeItem[],
    operator: OperatorMaturity,
    project: ProjectMaturity,
    complexity: DomainComplexity
  ): Array<{ item: KnowledgeItem; relevance: number }> {

    const adjacentTags = this.getAdjacentTags(operator, project);

    return items
      .filter(item => {
        if (!item.maturity) return false;

        // Must match complexity
        if (!item.maturity.complexity.includes(complexity)) return false;

        // Match any adjacent operator OR project (partial match)
        return adjacentTags.some(adj =>
          item.maturity!.operator.includes(adj.operator) ||
          item.maturity!.project.includes(adj.project)
        );
      })
      .map(item => ({
        item,
        relevance: (item.relevance || 0.5) * 0.7 // Reduce relevance for adjacent items
      }));
  }

  /**
   * Select items from other complexity levels
   */
  private selectOtherComplexity(
    items: KnowledgeItem[],
    operator: OperatorMaturity,
    project: ProjectMaturity,
    currentComplexity: DomainComplexity
  ): Array<{ item: KnowledgeItem; relevance: number }> {

    const otherComplexities = Object.values(DomainComplexity).filter(c => c !== currentComplexity);

    return items
      .filter(item => {
        if (!item.maturity) return false;

        // Must match operator and project
        if (
          !item.maturity.operator.includes(operator) ||
          !item.maturity.project.includes(project)
        ) {
          return false;
        }

        // Must be from different complexity
        return otherComplexities.some(c => item.maturity!.complexity.includes(c));
      })
      .map(item => ({
        item,
        relevance: (item.relevance || 0.5) * 0.5 // Significantly reduce relevance
      }));
  }

  /**
   * Get adjacent quadrants (up/down/left/right, no diagonals)
   */
  private getAdjacentTags(
    operator: OperatorMaturity,
    project: ProjectMaturity
  ): Array<{ operator: OperatorMaturity; project: ProjectMaturity }> {

    const adjacent: Array<{ operator: OperatorMaturity; project: ProjectMaturity }> = [];

    // Operator adjacency (horizontal)
    if (operator === OperatorMaturity.JUNIOR) {
      adjacent.push({ operator: OperatorMaturity.MID, project });
    } else if (operator === OperatorMaturity.MID) {
      adjacent.push({ operator: OperatorMaturity.JUNIOR, project });
      adjacent.push({ operator: OperatorMaturity.SENIOR, project });
    } else if (operator === OperatorMaturity.SENIOR) {
      adjacent.push({ operator: OperatorMaturity.MID, project });
    }

    // Project adjacency (vertical)
    if (project === ProjectMaturity.INCEPTION) {
      adjacent.push({ operator, project: ProjectMaturity.DEVELOPMENT });
    } else if (project === ProjectMaturity.DEVELOPMENT) {
      adjacent.push({ operator, project: ProjectMaturity.INCEPTION });
      adjacent.push({ operator, project: ProjectMaturity.MATURE });
    } else if (project === ProjectMaturity.MATURE) {
      adjacent.push({ operator, project: ProjectMaturity.DEVELOPMENT });
    }

    return adjacent;
  }

  /**
   * Remove duplicate items from selection
   */
  private deduplicateItems(
    items: Array<{ item: KnowledgeItem; relevance: number }>
  ): Array<{ item: KnowledgeItem; relevance: number }> {

    const seen = new Set<string>();
    const unique: Array<{ item: KnowledgeItem; relevance: number }> = [];

    for (const entry of items) {
      if (!seen.has(entry.item.id)) {
        seen.add(entry.item.id);
        unique.push(entry);
      }
    }

    return unique;
  }

  /**
   * Convert quadrant number to operator/project tags
   */
  quadrantToTags(quadrant: number): { operator: OperatorMaturity; project: ProjectMaturity } {
    const mapping = MaturitySelector.QUADRANT_MAP[quadrant];
    if (!mapping) {
      throw new Error(`Invalid quadrant number: ${quadrant}`);
    }
    return {
      operator: mapping.operator,
      project: mapping.project
    };
  }

  /**
   * Get quadrant metadata (label, framing, etc.)
   */
  getQuadrantInfo(quadrant: number): QuadrantMapping {
    const mapping = MaturitySelector.QUADRANT_MAP[quadrant];
    if (!mapping) {
      throw new Error(`Invalid quadrant number: ${quadrant}`);
    }
    return mapping;
  }
}
```

**Unit Tests** (`MaturitySelector.test.ts`):
- Test exact match selection
- Test adjacent quadrant inclusion
- Test complexity level cross-selection
- Test relevance scoring
- Test deduplication
- Test quadrant to tags conversion

**Deliverable:** `MaturitySelector.ts` with comprehensive unit tests

### Task 1.3: Create Framing Templates (1 hour)

**Create `packages/core/src/domains/knowledge/FramingTemplates.ts`:**

```typescript
import { OperatorMaturity, ProjectMaturity, FramingTemplate } from './types';

/**
 * FramingTemplates - Context-specific content presentation
 * Provides instructional tone based on quadrant
 */
export class FramingTemplates {

  /**
   * Get framing template for specific operator/project combination
   */
  static getFraming(operator: OperatorMaturity, project: ProjectMaturity): FramingTemplate {
    const key = `${operator}-${project}`;
    return FramingTemplates.FRAMING_MAP[key] || FramingTemplates.DEFAULT_FRAMING;
  }

  /**
   * Get learning prompt for current context
   */
  static getLearningPrompt(project: ProjectMaturity): string {
    return FramingTemplates.LEARNING_PROMPTS[project] || FramingTemplates.LEARNING_PROMPTS.development;
  }

  /**
   * Framing map for all 9 quadrants
   */
  private static readonly FRAMING_MAP: Record<string, FramingTemplate> = {
    // Inception row
    'junior-inception': {
      prefix: '📚 Learn',
      tone: 'instructional',
      learningPrompt: 'What foundational decisions did you make?'
    },
    'mid-inception': {
      prefix: '🔨 Apply',
      tone: 'practical',
      learningPrompt: 'What established patterns did you choose?'
    },
    'senior-inception': {
      prefix: '🎯 Design',
      tone: 'strategic',
      learningPrompt: 'What architectural decisions were made?'
    },

    // Development row
    'junior-development': {
      prefix: '💡 Study',
      tone: 'educational',
      learningPrompt: 'What patterns did you discover?'
    },
    'mid-development': {
      prefix: '⚡ Build',
      tone: 'action-oriented',
      learningPrompt: 'What implementation patterns emerged?'
    },
    'senior-development': {
      prefix: '🌟 Guide',
      tone: 'mentoring',
      learningPrompt: 'What guidance did you provide the team?'
    },

    // Mature row
    'junior-mature': {
      prefix: '🔍 Explore',
      tone: 'investigative',
      learningPrompt: 'What did you learn from the existing system?'
    },
    'mid-mature': {
      prefix: '🔧 Maintain',
      tone: 'systematic',
      learningPrompt: 'What consistency patterns did you maintain?'
    },
    'senior-mature': {
      prefix: '📝 Document',
      tone: 'authoritative',
      learningPrompt: 'What should be documented for the team?'
    }
  };

  /**
   * Learning prompts by project phase
   */
  private static readonly LEARNING_PROMPTS: Record<ProjectMaturity, string> = {
    inception: 'What foundational decisions did you make?',
    development: 'What patterns emerged during implementation?',
    mature: 'What optimizations or fixes were discovered?'
  };

  /**
   * Default framing for items without specific context
   */
  private static readonly DEFAULT_FRAMING: FramingTemplate = {
    prefix: '💡 Consider',
    tone: 'balanced',
    learningPrompt: 'What did you learn during this task?'
  };

  /**
   * Wrap knowledge item content with appropriate framing
   */
  static wrapItem(
    title: string,
    body: string,
    operator: OperatorMaturity,
    project: ProjectMaturity
  ): string {
    const framing = FramingTemplates.getFraming(operator, project);

    return `
### ${framing.prefix}: ${title}

${body}

---
`;
  }

  /**
   * Generate context header for injection
   */
  static generateContextHeader(
    complexity: string,
    quadrant: number,
    itemCount: number,
    totalCount: number,
    operator: OperatorMaturity,
    project: ProjectMaturity
  ): string {
    const framing = FramingTemplates.getFraming(operator, project);
    const learningPrompt = FramingTemplates.getLearningPrompt(project);

    return `<!-- Agent Brain Context: ${complexity} Complexity, Q${quadrant} (${operator}/${project}) -->
<!-- ${itemCount} items selected from ${totalCount} total -->

## ${framing.prefix}: Context-Relevant Knowledge

<!-- Learning Prompt: ${learningPrompt} -->

`;
  }
}
```

**Deliverable:** `FramingTemplates.ts` with static framing maps

---

## Phase 2: Configuration Management & Persistence

**Duration:** 2-3 hours
**Files Modified:**
- `packages/core/src/domains/knowledge/MaturityConfigManager.ts` (NEW)
- `packages/vscode/src/services/KnowledgeManager.ts` (EXTEND)

### Task 2.1: Create Configuration Manager (1.5 hours)

**Create `packages/core/src/domains/knowledge/MaturityConfigManager.ts`:**

```typescript
import { MaturityContext, DomainComplexity } from './types';

/**
 * MaturityConfigManager - Manages workspace maturity configuration
 * Handles loading, saving, and validation of maturity context
 */
export class MaturityConfigManager {

  /**
   * Default maturity configuration for new workspaces
   */
  static readonly DEFAULT_CONTEXT: MaturityContext = {
    complexity: DomainComplexity.STANDARD,
    quadrant: 5, // Mid developer, development project
    includeAdjacent: true,
    includeAllComplexity: false,
    maxItems: 25
  };

  /**
   * Parse maturity configuration from JSON
   */
  static fromJSON(json: any): MaturityContext {
    return {
      complexity: json.complexity || DomainComplexity.STANDARD,
      quadrant: json.quadrant || 5,
      includeAdjacent: json.includeAdjacent !== false, // Default true
      includeAllComplexity: json.includeAllComplexity === true, // Default false
      maxItems: json.maxItems || 25
    };
  }

  /**
   * Convert maturity configuration to JSON
   */
  static toJSON(context: MaturityContext): any {
    return {
      complexity: context.complexity,
      quadrant: context.quadrant,
      includeAdjacent: context.includeAdjacent,
      includeAllComplexity: context.includeAllComplexity,
      maxItems: context.maxItems
    };
  }

  /**
   * Validate maturity configuration
   */
  static validate(context: MaturityContext): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate complexity
    if (!Object.values(DomainComplexity).includes(context.complexity)) {
      errors.push(`Invalid complexity: ${context.complexity}`);
    }

    // Validate quadrant (1-9)
    if (context.quadrant < 1 || context.quadrant > 9) {
      errors.push(`Invalid quadrant: ${context.quadrant}. Must be 1-9.`);
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
}
```

**Deliverable:** `MaturityConfigManager.ts` with validation logic

### Task 2.2: Extend Backend Services (1 hour)

**Update `packages/vscode/src/services/KnowledgeManager.ts`:**

Add methods to load/save maturity configuration:

```typescript
import { MaturityContext, MaturityConfigManager } from '@agent-brain/core/domains/knowledge';

export class KnowledgeManager {
  // ... existing code ...

  /**
   * Get current maturity configuration
   */
  async getMaturityContext(): Promise<MaturityContext> {
    const configPath = path.join(this.knowledgeBaseDir, 'maturity-config.json');

    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');
        const json = JSON.parse(content);
        return MaturityConfigManager.fromJSON(json);
      }
    } catch (error) {
      logger.warn(
        LogCategory.EXTENSION,
        'Failed to load maturity config, using defaults',
        'KnowledgeManager.getMaturityContext',
        error
      );
    }

    // Return defaults if file doesn't exist or parse failed
    return MaturityConfigManager.DEFAULT_CONTEXT;
  }

  /**
   * Save maturity configuration
   */
  async saveMaturityContext(context: MaturityContext): Promise<void> {
    const configPath = path.join(this.knowledgeBaseDir, 'maturity-config.json');

    // Validate before saving
    const validation = MaturityConfigManager.validate(context);
    if (!validation.valid) {
      throw new Error(`Invalid maturity configuration: ${validation.errors.join(', ')}`);
    }

    const json = MaturityConfigManager.toJSON(context);
    fs.writeFileSync(configPath, JSON.stringify(json, null, 2), 'utf-8');

    logger.info(
      LogCategory.EXTENSION,
      'Maturity configuration saved',
      'KnowledgeManager.saveMaturityContext',
      { quadrant: context.quadrant, complexity: context.complexity }
    );
  }
}
```

**Add message handlers in `packages/vscode/src/providers/handlers/KnowledgeMessageHandler.ts`:**

```typescript
case 'maturity:get-context':
  await this.handleGetMaturityContext();
  return true;

case 'maturity:save-context':
  await this.handleSaveMaturityContext(message.payload);
  return true;

// ... later in class ...

private async handleGetMaturityContext(): Promise<void> {
  try {
    const context = await this.context.knowledgeManager.getMaturityContext();

    this.context.view?.webview.postMessage({
      type: 'maturity:context-data',
      payload: { context }
    });
  } catch (error: any) {
    logger.error(LogCategory.EXTENSION, 'Failed to get maturity context', 'handleGetMaturityContext', error);
    this.context.view?.webview.postMessage({
      type: 'maturity:error',
      payload: { message: error.message }
    });
  }
}

private async handleSaveMaturityContext(payload: { context: MaturityContext }): Promise<void> {
  try {
    await this.context.knowledgeManager.saveMaturityContext(payload.context);

    vscode.window.showInformationMessage('Maturity configuration saved');

    this.context.view?.webview.postMessage({
      type: 'maturity:save-success',
      payload: { context: payload.context }
    });
  } catch (error: any) {
    logger.error(LogCategory.EXTENSION, 'Failed to save maturity context', 'handleSaveMaturityContext', error);
    vscode.window.showErrorMessage(`Failed to save configuration: ${error.message}`);
    this.context.view?.webview.postMessage({
      type: 'maturity:error',
      payload: { message: error.message }
    });
  }
}
```

**Deliverable:** Backend services with maturity config support

---

## Phase 3: UI Implementation

**Duration:** 4-5 hours
**Files Modified:**
- `packages/core/src/domains/visualization/ui/knowledge/MaturityConfigPanel.ts` (NEW)
- `packages/core/src/domains/visualization/ui/KnowledgeViewController.ts` (EXTEND)
- `packages/core/src/domains/visualization/styles/components/knowledge.css` (EXTEND)

### Task 3.1: Create Maturity Config Panel (2.5 hours)

**Create `packages/core/src/domains/visualization/ui/knowledge/MaturityConfigPanel.ts`:**

```typescript
import {
  MaturityContext,
  DomainComplexity,
  OperatorMaturity,
  ProjectMaturity
} from '../../../knowledge/types';
import { MaturitySelector } from '../../../knowledge/MaturitySelector';

interface MaturityConfigCallbacks {
  onSaveContext: (context: MaturityContext) => void;
  onContextChanged: (context: MaturityContext) => void;
}

/**
 * MaturityConfigPanel - UI for configuring maturity context
 * Renders complexity dropdown + 3x3 quadrant grid
 */
export class MaturityConfigPanel {
  private container: HTMLElement | null = null;
  private currentContext: MaturityContext;
  private maturitySelector: MaturitySelector;

  constructor(private callbacks: MaturityConfigCallbacks) {
    this.maturitySelector = new MaturitySelector();
    this.currentContext = {
      complexity: DomainComplexity.STANDARD,
      quadrant: 5,
      includeAdjacent: true,
      includeAllComplexity: false,
      maxItems: 25
    };
  }

  /**
   * Set current context (called when loading from config)
   */
  setContext(context: MaturityContext): void {
    this.currentContext = context;
    this.render();
  }

  /**
   * Render the maturity configuration panel
   */
  render(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'maturity-config-panel';
    panel.innerHTML = `
      <div class="maturity-config-header">
        <h3>Maturity Configuration</h3>
        <p>Configure your current working context to receive relevant knowledge.</p>
      </div>

      <div class="maturity-config-body">
        ${this.renderComplexitySelector()}
        ${this.renderQuadrantGrid()}
        ${this.renderOptions()}
        ${this.renderItemPreview()}
      </div>

      <div class="maturity-config-footer">
        <button class="btn-secondary" id="maturity-reset">Reset to Defaults</button>
        <button class="btn-primary" id="maturity-apply">Apply Configuration</button>
      </div>
    `;

    this.container = panel;
    this.attachEventListeners();
    return panel;
  }

  /**
   * Render complexity dropdown selector
   */
  private renderComplexitySelector(): string {
    return `
      <div class="maturity-complexity">
        <label for="complexity-select">Complexity Level:</label>
        <select id="complexity-select" class="complexity-dropdown">
          <option value="simple" ${this.currentContext.complexity === DomainComplexity.SIMPLE ? 'selected' : ''}>
            Simple (Basic CRUD, straightforward logic)
          </option>
          <option value="standard" ${this.currentContext.complexity === DomainComplexity.STANDARD ? 'selected' : ''}>
            Standard (Typical business logic, common patterns)
          </option>
          <option value="complex" ${this.currentContext.complexity === DomainComplexity.COMPLEX ? 'selected' : ''}>
            Complex (Distributed systems, advanced algorithms)
          </option>
        </select>
      </div>
    `;
  }

  /**
   * Render 3x3 quadrant grid
   */
  private renderQuadrantGrid(): string {
    const quadrantInfo = this.maturitySelector.getQuadrantInfo(this.currentContext.quadrant);

    return `
      <div class="maturity-quadrant-container">
        <p class="quadrant-label">Your Context: <strong>${quadrantInfo.label}</strong></p>

        <div class="maturity-quadrant-grid">
          <div class="grid-axis-label grid-axis-y">Project Maturity</div>
          <div class="grid-axis-label grid-axis-x">Operator Experience</div>

          <div class="grid-row-label">Mature</div>
          ${this.renderQuadrantButton(7)}
          ${this.renderQuadrantButton(8)}
          ${this.renderQuadrantButton(9)}

          <div class="grid-row-label">Development</div>
          ${this.renderQuadrantButton(4)}
          ${this.renderQuadrantButton(5)}
          ${this.renderQuadrantButton(6)}

          <div class="grid-row-label">Inception</div>
          ${this.renderQuadrantButton(1)}
          ${this.renderQuadrantButton(2)}
          ${this.renderQuadrantButton(3)}

          <div class="grid-col-label">Junior</div>
          <div class="grid-col-label">Mid</div>
          <div class="grid-col-label">Senior</div>
        </div>
      </div>
    `;
  }

  /**
   * Render individual quadrant button
   */
  private renderQuadrantButton(quadrant: number): string {
    const info = this.maturitySelector.getQuadrantInfo(quadrant);
    const isSelected = this.currentContext.quadrant === quadrant;

    return `
      <button
        class="quadrant-btn ${isSelected ? 'selected' : ''}"
        data-quadrant="${quadrant}"
        title="${info.label}"
      >
        Q${quadrant}
      </button>
    `;
  }

  /**
   * Render configuration options (checkboxes, sliders)
   */
  private renderOptions(): string {
    return `
      <div class="maturity-options">
        <label class="checkbox-label">
          <input
            type="checkbox"
            id="include-adjacent"
            ${this.currentContext.includeAdjacent ? 'checked' : ''}
          />
          Include adjacent quadrants (increases variety)
        </label>

        <label class="checkbox-label">
          <input
            type="checkbox"
            id="include-all-complexity"
            ${this.currentContext.includeAllComplexity ? 'checked' : ''}
          />
          Include all complexity levels (not recommended)
        </label>

        <div class="slider-container">
          <label for="max-items-slider">Maximum items: <span id="max-items-value">${this.currentContext.maxItems}</span></label>
          <input
            type="range"
            id="max-items-slider"
            min="5"
            max="50"
            step="5"
            value="${this.currentContext.maxItems}"
          />
        </div>
      </div>
    `;
  }

  /**
   * Render item count preview
   */
  private renderItemPreview(): string {
    // TODO: Calculate actual item count from template store
    return `
      <div class="maturity-preview">
        <p>Items selected: <strong id="item-count-preview">0</strong></p>
        <p class="preview-hint">Apply configuration to see selected items</p>
      </div>
    `;
  }

  /**
   * Attach event listeners to interactive elements
   */
  private attachEventListeners(): void {
    if (!this.container) return;

    // Complexity selector
    const complexitySelect = this.container.querySelector('#complexity-select') as HTMLSelectElement;
    complexitySelect?.addEventListener('change', (e) => {
      this.currentContext.complexity = (e.target as HTMLSelectElement).value as DomainComplexity;
      this.notifyContextChanged();
    });

    // Quadrant buttons
    const quadrantButtons = this.container.querySelectorAll('.quadrant-btn');
    quadrantButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const quadrant = parseInt((e.target as HTMLElement).dataset.quadrant || '5');
        this.currentContext.quadrant = quadrant;
        this.render(); // Re-render to update selection
        this.notifyContextChanged();
      });
    });

    // Checkboxes
    const adjacentCheckbox = this.container.querySelector('#include-adjacent') as HTMLInputElement;
    adjacentCheckbox?.addEventListener('change', (e) => {
      this.currentContext.includeAdjacent = (e.target as HTMLInputElement).checked;
      this.notifyContextChanged();
    });

    const complexityCheckbox = this.container.querySelector('#include-all-complexity') as HTMLInputElement;
    complexityCheckbox?.addEventListener('change', (e) => {
      this.currentContext.includeAllComplexity = (e.target as HTMLInputElement).checked;
      this.notifyContextChanged();
    });

    // Max items slider
    const maxItemsSlider = this.container.querySelector('#max-items-slider') as HTMLInputElement;
    const maxItemsValue = this.container.querySelector('#max-items-value');
    maxItemsSlider?.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.currentContext.maxItems = value;
      if (maxItemsValue) maxItemsValue.textContent = value.toString();
      this.notifyContextChanged();
    });

    // Buttons
    const resetBtn = this.container.querySelector('#maturity-reset');
    resetBtn?.addEventListener('click', () => this.resetToDefaults());

    const applyBtn = this.container.querySelector('#maturity-apply');
    applyBtn?.addEventListener('click', () => this.applyConfiguration());
  }

  /**
   * Notify that context has changed (for live preview)
   */
  private notifyContextChanged(): void {
    this.callbacks.onContextChanged(this.currentContext);
  }

  /**
   * Reset configuration to defaults
   */
  private resetToDefaults(): void {
    this.currentContext = {
      complexity: DomainComplexity.STANDARD,
      quadrant: 5,
      includeAdjacent: true,
      includeAllComplexity: false,
      maxItems: 25
    };
    this.render();
    this.notifyContextChanged();
  }

  /**
   * Apply configuration (save)
   */
  private applyConfiguration(): void {
    this.callbacks.onSaveContext(this.currentContext);
  }

  /**
   * Update item count preview
   */
  updatePreview(itemCount: number): void {
    if (!this.container) return;

    const previewEl = this.container.querySelector('#item-count-preview');
    if (previewEl) {
      previewEl.textContent = itemCount.toString();
    }
  }
}
```

**Deliverable:** `MaturityConfigPanel.ts` with full UI rendering

### Task 3.2: Integrate into Knowledge View Controller (1 hour)

**Update `packages/core/src/domains/visualization/ui/KnowledgeViewController.ts`:**

```typescript
import { MaturityConfigPanel } from './knowledge/MaturityConfigPanel';
import { MaturityContext } from '../../knowledge/types';

export class KnowledgeViewController {
  // ... existing code ...

  private maturityConfigPanel: MaturityConfigPanel;
  private currentMaturityContext: MaturityContext | null = null;

  constructor() {
    // ... existing initialization ...

    // Initialize maturity config panel
    this.maturityConfigPanel = new MaturityConfigPanel({
      onSaveContext: (context) => this.saveMaturityContext(context),
      onContextChanged: (context) => this.previewMaturityContext(context)
    });
  }

  /**
   * Render Knowledge tab with maturity configuration section
   */
  render(): void {
    const container = document.getElementById('knowledge-content');
    if (!container) return;

    container.innerHTML = `
      <div class="knowledge-container">
        <!-- Existing content -->
        <div class="knowledge-header">
          <h2>Knowledge Management</h2>
        </div>

        <!-- NEW: Maturity Configuration Section -->
        <div class="maturity-section">
          <div id="maturity-config-container"></div>
        </div>

        <!-- Existing templates section -->
        <div class="templates-section" id="v1-templates-container">
          ${this.v1TemplatesTableController.render(this.state.templates)}
        </div>

        <!-- Existing claude.md accordion -->
        <div class="claude-md-section" id="claude-md-accordion">
          ${this.accordionController.render(this.state.claudeMdFiles)}
        </div>
      </div>
    `;

    // Render maturity config panel
    const maturityContainer = container.querySelector('#maturity-config-container');
    if (maturityContainer) {
      maturityContainer.appendChild(this.maturityConfigPanel.render());
    }

    // Load current maturity context
    this.loadMaturityContext();
  }

  /**
   * Load maturity context from backend
   */
  private loadMaturityContext(): void {
    this.sendMessage({ type: 'maturity:get-context', payload: {} });
  }

  /**
   * Save maturity context to backend
   */
  private saveMaturityContext(context: MaturityContext): void {
    this.sendMessage({
      type: 'maturity:save-context',
      payload: { context }
    });

    this.notifications.show({
      type: 'success',
      message: 'Maturity configuration saved',
      duration: 3000
    });
  }

  /**
   * Preview what items would be selected (for live feedback)
   */
  private previewMaturityContext(context: MaturityContext): void {
    // TODO: Calculate item count with MaturitySelector
    // For now, just update the preview display
    this.currentMaturityContext = context;
  }

  /**
   * Handle messages from extension (add to existing handleMessage)
   */
  handleMessage(message: any): void {
    switch (message.type) {
      // ... existing cases ...

      case 'maturity:context-data':
        this.currentMaturityContext = message.payload.context;
        this.maturityConfigPanel.setContext(message.payload.context);
        break;

      case 'maturity:save-success':
        this.currentMaturityContext = message.payload.context;
        break;

      case 'maturity:error':
        this.notifications.show({
          type: 'error',
          message: message.payload.message,
          duration: 5000
        });
        break;
    }
  }
}
```

**Deliverable:** Integrated maturity panel in Knowledge tab

### Task 3.3: Add CSS Styling (1 hour)

**Update `packages/core/src/domains/visualization/styles/components/knowledge.css`:**

```css
/* Maturity Configuration Panel */
.maturity-config-panel {
  background: var(--vscode-editor-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 4px;
  padding: 20px;
  margin-bottom: 24px;
}

.maturity-config-header h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
}

.maturity-config-header p {
  margin: 0;
  font-size: 13px;
  color: var(--vscode-descriptionForeground);
}

.maturity-config-body {
  margin-top: 20px;
}

/* Complexity Selector */
.maturity-complexity {
  margin-bottom: 20px;
}

.maturity-complexity label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.complexity-dropdown {
  width: 100%;
  padding: 8px;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  font-size: 13px;
}

/* Quadrant Grid */
.maturity-quadrant-container {
  margin-bottom: 20px;
}

.quadrant-label {
  margin-bottom: 12px;
  font-size: 14px;
}

.maturity-quadrant-grid {
  display: grid;
  grid-template-columns: 80px repeat(3, 1fr);
  grid-template-rows: auto repeat(3, 60px) auto;
  gap: 8px;
  max-width: 500px;
}

.grid-axis-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--vscode-descriptionForeground);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.grid-axis-y {
  grid-column: 1;
  grid-row: 2 / 5;
  writing-mode: vertical-lr;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

.grid-axis-x {
  grid-column: 2 / 5;
  grid-row: 6;
  text-align: center;
}

.grid-row-label {
  grid-column: 1;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 12px;
}

.grid-col-label {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  text-align: center;
}

/* Quadrant Buttons */
.quadrant-btn {
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  border: 2px solid transparent;
  border-radius: 4px;
  padding: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quadrant-btn:hover {
  background: var(--vscode-button-secondaryHoverBackground);
  border-color: var(--vscode-focusBorder);
}

.quadrant-btn.selected {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border-color: var(--vscode-focusBorder);
  box-shadow: 0 0 0 2px var(--vscode-focusBorder);
}

/* Configuration Options */
.maturity-options {
  margin-bottom: 20px;
  padding: 16px;
  background: var(--vscode-textBlockQuote-background);
  border-radius: 4px;
}

.checkbox-label {
  display: block;
  margin-bottom: 12px;
  font-size: 13px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  margin-right: 8px;
}

.slider-container {
  margin-top: 16px;
}

.slider-container label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
}

#max-items-value {
  font-weight: 600;
  color: var(--vscode-textLink-activeForeground);
}

#max-items-slider {
  width: 100%;
}

/* Item Preview */
.maturity-preview {
  padding: 12px;
  background: var(--vscode-textBlockQuote-background);
  border-left: 3px solid var(--vscode-textLink-activeForeground);
  border-radius: 4px;
}

.maturity-preview p {
  margin: 4px 0;
  font-size: 13px;
}

.preview-hint {
  color: var(--vscode-descriptionForeground);
  font-style: italic;
}

/* Footer Buttons */
.maturity-config-footer {
  margin-top: 20px;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-primary,
.btn-secondary {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: none;
}

.btn-primary:hover {
  background: var(--vscode-button-hoverBackground);
}

.btn-secondary {
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  border: 1px solid var(--vscode-button-border);
}

.btn-secondary:hover {
  background: var(--vscode-button-secondaryHoverBackground);
}
```

**Deliverable:** Styled maturity configuration UI

---

## Phase 4: Injection Integration & Learning Capture

**Duration:** 3-4 hours
**Files Modified:**
- `packages/core/src/domains/knowledge/TemplateEngine.ts` (EXTEND)
- `packages/vscode/src/services/knowledge/TemplateOperationsService.ts` (EXTEND)

### Task 4.1: Integrate Selection into Injection (2 hours)

**Update `packages/core/src/domains/knowledge/TemplateEngine.ts`:**

Add method to inject template with maturity filtering:

```typescript
import { MaturitySelector } from './MaturitySelector';
import { FramingTemplates } from './FramingTemplates';
import { MaturityContext } from './types';

export class TemplateEngine {
  // ... existing code ...

  /**
   * Inject template with maturity-based filtering
   * NEW METHOD for context-aware injection
   */
  injectTemplateWithMaturity(
    claudeContent: string,
    template: MarketplaceTemplate,
    context: MaturityContext,
    replaceExisting: boolean = false
  ): TemplateApplicationResult {
    try {
      // Select relevant items based on maturity context
      const selector = new MaturitySelector();
      const selectedItems = selector.selectItems(template.items, context);

      if (selectedItems.length === 0) {
        return {
          success: false,
          error: 'No items matched the current maturity context'
        };
      }

      // Get quadrant info for framing
      const { operator, project } = selector.quadrantToTags(context.quadrant);

      // Generate context header
      const contextHeader = FramingTemplates.generateContextHeader(
        context.complexity,
        context.quadrant,
        selectedItems.length,
        template.items.length,
        operator,
        project
      );

      // Generate framed content for each selected item
      const itemsContent = selectedItems.map(({ item }) => {
        return FramingTemplates.wrapItem(
          item.title,
          item.body,
          operator,
          project
        );
      }).join('\n');

      // Combine header + items
      const templateContent = contextHeader + itemsContent;

      // Use existing marker-based injection
      const markers = this.generateTemplateMarkers(template.id, template.name);
      const markedContent = `\n${markers.start}\n${templateContent}\n${markers.end}\n`;

      // Check if template already exists
      let workingContent = claudeContent;
      if (this.hasTemplate(workingContent, template.id)) {
        if (replaceExisting) {
          const removeResult = this.removeTemplate(workingContent, template.id);
          if (!removeResult.success) {
            return {
              success: false,
              error: `Failed to replace existing template: ${removeResult.error}`
            };
          }
          workingContent = removeResult.claudeContent;
        } else {
          return {
            success: false,
            error: `Template "${template.name}" is already injected. Set replaceExisting=true to update.`
          };
        }
      }

      // Append to end of file
      const updatedContent = workingContent.trim() + '\n' + markedContent;

      return {
        success: true,
        claudeContent: updatedContent,
        selectedItems: selectedItems.length,
        totalItems: template.items.length,
        maturityContext: context
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to inject template with maturity: ${error}`
      };
    }
  }
}
```

**Update `TemplateApplicationResult` interface in `types.ts`:**

```typescript
export interface TemplateApplicationResult {
  success: boolean;
  claudeContent?: string;
  error?: string;
  sectionsApplied?: number;
  selectedItems?: number;        // NEW
  totalItems?: number;            // NEW
  maturityContext?: MaturityContext; // NEW
}
```

**Deliverable:** Maturity-aware injection in TemplateEngine

### Task 4.2: Update Backend Services (1 hour)

**Update `packages/vscode/src/services/knowledge/TemplateOperationsService.ts`:**

```typescript
import { MaturityContext } from '@agent-brain/core/domains/knowledge';

export class TemplateOperationsService {
  // ... existing code ...

  /**
   * Inject template with maturity-based filtering
   */
  async injectTemplateWithMaturity(
    templateId: string,
    targetFilePath: string,
    context: MaturityContext
  ): Promise<string> {
    const template = this.templateStore.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Read current CLAUDE.md content
    const fileContent = await this.fileSystem.readClaudeMdFile(targetFilePath);

    // Use maturity-aware injection
    const templateEngine = new TemplateEngine(this.templateStore);
    const result = templateEngine.injectTemplateWithMaturity(
      fileContent,
      template,
      context,
      true // Replace existing
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to inject template');
    }

    // Write updated content back
    await this.fileSystem.writeClaudeMdFile(targetFilePath, result.claudeContent!);

    // Record injection in template store
    this.templateStore.recordInjection(/* ... */);

    logger.info(
      LogCategory.EXTENSION,
      'Template injected with maturity filtering',
      'TemplateOperationsService.injectTemplateWithMaturity',
      {
        templateId,
        targetFile: targetFilePath,
        selectedItems: result.selectedItems,
        totalItems: result.totalItems,
        quadrant: context.quadrant,
        complexity: context.complexity
      }
    );

    return result.claudeContent!;
  }
}
```

**Add message handler in `KnowledgeMessageHandler.ts`:**

```typescript
case 'v1:inject-template-with-maturity':
  await this.handleV1InjectTemplateWithMaturity(message.payload);
  return true;

// ... later ...

private async handleV1InjectTemplateWithMaturity(payload: {
  templateId: string;
  filePath?: string;
  context: MaturityContext;
}): Promise<void> {
  try {
    // Get target file path
    let targetFilePath = payload.filePath;
    if (!targetFilePath) {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        throw new Error('No file is currently open');
      }
      targetFilePath = activeEditor.document.uri.fsPath;
    }

    await this.context.knowledgeManager.injectTemplateWithMaturity(
      payload.templateId,
      targetFilePath,
      payload.context
    );

    vscode.window.showInformationMessage(
      `Template injected with ${payload.context.complexity} complexity context`
    );

    this.context.view?.webview.postMessage({
      type: 'v1:inject-template-success',
      payload: { templateId: payload.templateId, filePath: targetFilePath }
    });

    // Refresh claude.md files
    await this.sendClaudeMdFiles();

  } catch (error: any) {
    logger.error(LogCategory.EXTENSION, 'Failed to inject template with maturity', 'handleV1InjectTemplateWithMaturity', error);
    vscode.window.showErrorMessage(`Failed to inject template: ${error.message}`);
  }
}
```

**Deliverable:** Backend support for maturity-based injection

### Task 4.3: Add Learning Capture (Optional - 1 hour)

**Create learning capture utility:**

```typescript
/**
 * Create learning item from capture
 */
function createLearningItem(
  content: string,
  context: MaturityContext
): KnowledgeItem {
  const selector = new MaturitySelector();
  const { operator, project } = selector.quadrantToTags(context.quadrant);

  return {
    id: generateId(),
    title: extractTitle(content),
    type: KnowledgeType.LEARNING,
    body: content,
    scope: KnowledgeScope.PROJECT,
    tags: [],
    path: '',
    relativePath: '',
    valid: true,
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date()
    },
    maturity: {
      operator: [operator],
      project: [project],
      complexity: [context.complexity]
    },
    relevance: 0.8, // New learnings start high
    capturedAt: new Date(),
    capturedContext: context
  };
}
```

**Deliverable:** Learning capture with auto-tagging

---

## Migration Strategy

### Task M.1: Update Existing Templates (30 min)

**Create migration script** (`packages/scripts/migrate-maturity.ts`):

```typescript
/**
 * Migrate existing templates to include maturity metadata
 * Assigns default broad coverage to all items
 */
function migrateTemplate(template: MarketplaceTemplate): MarketplaceTemplate {
  return {
    ...template,
    items: template.items.map(item => ({
      ...item,
      maturity: {
        operator: [
          OperatorMaturity.JUNIOR,
          OperatorMaturity.MID,
          OperatorMaturity.SENIOR
        ],
        project: [
          ProjectMaturity.INCEPTION,
          ProjectMaturity.DEVELOPMENT,
          ProjectMaturity.MATURE
        ],
        complexity: [
          DomainComplexity.SIMPLE,
          DomainComplexity.STANDARD
        ]
      },
      relevance: 0.5
    }))
  };
}
```

Run migration on bundled templates:
```bash
node packages/scripts/migrate-maturity.ts
```

**Deliverable:** All existing templates have maturity metadata

### Task M.2: Create Default Configuration (15 min)

**Add to workspace initialization:**

```typescript
// On first load, create default maturity config
if (!fs.existsSync('.agent-brain/maturity-config.json')) {
  const defaultConfig = {
    complexity: 'standard',
    quadrant: 5,
    includeAdjacent: true,
    includeAllComplexity: false,
    maxItems: 25
  };

  fs.writeFileSync(
    '.agent-brain/maturity-config.json',
    JSON.stringify(defaultConfig, null, 2)
  );
}
```

**Deliverable:** Default config created on first run

---

## Testing Plan

### Unit Tests

**`MaturitySelector.test.ts`:**
- ✅ Exact match selection (all 3 dimensions)
- ✅ Adjacent quadrant inclusion
- ✅ Cross-complexity selection
- ✅ Relevance scoring
- ✅ Deduplication
- ✅ Quadrant to tags conversion
- ✅ Max items limiting

**`FramingTemplates.test.ts`:**
- ✅ Framing retrieval for all 9 quadrants
- ✅ Learning prompt generation
- ✅ Item wrapping with correct prefix
- ✅ Context header generation

**`MaturityConfigManager.test.ts`:**
- ✅ JSON serialization/deserialization
- ✅ Configuration validation
- ✅ Default fallback

### Integration Tests

**End-to-end injection flow:**
1. Set maturity context (Q5, standard complexity)
2. Load template with mixed maturity items
3. Inject template
4. Verify correct items selected
5. Verify framing applied
6. Verify context header present

### User Acceptance Testing

**Test Scenarios:**
- [ ] Junior developer in inception project → sees learning-focused content
- [ ] Senior developer in mature project → sees documentation prompts
- [ ] Mid developer in development → sees balanced patterns
- [ ] Changing complexity changes selected items
- [ ] Include adjacent increases item count
- [ ] Max items limit works correctly

---

## Success Metrics

1. **Configuration Time**: < 30 seconds to configure
2. **Relevance**: 80%+ of injected items appropriate for context
3. **Performance**: Selection algorithm < 100ms
4. **Adoption**: Users configure maturity without assistance
5. **Learning Capture**: Auto-tagging reduces manual work by 90%

---

## Timeline Summary

| Phase | Tasks | Duration | Cumulative |
|-------|-------|----------|------------|
| **Phase 1** | Data model + selection logic | 3-4 hours | 3-4 hours |
| **Phase 2** | Configuration persistence | 2-3 hours | 5-7 hours |
| **Phase 3** | UI implementation | 4-5 hours | 9-12 hours |
| **Phase 4** | Injection integration | 3-4 hours | 12-16 hours |
| **Migration** | Template updates + defaults | 1 hour | 13-17 hours |

**Total: 12-16 hours** (with migration)
**MVP Ready After: Phase 3** (9-12 hours)

---

## Implementation Order

### Recommended Sequence

1. ✅ **Phase 1** → Core foundation, can be tested independently
2. ✅ **Phase 2** → Configuration management, enables persistence
3. ✅ **Phase 3** → UI for user interaction, provides immediate value
4. ✅ **Phase 4** → Injection integration, completes the feature
5. ✅ **Migration** → Update existing templates

### Incremental Rollout

- **After Phase 1-2**: Backend ready, can test programmatically
- **After Phase 3**: MVP ready, users can configure and preview
- **After Phase 4**: Full feature, production-ready

---

## Risk Mitigation

### Potential Risks

1. **Backward Compatibility**: Existing templates without maturity tags
   - **Mitigation**: Maturity is optional, defaults to broad coverage

2. **Performance**: Selection with large template sets
   - **Mitigation**: Tag-based matching is O(n), very fast

3. **User Confusion**: Three dimensions may be complex
   - **Mitigation**: Good defaults (Q5, standard), clear UI labels

4. **Over-filtering**: Users get too few items
   - **Mitigation**: "Include adjacent" enabled by default

---

## Future Enhancements (Post-MVP)

1. **Multi-Domain Support**: Add domain tags (frontend, backend, etc.)
2. **Team Profiles**: Quick-switch between operator profiles
3. **Analytics Dashboard**: Track item usage patterns
4. **Smart Progression**: Suggest moving quadrants based on behavior
5. **Package Bundles**: Pre-configured sets for common scenarios
6. **AI-Assisted Tagging**: Use LLM to suggest maturity tags

---

**Status:** Ready for Implementation
**Next Step:** Begin Phase 1 - Data Model & Selection Logic
