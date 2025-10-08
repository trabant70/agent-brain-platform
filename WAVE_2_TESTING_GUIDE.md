# Wave 2 Implementation - Testing & Validation Guide

**Date**: 2025-10-07
**Version**: 1.0
**Status**: Ready for Testing

---

## Overview

This guide provides comprehensive testing procedures for all Wave 2 features:
- **Phase 1**: Core Integration (Session → Timeline real-time updates)
- **Phase 2**: Context System (Project guidelines)
- **Phase 3**: Import/Export Commands (Package sharing)

---

## Prerequisites

### Build the Extension

```bash
# Navigate to project root
cd /mnt/c/projects/agent-brain-platform

# Install dependencies (if needed)
npm install

# Build all packages
npm run build:all

# Package the extension
cd packages/vscode
npm run package
```

This creates `agent-brain-platform-X.X.X.vsix` file.

### Install in VSCode

1. Open VSCode
2. Go to Extensions view (`Cmd/Ctrl+Shift+X`)
3. Click `...` menu → "Install from VSIX"
4. Select the generated `.vsix` file
5. Reload VSCode when prompted

---

## Test Suite 1: Phase 1 - Real-Time Session Tracking

### Goal
Verify that sessions appear in timeline immediately without manual refresh.

### Test 1.1: Start and End Session

**Steps:**
1. Open a workspace/folder in VSCode
2. Open Command Palette (`Cmd/Ctrl+Shift+P`)
3. Run: "Agent Brain: New Enhanced Prompt"
4. Enter prompt: "Test session tracking feature"
5. Select agent: "Claude"
6. Copy the enhanced prompt (should appear in modal)
7. Make some file changes (edit and save a file)
8. Open Command Palette
9. Run: "Agent Brain: End Session"

**Expected Results:**
- ✅ Session started message appears in Output panel
- ✅ Timeline panel updates **immediately** (no manual refresh)
- ✅ New event appears with type `AGENT_SESSION`
- ✅ Event title: "Session: Test session tracking feature"
- ✅ Event timestamp matches current time
- ✅ File changes tracked as activities

**Verification:**
```bash
# Check Output panel (View → Output → "Repository Timeline")
# Should see:
▶️ Session started: Test session tracking feature (claude)
📝 Session finalized: Test session tracking feature (completed)
✅ Session added to timeline: Session: Test session tracking feature
```

### Test 1.2: Session Persistence

**Steps:**
1. Complete Test 1.1
2. Close VSCode
3. Reopen VSCode in same workspace
4. Open timeline panel

**Expected Results:**
- ✅ Previously created session still appears in timeline
- ✅ Session loaded from SessionEventProvider
- ✅ Event details intact (timestamp, title, activities)

### Test 1.3: Multiple Sessions

**Steps:**
1. Create 3 sessions with different prompts:
   - "Add user authentication"
   - "Implement error handling"
   - "Write unit tests"
2. End each session after making some file changes

**Expected Results:**
- ✅ All 3 sessions appear in timeline
- ✅ Sorted by timestamp (newest first)
- ✅ Each has unique session ID
- ✅ Each shows correct prompt text

---

## Test Suite 2: Phase 2 - Context System

### Goal
Verify that project guidelines can be added and appear in enhanced prompts.

### Test 2.1: Add Context Rule

**Steps:**
1. Open Command Palette
2. Run: "Agent Brain: Add Project Guideline"
3. Enter rule: "Always use async/await instead of Promises"
4. Press Enter

**Expected Results:**
- ✅ Success message: "✓ Guideline added! It will be included in future prompts."
- ✅ File created: `.agent-brain/context.json`

**Verification:**
```bash
cat .agent-brain/context.json
```

Should see:
```json
{
  "version": "1.0.0",
  "contexts": {
    "/path/to/your/project": {
      "id": "ctx_...",
      "projectPath": "/path/to/your/project",
      "rules": [
        {
          "id": "ctx_...",
          "rule": "Always use async/await instead of Promises",
          "source": "user",
          "confidence": 1.0,
          "appliedCount": 0,
          "createdAt": "2025-10-07T..."
        }
      ],
      "decisions": [],
      "createdAt": "2025-10-07T...",
      "updatedAt": "2025-10-07T..."
    }
  },
  "exportedAt": "2025-10-07T..."
}
```

### Test 2.2: Context Rule in Enhanced Prompt

**Steps:**
1. Complete Test 2.1
2. Open Command Palette
3. Run: "Agent Brain: New Enhanced Prompt"
4. Enter prompt: "Add error handling to API calls"
5. Select agent: "Claude"

