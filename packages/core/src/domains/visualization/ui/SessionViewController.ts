/**
 * SessionViewController - Session History Tab Controller
 *
 * Manages the session history table view, including:
 * - Loading and displaying session journal data
 * - Sorting by various columns
 * - Search and filter functionality
 * - Session detail modal/popup
 * - Export to JSON
 */

import { ModalDialog } from './ModalDialog';
import { webviewLogger, LogCategory, LogPathway } from '../webview/WebviewLogger';

/**
 * Session Journal interface (from SessionFileSystem)
 */
export interface SessionJournal {
  id: string;
  title: string;
  startTime: string;  // ISO 8601
  endTime: string;    // ISO 8601
  summary?: string;
  tags?: string[];
  topics?: string[];
  filesModified?: string[];
  knowledgeItemsUsed?: string[];
  filePath: string;
  content: string;    // Full markdown content
}

/**
 * Sort configuration
 */
interface SortConfig {
  column: 'date' | 'title' | 'duration' | 'files';
  direction: 'asc' | 'desc';
}

/**
 * Controller state
 */
interface SessionViewState {
  sessions: SessionJournal[];
  filteredSessions: SessionJournal[];
  searchQuery: string;
  filterTopics: Set<string>;
  filterTags: Set<string>;
  sortConfig: SortConfig;
}

export class SessionViewController {
  private state: SessionViewState;
  private initialized: boolean = false;

  // DOM elements
  private searchInput: HTMLInputElement | null = null;
  private tableBody: HTMLElement | null = null;
  private statusText: HTMLElement | null = null;
  private sessionsCount: HTMLElement | null = null;
  private filterChipsContainer: HTMLElement | null = null;

  // Search debounce timeout
  private searchTimeout: any;

  // Callback to send messages to extension
  private sendMessage: ((message: any) => void) | null = null;

  constructor() {

    this.state = {
      sessions: [],
      filteredSessions: [],
      searchQuery: '',
      filterTopics: new Set(),
      filterTags: new Set(),
      sortConfig: {
        column: 'date',
        direction: 'desc'  // Newest first by default
      }
    };

    webviewLogger.debug(
      LogCategory.UI,
      'SessionViewController created',
      'constructor',
      undefined,
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Initialize the controller
   */
  initialize(onMessage: (message: any) => void): void {
    if (this.initialized) {
      webviewLogger.warn(
        LogCategory.UI,
        'SessionViewController already initialized',
        'initialize'
      );
      return;
    }

    this.sendMessage = onMessage;

    webviewLogger.info(
      LogCategory.UI,
      'Initializing SessionViewController',
      'initialize',
      undefined,
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Get DOM elements
    this.searchInput = document.getElementById('sessions-search') as HTMLInputElement;
    this.tableBody = document.getElementById('sessions-table-body');
    this.statusText = document.getElementById('sessions-status-text');
    this.sessionsCount = document.getElementById('sessions-count');
    this.filterChipsContainer = document.getElementById('sessions-filter-chips');

    // Setup event listeners
    this.setupEventListeners();

    this.initialized = true;

    webviewLogger.info(
      LogCategory.UI,
      'SessionViewController initialized successfully',
      'initialize',
      undefined,
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Search input with debounce (like KnowledgeViewController)
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
          this.state.searchQuery = (e.target as HTMLInputElement).value.toLowerCase();
          this.applyFiltersAndSort();
          webviewLogger.debug(
            LogCategory.UI,
            'Search query applied',
            'setupEventListeners',
            { searchQuery: this.state.searchQuery },
            LogPathway.KNOWLEDGE_MANAGEMENT
          );
        }, 150);
      });
    }

