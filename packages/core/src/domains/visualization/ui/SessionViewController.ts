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
    this.applyFiltersAndSort();
    this.renderTable();
    this.updateStatusBar();

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
      const indicator = header.querySelector('.sort-indicator');
      const sortColumn = header.getAttribute('data-sort');

      if (indicator && sortColumn === this.state.sortConfig.column) {
        indicator.textContent = this.state.sortConfig.direction === 'asc' ? '▲' : '▼';
        header.classList.add('sorted');
      } else if (indicator) {
        indicator.textContent = '';
        header.classList.remove('sorted');
      }
    });
  }

  /**
   * Render the sessions table
   */
  private renderTable(): void {
    if (!this.tableBody) {
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
    this.tableBody.innerHTML = '';

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
      this.tableBody.appendChild(emptyRow);
      return;
    }

    // Render each session row
    this.state.filteredSessions.forEach(session => {
      const row = this.createSessionRow(session);
      this.tableBody.appendChild(row);
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

    // Date column
    const dateCell = document.createElement('td');
    dateCell.className = 'col-date';
    const date = new Date(session.startTime);
    dateCell.textContent = date.toISOString().split('T')[0];  // YYYY-MM-DD
    row.appendChild(dateCell);

    // Title column (clickable)
    const titleCell = document.createElement('td');
    titleCell.className = 'col-title session-title-link';
    titleCell.textContent = session.title;
    titleCell.style.cursor = 'pointer';
    titleCell.addEventListener('click', () => {
      this.showSessionDetail(session);
    });
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

    // Build modal content
    const content = document.createElement('div');
    content.className = 'session-detail-modal';
    content.innerHTML = `
      <div class="session-detail-header">
        <h2>${this.escapeHtml(session.title)}</h2>
        <div class="session-meta">
          <span class="meta-item">📅 ${new Date(session.startTime).toLocaleString()}</span>
          <span class="meta-item">⏱️ ${this.formatDuration(session.startTime, session.endTime)}</span>
          ${session.filesModified && session.filesModified.length > 0
            ? `<span class="meta-item">📁 ${session.filesModified.length} files</span>`
            : ''}
        </div>
      </div>

      ${session.summary ? `
        <div class="session-summary">
          <h3>Summary</h3>
          <p>${this.escapeHtml(session.summary)}</p>
        </div>
      ` : ''}

      ${session.topics && session.topics.length > 0 ? `
        <div class="session-topics">
          <h3>Topics</h3>
          <div class="topic-list">
            ${session.topics.map(t => `<span class="topic-badge">${this.escapeHtml(t)}</span>`).join('')}
          </div>
        </div>
      ` : ''}

      ${session.tags && session.tags.length > 0 ? `
        <div class="session-tags">
          <h3>Tags</h3>
          <div class="tag-list">
            ${session.tags.map(t => `<span class="tag-badge">${this.escapeHtml(t)}</span>`).join('')}
          </div>
        </div>
      ` : ''}

      ${session.filesModified && session.filesModified.length > 0 ? `
        <div class="session-files">
          <h3>Files Modified</h3>
          <ul class="file-list">
            ${session.filesModified.map(f => `<li><code>${this.escapeHtml(f)}</code></li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${session.knowledgeItemsUsed && session.knowledgeItemsUsed.length > 0 ? `
        <div class="session-knowledge">
          <h3>Knowledge Items Used</h3>
          <ul class="knowledge-list">
            ${session.knowledgeItemsUsed.map(k => `<li>${this.escapeHtml(k)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <div class="session-content">
        <h3>Session Notes</h3>
        <div class="markdown-content">${this.renderMarkdown(session.content)}</div>
      </div>

      <div class="session-actions">
        <button id="open-session-file" class="primary-button ab-btn-primary">📂 Open File</button>
        <button id="copy-session-path" class="secondary-button ab-btn-secondary">📋 Copy Path</button>
      </div>
    `;

    // Add event listeners for actions
    setTimeout(() => {
      const openFileBtn = document.getElementById('open-session-file');
      if (openFileBtn) {
        openFileBtn.addEventListener('click', () => {
          if (this.sendMessage) {
            this.sendMessage({
              type: 'sessions:open-file',
              payload: { filePath: session.filePath }
            });
          }
          modal.close();
        });
      }

      const copyPathBtn = document.getElementById('copy-session-path');
      if (copyPathBtn) {
        copyPathBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(session.filePath);
          webviewLogger.info(LogCategory.UI, 'Session file path copied to clipboard', 'showSessionDetail');
        });
      }
    }, 0);

    await modal.show({
      title: '', // Title is in content
      content: content.outerHTML,
      buttons: [{ label: 'Close', primary: false }],
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
