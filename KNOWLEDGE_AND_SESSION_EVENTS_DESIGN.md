# Knowledge and Session Events - Pragmatic Design

**Version**: 1.0
**Date**: 2025-10-21
**Status**: Ready for Implementation

---

## Problem Statement

The Agent Brain Platform currently shows git/GitHub events on the timeline, but doesn't capture:

1. **When users provide guidance** - Applying/removing knowledge items to CLAUDE.md
2. **When agents learn** - Creating new knowledge items (patterns, learnings, etc.)
3. **What agents accomplish** - Session journals documenting work completed

**Goal**: Add these three event types to the timeline for complete project visibility.

---

## Core Philosophy

> "This extension helps users instruct coding agents and lets agents self-document their work. Keep it simple."

**Design Principles:**
- Files as data - No databases, no complex state
- Agent-driven - Extension provides platform, agents create content
- Review tool - Not an audit system, just helpful visibility
- Proven patterns - Reuse existing CanonicalEvent/Provider architecture
- Step-by-step - Ship complete features, no TODOs

---

## Solution Overview

### Three Event Types

| Event Type | Trigger | Symbol | Color | Source |
|------------|---------|--------|-------|--------|
| **Knowledge Applied** | User applies item via UI | 📚 (book) | Purple | knowledge-events.json |
| **Knowledge Created** | Agent creates new item | ✨ (sparkle) | Teal | knowledge-events.json |
| **Session Journal** | Agent writes summary | 📝 (memo) | Orange | .md files in sessions/ |

### Two Providers

**Provider 1: KnowledgeEventProvider**
- Reads: `.agent-brain/events/knowledge-events.json`
- Events: `knowledge-applied`, `knowledge-removed`, `knowledge-created`
- Simple JSON append log

**Provider 2: SessionEventProvider**
- Reads: `.agent-brain/sessions/*.md` files
- Events: `session-journal`
- Markdown files with YAML frontmatter (like knowledge items)

---

## Data Models

### 1. Knowledge Event Record

**File**: `.agent-brain/events/knowledge-events.json`

**Schema**:
```json
{
  "version": "1.0",
  "events": [
    {
      "id": "ke-1729518900000",
      "timestamp": "2025-10-21T14:35:00.000Z",
      "type": "apply",
      "knowledgeItemId": "golden-path-oauth",
      "knowledgeItemTitle": "OAuth Golden Path",
      "knowledgeItemType": "golden-path",
      "targetFile": "CLAUDE.md",
      "actor": "user"
    },
    {
      "id": "ke-1729519800000",
      "timestamp": "2025-10-21T14:50:00.000Z",
      "type": "create",
      "knowledgeItemId": "learning-jwt-refresh",
      "knowledgeItemTitle": "JWT Token Refresh Pattern",
      "knowledgeItemType": "learning",
      "targetFile": ".agent-brain/learnings/jwt-refresh-pattern.md",
      "actor": "agent"
    },
    {
      "id": "ke-1729520400000",
      "timestamp": "2025-10-21T15:00:00.000Z",
      "type": "remove",
      "knowledgeItemId": "golden-path-oauth",
      "knowledgeItemTitle": "OAuth Golden Path",
      "knowledgeItemType": "golden-path",
      "targetFile": "CLAUDE.md",
      "actor": "user"
    }
  ]
}
```

**Fields**:
- `id`: Timestamp-based unique ID
- `timestamp`: ISO 8601 datetime
- `type`: "apply" | "remove" | "create"
- `knowledgeItemId`: Reference to knowledge item
- `knowledgeItemTitle`: Denormalized for display
- `knowledgeItemType`: KnowledgeType enum value
- `targetFile`: Where applied or created
- `actor`: "user" | "agent"

**Transformation to CanonicalEvent**:
```typescript
{
  id: record.id,
  type: `knowledge-${record.type}`,  // "knowledge-applied", etc.
  timestamp: new Date(record.timestamp),
  title: `${operationLabel}: ${record.knowledgeItemTitle}`,
  description: `${actor} ${verb} ${record.knowledgeItemType} ${preposition} ${record.targetFile}`,
  metadata: {
    knowledgeItemId: record.knowledgeItemId,
    knowledgeItemType: record.knowledgeItemType,
    targetFile: record.targetFile,
    actor: record.actor,
    operation: record.type
  },
  tags: ['knowledge', record.type, record.knowledgeItemType],
  // ... CanonicalEvent defaults
}
```

### 2. Session Journal File

**Location**: `.agent-brain/sessions/YYYY-MM/YYYY-MM-DD-topic-slug.md`

**Organization**: Sessions are organized in year-month subdirectories to prevent performance degradation with large file counts.

**Example**: `.agent-brain/sessions/2025-10/2025-10-21-auth-implementation.md`

**Rationale**:
- Prevents performance issues (>5,000 files in one directory)
- Typical usage: 1-2 sessions/day × 365 days = 365-730 files/year
- With monthly folders: max ~30-60 files per directory
- Supports 10+ years of journaling without performance issues
- Natural archival boundaries
- Easy monthly browsing

