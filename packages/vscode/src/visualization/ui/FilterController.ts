/**
 * FilterController - Redesigned with Clear Checkbox UI
 *
 * Unified Selection Model:
 * - All filters use explicit selection (checkboxes)
 * - Clear visual state (checked = selected)
 * - AND logic: events must match ALL selected criteria
 * - Real-time count updates
 * - Multi-provider ready (git, GitHub, agent-brain)
 *
 * Uses EventVisualTheme for consistent colors across the extension
 */

import { FilterState, EventType } from '../../core/CanonicalEvent';
import { EventVisualTheme } from '../theme/EventVisualTheme';
import { logger, LogCategory, LogPathway } from '../../utils/Logger';

// Re-export FilterState for other modules
export { FilterState };

// Type alias for compatibility with existing code
export type CrossProviderFilterState = FilterState;

export interface AvailableOptions {
  branches: string[];
  authors: string[];
  eventTypes: (EventType | string)[];  // Accept both EventType enum and strings
  providers?: string[];
  tags?: string[];
  labels?: string[];
}

export interface EventCounts {
  total: number;
  filtered: number;
  byType: Map<string, number>;
  byBranch: Map<string, number>;
  byAuthor: Map<string, number>;
}

export interface FilterControllerOptions {
  onFilterUpdate?: (filters: FilterState) => void;
  colorMap?: { [key: string]: string };
}

/**
 * Simplified FilterController with checkbox-based UI
 */
export class FilterController {
  // State
  private filterState: FilterState = {};
  private availableOptions: AvailableOptions = {
    branches: [],
    authors: [],
    eventTypes: [],
    providers: []
  };
  private eventCounts: EventCounts = {
    total: 0,
    filtered: 0,
    byType: new Map(),
    byBranch: new Map(),
    byAuthor: new Map()
  };

  // UI elements
  private floatingMenu: HTMLElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private isMenuOpen = false;
  private activeTab: string = 'filter';

  // Configuration state (stored in filterState for persistence)
  // These defaults are used only for initial UI creation
  private currentColorMode: 'semantic' | 'sync-state' = 'semantic';
  private gitProviderEnabled: boolean = true; // Default to enabled
  private githubProviderEnabled: boolean = false; // Default to disabled
  private showConnections: boolean = true; // Default to showing connections

  // Callbacks
  private onFilterUpdate?: (filters: FilterState) => void;
  private onRefreshRequest?: () => void;
  private colorMap: { [key: string]: string };

  constructor(options: FilterControllerOptions = {}) {
    this.onFilterUpdate = options.onFilterUpdate;
    this.colorMap = options.colorMap || {};
  }

  /**
   * Initialize the filter controller
   */
  public initialize(): void {
    logger.debug(
      LogCategory.FILTERING,
      'Initializing FilterController with checkbox-based filters',
      'FilterController.initialize',
      undefined,
      LogPathway.FILTER_APPLY
    );
    console.log('[FilterController] Initializing checkbox-based filters');
    this.createFloatingMenu();
    this.setupClickBehavior();
    logger.debug(
      LogCategory.FILTERING,
      'FilterController initialization complete',
      'FilterController.initialize',
      undefined,
      LogPathway.FILTER_APPLY
    );
  }

  /**
   * Set callbacks
   */
  public setCallbacks(callbacks: {
    onFilterUpdate?: (filters: FilterState) => void;
    onRefreshRequest?: () => void;
  }): void {
    if (callbacks.onFilterUpdate) {
      this.onFilterUpdate = callbacks.onFilterUpdate;
    }
    if (callbacks.onRefreshRequest) {
      this.onRefreshRequest = callbacks.onRefreshRequest;
    }
  }

  /**
   * Update available filter options and compute counts
   *
   * @param options - Available filter options (branches, authors, event types)
   * @param allEvents - All events (unfiltered) for computing total counts
   * @param filteredEvents - Filtered events for computing filtered count
   */
  public updateAvailableOptions(
    options: AvailableOptions,
    allEvents?: any[],
    filteredEvents?: any[]
  ): void {
    logger.debug(
      LogCategory.FILTERING,
      'Updating available filter options',
      'FilterController.updateAvailableOptions',
      {
        branches: options.branches.length,
        authors: options.authors.length,
        eventTypes: options.eventTypes.length,
        allEventsCount: allEvents?.length,
        filteredEventsCount: filteredEvents?.length
      },
      LogPathway.FILTER_APPLY
    );
    console.log('[FilterController] Updating available options', options, 'all:', allEvents?.length, 'filtered:', filteredEvents?.length);
    this.availableOptions = options;

    // Compute counts from events if provided
    if (allEvents && allEvents.length > 0) {
      this.computeCountsFromEvents(allEvents, filteredEvents);
    } else if (this.eventCounts.total === 0) {
      // Fallback: set counts to 1 for each available option to show they exist
      this.eventCounts.byType.clear();
      this.eventCounts.byBranch.clear();
      this.eventCounts.byAuthor.clear();

      options.eventTypes.forEach(type => this.eventCounts.byType.set(type as string, 1));
      options.branches.forEach(branch => this.eventCounts.byBranch.set(branch, 1));
      options.authors.forEach(author => this.eventCounts.byAuthor.set(author, 1));

      this.eventCounts.total = allEvents?.length || 0;
      this.eventCounts.filtered = filteredEvents?.length || allEvents?.length || 0;
    }

    this.rebuildFilterUI();
    this.updateSummary();
  }

