# V1 Template Sections - Missing Features Checklist

**Created**: 2025-10-24
**Priority Order**: Critical → High → Medium → Low
**Organized by**: Implementation complexity and user impact

---

## Phase 1: Critical Removals (30 minutes)
**Impact**: HIGH - Removes confusing old UI elements
**Complexity**: LOW - Simple deletions

### ❌ 1.1 Remove Marketplace Tab Button
- **File**: `packages/core/src/domains/visualization/templates/timeline.html`
- **Lines to Delete**: 37-42
- **Code to Remove**:
  ```html
  <button class="tab-button" data-tab="marketplace" aria-label="Template Marketplace view" aria-selected="false">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="flex-shrink: 0;">
          <path d="M2 2h12l1 3v8c0 .55-.45 1-1 1H2c-.55 0-1-.45-1-1V5l1-3zm1.4 1l-.6 1.8h10.4L12.6 3H3.4zM2 6v7h12V6H2zm3 2h6v1H5V8z"/>
      </svg>
      AB Marketplace
  </button>
  ```
- **Testing**: Verify tab navigation no longer shows marketplace

### ❌ 1.2 Remove Marketplace Tab Content
- **File**: `packages/core/src/domains/visualization/templates/timeline.html`
- **Lines to Delete**: 423-434
- **Code to Remove**:
  ```html
  <div id="tab-marketplace" class="tab-content" aria-hidden="true">
      <div id="marketplace-content">
          <!-- Will be populated by MarketplaceController -->
          <div class="marketplace-loading" style="padding: 40px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">🏪</div>
              <div style="font-size: 16px; color: var(--vscode-descriptionForeground);">
                  Loading marketplace...
              </div>
          </div>
      </div>
  </div>
  ```
- **Testing**: Verify no errors when switching tabs

### ❌ 1.3 Remove Template Controls Section
- **File**: `packages/core/src/domains/visualization/templates/timeline.html`
- **Lines to Delete**: 190-205
- **Code to Remove**:
  ```html
  <div class="template-controls">
      <div class="template-selection">
          <label for="template-selector">Template:</label>
          <select id="template-selector">
              <option value="">Select template...</option>
          </select>
      </div>
      <div class="template-actions">
          <button id="save-template" class="secondary-button ab-btn-secondary" disabled title="Save selected items as a new template or update existing template">💾 Save Template</button>
          <button id="apply-selected" class="primary-button ab-btn-primary" disabled title="Apply selected knowledge items directly to focused claude.md file">➕ Apply Items</button>
          <button id="apply-template" class="primary-button ab-btn-primary" disabled title="Apply the selected template to focused claude.md file">📋 Apply Template</button>
          <button id="publish-template" class="secondary-button ab-btn-secondary" disabled title="Publish template to marketplace">🚀 Publish</button>
          <button id="delete-template" class="secondary-button ab-btn-danger" disabled title="Delete selected template from project">🗑️ Delete</button>
      </div>
  </div>
  ```
- **Testing**: Verify knowledge tab renders without errors

---

## Phase 2: Critical Additions - Buttons (2 hours)
**Impact**: HIGH - Enables core V1 functionality
**Complexity**: MEDIUM - Requires UI + callback wiring

### ❌ 2.1 Add Import Button to Toolbar
- **File**: `packages/core/src/domains/visualization/templates/timeline.html`
- **Location**: Line 156 (after refresh button, before create template)
- **Code to Add**:
  ```html
  <button id="import-template" class="secondary-button ab-btn-secondary" title="Import a template from JSON">📦 Import</button>
  ```
- **Wire in**: `KnowledgeViewController.ts` - Add click listener
- **Callback**: `this.v1FormController.showImportTemplateModal()`
- **Testing**: Click button, verify modal appears

### ❌ 2.2 Add Inject Template Button to Template Headers
- **File**: `packages/core/src/domains/visualization/ui/knowledge/V1TemplatesTableController.ts`
- **Location**: Line 136 (after clone button, before audit-log)
- **Code to Add**:
  ```html
  <button class="action-btn" data-action="inject-template" data-template-id="${template.id}" title="Inject template to file">📦</button>
  ```
