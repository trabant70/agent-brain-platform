---
title: VSCode Webview Sandbox Blocks Browser Modals
type: learning
scope: team
tags: vscode, webview, sandbox, csp, debugging
source: knowledge-edit-delete-buttons-fix
author: Claude
version: 1
---

# VSCode Webview Sandbox Blocks Browser Modals

## Problem

Edit button worked fine, but delete button failed silently with no visible error to the user.

## Symptoms

**What Worked:**
- ✅ Edit button opened modal dialog successfully
- ✅ Modal displayed form with all fields pre-populated
- ✅ Could save changes

**What Didn't Work:**
- ❌ Delete button clicked but nothing happened
- ❌ No confirmation dialog appeared
- ❌ No error message shown to user

## Root Cause Discovery

**Error in Webview Console:**
```
Ignored call to 'confirm()'. The document is sandboxed, and the 'allow-modals' keyword is not set.
```

**Key Insight:** VSCode webviews run in a sandboxed iframe that blocks:
- `confirm()` - browser confirmation dialog
- `alert()` - browser alert dialog
- `prompt()` - browser input prompt dialog

These browser APIs are blocked by Content Security Policy (CSP) for security reasons.

## Why Edit Worked But Delete Didn't

**Edit Button:**
```typescript
// Used custom ModalDialog component (works!)
const modal = new ModalDialog();
const result = await modal.showForm({ ... });
```

**Delete Button (Original):**
```typescript
// Used browser confirm() (blocked by sandbox!)
const confirmed = confirm('Delete this item?');
```

## The Fix

Replace browser `confirm()` with `ModalDialog.confirm()`:

**Before (Broken):**
```typescript
deleteItem(itemId: string): void {
  const item = this.state.items.find(i => i.id === itemId);

  // ❌ This is blocked by VSCode sandbox
  const confirmed = confirm(`Delete "${item.title}"?`);

  if (confirmed) {
    this.sendMessage({ type: 'knowledge:delete-item', payload: { id: itemId } });
  }
}
```

**After (Fixed):**
```typescript
deleteItem(itemId: string): void {
  const item = this.state.items.find(i => i.id === itemId);

  // ✅ Use async ModalDialog instead
  this.showDeleteConfirmation(item).catch(error => {
    // Handle errors
  });
}

private async showDeleteConfirmation(item: KnowledgeItem): Promise<void> {
  const modal = new ModalDialog();
  const message = `Delete "${item.title}"?\n\nThis action cannot be undone.`;

  // ✅ ModalDialog.confirm() works in VSCode webviews
  const confirmed = await modal.confirm(message, 'Confirm Delete');

  if (confirmed) {
    this.sendMessage({ type: 'knowledge:delete-item', payload: { id: item.id } });
  }
}
```

## Key Pattern: Async Wrapper for Modals

Because we're using ModalDialog which is async, we need to:

1. **Make the sync function call an async helper:**
   ```typescript
   // Sync function (onclick handler)
   deleteItem(itemId: string): void {
     const item = this.state.items.find(i => i.id === itemId);
     // Call async helper and catch errors
     this.showDeleteConfirmation(item).catch(error => { ... });
   }
   ```

2. **Extract async logic to separate method:**
   ```typescript
   // Async helper method
   private async showDeleteConfirmation(item: KnowledgeItem): Promise<void> {
     const modal = new ModalDialog();
     const confirmed = await modal.confirm(message, title);
     // ... rest of logic
   }
   ```

## Debugging Process

**Step 1: Test HTML Confirmed Logic Was Correct**
- Created standalone HTML page
- Verified event listeners were attaching properly
- Confirmed edit/delete methods were being called

**Step 2: Enable Pathway Logging**
```json
{
  "agentBrain.logging.logLevel": "DEBUG",
  "agentBrain.logging.pathwayMode": "filter",
  "agentBrain.logging.enabledPathways": ["KNOWLEDGE_MANAGEMENT"]
}
```

**Step 3: Check Webview DevTools Console**
- Right-click webview → "Open Webview Developer Tools"
- Found the CSP error: `Ignored call to 'confirm()'`
- This revealed the root cause

**Step 4: Verify ModalDialog.confirm() Exists**
```typescript
// From ModalDialog.ts
async confirm(message: string, title: string = 'Confirm'): Promise<boolean> {
  return new Promise((resolve, reject) => {
    this.resolve = resolve;
    this.reject = reject;
    this.createOverlay();
    this.createConfirmModal(title, message);
    this.attachEventListeners();
  });
}
```

## Prevention: Modal Usage Checklist

When creating any user confirmation in VSCode webviews:

- ❌ **NEVER use:** `confirm()`, `alert()`, `prompt()`
- ✅ **ALWAYS use:** `ModalDialog.confirm()`, `ModalDialog.alert()`, `ModalDialog.prompt()`

**Why:**
- Browser modals are blocked by CSP in sandboxed webviews
- Errors are silent - no visible feedback to user
- Custom modals (ModalDialog) work because they use DOM elements, not browser APIs

## Related Files

**Files Modified:**
- `packages/core/src/domains/visualization/ui/KnowledgeViewController.ts`
  - Lines 1175-1297: `deleteItem()` and `showDeleteConfirmation()`

**Supporting Components:**
- `packages/core/src/domains/visualization/ui/ModalDialog.ts`
  - Line 96: `confirm()` method implementation
  - Line 336: `createConfirmModal()` helper

## Extension Versions

- ❌ **v0.2.4-0.2.5**: Used browser `confirm()` - delete didn't work
- ✅ **v0.2.6**: Fixed to use `ModalDialog.confirm()` - delete works

## Related Issues

This same pattern applies to:
- Any confirmation dialogs
- Any alert messages
- Any text input prompts

Always use ModalDialog components in VSCode webviews, never browser APIs.

## Testing Verification

**Test Case 1: Edit Button**
1. Click ✏️ on knowledge item
2. Modal dialog appears with form
3. Can edit all fields and save
4. ✅ Works

**Test Case 2: Delete Button**
1. Click 🗑️ on knowledge item
2. Modal confirmation dialog appears (not browser confirm)
3. Shows custom styled modal with Cancel/OK buttons
4. After clicking OK, item is deleted
5. ✅ Works

## Lessons Learned

1. **Browser APIs Don't Work in VSCode Webviews** - Always check if there's a CSP-compliant alternative
2. **Silent Failures Are Hard to Debug** - Always check webview DevTools console for CSP errors
3. **Test in Actual Environment** - Standalone HTML tests work, but may not catch environment-specific issues
4. **Consistency Matters** - Use the same modal pattern everywhere (ModalDialog for all dialogs)
5. **Log Everything** - Comprehensive pathway logging helped identify where the flow stopped

## Architecture Insight

This reveals an important architectural constraint:

```
Browser Context (Normal Web)
  ├─ confirm() ✅ Works
  ├─ alert() ✅ Works
  └─ prompt() ✅ Works

VSCode Webview Context (Sandboxed)
  ├─ confirm() ❌ Blocked by CSP
  ├─ alert() ❌ Blocked by CSP
  ├─ prompt() ❌ Blocked by CSP
  └─ ModalDialog ✅ Works (DOM-based)
```

**Why ModalDialog Works:**
- Uses DOM elements (div, button, etc.) not browser APIs
- CSS for styling (var(--vscode-*) variables)
- JavaScript event listeners (allowed by CSP)
- No inline scripts (CSP compliant)

This is why edit worked from the beginning - it never used browser APIs.
