/**
 * KnowledgeFilters - Filtering and sorting logic for knowledge items
 *
 * Provides stateless filtering and sorting operations for knowledge item lists.
 * Extracted from KnowledgeViewController for better testability and reusability.
 */

import { KnowledgeItem, KnowledgeType, KnowledgeScope } from '../../../../knowledge/types';

export interface FilterOptions {
  searchQuery?: string;
  filterType?: KnowledgeType | null;
  filterScope?: KnowledgeScope | null;
  filterTags?: string[];
  sortBy?: 'title' | 'type' | 'scope' | 'updated';
  sortDirection?: 'asc' | 'desc';
}

export class KnowledgeFilters {
  /**
   * Filter and sort knowledge items based on provided options
   * @param items - Array of knowledge items to filter
   * @param options - Filter and sort options
   * @returns Filtered and sorted array of knowledge items
   */
  static filter(items: KnowledgeItem[], options: FilterOptions = {}): KnowledgeItem[] {
    let result = [...items];

    // Apply search filter
    if (options.searchQuery) {
      const query = options.searchQuery.toLowerCase();
      result = result.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.body.toLowerCase().includes(query) ||
        (item.source && item.source.toLowerCase().includes(query)) ||
        item.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply type filter
    if (options.filterType) {
      result = result.filter(item => item.type === options.filterType);
    }

    // Apply scope filter
    if (options.filterScope) {
      result = result.filter(item => item.scope === options.filterScope);
    }

    // Apply tag filter
    if (options.filterTags && options.filterTags.length > 0) {
      result = result.filter(item =>
        options.filterTags!.every(tag => item.tags.includes(tag))
      );
    }

    // Sort items
    if (options.sortBy) {
      result.sort((a, b) => {
        let comparison = 0;

        switch (options.sortBy) {
          case 'title':
            comparison = a.title.localeCompare(b.title);
            break;
          case 'type':
            comparison = a.type.localeCompare(b.type);
            break;
          case 'scope':
            comparison = a.scope.localeCompare(b.scope);
            break;
          case 'updated':
            // Handle both Date objects and ISO strings (postMessage serializes Dates to strings)
            const dateA = a.metadata.updatedAt instanceof Date
              ? a.metadata.updatedAt.getTime()
              : new Date(a.metadata.updatedAt).getTime();
            const dateB = b.metadata.updatedAt instanceof Date
              ? b.metadata.updatedAt.getTime()
              : new Date(b.metadata.updatedAt).getTime();
            comparison = dateA - dateB;
            break;
        }

        return options.sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }
}
