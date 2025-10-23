# Codebase Audit for V1 Implementation

**Date**: October 23, 2025
**Purpose**: Identify what exists vs what needs to be built/refactored for V1 template sections

---

## ✅ Already Exists (PRESERVE & ENHANCE)

### 1. Timeline Event Recording ✅
**Location**: `packages/core/src/domains/events/`

**Files**:
- `EventType.ts` - Enum with KNOWLEDGE_APPLIED, KNOWLEDGE_REMOVED, KNOWLEDGE_CREATED
- `KnowledgeEventStorage.ts` - Stores events in `.agent-brain/events/knowledge-events.json`
- `KnowledgeEventProvider.ts` - Transforms events to CanonicalEvents for timeline

**Current Functionality**:
- ✅ Records when items are created
- ✅ Records when items are applied to claude.md
- ✅ Records when items are removed from claude.md
- ✅ Shows in timeline visualization
- ✅ Stores in JSON file with metadata

**Usage in KnowledgeManager.ts**:
```typescript
await this.eventStorage.recordEvent({
  type: 'apply' | 'remove' | 'create',
  knowledgeItemId: item.id,
  knowledgeItemTitle: item.title,
  knowledgeItemType: item.type,
  targetFile: 'CLAUDE.md',
  actor: 'user' | 'agent'
});
```

**What to preserve**: Entire event recording system
**What to enhance**: Add template-level events (inject/remove entire template)

---

### 2. Knowledge Data Structures ✅
**Location**: `packages/core/src/domains/knowledge/types.ts`

**Existing Types**:
- `KnowledgeItem` - Item definition (title, body, type, scope, tags)
- `KnowledgeType` enum - 20 types (golden-path, best-practice, etc.)
- `KnowledgeScope` enum - 5 scopes (personal, team, etc.)
- `MarketplaceTemplate` - Template definition with items[]

**What to preserve**: All existing types
**What to enhance**: Add audit log fields, versioning fields, injection tracking

---

### 3. File System & Storage ✅
**Location**: `packages/core/src/domains/knowledge/`

**Files**:
- `KnowledgeFileSystem.ts` - Read/write markdown files with YAML frontmatter
- `KnowledgeStore.ts` - In-memory storage for items (5 indexes)

**What to preserve**: File reading/writing logic
**What to refactor**: Storage model (items → embedded in templates)

---

### 4. Template Injection/Removal ✅
**Location**: `packages/core/src/domains/knowledge/TemplateEngine.ts`

**Existing Functionality**:
- ✅ Inject items to claude.md with markers
- ✅ Remove items by marker ID
- ✅ Parse existing markers from file

**Markers Format**:
```markdown
<!-- ITEM: item-slug [item-id-123] -->
Content here
<!-- END ITEM: item-slug -->
```

**What to preserve**: Injection/removal logic
**What to enhance**: Add template-level markers for grouped removal

---

### 5. Marketplace Template Manager ✅
**Location**: `packages/core/src/domains/knowledge/marketplace/MarketplaceTemplateManager.ts`

**Existing Functionality**:
- ✅ Load bundled templates from dist/
- ✅ Load user templates from .agent-brain/marketplace/templates/
- ✅ Import/export templates (JSON)
- ✅ Template validation (NEW - just added security validation)

**What to preserve**: Template loading, import/export, validation
**What to refactor**: Merge into TemplateStore (remove marketplace separation)

---

## 🔨 Need to Build (NEW)

### 1. TemplateStore (NEW) - Primary storage
**Purpose**: Replace KnowledgeStore + MarketplaceManager with unified storage

**Responsibilities**:
- Store templates with embedded items (not separate)
- CRUD operations on templates
- CRUD operations on items within templates
- Move/copy items between templates

**Replaces**:
- `KnowledgeStore` (items only)
- `MarketplaceManager` (templates without items)
- `TemplateRegistry` (installation tracking - no longer needed)

---

### 2. AuditLogger (NEW) - Change tracking
**Purpose**: Record all template/item operations

**Responsibilities**:
- Log every operation with timestamp
- Store before/after snapshots
- Query audit history
- Export audit logs

**Integrates with**: TemplateStore (calls audit logger on every operation)

---

### 3. VersionManager (NEW) - Checkpointing
**Purpose**: User-created version snapshots