```markdown
---
title: OAuth Authentication Implementation
date: 2025-10-21
tags: [authentication, oauth, security]
topics: [Keycloak setup, JWT validation, session management]
filesModified: [src/auth/oauth.ts, src/middleware/jwt.ts, tests/auth.test.ts]
knowledgeItemsUsed: [golden-path-oauth, pattern-jwt-validation]
---

# OAuth Authentication Implementation

## Summary
Implemented OAuth 2.0 authentication with Keycloak integration. Added JWT token validation and session management middleware.

## Key Changes

### Keycloak Integration
- Configured OAuth 2.0 client with redirect URIs
- Implemented authorization code flow
- Added PKCE for enhanced security

### JWT Middleware
- Created token validation middleware
- Implemented refresh token logic
- Added proper error handling for expired tokens

### Session Management
- Set up Redis for session storage
- Created session cleanup background job
- Implemented secure session cookies

## Challenges Encountered
- **Token refresh timing**: Initially refreshed too late, causing auth failures
  - **Solution**: Proactive refresh 5 minutes before expiration

- **CORS issues**: Keycloak redirects blocked by CORS
  - **Solution**: Added proper CORS headers to API gateway

## Files Modified
- `src/auth/oauth.ts` (180 lines) - OAuth client implementation
- `src/middleware/jwt.ts` (95 lines) - JWT validation
- `src/middleware/session.ts` (120 lines) - Session management
- `tests/auth.test.ts` (250 lines) - Comprehensive auth tests

## Test Coverage
- OAuth flow: 95% coverage
- JWT validation: 100% coverage
- Session management: 92% coverage

## Next Steps
- Add multi-factor authentication support
- Implement remember-me functionality
- Add audit logging for authentication events
```

**Transformation to CanonicalEvent**:
```typescript
{
  id: generateIdFromFilename(filePath),  // "session-2025-10-21-auth-implementation"
  type: 'session-journal',
  timestamp: new Date(frontmatter.date),
  title: frontmatter.title,
  description: extractSummary(content),  // First 200 chars
  metadata: {
    filePath: filePath,
    tags: frontmatter.tags || [],
    topics: frontmatter.topics || [],
    filesModified: frontmatter.filesModified || [],
    knowledgeItemsUsed: frontmatter.knowledgeItemsUsed || []
  },
  tags: ['session-journal', ...(frontmatter.tags || [])],
  // ... CanonicalEvent defaults
}
```

---

## Architecture Components

### Component 1: KnowledgeEventStorage

**Location**: `packages/core/src/domains/events/KnowledgeEventStorage.ts`

**Responsibilities**:
- Load/save knowledge-events.json
- Append new events
- Simple, synchronous operations

**Implementation**:
```typescript
export interface KnowledgeEventRecord {
  id: string;
  timestamp: string;
  type: 'apply' | 'remove' | 'create';
  knowledgeItemId: string;
  knowledgeItemTitle: string;
  knowledgeItemType: string;
  targetFile: string;
  actor: 'user' | 'agent';
}

export class KnowledgeEventStorage {
  private filePath: string;

  constructor(workspaceRoot: string) {
    this.filePath = path.join(workspaceRoot, '.agent-brain/events/knowledge-events.json');
  }

  async loadAll(): Promise<KnowledgeEventRecord[]> {
    if (!fs.existsSync(this.filePath)) {
      return [];
    }
    const data = await fs.promises.readFile(this.filePath, 'utf8');
    const parsed = JSON.parse(data);
    return parsed.events || [];
  }

  async recordEvent(record: Omit<KnowledgeEventRecord, 'id' | 'timestamp'>): Promise<void> {
    const events = await this.loadAll();

    const newEvent: KnowledgeEventRecord = {
      id: `ke-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...record
    };

    events.push(newEvent);

    await fs.promises.writeFile(
      this.filePath,
      JSON.stringify({ version: '1.0', events }, null, 2),
      'utf8'
    );
  }
}
```

**Notes**:
- Simple append operation
- No indexing needed (timeline filters by date)
- Could add periodic archival if file grows large (future)

### Component 2: SessionFileSystem

**Location**: `packages/core/src/domains/sessions/SessionFileSystem.ts`

**Responsibilities**:
- Scan `.agent-brain/sessions/` directory
- Read markdown files with YAML frontmatter
- Parse and return SessionJournal objects
- Reuse patterns from KnowledgeFileSystem

**Implementation**:
```typescript
export interface SessionJournal {
  id: string;
  title: string;
  date: Date;
  summary: string;  // Markdown content (body)
  tags?: string[];
  topics?: string[];
  filesModified?: string[];
  knowledgeItemsUsed?: string[];
  filePath: string;
}

export class SessionFileSystem {
  private sessionDir: string;

  constructor(workspaceRoot: string) {
    this.sessionDir = path.join(workspaceRoot, '.agent-brain/sessions');
  }

