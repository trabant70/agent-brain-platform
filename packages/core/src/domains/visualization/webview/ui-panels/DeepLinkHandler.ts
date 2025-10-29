/**
 * Deep Link Handler
 * Enables URL-based navigation to specific visualizations, categories, and files
 *
 * URL Format:
 * - #overview: Navigate to overview
 * - #category/{categoryId}: Navigate to category detail
 * - #file/{filePath}: Navigate to file detail
 * - #category/{categoryId}/file/{filePath}: Navigate to file detail from category
 *
 * Query Parameters:
 * - tab={tabName}: Activate specific tab
 * - search={query}: Pre-fill search
 * - filter={filters}: Apply filters (JSON encoded)
 *
 * Examples:
 * - #overview
 * - #category/security
 * - #category/security?tab=heatmap
 * - #file/src/auth.ts
 * - #category/security/file/src/auth.ts
 * - #overview?search=authentication&filter={%22severities%22:[%22critical%22]}
 */

import { VisualizationCoordinator } from '../coordination/VisualizationCoordinator';
import type { AnalysisData } from '../coordination/AnalysisDataMapper';

export interface DeepLinkParams {
  view: 'overview' | 'category' | 'file';
  categoryId?: string;
  filePath?: string;
  tab?: string;
  search?: string;
  filter?: string;
}

/**
 * Deep Link Handler
 */
export class DeepLinkHandler {
  private coordinator: VisualizationCoordinator;
  private analysisData: AnalysisData | null = null;
  private boundHashChangeHandler: (() => void) | null = null;

  constructor(coordinator: VisualizationCoordinator) {
    this.coordinator = coordinator;
  }

  /**
   * Initialize deep linking
   */
  initialize(analysisData: AnalysisData): void {
    this.analysisData = analysisData;

    // Listen for hash changes
    this.boundHashChangeHandler = this.handleHashChange.bind(this);
    window.addEventListener('hashchange', this.boundHashChangeHandler);

    // Handle initial hash if present
    if (window.location.hash) {
      this.handleHashChange();
    }
  }

  /**
   * Handle hash change
   */
  private handleHashChange(): void {
    const params = this.parseHash(window.location.hash);

    if (!params || !this.analysisData) {
      console.warn('Invalid deep link or no analysis data');
      return;
    }

    console.log('Deep link navigation:', params);

    // Navigate to appropriate view
    this.navigateFromParams(params);

    // Apply query parameters
    this.applyQueryParams(params);
  }

  /**
   * Parse hash into deep link parameters
   */
  private parseHash(hash: string): DeepLinkParams | null {
    if (!hash || hash === '#') {
      return null;
    }

    // Remove leading #
    hash = hash.substring(1);

    // Split hash and query string
    const [path, queryString] = hash.split('?');
    const pathParts = path.split('/');

    // Parse query parameters
    const queryParams = this.parseQueryString(queryString || '');

    // Determine view type
    const view = pathParts[0] as 'overview' | 'category' | 'file';

    if (view === 'overview') {
      return {
        view: 'overview',
        ...queryParams
      };
    }

    if (view === 'category') {
      const categoryId = pathParts[1];
      if (!categoryId) {
        console.warn('Category ID missing in deep link');
        return null;
      }

      // Check if it's category/file format
      if (pathParts[2] === 'file') {
        const filePath = pathParts.slice(3).join('/');
        if (!filePath) {
          console.warn('File path missing in deep link');
          return null;
        }
        return {
          view: 'file',
          categoryId,
          filePath,
          ...queryParams
        };
      }

      return {
        view: 'category',
        categoryId,
        ...queryParams
      };
    }

    if (view === 'file') {
      const filePath = pathParts.slice(1).join('/');
      if (!filePath) {
        console.warn('File path missing in deep link');
        return null;
      }
      return {
        view: 'file',
        filePath,
        ...queryParams
      };
    }

    console.warn('Unknown view type in deep link:', view);
    return null;
  }

  /**
   * Parse query string
   */
  private parseQueryString(queryString: string): Partial<DeepLinkParams> {
    if (!queryString) {
      return {};
    }

    const params: Partial<DeepLinkParams> = {};
    const urlParams = new URLSearchParams(queryString);

    if (urlParams.has('tab')) {
      params.tab = urlParams.get('tab') || undefined;
    }

    if (urlParams.has('search')) {
      params.search = urlParams.get('search') || undefined;
    }

    if (urlParams.has('filter')) {
      params.filter = urlParams.get('filter') || undefined;
    }

    return params;
  }

