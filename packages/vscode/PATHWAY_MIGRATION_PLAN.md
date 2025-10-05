# Migration Plan: Pathway Testing Infrastructure from Timeline Repo to Agent-Brain-Platform

**Date:** 2025-10-04
**Status:** Ready for Execution
**Author:** Claude Code
**Revision:** 3 - Enhanced with Progress Tracking
**Progress File:** `MIGRATION_PROGRESS.md`

---

## Conversation Context

**Why This Migration:**
- Agent-brain-platform has completely broken pathway testing infrastructure
- All pathway tests import from `@agent-brain/testing` package that doesn't exist
- Current tests cannot run due to broken imports throughout codebase
- User directive: "throw out everything you have done around unit testing and the test harness in the agent-brain-platform"

**User's Decision:**
- **Complete clean slate approach** - delete everything, start fresh
- No selective deletion, no fixing broken imports
- Copy proven working system from timeline repo
- "remove what is in the agent-brain-platform, and migrate fresh the pathway testing"

**Timeline Repo Success:**
- Complete, working pathway testing system (4,715 LOC, 22 files)
- 149 pathway tests with 97%+ pass rate
- All infrastructure functional and battle-tested
- All imports use local paths (no package dependencies)

**Why Clean Slate Is Better:**
- Simpler: Just delete and copy (vs. hours of import fixing)
- Proven: Timeline's code already works (97% pass rate)
- Complete: All utilities and infrastructure included
- Faster: 3-6 hours total (vs. 8+ hours fixing broken code)

---

## Progress Tracking System

**Checkpoint File:** `MIGRATION_PROGRESS.md`
- Created at start of migration
- Updated after each phase completion
- Tracks: phase status, timestamp, files changed, verification results
- **Critical for recovery** - if session disrupted, read this file to resume

**After Each Phase:**
1. Complete the phase work
2. Verify phase success criteria
3. Update `MIGRATION_PROGRESS.md` with:
   - ✅ Phase X Complete
   - Timestamp
   - What was done
   - Verification results
   - What's next
4. Commit changes (optional but recommended)

**Recovery Instructions:**
- If session disrupted: Read `MIGRATION_PROGRESS.md`
- Check last completed phase
- Verify phase completion (check files, run commands)
- Continue from next pending phase

---

## Executive Summary

**Current Situation:**
- Agent-brain-platform has broken pathway testing infrastructure (imports from non-existent `@agent-brain/testing` package)
- All pathway-related code is non-functional
- Traditional unit tests exist but are separate concern

**Solution:**
- **Complete removal** of all broken test infrastructure
- **Fresh migration** of working pathway testing system from timeline repo
- **Clean slate** approach - no attempts to fix broken code, just replace it

**Timeline Repo Source:**
- Complete, working pathway testing system (4,715 LOC, 22 files)
- 149 pathway tests with 97%+ pass rate
- All infrastructure functional and proven

---

## Migration Strategy: Clean Slate Approach

### Phase 1: Complete Removal - Start Fresh

**Remove ALL test infrastructure from agent-brain-platform:**

#### 1A. Remove from VSCode Package
```bash
# Navigate to vscode package
cd /mnt/c/projects/agent-brain-platform/packages/vscode/

# Remove ALL test directories
rm -rf tests/

# Remove test-related files
rm -rf coverage/
rm -f jest.config.js
rm -f jest.config.*.js
```

**What gets deleted:**
- ✗ `tests/` (entire directory - everything)
  - unit/ (traditional unit tests - remove all)
  - pathways/ (broken pathway tests)
  - utils/ (TimelineUISimulator + missing pathway utils)
  - fixtures/ (canonical-event-factory, test-repositories)
  - mocks/ (vscode mocks)
  - setup/ (test setup files)
  - integration/ (faker tests)
- ✗ All Jest configuration files
- ✗ Coverage reports

#### 1B. Remove from Packages Root (if exists)
```bash
# Check for shared test infrastructure
cd /mnt/c/projects/agent-brain-platform/packages/

# Remove if exists
rm -rf testing/
rm -rf shared-test-utils/
rm -rf @agent-brain/testing/
```

