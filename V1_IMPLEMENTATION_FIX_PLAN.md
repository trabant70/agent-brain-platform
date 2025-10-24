# V1 Template Sections - Implementation Fix Plan

**Created**: 2025-10-24
**Objective**: Complete the V1 Template Sections UI to match design specification
**Status**: Ready to execute
**Estimated Time**: 16.5 hours

---

## Overview

This plan addresses the gaps identified in `V1_IMPLEMENTATION_GAP_ANALYSIS.md`. The backend infrastructure is complete; this plan focuses on fixing the frontend UI to match the original design.

**Current State**: Backend ✅ | Frontend ❌ (partial)
**Target State**: Backend ✅ | Frontend ✅ (complete)

---

## Execution Strategy

### Approach
- **Phased implementation**: Execute sequentially (Phase 1 → 6)
- **Test after each phase**: Catch regressions early
- **Build and test**: Run `npm run build:vscode` after each phase
- **Commit frequently**: Commit after each completed phase

### Prerequisites
- Read `DESIGN_V1_TEMPLATE_SECTIONS.md` (lines 24-71 for UI design)
- Read `V1_IMPLEMENTATION_GAP_ANALYSIS.md` (complete analysis)
- Read `V1_MISSING_FEATURES_CHECKLIST.md` (detailed checklist)

---

## Phase 1: Remove Old UI (30 minutes)

### Objective
Remove confusing old UI elements that don't belong in V1.

### Files to Modify
- `packages/core/src/domains/visualization/templates/timeline.html`

### Changes

#### 1.1 Remove Marketplace Tab Button
**Line**: 37-42
**Action**: Delete entire `<button>` element with `data-tab="marketplace"`
**Verification**: Tab navigation should only show: Timeline, Knowledge, Sessions, Support

#### 1.2 Remove Marketplace Tab Content
**Line**: 423-434
**Action**: Delete entire `<div id="tab-marketplace">` element
**Verification**: No errors when switching tabs

#### 1.3 Remove Template Controls Section
**Line**: 190-205
**Action**: Delete entire `<div class="template-controls">` element
**Verification**: Knowledge tab renders without bottom control section

### Testing
```bash
cd packages/vscode
npm run build
# Launch extension
# Open Knowledge tab
# Verify: No marketplace tab, no template controls section, no errors
```

### Commit
```bash
git add packages/core/src/domains/visualization/templates/timeline.html
git commit -m "Phase 1: Remove old UI elements (marketplace tab, template controls)"
```

---

## Phase 2: Add Missing Buttons (2 hours)

### Objective
Add all missing action buttons to enable core V1 functionality.

### Files to Modify
1. `packages/core/src/domains/visualization/templates/timeline.html`
2. `packages/core/src/domains/visualization/ui/knowledge/V1TemplatesTableController.ts`

### Changes

#### 2.1 Add Import Button to Toolbar

**File**: `timeline.html`
**Line**: After line 156 (after refresh button)
**Code**:
```html
<button id="import-template" class="secondary-button ab-btn-secondary" title="Import a template from JSON">📦 Import</button>
```

#### 2.2 Update V1TemplatesTableCallbacks Interface

**File**: `V1TemplatesTableController.ts`
**Line**: 12-22
**Add to interface**:
```typescript
export interface V1TemplatesTableCallbacks {
  onCreateTemplate: () => void;
  onCloneTemplate: (templateId: string) => void;
  onDeleteTemplate: (templateId: string) => void;
  onEditTemplate: (templateId: string) => void;
  onAddItem: (templateId: string) => void;
  onEditItem: (templateId: string, itemId: string) => void;
  onDeleteItem: (templateId: string, itemId: string) => void;
  onCreateVersion: (templateId: string) => void;
  onViewAuditLog: (templateId: string) => void;
  // NEW:
  onInjectTemplate: (templateId: string) => void;
  onExportTemplate: (templateId: string) => void;
  onInjectItem: (templateId: string, itemId: string) => void;
  onEditItemInline: (templateId: string, itemId: string) => void;
  onMoveItem: (itemId: string, fromTemplateId: string, toTemplateId: string) => void;
  onCopyItem: (itemId: string, fromTemplateId: string, toTemplateId: string) => void;
}
```

#### 2.3 Add Inject Template Button to Template Headers

**File**: `V1TemplatesTableController.ts`
**Line**: 134-140 (action buttons section)
**Update**:
```html
<td class="col-actions">
  <button class="action-btn" data-action="add-item" data-template-id="${template.id}" title="Add item to template">➕</button>
  <button class="action-btn" data-action="create-version" data-template-id="${template.id}" title="Create version checkpoint">💾</button>
  <button class="action-btn" data-action="clone" data-template-id="${template.id}" title="Clone template">📋</button>
  <button class="action-btn" data-action="inject-template" data-template-id="${template.id}" title="Inject template to file">📦</button>
  <button class="action-btn" data-action="audit-log" data-template-id="${template.id}" title="View audit log">📊</button>
  <button class="action-btn" data-action="export" data-template-id="${template.id}" title="Export template to JSON">📤</button>
  <button class="action-btn" data-action="edit" data-template-id="${template.id}" title="Edit template">✏️</button>
  <button class="action-btn danger" data-action="delete" data-template-id="${template.id}" title="Delete template">🗑️</button>
</td>
```

#### 2.4 Update handleTemplateAction Method