- **Handler**: Add case in `handleTemplateAction()`:
  ```typescript
  case 'inject-template':
    this.callbacks.onInjectTemplate(templateId);
    break;
  ```
- **Callback Interface**: Add to `V1TemplatesTableCallbacks`:
  ```typescript
  onInjectTemplate: (templateId: string) => void;
  ```
- **Wire in**: `KnowledgeViewController.ts` - Add handler method
- **Testing**: Click button, verify file picker appears

### ❌ 2.3 Add Export Button to Template Headers
- **File**: `packages/core/src/domains/visualization/ui/knowledge/V1TemplatesTableController.ts`
- **Location**: Line 137 (after inject-template, before edit)
- **Code to Add**:
  ```html
  <button class="action-btn" data-action="export" data-template-id="${template.id}" title="Export template to JSON">📤</button>
  ```
- **Handler**: Add case in `handleTemplateAction()`:
  ```typescript
  case 'export':
    this.callbacks.onExportTemplate(templateId);
    break;
  ```
- **Callback Interface**: Add to `V1TemplatesTableCallbacks`:
  ```typescript
  onExportTemplate: (templateId: string) => void;
  ```
- **Wire in**: `KnowledgeViewController.ts` - Add handler method
- **Testing**: Click button, verify export notification

### ❌ 2.4 Add Inline Edit Button to Item Rows
- **File**: `packages/core/src/domains/visualization/ui/knowledge/V1TemplatesTableController.ts`
- **Location**: Line 187 (before modal edit button)
- **Code to Add**:
  ```html
  <button class="action-btn" data-action="edit-inline" data-template-id="${templateId}" data-item-id="${item.id}" title="Edit item inline">📝</button>
  ```
- **Handler**: Add case in `handleItemAction()`:
  ```typescript
  case 'edit-inline':
    this.callbacks.onEditItemInline(templateId, itemId);
    break;
  ```
- **Callback Interface**: Add to `V1TemplatesTableCallbacks`:
  ```typescript
  onEditItemInline: (templateId: string, itemId: string) => void;
  ```
- **Wire in**: `KnowledgeViewController.ts` - Add handler method
- **Testing**: Click button, verify row becomes editable

### ❌ 2.5 Add Inject Item Button to Item Rows
- **File**: `packages/core/src/domains/visualization/ui/knowledge/V1TemplatesTableController.ts`
- **Location**: Line 188 (before edit button)
- **Code to Add**:
  ```html
  <button class="action-btn" data-action="inject-item" data-template-id="${templateId}" data-item-id="${item.id}" title="Inject item to file">💉</button>
  ```
- **Handler**: Add case in `handleItemAction()`:
  ```typescript
  case 'inject-item':
    this.callbacks.onInjectItem(templateId, itemId);
    break;
  ```
- **Callback Interface**: Add to `V1TemplatesTableCallbacks`:
  ```typescript
  onInjectItem: (templateId: string, itemId: string) => void;
  ```
- **Wire in**: `KnowledgeViewController.ts` - Add handler method
- **Testing**: Click button, verify file picker appears

---

## Phase 3: Backend Message Handlers (3 hours)
**Impact**: HIGH - Makes buttons functional
**Complexity**: MEDIUM - Requires extension-side implementation

### ❌ 3.1 Import Template Handler
- **Frontend**: `KnowledgeViewController.ts` - `handleImportTemplate()`
  - Show file picker (HTML `<input type="file" accept=".json">`)
  - Read file content
  - Parse JSON
  - Send message: `{ type: 'v1:import-template', payload: { templateJson } }`
- **Backend**: `KnowledgeMessageHandler.ts` - `handleV1ImportTemplate()`
  - Validate template structure
  - Call `knowledgeManager.importTemplate(template)`
  - Send success/error response
- **Testing**: Import valid JSON, verify template appears