**Rationale:**
- Broken imports throughout (`@agent-brain/testing`)
- Mixed concerns (traditional vs pathway tests)
- Easier to copy working code fresh than untangle
- No risk of broken code interfering

#### Verification & Progress Update
```bash
# Verify deletion
ls /mnt/c/projects/agent-brain-platform/packages/vscode/tests/  # Should fail (not found)
ls /mnt/c/projects/agent-brain-platform/packages/vscode/jest.config.js  # Should fail
```

**Update MIGRATION_PROGRESS.md:**
```markdown
## Phase 1: Complete Removal ✅
**Completed:** [timestamp]
**Actions:**
- Deleted tests/ directory from vscode package
- Deleted jest.config.js files
- Deleted coverage/ directory
- Checked packages/ root for test packages (none found / deleted X)

**Verification:**
- ✅ tests/ directory does not exist
- ✅ jest.config.js does not exist
- ✅ coverage/ directory does not exist

**Next:** Phase 2 - Copy complete test infrastructure from timeline
```

---

### Phase 2: Copy Complete Test Infrastructure from Timeline

**Copy entire working test directory:**

```bash
# Source: Timeline repo
SOURCE=/mnt/c/projects/repo-timeline-extension/tests/

# Destination: Agent-brain VSCode package
DEST=/mnt/c/projects/agent-brain-platform/packages/vscode/tests/

# Copy everything
cp -r $SOURCE $DEST
```

**What gets copied:**
```
tests/                                (Complete working structure)
├── utils/                           (6 files - Pathway infrastructure)
│   ├── PathwayAsserter.ts          (250 LOC - Core asserter)
│   ├── LogCapture.ts               (190 LOC - Log interceptor)
│   ├── PathwayDebugger.ts          (650 LOC - AI debugging)
│   ├── PathwayReporter.ts          (220 LOC - Jest reporter)
│   ├── pathway-matchers.ts         (180 LOC - Custom matchers)
│   └── TimelineUISimulator.ts      (UI simulator)
│
├── setup/                           (Test setup)
│   └── pathway-setup.ts            (120 LOC - Jest setup)
│
├── fixtures/                        (Test utilities)
│   └── test-repositories.ts        (Mock repo creation)
│
├── mocks/                           (VSCode mocks)
│   └── vscode.ts
│
├── pathways/                        (Pathway tests)
│   ├── definitions/                (9 files - Pathway definitions)
│   │   ├── data-ingestion.pathway.ts
│   │   ├── filter-apply.pathway.ts
│   │   ├── state-persist.pathway.ts
│   │   ├── render-pipeline.pathway.ts
│   │   ├── user-interaction.pathway.ts
│   │   ├── webview-messaging.pathway.ts
│   │   ├── config-sync.pathway.ts
│   │   ├── range-selector.pathway.ts
│   │   └── index.ts
│   │
│   ├── unit/                       (~30 tests)
│   ├── integration/                (~75 tests)
│   └── performance/                (~11 tests)
│
├── unit/                            (Traditional unit tests from timeline)
└── integration/                     (Integration tests from timeline)
```

**Total copied:** ~4,715 LOC across 22+ files

#### Verification & Progress Update
```bash
# Verify copy
ls -la /mnt/c/projects/agent-brain-platform/packages/vscode/tests/
ls /mnt/c/projects/agent-brain-platform/packages/vscode/tests/utils/PathwayAsserter.ts
ls /mnt/c/projects/agent-brain-platform/packages/vscode/tests/pathways/definitions/

# Count files
find /mnt/c/projects/agent-brain-platform/packages/vscode/tests/ -type f | wc -l
```

