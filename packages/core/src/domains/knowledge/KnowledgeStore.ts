/**
 * KnowledgeStore - In-Memory Knowledge Management
 *
 * Provides fast, indexed storage for knowledge items.
 * Maintains indexes for efficient filtering by type, scope, and tags.
 *
 * NOTE: Templates with embedded items are managed by TemplateStore (V1 system).
 */

import {
  KnowledgeItem,
  KnowledgeType,
  KnowledgeScope,
  KnowledgeStats,
  KnowledgeFilter,
  KnowledgeSearchResult
} from './types';

export class KnowledgeStore {
  private items: Map<string, KnowledgeItem> = new Map();

  // Indexes for fast lookups
  private indexByType: Map<KnowledgeType, Set<string>> = new Map();
  private indexByScope: Map<KnowledgeScope, Set<string>> = new Map();
  private indexByTag: Map<string, Set<string>> = new Map();
  private indexByPath: Map<string, string> = new Map();  // path -> id

  constructor() {
    this.initializeIndexes();
  }

  /**
   * Initialize empty indexes for all types and scopes
   */
  private initializeIndexes(): void {
    // Initialize type indexes
    for (const type of Object.values(KnowledgeType)) {
      this.indexByType.set(type, new Set());
    }

    // Initialize scope indexes
    for (const scope of Object.values(KnowledgeScope)) {
      this.indexByScope.set(scope, new Set());
    }
  }

  // ============================================
  // Item Operations
  // ============================================

  /**
   * Add a knowledge item to the store
   */
  addItem(item: KnowledgeItem): void {
    // Store the item
    this.items.set(item.id, item);

    // Update indexes
    this.updateIndexesForItem(item, 'add');
  }

  /**
   * Get a knowledge item by ID
   */
  getItem(id: string): KnowledgeItem | undefined {
    return this.items.get(id);
  }

  /**
   * Get a knowledge item by file path
   */
  getItemByPath(path: string): KnowledgeItem | undefined {
    const id = this.indexByPath.get(path);
    return id ? this.items.get(id) : undefined;
  }

  /**
   * Update a knowledge item
   */
  updateItem(id: string, updates: Partial<KnowledgeItem>): void {
    const existing = this.items.get(id);
    if (!existing) {
      throw new Error(`Knowledge item not found: ${id}`);
    }

    // Remove from old indexes
    this.updateIndexesForItem(existing, 'remove');

    // Merge updates
    const updated: KnowledgeItem = {
      ...existing,
      ...updates,
      id: existing.id,  // Never allow ID to change
      metadata: {
        ...existing.metadata,
        ...(updates.metadata || {}),
        updatedAt: new Date()
      }
    };

    // Store updated item
    this.items.set(id, updated);

    // Add to new indexes
    this.updateIndexesForItem(updated, 'add');
  }

  /**
   * Delete a knowledge item
   */
  deleteItem(id: string): void {
    const item = this.items.get(id);
    if (!item) {
      return;  // Already deleted
    }

    // Remove from indexes
    this.updateIndexesForItem(item, 'remove');

    // Remove from main storage
    this.items.delete(id);
  }

  /**
   * Get all knowledge items
   */
  getAllItems(): KnowledgeItem[] {
    return Array.from(this.items.values());
  }

  /**
   * Check if an item exists
   */
  hasItem(id: string): boolean {
    return this.items.has(id);
  }

  // ============================================
  // Filtering and Search
  // ============================================

  /**
   * Filter items by custom predicate
   */
  filterItems(predicate: (item: KnowledgeItem) => boolean): KnowledgeItem[] {
    return Array.from(this.items.values()).filter(predicate);
  }

  /**
   * Get items by type (uses index for efficiency)
   */
  getItemsByType(type: KnowledgeType): KnowledgeItem[] {
    const ids = this.indexByType.get(type) || new Set();
    return Array.from(ids)
      .map(id => this.items.get(id))
      .filter((item): item is KnowledgeItem => item !== undefined);
  }

  /**
   * Get items by scope (uses index for efficiency)
   */
  getItemsByScope(scope: KnowledgeScope): KnowledgeItem[] {
    const ids = this.indexByScope.get(scope) || new Set();
    return Array.from(ids)
      .map(id => this.items.get(id))
      .filter((item): item is KnowledgeItem => item !== undefined);
  }

  /**
   * Get items by tag (uses index for efficiency)
   */
  getItemsByTag(tag: string): KnowledgeItem[] {
    const ids = this.indexByTag.get(tag) || new Set();
    return Array.from(ids)
      .map(id => this.items.get(id))
      .filter((item): item is KnowledgeItem => item !== undefined);
  }

