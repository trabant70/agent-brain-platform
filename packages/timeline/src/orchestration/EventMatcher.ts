/**
 * EventMatcher - Multi-Provider Event Deduplication
 *
 * Matches and merges events from different providers that represent
 * the same underlying action (e.g., git commit and GitHub PR merge).
 *
 * Matching Strategy:
 * - Commits: Match by hash/sha
 * - PRs: Match by pullRequestNumber
 * - Releases: Match by title + timestamp proximity
 * - Tags: Match by tag name
 * - Merges: Match by hash + parent hashes
 */

import { CanonicalEvent, EventType, EventSource } from '../core/CanonicalEvent';
import { logger, LogCategory, createContextLogger } from '../utils/Logger';

export interface MatchResult {
  /** Merged canonical event with sources[] populated */
  event: CanonicalEvent;

  /** Number of sources merged */
  sourceCount: number;

  /** Whether this is a merged event (true) or single-source (false) */
  isMerged: boolean;
}

export interface DeduplicationResult {
  /** Deduplicated events */
  events: CanonicalEvent[];

  /** Statistics about deduplication */
  stats: {
    totalInput: number;
    totalOutput: number;
    mergedCount: number;
    duplicatesRemoved: number;
  };
}

/**
 * EventMatcher class - handles event matching and deduplication
 */
export class EventMatcher {
  private readonly log = createContextLogger('EventMatcher');

  /**
   * Deduplicate events from multiple providers
   *
   * @param events - Array of events from all providers
   * @returns Deduplicated events with sources[] populated
   */
  deduplicateEvents(events: CanonicalEvent[]): DeduplicationResult {
    this.log.info(LogCategory.ORCHESTRATION, `Deduplicating ${events.length} events`, 'deduplicateEvents');

    const startTime = Date.now();

    // Log provider breakdown
    const providerCounts = new Map<string, number>();
    const typeCounts = new Map<string, number>();
    events.forEach(e => {
      providerCounts.set(e.providerId, (providerCounts.get(e.providerId) || 0) + 1);
      typeCounts.set(e.type, (typeCounts.get(e.type) || 0) + 1);
    });
    this.log.info(
      LogCategory.ORCHESTRATION,
      `Provider breakdown: ${Array.from(providerCounts.entries()).map(([p, c]) => `${p}=${c}`).join(', ')}`,
      'deduplicateEvents'
    );
    this.log.info(
      LogCategory.ORCHESTRATION,
      `Type breakdown: ${Array.from(typeCounts.entries()).map(([t, c]) => `${t}=${c}`).join(', ')}`,
      'deduplicateEvents'
    );

    // Group events by matching criteria
    const groups = this.groupMatchingEvents(events);
    this.log.info(LogCategory.ORCHESTRATION, `Grouped into ${groups.length} unique events`, 'deduplicateEvents');

    // Merge each group into a single event
    const deduplicated: CanonicalEvent[] = [];
    let mergedCount = 0;

    for (const group of groups) {
      if (group.length === 1) {
        // Single event - add initial source info
        deduplicated.push(this.addSourceInfo(group[0]));
      } else {
        // Multiple events - merge them
        const merged = this.mergeEvents(group);
        deduplicated.push(merged);
        mergedCount++;
        this.log.info(
          LogCategory.ORCHESTRATION,
          `Merged ${group.length} events: ${group.map(e => `${e.providerId}:${e.type}:${e.title.substring(0, 30)}`).join(' + ')}`,
          'deduplicateEvents'
        );
      }
    }

    const duration = Date.now() - startTime;

    const stats = {
      totalInput: events.length,
      totalOutput: deduplicated.length,
      mergedCount,
      duplicatesRemoved: events.length - deduplicated.length
    };

    this.log.info(
      LogCategory.ORCHESTRATION,
      `Deduplication complete: ${stats.totalInput} → ${stats.totalOutput} events (${stats.duplicatesRemoved} duplicates removed, ${mergedCount} merged) in ${duration}ms`,
      'deduplicateEvents'
    );

    return { events: deduplicated, stats };
  }