**Update MIGRATION_PROGRESS.md:**
```markdown
## Phase 2: Copy Test Infrastructure ✅
**Completed:** [timestamp]
**Actions:**
- Copied entire tests/ directory from timeline repo
- Source: /mnt/c/projects/repo-timeline-extension/tests/
- Destination: /mnt/c/projects/agent-brain-platform/packages/vscode/tests/

**Files Copied:**
- utils/ (6 files: PathwayAsserter, LogCapture, PathwayDebugger, PathwayReporter, pathway-matchers, TimelineUISimulator)
- setup/ (pathway-setup.ts)
- fixtures/ (test-repositories.ts)
- mocks/ (vscode.ts)
- pathways/ (definitions + unit + integration + performance)
- Total: [X] files

**Verification:**
- ✅ tests/utils/PathwayAsserter.ts exists
- ✅ tests/pathways/definitions/ exists
- ✅ All pathway infrastructure files present

**Next:** Phase 3 - Copy Jest configuration
```

---

### Phase 3: Copy Jest Configuration

**Copy Jest config from timeline:**

```bash
# Source
SOURCE=/mnt/c/projects/repo-timeline-extension/

# Destination
DEST=/mnt/c/projects/agent-brain-platform/packages/vscode/

# Copy Jest config
cp $SOURCE/jest.config.js $DEST/
```

**Review and adapt:**
- Update paths if different
- Verify module name mappings
- Check coverage thresholds

#### Verification & Progress Update
```bash
# Verify Jest config copied
cat /mnt/c/projects/agent-brain-platform/packages/vscode/jest.config.js | head -20
```

**Update MIGRATION_PROGRESS.md:**
```markdown
## Phase 3: Copy Jest Configuration ✅
**Completed:** [timestamp]
**Actions:**
- Copied jest.config.js from timeline repo
- Reviewed configuration for path differences
- [Note any adaptations made]

**Verification:**
- ✅ jest.config.js exists
- ✅ Configuration reviewed
- ✅ Paths verified/updated

**Next:** Phase 4 - Copy test scripts to package.json
```

---

### Phase 4: Copy Test Scripts from package.json

**From timeline's package.json, copy test scripts:**

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest tests/unit",
    "test:pathways": "jest tests/pathways",
    "test:pathways:watch": "jest tests/pathways --watch",
    "test:coverage": "jest --coverage",
    "debug-pathway": "ts-node scripts/debug-pathway-test.ts"
  }
}
```

Add to agent-brain's package.json.

#### Verification & Progress Update
```bash
# Verify scripts added
cat /mnt/c/projects/agent-brain-platform/packages/vscode/package.json | grep -A 8 '"scripts"'
```

**Update MIGRATION_PROGRESS.md:**
```markdown
## Phase 4: Copy Test Scripts ✅
**Completed:** [timestamp]
**Actions:**
- Added test scripts to package.json
- Scripts: test, test:unit, test:pathways, test:pathways:watch, test:coverage, debug-pathway

**Verification:**
- ✅ Scripts added to package.json
- ✅ All test commands present

**Next:** Phase 5 - Update Logger with test mode support
```

---

### Phase 5: Copy Production Code Dependencies

**Copy Logger.ts with test mode support:**

```bash
# Compare Loggers
SOURCE_LOGGER=/mnt/c/projects/repo-timeline-extension/src/utils/Logger.ts
DEST_LOGGER=/mnt/c/projects/agent-brain-platform/packages/vscode/src/utils/Logger.ts

# If agent-brain's Logger doesn't have test mode, copy from timeline
# Or merge test mode features into existing Logger
```

**Required Logger features:**
- Test mode flag
- Log capture callback registration
- Pathway enum (LogPathway)
- Support for pathway parameter in all log calls

#### Verification & Progress Update
```bash
# Verify Logger has test mode
grep -n "testMode\|logCapture\|LogPathway" /mnt/c/projects/agent-brain-platform/packages/vscode/src/utils/Logger.ts
```

**Update MIGRATION_PROGRESS.md:**
```markdown
## Phase 5: Update Logger ✅
**Completed:** [timestamp]
**Actions:**
- Compared Logger.ts from timeline and agent-brain
- [Option taken: Copied from timeline / Merged features / Already compatible]
- Verified test mode flag exists
- Verified log capture callback registration
- Verified LogPathway enum