  /**
   * Apply a filter to get matching items
   */
  applyFilter(filter: KnowledgeFilter): KnowledgeItem[] {
    let results = this.getAllItems();

    // Filter by types
    if (filter.types && filter.types.length > 0) {
      const typeIds = new Set<string>();
      filter.types.forEach(type => {
        const ids = this.indexByType.get(type) || new Set();
        ids.forEach(id => typeIds.add(id));
      });
      results = results.filter(item => typeIds.has(item.id));
    }

    // Filter by scopes
    if (filter.scopes && filter.scopes.length > 0) {
      const scopeIds = new Set<string>();
      filter.scopes.forEach(scope => {
        const ids = this.indexByScope.get(scope) || new Set();
        ids.forEach(id => scopeIds.add(id));
      });
      results = results.filter(item => scopeIds.has(item.id));
    }

    // Filter by tags (must have ALL specified tags)
    if (filter.tags && filter.tags.length > 0) {
      results = results.filter(item =>
        filter.tags!.every(tag => item.tags.includes(tag))
      );
    }

    // Filter by valid only
    if (filter.validOnly) {
      results = results.filter(item => item.valid);
    }

    // Apply search query
    if (filter.query && filter.query.trim().length > 0) {
      const query = filter.query.toLowerCase().trim();
      results = results.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.body.toLowerCase().includes(query) ||
        (item.source && item.source.toLowerCase().includes(query)) ||
        item.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return results;
  }

  /**
   * Search items with scoring
   */
  searchItems(query: string): KnowledgeSearchResult[] {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const lowerQuery = query.toLowerCase().trim();
    const results: KnowledgeSearchResult[] = [];

    for (const item of this.items.values()) {
      let score = 0;
      const snippets: string[] = [];

      // Title match (highest weight)
      if (item.title.toLowerCase().includes(lowerQuery)) {
        score += 10;
      }

      // Source match
      if (item.source && item.source.toLowerCase().includes(lowerQuery)) {
        score += 5;
      }

      // Tag match
      const matchingTags = item.tags.filter(tag => tag.toLowerCase().includes(lowerQuery));
      score += matchingTags.length * 3;

      // Body match (with snippet extraction)
      const bodyLower = item.body.toLowerCase();
      const bodyIndex = bodyLower.indexOf(lowerQuery);
      if (bodyIndex !== -1) {
        score += 2;

        // Extract snippet around match
        const start = Math.max(0, bodyIndex - 50);
        const end = Math.min(item.body.length, bodyIndex + query.length + 50);
        let snippet = item.body.substring(start, end).trim();
        if (start > 0) snippet = '...' + snippet;
        if (end < item.body.length) snippet = snippet + '...';
        snippets.push(snippet);
      }

      if (score > 0) {
        results.push({ item, score, snippets });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return results;
  }

  // ============================================
  // Statistics
  // ============================================

  /**
   * Get statistics about the knowledge base
   */
  getStats(): KnowledgeStats {
    const stats: KnowledgeStats = {
      totalItems: this.items.size,
      itemsByType: new Map(),
      itemsByScope: new Map(),
      invalidItems: 0,
      uniqueTags: this.indexByTag.size,
      totalSize: 0
    };

    // Count by type
    for (const [type, ids] of this.indexByType.entries()) {
      if (ids.size > 0) {
        stats.itemsByType.set(type, ids.size);
      }
    }

    // Count by scope
    for (const [scope, ids] of this.indexByScope.entries()) {
      if (ids.size > 0) {
        stats.itemsByScope.set(scope, ids.size);
      }
    }

    // Count invalid items and total size
    for (const item of this.items.values()) {
      if (!item.valid) {
        stats.invalidItems++;
      }
      if (item.metadata.fileSize) {
        stats.totalSize += item.metadata.fileSize;
      }
    }

    return stats;
  }

  /**
   * Get all unique tags across all items
   */
  getAllTags(): string[] {
    return Array.from(this.indexByTag.keys()).sort();
  }

  // ============================================
  // Bulk Operations
  // ============================================

  /**
   * Clear all items
   */
  clear(): void {
    this.items.clear();
    this.indexByPath.clear();
    this.indexByTag.clear();

    // Reset type and scope indexes
    for (const set of this.indexByType.values()) {
      set.clear();
    }
    for (const set of this.indexByScope.values()) {
      set.clear();
    }
  }

  /**
   * Load multiple items at once
   */
  loadItems(items: KnowledgeItem[]): void {
    for (const item of items) {
      this.addItem(item);
    }
  }

  /**
   * Rebuild all indexes from current items
   */
  rebuildIndexes(): void {
    // Clear all indexes
    this.indexByPath.clear();
    this.indexByTag.clear();
    for (const set of this.indexByType.values()) {
      set.clear();
    }
    for (const set of this.indexByScope.values()) {
      set.clear();
    }

    // Rebuild from items
    for (const item of this.items.values()) {
      this.updateIndexesForItem(item, 'add');
    }
  }

  // ============================================
  // Private Helpers
  // ============================================

  /**
   * Update indexes when an item is added or removed
   */
  private updateIndexesForItem(item: KnowledgeItem, operation: 'add' | 'remove'): void {
    // Type index
    const typeSet = this.indexByType.get(item.type);
    if (typeSet) {
      if (operation === 'add') {
        typeSet.add(item.id);
      } else {
        typeSet.delete(item.id);
      }
    }

    // Scope index
    const scopeSet = this.indexByScope.get(item.scope);
    if (scopeSet) {
      if (operation === 'add') {
        scopeSet.add(item.id);
      } else {
        scopeSet.delete(item.id);
      }
    }

    // Tag indexes
    for (const tag of item.tags) {
      if (operation === 'add') {
        if (!this.indexByTag.has(tag)) {
          this.indexByTag.set(tag, new Set());
        }
        this.indexByTag.get(tag)!.add(item.id);
      } else {
        const tagSet = this.indexByTag.get(tag);
        if (tagSet) {
          tagSet.delete(item.id);
          if (tagSet.size === 0) {
            this.indexByTag.delete(tag);
          }
        }
      }
    }

    // Path index
    if (operation === 'add') {
      this.indexByPath.set(item.path, item.id);
    } else {
      this.indexByPath.delete(item.path);
    }
  }

  /**
   * Get debug information about the store
   */
  getDebugInfo(): any {
    return {
      items: this.items.size,
      indexes: {
        types: Array.from(this.indexByType.entries()).map(([type, ids]) => ({
          type,
          count: ids.size
        })),
        scopes: Array.from(this.indexByScope.entries()).map(([scope, ids]) => ({
          scope,
          count: ids.size
        })),
        tags: this.indexByTag.size,
        paths: this.indexByPath.size
      }
    };
  }
}
