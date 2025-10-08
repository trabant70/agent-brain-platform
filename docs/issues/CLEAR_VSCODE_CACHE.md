# Clear VSCode Extension Cache

## The Problem
VSCode aggressively caches extensions. Even after uninstalling and reinstalling a VSIX, you might still see old behavior because VSCode is using cached files.

## Solution: Nuclear Option (Guaranteed to Work)

### Windows
```powershell
# 1. Close VSCode completely
# 2. Open PowerShell and run:

# Delete extension installation cache
Remove-Item -Recurse -Force "$env:USERPROFILE\.vscode\extensions\agent-brain.agent-brain-platform-*"

# Delete extension storage (settings, cached data)
Remove-Item -Recurse -Force "$env:APPDATA\Code\User\globalStorage\agent-brain.agent-brain-platform"
Remove-Item -Recurse -Force "$env:APPDATA\Code\User\workspaceStorage\*\agent-brain.agent-brain-platform"

# Delete webview cache (critical for UI changes!)
Remove-Item -Recurse -Force "$env:APPDATA\Code\Cache"
Remove-Item -Recurse -Force "$env:APPDATA\Code\CachedData"
Remove-Item -Recurse -Force "$env:APPDATA\Code\CachedExtensions"
Remove-Item -Recurse -Force "$env:APPDATA\Code\CachedExtensionVSIXs"

# 3. Restart VSCode
# 4. Install fresh VSIX
code --install-extension agent-brain-platform-0.1.4.vsix
```

### Linux/WSL
```bash
# 1. Close VSCode completely
# 2. Run:

# Delete extension installation
rm -rf ~/.vscode/extensions/agent-brain.agent-brain-platform-*

# Delete extension storage
rm -rf ~/.config/Code/User/globalStorage/agent-brain.agent-brain-platform
rm -rf ~/.config/Code/User/workspaceStorage/*/agent-brain.agent-brain-platform

# Delete webview cache (critical!)
rm -rf ~/.config/Code/Cache
rm -rf ~/.config/Code/CachedData
rm -rf ~/.config/Code/CachedExtensions
rm -rf ~/.config/Code/CachedExtensionVSIXs

# 3. Restart VSCode
# 4. Install fresh VSIX
code --install-extension agent-brain-platform-0.1.4.vsix
```

### macOS
```bash
# 1. Close VSCode completely
# 2. Run:

# Delete extension installation
rm -rf ~/.vscode/extensions/agent-brain.agent-brain-platform-*

# Delete extension storage
rm -rf ~/Library/Application\ Support/Code/User/globalStorage/agent-brain.agent-brain-platform
rm -rf ~/Library/Application\ Support/Code/User/workspaceStorage/*/agent-brain.agent-brain-platform

# Delete webview cache (critical!)
rm -rf ~/Library/Application\ Support/Code/Cache
rm -rf ~/Library/Application\ Support/Code/CachedData
rm -rf ~/Library/Application\ Support/Code/CachedExtensions
rm -rf ~/Library/Application\ Support/Code/CachedExtensionVSIXs

# 3. Restart VSCode
# 4. Install fresh VSIX
code --install-extension agent-brain-platform-0.1.4.vsix
```

## Quick Method (Less Nuclear, Try First)

### Developer Tools Cache Clear
1. Open VSCode
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
3. Type: `Developer: Reload Window`
4. If that doesn't work, try: `Developer: Clear Editor History`

### Webview-Specific Cache Clear
1. Open the webview (timeline view)
2. Press `Ctrl+Shift+P`
3. Type: `Developer: Open Webview Developer Tools`
4. In the DevTools console, run:
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

## Why This Happens

VSCode caches:
1. **Extension code** - The actual extension.js bundle
2. **Webview assets** - HTML, CSS, JavaScript for webviews
3. **Extension storage** - Settings, state data
4. **Compiled code cache** - Pre-parsed JavaScript

When you install a new VSIX with the same version number (0.1.4), VSCode may not detect changes and continues using cached files.

## Best Practice for Development

### Always increment version when testing changes
```json
// packages/vscode/package.json
{
  "version": "0.1.5"  // ← Change this every build during development
}
```

This forces VSCode to treat it as a new extension and skip cache.

### Or: Use a dev version suffix
```json
{
  "version": "0.1.4-dev.1"  // Then 0.1.4-dev.2, etc.
}
```

## Verification After Cache Clear

After clearing cache and reinstalling:

1. **Check Configuration tab:**
   - Agent-Brain checkbox should be **unchecked** by default
   - Git checkbox should be **checked** by default

2. **Check Legend:**
   - Should have two tabs: "Git Events" and "Agent-Brain"
   - "Pattern Detected" should be in **Agent-Brain tab**, not Git Events
   - Tabs should be close to "Legend" header (minimal spacing)

3. **Check Timeline:**
   - Intelligence events (diamonds) should be visually offset from commit line
   - Should only appear when Agent-Brain provider is enabled

## Still Not Working?

If cache clearing doesn't help:

1. **Check installed extension version:**
   ```bash
   code --list-extensions --show-versions | grep agent-brain
   ```
   Should show: `agent-brain.agent-brain-platform@0.1.4`

2. **Verify VSIX contents directly:**
   ```bash
   # Extract VSIX (it's just a ZIP file)
   unzip -l agent-brain-platform-0.1.4.vsix | grep webview.js

   # Check size (should be ~310KB for webview.js)
   ```

3. **Check VSCode version:**
   - Minimum required: 1.80.0
   - Update VSCode if older

4. **Try VSCode Insiders:**
   - Install VSCode Insiders (separate from stable)
   - Test the extension there
   - Insiders has completely separate cache

## Emergency: Complete VSCode Reset

If nothing else works:

### Windows
```powershell
# BACK UP YOUR SETTINGS FIRST!
# This deletes ALL VSCode data

Remove-Item -Recurse -Force "$env:APPDATA\Code"
Remove-Item -Recurse -Force "$env:USERPROFILE\.vscode"
```

### Linux/WSL
```bash
# BACK UP YOUR SETTINGS FIRST!
rm -rf ~/.config/Code
rm -rf ~/.vscode
```

### macOS
```bash
# BACK UP YOUR SETTINGS FIRST!
rm -rf ~/Library/Application\ Support/Code
rm -rf ~/.vscode
```

Then reinstall VSCode and your extensions.

---

**Remember:** The VSIX at `packages/vscode/agent-brain-platform-0.1.4.vsix` built at 22:22 has all the fixes. The issue is purely VSCode caching the old version.
