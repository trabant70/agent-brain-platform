# AB Marketplace Implementation Plan

**Version**: 2.0 (Complete V1 Implementation)
**Date**: 2025-10-22
**Status**: Planning - Ready for Implementation

## Executive Summary

Implement AB Marketplace as a complete, clean V1 implementation. Replace existing `Template` interface with full `MarketplaceTemplate` schema. Add metadata collection to template creation flow. Build marketplace tab for browsing, installing, and managing templates. No backward compatibility needed - we're building V1 properly from the start.

## Core Philosophy

> **"Do it right, not fast. No technical debt. No 'holy cows'."**

- ✅ Complete implementation of marketplace features
- ✅ Replace existing Template infrastructure entirely
- ✅ Proper metadata collection from day one
- ✅ Clean, maintainable architecture
- ❌ No backward compatibility layers
- ❌ No deferred features within scope
- ❌ No quick hacks or shortcuts

## Strategic Decisions

### V1 Scope

**Included:**
- Full MarketplaceTemplate schema (version, category, tags, author, license, etc.)
- Bundled templates shipped with extension
- User-created templates with full metadata
- AB Marketplace tab for browsing and installing
- Template installation with genealogy tracking
- Template uninstallation with orphan cleanup
- Key-based deduplication
- Metadata collection modal in template creation flow
- Workspace-specific installations

**Excluded (Future Phases):**
- Remote catalog fetching
- Community sharing infrastructure (beyond manual file exchange)
- Template inheritance/composition
- Ratings, reviews, social features
- Telemetry/analytics
- Template updates/versioning notifications

### Core Principles

1. **Single Format**: One MarketplaceTemplate format everywhere
2. **Metadata Required**: All templates have full metadata from creation
3. **Workspace Isolation**: Templates are workspace-specific
4. **Item Independence**: Installed items carry genealogy but are independent
5. **Key-based Identity**: Use item.id for deduplication, not titles
6. **Orphan Cleanup**: Removing templates removes orphaned items
7. **Curated Security**: Manual curation prevents injection

---

## Architecture Overview

### Unified Template Model

**Single source of truth**: `MarketplaceTemplate` interface

```typescript
// packages/core/src/domains/knowledge/types.ts

export interface MarketplaceTemplate {
  // Core Identity
  id: string;                     // UUID (e.g., "bundled.git-essentials")
  name: string;                   // Display name
  description: string;            // Short description (1-2 sentences)

  // Versioning
  version: string;                // Semantic version (e.g., "1.0.0")
  createdAt: string;              // ISO timestamp
  updatedAt: string;              // ISO timestamp

  // Classification
  category: TemplateCategory;     // Primary category
  tags: string[];                 // Search/filter tags

  // Attribution
  author: TemplateAuthor;         // Creator information
  license: string;                // License (MIT, CC-BY, Apache, etc.)

  // Source
  source: TemplateSource;         // Origin type

  // Content
  items: KnowledgeItem[];         // Embedded full items
  itemCount: number;              // Convenience field

  // Runtime State (not persisted in template file)
  isInstalled?: boolean;          // Computed at load time
  installedAt?: string;           // From installation registry
  installedItemIds?: string[];   // IDs of created items in workspace
}

export enum TemplateCategory {
  DEVELOPMENT = 'development',
  DOCUMENTATION = 'documentation',
  BEST_PRACTICES = 'best-practices',
  ARCHITECTURE = 'architecture',
  TESTING = 'testing',
  SECURITY = 'security',
  ONBOARDING = 'onboarding',
  WORKFLOWS = 'workflows',
  GENERAL = 'general'
}

export enum TemplateSource {
  BUNDLED = 'bundled',      // Shipped with extension
  USER = 'user'             // Created by user
}

export interface TemplateAuthor {
  name: string;
  email?: string;
  url?: string;
}

// REMOVE OLD INTERFACE
// export interface Template { ... }  <-- DELETE THIS
```

### Extended KnowledgeItem

```typescript
// packages/core/src/domains/knowledge/types.ts

export interface KnowledgeItem {
  // Existing fields...
  id: string;
  type: KnowledgeType;
  scope: KnowledgeScope;
  title: string;
  content: string;
  tags?: string[];
  source?: string;
  author?: string;
  version?: number;
  createdAt: string;
  updatedAt: string;
  filePath?: string;

  // NEW: Template genealogy
  sourceTemplate?: {
    id: string;          // Template ID
    version: string;     // Template version at install time
    itemKey: string;     // Original item ID in template
  };
}
```

### Installation Registry

```typescript
// packages/core/src/domains/knowledge/types.ts

export interface InstalledTemplate {
  templateId: string;
  version: string;
  installedAt: string;
  installedItemIds: string[];   // Items created from this template
  source: TemplateSource;
}

export interface InstallationRegistry {
  version: string;              // Registry format version
  installed: InstalledTemplate[];
  lastUpdated: string;
}
```

---

## File Structure

### Directory Layout

```
.agent-brain/
├── marketplace/
│   ├── templates/                    # All available templates
│   │   ├── bundled/                 # Bundled (copied from extension)
│   │   │   ├── git-essentials.json
│   │   │   ├── typescript-patterns.json
│   │   │   └── api-design.json
│   │   └── user/                    # User-created templates
│   │       ├── my-team-patterns.json
│   │       └── api-standards.json
│   └── installed.json               # Installation registry
└── ... (other knowledge dirs)

packages/vscode/src/
├── marketplace/
│   ├── bundled-templates/           # Source templates (packaged with extension)
│   │   ├── git-essentials.json
│   │   ├── typescript-patterns.json
│   │   └── api-design.json
│   ├── MarketplaceManager.ts        # Main coordinator
│   ├── TemplateRegistry.ts          # Load/index templates
│   └── TemplateInstaller.ts         # Install/uninstall logic
```

### Template File Format

**Single unified format for all templates:**

