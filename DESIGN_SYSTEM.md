# Agent Brain Platform - Design System

**Version**: 1.0  
**Date**: 2025-10-21  
**Status**: Implementation Ready

## Executive Summary

This design system establishes a unified visual language for the Agent Brain Platform VSCode extension, ensuring consistency across all UI components while respecting VSCode's native design patterns.

---

## Design Principles

### 1. **Consistency Over Novelty**
Similar interactions should look and behave identically across the entire interface.

### 2. **VSCode Native First**
Leverage VSCode's design tokens and patterns to feel native, not foreign.

### 3. **Progressive Disclosure**
Use collapsible sections to manage complexity without overwhelming users.

### 4. **Immediate Feedback**
Every interaction should provide instant visual feedback.

### 5. **Accessible by Default**
High contrast ratios, keyboard navigation, and screen reader support.

---

## Color System

### Primary Palette

```css
/* Brand Colors */
--ab-accent-primary: #00d4ff;      /* Teal - Primary actions, active states */
--ab-accent-secondary: #00ff88;    /* Green - Success, secondary highlights */
--ab-accent-hover: #00b8e6;        /* Darker teal - Hover states */

/* Semantic Colors */
--ab-success: #10b981;             /* Emerald - Success states */
--ab-warning: #f59e0b;             /* Amber - Warning states */
--ab-error: #ef4444;               /* Red - Error states */
--ab-info: #3b82f6;                /* Blue - Info states */

/* Neutral Grays (use VSCode variables primarily) */
--ab-gray-50: rgba(255, 255, 255, 0.05);
--ab-gray-100: rgba(255, 255, 255, 0.1);
--ab-gray-200: rgba(255, 255, 255, 0.15);
--ab-gray-300: rgba(255, 255, 255, 0.2);
```

### Color Usage Matrix

| Element | Default | Hover | Active | Disabled |
|---------|---------|-------|--------|----------|
| Primary Button | `--ab-accent-primary` | `--ab-accent-hover` | `--ab-accent-primary` + shadow | opacity: 0.5 |
| Secondary Button | `--ab-gray-100` | `--ab-gray-200` | `--ab-gray-300` | opacity: 0.5 |
| Accordion Header | `--ab-gray-50` | `--ab-gray-100` | `--ab-gray-200` | N/A |
| Border Accent | `--ab-accent-primary` @ 40% | `--ab-accent-primary` @ 100% | `--ab-accent-primary` @ 100% | opacity: 0.3 |

---

## Typography

### Scale

```css
--ab-text-xs: 10px;      /* Labels, badges */
--ab-text-sm: 11px;      /* Secondary text */
--ab-text-base: 12px;    /* Body text */
--ab-text-md: 13px;      /* Emphasis */
--ab-text-lg: 14px;      /* Headings */
--ab-text-xl: 16px;      /* Page titles */
```

### Weights

```css
--ab-font-normal: 400;
--ab-font-medium: 500;
--ab-font-semibold: 600;
--ab-font-bold: 700;
```

---

## Spacing System

### 4px Base Unit

```css
--ab-space-1: 4px;
--ab-space-2: 8px;
--ab-space-3: 12px;
--ab-space-4: 16px;
--ab-space-5: 20px;
--ab-space-6: 24px;
--ab-space-8: 32px;
```

---

## Component Patterns

### 1. Collapsible Sections

**Unified Pattern for:**
- Claude.md file accordion items
- Knowledge table group headers
- Control panel filter sections

#### Visual Spec

```
┌─────────────────────────────────────────────────┐
│ ▼ Section Title                      (12)       │  ← Header
├─────────────────────────────────────────────────┤
│                                                 │
│   Content goes here...                          │  ← Body (collapsed: hidden)
│                                                 │
└─────────────────────────────────────────────────┘

States:
- Default: Light background, subtle border
- Hover: Brighter background, accent border
- Collapsed: ▶ icon, no body visible
- Expanded: ▼ icon, body visible
```

#### CSS Pattern

