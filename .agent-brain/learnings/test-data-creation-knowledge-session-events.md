---
title: Creating Test Data for Knowledge and Session Events
type: learning
scope: project
tags: testing, test-data, providers, timeline
source: timeline-event-testing
author: Agent Session
version: 1
---

# Creating Test Data for Knowledge and Session Events

## Problem
Knowledge events and session journal events weren't showing in timeline because no test data existed.

## Knowledge Events Test Data

**Location**: `.agent-brain/events/knowledge-events.json`

**Format**:
```json
{
  "version": "1.0",
  "events": [
    {
      "id": "ke-1729000000000",
      "timestamp": "2025-10-15T10:00:00.000Z",
      "type": "create",
      "knowledgeItemId": "learning-id",
      "knowledgeItemTitle": "Learning Title",
      "knowledgeItemType": "learning",
      "targetFile": ".agent-brain/learnings/file.md",
      "actor": "agent"
    }
  ]
}
```

**Event Types**:
- `create` - Agent or user created new knowledge item
- `apply` - User applied knowledge item to file (injected into claude.md)
- `remove` - User removed knowledge item from file

**Actor Types**:
- `agent` - Created by coding agent
- `user` - Created or applied by user

## Session Journal Test Data

**Location**: `.agent-brain/sessions/YYYY-MM/session-YYYY-MM-DD-title.md`

**Format**:
```markdown
---
id: session-2025-10-15-001
title: Session Title
startTime: 2025-10-15T09:00:00.000Z
endTime: 2025-10-15T12:30:00.000Z
agent: Claude Code
promptCount: 24
status: completed
tags: tag1, tag2
---

# Session Title

## Session Summary
What was accomplished...

## Key Changes
- Change 1
- Change 2

## Files Modified
- file1.ts
- file2.ts
```

## Timeline Event Types
Knowledge and session events appear on timeline as:
- **KNOWLEDGE_CREATED** - Green diamond
- **KNOWLEDGE_APPLIED** - Blue diamond
- **KNOWLEDGE_REMOVED** - Red diamond
- **SESSION_JOURNAL** - Purple square

## Filtering
Events appear in:
- **Event Types** filter section (knowledge-created, knowledge-applied, session-journal)
- **Data Sources** section (AB-Knowledge Events, AB-Sessions checkboxes)

## Testing
1. Create test data files
2. Restart extension or refresh timeline
3. Check event counts in filter panel
4. Verify events appear on timeline
5. Test filtering by event type
6. Test toggling providers

## Related
- `KnowledgeEventProvider.ts`
- `SessionEventProvider.ts`
- `KnowledgeEventStorage.ts`
- `SessionFileSystem.ts`