```json
{
  "id": "bundled.git-essentials",
  "name": "Git Workflow Essentials",
  "description": "Essential patterns for Git branching and collaboration in team environments",
  "version": "1.0.0",
  "createdAt": "2025-10-22T00:00:00Z",
  "updatedAt": "2025-10-22T00:00:00Z",
  "category": "development",
  "tags": ["git", "version-control", "workflow", "collaboration"],
  "author": {
    "name": "Agent Brain Platform",
    "email": "templates@agentbrain.dev",
    "url": "https://github.com/agentbrain"
  },
  "license": "MIT",
  "source": "bundled",
  "itemCount": 8,
  "items": [
    {
      "id": "git-branching-strategy",
      "type": "golden-path",
      "scope": "team",
      "title": "Git Branching Strategy",
      "content": "# Git Branching Strategy\n\n## Overview\n\nRecommended branching model...",
      "tags": ["git", "branching"],
      "source": "template",
      "createdAt": "2025-10-22T00:00:00Z",
      "updatedAt": "2025-10-22T00:00:00Z"
    },
    {
      "id": "commit-message-format",
      "type": "standard",
      "scope": "team",
      "title": "Commit Message Format",
      "content": "# Commit Message Standard\n\n## Format\n\n```\ntype(scope): subject\n```",
      "tags": ["git", "commits"],
      "source": "template",
      "createdAt": "2025-10-22T00:00:00Z",
      "updatedAt": "2025-10-22T00:00:00Z"
    }
  ]
}
```

### Installation Registry Format

**File**: `.agent-brain/marketplace/installed.json`

```json
{
  "version": "1.0.0",
  "installed": [
    {
      "templateId": "bundled.git-essentials",
      "version": "1.0.0",
      "installedAt": "2025-10-22T10:15:30Z",
      "installedItemIds": [
        "git-branching-strategy",
        "commit-message-format"
      ],
      "source": "bundled"
    },
    {
      "templateId": "user.my-api-patterns",
      "version": "1.0.0",
      "installedAt": "2025-10-22T11:20:00Z",
      "installedItemIds": [
        "api-versioning-guide",
        "error-response-format"
      ],
      "source": "user"
    }
  ],
  "lastUpdated": "2025-10-22T11:20:00Z"
}
```

---

## Data Flow

### Extension Initialization

```
Extension Activation
    ↓
MarketplaceManager.initialize()
    ↓
├─→ Create .agent-brain/marketplace/ structure
├─→ Copy bundled templates → .agent-brain/marketplace/templates/bundled/
├─→ Load user templates from .agent-brain/marketplace/templates/user/
├─→ Load installation registry (.agent-brain/marketplace/installed.json)
├─→ Set isInstalled flag on templates
└─→ Notify webview: marketplace:templates-loaded
    ↓
Webview Ready
```

### Template Creation Flow (Knowledge Tab)

```
User selects items in Knowledge Tab
    ↓
Clicks "Create Template"
    ↓
Opens Metadata Collection Modal
    ↓
┌──────────────────────────────────────┐
│ Create Template                      │
├──────────────────────────────────────┤
│ Name: [___________________________]  │
│ Description: [___________________]   │
│ Category: [Development ▼]           │
│ Tags: [tag1] [tag2] [+ Add]         │
│ Author Name: [___________________]   │
│ Email: [_________________________]   │
│ License: [MIT ▼]                    │
│                                      │
│ Items (5 selected):                  │
│ • Item 1                             │
│ • Item 2                             │
│                                      │
│ [Cancel]  [Create Template]         │
└──────────────────────────────────────┘
    ↓
Validation
    ↓
Create MarketplaceTemplate object
    ↓
Save to .agent-brain/marketplace/templates/user/[slug].json
    ↓
Notify webview: marketplace:template-created
    ↓
Auto-switch to Marketplace tab
    ↓
Highlight new template (with "Save to File" option)
```

### Template Installation Flow

```
User clicks "Install" on template in Marketplace
    ↓
TemplateInstaller.install(template)
    ↓
├─→ Check if already installed → Error if yes
├─→ Detect duplicate items (by ID)
├─→ Skip duplicates, create new items
├─→ Add sourceTemplate metadata to each item
├─→ Update KnowledgeStore
└─→ Update installation registry
    ↓
Notify webview: marketplace:install-success
    ↓
Update UI (show "Installed" badge)
    ↓
Refresh Knowledge tab (new items appear)
```

### Template Uninstallation Flow

```
User clicks "Uninstall" on installed template
    ↓
Confirmation Dialog
    ↓
TemplateInstaller.uninstall(templateId)
    ↓
├─→ Find all items with sourceTemplate.id = templateId
├─→ Check each item: is it in other templates?
├─→ Build orphan list (items only in this template)
├─→ Delete orphaned items from KnowledgeStore
└─→ Remove from installation registry
    ↓
Notify webview: marketplace:uninstall-success
    ↓
Update UI (remove "Installed" badge)
    ↓
Refresh Knowledge tab (orphaned items removed)
```

---

## Component Design

### 1. MarketplaceManager (Extension Service)

**File**: `packages/vscode/src/marketplace/MarketplaceManager.ts`

**Purpose**: Main coordinator for marketplace operations

**Responsibilities**:
- Initialize marketplace directory structure
- Copy bundled templates to workspace
- Coordinate between registry, installer, and webview
- Handle template creation from Knowledge tab
- Manage installation registry

**Key Methods**:
```typescript
export class MarketplaceManager {
  constructor(
    private workspaceRoot: string,
    private knowledgeManager: KnowledgeManager
  )

  async initialize(): Promise<void>
  async getAvailableTemplates(): Promise<MarketplaceTemplate[]>
  async getInstalledTemplates(): Promise<InstalledTemplate[]>
  async createTemplate(items: KnowledgeItem[], metadata: TemplateMetadata): Promise<MarketplaceTemplate>
  async installTemplate(templateId: string): Promise<InstallResult>
  async uninstallTemplate(templateId: string): Promise<void>
  async exportTemplateToFile(templateId: string, filePath: string): Promise<void>
  async importTemplateFromFile(filePath: string): Promise<MarketplaceTemplate>
}
```

### 2. TemplateRegistry (Core Service)

**File**: `packages/vscode/src/marketplace/TemplateRegistry.ts`

**Purpose**: Load, index, and query templates

**Responsibilities**:
- Load templates from bundled/ and user/ directories
- Load installation registry
- Merge installation state with templates
- Index by category, tags, source
- Provide search and filtering