```css
.ab-collapsible {
  border: 1px solid var(--vscode-panel-border);
  border-left: 3px solid rgba(0, 212, 255, 0.4);
  border-radius: 6px;
  background: var(--vscode-sideBar-background);
  margin-bottom: var(--ab-space-2);
  transition: all 0.2s ease;
}

.ab-collapsible:hover {
  border-left-color: var(--ab-accent-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.ab-collapsible-header {
  display: flex;
  align-items: center;
  gap: var(--ab-space-2);
  padding: var(--ab-space-2) var(--ab-space-3);
  cursor: pointer;
  user-select: none;
  background: rgba(0, 212, 255, 0.05);
  border-radius: 6px 6px 0 0;
  transition: background-color 0.15s ease;
}

.ab-collapsible-header:hover {
  background: rgba(0, 212, 255, 0.12);
}

.ab-collapsible-icon {
  font-size: var(--ab-text-xs);
  color: var(--ab-accent-primary);
  transition: transform 0.2s ease;
  width: 12px;
  text-align: center;
}

.ab-collapsible.collapsed .ab-collapsible-icon {
  transform: rotate(-90deg);
}

.ab-collapsible-title {
  flex: 1;
  font-weight: var(--ab-font-semibold);
  font-size: var(--ab-text-base);
  color: var(--vscode-foreground);
}

.ab-collapsible-badge {
  background: rgba(0, 212, 255, 0.2);
  color: var(--ab-accent-primary);
  padding: 2px var(--ab-space-2);
  border-radius: 12px;
  font-size: var(--ab-text-xs);
  font-weight: var(--ab-font-bold);
}

.ab-collapsible-body {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.ab-collapsible:not(.collapsed) .ab-collapsible-body {
  max-height: 10000px;
  padding: var(--ab-space-2) var(--ab-space-3);
  border-top: 1px solid var(--vscode-panel-border);
}
```

### 2. Buttons

#### Primary Button

```css
.ab-btn-primary {
  padding: 6px 16px;
  background: var(--ab-accent-primary);
  color: var(--vscode-editor-background);
  border: 1px solid var(--ab-accent-primary);
  border-radius: 6px;
  font-size: var(--ab-text-base);
  font-weight: var(--ab-font-semibold);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 212, 255, 0.2);
}

.ab-btn-primary:hover {
  background: var(--ab-accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 212, 255, 0.3);
}

.ab-btn-primary:active {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(0, 212, 255, 0.2);
}

.ab-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}
```

#### Secondary Button

```css
.ab-btn-secondary {
  padding: 6px 16px;
  background: rgba(0, 212, 255, 0.1);
  color: var(--ab-accent-primary);
  border: 1px solid rgba(0, 212, 255, 0.3);
  border-radius: 6px;
  font-size: var(--ab-text-base);
  font-weight: var(--ab-font-semibold);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.ab-btn-secondary:hover {
  background: rgba(0, 212, 255, 0.2);
  border-color: var(--ab-accent-primary);
  transform: translateY(-1px);
}
```

#### Icon Button

```css
.ab-btn-icon {
  padding: var(--ab-space-1) var(--ab-space-2);
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: var(--ab-text-md);
  opacity: 0.7;
  transition: all 0.2s ease;
  border-radius: 4px;
}

.ab-btn-icon:hover {
  opacity: 1;
  background: var(--vscode-toolbar-hoverBackground);
}
```

### 3. Toggle/Segmented Controls

Used for grouping buttons (Type/Scope/Tag):

```css
.ab-toggle-group {
  display: inline-flex;
  align-items: center;
  gap: var(--ab-space-1);
  padding: var(--ab-space-1);
  border-radius: 6px;
  background: rgba(0, 212, 255, 0.05);
  border: 1px solid rgba(0, 212, 255, 0.15);
}

.ab-toggle-btn {
  padding: var(--ab-space-1) var(--ab-space-3);
  background: transparent;
  color: var(--vscode-foreground);
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: var(--ab-text-base);
  font-weight: var(--ab-font-medium);
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.ab-toggle-btn:hover {
  background: rgba(0, 212, 255, 0.1);
  border-color: rgba(0, 212, 255, 0.3);
}

.ab-toggle-btn.active {
  background: var(--ab-accent-primary);
  color: var(--vscode-editor-background);
  border-color: var(--ab-accent-primary);
  font-weight: var(--ab-font-semibold);
  box-shadow: 0 2px 4px rgba(0, 212, 255, 0.3);
}
```