**File**: `V1TemplatesTableController.ts`
**Line**: 256-285
**Update**:
```typescript
private handleTemplateAction(action: string, templateId: string): void {
  webviewLogger.info(
    LogCategory.UI,
    'Template action triggered',
    'V1TemplatesTableController.handleTemplateAction',
    { action, templateId },
    LogPathway.KNOWLEDGE_MANAGEMENT
  );

  switch (action) {
    case 'add-item':
      this.callbacks.onAddItem(templateId);
      break;
    case 'create-version':
      this.callbacks.onCreateVersion(templateId);
      break;
    case 'clone':
      this.callbacks.onCloneTemplate(templateId);
      break;
    case 'inject-template':  // NEW
      this.callbacks.onInjectTemplate(templateId);
      break;
    case 'audit-log':
      this.callbacks.onViewAuditLog(templateId);
      break;
    case 'export':  // NEW
      this.callbacks.onExportTemplate(templateId);
      break;
    case 'edit':
      this.callbacks.onEditTemplate(templateId);
      break;
    case 'delete':
      this.callbacks.onDeleteTemplate(templateId);
      break;
  }
}
```

#### 2.5 Add Inline Edit and Inject Item Buttons to Item Rows

**File**: `V1TemplatesTableController.ts`
**Line**: 186-189 (action buttons section)
**Update**:
```html
<td class="col-actions">
  <button class="action-btn" data-action="edit-inline" data-template-id="${templateId}" data-item-id="${item.id}" title="Edit item inline">📝</button>
  <button class="action-btn" data-action="inject-item" data-template-id="${templateId}" data-item-id="${item.id}" title="Inject item to file">💉</button>
  <button class="action-btn" data-action="edit" data-template-id="${templateId}" data-item-id="${item.id}" title="Edit item">✏️</button>
  <button class="action-btn danger" data-action="delete" data-template-id="${templateId}" data-item-id="${item.id}" title="Delete item">🗑️</button>
</td>
```

#### 2.6 Update handleItemAction Method

**File**: `V1TemplatesTableController.ts`
**Line**: 290-304
**Update**:
```typescript
private handleItemAction(action: string, templateId: string, itemId: string): void {
  webviewLogger.info(
    LogCategory.UI,
    'Item action triggered',
    'V1TemplatesTableController.handleItemAction',
    { action, templateId, itemId },
    LogPathway.KNOWLEDGE_MANAGEMENT
  );

  switch (action) {
    case 'edit-inline':  // NEW
      this.callbacks.onEditItemInline(templateId, itemId);
      break;
    case 'inject-item':  // NEW
      this.callbacks.onInjectItem(templateId, itemId);
      break;
    case 'edit':
      this.callbacks.onEditItem(templateId, itemId);
      break;
    case 'delete':
      this.callbacks.onDeleteItem(templateId, itemId);
      break;
  }
}
```

### Testing
```bash
cd packages/vscode
npm run build
# Launch extension
# Open Knowledge tab
# Verify:
#  - Import button in toolbar
#  - Template headers have 8 buttons: ➕ 💾 📋 📦 📊 📤 ✏️ 🗑️
#  - Item rows have 4 buttons: 📝 💉 ✏️ 🗑️
#  - Clicking buttons doesn't crash (callbacks not wired yet)
```

### Commit
```bash
git add packages/core/src/domains/visualization/templates/timeline.html packages/core/src/domains/visualization/ui/knowledge/V1TemplatesTableController.ts
git commit -m "Phase 2: Add missing action buttons (import, inject template, export, inject item, inline edit)"
```

---

## Phase 3: Wire Button Handlers (3 hours)

### Objective
Connect buttons to functionality via message protocol.

### Files to Modify
1. `packages/core/src/domains/visualization/ui/KnowledgeViewController.ts`
2. `packages/vscode/src/providers/handlers/KnowledgeMessageHandler.ts`
3. `packages/vscode/src/services/KnowledgeManager.ts` (if needed)

### Changes

#### 3.1 Wire Callbacks in KnowledgeViewController

**File**: `KnowledgeViewController.ts`
**Location**: In constructor where V1TemplatesTableController is instantiated
**Update**:
```typescript
this.v1TemplatesTableController = new V1TemplatesTableController({
  onCreateTemplate: () => this.handleCreateV1Template(),
  onCloneTemplate: (templateId: string) => this.handleCloneV1Template(templateId),
  onDeleteTemplate: (templateId: string) => this.handleDeleteV1Template(templateId),
  onEditTemplate: (templateId: string) => this.handleEditV1Template(templateId),
  onAddItem: (templateId: string) => this.handleAddItemToV1Template(templateId),
  onEditItem: (templateId: string, itemId: string) => this.handleEditV1Item(templateId, itemId),
  onDeleteItem: (templateId: string, itemId: string) => this.handleDeleteV1Item(templateId, itemId),
  onCreateVersion: (templateId: string) => this.handleCreateV1Version(templateId),
  onViewAuditLog: (templateId: string) => this.handleViewV1AuditLog(templateId),
  // NEW:
  onInjectTemplate: (templateId: string) => this.handleInjectV1Template(templateId),
  onExportTemplate: (templateId: string) => this.handleExportV1Template(templateId),
  onInjectItem: (templateId: string, itemId: string) => this.handleInjectV1Item(templateId, itemId),
  onEditItemInline: (templateId: string, itemId: string) => this.handleEditV1ItemInline(templateId, itemId),
  onMoveItem: (itemId: string, fromTemplateId: string, toTemplateId: string) => this.handleMoveV1Item(itemId, fromTemplateId, toTemplateId),
  onCopyItem: (itemId: string, fromTemplateId: string, toTemplateId: string) => this.handleCopyV1Item(itemId, fromTemplateId, toTemplateId),
});
```

#### 3.2 Add Import Button Handler

**File**: `KnowledgeViewController.ts`
**Add in render() method or initialization**:
```typescript
const importButton = document.getElementById('import-template');
if (importButton) {
  importButton.addEventListener('click', () => this.handleImportV1Template());
}
```

#### 3.3 Implement Handler Methods

**File**: `KnowledgeViewController.ts`
**Add methods**:

```typescript
private handleImportV1Template(): void {
  // Create file input
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';

  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        try {
          const templateJson = JSON.parse(content);
          this.sendMessage({
            type: 'v1:import-template',
            payload: { templateJson }
          });
          this.notificationManager.show('Importing template...', 'info');
        } catch (error) {
          this.notificationManager.show(`Invalid JSON: ${error.message}`, 'error');
        }
      };
      reader.readAsText(file);
    } catch (error) {
      this.notificationManager.show(`Failed to import template: ${error.message}`, 'error');
    }
  };

  input.click();
}

private handleInjectV1Template(templateId: string): void {
  // Get focused claude.md file
  const focusedFile = this.state.focusedClaudeFile;
  if (!focusedFile) {
    this.notificationManager.show('No claude.md file selected. Please click on a file in the left panel first.', 'warning');
    return;
  }

  this.sendMessage({
    type: 'v1:inject-template',
    payload: { templateId, filePath: focusedFile }
  });
  this.notificationManager.show('Injecting template...', 'info');
}

private handleExportV1Template(templateId: string): void {
  this.sendMessage({
    type: 'v1:export-template',
    payload: { templateId }
  });
  this.notificationManager.show('Exporting template...', 'info');
}

private handleInjectV1Item(templateId: string, itemId: string): void {
  const focusedFile = this.state.focusedClaudeFile;
  if (!focusedFile) {
    this.notificationManager.show('No claude.md file selected. Please click on a file in the left panel first.', 'warning');
    return;
  }

  this.sendMessage({
    type: 'v1:inject-item',
    payload: { templateId, itemId, filePath: focusedFile }
  });
  this.notificationManager.show('Injecting item...', 'info');
}

private handleEditV1ItemInline(templateId: string, itemId: string): void {
  // Toggle inline editing mode in table controller
  this.v1TemplatesTableController.toggleInlineEdit(templateId, itemId);
}

private handleMoveV1Item(itemId: string, fromTemplateId: string, toTemplateId: string): void {
  this.sendMessage({
    type: 'v1:move-item',
    payload: { itemId, fromTemplateId, toTemplateId }
  });
  this.notificationManager.show('Moving item...', 'info');
}

private handleCopyV1Item(itemId: string, fromTemplateId: string, toTemplateId: string): void {
  this.sendMessage({
    type: 'v1:copy-item',
    payload: { itemId, fromTemplateId, toTemplateId }
  });
  this.notificationManager.show('Copying item...', 'info');
}
```

#### 3.4 Add handleMessage Cases

**File**: `KnowledgeViewController.ts`
**Update handleMessage() method**:
```typescript
handleMessage(message: any): void {
  switch (message.type) {
    // ... existing cases

    case 'v1:import-success':
      this.notificationManager.show('Template imported successfully!', 'success');
      this.requestV1TemplatesData();
      break;

    case 'v1:inject-template-success':
      this.notificationManager.show(`Template injected to ${message.payload.filePath}`, 'success');
      break;

    case 'v1:export-success':
      this.notificationManager.show(`Template exported to ${message.payload.filePath}`, 'success');
      break;

    case 'v1:inject-item-success':
      this.notificationManager.show('Item injected successfully!', 'success');
      break;

    case 'v1:move-item-success':
      this.notificationManager.show('Item moved successfully!', 'success');
      this.requestV1TemplatesData();
      break;

    case 'v1:copy-item-success':
      this.notificationManager.show('Item copied successfully!', 'success');
      this.requestV1TemplatesData();
      break;

    case 'error':
      if (message.payload?.source?.startsWith('v1:')) {
        this.notificationManager.show(`Error: ${message.payload.error}`, 'error');
      }
      break;
  }
}
```

#### 3.5 Add Backend Message Handlers

**File**: `KnowledgeMessageHandler.ts`
**Add handler methods**:

```typescript
private async handleV1ImportTemplate(payload: any): Promise<void> {
  try {
    const { templateJson } = payload;

    // Validate template structure
    if (!templateJson.id || !templateJson.name || !Array.isArray(templateJson.items)) {
      throw new Error('Invalid template format');
    }

    // Import template via KnowledgeManager
    await this.knowledgeManager.importTemplate(templateJson);

    // Send success response
    this.provider.postMessage({
      type: 'v1:import-success',
      payload: { templateId: templateJson.id }
    });
  } catch (error) {
    this.provider.postMessage({
      type: 'error',
      payload: { source: 'v1:import-template', error: error.message }
    });
  }
}

private async handleV1InjectTemplate(payload: any): Promise<void> {
  try {
    const { templateId, filePath } = payload;

    // Get template
    const template = this.knowledgeManager.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Inject all items
    for (const item of template.items || []) {
      await this.knowledgeManager.injectItem(item.id, filePath);
    }

    // Record timeline event (optional)
    // this.timelineRecorder.recordEvent({ type: 'template_injected', ... });

    // Send success response
    this.provider.postMessage({
      type: 'v1:inject-template-success',
      payload: { templateId, filePath }
    });
  } catch (error) {
    this.provider.postMessage({
      type: 'error',
      payload: { source: 'v1:inject-template', error: error.message }
    });
  }
}

private async handleV1ExportTemplate(payload: any): Promise<void> {
  try {
    const { templateId } = payload;

    // Export template via KnowledgeManager
    const exportPath = await this.knowledgeManager.exportTemplate(templateId);

    // Send success response
    this.provider.postMessage({
      type: 'v1:export-success',
      payload: { templateId, filePath: exportPath }
    });
  } catch (error) {
    this.provider.postMessage({
      type: 'error',
      payload: { source: 'v1:export-template', error: error.message }
    });
  }
}

private async handleV1InjectItem(payload: any): Promise<void> {
  try {
    const { templateId, itemId, filePath } = payload;

    // Inject item via KnowledgeManager
    await this.knowledgeManager.injectItem(itemId, filePath);

    // Send success response
    this.provider.postMessage({
      type: 'v1:inject-item-success',
      payload: { templateId, itemId, filePath }
    });
  } catch (error) {
    this.provider.postMessage({
      type: 'error',
      payload: { source: 'v1:inject-item', error: error.message }
    });
  }
}

private async handleV1MoveItem(payload: any): Promise<void> {
  try {
    const { itemId, fromTemplateId, toTemplateId } = payload;

    // Move item via KnowledgeManager
    await this.knowledgeManager.moveItemBetweenTemplates(itemId, fromTemplateId, toTemplateId);

    // Send success response with updated templates
    const templates = this.knowledgeManager.getAllTemplates();
    this.provider.postMessage({
      type: 'v1:move-item-success',
      payload: { itemId, fromTemplateId, toTemplateId }
    });
    this.provider.postMessage({
      type: 'v1:templates-data',
      payload: { templates }
    });
  } catch (error) {
    this.provider.postMessage({
      type: 'error',
      payload: { source: 'v1:move-item', error: error.message }
    });
  }
}

private async handleV1CopyItem(payload: any): Promise<void> {
  try {
    const { itemId, fromTemplateId, toTemplateId } = payload;

    // Copy item via KnowledgeManager
    await this.knowledgeManager.copyItemToTemplate(itemId, toTemplateId);

    // Send success response with updated templates
    const templates = this.knowledgeManager.getAllTemplates();
    this.provider.postMessage({
      type: 'v1:copy-item-success',
      payload: { itemId, fromTemplateId, toTemplateId }
    });
    this.provider.postMessage({
      type: 'v1:templates-data',
      payload: { templates }
    });
  } catch (error) {
    this.provider.postMessage({
      type: 'error',
      payload: { source: 'v1:copy-item', error: error.message }
    });
  }
}
```