**Key Methods**:
```typescript
export class TemplateRegistry {
  async loadTemplates(marketplacePath: string): Promise<MarketplaceTemplate[]>
  async loadInstallationRegistry(registryPath: string): Promise<InstallationRegistry>
  async saveInstallationRegistry(registry: InstallationRegistry): Promise<void>

  getAll(): MarketplaceTemplate[]
  getByCategory(category: TemplateCategory): MarketplaceTemplate[]
  getBySource(source: TemplateSource): MarketplaceTemplate[]
  filterByTags(tags: string[]): MarketplaceTemplate[]
  search(query: string): MarketplaceTemplate[]
  getInstalled(): MarketplaceTemplate[]
  getAvailable(): MarketplaceTemplate[]
}
```

### 3. TemplateInstaller (Core Logic)

**File**: `packages/vscode/src/marketplace/TemplateInstaller.ts`

**Purpose**: Handle template installation and uninstallation

**Responsibilities**:
- Install templates (create items, track genealogy)
- Uninstall templates (remove orphaned items)
- Deduplication by item ID
- Update installation registry

**Key Methods**:
```typescript
export class TemplateInstaller {
  constructor(
    private knowledgeManager: KnowledgeManager,
    private registry: TemplateRegistry
  )

  async install(template: MarketplaceTemplate): Promise<InstallResult>
  async uninstall(templateId: string): Promise<UninstallResult>

  private detectDuplicates(items: KnowledgeItem[]): Map<string, KnowledgeItem>
  private findOrphanedItems(templateId: string): string[]
  private addGenealogyMetadata(item: KnowledgeItem, template: MarketplaceTemplate): KnowledgeItem
}

export interface InstallResult {
  success: boolean;
  itemsCreated: number;
  itemsSkipped: number;
  skippedItems: Array<{ id: string; reason: string }>;
}

export interface UninstallResult {
  success: boolean;
  itemsDeleted: number;
  itemsPreserved: number;
}
```

### 4. MarketplaceViewController (Webview UI)

**File**: `packages/core/src/domains/visualization/ui/MarketplaceViewController.ts`

**Purpose**: Manage marketplace tab UI

**Responsibilities**:
- Render template grid/list
- Search and filtering UI
- Template detail modal
- Install/uninstall actions
- Template creation trigger

**Key Methods**:
```typescript
export class MarketplaceViewController {
  async initialize(): Promise<void>
  async loadTemplates(): Promise<void>

  renderTemplateGrid(): void
  renderTemplateCard(template: MarketplaceTemplate): HTMLElement
  renderTemplateDetail(templateId: string): void

  handleSearch(query: string): void
  handleCategoryFilter(category: TemplateCategory | 'all'): void
  handleSourceFilter(sources: TemplateSource[]): void
  handleTagFilter(tags: string[]): void

  handleInstall(templateId: string): Promise<void>
  handleUninstall(templateId: string): Promise<void>
  handleViewDetail(templateId: string): void
  handleExportToFile(templateId: string): Promise<void>
}
```

---

## Migration Plan (Existing Code Updates)

### Phase 0: Breaking Changes

**Replace Template interface completely**

#### File: `packages/core/src/domains/knowledge/types.ts`

**Changes**:
1. Remove old `Template` interface
2. Add `MarketplaceTemplate` interface
3. Add `InstalledTemplate` interface
4. Add `InstallationRegistry` interface
5. Add enums: `TemplateCategory`, `TemplateSource`
6. Add `sourceTemplate` field to `KnowledgeItem`

#### File: `packages/core/src/domains/knowledge/KnowledgeStore.ts`

**Changes**:
1. Update `getAllTemplates()` return type: `Template[]` → `MarketplaceTemplate[]`
2. Update `getTemplate()` return type: `Template | undefined` → `MarketplaceTemplate | undefined`
3. Update internal template storage
4. **Note**: KnowledgeStore may no longer manage templates directly (marketplace does)
   - **Decision**: Move template storage to MarketplaceManager?
   - Or keep KnowledgeStore for in-memory cache only?

**Recommendation**: **Remove template methods from KnowledgeStore entirely**
- Templates are now managed by MarketplaceManager
- KnowledgeStore focuses on KnowledgeItems only
- Cleaner separation of concerns

#### File: `packages/vscode/src/services/KnowledgeManager.ts`

**Changes**:
1. Remove template-related methods (if any)
2. Add integration with MarketplaceManager
3. Update template application logic (if needed)

#### File: `packages/core/src/domains/knowledge/TemplateEngine.ts`

**Changes**:
1. Update `applyTemplate()` signature: `Template` → `MarketplaceTemplate`
2. Update internal logic to use new template structure
3. Handle `items` array directly (no need to look up itemIds)

#### File: `packages/core/src/domains/visualization/ui/KnowledgeViewController.ts`

**Changes**:
1. Remove old "Export Template" button
2. Add "Create Template" button → Opens metadata modal
3. Add metadata collection modal
4. Send template creation to extension → MarketplaceManager
5. Auto-switch to Marketplace tab after creation

---

## Implementation Phases

### Phase 1: Core Infrastructure (Days 1-3)

**Goal**: Replace Template with MarketplaceTemplate, set up directory structure

**Tasks**:

1. **Update Type System**
   - [ ] Add `MarketplaceTemplate` interface to `types.ts`
   - [ ] Add `InstalledTemplate`, `InstallationRegistry` to `types.ts`
   - [ ] Add enums: `TemplateCategory`, `TemplateSource`
   - [ ] Remove old `Template` interface
   - [ ] Add `sourceTemplate` field to `KnowledgeItem`

2. **Update KnowledgeStore**
   - [ ] Remove template management methods
   - [ ] Keep only KnowledgeItem-focused methods
   - [ ] Update indexes if needed

3. **Update TemplateEngine**
   - [ ] Change signature to use `MarketplaceTemplate`
   - [ ] Update logic to use `items` array directly

4. **Create Bundled Templates**
   - [ ] Create 3 test templates:
     - `git-essentials.json` (8 items)
     - `typescript-patterns.json` (6 items)
     - `api-design-basics.json` (5 items)
   - [ ] Place in `packages/vscode/src/marketplace/bundled-templates/`

5. **Create MarketplaceManager**
   - [ ] Implement `initialize()` - create directory structure
   - [ ] Implement `copyBundledTemplates()`
   - [ ] Basic structure for other methods (stubs)