### ❌ 3.2 Inject Template Handler
- **Frontend**: `KnowledgeViewController.ts` - `handleInjectTemplate(templateId)`
  - Get focused claude.md file from state
  - Send message: `{ type: 'v1:inject-template', payload: { templateId, filePath } }`
- **Backend**: `KnowledgeMessageHandler.ts` - `handleV1InjectTemplate()`
  - Get template from store
  - Call `injectionManager.injectTemplate(template, filePath)`
  - Record timeline event
  - Send success/error response
- **Testing**: Inject template, verify items appear in claude.md

### ❌ 3.3 Export Template Handler
- **Frontend**: `KnowledgeViewController.ts` - `handleExportTemplate(templateId)`
  - Send message: `{ type: 'v1:export-template', payload: { templateId } }`
- **Backend**: `KnowledgeMessageHandler.ts` - `handleV1ExportTemplate()`
  - Get template from store
  - Serialize to JSON
  - Save to `.agent-brain/exports/`
  - Send file path in response
- **Testing**: Export template, verify JSON file created

### ❌ 3.4 Inject Item Handler
- **Frontend**: `KnowledgeViewController.ts` - `handleInjectItem(templateId, itemId)`
  - Get focused claude.md file from state
  - Send message: `{ type: 'v1:inject-item', payload: { templateId, itemId, filePath } }`
- **Backend**: `KnowledgeMessageHandler.ts` - `handleV1InjectItem()`
  - Get item from template
  - Call `injectionManager.injectItem(item, filePath)`
  - Record timeline event
  - Send success/error response
- **Testing**: Inject item, verify appears in claude.md

### ❌ 3.5 Edit Item Inline Handler (Partial - UI only for now)
- **Frontend**: `KnowledgeViewController.ts` - `handleEditItemInline(templateId, itemId)`
  - Call `v1TemplatesTableController.toggleInlineEdit(templateId, itemId)`
  - Controller toggles row to editing mode (shows input fields)
  - User edits, clicks save
  - Send message: `{ type: 'v1:update-item', payload: { templateId, itemId, updates } }`
- **Backend**: Already exists from Phase 4
- **Testing**: Toggle inline edit, make changes, save

---

## Phase 4: Inline Editing Mode (3 hours)
**Impact**: MEDIUM - Nice UX improvement
**Complexity**: HIGH - Requires dynamic row manipulation

### ❌ 4.1 Add Inline Edit State Management
- **File**: `V1TemplatesTableController.ts`
- **Add Property**:
  ```typescript
  private inlineEditingItem: { templateId: string; itemId: string } | null = null;
  ```
- **Add Method**:
  ```typescript
  toggleInlineEdit(templateId: string, itemId: string): void {
    if (this.inlineEditingItem?.itemId === itemId) {
      this.inlineEditingItem = null; // Cancel editing
    } else {
      this.inlineEditingItem = { templateId, itemId }; // Start editing
    }
    this.render(this.templates);
  }
  ```

### ❌ 4.2 Render Editable Row
- **File**: `V1TemplatesTableController.ts`
- **Update**: `createItemRow()` method
- **Logic**:
  ```typescript
  const isEditing = this.inlineEditingItem?.templateId === templateId &&
                    this.inlineEditingItem?.itemId === item.id;

  if (isEditing) {
    return this.createEditableItemRow(templateId, item);
  } else {
    return this.createReadOnlyItemRow(templateId, item);
  }
  ```

