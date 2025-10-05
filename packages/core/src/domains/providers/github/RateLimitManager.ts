import * as vscode from 'vscode';
/**
 * Rate Limit Manager for GitHub API
 *
 * Manages GitHub API rate limits with intelligent throttling.
 *
 * Strategy:
 * - Track remaining requests and reset time
 * - Use ETag caching for 304 responses (don't count against rate limit)
 * - Auto-throttle when approaching limit
 * - Pause when headroom is too low
 */

// @ts-ignore - @octokit/rest is a runtime dependency
import { Octokit } from '@octokit/rest';
import { logger, LogCategory, createContextLogger } from '../../../infrastructure/logging';

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: Date;
  used: number;
  percentageUsed: number;
}

export interface RateLimitManagerOptions {
  minHeadroom?: number; // Minimum remaining requests before pausing (default: 100)
  warningThreshold?: number; // Warning threshold percentage (default: 0.8 = 80%)
  enableETagCache?: boolean; // Enable ETag caching (default: true)
}

/**
 * Rate Limit Manager
 *
 * Wraps GitHub API calls with rate limit protection.
 */
export class RateLimitManager {
  private readonly log = createContextLogger('RateLimitManager');

  private octokit: Octokit;
  private minHeadroom: number;
  private warningThreshold: number;
  private enableETagCache: boolean;

  // Current rate limit state
  private currentLimit: RateLimitInfo = {
    limit: 5000,
    remaining: 5000,
    resetAt: new Date(Date.now() + 3600000), // 1 hour from now
    used: 0,
    percentageUsed: 0
  };

  // ETag cache: url → etag
  private etagCache = new Map<string, string>();

  constructor(octokit: Octokit, options: RateLimitManagerOptions = {}) {
    this.octokit = octokit;
    this.minHeadroom = options.minHeadroom || 100;
    this.warningThreshold = options.warningThreshold || 0.8;
    this.enableETagCache = options.enableETagCache !== false;

    this.log.info(LogCategory.GITHUB, 'Initialized with minHeadroom=' + this.minHeadroom, 'constructor');
  }

  /**
   * Execute a request with rate limit protection
   *
   * @param request - Async function that makes the GitHub API call
   * @param cacheKey - Optional cache key for ETag caching
   * @returns Response from the API call
   */
  async executeWithRateLimit<T>(
    request: () => Promise<T>,
    cacheKey?: string
  ): Promise<T> {
    // Check headroom before making request
    await this.checkHeadroom();

    try {
      // Execute request
      const response = await request();

      // Update rate limit from response headers
      await this.updateRateLimitFromResponse();

      // Cache ETag if available
      if (this.enableETagCache && cacheKey && (response as any).headers?.etag) {
        this.etagCache.set(cacheKey, (response as any).headers.etag);
      }

      return response;

    } catch (error: any) {
      // Handle rate limit errors
      if (error.status === 403 && error.message?.includes('rate limit')) {
        this.log.warn(LogCategory.GITHUB, 'Rate limit exceeded', 'executeWithRateLimit');
        await this.handleRateLimitExceeded(error);
        throw error;
      }

      // Handle 304 Not Modified (ETag cache hit - doesn't count against rate limit)
      if (error.status === 304) {
        this.log.info(LogCategory.GITHUB, 'ETag cache hit (304 Not Modified)', 'executeWithRateLimit');
        return null as any; // Caller should handle this
      }

      throw error;
    }
  }

  /**
   * Get cached ETag for a URL
   */
  getETag(cacheKey: string): string | undefined {
    return this.etagCache.get(cacheKey);
  }

  /**
   * Get current rate limit info
   */
  async getRateLimitInfo(): Promise<RateLimitInfo> {
    await this.updateRateLimitFromAPI();
    return { ...this.currentLimit };
  }

  /**
   * Check if we're approaching rate limit
   */
  isApproachingLimit(): boolean {
    return this.currentLimit.percentageUsed >= this.warningThreshold;
  }

  /**
   * Get time until rate limit reset
   */
  getTimeUntilReset(): number {
    return Math.max(0, this.currentLimit.resetAt.getTime() - Date.now());
  }

  /**
   * Clear ETag cache
   */
  clearETagCache(): void {
    this.etagCache.clear();
    this.log.info(LogCategory.GITHUB, 'Cleared ETag cache', 'clearETagCache');
  }

  // ==========================================
  // PRIVATE METHODS
  // ==========================================

  /**
   * Check if we have enough headroom to make a request
   * Pauses if headroom is too low
   */
  private async checkHeadroom(): Promise<void> {
    if (this.currentLimit.remaining < this.minHeadroom) {
      const waitTime = this.getTimeUntilReset();
      this.log.warn(
        LogCategory.GITHUB,
        `Low headroom (${this.currentLimit.remaining} remaining). Waiting ${Math.ceil(waitTime / 1000)}s until reset.`,
        'checkHeadroom'
      );

      // Wait until reset (with a small buffer)
      await this.sleep(waitTime + 1000);

      // Refresh rate limit after waiting
      await this.updateRateLimitFromAPI();
    }

    // Warn if approaching limit
    if (this.isApproachingLimit()) {
      this.log.warn(
        LogCategory.GITHUB,
        `Approaching rate limit (${this.currentLimit.percentageUsed.toFixed(1)}% used)`,
        'checkHeadroom'
      );
    }
  }

  /**
   * Update rate limit from API response headers
   */
  private async updateRateLimitFromResponse(): Promise<void> {
    try {
      // Get rate limit from dedicated endpoint
      const { data } = await this.octokit.rateLimit.get();

      this.currentLimit = {
        limit: data.rate.limit,
        remaining: data.rate.remaining,
        resetAt: new Date(data.rate.reset * 1000),
        used: data.rate.used,
        percentageUsed: data.rate.used / data.rate.limit
      };

      this.log.debug(
        LogCategory.GITHUB,
        `Rate limit: ${this.currentLimit.remaining}/${this.currentLimit.limit} remaining`,
        'updateRateLimitFromResponse'
      );
    } catch (error) {
      this.log.error(LogCategory.GITHUB, `Failed to get rate limit: ${error}`, 'updateRateLimitFromResponse');
    }
  }

  /**
   * Update rate limit directly from API
   */
  private async updateRateLimitFromAPI(): Promise<void> {
    await this.updateRateLimitFromResponse();
  }

  /**
   * Handle rate limit exceeded error
   */
  private async handleRateLimitExceeded(error: any): Promise<void> {
    // Extract reset time from error
    const resetTime = error.response?.headers?.['x-ratelimit-reset'];
    if (resetTime) {
      const resetAt = new Date(parseInt(resetTime) * 1000);
      this.currentLimit.resetAt = resetAt;
      this.currentLimit.remaining = 0;

      const waitTime = resetAt.getTime() - Date.now();
      this.log.error(
        LogCategory.GITHUB,
        `Rate limit exceeded. Reset at ${resetAt.toISOString()} (${Math.ceil(waitTime / 1000)}s)`,
        'handleRateLimitExceeded'
      );
    }
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