**Expected Results:**
- ✅ Enhanced prompt includes section:
  ```markdown
  **Project guidelines:**
  - ✓ Always use async/await instead of Promises
  ```
- ✅ Guideline appears BEFORE patterns/ADRs/learnings

### Test 2.3: Multiple Context Rules

**Steps:**
1. Add 3 guidelines:
   - "Always use async/await instead of Promises"
   - "Use try-catch blocks for all async functions"
   - "Log errors with structured logging"
2. Create enhanced prompt: "Refactor user service"

**Expected Results:**
- ✅ All 3 guidelines appear in enhanced prompt
- ✅ Each has ✓ icon (user-created)
- ✅ Rules persist across VSCode restarts

### Test 2.4: Context Persistence

**Steps:**
1. Add a guideline
2. Close VSCode
3. Reopen VSCode in same workspace
4. Create enhanced prompt

**Expected Results:**
- ✅ Guideline still appears in enhanced prompt
- ✅ Loaded from `.agent-brain/context.json`

---

## Test Suite 3: Phase 3 - Import/Export

### Goal
Verify that expertise packages can be exported and imported.

### Test 3.1: Export Package

**Steps:**
1. Ensure you have some knowledge:
   - Add 2-3 context rules (Test 2.1)
   - Record an ADR if possible
2. Open Command Palette
3. Run: "Agent Brain: Export Expertise Package"
4. Fill in metadata:
   - Name: "My Team Best Practices"
   - Version: "1.0.0"
   - Description: "Best practices for our team"
   - Authority: "Team Guidelines"
5. Choose save location: `~/Downloads/my-team-package.json`

**Expected Results:**
- ✅ Progress messages appear
- ✅ Success message: "✓ Package exported: My Team Best Practices (X.X KB)"
- ✅ File created at chosen location
- ✅ "Open File" button works

**Verification:**
```bash
cat ~/Downloads/my-team-package.json
```

Should see valid JSON with:
```json
{
  "id": "pkg_...",
  "metadata": {
    "name": "My Team Best Practices",
    "version": "1.0.0",
    "description": "Best practices for our team",
    "authority": "team",
    ...
  },
  "rules": [...],
  "patterns": [...],
  "templates": [...]
}
```

### Test 3.2: Import Package

**Steps:**
1. Create a test package file:
   ```bash
   cat > /tmp/test-package.json << 'EOF'
   {
     "id": "pkg_test_123",
     "metadata": {
       "name": "Test Package",
       "version": "1.0.0",
       "description": "A test expertise package",
       "author": {
         "name": "Test User",
         "email": "test@example.com"
       },
       "authority": "team",
       "createdAt": "2025-10-07T12:00:00.000Z",
       "updatedAt": "2025-10-07T12:00:00.000Z",
       "tags": ["testing"]
     },
     "rules": [],
     "patterns": [],
     "templates": [],
     "scope": {
       "applicableProjects": [],
       "languages": [],
       "frameworks": []
     }
   }
   EOF
   ```

2. Open Command Palette
3. Run: "Agent Brain: Import Expertise Package"
4. Select file: `/tmp/test-package.json`

**Expected Results:**
- ✅ Progress messages appear
- ✅ Success message: "✓ Package imported: Test Package"
- ✅ Package validation runs
- ✅ No conflicts detected

**Verification:**
Check logs in Output panel:
```
[Agent Brain] Package imported: {
  name: "Test Package",
  version: "1.0.0",
  authority: "team",
  rulesCount: 0,
  patternsCount: 0,
  duration: X
}
```

### Test 3.3: Import Package with Conflicts

**Steps:**
1. Create package with same ID as existing package
2. Import it
3. Check conflict resolution

**Expected Results:**
- ✅ Conflicts detected
- ✅ Auto-resolved using authority hierarchy
- ✅ Message: "✓ Package imported: X (Y conflicts auto-resolved)"

---

## Test Suite 4: Integration Tests

### Goal
Test multiple features working together.

### Test 4.1: Full Workflow

**Steps:**
1. Add context rule: "Use TypeScript strict mode"
2. Record ADR: "Use React for UI"
3. Create enhanced prompt: "Build user dashboard"
4. Start session
5. Make file changes
6. End session
7. Export package
8. Check timeline

**Expected Results:**
- ✅ Enhanced prompt includes context rule AND ADR
- ✅ Session appears in timeline immediately
- ✅ Package includes rule and ADR
- ✅ All features work harmoniously