#### 3.6 Wire Handlers in Message Router

**File**: `KnowledgeMessageHandler.ts`
**Update handleMessage() method**:
```typescript
async handleMessage(message: any): Promise<void> {
  switch (message.type) {
    // ... existing cases

    case 'v1:import-template':
      await this.handleV1ImportTemplate(message.payload);
      break;

    case 'v1:inject-template':
      await this.handleV1InjectTemplate(message.payload);
      break;

    case 'v1:export-template':
      await this.handleV1ExportTemplate(message.payload);
      break;

    case 'v1:inject-item':
      await this.handleV1InjectItem(message.payload);
      break;

    case 'v1:move-item':
      await this.handleV1MoveItem(message.payload);
      break;

    case 'v1:copy-item':
      await this.handleV1CopyItem(message.payload);
      break;
  }
}
```

### Testing
```bash
cd packages/vscode
npm run build
# Launch extension
# Test each button:
#  1. Import template (prepare a JSON file) → Verify imported
#  2. Inject template → Verify items appear in claude.md
#  3. Export template → Verify JSON file created
#  4. Inject item → Verify item appears in claude.md
#  5. Click inline edit (placeholder for Phase 4)
#  6. Drag item (placeholder for Phase 5)
```

### Commit
```bash
git add packages/core/src/domains/visualization/ui/KnowledgeViewController.ts packages/vscode/src/providers/handlers/KnowledgeMessageHandler.ts
git commit -m "Phase 3: Wire button handlers (import, inject template, export, inject item)"
```

---

## Phase 4: Inline Editing Mode (3 hours)

### Objective
Enable inline editing when clicking 📝 button.

### Files to Modify
1. `packages/core/src/domains/visualization/ui/knowledge/V1TemplatesTableController.ts`

### Changes

#### 4.1 Add Inline Edit State

**File**: `V1TemplatesTableController.ts`
**Add property**:
```typescript
private inlineEditingItem: { templateId: string; itemId: string } | null = null;
```

#### 4.2 Add toggleInlineEdit Method

**File**: `V1TemplatesTableController.ts`
**Add method**:
```typescript
/**
 * Toggle inline editing mode for an item
 */
toggleInlineEdit(templateId: string, itemId: string): void {
  if (this.inlineEditingItem?.templateId === templateId &&
      this.inlineEditingItem?.itemId === itemId) {
    // Cancel editing
    this.inlineEditingItem = null;
  } else {
    // Start editing
    this.inlineEditingItem = { templateId, itemId };
  }

  webviewLogger.debug(
    LogCategory.UI,
    this.inlineEditingItem ? 'Inline edit started' : 'Inline edit cancelled',
    'V1TemplatesTableController.toggleInlineEdit',
    { templateId, itemId },
    LogPathway.KNOWLEDGE_MANAGEMENT
  );

  // Re-render to show editable row
  this.render(this.templates);
}
```

#### 4.3 Update createItemRow Method

**File**: `V1TemplatesTableController.ts`
**Update method**:
```typescript
private createItemRow(templateId: string, item: KnowledgeItem): HTMLElement {
  const isEditing = this.inlineEditingItem?.templateId === templateId &&
                    this.inlineEditingItem?.itemId === item.id;

  if (isEditing) {
    return this.createEditableItemRow(templateId, item);
  } else {
    return this.createReadOnlyItemRow(templateId, item);
  }
}
```

#### 4.4 Rename Existing createItemRow Logic

**File**: `V1TemplatesTableController.ts`
**Rename current createItemRow to createReadOnlyItemRow**:
```typescript
private createReadOnlyItemRow(templateId: string, item: KnowledgeItem): HTMLElement {
  // Current implementation (lines 165-207)
  // No changes to logic, just rename method
}
```

#### 4.5 Add createEditableItemRow Method