  async loadAll(): Promise<SessionJournal[]> {
    if (!fs.existsSync(this.sessionDir)) {
      return [];
    }

    const sessions: SessionJournal[] = [];

    // Recursively scan YYYY-MM subdirectories
    const monthDirs = await this.getMonthDirectories();

    for (const monthDir of monthDirs) {
      const files = await fs.promises.readdir(monthDir);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      for (const file of mdFiles) {
        const filePath = path.join(monthDir, file);
        const session = await this.parseSessionFile(filePath);
        if (session) {
          sessions.push(session);
        }
      }
    }

    return sessions;
  }

  private async getMonthDirectories(): Promise<string[]> {
    const entries = await fs.promises.readdir(this.sessionDir, { withFileTypes: true });

    // Get all YYYY-MM directories
    const monthDirs = entries
      .filter(entry => entry.isDirectory() && /^\d{4}-\d{2}$/.test(entry.name))
      .map(entry => path.join(this.sessionDir, entry.name));

    return monthDirs;
  }

  /**
   * Helper for agents: Get the correct folder for a session date
   */
  getSessionFolder(date: Date): string {
    const yearMonth = date.toISOString().substring(0, 7); // "2025-10"
    const folder = path.join(this.sessionDir, yearMonth);

    // Create folder if it doesn't exist
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }

    return folder;
  }

  /**
   * Helper: Generate recommended file path for new session
   */
  getRecommendedPath(title: string, date: Date = new Date()): string {
    const folder = this.getSessionFolder(date);
    const dateStr = date.toISOString().substring(0, 10); // "2025-10-21"
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    return path.join(folder, `${dateStr}-${slug}.md`);
  }

  private async parseSessionFile(filePath: string): Promise<SessionJournal | null> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      const { data: frontmatter, content: body } = matter(content);

      // Generate ID from filename
      const filename = path.basename(filePath, '.md');
      const id = `session-${filename}`;

      return {
        id,
        title: frontmatter.title || filename,
        date: new Date(frontmatter.date || Date.now()),
        summary: body,
        tags: frontmatter.tags,
        topics: frontmatter.topics,
        filesModified: frontmatter.filesModified,
        knowledgeItemsUsed: frontmatter.knowledgeItemsUsed,
        filePath
      };
    } catch (err) {
      logger.error(LogCategory.STORAGE, 'Failed to parse session file', 'parseSessionFile', err);
      return null;
    }
  }
}
```

**Dependencies**:
- `gray-matter` (already used for knowledge items)
- `fs/promises` (built-in)

### Component 3: KnowledgeEventProvider

**Location**: `packages/core/src/domains/providers/knowledge/KnowledgeEventProvider.ts`

**Responsibilities**:
- Implements IDataProvider interface
- Reads events from KnowledgeEventStorage
- Transforms to CanonicalEvent[]

**Implementation**:
```typescript
export class KnowledgeEventProvider implements IDataProvider {
  private storage: KnowledgeEventStorage;

  constructor(workspaceRoot: string) {
    this.storage = new KnowledgeEventStorage(workspaceRoot);
  }

  async fetchEvents(config: ProviderConfig): Promise<CanonicalEvent[]> {
    const records = await this.storage.loadAll();
    return records.map(record => this.toCanonicalEvent(record));
  }

  private toCanonicalEvent(record: KnowledgeEventRecord): CanonicalEvent {
    const labels = {
      apply: { verb: 'Applied', prep: 'to' },
      remove: { verb: 'Removed', prep: 'from' },
      create: { verb: 'Created', prep: 'at' }
    };

    const { verb, prep } = labels[record.type];
    const actorLabel = record.actor === 'user' ? 'User' : 'Agent';

    return {
      id: record.id,
      type: `knowledge-${record.type}`,
      timestamp: new Date(record.timestamp),
      title: `${verb}: ${record.knowledgeItemTitle}`,
      description: `${actorLabel} ${verb.toLowerCase()} ${record.knowledgeItemType} ${prep} ${record.targetFile}`,

      metadata: {
        knowledgeItemId: record.knowledgeItemId,
        knowledgeItemType: record.knowledgeItemType,
        targetFile: record.targetFile,
        actor: record.actor,
        operation: record.type
      },

      tags: ['knowledge', record.type, record.knowledgeItemType],

      // CanonicalEvent required fields
      isPR: false,
      additions: 0,
      deletions: 0,
      changes: 0
    };
  }
}
```

### Component 4: SessionEventProvider

**Location**: `packages/core/src/domains/providers/sessions/SessionEventProvider.ts`

**Responsibilities**:
- Implements IDataProvider interface
- Reads session files from SessionFileSystem
- Transforms to CanonicalEvent[]

**Implementation**:
```typescript
export class SessionEventProvider implements IDataProvider {
  private fileSystem: SessionFileSystem;

  constructor(workspaceRoot: string) {
    this.fileSystem = new SessionFileSystem(workspaceRoot);
  }