### Test 4.2: Knowledge Accumulation

**Steps:**
1. Day 1: Add 3 context rules
2. Day 2: Add 2 more rules
3. Day 3: Export package
4. Import package in new workspace

**Expected Results:**
- ✅ All 5 rules accumulated
- ✅ Package contains all knowledge
- ✅ Import restores all knowledge

---

## Error Handling Tests

### Test E.1: Missing Workspace

**Steps:**
1. Close all workspaces
2. Run: "Agent Brain: Add Project Guideline"

**Expected Results:**
- ✅ Warning: "No workspace folder open. Please open a project first."

### Test E.2: Invalid Package File

**Steps:**
1. Create invalid JSON file
2. Try to import it

**Expected Results:**
- ✅ Error message: "Failed to import package: ..."
- ✅ Extension doesn't crash

### Test E.3: Export Without Package Manager

**Steps:**
1. If package manager not initialized
2. Try to export

**Expected Results:**
- ✅ Error message: "Package manager not initialized. Please check extension configuration."

---

## Performance Tests

### Test P.1: Large Timeline

**Steps:**
1. Create 50+ sessions
2. Open timeline

**Expected Results:**
- ✅ Timeline loads in < 2 seconds
- ✅ No freezing or stuttering
- ✅ Events sorted correctly

### Test P.2: Many Context Rules

**Steps:**
1. Add 20+ context rules
2. Create enhanced prompt

**Expected Results:**
- ✅ Prompt enhancement completes in < 1 second
- ✅ All relevant rules included

---

## Regression Tests

### Test R.1: Existing Features Still Work

**Steps:**
1. Show timeline (old feature)
2. Record ADR (old feature)
3. Refresh timeline (old feature)

**Expected Results:**
- ✅ All existing features work as before
- ✅ No breaking changes

---

## Manual Inspection Checklist

### Code Quality
- [ ] No TypeScript compilation errors
- [ ] No console errors in VSCode Dev Tools
- [ ] Clean logs in Output panel
- [ ] Proper error handling everywhere

### User Experience
- [ ] Clear success/error messages
- [ ] Progress indicators for long operations
- [ ] Commands appear in Command Palette
- [ ] Icons display correctly

### Data Integrity
- [ ] `.agent-brain/` directory created automatically
- [ ] `context.json` has valid structure
- [ ] Session events persist correctly
- [ ] Packages export/import without data loss

### Performance
- [ ] Extension activates quickly (< 1s)
- [ ] No memory leaks
- [ ] No CPU spikes
- [ ] Timeline updates smoothly

---

## Known Issues / Limitations

### Phase 2 Limitations
- Context rule keyword matching is basic (simple string contains)
- No UI to view/edit/delete context rules (command-only)
- No rule categories or priorities

### Phase 3 Limitations
- Export creates minimal package (TODOs for ADR/Pattern conversion)
- No package marketplace integration
- No package versioning/updates

### Future Enhancements
- Semantic search for context rules
- Context rule management UI
- Advanced package features
- Package analytics

---

## Troubleshooting

### Timeline Doesn't Update
1. Check Output panel for errors
2. Verify `.agent-brain/` directory exists
3. Try manual refresh: "Timeline: Refresh Timeline Data"
4. Restart VSCode

### Context Rules Not Appearing
1. Check `.agent-brain/context.json` exists
2. Verify rule was saved (check file contents)
3. Ensure using same workspace folder
4. Try reloading window

### Import/Export Fails
1. Verify package JSON is valid
2. Check file permissions
3. Ensure package manager initialized
4. Check logs in Output panel

---

## Success Criteria

### Wave 2 Complete When:
- [✅] All Phase 1 tests pass
- [✅] All Phase 2 tests pass
- [✅] All Phase 3 tests pass
- [ ] No critical bugs found
- [ ] Performance acceptable
- [ ] Documentation complete

---

## Reporting Issues

If you find bugs during testing:

1. **Check logs**: View → Output → "Repository Timeline"
2. **Reproduce**: Document exact steps to reproduce
3. **Collect data**:
   - VSCode version
   - Extension version
   - Error messages
   - Log output
4. **Report**: Create issue with reproduction steps

---

## Next Steps After Testing

1. Fix any critical bugs found
2. Update documentation based on testing feedback
3. Create user guide for new features
4. Plan Wave 3 features
5. Consider releasing beta version for wider testing

---

**Happy Testing! 🎉**
