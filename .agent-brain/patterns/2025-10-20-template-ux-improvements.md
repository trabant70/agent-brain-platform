---
title: Template UX Improvements with ModalDialog and NotificationManager
type: design-pattern
scope: project
tags: ux, templates, modal, notifications, user-feedback
author: Claude
---

# Template UX Improvements with ModalDialog and NotificationManager

## Context

The Knowledge Management system's template functionality originally used basic browser dialogs (`prompt()`, `alert()`, `confirm()`) which:
- Don't work in sandboxed VSCode webviews
- Provide no visual feedback for operations
- Offer poor UX with no styling or validation
- Block the UI with synchronous dialogs

## Problem

Original template methods:
```typescript
// ❌ Uses prompt() - doesn't work in webview
saveAsTemplate(): void {
  const name = prompt('Template name:');
  if (!name) return;
  // Send message, no feedback on success/error
}

// ❌ Uses alert() for validation
applyTemplateToFocused(): void {
  if (!templateId) {
    alert('Please select a template');  // Blocks UI
    return;
  }
}

// ❌ Uses confirm() - basic browser dialog
removeTemplate(templateId: string): void {
  if (confirm('Remove this template?')) {  // No context
    // Send message, no feedback
  }
}
```

**Issues**:
1. Browser dialogs don't work in sandboxed webviews
2. No validation feedback
3. No success/error notifications
4. Poor UX with ugly, unstyled dialogs
5. No context in confirmation messages

## Solution: ModalDialog + NotificationManager Pattern

### 1. Import Required Components

```typescript
import { ModalDialog } from './ModalDialog';
import { NotificationManager } from './NotificationManager';
```

### 2. Add NotificationManager Instance

```typescript
export class KnowledgeViewController {
  private notifications: NotificationManager;

  constructor() {
    // ... other initialization
    this.notifications = new NotificationManager();
  }
}
```

### 3. Update Template Methods

#### Save as Template - Use ModalDialog.prompt()

```typescript
async saveAsTemplate(): Promise<void> {
  const selectedIds = Array.from(this.state.selectedItems);

  // Validation with warning notification
  if (selectedIds.length === 0) {
    this.notifications.show({
      type: 'warning',
      message: 'Please select at least one knowledge item to create a template'
    });
    return;
  }

  // Modal prompt with validation
  const modal = new ModalDialog();
  const name = await modal.prompt('Template name:', {
    required: true,
    placeholder: 'e.g., "API Design Checklist"'
  });

  if (!name) return; // User cancelled

  // Send message
  this.sendMessage({
    type: 'knowledge:create-template',
    payload: { name, itemIds: selectedIds }
  });

  // Show progress notification
  this.notifications.show({
    type: 'info',
    message: `Creating template "${name}" with ${selectedIds.length} item(s)...`
  });
}
```

#### Apply Template - Use NotificationManager

```typescript
applyTemplateToFocused(): void {
  const selector = document.getElementById('template-selector') as HTMLSelectElement;
  const templateId = selector?.value;

  // Validation with notification instead of alert
  if (!templateId) {
    this.notifications.show({
      type: 'warning',
      message: 'Please select a template from the dropdown'
    });
    return;
  }

  const template = this.state.templates.find(t => t.id === templateId);
  const templateName = template?.name || 'template';

  this.sendMessage({
    type: 'knowledge:apply-template',
    payload: { templateId }
  });

  // Show progress feedback
  this.notifications.show({
    type: 'info',
    message: `Applying template "${templateName}" to focused claude.md...`
  });
}
```

#### Export Template - Use NotificationManager

```typescript
exportTemplate(): void {
  const selector = document.getElementById('template-selector') as HTMLSelectElement;
  const templateId = selector?.value;

  if (!templateId) {
    this.notifications.show({
      type: 'warning',
      message: 'Please select a template from the dropdown'
    });
    return;
  }

  const template = this.state.templates.find(t => t.id === templateId);
  const templateName = template?.name || 'template';

  this.sendMessage({
    type: 'knowledge:export-template',
    payload: { templateId }
  });

  this.notifications.show({
    type: 'info',
    message: `Exporting template "${templateName}"...`
  });
}
```

#### Remove Template - Use ModalDialog.confirm()

```typescript
async removeTemplate(templateId: string, claudeMdPath: string): Promise<void> {
  const template = this.state.templates.find(t => t.id === templateId);
  const templateName = template?.name || 'this template';

  // Contextual confirmation dialog
  const modal = new ModalDialog();
  const confirmed = await modal.confirm(
    `Remove template "${templateName}" from claude.md?`,
    'Confirm Removal'
  );

  if (confirmed) {
    this.sendMessage({
      type: 'knowledge:remove-template',
      payload: { templateId, claudeMdPath }
    });

    this.notifications.show({
      type: 'info',
      message: `Removing template "${templateName}" from claude.md...`
    });
  }
}
```