  /**
   * Group events that represent the same underlying action
   */
  private groupMatchingEvents(events: CanonicalEvent[]): CanonicalEvent[][] {
    const groups: CanonicalEvent[][] = [];
    const processed = new Set<string>();

    // DEBUG: Log all release events
    const releases = events.filter(e => e.type === EventType.RELEASE);
    if (releases.length > 0) {
      this.log.info(
        LogCategory.ORCHESTRATION,
        `Found ${releases.length} release events to process:`,
        'groupMatchingEvents'
      );
      releases.forEach(r => {
        this.log.info(
          LogCategory.ORCHESTRATION,
          `  - ${r.providerId}: "${r.title}" @ ${r.timestamp.toISOString()} (canonicalId: ${r.canonicalId})`,
          'groupMatchingEvents'
        );
      });
    }

    for (const event of events) {
      if (processed.has(event.canonicalId)) {
        continue;
      }

      // Find all events that match this one
      const matches = events.filter(e =>
        !processed.has(e.canonicalId) &&
        this.eventsMatch(event, e)
      );

      if (matches.length > 0) {
        groups.push(matches);
        matches.forEach(m => processed.add(m.canonicalId));
      }
    }

    return groups;
  }

  /**
   * Check if two events represent the same underlying action
   */
  private eventsMatch(e1: CanonicalEvent, e2: CanonicalEvent): boolean {
    // DEBUG: Log release event comparisons
    if (e1.type === EventType.RELEASE || e2.type === EventType.RELEASE) {
      this.log.info(
        LogCategory.ORCHESTRATION,
        `Comparing events: ${e1.providerId}:${e1.type}:"${e1.title.substring(0, 30)}" vs ${e2.providerId}:${e2.type}:"${e2.title.substring(0, 30)}"`,
        'eventsMatch'
      );
    }

    // Same canonical ID = same event
    if (e1.canonicalId === e2.canonicalId) {
      return true;
    }

    // Same provider = different events (providers don't duplicate within themselves)
    if (e1.providerId === e2.providerId) {
      if (e1.type === EventType.RELEASE || e2.type === EventType.RELEASE) {
        this.log.info(
          LogCategory.ORCHESTRATION,
          `  → Same provider (${e1.providerId}), skipping`,
          'eventsMatch'
        );
      }
      return false;
    }

    // Different event types rarely match (except merge/pr-merged)
    if (e1.type !== e2.type) {
      // Special case: merge commits and PR merges can match
      const isMergePair = (
        (e1.type === EventType.MERGE && e2.type === EventType.PR_MERGED) ||
        (e1.type === EventType.PR_MERGED && e2.type === EventType.MERGE)
      );
      if (!isMergePair) {
        if (e1.type === EventType.RELEASE || e2.type === EventType.RELEASE) {
          this.log.info(
            LogCategory.ORCHESTRATION,
            `  → Different types (${e1.type} vs ${e2.type}), skipping`,
            'eventsMatch'
          );
        }
        return false;
      }
    }

    // Type-specific matching logic
    switch (e1.type) {
      case EventType.COMMIT:
      case EventType.MERGE:
        return this.matchCommits(e1, e2);

      case EventType.PR_OPENED:
      case EventType.PR_MERGED:
      case EventType.PR_CLOSED:
        return this.matchPullRequests(e1, e2);

      case EventType.RELEASE:
        this.log.info(
          LogCategory.ORCHESTRATION,
          `  → Calling matchReleases()`,
          'eventsMatch'
        );
        return this.matchReleases(e1, e2);

      case EventType.TAG_CREATED:
        return this.matchTags(e1, e2);

      case EventType.BRANCH_CREATED:
      case EventType.BRANCH_DELETED:
        return this.matchBranches(e1, e2);

      default:
        // Default: no match for unknown types
        return false;
    }
  }