  /**
   * Navigate from parameters
   */
  private async navigateFromParams(params: DeepLinkParams): Promise<void> {
    switch (params.view) {
      case 'overview':
        await this.coordinator.navigateToOverview();
        break;

      case 'category':
        if (params.categoryId) {
          const category = this.findCategory(params.categoryId);
          if (category) {
            await this.coordinator.navigateToCategoryDetail(
              params.categoryId,
              category.categoryName
            );
          } else {
            console.warn(`Category not found: ${params.categoryId}`);
            await this.coordinator.navigateToOverview();
          }
        }
        break;

      case 'file':
        if (params.filePath) {
          const fileExists = this.findFile(params.filePath);
          if (fileExists) {
            await this.coordinator.navigateToFileDetail(
              params.filePath,
              params.categoryId
            );
          } else {
            console.warn(`File not found: ${params.filePath}`);
            await this.coordinator.navigateToOverview();
          }
        }
        break;
    }
  }

  /**
   * Apply query parameters
   */
  private applyQueryParams(params: DeepLinkParams): void {
    // Apply tab selection
    if (params.tab) {
      setTimeout(() => {
        const tab = document.querySelector(`.viz-tab[data-tab="${params.tab}"]`) as HTMLElement;
        if (tab) {
          tab.click();
        }
      }, 100);
    }

    // Apply search
    if (params.search) {
      setTimeout(() => {
        const searchInput = document.getElementById('search-input') as HTMLInputElement;
        if (searchInput) {
          searchInput.value = params.search || '';
          searchInput.dispatchEvent(new Event('input'));
        }
      }, 100);
    }

    // Apply filters
    if (params.filter) {
      try {
        const filterCriteria = JSON.parse(decodeURIComponent(params.filter));
        window.dispatchEvent(new CustomEvent('deep-link-filter', {
          detail: filterCriteria
        }));
      } catch (error) {
        console.warn('Failed to parse filter from deep link:', error);
      }
    }
  }

  /**
   * Find category by ID
   */
  private findCategory(categoryId: string): any {
    return this.analysisData?.categories?.find(c => c.categoryId === categoryId);
  }

  /**
   * Find file by path
   */
  private findFile(filePath: string): boolean {
    return this.analysisData?.files?.some(f => f.path === filePath) || false;
  }

  /**
   * Update URL hash without triggering navigation
   */
  updateHash(hash: string, replace: boolean = false): void {
    const newUrl = `${window.location.pathname}${window.location.search}#${hash}`;

    if (replace) {
      window.history.replaceState(null, '', newUrl);
    } else {
      window.history.pushState(null, '', newUrl);
    }
  }

  /**
   * Create deep link for current state
   */
  createDeepLink(): string {
    const context = this.coordinator.getContext();
    let hash = '';

    switch (context.state) {
      case 'overview':
        hash = 'overview';
        break;

      case 'category-detail':
        if (context.categoryId) {
          hash = `category/${context.categoryId}`;
        }
        break;

      case 'file-detail':
        if (context.filePath) {
          if (context.categoryId) {
            hash = `category/${context.categoryId}/file/${context.filePath}`;
          } else {
            hash = `file/${context.filePath}`;
          }
        }
        break;
    }

    // Add query parameters
    const params: string[] = [];

    // Get active tab
    const activeTab = document.querySelector('.viz-tab.active') as HTMLElement;
    if (activeTab) {
      const tabName = activeTab.getAttribute('data-tab');
      if (tabName) {
        params.push(`tab=${tabName}`);
      }
    }

    // Get search query
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    if (searchInput && searchInput.value) {
      params.push(`search=${encodeURIComponent(searchInput.value)}`);
    }

    if (params.length > 0) {
      hash += `?${params.join('&')}`;
    }

    return hash;
  }

  /**
   * Enable automatic hash updating
   */
  enableAutoUpdate(): void {
    window.addEventListener('navigation-change', (() => {
      const deepLink = this.createDeepLink();
      if (deepLink) {
        this.updateHash(deepLink, true);
      }
    }) as EventListener);
  }

  /**
   * Dispose deep link handler
   */
  dispose(): void {
    if (this.boundHashChangeHandler) {
      window.removeEventListener('hashchange', this.boundHashChangeHandler);
      this.boundHashChangeHandler = null;
    }
    this.analysisData = null;
  }
}