**File**: `V1TemplatesTableController.ts`
**Add new method**:
```typescript
/**
 * Create editable item row with input fields
 */
private createEditableItemRow(templateId: string, item: KnowledgeItem): HTMLElement {
  const row = document.createElement('tr');
  row.className = 'template-item-row editing';
  row.dataset.templateId = templateId;
  row.dataset.itemId = item.id;

  const typeLabel = getKnowledgeTypeLabel(item.type as KnowledgeType);

  row.innerHTML = `
    <td class="col-select">
      <div class="item-indent"></div>
    </td>
    <td class="col-type">
      <select id="edit-type-${item.id}" class="inline-edit-input">
        ${this.renderKnowledgeTypeOptions(item.type)}
      </select>
    </td>
    <td class="col-title">
      <input type="text" id="edit-title-${item.id}" class="inline-edit-input" value="${this.escapeHtml(item.title)}" />
    </td>
    <td class="col-scope">
      <select id="edit-scope-${item.id}" class="inline-edit-input">
        ${this.renderScopeOptions(item.scope)}
      </select>
    </td>
    <td class="col-tags">
      <input type="text" id="edit-tags-${item.id}" class="inline-edit-input" value="${item.tags?.join(', ') || ''}" placeholder="tag1, tag2, tag3" />
    </td>
    <td class="col-source">${item.source ? this.escapeHtml(item.source) : '-'}</td>
    <td class="col-actions">
      <button class="action-btn" data-action="save-edit" data-template-id="${templateId}" data-item-id="${item.id}" title="Save changes">💾</button>
      <button class="action-btn" data-action="cancel-edit" data-template-id="${templateId}" data-item-id="${item.id}" title="Cancel editing">❌</button>
    </td>
  `;

  // Event listeners for save/cancel
  const saveBtn = row.querySelector('[data-action="save-edit"]');
  const cancelBtn = row.querySelector('[data-action="cancel-edit"]');

  saveBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    this.saveInlineEdit(templateId, item.id);
  });

  cancelBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    this.cancelInlineEdit();
  });

  return row;
}
```

#### 4.6 Add Helper Methods for Dropdowns

**File**: `V1TemplatesTableController.ts`
**Add methods**:
```typescript
private renderKnowledgeTypeOptions(currentType: string): string {
  const types = [
    { value: 'golden-path', label: 'Golden Path' },
    { value: 'adr', label: 'ADR' },
    { value: 'pattern', label: 'Pattern' },
    { value: 'learning', label: 'Learning' },
    { value: 'snippet', label: 'Snippet' },
    { value: 'standard', label: 'Standard' },
    { value: 'best-practice', label: 'Best Practice' },
    { value: 'how-to', label: 'How-To Guide' },
    // Add all 20 types
  ];

  return types.map(t =>
    `<option value="${t.value}" ${t.value === currentType ? 'selected' : ''}>${t.label}</option>`
  ).join('');
}

private renderScopeOptions(currentScope: string): string {
  const scopes = [
    { value: 'personal', label: 'Personal' },
    { value: 'team', label: 'Team' },
    { value: 'project', label: 'Project' },
    { value: 'organization', label: 'Organization' },
    { value: 'public', label: 'Public' }
  ];

  return scopes.map(s =>
    `<option value="${s.value}" ${s.value === currentScope ? 'selected' : ''}>${s.label}</option>`
  ).join('');
}
```

#### 4.7 Add Save/Cancel Methods

**File**: `V1TemplatesTableController.ts`
**Add methods**:
```typescript
private saveInlineEdit(templateId: string, itemId: string): void {
  const typeEl = document.getElementById(`edit-type-${itemId}`) as HTMLSelectElement;
  const titleEl = document.getElementById(`edit-title-${itemId}`) as HTMLInputElement;
  const scopeEl = document.getElementById(`edit-scope-${itemId}`) as HTMLSelectElement;
  const tagsEl = document.getElementById(`edit-tags-${itemId}`) as HTMLInputElement;

  if (!typeEl || !titleEl || !scopeEl || !tagsEl) {
    webviewLogger.error(
      LogCategory.UI,
      'Inline edit elements not found',
      'V1TemplatesTableController.saveInlineEdit',
      { itemId },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
    return;
  }

  const updates = {
    type: typeEl.value,
    title: titleEl.value,
    scope: scopeEl.value,
    tags: tagsEl.value.split(',').map(t => t.trim()).filter(t => t.length > 0)
  };

  webviewLogger.info(
    LogCategory.UI,
    'Saving inline edit',
    'V1TemplatesTableController.saveInlineEdit',
    { templateId, itemId, updates },
    LogPathway.KNOWLEDGE_MANAGEMENT
  );

  // Call update callback
  this.callbacks.onUpdateItem(templateId, itemId, updates);

  // Exit editing mode
  this.inlineEditingItem = null;
  this.render(this.templates);
}

private cancelInlineEdit(): void {
  webviewLogger.debug(
    LogCategory.UI,
    'Inline edit cancelled',
    'V1TemplatesTableController.cancelInlineEdit',
    undefined,
    LogPathway.KNOWLEDGE_MANAGEMENT
  );

  this.inlineEditingItem = null;
  this.render(this.templates);
}
```

#### 4.8 Add onUpdateItem Callback

**File**: `V1TemplatesTableController.ts`
**Update interface** (already added in Phase 2, but verify):
```typescript
export interface V1TemplatesTableCallbacks {
  // ... existing
  onUpdateItem: (templateId: string, itemId: string, updates: Partial<KnowledgeItem>) => void;
}
```

#### 4.9 Wire onUpdateItem in KnowledgeViewController

**File**: `KnowledgeViewController.ts`
**Add to callbacks**:
```typescript
onUpdateItem: (templateId: string, itemId: string, updates: any) => this.handleUpdateV1Item(templateId, itemId, updates),
```

**Add handler**:
```typescript
private handleUpdateV1Item(templateId: string, itemId: string, updates: any): void {
  this.sendMessage({
    type: 'v1:update-item',
    payload: { templateId, itemId, updates }
  });
  this.notificationManager.show('Updating item...', 'info');
}
```