  async fetchEvents(config: ProviderConfig): Promise<CanonicalEvent[]> {
    const sessions = await this.fileSystem.loadAll();
    return sessions.map(session => this.toCanonicalEvent(session));
  }

  private toCanonicalEvent(session: SessionJournal): CanonicalEvent {
    // Extract summary from markdown (first paragraph or first 200 chars)
    const summary = this.extractSummary(session.summary);

    return {
      id: session.id,
      type: 'session-journal',
      timestamp: session.date,
      title: session.title,
      description: summary,

      metadata: {
        filePath: session.filePath,
        tags: session.tags || [],
        topics: session.topics || [],
        filesModified: session.filesModified || [],
        knowledgeItemsUsed: session.knowledgeItemsUsed || []
      },

      tags: ['session-journal', ...(session.tags || [])],

      // CanonicalEvent required fields
      isPR: false,
      additions: 0,
      deletions: 0,
      changes: 0
    };
  }

  private extractSummary(markdown: string): string {
    // Find first paragraph after any headers
    const lines = markdown.split('\n');
    const contentLines = lines.filter(line =>
      !line.startsWith('#') &&
      !line.trim().startsWith('---') &&
      line.trim().length > 0
    );

    const firstParagraph = contentLines[0] || '';
    return firstParagraph.length > 200
      ? firstParagraph.substring(0, 197) + '...'
      : firstParagraph;
  }
}
```

---

## Integration Points

### 1. Recording Knowledge Application Events

**Location**: `packages/vscode/src/services/KnowledgeManager.ts`

**When**: User applies/removes knowledge items via UI

**Changes**:
```typescript
export class KnowledgeManager {
  private eventStorage: KnowledgeEventStorage;

  constructor(workspaceRoot: string, /* existing params */) {
    // Existing initialization
    this.eventStorage = new KnowledgeEventStorage(workspaceRoot);
  }

  async applyItemsToClaudeMd(items: KnowledgeItem[], targetFile: string): Promise<void> {
    for (const item of items) {
      // Existing: Apply template
      await this.templateEngine.applyTemplate(item, targetFile);

      // NEW: Record event
      await this.eventStorage.recordEvent({
        type: 'apply',
        knowledgeItemId: item.id,
        knowledgeItemTitle: item.title,
        knowledgeItemType: item.type,
        targetFile,
        actor: 'user'
      });
    }

    // Existing: Refresh timeline
    this.notifyTimelineRefresh();
  }

  async removeItemsFromClaudeMd(items: KnowledgeItem[], targetFile: string): Promise<void> {
    for (const item of items) {
      // Existing: Remove template
      await this.templateEngine.removeTemplate(item.id, targetFile);

      // NEW: Record event
      await this.eventStorage.recordEvent({
        type: 'remove',
        knowledgeItemId: item.id,
        knowledgeItemTitle: item.title,
        knowledgeItemType: item.type,
        targetFile,
        actor: 'user'
      });
    }

    this.notifyTimelineRefresh();
  }
}
```

### 2. Recording Knowledge Creation Events

**Approach**: Coding agent records event when creating new knowledge item.

**How**: Add a standard knowledge item instructing agents to record creation events.

**Example Knowledge Item**: `.agent-brain/standards/record-knowledge-creation.md`

```markdown
---
title: Record Knowledge Item Creation
type: standard
scope: project
---

# Record Knowledge Item Creation

When you create a new knowledge item (learning, pattern, etc.), record it as an event for timeline visibility.

## Process

1. Create the knowledge item markdown file in the appropriate directory
2. Record the creation event using this Node.js snippet:

\`\`\`javascript
const fs = require('fs');
const path = require('path');

// After creating knowledge item file
const eventFile = path.join(process.cwd(), '.agent-brain/events/knowledge-events.json');
let data = { version: '1.0', events: [] };

if (fs.existsSync(eventFile)) {
  data = JSON.parse(fs.readFileSync(eventFile, 'utf8'));
}

data.events.push({
  id: `ke-${Date.now()}`,
  timestamp: new Date().toISOString(),
  type: 'create',
  knowledgeItemId: 'learning-jwt-refresh',  // The item ID you created
  knowledgeItemTitle: 'JWT Token Refresh Pattern',  // Item title
  knowledgeItemType: 'learning',  // Item type
  targetFile: '.agent-brain/learnings/jwt-refresh-pattern.md',  // File path
  actor: 'agent'
});

fs.writeFileSync(eventFile, JSON.stringify(data, null, 2));
\`\`\`

## Example
After creating `.agent-brain/learnings/oauth-error-handling.md`, record:

\`\`\`json
{
  "type": "create",
  "knowledgeItemId": "learning-oauth-errors",
  "knowledgeItemTitle": "OAuth Error Handling Patterns",
  "knowledgeItemType": "learning",
  "targetFile": ".agent-brain/learnings/oauth-error-handling.md",
  "actor": "agent"
}
\`\`\`
```

