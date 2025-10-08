# Agent Brain Platform - Installation Guide

**Version**: 0.1.30 (Wave 2 Complete)
**Date**: October 7, 2025
**VSIX File**: `packages/vscode/agent-brain-platform-0.1.30.vsix`

---

## Installation

### Method 1: Install from VSIX File (Recommended)

1. **Locate the VSIX file**:
   ```
   /mnt/c/projects/agent-brain-platform/packages/vscode/agent-brain-platform-0.1.30.vsix
   ```

2. **Open VSCode**

3. **Install the extension**:
   - Open Extensions view (`Ctrl/Cmd+Shift+X`)
   - Click the `...` menu (top right)
   - Select "Install from VSIX..."
   - Navigate to and select `agent-brain-platform-0.1.30.vsix`
   - Click "Install"

4. **Reload VSCode** when prompted

5. **Verify installation**:
   - Open Command Palette (`Ctrl/Cmd+Shift+P`)
   - Type "Agent Brain"
   - You should see all commands listed

---

## Verification

### Check Extension is Active

1. Open Output panel: `View → Output`
2. Select "Repository Timeline" from dropdown
3. You should see activation logs:
   ```
   🚀 Activating Repository Timeline Extension...
   📂 Intelligence storage: /path/to/workspace/.agent-brain
   ✅ Timeline webview provider registered
   🧠 Initializing Knowledge System...
   📋 Initializing Context Manager...
   ✅ Session event handlers wired
   🎉 Repository Timeline Extension activated successfully!
   ```

### Test Basic Functionality

**Test 1: Show Timeline**
- Command Palette → "Show Repository Timeline"
- Timeline panel should open in bottom tabs
- Should show git history events

**Test 2: Create Enhanced Prompt**
- Command Palette → "Agent Brain: New Enhanced Prompt"
- Enter prompt: "Test installation"
- Select agent: "Claude"
- Should show enhanced prompt with project context

**Test 3: Add Context Rule**
- Command Palette → "Agent Brain: Add Project Guideline"
- Enter: "Always write unit tests"
- Should see: "✓ Guideline added!"
- File created: `.agent-brain/context.json`

---

## What's Included in Wave 2

### Phase 1: Real-Time Session Tracking ✅
- Sessions appear in timeline immediately (no manual refresh)
- Full session lifecycle tracking
- Activity tracking (file saves, test runs, etc.)

### Phase 2: Context System ✅
- Add project-specific guidelines via command
- Guidelines persist to `.agent-brain/context.json`
- Guidelines automatically included in enhanced prompts
- Auto-save on changes

### Phase 3: Import/Export ✅
- Export expertise as packages
- Import packages from teammates
- Validation and conflict resolution
- Command: "Agent Brain: Export Expertise Package"
- Command: "Agent Brain: Import Expertise Package"

---

## Available Commands

### Core Commands
- `Agent Brain: New Enhanced Prompt` - Create AI-enhanced prompt
- `Agent Brain: End Session` - End current work session
- `Agent Brain: Show Session Status` - View active session details

### Context Commands (Phase 2)
- `Agent Brain: Add Project Guideline` - Add context rule
- `Timeline: Record Architectural Decision` - Record ADR

### Package Commands (Phase 3)
- `Agent Brain: Import Expertise Package` - Import .json/.abp package
- `Agent Brain: Export Expertise Package` - Export current knowledge

### Knowledge Management
- `Agent Brain: Refresh Knowledge Base` - Reload knowledge
- `Agent Brain: Show Knowledge Health` - View knowledge metrics
- `Agent Brain: Setup Project Profile` - Configure project settings

### Timeline Commands
- `Show Repository Timeline` - Open timeline panel
- `Timeline: Refresh Timeline Data` - Manually refresh
- `Timeline: Record Architectural Decision` - Add ADR

---

## Directory Structure

After installation and first use, Agent Brain creates:

```
.agent-brain/
├── context.json          # Project guidelines (Phase 2)
├── adrs.json            # Architectural decisions
├── patterns.json        # Detected patterns
├── learnings.json       # Learned lessons
├── sessions/            # Session history
│   └── *.json          # Individual session files
└── profiles/           # Project profiles
    └── *.json          # Profile configurations
```

**Important**: Commit `.agent-brain/` to version control to share knowledge with your team!

---

## Testing the Installation

Follow the comprehensive testing guide:
```
/mnt/c/projects/agent-brain-platform/WAVE_2_TESTING_GUIDE.md
```

### Quick Smoke Test (5 minutes)

1. **Test Real-Time Sessions**:
   - Create enhanced prompt
   - Make file changes
   - End session
   - ✅ Session appears in timeline immediately

2. **Test Context Rules**:
   - Add guideline: "Use TypeScript strict mode"
   - Create new prompt
   - ✅ Guideline appears in enhanced prompt

3. **Test Export**:
   - Run "Export Expertise Package"
   - Fill metadata
   - Save file
   - ✅ Package saved successfully

---

## Troubleshooting

### Extension Doesn't Activate

**Check logs**:
1. View → Output
2. Select "Repository Timeline"
3. Look for errors

**Common fixes**:
- Reload window: `Ctrl/Cmd+Shift+P` → "Reload Window"
- Reinstall extension
- Check VSCode version (requires VSCode 1.80+)

### Timeline Doesn't Show Events

**Check**:
1. Open a workspace/folder (not just files)
2. Workspace has git repository
3. Try manual refresh: "Timeline: Refresh Timeline Data"

### Context Rules Not Appearing

**Check**:
1. `.agent-brain/context.json` exists
2. File has valid JSON
3. Same workspace folder used
4. Try reloading window

### Commands Not Showing

**Check**:
1. Extension activated (check Output panel)
2. Command Palette showing all commands
3. Try typing full command name

---

## Known Issues

### Warnings During Build
- Webpack warnings about missing exports (harmless)
- These don't affect functionality

### Performance
- First timeline load may be slow (caching after that)
- Large git repos (1000+ commits) may take 2-3 seconds

### Limitations
- Context keyword matching is basic (no semantic search yet)
- Export creates minimal packages (ADR/Pattern conversion TODO)
- No package marketplace integration yet

---

## Next Steps

1. **Read Documentation**:
   - `WAVE_2_COMPLETE.md` - Implementation summary
   - `WAVE_2_TESTING_GUIDE.md` - Full testing procedures
   - `PHASE_2_CONTEXT_COMPLETE.md` - Context system details

2. **Start Using**:
   - Add your project guidelines
   - Create enhanced prompts
   - Track sessions
   - Export and share knowledge

3. **Provide Feedback**:
   - Report bugs
   - Suggest features
   - Share use cases

---

## Uninstallation

To uninstall:

1. Open Extensions view (`Ctrl/Cmd+Shift+X`)
2. Search for "Agent Brain"
3. Click "Uninstall"
4. Reload window

**Note**: Uninstalling does NOT delete `.agent-brain/` directory. Delete manually if needed.

---

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review testing guide
3. Check Output panel logs
4. Create issue with reproduction steps

---

**Happy coding with Agent Brain! 🧠✨**