### Testing
```bash
cd packages/vscode
npm run build
# Launch extension
# Test inline editing:
#  1. Click 📝 on an item → Verify row becomes editable
#  2. Change type, title, scope, tags
#  3. Click 💾 save → Verify changes persist
#  4. Click 📝 again, then ❌ cancel → Verify no changes
```

### Commit
```bash
git add packages/core/src/domains/visualization/ui/knowledge/V1TemplatesTableController.ts packages/core/src/domains/visualization/ui/KnowledgeViewController.ts
git commit -m "Phase 4: Implement inline editing mode for knowledge items"
```

---

## Phase 5: Drag-Drop System (6 hours)

### Objective
Enable drag-drop reorganization of items between templates.

### Files to Modify
1. `packages/core/src/domains/visualization/ui/knowledge/V1TemplatesTableController.ts`
2. `packages/core/src/domains/visualization/styles/components/knowledge.css`

### Changes

#### 5.1 Make Item Rows Draggable

**File**: `V1TemplatesTableController.ts`
**Update createReadOnlyItemRow method**:
```typescript
private createReadOnlyItemRow(templateId: string, item: KnowledgeItem): HTMLElement {
  const row = document.createElement('tr');
  row.className = 'template-item-row';
  row.dataset.templateId = templateId;
  row.dataset.itemId = item.id;
  row.draggable = true;  // ADD THIS

  // ... rest of method

  // ADD EVENT LISTENERS:
  row.addEventListener('dragstart', (e) => this.handleDragStart(e, templateId, item.id));
  row.addEventListener('dragend', (e) => this.handleDragEnd(e));

  return row;
}
```

#### 5.2 Add Drag State Property

**File**: `V1TemplatesTableController.ts`
**Add property**:
```typescript
private draggedItem: { templateId: string; itemId: string } | null = null;
```

#### 5.3 Add Drag Event Handlers

**File**: `V1TemplatesTableController.ts`
**Add methods**:
```typescript
private handleDragStart(e: DragEvent, templateId: string, itemId: string): void {
  this.draggedItem = { templateId, itemId };
  e.dataTransfer!.effectAllowed = 'copyMove';
  e.dataTransfer!.setData('text/plain', itemId);

  const target = e.currentTarget as HTMLElement;
  target.classList.add('dragging');

  webviewLogger.debug(
    LogCategory.UI,
    'Drag started',
    'V1TemplatesTableController.handleDragStart',
    { templateId, itemId },
    LogPathway.KNOWLEDGE_MANAGEMENT
  );
}

private handleDragEnd(e: DragEvent): void {
  const target = e.currentTarget as HTMLElement;
  target.classList.remove('dragging');
  this.clearDropZoneHighlights();

  webviewLogger.debug(
    LogCategory.UI,
    'Drag ended',
    'V1TemplatesTableController.handleDragEnd',
    undefined,
    LogPathway.KNOWLEDGE_MANAGEMENT
  );
}

private clearDropZoneHighlights(): void {
  document.querySelectorAll('.drop-zone-active').forEach(el => {
    el.classList.remove('drop-zone-active');
  });
}
```

#### 5.4 Add Drop Zone Rows to Template Sections

**File**: `V1TemplatesTableController.ts`
**Update renderTemplateSection method**:
```typescript
private renderTemplateSection(tbody: HTMLElement, template: MarketplaceTemplate): void {
  // Template header row
  const headerRow = this.createTemplateHeaderRow(template);
  tbody.appendChild(headerRow);

  // DROP ZONE ROW (NEW):
  if (this.expandedTemplates.has(template.id)) {
    const dropZone = this.createDropZoneRow(template.id);
    tbody.appendChild(dropZone);
  }

  // Item rows (if expanded)
  if (this.expandedTemplates.has(template.id)) {
    const items = template.items || [];
    if (items.length === 0) {
      const emptyRow = this.createEmptyItemsRow(template.id);
      tbody.appendChild(emptyRow);
    } else {
      items.forEach(item => {
        const itemRow = this.createItemRow(template.id, item);
        tbody.appendChild(itemRow);
      });
    }
  }
}
```

#### 5.5 Create Drop Zone Row

**File**: `V1TemplatesTableController.ts`
**Add method**:
```typescript
private createDropZoneRow(templateId: string): HTMLElement {
  const row = document.createElement('tr');
  row.className = 'template-drop-zone';
  row.dataset.templateId = templateId;

  row.innerHTML = `
    <td colspan="7" class="drop-zone-cell">
      <div class="drop-zone-indicator">Drop items here to add to template</div>
    </td>
  `;

  // Event listeners
  row.addEventListener('dragover', (e) => this.handleDragOver(e, templateId));
  row.addEventListener('dragleave', (e) => this.handleDragLeave(e));
  row.addEventListener('drop', (e) => this.handleDrop(e, templateId));

  return row;
}
```

#### 5.6 Add Drop Event Handlers

**File**: `V1TemplatesTableController.ts`
**Add methods**:
```typescript
private handleDragOver(e: DragEvent, targetTemplateId: string): void {
  e.preventDefault();
  e.stopPropagation();

  // Set drop effect based on Ctrl key
  e.dataTransfer!.dropEffect = e.ctrlKey ? 'copy' : 'move';

  // Highlight drop zone
  const target = e.currentTarget as HTMLElement;
  target.classList.add('drop-zone-active');
}

private handleDragLeave(e: DragEvent): void {
  const target = e.currentTarget as HTMLElement;
  target.classList.remove('drop-zone-active');
}

private handleDrop(e: DragEvent, targetTemplateId: string): void {
  e.preventDefault();
  e.stopPropagation();

  if (!this.draggedItem) {
    webviewLogger.warn(
      LogCategory.UI,
      'Drop without dragged item',
      'V1TemplatesTableController.handleDrop',
      undefined,
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
    return;
  }

  const { templateId: sourceTemplateId, itemId } = this.draggedItem;
  const isCopy = e.ctrlKey;

  // Same template and not copying? No-op
  if (sourceTemplateId === targetTemplateId && !isCopy) {
    webviewLogger.debug(
      LogCategory.UI,
      'Drop to same template ignored',
      'V1TemplatesTableController.handleDrop',
      { sourceTemplateId, targetTemplateId },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
    this.clearDropZoneHighlights();
    this.draggedItem = null;
    return;
  }

  webviewLogger.info(
    LogCategory.UI,
    isCopy ? 'Item copied via drag-drop' : 'Item moved via drag-drop',
    'V1TemplatesTableController.handleDrop',
    { itemId, sourceTemplateId, targetTemplateId, isCopy },
    LogPathway.KNOWLEDGE_MANAGEMENT
  );

  // Call appropriate callback
  if (isCopy) {
    this.callbacks.onCopyItem(itemId, sourceTemplateId, targetTemplateId);
  } else {
    this.callbacks.onMoveItem(itemId, sourceTemplateId, targetTemplateId);
  }

  // Clean up
  this.clearDropZoneHighlights();
  this.draggedItem = null;
}
```

