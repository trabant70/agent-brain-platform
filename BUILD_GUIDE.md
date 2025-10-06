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

**Last Updated:** 2025-10-05
**Version:** Based on v0.1.4 build process