### 4. Add Operation Result Handler

Handle success/error responses from extension:

```typescript
/**
 * Handle operation results (success/error notifications)
 * Called by parent when extension sends operation results
 */
handleOperationResult(operation: string, success: boolean, message?: string): void {
  if (success) {
    this.notifications.show({
      type: 'success',
      message: message || `${operation} completed successfully`
    });
  } else {
    this.notifications.show({
      type: 'error',
      message: message || `${operation} failed`,
      duration: 6000 // Show errors longer
    });
  }
}
```

### 5. Add Notification Styles (base.css)

```css
/* Notification Container */
#notification-container,
.notification-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10001;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 400px;
  pointer-events: none;
}

/* Individual Notification */
.notification {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--vscode-notifications-background);
  border: 1px solid var(--vscode-notifications-border);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  pointer-events: auto;
  cursor: pointer;
  min-width: 300px;
  max-width: 400px;
}

/* Notification Types */
.notification-success {
  border-left: 3px solid var(--vscode-testing-iconPassed);
}

.notification-error {
  border-left: 3px solid var(--vscode-testing-iconFailed);
}

.notification-warning {
  border-left: 3px solid var(--vscode-statusBarItem-warningBackground);
}

.notification-info {
  border-left: 3px solid var(--vscode-statusBarItem-activeBackground);
}
```

## Benefits

### ✅ Better UX
- Professional, styled dialogs matching VSCode theme
- Clear, contextual confirmation messages
- Placeholder text guides users
- Required field validation

### ✅ Visual Feedback
- Toast notifications for all operations
- Progress indicators ("Creating template...")
- Success/error feedback
- Longer duration for errors (6s vs 4s)

### ✅ Non-Blocking
- Async dialogs don't block UI
- User can interact with other elements
- Auto-dismiss notifications

### ✅ Webview Compatible
- No reliance on browser APIs
- Works in sandboxed VSCode webviews
- Uses VSCode CSS variables for theming

### ✅ Contextual Information
- Template names shown in notifications
- Item counts displayed
- Specific error messages

## Usage Examples

### User Flow: Create Template

1. User selects 3 knowledge items
2. Clicks "Save as Template"
3. Modal appears with placeholder: "e.g., 'API Design Checklist'"
4. User types "Frontend Standards"
5. Clicks OK
6. Toast appears: "Creating template 'Frontend Standards' with 3 item(s)..."
7. Extension processes
8. Toast appears: "Template 'Frontend Standards' created successfully" ✓

### User Flow: Apply Template (Error)

1. User clicks "Apply Template" without selecting one
2. Warning toast appears: "Please select a template from the dropdown" ⚠
3. User selects "Frontend Standards"
4. Clicks "Apply Template"
5. Info toast: "Applying template 'Frontend Standards' to focused claude.md..."
6. Extension fails (no focused claude.md)
7. Error toast (6s): "Failed to apply template: No claude.md file is focused" ✗

## Testing Checklist

- ✅ Save template with no items selected → Warning notification
- ✅ Save template with valid name → Success notification
- ✅ Save template and cancel → No notification
- ✅ Apply template without selection → Warning notification
- ✅ Apply template successfully → Success notification
- ✅ Export template → Progress + success notifications
- ✅ Remove template and confirm → Success notification
- ✅ Remove template and cancel → No notification
- ✅ All modals styled with VSCode theme
- ✅ Notifications auto-dismiss after 4s (6s for errors)
- ✅ Click notification to dismiss manually

## Related Patterns

- **ModalDialog Component** - Reusable modal system
- **NotificationManager** - Toast notification system
- **VSCode Theme Integration** - Using CSS variables
- **Async/Await Pattern** - Non-blocking user interactions

## File Locations

**Controller**: `packages/core/src/domains/visualization/ui/KnowledgeViewController.ts`
- Lines 18-19: Imports
- Line 38: NotificationManager instance
- Line 53: Constructor initialization
- Lines 784-899: Updated template methods
- Lines 936-949: handleOperationResult() method

**Styles**: `packages/core/src/domains/visualization/styles/base.css`
- Lines 165-306: Notification system styles

**Components**:
- `packages/core/src/domains/visualization/ui/ModalDialog.ts` (482 lines)
- `packages/core/src/domains/visualization/ui/NotificationManager.ts` (231 lines)

## Impact

**Before**: Template operations had no feedback, used broken browser dialogs, poor UX
**After**: Professional modals, toast notifications, contextual feedback, excellent UX

**Build**: ✅ Success (agent-brain-platform-0.2.1.vsix, 603.17 KB)