6. **Create TemplateRegistry**
   - [ ] Implement `loadTemplates()` - read from bundled/ and user/
   - [ ] Implement `loadInstallationRegistry()`
   - [ ] Implement filtering/search methods

**Files Created**:
- `packages/vscode/src/marketplace/MarketplaceManager.ts`
- `packages/vscode/src/marketplace/TemplateRegistry.ts`
- `packages/vscode/src/marketplace/bundled-templates/*.json`

**Files Modified**:
- `packages/core/src/domains/knowledge/types.ts`
- `packages/core/src/domains/knowledge/KnowledgeStore.ts`
- `packages/core/src/domains/knowledge/TemplateEngine.ts`

**Validation**:
- [ ] Build succeeds with no type errors
- [ ] Extension activates without errors
- [ ] Bundled templates copied to workspace on activation
- [ ] Templates load correctly from registry

---

### Phase 2: Installation Logic (Days 4-5)

**Goal**: Implement install/uninstall operations

**Tasks**:

1. **Create TemplateInstaller**
   - [ ] Implement `install()` method
     - Duplicate detection (by item.id)
     - Item creation with genealogy
     - Installation registry update
   - [ ] Implement `uninstall()` method
     - Find items with matching sourceTemplate.id
     - Detect orphans (items not in other templates)
     - Delete orphaned items only
     - Update registry

2. **Wire up to KnowledgeManager**
   - [ ] Add method: `createItemsFromTemplate(items: KnowledgeItem[])`
   - [ ] Add method: `deleteItemsByIds(ids: string[])`
   - [ ] Ensure file system sync

3. **Message Handlers in TimelineProvider**
   - [ ] `marketplace:install-template` → MarketplaceManager.installTemplate()
   - [ ] `marketplace:uninstall-template` → MarketplaceManager.uninstallTemplate()
   - [ ] `marketplace:load-templates` → MarketplaceManager.getAvailableTemplates()

4. **Complete MarketplaceManager**
   - [ ] Implement `installTemplate()`
   - [ ] Implement `uninstallTemplate()`
   - [ ] Implement `getAvailableTemplates()`
   - [ ] Implement `getInstalledTemplates()`

**Files Created**:
- `packages/vscode/src/marketplace/TemplateInstaller.ts`

**Files Modified**:
- `packages/vscode/src/marketplace/MarketplaceManager.ts`
- `packages/vscode/src/services/KnowledgeManager.ts`
- `packages/vscode/src/providers/timeline-provider-webpack.ts`

**Validation**:
- [ ] Can install bundled template via message
- [ ] Items created in KnowledgeStore with genealogy
- [ ] installed.json updated correctly
- [ ] Can uninstall template
- [ ] Orphaned items deleted
- [ ] Items in multiple templates preserved

---

### Phase 3: Marketplace Tab UI (Days 6-8)

**Goal**: Create marketplace tab with template browsing

**Tasks**:

1. **HTML Structure**
   - [ ] Add "AB Marketplace" tab button to `timeline.html`
   - [ ] Add `#tab-marketplace` content div
   - [ ] Add search bar, category filters, source filters
   - [ ] Add template grid container

2. **CSS Styling**
   - [ ] Create `marketplace.css`
   - [ ] Template card design
   - [ ] Filter controls styling
   - [ ] Grid/list layout
   - [ ] Installed badge styling

3. **MarketplaceViewController**
   - [ ] Create controller class
   - [ ] Implement `initialize()`
   - [ ] Implement `loadTemplates()` - request from extension
   - [ ] Implement `renderTemplateGrid()`
   - [ ] Implement `renderTemplateCard()`
   - [ ] Category filter logic
   - [ ] Source filter logic
   - [ ] Search logic

4. **Template Cards**
   - [ ] Icon/emoji for category
   - [ ] Template name, version
   - [ ] Author, item count
   - [ ] Description (truncated)
   - [ ] Tags
   - [ ] "Install" / "Installed" / "View Details" buttons

5. **Message Handlers (Webview)**
   - [ ] Listen for `marketplace:templates-loaded`
   - [ ] Listen for `marketplace:install-success`
   - [ ] Listen for `marketplace:uninstall-success`

6. **Wire up to SimpleTimelineApp**
   - [ ] Instantiate MarketplaceViewController
   - [ ] Register in UIControllerManager

**Files Created**:
- `packages/core/src/domains/visualization/ui/MarketplaceViewController.ts`
- `packages/core/src/domains/visualization/styles/components/marketplace.css`

**Files Modified**:
- `packages/core/src/domains/visualization/templates/timeline.html`
- `packages/core/src/domains/visualization/webview/main.ts`
- `packages/core/src/domains/visualization/webview/SimpleTimelineApp.ts`
- `packages/core/src/domains/visualization/ui/UIControllerManager.ts`

**Validation**:
- [ ] Marketplace tab displays
- [ ] Templates load and render as cards
- [ ] Category filtering works
- [ ] Source filtering works
- [ ] Search finds templates by name/tags/description
- [ ] Install button triggers installation
- [ ] UI updates after install (shows "Installed" badge)

---

### Phase 4: Template Detail View (Day 9)

**Goal**: Add detailed template view

**Tasks**:

1. **Detail Modal**
   - [ ] Use existing ModalDialog component
   - [ ] Create custom content layout for template detail
   - [ ] Show full description (markdown rendered)
   - [ ] List all items with types
   - [ ] Show metadata (author, license, version, category, tags)
   - [ ] "Install" button (if not installed)
   - [ ] "Uninstall" button (if installed)
   - [ ] "Export to File" button

2. **MarketplaceViewController Updates**
   - [ ] Implement `renderTemplateDetail()`
   - [ ] Handle "View Details" button click
   - [ ] Handle actions from detail view

**Files Modified**:
- `packages/core/src/domains/visualization/ui/MarketplaceViewController.ts`
- `packages/core/src/domains/visualization/styles/components/marketplace.css`

**Validation**:
- [ ] Click "View Details" opens modal
- [ ] All template info displayed correctly
- [ ] Items listed with types
- [ ] Actions work from detail view

---

### Phase 5: Template Creation Flow (Days 10-12)

**Goal**: Update Knowledge tab to create templates with full metadata

**Tasks**:

1. **Metadata Collection Modal**
   - [ ] Create modal form in KnowledgeViewController
   - [ ] Fields:
     - Name (required)
     - Description (required)
     - Category (dropdown, required)
     - Tags (multi-input, optional)
     - Author Name (default to system username, required)
     - Author Email (optional)
     - License (dropdown, default MIT)
   - [ ] Validation
   - [ ] "Cancel" and "Create Template" buttons

2. **KnowledgeViewController Updates**
   - [ ] Remove old "Export Template" button
   - [ ] Add "Create Template" button (enabled when items selected)
   - [ ] Handle "Create Template" click → Open metadata modal
   - [ ] On confirm → Send `knowledge:create-template` message to extension

3. **Message Handlers (Extension)**
   - [ ] `knowledge:create-template` handler in TimelineProvider
   - [ ] Call MarketplaceManager.createTemplate()
   - [ ] Return success → Send `marketplace:template-created` to webview

4. **MarketplaceManager Updates**
   - [ ] Implement `createTemplate(items, metadata)`
   - [ ] Generate template ID: `user.{slug}`
   - [ ] Set version: "1.0.0"
   - [ ] Embed full items (deep copy)
   - [ ] Save to `.agent-brain/marketplace/templates/user/{slug}.json`

5. **Auto-Switch to Marketplace**
   - [ ] On `marketplace:template-created` message
   - [ ] TabManager switches to marketplace tab
   - [ ] Scroll to new template
   - [ ] Highlight with animation

**Files Modified**:
- `packages/core/src/domains/visualization/ui/KnowledgeViewController.ts`
- `packages/vscode/src/marketplace/MarketplaceManager.ts`
- `packages/vscode/src/providers/timeline-provider-webpack.ts`
- `packages/core/src/domains/visualization/webview/main.ts`
- `packages/core/src/domains/visualization/styles/components/knowledge.css`

**Validation**:
- [ ] Select items → "Create Template" button enabled
- [ ] Click button → Metadata modal opens
- [ ] All fields present and validated
- [ ] Cancel closes modal
- [ ] Create → Template saved to user/ folder
- [ ] Auto-switch to marketplace tab
- [ ] New template visible in grid

---

### Phase 6: Export to File (Day 13)

**Goal**: Allow exporting templates to external files

**Tasks**:

1. **Export Dialog**
   - [ ] Use VSCode file save dialog
   - [ ] Default filename: `{template-slug}.json`
   - [ ] Default location: workspace root or .agent-brain/exports/

2. **MarketplaceManager Updates**
   - [ ] Implement `exportTemplateToFile(templateId, filePath)`
   - [ ] Read template from marketplace
   - [ ] Write to specified path
   - [ ] Confirmation toast

3. **MarketplaceViewController Updates**
   - [ ] Add "Export to File" button in detail view
   - [ ] Add "Export" option in card dropdown menu
   - [ ] Send `marketplace:export-to-file` message

4. **Message Handlers**
   - [ ] `marketplace:export-to-file` handler
   - [ ] Show VSCode save dialog
   - [ ] Call MarketplaceManager.exportTemplateToFile()

**Files Modified**:
- `packages/vscode/src/marketplace/MarketplaceManager.ts`
- `packages/vscode/src/providers/timeline-provider-webpack.ts`
- `packages/core/src/domains/visualization/ui/MarketplaceViewController.ts`

**Validation**:
- [ ] Click "Export to File" opens save dialog
- [ ] Save writes valid JSON to chosen path
- [ ] File can be shared and re-imported

---

### Phase 7: Import from File (Day 14)

**Goal**: Allow importing templates from external files

**Tasks**:

1. **Import Action**
   - [ ] Add "Import Template" button to marketplace toolbar
   - [ ] Use VSCode file open dialog
   - [ ] Filter: `*.json`

2. **MarketplaceManager Updates**
   - [ ] Implement `importTemplateFromFile(filePath)`
   - [ ] Read and validate JSON
   - [ ] Check for ID conflicts
   - [ ] Copy to `.agent-brain/marketplace/templates/user/`
   - [ ] Update source to 'user'

3. **Validation**
   - [ ] Schema validation (all required fields present)
   - [ ] ID uniqueness check
   - [ ] Version format validation

4. **MarketplaceViewController Updates**
   - [ ] Add import button to toolbar
   - [ ] Send `marketplace:import-from-file` message
   - [ ] Reload templates after import

**Files Modified**:
- `packages/vscode/src/marketplace/MarketplaceManager.ts`
- `packages/vscode/src/providers/timeline-provider-webpack.ts`
- `packages/core/src/domains/visualization/ui/MarketplaceViewController.ts`
- `packages/core/src/domains/visualization/templates/timeline.html`

**Validation**:
- [ ] Click "Import Template" opens file dialog
- [ ] Valid template file imports successfully
- [ ] Appears in marketplace grid
- [ ] Invalid files show error message
- [ ] Duplicate IDs handled gracefully

---

### Phase 8: Polish & Testing (Days 15-16)

**Goal**: Error handling, edge cases, user experience

**Tasks**:

1. **Error Handling**
   - [ ] Template load failures
   - [ ] Installation failures (disk errors, etc.)
   - [ ] Uninstallation failures
   - [ ] Import validation errors
   - [ ] Export save errors

2. **Loading States**
   - [ ] Spinner while loading templates
   - [ ] Spinner during install/uninstall
   - [ ] Disabled buttons during operations

3. **Empty States**
   - [ ] No templates available
   - [ ] No search results
   - [ ] No installed templates

4. **Confirmation Dialogs**
   - [ ] Uninstall confirmation (show items to be deleted)
   - [ ] Overwrite confirmation on import

5. **Notifications**
   - [ ] Toast on successful install
   - [ ] Toast on successful uninstall
   - [ ] Toast on template creation
   - [ ] Toast on export/import
   - [ ] Error toasts with helpful messages

6. **Documentation**
   - [ ] Update CLAUDE.md with marketplace section
   - [ ] Document template file format
   - [ ] Document installation flow
   - [ ] Document creation flow

7. **Testing Checklist**
   - [ ] Install bundled template
   - [ ] Uninstall template
   - [ ] Create user template
   - [ ] Install user template
   - [ ] Template with duplicate items
   - [ ] Template with items in multiple templates
   - [ ] Export template to file
   - [ ] Import template from file
   - [ ] Search templates
   - [ ] Filter by category
   - [ ] Filter by source
   - [ ] View template detail
   - [ ] Empty state displays

