/**
 * EventCacheService
 *
 * Handles all caching logic for events.
 * Responsible for:
 * - Storing cached events by repository
 * - TTL (Time-To-Live) management
 * - Cache invalidation
 * - Cache validity checking
 */

import { CanonicalEvent, FilterOptions, CachedRepoData } from '../../../events';
import { logger, LogCategory, LogPathway } from '../../../../infrastructure/logging';

export class EventCacheService {
  private cache = new Map<string, CachedRepoData>();
  private cacheTTL: number;

  constructor(cacheTTL: number = 300000) { // 5 minutes default
    this.cacheTTL = cacheTTL;
  }

  /**
   * Get cached events for a repository
   * Returns undefined if cache is invalid or doesn't exist
   */
  getCachedEvents(repoPath: string): CanonicalEvent[] | undefined {
    if (!this.isCacheValid(repoPath)) {
      return undefined;
    }

    const cached = this.cache.get(repoPath);
    return cached?.events;
  }

  /**
   * Get cached data for a repository
   * Returns undefined if cache is invalid or doesn't exist
   */
  getCachedData(repoPath: string): CachedRepoData | undefined {
    if (!this.isCacheValid(repoPath)) {
      return undefined;
    }

    return this.cache.get(repoPath);
  }

  /**
   * Cache events for a repository
   */
  setCachedEvents(
    repoPath: string,
    events: CanonicalEvent[],
    filterOptions: FilterOptions
  ): void {
    this.cache.set(repoPath, {
      repoPath,
      events,
      fetchedAt: new Date(),
      filterOptions
    });

    logger.info(
      LogCategory.ORCHESTRATION,
      `Cached ${events.length} events for ${repoPath}`,
      'EventCacheService.setCachedEvents',
      undefined,
      LogPathway.DATA_INGESTION
    );
  }

  /**
   * Check if cache is valid for a repository
   */
  isCacheValid(repoPath: string): boolean {
    const cached = this.cache.get(repoPath);
    if (!cached) {
      return false;
    }

    const age = Date.now() - cached.fetchedAt.getTime();
    const isValid = age < this.cacheTTL;

    if (!isValid) {
      logger.debug(
        LogCategory.ORCHESTRATION,
        `Cache expired for ${repoPath} (age: ${age}ms, TTL: ${this.cacheTTL}ms)`,
        'EventCacheService.isCacheValid'
      );
    }

    return isValid;
  }

  /**
   * Invalidate cache for a repository
   * If no repoPath provided, clears all caches
   */
  invalidateCache(repoPath?: string): void {
    if (repoPath) {
      logger.info(
        LogCategory.ORCHESTRATION,
        `Invalidating cache for ${repoPath}`,
        'EventCacheService.invalidateCache'
      );
      this.cache.delete(repoPath);
    } else {
      logger.info(
        LogCategory.ORCHESTRATION,
        'Clearing all caches',
        'EventCacheService.invalidateCache'
      );
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; repositories: string[] } {
    return {
      size: this.cache.size,
      repositories: Array.from(this.cache.keys())
    };
  }

  /**
   * Dispose cache
   */
  dispose(): void {
    this.cache.clear();
  }
}
