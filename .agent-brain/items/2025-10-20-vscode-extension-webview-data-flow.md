---
title: VSCode Extension to Webview Data Flow
type: golden-path
scope: project
tags: vscode, webview, architecture, data-flow
author: Claude
---

# VSCode Extension to Webview Data Flow

## Overview
This golden path documents the complete data flow from VSCode extension (Node.js) to webview (Chromium) for the Agent Brain Knowledge Management system.

## The Two-Context Architecture

### Extension Context (Node.js)
- Has access to file system, VSCode API, Node modules
- Cannot directly manipulate webview DOM
- Communicates via `webview.postMessage()`

### Webview Context (Chromium/Browser)
- Has access to DOM, browser APIs
- Cannot access file system or Node modules
- Communicates via `window.vscode.postMessage()`

## Complete Data Flow Chain

### 1. File System → KnowledgeManager
**Location**: `packages/vscode/src/services/KnowledgeManager.ts`

```typescript
async refreshAll(): Promise<void> {
  // 1. Find all .md files in .agent-brain
  const files = await vscode.workspace.findFiles('.agent-brain/**/*.md');

  // 2. Load each file
  for (const uri of files) {
    await this.loadFile(uri);
  }
}

private async loadFile(uri: vscode.Uri): Promise<void> {
  // 3. Read file content
  const content = await vscode.workspace.fs.readFile(uri);
  const contentStr = Buffer.from(content).toString('utf8');

  // 4. Parse frontmatter + body → KnowledgeItem
  const item = await this.fileSystem.loadMarkdownFile(uri.fsPath, contentStr, stats);

  // 5. Add to in-memory store
  this.store.addItem(item);
}
```

### 2. Store Operations
**Location**: `packages/core/src/domains/knowledge/KnowledgeStore.ts`

```typescript
class KnowledgeStore {
  private items: Map<string, KnowledgeItem> = new Map();

  addItem(item: KnowledgeItem): void {
    this.items.set(item.id, item);
    // Index by type, scope, tags, path
  }

  getAllItems(): KnowledgeItem[] {
    return Array.from(this.items.values());
  }
}
```

### 3. TimelineProvider → Webview
**Location**: `packages/vscode/src/providers/timeline-provider-webpack.ts`

```typescript
private async sendKnowledgeData(): Promise<void> {
  // 6. Get items from store
  const store = this.knowledgeManager.getStore();
  const items = store.getAllItems();

  // 7. Send via postMessage (serializes to JSON)
  this._view.webview.postMessage({
    type: 'knowledge:loaded',
    payload: { items, templates }
  });
}
```

### 4. Webview Message Handler
**Location**: `packages/core/src/domains/visualization/webview/main.ts`

```typescript
window.addEventListener('message', async event => {
  const message = event.data;

  switch (message.type) {
    case 'knowledge:loaded':
      handleKnowledgeLoaded(message.payload);
      break;
  }
});

function handleKnowledgeLoaded(data: any): void {
  // 8. Pass to controller
  (window as any).knowledgeController.loadData(data);
}
```

### 5. KnowledgeViewController → DOM
**Location**: `packages/core/src/domains/visualization/ui/KnowledgeViewController.ts`

```typescript
loadData(data: { items: KnowledgeItem[]; templates: Template[] }): void {
  // 9. Update internal state
  this.state.items = data.items;

  // 10. Render to DOM
  this.renderKnowledgeTable();
}

renderKnowledgeTable(): void {
  const tbody = document.getElementById('knowledge-items');

  // 11. Filter and group items
  const items = this.getFilteredItems();
  const groups = this.groupItemsByType(items);

  // 12. Create DOM elements
  for (const [type, typeItems] of groups) {
    for (const item of typeItems) {
      const row = this.createItemRow(item);
      tbody.appendChild(row);
    }
  }
}
```

## Critical Points

### Serialization Boundary
When data crosses from Node.js → Webview:
- ✅ Plain objects, arrays, primitives
- ✅ Dates (become strings)
- ❌ Functions, class instances
- ❌ Circular references

### Initialization Order
```
1. Extension activates
2. KnowledgeManager.initialize()
   ├─ ensureKnowledgeDirectory()
   ├─ refreshAll() → loads files into store
   └─ setupFileWatchers()
3. TimelineProvider.setKnowledgeManager()
4. Webview resolves (HTML loaded)
5. Webview sends 'requestData'
6. Extension responds with 'loggingConfig'
7. Webview sends 'knowledge:load-request'
8. Extension calls sendKnowledgeData()
9. Webview receives 'knowledge:loaded'
10. KnowledgeViewController.loadData()
11. DOM updated
```

### File Watching
File system changes trigger automatic updates:
```
File created/modified → handleFileCreate()
                     → loadFile()
                     → store.addItem()
                     → sendKnowledgeData()
                     → Webview updates
```

## Debugging Checklist

When data doesn't appear in UI:

1. ✓ Are files in `.agent-brain/` with correct structure?
2. ✓ Does `KnowledgeManager.refreshAll()` find files?
3. ✓ Does `loadFile()` successfully parse files?
4. ✓ Are items added to store? (`store.getAllItems().length > 0`)
5. ✓ Is `TimelineProvider` connected to `KnowledgeManager`?
6. ✓ Does `sendKnowledgeData()` get called?
7. ✓ Does webview receive `knowledge:loaded` message?
8. ✓ Is `knowledgeController` initialized in webview?
9. ✓ Does `loadData()` receive non-empty items array?
10. ✓ Does `renderKnowledgeTable()` create DOM elements?

## Common Issues

### Issue: Items load but disappear on tab switch
**Cause**: Webview state not persisting
**Fix**: Re-send data on visibility change

### Issue: Items don't load at all
**Causes**:
- Frontmatter parsing fails
- Store operations fail
- postMessage serialization fails
- Controller not initialized

### Issue: Some fields missing from items
**Cause**: Serialization drops non-JSON-safe values
**Fix**: Ensure all item properties are serializable

## Related
- Diagnostic Logging Pattern
- Pathway Logging Configuration