  /**
   * Compute counts from events array
   *
   * IMPORTANT: Counts (byType, byBranch, byAuthor) are computed from ALL events (unfiltered),
   * so they always show the total number available. Only eventCounts.filtered changes based on filters.
   *
   * @param allEvents - All events (unfiltered) for computing total counts
   * @param filteredEvents - Filtered events (optional) for computing filtered count
   */
  private computeCountsFromEvents(allEvents: any[], filteredEvents?: any[]): void {
    // Total count from all events
    this.eventCounts.total = allEvents.length;

    // Filtered count from filtered events (or same as total if no filtering)
    this.eventCounts.filtered = filteredEvents ? filteredEvents.length : allEvents.length;

    // Clear previous counts
    this.eventCounts.byType.clear();
    this.eventCounts.byBranch.clear();
    this.eventCounts.byAuthor.clear();

    // Compute counts from ALL events (not filtered)
    // This ensures counts always show total availability
    allEvents.forEach(event => {
      // Count by type
      const type = event.type;
      this.eventCounts.byType.set(type, (this.eventCounts.byType.get(type) || 0) + 1);

      // Count by branches (event can be in multiple branches)
      if (event.branches && Array.isArray(event.branches)) {
        event.branches.forEach((branch: string) => {
          this.eventCounts.byBranch.set(branch, (this.eventCounts.byBranch.get(branch) || 0) + 1);
        });
      }

      // Count by author
      const author = event.author?.name || event.author;
      if (author) {
        this.eventCounts.byAuthor.set(author, (this.eventCounts.byAuthor.get(author) || 0) + 1);
      }
    });
  }

  /**
   * Update event counts
   */
  public updateEventCounts(counts: EventCounts): void {
    logger.debug(
      LogCategory.FILTERING,
      'Updating event counts',
      'FilterController.updateEventCounts',
      { total: counts.total, filtered: counts.filtered },
      LogPathway.FILTER_APPLY
    );
    this.eventCounts = counts;
    this.updateSummary();
  }

  /**
   * Clear all filters
   */
  clearAllFilters(): void {
    console.log('[FilterController] Clearing all filters');

    this.filterState = {};

    // Clear search
    if (this.searchInput) {
      this.searchInput.value = '';
    }

    // Uncheck all filter checkboxes (but NOT provider checkboxes in Configuration tab)
    this.floatingMenu?.querySelectorAll('input[type="checkbox"]:not(#provider-git):not(#provider-github)').forEach((cb) => {
      (cb as HTMLInputElement).checked = false;
    });

    // Clear active filter badges
    this.updateActiveFilterBadges();

    // Update UI
    this.updateSectionCounts();
    this.applyFilters();
  }