**Files Modified**:
- All marketplace files (error handling)
- `CLAUDE.md` (documentation)
- `packages/core/src/domains/visualization/styles/components/marketplace.css` (empty states)

**Validation**:
- [ ] All operations handle errors gracefully
- [ ] User always gets feedback
- [ ] No unhandled exceptions
- [ ] Loading states prevent duplicate actions
- [ ] Empty states are informative
- [ ] Documentation is complete and accurate

---

## UI Design Specifications

### Marketplace Tab Layout

```
┌────────────────────────────────────────────────────────────────┐
│ 🏪 AB Marketplace                                              │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ [🔍 Search templates...]  [All ▼]  [📥 Import]  [🔄 Refresh] │
│                                                                │
│ ┌─ Filters ─────────────────────────────────────────────────┐ │
│ │ Category: [All] [Dev] [Docs] [Arch] [Testing] [Security] │ │
│ │ Source:   [✓] Bundled  [✓] User                          │ │
│ └───────────────────────────────────────────────────────────┘ │
│                                                                │
│ ┌─ Templates ───────────────────────────────────────────────┐ │
│ │                                                           │ │
│ │ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐   │ │
│ │ │ 🎯            │ │ 📘            │ │ 🌐            │   │ │
│ │ │ Git           │ │ TypeScript    │ │ API Design    │   │ │
│ │ │ Essentials    │ │ Patterns      │ │ Basics        │   │ │
│ │ │               │ │               │ │               │   │ │
│ │ │ v1.0.0        │ │ v1.0.0        │ │ v1.0.0        │   │ │
│ │ │ Development   │ │ Development   │ │ Architecture  │   │ │
│ │ │ 8 items       │ │ 6 items       │ │ 5 items       │   │ │
│ │ │ 🏢 Bundled    │ │ 🏢 Bundled    │ │ 👤 User       │   │ │
│ │ │               │ │               │ │               │   │ │
│ │ │ Essential Git │ │ Common TS     │ │ REST API best │   │ │
│ │ │ patterns for  │ │ design        │ │ practices and │   │ │
│ │ │ collaboration │ │ patterns...   │ │ standards...  │   │ │
│ │ │               │ │               │ │               │   │ │
│ │ │ [git] [flow]  │ │ [typescript]  │ │ [api] [rest]  │   │ │
│ │ │               │ │               │ │               │   │ │
│ │ │ [Install]     │ │ [✓ Installed] │ │ [Details]     │   │ │
│ │ └───────────────┘ └───────────────┘ └───────────────┘   │ │
│ │                                                           │ │
│ └───────────────────────────────────────────────────────────┘ │
│                                                                │
│ Showing 3 templates • 1 installed                             │
└────────────────────────────────────────────────────────────────┘
```

### Template Card Design

```
┌────────────────────────────┐
│ 🎯                         │  <- Category icon/emoji
│ Git Essentials             │  <- Name
│                            │
│ v1.0.0 • Development       │  <- Version • Category
│ 8 items • 🏢 Bundled       │  <- Count • Source badge
│                            │
│ Essential patterns for Git │  <- Description (2 lines max)
│ branching and collaboration│
│                            │
│ [git] [workflow] [team]    │  <- Tags (max 3 visible)
│                            │
│ by Agent Brain Platform    │  <- Author
│                            │
│ ┌────────────┬───────────┐ │
│ │ [Install]  │ [Details] │ │  <- Actions
│ └────────────┴───────────┘ │
└────────────────────────────┘

States:
- Not Installed: [Install] button (blue)
- Installed: [✓ Installed] badge + [Uninstall] in menu
- Installing: [Installing...] disabled button + spinner
```

### Template Detail Modal

```
┌──────────────────────────────────────────────────────────┐
│ ✕                                                        │
│                                                          │
│ 🎯 Git Workflow Essentials                              │
│ by Agent Brain Platform                                 │
│                                                          │
│ v1.0.0 • Development • MIT License • 🏢 Bundled         │
│                                                          │
│ ┌──────────────┬──────────────┬──────────────┐          │
│ │ [Install]    │ [Export File]│ [Close]      │          │
│ └──────────────┴──────────────┴──────────────┘          │
│                                                          │
│ ─────────────────────────────────────────────────────   │
│                                                          │
│ ## Description                                           │
│                                                          │
│ Essential patterns for Git branching and collaboration  │
│ in team environments. Includes standards for commit     │
│ messages, branch naming, code review, and more.         │
│                                                          │
│ ## What's Included (8 items)                            │
│                                                          │
│ • Git Branching Strategy (Golden Path)                  │
│ • Commit Message Format (Standard)                      │
│ • Code Review Checklist (Checklist)                     │
│ • Pull Request Template (Template)                      │
│ • Branch Naming Convention (Standard)                   │
│ • Merge vs Rebase Guidelines (ADR)                      │
│ • Git Hooks Setup (How-to Guide)                        │
│ • Conflict Resolution Process (Best Practice)           │
│                                                          │
│ ## Metadata                                              │
│                                                          │
│ **Tags:** git, version-control, workflow, collaboration │
│ **Author:** Agent Brain Platform                        │
│ **Email:** templates@agentbrain.dev                     │
│ **License:** MIT                                         │
│ **Created:** October 22, 2025                           │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Metadata Collection Modal (Template Creation)

```
┌──────────────────────────────────────────────────────────┐
│ Create Template                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Name *                                                   │
│ [_____________________________________________]          │
│                                                          │
│ Description *                                            │
│ [_____________________________________________]          │
│ [_____________________________________________]          │
│                                                          │
│ Category *                                               │
│ [Development                                  ▼]         │
│                                                          │
│ Tags (comma-separated)                                   │
│ [git, workflow, team_________________________]          │
│                                                          │
│ Author                                                   │
│ Name *                                                   │
│ [Agent Brain Platform_________________________]          │
│ Email                                                    │
│ [templates@agentbrain.dev_____________________]          │
│                                                          │
│ License *                                                │
│ [MIT                                          ▼]         │
│                                                          │
│ ─────────────────────────────────────────────────────   │
│                                                          │
│ Items to Include (5 selected)                           │
│ • Git Branching Strategy                                │
│ • Commit Message Format                                 │
│ • Code Review Checklist                                 │
│ • Pull Request Template                                 │
│ • Branch Naming Convention                              │
│                                                          │
│ ┌────────────────────┬────────────────────────────────┐ │
│ │ [Cancel]           │ [Create Template]              │ │
│ └────────────────────┴────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘

* Required fields
```

---

## Message Protocol

### Extension → Webview

```typescript
// Templates loaded (on initialization or refresh)
{
  type: 'marketplace:templates-loaded',
  payload: {
    templates: MarketplaceTemplate[],
    installed: InstalledTemplate[]
  }
}

// Installation success
{
  type: 'marketplace:install-success',
  payload: {
    templateId: string,
    itemsCreated: number,
    itemsSkipped: number
  }
}

// Installation error
{
  type: 'marketplace:install-error',
  payload: {
    templateId: string,
    error: string
  }
}

// Uninstallation success
{
  type: 'marketplace:uninstall-success',
  payload: {
    templateId: string,
    itemsDeleted: number,
    itemsPreserved: number
  }
}

// Template created
{
  type: 'marketplace:template-created',
  payload: {
    template: MarketplaceTemplate
  }
}

// Export success
{
  type: 'marketplace:export-success',
  payload: {
    templateId: string,
    filePath: string
  }
}

// Import success
{
  type: 'marketplace:import-success',
  payload: {
    template: MarketplaceTemplate
  }
}
```

### Webview → Extension

```typescript
// Load templates
{
  type: 'marketplace:load-templates'
}

// Install template
{
  type: 'marketplace:install-template',
  payload: {
    templateId: string
  }
}

// Uninstall template
{
  type: 'marketplace:uninstall-template',
  payload: {
    templateId: string
  }
}

// Create template from Knowledge tab
{
  type: 'knowledge:create-template',
  payload: {
    items: KnowledgeItem[],
    metadata: {
      name: string,
      description: string,
      category: TemplateCategory,
      tags: string[],
      author: {
        name: string,
        email?: string
      },
      license: string
    }
  }
}

// Export template to file
{
  type: 'marketplace:export-to-file',
  payload: {
    templateId: string
  }
}

// Import template from file
{
  type: 'marketplace:import-from-file'
}
```

---

## Key Implementation Details

### 1. Deduplication Logic

**Rule**: Use `item.id` as unique key, skip duplicates silently

```typescript
function detectDuplicates(
  newItems: KnowledgeItem[],
  existingItems: KnowledgeItem[]
): Map<string, KnowledgeItem> {
  const duplicates = new Map<string, KnowledgeItem>();

  for (const newItem of newItems) {
    const existing = existingItems.find(e => e.id === newItem.id);
    if (existing) {
      duplicates.set(newItem.id, existing);
    }
  }

  return duplicates;
}
```

### 2. Orphan Detection Logic

**Rule**: Item is orphaned if it exists ONLY in the template being removed

```typescript
function findOrphanedItems(
  templateId: string,
  allItems: KnowledgeItem[],
  installedTemplates: InstalledTemplate[]
): string[] {
  const orphans: string[] = [];

  // Get all item IDs from this template
  const installation = installedTemplates.find(t => t.templateId === templateId);
  if (!installation) return [];

  const templateItemIds = new Set(installation.installedItemIds);

  // Get all item IDs from other templates
  const otherItemIds = new Set<string>();
  for (const installed of installedTemplates) {
    if (installed.templateId !== templateId) {
      installed.installedItemIds.forEach(id => otherItemIds.add(id));
    }
  }

  // Item is orphaned if it's in this template but not in any other
  for (const itemId of templateItemIds) {
    if (!otherItemIds.has(itemId)) {
      orphans.push(itemId);
    }
  }

  return orphans;
}
```

### 3. Genealogy Metadata

**Applied to each item on installation**:

```typescript
function addGenealogyMetadata(
  item: KnowledgeItem,
  template: MarketplaceTemplate
): KnowledgeItem {
  return {
    ...item,
    sourceTemplate: {
      id: template.id,
      version: template.version,
      itemKey: item.id  // Original ID in template
    }
  };
}
```

### 4. Template ID Generation

**Bundled templates**: `bundled.{slug}`
**User templates**: `user.{slug}`

```typescript
function generateTemplateId(name: string, source: TemplateSource): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const prefix = source === TemplateSource.BUNDLED ? 'bundled' : 'user';
  return `${prefix}.${slug}`;
}
```

### 5. Bundled Template Copying

**When**: Extension activation
**What**: Copy bundled templates to workspace

```typescript
async function copyBundledTemplates(workspaceRoot: string): Promise<void> {
  const bundledSource = path.join(__dirname, '../marketplace/bundled-templates');
  const bundledDest = path.join(workspaceRoot, '.agent-brain/marketplace/templates/bundled');

  await fs.mkdir(bundledDest, { recursive: true });

  const files = await fs.readdir(bundledSource);
  for (const file of files) {
    if (file.endsWith('.json')) {
      await fs.copyFile(
        path.join(bundledSource, file),
        path.join(bundledDest, file)
      );
    }
  }
}
```

---

## Testing Strategy

### Unit Tests

**TemplateRegistry**:
- Load bundled templates
- Load user templates
- Load installation registry
- Filter by category
- Filter by tags
- Search by query
- Merge installation state

**TemplateInstaller**:
- Install creates items with genealogy
- Duplicate detection works
- Skips duplicate items
- Uninstall finds orphans correctly
- Uninstall preserves items in multiple templates
- Registry updates correctly

**MarketplaceManager**:
- Initialize creates directory structure
- Create template generates valid JSON
- Export to file works
- Import validates and copies file

### Integration Tests

**Full Installation Flow**:
1. Start with empty workspace
2. Extension activates → Bundled templates copied
3. Load marketplace → Templates appear
4. Install template → Items created
5. Verify installation registry updated
6. Verify items have genealogy
7. Verify Knowledge tab shows new items

**Template Creation Flow**:
1. Select items in Knowledge tab
2. Click "Create Template"
3. Fill metadata modal
4. Submit
5. Verify template file created in user/
6. Verify marketplace shows new template
7. Install it in different workspace
8. Verify items match

**Uninstall Flow**:
1. Install template A (items 1, 2, 3)
2. Install template B (items 2, 3, 4)
3. Uninstall A
4. Verify items 2, 3 still exist (in template B)
5. Verify item 1 deleted (orphaned)
6. Uninstall B
7. Verify items 2, 3, 4 deleted

### Manual Testing Checklist

- [ ] Bundled templates appear on first load
- [ ] Category filter works
- [ ] Source filter works
- [ ] Tag filter works
- [ ] Search finds templates
- [ ] Install creates all items
- [ ] Installed badge appears
- [ ] Knowledge tab shows new items
- [ ] Uninstall removes orphans only
- [ ] Create template from Knowledge tab
- [ ] Metadata modal validates input
- [ ] New template appears in marketplace
- [ ] Export to file creates valid JSON
- [ ] Import from file adds template
- [ ] Template detail view shows all info
- [ ] Empty states display correctly
- [ ] Error handling works (invalid files, etc.)
- [ ] Loading states prevent duplicate actions

---

## Security Considerations

### 1. Curated Content

**Risk**: Malicious template content

**Mitigation**:
- All bundled templates are manually curated
- User templates are created by the user (trusted)
- Imported templates require user action (file selection)
- No automatic execution of template code

### 2. File System Safety

**Risk**: Path traversal, overwriting system files

**Mitigation**:
- All paths validated and sanitized
- Template IDs restricted to alphanumeric + dash
- All operations scoped to `.agent-brain/marketplace/`
- Use `path.join()` for all file operations

```typescript
function sanitizeTemplateId(id: string): string {
  return id.replace(/[^a-z0-9.-]/g, '-');
}