### ❌ 4.3 Create Editable Row Template
- **File**: `V1TemplatesTableController.ts`
- **Add Method**: `createEditableItemRow(templateId, item)`
- **HTML Structure**:
  ```html
  <td class="col-type">
    <select id="edit-type-${item.id}">
      <option value="golden-path" ${item.type === 'golden-path' ? 'selected' : ''}>Golden Path</option>
      <!-- All knowledge types -->
    </select>
  </td>
  <td class="col-title">
    <input type="text" id="edit-title-${item.id}" value="${item.title}" />
  </td>
  <td class="col-scope">
    <select id="edit-scope-${item.id}">
      <option value="personal" ${item.scope === 'personal' ? 'selected' : ''}>Personal</option>
      <!-- All scopes -->
    </select>
  </td>
  <td class="col-tags">
    <input type="text" id="edit-tags-${item.id}" value="${item.tags?.join(', ')}" placeholder="tag1, tag2" />
  </td>
  <td class="col-source">
    ${item.source || '-'}
  </td>
  <td class="col-actions">
    <button class="action-btn" data-action="save-edit">💾</button>
    <button class="action-btn" data-action="cancel-edit">❌</button>
  </td>
  ```

### ❌ 4.4 Wire Save/Cancel
- **File**: `V1TemplatesTableController.ts`
- **Save Button Handler**:
  ```typescript
  case 'save-edit':
    const updates = {
      type: document.getElementById(`edit-type-${itemId}`).value,
      title: document.getElementById(`edit-title-${itemId}`).value,
      scope: document.getElementById(`edit-scope-${itemId}`).value,
      tags: document.getElementById(`edit-tags-${itemId}`).value.split(',').map(t => t.trim())
    };
    this.callbacks.onUpdateItem(templateId, itemId, updates);
    this.inlineEditingItem = null;
    break;
  ```
- **Cancel Button Handler**:
  ```typescript
  case 'cancel-edit':
    this.inlineEditingItem = null;
    this.render(this.templates);
    break;
  ```

---

## Phase 5: Drag-Drop System (6 hours)
**Impact**: MEDIUM - Advanced UX feature
**Complexity**: HIGH - Complex event handling

### ❌ 5.1 Make Item Rows Draggable
- **File**: `V1TemplatesTableController.ts`
- **Update**: `createItemRow()` method
- **Add Attribute**:
  ```html
  <tr class="template-item-row" draggable="true" data-template-id="${templateId}" data-item-id="${item.id}">
  ```
- **Add Event Listeners**:
  ```typescript
  row.addEventListener('dragstart', (e) => this.handleDragStart(e, templateId, item.id));
  row.addEventListener('dragend', (e) => this.handleDragEnd(e));
  ```

### ❌ 5.2 Add Drop Zones to Template Sections
- **File**: `V1TemplatesTableController.ts`
- **Update**: `createTemplateHeaderRow()` method
- **Add Drop Zone Row** (after header, before items):
  ```html
  <tr class="template-drop-zone" data-template-id="${template.id}">
    <td colspan="7" class="drop-zone-cell">
      <div class="drop-zone-indicator">Drop items here to add to template</div>
    </td>
  </tr>
  ```
- **Add Event Listeners**:
  ```typescript
  dropZone.addEventListener('dragover', (e) => this.handleDragOver(e, template.id));
  dropZone.addEventListener('drop', (e) => this.handleDrop(e, template.id));
  dropZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
  ```

### ❌ 5.3 Implement Drag Event Handlers
- **File**: `V1TemplatesTableController.ts`
- **Add Methods**:
  ```typescript
  private draggedItem: { templateId: string; itemId: string } | null = null;

  private handleDragStart(e: DragEvent, templateId: string, itemId: string): void {
    this.draggedItem = { templateId, itemId };
    e.dataTransfer!.effectAllowed = 'move';
    e.dataTransfer!.setData('text/plain', itemId);
    (e.currentTarget as HTMLElement).classList.add('dragging');
  }

  private handleDragEnd(e: DragEvent): void {
    (e.currentTarget as HTMLElement).classList.remove('dragging');
    this.clearDropZoneHighlights();
  }

  private handleDragOver(e: DragEvent, targetTemplateId: string): void {
    e.preventDefault();
    e.dataTransfer!.dropEffect = e.ctrlKey ? 'copy' : 'move';
    (e.currentTarget as HTMLElement).classList.add('drop-zone-active');
  }

  private handleDragLeave(e: DragEvent): void {
    (e.currentTarget as HTMLElement).classList.remove('drop-zone-active');
  }

  private handleDrop(e: DragEvent, targetTemplateId: string): void {
    e.preventDefault();
    if (!this.draggedItem) return;

    const isCopy = e.ctrlKey;
    const { templateId: sourceTemplateId, itemId } = this.draggedItem;

    if (sourceTemplateId === targetTemplateId && !isCopy) {
      // Same template, no-op
      return;
    }

    if (isCopy) {
      this.callbacks.onCopyItem(itemId, sourceTemplateId, targetTemplateId);
    } else {
      this.callbacks.onMoveItem(itemId, sourceTemplateId, targetTemplateId);
    }

    this.clearDropZoneHighlights();
    this.draggedItem = null;
  }

  private clearDropZoneHighlights(): void {
    document.querySelectorAll('.drop-zone-active').forEach(el => {
      el.classList.remove('drop-zone-active');
    });
  }
  ```

