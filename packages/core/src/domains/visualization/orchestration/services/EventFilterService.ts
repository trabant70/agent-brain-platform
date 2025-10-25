/**
 * EventFilterService
 *
 * Handles all event filtering logic with AND semantics.
 * Responsible for:
 * - Applying filter criteria to events
 * - Computing filter options from events
 * - Multi-criteria filtering (branches, authors, types, etc.)
 * - Filter statistics and reporting
 */

import { CanonicalEvent, FilterState, FilterOptions, EventType } from '../../../events';
import { logger, LogCategory, LogPathway } from '../../../../infrastructure/logging';

export class EventFilterService {
  /**
   * Apply filters to events - Unified Selection with AND Logic
   *
   * Pure function: events[] + filters → filtered events[]
   * NO transformation, just filtering
   *
   * AND Logic: Event must match ALL specified criteria to pass
   * Undefined filter = show all (permissive)
   */
  applyFilters(events: CanonicalEvent[], filters: FilterState): CanonicalEvent[] {
    logger.info(
      LogCategory.ORCHESTRATION,
      `Applying filters to ${events.length} events`,
      'EventFilterService.applyFilters',
      filters,
      LogPathway.FILTER_APPLY
    );

    let rejectedByBranch = 0;
    let rejectedByAuthor = 0;
    let rejectedByType = 0;
    let rejectedByProvider = 0;
    let rejectedByDate = 0;
    let rejectedBySearch = 0;
    let rejectedByTag = 0;
    let rejectedByLabel = 0;

    const result = events.filter(event => {
      // 1. BRANCH FILTER (Inclusion)
      if (!this.filterByBranch(event, filters)) {
        rejectedByBranch++;
        return false;
      }

      // 2. AUTHOR FILTER (Inclusion)
      if (!this.filterByAuthor(event, filters)) {
        rejectedByAuthor++;
        return false;
      }

      // 3. EVENT TYPE FILTER (Inclusion + Legacy Exclusion)
      if (!this.filterByEventType(event, filters)) {
        rejectedByType++;
        return false;
      }

      // 4. PROVIDER FILTER (Inclusion)
      if (!this.filterByProvider(event, filters)) {
        rejectedByProvider++;
        return false;
      }

      // 5. DATE RANGE FILTER
      if (!this.filterByDateRange(event, filters)) {
        rejectedByDate++;
        return false;
      }

      // 6. SEARCH QUERY FILTER
      if (!this.filterBySearchQuery(event, filters)) {
        rejectedBySearch++;
        return false;
      }

      // 7. TAG FILTER (Inclusion)
      if (!this.filterByTag(event, filters)) {
        rejectedByTag++;
        return false;
      }

      // 8. LABEL FILTER (Inclusion)
      if (!this.filterByLabel(event, filters)) {
        rejectedByLabel++;
        return false;
      }

      // Event passed all filters
      return true;
    });

    logger.info(
      LogCategory.ORCHESTRATION,
      `Filter results: ${result.length} passed, ${events.length - result.length} rejected`,
      'EventFilterService.applyFilters',
      {
        passed: result.length,
        rejected: {
          branch: rejectedByBranch,
          author: rejectedByAuthor,
          type: rejectedByType,
          provider: rejectedByProvider,
          date: rejectedByDate,
          search: rejectedBySearch,
          tag: rejectedByTag,
          label: rejectedByLabel
        }
      },
      LogPathway.FILTER_APPLY
    );

    return result;
  }

  /**
   * Filter by branch
   */
  private filterByBranch(event: CanonicalEvent, filters: FilterState): boolean {
    const branchFilter = filters.selectedBranches || filters.branches;

    // Check for !== undefined, not &&, because empty array [] means "show nothing"
    if (branchFilter !== undefined && branchFilter.length > 0) {
      const hasMatchingBranch = event.branches.some(
        branch => branchFilter.includes(branch)
      );
      if (!hasMatchingBranch) {
        return false;
      }
    } else if (branchFilter !== undefined && branchFilter.length === 0) {
      // Empty array means "select none" - reject all events
      return false;
    }

    return true;
  }

  /**
   * Filter by author
   */
  private filterByAuthor(event: CanonicalEvent, filters: FilterState): boolean {
    const authorFilter = filters.selectedAuthors || filters.authors;

    // Check for !== undefined, not &&, because empty array [] means "show nothing"
    if (authorFilter !== undefined && authorFilter.length > 0) {
      const primaryAuthorMatches = authorFilter.includes(event.author.name);
      const coAuthorMatches = event.coAuthors?.some(
        ca => authorFilter.includes(ca.name)
      );
      if (!primaryAuthorMatches && !coAuthorMatches) {
        return false;
      }
    } else if (authorFilter !== undefined && authorFilter.length === 0) {
      // Empty array means "select none" - reject all events
      return false;
    }

    return true;
  }