**Verification:**
- ✅ Logger has testMode flag
- ✅ Logger has log capture support
- ✅ LogPathway enum present

**Next:** Phase 6 - Adapt tests for agent-brain architecture
```

---

### Phase 6: Adapt for Agent-Brain Architecture

**After copying everything, adapt to agent-brain:**

#### 6A. Component Name Differences

Search and replace in copied tests:

```bash
# Example differences (verify these):
GitDataProvider → GitProvider
GitEventProcessor → (check if exists)
```

**Action:**
1. Run tests to see what fails
2. Identify component name mismatches
3. Update pathway definitions and tests

#### 6B. Architecture Differences

**Review pathway definitions for agent-brain:**
- Some milestones may not apply (components don't exist)
- Some milestones may be missing (new components)
- Log contexts may differ

**Action:**
1. Compare architectures side-by-side
2. Update pathway definitions to match agent-brain
3. Add logging to agent-brain code where needed

#### 6C. Remove Timeline-Specific Tests

**Delete tests that don't apply to agent-brain:**
- Tests for timeline-specific features
- Tests for components agent-brain doesn't have
- GitHub provider tests (if agent-brain doesn't use GitHub)

#### Verification & Progress Update
```bash
# Run tests to see what fails
npm test 2>&1 | tee test-output.txt

# Check for common errors
grep -i "cannot find module\|component.*not found" test-output.txt
```

**Update MIGRATION_PROGRESS.md:**
```markdown
## Phase 6: Adapt Tests ✅
**Completed:** [timestamp]
**Actions:**
- Ran initial test suite
- Identified component name mismatches: [list]
- Updated pathway definitions: [list files updated]
- Removed timeline-specific tests: [list removed]
- Updated log context references: [details]

**Test Results:**
- Initial pass rate: X/Y tests (Z%)
- Common failures: [categories]
- Component mismatches fixed: [count]

**Verification:**
- ✅ Tests run without import errors
- ✅ Component names updated
- ✅ Irrelevant tests removed

**Next:** Phase 7 - Copy CLI debugging tool (optional)
```

---

### Phase 7: Optional - Copy CLI Debugging Tool

**If desired, copy pathway debugging CLI:**

```bash
# Source
SOURCE=/mnt/c/projects/repo-timeline-extension/scripts/debug-pathway-test.ts

# Destination
DEST=/mnt/c/projects/agent-brain-platform/packages/vscode/scripts/

# Create directory if needed
mkdir -p $DEST

# Copy
cp $SOURCE $DEST
```

**Benefits:**
- AI-debuggable failure analysis
- Hypothesis generation
- Automatic debugging checklists

#### Verification & Progress Update
```bash
# Verify CLI tool copied (if done)
ls /mnt/c/projects/agent-brain-platform/packages/vscode/scripts/debug-pathway-test.ts
```

**Update MIGRATION_PROGRESS.md:**
```markdown
## Phase 7: Copy CLI Tool ✅ (or SKIPPED)
**Completed:** [timestamp]
**Actions:**
- [Copied debug-pathway-test.ts / Skipped - not needed yet]

**Verification:**
- [✅ CLI tool copied and tested / ⏭️ Skipped this phase]

**Next:** Phase 8 - Run and validate all tests
```

---

### Phase 8: Run and Validate

**Initial test run:**

```bash
# Run all tests
npm test

# Expected initial state:
# - Some failures due to component differences
# - Some failures due to missing log emissions
# - Many passes if architectures are similar
```

**Iterative fixes:**
1. Identify failures
2. Update pathway definitions
3. Add logging to production code
4. Update test expectations
5. Re-run tests
6. Repeat until 100%

#### Verification & Progress Update
```bash
# Final test run
npm test

# Generate coverage report
npm run test:coverage

# Check pass rate
npm test 2>&1 | grep -E "Tests:.*passed"
```

**Update MIGRATION_PROGRESS.md:**
```markdown
## Phase 8: Run and Validate ✅
**Completed:** [timestamp]
**Actions:**
- Ran complete test suite
- Iterative fixes applied: [count] rounds
- Final adjustments: [list key changes]