**Alternative (Simpler)**: Add a VSCode command "Record Knowledge Creation" that the agent can be instructed to call after creating items.

### 3. Registering Providers

**Location**: `packages/vscode/src/providers/timeline-provider-webpack.ts`

**In**: `initializeDataOrchestrator()` method

**Changes**:
```typescript
private async initializeDataOrchestrator(): Promise<void> {
  // Existing providers
  const gitProvider = new GitEventRepository(this.workspaceRoot);
  this.dataOrchestrator.registerProvider('git', gitProvider);

  const githubProvider = new GitHubEventRepository(this.workspaceRoot);
  this.dataOrchestrator.registerProvider('github', githubProvider);

  // NEW: Knowledge event provider
  const knowledgeEventProvider = new KnowledgeEventProvider(this.workspaceRoot);
  this.dataOrchestrator.registerProvider('knowledge-events', knowledgeEventProvider);

  // NEW: Session event provider
  const sessionEventProvider = new SessionEventProvider(this.workspaceRoot);
  this.dataOrchestrator.registerProvider('session-journals', sessionEventProvider);

  logger.info(LogCategory.DATA, 'Registered 4 event providers', 'initializeDataOrchestrator');
}
```

---

## Visual Design

### Event Appearance

**Knowledge Applied (User)**:
- Symbol: 📚 (book)
- Color: `#9370DB` (medium purple)
- Shape: Circle
- Z-Index: 5

**Knowledge Created (Agent)**:
- Symbol: ✨ (sparkles)
- Color: `#20B2AA` (light sea green)
- Shape: Star
- Z-Index: 5

**Knowledge Removed**:
- Symbol: 📚 with opacity
- Color: `#9370DB` at 50% opacity
- Shape: Circle (hollow)
- Z-Index: 4

**Session Journal**:
- Symbol: 📝 (memo)
- Color: `#FF8C00` (dark orange)
- Shape: Diamond
- Z-Index: 6

### Theme Configuration

**Location**: `packages/core/src/domains/visualization/theme/EventVisualTheme.ts`

**Add**:
```typescript
export const eventTypeColors: Record<string, string> = {
  // Existing
  'commit': '#4A90E2',
  'branch-create': '#50C878',
  // ... others

  // NEW
  'knowledge-applied': '#9370DB',
  'knowledge-removed': '#9370DB80',  // 50% opacity
  'knowledge-created': '#20B2AA',
  'session-journal': '#FF8C00'
};

export const eventTypeShapes: Record<string, any> = {
  // Existing
  'commit': d3.symbolCircle,
  'branch-create': d3.symbolSquare,

  // NEW
  'knowledge-applied': d3.symbolCircle,
  'knowledge-removed': d3.symbolCircle,
  'knowledge-created': d3.symbolStar,
  'session-journal': d3.symbolDiamond
};

export const eventTypeZIndex: Record<string, number> = {
  // Existing
  'commit': 3,
  'branch-create': 5,

  // NEW
  'knowledge-applied': 5,
  'knowledge-removed': 4,
  'knowledge-created': 5,
  'session-journal': 6
};

export const eventTypeLabels: Record<string, string> = {
  // Existing
  'commit': 'Commit',
  'branch-create': 'Branch Created',

  // NEW
  'knowledge-applied': 'Knowledge Applied',
  'knowledge-removed': 'Knowledge Removed',
  'knowledge-created': 'Knowledge Created',
  'session-journal': 'Session Journal'
};
```

### Event Popups

**Location**: `packages/core/src/domains/visualization/ui/PopupController.ts`

**Add custom popup content for new event types**:

```typescript
private renderEventPopup(event: CanonicalEvent): string {
  switch (event.type) {
    case 'knowledge-applied':
    case 'knowledge-removed':
    case 'knowledge-created':
      return this.renderKnowledgeEventPopup(event);

    case 'session-journal':
      return this.renderSessionJournalPopup(event);

    default:
      return this.renderDefaultPopup(event);
  }
}

private renderKnowledgeEventPopup(event: CanonicalEvent): string {
  const meta = event.metadata as any;
  const operation = meta.operation;
  const actorIcon = meta.actor === 'user' ? '👤' : '🤖';

  return `
    <div class="event-popup knowledge-event">
      <div class="popup-header">
        <span class="event-icon">${actorIcon}</span>
        <h3>${event.title}</h3>
      </div>
      <div class="popup-body">
        <div class="popup-field">
          <label>Type:</label>
          <span class="badge">${meta.knowledgeItemType}</span>
        </div>
        <div class="popup-field">
          <label>Target File:</label>
          <code>${meta.targetFile}</code>
        </div>
        <div class="popup-field">
          <label>Actor:</label>
          <span>${meta.actor === 'user' ? 'User' : 'Coding Agent'}</span>
        </div>
        <div class="popup-field">
          <label>Time:</label>
          <span>${this.formatDateTime(event.timestamp)}</span>
        </div>
      </div>
      <div class="popup-actions">
        <button onclick="window.viewKnowledgeItem('${meta.knowledgeItemId}')">
          View Knowledge Item
        </button>
      </div>
    </div>
  `;
}

private renderSessionJournalPopup(event: CanonicalEvent): string {
  const meta = event.metadata as any;

  return `
    <div class="event-popup session-event">
      <div class="popup-header">
        <span class="event-icon">📝</span>
        <h3>${event.title}</h3>
      </div>
      <div class="popup-body">
        <div class="popup-field">
          <label>Summary:</label>
          <p>${event.description}</p>
        </div>
        ${meta.topics?.length ? `
          <div class="popup-field">
            <label>Topics:</label>
            <div class="tags">
              ${meta.topics.map(t => `<span class="tag">${t}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        ${meta.filesModified?.length ? `
          <div class="popup-field">
            <label>Files Modified:</label>
            <ul class="file-list">
              ${meta.filesModified.slice(0, 5).map(f => `<li><code>${f}</code></li>`).join('')}
              ${meta.filesModified.length > 5 ? `<li>... and ${meta.filesModified.length - 5} more</li>` : ''}
            </ul>
          </div>
        ` : ''}
        ${meta.knowledgeItemsUsed?.length ? `
          <div class="popup-field">
            <label>Knowledge Items Used:</label>
            <div class="knowledge-refs">
              ${meta.knowledgeItemsUsed.map(id => `<span class="knowledge-ref">${id}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        <div class="popup-field">
          <label>Date:</label>
          <span>${this.formatDate(event.timestamp)}</span>
        </div>
      </div>
      <div class="popup-actions">
        <button onclick="window.viewSessionJournal('${meta.filePath}')">
          View Full Journal
        </button>
      </div>
    </div>
  `;
}
```

### Legend Updates

**Location**: `packages/core/src/domains/visualization/timeline/LegendRenderer.ts`

**Add new event types to legend**:
```typescript
private getLegendItems(): LegendItem[] {
  return [
    // Existing
    { type: 'commit', label: 'Commit', color: '#4A90E2', shape: 'circle' },
    { type: 'branch-create', label: 'Branch Created', color: '#50C878', shape: 'square' },
    // ... others

    // NEW
    { type: 'knowledge-applied', label: 'Knowledge Applied', color: '#9370DB', shape: 'circle' },
    { type: 'knowledge-created', label: 'Knowledge Created', color: '#20B2AA', shape: 'star' },
    { type: 'session-journal', label: 'Session Journal', color: '#FF8C00', shape: 'diamond' }
  ];
}
```

---

## Event Source Configuration

### User Preference

Add VSCode setting to toggle event sources on/off.

**Location**: `packages/vscode/package.json`

**Add to contributes.configuration**:
```json
{
  "agentBrain.timeline.eventSources": {
    "type": "object",
    "default": {
      "git": true,
      "github": true,
      "knowledgeEvents": true,
      "sessionJournals": true
    },
    "properties": {
      "git": {
        "type": "boolean",
        "description": "Show git commits and branches"
      },
      "github": {
        "type": "boolean",
        "description": "Show GitHub PRs and issues"
      },
      "knowledgeEvents": {
        "type": "boolean",
        "description": "Show knowledge application/creation events"
      },
      "sessionJournals": {
        "type": "boolean",
        "description": "Show agent session journals"
      }
    },
    "description": "Control which event sources are displayed on the timeline"
  }
}
```

### Filter Implementation

**Location**: `packages/vscode/src/providers/timeline-provider-webpack.ts`

**In fetchEvents**:
```typescript
private async fetchEvents(): Promise<CanonicalEvent[]> {
  const config = vscode.workspace.getConfiguration('agentBrain.timeline');
  const eventSources = config.get<any>('eventSources', {
    git: true,
    github: true,
    knowledgeEvents: true,
    sessionJournals: true
  });

  const allEvents: CanonicalEvent[] = [];

  // Fetch from enabled providers only
  if (eventSources.git) {
    const gitEvents = await this.dataOrchestrator.fetchFromProvider('git');
    allEvents.push(...gitEvents);
  }

  if (eventSources.github) {
    const githubEvents = await this.dataOrchestrator.fetchFromProvider('github');
    allEvents.push(...githubEvents);
  }

  if (eventSources.knowledgeEvents) {
    const knowledgeEvents = await this.dataOrchestrator.fetchFromProvider('knowledge-events');
    allEvents.push(...knowledgeEvents);
  }

  if (eventSources.sessionJournals) {
    const sessionEvents = await this.dataOrchestrator.fetchFromProvider('session-journals');
    allEvents.push(...sessionEvents);
  }

  // Sort by timestamp
  return allEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}
```

**UI Toggle** (optional future enhancement):
Add checkboxes to filter panel for real-time toggling without changing settings.

---

## Future: Relating Events to Git Commits

### Concept

Link knowledge events and session journals to git commits for richer visualization.

### Approaches

**1. Timestamp Proximity**
- Events within ±5 minutes of commit are "related"
- Show in popup: "Related commits: a1b2c3d, e5f6g7h"

**2. File Overlap**
- Session journals list filesModified
- Cross-reference with commit file changes
- Show "This session affected files in commits: ..."

**3. Visual Linking**
- Draw connecting lines between related events
- Grouping/clustering of related events

### Implementation (Future Phase)

**Step 1**: Add git hash to knowledge events (record current HEAD when event created)

**Step 2**: In SessionFileSystem, correlate filesModified with git log

**Step 3**: Add relationship metadata to CanonicalEvent:
```typescript
{
  // ... existing fields
  relatedEvents?: string[];  // IDs of related events
  relatedCommits?: string[];  // Commit hashes
}
```

**Step 4**: Visualize relationships in timeline (D3 link lines, grouping, etc.)

**Decision**: Phase 2 feature. Get basic events working first.

---

## Implementation Plan

### Phase 1: Foundation (Week 1, Days 1-2)

**Deliverables**:
- ✅ KnowledgeEventStorage class
- ✅ SessionFileSystem class
- ✅ Unit tests for both
- ✅ Create directory structure

**Files to Create**:
1. `packages/core/src/domains/events/types.ts`
2. `packages/core/src/domains/events/KnowledgeEventStorage.ts`
3. `packages/core/src/domains/events/index.ts`
4. `packages/core/src/domains/sessions/types.ts`
5. `packages/core/src/domains/sessions/SessionFileSystem.ts`
6. `packages/core/src/domains/sessions/index.ts`
7. `packages/core/tests/unit/events/KnowledgeEventStorage.test.ts`
8. `packages/core/tests/unit/sessions/SessionFileSystem.test.ts`

**Test Coverage Goal**: 95%

**Validation**:
```bash
cd packages/core
npm test -- events/KnowledgeEventStorage.test.ts
npm test -- sessions/SessionFileSystem.test.ts
```

---

### Phase 2: Providers (Week 1, Days 3-4)

**Deliverables**:
- ✅ KnowledgeEventProvider class
- ✅ SessionEventProvider class
- ✅ Unit tests
- ✅ Provider registration

**Files to Create**:
1. `packages/core/src/domains/providers/knowledge/KnowledgeEventProvider.ts`
2. `packages/core/src/domains/providers/knowledge/index.ts`
3. `packages/core/src/domains/providers/sessions/SessionEventProvider.ts`
4. `packages/core/src/domains/providers/sessions/index.ts`
5. `packages/core/tests/unit/providers/KnowledgeEventProvider.test.ts`
6. `packages/core/tests/unit/providers/SessionEventProvider.test.ts`

**Files to Modify**:
1. `packages/vscode/src/providers/timeline-provider-webpack.ts` (register providers)

**Test Coverage Goal**: 95%

**Validation**:
```bash
npm test -- providers/KnowledgeEventProvider.test.ts
npm test -- providers/SessionEventProvider.test.ts
```

**Integration Test**:
```typescript
describe('Provider Integration', () => {
  it('should load knowledge events and display on timeline', async () => {
    // Create test knowledge-events.json
    // Initialize provider
    // Fetch events
    // Verify CanonicalEvent structure
  });

  it('should load session journals and display on timeline', async () => {
    // Create test session markdown file
    // Initialize provider
    // Fetch events
    // Verify CanonicalEvent structure
  });
});
```

---

### Phase 3: Event Recording (Week 1, Day 5)

**Deliverables**:
- ✅ Record knowledge application events in KnowledgeManager
- ✅ Create standard knowledge item for agent event recording
- ✅ Integration tests

**Files to Modify**:
1. `packages/vscode/src/services/KnowledgeManager.ts`

**Files to Create**:
1. `.agent-brain/standards/record-knowledge-creation.md` (example/template)

**Test Coverage Goal**: 90%

**Validation**:
1. Apply knowledge item via UI
2. Check knowledge-events.json has new entry
3. Refresh timeline
4. Verify event appears with correct symbol/color

---

### Phase 4: Visual Design (Week 2, Days 1-2)

**Deliverables**:
- ✅ Event colors, shapes, z-index definitions
- ✅ Legend updates
- ✅ Event popup customization
- ✅ CSS styling

**Files to Modify**:
1. `packages/core/src/domains/visualization/theme/EventVisualTheme.ts`
2. `packages/core/src/domains/visualization/timeline/LegendRenderer.ts`
3. `packages/core/src/domains/visualization/ui/PopupController.ts`
4. `packages/core/src/domains/visualization/styles/timeline.css`

**Validation**:
1. Events render with correct colors
2. Knowledge applied: purple circle
3. Knowledge created: teal star
4. Session journal: orange diamond
5. Legend shows all event types
6. Clicking event shows detailed popup
7. Popup actions work (view knowledge item, view journal)

---

### Phase 5: Configuration (Week 2, Day 3)

**Deliverables**:
- ✅ VSCode settings for event source toggling
- ✅ Filter implementation
- ✅ Settings UI integration

**Files to Modify**:
1. `packages/vscode/package.json` (add settings schema)
2. `packages/vscode/src/providers/timeline-provider-webpack.ts` (read config, filter providers)

**Validation**:
1. Open VSCode settings
2. Search "Agent Brain event sources"
3. Toggle knowledge events off
4. Refresh timeline - no knowledge events shown
5. Toggle back on - events reappear

---

### Phase 6: Polish & Documentation (Week 2, Days 4-5)

**Deliverables**:
- ✅ Error handling
- ✅ Loading states
- ✅ Empty states
- ✅ User documentation
- ✅ Code comments
- ✅ CLAUDE.md updates

**Files to Create**:
1. `docs/knowledge-and-session-events.md` (user guide)

**Files to Modify**:
1. `CLAUDE.md` (document new event types and providers)
2. `README.md` (mention new features)

**Validation**:
- Test with empty .agent-brain/events/ directory
- Test with corrupted JSON
- Test with malformed session markdown
- Test with missing frontmatter fields
- Verify graceful degradation
- Verify helpful error messages

---

## File Inventory

### New Files (8 core + tests)

**Core Package**:
```
packages/core/src/
├── domains/
│   ├── events/
│   │   ├── types.ts
│   │   ├── KnowledgeEventStorage.ts
│   │   └── index.ts
│   ├── sessions/
│   │   ├── types.ts
│   │   ├── SessionFileSystem.ts
│   │   └── index.ts
│   └── providers/
│       ├── knowledge/
│       │   ├── KnowledgeEventProvider.ts
│       │   └── index.ts
│       └── sessions/
│           ├── SessionEventProvider.ts
│           └── index.ts
└── tests/
    └── unit/
        ├── events/
        │   └── KnowledgeEventStorage.test.ts
        ├── sessions/
        │   └── SessionFileSystem.test.ts
        └── providers/
            ├── KnowledgeEventProvider.test.ts
            └── SessionEventProvider.test.ts
```

**VSCode Package**: None (only modifications)

**Workspace Files** (created at runtime):
```
.agent-brain/
├── events/
│   └── knowledge-events.json
├── sessions/
│   ├── YYYY-MM/          # Year-month folders
│   │   └── *.md          # Session journal files
│   └── ...
└── standards/
    └── record-knowledge-creation.md (template/example)
```

### Modified Files (6)

1. `packages/vscode/src/services/KnowledgeManager.ts` - Record events
2. `packages/vscode/src/providers/timeline-provider-webpack.ts` - Register providers, config
3. `packages/vscode/package.json` - Add settings schema
4. `packages/core/src/domains/visualization/theme/EventVisualTheme.ts` - Colors, shapes, z-index
5. `packages/core/src/domains/visualization/timeline/LegendRenderer.ts` - Legend items
6. `packages/core/src/domains/visualization/ui/PopupController.ts` - Custom popups
7. `packages/core/src/domains/visualization/styles/timeline.css` - Popup styles
8. `CLAUDE.md` - Documentation

---

## Success Criteria

### Technical Metrics
- ✅ All tests pass with 90%+ coverage
- ✅ Events load in <100ms for 1000 events
- ✅ No errors with empty/malformed data
- ✅ All CanonicalEvent fields properly populated

### Visual Metrics
- ✅ Events render with correct colors/shapes
- ✅ Legend displays all event types
- ✅ Popups show detailed event information
- ✅ Event source toggles work
- ✅ No visual regressions on existing events

### Functional Metrics
- ✅ Knowledge application creates events
- ✅ Session journals appear on timeline
- ✅ Agent can create knowledge items and record events
- ✅ User can filter event sources
- ✅ Timeline updates on event creation

---

## Risk Mitigation

### Risk: Event Storage Performance
**Mitigation**:
- Append-only JSON with no indexing keeps it simple
- If file grows large (>10MB), add rotation strategy
- Monitor performance with large event counts

### Risk: Malformed Session Files
**Mitigation**:
- Validate frontmatter fields with defaults
- Log errors but don't crash
- Show placeholder for invalid sessions

### Risk: Agent Doesn't Follow Instructions
**Mitigation**:
- Provide clear examples in knowledge items
- Test with actual coding agents (Claude, etc.)
- Make event recording optional (graceful if missing)

---

## Summary

This design adds three event types to the timeline with minimal complexity:

1. **Knowledge Applied/Removed** - User guidance tracking
2. **Knowledge Created** - Agent learning tracking
3. **Session Journals** - Agent work documentation

**Key Principles Followed**:
- Reuse existing patterns (CanonicalEvent, IDataProvider)
- Files as data (JSON + markdown)
- Agent-driven content creation
- Simple, testable components
- No complex state management
- Step-by-step implementation

**Total Effort**: ~2 weeks for experienced developer
**Total Files**: 8 new core files + tests, 6 modified files
**Total Lines**: ~1500 lines of new code

Ready to implement. No TODOs. Each phase is complete and shippable.