  /**
   * Filter by event type
   */
  private filterByEventType(event: CanonicalEvent, filters: FilterState): boolean {
    // New inclusion model
    if (filters.selectedEventTypes !== undefined && filters.selectedEventTypes.length > 0) {
      if (!filters.selectedEventTypes.includes(event.type)) {
        return false;
      }
    } else if (filters.selectedEventTypes !== undefined && filters.selectedEventTypes.length === 0) {
      // Empty array means "select none" - reject all events
      return false;
    }

    // Legacy exclusion model (for backward compatibility)
    if (filters.excludedEventTypes && filters.excludedEventTypes.length > 0) {
      if (filters.excludedEventTypes.includes(event.type)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Filter by provider
   */
  private filterByProvider(event: CanonicalEvent, filters: FilterState): boolean {
    const providerFilter = filters.selectedProviders || filters.providers;

    // Check for !== undefined, not &&, because empty array [] means "show nothing"
    if (providerFilter !== undefined && providerFilter.length > 0) {
      if (!providerFilter.includes(event.providerId)) {
        return false;
      }
    } else if (providerFilter !== undefined && providerFilter.length === 0) {
      // Empty array means "select none" - reject all events
      return false;
    }

    return true;
  }

  /**
   * Filter by date range
   */
  private filterByDateRange(event: CanonicalEvent, filters: FilterState): boolean {
    if (filters.dateRange) {
      if (event.timestamp < filters.dateRange.start ||
          event.timestamp > filters.dateRange.end) {
        return false;
      }
    }

    return true;
  }

  /**
   * Filter by search query
   */
  private filterBySearchQuery(event: CanonicalEvent, filters: FilterState): boolean {
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const titleMatch = event.title.toLowerCase().includes(query);
      const descMatch = event.description?.toLowerCase().includes(query);
      const hashMatch = event.hash?.toLowerCase().includes(query);

      if (!titleMatch && !descMatch && !hashMatch) {
        return false;
      }
    }

    return true;
  }

  /**
   * Filter by tags
   */
  private filterByTag(event: CanonicalEvent, filters: FilterState): boolean {
    const tagFilter = filters.selectedTags || filters.tags;

    if (tagFilter && tagFilter.length > 0) {
      const hasMatchingTag = event.tags?.some(
        tag => tagFilter.includes(tag)
      );
      if (!hasMatchingTag) {
        return false;
      }
    }

    return true;
  }

  /**
   * Filter by labels
   */
  private filterByLabel(event: CanonicalEvent, filters: FilterState): boolean {
    if (filters.selectedLabels && filters.selectedLabels.length > 0) {
      const hasMatchingLabel = event.labels?.some(
        label => filters.selectedLabels!.includes(label)
      );
      if (!hasMatchingLabel) {
        return false;
      }
    }

    return true;
  }

  /**
   * Compute filter options from events
   * Analyzes events[] to build FilterOptions
   */
  computeFilterOptions(events: CanonicalEvent[]): FilterOptions {
    const branches = new Set<string>();
    const authors = new Set<string>();
    const types = new Set<EventType>();
    const providers = new Set<string>();
    const tags = new Set<string>();
    const labels = new Set<string>();

    let earliest: Date | undefined;
    let latest: Date | undefined;

    events.forEach(event => {
      // Collect all branches (FLATTEN branches[] array)
      event.branches.forEach(branch => branches.add(branch));

      // Collect all authors (primary + co-authors)
      authors.add(event.author.name);
      event.coAuthors?.forEach(ca => authors.add(ca.name));

      // Collect types and providers
      types.add(event.type);
      providers.add(event.providerId);

      // Collect tags and labels
      event.tags?.forEach(tag => tags.add(tag));
      event.labels?.forEach(label => labels.add(label));

      // Track date range
      if (!earliest || event.timestamp < earliest) {
        earliest = event.timestamp;
      }
      if (!latest || event.timestamp > latest) {
        latest = event.timestamp;
      }
    });

    return {
      branches: Array.from(branches).sort(),
      authors: Array.from(authors).sort(),
      eventTypes: Array.from(types),
      providers: Array.from(providers),
      dateRange: {
        earliest: earliest || new Date(),
        latest: latest || new Date()
      },
      tags: tags.size > 0 ? Array.from(tags).sort() : undefined,
      labels: labels.size > 0 ? Array.from(labels).sort() : undefined
    };
  }
}
