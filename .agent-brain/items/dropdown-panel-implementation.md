---
title: Dropdown Panel Implementation Pattern
type: design-pattern
scope: project
tags: ui, css, webview, control-panel
source: control-panel-redesign
author: Agent Session
version: 1
---

# Dropdown Panel Implementation Pattern

## Intent
Create dropdown panel that slides from top when triggered, with tab navigation and collapsible sections.

## Structure

### HTML
```html
<button class="controls-trigger" id="controls-trigger">Controls</button>

<div class="control-panel">
  <div class="control-panel-content">
    <div class="tab-navigation">
      <div class="tab-buttons">
        <button class="tab-btn active" data-tab="filter">Filter</button>
        <button class="tab-btn" data-tab="config">Config</button>
      </div>
      <button class="close-panel-btn">×</button>
    </div>

    <div class="tab-panels-container">
      <div class="tab-panel active" data-tab="filter">
        <!-- Filter content -->
      </div>
      <div class="tab-panel" data-tab="config">
        <!-- Config content -->
      </div>
    </div>
  </div>
</div>
```

### CSS
```css
.control-panel {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 1200px;
  max-height: 0;              /* Collapsed */
  overflow: hidden;
  transition: max-height 0.4s;
  z-index: 1000;
}

.control-panel.open {
  max-height: 80vh;           /* Expanded */
  overflow-y: auto;
}

.tab-panel {
  display: none;
}

.tab-panel.active {
  display: block;
}
```

### JavaScript
```typescript
togglePanel() {
  this.panel.classList.toggle('open');
}

switchTab(tabName: string) {
  // Update buttons
  this.panel.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // Update panels
  this.panel.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.dataset.tab === tabName);
  });
}
```

## Key Points
1. **Use unique class names** - Avoid generic names like `.tab-content`
2. **max-height animation** - Smooth dropdown effect
3. **Fixed positioning** - Overlay on top of content
4. **Tab state management** - `.active` class controls visibility
5. **Outside click handling** - Close on click outside panel

## Benefits
- Clean visual design
- Smooth animations
- Tab organization
- Responsive width
- VSCode theme integration

## Related
- Control Panel: `FilterController.ts`
- Styles: `control-panel.css`
- Template: `timeline.html`