    // Sort headers
    const sortableHeaders = document.querySelectorAll('.sessions-table th.sortable');
    sortableHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const sortColumn = header.getAttribute('data-sort') as SortConfig['column'];
        if (sortColumn) {
          this.handleSort(sortColumn);
        }
      });
    });

    // Refresh button
    const refreshBtn = document.getElementById('refresh-sessions');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.requestRefresh();
      });
    }

    // Export button
    const exportBtn = document.getElementById('export-sessions');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportSessions();
      });
    }

    webviewLogger.debug(
      LogCategory.UI,
      'Event listeners attached',
      'setupEventListeners',
      undefined,
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Request initial data load (called when tab first becomes visible)
   */
  requestInitialLoad(): void {
    webviewLogger.debug(
      LogCategory.UI,
      'Requesting initial session data load',
      'requestInitialLoad',
      undefined,
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    if (this.sendMessage) {
      this.sendMessage({
        type: 'sessions:load-all'
      });
    }
  }

  /**
   * Load session data
   */
  loadData(sessions: SessionJournal[]): void {
    webviewLogger.info(
      LogCategory.UI,
      'Loading session data',
      'loadData',
      { count: sessions.length },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    this.state.sessions = sessions;
    this.applyFiltersAndSort(); // This now automatically renders table and updates status

    webviewLogger.info(
      LogCategory.UI,
      'Session data loaded and rendered',
      'loadData',
      {
        totalSessions: this.state.sessions.length,
        filteredSessions: this.state.filteredSessions.length
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Apply filters and sorting
   */
  private applyFiltersAndSort(): void {
    webviewLogger.debug(
      LogCategory.UI,
      'Applying filters and sort',
      'applyFiltersAndSort',
      {
        searchQuery: this.state.searchQuery,
        filterTopics: Array.from(this.state.filterTopics),
        filterTags: Array.from(this.state.filterTags),
        sortColumn: this.state.sortConfig.column,
        sortDirection: this.state.sortConfig.direction
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Start with all sessions
    let filtered = [...this.state.sessions];

    // Apply search filter
    if (this.state.searchQuery) {
      filtered = filtered.filter(session => {
        const searchText = this.state.searchQuery;
        return (
          session.title.toLowerCase().includes(searchText) ||
          session.summary?.toLowerCase().includes(searchText) ||
          session.topics?.some(t => t.toLowerCase().includes(searchText)) ||
          session.tags?.some(t => t.toLowerCase().includes(searchText))
        );
      });
    }

    // Apply topic filter
    if (this.state.filterTopics.size > 0) {
      filtered = filtered.filter(session => {
        return session.topics?.some(t => this.state.filterTopics.has(t));
      });
    }

    // Apply tag filter
    if (this.state.filterTags.size > 0) {
      filtered = filtered.filter(session => {
        return session.tags?.some(t => this.state.filterTags.has(t));
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (this.state.sortConfig.column) {
        case 'date':
          comparison = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'duration':
          const durationA = new Date(a.endTime).getTime() - new Date(a.startTime).getTime();
          const durationB = new Date(b.endTime).getTime() - new Date(b.startTime).getTime();
          comparison = durationA - durationB;
          break;
        case 'files':
          comparison = (a.filesModified?.length || 0) - (b.filesModified?.length || 0);
          break;
      }

      return this.state.sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    this.state.filteredSessions = filtered;

    webviewLogger.debug(
      LogCategory.UI,
      'Filters and sort applied',
      'applyFiltersAndSort',
      {
        originalCount: this.state.sessions.length,
        filteredCount: filtered.length
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Automatically re-render table and update status after filtering/sorting
    this.renderTable();
    this.updateStatusBar();
  }

  /**
   * Handle sort column click
   */
  private handleSort(column: SortConfig['column']): void {
    webviewLogger.debug(
      LogCategory.UI,
      'Sort column clicked',
      'handleSort',
      { column },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Toggle direction if same column, otherwise reset to descending
    if (this.state.sortConfig.column === column) {
      this.state.sortConfig.direction = this.state.sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.state.sortConfig.column = column;
      this.state.sortConfig.direction = 'desc';
    }

    this.applyFiltersAndSort();
    this.renderTable();
    this.updateSortIndicators();
  }

  /**
   * Update sort indicators in table headers
   */
  private updateSortIndicators(): void {
    const headers = document.querySelectorAll('.sessions-table th.sortable');
    headers.forEach(header => {
      const sortColumn = header.getAttribute('data-sort');

      // Remove all sorting classes
      header.classList.remove('sorted-asc', 'sorted-desc');

      // Add appropriate class if this is the active sort column
      if (sortColumn === this.state.sortConfig.column) {
        if (this.state.sortConfig.direction === 'asc') {
          header.classList.add('sorted-asc');
        } else {
          header.classList.add('sorted-desc');
        }
      }
    });

    webviewLogger.debug(
      LogCategory.UI,
      'Sort indicators updated',
      'updateSortIndicators',
      {
        column: this.state.sortConfig.column,
        direction: this.state.sortConfig.direction
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Render the sessions table
   */
  private renderTable(): void {
    const tableBody = this.tableBody;
    if (!tableBody) {
      webviewLogger.error(
        LogCategory.UI,
        'Table body element not found',
        'renderTable'
      );
      return;
    }

    webviewLogger.debug(
      LogCategory.UI,
      'Rendering sessions table',
      'renderTable',
      { sessionCount: this.state.filteredSessions.length },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Clear existing content
    tableBody.innerHTML = '';

    // Show empty state if no sessions
    if (this.state.filteredSessions.length === 0) {
      const emptyRow = document.createElement('tr');
      emptyRow.className = 'empty-state-row';
      emptyRow.innerHTML = `
        <td colspan="6">
          <div class="empty-state">
            <div style="font-size: 48px; margin-bottom: 16px;">📝</div>
            <div style="font-weight: 600; margin-bottom: 8px;">
              ${this.state.sessions.length === 0 ? 'No Session Journals Found' : 'No Matching Sessions'}
            </div>
            <div style="color: var(--vscode-descriptionForeground);">
              ${this.state.sessions.length === 0
                ? 'Session journals are created by coding agents to track work across multiple prompts.'
                : 'Try adjusting your search or filter criteria.'}
            </div>
          </div>
        </td>
      `;
      tableBody.appendChild(emptyRow);
      return;
    }

    // Render each session row
    this.state.filteredSessions.forEach(session => {
      const row = this.createSessionRow(session);
      if (row) {
        tableBody!.appendChild(row);
      }
    });

    this.updateSortIndicators();

    webviewLogger.debug(
      LogCategory.UI,
      'Sessions table rendered',
      'renderTable',
      { rowsRendered: this.state.filteredSessions.length },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Create a table row for a session
   */
  private createSessionRow(session: SessionJournal): HTMLTableRowElement {
    const row = document.createElement('tr');
    row.className = 'session-row';
    row.dataset.sessionId = session.id;

    // Make entire row clickable
    row.style.cursor = 'pointer';
    row.addEventListener('click', (e) => {
      // Don't trigger if clicking on topic badges (they have their own click handlers)
      const target = e.target as HTMLElement;
      if (!target.classList.contains('topic-badge')) {
        this.showSessionDetail(session);
      }
    });

    // Date column
    const dateCell = document.createElement('td');
    dateCell.className = 'col-date';
    const date = new Date(session.startTime);
    dateCell.textContent = date.toISOString().split('T')[0];  // YYYY-MM-DD
    row.appendChild(dateCell);

    // Title column
    const titleCell = document.createElement('td');
    titleCell.className = 'col-title session-title';
    titleCell.textContent = session.title;
    titleCell.style.fontWeight = '600';
    row.appendChild(titleCell);

    // Duration column
    const durationCell = document.createElement('td');
    durationCell.className = 'col-duration';
    durationCell.textContent = this.formatDuration(session.startTime, session.endTime);
    row.appendChild(durationCell);

    // Topics column
    const topicsCell = document.createElement('td');
    topicsCell.className = 'col-topics';
    if (session.topics && session.topics.length > 0) {
      session.topics.forEach(topic => {
        const badge = document.createElement('span');
        badge.className = 'topic-badge';
        badge.textContent = topic;
        badge.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleTopicFilter(topic);
        });
        topicsCell.appendChild(badge);
      });
    } else {
      topicsCell.textContent = '—';
    }
    row.appendChild(topicsCell);

    // Tags column
    const tagsCell = document.createElement('td');
    tagsCell.className = 'col-tags';
    if (session.tags && session.tags.length > 0) {
      session.tags.forEach(tag => {
        const badge = document.createElement('span');
        badge.className = 'tag-badge';
        badge.textContent = tag;
        badge.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleTagFilter(tag);
        });
        tagsCell.appendChild(badge);
      });
    } else {
      tagsCell.textContent = '—';
    }
    row.appendChild(tagsCell);

    // Files column
    const filesCell = document.createElement('td');
    filesCell.className = 'col-files';
    const fileCount = session.filesModified?.length || 0;
    filesCell.textContent = fileCount.toString();
    if (fileCount > 0) {
      filesCell.title = session.filesModified!.join('\n');
    }
    row.appendChild(filesCell);

    // Summary column
    const summaryCell = document.createElement('td');
    summaryCell.className = 'col-summary';
    summaryCell.textContent = session.summary || '—';
    row.appendChild(summaryCell);

    return row;
  }

  /**
   * Format duration between two ISO timestamps
   */
  private formatDuration(startTime: string, endTime: string): string {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const durationMs = end - start;

    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return '< 1m';
    }
  }

  /**
   * Toggle topic filter
   */
  private toggleTopicFilter(topic: string): void {
    webviewLogger.debug(
      LogCategory.UI,
      'Toggling topic filter',
      'toggleTopicFilter',
      { topic },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    if (this.state.filterTopics.has(topic)) {
      this.state.filterTopics.delete(topic);
    } else {
      this.state.filterTopics.add(topic);
    }

    this.applyFiltersAndSort();
    this.renderTable();
    this.renderFilterChips();
  }

  /**
   * Toggle tag filter
   */
  private toggleTagFilter(tag: string): void {
    webviewLogger.debug(
      LogCategory.UI,
      'Toggling tag filter',
      'toggleTagFilter',
      { tag },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    if (this.state.filterTags.has(tag)) {
      this.state.filterTags.delete(tag);
    } else {
      this.state.filterTags.add(tag);
    }

    this.applyFiltersAndSort();
    this.renderTable();
    this.renderFilterChips();
  }

  /**
   * Render filter chips
   */
  private renderFilterChips(): void {
    if (!this.filterChipsContainer) {
      return;
    }

    this.filterChipsContainer.innerHTML = '';

    this.state.filterTopics.forEach(topic => {
      const chip = document.createElement('div');
      chip.className = 'filter-chip';
      chip.innerHTML = `
        <span>${topic}</span>
        <button class="remove-filter" data-topic="${topic}">×</button>
      `;

      const removeBtn = chip.querySelector('.remove-filter');
      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          this.toggleTopicFilter(topic);
        });
      }

      this.filterChipsContainer!.appendChild(chip);
    });

    this.state.filterTags.forEach(tag => {
      const chip = document.createElement('div');
      chip.className = 'filter-chip';
      chip.innerHTML = `
        <span>${tag}</span>
        <button class="remove-filter" data-tag="${tag}">×</button>
      `;

      const removeBtn = chip.querySelector('.remove-filter');
      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          this.toggleTagFilter(tag);
        });
      }

      this.filterChipsContainer!.appendChild(chip);
    });
  }

  /**
   * Show session detail in modal
   */
  private async showSessionDetail(session: SessionJournal): Promise<void> {
    webviewLogger.info(
      LogCategory.UI,
      'Showing session detail modal',
      'showSessionDetail',
      { sessionId: session.id },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    const modal = new ModalDialog();

    // Build header HTML for fixed title section
    const titleHtml = `
      <div style="margin-bottom: 8px;">
        <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">${this.escapeHtml(session.title)}</div>
        <div style="display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px; color: var(--vscode-descriptionForeground);">
          <span>📅 ${new Date(session.startTime).toLocaleString()}</span>
          <span>⏱️ ${this.formatDuration(session.startTime, session.endTime)}</span>
          ${session.filesModified && session.filesModified.length > 0
            ? `<span>📁 ${session.filesModified.length} files</span>`
            : ''}
        </div>
      </div>
    `;

    // Build scrollable content
    const content = document.createElement('div');
    content.className = 'session-detail-modal';
    content.innerHTML = `
      <div style="padding: 20px; padding-left: 24px;">
        ${session.summary ? `
          <div class="session-summary" style="margin-bottom: 20px;">
            <h3 style="font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">Summary</h3>
            <p style="margin: 0; line-height: 1.5;">${this.escapeHtml(session.summary)}</p>
          </div>
        ` : ''}

        ${session.topics && session.topics.length > 0 ? `
          <div class="session-topics" style="margin-bottom: 20px;">
            <h3 style="font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">Topics</h3>
            <div class="topic-list" style="display: flex; flex-wrap: wrap; gap: 4px;">
              ${session.topics.map(t => `<span class="topic-badge" style="display: inline-block; padding: 2px 8px; background: rgba(0, 212, 255, 0.15); color: var(--sessions-accent); border: 1px solid rgba(0, 212, 255, 0.3); border-radius: 3px; font-size: 11px;">${this.escapeHtml(t)}</span>`).join('')}
            </div>
          </div>
        ` : ''}

        ${session.tags && session.tags.length > 0 ? `
          <div class="session-tags" style="margin-bottom: 20px;">
            <h3 style="font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">Tags</h3>
            <div class="tag-list" style="display: flex; flex-wrap: wrap; gap: 4px;">
              ${session.tags.map(t => `<span class="tag-badge" style="display: inline-block; padding: 2px 8px; background: rgba(0, 255, 136, 0.15); color: var(--sessions-secondary); border: 1px solid rgba(0, 255, 136, 0.3); border-radius: 3px; font-size: 11px;">${this.escapeHtml(t)}</span>`).join('')}
            </div>
          </div>
        ` : ''}

        ${session.filesModified && session.filesModified.length > 0 ? `
          <div class="session-files" style="margin-bottom: 20px;">
            <h3 style="font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">Files Modified</h3>
            <ul class="file-list" style="list-style: none; padding: 0; margin: 0;">
              ${session.filesModified.map(f => `<li style="padding: 4px 0; font-family: var(--vscode-editor-font-family); font-size: 12px;"><code style="background: rgba(0, 212, 255, 0.05); padding: 2px 6px; border-radius: 3px;">${this.escapeHtml(f)}</code></li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${session.knowledgeItemsUsed && session.knowledgeItemsUsed.length > 0 ? `
          <div class="session-knowledge" style="margin-bottom: 20px;">
            <h3 style="font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">Knowledge Items Used</h3>
            <ul class="knowledge-list" style="list-style: none; padding: 0; margin: 0;">
              ${session.knowledgeItemsUsed.map(k => `<li style="padding: 4px 0; font-size: 12px;">${this.escapeHtml(k)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <div class="session-content">
          <h3 style="font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">Session Notes</h3>
          <div class="markdown-content" style="line-height: 1.6; font-size: 13px;">${this.renderMarkdown(session.content)}</div>
        </div>
      </div>
    `;

    await modal.show({
      title: titleHtml,
      content: content.outerHTML,
      buttons: [
        {
          label: '📂 Open File',
          primary: true,
          onClick: () => {
            if (this.sendMessage) {
              this.sendMessage({
                type: 'sessions:open-file',
                payload: { filePath: session.filePath }
              });
            }
          }
        },
        {
          label: '📋 Copy Path',
          primary: false,
          onClick: () => {
            navigator.clipboard.writeText(session.filePath);
            webviewLogger.info(LogCategory.UI, 'Session file path copied to clipboard', 'showSessionDetail');
          }
        },
        { label: 'Close', primary: false }
      ],
      width: '800px'
    });
  }

  /**
   * Basic markdown rendering (converts common patterns)
   */
  private renderMarkdown(markdown: string): string {
    if (!markdown) {
      return '';
    }

    let html = this.escapeHtml(markdown);

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Code blocks
    html = html.replace(/```(\w+)?\n([\s\S]+?)```/g, '<pre><code>$2</code></pre>');

    // Inline code
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');

    // Lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Request refresh from extension
   */
  private requestRefresh(): void {
    webviewLogger.info(
      LogCategory.UI,
      'Requesting session data refresh',
      'requestRefresh',
      undefined,
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    if (this.statusText) {
      this.statusText.textContent = 'Refreshing...';
    }

    if (this.sendMessage) {
      this.sendMessage({
        type: 'sessions:load-all'
      });
    }
  }

  /**
   * Export sessions to JSON
   */
  private exportSessions(): void {
    webviewLogger.info(
      LogCategory.UI,
      'Exporting sessions to JSON',
      'exportSessions',
      { sessionCount: this.state.filteredSessions.length },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    const dataStr = JSON.stringify(this.state.filteredSessions, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `sessions-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    URL.revokeObjectURL(url);

    webviewLogger.info(
      LogCategory.UI,
      'Sessions exported successfully',
      'exportSessions',
      undefined,
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Update status bar
   */
  private updateStatusBar(): void {
    if (this.statusText) {
      this.statusText.textContent = 'Ready';
    }

    if (this.sessionsCount) {
      const total = this.state.sessions.length;
      const filtered = this.state.filteredSessions.length;

      if (total === filtered) {
        this.sessionsCount.textContent = `${total} session${total !== 1 ? 's' : ''}`;
      } else {
        this.sessionsCount.textContent = `${filtered} of ${total} session${total !== 1 ? 's' : ''}`;
      }
    }
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    webviewLogger.info(
      LogCategory.UI,
      'Disposing SessionViewController',
      'dispose',
      undefined,
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    this.initialized = false;
  }
}
