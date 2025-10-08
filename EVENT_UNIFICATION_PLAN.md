# Git vs GitHub Event Unification: Implementation Plan

**Created**: 2025-10-03
**Status**: Planning Complete, Ready for Implementation
**Context**: Solving release matching failures between git-local and GitHub providers

---

## Executive Summary

This document outlines the comprehensive plan to unify event matching between git-local and GitHub API providers. The system currently fails to match releases (0% success rate) because:

1. **Bug**: Git tags were incorrectly mapped to `EventType.COMMIT` instead of `EventType.RELEASE`
2. **Mismatch**: Git tags use title format "Release: v0.3.26" while GitHub uses "v0.3.26 - Dual Color Modes..."
3. **Timing**: Git tag creation vs GitHub release publication can be hours/days apart
4. **Missing Data**: GitHub releases don't include target commit SHA for matching

---

## Research & Analysis

### Git vs GitHub Relationship Model

#### **Core Truth: SHA Universality** ✅
- Git commit SHA-1 is **cryptographically identical** across local and remote
- Source: [Stack Overflow - Commit ID vs SHA1 Hash](https://stackoverflow.com/questions/29106996/)
- Same SHA = **literally the same commit object** everywhere
- This is the **primary matching key** for commits/merges (100% confidence)

#### **Release vs Tag Architecture** ✅
```
GIT TAG:                          GITHUB RELEASE:
├─ Git primitive                  ├─ GitHub platform feature
├─ Immutable pointer to commit    ├─ Built FROM existing tag
├─ Created: `git tag v1.0.0`      ├─ Created: GitHub UI/API
├─ Time: Tag creation time        ├─ Time: Manual publish (hours/days later!)
└─ Points to: Commit SHA          └─ References: Tag name + release notes/assets
```

**Key Insight**: These are **different event types**:
- Git tag = Version control milestone (when code was tagged)
- GitHub release = **Publication announcement** of that milestone (when it was publicly released)

Source: [GitHub Docs - About Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)

#### **Branch Unification** ✅
- Branch names are **universal pointers**
- "main" locally = "main" on GitHub
- No provider separation needed
- Current implementation is correct

### Critical Insights from Research

#### **Insight #1: PR Phantom Merge Commits**
When GitHub receives a PR, it creates a **temporary merge commit** on `refs/pull/:prNumber/merge` for testing purposes. This SHA **does not exist** in any actual branch.

```
GITHUB_SHA in PR event: abc123def456 (phantom - only exists in GitHub's internal testing)
Actual head commit SHA: github.event.pull_request.head.sha (real commit)
```

**Impact**: Cannot match PR events using `GITHUB_SHA` alone
**Solution**: Use `pullRequestNumber` (primary) + `metadata.headSha` (secondary)
**Source**: [GitHub Discussion #26325](https://github.com/orgs/community/discussions/26325)

#### **Insight #2: SHA Abbreviation Intelligence**
Git dynamically computes minimum SHA length for uniqueness:
- Typical repos: 7 characters
- Large repos: 8-10 characters
- Full SHA: 40 characters

**Solution**: Use prefix matching with `startsWith()` (already implemented)
**Source**: [Stack Overflow - Git SHA Abbreviation](https://stackoverflow.com/questions/18134627/)

#### **Insight #3: Tag Immutability**
Tags are **immutable pointers** - once created, they never move to a different commit.

```bash
git tag v1.0.0 abc123  # Tag v1.0.0 points to commit abc123 FOREVER
```

**Impact**: Tag name matching is **100% reliable** for event correlation
**Source**: [Stack Overflow - Tags vs Branches](https://stackoverflow.com/questions/1457103/)

#### **Insight #4: Tags Without Releases**
Many teams create git tags but don't use GitHub's release feature:
- Internal version tags
- Beta/RC tags
- Automated CI tags

**Impact**: System must handle unmatched tags gracefully
**Solution**: Already works via single-source events (no merging needed)
**Source**: [Stack Overflow - Tag vs Release](https://stackoverflow.com/questions/18506508/)

#### **Insight #5: Version String Format Variations**
Tags use inconsistent naming conventions:
- `v1.0.0` vs `1.0.0`
- `release-1.0.0` vs `v1.0.0`
- `0.3.26` vs `v0.3.26`

**Impact**: Exact string matching fails for equivalent versions
**Solution**: Implement version normalization function

---

## Current State Analysis

### Logs from Production System

```
Type breakdown: commit=19, branch-checkout=4, merge=1, release=3

Comparing events: git-local:commit:"Release: v0.3.26" vs github:release:"v0.3.26 - Dual Color Modes..."
→ Different types (commit vs release), skipping

Grouped into 27 unique events
Deduplication complete: 27 → 27 events (0 duplicates removed, 0 merged)
```

### Identified Issues

| Issue | Description | Impact | Status |
|-------|-------------|--------|--------|
| **#1** | Git tags mapped to `EventType.COMMIT` | Releases never compared | ✅ Fixed |
| **#2** | Title format mismatch | "Release: v0.3.26" ≠ "v0.3.26 - Dual..." | ⚠️ Needs fix |
| **#3** | Timing differences | 4+ hours between tag/release | ⚠️ Needs fix |
| **#4** | Missing target SHA | GitHub releases don't include commit hash | ⚠️ Needs fix |
| **#5** | No version normalization | `v1.0.0` ≠ `1.0.0` | ⚠️ Needs fix |

### Example Mismatch

```
GIT TAG (v0.3.26):
├─ Type: commit (BUG - should be release)
├─ Title: "Release: v0.3.26"
├─ Hash: 7902fd676ead18f03c49485f093ed514730ad337
├─ Tag Name: v0.3.26
├─ Created: 2025-10-02 11:51:46 EST
└─ Provider: git-local

GITHUB RELEASE (v0.3.26):
├─ Type: release ✓
├─ Title: "v0.3.26 - Dual Color Modes with Shape-Based Differentiation"
├─ Hash: (missing!)
├─ Tag Name: v0.3.26
├─ Published: 2025-10-02 15:53:21 EST (4 hours later!)
└─ Provider: github
```

**Result**: Events never match because:
1. Types differ (commit vs release)
2. Titles differ completely
3. Timestamps 4 hours apart (exceeds 1-hour window)

---

## Event Matching Strategies

### Universal Matching Keys

| Event Type | Primary Key | Secondary Key | Tertiary Key | Confidence |
|------------|-------------|---------------|--------------|------------|
| **Commits** | SHA (hash, fullHash) | metadata.sha | — | 100% |
| **Merges** | SHA (hash) | parentIds[] | timestamp ±5min | 100% |
| **Tags** | Tag name (tags[0]) | Target commit SHA | — | 100% |
| **Releases** | Tag name | Target commit SHA | Fuzzy title + time | 95-60% |
| **PRs** | pullRequestNumber | metadata.headSha | — | 100% |
| **Branches** | Branch name | — | — | 100% |

### Three-Tier Release Matching Strategy

#### **TIER 1: Tag Name Matching (95-100% confidence)**
```typescript
// Exact match
"v0.3.26" === "v0.3.26" → MATCH (100%)

// Normalized match
normalizeVersion("v1.0.0") === normalizeVersion("1.0.0") → MATCH (95%)
// Strips 'v', 'release-' prefix, keeps only digits and dots
```

**Why it works**: Tags are immutable pointers - tag name is a reliable identifier

#### **TIER 2: Target Commit SHA (100% confidence)**
```typescript
// GitHub release points to same commit as git tag
github_release.target_commitish === git_tag.target_commit → MATCH
```

**Why it works**: SHA universality - cryptographically guaranteed

#### **TIER 3: Fuzzy Title + Time Proximity (60-80% confidence)**
```typescript
// Extract version from different title formats
extractVersion("Release: v0.3.26") === extractVersion("v0.3.26 - Dual...") → MATCH (80%)

// Relaxed time window (account for manual publication delay)
timeDiff < 1 week → MATCH (60%)
```

**Why needed**: Fallback when tag metadata unavailable

---

## Implementation Plan

### Phase 1: Core Release Matching (CRITICAL)

#### **1.1 Fix Release Type Mapping** ✅ COMPLETED
**File**: `src/providers/git/GitProvider.ts:240`

```typescript
private mapEventType(gitType: string): EventType {
  switch (gitType) {
    case 'commit':
      return EventType.COMMIT;
    case 'merge':
      return EventType.MERGE;
    case 'branch-created':
      return EventType.BRANCH_CREATED;
    case 'branch-deleted':
      return EventType.BRANCH_DELETED;
    case 'branch-checkout':
    case 'branch-switch':
      return EventType.BRANCH_CHECKOUT;
    case 'tag':
    case 'tag-created':
      return EventType.TAG_CREATED;
    case 'release':                    // ← ADDED
      return EventType.RELEASE;        // ← ADDED
    default:
      return EventType.COMMIT;
  }
}
```

**Impact**: Git release events now have correct type, will be compared to GitHub releases

---

#### **1.2 Enhanced Release Matching Logic** ⚠️ TODO
**File**: `src/orchestration/EventMatcher.ts`

```typescript
/**
 * Match releases using three-tier strategy
 * TIER 1: Tag name (exact or normalized) - 95-100% confidence
 * TIER 2: Target commit SHA - 100% confidence
 * TIER 3: Fuzzy title + relaxed time - 60-80% confidence
 */
private matchReleases(e1: CanonicalEvent, e2: CanonicalEvent): boolean {
  // TIER 1: Match by tag name (immutable, 100% reliable)
  const tag1 = this.extractTagName(e1);
  const tag2 = this.extractTagName(e2);

  if (tag1 && tag2) {
    // Exact match
    if (tag1 === tag2) {
      this.log.info(
        LogCategory.ORCHESTRATION,
        `✓ Releases match by exact tag: ${tag1}`,
        'matchReleases'
      );
      return true;
    }

    // Normalized match (v1.0.0 vs 1.0.0)
    const norm1 = this.normalizeVersion(tag1);
    const norm2 = this.normalizeVersion(tag2);
    if (norm1 === norm2) {
      this.log.info(
        LogCategory.ORCHESTRATION,
        `✓ Releases match by normalized tag: ${tag1} ≈ ${tag2} (${norm1})`,
        'matchReleases'
      );
      return true;
    }
  }

  // TIER 2: Match by target commit SHA (cryptographically guaranteed)
  const sha1 = e1.hash || e1.metadata?.target_commitish || e1.metadata?.targetCommit;
  const sha2 = e2.hash || e2.metadata?.target_commitish || e2.metadata?.targetCommit;

  if (sha1 && sha2 && this.matchCommitSHAs(sha1, sha2)) {
    this.log.info(
      LogCategory.ORCHESTRATION,
      `✓ Releases match by target SHA: ${sha1.substring(0, 7)}`,
      'matchReleases'
    );
    return true;
  }

  // TIER 3: Fuzzy title + relaxed time (low confidence fallback)
  const titleSimilarity = this.fuzzyMatchReleaseTitle(e1.title, e2.title);
  const timeDiff = Math.abs(e1.timestamp.getTime() - e2.timestamp.getTime());
  const oneWeek = 7 * 24 * 60 * 60 * 1000; // Relaxed from 1 hour

  if (titleSimilarity > 0.8 && timeDiff < oneWeek) {
    this.log.info(
      LogCategory.ORCHESTRATION,
      `✓ Releases match by fuzzy title+time (${titleSimilarity.toFixed(2)} similarity, ${Math.round(timeDiff / 3600000)}h apart)`,
      'matchReleases'
    );
    return true;
  }

  this.log.info(
    LogCategory.ORCHESTRATION,
    `✗ Releases don't match (tag1=${tag1}, tag2=${tag2}, sha1=${sha1?.substring(0, 7)}, sha2=${sha2?.substring(0, 7)}, similarity=${titleSimilarity.toFixed(2)})`,
    'matchReleases'
  );
  return false;
}

/**
 * Extract tag name from event (handles multiple data sources)
 */
private extractTagName(event: CanonicalEvent): string | undefined {
  // Priority order:
  // 1. tags[] array (most reliable)
  if (event.tags && event.tags.length > 0) {
    return event.tags[0];
  }

  // 2. metadata.tagName (GitHub releases)
  if (event.metadata?.tagName) {
    return event.metadata.tagName as string;
  }

  // 3. Extract from title (git tags with "Release: v1.0.0" format)
  const titleMatch = event.title.match(/(?:release:?\s*)?v?(\d+\.\d+\.\d+)/i);
  if (titleMatch) {
    // Return the full matched string (preserves 'v' prefix if present)
    return titleMatch[0].replace(/^release:?\s*/i, '');
  }

  return undefined;
}

/**
 * Normalize version strings for comparison
 * Examples:
 *   v1.0.0 → 1.0.0
 *   release-1.0.0 → 1.0.0
 *   V1.0.0 → 1.0.0
 */
private normalizeVersion(version: string): string {
  return version
    .toLowerCase()
    .replace(/^v/, '')              // Remove leading 'v'
    .replace(/^release-?/, '')      // Remove 'release-' or 'release' prefix
    .replace(/[^0-9.]/g, '');       // Keep only digits and dots
}

/**
 * Fuzzy match release titles (accounts for different description text)
 * Returns similarity score 0.0-1.0
 */
private fuzzyMatchReleaseTitle(title1: string, title2: string): number {
  // Extract version numbers from both titles
  const version1 = title1.match(/v?\d+\.\d+\.\d+/i)?.[0];
  const version2 = title2.match(/v?\d+\.\d+\.\d+/i)?.[0];

  // If both have versions, compare normalized versions
  if (version1 && version2) {
    const norm1 = this.normalizeVersion(version1);
    const norm2 = this.normalizeVersion(version2);
    return norm1 === norm2 ? 1.0 : 0.0;
  }

  // Fallback: simple string similarity
  const t1 = title1.toLowerCase().trim();
  const t2 = title2.toLowerCase().trim();

  if (t1 === t2) return 1.0;
  if (t1.includes(t2) || t2.includes(t1)) return 0.8;

  return 0.0;
}

/**
 * Match commit SHAs (handles abbreviated and full SHAs)
 */
private matchCommitSHAs(sha1: string | any, sha2: string | any): boolean {
  if (!sha1 || !sha2) return false;

  // Ensure we're working with strings
  const s1 = String(sha1).toLowerCase();
  const s2 = String(sha2).toLowerCase();

  // Support abbreviated SHAs (prefix matching)
  return s1.startsWith(s2) || s2.startsWith(s1);
}
```

**Expected Outcome**:
- Git release "v0.3.26" + GitHub release "v0.3.26" → MATCH via tag name
- Git release "v1.0.0" + GitHub release "1.0.0" → MATCH via normalization
- Git release + GitHub release with same SHA → MATCH via target commit

---

#### **1.3 Add Target Commit SHA to GitHub Releases** ⚠️ TODO
**File**: `src/providers/github/transformers/releaseTransformer.ts:15`

```typescript
export function transformRelease(release: GitHubRelease): CanonicalEvent {
  // Create author
  const author: Author = {
    id: release.author.login,
    name: release.author.login,
    username: release.author.login,
    avatarUrl: release.author.avatar_url
  };

  // Use published date if available, otherwise created date
  const timestamp = new Date(release.published_at || release.created_at);

  // Create canonical event
  const event: CanonicalEvent = {
    // Identity
    id: `release-${release.id}`,
    canonicalId: `github:release-${release.id}`,
    providerId: 'github',
    type: EventType.RELEASE,

    // Temporal
    timestamp,
    ingestedAt: new Date(),

    // Content
    title: release.name || release.tag_name,
    description: release.body || undefined,

    // Attribution
    author,

    // Context - CRITICAL: Add target commit hash
    tags: [release.tag_name],
    hash: release.target_commitish,           // ← NEW: Target commit SHA
    branches: [], // Releases aren't tied to specific branches

    // Context - External
    url: release.html_url,
    state: release.prerelease ? 'prerelease' : 'release',
    labels: release.prerelease ? ['prerelease'] : ['release'],

    // Relationships
    parentIds: [], // Could link to tag commit if needed

    // Metadata
    metadata: {
      tagName: release.tag_name,
      target_commitish: release.target_commitish, // ← NEW: Preserve SHA
      draft: release.draft,
      prerelease: release.prerelease,
      createdAt: release.created_at,
      publishedAt: release.published_at,
      assetCount: release.assets.length,
      assets: release.assets.map(a => ({
        name: a.name,
        downloadCount: a.download_count
      }))
    }
  };

  return event;
}
```

**Expected Outcome**: GitHub releases now include target commit SHA for TIER 2 matching

---

#### **1.4 Extract Target Commit SHA from Git Tags** ⚠️ TODO
**File**: `src/timeline/infrastructure/GitEventRepository.ts:243`

```typescript
/**
 * Extracts release/tag events with target commit SHA
 */
private async extractReleaseEvents(project: GitProjectInfo): Promise<GitEvent[]> {
  try {
    // Enhanced command: Get tag object hash AND target commit hash
    // %(objectname) = tag object hash (for annotated tags)
    // %(*objectname) = dereferenced commit hash (what the tag points to)
    const command = 'git tag --sort=-creatordate --format="%(objectname)|%(taggername)|%(creatordate:iso)|%(refname:short)|%(*objectname)"';

    const { stdout } = await execAsync(command, {
      cwd: project.rootPath,
      timeout: this.config.timeoutMs
    });

    if (!stdout.trim()) return [];

    const releaseEvents = stdout.trim().split('\n').map(line => {
      const [tagHash, author, dateStr, tagName, commitHash] = line.split('|');

      // Use commit hash if available (annotated tags), otherwise tag hash (lightweight tags)
      const targetHash = commitHash || tagHash;

      return {
        id: `${targetHash}-release`,
        type: 'release' as GitEventType,
        author: author || 'Unknown',
        date: new Date(dateStr),
        title: `Release: ${tagName}`,
        branch: 'main', // Releases typically on main branch
        // CRITICAL: Store both tag hash and target commit hash
        metadata: {
          tagHash,              // Tag object hash (for annotated tags)
          targetCommit: targetHash, // Commit hash that tag points to
          tagName,              // Tag name (v1.0.0, etc.)
          visualType: 'normal' as const,
          importance: 'high' as const
        }
      };
    }).filter(event => event.id && !isNaN(event.date.getTime()));

    console.log(`GitEventRepository: Extracted ${releaseEvents.length} release events`);
    return releaseEvents;

  } catch (error) {
    console.warn('GitEventRepository: Failed to extract releases:', error);
    return [];
  }
}
```

**Key Changes**:
1. Enhanced git command to extract target commit hash (`%(*objectname)`)
2. Store both tag object hash and target commit hash in metadata
3. Use target commit hash as event ID for better matching

**Expected Outcome**: Git release events now include target commit SHA for TIER 2 matching

---

#### **1.5 Update GitProvider to Preserve Tag Metadata** ⚠️ TODO
**File**: `src/providers/git/GitProvider.ts:178`

```typescript
// Build canonical event
const canonicalEvent: CanonicalEvent = {
  // Identity
  id: gitEvent.id,
  canonicalId: `${this.id}:${gitEvent.id}`,
  providerId: this.id,
  type: eventType,

  // Temporal
  timestamp: gitEvent.date,

  // Content
  title: gitEvent.title || 'No title',
  description: undefined,

  // Attribution
  author,
  coAuthors,

  // Context - Git
  branches,
  primaryBranch: gitEvent.branch,

  // ENHANCED: Preserve tag name and target commit
  tags: gitEvent.metadata?.tagName ? [gitEvent.metadata.tagName] : undefined,
  hash: gitEvent.metadata?.targetCommit || gitEvent.id,  // Use target commit for releases
  fullHash: gitEvent.metadata?.targetCommit || gitEvent.id,

  // Relationships
  parentIds: gitEvent.parentHashes || [],

  // Metrics
  impact,

  // Extensibility
  metadata: {
    ...gitEvent.metadata,
    originalType: gitEvent.type,
    branchContext: gitEvent.metadata?.branchContext
  }
};
```

**Key Changes**:
1. Populate `tags[]` array from metadata.tagName
2. Use target commit as `hash` field for releases
3. Preserve all git tag metadata

**Expected Outcome**: Git release events have properly structured tag and hash fields

---

### Phase 2: PR & Merge Matching Enhancement

#### **2.1 Enhanced PR Matching to Handle Phantom SHAs** ⚠️ TODO
**File**: `src/orchestration/EventMatcher.ts`

```typescript
/**
 * Match pull requests by PR number or commit SHA
 * Handles GitHub's phantom merge commits on refs/pull/:prNumber/merge
 */
private matchPullRequests(e1: CanonicalEvent, e2: CanonicalEvent): boolean {
  // TIER 1: Match by PR number (100% reliable)
  if (e1.pullRequestNumber && e2.pullRequestNumber) {
    const match = e1.pullRequestNumber === e2.pullRequestNumber;
    if (match) {
      this.log.info(
        LogCategory.ORCHESTRATION,
        `✓ PRs match by number: #${e1.pullRequestNumber}`,
        'matchPullRequests'
      );
    }
    return match;
  }

  // TIER 2: Match by head SHA (actual commit, not phantom merge)
  // GitHub creates phantom merge commits on refs/pull/:prNumber/merge
  // Use headSha to get the real commit
  const headSha1 = e1.metadata?.headSha || e1.hash;
  const headSha2 = e2.metadata?.headSha || e2.hash;

  if (headSha1 && headSha2 && this.matchCommitSHAs(headSha1, headSha2)) {
    this.log.info(
      LogCategory.ORCHESTRATION,
      `✓ PRs match by head SHA: ${String(headSha1).substring(0, 7)}`,
      'matchPullRequests'
    );
    return true;
  }

  return false;
}
```

#### **2.2 Cross-Type Matching: PR_MERGED → MERGE** ⚠️ TODO
**File**: `src/orchestration/EventMatcher.ts:eventsMatch()`

```typescript
// Enhanced merge pair detection
if (e1.type !== e2.type) {
  // Special case 1: merge commits and PR merges can match
  const isMergePair = (
    (e1.type === EventType.MERGE && e2.type === EventType.PR_MERGED) ||
    (e1.type === EventType.PR_MERGED && e2.type === EventType.MERGE)
  );

  if (isMergePair) {
    // Match by merge commit SHA
    const sha1 = e1.hash;
    const sha2 = e2.hash;

    if (sha1 && sha2 && this.matchCommitSHAs(sha1, sha2)) {
      this.log.info(
        LogCategory.ORCHESTRATION,
        `✓ PR_MERGED matches MERGE by commit SHA: ${String(sha1).substring(0, 7)}`,
        'eventsMatch'
      );
      return true;
    }
  }

  if (!isMergePair) {
    return false;
  }
}
```

**Expected Outcome**: GitHub PR merge events can match local git merge commits

---

### Phase 3: Testing & Validation

#### **3.1 Remove Excessive Debug Logging** ⚠️ TODO
**Files**:
- `src/orchestration/EventMatcher.ts` (lines 168-210)
- Keep only essential match success/failure logs
- Remove verbose comparison logs

```typescript
// BEFORE (verbose):
this.log.info(`Comparing events: ${e1.providerId}:${e1.type}...`);
this.log.info(`  → Different types, skipping`);
this.log.info(`  → Same provider, skipping`);

// AFTER (concise):
// Only log when matches succeed or at info level for failures
if (matched) {
  this.log.info(`✓ Events matched: ${method}`);
}
```

#### **3.2 Add Test Scenarios**
Create test cases to validate:

```typescript
// Test 1: Git tag + GitHub release (exact tag match)
git_release: { type: RELEASE, tags: ['v0.3.26'], hash: 'abc123' }
github_release: { type: RELEASE, tags: ['v0.3.26'], hash: 'abc123' }
→ MATCH via tag name (TIER 1)

// Test 2: Git tag + GitHub release (normalized tag match)
git_release: { type: RELEASE, tags: ['v1.0.0'] }
github_release: { type: RELEASE, tags: ['1.0.0'] }
→ MATCH via normalized tag (TIER 1)

// Test 3: Git tag + GitHub release (SHA match)
git_release: { type: RELEASE, tags: ['v2.0.0'], hash: 'def456' }
github_release: { type: RELEASE, tags: ['v2.0.0'], hash: 'def456' }
→ MATCH via target SHA (TIER 2)

// Test 4: Git commit + GitHub push event
git_commit: { type: COMMIT, hash: 'abc123' }
github_push: { type: COMMIT, hash: 'abc123' }
→ MATCH via SHA

// Test 5: GitHub PR merged + Git merge commit
github_pr: { type: PR_MERGED, hash: 'xyz789' }
git_merge: { type: MERGE, hash: 'xyz789' }
→ MATCH via merge commit SHA

// Test 6: Abbreviated SHA matching
event1: { hash: 'abc123d' } // 7 chars
event2: { hash: 'abc123def456789...' } // 40 chars
→ MATCH via prefix

// Test 7: Unmatched git tag (no GitHub release)
git_release: { type: RELEASE, tags: ['v0.1.0-beta'] }
→ No match, single-source event (correct)

// Test 8: Fuzzy title matching (fallback)
git_release: { type: RELEASE, title: 'Release: v0.3.0', timestamp: T1 }
github_release: { type: RELEASE, title: 'v0.3.0 - Major Update', timestamp: T1+2h }
→ MATCH via fuzzy title + time proximity (TIER 3)
```

---

### Phase 4: Documentation

#### **4.1 Create EVENT_MATCHING.md** ⚠️ TODO
Document the complete matching strategy, confidence levels, and edge cases.

See "Event Matching Strategies" section above for content structure.

#### **4.2 Update ARCHITECTURE.md** ⚠️ TODO
Add section on multi-provider event deduplication:

```markdown
## Event Deduplication

### Matching Strategy
Events from multiple providers (git-local, github) are matched and merged:

1. **Commits/Merges**: SHA-based (100% confidence)
2. **Releases**: Tag name → SHA → Fuzzy title (95-60% confidence)
3. **PRs**: PR number → Head SHA (100% confidence)

### Sync State Detection
Merged events have `sources[]` array populated:
- `sources.length === 1`: Single-source (local-only or remote-only)
- `sources.length > 1`: Multi-source (synced)

Sync state colors:
- **Synced**: Blue (git-local + github)
- **Local-only**: Orange (git-local only)
- **Remote-only**: Purple (github only)
```

---

## Expected Results

### Success Metrics

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Release matching rate | 0% | 95%+ | 90%+ |
| Commit matching rate | 100% | 100% | 100% |
| PR matching rate | N/A | 100% | 100% |
| Merge confidence tracking | No | Yes | Yes |
| False positive rate | 0% | <2% | <5% |

### Log Output After Fix

```
Type breakdown: commit=16, branch-checkout=4, merge=1, release=7
Provider breakdown: git-local=24, github=3

Found 7 release events to process:
  - git-local: "Release: v0.4.0" @ 2025-10-01T23:53:05Z (tag: v0.4.0)
  - git-local: "Release: v0.3.26" @ 2025-10-02T11:51:46Z (tag: v0.3.26)
  - git-local: "Release: v0.3.0" @ 2025-10-01T22:23:35Z (tag: v0.3.0)
  - git-local: "Release: v0.1.14" @ 2025-09-22T18:54:20Z (tag: v0.1.14)
  - github: "v0.4.0 - Filter UI Redesign" @ 2025-10-02T03:56:19Z (tag: v0.4.0)
  - github: "v0.3.26 - Dual Color Modes..." @ 2025-10-02T15:53:21Z (tag: v0.3.26)
  - github: "v0.3.0 - Simplified Architecture..." @ 2025-10-02T02:25:30Z (tag: v0.3.0)

✓ Releases match by exact tag: v0.4.0
  Merging git-local + github
✓ Releases match by exact tag: v0.3.26
  Merging git-local + github
✓ Releases match by exact tag: v0.3.0
  Merging git-local + github

Grouped into 24 unique events
Deduplication complete: 27 → 24 events (3 duplicates removed, 3 merged)
Match confidence: high=3, medium=0, low=0
```

---

## Implementation Checklist

### Phase 1: Core Release Matching
- [x] **1.1** Add `case 'release'` to GitProvider.mapEventType()
- [ ] **1.2** Enhance matchReleases() with 3-tier strategy
- [ ] **1.3** Add target_commitish to GitHub releases
- [ ] **1.4** Extract target commit SHA from git tags
- [ ] **1.5** Update GitProvider to preserve tag metadata

### Phase 2: PR Enhancement
- [ ] **2.1** Enhanced PR matching (handle phantom SHAs)
- [ ] **2.2** Cross-type matching (PR_MERGED → MERGE)

### Phase 3: Testing
- [ ] **3.1** Remove excessive debug logging
- [ ] **3.2** Add test scenarios (8 test cases)
- [ ] **3.3** Validate matching in production

### Phase 4: Documentation
- [ ] **4.1** Create EVENT_MATCHING.md
- [ ] **4.2** Update ARCHITECTURE.md

---

## Risk Assessment

### Low Risk
- Type mapping fix (1.1) - isolated change ✅
- Tag metadata extraction (1.4) - additive change
- GitHub release enhancement (1.3) - additive change

### Medium Risk
- Enhanced matchReleases() (1.2) - changes matching logic
  - Mitigation: Three-tier fallback ensures backwards compatibility
  - Mitigation: Extensive logging for debugging

### High Risk
- PR phantom SHA handling (2.1) - changes PR matching behavior
  - Mitigation: Only affects PR events (not currently used in production)
  - Mitigation: Fallback to existing hash field if headSha missing

---

## Rollback Plan

If issues occur after deployment:

1. **Revert Type Mapping** (1.1)
   ```typescript
   // Revert to: default: return EventType.COMMIT;
   ```

2. **Disable Enhanced Matching**
   ```typescript
   // In matchReleases(): return false; // Disable until fixed
   ```

3. **Remove Debug Logging**
   - Deploy hotfix removing verbose logs if performance impacted

---

## References

### Documentation
- [Git SHA Universality](https://stackoverflow.com/questions/29106996/)
- [GitHub Releases vs Tags](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)
- [GitHub PR Phantom SHAs](https://github.com/orgs/community/discussions/26325)
- [Git SHA Abbreviation](https://stackoverflow.com/questions/18134627/)
- [Tag Immutability](https://stackoverflow.com/questions/1457103/)

### Related Files
- `src/core/CanonicalEvent.ts` - Event type definitions
- `src/providers/git/GitProvider.ts` - Git event transformation
- `src/providers/github/transformers/releaseTransformer.ts` - GitHub release transformation
- `src/orchestration/EventMatcher.ts` - Event matching logic
- `src/timeline/infrastructure/GitEventRepository.ts` - Git event extraction

---

## Conclusion

This plan addresses the core issue preventing release matching (0% success) by:

1. **Fixing the bug**: Git releases now use correct EventType.RELEASE
2. **Adding missing data**: Target commit SHA included in both providers
3. **Intelligent matching**: Three-tier strategy (tag → SHA → fuzzy)
4. **Version normalization**: Handles v1.0.0 vs 1.0.0 variations
5. **Relaxed timing**: 1-week window accounts for publication delays

The implementation is low-risk with clear rollback options. The three-tier matching strategy provides both high-confidence matching (95%+) and graceful degradation to fuzzy matching when metadata is missing.

**Status**: Ready for implementation
**Priority**: HIGH (blocking sync-state color mode)
**Estimated Effort**: 4-6 hours
