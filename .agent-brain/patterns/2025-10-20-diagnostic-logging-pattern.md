---
title: Diagnostic Logging for Data Flow Debugging
type: design-pattern
scope: project
tags: logging, debugging, data-flow, diagnostics
author: Claude
---

# Diagnostic Logging for Data Flow Debugging

## Context
When debugging complex data flows in VSCode extensions (Node.js ↔ Webview), it's difficult to identify where data transformation or communication fails without comprehensive logging.

## Problem
Data may fail to flow through the pipeline at any point:
- File loading
- Parsing/transformation
- Store operations
- Message passing between contexts
- UI rendering

Without logging at each step, debugging becomes trial-and-error.

## Solution
Add comprehensive diagnostic logging at every stage of the data flow:

### 1. Entry Points
Log when data enters each component:
```typescript
logger.info(
  LogCategory.EXTENSION,
  'Starting knowledge refresh',
  'KnowledgeManager.refreshAll',
  { knowledgeBaseDir: this.knowledgeBaseDir },
  LogPathway.KNOWLEDGE_MANAGEMENT
);
```

### 2. Data Transformations
Log before and after transformations:
```typescript
// Before
logger.debug(LogCategory.EXTENSION, 'File content read', 'loadFile',
  { filePath: uri.fsPath, contentLength: contentStr.length });

// After parsing
logger.debug(LogCategory.EXTENSION, 'File parsed into knowledge item', 'loadFile',
  { itemId: item.id, itemType: item.type, itemValid: item.valid });
```

### 3. Store Operations
Log all CRUD operations:
```typescript
this.store.addItem(item);
logger.debug(LogCategory.EXTENSION, 'Added new item to store', 'loadFile',
  { itemId: item.id, filePath: uri.fsPath });
```

### 4. Cross-Context Communication
Log message sending and receiving:
```typescript
// Extension side
logger.info(LogCategory.EXTENSION, 'Sent knowledge data to webview', 'sendKnowledgeData',
  { itemCount: items.length });

// Webview side
webviewLogger.info(LogCategory.WEBVIEW, 'Received knowledge data', 'handleKnowledgeLoaded',
  { itemsCount: data.items?.length });
```

### 5. Rendering Operations
Log UI updates:
```typescript
webviewLogger.info(LogCategory.UI, 'Knowledge table rendered', 'renderKnowledgeTable',
  { itemsRendered: items.length, groupsRendered: groups.size });
```

## Benefits
1. **Pinpoint failures**: Logs show exactly where data stops flowing
2. **Verify transformations**: Ensure data shape is correct at each stage
3. **Performance insights**: See which operations are slow
4. **Historical debugging**: Review logs after the fact

## Anti-Patterns
❌ Using `console.log` - clutters logs, no structure
❌ Logging only errors - can't see successful flow
❌ Too verbose in production - use pathway filtering

## Related
- Pathway Logging Configuration (standards)
- VSCode Extension Architecture (golden-paths)