#### 5.7 Add Drag-Drop Styles

**File**: `knowledge.css`
**Add styles**:
```css
/* Draggable items */
.template-item-row[draggable="true"] {
  cursor: move;
}

.template-item-row.dragging {
  opacity: 0.5;
  background: var(--vscode-list-activeSelectionBackground);
}

/* Drop zones */
.template-drop-zone {
  display: none; /* Hidden by default */
  transition: all 0.2s ease;
}

.template-drop-zone.drop-zone-active {
  display: table-row;
  animation: dropZonePulse 0.5s ease-in-out infinite;
}

.drop-zone-cell {
  padding: 20px;
  text-align: center;
  background: var(--vscode-editor-background);
  border: 2px dashed var(--vscode-textLink-activeForeground);
  border-radius: 4px;
  transition: all 0.2s ease;
}

.drop-zone-active .drop-zone-cell {
  background: var(--vscode-list-hoverBackground);
  border-color: var(--vscode-focusBorder);
}

.drop-zone-indicator {
  color: var(--vscode-textLink-activeForeground);
  font-weight: 600;
  font-size: 14px;
}

@keyframes dropZonePulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}
```

### Testing
```bash
cd packages/vscode
npm run build
# Launch extension
# Test drag-drop:
#  1. Expand two templates
#  2. Drag item from Template A
#  3. Drop on Template B drop zone → Verify item moves
#  4. Drag item with Ctrl held
#  5. Drop → Verify item copies (appears in both)
#  6. Try dragging to same template → Verify no-op
```

### Commit
```bash
git add packages/core/src/domains/visualization/ui/knowledge/V1TemplatesTableController.ts packages/core/src/domains/visualization/styles/components/knowledge.css
git commit -m "Phase 5: Implement drag-drop system for reorganizing items between templates"
```

---

## Phase 6: Polish & Testing (2 hours)

### Objective
Final polish, error handling, and comprehensive testing.

### Files to Modify
1. `packages/core/src/domains/visualization/styles/components/knowledge.css`
2. Various files for error handling improvements

### Changes

#### 6.1 Add Button Hover Styles

**File**: `knowledge.css`
**Add/update styles**:
```css
/* Action button colors */
.action-btn[data-action="inject-template"],
.action-btn[data-action="inject-item"] {
  color: var(--vscode-charts-green);
}

.action-btn[data-action="inject-template"]:hover,
.action-btn[data-action="inject-item"]:hover {
  background: rgba(76, 175, 80, 0.1);
}

.action-btn[data-action="export"] {
  color: var(--vscode-charts-blue);
}

.action-btn[data-action="export"]:hover {
  background: rgba(33, 150, 243, 0.1);
}

.action-btn[data-action="edit-inline"] {
  color: var(--vscode-charts-yellow);
}

.action-btn[data-action="edit-inline"]:hover {
  background: rgba(255, 193, 7, 0.1);
}

/* Inline edit inputs */
.inline-edit-input {
  width: 100%;
  padding: 4px 8px;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border);
  border-radius: 3px;
  font-family: var(--vscode-font-family);
  font-size: 13px;
}

.inline-edit-input:focus {
  outline: 1px solid var(--vscode-focusBorder);
  border-color: var(--vscode-focusBorder);
}

.template-item-row.editing {
  background: var(--vscode-editor-selectionBackground);
}
```

#### 6.2 Improve Error Messages

**File**: `KnowledgeViewController.ts`
**Update error handlers** to provide specific user-friendly messages:
```typescript
case 'error':
  if (message.payload?.source?.startsWith('v1:')) {
    const errorMessages: Record<string, string> = {
      'v1:import-template': 'Failed to import template. Please check the JSON file format.',
      'v1:inject-template': 'Failed to inject template. Make sure the target file exists.',
      'v1:export-template': 'Failed to export template. Check file permissions.',
      'v1:inject-item': 'Failed to inject item. Make sure the target file exists.',
      'v1:move-item': 'Failed to move item. Template or item may have been deleted.',
      'v1:copy-item': 'Failed to copy item. Template or item may have been deleted.',
    };

    const friendlyMessage = errorMessages[message.payload.source] || message.payload.error;
    this.notificationManager.show(friendlyMessage, 'error');
  }
  break;
```

#### 6.3 Add Loading States

**File**: `KnowledgeViewController.ts`
**Update handlers** to show loading indicators:
```typescript
private handleInjectV1Template(templateId: string): void {
  const focusedFile = this.state.focusedClaudeFile;
  if (!focusedFile) {
    this.notificationManager.show('Please select a claude.md file first', 'warning');
    return;
  }

  // Show loading state
  this.updateStatusBar('Injecting template...');
  this.notificationManager.show('Injecting template items...', 'info');

  this.sendMessage({
    type: 'v1:inject-template',
    payload: { templateId, filePath: focusedFile }
  });
}
```