### ❌ 5.4 Add Copy/Move Callbacks
- **File**: `V1TemplatesTableController.ts`
- **Update Interface**:
  ```typescript
  export interface V1TemplatesTableCallbacks {
    // ... existing
    onMoveItem: (itemId: string, fromTemplateId: string, toTemplateId: string) => void;
    onCopyItem: (itemId: string, fromTemplateId: string, toTemplateId: string) => void;
  }
  ```

### ❌ 5.5 Add Drag-Drop Styles
- **File**: `packages/core/src/domains/visualization/styles/components/knowledge.css`
- **Add Styles**:
  ```css
  /* Draggable item */
  .template-item-row[draggable="true"] {
    cursor: move;
  }

  .template-item-row.dragging {
    opacity: 0.5;
    background: var(--vscode-list-activeSelectionBackground);
  }

  /* Drop zone */
  .template-drop-zone {
    display: none; /* Hidden by default */
  }

  .template-drop-zone.drop-zone-active {
    display: table-row;
  }

  .drop-zone-cell {
    padding: 20px;
    text-align: center;
    background: var(--vscode-editor-background);
    border: 2px dashed var(--vscode-textLink-activeForeground);
    border-radius: 4px;
  }

  .drop-zone-indicator {
    color: var(--vscode-textLink-activeForeground);
    font-weight: 600;
    font-size: 14px;
  }
  ```

### ❌ 5.6 Backend Handlers for Move/Copy
- **Frontend**: `KnowledgeViewController.ts`
  - `handleMoveItem(itemId, fromTemplateId, toTemplateId)` → Send `v1:move-item`
  - `handleCopyItem(itemId, fromTemplateId, toTemplateId)` → Send `v1:copy-item`
- **Backend**: `KnowledgeMessageHandler.ts`
  - `handleV1MoveItem()` → Call `templateStore.moveItem()`
  - `handleV1CopyItem()` → Call `templateStore.copyItem()`

---

## Phase 6: Polish & Testing (2 hours)
**Impact**: MEDIUM - Professional finish
**Complexity**: LOW - CSS and testing

### ❌ 6.1 Update Button Styles
- **File**: `knowledge.css`
- **Add Styles** for new buttons:
  ```css
  .action-btn[data-action="inject-template"],
  .action-btn[data-action="inject-item"] {
    color: var(--vscode-charts-green);
  }

  .action-btn[data-action="export"] {
    color: var(--vscode-charts-blue);
  }

  .action-btn[data-action="edit-inline"] {
    color: var(--vscode-charts-yellow);
  }
  ```

### ❌ 6.2 Add Loading States
- **File**: `KnowledgeViewController.ts`
- **Pattern**: Before async operations, show loading indicator
  ```typescript
  this.notificationManager.show('Injecting template...', 'info');
  // ... operation
  this.notificationManager.show('Template injected successfully!', 'success');
  ```

### ❌ 6.3 Add Error Handling
- **File**: `KnowledgeViewController.ts`
- **Pattern**: Wrap message handlers in try-catch
  ```typescript
  try {
    await this.handleInjectTemplate(templateId);
  } catch (error) {
    this.notificationManager.show(`Failed to inject template: ${error.message}`, 'error');
  }
  ```

