# Build Guide - Agent Brain Platform

## Overview
This document captures critical learnings about building the VSIX package for the Agent Brain Platform VSCode extension.

## Architecture Context

The project is a **monorepo with two packages:**
- `packages/core` - Core domain logic (TypeScript)
- `packages/vscode` - VSCode extension wrapper

**Key architectural point:** Webpack bundles **directly from TypeScript source**, not from compiled JavaScript in `dist/`.

## Critical Build Process

### The Webpack Source Resolution
```javascript
// packages/vscode/webpack.config.js
resolve: {
  alias: {
    '@agent-brain/core': path.resolve(__dirname, '../core/src')  // ← Points to SOURCE
  }
}
```

**This means:** Changes to TypeScript files in `packages/core/src/` must be picked up by webpack's `ts-loader`, not from pre-compiled `dist/` files.

## Build Steps (Correct Order)

### 1. Clean Everything
```bash
# Clean VSCode package
cd packages/vscode
npm run clean
rm -rf dist node_modules/.cache

# Clean Core package
cd ../core
rm -rf dist
```

**Why:** Webpack and TypeScript can cache old compilations. A clean slate ensures fresh builds.

### 2. Build Core Package (Optional but Recommended)
```bash
cd packages/core
npm run build
```

**Note:** This creates `dist/` with compiled JS, but webpack doesn't use it. However, building core first can help catch TypeScript errors early.

### 3. Build VSCode Extension
```bash
cd packages/vscode
npm run build
```

**What happens:**
- Webpack compiles TypeScript from `../core/src/` directly
- Creates two bundles:
  - `dist/extension.js` - Node.js extension host code
  - `dist/webview/webview.js` - Browser webview code
- Copies assets (CSS, HTML templates) from core

### 4. Package VSIX
```bash
npm run package
```

**Output:** `agent-brain-platform-{version}.vsix`

## Verification Checklist

After building, verify your changes are included:

### For Webview Changes (UI, Timeline, Filters, Legend)
```bash
# Check if your code is in the webview bundle
grep -o "yourVariableName" packages/vscode/dist/webview/webview.js
```

### For Extension Changes (Providers, Commands)
```bash
# Check if your code is in the extension bundle
grep -o "yourFunctionName" packages/vscode/dist/extension.js
```

### Size Check
```bash
ls -lh packages/vscode/*.vsix
```
- Normal size: ~550KB
- If significantly different, investigate

## Common Issues & Solutions

### Issue 1: Changes Not Appearing in VSIX
**Symptom:** You made changes, built successfully, but the VSIX behaves like the old version.

**Root Cause:** Webpack cached old TypeScript compilation.

**Solution:**
```bash
# Full clean rebuild
cd packages/vscode
npm run clean
rm -rf node_modules/.cache
cd ../core
rm -rf dist
npm run build
cd ../vscode
npm run build
npm run package
```

### Issue 2: TypeScript Errors in Build
**Symptom:** Build fails with TypeScript errors for files you're not using.

**Example:** Future features like `ExtensionLoader.ts`, `WebSocketAdapter.ts` that have missing dependencies.

**Solution:** Exclude from exports in `packages/core/src/domains/intelligence/adapters/index.ts`:
```typescript
export * from './base';
// Future features - disabled for now (missing dependencies)
// export * from './extensions';
// export * from './webhooks';
// export * from './testing';
```

### Issue 3: Webpack Warnings About Missing Modules
**Example:** `Can't resolve 'vscode' in webview code`

**Cause:** Webview code (browser) trying to import Node.js modules.

**Solution:** Already handled in `webpack.config.js`:
```javascript
fallback: {
  'fs': false,
  'path': false,
  'util': false
}
```

These are warnings, not errors. Build still succeeds.

## Testing the VSIX

### Install Extension
```bash
code --install-extension agent-brain-platform-0.1.4.vsix
```

### Uninstall Old Version First
If testing a rebuild:
1. Uninstall the old extension in VSCode
2. Restart VSCode
3. Install the new VSIX

**Why:** VSCode can cache extension code. Fresh install ensures you're testing the new build.

### Verify Changes Visually
For UI changes, check the actual UI elements:
- Open the timeline view
- Check Configuration tab for provider checkboxes
- Verify legend tabs and spacing
- Test filter behavior

## Version Management

### Incrementing Version
Edit `packages/vscode/package.json`:
```json
{
  "version": "0.1.X"
}
```

### Version in VSIX Filename
The VSIX filename automatically includes the version from `package.json`.

## Node Modules Structure

**The project uses npm workspaces with hoisting:**

```
./node_modules/                    # Root (hoisted dependencies)
./packages/core/node_modules/      # Core-specific (version conflicts only)
./packages/vscode/node_modules/    # VSCode-specific (version conflicts only)
```