function getTemplateFilePath(id: string, source: TemplateSource): string {
  const sanitized = sanitizeTemplateId(id);
  const subdir = source === TemplateSource.BUNDLED ? 'bundled' : 'user';
  return path.join(
    this.workspaceRoot,
    '.agent-brain/marketplace/templates',
    subdir,
    `${sanitized}.json`
  );
}
```

### 3. Markdown Rendering

**Risk**: XSS via malicious markdown

**Mitigation**:
- Use safe markdown renderer (marked.js with sanitize option)
- No HTML pass-through in template descriptions
- Escape user input

### 4. Schema Validation

**Risk**: Malformed template files crash extension

**Mitigation**:
- Validate all JSON on import
- Check required fields
- Check types (string, array, etc.)
- Fail gracefully with error message

```typescript
function validateTemplate(data: any): MarketplaceTemplate {
  if (!data.id || typeof data.id !== 'string') {
    throw new Error('Invalid template: missing or invalid id');
  }
  if (!data.name || typeof data.name !== 'string') {
    throw new Error('Invalid template: missing or invalid name');
  }
  // ... more validation
  return data as MarketplaceTemplate;
}
```

---

## Success Criteria

### Phase 1-2 (Infrastructure & Installation)
- ✅ MarketplaceTemplate replaces old Template everywhere
- ✅ 3 bundled templates load correctly
- ✅ Install creates items with genealogy
- ✅ Uninstall removes only orphaned items
- ✅ Deduplication works by item ID

### Phase 3-4 (Marketplace UI)
- ✅ Marketplace tab displays all templates
- ✅ Filtering by category/source/tags works
- ✅ Search is responsive
- ✅ Install/uninstall buttons work
- ✅ Detail view shows complete info
- ✅ UI updates reflect installation state

### Phase 5-6 (Creation & Export)
- ✅ Metadata modal collects all required fields
- ✅ Template creation saves valid file
- ✅ Auto-switch to marketplace after creation
- ✅ Export to file creates valid JSON
- ✅ Exported files can be shared

### Phase 7-8 (Import & Polish)
- ✅ Import validates and adds templates
- ✅ All error paths handled gracefully
- ✅ User feedback for all actions
- ✅ No unhandled exceptions
- ✅ Documentation is complete

---

## Timeline

**Total Estimate**: 16 working days (3.2 weeks)

- **Days 1-3**: Core infrastructure (replace Template, create managers)
- **Days 4-5**: Installation logic (install/uninstall)
- **Days 6-8**: Marketplace UI (tab, cards, filters)
- **Day 9**: Template detail view
- **Days 10-12**: Template creation flow (metadata modal)
- **Day 13**: Export to file
- **Day 14**: Import from file
- **Days 15-16**: Polish, error handling, testing, documentation

**Milestones**:
- Day 3: Templates load, old Template interface removed
- Day 5: Can install/uninstall programmatically
- Day 8: Marketplace tab fully functional
- Day 12: Complete template creation workflow
- Day 14: Import/export working
- Day 16: Production-ready

---

## Future Enhancements (Post-V1)

### Deferred to Later Phases

1. **Remote Catalog**
   - Fetch templates from GitHub/CDN
   - Community contributions
   - Automatic updates

2. **Template Versioning**
   - Update installed templates
   - Show changelog
   - Handle breaking changes

3. **Ratings & Reviews**
   - User feedback
   - Quality indicators

4. **Template Dependencies**
   - Templates require other templates
   - Dependency resolution

5. **Template Inheritance**
   - Base templates with overrides
   - Composition patterns

6. **Analytics**
   - Usage tracking
   - Popular templates

7. **Advanced Metadata**
   - Screenshots
   - Icons/logos
   - Longer descriptions with images

### Extension Points Built-In

**Interface for future catalog service**:
```typescript
interface ITemplateCatalogService {
  fetchCatalog(source: string): Promise<MarketplaceTemplate[]>;
  checkForUpdates(): Promise<TemplateUpdate[]>;
}
```

**Unused fields in MarketplaceTemplate**:
- `screenshots?: string[]` (reserved for future)
- `statistics?: {...}` (reserved for analytics)

---

## Open Questions

✅ **All questions resolved - ready to proceed**

---

## Next Steps

1. ✅ **Review this plan** - Approved by user
2. ✅ **No backward compatibility needed** - Clean V1 implementation
3. **Begin Phase 1** - Update type system and create infrastructure

---

**Document Status**: ✅ Complete, Ready for Implementation
**Last Updated**: 2025-10-22
**Version**: 2.0 (Complete V1)
**Approved**: Ready to proceed