**Responsibilities**:
- Create version checkpoints (deep snapshot)
- Restore from version
- Compare versions (diff)
- Manage version history

**Integrates with**: TemplateStore

---

### 4. TemplateCloner (NEW) - Shallow cloning
**Purpose**: Clone any template (bundled or user)

**Responsibilities**:
- Clone template with new ID
- Clone all items with new IDs
- Create initial audit log entry
- Track source template

**Integrates with**: TemplateStore

---

### 5. Enhanced UI - Template Sections
**Purpose**: Replace marketplace tab with template sections in Knowledge tab

**Changes**:
- Remove "AB Marketplace" tab
- Show templates as collapsible sections in table
- Add [📦 Import] button (marketplace browser modal)
- Add [➕ Create Template] button
- Add [💉] button to each item row
- Add drag-drop between template sections
- Add template section action buttons

---

## 🔄 Need to Refactor (MODIFY)

### 1. KnowledgeManager.ts (MAJOR REFACTOR)
**Current**: Uses KnowledgeStore + MarketplaceManager separately

**Changes Needed**:
```typescript
// Before
private store: KnowledgeStore;
private marketplaceManager: MarketplaceTemplateManager;
private templateRegistry: TemplateRegistry;
private templateInstaller: TemplateInstaller;

// After
private templateStore: TemplateStore;
private auditLogger: AuditLogger;
private versionManager: VersionManager;
private templateCloner: TemplateCloner;
```

**Preserve**:
- `eventStorage: KnowledgeEventStorage` - KEEP THIS
- Event recording calls - ENHANCE (add template-level)
- File watching logic

**Remove**:
- `templateRegistry` - Installation concept no longer exists
- `templateInstaller` - Templates don't "install", they just exist

---

### 2. TemplateEngine.ts (ENHANCE)
**Current**: Injects/removes individual items

**Changes Needed**:
- Add template-level injection markers
- Support grouped removal (entire template)

**New Marker Format**:
```markdown
<!-- TEMPLATE: template-name [template-id-123] -->
[All items in template]
<!-- END TEMPLATE: template-name -->
```

**Preserve**: Individual item markers (both formats needed)

---

### 3. KnowledgeMessageHandler.ts (ENHANCE)
**Current**: Handles item CRUD, template apply/remove

**Changes Needed**:
- Add template CRUD handlers (create, clone, delete, update)
- Add version checkpoint handlers
- Add audit log query handlers
- Add drag-drop handlers (move/copy items)
- Remove marketplace-specific handlers (merge into knowledge handlers)

**Preserve**: Existing message handling patterns

---

### 4. Knowledge Tab UI (MAJOR REFACTOR)
**Current**: Separate tabs for Knowledge and Marketplace

**Changes Needed**:
- Remove Marketplace tab HTML
- Refactor Knowledge table to show template sections
- Add collapsible section headers
- Add action buttons per section
- Add drag-drop zone indicators

---

## 📊 Implementation Delta Summary

### Preserve (30%)
- ✅ Event recording system (KnowledgeEventStorage, KnowledgeEventProvider)
- ✅ Timeline visualization
- ✅ File system I/O (KnowledgeFileSystem)
- ✅ Template injection/removal (TemplateEngine - enhance only)
- ✅ Data types (KnowledgeItem, KnowledgeType, etc.)
- ✅ Import/export logic

### Build New (40%)
- 🔨 TemplateStore (unified storage)
- 🔨 AuditLogger (change tracking)
- 🔨 VersionManager (checkpoints)
- 🔨 TemplateCloner (shallow cloning)
- 🔨 UI template sections (major overhaul)
- 🔨 Drag-drop system

### Refactor (30%)
- 🔄 KnowledgeManager (swap storage backend)
- 🔄 TemplateEngine (add template-level markers)
- 🔄 KnowledgeMessageHandler (add new handlers)
- 🔄 Types (add audit/version fields)

---

## 🎯 Phase 1 Implementation (Start Here)

### Step 1: Enhance Types (1 hour)
**File**: `packages/core/src/domains/knowledge/types.ts`