**This is correct!** Don't try to "clean up" the child node_modules - they contain packages with specific version requirements.

## Build Artifacts

### What Gets Bundled in VSIX
- `dist/extension.js` - Extension host code (~330KB)
- `dist/webview/` - Webview bundles (~1MB)
  - `webview.js` - Your UI code
  - `vendors.js` - Third-party libraries (D3, etc.)
  - `webview.html` - Timeline HTML template
- `dist/visualization/` - CSS and templates
- `docs/` - Documentation
- `images/` - Icons
- `package.json` - Extension manifest

### What Doesn't Get Bundled
- Source TypeScript files (`.ts`)
- `node_modules/` (bundled dependencies are in the webpack output)
- Test files
- Build configuration files

## Quick Reference Commands

```bash
# Full clean rebuild and package
cd packages/vscode && npm run clean && rm -rf node_modules/.cache
cd ../core && rm -rf dist && npm run build
cd ../vscode && npm run build && npm run package

# Quick rebuild (when confident no cache issues)
cd packages/vscode && npm run build && npm run package

# Verify changes in bundle
grep -o "yourCodeHere" packages/vscode/dist/webview/webview.js

# Install and test
code --install-extension packages/vscode/agent-brain-platform-0.1.4.vsix
```

## Architecture-Specific Notes

### Intelligence Domain
- Located in `packages/core/src/domains/intelligence/`
- Three main systems: Learning, Patterns, ADRs
- File-based storage in `.agent-brain/` directory
- All emit CanonicalEvents for timeline integration

### Visualization Domain
- Located in `packages/core/src/domains/visualization/`
- Webview code runs in browser context (no Node.js APIs)
- D3.js for timeline rendering
- Filter and legend controllers for UI

### Provider Architecture
- Git Provider: Always enabled by default
- GitHub Provider: Disabled by default (requires auth)
- Intelligence Provider: Disabled by default (user opt-in)
- Providers are toggled via Configuration tab

## Critical: CSS Bundling Architecture

### The Correct Architecture (v0.1.14+)

**CSS is bundled into webview.js at build time, NOT inserted via HTML placeholders.**

#### File: `packages/core/src/domains/visualization/webview/main.ts`
```typescript
import * as d3 from 'd3';
import { SimpleTimelineApp } from './SimpleTimelineApp';
import { EventVisualTheme } from '../theme/EventVisualTheme';
import { webviewLogger, LogLevel, LogCategory, LogPathway } from './WebviewLogger';

// Import CSS - webpack will bundle it inline
import '../styles/timeline.css';  // ← CRITICAL: This must be present!

// Expose D3 globally
window.d3 = d3;
```

#### File: `packages/core/src/domains/visualization/templates/timeline.html`
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Repository Evolution Timeline</title>
    <!-- CSP will be injected by provider at runtime -->
    <!-- NO <meta> with {{cspSource}} placeholder -->
    <!-- NO <style>{{cssContent}}</style> section -->
</head>
<body>
    <div id="container">
        <!-- Timeline HTML structure -->
    </div>
    <!-- Webpack will inject script tags here -->
</body>
</html>
```

#### What Happens at Build Time:

1. **Webpack processes main.ts**
   - Sees `import '../styles/timeline.css'`
   - css-loader processes timeline.css and all its @imports
   - style-loader bundles CSS into webview.js

2. **Webpack processes timeline.html**
   - HtmlWebpackPlugin copies template to dist/webview/webview.html
   - Injects `<script>` tags for webview.js and vendors.js
   - Does NOT process `{{placeholders}}` - those are legacy

3. **Result: dist/webview/webview.js**
   - Contains all TypeScript code
   - Contains all CSS as JavaScript strings
   - Size: ~400KB (vs ~290KB without CSS)

#### What Happens at Runtime:

1. **Provider reads HTML template**
   ```typescript
   const htmlPath = vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'webview.html');
   const htmlContent = fs.readFileSync(htmlPath.fsPath, 'utf8');
   ```

2. **Provider injects CSP**
   ```typescript
   const csp = `default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource};`;
   const htmlWithCSP = htmlContent.replace(
     '<!-- CSP will be injected by provider at runtime -->',
     `<meta http-equiv="Content-Security-Policy" content="${csp}">`
   );
   ```

3. **Webview loads, webview.js executes**
   - style-loader injects `<style>` tags into `<head>` with all CSS
   - Timeline app initializes with styled UI

### Verification: CSS is Bundled Correctly

```bash
# Check if CSS is in the bundle
grep -o "background.*color" packages/vscode/dist/webview/webview.js | head -1

