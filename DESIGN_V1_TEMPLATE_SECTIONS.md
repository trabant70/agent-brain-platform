# Design V1: Template Sections (Clean Slate)

**Status**: Version 1 - Stealth Mode - No Backwards Compatibility Needed
**Date**: October 23, 2025
**Approach**: Templates as organizational sections with audit trails and versioning

---

## Core Principles

1. **Templates ARE sections** - Primary organizational structure
2. **Everything is clonable** - No restrictions (bundled, user, doesn't matter)
3. **Shallow cloning only** - History starts fresh on clone
4. **Audit trail per template** - Detailed change log
5. **User-created checkpoints** - Version numbers for snapshots
6. **Individual injection** - No batch selection needed
7. **Timeline integration** - Record all inject/remove events

---

## Visual Design V1

### Knowledge Tab Layout
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 🧠 AB Knowledge                                                                ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ Search: [________________]  Group: [Template ▼] Scope: [All ▼] Type: [All ▼] ┃
┃                                                                                 ┃
┃ [📦 Import] [➕ Create Template] [🔄 Refresh] [📤 Export Selected]           ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                                 ┃
┃ ▼ 🟠 Git Essentials (5) v2.1 🔒Bundled                                        ┃
┃    [📋 Clone] [📦 Inject Template] [📊 History] [💾 Version] [📤 Export]     ┃
┃    │                                                                            ┃
┃    ├─ ⭐ Golden Path      Commit conventions      Team  sessions,git  [📝][💉]┃
┃    ├─ ⭐ Golden Path      Branch naming           Team  git,workflow  [📝][💉]┃
┃    ├─ ✅ Checklist        PR review steps         Team  code-review   [📝][💉]┃
┃    ├─ 📋 Guideline        Merge strategies        Team  git,merging   [📝][💉]┃
┃    └─ ⭐ Golden Path      Git workflows           Team  git,process   [📝][💉]┃
┃    │                                                                            ┃
┃    └─ 📥 Drop items here to add to template ─────────────────────────────────  ┃
┃                                                                                 ┃
┃ ▶ 🟠 Reza's CLAUDE.md Essentials (10) v1.0 🔒Bundled                          ┃
┃    [📋 Clone] [📦 Inject Template] [📊 History] [💾 Version] [📤 Export]     ┃
┃                                                                                 ┃
┃ ▼ 📝 My API Patterns (8) v1.3                                                 ┃
┃    [📋 Clone] [📦 Inject Template] [📊 History] [💾 Version] [✏️ Edit] [🗑️] ┃
┃    │                                                                            ┃
┃    ├─ ✨ Best Practice    REST naming            Team  api,rest      [📝][💉]┃
┃    ├─ ⚠️ Anti-Pattern     N+1 queries            Team  api,perf      [📝][💉]┃
┃    ├─ 📋 Guideline        Error codes            Team  api,errors    [📝][💉]┃
┃    └─ ...                                                                       ┃
┃    └─ 📥 Drop items here ────────────────────────────────────────────────────  ┃
┃                                                                                 ┃
┃ ▶ 📁 Ungrouped (21)                                                            ┃
┃    [➕ Add Item]                                                                ┃
┃                                                                                 ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

Legend:
  [📝] = Edit item (inline or modal)
  [💉] = Inject item to claude.md
  [📦] = Inject entire template
  [📋] = Clone template
  [💾] = Create version checkpoint
  [📊] = View audit history
  [📤] = Export template
  [✏️] = Edit template metadata
  [🗑️] = Delete template
```

---

## Data Model V1

### Template Entity
```typescript
interface Template {
  // Identity
  id: string;                          // UUID
  name: string;                        // "Git Essentials"
  description: string;                 // "Best practices for git workflows"

  // Versioning
  version: string;                     // "2.1" (user-created checkpoints)
  versionHistory: TemplateVersion[];   // Checkpoint snapshots

  // Audit Trail
  auditLog: AuditLogEntry[];          // Detailed change history

  // Metadata
  category: string;                    // "development", "testing", etc.
  tags: string[];                      // ["git", "workflow"]
  author: string;                      // Original creator
  source: 'bundled' | 'user' | 'cloned' | 'imported';
  sourceTemplateId?: string;           // If cloned, reference to original

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastVersionedAt?: Date;              // Last checkpoint creation

  // Items (stored inline, not just IDs)
  items: KnowledgeItem[];              // Full items, not references

  // Sharing
  isPublic: boolean;                   // Can be exported/shared
  scope: 'personal' | 'team' | 'project' | 'organization' | 'public';
}
```

### Template Version (Checkpoint)
```typescript
interface TemplateVersion {
  versionNumber: string;               // "1.0", "1.1", "2.0" (user decides)
  description: string;                 // "Added API error handling patterns"
  createdAt: Date;
  createdBy: string;
  itemCount: number;                   // Snapshot metadata
  snapshot: {
    items: KnowledgeItem[];            // Full snapshot of items at this version
    templateMetadata: {                // Template state at version
      name: string;
      description: string;
      tags: string[];
    };
  };
}
```

### Audit Log Entry
```typescript
interface AuditLogEntry {
  id: string;
  timestamp: Date;
  operation: AuditOperation;
  actor: string;                       // "user" or "system"
  details: AuditDetails;
  before?: any;                        // State before change (optional)
  after?: any;                         // State after change (optional)
}

enum AuditOperation {
  // Template operations
  TEMPLATE_CREATED = 'template.created',
  TEMPLATE_CLONED = 'template.cloned',
  TEMPLATE_RENAMED = 'template.renamed',
  TEMPLATE_DELETED = 'template.deleted',
  TEMPLATE_EXPORTED = 'template.exported',
  TEMPLATE_IMPORTED = 'template.imported',
  TEMPLATE_VERSIONED = 'template.versioned',

  // Item operations
  ITEM_ADDED = 'item.added',
  ITEM_REMOVED = 'item.removed',
  ITEM_UPDATED = 'item.updated',
  ITEM_MOVED_FROM = 'item.moved_from',    // Item left this template
  ITEM_MOVED_TO = 'item.moved_to',        // Item entered this template
  ITEM_COPIED_TO = 'item.copied_to',      // Item copied from elsewhere

  // Injection operations
  TEMPLATE_INJECTED = 'template.injected',
  TEMPLATE_REMOVED_FROM_FILE = 'template.removed_from_file',
  ITEM_INJECTED = 'item.injected',
  ITEM_REMOVED_FROM_FILE = 'item.removed_from_file',

  // Metadata changes
  METADATA_UPDATED = 'metadata.updated',
  TAGS_UPDATED = 'tags.updated',
}

interface AuditDetails {
  itemId?: string;                     // If item-related
  itemTitle?: string;
  targetFile?: string;                 // If injection-related
  targetTemplateId?: string;           // If move/copy
  sourceTemplateId?: string;           // If cloned
  changes?: Record<string, any>;       // Changed fields
  comment?: string;                    // User comment on version
}
```

### Knowledge Item (Enhanced)
```typescript
interface KnowledgeItem {
  // Identity
  id: string;
  title: string;
  body: string;                        // Markdown content

  // Classification
  type: KnowledgeType;                 // golden-path, best-practice, etc.
  scope: KnowledgeScope;               // personal, team, etc.
  tags: string[];

  // Metadata
  author: string;
  source?: string;                     // Origin reference

  // Template association
  templateId?: string;                 // Which template owns this item
  templateName?: string;               // Template name (denormalized for display)

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Injection tracking
  injectedTo: InjectionRecord[];       // Where this item is currently injected
}

interface InjectionRecord {
  filePath: string;                    // e.g., "docs/claude.md"
  injectedAt: Date;
  injectedBy: string;
  injectionType: 'item' | 'template';  // Individual or part of template
  parentTemplateId?: string;           // If injected as part of template
}
```

---

## User Interactions V1

### 1. Clone Template (Everything is Clonable)
```
Click [📋 Clone] on ANY template (bundled or user)
    ↓
┌─ Clone Template ──────────────────────────────┐
│ Cloning: Git Essentials v2.1                  │
│                                                │
│ New name: [Git Essentials (Copy)________]     │
│ Description: [Cloned from Git Essentials__]   │
│                                                │
│ ☑ Include all items (5)                       │
│ ☐ Copy version history (shallow clone)        │
│                                                │
│ [Cancel] [Create Clone →]                     │
└────────────────────────────────────────────────┘
    ↓
Creates new template section:
    ▼ 📝 Git Essentials (Copy) (5) v1.0
       └─ Audit log: "Cloned from Git Essentials (id: abc123)"
```

**Shallow Clone**:
- Items copied (new IDs)
- Version history NOT copied (starts at v1.0)
- Audit log starts fresh with TEMPLATE_CLONED entry
- sourceTemplateId set to original template ID

---

### 2. Inject Individual Item
```
Each item has [💉] button:

┃ ├─ ⭐ Golden Path    Commit conventions    Team  [📝][💉]
                                                        ↑ Click
    ↓
┌─ Inject Item to Claude.md ───────────────────┐
│ Inject: "Commit conventions"                  │
│                                                │
│ Select file:                                  │
│ ◉ docs/claude.md                             │
│ ○ src/CONTRIBUTING.md                        │
│ ○ README.md                                   │
│                                                │
│ [Cancel] [Inject Item →]                      │
└────────────────────────────────────────────────┘
    ↓
Injects with individual bracket:
    <!-- ITEM: commit-conventions [item-id-123] -->
    # Commit Message Conventions
    ...
    <!-- END ITEM: commit-conventions -->

Records in audit log:
    - Template audit: ITEM_INJECTED
    - Timeline event: "Injected 'Commit conventions' to docs/claude.md"

Updates item.injectedTo array:
    {
      filePath: "docs/claude.md",
      injectedAt: new Date(),
      injectedBy: "user",
      injectionType: "item"
    }
```

**No Selection Required**: Each item independently injectable

---

### 3. Inject Entire Template
```
Click [📦 Inject Template] on template section
    ↓
┌─ Inject Template ─────────────────────────────┐
│ Inject: "Git Essentials" (5 items)            │
│                                                │
│ Select file:                                  │
│ ◉ docs/claude.md                             │
│ ○ src/CONTRIBUTING.md                        │
│                                                │
│ [Cancel] [Inject All Items →]                 │
└────────────────────────────────────────────────┘
    ↓
Injects with template bracket:
    <!-- TEMPLATE: Git Essentials [template-id-456] -->

    # Git Essentials v2.1

    ## Commit Message Conventions
    ...

    ## Branch Naming
    ...

    [All 5 items rendered]

    <!-- END TEMPLATE: Git Essentials -->

Records in audit log:
    - Template audit: TEMPLATE_INJECTED (single entry for whole template)
    - Timeline event: "Injected template 'Git Essentials' to docs/claude.md"

Updates ALL item.injectedTo arrays:
    {
      filePath: "docs/claude.md",
      injectedAt: new Date(),
      injectedBy: "user",
      injectionType: "template",
      parentTemplateId: "template-id-456"
    }
```

**Benefit**: Remove entire template with one click vs individual items

---

### 4. Create Version Checkpoint
```
Click [💾 Version] on template section
    ↓
┌─ Create Version Checkpoint ───────────────────┐
│ Template: My API Patterns                     │
│ Current version: v1.2                         │
│                                                │
│ New version: [1.3_____________]               │
│ Description: [Added error handling patterns_] │
│                                                │
│ Current state:                                │
│ • 8 items                                     │
│ • Last modified: 2 hours ago                  │
│ • 3 changes since last version               │
│                                                │
│ [Cancel] [Create Version →]                   │
└────────────────────────────────────────────────┘
    ↓
Creates snapshot in versionHistory array:
    {
      versionNumber: "1.3",
      description: "Added error handling patterns",
      createdAt: new Date(),
      snapshot: {
        items: [...], // Full copy of all items
        templateMetadata: {...}
      }
    }

Records in audit log:
    - TEMPLATE_VERSIONED
    - Details: { versionNumber: "1.3", description: "..." }

Updates template:
    template.version = "1.3"
    template.lastVersionedAt = new Date()
```

**User Control**: User decides when to checkpoint, not automatic

---

### 5. View Audit History
```
Click [📊 History] on template section
    ↓
┌─ Template History: Git Essentials ────────────────────────────────────────────┐
│                                                                                 │
│ Versions ──────────────────────────────────────────────────────────────────── │
│                                                                                 │
│ v2.1  Oct 23, 2025 2:30 PM   "Added merge strategies guide"         [Restore] │
│ v2.0  Oct 20, 2025 10:15 AM  "Major update with PR checklist"       [Restore] │
│ v1.0  Oct 15, 2025 9:00 AM   "Initial version"                      [Restore] │
│                                                                                 │
│ Audit Log ────────────────────────────────────────────────────────────────── │
│                                                                                 │
│ [Filter: All ▼] [Search: _______________]                                      │
│                                                                                 │
│ 🕐 Oct 23, 2025 2:32 PM   ITEM_INJECTED                                       │
│    User injected "Commit conventions" to docs/claude.md                       │
│    [View Details]                                                              │
│                                                                                 │
│ 🕐 Oct 23, 2025 2:30 PM   TEMPLATE_VERSIONED                                  │
│    Version 2.1 created: "Added merge strategies guide"                        │
│    [View Snapshot]                                                             │
│                                                                                 │
│ 🕐 Oct 23, 2025 2:28 PM   ITEM_ADDED                                          │
│    Added "Merge strategies" (guideline, team scope)                           │
│    [View Item]                                                                 │
│                                                                                 │
│ 🕐 Oct 23, 2025 11:15 AM  ITEM_UPDATED                                        │
│    Updated "Branch naming" - changed tags from [git] to [git, workflow]       │
│    [View Changes]                                                              │
│                                                                                 │
│ 🕐 Oct 22, 2025 4:20 PM   TEMPLATE_REMOVED_FROM_FILE                          │
│    Template removed from docs/old-guide.md                                     │
│                                                                                 │
│ 🕐 Oct 20, 2025 10:15 AM  TEMPLATE_VERSIONED                                  │
│    Version 2.0 created: "Major update with PR checklist"                      │
│    [View Snapshot]                                                             │
│                                                                                 │
│ 🕐 Oct 20, 2025 10:10 AM  ITEM_ADDED                                          │
│    Added "PR review steps" (checklist, team scope)                            │
│                                                                                 │
│ [Load More...] [Export History]                                               │
│                                                                                 │
│ [Close]                                                                        │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Features**:
- Version checkpoints with restore capability
- Filterable audit log
- Detailed operation tracking
- Export history as JSON

---

### 6. Edit Item (Inline or Modal)

#### Inline Editing
```
Click [📝] on item row → Inline edit mode:

Before:
┃ ├─ ⭐ Golden Path    Commit conventions    Team  git,workflow  [📝][💉]

After (inline edit):
┃ ├─ ⭐ [Type▼] [Title: Commit conventions________________] [Scope▼]
┃    [Tags: git,workflow,best-practice________________] [✓][✗]
                                                         ↑  ↑
                                                      Save Cancel
```

#### Modal Editing
```
Double-click item OR Shift+Click [📝] → Modal editor:

┌─ Edit Item ────────────────────────────────────┐
│ ┌─ Metadata ─────────────────────────────────┐│
│ │ Title: [Commit conventions____________]    ││
│ │ Type:  [Golden Path ▼]                     ││
│ │ Scope: [Team ▼]                            ││
│ │ Tags:  [git, workflow, best-practice___]   ││
│ └────────────────────────────────────────────┘│
│                                                │
│ ┌─ Content ──────────────────────────────────┐│
│ │ # Commit Message Conventions               ││
│ │                                             ││
│ │ Use imperative mood:                       ││
│ │ - ✅ "Add feature"                         ││
│ │ - ❌ "Added feature"                       ││
│ │                                             ││
│ │ [Markdown editor with preview]             ││
│ └────────────────────────────────────────────┘│
│                                                │
│ [Cancel] [Save Changes]                       │
└────────────────────────────────────────────────┘
```

**Both modes record**:
- Audit log: ITEM_UPDATED
- before/after snapshots
- Timeline event if content changed significantly

---

### 7. Drag-Drop Between Templates

#### Move (Click + Drag)
```
Drag item from Template A to Template B:
    ↓
Source template audit log:
    - ITEM_MOVED_FROM
    - Details: { itemId, itemTitle, targetTemplateId }

Target template audit log:
    - ITEM_MOVED_TO
    - Details: { itemId, itemTitle, sourceTemplateId }

Item updated:
    item.templateId = targetTemplateId
    item.templateName = "Target Template"
```

#### Copy (Ctrl + Drag)
```
Ctrl+Drag from Template A to Template B:
    ↓
Source template audit log:
    - No entry (source unchanged)

Target template audit log:
    - ITEM_COPIED_TO
    - Details: { itemId, itemTitle, sourceTemplateId }

New item created:
    - New UUID
    - Same content/metadata
    - templateId = targetTemplateId
```

---

### 8. Export Template
```
Click [📤 Export] on template:
    ↓
┌─ Export Template ─────────────────────────────┐
│ Export: Git Essentials v2.1                   │
│                                                │
│ Export format:                                │
│ ◉ JSON (with full metadata)                  │
│ ○ Markdown (human-readable)                  │
│                                                │
│ Include:                                       │
│ ☑ All items (5)                               │
│ ☑ Version history (3 checkpoints)            │
│ ☑ Audit log (47 entries)                     │
│ ☐ Metadata only (no content)                 │
│                                                │
│ [Cancel] [Export to File]                     │
└────────────────────────────────────────────────┘
    ↓
Saves as: git-essentials-v2.1.json

Records in audit log:
    - TEMPLATE_EXPORTED
    - Details: { format: "json", includeHistory: true }
```

**Sharing**: Exported files can be imported by others

---

## Timeline Integration

### Timeline Event Recording
```typescript
interface TimelineKnowledgeEvent {
  id: string;
  type: 'knowledge_item_injected' | 'knowledge_item_removed'
        | 'template_injected' | 'template_removed';
  timestamp: Date;
  title: string;                       // "Injected 'Commit conventions'"
  description: string;
  metadata: {
    itemId?: string;
    templateId?: string;
    targetFile: string;                // "docs/claude.md"
    itemCount?: number;                // For template injection
    operation: 'inject' | 'remove';
  };
}
```

### Recording Events
```typescript
// When item injected
recordTimelineEvent({
  type: 'knowledge_item_injected',
  title: `Injected '${item.title}' to ${fileName}`,
  description: `${item.type} added to ${fileName}`,
  metadata: {
    itemId: item.id,
    templateId: item.templateId,
    targetFile: filePath,
    operation: 'inject'
  }
});

// When template injected
recordTimelineEvent({
  type: 'template_injected',
  title: `Injected template '${template.name}' to ${fileName}`,
  description: `${template.items.length} items added to ${fileName}`,
  metadata: {
    templateId: template.id,
    targetFile: filePath,
    itemCount: template.items.length,
    operation: 'inject'
  }
});
```

**Timeline Display**:
```
📝 Oct 23, 2025 2:32 PM
   Injected 'Commit conventions' to docs/claude.md
   Golden Path • Team scope • Git Essentials template
```

---

## Metadata Viewing

### Item Metadata Panel
```
Click (i) icon or right-click → View Metadata:

┌─ Item Metadata: Commit conventions ───────────┐
│                                                │
│ Identity ────────────────────────────────────  │
│ ID:         item-abc123                       │
│ Created:    Oct 15, 2025 9:00 AM             │
│ Updated:    Oct 23, 2025 2:28 PM             │
│ Author:     Platform Team                     │
│                                                │
│ Classification ──────────────────────────────  │
│ Type:       Golden Path                       │
│ Scope:      Team                              │
│ Tags:       git, workflow, best-practice      │
│                                                │
│ Template Association ────────────────────────  │
│ Template:   Git Essentials v2.1              │
│ Added to template: Oct 15, 2025              │
│                                                │
│ Injection Status ────────────────────────────  │
│ Injected to:                                  │
│ • docs/claude.md (Oct 23, 2025 2:32 PM)      │
│ • README.md (Oct 20, 2025 10:15 AM)          │
│                                                │
│ Source ──────────────────────────────────────  │
│ Origin:     Bundled (Agent Brain Base)       │
│                                                │
│ [Close] [Edit Item]                           │
└────────────────────────────────────────────────┘
```

---

## Data Flow V1

### Creating Template
```
User clicks [➕ Create Template]
    ↓
1. Generate UUID for template
2. Create Template object with empty items[]
3. Add initial audit log entry (TEMPLATE_CREATED)
4. Set version to "1.0"
5. Add to TemplateStore
6. Render new section in UI
7. Record timeline event (optional)
```

### Adding Item to Template
```
User clicks [➕] on template section header
    ↓
1. Show item creation modal
2. Generate UUID for item
3. Set item.templateId = template.id
4. Add item to template.items[]
5. Add audit log entry (ITEM_ADDED)
6. Update template.updatedAt
7. Re-render template section
```

### Injecting Item
```
User clicks [💉] on item
    ↓
1. Show file selection dialog
2. Read target file content
3. Find injection point (top of file or after existing items)
4. Generate injection markers:
   <!-- ITEM: {slug} [{itemId}] -->
   {content}
   <!-- END ITEM: {slug} -->
5. Write to file
6. Update item.injectedTo[]
7. Add template audit log (ITEM_INJECTED)
8. Add item audit log (if items have own logs)
9. Record timeline event
10. Update UI (show injected indicator)
```

### Creating Version Checkpoint
```
User clicks [💾 Version]
    ↓
1. Deep clone current template state:
   - All items (full copies)
   - Template metadata
2. Create TemplateVersion object
3. Add to template.versionHistory[]
4. Update template.version
5. Update template.lastVersionedAt
6. Add audit log entry (TEMPLATE_VERSIONED)
7. Show success notification
```

---

## File System Structure V1

```
.agent-brain/
├─ templates/
│  ├─ bundled/              # Shipped with extension
│  │  ├─ git-essentials.json
│  │  └─ claude-essentials.json
│  │
│  ├─ user/                 # User-created templates
│  │  ├─ my-api-patterns.json
│  │  └─ team-guidelines.json
│  │
│  └─ cloned/              # Cloned from bundled
│     └─ git-essentials-copy.json
│
├─ items/                  # Orphaned items (Ungrouped)
│  ├─ item-abc123.json
│  └─ item-def456.json
│
├─ audit-logs/             # Optional: Separate audit log files
│  └─ template-xyz789.log.json
│
└─ config.json             # Workspace settings
```

**Storage Strategy**:
- Templates stored as single JSON files (includes items inline)
- Audit logs embedded in template files (or separate for performance)
- Version snapshots embedded in template files
- Easy to export/import entire templates

---

## Export Format V1

### Full Template Export (JSON)
```json
{
  "formatVersion": "1.0",
  "exportedAt": "2025-10-23T16:30:00Z",
  "exportedBy": "user",
  "template": {
    "id": "template-123",
    "name": "Git Essentials",
    "version": "2.1",
    "description": "Best practices for git workflows",
    "category": "development",
    "tags": ["git", "workflow"],
    "author": "Platform Team",
    "source": "bundled",
    "createdAt": "2025-10-15T09:00:00Z",
    "updatedAt": "2025-10-23T14:30:00Z",
    "items": [
      {
        "id": "item-abc",
        "title": "Commit Message Conventions",
        "body": "# Commit Message Conventions\n\n...",
        "type": "golden-path",
        "scope": "team",
        "tags": ["git", "commits"],
        "createdAt": "2025-10-15T09:00:00Z",
        "updatedAt": "2025-10-23T14:28:00Z"
      }
    ],
    "versionHistory": [
      {
        "versionNumber": "2.1",
        "description": "Added merge strategies",
        "createdAt": "2025-10-23T14:30:00Z",
        "itemCount": 5,
        "snapshot": { /* full snapshot */ }
      }
    ],
    "auditLog": [
      {
        "id": "audit-001",
        "timestamp": "2025-10-23T14:32:00Z",
        "operation": "item.injected",
        "details": {
          "itemId": "item-abc",
          "targetFile": "docs/claude.md"
        }
      }
    ]
  }
}
```

---

## Key Implementation Details

### 1. No Batch Selection Needed
- Every item has [💉] button → immediate injection
- No checkbox selection required
- Simplified UI (no selection state management)

### 2. Audit Trail Always On
- Every operation logged automatically
- No opt-in/opt-out
- Essential for version control

### 3. Shallow Cloning
- Clone creates new template with new ID
- Items get new IDs (not references)
- Audit log starts fresh: first entry is TEMPLATE_CLONED
- No reference to original template's history

### 4. Version Checkpoints
- User-triggered (not automatic)
- Full snapshots (can restore later)
- Progressive versions (1.0 → 1.1 → 2.0)
- User decides numbering scheme

### 5. Timeline Integration
- Record inject/remove operations
- Show in timeline visualization
- Filterable by file, template, item type
- Clickable to view details

---

## Permissions & Constraints

### Bundled Templates
- ✅ Can clone
- ✅ Can inject items
- ✅ Can inject template
- ✅ Can export
- ❌ Cannot edit name/description
- ❌ Cannot delete
- ❌ Cannot add/remove items (clone first)

### User Templates
- ✅ Can clone
- ✅ Can inject items
- ✅ Can inject template
- ✅ Can export
- ✅ Can edit all metadata
- ✅ Can delete
- ✅ Can add/remove items
- ✅ Can drag-drop items in/out

### Cloned Templates
- ✅ Full user template permissions
- ✅ Shows "Cloned from X" in metadata
- ✅ No link back to original (independent)

---

## Summary

**V1 Design Goals Achieved**:
1. ✅ Templates as primary organization (sections in table)
2. ✅ Everything cloneable (no restrictions)
3. ✅ Audit trails for accountability
4. ✅ User-controlled versioning
5. ✅ Individual item injection (no batch selection)
6. ✅ Template-level injection (remove as group)
7. ✅ Timeline integration (track usage)
8. ✅ Inline + modal editing
9. ✅ Metadata always viewable
10. ✅ Export/sharing capability

**Clean slate approach** - No backwards compatibility concerns, optimal design from first principles.