**Add**:
```typescript
interface Template {
  // ... existing fields ...

  // NEW: Versioning
  version: string;
  versionHistory: TemplateVersion[];
  lastVersionedAt?: Date;

  // NEW: Audit trail
  auditLog: AuditLogEntry[];

  // NEW: Cloning tracking
  sourceTemplateId?: string;  // If cloned from another template

  // NEW: Items embedded (not just IDs)
  items: KnowledgeItem[];  // Full items, not references
}

interface TemplateVersion {
  versionNumber: string;
  description: string;
  createdAt: Date;
  createdBy: string;
  snapshot: {
    items: KnowledgeItem[];
    templateMetadata: any;
  };
}

enum AuditOperation {
  TEMPLATE_CREATED = 'template.created',
  TEMPLATE_CLONED = 'template.cloned',
  ITEM_ADDED = 'item.added',
  ITEM_REMOVED = 'item.removed',
  ITEM_UPDATED = 'item.updated',
  ITEM_MOVED = 'item.moved',
  ITEM_COPIED = 'item.copied',
  TEMPLATE_INJECTED = 'template.injected',
  ITEM_INJECTED = 'item.injected',
  // ... more
}

interface AuditLogEntry {
  id: string;
  timestamp: Date;
  operation: AuditOperation;
  actor: string;
  details: any;
  before?: any;
  after?: any;
}
```

---

### Step 2: Build AuditLogger (2 hours)
**File**: `packages/core/src/domains/knowledge/AuditLogger.ts` (NEW)

**Purpose**: Simple logger that appends entries to template.auditLog[]

**Interface**:
```typescript
class AuditLogger {
  logOperation(
    templateId: string,
    operation: AuditOperation,
    details: any,
    before?: any,
    after?: any
  ): AuditLogEntry { }

  getAuditLog(templateId: string): AuditLogEntry[] { }
}
```

---

### Step 3: Build TemplateStore (4 hours)
**File**: `packages/core/src/domains/knowledge/TemplateStore.ts` (NEW)

**Purpose**: Unified storage for templates (with embedded items)

**Key Methods**:
```typescript
class TemplateStore {
  private templates: Map<string, Template> = new Map();

  // Template CRUD
  addTemplate(template: Template): void { }
  getTemplate(id: string): Template | undefined { }
  getAllTemplates(): Template[] { }
  deleteTemplate(id: string): void { }

  // Item operations (operate on template.items[])
  addItemToTemplate(templateId: string, item: KnowledgeItem): void { }
  removeItemFromTemplate(templateId: string, itemId: string): void { }
  updateItem(itemId: string, updates: Partial<KnowledgeItem>): void { }
  moveItem(itemId: string, fromTemplateId: string, toTemplateId: string): void { }

  // Calls auditLogger on every operation
}
```

---

### Step 4: Write Unit Tests (2 hours)
**Files**: `packages/core/src/domains/knowledge/__tests__/`

**Test Coverage**:
- TemplateStore CRUD operations
- AuditLogger logging
- Item move/copy between templates
- Audit log queries

---

## 📅 Estimated Timeline

**Phase 1: Core Domain (Week 1)**
- Day 1: Enhance types + Build AuditLogger
- Day 2-3: Build TemplateStore
- Day 4: Build VersionManager
- Day 5: Build TemplateCloner + Unit tests

**Phase 2: Integration (Week 2)**
- Day 1-2: Refactor KnowledgeManager
- Day 3: Enhance TemplateEngine (template markers)
- Day 4: Update KnowledgeMessageHandler
- Day 5: Integration tests

**Phase 3: UI (Week 2-3)**
- Day 1-2: Remove Marketplace tab, add template sections
- Day 3-4: Implement drag-drop
- Day 5: Polish + manual testing

---

## ✅ What NOT to Build

These already exist and work:
- ❌ Timeline event recording (preserve `eventStorage.recordEvent()`)
- ❌ Event provider for timeline (preserve `KnowledgeEventProvider`)
- ❌ File I/O (preserve `KnowledgeFileSystem`)
- ❌ Markdown parsing (preserve existing)
- ❌ Import/export JSON (preserve and enhance)
- ❌ Validation system (just added - preserve)

---

## 🚀 Ready to Start

Begin with **Phase 1, Step 1**: Enhance types in `types.ts`

This is the foundation for everything else. Once types are defined, we can build the new modules one by one.
