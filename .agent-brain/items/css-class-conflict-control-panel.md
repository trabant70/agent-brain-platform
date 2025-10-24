---
title: CSS Class Name Conflicts Break Component Visibility
type: learning
scope: project
tags: css, webview, debugging, ui
source: control-panel-redesign
author: Agent Session
version: 1
---

# CSS Class Name Conflicts Break Component Visibility

## Problem
Control Panel tabs appeared completely empty. Both Filter and Configuration tabs showed blank white space with no content.

## Root Cause
Used generic class name `.tab-content` which conflicted with main timeline's `.tab-content` in `tabs.css`:

```css
/* tabs.css - Main Timeline */
.tab-content {
  display: none;      /* Hid Control Panel wrapper */
  position: absolute; /* Broke layout */
}
```

Control Panel wrapper had same class name, causing main timeline CSS to hide it.

## Solution
Renamed Control Panel wrapper from `.tab-content` to `.tab-panels-container`:

```typescript
// FilterController.ts
<div class="tab-panels-container">  // Was: tab-content
  <div class="tab-panel active">...</div>
</div>
```

## Lesson
- **Avoid generic class names** like `.content`, `.wrapper`, `.container`, `.tab-content`
- **Use component-specific prefixes** (e.g., `.control-panel-tabs`, `.cp-panels`)
- **Check for existing class names** before adding new ones
- **CSS conflicts cause silent failures** - no errors, just hidden content

## Detection
- Inspect DOM in DevTools
- Check Computed Styles for unexpected `display: none` or `position: absolute`
- Search codebase for duplicate class names

## Related
- File: `FilterController.ts` line 305
- File: `control-panel.css` lines 143-147
- Version: 0.2.25
