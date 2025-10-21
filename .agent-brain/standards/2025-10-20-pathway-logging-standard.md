---
title: Pathway Logging Standard
type: standard
scope: project
tags: logging, standards, debugging, best-practices
author: Claude
---

# Pathway Logging Standard

## Purpose
Define consistent logging practices across Agent Brain codebase to enable effective debugging without log clutter.

## Principles

### 1. Use Pathway Logging, Not Console
❌ **Don't:**
```typescript
console.log('Loading file:', path);
console.error('Failed:', error);
```

✅ **Do:**
```typescript
logger.info(LogCategory.EXTENSION, 'Loading file', 'loadFile',
  { path }, LogPathway.KNOWLEDGE_MANAGEMENT);

logger.error(LogCategory.EXTENSION, 'Failed to load', 'loadFile',
  { path, error }, LogPathway.KNOWLEDGE_MANAGEMENT);
```

### 2. Choose Appropriate Log Levels

| Level | When to Use | Example |
|-------|-------------|---------|
| `DEBUG` | Internal state, detailed flow | "Filtering items: 10 total, 3 match" |
| `INFO` | Important events, milestones | "Knowledge refresh complete: 15 items" |
| `WARN` | Recoverable issues | "Item has no body, using placeholder" |
| `ERROR` | Failures, exceptions | "Failed to parse frontmatter" |

### 3. Select Correct Pathway

Use pathways to group related functionality:

```typescript
// Knowledge management operations
LogPathway.KNOWLEDGE_MANAGEMENT

// Data ingestion from providers
LogPathway.DATA_INGESTION

// Filter operations
LogPathway.FILTER_APPLY

// Rendering operations
LogPathway.RENDER_PIPELINE

// User interactions
LogPathway.USER_INTERACTION

// Cross-context messaging
LogPathway.WEBVIEW_MESSAGING
```

### 4. Include Context Data

Always include relevant context objects:

```typescript
// ❌ Insufficient context
logger.info(LogCategory.EXTENSION, 'Item created');

// ✅ Rich context
logger.info(LogCategory.EXTENSION, 'Item created', 'createItem',
  {
    itemId: item.id,
    type: item.type,
    title: item.title,
    filePath: item.path
  },
  LogPathway.KNOWLEDGE_MANAGEMENT
);
```

### 5. Extension vs Webview Loggers

**Extension (Node.js):**
```typescript
import { logger, LogCategory, LogPathway } from '@agent-brain/core/infrastructure/logging/Logger';

logger.info(LogCategory.EXTENSION, 'Message', 'method', context, pathway);
```

**Webview (Browser):**
```typescript
import { webviewLogger, LogCategory, LogPathway } from '../webview/WebviewLogger';

webviewLogger.info(LogCategory.UI, 'Message', 'method', context, pathway);
```

## Log Message Structure

### Format
```
[CATEGORY] Message | method | context | [PATHWAY]
```

### Example Output
```
[EXTENSION] Knowledge refresh complete | KnowledgeManager.refreshAll | {"filesLoaded":15,"itemsInStore":15} | [KNOWLEDGE]
```

## Method Name Convention

Use fully qualified method names for clarity:

```typescript
// ✅ Clear
'KnowledgeManager.refreshAll'
'TimelineProvider.sendKnowledgeData'
'KnowledgeViewController.loadData'

// ❌ Ambiguous
'refresh'
'send'
'load'
```

## Configuration

Users can control logging via VSCode settings:

```json
{
  "agentBrain.logging.logLevel": "INFO",
  "agentBrain.logging.pathwayMode": "filter",
  "agentBrain.logging.enabledPathways": [
    "KNOWLEDGE",
    "INGEST",
    "FILTER",
    "RENDER"
  ]
}
```

## Common Patterns

### Entry/Exit Logging
```typescript
async myOperation(): Promise<void> {
  logger.info(LogCategory.EXTENSION, 'Starting operation', 'myOperation',
    { param1, param2 }, LogPathway.MY_PATHWAY);

  try {
    // ... operation ...

    logger.info(LogCategory.EXTENSION, 'Operation complete', 'myOperation',
      { result }, LogPathway.MY_PATHWAY);
  } catch (error) {
    logger.error(LogCategory.EXTENSION, 'Operation failed', 'myOperation',
      { param1, param2, error }, LogPathway.MY_PATHWAY);
    throw error;
  }
}
```

### Loop Logging
```typescript
logger.debug(LogCategory.EXTENSION, 'Processing items', 'processItems',
  { totalItems: items.length }, LogPathway.MY_PATHWAY);

for (const item of items) {
  // Log only failures or important events in loop
  if (shouldLog(item)) {
    logger.debug(LogCategory.EXTENSION, 'Processing item', 'processItems',
      { itemId: item.id }, LogPathway.MY_PATHWAY);
  }
}

logger.info(LogCategory.EXTENSION, 'Items processed', 'processItems',
  { processed: items.length }, LogPathway.MY_PATHWAY);
```

### Cross-Context Communication
```typescript
// Sender
logger.info(LogCategory.EXTENSION, 'Sending data to webview', 'send',
  { messageType: 'knowledge:loaded', itemCount: items.length },
  LogPathway.WEBVIEW_MESSAGING);

this.webview.postMessage({ type: 'knowledge:loaded', payload: data });

// Receiver
webviewLogger.info(LogCategory.WEBVIEW, 'Received data from extension', 'handler',
  { messageType: message.type, itemCount: data.items.length },
  LogPathway.WEBVIEW_MESSAGING);
```

## Anti-Patterns

### ❌ Logging in Tight Loops
```typescript
// Bad: Logs 10000 times
for (let i = 0; i < 10000; i++) {
  logger.debug(LogCategory.EXTENSION, `Processing item ${i}`);
}
```

### ❌ Logging Sensitive Data
```typescript
// Bad: Leaks user data
logger.info(LogCategory.EXTENSION, 'User logged in',
  { username, password, apiToken }); // NEVER LOG CREDENTIALS
```

### ❌ Logging Without Context
```typescript
// Bad: What failed? Where?
logger.error(LogCategory.EXTENSION, 'Failed');

// Good: Clear context
logger.error(LogCategory.EXTENSION, 'Failed to load knowledge item',
  'KnowledgeManager.loadFile',
  { filePath: uri.fsPath, error },
  LogPathway.KNOWLEDGE_MANAGEMENT);
```

## Verification

To verify logging is working:
1. Enable DEBUG level in settings
2. Enable relevant pathways
3. Open Output panel → "Agent Brain"
4. Perform action
5. Verify logs appear with correct format

## Related
- Diagnostic Logging Pattern
- VSCode Extension to Webview Data Flow