  /**
   * Match commits by hash/sha
   */
  private matchCommits(e1: CanonicalEvent, e2: CanonicalEvent): boolean {
    // Match by commit hash (full or abbreviated)
    if (e1.hash && e2.hash) {
      // One might be abbreviated, so check if one starts with the other
      const h1 = e1.hash.toLowerCase();
      const h2 = e2.hash.toLowerCase();
      return h1.startsWith(h2) || h2.startsWith(h1);
    }

    // Match by full hash
    if (e1.fullHash && e2.fullHash) {
      return e1.fullHash === e2.fullHash;
    }

    // Check metadata for SHA (GitHub uses 'sha' field)
    const sha1 = e1.metadata?.sha || e1.metadata?.headSha || e1.metadata?.baseSha;
    const sha2 = e2.metadata?.sha || e2.metadata?.headSha || e2.metadata?.baseSha;

    if (sha1 && sha2 && typeof sha1 === 'string' && typeof sha2 === 'string') {
      const s1 = sha1.toLowerCase();
      const s2 = sha2.toLowerCase();
      return s1.startsWith(s2) || s2.startsWith(s1);
    }

    // No hash available - can't match
    return false;
  }

  /**
   * Match pull requests by PR number
   */
  private matchPullRequests(e1: CanonicalEvent, e2: CanonicalEvent): boolean {
    if (e1.pullRequestNumber && e2.pullRequestNumber) {
      return e1.pullRequestNumber === e2.pullRequestNumber;
    }
    return false;
  }

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
        `✓ Releases match by target SHA: ${String(sha1).substring(0, 7)}`,
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
      `✗ Releases don't match (tag1=${tag1}, tag2=${tag2}, sha1=${String(sha1 || 'none').substring(0, 7)}, sha2=${String(sha2 || 'none').substring(0, 7)}, similarity=${titleSimilarity.toFixed(2)})`,
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

  /**
   * Match tags by tag name
   */
  private matchTags(e1: CanonicalEvent, e2: CanonicalEvent): boolean {
    // Match by tag in tags array
    if (e1.tags && e2.tags) {
      const tags1 = e1.tags.map(t => t.toLowerCase());
      const tags2 = e2.tags.map(t => t.toLowerCase());
      return tags1.some(t => tags2.includes(t));
    }

    // Match by title (tag name is often in title)
    const title1 = e1.title.trim().toLowerCase();
    const title2 = e2.title.trim().toLowerCase();
    return title1 === title2;
  }

  /**
   * Match branch events by branch name and timestamp
   */
  private matchBranches(e1: CanonicalEvent, e2: CanonicalEvent): boolean {
    // Must be same type (created/deleted)
    if (e1.type !== e2.type) {
      return false;
    }

    // Match by primary branch or first branch in array
    const branch1 = e1.primaryBranch || e1.branches[0];
    const branch2 = e2.primaryBranch || e2.branches[0];

    if (branch1 !== branch2) {
      return false;
    }

    // Timestamps should be within 5 minutes
    const timeDiff = Math.abs(e1.timestamp.getTime() - e2.timestamp.getTime());
    const fiveMinutes = 5 * 60 * 1000;
    return timeDiff < fiveMinutes;
  }

  /**
   * Add source info to a single-source event
   */
  private addSourceInfo(event: CanonicalEvent): CanonicalEvent {
    return {
      ...event,
      sources: [{
        providerId: event.providerId,
        sourceId: event.id,
        timestamp: event.ingestedAt || event.timestamp,
        metadata: event.metadata
      }]
    };
  }

