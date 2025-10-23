# Implementation Plan: Template Sections V1

**Role**: Senior Software Engineer
**Scope**: Complete refactoring to template-as-sections model
**Timeline**: Estimated 2-3 weeks (stealth mode, no user impact)
**Risk Level**: Medium (major architectural change, but clean slate)

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Data Model Migration](#data-model-migration)
3. [Module Breakdown](#module-breakdown)
4. [Implementation Phases](#implementation-phases)
5. [Testing Strategy](#testing-strategy)
6. [Risk Mitigation](#risk-mitigation)
7. [Rollout Plan](#rollout-plan)

---

## Architecture Overview

### Current Architecture (Before)
```
packages/
├─ core/src/domains/knowledge/
│  ├─ KnowledgeStore.ts              # In-memory storage, items only
│  ├─ MarketplaceManager.ts          # Template management (separate)
│  ├─ TemplateRegistry.ts            # Installation tracking
│  ├─ TemplateInstaller.ts           # Install templates → create items
│  ├─ TemplateEngine.ts              # Inject/remove from claude.md
│  └─ KnowledgeFileSystem.ts         # Markdown file I/O
│
└─ vscode/src/
   ├─ services/KnowledgeManager.ts   # VSCode service layer
   └─ providers/handlers/
      └─ KnowledgeMessageHandler.ts  # Webview message routing
```

**Problem**: Templates and items are separate concerns. Items created from templates lose connection.

### Target Architecture (After)
```
packages/
├─ core/src/domains/knowledge/
│  ├─ TemplateStore.ts                    # NEW: Primary storage (templates + items)
│  ├─ AuditLogger.ts                      # NEW: Audit trail recording
│  ├─ VersionManager.ts                   # NEW: Version checkpoints
│  ├─ TemplateCloner.ts                   # NEW: Shallow cloning logic
│  ├─ InjectionManager.ts                 # REFACTORED: Item + template injection
│  ├─ KnowledgeFileSystem.ts              # Enhanced for templates
│  ├─ types.ts                            # Enhanced with audit types
│  └─ DEPRECATED/
│     ├─ KnowledgeStore.ts                # Items now in templates
│     ├─ MarketplaceManager.ts            # Merged into TemplateStore
│     ├─ TemplateRegistry.ts              # Installation concept removed
│     └─ TemplateInstaller.ts             # No longer needed
│
└─ vscode/src/
   ├─ services/KnowledgeManager.ts        # REFACTORED: Template-first
   └─ providers/handlers/
      └─ KnowledgeMessageHandler.ts       # REFACTORED: New message types
```

**Benefit**: Single source of truth (TemplateStore), templates own items, audit trail built-in.

---

## Data Model Migration

### Step 1: Identify Current Data
```bash
# Current file structure
.agent-brain/
├─ golden-paths/
│  ├─ session-journals.md
│  └─ learning-capture.md
├─ patterns/
│  └─ api-patterns.md
├─ templates/
│  ├─ git-essentials-template.json      # Template without items
│  └─ api-patterns-template.json
└─ marketplace/
   ├─ installed.json                     # Installation registry
   └─ templates/
      └─ bundled.*.json
```

### Step 2: Migration Strategy

#### Option A: Auto-Migration (Recommended)
```typescript
/**
 * On first launch of V1, automatically migrate:
 * 1. Read all knowledge items from type-based directories
 * 2. Group items by template ID (if they have one)
 * 3. Create Template objects with items embedded
 * 4. Create "Ungrouped" template for orphaned items
 * 5. Save as new structure
 * 6. Archive old structure (move to .agent-brain-old/)
 */

async function migrateToV1(): Promise<MigrationResult> {
  // 1. Read existing items
  const existingItems = await readAllKnowledgeItems();

  // 2. Group by template
  const itemsByTemplate = groupBy(existingItems, 'templateId');

  // 3. Read existing template definitions
  const existingTemplates = await readAllTemplates();

  // 4. Merge items into templates
  const v1Templates: Template[] = existingTemplates.map(tmpl => ({
    ...tmpl,
    items: itemsByTemplate[tmpl.id] || [],
    versionHistory: [{
      versionNumber: "1.0",
      description: "Migrated from pre-V1",
      createdAt: new Date(),
      snapshot: {
        items: itemsByTemplate[tmpl.id] || [],
        templateMetadata: {...}
      }
    }],
    auditLog: [{
      id: uuid(),
      timestamp: new Date(),
      operation: AuditOperation.TEMPLATE_CREATED,
      actor: "system",
      details: { comment: "Migrated from pre-V1" }
    }]
  }));

  // 5. Create Ungrouped template for orphans
  const ungroupedItems = existingItems.filter(item => !item.templateId);
  const ungroupedTemplate: Template = {
    id: 'ungrouped',
    name: 'Ungrouped',
    version: '1.0',
    items: ungroupedItems,
    source: 'system',
    // ...
  };

  // 6. Write new structure
  await writeTemplates([...v1Templates, ungroupedTemplate]);

  // 7. Archive old data
  await archiveOldStructure();

  return {
    success: true,
    templatesCreated: v1Templates.length + 1,
    itemsMigrated: existingItems.length,
    orphanedItems: ungroupedItems.length
  };
}
```

#### Option B: Manual Export/Import
```
For stealth users with custom data:
1. Export current knowledge base (JSON)
2. Run migration script offline
3. Import migrated JSON
4. Verify manually
```

### Step 3: New File Structure
```
.agent-brain/
├─ templates/
│  ├─ bundled/
│  │  ├─ git-essentials-v1.0.json       # Full template with items
│  │  └─ claude-essentials-v1.0.json
│  │
│  ├─ user/
│  │  └─ my-api-patterns-v1.3.json
│  │
│  └─ cloned/
│     └─ git-essentials-copy-v1.0.json
│
├─ exports/                              # User exports
│  └─ [exported templates]
│
├─ config.json                           # Workspace settings
├─ migration-log.json                    # Migration record
└─ BACKUP/                               # Archive of old structure
   └─ [old files before migration]
```

---

## Module Breakdown

### 1. Core Domain Layer

#### `TemplateStore.ts` (NEW - 500 lines)
**Responsibilities**:
- Primary data storage for templates
- CRUD operations on templates
- Query/filter templates
- Save/load from file system

```typescript
export class TemplateStore {
  private templates: Map<string, Template> = new Map();
  private auditLogger: AuditLogger;
  private fileSystem: KnowledgeFileSystem;

  async loadTemplates(): Promise<void> { }
  async saveTemplate(template: Template): Promise<void> { }
  async deleteTemplate(id: string): Promise<void> { }

  getTemplate(id: string): Template | undefined { }
  getAllTemplates(): Template[] { }
  getBundledTemplates(): Template[] { }
  getUserTemplates(): Template[] { }

  // Item operations (operate on template.items[])
  async addItemToTemplate(templateId: string, item: KnowledgeItem): Promise<void> { }
  async removeItemFromTemplate(templateId: string, itemId: string): Promise<void> { }
  async updateItem(itemId: string, updates: Partial<KnowledgeItem>): Promise<void> { }
  async moveItem(itemId: string, fromTemplateId: string, toTemplateId: string): Promise<void> { }
  async copyItem(itemId: string, toTemplateId: string): Promise<void> { }

  // Search/filter
  searchItems(query: string): KnowledgeItem[] { }
  filterByType(type: KnowledgeType): KnowledgeItem[] { }
  filterByScope(scope: KnowledgeScope): KnowledgeItem[] { }
}
```

#### `AuditLogger.ts` (NEW - 200 lines)
**Responsibilities**:
- Record all operations
- Append to template audit logs
- Query audit history

```typescript
export class AuditLogger {
  logOperation(
    templateId: string,
    operation: AuditOperation,
    details: AuditDetails,
    before?: any,
    after?: any
  ): void { }

  getAuditLog(templateId: string): AuditLogEntry[] { }
  filterAuditLog(templateId: string, filters: AuditFilters): AuditLogEntry[] { }
  exportAuditLog(templateId: string, format: 'json' | 'csv'): string { }
}
```

#### `VersionManager.ts` (NEW - 150 lines)
**Responsibilities**:
- Create version checkpoints
- Store snapshots
- Restore from version

```typescript
export class VersionManager {
  createVersion(
    templateId: string,
    versionNumber: string,
    description: string
  ): Promise<TemplateVersion> { }

  restoreVersion(
    templateId: string,
    versionNumber: string
  ): Promise<Template> { }

  compareVersions(
    templateId: string,
    version1: string,
    version2: string
  ): VersionDiff { }

  getVersionHistory(templateId: string): TemplateVersion[] { }
}
```

#### `TemplateCloner.ts` (NEW - 100 lines)
**Responsibilities**:
- Clone templates (shallow)
- Generate new IDs
- Create initial audit entry

```typescript
export class TemplateCloner {
  cloneTemplate(
    sourceTemplateId: string,
    options: CloneOptions
  ): Promise<Template> { }

  // Options:
  // - newName: string
  // - includeItems: boolean
  // - preserveMetadata: boolean
}
```

#### `InjectionManager.ts` (REFACTORED - 300 lines)
**Responsibilities**:
- Inject individual items
- Inject entire templates
- Remove injections
- Track injection state

```typescript
export class InjectionManager {
  // Individual item injection
  async injectItem(
    item: KnowledgeItem,
    targetFile: string
  ): Promise<InjectionResult> { }

  // Template injection (all items)
  async injectTemplate(
    template: Template,
    targetFile: string
  ): Promise<InjectionResult> { }

  // Removal
  async removeItem(
    itemId: string,
    targetFile: string
  ): Promise<void> { }

  async removeTemplate(
    templateId: string,
    targetFile: string
  ): Promise<void> { }

  // State queries
  getInjectedItems(filePath: string): KnowledgeItem[] { }
  getInjectedTemplates(filePath: string): Template[] { }
}
```

---

### 2. Service Layer (VSCode)

#### `KnowledgeManager.ts` (REFACTORED - 400 lines)
**Current**:
```typescript
// Manages KnowledgeStore (items) and MarketplaceManager (templates) separately
class KnowledgeManager {
  private store: KnowledgeStore;
  private marketplaceManager: MarketplaceManager;
  // ...
}
```

**After**:
```typescript
// Manages single TemplateStore
class KnowledgeManager {
  private templateStore: TemplateStore;
  private auditLogger: AuditLogger;
  private versionManager: VersionManager;
  private injectionManager: InjectionManager;

  // Template operations
  async createTemplate(metadata: TemplateMetadata): Promise<Template> { }
  async cloneTemplate(templateId: string, options: CloneOptions): Promise<Template> { }
  async deleteTemplate(templateId: string): Promise<void> { }
  async updateTemplateMetadata(templateId: string, updates: any): Promise<void> { }

  // Item operations
  async addItemToTemplate(templateId: string, item: KnowledgeItem): Promise<void> { }
  async updateItem(itemId: string, updates: Partial<KnowledgeItem>): Promise<void> { }
  async deleteItem(itemId: string): Promise<void> { }
  async moveItemBetweenTemplates(itemId: string, toTemplateId: string): Promise<void> { }

  // Injection operations
  async injectItem(itemId: string, targetFile: string): Promise<void> { }
  async injectTemplate(templateId: string, targetFile: string): Promise<void> { }
  async removeInjection(itemId: string, targetFile: string): Promise<void> { }

  // Version operations
  async createVersionCheckpoint(templateId: string, version: string, desc: string): Promise<void> { }
  async restoreVersion(templateId: string, versionNumber: string): Promise<void> { }

  // Query operations
  getAllTemplates(): Template[] { }
  searchItems(query: string): KnowledgeItem[] { }
  getAuditLog(templateId: string): AuditLogEntry[] { }
}
```

---

### 3. Message Protocol (Extension ↔ Webview)

#### New Message Types
```typescript
// Template operations
'template:create'              // Create new template
'template:clone'               // Clone existing template
'template:delete'              // Delete template
'template:update-metadata'     // Edit name, description, etc.
'template:export'              // Export to JSON
'template:import'              // Import from JSON

// Item operations
'item:add-to-template'         // Add new item to template
'item:update'                  // Edit item (inline or modal)
'item:delete'                  // Delete item from template
'item:move'                    // Move item between templates
'item:copy'                    // Copy item to another template

// Injection operations
'inject:item'                  // Inject single item
'inject:template'              // Inject entire template
'inject:remove-item'           // Remove item injection
'inject:remove-template'       // Remove template injection

// Version operations
'version:create'               // Create version checkpoint
'version:restore'              // Restore from version
'version:compare'              // Compare two versions

// Audit operations
'audit:get-log'                // Fetch audit log
'audit:export-log'             // Export audit log

// Query operations
'query:get-templates'          // Fetch all templates
'query:search-items'           // Search items
'query:get-metadata'           // Get item metadata
```

---

## Implementation Phases

### Phase 1: Core Domain Layer (Week 1)
**Goal**: Build new data structures and core logic

#### Tasks:
1. **Define Types** (2 days)
   - [ ] Create `Template` interface with audit log
   - [ ] Create `TemplateVersion` interface
   - [ ] Create `AuditLogEntry` and `AuditOperation` enum
   - [ ] Update `KnowledgeItem` with injection tracking
   - [ ] Create migration types

2. **Build TemplateStore** (2 days)
   - [ ] Implement in-memory storage (Map)
   - [ ] Implement CRUD operations
   - [ ] Implement item operations (add, remove, update, move, copy)
   - [ ] Implement query/filter methods
   - [ ] Add validation logic

3. **Build AuditLogger** (1 day)
   - [ ] Implement log recording
   - [ ] Implement log querying
   - [ ] Implement log filtering
   - [ ] Add export functionality

4. **Build VersionManager** (2 days)
   - [ ] Implement version creation (deep snapshot)
   - [ ] Implement version restoration
   - [ ] Implement version comparison
   - [ ] Add version metadata

5. **Build TemplateCloner** (1 day)
   - [ ] Implement shallow cloning
   - [ ] Generate new IDs for clones
   - [ ] Copy items with new IDs
   - [ ] Create initial audit entry

6. **Refactor InjectionManager** (2 days)
   - [ ] Add template-level injection
   - [ ] Update markers (template vs item)
   - [ ] Implement removal logic
   - [ ] Update injection tracking

**Deliverables**:
- Core domain layer complete
- Unit tests for all modules (>80% coverage)
- No UI dependencies

---

### Phase 2: File System & Persistence (Week 1-2)
**Goal**: Integrate with file system, implement migration

#### Tasks:
1. **Enhance KnowledgeFileSystem** (2 days)
   - [ ] Update to save templates (not separate items)
   - [ ] Implement template JSON serialization
   - [ ] Add audit log persistence
   - [ ] Add version history persistence

2. **Build Migration System** (3 days)
   - [ ] Write migration detection logic
   - [ ] Implement auto-migration function
   - [ ] Test migration with sample data
   - [ ] Add rollback capability
   - [ ] Create migration report

3. **Update Import/Export** (2 days)
   - [ ] Enhance export to include audit/versions
   - [ ] Update import to handle V1 format
   - [ ] Add validation on import
   - [ ] Support legacy format import (optional)

**Deliverables**:
- Templates saved as single JSON files
- Migration script tested
- Import/export working with V1 format

---

### Phase 3: Service Layer Integration (Week 2)
**Goal**: Update VSCode service layer

#### Tasks:
1. **Refactor KnowledgeManager** (3 days)
   - [ ] Replace KnowledgeStore with TemplateStore
   - [ ] Remove MarketplaceManager dependency
   - [ ] Update all methods to use TemplateStore
   - [ ] Add audit logging to operations
   - [ ] Add version management methods
   - [ ] Add timeline event recording

2. **Update KnowledgeMessageHandler** (2 days)
   - [ ] Add new message handlers
   - [ ] Update existing handlers for new model
   - [ ] Remove deprecated handlers
   - [ ] Add error handling
   - [ ] Add progress notifications

3. **Update File Watcher** (1 day)
   - [ ] Watch template files instead of type directories
   - [ ] Reload templates on file change
   - [ ] Debounce reload (200ms)

**Deliverables**:
- Service layer fully integrated
- Extension backend functional
- No UI changes yet

---

### Phase 4: UI Implementation (Week 2-3)
**Goal**: Implement new UI with template sections

#### Tasks:
1. **Update Knowledge Tab HTML** (2 days)
   - [ ] Remove Marketplace tab
   - [ ] Update table to show template sections
   - [ ] Add Import button
   - [ ] Add Create Template button
   - [ ] Add action buttons per template section
   - [ ] Add [💉] button to each item row

2. **Implement Template Section UI** (3 days)
   - [ ] Collapsible template sections
   - [ ] Template header with actions
   - [ ] Item rows within sections
   - [ ] Drop zones for drag-drop
   - [ ] Visual feedback (hover, active states)

3. **Implement Modals** (3 days)
   - [ ] Import Template modal (marketplace browser)
   - [ ] Create Template modal
   - [ ] Clone Template modal
   - [ ] Edit Item modal (enhanced)
   - [ ] Inject Item/Template file picker
   - [ ] Version Checkpoint modal
   - [ ] Audit History modal

4. **Implement Drag-Drop** (2 days)
   - [ ] Drag item event handlers
   - [ ] Drop zone highlighting
   - [ ] Ctrl modifier for copy detection
   - [ ] Visual feedback (ghost element)
   - [ ] Move/copy operations on drop

5. **Implement Inline Editing** (2 days)
   - [ ] Click [📝] → inline edit mode
   - [ ] Editable fields (title, type, scope, tags)
   - [ ] Save/cancel buttons
   - [ ] Validation
   - [ ] Auto-save on blur (optional)

6. **Update Action Buttons** (1 day)
   - [ ] [💉] Inject item → file picker → inject
   - [ ] [📦] Inject template → file picker → inject
   - [ ] [📋] Clone → modal → create clone
   - [ ] [💾] Version → modal → create checkpoint
   - [ ] [📊] History → modal → show audit log
   - [ ] [✏️] Edit metadata → modal
   - [ ] [🗑️] Delete → confirm → delete

**Deliverables**:
- Complete UI overhaul
- All interactions functional
- Visual polish (animations, transitions)

---

### Phase 5: Timeline Integration (Week 3)
**Goal**: Record injection events, show in timeline

#### Tasks:
1. **Update Timeline Event Types** (1 day)
   - [ ] Add `knowledge_item_injected` event type
   - [ ] Add `knowledge_item_removed` event type
   - [ ] Add `template_injected` event type
   - [ ] Add `template_removed` event type

2. **Record Events on Injection** (1 day)
   - [ ] Call recordTimelineEvent() in InjectionManager
   - [ ] Include metadata (file, template, item)
   - [ ] Format event descriptions

3. **Timeline Rendering** (1 day)
   - [ ] Add icons for knowledge events
   - [ ] Format event popups
   - [ ] Add filters for knowledge events

**Deliverables**:
- Timeline shows injection/removal events
- Events are filterable
- Events link back to knowledge items

---

### Phase 6: Testing & Polish (Week 3)
**Goal**: Comprehensive testing, bug fixes, polish

#### Tasks:
1. **Unit Tests** (2 days)
   - [ ] TemplateStore tests (CRUD, queries)
   - [ ] AuditLogger tests
   - [ ] VersionManager tests (snapshots, restore)
   - [ ] TemplateCloner tests
   - [ ] InjectionManager tests

2. **Integration Tests** (2 days)
   - [ ] End-to-end template creation flow
   - [ ] End-to-end cloning flow
   - [ ] End-to-end injection flow
   - [ ] Migration testing
   - [ ] Import/export testing

3. **UI Testing** (2 days)
   - [ ] Manual testing of all interactions
   - [ ] Drag-drop edge cases
   - [ ] Modal workflows
   - [ ] Keyboard navigation
   - [ ] Error states

4. **Performance Testing** (1 day)
   - [ ] Load 100 templates (500+ items)
   - [ ] Test search performance
   - [ ] Test audit log performance
   - [ ] Optimize if needed

5. **Polish** (1 day)
   - [ ] Smooth animations
   - [ ] Loading states
   - [ ] Error messages
   - [ ] Success notifications
   - [ ] Keyboard shortcuts

**Deliverables**:
- All tests passing
- Performance acceptable
- UI polished
- Ready for internal use

---

## Testing Strategy

### 1. Unit Tests (Jest)
```typescript
// Example: TemplateStore.test.ts
describe('TemplateStore', () => {
  let store: TemplateStore;

  beforeEach(() => {
    store = new TemplateStore(mockFileSystem, mockAuditLogger);
  });

  describe('addItemToTemplate', () => {
    it('should add item to template.items[]', async () => {
      const item = createMockItem();
      await store.addItemToTemplate('template-123', item);

      const template = store.getTemplate('template-123');
      expect(template.items).toContainEqual(item);
    });

    it('should record audit log entry', async () => {
      const item = createMockItem();
      await store.addItemToTemplate('template-123', item);

      const log = store.getAuditLog('template-123');
      expect(log).toContainEqual(
        expect.objectContaining({
          operation: AuditOperation.ITEM_ADDED,
          details: expect.objectContaining({ itemId: item.id })
        })
      );
    });

    it('should update template.updatedAt', async () => {
      const before = store.getTemplate('template-123').updatedAt;
      await store.addItemToTemplate('template-123', createMockItem());
      const after = store.getTemplate('template-123').updatedAt;

      expect(after.getTime()).toBeGreaterThan(before.getTime());
    });
  });

  // ... more tests
});
```

### 2. Integration Tests
```typescript
// Example: end-to-end template cloning
describe('Template Cloning Flow', () => {
  it('should clone template with all items', async () => {
    // 1. Create original template with items
    const original = await knowledgeManager.createTemplate({
      name: 'Original',
      description: 'Test template'
    });
    await knowledgeManager.addItemToTemplate(original.id, createMockItem());

    // 2. Clone it
    const cloned = await knowledgeManager.cloneTemplate(original.id, {
      newName: 'Cloned'
    });

    // 3. Verify clone
    expect(cloned.id).not.toBe(original.id);
    expect(cloned.name).toBe('Cloned');
    expect(cloned.items.length).toBe(original.items.length);
    expect(cloned.items[0].id).not.toBe(original.items[0].id); // New IDs
    expect(cloned.sourceTemplateId).toBe(original.id);

    // 4. Verify audit log
    const log = cloned.auditLog;
    expect(log[0].operation).toBe(AuditOperation.TEMPLATE_CLONED);
  });
});
```

### 3. UI Tests (Manual + Playwright)
```typescript
// Example: Playwright test for drag-drop
test('should move item between templates via drag-drop', async ({ page }) => {
  await page.goto('/knowledge');

  // Expand both templates
  await page.click('text=Template A');
  await page.click('text=Template B');

  // Drag item from Template A
  const item = page.locator('text=Test Item');
  await item.dragTo(page.locator('text=Drop items here', { hasText: 'Template B' }));

  // Verify item moved
  await expect(page.locator('text=Template B').locator('text=Test Item')).toBeVisible();
  await expect(page.locator('text=Template A').locator('text=Test Item')).not.toBeVisible();
});
```

---

## Risk Mitigation

### Risk 1: Data Loss During Migration
**Probability**: Low
**Impact**: Critical

**Mitigation**:
- ✅ Archive old data before migration (`.agent-brain-old/`)
- ✅ Migration creates backup copy
- ✅ Rollback capability if migration fails
- ✅ Migration report with verification
- ✅ Test migration on sample data first

### Risk 2: Performance with Large Templates
**Probability**: Medium
**Impact**: Medium

**Mitigation**:
- ✅ Lazy loading of audit logs (load on demand)
- ✅ Pagination in audit history modal
- ✅ Index templates by ID (Map instead of Array)
- ✅ Virtual scrolling for large item lists
- ✅ Performance test with 100+ templates

### Risk 3: Audit Log Growth
**Probability**: High
**Impact**: Low

**Mitigation**:
- ✅ Configurable audit log retention (default: 90 days)
- ✅ Optional: Move old logs to separate archive files
- ✅ Audit log export for backup
- ✅ Compress audit logs in JSON (gzip)

### Risk 4: Complex Drag-Drop Bugs
**Probability**: High
**Impact**: Medium

**Mitigation**:
- ✅ Comprehensive edge case testing
- ✅ Visual feedback for all states
- ✅ Undo/redo for move operations (future)
- ✅ Confirm dialog for destructive moves
- ✅ Log all drag-drop operations in audit trail

### Risk 5: Version Snapshots Size
**Probability**: Medium
**Impact**: Low

**Mitigation**:
- ✅ Only store snapshots on user request (not auto)
- ✅ Compress snapshots in JSON
- ✅ Limit to last 10 versions (configurable)
- ✅ Option to delete old versions

---

## Rollout Plan

### Week 1: Internal Testing
- Deploy to dev environment
- Test all features manually
- Fix critical bugs
- Gather feedback from team

### Week 2: Stealth User Testing
- Deploy to production (stealth mode)
- No public announcement
- Monitor logs for errors
- Collect usage metrics

### Week 3: Stabilization
- Fix reported bugs
- Performance optimizations
- Polish based on feedback
- Documentation updates

### Week 4+: Future Enhancements
- Keyboard shortcuts
- Undo/redo system
- Template marketplace (online)
- Collaborative editing
- Template dependencies
- Smart templates (AI-assisted)

---

## Success Metrics

### Functional Metrics
- ✅ All existing features working
- ✅ No data loss in migration
- ✅ All tests passing (>80% coverage)
- ✅ No critical bugs in production

### Performance Metrics
- ✅ Template load time < 100ms (100 templates)
- ✅ Search response time < 50ms
- ✅ Injection time < 200ms
- ✅ Audit log query < 100ms (1000 entries)

### User Experience Metrics
- ✅ Template creation < 10 seconds
- ✅ Item injection < 5 clicks
- ✅ Drag-drop feels instant (< 50ms)
- ✅ No confusing error messages

---

## Developer Checklist

### Phase 1: Core Domain ✅
- [ ] All TypeScript interfaces defined
- [ ] TemplateStore implemented
- [ ] AuditLogger implemented
- [ ] VersionManager implemented
- [ ] TemplateCloner implemented
- [ ] InjectionManager refactored
- [ ] Unit tests >80% coverage

### Phase 2: Persistence ✅
- [ ] File system integration complete
- [ ] Migration system tested
- [ ] Import/export working
- [ ] Rollback mechanism tested

### Phase 3: Service Layer ✅
- [ ] KnowledgeManager refactored
- [ ] Message handlers updated
- [ ] File watcher updated
- [ ] Integration tests passing

### Phase 4: UI ✅
- [ ] Template sections rendering
- [ ] All modals implemented
- [ ] Drag-drop working
- [ ] Inline editing working
- [ ] All buttons functional

### Phase 5: Timeline ✅
- [ ] Events recorded
- [ ] Events displayed
- [ ] Events filterable

### Phase 6: Testing & Polish ✅
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Manual testing complete
- [ ] Performance acceptable
- [ ] UI polished

---

## Conclusion

This implementation plan provides a comprehensive roadmap for refactoring to the template-as-sections model. Key points:

1. **Clean Slate**: No backwards compatibility → Optimal design
2. **Phased Approach**: Incremental implementation reduces risk
3. **Testing First**: Unit tests before UI ensures reliability
4. **Migration Safety**: Automatic migration with backup/rollback
5. **Audit Trail**: Built-in from day 1 for accountability
6. **Timeline Integration**: Knowledge usage visible in timeline

**Estimated Timeline**: 2-3 weeks with one developer
**Risk Level**: Medium (major refactor, but clean slate helps)
**Reward**: Much better UX, simpler codebase, audit trail, versioning

Ready to start Phase 1?
