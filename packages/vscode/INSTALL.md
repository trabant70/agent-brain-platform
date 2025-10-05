# Agent Brain Platform - Installation & Testing

## Extension Built Successfully ✅

**Package:** `agent-brain-platform-0.1.0.vsix` (1.8MB)
**Location:** `/mnt/c/projects/agent-brain-platform/packages/vscode/`

## Rebuilding

To rebuild the extension after code changes:
```bash
npm run package
```

Note: The package script uses `scripts/package-extension.sh` which creates a standalone copy with production dependencies installed (workaround for monorepo node_modules hoisting).

## Installation

### Method 1: Command Line
```bash
code --install-extension /mnt/c/projects/agent-brain-platform/packages/vscode/agent-brain-platform-0.1.0.vsix
```

### Method 2: VS Code UI
1. Open VS Code
2. Go to Extensions view (Ctrl+Shift+X / Cmd+Shift+X)
3. Click "..." menu (top right)
4. Select "Install from VSIX..."
5. Navigate to and select `agent-brain-platform-0.1.0.vsix`

## How to Use

### Open Timeline
1. Open any git repository in VS Code
2. Click the "AB Timeline" icon in the Activity Bar (left sidebar)
3. Or use Command Palette (Ctrl+Shift+P): "Show Repository Timeline"
4. Or keyboard shortcut: Ctrl+Shift+T (Cmd+Shift+T on Mac)

### Timeline Location
The timeline displays in the **PANEL** (bottom of VS Code), not the sidebar.
Look for the "AB Timeline" tab in the bottom panel.

### What to Test

**Critical Features to Verify:**
1. ✅ Timeline displays in bottom panel
2. ✅ Events render with correct shapes and colors
3. ✅ **Range Slider works** (time window selector at top)
4. ✅ **Filtering works** (Control Center panel on right)
   - Filter by event types
   - Filter by branches
   - Filter by authors
5. ✅ Event tooltips show on hover
6. ✅ Zoom and pan works
7. ✅ Statistics display correctly

## Architecture Details

### How the Extension Works

**Provider loads webview with these assets:**
```javascript
// Generated HTML includes:
dist/webview/vendors.js        // 716KB - d3 library
dist/webview/webview.js         // 306KB - timeline visualization
dist/visualization/styles/timeline.css  // All styles
```

**Dist Structure:**
```
dist/
├── extension.js               # Extension host code
├── webview/
│   ├── vendors.js            # d3 library bundle
│   ├── webview.js            # Timeline visualization
│   └── webview.html          # (not used - HTML is generated)
└── visualization/
    └── styles/
        ├── base.css
        ├── timeline.css
        ├── variables.css
        └── components/
            ├── range-selector.css  # Critical: time slider
            ├── controls.css
            ├── popup.css
            └── ...
```

### Key Files Preserved

**Rendering:**
- D3TimelineRenderer.ts - Core D3 visualization
- EventRenderer.ts - Event shapes/colors
- TimelineRenderer.ts - Base renderer
- LegendRenderer.ts - Legend rendering

**Interaction:**
- FilterController.ts - Complete filtering logic
- range-selector.css - Time range slider
- FilterStateManager.ts - Filter state

**Data:**
- DataOrchestrator - Data flow
- GitProvider - Local git data
- GitHubProvider - GitHub API data

## Troubleshooting

**Timeline not showing?**
- Make sure you're in a git repository
- Check the PANEL (bottom), not sidebar
- Look for "AB Timeline" tab

**No events displaying?**
- Check that the repository has commits
- Try the refresh button (circular arrow icon)
- Check VS Code Developer Console (Help → Toggle Developer Tools)

**Filters not working?**
- Open Control Center panel (right side of timeline)
- Make sure event types are selected
- Check that date range includes your commits

## Build Information

**Built from:** `/mnt/c/projects/agent-brain-platform/`
**Source:** Timeline code migrated from original repo
**Webpack:** Dual bundle (extension + webview)
**Assets:** Copied with npm script to correct locations

**Migration validated:** All critical features preserved!