### ❌ 6.4 Update Status Bar Messages
- **File**: `KnowledgeViewController.ts`
- **Update**: Status bar on template operations
  ```typescript
  this.updateStatusBar(`Template "${template.name}" injected to ${filePath}`);
  ```

### ❌ 6.5 End-to-End Testing
- **Test Cases**:
  1. ✅ Create template → Verify appears in table
  2. ✅ Add item to template → Verify appears nested
  3. ✅ Expand/collapse template → Verify items show/hide
  4. ✅ Clone template → Verify clone appears
  5. ✅ Delete template → Verify removed
  6. ✅ Edit item inline → Verify changes saved
  7. ✅ Inject item → Verify appears in claude.md
  8. ✅ Inject template → Verify all items appear
  9. ✅ Export template → Verify JSON file created
  10. ✅ Import template → Verify template appears
  11. ✅ Drag item to different template → Verify moved
  12. ✅ Ctrl+drag item → Verify copied
  13. ✅ View audit log → Verify operations recorded
  14. ✅ Create version → Verify snapshot created

---

## Summary Checklist

### Phase 1: Critical Removals ✅
- [ ] Remove marketplace tab button
- [ ] Remove marketplace tab content
- [ ] Remove template controls section

### Phase 2: Critical Additions - Buttons ✅
- [ ] Add import button to toolbar
- [ ] Add inject template button to template headers
- [ ] Add export button to template headers
- [ ] Add inline edit button to item rows
- [ ] Add inject item button to item rows

### Phase 3: Backend Message Handlers ✅
- [ ] Import template handler (frontend + backend)
- [ ] Inject template handler (frontend + backend)
- [ ] Export template handler (frontend + backend)
- [ ] Inject item handler (frontend + backend)
- [ ] Edit item inline handler (UI only)

### Phase 4: Inline Editing Mode ✅
- [ ] Add inline edit state management
- [ ] Render editable row
- [ ] Create editable row template
- [ ] Wire save/cancel

### Phase 5: Drag-Drop System ✅
- [ ] Make item rows draggable
- [ ] Add drop zones to template sections
- [ ] Implement drag event handlers
- [ ] Add copy/move callbacks
- [ ] Add drag-drop styles
- [ ] Backend handlers for move/copy

### Phase 6: Polish & Testing ✅
- [ ] Update button styles
- [ ] Add loading states
- [ ] Add error handling
- [ ] Update status bar messages
- [ ] End-to-end testing (14 test cases)

---

## Estimated Timeline

| Phase | Description | Time | Dependencies |
|-------|-------------|------|--------------|
| 1 | Critical Removals | 30 min | None |
| 2 | Critical Additions - Buttons | 2 hours | Phase 1 |
| 3 | Backend Message Handlers | 3 hours | Phase 2 |
| 4 | Inline Editing Mode | 3 hours | Phase 2, 3 |
| 5 | Drag-Drop System | 6 hours | Phase 2, 3 |
| 6 | Polish & Testing | 2 hours | Phase 1-5 |
| **Total** | **Complete V1 Implementation** | **16.5 hours** | Sequential |

---

## Success Metrics

After completing all phases:

- ✅ No marketplace tab visible
- ✅ No template controls section at bottom
- ✅ All 8 template-level buttons functional
- ✅ All 4 item-level buttons functional
- ✅ Drag-drop works for reorganizing items
- ✅ Inline editing works smoothly
- ✅ All operations recorded in audit log
- ✅ UI matches design specification visually
- ✅ All 14 test cases pass
- ✅ Zero console errors
- ✅ Performance acceptable (<100ms renders)

---

## Next Steps

1. **Review this checklist** with stakeholders
2. **Execute Phase 1** (removals) immediately to clean up UI
3. **Execute Phases 2-6** sequentially
4. **Test after each phase** to catch regressions early
5. **Update documentation** when complete
6. **Bump version to 0.4.0** (breaking change - UI overhaul)
