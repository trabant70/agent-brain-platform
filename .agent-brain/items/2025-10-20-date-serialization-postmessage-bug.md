---
title: Date Serialization Bug in postMessage Communication
type: learning
scope: project
tags: bug-fix, vscode, webview, serialization, debugging
author: Claude
---

# Date Serialization Bug in postMessage Communication

## Context
After implementing comprehensive diagnostic logging, we discovered that knowledge items were loading (7 items received by webview) but crashing during rendering with:

```
TypeError: a.metadata.updatedAt.getTime is not a function
```

## Root Cause

When data crosses from Node.js extension to Chromium webview via `postMessage()`, JavaScript **automatically serializes** the data to JSON for transmission. During this process:

- ✅ Objects, arrays, primitives → preserved
- ✅ Strings, numbers, booleans → preserved
- ❌ **Date objects → converted to ISO 8601 strings**
- ❌ Functions → lost
- ❌ Class instances → become plain objects

## The Bug

**Extension Side (Node.js):**
```typescript
const item: KnowledgeItem = {
  id: 'abc123',
  title: 'My Item',
  metadata: {
    createdAt: new Date(),      // Date object
    updatedAt: new Date()       // Date object
  }
};

webview.postMessage({
  type: 'knowledge:loaded',
  payload: { items: [item] }
});
```

**What Actually Gets Sent:**
```javascript
{
  type: 'knowledge:loaded',
  payload: {
    items: [{
      id: 'abc123',
      title: 'My Item',
      metadata: {
        createdAt: "2025-10-20T10:00:00.000Z",  // String!
        updatedAt: "2025-10-20T10:00:00.000Z"   // String!
      }
    }]
  }
}
```

**Webview Side (Chromium):**
```typescript
// This crashes because updatedAt is now a string
items.sort((a, b) => {
  return a.metadata.updatedAt.getTime()  // ❌ TypeError!
       - b.metadata.updatedAt.getTime();
});
```

## The Fix

Handle both Date objects AND date strings in comparison logic:

```typescript
items.sort((a, b) => {
  let comparison = 0;

  switch (this.state.sortBy) {
    case 'updated':
      // Handle both Date objects and ISO strings
      const dateA = a.metadata.updatedAt instanceof Date
        ? a.metadata.updatedAt.getTime()
        : new Date(a.metadata.updatedAt).getTime();
      const dateB = b.metadata.updatedAt instanceof Date
        ? b.metadata.updatedAt.getTime()
        : new Date(b.metadata.updatedAt).getTime();
      comparison = dateA - dateB;
      break;
  }

  return this.state.sortDirection === 'asc' ? comparison : -comparison;
});
```

## Why This Pattern Works

1. **Extension Context**: Dates are Date objects → `instanceof Date` returns `true` → use `.getTime()` directly
2. **Webview Context**: Dates are strings → `instanceof Date` returns `false` → convert to Date first → then use `.getTime()`
3. **Robust**: Works in both contexts without crashes

## Alternative Solutions

### Option 1: Send Timestamps Instead of Dates
```typescript
// Extension side - convert to timestamps before sending
const item = {
  metadata: {
    createdAt: new Date().getTime(),    // number
    updatedAt: new Date().getTime()     // number
  }
};
```

**Pros**: No conversion needed, numbers serialize perfectly
**Cons**: Lose Date object methods on extension side

### Option 2: Use String Comparison
```typescript
// Works because ISO 8601 strings sort correctly
comparison = a.metadata.updatedAt.localeCompare(b.metadata.updatedAt);
```

**Pros**: Simple, works for strings
**Cons**: Doesn't work if Date objects on extension side

### Option 3: Custom Serialization
```typescript
// Create a custom toJSON method
class KnowledgeItem {
  toJSON() {
    return {
      ...this,
      metadata: {
        createdAt: this.metadata.createdAt.getTime(),
        updatedAt: this.metadata.updatedAt.getTime()
      }
    };
  }
}
```

**Pros**: Full control over serialization
**Cons**: More complex, requires class instances

## Lessons Learned

### 1. postMessage Always Serializes
Never assume data types survive the extension ↔ webview boundary. Always handle serialized forms.

### 2. Test Cross-Context Code Paths
Code that works in one context might crash in the other due to serialization.

### 3. Diagnostic Logging is Essential
Without comprehensive logging, we would have had no idea that:
- ✅ 7 items were found by extension
- ✅ Data was sent via postMessage
- ✅ Webview received the data
- ❌ Crash happened during sorting

The logs showed us **exactly** where it failed.

### 4. Check for Type Assumptions
Any code that assumes a specific type (like `Date`) across the postMessage boundary needs defensive checks.

## Detection Pattern

Look for these patterns in webview code:
```typescript
// ❌ Dangerous - assumes Date object
item.date.getTime()
item.date.toISOString()
item.date.getFullYear()

// ✅ Safe - handles both
item.date instanceof Date ? item.date.getTime() : new Date(item.date).getTime()
```

## Related Issues

This same bug could occur with:
- `createdAt` fields
- Any other Date fields in the data model
- Other non-JSON-serializable types (RegExp, Map, Set, etc.)

## Fix Location

**File**: `packages/core/src/domains/visualization/ui/KnowledgeViewController.ts`
**Method**: `getFilteredItems()`
**Lines**: 546-555

## Verification

After fix:
1. ✅ Build successful
2. ✅ Extension packaged
3. 🔲 Need to test: Knowledge items should now appear in table

## Impact

**Before Fix**: Knowledge tab completely broken - empty table despite data loading
**After Fix**: Knowledge items should display correctly with proper sorting

## Related

- VSCode Extension to Webview Data Flow (golden-path)
- Diagnostic Logging Pattern (design-pattern)
- Knowledge Tab Diagnostic Logging Implementation (learning)