# Expected: You should see CSS rules as JavaScript strings
# Example: background: rgba(45, 45, 48, 0.95); /* Semi-transparent dark background */

# Check webview.js size
ls -lh packages/vscode/dist/webview/webview.js

# Expected: ~400KB (with CSS) vs ~290KB (without CSS)
```

### Common Mistake: Template Placeholders

**❌ WRONG (Old Architecture):**
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src {{cspSource}} 'unsafe-inline'; script-src {{cspSource}};">
<style>
    {{cssContent}}
</style>
```

**Problem:**
- `{{cspSource}}` and `{{cssContent}}` are NOT processed by webpack or the provider
- Browser sees literal `{{cspSource}}` in CSP header → CSP violation
- No CSS gets injected → broken layout

**✅ CORRECT (Current Architecture):**
```html
<!-- CSP will be injected by provider at runtime -->
```

**How it works:**
- Provider replaces comment with actual CSP meta tag
- CSS is already bundled in webview.js via import statement
- Browser loads webview.js → style-loader injects CSS → styled UI

### Recovery from Template Placeholder Issues

If you see CSP errors or missing CSS:

1. **Check main.ts has CSS import:**
   ```bash
   grep "import.*timeline.css" packages/core/src/domains/visualization/webview/main.ts
   ```
   Should return: `import '../styles/timeline.css';`

2. **Check timeline.html has NO placeholders:**
   ```bash
   grep "{{" packages/core/src/domains/visualization/templates/timeline.html
   ```
   Should return: (empty - no placeholders)

3. **Check timeline.html has CSP comment:**
   ```bash
   grep "CSP will be injected" packages/core/src/domains/visualization/templates/timeline.html
   ```
   Should return: `<!-- CSP will be injected by provider at runtime -->`

4. **Rebuild and verify CSS is bundled:**
   ```bash
   cd packages/vscode
   npm run build
   grep -o "\.range-selector" dist/webview/webview.js | head -1
   ```
   Should find CSS class names in the bundle

## Lessons Learned

### 1. Trust the Verification, Not the Build Success
✅ Build succeeded
❌ Changes not in bundle

**Always verify** with grep or visual testing. Build success doesn't guarantee code inclusion.

### 2. Clean Rebuilds Solve Most Issues
When in doubt, nuke everything and rebuild from scratch. It's faster than debugging webpack cache issues.

### 3. Webpack Caching is Aggressive
`ts-loader` and webpack both cache. The `node_modules/.cache` directory can persist stale compilations across builds.

### 4. Source Files Matter, Not Dist
For this project, changes to `packages/core/dist/` are irrelevant. Webpack reads from `packages/core/src/`.

### 5. Test with Fresh Extension Install
Rebuilding the VSIX isn't enough. VSCode caches extensions. Uninstall → Restart → Reinstall for true verification.

### 6. CRITICAL: Git Stash Can Lose Uncommitted Changes
**Incident Report (2025-10-06):**

Working changes to timeline.html and main.ts were NEVER COMMITTED. During a console.log removal session, `git stash` + `git stash pop` reverted these files to the old committed version with template placeholders.

**Result:** v0.1.15-0.1.17 were broken (CSP errors, no CSS)

**Prevention:**
- **ALWAYS commit working changes immediately** - don't leave critical architecture changes uncommitted
- **Use git status before stashing** - know what you're about to lose
- **Test after stash pop** - verify working state is restored

**Committed fix:** `cd9a9df` - Restored CSS import and template comment

### 7. Template Placeholders Are Legacy - Do Not Use
The `{{cspSource}}` and `{{cssContent}}` placeholders in timeline.html are from an old architecture. They are NOT processed by:
- Webpack (doesn't know about them)
- HtmlWebpackPlugin (copies them literally)
- Provider code (doesn't replace them)

Modern architecture uses:
- CSS import in main.ts (webpack bundles it)
- CSP comment placeholder in HTML (provider replaces it)

## Future Improvements

### Suggested Build Enhancements
1. **Pre-build verification script:** Check if source files have uncommitted changes
2. **Post-build verification:** Automatically grep for key symbols to verify inclusion
3. **Cache-busting flag:** Add `--no-cache` option to webpack build
4. **Build manifest:** Generate a file listing all bundled source files with timestamps

### Suggested CI/CD
1. Automated clean builds on every commit
2. Automated VSIX testing in isolated VSCode instance
3. Version bump automation
4. Build artifact archiving

## Questions?

If the build isn't working:
1. Check this guide first
2. Try a full clean rebuild
3. Verify with grep
4. Test with fresh extension install
5. If still failing, compare bundle timestamps with source timestamps

---

**Last Updated:** 2025-10-06
**Version:** Based on v0.1.18 build process (CSS bundling architecture documented)