#### 6.4 Comprehensive End-to-End Testing

**Test Checklist**:

1. **Template Operations**
   - [ ] Create template → Appears in table
   - [ ] Clone template → Clone appears with new ID
   - [ ] Edit template metadata → Changes persist
   - [ ] Delete template → Removed from table
   - [ ] Export template → JSON file created in `.agent-brain/exports/`
   - [ ] Import template → Appears in table

2. **Item Operations**
   - [ ] Add item to template → Appears nested under template
   - [ ] Edit item (modal) → Changes persist
   - [ ] Edit item (inline) → Row becomes editable, changes save
   - [ ] Delete item → Removed from template
   - [ ] Inject item → Appears in claude.md with markers

3. **Template Section Features**
   - [ ] Expand template → Items appear
   - [ ] Collapse template → Items hide
   - [ ] Inject template → All items appear in claude.md
   - [ ] View audit log → Modal shows operations
   - [ ] Create version → Version checkpoint created

4. **Drag-Drop**
   - [ ] Drag item to different template → Item moves
   - [ ] Drag item with Ctrl → Item copies
   - [ ] Drag to same template → No-op
   - [ ] Drop zone highlights on drag over
   - [ ] Visual feedback during drag

5. **Error Handling**
   - [ ] Import invalid JSON → Error message
   - [ ] Inject to non-existent file → Error message
   - [ ] Delete non-existent template → Error message
   - [ ] Network errors → Graceful error messages

6. **UI/UX**
   - [ ] No marketplace tab visible
   - [ ] No template controls section visible
   - [ ] Import button in toolbar
   - [ ] All 8 template action buttons visible
   - [ ] All 4 item action buttons visible
   - [ ] Buttons have tooltips
   - [ ] Hover states work
   - [ ] Animations smooth
   - [ ] No console errors

### Testing Script
```bash
cd packages/vscode
npm run build

# Launch extension
# Open Knowledge tab
# Run through all 6 test categories above
# Log any failures

# Performance test
# - Load 50+ templates with 5+ items each
# - Verify: Render time < 100ms
# - Verify: Search responsive
# - Verify: Drag-drop smooth
```

### Commit
```bash
git add packages/core/src/domains/visualization/styles/components/knowledge.css packages/core/src/domains/visualization/ui/KnowledgeViewController.ts
git commit -m "Phase 6: Polish UI, improve error handling, add comprehensive testing"
```

---

## Final Steps

### 1. Version Bump
**File**: `packages/vscode/package.json`
**Change**: `"version": "0.3.1"` → `"version": "0.4.0"`
**Reason**: Breaking change - complete UI overhaul

```bash
cd packages/vscode
npm run version:bump
# Manually edit to 0.4.0
```

### 2. Build VSIX
```bash
cd packages/vscode
npm run package
# Creates: agent-brain-platform-0.4.0.vsix
```

### 3. Final Testing
- Install VSIX in clean VSCode instance
- Test all features from scratch
- Verify no errors in console
- Check performance with large knowledge base

### 4. Documentation Update
- Update `CLAUDE.md` with new V1 UI instructions
- Update `DESIGN_V1_TEMPLATE_SECTIONS.md` status
- Mark implementation as complete

### 5. Final Commit & Push
```bash
git add packages/vscode/package.json
git commit -m "Version 0.4.0: Complete V1 Template Sections UI implementation"
git push origin main
```

---

## Success Criteria

When all phases are complete, verify:

- ✅ No marketplace tab
- ✅ No template controls section
- ✅ Import button in toolbar
- ✅ 8 template action buttons: ➕ 💾 📋 📦 📊 📤 ✏️ 🗑️
- ✅ 4 item action buttons: 📝 💉 ✏️ 🗑️
- ✅ Drag-drop between templates works
- ✅ Ctrl+drag copies items
- ✅ Inline editing works
- ✅ All operations functional
- ✅ Audit log tracks all changes
- ✅ UI matches design specification
- ✅ Zero console errors
- ✅ Performance acceptable
- ✅ All tests pass

---

## Rollback Plan

If critical issues arise:

1. **Quick Rollback**: Revert to v0.3.1
   ```bash
   git revert HEAD~6..HEAD  # Revert last 6 commits (phases)
   cd packages/vscode && npm run package
   ```

2. **Partial Rollback**: Keep backend, hide V1 UI
   - Set `v1Enabled = false` in KnowledgeManager
   - Restore old template controls section
   - Keep backend infrastructure for future

3. **Emergency Fix**: Hot-patch critical bugs
   - Create patch branch
   - Fix specific issue
   - Release 0.4.1 immediately

---

## Timeline Summary

| Phase | Duration | Complexity | Impact |
|-------|----------|------------|--------|
| 1. Remove Old UI | 30 min | LOW | HIGH |
| 2. Add Buttons | 2 hours | MEDIUM | HIGH |
| 3. Wire Handlers | 3 hours | MEDIUM | HIGH |
| 4. Inline Editing | 3 hours | HIGH | MEDIUM |
| 5. Drag-Drop | 6 hours | HIGH | MEDIUM |
| 6. Polish & Test | 2 hours | LOW | MEDIUM |
| **TOTAL** | **16.5 hours** | **MEDIUM-HIGH** | **HIGH** |

**Recommended Schedule**: 2-3 days with focused work sessions.

---

## Questions or Blockers?

If you encounter issues during implementation:

1. **Check design docs**: `DESIGN_V1_TEMPLATE_SECTIONS.md`, `IMPLEMENTATION_PLAN_V1.md`
2. **Review gap analysis**: `V1_IMPLEMENTATION_GAP_ANALYSIS.md`
3. **Check existing code**: Backend handlers already exist from Phase 4
4. **Test incrementally**: Build and test after each phase

**Ready to execute? Start with Phase 1 → Remove old UI.**
