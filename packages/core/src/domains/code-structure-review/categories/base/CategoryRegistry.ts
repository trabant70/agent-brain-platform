/**
 * Registry for managing category analyzers
 */

import type { ICategoryAnalyzer } from './CategoryTypes';
import { CategoryPriority } from './CategoryTypes';

/**
 * Singleton registry for category analyzers
 */
export class CategoryRegistry {
  private static instance: CategoryRegistry;
  private categories: Map<string, ICategoryAnalyzer>;

  private constructor() {
    this.categories = new Map();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): CategoryRegistry {
    if (!CategoryRegistry.instance) {
      CategoryRegistry.instance = new CategoryRegistry();
    }
    return CategoryRegistry.instance;
  }

  /**
   * Register a category analyzer
   */
  register(category: ICategoryAnalyzer): void {
    if (this.categories.has(category.id)) {
      throw new Error(`Category with id '${category.id}' is already registered`);
    }

    this.categories.set(category.id, category);
  }

  /**
   * Unregister a category analyzer
   */
  unregister(categoryId: string): boolean {
    return this.categories.delete(categoryId);
  }

  /**
   * Get a specific category by ID
   */
  get(categoryId: string): ICategoryAnalyzer | undefined {
    return this.categories.get(categoryId);
  }

  /**
   * Get all registered categories
   */
  getAll(): ICategoryAnalyzer[] {
    return Array.from(this.categories.values());
  }

  /**
   * Get categories by priority
   */
  getByPriority(priority: CategoryPriority): ICategoryAnalyzer[] {
    return this.getAll().filter(cat => cat.config.priority === priority);
  }

  /**
   * Get enabled categories only
   */
  getEnabled(): ICategoryAnalyzer[] {
    return this.getAll().filter(cat => cat.config.enabled);
  }

  /**
   * Get enabled categories by IDs
   */
  getEnabledByIds(categoryIds: string[]): ICategoryAnalyzer[] {
    return categoryIds
      .map(id => this.get(id))
      .filter((cat): cat is ICategoryAnalyzer =>
        cat !== undefined && cat.config.enabled
      );
  }

  /**
   * Get categories sorted by priority (ascending)
   */
  getSortedByPriority(): ICategoryAnalyzer[] {
    return this.getAll().sort((a, b) => a.config.priority - b.config.priority);
  }

  /**
   * Check if a category is registered
   */
  has(categoryId: string): boolean {
    return this.categories.has(categoryId);
  }

  /**
   * Get count of registered categories
   */
  count(): number {
    return this.categories.size;
  }

  /**
   * Clear all registered categories (useful for testing)
   */
  clear(): void {
    this.categories.clear();
  }

  /**
   * Get category metadata for UI display
   */
  getMetadataList() {
    return this.getSortedByPriority().map(cat => cat.getMetadata());
  }
}

/**
 * Convenience function to get registry instance
 */
export function getCategoryRegistry(): CategoryRegistry {
  return CategoryRegistry.getInstance();
}