  /**
   * Merge multiple events into a single canonical event
   */
  private mergeEvents(events: CanonicalEvent[]): CanonicalEvent {
    if (events.length === 0) {
      throw new Error('Cannot merge empty event array');
    }

    if (events.length === 1) {
      return this.addSourceInfo(events[0]);
    }

    this.log.debug(
      LogCategory.ORCHESTRATION,
      `Merging ${events.length} events: ${events.map(e => e.canonicalId).join(', ')}`,
      'mergeEvents'
    );

    // Sort by priority: git-local first (most authoritative for git data)
    const sorted = [...events].sort((a, b) => {
      if (a.providerId === 'git-local') return -1;
      if (b.providerId === 'git-local') return 1;
      return 0;
    });

    // Start with the most authoritative event
    const base = sorted[0];

    // Build sources array
    const sources: EventSource[] = events.map(e => ({
      providerId: e.providerId,
      sourceId: e.id,
      timestamp: e.ingestedAt || e.timestamp,
      metadata: e.metadata
    }));

    // Merge data with priority: git-local > github > others
    const merged: CanonicalEvent = {
      ...base,

      // Use combined canonical ID
      canonicalId: this.generateMergedCanonicalId(events),

      // Populate sources
      sources,

      // Merge branches (union of all branches from all sources)
      branches: this.mergeBranches(events),

      // Prefer git-local hash, fallback to others
      hash: base.hash || events.find(e => e.hash)?.hash,
      fullHash: base.fullHash || events.find(e => e.fullHash)?.fullHash,

      // Merge tags
      tags: this.mergeTags(events),

      // Merge labels
      labels: this.mergeLabels(events),

      // Use most complete impact data
      impact: this.mergeImpact(events),

      // Prefer URL from GitHub (more useful for navigation)
      url: events.find(e => e.providerId === 'github')?.url || base.url,

      // Merge metadata (combine all metadata objects)
      metadata: this.mergeMetadata(events)
    };

    return merged;
  }

  /**
   * Generate canonical ID for merged event
   */
  private generateMergedCanonicalId(events: CanonicalEvent[]): string {
    const providerIds = events.map(e => e.providerId).sort().join('+');
    const primaryId = events[0].id;
    return `merged:${providerIds}:${primaryId}`;
  }

  /**
   * Merge branches from multiple events (union)
   */
  private mergeBranches(events: CanonicalEvent[]): string[] {
    const allBranches = new Set<string>();
    events.forEach(e => e.branches.forEach(b => allBranches.add(b)));
    return Array.from(allBranches);
  }

  /**
   * Merge tags from multiple events (union)
   */
  private mergeTags(events: CanonicalEvent[]): string[] | undefined {
    const allTags = new Set<string>();
    events.forEach(e => e.tags?.forEach(t => allTags.add(t)));
    return allTags.size > 0 ? Array.from(allTags) : undefined;
  }

  /**
   * Merge labels from multiple events (union)
   */
  private mergeLabels(events: CanonicalEvent[]): string[] | undefined {
    const allLabels = new Set<string>();
    events.forEach(e => e.labels?.forEach(l => allLabels.add(l)));
    return allLabels.size > 0 ? Array.from(allLabels) : undefined;
  }

  /**
   * Merge impact metrics (use most complete data)
   */
  private mergeImpact(events: CanonicalEvent[]) {
    // Find event with most complete impact data
    const withImpact = events.filter(e => e.impact);
    if (withImpact.length === 0) {
      return undefined;
    }

    // Prefer GitHub data for impact (more accurate)
    const githubEvent = withImpact.find(e => e.providerId === 'github');
    if (githubEvent?.impact) {
      return githubEvent.impact;
    }

    return withImpact[0].impact;
  }

  /**
   * Merge metadata from all sources
   */
  private mergeMetadata(events: CanonicalEvent[]): Record<string, unknown> {
    const merged: Record<string, unknown> = {};

    events.forEach(e => {
      if (e.metadata) {
        Object.assign(merged, e.metadata);
      }
    });

    // Add source tracking
    merged.sourceProviders = events.map(e => e.providerId);
    merged.mergedAt = new Date();

    return merged;
  }
}