### 4. Badges

```css
.ab-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px var(--ab-space-2);
  border-radius: 3px;
  font-size: var(--ab-text-xs);
  font-weight: var(--ab-font-medium);
}

.ab-badge-primary {
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
}

.ab-badge-count {
  background: rgba(0, 212, 255, 0.2);
  color: var(--ab-accent-primary);
  font-weight: var(--ab-font-bold);
  border-radius: 12px;
}
```

---

## Animation & Motion

### Principles

1. **Duration**: 150-300ms for most transitions
2. **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)` for natural motion
3. **Property**: Animate `transform` and `opacity` for performance

### Standard Timings

```css
--ab-transition-fast: 150ms;
--ab-transition-base: 200ms;
--ab-transition-slow: 300ms;

--ab-ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
--ab-ease-decelerate: cubic-bezier(0, 0, 0.2, 1);
--ab-ease-accelerate: cubic-bezier(0.4, 0, 1, 1);
```

---

## Elevation & Shadows

```css
--ab-shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.1);
--ab-shadow-md: 0 2px 8px rgba(0, 0, 0, 0.15);
--ab-shadow-lg: 0 4px 12px rgba(0, 0, 0, 0.2);
--ab-shadow-xl: 0 8px 24px rgba(0, 0, 0, 0.3);

/* Accent shadows (for primary actions) */
--ab-shadow-accent-sm: 0 2px 8px rgba(0, 212, 255, 0.2);
--ab-shadow-accent-md: 0 4px 12px rgba(0, 212, 255, 0.3);
--ab-shadow-accent-lg: 0 6px 20px rgba(0, 212, 255, 0.4);
```

---

## Implementation Plan

### Phase 1: Foundation (Core Variables)
1. Create `design-tokens.css` with all variables
2. Import in base.css
3. Test in isolation

### Phase 2: Component Library
1. Create `ab-components.css` with unified patterns
2. Implement collapsible component class
3. Implement button variants
4. Implement badge/toggle variants

### Phase 3: Migration
1. Update knowledge.css to use new components
2. Update control-panel.css to use new components
3. Remove duplicate/inconsistent styles
4. Test all interactions

### Phase 4: Validation
1. Visual regression testing
2. Keyboard navigation testing
3. Theme switching (light/dark)
4. Accessibility audit

---

## File Structure

```
styles/
├── design-tokens.css        # All CSS variables
├── ab-components.css        # Unified component patterns
├── base.css                 # Global styles (imports tokens + components)
├── timeline.css             # Timeline-specific styles
└── components/
    ├── knowledge.css        # Uses ab-components
    ├── control-panel.css    # Uses ab-components
    ├── tabs.css             # Uses ab-components
    ├── stats.css            # Uses ab-components
    └── popup.css            # Uses ab-components
```

---

## Migration Checklist

### Collapsible Sections
- [ ] Claude.md accordion items → `.ab-collapsible`
- [ ] Knowledge group headers → `.ab-collapsible-header`
- [ ] Control panel sections → `.ab-collapsible`

### Buttons
- [ ] Primary actions → `.ab-btn-primary`
- [ ] Secondary actions → `.ab-btn-secondary`
- [ ] Icon buttons → `.ab-btn-icon`
- [ ] Toggle groups → `.ab-toggle-group` + `.ab-toggle-btn`

### Badges
- [ ] Count badges → `.ab-badge-count`
- [ ] Type badges → `.ab-badge-primary`

---

## Success Criteria

✅ All collapsible sections use identical icon, animation, and layout  
✅ All buttons share consistent padding, radius, and hover effects  
✅ Color palette reduced to core variables only  
✅ No visual regressions in existing functionality  
✅ Improved perceived performance (smoother animations)  
✅ Better accessibility (consistent focus states)  

---

**Next Steps**: Create design-tokens.css and ab-components.css, then migrate existing components.