**Final Results:**
- Tests passing: X/Y (Z%)
- Test categories:
  - Pathway unit: X/Y
  - Pathway integration: X/Y
  - Pathway performance: X/Y
- Coverage: X%

**Verification:**
- ✅ All tests run successfully
- ✅ No import errors
- ✅ Pass rate [40-60% initial / working toward 100%]

**Status:** Migration Complete! 🎉
- All pathway infrastructure migrated
- Tests running with clean imports
- Foundation ready for future test development
```

---

## Migration Complete - Final Status

After completing all 8 phases, update MIGRATION_PROGRESS.md with final summary:

```markdown
# MIGRATION COMPLETE ✅

**Date Completed:** [timestamp]
**Total Time:** [duration]

**Summary:**
- ✅ All broken test infrastructure removed
- ✅ Complete pathway testing system migrated from timeline
- ✅ ~4,715 LOC and 22+ files copied
- ✅ Jest configuration adapted
- ✅ Test scripts added to package.json
- ✅ Logger updated with test mode support
- ✅ Tests adapted for agent-brain architecture
- ✅ All tests running (X% pass rate)

**Next Steps:**
1. Continue improving test pass rate to 100%
2. Add agent-brain-specific pathway tests
3. Remove timeline-specific tests that don't apply
4. Expand pathway coverage for new features