  /**
   * Setup click behavior for floating menu
   */
  private setupClickBehavior(): void {
    const filtersTrigger = document.getElementById('filters-trigger');
    if (!filtersTrigger) {
      console.warn('[FilterController] Filters trigger not found');
      return;
    }

    // Toggle menu on click
    filtersTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleFloatingMenu();
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (this.isMenuOpen && this.floatingMenu && !this.floatingMenu.contains(e.target as Node)) {
        this.hideFloatingMenu();
      }
    });
  }

  // ==========================================
  // PRIVATE: FLOATING MENU
  // ==========================================

  /**
   * Create floating menu structure
   */
  private createFloatingMenu(): void {
    this.floatingMenu = document.createElement('div');
    this.floatingMenu.className = 'floating-filter-menu';
    this.floatingMenu.innerHTML = `
      <div class="floating-menu-content">
        <!-- Tab Navigation -->
        <div class="tab-navigation">
          <div class="tab-buttons">
            <button class="tab-btn active" data-tab="filter">Filter</button>
            <button class="tab-btn" data-tab="configuration">Configuration</button>
            <button class="tab-btn" data-tab="support">Support</button>
          </div>
          <button class="close-menu-btn" title="Close">×</button>
        </div>

        <!-- Tab Panels -->
        <div class="tab-content">
          <!-- FILTER TAB -->
          <div class="tab-panel active" data-tab="filter">
            <div class="filter-header">
              <div class="result-summary" id="result-summary">0/0</div>
              <input type="text" id="filter-search" placeholder="🔍 Search events...">
              <div class="filter-options">
                <label class="connection-toggle">
                  <input type="checkbox" id="show-connections-filter" checked>
                  <span>Show Connections</span>
                </label>
              </div>
              <button class="clear-filters-btn">Reset Filter</button>
            </div>

            <!-- Filter Sections Grid (3 columns) -->
        <div class="filter-sections-grid">
          <!-- Event Types -->
          <div class="filter-section">
            <div class="section-header collapsible" data-section="event-types">
              <span class="section-title">Event Types</span>
              <span class="section-count">0</span>
              <span class="collapse-icon">▼</span>
            </div>
            <div class="checkbox-list" id="event-types-list"></div>
          </div>

          <!-- Branches -->
          <div class="filter-section">
            <div class="section-header collapsible" data-section="branches">
              <span class="section-title">Branches</span>
              <span class="section-count">0</span>
              <span class="collapse-icon">▼</span>
            </div>
            <div class="checkbox-list" id="branches-list"></div>
          </div>

          <!-- Authors -->
          <div class="filter-section">
            <div class="section-header collapsible" data-section="authors">
              <span class="section-title">Authors</span>
              <span class="section-count">0</span>
              <span class="collapse-icon">▼</span>
            </div>
            <div class="checkbox-list" id="authors-list"></div>
          </div>

          <!-- Providers (hidden if only one) -->
          <div class="filter-section" id="providers-section" style="display: none;">
            <div class="section-header collapsible" data-section="providers">
              <span class="section-title">Providers</span>
              <span class="section-count">0</span>
              <span class="collapse-icon">▼</span>
            </div>
            <div class="checkbox-list" id="providers-list"></div>
          </div>
        </div>

            <!-- Active Filters -->
            <div class="active-filters-section">
              <div class="active-filters-badges" id="active-filters"></div>
            </div>
          </div>

          <!-- CONFIGURATION TAB -->
          <div class="tab-panel" data-tab="configuration">
            <!-- Config Sections Grid (3 columns) -->
            <div class="filter-sections-grid">
              <!-- Display Modes Column -->
              <div class="filter-section">
                <div class="section-header">
                  <span class="section-title">Display Modes</span>
                </div>
                <div class="checkbox-list">
                  <p class="config-section-description">Color represents:</p>
                  <div class="display-mode-item">
                    <input type="radio" id="mode-semantic" name="color-mode" value="semantic" checked>
                    <label for="mode-semantic">Event Type (what happened)</label>
                  </div>
                  <div class="display-mode-item">
                    <input type="radio" id="mode-sync" name="color-mode" value="sync-state">
                    <label for="mode-sync">Sync State (where it is)</label>
                  </div>
                  <p class="config-hint">Shape always represents: Event Type</p>
                </div>
              </div>

              <!-- Data Sources Column -->
              <div class="filter-section">
                <div class="section-header">
                  <span class="section-title">Data Sources</span>
                </div>
                <div class="checkbox-list">
                  <div class="provider-item">
                    <input type="checkbox" id="provider-git" ${this.gitProviderEnabled ? 'checked' : ''}>
                    <label for="provider-git">Git - Local repository commits, branches, and tags</label>
                  </div>
                  <div class="provider-item">
                    <input type="checkbox" id="provider-github" ${this.githubProviderEnabled ? 'checked' : ''}>
                    <label for="provider-github">GitHub API - Pull requests, issues, and releases</label>
                  </div>
                  <p class="config-hint" style="margin-left: 24px; margin-top: 4px; color: #888; font-size: 0.8em;">
                    Enabling GitHub API will prompt for authentication.
                  </p>
                  <div class="provider-item disabled">
                    <input type="checkbox" id="provider-agent-brain" disabled>
                    <label for="provider-agent-brain">Agent-Brain - AI insights (coming soon)</label>
                  </div>
                </div>
              </div>

              <!-- Reserved Column -->
              <div class="filter-section">
                <div class="section-header">
                  <span class="section-title">Reserved</span>
                </div>
                <div class="checkbox-list">
                  <p class="config-hint" style="color: #666;">Future configuration options</p>
                </div>
              </div>
            </div>
          </div>

          <!-- SUPPORT TAB -->
          <div class="tab-panel" data-tab="support">
            <div class="support-section">
              <h4 class="support-section-title">Support & Resources</h4>
              <div id="support-content" class="support-content">
                <p class="support-loading">Loading support resources...</p>
              </div>
              <div class="support-links">
                <a href="#" class="support-link" data-action="open-docs">📖 Documentation</a>
                <a href="#" class="support-link" data-action="open-github">🐛 Report Issue</a>
                <a href="#" class="support-link" data-action="refresh-support">🔄 Refresh</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.floatingMenu);

    // Setup event listeners
    this.setupMenuBehavior();
  }

  /**
   * Setup menu behavior
   */
  private setupMenuBehavior(): void {
    if (!this.floatingMenu) return;

    // Stop clicks inside menu from propagating (prevents outside-click close)
    this.floatingMenu.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Enable dragging
    this.enableMenuDragging();

    // Close button
    const closeBtn = this.floatingMenu.querySelector('.close-menu-btn');
    closeBtn?.addEventListener('click', () => this.hideFloatingMenu());

    // Tab switching
    this.floatingMenu.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabName = btn.getAttribute('data-tab');
        if (tabName) {
          this.switchTab(tabName);
        }
      });
    });

    // Color mode toggles
    const modeRadios = this.floatingMenu.querySelectorAll('input[name="color-mode"]');
    modeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const mode = (e.target as HTMLInputElement).value as 'semantic' | 'sync-state';
        console.log('[FilterController] Color mode changed:', mode);

        // Update local state
        this.currentColorMode = mode;

        // Persist to filterState for session persistence
        this.filterState.colorMode = mode;

        // Send setColorMode message to extension with enabledProviders
        if ((window as any).vscode) {
          (window as any).vscode.postMessage({
            type: 'setColorMode',
            mode: mode,
            enabledProviders: this.filterState.enabledProviders || ['git-local']
          });
        }

        // Notify backend to persist the configuration change
        this.applyFilters();
      });
    });

    // Helper function to update sync mode availability
    const updateSyncModeAvailability = () => {
      const gitEnabled = gitCheckbox?.checked || false;
      const githubEnabled = githubCheckbox?.checked || false;
      const syncAvailable = gitEnabled && githubEnabled;

      const syncRadio = document.getElementById('mode-sync') as HTMLInputElement;
      const semanticRadio = document.getElementById('mode-semantic') as HTMLInputElement;

      if (syncRadio) {
        syncRadio.disabled = !syncAvailable;

        // If sync mode becomes unavailable while selected, auto-switch to semantic
        if (!syncAvailable && syncRadio.checked) {
          console.log('[FilterController] Auto-switching to semantic mode (git-local + github not both enabled)');
          semanticRadio.checked = true;
          this.currentColorMode = 'semantic';
          this.filterState.colorMode = 'semantic';

          // Build current enabled providers list
          const enabledProviders: string[] = [];
          if (gitEnabled) enabledProviders.push('git-local');
          if (githubEnabled) enabledProviders.push('github');

          // Notify backend with updated provider list
          if ((window as any).vscode) {
            (window as any).vscode.postMessage({
              type: 'setColorMode',
              mode: 'semantic',
              enabledProviders: enabledProviders
            });
          }
        }

        // Update visual state (greyed out when disabled)
        const syncLabel = syncRadio.parentElement;
        if (syncLabel) {
          syncLabel.style.opacity = syncAvailable ? '1' : '0.5';
          syncLabel.style.cursor = syncAvailable ? 'pointer' : 'not-allowed';
          syncRadio.title = syncAvailable
            ? 'Show sync state (local vs remote)'
            : 'Requires both Git and GitHub providers enabled';
        }
      }

      // Update EventVisualTheme with current provider list
      const enabledProviders: string[] = [];
      if (gitEnabled) enabledProviders.push('git-local');
      if (githubEnabled) enabledProviders.push('github');

      const EventVisualTheme = (window as any).EventVisualTheme;
      if (EventVisualTheme) {
        EventVisualTheme.setActiveProviders(enabledProviders);
      }
    };

    // Provider toggles
    const gitCheckbox = this.floatingMenu.querySelector('#provider-git') as HTMLInputElement;
    if (gitCheckbox) {
      gitCheckbox.addEventListener('change', (e) => {
        const isChecked = (e.target as HTMLInputElement).checked;

        console.log('[FilterController] Git provider toggle:', isChecked);

        // Update local state
        this.gitProviderEnabled = isChecked;

        // Persist to filterState for session persistence
        this.updateEnabledProviders('git-local', isChecked);

        // Send toggleProvider message to extension
        // NOTE: Provider ID is 'git-local', not 'git'
        if ((window as any).vscode) {
          (window as any).vscode.postMessage({
            type: 'toggleProvider',
            providerId: 'git-local',
            enabled: isChecked
          });
        }

        // Update sync mode availability
        updateSyncModeAvailability();

        // Notify backend to persist the configuration change
        this.applyFilters();
      });
    }

    // GitHub provider toggle
    const githubCheckbox = this.floatingMenu.querySelector('#provider-github') as HTMLInputElement;
    if (githubCheckbox) {
      githubCheckbox.addEventListener('change', (e) => {
        const isChecked = (e.target as HTMLInputElement).checked;

        console.log('[FilterController] GitHub provider toggle:', isChecked);

        // Update local state
        this.githubProviderEnabled = isChecked;

        // Persist to filterState for session persistence
        this.updateEnabledProviders('github', isChecked);

        // Send toggleProvider message to extension
        if ((window as any).vscode) {
          (window as any).vscode.postMessage({
            type: 'toggleProvider',
            providerId: 'github',
            enabled: isChecked
          });
        }

        // Update sync mode availability
        updateSyncModeAvailability();

        // Notify backend to persist the configuration change
        this.applyFilters();
      });
    }

    // Initialize sync mode availability on load
    updateSyncModeAvailability();

    // Show connections toggle (now in Filter tab)
    const connectionsCheckbox = this.floatingMenu.querySelector('#show-connections-filter') as HTMLInputElement;
    if (connectionsCheckbox) {
      connectionsCheckbox.addEventListener('change', (e) => {
        const isChecked = (e.target as HTMLInputElement).checked;
        console.log('[FilterController] Show connections toggle:', isChecked);

        // Update local state
        this.showConnections = isChecked;

        // Persist to filterState for session persistence
        this.filterState.showConnections = isChecked;

        // Toggle connection visibility in the SVG
        const connectionsGroup = document.querySelector('.connections');
        if (connectionsGroup) {
          (connectionsGroup as SVGElement).style.display = isChecked ? 'block' : 'none';
        }

        // Notify backend to persist the configuration change
        this.applyFilters();
      });
    }

    // Clear All button
    const clearBtn = this.floatingMenu.querySelector('.clear-filters-btn');
    clearBtn?.addEventListener('click', () => this.clearAllFilters());

    // Search input
    this.searchInput = this.floatingMenu.querySelector('#filter-search');
    if (this.searchInput) {
      let searchTimeout: NodeJS.Timeout;
      this.searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.filterState.searchQuery = (e.target as HTMLInputElement).value || undefined;
          this.updateActiveFilterBadges();
          this.applyFilters();
        }, 300); // 300ms debounce
      });
    }

    // Collapsible sections
    this.floatingMenu.querySelectorAll('.section-header.collapsible').forEach(header => {
      header.addEventListener('click', () => {
        const list = header.nextElementSibling;
        header.classList.toggle('collapsed');
        list?.classList.toggle('collapsed');
      });
    });
  }

  /**
   * Switch between tabs
   */
  private switchTab(tabName: string): void {
    if (!this.floatingMenu) return;

    this.activeTab = tabName;

    // Update tab buttons
    this.floatingMenu.querySelectorAll('.tab-btn').forEach(btn => {
      if (btn.getAttribute('data-tab') === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update tab panels
    this.floatingMenu.querySelectorAll('.tab-panel').forEach(panel => {
      if (panel.getAttribute('data-tab') === tabName) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });
  }

  /**
   * Enable dragging for the filter menu
   */
  private enableMenuDragging(): void {
    if (!this.floatingMenu) return;

    const tabNavigation = this.floatingMenu.querySelector('.tab-navigation');
    if (!tabNavigation) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    const onMouseDown = (e: MouseEvent) => {
      // Don't drag if clicking on buttons
      if ((e.target as HTMLElement).closest('button')) return;

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = this.floatingMenu!.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      this.floatingMenu!.style.cursor = 'grabbing';
      (tabNavigation as HTMLElement).style.cursor = 'grabbing';
      e.preventDefault();
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      this.floatingMenu!.style.left = `${initialLeft + deltaX}px`;
      this.floatingMenu!.style.top = `${initialTop + deltaY}px`;
      this.floatingMenu!.style.right = 'auto';
      this.floatingMenu!.style.bottom = 'auto';
    };

    const onMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        this.floatingMenu!.style.cursor = '';
        (tabNavigation as HTMLElement).style.cursor = 'grab';
      }
    };

    tabNavigation.addEventListener('mousedown', onMouseDown as EventListener);
    document.addEventListener('mousemove', onMouseMove as EventListener);
    document.addEventListener('mouseup', onMouseUp as EventListener);

    // Make tab navigation cursor indicate draggability
    (tabNavigation as HTMLElement).style.cursor = 'grab';
  }

  /**
   * Toggle floating menu
   */
  private toggleFloatingMenu(): void {
    if (this.isMenuOpen) {
      this.hideFloatingMenu();
    } else {
      this.showFloatingMenu();
    }
  }

  /**
   * Show floating menu
   */
  private showFloatingMenu(): void {
    if (!this.floatingMenu) return;

    const trigger = document.getElementById('filters-trigger');
    if (!trigger) return;

    // Position menu below trigger, aligned to the right edge
    const rect = trigger.getBoundingClientRect();
    const menuWidth = this.floatingMenu.offsetWidth || 380; // Use min-width as fallback

    this.floatingMenu.style.top = `${rect.bottom + 5}px`;
    this.floatingMenu.style.left = `${rect.right - menuWidth}px`;

    this.floatingMenu.classList.add('visible');
    this.isMenuOpen = true;
  }

  /**
   * Hide floating menu
   */
  private hideFloatingMenu(): void {
    if (!this.floatingMenu) return;
    this.floatingMenu.classList.remove('visible');
    this.isMenuOpen = false;
  }

  // ==========================================
  // PRIVATE: UI BUILDING
  // ==========================================

  /**
   * Rebuild all filter UI elements
   */
  private rebuildFilterUI(): void {
    this.buildEventTypesList();
    this.buildBranchesList();
    this.buildAuthorsList();
    this.buildProvidersList();
    this.updateSectionCounts();
    this.updateActiveFilterBadges();
  }

  /**
   * Build event types checkbox list
   */
  private buildEventTypesList(): void {
    const container = document.getElementById('event-types-list');
    if (!container) return;

    container.innerHTML = '';

    // Sort event types by z-index (ascending: low impact to high impact)
    const sortedEventTypes = [...this.availableOptions.eventTypes].sort((a, b) => {
      const zIndexA = EventVisualTheme.getEventZIndex(a);
      const zIndexB = EventVisualTheme.getEventZIndex(b);
      return zIndexA - zIndexB;
    });

    sortedEventTypes.forEach(type => {
      const count = this.eventCounts.byType.get(type) || 0;
      const color = this.getEventTypeColor(type);
      const visual = EventVisualTheme.getEventVisual(type);
      const icon = visual.icon || '●';

      // Check if this type is selected (or if no filter = all selected)
      const isChecked = !this.filterState.selectedEventTypes ||
                        this.filterState.selectedEventTypes.includes(type as any);

      const item = document.createElement('label');
      item.className = 'checkbox-item';
      item.innerHTML = `
        <input type="checkbox" value="${type}" data-filter-type="eventType" ${isChecked ? 'checked' : ''}>
        <span class="event-type-shape" style="color: ${color}">${icon}</span>
        <span class="checkbox-label">${this.formatEventType(type)}</span>
        <span class="checkbox-count">(${count})</span>
      `;

      // Add change listener
      const checkbox = item.querySelector('input') as HTMLInputElement;
      checkbox.addEventListener('change', () => this.onEventTypeChange(type, checkbox.checked));

      container.appendChild(item);
    });
  }

  /**
   * Build branches checkbox list
   */
  private buildBranchesList(): void {
    const container = document.getElementById('branches-list');
    if (!container) return;

    container.innerHTML = '';

    this.availableOptions.branches.forEach(branch => {
      const count = this.eventCounts.byBranch.get(branch) || 0;

      // Check if this branch is selected (or if no filter = all selected)
      const isChecked = !this.filterState.selectedBranches ||
                        this.filterState.selectedBranches.includes(branch);

      const item = document.createElement('label');
      item.className = 'checkbox-item';
      item.innerHTML = `
        <input type="checkbox" value="${branch}" data-filter-type="branch" ${isChecked ? 'checked' : ''}>
        <span class="checkbox-label">${branch}</span>
        <span class="checkbox-count">(${count})</span>
      `;

      // Add change listener
      const checkbox = item.querySelector('input') as HTMLInputElement;
      checkbox.addEventListener('change', () => this.onBranchChange(branch, checkbox.checked));

      container.appendChild(item);
    });
  }

  /**
   * Build authors checkbox list
   */
  private buildAuthorsList(): void {
    const container = document.getElementById('authors-list');
    if (!container) return;

    container.innerHTML = '';

    this.availableOptions.authors.forEach(author => {
      const count = this.eventCounts.byAuthor.get(author) || 0;

      // Check if this author is selected (or if no filter = all selected)
      const isChecked = !this.filterState.selectedAuthors ||
                        this.filterState.selectedAuthors.includes(author);

      const item = document.createElement('label');
      item.className = 'checkbox-item';
      item.innerHTML = `
        <input type="checkbox" value="${author}" data-filter-type="author" ${isChecked ? 'checked' : ''}>
        <span class="checkbox-label">${author}</span>
        <span class="checkbox-count">(${count})</span>
      `;

      // Add change listener
      const checkbox = item.querySelector('input') as HTMLInputElement;
      checkbox.addEventListener('change', () => this.onAuthorChange(author, checkbox.checked));

      container.appendChild(item);
    });
  }

  /**
   * Build providers checkbox list (for multi-provider support)
   */
  private buildProvidersList(): void {
    const section = document.getElementById('providers-section');
    const container = document.getElementById('providers-list');
    if (!container || !section) return;

    // Show section only if multiple providers available
    if (!this.availableOptions.providers || this.availableOptions.providers.length <= 1) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';
    container.innerHTML = '';

    this.availableOptions.providers.forEach(provider => {
      // Check if this provider is selected (or if no filter = all selected)
      const isChecked = !this.filterState.selectedProviders ||
                        this.filterState.selectedProviders.includes(provider);

      const item = document.createElement('label');
      item.className = 'checkbox-item';
      item.innerHTML = `
        <input type="checkbox" value="${provider}" data-filter-type="provider" ${isChecked ? 'checked' : ''}>
        <span class="checkbox-label">${this.formatProviderName(provider)}</span>
      `;

      // Add change listener
      const checkbox = item.querySelector('input') as HTMLInputElement;
      checkbox.addEventListener('change', () => this.onProviderChange(provider, checkbox.checked));

      container.appendChild(item);
    });
  }

  // ==========================================
  // PRIVATE: FILTER CHANGES
  // ==========================================

  /**
   * Handle event type checkbox change
   * Checked = included in results, Unchecked = excluded from results
   */
  private onEventTypeChange(type: string, checked: boolean): void {
    if (checked) {
      // Checking: add to selection
      if (!this.filterState.selectedEventTypes) {
        this.filterState.selectedEventTypes = [type as any];
      } else if (!this.filterState.selectedEventTypes.includes(type as any)) {
        this.filterState.selectedEventTypes.push(type as any);
      }
      // If all are now checked, set to undefined (optimization: show all)
      if (this.filterState.selectedEventTypes.length === this.availableOptions.eventTypes.length) {
        this.filterState.selectedEventTypes = undefined;
      }
    } else {
      // Unchecking: remove from selection
      if (!this.filterState.selectedEventTypes) {
        // Was showing all, now create array with all EXCEPT this one
        this.filterState.selectedEventTypes = this.availableOptions.eventTypes
          .filter(t => t !== type) as any[];
      } else {
        this.filterState.selectedEventTypes = this.filterState.selectedEventTypes.filter(t => t !== type);
      }
      // If none left, keep as empty array (show nothing)
      if (this.filterState.selectedEventTypes && this.filterState.selectedEventTypes.length === 0) {
        this.filterState.selectedEventTypes = [];
      }
    }

    this.updateSectionCounts();
    this.updateActiveFilterBadges();
    this.applyFilters();
  }

  /**
   * Handle branch checkbox change
   */
  private onBranchChange(branch: string, checked: boolean): void {
    console.log(`[FilterController] ═══ onBranchChange ═══ branch="${branch}", checked=${checked}`);
    console.log('[FilterController]   BEFORE filterState.selectedBranches:', this.filterState.selectedBranches);

    if (checked) {
      // Checking: add to selection
      if (!this.filterState.selectedBranches) {
        this.filterState.selectedBranches = [branch];
      } else if (!this.filterState.selectedBranches.includes(branch)) {
        this.filterState.selectedBranches.push(branch);
      }
      // If all are now checked, set to undefined (optimization: show all)
      if (this.filterState.selectedBranches.length === this.availableOptions.branches.length) {
        this.filterState.selectedBranches = undefined;
      }
    } else {
      // Unchecking: remove from selection
      if (!this.filterState.selectedBranches) {
        // Was showing all, now create array with all EXCEPT this one
        this.filterState.selectedBranches = this.availableOptions.branches.filter(b => b !== branch);
      } else {
        this.filterState.selectedBranches = this.filterState.selectedBranches.filter(b => b !== branch);
      }
      // If none left, keep as empty array (show nothing)
      if (this.filterState.selectedBranches && this.filterState.selectedBranches.length === 0) {
        this.filterState.selectedBranches = [];
      }
    }

    console.log('[FilterController]   AFTER filterState.selectedBranches:', this.filterState.selectedBranches);
    this.updateSectionCounts();
    this.updateActiveFilterBadges();
    this.applyFilters();
  }

  /**
   * Handle author checkbox change
   */
  private onAuthorChange(author: string, checked: boolean): void {
    if (checked) {
      // Checking: add to selection
      if (!this.filterState.selectedAuthors) {
        this.filterState.selectedAuthors = [author];
      } else if (!this.filterState.selectedAuthors.includes(author)) {
        this.filterState.selectedAuthors.push(author);
      }
      // If all are now checked, set to undefined (optimization: show all)
      if (this.filterState.selectedAuthors.length === this.availableOptions.authors.length) {
        this.filterState.selectedAuthors = undefined;
      }
    } else {
      // Unchecking: remove from selection
      if (!this.filterState.selectedAuthors) {
        // Was showing all, now create array with all EXCEPT this one
        this.filterState.selectedAuthors = this.availableOptions.authors.filter(a => a !== author);
      } else {
        this.filterState.selectedAuthors = this.filterState.selectedAuthors.filter(a => a !== author);
      }
      // If none left, keep as empty array (show nothing)
      if (this.filterState.selectedAuthors && this.filterState.selectedAuthors.length === 0) {
        this.filterState.selectedAuthors = [];
      }
    }

    this.updateSectionCounts();
    this.updateActiveFilterBadges();
    this.applyFilters();
  }

  /**
   * Handle provider checkbox change
   */
  private onProviderChange(provider: string, checked: boolean): void {
    if (checked) {
      // Checking: add to selection
      if (!this.filterState.selectedProviders) {
        this.filterState.selectedProviders = [provider];
      } else if (!this.filterState.selectedProviders.includes(provider)) {
        this.filterState.selectedProviders.push(provider);
      }
      // If all are now checked, set to undefined (optimization: show all)
      if (this.availableOptions.providers &&
          this.filterState.selectedProviders.length === this.availableOptions.providers.length) {
        this.filterState.selectedProviders = undefined;
      }
    } else {
      // Unchecking: remove from selection
      if (!this.filterState.selectedProviders) {
        // Was showing all, now create array with all EXCEPT this one
        this.filterState.selectedProviders = (this.availableOptions.providers || [])
          .filter(p => p !== provider);
      } else {
        this.filterState.selectedProviders = this.filterState.selectedProviders.filter(p => p !== provider);
      }
      // If none left, keep as empty array (show nothing)
      if (this.filterState.selectedProviders && this.filterState.selectedProviders.length === 0) {
        this.filterState.selectedProviders = [];
      }
    }

    this.updateSectionCounts();
    this.updateActiveFilterBadges();
    this.applyFilters();
  }

  // ==========================================
  // PRIVATE: UI UPDATES
  // ==========================================

  /**
   * Update section counts - show "selected/total"
   */
  private updateSectionCounts(): void {
    console.log('[FilterController] updateSectionCounts - availableOptions:', this.availableOptions);
    console.log('[FilterController] updateSectionCounts - filterState:', this.filterState);

    // Event Types
    const eventTypesSelected = this.filterState.selectedEventTypes?.length ?? this.availableOptions.eventTypes.length;
    const eventTypesTotal = this.availableOptions.eventTypes.length;
    console.log('[FilterController] Event types:', eventTypesSelected, '/', eventTypesTotal);
    this.updateSectionCount('event-types', eventTypesSelected, eventTypesTotal);

    // Branches
    const branchesSelected = this.filterState.selectedBranches?.length ?? this.availableOptions.branches.length;
    const branchesTotal = this.availableOptions.branches.length;
    console.log('[FilterController] Branches:', branchesSelected, '/', branchesTotal);
    this.updateSectionCount('branches', branchesSelected, branchesTotal);

    // Authors
    const authorsSelected = this.filterState.selectedAuthors?.length ?? this.availableOptions.authors.length;
    const authorsTotal = this.availableOptions.authors.length;
    console.log('[FilterController] Authors:', authorsSelected, '/', authorsTotal);
    this.updateSectionCount('authors', authorsSelected, authorsTotal);

    // Providers
    if (this.availableOptions.providers && this.availableOptions.providers.length > 1) {
      const providersSelected = this.filterState.selectedProviders?.length ?? this.availableOptions.providers.length;
      const providersTotal = this.availableOptions.providers.length;
      console.log('[FilterController] Providers:', providersSelected, '/', providersTotal);
      this.updateSectionCount('providers', providersSelected, providersTotal);
    }
  }

  /**
   * Update count for a section showing "selected/total"
   */
  private updateSectionCount(section: string, selected: number, total: number): void {
    const header = this.floatingMenu?.querySelector(`[data-section="${section}"]`);
    const countSpan = header?.querySelector('.section-count');
    if (countSpan) {
      countSpan.textContent = total > 0 ? `${selected}/${total}` : '0';
    }
  }

  /**
   * Update active filter badges
   */
  private updateActiveFilterBadges(): void {
    const container = this.floatingMenu?.querySelector('#active-filter-badges');
    if (!container) return;

    container.innerHTML = '';

    const badges: string[] = [];

    // Event types
    if (this.filterState.selectedEventTypes && this.filterState.selectedEventTypes.length > 0) {
      this.filterState.selectedEventTypes.forEach(type => {
        badges.push(this.createBadge('Event Type', this.formatEventType(type), () => {
          this.onEventTypeChange(type, false);
          this.rebuildFilterUI();
        }));
      });
    }

    // Branches
    if (this.filterState.selectedBranches && this.filterState.selectedBranches.length > 0) {
      this.filterState.selectedBranches.forEach(branch => {
        badges.push(this.createBadge('Branch', branch, () => {
          this.onBranchChange(branch, false);
          this.rebuildFilterUI();
        }));
      });
    }

    // Authors
    if (this.filterState.selectedAuthors && this.filterState.selectedAuthors.length > 0) {
      this.filterState.selectedAuthors.forEach(author => {
        badges.push(this.createBadge('Author', author, () => {
          this.onAuthorChange(author, false);
          this.rebuildFilterUI();
        }));
      });
    }

    // Search
    if (this.filterState.searchQuery) {
      badges.push(this.createBadge('Search', this.filterState.searchQuery, () => {
        this.filterState.searchQuery = undefined;
        if (this.searchInput) this.searchInput.value = '';
        this.updateActiveFilterBadges();
        this.applyFilters();
      }));
    }

    if (badges.length === 0) {
      container.innerHTML = '<span class="no-filters">None</span>';
    } else {
      container.innerHTML = badges.join('');
      // Setup remove button listeners
      container.querySelectorAll('.filter-badge-remove').forEach((btn, index) => {
        btn.addEventListener('click', () => {
          // Handler was already set up in createBadge
        });
      });
    }
  }

  /**
   * Create a filter badge HTML
   */
  private createBadge(category: string, value: string, onRemove: () => void): string {
    const id = `badge-${Math.random().toString(36).substr(2, 9)}`;
    setTimeout(() => {
      const badge = this.floatingMenu?.querySelector(`#${id} .filter-badge-remove`);
      if (badge) {
        badge.addEventListener('click', onRemove);
      }
    }, 0);

    return `
      <span class="filter-badge" id="${id}">
        ${category}: ${value}
        <span class="filter-badge-remove">×</span>
      </span>
    `;
  }

  /**
   * Update summary - show "filtered/total" format
   */
  private updateSummary(): void {
    const summary = this.floatingMenu?.querySelector('#result-summary');
    if (summary) {
      summary.textContent = `${this.eventCounts.filtered}/${this.eventCounts.total}`;
    }
  }

  /**
   * Update checkbox counts
   */
  private updateCheckboxCounts(): void {
    // Update event type counts
    this.eventCounts.byType.forEach((count, type) => {
      const item = this.floatingMenu?.querySelector(`input[value="${type}"][data-filter-type="eventType"]`)?.parentElement;
      const countSpan = item?.querySelector('.checkbox-count');
      if (countSpan) {
        countSpan.textContent = `(${count})`;
      }
    });

    // Update branch counts
    this.eventCounts.byBranch.forEach((count, branch) => {
      const item = this.floatingMenu?.querySelector(`input[value="${branch}"][data-filter-type="branch"]`)?.parentElement;
      const countSpan = item?.querySelector('.checkbox-count');
      if (countSpan) {
        countSpan.textContent = `(${count})`;
      }
    });

    // Update author counts
    this.eventCounts.byAuthor.forEach((count, author) => {
      const item = this.floatingMenu?.querySelector(`input[value="${author}"][data-filter-type="author"]`)?.parentElement;
      const countSpan = item?.querySelector('.checkbox-count');
      if (countSpan) {
        countSpan.textContent = `(${count})`;
      }
    });
  }

  // ==========================================
  // PRIVATE: HELPERS
  // ==========================================

  /**
   * Update enabled providers list in filterState
   */
  private updateEnabledProviders(providerId: string, enabled: boolean): void {
    if (!this.filterState.enabledProviders) {
      // Initialize with defaults if not set
      this.filterState.enabledProviders = ['git-local'];
    }

    if (enabled) {
      // Add provider if not already in list
      if (!this.filterState.enabledProviders.includes(providerId)) {
        this.filterState.enabledProviders.push(providerId);
      }
    } else {
      // Remove provider from list
      this.filterState.enabledProviders = this.filterState.enabledProviders.filter(
        p => p !== providerId
      );
    }

    console.log('[FilterController] Updated enabledProviders:', this.filterState.enabledProviders);
  }

  /**
   * Apply current filters
   */
  private applyFilters(): void {
    console.log('[FilterController] ═══ applyFilters() ═══');
    console.log('[FilterController]   Full filterState:', JSON.stringify(this.filterState, null, 2));
    console.log('[FilterController]   onFilterUpdate callback exists?', !!this.onFilterUpdate);

    if (this.onFilterUpdate) {
      console.log('[FilterController]   Calling onFilterUpdate callback with filterState...');
      this.onFilterUpdate(this.filterState);
    } else {
      console.warn('[FilterController]   WARNING: onFilterUpdate callback NOT SET!');
    }
  }

  /**
   * Get event type color from centralized theme
   * Use semantic color since filters don't have sync state context
   */
  private getEventTypeColor(type: string): string {
    return EventVisualTheme.getSemanticColor(type);
  }

  /**
   * Format event type for display
   */
  private formatEventType(type: string): string {
    return type
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Format provider name for display
   */
  private formatProviderName(provider: string): string {
    return provider
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // ==========================================
  // PUBLIC: COMPATIBILITY METHODS
  // ==========================================

  /**
   * Update filters from backend (used when switching repositories)
   * This ensures the UI checkboxes reflect the persisted filter state for the new repository
   */
  updateFiltersFromBackend(filterState: FilterState): void {
    console.log('[FilterController] ═══ updateFiltersFromBackend() ═══');
    console.log('[FilterController]   Received filterState:', JSON.stringify(filterState, null, 2));
    console.log('[FilterController]   Previous filterState:', JSON.stringify(this.filterState, null, 2));

    // Update internal state
    this.filterState = { ...filterState };

    // Restore configuration settings from filterState
    this.restoreConfigurationState();

    // Rebuild UI to reflect the new filter state (updates checkboxes)
    this.rebuildFilterUI();

    console.log('[FilterController]   ✓ Filter state synchronized from backend');
  }

  /**
   * Restore configuration settings (color mode, enabled providers) from filterState
   */
  private restoreConfigurationState(): void {
    console.log('[FilterController] ═══ restoreConfigurationState() ═══');

    // Restore color mode (default to 'semantic' if not set)
    const colorMode = this.filterState.colorMode || 'semantic';
    console.log('[FilterController]   Restoring colorMode:', colorMode);
    this.currentColorMode = colorMode;

    // Update color mode radio buttons in UI
    const semanticRadio = document.getElementById('mode-semantic') as HTMLInputElement;
    const syncRadio = document.getElementById('mode-sync') as HTMLInputElement;
    if (semanticRadio && syncRadio) {
      semanticRadio.checked = (colorMode === 'semantic');
      syncRadio.checked = (colorMode === 'sync-state');
    }

    // Restore enabled providers (default to git-local only if not set)
    const enabledProviders = this.filterState.enabledProviders || ['git-local'];
    console.log('[FilterController]   Restoring enabledProviders:', enabledProviders);

    // Update local state
    this.gitProviderEnabled = enabledProviders.includes('git-local');
    this.githubProviderEnabled = enabledProviders.includes('github');

    // Update provider checkboxes in UI
    const gitCheckbox = document.getElementById('provider-git') as HTMLInputElement;
    const githubCheckbox = document.getElementById('provider-github') as HTMLInputElement;
    if (gitCheckbox) {
      gitCheckbox.checked = this.gitProviderEnabled;
    }
    if (githubCheckbox) {
      githubCheckbox.checked = this.githubProviderEnabled;
    }

    // Restore show connections toggle (default to true if not set)
    this.showConnections = this.filterState.showConnections !== false;
    const connectionsCheckbox = document.getElementById('show-connections-filter') as HTMLInputElement;
    if (connectionsCheckbox) {
      connectionsCheckbox.checked = this.showConnections;
      // Apply visibility immediately
      const connectionsGroup = document.querySelector('.connections');
      if (connectionsGroup) {
        (connectionsGroup as SVGElement).style.display = this.showConnections ? 'block' : 'none';
      }
    }

    // Check if sync-state mode is available with current providers
    const syncAvailable = this.gitProviderEnabled && this.githubProviderEnabled;

    // If sync-state mode is not available but was selected, switch to semantic
    let finalColorMode = colorMode;
    if (colorMode === 'sync-state' && !syncAvailable) {
      console.log('[FilterController]   Sync-state not available (providers not enabled), switching to semantic');
      finalColorMode = 'semantic';
      this.currentColorMode = 'semantic';
      this.filterState.colorMode = 'semantic';

      // Update radio buttons
      if (semanticRadio) semanticRadio.checked = true;
      if (syncRadio) syncRadio.checked = false;
    }

    // Disable/enable sync-state radio button based on provider availability
    if (syncRadio) {
      syncRadio.disabled = !syncAvailable;
      const syncLabel = syncRadio.parentElement;
      if (syncLabel) {
        syncLabel.style.opacity = syncAvailable ? '1' : '0.5';
        syncLabel.style.cursor = syncAvailable ? 'pointer' : 'not-allowed';
        syncRadio.title = syncAvailable
          ? 'Show sync state (local vs remote)'
          : 'Requires both Git and GitHub providers enabled';
      }
    }

    // CRITICAL: Apply the restored color mode to the visualization
    // This ensures the timeline renders with the correct colors, not defaults
    // MUST include enabledProviders for sync-state mode to work
    if ((window as any).vscode) {
      console.log('[FilterController]   Sending setColorMode message to apply restored mode');
      (window as any).vscode.postMessage({
        type: 'setColorMode',
        mode: finalColorMode,
        enabledProviders: enabledProviders
      });
    }

    console.log('[FilterController]   ✓ Configuration state restored');
  }

  /**
   * Get current filter state
   */
  getFilterState(): FilterState {
    return { ...this.filterState };
  }

  /**
   * Reset all filters
   */
  resetFilters(): void {
    this.clearAllFilters();
  }

  /**
   * Set available event types (compatibility method)
   */
  setAvailableEventTypes(eventTypes: string[]): void {
    this.availableOptions.eventTypes = eventTypes;
    this.buildEventTypesList();
  }

  /**
   * Update event type filters (compatibility method)
   */
  updateEventTypeFilters(counts?: Map<string, number>): void {
    if (counts) {
      this.eventCounts.byType = counts;
      this.updateCheckboxCounts();
    }
  }

  /**
   * Get active filter count
   */
  getActiveFilterCount(): number {
    let count = 0;
    if (this.filterState.selectedBranches?.length) count += this.filterState.selectedBranches.length;
    if (this.filterState.selectedAuthors?.length) count += this.filterState.selectedAuthors.length;
    if (this.filterState.selectedEventTypes?.length) count += this.filterState.selectedEventTypes.length;
    if (this.filterState.selectedProviders?.length) count += this.filterState.selectedProviders.length;
    if (this.filterState.searchQuery) count += 1;
    if (this.filterState.selectedTags?.length) count += this.filterState.selectedTags.length;
    if (this.filterState.selectedLabels?.length) count += this.filterState.selectedLabels.length;
    return count;
  }

  /**
   * Update time window state (for range selector persistence)
   * Follows same pattern as colorMode and showConnections
   */
  updateTimeWindow(timeWindow: { start: Date; end: Date } | null): void {
    console.log('[FilterController] ═══ updateTimeWindow() ═══');
    console.log('[FilterController]   New time window:', timeWindow);

    if (timeWindow) {
      // Store time window in filterState
      this.filterState.timeWindow = {
        start: timeWindow.start.toISOString(),
        end: timeWindow.end.toISOString()
      };
    } else {
      // Clear time window if null
      delete this.filterState.timeWindow;
    }

    // Trigger persistence via callback
    this.applyFilters();
  }

  /**
   * Get saved time window from filterState
   * Returns null if no time window is saved
   */
  getSavedTimeWindow(): { start: Date; end: Date } | null {
    if (!this.filterState.timeWindow) {
      return null;
    }

    return {
      start: new Date(this.filterState.timeWindow.start),
      end: new Date(this.filterState.timeWindow.end)
    };
  }
}