**Key Success:**
- No more `@agent-brain/testing` import errors
- Clean local imports throughout
- Proven pathway infrastructure in place
- Foundation for comprehensive testing
```

---

## What This Approach Removes

### From VSCode Package - Everything! ✗

**ALL current test infrastructure:**
- tests/unit/ (traditional unit tests)
- tests/pathways/ (broken pathway tests)
- tests/utils/ (TimelineUISimulator + missing utils)
- tests/fixtures/ (test utilities)
- tests/mocks/ (VSCode mocks)
- tests/setup/ (test setup)
- tests/integration/ (faker tests)
- jest.config.js
- coverage/

**Rationale:**
- Start completely fresh
- No broken imports left behind
- Timeline's tests are proven to work
- Simpler than selective migration

### From Packages Root (if exists) ✗

**Any shared test packages:**
- @agent-brain/testing/ (broken package)
- shared-test-utils/
- Any other test-related packages

---

## What Gets Copied

### From Timeline Repo ✓

**Complete working test infrastructure:**
- All utils/ (6 pathway infrastructure files)
- All setup/ (pathway-setup.ts)
- All fixtures/ (test-repositories.ts)
- All mocks/ (vscode.ts)
- All pathways/ (definitions + unit + integration + performance)
- Traditional unit tests (if desired - agent-brain may not need these)
- Traditional integration tests (if desired)
- jest.config.js
- Test scripts from package.json
- Optional: scripts/debug-pathway-test.ts

**Total:** Complete, proven test system

---

## Final Directory Structure

```
agent-brain-platform/packages/vscode/
├── src/
│   └── utils/
│       └── Logger.ts                ← Update with test mode support
│
├── tests/                           ← Copied fresh from timeline
│   ├── utils/                       (6 files - pathway infrastructure)
│   ├── setup/                       (pathway-setup.ts)
│   ├── fixtures/                    (test-repositories.ts)
│   ├── mocks/                       (vscode.ts)
│   ├── pathways/
│   │   ├── definitions/            (9 pathway definition files)
│   │   ├── unit/                   (~30 tests)
│   │   ├── integration/            (~75 tests)
│   │   └── performance/            (~11 tests)
│   ├── unit/                        (traditional tests - optional)
│   └── integration/                 (traditional tests - optional)
│
├── scripts/
│   └── debug-pathway-test.ts       ← Optional CLI tool
│
├── jest.config.js                   ← Copied from timeline
└── package.json                     ← Add test scripts
```

---

## Decision: Traditional Unit Tests

**Question:** Should we copy timeline's traditional unit tests?

**Option A: Yes, copy everything**
- Agent-brain gets timeline's unit tests
- May not be relevant to agent-brain
- Would need significant adaptation

**Option B: No, skip traditional tests**
- Only copy pathway testing infrastructure
- Agent-brain can write its own traditional tests later
- Focus on pathway tests only

**Recommendation:** **Option B** - Skip traditional unit tests
- Timeline's unit tests are timeline-specific
- Agent-brain's needs are different
- Pathway tests are the goal
- Traditional tests can be written separately later

---

## Expected Test Count After Migration

### If Copying Everything
| Category | Count | Status |
|----------|-------|--------|
| **Traditional Unit Tests** | ~100+ | 🔄 From timeline (need adaptation) |
| **Pathway Unit Tests** | ~30 | 🔄 From timeline (need adaptation) |
| **Pathway Integration Tests** | ~75 | 🔄 From timeline (need adaptation) |
| **Pathway Performance Tests** | ~11 | 🔄 From timeline (need adaptation) |
| **Total** | ~216 | Needs architecture adaptation |

### If Copying Only Pathway Tests (Recommended)
| Category | Count | Status |
|----------|-------|--------|
| **Pathway Unit Tests** | ~30 | 🔄 From timeline |
| **Pathway Integration Tests** | ~75 | 🔄 From timeline |
| **Pathway Performance Tests** | ~11 | 🔄 From timeline |
| **Total** | ~116 | Focus on pathway testing |

**Realistic Initial Pass Rate:** 40-60%
- Architecture differences will cause failures
- Missing components will cause failures
- Missing log emissions will cause failures
- All fixable with adaptation

---

## Advantages of Clean Slate Approach

### 1. Simplicity ✓
- No selective file removal
- No import fixing across 20+ files
- No merging of old and new code
- Just delete and copy

### 2. Proven Code ✓
- Timeline's tests are working (97% pass rate)
- Infrastructure is battle-tested
- No broken dependencies
- All imports work

### 3. Complete System ✓
- All utilities present
- All infrastructure present
- No missing pieces
- Consistent codebase

### 4. Clean Imports ✓
- All imports point to local files
- No `@agent-brain/testing` references
- Easy to trace dependencies
- No package management issues

### 5. Faster Migration ✓
- Delete: 1 minute
- Copy: 2 minutes
- Fix paths/names: 1-2 hours
- vs. fixing broken imports: 4-6 hours

---

## Risks and Mitigations

### Risk 1: Losing Agent-Brain Work
**Risk:** Deleting tests/ removes any custom test code
**Impact:** Custom tests lost
**Mitigation:**
- Current tests are broken (don't work)
- Nothing valuable to lose
- Fresh start is better

### Risk 2: Architecture Incompatibility
**Risk:** Timeline's architecture is too different
**Impact:** Many test failures
**Mitigation:**
- Expected and acceptable
- Fixable with adaptation
- Better than broken imports

### Risk 3: Missing Timeline Components
**Risk:** Agent-brain doesn't have all timeline components
**Impact:** Some tests won't apply
**Mitigation:**
- Delete irrelevant tests
- Adapt relevant tests
- Add tests for agent-brain-specific features

---

## Success Criteria

✅ **Phase 1 Complete:** All test infrastructure removed from agent-brain
✅ **Phase 2 Complete:** All timeline tests copied to agent-brain
✅ **Phase 3 Complete:** Jest configuration copied and adapted
✅ **Phase 4 Complete:** Test scripts added to package.json
✅ **Phase 5 Complete:** Logger has test mode support
✅ **Phase 6 Complete:** Tests adapted for agent-brain architecture
✅ **Phase 7 Complete:** CLI tool copied (optional)
✅ **Phase 8 Complete:** Tests running with 40-60% initial pass rate

**Final Success:**
- ✅ No broken imports (`@agent-brain/testing` gone)
- ✅ All pathway infrastructure functional
- ✅ Tests running (even if some fail)
- ✅ Clear path to 100% through adaptation
- ✅ Foundation for future test development

---

## Timeline Estimate

| Phase | Estimated Time | Complexity |
|-------|---------------|------------|
| 1. Complete removal | 5 min | Low |
| 2. Copy all tests | 5 min | Low |
| 3. Copy Jest config | 5 min | Low |
| 4. Copy test scripts | 5 min | Low |
| 5. Update Logger | 30 min | Medium |
| 6. Adapt tests | 2-4 hours | High |
| 7. Copy CLI tool | 5 min | Low |
| 8. Run and validate | 1-2 hours | High |
| **Total** | **3-6 hours** | - |

**Note:** Faster than previous plan (5-8 hours) because:
- No selective deletion
- No import fixing
- No merge conflicts
- Just copy and adapt

---

## Open Questions

1. **Traditional Unit Tests:** Should we copy timeline's traditional unit tests, or only pathway tests?
   - **Recommendation:** Only pathway tests

2. **Timeline-Specific Features:** Which timeline components don't exist in agent-brain?
   - Need to identify and remove related tests

3. **Agent-Brain-Specific Features:** Which agent-brain components need new pathway tests?
   - Can add after migration

4. **CLI Debugging Tool:** Copy `debug-pathway-test.ts` or skip?
   - **Recommendation:** Copy it (useful for development)

5. **Documentation:** Copy pathway testing docs from timeline?
   - **Recommendation:** Yes, very helpful

---

## Next Steps

1. ✅ **Confirm clean slate approach** - Get approval to delete everything
2. ✅ **Identify protected files** - Any test code we must keep?
3. ⏭️ **Execute Phase 1** - Complete removal
4. ⏭️ **Execute Phase 2** - Copy everything from timeline
5. ⏭️ **Execute Phases 3-8** - Configure and adapt

---

---

## Recovery & Resume Instructions

**If Session Gets Disrupted:**

1. **Read Progress File**
   ```bash
   cat /mnt/c/projects/agent-brain-platform/packages/vscode/MIGRATION_PROGRESS.md
   ```

2. **Identify Last Completed Phase**
   - Look for last phase marked with ✅
   - Check timestamp of completion
   - Read verification results

3. **Verify Phase Completion**
   - Run verification commands from that phase
   - Confirm all expected files/changes are present
   - Check for partial completion

4. **Resume from Next Phase**
   - If phase fully complete: Start next phase
   - If phase partially complete: Review what's done, complete remaining steps
   - If verification fails: Re-do the phase

**Quick Resume Guide:**

| If Stuck At | Verification Command | Resume Action |
|-------------|---------------------|---------------|
| Phase 1 | `ls tests/` should fail | Start Phase 2 |
| Phase 2 | `ls tests/utils/PathwayAsserter.ts` | Start Phase 3 |
| Phase 3 | `cat jest.config.js \| head -5` | Start Phase 4 |
| Phase 4 | `grep "test:" package.json` | Start Phase 5 |
| Phase 5 | `grep LogPathway src/utils/Logger.ts` | Start Phase 6 |
| Phase 6 | `npm test 2>&1 \| head -50` | Start Phase 7 |
| Phase 7 | `ls scripts/debug-pathway-test.ts` | Start Phase 8 |
| Phase 8 | `npm test` | Iterative improvements |

**Common Recovery Scenarios:**

1. **"Not sure which phase I'm on"**
   - Read MIGRATION_PROGRESS.md
   - Check last ✅ timestamp
   - Run verification commands

2. **"Phase partially done"**
   - Review what files exist
   - Check git diff to see changes
   - Complete missing steps

3. **"Tests failing after migration"**
   - Normal! Expected 40-60% initial pass rate
   - Continue Phase 6 adaptation work
   - Update pathway definitions iteratively

4. **"Import errors"**
   - Check if tests/ directory copied completely
   - Verify all utils/ files present
   - Re-run Phase 2 if needed

---

**Plan Status:** READY FOR EXECUTION - Rev 3 with Progress Tracking

**Key Features:**
- Complete removal of all test infrastructure, fresh copy from timeline
- Progress tracking after each phase via MIGRATION_PROGRESS.md
- Recovery instructions for session disruption
- Simpler, faster, cleaner than fixing broken code
